# Wesen-Baukasten v4 — Plan der Session vom 02.–04.10.2026 (NICHT freigegeben)

> **Archiv.** Diesen Plan schrieb die Cloud-Session „Wöchentliches Nutzungslimit erreicht“ im Plan-Modus. Sie endete am Nutzungslimit, während der Plan auf Florians Freigabe wartete (`ExitPlanMode` nie bestätigt). Nichts davon wurde umgesetzt. **Teilweise überholt:** Florians Meshy-Test vom 04.10. zeigt, dass gebackene, gemalte KI-Texturen den gewünschten Look fast perfekt treffen; der Grundsatz „nie Farbe backen“ unten ist daher nicht mehr gesetzt. Gültig bleiben die Analyse des Prototyp-Codes (Draw Calls steigen mit der Vielfalt), die Schichten-Idee (Körperplan, Module, Haut, Muster, Palette, Rig, Wachstum), das Maul-Kit, die Leistungsziele und der Kombi-Prüfstand. Einordnung: [`README.md`](README.md), Werkzeuge: [`../research/ki-3d-tools-2026-10.md`](../research/ki-3d-tools-2026-10.md).

# Wesen-Baukasten v4: tausende kombinierbare, hochwertige Spielfiguren

## Kontext

Florian hat Hunderte Ideen für Wesen, und sie sollen sich frei kombinieren lassen. Beispiele: Katzenmaul mit Fischschuppen und Schmetterlingsflügeln, Elchgeweih an einem Krokodil mit Federkleid. Daraus werden Zehntausende Kombinationen. Seine GPT-Entwürfe (Dino, Schnecken-Drache, Retriever, Blob-Materialien, je etwa 13 Wachstumsstufen) zeigen die Qualität, die er will: große Mäuler mit Zähnen, ausdrucksstarke Silhouetten und Materialien von Jelly über Fell und Wolle bis Schuppen.

**Entscheidungen:**
- **Look „Brücke":** Formen, Mäuler, Zähne und Oberflächendetail wie in den Entwürfen. Das Licht bleibt Earle-konform in 3–4 harten Stufen mit Verlauf innerhalb jeder Stufe, ohne Konturen (STYLE §3, §7).
- **Kein Pilot jetzt.** Zuerst kommt die Architektur, die *jede* Kombination trägt.
- Die Leistung auf dem iPhone bleibt Gate: ≥ 58 fps, p99 < 20 ms, 36 Wesen auf dem Brett.

**Heutiger Stand (erkundet):**
- Körper sind SDF-Kugelverbünde (≤ 14 Kugeln, `packages/genome/src/body.ts`). Sie werden einmal pro Form auf der CPU vermascht (`packages/render/src/creature/bodyMesh.ts`) und mit Kugel-Skinning animiert.
- 43 Module, davon 32 per Skript erzeugte GLBs ohne Texturen, hängen an theta/phi-Sockeln (`CreatureRig.ts`).
- Muster sind 11 feste Shader-Zweige (`blob/patterns.ts`).
- Das Maul ist eine nachgeführte Sichel (`MouthBatch`). Auf dem Mesh-Pfad dehnt ein offener Kiefer nur die Haut, statt eine Öffnung zu bilden.

**Kernproblem:** Die Draw Calls steigen mit der Vielfalt.
- `CreatureMeshBodies.variantFor()` erzeugt ein Mesh pro Formschlüssel.
- `PartPool` erzeugt ein InstancedMesh pro Modul.

Bei Tausenden Kombinationen ist jedes Wesen auf dem Brett ein Einzelstück, und das Ziel von ≤ 30 Draw Calls reißt.

## Ehrliche Antworten auf Florians Fragen

- **„Bekommst du die Optik genau hin?"** Die Formensprache, die Mäuler, das Gebiss und die Materialwirkung ja, als 3D im Spiel. Pixelgleich zu den GPT-Bildern nein: Das sind gemalte 2D-Bilder mit weichem Licht, das Spiel nutzt bewusst Stufenlicht.
- **„Auch die Texturen?"** Ja, aber anders als gemalt. Farbe und Muster entstehen im Shader, sonst wäre nichts kombinierbar oder umfärbbar. Das Oberflächendetail (Schuppen, Fellstrich, Federn, Wolle, Adern) kommt aus einer gemeinsamen Bibliothek von Detail-Normalen. Pro Wesen gemalte Texturen wird es nicht geben: Sie würden die Kombinierbarkeit zerstören.
- **„Welcher Weg bringt die besten Ergebnisse?"** Wir bauen **Teile, nie ganze Wesen**. Ein Teil (Geweih, Flügel, Maul) entsteht aus Florians Vorlage über einen KI-Bild-zu-3D-Dienst. Danach machen meine Skripte daraus ein normiertes Bauteil mit Sockel, Knochen und gebackenen Detail-Karten. Ein ganzes KI-Modell taugt nicht: Es ist ein Monolith ohne Rig, mit eingebackener Farbe und chaotischer Topologie.

