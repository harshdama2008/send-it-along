import "server-only";
import OpeningHours from "opening_hours";
import { DEFAULT_FALLBACK_HOURS } from "@/lib/charities/chains";

// What we persist to `charities_cache.regular_opening_hours`: the raw
// opening_hours-syntax string plus where it came from, since that
// determines whether the UI says "Open until 8pm" or "Usually open until
// 8pm" (CLAUDE.md section 4, "Opening hours").
export type StoredHours = {
  source: "osm" | "fallback";
  value: string;
};

export function parseStoredHours(value: unknown): StoredHours {
  if (
    value &&
    typeof value === "object" &&
    "value" in value &&
    typeof (value as { value: unknown }).value === "string"
  ) {
    const source = (value as { source?: unknown }).source === "osm" ? "osm" : "fallback";
    return { source, value: (value as { value: string }).value };
  }
  return { source: "fallback", value: DEFAULT_FALLBACK_HOURS };
}

export type HoursEvaluation = {
  isOpen: boolean;
  hoursAreApproximate: boolean;
  hoursText: string;
};

function formatClockTime(date: Date): string {
  let hours = date.getHours();
  const minutes = date.getMinutes();
  const period = hours >= 12 ? "pm" : "am";
  hours = hours % 12 || 12;
  const minutePart = minutes === 0 ? "" : `:${String(minutes).padStart(2, "0")}`;
  return `${hours}${minutePart}${period}`;
}

function isSameCalendarDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function formatOpenText(closingAt: Date | undefined, approximate: boolean): string {
  const prefix = approximate ? "Usually open" : "Open";
  return closingAt ? `${prefix} until ${formatClockTime(closingAt)}` : prefix;
}

function formatClosedText(opensAt: Date | undefined, now: Date): string {
  if (!opensAt) return "Closed";

  const time = formatClockTime(opensAt);
  if (isSameCalendarDay(opensAt, now)) return `Opens ${time} today`;

  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  if (isSameCalendarDay(opensAt, tomorrow)) return `Opens ${time} tomorrow`;

  const weekday = opensAt.toLocaleDateString("en-US", { weekday: "long" });
  return `Opens ${weekday} at ${time}`;
}

// Checked against now + 30 minutes, the courier arrival buffer from
// CLAUDE.md's "Matching algorithm" step 2.
export function evaluateHours(hours: StoredHours, now: Date = new Date()): HoursEvaluation {
  const approximate = hours.source === "fallback";
  const checkAt = new Date(now.getTime() + 30 * 60 * 1000);

  try {
    const oh = new OpeningHours(hours.value);
    const isOpen = oh.getState(checkAt);
    const nextChange = oh.getNextChange(checkAt);

    return {
      isOpen,
      hoursAreApproximate: approximate,
      hoursText: isOpen ? formatOpenText(nextChange, approximate) : formatClosedText(nextChange, now),
    };
  } catch {
    // Malformed opening_hours tag (OSM coverage is patchy and not always
    // well-formed) — treat as closed rather than guessing.
    return { isOpen: false, hoursAreApproximate: true, hoursText: "Closed" };
  }
}
