export function formatMagnitude(magnitude: number | null): string {
  return magnitude === null ? "Unknown" : magnitude.toFixed(1);
}

// One decimal rather than whole kilometres: rounding turns a genuinely shallow
// event into "0 km", which reads as a missing value instead of a measurement.
export function formatDepth(depthKm: number | null): string {
  return depthKm === null ? "Unknown" : `${depthKm.toFixed(1)} km`;
}

const pad = (value: number) => String(value).padStart(2, "0");

function parseUtc(occurredAtUtc: string): Date | null {
  if (!occurredAtUtc.trim()) {
    return null;
  }

  const occurred = new Date(occurredAtUtc);

  return Number.isNaN(occurred.getTime()) ? null : occurred;
}

// Rendered in UTC because that is the timezone the field is stated in; showing
// it in the browser's zone would silently reinterpret the value. Built from the
// UTC parts rather than through Intl: the pattern is fixed, so involving a
// locale would only let the runtime's ICU data change the output. An
// unparseable instant is shown verbatim rather than as "Invalid Date".
//
// Split for the table, which repeats the time on every row but the date only
// when it changes. With an hour's worth of events the date is identical twelve
// times over, and twelve copies of it crowd out the place.
export function formatOccurredDate(occurredAtUtc: string): string | null {
  const occurred = parseUtc(occurredAtUtc);

  return occurred
    ? `${pad(occurred.getUTCMonth() + 1)}/${pad(occurred.getUTCDate())}/${occurred.getUTCFullYear()}`
    : null;
}

// Minutes, not seconds, everywhere. Second-level precision is noise: it widens
// a column nobody reads, and the second-precise formatter that used to exist
// alongside this one had exactly one caller — the summary's "as of" line —
// which was removed once the window's own end said the same thing.
export function formatOccurredTime(occurredAtUtc: string): string {
  const occurred = parseUtc(occurredAtUtc);

  if (!occurred) {
    return occurredAtUtc.trim() ? occurredAtUtc : "Time not reported";
  }

  return `${pad(occurred.getUTCHours())}:${pad(occurred.getUTCMinutes())}`;
}

// To the minute, with the zone, for a selected event's one-line detail.
export function formatOccurredAtShort(occurredAtUtc: string): string {
  const date = formatOccurredDate(occurredAtUtc);

  return date
    ? `${date} ${formatOccurredTime(occurredAtUtc)} UTC`
    : formatOccurredTime(occurredAtUtc);
}

// USGS leaves this free text and it can be absent entirely.
export function formatPlace(place: string | null): string {
  return place?.trim() ? place : "Location not reported";
}

/**
 * The window the service answered, stated as the window itself.
 *
 * Deliberately not a duration. A paraphrase has to invent phrasing for every
 * span the service might choose — "the last 2 hours" is comfortable, "the last
 * 41 minutes" is not, and rounding it to something tidier would name a window
 * that was never answered. The boundaries are the fact, they need no
 * pluralisation, and they stay correct whatever the backend's default becomes.
 *
 * It also subsumes the service clock. `utc_now` and `end_utc` arrive in the
 * same response and are the same instant for a window that ends now, so
 * showing both put two timestamps beside each other that could never disagree.
 *
 * Returns null when the window is unknown, so the count can stand alone rather
 * than carry a period the interface invented — which is the exact failure that
 * a hard-coded "the last hour" produced once the service began answering two.
 */
export function formatWindowLabel(
  range: { start_utc: string; end_utc: string } | undefined,
): string | null {
  if (!range) {
    return null;
  }

  const start = parseUtc(range.start_utc);
  const end = parseUtc(range.end_utc);

  if (!start || !end || end.getTime() <= start.getTime()) {
    return null;
  }

  const startDate = formatOccurredDate(range.start_utc);
  const endDate = formatOccurredDate(range.end_utc);
  const from = formatOccurredTime(range.start_utc);
  const to = formatOccurredTime(range.end_utc);

  // The date is stated once when the window does not cross midnight, which is
  // the common case, and twice when it does — otherwise a window from 23:30 to
  // 00:30 would read as running backwards within one day.
  return startDate === endDate
    ? `${startDate} ${from} to ${to} UTC`
    : `${startDate} ${from} to ${endDate} ${to} UTC`;
}
