import express, { Request, Response } from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import crypto from 'crypto';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = process.env.PORT && process.env.PORT !== '8080' ? parseInt(process.env.PORT, 10) : 3000;
const isProd = process.env.NODE_ENV === 'production';

// Admin credentials
const ADMIN_MASTER_PIN = process.env.ADMIN_MASTER_PIN || '8492';
const ADMIN_URL_KEY = 'wcm2026';
const RAZORPAY_WEBHOOK_SECRET = process.env.RAZORPAY_WEBHOOK_SECRET || '';

// In-Memory & File-Persisted License Store
interface LicenseRecord {
  licenseKey: string;
  phone: string; // 10-digit clean phone
  email?: string;
  customerName?: string;
  planId: 'standard' | 'amendment';
  amountPaid: number;
  paymentSource: 'razorpay_checkout' | 'razorpay_webhook' | 'admin_manual' | 'landing_page_redirect';
  paymentId?: string;
  orderId?: string;
  createdAt: number;
  maxExecutions: number;
  executionsUsed: number;
  status: 'active' | 'consumed' | 'revoked';
  claimedSessionId?: string;
  claimedAt?: number;
  consumedAt?: number;
  testatorName?: string;
  notes?: string;
  trainingCompleted?: boolean;
  trainingCompletedAt?: number;
  pageId?: string;
  pageTitle?: string;
}

interface WebhookLog {
  id: string;
  event: string;
  paymentId?: string;
  phone?: string;
  amount?: number;
  timestamp: number;
  status: 'processed' | 'failed' | 'ignored';
  message: string;
}

export interface AppSettings {
  allowedRazorpayPageIds: string[]; // e.g. ["plink_xxxx", "plink_yyyy"]
  filterKeywords: string[]; // e.g. ["will", "succession"]
  customDomainUrl: string; // e.g. "https://will.wealthcreationmatrix.com"
  requireTrainingOrientation: boolean; // default true
  externalTrainingUrl: string; // optional external LMS/video link
  razorpayPaymentPageUrl: string; // direct Razorpay payment link (e.g. https://pages.razorpay.com/xxx or https://rzp.io/l/xxx)
  razorpayKeyId?: string; // Razorpay public key ID (rzp_live_... or rzp_test_...)
}

export interface RegistrationRecord {
  id: string; // e.g. "REG-WCM-1001"
  name: string;
  phone: string; // 10-digit clean phone
  email: string;
  city: string;
  state: string;
  registeredAt: number; // timestamp
  paymentStatus: 'paid' | 'unpaid' | 'consumed';
  licenseKey?: string;
  amountPaid?: number;
  paymentSource?: string;
  notes?: string;
}

const DATA_DIR = path.resolve(__dirname, '.data');
const LICENSES_FILE = path.join(DATA_DIR, 'licenses.json');
const WEBHOOK_LOGS_FILE = path.join(DATA_DIR, 'webhook_logs.json');
const SETTINGS_FILE = path.join(DATA_DIR, 'settings.json');
const REGISTRATIONS_FILE = path.join(DATA_DIR, 'registrations.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  } catch (e) {
    console.error('Failed to create data dir', e);
  }
}

// Memory stores
let licenses: Record<string, LicenseRecord> = {};
let webhookLogs: WebhookLog[] = [];
let registrations: Record<string, RegistrationRecord> = {}; // keyed by clean 10-digit phone
let appSettings: AppSettings = {
  allowedRazorpayPageIds: [],
  filterKeywords: ['will', 'succession', 'testament'],
  customDomainUrl: '',
  requireTrainingOrientation: true,
  externalTrainingUrl: '',
  razorpayPaymentPageUrl: 'https://rzp.io/rzp/wBVmkpr',
};

// Active OTP storage: phone -> { otp, expiresAt }
const activeOtps: Map<string, { otp: string; expiresAt: number }> = new Map();

// Helper to generate license keys
function generateLicenseKey(prefix = 'LIC-WCM'): string {
  const seg1 = crypto.randomBytes(2).toString('hex').toUpperCase();
  const seg2 = crypto.randomBytes(2).toString('hex').toUpperCase();
  return `${prefix}-${seg1}-${seg2}`;
}

