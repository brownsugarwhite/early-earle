# Blender-Bibliothek

> Stand 2026-09-30. Datei: [`assets/blender/early-earle-bibliothek.blend`](../assets/blender/early-earle-bibliothek.blend) (+ Katalogdatei `blender_assets.cats.txt` daneben). Neu bauen: `pnpm assets:blender`. Werkzeuge: [`tools/export3d/`](../tools/export3d) (Export aus dem Spiel) und [`tools/blender/`](../tools/blender) (Bau der .blend, Add-on).

Alles, was das Spiel in 3D erzeugt, liegt hier als saubere Blender-Datei: die Map (ein Ausschnitt der unendlichen Ebene mit allen zehn Autorenwelten) und alle Map-Assets, alle Wesen in jeder Stufe mit Rig, Materialien und Modulen, REX, das Spielfeld, alle Module und alle Paletten. Die Daten kommen **aus den echten Generatoren des Spiels** (TypeScript, dieselben Funktionen, die im Browser laufen) — nichts ist nachgebaut. Dazu der Rückweg: **eigene Wesen in Blender bauen und ins Spiel exportieren**.

## 1. Öffnen und zurechtfinden

Blender 5.1 (oder neuer). Datei öffnen; oben rechts die **Szene** wählen:

| Szene | Inhalt |
|---|---|
| **Wesen** | alle Arten in jeder Stufe, die das Spiel zeigen kann (Schlange, Retriever, Maus, Giraffe ab 4; REX, Ente ab 5; Elefant ab 6 — jeweils bis Stufe 12, Tjorizo-Palette), die Blob-Linien aller vier Zonen (Stufe 1–12) und die eigenen Wesen aus `content/genome/custom/`. Reihen = Arten, Spalten = Stufen, beschriftet. |
| **Map** | ein **endliches Fenster der unendlichen Ebene** (ADR 0002): der Streifen längs der Autorenroute, Level 1–100, samt Seitenband (± Pfadbreite, ≈ 144 × 448 Einheiten) — je Welt eine Collection mit Terrain, Bäumen (Kronen, Stämme, kahle Bäume), Requisiten, Müll und Kronenpunkten (auch die Nachbarwelten im Seitenband) —, der Riesenbaum mit seinen vier Geschwistern, der Levelpfad (Knoten „Level 001“ … bis kurz hinter 100, Punkte), die Wahrzeichen-Plätze (Riesenbaum, Felsen, Ruinen, Sümpfe) und daneben die **Vorlagen** (jede Kronen- und Stammform, kahler Baum, Requisiten-Teile, Becken, Kuh). Kameras: „Kamera · Welt 01 Flechtenbaum“ … (Höhe, Abstand, Blickpunkt und Brennweite wie im Spiel, über einem Knoten des Welt-Abschnitts) und „Kamera · Ebene (Übersicht)“. |
| **Spielfeld** | die Elemente-Schau des Grid-Labs: Plateau, Platten (Stein, verdorrt, tief verdorrt, Öl) und jedes Element (Schrott, Schrotthügel, Käfig, Pfeiler, Fäule, Giftfass, Nebel, Spore, Portal, Strömung, Quelle, Zaun, Busch, Ziel-Totem …) aus den neun **Grundformen**. |
| **REX** | der Guide-Dino mit 22 Knochen; daneben „REX · mit Zubehör“ (Schwindelkranz, Schweißtropfen, Funkeln sichtbar). |
| **Module** | alle Module nach Slot (Augen, Hörner, Ohren, Rüssel & Nasen, Zähne & Schnäbel, Flügel, Beine, Schweife, Kämme) — die Blender-Module aus `content/genome/assets` und die im Code gebauten (Ohrlappen, Schnabel, Rüschen, Seilschwanz …), beschriftet. |
| **Materialien** | alle Paletten als Farbstreifen (Welten, Zonen, Genom/Blob-Linien, Arten, Muster, REX, Brett, Riesenbaum, UI-Tokens; Hex-Werte in den Eigenschaften) und Musterkugeln (sechs Materialarten, zehn Muster). |
| **Eigenes Wesen** | die Vorlage zum Bauen eigener Wesen mit Live-Vorschau (siehe Abschnitt 6). |

