import React, { useState } from 'react';
import { Printer, Download, Copy, Check, AlertTriangle, ShieldCheck, Loader2 } from 'lucide-react';
import { WillData } from '../types/will';
import { assembleWillDocument } from '../utils/clauseLibrary';
import { validateWillData } from '../utils/validation';
import { downloadElementAsPdf } from '../utils/pdfGenerator';

interface WillDocumentPreviewProps {
  data: WillData;
  onOpenJsonModal: () => void;
  onRequestVerification?: () => void;
  isVerified?: boolean;
}

export const WillDocumentPreview: React.FC<WillDocumentPreviewProps> = ({
  data,
  onOpenJsonModal,
  onRequestVerification,
  isVerified = true,
}) => {
  const [copied, setCopied] = useState(false);
  const [isWatermarkOn, setIsWatermarkOn] = useState(true);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  const assembled = assembleWillDocument(data);
  const validation = validateWillData(data);

  const handlePrint = () => {
    window.print();
  };

  const handleDirectDownload = async () => {
    if (!isVerified && onRequestVerification) {
      onRequestVerification();
      return;
    }

    setIsGeneratingPdf(true);
    try {
      await downloadElementAsPdf('legal-will-document', {
        testatorName: data.testator.fullName || 'Testator',
      });
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handleCopyText = () => {
    let fullText = `${assembled.title}\n\n`;
    assembled.clauses.forEach(c => {
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
              onChange={e => setIsWatermarkOn(e.target.checked)}
              className="rounded text-stone-900"
            />
            <span>Draft Watermark</span>
          </label>

          <button
            onClick={handleCopyText}
            className="px-3 py-1.5 text-xs border border-stone-300 hover:bg-stone-50 rounded text-stone-700 transition-colors flex items-center gap-1.5"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copied' : 'Copy Text'}</span>
          </button>

          <button
            onClick={onOpenJsonModal}
            className="px-3 py-1.5 text-xs border border-stone-300 hover:bg-stone-50 rounded text-stone-700 transition-colors hidden sm:block"
          >
            Inspect JSON Output
          </button>

          <button
            onClick={handleDirectDownload}
            disabled={isGeneratingPdf}
            className="px-3.5 py-1.5 text-xs font-semibold bg-amber-200 text-stone-900 hover:bg-amber-100 disabled:opacity-50 rounded transition-colors flex items-center gap-1.5 shadow-2xs"
          >
            {isGeneratingPdf ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Download className="w-3.5 h-3.5" />
            )}
            <span>{isGeneratingPdf ? 'Generating PDF...' : 'Download PDF'}</span>
          </button>

          <button
            onClick={handlePrint}
            className="px-3.5 py-1.5 text-xs font-semibold bg-stone-900 text-amber-100 hover:bg-stone-800 rounded transition-colors flex items-center gap-1.5 shadow-xs"
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

      {/* Actual Legal Document Paper Sheet */}
      <div
        id="legal-will-document"
        className="relative bg-white border border-stone-300 shadow-sm rounded-sm p-8 sm:p-14 text-stone-900 font-serif leading-relaxed text-sm sm:text-base selection:bg-amber-100 print:border-none print:shadow-none print:p-0"
      >
        
        {/* Diagonal Draft Watermark */}
        {isWatermarkOn && (
          <div className="pointer-events-none select-none absolute inset-0 flex items-center justify-center overflow-hidden opacity-8">
            <span className="text-4xl sm:text-6xl font-sans font-bold tracking-widest text-stone-900 -rotate-30 border-8 border-stone-900 p-8 text-center uppercase">
              DRAFT. NOT VALID UNTIL SIGNED AND WITNESSED.
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
          <p className="text-sm font-sans uppercase tracking-widest text-stone-600 mt-1">OF</p>
          <p className="text-xl sm:text-2xl font-bold text-stone-900 mt-1">
            {assembled.testatorName}
          </p>
        </div>

        {/* Sequential Clauses (C1 to C25) */}
        <div className="space-y-6 text-justify">
          {assembled.clauses.map(clause => (
            <div key={clause.clauseId} className="space-y-1">
              <h3 className="font-sans text-xs uppercase tracking-wider font-bold text-stone-700">
                Clause {clause.number}. {clause.title}
              </h3>
              <p className="whitespace-pre-line text-stone-900 leading-relaxed">
                {clause.text}
              </p>
            </div>
          ))}
        </div>

        {/* C26. Testator's Signature */}
        <div className="mt-12 pt-8 border-t border-stone-400 space-y-6 page-break-inside-avoid">
          <h3 className="font-sans text-xs uppercase tracking-wider font-bold text-stone-700">
            Clause {assembled.clauses.length + 1}. TESTATOR'S SIGNATURE & EXECUTION
          </h3>
          <p className="leading-relaxed">
            {assembled.signoff.statement}
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 pt-4 items-center">
            {/* Passport Photo Box */}
            <div className="w-36 h-44 border-2 border-dashed border-stone-400 flex flex-col items-center justify-center text-center p-3 text-xs text-stone-500 font-sans">
              <span>Affix Recent Passport Photograph of Testator</span>
              <span className="text-[10px] text-stone-400 mt-2">(Sign across photo)</span>
            </div>

            {/* Testator Signature / Thumb impression */}
            <div className="space-y-6 font-sans text-xs">
              <div className="pt-10 border-b border-stone-800 text-center">
                <span className="text-stone-700 font-semibold uppercase">
                  Signature or Left Thumb Impression of Testator
                </span>
              </div>
              <div className="flex justify-between text-stone-600">
                <span>Date: {assembled.signoff.date}</span>
                <span>Place: {assembled.signoff.place}</span>
              </div>
            </div>
          </div>
        </div>

        {/* C27. Attestation by Witnesses */}
        <div className="mt-12 pt-8 border-t border-stone-400 space-y-6 page-break-inside-avoid">
          <h3 className="font-sans text-xs uppercase tracking-wider font-bold text-stone-700">
            Clause {assembled.clauses.length + 2}. ATTESTATION BY WITNESSES
          </h3>
          <p className="leading-relaxed">
            {assembled.witnesses.intro}
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 pt-4">
            {/* Witness 1 */}
            <div className="p-4 border border-stone-300 rounded font-sans text-xs space-y-2 bg-stone-50/50">
              <p className="font-bold text-stone-900 uppercase">Witness 1</p>
              <p>Name: <span className="font-semibold">{assembled.witnesses.w1.name}</span></p>
              <p>Relation: {assembled.witnesses.w1.relation}</p>
              <p>Occupation: {assembled.witnesses.w1.occupation}</p>
              <p>Address: {assembled.witnesses.w1.address}</p>
              <div className="pt-8 border-b border-stone-400 text-stone-500 text-[10px]">
                Signature: ______________________
              </div>
              <p className="text-stone-500 text-[10px]">Date: ________________</p>
            </div>

            {/* Witness 2 */}
            <div className="p-4 border border-stone-300 rounded font-sans text-xs space-y-2 bg-stone-50/50">
              <p className="font-bold text-stone-900 uppercase">Witness 2</p>
              <p>Name: <span className="font-semibold">{assembled.witnesses.w2.name}</span></p>
              <p>Relation: {assembled.witnesses.w2.relation}</p>
              <p>Occupation: {assembled.witnesses.w2.occupation}</p>
              <p>Address: {assembled.witnesses.w2.address}</p>
              <div className="pt-8 border-b border-stone-400 text-stone-500 text-[10px]">
                Signature: ______________________
              </div>
              <p className="text-stone-500 text-[10px]">Date: ________________</p>
            </div>
          </div>
        </div>

        {/* C28. Doctor's Certificate (Conditional) */}
        {assembled.doctor && (
          <div className="mt-12 pt-8 border-t border-stone-400 space-y-4 page-break-inside-avoid">
            <h3 className="font-sans text-xs uppercase tracking-wider font-bold text-stone-700">
              Clause {assembled.clauses.length + 3}. REGISTERED MEDICAL PRACTITIONER'S CERTIFICATE
            </h3>
            <p className="leading-relaxed">
              {assembled.doctor.text}
            </p>
            <div className="pt-8 grid grid-cols-2 gap-8 font-sans text-xs">
              <div className="border-b border-stone-400 pb-1 text-stone-600">
                Signature and Seal of Medical Practitioner: __________________
              </div>
              <div className="border-b border-stone-400 pb-1 text-stone-600">
                Date: {assembled.doctor.examDate}
              </div>
            </div>
          </div>
        )}

        {/* Per-Page Initials & Footer Note */}
        <div className="mt-12 pt-6 border-t border-stone-300 text-xs font-sans text-stone-500 flex justify-between items-center">
          <span>Initials of Testator: __________________</span>
          <span>{assembled.testatorName}, Last Will and Testament</span>
        </div>
      </div>
    </div>
  );
};