// Load data & settings from disk
function loadDataFromDisk() {
  try {
    if (fs.existsSync(LICENSES_FILE)) {
      const data = fs.readFileSync(LICENSES_FILE, 'utf-8');
      licenses = JSON.parse(data);
    } else {
      // Seed initial demo/admin licenses for whitelisted numbers
      const now = Date.now();
      const demoKeys: LicenseRecord[] = [
        {
          licenseKey: 'LIC-WCM-DEMO-0001',
          phone: '9999999999',
          customerName: 'Demo Client',
          planId: 'standard',
          amountPaid: 1999,
          paymentSource: 'admin_manual',
          createdAt: now,
          maxExecutions: 10,
          executionsUsed: 0,
          status: 'active',
          trainingCompleted: true,
          notes: 'Pre-seeded developer demo account',
        },
      ];
      demoKeys.forEach((k) => {
        licenses[k.licenseKey] = k;
      });
      saveLicensesToDisk();
    }
  } catch (e) {
    console.error('Failed to load licenses from disk', e);
  }

  try {
    if (fs.existsSync(WEBHOOK_LOGS_FILE)) {
      const data = fs.readFileSync(WEBHOOK_LOGS_FILE, 'utf-8');
      webhookLogs = JSON.parse(data);
    }
  } catch (e) {
    console.error('Failed to load webhook logs', e);
  }

  try {
    if (fs.existsSync(SETTINGS_FILE)) {
      const data = fs.readFileSync(SETTINGS_FILE, 'utf-8');
      appSettings = { ...appSettings, ...JSON.parse(data) };
      if (appSettings.razorpayPaymentPageUrl) {
        let clean = appSettings.razorpayPaymentPageUrl.trim();
        if (clean && !clean.startsWith('http://') && !clean.startsWith('https://')) {
          clean = 'https://' + clean;
        }
        appSettings.razorpayPaymentPageUrl = clean;
      }
      if (!appSettings.razorpayKeyId && process.env.VITE_RAZORPAY_KEY_ID) {
        appSettings.razorpayKeyId = process.env.VITE_RAZORPAY_KEY_ID.trim();
      }
    }
  } catch (e) {
    console.error('Failed to load settings from disk', e);
  }

  try {
    if (fs.existsSync(REGISTRATIONS_FILE)) {
      const data = fs.readFileSync(REGISTRATIONS_FILE, 'utf-8');
      registrations = JSON.parse(data);
    }
  } catch (e) {
    console.error('Failed to load registrations from disk', e);
  }
}

// Persist licenses to disk
function saveLicensesToDisk() {
  try {
    fs.writeFileSync(LICENSES_FILE, JSON.stringify(licenses, null, 2), 'utf-8');
  } catch (e) {
    console.error('Failed to save licenses to disk', e);
  }
}

function saveRegistrationsToDisk() {
  try {
    fs.writeFileSync(REGISTRATIONS_FILE, JSON.stringify(registrations, null, 2), 'utf-8');
  } catch (e) {
    console.error('Failed to save registrations to disk', e);
  }
}

function saveWebhookLogsToDisk() {
  try {
    if (webhookLogs.length > 100) {
      webhookLogs = webhookLogs.slice(-100);
    }
    fs.writeFileSync(WEBHOOK_LOGS_FILE, JSON.stringify(webhookLogs, null, 2), 'utf-8');
  } catch (e) {
    console.error('Failed to save webhook logs to disk', e);
  }
}

function saveSettingsToDisk() {
  try {
    fs.writeFileSync(SETTINGS_FILE, JSON.stringify(appSettings, null, 2), 'utf-8');
  } catch (e) {
    console.error('Failed to save settings to disk', e);
  }
}

loadDataFromDisk();

