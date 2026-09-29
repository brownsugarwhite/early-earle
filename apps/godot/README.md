# early earle — Godot-4.7-Vergleichstrack (P1-G, P2-G)

Nativer Vergleich zum three.js-Web-Track (Plan Abschnitt 8b). Godot 4.7.2, GDScript, Text-Szenen,
**Mobile-Renderer (Forward Mobile) als Standard**, Compatibility (OpenGL/WebGL2) per Flag wählbar.
Fenster 900×1600 (Portrait, `viewport`-Stretch, 4× MSAA, VSync aus, damit die Messwerte die
Renderkosten zeigen — Taste **V** schaltet VSync im Menü um).

## Starten

```sh
# Menü (Mobile-Renderer, Metal auf dem Mac)
/Applications/Godot.app/Contents/MacOS/Godot --path apps/godot

# Compatibility-Renderer (entspricht dem späteren Web-Export)
/Applications/Godot.app/Contents/MacOS/Godot --path apps/godot --rendering-method gl_compatibility

# Editor öffnen
/Applications/Godot.app/Contents/MacOS/Godot --path apps/godot --editor

# Skript-/Szenenfehler prüfen (ohne Fenster; Shader werden headless NICHT kompiliert)
/Applications/Godot.app/Contents/MacOS/Godot --headless --path apps/godot --quit
```

## Messlauf und Screenshots

Der Autoload `Bench` (`scripts/bench.gd`) fährt beide Labs durch alle Konfigurationen, misst je
3 s (fps, Frametime p50/p99/max, Draw Calls, Objekte, Dreiecke, Physik-Step, Speicher), druckt pro
Konfiguration eine JSON-Zeile, schreibt `bench/results-<renderer>.json` und speichert PNGs des
Root-Viewports (900×1600). Braucht ein Fenster (kurz sichtbar, ~90 s):

```sh
cd ~/Projekte/playground/early-earle
/Applications/Godot.app/Contents/MacOS/Godot --path apps/godot -- --bench --out="$PWD/docs/progress"
/Applications/Godot.app/Contents/MacOS/Godot --path apps/godot --rendering-method gl_compatibility -- --bench --out="$PWD/docs/progress" --seconds=3
```

## Bedienung

Perf-Overlay oben links in jeder Szene: fps, p50/p99 der letzten Sekunde, Draw Calls / Objekte /
Dreiecke (`RenderingServer.get_rendering_info`), Physik-Step-Zeit; oben rechts das Renderer-Badge
(`Mobile · metal`, `Compatibility · opengl3`).

**P1-G Blob-Lab** (`scenes/blob_lab.tscn`, `scripts/blob_lab.gd`, `shaders/blob*.gdshader`)
- `1 / 9 / 36 Blobs`: ein einziger MultiMesh-Draw-Call. Ikosphäre (Frequenz 6, 362 Vertices) wird
  im Vertex-Shader auf eine Smooth-Min-SDF aus 5 Kugeln + Noise getraced (6 Schritte, 4-Tap-Normale),
  atmet, hat einen flachen Boden (pezenpez-Hügelform) und eine volumenerhaltende Quetschung aus
  `INSTANCE_CUSTOM` (Seed, Squash, Phase).
- Fragment (Referenz 03-pezenpez): diagonaler Mint→Teal-Verlauf, **eine harte sichelförmige
  Glanzlinie** oben links + Komma, hart begrenzte halbtransparente Innen-„Organe“ (Ellipsoide entlang
  des gebrochenen Blickstrahls), flache helle Bläschen, dunkler Vesica-Augenschlitz rechts (blinzelt),
  weicher Fresnel-Rand. **Keine Kontur.**
- `Jelly / Flüssig / Gas / Feuer`: Material-Uniform + Partikel. Flüssig: flacher (Squash 0,72),
  schärferer Glanz, Tropfen (GPUParticles3D). Gas: transparenter Shader (`blob_gas.gdshader`) +
  Nebel-Puffs, ein GPUParticles3D für alle Blobs (Emission aus einer Punkt-Textur der Blobpositionen).
  Feuer: emissives Noise + additive Flammenpartikel.
- `SoftBody`: Hero-Blob als **Jolt `SoftBody3D`** (UV-Kugel, 231 Punkte, Druck 160, Steifigkeit 0,55)
  mit derselben Optik (`u_displace = 0`, Zentrum pro Frame aus 12 Punkt-Transforms). `Poke` (oder
  Klick ins Bild) gibt den oberen Vertices einen Impuls nach unten → Quetschung.
- `Merge`: Blob 0 + 1 werden 300 ms lang durch einen **box-raymarchten Smooth-Min-Shader**
  (`blob_merge.gdshader`, 48 Schritte, Viskositätskurve, 4 Tropfen) verschmolzen, dann Pop (gedämpfte
  Feder auf der Quetschung) + Tropfenburst.
