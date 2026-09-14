---
name: handoff-script-gen
description: Generate a new private local Markdown handoff summarizing the current ticket branch when the user asks to prepare branch handoff notes.
---

# Generate a Local Handoff

> **Local only.** Files under `handoff/` are private working notes. Never stage,
> commit, push, publish, or otherwise share them. Never include credentials,
> secret values, tokens, connection strings, or other sensitive data.

## Safety boundaries

- Use Git and GitHub read operations only. Do not run `git add`, `git commit`,
  `git push`, or any command that changes remote state.
- Do not modify tracked project files as part of this workflow.
- Create exactly one new handoff file, and only after the user approves its
  complete proposed content.
- Never overwrite or append to an existing handoff file.
- Before writing, verify the proposed path is ignored with
  `git check-ignore --no-index <path>`. Stop if it is not ignored.

## Gather context

1. Read the current branch with `git symbolic-ref --short HEAD`. Extract the
   issue number from the leading digits in a branch named
   `<ticket-number>-<description>`. If the branch does not match, ask the user
   for the issue number rather than inventing one.
2. Inspect both committed and uncommitted branch work without changing it:

   ```bash
   git status --short --branch
   git log origin/dev..HEAD --oneline
   git diff --stat origin/dev...HEAD
   git diff --stat
   git diff --cached --stat
   ```

   Inspect relevant full diffs when needed to describe the work accurately.
   Do not fetch or alter refs. If `origin/dev` is unavailable, use local `dev`
   and disclose that in the handoff.
3. Find pull requests for the branch using a read-only query:

   ```bash
   gh pr list --head <BRANCH_NAME> --state all \
     --json number,title,url,state,baseRefName
   ```

   Record `None found` if the query succeeds with no results. If GitHub CLI or
   authentication is unavailable, record that the lookup could not be run.
4. If `package.json` exists, read its `scripts` block and use the package
   manager implied by the committed lockfile. When a test script exists, run
   it in single-run mode rather than watch mode and record the exact result.
   If `package.json` is absent, dependencies are not installed, or no test
   script exists, record `No automated tests found` and the reason. Do not
   claim tests passed when they were not run.
5. If a local `.env` file or another untracked `.env.*` file exists, list only
   the variable names. Never display or copy their values. For example:

   ```bash
   grep -hoE '^[A-Za-z_][A-Za-z0-9_]*=' .env .env.local 2>/dev/null \
     | tr -d '=' | sort -u
   ```

   Compare the names against the committed `.env.example`. Describe a variable
   as new only when branch evidence establishes that it was added during the
   current work.

## Draft the handoff

Use local time and propose a unique path in this form:

```text
handoff/handoff-YYYY_MM_DD-HH_MM_SS.md
```

The Markdown document must contain:

- `# Handoff — YYYY-MM-DD HH:MM:SS — Issue #N: description`
- **Branch**: exact current branch name
- **PRs**: PR number, title, state, base branch, and URL, or lookup status
- **What was implemented**: concise, evidence-based summary
- **Key files**: new and modified files with a short purpose for each
- **New environment variables**: variable names only, or `None identified`
- **Test status**: commands and outcomes, or `No automated tests found`
- **Notes**: decisions, caveats, uncommitted work, and concrete follow-ups

Show the proposed path and complete handoff content to the user, then wait for
explicit approval. Do not create the directory or file during the review step.

## Write after approval

After approval:

1. Recheck that the proposed path does not exist. If it does, generate a new
   timestamped path and tell the user.
2. Verify the path is covered by `.gitignore`.
3. Create `handoff/` if needed and write the approved content to the new file.
4. Confirm the file remains ignored and report its path.

Do not stage, commit, or push the handoff file.
