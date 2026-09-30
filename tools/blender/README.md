# Blender-Pipeline (P4)

> **Bibliothek:** `assets/blender/early-earle-bibliothek.blend` enthält alles, was das Spiel in 3D erzeugt (Map, Wesen mit Rigs, REX, Spielfeld, Module, Paletten) und die Vorlage für eigene Wesen. Neu bauen: `pnpm assets:blender` (`build_library.py` + `ee_bibliothek/`, Export: `tools/export3d/`). Eigene Wesen exportiert das Add-on `ee_wesen.py` nach `content/genome/custom/`. Module aus der Bibliothek zurück ins Spiel: `export_assets.py -- --collection Module --only <id>`. Alles Weitere: [`docs/BLENDER.md`](../../docs/BLENDER.md).

Florian baut Figuren-Module (Augen, Hörner, Flügel, Ohren, Rüssel, Zähne, Beine, …) in Blender; das Spiel hängt sie prozedural an Sockel des Blob-Körpers und animiert sie selbst (Federn, Noise, IK). Keine Konturen an Modulen; Kanten entstehen aus Wertkontrast.

## Konventionen in der .blend

- **Eine Top-Level-Collection pro Modul**, Name = Asset-ID (`eye_slit`, `horn_curl`, `wing_leaf`). Collections mit `_`-Präfix werden ignoriert.
- Genau **ein Root-Objekt** (Mesh) pro Collection, Budget **≤ 800 Dreiecke** pro Modul (der Export lehnt erst ab 4000 Faces ab), ohne angewandte Modifier-Reste (Export wendet Modifier an).
- **Sockel** = Empties namens `SOCKET_<slot>` als Kinder des Root-Objekts. Pflicht: `SOCKET_root` (Andockpunkt am Körper, +Z zeigt vom Körper weg). Optional: `SOCKET_tip`, `SOCKET_eye_l`, …
  Blender vergibt bei gleichen Namen Suffixe (`SOCKET_root.001`); die Laufzeit entfernt numerische Suffixe.
- **Custom Properties** am Root-Objekt landen als glTF-`extras`: `slot` (eye | horn | wing | ear | trunk | tooth | leg | tail | crest | crown | spike), `scale_min`, `scale_max`, `tintable` (bool), `material_family` (ink | shell | membrane | fur | jelly), `chain` (bool), `faces`, `tris`.
- Animationen als **NLA-Tracks** (werden zu benannten glTF-Animationen), Shape Keys werden Morph Targets. Beides ist optional, Bewegung entsteht zur Laufzeit.
- Farbe: flaches Material oder Vertex-Farbe; keine Texturen nötig. Datenmaps (AO, Krümmung) nur bei Bedarf backen.

## Export

```bash
/Applications/Blender.app/Contents/MacOS/Blender -b assets/blender/parts.blend -P tools/blender/export_assets.py -- --out content/genome/assets
```

Schreibt `content/genome/assets/<asset>.glb` und `_manifest.json` (Assets, Sockel, Extras). Ungültige Module werden übersprungen und gemeldet (Exit-Code 2).

Test ohne eigene Datei: `tools/blender/make_test_parts.py` erzeugt eine Beispiel-Bibliothek (Auge, Horn, Flügel, ein absichtlich kaputtes Modul).

## Starter-Bibliothek (P4, v2 „reichere Module" P1b)

`tools/blender/make_starter_parts.py` baut **32 Module** prozedural in **Blob-Einheiten** (Körperradius ≈ 1), je **≤ 800 Dreiecke** (das Skript bricht sonst ab; `tris` steht in den Extras):

