# Übergabe (aktueller Stand)

> Diese Datei wird am Ende jedes Arbeitsblocks **überschrieben**: Wo stehen wir, was ist offen, was ist der nächste Schritt. Historie in Git.

**Stand:** 2026-10-08 früh (Nachtschicht, zweiter Block), Sitzung „Wesen-Werkstatt“ (Florians Mac, Branch `main`). Pläne: [`docs/plans/2026-10-07-wesen-werkstatt.md`](plans/2026-10-07-wesen-werkstatt.md) (v1) und [`docs/plans/2026-10-07-wesen-werkstatt-v2.md`](plans/2026-10-07-wesen-werkstatt-v2.md) (Lückenliste). **Zielsystem:** [`docs/look/wesen-refs/ZIELSYSTEM.md`](look/wesen-refs/ZIELSYSTEM.md) — gemessene Zieltabelle je Wesen aus Florians 19 Bildern (`docs/look/wesen-refs/`, Ausschnitte in `crops/`, Messwerkzeug `scripts/wesen/messen.mjs`). **Nur Florians Prompt und die 19 Bilder sind Referenz.** Florian will heute gemeinsam weitermachen (Look-Abnahme Rex).

## Milestone 1 (erster Block): das Maul als Lippenschnitt

Haut geschlossen vermascht, entlang der Maullinie aufgeschnitten (Rand doppelt, Maultasche mit Gaumen/Rachen/Boden), Kiefergewichte hart je Seite, Rig mit Öffnungsweite (`maul.oeffnung`), geschwungene Maullinie, Zähne mit Größenprofil auf dem Rand, Zunge als Körper, Zahnfleischsaum, Lippenband als Abstandsfeld. Details: Commit feb49b0 und `packages/creature/src/mesh/mundschnitt.ts`.

## Milestone 2 (dieser Block): Körper und Kopf nach den Bildern

Florian: „Es geht um die Körperform … der Tiger sieht nicht zu 1 % aus wie die Vorlage.“ Befund nach Bild 2 (Florians Skizze), 5, 9, 12, 14: alle Wesen sind **eine Masse**, der Kopf ein großes Volumen vorn oben, das Kinn hängt über der Brust, die Rückenlinie läuft von der Schulter in den Hinterkopf; der Rumpf ist klein (Rex: Kopf 0,6 H auf Rumpf 0,42 H und Beinen 0,18 H), Beine sind Säulen darunter.

- **Zwei Kopfarten, ein Grundblob** (`sdf/build.ts`):
  - *Kopf im Rumpf* (`hals.laenge` = 0 — Grundblob, Fisch, Aal, Drache): der Kopf ist das obere Vorderteil des Domes. `kopfImRumpf` formt das Dome-Profil mit Landmarken um die Maullinie: Schnauze (Oberkiefer, Höhe aus `maul.oberkiefer`), Kinn (Unterkiefer, `maul.unterkiefer`, `maul.biss`), Kehle (nur bei großem Kopf, `kopf.groesse`), Kopfband breiter/tiefer (`kopf.groesse`), Gesicht schmaler als die Schultern durch **Ei-Querschnitte** (`LoftStation.taper`, aus `kopf.schnauzeDicke` < 0,7), kantige Kiefer (`maul.kante`). Mit Standardwerten bleibt der Dome unverändert (PezenPez).
  - *Eigener Kopf* (`hals.laenge` > 0 — Rex, Katze, Hund, Giraffe): Kopf-Loft am Halsende. Neu bei **kurzem Hals** (≈ 0,05): Kopfmitte knapp über den Schultern, vorn über der Brust (`hals.ansatz` wirkt jetzt auch bei kurzem Hals), weite Verschmelzung (k = 1,2 · Kopfradius: Schulter → Hinterkopf ohne Kerbe), Schädel ohne Schnauze kugelig (Abfall erst ab u ≈ 0,8, Katze), Kieferkante nur an Schnauze und Kinn. `kopf.groesse` bis 3, `koerper.hoehe` ab 0,3.
