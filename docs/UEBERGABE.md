# Übergabe (Stand 13.11.2026 abends: Schritt 3 ist abgeschlossen, die heutige Rechnung bleibt („Form halten“ hat Florian ausprobiert: „Gefällt nicht“). Schritt 4 hat mit dem kleinen Donut-Beweis begonnen: Der Rand des Lochs wird durch Verschmelzen allein nicht glatt. Florian entscheidet, wie Schritt 4 weitergeht. Schritt 1 und 2 sind Standard in seinem Fenster auf 5194, sein Urteil dazu steht aus)

Diese Datei wird am Ende jedes Arbeitsblocks **überschrieben**. Die Übergabe vom 11.11. (Karte von `kurven.ts`, Fallen, Proben,
Altlasten, Florians frühere Urteile) liegt unverändert in
[`verlauf/2026-11-11-uebergabe-kurven.md`](verlauf/2026-11-11-uebergabe-kurven.md).

## 1. Worum es geht

- **Plan:** [`plans/2026-11-12-schnell-glatt-exakt.md`](plans/2026-11-12-schnell-glatt-exakt.md). Florian am 12.11.: „Ok,
  fangen wir an.“ Die Entscheidungen aus Abschnitt 5 gelten wie empfohlen, solange er nichts anderes sagt (eine Linie, alte
  Arbeitsbäume weg, Auswahl = Linienstück und Feld, Verschmelzen an der Mitte umkehrbar wie Blenders Mirror, Posen speichern
  ihre Linien, `/editor` erst nach Schritt 7 nachziehen).
- **Seine Anforderungen** (12.11., im Plan aufgenommen): Tempo wie ZBrush oder Blender mit Subsurf; Farbstufen wie eine scharfe
  Vektorlinie; die Haut soll sich weiter organisch aufblasen, aber nicht reißen, nicht kollabieren; Grundform immer gespiegelt
  mit der Mittellinie von Anfang an; über die Mitte ziehen ergibt einen sauberen Loop (Donut); Posen bedienen wie die Basis;
  Maul als eigene Geometrie, Loops um einen Kiefer; Kanten und Flächen auswählen, Doppelklick = ganzer Loop.
- **Arbeitsweise** (Plan, Abschnitt 6): keine Messreihen im Hintergrund, keine Agenten-Fächer, je Schritt eine vorher
  festgelegte sichtbare Probe, Vergleichsbild vor dem Einbau, nie unter seinem Fenster bauen.

## 2. Stand der Schritte

| Schritt | Stand |
| --- | --- |
| 0 Aufräumen | **erledigt** (12.11., Einzelheiten unten) |
| 1 Glatte Anzeige | **eingebaut und Standard** (Abschnitt 4). Florian am 12.11.: „Ja, übernehmen“; seitdem auf der gemeinsamen Linie und in seinem Fenster. `&anzeige=grob` zeigt zum Vergleich die Anzeige davor. Sein Urteil nach dem Arbeiten damit steht aus |
| 2 Kleines Rechennetz | **eingebaut und Standard** (Abschnitt 5): rund 40 % der Punkte, im Zug 16 bis 20 ms je Bild. Florian am 12.11. nachts, vom Handy aus: „ja“; seitdem auf der gemeinsamen Linie und in seinem Fenster. `&netz=dicht` ist das Netz davor. Sein Urteil nach dem Arbeiten damit steht aus. Nicht gebaut: Zeichnen gegen die feine Fläche |
| 3 Beweis „Haut direkt aus den Linien“ | **abgeschlossen, die heutige Rechnung bleibt** (Abschnitt 6, 13.11.): Die Haut nur aus den Linien (A) scheitert zwischen wenigen Linien und an seinen drei Formen. Der Teil B (fertige Haut direkt bewegen) hält rechnerisch; als Schalter „Form halten“ im Bau-Fenster ausprobiert, Florian: „Gefällt nicht“. Knopf und Taste sind wieder weg; der Code liegt nur auf `claude/form-bau` hinter `?ziehen=direkt` |
| 4 Echte Spiegelung (mit der heutigen Rechnung) | **kleiner Beweis „Donut“ gerechnet (Abschnitt 7, 13.11.):** Der Rand des Lochs ist heute eine scharfe Kante und bleibt es auch, wenn die Hälften wirklich verschmolzen werden; zurückgezogen ist die Form wieder da. Der Umbau auf die halbe Haut ist nicht begonnen; Florian entscheidet, ob er ohne glatten Rand kommt oder ob zuerst der Rand geklärt wird |
| 5 Posen wie die Basis | offen |
| 6 Maul als eigene Geometrie | offen |
| 7 Auswahl wie in Blender | offen |

**Schritt 0, was getan ist:**
- `claude/editor-grundlayout` ist in `claude/form-spiegel` geführt (`3f8e09e7`); liegengebliebene Änderungen im Hauptordner sind
  committet (`04ee4606`).
- 13 alte Arbeitsbäume gelöscht (rund 7 GB). Ungespeicherte Reste liegen als Zweige `bergung/2026-11-12-…` (sieben Stück);
  alle früheren Zweige bestehen weiter.
- `CLAUDE.md` (271 KB → wenige Seiten), `apps/editor/CLAUDE.md` (115 KB → kurz) und diese Übergabe (103 KB → kurz) sind neu
  geschrieben; die alten Texte liegen unverändert in `docs/verlauf/`. Die technischen Fallen von Spiel, Renderer und Cloud
  stehen jetzt in `docs/FALLEN.md`.
