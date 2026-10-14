export type StepKey =
  | 'WELCOME'
  | 'SCOPE_Q1_RELIGION'
  | 'SCOPE_Q2_AGE'
  | 'SCOPE_Q3_GOA'
  | 'SCOPE_Q4_TRUST_HUF'
  | 'SEC1_NAME'
  | 'SEC1_RELATION_FATHER'
  | 'SEC1_DOB'
  | 'SEC1_OCCUPATION'
  | 'SEC1_ADDRESS'
  | 'SEC1_ID'
  | 'SEC1_DECLARATIONS'
  | 'SEC1_CONFIRM'
  | 'SEC2_MARITAL'
  | 'SEC2_CHILDREN'
  | 'SEC2_PARENTS_DEPENDANTS'
  | 'SEC2_PRIOR_WILL'
  | 'SEC2_CONFIRM'
  | 'SEC3_PRIMARY_EXECUTOR'
  | 'SEC3_ALT_EXECUTOR'
  | 'SEC3_CONFIRM'
  | 'SEC4_ASSETS_INTRO'
  | 'SEC4_ASSET_ADD'
  | 'SEC4_CONFIRM'
  | 'SEC5_BENEFICIARIES'
  | 'SEC5_CONFIRM'
  | 'SEC6_MINORS_GUARDIAN'
  | 'SEC6_CONFIRM'
  | 'SEC7_RESIDUARY'
  | 'SEC7_CONFIRM'
  | 'SEC8_SPECIAL_WISHES'
  | 'SEC8_CONFIRM'
  | 'SEC9_WITNESSES'
  | 'SEC9_CONFIRM'
  | 'SEC10_DOCTOR'
  | 'SEC10_CONFIRM'
  | 'FINISHED'
  | 'STOPPED';

export interface ChatMessage {
  id: string;
  sender: 'assistant' | 'user';
  text: string;
  timestamp: number;
  stepKey?: StepKey;
  suggestions?: string[];
  isSummary?: boolean;
  isEscalation?: boolean;
  isError?: boolean;
  jsonPayload?: any;
  finalFourLines?: string[];
}
