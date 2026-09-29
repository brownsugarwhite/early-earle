#!/usr/bin/env bash
# Web-Bundle bauen → cap sync → Xcode-Build für den Simulator → auf dem gebooteten Simulator installieren und starten.
#   pnpm ios:sim                 # kompletter Durchlauf
#   pnpm ios:sim --skip-web      # nur nativ (dist/ von vorher)
#   IOS_SIM_DEVICE="iPhone 17 Pro" pnpm ios:sim
set -euo pipefail
cd "$(dirname "$0")/.."

DEVICE="${IOS_SIM_DEVICE:-iPhone Air}"
BUNDLE_ID="com.illudiy.earlyearle"
DERIVED="ios/build"
SKIP_WEB=0
for arg in "$@"; do
  case "$arg" in
    --skip-web) SKIP_WEB=1 ;;
    *) echo "Unbekanntes Argument: $arg" >&2; exit 2 ;;
  esac
done

if [ "$SKIP_WEB" = 0 ]; then
  echo "▶ Web-Bundle (vite build)"
  pnpm build
fi

echo "▶ cap sync ios"
pnpm exec cap sync ios

echo "▶ xcodebuild (Simulator: $DEVICE)"
xcodebuild \
  -project ios/App/App.xcodeproj \
  -scheme App \
  -configuration Debug \
  -sdk iphonesimulator \
  -destination "platform=iOS Simulator,name=$DEVICE" \
  -derivedDataPath "$DERIVED" \
  -quiet \
  build

APP="$DERIVED/Build/Products/Debug-iphonesimulator/App.app"
[ -d "$APP" ] || { echo "Kein App-Bundle unter $APP" >&2; exit 1; }

echo "▶ Simulator starten und installieren"
xcrun simctl boot "$DEVICE" >/dev/null 2>&1 || true
# Simulator.app liegt je nach Xcode-Version im Developer-Ordner; ein fehlendes Fenster ist kein Fehler (simctl reicht).
SIM_APP="$(xcode-select -p)/Applications/Simulator.app"
if [ -d "$SIM_APP" ]; then open -a "$SIM_APP" || true; else open -a Simulator 2>/dev/null || true; fi
xcrun simctl install booted "$APP"
xcrun simctl launch booted "$BUNDLE_ID" >/dev/null
echo "✓ $BUNDLE_ID läuft auf „$DEVICE“ ($APP)"
