import React, { useState, useEffect, useRef } from 'react';
import {
  CheckCircle2,
  CreditCard,
  ArrowRight,
  Key,
  AlertCircle,
  Phone,
  Mail,
  MapPin,
  User,
  Shield,
  Sparkles,
  ExternalLink,
} from 'lucide-react';
import { WealthCreationLogo } from './WealthCreationLogo';
import {
  submitRegistration,
  fetchPaymentConfig,
  TestatorRegistration,
  RegistrationResponse,
} from '../services/razorpayService';

const INDIAN_STATES = [
  'Andhra Pradesh',
  'Arunachal Pradesh',
  'Assam',
  'Bihar',
  'Chhattisgarh',
  'Goa',
  'Gujarat',
  'Haryana',
  'Himachal Pradesh',
  'Jharkhand',
  'Karnataka',
  'Kerala',
  'Madhya Pradesh',
  'Maharashtra',
  'Manipur',
  'Meghalaya',
  'Mizoram',
  'Nagaland',
  'Odisha',
  'Punjab',
  'Rajasthan',
  'Sikkim',
  'Tamil Nadu',
  'Telangana',
  'Tripura',
  'Uttar Pradesh',
  'Uttarakhand',
  'West Bengal',
  'Delhi (NCT)',
  'Jammu & Kashmir',
  'Ladakh',
  'Chandigarh',
  'Puducherry',
  'Goa, Daman & Diu',
];

interface RegistrationLandingPageProps {
  onEnterDrafter: (testatorData: {
    name: string;
    phone: string;
    email: string;
    city: string;
    state: string;
    licenseKey?: string;
    isPaid: boolean;
  }) => void;
  onOpenAdmin: () => void;
  onOpenPricingModal: (testatorInfo?: { name: string; phone: string; email: string }) => void;
  existingPhone?: string | null;
  existingName?: string;
}

// Normalizes URL to guarantee https:// protocol
export const normalizePaymentUrl = (url?: string | null): string => {
  if (!url) return '';
  let clean = url.trim();
  if (!clean.startsWith('http://') && !clean.startsWith('https://')) {
    clean = 'https://' + clean;
  }
  return clean;
};

// Verifies if custom external Razorpay page is valid
export const isValidExternalUrl = (url?: string | null): boolean => {
  if (!url) return false;
  const clean = normalizePaymentUrl(url);
  const lower = clean.toLowerCase();
  if (lower.includes('will-blueprint-now') || lower.includes('example.com')) return false;
  if (lower === 'https://pages.razorpay.com' || lower === 'https://pages.razorpay.com/') return false;
  try {
    const parsed = new URL(clean);
    return Boolean(parsed.hostname && parsed.hostname.includes('.'));
  } catch {
    return false;
  }
};

// Constructs destination URL with customer details pre-filled for Razorpay
export const buildDestinationUrl = (baseUrl: string, name: string, phone: string, email: string): string => {
  const norm = normalizePaymentUrl(baseUrl);
  try {
    const u = new URL(norm);
    if (name.trim()) u.searchParams.set('name', name.trim());
    if (phone.trim()) u.searchParams.set('phone', phone.trim());
    if (email.trim()) u.searchParams.set('email', email.trim());
    return u.toString();
  } catch {
    return norm;
  }
};

