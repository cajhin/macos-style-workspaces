#!/bin/sh

NAME=macos-style-workspaces@cajhin
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
SRC_DIR="$SCRIPT_DIR/../src"
BUILD_DIR="$SCRIPT_DIR/../build"

mkdir -p "$BUILD_DIR"
cd "$SRC_DIR"
zip -r "$BUILD_DIR/$NAME.zip" *
