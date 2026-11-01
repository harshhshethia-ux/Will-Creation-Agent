/**
 * Razorpay Payment & Server-Authoritative Licensing Service
 * Handles Razorpay Standard Checkout SDK, server-side license verification,
 * anti-link-sharing protection, and amendment lifecycle tracking.
 */

import { isAdminAuthenticated, isDemoModeActive } from './verificationService';

export interface PaymentRecord {
  orderId: string;
  paymentId: string;
  signature?: string;
  amount: number; // in INR
  currency: string;
  customerPhone: string;
  customerEmail: string;
  customerName?: string;
  planId: 'standard' | 'amendment';
  paidAt: number;
  licenseKey?: string;
}

export interface PricingPlan {
  id: 'standard' | 'amendment';
  name: string;
  price: number; // in INR
  originalPrice: number;
  description: string;
  features: string[];
  popular?: boolean;
}

export const PRICING_PLANS: PricingPlan[] = [
  {
    id: 'standard',
    name: 'Complete Legal Will & Attestation Kit',
    price: 1999,
    originalPrice: 4999,
    popular: true,
    description: '1 Valid Legal Will Execution: Complete Indian Succession Act 1925 compliant Will draft with watermark-free official PDF export.',
    features: [
      'Full Legally Formatted Will Document',
      '1 Official Watermark-Free PDF & Print Run',
      'Dual Witness & Doctor Attestation Clauses',
      'Sub-Registrar Registration & Stamp Protocol',
      'Comprehensive Asset Matrix & Digital Safe Backup',
      'Phone-Bound Anti-Theft Licensing Protection',
    ],
  },
  {
    id: 'amendment',
    name: 'Will Amendment & Codicil License',
    price: 999,
    originalPrice: 2499,
    popular: false,
    description: '1 Amendment/Codicil Execution: Modify clauses, add new heirs/assets, or update executor appointments for previously drafted Wills.',
    features: [
      'Indian Succession Act Sec 62 & 70 Compliant Codicil',
      '1 Revised Watermark-Free PDF & Print Run',
      'Updated Attestation & Revocation Language',
      'Preserves Original Registration History',
    ],
  },
];

export interface ServerLicenseStatus {
  status: 'active' | 'consumed' | 'unpaid' | 'not_found';
  creditsRemaining: number;
  executionsUsed: number;
  licenseKey?: string;
  planId?: 'standard' | 'amendment';
  customerName?: string;
  phone?: string;
  consumedAt?: number;
  trainingCompleted?: boolean;
  requireTrainingOrientation?: boolean;
  externalTrainingUrl?: string;
  message?: string;
}

const STORAGE_KEY_PAID_RECORDS = 'wcm_razorpay_paid_records_v1';
const STORAGE_KEY_CURRENT_PAID_PHONE = 'wcm_current_paid_phone';
const STORAGE_KEY_ACTIVE_LICENSE_KEY = 'wcm_active_license_key';
const STORAGE_KEY_CUSTOM_RAZORPAY_KEY = 'wcm_custom_razorpay_key';

/**
 * Gets the active Razorpay Key ID.
 */
export function getRazorpayKeyId(): string {
  try {
    if (typeof window !== 'undefined') {
      const customKey = localStorage.getItem(STORAGE_KEY_CUSTOM_RAZORPAY_KEY);
      if (customKey && customKey.trim()) {
        return customKey.trim();
      }
    }
  } catch (e) {
    console.error('Failed to read custom Razorpay key', e);
  }
  return (import.meta as any).env?.VITE_RAZORPAY_KEY_ID || '';
}

/**
 * Sets or clears custom Razorpay Key in storage.
 */
export function setCustomRazorpayKeyId(key: string): void {
  try {
    if (typeof window !== 'undefined') {
      const cleanKey = key.trim();
      if (cleanKey) {
        localStorage.setItem(STORAGE_KEY_CUSTOM_RAZORPAY_KEY, cleanKey);
      } else {
        localStorage.removeItem(STORAGE_KEY_CUSTOM_RAZORPAY_KEY);
      }
    }
  } catch (e) {
    console.error('Failed to save custom Razorpay key', e);
  }
}

