#!/bin/bash

# Where the built version is unpackaged.
cd /srv/umsme2

export METEOR_SETTINGS=$(cat settings.json )
export PORT=3000
# Make sure to change to provide a valid password instead of "PASSWORD"
export MAIL_URL=smtp://umsme@uppsalamakerspace.se:PASSWORD@mail.uppsalamakerspace.se:587?tls.rejectUnauthorized=false
# Assumes mongod is started separately with umsme database
export MONGO_URL=mongodb://localhost:27017/umsme
export ROOT_URL=https://umsme.uppsalamakerspace.se

cd bundle

# Point to where the nodejs binary is
NODE_BINARY=/root/.nvm/versions/node/v22.15.1/bin/node
echo Using node version `$NODE_BINARY --version`
echo Starting UMSME

$NODE_BINARY main.js