#!/bin/bash
# Repair self-family members and lost family flags. See repair-self-family.js.
#
#   ./repair-self-family.sh                 dry run against umsme
#   ./repair-self-family.sh --apply         write the changes
#   ./repair-self-family.sh --apply mydb    against another database
#
# Take a backup first: ./backup.sh
set -euo pipefail

APPLY=false
if [ "${1:-}" = "--apply" ]; then
  APPLY=true
  shift
fi
DB="${1:-umsme}"
SCRIPT="$(dirname "$0")/repair-self-family.js"

if [ "$APPLY" = true ]; then
  read -p "Write repairs to the '$DB' database? [y/N] " confirm
  if [[ "$confirm" != "y" && "$confirm" != "Y" ]]; then
    echo "Aborted."
    exit 1
  fi
fi

mongosh "$DB" --quiet --eval "void (globalThis.APPLY = $APPLY)" --file "$SCRIPT"
