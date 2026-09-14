import type { ReactNode } from "react";
import { MantineProvider } from "@mantine/core";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { EarthquakesResponse } from "@/features/map/earthquakes";

// jsdom has no WebGL context, so the map itself is replaced by marker elements.
// What is worth asserting here is which style URL the page asks for, that the
// controls are mounted, and that the source is clustered with the identifier
// promoted — not MapLibre's own rendering.
// The click handler is captured so the interaction can be exercised without a
// canvas to point at.
interface FakeFeature {
  layer: { id: string };
  id?: string;
  geometry: { type: string; coordinates: number[] };
  properties: Record<string, unknown>;
}

interface FakeClickEvent {
  features?: FakeFeature[];
  target: {
    getSource: () => {
      getClusterExpansionZoom: (id: number) => Promise<number>;
    };
    easeTo: (options: { center: [number, number]; zoom: number }) => void;
    removeFeatureState: () => void;
    setFeatureState: () => void;
  };
}

const { mapCallbacks, flyTo } = vi.hoisted(() => ({
  mapCallbacks: {} as { onClick?: (event: FakeClickEvent) => void },
  flyTo: vi.fn(),
}));

vi.mock("react-map-gl/maplibre", () => ({
  default: ({
    ref,
    mapStyle,
    projection,
    onClick,
    children,
  }: {
    ref?: { current: { flyTo: typeof flyTo } | null };
    mapStyle: string;
    projection?: string;
    onClick?: (event: FakeClickEvent) => void;
    children: ReactNode;
  }) => {
    mapCallbacks.onClick = onClick;

    if (ref) {
      ref.current = { flyTo };
    }
    return (
      <div
        data-testid="map"
        data-map-style={mapStyle}
        data-projection={projection}
      >
        {children}
      </div>
    );
  },
  Popup: ({ children }: { children: ReactNode }) => (
    <div data-testid="popup">{children}</div>
  ),
  NavigationControl: () => <div data-testid="navigation-control" />,
  ScaleControl: () => <div data-testid="scale-control" />,
  Source: ({
    children,
    cluster,
    promoteId,
    data,
  }: {
    children: ReactNode;
    cluster?: boolean;
    promoteId?: string;
    data: { features: unknown[] };
  }) => (
    <div
      data-testid="source"
      data-cluster={String(Boolean(cluster))}
      data-promote-id={promoteId}
      data-feature-count={data.features.length}
    >
      {children}
    </div>
  ),
  Layer: ({ id }: { id: string }) => <div data-testid="layer" data-id={id} />,
}));

const { fetchEarthquakesMock } = vi.hoisted(() => ({
  fetchEarthquakesMock: vi.fn<() => Promise<EarthquakesResponse>>(),
}));

vi.mock("@/features/map/earthquakes", async () => {
  const actual = await vi.importActual<
    typeof import("@/features/map/earthquakes")
  >("@/features/map/earthquakes");
  return { ...actual, fetchEarthquakes: fetchEarthquakesMock };
});

// Stands in for the lazily loaded assistant, so these tests stay about the
// layout rather than the chat.
vi.mock("@/features/chat/Assistant", () => ({
  Assistant: () => <div data-testid="assistant" />,
}));

const { HomeScreen } = await import("@/components/HomeScreen");

const RESPONSE: EarthquakesResponse = {
  items: [
    {
      id: "ca790b06",
      event_type: "earthquake",
      magnitude: 0.97,
      place: "5 km NNE of Yucaipa, CA",
      occurred_at_utc: "2026-09-13T03:29:45.710000Z",
      updated_at_utc: "2026-09-13T03:33:14.326000Z",
      longitude: -117.022333333333,
      latitude: 34.0736666666667,
      depth_km: 13.16,
    },
  ],
  count: 1,
  // A two-hour window, which is what the service actually answers. The
  // interface used to print "the last hour" regardless.
  time_range: {
    start_utc: "2026-09-13T01:41:26.436274Z",
    end_utc: "2026-09-13T03:41:26.436274Z",
  },
  utc_now: "2026-09-13T03:41:26.436274+00:00",
};

function renderScreen(colorScheme: "light" | "dark" = "light") {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return render(
    <MantineProvider forceColorScheme={colorScheme}>
      <QueryClientProvider client={client}>
        <HomeScreen />
      </QueryClientProvider>
    </MantineProvider>,
  );
}

// Which sections are open is remembered, so it has to be reset between tests.
beforeEach(() => {
  localStorage.clear();
});

