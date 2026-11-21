#!/bin/bash
set -euo pipefail
cd "$(dirname "$0")/.."
APP="$PWD/dist/LocalNotes.app"
npm run typecheck
npm run build:web
mkdir -p "$APP/Contents/MacOS" "$APP/Contents/Resources"
rm -rf "$APP/Contents/Resources/web"
cp -R build/web sample "$APP/Contents/Resources/"
cat > "$APP/Contents/Info.plist" <<'PLIST'
<?xml version="1.0" encoding="UTF-8"?><!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd"><plist version="1.0"><dict><key>CFBundleExecutable</key><string>LocalNotes</string><key>CFBundleIdentifier</key><string>dev.localnotes.mac</string><key>CFBundleName</key><string>LocalNotes</string><key>CFBundleVersion</key><string>1</string><key>CFBundleShortVersionString</key><string>0.1.0</string><key>LSMinimumSystemVersion</key><string>13.3</string><key>NSHighResolutionCapable</key><true/></dict></plist>
PLIST
swiftc -target "$(uname -m)-apple-macos13.3" -module-cache-path "$PWD/build/swift-cache" mac/main.swift mac/AIService.swift mac/ActionStorage.swift mac/ActionIndex.swift mac/ReferenceIndex.swift mac/ReferenceScan.swift -lsqlite3 -o "$APP/Contents/MacOS/LocalNotes" -framework Cocoa -framework WebKit
codesign --force --deep --sign - "$APP"
echo "$APP"
