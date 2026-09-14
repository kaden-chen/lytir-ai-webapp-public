import { Group, Stack, Text } from "@mantine/core";
import { MagnitudeMark } from "@/features/map/MagnitudeMark";
import type { EarthquakeProperties } from "@/features/map/earthquakes";
import {
  formatDepth,
  formatMagnitude,
  formatOccurredAtShort,
  formatPlace,
} from "@/features/map/format";

interface EarthquakeDetailsProps {
  properties: EarthquakeProperties;
}

// Every value is passed as a React child. The place string is free text from
// USGS, so it is never assembled into markup.
export function EarthquakeDetails({ properties }: EarthquakeDetailsProps) {
  return (
    <Stack gap={6}>
      {/* The magnitude is why the mark was worth clicking, so it reads as the
          headline rather than as the first of four equal lines. */}
      <Group gap={8} wrap="nowrap" align="center">
        <MagnitudeMark magnitude={properties.magnitude} size={12} />
        <Text
          fz={19}
          fw={700}
          lh={1.1}
          style={{ fontVariantNumeric: "tabular-nums" }}
        >
          M {formatMagnitude(properties.magnitude)}
        </Text>
      </Group>

      <Text size="sm" fw={500}>
        {formatPlace(properties.place)}
      </Text>

      {/* One metadata line rather than two stacked ones, and no seconds: this
          is a glance, not a record. */}
      <Text size="xs" c="dimmed">
        {formatOccurredAtShort(properties.occurred_at_utc)} · Depth{" "}
        {formatDepth(properties.depth_km)}
      </Text>
    </Stack>
  );
}
