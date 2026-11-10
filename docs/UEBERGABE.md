# Übergabe (Stand 10.11.2026 nachmittags: G1 bis G3 und G4.1 gebaut; als Nächstes G4.2 bis G4.4)

**Branch `claude/form-zuerst`, Arbeitsbaum `.claude/worktrees/form-zuerst`.** Diese Datei ist der Einstieg. Die alte Übergabe aus der
Käfig-Zeit (Stand 04.11.) steht in der Git-Geschichte: `git show 82aed6dc:docs/UEBERGABE.md`.

**Auftrag (Florian, 10.11.):** Die Schritte G1–G4 aus dem Nachtrag von
[`docs/research/2026-11-10-gegenpruefung-kurven-loeser.md`](research/2026-11-10-gegenpruefung-kurven-loeser.md) bauen
(„`?gewichte=geometrie` als Zielmodell“): G1 Einsetzen ausschreiben, G2 Anzeige, G3 durchgehend rechnen, G4 Schweres in den Worker.
Kriterien stehen in der Tabelle des Nachtrags; Messwerte und Befunde je Schritt unter „Stand“ am Ende des Nachtrags.

**Stand der Schritte (10.11. nachmittags; es baut die Sitzung der Gegenprüfung, die frühere bauende Sitzung ändert nichts mehr):**
- **G1 gebaut** (`6eae3883`): Einsetzen für eine und drei Spalten ausgeschrieben (`loeser/zerlegung.ts`, Test `zerlegung.test.ts`),
  bitgleich mit vorher. Runde „geometrie“ 12,8 → 7,7 ms / 32 → 15,5 ms / 73 → 32 ms bei 5 200 / 11 000 / 23 400 Punkten (Kern,
  Ohr-Zug); Lösen mit drei Spalten 6,0 → 1,7 ms. Kriterium bei 11 000 erfüllt (≤ 16 ms), bei 5 200 knapp nicht (7,7 statt ≤ 7 ms,
  bei belegter Maschine gemessen).
- **G2 gebaut** (`0f80f0e2`): Griffe in wahrer Länge, Bézier-Pfad auch im Zug (`pfadKurven(a, l, sp, li)`). Probe
  `form-griff-loslassen.mjs`: Sprung der Griffspitze beim Loslassen 0,00 px (vorher 42,5 px), Linie im Zug gegen danach 0,00 px.
  **Florian hat entschieden** (10.11.): „Die Griffe bleiben in wahrer Länge wie in Illustrator.“ Der Streckfaktor und der
  Vergleichsschalter `?griffe=mindest` sind entfernt (`44a0fb8d`).
- **G3 gebaut** (`44a0fb8d`, `ab3a8d95`): Über die ganze Haut rechnet der Löser im Bildtakt (`zugRechnen` in `schleife`), auch
  wenn die Maus ruht, bis die Form steht; `zugBewegen` setzt nur noch die Ziele und zeichnet die Kurven.
  - „Steht“ = in einer Runde kein Punkt über 0,05 Einheiten längs der Flächennormalen (`RUHE`, `rundeMitWeg`), höchstens 60 Runden
    nach der letzten Mausbewegung (`NACH_RUNDEN`). Je Bild Runden für höchstens 12 ms (`BUDGET_MS`), mindestens eine.
  - Loslassen: Runden am Ende nur noch, wenn die Haut nicht steht. Das Setzen danach rechnet, bis die Form steht (höchstens
    `RUNDEN_NEU` = 12; `?setzen=4` wie vorher).
  - Nach Neuaufsetzen und Einwechseln im Zug gelten sofort die Pfade als Ziele (`zieleVonJetzt`).
  - Gemessen im Fenster (Ohr, vor dem Loslassen gehalten, vor G3 → mit G3): Ruck beim Loslassen 1,06 → 0,00 / 0,85 → 0,00 /
    11,4 → 0,00 Einheiten bei 5 200 / 11 000 / 23 400 Punkten; Ende gegen vorher (99 % der Punkte) 1,2 → 0,35 / 0,6 → 0,04 /
    8,7 → 0,25–0,7. Schnell gezogen und gehalten lag die Haut vorher 39 Einheiten zurück, jetzt 1,4.
  - **Nicht behoben:** schneller Zug mit sofortigem Loslassen; die Stufen nach dem Loslassen (Verdichten, Setzen). Das ist G4.
- **Befunde aus G3** (Bericht, „Vier Befunde aus dem Messen“):
  1. Auf einem geänderten Netz schwingt ein neuer Löser vier bis fünf Runden über (Kugel mit frisch eingesetzten Loops: 3,9 /
     7,9 / 2,9 / 1,05 / 0,10 Einheiten, die ganze Haut). Auf demselben Netz und einer Haut, die steht, stört ein neuer Löser
     nicht (≤ 0,06). So entstehen die Stufen nach dem Loslassen und der Ruck beim ersten Greifen nach einem neuen Loop.
  2. Die Punkte gleiten längs der Fläche stetig weiter (bei 23 400 Punkten 0,04 Einheiten je Runde), die Form steht.
  3. Die Bremse hält die Haut nicht nur fest: Sie steht wirklich (Gegenprobe mit neuem Löser).
  4. Bei 23 400 Punkten hat das Prüfnetz 1 442 zu kurze Kanten; das Zusammenlegen im Zug hinterlässt bei (−115, 48, ±93) Punkte
     mit drei und vier Nachbarn, an denen die Haut unruhig bleibt. `&kurz=0` lässt die Haut dort einfallen.
- **Florian zu G3 (10.11.):** „Es gefällt mir schon besser. Auch die Performance ist schon besser, aber aktuell ruckt es während
  dem Ziehen noch spürbar.“ Und: „gleich zu G4“ (die neue Fassung ist damit freigegeben).
