import React from 'react';
import {
  FileText,
  ShieldCheck,
  AlertTriangle,
  BookOpen,
  Code,
  RotateCcw,
  Sparkles,
  Lock,
  FileEdit,
  GraduationCap,
} from 'lucide-react';
import { StatusType } from '../types/will';
import { WealthCreationLogo } from './WealthCreationLogo';

interface HeaderProps {
  status: StatusType;
  testatorName?: string;
  isAdmin: boolean;
  isDemoMode: boolean;
  isPaid?: boolean;
  isConsumed?: boolean;
  isTrainingCompleted?: boolean;
  onOpenPricing?: (planId?: 'standard' | 'amendment') => void;
  onOpenOrientation?: () => void;
  onToggleDemoMode: () => void;
  onOpenAdminPin: () => void;
  onOpenDocument: () => void;
  onOpenJson: () => void;
  onOpenGlossary: () => void;
  onReset: () => void;
  onReturnToLanding?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  status,
  testatorName,
  isAdmin,
  isDemoMode,
  isPaid = false,
  isConsumed = false,
  isTrainingCompleted = false,
  onOpenPricing,
  onOpenOrientation,
  onToggleDemoMode,
  onOpenAdminPin,
  onOpenDocument,
  onOpenJson,
  onOpenGlossary,
  onReset,
  onReturnToLanding,
}) => {
  return (
    <header className="sticky top-0 z-30 bg-stone-900 text-stone-100 border-b border-stone-800 shadow-xs print:hidden">
      <div className="max-w-5xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-14 sm:h-16">
          {/* Brand Logo & Main Headline (Zone 1) */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                if (onReturnToLanding) {
                  onReturnToLanding();
                } else if (!isAdmin) {
                  onOpenAdminPin();
                }
              }}
              title="Return to Registration Landing Page"
              className="flex items-center gap-2.5 sm:gap-3 text-left transition-opacity hover:opacity-95 cursor-pointer group"
            >
              <WealthCreationLogo size={36} />
              <h1 className="font-serif text-lg sm:text-xl font-bold tracking-tight text-amber-100 whitespace-nowrap group-hover:text-white transition-colors">
                Will Drafting Assistant
              </h1>
            </button>
          </div>

          {/* Status & Actions (Zone 3) */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Demo Mode Toggle - ONLY VISIBLE TO AUTHENTICATED ADMINISTRATOR */}
            {isAdmin ? (
              <button
                onClick={onToggleDemoMode}
                title={
                  isDemoMode
                    ? 'Admin Demo Mode Active: Unlimited trial runs allowed. Click to test Strict 1-Time limit.'
                    : 'Strict Mode: 1-time limit enforced per mobile number.'
                }
                className={`text-[11px] font-mono px-2.5 py-1 rounded border flex items-center gap-1.5 transition-colors cursor-pointer ${
                  isDemoMode
                    ? 'bg-amber-950/70 text-amber-300 border-amber-700/80 hover:bg-amber-900/80'
                    : 'bg-stone-800/80 text-stone-400 border-stone-700 hover:text-stone-200'
                }`}
              >
                <Sparkles className="w-3 h-3 text-amber-400" />
                <span>{isDemoMode ? 'Admin Demo: ON' : 'Strict Mode: ON'}</span>
              </button>
            ) : null}

            {status === 'LAWYER_REVIEW_REQUIRED' && (
              <span className="hidden lg:flex items-center gap-1 text-[11px] font-medium text-amber-300 bg-amber-950/80 border border-amber-800/80 px-2 py-0.5 rounded">
                <AlertTriangle className="w-3 h-3 text-amber-400" />
                <span>Lawyer Review</span>
              </span>
            )}

            {onReturnToLanding && (
              <button
                onClick={onReturnToLanding}
                className="text-xs px-2.5 py-1.5 text-stone-300 hover:text-white hover:bg-stone-800 rounded transition-colors hidden md:flex items-center gap-1 cursor-pointer"
                title="Return to Registration Landing Page & Switch Testator"
              >
                <span>Portal</span>
              </button>
            )}

            <button
              onClick={onOpenGlossary}
              className="text-xs px-2.5 py-1.5 text-stone-300 hover:text-white hover:bg-stone-800 rounded transition-colors hidden sm:flex items-center gap-1 cursor-pointer"
            >
              <BookOpen className="w-3.5 h-3.5 text-stone-400" />
              <span>Glossary</span>
            </button>

            <button
              onClick={onOpenJson}
              className="text-xs px-2.5 py-1.5 text-stone-300 hover:text-white hover:bg-stone-800 rounded transition-colors hidden sm:flex items-center gap-1 cursor-pointer"
            >
              <Code className="w-3.5 h-3.5 text-stone-400" />
              <span>JSON</span>
            </button>

            {/* Mandatory Legal Orientation Status Badge / Button */}
            {isPaid && !isConsumed && onOpenOrientation && (
              <button
                onClick={onOpenOrientation}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded transition-colors cursor-pointer ${
                  isTrainingCompleted
                    ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-800 hover:bg-emerald-900'
                    : 'bg-amber-500 text-stone-950 border border-amber-400 hover:bg-amber-400 shadow-sm animate-pulse'
                }`}
                title={
                  isTrainingCompleted
                    ? 'Legal Clause Training Certified'
                    : 'Pre-Drafting Legal Orientation Checklist Required'
                }
              >
                <GraduationCap className="w-3.5 h-3.5" />
                <span>{isTrainingCompleted ? 'Legal Certified' : 'Complete Orientation'}</span>
              </button>
            )}

            {/* Licensing Status: Consumed (Amend) vs Active vs Unpaid */}
            {isConsumed ? (
              <button
                onClick={() => onOpenPricing?.('amendment')}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold text-amber-300 bg-amber-950/90 hover:bg-amber-900 border border-amber-700/80 rounded transition-colors shadow-2xs cursor-pointer"
                title="Will finalized. Click to unlock Amendment License (₹999)"
              >
                <FileEdit className="w-3 h-3 text-amber-300" />
                <span>Amend Will (₹999)</span>
              </button>
            ) : !isPaid && onOpenPricing ? (
              <button
                onClick={() => onOpenPricing?.('standard')}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold text-amber-200 bg-amber-950/90 hover:bg-amber-900 border border-amber-700/80 rounded transition-colors shadow-2xs cursor-pointer"
                title="Unlock official Will & watermark-free PDF via Razorpay"
              >
                <Lock className="w-3 h-3 text-amber-300" />
                <span>Unlock (₹1,999)</span>
              </button>
            ) : null}

            <button
              onClick={onOpenDocument}
              className="px-3 sm:px-3.5 py-1.5 text-xs font-semibold text-stone-900 bg-amber-200 hover:bg-amber-100 rounded transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>View Draft Will</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
