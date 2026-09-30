# ADR 0002 — Unendliche Kugel

**Status:** beschlossen am 2026-09-30 (Florian: „absolute Grundvoraussetzung“)

## Kontext

Bisher ist die Karte ein geschlossener Planet: Radius 32, Würfelkugel mit 3 × 3 Chunks je Seite, zehn Welten als Breitenbänder, 100 Level als Spirale von Pol zu Pol. In der Blender-Bibliothek sah Florian, dass die Welt endlich ist. Seine Vorgabe: „Es soll später unbegrenzt viele Zonen geben, und man soll das Gefühl haben, unendlich lang an der Kugel zu drehen, wie bei Best Fiends oder Candy Crush, nur eben auch mehr nach links und rechts.“ Die organische Bestückung und der Earle-Look sollen bleiben oder besser werden.

## Entscheidung

Die Welt ist eine **unendliche Ebene** (Datenmodell). Angezeigt wird sie als **Kugel um den Blickpunkt** (Anzeige-Abbildung). Die Kugel ist nur eine Darstellung, keine geschlossene Topologie.

1. **Weltkoordinaten:** Ebene mit x = seitlich und z = entlang des Pfads (vorwärts = −z), Welteinheiten wie bisher. Höhen kommen aus 2D-Feldern. Chunks liegen im Gitter (cx, cz) ∈ ℤ², deterministisch aus Seed und Chunk-Index. Sie werden im Radius um den Fokus gestreamt, Entferntes wird verworfen.
2. **Anzeige:** azimutale, abstandstreue Abbildung um den Fokus f auf eine Kugel mit Anzeigeradius R (≈ 32 wie bisher). Ein Punkt p mit Abstand d und Richtung θ von f landet auf dem Kugelpunkt mit Bogen d / R in Richtung θ, die Höhe geht entlang der Kugelnormalen. Die Abbildung gibt es als TSL-Knoten für alle Materialien (Gelände, Bäume, Requisiten, Wasser, Pfad, Brett, Müll, Riesenbaum) und als CPU-Funktion (Held, Brett, REX, Kamera, Picking). Inhalte jenseits von etwa 0,5 π R liegen hinter dem Horizont und werden nicht gezeichnet.
3. **Drehen heißt Fokus verschieben:** Die Trackball-Geste verschiebt f auf der Ebene, mit Trägheit. Optisch dreht sich die Kugel ohne Ende, in jede Richtung. „Kamera zum Knoten“ heißt: Der Fokus gleitet zum Knoten.
4. **Präzision:** schwebender Ursprung. Chunk-Meshes liegen in chunk-lokalen Koordinaten, die Modellmatrix ist Chunk-Ursprung minus Fokus, also kleine Zahlen. Der Fokus wird auf der CPU in doppelter Genauigkeit geführt.
5. **Schatten:** Sie werden in Ebenenkoordinaten ohne Anzeige-Abbildung berechnet, mit der Sonne relativ zur Kamera. Empfänger schlagen mit ihrer Ebenenposition nach, nach der bisherigen Regel „nur die finale Projektion biegen“. Die Kaskaden decken das sichtbare Gebiet um f ab.
6. **Pfad:** Er läuft unendlich entlang −z und mäandert wie bisher (Routing durch die Landschaft, Knoten auf ihren Elementen). Level 1–100 bleiben, danach folgen Knoten für künftige Level: gesperrt bzw. „bald“, später generierte Level.
7. **Zonen und Welten:** eine Folge entlang z. Die Welten 01–10 (je 10 Level) bleiben wie bisher, danach entstehen **prozedurale Welten**: Palette, Gelände, Vegetation und Merkmale aus Generatoren, deterministisch je Index, ohne Wiederholung, mit weichen Übergängen. Seitlich (±x) variieren die Nachbar-Biome, damit auch links und rechts ständig Neues entsteht.
8. **Merkmale** wie Seen, Flüsse, Wasserfälle, Felsen, Ruinen, Sümpfe, Schneefelder, Müll und Riesenbäume werden je Region geplant, nicht mehr für den ganzen Planeten.

## Folgen

