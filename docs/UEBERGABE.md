# Übergabe (Stand 15.10.2026 nachts, nach Phase 2 M4)

Branch `claude/editor-grundlayout`. Es gilt der Fahrplan [`docs/plans/2026-10-14-ruhiges-netz-und-maulschlitz.md`](plans/2026-10-14-ruhiges-netz-und-maulschlitz.md): Block 1 ruhiges Netz → Block 2 Maulschlitz und getrennte Kiefer (zu Ende gebaut) → **Block 3 = Phase 2 nach [`docs/plans/2026-10-15-phase-2-maul.md`](plans/2026-10-15-phase-2-maul.md)**. Florians Auftrag für die Nacht: selbstständig weiter, extrem selbstkritisch, jeden Schritt ausgiebig prüfen, genau nach dem Plan.

## Heute Nacht gebaut (je geprüft, committet, gepusht)

**Block 2 und M3** (Einzelheiten auf den Planseiten):
- Chip „getrennt“ unter dem Kopf, verdeckte Kinnspitze aus dem Seiten-Δ, Maullage eingefroren, Kiefer-Spanten.
- Langhals-Kehle über die Naht gelöst (Langhals „gleich“ 0 Durchdringungen).
- Breitenpunkte mit Maul, Posenliste, Pose-Deltas an der Maullinie, Vergleichsbild runder Haps.

**Phase 2 M4 Zähne, ganz** (Plan und Stand je Schritt auf der Planseite Phase 2, Abschnitt „M4 Zähne“):

1. **Zahnmodell im Kern** (8df67d5):
   - Gebogener Kegel aus dem Versuch, herausgelöst nach `packages/shape/src/kern/zahnModell.ts`; neu dazu Drehung um die eigene Achse und Größe.
   - Zahnfleisch des Kern-Mauls: `kern/zaehne.ts`; u ist eine feste Stelle des Käfigs.
   - Zähne kommen aus `dok.zaehne`, sonst die Automatik.
2. **Prüfung gegen den Gegenkiefer** (41bbde4):
   - `kern/zahnPruefung.ts`, geprüft bei zu, 25 %, 50 % und offen.
   - Verdeckte Überlappung beim Über- und Unterbiss gibt keinen Befund.
   - Die Automatik passt die geschlossene Länge mit der Prüfung ein und wächst offen auf volle Länge; beim Überbiss stehen die oberen Zähne außen (Bogen 06).
3. **Tafel Zähne** (c06a14b):
   - Anzahl, Auswahl oder alle, Werte für zu/offen.
   - Länge, Schärfe, Neigung; unter „mehr“ Krümmung, Rundheit, Größe, Breite, Spreizung, Drehung, außen.
   - Zähne sind **starr im eigenen Kiefer**: Sie drehen exakt mit dem Kiefer bzw. dem Schädel.
4. **Wählen und Ziehen** (41cb930):
   - Klick wählt, auf der Bühne wie in Seite und Front; Ziehen längs des Zahnfleischs, der Spiegelzahn folgt.
   - Ocker-Marke am gewählten Zahn; „Zahn löschen“, „gleichmäßig verteilen“.
5. **Farbe mit Verlauf** (1e875d2): `ausstattung.zahnFarbe` über Uniforms; die Wurzel ist dunkler, die Spitze heller.
6. **Prüfung im Editor** (a346a40):
   - Eigener Worker-Auftrag nach dem Bau.
   - Störende Zähne glimmen; die Tafel zeigt Befunde mit Vorschlägen (ein Klick wendet an, Undo nimmt zurück).
7. **Abnahme per Skript:**
   - Rex mit 14 Zähnen in Florians Schritten, 20,6 s, Prüfung frei.
   - Bild `docs/progress/editor/zaehne-m4-abnahme-rex-14-2026-10-15.jpg`.

## Ehrlich offen

