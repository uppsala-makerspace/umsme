#!/bin/bash

# Also possible to provide settings via --settings settings.json
export METEOR_SETTINGS=$(cat settings.json )
# Make sure to change to provide a valid password instead of "PASSWORD"
export MAIL_URL=smtp://umsme@uppsalamakerspace.se:PASSWORD@mail.uppsalamakerspace.se:587?tls.rejectUnauthorized=false
# Assumes mongod is started separately with umsme database
export MONGO_URL=mongodb://localhost:27017/umsme
meteor --settings settings.json
