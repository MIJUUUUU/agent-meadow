#!/bin/sh
set -eu
cd "$(dirname "$0")/.."
BUILD_DIR=$(mktemp -d)
trap 'rm -rf "$BUILD_DIR"' EXIT
for ARCH in arm64 x86_64; do
  xcrun swiftc desktop/Meadow.swift -module-cache-path "$BUILD_DIR/cache" -O -target "$ARCH-apple-macos14.0" -framework Cocoa -framework WebKit -o "$BUILD_DIR/$ARCH"
done
xcrun lipo -create "$BUILD_DIR/arm64" "$BUILD_DIR/x86_64" -output desktop/AgentMeadow
codesign --force --sign - desktop/AgentMeadow
