import React, { useState, useEffect } from 'react';
import {
  Lock,
  CheckCircle2,
  AlertCircle,
  X,
  Copy,
  Check,
  Globe,
  UserCheck,
  ExternalLink,
  ShieldAlert,
  Send,
  Activity,
  Zap,
  RefreshCw,
  FileEdit,
  FileCheck,
  Sliders,
  GraduationCap,
  Link,
  Filter,
  Table,
  Download,
  Users,
} from 'lucide-react';
import { verifyAdminPin, ADMIN_MASTER_PIN } from '../services/verificationService';
import {
  grantManualCustomerLicense,
  fetchAdminLicenses,
  fetchServerSettings,
  updateServerSettings,
  fetchAllRegistrations,
} from '../services/razorpayService';

interface AdminPinModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  isAdmin?: boolean;
}

export const AdminPinModal: React.FC<AdminPinModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  isAdmin = false,
}) => {
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<'grant' | 'ledger' | 'settings' | 'sheets'>('grant');

  // Manual Grant State
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [planType, setPlanType] = useState<'standard' | 'amendment'>('standard');
  const [paymentNotes, setPaymentNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [issuedLicense, setIssuedLicense] = useState<{
    licenseKey: string;
    shareableUrl: string;
    phone: string;
    name: string;
  } | null>(null);

  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedMsg, setCopiedMsg] = useState(false);
  const [copiedSheetFormula, setCopiedSheetFormula] = useState(false);

  // Ledger state
  const [ledgerData, setLedgerData] = useState<{
    licenses: any[];
    webhookLogs: any[];
    settings?: any;
    totalCount: number;
    activeCount: number;
    consumedCount: number;
  } | null>(null);
  const [isLoadingLedger, setIsLoadingLedger] = useState(false);

  // Registrations / Google Sheets state
  const [registrationsData, setRegistrationsData] = useState<{
    totalCount: number;
    paidCount: number;
    unpaidCount: number;
    registrations: any[];
  } | null>(null);

  // Settings State
  const [allowedPagesInput, setAllowedPagesInput] = useState('');
  const [filterKeywordsInput, setFilterKeywordsInput] = useState('will, succession, testament');
  const [customDomainInput, setCustomDomainInput] = useState('');
  const [razorpayPaymentPageUrlInput, setRazorpayPaymentPageUrlInput] = useState('');
  const [requireTrainingOrientation, setRequireTrainingOrientation] = useState(true);
  const [externalTrainingUrlInput, setExternalTrainingUrlInput] = useState('');
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [settingsSuccessMsg, setSettingsSuccessMsg] = useState('');

  useEffect(() => {
    if (isOpen && isAdmin) {
      loadLedgerAndSettings();
    }
  }, [isOpen, isAdmin, activeTab]);

  if (!isOpen) return null;

  const loadLedgerAndSettings = async () => {
    setIsLoadingLedger(true);
    const [data, regs] = await Promise.all([
      fetchAdminLicenses(ADMIN_MASTER_PIN),
      fetchAllRegistrations(),
    ]);
    setIsLoadingLedger(false);
    if (data && data.success) {
      setLedgerData(data);
      if (data.settings) {
        setAllowedPagesInput((data.settings.allowedRazorpayPageIds || []).join(', '));
        setFilterKeywordsInput((data.settings.filterKeywords || []).join(', '));
        setCustomDomainInput(data.settings.customDomainUrl || '');
        setRazorpayPaymentPageUrlInput(data.settings.razorpayPaymentPageUrl || '');
        setRequireTrainingOrientation(data.settings.requireTrainingOrientation !== false);
        setExternalTrainingUrlInput(data.settings.externalTrainingUrl || '');
      }
    }
    if (regs && regs.success) {
      setRegistrationsData(regs);
    }
  };

  const handleSubmitPin = (e: React.FormEvent) => {
    e.preventDefault();
    if (verifyAdminPin(pin)) {
      onSuccess();
      setError('');
    } else {
      setError('Incorrect administrator PIN code.');
    }
  };

  const handleGrantAccess = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIssuedLicense(null);

    const clean = customerPhone.replace(/\D/g, '').slice(-10);
    if (clean.length !== 10) {
      setError('Please enter a valid 10-digit Indian mobile number.');
      return;
    }

    setIsSubmitting(true);
    const res = await grantManualCustomerLicense({
      phone: clean,
      name: customerName.trim() || undefined,
      email: customerEmail.trim() || undefined,
      planId: planType,
      adminPin: ADMIN_MASTER_PIN,
    });
    setIsSubmitting(false);

    if (res.success && res.licenseKey) {
      const baseUrl = customDomainInput.trim()
        ? customDomainInput.trim().replace(/\/$/, '')
        : window.location.origin;
      const fullUrl = `${baseUrl}/?license=${res.licenseKey}`;

      setIssuedLicense({
        licenseKey: res.licenseKey,
        shareableUrl: fullUrl,
        phone: clean,
        name: customerName.trim() || 'Client',
      });
      loadLedgerAndSettings();
    } else {
      setError(res.error || 'Failed to grant license on server.');
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingSettings(true);
    setSettingsSuccessMsg('');

    const pageIdsArray = allowedPagesInput
      .split(/[\n,]+/)
      .map((s) => s.trim())
      .filter(Boolean);

    const keywordsArray = filterKeywordsInput
      .split(/[\n,]+/)
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean);

    const res = await updateServerSettings(
      {
        allowedRazorpayPageIds: pageIdsArray,
        filterKeywords: keywordsArray,
        customDomainUrl: customDomainInput.trim(),
        razorpayPaymentPageUrl: razorpayPaymentPageUrlInput.trim(),
        requireTrainingOrientation,
        externalTrainingUrl: externalTrainingUrlInput.trim(),
      },
      ADMIN_MASTER_PIN
    );

    setIsSavingSettings(false);
    if (res && res.success) {
      setSettingsSuccessMsg('Settings and Payment Page restrictions saved successfully!');
      setTimeout(() => setSettingsSuccessMsg(''), 4000);
      loadLedgerAndSettings();
    } else {
      setError(res?.error || 'Failed to update settings');
    }
  };

  const handleCopyLink = () => {
    if (!issuedLicense?.shareableUrl) return;
    navigator.clipboard.writeText(issuedLicense.shareableUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const getWhatsAppMessage = () => {
    if (!issuedLicense) return '';
    return (
      `Dear ${issuedLicense.name},\n\n` +
      `Your payment for the Wealth Creation Matrix Legal Will Drafting Assistant is confirmed! Here is your private single-user access link:\n\n` +
      `${issuedLicense.shareableUrl}\n\n` +
      `📌 License Key: ${issuedLicense.licenseKey}\n` +
      `🔒 Anti-Sharing Security: Access is strictly bound to your verified mobile (+91 ${issuedLicense.phone}). Forwarding this link to others will not grant free access.\n\n` +
      `Before drafting, please complete the short Legal Orientation Checklist to ensure your 2 witnesses and asset schedules comply with the Indian Succession Act, 1925.`
    );
  };

  const handleCopyMessage = () => {
    const msg = getWhatsAppMessage();
    if (!msg) return;
    navigator.clipboard.writeText(msg);
    setCopiedMsg(true);
    setTimeout(() => setCopiedMsg(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 bg-stone-900/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl border border-stone-200 shadow-2xl max-w-2xl w-full p-6 space-y-5 my-auto max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-stone-100 pb-3 shrink-0">
          <div className="flex items-center gap-2">
            <Lock className="w-4 h-4 text-amber-700" />
            <h3 className="font-serif font-bold text-stone-900 text-base">
              {isAdmin ? 'Licensing & Razorpay Multi-Page Control Desk' : 'Administrator Master Access'}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-stone-400 hover:text-stone-700 p-1 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {!isAdmin ? (
          /* STEP 1: Enter PIN to unlock admin privileges */
          <form onSubmit={handleSubmitPin} className="space-y-4">
            <p className="text-xs text-stone-600 leading-relaxed">
              Enter the Master Admin PIN to unlock Razorpay Payment Page restrictions, custom domain routing, training orientation policies, and live license ledger.
            </p>

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Master Admin PIN
              </label>
              <input
                type="password"
                autoFocus
                maxLength={6}
                placeholder="Enter PIN (Default: 8492)"
                value={pin}
                onChange={(e) => {
                  setPin(e.target.value);
                  setError('');
                }}
                className="w-full px-3 py-2.5 text-center text-lg tracking-widest font-mono border border-stone-300 rounded-lg focus:border-stone-900 focus:outline-hidden"
              />
              {error && (
                <p className="text-xs text-red-600 mt-1.5 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span>{error}</span>
                </p>
              )}
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="py-2 px-3 border border-stone-300 hover:bg-stone-50 rounded-lg text-xs font-medium text-stone-700 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 py-2 px-4 bg-stone-900 text-amber-100 hover:bg-stone-800 rounded-lg text-xs font-semibold cursor-pointer"
              >
                Unlock Administrator Mode
              </button>
            </div>

            <div className="pt-2 border-t border-stone-100 text-[11px] text-stone-400 text-center">
              Default Master PIN: <span className="font-mono font-bold text-stone-600">8492</span>
            </div>
          </form>
        ) : (
          /* STEP 2: Authenticated Admin Dashboard */
          <div className="flex-1 overflow-y-auto space-y-4 pr-1">
            {/* Nav Tabs */}
            <div className="flex border-b border-stone-200 text-xs font-semibold">
              <button
                onClick={() => setActiveTab('grant')}
                className={`py-2 px-3 border-b-2 flex items-center gap-1.5 transition-colors cursor-pointer ${
                  activeTab === 'grant'
                    ? 'border-amber-600 text-stone-900'
                    : 'border-transparent text-stone-500 hover:text-stone-800'
                }`}
              >
                <UserCheck className="w-3.5 h-3.5 text-amber-700" />
                <span>Issue License</span>
              </button>

              <button
                onClick={() => setActiveTab('settings')}
                className={`py-2 px-3 border-b-2 flex items-center gap-1.5 transition-colors cursor-pointer ${
                  activeTab === 'settings'
                    ? 'border-amber-600 text-stone-900'
                    : 'border-transparent text-stone-500 hover:text-stone-800'
                }`}
              >
                <Sliders className="w-3.5 h-3.5 text-amber-700" />
                <span>Razorpay Page Restrictions & Domain</span>
              </button>

              <button
                onClick={() => setActiveTab('ledger')}
                className={`py-2 px-3 border-b-2 flex items-center gap-1.5 transition-colors cursor-pointer ${
                  activeTab === 'ledger'
                    ? 'border-amber-600 text-stone-900'
                    : 'border-transparent text-stone-500 hover:text-stone-800'
                }`}
              >
                <Activity className="w-3.5 h-3.5 text-amber-700" />
                <span>Live Ledger ({ledgerData?.totalCount || 0})</span>
              </button>

              <button
                onClick={() => setActiveTab('sheets')}
                className={`py-2 px-3 border-b-2 flex items-center gap-1.5 transition-colors cursor-pointer ${
                  activeTab === 'sheets'
                    ? 'border-amber-600 text-stone-900'
                    : 'border-transparent text-stone-500 hover:text-stone-800'
                }`}
              >
                <Table className="w-3.5 h-3.5 text-emerald-700" />
                <span>Google Sheets & Leads ({registrationsData?.totalCount || 0})</span>
              </button>
            </div>

            {/* TAB 1: ISSUE LICENSE */}
            {activeTab === 'grant' && (
              <form onSubmit={handleGrantAccess} className="space-y-3 bg-stone-50 p-4 rounded-xl border border-stone-200">
                <div className="space-y-1">
                  <h4 className="text-xs font-bold text-stone-900 uppercase tracking-wider flex items-center gap-1.5">
                    <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
                    Manually Authorize Customer (Landing Page / UPI / GPay)
                  </h4>
                  <p className="text-[11px] text-stone-500 leading-relaxed">
                    If someone paid directly on your landing page or via bank transfer, enter their 10-digit mobile number. The server issues a single-user license credit bound to their phone.
                  </p>
                </div>

                {/* Plan Selection */}
                <div>
                  <label className="text-xs font-medium text-stone-700 block mb-1">
                    License Type
                  </label>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <button
                      type="button"
                      onClick={() => setPlanType('standard')}
                      className={`p-2.5 rounded-lg border text-left cursor-pointer transition-all ${
                        planType === 'standard'
                          ? 'border-amber-600 bg-amber-50 text-stone-900 font-bold'
                          : 'border-stone-300 bg-white text-stone-600'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span>New Legal Will</span>
                        <span className="font-mono text-[11px]">₹1,999</span>
                      </div>
                      <span className="text-[10px] text-stone-500 block font-normal mt-0.5">
                        1 Executed Will Run
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setPlanType('amendment')}
                      className={`p-2.5 rounded-lg border text-left cursor-pointer transition-all ${
                        planType === 'amendment'
                          ? 'border-amber-600 bg-amber-50 text-stone-900 font-bold'
                          : 'border-stone-300 bg-white text-stone-600'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span>Will Amendment</span>
                        <span className="font-mono text-[11px]">₹999</span>
                      </div>
                      <span className="text-[10px] text-stone-500 block font-normal mt-0.5">
                        1 Codicil / Revised Run
                      </span>
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <label className="text-xs font-medium text-stone-700 block mb-1">
                      Customer Mobile Number *
                    </label>
                    <div className="flex">
                      <span className="inline-flex items-center px-2.5 rounded-l-lg border border-r-0 border-stone-300 bg-stone-100 text-stone-600 text-xs font-mono">
                        +91
                      </span>
                      <input
                        type="tel"
                        required
                        maxLength={10}
                        value={customerPhone}
                        onChange={(e) => setCustomerPhone(e.target.value.replace(/\D/g, ''))}
                        placeholder="9876543210"
                        className="w-full text-xs px-3 py-2 border border-stone-300 rounded-r-lg focus:outline-none focus:ring-1 focus:ring-stone-900 bg-white font-mono"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-medium text-stone-700 block mb-1">
                      Customer Name (Optional)
                    </label>
                    <input
                      type="text"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      placeholder="e.g. Ramesh Verma"
                      className="w-full text-xs px-3 py-2 border border-stone-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-stone-900 bg-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-medium text-stone-700 block mb-1">
                    Internal Notes / Transaction Ref
                  </label>
                  <input
                    type="text"
                    value={paymentNotes}
                    onChange={(e) => setPaymentNotes(e.target.value)}
                    placeholder="e.g. UPI Ref #492810481 on Landing Page"
                    className="w-full text-xs px-3 py-1.5 border border-stone-300 rounded-lg bg-white"
                  />
                </div>

                {error && (
                  <p className="text-xs text-red-600 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5" />
                    <span>{error}</span>
                  </p>
                )}

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-2.5 px-3 bg-stone-900 hover:bg-stone-800 text-amber-100 rounded-lg text-xs font-bold cursor-pointer transition-colors shadow-xs"
                >
                  {isSubmitting ? 'Provisioning License on Server...' : 'Issue Single-User License'}
                </button>

                {/* Generated License Result Card */}
                {issuedLicense && (
                  <div className="p-3.5 bg-emerald-50 border border-emerald-300 rounded-xl space-y-2.5 text-xs text-emerald-950 animate-in fade-in duration-150">
                    <div className="flex items-center justify-between">
                      <span className="font-bold flex items-center gap-1.5 text-emerald-900">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        License Successfully Provisioned!
                      </span>
                      <span className="font-mono font-bold bg-white px-2 py-0.5 rounded border border-emerald-300 text-stone-900">
                        {issuedLicense.licenseKey}
                      </span>
                    </div>

                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={handleCopyLink}
                        className="flex-1 py-1.5 px-2 bg-emerald-800 text-white rounded-md font-semibold text-[11px] flex items-center justify-center gap-1 cursor-pointer hover:bg-emerald-900"
                      >
                        {copiedLink ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                        <span>{copiedLink ? 'Link Copied!' : 'Copy 1-Click Access URL'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleCopyMessage}
                        className="flex-1 py-1.5 px-2 bg-white border border-emerald-400 text-emerald-900 rounded-md font-semibold text-[11px] flex items-center justify-center gap-1 cursor-pointer hover:bg-emerald-100"
                      >
                        {copiedMsg ? <Check className="w-3 h-3" /> : <Send className="w-3 h-3" />}
                        <span>{copiedMsg ? 'Message Copied!' : 'Copy WhatsApp Message'}</span>
                      </button>
                    </div>
                  </div>
                )}
              </form>
            )}

            {/* TAB 2: RAZORPAY PAGE RESTRICTIONS & SETTINGS */}
            {activeTab === 'settings' && (
              <form onSubmit={handleSaveSettings} className="space-y-4 bg-stone-50 p-4 rounded-xl border border-stone-200 text-xs">
                <div>
                  <h4 className="font-bold text-stone-900 text-xs uppercase tracking-wider flex items-center gap-1.5">
                    <Filter className="w-3.5 h-3.5 text-amber-700" />
                    1. Restrict Specific Razorpay Payment Pages
                  </h4>
                  <p className="text-stone-600 leading-relaxed mt-1 text-[11px]">
                    If you have multiple payment pages on Razorpay (e.g. for courses, consulting, webinars), specify which page(s) grant the Will license. Any payment coming from other pages will be automatically <strong>ignored</strong> and will NOT grant a Will license.
                  </p>
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-stone-700 block mb-1">
                    Allowed Razorpay Page IDs / Link IDs (comma-separated):
                  </label>
                  <input
                    type="text"
                    value={allowedPagesInput}
                    onChange={(e) => setAllowedPagesInput(e.target.value)}
                    placeholder="e.g. plink_N1o9Abc123, pages.razorpay.com/will-assistant"
                    className="w-full text-xs px-3 py-2 border border-stone-300 rounded-lg bg-white font-mono"
                  />
                  <span className="text-[10px] text-stone-500 block mt-1">
                    Leave blank to allow any payment page that matches the product keywords below or amounts (₹1,999 / ₹999).
                  </span>
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-stone-700 block mb-1">
                    Product Title Keywords Filter (comma-separated):
                  </label>
                  <input
                    type="text"
                    value={filterKeywordsInput}
                    onChange={(e) => setFilterKeywordsInput(e.target.value)}
                    placeholder="will, succession, testament"
                    className="w-full text-xs px-3 py-2 border border-stone-300 rounded-lg bg-white font-mono"
                  />
                  <span className="text-[10px] text-stone-500 block mt-1">
                    Payments whose page title or notes contain any of these keywords will be recognized as Will purchases.
                  </span>
                </div>

                <div className="pt-2 border-t border-stone-200">
                  <h4 className="font-bold text-stone-900 text-xs uppercase tracking-wider flex items-center gap-1.5">
                    <ExternalLink className="w-3.5 h-3.5 text-amber-700" />
                    2. Direct Razorpay Payment Page URL (for Landing Page CTA)
                  </h4>
                  <p className="text-stone-600 leading-relaxed mt-1 text-[11px]">
                    Enter your dedicated Razorpay Payment Page URL (e.g. <code>https://pages.razorpay.com/...</code> or <code>https://rzp.io/l/...</code>). When visitors click <strong>"Buy The Will Blueprint Now"</strong> on the landing page, they will be registered and immediately redirected to this page to pay.
                  </p>
                  <div className="mt-2">
                    <input
                      type="url"
                      value={razorpayPaymentPageUrlInput}
                      onChange={(e) => setRazorpayPaymentPageUrlInput(e.target.value)}
                      placeholder="e.g. https://pages.razorpay.com/will-blueprint or https://rzp.io/l/will-draft"
                      className="w-full text-xs px-3 py-2 border border-stone-300 rounded-lg bg-white font-mono"
                    />
                    <span className="text-[10px] text-stone-500 block mt-1">
                      If left empty, clicking the CTA will open the instant in-app Razorpay popup instead.
                    </span>
                  </div>
                </div>

                <div className="pt-2 border-t border-stone-200">
                  <h4 className="font-bold text-stone-900 text-xs uppercase tracking-wider flex items-center gap-1.5">
                    <Link className="w-3.5 h-3.5 text-amber-700" />
                    3. Custom Domain Configuration
                  </h4>
                  <p className="text-stone-600 leading-relaxed mt-1 text-[11px]">
                    If you are hosting or routing this assistant under a custom domain, enter it here. All generated links and WhatsApp templates will use this URL.
                  </p>
                  <div className="mt-2">
                    <input
                      type="url"
                      value={customDomainInput}
                      onChange={(e) => setCustomDomainInput(e.target.value)}
                      placeholder="https://will.wealthcreationmatrix.com"
                      className="w-full text-xs px-3 py-2 border border-stone-300 rounded-lg bg-white font-mono"
                    />
                  </div>
                </div>

                <div className="pt-2 border-t border-stone-200">
                  <h4 className="font-bold text-stone-900 text-xs uppercase tracking-wider flex items-center gap-1.5">
                    <GraduationCap className="w-3.5 h-3.5 text-amber-700" />
                    4. Mandatory Training Orientation & Anti-Wasting Policy
                  </h4>
                  <p className="text-stone-600 leading-relaxed mt-1 text-[11px]">
                    Ensure buyers understand critical legal clauses (e.g. 2 independent witnesses, senior doctor certificates, 1-execution policy) before drafting so they do not waste their single-use license.
                  </p>

                  <div className="mt-2.5 space-y-2">
                    <label className="flex items-center gap-2 text-stone-800 font-semibold cursor-pointer">
                      <input
                        type="checkbox"
                        checked={requireTrainingOrientation}
                        onChange={(e) => setRequireTrainingOrientation(e.target.checked)}
                        className="rounded text-stone-900 w-4 h-4"
                      />
                      <span>Enforce Mandatory Pre-Drafting Legal Orientation Checklist</span>
                    </label>

                    <div>
                      <label className="text-[11px] font-medium text-stone-700 block mb-1">
                        External Course / Video Training Masterclass URL (Optional):
                      </label>
                      <input
                        type="url"
                        value={externalTrainingUrlInput}
                        onChange={(e) => setExternalTrainingUrlInput(e.target.value)}
                        placeholder="https://wealthcreationmatrix.com/will-orientation"
                        className="w-full text-xs px-3 py-2 border border-stone-300 rounded-lg bg-white"
                      />
                    </div>
                  </div>
                </div>

                {settingsSuccessMsg && (
                  <p className="text-xs text-emerald-700 font-semibold flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>{settingsSuccessMsg}</span>
                  </p>
                )}

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={isSavingSettings}
                    className="w-full py-2.5 px-4 bg-stone-900 hover:bg-stone-800 text-amber-100 font-bold rounded-lg text-xs cursor-pointer transition-colors shadow-xs"
                  >
                    {isSavingSettings ? 'Saving Settings...' : 'Save Settings & Restrictions'}
                  </button>
                </div>
              </form>
            )}

            {/* TAB 3: LIVE LEDGER & LOGS */}
            {activeTab === 'ledger' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex gap-2 text-stone-600">
                    <span>Total: <strong>{ledgerData?.totalCount || 0}</strong></span>
                    <span>•</span>
                    <span className="text-emerald-700">Active: <strong>{ledgerData?.activeCount || 0}</strong></span>
                    <span>•</span>
                    <span className="text-amber-700">Consumed: <strong>{ledgerData?.consumedCount || 0}</strong></span>
                  </div>
                  <button
                    onClick={loadLedgerAndSettings}
                    className="p-1 text-stone-500 hover:text-stone-900 flex items-center gap-1 text-[11px] cursor-pointer"
                  >
                    <RefreshCw className={`w-3 h-3 ${isLoadingLedger ? 'animate-spin' : ''}`} />
                    <span>Refresh</span>
                  </button>
                </div>

                <div className="border border-stone-200 rounded-xl overflow-hidden bg-white text-xs">
                  <table className="w-full text-left border-collapse">
                    <thead className="bg-stone-100 text-[11px] font-bold text-stone-700 uppercase">
                      <tr>
                        <th className="p-2.5">Mobile & Customer</th>
                        <th className="p-2.5">License Key</th>
                        <th className="p-2.5">Origin Page</th>
                        <th className="p-2.5">Status</th>
                        <th className="p-2.5">Executions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-100 text-[11px]">
                      {ledgerData?.licenses && ledgerData.licenses.length > 0 ? (
                        ledgerData.licenses.map((lic, i) => (
                          <tr key={i} className="hover:bg-stone-50">
                            <td className="p-2.5 font-mono font-semibold text-stone-900">
                              +91 {lic.phone}
                              {lic.customerName && (
                                <span className="block font-sans text-[10px] text-stone-500">
                                  {lic.customerName}
                                </span>
                              )}
                            </td>
                            <td className="p-2.5 font-mono text-stone-700">{lic.licenseKey}</td>
                            <td className="p-2.5 text-stone-600 text-[10px]">
                              {lic.pageTitle || lic.pageId || lic.paymentSource}
                            </td>
                            <td className="p-2.5">
                              {lic.status === 'consumed' ? (
                                <span className="px-1.5 py-0.5 bg-amber-100 text-amber-900 rounded font-bold text-[10px]">
                                  Consumed
                                </span>
                              ) : (
                                <span className="px-1.5 py-0.5 bg-emerald-100 text-emerald-900 rounded font-bold text-[10px]">
                                  Active {lic.trainingCompleted ? '(Certified)' : '(Orientation Pending)'}
                                </span>
                              )}
                            </td>
                            <td className="p-2.5 font-mono">
                              {lic.executionsUsed} / {lic.maxExecutions}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={5} className="p-4 text-center text-stone-400">
                            No licenses found on server.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Recent Webhook Logs */}
                {ledgerData?.webhookLogs && ledgerData.webhookLogs.length > 0 && (
                  <div className="space-y-1.5 pt-2">
                    <span className="text-[11px] font-bold text-stone-700 uppercase tracking-wider block">
                      Recent Webhook Events & Filtering Audit:
                    </span>
                    <div className="space-y-1 max-h-40 overflow-y-auto">
                      {ledgerData.webhookLogs.slice(0, 10).map((log: any, idx: number) => (
                        <div
                          key={idx}
                          className={`p-2 rounded border text-[10px] flex items-center justify-between ${
                            log.status === 'processed'
                              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                              : log.status === 'ignored'
                              ? 'bg-stone-50 border-stone-200 text-stone-600'
                              : 'bg-red-50 border-red-200 text-red-900'
                          }`}
                        >
                          <span className="font-mono">{log.event}</span>
                          <span className="truncate max-w-xs">{log.message}</span>
                          <span className="text-stone-400">{new Date(log.timestamp).toLocaleTimeString()}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* TAB 4: GOOGLE SHEETS & REGISTRATIONS */}
            {activeTab === 'sheets' && (
              <div className="space-y-4 bg-stone-50 p-4 rounded-xl border border-stone-200">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-stone-200">
                  <div>
                    <h4 className="text-xs font-bold text-stone-900 uppercase tracking-wider flex items-center gap-1.5">
                      <Table className="w-4 h-4 text-emerald-600" />
                      Testator Registrations & Live Google Sheets Feed
                    </h4>
                    <p className="text-[11px] text-stone-500 mt-0.5">
                      Real-time synchronized lead register of everyone who registers on your landing page.
                    </p>
                  </div>
                  <a
                    href="/api/registrations/google-sheets.csv"
                    download="wealth_creation_matrix_registrations.csv"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-sm transition-all text-center justify-center shrink-0"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download CSV</span>
                  </a>
                </div>

                {/* Metrics */}
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="bg-white p-2.5 rounded-lg border border-stone-200 shadow-xs">
                    <span className="text-[10px] text-stone-500 uppercase tracking-wider block font-medium">
                      Total Leads
                    </span>
                    <span className="text-lg font-bold text-stone-900">
                      {registrationsData?.totalCount || 0}
                    </span>
                  </div>
                  <div className="bg-emerald-50 p-2.5 rounded-lg border border-emerald-200 shadow-xs">
                    <span className="text-[10px] text-emerald-700 uppercase tracking-wider block font-medium">
                      Paid & Verified
                    </span>
                    <span className="text-lg font-bold text-emerald-800">
                      {registrationsData?.paidCount || 0}
                    </span>
                  </div>
                  <div className="bg-amber-50 p-2.5 rounded-lg border border-amber-200 shadow-xs">
                    <span className="text-[10px] text-amber-700 uppercase tracking-wider block font-medium">
                      Pending Payment
                    </span>
                    <span className="text-lg font-bold text-amber-800">
                      {registrationsData?.unpaidCount || 0}
                    </span>
                  </div>
                </div>

                {/* Google Sheet Sync Box */}
                <div className="p-3.5 bg-white rounded-xl border border-stone-300 space-y-2">
                  <span className="text-xs font-bold text-stone-800 flex items-center gap-1.5">
                    <ExternalLink className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Live Auto-Sync into Google Sheets:</span>
                  </span>
                  <p className="text-[11px] text-stone-600 leading-relaxed">
                    Paste this formula in Cell <strong>A1</strong> of any Google Sheet to automatically pull every registered testator in real-time:
                  </p>
                  <div className="flex items-center gap-2 bg-stone-100 p-2 rounded-lg border border-stone-300">
                    <code className="text-[11px] font-mono text-emerald-800 break-all select-all flex-1">
                      {`=IMPORTDATA("${typeof window !== 'undefined' ? window.location.origin : ''}/api/registrations/google-sheets.csv")`}
                    </code>
                    <button
                      type="button"
                      onClick={() => {
                        const formula = `=IMPORTDATA("${typeof window !== 'undefined' ? window.location.origin : ''}/api/registrations/google-sheets.csv")`;
                        navigator.clipboard.writeText(formula);
                        setCopiedSheetFormula(true);
                        setTimeout(() => setCopiedSheetFormula(false), 3000);
                      }}
                      className="px-2.5 py-1 rounded bg-stone-900 hover:bg-stone-800 text-amber-100 text-[11px] font-medium shrink-0 cursor-pointer"
                    >
                      {copiedSheetFormula ? 'Copied!' : 'Copy Formula'}
                    </button>
                  </div>
                </div>

                {/* Registrations List Table */}
                <div className="overflow-x-auto rounded-lg border border-stone-200 bg-white">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-stone-100 border-b border-stone-200 text-stone-700 font-semibold text-[10px] uppercase">
                        <th className="p-2.5">Registered</th>
                        <th className="p-2.5">Name</th>
                        <th className="p-2.5">Mobile</th>
                        <th className="p-2.5">Email</th>
                        <th className="p-2.5">Location</th>
                        <th className="p-2.5">Payment</th>
                        <th className="p-2.5">License</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-100 text-[11px]">
                      {registrationsData?.registrations && registrationsData.registrations.length > 0 ? (
                        registrationsData.registrations.map((reg, idx) => (
                          <tr key={idx} className="hover:bg-stone-50">
                            <td className="p-2.5 text-stone-500 text-[10px] whitespace-nowrap">
                              {new Date(reg.registeredAt).toLocaleDateString('en-IN', {
                                day: 'numeric',
                                month: 'short',
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </td>
                            <td className="p-2.5 font-semibold text-stone-900">{reg.name}</td>
                            <td className="p-2.5 font-mono text-stone-700">+91 {reg.phone}</td>
                            <td className="p-2.5 text-stone-600 truncate max-w-[140px]">{reg.email || '—'}</td>
                            <td className="p-2.5 text-stone-600 text-[10px]">
                              {reg.city ? `${reg.city}, ${reg.state}` : reg.state || '—'}
                            </td>
                            <td className="p-2.5">
                              {reg.paymentStatus === 'paid' ? (
                                <span className="px-1.5 py-0.5 bg-emerald-100 text-emerald-800 rounded font-bold text-[10px]">
                                  Paid (₹{reg.amountPaid || 1999})
                                </span>
                              ) : reg.paymentStatus === 'consumed' ? (
                                <span className="px-1.5 py-0.5 bg-stone-200 text-stone-800 rounded font-bold text-[10px]">
                                  Executed
                                </span>
                              ) : (
                                <span className="px-1.5 py-0.5 bg-amber-100 text-amber-800 rounded font-bold text-[10px]">
                                  Unpaid
                                </span>
                              )}
                            </td>
                            <td className="p-2.5 font-mono text-stone-600 text-[10px]">
                              {reg.licenseKey || '—'}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={7} className="p-4 text-center text-stone-400">
                            No registered leads yet. Leads will appear here as customers register on the landing page.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
