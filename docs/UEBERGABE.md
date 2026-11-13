# Übergabe (Stand 13.11.2026: Schritt 3, der Beweis „Haut direkt aus den Linien“, ist gerechnet. Der geplante Weg hält nicht; ein Teil davon hält und lässt ein verlängertes Horn so dick, wie es war. Florian entscheidet, wie es weitergeht. Schritt 1 und 2 sind Standard in seinem Fenster, sein Urteil dazu steht aus)

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
| 3 Beweis „Haut direkt aus den Linien“ | **gerechnet, hält so nicht** (Abschnitt 6, 13.11.): Die Haut nur aus den Linien scheitert zwischen wenigen Linien und an seinen drei Formen. Ein Teil hält: Lagen direkt aus den Linien und der Wölbung der Haut (Horn verlängert bleibt gleich dick, hin und zurück bitgleich). Seine Entscheidung steht aus; am Fenster ist nichts geändert, der Code liegt nur auf `claude/form-bau` |
| 4 Echte Spiegelung und neue Rechnung ins Fenster | offen; mit welcher Rechnung, hängt an seiner Antwort zu Schritt 3 |
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

**Gefragt ist Florian (13.11.):**
- **„Weiter nach Plan“:** Die heutige Rechnung bleibt, als Nächstes Schritt 4 (echte Spiegelung, Mittellinie von Anfang an).
- **„B prüfen“:** zuerst ein zweiter kurzer Beweis, wieder nur Kern und Bilder (etwa ein Tag): Ziehen an fertiger Haut rechnet
  B, neue Haut rundet die heutige Rechnung. Kriterien: Rüssel aus der Kugel mindestens 0,8 rund; derselbe Rüssel danach
  verlängert höchstens 3 % dicker oder dünner; ein Horn um 30° gebogen ohne Knick; nach dem Loslassen nichts über 0,18.
  Empfohlen ist dieser Weg.

**Nachrechnen:** aus `packages/shape` `BLATT=<pfad ohne Endung> npx vite-node ../../apps/editor/scripts/pruefen/form-direkt.ts`
(rund 45 s; `FALL=kugel,schlauch,ruessel,horn,formen,viertel`), dann aus `apps/editor`
`HOEHE=100 node scripts/pruefen/html-shot.mjs --jpg <pfad>-*.html`.

## 7. Offen aus der Zeit davor

Florians Blick auf G4, auf Sichern und Laden und auf G5 Teil 1 steht aus. Die offenen Entscheidungen der alten Übergabe
(Abschnitt 5 dort: „Punkte wo nötig“, weich überblenden beim Einwechseln, Linie kehrt um, Vorsicht und Schutz) erledigen sich
zum Teil mit den Schritten 2 bis 4 und werden dort wieder aufgegriffen, nicht vorher.
