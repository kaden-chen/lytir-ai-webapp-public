# Lytir AI

**Ask questions. Understand earthquakes.**

`lytir-ai-webapp` is the React frontend for Lytir AI. It gives users a simple way
to ask natural-language questions about earthquakes, learn about Lytir, and
receive clearly labeled answers backed by either Lytir observations or general
model knowledge.

## Project status

Firebase sign-in, the application shell, and protected routes are in place.
`/signin` is the only public route, and everything else requires a session.

The map is the application home and carries live data. Recent earthquakes are
fetched through the API edge and drawn as a clustered layer on a globe, sized
and coloured by magnitude, and paired with a table that is both the accessible
equivalent of the canvas and the keyboard route to any single event. A
magnitude legend and selectable time windows are still outstanding.

The AI assistant supports independent, single-round questions through the API
edge. A separate administration view lets an authorized operator trigger an
earthquake-data refresh and inspect the backend's response; the API edge, not
the client-side control, enforces that authorization.

Architecture and technology decisions are settled and recorded in
[docs/01-frontend-architecture.md](docs/01-frontend-architecture.md).

### Staging

<https://lemon-water-0955abb10.3.azurestaticapps.net>

Staging deployments are started manually from the **Deploy Lytir AI Web App
[Staging]** workflow in GitHub Actions and run against `dev`; pushes do not
deploy automatically. The site has no anonymous content, so it opens on the
sign-in page; accounts are created by hand in the Firebase console. That
hostname is the default one Azure assigned the Static Web App and would change
if the resource were recreated — the `staging` environment in GitHub records
the authoritative URL of each deployment.

## Experience

On the map:

- Explore recent earthquakes worldwide on a globe, clustered where they
  overlap, with size and colour encoding magnitude.
- Click a mark for its magnitude, place, time, and depth; click a cluster to
  zoom to where it separates.
- Read the same events as a table, choose one to fly the map to it, and resize
  the two against each other.

In the assistant:

- Ask one independent natural-language question at a time.
- Render Markdown answers safely.
- Show answer confidence when supplied by the API.
- Clearly distinguish Lytir-backed observations from model knowledge.
- Display structured earthquake metadata when available.
- Explain when a requested period falls outside Lytir's available data.
- Provide useful loading, validation, timeout, and service-error states.
- Support responsive desktop and mobile layouts.

In administration:

- Let an administrator request the latest earthquake data through the API
  edge.
- Reload the map and table after a successful refresh and display the complete
  response as evidence of the run.
- Keep the control visible but disabled for other users; the API edge remains
  the authorization boundary.

Example questions:

- How many earthquakes occurred worldwide in the last hour?
- Were there any earthquakes within 100 km of Dallas, Texas?
- What was the strongest earthquake Lytir observed recently?
- Were there earthquakes in California in 2000?
- What does Lytir do?

## Backend API

Every request goes to the API edge carrying a Firebase ID token as a bearer
token. Two operations matter to this frontend.

### Earthquake retrieval

The operation the map is built on. All parameters are optional:

```http
GET /api/proxy/earthquakes?start_time=2026-09-11T00:00:00Z&min_magnitude=4
Authorization: Bearer <firebase-id-token>
```

| Parameter | Meaning |
| --- | --- |
| `start_time` | Inclusive ISO 8601 instant; defaults to one hour before `end_time` |
| `end_time` | Exclusive ISO 8601 instant; defaults to the current UTC time |
| `latitude`, `longitude` | Centre of a radius search; required together |
| `radius_km`, `radius_mi` | Search radius; kilometres take precedence |
| `min_magnitude`, `max_magnitude` | Inclusive magnitude bounds |
| `format`, `fmt` | `json` or `csv`; defaults to `json` |

The response carries `items`, a `count` of every match in the window, and
`utc_now`, the service's own clock. Results are never silently truncated: the
size control is the window itself, capped at 720 hours, and exceeding it is an
error rather than a trimmed list.

Two properties of the contract shape the client. Optional metadata —
`magnitude`, `place`, `depth_km` — may be `null` and must read as unknown
rather than zero. And `id` is the selected storage document's UUID, not the
logical earthquake identity: it changes when a newer duplicate ingestion wins
deduplication, so it cannot be used for anything that must stay addressable,
such as a shareable link. The response does not echo the window it answered.

The full design is recorded as `docs/earthquake-retrieval-api.md` in the
`lytir-ai` repository.

### AI question and answer

```http
POST /api/ai/qa
Content-Type: application/json

{
  "question": "Were there any earthquakes near Dallas in the last hour?"
}
```

The API is stateless. Each request is a complete, independent question; the
backend does not retain a conversation or previous clarification answers.

A successful response contains a Markdown `answer`, an `outcome`, model
identity, execution time, and optional confidence. Historical questions outside
Lytir's observation range may also contain:

```json
{
  "data_status": "outside_available_range",
  "knowledge_source": "model_knowledge",
  "events": []
}
```

Any event fields supplied from model knowledge may be `null` and must not be
presented as verified Lytir observations.

## Security

The Lytir backend currently uses function-level authorization. Never embed an
Azure Function key, API credential, or secret in React source code, browser
environment variables, a generated JavaScript bundle, or version control.

The Firebase web API key is the one exception, and it proves the rule. It is a
project identifier rather than a credential, Google documents it as safe to
ship in client code, and it is held as a GitHub Actions environment variable
rather than a secret because the bundle publishes it anyway. The architecture
document records what actually protects the project.

The browser signs in with email and password through Firebase Authentication
and sends the resulting ID token as a bearer token to the API edge, whose URL
for each API is configuration rather than code. The edge verifies the token,
checks the caller's role, and relays the request
to the backend; only that edge holds backend credentials. Administrator access
is granted by an `ADMIN_EMAILS` allowlist checked against the verified email
server-side, never by a client-side role check.

