import { useCallback, useEffect, useRef } from "react";
import { Box, Group, Table, Text, UnstyledButton } from "@mantine/core";
import { useElementSize } from "@mantine/hooks";
import "@/features/map/EarthquakeList.css";
import { EarthquakeCards } from "@/features/map/EarthquakeCards";
import { MagnitudeMark } from "@/features/map/MagnitudeMark";
import type { EarthquakeItem } from "@/features/map/earthquakes";
import {
  formatDepth,
  formatMagnitude,
  formatOccurredDate,
  formatOccurredTime,
  formatPlace,
} from "@/features/map/format";

// Digits of equal width, so magnitudes and depths line up down the column
// instead of wandering by a pixel or two per row.
const NUMERIC = { fontVariantNumeric: "tabular-nums" } as const;

// Below this, the four columns stop fitting and the list switches to cards.
// Measured against the panel rather than the viewport: the panel is narrow on
// a wide desktop too, and it is the panel the reader drags. A viewport query
// would have left a 380px panel on a 1400px screen rendering the table it
// cannot fit.
const CARD_WIDTH_THRESHOLD = 420;

// The date for a row, or null when the row above already showed it.
function dateFor(items: readonly EarthquakeItem[], index: number) {
  const current = items[index];

  if (!current) {
    return null;
  }

  const date = formatOccurredDate(current.occurred_at_utc);
  const previous = items[index - 1];
  const previousDate = previous
    ? formatOccurredDate(previous.occurred_at_utc)
    : null;

  return date === previousDate ? null : date;
}

interface EarthquakeListProps {
  items: readonly EarthquakeItem[];
  onSelect: (item: EarthquakeItem) => void;
  selectedId: string | null;
  /**
   * The period the counted events fall in, so the count means something, or
   * null when the service did not say. Null renders the count alone rather
   * than attaching a window the interface guessed at.
   */
  windowLabel: string | null;
}

