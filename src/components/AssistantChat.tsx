import React, { useState } from 'react';
import {
  Send,
  CheckCircle,
  AlertTriangle,
  HelpCircle,
  ChevronRight,
  ShieldAlert,
  ArrowRight,
  User,
  Users,
  Briefcase,
  Layers,
  Heart,
  Baby,
  FileCheck,
  Stethoscope,
  Info
} from 'lucide-react';
import { WillData, TestatorInfo, FamilyInfo, ExecutorInfo, AssetRow, BeneficiaryInfo, WitnessInfo, DoctorInfo } from '../types/will';
import { validateWillData } from '../utils/validation';
import { calculateAge, formatIndianDate } from '../utils/numberToIndianWords';
import { LEGAL_TERMS } from '../utils/legalGlossary';

interface AssistantChatProps {
  data: WillData;
  onUpdateData: (updater: (prev: WillData) => WillData) => void;
  onJumpToSection: (sectionIdx: number) => void;
  onViewDraft: () => void;
}

const SECTION_TITLES = [
  'Scope Check',
  'Section 1: Testator Details',
  'Section 2: Family Information',
  'Section 3: Executor Appointment',
  'Section 4: Assets & Nominations',
  'Section 5: Beneficiaries',
  'Section 6: Minors & Guardians',
  'Section 7: Residuary Estate',
  'Section 8: Special Wishes',
  'Section 9: Witnesses',
  'Section 10: Doctor Certificate',
];

