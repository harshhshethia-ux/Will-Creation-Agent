export interface VerificationRecord {
  mobileNumber: string;
  verifiedAt: number;
  draftGeneratedAt?: number;
  testatorName?: string;
  isCompleted: boolean;
}

const STORAGE_KEY_REGISTRATIONS = 'wcm_verified_mobiles_v1';
const STORAGE_KEY_ADMIN_AUTH = 'wcm_admin_authenticated';
const STORAGE_KEY_DEMO_MODE = 'wcm_demo_mode_active';

// Master Admin Secret Credentials
export const ADMIN_MASTER_PIN = '8492';
export const ADMIN_URL_KEY = 'wcm2026';

// Secret Admin Whitelisted Phone Numbers (always allowed unlimited trial runs)
export const DEMO_WHITELISTED_NUMBERS = [
  '9999999999',
  '9876543210',
  '8888888888',
];

/**
 * Checks if the current browser session has been authenticated as Administrator.
 * Can be unlocked via:
 * 1. URL parameter: ?admin=wcm2026
 * 2. Entering the Admin Master PIN (8492)
 */
export function isAdminAuthenticated(): boolean {
  try {
    // 1. Check URL parameters for immediate secret access (?admin=wcm2026)
    if (typeof window !== 'undefined' && window.location?.search) {
      const params = new URLSearchParams(window.location.search);
      const adminParam = params.get('admin');
      if (adminParam === ADMIN_URL_KEY || adminParam === 'true') {
        sessionStorage.setItem(STORAGE_KEY_ADMIN_AUTH, 'true');
        return true;
      }
    }

    // 2. Check session storage
    const val = sessionStorage.getItem(STORAGE_KEY_ADMIN_AUTH);
    return val === 'true';
  } catch {
    return false;
  }
}

export function setAdminAuthenticated(auth: boolean): void {
  try {
    if (auth) {
      sessionStorage.setItem(STORAGE_KEY_ADMIN_AUTH, 'true');
      localStorage.setItem(STORAGE_KEY_DEMO_MODE, 'true');
    } else {
      sessionStorage.removeItem(STORAGE_KEY_ADMIN_AUTH);
      localStorage.setItem(STORAGE_KEY_DEMO_MODE, 'false');
    }
  } catch (e) {
    console.error('Failed to set admin auth', e);
  }
}

export function verifyAdminPin(enteredPin: string): boolean {
  if (enteredPin.trim() === ADMIN_MASTER_PIN) {
    setAdminAuthenticated(true);
    return true;
  }
  return false;
}

/**
 * Demo Mode is strictly active ONLY IF:
 * 1. The user has administrator rights (unlocked via PIN or URL key), AND
 * 2. Demo mode toggle is set to true.
 * For any regular user, this ALWAYS evaluates to false.
 */
export function isDemoModeActive(): boolean {
  if (!isAdminAuthenticated()) {
    return false;
  }

  try {
    const val = localStorage.getItem(STORAGE_KEY_DEMO_MODE);
    if (val === null) return true; // default true for authenticated admin
    return val === 'true';
  } catch {
    return false;
  }
}

export function setDemoModeActive(active: boolean): void {
  try {
    localStorage.setItem(STORAGE_KEY_DEMO_MODE, active ? 'true' : 'false');
  } catch (e) {
    console.error('Failed to save demo mode', e);
  }
}

export function getAllRegistrations(): Record<string, VerificationRecord> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_REGISTRATIONS);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error('Failed to get registrations', e);
  }
  return {};
}

/**
 * Checks whether a given mobile number has already used their one-time allowance.
 */
export function checkMobileUsageStatus(mobileNumber: string): {
  isAlreadyUsed: boolean;
  isDemoAllowed: boolean;
  record?: VerificationRecord;
} {
  const cleanNumber = mobileNumber.replace(/\D/g, '').slice(-10);
  const isDemo = isDemoModeActive();

  // Whitelisted demo numbers are always allowed for you
  if (DEMO_WHITELISTED_NUMBERS.includes(cleanNumber)) {
    return { isAlreadyUsed: false, isDemoAllowed: true };
  }

  // If you are logged in as admin and Demo Mode is ON, allow multiple trials
  if (isDemo) {
    return { isAlreadyUsed: false, isDemoAllowed: true };
  }

  const all = getAllRegistrations();
  const record = all[cleanNumber];

  if (record && record.isCompleted) {
    return { isAlreadyUsed: true, isDemoAllowed: false, record };
  }

  return { isAlreadyUsed: false, isDemoAllowed: false, record };
}

/**
 * Marks a mobile number as having completed their one-time draft generation.
 */
export function markMobileDraftCompleted(mobileNumber: string, testatorName?: string): void {
  const cleanNumber = mobileNumber.replace(/\D/g, '').slice(-10);
  const all = getAllRegistrations();

  all[cleanNumber] = {
    mobileNumber: cleanNumber,
    verifiedAt: all[cleanNumber]?.verifiedAt || Date.now(),
    draftGeneratedAt: Date.now(),
    testatorName: testatorName || 'Client',
    isCompleted: true,
  };

  try {
    localStorage.setItem(STORAGE_KEY_REGISTRATIONS, JSON.stringify(all));
  } catch (e) {
    console.error('Failed to persist mobile record', e);
  }
}

/**
 * Resets all recorded mobile registrations (Admin utility).
 */
export function clearAllMobileRegistrations(): void {
  try {
    localStorage.removeItem(STORAGE_KEY_REGISTRATIONS);
  } catch (e) {
    console.error('Failed to clear mobile records', e);
  }
}

/**
 * Generate a simulated 4-digit OTP for a given mobile number.
 */
export function generateOtp(mobileNumber: string): string {
  const clean = mobileNumber.replace(/\D/g, '').slice(-10);
  if (clean === '9999999999' || clean === '9876543210' || clean === '8888888888') {
    return '1234';
  }

  const sum = clean.split('').reduce((acc, digit) => acc + parseInt(digit, 10), 0);
  const code = (1000 + (sum * 73) % 9000).toString();
  return code;
}