declare global {
  interface Window {
    Razorpay?: any;
  }
}

/**
 * Loads Razorpay script asynchronously.
 */
export function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined') {
      resolve(false);
      return;
    }

    if (window.Razorpay) {
      resolve(true);
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => {
      console.warn('Failed to load Razorpay checkout.js script');
      resolve(false);
    };
    document.body.appendChild(script);
  });
}

/**
 * Verifies with backend server if a phone number or license key has an active execution credit.
 * Protects against link sharing: checks server-side state.
 */
export async function checkServerLicenseStatus({
  phone,
  licenseKey,
  otp,
}: {
  phone?: string | null;
  licenseKey?: string | null;
  otp?: string;
}): Promise<ServerLicenseStatus> {
  // Admin bypass in demo mode
  if (isAdminAuthenticated() && isDemoModeActive()) {
    return {
      status: 'active',
      creditsRemaining: 999,
      executionsUsed: 0,
      licenseKey: 'ADMIN-BYPASS',
      planId: 'standard',
      message: 'Admin demo mode active',
    };
  }

  const cleanPhone = (phone || '').replace(/\D/g, '').slice(-10);
  const targetKey = licenseKey?.trim() || getStoredLicenseKey();

  if (!cleanPhone && !targetKey) {
    return {
      status: 'unpaid',
      creditsRemaining: 0,
      executionsUsed: 0,
      message: 'No credentials provided.',
    };
  }

  try {
    const res = await fetch('/api/license/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        phone: cleanPhone || undefined,
        licenseKey: targetKey || undefined,
        otp: otp || undefined,
      }),
    });

    const data = await res.json();
    if (res.ok && data.success) {
      if (data.licenseKey) {
        setStoredLicenseKey(data.licenseKey);
      }
      return {
        status: data.status,
        creditsRemaining: data.creditsRemaining || 0,
        executionsUsed: data.executionsUsed || 0,
        licenseKey: data.licenseKey,
        planId: data.planId,
        customerName: data.customerName,
        phone: data.phone,
        consumedAt: data.consumedAt,
        trainingCompleted: data.trainingCompleted,
        requireTrainingOrientation: data.requireTrainingOrientation,
        externalTrainingUrl: data.externalTrainingUrl,
        message: data.message,
      };
    } else {
      return {
        status: 'unpaid',
        creditsRemaining: 0,
        executionsUsed: 0,
        message: data.error || 'Verification failed.',
      };
    }
  } catch (e) {
    console.warn('Server license check fallback to local records', e);
    // Offline / fallback to local records if server unreachable
    return checkLocalPaymentStatus(cleanPhone);
  }
}

/**
 * Local record fallback if offline.
 */
function checkLocalPaymentStatus(cleanPhone?: string): ServerLicenseStatus {
  if (isAdminAuthenticated() && isDemoModeActive()) {
    return { status: 'active', creditsRemaining: 999, executionsUsed: 0 };
  }
  const records = getAllPaymentRecords();
  if (cleanPhone && records[cleanPhone]) {
    return {
      status: 'active',
      creditsRemaining: 1,
      executionsUsed: 0,
      licenseKey: records[cleanPhone].licenseKey,
      planId: records[cleanPhone].planId,
    };
  }
  return { status: 'unpaid', creditsRemaining: 0, executionsUsed: 0 };
}

/**
 * Consumes 1 execution credit on the server when the user prints/downloads the clean Will.
 */
export async function consumeServerExecutionCredit({
  phone,
  licenseKey,
  testatorName,
  adminPin,
}: {
  phone?: string | null;
  licenseKey?: string | null;
  testatorName?: string;
  adminPin?: string;
}): Promise<{ success: boolean; status: string; message: string }> {
  try {
    const res = await fetch('/api/license/consume', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        phone: (phone || '').replace(/\D/g, '').slice(-10),
        licenseKey: licenseKey || getStoredLicenseKey(),
        testatorName,
        adminPin,
      }),
    });
    const data = await res.json();
    return data;
  } catch (err: any) {
    console.error('Failed to consume execution credit on server', err);
    return { success: false, status: 'error', message: err?.message || 'Server error' };
  }
}