- **G4.1 gebaut** (`cf46b548`): Das Verfeinern im Zug läuft ganz im Hintergrund (`src/form/verfeinern.ts`,
  `verfeinern.worker.ts`; `zerlegen.worker.ts` gibt es nicht mehr). Beim Auslösen wird der Zug nicht mehr neu aufgesetzt (die
  Loops gehen als festgelegte Kopie in den Auftrag), eingewechselt wird im nächsten Bild an Stelle der Löserrunde
  (`eingetroffen`, `schleife`). Gemessen (Bilder im Zug über 33 / 50 / 100 ms, längster Abstand; vorher → jetzt): 5 200 Punkte
  5 / 4 / 0, 87 ms → 1 / 0 / 0, 46 ms; 11 000 Punkte 5 / 4 / 3, 130 ms → 2 / 1 / 0, 54 ms; 23 400 Punkte 89 / 22 / 5, 469 ms →
  42 / 3 / 1, 106 ms. Es bleiben das Einwechseln (10 / 28 / 59 ms, zweimal je Zug) und bei 23 400 Punkten die Runde selbst
  (29–33 ms je Bild; G5/G6).
- **G4.2 bis G4.4 offen** (Bericht, „Was das für G4 heißt“): G4.2 Nachlauf im Bildtakt nach dem Loslassen, bis die Haut steht;
  G4.3 Verdichten, Zerlegen und Setzen verdeckt im Hintergrund, bis die neue Haut steht, einmal einwechseln (der Auftrag aus
  G4.1 lässt sich dafür wiederverwenden); G4.4 dasselbe nach jeder anderen Änderung (Loop, Punkt, Kante). Den Stand der Bremse
  weiterzugeben ist nach Befund 1 nicht der Hebel. Danach G5 (zuerst die Güte des Netzes), G6 (halbe Haut).

## 1. Stand

- **Letzter Code-Commit:** `cf46b548` (G4.1). Alles ist committet und gepusht (lokal = `origin/claude/form-zuerst`).
- **Halbfertiges:** keins. Am 09.11. sind zwei Löser-Versuche wieder entfernt worden („gleiches Maß“, „Krümmung an den Linien
  mitgelöst“; Stand des zweiten in `476a874f`). Der Code des Lösers (`dicht/ausKurven.ts`) ist seit `1f1f5079` (Schalter
  `maxNormalen`) unverändert; G1 hat nur das Einsetzen in `loeser/zerlegung.ts` ausgeschrieben, G2 und G3 nur das Fenster.
- **Läuft:** ein Vite-Server auf Port 5193 aus diesem Arbeitsbaum. Seit dem 10.11. mittags gehört er der Sitzung der
  Gegenprüfung (Konfiguration `kurven` in `.claude/launch.json` des Hauptordners, mit `pnpm -C <Arbeitsbaum>`); der alte Prozess
  der früheren Sitzung ist beendet. Florian testet damit. Vor einem eigenen Start `lsof -i :5193` prüfen. Port 5180 gehört dem
  alten Editor, nicht benutzen.
- **Dokumente:**
  - Gegenprüfung mit Nachtrag (Maßstab für G1–G4): `docs/research/2026-11-10-gegenpruefung-kurven-loeser.md`; Einzelberichte in
    `docs/research/2026-11-10-gegenpruefung-berichte/`; Skripte und Ausgaben in
    `apps/editor/scripts/pruefen/gegenpruefung-2026-11-10/` (README).
  - Bilanz seit dem 11.10.: `docs/research/2026-11-09-bilanz-wesen-editor.md` (zwei Fehler darin, siehe Abschnitt 6).
  - Planseite des Wegs: `docs/plans/2026-11-06-kurven-als-wahrheit.md` (Abschnitte 1–18, chronologisch).
  - Florians Klarstellungen wörtlich: `docs/plans/2026-10-22-klarstellungen.md` (Nachrichten 1–3).
  - Verlauf: `CLAUDE.md`, Einträge ab 04.11. („Form zuerst“).

## 2. Starten und testen

**Server** (aus dem Wurzelordner des Arbeitsbaums):

```bash
EDITOR_WEB=1 pnpm --filter @ee/editor exec vite --port 5193 --strictPort
```

- **Florians Adresse jetzt:** `http://localhost:5193/kurven.html?gewichte=geometrie`. Standard ohne Schalter ist der Löser mit gleichen
  Gewichten. `?form=bohne` startet mit einer Bohne statt der Kugel, `?dreiecke=<n>` setzt die Größe des Startnetzes (Standard 6 000).
- **Altes Fenster** `form.html` (Form aus den Ansichten) und der alte Editor (`pnpm editor`, Käfig) werden nicht mehr benutzt.
- **Test-Haken im Fenster:** `window.__kurven` (`kurven.ts`, ab Zeile 3321; `zeiten()` trägt seit G4.1 auch `messung`,
  `hintergrundTeile`, `auspacken`, `einwechslungTeile`): `weiterrechnen` (n Runden im laufenden Zug),
  `nachrechnen`, `loops`, `auswahl`, `pfadRest`, `knickAm`, `griffe`, `kamera`, `knick`, `umgeschlagen`, `maul`, `zeiten` (zug,
  zerlegen, bereich, verdichtung, punkte, stufen, endrunden, offen, nachRunden, hintergrund, ausloesung, einwechslung,
  hintergrundMs, stufeMs, neuRechnen, vorrechnen, nachLoesen), `lagen`, `grundLagen`, `pose`, `dreiecke`, `meldung`, `bild` (Weltpunkt →
  Pixel im Blatt), `ausschnitt` (Zoom je Blatt), `felder`, `setzeRadius`, `symmetrie`, `masse`.

**Tests, die grün sein müssen:**
- Fenster, aus `apps/editor`: `npx vitest run src/form/verfeinern.test.ts` (3 Tests, der Auftrag im Hintergrund).
- Kern der dichten Form, aus `packages/shape`: `npx vitest run src/dicht/ src/loeser/zerlegung.test.ts`. Zuletzt 110 von 110
  grün (10.11.), etwa 20 s. Ausgaben
  bestandener Tests nur mit `--reporter=verbose`. `HAUT=gedaechtnis` lässt `loops.test.ts` und `weiterZug.test.ts` mit dem alten
  Löser laufen (Standard `kurven`).
