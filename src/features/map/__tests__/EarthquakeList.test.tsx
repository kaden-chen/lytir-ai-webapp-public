import { MantineProvider } from "@mantine/core";
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { EarthquakeCards } from "@/features/map/EarthquakeCards";
import { EarthquakeList } from "@/features/map/EarthquakeList";
import type { EarthquakeItem } from "@/features/map/earthquakes";

function item(overrides: Partial<EarthquakeItem> = {}): EarthquakeItem {
  return {
    id: "ca790b06",
    event_type: "earthquake",
    magnitude: 3.6,
    place: "67 km N of Culebra, Puerto Rico",
    occurred_at_utc: "2026-09-13T03:00:05.407000Z",
    updated_at_utc: "2026-09-13T03:16:25.040000Z",
    longitude: -65.2593,
    latitude: 18.9075,
    depth_km: 39.648,
    ...overrides,
  };
}

const onSelect = vi.fn<(item: EarthquakeItem) => void>();

beforeEach(() => {
  onSelect.mockClear();
});

function renderList(
  items: EarthquakeItem[],
  {
    selectedId = null as string | null,
    windowLabel = "09/13/2026 16:56 to 18:56 UTC" as string | null,
  } = {},
) {
  return render(
    <MantineProvider>
      <EarthquakeList
        items={items}
        onSelect={onSelect}
        selectedId={selectedId}
        windowLabel={windowLabel}
      />
    </MantineProvider>,
  );
}

describe("EarthquakeList", () => {
  it("exposes the map's data as a table for assistive technology", () => {
    renderList([item()]);

    const table = screen.getByRole("table", { name: "Recent earthquakes" });
    expect(table).toBeTruthy();
    expect(
      screen.getByRole("columnheader", { name: "Magnitude" }),
    ).toBeTruthy();
  });

  it("renders the place as text rather than as markup", () => {
    renderList([item({ place: "<img src=x onerror=alert(1)>" })]);

    const cell = screen.getByRole("cell", {
      name: "<img src=x onerror=alert(1)>",
    });
    expect(cell.querySelector("img")).toBeNull();
  });

  it("shows every event it is given", () => {
    renderList([item({ id: "a" }), item({ id: "b" }), item({ id: "c" })]);

    expect(screen.getAllByRole("row")).toHaveLength(4);
  });

  it("labels unreported values instead of showing zeroes", () => {
    renderList([item({ magnitude: null, place: null, depth_km: null })]);

    expect(screen.getAllByRole("cell", { name: "Unknown" })).toHaveLength(2);
    expect(
      screen.getByRole("cell", { name: "Location not reported" }),
    ).toBeTruthy();
  });

  it("offers each place as a button, so the row is reachable by keyboard", () => {
    renderList([item()]);

    const button = screen.getByRole("button", {
      name: "67 km N of Culebra, Puerto Rico",
    });
    fireEvent.click(button);

    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect.mock.calls[0]?.[0].id).toBe("ca790b06");
  });

  it("anchors the count to a period, so the number means something", () => {
    renderList([item({ id: "a" }), item({ id: "b" })]);

    // The count and its window carry different weights, so they are separate
    // elements on one line; the caption is read as a whole.
    const caption = screen.getByText(/2 earthquakes/);
    expect(caption.textContent).toContain("09/13/2026 16:56 to 18:56 UTC");
  });

  it("keeps the count and its window on one line", () => {
    renderList([item()]);

    // One block element, so the window cannot be pushed onto a second line by
    // anything other than wrapping.
    const caption = screen.getByText(/1 earthquake/);
    expect(caption.textContent).toBe(
      "1 earthquake · 09/13/2026 16:56 to 18:56 UTC",
    );
  });

  it("names the period in the empty state too", () => {
    renderList([]);

    expect(
      screen.getByText(
        /No earthquakes reported in 09\/13\/2026 16:56 to 18:56 UTC/,
      ),
    ).toBeTruthy();
  });

  it("omits the period rather than inventing one when it is unknown", () => {
    renderList([item({ id: "a" }), item({ id: "b" })], { windowLabel: null });

    const caption = screen.getByText(/2 earthquakes/);
    expect(caption.textContent).toBe("2 earthquakes");
  });

  it("drops the period from the empty state too when it is unknown", () => {
    renderList([], { windowLabel: null });

    expect(screen.getByText("No earthquakes reported.")).toBeTruthy();
  });

  it("brings the selected row into view, so the map's popup has a visible row", () => {
    const scrollIntoView = vi.fn();
    // jsdom does not implement it, and the component guards on that, so the
    // test has to supply one to observe the call.
    Element.prototype.scrollIntoView = scrollIntoView;

    renderList([item({ id: "a" }), item({ id: "b" })], { selectedId: "b" });

    expect(scrollIntoView).toHaveBeenCalledWith({ block: "nearest" });
  });

  it("marks the row the map is currently showing", () => {
    renderList([item({ id: "a" }), item({ id: "b" })], { selectedId: "b" });

    const current = screen
      .getAllByRole("row")
      .filter((row) => row.getAttribute("aria-current") === "true");
    expect(current).toHaveLength(1);
  });

  it("shows the date once per day rather than on every row", () => {
    renderList([
      item({ id: "a", occurred_at_utc: "2026-09-13T03:00:00Z" }),
      item({ id: "b", occurred_at_utc: "2026-09-13T02:00:00Z" }),
      item({ id: "c", occurred_at_utc: "2026-09-12T23:00:00Z" }),
    ]);

    // Twice: once for each day present, not once per row.
    expect(screen.getAllByText("09/13/2026")).toHaveLength(1);
    expect(screen.getAllByText("09/12/2026")).toHaveLength(1);
    expect(screen.getByText("03:00")).toBeTruthy();
    expect(screen.getByText("02:00")).toBeTruthy();
  });

  it("says so when the period held no earthquakes", () => {
    renderList([]);

    expect(screen.getByText(/No earthquakes reported/)).toBeTruthy();
    expect(screen.queryByRole("table")).toBeNull();
  });
});

