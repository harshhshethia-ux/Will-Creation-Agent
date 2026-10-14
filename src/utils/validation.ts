import { WillData } from '../types/will';

export interface ValidationError {
  ruleId: number;
  section: string;
  field?: string;
  message: string;
  severity: 'error' | 'warning' | 'escalation';
}

export interface ValidationSummary {
  isValidForPdf: boolean;
  status: 'READY' | 'LAWYER_REVIEW_REQUIRED';
  reviewReasons: string[];
  errors: ValidationError[];
  warnings: ValidationError[];
  residuaryShareTotal: number;
  hasNomineeMismatch: boolean;
}

export function validateWillData(data: WillData): ValidationSummary {
  const errors: ValidationError[] = [];
  const warnings: ValidationError[] = [];
  const reviewReasons: string[] = [];

  // Escalation Checks
  if (data.scope.hasGoaProperty === true) {
    reviewReasons.push('Property situated in Goa (subject to Portuguese Civil Code / mandatory succession rules).');
  }

  if (data.scope.hasTrustOrHufAsset === true) {
    reviewReasons.push('Asset held through trust, company, partnership firm or Hindu Undivided Family (HUF).');
  }

  const hasAncestralOrHuf = data.assets.some(
    a => a.ownership === 'HUF' || a.origin === 'ancestral'
  );
  if (hasAncestralOrHuf) {
    reviewReasons.push('Ancestral or coparcenary/HUF property included: you can leave only your personal share. A lawyer must confirm that share before you sign.');
  }

  // Rule 4: Executor and alternate executor must both be named and 18+
  if (!data.executor.primary.name.trim()) {
    errors.push({
      ruleId: 4,
      section: 'Executor',
      field: 'primary',
      message: 'A primary executor must be named.',
      severity: 'error',
    });
  }
  if (!data.executor.alternate.name.trim()) {
    errors.push({
      ruleId: 4,
      section: 'Executor',
      field: 'alternate',
      message: 'An alternate executor must be named in case the primary executor is unable or unwilling to act.',
      severity: 'error',
    });
  }
  if (data.executor.primary.age !== null && data.executor.primary.age < 18) {
    errors.push({
      ruleId: 4,
      section: 'Executor',
      field: 'primary',
      message: 'The primary executor must be 18 years of age or older.',
      severity: 'error',
    });
  }
  if (data.executor.alternate.age !== null && data.executor.alternate.age < 18) {
    errors.push({
      ruleId: 4,
      section: 'Executor',
      field: 'alternate',
      message: 'The alternate executor must be 18 years of age or older.',
      severity: 'error',
    });
  }

  // Rule 5: Every asset row must have a beneficiary or fall into residuary
  data.assets.forEach((asset, idx) => {
    if (!asset.beneficiary || !asset.beneficiary.trim()) {
      errors.push({
        ruleId: 5,
        section: 'Assets',
        field: `asset_${idx}`,
        message: `Asset "${asset.description || 'Asset ' + (idx + 1)}" must have a designated beneficiary or be allocated to the residuary estate.`,
        severity: 'error',
      });
    }

    // Rule 6: Joint asset share % check
    if (asset.ownership === 'joint') {
      if (asset.sharePercent === undefined || asset.sharePercent <= 0 || asset.sharePercent > 100) {
        errors.push({
          ruleId: 6,
          section: 'Assets',
          field: `asset_${idx}`,
          message: `Joint asset "${asset.description || 'Asset ' + (idx + 1)}" must specify your exact ownership share percentage (1-100%).`,
          severity: 'error',
        });
      }
    }

    // Rule 9: Nominee mismatch warning
    if (asset.nominee && asset.nominee.trim()) {
      const nominee = asset.nominee.trim().toLowerCase();
      const ben = asset.beneficiary.trim().toLowerCase();
      if (nominee !== ben && ben !== 'residuary') {
        warnings.push({
          ruleId: 9,
          section: 'Assets',
          field: `asset_${idx}`,
          message: `Asset "${asset.description || 'Asset ' + (idx + 1)}" has nominee "${asset.nominee}" differing from beneficiary "${asset.beneficiary}". A nominee collects the asset but may not be the final owner. Your will decides who owns it. Tell your nominee in advance.`,
          severity: 'warning',
        });
      }
    }
  });

  // Rule 1: Beneficiary shares of the residue or percentage gifts
  // If percentage bequests exist across beneficiaries, check total
  const percentageBens = data.beneficiaries.filter(b => b.sharePercentage !== undefined && b.sharePercentage > 0);
  let residuaryShareTotal = 0;
  if (percentageBens.length > 0) {
    residuaryShareTotal = percentageBens.reduce((sum, b) => sum + (b.sharePercentage || 0), 0);
    if (residuaryShareTotal !== 100) {
      errors.push({
        ruleId: 1,
        section: 'Beneficiaries',
        field: 'shares',
        message: `Beneficiary percentage shares currently total ${residuaryShareTotal}%. They must total exactly 100%.`,
        severity: 'error',
      });
    }
  }

  // Rule 8: Minor beneficiary and guardian check
  const hasMinorBeneficiary = data.beneficiaries.some(b => b.isMinor);
  const hasMinorChild = data.family.children.some(c => c.isMinor);
  if (hasMinorBeneficiary || hasMinorChild) {
    if (!data.trust_age || data.trust_age < 18) {
      errors.push({
        ruleId: 8,
        section: 'Minors & Guardians',
        field: 'trust_age',
        message: 'Trust vesting age for minor beneficiaries must be set (default 21 years).',
        severity: 'error',
      });
    }
    if (hasMinorChild && (!data.guardian.guardianPersonName.trim() || !data.guardian.guardianPropertyName.trim())) {
      errors.push({
        ruleId: 8,
        section: 'Minors & Guardians',
        field: 'guardian',
        message: 'A guardian of the person and a guardian of the property must be designated for minor children.',
        severity: 'error',
      });
    }
  }

  // Rule 3: Exactly 2 witnesses
  const [w1, w2] = data.witnesses;
  if (!w1.name.trim() || !w2.name.trim()) {
    errors.push({
      ruleId: 3,
      section: 'Witnesses',
      field: 'witnesses',
      message: 'Exactly two independent witnesses must be provided.',
      severity: 'error',
    });
  }

  // Rule 2: Witness must NOT be beneficiary, spouse of beneficiary, or executor
  const forbiddenNames = new Set<string>();
  if (data.executor.primary.name.trim()) forbiddenNames.add(data.executor.primary.name.trim().toLowerCase());
  if (data.executor.alternate.name.trim()) forbiddenNames.add(data.executor.alternate.name.trim().toLowerCase());
  data.beneficiaries.forEach(b => {
    if (b.name.trim()) forbiddenNames.add(b.name.trim().toLowerCase());
  });

  [w1, w2].forEach((w, idx) => {
    const wName = w.name.trim().toLowerCase();
    if (wName && forbiddenNames.has(wName)) {
      errors.push({
        ruleId: 2,
        section: 'Witnesses',
        field: `witness_${idx + 1}`,
        message: `Witness ${idx + 1} ("${w.name}") is also named as an executor or beneficiary. A witness who benefits under the will can lose the gift under Indian law. Please appoint an independent witness.`,
        severity: 'error',
      });
    }
  });

  // Testator checks
  if (!data.testator.fullName.trim()) {
    errors.push({
      ruleId: 0,
      section: 'Testator',
      field: 'fullName',
      message: 'Testator full name as on government ID is required.',
      severity: 'error',
    });
  }
  if (!data.testator.fatherOrHusbandName.trim()) {
    errors.push({
      ruleId: 0,
      section: 'Testator',
      field: 'fatherOrHusbandName',
      message: "Testator's father or husband's name is required.",
      severity: 'error',
    });
  }
  if (!data.testator.idLast4.trim() || data.testator.idLast4.trim().length !== 4) {
    errors.push({
      ruleId: 0,
      section: 'Testator',
      field: 'idLast4',
      message: 'Please provide the last 4 digits of the government ID.',
      severity: 'error',
    });
  }
  if (!data.testator.declarationAgeConfirmed || !data.testator.declarationSoundMindConfirmed || !data.testator.declarationVoluntaryConfirmed) {
    errors.push({
      ruleId: 0,
      section: 'Testator',
      field: 'declarations',
      message: 'All three statutory declarations (18+, sound mind, and free voluntary consent) must be confirmed.',
      severity: 'error',
    });
  }

  // Doctor required check if age >= 60
  if (data.testator.age !== null && data.testator.age >= 60 && !data.doctor.isIncluded) {
    warnings.push({
      ruleId: 10,
      section: 'Doctor',
      field: 'doctor',
      message: 'The testator is 60 or older. A doctor’s fitness certificate immediately before signing is strongly advised to prevent future disputes over testamentary capacity.',
      severity: 'warning',
    });
  }

  const hasNomineeMismatch = warnings.some(w => w.ruleId === 9);
  const status: 'READY' | 'LAWYER_REVIEW_REQUIRED' = reviewReasons.length > 0 ? 'LAWYER_REVIEW_REQUIRED' : 'READY';
  const isValidForPdf = errors.length === 0;

  return {
    isValidForPdf,
    status,
    reviewReasons,
    errors,
    warnings,
    residuaryShareTotal,
    hasNomineeMismatch,
  };
}