Im **Asset-Browser** (Editor-Typ „Asset Browser“ → „Aktuelle Datei“) liegt alles in Katalogen: `Wesen/<Art>`, `Wesen/Eigene Wesen`, `Map/Vegetation`, `Map/Requisiten`, `Map/Müll`, `Map/Riesenbaum`, `Spielfeld/Grundformen`, `Spielfeld/Elemente`, `REX`, `Module/<Slot>`, `Materialien/Wesen`, `Materialien/Muster`, `Materialien/Module`, `Eigenes Wesen` — mit Vorschaubild, Beschreibung und Schlagworten (Art, Stufe, Zone). Tipp: `assets/blender` in den Einstellungen als Asset-Bibliothek eintragen, dann stehen die Assets in jeder Datei zur Verfügung (die Katalogdatei muss neben der .blend liegen).

**Ansicht:** Die Materialien nutzen „Shader to RGB“ (nur EEVEE): Ansicht auf **Rendered** oder **Material Preview** stellen. Farbtransformation steht auf **Standard** — sonst verschieben sich die Palettenfarben. Der Text **LIESMICH** (Text-Editor) fasst alles kurz zusammen und enthält das Bauprotokoll.

**Eigenschaften:** Jedes Objekt/jede Collection trägt die IDs des Spiels als eigene Eigenschaften (`ee_art`, `ee_stufe`, `ee_zone`, `ee_material`, `ee_welt`, `ee_level`, `ee_modul` …) — Objekt-Eigenschaften → „Benutzerdefinierte Eigenschaften“.

## 2. Wie die Wesen gebaut und gerigged sind

Im Spiel ist ein Wesenkörper eine **glatte Vereinigung von Kugeln** (Signed Distance Field, Smooth-Min). Die Mesh-Variante (iPhone, Spielfeld) vernetzt diese Form einmal (`meshBody`: Surface Nets) und hängt jeden Vertex an **bis zu vier Kugeln** — mit Gewichten danach, auf welchen Kugeloberflächen er liegt (weich über die Verschmelzungsnaht). Beim Posen verschiebt das Spiel jede Kugel und dreht sie um ihre Mitte (Ketten: Hals, Rüssel, Schlangen-Wirbelsäule).

Genau das ist in Blender ein normales Rig:

- **Ein Deform-Knochen je Kugel**, Knochenkopf = Kugelmitte. Die **Vertex-Gruppen** heißen wie die Knochen und tragen die **Gewichte des Spiels** (keine automatisch berechneten Gewichte). Posen deformiert das Mesh deshalb wie im Spiel.
- **Namen** (deutsch, mit Blenders Spiegel-Endungen `.L`/`.R`; links = +X = die linke Seite des Tiers):

| Knochen | Rolle im Spiel |
|---|---|
| `Wurzel` | Boden unter dem Körper (bewegt alles, auch die IK-Ziele) |
| `Körper`, `Hinterteil`, `Rumpf.01`, `Flanke.L/.R` | Rumpfkugeln (Anker für Hüften und Flügel) |
| `Halsansatz` → `Hals.01` … → `Kopf` | Halskette: der Kopf führt beim Drehen, der Hals biegt sich im Bogen |
| `Schnauze`, `Backe.L/.R` | fest am Kopf |
| `Unterkiefer` | dreht um das Kiefergelenk (REX: Maul auf) |
| `Rüssel.01` … | Rüsselkette (Elefant: schwingt, rollt sich ein) |
| `Schwanz.01` … | Schwanzkugeln (REX, Ente) |
| `Kopf` → `Wirbel.01` … | Schlange: der Kopf führt, die Wirbelsäule folgt |
| `Hüfte.vorn.L` → `Knie.vorn.L` → `Fuß.vorn.L` | geknetete Beine (Vierbeiner: `vorn/hinten`, Zweibeiner: `Fuß.L/.R`) |
| `IK-Fuß.vorn.L` … | IK-Ziel je Fuß (im Spiel setzt der Schrittzyklus die Füße, das Knie löst 2-Knochen-IK) |
| `Lappen.01` …, `Basis` | Blob-Kugeln |

