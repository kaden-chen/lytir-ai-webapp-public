# Administrator basemap selection

## Status

Proposed, not built. Belongs to the administrator section introduced by issue
`#34`, and can ship before the data-refresh control in that issue, which is
blocked on `lytir-ai#32`.

## Purpose

Give an administrator a way to try basemap styles against real data in the
running application, so that `VITE_MAP_STYLE_LIGHT` and `VITE_MAP_STYLE_DARK`
can be set with confidence and deployed.

**This is an instrument for reaching a decision, not a feature for living
with one.** Its deliverable is a style URL that someone then puts in the
environment configuration. The selection is not meant to outlive the session
that made it, and nothing a reader depends on is built on it.

## The problem

The basemap is a build-time value, inlined by Vite. Changing it means editing
the environment and rebuilding, and in a deployed environment that means a
release. That is fine for a settled choice and useless for reaching one.

Choosing a basemap is a visual judgement that can only be made against real
data at more than one zoom. This was learned expensively: OpenFreeMap `fiord`
was chosen on measured land-versus-water contrast at world zoom and looked
correct there, while at street zoom it renders as a single flat wash in which
a freeway and a driveway are the same colour. No contrast figure revealed
that; only looking at it did.

A build-and-deploy cycle per candidate is too slow for that loop. The CARTO
decision was actually reached with a temporary `?basemap=` URL parameter added
and then deleted — development scaffolding that should not exist in a deployed
build, rebuilt by hand each time the question comes up.

## Decision

**An administrator may enter any style URL, with a shortlist of known styles
offered as starting points, for the current session only.**

### Rules

1. **The configured environment value stays the default.** The override is
   additive. A fresh session, and every non-administrator, renders exactly
   what the environment configures.
2. **Arbitrary style URLs are accepted, not just listed ones.** The purpose is
   to evaluate styles that have not been evaluated yet, so a fixed list would
   defeat it. The shortlist exists to save typing for the styles already
   known, not to constrain the choice.
3. **The selection lives for the session and is not persisted.** It is React
   state. Not `localStorage`, which is what Mantine uses for the colour scheme
   and which would survive a browser close. Not the URL: a shared link is for
   view state worth reproducing, and one administrator's experiment is not
   that. Signing out unmounts the tree that holds it.
4. **The chosen URL is displayed for copying.** The output of this tool is a
   string destined for an environment variable, so the interface should hand
   it over rather than leave it to be retyped from a dropdown label.
5. **One selection per colour scheme.** The two environment variables are
   separate and are evaluated separately; a dark style judged in light mode
   tells you nothing.
6. **The control is administrator-only for display, and that is all it is.** A
   basemap is cosmetic. No authorization boundary is crossed, so a
   client-side role check is appropriate here and is not an exception to the
   rule that client-side role checks decide only what is shown.
7. **It lives in the administrator section, not the header.** The header's
   colour-scheme toggle is for every reader. This is not.

### Where the shortlist lives

**Numbered environment variable pairs, discovered at runtime.** Two variables
per entry, indexed, one set per colour scheme:

```text
VITE_MAP_STYLE_DARK_01_NAME=Generic dark
VITE_MAP_STYLE_DARK_01_LOCATION=https://tiles.openfreemap.org/styles/fiord
VITE_MAP_STYLE_DARK_02_NAME=CARTO Dark Matter
VITE_MAP_STYLE_DARK_02_LOCATION=https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json
VITE_MAP_STYLE_LIGHT_01_NAME=CARTO Positron
VITE_MAP_STYLE_LIGHT_01_LOCATION=https://basemaps.cartocdn.com/gl/positron-gl-style/style.json
```

This is chosen over a constant in code because the deployment rebuilds on
every push: editing a GitHub environment variable and re-running the workflow
changes the list with no source change, no pull request, and no review. The
values are still inlined at build time, so it is not a runtime configuration —
but "needs a rebuild" and "needs a code change" are different costs here, and
only the second requires a developer.

Two variables per entry rather than one delimited string, because a delimited
string has nowhere to put the name. Carrying a name and a location in one
value means a second delimiter inside the first, which is a serialisation
format with a parser and its own failure modes.

#### Discovery

Enumeration is possible because Vite serialises the whole `import.meta.env`
object into the bundle, not only the keys the source mentions by name. This
was verified rather than assumed: a build with
`VITE_MAP_STYLE_DARK_09_NAME=ZZPROBEZZ` set emits both that key and its value
into the production chunk, reachable through `Object.keys`.

The rules for reading them:

1. Match `^VITE_MAP_STYLE_(LIGHT|DARK)_(\d+)_(NAME|LOCATION)$`, group by
   scheme and index, and order numerically — so `10` follows `02` whatever
   the zero padding.
2. **An index contributes an entry only when both halves are present and
   non-empty.** A half-configured pair is a mistake, and offering "undefined"
   in a menu, or a nameless URL, is worse than offering nothing.
