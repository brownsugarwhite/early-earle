#!/bin/zsh
# Form zuerst (10.11.2026, G5): elf ältere Proben nacheinander im Fenster, für den Vergleich zweier Stände oder Schalter (wie in G4.4).
# Die Formen sollen dieselben sein; die Bilder der Proben landen im Ausgabeordner (nicht im Repo).
# Aufruf aus apps/editor:   zsh scripts/pruefen/form-alte-proben.sh <name> ['&schalter=…']
#   <name>: Ordner pruefen-ausgabe/alte-proben/<name>/ (je Probe eine Textdatei)
#   zweites Argument: Zusatz zur Adresse, z. B. '&flach=0&nadeln=0' (wie vor G5) oder '&nachlauf=0' (wie vor G4.2)
# Danach vergleichen: diff -r pruefen-ausgabe/alte-proben/<a> pruefen-ausgabe/alte-proben/<b>   (Zeiten und Pixel streuen)
name=${1:?Name des Laufs fehlt}
zusatz=${2:-}
aus=pruefen-ausgabe/alte-proben/$name
mkdir -p $aus
export KURVEN_URL="http://localhost:5193/kurven.html?gewichte=geometrie$zusatz"
lauf() {
  local titel=$1
  shift
  echo "== $titel"
  "$@" > $aus/$titel.txt 2>&1
  tail -1 $aus/$titel.txt | cut -c1-160
}
lauf haerte node scripts/pruefen/form-haerte-probe.mjs $aus
lauf boden node scripts/pruefen/form-boden-probe.mjs $aus
lauf kreuzung node scripts/pruefen/form-kreuzung-probe.mjs $aus
lauf griffe node scripts/pruefen/form-griffe-probe.mjs $aus
lauf stift node scripts/pruefen/form-stift-probe.mjs $aus
lauf maul node scripts/pruefen/form-maul-loop.mjs $aus
lauf fressen node scripts/pruefen/form-fressen-pose.mjs $aus
lauf hinzurueck node scripts/pruefen/form-hin-zurueck.mjs $aus
FALL=a lauf explosion-a node scripts/pruefen/form-explosion-probe.mjs $aus
FALL=e lauf explosion-e node scripts/pruefen/form-explosion-probe.mjs $aus
lauf griff-loslassen node scripts/pruefen/form-griff-loslassen.mjs $aus
echo "fertig: $aus"
