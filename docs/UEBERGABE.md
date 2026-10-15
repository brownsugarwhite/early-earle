# Übergabe (Stand 15.10.2026 spätabends: L0.1 neu gebaut, Teil G G1/G2/G2b gebaut, G4 erster Beweis; jetzt B6)

Branch `claude/editor-grundlayout`. **Es gilt der freigegebene Plan [`docs/plans/2026-10-15-maul-einsatz-harmonie-posen.md`](plans/2026-10-15-maul-einsatz-harmonie-posen.md)** mit den ausführlichen Entwürfen [Teil A Maul als Einsatz](plans/2026-10-15-entwurf-maul-einsatz.md), [Teil H Werkzeug-Harmonie](plans/2026-10-15-entwurf-werkzeug-harmonie.md) und [Teil B Posen](plans/2026-10-15-entwurf-posen.md). Alle älteren Fahrpläne (Phase 2, Ruhiges Netz und Maulschlitz, Fressen wie Editor) sind dadurch abgelöst; ihre Fallen und Messwerkzeuge bleiben gültiges Wissen.

## Warum

Florian hat am 15.10. vormittags an eigenen Wesen Grundfehler gefunden und die Arbeit gestoppt:
- Mit Maul wird der Körper zerstört (Bauch unter hohem Maul und Langhals-Nase kollabieren, Kinnwand, Ei-Schnabel, Falten schon beim einfachsten Maul, J-Mundwinkel unmöglich, echter Rex-Unterbiss reißt alles).
- Fressen: Beim Zurückspringen auf „Editor“ blieb die Pose; mit Maul ließ sich nichts verschieben.
- Pinsel und schwarze Linien harmonieren nicht (Kugel nach Pinsel: Seite Δ 25, Front Δ 37, rot 34 px).
- „Die Testwesen sind nur zum Testen … Daran ist nicht eine Sache abgenommen … Deine Tests waren sehr, sehr unvollständig.“

Die Ursachen stehen im Plan unter „Befund“ (Code-Analysen mit Datei- und Zeilenangaben).

## Florians Entscheidungen (Planmodus)

1. Maul als **Einsatz** um die Linie (Grundnetz außerhalb bitgleich, Lippen exakt auf Rot/Blau, jede Linienform und Lage).
2. Bones: **Stellung je Pose, Rig gemeinsam**.
3. Reihenfolge: Prüfstand → **Tab-Sofortkorrektur (B1)** → Maul-Beweis (A1–A11) → Werkzeug-Fundament (H1–H5) → Maul im Editor (A12–A14, H6) → H7 → Posen (B2–B10) → Abschluss.
4. Rücknahme der Fressen-Commits (erledigt, 42ef353).
5. Nach dem Pinsel zeigt die schwarze Linie das **Relief**; seine Punkte bleiben; neue Punkte nur von Hand oder per „Relief übernehmen“.
6. Maullinien **bleiben, wo gezeichnet** (Anfang folgt der Kontur, Tiefe auf der Haut, kürzerer Kiefer mit Abstand nach innen).
7. Teil G „Grundkörper für jede Form“ nach dem Maul-Beweis.
8. **Posen vorgezogen:** B2–B6 (Shape und Maul im Fressen-Tab) direkt nach B1, auf dem heutigen Maulbau („das Wichtigste an dem Ganzen“). In einer Pose nie etwas sperren, ohne zu sagen, dass die echte Bearbeitung kommt und wann.
9. (abends) Editor-Tab = Grundpose; Standardpose **Idle** (Normalzustand, im Spiel Ruhezustand, Überblenden von Idle aus); zwischen allen Posen mit allen Werkzeugen springen. Sein Vorschlag **beliebig vieler Wirbelsäulen** (Baum, Äste als Ausstülpung, gespiegelte Paare: Flügel, Flossen, zwei Hälse, Augenstiele) ist Grundlage für Teil G (unbewiesen).

## Stand

