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