| Slot | Module | Aufbau |
|---|---|---|
| Auge | `eye_slit`, `eye_double_slit`, `eye_round`, `eye_spiral` (REX), `eye_cute` (groß, niedlich), `eye_sleepy` (Halblid), `eye_reptile` (Schlitzpupille) | Wurzel = Augapfel (`Bone`, Reptil: `Iris`); Kind `<id>_pupil` = **ein** Mesh mit Iris-Ring (`Iris`), Pupille (`Ink`) und Glanzpunkt (`Bone`) — folgt dem Blick als Einheit; Kind `<id>_lid` (`Tint`) mit Scharnier `SOCKET_lid` in der Augenmitte (Lid um Modul-X drehen = Blinzeln). Schlitzaugen: Tinte + `<id>_glint` |
| Horn | `horn_curl`, `horn_spike`, `horn_nub`, `horn_ram` | gefegte Röhre mit **Rillenringen**, Spitze in `Bone` |
| Ohr | `ear_round`, `ear_pointy`, `ear_floppy` (Kette) | Innenohr als `Accent` |
| Rüssel | `trunk_short`, `trunk_long` (Kette) | Segmente mit **Faltenringen**, letztes Segment mit ausgestellter Spitze und zwei Nasenlöchern (`Ink`) |
| Zähne | `tooth_tusk` (geringelt), `tooth_row`, `tooth_buck` (zwei Nagezähne), `tooth_fang` (Fangzähne) | `Bone` |
| Flügel | `wing_leaf` (Adern `Ink`), `wing_bat` (Fingerknochen `Bone`), `wing_feather` (fünf Federn, Kiele `Bone`) | Rippen/Adern stehen beidseitig aus der Membran (Ornament innen, keine Kontur) |
| Bein | `leg_stub`, `leg_tall`, `leg_rex` (Krallen) | **zwei Gelenke + Fuß**: `<id>` (Oberschenkel, Wurzel) → `<id>_shin` (Ursprung im Knie) → `<id>_foot` (Ursprung im Knöchel, Zehen + Nägel/Krallen `Bone`); Sockel `SOCKET_knee`, `SOCKET_foot`, `SOCKET_tip` (Sohle) |
| Schweif | `tail_curl` (Kette, Faltenringe), `tail_tuft` (Kette, Fellbüschel) | |
| Kamm | `crest_tuft`, `crest_fin` (Rippen `Ink`), `crest_feather` (Federkamm), `crest_fur` (Fellbüschel) | |

```bash
/Applications/Blender.app/Contents/MacOS/Blender -b -P tools/blender/make_starter_parts.py -- --out /tmp/starter_parts.blend
/Applications/Blender.app/Contents/MacOS/Blender -b /tmp/starter_parts.blend -P tools/blender/export_assets.py -- --out content/genome/assets
# Kontaktbogen aller Module (Workbench, ohne Konturen) für Review/Doku:
/Applications/Blender.app/Contents/MacOS/Blender -b /tmp/starter_parts.blend -P tools/blender/render_module_sheet.py -- --out docs/progress/p1b-modules.png
```

**Namens- und Sockel-Konventionen (v2):**

- `SOCKET_root` (Pflicht), `SOCKET_tip` (Spitze/Sohle), **`SOCKET_lid`** (Lid-Scharnier, Augen), **`SOCKET_knee`** (Knie: Drehpunkt Oberschenkel→Schienbein), **`SOCKET_foot`** (Knöchel: Drehpunkt Schienbein→Fuß). Die Laufzeit entfernt numerische Suffixe (`SOCKET_lid.003`).
- Kind-Meshes mit `pupil` im Namen folgen dem Blick; `_lid` = Augenlid; `_shin`/`_foot` = Beinglieder; `_seg<n>` = Kettenglieder (Rüssel, Schweif, Schlappohr), jedes mit Ursprung an seiner Basis.
- Materialnamen steuern die Tönung zur Laufzeit: `Tint` = Körperfarbe laut Regeln (bei Augen ist die Slot-Tönung `ink`, das Lid wird also tintendunkel — gewollt als schweres Lid; ein Rig darf `Tint` an Augen auch auf die Körperbasis legen), `Ink` = Zonen-Tinte, `Bone` = Zonen-Knochenfarbe, `Accent` = Zonen-Akzent, **`Iris`** = eigene Farbe (Bernstein `#e8a33c`; das Rig darf sie aus dem Genom tönen), alles andere behält seine Farbe.
- Achsen: Blender +Z zeigt vom Körper weg (nach glTF-Y-up ist das +Y in three.js; `@ee/render` bildet das auf die Sockel-Normale ab), Blender +Y ist „oben" (bei Beinen: „vorn" — die Zehen zeigen nach +Y).
- Ruhepose: Beine leicht gebeugt, Lider leicht nach vorn gekippt (Halblid bei `eye_sleepy`). Bewegung entsteht zur Laufzeit (Federn, IK, Verben).

Vertrags-Test: `packages/render/src/materials/moduleAssets.test.ts` lädt jede GLB mit dem echten `GLTFLoader` + `moduleFromScene` und prüft Budget, Sockel, Blick-Segmente, Lider, Beinglieder und Kettenreihenfolge.
