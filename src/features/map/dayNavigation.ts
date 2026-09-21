import type { DiagResponse } from "@/lib/diag";

export interface DayAvailability {
  startTime: number;
  utcNow: number;
  firstDate: string;
  currentDate: string;
  maxWindowHours: number;
}

export interface DayRequest {
  startTime: string;
  endTime: string;
}

const DAY_MS = 86_400_000;
const HOUR_MS = 3_600_000;
const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

const pad = (value: number) => String(value).padStart(2, "0");

function parseDay(date: string): number | null {
  const match = DATE_PATTERN.exec(date);

  if (!match) {
    return null;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const at = Date.UTC(year, month - 1, day);
  const parsed = new Date(at);

  if (
    parsed.getUTCFullYear() !== year ||
    parsed.getUTCMonth() !== month - 1 ||
    parsed.getUTCDate() !== day
  ) {
    return null;
  }

  return at;
}

function toDay(at: number): string {
  const date = new Date(at);

  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`;
}

const OFFSET_SUFFIX = /(?:[zZ]|[+-]\d{2}:\d{2})$/;

function parseInstant(value: string | undefined): number | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();

  if (!trimmed || !OFFSET_SUFFIX.test(trimmed)) {
    return null;
  }

  const at = Date.parse(trimmed);

  return Number.isNaN(at) ? null : at;
}

function parseMaxWindowHours(
  value: number | string | undefined,
): number | null {
  const hours =
    typeof value === "number"
      ? value
      : typeof value === "string" && value.trim()
        ? Number(value)
        : Number.NaN;

  return Number.isFinite(hours) && hours > 0 ? hours : null;
}

export function readDayAvailability(
  diag: DiagResponse | undefined,
): DayAvailability | null {
  const utcNow = parseInstant(diag?.utc_now);
  const startTime = parseInstant(diag?.dataset_info?.time_range?.start_utc);
  const maxWindowHours = parseMaxWindowHours(
    diag?.dataset_info?.query_constraints?.max_window_hours,
  );

  if (utcNow === null || startTime === null || maxWindowHours === null) {
    return null;
  }

  if (startTime >= utcNow) {
    return null;
  }

  return {
    startTime,
    utcNow,
    firstDate: toDay(startTime),
    currentDate: toDay(utcNow),
    maxWindowHours,
  };
}

export function dayRequest(
  date: string,
  availability: DayAvailability | null,
): DayRequest | null {
  const dayStart = parseDay(date);

  if (availability === null || dayStart === null) {
    return null;
  }

  if (availability.maxWindowHours < 24) {
    return null;
  }

  if (date < availability.firstDate || date > availability.currentDate) {
    return null;
  }

  const startTime = Math.max(dayStart, availability.startTime);
  const endTime = Math.min(dayStart + DAY_MS, availability.utcNow);

  if (endTime <= startTime) {
    return null;
  }

  if (endTime - startTime > availability.maxWindowHours * HOUR_MS) {
    return null;
  }

  return {
    startTime: new Date(startTime).toISOString(),
    endTime: new Date(endTime).toISOString(),
  };
}

export function shiftUtcDate(date: string, days: number): string | null {
  const dayStart = parseDay(date);

  return dayStart === null ? null : toDay(dayStart + days * DAY_MS);
}

export function formatUtcDate(date: string): string {
  const dayStart = parseDay(date);

  if (dayStart === null) {
    return date;
  }

  const parsed = new Date(dayStart);

  return `${MONTHS[parsed.getUTCMonth()]} ${parsed.getUTCDate()}, ${parsed.getUTCFullYear()}`;
}
