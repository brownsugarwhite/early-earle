# Übergabe: 20 Shader für Ozzy (20.11.2026)

Plan: `docs/plans/2026-11-20-ozzy-shader.md`. Recherche: `docs/research/2026-11-20-shader-recherche.md`. Offenes:
`docs/plans/2026-11-20-ozzy-shader-was-bleibt.md`. Bilder: `docs/progress/ozzy/shader/` (alle 20 auf einem Blatt, dazu Eine Linie,
Ereignishorizont, Staub, Flüssigglas einzeln und die Wahl im Menü).

## Wo und wie ansehen

- Zweig `claude/ozzy-shader` (von `claude/ozzy-maul`), Arbeitsbaum `.claude/worktrees/ozzy-shader`, Fenster **5219** (Eintrag
  `ozzy-shader` in `.claude/launch.json`). Nichts ist nach `claude/ozzy-maul` oder `claude/ozzy` zusammengeführt.
- In Ozzy: Menü (Feinregler) → Knopf **Shader**, dann die Tafel unten rechts: zwei Gruppen, je Shader ein Knopf, darunter seine
  Zeile und seine Regler (Doppelklick setzt einen Regler zurück), oben **Bühne** (der Shader zeichnet seinen eigenen Grund).
  **⇧M** nächster Shader, **⌥⇧M** voriger. Adresse: `?shader=<name>` (z. B. `eineLinie`, `horizont`).
- Bilder ohne Fenster: `node scripts/ozzy/shader-bilder.mjs <ordner> [name …]` aus `apps/editor` (startet für die Dauer des Laufs
  einen eigenen Vite auf 5219, falls dort keiner läuft; `NAME`, `ZOOM`, `GIER`, `NEIGUNG`, `WARTEN`, `BUEHNE=0`, `SEITE=1`, `EXTRA`).
  Blatt aus Bildern: `node scripts/ozzy/bildblatt.mjs <ziel.png> <spalten> <breite> <bilder…>`.
- Labor für Eine Linie ohne Fenster: `npx vite-node scripts/ozzy/linie-labor.ts <ordner> [schritte …]` (`LINIE_BIEGEN`,
  `LINIE_WACHSEN`, `LINIE_QUER` überschreiben die Werte der Rechnung).

## Die 20

Spider-Verse: Comicdruck (Miles), Aquarell (Gwen), Indrajal (Pavitr), Punk-Collage (Hobie), Marker 2099 (Miguel), Tintenfleck
(Spot), Da Vinci (Vulture), Glitch (Anomalie), Earth-42 (Prowler, Beyond), Multiplane (Beyond). Frei: Eine Linie, Feuer, Tropfen,
Rauch, Tinte, Flüssigglas, Opal, Staub, Ereignishorizont, Turing-Haut. Was jeder tut, steht im Kopf seiner Datei.

## Aufbau (`apps/editor/src/ozzy/shader/`)

- `kern.ts`: `ShaderKern` hält die Haut (glatte Anzeige des Werks, wie Solid), Ziele (folgen der Fenstergröße), gemeinsame Werte
  (`u`: Zeit, Auflösung, Schnitte, Licht aus der Sicht, Kamera). Werkzeuge: `netz` (Haut in ein Ziel), `flaeche` (Bild über die
  Fläche), `szene`, `paar` (Hin- und Herrechnen), `loeschen`. Alle Programme `RawShaderMaterial` mit GLSL ES 3.0.
- `glsl.ts`: Rauschen (Simplex, fBm, Curl, Voronoi), Farbe (Spektrum CIE, Schwarzkörper, ACES), Licht (Studio aus Softboxen),
  Druck (Raster, Schraffur, Papier), Netz-Vertex mit Spiegelschnitt und Schnitt beim Einrasten.
- `daten.ts`: G-Puffer (Normale + Deckung, Lage + Tiefe), Rückseite, `G_LESEN` (weiche Deckung, Kanten, `lageAusTiefe`).
- `bildShader.ts`: ein Shader in einem Durchgang über dem G-Puffer (die meisten Spider-Verse-Looks), `WeicheMaske`.
- `stroemung.ts`: 2D-Navier–Stokes (Stam) für Feuer, Tinte, Rauch. `linieSim.ts` + `linie.worker.ts`: die eine Linie.
- `shaderHaut.ts`: wählt, führt die Zeit, legt das Bild über den Grund; `wahl.ts`: die Tafel. Einbau in `main.ts`: Suchwort
  `MATERIAL_SHADER`, Haken `__ozzy.shader(name, { buehne, regler, neu })`.

## Merke

1. Bewegte Shader halten das Bild am Laufen (`unruhig`), nur solange das Material „Shader“ zu sehen ist. Marker und Flüssigglas
   stehen still und zeichnen nur bei Änderungen.
2. Kein Backtick in GLSL-Kommentaren (die Shader stehen in Template-Strings).
3. Eine Linie: Die Karte (Helligkeit, Deckung, Tiefe in 16 Bit) kommt asynchron zurück (`readRenderTargetPixelsAsync`); die nächste
   geht erst raus, wenn der Worker geantwortet hat. Mitnahme beim Drehen über Tiefe und Kamera (exakt, auch bei Sprüngen), Kreuzungen
   löst 2-opt. Abstand skaliert mit der Größe der Form im Bild. Prüfhilfen: `?linieKarte=1`, `?linieMit=0`.
4. Zeiten für Aufnahmen: `__ozzy.shader(name, { neu: true })` beginnt den Shader von vorn (Feuer und Staub laufen in Zyklen).
5. Die App hält nur drei Vorschau-Server; am 20.11. liefen 5194, 5205, 5213. Das Bildskript startet darum seinen eigenen Vite nur für
   den Lauf.
