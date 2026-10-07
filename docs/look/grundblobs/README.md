# Grundblobs und Mischwesen: Look-Beweis (Stand 2026-10-05)

Artefakt: https://claude.ai/artifact/JfvK1CAf11oqfJXAiLyf5p (privat, Florian). Plan: [`PLAN.md`](PLAN.md). Bilder: `docs/progress/grundblobs-v1-vergleich.png`, `grundblobs-v1-brett.png`, `mischwesen-v1.png`.

## Was steht

- **13 Grundformen** direkt aus Florians Vorlage (`refs/grundblobs-vorlage.png`, feste Reihe als Grundform). Silhouetten-Überdeckung mit der festen Reihe im Mittel **97,9 %** (IoU, Vorderansicht). Zwei LOD-Stufen (16k / 4,5k Dreiecke). Stufe 13 hat zusätzlich die vor dem Körper gezeichneten Füße.
- **Drei Materialien** als eigene Shader (WebGL2/GLSL):
  - Jelly: Dicke pro Pixel aus Rückseiten-Tiefe, Absorption, Brechung, Innenkern und Bodenschicht als analytischer Strahlschnitt mit klarer Kante, Bläschen (werden mitgebrochen), Glanzstreifen, Randlinie.
  - Fest: gemalte Zwei-Ton-Schattierung, AO, Vinyl-Glanzkanten, Randlinie.
  - Fell: gekämmte Schalen (instanziert, ein Draw Call pro Blob), spitze Büschel aus gestrecktem Zellrauschen, Lichtverlauf, keine Haare auf den Augen.
- **Augen** als SDF-Pillen auf der Oberfläche (in jeder Größe scharf), Blinzeln.
- **Animation und Partikel:** Atmen/Wackeln je Material, Hüpfen mit Ausholen, Strecken, Landung und Nachwackeln; Tropfen (Jelly), Flusen (Fell), Staub (fest).
- **Brett** 6×6 mit 36 gemischten Blobs: 85–95 Draw Calls (Ziel ≤ 100). Bildrate nur auf echter GPU messbar (Cloud: SwiftShader).
- **Mischwesen** aus Florians Meshy-Modellen: Spinne (8 Beine, Rumpf), Giraffe (Kopf/Hals, Rumpf, Schwanz, 4 Beine), Rex (Oberkopf, Unterkiefer mit Gelenk, Rumpf), Retriever (Kopf, Rumpf). Beispiele: Giraffe mit Spinnenbeinen, Rex-Retriever (Kiefer klappt), Spinnenblob, Giraffenblob. Schalter „Farben angleichen“ legt die Palette des Rumpfs über fremde Teile.

## Neu erzeugen

```bash
# Python: numpy scipy scikit-image trimesh fast-simplification rtree pillow pymeshlab (+ apt libopengl0 libglu1-mesa)
python3 tools/vermessen.py refs/grundblobs-vorlage.png <ordner>          # Masken, Augen, Farben -> vermessung.json
python3 tools/formen.py <ordner> <ausgabe>                                # 13 Formen; STUFEN=13 erzeugt nur Stufe 13 neu (Zwischenspeicher)
python3 tools/packen.py <ausgabe>/cache assets                            # -> assets/grundblobs-mesh.txt (Artefakt kennt kein .glb)
python3 tools/module.py <meshy-ordner> assets <arbeitsordner>             # Meshy-Module; MODELLE=giraffe nur ein Modell
```

Meshy-Quelldateien: Branch `meshy-test`, `assets/ref-florian/meshy/`.

## Bekannte Lücken (nächste Runde)

- Fell: Inneres wirkt noch etwas schuppig, Silhouette weniger zackig als in der Vorlage.
- Jelly: Innenformen der Vorlage (zweiter Kern oben, Bläschengruppen) nur angenähert.
- Mischwesen: starre Gelenke (Beine schwingen als Ganzes, noch kein Knie); Nähte stecken im Körper, kein Kragen; Retriever-Rumpf zeigt nach dem Ausdünnen Splitter in den Fellsträhnen; Drache ohne Flügel (fehlt im Meshy-Modell).
- Leistung auf dem iPhone ungemessen (fps-Anzeige im Artefakt).
- Port der Shader nach TSL/WebGPU für das Spiel steht aus.

## Nachtrag 2026-10-05: Urteil Mischwesen

Florian: „Die Mischwesen sehen ganz ganz schlimm und schlecht aus.“ Ursachen: Teile aus ganzen, fertig posierten Meshy-Tieren passen in Maßstab, Pose und gebackener Schattierung nicht zusammen; Nähte stecken ungestaltet im Körper; Meshy-Textur neben eigenem Blob-Shader ergibt zwei Stile in einem Wesen; Platzierung ohne Art Direction. Der Zusammenbau zur Laufzeit aus ganzen Meshy-Tieren wird so nicht weiterverfolgt.

Florian ergänzt: „Du verstehst auch den Look überhaupt nicht, und wie du die Meshes zerschnitten hast, ist stümperhaft.“ Die Schnitte waren gerade Ebenen und Ellipsoide über die Flächenmitten: Sie liefen quer durch Hals, Mähne und Kamm statt entlang natürlicher Körpergrenzen, die Ränder sind zackig, und das Ausdünnen erzeugte Splitter. Mit Retopologie und Gelenk-Kantenschleifen haben sie nichts zu tun. Vor dem nächsten Look-Versuch: Florian definiert den Look (Stilvorgaben mit Referenzen), Schnitte nur entlang anatomischer Grenzen und erst nach seiner Freigabe am Vergleichsbild.