## Das Prinzip: Schichten statt Kreaturen

Ein Wesen ist kein Asset, sondern ein **Rezept aus unabhängigen Schichten**. Jede Schicht kennt nur feste Verträge, nie eine Spezies. Ein neuer Baustein funktioniert dadurch automatisch mit allen vorhandenen.

| Schicht | Beispiele | Vertrag |
|---|---|---|
| Körperplan | Blob, Vierbeiner, Zweibeiner, Schlange, Schnecke, Fisch | Körperraum (+Z vorn, +Y oben, Kernradius 1) und Standard-Knochenrollen |
| Form-Module (A) | Kopf, Schnauze, Maulhöhle, Kiefer, Ohrmuschel, Hals, Schwanz, Rüssel, Hornbasis, Höcker | SDF-Primitive an einer Knochenrolle; fließen *vor* dem Vermaschen in den Körper ein |
| Anbau-Module (B) | Zähne, Zunge, Augen, Geweih, Flügel, Krallen, Schnurrhaare, Stacheln | Mesh mit `SOCKET_root`, Regionen-Sockel, Tags, Materialklasse pro Vertex |
| Haut-Rezept | Jelly, matter Ton, Schuppe, Chitin, Membran, Leder | Datenzeile: Bänder, Rim, Glanz, Fake-SSS, Detail-Layer |
| Kleid (Coat) | Fell, Wolle, Federn, Fischschuppen | Silhouette beim Vermaschen gebacken, Detail-Normale, Shells nur in der Nahansicht |
| Muster | Streifen, Flecken, Rosetten, Rauten, Schuppengitter, Sattel/Bauch | ca. 6 Generatoren mit Parametern; lesen nur Oberflächendeskriptoren |
| Palette | Grund, Schatten, Innen, Rim, Muster, Maul innen, Zahnfleisch, Knochen, Iris | benannte Farbrollen |
| Rig und Verben | brüllen, kauen, wedeln, flattern, rollen, schnüffeln | Verben steuern Knochenrollen, nicht Assets |
| Wachstum | 13 Stufen je Familie | Proportionskurven, Freischaltungen, Kleidlänge, Musterdichte je Stufe |

**Der wichtigste Vertrag: Oberflächendeskriptoren.** Beim Vermaschen bekommt jeder Vertex Werte mit, die nichts mit der Spezies zu tun haben:
- Position im Körperraum;
- Koordinate entlang der nächsten Kette (s plus Winkel);
- Region (Kopf, Schnauze, Lippe, Maul innen, Bauch, Rücken, Glied, Schwanz, Ohr);
- Lage zwischen Rücken und Bauch;
- Höhlung bzw. AO aus dem SDF.

Muster, Kleid und Palette lesen nur diese Werte. Deshalb passen Fischschuppen auf eine Katze und Tigerstreifen auf einen Schnecken-Drachen.

**Materialklassen bei B-Modulen.** Jeder Vertex eines Anbau-Moduls trägt eine dieser Klassen:
- `Skin` erbt die Körperhaut samt Kleid und Muster. Ein Katzenmaul-Wulst an einem Fischkörper trägt dadurch Schuppen.
- `SkinInner`, `Keratin/Knochen`, `Membran`, `Chitin`, `Auge`, `Iris`, `Tinte`, `Akzent` bringen ihr eigenes Material mit, z. B. das Elchgeweih aus Horn oder der Schmetterlingsflügel als Membran mit eigenem Muster.

**Kombinationsregeln über Tags statt Ausschlusslisten:**
- `occupies` (z. B. headTop, back),
- `needs` (z. B. Kopf vorn, Schnauze),
- `size`, `mouthType`.

Die Tags werden mit zod validiert und erweitern `packages/genome/src/rules.ts`. Sockel sind künftig **Regionen** (headTop, brow, cheek, snout, chin, back0..n, flank, shoulder, hip, tailTip) statt theta/phi. Ein Modul gibt seine Nenngröße relativ zur Region an; so passt dasselbe Geweih auf ein Krokodil und auf eine Maus.

## Das Maul: echtes Maul-Kit statt Sichel