describe("panel sections", () => {
  it("starts with the earthquake table open and the assistant closed", async () => {
    fetchEarthquakesMock.mockResolvedValue(RESPONSE);
    renderScreen();

    expect(
      await screen.findByRole("table", { name: "Recent earthquakes" }),
    ).toBeTruthy();
    expect(
      screen
        .getByRole("button", { name: "Ask Lytir" })
        .getAttribute("aria-expanded"),
    ).toBe("false");
  });

  it("does not load the assistant until its section is opened", () => {
    fetchEarthquakesMock.mockResolvedValue(RESPONSE);
    renderScreen();

    expect(screen.queryByTestId("assistant")).toBeNull();
  });

  it("loads the assistant when its section is opened", async () => {
    fetchEarthquakesMock.mockResolvedValue(RESPONSE);
    renderScreen();

    fireEvent.click(screen.getByRole("button", { name: "Ask Lytir" }));

    expect(await screen.findByTestId("assistant")).toBeTruthy();
  });

  it("keeps the assistant mounted once closed, so a conversation survives", async () => {
    fetchEarthquakesMock.mockResolvedValue(RESPONSE);
    renderScreen();

    const header = screen.getByRole("button", { name: "Ask Lytir" });
    fireEvent.click(header);
    await screen.findByTestId("assistant");

    fireEvent.click(header);

    expect(header.getAttribute("aria-expanded")).toBe("false");
    expect(screen.getByTestId("assistant")).toBeTruthy();
  });

  it("lets the table be collapsed too, which a phone needs", async () => {
    fetchEarthquakesMock.mockResolvedValue(RESPONSE);
    renderScreen();

    await screen.findByRole("table", { name: "Recent earthquakes" });
    fireEvent.click(screen.getByRole("button", { name: "Recent earthquakes" }));

    expect(
      screen.queryByRole("table", { name: "Recent earthquakes" }),
    ).toBeNull();
  });
});

