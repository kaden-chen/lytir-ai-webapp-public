import { describe, expect, it } from "vitest";
import type { EarthquakeItem } from "@/features/map/earthquakes";
import {
  earthquakesUrl,
  readFeatureProperties,
  toFeatureCollection,
} from "@/features/map/earthquakes";

function item(overrides: Partial<EarthquakeItem> = {}): EarthquakeItem {
  return {
    id: "ca790b06-338f-4317-8418-5992eb288ddf",
    event_type: "earthquake",
    magnitude: 0.97,
    place: "5 km NNE of Yucaipa, CA",
    occurred_at_utc: "2026-09-13T03:29:45.710000Z",
    updated_at_utc: "2026-09-13T03:33:14.326000Z",
    longitude: -117.022333333333,
    latitude: 34.0736666666667,
    depth_km: 13.16,
    ...overrides,
  };
}

describe("earthquakesUrl", () => {
  it("sends no parameters when none are asked for, leaving the service default", () => {
    expect(earthquakesUrl()).toBe("https://example.test/api/proxy/earthquakes");
  });

  it("maps the query onto the endpoint's snake_case parameters", () => {
    const url = new URL(
      earthquakesUrl({
        startTime: "2026-09-11T00:00:00Z",
        endTime: "2026-09-12T00:00:00Z",
        minMagnitude: 4,
      }),
    );

    expect(url.pathname).toBe("/api/proxy/earthquakes");
    expect(url.searchParams.get("start_time")).toBe("2026-09-11T00:00:00Z");
    expect(url.searchParams.get("end_time")).toBe("2026-09-12T00:00:00Z");
    expect(url.searchParams.get("min_magnitude")).toBe("4");
  });

  it("keeps a zero magnitude floor rather than dropping it as falsy", () => {
    const url = new URL(earthquakesUrl({ minMagnitude: 0 }));

    expect(url.searchParams.get("min_magnitude")).toBe("0");
  });
});

// Indexing is checked, and a missing feature is a failure worth naming rather
// than an assertion against undefined.
function onlyFeature(overrides: Partial<EarthquakeItem> = {}) {
  const [feature] = toFeatureCollection([item(overrides)]).features;

  if (!feature) {
    throw new Error("expected the event to produce one feature");
  }

  return feature;
}

describe("toFeatureCollection", () => {
  it("places each event at its own longitude and latitude", () => {
    const collection = toFeatureCollection([item()]);

    expect(collection.type).toBe("FeatureCollection");
    expect(collection.features).toHaveLength(1);
    expect(onlyFeature().geometry.coordinates).toEqual([
      -117.022333333333, 34.0736666666667,
    ]);
  });

  it("carries the identifier in properties so it can be promoted to the feature id", () => {
    expect(onlyFeature({ id: "abc" }).properties.id).toBe("abc");
  });

  it("preserves a null magnitude, place, and depth rather than inventing zeroes", () => {
    expect(
      onlyFeature({ magnitude: null, place: null, depth_km: null }).properties,
    ).toMatchObject({
      magnitude: null,
      place: null,
      depth_km: null,
    });
  });

  it("drops an event whose coordinates are not finite numbers", () => {
    const collection = toFeatureCollection([
      item({ id: "good" }),
      item({ id: "no-longitude", longitude: Number.NaN }),
      item({ id: "no-latitude", latitude: Number.POSITIVE_INFINITY }),
    ]);

    expect(collection.features.map((feature) => feature.properties.id)).toEqual(
      ["good"],
    );
  });

  it("returns an empty collection for no events", () => {
    expect(toFeatureCollection([])).toEqual({
      type: "FeatureCollection",
      features: [],
    });
  });
});

describe("readFeatureProperties", () => {
  it("reads the fields a clicked mark needs", () => {
    expect(
      readFeatureProperties({
        id: "abc",
        magnitude: 3.6,
        place: "67 km N of Culebra, Puerto Rico",
        occurred_at_utc: "2026-09-13T03:00:05.407000Z",
        depth_km: 39.648,
      }),
    ).toEqual({
      id: "abc",
      magnitude: 3.6,
      place: "67 km N of Culebra, Puerto Rico",
      occurred_at_utc: "2026-09-13T03:00:05.407000Z",
      depth_km: 39.648,
    });
  });

  it("degrades a value of the wrong type to unknown rather than trusting it", () => {
    expect(
      readFeatureProperties({
        magnitude: "3.6",
        depth_km: Number.NaN,
        place: 42,
      }),
    ).toMatchObject({ magnitude: null, depth_km: null, place: null });
  });

  it("survives properties that are missing entirely", () => {
    expect(readFeatureProperties({})).toEqual({
      id: "",
      magnitude: null,
      place: null,
      occurred_at_utc: "",
      depth_km: null,
    });
  });
});