- **Knochensammlungen** (Armature → Knochensammlungen): Wurzel, Körper, Kopf, Hals, Rüssel, Schwanz, Wirbelsäule, Beine, IK — einzeln ein-/ausblendbar.
- **Posen ausprobieren:** Rig wählen → Pose-Modus. `Körper` verschieben = Füße bleiben am Boden (IK), `Wurzel` = alles wandert, `Hals.01`/`Kopf` drehen = Hals biegt sich, `Unterkiefer` drehen = Maul auf, `IK-Fuß…` ziehen = Schritt.
- **Kugeln und Gelenke:** Die SDF-Kugeln selbst liegen (ausgeblendet) in „<Wesen> · Kugeln“: Kugel-Empties mit Anzeigegröße 1 und **Skalierung = Radius**. Hüften (Würfel), Halsansatz (Kegel), Rüsselansatz, Maul (Pfeil) und Kiefergelenk liegen daneben in „<Wesen> · Gelenke“. Alle hängen an ihren Knochen, bewegen sich also mit der Pose.
- **Sockel und Module:** Jedes Modul sitzt auf einem Sockel-Empty („<Wesen> · Sockel Auge L“), das die **Modul-Collection instanziert** — an genau dem Rahmen, den das Spiel berechnet (Oberflächenpunkt der Ankerkugel entlang Theta/Phi, Normale, Neigung, Drehung, Versenkung, Spiegelung, Skalierung). Der Sockel hängt am Knochen seiner Ankerkugel. Modul tauschen: Sockel wählen → Objekt-Eigenschaften → Instanzieren → Collection. Die Farben der Modul-Materialien stehen am Sockel (`ee_tint`, `ee_ink`, `ee_bone`, `ee_accent`, `ee_iris`).
- **Beine als Module** (Bein-Modul statt geknetet) und die Feder-Animation der Module (Ohren wackeln, Rüssel schwingt, Lider blinzeln) macht das Spiel prozedural — in Blender stehen die Module in Ruhepose.

**Materialien der Wesen:** Knotengruppe **„EE · Wesen-Körper“** (in jedem Material „Wesen · <Name>“): Grund-, Innen-, Rand-, Glanzfarbe, Tinte, Glanz, Transluzenz, Materialart (0 Jelly, 1 Flüssig, 2 Gas, 3 Feuer, 4 Fell, 5 Federn), Muster (1 Tiger, 2 Giraffe, 3 Zebra, 4 Schlange, 5 Punkte, 6 Rauten, 7 Elefant, 8 REX, 9 Retriever, 10 Maus) mit Musterfarben, -skala, -drehung. Die Muster laufen im **Ruheraum** des Körpers (Attribut `ee_rest`) und kleben deshalb auch beim Posen am Körper. Das ist eine Annäherung an den Spiel-Shader (gebänderte Wrap-Beleuchtung, Organe, Earle-Randlicht, harter Glanzbogen, keine Konturen) — der echte Shader ist TSL im Spiel.

## 3. Map

**Ebene statt Planet (ADR 0002).** Im Spiel ist die Welt eine unendliche Ebene (x seitlich, z längs des Pfads, vorwärts −z); die Kugel ist nur die Anzeige um den Blickpunkt. Der Export legt deshalb die **Ebene selbst** in die Datei — flach, in echten Weltkoordinaten (Blender: x, −z, Höhe). Exportiert wird ein Fenster: die Chunks (16 × 16 Einheiten) längs der Autorenroute für Level 1–100 mit dem Seitenband, genau so gebaut wie im Spiel (Pfadkorridor, Streuung, Wahrzeichen). Weiter draußen geht die Welt im Spiel ohne Ende weiter (prozedurale Welten ab Welt 11); die sind nicht in der Datei. Radius (32) und Krümmung (0,14) der Anzeige-Kugel stehen als Eigenschaften an der Collection „Map“ (`ee_radius`, `ee_kruemmung`, `ee_fenster`) — wer die Kugel-Ansicht nachbauen will: azimutal-abstandstreue Abbildung um einen Fokus, siehe `packages/render/src/earle/display.ts`.

