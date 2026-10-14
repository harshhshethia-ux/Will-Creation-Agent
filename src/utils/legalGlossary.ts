export interface LegalTerm {
  term: string;
  definition: string;
  actReference?: string;
}

export const LEGAL_TERMS: Record<string, LegalTerm> = {
  testator: {
    term: 'Testator',
    definition: 'The person making the will who specifies how their property is distributed.',
    actReference: 'Indian Succession Act, 1925, Section 2(h)',
  },
  executor: {
    term: 'Executor',
    definition: 'The trusted person appointed to administer your estate and carry out your instructions after your death.',
    actReference: 'Indian Succession Act, 1925, Section 2(c)',
  },
  codicil: {
    term: 'Codicil',
    definition: 'A formal legal supplement or amendment made to an existing will.',
    actReference: 'Indian Succession Act, 1925, Section 2(b)',
  },
  residuary: {
    term: 'Residuary Estate',
    definition: 'Everything you own that has not been specifically gifted to someone else, including future assets.',
    actReference: 'Indian Succession Act, 1925, Section 102',
  },
  nominee: {
    term: 'Nominee',
    definition: 'A nominee is merely a custodian appointed to collect funds from an institution; your will decides who legally inherits the property.',
    actReference: 'Supreme Court ruling in Sarbati Devi & Shipra Sengupta cases',
  },
  coparcener: {
    term: 'Coparcener / HUF',
    definition: 'A joint heir in Hindu Undivided Family property by birth; you can bequeath only your personal undivided share.',
    actReference: 'Hindu Succession Act, 1956, Section 6 & 30',
  },
  probate: {
    term: 'Probate',
    definition: 'A court certification confirming that the will is genuine and granting the executor authority to act.',
    actReference: 'Indian Succession Act, 1925, Section 2(f)',
  },
  attestation: {
    term: 'Attestation',
    definition: 'The act of two independent witnesses signing to certify they saw the testator sign voluntarily in sound mind.',
    actReference: 'Indian Succession Act, 1925, Section 63',
  },
  guardian_person: {
    term: 'Guardian of the Person',
    definition: "The individual responsible for a minor's physical custody, care, health, upbringing and daily welfare.",
    actReference: 'Hindu Minority and Guardianship Act, 1956, Section 9',
  },
  guardian_property: {
    term: 'Guardian of the Property',
    definition: "The individual responsible for managing, conserving and investing assets belonging to a minor.",
    actReference: 'Hindu Minority and Guardianship Act, 1956, Section 9',
  },
  testamentary_capacity: {
    term: 'Testamentary Capacity',
    definition: 'The sound mental disposition enabling a testator to understand what they own, their family, and the effect of their will.',
    actReference: 'Indian Succession Act, 1925, Section 59',
  },
};
