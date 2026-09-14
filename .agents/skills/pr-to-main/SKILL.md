---
name: pr-to-main
description: Create a GitHub pull request from dev to main when the user explicitly requests a promotion or release PR, automatically restoring the original branch afterward.
---

# Pull Request from Dev to Main

Create the pull request only when the user explicitly invokes this workflow.
This skill creates a PR; it does not merge it.

## Required workflow

1. Record the current branch as the original branch. Require a named branch
   and a clean working tree before switching; if local changes are present,
   stop rather than stashing, committing, or carrying them across branches.
2. Fetch `main` and `dev`, then confirm both branches exist on the remote. If
   the original branch is not `dev`, switch to the local `dev` branch. If it
   does not exist locally, create it as a tracking branch for `origin/dev`.
3. Once a switch occurs, treat restoration as required cleanup: switch back to
   the original branch before reporting success, an existing PR, no changes,
   or any failure. If restoration fails, report that prominently and do not
   claim the workflow completed cleanly.
4. Inspect the remote configuration, commits, and complete diff from
   `origin/main` to `origin/dev`. Confirm that `dev` contains changes not
   already in `main`. Stop rather than guessing alternate branches or creating
   an empty PR.
5. Synchronize local `dev` with `origin/dev`. If local `dev` is behind, run
   `git pull --ff-only origin dev`. If local `dev` is ahead, push it normally.
   If it has diverged, or if the fast-forward pull fails, stop and report the
   synchronization problem. Never create a merge commit during synchronization
   and never force-push.
6. Before a required push, use the platform-specific authentication helper
   when present:
   - Linux or WSL: `./.agents/scripts/local-auth.sh`
   - Windows PowerShell: `& .\.agents\scripts\local-auth.ps1`

   If the applicable helper is missing, print a clear warning identifying its
   path and continue. If it exists but fails, stop without pushing or creating
   the PR.
7. Run the repository checks on the synchronized local `dev` tree, using the
   scripts defined in `package.json`: lint, formatting check, type check,
   tests in single-run mode rather than watch mode, and a production build.
   Install dependencies first when they are missing or stale for the tree that
   is checked out. Record the exact results for the pull request body. If a
   check fails, stop, restore the original branch, and report the failure
   rather than opening the promotion PR, unless the user has already accepted
   the failure. Skip a check only when it is not defined, and state which
   checks were skipped and why.
8. Build the PR description from all commits and changes in
   `origin/main...origin/dev`, not only the latest commit. Collect and
   deduplicate every GitHub issue reference represented by those changes,
   including `Refs #<number>` lines from commit messages. Verify referenced
   issues when possible; never invent an issue number. If none are found,
   state that clearly and continue.
9. Check for an existing open PR from `dev` to `main`. If one exists, do not
   create a duplicate; restore the original branch and report the PR URL.
10. Resolve the currently authenticated GitHub user. Create a non-draft PR
    assigned to that user, with `dev` as the head and `main` as the base. Do
    not pass a project flag; see the note below.
    Derive a concise title from the complete change set. The body must
    summarize all included work, state the validation actually performed, and
    list each associated issue as `Refs #<number>` on its own line. Use
    `Refs`, not an auto-closing keyword. Never list a check that was not run.
11. Verify the PR number, URL, title, assignee, head branch, base branch, all
    referenced issues, and checks run. Do not report project state. Restore
    the original branch, verify that restoration succeeded, and report the
    result.

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

- Summarize all work being promoted from dev
- Highlight relevant implementation decisions

## Validation

- List the checks that were run and their outcomes
- Note any check that was skipped and why

## Related issues

Refs #1
Refs #2
```
