#!/bin/bash
# Remove node_modules and .next from entire git history so push to GitHub succeeds.
# Run from the git repository root (the directory that contains .git).
# If your repo is frontend-only, run from the frontend directory.
# Usage: ./scripts/remove-node-modules-from-history.sh
#        SKIP_CONFIRM=1 ./scripts/remove-node-modules-from-history.sh   # no prompt

set -e

if [ ! -d .git ]; then
  echo "Error: Run this script from the git repository root (where .git is)."
  exit 1
fi

if [ "$SKIP_CONFIRM" != "1" ]; then
  echo "This will rewrite git history to remove node_modules and .next."
  echo "Backup: consider 'git clone . ../repo-backup' first."
  read -p "Continue? (y/N) " -n 1 -r
  echo
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    exit 0
  fi
fi

# Remove every tracked file under node_modules/ or .next/ (batch remove = much faster)
export FILTER_BRANCH_SQUELCH_WARNING=1
git filter-branch --force --index-filter '
  files=$(git ls-files --cached | grep -E "node_modules/|\.next/" || true)
  [ -n "$files" ] && echo "$files" | xargs git rm -rf --cached --ignore-unmatch 2>/dev/null || true
' --prune-empty -- --all

# Remove filter-branch backup refs so they don't stay in the repo
git for-each-ref --format="%(refname)" refs/original/ 2>/dev/null | while read ref; do
  git update-ref -d "$ref" 2>/dev/null || true
done

# Verify the large file that GitHub rejects is gone from all branches
for BIG_FILE in \
  "node_modules/@next/swc-darwin-arm64/next-swc.darwin-arm64.node" \
  "frontend/node_modules/@next/swc-darwin-arm64/next-swc.darwin-arm64.node"; do
  if git log --all --oneline -- "$BIG_FILE" 2>/dev/null | grep -q .; then
    echo "Verification failed: $BIG_FILE still appears in history. Run this script from the repo root (directory that contains that path)."
    exit 1
  fi
done

# Purge old objects so they are not pushed
git reflog expire --expire=now --all
git gc --prune=now --aggressive

echo ""
echo "Done. Push each branch with: git push origin <branch> --force"
