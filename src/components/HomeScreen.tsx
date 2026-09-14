import { Suspense, lazy, useCallback, useMemo, useRef, useState } from "react";
import { Alert, Center, Loader, Splitter, Text } from "@mantine/core";
import { useLocalStorage, useMediaQuery } from "@mantine/hooks";
import { useQuery } from "@tanstack/react-query";
import type { MapRef } from "react-map-gl/maplibre";
import { PanelSection } from "@/components/PanelSection";
import { EarthquakeList } from "@/features/map/EarthquakeList";
import { EarthquakeMap } from "@/features/map/EarthquakeMap";
import type {
  EarthquakeItem,
  SelectedEarthquake,
} from "@/features/map/earthquakes";
import {
  fetchEarthquakes,
  toFeatureCollection,
  toProperties,
} from "@/features/map/earthquakes";
import { formatWindowLabel } from "@/features/map/format";
import { EARTHQUAKE_CLUSTER_MAX_ZOOM } from "@/features/map/earthquakeLayers";
import { ApiError } from "@/lib/api";

// Loaded the first time its section is opened, so the Markdown renderer it
// needs is not downloaded by someone who only ever looks at the map.
const Assistant = lazy(async () => ({
  default: (await import("@/features/chat/Assistant")).Assistant,
}));

// The screen is the viewport minus the shell's header and its padding. A
// percentage would have no fixed parent to resolve against.
const SCREEN_HEIGHT =
  "calc(100dvh - var(--app-shell-header-height) - 2 * var(--mantine-spacing-md))";

const REFETCH_INTERVAL_MS = 60_000;

// Past the zoom at which events are still grouped, so choosing a row shows that
// event as itself rather than leaving it hidden inside a cluster.
const SELECTED_ZOOM = EARTHQUAKE_CLUSTER_MAX_ZOOM + 1;

// Mantine's `md` breakpoint. Above it the map and the panel sit side by side and
// the divider adjusts width; below it they stack and it adjusts height.
const WIDE_VIEWPORT = "(min-width: 62em)";

const EARTHQUAKES_SECTION = "earthquakes";
const ASSISTANT_SECTION = "assistant";