- **Teil 0 erledigt:** Rücknahme 42ef353 (Code = c97497b; typecheck und lint grün, Unit-Tests grün bis auf einen Tempo-Test unter Last, einzeln grün; E2E kern-ablauf 4/4). Plan, Entwürfe, Kritik-Register (Abschnitt „Florian 15.10. vormittags“), Projektgedächtnis nachgezogen; „Fressen wie Editor“ als abgelöst markiert.
- **Stufe 1 gebaut (Abnahme offen):** Prüfstand `packages/shape/src/kern/pruefen/` (Zufallsreihe, Maße, Werkzeug-Matrix; Werkzeuge geprüft in `reihe.test.ts`), Skripte `apps/editor/scripts/pruefen/{zufallsreihe.ts, werkzeug-matrix.ts, reihe-boegen.mjs}`. Ausgangslage mit acht Kontaktbögen: [`docs/progress/editor/ausgangslage-2026-10-15.md`](progress/editor/ausgangslage-2026-10-15.md). Kurz: Zufallsreihe 200 Fälle und einfachste Mäuler 40 Fälle — alle verletzen mindestens eine Schwelle; Florians Ablauf (Pinsel → Maul) nachgestellt (Seite Δ 36 px, Lippe 15 px); Linienänderungen verschieben die Haut fern um ≈ 10 px; ein Absturz im Bau (Δ-Messung bei zerrissenem Netz).
- **Teil G** (Grundkörper für jede Form: Ente mit Flügeln, Bauch vor der Nase, S-Hals) ist nachmittags in den Plan gekommen (Florians Entscheidung 7), nach dem Maul-Beweis.
- Im Editor gilt bis auf Weiteres der alte Maulbau und die alte Fressen-Pose (Stand c97497b). Bekannt: Der Rücksprung-Fehler im Fressen-Tab besteht weiter (B1 behebt ihn).

- **Stufe 2, B1 gebaut (Abnahme offen):** Editor-Tab zeigt immer die Grundform (bitgleich), Fressen die Pose; `setzeZiel` statt `setzeModus`+`setzeOeffnung`; Neubau bei Öffnungsänderung auch ohne Maul; Rücksetzen bei Pose entfernen/Laden/Neu; Vorschau endet beim Stufenwechsel und Bearbeiten (`apps/editor/src/werkzeuge/ziel.ts`); Sperre: in einer Pose nur Pinsel und Rig, sonst Hinweis (`editorStore.ts` `nurPose`). Geprüft mit `packages/shape/src/kern/grundform.test.ts` und E2E `apps/editor/scripts/pruefen/tab-wechsel.mjs` (23/23; Gegenprobe am alten Code schlägt fehl). Bild `docs/progress/editor/b1-tab-wechsel-2026-10-15.jpg`.

- **Stufe 3, B2 gebaut (Abnahme offen):** Kern `packages/shape/src/kern/posen/` (`skin`, `auswerten`, `saat`, `rahmen`, `lage`, `uebertrag`), Schalter `?posen=ruhe`. Tor: alt ≡ neu bei voller Pose (fünf Prüfstand-Wesen ≤ 5,6e-16, im Editor ≤ 4e-18). Gefundener und behobener Fehler: `spiegelIndex` paarte bei bündigem Maul Ober- mit Unterlippe (Fressen-Pose schief). Zwischenstufen alt/neu bis 14 px verschieden, keine neuen Fehler. K6: Übertrag aus der Umgebung mit Bezugs-Käfig statt Zellbasis (gewinnt alle fünf Fälle). Ergebnis [`docs/progress/editor/b2-tor-2026-10-15.md`](progress/editor/b2-tor-2026-10-15.md), Bogen `docs/progress/editor/b2-zwischenstufen-2026-10-15.jpg`.

