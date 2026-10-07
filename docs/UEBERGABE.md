# Übergabe (aktueller Stand)

> Diese Datei wird am Ende jedes Arbeitsblocks **überschrieben**: Wo stehen wir, was ist offen, was ist der nächste Schritt. Historie in Git.

**Stand:** 2026-10-07 spät, Sitzung „Wesen-Werkstatt“ (Florians Mac, Branch `main`). Plan: [`docs/plans/2026-10-07-wesen-werkstatt.md`](plans/2026-10-07-wesen-werkstatt.md) (freigegeben). Produktion Teil **Charaktere**; das alte Spiel bleibt unangetastet.

## Wo wir stehen

- **Phase 0 erledigt:** lokale Karten-Commits gesichert (inkl. Boden-Shader-Fix für WebKit), Cloud-Doku und `claude/grundblobs` gemergt, Plan im Repo, CLAUDE.md aktualisiert.
- **Phase 1 (Grundformen-Beweis) im Bau:**
  - `packages/creature` (K0): Bauplan-Schema mit Reglerkatalog (`BAUPLAN_REGLER`), SDF-Szene (Rundkegel, Ellipsoid mit Würfel-Blend, Rotationskörper als glatte Radiusfunktion, weiche Vereinigung/Subtraktion, Hüllquader-Culling), Surface Nets mit Narrow-Band, Taubin, Projektion; Deskriptoren (Knochengewichte, Bogenlänge/Winkel/Umfang/Bauch-Rücken, Regionen Rachen/Lippe/Gesicht/Höhle, Höhlung), prozedurales Skelett (Körper 3, Hals, Kopf, Unterkiefer, Beine, Schwanz/Schlange). 10 Tests, Bauzeiten 56³ ≈ 0,1–0,45 s.
  - **Maul (K1):** Maulvolumen Loch ↔ Keil, stufenlos in der Höhe, Mundwinkel nach hinten, Kiefer getrennt bis „kein Unterkiefer“ (Kinnschnitt), Biss, Lippenwülste bzw. Lippenring, Zähne auf den Lippenkurven (oben/unten versetzt, Eckzähne, Hauer), Zunge, Kieferzone als Gewichte, **Verschluss-Morph** (`eeClosed`, perfekt zu), Öffnungswinkel aus der Geometrie. `maul.sichtbar` für Grundblobs ohne Maul.
  - **Jelly (K2):** `creature2/material/jelly.ts` — Port des Cloud-Jelly auf den Mesh-Weg: gebackene Dicke (`eeThick`) mit Blickwinkel, Absorption, dickenabhängige Eigenfarbe, Brechung (Viewport-Textur), Innenkern und Bodenschicht als Strahlschnitte, Bläschen, Softbox-Glanz, Glasrand, Schlitzauge. Vorlage „Jelly (pezenpez)“.
  - **Material (K2, erste Fassung):** `packages/render/src/creature2`: Figurenlicht rechts oben, Wertstufen mit gefederten Kanten und Verlauf in der Stufe, OKLab-Schattenregel, Kernschattenband, Höhenverlauf, Rim, Papierkorn, Glimmer, Regionen, Schlitzaugen mit Blinzeln, **Musterebene** in Wirbelsäulen-Koordinaten (Streifen mit Spitzen, Ringel, Punkte, Rosetten, Platten, Schuppen, Flecken) mit Gesichts-/Lippenmaske. Stil-Vorgabe als `WesenStil` (noch nicht als Datei).
  - **Maul-Morphs:** Verschluss (`eeClosed`) und Spitzmund (`eePucker`, Lochmaul weitet sich radial; Kieferdrehung nach Maulform gewichtet). Alle Deskriptoren liegen in **einem** verschachtelten Vertex-Puffer (WebGPU erlaubt nur 8). GPU-E2E `apps/game/e2e/wesen-webgpu.spec.ts` (echte GPU: alle Pipelines kompilieren).
  - **Lab `/lab/wesen`:** Drehteller, Earle-Wiese oder weißer Grund, Worker-Vermaschung (grob 30³ beim Ziehen, fein 56³), Vorlagen (fester Blob, Grundblob, Keilmaul, Lochmaul, Maul oben/unten, ohne Unterkiefer, Giraffe, Schlange, Vierbeiner), Regler aus dem Katalog, Verben Maul auf/zu, Blinzeln.
- **Läuft (Agent, Worktree, Branch des Agenten):** L1 Grundformen-Lab-UI (Tabs mit Würfel/Schloss/Reset, Undo, Autosave, **Referenzmodus mit Bild-Overlay**, Brett-Ansicht, Speichern nach `content/creatures/`, Screenshot-Harness `e2e/wesen-shots.spec.ts`, E2E). Danach Merge durch die Leitung.

## Offen (nächste Schritte)

1. L1-Ergebnis mergen (Referenz-Overlay, Harness), dann Vorlagen im Referenzmodus gegen die Bögen nachstellen.
2. Maul-Feinschliff gegen Bild 5/14 im Referenzmodus (Lippenwulst, Lochmaul-Rand, Oberkiefer), Vorlagen nachstellen; Muster-Feinschliff (Platten-Kontrast, Schuppen-Relief).
3. Look-Abnahme 1 mit Florian: Montage der Vorlagen (Harness aus L1) neben Bild 18 oben / Bild 3 / Bild 5 / Bild 14.
4. Phase 2 nach Freigabe: Augen (K3), Beine/Gang/Schwimmen/Fliegen (K4), Anbauten (K5), Fell-Büschel/Feuer/Nebel (K6), Verschmelzen (K7), Editor (K8), Vorlagen (K9), Leistung/iPhone (K10).
5. Idee aus der Cloud-Session nutzen: die 13 Grundformen der Vorlage (`docs/look/grundblobs/`) als Stufenprofile (Tab „Stufen“) vermessen.

## Fallen / Hinweise

- Ellipsoid-Radien nie 0 (NaN vergiftet das Feld) — geklemmt; Zeit-Test prüft Vertexzahl je Grundform.
- `evalScene` nutzt Hüllquader-Culling: Primitive, die das Smooth-Min nicht mehr ändern können, werden übersprungen; `compileScene` cacht Hüllquader je Szene (Primitive gelten als unveränderlich).
- Deskriptor `eeSpine.x` ist die **Bogenlänge** (Körpereinheiten), nicht normiert. Attribute: `eeSpine` (4), `eeRegion` (4), `eeExtra` (AO, Dicke), `eeClosed` (3), `eePucker` (3) in einem InterleavedBuffer (16 Floats).
- Rotationskörper: Innen-Test nur über den Radius (sonst Unstetigkeit an Deckel/Standfläche → Spitzen); Regressionstest `sdf/wuerfel.test.ts`.
- TSL-Helfer als normale Funktionen schreiben (inline `Fn` mit `return` warnt in r186).
- Vorschau für die Leitung: `game-dev-http` (5174); Florians Server 5173 nicht anfassen.
