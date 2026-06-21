/**
 * Format a match date (+ optional stadium time like "20:00 UTC-6") in US Eastern
 * time. Returns e.g. "Jun 28, 9:00 PM ET" or just "Jun 28" when no time is known.
 */
export function formatET(date: string | null, time: string | null): string {
  if (!date) return "TBD";

  const m = time?.match(/(\d{1,2}):(\d{2})\s*UTC([+-]\d{1,2})/);
  if (m) {
    const sign = m[3][0];
    const offH = m[3].slice(1).padStart(2, "0");
    const iso = `${date}T${m[1].padStart(2, "0")}:${m[2]}:00${sign}${offH}:00`;
    const d = new Date(iso);
    if (!isNaN(d.getTime())) {
      return (
        d.toLocaleString("en-US", {
          timeZone: "America/New_York",
          month: "short",
          day: "numeric",
          hour: "numeric",
          minute: "2-digit",
        }) + " ET"
      );
    }
  }

  // Date only.
  const d = new Date(`${date}T12:00:00Z`);
  if (isNaN(d.getTime())) return date;
  return d.toLocaleDateString("en-US", {
    timeZone: "America/New_York",
    month: "short",
    day: "numeric",
  });
}
