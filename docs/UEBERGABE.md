# Übergabe (aktueller Stand)

> Diese Datei wird am Ende jedes Arbeitsblocks **überschrieben**: Wo stehen wir, was ist offen, was ist der nächste Schritt. Historie in Git.

**Stand:** 2026-10-07 spät, Sitzung „Wesen-Werkstatt“ (Florians Mac, Branch `main`). Plan: [`docs/plans/2026-10-07-wesen-werkstatt.md`](plans/2026-10-07-wesen-werkstatt.md) (freigegeben). Produktion Teil **Charaktere**; das alte Spiel bleibt unangetastet. Florian testet live im Preview (5173) und gibt sofort Rückmeldung — seine Punkte stehen unten unter „Florians offene Punkte“.

## Wo wir stehen

- **Phase 1 (Grundformen-Beweis) auf `main`:** `packages/creature` (Bauplan, SDF-Szene, Dual Contouring mit QEF, Deskriptoren, Skelett), Maul (Loch ↔ Keil, Höhe, Mundwinkel, Kiefer bis „ohne Unterkiefer“, Schlauchlippen, Zähne, Zunge), Jelly- und Earle-Wesen-Material mit Musterebene, Lab `/lab/wesen` (L1 gemergt: Tabs mit Würfel/Schloss/Reset, Undo, Autosave, Referenzmodus mit Bild-Overlay, Brett-Ansicht, Speichern nach `content/creatures/`, Harness, E2E). Held 88³ ≈ 0,3–1,1 s im Worker, Vorschau 24–36³.
- **Kieferrig neu (dieser Block):** Zwei Kieferknochen. Der **Oberkiefer** (`oberkiefer`, Oberkopf samt Augen und oberen Zähnen) dreht beim **Öffnen** um die Mundwinkel-Sehne nach hinten, Anteil `maul.oeffnungOben` (Standard 0,6) — Florian: „hauptsächlich über den Oberkiefer“. Der Anteil läuft bei tief sitzendem Maul auf 0 (dort wäre „oben“ der ganze Körper), bei hohem Maul klappt der Deckel. Beim **Schließen** aus dem Bauzustand bewegt sich fast nur der Unterkiefer (`SHARE_CLOSE` 0,12), damit der gebaute Kopf seine Form behält. Reine Drehung, kein Hub — ein Hub-Anteil riss die Mundwinkel auf. Eine Formel für Bau, Darstellung und Tests: `mouth/pose.ts` (`jawRig`, `jawPose`, `jawTransforms`, `posedPositions`).
- **Verschluss v2 (`mouth/closing.ts`):** Unter- und Oberkieferzone bewegen sich **starr** mit ihrem Kiefer (unabhängig von den geglätteten Skin-Gewichten, die vorher die Lücke halb offen ließen), die Lippenkanten treffen sich je Azimut exakt an der Naht (`mouth/seal.ts`, gemeinsam mit dem Zahnsitz), die Unterlippenkante schiebt sich eine Fase hinter die Oberlippe, Dach und Boden der Höhle legen sich als dünne Tasche auf die Naht. Innen-Gewicht aus der Geometrie (breit), nicht aus dem schmalen Farb-Deskriptor.
- **Zähne:** am **geschlossenen** Zustand verankert und in die Ruhelage ihres Knochens zurückgedreht (geschlossen sitzen sie exakt auf der Naht); `zaehne.aussen` 0 = verschwinden geschlossen im Gegenkiefer (Aal, schräg ins Maul zeigend), 1 = Fangzähne außen über der Gegenlippe; Zähne, die geschlossen nicht passen, werden gekürzt oder weggelassen; zu den Mundwinkeln hin keine Zähne, wo der Spalt schmaler als ein Zahn ist. Zunge zieht sich beim Schließen in den Unterkiefer zurück. Augäpfel sitzen tiefer (Rex: Mitte unter der Fläche, kein Ball über der Silhouette).
- **Messung statt Augenmaß:** `mouth/verschluss.test.ts` (88³, fünf Varianten) misst die Restlücke per Strahlen (Rachenfläche von vorn sichtbar?), das Ausfransen (Unruhe des Bewegungsfelds in der sichtbaren Lippenzone) und ob Zahnspitzen geschlossen von außen sichtbar sind. Stand: Lücke 0 % bei Keil, Vierbeiner, Maul unten, Schlange; „Maul oben“ 3 % am Mundwinkel. Harness: `EE_MAUL=bau|zu|auf` rendert die Kieferstellung (`docs/progress/wesen-lab-kontaktbogen[-zu|-auf].png`).