- `Zoom`: Nahkamera auf Blob 0. `Schatten`: harte Sonne an/aus. Plattenshader `flat_lit.gdshader`
  (zwei Flächenfarben, nachgeschärfter Schatten).

**P2-G Earle-Lab** (`scenes/earle_lab.tscn`, `scripts/earle_lab.gd`, `shaders/earle_*.gdshader`)
- Kappen-Patch R = 40, ±32°, 96² als `ArrayMesh`, Höhe = 2 Oktaven `FastNoiseLite`-fbm + Dünung.
- Terrain-Shader: `lit = min(aaStep(N·L), aaStep(0.5, ATTENUATION))` im `light()`-Block → Tinte
  (`#141a0c`) oder 3–4 Palettenbänder (khaki `#6f7350 → #d3cf9d`), 4-stufiger Distanznebel (khaki →
  mauve → violett → himmelblau). `ambient_light_disabled`, `specular_disabled`, kein Environment-Licht.
- Sonne: `DirectionalLight3D`, 10° Höhe, 70° seitlich, `light_angular_distance 0`, `shadow_blur 0`,
  eine orthogonale Kaskade bis 58 m, Projekt-Filter „Hard“ (1 Hardware-Vergleichstap) und
  4096² (2048² mobil). Die Kante wird im Shader mit `smoothstep(0.5 ± fwidth)` nachgeschärft.
- Bäume: 3 `MultiMeshInstance3D` (Kuppel, Kegel, Kegelstapel) mit Normalen vom Hüllzentrum, Tinte +
  2 Lichtbänder, werfen den Proxy-Schatten, empfangen keinen. **Punkte**: je Baumtyp ein MultiMesh aus
  Sechseck-Billboards (60–200 pro Baum, lichtseitig gewichtet, Tönung nach `dot(N_hull, L)`, Kollaps
  < 0,75 px im Vertex-Shader). Stämme: dünne senkrechte Streifen (zylindrisches Billboard).
- Himmel: `Sky`-Shader mit 5 harten Bändern (Neon `#b8ff2a` oben → helles Cyan am Horizont, nach
  Florians Draft 06) + flache Sonnenscheibe. 4 Nebelstreifen-Quads (hart, tiefengetestet).
- Trackball: Ziehen mit Maus/Finger (Touch → emulierte Maus), Trägheit τ = 0,4 s. Regler: Wachstum
  0–1 (`visible_instance_count` in Wachstumsreihenfolge + Skalierung um den Fußpunkt, Terrain wird
  entsättigt), Sonnenhöhe 3–35°.

## Godot-spezifische Grenzen (Stand 4.7.2)

- Godot rendert die Richtungsschatten **jeden Frame** neu; es gibt keinen „nur bei Änderung“-Modus
  für eine `DirectionalLight3D`. Messbar über `Schatten an/aus` (siehe Bench `growth-1-no-shadow`).
  Workaround für die Map später: gesamte Ansicht in einem `SubViewport` mit `UPDATE_ONCE` nur bei
  Drag/Wachstum neu rendern.
- Der harte Filter ist ein 2×2-Hardware-PCF-Tap; die Nachschärfung im Shader liefert gerade Kanten,
  streifende Sonne (10°) braucht `shadow_normal_bias ≈ 2` gegen Akne.
- Per-Instance-Uniforms (`instance uniform`) fehlen im Compatibility-Renderer → alle Instanzdaten
  laufen über `INSTANCE_CUSTOM` des MultiMesh (funktioniert in allen drei Renderern).
- Ein Shader, der `ALPHA` schreibt, ist immer transparent → Gas hat einen eigenen Shader, Jelly
  bleibt opak (und wirft Schatten).
- SoftBody3D wird top-level mit Identitäts-Transform (Vertices in Weltkoordinaten) → der Shader
  bekommt das Zentrum als Uniform.
- Web-Export = nur Compatibility-Renderer; iOS-Export braucht Xcode + Export-Templates.

## Export (später)

1. Export-Templates installieren (Editor → Editor → Manage Export Templates, Version 4.7.2).
2. Editor → Project → Export → Preset „iOS“ (Bundle-ID, Team) bzw. „Web“ (Compatibility wird per
   `rendering/renderer/rendering_method.web` automatisch genutzt).
3. Headless: `Godot --headless --path apps/godot --export-release "Web" ../../dist/godot-web/index.html`
   bzw. `--export-release "iOS" ../../dist/godot-ios/early-earle.ipa` (iOS-Preset erzeugt ein
   Xcode-Projekt, das mit Xcode 26 signiert/gebaut wird).
