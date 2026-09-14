import { Box, Group, Stack, Text, UnstyledButton } from "@mantine/core";
import "@/features/map/EarthquakeList.css";
import { MagnitudeMark } from "@/features/map/MagnitudeMark";
import type { EarthquakeItem } from "@/features/map/earthquakes";
import {
  formatDepth,
  formatMagnitude,
  formatOccurredAtShort,
  formatPlace,
} from "@/features/map/format";

interface EarthquakeCardsProps {
  items: readonly EarthquakeItem[];
  onSelect: (item: EarthquakeItem) => void;
  selectedId: string | null;
  /** Attached to the selected card, so the panel can scroll it into view. */
  selectedRef: (node: HTMLElement | null) => void;
}

/**
 * The same events as the table, stacked one card to a row.
 *
 * Four columns cannot be read in a panel this narrow: three of them are fixed
 * to keep the numbers aligned, which left the place name a strip barely wide
 * enough for two words and wrapped "18 km SE of Silver Springs, Nevada" over
 * four lines. A card gives the place the full width and demotes the time and
 * depth to one metadata line beneath it.
 *
 * This is a list of buttons rather than a table, because with one field per
 * line there are no columns left to relate a cell to a heading — the reason a
 * table earns its markup in the first place. The whole card is the control,
 * since at this width there is nothing else in the row to click.
 */
export function EarthquakeCards({
  items,
  onSelect,
  selectedId,
  selectedRef,
}: EarthquakeCardsProps) {
  return (
    <Box
      component="ul"
      className="lytir-quake-cards"
      aria-label="Recent earthquakes"
    >
      {items.map((item) => {
        const selected = item.id === selectedId;

        return (
          <Box component="li" key={item.id}>
            <UnstyledButton
              ref={selected ? selectedRef : undefined}
              className="lytir-quake-card"
              data-selected={selected ? "true" : undefined}
              aria-current={selected ? "true" : undefined}
              onClick={() => onSelect(item)}
            >
              <Group gap="sm" wrap="nowrap" align="flex-start">
                {/* The magnitude keeps the headline position it has in the
                    table, so scanning down a column of numbers still works. */}
                <Group gap={6} wrap="nowrap" w={58} justify="flex-end">
                  <MagnitudeMark magnitude={item.magnitude} />
                  <Text
                    size="sm"
                    fw={600}
                    style={{ fontVariantNumeric: "tabular-nums" }}
                  >
                    {formatMagnitude(item.magnitude)}
                  </Text>
                </Group>
                <Stack gap={2} style={{ minWidth: 0 }}>
                  {/* Free text from USGS, passed as a child. */}
                  <Text size="sm" lh={1.35}>
                    {formatPlace(item.place)}
                  </Text>
                  {/* The full instant, not the table's bare time. A card has
                      no column heading to say which zone it is in. */}
                  <Text
                    size="xs"
                    c="dimmed"
                    style={{ fontVariantNumeric: "tabular-nums" }}
                  >
                    {formatOccurredAtShort(item.occurred_at_utc)} · Depth{" "}
                    {formatDepth(item.depth_km)}
                  </Text>
                </Stack>
              </Group>
            </UnstyledButton>
          </Box>
        );
      })}
    </Box>
  );
}
