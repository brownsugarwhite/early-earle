# Übergabe (Stand 15.10.2026 nachts)

Branch `claude/editor-grundlayout`. Es gilt der Fahrplan [`docs/plans/2026-10-14-ruhiges-netz-und-maulschlitz.md`](plans/2026-10-14-ruhiges-netz-und-maulschlitz.md) (von Florian freigegeben): Block 1 ruhiges Netz → **Block 2 Maulschlitz und getrennte Kiefer (jetzt zu Ende gebaut)** → Block 3 weiter nach [Phase 2](plans/2026-10-15-phase-2-maul.md). Florians Auftrag für die Nacht: selbstständig weiter, extrem selbstkritisch, jeden Schritt ausgiebig prüfen, genau nach dem Plan.

## Heute Nacht gebaut (je geprüft, committet, gepusht)

1. **Chip „getrennt“ für Mäuler unter dem Kopf** (1cdfe9c): blauer Knoten genau am Anfang der blauen Linie, Vorschlag nach der Lippenlänge. Langhals getrennt: offen 0 Durchdringungen, blau direkt hinter rot (vorher an der Kehle).
2. **Messfehler im Seiten-Δ** (1cdfe9c): Die verdeckte Kinnspitze des kürzeren Kiefers (im Fenster zwischen Rot und Blau, hinter der Oberlippe) zählte als Abweichung. Kugel-Überbiss 11,5 → 1,3 px, Langhals „rot runter“ 5,7 → 3,1 px. Der vermeintliche Rückschritt durch den Chip war nur dieser Messfehler.
3. **Maullage eingefroren** (cb69ff9): Winkelring, Ringanfang und Konturanfang bleiben beim Ziehen eines Lippenanfangs (`GefroreneStationen.maul`, Band um die Schwellen). Vorher sprang beim Ziehen die Punktzahl (Langhals 499 ↔ 513 Käfigpunkte) bzw. die Lippe in eine andere Kappenzeile (Kugel, 18 px). Editor-Ablauf Langhals bleibt jetzt bei 191 040 Punkten.
4. **Kiefer-Spanten** (671756e, c45ba83; Florian: „von vorne einen Spant für Ober- und einen für Unterkiefer, wenn der Spant von der Seite über beide liegt“):
   - **Front:** Liegt ein Spant über dem Maul, zeigt die Front zwei Kurven: den Oberkiefer bis zur Lippe (durchgezogen, Punkte rund) und den Unterkiefer ab der Lippe (gestrichelt, Punkte als Rauten).
   - **Seite:** Die Spantlinie hat eine Lücke an der Lippe.
   - **Bühne:** Der Reifen hat zwei Perlenreihen, über und unter der Lippenzeile.
   - **Bearbeiten:** Punkte, Griffe und ⌥ wirken je Teil; der Unterkiefer (`Spant.unten`) wird beim ersten Bearbeiten als Kopie angelegt.
   - **Punkte:** „+“ und „−“ wirken auf alle Querschnitte (gleiche Punktstruktur). An der Kugel hat der Unterkiefer anfangs nur den Achspunkt; erst ein „+“ auf der Unterkiefer-Kurve macht ihn formbar.
   - Bilder: `docs/progress/editor/kiefer-spant-front-2026-10-15.png`, `kiefer-spant-buehne-2026-10-15.png`.

## Abnahme Block 2 (ehrlich)

Kontaktbogen aller Prüffälle: `docs/progress/editor/block2-stand-2026-10-15.jpg`. Tabelle mit Zahlen auf der Planseite (Stand 15.10. nachts).

- **Satz 1** (Rot und Blau gehen in die schwarze Linie über): erfüllt.
- **Satz 3** (je Kiefer ein Spant): gebaut.
- **Satz 4** (Lippen ≤ 1 px, offen 0 sichtbare Durchdringungen):
  - Lippen ≤ 0,7 px.
  - Offen 0 bei allen Kugel- und Nasenfällen und bei Langhals getrennt.
  - **Langhals „gleich“: Kehle 52–60 Paare.**
