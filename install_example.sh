#!/bin/bash

# Where the built version should be unpackaged.
cd /srv/umsme2
rm -rf bundle
tar xfz path_to_built_umsme/umsme2.tar.gz
chown -R root .
cd bundle/programs/server/
npm install