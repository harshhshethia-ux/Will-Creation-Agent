import React, { useState, useEffect } from 'react';
import {
  X,
  ShieldCheck,
  CheckCircle2,
  Lock,
  CreditCard,
  Zap,
  Sparkles,
  AlertCircle,
  Settings,
  Key,
  Check,
  Globe,
  ArrowRight,
  FileEdit,
  RefreshCw,
} from 'lucide-react';
import {
  PricingPlan,
  PRICING_PLANS,
  PaymentRecord,
  initiateRazorpayPayment,
  getRazorpayKeyId,
  setCustomRazorpayKeyId,
  verifyServerClaim,
} from '../services/razorpayService';

interface RazorpayModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPaymentSuccess: (record: PaymentRecord) => void;
  defaultPlanId?: 'standard' | 'amendment';
  testatorName?: string;
  defaultPhone?: string;
  isAdmin?: boolean;
  isAmendmentMode?: boolean;
}

export const RazorpayModal: React.FC<RazorpayModalProps> = ({
  isOpen,
  onClose,
  onPaymentSuccess,
  defaultPlanId = 'standard',
  testatorName = '',
  defaultPhone = '',
  isAdmin = false,
  isAmendmentMode = false,
}) => {
  // Top-level unconditional state hooks (strictly adheres to React Rules of Hooks)
  const [activeTab, setActiveTab] = useState<'pay' | 'claim'>('pay');
  const [selectedPlanId, setSelectedPlanId] = useState<'standard' | 'amendment'>(
    isAmendmentMode ? 'amendment' : defaultPlanId
  );
  const [fullName, setFullName] = useState(testatorName || '');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState(defaultPhone || '');
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Claim tab state
  const [claimInput, setClaimInput] = useState('');
  const [isCheckingClaim, setIsCheckingClaim] = useState(false);
  const [claimSuccessMsg, setClaimSuccessMsg] = useState<string | null>(null);

  // Gateway key configuration state
  const [activeKey, setActiveKey] = useState<string>(() => getRazorpayKeyId());
  const [showKeyConfig, setShowKeyConfig] = useState(false);
  const [inputKey, setInputKey] = useState(() => getRazorpayKeyId());
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Synchronize testator name & phone when modal opens or props change
  useEffect(() => {
    if (isOpen) {
      if (!fullName && testatorName) setFullName(testatorName);
      if (!phone && defaultPhone) setPhone(defaultPhone);
      if (!claimInput && defaultPhone) setClaimInput(defaultPhone);
      if (isAmendmentMode) setSelectedPlanId('amendment');
      setErrorMsg(null);
      setClaimSuccessMsg(null);
      setActiveKey(getRazorpayKeyId());
    }
  }, [isOpen, testatorName, defaultPhone, isAmendmentMode]);

  // Early return ONLY after all hooks have been declared
  if (!isOpen) return null;

  const selectedPlan = PRICING_PLANS.find((p) => p.id === selectedPlanId) || PRICING_PLANS[0];

  const handleSaveKey = () => {
    setCustomRazorpayKeyId(inputKey.trim());
    const updated = getRazorpayKeyId();
    setActiveKey(updated);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  const handleClearKey = () => {
    setCustomRazorpayKeyId('');
    setInputKey('');
    const updated = getRazorpayKeyId();
    setActiveKey(updated);
  };

  const handleSubmitPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const cleanPhone = phone.replace(/\D/g, '').slice(-10);
    if (cleanPhone.length !== 10) {
      setErrorMsg('Please enter a valid 10-digit Indian mobile number.');
      return;
    }

    if (!email || !email.includes('@')) {
      setErrorMsg('Please enter a valid email address for receiving your receipt & digital license.');
      return;
    }

    if (!fullName.trim()) {
      setErrorMsg('Please enter your full legal name.');
      return;
    }

    setIsProcessing(true);

    try {
      await initiateRazorpayPayment({
        plan: selectedPlan,
        customerName: fullName.trim(),
        customerEmail: email.trim(),
        customerPhone: cleanPhone,
        onSuccess: (record) => {
          setIsProcessing(false);
          onPaymentSuccess(record);
        },
        onFailure: (err) => {
          setIsProcessing(false);
          setErrorMsg(
            err?.description || err?.message || 'Payment could not be completed. Please try again.'
          );
        },
      });
    } catch (err: any) {
      setIsProcessing(false);
      setErrorMsg(err?.message || 'Failed to initialize payment gateway.');
    }
  };

  const handleClaimSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setClaimSuccessMsg(null);

    if (!claimInput.trim()) {
      setErrorMsg('Please enter your mobile number or License Key (starts with LIC-).');
      return;
    }

    setIsCheckingClaim(true);
    try {
      const result = await verifyServerClaim(claimInput);
      setIsCheckingClaim(false);

      if (result.success) {
        setClaimSuccessMsg(result.message);
        const cleanPhone = claimInput.replace(/\D/g, '').slice(-10) || '9999999999';
        const simulatedRecord: PaymentRecord = {
          orderId: `order_claimed_${Date.now()}`,
          paymentId: result.licenseKey || `pay_claimed_${Date.now()}`,
          amount: result.planId === 'amendment' ? 999 : 1999,
          currency: 'INR',
          customerPhone: cleanPhone,
          customerEmail: 'verified@customer.direct',
          customerName: fullName || 'Verified License Holder',
          planId: result.planId || 'standard',
          paidAt: Date.now(),
          licenseKey: result.licenseKey,
        };

        setTimeout(() => {
          onPaymentSuccess(simulatedRecord);
        }, 800);
      } else {
        setErrorMsg(result.message);
      }
    } catch (err: any) {
      setIsCheckingClaim(false);
      setErrorMsg(err?.message || 'Failed to connect to license verification server.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-stone-900/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <div className="bg-stone-50 rounded-2xl shadow-2xl max-w-2xl w-full flex flex-col border border-stone-300 overflow-hidden animate-in fade-in zoom-in-95 duration-200 my-auto">
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-stone-900 via-stone-800 to-amber-950 text-white flex items-center justify-between border-b border-amber-900/30">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-full bg-amber-400/20 border border-amber-300/40 flex items-center justify-center text-amber-300">
              {isAmendmentMode ? <FileEdit className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
            </div>
            <div>
              <h2 className="text-base font-serif font-bold text-amber-100 flex items-center gap-2">
                {isAmendmentMode ? 'Unlock Will Amendment / Codicil' : 'Unlock Complete Legal Will'}
                <span className="text-[10px] font-mono uppercase bg-amber-400 text-stone-950 font-bold px-1.5 py-0.5 rounded">
                  ₹{selectedPlan.price}
                </span>
              </h2>
              <p className="text-xs text-stone-300">
                Indian Succession Act 1925 Compliant • Clean Watermark-Free PDF Execution
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-stone-400 hover:text-white transition-colors p-1.5 rounded-lg hover:bg-stone-800 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation: Pay Online vs Claim Landing Page License */}
        <div className="flex border-b border-stone-200 bg-stone-100/90 text-xs font-semibold">
          <button
            type="button"
            onClick={() => {
              setActiveTab('pay');
              setErrorMsg(null);
            }}
            className={`flex-1 py-3 px-4 flex items-center justify-center gap-2 border-b-2 transition-colors cursor-pointer ${
              activeTab === 'pay'
                ? 'border-amber-600 bg-white text-stone-900 shadow-2xs'
                : 'border-transparent text-stone-600 hover:text-stone-900'
            }`}
          >
            <CreditCard className="w-4 h-4 text-amber-600" />
            <span>Pay & Activate License</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('claim');
              setErrorMsg(null);
            }}
            className={`flex-1 py-3 px-4 flex items-center justify-center gap-2 border-b-2 transition-colors cursor-pointer ${
              activeTab === 'claim'
                ? 'border-amber-600 bg-white text-stone-900 shadow-2xs'
                : 'border-transparent text-stone-600 hover:text-stone-900'
            }`}
          >
            <Globe className="w-4 h-4 text-amber-600" />
            <span>Enter License Key / Mobile</span>
          </button>
        </div>

        {/* Anti-Sharing Warning Notice */}
        <div className="bg-amber-50/80 border-b border-amber-200/70 px-4 py-2 text-[11px] text-amber-950 flex items-center gap-2">
          <ShieldCheck className="w-3.5 h-3.5 text-amber-700 shrink-0" />
          <span>
            <strong>Single-User License Protection:</strong> 1 purchase authorizes 1 finalized legal Will for your verified mobile number. Link sharing does not grant free access.
          </span>
        </div>

        <div className="p-6 space-y-5 overflow-y-auto max-h-[75vh]">
          {activeTab === 'pay' ? (
            /* ================= TAB 1: PAY ONLINE ================= */
            <form onSubmit={handleSubmitPayment} className="space-y-4">
              {/* Plan Switcher */}
              <div className="grid grid-cols-2 gap-3">
                {PRICING_PLANS.map((plan) => {
                  const isSelected = selectedPlanId === plan.id;
                  return (
                    <div
                      key={plan.id}
                      onClick={() => setSelectedPlanId(plan.id)}
                      className={`relative p-3.5 rounded-xl border-2 transition-all cursor-pointer flex flex-col justify-between ${
                        isSelected
                          ? 'border-amber-600 bg-amber-50/40 shadow-xs ring-1 ring-amber-600/20'
                          : 'border-stone-200 bg-white hover:border-stone-300'
                      }`}
                    >
                      {plan.popular && (
                        <span className="absolute -top-2.5 right-3 bg-amber-600 text-white text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full shadow-2xs">
                          Recommended
                        </span>
                      )}
                      <div>
                        <h4 className="text-xs font-bold text-stone-900">{plan.name}</h4>
                        <div className="flex items-baseline gap-1.5 mt-1">
                          <span className="text-base font-extrabold text-stone-950">₹{plan.price}</span>
                          <span className="text-xs text-stone-400 line-through">₹{plan.originalPrice}</span>
                        </div>
                        <p className="text-[11px] text-stone-500 mt-1 line-clamp-2">{plan.description}</p>
                      </div>
                      <div className="mt-2.5 pt-2 border-t border-stone-100 flex items-center justify-between text-[11px] font-medium">
                        <span className={isSelected ? 'text-amber-800' : 'text-stone-400'}>
                          {isSelected ? 'Selected' : 'Select Plan'}
                        </span>
                        {isSelected && <Check className="w-3.5 h-3.5 text-amber-700" />}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Form Inputs */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    Full Legal Name (as on Will)
                  </label>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="e.g. Rajesh Kumar Sharma"
                    className="w-full text-xs px-3 py-2 border border-stone-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-stone-900 bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    Email Address (for License receipt)
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@example.com"
                    className="w-full text-xs px-3 py-2 border border-stone-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-stone-900 bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  10-Digit Mobile Number (License will be bound to this number)
                </label>
                <div className="flex">
                  <span className="inline-flex items-center px-2.5 rounded-l-lg border border-r-0 border-stone-300 bg-stone-100 text-stone-600 text-xs font-medium">
                    +91
                  </span>
                  <input
                    type="tel"
                    required
                    maxLength={10}
                    value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                    placeholder="9876543210"
                    className="w-full text-xs px-3 py-2 border border-stone-300 rounded-r-lg focus:outline-none focus:ring-1 focus:ring-stone-900 bg-white font-mono"
                  />
                </div>
              </div>

              {/* Inclusions summary */}
              <div className="bg-stone-100/80 p-3.5 rounded-xl border border-stone-200 text-xs space-y-1.5">
                <span className="font-semibold text-stone-800 block text-[11px] uppercase tracking-wider">
                  License Inclusions:
                </span>
                <ul className="grid grid-cols-1 sm:grid-cols-2 gap-1 text-stone-600">
                  {selectedPlan.features.map((f, i) => (
                    <li key={i} className="flex items-center gap-1.5 text-[11px]">
                      <CheckCircle2 className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {errorMsg && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* Submit CTA */}
              <button
                type="submit"
                disabled={isProcessing}
                className="w-full py-3 px-4 bg-gradient-to-r from-stone-900 via-stone-800 to-amber-950 text-amber-200 font-bold rounded-xl shadow-md hover:from-black hover:to-amber-900 transition-all flex items-center justify-center gap-2 text-sm disabled:opacity-60 cursor-pointer"
              >
                {isProcessing ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin text-amber-300" />
                    <span>Connecting to Razorpay Gateway...</span>
                  </>
                ) : (
                  <>
                    <Zap className="w-4 h-4 text-amber-300" />
                    <span>Pay ₹{selectedPlan.price} & Activate 1 Execution License</span>
                  </>
                )}
              </button>

              <div className="flex items-center justify-between text-[11px] text-stone-400 pt-1">
                <span className="flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  256-Bit SSL Encrypted Razorpay Gateway
                </span>
                <button
                  type="button"
                  onClick={() => setShowKeyConfig(!showKeyConfig)}
                  className="text-stone-500 hover:text-stone-800 underline flex items-center gap-1 cursor-pointer"
                >
                  <Settings className="w-3 h-3" />
                  <span>{showKeyConfig ? 'Hide Gateway Key' : 'Configure Razorpay Key ID'}</span>
                </button>
              </div>
            </form>
          ) : (
            /* ================= TAB 2: CLAIM / REDEEM LICENSE ================= */
            <form onSubmit={handleClaimSubmit} className="space-y-4">
              <div className="bg-stone-100 p-4 rounded-xl border border-stone-200 space-y-2">
                <h3 className="text-xs font-bold text-stone-800 uppercase tracking-wider flex items-center gap-1.5">
                  <Globe className="w-3.5 h-3.5 text-amber-700" />
                  Paid on Landing Page or Received a License Key?
                </h3>
                <p className="text-xs text-stone-600 leading-relaxed">
                  If you purchased on the landing page (or via direct UPI/payment link), enter your <strong>10-digit mobile number</strong> or your personal <strong>License Key</strong> (e.g. <span className="font-mono text-stone-800 font-bold">LIC-WCM-XXXX-YYYY</span>).
                </p>
                <div className="text-[11px] text-stone-500 bg-white p-2.5 rounded-lg border border-stone-200">
                  ⚠️ <strong>Notice:</strong> Forwarded links from friends will not grant free access. The server validates that your mobile has an active, unconsumed license credit.
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Enter License Key or 10-Digit Mobile Number
                </label>
                <input
                  type="text"
                  required
                  value={claimInput}
                  onChange={(e) => setClaimInput(e.target.value)}
                  placeholder="e.g. LIC-WCM-8F2A-99B1 or 9876543210"
                  className="w-full text-xs px-3.5 py-2.5 border border-stone-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-stone-900 bg-white font-mono text-stone-800"
                />
              </div>

              {errorMsg && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {claimSuccessMsg && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-800 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{claimSuccessMsg}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={isCheckingClaim}
                className="w-full py-2.5 px-4 bg-stone-900 hover:bg-stone-800 text-amber-100 font-semibold rounded-xl text-xs flex items-center justify-center gap-2 cursor-pointer transition-colors shadow-xs"
              >
                {isCheckingClaim ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin text-amber-300" />
                    <span>Verifying with Server Database...</span>
                  </>
                ) : (
                  <>
                    <span>Verify & Unlock My Will</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            </form>
          )}

          {/* Optional Gateway Key Configuration Subpanel */}
          {showKeyConfig && (
            <div className="p-4 bg-amber-50/70 border border-amber-300/80 rounded-xl space-y-3 animate-in fade-in duration-200">
              <div className="flex items-center gap-1.5 text-xs font-bold text-stone-900">
                <Key className="w-3.5 h-3.5 text-amber-700" />
                <span>Live / Test Razorpay Public Key ID</span>
              </div>
              <p className="text-[11px] text-stone-600 leading-relaxed">
                Enter your Razorpay Key ID from the Razorpay Dashboard (starts with <code className="bg-amber-100 px-1 py-0.5 rounded font-mono">rzp_test_</code> or <code className="bg-amber-100 px-1 py-0.5 rounded font-mono">rzp_live_</code>).
              </p>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={inputKey}
                  onChange={(e) => setInputKey(e.target.value)}
                  placeholder="rzp_test_xxxxxxxxxx"
                  className="flex-1 text-xs px-3 py-1.5 border border-amber-300 rounded-lg bg-white font-mono"
                />
                <button
                  type="button"
                  onClick={handleSaveKey}
                  className="px-3 py-1.5 bg-stone-900 hover:bg-stone-800 text-amber-100 text-xs font-semibold rounded-lg cursor-pointer"
                >
                  Save Key
                </button>
                {inputKey && (
                  <button
                    type="button"
                    onClick={handleClearKey}
                    className="px-2.5 py-1.5 border border-stone-300 hover:bg-white text-stone-600 text-xs rounded-lg cursor-pointer"
                  >
                    Reset
                  </button>
                )}
              </div>
              {saveSuccess && (
                <p className="text-[11px] text-emerald-700 font-semibold flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                  Key successfully saved!
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
