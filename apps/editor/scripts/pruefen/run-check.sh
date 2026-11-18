#!/bin/zsh
# Startet den Web-Modus des Editors auf Port 5192, führt ein Playwright-Skript aus, beendet den Server.
# Aufruf: apps/editor/scripts/pruefen/run-check.sh <skript.mjs> [args]   (nie Florians Server auf 5180 benutzen)
HIER=${0:A:h}
ROOT=${HIER:h:h:h:h}
SKRIPT=${1:A}
shift
cd $ROOT/apps/editor || exit 1
mkdir -p pruefen-ausgabe
EDITOR_WEB=1 npx vite --port 5192 --strictPort > pruefen-ausgabe/vite-5192.log 2>&1 &
VPID=$!
for i in $(seq 1 90); do curl -s -o /dev/null http://localhost:5192/ && break; sleep 1; done
echo "Server nach $i s bereit"
EDITOR_URL=http://localhost:5192 node "$SKRIPT" "$@"
RC=$?
kill $VPID 2>/dev/null; wait $VPID 2>/dev/null
echo "run-check exit $RC"
exit $RC
