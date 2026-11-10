# Übergabe (Stand 10.11.2026: Gegenprüfung fertig; eine andere Sitzung baut G1–G4 aus dem Nachtrag der Gegenprüfung)

**Branch `claude/form-zuerst`, Arbeitsbaum `.claude/worktrees/form-zuerst`.** Diese Datei ist der Einstieg. Die alte Übergabe aus der
Käfig-Zeit (Stand 04.11.) steht in der Git-Geschichte: `git show 82aed6dc:docs/UEBERGABE.md`.

**Auftrag (Florian, 10.11.):** Die Schritte G1–G4 aus dem Nachtrag von
[`docs/research/2026-11-10-gegenpruefung-kurven-loeser.md`](research/2026-11-10-gegenpruefung-kurven-loeser.md) bauen
(„`?gewichte=geometrie` als Zielmodell“): G1 Einsetzen ausschreiben, G2 Anzeige, G3 durchgehend rechnen, G4 Schweres in den Worker.
Kriterien stehen in der Tabelle des Nachtrags.

## 1. Stand

- **Letzter Commit vor dieser Übergabe:** `50880ce7` (Nachtrag zur Gegenprüfung). Alles ist committet und gepusht (lokal =
  `origin/claude/form-zuerst`).
- **Halbfertiges:** keins. Am 09.11. sind zwei Löser-Versuche wieder entfernt worden („gleiches Maß“, „Krümmung an den Linien
  mitgelöst“; Stand des zweiten in `476a874f`). Der Code des Lösers ist seit `1f1f5079` (Schalter `maxNormalen`) unverändert.
- **Läuft:** ein Vite-Server auf Port 5193 aus diesem Arbeitsbaum, gestartet als Hintergrundaufgabe der bauenden Sitzung. Florian
  testet damit. Vor einem eigenen Start `lsof -i :5193` prüfen. Port 5180 gehört dem alten Editor, nicht benutzen.
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
- **Test-Haken im Fenster:** `window.__kurven` (`kurven.ts:3171–3410`): `nachrechnen`, `loops`, `auswahl`, `pfadRest`, `knickAm`,
  `griffe`, `kamera`, `knick`, `umgeschlagen`, `maul`, `zeiten` (zug, zerlegen, bereich, verdichtung, punkte, stufen, endrunden,
  hintergrund, ausloesung, einwechslung, hintergrundMs, stufeMs, neuRechnen, vorrechnen, nachLoesen), `lagen`, `grundLagen`, `pose`, `dreiecke`, `meldung`, `bild` (Weltpunkt →
  Pixel im Blatt), `ausschnitt` (Zoom je Blatt), `felder`, `setzeRadius`, `symmetrie`, `masse`.

**Tests, die grün sein müssen:**
- Kern der dichten Form, aus `packages/shape`: `npx vitest run src/dicht/`. Zuletzt 107 von 107 grün (09.11.), etwa 30 s. Ausgaben
  bestandener Tests nur mit `--reporter=verbose`. `HAUT=gedaechtnis` lässt `loops.test.ts` und `weiterZug.test.ts` mit dem alten
  Löser laufen (Standard `kurven`).
- Typen: `pnpm --filter @ee/shape typecheck` (09.11. grün); `pnpm --filter @ee/editor typecheck` (in den letzten Tagen nicht gelaufen).
- **Nicht** die ganze Testreihe von `@ee/shape`: Die Zeit- und Lasttests des Käfigs reißen unter Last (ohne Bezug zu `dicht/`).
- Die Tests unter `dicht/` haben keine Zeitschranken. Die Grenzen in `weiterZug.test.ts` (A–E) hängen an der Reihenfolge des
  Zusammenlegens und haben deshalb Abstand. Wer das Zusammenlegen oder den Löser ändert, sieht dort zuerst etwas.

**Proben im Fenster** (aus `apps/editor`: `node scripts/pruefen/<probe>.mjs`, Variante über `KURVEN_URL=…`; nie gleichzeitig mit
vitest; während sie laufen, keine Dateien unter `packages/shape/src` oder `apps/editor/src` ändern):