// The card form is rendered directly. Which form `EarthquakeList` chooses
// depends on a measured width, and the test environment's ResizeObserver is a
// no-op, so driving the choice from here would test the stub rather than the
// component.
describe("EarthquakeCards", () => {
  function renderCards(
    items: EarthquakeItem[],
    { selectedId = null as string | null } = {},
  ) {
    return render(
      <MantineProvider>
        <EarthquakeCards
          items={items}
          onSelect={onSelect}
          selectedId={selectedId}
          selectedRef={() => {}}
        />
      </MantineProvider>,
    );
  }

  it("offers one button per event, so a card is reachable by keyboard", () => {
    renderCards([item({ id: "a" }), item({ id: "b" })]);

    const buttons = screen.getAllByRole("button");
    expect(buttons).toHaveLength(2);

    fireEvent.click(buttons[1]!);
    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect.mock.calls[0]?.[0].id).toBe("b");
  });

  it("names the zone on every card, having no column heading to carry it", () => {
    renderCards([item({ occurred_at_utc: "2026-09-13T03:00:00Z" })]);

    expect(
      screen.getByText(/09\/13\/2026 03:00 UTC · Depth 39\.6 km/),
    ).toBeTruthy();
  });

  it("renders the place as text rather than as markup", () => {
    renderCards([item({ place: "<img src=x onerror=alert(1)>" })]);

    const card = screen.getByRole("button");
    expect(card.querySelector("img")).toBeNull();
    expect(card.textContent).toContain("<img src=x onerror=alert(1)>");
  });

  it("labels unreported values instead of showing zeroes", () => {
    renderCards([item({ magnitude: null, place: null, depth_km: null })]);

    expect(screen.getByText("Unknown")).toBeTruthy();
    expect(screen.getByText("Location not reported")).toBeTruthy();
  });

  it("marks the card the map is currently showing", () => {
    renderCards([item({ id: "a" }), item({ id: "b" })], { selectedId: "b" });

    const current = screen
      .getAllByRole("button")
      .filter((card) => card.getAttribute("aria-current") === "true");
    expect(current).toHaveLength(1);
  });
});