- Typen: `pnpm --filter @ee/shape typecheck` (09.11. grün); `pnpm --filter @ee/editor exec tsc --noEmit -p tsconfig.json` (10.11.
  grün). Lint: `pnpm --filter @ee/editor exec eslint <dateien>` (10.11. sauber für die geänderten Dateien). `prettier` mit der
  Vorgabe des Repos passt nicht zu den Dateien unter `form/` (lange Zeilen); nicht umformatieren.
- **Nicht** die ganze Testreihe von `@ee/shape`: Die Zeit- und Lasttests des Käfigs reißen unter Last (ohne Bezug zu `dicht/`).
- Die Tests unter `dicht/` haben keine Zeitschranken. Die Grenzen in `weiterZug.test.ts` (A–E) hängen an der Reihenfolge des
  Zusammenlegens und haben deshalb Abstand. Wer das Zusammenlegen oder den Löser ändert, sieht dort zuerst etwas.

**Proben im Fenster** (aus `apps/editor`: `node scripts/pruefen/<probe>.mjs`, Variante über `KURVEN_URL=…`; nie gleichzeitig mit
vitest; während sie laufen, keine Dateien unter `packages/shape/src` oder `apps/editor/src` ändern):

| Probe | wofür |
| --- | --- |
| `form-drei-faelle.mjs` | Florians Hörner mit Griffspiel (`FALL=hoerner`) und das kleine Detail (`FALL=detail`): Zeit je Mausbewegung, Knicke, umgeklappt, **umgestülpt** (schwarze Stellen), jede Änderung nach dem Loslassen. Seit G3: `HALTEN=<ms>` (je Bild Bewegung und Rauminhalt beim Halten), `GPU=1` |
| `form-loslassen-probe.mjs` | Sprung nach dem Loslassen (Hals, Ohr, Rüssel); seit G4.1 auch die Zeile „Bilder im Zug“ (Abstand von Bild zu Bild, Arbeit im Hauptthread je Bild, je Auslösen und Einwechseln). Seit G3: `HALTEN=<ms>` vor dem Loslassen, `PAUSE=<ms>` je Mausschritt, `GPU=1`, `REST=<Runden>` (Rest zur Ruhe), `FERN=<Einheiten>` (Ausschläge fern vom Griff je Bild), `SICHERN`/`VERGLEICH` (zwei Läufe gegeneinander); der Stand vor und nach dem Loslassen wird im Fenster festgehalten |
| `form-anlauf-probe.mjs` | die ersten Bilder eines winzigen Zugs (Anlauf eines neuen Lösers); `ZWEIMAL=1` greift ein zweites Mal |
| `form-griff-loslassen.mjs` | Griff bzw. Punkt (`ZUG=punkt`) ziehen und loslassen: Spitze unter der Maus, Sprung, Linie im Zug gegen danach, Runden am Ende |
| `form-explosion-probe.mjs` | weite Züge `FALL=a\|b\|c\|d\|e\|f\|g\|p` (Überhang, Schnabel, Schlaufe, Stauchen, Rüssel mit Griff, Hammer, Pilz) |
| `form-greifen-probe.mjs` | Tempo beim Greifen, je Mausbewegung, beim Loslassen, bei 5 200 und 15 400 Punkten |
| `form-boden-probe.mjs`, `form-haerte-probe.mjs` | flacher Boden; Kante an Pilz, Linse, Braue |
| `form-hin-zurueck.mjs` | Punkt hinaus und zurück, Linie ohne Welle (`ZYKLEN`) |
| `form-stift-probe.mjs`, `form-stift-kreuzung-probe.mjs` | Stift P, Form über Linien genau |
| `form-griffe-probe.mjs`, `form-punkte-zoom-probe.mjs`, `form-spiegelpunkt-probe.mjs`, `form-kreuzung-probe.mjs` | Griffe, Punkte wie Illustrator, Zoom, Ringenden, Kreuzung = ein Punkt |
| `form-maul-loop.mjs`, `form-fressen-pose.mjs` | Maul als Loop; Fressen-Pose (Blendshape, Grundform bitgleich) |
| `form-detail-probe.mjs`, `form-verdichten-probe.mjs` | kleine Details, Verdichten |

**Proben im Kern** (aus `packages/shape`: `npx vite-node ../../apps/editor/scripts/pruefen/<probe>.ts`):
- `form-netzunabhaengig.ts` (`FALL=hals|ohr|ruessel`, `GEWICHTE=gleich|geometrie`): Nachhinken, Sprung beim Verfeinern. **Achtung:**
  Standard sind 60 Mausschritte mit je zwei Runden, das Fenster rechnet 30 mit je einer. Für Nachhinken `SCHRITTE=30 JE_SCHRITT=1`.
- `form-mass-netz.ts`: wie stark das Maß dieselbe Fläche nach dem Verfeinern anders liest.
- Die Messkopie des Lösers und die Skripte der Gegenprüfung (`loeser/mess1.ts` mit `GEWICHTE=geometrie`, `algebra/a4-kern.ts` mit
  `loesen3` …) in `apps/editor/scripts/pruefen/gegenpruefung-2026-11-10/`. Seit G3 dort auch `loeser/mess7.ts` (Form gegen Gleiten
  nach dem Zug, Anlauf eines neuen Lösers; `FALL=ruhe` ohne Zug), `loeser/mess8.ts` (neuer Löser auf dem Ruhestand, Stand der
  Bremse) und `netz/m7-unruhige-stelle.mjs` (Fenster, 23 400 Punkte).

