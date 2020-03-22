#!/bin/bash

mongorestore -h 127.0.0.1 --port 3001 --drop -d umsme "${1}/meteor"

