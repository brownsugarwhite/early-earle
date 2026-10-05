# Grundblobs: Look-Beweis Jelly, fest, Fell

> Stand 2026-10-05. Auftrag von Florian: „Kombiniere Shader, Mesh und Partikel um das optimalste Ergebnis zu erzielen. Gib alles!“ Vorlage: `refs/grundblobs-vorlage.png` (aus `assets/ref-florian/meshy/regular blobs.tiff`, Branch `meshy-test`): 3 Materialien × 13 Stufen (2 bis 8192), pro Stufe dieselbe Silhouette in allen Materialien, durchgehende Farbrampe.

## Ziel

Die 13 Grundformen in drei Materialien so nah an der Vorlage wie möglich, als Echtzeit-3D, das auf dem iPhone läuft. Die Grundform soll später auch die Tierthemen tragen (Florian: „Die Grundform der Blobs bleibt bei den Tierthemen mehr oder weniger erhalten“). Muster, Ohren, Flossen usw. kommen dann als Shader-Muster und Zusatzmodule auf dieselben 13 Körper.

## Vorgehen

1. **Vermessen statt schätzen.** Die 39 Blobs aus der Vorlage segmentieren: Silhouette, Höhe und Breite (Größenkurve), Augen (Lage, Größe, Anzahl), Farben (Grundton, Schatten, Licht) pro Stufe und Material. Ergebnis als JSON.
2. **Mesh aus der Silhouette.** Die Silhouette der festen Reihe ist die Grundform. Pro Bildzeile wird jeder Abschnitt der Silhouette zu einer Ellipse in die Tiefe (rund wie ein Körper, flache Standfläche), danach im Volumen geglättet (Abstandsfeld, Weichzeichnen, Marching Cubes, Taubin-Glättung). Gebacken pro Vertex: Umgebungsverdeckung (AO) und Dicke. Prüfung: Silhouetten-Überdeckung (IoU) gegen die Vorlage pro Stufe.
3. **Materialien als eigene Shader** (WebGL2/GLSL für den Beweis; Port nach TSL für das Spiel danach):
   - **Jelly:** echte Dicke pro Pixel (Rückseiten-Tiefe), Absorption nach Beer-Lambert (dünner Rand hell, Mitte satt), Brechung des Hintergrunds, dunklerer Innenkern, Fresnel, harte und weiche Glanzlichter, dünne dunkle Randlinie.
   - **Fest:** weiches Licht mit Wrap, gebackene AO, Satin-Glanz, leichte Randlinie, feine Oberflächenstruktur.
   - **Fell:** Schalen-Fell (instanziert, ein Draw Call pro Blob) mit spitzen Büscheln (Zellrauschen), Strichrichtung nach unten, Wurzel dunkel, Spitze hell, anisotroper Glanz (Kajiya-Kay), kein Fell auf den Augen.
   - **Augen:** schwarze Ellipsen als SDF im Shader, in jeder Größe scharf; Blinzeln.
4. **Partikel:** Bläschen im Jelly (werden mitgebrochen), Tropfen, Flusen und Staub beim Hüpfen.
5. **Animation:** Idle-Wackeln (Jelly stark, fest wenig, Fell schwingt nach), Blinzeln, Hüpfen mit Squash and Stretch auf Tippen.
6. **Beweis:** Vergleichsbild Vorlage neben Render (gleiche Ansicht, gleicher Maßstab) in `docs/progress/`, IoU-Tabelle, Artefakt zum Drehen auf dem iPhone mit fps-Anzeige. Florian beurteilt.

## Nicht Teil davon

- Kein Umbau am Spielcode (`apps/game`, `packages/*`). Der Beweis liegt eigenständig unter `docs/look/grundblobs/`.
- Kein Meshy: Die Grundformen sind einfach genug, um sie exakt aus der Zeichnung zu erzeugen. Meshy bleibt für komplexe Tiere.

## Risiken

- Fell-Schalen kosten Füllrate; auf dem iPhone mit 36 Wesen nur mit LOD (weniger Schalen bei kleinen Blobs). Wird im Artefakt mit fps gemessen.
- Jelly braucht zwei Zusatzpässe (Hintergrund und Rückseiten-Tiefe). Für alle Jelly-Blobs zusammen, nicht pro Blob.
- In der Cloud gibt es nur SwiftShader; die echte Leistung zeigt erst das iPhone.
