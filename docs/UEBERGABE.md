# Übergabe (Stand 15.10.2026 früh, nach Phase 2 M6)

Branch `claude/editor-grundlayout`. Es gilt der Fahrplan [`docs/plans/2026-10-14-ruhiges-netz-und-maulschlitz.md`](plans/2026-10-14-ruhiges-netz-und-maulschlitz.md): Block 1 ruhiges Netz → Block 2 Maulschlitz und getrennte Kiefer (zu Ende gebaut) → **Block 3 = Phase 2 nach [`docs/plans/2026-10-15-phase-2-maul.md`](plans/2026-10-15-phase-2-maul.md)**. Florians Auftrag für die Nacht: selbstständig weiter, extrem selbstkritisch, jeden Schritt ausgiebig prüfen, genau nach dem Plan.

## Heute Nacht gebaut (je geprüft, committet, gepusht)

**Phase 2 M4 Zähne, ganz** (Einzelheiten auf der Planseite Phase 2, Abschnitt „M4 Zähne“): Zahnmodell im Kern, Prüfung gegen den Gegenkiefer, Tafel, Wählen und Ziehen, Farbe mit Verlauf, Prüfung im Editor, Abnahme per Skript (Rex mit 14 Zähnen, 20,6 s).

**Phase 2 M5 Augen** (Planseite Phase 2, Abschnitt „M5 Augen“, Stand je Schritt):

1. **Gemalte Augen mit Formen und Zuständen** (3cc758f):
   - `ausstattung.augen` mit Art, Form (Schlitz, Knopf, Mandel), Breite, Drehung, Punkt, Mitte, Farbe.
   - Zustände offen, zu, Sichel, X, Spirale, Schlitz als Abstandsformen im Material; Lid und Blinzeln.
   - Tafel Augen, Prüfwesen PezenPez.
2. **Glubschauge** (56b775b): Kugel an der posierten Stelle der Haut (folgt beim Öffnen dem Schädel), Pupille in der Grundform, Zustände als Pupillenform, Lid im Material (deckt aus jeder Richtung, ganz zu mit Lidspalt). Prüfwesen Glubsch nach Bild 10.
3. **Augapfel** (2226591, b6aa7a7):
   - Look-Test: tief eingesetzt, Lederhaut orangerot, Iris, kleine Pupille, Ruhelid als Brauenersatz, Ruheblick zur Schnauze.
   - **Höhle im Käfig:** zwei Inset-Schleifen um einen Ringpunkt, nur fürs gezeichnete Netz; am Rex keine Durchdringung mit der Höhle bei 0/50/100 %.
   - **Brauenwulst nicht gelöst** (drei gemessene Anläufe, Abbruchregel): Am Rex ist das Feld um das Auge längs des Körpers zu schmal (Ringe am Mundwinkel 0,009–0,015 auseinander). Standard ohne Wulst; Wege auf der Planseite.
4. **Abnahme per Skript** (5240ff8): PezenPez, Glubsch, Rex (jetzt mit Augäpfeln) mit allen Zuständen neben den Bögen. Bild `docs/progress/editor/augen-m5-abnahme-2026-10-15.jpg`.

**Phase 2 M6 Maularten** (Planseite Phase 2, Abschnitt „M6 Maularten“):

1. **Bestandsbild** (5dfb939): Fisch brauchte eine Ring-Topologie, Drache und Plattenmaul trugen als Grundlage, das Kastenkinn war mit den Kasten-Spanten schon da.
2. **Rundmaul** (9d497bb): O-Maul als Aufsatz an der Kappenmitte (Lippenring, innere Kante, Rachenboden), Öffnen weitet den Ring und dehnt die Haut; rund 0,96–0,99, 4,2-fach weiter, keine Durchdringung. Prüfwesen **Fisch**, Tafel Maul mit Chip „Rundmaul“ und Reglern. Deskriptoren rechnen auf dem erweiterten Käfig.
3. **Drache** (1537249): Kopf kippt 20° zurück, Hals zieht 0,7 → 2,5-mal weiter, keine Durchdringung. Offen: Die untere Schnauze steht als Schnabel vor.
4. **W-Oberlippe** (5eb4d8b): drei gemessene Anläufe am Plattenmaul, nicht gelöst (steigende oder flache Arme schneiden beim Öffnen durch die Oberlippe).
5. **Kastenkinn:** über Kasten-Spanten und Kiefer-Spant mit Ecken, kein eigener Baustein.
6. **Abnahme per Skript** (9772e52): Bild `docs/progress/editor/maularten-m6-abnahme-2026-10-15.jpg`.
7. **Zähne rundum am Rundmaul** (5f77138): Ring-Zahnfleisch innerhalb der inneren Lippe, Spitzen zur Mitte, wachsen mit der Öffnung (Regler „Zähne rundum“, nur Anzeige).

**Plan 5.2 (Rig) weiter:** Schädelgelenk als Griff gebaut (559bca8; Seite und Bühne, ohne Umbau). Bodengrenze gemessen: Kein Prüfwesen stößt durch den Boden, aber Kugel und Rex heben beim vollen Öffnen den Bauch 1,4–1,6 % der Höhe an; Bodenhaftung über die Gewichte staucht die Haut (36 Paare) und ist zurückgenommen (32b4c94). Kehlkette offen (Florians Probe zeigt, ob nötig).

