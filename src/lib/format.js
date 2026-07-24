const nf = new Intl.NumberFormat("en-US");

export const fmt = (n) => (n == null ? "—" : nf.format(Math.round(n)));
export const fmt1 = (n) => (n == null ? "—" : n.toFixed(1));

// Compact axis labels: 2500 → "2.5k", 5000 → "5k". Keeps narrow axes unclipped.
export const compact = (n) => {
  if (n == null) return "";
  if (Math.abs(n) >= 1000) return (n / 1000).toFixed(n % 1000 === 0 ? 0 : 1).replace(/\.0$/, "") + "k";
  return String(Math.round(n));
};

export const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
export const DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

// Titles come in as "Watched ...", "Searched for ..." — strip the leading verb for display.
export function stripVerb(title) {
  if (!title) return "";
  return title.replace(/^(Watched|Liked|Viewed|Searched for|Dismissed|Shared|Visited)\s+/i, "");
}

export function humanDuration(seconds) {
  if (seconds == null) return "—";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.round(seconds % 60);
  if (h) return `${h}h ${m}m`;
  if (m) return `${m}m ${s}s`;
  return `${s}s`;
}

// "2020-01-01T..." (EAT wall-clock) → "10 Dec 2012"
export function shortDate(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

export function hourLabel(h) {
  const ampm = h < 12 ? "am" : "pm";
  const hr = h % 12 === 0 ? 12 : h % 12;
  return `${hr}${ampm}`;
}
