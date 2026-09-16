import { Button, Group } from "@mantine/core";

export interface SectionTab {
  id: string;
  label: string;
}

interface SectionTabsProps {
  tabs: SectionTab[];
  isActive: (id: string) => boolean;
  onPress: (id: string) => void;
}

/**
 * The one control that decides what the panels show, at every width.
 *
 * It lives in the frame rather than inside the panels it opens. The previous
 * layout put each feature behind a quiet header row inside the panel it
 * revealed, and readers reported hardly noticing the assistant at all: an
 * affordance hidden inside the thing it opens is not an affordance.
 *
 * Toggle buttons carrying `aria-pressed`, not a tablist. Pressing the active
 * tab closes its panel, so "nothing selected" is reachable, which a tablist
 * asserts cannot happen — and a radio-backed control such as Mantine's
 * `SegmentedControl` reports nothing at all when the selected item is pressed
 * again.
 */
export function SectionTabs({ tabs, isActive, onPress }: SectionTabsProps) {
  return (
    <Group gap={4} p={4} wrap="nowrap">
      {tabs.map((tab) => {
        const active = isActive(tab.id);

        return (
          <Button
            key={tab.id}
            // Emphasis comes from the fill and the weight as well as the
            // colour, so the active tab does not depend on hue alone. The
            // accent is the cool primary: warm hues are the magnitude ramp's,
            // and chrome borrowing them would compete with the data.
            variant={active ? "filled" : "default"}
            fw={active ? 600 : 400}
            size="sm"
            h={40}
            aria-pressed={active}
            onClick={() => onPress(tab.id)}
            style={{ flex: 1 }}
          >
            {tab.label}
          </Button>
        );
      })}
    </Group>
  );
}
