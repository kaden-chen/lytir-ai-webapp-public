import type {
  CircleLayerSpecification,
  ExpressionSpecification,
  SymbolLayerSpecification,
} from "maplibre-gl";

export const EARTHQUAKE_SOURCE_ID = "earthquakes";
export const EARTHQUAKE_POINT_LAYER_ID = "earthquake-point";
export const EARTHQUAKE_CLUSTER_LAYER_ID = "earthquake-cluster";
export const EARTHQUAKE_CLUSTER_COUNT_LAYER_ID = "earthquake-cluster-count";

/** Name of the cluster aggregate holding the strongest magnitude it contains. */
export const MAX_MAGNITUDE_PROPERTY = "maxMag";

// The highest zoom that still groups events. Anything wanting to show one
// specific event has to pass this, or the event stays hidden inside a cluster.
export const EARTHQUAKE_CLUSTER_MAX_ZOOM = 7;

// A null magnitude reads as zero for styling only, so an event with no reported
// magnitude still draws at the smallest size instead of vanishing. The list view
// keeps showing it as unknown.
const MAGNITUDE: ExpressionSpecification = [
  "coalesce",
  ["get", "magnitude"],
  0,
];

const CLUSTER_MAX_MAGNITUDE: ExpressionSpecification = [
  "coalesce",
  ["get", MAX_MAGNITUDE_PROPERTY],
  0,
];

// Warm hues encode magnitude and are reserved for it; the interface accent
// stays cool so the chrome does not compete with the data. The ramp runs light
// to dark as well as yellow to red, so it stays orderable without colour
// vision, which a green-to-red or rainbow scale would not.
//
// Stops crowd the low end deliberately. Magnitude is logarithmic in energy and
// almost every reported event falls below 3, so spreading stops evenly to 8
// would map the entire real distribution onto the first third of the scale and
// render every mark the same colour.
export const MAGNITUDE_COLOUR_STOPS = [
  [0, "#ffe066"],
  [1, "#fcc419"],
  [2, "#ff922b"],
  [3, "#f76707"],
  [4.5, "#e8590c"],
  [6, "#c92a2a"],
  [7.5, "#7a1f1f"],
] as const satisfies readonly (readonly [number, string])[];

// Matched to the colour stops for the same reason, and the smallest stop is a
// hit target as much as a mark: a 4px dot on a world view is very hard to point
// at. The low end is spread so that the common comparison — a magnitude 0.5
// against a 3.0 — is a visible difference in diameter rather than two pixels.
export const MAGNITUDE_RADIUS_STOPS = [
  [0, 6],
  [1, 8],
  [2, 10],
  [3, 13],
  [4.5, 18],
  [6, 24],
  [7.5, 32],
] as const satisfies readonly (readonly [number, number])[];

type ColourStop = readonly [number, string];

function channels(hex: string): [number, number, number] {
  const value = Number.parseInt(hex.slice(1), 16);

  return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
}

function mix(from: string, to: string, ratio: number): string {
  const start = channels(from);
  const end = channels(to);
  const channel = (index: 0 | 1 | 2) =>
    Math.round(start[index] + (end[index] - start[index]) * ratio);

  return `rgb(${channel(0)} ${channel(1)} ${channel(2)})`;
}

/**
 * The same ramp the map draws with, as a CSS colour, so a magnitude in the
 * table or a popup is the colour of its mark on the map. Reading the stops
 * rather than restating them is the point: two ramps would drift apart, and
 * the encoding only works while both halves of the screen agree.
 */
export function magnitudeSwatch(magnitude: number | null): string {
  const stops: readonly ColourStop[] = MAGNITUDE_COLOUR_STOPS;
  const value = magnitude ?? 0;
  let lower = stops[0];

  if (!lower) {
    return "transparent";
  }

  if (value <= lower[0]) {
    return lower[1];
  }

  for (const upper of stops.slice(1)) {
    if (value <= upper[0]) {
      const span = upper[0] - lower[0];

      return mix(
        lower[1],
        upper[1],
        span === 0 ? 0 : (value - lower[0]) / span,
      );
    }

    lower = upper;
  }

  return lower[1];
}

const HOVERED: ExpressionSpecification = [
  "boolean",
  ["feature-state", "hover"],
  false,
];

// Expressions are arrays whose element types vary by position, which a spread of
// flattened stops cannot express. The single assertion is confined to here.
function ramp(
  input: ExpressionSpecification,
  stops: readonly (readonly [number, string | number])[],
): ExpressionSpecification {
  return [
    "interpolate",
    ["linear"],
    input,
    ...stops.flat(),
  ] as unknown as ExpressionSpecification;
}

export const magnitudeColour = (input = MAGNITUDE) =>
  ramp(input, MAGNITUDE_COLOUR_STOPS);

export const magnitudeRadius = (input = MAGNITUDE) =>
  ramp(input, MAGNITUDE_RADIUS_STOPS);

type NestedLayer<T> = Omit<T, "source">;

export const earthquakePointLayer: NestedLayer<CircleLayerSpecification> = {
  id: EARTHQUAKE_POINT_LAYER_ID,
  type: "circle",
  filter: ["!", ["has", "point_count"]],
  // Hover lives in feature-state, so pointer movement never rebuilds the source
  // data. It changes size, ring width, and ring colour together: a white ring
  // widening by two pixels is easy to miss on a small dot against a pale
  // basemap, which makes a working interaction look broken.
  paint: {
    "circle-color": magnitudeColour(),
    "circle-radius": ["+", magnitudeRadius(), ["case", HOVERED, 4, 0]],
    "circle-opacity": ["case", HOVERED, 1, 0.85],
    "circle-stroke-color": ["case", HOVERED, "#1f1300", "#ffffff"],
    "circle-stroke-width": ["case", HOVERED, 3, 1],
  },
};

export const earthquakeClusterLayer: NestedLayer<CircleLayerSpecification> = {
  id: EARTHQUAKE_CLUSTER_LAYER_ID,
  type: "circle",
  filter: ["has", "point_count"],
  paint: {
    // Coloured by the strongest event inside, so a cluster holding one large
    // earthquake cannot be mistaken for a cluster of small ones.
    "circle-color": magnitudeColour(CLUSTER_MAX_MAGNITUDE),
    "circle-radius": [
      "interpolate",
      ["linear"],
      ["get", "point_count"],
      2,
      14,
      25,
      22,
      100,
      30,
    ],
    "circle-opacity": 0.9,
    "circle-stroke-color": "#ffffff",
    "circle-stroke-width": 1,
  },
};

export const earthquakeClusterCountLayer: NestedLayer<SymbolLayerSpecification> =
  {
    id: EARTHQUAKE_CLUSTER_COUNT_LAYER_ID,
    type: "symbol",
    filter: ["has", "point_count"],
    layout: {
      "text-field": ["get", "point_count_abbreviated"],
      // Named explicitly because MapLibre's default fontstack is absent from
      // the OpenFreeMap styles, which would request a font that 404s. This
      // couples the label to the configured basemap's glyph set: a style that
      // does not serve Noto Sans loses the count, not the clusters.
      "text-font": ["Noto Sans Regular"],
      "text-size": 12,
      "text-allow-overlap": true,
    },
    paint: {
      "text-color": "#1f1300",
    },
  };