- Neuer Bau-Arbeitsbaum `.claude/worktrees/form-bau` (Zweig `claude/form-bau`, Port 5197, Eintrag `kurven-bau`).
- **Noch nicht aufgeräumt (Plan, Anhang B: erst nach Schritt 4, und nur mit Florians Ja):** die 30 Schalter in `kurven.ts`,
  die alte Rechnung mit ihren Schutzregeln, `form.html`, die 232 Dateien unter `apps/editor/scripts/pruefen/`.

## 3. Wo was läuft

- **Florians Fenster:** Port 5194 aus `.claude/worktrees/form-alt` (Zweig `claude/form-spiegel`). Adresse
  `http://localhost:5194/kurven.html?gewichte=geometrie`. **Dort arbeitet auch die Sitzung „Blaupause Editor Design Iteration“
  an `/editor`** (`editor.html`, `editor.ts`, `blaupause.ts`); am 12.11. lagen dort ihre ungespeicherten Änderungen. Vor jedem
  Commit in `form-alt`: `git status`, nur eigene Dateien stagen.
- **Gebaut wird in `.claude/worktrees/form-bau`** (Port 5197). Ein fertiger Schritt kommt erst nach Florians Ja nach
  `claude/form-spiegel`, und zwar so (am 12.11. bei Schritt 1 so gemacht): zuerst in `form-bau` `git merge claude/form-spiegel`
  und dort prüfen, dann in `form-alt` `git merge --ff-only claude/form-bau`. Das lädt sein Fenster neu, also vorher ansagen.
- **Zweige zusammenhalten:** Die Design-Sitzung committet Doku im Hauptordner auf `claude/editor-grundlayout` und Code in
  `form-alt` auf `claude/form-spiegel`. Am Ende eines Schritts in `form-alt` `git merge claude/editor-grundlayout` (nur Doku),
  danach im Hauptordner `git merge --ff-only claude/form-spiegel`.

## 4. Schritt 1, glatte Anzeige: gebaut, gemessen, seit dem 12.11. Standard

**Florian am 12.11.: „Spalte 3 einbauen“** (aus dem Vergleichsbild `docs/progress/editor/anzeige-vergleich-…-2026-11-12.jpg`:
gekrümmte Dreiecke, ruhig schattiert). Gebaut im Arbeitsbaum `form-bau` hinter dem Schalter `&anzeige=glatt`. **Florian am
12.11.: „Ja, übernehmen“.** Seitdem ist die glatte Anzeige der Standard von `kurven.html` und liegt auf
`claude/form-spiegel`: Sein Fenster `http://localhost:5194/kurven.html?gewichte=geometrie` zeigt sie. `&anzeige=grob` zeigt zum
Vergleich die Anzeige bis zum 12.11. (die Rechenpunkte selbst). `/editor` (`editor.ts`) hat sie noch nicht; das kommt nach
Schritt 7.

**Was die glatte Anzeige tut** (nur Anzeige, die Rechnung ist unverändert):
- **Verfeinerte Haut** (`apps/editor/src/form/glattPlan.ts`, `GlattPlan`: Zuordnung einmal je Netzstand, Lagen und Normalen je
  Bild; angelegt in `glattAnlegen`, gezeigt in `glattZeigen` in `kurven.ts`). Neue Punkte liegen in der Mitte der gewölbten Kante,
  auf Linien in der Mitte ihres Pfadstücks (`pfadKanten` im Kern; im Zug mit den Punkten und Griffen des Zugs). Die Fläche geht
  durch alle Rechenpunkte, nichts schwingt über.
- **Normalen als Feld:** je Rechenpunkt nach Max (1999), dreimal beruhigt mit Gewichten nach den Mittelwert-Koordinaten, dann mit
  den Lagen verfeinert. **Befund des Tages:** Die Wellen und Stufen in den Farbflächen kamen vor allem aus den Normalen des
  ungleichmäßigen Netzes (nach der Fläche gewichtet kippen sie zur dichteren Seite), nicht aus zu wenigen Dreiecken. Die
  Farbstufen laufen deshalb schon ohne Verfeinerung ruhig.
- **Farbstufe** einen Bildpunkt breit geglättet (`hautMaterial`); **an der Spiegelebene je Bildpunkt geschnitten** (Merkmal
  `aSeite`): Der Rand eines Lochs über die Mitte ist glatt statt gezackt.
- **Stufen:** im Zug bis 6 000 Punkte eine, darüber keine; 200 ms nach der letzten Änderung zwei (höchstens 700 000 Dreiecke,
  sonst eine). Schalter: `&fein=0|1|2|3` legt die Stufen fest, `&ruhe=<n>` die Durchgänge des Beruhigens (`-1`: Normalen wie im
  Vergleichsbild).
- Die groben Puffer (`hautLagen`, `anzeigeZ`, `indexOhneAnliegende`) bleiben wie vorher: An ihnen messen die Proben, an ihnen
  hängen die Strahltreffer.

**Bilder** (`docs/progress/editor/`, je links die grobe Anzeige bis zum 12.11., rechts die glatte): `anzeige-fenster-strange-bird-2026-11-12.jpg`,
`anzeige-fenster-strange-bird-nah-2026-11-12.jpg` (Front bei 260 %), `anzeige-fenster-teat-firefish-2026-11-12.jpg`,
`anzeige-fenster-test_kaputt-2026-11-12.jpg`, `anzeige-fenster-ueber-die-mitte-2026-11-12.jpg` (Punkt über die Mitte gezogen: der
Lochrand), `anzeige-pose-maul-grob-glatt-2026-11-12.jpg` (Fressen-Pose, Maul 45°, Kopf 10°).

