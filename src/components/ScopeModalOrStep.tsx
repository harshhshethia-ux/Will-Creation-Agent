import React, { useState } from 'react';
import { ShieldCheck, AlertCircle, CheckCircle, Info, Lock } from 'lucide-react';
import { ScopeCheck, StatusType } from '../types/will';

interface ScopeCheckModalProps {
  scope: ScopeCheck;
  onUpdateScope: (updated: Partial<ScopeCheck>) => void;
  onComplete: () => void;
}

export const ScopeCheckModal: React.FC<ScopeCheckModalProps> = ({
  scope,
  onUpdateScope,
  onComplete,
}) => {
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4>(1);

  const handleQ1 = (value: boolean) => {
    onUpdateScope({ isEligibleReligion: value, stoppedDueToReligion: !value });
    if (value) {
      setCurrentStep(2);
    }
  };

  const handleQ2 = (value: boolean) => {
    onUpdateScope({ isEighteenOrAbove: value, stoppedDueToAge: !value });
    if (value) {
      setCurrentStep(3);
    }
  };

  const handleQ3 = (value: boolean) => {
    onUpdateScope({ hasGoaProperty: value });
    setCurrentStep(4);
  };

  const handleQ4 = (value: boolean) => {
    onUpdateScope({ hasTrustOrHufAsset: value });
    // All 4 questions answered
    onComplete();
  };

  return (
    <div className="bg-white rounded-lg border border-stone-200 shadow-sm max-w-2xl mx-auto p-6 sm:p-8">
      {/* Disclaimer banner */}
      <div className="mb-6 p-4 rounded bg-stone-50 border border-stone-200 text-stone-700 text-xs sm:text-sm leading-relaxed flex items-start gap-3">
        <Info className="w-4 h-4 text-stone-500 shrink-0 mt-0.5" />
        <div>
          <span className="font-semibold text-stone-900">Important Legal Notice: </span>
          This tool prepares a draft will from the information you provide. It is not legal advice. For complex family or property situations, please have a lawyer review the draft before you sign.
        </div>
      </div>

      <div className="border-b border-stone-200 pb-4 mb-6">
        <p className="text-xs uppercase tracking-widest font-mono text-stone-500 mb-1">
          Initial Eligibility Check • Step {currentStep} of 4
        </p>
        <h2 className="text-xl sm:text-2xl font-serif font-bold text-stone-900">
          Preliminary Scope Checks
        </h2>
        <p className="text-sm text-stone-600 mt-1">
          Welcome. I will help you prepare a draft will in about 20 minutes. I will ask a few questions about you, your family and your assets. First, 4 quick checks to confirm this tool fits your situation.
        </p>
      </div>

      {/* QUESTION 1 */}
      {currentStep === 1 && (
        <div className="space-y-4">
          <div className="bg-stone-50 p-4 rounded border border-stone-200">
            <h3 className="text-base font-semibold text-stone-900">
              1. Are you Hindu, Buddhist, Jain or Sikh by religion?
            </h3>
            <p className="text-xs text-stone-600 mt-1">
              Indian succession law applies the Hindu Succession Act, 1956 and the Indian Succession Act, 1925 specifically to these communities.
            </p>
          </div>

          {scope.stoppedDueToReligion ? (
            <div className="p-4 bg-amber-50 border border-amber-200 rounded text-amber-900 text-sm space-y-3">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium">Scope Notice</p>
                  <p className="mt-1">
                    This version covers Hindu, Buddhist, Jain and Sikh testators only. Other communities follow different succession rules. I can add you to our waitlist.
                  </p>
                </div>
              </div>
              <div className="pt-2 flex gap-3">
                <button
                  onClick={() => onUpdateScope({ isEligibleReligion: null, stoppedDueToReligion: false })}
                  className="px-3 py-1.5 text-xs bg-white border border-stone-300 text-stone-800 rounded hover:bg-stone-50"
                >
                  Change Response
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-4 pt-2">
              <button
                onClick={() => handleQ1(true)}
                className="flex-1 py-2.5 px-4 bg-stone-900 text-amber-100 hover:bg-stone-800 font-medium text-sm rounded transition-colors text-center"
              >
                Yes, I am Hindu, Buddhist, Jain or Sikh
              </button>
              <button
                onClick={() => handleQ1(false)}
                className="py-2.5 px-6 border border-stone-300 text-stone-700 hover:bg-stone-100 font-medium text-sm rounded transition-colors"
              >
                No
              </button>
            </div>
          )}
        </div>
      )}

      {/* QUESTION 2 */}
      {currentStep === 2 && (
        <div className="space-y-4">
          <div className="bg-stone-50 p-4 rounded border border-stone-200">
            <h3 className="text-base font-semibold text-stone-900">
              2. Are you 18 or above?
            </h3>
            <p className="text-xs text-stone-600 mt-1">
              Under Section 59 of the Indian Succession Act, 1925, a person must have attained the age of majority to execute a valid will.
            </p>
          </div>

          {scope.stoppedDueToAge ? (
            <div className="p-4 bg-red-50 border border-red-200 rounded text-red-900 text-sm space-y-3">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-5 h-5 text-red-700 shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium">Statutory Ineligibility</p>
                  <p className="mt-1">
                    A person under 18 cannot make a valid will under Indian law.
                  </p>
                </div>
              </div>
              <div className="pt-2">
                <button
                  onClick={() => onUpdateScope({ isEighteenOrAbove: null, stoppedDueToAge: false })}
                  className="px-3 py-1.5 text-xs bg-white border border-stone-300 text-stone-800 rounded hover:bg-stone-50"
                >
                  Change Response
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-4 pt-2">
              <button
                onClick={() => handleQ2(true)}
                className="flex-1 py-2.5 px-4 bg-stone-900 text-amber-100 hover:bg-stone-800 font-medium text-sm rounded transition-colors text-center"
              >
                Yes, I am 18 or above
              </button>
              <button
                onClick={() => handleQ2(false)}
                className="py-2.5 px-6 border border-stone-300 text-stone-700 hover:bg-stone-100 font-medium text-sm rounded transition-colors"
              >
                No
              </button>
            </div>
          )}
        </div>
      )}

      {/* QUESTION 3 */}
      {currentStep === 3 && (
        <div className="space-y-4">
          <div className="bg-stone-50 p-4 rounded border border-stone-200">
            <h3 className="text-base font-semibold text-stone-900">
              3. Does any property you want to include sit in Goa?
            </h3>
            <p className="text-xs text-stone-600 mt-1">
              Goa is governed by the Portuguese Civil Code (Communion of Assets and Legitime rules), which restricts testamentary freedom.
            </p>
          </div>

          <div className="flex items-center gap-4 pt-2">
            <button
              onClick={() => handleQ3(false)}
              className="flex-1 py-2.5 px-4 bg-stone-900 text-amber-100 hover:bg-stone-800 font-medium text-sm rounded transition-colors text-center"
            >
              No, no property in Goa
            </button>
            <button
              onClick={() => handleQ3(true)}
              className="py-2.5 px-6 border border-stone-300 text-stone-700 hover:bg-stone-100 font-medium text-sm rounded transition-colors"
            >
              Yes, property sits in Goa
            </button>
          </div>
        </div>
      )}

      {/* QUESTION 4 */}
      {currentStep === 4 && (
        <div className="space-y-4">
          <div className="bg-stone-50 p-4 rounded border border-stone-200">
            <h3 className="text-base font-semibold text-stone-900">
              4. Is any asset held through a trust, company, partnership firm, or HUF (Hindu Undivided Family)?
            </h3>
            <p className="text-xs text-stone-600 mt-1">
              Entity and coparcenary assets require structural partition and lawyer review before transfer under a personal will.
            </p>
          </div>

          <div className="flex items-center gap-4 pt-2">
            <button
              onClick={() => handleQ4(false)}
              className="flex-1 py-2.5 px-4 bg-stone-900 text-amber-100 hover:bg-stone-800 font-medium text-sm rounded transition-colors text-center"
            >
              No, all are personal individual assets
            </button>
            <button
              onClick={() => handleQ4(true)}
              className="py-2.5 px-6 border border-stone-300 text-stone-700 hover:bg-stone-100 font-medium text-sm rounded transition-colors"
            >
              Yes, some assets held via trust/firm/HUF
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
