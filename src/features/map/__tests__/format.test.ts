import { describe, expect, it } from "vitest";
import {
  formatDepth,
  formatMagnitude,
  formatOccurredAtShort,
  formatOccurredDate,
  formatOccurredTime,
  formatPlace,
  formatWindowLabel,
} from "@/features/map/format";

describe("formatMagnitude", () => {
  it("shows one decimal place, so 0.97 does not read as 1", () => {
    expect(formatMagnitude(0.97)).toBe("1.0");
    expect(formatMagnitude(3.6)).toBe("3.6");
  });

  it("reports an absent magnitude as unknown rather than as zero", () => {
    expect(formatMagnitude(null)).toBe("Unknown");
  });
});

describe("formatDepth", () => {
  it("trims the reported precision to one decimal", () => {
    expect(formatDepth(0.779999971389771)).toBe("0.8 km");
    expect(formatDepth(39.648)).toBe("39.6 km");
  });

  it("keeps a shallow depth visible instead of collapsing it to zero", () => {
    expect(formatDepth(0.41)).toBe("0.4 km");
  });

  it("reports an absent depth as unknown", () => {
    expect(formatDepth(null)).toBe("Unknown");
  });
});

describe("formatOccurredDate and formatOccurredTime", () => {
  it("splits the instant so a table can repeat only the time", () => {
    expect(formatOccurredDate("2026-09-13T03:29:45.710000Z")).toBe(
      "09/13/2026",
    );
    // Minutes only: seconds widen the column and nobody reads them in a list.
    expect(formatOccurredTime("2026-09-13T03:29:45.710000Z")).toBe("03:29");
  });

  it("has no date to offer for an unparseable instant", () => {
    expect(formatOccurredDate("not a timestamp")).toBeNull();
    expect(formatOccurredDate("")).toBeNull();
  });

  it("still labels a missing time rather than showing nothing", () => {
    expect(formatOccurredTime("")).toBe("Time not reported");
  });
});

describe("formatOccurredAtShort", () => {
  it("gives a selected event one line, to the minute, with its zone", () => {
    expect(formatOccurredAtShort("2026-09-13T03:29:45.710000Z")).toBe(
      "09/13/2026 03:29 UTC",
    );
  });

  it("falls back to whatever the time says when there is no date", () => {
    expect(formatOccurredAtShort("")).toBe("Time not reported");
  });
});

describe("formatPlace", () => {
  it("passes a reported place through unchanged", () => {
    expect(formatPlace("67 km N of Culebra, Puerto Rico")).toBe(
      "67 km N of Culebra, Puerto Rico",
    );
  });

  it("substitutes for an absent or blank place", () => {
    expect(formatPlace(null)).toBe("Location not reported");
    expect(formatPlace("   ")).toBe("Location not reported");
  });
});

describe("formatWindowLabel", () => {
  // The response that exposed the original bug: the interface said "the last
  // hour" while the service had answered two.
  const twoHours = {
    start_utc: "2026-09-13T16:56:19.367155Z",
    end_utc: "2026-09-13T18:56:19.367155Z",
  };

  it("states the window itself rather than paraphrasing its length", () => {
    expect(formatWindowLabel(twoHours)).toBe("09/13/2026 16:56 to 18:56 UTC");
  });

  it("needs no special phrasing for an awkward span", () => {
    // 41 minutes is the case a duration phrase handles badly and a window
    // does not notice at all.
    expect(
      formatWindowLabel({
        start_utc: "2026-09-13T18:15:19Z",
        end_utc: "2026-09-13T18:56:19Z",
      }),
    ).toBe("09/13/2026 18:15 to 18:56 UTC");
  });

  it("names both dates when the window crosses midnight", () => {
    expect(
      formatWindowLabel({
        start_utc: "2026-09-12T23:30:00Z",
        end_utc: "2026-09-13T00:30:00Z",
      }),
    ).toBe("09/12/2026 23:30 to 09/13/2026 00:30 UTC");
  });

  it("states the date once when the window stays inside one day", () => {
    expect(formatWindowLabel(twoHours)).toBe("09/13/2026 16:56 to 18:56 UTC");
  });

  it("says nothing when the service did not report a window", () => {
    expect(formatWindowLabel(undefined)).toBeNull();
  });

  it("says nothing rather than inventing a period from a bad range", () => {
    expect(
      formatWindowLabel({
        start_utc: "not a date",
        end_utc: "2026-09-13T18:56:19Z",
      }),
    ).toBeNull();
    // An end at or before the start describes no period at all.
    expect(
      formatWindowLabel({
        start_utc: "2026-09-13T18:56:19Z",
        end_utc: "2026-09-13T18:56:19Z",
      }),
    ).toBeNull();
  });
});