- **Terrain:** je Welt ein Mesh (Dreiecke nach der Welt ihres Schwerpunkts, Chunks verschweißt, ohne Schürzen), Attribute `ee_height` (0..1), `ee_border` (Abstand zur nächsten Weltgrenze → dunkle Risse), `ee_zone` (Welt des Vertex). Material je Welt: **„EE · Earle-Band“** — Tinte im Schatten, Lichtstufen aus der Palettenzeile der Welt (Bild **„EE · Palettenatlas“** = der Atlas des Spiels, 8 Stufen × Zeilen; Zeilennamen in den Eigenschaften des Bildes).
- **Streuung:** je Welt und Art ein Punkte-Objekt mit Geometry Nodes **„EE · Instanzen“** (Vorlage, Drehung `ee_rot`, Größe `ee_scale`). Die Instanzmatrizen stammen direkt aus den Instanzpuffern der Spiel-Vegetation (`PlanetVegetation.setContent`); `ee_row`, `ee_accent`, `ee_style`, `ee_variant`, `ee_rank`, `ee_type` sind die Instanzdaten des Spiels (Palettenzeilen, Stammstil, Variante, Wachstumsrang, Requisitentyp). Alle Bäume stehen ausgewachsen, der Müll steht (im Spiel versinkt er mit der Heilung).
- **Kronenpunkte:** Punktwolken (GN „EE · Punkte“, Radius `ee_size`), eingefärbt aus Palettenzeile und Motiv.
- **Riesenbaum:** Stamm (Flechtenrinde), Äste (Röhren aus den Ast-Segmenten), Kuppelkrone (Instanzen, Familienzeilen `ee_domefam_*`), Punkte, Motive, Sternnadeln und Blüten (Glyphen, zur Normalen ausgerichtet), auf seinem Wahrzeichen-Platz; darunter die Gruppe **„Geschwister“** (die vier großen Bäume v4 um ihn: Holz, Kuppeln, Punkte, Schleier, Sterne im selben Baumraum).
- **Levelpfad:** die Knoten-Steine mit `ee_level`, `ee_zone` (Abschnitt der Route), `ee_welt_index`, `ee_am_riesenbaum`, dazu die Pfadpunkte. Levels auf Wahrzeichen (Fels, Ruinenterrasse, Sumpfinsel) stehen auf dem Plateau; die Wahrzeichen selbst sind als Plätze (Pfeile mit Art, Freiraum, Drehung) dabei, ihre Geometrie baut das Spiel.
- **Sonne:** Earle-Sonne 12° über dem Horizont, 70° seitlich zur Blickrichtung der Welt-01-Kamera (wie im Spiel wandert die Sonne mit dem Blick; für andere Kameras die Sonne entsprechend drehen).

## 4. Module ändern (Rückweg über `export_assets.py`)

Die Module stehen in der Szene **Module** in den Konventionen von [`tools/blender/README.md`](../tools/blender/README.md): eine Collection je Modul (Name = Asset-ID), ein Wurzel-Mesh mit `slot`, `scale_min`, `scale_max`, `tintable`, `material_family`, `chain`, Kind-Segmente (`_pupil`, `_lid`, `_shin`, `_foot`, `_seg<n>`), `SOCKET_*`-Empties, Materialien `Tint`/`Ink`/`Bone`/`Accent`/`Iris`. Der Instanz-Ursprung jeder Modul-Collection liegt auf `SOCKET_root` — so, wie das Spiel das Modul an den Sockel setzt; alle Wesen instanzieren diese Collections, Änderungen sieht man also sofort an allen Wesen.