| Probe | wofür |
| --- | --- |
| `form-drei-faelle.mjs` | Florians Hörner mit Griffspiel (`FALL=hoerner`) und das kleine Detail (`FALL=detail`): Zeit je Mausbewegung, Knicke, umgeklappt, **umgestülpt** (schwarze Stellen), jede Änderung nach dem Loslassen |
| `form-loslassen-probe.mjs` | Sprung nach dem Loslassen (Hals, Ohr, Rüssel) |
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
  `loesen3` …) in `apps/editor/scripts/pruefen/gegenpruefung-2026-11-10/`.

**Was wackelt:**
- Fenster-Proben sind nicht genau wiederholbar. Die zweite Runde je Mausbewegung hängt an der Uhr, das Setzen an einem Zeitgeber.
  Derselbe Fall gab am 08.11. 11,4 und am 09.11. 4,6 Einheiten.
- Faltenzahlen streuen bei gleicher Form um den Faktor 2.
- Zeiten nur als Verhältnisse lesen; bei belegter Maschine gibt es Ausreißer.

## 3. Karte von `apps/editor/src/form/kurven.ts` (3 410 Zeilen, Stand `50880ce7`)

| Zeilen | Abschnitt |
| --- | --- |
| 129–293 | Konstanten und Schalter: `RUNDEN_ZUG` 141, `RUNDEN_ENDE` 142, `RUNDE_MS` 148, `RUNDE_MS_GEOMETRIE` 153, `HAUT` 217, `GEWICHTE` 224, `mitBereich` 238, `exakt` 244, `KURZ` 267, `GENAU` 279, `LIVE` 287 |
| 180–428 | Haut und Loops; **Rückgängig**: `zurueck` 349 (Stapel ohne Grenze), `schnappschuss` 361, `wiederherstellen` 372 (setzt auch das Ziel Pose/Grundform); `kreuzungenSuchen` 400 |
| 429–713 | Darstellung: `teilungNeu` 544, `geometrieNeu` 602, Kameras 629–668, Zoom je Blatt 669–713 |
| 714–819 | **Maul**: `maulAktuell` 757, `innenZeigen` 785, `maulAnlegen` 803 |
| 820–1019 | **Pose**: `poseKnochen` 826, `poseBetreten` 840, `poseSichern` 868, `grundLoopsAus` 882, `poseVerlassen` 914, `netzGewachsen` 935 (Werte je Punkt nach dem Verdichten umordnen), `knochenSetzen` 963, Regler 980–1019 |
| 1020–1240 | Anzeige: `hautZeigen` 1020, `bandGeometrie` 1085, `baenderZeigen` 1157, `pfad` 1209 (Streckenzug), `pfadKurven` 1223 (Bézier-Pfad) |
| 1260–1309 | **Griffe**: `GRIFF_PX` 1260, `griffFaktor` 1262, `griffeZumZeigen` 1272 (im Zug Faktor vom Anfang, danach neu gerechnet) |
| 1313–1438 | **Blätter zeichnen**: `blattZeichnen` 1313 (im Zug Streckenzug, sonst Pfad, `:1332`), `allesZeigen` 1412 |
| 1439–1486 | **Setzen nach dem Loslassen**: `vorrechnenPlanen` 1448 (30 ms nach dem Zug: neuer `LoopZug`, Zerlegen im Hauptthread, `RUNDEN_ENDE` Runden, dann bis zu dreimal `nachVerdichten(true)` und wieder setzen) |
| 1487–1506 | Messen und Status |
| 1507–1832 | **Zug starten** (Teil 1): Typ `Zug` ab 1508, `zug` 1549, `abbildung` 1552, `loeserHaut` 1625, `loeserFuer` 1655 (in der Pose Gedächtnis mit Bereich), `stueckLoeser` 1666, `griffZugStarten` 1719, `punkteAnKreuzung` 1758, `eckeGezeigt` 1775, `eckeUmschalten` 1784 |
| 1833–2040 | **Zug starten** (Teil 2): `zugStarten` 1833, `punktNach` 1966, `verschiebungen` 1980 |
| 2041–2107 | **Zug bewegen**: `zugBewegen`; Runden je Mausereignis 2074–2078, Verfeinern im Zug 2088–2092 (nur `geometrie`, nicht bei Griffen), danach die ganze Anzeige 2094–2097 |
| 2108–2291 | **Verfeinern im Zug**: `zugStufe` 2108 (nur mit Bereich), `stufeImHintergrund` 2137, `zugNeuAufsetzen` 2168, `einwechseln` 2190, `HINTERGRUND` 2236, Worker `zerleger` 2251 (`src/form/zerlegen.worker.ts`, ohne Fehlerbehandlung), `zugGriffeUebernehmen` 2273 |
| 2292–2369 | **Loslassen**: `zugEnde` 2292 (`RUNDEN_ENDE` Runden 2305, Linien festlegen, Kreuzungen, Verdichten, `linienAufPfad`, `poseSichern`, Rückgängig-Eintrag); `nachVerdichten` 2339, `verdichtetesNetz` 2353 |
| 2370–2718 | Loops schneiden 2372, `einsetzenLetzten` 2394, `kanteSetzen` 2418, `hautNeuRechnen` 2452, `linienAufPfad` 2509 (Gedächtnis, örtlich; Grund im Kommentar), `formErstellen` 2566, `stelleAmPfad` 2606, `punktAmKlick` 2647, `loeschen` 2686 |
| 2719–2843 | Stift P |
| 2844–3105 | Maus und Tasten: `druecken` 2864, `bewegen` 2928, `loslassen` 2955, Ereignisse 2986–3016, Tasten 3035 (G/S/R ohne Prüfung der Zusatztasten) |
| 3106–3170 | Zeichnen: `rendern` 3108, `schleife` 3154 (zeichnet nur, rechnet nicht) |
| 3171–3410 | Test-Haken `window.__kurven` |

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
    die ersten Runden machen volle Schritte (bei `geometrie` Pendeln).
