# Frontend Architecture — lytir-ai-webapp

**Date:** 2026-09-12
**Status:** Accepted — implemented and promoted to `main`
**Ticket:** [#1](https://github.com/rubicon-sasgeo/lytir-ai-webapp/issues/1)

## Purpose

Define the frontend architecture and technology choices for `lytir-ai-webapp`,
the web client for Lytir AI. The application lets signed-in users explore
global earthquake activity on an interactive map, ask an AI assistant
natural-language questions, and — for administrators — trigger backend
ingestion operations.

This document records what was decided, what was rejected and why, and what
remains open. It is a decision record, not a tutorial.

## Constraints

These shaped every choice below.

- **Small team.** Solutions must be learnable, debuggable, and boring.
- **Simplicity is the priority.** Avoid libraries that do not pay for
  themselves. Prefer known patterns over new ones.
- **Everything is behind sign-in.** There is no anonymous access, no public
  content, and therefore no SEO or social-preview requirement.
- **The backend already exists** as an Azure Functions application in the
  `lytir-ai` repository. It uses function-level authorization, and its Q&A API
  is stateless and single-round.
- **Non-enterprise identity.** Workforce Entra ID tenants are impractical
  here, so identity must come from a provider that works for personal
  accounts.
- **An Azure subscription is already in place**, with GitHub Actions
  deployment already proven in a sibling project.
- **Visual design is deferred.** Palette, typography, and map styling are
  explicitly a later phase.

## Architecture overview

```text
┌────────────────────────┐
│  Browser (static SPA)  │  Vite bundle on Azure Static Web Apps
│  React + Mantine       │
└───────┬────────────┬───┘
        │            │
        │ ID token   │ style, fonts, sprites, vector tiles
        │            └──────────────► OpenFreeMap (no key)
        │
        │ Firebase Auth (client SDK) ► email and password
        │
        ▼ Bearer token, one base URL
┌────────────────────────┐
│  API edge              │  Verifies the Firebase JWT, checks role,
│                        │  forwards to the target API unchanged
└───────┬────────────────┘
        ▼
┌────────────────────────┐
│  lytir-ai (Functions)  │  Earthquake data, AI Q&A, ingestion trigger
└────────────────────────┘
```

The frontend holds no upstream URL, function key, or secret. It knows one edge
URL per API and attaches a bearer token.

## Decisions

| Area | Decision |
| --- | --- |
| Application shape | Static single-page application, no server-side rendering |
| Build tooling | Vite 8 |
| Runtime | Node 24 LTS, npm, committed lockfile |
| UI runtime | React 19 |
| Components | Mantine 9, Tabler icons |
| Language | TypeScript 6.0.3 |
| Routing | React Router 8 |
| Server state | TanStack Query 5 |
| UI state | React state plus URL search params |
| Authentication | Firebase Authentication, client SDK, email and password only |
| Account creation | Firebase console; the application has no registration form |
| Authorization | `ADMIN_EMAILS` allowlist enforced server-side |
| Map renderer | MapLibre GL 6 via `react-map-gl` 8 |
| Basemap | CARTO Dark Matter and Positron, set by environment variable |
| Markdown | `react-markdown` with `remark-gfm`, raw HTML disabled |
| Testing | Vitest 4 with Testing Library |
| Lint and format | ESLint 9, typescript-eslint 8, Prettier 3 |
| Hosting | Azure Static Web Apps, deployed by GitHub Actions |

### Version policy

Take the newest release in each line that is at least one week old, rather
than pinning the versions listed above verbatim. Two constraints are not
negotiable:

- **TypeScript stays on 6.0.3.** `typescript-eslint` declares a peer range of
  `>=4.8.4 <6.1.0`, so TypeScript 7 breaks linting today. Revisit when
  `typescript-eslint` ships support.
- **Vitest stays on 4.x** until 5.x has been out long enough to be uneventful.

## Configuration

Environment variables use Vite's built-in support; no `dotenv` dependency is
added. Only `VITE_`-prefixed variables reach client code, through
`import.meta.env`. A committed `.env.example` lists every name with no real
values.

| Variable | Purpose |
| --- | --- |
| `VITE_API_DIAG_URL` | Full edge URL of the diagnostics endpoint |
| `VITE_API_*_URL` | One full edge URL per API, added as each is consumed |
| `VITE_FIREBASE_API_KEY` | Firebase project identifier |
| `VITE_FIREBASE_AUTH_DOMAIN` | Firebase sign-in domain |
| `VITE_FIREBASE_PROJECT_ID` | Firebase project |
| `VITE_FIREBASE_APP_ID` | Firebase application |
| `VITE_MAP_STYLE_LIGHT` | Basemap style URL for the light theme |
| `VITE_MAP_STYLE_DARK` | Basemap style URL for the dark theme |

### Build-time inlining is accepted, not overlooked

Vite replaces `import.meta.env.VITE_*` with literal strings during the build,
so these are build-time values rather than runtime configuration. A single
bundle cannot be re-pointed at a different API, and every environment needs its
own build.

This limitation is understood and accepted rather than missed. Azure Static Web
Apps builds per branch from GitHub Actions, so one build per environment is the
natural workflow here. If build-once-promote-many is ever required, the escape
hatch is to fetch a small `/config.json` at startup instead of reading
`import.meta.env`, and that change stays confined to `src/lib/env.ts`.

### The Firebase API key is not a secret

It is a project identifier rather than a bearer credential: on its own it
grants no data access, mints no token, and reads nothing. Google documents web
API keys for Firebase services as safe to include in client code and in version
control, precisely because the bundle is public by construction — see
[Google's API key guidance][firebase-api-keys]. It is the one
credential-looking value that legitimately belongs in a `VITE_*` variable.

[firebase-api-keys]: https://firebase.google.com/docs/projects/api-keys

The dangerous artifact of similar appearance is a **service account key**. That
one is a genuine private credential and never belongs in this repository.

`ADMIN_EMAILS` is **not** a frontend variable. It exists only in the API edge's
server-side configuration. If it ever appears in a `VITE_*` value, the
authorization model is broken.

#### Held as environment variables, not as secrets

The `VITE_*` values live as GitHub Actions **environment variables** on the
`staging` environment, not as secrets. Vite inlines them into the bundle, so
anyone can read them from the deployed site; marking them secret conceals them
from maintainers rather than from attackers, and costs three things:

- A secret cannot be read back, so confirming that staging still matches the
  Firebase console would mean overwriting the value blind.
- It blurs the rule that a secret is a value which must never reach the
  browser — the rule that actually keeps a function key from leaking.
- Actions redacts secret values in logs, turning build diagnostics into `***`
  for values that were never sensitive.

#### What protects the project, and what does not

The authorized-domains list governs OAuth popup and redirect flows. It does
**not** restrict the Identity Toolkit REST endpoints, so an email-and-password
request carrying the public API key succeeds from anywhere, `curl` included.
The controls that do the work are:

- **Account creation turned off** under Authentication → Settings → User
  actions, which enforces administrator provisioning at the service instead of
  merely omitting a registration form. Left on, the `signUp` endpoint accepts
  anyone holding the public key; such an account authorizes to nothing but does
  occupy the user list.
- **Token validation at the API edge**, so any self-registered account
  authenticates and then authorizes to nothing.
- **Email enumeration protection**, which hides which addresses have accounts.
- **App Check**, not adopted yet, which binds requests to the real application
  if raw API-key use ever needs blocking.

### Validate at startup, not at module evaluation

`src/lib/env.ts` types the variables through `ImportMetaEnv` and verifies that
required values are present when the application starts. Validating at module
evaluation would break builds that run in CI without secrets — the lesson
behind `requiredEnv()` in `resmon-redwick`. A missing variable must fail
loudly in the browser with a clear message rather than propagate as
`undefined`.

## Project structure

```text
src/
  features/
    auth/          sign-in, auth context, route guard
    map/           map, layers, legend, detail panel, list view
    chat/          AI assistant
    admin/         ingestion trigger
  lib/
    api.ts         fetch wrapper: base URL, bearer token, error mapping
    firebase.ts    SDK initialisation
    theme.ts       Mantine theme tokens
  routes.tsx
  main.tsx
```

Features do not import each other's internals; anything shared moves to
`lib/` or a shared component. There are deliberately no repository, use-case,
or service layers — that ceremony costs more than it returns at this size.

## Key patterns

**API access.** One `lib/api.ts` wrapper attaches a fresh Firebase ID token and
maps failures to typed errors. Each endpoint module owns its own URL, taken
from its own environment variable, and its own response type. TanStack Query owns
caching, retries, and loading and error states. No component calls `fetch`
directly.

**Authentication.** The Firebase client SDK owns the session and token
refresh. A single route guard redirects unauthenticated users to sign-in.
Sign-out is an action in the shell header, not a route; it clears the session
and returns to the sign-in page.

Email enumeration protection is enabled on the Firebase project, so a failed
sign-in returns `auth/invalid-credential` rather than distinguishing an unknown
address from a wrong password. Error copy therefore says only that the email or
password is incorrect, and a password-reset request reports that mail was sent
without confirming that the account exists. That vagueness is deliberate, not
unfinished messaging.

Password reset is delivered by Firebase's own email sender. The application
never sees the token, and the default sender domain means reset messages can
land in spam.

**Authorization.** Role checks in the client are presentation only — they
decide what to show, never what is permitted. The API edge enforces admin
access; a client-side check is never the control.

**Map rendering.** One GeoJSON source with clustering enabled, and circle
layers whose radius and colour are data-driven expressions over magnitude.
Hover uses `feature-state` so the source is never rebuilt during pointer
movement. Clusters carry a `maxMag` aggregate so a cluster containing a strong
event does not look like a cluster of weak ones.

Two rules follow from the data being untrusted: no DOM marker per feature,
because it does not scale, and no interpolated HTML in popups or panels,
because USGS place strings and AI output are free text. Content is rendered as
React children.

**Theming.** Mantine's colour scheme drives both the UI and the basemap style
URL. The UI accent must stay cool, because warm hues are reserved for encoding
magnitude — otherwise the chrome competes with the data.

**Error handling.** A route-level error boundary, plus TanStack Query error
states rendered inline, plus Mantine notifications for transient failures.
Upstream correlation identifiers are surfaced in the UI so failures can be
traced in backend logs.

**Testing.** Priority is pure functions, especially the data-to-layer
transforms and formatting helpers, which are testable without a browser. A
small number of component tests. No end-to-end suite in the initial phase.

## Rejected options

| Option | Why not |
| --- | --- |
| Next.js 16 | Nothing to server-render, no SEO need, and no proxy routes required once the API edge exists. It would add a server to host plus server/client boundary rules for no benefit. Considered seriously for parity with `resmon-redwick` |
| Workforce Entra ID | Impractical for non-enterprise accounts |
| Entra External ID | Azure-native and free, but the fiddliest setup of the candidates |
| Clerk | Easiest option and dashboard-managed roles, but adds a vendor where Firebase is already proven to work here |
| MapTiler for production | Free tier is non-commercial only and forces their logo; the 99.9% SLA is enterprise-only, so paying $30/month buys no SLA |
| `azure-maps-control` | Locks the map component to Azure APIs. Azure Maps remains available as a tile provider through MapLibre |
| Satellite basemap | High-contrast imagery competes with the data it sits under. A flat, desaturated vector basemap is a legibility requirement |
| A green-blue-orange-red or rainbow magnitude ramp | Hue alone carries no order — nothing says whether green or blue is the larger value without consulting a legend — and a green-to-red scale is unorderable for red-green colour blindness. It would also put cool hues into the data, where they are reserved for interface chrome. Magnitude uses one warm ramp that runs light to dark as well as yellow to red, so lightness carries the order even when hue is not perceived |
| deck.gl | Built for millions of points; MapLibre clustering covers USGS volumes |
| Zod | No runtime validation until contract drift actually causes a bug |
| Redux or Zustand | TanStack Query plus URL params cover the need |
| TanStack Router | React Router is the simpler, better-known option here |
| TypeScript 7 | Breaks `typescript-eslint` today |
| Playwright | Deferred until there are features worth protecting |
| Google or Microsoft federated sign-in | Each adds a provider to configure and consent screens to explain, for an invite-only tool whose users are created by hand. Email and password needs no third-party account and no domain verification. Revisit if the audience widens |
| Self-service registration | Open sign-up on a tool with no public content invites junk accounts that an administrator then has to prune. Accounts are created in the Firebase console instead |
| Client-side admin detection | Authorization is an `ADMIN_EMAILS` allowlist held server-side, so the client cannot read a role from the token. Admin affordances must come from an API response, never from a local guess |

## Open questions

1. **Is Lytir a commercial product?** This decides the production basemap.
   Non-commercial permits MapTiler's free tier; commercial makes Azure Maps
   the better licensing choice.
2. **API edge shape.** A standalone pass-through service, or JWT validation
   inside `lytir-ai`. The second is less machinery while `lytir-ai` is the only
   backend; the first earns its place when a second backend appears. No
   frontend *design* depends on the answer, which needs only a base URL — but
   frontend *work* does: nothing can call the backend until one of the two
   exists, so this blocks the first data feature rather than merely shaping it.
3. **AI conversation contract.** The current Q&A API is stateless and
   single-round, so conversation history and streaming responses are not
   deliverable without a backend change.
4. **Ingestion job progress.** Progress and status monitoring need a job
   identifier and a status endpoint. Until then, admin shows the counts the
   trigger returns.
5. **Basemap SLA.** OpenFreeMap is donation-funded with no uptime guarantee.
   Acceptable for development; decide before exposing the app to real users.
6. **How much data does a one-month window return?** Answered by assumption,
   not yet by measurement. The backend design states fewer than ten logical
   events per hour, giving roughly 7,200 deduplicated records for a 30-day
   request — an order of magnitude below the "tens of thousands" this question
   feared, and comfortably inside what MapLibre clustering handles. So the
   client can fetch raw features for every offered window, and a magnitude
   floor is a user filter rather than a technical necessity. The backend
   monitors candidate and response counts and says the design must be revisited
   before the maximum window is raised, so the selectable windows stay
   configuration rather than code until production volume confirms the
   assumption.

## Phased plan

| Phase | Scope |
| --- | --- |
| 0 | Scaffold: tooling, empty routes, theme toggle, CI. No features |
| 1 | Firebase sign-in, app shell, protected routes |
| 2 | Map: data, sized and coloured circles, clustering, detail panel, list view, legend |
| 3 | AI chat, single-round, safe markdown rendering |
| 4 | Admin ingestion trigger and its result counts |
| 5 | Visual design pass, accessibility pass, basemap provider decision |

Accessibility is called out in phase 5 but constrains phase 2: a canvas map is
invisible to screen readers and unreachable by keyboard, so the list view is a
requirement rather than an enhancement.

## Decision log

| Date | Decision |
| --- | --- |
| 2026-09-12 | Firebase Authentication chosen; it worked out of the box previously where other vendors did not |
| 2026-09-12 | Static SPA on Vite; Next.js rejected because no server-side capability is needed |
| 2026-09-12 | Mantine retained; Tailwind was tried in `resmon-redwick` and lost on theming and mobile |
| 2026-09-12 | MapLibre via `react-map-gl` with OpenFreeMap tiles; Azure Maps kept as the production fallback |
| 2026-09-12 | TypeScript held at 6.0.3 because `typescript-eslint` does not support 7 |
| 2026-09-12 | Visual design deferred to a dedicated phase |
| 2026-09-12 | Vite build-time environment inlining accepted despite preferring runtime configuration; `/config.json` at startup recorded as the escape hatch if one promotable artifact is ever needed |
| 2026-09-12 | Phase 0 delivered through #2 to #5 and promoted to `main` in #6; these decisions move from proposed to accepted |
| 2026-09-12 | Deployment enforces merged pull requests in the workflow rather than through branch protection, which is unavailable on a private repository on GitHub Free |
| 2026-09-12 | Email and password is the only sign-in method; federated providers rejected for an invite-only audience |
| 2026-09-12 | Accounts are provisioned in the Firebase console; the application ships no registration form |
| 2026-09-12 | Sign-out is an action in the shell header rather than a route, returning to the sign-in page |
| 2026-09-12 | The scaffold's welcome page was removed rather than kept as a public landing page, because no anonymous content is permitted; `/` is the protected home and `/signin` the only public route |
| 2026-09-12 | `VITE_*` values are stored as GitHub Actions environment variables rather than secrets; Google documents the Firebase web API key as safe in client code, and a secret could not be read back for verification |
| 2026-09-12 | Authorized domains recorded as no defence for email and password sign-in, because the Identity Toolkit REST endpoints ignore that list; disabling account creation in the console is the control that matters |
| 2026-09-12 | The selectable earthquake time windows come from a build-time environment variable rather than a typed constant. This is deliberate and not an oversight: the volume a one-month window returns is unknown, and a variable can be shortened by editing the environment and re-running the deployment, where a constant costs a ticket, a branch, a pull request, and a promotion. Revisit once the volume is measured. The list must be validated at startup, its labels derived, and a URL naming a withdrawn window must fall back rather than render nothing |
| 2026-09-12 | A shortened window list is an interface affordance, not a limit; if long windows prove expensive, the ceiling belongs at the API edge, because nothing stops a crafted request asking for a window the interface does not offer |
| 2026-09-12 | Each API is configured as its own full edge URL, `VITE_API_DIAG_URL` and siblings, rather than one base URL with paths in code, so an endpoint can be repointed, versioned, or moved without a release. The cost is that nothing prevents one variable pointing at staging while another points at production, which a single base URL made impossible by construction |
| 2026-09-12 | Token attachment stays in `lib/api.ts` alone, despite the per-API URLs. Several `fetch` call sites would mean several refresh behaviours and failures appearing only once a token expires mid-session |
| 2026-09-13 | The first earthquake request sends no `start_time` or `end_time` and takes the service's one-hour default. Computing the window in the browser would make the client's clock the authority on what "recent" means, and the response carries `utc_now` precisely because that clock cannot be trusted. The window selector will send the parameters explicitly; until it exists, a sparse map is the truthful rendering of a quiet hour, so the list states the count rather than leaving an empty canvas looking broken |
| 2026-09-13 | Corrected against the backend design in `lytir-ai/docs/earthquake-retrieval-api.md`: `count` is the complete number of matches in the requested window and results are never silently truncated, so an empty list means a genuinely quiet window rather than a capped response. The query-size control is the window itself, `EARTHQUAKE_QUERY_MAX_WINDOW_HOURS` defaulting to 720 hours, and exceeding it returns HTTP 400 rather than a trimmed list. The earlier entry claiming the two were indistinguishable was wrong |
| 2026-09-13 | `id` is the selected Cosmos document UUID, not the logical earthquake identity: the backend documents that it changes when a newer duplicate wins deduplication, and exposing the stable USGS identifier is an explicit non-goal of the retrieval API. Hover keying and list keys tolerate that, because both are rebuilt with the data. Anything needing durable identity — a detail panel addressable by URL, a selection that survives the 60-second refetch, a read or dismissed marker — cannot be built on it. A stable public identifier has to be agreed with the backend first, and `GET /api/earthquakes/{id}` inherits the same instability |
| 2026-09-13 | The one-hour default is a code constant on the backend aligned to hourly USGS acquisition, not an application setting, so omitting the time parameters is a stable contract rather than a value that may drift |
| 2026-09-13 | A future window selector's configured list must stay inside the backend maximum of 720 hours, because a longer window returns HTTP 400. Nothing validates the environment-configured list against that limit, so offering a 90-day window would fail at runtime and read as a frontend fault |
| 2026-09-13 | Both magnitude ramps crowd their stops below magnitude 3 rather than spacing them evenly to 8. Magnitude is logarithmic in energy and nearly every reported event is weak, so an even scale maps the whole real distribution onto its first third and every mark renders alike — which is exactly how it was first built, and it read as though size encoded nothing at all. The scale is chosen for the distribution the data actually has, not for its nominal range |
| 2026-09-13 | The map and the table are divided by one Mantine `Splitter` whose orientation follows the breakpoint, rather than a splitter on desktop and a stacked layout below it. Two trees would unmount the map whenever the window crossed the breakpoint, discarding the view the reader had navigated to. Mantine 9 ships `Splitter` with `role="separator"`, arrow-key steps, and double-click reset, so no resizable-panel dependency was added |
| 2026-09-13 | The list states the count against its window and the service's `utc_now`, because a bare count answers "how many" without answering "when", and a sixty-second refetch changes the data with no other visible sign. The window text is repeated from the contract rather than read from the response: the API does not echo the window it answered. That is tolerable only because the backend documents the one-hour default as a code constant. The API echoing its effective `start_time` and `end_time` would let the label be derived instead of asserted, and would make the window selector self-verifying |
| 2026-09-13 | Clicking a mark opens a popup; clicking a cluster zooms to the level where it breaks apart instead of describing it, because a numbered circle is an invitation to drill in rather than a thing with details of its own. The selection is held in component state and deliberately kept out of the URL, since the document UUID it would have to name is not stable |
| 2026-09-13 | `features/map/popup.css` is the first stylesheet in `src`, and it exists because MapLibre's popup chrome hard-codes a white background. Mantine's text colour follows the colour scheme, so in dark mode the popup rendered light text on a white card. The override binds the popup, its tip, and its close button to the same Mantine variables as the rest of the interface. Vendor CSS overrides are matched by MapLibre's own class names, which makes this file a dependency on MapLibre's internal markup |
| 2026-09-13 | The map renders with MapLibre's globe projection rather than mercator. A sphere has no antimeridian and no repeated world copies, so the Pacific rim — where most of the data is — reads as one region instead of being cut by the edge of a cylinder, and the `renderWorldCopies` question disappears. Two consequences a future reader should not mistake for defects: half the planet faces away at any moment, which is why the accessible list is the only view showing every event at once, and clustering still runs in projected space, so two events either side of 180° remain separate clusters even though the globe draws them as neighbours. The globe hides the seam; it does not move the arithmetic. MapLibre blends back to mercator at high zoom on its own |
| 2026-09-13 | Hover through `feature-state` is confirmed working with the backend's string UUIDs under a clustered source. `promoteId` was suspected of being ignored when clustering is enabled; running `@maplibre/geojson-vt` directly showed the promoted UUID reaching the tile feature id in both the clustered and unclustered paths, so no `generateId` fallback is needed |
| 2026-09-13 | A null `magnitude` styles as zero so the event still draws at the smallest size, but the list labels it `Unknown`. Coercing the value for the colour ramp is a rendering concession; presenting it as a measured 0.0 would be a false observation |
| 2026-09-13 | Cluster count labels name `Noto Sans Regular` explicitly, because MapLibre's default fontstack is absent from the OpenFreeMap styles and would request glyphs that 404. This couples the label to the configured basemap's glyph set: repointing `VITE_MAP_STYLE_*` at a style without that font loses the counts, not the clusters |
| 2026-09-13 | `@types/geojson` is declared as a direct devDependency even though MapLibre already supplies it, because `features/map/earthquakes.ts` imports from it. An undeclared transitive type package breaks the build without explanation the day the dependency that carried it drops it |
| 2026-09-13 | The dark basemap is OpenFreeMap `fiord`, not `dark`. Measured from the style JSON, `dark` fills land at `rgb(12,12,12)` against water at `rgb(27,27,29)` — about 1.1:1, so coastlines and therefore the whole sense of place disappear — draws country borders at `hsl(0,0%,23%)`, labels place names at `rgb(101,101,101)` for roughly 3.4:1 against their background, and renders ocean names in black at 70% opacity on near-black water. `fiord` is a mid-tone slate that separates land from water, borders at `hsl(214,63%,76%)` and labels around 5.5:1. Its being cool-hued also keeps the warm magnitude ramp the only warm thing on screen, and its mid lightness makes the globe's edge visible against dark application chrome, which a near-black style cannot. Both styles share the same glyph endpoint and both use only `Noto Sans Regular`, verified by request, so the cluster-count coupling noted above is unaffected |
| 2026-09-13 | The window is rendered as its own boundaries — `09/13/2026 16:56 to 18:56 UTC` — rather than as a duration. A duration has to invent phrasing for whatever span the service picks: "the last 2 hours" reads well, "the last 41 minutes" does not, and rounding it would name a window that was never answered. The boundaries need no pluralisation and cannot be made awkward by a future default. This also removed the summary's second line: `utc_now` and `end_utc` arrive in the same response and hold the same instant for a window ending now, so an "as of" line beside the window was two timestamps that could never disagree. Removing it left the second-precision formatters with no callers, and they were deleted rather than left as tested dead code |
| 2026-09-13 | The window label is derived from the response's `time_range` rather than restated from the contract, and renders as nothing at all when the field is absent. The earlier entry below, accepting a repeated `the last hour` because the backend documented the hour as a code constant, has already been proved wrong in production: the service now answers a two-hour window, so the interface was labelling seven events across two hours as "the last hour". A constant copied from a contract is a claim about someone else's code that nothing verifies, and it fails silently — the number beside it stays plausible. `time_range` is optional in the type because a deployment predating the field must read as an unknown window rather than an invented one, which is why the label is nullable and the count can stand alone |
| 2026-09-13 | The basemaps are CARTO Dark Matter and Positron, replacing OpenFreeMap. The entry above, choosing `fiord`, was reached by measuring land against water at world zoom and was wrong: judged at street zoom `fiord` is a single flat slate wash in which a freeway and a driveway are the same colour, which no world-zoom contrast figure reveals. CARTO's styles carry 93 layers with a real road hierarchy, are the styles most data interfaces are built on, need no API key, and serve `Noto Sans Regular` from their own glyph endpoint, so the cluster-count coupling still holds. Attribution for CARTO and OpenStreetMap arrives in the source TileJSON, so MapLibre renders it without the application asserting it. A basemap must be reviewed at both zoom extremes; a contrast ratio between two fill colours is not a review |
| 2026-09-13 | No label rewriting. An earlier version overrode `text-field` on every symbol layer to prefer `name:latin`, because OpenFreeMap labels in the local script and a world view carried Cyrillic, Arabic and Amharic at once. CARTO labels in `name_en` already, and has no `name:latin` field, so that override read as the local name instead — reintroducing the very problem it was written for — and it also replaced the `housenumber` layer's field with a place name. Overriding a basemap's own labels couples the application to the tile schema, and the schema is the thing most likely to change when the style is repointed |
| 2026-09-13 | Colour scheme is a `defaultColorScheme` of dark plus a header toggle, never `forceColorScheme`. Mantine guards its setter with `if (!forceColorScheme)`, so forcing the scheme renders the toggle inert while leaving it clickable. The consequence is that a value already in `localStorage` under `mantine-color-scheme-value` outranks the default, which is correct once a reader can choose — but it is also why an earlier `defaultColorScheme="dark"` appeared to do nothing on a browser that had run any other Mantine application on the same origin |
