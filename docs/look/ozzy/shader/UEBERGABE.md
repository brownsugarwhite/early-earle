# Übergabe: 47 Shader für Ozzy (20.11.2026, Runde 3)

Pläne: `docs/plans/2026-11-20-ozzy-shader.md` (Runde 1), `docs/plans/2026-11-20-ozzy-shader-runde-2.md` (Runde 2 und 3). Recherche:
`docs/research/2026-11-20-shader-recherche.md`. Offenes: `docs/plans/2026-11-20-ozzy-shader-was-bleibt.md`. Bilder:
`docs/progress/ozzy/shader/` (ein Blatt je Gruppe, `2026-11-20-runde-2-*.png`; Runde 3: `2026-11-20-runde-3-neu.png`; Runde 1:
`2026-11-20-alle-20.png` und einzelne).

## Wo und wie ansehen

- Zweig `claude/ozzy-shader` (von `claude/ozzy-maul`), Arbeitsbaum `.claude/worktrees/ozzy-shader`, Fenster **5219** (Eintrag
  `ozzy-shader` in `.claude/launch.json`). Nichts ist nach `claude/ozzy-maul` oder `claude/ozzy` zusammengeführt.
- In Ozzy: Menü (Feinregler) → Knopf **Shader**, dann die Tafel unten rechts: fünf Gruppen zum Auf- und Zuklappen, je Shader ein
  Knopf, darunter seine Zeile und seine Regler (Doppelklick setzt einen Regler zurück), oben **Bühne** (der Shader zeichnet seinen
  eigenen Grund). **⇧M** nächster Shader, **⌥⇧M** voriger. Adresse: `?shader=<name>` (z. B. `eineLinie`, `tropfen`).
- Bilder ohne Fenster: `node scripts/ozzy/shader-bilder.mjs <ordner> [name …]` aus `apps/editor` (startet für die Dauer des Laufs
  einen eigenen Vite auf 5219, falls dort keiner läuft; `NAME`, `ZOOM`, `GIER`, `NEIGUNG`, `WARTEN`, `BUEHNE=0`, `SEITE=1`, `EXTRA`).
  Blatt aus Bildern: `node scripts/ozzy/bildblatt.mjs <ziel.png> <spalten> <breite je Bild> <bilder…>` (die Breite gilt **je Bild**).
- Labor für Eine Linie ohne Fenster: `npx vite-node scripts/ozzy/linie-labor.ts <ordner> [schritte …]`.

## Die 47, in fünf Gruppen

- **Spider-Verse (17):** Comicdruck, Aquarell, Indrajal, Punk-Collage, Marker 2099, Tintenfleck, Da Vinci, Glitch, Earth-42,
  Multiplane, Noir, Cartoon, Neunziger, Sienkiewicz, Venom-Blitz, Pixel, LEGO.
- **Anime & Manga (7):** Anime, Manga, Flammenwesen, Dampfwesen, Shinkai, Ukiyo-e, Gouache.
- **Materialien (9):** Autolack, Haut, Knete, Earle-Haut, Earle-Schuppen, Flüssigglas, Opal, Diamant, Diskokugel.
- **Tiermuster (7):** Leopard, Tiger, Schlange, Elefant, Giraffe, Krokodil, Turing-Haut.
- **Effekte (7):** Eine Linie, Feuer, Tropfen, Rauch, Tinte, Staub, Ereignishorizont.

Was jeder tut, steht im Kopf seiner Datei (`voreinstellungen/`).

## Aufbau (`apps/editor/src/ozzy/shader/`)

- `kern.ts`: `ShaderKern` hält die Haut (glatte Anzeige des Werks, wie Solid), Ziele (folgen der Fenstergröße), gemeinsame Werte
  (`u`: Zeit, Auflösung, Schnitte, Licht, Kamera, Mitte, Radius, **halbe Ausdehnung `uHalb`**). Werkzeuge: `netz`, `flaeche`, `szene`,
  `paar` (Hin- und Herrechnen), `loeschen`. Alle Programme `RawShaderMaterial` mit GLSL ES 3.0.
- `glsl.ts`: Rauschen (Simplex, fBm, Curl, Voronoi), Farbe (Spektrum CIE, Schwarzkörper, ACES), Licht (Studio aus Softboxen),
  Druck (Raster, Schraffur, Papier).
- `daten.ts`: G-Puffer (Normale + Deckung, Lage + Tiefe), Rückseite, `G_LESEN`. `bildShader.ts`: ein Shader in einem Durchgang über
  dem G-Puffer (`bildVoreinstellung`), `WeicheMaske` (weichgezeichnete Deckung, `tWeich`).