11. **Vite merkt sich einen Importfehler** einer Datei, die erst danach angelegt wird: Server neu starten.
12. **Werkzeuge:** `git apply` aus einem Unterordner lässt Pfade außerhalb still aus; macOS hat kein `timeout`; das Werkzeug lehnt
    lange Bash-Ketten mit `cd` und Git ab (einzelne Befehle, `git -C`).

## 5. Florian: letzte Urteile, offene Entscheidungen, Testfälle

**Urteile:**
- **10.11.:**
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
1. Griffe in wahrer Länge (wie Illustrator) oder die Mindestlänge behalten, nur ohne Sprung (Gegenprüfung 8.2).
2. Grundform immer symmetrisch? Dann rechnet der Löser eine halbe Haut (G6).
3. Welche Werkzeuge zuerst (Gegenprüfung Abschnitt 6).
4. „Punkte wo nötig“ als Standard für neue Loops.
5. Linie kehrt um: rot zeigen und die Haut dort beim letzten gültigen Stand lassen (Vorschlag der Gegenprüfung), oder den Griff
   begrenzen.
6. `?gewichte=geometrie` als Standard, nach seinem Test mit G1–G4.

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
- **G4:**
  - Wer den Löser nach dem Netzwechsel neu baut, sollte `beta`, `dVorher` und `cWarm` des alten über `alt` übernehmen (neue Punkte:
    Mittel der Nachbarn). Sonst pendelt jeder neue Löser in den ersten Runden (Falle 10).
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

**Schalter in `kurven.ts`** (17):

| Schalter | Einordnung |
| --- | --- |
| `form`, `dreiecke` | Betrieb (Startform, Größe des Startnetzes) |
| `gewichte` | Betrieb, bis `geometrie` Standard ist (Florians Entscheidung 6) |
| `live`, `hintergrund`, `verdichten`, `kurz` | Vergleich für G3/G4, bleiben vorerst |
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
