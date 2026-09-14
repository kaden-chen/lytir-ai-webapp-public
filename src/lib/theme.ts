import { createTheme } from "@mantine/core";

// Inter is self-hosted through @fontsource rather than fetched from a font CDN,
// so the interface does not depend on a third party at runtime and nothing
// about the reader is disclosed to one. The variable file carries every weight
// used here in a single request.
const SANS =
  '"Inter Variable", Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';

export const theme = createTheme({
  primaryColor: "cyan",
  // Warm hues encode magnitude, so the accent stays cool. Shade 7 rather than
  // Mantine's default 6: the lighter cyan does not reach 4.5:1 against white,
  // which a link or a focused control has to.
  primaryShade: { light: 7, dark: 5 },
  fontFamily: SANS,
  headings: { fontFamily: SANS, fontWeight: "600" },
  // A dense data interface reads as softer and less precise the rounder it
  // gets, and the panel sections are full-bleed rows that must not round at
  // all. Small everywhere is a deliberate floor rather than Mantine's default.
  defaultRadius: "sm",
  // An explicit scale exists so that sizes are chosen from it rather than
  // invented per component. Ad hoc values were the reason the interface had
  // four near-identical greys at 11px, 12px and 13px.
  fontSizes: {
    xs: "0.6875rem", // 11px — metadata only
    sm: "0.8125rem", // 13px — body default for dense panels
    md: "0.875rem", // 14px
    lg: "1rem", // 16px
    xl: "1.25rem", // 20px — a popup or answer headline
  },
  lineHeights: {
    xs: "1.3",
    sm: "1.45",
    md: "1.5",
    lg: "1.55",
    xl: "1.6",
  },
  components: {
    // Tabular figures by default. Magnitudes and depths are compared down a
    // column, and proportional digits make them wander by a pixel a row.
    Table: {
      styles: {
        table: { fontVariantNumeric: "tabular-nums" },
      },
    },
    Tooltip: {
      defaultProps: { withArrow: true, openDelay: 300 },
    },
    Anchor: {
      defaultProps: { underline: "not-hover" },
    },
  },
});