Das Maul ist der Kern des Ausdrucks, die Entwürfe zeigen fast nur brüllende Wesen.
- **Kavität:** Oberkiefer-Primitive hängen am Knochen `head`, Unterkiefer-Primitive am Knochen `jaw`, die Maulhöhle ist eine glatte SDF-Subtraktion. Das ergibt eine echte Öffnung mit Innensack im Mesh, Region „Maul innen".
- **Vermaschen:** Gemesht wird bei etwa 30 % Öffnung. Geschlossen wird über die Kieferrotation; das geschlossene Maul liest sich als dunkler Spalt, ohne Linie.
- **Lippenlinie und Gebiss:** Die Lippenlinie besteht aus zwei Kurven. Zahn-Slots verteilen sich entlang der Kurve nach Dichte, Größe und Varianz. Gebisse (Reißzähne, Hauer, Säge, Mahlzähne) sind B-Instanzen. Damit sind **Maulform × Gebiss × Haut unabhängig**.
- **Sub-Rig:** Kiefer (Drehung und Vorschub), Mundwinkel links/rechts, Oberlippe (Fletschen), Zunge (Feder-Kette). `MouthDriver` (`packages/genome/src/locomotion/mouth.ts`) bekommt die Kanäle `snarl` und `tongue`.
- **Haut im Maul:** In den Regionen Lippe und Maul innen gelten Kleid- und Mustermaske 0 und eigene Farbrollen. Jedes Maul funktioniert deshalb mit jeder Haut.
- **Schnäbel** bleiben B-Module mit `_jaw`-Segment wie heute.

**Ketten** (Schwanz, Hals, Rüssel, Schlange) bekommen Kurven-Skinning. Der Shader wertet eine Hermite-Kurve pro Kette aus, dadurch falten Spiralen nicht mehr ein. Das liefert das „aufwändigere Rigging" für Schwanz und Rüssel.

## Look „Brücke": Shader-Architektur

- **Höchstens 8 Wesen-Pipelines** (Körper, Module, Fins, Shells, Federkarten, Raymarch, Jiggle-Blob, Schatten). Alles andere sind Daten, nie ein neuer Shader pro Kombination.
- **Material-Tabelle als DataTexture**, eine Zeile pro Haut-Rezept: 3–4 Bandschwellen, Verlaufsstärke, Rim-Stufe, Glanzart (none/dot/sheen/iridescent), Fake-SSS für Jelly und Membran, Detail-Layer, Adernmaske. Erweitert `packages/render/src/blob/blobShading.ts` (`shadeBlob`).
- **Detail-Normal-Array** (16–32 Ebenen à 256², KTX2): Schuppen, Federn, Fellstrich, Wolle, Chitin, Ton, Membranadern, Leder. Die Bandkante läuft *durch* die Detail-Normale, so werden Schuppen und Fell als gebrochene Lichtkante sichtbar. Das ist der Kern des Brücken-Looks. Auf dem Brett wird das Detail nach Bildschirmgröße abgeblendet.
- **Vertex-AO aus dem SDF** verschiebt die Bandschwelle in Falten (Maul innen, unter dem Kiefer). Das gibt die Pixar-hafte Formlesbarkeit ohne weiches Licht.
- **Muster-Generatoren** ersetzen die 11 festen Zweige in `patterns.ts`.

## Produktionsweg und Vorlagen

**Florian liefert pro Baustein** einen Ordner `assets/ref-florian/wesen/<baustein-id>/`:
1. **Orthografisches Turnaround-Blatt**: vorn, Seite, oben (gern auch hinten und 3/4), gleicher Maßstab, neutral grau, flach beleuchtet, ohne Perspektive, **nur das Teil**.
   - Bei ganzen Wesen eine Explosionszeichnung, die die Teile trennt.
   - GPT-Prompt-Vorlage: „orthographic turnaround sheet, isolated part, neutral grey background, flat lighting".
2. **Zustände**, wo nötig: Maul zu, halb offen, brüllend; Flügel gefaltet und gespreizt; Schwanz ruhig und eingerollt.
3. **Optional eine Stufenleiste** mit 13 Silhouetten wie in seinen Entwürfen: Was kommt pro Stufe dazu?
4. **Steckbrief** nach Vorlage `docs/wesen/STECKBRIEF.md`:
   - Schicht (A/B/Haut/Kleid/Muster);
   - Region und Tags;
   - Materialklassen;
   - Verben;
   - Größenspanne;
   - Wachstum.