**Gemessen** (ohne Bildschirm, „strange bird“, 16 010 Punkte, derselbe Zug; Zeiten nur als Verhältnisse lesen):
- Abstand der Bilder im Zug: Median 21 ms grob, 23 ms glatt (keine Stufe: 2,6 ms je Bild, Linienbänder 0,5 ms). Mit
  einer Stufe wären es 26 ms (4,2 ms und 2,0 ms für die Bänder auf dem Pfad). Die Löserrunde kostet 17,5 ms: Sie bestimmt das
  Tempo, nicht die Anzeige. Das ändert erst Schritt 2.
- Zeichnen aller vier Felder: 8 ms grob; glatt 7 ms ohne Stufe, 9 ms mit einer, 12 ms mit zweien (512 000
  Dreiecke). Ein Blatt kostet rund 1 ms, der feste Teil je Bild rund 5 ms.
- Nach dem Loslassen: einmal ein Bild von bis zu 57 ms, wenn die Stufen der Ruhe angelegt werden (grob 31 ms).
- Rechnung allein, 16 386 Punkte: 2,4 ms ohne Stufe, 3,3 ms mit einer, 7,0 ms mit zweien.

**Geprüft:** Maul-Probe (`form-maul-loop.mjs`) und Probe der Fressen-Pose (`form-fressen-pose.mjs`: Maul, Zug an der Lippe in der
Pose, Knochen, zurück in die Grundform, Loop schneiden, ⌘Z) mit der glatten Anzeige: keine offenen Kanten, ⌘Z genau, keine
Fehler. Im Bild sehen Maul und Pose aus wie mit der groben Anzeige, die Farbflächen des Körpers sind ruhiger. Die kleine Schlaufe
der Linie am Mundwinkel und die Kerbe am Rand des Inneren gibt es in beiden Anzeigen; sie gehören zu Schritt 6. Tests:
`apps/editor/src/form/glattPlan.test.ts` (schnelle Rechnung gegen die Fassung des Vergleichsbilds; Normalen an einer Kugel mit
ungleichmäßigem Netz und an einem Grat), `packages/shape/src/dicht/linieAufPfad.test.ts` (Pfadstücke je Kante). Neue Proben in
`apps/editor/scripts/pruefen/`: `anzeige-vorher-nachher.mjs`, `bilder-nebeneinander.mjs`, `anzeige-zeichnen-zeit.mjs`;
`form-gesichert-zug.mjs` nennt die Kosten der Anzeige je Bild.

**Offen in Schritt 1:**
1. **Florians Urteil nach dem Arbeiten in seinem Fenster** (5194) steht aus. Stört ihn etwas: `&anzeige=grob` zeigt die alte
   Anzeige, an der Rechnung hat sich nichts geändert.
2. Strahltreffer (Zeichnen, Greifen) gegen die feine Fläche: auf Schritt 2 verschoben. Bei den heutigen Punktzahlen liegt die
   grobe Fläche nur Bruchteile einer Einheit neben der feinen.
3. Das Innere des Mauls hat dieselbe geglättete Farbstufe, wird aber nicht verfeinert.
4. Nicht Sache der Anzeige: Wo die gerechnete Haut selbst wellig ist (kleine Knicke an den Linien, fast ebene Flächen), laufen
   die Farbstufen ruhig, aber in Wellen. Das ist Schritt 3.

## 5. Schritt 2, kleines Rechennetz: gebaut, gemessen, seit dem 12.11. nachts Standard

Gebaut am 12.11. nachts im Arbeitsbaum `form-bau`. **Florian am selben Abend auf die Frage, ob es in sein Fenster soll:
„ja“** (er antwortete vom Handy aus; sein Urteil am Fenster steht aus). Seitdem liegt es auf `claude/form-spiegel`: Sein
Fenster `http://localhost:5194/kurven.html?gewichte=geometrie` rechnet mit dem kleinen Netz. `&netz=dicht` ist das Netz wie
bis zum 12.11. (zum Vergleich, im selben Fenster).

**Was gebaut ist** (`apps/editor/src/form/kurven.ts`, im Kern nur eine Option in `packages/shape/src/dicht/verdichten.ts`):
- **Startnetz mit einem Drittel der Dreiecke** (`DREIECKE` 2 000 statt 6 000 bestellt; die Startkante ist rund 15 statt 8,6
  Einheiten lang, die Startkugel hat 1 500 statt 5 200 Punkte). Alle Maße, die an der Startkante hängen, gehen mit.
- **Dichter, wo die Form es braucht:** an den Linien wie bisher nach ihrem Pfad (`GENAU`), neu in der Haut nach ihrer Krümmung
  (`GENAU_HAUT`, den Schalter gab es seit dem 08.11. als Versuch; jetzt Standard mit eigener Genauigkeit `GENAU_FLAECHE` = 1/16
  der Startkante, im Kern die Option `genauFlaeche`). Eine Kante wird geteilt, wo die runde Fläche zwischen ihren Enden weiter
  als das von ihr abweicht.