- **Stufe 3, B3 gebaut (Abnahme offen, 44020db):** Dokument v2 mit Posenliste (Idle, Fressen, weitere; je Pose Stellung, Form als Ruhe-Deltas mit Bezugs-Käfig, Saat), Migration v1 exakt; Kern mit `Bauplan.gewichte` (`kern/posen/posen.ts`); Editor: Ziel = Editor oder Pose-Id, Tabs/Tafel aus der Posenliste, Pinsel in jeder Pose (Rᵀ·Zuwachs), Knochen je Pose (Griffe und Tafel), Rig gemeinsam. Geprüft mit `apps/editor/scripts/pruefen/posen-b3.mjs` (29/29, echte Züge), `tab-wechsel.mjs` (23/23), E2E kern-ablauf (4/4), Kern-Tests. Bild `docs/progress/editor/b3-posenliste-2026-10-15.jpg`. Offene Befunde der Bestandsaufnahme im Kritik-Register (`docs/plans/2026-10-14-kritik-phase-0.md`, „Bestandsaufnahme zu B3“).

- **Stufe 3, B3b gebaut (Abnahme offen, bc6f62f; Florians Entscheidung 10 „Knochen in 3D“):** Gieren, Rollen (um die eigene Knochenachse), seitlicher Versatz; Griffe auf der Bühne (Spitze = Kugel um das Gelenk, türkiser Rollgriff, Mitte verschiebt); Tafel mit 3D-Werten und „Symmetrisch“; Pinsel in schiefen Posen spiegelt in der Ruhe. Prüfung `apps/editor/scripts/pruefen/posen-b3b.mjs` (10/10), Bild `docs/progress/editor/b3b-knochen-3d-2026-10-15.jpg`.

- **Stufe 3, B4 gebaut (Abnahme offen, 4df7e0d):** Löser im posierten Raum (`packages/shape/src/loeser/posenLoeser.ts`) und die schwarze Linie im Seitenblatt einer Pose (`apps/editor/src/posen/poseLinie.tsx`, Griffdaten `kern/posen/griffeSeite.ts`): posierter Umriss mit den Knoten auf ihren Hautpunkten, ziehen formt die Pose örtlich (Radius wie der Pinsel). Prüfung `apps/editor/scripts/pruefen/posen-b4.mjs` (10/10), Bild `docs/progress/editor/b4-pose-linie-2026-10-15.jpg`.

- **Stufe 3, B5 gebaut (Abnahme offen, 742e6ab):** Rot und Blau der Pose. Gespeichert ist ein Versatzfeld längs der natürlichen Lippe der Pose (`Pose.linien`). Die Lippen werden im Ruheraum darauf projiziert (`kern/posen/linien.ts`, `loeser/glattLoeser.ts`), die Knochen nehmen die Korrektur mit. Im Editor zeigt die Stufe Maul einer Pose die Lippe als Linie (`apps/editor/src/posen/poseLippen.tsx`): Knoten und Griffe in Seite, Front und Top ziehen, Mundwinkel gemeinsam, Anfang auf der Naht, geschlossen türkis. Stift fügt formneutral ein. Die Linien folgen dem Pinsel und der schwarzen Linie von selbst. Gemessen:
  - Lippen 0,05–0,06 px auf zufälligen glatten Linien (Ziel 0,25 px);
  - schiefe Pose 0,04 px;
  - Pinsel folgt exakt;
  - unberührte Pose bitgleich;
  - Prüfung `apps/editor/scripts/pruefen/posen-b5.mjs` 30/30 (Rex, Tiger);
  - Bild `docs/progress/editor/b5-pose-linien-2026-10-15.jpg`.

  Befunde im Kritik-Register („Befunde aus B5“): Ein Zug um 60 px faltet die Kinnfront (B8). Der Mundwinkel liegt 0,6 px neben dem Zeiger. Knicke kann die runde Lippenkette nicht nachbilden (Teil A).

## Diese Nacht (15./16.10., Florian schläft: „außer den Konturlinien … besonders die Grundform … Ente mit Flügeln und Bäuche unter dem Mund … danach weiter mit B6, immer weiter“)

Alles gebaut und gemessen, **nichts abgenommen**. Bilder in `docs/progress/editor/`, Zahlen auf den Planseiten.

