import React, { useState } from 'react';
import {
  ShieldCheck,
  Smartphone,
  KeyRound,
  CheckCircle2,
  AlertCircle,
  X,
  RotateCcw,
  Sparkles,
  Lock,
  ArrowRight,
  FileEdit,
  Zap,
} from 'lucide-react';
import {
  isDemoModeActive,
  setDemoModeActive,
  clearAllMobileRegistrations,
  DEMO_WHITELISTED_NUMBERS,
} from '../services/verificationService';
import { checkServerLicenseStatus, ServerLicenseStatus } from '../services/razorpayService';

interface MobileVerificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onVerified: (mobile: string, serverStatus?: ServerLicenseStatus) => void;
  onRequestPayment?: (planId?: 'standard' | 'amendment') => void;
  testatorName?: string;
  actionTitle?: string;
  isAdmin?: boolean;
}

export const MobileVerificationModal: React.FC<MobileVerificationModalProps> = ({
  isOpen,
  onClose,
  onVerified,
  onRequestPayment,
  testatorName,
  actionTitle = 'Download Your Legal Will Document',
  isAdmin = false,
}) => {
  const [step, setStep] = useState<'phone' | 'otp' | 'consumed' | 'unpaid'>('phone');
  const [mobileInput, setMobileInput] = useState('');
  const [otpInput, setOtpInput] = useState('');
  const [expectedOtp, setExpectedOtp] = useState('');
  const [otpError, setOtpError] = useState('');
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [serverLicenseInfo, setServerLicenseInfo] = useState<ServerLicenseStatus | null>(null);
  const [demoMode, setDemoMode] = useState<boolean>(() => isDemoModeActive());
  const [resetMessage, setResetMessage] = useState('');

  if (!isOpen) return null;

  const handleToggleDemoMode = () => {
    const nextVal = !demoMode;
    setDemoMode(nextVal);
    setDemoModeActive(nextVal);
  };

  const handleSendOtp = async (numberToUse?: string) => {
    const rawNum = (numberToUse !== undefined ? numberToUse : mobileInput).replace(/\D/g, '');
    if (rawNum.length < 10) return;
    const cleanNum = rawNum.slice(-10);

    setIsSendingOtp(true);
    setOtpError('');

    try {
      const res = await fetch('/api/license/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: cleanNum }),
      });
      const data = await res.json();
      setIsSendingOtp(false);

      if (res.ok && data.success) {
        setExpectedOtp(data.otpDebug || '1234');
        setStep('otp');
      } else {
        setOtpError(data.error || 'Failed to send OTP code.');
      }
    } catch (e) {
      setIsSendingOtp(false);
      // Fallback
      setExpectedOtp('1234');
      setStep('otp');
    }
  };

  const handleVerifyOtp = async () => {
    const cleanNum = mobileInput.replace(/\D/g, '').slice(-10);
    setIsVerifying(true);
    setOtpError('');

    try {
      const checkResult = await checkServerLicenseStatus({
        phone: cleanNum,
        otp: otpInput.trim(),
      });
      setIsVerifying(false);

      setServerLicenseInfo(checkResult);

      if (checkResult.status === 'active') {
        onVerified(cleanNum, checkResult);
        onClose();
        return;
      }

      if (checkResult.status === 'consumed') {
        setStep('consumed');
        return;
      }

      if (checkResult.status === 'unpaid') {
        // Not paid
        setStep('unpaid');
        return;
      }

      setOtpError(checkResult.message || 'Verification could not be completed.');
    } catch (err: any) {
      setIsVerifying(false);
      setOtpError(err?.message || 'Verification failed. Please check network.');
    }
  };

  const handleQuickDemoNumber = (num: string) => {
    setMobileInput(num);
    handleSendOtp(num);
  };

  const handleClearHistory = () => {
    clearAllMobileRegistrations();
    setResetMessage('All mobile registration histories have been cleared.');
    setTimeout(() => setResetMessage(''), 3000);
    setStep('phone');
  };

  return (
    <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl border border-stone-200 shadow-xl max-w-md w-full overflow-hidden my-auto">
        {/* Header Strip */}
        <div className="px-6 py-4 bg-stone-900 text-stone-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Smartphone className="w-4 h-4 text-amber-200" />
            <h3 className="font-serif font-bold text-base text-amber-100">
              Mobile Identity & License Check
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-stone-400 hover:text-white transition-colors p-1 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Demo Mode Banner - ONLY FOR AUTHENTICATED ADMIN */}
        {isAdmin && (
          <div className="bg-amber-50/90 border-b border-amber-200/90 px-6 py-2.5 flex items-center justify-between text-xs text-amber-900">
            <div className="flex items-center gap-1.5 font-medium">
              <Sparkles className="w-3.5 h-3.5 text-amber-700" />
              <span>Admin Demo Mode:</span>
              <span className={demoMode ? 'text-emerald-700 font-bold' : 'text-stone-600'}>
                {demoMode ? 'ACTIVE (Unlimited)' : 'OFF (Strict)'}
              </span>
            </div>

            <button
              onClick={handleToggleDemoMode}
              className="text-[11px] px-2 py-0.5 bg-white border border-amber-300 rounded font-semibold text-stone-800 hover:bg-stone-50 transition-colors shadow-2xs cursor-pointer"
            >
              Toggle {demoMode ? 'to Strict' : 'to Demo'}
            </button>
          </div>
        )}

        {/* Body Content */}
        <div className="p-6 space-y-5">
          {resetMessage && (
            <div className="p-2.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-lg flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>{resetMessage}</span>
            </div>
          )}

          {/* STEP 1: ENTER MOBILE NUMBER */}
          {step === 'phone' && (
            <div className="space-y-4">
              <div className="space-y-1">
                <h4 className="font-bold text-stone-900 text-sm">
                  Verify your mobile number to unlock {actionTitle}
                </h4>
                <p className="text-xs text-stone-600 leading-relaxed">
                  Your legal Will license is strictly tied to your verified mobile number to prevent link copying and protect your estate confidentiality.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  10-Digit Mobile Number (India)
                </label>
                <div className="flex items-center rounded-lg border border-stone-300 focus-within:border-stone-800 focus-within:ring-1 focus-within:ring-stone-800 overflow-hidden">
                  <span className="px-3 py-2.5 bg-stone-100 text-stone-600 text-xs font-mono border-r border-stone-300">
                    +91
                  </span>
                  <input
                    type="tel"
                    maxLength={10}
                    placeholder="98220 12345"
                    value={mobileInput}
                    onChange={(e) => setMobileInput(e.target.value.replace(/\D/g, ''))}
                    className="w-full px-3 py-2.5 text-sm text-stone-900 focus:outline-hidden font-mono tracking-wider"
                  />
                </div>
              </div>

              {/* Demo Mode Quick Buttons - ONLY FOR ADMIN */}
              {isAdmin && demoMode && (
                <div className="bg-stone-50 border border-stone-200 rounded-lg p-3 space-y-2 text-xs">
                  <span className="font-semibold text-stone-700 block">
                    Admin Whitelisted Numbers:
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {DEMO_WHITELISTED_NUMBERS.map((num) => (
                      <button
                        key={num}
                        onClick={() => handleQuickDemoNumber(num)}
                        className="px-2.5 py-1 bg-white border border-stone-300 hover:border-stone-500 rounded text-stone-800 font-mono text-[11px] transition-colors cursor-pointer"
                      >
                        +91 {num}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <button
                disabled={mobileInput.length !== 10 || isSendingOtp}
                onClick={() => handleSendOtp()}
                className="w-full py-2.5 px-4 bg-stone-900 text-amber-100 hover:bg-stone-800 disabled:bg-stone-200 disabled:text-stone-400 font-semibold text-xs rounded-lg transition-colors flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
              >
                <span>{isSendingOtp ? 'Sending Code...' : 'Send Verification OTP'}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* STEP 2: ENTER OTP */}
          {step === 'otp' && (
            <div className="space-y-4">
              <div className="space-y-1">
                <h4 className="font-bold text-stone-900 text-sm">
                  Enter 4-Digit Verification Code
                </h4>
                <p className="text-xs text-stone-600">
                  Verification code sent to <strong>+91 {mobileInput}</strong>.
                </p>
              </div>

              {/* In-app OTP Preview for effortless testing */}
              <div className="p-3 bg-stone-100 border border-stone-200 rounded-lg flex items-center justify-between text-xs text-stone-800">
                <span>Verification OTP Code:</span>
                <span className="font-mono font-bold text-sm bg-white px-2 py-0.5 rounded border border-stone-300 tracking-widest text-stone-900">
                  {expectedOtp}
                </span>
                <button
                  onClick={() => setOtpInput(expectedOtp)}
                  className="text-[11px] text-amber-800 underline font-semibold hover:text-amber-900 cursor-pointer"
                >
                  Auto-fill
                </button>
              </div>

              <div>
                <input
                  type="text"
                  maxLength={4}
                  placeholder="• • • •"
                  value={otpInput}
                  onChange={(e) => {
                    setOtpInput(e.target.value.replace(/\D/g, ''));
                    setOtpError('');
                  }}
                  className="w-full px-4 py-2.5 text-center text-lg tracking-widest font-mono border border-stone-300 rounded-lg focus:border-stone-900 focus:outline-hidden"
                />
                {otpError && (
                  <p className="text-xs text-red-600 mt-1.5 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>{otpError}</span>
                  </p>
                )}
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => setStep('phone')}
                  className="py-2.5 px-3 border border-stone-300 text-stone-700 hover:bg-stone-50 font-medium text-xs rounded-lg transition-colors cursor-pointer"
                >
                  Change Number
                </button>
                <button
                  disabled={isVerifying}
                  onClick={handleVerifyOtp}
                  className="flex-1 py-2.5 px-4 bg-stone-900 text-amber-100 hover:bg-stone-800 font-semibold text-xs rounded-lg transition-colors flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>{isVerifying ? 'Verifying with Server...' : 'Verify & Check License'}</span>
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: CONSUMED / AMENDMENT LICENSE REQUIRED */}
          {step === 'consumed' && (
            <div className="space-y-4">
              <div className="p-4 bg-amber-50 border border-amber-300 rounded-xl space-y-2.5 text-xs text-amber-950">
                <div className="flex items-center gap-2 font-bold text-stone-900 text-sm">
                  <FileEdit className="w-4 h-4 text-amber-700 shrink-0" />
                  <span>Will Finalized: Amendment License Required</span>
                </div>
                <p className="leading-relaxed text-stone-700">
                  Mobile number <strong>+91 {mobileInput}</strong> has already executed and finalized a legal Will.
                </p>
                <p className="text-stone-600 leading-relaxed">
                  Under <strong>Indian Succession Act 1925 (Sections 62 & 70)</strong>, any modifications to an executed Will require drafting a statutory Codicil or formal revocation.
                </p>
                <div className="bg-white p-2.5 rounded-lg border border-amber-200 text-stone-800 font-medium">
                  To amend your Will, add new properties/heirs, or re-download an updated clean version, please unlock an <strong>Amendment License (₹999)</strong>.
                </div>
              </div>

              <div className="space-y-2 pt-1">
                {onRequestPayment && (
                  <button
                    onClick={() => {
                      onClose();
                      onRequestPayment('amendment');
                    }}
                    className="w-full py-2.5 px-4 bg-stone-900 hover:bg-stone-800 text-amber-100 font-bold text-xs rounded-lg transition-colors flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
                  >
                    <Zap className="w-3.5 h-3.5 text-amber-300" />
                    <span>Purchase Amendment License (₹999)</span>
                  </button>
                )}

                <button
                  onClick={() => {
                    setMobileInput('');
                    setStep('phone');
                  }}
                  className="w-full py-2 px-3 border border-stone-300 hover:bg-stone-50 text-stone-700 font-medium text-xs rounded-lg cursor-pointer"
                >
                  Check Another Mobile Number
                </button>
              </div>
            </div>
          )}

          {/* STEP 4: UNPAID / FRIEND LINK SHARING ATTEMPT DETECTED */}
          {step === 'unpaid' && (
            <div className="space-y-4">
              <div className="p-4 bg-stone-50 border border-stone-300 rounded-xl space-y-2.5 text-xs text-stone-800">
                <div className="flex items-center gap-2 font-bold text-stone-950 text-sm">
                  <Lock className="w-4 h-4 text-amber-700 shrink-0" />
                  <span>License Required for +91 {mobileInput}</span>
                </div>
                <p className="leading-relaxed text-stone-600">
                  No active paid license was found on the server for this mobile number.
                </p>
                <div className="p-2.5 bg-amber-50 rounded-lg border border-amber-200 text-amber-950 text-[11px] leading-relaxed">
                  <strong>Notice:</strong> If a friend shared this assistant link with you, their license is locked to their personal estate. Each individual testator requires their own legal Will license (₹1,999) to unlock watermark-free PDF exports.
                </div>
              </div>

              <div className="space-y-2 pt-1">
                {onRequestPayment && (
                  <button
                    onClick={() => {
                      onClose();
                      onRequestPayment('standard');
                    }}
                    className="w-full py-2.5 px-4 bg-stone-900 hover:bg-stone-800 text-amber-100 font-bold text-xs rounded-lg transition-colors flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
                  >
                    <Zap className="w-3.5 h-3.5 text-amber-300" />
                    <span>Unlock Legal Will License (₹1,999)</span>
                  </button>
                )}

                <button
                  onClick={() => {
                    setMobileInput('');
                    setStep('phone');
                  }}
                  className="w-full py-2 px-3 border border-stone-300 hover:bg-stone-50 text-stone-700 font-medium text-xs rounded-lg cursor-pointer"
                >
                  Enter Different Mobile Number
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer Admin Bar - ONLY FOR ADMIN */}
        {isAdmin && (
          <div className="px-6 py-2.5 bg-stone-100 border-t border-stone-200 flex items-center justify-between text-[11px] text-stone-500">
            <span>Admin Controls Active</span>
            <button
              onClick={handleClearHistory}
              title="Clear all stored mobile records"
              className="text-stone-500 hover:text-stone-900 flex items-center gap-1 transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset Records</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