- **Formen mit feinerem Netz werden beim Übernehmen vergröbert** (`netzVergroebern` in `standAnwenden`: geladen, behalten). Die
  Punkte, die bleiben, bleiben, wo sie sind: Die Form ist nach dem Laden dieselbe; neu gerechnet wird sie wie bisher erst beim
  nächsten Griff. Die Statuszeile nennt es („Rechennetz 27 770 → 11 449 Punkte“). Nicht in der Pose gesicherte Formen.
- **Behaltene Form:** Sie kommt auch nach dem Wechsel der Dichte zurück (`START_FORM`; vorher hing sie an der Zahl der
  Dreiecke). Der Browser behält je Netz eine eigene (`FACH_ZULETZT`: „zuletzt-klein“ und „zuletzt“): Beim ersten Start mit dem
  kleinen Netz kommt einmal die Form aus „zuletzt“, vergröbert; „zuletzt“ selbst bleibt, wie es war, und `&netz=dicht` zeigt
  sie dort in der alten Dichte.
- **Anzeige im Zug:** dieselben Stufen wie in der Ruhe, solange es höchstens 260 000 Dreiecke werden (`GLATT_IM_ZUG`), sonst
  eine weniger. Vogel und test_kaputt haben im Zug zwei Stufen (kein Umschalten nach dem Loslassen), der Firefish eine.

**Befunde:**
- **Ein überall gleich grobes Netz reicht nicht.** Florians drei Formen sahen damit gleich aus und liefen mit 60 Bildern, aber ein
  kleines Detail fiel zusammen (Florians Ohr vom 08.11., `form-detail-probe.mjs`: flach auf der Linie, 6 umgeklappte Dreiecke).
  Mit der Verfeinerung nach Krümmung ist es rund wie mit dem alten Netz. Bild: `docs/progress/editor/netz-klein-ohr-2026-11-12.jpg`.
- **Der alte Einwand gegen `GENAU_HAUT` gilt nicht mehr** (am 08.11. verworfen, damals hing die Form am Netz). Gemessen mit
  `form-explosion-probe.mjs`, kleines Netz gegen das Netz bis zum 12.11., Knicke über 60° / umgeklappt: Rüssel mit um 90°
  gedrehtem Griff 1/0 gegen 10/0, langer Hammer 0/0 gegen 0/0, Ei mit Überhang 0/0 gegen 4/0, Schlaufe (die Linie kreuzt sich
  selbst, in jeder Fassung kaputt) 119/26 gegen 128/26.
- **Genauigkeit der Haut:** mit 1/40 wie die Linien blieben am Firefish 20 122 Punkte (34 ms je Bild); mit 1/12 9 944 (18 ms),
  das Ohr noch rund; mit 1/8 klappen am Ohr 4 Dreiecke um. 1/16 lässt Abstand zu dieser Grenze.
- **Das Beruhigen der Normalen braucht es weiter** (Vergleich `&ruhe=0` am Vogel: ohne laufen die Farbflächen fleckig).
- **„strange bird“ steht, wie gesichert, nicht in der Ruhe der Rechnung:** Beim ersten Neurechnen geht eine Stelle bei
  (156, −12, ±54) um rund 19 Einheiten, mit dem alten Netz genauso wie mit dem neuen. Das ist kein Befund von Schritt 2, aber
  es heißt: Der erste Griff an dieser Form ruckt dort.

**Gemessen** (ohne Bildschirm, derselbe Zug je Form mit `form-gesichert-zug.mjs`; Zeiten nur als Verhältnisse lesen):

| Form | Punkte | Greifen | Bilder im Zug (Median / 95 %) | Rechenrunde | ruht nach |
| --- | --- | --- | --- | --- | --- |
| teat firefish, Netz bis 12.11. | 27 770 | 321 ms | 44 / 66 ms | 32,7 ms | 2,1 s |
| teat firefish, kleines Rechennetz | 11 449 | 201 ms | 20 / 36 ms | 11,9 ms | 0,4 s |
| strange bird, Netz bis 12.11. | 16 010 | 262 ms | 24 / 45 ms | 18,4 ms | 2,2 s |
| strange bird, kleines Rechennetz | 7 437 | 208 ms | 16 / 21 ms | 7,5 ms | 0,9 s |
| test_kaputt, Netz bis 12.11. | 6 217 | 160 ms | 15 / 32 ms | 9,7 ms | 0,6 s |
| test_kaputt, kleines Rechennetz | 2 137 | 129 ms | 17 / 30 ms | 7,4 ms | 0,2 s |

- Laden bis zur Ruhe: Firefish 1,7 s → 1,8 s, Vogel 0,8 s → 1,3 s (das Vergröbern kostet 0,1 bis 0,5 s, der Hintergrund danach
  ist schneller).
- Form vorher und nachher übereinander, beide einmal neu gerechnet (`netz-vorher-nachher.mjs`, `SETZEN=1`): Von Umriss und
  Linien des alten Bilds liegen am Vogel 31, am Firefish 16, an test_kaputt 0 Bildpunkte neben dem neuen (Bild je 2 400 × 1 504).
  Bilder: `docs/progress/editor/netz-klein-<form>-2026-11-12.jpg` (links vorher, Mitte nachher, rechts übereinander).
- Zum Vergleich das überall gleich grobe Netz (ohne `GENAU_HAUT`): Firefish 7 762 Punkte, 17 ms je Bild.

