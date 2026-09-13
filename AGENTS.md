# Repository Guidelines

## Where to find things

- **Architecture, technology decisions, rejected options, open questions** →
  [docs/01-frontend-architecture.md](docs/01-frontend-architecture.md). Read it
  before changing structure, dependencies, or a cross-cutting pattern.
- **Product scope, backend contract, security model, setup** →
  [README.md](README.md). Do not duplicate it here.

## Stack

Vite, React, TypeScript, Mantine with Tabler icons, React Router, TanStack
Query, MapLibre GL via `react-map-gl`, Firebase Authentication, Vitest, ESLint,
and Prettier. Shipped as a static bundle on Azure Static Web Apps.

TypeScript stays on 6.0.3 for as long as `typescript-eslint` declares a peer
range of `>=4.8.4 <6.1.0`, because TypeScript 7 breaks linting. That pin is
deliberate, not neglect.

## Project

- This repository contains the React single-page frontend for Lytir AI. The
  backend Azure Functions application is maintained in the `lytir-ai`
  repository.
- The backend uses function-level authorization. Never embed an Azure Function
  key, API credential, or secret in React source code, client-exposed
  environment variables, a generated JavaScript bundle, or version control.
- Treat every `VITE_`-prefixed environment variable as published content.
  Anything the browser can read is public.
- The browser signs in with Firebase Authentication and sends the resulting ID
  token as a bearer token to a single API base URL. An API edge verifies that
  token, checks the caller's role, and forwards the request; only that edge
  holds backend credentials.
- Treat Markdown answers and model-supplied event text as untrusted content.
  Sanitize Markdown, disable raw HTML, use safe link handling, and never
  execute generated code.
- Never present model-knowledge values as verified Lytir observations. Fields
  supplied from model knowledge may be `null` and must stay clearly labeled.
- Keep deployable application and configuration files in version control,
  including the package manifest and the generated lockfile.
- Never commit secrets, credentials, `.env` files, local authentication
  helpers, dependency directories, or build output.
- Follow the language, runtime, package manager, and project structure
  established by the application scaffold. Document material changes to those
  choices in the README.

## Frontend conventions

- Reach the backend only through the shared API wrapper, which owns the base
  URL and attaches a fresh Firebase ID token. Components do not call `fetch`
  directly and never hold an upstream URL or credential.
- Client-side role checks decide what to display, never what is permitted. The
  API edge is the only authorization control.
- Render untrusted content — USGS place strings, AI answers, any API text — as
  React children. Never assemble HTML by string interpolation, and never use
  `dangerouslySetInnerHTML` for it.
- Draw map data with data-driven circle or symbol layers over a clustered
  GeoJSON source. Never create one DOM marker per feature; it does not scale.
- Keep pointer interactions in MapLibre `feature-state` rather than React
  state, so hovering does not rebuild source data.
- Reserve warm colours for encoding magnitude and keep the interface accent
  cool, so application chrome does not compete with the data.
- Pair the map with a keyboard- and screen-reader-accessible list view. Canvas
  features are unreachable by assistive technology, so the list is a
  requirement rather than an enhancement.
- Put server state in TanStack Query and shareable view state in URL search
  params. Do not add a global state library.
- Read configuration through `src/lib/env.ts` rather than touching
  `import.meta.env` directly. Values are inlined at build time, so each
  environment needs its own build, and required values are validated at
  application startup rather than at module evaluation.

## Development workflow

- Use `dev` as the integration branch and `main` as the release branch.
- Create feature branches from the latest `dev` using
  `<ticket-number>-<kebab-case-description>`.
- Target feature pull requests to `dev`; do not target `main` directly from a
  feature branch. Use `dev` as the only source for release pull requests to
  `main` and synchronization pull requests to active feature branches.
- During the R&D phase, run pull-request quality CI for changes targeting
  `dev`. Add a separate `main` quality gate when `main` gains its own
  deployment workflow or release-validation requirements.
- Include `Refs #<ticket-number>` in feature commit messages and pull request
  descriptions so GitHub links the work to its issue.
- Assign pull requests to the authenticated GitHub user.

## Validation

- Run the checks relevant to the affected code before committing or opening a
  pull request, including linting, formatting, type checking, tests, and a
  production build when the change can affect it.
- Run test suites in single-run mode rather than watch mode.
- Wrap Markdown prose at 80 columns and keep changed documentation clean under
  `.markdownlint-cli2.yaml`. Code blocks and tables are exempt from the
  line-length rule, and verbatim reference copies under `.agents/references/`
  are not linted.
- A synchronization pull request from `dev` cannot be validated before its
  merge exists; rely on the pull request's own checks rather than reporting
  local validation of the merged result.
- Report any checks that could not be run, and never claim that an unexecuted
  check passed.
- Preserve unrelated user changes and do not rewrite Git history unless
  explicitly requested.

## AI tooling

- Keep shared AI instructions and workflows vendor-neutral.
- Store reusable skills under `.agents/skills/<skill-name>/SKILL.md`.
- Store helper scripts shared by more than one skill in `.agents/scripts/`.
  Keep assets used by a single skill inside that skill's own directory.
- Keep optional vendor-specific metadata isolated from the core `SKILL.md`
  workflow. Do not add repository-level vendor configuration directories such
  as `.codex/` unless explicitly required.
- `.agents/references/codex-agents-md.md` is a local reference copy of the
  Codex `AGENTS.md` documentation. Consult it only when creating or updating
  Codex instruction files; it is not an active instruction file. Prefer the
  official documentation when it is accessible.

## Repository skills

- Use the `commit` skill only when explicitly asked to commit and push changes.
- Use the `handoff-script-gen` skill to prepare a new private local handoff for
  the current ticket branch; never stage or commit its output.
- Use the `handoff-script-pickup` skill to resume work from the newest private
  local handoff without modifying repository state.
- Use the `pr-to-dev` skill to open a pull request from the current ticket
  branch to `dev`.
- Use the `pr-to-main` skill to open a promotion pull request from `dev` to
  `main`.
- Use the `sync-from-dev` skill to open a synchronization pull request from
  `dev` to the current ticket branch.

The push-capable skills run the platform-specific local authentication helper
in `.agents/scripts/` before pushing. Those helpers are machine-specific, are
never committed, and may be absent on a given checkout.
