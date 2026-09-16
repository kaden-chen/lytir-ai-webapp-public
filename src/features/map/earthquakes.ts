import type { Feature, FeatureCollection, Point } from "geojson";
import { apiRequest } from "@/lib/api";
import { env } from "@/lib/env";

// The wire shape is the backend's, so it keeps the backend's snake_case rather
// than being renamed field by field. The optional values are nullable because
// the retrieval API documents missing metadata as null, and a missing one must
// render as unknown rather than as zero.
export interface EarthquakeItem {
  /**
   * The selected Cosmos document UUID, not the logical earthquake identity.
   * The backend reselects a winner among duplicate ingestions, so this value
   * can change for the same earthquake between requests. Safe for keying a
   * render; unsafe for anything that must stay addressable, such as a URL.
   */
  id: string;
  event_type: string;
  magnitude: number | null;
  place: string | null;
  occurred_at_utc: string;
  updated_at_utc: string | null;
  longitude: number;
  latitude: number;
  depth_km: number | null;
}

/** The window the service actually answered, in its own clock. */
export interface TimeRange {
  start_utc: string;
  end_utc: string;
}

export interface EarthquakesResponse {
  items: EarthquakeItem[];
  /** Every match in the window. The service never truncates a result set. */
  count: number;
  /**
   * The effective window, echoed by the service. Optional because a deployment
   * older than the field would omit it, and a missing window has to read as
   * unknown rather than as a window the interface invented. Reading it is what
   * lets the count be labelled rather than asserted: the interface previously
   * repeated a documented one-hour default, and was wrong the moment the
   * service began answering two.
   */
  time_range?: TimeRange;
  // The service's own clock. Worth carrying because the browser's clock cannot
  // be trusted to say what "recent" means.
  utc_now: string;
}

// Exported rather than written inline at the one call site, because the
// administrator refresh has to invalidate exactly this query once a run
// finishes, and two copies of a key string drift apart without failing.
export const EARTHQUAKES_QUERY_KEY = ["earthquakes"] as const;

// The service requires an explicit offset or `Z` on each instant and rejects a
// naive one, and it rejects a window longer than its configured maximum of 720
// hours, so both are the caller's responsibility rather than clamped here.
export interface EarthquakeQuery {
  /**
   * Inclusive ISO 8601 instant. Omitting it takes the service's own default,
   * whatever that currently is; the answered window comes back in
   * `time_range` rather than being assumed here.
   */
  startTime?: string;
  /** Exclusive ISO 8601 instant. The service defaults to the current UTC time. */
  endTime?: string;
  minMagnitude?: number;
}

const PARAM_NAMES: Record<keyof EarthquakeQuery, string> = {
  startTime: "start_time",
  endTime: "end_time",
  minMagnitude: "min_magnitude",
};

// The configured value is a full URL that already carries a path, so the query
// is composed through URL rather than by string concatenation.
export function earthquakesUrl(query: EarthquakeQuery = {}): string {
  const url = new URL(env.api.earthquakes);

  for (const [key, name] of Object.entries(PARAM_NAMES)) {
    const value = query[key as keyof EarthquakeQuery];

    if (value !== undefined) {
      url.searchParams.set(name, String(value));
    }
  }

  return url.toString();
}

export function fetchEarthquakes(
  query: EarthquakeQuery = {},
): Promise<EarthquakesResponse> {
  return apiRequest<EarthquakesResponse>(earthquakesUrl(query));
}

export type EarthquakeProperties = Pick<
  EarthquakeItem,
  "id" | "magnitude" | "place" | "occurred_at_utc" | "depth_km"
>;

/** One event chosen on the canvas or in the list, and where to anchor it. */
export interface SelectedEarthquake {
  longitude: number;
  latitude: number;
  properties: EarthquakeProperties;
}

// The single definition of what the map and the popup carry per event, so a
// mark selected on the canvas and a row selected in the list describe the same
// thing.
export function toProperties(item: EarthquakeItem): EarthquakeProperties {
  return {
    // Carried in properties so the source can promote it to the feature id,
    // which is what feature-state hovering needs.
    id: item.id,
    magnitude: item.magnitude,
    place: item.place,
    occurred_at_utc: item.occurred_at_utc,
    depth_km: item.depth_km,
  };
}

// Properties come back off a clicked map feature as plain JSON, having been
// through MapLibre's tiling, so they are narrowed rather than asserted. A value
// of the wrong type degrades to unknown instead of reaching the interface as
// something that only looks like a number.
export function readFeatureProperties(
  properties: Record<string, unknown>,
): EarthquakeProperties {
  const asNumber = (value: unknown) =>
    typeof value === "number" && Number.isFinite(value) ? value : null;
  const asString = (value: unknown) =>
    typeof value === "string" ? value : null;

  return {
    id: asString(properties.id) ?? "",
    magnitude: asNumber(properties.magnitude),
    place: asString(properties.place),
    occurred_at_utc: asString(properties.occurred_at_utc) ?? "",
    depth_km: asNumber(properties.depth_km),
  };
}

// A pure transform, so the mapping from wire shape to map data is testable
// without a WebGL context. Coordinates that are not finite numbers are dropped
// rather than passed on, because MapLibre cannot place them and a single bad
// row would otherwise break the source.
export function toFeatureCollection(
  items: readonly EarthquakeItem[],
): FeatureCollection<Point, EarthquakeProperties> {
  const features: Feature<Point, EarthquakeProperties>[] = [];

  for (const item of items) {
    if (!Number.isFinite(item.longitude) || !Number.isFinite(item.latitude)) {
      continue;
    }

    features.push({
      type: "Feature",
      geometry: { type: "Point", coordinates: [item.longitude, item.latitude] },
      properties: toProperties(item),
    });
  }

  return { type: "FeatureCollection", features };
}
