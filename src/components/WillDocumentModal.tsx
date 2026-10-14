import React from 'react';
import { X, Printer, Download, Copy, AlertTriangle } from 'lucide-react';
import { WillData } from '../types/will';
import { WillDocumentPreview } from './WillDocumentPreview';

interface WillDocumentModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: WillData;
  onOpenJsonModal: () => void;
  onRequestVerification?: () => void;
  isVerified?: boolean;
}

export const WillDocumentModal: React.FC<WillDocumentModalProps> = ({
  isOpen,
  onClose,
  data,
  onOpenJsonModal,
  onRequestVerification,
  isVerified = true,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-stone-900/70 backdrop-blur-xs flex items-center justify-center p-2 sm:p-6 overflow-y-auto">
      <div className="bg-stone-100 rounded-lg shadow-2xl max-w-5xl w-full max-h-[96vh] flex flex-col border border-stone-300">
        {/* Modal Top Bar */}
        <div className="px-6 py-3.5 bg-stone-900 text-stone-100 rounded-t-lg flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <span className="font-serif font-bold text-lg text-amber-100">
              Last Will and Testament
            </span>
            <span className="text-xs text-stone-400 font-mono hidden sm:inline">
              {data.testator.fullName || 'Draft Document'}
            </span>
          </div>

          <button
            onClick={onClose}
            className="text-stone-400 hover:text-white transition-colors p-1 rounded"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Document Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-8">
          <WillDocumentPreview
            data={data}
            onOpenJsonModal={onOpenJsonModal}
            onRequestVerification={onRequestVerification}
            isVerified={isVerified}
          />
        </div>
      </div>
    </div>
  );
};
