import React, { useState } from 'react';
import { Copy, Check, Download, AlertTriangle, ShieldCheck, X } from 'lucide-react';
import { WillData } from '../types/will';
import { validateWillData } from '../utils/validation';

interface JsonExportModalProps {
  data: WillData;
  onClose: () => void;
}

export const JsonExportModal: React.FC<JsonExportModalProps> = ({ data, onClose }) => {
  const [copied, setCopied] = useState(false);
  const validation = validateWillData(data);

  // Build the exact STEP 1 JSON object
  const step1JsonObject = {
    status: validation.status,
    review_reasons: validation.reviewReasons,
    testator: {
      full_name: data.testator.fullName,
      relation_type: data.testator.relationType,
      father_or_husband_name: data.testator.fatherOrHusbandName,
      gender: data.testator.gender,
      dob: data.testator.dob,
      age: data.testator.age,
      religion: data.testator.religion,
      occupation: data.testator.occupation,
      address: data.testator.address,
      city: data.testator.city,
      state: data.testator.state,
      id_type: data.testator.idType,
      id_last4: data.testator.idLast4,
      mobile: data.testator.mobile,
      email: data.testator.email,
      declarations: {
        age_18_above: data.testator.declarationAgeConfirmed,
        sound_mind: data.testator.declarationSoundMindConfirmed,
        voluntary: data.testator.declarationVoluntaryConfirmed,
      },
    },
    family: {
      marital_status: data.family.maritalStatus,
      spouse_name: data.family.spouseName,
      children: data.family.children.map(c => ({
        name: c.name,
        dob: c.dob,
        relationship: c.relationship,
        is_minor: c.isMinor,
      })),
      living_parents: data.family.livingParents,
      dependants: data.family.dependants,
      has_prior_will: data.family.hasPriorWill,
    },
    executor: {
      primary: {
        name: data.executor.primary.name,
        relationship: data.executor.primary.relationship,
        address: data.executor.primary.address,
        contact: data.executor.primary.contact,
      },
      alternate: {
        name: data.executor.alternate.name,
        relationship: data.executor.alternate.relationship,
        address: data.executor.alternate.address,
        contact: data.executor.alternate.contact,
      },
    },
    assets: data.assets.map(a => ({
      category: a.category,
      description: a.description,
      ownership: a.ownership,
      origin: a.origin,
      nominee: a.nominee,
      beneficiary: a.beneficiary,
    })),
    beneficiaries: data.beneficiaries.map(b => ({
      name: b.name,
      relationship: b.relationship,
      dob: b.dob,
      address: b.address,
      type: b.type,
      share: b.sharePercentage ? `${b.sharePercentage}%` : '',
      alternate: b.alternate,
    })),
    guardian: {
      guardian_person: {
        name: data.guardian.guardianPersonName,
        relationship: data.guardian.guardianPersonRelationship,
        address: data.guardian.guardianPersonAddress,
      },
      guardian_property: {
        name: data.guardian.guardianPropertyName,
        relationship: data.guardian.guardianPropertyRelationship,
        address: data.guardian.guardianPropertyAddress,
      },
      alt_guardian: data.guardian.altGuardianName,
    },
    trust_age: data.trust_age,
    residuary: {
      primary: data.residuary.primary,
      alternate: data.residuary.alternate,
    },
    special_wishes: data.special_wishes,
    witnesses: [
      {
        name: data.witnesses[0].name,
        relation: `${data.witnesses[0].relationType} ${data.witnesses[0].fatherOrHusband}`,
        occupation: data.witnesses[0].occupation,
        address: data.witnesses[0].address,
      },
      {
        name: data.witnesses[1].name,
        relation: `${data.witnesses[1].relationType} ${data.witnesses[1].fatherOrHusband}`,
        occupation: data.witnesses[1].occupation,
        address: data.witnesses[1].address,
      },
    ],
    doctor: data.doctor.isIncluded
      ? {
          name: data.doctor.name,
          reg_no: data.doctor.regNo,
          address: data.doctor.address,
          exam_date: data.doctor.examDate,
        }
      : null,
  };

  const jsonString = JSON.stringify(step1JsonObject, null, 2);

  const handleCopyJson = () => {
    navigator.clipboard.writeText(jsonString);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `will_draft_${data.testator.fullName ? data.testator.fullName.toLowerCase().replace(/\s+/g, '_') : 'client'}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-lg border border-stone-200 shadow-xl max-w-3xl w-full my-8 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-stone-200 flex items-center justify-between">
          <div>
            <h3 className="font-serif font-bold text-stone-900 text-lg">
              Output Schema & Execution Protocol
            </h3>
            <p className="text-xs text-stone-500 font-mono">
              Status: {validation.status}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-stone-400 hover:text-stone-700 transition-colors p-1"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6 overflow-y-auto flex-1">
          {/* STEP 2: Exactly 4 lines or fewer */}
          <div className="bg-amber-50/70 border border-amber-200 rounded p-4 text-xs sm:text-sm text-stone-900 space-y-2">
            <p className="text-xs uppercase font-mono font-bold tracking-wider text-amber-900">
              Step 2 • Legal Next Steps Notice
            </p>
            <div className="text-stone-800 leading-relaxed font-sans space-y-1">
              <p>Your draft will is ready [Status: {validation.status}].</p>
              <p>Print the document on standard paper or non-judicial stamp paper if advised by your lawyer.</p>
              <p>Sign on every page in the simultaneous presence of two independent adult witnesses who will also attest.</p>
              <p>A doctor's certificate and registration at the local Sub-Registrar's office provide strong evidentiary protection.</p>
            </div>
          </div>

          {validation.status === 'LAWYER_REVIEW_REQUIRED' && (
            <div className="bg-amber-50 border border-amber-300 p-4 rounded text-xs text-amber-900 space-y-1">
              <p className="font-semibold flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-amber-700" />
                <span>Reasons marked for LAWYER_REVIEW_REQUIRED:</span>
              </p>
              <ul className="list-disc pl-5 space-y-0.5 text-stone-700">
                {validation.reviewReasons.map((r, i) => (
                  <li key={i}>{r}</li>
                ))}
              </ul>
              <p className="pt-1 text-stone-600">
                Say: "This part needs a lawyer. I will mark your draft for review. You can book a review with Wealth Creation Matrix Legal Partners."
              </p>
            </div>
          )}

          {/* STEP 1: JSON Output */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono uppercase text-stone-500">
                Step 1 • JSON Object Specification
              </span>
              <div className="flex gap-2">
                <button
                  onClick={handleCopyJson}
                  className="px-2.5 py-1 text-xs border border-stone-300 hover:bg-stone-50 rounded text-stone-700 flex items-center gap-1"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Copied' : 'Copy JSON'}</span>
                </button>
                <button
                  onClick={handleDownload}
                  className="px-2.5 py-1 text-xs bg-stone-900 text-amber-100 hover:bg-stone-800 rounded flex items-center gap-1"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download .json</span>
                </button>
              </div>
            </div>

            <pre className="bg-stone-950 text-stone-200 p-4 rounded text-xs font-mono overflow-x-auto max-h-80 border border-stone-800 leading-relaxed">
              {jsonString}
            </pre>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-stone-200 bg-stone-50 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-stone-900 text-amber-100 hover:bg-stone-800 text-xs font-medium rounded"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
