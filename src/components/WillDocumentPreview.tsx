import React, { useState } from 'react';
import {
  Printer,
  Download,
  Copy,
  Check,
  AlertTriangle,
  ShieldCheck,
  Loader2,
  Lock,
  Zap,
  FileEdit,
  CheckCircle2,
} from 'lucide-react';
import { WillData } from '../types/will';
import { assembleWillDocument } from '../utils/clauseLibrary';
import { validateWillData } from '../utils/validation';
import { downloadElementAsPdf } from '../utils/pdfGenerator';

interface WillDocumentPreviewProps {
  data: WillData;
  onOpenJsonModal: () => void;
  onRequestVerification?: () => void;
  isVerified?: boolean;
  isPaid?: boolean;
  isConsumed?: boolean;
  onRequestPayment?: (planId?: 'standard' | 'amendment') => void;
  onExecutionCompleted?: () => void;
}

export const WillDocumentPreview: React.FC<WillDocumentPreviewProps> = ({
  data,
  onOpenJsonModal,
  onRequestVerification,
  isVerified = true,
  isPaid = false,
  isConsumed = false,
  onRequestPayment,
  onExecutionCompleted,
}) => {
  const [copied, setCopied] = useState(false);
  const [isWatermarkOn, setIsWatermarkOn] = useState(!isPaid || isConsumed);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  const assembled = assembleWillDocument(data);
  const validation = validateWillData(data);

  const handlePrint = () => {
    if (!isPaid && onRequestPayment) {
      onRequestPayment('standard');
      return;
    }

    if (isConsumed && onRequestPayment) {
      onRequestPayment('amendment');
      return;
    }

    window.print();
    if (onExecutionCompleted && !isConsumed) {
      onExecutionCompleted();
    }
  };

  const handleDirectDownload = async () => {
    if (!isPaid && onRequestPayment) {
      onRequestPayment('standard');
      return;
    }

    if (isConsumed && onRequestPayment) {
      onRequestPayment('amendment');
      return;
    }

    if (!isVerified && onRequestVerification) {
      onRequestVerification();
      return;
    }

    setIsGeneratingPdf(true);
    try {
      await downloadElementAsPdf('legal-will-document', {
        testatorName: data.testator.fullName || 'Testator',
      });
      if (onExecutionCompleted && !isConsumed) {
        onExecutionCompleted();
      }
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handleCopyText = () => {
    let fullText = `${assembled.title}\n\n`;
    assembled.clauses.forEach((c) => {
      fullText += `${c.number}. ${c.title}\n${c.text}\n\n`;
    });
    fullText += `${assembled.signoff.statement}\n\n`;
    fullText += `[Photo Placeholder]  [Signature/Thumb Impression: ______________]\n\n`;
    fullText += `ATTESTATION BY WITNESSES:\n${assembled.witnesses.intro}\n\n`;
    fullText += `Witness 1: ${assembled.witnesses.w1.name}, ${assembled.witnesses.w1.relation}, ${assembled.witnesses.w1.occupation}, residing at ${assembled.witnesses.w1.address}.\n`;
    fullText += `Witness 2: ${assembled.witnesses.w2.name}, ${assembled.witnesses.w2.relation}, ${assembled.witnesses.w2.occupation}, residing at ${assembled.witnesses.w2.address}.\n\n`;
    if (assembled.doctor) {
      fullText += `DOCTOR'S CERTIFICATE:\n${assembled.doctor.text}\n`;
    }

    navigator.clipboard.writeText(fullText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-16">
      {/* Action Toolbar (Hidden in print) */}
      <div className="bg-white rounded-lg border border-stone-200 p-4 shadow-xs flex flex-wrap items-center justify-between gap-4 print:hidden">
        <div className="flex items-center gap-2">
          <span className="font-serif font-bold text-stone-900 text-lg">Legal Will Document</span>
          {validation.status === 'LAWYER_REVIEW_REQUIRED' ? (
            <span className="text-xs bg-amber-100 text-amber-900 px-2 py-0.5 rounded font-medium border border-amber-300">
              Lawyer Review Required
            </span>
          ) : (
            <span className="text-xs bg-emerald-100 text-emerald-900 px-2 py-0.5 rounded font-medium border border-emerald-300">
              Valid Clauses Assembled
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <label className="text-xs text-stone-600 flex items-center gap-1.5 cursor-pointer mr-2">
            <input
              type="checkbox"
              checked={isWatermarkOn}
              onChange={(e) => setIsWatermarkOn(e.target.checked)}
              className="rounded text-stone-900"
            />
            <span>Draft Watermark</span>
          </label>

          <button
            onClick={handleCopyText}
            className="px-3 py-1.5 text-xs border border-stone-300 hover:bg-stone-50 rounded text-stone-700 transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copied' : 'Copy Text'}</span>
          </button>

          <button
            onClick={onOpenJsonModal}
            className="px-3 py-1.5 text-xs border border-stone-300 hover:bg-stone-50 rounded text-stone-700 transition-colors hidden sm:block cursor-pointer"
          >
            Inspect JSON
          </button>

          <button
            onClick={handleDirectDownload}
            disabled={isGeneratingPdf}
            className="px-3.5 py-1.5 text-xs font-semibold bg-amber-200 text-stone-900 hover:bg-amber-100 disabled:opacity-50 rounded transition-colors flex items-center gap-1.5 shadow-2xs cursor-pointer"
          >
            {isGeneratingPdf ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Download className="w-3.5 h-3.5" />
            )}
            <span>{isGeneratingPdf ? 'Generating PDF...' : 'Download Official PDF'}</span>
          </button>

          <button
            onClick={handlePrint}
            className="px-3.5 py-1.5 text-xs font-semibold bg-stone-900 text-amber-100 hover:bg-stone-800 rounded transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print / Save as PDF</span>
          </button>
        </div>
      </div>

      {/* Validation Checklist Banner (Hidden in print) */}
      {!validation.isValidForPdf && (
        <div className="bg-red-50 border border-red-200 rounded p-4 text-xs text-red-900 space-y-1 print:hidden">
          <div className="font-semibold flex items-center gap-1.5">
            <AlertTriangle className="w-4 h-4 text-red-700" />
            <span>Unresolved Validation Rules (Please fix before final signing)</span>
          </div>
          <ul className="list-disc pl-5 space-y-0.5">
            {validation.errors.map((err, idx) => (
              <li key={idx}>{err.message}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Licensing & Gating Status Banners */}
      {isConsumed ? (
        /* Executed / Amendment Required Banner */
        <div className="bg-amber-50 border border-amber-300 rounded-lg p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-amber-950 shadow-2xs print:hidden">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-amber-200 border border-amber-300 flex items-center justify-center text-amber-900 shrink-0">
              <FileEdit className="w-4 h-4" />
            </div>
            <div>
              <span className="font-bold block text-stone-900">
                1 Will Execution Completed • Amendment License Required for Changes
              </span>
              <span className="text-stone-600">
                Under Indian Succession Act 1925 (Sections 62 & 70), your previous Will execution has been logged. To alter clauses, add newly acquired properties, or prepare an official Codicil, unlock an Amendment License (₹999).
              </span>
            </div>
          </div>
          {onRequestPayment && (
            <button
              onClick={() => onRequestPayment('amendment')}
              className="px-3.5 py-2 bg-stone-900 hover:bg-stone-800 text-amber-200 font-bold rounded-md shadow-xs flex items-center justify-center gap-1.5 shrink-0 cursor-pointer transition-colors"
            >
              <Zap className="w-3.5 h-3.5 text-amber-300" />
              <span>Unlock Amendment License (₹999)</span>
            </button>
          )}
        </div>
      ) : !isPaid ? (
        /* Unpaid Gating Banner */
        <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-300 rounded-lg p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-amber-950 shadow-2xs print:hidden">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-amber-200 border border-amber-300 flex items-center justify-center text-amber-900 shrink-0">
              <Lock className="w-4 h-4" />
            </div>
            <div>
              <span className="font-semibold block text-stone-900">
                Official Signing Will & Watermark-Free PDF Gated
              </span>
              <span className="text-stone-600">
                Complete one-time ₹1,999 Razorpay payment to remove watermarks, unlock official PDF download, and enable witness attestation.
              </span>
            </div>
          </div>
          {onRequestPayment && (
            <button
              onClick={() => onRequestPayment('standard')}
              className="px-3.5 py-2 bg-stone-900 hover:bg-stone-800 text-amber-200 font-semibold rounded-md shadow-xs flex items-center justify-center gap-1.5 shrink-0 cursor-pointer transition-colors"
            >
              <Zap className="w-3.5 h-3.5 text-amber-300" />
              <span>Unlock via Razorpay (₹1,999)</span>
            </button>
          )}
        </div>
      ) : (
        /* Active Paid Customer Banner */
        <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 flex items-center justify-between text-xs text-emerald-900 print:hidden">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>
              <strong>Verified Single-User License:</strong> 1 official watermark-free execution credit active for your Will.
            </span>
          </div>
          <span className="text-[11px] font-mono text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded font-semibold">
            Credit: 1 Available
          </span>
        </div>
      )}

      {/* Actual Legal Document Paper Sheet */}
      <div
        id="legal-will-document"
        className="relative bg-white border border-stone-300 shadow-sm rounded-sm p-8 sm:p-14 text-stone-900 font-serif leading-relaxed text-sm sm:text-base selection:bg-amber-100 print:border-none print:shadow-none print:p-0"
      >
        {/* Diagonal Draft Watermark */}
        {isWatermarkOn && (
          <div className="pointer-events-none select-none absolute inset-0 flex items-center justify-center overflow-hidden opacity-8">
            <span className="text-4xl sm:text-6xl font-sans font-bold tracking-widest text-stone-900 -rotate-30 border-8 border-stone-900 p-8 text-center uppercase">
              {!isPaid
                ? 'UNPAID DRAFT • NOT VALID FOR SIGNING'
                : isConsumed
                ? 'EXECUTED WILL • AMENDMENT REQUIRED FOR CHANGES'
                : 'DRAFT • NOT VALID UNTIL SIGNED AND WITNESSED'}
            </span>
          </div>
        )}

        {/* C0. Title */}
        <div className="text-center border-b-2 border-stone-900 pb-6 mb-8">
          <p className="text-xs uppercase tracking-widest font-sans font-bold text-stone-500 mb-2">
            Under the Indian Succession Act, 1925 & Hindu Succession Act, 1956
          </p>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-wider text-stone-900 uppercase">
            LAST WILL AND TESTAMENT
          </h1>
          <p className="text-sm font-sans text-stone-700 mt-2">
            OF <span className="font-bold underline uppercase">{assembled.testatorName.toUpperCase()}</span>
          </p>
        </div>

        {/* Clauses Stack */}
        <div className="space-y-6">
          {assembled.clauses.map((clause, idx) => (
            <div key={idx} className="space-y-1.5">
              <h2 className="font-bold text-stone-900 text-sm sm:text-base tracking-wide uppercase">
                {clause.number}. {clause.title}
              </h2>
              <p className="text-stone-800 text-justify text-xs sm:text-sm leading-relaxed whitespace-pre-line">
                {clause.text}
              </p>
            </div>
          ))}
        </div>

        {/* Sign-off & Testator Signature Block */}
        <div className="mt-12 pt-8 border-t border-stone-300 space-y-6">
          <p className="text-justify text-xs sm:text-sm italic text-stone-800">
            {assembled.signoff.statement}
          </p>

          <div className="grid grid-cols-2 gap-8 pt-6">
            <div className="space-y-2">
              <div className="w-28 h-32 border border-dashed border-stone-400 flex items-center justify-center text-[10px] text-stone-500 font-sans text-center p-2 bg-stone-50">
                Affix Passport Size Photograph of Testator
              </div>
            </div>

            <div className="flex flex-col justify-end text-right space-y-1">
              <div className="border-b border-stone-800 w-48 ml-auto pb-8"></div>
              <p className="font-bold text-xs uppercase">{assembled.testatorName.toUpperCase()}</p>
              <p className="text-[11px] text-stone-600 font-sans">(Signature / Left Thumb Impression of Testator)</p>
            </div>
          </div>
        </div>

        {/* Witness Attestation Block */}
        <div className="mt-10 pt-6 border-t-2 border-stone-900 space-y-6 break-inside-avoid">
          <div>
            <h3 className="font-bold text-sm uppercase tracking-wider text-stone-900 mb-2">
              ATTESTATION BY WITNESSES
            </h3>
            <p className="text-xs text-justify text-stone-700 leading-relaxed font-sans">
              {assembled.witnesses.intro}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-4 font-sans text-xs">
            {/* Witness 1 */}
            <div className="p-4 border border-stone-200 rounded-sm bg-stone-50/50 space-y-3">
              <div className="font-bold text-stone-900 border-b border-stone-200 pb-1 flex justify-between">
                <span>WITNESS 1</span>
                <span className="text-[10px] text-stone-500 font-normal">Independent</span>
              </div>
              <div className="space-y-1 text-stone-700 text-[11px]">
                <p><strong>Name:</strong> {assembled.witnesses.w1.name}</p>
                <p><strong>Relation / S/o, D/o:</strong> {assembled.witnesses.w1.relation}</p>
                <p><strong>Occupation:</strong> {assembled.witnesses.w1.occupation}</p>
                <p><strong>Address:</strong> {assembled.witnesses.w1.address}</p>
              </div>
              <div className="pt-6 border-b border-stone-400"></div>
              <p className="text-[10px] text-stone-500 text-center">(Signature of Witness 1)</p>
            </div>

            {/* Witness 2 */}
            <div className="p-4 border border-stone-200 rounded-sm bg-stone-50/50 space-y-3">
              <div className="font-bold text-stone-900 border-b border-stone-200 pb-1 flex justify-between">
                <span>WITNESS 2</span>
                <span className="text-[10px] text-stone-500 font-normal">Independent</span>
              </div>
              <div className="space-y-1 text-stone-700 text-[11px]">
                <p><strong>Name:</strong> {assembled.witnesses.w2.name}</p>
                <p><strong>Relation / S/o, D/o:</strong> {assembled.witnesses.w2.relation}</p>
                <p><strong>Occupation:</strong> {assembled.witnesses.w2.occupation}</p>
                <p><strong>Address:</strong> {assembled.witnesses.w2.address}</p>
              </div>
              <div className="pt-6 border-b border-stone-400"></div>
              <p className="text-[10px] text-stone-500 text-center">(Signature of Witness 2)</p>
            </div>
          </div>
        </div>

        {/* Doctor's Attestation Certificate (If Testator >= 60) */}
        {assembled.doctor && (
          <div className="mt-8 pt-6 border-t border-stone-300 space-y-4 break-inside-avoid">
            <h3 className="font-bold text-xs uppercase tracking-wider text-stone-900 font-sans">
              DOCTOR'S MEDICAL CERTIFICATE OF TESTAMENTARY CAPACITY
            </h3>
            <p className="text-xs text-justify text-stone-700 leading-relaxed font-sans italic bg-stone-50 p-3 border border-stone-200 rounded-sm">
              "{assembled.doctor.text}"
            </p>
            <div className="grid grid-cols-2 gap-4 pt-4 font-sans text-xs">
              <div className="space-y-1 text-stone-700 text-[11px]">
                <p><strong>Doctor Name:</strong> ___________________________</p>
                <p><strong>Regn No (MCI / State):</strong> _________________</p>
                <p><strong>Clinic / Hospital Address:</strong> _______________</p>
                <p><strong>Date & Time:</strong> ____________________________</p>
              </div>
              <div className="flex flex-col justify-end text-right space-y-1">
                <div className="border-b border-stone-800 w-44 ml-auto pb-6"></div>
                <p className="text-[10px] text-stone-500">(Doctor's Signature & Official Seal)</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
