// Indian number formatting (lakhs / crores)
export function formatINR(value, { compact = false, sign = false } = {}) {
  const num = Number(value ?? 0);
  const abs = Math.abs(num);
  const prefix = sign && num > 0 ? "+" : num < 0 ? "-" : "";

  if (compact) {
    if (abs >= 1_00_00_000) {
      return `${prefix}₹${(abs / 1_00_00_000).toFixed(2)} Cr`;
    }
    if (abs >= 1_00_000) {
      return `${prefix}₹${(abs / 1_00_000).toFixed(2)} L`;
    }
    if (abs >= 1_000) {
      return `${prefix}₹${(abs / 1_000).toFixed(1)}K`;
    }
  }

  const formatted = new Intl.NumberFormat("en-IN", {
    maximumFractionDigits: 2,
    minimumFractionDigits: 0,
  }).format(abs);
  return `${prefix}₹${formatted}`;
}

export function formatShortDate(iso) {
  if (!iso) return "";
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y.slice(2)}`;
}

export function formatLongDate(iso) {
  if (!iso) return "";
  const dt = new Date(iso + "T00:00:00");
  return dt.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

export const MONTH_LABELS_SHORT = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];
export const MONTH_LABELS_LONG = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];