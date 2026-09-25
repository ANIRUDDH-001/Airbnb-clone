#!/usr/bin/env sh
# Render build step: fetch the Litestream binary into backend/bin.
set -eu
VERSION=v0.3.13
mkdir -p bin
curl -fsSL "https://github.com/benbjohnson/litestream/releases/download/${VERSION}/litestream-${VERSION}-linux-amd64.tar.gz" \
  | tar -xz -C bin litestream