/**
 * Registers a newly completed frontend Razorpay checkout with the backend server.
 */
export async function registerPaymentWithServer(record: PaymentRecord): Promise<string | null> {
  try {
    const res = await fetch('/api/license/register-payment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ paymentRecord: record }),
    });
    const data = await res.json();
    if (data.success && data.licenseKey) {
      setStoredLicenseKey(data.licenseKey);
      return data.licenseKey;
    }
  } catch (e) {
    console.error('Failed to register payment on server', e);
  }
  return null;
}

/**
 * Initiates Razorpay checkout flow.
 */
export async function initiateRazorpayPayment({
  plan,
  customerName,
  customerEmail,
  customerPhone,
  onSuccess,
  onFailure,
}: {
  plan: PricingPlan;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  onSuccess: (record: PaymentRecord) => void;
  onFailure: (err: any) => void;
}): Promise<void> {
  const razorpayKey = getRazorpayKeyId();
  const scriptLoaded = await loadRazorpayScript();

  if (scriptLoaded && window.Razorpay && razorpayKey) {
    const options = {
      key: razorpayKey,
      amount: plan.price * 100, // paise
      currency: 'INR',
      name: 'Will Drafting Assistant',
      description: `${plan.name} - Official Legal Execution`,
      image: 'https://cdn-icons-png.flaticon.com/512/2830/2830305.png',
      prefill: {
        name: customerName,
        email: customerEmail,
        contact: customerPhone,
      },
      notes: {
        plan_id: plan.id,
        app_name: 'Wealth Creation Matrix - Will Drafting Assistant',
        customerPhone,
      },
      theme: {
        color: '#1c1917',
      },
      handler: async function (response: any) {
        const record: PaymentRecord = {
          orderId: response.razorpay_order_id || `order_${Date.now()}`,
          paymentId: response.razorpay_payment_id || `pay_${Date.now()}`,
          signature: response.razorpay_signature,
          amount: plan.price,
          currency: 'INR',
          customerPhone,
          customerEmail,
          customerName,
          planId: plan.id,
          paidAt: Date.now(),
        };

        // Register on server to generate license key & credit
        const serverKey = await registerPaymentWithServer(record);
        if (serverKey) record.licenseKey = serverKey;

        recordSuccessfulPayment(record);
        onSuccess(record);
      },
      modal: {
        ondismiss: function () {
          onFailure(new Error('Payment window was closed by the user.'));
        },
      },
    };

    try {
      const rzp = new window.Razorpay(options);
      rzp.on('payment.failed', function (response: any) {
        onFailure(response.error);
      });
      rzp.open();
    } catch (err) {
      console.error('Error invoking Razorpay modal', err);
      onFailure(err);
    }
  } else {
    // Simulator checkout for test/dev mode without Razorpay Key ID
    const simulatedRecord: PaymentRecord = {
      orderId: `test_order_${Date.now()}`,
      paymentId: `pay_test_${Math.random().toString(36).substring(2, 10).toUpperCase()}`,
      amount: plan.price,
      currency: 'INR',
      customerPhone,
      customerEmail,
      customerName,
      planId: plan.id,
      paidAt: Date.now(),
    };

    const serverKey = await registerPaymentWithServer(simulatedRecord);
    if (serverKey) simulatedRecord.licenseKey = serverKey;

    recordSuccessfulPayment(simulatedRecord);
    onSuccess(simulatedRecord);
  }
}

/**
 * Storage helpers
 */
export function getStoredLicenseKey(): string {
  try {
    return localStorage.getItem(STORAGE_KEY_ACTIVE_LICENSE_KEY) || '';
  } catch {
    return '';
  }
}

export function setStoredLicenseKey(key: string): void {
  try {
    localStorage.setItem(STORAGE_KEY_ACTIVE_LICENSE_KEY, key.trim());
  } catch (e) {
    console.error('Failed to save license key', e);
  }
}