1. **Teil L, L0.1 „Linie wird Reihe“, zweiter Ansatz** (4db6df6; Planseite [Teil L](plans/2026-10-15-teil-l-linien-kurvennetz.md), Stand): „Die Fläche bleibt, das Netz gleitet“ — Röhrengitter (u, v) der feinen Fläche, Gleitfeld als dünne Platte im Maß der Haut (0 auf Konturen und Kappen), Ausgleich senkrecht zur Haut gegen die alte Fläche, Reihe quer zur Linie stark, Gleiten, mitgleitender Bezugskäfig. Der erste Versuch ist entfernt, die Ableitung wieder bitgleich. Gemessen: Reihe 0,04–0,29 px auf der Linie, Haut 0,04–0,22 px (Kugel, Ei), Normalen 0,19° waagerecht, **1,4° bei schrägen Linien** (Tor 1°), **Rex-Braue offen** (24° an der Schnauzenspitze). Bild `l0-linie-als-reihe-2026-10-15.jpg`.
2. **Teil G vorgezogen** (hängt nicht am Maul-Einsatz; Planseite [Maul als Einsatz …](plans/2026-10-15-maul-einsatz-harmonie-posen.md), Stand):
   - **G1** Prüfkörper `kern/pruefen/grundkoerper.ts`: deine Ente (aus deinem Bild), Giraffe mit Bauch vor der Nase, Schwanenhals, Fisch mit Flossen; Kontaktbogen `apps/editor/scripts/pruefen/grundkoerper-g.ts`. Ausgangslage: Ente Seite Δ 76 px, Giraffe 49 px (`g1-ausgangslage-2026-10-15.jpg`).
   - **G2 Enden der Wirbelsäule** (2574a95): eingefroren als Kurvenparameter der Seite (mit den Stationen), automatisch über Wege im Inneren (der innen fernste Punkt hinter einer Biegung wird Anfang). Alle 33 bisherigen Prüfkörper bitgleich; **ein Zug am Bauch über die Nase springt nicht mehr um**; Ente Seite 76 → 5 px, Giraffe 49 → 1 px (`g2-enden-2026-10-15.jpg`).
   - **G2b Fächer an inneren Ecken** (351b963): Ente Falten über 20° 1209 → 416, bestehende Körper bitgleich (`g2b-faecher-2026-10-15.jpg`).
   - **G4 Teile, erster Beweis, nicht gut genug** (56a8d72): Erkennung durch Öffnen der Silhouetten (bisherige Körper ohne Teil, bitgleich; Ente: Flügelspitzen; Fisch: Brustflossen), Bau als Ausstülpung entlang der Mittellinie mit flachen Ellipsen. Flügel und Flossen sitzen an der richtigen Stelle, aber Ente Front/Top Δ 24/26 px und Falten am tangentialen Ansatz, Fisch-Schwanzgabel faltet (`g4-teile-erster-beweis-2026-10-15.jpg`). Befunde und Wege auf der Planseite.
   - **Bäuche unter dem Mund:** Der Teil „Bauch vor der Nase springt um“ ist mit G2 gelöst. Dass ein Bauch unter einem hohen Maul zur Flosse klappt, kommt vom Maulbau (feste Punktzahl über/unter der Lippe) und gehört zu Teil A (Maul als Einsatz).
3. **B6 gebaut** (e55127e und folgender Commit): schwarze Linien der Pose auch in Front und Top (`posen-b6.mjs` 65/65) und die Matrix „jedes Werkzeug × jede Pose“ (`posen-matrix.mjs` 61/61: Kugel, Rex, Tiger × Idle, Fressen, freie Pose × Pinsel, Aufblasen, Linie Seite/Front/Top, Rot/Blau, Knochen; andere Posen und Grundform unverändert, Undo exakt, Editor-Tab bitgleich). Bild `b6-pose-linien-front-top-2026-10-15.jpg`. Offen: Hebel an den Knoten der Pose-Linie (deine Entscheidung), Linien in der Pose (L1, nach Abnahme von L0).
4. **Danach:** zurück zu G4 (Flügel der Ente gut machen: nach außen ansetzen, dann nach hinten), dann Teil A (Maul als Einsatz, dort auch „Bauch unter hohem Maul“).

