import React from 'react';
import { BookOpen, X, ShieldCheck } from 'lucide-react';
import { LEGAL_TERMS } from '../utils/legalGlossary';

interface LegalGlossaryModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const LegalGlossaryModal: React.FC<LegalGlossaryModalProps> = ({
  isOpen,
  onClose,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-lg border border-stone-200 shadow-xl max-w-2xl w-full max-h-[85vh] flex flex-col">
        <div className="px-6 py-4 border-b border-stone-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-stone-700" />
            <h3 className="font-serif font-bold text-stone-900 text-lg">
              Legal Terms Explained in Plain English (UK)
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-stone-400 hover:text-stone-700 transition-colors p-1"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4 overflow-y-auto text-xs sm:text-sm">
          <p className="text-stone-600 text-xs leading-relaxed">
            Every legal term used in this drafting assistant is defined below in one plain sentence, referencing the Indian Succession Act, 1925 and Hindu Succession Act, 1956.
          </p>

          <div className="divide-y divide-stone-100">
            {Object.values(LEGAL_TERMS).map(item => (
              <div key={item.term} className="py-3 space-y-1">
                <div className="flex items-baseline justify-between">
                  <h4 className="font-bold text-stone-900 text-sm">{item.term}</h4>
                  {item.actReference && (
                    <span className="text-[11px] font-mono text-stone-400">
                      {item.actReference}
                    </span>
                  )}
                </div>
                <p className="text-stone-700 leading-relaxed">
                  {item.definition}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="px-6 py-3 border-t border-stone-200 bg-stone-50 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-stone-900 text-amber-100 hover:bg-stone-800 text-xs font-medium rounded"
          >
            Close Glossary
          </button>
        </div>
      </div>
    </div>
  );
};
