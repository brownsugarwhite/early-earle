#!/bin/zsh
# Editor (Web-Modus) eines beliebigen Commits auf eigenem Port starten, ein Playwright-Skript ausführen, Server beenden.
# Für Regressionsvergleiche: gleicher Ablauf, alter Stand gegen heute (16.10.: so wurde die Regression G2 gefunden).
# Aufruf: apps/editor/scripts/pruefen/vergleich/editor-lauf.sh <commit|HEAD> <port> <skript.mjs>
# Nie Florians Port 5180. Arbeitsbäume unter $WT_BASIS (Standard: $TMPDIR/ee-vergleich), node_modules des Editors werden
# kopiert (rsync), damit @ee/shape auf den Arbeitsbaum zeigt (ein verlinkter Ordner zeigte auf das Hauptrepo).
HIER=${0:A:h}
HAUPT=${HIER:h:h:h:h:h}
WT_BASIS=${WT_BASIS:-${TMPDIR:-/tmp}/ee-vergleich}
c=$1; port=$2; skript=${3:A}
if [ -z "$c" ] || [ -z "$port" ] || [ -z "$skript" ]; then echo "Aufruf: editor-lauf.sh <commit|HEAD> <port> <skript.mjs>"; exit 2; fi
if [ "$c" = "HEAD" ]; then wt=$HAUPT; else
  mkdir -p $WT_BASIS
  wt=$WT_BASIS/ed-$c
  if [ ! -d $wt ]; then
    git -C $HAUPT worktree add -q --detach $wt $c || exit 1
    ln -s $HAUPT/node_modules $wt/node_modules
    rsync -a --exclude .vite --exclude .vite-temp $HAUPT/apps/editor/node_modules/ $wt/apps/editor/node_modules/
    for p in shape render; do [ -d $HAUPT/packages/$p/node_modules ] && ln -s $HAUPT/packages/$p/node_modules $wt/packages/$p/node_modules; done
  fi
fi
cd $wt/apps/editor || exit 1
mkdir -p $WT_BASIS
EDITOR_WEB=1 npx vite --port $port --strictPort > $WT_BASIS/vite-$port.log 2>&1 &
VPID=$!
for i in $(seq 1 90); do curl -s -o /dev/null http://localhost:$port/ && break; sleep 1; done
echo "Server ($c) nach $i s bereit"
EDITOR_URL=http://localhost:$port TAG=$c node "$skript"
RC=$?
kill $VPID 2>/dev/null; wait $VPID 2>/dev/null
exit $RC