**Geprüft:** Typen, Lint der geänderten Dateien, Tests im Fenster (24) und im Kern (137; neu: eigene Genauigkeit der Haut am
Ohr in `linieAufPfad.test.ts`). Im Fenster auf dem kleinen Netz: Maul als Loop (`form-maul-loop.mjs`) und Fressen-Pose
(`form-fressen-pose.mjs`): keine offenen Kanten, nichts umgeklappt, ⌘Z genau, keine Fehler; die weiten Züge und das Ohr wie oben.
Neue Proben: `netz-vorher-nachher.mjs` (Bild), `form-netz-kleiner.ts` (im Kern: eine gesicherte Form vergröbern, Zeit je
Runde, Abstand der Häute).

**Offen in Schritt 2:**
1. **Florians Urteil nach dem Arbeiten in seinem Fenster** (5194) steht aus. Stört ihn etwas: `&netz=dicht` ist das Netz wie
   vorher; die Form, die sein Browser bis zum Wechsel behalten hatte, liegt dort unverändert.
2. **Zeichnen und Greifen gegen die feine Fläche** (Plan: „Zeichnen auf der Haut trifft die glatte Anzeige“): nicht gebaut. Die
   groben Dreiecke liegen an der Startkugel 0,2 Einheiten unter der gezeigten Fläche (vorher 0,06), an engen Stellen bis rund
   1: Eine neu gezeichnete Linie liegt um so viel innen. Nachgesehen am Ring um einen Rüssel (`form-explosion-probe.mjs`,
   `FALL=e`, Bild nach dem Ring, kleines Netz gegen `&netz=dicht`): In der ganzen Ansicht ist keine Einschnürung zu sehen. Nicht
   dringend; wenn es gebaut wird, dann als Anheben der neuen Punkte einer Linie auf die runde Fläche gleich nach dem Einsetzen.
3. **„Zwischen eng benachbarten Linien mindestens zwei Kanten“** (Plan, Anhang A.2) ist nicht als eigene Regel gebaut. Die
   Verfeinerung nach Krümmung hat den Fall des Ohrs gelöst; bleibt ein schmaler Streifen zwischen zwei Linien flach (dann gibt
   es dort keine Krümmung, die verfeinert), wäre das die nächste Regel.
4. **Sichern überschreibt mit dem kleinen Netz:** Eine geladene alte Form ist im Fenster vergröbert; wer sie unter demselben
   Namen sichert, ersetzt die Datei. Die drei Formen in `wesen/` liegen in git.
5. Die Proben unter `scripts/pruefen/`, die feste Orte oder Punktzahlen der Startkugel erwarten, sind mit dem neuen Standard
   nicht durchgesehen (mit `&netz=dicht` laufen sie wie bisher).

**Danach:** Schritt 3 (Abschnitt 6).

## 6. Schritt 3, Beweis „Haut direkt aus den Linien“: gerechnet am 13.11., hält so nicht

Bericht mit allen Zahlen: [`research/2026-11-13-beweis-haut-direkt.md`](research/2026-11-13-beweis-haut-direkt.md). Bilder:
`docs/progress/editor/schritt3-{kugel,schlauch,ruessel,horn,strange-bird,teat-firefish,test_kaputt}-2026-11-13.jpg`, Ausgabe
des Laufs: `schritt3-messung-2026-11-13.txt`. **Florian hat die Bilder noch nicht beurteilt.**

**Was gebaut ist** (nur Kern und Proben, nur auf `claude/form-bau`; `kurven.ts` und der Löser des Fensters sind unberührt):
- `packages/shape/src/dicht/direkt.ts` (`HautDirekt`): `richtungVerteilen` (Normalen von den Linien über die Haut) und
  `lagenLoesen` (Lagen aus Linien und Normalen, eine Lösung). Test `direkt.test.ts`.
- `apps/editor/scripts/pruefen/form-direkt.ts` (die Fälle, je mit „heute“, A und B), `form-direkt-faelle.ts` (Kugel, Schlauch,
  gesicherte Formen laden wie das Fenster), `form-direkt-blatt.ts` (Bilder aus dem Kern als HTML). `html-shot.mjs` nimmt jetzt
  `BREITE` und `HOEHE`.

**Zwei Fassungen wurden gegen „heute“ gerechnet:**
- **A, wie geplant:** Richtung aus dem Liniennetz (`linienRichtung`), über die Haut verteilt, daraus die Lagen. Nichts von
  der Haut.
- **B, nur die zweite Hälfte:** die Normalen der Haut beim Anfassen bleiben, daraus und aus den Linien die Lagen.

| Fall | heute | A | B |
| --- | --- | --- | --- |
| Kugel nur mit Mittellinie | bleibt | bleibt (0,14 % vom Radius) | bleibt |
| Schlauch, zwischen den Ringen doppelt so lang | Dicke −0,2 %, Enden bis 2,4 daneben | Dicke −0,2 %, Enden keilförmig (bis 12,7 von 50) | Dicke −0,1 %, Enden bis 0,7 |
| Rüssel aus zwei Profillinien, Breite zu Höhe | 1,03 (rund) | 0,36 (flach), umgestülpt | 1,94 (kann nichts Neues runden) |
| Horn am „strange bird“ um 70 verlängert, Dicke | +16 · +15 · +10 % | −9 · −2 · −3 %, 76 Dreiecke umgestülpt | −0 · +1 · +3 % |
| seine drei Formen, nichts gezogen (Mittel / größter Abstand) | 1,37 / 29,6 · 0,09 / 1,8 · 0,08 / 0,8 | 4,2 / 52 · 4,9 / 69 · 2,4 / 18, dazu 82 · 112 · 10 umgestülpte Dreiecke | 0,15 / 1,4 · 0,10 / 0,9 · 0,10 / 0,8, keine neuen |
| hin und zurück | rechnet in Runden | 0,0002 | bitgleich |