export function getAllPaymentRecords(): Record<string, PaymentRecord> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_PAID_RECORDS);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error('Failed to load payment records', e);
  }
  return {};
}

export function recordSuccessfulPayment(record: PaymentRecord): void {
  const cleanPhone = record.customerPhone.replace(/\D/g, '').slice(-10);
  const records = getAllPaymentRecords();
  records[cleanPhone] = record;

  try {
    localStorage.setItem(STORAGE_KEY_PAID_RECORDS, JSON.stringify(records));
    localStorage.setItem(STORAGE_KEY_CURRENT_PAID_PHONE, cleanPhone);
    if (record.licenseKey) {
      setStoredLicenseKey(record.licenseKey);
    }
  } catch (e) {
    console.error('Failed to record payment', e);
  }
}

/**
 * Validates a customer license claim with the server.
 * Accepts a License Key (LIC-...) or customer phone number.
 */
export async function verifyServerClaim(identifier: string): Promise<{
  success: boolean;
  status: string;
  message: string;
  licenseKey?: string;
  planId?: 'standard' | 'amendment';
}> {
  const trimmed = identifier.trim();
  if (!trimmed) {
    return { success: false, status: 'error', message: 'Please enter a License Key or 10-digit mobile number.' };
  }

  const isKey = trimmed.toUpperCase().startsWith('LIC-');
  const digits = trimmed.replace(/\D/g, '');

  if (isKey) {
    const result = await checkServerLicenseStatus({ licenseKey: trimmed });
    if (result.status === 'active') {
      return {
        success: true,
        status: 'active',
        message: `License verified! 1 execution credit active for your Will.`,
        licenseKey: result.licenseKey,
        planId: result.planId,
      };
    } else if (result.status === 'consumed') {
      return {
        success: false,
        status: 'consumed',
        message: result.message || 'This license has already been finalized and executed.',
        licenseKey: result.licenseKey,
      };
    }
    return {
      success: false,
      status: 'unpaid',
      message: 'License key not recognized. Please check the code sent to your phone/email.',
    };
  }

  if (digits.length >= 10) {
    const cleanPhone = digits.slice(-10);
    const result = await checkServerLicenseStatus({ phone: cleanPhone });
    if (result.status === 'active') {
      return {
        success: true,
        status: 'active',
        message: `Verified! Active paid license found for +91 ${cleanPhone}.`,
        licenseKey: result.licenseKey,
        planId: result.planId,
      };
    } else if (result.status === 'consumed') {
      return {
        success: false,
        status: 'consumed',
        message: `Will previously finalized for +91 ${cleanPhone}. An Amendment License is required to modify or reprint.`,
        licenseKey: result.licenseKey,
      };
    }
    return {
      success: false,
      status: 'unpaid',
      message: `No active license found for +91 ${cleanPhone}. If you made a payment on the landing page, please ensure the admin registered your number or check your License Key.`,
    };
  }

  return {
    success: false,
    status: 'error',
    message: 'Please enter a valid 10-digit phone number or License Key (starts with LIC-).',
  };
}

/**
 * Admin API: Manually grant a customer license.
 */
export async function grantManualCustomerLicense({
  phone,
  name,
  email,
  planId = 'standard',
  adminPin,
}: {
  phone: string;
  name?: string;
  email?: string;
  planId?: 'standard' | 'amendment';
  adminPin: string;
}): Promise<{ success: boolean; licenseKey?: string; shareableUrl?: string; error?: string }> {
  try {
    const res = await fetch('/api/license/grant-manual', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        phone,
        customerName: name,
        email,
        planId,
        adminPin,
      }),
    });
    return await res.json();
  } catch (err: any) {
    return { success: false, error: err?.message || 'Server error' };
  }
}

/**
 * Admin API: List all licenses & webhook logs.
 */
export async function fetchAdminLicenses(adminPin: string): Promise<any> {
  try {
    const res = await fetch('/api/license/list', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ adminPin }),
    });
    return await res.json();
  } catch (err: any) {
    return { success: false, error: err?.message || 'Server error' };
  }
}