**Für dich zum Ansehen:** die fünf Bilder oben; Entscheidungen, die anstehen: (a) L0.1 — genügen 1,4° Normalenabweichung bei schrägen Linien, oder soll die Verdichtung (eine Reihe mehr) kommen? (b) G4 — Flügel nahtlos als Ausstülpung (nach außen ansetzen, dann nach hinten) oder als angestecktes Teil mit verdeckter Überlappung?

## Erledigt: Stufe 2, B1

B1 nach Plan Teil B und Entwurf `docs/plans/2026-10-15-entwurf-posen.md` §5, klein gehalten auf den heutigen Posendaten:
- eine Aktion `setzeZiel` statt `setzeModus` + `setzeOeffnung` (MenuBar, Tafel-Chips, Q), Öffnung und Modus in einem Schritt;
- Neubau bei jedem Wechsel, mit oder ohne Maul (`Szene3D.tsx`, heute nur mit Maul);
- Pose entfernen, Laden, Neu setzen die Öffnung zurück (`editorStore.ts`);
- im Editor-Modus rechnet der Kern keine Pose (Abkürzung, Grundform bitgleich; `kernBau.ts` `bauplanAus`, `wesen.ts`);
- in Ruhen/Laufen/Inklusion Werkzeuge sperren, die in die Grundform durchschreiben (Hinweis „nur im Editor“);
- Prüfung: E2E mit echten Zügen, 20× Editor ↔ Fressen auf Kugel (ohne Maul) und Rex (mit Maul) mit Pinsel in Fressen; Grundform-Hash im Editor-Tab unverändert, Pose sichtbar im Fressen-Tab.

## Erledigt: Stufe 1, Teil V (Prüfstand und Ausgangslage)

1. `packages/shape/src/kern/pruefen/zufallsreihe.ts` (fester Startwert; Körper Kugel, Ei, Wurst, Turm, Flunder, Birne, Kasten, Langhals, Robbe, Drache mit Varianten; Maullinien hoch/mittel/tief/seitlich/Kinn/Hals × gerade/hoch/runter/J/S/senkrecht × kurz/lang; Kiefer gleich/Über-/Unterbiss; Öffnung 0–100 %; Bearbeitungen danach).
2. `kern/pruefen/masse.ts` (Formtreue gegen den Körper ohne Maul, Δ je Blatt mit/ohne Maul, Lippe dicht über die ganze Linie, Falten, Zusammenklappen, sichtbare Durchdringungen, Kieferunabhängigkeit, Örtlichkeit, Tempo); vorhandene Bausteine in `kern/pruefstand.ts`, `kern/abweichung.ts` wiederverwenden.
3. Ausgangslage des heutigen Maulbaus mit eingefrorenen Stationen (wie der Editor) und Werkzeug-Matrix H0; Florians Zahlen müssen sich nachstellen lassen (Top 29–57 px, Kinn 27,5, Schnabel 29,1, J „rot 19,1“, Unterbiss 201, Schädel +18 → 44–78 Paare; Pinsel Δ 25/37, rot 34; Örtlichkeit 3/9 px).
4. Kontaktbögen der schlechtesten Fälle (`apps/editor/scripts/pruefen/reihe-boegen.ts` über `html-shot.mjs`), selbst ansehen, dann **Halt für Florian**.

## Arbeitsregeln dieser Phase

- Keine Meldung „fertig/bestanden“ ohne Florians Abnahme; Meldungen heißen „gebaut, gemessen an …, Abnahme offen“.
- Ein Schritt, dann Prüfung, dann Florian; nach drei gemessenen Fehlanläufen an derselben Stelle anhalten und berichten.
- Eigener Vite auf 5192 über `run-check.sh`, nie Florians Port 5180. Nie `assets/fonts/Hippie Movement.otf` committen.
- Nach jedem Teilschritt committen und pushen; diese Datei am Ende jedes Blocks überschreiben.
