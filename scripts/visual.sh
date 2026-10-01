#!/usr/bin/env bash
# Visual regression wrapper. Baselines are produced and compared ONLY inside the
# digest-pinned Playwright image. Fails (never skips) when that is not possible.
#
# Usage: bash scripts/visual.sh [--update] [-- <extra playwright args>]
set -euo pipefail

IMAGE='mcr.microsoft.com/playwright:v1.62.1-noble@sha256:dcc5531e97840b9b5e794f2814476b21571c5124a3fca2267d73041f56e7580e'
ALLOWED_NODE='v24.18.1 v22.22.2'

fail() { echo "visual.sh: FAIL: $*" >&2; exit 1; }

update=()
args=()
for a in "$@"; do
  case "$a" in
    --update) update=(--update) ;;
    --) ;;
    *) args+=("$a") ;;
  esac
done

script_dir="${BASH_SOURCE[0]%/*}"
[ "$script_dir" != "${BASH_SOURCE[0]}" ] || script_dir=.
repo_root="$(cd "$script_dir/.." && pwd)"

if [ "${SK_VISUAL_IMAGE:-}" = "$IMAGE" ] && [ -n "${PLAYWRIGHT_BROWSERS_PATH:-}" ]; then
  # Inside the pinned image.
  node_version="$(node -v)"
  case " $ALLOWED_NODE " in
    *" $node_version "*) echo "visual.sh: node $node_version (allowed: $ALLOWED_NODE)" ;;
    *) fail "node $node_version is not in the allow-list ($ALLOWED_NODE)" ;;
  esac
  cd "$repo_root"
  [ -f apps/storybook/storybook-static/index.json ] \
    || fail "apps/storybook/storybook-static/index.json missing; build Storybook first"
  cd apps/storybook
  # `visual:run` is plain `playwright test`; invoked directly because pnpm is not in the image.
  [ "${#update[@]}" -eq 0 ] || args+=(--update-snapshots)
  exec ../../node_modules/.bin/playwright test ${args[@]+"${args[@]}"}
fi

runtime=''
for candidate in podman docker; do
  if command -v "$candidate" >/dev/null 2>&1; then
    runtime="$candidate"
    break
  fi
done
[ -n "$runtime" ] || fail "neither podman nor docker found; cannot enter the pinned image (no skip, no host Chromium)"
host="$(uname -sm 2>/dev/null || true)"
[ "$host" = "Linux x86_64" ] || fail "host is '$host', not Linux x86_64; run the visual commands on CI or a Linux host"
"$runtime" info >/dev/null 2>&1 || fail "$runtime is installed but cannot start; cannot enter the pinned image"

echo "visual.sh: running in pinned image via $runtime"
"$runtime" run --rm --ipc=host \
  -v "$repo_root:/work:Z" -w /work \
  -e SK_VISUAL_IMAGE="$IMAGE" \
  -e CI="${CI:-}" \
  "$IMAGE" \
  bash scripts/visual.sh ${update[@]+"${update[@]}"} -- ${args[@]+"${args[@]}"}