## Florians offene Punkte (07.10., live im Preview)

1. **Zwischenstufen Loch → Keil wie der Aal** (Bild 16, Kopie `docs/progress/ref-aal-maul.png`): runde organische Öffnung, Lippen unsichtbar bzw. Dicke einstellbar, immer scharfe Kanten, flächig-satte Färbung (flaches Maroon, rosa Zunge, gleichmäßige Dreieckszähne rund um den Rand). → Maulhöhle als **ein** Öffnungsprofil (Breite, Rundung, Spitzigkeit) statt zweier überblendeter Formen; Lippen bei `lippe` 0 wirklich weg; Schnitt-k enger.
2. Offenes Rundmaul organisch wie das Giraffen-Gähnen: **bohnenförmig mit großer runder Nase darüber**. Rex/Drache/Schlange auch mit **ganz gebogenem Unterkiefer**.
3. Viele Varianten/Extreme prüfen und genau mit den Referenzen abgleichen; **Unterkiefer direkt am Hals** (Kinnschnitt) wirkt ausgefranst statt scharf.
4. **Maul ganz oben: kein Platz für Augen** → Augen müssen wie Glubsch-/Schneckenaugen nach oben wandern; immer genug Platz für Augen.
5. Schlange: Lippenwulst liegt über der Verbindung der Kiefer (Mundwinkel) — Lippen müssen am Winkel zusammenlaufen.
6. **PezenPez ist DER Grundblob**: alle Grundblobstufen entstehen aus ihm durch Form und Größe — Vorlagen entsprechend (Jelly = Ur-Bauplan, Grundformen als Morph davon).
7. Grundblobs haben zu viele Dreiecke (Held 88³: 43–56 k bei glatten Blobs). Brett-LOD 32³ und Dezimierung glatter Flächen (K10).
8. Giraffenform noch sehr weit von Bild 6.
9. Noch sichtbar auf den Bögen „zu“: Grundblob mit Lippenplatte und zwei Winkelzähnen, „Maul oben“ mit Riss am Mundwinkel und drei kleinen Zähnen am Deckel, „Maul unten“ mit dunklem Saum an der Unterkante.

## Nächster Schritt

Punkt 1 (Aal-Profil, Lippendicke, Schnitt-k), dann 3 und 9 im Referenzmodus prüfen, dann 4/5, dann Look-Abnahme 1 mit Florian (Montage neben Bild 3/5/14/16/18).

## Fallen / Hinweise

- Ellipsoid-Radien nie 0 (NaN vergiftet das Feld) — geklemmt; Zeit-Test prüft Vertexzahl je Grundform.
- `evalScene` nutzt Hüllquader-Culling; `compileScene` cacht Hüllquader je Szene (Primitive gelten als unveränderlich).
- Deskriptoren in **einem** InterleavedBuffer (17 Floats): `eeSpine` (4), `eeRegion` (4), `eeExtra` (AO, Dicke, Kantenmaß), `eeClosed` (3), `eePucker` (3) — WebGPU erlaubt nur 8 Vertex-Puffer.
- Rotationskörper: Innen-Test nur über den Radius (sonst Unstetigkeit an Deckel/Standfläche); Regressionstest `sdf/wuerfel.test.ts`.
- TSL-Helfer als normale Funktionen schreiben (inline `Fn` mit `return` warnt in r186).
- **Nie Kapselketten mit großem Smooth-Min** für glatte Schläuche (Nahtbeulen): Schläuche sind `TubePrim`, Gelenkketten nur mit k ≈ 0,12 · r.
- Der Deskriptor „Rachen“ ist absichtlich schmal (Farbe); als Verformungsgewicht taugt nur die geometrische Tiefe (`closing.ts`).
- Lab per Browser-Automatisierung: Knöpfe über `find`-Referenzen veralten nach jedem Neuaufbau des Panels (Klick landet auf Reglern). Für Bilder den Harness nehmen (`EE_MAUL`, `EE_VORLAGEN`), nicht klicken.
- Vorschau für die Leitung: `game-dev-http` (5174); Florians Server 5173 nicht anfassen.