- **Neigung** (`koerper.neigung`, jetzt bis 0,5 H): verschiebt die **waagerechten Scheiben** des Rumpfs nach vorn (vorher kippte der ganze Dome, der Bauch sank in den Boden). Standfläche bleibt flach, der Rücken wird zur geraden Schräge (Bild 2, Rex). Der Maulträger hat dafür eine **Mittellinie** (`MouthHost.center`): Maullinie, Mundwinkel, Augen und Gelenk werden von der Scheibenmitte aus gemessen.
- **Kopfmaße im Körperträger**: `MouthHost.headHeight` (Kinn … Scheitel) für Öffnungsweite, Linienschwung und Augengröße; `MouthHost.jawDepth` = Kinnband, damit Brust und Bauch beim Öffnen nicht mitschwingen (Kiefer-Auslauf 0,95 … 1,3 statt 1,6).
- **Lochmaul öffnet wieder** (war seit dem Lippenschnitt tot): das Spitzmund-Feld drückt die beiden Ränder **senkrecht zur Maullinie** auseinander (Halbkreisprofil, voll in der Mitte, null am Winkel; Haut läuft als Lippenring aus, Tasche mit ihrer Tiefe). Die alte radiale Weitung vom Zentrum konnte den Schlitz nicht öffnen, weil der Rand durch das Zentrum läuft. Kugelfisch: rundes O mit Lippenring; Giraffe: O/Bohne vorn an der Schnauze.
- **W-Lippe und Nasenspiegel** (Katze, Hund — Bild 8/9): `maul.wForm` hebt die Maullinie in der Mitte an und senkt beidseits Lappen (nur beim Keilmaul), darüber sitzt ein flacher Nasenknubbel auf der Schnauze (`nase`, Ellipsoid, folgt dem Oberkiefer). Tiger zu: W-Linie, Nase, zwei Fänge außen (`wesen-vergleich-vierbeiner-zu.png`). Farbe des Nasenspiegels folgt mit dem Material (K2).
- **Beinlage** `unterkoerper.beine.lage` (0 vorn unter der Brust — sitzende Katze; 1 hinten — Rex). Schwanz setzt in der echten Rückenfläche an.
- **Rechtwinkliges Gitter mit Verfeinerung** (`contourDual` `refine`, Bau `verfeinerung`) gebaut, **standardmäßig aus**: ganze Achsenstreifen werden feiner, bei Kopf ≈ Körperbreite 2,5 × Vertices und Zeit (Rex 88³: 1,6 → 4,4 s) für kaum sichtbaren Gewinn.
- **Werkzeuge**: Seitenansicht `seite` in Lab (Knopf „Seite“) und Harness (`EE_ANSICHT=seite`, Dateien `…-seite.png`); **Silhouetten-Werkzeug** `apps/game/src/lab/wesen/profil.test.ts` (ASCII-Seiten-/Vorderansicht aus dem SDF mit Lippen-, Winkel-, Augenhöhe — in Sekunden statt GPU-Render): `EE_PROFIL=keil,vierbeiner npx vitest run src/lab/wesen/profil.test.ts` in `apps/game`.
- **Vorlagen** Rex und Tiger neu aus den Landmarken (Rex: Rumpf 0,42, Kopf 2,15, Beine 0,8 hinten; Tiger: Rumpf 0,68, Kugelkopf 1,11, Maul tief im Kopf, Pfoten vorn). Bilder: `docs/progress/wesen-vergleich-{keil,vierbeiner}-auf[-seite].png`, Kontaktbogen `wesen-lab-kontaktbogen-auf.png`.

Prüfungen: `pnpm typecheck`, `pnpm lint`, Wesen-Tests 18/18, Game-Tests 256/256 (+1 Werkzeug übersprungen), GPU-Harness grün.

## Was noch nicht stimmt (nach Florians Bildern)

