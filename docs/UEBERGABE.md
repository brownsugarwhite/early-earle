# Übergabe (aktueller Stand)

> Diese Datei wird am Ende jedes Arbeitsblocks **überschrieben**: Wo stehen wir, was ist offen, was ist der nächste Schritt. Historie in Git.

**Stand:** 2026-10-14 abends (Florian unterwegs; „weiter nach Plan“, „Beweis 4 bitte auch vollenden“). **Alle fünf Beweise der Phase 0 sind gebaut**, Zusammenfassung unten bei „Nächster Schritt“. **Beweis 4 (Look live) ist vollendet** ([`docs/research/2026-10-14-beweis4-look.md`](research/2026-10-14-beweis4-look.md)): Tiger-Kopf mit Kastenschnauze, heller Schnauze (Gesichtsmaske auf dem Käfig), Nase oben mit Scharte, dunkler Lippenlinie, gelben Schlitzaugen mit Lidring, Wangenzacken, Ohren, Zähnen mit Verlauf; Muster, Nase und Augen bleiben beim Haps auf der Haut (Ruhelage als Attribut `eeRest`). Vergleichsbild `docs/progress/editor/vergleich-tiger-kopf.png` (Bogen | zu | Haps | ganz), **Florians Urteil steht aus**. Ehrlich: Kinn, Augen im Mesh, Stirnzeichnung, Schnurrhaare und Mähne fehlen (Phasen 2/4); das Tiger-Maul hat 76/144/346 Durchdringungen bei 0/50/100 % (Lippe am kleinen Kappenfeld der Kastenfront; Beweis 2 gilt für den Kasten noch nicht). Der **Plan „Wesen-Editor 2“** ist freigegeben: [`docs/plans/2026-10-13-wesen-editor-2.md`](plans/2026-10-13-wesen-editor-2.md). **Beweis 1 (Kern) bestanden** ([`docs/research/2026-10-13-beweis1-kern.md`](research/2026-10-13-beweis1-kern.md), Nachtrag am Ende). **Beweis 3 (Teil nahtlos) bestanden** ([`docs/research/2026-10-14-beweis3-teil.md`](research/2026-10-14-beweis3-teil.md)): Rex-Säulenbeine als Ausstülpung eines 2×2-Felds (Blender-Extrude; kein Punkt entfernt, keine Brücke, nur Vierecke), 0 Durchdringungen bei −35/0/+35°, Umbau 116 ms, Zebra ohne Knick; angesteckt als eigene Röhre. Offen: Beine an runden Bäuchen (Kugel: Schulter faltet, braucht Feld am Boden), Knochenkette, Teil-Bibliothek. **Beweis 2 (Maul mit Haps) gebaut und für drei von vier Lagen bestanden** (Florian zum Rex-Haps: „scheint für mich erstmal zu passen“): [`docs/research/2026-10-13-beweis2-maul.md`](research/2026-10-13-beweis2-maul.md). Editor-Tab „kern“ (`?versuch=kern&wesen=kugel|rex|langhals|ueberhang|tiger`, `&look=earle&palette=…`, `&maul=vorn|unten|hals&oeffnung=0…1&kaefig=1`, `&beine=verschmolzen|angesteckt&schwung=35&zebra=1`, `&stil=feuer|gas|fell`), Bilder `docs/progress/editor/kern-*.png` und `kern-maul-*.png`.

**Beweis 2 in Zahlen:** Maul als Kantenpfad im selben Käfig (Schleife einrasten je Ring, Schlitz, Tasche mit Vorhang, nur Vierecke plus zwei Dreiecke, Käfig geschlossen), Kiefer als Käfig-Pose (≈ 3 ms), Umbau 140 ms (≤ 200 ✓), Lippe ≤ 1,3 px, Bohne mit hellem Lippenband und maroon Rachen (`kern-maul-rex-vorn-auf.png`). Kugel, Rex vorn und Rex unten: **0 Durchdringungen bei 0/25/50/75/100 %** ✓ (Lippe unter der Spitze = Überbiss, Linsenrichtung geglättet). Langhals bis zum Hals (Drache): 2424, nicht erfüllt (Taschenreihen verdrillen sich am Halsansatz; braucht die Rachenlinie als Griff). Rückfall aus Plan 13 nicht nötig.

