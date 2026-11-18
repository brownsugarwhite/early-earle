# Recherche: Spielnetz aus dem Subdivision-Käfig (02.11.2026)

> Zuarbeit zur [Gegenprüfung](../plans/2026-11-02-gegenpruefung-liniennetz.md) (Abschnitt 3.6 und 9.2) und zum
> [Prüfplan P0a](../plans/2026-11-02-pruefplan-p0-p3.md). Frage: Welche Unterteilungsstufe wird das Spielnetz, wie bleiben
> Cel-Stufen auf einem groben Netz glatt, wie groß ist der Silhouettenfehler, wie passen Morph-Ziele und Knochen dazu, und
> ist nachträgliches Reduzieren ein Weg? Belegtes ist als „belegt“ markiert, Gefolgertes als „Schluss“.

**Grundrechnung** (exakt): Ein Käfig mit F Vierecken hat auf Stufe L genau F·4^L Vierecke = 2·F·4^L Dreiecke. 400 Flächen →
3 200 (L1) / 12 800 (L2) / 51 200 (L3); 1 000 Flächen → 8 000 (L1). Der heutige Maul-Einsatz (9 500–13 000 Flächen) liegt
schon auf Stufe 0 bei 19 000–26 000 Dreiecken, auf L1 bei 76 000–104 000 — das 10- bis 13-Fache des Budgets.

## 1. Welche Stufe als Spielnetz

Belegt:
- Film (Pixar/OpenSubdiv): Der Käfig wird animiert, die Grenzfläche beim Rendern ausgewertet; bei fester Topologie werden die
  Gewichte wiederverwendet, nur die Positionen neu kombiniert (OSD-Doku).
- Laufzeit-Subdivision in Spielen: Call of Duty: Ghosts (GDC 2014, Brainerd) tesselliert Catmull-Clark mit einer
  Bildschirmmetrik. Brainerd u. a. 2016: „At low tessellation rates, off-line subdivision outperforms hardware tessellation“;
  laut Retrospektive (c0de517e) wurde die Technik auf Konsolen nie breit eingesetzt.
- Übliche Spielpraxis: Subdivision ist die Hochpoly-Quelle zum Backen, das Spielnetz wird von Hand gebaut; der Käfig „sieht
  wie ein Ingame-Lowpoly aus“ (Polycount). Blender führt Viewport- und Render-Stufe getrennt und hat „Use Limit Surface“
  („places vertices at the surface that would be produced with infinite levels of subdivision“).
- Zahlen: Guilty Gear Xrd ≈ 40 000 Dreiecke je Figur (PS4, 1080p, Nahaufnahmen; für PS3 reduziert), keine Normal-Maps,
  1×2K + 2×1K Texturen. Wind Waker (GameCube, 480p): Link ≈ 2 800 Dreiecke (Sekundärquellen). Mobil: Unity (alte Doku)
  300–1 500 Polygone je Mesh; Android/Arm-Demos 360 (Masse) bis 11 000 (Held); Händler-Richtwerte 3 000–10 000.
- Eine Regel „Stufe 1 = Spielnetz“ steht in keiner Quelle; sie ist Konvention. Schluss aus 2·4·F: Bei ≤ 8 000 Dreiecken ist
  L1 die einzige Stufe, die einen 400–1 000-Flächen-Käfig trägt (L2 nur bis 250 Flächen). 36 × 8 000 = 288 000 Dreiecke je
  Bild sind für ein iPhone 16 unkritisch (Schluss).

## 2. Normalen

Belegt:
- OSD: Käfigpunkte haben keine Normalen; Normalen des verfeinerten Käfigs sind Näherungen; Normalen und Tangenten lassen sich
  an jeder Stelle der Grenzfläche exakt auswerten. Unendlich scharfe Falten sind Tangentenunstetigkeiten (Normale springt);
  halbscharfe Falten (0–10) geben „fillet-like blends without adding extra vertex rows“.
