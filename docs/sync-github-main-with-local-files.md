# Sync GitHub Main While Preserving Local Files

Use this procedure to update the working copy from GitHub while retaining an
explicitly reviewed set of machine-specific files. Never reset the branch
until the backup has been created and verified.

## 1. Fetch and inspect

```bash
git fetch origin main
git status --short
git diff --name-status origin/main --
```

Stop if the output contains unexpected local files.

## 2. Define files to preserve

Review this list before every sync:

```bash
local_files=(
  ".env.example"
  ".github/workflows/deploy-staging.yml"
  ".replit"
  "README.md"
  "package-lock.json"
  "package.json"
  "vite.config.ts"
)
```

Anything listed here remains local and will not receive GitHub updates.

## 3. Create and verify backups

```bash
sync_backup=$(mktemp -d ../lytir-local-backup.XXXXXX)
backup_branch="backup/pre-sync-$(date +%Y%m%d-%H%M%S)"

mkdir "$sync_backup/files"
git branch "$backup_branch"
git diff --binary origin/main -- > "$sync_backup/local-vs-main.patch"
git status --short > "$sync_backup/status.txt"

cp --parents -- "${local_files[@]}" "$sync_backup/files"

if [ -f .env.local ]; then
  cp --parents -- .env.local "$sync_backup/files"
fi

for file in "${local_files[@]}"; do
  cmp -- "$file" "$sync_backup/files/$file" || exit 1
done

find "$sync_backup" -type f -print
```

Do not continue unless every expected file appears and verification succeeds.
The backup branch protects committed history, while the copied files protect
the current working-tree versions.

## 4. Update from GitHub

```bash
git reset --hard origin/main
```

## 5. Restore local files

```bash
cp -av "$sync_backup/files"/. .
```

Only files copied into the `files` backup directory are restored.

## 6. Verify the result

```bash
git rev-parse HEAD
git rev-parse origin/main
git status --short
git diff --name-status origin/main -- src/
git diff --name-status origin/main --
```

Expected results:

- `HEAD` and `origin/main` identify the same commit.
- The `src/` comparison is empty.
- Only the approved local files differ.
- `.replit` may appear as untracked.

## 7. Install and validate

Use the preserved lockfile without rewriting it:

```bash
npm ci
npm run lint
npm run format:check
npm run typecheck
npm test
npm run build
npm run lint:md
```

Keep the backup directory and backup branch until all validation succeeds.
