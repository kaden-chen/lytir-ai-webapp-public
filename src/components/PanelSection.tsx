import type { ReactNode } from "react";
import { useId } from "react";
import { Box, Group, Text, UnstyledButton } from "@mantine/core";
import "@/components/PanelSection.css";

interface PanelSectionProps {
  title: string;
  open: boolean;
  onToggle: () => void;
  children: ReactNode;
}

function Chevron({ open }: { open: boolean }) {
  return (
    <Box
      component="svg"
      aria-hidden
      viewBox="0 0 24 24"
      w={14}
      h={14}
      style={{
        flexShrink: 0,
        transform: open ? "rotate(90deg)" : undefined,
        transition: "transform 150ms ease",
      }}
    >
      <path
        d="M9 6l6 6-6 6"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Box>
  );
}

/**
 * One collapsible row of the side panel.
 *
 * An open section takes a share of the panel's height and scrolls inside
 * itself, rather than growing to fit its content. That is what lets the
 * assistant keep its input box pinned beneath its answers instead of leaving it
 * somewhere in a long scrolling column, and it is why this is not Mantine's
 * `Accordion`, which sizes itself to its content.
 *
 * A closed section keeps its header, so the panel is never empty and needs no
 * separate control elsewhere to bring it back.
 */
export function PanelSection({
  title,
  open,
  onToggle,
  children,
}: PanelSectionProps) {
  const headerId = useId();
  const contentId = useId();

  return (
    <Box
      style={{
        display: "flex",
        flexDirection: "column",
        // Never grows into spare space, and never shrinks against a sibling.
        // Growing left a gap that pushed the next header to the bottom of the
        // window; shrinking let a long table crush the assistant into a few
        // pixels. A section is its content, and the panel scrolls.
        flex: "0 0 auto",
        minHeight: 0,
      }}
    >
      {/* A quiet full-width row, not a bordered button. The click target still
          spans the panel — which is why this was a button in the first place —
          but a stacked pair of filled grey bars read as widget title bars and
          made the panel look like a collection of separate tools rather than
          one surface. The affordance now comes from the hover tint and the
          chevron, and the focus ring is stated explicitly because
          UnstyledButton brings none of its own. */}
      <UnstyledButton
        id={headerId}
        onClick={onToggle}
        aria-expanded={open}
        aria-controls={contentId}
        className="lytir-section-header"
      >
        <Group gap={8} wrap="nowrap">
          <Chevron open={open} />
          <Text size="sm" fw={600} lh={1.2}>
            {title}
          </Text>
        </Group>
      </UnstyledButton>
      {/* `hidden` rather than unmounting: a collapsed section keeps its state,
          so closing the assistant to glance at the map does not discard the
          conversation. It also hides the content from assistive technology,
          which merely making it invisible would not. */}
      <Box
        id={contentId}
        role="region"
        aria-labelledby={headerId}
        hidden={!open}
        style={{ minHeight: 0 }}
      >
        {children}
      </Box>
    </Box>
  );
}
