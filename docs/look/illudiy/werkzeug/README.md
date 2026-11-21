# Werkzeug: Nachbau, Prüfung, Seite, Video

Alle Skripte laufen mit Node aus dem Repo (nutzen `sharp` und `playwright` aus `node_modules`). Zwischenstände landen in
`arbeit/` (nicht im Repo). Quelle ist immer `../illudiy-original.webp`.

| Schritt | Befehl | Ergebnis |
|---|---|---|
| Bereiche verfolgen | `node vectorize.mjs` und `node vectorize_band.mjs` | `arbeit/vec.json`, `arbeit/vec_band.json` |
| Rand als eine Schleife | (siehe Kommentar in `build.mjs`: `vec_rim.json` = größte Rand-Schleife aus `vec_band.json`) | `arbeit/vec_rim.json` |
| Subpixel verfeinern | `node refine.mjs` | `arbeit/ref.json` |
| Kanten messen | `node lines.mjs` | Liste aller Geraden mit Winkel und Restfehler |
| Verläufe fitten | `node fitgrad.mjs` | Stopps für Rand hell/dunkel, Weiß, D |
| Modell bauen | `node build.mjs` | `arbeit/model.json`, `arbeit/logo.svg` |
| Prüfen | `node diff.mjs arbeit/logo.svg vergleich` und `node hot.mjs vergleich 60` | Kennzahlen, Fehlerbild, Hotspots |
| Seite bauen | `node gen.mjs` | `../illudiy-intro.html` (aus `seite/template.html`, `seite/engine.js`, `../illudiy-modell.json`) |
| Video | `node video.mjs A,B,K ../video` | MP4 mit 60 fps (ffmpeg nötig) |
| Sprünge suchen | `node jumps.mjs A` | Bild-zu-Bild-Änderung, Ausreißer |

Nach einem neuen Modell: `arbeit/model.json` nach `../illudiy-modell.json` kopieren und `seite/model.js` neu schreiben
(`window.ILLUDIY_MODEL=<json>;`), dann `node gen.mjs`.
