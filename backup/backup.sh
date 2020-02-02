#!/bin/bash

ISODATE=`date +%y-%m-%dT%H:%M`
mongodump -h 127.0.0.1 --port 3001 --forceTableScan -d meteor -o "${ISODATE}"