- Großer Umbau in `packages/world`, `packages/render/src/earle`, `apps/game/src/flow`, in den Labs und im Blender-Export. Die Blender-Bibliothek zeigt dann einen Kartenausschnitt statt eines ganzen Planeten.
- Alle Kunst-Bausteine bleiben und werden auf die Ebene umgestellt: Bäume, Wasser, Felsen, Müll, Riesenbaum, Pfad, Brett, Schatten und Verläufe.
- Die Anzeige-Abbildung ersetzt das bisherige `bend()` für die überzeichnete Krümmung. Die Kugel wirkt wie bisher, dreht sich aber unendlich.

## Umsetzung — Plan (2026-09-30, vor dem Umbau)

Stand vorher: Planet R = 32, Würfelkugel 6 × 3 × 3 Chunks, vier Zonenbänder mit nahen und fernen Welten, Pfad als Spirale (Route 471 Einheiten, im Mittel 4,2 Einheiten zwischen zwei Knoten), 41–49 Draw Calls auf der Karte (Hoch, Handy). Alles rechnet mit Einheitsrichtungen `(dx, dy, dz)`.

**Räume.** *Ebene* = Weltdaten (x seitlich, z längs des Pfads, vorwärts −z, y Höhe). *Flacher Raum* = Szene-Raum der Ebeneninhalte: `F = (x − fx, R + y, z − fz)`, der Fokus f liegt am Scheitel (0, R, 0). *Anzeigeraum* = Kugel mit Mittelpunkt im Ursprung (wie der alte Planetenraum, nur dreht er sich nicht mehr): Rig, Kamera, Sonne und Himmel bleiben, wo sie waren. Nahe am Scheitel sind flacher Raum und Anzeigeraum gleich.

**Anzeige-Abbildung** (`packages/render/src/earle/display.ts`, eine Definition als TSL-Knoten und CPU-Funktion): `q = F.xz`, `α = |q| / R`, `n = (sin α · q̂.x, cos α, sin α · q̂.z)`, Anzeigepunkt `(R + h − (1 − cos α) · c · R) · n` mit `h = F.y − R` und dem alten Krümmungs-Boost c (Karte 0,14). Umkehrung über `α = atan2(|P.xz|, P.y)` (gut konditioniert). Materialien setzen `positionNode = M⁻¹ · display(M · p)` (M = Modellmatrix, flacher Raum); starre CPU-Objekte (Held, Brett, REX-Anker, Kamera-Schienen) nehmen den starren Rahmen der Abbildung an ihrem Ankerpunkt (Drehung um die Tangentialachse um −α). Horizont: Chunks jenseits ≈ 0,6 π R werden nicht geladen, Chunks hinter der Kugel nicht gezeichnet.

**Datenmodell** (`packages/world/src/plane/`): 2D-Rauschen ohne Periodenraster (Gitter-Hash statt Permutationstabelle, keine Wiederholung nach 2,8 km). Höhenfeld, Waldmaske, Haine wie bisher, nur mit (x, z). Chunks 16 × 16 Einheiten im Gitter (cx, cz), deterministisch aus Seed und Index; Netz in chunk-lokalen Koordinaten, dazu die exakte Netzhöhe (`chunkMeshHeightAt`, nichts schwebt).

**Weltenlage.** Rückgrat des Pfads `x_b(z)` (langsame analytische Schwünge). Pfadwelten als Folge entlang z: 01–10 aus `content/` (Reihenfolge nach Zonen: 09 Goldene Wiese 1–10, 06 Schneekiefern 11–20, 04 Violette Hänge 21–30, 10 Juwelenwald 31–40, 05 Wurzelwelt 41–50, 02 Nebelhügel 51–60, 07 Kathedralenwald 61–70, 08 Rote Scheune 71–79, 01 Flechtenbaum mit dem Riesenbaum 80–95, 03 Kuppelbaum 96–100), danach prozedurale Welten mit je 10 Leveln, vor dem Start (z > 0) prozedurales Vorland. Das Pfadband ist ±13 Einheiten breit (verrauschter Rand); seitlich davon liegen Zellen (≈ 30 × 38 Einheiten, versetzt) mit Nachbarwelten: nahe am Start bevorzugt die übrigen Autorenwelten, weiter draußen prozedurale Welten — links und rechts kommt ohne Ende Neues. Grenzen bleiben Earles Tintenrisse; Rissgrenzen zwischen Pfadwelten schließen sich mit dem Fortschritt. Terrainformen werden über ±2 Einheiten an den Grenzen gemischt.

