/**
 * Convert free-text schedule lines / loose day lists into ClassScout RecurringProgram fields.
 * Do NOT emit management RecurringSlot (`weekday` / `weekdays[]`) — that is a different product.
 */

export type RecurringProgramDay =
  | "Monday"
  | "Tuesday"
  | "Wednesday"
  | "Thursday"
  | "Friday"
  | "Saturday"
  | "Sunday";

const DAY_ALIASES: Record<string, RecurringProgramDay> = {
  mon: "Monday",
  monday: "Monday",
  tue: "Tuesday",
  tues: "Tuesday",
  tuesday: "Tuesday",
  wed: "Wednesday",
  wednesday: "Wednesday",
  thu: "Thursday",
  thur: "Thursday",
  thurs: "Thursday",
  thursday: "Thursday",
  fri: "Friday",
  friday: "Friday",
  sat: "Saturday",
  saturday: "Saturday",
  sun: "Sunday",
  sunday: "Sunday",
};

export function normalizeDay(raw: string): RecurringProgramDay | null {
  const key = raw.trim().toLowerCase();
  return DAY_ALIASES[key] ?? null;
}

/**
 * Forbidden management shape that caused the sportolok outage — never send this to ClassScout.
 */
export type ForbiddenManagementRecurring = {
  weekdays: string[];
  startTime?: string;
  endTime?: string;
};

export function isForbiddenManagementRecurring(v: unknown): boolean {
  if (!v || typeof v !== "object") return false;
  const o = v as Record<string, unknown>;
  return Array.isArray(o.weekdays);
}

/**
 * Build a minimal RecurringProgram-compatible object for ingest upsert/patch.
 * Callers must still satisfy full ClassScout provider validation (id, title, etc.).
 */
export function toRecurringProgramFields(input: {
  id: string;
  title: string;
  days: string[];
  timeText: string;
  startTime?: string;
  endTime?: string;
}): {
  id: string;
  title: string;
  daysOfWeek: RecurringProgramDay[];
  timeText: string;
  schedule?: { byDay?: RecurringProgramDay[]; startTime?: string; endTime?: string; precision: "exact" | "day_only" };
} {
  const daysOfWeek = input.days
    .map(normalizeDay)
    .filter((d): d is RecurringProgramDay => d != null);
  const hasClock = Boolean(input.startTime && input.endTime);
  return {
    id: input.id,
    title: input.title,
    daysOfWeek,
    timeText: input.timeText,
    schedule: {
      byDay: daysOfWeek,
      ...(hasClock ? { startTime: input.startTime, endTime: input.endTime } : {}),
      precision: hasClock ? "exact" : "day_only",
    },
  };
}

/** Parse lines like "Monday 10:00-11:00" into day + optional times (best-effort). */
export function parseScheduleLine(line: string): {
  day: RecurringProgramDay | null;
  startTime?: string;
  endTime?: string;
  timeText: string;
} {
  const trimmed = line.trim();
  const m = trimmed.match(
    /^(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday|Mon|Tue|Wed|Thu|Fri|Sat|Sun)\b[^\d]*(\d{1,2}:\d{2})?\s*[-–—]?\s*(\d{1,2}:\d{2})?/i,
  );
  if (!m) return { day: null, timeText: trimmed };
  const day = normalizeDay(m[1] || "");
  const startTime = m[2];
  const endTime = m[3];
  return { day, startTime, endTime, timeText: trimmed };
}
