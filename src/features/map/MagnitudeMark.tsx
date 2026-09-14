import { Box } from "@mantine/core";
import { magnitudeSwatch } from "@/features/map/earthquakeLayers";

interface MagnitudeMarkProps {
  magnitude: number | null;
  size?: number;
}

/**
 * A filled dot in the magnitude ramp's colour, so a row in the table carries
 * the same encoding as the circle on the map.
 *
 * Decorative, and hidden from assistive technology: the magnitude is already
 * written beside it, and colour is never the only carrier of the value. The
 * number is not coloured instead, because the pale end of the ramp would be
 * unreadable as text on a light background.
 */
export function MagnitudeMark({ magnitude, size = 10 }: MagnitudeMarkProps) {
  return (
    <Box
      component="span"
      aria-hidden
      w={size}
      h={size}
      style={{
        flexShrink: 0,
        borderRadius: "50%",
        background: magnitudeSwatch(magnitude),
        boxShadow: "inset 0 0 0 1px rgba(0, 0, 0, 0.2)",
      }}
    />
  );
}
