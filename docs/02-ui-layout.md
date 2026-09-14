# UI Layout — map, data, and collapsible feature sections

## Status

Agreed design, not yet built. Supersedes the navigation approach proposed in
issue #36 and the partial implementation on the branch for issue #35.

## Purpose

Define where the map, the earthquake table, the AI assistant, and the
administrator functions live on screen, and how a reader moves between them.
This is written before implementation because it replaces a layout decision
that was already partly built, and because three features that do not exist
yet have to fit into it without a further rearrangement.

## The problem

The application currently has one screen: a map beside a table of recent
earthquakes, divided by a draggable splitter. Two features are coming — the AI
assistant (#35) and the administrator data refresh (#34) — and a third is
plausible later. Neither has anywhere to go.

## Decision

**The map is always visible. Everything else is a collapsible section inside a
single panel.**

```text
Desktop                                Mobile
┌──────────────┬─────────────────┐     ┌───────────────────────┐
│              │ ▾ Earthquakes   │     │                       │
│              │   (table)       │     │         Map           │
│              │                 │     │                       │
│     Map      ├─────────────────┤     ├───────────────────────┤
│              │ ▸ Ask Lytir     │     │ ▾ Earthquakes         │
│              │ ▸ Admin         │     │   (table)             │
│              │                 │     ├───────────────────────┤
└──────────────┴─────────────────┘     │ ▸ Ask Lytir           │
   ↑ draggable splitter                │ ▸ Admin               │
                                       └───────────────────────┘
```

The existing splitter continues to divide the map from the panel, turning with
the breakpoint: side by side on a wide viewport, stacked on a narrow one. That
already works and does not change.

### Rules

1. **The map never collapses.** It is the anchor, and it is the reason the
   other content is worth reading.
2. **Every section collapses, including the table.** The same behaviour at
   every width. A desktop reader has the room and will rarely bother; a phone
   reader will collapse the table to read a long answer.
3. **Several sections may be open at once.** This is what makes the table and
   an answer visible together on a desktop.
4. **A section is as tall as its content, and the panel scrolls.** Two earlier
   attempts were wrong in opposite directions, and both were visible on screen:
   letting an open section grow into spare space left a gap that pushed the
   next header to the bottom of the window, where it read as a status bar;
   letting sections shrink against each other let a twelve-row table crush the
   assistant into a strip a few pixels tall. Sections neither grow nor shrink.
5. **A section that needs its own scrolling caps its own content**, rather than
   claiming a height from the panel. The assistant caps its transcript, so the
   question box sits directly beneath it whether there are no answers or
   twenty. An earlier version gave the whole section a fixed height, which
   reserved that space even when empty and made the feature look unfinished.
6. **The selection is visible in both places at once.** Choosing a mark on the
   map tints its row in the accent colour and scrolls it into view; choosing a
   row moves the map and opens the same popup. Without this the two halves read
   as neighbouring tools rather than one view of one thing.
7. **Collapsed sections keep their headers.** The panel is therefore never
   empty, which means there is no empty state to design and no toggle needed
   anywhere else in the interface.
8. **The panel's minimum size is whatever shows those headers**, not an
   arbitrary fraction. Dragging the splitter across leaves a thin strip of
   labels and gives the map nearly everything — a full-map view without a
   special mode. The minimum must still keep the labels readable.
9. **Which sections are open is remembered locally**, so a reader who works
   with the assistant open finds it open next time.
10. **The administrator section exists only for administrators.** That is a
   presentation decision; the API edge remains the authorization control.

### Why collapsible sections rather than tabs

Three shapes were considered. The differences are not cosmetic.

**Separate pages, reached from navigation in the header.** Rejected because the
map is the context for everything else. An answer about five earthquakes in
Hawaii is worth more with the map on screen, and a page swap takes it away.
This was partly built before that was understood.

**A tab control holding the assistant and the administrator functions.**
Rejected for two reasons. A tab strip always has exactly one selection, so
"show me the table and an answer together" is impossible. And when the whole
block is hidden, nothing on screen offers a way back, so it needs a separate
toggle button elsewhere — a control that exists only to undo another control.

**The table outside the tabs on desktop, inside them on mobile.** Rejected
because the set of tabs would then change shape as the window resized: three
on a phone, two on a desktop. A reader on the Data tab who widens the window
lands nowhere, and that has to be reconciled in code and in tests, for a
benefit that collapsible sections provide anyway.

Collapsible sections avoid all of it. The header is both the label and the way
back; any combination can be open or closed; and a fourth feature is another
row rather than a more crowded strip.

### Why not Mantine's Accordion

This is a weaker objection than it first appeared, and the reason changed once
rule 4 did. `Accordion` could carry rules 1 to 4 perfectly well now that a
section is as tall as its content.

What it cannot carry is rule 5. `Accordion` owns its panel's height in order to
animate it, and the assistant needs a bounded height with its own scrolling
region inside so its question box stays beneath its answers. Bending
`Accordion` to that is more work than a header button plus a content region,
which is what these are.

## Consequences

- The header navigation links and the `/ask` route added on the #35 branch are
  removed. The map remains the only route.
- The assistant's components are unaffected: the question box, the answer
  rendering, the safe Markdown renderer, and the follow-up packing all move
  into a section unchanged. Only the outer container changes.
- The assistant is loaded the first time its section is opened, keeping its
  Markdown renderer — about 50 kB compressed — out of the initial download.
  Once loaded it stays mounted, so collapsing the section does not discard a
  conversation.
- Issue #36 is answered by this document rather than by the routing it
  proposed.

## Accessibility

The table remains the accessible equivalent of the map canvas, which is
unreachable by a screen reader and by the keyboard. Collapsing it is a reader's
choice; it is never collapsed on their behalf in a way that removes the only
readable form of the data.

Each section header is a button carrying its expanded state, and each names the
region it controls. Sections are reachable and operable by keyboard, and a
collapsed section's content is hidden from assistive technology rather than
merely made invisible.

## Open questions

1. **Starting proportions — settled by looking at it.** Side by side, the map
   takes 60% and the panel 40%. Stacked, the map takes 40% and the panel 60%.
   A globe stays legible when small, while a table and a conversation do not,
   so the map is what gives up room; an answer containing a table needs the
   width more than the globe does. The divider adjusts both. Revisit if a
   section is added to the panel.
2. **Whether proportions should re-divide when a phone rotates.** Sizes apply
   when the layout first loads, so rotating will not re-proportion them unless
   they are managed deliberately. Tolerable today: a phone in landscape is
   still narrower than the breakpoint, so the layout does not change shape.
3. **Whether a reader's dragged proportions should be remembered**, as the open
   sections are. Not done, because the sizes would then have to be controlled
   state rather than defaults.
4. **What the administrator section contains.** The data refresh it is meant to
   hold is blocked: the API edge does not currently restrict the acquisition
   target by role, so any signed-in caller can trigger ingestion. Tracked as
   `lytir-ai#32`.
5. **Linking an answer to the map.** With the map permanently visible, a reader
   will expect the five earthquakes an answer describes to be identifiable on
   it. The Q&A response carries prose only — no records — so this is not
   possible today. It raises the value of the contract request tracked in #33.