**Befunde:**
1. **A hält nicht.** Erstens fehlt zwischen wenigen Linien eine Angabe: Gleichmäßig verteilte Normalen gehören zu einer Fläche
   mit überall gleicher Wölbung. Kugel und Schlauch zwischen Ringen bleiben deshalb genau, ein Ende mit runder Kappe wird ein
   Keil, ein Rüssel flach. Zweitens trägt die Richtung aus dem Liniennetz nur an der Kugel (0,5°): An seinen Formen weicht sie
   je Linie im Mittel bis 15° von der Haut ab, an einzelnen Stellen bis 68°.
2. **B hält, wo schon Haut ist.** Die Dicke bleibt beim Strecken und Verlängern, hin und zurück ist bitgleich, seine Formen
   bleiben stehen. Gerechnet wird einmal (Zerlegen rund 230 ms bei 7 600 Punkten, Einsetzen 3 bis 4 ms).
3. **Die heutige Rechnung lässt das Horn schon beim Anfassen aufgehen** (ohne Zug, bis zur Ruhe: +8 bis +12 %). Die gesicherte
   Form ruht für sie nicht. Das ist messbar das, was Florian als „bläst sich auf“ beschreibt.
4. **Fallen für B:** Die Normalen müssen ein gemerkter Stand sein. Liest man sie nach jedem Rechnen neu von der Haut, kriecht
   die Fläche je Mal um 0,4 bis 1,0. Nach einem Zug neu angelegt (Normalen gemerkt) bewegt sie sich im Mittel um 0,04, an der
   größten Stelle einmal um 0,8, dann 0,3 und 0,2; das Kriterium 0,18 ist dort nicht erfüllt. Drehen ist nicht gebaut (im
   Horn-Fall blieben die Normalen einfach stehen). Neue Haut runden kann B nicht.
5. Das Kriterium „ein Viertel der Punkte gibt dieselbe Form“ ist nicht gezeigt (heute 0,14 / 0,77, B 0,10 / 0,61 gegen
   erlaubte 0,18); die Startnetze selbst liegen schon 0,2 bis 0,7 auseinander.

**Zweiter Beweis „B“ (13.11., Florian: „ok, prüfe B“).** Kriterien vorher im Plan festgelegt (Anhang A.3). Probe
`apps/editor/scripts/pruefen/form-direkt-b.ts` (20 s), Bilder `schritt3b-{ruessel,ruessel-laenger,horn,biegen}-2026-11-13.jpg`,
Ausgabe `schritt3b-messung-2026-11-13.txt`. Florian hat die Bilder noch nicht beurteilt.

- **Dazugebaut in `HautDirekt`:** fester Stand (Option `stand`: die Haut beim Anfassen ist genau die Lösung für unbewegte
  Linien; die Normalen werden jedes Mal von der Haut gelesen und müssen kein gemerkter Stand mehr sein), Mitdrehen der Normalen
  mit den Linien (`linienDrehung`, `normalenDrehen`), Nachführen ohne neues Zerlegen (`lagenNachfuehren`).
- **Erfüllt:** Anfassen bewegt nichts (0,0000003; heute im Mittel 1,33 · 0,09 · 0,08 an seinen drei Formen), hin und zurück
  0,0000002, nach dem Loslassen 0,0000002, Horn um 30° gebogen ohne neue Knicke und ohne umgestülpte Dreiecke.
- **Knapp nicht erfüllt (Kriterium 3 %):** Horn verlängert, dasselbe Stück Haut +3,2 · +1,3 · +0,7 % (heute +12,6 · +8,9 ·
  +5,7 %); Horn gebogen +3,4 · +3,6 · +2,5 % (heute +6,8 · +11,8 · +13,2 %); Rüssel verlängert +5,2 · −1,6 · +1,0 % (heute
  −8,1 · −4,8 · +3,3 %).
- **Nicht erfüllt:** Rüssel aus der Kugel. B allein gibt einen breiten Keil (1,96). Die heutige Rechnung auf einen Teil der
  Haut zu beschränken (neue Punkte mit Ringen oder ganze Felder zwischen den Linien) geht nicht: Sie kommt nicht zur Ruhe,
  stülpt um oder läuft davon. **B ersetzt die heutige Rechnung also nicht; beides zusammen geht nur als Schalter.**
- **Tempo im Kern** (7 628 Punkte): Greifen 240 ms; Zug ohne Drehung 3 bis 4 ms je Bild; Zug mit Drehung 80 ms je Bild, so wie
  es gebaut ist (je Bild 8 Schritte Nachführen und neuer Aufbau der Zeilen).
- **Fallen:** `linienRichtung` liest die mittlere Kantenlänge an der Haut, die man ihr gibt; für hin und zurück muss das die
  Haut vom Anfassen sein. `flaechenAbstand` findet Abstände über etwa der Zellengröße nicht sicher (für große Abstände eine
  große Zelle nehmen).

**B als Schalter im Bau-Fenster (13.11. abends, Florian: „B ausprobieren“).** Probe und Abbruch standen vorher im Plan (Anhang
A.3). Nur `claude/form-bau`; sein Fenster auf 5194 ist unberührt.

