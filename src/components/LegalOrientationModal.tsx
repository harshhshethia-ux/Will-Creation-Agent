import React, { useState } from 'react';
import {
  GraduationCap,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  BookOpen,
  Users,
  FileText,
  Stethoscope,
  X,
  Sparkles,
  ArrowRight,
} from 'lucide-react';

interface LegalOrientationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCertified: () => void;
  externalTrainingUrl?: string;
  isCompleted?: boolean;
}

export const LegalOrientationModal: React.FC<LegalOrientationModalProps> = ({
  isOpen,
  onClose,
  onCertified,
  externalTrainingUrl,
  isCompleted = false,
}) => {
  const [understoodWitnesses, setUnderstoodWitnesses] = useState(isCompleted);
  const [understoodAssets, setUnderstoodAssets] = useState(isCompleted);
  const [understoodDoctor, setUnderstoodDoctor] = useState(isCompleted);
  const [understoodExecution, setUnderstoodExecution] = useState(isCompleted);

  if (!isOpen) return null;

  const allChecked =
    understoodWitnesses && understoodAssets && understoodDoctor && understoodExecution;

  const handleCertify = () => {
    if (allChecked) {
      onCertified();
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-stone-900/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full border border-stone-200 overflow-hidden flex flex-col my-auto max-h-[92vh]">
        {/* Header Strip */}
        <div className="px-6 py-4 bg-gradient-to-r from-stone-900 via-stone-800 to-amber-950 text-white flex items-center justify-between shrink-0 border-b border-amber-900/30">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-amber-400/20 border border-amber-300/40 flex items-center justify-center text-amber-300">
              <GraduationCap className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-serif font-bold text-base text-amber-100 flex items-center gap-2">
                Pre-Drafting Checklist & Essential Guidelines
              </h3>
              <p className="text-xs text-stone-300">
                Key practical rules to ensure your Will draft is accurate and effective
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-stone-400 hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Why this is required banner */}
        <div className="bg-amber-50/90 border-b border-amber-200 px-6 py-3 text-xs text-amber-950 flex items-start gap-2.5">
          <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <p className="font-semibold text-stone-900">
              Why reviewing this checklist is recommended:
            </p>
            <p className="text-stone-600 leading-relaxed text-[11px]">
              A Will expresses your final personal wishes. Common avoidable mistakes—such as having a beneficiary sign as an independent witness or missing exact asset identification—can create confusion and waste your single licensed execution. Please review these 4 practical guidelines before beginning.
            </p>
          </div>
        </div>

        {/* Scrollable Training Cards */}
        <div className="p-6 overflow-y-auto space-y-4 text-xs">
          {/* External training video prompt if configured */}
          {externalTrainingUrl && (
            <div className="p-3 bg-stone-100 border border-stone-300 rounded-xl flex items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-stone-700" />
                <span className="font-medium text-stone-800">
                  Have you watched the Video Training Masterclass?
                </span>
              </div>
              <a
                href={externalTrainingUrl}
                target="_blank"
                rel="noreferrer"
                className="px-3 py-1.5 bg-stone-900 text-amber-100 font-semibold rounded-lg text-[11px] hover:bg-stone-800 flex items-center gap-1 shrink-0"
              >
                <span>Watch Training</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          )}

          {/* Module 1: Witness Disqualification */}
          <div className="p-4 rounded-xl border border-stone-200 bg-stone-50/70 space-y-2">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-md bg-stone-200 flex items-center justify-center text-stone-800 font-bold text-xs">
                1
              </div>
              <h4 className="font-bold text-stone-900 text-xs uppercase tracking-wide flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-amber-700" />
                The 2-Witness Disqualification Rule (Section 67)
              </h4>
            </div>
            <p className="text-stone-600 leading-relaxed text-[11px]">
              Under Section 67 of the Indian Succession Act, 1925, <strong>beneficiaries (heirs) or their spouses CANNOT sign as witnesses</strong>. If an heir signs as a witness, the gift or property bequeathed to them becomes <strong>strictly VOID</strong> in the eyes of Indian courts.
            </p>
            <div className="bg-white p-2.5 rounded-lg border border-stone-200 text-stone-700 font-medium text-[11px]">
              &bull; <strong>Requirement:</strong> You must arrange <strong>two independent adult witnesses</strong> (e.g. trusted neighbors, family doctor, CA, or lawyer) who do NOT inherit any property under your Will.
            </div>
            <label className="flex items-center gap-2 pt-1 text-stone-800 font-semibold cursor-pointer">
              <input
                type="checkbox"
                checked={understoodWitnesses}
                onChange={(e) => setUnderstoodWitnesses(e.target.checked)}
                className="rounded text-stone-900 w-4 h-4"
              />
              <span>I understand that beneficiaries and their spouses cannot sign as witnesses.</span>
            </label>
          </div>

          {/* Module 2: Exact Asset Schedules */}
          <div className="p-4 rounded-xl border border-stone-200 bg-stone-50/70 space-y-2">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-md bg-stone-200 flex items-center justify-center text-stone-800 font-bold text-xs">
                2
              </div>
              <h4 className="font-bold text-stone-900 text-xs uppercase tracking-wide flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-amber-700" />
                Complete Asset Registry Matrix (No Vague Language)
              </h4>
            </div>
            <p className="text-stone-600 leading-relaxed text-[11px]">
              A Will that says "all my bank money" or "my house" often gets tied up in probate objections. Indian sub-registrars and transfer authorities require exact identifiers to transfer titles smoothly.
            </p>
            <div className="bg-white p-2.5 rounded-lg border border-stone-200 text-stone-700 font-medium text-[11px]">
              &bull; <strong>Immovable Properties:</strong> Survey No., Khasra/Plot No., Municipal Ward, and registered Sale Deed date.<br />
              &bull; <strong>Financial Assets:</strong> Bank Name, Branch, Account/FD No., Demat DP-ID and BO-ID.
            </div>
            <label className="flex items-center gap-2 pt-1 text-stone-800 font-semibold cursor-pointer">
              <input
                type="checkbox"
                checked={understoodAssets}
                onChange={(e) => setUnderstoodAssets(e.target.checked)}
                className="rounded text-stone-900 w-4 h-4"
              />
              <span>I have gathered exact bank accounts, demat IDs, and property registry details.</span>
            </label>
          </div>

          {/* Module 3: Senior Citizen Medical Fitness */}
          <div className="p-4 rounded-xl border border-stone-200 bg-stone-50/70 space-y-2">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-md bg-stone-200 flex items-center justify-center text-stone-800 font-bold text-xs">
                3
              </div>
              <h4 className="font-bold text-stone-900 text-xs uppercase tracking-wide flex items-center gap-1.5">
                <Stethoscope className="w-3.5 h-3.5 text-amber-700" />
                Doctor's Capacity Certificate for Seniors (Section 59)
              </h4>
            </div>
            <p className="text-stone-600 leading-relaxed text-[11px]">
              If the testator is <strong>60 years or older</strong>, or has experienced hospitalization, Indian courts strongly require a registered medical practitioner (MBBS) to examine the testator on the day of signing and certify sound testamentary capacity.
            </p>
            <div className="bg-white p-2.5 rounded-lg border border-stone-200 text-stone-700 font-medium text-[11px]">
              &bull; Our assistant automatically assembles the statutory <strong>Doctor's Attestation Certificate</strong> into your Will draft when age &ge; 60 is selected.
            </div>
            <label className="flex items-center gap-2 pt-1 text-stone-800 font-semibold cursor-pointer">
              <input
                type="checkbox"
                checked={understoodDoctor}
                onChange={(e) => setUnderstoodDoctor(e.target.checked)}
                className="rounded text-stone-900 w-4 h-4"
              />
              <span>I acknowledge that a doctor's medical fitness certificate is required if age is 60+.</span>
            </label>
          </div>

          {/* Module 4: 1-Execution Credit & Amendment Rules */}
          <div className="p-4 rounded-xl border border-stone-200 bg-stone-50/70 space-y-2">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-md bg-stone-200 flex items-center justify-center text-stone-800 font-bold text-xs">
                4
              </div>
              <h4 className="font-bold text-stone-900 text-xs uppercase tracking-wide flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-amber-700" />
                1 Paid License = 1 Finalized Executed Will
              </h4>
            </div>
            <p className="text-stone-600 leading-relaxed text-[11px]">
              Once you generate and download or print your clean watermark-free legal Will, your single-use execution credit is consumed and logged. Under Indian law (Sec 62 & 70), any subsequent changes require an <strong>Amendment License (₹999)</strong> or formal Codicil.
            </p>
            <label className="flex items-center gap-2 pt-1 text-stone-800 font-semibold cursor-pointer">
              <input
                type="checkbox"
                checked={understoodExecution}
                onChange={(e) => setUnderstoodExecution(e.target.checked)}
                className="rounded text-stone-900 w-4 h-4"
              />
              <span>I understand that downloading the official clean PDF consumes 1 execution license.</span>
            </label>
          </div>
        </div>

        {/* Footer / Certification CTA */}
        <div className="px-6 py-3.5 bg-stone-100 border-t border-stone-200 flex items-center justify-between shrink-0">
          <div className="text-[11px] text-stone-500 hidden sm:block">
            {allChecked ? (
              <span className="text-emerald-700 font-semibold flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                All 4 statutory clauses reviewed and certified!
              </span>
            ) : (
              <span>Check all 4 boxes to certify your readiness</span>
            )}
          </div>

          <div className="flex gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={onClose}
              className="py-2 px-3 border border-stone-300 hover:bg-stone-50 rounded-lg text-xs font-medium text-stone-700 cursor-pointer"
            >
              Review Later
            </button>
            <button
              type="button"
              disabled={!allChecked}
              onClick={handleCertify}
              className="flex-1 sm:flex-none py-2 px-4 bg-stone-900 hover:bg-stone-800 disabled:opacity-40 text-amber-100 font-bold text-xs rounded-lg transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              <span>I Certify My Readiness & Unlock Assistant</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