export const AssistantChat: React.FC<AssistantChatProps> = ({
  data,
  onUpdateData,
  onJumpToSection,
  onViewDraft,
}) => {
  const [activeSection, setActiveSection] = useState<number>(1);
  const [confirmedSections, setConfirmedSections] = useState<Record<number, boolean>>({});
  const [showGlossary, setShowGlossary] = useState<string | null>(null);

  const validation = validateWillData(data);

  const handleConfirmSection = (secNum: number) => {
    setConfirmedSections(prev => ({ ...prev, [secNum]: true }));
    if (secNum < 10) {
      setActiveSection(secNum + 1);
    }
  };

  const isSecComplete = (secNum: number) => confirmedSections[secNum];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
      {/* Left Column: Progress & Sections List */}
      <div className="lg:col-span-4 space-y-4">
        <div className="bg-white rounded-lg border border-stone-200 p-5 shadow-xs">
          <div className="flex items-center justify-between mb-3 border-b border-stone-100 pb-3">
            <div>
              <p className="text-xs uppercase tracking-widest font-mono text-stone-500">Drafting Cadence</p>
              <h3 className="font-serif font-bold text-stone-900 text-lg">Will Schedule</h3>
            </div>
            <span className="text-xs font-mono text-stone-600 bg-stone-100 px-2 py-1 rounded">
              {Object.keys(confirmedSections).length} / 10 Confirmed
            </span>
          </div>

          <div className="space-y-1 text-xs">
            {SECTION_TITLES.slice(1).map((title, idx) => {
              const secNum = idx + 1;
              const isActive = activeSection === secNum;
              const isConfirmed = confirmedSections[secNum];

              return (
                <button
                  key={secNum}
                  onClick={() => setActiveSection(secNum)}
                  className={`w-full text-left px-3 py-2 rounded flex items-center justify-between transition-colors ${
                    isActive
                      ? 'bg-amber-100/70 font-semibold text-stone-900 border border-amber-300/60'
                      : isConfirmed
                      ? 'text-stone-700 hover:bg-stone-50'
                      : 'text-stone-500 hover:bg-stone-50'
                  }`}
                >
                  <span className="truncate">{title}</span>
                  {isConfirmed ? (
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-600 shrink-0 ml-1" />
                  ) : (
                    <span className="w-2 h-2 rounded-full bg-stone-300 shrink-0 ml-1" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Status / Escalation Card */}
        {validation.status === 'LAWYER_REVIEW_REQUIRED' && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-xs text-amber-900 space-y-2">
            <div className="flex items-center gap-2 font-semibold">
              <AlertTriangle className="w-4 h-4 text-amber-700" />
              <span>Lawyer Review Required</span>
            </div>
            <p className="text-stone-700 leading-relaxed">
              This part needs a lawyer. I will mark your draft for review. You can book a review with Wealth Creation Matrix Legal Partners.
            </p>
            <ul className="list-disc pl-4 space-y-1 text-stone-600">
              {validation.reviewReasons.map((reason, idx) => (
                <li key={idx}>{reason}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Nominee Warning Card */}
        {validation.hasNomineeMismatch && (
          <div className="bg-stone-100 border border-stone-200 rounded-lg p-4 text-xs text-stone-800 space-y-2">
            <div className="flex items-center gap-2 font-semibold text-stone-900">
              <Info className="w-4 h-4 text-amber-600" />
              <span>Nominee Notice</span>
            </div>
            <p className="text-stone-700 leading-relaxed">
              A nominee collects the asset from the bank or insurer, but may not be the final owner. Under Indian Supreme Court precedent, your will decides who owns it. Tell your nominee in advance.
            </p>
          </div>
        )}

        {/* Quick Glossary Pill Drawer */}
        <div className="bg-stone-50 border border-stone-200 rounded-lg p-4 text-xs text-stone-700">
          <p className="font-semibold text-stone-900 mb-2 flex items-center gap-1.5">
            <HelpCircle className="w-3.5 h-3.5 text-stone-500" />
            <span>Legal Terms Explained in 1 Line</span>
          </p>
          <div className="space-y-2">
            <div>
              <span className="font-medium text-stone-900">Testator: </span>
              <span className="text-stone-600">{LEGAL_TERMS.testator.definition}</span>
            </div>
            <div>
              <span className="font-medium text-stone-900">Executor: </span>
              <span className="text-stone-600">{LEGAL_TERMS.executor.definition}</span>
            </div>
            <div>
              <span className="font-medium text-stone-900">Residue: </span>
              <span className="text-stone-600">{LEGAL_TERMS.residuary.definition}</span>
            </div>
            <div>
              <span className="font-medium text-stone-900">Nominee: </span>
              <span className="text-stone-600">{LEGAL_TERMS.nominee.definition}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Right Column: Active Assistant Conversation & Confirmation Module */}
      <div className="lg:col-span-8 bg-white rounded-lg border border-stone-200 p-6 sm:p-8 shadow-xs space-y-6">
        {/* Assistant Header */}
        <div className="border-b border-stone-200 pb-4">
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase tracking-wider font-mono text-stone-500">
              Assistant Protocol • Section {activeSection} of 10
            </span>
            {confirmedSections[activeSection] && (
              <span className="text-xs font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 flex items-center gap-1">
                <CheckCircle className="w-3 h-3" /> Confirmed
              </span>
            )}
          </div>
          <h2 className="text-2xl font-serif font-bold text-stone-900 mt-1">
            {SECTION_TITLES[activeSection]}
          </h2>
        </div>

        {/* SECTION 1: TESTATOR */}
        {activeSection === 1 && (
          <div className="space-y-5">
            <div className="bg-stone-50 p-4 rounded text-sm text-stone-700 leading-relaxed border border-stone-100">
              <p className="font-medium text-stone-900 mb-1">
                A testator is the person making the will who specifies how their property is distributed.
              </p>
              <p>
                I need your personal details as they appear on your official government identification. Under Indian law, you must be of sound mind and acting of your own free volition. We only collect the last 4 digits of your ID number.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs sm:text-sm">
              <div>
                <label className="block font-medium text-stone-700 mb-1">Full Legal Name</label>
                <input
                  type="text"
                  placeholder="e.g. Rajesh Narayan Sharma"
                  value={data.testator.fullName}
                  onChange={e => onUpdateData(prev => ({
                    ...prev,
                    testator: { ...prev.testator, fullName: e.target.value }
                  }))}
                  className="w-full px-3 py-2 border border-stone-300 rounded focus:border-stone-900 focus:outline-hidden"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-medium text-stone-700 mb-1">Relationship</label>
                  <select
                    value={data.testator.relationType}
                    onChange={e => onUpdateData(prev => ({
                      ...prev,
                      testator: { ...prev.testator, relationType: e.target.value as any }
                    }))}
                    className="w-full px-3 py-2 border border-stone-300 rounded focus:border-stone-900 focus:outline-hidden"
                  >
                    <option value="son of">son of</option>
                    <option value="daughter of">daughter of</option>
                    <option value="wife of">wife of</option>
                  </select>
                </div>
                <div>
                  <label className="block font-medium text-stone-700 mb-1">Father's/Husband's Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Narayan Sharma"
                    value={data.testator.fatherOrHusbandName}
                    onChange={e => onUpdateData(prev => ({
                      ...prev,
                      testator: { ...prev.testator, fatherOrHusbandName: e.target.value }
                    }))}
                    className="w-full px-3 py-2 border border-stone-300 rounded focus:border-stone-900 focus:outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="block font-medium text-stone-700 mb-1">Date of Birth</label>
                <input
                  type="date"
                  value={data.testator.dob}
                  onChange={e => {
                    const dob = e.target.value;
                    const calculated = calculateAge(dob);
                    onUpdateData(prev => ({
                      ...prev,
                      testator: { ...prev.testator, dob, age: calculated }
                    }));
                  }}
                  className="w-full px-3 py-2 border border-stone-300 rounded focus:border-stone-900 focus:outline-hidden"
                />
                {data.testator.age !== null && (
                  <p className="text-xs text-stone-500 mt-1">Calculated Age: {data.testator.age} years</p>
                )}
              </div>

              <div>
                <label className="block font-medium text-stone-700 mb-1">Occupation</label>
                <input
                  type="text"
                  placeholder="e.g. Consultant / Business Owner"
                  value={data.testator.occupation}
                  onChange={e => onUpdateData(prev => ({
                    ...prev,
                    testator: { ...prev.testator, occupation: e.target.value }
                  }))}
                  className="w-full px-3 py-2 border border-stone-300 rounded focus:border-stone-900 focus:outline-hidden"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block font-medium text-stone-700 mb-1">Residential Address with City and State</label>
                <input
                  type="text"
                  placeholder="e.g. Flat 402, Magnolia Residency, Kothrud, Pune, Maharashtra 411038"
                  value={data.testator.address}
                  onChange={e => onUpdateData(prev => ({
                    ...prev,
                    testator: { ...prev.testator, address: e.target.value }
                  }))}
                  className="w-full px-3 py-2 border border-stone-300 rounded focus:border-stone-900 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block font-medium text-stone-700 mb-1">ID Type & Last 4 Digits Only</label>
                <div className="grid grid-cols-2 gap-2">
                  <select
                    value={data.testator.idType}
                    onChange={e => onUpdateData(prev => ({
                      ...prev,
                      testator: { ...prev.testator, idType: e.target.value as any }
                    }))}
                    className="w-full px-2 py-2 border border-stone-300 rounded focus:border-stone-900 focus:outline-hidden text-xs"
                  >
                    <option value="Aadhaar">Aadhaar</option>
                    <option value="PAN Card">PAN Card</option>
                    <option value="Passport">Passport</option>
                    <option value="Voter ID">Voter ID</option>
                    <option value="Driving Licence">Driving Licence</option>
                  </select>
                  <input
                    type="text"
                    maxLength={4}
                    placeholder="Last 4 (e.g. 8834)"
                    value={data.testator.idLast4}
                    onChange={e => onUpdateData(prev => ({
                      ...prev,
                      testator: { ...prev.testator, idLast4: e.target.value.replace(/\D/g, '') }
                    }))}
                    className="w-full px-3 py-2 border border-stone-300 rounded focus:border-stone-900 focus:outline-hidden text-center font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block font-medium text-stone-700 mb-1">Religion</label>
                <select
                  value={data.testator.religion}
                  onChange={e => onUpdateData(prev => ({
                    ...prev,
                    testator: { ...prev.testator, religion: e.target.value as any }
                  }))}
                  className="w-full px-3 py-2 border border-stone-300 rounded focus:border-stone-900 focus:outline-hidden"
                >
                  <option value="Hindu">Hindu</option>
                  <option value="Buddhist">Buddhist</option>
                  <option value="Jain">Jain</option>
                  <option value="Sikh">Sikh</option>
                </select>
              </div>
            </div>

            {/* 3 Statutory Declarations */}
            <div className="bg-amber-50/60 border border-amber-200/80 rounded p-4 space-y-2 text-xs text-stone-800">
              <p className="font-semibold text-stone-900">Mandatory Statutory Declarations:</p>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={data.testator.declarationAgeConfirmed}
                  onChange={e => onUpdateData(prev => ({
                    ...prev,
                    testator: { ...prev.testator, declarationAgeConfirmed: e.target.checked }
                  }))}
                  className="rounded text-stone-900"
                />
                <span>(a) I am 18 years of age or above.</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={data.testator.declarationSoundMindConfirmed}
                  onChange={e => onUpdateData(prev => ({
                    ...prev,
                    testator: { ...prev.testator, declarationSoundMindConfirmed: e.target.checked }
                  }))}
                  className="rounded text-stone-900"
                />
                <span>(b) I am of sound disposing mind and good memory.</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={data.testator.declarationVoluntaryConfirmed}
                  onChange={e => onUpdateData(prev => ({
                    ...prev,
                    testator: { ...prev.testator, declarationVoluntaryConfirmed: e.target.checked }
                  }))}
                  className="rounded text-stone-900"
                />
                <span>(c) I make this will voluntarily, without fraud, coercion or undue influence.</span>
              </label>
            </div>

            {/* Section 1 Summary & Confirmation */}
            <div className="border-t border-stone-200 pt-4 bg-stone-50 p-4 rounded">
              <p className="text-xs uppercase tracking-wider font-mono text-stone-500 mb-2">Section 1 Summary</p>
              <p className="text-sm text-stone-800 leading-relaxed">
                Testator: <strong>{data.testator.fullName || 'Not specified'}</strong>, {data.testator.relationType} {data.testator.fatherOrHusbandName || 'Not specified'}, aged {data.testator.age ?? 'uncalculated'} years, residing at {data.testator.address || 'Not specified'}, ID {data.testator.idType} ending {data.testator.idLast4 || '____'}.
              </p>
              <div className="mt-3 flex gap-3">
                <button
                  disabled={!data.testator.fullName || !data.testator.declarationVoluntaryConfirmed}
                  onClick={() => handleConfirmSection(1)}
                  className="px-4 py-2 bg-stone-900 text-amber-100 hover:bg-stone-800 disabled:opacity-50 text-xs font-semibold rounded transition-colors flex items-center gap-1.5"
                >
                  <CheckCircle className="w-3.5 h-3.5" />
                  <span>Confirm Testator Particulars and Proceed</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* SECTION 2: FAMILY */}
        {activeSection === 2 && (
          <div className="space-y-5">
            <div className="bg-stone-50 p-4 rounded text-sm text-stone-700 leading-relaxed border border-stone-100">
              <p className="font-medium text-stone-900 mb-1">
                Family particulars substantiate that you have full testamentary awareness of your family relations.
              </p>
              <p>
                Please record your marital status, spouse name, children, living parents and any dependants. We also ask whether you have executed any prior will.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs sm:text-sm">
              <div>
                <label className="block font-medium text-stone-700 mb-1">Marital Status</label>
                <select
                  value={data.family.maritalStatus}
                  onChange={e => onUpdateData(prev => ({
                    ...prev,
                    family: { ...prev.family, maritalStatus: e.target.value as any }
                  }))}
                  className="w-full px-3 py-2 border border-stone-300 rounded focus:border-stone-900 focus:outline-hidden"
                >
                  <option value="Married">Married</option>
                  <option value="Unmarried">Unmarried</option>
                  <option value="Widowed">Widowed</option>
                  <option value="Divorced">Divorced</option>
                </select>
              </div>

              <div>
                <label className="block font-medium text-stone-700 mb-1">Spouse Name (if married/widowed)</label>
                <input
                  type="text"
                  placeholder="e.g. Sunita Rajesh Sharma"
                  value={data.family.spouseName}
                  onChange={e => onUpdateData(prev => ({
                    ...prev,
                    family: { ...prev.family, spouseName: e.target.value }
                  }))}
                  className="w-full px-3 py-2 border border-stone-300 rounded focus:border-stone-900 focus:outline-hidden"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block font-medium text-stone-700 mb-1">Living Parents (Names)</label>
                <input
                  type="text"
                  placeholder="e.g. Smt. Sharda Sharma (Mother), Shri Narayan Sharma (Father)"
                  value={data.family.livingParents}
                  onChange={e => onUpdateData(prev => ({
                    ...prev,
                    family: { ...prev.family, livingParents: e.target.value }
                  }))}
                  className="w-full px-3 py-2 border border-stone-300 rounded focus:border-stone-900 focus:outline-hidden"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block font-medium text-stone-700 mb-1">Other Dependants</label>
                <input
                  type="text"
                  placeholder="e.g. None or elderly dependant relative"
                  value={data.family.dependants}
                  onChange={e => onUpdateData(prev => ({
                    ...prev,
                    family: { ...prev.family, dependants: e.target.value }
                  }))}
                  className="w-full px-3 py-2 border border-stone-300 rounded focus:border-stone-900 focus:outline-hidden"
                />
              </div>

              <div className="sm:col-span-2 bg-stone-50 p-3 rounded border border-stone-200">
                <p className="font-semibold text-stone-900 mb-2">Have you made a will before?</p>
                <p className="text-xs text-stone-600 mb-2">
                  Clause C2 automatically revokes all prior wills and codicils to ensure this document stands as your final testament.
                </p>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer text-xs">
                    <input
                      type="radio"
                      name="priorWill"
                      checked={data.family.hasPriorWill === false}
                      onChange={() => onUpdateData(prev => ({ ...prev, family: { ...prev.family, hasPriorWill: false } }))}
                    />
                    <span>No, this is my first will.</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer text-xs">
                    <input
                      type="radio"
                      name="priorWill"
                      checked={data.family.hasPriorWill === true}
                      onChange={() => onUpdateData(prev => ({ ...prev, family: { ...prev.family, hasPriorWill: true } }))}
                    />
                    <span>Yes, I have made an earlier will (it will be formally revoked).</span>
                  </label>
                </div>
              </div>
            </div>

            {/* Section 2 Summary & Confirmation */}
            <div className="border-t border-stone-200 pt-4 bg-stone-50 p-4 rounded">
              <p className="text-xs uppercase tracking-wider font-mono text-stone-500 mb-2">Section 2 Summary</p>
              <p className="text-sm text-stone-800 leading-relaxed">
                Status: <strong>{data.family.maritalStatus}</strong>. Spouse: {data.family.spouseName || 'None'}. Parents: {data.family.livingParents || 'Not listed'}. Prior will: {data.family.hasPriorWill ? 'Yes (to be revoked)' : 'No prior will'}.
              </p>
              <div className="mt-3">
                <button
                  onClick={() => handleConfirmSection(2)}
                  className="px-4 py-2 bg-stone-900 text-amber-100 hover:bg-stone-800 text-xs font-semibold rounded transition-colors flex items-center gap-1.5"
                >
                  <CheckCircle className="w-3.5 h-3.5" />
                  <span>Confirm Family Particulars and Proceed</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* SECTION 3: EXECUTOR */}
        {activeSection === 3 && (
          <div className="space-y-5">
            <div className="bg-stone-50 p-4 rounded text-sm text-stone-700 leading-relaxed border border-stone-100">
              <p className="font-medium text-stone-900 mb-1">
                An executor is the trusted person appointed to administer your estate and carry out your instructions after your death.
              </p>
              <p>
                Both a primary executor and 1 alternate executor must be named. Both must be 18 or above. An alternate steps in if the primary executor dies or is unable to act.
              </p>
            </div>

            {/* Primary Executor */}
            <div className="border border-stone-200 rounded p-4 space-y-3">
              <h4 className="font-semibold text-stone-900 text-sm">Primary Executor</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs sm:text-sm">
                <div>
                  <label className="block text-stone-700 mb-1">Full Legal Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Vikas Madhav Kulkarni"
                    value={data.executor.primary.name}
                    onChange={e => onUpdateData(prev => ({
                      ...prev,
                      executor: {
                        ...prev.executor,
                        primary: { ...prev.executor.primary, name: e.target.value }
                      }
                    }))}
                    className="w-full px-3 py-2 border border-stone-300 rounded focus:border-stone-900 focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-stone-700 mb-1">Relationship</label>
                  <input
                    type="text"
                    placeholder="e.g. Trusted Friend / Brother"
                    value={data.executor.primary.relationship}
                    onChange={e => onUpdateData(prev => ({
                      ...prev,
                      executor: {
                        ...prev.executor,
                        primary: { ...prev.executor.primary, relationship: e.target.value }
                      }
                    }))}
                    className="w-full px-3 py-2 border border-stone-300 rounded focus:border-stone-900 focus:outline-hidden"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-stone-700 mb-1">Residential Address</label>
                  <input
                    type="text"
                    placeholder="e.g. 12, Shanti Sadan, Model Colony, Pune"
                    value={data.executor.primary.address}
                    onChange={e => onUpdateData(prev => ({
                      ...prev,
                      executor: {
                        ...prev.executor,
                        primary: { ...prev.executor.primary, address: e.target.value }
                      }
                    }))}
                    className="w-full px-3 py-2 border border-stone-300 rounded focus:border-stone-900 focus:outline-hidden"
                  />
                </div>
              </div>
            </div>

            {/* Alternate Executor */}
            <div className="border border-stone-200 rounded p-4 space-y-3">
              <h4 className="font-semibold text-stone-900 text-sm">Alternate Executor (Required)</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs sm:text-sm">
                <div>
                  <label className="block text-stone-700 mb-1">Full Legal Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Mahesh Gopal Joshi"
                    value={data.executor.alternate.name}
                    onChange={e => onUpdateData(prev => ({
                      ...prev,
                      executor: {
                        ...prev.executor,
                        alternate: { ...prev.executor.alternate, name: e.target.value }
                      }
                    }))}
                    className="w-full px-3 py-2 border border-stone-300 rounded focus:border-stone-900 focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-stone-700 mb-1">Relationship</label>
                  <input
                    type="text"
                    placeholder="e.g. Cousin / Colleague"
                    value={data.executor.alternate.relationship}
                    onChange={e => onUpdateData(prev => ({
                      ...prev,
                      executor: {
                        ...prev.executor,
                        alternate: { ...prev.executor.alternate, relationship: e.target.value }
                      }
                    }))}
                    className="w-full px-3 py-2 border border-stone-300 rounded focus:border-stone-900 focus:outline-hidden"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-stone-700 mb-1">Residential Address</label>
                  <input
                    type="text"
                    placeholder="e.g. B-7, Sahawas Society, Pune"
                    value={data.executor.alternate.address}
                    onChange={e => onUpdateData(prev => ({
                      ...prev,
                      executor: {
                        ...prev.executor,
                        alternate: { ...prev.executor.alternate, address: e.target.value }
                      }
                    }))}
                    className="w-full px-3 py-2 border border-stone-300 rounded focus:border-stone-900 focus:outline-hidden"
                  />
                </div>
              </div>
            </div>

            {/* Section 3 Summary & Confirmation */}
            <div className="border-t border-stone-200 pt-4 bg-stone-50 p-4 rounded">
              <p className="text-xs uppercase tracking-wider font-mono text-stone-500 mb-2">Section 3 Summary</p>
              <p className="text-sm text-stone-800 leading-relaxed">
                Primary Executor: <strong>{data.executor.primary.name || 'Not named'}</strong> ({data.executor.primary.relationship || 'no relation'}). Alternate Executor: <strong>{data.executor.alternate.name || 'Not named'}</strong> ({data.executor.alternate.relationship || 'no relation'}).
              </p>
              <div className="mt-3">
                <button
                  disabled={!data.executor.primary.name || !data.executor.alternate.name}
                  onClick={() => handleConfirmSection(3)}
                  className="px-4 py-2 bg-stone-900 text-amber-100 hover:bg-stone-800 disabled:opacity-50 text-xs font-semibold rounded transition-colors flex items-center gap-1.5"
                >
                  <CheckCircle className="w-3.5 h-3.5" />
                  <span>Confirm Executors and Proceed</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* SECTION 4: ASSETS */}
        {activeSection === 4 && (
          <div className="space-y-5">
            <div className="bg-stone-50 p-4 rounded text-sm text-stone-700 leading-relaxed border border-stone-100">
              <p className="font-medium text-stone-900 mb-1">
                Asset Inventory & Indian Succession Rules
              </p>
              <p>
                List your assets one by one. For joint assets, your will covers only your own lawful share. If an asset is tagged ancestral or HUF, a lawyer must confirm that share before signing.
              </p>
            </div>

            {/* Asset count and quick view */}
            <div className="space-y-3">
              {data.assets.length === 0 ? (
                <div className="text-center py-6 bg-stone-50 border border-dashed border-stone-300 rounded text-stone-600 text-xs">
                  No assets entered yet. You can add specific assets or jump to the full Section Editor.
                </div>
              ) : (
                data.assets.map((asset, idx) => (
                  <div key={asset.id} className="p-3 bg-stone-50 border border-stone-200 rounded text-xs space-y-1">
                    <div className="flex justify-between items-center font-medium text-stone-900">
                      <span>{idx + 1}. {asset.description || asset.category}</span>
                      <span className="text-stone-500 uppercase">{asset.category} · {asset.ownership}</span>
                    </div>
                    <div className="text-stone-600">
                      Bequeathed to: <strong>{asset.beneficiary || 'Residuary'}</strong> · Nominee on record: {asset.nominee || 'None'}
                    </div>
                  </div>
                ))
              )}

              <button
                onClick={() => onJumpToSection(4)}
                className="w-full py-2 border border-stone-300 hover:bg-stone-50 text-stone-800 text-xs font-medium rounded transition-colors"
              >
                + Add / Manage Assets in Section Editor
              </button>
            </div>

            {/* Section 4 Summary & Confirmation */}
            <div className="border-t border-stone-200 pt-4 bg-stone-50 p-4 rounded">
              <p className="text-xs uppercase tracking-wider font-mono text-stone-500 mb-2">Section 4 Summary</p>
              <p className="text-sm text-stone-800 leading-relaxed">
                Total specific assets recorded: <strong>{data.assets.length}</strong>. Any unlisted assets will fall into your Residuary Estate under Clause C23.
              </p>
              <div className="mt-3">
                <button
                  onClick={() => handleConfirmSection(4)}
                  className="px-4 py-2 bg-stone-900 text-amber-100 hover:bg-stone-800 text-xs font-semibold rounded transition-colors flex items-center gap-1.5"
                >
                  <CheckCircle className="w-3.5 h-3.5" />
                  <span>Confirm Asset Summary and Proceed</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* SECTION 5: BENEFICIARIES */}
        {activeSection === 5 && (
          <div className="space-y-5">
            <div className="bg-stone-50 p-4 rounded text-sm text-stone-700 leading-relaxed border border-stone-100">
              <p className="font-medium text-stone-900 mb-1">
                A beneficiary is the person or registered charity who receives a gift under your will.
              </p>
              <p>
                Rule: If residue shares are specified by percentage, they must add up to exactly 100%. We also collect an alternate beneficiary in case someone predeceases you.
              </p>
            </div>

            <div className="space-y-3">
              {data.beneficiaries.length === 0 ? (
                <div className="text-center py-6 bg-stone-50 border border-dashed border-stone-300 rounded text-stone-600 text-xs">
                  No beneficiaries added yet. Use the Section Editor to record beneficiaries.
                </div>
              ) : (
                data.beneficiaries.map((b, idx) => (
                  <div key={b.id} className="p-3 bg-stone-50 border border-stone-200 rounded text-xs space-y-1">
                    <div className="flex justify-between items-center font-medium text-stone-900">
                      <span>{idx + 1}. {b.name} ({b.relationship})</span>
                      {b.sharePercentage ? (
                        <span className="font-mono text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                          {b.sharePercentage}% share
                        </span>
                      ) : (
                        <span className="text-stone-500">Specific bequest</span>
                      )}
                    </div>
                    <div className="text-stone-600">
                      Alternate: {b.alternate || 'Children equally / Residue'}
                    </div>
                  </div>
                ))
              )}

              <button
                onClick={() => onJumpToSection(5)}
                className="w-full py-2 border border-stone-300 hover:bg-stone-50 text-stone-800 text-xs font-medium rounded transition-colors"
              >
                + Add / Manage Beneficiaries in Section Editor
              </button>
            </div>

            {/* Section 5 Summary & Confirmation */}
            <div className="border-t border-stone-200 pt-4 bg-stone-50 p-4 rounded">
              <p className="text-xs uppercase tracking-wider font-mono text-stone-500 mb-2">Section 5 Summary</p>
              <p className="text-sm text-stone-800 leading-relaxed">
                Total beneficiaries: <strong>{data.beneficiaries.length}</strong>. Residue percentage total: <strong>{validation.residuaryShareTotal}%</strong>.
              </p>
              <div className="mt-3">
                <button
                  onClick={() => handleConfirmSection(5)}
                  className="px-4 py-2 bg-stone-900 text-amber-100 hover:bg-stone-800 text-xs font-semibold rounded transition-colors flex items-center gap-1.5"
                >
                  <CheckCircle className="w-3.5 h-3.5" />
                  <span>Confirm Beneficiary Particulars and Proceed</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* SECTION 6: MINORS AND GUARDIANS */}
        {activeSection === 6 && (
          <div className="space-y-5">
            <div className="bg-stone-50 p-4 rounded text-sm text-stone-700 leading-relaxed border border-stone-100">
              <p className="font-medium text-stone-900 mb-1">
                Guardianship and Minority Protections
              </p>
              <p>
                Under Section 9 of the Hindu Minority and Guardianship Act, 1956, you may appoint a testamentary guardian. A guardian of the person cares for the child's physical welfare; a guardian of the property manages financial assets.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs sm:text-sm">
              <div>
                <label className="block font-medium text-stone-700 mb-1">Guardian of the Person (Physical Care)</label>
                <input
                  type="text"
                  placeholder="e.g. Sunita Rajesh Sharma"
                  value={data.guardian.guardianPersonName}
                  onChange={e => onUpdateData(prev => ({
                    ...prev,
                    guardian: { ...prev.guardian, guardianPersonName: e.target.value }
                  }))}
                  className="w-full px-3 py-2 border border-stone-300 rounded focus:border-stone-900 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block font-medium text-stone-700 mb-1">Guardian of the Property (Asset Management)</label>
                <input
                  type="text"
                  placeholder="e.g. Vikas Madhav Kulkarni"
                  value={data.guardian.guardianPropertyName}
                  onChange={e => onUpdateData(prev => ({
                    ...prev,
                    guardian: { ...prev.guardian, guardianPropertyName: e.target.value }
                  }))}
                  className="w-full px-3 py-2 border border-stone-300 rounded focus:border-stone-900 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block font-medium text-stone-700 mb-1">Age Minor Takes Full Control (Default 21)</label>
                <input
                  type="number"
                  min={18}
                  max={25}
                  value={data.trust_age}
                  onChange={e => onUpdateData(prev => ({
                    ...prev,
                    trust_age: parseInt(e.target.value, 10) || 21
                  }))}
                  className="w-full px-3 py-2 border border-stone-300 rounded focus:border-stone-900 focus:outline-hidden font-mono"
                />
                <p className="text-xs text-stone-500 mt-1">Executor holds gift on trust until minor reaches this age.</p>
              </div>

              <div>
                <label className="block font-medium text-stone-700 mb-1">Alternate Guardian</label>
                <input
                  type="text"
                  placeholder="e.g. Mahesh Gopal Joshi"
                  value={data.guardian.altGuardianName}
                  onChange={e => onUpdateData(prev => ({
                    ...prev,
                    guardian: { ...prev.guardian, altGuardianName: e.target.value }
                  }))}
                  className="w-full px-3 py-2 border border-stone-300 rounded focus:border-stone-900 focus:outline-hidden"
                />
              </div>
            </div>

            {/* Section 6 Summary & Confirmation */}
            <div className="border-t border-stone-200 pt-4 bg-stone-50 p-4 rounded">
              <p className="text-xs uppercase tracking-wider font-mono text-stone-500 mb-2">Section 6 Summary</p>
              <p className="text-sm text-stone-800 leading-relaxed">
                Guardian of Person: <strong>{data.guardian.guardianPersonName || 'None assigned'}</strong>. Guardian of Property: <strong>{data.guardian.guardianPropertyName || 'None assigned'}</strong>. Trust vesting age: <strong>{data.trust_age} years</strong>.
              </p>
              <div className="mt-3">
                <button
                  onClick={() => handleConfirmSection(6)}
                  className="px-4 py-2 bg-stone-900 text-amber-100 hover:bg-stone-800 text-xs font-semibold rounded transition-colors flex items-center gap-1.5"
                >
                  <CheckCircle className="w-3.5 h-3.5" />
                  <span>Confirm Guardianship and Proceed</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* SECTION 7: RESIDUARY */}
        {activeSection === 7 && (
          <div className="space-y-5">
            <div className="bg-stone-50 p-4 rounded text-sm text-stone-700 leading-relaxed border border-stone-100">
              <p className="font-medium text-stone-900 mb-1">
                The residuary estate covers everything you own that is not specifically gifted, including assets you acquire in the future.
              </p>
              <p>
                Clause C23 guarantees that no asset falls into legal intestacy. Please name who receives the residue, and an alternate.
              </p>
            </div>

            <div className="space-y-4 text-xs sm:text-sm">
              <div>
                <label className="block font-medium text-stone-700 mb-1">Primary Residuary Beneficiary</label>
                <input
                  type="text"
                  placeholder="e.g. my spouse Sunita Rajesh Sharma, or my surviving children equally"
                  value={data.residuary.primary}
                  onChange={e => onUpdateData(prev => ({
                    ...prev,
                    residuary: { ...prev.residuary, primary: e.target.value }
                  }))}
                  className="w-full px-3 py-2 border border-stone-300 rounded focus:border-stone-900 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block font-medium text-stone-700 mb-1">Alternate Residuary Beneficiary</label>
                <input
                  type="text"
                  placeholder="e.g. my surviving children in equal shares"
                  value={data.residuary.alternate}
                  onChange={e => onUpdateData(prev => ({
                    ...prev,
                    residuary: { ...prev.residuary, alternate: e.target.value }
                  }))}
                  className="w-full px-3 py-2 border border-stone-300 rounded focus:border-stone-900 focus:outline-hidden"
                />
              </div>
            </div>

            {/* Section 7 Summary & Confirmation */}
            <div className="border-t border-stone-200 pt-4 bg-stone-50 p-4 rounded">
              <p className="text-xs uppercase tracking-wider font-mono text-stone-500 mb-2">Section 7 Summary</p>
              <p className="text-sm text-stone-800 leading-relaxed">
                Residuary Primary: <strong>{data.residuary.primary || 'Default equal shares'}</strong>. Alternate: <strong>{data.residuary.alternate || 'Surviving children'}</strong>.
              </p>
              <div className="mt-3">
                <button
                  onClick={() => handleConfirmSection(7)}
                  className="px-4 py-2 bg-stone-900 text-amber-100 hover:bg-stone-800 text-xs font-semibold rounded transition-colors flex items-center gap-1.5"
                >
                  <CheckCircle className="w-3.5 h-3.5" />
                  <span>Confirm Residuary Clause and Proceed</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* SECTION 8: SPECIAL WISHES */}
        {activeSection === 8 && (
          <div className="space-y-5">
            <div className="bg-stone-50 p-4 rounded text-sm text-stone-700 leading-relaxed border border-stone-100">
              <p className="font-medium text-stone-900 mb-1">
                Special wishes cover funeral rites, care of pets, or digital accounts.
              </p>
              <p>
                These will be included word for word under Clause C24 as you enter them. We do not edit or add legal interpretations.
              </p>
            </div>

            <div>
              <label className="block font-medium text-stone-700 mb-1 text-xs sm:text-sm">
                Your Special Wishes (Optional)
              </label>
              <textarea
                rows={4}
                placeholder="e.g. I wish that my funeral rites be conducted in accordance with traditional Hindu rites in a modest, private manner. My digital photos and journals may be archived by my son."
                value={data.special_wishes}
                onChange={e => onUpdateData(prev => ({
                  ...prev,
                  special_wishes: e.target.value
                }))}
                className="w-full px-3 py-2 border border-stone-300 rounded focus:border-stone-900 focus:outline-hidden text-xs sm:text-sm"
              />
            </div>

            {/* Section 8 Summary & Confirmation */}
            <div className="border-t border-stone-200 pt-4 bg-stone-50 p-4 rounded">
              <p className="text-xs uppercase tracking-wider font-mono text-stone-500 mb-2">Section 8 Summary</p>
              <p className="text-sm text-stone-800 leading-relaxed">
                {data.special_wishes ? `Recorded: "${data.special_wishes}"` : 'No special wishes recorded (Clause C24 omitted).'}
              </p>
              <div className="mt-3">
                <button
                  onClick={() => handleConfirmSection(8)}
                  className="px-4 py-2 bg-stone-900 text-amber-100 hover:bg-stone-800 text-xs font-semibold rounded transition-colors flex items-center gap-1.5"
                >
                  <CheckCircle className="w-3.5 h-3.5" />
                  <span>Confirm Special Wishes and Proceed</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* SECTION 9: WITNESSES */}
        {activeSection === 9 && (
          <div className="space-y-5">
            <div className="bg-stone-50 p-4 rounded text-sm text-stone-700 leading-relaxed border border-stone-100">
              <p className="font-medium text-stone-900 mb-1">
                Attestation is the act of two independent witnesses confirming they saw you sign voluntarily while in sound mind.
              </p>
              <p>
                <strong>Critical Rule:</strong> A witness must not be a beneficiary, the spouse of a beneficiary, or an executor. A witness who benefits under the will can lose their gift under Indian law.
              </p>
            </div>

            {/* Witness 1 */}
            <div className="border border-stone-200 rounded p-4 space-y-3">
              <h4 className="font-semibold text-stone-900 text-sm">Witness 1 (Independent Adult)</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs sm:text-sm">
                <div>
                  <label className="block text-stone-700 mb-1">Full Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Dr. Anand Shripad Deshpande"
                    value={data.witnesses[0].name}
                    onChange={e => onUpdateData(prev => {
                      const updatedWitnesses: [WitnessInfo, WitnessInfo] = [
                        { ...prev.witnesses[0], name: e.target.value },
                        prev.witnesses[1],
                      ];
                      return { ...prev, witnesses: updatedWitnesses };
                    })}
                    className="w-full px-3 py-2 border border-stone-300 rounded focus:border-stone-900 focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-stone-700 mb-1">Father's or Husband's Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Shripad Govind Deshpande"
                    value={data.witnesses[0].fatherOrHusband}
                    onChange={e => onUpdateData(prev => {
                      const updatedWitnesses: [WitnessInfo, WitnessInfo] = [
                        { ...prev.witnesses[0], fatherOrHusband: e.target.value },
                        prev.witnesses[1],
                      ];
                      return { ...prev, witnesses: updatedWitnesses };
                    })}
                    className="w-full px-3 py-2 border border-stone-300 rounded focus:border-stone-900 focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-stone-700 mb-1">Occupation</label>
                  <input
                    type="text"
                    placeholder="e.g. Consulting Physician"
                    value={data.witnesses[0].occupation}
                    onChange={e => onUpdateData(prev => {
                      const updatedWitnesses: [WitnessInfo, WitnessInfo] = [
                        { ...prev.witnesses[0], occupation: e.target.value },
                        prev.witnesses[1],
                      ];
                      return { ...prev, witnesses: updatedWitnesses };
                    })}
                    className="w-full px-3 py-2 border border-stone-300 rounded focus:border-stone-900 focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-stone-700 mb-1">Address</label>
                  <input
                    type="text"
                    placeholder="e.g. Plot 18, Mayur Colony, Kothrud, Pune"
                    value={data.witnesses[0].address}
                    onChange={e => onUpdateData(prev => {
                      const updatedWitnesses: [WitnessInfo, WitnessInfo] = [
                        { ...prev.witnesses[0], address: e.target.value },
                        prev.witnesses[1],
                      ];
                      return { ...prev, witnesses: updatedWitnesses };
                    })}
                    className="w-full px-3 py-2 border border-stone-300 rounded focus:border-stone-900 focus:outline-hidden"
                  />
                </div>
              </div>
            </div>

            {/* Witness 2 */}
            <div className="border border-stone-200 rounded p-4 space-y-3">
              <h4 className="font-semibold text-stone-900 text-sm">Witness 2 (Independent Adult)</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs sm:text-sm">
                <div>
                  <label className="block text-stone-700 mb-1">Full Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Smt. Pooja Nitin Ranade"
                    value={data.witnesses[1].name}
                    onChange={e => onUpdateData(prev => {
                      const updatedWitnesses: [WitnessInfo, WitnessInfo] = [
                        prev.witnesses[0],
                        { ...prev.witnesses[1], name: e.target.value },
                      ];
                      return { ...prev, witnesses: updatedWitnesses };
                    })}
                    className="w-full px-3 py-2 border border-stone-300 rounded focus:border-stone-900 focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-stone-700 mb-1">Father's or Husband's Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Nitin Arvind Ranade"
                    value={data.witnesses[1].fatherOrHusband}
                    onChange={e => onUpdateData(prev => {
                      const updatedWitnesses: [WitnessInfo, WitnessInfo] = [
                        prev.witnesses[0],
                        { ...prev.witnesses[1], fatherOrHusband: e.target.value },
                      ];
                      return { ...prev, witnesses: updatedWitnesses };
                    })}
                    className="w-full px-3 py-2 border border-stone-300 rounded focus:border-stone-900 focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-stone-700 mb-1">Occupation</label>
                  <input
                    type="text"
                    placeholder="e.g. Educator"
                    value={data.witnesses[1].occupation}
                    onChange={e => onUpdateData(prev => {
                      const updatedWitnesses: [WitnessInfo, WitnessInfo] = [
                        prev.witnesses[0],
                        { ...prev.witnesses[1], occupation: e.target.value },
                      ];
                      return { ...prev, witnesses: updatedWitnesses };
                    })}
                    className="w-full px-3 py-2 border border-stone-300 rounded focus:border-stone-900 focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-stone-700 mb-1">Address</label>
                  <input
                    type="text"
                    placeholder="e.g. Flat 201, Swapnashilp, Pune"
                    value={data.witnesses[1].address}
                    onChange={e => onUpdateData(prev => {
                      const updatedWitnesses: [WitnessInfo, WitnessInfo] = [
                        prev.witnesses[0],
                        { ...prev.witnesses[1], address: e.target.value },
                      ];
                      return { ...prev, witnesses: updatedWitnesses };
                    })}
                    className="w-full px-3 py-2 border border-stone-300 rounded focus:border-stone-900 focus:outline-hidden"
                  />
                </div>
              </div>
            </div>

            {/* Section 9 Summary & Confirmation */}
            <div className="border-t border-stone-200 pt-4 bg-stone-50 p-4 rounded">
              <p className="text-xs uppercase tracking-wider font-mono text-stone-500 mb-2">Section 9 Summary</p>
              <p className="text-sm text-stone-800 leading-relaxed">
                Witness 1: <strong>{data.witnesses[0].name || 'Not named'}</strong>. Witness 2: <strong>{data.witnesses[1].name || 'Not named'}</strong>.
              </p>
              <div className="mt-3">
                <button
                  disabled={!data.witnesses[0].name || !data.witnesses[1].name}
                  onClick={() => handleConfirmSection(9)}
                  className="px-4 py-2 bg-stone-900 text-amber-100 hover:bg-stone-800 disabled:opacity-50 text-xs font-semibold rounded transition-colors flex items-center gap-1.5"
                >
                  <CheckCircle className="w-3.5 h-3.5" />
                  <span>Confirm Witnesses and Proceed</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* SECTION 10: DOCTOR CERTIFICATE */}
        {activeSection === 10 && (
          <div className="space-y-5">
            <div className="bg-stone-50 p-4 rounded text-sm text-stone-700 leading-relaxed border border-stone-100">
              <p className="font-medium text-stone-900 mb-1">
                A doctor's certificate proves testamentary capacity and sound disposing mind immediately before signing.
              </p>
              <p>
                {data.testator.age !== null && data.testator.age >= 60
                  ? 'Required: The testator is 60 or above. Indian courts give substantial weight to a registered medical practitioner’s certificate to prevent disputes over testamentary capacity.'
                  : 'Recommended: It is advised for all testators to ensure immunity against challenges.'}
              </p>
            </div>

            <div className="border border-stone-200 rounded p-4 space-y-3">
              <label className="flex items-center gap-2 cursor-pointer text-xs sm:text-sm font-semibold text-stone-900">
                <input
                  type="checkbox"
                  checked={data.doctor.isIncluded}
                  onChange={e => onUpdateData(prev => ({
                    ...prev,
                    doctor: { ...prev.doctor, isIncluded: e.target.checked }
                  }))}
                  className="rounded text-stone-900"
                />
                <span>Include Doctor's Medical Fitness Certificate (Clause C28)</span>
              </label>

              {data.doctor.isIncluded && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs sm:text-sm pt-2">
                  <div>
                    <label className="block text-stone-700 mb-1">Doctor's Full Name</label>
                    <input
                      type="text"
                      placeholder="e.g. Dr. Anand Shripad Deshpande, M.D."
                      value={data.doctor.name}
                      onChange={e => onUpdateData(prev => ({
                        ...prev,
                        doctor: { ...prev.doctor, name: e.target.value }
                      }))}
                      className="w-full px-3 py-2 border border-stone-300 rounded focus:border-stone-900 focus:outline-hidden"
                    />
                  </div>
                  <div>
                    <label className="block text-stone-700 mb-1">Medical Registration Number</label>
                    <input
                      type="text"
                      placeholder="e.g. MCI-1994-54321"
                      value={data.doctor.regNo}
                      onChange={e => onUpdateData(prev => ({
                        ...prev,
                        doctor: { ...prev.doctor, regNo: e.target.value }
                      }))}
                      className="w-full px-3 py-2 border border-stone-300 rounded focus:border-stone-900 focus:outline-hidden"
                    />
                  </div>
                  <div>
                    <label className="block text-stone-700 mb-1">Clinic / Hospital Address</label>
                    <input
                      type="text"
                      placeholder="e.g. Deshpande Clinic, Kothrud, Pune"
                      value={data.doctor.address}
                      onChange={e => onUpdateData(prev => ({
                        ...prev,
                        doctor: { ...prev.doctor, address: e.target.value }
                      }))}
                      className="w-full px-3 py-2 border border-stone-300 rounded focus:border-stone-900 focus:outline-hidden"
                    />
                  </div>
                  <div>
                    <label className="block text-stone-700 mb-1">Date of Medical Examination</label>
                    <input
                      type="date"
                      value={data.doctor.examDate}
                      onChange={e => onUpdateData(prev => ({
                        ...prev,
                        doctor: { ...prev.doctor, examDate: e.target.value }
                      }))}
                      className="w-full px-3 py-2 border border-stone-300 rounded focus:border-stone-900 focus:outline-hidden"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Final Completion Action */}
            <div className="border-t border-stone-200 pt-4 bg-stone-50 p-4 rounded space-y-3">
              <p className="text-xs uppercase tracking-wider font-mono text-stone-500 mb-1">All Sections Assembled</p>
              <p className="text-sm text-stone-800 leading-relaxed">
                All 10 sections of your Last Will and Testament are confirmed. The template engine has compiled the approved legal clauses under the Indian Succession Act, 1925.
              </p>
              <div className="flex flex-wrap gap-3 pt-1">
                <button
                  onClick={onViewDraft}
                  className="px-5 py-2.5 bg-stone-900 text-amber-100 hover:bg-stone-800 text-xs font-semibold rounded transition-colors flex items-center gap-2"
                >
                  <span>View & Print Legal Will Document</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