**Prozedurale Welten** (Index ≥ 10): deterministisch je Index aus zwei Elternwelten (Hash), Palette in OKLab gemischt und im Farbton gedreht (Tinte bleibt dunkel, ein Akzent), Gelände, Vegetationsfamilie, Haine, Rinde, Merkmale und Requisiten aus den Eltern gemischt und mutiert; nie zweimal dieselbe Kombination.

**Merkmale je Region**: Region = Pfadabschnitt k oder Seitenzelle (c, j). Seen, Flüsse, Felsen, Schneefelder, Wehen, Müll und Fokus-Slots werden je Region geplant (Cache mit Obergrenze), bleiben mit Rand in ihrer Region; Abfragen an (x, z) lesen nur die Region des Punkts. Pfadregionen halten den Pfadkorridor frei (wie bisher `pathDistance` zum Rückgrat).

**Pfad** (`packages/world/src/plane/path.ts`, reine Daten): Viterbi-Routing wie bisher (Täler und Hänge, Mäander, Kosten für Wasser und Felsen, Felsanker), aber je Pfadabschnitt; Abschnittsgrenzen liegen auf dem Rückgrat, deshalb ist jeder Abschnitt unabhängig und deterministisch (beliebiger Zugriff, auch Level 10 000). Knoten gleichabständig je Abschnitt, ruhen auf ihren Elementen; Riesenbaum-Abschnitt 80–95 wird wie bisher eingespleißt. Nach Level 100 gesperrte, „kahle" Steine.

**Streaming und schwebender Ursprung**: Fokus in doppelter Genauigkeit auf der CPU. Jedes Ebenen-Objekt hat einen eigenen Anker (Chunk-Ursprung, Pool-Anker beim Neuaufbau, Baum-Slot …); seine Position ist `Anker − Fokus`, also immer kleine Zahlen. Chunks im Radius um den Kamerafußpunkt laden (bisheriges Budget `loadsPerFrame`), entladen nach Frist, CPU-Cache mit Obergrenze; LOD nach Abstand (halbe Auflösung in der Ferne, Schürzen gegen Risse). Welten bekommen Slots (feste Zeilenblöcke im Paletten-Atlas, 256 Zeilen, LRU nach Sichtbarkeit), Shader lesen Slot-Tabellen statt Weltindizes.

**Schatten** in Ebenenkoordinaten: Kaskaden, Filter, Kontakt und Werferregeln bleiben (Schatten v3). Neu ist ein Verzug im Schattensystem: Werfer werden im Schattenpass mit der Umkehrabbildung in den flachen Raum gelegt, Empfänger schlagen mit ihrer flachen Position nach (dieselbe Umkehrung im Fragment), der Fit misst die sichtbaren Bodenpunkte weiter per Strahl gegen die Anzeigekugel und bildet sie in den flachen Raum ab. Beleuchtung (N·L) ebenfalls flach: jede Stelle der Ebene sieht die Sonne gleich flach (10°), Eigen- und Schlagschatten bleiben eine Tintenform — die frühere Nachtseite des kleinen Planeten entfällt, lange Schatten gibt es bis zum Horizont.

**Bedienung**: Die Trackball-Geste schiebt den Fokus (Fingerweg × Welteinheiten je Pixel, Trägheit τ = 0,4 s), in jede Richtung ohne Grenze; „zum Knoten" gleitet der Fokus. Anflug, Aufbruch, Baum-Schiene, REX und Spielfeld bleiben, sie rechnen ihre Posen über die Abbildung.

**Reihenfolge**: 1) Weltmodell mit Tests, 2) Abbildung, Slots, Streaming, Vegetation, Merkmale, Schatten, Earle-Lab, 3) Flow (MapWorld, FlowScene, Pfad, Held, Brett, Riesenbaum, Müll), 4) prozedurale Welten, Seitenvielfalt, mehr Wasser und grüne Sümpfe am Anfang, 5) Labs, Editor, Blender-Export, Doku, 6) Tests, E2E (endloses Schwenken), Messungen.
