#!/bin/bash

read -p "Drop the umsme database? This cannot be undone. [y/N] " confirm
if [[ "$confirm" != "y" && "$confirm" != "Y" ]]; then
  echo "Aborted."
  exit 1
fi

mongosh umsme --eval "db.dropDatabase()"
