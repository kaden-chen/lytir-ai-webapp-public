---
name: commit
description: Create and push Git commits when the user explicitly requests a commit-and-push workflow tied to a ticket-numbered branch.
---

# Commit and Push

Use this workflow only when the user has explicitly authorized both the commit
and the push. Do not treat a request to edit, review, or test changes as
permission to commit or push them.

## Required workflow

1. Inspect the repository instructions, working tree, staged changes, and
   relevant diffs. Include only changes intended for this commit; preserve
   unrelated user changes.
2. Read the current branch name and extract its leading ticket number. A
   branch such as `1-set-up-project-boilerplate-and-development-configuration`
   maps to ticket `#1`. If the branch does not begin with a ticket number
   followed by `-`, stop and ask the user for the ticket number or corrected
   branch.
3. Run the repository checks relevant to the affected code before committing,
   using the scripts defined in `package.json`: lint, formatting check, type
   check, tests in single-run mode rather than watch mode, and a production
   build when the change can affect it. Lint changed Markdown as well. Skip a
   check only when it is not defined or cannot apply to the change, and report
   which checks were skipped and why. Do not claim a check passed unless it
   was run successfully.
4. From the repository root, use the platform-specific authentication script
   immediately before the commit-and-push sequence:
   - Linux or WSL: `./.agents/scripts/local-auth.sh`
   - Windows PowerShell: `& .\.agents\scripts\local-auth.ps1`

   If the applicable script exists, run it and stop without committing or
   pushing if it fails. If the script is missing, print a clear warning that
   identifies the missing path and states that the workflow is continuing
   without the local authentication setup; then continue with the commit and
   push. If the workflow is interrupted after successful authentication, rerun
   the script before continuing.
5. Write an imperative, specific commit subject. Every commit must include
   `Refs #<ticket-number>` on its own line in the commit body so the
   corresponding ticket records the check-in.
6. For anything beyond a very simple update, add a meaningful body between the
   subject and `Refs` line. Summarize the important changes and, when useful,
   why they were made or how they were verified. Do not use a vague
   single-line message for substantive changes.
7. Commit the intended changes and push the current branch. Set its upstream
   on the first push when needed. Never force-push, amend, rebase, or rewrite
   history unless the user explicitly requests it.
8. Verify and report the commit hash, commit subject, pushed branch, and
   checks run.

## Commit message shape

For a substantive change:

```text
Configure initial project tooling

- Add linting, formatting, and test configuration
- Document local setup and environment variables

Refs #1
```

For a very simple change, the explanatory body may be omitted, but the ticket
reference remains required:

```text
Fix README typo

Refs #1
```
