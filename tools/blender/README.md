# Blender-Pipeline (P4)

Florian baut Figuren-Module (Augen, Hörner, Flügel, Ohren, Rüssel, Zähne, Beine, …) in Blender; das Spiel hängt sie prozedural an Sockel des Blob-Körpers und animiert sie selbst (Federn, Noise, IK). Keine Konturen an Modulen; Kanten entstehen aus Wertkontrast.

## Konventionen in der .blend

- **Eine Top-Level-Collection pro Modul**, Name = Asset-ID (`eye_slit`, `horn_curl`, `wing_leaf`). Collections mit `_`-Präfix werden ignoriert.
- Genau **ein Root-Objekt** (Mesh) pro Collection, ≤ 4000 Faces, ohne angewandte Modifier-Reste (Export wendet Modifier an).
- **Sockel** = Empties namens `SOCKET_<slot>` als Kinder des Root-Objekts. Pflicht: `SOCKET_root` (Andockpunkt am Körper, +Z zeigt vom Körper weg). Optional: `SOCKET_tip`, `SOCKET_eye_l`, …
  Blender vergibt bei gleichen Namen Suffixe (`SOCKET_root.001`); die Laufzeit entfernt numerische Suffixe.
- **Custom Properties** am Root-Objekt landen als glTF-`extras`: `slot` (eye | horn | wing | ear | trunk | tooth | leg | tail | crest | crown | spike), `scale_min`, `scale_max`, `tintable` (bool), `material_family` (ink | shell | membrane | fur | jelly).
- Animationen als **NLA-Tracks** (werden zu benannten glTF-Animationen), Shape Keys werden Morph Targets. Beides ist optional, Bewegung entsteht zur Laufzeit.
- Farbe: flaches Material oder Vertex-Farbe; keine Texturen nötig. Datenmaps (AO, Krümmung) nur bei Bedarf backen.

## Export

```bash
/Applications/Blender.app/Contents/MacOS/Blender -b assets/blender/parts.blend -P tools/blender/export_assets.py -- --out content/genome/assets
```

Schreibt `content/genome/assets/<asset>.glb` und `_manifest.json` (Assets, Sockel, Extras). Ungültige Module werden übersprungen und gemeldet (Exit-Code 2).

Test ohne eigene Datei: `tools/blender/make_test_parts.py` erzeugt eine Beispiel-Bibliothek (Auge, Horn, Flügel, ein absichtlich kaputtes Modul).

## Starter-Bibliothek (P4)

`tools/blender/make_starter_parts.py` baut die 22 Startmodule prozedural (Augen: Schlitz, rund, Spirale, Doppelschlitz · Hörner: Locke, Stachel, Knubbel · Ohren: rund, spitz, Schlappohr · Rüssel kurz/lang (Segmentketten) · Zähne: Stoßzahnpaar, Zahnreihe · Flügel: Blatt, Fledermaus · Beine: Stummel, lang · Schweif: Locke, Quaste · Kamm: Büschel, Finne), 11–340 Faces pro Modul, in **Blob-Einheiten** (Körperradius ≈ 1):

```bash
/Applications/Blender.app/Contents/MacOS/Blender -b -P tools/blender/make_starter_parts.py -- --out /tmp/starter_parts.blend
/Applications/Blender.app/Contents/MacOS/Blender -b /tmp/starter_parts.blend -P tools/blender/export_assets.py -- --out content/genome/assets
```

Die `.blend` ist ein Ausgangspunkt zum Weiterbauen (Florian kann Module ersetzen; Collection-Name = Asset-ID, Konventionen oben). Materialnamen steuern die Tönung zur Laufzeit: `Tint` = Körperfarbe laut Regeln, `Ink` = Zonen-Tinte, `Bone` = Zonen-Knochenfarbe, alles andere behält seine Farbe. Kettenmodule (Rüssel, Schweif, Schlappohr) sind Eltern→Kind-Meshes `<id>_seg0 → _seg1 → …`, jedes mit Ursprung an seiner Basis; die Laufzeit biegt sie mit Federketten. Ein Kind-Mesh mit `pupil` im Namen folgt dem Blick. Achsen: Blender +Z zeigt vom Körper weg (nach glTF-Y-up ist das +Y in three.js; `@ee/render` bildet das auf die Sockel-Normale ab), Blender +Y ist „oben".
