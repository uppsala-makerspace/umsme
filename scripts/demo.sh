#!/usr/bin/env bash
#
# Start admin, app and payment against the demo database (umsme-demo), with
# fresh demo data. See plan/test-strategy.md.
#
#   ./scripts/demo.sh            seed the demo data, then start all three
#   ./scripts/demo.sh --no-seed  start all three on the data already there
#
# Admin http://localhost:3100, app http://localhost:3101, payment :3103: next
# to the development servers on 3000, 3001 and 3003, which can keep running.
# Needs a local MongoDB running as replica set rs0. Ctrl+C stops everything.

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
LOGS="$ROOT/.demo-data/logs"
SEED=1
[[ "${1:-}" == "--no-seed" ]] && SEED=0

for port in 3100 3101 3103; do
  if (echo > "/dev/tcp/127.0.0.1/$port") 2>/dev/null; then
    echo "Port $port is in use. Is a demo already running (admin 3100, app 3101, payment 3103)?" >&2
    exit 1
  fi
done

mkdir -p "$LOGS"
# SIGINT, as Ctrl+C sends: the meteor tool ignores SIGTERM.
trap 'trap - EXIT INT TERM; kill -INT 0' EXIT INT TERM

# start <app> <npm script>: run it in the background, prefixed and logged.
start() {
  (cd "$ROOT/$1" && npm run --silent "$2" 2>&1) | tee "$LOGS/$1.log" | sed -u "s/^/[$1] /" &
}

# wait_for <log> <pattern>: until the pattern shows up, or a seed refusal does.
wait_for() {
  until grep -q "$2" "$1" 2>/dev/null; do
    if grep -q '\[seed\] Refusing\|\[seed\] No seed scenario\|=> Exited with code' "$1" 2>/dev/null; then
      echo "Admin did not start; see $1" >&2
      exit 1
    fi
    sleep 1
  done
}

: > "$LOGS/admin.log"
if [[ $SEED == 1 ]]; then
  start admin seed:demo
  wait_for "$LOGS/admin.log" '\[seed\] demo: done'
else
  start admin demo
  wait_for "$LOGS/admin.log" 'App running at'
fi

start app demo
start payment demo
wait