Ein geändertes Modul zurück ins Spiel:

```bash
/Applications/Blender.app/Contents/MacOS/Blender -b assets/blender/early-earle-bibliothek.blend \
  -P tools/blender/export_assets.py -- --collection Module --only eye_round,horn_curl --out content/genome/assets
```

`--collection Module` sucht alle Modul-Collections unter „Module“ (auch in Untergruppen), `--only` begrenzt auf die genannten IDs; `_manifest.json` wird dabei ergänzt, nicht ersetzt. Ein ganz neues Modul: neue Collection mit neuer ID anlegen (Wurzel-Mesh + `SOCKET_root`), exportieren und in `content/genome/rules.json` unter `assets` eintragen. Geprüft: Alle 32 Blender-Module überstehen den Weg Spiel → Bibliothek → `export_assets.py` und bestehen die Modul-Tests des Spiels.

**Prozedurale Module** (`ear_flap`, `ear_dog`, `ear_mouse`, `horn_ossicone`, `crest_frill`, `nose_dot`, `beak_duck`, `tail_rope`, `tail_mouse`, `tail_plume`, `tail_duck`) baut das Spiel im Code (`packages/render/src/creature/ProceduralModules.ts`); ein gleichnamiges GLB würde vom Code-Modul verdeckt. Wer eines ersetzen will, exportiert die geänderte Form unter **neuer ID** und trägt sie in den Regeln/Arten ein.

## 5. Map, Spielfeld und REX ändern

Diese drei erzeugt das Spiel im Code (Planet, Streuung, Riesenbaum, Brett, REX-Lofts). In Blender sind sie **Referenz und Modellierbasis**: Formen hier ausprobieren, dann als Vorgabe für den Code liefern — oder als eigenes Modul bzw. Set-Piece (GLB), das der Code einbindet. Es gibt dafür (noch) keinen automatischen Rückweg.

## 6. Eigenes Wesen bauen — Schritt für Schritt

**Einmalig:** Werkzeuge aktivieren — entweder Text-Editor → Text **„ee_wesen.py“** → *Skript ausführen* (Alt P; gilt bis Blender geschlossen wird) oder dauerhaft: *Einstellungen → Add-ons → Von Datenträger installieren…* → `tools/blender/ee_wesen.py`. Danach: 3D-Ansicht → Seitenleiste (N) → Reiter **„early earle“**.

1. **Szene „Eigenes Wesen“ öffnen.** Die Vorlage ist ein Retriever (Stufe 6) in Einzelteilen: das Empty **„Wesen-Wurzel“** (= Körpermitte; der Boden ist Z = 0), die Kugeln in „Eigenes Wesen · Kugeln“, Hüften, Halsansatz, Maul und Kiefergelenk in „Eigenes Wesen · Gelenke“, die Sockel mit Modulen in „Eigenes Wesen · Sockel“ und **„Eigenes Wesen · Vorschau“** — die Live-Vorschau zeigt die glatte Vereinigung der Kugeln (Geometry Nodes: Kugeln → SDF → Verrundung → Mesh; Voxelgröße und Verrundung im Modifier). Sie vereint **alles**, was in „· Kugeln“ liegt — dort also nur Kugeln ablegen.
   Alternativ ein Wesen aus der Szene **Wesen** als Start nehmen: seine Collection duplizieren (Outliner → Rechtsklick → *Collection duplizieren*), „<Wesen> · Kugeln“ und „<Wesen> · Gelenke“ einblenden, am Rig `ee_id`/`ee_name` ändern (sonst heißt die Datei wie das Bibliothekswesen). Seitenleiste → *Vorschau anlegen* baut eine Live-Vorschau dazu.