- **Satz 2** (Netz ruhig auf der schwarzen Linie): Seite ≤ 2,4 px (Kugel) bzw. ≈ 3 px (Langhals). **Lokalität nicht erfüllt** (Lippenanfang 10 px gezogen, Haut außerhalb des Bands):
  - Beim Ziehen des kürzeren Kiefers und bei Florians Unterbiss meist 0,2–0,7 px.
  - Beim Ziehen des Schlitzanfangs 1,3–4,6 px.
  - Ursache: Der ganze Kiefer folgt seiner Linie, und die Ringe gleiten mit der Leiter. Ohne Maul misst Block 1 schon 3,0 px bzw. 9,2 px.
  - Das gehört zu „Käfig als Wahrheit“; das entscheidet Florian (eigene Sitzung).

## Offen

- **Kehle des Langhalses beim Öffnen** (Falten 52–166° bei 100 %, Langhals „gleich“ 52–60 Paare) → Kehlkette (Plan 5.2).
- **„Blau am Hals“**: Wird der blaue Anfang weit an den Hals gezogen, hängt der Unterkiefer als Lappen heraus (248–584 Paare). Ebenso offen ist die kleine Vorlagen-Linie des Langhalses (Grenzfall).
- Lokalität (siehe oben).
- Topologie: Einmalige Wechsel gibt es noch an den Bandgrenzen und wenn ein Lippenanfang über einen Nasenring gezogen wird; die Haut springt dort ≈ 3,5 px.
- Aus der Fressen-Arbeit:
  - Schädelgelenk als Rig-Griff, Bodengrenze (Plan 5.2).
  - Der alte E2E-Test `kern-ablauf` „Körper … Pinsel G“ schlägt fehl (eigene Aufgabe).
- Register offener Kritik: [`docs/plans/2026-10-14-kritik-phase-0.md`](plans/2026-10-14-kritik-phase-0.md).

## Nächster Schritt (Block 3 nach Plan)

1. Phase 2 **M3 großer runder Haps** (Planseite Phase 2, Meilenstein 3):
   - Loop-Cut längs am Maul, Pose-Deltas an die Maullinie gebunden, Posenliste.
   - Dazu Breitenpunkte mit Maul.
   - Abnahme: Tiger-Stern offen rund wie die Referenz, Top mit Maul ≤ 4 px.
2. Plan 5.2 Rest: Kehlkette (Langhals-Kehle), Schädelgelenk als Griff, Bodengrenze.
3. Danach Zähne → Augen → Maularten.

## Wo Florian testet

- Web-Modus `http://localhost:5180` (`pnpm --filter @ee/editor dev:web`). Nach dem Pull den Dev-Server neu starten (HMR-Falle).
- Library ▸ „Prüfwesen · immer der aktuelle Stand“.
- **Kiefer-Spant ausprobieren:**
  1. Maul zeichnen (Maul-Tab), Kiefer „getrennt“.
  2. Stufe Körper, Werkzeug S, in der Seite über das Maul klicken.
  3. In der Front die gestrichelte Unterkiefer-Kurve mit „+“ ergänzen und ziehen, oder auf der Bühne die untere Perlenreihe ziehen.

## Prüfen

- `pnpm typecheck`, `cd packages/shape && npx vitest run` (231 Tests; die Laufzeittests `beweis1` „Zugschritt“ und `beweis3` „Stufe 3“ reißen unter Last, einzeln mit `-t` grün), `cd apps/editor && npx vitest run` (16), `pnpm lint` (nur alte Warnungen in Prüfskripten).
- Prüfreihe vor jeder Meldung: `cd packages/shape && npx vite-node ../../apps/editor/scripts/pruefen/pruefreihe.ts`, Kontaktbogen `apps/editor/scripts/pruefen/run-check.sh apps/editor/scripts/pruefen/pruefreihe-bilder.mjs`, Zugmatrix `zug-matrix.ts`, Lokalität `LINIEN=1 … lokalitaet-maul.ts`, Wächter `pruefwesen-check.mjs`. Übersicht: `apps/editor/scripts/pruefen/README.md`.
- E2E: `cd apps/editor && E2E_PORT=5191 EE_GPU=1 npx playwright test e2e/kern-ablauf.spec.ts --reporter=list` (`pnpm --filter … e2e -- kern-ablauf` filtert nicht und überschreibt `docs/progress/editor/*.png`).
