import { apiRequest } from "@/lib/api";
import { env } from "@/lib/env";

/**
 * Triggers acquisition of new events.
 *
 * A POST because it changes stored data, and the edge admits it only for a
 * caller whose verified email is an administrator — the button being hidden
 * or disabled is presentation, not the control.
 *
 * The response is deliberately `unknown`. It carries counts and per-event
 * metadata, and both are shown to an administrator verbatim rather than
 * parsed, because its events are identified by their USGS identifier while
 * the map keys on the Cosmos document UUID the retrieval API returns. A type
 * that made those interchangeable would compile, render, and then silently
 * break hover and selection. Nothing here is a data source: what the map and
 * the table show comes from re-running the earthquakes query.
 */
export function syncData(): Promise<unknown> {
  return apiRequest<unknown>(env.api.adminSyncData, { method: "POST" });
}

/**
 * The response as evidence that a run happened, formatted for reading.
 *
 * Stringified rather than interpreted, and rendered as text by the caller,
 * because the events carry upstream `place` strings that are untrusted
 * content. Showing it whole also means an administrator sees a non-zero
 * `failed` alongside an HTTP 200, which no summary of ours would have to be
 * trusted to report.
 */
export function formatEvidence(response: unknown): string {
  return JSON.stringify(response, null, 2);
}