3. **A location that is not an absolute `http`/`https` URL is skipped.** This
   is not a security control — rule 2 already lets an administrator type any
   URL — it only keeps a typo out of the menu.
4. **Report a skipped or half-configured entry in development**, where someone
   is editing the variables, and stay silent in production, where a cosmetic
   list must not break the application.
5. **The enumeration lives in `src/lib/env.ts`**, which is the only module
   permitted to read `import.meta.env`, and is exposed as ordinary data for
   the map feature to consume.

#### Deliberately not validated at startup

`VITE_MAP_STYLE_LIGHT` and `VITE_MAP_STYLE_DARK` stay required. **The numbered
variables are optional and must not be added to the startup validation list or
to the staging deployment guard.** The convention in this repository is that
every `VITE_` variable is added to both, so this exception will look like an
oversight and someone will eventually "fix" it. It is deliberate: no
environment should be required to configure a convenience, and an absent
shortlist is a working state — the free-text field still accepts any URL.

#### If the list should later come from the backend

The discovery function returns a plain structure — a list of name-and-location
pairs per scheme. Nothing in the control knows where that came from, so
replacing the environment source with an API response is a change to one
function and not to the feature. That is the option to take if the list ever
needs to change without a redeploy.

### Shape

```text
basemapStyleUrl(scheme, override?)   ← one extra argument
        │
        ├── override ?? env.mapStyle[scheme]
        │
Admin section ──> setOverride(url)   ← React state, session only
```

Every basemap decision already flows through that single function, and no
component reads `import.meta.env` or holds a style URL, so the override has
exactly one place to be applied.

## Accepted consequences

**A style may not carry the glyphs the cluster-count labels need.** The
cluster-count layer names a fontstack explicitly, and a style whose glyph
endpoint does not serve it renders cluster circles with no number inside
them. Under an earlier reading of this feature that justified a curated list.
It does not: an administrator trying styles is testing, the failure is
visible immediately, and a style that breaks it simply will not be the one
chosen. Preventing it would cost the feature its purpose.

This is worth stating next to the control, so the effect is recognised rather
than mistaken for a fault in the application.

**The browser will fetch a style from whatever host is entered.** The value
is typed by an administrator and reaches only the map renderer; no credential
is attached and nothing is persisted. Worth knowing, not worth preventing,
for a control whose whole point is pointing at a URL someone chose.

## Rejected alternatives

**A curated list of verified styles only.** Rejected once the purpose was
clear. The list cannot contain the style nobody has evaluated yet, which is
the only kind worth evaluating. Curation solves a production problem this
feature does not have.

**A single environment variable holding the shortlist as a delimited string.**
Rejected in favour of numbered pairs. A newline inside a double-quoted value
does survive dotenv, so it works locally, but a multi-line value threaded
through `${{ vars.* }}` into a workflow's `env` mapping is fragile, and one
value carries no name unless a second delimiter is nested inside the first.

**A typed constant in code.** Considered and not chosen. It is simpler — no
enumeration, no pairing rules, no half-configured entries — and it would let
the list be checked against the configured defaults. It was rejected because
adding a style would then require a developer and a pull request, while the
numbered variables let the list be changed by editing a GitHub environment
variable and re-running the workflow. An earlier draft of this document chose
the constant on the argument that an environment variable only earns its place
when a value can change without a release. That argument was wrong for this
deployment: Azure Static Web Apps rebuilds on every push, so a rebuild is not
a release in the sense that mattered.

**A second environment variable for the cluster-count fontstack.** Rejected.
It moves the coupling rather than removing it, leaves two values that must
agree with nothing checking that they do, and adds a required variable to
startup validation, the README, and every deployment environment.

**Persisting the selection.** Rejected. A persisted experiment becomes an
undocumented deployment whose origin nobody remembers. A style good enough to
keep belongs in the environment configuration, which is the point of the
tool.

## Accessibility

The control is a labelled text input with an optional shortlist, reachable and
operable by keyboard, naming the style currently in effect rather than only
the alternatives. Changing the basemap changes nothing about the earthquake
list, which remains the accessible equivalent of the canvas.

## Open questions

1. **Does swapping the style discard the clustered source and its
   feature-state?** MapLibre replaces the whole style on a change, and
   `react-map-gl` re-adds the declared children afterwards. Whether the hover
   state held in `feature-state` and the cluster source survive that has not
   been tested. If hover breaks, the selection has to re-apply it. This is the
   one genuine technical risk in the feature and should be proved first.
2. **What happens when a style fails to load?** An entered URL can be wrong,
   unreachable, or not a style at all. Reverting silently to the configured
   default would look like the control did nothing, so the failure needs to be
   reported. Undecided.
3. **Should the cluster-count labels exist at all?** They are the only reason
   the fontstack coupling exists, and a number drawn inside a circle that is
   coloured by the magnitude ramp invites being read as a magnitude rather
   than a count. If they were removed, or clusters were made visually distinct
   from single events, the basemap would be decoupled from the application
   code entirely. Tracked separately from this feature.
