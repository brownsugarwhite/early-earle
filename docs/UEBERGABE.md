# Übergabe (Stand 13.11.2026, 17:15 Uhr: Die Beweise zu Schritt 5 (Posen) und Schritt 6 (Maul) hatten das Falsche geprüft; Florian hat widersprochen und recht behalten (Abschnitt 7.8). An seiner Form „maul handgemacht test“ (ein Maul, von Hand geformt) hält die Rechnung von heute das Maul, und ein Zug in der Pose ist ein gewöhnlicher Zug. Was dort fehlt, ist die Maul-Funktion (Gelenk und Gewichte ohne Schneiden und Einsetzen). Gefragt ist sein Wort zum Bauen. Schritt 4b, erster Teil, die Rechnung auf der Hälfte, ist in seinem Fenster (5194; Abschnitt 7.5); der Rest der halben Haut ist als Schritt 4c fest vorgemerkt. Schritt 3 ist abgeschlossen, die heutige Rechnung bleibt. Zu Schritt 1, 2, dem Donut (4a) und der halben Rechnung steht sein Urteil aus)

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
| 4 Echte Spiegelung (mit der heutigen Rechnung) | **4a, der Donut, ist in Florians Fenster (Abschnitt 7.4, 13.11.):** nach seiner zweiten Regel; sein Urteil steht aus. **4b, erster Teil, ist seit dem 13.11. nachmittags in Florians Fenster (Abschnitt 7.5):** Der Löser rechnet auf der Hälfte (zwei halb so große Systeme, Krümmung auf der Hälfte), das Netz im Fenster bleibt ganz; Rechnen je Bild 10,3 → 7,1 ms am „teat firefish“, Zerlegen rund 50 %, gleiche Form; dazu „flüssig zuerst“ (eine weitere Runde je Bild nur, wenn sie ins Bild passt). Sein Urteil zum Tempo steht aus |
| 4c Rest der halben Haut | **fest vorgemerkt** (Plan, „Schritt 4c“; Florian am 13.11.: „es soll nicht vergessen werden“): Gewichte und Vermessen auf der Hälfte (Runde von 73 % auf 50 bis 60 %), die einzelnen langsamen Bilder, Verdichten und Anzeige auf der Hälfte, das Netz selbst als Hälfte. Kommt nach den Posen wieder auf den Tisch und muss gebaut sein, bevor Shader, Materialien, Fell oder Zusatzteile beginnen. Seine heutigen Formen sind kein Maßstab für das Tempo |
| 5 Posen wie die Basis | **Entwurf steht, Gegenprobe an Florians Form hält** (Abschnitte 7.6 und 7.8, 13.11.): Eine Pose ist dieselbe Form mit anderen Lagen der Punkte und Griffe, dazu die Knochen (Florian: „ein einfacher Morph der Punkte und Handles […], während die Kieferknochen sich bewegen“). Der erste Beweis war am Maul aus der schmalen Form gescheitert (verborgene Fläche); am von Hand geformten Maul ist ein Zug in der Pose ein gewöhnlicher Zug. Gebaut ist nichts; kommt nach Schritt 6 |
| 6 Maul | **neu gefasst (Abschnitt 7.8, 13.11.): die Maul-Funktion für ein von Hand geformtes Maul.** Das Maul selbst formt Florian wie jede Form (hält; Loops um einen Kiefer gehen dort schon). Zu bauen: „Fressen“ an der gewählten Lippenlinie (Gelenk, Gewichte), ohne Schneiden und Einsetzen; der Knick an der Spitze des Unterkiefers. Der Beweis „Maul als eingeschweißte Höhle“ (7.7) hat das Falsche geprüft. Gefragt ist sein Wort zum Bauen |
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