/**
 * Completes legal training orientation for a license holder.
 */
export async function completeTrainingOrientation({
  phone,
  licenseKey,
}: {
  phone?: string | null;
  licenseKey?: string | null;
}): Promise<{ success: boolean; message: string; trainingCompleted: boolean }> {
  try {
    const res = await fetch('/api/license/complete-training', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        phone: (phone || '').replace(/\D/g, '').slice(-10),
        licenseKey: licenseKey || getStoredLicenseKey(),
      }),
    });
    return await res.json();
  } catch (err: any) {
    console.error('Failed to complete training on server', err);
    return { success: true, message: 'Certified locally', trainingCompleted: true };
  }
}

/**
 * Admin API: Fetch server app settings (e.g. allowed Razorpay page IDs, custom domain).
 */
export async function fetchServerSettings(): Promise<any> {
  try {
    const res = await fetch('/api/admin/settings');
    const data = await res.json();
    return data.settings;
  } catch (err) {
    console.error('Failed to fetch server settings', err);
    return null;
  }
}

/**
 * Public API: Fetch payment configuration (payment page URL, custom domain).
 */
export async function fetchPaymentConfig(): Promise<{
  success: boolean;
  paymentPageUrl: string;
  razorpayKeyId?: string;
  customDomainUrl?: string;
  amount?: number;
}> {
  try {
    const res = await fetch('/api/payment-config');
    const data = await res.json();
    if (data?.razorpayKeyId) {
      setCustomRazorpayKeyId(data.razorpayKeyId);
    }
    return {
      success: true,
      paymentPageUrl: data?.paymentPageUrl || '',
      razorpayKeyId: data?.razorpayKeyId || '',
      customDomainUrl: data?.customDomainUrl || '',
      amount: data?.amount || 1999,
    };
  } catch (err) {
    console.warn('Failed to fetch payment config', err);
    return { success: false, paymentPageUrl: '', razorpayKeyId: '' };
  }
}

/**
 * Admin API: Save server app settings.
 */
export async function updateServerSettings(settings: any, adminPin: string): Promise<any> {
  try {
    const res = await fetch('/api/admin/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ settings, adminPin }),
    });
    return await res.json();
  } catch (err: any) {
    return { success: false, error: err?.message || 'Server error' };
  }
}

export interface TestatorRegistration {
  name: string;
  phone: string;
  email: string;
  city: string;
  state: string;
  licenseKey?: string;
}

export interface RegistrationResponse {
  success: boolean;
  registration?: {
    id: string;
    name: string;
    phone: string;
    email: string;
    city: string;
    state: string;
    registeredAt: number;
    paymentStatus: 'paid' | 'unpaid' | 'consumed';
    licenseKey?: string;
    amountPaid?: number;
    paymentSource?: string;
  };
  isPaid?: boolean;
  isConsumed?: boolean;
  licenseKey?: string;
  creditsRemaining?: number;
  trainingCompleted?: boolean;
  paymentPageUrl?: string;
  message?: string;
  error?: string;
}

/**
 * Submits testator registration and immediately checks server-side payment & license status.
 */
export async function submitRegistration(reg: TestatorRegistration): Promise<RegistrationResponse> {
  try {
    const res = await fetch('/api/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(reg),
    });
    return await res.json();
  } catch (err: any) {
    console.error('Registration failed:', err);
    return {
      success: false,
      error: err?.message || 'Network error registering testator.',
    };
  }
}

/**
 * Fetches all registered leads for admin overview.
 */
export async function fetchAllRegistrations(): Promise<{
  success: boolean;
  totalCount: number;
  paidCount: number;
  unpaidCount: number;
  registrations: any[];
}> {
  try {
    const res = await fetch('/api/registrations');
    return await res.json();
  } catch (err: any) {
    console.error('Failed to fetch registrations:', err);
    return {
      success: false,
      totalCount: 0,
      paidCount: 0,
      unpaidCount: 0,
      registrations: [],
    };
  }
}

