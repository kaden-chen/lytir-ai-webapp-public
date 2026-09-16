import { Box, Tooltip, UnstyledButton } from "@mantine/core";
import "@/components/ViewRail.css";

export interface RailItem {
  id: string;
  label: string;
  icon: "earthquakes" | "assistant" | "admin";
  /** Pinned to the foot of the rail, away from the panel-view icons. */
  atEnd?: boolean;
}

interface ViewRailProps {
  items: RailItem[];
  isActive: (id: string) => boolean;
  onPress: (id: string) => void;
}

// Inline rather than from an icon package, matching the chevron and the
// sun and moon already drawn this way. A handful of glyphs does not justify a
// dependency.
function Icon({ name }: { name: RailItem["icon"] }) {
  const common = {
    width: 22,
    height: 22,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };

  if (name === "earthquakes") {
    // A seismogram rather than a list: the panel holds readings, and the
    // trace says which readings without needing the label to be read.
    return (
      <Box component="svg" {...common}>
        <path d="M2 12h3l2.5-7 3.5 14 3-10 2 5h6" />
      </Box>
    );
  }

  if (name === "assistant") {
    return (
      <Box component="svg" {...common}>
        <path d="M21 12a8 8 0 0 1-8 8H7l-4 3v-6.5A8 8 0 0 1 11 4h2a8 8 0 0 1 8 8z" />
      </Box>
    );
  }

  return (
    <Box component="svg" {...common}>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M19.1 4.9L17 7M7 17l-2.1 2.1" />
    </Box>
  );
}

/**
 * The activity bar.
 *
 * The one control that opens each panel, pinned to the frame's outer edge
 * rather than placed inside the panel it reveals — which is what made the
 * assistant easy to miss when it was a quiet header row inside the panel.
 *
 * Toggle buttons carrying `aria-pressed`, not a tablist: pressing the active
 * icon closes its panel, so "nothing selected" is reachable, and a tablist
 * asserts a permanent selection. Each icon carries a real accessible name,
 * because a glyph has none and a tooltip is not reachable by every reader.
 */
export function ViewRail({ items, isActive, onPress }: ViewRailProps) {
  const button = (item: RailItem) => {
    const active = isActive(item.id);

    return (
      <Tooltip
        key={item.id}
        label={item.label}
        position="right"
        openDelay={300}
      >
        <UnstyledButton
          className="lytir-rail-button"
          aria-label={item.label}
          aria-pressed={active}
          onClick={() => onPress(item.id)}
        >
          <Icon name={item.icon} />
        </UnstyledButton>
      </Tooltip>
    );
  };

  return (
    <Box
      className="lytir-rail"
      role="toolbar"
      aria-label="Views"
      aria-orientation="vertical"
    >
      {items.filter((item) => !item.atEnd).map(button)}
      <Box style={{ marginTop: "auto" }}>
        {items.filter((item) => item.atEnd).map(button)}
      </Box>
    </Box>
  );
}