**B als Schalter im Bau-Fenster (13.11. vormittags, Florian: „B ausprobieren“).** Probe und Abbruch standen vorher im Plan (Anhang
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

**Florian am 13.11. vormittags, nach dem Ausprobieren: „Gefällt nicht“** (ohne Begründung). Damit gilt der Abbruch aus dem Plan:
B kommt nicht in sein Fenster. Knopf und Taste sind aus dem Bau-Fenster wieder entfernt; der Weg bleibt zum Nachrechnen hinter
`?ziehen=direkt` und dem Haken `__kurven.halten(true)` liegen (Kern `dicht/direkt.ts`, `dicht/direktZug.ts`, Tests, Proben).
Die heutige Rechnung bleibt die einzige im Fenster. Weiter nach Plan mit Schritt 4.

**Nachrechnen:** aus `packages/shape` `BLATT=<pfad ohne Endung> npx vite-node ../../apps/editor/scripts/pruefen/form-direkt.ts`
(rund 45 s; `FALL=kugel,schlauch,ruessel,horn,formen,viertel`) und genauso `form-direkt-b.ts` (20 s;
`FALL=ruessel,horn,biegen,formen`), dann aus `apps/editor`
`HOEHE=100 node scripts/pruefen/html-shot.mjs --jpg <pfad>-*.html`.

## 7. Schritt 4, zwei kleine Beweise „Donut“ (13.11.): Mit Florians Regel wird der Rand glatt und das Loch rund

### 7.1 Erster Beweis: verschmelzen allein (13.11. vormittags)

Der Plan verlangt vor dem Umbau auf die halbe Haut ein Bild: „Griff durch die Mitte → Loch mit glattem Rand; zurück → Form wie
vorher.“ Probe im Kern: `apps/editor/scripts/pruefen/form-donut.ts` (aus `packages/shape`,
`BLATT=<pfad ohne Endung> npx vite-node ../../apps/editor/scripts/pruefen/form-donut.ts`), Bild
`docs/progress/editor/schritt4-donut-2026-11-13.jpg`. Am Fenster ist nichts geändert.

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
2. **„Loch mit glattem Rand“ hält so nicht.** Verschmelzen macht aus den beiden Hälften eine Haut, aber die Linien enden an der
   Mitte mit ihrem Knick, und die heutige Rechnung liest die Wölbung an den Linien an der Haut ab: Die Kante bleibt. Ohne Linie
   am Rand glättet sie mehr, dafür wandert das Loch. (Damals geschlossen: „braucht eine eigene Regel für die Wölbung am Rand“.
   Das stimmt nicht, siehe 7.2: Es fehlten die glatten Punkte an den neuen Kreuzungen.)
3. **Der Schnitt an der Ebene trägt:** Hälfte abschneiden und spiegeln gibt genau das Bild von heute als eine geschlossene Haut
   (1 523 statt 1 784 Punkte), und die heutige Rechnung läuft darauf ohne davonzulaufen (`verschmelzen` in der Probe; teilt auch
   die Loops an der Ebene in Stücke). Das ist der Baustein für „die Hälfte ist die Wahrheit“.

**Florian am 13.11. vormittags zum Bild** (wörtlich im Plan, Abschnitt 5, Punkt 4): Er stellt sich den Donut anders vor. An den
neuen Kreuzungen (wo die gezogenen Linien die Mitte treffen) sollen **Punkte ohne Knick** entstehen, das Loch bekommt einen
**neuen Edgeloop**; der gezogene Punkt ist nur im Zug noch sichtbar und vom neuen Mesh gelöst; **beim Loslassen verschwindet er,
kein Zurückziehen** („so ähnlich wie Blenders Mirror mit Clipping“). Das ersetzt Entscheidung 4 des Plans (umkehrbare Naht). Auf
die Frage „jetzt daran feilen oder erst die halbe Haut“ habe ich den kleinen Beweis empfohlen; Florian: **„Donut beweisen“**.

### 7.2 Zweiter Beweis: der Donut mit Florians Regel (13.11. mittags)

Probe im Kern: `apps/editor/scripts/pruefen/form-donut-regel.ts` (aus `packages/shape`,
`TIEF=190 GRIFFE=anteil,lang BREITE=1560 BLATT=<pfad ohne Endung> npx vite-node ../../apps/editor/scripts/pruefen/form-donut-regel.ts`;
gemeinsame Teile beider Proben in `form-donut-teile.ts`). Bilder: `docs/progress/editor/schritt4-donut-regel-2026-11-13.jpg`
(großes Loch) und `schritt4-donut-regel-klein-2026-11-13.jpg` (der Punkt gerade erst über die Mitte), alle Zahlen in
`schritt4-donut-regel-messung-2026-11-13.txt`. **Florian hat die Bilder noch nicht beurteilt.** Am Fenster ist nichts geändert.

**Die Regel, wie sie gerechnet ist** (derselbe Fall wie in 7.1, die Linien wie im Fenster genau auf ihren Pfaden):
1. Beim Loslassen wird die Hälfte an der Ebene abgeschnitten und mit ihrem Spiegelbild verbunden (`verschmelzen`).
2. Der Pfad jeder geschnittenen Linie wird an der Ebene geteilt (de Casteljau: Was über der Ebene liegt, behält genau seine
   Form; der gezogene Punkt darunter fällt weg). Das neue Ende ist ein **Punkt ohne Knick**: Sein Griff steht senkrecht zur
   Ebene, die Linie läuft rund in ihr Spiegelbild (so endet im Kern jeder Ring). Seine Länge: was vom Griff des geteilten Stücks
   senkrecht zur Ebene zeigt (die kleinste Änderung des Griffs, die den Punkt glatt macht).
3. **Der Rand des Lochs ist ein neuer Loop** der Mittelebene durch diese neuen Enden (die neuen Kreuzungen). Jeder seiner Punkte
   ist glatt, der Loop so rund wie möglich (Richtung parallel zur Sehne der Nachbarpunkte, Grifflänge wie ein Kreisbogen).
4. Die heutige Rechnung rechnet unverändert weiter, bis die Haut steht; danach verdichtet das Netz wie nach jedem Zug.

| Fall (Kugel mit drei Loops, Standardnetz) | heute gezeigt | mit der Regel |
| --- | --- | --- |
| großes Loch (Punkt um 190 gezogen, 41 hinter die Mitte) | Loch eckig, Halbmesser 77 bis 92; Knick quer über den Rand im Mittel 96°, größter 111° | Loch rund, 91,1 bis 91,8; Knick 18° / 27° (eine Reihe daneben 19°); 3 + 8 Runden bis zur Ruhe, nichts umgestülpt; die Linien gehen dafür 10 (Ringe) und 17 (Rand) |
| mittleres Loch (165, 16 dahinter) | 54 bis 62; 124° / 133° | 60,6 bis 62,1; 20° / 32° (daneben 15°); 3 + 8 Runden |
| gerade erst über die Mitte (150,5; 1,1 dahinter) | 16 bis 18; 161° / 167° | 16,0 bis 18,7; 38° / 61° (daneben 22°); 3 + 9 Runden; die Linien gehen 13,5 |
| großes Loch, viermal so viele Dreiecke | 96° / 110° | 91,0 bis 91,7; 12° / 24° (daneben 11°); 13 + 9 Runden, nichts umgestülpt |

**Befunde:**
1. **Die Regel hält, die heutige Rechnung genügt.** Alle vier Kriterien aus dem Plan sind am großen Loch erfüllt: keine Kante
   am Rand, in den Schnitten keine Spitze (durch eine Linie und zwischen den Linien); der Knick quer über den Rand ist so groß
   wie eine Reihe daneben (und wird mit feinerem Netz kleiner: Er ist das Netz, kein Grat); das Loch hat keine Ecken; die
   Rechnung steht nach 3 + 8 Runden, weitere 100 Runden bewegen die Haut höchstens 0,03.
2. **Die Länge des neuen Griffs entscheidet, wie rund der Schlauch wird und ob die Form springt.** Mit dem senkrechten Anteil
   (die Regel) ändert sich die Form wenig, auch wenn der Punkt gerade erst über die Mitte kommt (die Linien gehen 13,5). Behält
   der Griff seine ganze Länge (`GRIFFE=lang`, im Bild die dritte Spalte), ist der Schlauch beim großen Loch runder (Knick 15°),
   aber gerade erst über die Mitte gezogen springt die Kugel zu einem dicken Ring (die Linien gehen 43). Florian kann den
   Griff danach von Hand länger ziehen; die dritte Spalte zeigt, was das bewirkt. Nach dem Verlauf der abgeschnittenen Linie
   angepasst (`GRIFFE=angepasst`) wird der Griff null lang, und die Spitze bleibt (88°).
3. **Sauber schneiden.** Wird dicht neben einem Netzpunkt geschnitten, bleiben schmale Dreiecke; auf dem Standardnetz ohne
   Folgen, mit viermal so vielen Dreiecken kam die Rechnung daran nicht zur Ruhe (eine Spitze am Rand, 152 umgestülpt). Die
   Probe legt solche Punkte selbst auf die Ebene (`verschmelzen` mit `fangen`, ein Viertel einer Kante); damit ist auch das
   feine Netz sauber. Das gehört in den Bau.
4. **Verworfen:** Der neue Rand hält nur den Ort und gibt keine Wölbung vor (`RAND=ort`): Die Rechnung kommt nicht zur Ruhe.

**Nicht gerechnet (gehört zum Bau):**
- **Der Zug selbst.** Gerechnet ist der Stand nach dem Loslassen. Florians Bild verlangt das neue Mesh schon im Zug. Vorschlag:
  beim ersten Durchstoßen einmal schneiden (ein kurzes Stocken wie beim Greifen), danach wandern nur noch die Linien (das Loch
  wächst mit dem Zug, der gezogene Punkt bleibt als loser Griff sichtbar); zurück über die Mitte im selben Zug nimmt den Schnitt
  zurück.
- Ein Loch, das kleiner ist als eine Netzkante (der allererste Moment), seine eigenen Formen, eine Linie allein oder mehr als
  zwei durch die Mitte, Linien mit Kante durch die Mitte, das Maul, die Pose.

Gefragt hatte ich danach „Halbe Haut bauen“ oder „Erst am Donut feilen“; Florian hat stattdessen seine Regel geändert (7.3).

### 7.3 Florians zweite Regel: Der Rand bleibt erst eine Kante (13.11. mittags)

Florian (wörtlich im Plan, Abschnitt 5, Punkt 4): „Der neue Loop soll nicht gleich rund sein, sondern wie vorher eine Kante. An
den neuen Kreuzungen bilden sich Punkte, und der durch die Mitte gezogene Griff bleibt sichtbar, aber ist markiert. Ich kann ihn
auch löschen, dann ist kein Rückführen mehr möglich. Wenn ich die Kante dann selektiere und ihre Kantigkeit auf 0 stelle, erhalte
ich ja den runden Donut. Wäre das eleganter? Oder habe ich einen Denkfehler?“

**Was das heißt:**
- **Lose** (der markierte Punkt ist noch da): alles wie heute. Die ganze Haut wird gerechnet, jede Hälfte bis zur Mitte gezeigt,
  der Rand ist die Kante von heute, zurückziehen geht. Neu sind nur Anzeigen: Punkte, wo die Linien die Mitte kreuzen (sie
  folgen dem gezogenen Punkt), und die Markierung des Punkts hinter der Mitte.
- **Fest** (der markierte Punkt gelöscht): geschnitten wie in 7.2, aber die neuen Enden behalten den Griff des geteilten Stücks
  (die Linien knicken an der Mitte wie vorher, Ecken von selbst), der Rand ist ein Loop mit Kante.
- **Rund:** „Kante aus“ am Rand, mit der Regel, die der Editor für jede Kante schon hat (`kantenKnicken`: Die Ecken von selbst
  werden glatt, ihre Griffe kommen auf eine Gerade, die Längen bleiben).

**Nachgerechnet** (dieselbe Probe mit `GRIFFE=kante`; Bilder `docs/progress/editor/schritt4-donut-kante-2026-11-13.jpg`, großes
Loch, und `schritt4-donut-kante-klein-2026-11-13.jpg`; Zahlen am Ende von `schritt4-donut-regel-messung-2026-11-13.txt`).
**Florian hat die Bilder noch nicht beurteilt.**

| Fall | fest gemacht (Rand ist eine Kante) | danach „Kante aus“ |
| --- | --- | --- |
| großes Loch (190) | die Haut liegt bis 6,9 (im Mittel 1,8) neben dem vorher Gezeigten; Knick am Rand 71° / 109° (vorher 96° / 111°); 1 + 6 Runden | Haut glatt: Knick am Rand 15° / 29° (daneben 14°), nichts umgestülpt, 4 + 8 Runden; die Linien gehen 20; der Umriss des Lochs bleibt (77 bis 92, Ecken an den vier Punkten) |
| gerade erst über die Mitte (150,5) | bis 2,2, im Mittel 0,04 | glatt (14° / 25°); die Linien gehen 48 (aus der Kugel mit Delle wird ein dicker Ring) |

**Befunde:**
1. **Die Regel ist die bessere.** Beim Ziehen und Loslassen kann nichts springen (es ist der Stand von heute), Schneiden und
   Runden sind zwei eigene Schritte mit vorhandenen Werkzeugen (Punkt löschen, Kante aus), und meine beiden Festlegungen aus 7.2
   (Grifflänge, runder Rand) fallen als Automatik weg.
2. **Rund geht erst, wenn der Schnitt fest ist** (lose laufen die Hälften in der Rechnung noch durcheinander). Vorschlag:
   „Kante aus“ an einem losen Rand macht den Schnitt gleich mit fest (⌘Z führt zurück).
3. **„Kante aus“ rundet die Haut, nicht den Umriss des Lochs.** Der bleibt, wie er geschnitten wurde; rund wird er über die
   vier Punkte des neuen Loops und ihre Griffe (von Hand, oder als eigener Schritt wie in 7.2).
4. **Festmachen bewegt die Haut ein wenig** (großes Loch bis 6,9): Nach dem Schnitt rundet sich an der Kante jede Seite für
   sich. Ob das ganz zu vermeiden ist, ist offen.
5. **Der Donut braucht die halbe Haut nicht.** Der Zug bleibt wie heute, und der Schnitt gibt wieder eine gewöhnliche
   gespiegelte Haut, auf der das Fenster weiterarbeiten kann (so rechnet die Probe). Der offene Punkt aus 7.2 („der Zug selbst
   ist nicht gerechnet“) entfällt mit dieser Regel.

Gefragt war: „Donut bauen“ oder „Erst die halbe Haut“. **Florian: „Donut bauen“.**

### 7.4 Schritt 4a: der Donut, gebaut im Bau-Fenster und in Florians Fenster übernommen (13.11. mittags)

Gebaut in `form-bau` (Port 5197, `http://localhost:5197/kurven.html?gewichte=geometrie`; der Server ist die Vorschau der
Sitzung, Eintrag `kurven-bau`), Etappen 1 bis 5 aus dem Plan (Schritt 4a), und noch am selben Abend in sein Fenster übernommen
(unten). **Florians Urteil steht aus.**

**Was das Fenster jetzt tut:**
- **Lose** (ein Punkt ist über die Mitte gezogen): Ziehen, Loslassen und Zurückziehen wie bisher. In den Blättern steht ein
  kleiner heller Punkt, wo eine Linie die Mitte kreuzt (er folgt dem Zug), der Punkt hinter der Mitte ist orange markiert, und
  die Statuszeile sagt „ein Punkt hinter der Mitte (löschen macht den Schnitt fest)“.
- **Fest:** Den markierten Punkt wählen und löschen (⌫). Die Haut wird an der Mitte geschnitten, die Linien enden dort mit ihrem
  Knick (Rauten: Ecken an der Kante), der Rand des Lochs ist ein Loop mit Kante und ist gleich gewählt. ⌘Z führt zurück.
- **Rund:** K am gewählten Rand (Kante aus); K noch einmal macht ihn wieder kantig.
- **Weiter:** Die Punkte des Rands sind gewöhnliche Punkte (ziehen, Griffe); der Umriss des Lochs wird über sie rund.

**Wo es liegt:** Kern `packages/shape/src/dicht/mitteSchnitt.ts` (`mitteKreuzungen`, `hinterDerMitte`, `mitteFestmachen`; Tests
`mitteSchnitt.test.ts`). Fenster `apps/editor/src/form/kurven.ts`: in `blattZeichnen` die Punkte an den Kreuzungen und die
Klasse `hinter`, `hinterDerMitteZahl` (Statuszeile), `mitteFest`, am Anfang von `loeschen` die Weiche; drei Regeln am Ende des
Kurven-Blocks in `form.css`. Keine neuen Felder im Stand. Proben: `apps/editor/scripts/pruefen/form-donut-fenster.mjs` (im
Fenster: `GPU=1 node scripts/pruefen/form-donut-fenster.mjs`, mit `NAME=<Form>` an einer gesicherten Form) und
`form-donut-regel.ts` mit `GRIFFE=kern` (der Baustein rechnet dieselben Zahlen wie 7.3).

**Gemessen im Bau-Fenster** (Zahlen `docs/progress/editor/schritt4a-donut-fenster-messung-2026-11-13.txt`, Bild
`schritt4a-donut-fenster-2026-11-13.jpg`; gezogen wird die Kreuzung zweier Ringe an der Seite bis 40 hinter die Mitte):

| Fall | fest gemacht: die gezeigte Haut neben der von vorher (größter Abstand / Mittel) | Knick quer über den Rand: mit Kante → nach K | Probe |
| --- | --- | --- | --- |
| Kugel mit zwei Ringen und der Mittellinie | 6,4 / 1,7 | 82° → 26° | alles gut |
| `test_kaputt` | 4,7 / 0,3 | 65° → 15° | alles gut |
| `teat firefish` (11 400 Punkte) | 4,7 / 0,1 | 55° → 14° | alles gut |
| `strange bird` (Zug nur 12 hinter die Mitte) | 2,7 / 0,1 | 98° → 17° | Grenze, siehe unten |

„Alles gut“ heißt: lose stehen die Punkte an den Kreuzungen, der Punkt ist markiert; zurückgezogen ist nichts mehr markiert;
fest gemacht gibt es die Linienstücke und den Rand mit Kante, nichts ist umgeschlagen oder schwarz, die Haut ist spiegelgleich;
K macht den Rand glatt und wieder kantig; ein Punkt des Rands lässt sich danach ziehen und bleibt in der Mitte; ⌘Z führt bis
zum losen Stand zurück; keine Fehler in der Konsole.

**Grenzen und Offenes:**
1. **`strange bird`, Kreuzung der Ringe bei (30, −28, 148):** Schon der lose Zug stülpt dort 15 % der gezeigten Haut um (schwarz
   im Fenster; das ist der Zug von heute, nicht der Schnitt), und das Loch reicht bis an den Umriss der Form (der Rand bekommt
   zwei Punkte mit der Mittellinie). Fest machen ändert daran nichts, „Kante aus“ mindert es auf 3 %. An so einer Stelle lässt
   sich heute kein sauberer Donut ziehen.
2. Fest gemacht wird alles, was hinter der Mitte liegt, nicht nur die Stelle des gelöschten Punkts.
3. Liegt nur ein Griff hinter der Mitte und kein Punkt, erscheinen die Punkte an den Kreuzungen, aber nichts macht fest.
4. In der Pose und mit einem Maul kommt eine Meldung statt eines Schnitts (seine drei Formen haben beides nicht; an einer Form
   mit Maul ist das nicht geprüft).
5. Ein Loch, das den Umriss durchbricht oder kleiner ist als ein Dreieck: Meldung, nichts ändert sich (`fehler` im Kern).
6. Der Umriss des Lochs bleibt bei „Kante aus“, wie er geschnitten wurde.
7. Fest machen bewegt die Haut ein wenig (Tabelle): An der Kante rundet sich jede Seite für sich.
8. Sichern und Laden einer fest gemachten Form ist nicht eigens geprüft.

**In Florians Fenster seit dem 13.11. mittags (er: „Übernehmen“):** `claude/form-bau` ist nach `claude/form-spiegel`
zusammengeführt (`e511d990`, ohne Konflikte); damit liegt dort auch der Code, der bisher nur in `form-bau` lag (der Schnitt im
Kern, die Proben zu Schritt 3 und 4, „Form halten“ hinter `?ziehen=direkt`). Geprüft im Arbeitsbaum `form-alt`: Typen, die Tests
zum Schnitt und zum Fenster, und `form-donut-fenster.mjs` gegen `http://localhost:5194/…`: alles gut, dieselben Zahlen wie im
Bau-Fenster. **Der Server auf 5194 lief nach der Zusammenführung nicht mehr** (vorher hörte ein Prozess auf dem Port; ob die
Zusammenführung ihn beendet hat oder die App, ließ sich nicht feststellen). Er ist neu gestartet (Eintrag `kurven-alt`) und
hängt seitdem an der bauenden Sitzung; läuft er nicht, startet ihn `kurven-alt` wieder. `claude/form-bau`,
`claude/form-spiegel` und `claude/editor-grundlayout` stehen auf demselben Stand.

**Als Nächstes:** Florians Urteil im Fenster. Danach nach seiner Wahl: am Donut weiter (die offenen Punkte oben), Schritt 4b
(halbe Haut) oder Schritt 5 (Posen).

### 7.5 Schritt 4b, erster Teil: die Rechnung auf der Hälfte (13.11. mittags, Florian: „kannst du halbe Haut machen“)

Gebaut in `form-bau` (Port 5197); **seit dem 13.11. nachmittags in Florians Fenster (5194)** (er: „Dann mach erstmal weiter, wie du
empfiehlst“; `claude/form-bau` nach `claude/form-spiegel`, Stand `b8d3f656`). Geprüft dort: Die Donut-Probe meldet „alles gut“,
`kurven.html` und `/editor` laden ohne Fehler. Er war unterwegs und hat es noch nicht gesehen; sein Urteil zum Tempo steht aus.

**Was gebaut ist** (anders als im Plan zuerst beschrieben, mit weniger Risiko): Das Netz im Fenster bleibt ganz (Verdichten,
Anzeige, Sichern, Posen unverändert). Gefaltet wird dort, wo die Zeit bleibt, im Löser `HautAusKurven` (Option `halb`):
- **Lagen:** statt eines Systems über alle Punkte zwei halb so große (x und y: ein Punkt und sein Spiegelbild sind eine
  Unbekannte; z: ebenso mit Vorzeichen, die Punkte der Mittelebene fallen heraus). Rechte Seite gefaltet, gelöst, zurück auf alle
  Punkte (`lagen`, `faltungAnlegen`, `gefaltet`).
- **Krümmung:** dieselben konjugierten Gradienten, jede Größe nur an einem Punkt je Spiegelpaar, Vorkonditionierer gefaltet.
- **Vorlage und Auftrag** (Zerlegen im Hintergrund) tragen die zwei Systeme der Lagen (`HautVorlage.sysZ`,
  `vorlageAusSystemen`); der Schlüssel der Struktur endet dann auf „:h“, eine Vorlage der anderen Art wird nicht genommen.
- **Bitgleich schneller, auch über die ganze Haut:** zwei Spalten beim Lösen ausgeschrieben (`loesenZwei`), der Kotangens je
  Halbkante einmal statt dreimal (`intrinsisch.ts`), Vermessen ohne `forEach`.
- **Im Fenster** Standard (`?halb=0` rechnet zum Vergleichen über die ganze Haut). Dazu **„flüssig zuerst“**: Eine weitere Runde
  im selben Bild gibt es nur, wenn sie samt Anzeige in 14,5 ms passt (`BILD_MS`, `bildRestMs`; `?bildms=0` ist das alte feste
  Budget, `?budget=<ms>` stellt es). Anlass: Mit der kürzeren Runde passten am „strange bird“ zwei in die 12 ms, und jedes
  zwanzigste Bild kam erst nach 35 statt nach 21 ms.

**Gemessen** (alles in `docs/progress/editor/schritt4b-halb-messung-2026-11-13.txt`; Kern: `form-halb.ts`, Fenster:
`form-halten-probe.mjs` mit `HALTEN=0`, je ein Lauf):

| Form (Punkte) | Kern: Runde / Zerlegen, halb gegen ganz | Häute auseinander | Fenster: Rechnen je Bild | Bilder im Zug (Median / 95 %) | Ruhe nach dem Loslassen |
| --- | --- | --- | --- | --- | --- |
| `test_kaputt` (2 100) | 80 % / 79 % | 0,002 | 5,7 → 4,2 ms | 17 / 27 → 17 / 27 ms | 0,2 → 0,2 s |
| `strange bird` (7 400) | 73 % / 53 % | 0,02 | 6,6 → 4,7 ms | 16 / 21 → 17 / 21 ms | 1,2 → 0,6 s |
| `teat firefish` (11 400) | 73 % / 51 % | 0,08 | 10,3 → 7,1 ms | 18 / 32 → 16 / 35 ms | 0,7 → 0,6 s |

**Befunde:**
1. **Gleiche Form.** Derselbe Zug ganz und halb gerechnet liegt nach 60 Runden höchstens 0,08 Einheiten auseinander; Knicke und
   umgeschlagene Dreiecke sind bei beiden gleich (am „strange bird“ 55 Knicke über 60° und 2 umgeschlagene, am „teat firefish“
   39 und 0). Im Fenster: Die Donut-Probe meldet an Kugel und `test_kaputt` „alles gut“; am `teat firefish` meldet sie in
   manchen Läufen zwei umgeschlagene Dreiecke nach „über die Mitte und zurück“, über die ganze Haut gerechnet genauso (siehe
   Fallen). Grobe Züge an `test_kaputt` (`form-ablauf-probe.mjs`): wie vorher, Rauminhalt und Fläche 100,0 %, nichts
   umgeschlagen. **Maul und Pose** (`form-fressen-pose.mjs` mit `&netz=dicht`: Maul zeichnen, Fressen, in der Pose ziehen,
   zurück, in der Grundform einen Ring schneiden und ziehen, wieder Fressen, ⌘Z): ganz und halb dasselbe Ergebnis (keine offenen
   Kanten, nichts umgeschlagen, ⌘Z bis zum Anfang). In der Pose rechnet die halbe Rechnung nicht mit (dort gilt der Löser mit
   Bereich); sie greift nur in der Grundform über die ganze Haut.
2. **Das Tempo steigt um rund ein Drittel, nicht auf das Doppelte.** Die Gegenprüfung vom 10.11. hatte für das Lösen 34 %
   gemessen; heute macht das Lösen nur noch die Hälfte einer Runde aus (der Rest ist Vermessen und die Gewichte nach der
   Geometrie), und zwei halbe Systeme zu lesen kostet mehr als ein Drittel eines ganzen. Im Kern: Runde 73 %, Zerlegen 51 %.
3. **Die Bilder im Zug ändern sich nur am größten seiner Formen:** dort im Median alle 16 statt 18 ms; jedes zwanzigste braucht
   weiter doppelt so lange (32 und 35 ms). An den beiden kleineren war schon vorher eine Runde je Bild fertig; dort wird nur
   das Rechnen kürzer (Reserve) und am „strange bird“ die Ruhe nach dem Loslassen (1,2 → 0,6 s).
4. **Nicht gebaut** (nur im Kern, brächte die Runde von 73 % auf 50 bis 60 %): die Gewichte nach der Geometrie (heute der
   größte Posten einer Runde, 37 %) und das Vermessen auf der Hälfte rechnen. Schwierig daran: Die Gewichte tauschen Kanten,
   auch solche auf der Mittelebene; dort entstünden Dreiecke über beide Hälften. An seinen heutigen Formen änderte das die
   Bilder nicht mehr (eine Runde passt ins Bild), nur die Reserve für größere Formen. Auch nicht gebaut: Verdichten und Anzeige
   auf der Hälfte, das Netz selbst als Hälfte (der große Umbau aus dem Plan).

**Fallen dabei:** `loesenSpalten` mit 2 oder 4 Spalten läuft über den allgemeinen Weg (je Spalte rund viermal so langsam wie die
ausgeschriebenen); zwei umgeschlagene Dreiecke nach „über die Mitte und zurück“ am Firefish kommen mit und ohne halbe Rechnung
vor (je einmal in zwei bis drei Läufen), sie hängen am Lauf.

**Florians Antwort (13.11. nachmittags):** „Dann mach erstmal weiter, wie du empfiehlst, aber es soll nicht vergessen werden. Wir
werden das Tempo noch brauchen, wenn Shader, Materialien, Fell und Zusatzteile wie Flügel und Beine dazukommen. Meine Formen sind
momentan beliebige Testformen und haben nichts mit den Wesen zu tun.“ Also: übernommen, weiter mit den Posen; der Rest der halben
Haut steht als **Schritt 4c** fest im Plan. Befund 4 oben („an seinen heutigen Formen änderte das die Bilder nicht mehr“) ist
kein Grund, ihn zurückzustellen: Seine Formen sind kein Maßstab für das Tempo.

### 7.6 Schritt 5, Etappe 1: kleiner Beweis „die Pose in ihrer Ruhe rechnen“ (13.11. nachmittags): hält nicht wie festgelegt, angehalten

**Vorweg (13.11., 17:15 Uhr): Was hier scheitert, ist das Maul aus der schmalen Form (die verborgene Fläche zwischen den Lippen),
nicht die Pose. An Florians von Hand geformtem Maul hält derselbe Beweis; siehe 7.8.**

**Was geprüft wurde** (Plan, Nachtrag zu Schritt 5): Weil die heutige Rechnung bleibt, wäre eine Pose eine zweite Lage derselben
Form (Versatz der Linien, Blendshape der Haut), gerechnet in ihrer Ruhe (vor den Knochen, das Maul ist zu) mit der Rechnung der
Grundform; die Knochen drehen nur die Anzeige, ein Zug im Blatt wird mit dem Winkel seines Punkts zurückgedreht. Gebaut ist
davon nichts, im Fenster ändert sich nichts.

**Probe:** `form-pose-ruhe.ts` (Kern) an einer Kugel mit einem Ring und einem Maul aus der Seite, im Bau-Fenster gezeichnet
(`form-pose-ruhe-fenster.mjs`; die Form liegt unter `apps/editor/scripts/pruefen/formen/pose-maul-kugel.eewesen`), Maul 30°
offen. Drei Züge, jeder von demselben Stand: unterster Punkt der Unterlippe 25 nach unten, derselbe 25 nach oben, der Punkt oben
auf dem Ring 40 nach oben. Bild `docs/progress/editor/schritt5-pose-ruhe-2026-11-13.jpg` (links jeweils die Pose von heute, aus
dem Fenster abgelesen), Zahlen `docs/progress/editor/schritt5-pose-ruhe-messung-2026-11-13.txt`. Alle Bewegungen sind gegen die
zur Ruhe gerechnete Haut der Fassung gemessen (Halbmesser der Kugel 150).

| Fassung an den Lippen | ohne Zug (20 Runden) | Lippe nach unten: Haut fern vom Maul | Lippe nach oben: Haut fern vom Maul | Punkt am Ring: größte Bewegung |
| --- | --- | --- | --- | --- |
| (a) die verborgene Fläche der Öffnung rechnet mit (Rechnung der Grundform, unverändert) | 0,03 | 10,7 | 31,7 (der Kopf verzieht sich sichtbar) | 40,0 (wie die Grundform) |
| (b) die Lippen sind eine Kante | 0,12 (der Wechsel zur Kante einmal 0,6) | 0,95 | 0,92 | 56,8 (bläst anders auf) |
| (c) die Öffnung ist aus der Rechnung genommen | der Wechsel allein: 35,7 | 1,8 | 2,2 | 39,9 |

In allen Fällen: nichts umgeschlagen, Ruhe nach 43 bis 73 Runden, Linien genau auf ihren Pfaden (0,00), Grundform bitgleich.

**Befunde:**
1. **Die Rechnung der Grundform kann die Pose rechnen** (Kriterien 1 und 5 erfüllt; 2 für (a)). Daran scheitert es nicht.
2. **(a) scheitert an den Lippen** (Kriterium 4): Ein Zug an der Lippe nimmt die Haut über den ganzen Kopf mit. Nach oben läuft
   die Unterlippe in der Ruhe der Pose durch die Oberlippe (dort ist das Maul zu, die Lippen liegen rund 18 auseinander), die
   verborgene Fläche stülpt sich um, die Form verzieht sich. Das ist kein Randfall: Ein Maul ist in der Ruhe fast zu, jeder Zug
   der Lippen aufeinander zu führt dorthin.
3. **(b) hält die Züge an der Lippe am Ort und sauber** (auch nach oben), ändert aber, wie die Form sich aufbläst: Ein Zug fern
   vom Maul bewegt die Haut um 56,8 statt 40,0 (Kriterium 3). Die Kante lässt die Haut am Maul los. Gälte die Kante nur in der
   Pose, verhielte sich die Pose dort anders als die Grundform; gälte sie auch in der Grundform, änderte sich die Grundform mit
   Maul.
4. **(c) scheidet aus:** Mit einem Loch fällt die Form zusammen (35,7). Die Rechnung über die ganze Haut braucht eine
   geschlossene Haut. In der gezeigten Lage (Maul offen) zu rechnen hieße mit dem Maul von heute: entweder dieses Loch, oder die
   verborgene Fläche überspannt das offene Maul (am 05.11. klappte sie dort um; heute nicht neu gerechnet).
5. **Die Ursache ist das Maul von heute, nicht die Pose:** Die Haut ist am Maul geschlossen, nur die Anzeige schneidet auf.
   Erwartung, nicht gerechnet: Mit dem Maul als eigener Geometrie (Schritt 6: zwei Lippenlinien, die Höhle als Haut) gibt es
   keine verborgene Fläche; dann lässt sich die Pose in der gezeigten Lage rechnen, dort liegt nichts aufeinander.
6. **Grenzen der Probe:** eine Form mit nur zwei Loops (der härteste Fall „wenige Linien“; mit mehr Linien wandert die Haut
   weniger mit, das ist nicht gemessen), ein Maul aus der Seite, 30°. Die Linie des Mauls kreuzt sich bei (b) in der Ruhe selbst;
   ob das Fenster das verträgt, ist offen.
7. **Nebenbefund am Stand von heute:** Nach „Fressen“ aus steht die Grundform nicht ganz (bis 1,6 bis zur Ruhe):
   `poseVerlassen` legt die Linien auf ihre Pfade, gesetzt wird die Haut erst beim nächsten Griff. Nicht behoben.

**Florians Antwort (13.11. nachmittags): „ja, dann erst das Maul“.** Der Beweis dazu steht in 7.7; er hält nicht. Damit ist die
Fassung (b) wieder im Spiel.

### 7.7 Schritt 6, kleiner Beweis „das Maul als eigene Geometrie“ (13.11., 16:45 Uhr): hält nicht, angehalten

**Vorweg (13.11., 17:15 Uhr): Dieser Beweis hat das Falsche geprüft, Befund 2 und die Folgerung in Befund 5 gelten so nicht.
Geprüft war ein fertiges, fast geschlossenes Inneres, auf einmal eingeschweißt; ein Maul, das wie jede Form mit Linien geformt
wird, hält die Rechnung. Siehe 7.8.**

**Was geprüft wurde** (Plan, Nachtrag zu Schritt 6, mit Entwurf): Das Maul wird Haut. Die verborgene Fläche der Öffnung fällt
weg, Gaumen und Boden werden an den Lippen eingeschweißt (eine Tasche, die Haut bleibt geschlossen); darauf rechnet die Rechnung
der Grundform. Gebaut ist davon nichts, im Fenster ändert sich nichts.

**Probe:** `form-maul-haut.ts` (Kern) an derselben Kugel mit Ring und Maul (`formen/pose-maul-kugel.eewesen`). Bild
`docs/progress/editor/schritt6-maul-haut-2026-11-13.jpg` (links das Maul als Haut vor der Rechnung, daneben was die Rechnung
daraus macht, rechts der geschnittene Loop um den Unterkiefer), Zahlen und die Diagnose Runde für Runde in
`docs/progress/editor/schritt6-maul-haut-messung-2026-11-13.txt`.

| Kriterium | Ergebnis |
| --- | --- |
| 1 Das Maul ist Haut | **hält:** geschlossen, spiegelgleich, nichts verdreht, Lippen genau auf ihrer Linie (3 062 Punkte, vergleichmäßigt 2 147) |
| 2 Die Höhle hält | **hält nicht:** In acht Fassungen hält die Vorsicht die Rechnung nach acht Runden an, die Höhle ist dann weit auseinandergelaufen; Runde für Runde angesehen (drei Fassungen) bewegen sich freie Punkte der Höhle schon in der ersten Runde 37 bis 98 weit |
| 3 Loop um den Unterkiefer | **zur Hälfte:** Der Schnitt gibt den Ring (außen ums Kinn, innen über den Boden); der Kern setzt ihn an keiner von neun Stellen ins Netz ein |
| 4 Öffnen und Schließen, 5 Zug an der Lippe | nicht mehr gerechnet |

**Die acht Fassungen zu Kriterium 2** (größte Bewegung außen): Höhle flach, feines Gitter, Lippen als Kante (0,7 außen, die
Höhle läuft davon) · flach, vergleichmäßigt, Lippen glatt (663) · flach, vergleichmäßigt, Kante (202) · flach, vergleichmäßigt,
Kante und Mittellinie durch die Höhle (51) · gewölbt wie in der Anzeige von heute, in denselben vier Fassungen (0,7 / 435 /
184 / 57). In allen: „steht fest“ nach acht Runden, das heißt angehalten, nicht zur Ruhe gekommen.

**Befunde:**
1. **Einschweißen geht.** Die Bauart der Anzeige (`maulAmLoop`: Gaumen an der Oberlippe, Boden an der Unterlippe, zwischen den
   Mundwinkeln treffen sie sich) gibt eine geschlossene Haut, wenn die Punkte an den Lippen verschmolzen werden.
2. **Die Rechnung von heute hält keine Höhle.** Sie macht die Haut zwischen den Linien so rund wie möglich und nimmt die
   Krümmung an den Linien von der Haut selbst ab. Bei der gewölbten Höhle laufen Punkte mitten im Gaumen davon, bei der flachen
   die hinten, wo Gaumen und Boden in einem Knick zusammenlaufen. Dieselbe Schwäche wie „bläst auf oder kollabiert“ zwischen
   wenigen Linien, hier in ihrer härtesten Form.
3. **Der Knick hinten und an den Mundwinkeln bräuchte eine harte Linie**, die es im Linienmodell nicht gibt: Sie liefe von
   Mundwinkel zu Mundwinkel durch das Innere, also weder von Mitte zu Mitte (Ring) noch geschlossen (Mitte, Paar).
4. **Nicht geprüft:** die Höhle mit mehreren Linien gefasst (dazu müsste der Kern den Loop um den Kiefer einsetzen können);
   eine Höhle mit runden Mundwinkeln; die Höhle aus der Rechnung genommen (sie folgte dann den Lippen wie heute in der Anzeige;
   für Florian sähe das aus wie heute).
5. **Folgerung:** Das Maul als Tasche in derselben Haut geht mit der heutigen Rechnung nicht. „Loops um einen Kiefer“ gibt es
   so nur, wenn der Unterkiefer ein eigenes Teil mit eigener Haut ist (zwei runde Körper, jeder von der heutigen Rechnung
   gehalten). Das ist ein eigener Entwurf und gehört zu „Teile anfügen“ (Flügel, Beine).

**Gefragt war Florian (13.11., 16:45 Uhr)** nach „Posen mit Kante“, „Kiefer als Teil“ oder „Erst die Hälfte“. Seine Antwort war
ein Widerspruch; siehe 7.8.

### 7.8 Berichtigung: An Florians von Hand geformtem Maul halten beide Beweise (13.11., 17:15 Uhr)

**Florian zum Ergebnis von 7.7:** „Ich verstehe das Problem nicht. Ich kann doch jedes beliebige Maul auch mit dem jetzigen Mesh
von Hand formen, und es kollabiert nichts, und es wird nichts komisch aufgeblasen. Ich denke, du verkomplizierst da etwas oder
hast mich missverstanden. Schau es dir nochmal an.“ **Und zu 7.6:** „Auch bei deinem fehlgeschlagenen Posenbeweis. Ich verstehe
das Problem nicht. Ich verstehe, dass ich keine neuen Edgeloops oder Punkte in der Pose hinzufügen kann, aber verschieben und
bearbeiten sollte ich alles ohne Probleme können. Dann ist es ja ein einfacher Morph der Punkte und Handles von einer zur anderen
Position, während die Kieferknochen sich bewegen.“ Er hat dazu seine Form gesichert: **`wesen/maul handgemacht test.eewesen`**
(3 485 Punkte, 13 Loops): zwei Kiefer, dazwischen die Bucht; die Lippenlinie ist Loop 14 (Ring, Kante), Loop 15 läuft nur um den
Oberkiefer, Loop 16 nur um den Unterkiefer.

**Was falsch war:**
- 7.7 hat nicht „ein Maul in derselben Haut“ geprüft, sondern eine Konstruktion: das Innere der Anzeige (oder eine flache
  Fassung davon) fast geschlossen, mit einem Knick hinten und fast ohne Linien, auf einmal eingeschweißt. Daraus habe ich
  geschlossen, die Rechnung halte keine Höhle. Seine Formen zeigen täglich das Gegenteil (auch „teat firefish“ hat tiefe
  Buchten).
- 7.6 ist an der verborgenen Fläche zwischen den Lippen gescheitert. Die hat nur das Maul aus der schmalen Form; ein geformtes
  Maul hat sie nicht.
- Sein Wunsch vom 12.11. („echte eigene Geometrie“, Loops nur um einen Kiefer, Kiefer nicht mehr an den alten Linien) ist an
  einem von Hand geformten Maul schon erfüllt. Ich hatte ihn als „die schmale Form in eine Höhle umbauen“ gelesen.

**Gegenproben** (Zahlen `docs/progress/editor/schritt5-6-gegenprobe-geformt-messung-2026-11-13.txt`):
1. **Ein Maul mit Linien geformt** (`form-maul-geformt.ts`; Kugel mit drei Loops, Punkte für die Lippen, der Punkt vorn in 40
   Schritten 110 nach innen): steht nach 84 Runden, Bucht 110 tief, nichts umgeschlagen, Linien genau auf ihren Pfaden. Bild
   `docs/progress/editor/schritt6-maul-geformt-2026-11-13.jpg`.
2. **Seine Form, Knochen und Pose** (`form-pose-geformt.ts`, `LIPPE=14`; Bild
   `docs/progress/editor/schritt5-pose-geformt-2026-11-13.jpg`):
   - Die Form steht (zur Ruhe in 8 Runden, dabei 0,07 bewegt; Knicke über 60° 96, umgeschlagen 8 als Ausgangswert).
   - **Knochen:** Aus der Lippenlinie liest `maulAmLoop` Gelenk und Gewichte (Mundwinkel hinten in der Bucht; 226 Punkte drehen
     ganz, 400 zum Teil). Der Unterkiefer dreht als Ganzes. An seiner Spitze, wo die Lippenlinie endet, knickt die Haut: 20°
     weiter offen 12 umgeschlagen (4 mehr), 20° weiter zu 28 (20 mehr). **Die Maul-Funktion von heute ginge an dieser Form
     nicht:** Sie nähme die Innenseiten der Kiefer als Öffnung (622 Dreiecke), schnitte sie weg und setzte ein eigenes Inneres
     ein.
   - **Pose** (20° weiter offen; der Zug zurückgedreht, Rechnung der Grundform unverändert): Punkt der Unterlippe 25 nach unten
     und 25 nach oben: steht nach 43 Runden, fern vom Maul 0,00, Linien 0,00 neben ihrem Pfad, keine neuen umgeschlagenen
     Dreiecke. 70 nach oben: steht nach 54 Runden, 8 umgeschlagene mehr. Punkt fern vom Maul 25 nach außen: steht nach 42.

**Was daraus folgt** (im Plan als Berichtigung):
- Das Maul ist, was er formt. Eine eingeschweißte Höhle braucht es nicht.
- **Schritt 6 neu (klein): die Maul-Funktion für ein geformtes Maul.** Lippenlinie wählen, „Fressen“: Gelenk und Gewichte, nichts
  schneiden, nichts einsetzen; den Knick an der Kieferspitze beheben. Das Maul aus der schmalen Form bleibt daneben bestehen.
- **Schritt 5:** Pose = dieselben Punkte und Griffe an anderen Lagen, dazu die Knochen (Nachtrag im Plan). Die Fassungen (b)
  und (c) aus 7.6 und die Frage nach der Kante am Maul entfallen für ein geformtes Maul.
- Reihenfolge: erst Schritt 6 neu (ohne Knochen gibt es an seiner Form keine Pose), dann Schritt 5.

**Grenzen:** eine Form, nur im Kern, die Gewichte von heute. Im Fenster ist nichts gebaut und nichts geändert.

**Gefragt ist Florian (13.11., 17:15 Uhr):** Ist es so richtig verstanden, und soll ich so bauen? **„Ja, so bauen“** oder
**„Nein“**.

## 8. Offen aus der Zeit davor

Florians Blick auf G4, auf Sichern und Laden und auf G5 Teil 1 steht aus. Die offenen Entscheidungen der alten Übergabe
(Abschnitt 5 dort: „Punkte wo nötig“, weich überblenden beim Einwechseln, Linie kehrt um, Vorsicht und Schutz) erledigen sich
zum Teil mit den Schritten 2 bis 4 und werden dort wieder aufgegriffen, nicht vorher.
