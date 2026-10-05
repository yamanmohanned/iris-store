/**
 * Calendar days in a named IANA time zone (the store's), independent of the server's own zone.
 * Days are "YYYY-MM-DD" strings, which is also what `<input type="date">` reads and writes.
 */

const DAY = /^(\d{4})-(\d{2})-(\d{2})$/;

const partsFormatters = new Map<string, Intl.DateTimeFormat>();

function partsFormatter(timeZone: string): Intl.DateTimeFormat {
  let f = partsFormatters.get(timeZone);
  if (!f) {
    f = new Intl.DateTimeFormat("en-US", {
      timeZone,
      hourCycle: "h23",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
    partsFormatters.set(timeZone, f);
  }
  return f;
}

function wallClock(instant: number, timeZone: string) {
  const parts = partsFormatter(timeZone).formatToParts(new Date(instant));
  const v = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((p) => p.type === type)?.value ?? 0);
  return {
    year: v("year"),
    month: v("month"),
    day: v("day"),
    hour: v("hour") % 24,
    minute: v("minute"),
    second: v("second"),
  };
}

/** Milliseconds the zone is ahead of UTC at `instant` (Baghdad: +3h). */
function offsetMs(instant: number, timeZone: string): number {
  const w = wallClock(instant, timeZone);
  const asUtc = Date.UTC(w.year, w.month - 1, w.day, w.hour, w.minute, w.second);
  return asUtc - Math.floor(instant / 1000) * 1000;
}

const pad = (n: number, width = 2) => String(n).padStart(width, "0");

export function isDay(value: string): boolean {
  const m = DAY.exec(value);
  if (!m) return false;
  const d = new Date(Date.UTC(+m[1]!, +m[2]! - 1, +m[3]!));
  return (
    d.getUTCFullYear() === +m[1]! && d.getUTCMonth() === +m[2]! - 1 && d.getUTCDate() === +m[3]!
  );
}

/** The calendar day an instant falls on in `timeZone`. */
export function dayInZone(instant: Date, timeZone: string): string {
  const w = wallClock(instant.getTime(), timeZone);
  return `${pad(w.year, 4)}-${pad(w.month)}-${pad(w.day)}`;
}

/** The instant a calendar day begins in `timeZone` ("2026-10-31" in Baghdad → 2026-10-30T21:00Z). */
export function startOfDayInZone(day: string, timeZone: string): Date {
  if (!isDay(day)) throw new RangeError(`invalid day: ${day}`);
  const [y, m, d] = day.split("-").map(Number) as [number, number, number];
  const utcMidnight = Date.UTC(y, m - 1, d);
  const guess = utcMidnight - offsetMs(utcMidnight, timeZone);
  // Re-evaluate the offset at the result so days that start right after a DST change are exact.
  return new Date(utcMidnight - offsetMs(guess, timeZone));
}

export function addDays(day: string, days: number): string {
  if (!isDay(day)) throw new RangeError(`invalid day: ${day}`);
  const [y, m, d] = day.split("-").map(Number) as [number, number, number];
  const next = new Date(Date.UTC(y, m - 1, d + days));
  return `${pad(next.getUTCFullYear(), 4)}-${pad(next.getUTCMonth() + 1)}-${pad(next.getUTCDate())}`;
}