**Weg eines Bausteins:**
1. Vorlage → KI-Bild-zu-3D pro Teil (Tripo, Rodin, Hunyuan3D oder Meshy; Konto und Kosten bei Florian).
2. Blender-Skripte headless auf Florians Mac, z. B. ein neues `tools/blender/normalize_part.py`: Ausrichtung und Körperraum-Einheiten, Retopologie bzw. Dezimieren aufs Budget, `SOCKET_root`, Auto-Gewichte auf die Rollen-Armatur, Bake von Normal, AO und Krümmung. **Nie Farbe backen** (STYLE §9).
3. **A-Module aus Sculpts:** Ein Mesh wird zu einem kleinen SDF-Volumen (40–48³), z. B. ein Dino-Kiefer oder ein Brauenwulst. Das läuft in Node mit three-mesh-bvh, also auch in der Cloud. Einfache Formen bleiben JSON-Rezepte aus Kapseln, Ellipsoiden und Rundkegeln.
4. **Alles nach Blender in Node/CI:** gltf-transform (meshopt, KTX2), Manifest, erweiterter Vertragstest `packages/render/src/materials/moduleAssets.test.ts`.
5. **KI-Bildmodelle** nutzen wir für Turnarounds, Teilvarianten und kachelbare Höhenkarten für das Detail-Array, **nicht** für Farbtexturen.

## Leistung auf dem iPhone

| Kontext | Wesen | Körper | Module/Kleid | Draw Calls |
|---|---|---|---|---|
| Brett | 36 | ≤ 1 400 Verts | ≤ 1 500 Tris, keine Shells | ≤ 6 gesamt |
| Karte | 7–14 | 2 600–4 000 Verts | Fins | gering |
| Nahansicht/Hero | 1–2 | 8–12 k Verts | Shells, Fins, Federkarten | frei im Budget |

- **Slot-Arena:** eine BufferGeometry mit festen Slots für alle Körper und eine für alle Module. Ein Slot wird nur bei einem neuen Look neu hochgeladen (`addUpdateRange`, in r186 vorhanden). Ergebnis: **ein Draw Call für alle Körper**, egal wie viele Kombinationen. BatchedMesh scheidet aus, weil es in r186 pro Instanz zeichnet (geprüft: `WebGPUBackend.js` um Z. 2124).
- **Zustand pro Wesen** (Knochen, Parameter) als Float-DataTexture statt Uniform-Block. Der heutige `BlobParamBlock` liegt an der 16-KB-Grenze; die Textur funktioniert unter WebGPU und WebGL2.
- **Cache getrennt:** `shapeHash` erzeugt ein Mesh, `styleHash` nur eine Tabellenzeile; Umfärben kostet nichts.
- **Vermaschen im Web Worker**, persistenter Cache (IndexedDB bzw. Capacitor Filesystem). Merge-Kinder benachbarter Paare werden im Leerlauf vorbereitet, weil `inherit()` deterministisch ist.
- **Sockel** werden an Knochen gebunden statt in jedem Frame auf der CPU nachgetract (heute in `CreatureRig.ts`).
- **Eine Deformationsfunktion `deformCreature`** für Körper *und* Module (Squash, Atem, Jiggle). Module schweben dann nie und dringen nicht in den Körper ein.
- **Alle Pipelines vorab kompilieren** (`renderer.compileAsync`); Impostoren nur für Setzkasten und Galerie.

## Kombi-Prüfstand (Zehntausende Kombinationen ohne Handarbeit)

- **Stichproben:** Covering-Arrays (paarweise/3-fach) über Körperplan × Maul × Gebiss × Kleid × Muster × Module × Stufe, dazu jede Nacht Zufalls-Seeds.
- **In der Cloud (vitest/Node):**
  - Mesh geschlossen; Budget und Vermaschungszeit eingehalten.
  - Maulhöhle vorhanden, Zähne innerhalb der Lippen.
  - Keine Kollisionen Modul↔Körper und Modul↔Modul.
  - Silhouette aus der Brettkamera lesbar.
  - Farbstufen weit genug auseinander (OKLab).
- **Auf dem Mac (Playwright, echte GPU):** Kontaktbögen pro Familie und Stufe, Metriken als CSV, Golden-Bilder für Signatur-Wesen.
- **Auf dem iPhone:** Stresstest mit 36 Worst-Case-Looks gegen das Gate.

## Roadmap (erst nach Freigabe, P0 verändert nichts Sichtbares)

