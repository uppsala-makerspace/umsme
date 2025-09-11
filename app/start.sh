#!/bin/bash

# Also possible to provide settings via --settings settings.json
export METEOR_SETTINGS=$(cat settings.json )
export MAIL_URL=smtp://umsme@uppsalamakerspace.se:umsmerules4ever@mail.uppsalamakerspace.se:587?tls.rejectUnauthorized=false
export MONGO_URL=mongodb://localhost:27017/umsme

meteor --port 3001 --settings settings.json
# NODE_DEBUG=net,stream
