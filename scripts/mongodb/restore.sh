#!/bin/bash

mkdir backup
mongorestore --drop -d umsme "backup/${1}/meteor"

