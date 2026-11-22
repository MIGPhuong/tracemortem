# Publish TraceMortem on the MIGPhuong GitHub account

The public repository and HTTPS demo are **not created by this source package**. Verify both actually exist before placing links on Devpost. Never use the GitHub account or repository that hosts GhostSignal.

## With GitHub CLI (recommended for a one-time local publish)

1. Install GitHub CLI (`gh`), Git and Node.js 22+, then authenticate with `gh auth login` **as `MIGPhuong`**. Do not use another account.
2. Extract the source ZIP and open the `tracemortem/` directory in a terminal.
3. Run `bash scripts/publish-github.sh`.

The script verifies the authenticated login is exactly `MIGPhuong`, runs the tests and build, commits the project to `main`, creates the public repository `MIGPhuong/tracemortem` (or safely pushes to it if it already exists), enables GitHub Pages using GitHub Actions and attempts to dispatch the deployment workflow. It never uses force-push. It exits without writes if the logged-in username is wrong or an unrelated Git remote is configured.

## Or create the repository in the browser

1. Sign in to GitHub as `MIGPhuong` and visit `https://github.com/new`.
2. Name it **tracemortem**, set visibility to **Public** and create it **empty** (no generated README or .gitignore).
3. Push the source using local Git, or let an authorized GitHub integration upload the files after the repository exists.
4. In repository **Settings → Pages**, select **GitHub Actions** as the build/deployment source.
5. Run or rerun **TraceMortem — GitHub Pages** in the repository's **Actions** tab. Wait for its deploy job to succeed.

## Verify and update Devpost

- Repo: `https://github.com/MIGPhuong/tracemortem`
- Expected GitHub Pages URL: `https://migphuong.github.io/tracemortem/`
- Verify the repo is Public and that the HTTPS demo loads, can switch cases, and imports a sample JSONL file.
- Only after verification, add both links to the existing TraceMortem Devpost project at `https://devpost.com/software/tracemortem`.
- Leave the Kiroween entry **unsubmitted** until the user explicitly authorizes a submission.

## What the workflows do

- `.github/workflows/ci.yml` — syntax checks, 27 engine tests, and production static build on push/pull request.
- `.github/workflows/deploy-pages.yml` — rechecks, builds `dist/`, uploads GitHub Pages artifact and deploys the static HTTPS site after pushes to `main`.

Log data is processed locally in the browser. The samples are synthetic. Rankings are heuristic and must not be presented as a proven root cause.
