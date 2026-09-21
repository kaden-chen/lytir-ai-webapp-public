import { describe, expect, it } from "vitest";
import type { DiagResponse } from "@/lib/diag";
import {
  dayRequest,
  formatUtcDate,
  readDayAvailability,
  shiftUtcDate,
} from "@/features/map/dayNavigation";

const DIAG: DiagResponse = {
  utc_now: "2026-09-17T15:20:20.763376+00:00",
  dataset_info: {
    time_range: {
      start_utc: "2026-09-11T17:00:00+00:00",
      end_utc: "2026-09-17T15:20:20.763376+00:00",
    },
    query_constraints: { max_window_hours: 720 },
  },
};

function diagWith(overrides: {
  utcNow?: string;
  startUtc?: string;
  endUtc?: string;
  max?: number | string;
}): DiagResponse {
  return {
    utc_now: overrides.utcNow ?? "2026-09-17T15:20:20.763376+00:00",
    dataset_info: {
      time_range: {
        start_utc: overrides.startUtc ?? "2026-09-11T17:00:00+00:00",
        end_utc: overrides.endUtc ?? "2026-09-17T15:20:20.763376+00:00",
      },
      query_constraints: { max_window_hours: overrides.max ?? 720 },
    },
  };
}

describe("readDayAvailability", () => {
  it("reads the service clock, dataset start, and maximum window", () => {
    const availability = readDayAvailability(DIAG);

    expect(availability).toEqual({
      startTime: Date.parse("2026-09-11T17:00:00+00:00"),
      utcNow: Date.parse("2026-09-17T15:20:20.763376+00:00"),
      firstDate: "2026-09-11",
      currentDate: "2026-09-17",
      maxWindowHours: 720,
    });
  });

  it("accepts a numeric-string maximum window", () => {
    const availability = readDayAvailability(diagWith({ max: "720" }));

    expect(availability?.maxWindowHours).toBe(720);
  });

  it.each([
    ["empty string", ""],
    ["whitespace string", "   "],
    ["non-numeric string", "many"],
    ["partially numeric string", "12abc"],
    ["non-finite number", Number.POSITIVE_INFINITY],
    ["zero", 0],
    ["negative", -24],
  ])("rejects a %s maximum", (_label, max) => {
    expect(
      readDayAvailability(diagWith({ max: max as number | string })),
    ).toBeNull();
  });

  it("rejects a missing or malformed clock", () => {
    expect(readDayAvailability(undefined)).toBeNull();
    expect(readDayAvailability({})).toBeNull();
    expect(readDayAvailability(diagWith({ utcNow: "soon" }))).toBeNull();
    expect(readDayAvailability(diagWith({ startUtc: "" }))).toBeNull();
  });

  it("rejects instants without an explicit UTC or offset suffix", () => {
    expect(
      readDayAvailability(diagWith({ utcNow: "2026-09-17T15:20:20" })),
    ).toBeNull();
    expect(readDayAvailability(diagWith({ utcNow: "2026-09-17" }))).toBeNull();
    expect(
      readDayAvailability(diagWith({ startUtc: "2026-09-11T17:00:00" })),
    ).toBeNull();
    expect(
      readDayAvailability(diagWith({ startUtc: "2026-09-11" })),
    ).toBeNull();
    // A lowercase z and a numeric offset are both explicit.
    expect(
      readDayAvailability(diagWith({ utcNow: "2026-09-17T15:20:20.763376z" })),
    ).not.toBeNull();
    expect(
      readDayAvailability(diagWith({ startUtc: "2026-09-11T19:00:00+02:00" }))
        ?.startTime,
    ).toBe(Date.parse("2026-09-11T17:00:00Z"));
  });

  it("rejects a dataset start at or after the service clock", () => {
    expect(
      readDayAvailability(diagWith({ startUtc: "2026-09-18T00:00:00+00:00" })),
    ).toBeNull();
    expect(
      readDayAvailability(
        diagWith({ startUtc: "2026-09-17T15:20:20.763376+00:00" }),
      ),
    ).toBeNull();
  });
});

describe("dayRequest", () => {
  const availability = readDayAvailability(DIAG);

  it("builds a complete UTC day", () => {
    expect(dayRequest("2026-09-16", availability)).toEqual({
      startTime: "2026-09-16T00:00:00.000Z",
      endTime: "2026-09-17T00:00:00.000Z",
    });
  });

  it("clamps the first available day to the dataset start", () => {
    expect(dayRequest("2026-09-11", availability)).toEqual({
      startTime: "2026-09-11T17:00:00.000Z",
      endTime: "2026-09-12T00:00:00.000Z",
    });
  });

  it("clamps the current day to the service clock", () => {
    expect(dayRequest("2026-09-17", availability)).toEqual({
      startTime: "2026-09-17T00:00:00.000Z",
      endTime: "2026-09-17T15:20:20.763Z",
    });
  });

  it("rejects dates outside the available range", () => {
    expect(dayRequest("2026-09-10", availability)).toBeNull();
    expect(dayRequest("2026-09-18", availability)).toBeNull();
  });

  it("rejects malformed and impossible dates", () => {
    expect(dayRequest("not-a-date", availability)).toBeNull();
    expect(dayRequest("2026-9-16", availability)).toBeNull();
    expect(dayRequest("2026-02-30", availability)).toBeNull();
    expect(dayRequest("2026-13-01", availability)).toBeNull();
  });

  it("rejects when no diagnostic answer is available", () => {
    expect(dayRequest("2026-09-16", null)).toBeNull();
  });

  it("rejects every date when the maximum window is under a day", () => {
    const small = readDayAvailability(diagWith({ max: 12 }));

    expect(small).not.toBeNull();
    expect(dayRequest("2026-09-16", small)).toBeNull();
    expect(dayRequest("2026-09-17", small)).toBeNull();
  });
});

describe("shiftUtcDate", () => {
  it("moves across month and year boundaries in UTC", () => {
    expect(shiftUtcDate("2026-09-16", -1)).toBe("2026-09-15");
    expect(shiftUtcDate("2026-09-16", 1)).toBe("2026-09-17");
    expect(shiftUtcDate("2026-10-01", -1)).toBe("2026-09-30");
    expect(shiftUtcDate("2026-01-01", -1)).toBe("2025-12-31");
  });

  it("returns null for an invalid date", () => {
    expect(shiftUtcDate("nope", 1)).toBeNull();
    expect(shiftUtcDate("2026-02-30", 1)).toBeNull();
  });
});

describe("formatUtcDate", () => {
  it("labels a UTC date with its full year", () => {
    expect(formatUtcDate("2026-09-16")).toBe("Sep 16, 2026");
    expect(formatUtcDate("2024-02-29")).toBe("Feb 29, 2024");
  });

  it("returns an unparseable value verbatim", () => {
    expect(formatUtcDate("whenever")).toBe("whenever");
  });
});