**Was wackelt:**
- Fenster-Proben sind nicht genau wiederholbar. Die Runden je Bild hängen an der Uhr, das Setzen an einem Zeitgeber. Derselbe
  Fall gab am 08.11. 11,4 und am 09.11. 4,6 Einheiten; die Hörner im verknoteten Zustand am 10.11. 5 bis 66 (fünf Läufe).
- **Ohne `GPU=1` rechnet der Software-Renderer jedes Bild etwa 100 ms lang.** Seit G3 hängt das Rechnen am Bild: Dann kommen
  nur zehn Runden je Sekunde zustande, und ein Zug der Probe dauert doppelt so lang. Für alles, was Zeit oder Nachhinken misst,
  `GPU=1` setzen (Proben, die den Schalter noch nicht haben: `chromium.launch({ args: ['--use-angle=metal', '--enable-gpu',
  '--ignore-gpu-blocklist', '--enable-unsafe-webgpu'] })`).
- Den Stand „vor dem Loslassen“ im Fenster festhalten (Listener in der Erfassungsphase, wie in `form-loslassen-probe.mjs`), nicht
  mit einem Aufruf davor: Seit G3 rechnet die Haut zwischen dem Aufruf und dem Loslassen weiter.
- Zum Vergleichen mit einem alten Stand: `git show <commit>:apps/editor/src/form/kurven.ts > src/form/kurvenAlt.ts`, dazu eine
  Kopie von `kurven.html` mit diesem Skript (beides danach löschen). Beide Stände laufen dann auf demselben Server.
- Faltenzahlen streuen bei gleicher Form um den Faktor 2.
- Zeiten nur als Verhältnisse lesen; bei belegter Maschine gibt es Ausreißer.

## 3. Karte von `apps/editor/src/form/kurven.ts` (3 581 Zeilen, Stand `cf46b548`)

Die Zeilen der Tabelle stammen vom Stand `ab3a8d95`; seit G4.1 liegen sie ab 1486 um 8 höher, ab 2180 um 12 bis 60 höher
(`zugRechnen` 2151, `stufeImHintergrund` 2237, `einwechseln` 2275, `zerleger` 2367, `zugEnde` 2432, `verdichtenOptionen` 2498,
`schleife` 3299, Haken ab 3321). Neu neben `kurven.ts`: `verfeinern.ts` (der Auftrag: `verfeinern`, `hautFlach`, `hautAusFlach`),
`verfeinern.worker.ts`, `verfeinern.test.ts`. `zugNeuAufsetzen` gibt es nicht mehr.

| Zeilen | Abschnitt |
| --- | --- |
| 129–335 | Konstanten und Schalter: `RUNDEN_ZUG` 141, `RUNDEN_ENDE` 142, `BUDGET_MS` 150, `RUHE` 151 (G3), `HAUT` 215, `GEWICHTE` 222, `mitBereich` 236, `exakt` 242, `RUNDEN_NEU` 253, `KURZ` 265, `GENAU` 277, `LIVE` 285, `linieUngenau` 293, `gestreckt` 320 |
| 178–426 | Haut und Loops; **Rückgängig**: `zurueck` 347 (Stapel ohne Grenze), `schnappschuss` 359, `wiederherstellen` 370 (setzt auch das Ziel Pose/Grundform); `kreuzungenSuchen` 398 |
| 427–711 | Darstellung: `teilungNeu` 542, `geometrieNeu` 600, Kameras, Zoom je Blatt |
| 712–817 | **Maul**: `maulAktuell` 755, `innenZeigen` 783, `maulAnlegen` 801 |
| 818–1017 | **Pose**: `poseKnochen` 824, `poseBetreten` 838, `poseSichern` 866, `grundLoopsAus` 880, `poseVerlassen` 912, `netzGewachsen` 933 (Werte je Punkt nach dem Verdichten umordnen), `knochenSetzen` 961, Regler |
| 1018–1243 | Anzeige: `hautZeigen` 1020 (merkt die Normalen in `normalenGezeigt` für das Maß „steht“), `bandGeometrie` 1086, `baenderZeigen` 1158, `pfad` 1210 (Streckenzug), `pfadKurven` 1227 (Bézier-Pfad, auch im Zug) |
| 1264–1302 | **Griffe**: `griffeZumZeigen` 1274 (wahre Länge; kein Faktor mehr) |
| 1304–1422 | **Blätter zeichnen**: `blattZeichnen` 1307 (in der Grundform immer der Bézier-Pfad; liest nur Ziele, Punkte und Griffe, nicht die Haut), `allesZeigen` 1407 |
| 1424–1485 | **Setzen nach dem Loslassen**: `SETZEN_RUHE` 1444, `vorrechnenPlanen` 1445 (30 ms nach dem Zug: neuer `LoopZug`, Zerlegen im Hauptthread, Runden bis die Form steht (höchstens `RUNDEN_NEU`), dann bis zu dreimal `nachVerdichten(true)` und wieder setzen) |
| 1486–1505 | Messen und Status: `statusZeigen` 1491 („(rechnet)“, solange der Zug `offen` ist) |
| 1506–1838 | **Zug starten** (Teil 1): Typ `Zug` ab 1508 (neu: `zielNeu`, `offen`, `nachRunden`), `zug` 1553, `abbildung` 1556, `loeserHaut` 1629, `loeserFuer` 1659 (in der Pose Gedächtnis mit Bereich), `stueckLoeser` 1670, `griffZugStarten` 1723, `punkteAnKreuzung` 1764, `eckeGezeigt` 1781, `eckeUmschalten` 1790 |
| 1839–2048 | **Zug starten** (Teil 2): `zugStarten` 1839, `punktNach` 1974, `verschiebungen` 1988 |
| 2049–2105 | **Zug bewegen**: `zugBewegen` 2049. Über die ganze Haut setzt es nur die Ziele (`zielNeu`, `offen`) und zeichnet die Blätter (2086–2094); mit Bereich (Pose, `?haut=gedaechtnis`) rechnet es wie bisher im Mausereignis (2095–2104) |
| 2107–2177 | **Rechnen im Bildtakt (G3)**: `NACH_RUNDEN` 2111, `rundeMitWeg` 2119 (eine Runde, zurück kommt die Bewegung der Form längs der Normalen), `zugRechnen` 2139 (je Bild Runden bis `BUDGET_MS`, bis die Form steht; Verfeinern im Zug nach einer Mausbewegung, nur `geometrie`, nicht bei Griffen), `zieleVonJetzt` 2174 |
| 2179–2386 | **Verfeinern im Zug**: `zugStufe` 2187, `stufeImHintergrund` 2221, `zugNeuAufsetzen` 2252, `einwechseln` 2277, `HINTERGRUND` 2333, Worker `zerleger` 2350 (`src/form/zerlegen.worker.ts`, ohne Fehlerbehandlung), `zugGriffeUebernehmen` 2372 |
| 2389–2470 | **Loslassen**: `zugEnde` 2389 (Runden am Ende nur, wenn der Zug noch `offen` ist; Linien festlegen, Kreuzungen, Verdichten, `linienAufPfad`, `poseSichern`, Rückgängig-Eintrag); `nachVerdichten` 2438, `verdichtetesNetz` 2452 |
| 2471–2819 | `loopSchneiden` 2473, `einsetzenLetzten` 2495, `kanteSetzen` 2519, `hautNeuRechnen` 2553, `linienAufPfad` 2610 (Gedächtnis, örtlich; Grund im Kommentar), `formErstellen` 2667, `stelleAmPfad` 2707, `punktAmKlick` 2748, `loeschen` 2787 |
| 2820–2944 | Stift P |
| 2945–3206 | Maus und Tasten: `druecken` 2965, `bewegen` 3029, `loslassen` 3056, Tasten 3136 (G/S/R ohne Prüfung der Zusatztasten) |
| 3207–3270 | Zeichnen: `rendern` 3207, `schleife` 3253 (ruft zuerst `zugRechnen`, zeichnet dann) |
| 3271–3524 | Test-Haken `window.__kurven` |