2. **Form bauen:** Kugeln verschieben (G) und skalieren (S — **Skalierung = Radius**). Neue Kugel: Seitenleiste → *Kugel hinzufügen* (am 3D-Cursor). Jede Kugel braucht in den Eigenschaften:
   - `ee_rolle`: `core` (genau eine, die Hauptkugel), `rump`, `body`, `lobe` (Blob), `head`, `face` (fest am Kopf), `jaw` (Unterkiefer), `neck`, `trunk`, `tail`, `spine` (Schlange), `knee`, `foot`
   - `ee_kette`: Reihenfolge in Hals/Rüssel/Schwanz/Wirbelsäule (0 = am Körper)
   - `ee_bein`: bei `knee`/`foot`: `FL`, `FR`, `BL`, `BR` (vorn/hinten links/rechts) oder `L`, `R` (Zweibeiner)
   - `ee_name`: der Name der Kugel (Anker für Sockel)
   Höchstens **14 Kugeln** (Grenze der GPU). Jedes Bein braucht **genau einen Fuß** und ein Hüft-Empty mit `ee_huefte` = Bein und `ee_beuge` (+1 Knie nach vorn, −1 nach hinten).
3. **Module:** Sockel-Empty wählen (Pfeile) → *Instanzieren → Collection* = gewünschtes Modul (z. B. `horn_curl`). Position = wo das Modul auf der Oberfläche sitzt, Z-Achse = weg vom Körper, Y = oben; Skalierung = Modulgröße, negative X-Skalierung = gespiegelt (rechtes Teil eines Paars). Eigenschaften: `ee_sockel` (eye, horn, ear, trunk, tooth, wing, leg, tail, crest), `ee_anker` (Kugelname, von dem aus die Richtung gemessen wird), optional `ee_neigung`, `ee_drehung`, `ee_versenkt`, `ee_farbquelle` (`base`, `inner`, `rim`, `ink`, `bone`, `accent` oder `#hex`). In der Vorlage hängen die Sockel an ihrer Ankerkugel und wandern mit ihr. Neuer Sockel: vorhandenen duplizieren (Shift D).
4. **Wurzel-Eigenschaften** („Wesen-Wurzel“, auch in der Seitenleiste): `ee_id` (Dateiname, klein, Bindestriche), `ee_name`, `ee_basis` (Art, deren Gang/Masse/Tempo das Wesen bekommt: `retriever`, `mouse`, `giraffe`, `rex`, `duck`, `elephant`, `snake`, `blob`), `ee_stufe`, `ee_zone`, `ee_material` (`jelly`, `liquid`, `gas`, `fire`), `ee_farbe` (Grundfarbe; Innen- und Randfarbe leitet das Spiel ab, außer `ee_innenfarbe`/`ee_randfarbe` sind gesetzt), `ee_akzent`, `ee_fell` (`bare`, `fur`, `feather`), `ee_muster` (`none`, `tiger`, `giraffe`, `zebra`, `snake`, `spots`, `diamonds` …), `ee_glaettung` (Verschmelzradius, 0.19–0.4), `ee_groesse`.
5. **Exportieren:** Seitenleiste → **„early earle: Wesen exportieren“** (oder F3 → Operator suchen). Der Operator liest das Wesen in Ruhepose, prüft es (Rollen, Beine, Anker, Module) und schreibt **`content/genome/custom/<ee_id>.json`** (der Ordner wird relativ zur Bibliothek gefunden; sonst fragt ein Dateidialog). Fehler stehen oben in der Statuszeile.
6. **Im Spiel ansehen:** Dev-Server läuft (`pnpm dev`) → **`/lab/creature`** → Zeile **„Eigene Wesen“** → Wesen wählen. Es läuft mit dem Gang seiner Basis-Art, hat Maul, Blick, Blinzeln, Merge-Züge — wie jede Art. Ungültige Dateien stehen mit ⚠ und den Meldungen der Prüfung (Tooltip) in der Liste.
7. **Zurück in die Bibliothek:** Beim nächsten `pnpm assets:blender` erscheint das Wesen unter **Wesen → Eigene Wesen** — so, wie das Spiel es baut (Mesh, Rig, Module).

