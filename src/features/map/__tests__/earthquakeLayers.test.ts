import { describe, expect, it } from "vitest";
import {
  MAGNITUDE_COLOUR_STOPS,
  MAGNITUDE_RADIUS_STOPS,
  MAX_MAGNITUDE_PROPERTY,
  earthquakeClusterLayer,
  earthquakePointLayer,
  magnitudeColour,
  magnitudeRadius,
  magnitudeSwatch,
} from "@/features/map/earthquakeLayers";

describe("magnitude ramps", () => {
  it("interpolates colour over the magnitude property", () => {
    expect(magnitudeColour()).toEqual([
      "interpolate",
      ["linear"],
      ["coalesce", ["get", "magnitude"], 0],
      ...MAGNITUDE_COLOUR_STOPS.flat(),
    ]);
  });

  it("interpolates radius over the magnitude property", () => {
    expect(magnitudeRadius()).toEqual([
      "interpolate",
      ["linear"],
      ["coalesce", ["get", "magnitude"], 0],
      ...MAGNITUDE_RADIUS_STOPS.flat(),
    ]);
  });

  it("rises monotonically, so a stronger event never draws smaller or cooler", () => {
    const magnitudes = MAGNITUDE_RADIUS_STOPS.map(([magnitude]) => magnitude);
    const radii = MAGNITUDE_RADIUS_STOPS.map(([, radius]) => radius);

    expect(magnitudes).toEqual([...magnitudes].sort((a, b) => a - b));
    expect(radii).toEqual([...radii].sort((a, b) => a - b));
  });

  it("starts at magnitude zero, because reported magnitudes fall below one", () => {
    expect(MAGNITUDE_COLOUR_STOPS[0][0]).toBe(0);
    expect(MAGNITUDE_RADIUS_STOPS[0][0]).toBe(0);
  });

  // Guards the reason the ramps look the way they do: almost every reported
  // event is under magnitude 3, so most of the scale has to be spent there or
  // real data renders as one indistinguishable colour and size.
  it("spends most of its detail below magnitude three, where the data is", () => {
    for (const stops of [MAGNITUDE_COLOUR_STOPS, MAGNITUDE_RADIUS_STOPS]) {
      const low = stops.filter(([magnitude]) => magnitude <= 3);
      expect(low.length).toBeGreaterThanOrEqual(stops.length / 2);
    }
  });

  it("separates a common weak event from a moderate one by diameter", () => {
    const radiusAt = (magnitude: number) => {
      const [, radius] =
        MAGNITUDE_RADIUS_STOPS.find(([stop]) => stop === magnitude) ?? [];
      return radius ?? 0;
    };

    expect(radiusAt(3)).toBeGreaterThanOrEqual(2 * radiusAt(0));
  });
});

describe("magnitudeSwatch", () => {
  it("returns a stop's own colour exactly at that stop", () => {
    const [magnitude, colour] = MAGNITUDE_COLOUR_STOPS[1];

    expect(magnitudeSwatch(magnitude)).toBe(
      `rgb(${[
        Number.parseInt(colour.slice(1, 3), 16),
        Number.parseInt(colour.slice(3, 5), 16),
        Number.parseInt(colour.slice(5, 7), 16),
      ].join(" ")})`,
    );
  });

  it("interpolates between stops, as the map does", () => {
    const [low] = MAGNITUDE_COLOUR_STOPS[0];
    const [high] = MAGNITUDE_COLOUR_STOPS[1];
    const middle = magnitudeSwatch((low + high) / 2);

    expect(middle).toMatch(/^rgb\(\d+ \d+ \d+\)$/);
    expect(middle).not.toBe(magnitudeSwatch(low));
    expect(middle).not.toBe(magnitudeSwatch(high));
  });

  it("treats an unknown magnitude as the weakest colour, matching the map", () => {
    expect(magnitudeSwatch(null)).toBe(magnitudeSwatch(0));
  });

  it("clamps beyond the ends rather than producing nothing", () => {
    const strongest = MAGNITUDE_COLOUR_STOPS[MAGNITUDE_COLOUR_STOPS.length - 1];

    expect(magnitudeSwatch(-1)).toBe(MAGNITUDE_COLOUR_STOPS[0][1]);
    expect(magnitudeSwatch(99)).toBe(strongest?.[1]);
  });
});

describe("earthquake layers", () => {
  it("draws single events and clusters from the same source without overlap", () => {
    expect(earthquakePointLayer.filter).toEqual(["!", ["has", "point_count"]]);
    expect(earthquakeClusterLayer.filter).toEqual(["has", "point_count"]);
  });

  it("colours a cluster by the strongest event it contains", () => {
    expect(earthquakeClusterLayer.paint?.["circle-color"]).toEqual(
      magnitudeColour(["coalesce", ["get", MAX_MAGNITUDE_PROPERTY], 0]),
    );
  });

  it("keeps hover in feature-state rather than in the source data", () => {
    const hovered = ["boolean", ["feature-state", "hover"], false];

    expect(earthquakePointLayer.paint?.["circle-stroke-width"]).toEqual([
      "case",
      hovered,
      3,
      1,
    ]);
    expect(earthquakePointLayer.paint?.["circle-radius"]).toEqual([
      "+",
      magnitudeRadius(),
      ["case", hovered, 4, 0],
    ]);
    expect(earthquakePointLayer.paint?.["circle-stroke-color"]).toEqual([
      "case",
      hovered,
      "#1f1300",
      "#ffffff",
    ]);
  });

  it("keeps a small event large enough to point at", () => {
    expect(MAGNITUDE_RADIUS_STOPS[0][1]).toBeGreaterThanOrEqual(6);
  });
});
