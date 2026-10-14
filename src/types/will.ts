export type Religion = 'Hindu' | 'Buddhist' | 'Jain' | 'Sikh' | 'Other';

export type StatusType = 'READY' | 'LAWYER_REVIEW_REQUIRED';

export type MaritalStatus = 'Married' | 'Unmarried' | 'Widowed' | 'Divorced';

export type AssetCategory =
  | 'immovable'
  | 'bank account'
  | 'fixed deposit'
  | 'mutual fund'
  | 'shares and demat'
  | 'PMS or AIF'
  | 'insurance'
  | 'PF or PPF'
  | 'vehicle'
  | 'jewellery'
  | 'business interest'
  | 'digital asset'
  | 'personal item';

export type OwnershipType = 'sole' | 'joint' | 'HUF';

export type AssetOrigin = 'self-acquired' | 'inherited' | 'ancestral';

export interface ScopeCheck {
  isEligibleReligion: boolean | null; // Q1: Hindu, Buddhist, Jain, Sikh
  isEighteenOrAbove: boolean | null; // Q2: 18 or above
  hasGoaProperty: boolean | null; // Q3: Goa property
  hasTrustOrHufAsset: boolean | null; // Q4: Trust, company, partnership, HUF
  stoppedDueToReligion?: boolean;
  stoppedDueToAge?: boolean;
}

export interface TestatorInfo {
  fullName: string;
  relationType: 'son of' | 'daughter of' | 'wife of';
  fatherOrHusbandName: string;
  gender: 'he' | 'she' | 'they';
  dob: string;
  age: number | null;
  religion: Religion;
  occupation: string;
  address: string;
  city: string;
  state: string;
  idType: 'Aadhaar' | 'PAN Card' | 'Passport' | 'Voter ID' | 'Driving Licence';
  idLast4: string;
  mobile: string;
  email: string;
  declarationAgeConfirmed: boolean;
  declarationSoundMindConfirmed: boolean;
  declarationVoluntaryConfirmed: boolean;
}

export interface ChildInfo {
  id: string;
  name: string;
  dob: string;
  isMinor: boolean;
  relationship: string; // 'son' | 'daughter'
}

export interface FamilyInfo {
  maritalStatus: MaritalStatus;
  spouseName: string;
  children: ChildInfo[];
  livingParents: string;
  dependants: string;
  hasPriorWill: boolean | null;
}

export interface ExecutorPerson {
  name: string;
  relationship: string;
  address: string;
  contact: string;
  age: number | null;
}

export interface ExecutorInfo {
  primary: ExecutorPerson;
  alternate: ExecutorPerson;
}

export interface AssetRow {
  id: string;
  category: AssetCategory;
  description: string;
  ownership: OwnershipType;
  sharePercent?: number; // for joint
  coOwnerName?: string;
  origin: AssetOrigin;
  nominee: string;
  beneficiary: string; // beneficiary name or 'residuary'
  propertyAddress?: string; // for immovable
  bankName?: string; // for bank account / FD
  accountType?: string; // Savings, Current, Fixed Deposit
  accountLast4?: string;
  institutionName?: string; // for MF, demat, etc.
  referenceLast4?: string;
  insurerName?: string; // for insurance
  policyLast4?: string;
  digitalAssetsList?: string;
  businessDescription?: string;
}

export interface BeneficiaryInfo {
  id: string;
  name: string;
  relationship: string;
  dob: string;
  isMinor: boolean;
  address: string;
  contact: string;
  type: 'individual' | 'charity';
  charityRegNo?: string;
  sharePercentage?: number; // for residuary or percentage bequest
  alternate: string;
}

export interface GuardianInfo {
  guardianPersonName: string;
  guardianPersonRelationship: string;
  guardianPersonAddress: string;
  guardianPropertyName: string;
  guardianPropertyRelationship: string;
  guardianPropertyAddress: string;
  altGuardianName: string;
}

export interface ResiduaryInfo {
  primary: string;
  alternate: string;
  primaryDetailsText?: string;
  alternateDetailsText?: string;
}

export interface WitnessInfo {
  name: string;
  relationType: 'son of' | 'daughter of' | 'wife of';
  fatherOrHusband: string;
  address: string;
  occupation: string;
}

export interface DoctorInfo {
  isIncluded: boolean;
  name: string;
  regNo: string;
  address: string;
  examDate: string;
}

export interface WillData {
  status: StatusType;
  review_reasons: string[];
  scope: ScopeCheck;
  testator: TestatorInfo;
  family: FamilyInfo;
  executor: ExecutorInfo;
  assets: AssetRow[];
  beneficiaries: BeneficiaryInfo[];
  guardian: GuardianInfo;
  trust_age: number;
  residuary: ResiduaryInfo;
  special_wishes: string;
  witnesses: [WitnessInfo, WitnessInfo];
  doctor: DoctorInfo;
  signingPlace: string;
  signingDate: string;
}

export interface CompiledClause {
  clauseId: string; // e.g. C1, C2, C8a
  number: number; // sequential 1, 2, 3...
  title: string;
  text: string;
  conditionMet: boolean;
}
