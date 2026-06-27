#!/usr/bin/env bash
set -e

if [ -z "$GH_TOKEN" ]; then
  echo "Error: GH_TOKEN is not set"
  exit 1
fi

echo "Building Brotherhood Canvas..."

echo "→ Building arm64"
npx electron-vite build
npx electron-builder --mac --arm64

echo "→ Building x64"
npx electron-builder --mac --x64

echo "✓ Done. Check GitHub for the new release."
