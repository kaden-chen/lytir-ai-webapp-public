import {
  ActionIcon,
  Tooltip,
  useComputedColorScheme,
  useMantineColorScheme,
} from "@mantine/core";

// Inline rather than from an icon package, matching the chevron in
// PanelSection. Two glyphs do not justify a dependency.
function SunIcon() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      width={17}
      height={17}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    >
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      width={17}
      height={17}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
    </svg>
  );
}

/**
 * Switches between the light and dark colour schemes.
 *
 * Two states rather than three: "auto" is a sensible default but a poor
 * control, because a reader pressing a button wants the screen to change and
 * "follow the system" may not change it at all. The starting value is still
 * the light default; this only lets it be overridden, and Mantine persists the
 * choice so it survives a reload.
 *
 * The icon shows the scheme being offered, not the current one, and the label
 * says so in words — an icon alone cannot distinguish "you are in dark mode"
 * from "press for dark mode".
 */
export function ColorSchemeToggle() {
  const { setColorScheme } = useMantineColorScheme();
  // Resolves "auto" to whichever scheme is actually on screen, so the button
  // always offers the opposite of what the reader is looking at.
  const computed = useComputedColorScheme("light");
  const next = computed === "dark" ? "light" : "dark";
  const label = next === "dark" ? "Use dark theme" : "Use light theme";

  return (
    <Tooltip label={label}>
      <ActionIcon
        variant="subtle"
        color="gray"
        size="lg"
        aria-label={label}
        onClick={() => setColorScheme(next)}
      >
        {computed === "dark" ? <SunIcon /> : <MoonIcon />}
      </ActionIcon>
    </Tooltip>
  );
}
