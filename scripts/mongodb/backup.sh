#!/bin/bash

mkdir backup
ISODATE=`date +%y-%m-%dT%H:%M`
mongodump --forceTableScan -d umsme -o "backup/${ISODATE}"
