# Übergabe (Stand 15.10.2026 mittags, nach dem Planmodus)

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

## Stand

- **Teil 0 erledigt:** Rücknahme 42ef353 (Code = c97497b; typecheck und lint grün, Unit-Tests grün bis auf einen Tempo-Test unter Last, einzeln grün; E2E kern-ablauf 4/4). Plan, Entwürfe, Kritik-Register (Abschnitt „Florian 15.10. vormittags“), Projektgedächtnis nachgezogen; „Fressen wie Editor“ als abgelöst markiert.
- Im Editor gilt bis auf Weiteres der alte Maulbau und die alte Fressen-Pose (Stand c97497b). Bekannt: Der Rücksprung-Fehler im Fressen-Tab besteht weiter (B1 behebt ihn).

## Nächster Schritt: Stufe 1, Teil V (Prüfstand und Ausgangslage)

1. `packages/shape/src/kern/pruefen/zufallsreihe.ts` (fester Startwert; Körper Kugel, Ei, Wurst, Turm, Flunder, Birne, Kasten, Langhals, Robbe, Drache mit Varianten; Maullinien hoch/mittel/tief/seitlich/Kinn/Hals × gerade/hoch/runter/J/S/senkrecht × kurz/lang; Kiefer gleich/Über-/Unterbiss; Öffnung 0–100 %; Bearbeitungen danach).
2. `kern/pruefen/masse.ts` (Formtreue gegen den Körper ohne Maul, Δ je Blatt mit/ohne Maul, Lippe dicht über die ganze Linie, Falten, Zusammenklappen, sichtbare Durchdringungen, Kieferunabhängigkeit, Örtlichkeit, Tempo); vorhandene Bausteine in `kern/pruefstand.ts`, `kern/abweichung.ts` wiederverwenden.
3. Ausgangslage des heutigen Maulbaus mit eingefrorenen Stationen (wie der Editor) und Werkzeug-Matrix H0; Florians Zahlen müssen sich nachstellen lassen (Top 29–57 px, Kinn 27,5, Schnabel 29,1, J „rot 19,1“, Unterbiss 201, Schädel +18 → 44–78 Paare; Pinsel Δ 25/37, rot 34; Örtlichkeit 3/9 px).
4. Kontaktbögen der schlechtesten Fälle (`apps/editor/scripts/pruefen/reihe-boegen.ts` über `html-shot.mjs`), selbst ansehen, dann **Halt für Florian**.

## Arbeitsregeln dieser Phase

- Keine Meldung „fertig/bestanden“ ohne Florians Abnahme; Meldungen heißen „gebaut, gemessen an …, Abnahme offen“.
- Ein Schritt, dann Prüfung, dann Florian; nach drei gemessenen Fehlanläufen an derselben Stelle anhalten und berichten.
- Eigener Vite auf 5192 über `run-check.sh`, nie Florians Port 5180. Nie `assets/fonts/Hippie Movement.otf` committen.
- Nach jedem Teilschritt committen und pushen; diese Datei am Ende jedes Blocks überschreiben.