// The map canvas is unreachable by a screen reader and by the keyboard, so this
// list is the accessible equivalent of the same data rather than an extra.
// Values are passed as React children: place strings are free text from USGS.
export function EarthquakeList({
  items,
  onSelect,
  selectedId,
  windowLabel,
}: EarthquakeListProps) {
  const selectedRow = useRef<HTMLElement | null>(null);
  // A callback ref rather than the ref object itself. A ref is written to as
  // well as read, so `RefObject<HTMLElement>` is not accepted where a row or a
  // button ref is expected; a callback that accepts the wider type is.
  const setSelectedRow = useCallback((node: HTMLElement | null) => {
    selectedRow.current = node;
  }, []);
  const { ref: measuredRef, width } = useElementSize();

  // Zero means not measured yet, which is also the case under a test's
  // no-op ResizeObserver. The table is the assumption because it is the
  // richer form; a panel that is genuinely narrow corrects itself on the
  // first measurement, before paint.
  const asCards = width > 0 && width < CARD_WIDTH_THRESHOLD;

  // Choosing a mark on the map should not leave its row somewhere below the
  // fold. `nearest` scrolls only when the row is actually out of sight, so a
  // visible selection does not make the table jump.
  useEffect(() => {
    const row = selectedRow.current;

    if (row && typeof row.scrollIntoView === "function") {
      row.scrollIntoView({ block: "nearest" });
    }
  }, [selectedId, asCards]);

  if (items.length === 0) {
    return (
      <Text size="sm" c="dimmed" p="sm">
        {windowLabel
          ? `No earthquakes reported in ${windowLabel}.`
          : "No earthquakes reported."}
      </Text>
    );
  }

  return (
    <Box ref={measuredRef}>
      {/* Lifted out of the table's caption so that both forms share one
          summary, and kept to a single line. A bare count is unanchored — six
          earthquakes over what period? — so the window follows it in lighter
          type: the count is the result, the window qualifies it. The service
          clock used to sit on a second line, but it is the same instant as the
          window's end for a window ending now, so it said nothing twice. */}
      <Box px="sm" pt="xs" pb={6}>
        <Text fz="lg" fw={700}>
          {items.length} {items.length === 1 ? "earthquake" : "earthquakes"}
          {windowLabel ? (
            <Text span fz="sm" fw={400} c="dimmed">
              {" · "}
              {windowLabel}
            </Text>
          ) : null}
        </Text>
      </Box>

      {asCards ? (
        <EarthquakeCards
          items={items}
          onSelect={onSelect}
          selectedId={selectedId}
          selectedRef={setSelectedRow}
        />
      ) : (
        <Table
          // Striping was doing the job of row spacing and doing it as a
          // spreadsheet would. Rows are separated by air and a hover tint
          // instead, which leaves the selected row's accent as the only fill.
          highlightOnHover
          stickyHeader
          verticalSpacing={8}
          horizontalSpacing="sm"
          className="lytir-quake-table"
          aria-label="Recent earthquakes"
        >
          <Table.Thead>
            {/* The abbreviated headings carry an explicit accessible name, so a
                screen reader still announces "Magnitude" rather than reading
                "Mag" aloud. The zone is stated here once instead of on every
                row, which is what buys Location its width. */}
            <Table.Tr>
              {/* Widths are fixed on everything except the place, which is the
                  only column whose length varies, so the numbers stay in line
                  instead of drifting apart as the panel is resized. */}
              <Table.Th scope="col" aria-label="Magnitude" w={72} ta="right">
                Mag
              </Table.Th>
              <Table.Th scope="col">Location</Table.Th>
              <Table.Th scope="col" w={100} ta="right">
                Time (UTC)
              </Table.Th>
              <Table.Th scope="col" w={82} ta="right" pr="sm">
                Depth
              </Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {items.map((item, index) => (
              <Table.Tr
                key={item.id}
                ref={item.id === selectedId ? setSelectedRow : undefined}
                // Marks the row the map is currently showing. `aria-current`
                // rather than `aria-selected`, which a table row is not
                // allowed.
                aria-current={item.id === selectedId ? "true" : undefined}
                // The tint is mixed down in CSS rather than using Mantine's
                // light variant, which filled the row strongly enough to
                // outweigh the magnitude marks beside it. The left edge is
                // what carries the state without relying on colour.
                data-selected={item.id === selectedId ? "true" : undefined}
              >
                <Table.Td>
                  <Group gap={6} wrap="nowrap" justify="flex-end">
                    <MagnitudeMark magnitude={item.magnitude} />
                    <Text size="sm" fw={600} style={NUMERIC}>
                      {formatMagnitude(item.magnitude)}
                    </Text>
                  </Group>
                </Table.Td>
                <Table.Td>
                  {/* Still a real button, so the row is reachable by keyboard
                      and announced as actionable — but no longer painted like
                      a hyperlink. Link-coloured place names were the most
                      saturated thing in the table and competed with the
                      magnitude ramp, which is the one encoding that is
                      supposed to carry colour. */}
                  <UnstyledButton
                    type="button"
                    className="lytir-place-button"
                    onClick={() => onSelect(item)}
                  >
                    <Text size="sm" lh={1.35}>
                      {formatPlace(item.place)}
                    </Text>
                  </UnstyledButton>
                </Table.Td>
                <Table.Td ta="right">
                  {/* The date appears on the first row of each day only. A
                      longer window still shows every day boundary; an hour's
                      worth of events no longer repeats one date down the
                      column. */}
                  {dateFor(items, index) ? (
                    <Text size="xs" c="dimmed" style={NUMERIC}>
                      {dateFor(items, index)}
                    </Text>
                  ) : null}
                  <Text size="sm" style={NUMERIC}>
                    {formatOccurredTime(item.occurred_at_utc)}
                  </Text>
                </Table.Td>
                <Table.Td ta="right" pr="sm">
                  <Text size="sm" style={NUMERIC}>
                    {formatDepth(item.depth_km)}
                  </Text>
                </Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      )}
    </Box>
  );
}
