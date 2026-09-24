/**
 * Convert agent-local schedule shapes into management RecurringSlot[].
 * FORBIDDEN input shapes (caused sportolok browse outage):
 *   { weekdays: ["monday","tuesday"], startTime, endTime }  // one object, plural weekdays
 *   ["Monday 10:00-11:00", "Wednesday 15:00-16:00"]         // free-text ContentCard strings
 *
 * REQUIRED output: one object per weekday with singular `weekday: "mon"|…`.
 */

export const WEEKDAYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;
export type Weekday = (typeof WEEKDAYS)[number];

export type RecurringSlot = {
  weekday: Weekday;
  startTime: string;
  endTime?: string;
  from?: string;
  until?: string;
};

const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;

const LONG: Record<string, Weekday> = {
  monday: "mon",
  tuesday: "tue",
  wednesday: "wed",
  thursday: "thu",
  friday: "fri",
  saturday: "sat",
  sunday: "sun",
  mon: "mon",
  tue: "tue",
  wed: "wed",
  thu: "thu",
  fri: "fri",
  sat: "sat",
  sun: "sun",
};

function asWeekday(raw: string): Weekday | null {
  const key = raw.trim().toLowerCase();
  return LONG[key] ?? null;
}

function assertHhmm(t: string, label: string): string {
  if (!HHMM.test(t)) throw new Error(`${label} must be HH:MM (24h), got ${JSON.stringify(t)}`);
  return t;
}

/** Expand a forbidden { weekdays[], startTime, endTime } into legal RecurringSlot[]. */
export function expandWeekdaysEntry(entry: {
  weekdays: string[];
  startTime: string;
  endTime?: string;
  from?: string;
  until?: string;
}): RecurringSlot[] {
  const startTime = assertHhmm(entry.startTime, "startTime");
  const endTime = entry.endTime ? assertHhmm(entry.endTime, "endTime") : undefined;
  const out: RecurringSlot[] = [];
  for (const w of entry.weekdays) {
    const weekday = asWeekday(w);
    if (!weekday) throw new Error(`unknown weekday ${JSON.stringify(w)}`);
    out.push({
      weekday,
      startTime,
      ...(endTime ? { endTime } : {}),
      ...(entry.from ? { from: entry.from } : {}),
      ...(entry.until ? { until: entry.until } : {}),
    });
  }
  return out;
}

/** Parse "Monday 10:00-11:00" / "Wed 15:00" style lines into RecurringSlot. */
export function parseFreeTextSlot(line: string): RecurringSlot {
  const m = line
    .trim()
    .match(/^([A-Za-z]+)\s+(\d{1,2}:\d{2})(?:\s*[-–]\s*(\d{1,2}:\d{2}))?/);
  if (!m) throw new Error(`cannot parse schedule line: ${JSON.stringify(line)}`);
  const weekday = asWeekday(m[1]!);
  if (!weekday) throw new Error(`unknown weekday in ${JSON.stringify(line)}`);
  const pad = (t: string) => (t.length === 4 ? `0${t}` : t);
  const startTime = assertHhmm(pad(m[2]!), "startTime");
  const endTime = m[3] ? assertHhmm(pad(m[3]), "endTime") : undefined;
  return { weekday, startTime, ...(endTime ? { endTime } : {}) };
}

/**
 * Normalize any of: RecurringSlot[], forbidden weekdays-entry[], free-text string[].
 * Always returns legal RecurringSlot[].
 */
export function scheduleToRecurringSlots(input: unknown): RecurringSlot[] {
  if (!Array.isArray(input)) throw new Error("schedule recurring input must be an array");
  const out: RecurringSlot[] = [];
  for (const item of input) {
    if (typeof item === "string") {
      out.push(parseFreeTextSlot(item));
      continue;
    }
    if (item && typeof item === "object") {
      const rec = item as Record<string, unknown>;
      if (Array.isArray(rec.weekdays)) {
        out.push(
          ...expandWeekdaysEntry({
            weekdays: rec.weekdays as string[],
            startTime: String(rec.startTime ?? ""),
            endTime: rec.endTime != null ? String(rec.endTime) : undefined,
            from: rec.from != null ? String(rec.from) : undefined,
            until: rec.until != null ? String(rec.until) : undefined,
          }),
        );
        continue;
      }
      if (typeof rec.weekday === "string" && typeof rec.startTime === "string") {
        const weekday = asWeekday(rec.weekday);
        if (!weekday) throw new Error(`unknown weekday ${JSON.stringify(rec.weekday)}`);
        out.push({
          weekday,
          startTime: assertHhmm(rec.startTime, "startTime"),
          ...(rec.endTime != null ? { endTime: assertHhmm(String(rec.endTime), "endTime") } : {}),
          ...(rec.from != null ? { from: String(rec.from) } : {}),
          ...(rec.until != null ? { until: String(rec.until) } : {}),
        });
        continue;
      }
    }
    throw new Error(`unrecognized schedule entry: ${JSON.stringify(item)}`);
  }
  return out;
}

export function buildSchedulePayload(
  timezone: string,
  recurringInput: unknown,
  sessions: unknown[] = [],
): { timezone: string; recurring: RecurringSlot[]; sessions: unknown[] } {
  return {
    timezone,
    recurring: scheduleToRecurringSlots(recurringInput),
    sessions,
  };
}