export function HomeScreen() {
  // Measured during the first render rather than in an effect. The splitter
  // applies its starting proportions once, when it mounts, so a layout that
  // guesses "wide" first and corrects itself afterwards leaves a phone with
  // the desktop's split — the direction flips, the sizes do not.
  const wideViewport = useMediaQuery(WIDE_VIEWPORT, true, {
    getInitialValueInEffect: false,
  });
  const mapRef = useRef<MapRef>(null);
  // The selection is deliberately transient and never reaches the URL: the
  // backend reselects the document UUID when a duplicate ingestion wins
  // deduplication, so a shared link to one would eventually resolve to nothing.
  const [selected, setSelected] = useState<SelectedEarthquake | null>(null);

  // Remembered, so someone who works with the assistant open finds it open.
  const [openSections, setOpenSections] = useLocalStorage<string[]>({
    key: "lytir-open-sections",
    defaultValue: [EARTHQUAKES_SECTION],
    getInitialValueInEffect: false,
  });

  const isOpen = (section: string) => openSections.includes(section);

  const toggle = (section: string) =>
    setOpenSections((previous) =>
      previous.includes(section)
        ? previous.filter((open) => open !== section)
        : [...previous, section],
    );

  // Once the assistant has been opened it stays mounted, so collapsing the
  // section to glance at the map does not discard the conversation.
  const assistantMounted = useRef(false);

  if (isOpen(ASSISTANT_SECTION)) {
    assistantMounted.current = true;
  }

  // No time window is sent, so the service applies its own default and echoes
  // what it used in `time_range`. Computing the window here would make the
  // browser's clock the authority on what "recent" means, which it is not.
  const { data, error, isPending } = useQuery({
    queryKey: ["earthquakes"],
    queryFn: () => fetchEarthquakes(),
    refetchInterval: REFETCH_INTERVAL_MS,
  });

  // Memoised on the response rather than on a fresh `?? []`, so a re-render
  // does not rebuild the source data and discard MapLibre's hover state.
  const items = useMemo(() => data?.items ?? [], [data]);
  const collection = useMemo(() => toFeatureCollection(items), [items]);

  // Choosing a row is the keyboard and screen-reader route to the same place a
  // click on the canvas reaches, so it moves the map and opens the same popup.
  const handleSelectFromList = useCallback((item: EarthquakeItem) => {
    setSelected({
      longitude: item.longitude,
      latitude: item.latitude,
      properties: toProperties(item),
    });
    mapRef.current?.flyTo({
      center: [item.longitude, item.latitude],
      zoom: SELECTED_ZOOM,
    });
  }, []);

  return (
    // One splitter that turns with the layout, rather than a separate tree per
    // breakpoint: swapping trees would unmount the map and lose the view the
    // reader had navigated to every time the window crossed the breakpoint.
    <Splitter
      h={SCREEN_HEIGHT}
      orientation={wideViewport ? "horizontal" : "vertical"}
    >
      {/* A globe stays legible small, while a table and a conversation do not,
          so the map is what gives up room. Stacked it keeps 40%; side by side
          it keeps 60%, which is still a large globe and leaves the panel wide
          enough for an answer with a table in it. The divider settles it. */}
      <Splitter.Pane
        defaultSize={wideViewport ? "60%" : "40%"}
        min={wideViewport ? "30%" : "20%"}
      >
        <EarthquakeMap
          mapRef={mapRef}
          data={collection}
          selected={selected}
          onSelect={setSelected}
        />
      </Splitter.Pane>
      {/* The floor is the stack of collapsed headers: the panel never empties,
          so dragging the divider across leaves a strip of labels and gives the
          map nearly everything, without a separate full-map mode. */}
      <Splitter.Pane
        defaultSize={wideViewport ? "40%" : "60%"}
        min="150px"
        style={{
          display: "flex",
          flexDirection: "column",
          minHeight: 0,
          // The panel owns the scrolling for its content sections, so there is
          // one scrollbar here rather than one inside each of them.
          overflowY: "auto",
        }}
      >
        {/* The assistant comes first because it is the reason to open the
            panel at all, and the top of a stack is where attention starts.
            Below a full-height table it sat on the bottom edge of the window
            and was missed entirely. */}
        <PanelSection
          title="Ask Lytir"
          open={isOpen(ASSISTANT_SECTION)}
          onToggle={() => toggle(ASSISTANT_SECTION)}
        >
          {assistantMounted.current ? (
            <Suspense
              fallback={
                <Center p="lg">
                  <Loader size="sm" />
                </Center>
              }
            >
              <Assistant />
            </Suspense>
          ) : null}
        </PanelSection>

        <PanelSection
          title="Recent earthquakes"
          open={isOpen(EARTHQUAKES_SECTION)}
          onToggle={() => toggle(EARTHQUAKES_SECTION)}
        >
          {error ? (
            <Alert color="red" title="Could not load earthquakes" m="sm">
              <Text size="sm">{error.message}</Text>
              {error instanceof ApiError && error.correlationId ? (
                <Text size="xs" c="dimmed" mt="xs">
                  Correlation ID: {error.correlationId}
                </Text>
              ) : null}
            </Alert>
          ) : isPending ? (
            <Text size="sm" c="dimmed" p="sm">
              Loading earthquakes…
            </Text>
          ) : (
            <EarthquakeList
              items={items}
              onSelect={handleSelectFromList}
              selectedId={selected?.properties.id ?? null}
              // Read from the response rather than restated from the
              // contract, so the label cannot disagree with the data above it.
              windowLabel={formatWindowLabel(data?.time_range)}
            />
          )}
        </PanelSection>
      </Splitter.Pane>
    </Splitter>
  );
}
