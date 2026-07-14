const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function isValidDate(value: string | null | undefined): value is string {
  if (!value || !DATE_RE.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export function previousCompleteWeekday(now = new Date()): string {
  const easternParts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);

  const value = Object.fromEntries(easternParts.map((part) => [part.type, part.value]));
  const date = new Date(`${value.year}-${value.month}-${value.day}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() - 1);

  while (date.getUTCDay() === 0 || date.getUTCDay() === 6) {
    date.setUTCDate(date.getUTCDate() - 1);
  }

  return date.toISOString().slice(0, 10);
}

export function shiftDate(value: string, days: number): string {
  const date = new Date(`${value}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}
