#!/bin/bash

# Exit on error
set -e

# Echo commands
set -x

npm run build
rsync -avP --delete build/ emlun.se:/srv/http/public/spire-map-gui/