- **Ausprobieren** (so war es am 13.11.; seit seinem „Gefällt nicht“ gibt es nur noch die Adresse):
  `http://localhost:5197/kurven.html?gewichte=geometrie&ziehen=direkt`; die Statuszeile beginnt dann mit „Form halten“.
  Knopf, Taste H und das Merken über das Neuladen sind wieder entfernt. Läuft der Server nicht: Eintrag `kurven-bau` in `.claude/launch.json` oder
  `EDITOR_WEB=1 pnpm -C <form-bau> --filter @ee/editor exec vite --port 5197 --strictPort`. Seine drei Formen liegen dort in
  `wesen/` (Laden).
- **Was der Schalter tut:** An: Ein Zug an Punkten oder Griffen bewegt die Haut direkt mit den Linien (Löser `direkt`); nach
  dem Loslassen wird nur verdichtet; die heutige Rechnung setzt nichts, auch nicht nach einem neuen Loop; gelöschte Punkte und
  geknickte Griffe gehen denselben Weg; im Zug wird nicht verfeinert. Aus: alles wie bisher. Nur in der Grundform (die Pose
  rechnet wie bisher). Eine Kante an oder aus ändert die Haut mit dem Schalter an nicht.
- **Gebaut:** Kern: `HautDirekt` mit festen Feldern je Bild (`bereiten`, `drehungSetzen`, `nachfuehrenSchnell`; der
  Vorkonditionierer dreht mit den Normalen mit), `dicht/direktZug.ts` (`DirektLoeser`), `LoopZug` mit der Art `direkt`,
  `direktLoeserFuer`. Fenster (`kurven.ts`, `kurven.html`): `direktAn`, `direktGilt`, `direktBereiten` (legt den Löser in der
  Ruhe nach jeder Änderung an, damit das Greifen nicht wartet), `haltenSchalten`; Eingriffe in `loeserFuer`, `zugRechnen`,
  `zugEnde`, `aufraeumenStarten` (keine Runden), `ruheNoetig`, `hautNeuRechnen`; Haken `__kurven.halten()` und
  `zeiten().halten`. Probe `apps/editor/scripts/pruefen/form-halten-probe.mjs`.
- **Gemessen im Bau-Fenster** (`GPU=1`, höchster Punkt 70 hinauf; Ausgabe `docs/progress/editor/halten-fenster-messung-2026-11-13.txt`,
  Bildschirmfotos `halten-fenster-{an,aus}-2026-11-13.jpg`):

  | | strange bird an | aus | teat firefish an | aus |
  | --- | --- | --- | --- | --- |
  | gegriffen, nicht gezogen | 0,00 | 0,00 | 0,00 | 0,00 |
  | hinauf und zurück, neben der Haut von vorher | 0,00 | bis 19,6 | 0,00 | bis 2,1 |
  | Bilder im Zug, Abstand Median / 95 % | 14 / 37 ms | 16 / 21 ms | 19 / 44 ms | 20 / 34 ms |
  | Rechnen je Bild | 9,7 ms | 6,9 ms | 15,0 ms | 10,7 ms |
  | nach dem Loslassen neben der Fläche in der Ruhe | bis 0,35 | bis 2,2 | 0,00 | bis 0,31 |
  | Vorbereiten nach jeder Änderung (hält das Fenster an) | 0,3 bis 0,4 s | – | 0,45 s | – |

  Der Abbruch (über 30 ms je Bild am Firefish) greift nicht. Die 0,35 nach dem Loslassen entstehen, wo das Verdichten Punkte
  zusammenlegt (im Mittel 0,00).
- **Offen und nicht geprüft:** Florians Urteil (Gefühl beim Ziehen). Einzelne Bilder dauern länger als heute (95 % 37 bis 44 ms
  gegen 21 bis 34 ms). Das Vorbereiten läuft im Fenster, nicht im Hintergrund: Greift er in den 0,3 bis 0,45 s danach, wartet
  der Griff. Neue Haut rundet der Schalter nicht (Rüssel aus der Kugel wird ein Keil): dafür Schalter aus; schaltet er danach
  wieder aus und zieht, rundet die heutige Rechnung alles neu. Pose, Maul und `/editor` sind nicht angefasst.
- **Fallen:** Das Vorbereiten darf die Haut nicht anfassen (auch nicht um Rundungsreste): Die Standzahl änderte sich sonst,
  und der Hintergrund begann endlos von vorn. `nachfuehrenSchnell` rechnet je Runde zwei Schritte von den Lagen der Haut aus;
  ohne den mitdrehenden Vorkonditionierer kam es bei großen Drehungen je Runde nur um ein Viertel näher.

**Florian am 13.11. abends, nach dem Ausprobieren: „Gefällt nicht“** (ohne Begründung). Damit gilt der Abbruch aus dem Plan:
B kommt nicht in sein Fenster. Knopf und Taste sind aus dem Bau-Fenster wieder entfernt; der Weg bleibt zum Nachrechnen hinter
`?ziehen=direkt` und dem Haken `__kurven.halten(true)` liegen (Kern `dicht/direkt.ts`, `dicht/direktZug.ts`, Tests, Proben).
Die heutige Rechnung bleibt die einzige im Fenster. Weiter nach Plan mit Schritt 4.

**Nachrechnen:** aus `packages/shape` `BLATT=<pfad ohne Endung> npx vite-node ../../apps/editor/scripts/pruefen/form-direkt.ts`
(rund 45 s; `FALL=kugel,schlauch,ruessel,horn,formen,viertel`) und genauso `form-direkt-b.ts` (20 s;
`FALL=ruessel,horn,biegen,formen`), dann aus `apps/editor`
`HOEHE=100 node scripts/pruefen/html-shot.mjs --jpg <pfad>-*.html`.