export const RegistrationLandingPage: React.FC<RegistrationLandingPageProps> = ({
  onEnterDrafter,
  onOpenAdmin,
  onOpenPricingModal,
  existingPhone = '',
  existingName = '',
}) => {
  // Sign up form fields
  const [fullName, setFullName] = useState(existingName || '');
  const [phone, setPhone] = useState(existingPhone || '');
  const [email, setEmail] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('Maharashtra');
  const [termsAgreed, setTermsAgreed] = useState(true);

  // Existing paid / license key lookup state
  const [existingClientInput, setExistingClientInput] = useState('');
  const [isVerifyingExisting, setIsVerifyingExisting] = useState(false);
  const [existingClientError, setExistingClientError] = useState<string | null>(null);

  // Submission & payment configuration state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [verificationResult, setVerificationResult] = useState<RegistrationResponse | null>(null);
  const [configuredPaymentUrl, setConfiguredPaymentUrl] = useState<string>('');
  const [externalPaymentUrl, setExternalPaymentUrl] = useState<string | null>(null);

  const redirectContainerRef = useRef<HTMLDivElement>(null);
  const cleanPhone = phone.replace(/\D/g, '').slice(-10);

  // Pre-load payment configuration from server on mount
  useEffect(() => {
    let isMounted = true;
    fetchPaymentConfig().then((cfg) => {
      if (isMounted && cfg && cfg.paymentPageUrl) {
        const clean = normalizePaymentUrl(cfg.paymentPageUrl);
        if (isValidExternalUrl(clean)) {
          setConfiguredPaymentUrl(clean);
        }
      }
    });
    return () => {
      isMounted = false;
    };
  }, []);

  // Multi-tier navigation execution to handle browser popups and iframes
  const executeRedirect = (destUrl: string): boolean => {
    // 1. Try standard window.open first (opens clean new tab)
    try {
      const win = window.open(destUrl, '_blank', 'noopener,noreferrer');
      if (win && !win.closed) {
        return true;
      }
    } catch (err) {
      console.warn('window.open blocked or restricted', err);
    }

    // 2. Try top-level navigation if app is running inside an iframe
    try {
      if (window.top && window.top !== window) {
        window.top.location.href = destUrl;
        return true;
      }
    } catch {
      // Cross-origin iframe sandbox blocks window.top access
    }

    // 3. Fallback: navigate current window
    try {
      window.location.assign(destUrl);
      return true;
    } catch {
      try {
        window.location.href = destUrl;
        return true;
      } catch (e) {
        console.warn('window.location failed', e);
      }
    }

    return false;
  };

  // Handle standard registration submission and payment redirection
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setExternalPaymentUrl(null);

    if (!fullName.trim()) {
      setErrorMsg('Please enter your full name.');
      return;
    }

    if (cleanPhone.length !== 10) {
      setErrorMsg('Please enter a valid 10-digit mobile number.');
      return;
    }

    if (!email.trim() || !email.includes('@')) {
      setErrorMsg('Please enter a valid email address.');
      return;
    }

    if (!city.trim()) {
      setErrorMsg('Please enter your city of residence.');
      return;
    }

    if (!termsAgreed) {
      setErrorMsg('Please confirm that you are aged 18 or above.');
      return;
    }

    // Synchronously prepare payment tab on user click to bypass popup blockers
    const activeUrl = configuredPaymentUrl;
    let preOpenedTab: Window | null = null;
    if (isValidExternalUrl(activeUrl)) {
      try {
        preOpenedTab = window.open('about:blank', '_blank');
      } catch {
        preOpenedTab = null;
      }
    }

    setIsSubmitting(true);
    try {
      const regData: TestatorRegistration = {
        name: fullName.trim(),
        phone: cleanPhone,
        email: email.trim(),
        city: city.trim(),
        state: state.trim(),
      };

      const result = await submitRegistration(regData);
      setIsSubmitting(false);

      if (!result.success) {
        if (preOpenedTab && !preOpenedTab.closed) preOpenedTab.close();
        setErrorMsg(result.error || 'Registration could not be completed. Please try again.');
        return;
      }

      setVerificationResult(result);

      // If user has already paid, close preopened tab and enter directly!
      if (result.isPaid) {
        if (preOpenedTab && !preOpenedTab.closed) preOpenedTab.close();
        setTimeout(() => {
          onEnterDrafter({
            name: fullName.trim(),
            phone: cleanPhone,
            email: email.trim(),
            city: city.trim(),
            state: state.trim(),
            licenseKey: result.licenseKey,
            isPaid: true,
          });
        }, 1000);
        return;
      }

      // Unpaid testator: redirect to configured Razorpay Payment Page URL
      const targetUrl = result.paymentPageUrl || configuredPaymentUrl;

      if (isValidExternalUrl(targetUrl)) {
        const destUrl = buildDestinationUrl(targetUrl, fullName, cleanPhone, email);
        setExternalPaymentUrl(destUrl);

        // If pre-opened tab exists and is alive, navigate it!
        if (preOpenedTab && !preOpenedTab.closed) {
          try {
            preOpenedTab.location.href = destUrl;
          } catch {
            executeRedirect(destUrl);
          }
        } else {
          executeRedirect(destUrl);
        }

        // Scroll prompt into view
        setTimeout(() => {
          redirectContainerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 100);
      } else {
        if (preOpenedTab && !preOpenedTab.closed) preOpenedTab.close();
        // Open built-in secure in-app Razorpay payment checkout modal
        onOpenPricingModal({
          name: fullName.trim(),
          phone: cleanPhone,
          email: email.trim(),
        });
      }
    } catch (err: any) {
      if (preOpenedTab && !preOpenedTab.closed) preOpenedTab.close();
      setIsSubmitting(false);
      setErrorMsg(err?.message || 'An error occurred during submission.');
    }
  };

  // Handle existing paid customer verification (by Mobile or License Key)
  const handleVerifyExistingClient = async (e: React.FormEvent) => {
    e.preventDefault();
    setExistingClientError(null);

    const inputVal = existingClientInput.trim();
    if (!inputVal) {
      setExistingClientError('Please enter your 10-digit mobile number or license key.');
      return;
    }

    const cleanInputPhone = inputVal.replace(/\D/g, '').slice(-10);
    const isPhone = cleanInputPhone.length === 10;
    const isKey = inputVal.toUpperCase().startsWith('LIC-') || inputVal.length > 8;

    setIsVerifyingExisting(true);
    try {
      const result = await submitRegistration({
        name: fullName.trim() || 'Valued Client',
        phone: isPhone ? cleanInputPhone : cleanPhone || '9999999999',
        email: email.trim() || '',
        city: city.trim() || '',
        state: state.trim() || 'Maharashtra',
        licenseKey: !isPhone || isKey ? inputVal.toUpperCase() : undefined,
      });

      setIsVerifyingExisting(false);

      if (result.isPaid) {
        onEnterDrafter({
          name: result.registration?.name || fullName.trim() || 'Testator',
          phone: result.registration?.phone || (isPhone ? cleanInputPhone : cleanPhone),
          email: result.registration?.email || email.trim() || '',
          city: result.registration?.city || city.trim() || '',
          state: result.registration?.state || state.trim() || '',
          licenseKey: result.licenseKey,
          isPaid: true,
        });
      } else {
        setExistingClientError(
          'No completed payment found for this number/key. Please complete registration above or check your mobile number.'
        );
      }
    } catch (err: any) {
      setIsVerifyingExisting(false);
      setExistingClientError('Verification failed. Please check your network and try again.');
    }
  };

  const handlePayNow = () => {
    const pageUrl = verificationResult?.paymentPageUrl || configuredPaymentUrl;
    if (isValidExternalUrl(pageUrl)) {
      const destUrl = buildDestinationUrl(pageUrl, fullName, cleanPhone, email);
      setExternalPaymentUrl(destUrl);
      executeRedirect(destUrl);
      return;
    }

    onOpenPricingModal({
      name: fullName.trim(),
      phone: cleanPhone,
      email: email.trim(),
    });
  };

  return (
    <div className="min-h-screen bg-[#0B0F17] text-stone-100 flex flex-col font-sans selection:bg-amber-500 selection:text-stone-900">
      {/* Background Subtle Ambient Glow */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[600px] h-[350px] bg-amber-600/10 blur-[130px] rounded-full" />
        <div className="absolute top-1/3 -right-40 w-[400px] h-[400px] bg-yellow-600/5 blur-[120px] rounded-full" />
      </div>

      {/* Top Header: Simple, Clean Brand Only */}
      <header className="relative z-10 border-b border-stone-800/80 bg-stone-950/60 backdrop-blur-md px-4 sm:px-8 py-3.5 flex items-center justify-center sm:justify-start">
        <WealthCreationLogo size={36} showText={true} />
      </header>

      {/* Main Content Area */}
      <main className="relative z-10 flex-1 flex flex-col justify-center px-4 sm:px-6 py-8 sm:py-12 max-w-xl mx-auto w-full">
        {/* Simple, Non-Legal Headline & Sub-Headline */}
        <div className="text-center mb-6 sm:mb-8">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs font-medium mb-3">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>Digital Will Drafting Assistant</span>
          </div>

          <h1 className="text-2xl sm:text-3xl md:text-4xl font-serif font-bold text-white tracking-tight leading-tight">
            Organize & Draft Your Will <br className="hidden sm:inline" />
            <span className="bg-gradient-to-r from-amber-200 via-amber-400 to-yellow-500 bg-clip-text text-transparent">
              in 15 Minutes
            </span>
          </h1>

          <p className="mt-3 text-xs sm:text-sm text-stone-300 leading-relaxed max-w-md mx-auto">
            A guided, easy-to-use assistant to catalog family assets, document your distribution
            wishes, and generate a clean, organized draft ready for your review.
          </p>
        </div>

        {/* Sign Up Form Card */}
        <div className="bg-stone-900/90 border border-amber-500/30 rounded-2xl p-6 sm:p-7 shadow-2xl backdrop-blur relative overflow-hidden">
          <div className="flex items-center justify-between border-b border-stone-800 pb-3 mb-5">
            <div>
              <h2 className="text-lg font-serif font-bold text-white">Sign Up to Begin</h2>
              <p className="text-xs text-stone-400 mt-0.5">
                Enter your details to access the drafting assistant
              </p>
            </div>
            <div className="px-2.5 py-1 rounded bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs font-medium">
              ₹1,999 One-Time
            </div>
          </div>

          {errorMsg && (
            <div className="mb-4 p-3 rounded-xl bg-red-950/60 border border-red-800/80 text-red-200 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Payment Verified State */}
          {verificationResult?.isPaid && (
            <div className="mb-5 p-4 rounded-xl bg-emerald-950/70 border border-emerald-600/80 text-emerald-100 animate-in fade-in duration-200">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                <div>
                  <h4 className="text-sm font-bold text-white">Payment Verified!</h4>
                  <p className="text-xs text-emerald-200 mt-0.5">
                    Access is unlocked for +91 {cleanPhone}. Entering assistant now...
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Payment Link & Instant Checkout Card */}
          {externalPaymentUrl && (
            <div
              ref={redirectContainerRef}
              className="mb-5 p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-amber-950/90 to-stone-950 border-2 border-amber-500 text-amber-100 shadow-2xl animate-in fade-in duration-200"
            >
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center shrink-0 mt-0.5">
                  <CreditCard className="w-4 h-4 text-amber-400" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                      Redirecting to Razorpay Checkout
                    </h4>
                    <span className="px-2 py-0.5 rounded bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-[10px] font-mono font-bold">
                      Lead Recorded
                    </span>
                  </div>
                  <p className="text-xs text-amber-200/90 mt-1 leading-relaxed">
                    Your registration for <strong>+91 {cleanPhone}</strong> is saved. If the payment page did not open in a new tab automatically, click the button below:
                  </p>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-amber-500/30 space-y-2">
                <a
                  href={externalPaymentUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl bg-gradient-to-r from-amber-400 via-amber-500 to-yellow-500 hover:from-amber-300 hover:to-yellow-400 text-stone-950 font-bold text-xs uppercase tracking-wider transition-all shadow-md text-center cursor-pointer animate-pulse"
                >
                  <CreditCard className="w-4 h-4 text-stone-950" />
                  <span>Proceed to Razorpay Payment Page (₹1,999) →</span>
                </a>

                <div className="flex items-center justify-between text-[11px] text-stone-400 pt-1 px-1">
                  <span>Official Razorpay Secure Checkout</span>
                  <button
                    type="button"
                    onClick={() => {
                      onOpenPricingModal({
                        name: fullName.trim(),
                        phone: cleanPhone,
                        email: email.trim(),
                      });
                    }}
                    className="text-amber-400 hover:text-amber-300 underline cursor-pointer"
                  >
                    Or open in-app popup checkout
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Unpaid Notice & Instant Payment Button (when no external link configured) */}
          {verificationResult && !verificationResult.isPaid && !externalPaymentUrl && (
            <div className="mb-5 p-4 rounded-xl bg-amber-950/60 border border-amber-600/70 text-amber-100 animate-in fade-in duration-200">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-xs font-bold text-white">Registration Details Saved</h4>
                  <p className="text-xs text-amber-200/90 mt-1 leading-relaxed">
                    Complete your payment of ₹1,999 to start drafting your Will draft immediately.
                  </p>
                </div>
              </div>

              <div className="mt-3.5 pt-3 border-t border-amber-800/60">
                <button
                  type="button"
                  onClick={handlePayNow}
                  className="w-full flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-400 via-amber-500 to-yellow-500 hover:from-amber-300 hover:to-yellow-400 text-stone-950 font-bold text-xs uppercase tracking-wider transition-all shadow-md cursor-pointer"
                >
                  <CreditCard className="w-4 h-4 text-stone-900" />
                  <span>Buy The Will Blueprint Now (₹1,999)</span>
                </button>
              </div>
            </div>
          )}

          {/* The Sign Up Form */}
          <form onSubmit={handleRegister} className="space-y-3.5">
            {/* Full Name */}
            <div>
              <label className="block text-xs font-semibold text-stone-200 mb-1 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-amber-400" />
                <span>Full Name</span>
                <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="e.g., Rajesh Sharma"
                className="w-full px-3.5 py-2.5 rounded-xl bg-stone-950 border border-stone-700/80 text-white placeholder-stone-500 text-sm focus:outline-none focus:border-amber-400 transition-all"
              />
            </div>

            {/* Mobile & Email */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Mobile Number */}
              <div>
                <label className="block text-xs font-semibold text-stone-200 mb-1 flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-amber-400" />
                  <span>10-Digit Mobile (+91)</span>
                  <span className="text-red-400">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-xs font-bold text-stone-400 select-none">
                    +91
                  </span>
                  <input
                    type="tel"
                    required
                    maxLength={10}
                    value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                    placeholder="9876543210"
                    className="w-full pl-12 pr-3.5 py-2.5 rounded-xl bg-stone-950 border border-stone-700/80 text-white placeholder-stone-500 text-sm font-mono focus:outline-none focus:border-amber-400 transition-all"
                  />
                </div>
              </div>

              {/* Email Address */}
              <div>
                <label className="block text-xs font-semibold text-stone-200 mb-1 flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-amber-400" />
                  <span>Email Address</span>
                  <span className="text-red-400">*</span>
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="rajesh@example.com"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-stone-950 border border-stone-700/80 text-white placeholder-stone-500 text-sm focus:outline-none focus:border-amber-400 transition-all"
                />
              </div>
            </div>

            {/* City & State */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* City */}
              <div>
                <label className="block text-xs font-semibold text-stone-200 mb-1 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-amber-400" />
                  <span>City</span>
                  <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="e.g., Mumbai"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-stone-950 border border-stone-700/80 text-white placeholder-stone-500 text-sm focus:outline-none focus:border-amber-400 transition-all"
                />
              </div>

              {/* State */}
              <div>
                <label className="block text-xs font-semibold text-stone-200 mb-1 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-amber-400" />
                  <span>State / UT</span>
                  <span className="text-red-400">*</span>
                </label>
                <select
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-stone-950 border border-stone-700/80 text-white text-sm focus:outline-none focus:border-amber-400 transition-all"
                >
                  {INDIAN_STATES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Simple Confirmation Checkbox */}
            <div className="pt-1">
              <label className="flex items-start gap-2.5 cursor-pointer text-xs text-stone-300 leading-snug">
                <input
                  type="checkbox"
                  checked={termsAgreed}
                  onChange={(e) => setTermsAgreed(e.target.checked)}
                  className="w-4 h-4 rounded border-stone-700 bg-stone-950 text-amber-500 focus:ring-amber-400 mt-0.5 shrink-0"
                />
                <span>
                  I confirm that I am aged 18 or above and drafting this personal document of my own free will.
                </span>
              </label>
            </div>

            {/* Primary Submit / Payment CTA Button */}
            {externalPaymentUrl ? (
              <a
                href={externalPaymentUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full mt-3 flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-gradient-to-r from-amber-400 via-amber-500 to-yellow-500 hover:from-amber-300 hover:to-yellow-400 text-stone-950 font-bold text-xs uppercase tracking-wider transition-all shadow-lg hover:shadow-amber-500/20 text-center cursor-pointer animate-pulse"
              >
                <CreditCard className="w-4 h-4 text-stone-950" />
                <span>Proceed to Razorpay Payment Page (₹1,999) →</span>
              </a>
            ) : (
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full mt-3 flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-gradient-to-r from-amber-400 via-amber-500 to-yellow-500 hover:from-amber-300 hover:to-yellow-400 text-stone-950 font-bold text-xs uppercase tracking-wider transition-all shadow-md hover:shadow-amber-500/20 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-stone-900 border-t-transparent rounded-full animate-spin" />
                    <span>Redirecting to Razorpay...</span>
                  </>
                ) : (
                  <>
                    <span>Buy The Will Blueprint Now</span>
                    <ArrowRight className="w-4 h-4 text-stone-950" />
                  </>
                )}
              </button>
            )}

            {/* Direct Link Option when configured */}
            {configuredPaymentUrl && !externalPaymentUrl && (
              <div className="pt-2 text-center">
                <a
                  href={buildDestinationUrl(configuredPaymentUrl, fullName, cleanPhone, email)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-[11px] text-amber-300/80 hover:text-amber-200 hover:underline transition-colors cursor-pointer"
                >
                  <ExternalLink className="w-3 h-3 text-amber-400" />
                  <span>Or open dedicated Razorpay Payment Page directly ↗</span>
                </a>
              </div>
            )}
          </form>
        </div>

        {/* Dedicated Section for Existing Paid / License Key Clients */}
        <div className="mt-6 bg-stone-900/60 border border-stone-800 rounded-2xl p-5 backdrop-blur text-center">
          <div className="flex items-center justify-center gap-2 text-amber-300 text-xs font-semibold mb-1">
            <Key className="w-4 h-4 text-amber-400" />
            <span>Already Paid or Have a License Key?</span>
          </div>
          <p className="text-[11px] text-stone-400 max-w-sm mx-auto mb-3">
            If you already completed payment on our Razorpay page or received an access key, verify below to enter directly without paying again:
          </p>

          <form onSubmit={handleVerifyExistingClient} className="max-w-md mx-auto space-y-2">
            <div className="flex gap-2">
              <input
                type="text"
                value={existingClientInput}
                onChange={(e) => setExistingClientInput(e.target.value)}
                placeholder="Enter 10-digit mobile or License Key"
                className="flex-1 px-3 py-2 rounded-lg bg-stone-950 border border-stone-700 text-white placeholder-stone-500 text-xs font-mono focus:outline-none focus:border-amber-400"
              />
              <button
                type="submit"
                disabled={isVerifyingExisting}
                className="px-4 py-2 rounded-lg bg-stone-800 hover:bg-stone-700 text-amber-200 border border-amber-500/30 text-xs font-semibold transition-all shrink-0 cursor-pointer disabled:opacity-50"
              >
                {isVerifyingExisting ? 'Verifying...' : 'Enter Directly'}
              </button>
            </div>

            {existingClientError && (
              <p className="text-[11px] text-amber-300 text-left pt-1">
                {existingClientError}
              </p>
            )}
          </form>
        </div>
      </main>

      {/* Footer: Non-Consultant Disclaimer */}
      <footer className="relative z-10 border-t border-stone-900 bg-stone-950 px-4 sm:px-8 py-6 text-center text-xs text-stone-500">
        <div className="max-w-2xl mx-auto space-y-2">
          <p className="text-[11px] text-stone-400 leading-relaxed">
            <strong>Disclaimer:</strong> Wealth Creation Matrix provides an automated self-help drafting tool for personal organization. We are not a law firm, not legal consultants, and do not provide legal advice or statutory legal certifications. If legal consultation is required, please consult an independent advocate.
          </p>
          <div className="flex items-center justify-center gap-4 text-[10px] text-stone-600 pt-2">
            <span>© {new Date().getFullYear()} Wealth Creation Matrix</span>
            <span>•</span>
            <button
              onClick={onOpenAdmin}
              className="text-stone-600 hover:text-stone-400 transition-colors"
            >
              Admin Access
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
};