**Was man nicht verletzen darf:**
- **Spiegelpaare.** Die Haut ist ganz und spiegelgleich, jeder Punkt hat seinen Partner (`haut.spiegel`), Punkte der Mittelebene
  liegen genau bei z = 0. Einsetzen, Teilen und Zusammenlegen erzeugen nur Paare (spiegelgleiche Vierecke mit Mittelpunkt,
  Rücknahme über ein Journal je Dreieck). Der Löser stellt nach jeder Runde die Symmetrie her (Ende von `schritt` in
  `dicht/ausKurven.ts`). `hautAus` ordnet Partner über Lagen zu, die auf 0,001 gerundet sind.
- **Spiegelpunkte.** Ein `ring` ist die Hälfte z ≥ 0; seine Enden liegen auf der Mittelebene. Dort hat ein Punkt zwei Griffe, der
  zweite ist das Spiegelbild des inneren. Unsichtbare Punkte `vonSelbst` an den Ringenden halten Griffe. Sie sind nicht greifbar
  und keine Stützstelle der Kante.
- **Kreuzung = ein Punkt.** Die Punkte zweier Loops mit derselben `kreuzung`-Nummer sind derselbe Ort. Ecke und Griffe gelten über
  `punkteAnKreuzung`/`eckeGezeigt`, ein Doppelklick schaltet alle.
- **Linie = Pfad nur in der Grundform** (`exakt`). In der Pose folgt die Linie je Probe.
- **Der andere Löser in der Pose.** In der Pose rechnet `HautZiele` (Gedächtnis, mit Bereich, ohne Krümmungsfeld), weil die
  Maulöffnung das Krümmungsfeld stört. `linienAufPfad` rechnet örtlich mit Gedächtnis, weil aus den Kurven schon der erste Ring die
  Kugel 10 Einheiten wegzog. Beides ist Absicht, siehe die Kommentare an `loeserFuer` und `linienAufPfad`.
- **Werte je Punkt nach jedem Netzwechsel umordnen** (`alt`, `netzGewachsen`): Blendshape `pose.delta`, Knochenwinkel. Neu gilt das
  auch für den Stand des Lösers (siehe Abschnitt 6, G4).
- **Die Maulöffnung** (`verborgen`) wird weder verdichtet noch gezeigt; in der Pose löst der Löser ohne sie (`loeserHaut`).

## 4. Fallen (was schon kaputtging, woran man es merkt)

1. **Spiegelgleichheit verloren:** Einmal wurde ein Ring über die Mitte rückwärts abgelaufen (20 Punkte ohne Partner), einmal sind
   Rundungsfehler in großen Bereichen bis 1e-3 gewachsen. Merkt man an `__kurven.symmetrie()` über 1e-8 oder an Verdichten-Fehlern.
2. **Explosion und Hänger** (06.11.): Der Löser streckte mit der Dehnung der eigenen Kanten. Merkt man an Koordinaten über 5 000 und
   Millionen Punkten; `form-drei-faelle.mjs` bricht dann ab.
3. **Umgestülpte Haut bestätigt sich selbst** (08.11.): „umgeklappt“ zählt sie nicht, erst die Strahl-Parität („umgestülpt“).
4. **Nummern vergleichen nach dem Verdichten:** Fast alles zählt dann als umgeklappt. Über Lagen bzw. die Stelle `s` vergleichen.
5. **Proben parallel zu vitest:** Es kommen weniger Mausereignisse an (140 ms je Bewegung), und der Zug geht einen anderen Weg.
6. **Dateien im Vite-Root ändern, während eine Fenster-Probe läuft:** Die Seite lädt neu, die Probe misst Unsinn. Läuft Florians
   Fenster, lädt es auch bei ihm neu.
7. **Proben mit der Maus:**
   - Ein Klick vor dem Zug kommt als Doppelklick an.
   - F ist nach dem Zeichnen schon aus; ein zweites F zeichnet bei jedem Zug neu.
   - Punkte nach Lage wählen nur ohne unsichtbare Ringenden (`sichtbar`).
   - Die Hornspitze in der Front wählen, in der Seite liegt sie auf dem Umriss.
