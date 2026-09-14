---
name: sync-from-dev
description: Create a GitHub pull request from dev to the current ticket-numbered branch when the user explicitly requests a sync from dev.
---

# Sync from Dev

Create the pull request only when the user explicitly invokes this workflow.
This skill creates a PR to bring `dev` changes into the current branch; it does
not merge the PR.

## Required workflow

1. Read the current branch and confirm it is neither `dev` nor `main`. Extract
   the ticket number from its leading numeric prefix. For example,
   `1-set-up-project-boilerplate-and-development-configuration` maps to issue
   `#1`. Stop and ask the user for a corrected branch or ticket number if the
   branch does not begin with a number followed by `-`.
2. Fetch `dev` and the current branch from the remote. Inspect the working
   tree, remote configuration, commits, and complete diff representing changes
   in `origin/dev` that are not in the current branch.
3. Confirm that `dev` exists on the remote, the current branch's issue exists
   in the current GitHub repository, and `dev` contains changes not already in
   the current branch. Stop rather than guessing another source branch or
   creating an empty PR.
4. Ensure the current branch is available on the remote and synchronized with
   its remote tracking branch. Do not commit local changes as part of this
   workflow; report that uncommitted changes will not be included. If the
   current branch is ahead, push it normally. If it is behind or has diverged,
   stop and report the synchronization problem. Never force-push.
5. Before a required push, use the platform-specific authentication helper
   when present:
   - Linux or WSL: `./.agents/scripts/local-auth.sh`
   - Windows PowerShell: `& .\.agents\scripts\local-auth.ps1`

   If the applicable helper is missing, print a clear warning identifying its
   path and continue. If it exists but fails, stop without pushing or creating
   the PR.
6. Check for an existing open PR from `dev` to the current branch. If one
   exists, do not create a duplicate; report its URL instead.
7. Build the PR title and description from all `dev` changes being brought
   into the current branch, not only the latest commit. The body must
   summarize the included work and include `Refs #<ticket-number>` for the
   current branch's issue on its own line. Use `Refs`, not an auto-closing
   keyword.
8. Do not run checks against the merged result; the merge has not happened
   yet. State in the body that the pull request's own checks validate the
   merge, and list only checks that were actually run on `dev` or the current
   branch. Never describe the merged result as validated before the merge
   exists.
9. Resolve the currently authenticated GitHub user. Create a non-draft PR
   assigned to that user, with `dev` as the head and the current branch as the
   base.
10. Verify and report the PR number, URL, title, assignee, head branch, base
    branch, and referenced issue.

## Pull request body shape

```markdown
## Summary

- Summarize all dev changes being synchronized
- Highlight relevant integration considerations

## Validation

- Note that the pull request's own checks validate the merged result
- List any checks already run on `dev` or the current branch

Refs #1
```
