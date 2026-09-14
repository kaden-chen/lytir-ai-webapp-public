---
name: pr-to-dev
description: Create a GitHub pull request from the current ticket-numbered branch to dev when the user explicitly requests a PR to dev.
---

# Pull Request to Dev

Create the pull request only when the user explicitly invokes this workflow.
This skill creates a PR; it does not merge it.

## Required workflow

1. Inspect the current branch, working tree, remote configuration, commits,
   and diff against `origin/dev`.
2. Extract the ticket number from the current branch's leading numeric prefix.
   For example, `1-set-up-project-boilerplate-and-development-configuration`
   maps to issue `#1`. Stop and ask the user for a corrected branch or ticket
   number if the branch does not begin with a number followed by `-`.
3. Confirm that `dev` exists on the remote and that the extracted issue exists
   in the current GitHub repository. Stop if either cannot be verified; never
   guess a different base branch or issue.
4. Run the repository checks relevant to the proposed changes, using the
   scripts defined in `package.json`: lint, formatting check, type check,
   tests in single-run mode rather than watch mode, and a production build
   when the changes can affect it. Lint changed Markdown as well. Record the
   exact results for the pull request body. If a check fails, stop and report
   it rather than opening the pull request, unless the user has already
   accepted the failure. Skip a check only when it is not defined or cannot
   apply, and state which checks were skipped and why.
5. Ensure the current branch is available on the remote before creating the
   PR. Do not commit local changes as part of this workflow; report that
   uncommitted changes will not be included. If a push is needed, use a normal
   push and never force-push.
6. Before a required push, use the platform-specific authentication helper
   when present:
   - Linux or WSL: `./.agents/scripts/local-auth.sh`
   - Windows PowerShell: `& .\.agents\scripts\local-auth.ps1`

   If the applicable helper is missing, print a clear warning identifying its
   path and continue. If it exists but fails, stop without pushing or creating
   the PR.
7. Check for an existing open PR from the current branch to `dev`. If one
   exists, do not create a duplicate; report its URL instead.
8. Resolve the currently authenticated GitHub user. Create a non-draft PR
   assigned to that user, with the current branch as the head and `dev` as the
   base. Do not pass a project flag; see the note below. Derive a concise
   title from the actual changes. The body must
   summarize the changes, state the validation actually performed, and include
   `Refs #<ticket-number>` on its own line. Use `Refs`, not an auto-closing
   keyword. Never list a check that was not run.
9. Verify and report the PR number, URL, title, assignee, head branch, base
   branch, referenced issue, and checks run. Do not report project state.

## Default project

Pull requests are added to the **Lytir Project** project automatically. Do not
attempt to attach one, and do not report project state at all.

Two things make any attempt worse than useless:

- `gh pr create --project` resolves the name against Projects (classic), which
  GitHub has sunset. On `gh` 2.45.0 it fails with a deprecation error *before*
  the pull request is created, so passing the flag costs the pull request
  itself. `gh project item-add` fails separately, because projects are user
  data and the repository credential carries no project permission.
- **The credential cannot observe project state either, and the failure is
  silent.** `gh pr view --json projectItems` swallows the permission error and
  returns an empty array, so an attached item reads as `projects: 0`. Raw
  GraphQL is what exposes the truth: `projectItems.nodes` returns `[null]` with
  a `FORBIDDEN` error, meaning one item exists whose details are unreadable.

Reporting "the project was not attached" from that empty array is a false
negative, and it sends the user to do work that already happened. If project
state genuinely matters, query GraphQL directly and count the nodes rather than
trusting the `gh` field.

## Pull request body shape

```markdown
## Summary

- Describe the important changes
- Explain relevant implementation decisions

## Validation

- List the checks that were run and their outcomes
- Note any check that was skipped and why

Refs #1
```
