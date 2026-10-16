#!/bin/zsh
# Ein Kern-Skript (vite-node) gegen den Code eines beliebigen Commits ausführen (ROOT = Wurzel des Arbeitsbaums).
# Aufruf: apps/editor/scripts/pruefen/vergleich/kern-lauf.sh <commit|HEAD> <skript.ts>   (Umgebung wird durchgereicht)
HIER=${0:A:h}
HAUPT=${HIER:h:h:h:h:h}
WT_BASIS=${WT_BASIS:-${TMPDIR:-/tmp}/ee-vergleich}
c=$1; skript=${2:A}
if [ "$c" = "HEAD" ]; then wt=$HAUPT; else
  mkdir -p $WT_BASIS
  wt=$WT_BASIS/wt-$c
  if [ ! -d $wt ]; then
    git -C $HAUPT worktree add -q --detach $wt $c || exit 1
    ln -s $HAUPT/node_modules $wt/node_modules
    ln -s $HAUPT/packages/shape/node_modules $wt/packages/shape/node_modules
  fi
fi
cd $HAUPT/packages/shape
ROOT=$wt npx vite-node "$skript"
