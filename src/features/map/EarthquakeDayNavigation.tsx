import { useState } from "react";
import {
  ActionIcon,
  Box,
  Button,
  Group,
  Popover,
  Text,
  Tooltip,
} from "@mantine/core";
import { DatePicker } from "@mantine/dates";
import "@/features/map/EarthquakeDayNavigation.css";
import type { DayAvailability } from "@/features/map/dayNavigation";
import {
  dayRequest,
  formatUtcDate,
  shiftUtcDate,
} from "@/features/map/dayNavigation";

function CalendarIcon() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      width={16}
      height={16}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M3 10h18M8 3v4M16 3v4" />
    </svg>
  );
}

function BroadcastIcon() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      width={18}
      height={18}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="1.6" fill="currentColor" stroke="none" />
      <path d="M8.5 15.5a5 5 0 0 1 0-7M15.5 8.5a5 5 0 0 1 0 7" />
      <path d="M5.6 18.4a9 9 0 0 1 0-12.8M18.4 5.6a9 9 0 0 1 0 12.8" />
    </svg>
  );
}

interface EarthquakeDayNavigationProps {
  selectedDate: string | null;
  availability: DayAvailability | null;
  onSelectDate: (date: string) => void;
  onFollowLatest: () => void;
}

export function EarthquakeDayNavigation({
  selectedDate,
  availability,
  onSelectDate,
  onFollowLatest,
}: EarthquakeDayNavigationProps) {
  const current = selectedDate ?? availability?.currentDate ?? null;
  const previousDate = current ? shiftUtcDate(current, -1) : null;
  const nextDate = selectedDate ? shiftUtcDate(selectedDate, 1) : null;
  const canGoPrevious =
    previousDate !== null && dayRequest(previousDate, availability) !== null;
  const canGoNext =
    nextDate !== null && dayRequest(nextDate, availability) !== null;
  const unavailable = availability === null || availability.maxWindowHours < 24;
  const displayDate = selectedDate ?? availability?.currentDate ?? null;
  const [open, setOpen] = useState(false);

  return (
    <Box component="footer" className="lytir-daynav">
      <Group
        className="lytir-daynav-controls"
        gap="xs"
        wrap="nowrap"
        px="sm"
        py={6}
      >
        <Tooltip label="Previous day">
          <ActionIcon
            variant="default"
            aria-label="Previous day"
            className="lytir-daynav-control"
            disabled={!canGoPrevious}
            onClick={() => {
              if (previousDate !== null) {
                onSelectDate(previousDate);
              }
            }}
          >
            ‹
          </ActionIcon>
        </Tooltip>
        <Box className="lytir-daynav-date-wrap">
          <Popover
            opened={open}
            onChange={setOpen}
            position="top"
            withArrow
            withinPortal
            middlewares={{ flip: true, shift: true }}
          >
            <Popover.Target>
              <Button
                variant="default"
                leftSection={<CalendarIcon />}
                className="lytir-daynav-date"
                disabled={unavailable}
                aria-label={
                  selectedDate
                    ? `Choose a UTC date. Selected ${formatUtcDate(selectedDate)}`
                    : displayDate
                      ? `Choose a UTC date. Current ${formatUtcDate(displayDate)}`
                      : "Choose a UTC date"
                }
                onClick={() => {
                  setOpen((value) => !value);
                }}
              >
                {displayDate ? (
                  <span className="lytir-daynav-date-label">
                    <span className="lytir-daynav-date-value">
                      {formatUtcDate(displayDate)}
                    </span>
                    <span aria-hidden>·</span>
                    <span className="lytir-daynav-date-zone">UTC</span>
                  </span>
                ) : (
                  "Choose UTC date"
                )}
              </Button>
            </Popover.Target>
            <Popover.Dropdown className="lytir-daynav-calendar">
              <DatePicker
                aria-label="Choose a UTC date"
                value={selectedDate}
                defaultDate={displayDate ?? undefined}
                minDate={availability?.firstDate}
                maxDate={availability?.currentDate}
                getDayAriaLabel={(date) => `${formatUtcDate(date)} UTC`}
                onChange={(value) => {
                  if (value !== null) {
                    onSelectDate(value);
                    setOpen(false);
                  }
                }}
              />
            </Popover.Dropdown>
          </Popover>
        </Box>
        <Tooltip label="Next day">
          <ActionIcon
            variant="default"
            aria-label="Next day"
            className="lytir-daynav-control"
            disabled={!canGoNext}
            onClick={() => {
              if (nextDate !== null) {
                onSelectDate(nextDate);
              }
            }}
          >
            ›
          </ActionIcon>
        </Tooltip>
        {selectedDate === null ? (
          <Tooltip label="Following latest · Updates automatically">
            <Box
              role="status"
              aria-label="Following latest. Results update automatically."
              className="lytir-daynav-status"
            >
              <BroadcastIcon />
              <Box aria-hidden className="lytir-daynav-check">
                ✓
              </Box>
            </Box>
          </Tooltip>
        ) : (
          <Tooltip label="Follow latest">
            <ActionIcon
              variant="default"
              aria-label="Follow latest"
              className="lytir-daynav-control lytir-daynav-follow"
              onClick={onFollowLatest}
            >
              <BroadcastIcon />
            </ActionIcon>
          </Tooltip>
        )}
      </Group>
      {unavailable ? (
        <Text size="xs" c="dimmed" px="sm" pb={6}>
          Day history is unavailable right now; showing the latest events.
        </Text>
      ) : null}
    </Box>
  );
}
