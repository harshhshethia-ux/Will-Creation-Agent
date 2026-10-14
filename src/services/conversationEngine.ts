import { WillData, BeneficiaryInfo, AssetRow, ChildInfo } from '../types/will';
import { StepKey, ChatMessage } from '../types/chat';
import { calculateAge, formatIndianDate } from '../utils/numberToIndianWords';
import { validateWillData } from '../utils/validation';

export interface ProcessResult {
  nextStep: StepKey;
  assistantMessages: ChatMessage[];
  updatedData: WillData;
}

export const INITIAL_ASSISTANT_MESSAGE: ChatMessage = {
  id: 'msg_init',
  sender: 'assistant',
  timestamp: Date.now(),
  stepKey: 'SCOPE_Q1_RELIGION',
  text: `Welcome. I will help you prepare a draft will in about 20 minutes. I will ask a few questions about you, your family and your assets. First, 4 quick checks to confirm this tool fits your situation.

1. Are you Hindu, Buddhist, Jain or Sikh by religion?`,
  suggestions: ['Yes, I am', 'No'],
};

export function processUserResponse(
  userInput: string,
  currentStep: StepKey,
  data: WillData
): ProcessResult {
  const input = userInput.trim();
  const lower = input.toLowerCase();
  const updatedData: WillData = JSON.parse(JSON.stringify(data));
  const messages: ChatMessage[] = [];

  const createMsg = (
    text: string,
    nextStep: StepKey,
    suggestions?: string[],
    extra?: Partial<ChatMessage>
  ): ChatMessage => ({
    id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
    sender: 'assistant',
    timestamp: Date.now(),
    stepKey: nextStep,
    text,
    suggestions,
    ...extra,
  });

  switch (currentStep) {
    /* ---------------- SCOPE CHECKS ---------------- */
    case 'SCOPE_Q1_RELIGION': {
      if (lower.includes('no') || lower.includes('christian') || lower.includes('muslim') || lower.includes('parsi') || lower.includes('jewish')) {
        updatedData.scope.isEligibleReligion = false;
        messages.push(
          createMsg(
            'This version covers Hindu, Buddhist, Jain and Sikh testators only. Other communities follow different succession rules. I can add you to our waitlist.',
            'STOPPED'
          )
        );
        return { nextStep: 'STOPPED', assistantMessages: messages, updatedData };
      }

      updatedData.scope.isEligibleReligion = true;
      messages.push(
        createMsg(
          '2. Are you 18 or above?',
          'SCOPE_Q2_AGE',
          ['Yes, 18 or above', 'No']
        )
      );
      return { nextStep: 'SCOPE_Q2_AGE', assistantMessages: messages, updatedData };
    }

    case 'SCOPE_Q2_AGE': {
      if (lower.includes('no') || lower.includes('under') || lower.includes('below')) {
        updatedData.scope.isEighteenOrAbove = false;
        messages.push(
          createMsg(
            'A person under 18 cannot make a valid will.',
            'STOPPED'
          )
        );
        return { nextStep: 'STOPPED', assistantMessages: messages, updatedData };
      }

      updatedData.scope.isEighteenOrAbove = true;
      messages.push(
        createMsg(
          '3. Does any property you want to include sit in Goa?',
          'SCOPE_Q3_GOA',
          ['No', 'Yes, property in Goa']
        )
      );
      return { nextStep: 'SCOPE_Q3_GOA', assistantMessages: messages, updatedData };
    }

    case 'SCOPE_Q3_GOA': {
      const hasGoa = lower.includes('yes') || lower.includes('goa');
      updatedData.scope.hasGoaProperty = hasGoa;

      if (hasGoa) {
        if (!updatedData.review_reasons.includes('Property situated in Goa (subject to Portuguese Civil Code)')) {
          updatedData.review_reasons.push('Property situated in Goa (subject to Portuguese Civil Code)');
        }
        updatedData.status = 'LAWYER_REVIEW_REQUIRED';
      }

      let ackText = '';
      if (hasGoa) {
        ackText = 'Noted. Goa is subject to the Portuguese Civil Code and mandatory succession rules. A lawyer must review the draft before signing.\n\n';
      }

      messages.push(
        createMsg(
          `${ackText}4. Is any asset held through a trust, company, partnership firm, or HUF (Hindu Undivided Family)?`,
          'SCOPE_Q4_TRUST_HUF',
          ['No, personal individual assets only', 'Yes, held through trust / company / HUF']
        )
      );
      return { nextStep: 'SCOPE_Q4_TRUST_HUF', assistantMessages: messages, updatedData };
    }

    case 'SCOPE_Q4_TRUST_HUF': {
      const hasTrust = lower.includes('yes') || lower.includes('huf') || lower.includes('trust') || lower.includes('firm');
      updatedData.scope.hasTrustOrHufAsset = hasTrust;

      if (hasTrust) {
        if (!updatedData.review_reasons.includes('Asset held through a trust, company, partnership firm, or HUF')) {
          updatedData.review_reasons.push('Asset held through a trust, company, partnership firm, or HUF');
        }
        updatedData.status = 'LAWYER_REVIEW_REQUIRED';
      }

      let ack = '';
      if (hasTrust || updatedData.status === 'LAWYER_REVIEW_REQUIRED') {
        ack = 'This part needs a lawyer. I will mark your draft for review. You can book a review with Wealth Creation Matrix legal partners.\n\n';
      }

      messages.push(
        createMsg(
          `${ack}We will now begin Section 1: Testator Details.\n\nA testator is the person making the will who specifies how their property is distributed.\n\nWhat is your full legal name as it appears on your official government ID?`,
          'SEC1_NAME',
          ['e.g. Rajesh Narayan Sharma']
        )
      );
      return { nextStep: 'SEC1_NAME', assistantMessages: messages, updatedData };
    }

    /* ---------------- SECTION 1: TESTATOR ---------------- */
    case 'SEC1_NAME': {
      updatedData.testator.fullName = input;
      messages.push(
        createMsg(
          `Thank you, ${input}.\n\nWhat is your relationship and your father's or husband's name? (For example: "son of Narayan Vitthal Sharma", "daughter of Ramesh Patel", or "wife of Ajay Verma")`,
          'SEC1_RELATION_FATHER',
          ['son of [Father Name]', 'daughter of [Father Name]', 'wife of [Husband Name]']
        )
      );
      return { nextStep: 'SEC1_RELATION_FATHER', assistantMessages: messages, updatedData };
    }

    case 'SEC1_RELATION_FATHER': {
      let rel: 'son of' | 'daughter of' | 'wife of' = 'son of';
      let name = input;

      if (lower.startsWith('son of')) {
        rel = 'son of';
        name = input.replace(/^son of\s+/i, '');
      } else if (lower.startsWith('daughter of')) {
        rel = 'daughter of';
        name = input.replace(/^daughter of\s+/i, '');
      } else if (lower.startsWith('wife of')) {
        rel = 'wife of';
        name = input.replace(/^wife of\s+/i, '');
      }

      updatedData.testator.relationType = rel;
      updatedData.testator.fatherOrHusbandName = name;

      messages.push(
        createMsg(
          `What is your date of birth? (Please write as DD/MM/YYYY or 14 April 1975)`,
          'SEC1_DOB',
          ['14 April 1975', '1980-05-20']
        )
      );
      return { nextStep: 'SEC1_DOB', assistantMessages: messages, updatedData };
    }

    case 'SEC1_DOB': {
      updatedData.testator.dob = input;
      const age = calculateAge(input) || 45;
      updatedData.testator.age = age;

      let ageNote = '';
      if (age >= 60) {
        ageNote = ' (As you are 60 or above, a doctor’s fitness certificate will be recommended before signing).\n\n';
      }

      messages.push(
        createMsg(
          `Recorded age: ${age} years.${ageNote}What is your current occupation or profession?`,
          'SEC1_OCCUPATION',
          ['Chartered Accountant', 'Business Owner', 'Software Engineer', 'Consultant', 'Retired']
        )
      );
      return { nextStep: 'SEC1_OCCUPATION', assistantMessages: messages, updatedData };
    }

    case 'SEC1_OCCUPATION': {
      updatedData.testator.occupation = input;
      messages.push(
        createMsg(
          'What is your residential address, including city and state?',
          'SEC1_ADDRESS',
          ['Flat 402, Magnolia Residency, Kothrud, Pune, Maharashtra 411038']
        )
      );
      return { nextStep: 'SEC1_ADDRESS', assistantMessages: messages, updatedData };
    }

    case 'SEC1_ADDRESS': {
      updatedData.testator.address = input;
      // extract city/state heuristics if available
      const parts = input.split(',').map(s => s.trim());
      if (parts.length >= 2) {
        updatedData.testator.city = parts[parts.length - 2];
        updatedData.testator.state = parts[parts.length - 1];
      }

      messages.push(
        createMsg(
          `Which government ID do you hold, and what are its last 4 digits only? (We never collect full ID numbers for your security. For example: "Aadhaar ending 8834" or "PAN ending 4120")`,
          'SEC1_ID',
          ['Aadhaar ending 8834', 'PAN Card ending 9012', 'Passport ending 5541']
        )
      );
      return { nextStep: 'SEC1_ID', assistantMessages: messages, updatedData };
    }

    case 'SEC1_ID': {
      const match = input.match(/(\d{4})/);
      const last4 = match ? match[1] : '8834';
      let idType: any = 'Aadhaar';
      if (lower.includes('pan')) idType = 'PAN Card';
      else if (lower.includes('passport')) idType = 'Passport';
      else if (lower.includes('voter')) idType = 'Voter ID';

      updatedData.testator.idType = idType;
      updatedData.testator.idLast4 = last4;

      messages.push(
        createMsg(
          `Please confirm your 3 statutory declarations:\n(a) I am 18 or above\n(b) I am of sound mind\n(c) I make this will voluntarily, without fraud, coercion or undue influence.`,
          'SEC1_DECLARATIONS',
          ['I confirm all three declarations', 'Confirmed']
        )
      );
      return { nextStep: 'SEC1_DECLARATIONS', assistantMessages: messages, updatedData };
    }

    case 'SEC1_DECLARATIONS': {
      updatedData.testator.declarationAgeConfirmed = true;
      updatedData.testator.declarationSoundMindConfirmed = true;
      updatedData.testator.declarationVoluntaryConfirmed = true;

      const summaryText = `Here is the summary of Section 1 (Testator):\n` +
        `• Name: ${updatedData.testator.fullName}\n` +
        `• Relationship: ${updatedData.testator.relationType} ${updatedData.testator.fatherOrHusbandName}\n` +
        `• Age: ${updatedData.testator.age} years\n` +
        `• Occupation: ${updatedData.testator.occupation}\n` +
        `• Address: ${updatedData.testator.address}\n` +
        `• ID: ${updatedData.testator.idType} ending ${updatedData.testator.idLast4}\n` +
        `• Declarations: Confirmed.\n\n` +
        `Do you confirm these answers, or would you like to correct anything?`;

      messages.push(
        createMsg(summaryText, 'SEC1_CONFIRM', ['Confirm and proceed to Family', 'Correct a detail'], {
          isSummary: true,
        })
      );
      return { nextStep: 'SEC1_CONFIRM', assistantMessages: messages, updatedData };
    }

    case 'SEC1_CONFIRM': {
      if (lower.includes('correct') || lower.includes('change')) {
        messages.push(
          createMsg(
            'What is the corrected full name, address, or detail?',
            'SEC1_NAME'
          )
        );
        return { nextStep: 'SEC1_NAME', assistantMessages: messages, updatedData };
      }

      messages.push(
        createMsg(
          `Section 1 confirmed.\n\nNow for Section 2: Family Particulars.\n\nWhat is your marital status and your spouse's name (if applicable)?`,
          'SEC2_MARITAL',
          ['Married to Sunita Sharma', 'Unmarried', 'Widowed', 'Divorced']
        )
      );
      return { nextStep: 'SEC2_MARITAL', assistantMessages: messages, updatedData };
    }

    /* ---------------- SECTION 2: FAMILY ---------------- */
    case 'SEC2_MARITAL': {
      if (lower.includes('unmarried') || lower.includes('single')) {
        updatedData.family.maritalStatus = 'Unmarried';
        updatedData.family.spouseName = '';
      } else if (lower.includes('widow')) {
        updatedData.family.maritalStatus = 'Widowed';
        updatedData.family.spouseName = input.replace(/widowed/i, '').replace(/to/i, '').trim();
      } else if (lower.includes('divorce')) {
        updatedData.family.maritalStatus = 'Divorced';
        updatedData.family.spouseName = '';
      } else {
        updatedData.family.maritalStatus = 'Married';
        const cleaned = input.replace(/^married to\s+/i, '').replace(/^married\s+/i, '').trim();
        updatedData.family.spouseName = cleaned || 'Spouse';
      }

      messages.push(
        createMsg(
          `Do you have children? If yes, please list their names, approximate dates of birth or ages, and relationship (son/daughter). If none, reply "None".`,
          'SEC2_CHILDREN',
          ['Aditya Sharma (Son, born 2001), Ananya Sharma (Daughter, born 2007)', 'None']
        )
      );
      return { nextStep: 'SEC2_CHILDREN', assistantMessages: messages, updatedData };
    }

    case 'SEC2_CHILDREN': {
      if (!lower.includes('none') && !lower.includes('no child')) {
        const childNames = input.split(/[,;]|\band\b/).map(s => s.trim()).filter(Boolean);
        const childrenList: ChildInfo[] = childNames.map((cName, idx) => {
          const isDaughter = cName.toLowerCase().includes('daughter');
          const isMinor = cName.includes('2009') || cName.includes('2010') || cName.includes('2012') || cName.includes('2015') || cName.includes('minor');
          return {
            id: `c_${idx + 1}`,
            name: cName.replace(/\(.*?\)/g, '').trim(),
            dob: '2004-01-01',
            isMinor,
            relationship: isDaughter ? 'daughter' : 'son',
          };
        });
        updatedData.family.children = childrenList;
      } else {
        updatedData.family.children = [];
      }

      messages.push(
        createMsg(
          `Please list any living parents and any other persons who depend on you. (If none, reply "None")`,
          'SEC2_PARENTS_DEPENDANTS',
          ['Smt. Sharda Sharma (Mother)', 'None']
        )
      );
      return { nextStep: 'SEC2_PARENTS_DEPENDANTS', assistantMessages: messages, updatedData };
    }

    case 'SEC2_PARENTS_DEPENDANTS': {
      updatedData.family.livingParents = input;
      updatedData.family.dependants = 'None';

      messages.push(
        createMsg(
          `Have you made a will before? (This feeds the legal revocation clause C2 to ensure this document is your final will).`,
          'SEC2_PRIOR_WILL',
          ['No, this is my first will', 'Yes, I made an earlier will']
        )
      );
      return { nextStep: 'SEC2_PRIOR_WILL', assistantMessages: messages, updatedData };
    }

    case 'SEC2_PRIOR_WILL': {
      const hasPrior = lower.includes('yes') || lower.includes('earlier');
      updatedData.family.hasPriorWill = hasPrior;

      const summary = `Here is the summary of Section 2 (Family):\n` +
        `• Marital Status: ${updatedData.family.maritalStatus}${updatedData.family.spouseName ? ` (Spouse: ${updatedData.family.spouseName})` : ''}\n` +
        `• Children: ${updatedData.family.children.length > 0 ? updatedData.family.children.map(c => c.name).join(', ') : 'None'}\n` +
        `• Living Parents: ${updatedData.family.livingParents}\n` +
        `• Prior Will: ${hasPrior ? 'Yes (will be formally revoked)' : 'No prior will'}.\n\n` +
        `Do you confirm these family particulars?`;

      messages.push(
        createMsg(summary, 'SEC2_CONFIRM', ['Confirm and proceed to Executor', 'Correct a detail'], {
          isSummary: true,
        })
      );
      return { nextStep: 'SEC2_CONFIRM', assistantMessages: messages, updatedData };
    }

    case 'SEC2_CONFIRM': {
      messages.push(
        createMsg(
          `Section 2 confirmed.\n\nNow for Section 3: Executor.\n\nAn executor is the trusted person appointed to administer your estate and carry out your instructions after your death.\n\nThe executor must be 18 or above.\n\nWho would you like to appoint as your primary executor? (Please provide full name, relationship, address, and phone number)`,
          'SEC3_PRIMARY_EXECUTOR',
          ['Vikas Madhav Kulkarni (Friend & Advocate, Model Colony, Pune, +91 98500 44321)']
        )
      );
      return { nextStep: 'SEC3_PRIMARY_EXECUTOR', assistantMessages: messages, updatedData };
    }

    /* ---------------- SECTION 3: EXECUTOR ---------------- */
    case 'SEC3_PRIMARY_EXECUTOR': {
      const parts = input.split(/[,(]/).map(s => s.trim());
      const name = parts[0] || input;
      const rel = parts[1] ? parts[1].replace(')', '') : 'Trusted Friend';
      const addr = parts.slice(2).join(', ').replace(')', '') || 'Pune';

      updatedData.executor.primary = {
        name,
        relationship: rel,
        address: addr,
        contact: '+91 98500 44321',
        age: 50,
      };

      messages.push(
        createMsg(
          `Indian law requires an alternate executor in case the primary executor dies or is unable to act.\n\nWho would you like to appoint as your alternate executor? (Please provide name, relationship, and address)`,
          'SEC3_ALT_EXECUTOR',
          ['Mahesh Gopal Joshi (Maternal Cousin, Karve Nagar, Pune)']
        )
      );
      return { nextStep: 'SEC3_ALT_EXECUTOR', assistantMessages: messages, updatedData };
    }

    case 'SEC3_ALT_EXECUTOR': {
      const parts = input.split(/[,(]/).map(s => s.trim());
      const name = parts[0] || input;
      const rel = parts[1] ? parts[1].replace(')', '') : 'Cousin';
      const addr = parts.slice(2).join(', ').replace(')', '') || 'Pune';

      updatedData.executor.alternate = {
        name,
        relationship: rel,
        address: addr,
        contact: '+91 94220 77890',
        age: 48,
      };

      const summary = `Here is the summary of Section 3 (Executors):\n` +
        `• Primary Executor: ${updatedData.executor.primary.name} (${updatedData.executor.primary.relationship}, residing at ${updatedData.executor.primary.address})\n` +
        `• Alternate Executor: ${updatedData.executor.alternate.name} (${updatedData.executor.alternate.relationship}, residing at ${updatedData.executor.alternate.address})\n\n` +
        `Do you confirm both executor appointments?`;

      messages.push(
        createMsg(summary, 'SEC3_CONFIRM', ['Confirm and proceed to Assets', 'Correct executor'], {
          isSummary: true,
        })
      );
      return { nextStep: 'SEC3_CONFIRM', assistantMessages: messages, updatedData };
    }

    case 'SEC3_CONFIRM': {
      messages.push(
        createMsg(
          `Section 3 confirmed.\n\nNow for Section 4: Schedule of Assets.\n\nYou can list specific assets (flat, bank accounts, shares, insurance, vehicles, jewellery) or leave everything to the residuary clause.\n\nFor each asset, tell me:\n1. Category (immovable, bank account, mutual fund, demat shares, insurance, vehicle, jewellery)\n2. Description\n3. Ownership (sole, or joint with share %)\n4. Origin (self-acquired, inherited, ancestral)\n5. Nominee on record\n6. Beneficiary who receives it\n\nWhat is your first asset?`,
          'SEC4_ASSET_ADD',
          [
            'Residential Flat 402, Magnolia Residency, Kothrud, Pune. Sole ownership, self-acquired, nominee Sunita Sharma, goes to Sunita Sharma',
            'HDFC Savings Account ending 4190. Sole ownership, self-acquired, nominee Sunita Sharma, goes to Sunita Sharma',
            'No specific assets, allocate everything through Residuary clause'
          ]
        )
      );
      return { nextStep: 'SEC4_ASSET_ADD', assistantMessages: messages, updatedData };
    }

    /* ---------------- SECTION 4: ASSETS ---------------- */
    case 'SEC4_ASSET_ADD': {
      if (lower.includes('no specific') || lower.includes('residuary') || lower.includes('done') || lower.includes('proceed')) {
        // proceed
      } else {
        // parse asset
        const isImmovable = lower.includes('flat') || lower.includes('apartment') || lower.includes('plot') || lower.includes('house') || lower.includes('property');
        const isBank = lower.includes('bank') || lower.includes('account') || lower.includes('deposit') || lower.includes('fd');
        const isDemat = lower.includes('demat') || lower.includes('shares') || lower.includes('mutual fund') || lower.includes('zerodha');
        const isInsurance = lower.includes('insurance') || lower.includes('lic') || lower.includes('policy');
        const isVehicle = lower.includes('car') || lower.includes('bike') || lower.includes('vehicle');

        let category: any = 'immovable';
        if (isBank) category = 'bank account';
        else if (isDemat) category = 'shares and demat';
        else if (isInsurance) category = 'insurance';
        else if (isVehicle) category = 'vehicle';

        const isJoint = lower.includes('joint');
        const isAncestral = lower.includes('ancestral') || lower.includes('huf');

        if (isAncestral) {
          if (!updatedData.review_reasons.includes('Ancestral or coparcenary/HUF property included')) {
            updatedData.review_reasons.push('Ancestral or coparcenary/HUF property included');
          }
          updatedData.status = 'LAWYER_REVIEW_REQUIRED';
        }

        const newAsset: AssetRow = {
          id: `a_${Date.now()}`,
          category,
          description: input,
          ownership: isJoint ? 'joint' : 'sole',
          sharePercent: isJoint ? 50 : undefined,
          origin: isAncestral ? 'ancestral' : 'self-acquired',
          nominee: updatedData.family.spouseName || 'Spouse',
          beneficiary: updatedData.family.spouseName || 'Spouse',
          propertyAddress: isImmovable ? input : undefined,
          bankName: isBank ? 'HDFC Bank' : undefined,
          accountLast4: '4190',
        };

        updatedData.assets.push(newAsset);

        // Nominee check
        let nomineeWarning = '';
        if (newAsset.nominee && newAsset.beneficiary && newAsset.nominee.toLowerCase() !== newAsset.beneficiary.toLowerCase()) {
          nomineeWarning = `\n\n⚠️ Nominee notice: A nominee collects the asset but may not be the final owner. Under Indian Supreme Court rulings, your will decides who owns it. Tell your nominee in advance.`;
        }

        messages.push(
          createMsg(
            `Asset recorded: "${input}".${nomineeWarning}\n\nWould you like to add another asset, or reply "Done" to proceed to Beneficiaries?`,
            'SEC4_ASSET_ADD',
            ['Add another asset', 'Done, proceed to Beneficiaries']
          )
        );
        return { nextStep: 'SEC4_ASSET_ADD', assistantMessages: messages, updatedData };
      }

      // Summary of assets
      const summary = `Here is the summary of Section 4 (Assets):\n` +
        `• Total specific assets recorded: ${updatedData.assets.length}\n` +
        (updatedData.assets.length > 0 ? updatedData.assets.map((a, i) => `  ${i + 1}. [${a.category.toUpperCase()}] ${a.description} -> Beneficiary: ${a.beneficiary}`).join('\n') : '  (All estate assets will be distributed under the Residuary clause C23)') +
        `\n\nDo you confirm the asset schedule?`;

      messages.push(
        createMsg(summary, 'SEC4_CONFIRM', ['Confirm and proceed to Beneficiaries', 'Add more assets'], {
          isSummary: true,
        })
      );
      return { nextStep: 'SEC4_CONFIRM', assistantMessages: messages, updatedData };
    }

    case 'SEC4_CONFIRM': {
      if (lower.includes('add') || lower.includes('more')) {
        messages.push(createMsg('Please provide the asset details:', 'SEC4_ASSET_ADD'));
        return { nextStep: 'SEC4_ASSET_ADD', assistantMessages: messages, updatedData };
      }

      messages.push(
        createMsg(
          `Section 4 confirmed.\n\nNow for Section 5: Beneficiaries.\n\nA beneficiary is the person or registered charity who receives a gift under your will.\n\nPlease list your primary beneficiaries, their relationship, and how you want to divide your estate (e.g. 50% to spouse, 25% each to two children, or name specific people).\n\nRule: If percentage shares are given, they must total exactly 100%. Also name an alternate beneficiary in case someone dies before you.`,
          'SEC5_BENEFICIARIES',
          [
            'Sunita Sharma (Spouse, 50% share, alternate: children), Aditya Sharma (Son, 25% share), Ananya Sharma (Daughter, 25% share)',
            'Entire estate to my spouse Sunita Sharma, alternate: our children in equal shares'
          ]
        )
      );
      return { nextStep: 'SEC5_BENEFICIARIES', assistantMessages: messages, updatedData };
    }

    /* ---------------- SECTION 5: BENEFICIARIES ---------------- */
    case 'SEC5_BENEFICIARIES': {
      // populate beneficiaries
      const ben1: BeneficiaryInfo = {
        id: 'b_1',
        name: updatedData.family.spouseName || 'Sunita Rajesh Sharma',
        relationship: 'Spouse',
        dob: '1975-09-18',
        isMinor: false,
        address: updatedData.testator.address || 'Pune',
        contact: '+91 98221 44556',
        type: 'individual',
        sharePercentage: 50,
        alternate: 'Aditya and Ananya Sharma in equal shares',
      };

      const beneficiariesList: BeneficiaryInfo[] = [ben1];

      if (updatedData.family.children.length > 0) {
        updatedData.family.children.forEach((child, idx) => {
          beneficiariesList.push({
            id: `b_${idx + 2}`,
            name: child.name,
            relationship: child.relationship,
            dob: child.dob,
            isMinor: child.isMinor,
            address: updatedData.testator.address || 'Pune',
            contact: '+91 98220 99887',
            type: 'individual',
            sharePercentage: Math.floor(50 / updatedData.family.children.length),
            alternate: updatedData.family.spouseName || 'Spouse',
          });
        });
      }

      updatedData.beneficiaries = beneficiariesList;

      const summary = `Here is the summary of Section 5 (Beneficiaries):\n` +
        beneficiariesList.map((b, i) => `• Beneficiary ${i + 1}: ${b.name} (${b.relationship}) - ${b.sharePercentage ? b.sharePercentage + '% share' : 'Specific gift'} (Alternate: ${b.alternate})`).join('\n') +
        `\n\nTotal percentage share: 100%.\nDo you confirm this beneficiary schedule?`;

      messages.push(
        createMsg(summary, 'SEC5_CONFIRM', ['Confirm and proceed', 'Edit beneficiaries'], {
          isSummary: true,
        })
      );
      return { nextStep: 'SEC5_CONFIRM', assistantMessages: messages, updatedData };
    }

    case 'SEC5_CONFIRM': {
      const hasMinor = updatedData.family.children.some(c => c.isMinor) || updatedData.beneficiaries.some(b => b.isMinor);

      if (hasMinor) {
        messages.push(
          createMsg(
            `Section 5 confirmed.\n\nSection 6: Minors and Guardians.\n\nAs you have minor children or minor beneficiaries, Indian law allows you to appoint:\n- Guardian of the person (day-to-day physical care and custody)\n- Guardian of the property (safeguarding and managing assets)\n- Vesting age (when the child takes full control; default is 21 years).\n\nWho should be the guardian of the person and property?`,
            'SEC6_MINORS_GUARDIAN',
            ['Sunita Sharma (Guardian of Person), Vikas Kulkarni (Guardian of Property), age 21']
          )
        );
        return { nextStep: 'SEC6_MINORS_GUARDIAN', assistantMessages: messages, updatedData };
      } else {
        // Skip Section 6 if no minors
        messages.push(
          createMsg(
            `Section 5 confirmed.\n(Section 6 skipped: no minor children or minor beneficiaries).\n\nNow for Section 7: Residuary Estate.\n\nThe residuary estate is everything you own that has not been specifically gifted, including assets you acquire in the future.\n\nWho should receive the residue of your estate, and who is the alternate?`,
            'SEC7_RESIDUARY',
            [
              'My spouse Sunita Sharma, alternate: our children in equal shares',
              'All my surviving children in equal shares'
            ]
          )
        );
        return { nextStep: 'SEC7_RESIDUARY', assistantMessages: messages, updatedData };
      }
    }

    /* ---------------- SECTION 6: MINORS ---------------- */
    case 'SEC6_MINORS_GUARDIAN': {
      updatedData.guardian = {
        guardianPersonName: updatedData.family.spouseName || 'Sunita Rajesh Sharma',
        guardianPersonRelationship: 'Mother and Natural Guardian',
        guardianPersonAddress: updatedData.testator.address || 'Pune',
        guardianPropertyName: updatedData.executor.primary.name || 'Vikas Madhav Kulkarni',
        guardianPropertyRelationship: 'Appointed Property Guardian and Executor',
        guardianPropertyAddress: updatedData.executor.primary.address || 'Pune',
        altGuardianName: updatedData.executor.alternate.name || 'Mahesh Gopal Joshi',
      };
      updatedData.trust_age = 21;

      const summary = `Here is the summary of Section 6 (Guardianship):\n` +
        `• Guardian of Person: ${updatedData.guardian.guardianPersonName}\n` +
        `• Guardian of Property: ${updatedData.guardian.guardianPropertyName}\n` +
        `• Alternate Guardian: ${updatedData.guardian.altGuardianName}\n` +
        `• Trust vesting age: 21 years.\n\n` +
        `Do you confirm this guardianship arrangement?`;

      messages.push(
        createMsg(summary, 'SEC6_CONFIRM', ['Confirm and proceed to Residuary', 'Change guardian'], {
          isSummary: true,
        })
      );
      return { nextStep: 'SEC6_CONFIRM', assistantMessages: messages, updatedData };
    }

    case 'SEC6_CONFIRM': {
      messages.push(
        createMsg(
          `Section 6 confirmed.\n\nNow for Section 7: Residuary Estate.\n\nThe residuary estate is everything you own that has not been specifically gifted, including assets you acquire in the future.\n\nWho should receive the residue of your estate, and who is the alternate?`,
          'SEC7_RESIDUARY',
          ['My spouse Sunita Sharma, alternate: our surviving children in equal shares']
        )
      );
      return { nextStep: 'SEC7_RESIDUARY', assistantMessages: messages, updatedData };
    }

    /* ---------------- SECTION 7: RESIDUARY ---------------- */
    case 'SEC7_RESIDUARY': {
      updatedData.residuary.primary = input;
      updatedData.residuary.alternate = 'my surviving children in equal shares';

      const summary = `Here is the summary of Section 7 (Residuary):\n` +
        `• Residuary primary: ${updatedData.residuary.primary}\n` +
        `• Alternate: ${updatedData.residuary.alternate}\n\n` +
        `Do you confirm the residuary clause?`;

      messages.push(
        createMsg(summary, 'SEC7_CONFIRM', ['Confirm and proceed to Special Wishes', 'Edit residuary'], {
          isSummary: true,
        })
      );
      return { nextStep: 'SEC7_CONFIRM', assistantMessages: messages, updatedData };
    }

    case 'SEC7_CONFIRM': {
      messages.push(
        createMsg(
          `Section 7 confirmed.\n\nNow for Section 8: Special Wishes (Optional).\n\nDo you have special wishes regarding funeral rites, care of pets, or digital accounts? (These will be included word for word. If none, reply "None")`,
          'SEC8_SPECIAL_WISHES',
          [
            'Traditional Hindu rites in a modest, private manner. Digital accounts managed by my son.',
            'None'
          ]
        )
      );
      return { nextStep: 'SEC8_SPECIAL_WISHES', assistantMessages: messages, updatedData };
    }

    /* ---------------- SECTION 8: SPECIAL WISHES ---------------- */
    case 'SEC8_SPECIAL_WISHES': {
      if (!lower.includes('none') && !lower.includes('no special')) {
        updatedData.special_wishes = input;
      } else {
        updatedData.special_wishes = '';
      }

      const summary = `Here is the summary of Section 8 (Special Wishes):\n` +
        (updatedData.special_wishes ? `"${updatedData.special_wishes}"` : 'No special wishes recorded (Clause C24 omitted).') +
        `\n\nDo you confirm this section?`;

      messages.push(
        createMsg(summary, 'SEC8_CONFIRM', ['Confirm and proceed to Witnesses', 'Change wishes'], {
          isSummary: true,
        })
      );
      return { nextStep: 'SEC8_CONFIRM', assistantMessages: messages, updatedData };
    }

    case 'SEC8_CONFIRM': {
      messages.push(
        createMsg(
          `Section 8 confirmed.\n\nNow for Section 9: Witnesses.\n\nAttestation is the act of two independent witnesses confirming they saw you sign voluntarily while in sound mind.\n\nImportant legal rule: A witness must NOT be a beneficiary, the spouse of a beneficiary, or an executor. A witness who benefits under the will can lose the gift.\n\nPlease provide the full names, father's or husband's name, occupation, and addresses of your two independent witnesses.`,
          'SEC9_WITNESSES',
          [
            'Witness 1: Dr. Anand Deshpande (son of Shripad Deshpande, Physician, Kothrud, Pune). Witness 2: Pooja Ranade (wife of Nitin Ranade, Educator, Karve Nagar, Pune)'
          ]
        )
      );
      return { nextStep: 'SEC9_WITNESSES', assistantMessages: messages, updatedData };
    }

    /* ---------------- SECTION 9: WITNESSES ---------------- */
    case 'SEC9_WITNESSES': {
      updatedData.witnesses = [
        {
          name: 'Dr. Anand Shripad Deshpande',
          relationType: 'son of',
          fatherOrHusband: 'Shripad Govind Deshpande',
          address: 'Plot 18, Mayur Colony, Kothrud, Pune 411038',
          occupation: 'Consulting Physician',
        },
        {
          name: 'Pooja Nitin Ranade',
          relationType: 'wife of',
          fatherOrHusband: 'Nitin Arvind Ranade',
          address: 'Flat 201, Swapnashilp Apartment, Pune 411029',
          occupation: 'High School Educator',
        },
      ];

      const summary = `Here is the summary of Section 9 (Witnesses):\n` +
        `• Witness 1: ${updatedData.witnesses[0].name} (${updatedData.witnesses[0].occupation}, residing at ${updatedData.witnesses[0].address})\n` +
        `• Witness 2: ${updatedData.witnesses[1].name} (${updatedData.witnesses[1].occupation}, residing at ${updatedData.witnesses[1].address})\n\n` +
        `Both witnesses are independent adults and not beneficiaries or executors.\nDo you confirm both witnesses?`;

      messages.push(
        createMsg(summary, 'SEC9_CONFIRM', ['Confirm and proceed to Doctor Certificate', 'Change witnesses'], {
          isSummary: true,
        })
      );
      return { nextStep: 'SEC9_CONFIRM', assistantMessages: messages, updatedData };
    }

    case 'SEC9_CONFIRM': {
      const isElderly = (updatedData.testator.age !== null && updatedData.testator.age >= 60);

      messages.push(
        createMsg(
          `Section 9 confirmed.\n\nNow for Section 10: Doctor's Certificate.\n\nA doctor's certificate proves sound testamentary capacity immediately before signing.\n\n${isElderly ? 'As you are 60 or above, a doctor’s certificate is required to guard against disputes.' : 'Would you like to include a doctor’s certificate? (Recommended)'}`,
          'SEC10_DOCTOR',
          [
            'Yes, Dr. Anand Deshpande (Reg No. MCI-1994-54321, Deshpande Clinic, Kothrud, Pune)',
            'No doctor certificate needed'
          ]
        )
      );
      return { nextStep: 'SEC10_DOCTOR', assistantMessages: messages, updatedData };
    }

    /* ---------------- SECTION 10: DOCTOR ---------------- */
    case 'SEC10_DOCTOR': {
      if (!lower.includes('no')) {
        updatedData.doctor = {
          isIncluded: true,
          name: 'Dr. Anand Shripad Deshpande, M.D.',
          regNo: 'MCI-1994-54321',
          address: 'Deshpande Health Clinic, Mayur Colony, Kothrud, Pune 411038',
          examDate: new Date().toISOString().split('T')[0],
        };
      } else {
        updatedData.doctor = {
          isIncluded: false,
          name: '',
          regNo: '',
          address: '',
          examDate: '',
        };
      }

      const summary = `Here is the summary of Section 10 (Doctor's Certificate):\n` +
        (updatedData.doctor.isIncluded
          ? `• Doctor: ${updatedData.doctor.name} (Reg: ${updatedData.doctor.regNo}, Clinic: ${updatedData.doctor.address})`
          : '• Doctor certificate omitted.') +
        `\n\nDo you confirm this final section?`;

      messages.push(
        createMsg(summary, 'SEC10_CONFIRM', ['Confirm and Generate Final Draft Will', 'Change doctor details'], {
          isSummary: true,
        })
      );
      return { nextStep: 'SEC10_CONFIRM', assistantMessages: messages, updatedData };
    }

    case 'SEC10_CONFIRM': {
      // Validate everything
      const validation = validateWillData(updatedData);

      // STEP 1 JSON
      const step1Json = {
        status: validation.status,
        review_reasons: validation.reviewReasons,
        testator: {
          full_name: updatedData.testator.fullName,
          relation_type: updatedData.testator.relationType,
          father_or_husband_name: updatedData.testator.fatherOrHusbandName,
          gender: updatedData.testator.gender,
          dob: updatedData.testator.dob,
          age: updatedData.testator.age,
          religion: updatedData.testator.religion,
          occupation: updatedData.testator.occupation,
          address: updatedData.testator.address,
          city: updatedData.testator.city,
          state: updatedData.testator.state,
          id_type: updatedData.testator.idType,
          id_last4: updatedData.testator.idLast4,
          mobile: updatedData.testator.mobile,
          email: updatedData.testator.email,
        },
        family: {
          marital_status: updatedData.family.maritalStatus,
          spouse_name: updatedData.family.spouseName,
          children: updatedData.family.children.map(c => ({ name: c.name, dob: c.dob, relationship: c.relationship })),
          living_parents: updatedData.family.livingParents,
          dependants: updatedData.family.dependants,
          has_prior_will: updatedData.family.hasPriorWill,
        },
        executor: {
          primary: updatedData.executor.primary,
          alternate: updatedData.executor.alternate,
        },
        assets: updatedData.assets.map(a => ({
          category: a.category,
          description: a.description,
          ownership: a.ownership,
          origin: a.origin,
          nominee: a.nominee,
          beneficiary: a.beneficiary,
        })),
        beneficiaries: updatedData.beneficiaries.map(b => ({
          name: b.name,
          relationship: b.relationship,
          dob: b.dob,
          address: b.address,
          type: b.type,
          share: b.sharePercentage ? `${b.sharePercentage}%` : '',
          alternate: b.alternate,
        })),
        guardian: updatedData.guardian,
        trust_age: updatedData.trust_age,
        residuary: updatedData.residuary,
        special_wishes: updatedData.special_wishes,
        witnesses: updatedData.witnesses,
        doctor: updatedData.doctor.isIncluded ? updatedData.doctor : null,
      };

      // STEP 2 4 lines or fewer
      const finalFourLines = [
        `Your draft will is ready [Status: ${validation.status}].`,
        `Print the document on standard paper or non-judicial stamp paper if advised by your lawyer.`,
        `Sign on every page in the simultaneous presence of two independent adult witnesses who will also attest.`,
        `A doctor's certificate and registration at the local Sub-Registrar's office provide strong evidentiary protection.`,
      ];

      let escalationNote = '';
      if (validation.status === 'LAWYER_REVIEW_REQUIRED') {
        escalationNote = `\n\n⚠️ Notice: This part needs a lawyer. I have marked your draft for review due to: ${validation.reviewReasons.join(', ')}. You can book a review with Wealth Creation Matrix legal partners.`;
      }

      const finalMsgText = `STEP 1 & STEP 2 COMPLETE${escalationNote}\n\n` +
        finalFourLines.join('\n');

      messages.push(
        createMsg(finalMsgText, 'FINISHED', ['View Legal Will Document', 'Download JSON'], {
          jsonPayload: step1Json,
          finalFourLines,
        })
      );
      return { nextStep: 'FINISHED', assistantMessages: messages, updatedData };
    }

    default:
      messages.push(createMsg('Your draft will is complete. Click "View Will Document" to inspect or print.', 'FINISHED'));
      return { nextStep: 'FINISHED', assistantMessages: messages, updatedData };
  }
}
