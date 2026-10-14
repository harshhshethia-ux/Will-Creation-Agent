import React from 'react';
import { FileText, ShieldCheck, AlertTriangle, BookOpen, Code, RotateCcw, Sparkles, Lock, Shield } from 'lucide-react';
import { StatusType } from '../types/will';
import { WealthCreationLogo } from './WealthCreationLogo';

interface HeaderProps {
  status: StatusType;
  testatorName?: string;
  isAdmin: boolean;
  isDemoMode: boolean;
  onToggleDemoMode: () => void;
  onOpenAdminPin: () => void;
  onOpenDocument: () => void;
  onOpenJson: () => void;
  onOpenGlossary: () => void;
  onReset: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  status,
  testatorName,
  isAdmin,
  isDemoMode,
  onToggleDemoMode,
  onOpenAdminPin,
  onOpenDocument,
  onOpenJson,
  onOpenGlossary,
  onReset,
}) => {
  return (
    <header className="sticky top-0 z-30 bg-stone-900 text-stone-100 border-b border-stone-800 shadow-xs print:hidden">
      <div className="max-w-5xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-14 sm:h-16">
          {/* Brand Logo & Main Headline (Zone 1) */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                if (!isAdmin) onOpenAdminPin();
              }}
              title={isAdmin ? 'Administrator Mode Active' : 'Will Drafting Assistant'}
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

            <button
              onClick={onOpenGlossary}
              className="text-xs px-2.5 py-1.5 text-stone-300 hover:text-white hover:bg-stone-800 rounded transition-colors hidden sm:flex items-center gap-1"
            >
              <BookOpen className="w-3.5 h-3.5 text-stone-400" />
              <span>Glossary</span>
            </button>

            <button
              onClick={onOpenJson}
              className="text-xs px-2.5 py-1.5 text-stone-300 hover:text-white hover:bg-stone-800 rounded transition-colors hidden sm:flex items-center gap-1"
            >
              <Code className="w-3.5 h-3.5 text-stone-400" />
              <span>JSON</span>
            </button>

            <button
              onClick={onOpenDocument}
              className="px-3 sm:px-3.5 py-1.5 text-xs font-semibold text-stone-900 bg-amber-200 hover:bg-amber-100 rounded transition-colors flex items-center gap-1.5 shadow-xs"
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
