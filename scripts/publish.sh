#!/usr/bin/env bash
set -e

if [ -z "$GH_TOKEN" ]; then
  echo "Error: GH_TOKEN is not set"
  exit 1
fi

VERSION=$(node -p "require('./package.json').version")
TAG="v$VERSION"

echo "Building Brotherhood Canvas $TAG..."

echo "→ Building arm64"
npx electron-vite build
npx electron-builder --mac --arm64

echo "→ Building x64"
npx electron-builder --mac --x64

echo "→ Creating GitHub release $TAG"
GITHUB_TOKEN=$GH_TOKEN gh release create "$TAG" \
  "release/Brotherhood Canvas-$VERSION-arm64.dmg" \
  "release/Brotherhood Canvas-$VERSION-arm64.dmg.blockmap" \
  "release/Brotherhood Canvas-$VERSION-arm64-mac.zip" \
  "release/Brotherhood Canvas-$VERSION-arm64-mac.zip.blockmap" \
  "release/Brotherhood Canvas-$VERSION.dmg" \
  "release/Brotherhood Canvas-$VERSION.dmg.blockmap" \
  "release/Brotherhood Canvas-$VERSION-mac.zip" \
  "release/Brotherhood Canvas-$VERSION-mac.zip.blockmap" \
  "release/latest-mac.yml" \
  --title "$TAG" \
  --repo createdbynoone/brotherhood-canvas

echo "✓ Done — https://github.com/createdbynoone/brotherhood-canvas/releases/tag/$TAG"
