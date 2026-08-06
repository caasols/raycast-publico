const PUBLICATION_TIME_ZONE = "Europe/Lisbon";
const HAS_OFFSET = /(?:Z|[+-]\d{2}:?\d{2})$/;

/** Milliseconds that `timeZone` is ahead of UTC at the given instant. */
function zoneOffsetMs(instant: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(instant);
  const at = (type: string) =>
    Number(parts.find((part) => part.type === type)?.value ?? "0");
  const asIfUtc = Date.UTC(
    at("year"),
    at("month") - 1,
    at("day"),
    at("hour") % 24,
    at("minute"),
    at("second"),
  );
  return asIfUtc - instant.getTime();
}

/**
 * Parse a timestamp from the API.
 *
 * The API is inconsistent: `/api/list/ultimas` sends `2026-08-06T00:30:00+01:00`
 * while `/api/list/opiniao` and `/api/content/news/{id}` send the same instant
 * as `2026-08-06T00:30:00`. Left alone, the offsetless form is read as
 * machine-local, so the two disagree anywhere but UTC+1 and the displayed day
 * can be wrong. An offsetless timestamp is Lisbon wall-clock time, and Lisbon
 * observes DST, so the offset is derived for that date rather than assumed.
 */
export function parseApiDate(raw: string): Date | null {
  const value = raw?.trim();
  if (!value) {
    return null;
  }
  if (HAS_OFFSET.test(value)) {
    const withOffset = new Date(value);
    return Number.isNaN(withOffset.getTime()) ? null : withOffset;
  }
  const asUtc = new Date(`${value}Z`);
  if (Number.isNaN(asUtc.getTime())) {
    return null;
  }
  return new Date(asUtc.getTime() - zoneOffsetMs(asUtc, PUBLICATION_TIME_ZONE));
}

/**
 * Formats a date string from the API to a more readable format
 * @param dateStr The date string from the API (format varies)
 * @returns Formatted date string in 'DD Month YYYY, HH:MM' format
 */
export function formatDate(dateStr: string): string {
  try {
    // Handle both date formats from the API
    const date = parseApiDate(dateStr);

    if (!date) {
      return dateStr; // Return the original string if parsing fails
    }

    // Format the date in Portuguese
    const options: Intl.DateTimeFormatOptions = {
      day: "numeric",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    };

    return date.toLocaleDateString("pt-PT", options);
  } catch (error) {
    console.error("Error formatting date:", error);
    return dateStr; // Return the original string if an error occurs
  }
}
