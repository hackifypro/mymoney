/**
 * IST (Indian Standard Time, UTC +05:30) Date and Time Utilities
 */

/**
 * Returns current Date in IST
 */
export function getISTNow(): Date {
  const now = new Date();
  // IST offset is +5 hours 30 mins
  const istOffsetMs = (5 * 60 + 30) * 60 * 1000;
  const utc = now.getTime() + now.getTimezoneOffset() * 60 * 1000;
  return new Date(utc + istOffsetMs);
}

/**
 * Returns current date in YYYY-MM-DD formatted for HTML date inputs in IST
 */
export function getCurrentISTDate(): string {
  const ist = getISTNow();
  const year = ist.getFullYear();
  const month = String(ist.getMonth() + 1).padStart(2, '0');
  const day = String(ist.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Returns current time in HH:mm (or HH:mm:ss) formatted for HTML time inputs in IST
 */
export function getCurrentISTTime(includeSeconds = false): string {
  const ist = getISTNow();
  const hours = String(ist.getHours()).padStart(2, '0');
  const minutes = String(ist.getMinutes()).padStart(2, '0');
  const seconds = String(ist.getSeconds()).padStart(2, '0');
  return includeSeconds ? `${hours}:${minutes}:${seconds}` : `${hours}:${minutes}`;
}

/**
 * Formats YYYY-MM-DD into readable "02 Nov 2026" or "Nov 02, 2026"
 */
export function formatDisplayDate(dateStr?: string): string {
  if (!dateStr) return '—';
  try {
    // Avoid UTC shift by splitting year, month, day
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      const d = new Date(year, month, day);
      return d.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
    }
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

/**
 * Formats HH:mm or HH:mm:ss into 12-hour AM/PM format (e.g., "07:30 PM")
 */
export function formatDisplayTime(timeStr?: string): string {
  if (!timeStr) return '—';
  try {
    const parts = timeStr.split(':');
    if (parts.length >= 2) {
      let hours = parseInt(parts[0], 10);
      const minutes = parts[1];
      const ampm = hours >= 12 ? 'PM' : 'AM';
      hours = hours % 12;
      hours = hours ? hours : 12; // 0 hour should be 12
      const strHours = String(hours).padStart(2, '0');
      return `${strHours}:${minutes} ${ampm}`;
    }
    return timeStr;
  } catch {
    return timeStr;
  }
}

/**
 * Formats a number into Indian Rupee format (e.g. ₹5,000 or ₹1,25,000.00)
 */
export function formatINR(amount: number, showDecimals = false): string {
  if (isNaN(amount) || amount === null || amount === undefined) return '₹0';
  const hasDecimals = showDecimals || amount % 1 !== 0;
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: hasDecimals ? 2 : 0,
    maximumFractionDigits: hasDecimals ? 2 : 0,
  }).format(amount);
}

/**
 * Helper to determine date ranges (today, this_week, this_month, this_year)
 */
export function getPresetDateRange(preset: string): { start: string; end: string } {
  const ist = getISTNow();
  const todayStr = getCurrentISTDate();

  if (preset === 'today') {
    return { start: todayStr, end: todayStr };
  }

  if (preset === 'this_week') {
    // Find Monday of this week
    const day = ist.getDay();
    const diff = ist.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is sunday
    const monday = new Date(ist.setDate(diff));
    const startStr = `${monday.getFullYear()}-${String(monday.getMonth() + 1).padStart(2, '0')}-${String(monday.getDate()).padStart(2, '0')}`;
    return { start: startStr, end: todayStr };
  }

  if (preset === 'this_month') {
    const year = ist.getFullYear();
    const month = String(ist.getMonth() + 1).padStart(2, '0');
    return { start: `${year}-${month}-01`, end: todayStr };
  }

  if (preset === 'this_year') {
    const year = ist.getFullYear();
    return { start: `${year}-01-01`, end: todayStr };
  }

  return { start: '', end: '' };
}

/**
 * Current Month Name for default Rent / Electricity fields
 */
export function getCurrentMonthName(): string {
  const ist = getISTNow();
  return ist.toLocaleString('en-IN', { month: 'long', year: 'numeric' });
}
