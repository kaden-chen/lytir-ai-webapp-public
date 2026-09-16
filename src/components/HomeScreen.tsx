import {
  Suspense,
  lazy,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Alert, Box, Center, Loader, Splitter, Text } from "@mantine/core";
import "@/components/HomeScreen.css";
import type { UseSplitterReturnValue } from "@mantine/hooks";
import { useLocalStorage, useMediaQuery } from "@mantine/hooks";
import { useQuery } from "@tanstack/react-query";
import type { MapRef } from "react-map-gl/maplibre";
import type { SectionTab } from "@/components/SectionTabs";
import { SectionTabs } from "@/components/SectionTabs";
import type { RailItem } from "@/components/ViewRail";
import { ViewRail } from "@/components/ViewRail";
import { AdminView } from "@/features/admin/AdminView";
import { EarthquakeList } from "@/features/map/EarthquakeList";
import { EarthquakeMap } from "@/features/map/EarthquakeMap";
import type {
  EarthquakeItem,
  SelectedEarthquake,
} from "@/features/map/earthquakes";
import {
  EARTHQUAKES_QUERY_KEY,
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

// Mantine's `md` breakpoint. Above it the two panels flank the map and the
// dividers adjust width; below it one section at a time sits under the map.
const WIDE_VIEWPORT = "(min-width: 62em)";

const EARTHQUAKES = "earthquakes";
const ASSISTANT = "assistant";
const ADMIN = "admin";

type SectionId = typeof EARTHQUAKES | typeof ASSISTANT | typeof ADMIN;

// Administration is last and present for everyone. The view itself disables
// its controls for a reader without the role and says why, so the interface
// has one shape and later views that manage a reader's own work have a home.
const TABS: SectionTab[] = [
  { id: EARTHQUAKES, label: "Earthquakes" },
  { id: ASSISTANT, label: "Ask Lytir" },
  { id: ADMIN, label: "Admin" },
];

// The wide layout uses an activity bar instead. The two panel views sit at the
// top and the assistant at the foot, because it opens the other side of the
// screen and grouping it with them would imply it replaces them.
const RAIL_ITEMS: RailItem[] = [
  { id: EARTHQUAKES, label: "Earthquakes", icon: "earthquakes" },
  { id: ADMIN, label: "Admin", icon: "admin" },
  { id: ASSISTANT, label: "Ask Lytir", icon: "assistant", atEnd: true },
];

const SIDEBAR_TITLES: Record<string, string> = {
  [EARTHQUAKES]: "Recent earthquakes",
  [ADMIN]: "Admin",
};

// Panes keep this order at every width so the map never changes its position
// in the tree. Swapping trees at the breakpoint would unmount it and discard
// the view the reader had navigated to.
const LEFT_PANE = 0;
const RIGHT_PANE = 2;

interface LayoutState {
  /** Which of the two left-hand views the wide layout shows. */
  leftView: typeof EARTHQUAKES | typeof ADMIN;
  leftOpen: boolean;
  rightOpen: boolean;
  /** The narrow layout shows one section at a time, or none. */
  active: SectionId | null;
}

const DEFAULT_LAYOUT: LayoutState = {
  leftView: EARTHQUAKES,
  leftOpen: true,
  rightOpen: true,
  active: EARTHQUAKES,
};

export function HomeScreen() {
  // Measured during the first render rather than in an effect. The splitter
  // applies its starting proportions once, when it mounts, so a layout that
  // guesses "wide" first and corrects itself afterwards leaves a phone with
  // the desktop's split — the direction flips, the sizes do not.
  const wideViewport = useMediaQuery(WIDE_VIEWPORT, true, {
    getInitialValueInEffect: false,
  });
  const mapRef = useRef<MapRef>(null);
  const splitterRef = useRef<UseSplitterReturnValue | null>(null);
  // The selection is deliberately transient and never reaches the URL: the
  // backend reselects the document UUID when a duplicate ingestion wins
  // deduplication, so a shared link to one would eventually resolve to nothing.
  const [selected, setSelected] = useState<SelectedEarthquake | null>(null);

  // Remembered, so someone who works with the assistant closed finds it
  // closed. Panel widths are not: they are splitter defaults, and a reader
  // who re-tunes them on every load is a question for later.
  const [layout, setLayout] = useLocalStorage<LayoutState>({
    key: "lytir-layout",
    defaultValue: DEFAULT_LAYOUT,
    getInitialValueInEffect: false,
  });

  const isActive = (id: string) =>
    wideViewport
      ? id === ASSISTANT
        ? layout.rightOpen
        : layout.leftOpen && layout.leftView === id
      : layout.active === id;

  // Pressing the active tab closes its panel, at both widths. On a narrow
  // viewport opening one section closes the others, because there is no room
  // for two and the crowding is what made the previous stack unreadable.
  const press = (id: string) => {
    const section = id as SectionId;

    setLayout((previous) => {
      if (!wideViewport) {
        return {
          ...previous,
          active: previous.active === section ? null : section,
        };
      }

      if (section === ASSISTANT) {
        return { ...previous, rightOpen: !previous.rightOpen };
      }

      const sameView = previous.leftView === section;

      return {
        ...previous,
        leftView: section,
        leftOpen: sameView ? !previous.leftOpen : true,
      };
    });
  };

  const leftPaneOpen = wideViewport && layout.leftOpen;
  const rightPaneOpen = wideViewport
    ? layout.rightOpen
    : layout.active !== null;

  // The panes stay mounted and are collapsed to nothing, rather than being
  // removed: unmounting the right pane would discard a conversation every time
  // someone closed the assistant to look at the map.
  useEffect(() => {
    const splitter = splitterRef.current;

    if (!splitter) {
      return;
    }

    if (leftPaneOpen) {
      splitter.expand(LEFT_PANE);
    } else {
      splitter.collapse(LEFT_PANE);
    }

    if (rightPaneOpen) {
      splitter.expand(RIGHT_PANE);
    } else {
      splitter.collapse(RIGHT_PANE);
    }
  }, [leftPaneOpen, rightPaneOpen]);

  // Mounted on first use and kept, so the Markdown renderer is downloaded once
  // and a closed assistant keeps its transcript.
  const assistantMounted = useRef(false);

  if (isActive(ASSISTANT)) {
    assistantMounted.current = true;
  }

  // No time window is sent, so the service applies its own default and echoes
  // what it used in `time_range`. Computing the window here would make the
  // browser's clock the authority on what "recent" means, which it is not.
  const { data, error, isPending } = useQuery({
    queryKey: EARTHQUAKES_QUERY_KEY,
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

  const earthquakes = error ? (
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
      // Read from the response rather than restated from the contract, so the
      // label cannot disagree with the data above it.
      windowLabel={formatWindowLabel(data?.time_range)}
    />
  );

  const assistant = assistantMounted.current ? (
    <Suspense
      fallback={
        <Center p="lg">
          <Loader size="sm" />
        </Center>
      }
    >
      {/* A phone has no height to spare, so the composer starts at one row
          and grows; a full-height panel can afford to show three. */}
      <Assistant compact={!wideViewport} />
    </Suspense>
  ) : null;

  // `hidden` rather than omitted, so a closed or unselected section keeps its
  // state and is hidden from assistive technology rather than merely sized to
  // nothing by the splitter.
  const section = (id: SectionId, content: React.ReactNode, fill = false) => {
    const active = isActive(id);

    return (
      <Box
        hidden={!active}
        // No `display` is set while hidden, because an inline `display` beats
        // the user-agent rule behind the `hidden` attribute and would show the
        // section again. A filling section manages its own scrolling; the
        // others scroll here.
        style={
          active
            ? fill
              ? {
                  flex: 1,
                  minHeight: 0,
                  display: "flex",
                  flexDirection: "column",
                }
              : { flex: 1, minHeight: 0, overflowY: "auto" }
            : { minHeight: 0 }
        }
      >
        {content}
      </Box>
    );
  };

  const sidebarTitle = SIDEBAR_TITLES[layout.leftView] ?? "";

  return (
    // The activity bar sits outside the splitter, at a fixed width on the
    // frame's outer edge, so it is never resized and never scrolls away. On a
    // narrow viewport a 48px strip of icons has nowhere to go, so the same
    // destinations become a row of labelled buttons above the content.
    <Box
      style={{
        display: "flex",
        flexDirection: wideViewport ? "row" : "column",
        height: SCREEN_HEIGHT,
      }}
    >
      {wideViewport ? (
        <ViewRail items={RAIL_ITEMS} isActive={isActive} onPress={press} />
      ) : null}
      <Splitter
        splitterRef={splitterRef}
        orientation={wideViewport ? "horizontal" : "vertical"}
        style={{ flex: 1, minWidth: 0, minHeight: 0 }}
      >
        {/* The sidebar: one view at a time, chosen from the rail. A fixed
            pixel width rather than a share of the window, because a table
            needs the room it needs — a percentage hands a small laptop a
            column too narrow to read and a large monitor more than it uses.
            Collapsed to nothing on a narrow viewport, where everything shares
            the pane below the map. */}
        <Splitter.Pane
          defaultSize={wideViewport ? "360px" : "0%"}
          min={wideViewport ? "180px" : "0%"}
          collapsible
          className="lytir-panel"
          style={{
            display: "flex",
            flexDirection: "column",
            minHeight: 0,
            minWidth: 0,
          }}
        >
          {wideViewport ? (
            <>
              <Text
                size="xs"
                fw={600}
                c="dimmed"
                tt="uppercase"
                px="sm"
                py={8}
                style={{ letterSpacing: "0.04em", flex: "0 0 auto" }}
              >
                {sidebarTitle}
              </Text>
              {section(EARTHQUAKES, earthquakes)}
              {section(ADMIN, <AdminView />, true)}
            </>
          ) : null}
        </Splitter.Pane>

        {/* A globe stays legible small, while a table and a conversation do
            not, so the map is what gives up room when a panel opens. */}
        <Splitter.Pane
          defaultSize={wideViewport ? 60 : "40%"}
          min={wideViewport ? "240px" : "20%"}
        >
          <EarthquakeMap
            mapRef={mapRef}
            data={collection}
            selected={selected}
            onSelect={setSelected}
          />
        </Splitter.Pane>

        {/* Right: the assistant on a wide viewport, and whichever single
            section is selected on a narrow one. The assistant stays in this
            pane at both widths, so crossing the breakpoint never remounts it
            and never discards a conversation. */}
        <Splitter.Pane
          defaultSize={wideViewport ? "380px" : "60%"}
          min={wideViewport ? "260px" : "0%"}
          collapsible
          className="lytir-panel"
          // The assistant fills this pane and scrolls inside itself, so the
          // pane must not scroll as well or the composer would leave the foot
          // of the panel as the transcript grew.
          style={{
            display: "flex",
            flexDirection: "column",
            minHeight: 0,
            minWidth: 0,
            overflow: "hidden",
          }}
        >
          {wideViewport ? (
            section(ASSISTANT, assistant, true)
          ) : (
            <>
              {section(EARTHQUAKES, earthquakes)}
              {section(ASSISTANT, assistant, true)}
              {section(ADMIN, <AdminView />, true)}
            </>
          )}
        </Splitter.Pane>
      </Splitter>
      {wideViewport ? null : (
        <Box className="lytir-tabbar">
          <SectionTabs tabs={TABS} isActive={isActive} onPress={press} />
        </Box>
      )}
    </Box>
  );
}