8. **Kern-Probe mit zwei Runden je Schritt:** Das Nachhinken sieht zehnmal kleiner aus als im Fenster.
9. **Kugel mit einem Ring als Kriterium:** Jede Kugel durch den Ring ist eine Lösung. Taugt nicht.
10. **Ein neuer Löser beginnt ohne den Stand des alten:** Bremse `beta`, `dVorher` und Startwert `cWarm` sind dann zurückgesetzt, und
    die ersten Runden machen volle Schritte (bei `geometrie` Pendeln). Gemessen am 10.11.: Das stört nur auf einem geänderten
    Netz (dort 4 bis 8 Einheiten über die ganze Haut, vier bis fünf Runden lang); auf demselben Netz und einer Haut, die steht,
    bewegt ein neuer Löser nichts.
11. **Vite merkt sich einen Importfehler** einer Datei, die erst danach angelegt wird: Server neu starten.
12. **Werkzeuge:** `git apply` aus einem Unterordner lässt Pfade außerhalb still aus; macOS hat kein `timeout`; das Werkzeug lehnt
    lange Bash-Ketten mit `cd` und Git ab (einzelne Befehle, `git -C`).
13. **„Steht“ nie an der ganzen Bewegung der Punkte messen:** Nach der Geometrie gleiten die Punkte längs der Fläche stetig weiter
    (bei 23 400 Punkten 0,04 Einheiten je Runde). Immer die Bewegung längs der Normalen nehmen oder den Abstand zur Fläche davor.
14. **`&kurz=0` auf einem dichten Netz:** Bei 23 400 Punkten wächst das Netz im Zug auf 35 700 Punkte, und die Haut fällt ein.
15. **Auf das Ende einer Probe warten:** `pgrep -f <probe>` in einer Warteschleife findet die Schleife selbst. Die Probe mit
    `run_in_background` starten und auf die Meldung warten.

## 5. Florian: letzte Urteile, offene Entscheidungen, Testfälle

**Urteile:**
- **10.11.:**
  - „Die Griffe bleiben in wahrer Länge wie in Illustrator. Mach weiter mit G3.“ (nach G1/G2; zu G3 steht sein Blick aus)
  - „Das Ergebnis ist schon ganz gut, aber entweder sehe ich noch Veränderungen beim Loslassen der Handles und das Mesh justiert nach,
    oder es ist ungenau und stockt.“
  - `?gewichte=geometrie` ist für ihn „bis auf das Tempo schon recht nah dran“, „bisher elegantester Weg mit bester Genauigkeit,
    aber zu langsam“.
  - Er will, dass die andere Sitzung G1–G4 baut.
- **09.11.:**
  - Die Löser-Wege „klingen nach viel Nachjustieren“.
  - „… warum das verdichtete Mesh überhaupt eine andere Form annimmt … sollte einfach nur abrunden, aber in exakt der gleichen Form.“
- **08.11.:** ohne Geometrie „viel lieber“, weil Geometrie ruckelte und nachhinkte. Durch das Urteil vom 10.11. überholt; beurteilt
  war damals ein Bündel aus Maß, Bremse, Matrix und Halten beim Verfeinern.
- **07.11.:** „Punkte wo nötig“ (`?punkte=noetig`) „etwas besser“, er testet weiter.
- **06.11.:** Die Kante knickt „rund“ (nicht Vector); ein Knick ist da oder nicht (Kante an/aus statt Härte 0–3).
- **Grundsätze (05.11., Klarstellungen 2 und 3):**
  - Kurven sind die Wahrheit, die Haut bläst sich zur optimalen Rundung auf, Umrisse sind nur Ergebnis.
  - Kanten = Edgeloops; kein Verschmelzen, alles ein Netz.
  - Bézier-Punkte und O wie in Blender, „die perfekte Mischung aus Vektorwerkzeugen und Blender“.

**Offene Entscheidungen:**
1. ~~Griffe in wahrer Länge oder Mindestlänge~~ Entschieden am 10.11.: wahre Länge wie in Illustrator.
2. Grundform immer symmetrisch? Dann rechnet der Löser eine halbe Haut (G6).
3. Welche Werkzeuge zuerst (Gegenprüfung Abschnitt 6).
4. „Punkte wo nötig“ als Standard für neue Loops.
5. Linie kehrt um: rot zeigen und die Haut dort beim letzten gültigen Stand lassen (Vorschlag der Gegenprüfung), oder den Griff
   begrenzen.
6. `?gewichte=geometrie` als Standard, nach seinem Test mit G1–G4.
7. G4 in der neuen Fassung (Nachlauf im Bildtakt, Setzen verdeckt, einmal einwechseln, auch nach Loop/Punkt/Kante): sein Wort
   steht aus (vorgelegt am 10.11. nachmittags).

**Seine Testfälle** (Bilder in `docs/progress/editor/`):
- Hörner aus dem senkrechten Ring mit Griffspiel: `form-ohren-aufblasen-florian-2026-11-08.webp`; das Bild mit den schwarzen
  Stellen liegt nur im Chat.
- Grobes kleines Detail (Ohr): `form-detail-grob-florian-2026-11-08.webp`.
- Pilz: `form-pilz-florian-2026-11-06.webp`.
- Boden mit vier Höckern: `form-boden-florian-2026-11-05.webp`.
- Fischschwanz-Lappen: `form-detail-florian-2026-11-05.png`.
- Kopf aus einem Ring: `form-kopf-florian-2026-11-05.png`.
- Ringende: `form-ringende-florian-2026-11-05.png`.
- Kreuzungsgriff: `form-kreuzung-griff-florian-2026-11-05.png`.
- Dazu Rüssel und Hammer (06.11.), Braue, Maul als Loop und Fressen-Pose.

