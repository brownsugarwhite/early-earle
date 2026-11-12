# Prototyp „Kurven im Raum“

Lauffähige Vision des Kurven-Editors: Raum, Blatt und Blick mit Faltung, eine Gestengrammatik ohne Werkzeugleiste, Licht statt
Beschriftung. Konzept: [`../KONZEPT.md`](../KONZEPT.md), Recherche: [`../RECHERCHE.md`](../RECHERCHE.md).

## Bauen und Starten

```bash
npm i three@0.170.0 esbuild@0.24.0     # einmal (oder NODE_MODULES=<pfad> setzen)
node bau.mjs src/main.js dist/vision.html
open dist/vision.html                   # eine Datei, läuft ohne Server
```

Einstellungen über die Adresse (`?form=vogel&layout=blatt`) oder den Anker (`#vogel-blatt`, im Artefakt):

| Schlüssel | Werte |
|---|---|
| Form | `kugel` (Start mit Mittellinie), `vogel` (strange bird), `fisch` (teat firefish), `kaputt` (test_kaputt) |
| Layout | `raum` (Start), `blatt`, `seite`, `front`, `top` |
| Varianten | `leeredreht` (ein Finger auf der Leere dreht; Striche beginnen auf der Haut), `ton`, `ohneseife`, `zeigen` (Geisterhand führt vor) |

## Aufbau

| Datei | Inhalt |
|---|---|
| `src/netz.js` | Netz der Haut (Ruhe, aktuelle Lage, Dreiecke, Spiegelpartner, Strahl, nächster Punkt), Ikosaeder-Kugel |
| `src/linien.js` | Loops als Bézier (`mitte`, `ring`, `paar`), Proben, Punkt einsetzen (de Casteljau) und löschen (Schneider-Anpassung) |
| `src/rbf.js`, `src/haut.js` | Ersatzlöser: Verformung mit radialen Basisfunktionen durch die Proben der Linien; Zugbasis für flüssige Züge |
| `src/schnitt.js` | Strich → Loop (Nulldurchgänge der Strichfläche auf dem Netz), geschlossener Strich → Form, Kreuzungen |
| `src/zeichner.js`, `src/shader.js` | three.js: Jelly, Papier mit Platten und langem Schatten (Sprungflutung), Linienbänder, Punkte, Wände, Strahlen, Glas |
| `src/raum.js`, `src/ansichten.js` | Raumecke, Faltung, Blatt-Layout (Projektionsmethode 1), Ansichten |
| `src/app.js`, `src/bild.js`, `src/werkzeuge.js` | Handlungen, Geschichte, Pose, Bildschleife, Wände als Ansichten (Interactive Shadows), Überlagerung |
| `src/eingabe.js` | Grammatik für Finger, Maus und Trackpad |
| `src/film.js` | Geisterfinger und Filme (`?film=raum|werkstatt|roentgen`) |
| `src/formen.js`, `daten/`, `werkzeug/wesen_lesen.py` | Florians gesicherte Formen (`.eewesen`) als Ruhenetz mit ihren Loops |
| `film.cjs`, `stand.cjs`, `schau.cjs` | Filme, Standbilder, Prüfbilder mit Playwright |

## Grenzen

Die Haut ist nicht Florians Löser: Sie geht genau durch die Linien und ist für gleiche Linien immer gleich, bläst sich aber nicht
auf und kennt keine echten Kanten. Das Maul ist ein einfacher Kieferknochen. Geprüft nur in Chromium mit Software-Grafik
(Maus und simulierte Finger), nicht auf dem iPhone.