| Phase | Ergebnis | Erweitert vor allem |
|---|---|---|
| **P0 Fundament** | ADR-0003 „Wesen-Baukasten"; `docs/wesen/STECKBRIEF.md` und Bausteinkatalog; Typen BoneRole, BodyPlan, SurfaceDescriptor, MaterialClass; Kugeln → Knochen + Primitive (verlustfrei); shapeHash/styleHash; Worker-Vermaschung; Zustands-Textur; Prüfstand v0; Leistungs-Baseline auf dem iPhone | `genome/src/body.ts`, `creature.ts`, `render/src/creature/bodyMesh.ts`, `CreatureMeshBodies.ts`, `blob/blobParamsUniforms.ts` |
| **P1 Arena** | Körper- und Modul-Arena, Materialklassen, Sockel an Knochen, `deformCreature`, Draw-Call-Test, iPhone-Gate | `CreaturePool.ts`, `CreatureRig.ts`, `partMaterial.ts` |
| **P2 Form** | neue Primitive und `carve`, Sculpt-Volumen, Regionen-Sockel, Körperpläne als JSON (`content/genome/bodyplans/`), Kurven-Skinning | `genome/src/sdf.ts`, `blob/compileSdf.ts`, `rules.ts`, `custom/schema.ts` |
| **P3 Maul-Kit** | Kavität, Lippenlinie, Gebisse, Zunge; Nachweis an 3 Körpern × 3 Häuten | `locomotion/mouth.ts`, `bodyMesh.ts` |
| **P4 Brücke-Material** | Material-Tabelle, Detail-Normal-Array (KTX2), Muster-Generatoren, gebackene Kleid-Silhouetten, Vertex-AO | `blob/blobShading.ts`, `blob/patterns.ts`, `materials/*` |
| **P5 Pipeline** | Steckbrief → KI-3D → `normalize_part.py` → Bake → gltf-transform in CI; erste Familie über 13 Stufen komplett | `tools/blender/*`, `export_assets.py`, `moduleAssets.test.ts` |
| **P6 Ausbau** | Flügel- und Rüssel-Sub-Rigs, Kleider in der Nahansicht, Werkstatt-Editor „alles mit allem" auf dem iPhone, nächtlicher Prüfstand, Hunderte Bausteine | `lab/creature/editor/*`, `EditorCreatures.tsx` |

**Aufgabenteilung:**
- Florian liefert Vorlagen und Steckbriefe, betreibt den KI-3D-Dienst und lässt Blender auf dem Mac laufen.
- Der Agent schreibt Code, Skripte, Shader und Tests. Der Agent arbeitet auch in der Cloud, nur ohne echte GPU und ohne Blender.

## Risiken und offene Entscheidungen

- **Brett-Auflösung:** 900 Verts reichen für Mäuler nicht; nötig sind etwa 1 200–1 600. Die Vermaschung pro Look sollte im Worker unter 40 ms bleiben.
- **Lippen beim Schließen:** Überlappen sie störend, ist die Ausweichlösung zwei Mesh-Zustände (offen/zu).
- **Detail-Normalen auf Brettgröße:** Ob sie rauschen, entscheidet Florian am Gerät.
- **Nahansicht:** Ein SDF-Raymarch mit allen neuen Primitiven ist teuer. Alternative: hochaufgelöstes Mesh.
- **Technik:** ASTC/KTX2 unter WebGPU in der WKWebView prüfen, ebenso die Kosten von Vertex-Texture-Fetch im WebGL2-Rückfall.
- **KI-3D:** Stilkonsistenz, kommerzielle Lizenz des Dienstes, Retopologie-Aufwand.
- **Kleine Entscheidungen:** 3 oder 4 Lichtstufen pro Kontext; ob Jelly auf dem Mesh-Pfad opak bleibt.

## Verifikation

- **Jede Phase:**
  - `pnpm typecheck`, `pnpm test` (inklusive Vertragstests und Prüfstand) und `pnpm e2e` grün.
  - Draw-Call-Test: Brett mit 36 *verschiedenen* Looks ≤ 6 Draw Calls für Wesen.
- **P0:** `/lab/creature` sieht pixelgleich aus wie vorher (Golden-Bilder); iPhone-Baseline über `?bench` dokumentiert.
- **P1 und P4:** iPhone-16-Messung (≥ 58 fps, p99 < 20 ms) in `docs/progress/` festhalten.
- **P3:** Kontaktbogen „Dino-Maul × 3 Körper × 3 Häute" brüllend, kauend und geschlossen, von Florian am iPhone abgenommen.
- **P5:** Ein Baustein von Florians Vorlage bis ins Spiel in einem Lauf; erweiterter `moduleAssets.test.ts` grün.
