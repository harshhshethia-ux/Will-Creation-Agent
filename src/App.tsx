/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { GeminiChatUI } from './components/GeminiChatUI';
import { WillDocumentModal } from './components/WillDocumentModal';
import { JsonExportModal } from './components/JsonExportModal';
import { LegalGlossaryModal } from './components/LegalGlossaryDrawer';
import { MobileVerificationModal } from './components/MobileVerificationModal';
import { AdminPinModal } from './components/AdminPinModal';
import { WillData } from './types/will';
import { INITIAL_EMPTY_WILL_DATA, SAMPLE_COMPLIANT_WILL } from './utils/sampleData';
import { validateWillData } from './utils/validation';
import {
  isDemoModeActive,
  setDemoModeActive,
  isAdminAuthenticated,
  setAdminAuthenticated,
} from './services/verificationService';
import { downloadElementAsPdf } from './utils/pdfGenerator';

const STORAGE_KEY = 'wcm_will_drafting_data_v1';
const STORAGE_KEY_VERIFIED_PHONE = 'wcm_current_user_verified_phone';

export default function App() {
  const [data, setData] = useState<WillData>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.error('Failed to load draft from localStorage', e);
    }
    return INITIAL_EMPTY_WILL_DATA;
  });

  const [verifiedPhone, setVerifiedPhone] = useState<string | null>(() => {
    try {
      return localStorage.getItem(STORAGE_KEY_VERIFIED_PHONE);
    } catch {
      return null;
    }
  });

  // Check admin state (via ?admin=wcm2026 or session storage)
  const [isAdmin, setIsAdmin] = useState<boolean>(() => isAdminAuthenticated());
  const [isDemoMode, setIsDemoMode] = useState<boolean>(() => isDemoModeActive());

  const [isDocumentOpen, setIsDocumentOpen] = useState(false);
  const [isJsonOpen, setIsJsonOpen] = useState(false);
  const [isGlossaryOpen, setIsGlossaryOpen] = useState(false);
  const [isAdminPinOpen, setIsAdminPinOpen] = useState(false);
  const [isVerificationModalOpen, setIsVerificationModalOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<'download' | 'preview' | null>(null);

  // Sync state to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (e) {
      console.error('Failed to save to localStorage', e);
    }
  }, [data]);

  const validation = validateWillData(data);

  const handleToggleDemoMode = () => {
    if (!isAdmin) return;
    const nextVal = !isDemoMode;
    setIsDemoMode(nextVal);
    setDemoModeActive(nextVal);
  };

  const handleAdminUnlocked = () => {
    setIsAdmin(true);
    setIsDemoMode(true);
    setDemoModeActive(true);
  };

  const handleReset = () => {
    setData(INITIAL_EMPTY_WILL_DATA);
    localStorage.removeItem(STORAGE_KEY);
  };

  const handleVerified = (mobile: string) => {
    setVerifiedPhone(mobile);
    try {
      localStorage.setItem(STORAGE_KEY_VERIFIED_PHONE, mobile);
    } catch (e) {
      console.error('Failed to save verified phone', e);
    }

    // Execute any pending action requested by user
    if (pendingAction === 'download') {
      setIsDocumentOpen(true);
      setTimeout(() => {
        downloadElementAsPdf('legal-will-document', {
          testatorName: data.testator.fullName || 'Testator',
        });
      }, 500);
    } else if (pendingAction === 'preview') {
      setIsDocumentOpen(true);
    }
    setPendingAction(null);
  };

  const handleRequestDownloadPdf = () => {
    // Check if verified or in admin demo mode
    if (!verifiedPhone && !(isAdmin && isDemoMode)) {
      setPendingAction('download');
      setIsVerificationModalOpen(true);
      return;
    }

    // If verified or demo mode, open document view and initiate download
    setIsDocumentOpen(true);
    setTimeout(() => {
      downloadElementAsPdf('legal-will-document', {
        testatorName: data.testator.fullName || 'Testator',
      });
    }, 400);
  };

  const handleOpenDocument = () => {
    if (!verifiedPhone && !(isAdmin && isDemoMode)) {
      setPendingAction('preview');
      setIsVerificationModalOpen(true);
      return;
    }
    setIsDocumentOpen(true);
  };

  return (
    <div className="min-h-screen bg-stone-50 flex flex-col font-sans text-stone-900">
      <Header
        status={validation.status}
        testatorName={data.testator.fullName}
        isAdmin={isAdmin}
        isDemoMode={isDemoMode}
        onToggleDemoMode={handleToggleDemoMode}
        onOpenAdminPin={() => setIsAdminPinOpen(true)}
        onOpenDocument={handleOpenDocument}
        onOpenJson={() => setIsJsonOpen(true)}
        onOpenGlossary={() => setIsGlossaryOpen(true)}
        onReset={handleReset}
      />

      {/* Main Gemini-Style Plain Chat Interface */}
      <main className="flex-1 flex flex-col">
        <GeminiChatUI
          data={data}
          onUpdateData={setData}
          onOpenDocumentPreview={handleOpenDocument}
          onOpenJsonModal={() => setIsJsonOpen(true)}
          onOpenGlossary={() => setIsGlossaryOpen(true)}
          onRequestDownloadPdf={handleRequestDownloadPdf}
          onReset={handleReset}
        />
      </main>

      {/* Slide-over / Modal for Full Legal Will Document (Print / Direct PDF) */}
      <WillDocumentModal
        isOpen={isDocumentOpen}
        onClose={() => setIsDocumentOpen(false)}
        data={data}
        onOpenJsonModal={() => setIsJsonOpen(true)}
        onRequestVerification={() => {
          setPendingAction('download');
          setIsVerificationModalOpen(true);
        }}
        isVerified={Boolean(verifiedPhone) || (isAdmin && isDemoMode)}
      />

      {/* Mobile Verification Gate (One-Time Restriction) */}
      <MobileVerificationModal
        isOpen={isVerificationModalOpen}
        onClose={() => {
          setIsVerificationModalOpen(false);
          setPendingAction(null);
        }}
        onVerified={handleVerified}
        testatorName={data.testator.fullName}
        actionTitle={pendingAction === 'download' ? 'Direct PDF Download' : 'Draft Will'}
        isAdmin={isAdmin}
      />

      {/* Admin Master PIN Modal */}
      <AdminPinModal
        isOpen={isAdminPinOpen}
        onClose={() => setIsAdminPinOpen(false)}
        onSuccess={handleAdminUnlocked}
      />

      {/* Step 1 & Step 2 JSON Inspector Modal */}
      {isJsonOpen && (
        <JsonExportModal
          data={data}
          onClose={() => setIsJsonOpen(false)}
        />
      )}

      {/* Plain 1-line Legal Glossary Modal */}
      <LegalGlossaryModal
        isOpen={isGlossaryOpen}
        onClose={() => setIsGlossaryOpen(false)}
      />
    </div>
  );
}