Beispiel: [`content/genome/custom/beispiel-drache.json`](../content/genome/custom/beispiel-drache.json) wurde genau so erzeugt — [`tools/blender/beispiel_drache.py`](../tools/blender/beispiel_drache.py) macht die Handgriffe aus Schritt 2–5 per Skript (Hals verlängert, Hörner, Fledermausflügel, Rückenflosse, spitze Ohren, Rautenmuster, Basis Giraffe) und exportiert mit dem Operator.

**Dateiformat** (`schemaVersion: 1`, geprüft mit zod in `packages/genome/src/custom/schema.ts`; Koordinaten im Spielraum: +Y oben, +Z vorn, +X = links, Einheiten = Blob-Radien): `spheres` (Name, Rolle, Mitte, Radius, Kette, Bein), `legs` (Hüfte, Beuge), `neck` (Ansatz, maximale Biegung), `trunk` (Wurzel), `mouth` (Anker, Richtung, Breite, Öffnung, Kiefergelenk), `parts` (Slot, Modul, Anker, Theta/Phi, Spiegelung, Neigung, Drehung, Versenkung, Skalierung, Farbe), dazu Basis-Art, Zone, Stufe, Material, Farben, Fell/Muster, Glättung, Bodenhöhe. `buildCustomCreature` (`packages/genome/src/custom/build.ts`) macht daraus ein normales `CreatureSpec`; `customFromSpec` ist die Umkehrung (jedes Bibliothekswesen trägt sein JSON in der Eigenschaft `ee_wesen_json`). Der Test `custom.test.ts` prüft für alle acht Arten Spiel → JSON → Spiel und jede Datei in `content/genome/custom/`.

**Später aufs Spielfeld:** Das Brett löst Wesen über `resolveCreature(creatureGenome(zone, stufe, seed), regeln)` auf (`packages/render/src/board/BoardBlobs.ts`). Ein eigenes Wesen kommt aufs Brett, indem man dort — z. B. über einen Eintrag in `rules.json` („Stufe 7 in Wooding = eigenes Wesen `beispiel-drache`“) — statt `resolveCreature` `buildCustomCreature(def, regeln, { zone, tier })` aufruft; Mesh-Pfad, Rig und Merge-Züge funktionieren unverändert, weil es ein gewöhnliches `CreatureSpec` ist. Achtung: Der Mesh-Cache des Bretts schlüsselt nach Art/Beinen/Kugelzahl/Stufe — eigene Wesen brauchen dort einen eigenen Schlüssel (das Lab leert den Cache beim Wechsel).

## 7. Neu bauen (`pnpm assets:blender`)

```bash
pnpm install          # einmal (tools/export3d ist ein Workspace-Paket)
pnpm assets:blender   # Export + Bau, ~2–3 min (davon gut 1 min Vorschaubilder)
pnpm assets:blender -- --bilder         # zusätzlich docs/progress/blender-bibliothek-*.png
pnpm assets:blender -- --ohne-vorschau  # ohne Asset-Vorschaubilder (schneller)
pnpm assets:blender -- --schnell        # kleiner Export zum Ausprobieren
pnpm assets:blender -- --nur wesen,module --out /tmp/test.blend
```

Blender wird unter `/Applications/Blender.app/…` gesucht, sonst `blender` im Pfad, oder per Umgebungsvariable `BLENDER`.

**Ablauf:**
1. `tools/export3d/run.mjs` startet Vites SSR-Modul-Runner mit der Vite-Konfiguration des Spiels (Aliase `@/`, `@content/`, `import.meta.glob`) und ruft die echten Generatoren in Node auf — ohne Browser und ohne GPU: `resolveCreature` + `meshBody` (Wesen), `moduleFromScene`/`proceduralModules` (Module), `createRexGeometry` (REX), **`MapWorld`** aus `apps/game/src/flow` (Ebenen-Fenster der Autorenroute, Welt-Slots für alle Welten des Fensters, Streuung je Chunk über `PlanetVegetation.setContent`, Riesenbaum samt Geschwistern und Levelpfad genau wie im Flow), `BoardRenderer` + Elemente-Schau (Spielfeld), die Paletten. Ergebnis: `assets/blender/_export/` (GLB je Wesen/Modul, Map-GLBs, `manifest.json`; nicht im Git).
2. `tools/blender/build_library.py` (Blender headless, Paket `tools/blender/ee_bibliothek/`) liest die GLBs mit einem eigenen Leser (numpy) und baut Szenen, Collections, Rigs, Materialien, GN-Instanzen, Kataloge, Vorschaubilder und LIESMICH; speichert komprimiert.

