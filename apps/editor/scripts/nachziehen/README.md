# Florians Wesen-Bögen → Editor (Versuch 12.10.2026)

Zieht die Ansichten aus Florians Bögen automatisch nach und legt sie als Editor-Versuch ab: Rex aus `docs/look/editor/06-rex-mit-maul.png`, Langhals und Robbe aus `04-wesen-mit-maeulern.png` (Reihe 1 und 2). Nachfolger von `../tiger/` (dort fehlten die Schritte Bild lesen und Außenraum füllen).

**Aufruf** (aus dem Repo, Python 3 ohne Zusatzpakete, macOS wegen `sips`):

```
python3 apps/editor/scripts/nachziehen/nachziehen.py [rex langhals robbe] [--arbeit ORDNER]
```

Der Arbeitsordner (Standard: Temp-Verzeichnis) hält die BMP-Kopien und den Bericht `bericht-<name>.json`.

**Ergebnis je Wesen**
- `apps/editor/public/versuch/<name>/<name>.json`
  - `profile`: `seite`, `front`, `top`, `seite_auf`, `front_auf` (Editor-Profile, Kacheln)
  - `linien`: Maullinien je Ansicht, je Farbe vom Anfang zum Mundwinkel (Mundwinkel als letzter Punkt)
  - `punkte`: dieselben Punkte flach wie beim Tiger (für die vorhandene Überlagerung)
  - `augen`: Umriss als Polygon, beim Rex mit `lid`, bei der Robbe mit `glanz`
  - `bilder`: Linienbilder mit Weltrechteck; beim Top-Bild sind die Zeilen gespiegelt
  - `meta`: Maßstab, Pixel-Abbildung je Ansicht, Registrierung der offenen Seite, Prüfungen
- `apps/editor/public/versuch/<name>/linien-<ansicht>.png`: innere Linien ohne Außenkontur, Punkte und farbige Linien. Beim Rex gibt es zusätzlich die Zahnansichten (`seite_zaehne`, `front_zaehne`) als ganze Zeichnung, auf das geschlossene Profil gelegt.
- `docs/progress/editor/nachziehen-<name>.png`: Kontaktbogen mit drei Teilen:
  - Vorlage mit Kurven, Knoten und Punkten
  - vergrößerte Mäuler und Augen
  - die JSON-Daten in Kacheln mit den Prüfzahlen

**Ablauf**
1. `bild.py`: Die Vorlage wird per `sips` zu BMP, daraus werden Farbe und Helligkeit gelesen.
2. `segment.py`: Florians Punkte werden über die Farbe gefunden (Erosion trennt sie von den dünnen Linien). Je Ansicht wird der Außenraum gefüllt, mit Tinte ab D ≥ 6 und 1 px erweitert gegen Haarlücken. Der Umriss wird per Moore-Verfolgung gewonnen und auf die Strichmitte geschoben (äußerste Dunkelheitsspitze). An Punkten führt der Umriss durch die Punktmitte, durch eine Ecke oder als Sehne vorbei.
3. `fit.py`: Ecken erkennen, Schneider-Anpassung mit Fehler ≤ 1,6 px. Achsknoten bekommen den Griff quer zur Achse, wie `achsenRegeln` in `packages/shape/src/profil.ts`.
4. `nachziehen.py`:
   - Maßstab: max(Länge, Höhe) der geschlossenen Seite = 0,75 Kachel
   - Boden: tiefster Kurvenpunkt der jeweiligen Ansicht
   - x-Nullpunkt: Mitte der geschlossenen Seite; die offene Seite wird über ihren hinteren Umriss darauf registriert, das Top mittig
   - Achsen: Spiegelachse der Zeichnung (Median der Zeilen- bzw. Spaltenmitten)
5. `merkmale.py`: Maullinien (nächste Nachbarn ab dem Mundwinkel), Augen und Linienbilder. Gefüllte Augen: konvexe Hülle. Gezeichnete Augen: eingeschlossene Flächen um die Mitte aus `wesen.py`.
6. `blatt.py`: Kontaktbogen (eigene 5×7-Schrift).

**Ansichten und Rechtecke** stehen in `wesen.py` (Pixel der Vorlage). Ein neues Wesen braucht dort einen Eintrag.

Prüfen, dass der Editor die Profile annimmt (Schema, Achsregeln, Umlaufsinn): `ProfilSchema.parse` und `achsenRegeln` aus `@ee/shape` auf die JSON anwenden. Am 12.10. bestanden alle 15 Profile.
