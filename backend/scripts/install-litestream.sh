#!/usr/bin/env sh
# Render build step: fetch the Litestream binary into backend/bin.
# The release publishes no checksums, so the SHA-256 below was measured once; the build fails if the file ever changes.
set -eu
VERSION=v0.3.13
SHA256=eb75a3de5cab03875cdae9f5f539e6aedadd66607003d9b1e7a9077948818ba0
TARBALL="litestream-${VERSION}-linux-amd64.tar.gz"
mkdir -p bin
curl -fsSL -o "bin/${TARBALL}" "https://github.com/benbjohnson/litestream/releases/download/${VERSION}/${TARBALL}"
echo "${SHA256}  bin/${TARBALL}" | sha256sum -c -
tar -xzf "bin/${TARBALL}" -C bin litestream
rm "bin/${TARBALL}"