**Ehrlich offen:** Beweis 1: Front/Top-Widersprüche entscheidet der Kern still für die kleinere Breite (Rex Front 11 px, Langhals Top 16 px), Ente als Form nur mit Teilen, Hals-Übergang ohne Überblendung, Reifen kein 3D-Griff, kein Worker, dichte LU. Beweis 2: Hals-Lage (Rachenlinie als Griff), Kehl-/Nackenkette, Zähne, Zunge, Kiefer getrennt, Zug am Seitenumriss mit Maul (heute Umbau ≈ 150 ms).

**Kern des Plans (Kurzfassung in Abschnitt 0 des Plans):**
- Ein **Subdivision-Käfig** (Spiegelung, halbscharfe Falten) ist die einzige Wahrheit je Wesen. Florians Kurven (Seitenumriss, Spanten als Reifen, Kantenlinien, Wirbelsäule, Maullinie) sind **Griffe** auf diesem Körper; einmal ableiten, dann nur noch bearbeiten.
- Bausteine mit Automatik: Maul überall am Kopf (Längsschleife einrasten, Tasche, Kiefer-Rig, Fressen = Knochen + Körper-Blendshape), Zähne, drei Augenarten mit sechs Zuständen, Teile aus einer Bibliothek (verschmolzen oder angesteckt), Klingen (Fell, Mähnen, Kämme, Federn, Flossen, Flügelhaut), Zonen als Vektorformen im Ptex-Atlas, Stile fest/Jelly/Fell/Feuer/Gas, Posen als Käfig-Deltas, Export ins Spiel.
- Earle-Look (`packages/render/src/creature2`) von der ersten Sekunde an; eine Szene mit vier Kameras statt SVG-Editoren.
- UI (Abschnitt 9): Stamm mit neun Stufen, Bühne + drei Blätter (Layouts „Riss“ und „Bühne“), Tafel rechts, Glas-Dock; Ranken, Lupe mit Ringtext (drei Rollen), Reifen, Kieferknopf, Fächer; Illustrator in den Blättern, Blender auf der Bühne; neutrale Bühne (Papier/Nacht/Brett).
- Plattform: Electron **und** Browser, eine Codebasis, Rechenkern in Workern/Compute.

**Nächster Schritt: Phase 0 fortsetzen** (Plan 11.1):
1. ~~Kern-Tempo und Treue~~ bestanden. Rest: Überhang als Teil (→ 3), Reifen als Griffe, Hals-Übergang, Worker, dünn besetzte Zerlegung.
2. ~~Maul mit Haps~~ drei von vier Lagen ✓ (vorn, unten, Kugel), Hals ✗ (Rachenlinie als Griff). Danach Zähne, Zunge, Kiefer getrennt.
3. ~~Teil nahtlos~~ Rex ✓ (Ausstülpung); Kugel offen. Florian (14.10.): Kiefer getrennt/Überbiss ist ihm wichtig („Unterkiefer läuft in den Oberkiefer rein“), bleibt Phase 2.
3. Teil nahtlos (Rex-Säulenbein verschmolzen und angesteckt, ±35°).
4. ~~Look live~~ vollendet (Tiger-Kopf mit Kastenschnauze, Zahnverlauf, Muster ohne Schwimmen); Urteil offen. Nicht gebaut: Zonen-Atlas (Phase 4), Augen im Mesh (Phase 2).
5. ~~Feuer, Gas, Fell-Blob~~ gebaut ([`docs/research/2026-10-14-beweis5-feuer-gas-fell.md`](research/2026-10-14-beweis5-feuer-gas-fell.md)): Klingen als geteilte Käfige, Feuer/Gas-Bändermaterial, Wehen als Pose; Standbilder und 3-s-Schleifen `docs/progress/editor/kern-stil-kugel-<stil>.png|.webm`. **Florians Urteil steht aus** (Einschätzung: Feuer ja, Gas und Fell zweite Runde).