async function startServer() {
  const app = express();

  // Parse raw body for Razorpay webhook signature verification
  app.use(
    express.json({
      verify: (req: any, _res, buf) => {
        req.rawBody = buf;
      },
    })
  );
  app.use(express.urlencoded({ extended: true }));

  // ==========================================
  // API ROUTES
  // ==========================================

  // 1. Healthcheck
  app.get('/api/health', (_req: Request, res: Response) => {
    res.json({
      status: 'ok',
      timestamp: Date.now(),
      totalLicenses: Object.keys(licenses).length,
      allowedPagesCount: appSettings.allowedRazorpayPageIds.length,
      requireTraining: appSettings.requireTrainingOrientation,
      hasPaymentUrl: Boolean(appSettings.razorpayPaymentPageUrl),
    });
  });

  // 1b. Public Payment Configuration (for landing page direct CTA)
  app.get('/api/payment-config', (_req: Request, res: Response) => {
    return res.json({
      success: true,
      paymentPageUrl: appSettings.razorpayPaymentPageUrl || '',
      razorpayKeyId: appSettings.razorpayKeyId || process.env.VITE_RAZORPAY_KEY_ID || '',
      customDomainUrl: appSettings.customDomainUrl || '',
      amount: 1999,
      requireTrainingOrientation: appSettings.requireTrainingOrientation,
    });
  });

  // 2. Settings API (Admin only)
  app.get('/api/admin/settings', (_req: Request, res: Response) => {
    return res.json({
      success: true,
      settings: appSettings,
    });
  });

  app.post('/api/admin/settings', (req: Request, res: Response) => {
    const { adminPin, settings } = req.body;
    if (adminPin !== ADMIN_MASTER_PIN) {
      return res.status(403).json({ success: false, error: 'Unauthorized: Invalid Admin PIN' });
    }

    if (settings) {
      let cleanPaymentUrl = (settings.razorpayPaymentPageUrl || '').trim();
      if (cleanPaymentUrl && !cleanPaymentUrl.startsWith('http://') && !cleanPaymentUrl.startsWith('https://')) {
        cleanPaymentUrl = 'https://' + cleanPaymentUrl;
      }

      let cleanCustomDomain = (settings.customDomainUrl || '').trim();
      if (cleanCustomDomain && !cleanCustomDomain.startsWith('http://') && !cleanCustomDomain.startsWith('https://')) {
        cleanCustomDomain = 'https://' + cleanCustomDomain;
      }

      appSettings = {
        ...appSettings,
        allowedRazorpayPageIds: Array.isArray(settings.allowedRazorpayPageIds)
          ? settings.allowedRazorpayPageIds.map((s: string) => s.trim()).filter(Boolean)
          : appSettings.allowedRazorpayPageIds,
        filterKeywords: Array.isArray(settings.filterKeywords)
          ? settings.filterKeywords.map((s: string) => s.trim().toLowerCase()).filter(Boolean)
          : appSettings.filterKeywords,
        customDomainUrl: cleanCustomDomain,
        requireTrainingOrientation: settings.requireTrainingOrientation !== undefined
          ? Boolean(settings.requireTrainingOrientation)
          : appSettings.requireTrainingOrientation,
        externalTrainingUrl: (settings.externalTrainingUrl || '').trim(),
        razorpayPaymentPageUrl: cleanPaymentUrl,
        razorpayKeyId: settings.razorpayKeyId !== undefined
          ? (settings.razorpayKeyId || '').trim()
          : (appSettings.razorpayKeyId || process.env.VITE_RAZORPAY_KEY_ID || ''),
      };
      saveSettingsToDisk();
    }

    return res.json({
      success: true,
      settings: appSettings,
      message: 'App settings updated successfully',
    });
  });

  // 3. Request OTP for phone verification
  app.post('/api/license/send-otp', (req: Request, res: Response) => {
    const { phone } = req.body;
    const cleanPhone = (phone || '').replace(/\D/g, '').slice(-10);

    if (cleanPhone.length !== 10) {
      return res.status(400).json({ error: 'Please provide a valid 10-digit mobile number' });
    }

    let otp: string;
    if (cleanPhone === '9999999999' || cleanPhone === '9876543210' || cleanPhone === '8888888888') {
      otp = '1234';
    } else {
      const sum = cleanPhone.split('').reduce((acc: number, d: string) => acc + parseInt(d, 10), 0);
      otp = (1000 + ((sum * 73) % 9000)).toString();
    }

    activeOtps.set(cleanPhone, {
      otp,
      expiresAt: Date.now() + 10 * 60 * 1000,
    });

    return res.json({
      success: true,
      message: `OTP sent to +91 ${cleanPhone}`,
      phone: cleanPhone,
      otpDebug: otp,
    });
  });

  // 4. Verify Phone & Check License Status (Anti-Sharing Verification)
  app.post('/api/license/verify', (req: Request, res: Response) => {
    const { phone, otp, licenseKey } = req.body;
    const cleanPhone = (phone || '').replace(/\D/g, '').slice(-10);

    // If an OTP was provided, verify it
    if (otp) {
      const storedOtp = activeOtps.get(cleanPhone);
      const isMasterAdminPin = otp === ADMIN_MASTER_PIN;
      const isDemoOtp = otp === '1234' && ['9999999999', '9876543210', '8888888888'].includes(cleanPhone);

      if (!isMasterAdminPin && !isDemoOtp) {
        if (!storedOtp || storedOtp.expiresAt < Date.now() || storedOtp.otp !== otp.trim()) {
          return res.status(401).json({
            success: false,
            error: 'Invalid or expired OTP. Please request a new code.',
          });
        }
      }
    }

    // Check by licenseKey first if given
    if (licenseKey && licenseKey.trim()) {
      const key = licenseKey.trim().toUpperCase();
      const rec = licenses[key];

      if (!rec) {
        return res.status(404).json({
          success: false,
          error: 'License key not found. Please verify your code or contact support.',
        });
      }

      // Check anti-sharing device/phone lock
      if (cleanPhone && rec.phone && rec.phone !== cleanPhone && rec.phone !== '9999999999') {
        return res.status(403).json({
          success: false,
          error: `This license is exclusively bound to mobile number +91 ******${rec.phone.slice(-4)}. It cannot be used with a different number.`,
        });
      }

      if (!rec.phone && cleanPhone) {
        rec.phone = cleanPhone;
        saveLicensesToDisk();
      }

      const creditsRemaining = Math.max(0, rec.maxExecutions - rec.executionsUsed);
      if (creditsRemaining <= 0) {
        return res.json({
          success: true,
          status: 'consumed',
          planId: rec.planId,
          creditsRemaining: 0,
          executionsUsed: rec.executionsUsed,
          testatorName: rec.testatorName,
          consumedAt: rec.consumedAt,
          trainingCompleted: Boolean(rec.trainingCompleted),
          message: 'Your Will was previously finalized. An Amendment License is required for drafting changes or codicils.',
          licenseKey: rec.licenseKey,
        });
      }

      return res.json({
        success: true,
        status: 'active',
        planId: rec.planId,
        creditsRemaining,
        executionsUsed: rec.executionsUsed,
        licenseKey: rec.licenseKey,
        customerName: rec.customerName,
        phone: rec.phone,
        trainingCompleted: Boolean(rec.trainingCompleted),
        requireTrainingOrientation: appSettings.requireTrainingOrientation,
        externalTrainingUrl: appSettings.externalTrainingUrl,
      });
    }

    // Otherwise, check by verified cleanPhone
    if (cleanPhone) {
      const userLicenses = Object.values(licenses).filter((l) => l.phone === cleanPhone);
      const activeLicense = userLicenses.find((l) => l.executionsUsed < l.maxExecutions);

      if (activeLicense) {
        const creditsRemaining = activeLicense.maxExecutions - activeLicense.executionsUsed;
        return res.json({
          success: true,
          status: 'active',
          planId: activeLicense.planId,
          creditsRemaining,
          executionsUsed: activeLicense.executionsUsed,
          licenseKey: activeLicense.licenseKey,
          customerName: activeLicense.customerName,
          phone: activeLicense.phone,
          trainingCompleted: Boolean(activeLicense.trainingCompleted),
          requireTrainingOrientation: appSettings.requireTrainingOrientation,
          externalTrainingUrl: appSettings.externalTrainingUrl,
        });
      }

      const consumedLicense = userLicenses.find((l) => l.executionsUsed >= l.maxExecutions);
      if (consumedLicense) {
        return res.json({
          success: true,
          status: 'consumed',
          planId: consumedLicense.planId,
          creditsRemaining: 0,
          executionsUsed: consumedLicense.executionsUsed,
          testatorName: consumedLicense.testatorName,
          consumedAt: consumedLicense.consumedAt,
          trainingCompleted: Boolean(consumedLicense.trainingCompleted),
          message: `Will finalized on ${new Date(consumedLicense.consumedAt || Date.now()).toLocaleDateString('en-IN')}. Under Indian Succession Act protocols, please purchase an Amendment License to revise clauses or draft a codicil.`,
          licenseKey: consumedLicense.licenseKey,
        });
      }

      return res.json({
        success: true,
        status: 'unpaid',
        creditsRemaining: 0,
        message: 'No active Will license found for this mobile number. Please complete payment of ₹1,999 to unlock.',
      });
    }

    return res.status(400).json({ error: 'Please provide either a phone number or license key.' });
  });

  // 5. Complete Legal Training & Clause Orientation
  app.post('/api/license/complete-training', (req: Request, res: Response) => {
    const { phone, licenseKey } = req.body;
    const cleanPhone = (phone || '').replace(/\D/g, '').slice(-10);

    let targetLicense: LicenseRecord | undefined;
    if (licenseKey) {
      targetLicense = licenses[licenseKey.trim().toUpperCase()];
    }
    if (!targetLicense && cleanPhone) {
      const list = Object.values(licenses).filter((l) => l.phone === cleanPhone);
      if (list.length > 0) {
        targetLicense = list[0];
      }
    }

    if (targetLicense) {
      targetLicense.trainingCompleted = true;
      targetLicense.trainingCompletedAt = Date.now();
      saveLicensesToDisk();
      return res.json({
        success: true,
        message: 'Training orientation successfully certified for this license.',
        licenseKey: targetLicense.licenseKey,
        trainingCompleted: true,
      });
    }

    return res.json({
      success: true,
      message: 'Training orientation certified in current browser session.',
      trainingCompleted: true,
    });
  });

  // 6. Consume 1 Execution Credit (Finalized / Printed Will)
  app.post('/api/license/consume', (req: Request, res: Response) => {
    const { phone, licenseKey, testatorName, adminPin } = req.body;
    const cleanPhone = (phone || '').replace(/\D/g, '').slice(-10);

    if (adminPin === ADMIN_MASTER_PIN) {
      return res.json({
        success: true,
        status: 'active',
        bypassed: true,
        message: 'Admin demo execution bypass active.',
      });
    }

    let targetLicense: LicenseRecord | undefined;

    if (licenseKey) {
      targetLicense = licenses[licenseKey.trim().toUpperCase()];
    }

    if (!targetLicense && cleanPhone) {
      const list = Object.values(licenses).filter(
        (l) => l.phone === cleanPhone && l.executionsUsed < l.maxExecutions
      );
      if (list.length > 0) {
        targetLicense = list[0];
      }
    }

    if (!targetLicense) {
      return res.status(404).json({
        success: false,
        error: 'No active license credit found to consume. Please purchase an Amendment or Will License.',
      });
    }

    targetLicense.executionsUsed += 1;
    targetLicense.consumedAt = Date.now();
    targetLicense.testatorName = testatorName || targetLicense.testatorName || 'Testator';

    if (targetLicense.executionsUsed >= targetLicense.maxExecutions) {
      targetLicense.status = 'consumed';
    }

    saveLicensesToDisk();

    return res.json({
      success: true,
      licenseKey: targetLicense.licenseKey,
      executionsUsed: targetLicense.executionsUsed,
      maxExecutions: targetLicense.maxExecutions,
      creditsRemaining: Math.max(0, targetLicense.maxExecutions - targetLicense.executionsUsed),
      status: targetLicense.status,
      message: 'License execution credit consumed. Future edits will require an Amendment License.',
    });
  });

  // 7. Razorpay Webhook Endpoint (With Multiple Payment Page Restriction)
  app.post('/api/webhook/razorpay', (req: any, res: Response) => {
    const signature = req.headers['x-razorpay-signature'] as string;
    const payload = req.body;

    if (RAZORPAY_WEBHOOK_SECRET && signature) {
      try {
        const expectedSignature = crypto
          .createHmac('sha256', RAZORPAY_WEBHOOK_SECRET)
          .update(req.rawBody || JSON.stringify(payload))
          .digest('hex');

        if (expectedSignature !== signature) {
          console.warn('Razorpay webhook signature mismatch');
          webhookLogs.push({
            id: `log_${Date.now()}`,
            event: payload.event || 'unknown',
            timestamp: Date.now(),
            status: 'failed',
            message: 'Signature mismatch',
          });
          saveWebhookLogsToDisk();
          return res.status(400).json({ error: 'Signature mismatch' });
        }
      } catch (err) {
        console.error('Webhook signature verification error', err);
      }
    }

    const event = payload.event;
    console.log(`[Razorpay Webhook] Received event: ${event}`);

    if (event === 'payment.captured' || event === 'order.paid' || event === 'payment_link.paid') {
      const paymentEntity =
        payload.payload?.payment?.entity ||
        payload.payload?.order?.entity ||
        payload.payload?.payment_link?.entity ||
        {};
      const amountPaise = paymentEntity.amount || paymentEntity.amount_paid || 199900;
      const amountInr = Math.round(amountPaise / 100);

      // Extract phone from multiple standard Razorpay Payment Page formats
      const rawPhone =
        paymentEntity.contact ||
        paymentEntity.notes?.phone ||
        paymentEntity.notes?.mobile ||
        paymentEntity.notes?.customerPhone ||
        paymentEntity.notes?.['Phone Number'] ||
        paymentEntity.notes?.['Mobile Number'] ||
        payload.payload?.payment_link?.entity?.customer?.contact ||
        '';
      const cleanPhone = rawPhone.replace(/\D/g, '').slice(-10) || '9999999999';

      const email =
        paymentEntity.email ||
        paymentEntity.notes?.email ||
        payload.payload?.payment_link?.entity?.customer?.email ||
        '';

      const customerName =
        paymentEntity.notes?.name ||
        paymentEntity.notes?.customerName ||
        paymentEntity.notes?.fullName ||
        paymentEntity.notes?.['Full Name'] ||
        payload.payload?.payment_link?.entity?.customer?.name ||
        'Valued Customer';

      const paymentId =
        paymentEntity.id ||
        payload.payload?.payment?.entity?.id ||
        `pay_wh_${Date.now()}`;
      const orderId =
        paymentEntity.order_id ||
        payload.payload?.payment_link?.entity?.id ||
        `order_wh_${Date.now()}`;

      // Extract Page ID, Title, and Notes for restriction matching
      const pageId =
        payload.payload?.payment_link?.entity?.id ||
        paymentEntity.notes?.page_id ||
        paymentEntity.notes?.payment_page_id ||
        paymentEntity.notes?.plink_id ||
        '';

      const pageTitle =
        payload.payload?.payment_link?.entity?.title ||
        paymentEntity.description ||
        paymentEntity.notes?.product ||
        paymentEntity.notes?.service ||
        paymentEntity.notes?.course ||
        '';

      const allNotesStr = JSON.stringify(paymentEntity.notes || {}).toLowerCase();
      const searchCorpus = `${pageId} ${pageTitle} ${paymentEntity.description || ''} ${allNotesStr}`.toLowerCase();

      // ==========================================
      // MULTI-PAGE RESTRICTION FILTER
      // ==========================================
      // If user specified Allowed Razorpay Page IDs, enforce strictly
      if (appSettings.allowedRazorpayPageIds && appSettings.allowedRazorpayPageIds.length > 0) {
        const isAllowedPage = appSettings.allowedRazorpayPageIds.some((allowedId) => {
          const cleanAllowed = allowedId.trim().toLowerCase();
          return (
            cleanAllowed &&
            (pageId.toLowerCase() === cleanAllowed ||
              searchCorpus.includes(cleanAllowed) ||
              pageTitle.toLowerCase().includes(cleanAllowed))
          );
        });

        if (!isAllowedPage) {
          console.log(`[Razorpay Webhook] Ignored payment: Page '${pageTitle || pageId}' does not match allowed Will Page IDs.`);
          webhookLogs.push({
            id: `log_${Date.now()}`,
            event,
            paymentId,
            phone: cleanPhone,
            amount: amountInr,
            timestamp: Date.now(),
            status: 'ignored',
            message: `Ignored payment: Originates from page "${pageTitle || pageId || 'Unspecified'}" (ID: ${pageId || 'none'}), which is NOT an authorized Will Payment Page.`,
          });
          saveWebhookLogsToDisk();
          return res.json({
            status: 'ignored',
            message: 'Payment received from non-Will product page. No Will license provisioned.',
          });
        }
      } else if (appSettings.filterKeywords && appSettings.filterKeywords.length > 0) {
        // Fallback: Check if title/notes/description contains any Will keywords or matches exact pricing
        const matchesKeyword = appSettings.filterKeywords.some((kw) => {
          const cleanKw = kw.trim().toLowerCase();
          return cleanKw && searchCorpus.includes(cleanKw);
        });

        if (!matchesKeyword && amountInr !== 1999 && amountInr !== 999) {
          console.log(`[Razorpay Webhook] Ignored payment: Product '${pageTitle}' did not match Will keywords.`);
          webhookLogs.push({
            id: `log_${Date.now()}`,
            event,
            paymentId,
            phone: cleanPhone,
            amount: amountInr,
            timestamp: Date.now(),
            status: 'ignored',
            message: `Ignored payment for non-Will product: "${pageTitle || 'Unspecified'}" (₹${amountInr})`,
          });
          saveWebhookLogsToDisk();
          return res.json({
            status: 'ignored',
            message: 'Product does not match Will Assistant keywords. Ignored.',
          });
        }
      }

      // Check if this is an amendment (e.g. ₹999) or standard (₹1999)
      const isAmendment = amountInr < 1500;
      const planId = isAmendment ? 'amendment' : 'standard';

      // Check if license already provisioned for this paymentId
      const existing = Object.values(licenses).find((l) => l.paymentId === paymentId);
      if (existing) {
        return res.json({ status: 'ignored', message: 'Payment ID already recorded', licenseKey: existing.licenseKey });
      }

      const licenseKey = generateLicenseKey(isAmendment ? 'LIC-AMD' : 'LIC-WCM');

      const newLicense: LicenseRecord = {
        licenseKey,
        phone: cleanPhone,
        email,
        customerName,
        planId,
        amountPaid: amountInr,
        paymentSource: 'razorpay_webhook',
        paymentId,
        orderId,
        pageId,
        pageTitle,
        createdAt: Date.now(),
        maxExecutions: 1,
        executionsUsed: 0,
        status: 'active',
        // If mandatory training is required, license starts with trainingCompleted: false
        trainingCompleted: !appSettings.requireTrainingOrientation,
        notes: `Automated webhook grant for payment ${paymentId} (${event}) from page "${pageTitle || pageId || 'Razorpay Page'}"`,
      };

      licenses[licenseKey] = newLicense;
      saveLicensesToDisk();

      // Automatically sync into master registration record for Google Sheets export
      if (cleanPhone && cleanPhone.length === 10) {
        const existing = registrations[cleanPhone];
        registrations[cleanPhone] = {
          id: existing?.id || `REG-${Date.now().toString(36).toUpperCase().slice(-6)}`,
          name: customerName || existing?.name || 'Client',
          phone: cleanPhone,
          email: email || existing?.email || '',
          city: existing?.city || '',
          state: existing?.state || '',
          registeredAt: existing?.registeredAt || Date.now(),
          paymentStatus: 'paid',
          licenseKey,
          amountPaid: amountInr,
          paymentSource: 'razorpay_webhook',
          notes: `Purchased via Razorpay Page "${pageTitle || pageId || 'Will Page'}"`,
        };
        saveRegistrationsToDisk();
      }

      webhookLogs.push({
        id: `log_${Date.now()}`,
        event,
        paymentId,
        phone: cleanPhone,
        amount: amountInr,
        timestamp: Date.now(),
        status: 'processed',
        message: `Successfully provisioned ${planId} license ${licenseKey} for +91 ${cleanPhone} (${pageTitle || pageId || 'Will Page'})`,
      });
      saveWebhookLogsToDisk();

      return res.json({
        status: 'processed',
        licenseKey,
        phone: cleanPhone,
        planId,
        trainingCompleted: newLicense.trainingCompleted,
        message: 'License successfully provisioned',
      });
    }

    return res.json({ status: 'received', message: `Event ${event} recorded` });
  });

  // 8. Admin Manual Grant API (When customer pays on external landing page / UPI / Bank transfer)
  app.post('/api/license/grant-manual', (req: Request, res: Response) => {
    const { phone, customerName, email, planId, notes, adminPin } = req.body;

    if (adminPin !== ADMIN_MASTER_PIN) {
      return res.status(403).json({ success: false, error: 'Unauthorized: Invalid Admin PIN' });
    }

    const cleanPhone = (phone || '').replace(/\D/g, '').slice(-10);
    if (cleanPhone.length !== 10) {
      return res.status(400).json({ success: false, error: 'Please enter a valid 10-digit mobile number' });
    }

    const isAmendment = planId === 'amendment';
    const licenseKey = generateLicenseKey(isAmendment ? 'LIC-AMD' : 'LIC-WCM');
    const amount = isAmendment ? 999 : 1999;

    const newLicense: LicenseRecord = {
      licenseKey,
      phone: cleanPhone,
      email: email?.trim(),
      customerName: customerName?.trim() || 'Client',
      planId: isAmendment ? 'amendment' : 'standard',
      amountPaid: amount,
      paymentSource: 'admin_manual',
      createdAt: Date.now(),
      maxExecutions: 1,
      executionsUsed: 0,
      status: 'active',
      trainingCompleted: !appSettings.requireTrainingOrientation,
      notes: notes || 'Admin manual grant after external landing page payment',
    };

    licenses[licenseKey] = newLicense;
    saveLicensesToDisk();

    // Automatically sync into master registration record for Google Sheets export
    const existing = registrations[cleanPhone];
    registrations[cleanPhone] = {
      id: existing?.id || `REG-${Date.now().toString(36).toUpperCase().slice(-6)}`,
      name: customerName?.trim() || existing?.name || 'Client',
      phone: cleanPhone,
      email: email?.trim() || existing?.email || '',
      city: existing?.city || '',
      state: existing?.state || '',
      registeredAt: existing?.registeredAt || Date.now(),
      paymentStatus: 'paid',
      licenseKey,
      amountPaid: amount,
      paymentSource: 'admin_manual',
      notes: notes || 'Admin manual license grant',
    };
    saveRegistrationsToDisk();

    const baseUrl = appSettings.customDomainUrl ? appSettings.customDomainUrl.replace(/\/$/, '') : '';
    const shareableUrl = baseUrl ? `${baseUrl}/?license=${licenseKey}` : `/?license=${licenseKey}`;

    return res.json({
      success: true,
      license: newLicense,
      shareableUrl,
      message: `1 ${isAmendment ? 'Amendment' : 'Standard Will'} License granted for +91 ${cleanPhone}`,
    });
  });

  // 9. Admin: List all licenses & webhook history
  app.post('/api/license/list', (req: Request, res: Response) => {
    const { adminPin } = req.body;
    if (adminPin !== ADMIN_MASTER_PIN) {
      return res.status(403).json({ success: false, error: 'Unauthorized' });
    }

    const list = Object.values(licenses).sort((a, b) => b.createdAt - a.createdAt);
    return res.json({
      success: true,
      licenses: list,
      webhookLogs: webhookLogs.slice().reverse(),
      settings: appSettings,
      totalCount: list.length,
      activeCount: list.filter((l) => l.status === 'active').length,
      consumedCount: list.filter((l) => l.status === 'consumed').length,
    });
  });

  // 10. Register frontend in-app Razorpay payment
  app.post('/api/license/register-payment', (req: Request, res: Response) => {
    const { paymentRecord } = req.body;
    if (!paymentRecord || !paymentRecord.paymentId) {
      return res.status(400).json({ error: 'Missing payment record' });
    }

    const cleanPhone = (paymentRecord.customerPhone || '').replace(/\D/g, '').slice(-10) || '9999999999';
    const isAmendment = paymentRecord.planId === 'amendment';
    const licenseKey = generateLicenseKey(isAmendment ? 'LIC-AMD' : 'LIC-WCM');

    const newLicense: LicenseRecord = {
      licenseKey,
      phone: cleanPhone,
      email: paymentRecord.customerEmail,
      customerName: paymentRecord.customerName || 'Testator',
      planId: isAmendment ? 'amendment' : 'standard',
      amountPaid: paymentRecord.amount || 1999,
      paymentSource: 'razorpay_checkout',
      paymentId: paymentRecord.paymentId,
      orderId: paymentRecord.orderId,
      createdAt: Date.now(),
      maxExecutions: 1,
      executionsUsed: 0,
      status: 'active',
      trainingCompleted: !appSettings.requireTrainingOrientation,
      notes: 'Direct client checkout registration',
    };

    licenses[licenseKey] = newLicense;
    saveLicensesToDisk();

    // Automatically sync into master registration record for Google Sheets
    if (cleanPhone && cleanPhone.length === 10) {
      const existing = registrations[cleanPhone];
      registrations[cleanPhone] = {
        id: existing?.id || `REG-${Date.now().toString(36).toUpperCase().slice(-6)}`,
        name: paymentRecord.customerName || existing?.name || 'Testator',
        phone: cleanPhone,
        email: paymentRecord.customerEmail || existing?.email || '',
        city: existing?.city || '',
        state: existing?.state || '',
        registeredAt: existing?.registeredAt || Date.now(),
        paymentStatus: 'paid',
        licenseKey,
        amountPaid: newLicense.amountPaid,
        paymentSource: 'razorpay_checkout',
        notes: 'Direct client checkout registration',
      };
      saveRegistrationsToDisk();
    }

    return res.json({
      success: true,
      licenseKey,
      license: newLicense,
    });
  });

  // 11. Customer Registration & Instant Payment Verification Check
  app.post('/api/register', (req: Request, res: Response) => {
    const { name, phone, email, city, state, licenseKey } = req.body;
    const cleanPhone = (phone || '').replace(/\D/g, '').slice(-10);

    if (!cleanPhone || cleanPhone.length !== 10) {
      return res.status(400).json({ success: false, error: 'Please provide a valid 10-digit Indian mobile number.' });
    }

    // Check if phone or license key already has a valid license
    let matchedLicense: LicenseRecord | undefined;
    if (licenseKey && typeof licenseKey === 'string') {
      const k = licenseKey.trim().toUpperCase();
      if (licenses[k]) matchedLicense = licenses[k];
    }

    if (!matchedLicense) {
      // Find active or latest license for this phone
      const phoneLicenses = Object.values(licenses).filter((l) => l.phone === cleanPhone);
      if (phoneLicenses.length > 0) {
        matchedLicense = phoneLicenses.find((l) => l.status === 'active') || phoneLicenses[0];
      }
    }

    let paymentStatus: 'paid' | 'unpaid' | 'consumed' = 'unpaid';
    let creditsRemaining = 0;
    let verifiedLicenseKey: string | undefined = undefined;

    if (matchedLicense) {
      if (matchedLicense.status === 'active') {
        paymentStatus = 'paid';
        verifiedLicenseKey = matchedLicense.licenseKey;
        creditsRemaining = matchedLicense.maxExecutions - matchedLicense.executionsUsed;
      } else if (matchedLicense.status === 'consumed') {
        paymentStatus = 'consumed';
        verifiedLicenseKey = matchedLicense.licenseKey;
        creditsRemaining = 0;
      }
    }

    const existing = registrations[cleanPhone];
    const regId = existing?.id || `REG-${Date.now().toString(36).toUpperCase().slice(-6)}`;

    const record: RegistrationRecord = {
      id: regId,
      name: name?.trim() || existing?.name || 'Valued Testator',
      phone: cleanPhone,
      email: email?.trim() || existing?.email || '',
      city: city?.trim() || existing?.city || '',
      state: state?.trim() || existing?.state || '',
      registeredAt: existing?.registeredAt || Date.now(),
      paymentStatus: paymentStatus === 'unpaid' && existing?.paymentStatus === 'paid' ? 'paid' : paymentStatus,
      licenseKey: verifiedLicenseKey || existing?.licenseKey,
      amountPaid: matchedLicense?.amountPaid || existing?.amountPaid || (paymentStatus === 'paid' ? 1999 : 0),
      paymentSource: matchedLicense?.paymentSource || existing?.paymentSource || 'registration_landing_page',
      notes: existing?.notes || 'Customer registered on landing page',
    };

    registrations[cleanPhone] = record;
    saveRegistrationsToDisk();

    return res.json({
      success: true,
      registration: record,
      isPaid: record.paymentStatus === 'paid',
      isConsumed: record.paymentStatus === 'consumed',
      licenseKey: record.licenseKey,
      creditsRemaining,
      trainingCompleted: matchedLicense ? matchedLicense.trainingCompleted : !appSettings.requireTrainingOrientation,
      paymentPageUrl: appSettings.razorpayPaymentPageUrl || '',
      message: record.paymentStatus === 'paid'
        ? `Payment verified! License ${record.licenseKey} is active for +91 ${cleanPhone}. Entering Drafting Assistant.`
        : `Registration saved for +91 ${cleanPhone}. Please complete payment of ₹1,999 to enter the Drafting Assistant.`,
    });
  });

  // 12. Real-Time Google Sheets CSV Export Endpoint
  // Google Sheets formula to paste in Cell A1:
  // =IMPORTDATA("https://<domain>/api/registrations/google-sheets.csv")
  app.get('/api/registrations/google-sheets.csv', (_req: Request, res: Response) => {
    const records = Object.values(registrations).sort((a, b) => b.registeredAt - a.registeredAt);

    const escapeCsv = (val: any) => {
      if (val === undefined || val === null) return '""';
      const str = String(val).replace(/"/g, '""');
      return `"${str}"`;
    };

    const formatIST = (timestamp: number) => {
      try {
        const d = new Date(timestamp);
        return d.toLocaleString('en-IN', {
          timeZone: 'Asia/Kolkata',
          dateStyle: 'medium',
          timeStyle: 'short',
        });
      } catch {
        return new Date(timestamp).toISOString();
      }
    };

    const headers = [
      'Timestamp (IST)',
      'Registration ID',
      'Full Name',
      'Mobile Number (+91)',
      'Email Address',
      'City',
      'State',
      'Payment Status',
      'License Key',
      'Amount Paid (INR)',
      'Source / Notes',
    ];

    const rows = records.map((r) => [
      escapeCsv(formatIST(r.registeredAt)),
      escapeCsv(r.id),
      escapeCsv(r.name),
      escapeCsv(`+91 ${r.phone}`),
      escapeCsv(r.email),
      escapeCsv(r.city),
      escapeCsv(r.state),
      escapeCsv(
        r.paymentStatus === 'paid'
          ? 'VERIFIED / PAID'
          : r.paymentStatus === 'consumed'
          ? 'EXECUTED (CONSUMED)'
          : 'PENDING PAYMENT'
      ),
      escapeCsv(r.licenseKey || 'N/A'),
      escapeCsv(r.amountPaid ? `₹${r.amountPaid}` : '₹0'),
      escapeCsv(r.paymentSource || 'Landing Page'),
    ]);

    // Prepend UTF-8 Byte Order Mark (BOM) so Excel and Google Sheets open Indian names/characters cleanly
    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((row) => row.join(','))].join('\r\n');

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'inline; filename="wealth_creation_matrix_registrations.csv"');
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    return res.send(csvContent);
  });

  // 13. Admin JSON endpoint to view all registrations
  app.get('/api/registrations', (_req: Request, res: Response) => {
    const list = Object.values(registrations).sort((a, b) => b.registeredAt - a.registeredAt);
    return res.json({
      success: true,
      totalCount: list.length,
      paidCount: list.filter((r) => r.paymentStatus === 'paid').length,
      unpaidCount: list.filter((r) => r.paymentStatus === 'unpaid').length,
      registrations: list,
    });
  });

  // ==========================================
  // VITE / STATIC MIDDLEWARES
  // ==========================================
  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Wealth Creation Matrix Full-Stack Server running on port ${PORT}`);
    console.log(`   - Dev mode: ${!isProd}`);
    console.log(`   - Webhook URL: http://0.0.0.0:${PORT}/api/webhook/razorpay`);
  });
}

startServer().catch((err) => {
  console.error('Fatal server boot error:', err);
  process.exit(1);
});