- Arc System Works (GDC 2015): Cel-Shading ist binär, kleine Normalenfehler werden zu Flecken; automatische Normalen treffen
  die Absicht nicht; Normalen werden von Hand gesetzt, bleiben Einheitslänge und ersetzen Normal-Maps. In Blender heißt
  dasselbe „Data Transfer → Custom Normals“ von einem glatten Proxy (Anime-Standard); Falle: Deform-Modifier nach Data
  Transfer aktualisierten Normalen nicht (Bug #94838). „Weighted Normal“ (Flächengröße/Winkel, Keep Sharp) ist das
  Hard-Surface-Werkzeug.
- glTF erlaubt Morph-Targets für POSITION, NORMAL, TANGENT (Tangenten ohne w); three.js GLTFLoader legt NORMAL-Targets in
  `morphAttributes.normal`, `morphTargetsRelative = true`.

Schluss: Grenzflächen-Normalen auf dem L1-Netz sind das Pro-Vertex-Gegenstück zum Normal-Map-Backen — etablierte Mechanik,
anders gespeichert. Jedes Target braucht ein eigenes Normalen-Delta (Grenznormale des posierten Käfigs minus Ruhe), sonst zeigt
das Fressen-Maul den Ruhe-Terminator; nach dem Mischen renormieren (three.js tut das). Scharfe Falten = gesplittete Vertices
mit zwei Normalen auf L1; halbscharfe = eine Normale, Rundung aus der Grenzfläche.

## 3. Silhouettenfehler

Formel (belegt): Sagitta s = r − √(r² − l²/4) ≈ l²/(8r). Für n Segmente auf einem Kreis mit Bildschirmradius R:
s = R(1 − cos(π/n)) → 8: 7,6 % R, 16: 1,9 %, 32: 0,48 %, 64: 0,12 %. Bauch R = 200 px: 15 / 3,8 / 0,96 / 0,24 px; Schnauze
R = 50 px: 3,8 / 0,96 / 0,24 / 0,06 px. Umgekehrt: Toleranz ε ⇒ Kantenlänge l ≤ √(8Rε); bei ε = 1 px und R = 200/50/10 px →
40/20/9 px.
Toleranzen in der Praxis (belegt): Reyes dicet auf ≈ ½ px; Nanite zielt 1 px je Kante (r.Nanite.MaxPixelsPerEdge = 1);
UE-Tessellation 2 px je Kante (Karis-Blog); PostScript-Flatness 1 Gerätepixel; NVIDIA: Dreiecke < 8 px sind ineffizient.
Schluss: Bei 300–500 Gerätepixeln (iPhone 16: 460 ppi, DPR 3) sind 1–2 Gerätepixel unsichtbar. L1 mit 16 Punkten je Ring
liegt am Rumpf bei ≈ 4 px — grenzwertig; L1 braucht Limit-Positionen (sonst kommt der systematische Schrumpf dazu) und ≥ 24
Punkte je Rumpfring. Wichtig: Der Fehler ist relativ zur **Grenzfläche** zu messen, nicht zu L3.
Adaptiv ohne Tessellation-Stufe: Nießner/Loop 2012 (Compute-Kernels + Tessellator, sichtabhängige LOD); Dupuy–Vanhoey 2021
(parallele Halbkanten-Verfeinerung, OpenGL-Backend); Dupuy–Deliot 2022 (reine Compute-Bisektion über Catmull-Clark in Unity,
„a few milliseconds“ auf Produktions-Assets); Benyoub–Dupuy 2024 (< 0,2 ms auf Konsolen-Hardware); opensubdiv-wasm für
three.js (CPU). Schluss: Auf WebGPU portierbar (Compute + indirekte Draws), der WebGL2-Fallback kann es nicht, und 36 Wesen bei
300–500 px brauchen es nicht — gebackene Stufen (L1 nah, L0 fern) sind Standard.

## 4. Cel-Shading auf grobem Netz

Belegt: Binäre Schattierung macht Normalenrauschen sichtbar (ArcSys). three.js glättet seit r144 im MeshToonMaterial die
Stufenkante mit fwidth + smoothstep (PR #24406; Reviewer: halbes fwidth für eine knackigere Kante). ArcSys verzichtete auf
Selbstschatten (Schattenzonen per Vertexfarbe), verschiebt die Lichtschwelle per Vertexfarbkanal und hält den Lichtaufbau je
Figur fest.
Schluss: Die Stufengrenze ist die Isolinie des interpolierten N·L und knickt an jeder Dreieckskante — auf L1 ein Polygonzug,
in Bewegung ein Springen („Terminator-Wobble“). Abhilfe in dieser Reihenfolge: Grenznormalen (glatt, unabhängig von der
Netzdichte) → fwidth-smoothstep (nur Kantenglättung, keine Verläufe) → Schwellen-Offset per Vertexfarbe/Malzone → mehr Ringe
nur dort, wo die Grenze verläuft.

## 5. Budget-Aufteilung

Belegt: Zähne/Zunge/„Mouth bag“ werden als eigene Polygruppen bzw. Meshes mit eigenem Material gebaut (Polycount, DAZ); ein
Low-Poly-Zahnsatz: 474 + 440 + 276 Dreiecke (Ober-, Unterkiefer, Zunge). Unity: ein Skinned Mesh je Figur, mehr Materialien
nur wenn nötig (Augen). Keine Quelle nennt Prozentsätze. Schluss für 8 000: Körper 5 000–5 500; Maulinneres (Lippen, Tasche,
Rachen) 1 000–1 500, Rachen auf L0; Zähne 600–1 000 (40–60 je Zahn); Augen gemalt (0); ein Material/Atlas, damit 36 Wesen
≤ 100 Draw Calls bleiben.

## 6. Morph-Targets und Subdivision

Belegt: glTF: „All morph target accessors … MUST have the same number of elements as the accessors providing original vertex
attributes“; A′ = A + Σ ΔA·W. Blender wendet Subdivision nicht auf Meshes mit Shape Keys an (Feature-Request #86095 offen);
Umweg: je Shape eine Kopie, Modifier anwenden, zusammenfügen (Add-on „Apply Modifiers with Shape Keys“). Skinning:
Liu/Jacobson/Gingold 2014 — Kontrollpunkte wie gewöhnliche Punkte zu skinnen ist „problematic“, sie lösen variational; keine
Fehlerzahlen.
Schluss: Subdivision ist bei fester Topologie linear (OSD: feste Gewichte, nur Positionen neu kombiniert) ⇒
S(Käfig + Σ w·Δ) = S(Käfig) + Σ w·S(Δ): **Käfig-Deltas auf L1 zu backen ist exakt**, die Reihenfolge ist egal. Knochen sind
nicht linear; weil Subdivision affin-invariant ist, ist „Käfig skinnen, dann unterteilen“ nur im Übergangsband der Gewichte
(Kiefergelenk) verschieden von „unterteilen, dann skinnen“, und der Unterschied schrumpft mit der Bandbreite. Zitierbare Zahlen
gibt es nicht; der Editor sollte beides rechnen und Δ anzeigen (Gelenkband ≥ 2 Käfigringe).

## 7. Quad-Reduktion

Belegt: Blender Un-Subdivide „intended for meshes with a mainly grid-based topology“, nach weiteren Edits „unexpected“, gerade
Iterationen; QuadriFlow uniform, scheitert an manchen Modellen (T70608, „fundamental limitation“), Forum: verdrehte Loops;
QuadWild (SIGGRAPH 2021) < 0,5 % Fehlschläge auf Thingi10K, Feature-Linien garantiert, Flächenzahl „approximate by design“;
Maya Reduce „Preserve quads“: Zahl weicht ab. Schluss: Automatische Reduktion erhält Lippen-, Reifen- und Faltenloops nicht
verlässlich — Notnagel, keine Pipeline. Beim Käfig als Quelle ist „weniger Stufen“ die exakte Reduktion; der zweimal verfeinerte
Maul-Einsatz ist davon ausgenommen, weil seine Topologie keine reine Verfeinerung ist.

## Fazit

**Schalter „Spiel“:** Stufe 1 des Käfigs mit Limit-Positionen und Limit-Normalen (belegt: Blender „Use Limit Surface“,
OSD-Limit-Auswertung; die Kombination als Spielnetz ist Schluss), scharfe Falten als gesplittete Normalen, halbscharfe als eine.
Gezeichnet mit demselben Toon-Shader wie im Spiel (fwidth-smoothstep), gleicher Kiefer-Bone, Morph-Targets samt Normalen-Deltas
aus L1 der posierten Käfige — und in Gerätepixeln bei 300–500 px Höhe, nicht formatfüllend. Anzeigen: (a) Dreiecke gegen 8 000,
aufgeteilt Körper/Maul/Zähne; (b) Silhouettenfehler in Gerätepixeln = Sagitta zwischen L1-Kontur und Grenzfläche an der
Zielgröße (Formel s ≈ l²/(8r); Tor 1 px, Warnung ab 2); (c) Cel-Prüfung: Flip L1 ↔ L3 und Zählung der Pixel, deren Stufe
wechselt, plus Terminator-Overlay (Schluss, keine Quelle). Die Kernfrage ist nicht „glatt genug“, sondern „gewollte Kanten vs.
ungewollte Polygone“ — dafür braucht es den Vergleich zur Grenzfläche, nicht zu L3.

**Budgetregel:** Dreiecke(L1) = 8 · Käfigflächen ⇒ Käfig inkl. Maul-Einsatz und Zähne ≤ 1 000 Flächen (gespiegelt 500 je
Hälfte), z. B. Körper 600–700, Maul-Einsatz 200–300, Zähne ≤ 100. Der heutige K2-Einsatz passt in kein Budget; er muss auf
K0-Dichte zurück oder die Verfeinerung auf das Maulfeld beschränkt bleiben (deckt sich mit dem gemessenen Spiel-Budget im
Register). Nachträgliches Reduzieren ist kein Weg.

## Quellen
- Brainerd GDC 2014 (CoD Ghosts): https://gdcvault.com/play/1020620/Advanced-Visual-Effects-with-DirectX
- Brainerd u. a. 2016, Efficient GPU Rendering of Subdivision Surfaces: https://www.niessnerlab.org/papers/2016/4subdiv/brainerd2016efficient.pdf
- c0de517e, CoD-Retrospektive: https://c0de517e.blogspot.com/2016/08/a-retrospective-on-call-of-duty.html
- Nießner/Loop 2012: https://niessnerlab.org/projects/niessner2012feature.html
- OpenSubdiv Subdivision Surfaces: https://opensubdiv.org/docs/subdivision_surfaces.html · Stencils/OSD: https://graphics.pixar.com/opensubdiv/docs/osd_overview.html
- Motomura GDC 2015 (Guilty Gear Xrd): https://www.ggxrd.com/Motomura_Junya_GuiltyGearXrd.pdf · https://www.blendernation.com/2015/07/26/junya-c-motomura-behind-the-scenes-of-guilty-gear-xrd/
- Wind Waker Link (sekundär): https://polycount.com/discussion/comment/1931464/ · https://medium.com/@gordonnl/links-expressions-eb7beae2c62c
- Unity (alt, 300–1500): https://docs.unity3d.com/560/Documentation/Manual/ModelingOptimizedCharacters.html · aktuell: https://docs.unity.com/en-us/engine/current/manual/assets-and-media/asset-types/models/creating-dccassets/modeling-optimized-characters
- Android/Arm Geometrie: https://developer.android.com/games/optimize/geometry
- Richtwerte Mobil: https://www.sloyd.ai/glossary/polygon-count · https://www.hitem3d.ai/ai-faq/what-are-the-industry-thresholds-for-polygon-counts-in-mobile-games
- Polycount, Subd als Hochpoly: https://polycount.com/discussion/comment/936633 · katsbits: https://www.katsbits.com/codex/?p=9794
- Blender Subdivision Surface: https://docs.blender.org/manual/en/latest/modeling/modifiers/generate/subdivision_surface.html · Decimate: https://docs.blender.org/manual/en/latest/modeling/modifiers/generate/decimate.html · Weighted Normal: https://docs.blender.org/manual/en/4.1/modeling/modifiers/modify/weighted_normal.html
- Custom-Normals-Tutorial: https://blenderartists.org/t/customizing-normals-tutorial-series/1369038 · Bug #94838: https://projects.blender.org/blender/blender/issues/94838 · https://www.daz3d.com/forums/discussion/comment/635012
- Blender Shape Keys + Subdivision: https://developer.blender.org/T86095 · https://extensions.blender.org/add-ons/apply-modifiers-with-shape-keys · https://cgcookie.com/posts/how-to-apply-modifiers-to-meshes-with-shape-keys-in-blender
- glTF 2.0 Morph Targets: https://registry.khronos.org/glTF/specs/2.0/glTF-2.0.html#morph-targets
- three.js GLTFLoader (addMorphTargets): https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/jsm/loaders/GLTFLoader.js · Toon-AA PR: https://github.com/mrdoob/three.js/pull/24406
- Liu/Jacobson/Gingold 2014: https://cragl.cs.gmu.edu/splineskin/
- Sagitta: https://en.wikipedia.org/wiki/Sagitta_(geometry)
- Reyes (½ px): https://graphics.pixar.com/library/Reyes
- Nanite 1 px/Kante: https://forums.unrealengine.com/t/nanite-performance-options/2687737 · https://indxzero.github.io/ue544cvarwiki/articles/r.nanite.maxpixelsperedge
- Karis, How to tessellate (UE 2 px): https://graphicrants.blogspot.com/2026/02/how-to-tessellate.html
- NVIDIA Tessellation: https://developer.nvidia.com/content/dynamic-hardware-tessellation-basics · https://developer.download.nvidia.com/presentations/2010/gdc/Tessellation_Performance.pdf
- PostScript-Flatness: https://cdn.enfocus.com/manuals/Extra/Actions/12/en-us/common/act/concept/22.html
- Dupuy/Vanhoey 2021: https://diglib.eg.org/handle/10.1111/cgf14381 · Code: https://github.com/kvanhoey/ParallelHalfedgeSubdivision
- Dupuy/Deliot 2022 (Compute-Bisektion Catmull-Clark): https://advances.realtimerendering.com/s2022/LebCatmullClark.pdf
- Benyoub/Dupuy 2024 CBT: https://arxiv.org/abs/2407.02215
- opensubdiv-wasm: https://socket.dev/npm/package/@nasedkinpv/opensubdiv-wasm
- Mouth bag/Zähne: https://polycount.com/discussion/comment/2680618 · https://www.cgtrader.com/3d-models/character/anatomy/teeth-and-tongue-set-low-poly-3d-model
- QuadriFlow-Fehler: https://developer.blender.org/T70608 · https://blenderartists.org/t/how-good-is-quadriflow-remesh-compared-to-other-auto-retopo-solutions/1547001
- QuadWild: https://vcg.isti.cnr.it/publication/2021/PNACT21 · https://github.com/nicopietroni/quadwild/
- Maya Reduce: https://help.autodesk.com/cloudhelp/2022/ENU/Maya-Modeling/files/GUID-49F4731D-4F59-4B98-9751-F0E1CAA675CD.htm
