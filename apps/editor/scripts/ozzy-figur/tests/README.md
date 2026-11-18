# Ozzy-Figur: Tests vom 18.11.2026

Proben zum Plan [`docs/plans/2026-11-18-ozzy-figur.md`](../../../../../docs/plans/2026-11-18-ozzy-figur.md). Sie lesen Florians
SVGs aus `docs/look/ozzy-figur/vorlagen/` und schreiben ihre Ausgaben in den **aktuellen Ordner** (darum aus einem leeren Ordner
starten, z. B. `/tmp/ozzy-test`). Kein Dev-Server nötig; Chromium/WebKit kommen aus `@playwright/test` des Editors.

```bash
T=<repo>/apps/editor/scripts/ozzy-figur/tests
node $T/parse.mjs                 # parsed.json: alle Pfade als kubische Stücke
node $T/korrespondenz.mjs         # Anker je Teil und Ansicht (g = glatt, E<Winkel> = Ecke, * = Schlusslinie)
node $T/rand.mjs                  # kleinster schwarzer Rand um jedes Weiß-Teil
node $T/render.mjs                # vorlagen-normal|bunt.png (MODI=normal,bunt,anker; S=Maßstab)
node $T/test-kopf.mjs             # kopf-L|W|S.svg: Kopfdrehung Logo → Profil, drei Interpolationsarten
ART=W BUNT=1 node $T/test-kopf-nah.mjs kopf.svg   # nah, Teile farbig
node $T/test-koerper.mjs          # koerper-drehung.svg: Körper vorn → Seite, Beine als Punkte im Raum
node $T/png.mjs a.svg b.svg       # SVG → PNG
node $T/szenen.mjs                # szenen.json für den Renderer
MOTOR=chrome|webkit node $T/sdf/lauf.mjs   # Distanzfeld-Renderer: exakt/flüssig/verdeckt, Vergleich mit dem Logo, Tempo
```

- `morph.mjs`: Einlesen, Säubern (Schlusslinie < 0,1 wird mit dem Startanker verschmolzen), Morph (L linear, W Griffe als Winkel und
  Länge, S Ähnlichkeit je Teil), formtreuer Ankerabgleich (`abgleichen`, teilt ein Stück per de Casteljau).
- `sdf/fluessig.js`: Test-Renderer (WebGL2). Jedes Teil bekommt ein eigenes Abstandsfeld mit Vorzeichen (Strecken mit MIN-Mischung,
  Vorzeichen per Schablone), im Bildpass weich vereinigt. Die Suche nach Außenkanten läuft hier noch auf dem Prozessor (Testabkürzung).
- Ergebnisse und Bilder: `docs/progress/ozzy-figur/2026-11-18-t*.png`, Auswertung im Plan, Abschnitt 3.