1. **Rex**: Gestalt stimmt jetzt (großer Kastenkopf, Keil, kompakter Rumpf, Beine, Schwanz als Schräge), aber der Rumpf ist noch ein Sack ohne Brust; Beine kaum sichtbar (Bild 12: dicke Säulen, Bauch darüber); Flügel/Stummelarme fehlen (eigene Elemente).
2. **Tiger**: Kugelkopf mit flachem Gesicht, W-Lippe, Nase und Fängen außen auf Ei-Rumpf mit Pfoten stimmt in der Anlage; Rumpf noch zu flach/breit (Bild 9: Kopf sitzt tiefer im Ei), Wangen/Brustwulst (weißer Kragen) fehlen, Streifen zu schwach, Nasenspiegel noch ohne eigene Farbe.
3. **Kopfprofile** weiter aus Bild 11/6/9 verfeinern (Braue, Schnauzenrücken, Wangen → evtl. `kopf.wangen`).
4. **Shading** zu glatt/„CG“ (Bögen: Airbrush, kühle gesättigte Schatten, Korn); Bauch-/Rücken-Linie hart.
5. **Rundmaul/Zwischenformen** (Kugelfisch Bild 4, Aal) und **Drache ohne Unterkiefer** nach den Umbauten im Kontaktbogen prüfen (Kopf im Rumpf: Kehle bei `unterkiefer` 0 = Öffnung am Hals).
6. **Augen**: bündiger Augapfel mit Ring, Lider/Blinzeln (K3) fehlen.
7. **Silhouetten-Überdeckung** (IoU) im Harness noch nicht gebaut (ZIELSYSTEM §3.8).
8. Ohren, Hörner, Flügel, dünne Schwänze, Spinnenbeine, Rückenschuppen: **eigene Elemente** (Florian), nicht Teil der Masse.

## Nächste Schritte

1. Mit Florian: Look-Abnahme Rex und Tiger (Bilder oben, Lab `?vorlage=keil&ansicht=seite`).
2. Rex-Brust/Beine (Bild 12), Tiger-Wangen und W-Lippe, Kehlfalte unter dem Kinn.
3. Kontaktbogen aller Vorlagen gegen die Bögen durchgehen (Grundblob, Loch, Aal, Drache), Fehler sofort beheben.
4. Shading nach den Bögen (Airbrush), Augen bündig mit Ring, Lider.
5. Silhouetten-IoU im Harness.

## Fallen / Hinweise

- **Nur Florians 19 Bilder** sind Referenz; nichts anderes öffnen oder suchen.
- Das Mesh ist **geschlossen** gebaut; `maul.oeffnung` = Öffnungsweite (Anteil der **Kopfhöhe**, in beiden Kopfarten); Harness `EE_MAUL=zu|auf|bau`.
- Kopfarten: `hals.laenge` 0 → Kopf im Rumpf; > 0 → eigener Kopf (kurzer Hals ≈ 0,05 setzt ihn auf die Schultern). Mundwinkel (`maul.winkel`) und Augenlage (`augen.lage`) sind Winkel um den **Träger** — beim Körperträger die Körpermitte, beim Kopf die Kopfmitte; Vorlagen entsprechend verschieden.
- Lofts: gerade Teile im Achsenmodus (Mittenversatz je Scheibe erlaubt), gebogene im Segmentmodus; `taper` = Ei-Verjüngung nach vorn; fast doppelte Nachbarpunkte werden verschmolzen, offene Enden ohne Kappe rund geschlossen.
- Culling nur außerhalb des Hüllquaders (`bd > 0`), sonst Risse. Stetigkeitstest `sdf/stetig.test.ts`.
- Kiefer-/Oberkiefergewichte: hart je Seite (`seite` aus dem Lippenschnitt), aus allen Knochen; Kiefertiefe aus `MouthHost.jawDepth`.
- Deskriptor-Puffer: 14 Floats (Spine 4, Region 4, Extra 3, Pucker 3).
- Lab per Browser-Klicks ist unzuverlässig (Referenzen veralten); Bilder immer über den Harness, Formen schnell über `profil.test.ts`.
- Vorschau der Leitung: `game-dev-http` (5174); Florians Server 5173 nicht anfassen.
