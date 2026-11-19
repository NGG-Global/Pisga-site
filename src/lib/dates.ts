/** Calendar dates are handled as ISO strings (YYYY-MM-DD) and "today" is the date in Israel. */

const IL_DATE = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Jerusalem',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

export function todayInIsrael(now: Date = new Date()): string {
  return IL_DATE.format(now);
}

function toUtcMidnight(iso: string): number {
  const [y, m, d] = iso.split('-').map(Number);
  return Date.UTC(y, m - 1, d);
}

/** Whole days from `from` to `to`; negative when `to` is earlier. */
export function daysBetween(from: string, to: string): number {
  return Math.round((toUtcMidnight(to) - toUtcMidnight(from)) / 86_400_000);
}

/** 2026-12-30 -> 30.12.2026 */
export function formatDate(iso: string): string {
  const [y, m, d] = iso.split('-');
  return `${d}.${m}.${y}`;
}

/** 2026-12-30 -> 30.12 */
export function formatDayMonth(iso: string): string {
  const [, m, d] = iso.split('-');
  return `${d}.${m}`;
}

export function pad2(n: number): string {
  return String(n).padStart(2, '0');
}