**Zoom und Netzgröße:** Florian arbeitet bei etwa 300 % (1 Einheit = 2,7 px; ein halber Bildpunkt = 0,18 Einheiten), am Detail auch
höher. Seine Wesen haben 11 000–26 000 Punkte; am 08.11. waren es 18 234 Punkte bei 49 ms je Zug, nach dem Griffspiel 26 284 Punkte
bei 126 ms. Die Prüfkugel hat 5 200. Kriterien deshalb immer auch bei 11 000+ Punkten messen.

## 6. Einwände und Ergänzungen der bauenden Sitzung zur Gegenprüfung

Die Gegenprüfung stimmt in den Hauptpunkten. Drei Stellen sind im Code nachgesehen und bestätigt: Griff-Faktor, Bremse nur bei
`geometrie`, allgemeines Einsetzen. Die Schlussfolgerung der Bilanz („am Löser kein Hebel mehr“) und deren Schätzungen für nativ
(„5- bis 30-mal“) waren falsch; die gemessenen Zahlen der Gegenprüfung gelten.

**Was Absicht ist:**
- *(Nachtrag 10.11.: Florian hat entschieden, die Griffe bleiben in wahrer Länge; Faktor und Mindestlänge sind entfernt. Der
  folgende Punkt ist damit Geschichte.)*
- **Die Mindestlänge der Griffe (28 px) ist Absicht** (05.11.). Kurze Griffe lägen sonst unter dem Punkt und wären nicht zu greifen.
  Der Zug wirkt dann im selben Verhältnis feiner, wie ein Hebel. Fehlerhaft ist nur, dass der Faktor nach dem Loslassen (und in
  den anderen Blättern schon im Zug) neu gerechnet wird. Vorschlag für G2, solange Florian nicht „wahre Länge“ wählt: Faktor je
  Punkt festhalten, solange er gewählt ist, und nur bei Zoom oder neuer Auswahl neu rechnen. Dass der kürzere Griff den Faktor für
  beide bestimmt, ist ebenfalls Absicht: Beide Griffe eines glatten Punkts stehen so sichtbar auf einer Linie.
- **Streckenzug im Zug** (`kurven.ts:1332`) war Absicht aus Tempo-Gründen und zeigte, wo die Haut gerade ist. Mit „die Kurve ist
  die Wahrheit“ ist der Pfad richtig, der Mehraufwand ist klein. Einverstanden mit G2.

**Ergänzungen zu G1–G4:**
- **G1:** `einsetzen(B, k)` in `loeser/zerlegung.ts` (in `systemAusDaten`, ab Zeile 286; auch `normalSystemZerlegt` endet dort, Zeile 70) dient beidem, `loesen` mit drei und
  `loesenSpalte` mit einer Spalte. Der Worker baut sein System über `systemAusDaten`, also wirkt eine Änderung dort überall. Die
  Kehrwerte der Diagonale lohnen sich einmal je Zerlegung statt je Aufruf. Tests unter `dicht/` vergleichen keine Bits des Lösers,
  „bitgleich“ meint dort Rückgängig und die Grundform in der Pose.
- **G2:** Die Reihenfolge in `zugBewegen` ist heute: Löser (2074–2078), dann Haut, Bänder, drei Blätter (2094–2097). Die Kurven
  (Punkte, Griffe, Pfad) lassen sich vor den Löser ziehen; dafür braucht `blattZeichnen` eine Fassung, die nur die Linien neu
  zeichnet.
- **G3:**
  - Beim Rechnen im Bildtakt nicht je Runde die ganze Anzeige neu bauen, sondern einmal je Bild. Die Anzeige (Normalen, Bänder, drei
    SVG-Blätter) kostet heute ungemessen mit.
  - Der Pfad mit Bereich (`mitBereich()`: Pose und `?haut=gedaechtnis`) rechnet mit `RUNDEN_ZUG` und in Stufen; ihn zunächst
    unverändert lassen.
  - Dass `geometrie` vom Weg abhängt (Gegenprüfung Anhang A: 2,7 Einheiten bei einem großen Schritt), sollte nach G3 nicht von der
    Zuggeschwindigkeit abhängen. Das am besten mit einem schnellen und einem langsamen Zug prüfen.
    *(Nachtrag 10.11., geprüft mit `form-loslassen-probe.mjs` und `SICHERN`/`VERGLEICH`, Ohr, 2 s gehalten: schnell gegen langsam
    1,4 Einheiten (99 % der Punkte 0,6), zwei langsame Läufe 0,4; vor G3 lag die Haut nach dem schnellen Zug 39 Einheiten zurück.)*
- **G4:**
  - Wer den Löser nach dem Netzwechsel neu baut, sollte `beta`, `dVorher` und `cWarm` des alten über `alt` übernehmen (neue Punkte:
    Mittel der Nachbarn). Sonst pendelt jeder neue Löser in den ersten Runden (Falle 10).
    *(Nachtrag 10.11., gemessen mit `loeser/mess8.ts`: Auf demselben Netz und einer Haut, die steht, stört ein neuer Löser nicht.
    Der Anlauf kommt vom geänderten Netz. Ob das Weitergeben auf einem neuen Netz hilft, erst messen; der sichere Weg ist, das
    Setzen verdeckt bis zur Ruhe zu rechnen.)*
  - Dem Worker fehlt eine Fehlerbehandlung.
  - Die Zerlegungen werden nach einem Fingerabdruck der Zeilen gemerkt (`merken`); eine Zerlegung aus dem Worker gehört in denselben
    Speicher.
  - Für das Setzen nach dem Loslassen (`vorrechnenPlanen`) gilt dasselbe wie für das Verfeinern im Zug: einmal einwechseln statt bis
    zu vier Stufen.
- **G5** (danach): Das Netz wächst vor allem durch `GENAU` = MK/40, das nach fast jedem Zug an Details nachteilt, und durch bis zu
  drei Nachverfeinerungen nach dem Loslassen (`nachVerfeinert`).