describe("HomeScreen", () => {
  it("renders the map with navigation and scale controls", () => {
    fetchEarthquakesMock.mockResolvedValue(RESPONSE);
    renderScreen();

    expect(screen.getByTestId("map")).toBeTruthy();
    expect(screen.getByTestId("navigation-control")).toBeTruthy();
    expect(screen.getByTestId("scale-control")).toBeTruthy();
  });

  it("offers a divider that is operable by keyboard, not only by dragging", async () => {
    fetchEarthquakesMock.mockResolvedValue(RESPONSE);
    renderScreen();

    const divider = await screen.findByRole("separator");
    expect(divider.getAttribute("aria-valuenow")).toBeTruthy();
    expect(divider.getAttribute("tabindex")).toBe("0");
  });

  it("renders on a globe, so the Pacific is not split by a projection edge", () => {
    fetchEarthquakesMock.mockResolvedValue(RESPONSE);
    renderScreen();

    expect(screen.getByTestId("map").getAttribute("data-projection")).toBe(
      "globe",
    );
  });

  it("asks for the light basemap under the light colour scheme", () => {
    fetchEarthquakesMock.mockResolvedValue(RESPONSE);
    renderScreen("light");

    expect(screen.getByTestId("map").getAttribute("data-map-style")).toBe(
      "https://example.test/styles/light",
    );
  });

  it("asks for the dark basemap under the dark colour scheme", () => {
    fetchEarthquakesMock.mockResolvedValue(RESPONSE);
    renderScreen("dark");

    expect(screen.getByTestId("map").getAttribute("data-map-style")).toBe(
      "https://example.test/styles/dark",
    );
  });

  it("draws the events through a clustered source with the identifier promoted", async () => {
    fetchEarthquakesMock.mockResolvedValue(RESPONSE);
    renderScreen();

    // The source mounts before the query resolves, so wait for the loaded data
    // rather than for the element, which is there either way.
    await screen.findByRole("cell", { name: "5 km NNE of Yucaipa, CA" });

    const source = screen.getByTestId("source");
    expect(source.getAttribute("data-cluster")).toBe("true");
    expect(source.getAttribute("data-promote-id")).toBe("id");
    expect(source.getAttribute("data-feature-count")).toBe("1");
  });

  it("draws clusters, cluster counts, and single events as separate layers", () => {
    fetchEarthquakesMock.mockResolvedValue(RESPONSE);
    renderScreen();

    expect(
      screen
        .getAllByTestId("layer")
        .map((layer) => layer.getAttribute("data-id")),
    ).toEqual([
      "earthquake-cluster",
      "earthquake-cluster-count",
      "earthquake-point",
    ]);
  });

  it("pairs the canvas with the accessible list of the same events", async () => {
    fetchEarthquakesMock.mockResolvedValue(RESPONSE);
    renderScreen();

    expect(
      await screen.findByRole("table", { name: "Recent earthquakes" }),
    ).toBeTruthy();
    expect(
      screen.getByRole("cell", { name: "5 km NNE of Yucaipa, CA" }),
    ).toBeTruthy();
  });

  describe("clicking", () => {
    const easeTo = vi.fn();
    const getClusterExpansionZoom = vi.fn<(id: number) => Promise<number>>();

    const target: FakeClickEvent["target"] = {
      getSource: () => ({ getClusterExpansionZoom }),
      easeTo,
      removeFeatureState: () => {},
      setFeatureState: () => {},
    };

    const pointFeature: FakeFeature = {
      layer: { id: "earthquake-point" },
      id: "ca790b06",
      geometry: { type: "Point", coordinates: [-117.02, 34.07] },
      properties: {
        id: "ca790b06",
        magnitude: 0.97,
        place: "5 km NNE of Yucaipa, CA",
        occurred_at_utc: "2026-09-13T03:29:45.710000Z",
        depth_km: 13.16,
      },
    };

    const clusterFeature: FakeFeature = {
      layer: { id: "earthquake-cluster" },
      geometry: { type: "Point", coordinates: [-118.5, 34.5] },
      properties: { cluster_id: 42, point_count: 4 },
    };

    beforeEach(() => {
      easeTo.mockClear();
      getClusterExpansionZoom.mockReset();
      fetchEarthquakesMock.mockResolvedValue(RESPONSE);
    });

    async function click(features?: FakeFeature[]) {
      renderScreen();
      await screen.findByTestId("source");
      await act(async () => {
        mapCallbacks.onClick?.({ features, target });
      });
    }

    it("opens a popup with the magnitude, place, time, and depth", async () => {
      await click([pointFeature]);

      const popup = screen.getByTestId("popup");
      expect(popup.textContent).toContain("M 1.0");
      expect(popup.textContent).toContain("5 km NNE of Yucaipa, CA");
      expect(popup.textContent).toContain("09/13/2026 03:29 UTC");
      expect(popup.textContent).toContain("13.2 km");
    });

    it("zooms a cluster apart rather than describing it", async () => {
      getClusterExpansionZoom.mockResolvedValue(6);

      await click([clusterFeature]);

      expect(getClusterExpansionZoom).toHaveBeenCalledWith(42);
      await vi.waitFor(() => {
        expect(easeTo).toHaveBeenCalledWith({
          center: [-118.5, 34.5],
          zoom: 6,
        });
      });
      expect(screen.queryByTestId("popup")).toBeNull();
    });

    it("survives a cluster whose source is replaced mid-request", async () => {
      getClusterExpansionZoom.mockRejectedValue(new Error("source gone"));

      await click([clusterFeature]);

      expect(easeTo).not.toHaveBeenCalled();
      expect(screen.queryByTestId("popup")).toBeNull();
    });

    it("closes the popup when bare map is clicked", async () => {
      await click([pointFeature]);
      expect(screen.getByTestId("popup")).toBeTruthy();

      await act(async () => {
        mapCallbacks.onClick?.({ features: [], target });
      });

      expect(screen.queryByTestId("popup")).toBeNull();
    });
  });

  it("moves the map and opens the popup when a list row is chosen", async () => {
    flyTo.mockClear();
    fetchEarthquakesMock.mockResolvedValue(RESPONSE);
    renderScreen();

    fireEvent.click(
      await screen.findByRole("button", { name: "5 km NNE of Yucaipa, CA" }),
    );

    // Past the clustering zoom, or the chosen event stays inside a cluster.
    expect(flyTo).toHaveBeenCalledWith({
      center: [-117.022333333333, 34.0736666666667],
      zoom: 8,
    });
    expect(screen.getByTestId("popup").textContent).toContain(
      "5 km NNE of Yucaipa, CA",
    );
  });

  it("labels the count with the window the service reported, not an assumed one", async () => {
    fetchEarthquakesMock.mockResolvedValue(RESPONSE);
    renderScreen();

    const caption = await screen.findByText(/1 earthquake/);
    expect(caption.textContent).toBe(
      "1 earthquake · 09/13/2026 01:41 to 03:41 UTC",
    );
  });

  it("shows the count alone when the service reports no window", async () => {
    // Stands in for a deployment older than the `time_range` field.
    const withoutRange: EarthquakesResponse = { ...RESPONSE };
    delete withoutRange.time_range;
    fetchEarthquakesMock.mockResolvedValue(withoutRange);
    renderScreen();

    const caption = await screen.findByText(/1 earthquake/);
    expect(caption.textContent).toBe("1 earthquake");
  });

  it("reports a failure with its correlation identifier instead of an empty map", async () => {
    const { ApiError } = await import("@/lib/api");
    fetchEarthquakesMock.mockRejectedValue(
      new ApiError("Request failed with status 503", {
        status: 503,
        correlationId: "abc-123",
      }),
    );
    renderScreen();

    expect(await screen.findByText(/Could not load earthquakes/)).toBeTruthy();
    expect(await screen.findByText(/abc-123/)).toBeTruthy();
  });
});