**Behobene Befunde unterwegs:**
- Die Höhe als Maß für Augen, Lippenband, Nase und Material kam aus der Pose; beim Öffnen wuchsen sie beim Rex um 11 %. Jetzt aus der Ruhelage.
- Gedrehte Augen neigten sich beide in dieselbe Richtung; das linke Auge bekommt die gespiegelte Drehung.
- Der Bogen für zu und Sichel zeichnete die Gegenseite seines Kreises mit.

## Entscheidungen für Florian

1. **Brauenwulst** am Rex-Augapfel, einer der Wege von der Planseite: Ringe am Auge (Stationen wie ein Reifen, klein), Loop-Cut (größer), Brauenkante von Hand (Kantenlinie + Pinsel), Braue als Teil.
2. **Hund mit W-Lippe:** Unterkiefergewichte je Armstück am Plattenmaul, oder Hund als Schlitzmaul mit Philtrum-Kerbe vorn.
3. **Look** der drei Augenarten (Bild 10, 11, PezenPez), des Rundmauls (`fish_round mouth`) und des Drachen (`rex_dragon_big mouth`); ob der Prüfwesen-Rex Augäpfel behalten soll.
4. Aus M4 weiter offen: Zahngröße/-breite gegen die Referenz, Rex mit 14 Zähnen in 10 min, runder Haps (Automatik oder Fressen-Pose).

## Ehrlich offen

- **Augen:** kein Blick (die Pupille folgt nicht), dunkler Ring weicher als im Bogen, Lid der Kugeln ohne Muster, Feuer/Gas mit altem Schlitzauge, Höhle nicht für ein Auge in der Mitte und nicht mit angesteckten Beinen. Am Rex taugen für die Höhle nur Ringpunkte über der Lippenreihe.
- **Zähne (M4):** Bedienung „Setzen T“, Fächer und Prüf-Lupe fehlen; verdeckte Riesenzähne werden nicht gemeldet; Prüfung im Bau-Worker (200–500 ms).
- **Aus Block 2:** Lokalität beim Ziehen des Schlitzanfangs (1,3–4,6 px), Langhals bei 100 % (Wangenknick, Kehle), „blau am Hals“.
- Alles mit Phase im [Kritik-Register](plans/2026-10-14-kritik-phase-0.md).

## Nächster Schritt

1. **Florians Urteil** zu M4, M5 und M6 (Bilder `zaehne-m4-abnahme-rex-14-2026-10-15.jpg`, `augen-m5-abnahme-2026-10-15.jpg`, `maularten-m6-abnahme-2026-10-15.jpg`) und seine Entscheidungen oben.
2. **Phase 2 ist nach Plan durchgebaut** (Plan 5.2: Schädelgelenk gebaut, Bodengrenze gemessen, Kehlkette offen). Weiter je nach Florians Wahl: Brauenwulst, Hund, Bauch beim Öffnen, Aufräumen der Versuche (Phase 1 M4.2, großer Schritt, nur mit seinem Einverständnis).

## Wo Florian testet

- Web-Modus `http://localhost:5180` (`pnpm --filter @ee/editor dev:web`). **Nach dem Pull den Dev-Server neu starten** (HMR-Falle; neue Kern-Module und Material-Dateien).
- **Maularten ausprobieren:** Library ▸ Fisch (Rundmaul; Stufe Maul ⌘2: Öffnung, O zu/offen, Zähne rundum), Drache (Stufe Maul, Chip „hals“, Öffnung), Tiger (Plattenmaul).
- **Schädelgelenk:** Library ▸ Rex, Stufe „Posen & Leben“: dunkler Griff an der Basis des Schädelknochens (Seite) bzw. Perle auf der Bühne.
- **Augen ausprobieren:** Library ▸ Prüfwesen PezenPez, Glubsch oder Rex, ⌘4 (Stufe Augen).
  1. Tafel: Art (gemalt, Glubsch, Augapfel), Form/Pupille, Zustand als Vorschau, Lid, Blinzeln, Größe, Breite, Drehung, Tiefe, Farbe.
  2. Klick auf den Körper setzt das Auge (überall auf der Haut; der Augapfel rastet auf einen Ringpunkt ohne Lippe), am Rand ziehen ändert die Größe.
  3. Beim Rex mit dem Kieferknopf öffnen: Augen und Höhle folgen dem Schädel.

## Prüfen

- `pnpm typecheck`; `cd packages/shape && npx vitest run` (271 Tests; feste Tempo-Schranken kippen bei belegter Maschine — vorher `uptime`, einzeln mit `-t`); `cd apps/editor && npx vitest run` (16); `pnpm lint`.
- Augen: `apps/editor/scripts/pruefen/run-check.sh apps/editor/scripts/pruefen/<skript>`. Skripte: `augen-zustaende.mjs`, `augen-glubsch.mjs`, `augen-tafel.mjs`, `augen-augapfel.mjs` (`LAGE`, `GROESSE`), `augen-abnahme.mjs`; Maularten: `maularten-bestand.mjs`, `rundmaul.mjs`, `drache.mjs`, `maularten-abnahme.mjs`; Rig: `schaedel-gelenk.mjs`. Zähne: `zahn-*.mjs`.
- Prüfreihe Maul vor jeder Meldung: `cd packages/shape && npx vite-node ../../apps/editor/scripts/pruefen/pruefreihe.ts`. Übersicht: `apps/editor/scripts/pruefen/README.md`.
- E2E: `cd apps/editor && E2E_PORT=5191 EE_GPU=1 npx playwright test e2e/kern-ablauf.spec.ts --reporter=list`, danach `git checkout -- docs/progress/editor/e2e-kern-*.png`.
