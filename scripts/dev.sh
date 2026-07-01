#!/bin/bash
set -e

PROJ="$(cd "$(dirname "$0")/.." && pwd)"
USERDATA="$HOME/Library/Application Support/brotherhood-canvas"

# Kill any running dev or installed instances
pkill -f "Electron.app/Contents/MacOS/Electron" 2>/dev/null || true
pkill -f "Brotherhood Canvas.app" 2>/dev/null || true
sleep 1

# Clear stale Chromium singleton locks (left behind by kill -9)
rm -f "$USERDATA/SingletonLock" \
      "$USERDATA/SingletonCookie" \
      "$USERDATA/SingletonSocket" 2>/dev/null || true

# Kill anything on Vite's port
lsof -ti:5173 | xargs kill -9 2>/dev/null || true

cd "$PROJ"
exec npx electron-vite dev
