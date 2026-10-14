import { WillData, CompiledClause, BeneficiaryInfo, AssetRow } from '../types/will';
import { formatIndianDate } from './numberToIndianWords';

export interface AssemblyResult {
  title: string;
  testatorName: string;
  clauses: CompiledClause[];
  signoff: {
    statement: string;
    place: string;
    date: string;
  };
  witnesses: {
    intro: string;
    w1: { name: string; relation: string; occupation: string; address: string };
    w2: { name: string; relation: string; occupation: string; address: string };
  };
  doctor?: {
    text: string;
    doctorName: string;
    regNo: string;
    address: string;
    examDate: string;
  };
  missingVariables: string[];
}

function findBeneficiary(beneficiaries: BeneficiaryInfo[], nameOrId: string): BeneficiaryInfo | undefined {
  return beneficiaries.find(b => b.name.toLowerCase() === nameOrId.toLowerCase() || b.id === nameOrId);
}

export function assembleWillDocument(data: WillData): AssemblyResult {
  const missingVariables: string[] = [];
  const clauses: CompiledClause[] = [];

  const testatorName = data.testator.fullName.trim() || '{{testator_full_name}}';
  if (!data.testator.fullName.trim()) missingVariables.push('Testator Full Name');
  if (!data.testator.fatherOrHusbandName.trim()) missingVariables.push("Father's or Husband's Name");
  if (!data.testator.address.trim()) missingVariables.push('Testator Address');
  if (!data.testator.idLast4.trim()) missingVariables.push('Testator ID Last 4 Digits');

  let clauseIndex = 1;

  // C1. PREAMBLE
  const ageStr = data.testator.age !== null ? `${data.testator.age}` : '____';
  const preambleText = `I, ${testatorName}, ${data.testator.relationType} ${data.testator.fatherOrHusbandName || '____'}, aged ${ageStr} years, by religion ${data.testator.religion}, by occupation ${data.testator.occupation || '____'}, residing at ${data.testator.address || '____'}, holding ${data.testator.idType} ending ${data.testator.idLast4 || '____'}, declare this to be my Last Will and Testament. I make it while in sound mind and good understanding.`;

  clauses.push({
    clauseId: 'C1',
    number: clauseIndex++,
    title: 'PREAMBLE',
    text: preambleText,
    conditionMet: true,
  });

  // C2. REVOCATION (always include)
  clauses.push({
    clauseId: 'C2',
    number: clauseIndex++,
    title: 'REVOCATION OF PRIOR WILLS',
    text: 'I revoke all earlier wills and codicils made by me, whether in writing or otherwise. This is my final will.',
    conditionMet: true,
  });

  // C3. FREE CONSENT AND SOUND MIND
  clauses.push({
    clauseId: 'C3',
    number: clauseIndex++,
    title: 'FREE CONSENT AND SOUND MIND',
    text: 'I make this will of my own free choice. No person has used fraud, force, pressure or undue influence on me. I understand what I own, who my family members are, and what this will does.',
    conditionMet: true,
  });

  // C4. EXECUTOR
  let executorText = `I appoint ${data.executor.primary.name || '____'}, ${data.executor.primary.relationship || '____'}, residing at ${data.executor.primary.address || '____'}, as the executor of this will.`;
  if (data.executor.alternate.name.trim()) {
    executorText += ` If ${data.executor.primary.name || 'the primary executor'} dies, refuses or cannot act as executor, I appoint ${data.executor.alternate.name}, ${data.executor.alternate.relationship || '____'}, residing at ${data.executor.alternate.address || '____'}, in their place.`;
  } else {
    missingVariables.push('Alternate Executor');
  }

  clauses.push({
    clauseId: 'C4',
    number: clauseIndex++,
    title: 'APPOINTMENT OF EXECUTOR',
    text: executorText,
    conditionMet: true,
  });

  // C5. EXECUTOR'S DUTIES AND POWERS
  clauses.push({
    clauseId: 'C5',
    number: clauseIndex++,
    title: "EXECUTOR'S DUTIES AND POWERS",
    text: 'My executor will collect my assets, pay my debts and expenses, and give my property to the persons named in this will. My executor may sign documents, deal with banks, depositories, registrars and other authorities, and take any lawful step needed to carry out this will.',
    conditionMet: true,
  });

  // C6. MY FAMILY (show only lines that apply)
  const familyLines: string[] = [];
  if (data.family.maritalStatus === 'Married' && data.family.spouseName.trim()) {
    familyLines.push(`- My spouse is ${data.family.spouseName.trim()}.`);
  } else if (data.family.maritalStatus === 'Widowed' && data.family.spouseName.trim()) {
    familyLines.push(`- My late spouse was ${data.family.spouseName.trim()}.`);
  }

  if (data.family.children && data.family.children.length > 0) {
    const childList = data.family.children
      .map(c => `${c.name} (${c.relationship || 'child'}, born ${formatIndianDate(c.dob)})`)
      .join(', ');
    familyLines.push(`- My children are ${childList}.`);
  }

  if (data.family.livingParents && data.family.livingParents.trim()) {
    familyLines.push(`- My living parents are ${data.family.livingParents.trim()}.`);
  }

  if (data.family.dependants && data.family.dependants.trim()) {
    familyLines.push(`- Other persons who depend on me are ${data.family.dependants.trim()}.`);
  }

  if (familyLines.length === 0) {
    familyLines.push('- I have noted my immediate family particulars in this will.');
  }

  clauses.push({
    clauseId: 'C6',
    number: clauseIndex++,
    title: 'MY FAMILY',
    text: familyLines.join('\n'),
    conditionMet: true,
  });

  // C7. DEBTS AND EXPENSES
  clauses.push({
    clauseId: 'C7',
    number: clauseIndex++,
    title: 'DEBTS AND EXPENSES',
    text: 'My executor will first pay my debts, funeral expenses and the costs of carrying out this will. These will be paid from my residuary estate.',
    conditionMet: true,
  });

  // C8. IMMOVABLE PROPERTY
  const immovableAssets = data.assets.filter(a => a.category === 'immovable');
  immovableAssets.forEach((asset, idx) => {
    const ben = findBeneficiary(data.beneficiaries, asset.beneficiary);
    const benName = ben ? ben.name : (asset.beneficiary || 'my residuary beneficiary');
    const benRel = ben ? ben.relationship : 'beneficiary';
    const benAddr = ben ? ben.address : 'residing at the address recorded';

    let ownershipText = 'which I own in my own name';
    if (asset.ownership === 'joint') {
      const sharePct = asset.sharePercent !== undefined ? asset.sharePercent : 50;
      const coOwner = asset.coOwnerName || 'the joint holder';
      ownershipText = `being my ${sharePct}% share in the property held jointly with ${coOwner}`;
    }

    const propText = `I give ${asset.description || 'my property'}, situated at ${asset.propertyAddress || 'the registered location'}, ${ownershipText}, to ${benName}, ${benRel}, residing at ${benAddr}.`;

    clauses.push({
      clauseId: `C8_${idx + 1}`,
      number: clauseIndex++,
      title: `IMMOVABLE PROPERTY (${idx + 1})`,
      text: propText,
      conditionMet: true,
    });
  });

  // C9. BANK ACCOUNTS AND DEPOSITS
  const bankAssets = data.assets.filter(a => a.category === 'bank account' || a.category === 'fixed deposit');
  bankAssets.forEach((asset, idx) => {
    const ben = findBeneficiary(data.beneficiaries, asset.beneficiary);
    const benName = ben ? ben.name : (asset.beneficiary || 'my residuary beneficiary');
    const benRel = ben ? ben.relationship : 'beneficiary';
    const bankName = asset.bankName || asset.institutionName || 'the designated bank';
    const accType = asset.accountType || (asset.category === 'fixed deposit' ? 'fixed deposit' : 'bank');
    const accLast4 = asset.accountLast4 || asset.referenceLast4 || '____';

    const text = `I give the balance in my ${bankName} ${accType} account ending ${accLast4}, including interest and renewals, to ${benName}, ${benRel}.`;

    clauses.push({
      clauseId: `C9_${idx + 1}`,
      number: clauseIndex++,
      title: `BANK ACCOUNTS AND DEPOSITS (${idx + 1})`,
      text,
      conditionMet: true,
    });
  });

  // C10. INVESTMENTS AND FINANCIAL ASSETS
  const investmentCategories: AssetRow['category'][] = ['mutual fund', 'shares and demat', 'PMS or AIF', 'PF or PPF'];
  const investAssets = data.assets.filter(a => investmentCategories.includes(a.category));
  investAssets.forEach((asset, idx) => {
    const ben = findBeneficiary(data.beneficiaries, asset.beneficiary);
    const benName = ben ? ben.name : (asset.beneficiary || 'my residuary beneficiary');
    const benRel = ben ? ben.relationship : 'beneficiary';
    const instName = asset.institutionName || 'the financial institution';
    const refLast4 = asset.referenceLast4 || asset.accountLast4 || '____';

    const text = `I give my ${asset.description || asset.category}, held with ${instName} under ${refLast4}, to ${benName}, ${benRel}.`;

    clauses.push({
      clauseId: `C10_${idx + 1}`,
      number: clauseIndex++,
      title: `FINANCIAL INVESTMENTS (${idx + 1})`,
      text,
      conditionMet: true,
    });
  });

  // C11. INSURANCE POLICIES
  // CONDITION: only where the policy has no nominee, or nominee differs from beneficiary
  const insuranceAssets = data.assets.filter(a => a.category === 'insurance');
  let insuranceClauseCount = 0;
  insuranceAssets.forEach(asset => {
    const ben = findBeneficiary(data.beneficiaries, asset.beneficiary);
    const benName = ben ? ben.name : (asset.beneficiary || 'my residuary beneficiary');
    const nomineeName = asset.nominee.trim();
    const isNomineeDifferent = !nomineeName || nomineeName.toLowerCase() !== benName.toLowerCase();

    if (isNomineeDifferent) {
      insuranceClauseCount++;
      const insurerName = asset.insurerName || asset.institutionName || 'the insurer';
      const polLast4 = asset.policyLast4 || asset.referenceLast4 || '____';
      const benRel = ben ? ben.relationship : 'beneficiary';

      const text = `I give the proceeds of my ${insurerName} policy ending ${polLast4} to ${benName}, ${benRel}.`;

      clauses.push({
        clauseId: `C11_${insuranceClauseCount}`,
        number: clauseIndex++,
        title: `INSURANCE POLICY (${insuranceClauseCount})`,
        text,
        conditionMet: true,
      });
    }
  });

  // C12. NOMINEES
  // CONDITION: any asset has a nominee different from the beneficiary
  const hasNomineeDifferent = data.assets.some(a => {
    if (!a.nominee || !a.nominee.trim()) return false;
    const ben = findBeneficiary(data.beneficiaries, a.beneficiary);
    const benName = ben ? ben.name.trim().toLowerCase() : a.beneficiary.trim().toLowerCase();
    return a.nominee.trim().toLowerCase() !== benName;
  });

  if (hasNomineeDifferent) {
    clauses.push({
      clauseId: 'C12',
      number: clauseIndex++,
      title: 'DIRECTION REGARDING NOMINEES',
      text: 'I know that a nominee named with a bank, company or insurer may receive an asset on my death. I direct that a nominee who receives an asset I have given to another person in this will holds that asset for the person named in this will. I have told, or will tell, my nominees of this direction where practical.',
      conditionMet: true,
    });
  }

  // C13. VEHICLES, JEWELLERY AND PERSONAL ITEMS
  const personalCategories: AssetRow['category'][] = ['vehicle', 'jewellery', 'personal item'];
  const personalAssets = data.assets.filter(a => personalCategories.includes(a.category));
  personalAssets.forEach((asset, idx) => {
    const ben = findBeneficiary(data.beneficiaries, asset.beneficiary);
    const benName = ben ? ben.name : (asset.beneficiary || 'my residuary beneficiary');
    const benRel = ben ? ben.relationship : 'beneficiary';

    const text = `I give ${asset.description || asset.category} to ${benName}, ${benRel}.`;

    clauses.push({
      clauseId: `C13_${idx + 1}`,
      number: clauseIndex++,
      title: `PERSONAL PROPERTY AND VALUABLES (${idx + 1})`,
      text,
      conditionMet: true,
    });
  });

  // C14. BUSINESS INTEREST
  // CONDITION: sole proprietorship or personal business interest, not a company, firm or trust
  const businessAssets = data.assets.filter(a => a.category === 'business interest');
  businessAssets.forEach((asset, idx) => {
    const ben = findBeneficiary(data.beneficiaries, asset.beneficiary);
    const benName = ben ? ben.name : (asset.beneficiary || 'my residuary beneficiary');
    const benRel = ben ? ben.relationship : 'beneficiary';
    const bizDesc = asset.businessDescription || asset.description || 'my proprietary business concern';

    const text = `I give my interest in ${bizDesc} to ${benName}, ${benRel}.`;

    clauses.push({
      clauseId: `C14_${idx + 1}`,
      number: clauseIndex++,
      title: `BUSINESS INTEREST (${idx + 1})`,
      text,
      conditionMet: true,
    });
  });

  // C15. DIGITAL ASSETS
  // CONDITION: user listed digital assets
  const digitalAssets = data.assets.filter(a => a.category === 'digital asset');
  if (digitalAssets.length > 0) {
    const digList = digitalAssets.map(a => a.digitalAssetsList || a.description).filter(Boolean).join(', ');
    const primaryDigitalBen = findBeneficiary(data.beneficiaries, digitalAssets[0].beneficiary);
    const benName = primaryDigitalBen ? primaryDigitalBen.name : (digitalAssets[0].beneficiary || 'my residuary beneficiary');

    const text = `I give my digital assets, namely ${digList || 'my online accounts, emails and digital records'}, to ${benName}. I authorise my executor to access and transfer these assets.`;

    clauses.push({
      clauseId: 'C15',
      number: clauseIndex++,
      title: 'DIGITAL ASSETS',
      text,
      conditionMet: true,
    });
  }

  // C16. JOINT AND ANCESTRAL PROPERTY
  // CONDITION: any asset is joint, inherited or ancestral
  const hasJointOrAncestral = data.assets.some(
    a => a.ownership === 'joint' || a.origin === 'inherited' || a.origin === 'ancestral' || a.ownership === 'HUF'
  );
  if (hasJointOrAncestral) {
    clauses.push({
      clauseId: 'C16',
      number: clauseIndex++,
      title: 'JOINT AND ANCESTRAL PROPERTY',
      text: 'Where I own an asset jointly with others, or as a member of a joint family, my gift under this will covers only my own lawful share in that asset.',
      conditionMet: true,
    });
  }

  // C17. GIFTS TO CHARITY
  const charityBeneficiaries = data.beneficiaries.filter(b => b.type === 'charity');
  charityBeneficiaries.forEach((charity, idx) => {
    const text = `I give my bequest of ${charity.sharePercentage ? charity.sharePercentage + '% of my residuary estate' : 'specified assets'} to ${charity.name}, registration number ${charity.charityRegNo || '____'}, having its office at ${charity.address || '____'}.`;

    clauses.push({
      clauseId: `C17_${idx + 1}`,
      number: clauseIndex++,
      title: `BEQUEST TO CHARITY (${idx + 1})`,
      text,
      conditionMet: true,
    });
  });

  // C18. GIFT OF A SHARE OF MY ESTATE
  // CONDITION: beneficiary receives a percentage rather than a named asset
  const percentageBeneficiaries = data.beneficiaries.filter(
    b => b.type === 'individual' && b.sharePercentage && b.sharePercentage > 0
  );
  if (percentageBeneficiaries.length > 0) {
    percentageBeneficiaries.forEach((ben, idx) => {
      const text = `I give ${ben.sharePercentage}% of my residuary estate to ${ben.name}, ${ben.relationship}.`;

      clauses.push({
        clauseId: `C18_${idx + 1}`,
        number: clauseIndex++,
        title: `GIFT OF SHARE OF ESTATE (${idx + 1})`,
        text,
        conditionMet: true,
      });
    });
  }

  // C19. IF A BENEFICIARY DIES BEFORE ME (always include)
  const defaultAltRule = 'the alternate beneficiary named for that gift';
  clauses.push({
    clauseId: 'C19',
    number: clauseIndex++,
    title: 'IF A BENEFICIARY DIES BEFORE ME',
    text: `If a person named to receive a gift under this will dies before me, then that gift goes to ${defaultAltRule}. Where I have named no alternate, the gift goes to the person's children in equal shares. If there are none, the gift forms part of my residuary estate.`,
    conditionMet: true,
  });

  // C20. IF A BENEFICIARY AND I DIE TOGETHER (always include)
  clauses.push({
    clauseId: 'C20',
    number: clauseIndex++,
    title: 'SIMULTANEOUS DEATH',
    text: 'If a beneficiary and I die in the same event, and it is unclear who died first, I direct that the beneficiary is treated as having died before me.',
    conditionMet: true,
  });

  // C21. MINOR BENEFICIARIES
  // CONDITION: a minor is a beneficiary or testator has minor children
  const hasMinorBeneficiary = data.beneficiaries.some(b => b.isMinor) || data.family.children.some(c => c.isMinor);
  if (hasMinorBeneficiary) {
    const trustAge = data.trust_age || 21;
    clauses.push({
      clauseId: 'C21',
      number: clauseIndex++,
      title: 'TRUST FOR MINOR BENEFICIARIES',
      text: `Where a beneficiary is under ${trustAge} years of age when a gift vests, my executor will hold that gift for the benefit of that beneficiary until they reach ${trustAge} years. My executor may use the income and capital for the beneficiary's education, health, maintenance and support. On reaching ${trustAge} years, the beneficiary receives the remaining gift.`,
      conditionMet: true,
    });
  }

  // C22. GUARDIAN OF MINOR CHILDREN
  // CONDITION: the testator has a minor child
  const hasMinorChild = data.family.children.some(c => c.isMinor);
  if (hasMinorChild) {
    let guardianText = `If any child of mine is under 18 years of age at my death and no parent of that child is alive to act as guardian, I appoint ${data.guardian.guardianPersonName || '____'}, ${data.guardian.guardianPersonRelationship || '____'}, residing at ${data.guardian.guardianPersonAddress || '____'}, as the guardian of the person of that child. I appoint ${data.guardian.guardianPropertyName || '____'}, ${data.guardian.guardianPropertyRelationship || '____'}, residing at ${data.guardian.guardianPropertyAddress || '____'}, as the guardian of the property of that child.`;

    if (data.guardian.altGuardianName && data.guardian.altGuardianName.trim()) {
      guardianText += ` If either guardian cannot or will not act, I appoint ${data.guardian.altGuardianName.trim()} in their place.`;
    }

    clauses.push({
      clauseId: 'C22',
      number: clauseIndex++,
      title: 'TESTAMENTARY GUARDIAN FOR MINOR CHILDREN',
      text: guardianText,
      conditionMet: true,
    });
  }

  // C23. RESIDUARY ESTATE (always include)
  const residuaryPrimary = data.residuary.primary.trim() || 'my beneficiaries named in equal shares';
  let residuaryText = `I give all my remaining property, including any property I acquire after signing this will, any gift that fails, and anything not named above, to ${residuaryPrimary}.`;

  if (data.residuary.alternate.trim()) {
    residuaryText += ` If ${data.residuary.primary.trim() || 'the primary residuary beneficiary'} dies before me, I give my residuary estate to ${data.residuary.alternate.trim()}.`;
  }

  clauses.push({
    clauseId: 'C23',
    number: clauseIndex++,
    title: 'RESIDUARY ESTATE',
    text: residuaryText,
    conditionMet: true,
  });

  // C24. SPECIAL WISHES
  // CONDITION: user entered special wishes
  if (data.special_wishes && data.special_wishes.trim()) {
    clauses.push({
      clauseId: 'C24',
      number: clauseIndex++,
      title: 'SPECIAL WISHES',
      text: data.special_wishes.trim(),
      conditionMet: true,
    });
  }

  // C25. GENERAL
  clauses.push({
    clauseId: 'C25',
    number: clauseIndex++,
    title: 'INTERPRETATION AND GENERAL CLAUSES',
    text: 'In this will, words in the singular include the plural. Headings are for convenience only and do not change the meaning of any clause.',
    conditionMet: true,
  });

  // C26. TESTATOR'S SIGNATURE
  const placeOfSigning = data.signingPlace.trim() || data.testator.city || 'Pune';
  const signingDate = formatIndianDate(data.signingDate);
  const signoffStatement = `Signed by me, ${testatorName}, on ${signingDate} at ${placeOfSigning}, as my last will, in the presence of the witnesses named below.`;

  // C27. ATTESTATION BY WITNESSES
  const [w1, w2] = data.witnesses;
  const witnessesBlock = {
    intro: `We, the undersigned, certify that ${testatorName} signed this will, or put their mark on it, in the presence of both of us. Each of us then signed as a witness in the presence of the testator. The testator appeared to us to be of sound mind and to act freely.`,
    w1: {
      name: w1.name.trim() || '____________________',
      relation: `${w1.relationType} ${w1.fatherOrHusband.trim() || '____________________'}`,
      occupation: w1.occupation.trim() || '____________________',
      address: w1.address.trim() || '____________________',
    },
    w2: {
      name: w2.name.trim() || '____________________',
      relation: `${w2.relationType} ${w2.fatherOrHusband.trim() || '____________________'}`,
      occupation: w2.occupation.trim() || '____________________',
      address: w2.address.trim() || '____________________',
    },
  };

  // C28. DOCTOR'S CERTIFICATE (CONDITION: doctor details given)
  let doctorBlock: AssemblyResult['doctor'] | undefined = undefined;
  if (data.doctor.isIncluded && data.doctor.name.trim()) {
    const examDateStr = formatIndianDate(data.doctor.examDate || data.signingDate);
    doctorBlock = {
      doctorName: data.doctor.name.trim(),
      regNo: data.doctor.regNo.trim() || '______________',
      address: data.doctor.address.trim() || '______________',
      examDate: examDateStr,
      text: `I, Dr. ${data.doctor.name.trim()}, registration number ${data.doctor.regNo.trim() || '____'}, practising at ${data.doctor.address.trim() || '____'}, examined ${testatorName} on ${examDateStr}, immediately before the signing of this will. In my opinion, the testator was of sound disposing mind, understood the nature and effect of making this will, and acted freely.`,
    };
  }

  return {
    title: `LAST WILL AND TESTAMENT\nOF\n${testatorName}`,
    testatorName,
    clauses,
    signoff: {
      statement: signoffStatement,
      place: placeOfSigning,
      date: signingDate,
    },
    witnesses: witnessesBlock,
    doctor: doctorBlock,
    missingVariables,
  };
}