- **Look gegen die Referenz:** Die Zähne der Automatik sind schmaler und kleiner als die dicken Kegel in `rex_mouth_detail`. Breite und Größe stellen das ein, die Grundwerte entscheidet Florian.
- **Hintere außen-Fänge:** Sie stehen am Mundwinkel schräg nach hinten (folgen der Haut des Unterkiefers).
- **Aus Plan 9.4 fehlen:** „Setzen T“, Spitze ziehen = Länge, Fächer, Prüf-Lupe.
- **Verdeckte Riesenzähne:** Ein Durchstich aus dem Gegenkiefer heraus wird nicht gemeldet (Parität statt Windungszahl).
- **Tempo:** Die Prüfung läuft im Bau-Worker (200–500 ms) und kann einen Zug kurz verzögern. Die Einpassung kostet 65–95 ms je Ableitung.
- **Tempo-Tests:** Drei feste Schranken kippen, solange die Maschine belegt ist (heute Nacht Lastmittel 21,8 durch andere Programme); einzeln grün. Das Zeitlimit für `packages/shape` steht auf 30 s.
- **Aus Block 2 weiter offen:** Lokalität beim Ziehen des Schlitzanfangs (1,3–4,6 px), Langhals bei 100 % Öffnung (Wangenknick, Kehle), „blau am Hals“. Alles im [Kritik-Register](plans/2026-10-14-kritik-phase-0.md).

## Nächster Schritt

1. **Florians Probe:** Rex mit 14 Zähnen in 10 min (Abnahme M4); sein Urteil zu Zahngröße/-breite und zum runden Haps (Vergleichsbild `docs/progress/editor/haps-vergleich-tiger-2026-10-15.jpg`).
2. **Phase 2 weiter nach Plan:** M5 Augen (drei Arten, sechs Zustände, Augen-Tab) → M6 Maularten. Dazu der Rest aus Plan 5.2: Kehlkette, Schädelgelenk als Griff, Bodengrenze.

## Wo Florian testet

- Web-Modus `http://localhost:5180` (`pnpm --filter @ee/editor dev:web`). **Nach dem Pull den Dev-Server neu starten** (HMR-Falle; diesmal neue Worker-Nachricht und neue Store-Module).
- **Zähne ausprobieren:**
  1. Library ▸ Prüfwesen Rex, ⌘3 (Stufe Zähne). Die Tafel zeigt „Automatik“ und „Prüfung: alle Zähne frei“.
  2. Mit dem Kieferknopf oder dem Regler „Öffnung“ öffnen, einen Zahn anklicken (Ocker-Marke) und längs ziehen.
  3. Regler ohne Auswahl wirken auf alle Zähne. „Werte für offen“ + Größe macht Riesenzähne. Farbe unten in der Tafel.
  4. Ein zu langer Zahn glimmt; der Vorschlag in der Tafel behebt ihn.

## Prüfen

- `pnpm typecheck`; `cd packages/shape && npx vitest run` (257 Tests; feste Tempo-Schranken kippen bei belegter Maschine — vorher `uptime`, einzeln mit `-t`); `cd apps/editor && npx vitest run` (16); `pnpm lint`.
- Zähne: `apps/editor/scripts/pruefen/run-check.sh apps/editor/scripts/pruefen/<skript>`. Skripte: `zahn-tafel.mjs`, `zahn-griffe.mjs`, `zahn-blaetter.mjs`, `zahn-farbe.mjs`, `zahn-pruefung.mjs`, `zahn-abnahme.mjs`; Vergleichsbilder mit `zahn-vergleich.mjs` (WESEN, KAMERAS, OEFFNUNGEN).
- Prüfreihe Maul vor jeder Meldung: `cd packages/shape && npx vite-node ../../apps/editor/scripts/pruefen/pruefreihe.ts`. Übersicht: `apps/editor/scripts/pruefen/README.md`.
- E2E: `cd apps/editor && E2E_PORT=5191 EE_GPU=1 npx playwright test e2e/kern-ablauf.spec.ts --reporter=list`, danach `git checkout -- docs/progress/editor/e2e-kern-*.png`.
