# Prototyp 1 — Abschluss, Entscheidungen, Lehren

> **Stand 2026-10-04.** Prototyp 1 lief vom 29.09. bis 04.10.2026. Eingefroren als Git-Tag **`prototyp-1`** auf Commit `0b0122c` (CI „web“ #87 grün: Typecheck, Unit-Tests, Lint, Build, E2E-Smoke). Dieses Dokument ist die Brücke in die Produktion: Was hat der Prototyp bewiesen, was wurde entschieden, was lief nicht gut, was ist offen.
>
> **Ab jetzt:** Die Produktion mit finalem Look beginnt mit Florians neuem Plan und Hauptprompt. Er arbeitet Story, Charaktere und Map genauer aus und trägt alles in Dokumenten und Screenshots zusammen. Bis dahin wird nichts auf Basis der alten Pläne gebaut.

## 1. Was der Prototyp bewiesen hat

- **Die Spielidee trägt.** Florian (04.10.): „Der Prototyp war sehr gut und aufschlussreich und hat bewiesen, dass die Spielidee toll ist. Ich konnte viele Entscheidungen treffen, ein paar grafische Elemente und die Gesamtdynamik haben mir gut gefallen.“ Welche grafischen Elemente bleiben, benennt Florian in seinen neuen Unterlagen.
- **Erster iPhone-Test (30.09.):** „Alles sieht schon gut aus. Der Ansatz passt.“
- **Technik im Browser und auf dem iPhone machbar:** three.js WebGPU/TSL in Capacitor erfüllte auf dem iPhone 16 die Bildratenziele (≥ 58 fps, p99 < 20 ms) mit Jiggle-Mesh-Wesen und Mobil-Preset; die Karte lief in „Hoch“ mit 60 fps (ADR-0001, Messung 29.09.). Stress-Brett „Herde“ mit 21 Arten bei 60 fps.
- **Datengetriebene Inhalte funktionieren:** 184 Level kalibriert gegen eine Schwierigkeitskurve (Solver-Bots, `calibrate --strict`), alle Inhalte als JSON mit zod-Schemas, In-App-Editoren (Level, Wesen, Karte) und Werkstatt in der App.
- **Ein Take ohne Schnitt:** Loader → Splash → „Tippen“ → Level 1 → Aufbruch → Karte als durchgehender Fluss.

## 2. Florians Entscheidungen im Prototyp (Ausgangslage, im neuen Plan bestätigen)

| Bereich | Entscheidung | Wo festgehalten |
|---|---|---|
| Stil | „Neo-Brutalismus trifft Eyvind Earle“; Hauptreferenz der ganze Ordner `ref/eyvind earle/` (lokal) | `STYLE.md`, `FEEDBACK.md` |
| Konturen | Figuren ohne Kontur; Kanten aus Rim, Glanz, Wertkontrast | `STYLE.md` §3 |
| Licht | Cel-Shading-Stufen **mit** Verläufen innerhalb jeder Stufe („Earle benutzt Cel-Shading zusammen mit den Verläufen“) | `STYLE.md` §5.10 |
| Schatten | super glatt und exakt wie im Gemälde, keine Treppen, kein Flimmern (höchste Priorität am 29.09.) | `FEEDBACK.md`, Schatten v1–v3, Schattenkern |
| Karte | **unendliche Ebene als Kugel um den Blickpunkt** („absolute Grundvoraussetzung“); seit „Karte v5“ (01.10.) 15 Autorenwelten mit 184 Leveln und eine angedeutete, gesperrte Zone 16, keine prozeduralen Welten im Spiel | ADR-0002 inkl. Nachtrag |
| Riesenbaum | Wahrzeichen, Levelpfad klettert Stamm und Krone (Level 99–114) | `content/zones/route.json` |
| Spielfeld | Draufsicht ~65°, Bewegung entfernungsabhängig und langsamer, spektakuläre Merges (Sprung zur Kamera, Maul am Apex, Splash) | `FEEDBACK.md` |
| Wesen (Prototyp) | Arten nach Florians Draufsicht-Skizze (REX pink mit Stachelkamm, Giraffe, Elefant, Retriever, Maus, Ente), geknetete Stampfbeine **und** Bein-Module, animiertes Maul | `FEEDBACK.md`, `BLENDER.md` |
| Schrift | **Caprasimo** (OFL) statt Cooper Black Std (Adobe-Lizenz nicht einbettbar) | `STYLE.md` §8 |
| Ton | bleibt wie er ist; Lautlos-Schalter schaltet stumm; alle Klänge prozedural | GDD §16 |
| Einstieg | Loader = i-Stamm mit echtem Fortschritt, Möwenschatten, Blob fällt auf das i, „Tippen“ → direkt Level 1 (1×3) | GDD §16 |
| Modi | echter Modus (nur freigespielte Level, Scroll-Grenze) und freier Entwicklungsmodus; Store-Builds immer echt | GDD §16 |
| Aufbruch | Held bleibt der Blob; erspielte Wesen ziehen aus und wohnen neben ihrem Knoten | GDD §3.4, §16 |
| Sammlung | Setzkasten mit Fächern je Stufe × Art, „NEU!“-Stempel | GDD §16 |
| Klassik | endloses 2048 am Knoten des Helden mit sieben freischaltbaren Formaten | GDD §16 |
| Möwe | bringt alle 3–5 Züge den neuen kleinsten Blob (nur Schatten, rein darstellend) | GDD §16 |
| Stack | three.js + Capacitor als Arbeits-Track, Godot 4.7 als ruhender Fallback (Gate formal offen) | ADR-0001 |

Offen geblieben (GDD §15 und Nachträge): Erlösmodell, Name „early earle“ (Markenrecht), Tierschutz-Modell, mehrere Regelfragen aus der Kalibrierung (Strahl-Regel, Rettungs-Ausgang, Streuner, Öl in Syrup, Finale-Zugzahl), Zielanzeige „Stufe 8“ vs. 2048-Wert, Möwenschatten unter Blobs, Größe der Map-Wesen.

## 3. Was gebaut wurde (Inventar, Prototyp-Qualität)

| Bereich | Stand | Wo |
|---|---|---|
| Spielkern | Regeln, Elemente, Ziele, Solver mit drei Bot-Stufen, 184 Level gegen Saga-Kurve kalibriert, Tutorial-Bretter ab 1×3, Klassik-Formate | `packages/core`, `content/levels`, `tools/levels`, GDD §5–6 |
| Wesen | SDF-Kugelkörper (≤ 14 Kugeln), Mesh-Weg mit Kugel-Skinning, 8 Arten + Blob-Linien, 43 Module (32 Blender-GLBs ohne Texturen), Fortbewegung mit IK, Maul-Sichel, Vererbung, Katalog mit 253 Wesen | `packages/genome`, `packages/render/src/creature`, `/lab/creature` |
| Materialien | Jelly, Flüssig, Gas, Feuer, Fell-Shells, Federkarten, 11 Muster | `packages/render/src/blob`, `/lab/blob` |
| Karte | unendliche Ebene mit Kugel-Anzeige, 15 Autorenwelten + Zone 16, Bäume v3, Riesenbaum (Krone v4), Wasser (W7 Teil 1), Felsen, Scheune, Müll v3, Makroformen des Pfads, Schatten v3 + Schattenkern, Karten-Bench | `packages/world`, `packages/render/src/earle`, `/lab/earle`, `/play` |
| Fluss | Loader, Splash, Möwe, Map, Level, Aufbruch, Sammlung, Klassik, REX-Kadenz | `apps/game/src/flow` |
| REX | 3D-Dino mit Spiralaugen, Silbensprechen, Gesten | `/lab/rex`, `content/rex` |
| Audio | prozedural: Merge-Töne, Ambiente je Welt, Möwe, Stempel, REX-Kauderwelsch | `/lab/audio` |
| iOS | Capacitor-App, Liquid-Glass-Plugin (SwiftUI-Overlay), Haptik, Gerätedeploy | `apps/game/ios`, `docs/IOS.md` |
| Werkzeuge | Level-, Wesen- und Map-Editor, Werkstatt in der App, Blender-Bibliothek mit Rückweg ins Spiel | `/editor/*`, `docs/BLENDER.md` |

**Wiederverwendbar** sind voraussichtlich vor allem: Spielkern und Solver, Kalibrier-Werkzeuge, Content-Schemas, Flow-Gerüst, Schatten-Know-how, Karten-Architektur (ADR-0002), iOS-Layer, Audio-Synthese, Mess- und Test-Infrastruktur. **Wahrscheinlich ersetzt** werden die prozeduralen Wesen-Körper und ihre Materialien (siehe Abschnitt 5). Die Entscheidung trifft der neue Plan.

## 4. Messwerte (Stand Prototyp)

- iPhone 16, Safari 26.3, WebGPU (29.09.): Jiggle-Mesh-Brett und Karte „Hoch“ erfüllen ≥ 58 fps / p99 < 20 ms; Raymarch-Wesen nur für Nahansichten und Verschmelz-Momente. Details: ADR-0001 „Messung auf dem Gerät“.
- Karte am Mac (01.10., `docs/progress/karte-perf-mac-baseline.md`): GPU im Budget, aber Hauptthread beim Schwenken 16–23 ms, Draw Calls 98–150 beim Schwenken (Ziel ≤ 100), p99 verfehlt. Größte Hebel: `rebuildContent` beim Schwenken (Vegetations-Pools), Schattenpässe (verdoppeln Draw Calls), Vegetations-Encode. Die geplanten Schritte R4.2–R4.7 (DPR-Deckel, Governor, Schatten-Slide, Punkte-Taps, Instanz-Kulling, Depth16) und die iPhone-Messung (`karte-perf-iphone16.md`) wurden nicht mehr ausgeführt.
- Wesen-Baukasten v2 (Cloud, SwiftShader): 0,4–0,7 s Bauzeit pro Wesen; nicht auf dem iPhone gemessen.

## 5. Wesen-Look: die wichtigste Erkenntnis am Ende

- Florian will Wesen in der Qualität seiner GPT-Entwürfe: Retriever, Drache, Löwe (gemalter, flammenartiger Fellstrich, große Mäuler mit Zähnen), dazu später Schuppen, Muster, Felle, Insekten, Spinnenbeine, Rauch- und Feuerwesen, Raubkatzen, Hunde, Reptilien, Dinos, Drachen, alle in verschiedenen Farben, Mustern und Strukturen, **frei kombinierbar** (Beispiel: Retriever-Fell und -Schwanz mit Drachenmaul, Drachenflügeln und Löwenmähne).
- **Versuch 1 (02.–04.10., unbestätigter Plan):** „Wesen-Baukasten v4“ als Schichtenmodell, KI-3D nur für Teile, „nie Farbe backen“. Der Plan wartete beim Nutzungslimit auf Freigabe und wurde nie umgesetzt → [`wesen-v4-plan-unbestaetigt.md`](wesen-v4-plan-unbestaetigt.md).
- **Versuch 2 (04.10.):** prozeduraler Wesen-Baukasten als Artefakt (privat: https://claude.ai/artifact/UcM9LifpHTpfLoaMcjGB5c, Quelltext [`wesen-baukasten/index.html`](wesen-baukasten/index.html)): SDF-Rumpf mit Ellipsoiden und Kegeln, Rachen per SDF-Abzug bis in den Hals, Zähne, Augen, Strähnen-Generator für Fell/Mähne/Schwanz, Krallenflügel nach Vorlage abgenommen, 12 tauschbare Merkmale, Genom als JSON. In Version 2 an den Vorlagen vermessen (Overlay mit Raster). Ergebnis laut Florian: **„total schlecht im Vergleich“.** Vergleichsbilder: `docs/progress/wesen-baukasten-v2-vergleich-{retriever,drache,loewe}.png`, `wesen-baukasten-v2-mischwesen.png`.
- **Florians Gegentest in Meshy** (Bild-zu-3D aus denselben GPT-Bildern, inkl. der Chimäre): „treffen den Look fast perfekt“. Meshy überträgt die gemalten Fellstreifen und Farbverläufe als Textur auf ein leicht kantiges Low-Poly-Mesh. (Florians Meshy-Screenshots liegen noch nicht im Repo; bitte unter `assets/ref-florian/` ablegen.)
- **Folgerung (Vorschlag, nicht beschlossen):** Meshy- oder Tripo-Modelle als Grundlage, im Spiel dynamisch gemacht über Module (Zerlegen an Sockeln eines gemeinsamen Skeletts pro Bauplan), Farbe/Muster/Struktur im Shader über der gemalten Helligkeit, Feuer/Rauch als Shader und Partikel, Animation prozedural pro Bauplan. Erst beweisen (ein Monat Pro-Tarif, drei Wesen plus Spinne, Teiletausch, Umfärben, Muster, Feuer/Rauch, Animation), dann skalieren. Werkzeugvergleich, Lizenzen, Polygon-Budget und Vorgaben für GPT-Bilder: [`../research/ki-3d-tools-2026-10.md`](../research/ki-3d-tools-2026-10.md).
- Stand 04.10.: Florian hat **kein Meshy-Pro-Konto** und kann nichts herunterladen; er testet weiter selbst.

## 6. Lehren für die Produktion

### Vorgehen
1. **Look zuerst beweisen.** Vor viel Code ein Vergleichsbild (Vorlage neben Render, gleiche Ansicht) und eine ehrliche Einschätzung, ob ein fertiges Werkzeug den Look schneller trifft. Nie Look-Gleichheit versprechen, ohne es getestet zu haben.
2. **Pläne gehören ins Repo, nicht nur in `~/.claude/plans`.** Sonst gehen sie am Limit verloren (v4-Plan; mehrere Iterationspläne lagen nur lokal, z. B. `~/.claude/plans/ich-habe-noch-einige-distributed-summit.md`, Plan „Karte v5“).
3. **Nichts ungepusht liegen lassen.** Sessions enden abrupt am Wochenlimit. Nach jedem Teilschritt pushen, `docs/UEBERGABE.md` am Ende jedes Blocks überschreiben.
4. **Feedback früh und am Gerät.** Die wichtigsten Kurswechsel kamen aus Florians iPhone-Tests und Referenzbildern (Schatten, Draufsicht, Karte unendlich, Wesen-Look). Kurze Schleifen mit Bildern statt langer Bauphasen.
5. **Parallelarbeit mit klaren Pfad-Zuständigkeiten** hat gut funktioniert (bis zu acht Baustellen in eigenen Arbeitsbäumen), braucht aber eine Integrationsrunde mit gemeinsamer Prüfung; Merge-Konflikte entstanden in geteilten Dateien (z. B. `trees/materials.ts`, `editor-levels.spec.ts`, `gull.test.ts`).
6. **Viele Iterationen auf Stil-Details** (Bäume v1–v3, Krone v1–v4, Schatten v1–v3 + Kern) — für die Produktion zuerst den finalen Look anhand weniger Hero-Bilder festzurren, dann in die Breite gehen.

### Technik (Details in [`../../CLAUDE.md`](../../CLAUDE.md))
- WebGPU nur über HTTPS; Simulator nur WebGL2; GPU-Tests nur lokal.
- TSL-Funktions-Cache pro Builder, sonst unsichtbare Pipelines.
- Schatten in three r186 einmal je `frameId`; Benchmarks schalten `nodeFrame` weiter.
- **Draw Calls skalieren mit der Wesen-Vielfalt** (Mesh pro Formschlüssel, InstancedMesh pro Modul, BatchedMesh in r186 pro Instanz) → Produktions-Architektur von Anfang an auf „ein Draw Call für alle Körper“ auslegen.
- Karte: Inhalte beim Schwenken nicht komplett neu bauen; Schattenpässe begrenzen; Instanz-Kulling.
- Texturspeicher auf dem iPhone (~400 MB WKWebView) früh einplanen (KTX2, Atlas).
- Cloud-Container: keine GPU, CDNs gesperrt, kein Blender; Artefakte mit lokaler three.js-Kopie testen.

<!-- OFFENE-AUFGABEN -->

## 8. Startcheckliste für die Produktion

1. Florian legt den neuen Plan und Hauptprompt vor (Story, Charaktere, Map, Look-Referenzen) und seine Testergebnisse (KI-3D-Werkzeuge, Meshy-Screenshots).
2. Gemeinsam festlegen: Wesen-Pipeline (Werkzeug, Tarif, Lizenz), finaler Look der Karte, Stack-Gate (ADR-0001), was vom Prototyp-Code übernommen wird.
3. Neuen Produktionsplan als Datei ins Repo (`docs/PRODUCTION.md` ablösen), ADRs für Grundsatzentscheidungen, `CLAUDE.md` aktualisieren.
4. Erst einen kleinen Beweis für den finalen Look (Hero-Wesen, Hero-Weltausschnitt) am iPhone abnehmen lassen, dann die Pipeline skalieren.
5. Offene Punkte aus Abschnitt 7 übernehmen oder bewusst verwerfen.