- `stroemung.ts`: 2D-Navier–Stokes (Stam). `linieSim.ts` + `linie.worker.ts`: die eine Linie.
- `shaderHaut.ts`: wählt, führt die Zeit, legt das Bild über den Grund; `wahl.ts`: die Tafel (Gruppen `SHADER_GRUPPEN` in
  `kern.ts`). Einbau in `main.ts`: Suchwort `MATERIAL_SHADER`, Haken `__ozzy.shader(name, { buehne, regler, neu })`.

## Merke

1. Bewegte Shader halten das Bild am Laufen (`unruhig`), nur solange das Material „Shader“ zu sehen ist.
2. Kein Backtick in GLSL-Kommentaren; keine örtliche Variable, die wie eine Funktion aus `glsl.ts` heißt (`p`, `papier`, `schritt` …).
3. Größen, die zur Form passen sollen, aus ihrer Größe im Bild rechnen (Eine Linie: `formRadiusPx`; Tropfen: `formPx()` im Shader),
   Richtungen aus `uHalb` (Tiger: Streifen quer zur längsten Achse).
4. **Tropfen:** Jeder Tropfen hängt an der Unterkante direkt über ihm; die Suche läuft grob, an jeder Stufe scharf geprüft, und wo die
   weiche Maske etwas meldet, dazwischen fein (sonst springt sie über dünne Spitzen, und der Tropfen ist von Zeile zu Zeile ein
   anderer: Streifen). Der Ansatz ist eine weiche Vereinigung mit der Form (Abstand aus `tWeich`), seine Farbe geht in den Überzug über.
5. **Staub:** Teilchen als Vierecke je Teilchen (instanziert), im Vertex-Shader nach der Bewegung gestreckt und nach der Tiefe
   unscharf (gleiche Lichtmenge). Sie liegen im selben Ziel wie die Statue (Tiefe), Blättchen deckend, Funken addiert.
6. **Ereignishorizont:** Strahlengang bis 260 Schritte je Bildpunkt (der teuerste Shader); die Masse ist so klein, dass ihr runder
   Schatten hinter der Form bleibt.
7. Zeiten für Aufnahmen: `__ozzy.shader(name, { neu: true })` beginnt von vorn. Feuer (16 s), Staub (12 s), Tinte und Eine Linie
   brauchen Zeit: Feuer bei rund 4,3 s, Staub bei 3,3 s, Tinte bei 7 s, Eine Linie ab 10 s aufnehmen.
8. **Feuer prüfen:** `?feuerPruef=1` zeigt die Geschwindigkeit (grün steigt, rot sinkt), `?feuerPruef=2` die Quelle (rot) und die
   Temperatur (grün). Die Strömung rechnet mit y nach oben wie das Bild; Auftrieb `[Temperatur hebt, Rauch drückt]`, beim Feuer ist
   der Rauch warm (negativer zweiter Wert: er steigt mit).
9. **Flüssigglas:** Die Normale der Rückseite am selben Bildpunkt gehört nicht zur Austrittsstelle des Strahls; mit ihr wurde fast
    alles total reflektiert (schwarz). Der Austritt ist darum eine Linse (Spiegelbild der vorderen Normale längs des Blicks), und die
    Umgebung ist rundum hell (Hohlkehle), damit jeder gebrochene Strahl Licht trifft.
10. Die App hält nur drei Vorschau-Server; das Bildskript startet darum seinen eigenen Vite nur für den Lauf.
11. **Schuppen** (Schlange, Krokodil): regelmäßige Reihen in einer Ebene, je nach Ausrichtung der Fläche eine von drei
    (`schuppenEbene`, `schuppe2`, `platte2` in `tiere.ts`). Zylinder um eine Achse liefen an den Polen sternförmig zusammen, Zellen im
    Raum gaben ungleich große Schnitte. Das Muster wird an der Mitte jeder Schuppe gelesen (eine Farbe je Schuppe).
12. **Diamant:** Facetten entstehen durch Einrasten der Normale auf eine Kugel aus Richtungen (bis 200 Vergleiche je Facette, vier
    Facetten je Bildpunkt); das ist ein Schliff des Aussehens, keine ebenen Flächen im Raum. **Diskokugel:** Die Normale einer Kachel
    wird an ihrer Mitte gelesen (Ableitungen der Kachellage im Bild umgekehrt); die Ableitungen stehen darum vor jeder Verzweigung.
