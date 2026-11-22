#!/usr/bin/env bash
# TraceMortem-only publishing helper. Never targets the GhostSignal account/repository.
set -Eeuo pipefail

OWNER='MIGPhuong'
REPO='tracemortem'
FULL_NAME="${OWNER}/${REPO}"
DEMO_URL='https://migphuong.github.io/tracemortem/'

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

for command_name in git gh node npm; do
  if ! command -v "$command_name" >/dev/null 2>&1; then
    printf 'Missing required command: %s\n' "$command_name" >&2
    exit 1
  fi
done

ACTIVE_ACCOUNT="$(gh api user --jq '.login')"
if [[ "$ACTIVE_ACCOUNT" != "$OWNER" ]]; then
  printf 'SAFETY STOP: GitHub CLI is logged in as %s, not %s. No repo was modified.\n' "$ACTIVE_ACCOUNT" "$OWNER" >&2
  exit 1
fi

printf 'Verified authenticated GitHub account: %s\n' "$ACTIVE_ACCOUNT"
npm run check
npm run build

if [[ -d .git ]]; then
  EXISTING_REMOTE="$(git remote get-url origin 2>/dev/null || true)"
  if [[ -n "$EXISTING_REMOTE" && "$EXISTING_REMOTE" != "https://github.com/${FULL_NAME}.git" && "$EXISTING_REMOTE" != "git@github.com:${FULL_NAME}.git" ]]; then
    printf 'SAFETY STOP: unexpected origin remote %s\n' "$EXISTING_REMOTE" >&2
    exit 1
  fi
  BRANCH="$(git branch --show-current)"
  if [[ -n "$BRANCH" && "$BRANCH" != 'main' ]]; then
    printf 'SAFETY STOP: active branch is %s (expected main).\n' "$BRANCH" >&2
    exit 1
  fi
else
  git init -b main
fi

git add -A
if ! git diff --cached --quiet; then
  git -c user.name='MIGPhuong' -c user.email='24273452+MIGPhuong@users.noreply.github.com' \
    commit -m 'Publish TraceMortem MVP, CI and Pages workflow'
fi

if gh repo view "$FULL_NAME" >/dev/null 2>&1; then
  printf 'Repository exists. Pushing only to %s, without force.\n' "$FULL_NAME"
  if ! git remote get-url origin >/dev/null 2>&1; then
    git remote add origin "https://github.com/${FULL_NAME}.git"
  fi
  git push -u origin main
else
  printf 'Creating public repository %s\n' "$FULL_NAME"
  gh repo create "$FULL_NAME" --public \
    --description 'Evidence-first, local-first incident forensics workbench | Kiroween 2026 Frankenstein' \
    --source . --remote origin --push
fi

if ! gh api "repos/${FULL_NAME}/pages" >/dev/null 2>&1; then
  printf 'Enabling GitHub Pages (GitHub Actions source) ...\n'
  gh api --method POST "repos/${FULL_NAME}/pages" -f build_type=workflow >/dev/null
fi

# Re-dispatch after Pages is enabled in case the initial push ran too early.
if ! gh workflow run deploy-pages.yml --repo "$FULL_NAME" --ref main; then
  printf 'Could not dispatch Pages workflow yet. Check GitHub Actions manually.\n' >&2
fi

printf '\nRepository: https://github.com/%s\n' "$FULL_NAME"
printf 'Expected HTTPS site after successful Pages deployment: %s\n' "$DEMO_URL"
printf 'Verify the Pages workflow and the live page before adding links to Devpost.\n'
printf 'Do not submit the Devpost entry yet.\n'
