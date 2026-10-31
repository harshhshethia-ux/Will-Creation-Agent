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
import { LegalOrientationModal } from './components/LegalOrientationModal';
import { RegistrationLandingPage } from './components/RegistrationLandingPage';
import { WillData } from './types/will';
import { INITIAL_EMPTY_WILL_DATA, SAMPLE_COMPLIANT_WILL } from './utils/sampleData';
import { validateWillData } from './utils/validation';
import {
  isDemoModeActive,
  setDemoModeActive,
  isAdminAuthenticated,
} from './services/verificationService';
import {
  PaymentRecord,
  checkServerLicenseStatus,
  consumeServerExecutionCredit,
  completeTrainingOrientation,
  getStoredLicenseKey,
  setStoredLicenseKey,
  ServerLicenseStatus,
} from './services/razorpayService';
import { RazorpayModal } from './components/RazorpayModal';
import { downloadElementAsPdf } from './utils/pdfGenerator';
import { CheckCircle2, AlertCircle, X as CloseIcon } from 'lucide-react';

const STORAGE_KEY = 'wcm_will_drafting_data_v1';
const STORAGE_KEY_VERIFIED_PHONE = 'wcm_current_user_verified_phone';

export default function App() {
  // Navigation & View Mode: 'landing' (Registration & Payment Check) vs 'drafter' (Will Assistant)
  const [viewMode, setViewMode] = useState<'landing' | 'drafter'>('landing');

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

  // Admin state
  const [isAdmin, setIsAdmin] = useState<boolean>(() => isAdminAuthenticated());
  const [isDemoMode, setIsDemoMode] = useState<boolean>(() => isDemoModeActive());

  // Licensing state
  const [isPaid, setIsPaid] = useState<boolean>(false);
  const [isConsumed, setIsConsumed] = useState<boolean>(false);
  const [creditsRemaining, setCreditsRemaining] = useState<number>(0);
  const [activeLicenseKey, setActiveLicenseKey] = useState<string>(() => getStoredLicenseKey());
  const [isTrainingCompleted, setIsTrainingCompleted] = useState<boolean>(false);
  const [externalTrainingUrl, setExternalTrainingUrl] = useState<string>('');

  // Modals state
  const [isDocumentOpen, setIsDocumentOpen] = useState(false);
  const [isJsonOpen, setIsJsonOpen] = useState(false);
  const [isGlossaryOpen, setIsGlossaryOpen] = useState(false);
  const [isAdminPinOpen, setIsAdminPinOpen] = useState(false);
  const [isVerificationModalOpen, setIsVerificationModalOpen] = useState(false);
  const [isRazorpayModalOpen, setIsRazorpayModalOpen] = useState(false);
  const [isOrientationModalOpen, setIsOrientationModalOpen] = useState(false);
  const [modalPlanMode, setModalPlanMode] = useState<'standard' | 'amendment'>('standard');
  const [pendingAction, setPendingAction] = useState<'download' | 'preview' | null>(null);
  const [statusNotification, setStatusNotification] = useState<{
    text: string;
    type: 'success' | 'warning' | 'info';
  } | null>(null);

  // 1. Initial URL Inspection for License Tokens or Admin Links
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const urlParams = new URLSearchParams(window.location.search);
    const licenseParam = urlParams.get('license');
    const phoneParam = urlParams.get('phone');

    if (licenseParam) {
      const cleanKey = licenseParam.trim().toUpperCase();
      checkServerLicenseStatus({ licenseKey: cleanKey }).then((result) => {
        if (result.status === 'active') {
          setIsPaid(true);
          setIsConsumed(false);
          setCreditsRemaining(result.creditsRemaining || 1);
          setActiveLicenseKey(cleanKey);
          setStoredLicenseKey(cleanKey);
          setViewMode('drafter');
          if (result.trainingCompleted !== undefined) {
            setIsTrainingCompleted(result.trainingCompleted);
          }
          if (result.externalTrainingUrl) {
            setExternalTrainingUrl(result.externalTrainingUrl);
          }
          if (result.phone) {
            setVerifiedPhone(result.phone);
            localStorage.setItem(STORAGE_KEY_VERIFIED_PHONE, result.phone);
          }
          setStatusNotification({
            type: 'success',
            text: `🎉 Single-User License Verified (${cleanKey})! 1 legal Will execution credit active for your mobile number.`,
          });
        } else if (result.status === 'consumed') {
          setIsConsumed(true);
          setIsPaid(false);
          setCreditsRemaining(0);
          setStatusNotification({
            type: 'warning',
            text: `⚠️ License ${cleanKey} has already been executed. To draft an amendment or codicil, an Amendment License (₹999) is required.`,
          });
        } else {
          setStatusNotification({
            type: 'warning',
            text: `License code not recognized. If a friend shared this link, please purchase your own license to unlock.`,
          });
        }

        // Clean URL cleanly
        window.history.replaceState({}, document.title, window.location.pathname);
      });
    } else if (phoneParam) {
      const clean = phoneParam.replace(/\D/g, '').slice(-10);
      if (clean.length === 10) {
        setVerifiedPhone(clean);
        localStorage.setItem(STORAGE_KEY_VERIFIED_PHONE, clean);
      }
    }

    const adminParam = urlParams.get('admin');
    if (adminParam === 'true' || adminParam === '1' || adminParam === '8492') {
      setIsAdminPinOpen(true);
    }
  }, []);

  // Global Admin Keyboard Shortcut (Ctrl+Shift+A or Cmd+Shift+A)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'A' || e.key === 'a')) {
        e.preventDefault();
        setIsAdminPinOpen(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // 2. Synchronize server license status on phone or admin change
  useEffect(() => {
    if (isAdmin && isDemoMode) {
      setIsPaid(true);
      setIsConsumed(false);
      setCreditsRemaining(999);
      setIsTrainingCompleted(true);
      return;
    }

    if (verifiedPhone || activeLicenseKey) {
      checkServerLicenseStatus({
        phone: verifiedPhone,
        licenseKey: activeLicenseKey,
      }).then((result) => {
        if (result.status === 'active') {
          setIsPaid(true);
          setIsConsumed(false);
          setCreditsRemaining(result.creditsRemaining);
          if (result.trainingCompleted !== undefined) {
            setIsTrainingCompleted(result.trainingCompleted);
          }
          if (result.externalTrainingUrl) {
            setExternalTrainingUrl(result.externalTrainingUrl);
          }
          if (result.licenseKey) {
            setActiveLicenseKey(result.licenseKey);
            setStoredLicenseKey(result.licenseKey);
          }
        } else if (result.status === 'consumed') {
          setIsPaid(false);
          setIsConsumed(true);
          setCreditsRemaining(0);
        } else {
          setIsPaid(false);
          setIsConsumed(false);
          setCreditsRemaining(0);
        }
      });
    }
  }, [verifiedPhone, activeLicenseKey, isAdmin, isDemoMode]);

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

  const handleLaunchDemo = (mode: 'sample' | 'blank' = 'sample') => {
    setIsAdmin(true);
    setIsDemoMode(true);
    setDemoModeActive(true);
    setIsPaid(true);
    setIsConsumed(false);
    setCreditsRemaining(999);
    setIsTrainingCompleted(true);
    setIsAdminPinOpen(false);

    if (mode === 'sample') {
      setData(SAMPLE_COMPLIANT_WILL);
      setVerifiedPhone('9822012345');
    } else {
      setData({
        ...INITIAL_EMPTY_WILL_DATA,
        testator: {
          ...INITIAL_EMPTY_WILL_DATA.testator,
          fullName: 'Demo Client Session',
          mobile: '9876543210',
          email: 'demo@wealthcreationmatrix.com',
          city: 'Mumbai',
          state: 'Maharashtra',
        },
      });
      setVerifiedPhone('9876543210');
    }

    setViewMode('drafter');
    setStatusNotification({
      type: 'success',
      text:
        mode === 'sample'
          ? '🌟 Client Demo Mode Active — Pre-loaded with compliant Indian Succession Act Will (Rajesh Sharma) for live walkthrough.'
          : '✍️ Client Demo Mode Active — Fresh session ready for live client demonstration.',
    });
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

  // Called when registration is submitted and payment verified
  const handleEnterDrafterFromRegistration = (testatorInfo: {
    name: string;
    phone: string;
    email: string;
    city: string;
    state: string;
    licenseKey?: string;
    isPaid: boolean;
  }) => {
    setData((prev) => ({
      ...prev,
      testator: {
        ...prev.testator,
        fullName: testatorInfo.name || prev.testator.fullName,
        mobile: testatorInfo.phone || prev.testator.mobile,
        email: testatorInfo.email || prev.testator.email,
        city: testatorInfo.city || prev.testator.city,
        state: testatorInfo.state || prev.testator.state,
      },
    }));

    setVerifiedPhone(testatorInfo.phone);
    try {
      localStorage.setItem(STORAGE_KEY_VERIFIED_PHONE, testatorInfo.phone);
    } catch (e) {
      console.error('Failed to save verified phone', e);
    }

    setIsPaid(testatorInfo.isPaid);
    setIsConsumed(false);
    setCreditsRemaining(1);

    if (testatorInfo.licenseKey) {
      setActiveLicenseKey(testatorInfo.licenseKey);
      setStoredLicenseKey(testatorInfo.licenseKey);
    }

    setViewMode('drafter');
    setStatusNotification({
      type: 'success',
      text: `🎉 Welcome, ${testatorInfo.name}! 1-Time Legal Will Execution Credit active for +91 ${testatorInfo.phone}.`,
    });
  };

  // Called when payment succeeds via in-app Razorpay modal or claim
  const handlePaymentSuccess = (record: PaymentRecord) => {
    setIsPaid(true);
    setIsConsumed(false);
    setCreditsRemaining(1);
    if (record.licenseKey) {
      setActiveLicenseKey(record.licenseKey);
      setStoredLicenseKey(record.licenseKey);
    }
    if (record.customerPhone) {
      const clean = record.customerPhone.replace(/\D/g, '').slice(-10);
      setVerifiedPhone(clean);
      localStorage.setItem(STORAGE_KEY_VERIFIED_PHONE, clean);
    }
    if (record.customerName) {
      setData((prev) => ({
        ...prev,
        testator: {
          ...prev.testator,
          fullName: record.customerName || prev.testator.fullName,
          mobile: record.customerPhone || prev.testator.mobile,
          email: record.customerEmail || prev.testator.email,
        },
      }));
    }

    setIsRazorpayModalOpen(false);
    setViewMode('drafter');
    setStatusNotification({
      type: 'success',
      text: `🎉 Payment Confirmed: ₹${record.amount} received! Access granted to Drafting Assistant.`,
    });

    // Prompt orientation checklist before proceeding
    setIsOrientationModalOpen(true);
  };

  // Called when training orientation is certified
  const handleTrainingCertified = async () => {
    setIsTrainingCompleted(true);
    await completeTrainingOrientation({
      phone: verifiedPhone,
      licenseKey: activeLicenseKey,
    });
    setStatusNotification({
      type: 'success',
      text: '🎓 Legal Orientation Certified! Your 1-time licensed execution is now active.',
    });

    if (pendingAction === 'download') {
      setIsDocumentOpen(true);
      setTimeout(() => {
        downloadElementAsPdf('legal-will-document', {
          testatorName: data.testator.fullName || 'Testator',
        });
        handleExecutionCompleted();
      }, 500);
      setPendingAction(null);
    }
  };

  // Called when user finishes downloading/printing the legal Will
  const handleExecutionCompleted = async () => {
    if (isAdmin && isDemoMode) {
      return; // Do not consume admin test executions
    }

    try {
      const res = await consumeServerExecutionCredit({
        phone: verifiedPhone,
        licenseKey: activeLicenseKey,
        testatorName: data.testator.fullName || 'Testator',
      });

      if (res.success) {
        setIsPaid(false);
        setIsConsumed(true);
        setCreditsRemaining(0);
        setStatusNotification({
          type: 'info',
          text: `📜 Will Execution Finalized! 1 license credit consumed. Subsequent amendments or codicils require an Amendment License (₹999).`,
        });
      }
    } catch (e) {
      console.error('Failed to record execution', e);
    }
  };

  const handleVerified = (mobile: string, serverStatus?: ServerLicenseStatus) => {
    setVerifiedPhone(mobile);
    try {
      localStorage.setItem(STORAGE_KEY_VERIFIED_PHONE, mobile);
    } catch (e) {
      console.error('Failed to save verified phone', e);
    }

    if (serverStatus) {
      if (serverStatus.status === 'active') {
        setIsPaid(true);
        setIsConsumed(false);
        setCreditsRemaining(serverStatus.creditsRemaining);
        if (serverStatus.trainingCompleted !== undefined) {
          setIsTrainingCompleted(serverStatus.trainingCompleted);
        }
        if (serverStatus.externalTrainingUrl) {
          setExternalTrainingUrl(serverStatus.externalTrainingUrl);
        }
        if (serverStatus.licenseKey) {
          setActiveLicenseKey(serverStatus.licenseKey);
          setStoredLicenseKey(serverStatus.licenseKey);
        }
      } else if (serverStatus.status === 'consumed') {
        setIsPaid(false);
        setIsConsumed(true);
        setCreditsRemaining(0);
      }
    }

    const canProceed =
      (serverStatus ? serverStatus.status === 'active' : isPaid) || (isAdmin && isDemoMode);

    if (!canProceed) {
      if (pendingAction === 'download') {
        setModalPlanMode(isConsumed ? 'amendment' : 'standard');
        setIsRazorpayModalOpen(true);
        return;
      }
    }

    // Check training orientation requirement
    const trainingDone =
      (serverStatus ? serverStatus.trainingCompleted : isTrainingCompleted) ||
      (isAdmin && isDemoMode);

    if (!trainingDone && pendingAction === 'download') {
      setIsOrientationModalOpen(true);
      return;
    }

    // Execute pending action
    if (pendingAction === 'download') {
      setIsDocumentOpen(true);
      setTimeout(() => {
        downloadElementAsPdf('legal-will-document', {
          testatorName: data.testator.fullName || 'Testator',
        });
        handleExecutionCompleted();
      }, 500);
    } else if (pendingAction === 'preview') {
      setIsDocumentOpen(true);
    }
    setPendingAction(null);
  };

  const handleRequestDownloadPdf = () => {
    // 1. Check if verified
    if (!verifiedPhone && !(isAdmin && isDemoMode)) {
      setPendingAction('download');
      setIsVerificationModalOpen(true);
      return;
    }

    // 2. Check if consumed -> requires amendment license
    if (isConsumed && !(isAdmin && isDemoMode)) {
      setPendingAction('download');
      setModalPlanMode('amendment');
      setIsRazorpayModalOpen(true);
      return;
    }

    // 3. Check if paid
    if (!isPaid && !(isAdmin && isDemoMode)) {
      setPendingAction('download');
      setModalPlanMode('standard');
      setIsRazorpayModalOpen(true);
      return;
    }

    // 4. Check Mandatory Legal Training Orientation
    if (!isTrainingCompleted && !(isAdmin && isDemoMode)) {
      setPendingAction('download');
      setIsOrientationModalOpen(true);
      return;
    }

    // 5. Download and consume credit
    setIsDocumentOpen(true);
    setTimeout(async () => {
      await downloadElementAsPdf('legal-will-document', {
        testatorName: data.testator.fullName || 'Testator',
      });
      handleExecutionCompleted();
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

  const handleOpenPricingModal = (planId: 'standard' | 'amendment' = 'standard') => {
    setModalPlanMode(planId);
    setIsRazorpayModalOpen(true);
  };

  if (viewMode === 'landing') {
    return (
      <div className="min-h-screen bg-[#0B0F17] flex flex-col font-sans">
        <RegistrationLandingPage
          onEnterDrafter={handleEnterDrafterFromRegistration}
          onOpenAdmin={() => setIsAdminPinOpen(true)}
          onLaunchDemo={handleLaunchDemo}
          onOpenPricingModal={(info) => {
            if (info) {
              setData((prev) => ({
                ...prev,
                testator: {
                  ...prev.testator,
                  fullName: info.name || prev.testator.fullName,
                  mobile: info.phone || prev.testator.mobile,
                  email: info.email || prev.testator.email,
                },
              }));
              if (info.phone) {
                setVerifiedPhone(info.phone);
              }
            }
            setIsRazorpayModalOpen(true);
          }}
          existingPhone={verifiedPhone}
          existingName={data.testator.fullName}
        />

        {/* Razorpay Customer Payment Gate Modal */}
        <RazorpayModal
          isOpen={isRazorpayModalOpen}
          onClose={() => {
            setIsRazorpayModalOpen(false);
            setPendingAction(null);
          }}
          onPaymentSuccess={handlePaymentSuccess}
          testatorName={data.testator.fullName}
          defaultPhone={verifiedPhone || ''}
          isAdmin={isAdmin}
          defaultPlanId={modalPlanMode}
          isAmendmentMode={modalPlanMode === 'amendment' || isConsumed}
        />

        {/* Mandatory Legal Training & Clause Orientation Gate */}
        <LegalOrientationModal
          isOpen={isOrientationModalOpen}
          onClose={() => setIsOrientationModalOpen(false)}
          onCertified={handleTrainingCertified}
          externalTrainingUrl={externalTrainingUrl}
          isCompleted={isTrainingCompleted}
        />

        {/* Admin Master PIN Modal & Licensing Desk */}
        <AdminPinModal
          isOpen={isAdminPinOpen}
          onClose={() => setIsAdminPinOpen(false)}
          onSuccess={handleAdminUnlocked}
          isAdmin={isAdmin}
          onLaunchDemo={handleLaunchDemo}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-50 flex flex-col font-sans text-stone-900">
      <Header
        status={validation.status}
        testatorName={data.testator.fullName}
        isAdmin={isAdmin}
        isDemoMode={isDemoMode}
        isPaid={isPaid}
        isConsumed={isConsumed}
        isTrainingCompleted={isTrainingCompleted}
        onOpenPricing={handleOpenPricingModal}
        onOpenOrientation={() => setIsOrientationModalOpen(true)}
        onToggleDemoMode={handleToggleDemoMode}
        onOpenAdminPin={() => setIsAdminPinOpen(true)}
        onOpenDocument={handleOpenDocument}
        onOpenJson={() => setIsJsonOpen(true)}
        onOpenGlossary={() => setIsGlossaryOpen(true)}
        onReset={handleReset}
        onReturnToLanding={() => setViewMode('landing')}
      />

      {statusNotification && (
        <div
          className={`px-4 py-2.5 text-xs sm:text-sm font-medium shadow-md flex items-center justify-between gap-3 animate-in fade-in duration-200 border-b ${
            statusNotification.type === 'success'
              ? 'bg-emerald-700 text-white border-emerald-800'
              : statusNotification.type === 'warning'
              ? 'bg-amber-800 text-amber-100 border-amber-900'
              : 'bg-stone-800 text-stone-100 border-stone-900'
          }`}
        >
          <div className="flex items-center gap-2 max-w-4xl mx-auto flex-1">
            {statusNotification.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-200 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-amber-200 shrink-0" />
            )}
            <span>{statusNotification.text}</span>
          </div>
          <button
            onClick={() => setStatusNotification(null)}
            className="text-white/80 hover:text-white p-1 rounded cursor-pointer"
          >
            <CloseIcon className="w-4 h-4" />
          </button>
        </div>
      )}

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
        isPaid={isPaid}
        isConsumed={isConsumed}
        onRequestPayment={handleOpenPricingModal}
        onExecutionCompleted={handleExecutionCompleted}
      />

      {/* Razorpay Customer Payment Gate Modal */}
      <RazorpayModal
        isOpen={isRazorpayModalOpen}
        onClose={() => {
          setIsRazorpayModalOpen(false);
          setPendingAction(null);
        }}
        onPaymentSuccess={handlePaymentSuccess}
        testatorName={data.testator.fullName}
        defaultPhone={verifiedPhone || ''}
        isAdmin={isAdmin}
        defaultPlanId={modalPlanMode}
        isAmendmentMode={modalPlanMode === 'amendment' || isConsumed}
      />

      {/* Mobile Verification Gate (Anti-Link-Sharing & One-Time Execution) */}
      <MobileVerificationModal
        isOpen={isVerificationModalOpen}
        onClose={() => {
          setIsVerificationModalOpen(false);
          setPendingAction(null);
        }}
        onVerified={handleVerified}
        onRequestPayment={handleOpenPricingModal}
        testatorName={data.testator.fullName}
        actionTitle={pendingAction === 'download' ? 'Official PDF Download' : 'Draft Will'}
        isAdmin={isAdmin}
      />

      {/* Mandatory Legal Training & Clause Orientation Gate */}
      <LegalOrientationModal
        isOpen={isOrientationModalOpen}
        onClose={() => setIsOrientationModalOpen(false)}
        onCertified={handleTrainingCertified}
        externalTrainingUrl={externalTrainingUrl}
        isCompleted={isTrainingCompleted}
      />

      {/* Admin Master PIN Modal & Licensing Desk */}
      <AdminPinModal
        isOpen={isAdminPinOpen}
        onClose={() => setIsAdminPinOpen(false)}
        onSuccess={handleAdminUnlocked}
        isAdmin={isAdmin}
        onLaunchDemo={handleLaunchDemo}
      />

      {/* Step 1 & Step 2 JSON Inspector Modal */}
      {isJsonOpen && <JsonExportModal data={data} onClose={() => setIsJsonOpen(false)} />}

      {/* Plain 1-line Legal Glossary Modal */}
      <LegalGlossaryModal isOpen={isGlossaryOpen} onClose={() => setIsGlossaryOpen(false)} />
    </div>
  );
}