**Robust gegen Änderungen:** Jeder Abschnitt läuft für sich; bricht einer (weil sich ein Generator geändert hat), steht das in `manifest.json` (`failed`) und im Bauprotokoll (LIESMICH), der Rest wird trotzdem gebaut. Die Map liest die Vegetation über die Namen ihrer Meshes (Bäume v4: `planet-crown-*`, `planet-trunk-*`, `planet-bare`, `planet-dots`; `planet-props` …); unbekannte neue Meshes werden generisch mitgenommen (Grundgeometrie + Instanzmatrizen, Collection „Weitere“) und als Hinweis gemeldet. Neue Arten, Stufen, Module, Welten, Requisiten und Paletten erscheinen ohne Codeänderung, weil der Export über die Listen des Spiels läuft (`SPECIES`, `ZONES`, Welten aus `content/zones/worlds`, Module aus `content/genome/assets` + `proceduralModules()`, Instanz-Meshes der Vegetation).

## 8. Technisches

- **Koordinaten:** Spiel und GLB: +Y oben, +Z vorn (glTF). Blender: +Z oben, Wesen schauen nach −Y (Blenders Vorderansicht); Umrechnung (x, y, z) → (x, −z, y).
- **Größen:** 1 Blender-Einheit = 1 Blob-Radius (Wesen, Module) bzw. 1 Welteinheit (Map, Spielfeld, REX). Die Weltgröße eines Wesens auf dem Brett steht in `ee_weltmassstab`.
- **Dateigröße:** ~28 MB (komprimiert): 108 Wesen-Meshes mit Gewichten (107 Stufen der Arten und Blob-Linien + das Beispiel), Terrain ~87 000 Vertices, ~7 000 Instanzen, ~217 000 Kronenpunkte, 219 Vorschaubilder.
- **Kameras:** Wesen, Module und Materialien haben eine orthografische Übersichtskamera (Raster ohne Verzerrung), Spielfeld, REX und Eigenes Wesen eine perspektivische; alle sind genau auf den Inhalt eingepasst (Numpad 0).
- **Dateien:** `tools/export3d/` (Export: `src/sections/*.ts`, `src/glb.ts`, `src/rig.ts`), `tools/blender/build_library.py` + `ee_bibliothek/` (Bau), `tools/blender/ee_wesen.py` (Add-on), `tools/blender/beispiel_drache.py` (Beispiel), `packages/genome/src/custom/` (Format), `apps/game/src/lab/creature/customCreatures.ts` (Lab).

## 9. Grenzen

- Die Materialien sind eine Annäherung in EEVEE (Shader to RGB, Emission); der eigentliche Look entsteht im TSL-Shader des Spiels (Fell-Schalen, Federkarten, Gas-Volumen, Feuerzungen, Punktbillboards, Nebelstufen, gebogener Horizont fehlen hier).
- Gas- und Feuerkörper sind im Spiel lebendige SDF-Volumen; hier steht der glatte Kern.
- Kahle Bäume, Kühe und die Punkte sind im Spiel kamerazugewandte Karten; hier stehen sie fest ausgerichtet.
- Vom Levelpfad kommen Knoten und Punkte mit; seine Optik im Flug (Band, Steine, Blumen, Sockel) baut das Spiel zur Laufzeit und ist nicht in der Bibliothek.
- Die Live-Vorschau vereint die Kugeln mit Verrundung statt exaktem Smooth-Min — nah dran, aber nicht identisch; das Spiel zeigt die genaue Form.
- Posen in Blender gehen nicht ins Spiel zurück (das Spiel animiert prozedural).