**Phase 0 ist damit durchgebaut.** Nächster Schritt: Florians Blick auf Beweis 4 (Tiger-Kopf) und sein Urteil zu Beweis 5 (14.10.: „ganz gut, treffen es noch nicht wirklich“ → zweite Runde mit der Liste in der Beweis-5-Doku: wellige geschichtete Feuerbänder, Zwiebelkörper, weniger Zungen; Gas-Schwaden als eigene Locken, Wirbel im Körper, runde Bläschen; weichere, überlappende, gemalte Fellbüschel); dann Entscheidung, ob Phase 1 (Kern breit: Worker, Reifen-Griffe, Bogen-Import, Aufräumen der Versuche) beginnt. Florian (14.10.): Kiefer getrennt/Überbiss („Unterkiefer läuft in den Oberkiefer rein“) ist ihm wichtig, bleibt Phase 2.
5. Feuer, Gas, Fell-Blob (Stufe 7 des Bogens, Standbild und 3-s-Schleife).

Scheitert 1 oder 2, wird nicht breit gebaut (Rückfälle in Plan 13).

## Stand je Bereich

| Bereich | Stand |
|---|---|
| **Plan** | freigegeben; Bestandsaufnahmen (Code, Look, Recherchen, Spiel-Pipeline) und UI-Entwurf sind eingearbeitet |
| **Editor-Gerüst** | bleibt: Layout mit Federn, `ansicht2d`, Blender-Navigation, `Renderer3D` (jetzt mit Earle-Material und `@ee/render`), Electron, Bibliothek, Undo, Tastatur, E2E-Muster |
| **Bauwege** (`packages/shape/src/versuch/`, Editor-Tabs creation/wirbelsäule/schnitte/rund) | Versuche, Wissen; werden nach dem Entscheidungstest entfernt. Vorher herauslösen: Poisson/CDT (`aufblasen.ts`, `dreiecke2d.ts`), `vereinigeNetze`, Surface Nets/Taubin/Felzenszwalb (`schnittLoft.ts`), `strahlRaster`, Kiefer-Mathe (`kiefer.ts`), Zahnmodell (`zaehne.ts`), Prüfstand (`umriss3d.ts`, `pruefen.ts`, Vorlagen) |
| **Kern (neu)** | `packages/shape/src/{kaefig,subdivision,loeser,kern}/` (`@ee/shape/kern`): Halbkanten-Käfig, Catmull-Clark als Matrix mit Falten (Orakel-gleich), Grenzflächen-Maske, LU-Löser mit Ausgleich und Laplace-Glättung, Röhre mit Kappen, Ableitung aus Seitenumriss + Silhouettenbreiten + Querschnitten (Front-Lappen/Spanten, Längsfalten, Umparametrisierung je Schleife), Griff Seitenumriss, **Maul** (`kern/maul.ts`: Pfad, Schlitz, Tasche, Vorhang, Kiefer-Pose), Deskriptoren fürs Material; Tests `beweis1`, `beweis2`, `varianten`, `diagnose`, `querschnitt`, `maul.diag` |
| **Look** | `creature2` im Editor-Tab „kern“ (`apps/editor/src/three/wesenLook.ts`, `Renderer3D.setzeWesen/setzeFeuer/setzeZaehne`): Paletten, Zonen, Ruhelage-Attribut, Gesichtsmaske (helle Schnauze), Nase/Scharte, Lippenlinie, Lidring, Zähne mit Verlauf, Feuer/Gas-Bänder, Fell über Büschel; fehlen Zonen-Atlas, Augen im Mesh, Augen-Zustände X/Sichel/Spirale |
| **Spiel** | Brett zeichnet Prototyp-Körper; kein Editor-Wesen, keine Morph-Ziele; Weg in Plan 10 |

Zum Branch: `claude/editor-grundlayout`, gepusht. Nicht von uns: `assets/fonts/Hippie Movement.otf` (unverfolgt, nicht committen).

## Prüfen

- `pnpm typecheck`, `pnpm test`, `pnpm lint` (Kern allein: `npx vitest run src/kern --reporter=verbose --silent=false` in `packages/shape`)
- E2E mit echter GPU: `E2E_PORT=5191 EE_GPU=1 pnpm --filter @ee/editor e2e`
- Editor: `pnpm editor`, Web-Modus `editor-web` (Port 5180); Bilder: Web-Modus auf 5192 starten, `MAUL=1 BEINE=rex STIL=1 TIGER=1 EDITOR_URL=http://localhost:5192 node apps/editor/scripts/kern-bilder.mjs` (ohne die Variablen nur die Körper; `-` als Wesenliste = nur die Varianten; `STIL` nimmt auch Videos auf); Vergleichsbild `AUS=… node apps/editor/scripts/maul-vergleich.mjs <bogen> <render …>`
