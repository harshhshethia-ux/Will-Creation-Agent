/**
 * Formats a date string into Indian legal standard date format: "12 October 2026".
 */
export function formatIndianDate(dateStr?: string): string {
  if (!dateStr) return '____________';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  
  const day = d.getDate();
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  const month = months[d.getMonth()];
  const year = d.getFullYear();
  return `${day} ${month} ${year}`;
}

/**
 * Calculates age in full years from date of birth string (YYYY-MM-DD).
 */
export function calculateAge(dobStr?: string): number | null {
  if (!dobStr) return null;
  const dob = new Date(dobStr);
  if (isNaN(dob.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const m = today.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) {
    age--;
  }
  return age >= 0 ? age : 0;
}

const ONES = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
  'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
const TENS = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

function convertBelowThousand(n: number): string {
  let str = '';
  if (n >= 100) {
    str += ONES[Math.floor(n / 100)] + ' Hundred ';
    n %= 100;
  }
  if (n >= 20) {
    str += TENS[Math.floor(n / 10)] + (n % 10 ? ' ' + ONES[n % 10] : '');
  } else if (n > 0) {
    str += ONES[n];
  }
  return str.trim();
}

/**
 * Converts Indian Rupee number into standard Indian words,
 * e.g. 500000 -> "Rupees Five Lakh only"
 * e.g. 10000000 -> "Rupees One Crore only"
 */
export function formatIndianCurrencyWords(amount: number): string {
  if (isNaN(amount) || amount === 0) return 'Rupees Zero only';

  const isNegative = amount < 0;
  let num = Math.floor(Math.abs(amount));

  const crore = Math.floor(num / 10000000);
  num %= 10000000;
  const lakh = Math.floor(num / 100000);
  num %= 100000;
  const thousand = Math.floor(num / 1000);
  num %= 1000;
  const remainder = num;

  const parts: string[] = [];

  if (crore > 0) {
    parts.push(convertBelowThousand(crore) + ' Crore');
  }
  if (lakh > 0) {
    parts.push(convertBelowThousand(lakh) + ' Lakh');
  }
  if (thousand > 0) {
    parts.push(convertBelowThousand(thousand) + ' Thousand');
  }
  if (remainder > 0) {
    parts.push(convertBelowThousand(remainder));
  }

  const result = (isNegative ? 'Minus ' : '') + 'Rupees ' + parts.join(' ').trim() + ' only';
  return result;
}

/**
 * Formats a currency number with Indian commas: e.g. 500000 -> Rs. 5,00,000
 */
export function formatIndianCurrency(amount: number): string {
  if (isNaN(amount)) return 'Rs. 0';
  return `Rs. ${amount.toLocaleString('en-IN')}`;
}

/**
 * Combined figure and words as required by legal guidelines:
 * "Rs. 5,00,000 (Rupees Five Lakh only)"
 */
export function formatAmountWithWords(amount: number): string {
  return `${formatIndianCurrency(amount)} (${formatIndianCurrencyWords(amount)})`;
}