Generated Markdown and model-supplied event text are untrusted content. The UI
must sanitize Markdown, disable raw HTML, use safe link handling, and never
execute generated code.

## Frontend foundation

- **Build and runtime** — Vite, React, TypeScript, Node 24 LTS, npm
- **Interface** — Mantine with Tabler icons, light and dark themes
- **Routing and data** — React Router with TanStack Query
- **Map** — MapLibre GL via `react-map-gl`, with OpenFreeMap basemap styles
- **Authentication** — Firebase Authentication, email and password
- **Content** — `react-markdown` with raw HTML disabled for AI answers
- **Quality** — Vitest, Testing Library, ESLint, Prettier
- **Hosting** — Azure Static Web Apps, deployed by GitHub Actions

The rationale, the alternatives that were rejected, version constraints, and
the remaining open questions are recorded in
[docs/01-frontend-architecture.md](docs/01-frontend-architecture.md).

## Related project

The backend Azure Functions application is maintained in the `lytir-ai`
repository.

## Development

### Prerequisites

Node 24 LTS, pinned in [.nvmrc](.nvmrc), with the npm that ships with it.

Node 23 and its bundled npm 10.9.2 cannot resolve this dependency tree: npm
crashes with `Cannot read properties of null (reading 'edgesOut')` while
walking optional peer dependencies. Run `nvm use` before installing.

On WSL, check which npm actually runs. A Windows Node installation on `PATH`
shadows the nvm-managed one, and because the working directory is then a UNC
path, every script fails before reaching any project code:

```text
CMD.EXE was started with the above path as the current directory.
UNC paths are not supported.
'prettier' is not recognized as an internal or external command
```

The error names the tool rather than the shell, which sends you hunting for a
dependency problem that does not exist. `which -a npm` reveals the culprit as
`/mnt/c/Program Files/nodejs/npm`. Run `nvm use`, or put the nvm binary
directory first on `PATH`, before any npm script.

### Setup

```bash
nvm use
npm install
cp .env.example .env.local
```

The copied `.env.local` has four empty `VITE_FIREBASE_*` values. Fill them from
the Firebase console under Project settings, Your apps. A missing or incomplete
`.env.local` is reported on screen rather than failing silently.

Accounts are created in the Firebase console under Authentication, Users; the
application deliberately has no registration form. Ask an administrator for
credentials if the project is not yours.

### Commands

| Command | Purpose |
| --- | --- |
| `npm run dev` | Development server on <http://localhost:5173> |
| `npm run build` | Type check, then production build into `dist/` |
| `npm run preview` | Serve the production build locally |
| `npm run typecheck` | TypeScript, no emit |
| `npm run lint` | ESLint |
| `npm run lint:md` | markdownlint |
| `npm run format` | Prettier, write in place |
| `npm run format:check` | Prettier, check only |
| `npm test` | Vitest, single run |
| `npm run test:watch` | Vitest, watch mode |

Markdown is formatted by markdownlint rather than Prettier, so the two never
disagree about the same file.

### Debugging

Press `F5` in VS Code. The **Launch app in Chrome** configuration
starts the Vite dev server as a background task, waits for it to report its
local URL, then launches Chrome with the debugger attached. Breakpoints in
`.tsx` files bind directly, because Vite serves inline source maps in
development.

Chrome must be installed inside WSL at `/usr/bin/google-chrome`; WSLg shows it
as a native Windows window. No Windows-side browser and no port forwarding are
involved.

| Configuration | Purpose |
| --- | --- |
| Launch app in Chrome | Debug the running application |
| Debug all tests | Vitest with `--no-file-parallelism`, so breakpoints bind |
| Debug current test file | The same, limited to the open file |
| Attach to a running Chrome | Fallback for a browser started with `--remote-debugging-port=9222` |

The **verify** task runs the type check, ESLint, Prettier, markdownlint, the
tests, and the production build in sequence.

Accept the editor prompt to use the workspace TypeScript version, because the
repository pins TypeScript 6.0.3 rather than whatever the editor bundles. If
the dev server or a task misbehaves, confirm the shell is on Node 24; `nvm
alias default 24` makes that permanent.

### Environment variables

Only `VITE_`-prefixed values reach the browser, and they are inlined at build
time, so every environment needs its own build. Never put a secret in one. See
[.env.example](.env.example).

| Variable | Purpose |
| --- | --- |
| `VITE_APP_VERSION` | Application version shown in the interface |
| `VITE_FIREBASE_API_KEY` | Firebase project identifier, public by design |
| `VITE_FIREBASE_AUTH_DOMAIN` | Firebase sign-in domain |
| `VITE_FIREBASE_PROJECT_ID` | Firebase project |
| `VITE_FIREBASE_APP_ID` | Firebase application |
| `VITE_MAP_STYLE_LIGHT` | Basemap style URL for the light colour scheme |
| `VITE_MAP_STYLE_DARK` | Basemap style URL for the dark colour scheme |
| `VITE_API_DIAG_URL` | Full edge URL of the diagnostics endpoint |
| `VITE_API_EARTHQUAKES_URL` | Full edge URL of the earthquakes endpoint |
| `VITE_API_AI_QA_URL` | Full edge URL of the question and answer endpoint |
| `VITE_API_ADMIN_SYNC_DATA_URL` | Full edge URL of the administrator data refresh endpoint |

Each API is configured as its own full URL rather than a shared base with paths
in code, so an endpoint can be repointed without a release. All eleven are
required. The application reports any that are missing at startup
instead of failing later, and the staging deployment fails the build rather
than publishing an application that cannot sign anyone in.

## License

Licensed under the [Apache License 2.0](LICENSE).
