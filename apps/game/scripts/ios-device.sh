#!/usr/bin/env bash
# Build für Florians iPhone. Ohne Team-ID: Web bauen, syncen und Xcode öffnen (Signieren + Run dort, siehe docs/IOS.md).
# Mit Team-ID (Xcode → Settings → Accounts → Apple-ID → Personal Team, 10 Zeichen):
#   IOS_TEAM_ID=ABCDE12345 pnpm ios:device            # baut signiert, installiert auf dem angeschlossenen iPhone und startet
#   IOS_TEAM_ID=… IOS_DEVICE="Florians iPhone" pnpm ios:device
set -euo pipefail
cd "$(dirname "$0")/.."

BUNDLE_ID="com.illudiy.earlyearle"
DERIVED="ios/build-device"

echo "▶ Web-Bundle (vite build)"
pnpm build
echo "▶ cap sync ios"
pnpm exec cap sync ios

if [ -z "${IOS_TEAM_ID:-}" ]; then
  echo "▶ Keine IOS_TEAM_ID gesetzt → Xcode öffnen. Dort: Target App → Signing & Capabilities → Team wählen, iPhone auswählen, ▶ Run."
  pnpm exec cap open ios
  exit 0
fi

DEST="generic/platform=iOS"
if [ -n "${IOS_DEVICE:-}" ]; then DEST="platform=iOS,name=$IOS_DEVICE"; fi

echo "▶ xcodebuild (Gerät, Team $IOS_TEAM_ID)"
xcodebuild \
  -project ios/App/App.xcodeproj \
  -scheme App \
  -configuration Debug \
  -destination "$DEST" \
  -derivedDataPath "$DERIVED" \
  -allowProvisioningUpdates \
  DEVELOPMENT_TEAM="$IOS_TEAM_ID" \
  CODE_SIGN_STYLE=Automatic \
  -quiet \
  build

APP="$DERIVED/Build/Products/Debug-iphoneos/App.app"
[ -d "$APP" ] || { echo "Kein App-Bundle unter $APP" >&2; exit 1; }

echo "▶ Auf das Gerät installieren (devicectl)"
DEVICE_ID="$(xcrun devicectl list devices --json-output /dev/stdout 2>/dev/null | python3 -c '
import json,sys
d=json.load(sys.stdin)
for dev in d.get("result",{}).get("devices",[]):
    if dev.get("connectionProperties",{}).get("pairingState")=="paired":
        print(dev["identifier"]); break
' || true)"
if [ -z "$DEVICE_ID" ]; then
  echo "Kein gekoppeltes iPhone gefunden – bitte anschließen, entsperren, „Vertrauen“ antippen und erneut starten." >&2
  exit 1
fi
xcrun devicectl device install app --device "$DEVICE_ID" "$APP"
xcrun devicectl device process launch --device "$DEVICE_ID" "$BUNDLE_ID"
echo "✓ $BUNDLE_ID läuft auf dem iPhone. Beim ersten Start: Einstellungen → Allgemein → VPN & Geräteverwaltung → Entwickler-App vertrauen."