- **Messen:**
  - Kriterien bei Florians Netzgröße (11 000+) und 300 % prüfen, nicht nur an der Kugel mit 5 200 Punkten.
  - Nachhinken auch während des Zugs messen, nicht nur danach.
  - Kern-Proben mit einer Runde je Mausschritt rechnen lassen.

**Nicht nötig, wenn `geometrie` der Weg ist** (wie im Nachtrag): Bremse für „gleich“, `HALT` skalenfrei, Ausgleich beim
Netzwechsel. Der Ausgleich ist selbst ein kleines Gedächtnis und am Rüssel nach dem nächsten Zug schlechter.

**Zwei Fehler in der Bilanz vom 09.11.** (in der Datei nicht korrigiert):
1. Backen gibt es nur in `form.html`, in `kurven.html` ist es nicht angeschlossen. Abschnitt 2 der Bilanz führt es unter „Trägt“.
2. Altcode: Nur `form.html` braucht 7 Dateien (2 483 Zeilen); an `kurven.html` hängen 22 Dateien (knapp 13 000 Zeilen). Darin
   stecken Teile, die nur `form.html` nutzt (siehe Abschnitt 7).

## 7. Altlasten und was nicht angefasst wird

**Schalter in `kurven.ts`** (18):

| Schalter | Einordnung |
| --- | --- |
| `form`, `dreiecke` | Betrieb (Startform, Größe des Startnetzes) |
| `gewichte` | Betrieb, bis `geometrie` Standard ist (Florians Entscheidung 6) |
| `live`, `hintergrund`, `verdichten`, `kurz` | Vergleich für G3/G4, bleiben vorerst (`kurz=0` lässt ein dichtes Netz einfallen, Falle 14) |
| `setzen=4` | Vergleich seit G3: das Setzen nach dem Loslassen mit genau vier Runden wie vorher; fällt mit G4 weg |
| `genau`, `liveGenau`, `liveKante` | Stellgrößen des Verdichtens; Thema von G5 |
| `punkte=noetig` | offene Entscheidung 4, bleibt |
| `haut=gedaechtnis` | Altlast für die Grundform (der Gedächtnis-Löser selbst wird für Pose und `linienAufPfad` gebraucht) |
| `kruemmung=0` | Altlast, wirkt nur mit dem Gedächtnis-Löser |
| `richtung=1`, `maxnormalen=1` | Beweise vom 09.11., Altlast |
| `winkel=1` | verworfene Verdichtung, Altlast |
| `genauHaut=1` | verworfen, solange die Form am Netz hing; mit `geometrie` neu zu prüfen (G5) |

**Code, der Altlast ist** (entfernen nur nach Florians Freigabe, und erst nach G1–G4, damit der Vergleich möglich bleibt):
- `dicht/ausKurven.ts`: `MESSREIHE`/`messreiheSetzen`, Richtung je Seite (`seitenMessen`, `seitenAnlegen`, `seitenSektor`,
  `seitenWert`, `ersteReihe`, Zeilen G1), Option `maxNormalen`.
- `dicht/richtung.ts` (nur `?richtung=1`).
- `dicht/kruemmung.ts`: die Klasse `KruemmungsFeld` (nur `?haut=gedaechtnis`). `KETTE_K` und `KruemmungsKetten` werden gebraucht.
- `dicht/kurven.ts`: `HautLoeser` (Beweis vom 05.11., nur noch in `kurven.test.ts`). `HautZiele` wird gebraucht.
- Nur von `form.html` gebraucht: `backen`, `folgen`, `gleich`, `pose`, `prueffaelle`, `silhouette`, `teile`. **`backen.ts` bleibt**:
  Das Spielnetz soll in `kurven.html` kommen.
- In gemeinsam genutzten Dateien nur für `form.html`: Raumlinien, Ansichten-Streckung und Kantenprofile (über `rund.ts`), Maulschnitt
  und getrennte Kiefer aus `form.html` (`maul.ts`, `kiefer.ts`). `maulLoop` braucht daraus `kieferFeld`, `dickeAmMundwinkel` und
  `maulOeffnen`.
- `form.html` mit `src/form/main.ts` (3 204 Zeilen): altes Fenster, nicht ohne Florian löschen.
- 52 Proben `form-*` in `apps/editor/scripts/pruefen/`, viele für alte Stände.

**Nicht anfassen** (ohne Florians Wort):
- den Gedächtnis-Löser in der Pose und in `linienAufPfad` (Gründe in Abschnitt 3);
- Spiegel- und Kreuzungslogik;
- Pfad und Griffe (`dicht/pfad.ts`, `griffeAnlegen`, `griffeAusZeichnung`, `griffeUebernehmen`);
- Maul am Loop (`dicht/maulLoop.ts`) und die Fressen-Pose (`dicht/poseLoop.ts`);
- `backen.ts`;
- den eingefrorenen Käfig unter `packages/shape/src/kern/` und den alten Editor.

## 8. Arbeitsregeln (Kurzfassung)

- Deutsch, kurz, konkret. Keine Modellnamen in Commits, Docs oder Code. Commits mit der Co-Autor-Zeile wie bisher.
- Nach jedem Schritt committen und pushen. Kein bare `git stash`.
- Florians Fragen zuerst beantworten, mit Messung statt Vermutung. Nie andere Sitzungen anschreiben ohne sein Wort.
- Keine Sonderregel, die einen Körper oder eine Lage nennt; ab der dritten neuen Regel je Block die Struktur prüfen.
- Vor einem Löser-Vorschlag die Planseite „Kurven als Wahrheit“ nach früheren Messungen derselben Idee durchsuchen.
- Florian arbeitet oft per Fernsteuerung: Die Abschlussnachricht muss Frage und Wahlmöglichkeiten selbst enthalten.
- Klare Begriffe: „dichtes Netz“, „Linien“, „Loops“, „Punkte“. Keine Käfig-Begriffe, sie verunsichern ihn.