## 7. Schritt 4, kleiner Beweis „Donut“: gerechnet am 13.11., der Rand wird so nicht glatt

Der Plan verlangt vor dem Umbau auf die halbe Haut ein Bild: „Griff durch die Mitte → Loch mit glattem Rand; zurück → Form wie
vorher.“ Probe im Kern: `apps/editor/scripts/pruefen/form-donut.ts` (aus `packages/shape`,
`BLATT=<pfad ohne Endung> npx vite-node ../../apps/editor/scripts/pruefen/form-donut.ts`), Bild
`docs/progress/editor/schritt4-donut-2026-11-13.jpg`. **Florian hat das Bild noch nicht beurteilt.** Am Fenster ist nichts
geändert.

**Fall:** Kugel mit drei Loops (1 784 Punkte), der Punkt an der Seite (Kreuzung der beiden Ringe) um 190 durch die Spiegelebene
gezogen.

| Fassung | Rand des Lochs (Knick quer über den Rand, Mittel / größter) | Sonst |
| --- | --- | --- |
| heute: ganze Haut gerechnet, jede Hälfte bis zur Ebene gezeigt | 97° / 113° (scharfe Kante) | Loch mit Halbmesser 74 bis 93; 9 Runden; an der gerechneten Haut nichts umgestülpt |
| verschmolzen (an der Ebene geschnitten, mit dem Spiegelbild verbunden), Rand frei | 22° / 84° | das Loch verzieht sich (Halbmesser 52 bis 111), Haut bis 32 neben heute, 17 Knicke über 60° |
| verschmolzen, Rand als Linie der Mittelebene | 32° / 111° | Loch bleibt (75 bis 92), Haut bis 13 neben heute, 9 Knicke |
| verschmolzen, Rand als Linie, die keine Wölbung vorgibt (Ecken) | 77° / 150° | Loch bleibt, 60 Knicke |
| zurückgezogen (heute) | – | Kugel wieder da: im Mittel 0,11, größter 0,4 neben vorher, nichts umgestülpt |

**Befunde:**
1. **„Zurück → Form wie vorher“ hält schon heute** (ganze Haut als Wahrheit, die Anzeige schneidet ab).
2. **„Loch mit glattem Rand“ hält nicht.** Verschmelzen macht aus den beiden Hälften eine Haut, aber die heutige Rechnung liest
   die Wölbung an den Linien an der Haut ab: Die Kante am Rand bestätigt sich selbst. Ohne Linie am Rand glättet sie mehr, dafür
   wandert das Loch. Ein runder Rand braucht also eine eigene Regel (woher die Wölbung am Rand kommt), nicht nur den Umbau.
3. **Der Schnitt an der Ebene trägt:** Hälfte abschneiden und spiegeln gibt genau das Bild von heute als eine geschlossene Haut
   (1 523 statt 1 784 Punkte), und die heutige Rechnung läuft darauf ohne davonzulaufen (`verschmelzen` in der Probe; teilt auch
   die Loops an der Ebene in Stücke). Das ist der Baustein für „die Hälfte ist die Wahrheit“.

**Florian am 13.11. abends zum Bild** (wörtlich im Plan, Abschnitt 5, Punkt 4): Er stellt sich den Donut anders vor, als der
Beweis ihn gerechnet hat. An den neuen Kreuzungen (wo die gezogenen Linien die Mitte treffen) sollen **Punkte ohne Knick**
entstehen, das Loch bekommt einen **neuen Edgeloop**; der gezogene Punkt ist nur im Zug noch sichtbar und vom neuen Mesh gelöst;
**beim Loslassen verschwindet er, kein Zurückziehen** („so ähnlich wie Blenders Mirror mit Clipping“). Das ersetzt Entscheidung
4 des Plans (umkehrbare Naht). Der Beweis oben hat die Linien an der Mitte nur abgeschnitten, mit ihrem Knick; seine Regel ist
noch nicht gerechnet. Seine Frage: jetzt daran feilen oder erst die halbe Haut bauen. Meine Antwort: zuerst ein kleiner Beweis
mit seiner Regel (Kern, ein Bild), dann die halbe Haut; seine Zusage dazu steht aus.

**Gefragt war Florian (13.11. abends, vor seiner Klarstellung):**
- **„Halbe Haut ohne glatten Rand“:** Schritt 4 als Umbau auf die Hälfte (schneller, die Mittellinie von Anfang an, keine
  Buchführung der Paare); wo die Hälften sich treffen, bleibt es die Kante von heute. Empfohlen.
- **„Erst den Rand“:** vor dem Umbau ein zweiter kleiner Beweis, wie der Rand rund wird.
- **„Schritt 4 zurückstellen“:** erst Posen (5), Maul (6) oder Auswahl (7).

## 8. Offen aus der Zeit davor

Florians Blick auf G4, auf Sichern und Laden und auf G5 Teil 1 steht aus. Die offenen Entscheidungen der alten Übergabe
(Abschnitt 5 dort: „Punkte wo nötig“, weich überblenden beim Einwechseln, Linie kehrt um, Vorsicht und Schutz) erledigen sich
zum Teil mit den Schritten 2 bis 4 und werden dort wieder aufgegriffen, nicht vorher.
