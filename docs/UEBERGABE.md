# Übergabe (Stand 14.11.2026, 11:05 Uhr: **Der Zwischenschritt „Abzweigungen“ ist im Bau-Fenster (5197) gebaut, bis auf Fall 4** (Abschnitt 7.17 und Plan): Mit P von einem Punkt oder einer Linie zu einem anderen Punkt oder einer anderen Linie ziehen; die neue Linie hängt an beiden Punkten und teilt sie; vom Punkt zum Spiegelbild endet sie auf der Mitte. Probe an Florians Form „test_kaputt“: 19 Punkte erfüllt. Nicht gebaut: Punkte dazwischen beim Zeichnen (Fall 4). Sein Urteil steht aus; in seinem Fenster (5194) ist davon nichts. **Reihenfolge (Florian, 14.11.):** Abzweigungen, dann Schritt 5, dann 4c. **Schritt 6 (Maul) ist angehalten** und bekommt eine eigene Sitzung, vielleicht zusammen mit Zähnen (Abschnitt 7.16); bis dahin am Maul nichts bauen. Schritt 7 kommt später, ob und wie ist offen. Zu Schritt 1, 2, 4a und 4b sagt er: „das sieht gut aus bis jetzt“)

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
| 1 Glatte Anzeige | **eingebaut und Standard** (Abschnitt 4). Florian am 12.11.: „Ja, übernehmen“; seitdem auf der gemeinsamen Linie und in seinem Fenster. `&anzeige=grob` zeigt zum Vergleich die Anzeige davor. Sein Urteil nach dem Arbeiten damit steht aus **Florian am 14.11. zu Schritt 1, 2, 4a und 4b: „das sieht gut aus bis jetzt“.** |
| 2 Kleines Rechennetz | **eingebaut und Standard** (Abschnitt 5): rund 40 % der Punkte, im Zug 16 bis 20 ms je Bild. Florian am 12.11. nachts, vom Handy aus: „ja“; seitdem auf der gemeinsamen Linie und in seinem Fenster. `&netz=dicht` ist das Netz davor. Sein Urteil nach dem Arbeiten damit steht aus. Nicht gebaut: Zeichnen gegen die feine Fläche **Florian am 14.11. zu Schritt 1, 2, 4a und 4b: „das sieht gut aus bis jetzt“.** |
| 3 Beweis „Haut direkt aus den Linien“ | **abgeschlossen, die heutige Rechnung bleibt** (Abschnitt 6, 13.11.): Die Haut nur aus den Linien (A) scheitert zwischen wenigen Linien und an seinen drei Formen. Der Teil B (fertige Haut direkt bewegen) hält rechnerisch; als Schalter „Form halten“ im Bau-Fenster ausprobiert, Florian: „Gefällt nicht“. Knopf und Taste sind wieder weg; der Code liegt nur auf `claude/form-bau` hinter `?ziehen=direkt` |
| 4 Echte Spiegelung (mit der heutigen Rechnung) | **4a, der Donut, ist in Florians Fenster (Abschnitt 7.4, 13.11.):** nach seiner zweiten Regel; sein Urteil steht aus. **4b, erster Teil, ist seit dem 13.11. nachmittags in Florians Fenster (Abschnitt 7.5):** Der Löser rechnet auf der Hälfte (zwei halb so große Systeme, Krümmung auf der Hälfte), das Netz im Fenster bleibt ganz; Rechnen je Bild 10,3 → 7,1 ms am „teat firefish“, Zerlegen rund 50 %, gleiche Form; dazu „flüssig zuerst“ (eine weitere Runde je Bild nur, wenn sie ins Bild passt). Sein Urteil zum Tempo steht aus **Florian am 14.11. zu Schritt 1, 2, 4a und 4b: „das sieht gut aus bis jetzt“.** |
| 4c Rest der halben Haut | **fest vorgemerkt** (Plan, „Schritt 4c“; Florian am 13.11.: „es soll nicht vergessen werden“): Gewichte und Vermessen auf der Hälfte (Runde von 73 % auf 50 bis 60 %), die einzelnen langsamen Bilder, Verdichten und Anzeige auf der Hälfte, das Netz selbst als Hälfte. Kommt nach den Posen wieder auf den Tisch und muss gebaut sein, bevor Shader, Materialien, Fell oder Zusatzteile beginnen. Seine heutigen Formen sind kein Maßstab für das Tempo |
| Zwischenschritt Abzweigungen (vor Schritt 5) | **Im Bau-Fenster gebaut bis auf Fall 4, Florians Urteil steht aus** (Abschnitt 7.17; Florian am 14.11.: „Ja, so bauen“): Mit P von einem Punkt oder einer Linie zu einem anderen Punkt oder einer anderen Linie ziehen; die neue Linie hängt an beiden Punkten und teilt sie, kreuzt sie andere, entsteht ein gemeinsamer Punkt, zum Spiegelbild gezogen endet sie auf der Mitte. Probe an „test_kaputt“: 19 Punkte erfüllt. **Offen:** Punkte dazwischen beim Zeichnen (Fall 4) |
| 5 Posen wie die Basis | **Entwurf steht, Gegenprobe an Florians Form hält** (Abschnitte 7.6 und 7.8, 13.11.): Eine Pose ist dieselbe Form mit anderen Lagen der Punkte und Griffe, dazu die Knochen (Florian: „ein einfacher Morph der Punkte und Handles […], während die Kieferknochen sich bewegen“). Der erste Beweis war am Maul aus der schmalen Form gescheitert (verborgene Fläche); am von Hand geformten Maul ist ein Zug in der Pose ein gewöhnlicher Zug. Gebaut ist nichts; kommt nach Schritt 6 |
| 6 Maul | **Angehalten (Florian, 14.11.):** „Das Maul formt sich und das ist ok“; alles Weitere braucht „ein eigenes System und Definition“ in einer eigenen großen Sitzung (Abschnitt 7.16: sein Wort, der Stand, die offenen Fragen). **Im Bau-Fenster steht** (nicht in seinem Fenster): (7.13) „Maul formen“ in dritter Fassung: Die Maullinie trägt ihren Knick selbst (95° an den Lippen, 70° am Mundwinkel), ohne Mittellinie, animiert; mit einer Mittellinie durch beide Lippen gilt die zweite Fassung (7.11). (7.14) „Fressen“ und die Regler am geformten Maul. (7.11) Linien mit Verjüngung. (7.16) Das Maul aus nur einer Linie: hält an einer Form ohne Linien durchs Maul, an seinen Formen nicht. **Sein Einwand zur dritten Fassung:** Die fest eingeklappte Wulst ist nicht, was er erwartet; Linien, die er nachträglich durchs Maul zieht, stören sich an ihr; liegt ein Maul über einer Kreuzung, muss er die Kreuzungspunkte von Hand zurechtlegen. **Offen:** das Maul-System (zuerst die Beschreibung der Fälle), geschlossene Mäuler (dürfen später kommen), runde Lippen, Tiefe der Tasche, Knick von Hand. Das Maul aus der schmalen Form mit eingesetztem Inneren besteht daneben weiter |
| 7 Auswahl wie in Blender | **zurückgestellt** (Florian, 14.11.): „eher später“; er ist nicht sicher, ob es das braucht und wie es umgesetzt werden kann |

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

**Gefragt war Florian (13.11., 17:15 Uhr),** ob es so richtig verstanden ist. Seine Antwort steht in 7.9: Das Maul soll
weiter automatisch entstehen.

### 7.9 Schritt 6 neu: das Maul automatisch geformt, wie von Hand (13.11., 17:30 Uhr): der Beweis hält

**Florian:** „Das Maul soll aber an einem gewählten Edgeloop immer noch automatisch entstehen. Ist das dann noch so? Im Grunde
machst du ja nur die Kante hart und verbindest von der Seite die gegenüberliegenden Seiten. Das sollte automatisch passieren
können. Das Maul ist dann einfach eine Form wie von Hand gemacht, nur automatisiert. Ich kann weitere Edgeloops auch im Inneren
einziehen und später Zahnfleisch, Zähne und Zunge genau einstellen. (Zähne und Zahnfleisch und Zunge machen wir jetzt noch
nicht.) Geht das so, wie ich es hier erklärt habe? Die Spiegelkante ist zur Stabilisation der Form ja sowieso schon von Anfang
an gegeben. Daher bläst sich eigentlich auch nicht mehr so viel auf, und es sollte problemlos gehen.“

**Antwort: ja.** Probe `form-maul-automatisch.ts` (Kern) an der Kugel mit Ring und Maullinie
(`formen/pose-maul-kugel.eewesen`); Bild `docs/progress/editor/schritt6-maul-automatisch-2026-11-13.jpg`, Zahlen
`docs/progress/editor/schritt6-maul-automatisch-messung-2026-11-13.txt`. Nichts wird hineingebaut, es wird nur an Linien gezogen:
1. Die Maullinie wird eine Kante (die Lippen).
2. Mittellinie (falls sie fehlt) und eine **Querlinie durch beide Mundwinkel**: ein Ring um den Kopf in der Ebene des Mauls. Er
   kreuzt die Mittellinie vorn zwischen den Lippen und die Maullinie in den Mundwinkeln; das Stück dazwischen ist hart. Das ist
   „die gegenüberliegenden Seiten verbinden“, als Linie.
3. **Durchstanzen:** Die Mittellinie bekommt im Maul die Punkte und Griffe der Maullinie, flach auf die Mittelebene gelegt; die
   Kreuzung vorn wandert dabei zwischen die Mundwinkel, das Stück der Querlinie bis zum Mundwinkel wird gerade. In 8 Stufen zu 8
   Schritten, nach jeder Stufe verfeinert wie nach einem Zug.

**Florian zum ersten Bild (13.11., 17:35 Uhr; dort wurde nur die Kreuzung nach innen gezogen, die Mittellinie lief als gerades V
nach hinten):** „Das Maul sieht aber auf deinen Bildern noch falsch aus. Es soll aussehen, als wäre der Edgeloop von der
Seitenansicht durchgestanzt mit genau der Form des Maulloops von der Seite. Das heißt, die Mittellinie muss von der Seite exakt
den Shape der Maullinie haben. Verstehst du. Aber der Weg ist grundsätzlich richtig.“ Daraus ist Schritt 3 oben geworden.

| Geprüft | Ergebnis |
| --- | --- |
| Das Maul formen | steht; nichts umgeschlagen; Vorsicht 0; Linien 0,08 neben ihrem Pfad; außen bis 3,0 bewegt (mit dem Verfeinern unterwegs) |
| Durchgestanzt | **die Mittellinie liegt im Maul höchstens 0,27 neben der Maullinie von der Seite**; die Flächen zwischen Lippe und Mitte weichen noch bis 9,8 ab (im Mittel 2,4) |
| Loop nur um den Unterkiefer, Loop nur um den Oberkiefer | beide lassen sich schneiden und einsetzen; danach Ruhe nach 7 Runden, nichts umgeschlagen |
| Kieferknochen 30° offen | nichts umgeschlagen (Gelenk am Mundwinkel; Gewichte außen wie heute, innen Boden ganz, Gaumen gar nicht) |
| Zum Vergleich: dieselbe Form auf einmal hineingebaut, mit der Verbindung hinten als harter Linie | kommt nicht zur Ruhe (Vorsicht hält nach acht Runden an; 99 umgeschlagen) |

**Befunde:**
1. Der Unterschied zu 7.7 ist das Formen in Schritten. Die Form ist dieselbe (Gaumen und Boden als Flächen zwischen den Lippen
   und der Linie von Mundwinkel zu Mundwinkel).
2. Die Verbindung von Mundwinkel zu Mundwinkel braucht keine neue Art Linie: Sie ist das innere Stück eines gewöhnlichen Rings
   um den Kopf, der durch die Mundwinkel läuft.
3. Was 7.7 nicht konnte (den Loop um einen Kiefer einsetzen), geht hier.

**Offen aus der Probe:** eine Form, nur im Kern. Die Flächen innen sind noch nicht genau durchgestanzt (zwischen Lippe und
Mitte liegt keine Linie, die Rechnung rundet dort); Vorschlag: an jedem Punkt der Maullinie eine Querlinie wie am Mundwinkel,
innen gerade von der Lippe zur Mitte, außen ein Loop um den Kiefer. Die Maullinie bekommt am Mundwinkel einen zweiten Punkt
dicht neben dem vorhandenen. Die Gewichte innen sind grob; geöffnet ist die Fläche hinten am Gelenk zackig. Glatte Lippen
(Kante aus) sind nicht geprüft.

**Etappen** (Plan, „Schritt 6, wie Florian ihn beschreibt“): 1. „Maul“ formt automatisch (Kern und Fenster); 2. Kieferknochen am
geformten Maul, auch am von Hand geformten; 3. danach Schritt 5 (Posen).

**Florians Antwort (13.11.):** „Bau mal, ich muss es mir anschauen.“ Siehe 7.10.

### 7.10 Schritt 6, Etappe 1: „Maul formen“ im Bau-Fenster gebaut (13.11., 18:40 Uhr)

Gebaut in `form-bau` (Port 5197); **in Florians Fenster (5194) ist davon nichts.** Er sieht es sich im Bau-Fenster an.

**Was gebaut ist:**
- **Kern:** `maulFormen(haut, loops, maulId, opt)` in `packages/shape/src/dicht/maulFormen.ts` (Test `maulFormen.test.ts`). Rein:
  Haut und Loops bleiben, zurück kommen die neue Haut, die neuen Loops, `alt` (für `netzGewachsen`) und die Zähler, oder
  `fehler` mit dem Grund. Ablauf wie in 7.9: Mundwinkel sicherstellen, Maullinie hart (und `maulGeformt` am Ring),
  Mittellinie (vorhandene durch beide Lippen, sonst angelegt), Querlinie durch beide Mundwinkel (hart nur von der Mitte bis zum
  Mundwinkel, dahinter ein Punkt ohne Kante), dann durchstanzen in 8 Stufen zu 8 Schritten, nach jeder Stufe verfeinert.
  `opt.zwischen` ruft nach jedem Abschnitt (zum Messen oder später zum Zeigen).
- **Fenster:** Knopf „Maul formen“ (`kurven.html`, `kurven.ts`: `maulFormenGewaehlt`): am gewählten Ring, nur in der Grundform.
  Erst die Meldung, dann wird gerechnet (an der Kugel 0,7 s, so lange steht das Fenster); ⌘Z führt zurück. Ein Maul der alten
  Art an derselben Linie entfällt dabei. `maulAnlegen` weist einen geformten Ring ab: „Fressen“ und die Regler geben dort eine
  Meldung, bis Etappe 2 gebaut ist. `/editor` ist nicht angefasst.

**Probe im Fenster** (`GPU=1 node scripts/pruefen/form-maul-formen-fenster.mjs <bild>`, Kugel, schmale Form in der Seite vorn
über den Umriss, dann der Knopf), alle Punkte erfüllt:

| Geprüft | Ergebnis |
| --- | --- |
| Formen | „Maul geformt (0,7 s)“; 1 586 → 1 761 Punkte; drei Loops (Maullinie mit Kante, Mittellinie mit 11 Punkten, Querlinie mit 4) |
| Nichts umgeschlagen, spiegelgleich | 0; Abweichung 0 |
| Durchgestanzt | die Mittellinie liegt im Maul (19 Stellen) höchstens 0,15 neben der Maullinie von der Seite |
| Hinter dem Maul bleibt die Form | größte Abweichung von der Kugel 4,2 (Halbmesser 150) |
| An der Unterlippe ziehen | wie jeder Zug, nichts umgeschlagen |
| „Fressen“ am geformten Maul | Meldung statt der alten Anzeige |
| ⌘Z | genau wie vor dem Formen |
| Konsole | keine Fehler |

Bild: `docs/progress/editor/schritt6-maul-formen-fenster-2026-11-13.jpg`. Dazu: 152 Tests im Kern (`src/dicht/`,
`zerlegung.test.ts`), 24 im Fenster, Typen und Lint sauber; die Donut-Probe und die Fressen-Probe (Maul der alten Art) laufen
wie vorher.

**Beim Einbau gefunden und behoben** (beides war in der Probe 7.9 nicht aufgefallen, weil die Form dort schon einen Ring hatte):
1. **Die Kugel wurde zur Zitrone.** Die neue Mittellinie hatte nur die zwei Punkte an den Lippen; ihr Pfad lief in einem Stück
   um den ganzen Körper und verzog die Form beim Setzen um 21. Jetzt bekommen die neuen Linien Punkte, wo sie nötig sind
   (`griffeAnlegen` mit `punkteBis`): 1,7.
2. **Die Kante der Querlinie reichte um den ganzen Kopf** (eine Kante an einem Punkt reicht bis zum Nachbarpunkt). Jetzt liegt
   dicht hinter dem Mundwinkel ein Punkt ohne Kante.
3. Die Kreuzung der Querlinie mit der Maullinie nimmt den Mundwinkel selbst (kein zweiter Punkt daneben mehr).

**Offen:**
- **Etappe 2:** Kieferknochen am geformten Maul (Gelenk an den Mundwinkeln; Gewichte außen wie heute, innen weich vom Boden zum
  Gaumen; „Fressen“ und Regler ohne Schneiden und Einsetzen), auch am von Hand geformten Maul (dort der Knick an der
  Kieferspitze, 7.8).
- Die Flächen zwischen Lippe und Mitte sind noch nicht genau durchgestanzt (7.9: bis 9,8 daneben); Vorschlag: Querlinien an
  jedem Punkt der Maullinie, innen gerade.
- Hinter dem Maul setzt sich die Haut an der neuen Querlinie um bis zu 6 (Kern) bzw. 4 (Fenster); das tut jede neue Linie.
- Die Querlinie läuft außen um den ganzen Kopf, weil es Linien nur von Mitte zu Mitte gibt. Ob Florian sie dort will, ist
  offen.
- Geprüft an der Kugel. An einer seiner Formen ist der Knopf noch nicht probiert; eine Mittellinie, die es schon gibt, wird
  benutzt, wenn sie durch beide Lippen läuft (bei Formen mit Löchern gibt es mehrere Linien der Mitte).
- Das Formen steht 0,7 s lang im Fenster; bei großen Formen länger (nicht gemessen).

### 7.11 Schritt 6, zweite Fassung: einfaches Maul, animiert; Linien mit Verjüngung (13.11., 20:45 Uhr)

Florian hat sich 7.10 im Bau-Fenster angesehen, zwei eigene Modelle gesichert (`wesen/simple_mouth.eewesen`,
`wesen/simple_mouth_more simple.eewesen`) und dreimal geschrieben; seine Worte stehen im Plan (Schritt 6, „Zweite Fassung“).
Kurz: grundsätzlich gut, aber die Form im Maul ist zu kompliziert und die zusätzlichen Punkte braucht es nicht; die Zitrone ist
ohne Haltelinien logisch; Kanten sind falsch gefasst (ein Punkt knickt an einer Kreuzung in eine Richtung und läuft in die
andere rund); die Basis ist sein einfaches Maul (Lippen hart, an den Lippen 90 bis 100° ins Maul geknickt, am Mundwinkel rund
70°), am liebsten ganz ohne Punkt und ohne Mittellinie; das Formen soll organisch animiert sein; Knicke 3 Bildpunkte, runde
Linien so fein wie möglich, dazwischen verjüngt; ein Maul soll auch nur eine Linie sein können.

**Gebaut in `form-bau` (5197); in Florians Fenster (5194) ist davon nichts:**
- **Kern:** `maulFormen` neu (`packages/shape/src/dicht/maulFormen.ts`): Maullinie hart wie mit K, Mittellinie durch beide Lippen
  (fehlt sie: angelegt, nachdem die Lippen hart sind, nur mit den zwei Punkten dort), dann dreht sich ihr Griff nach innen an
  beiden Lippen in 8 Stufen zu 8 Schritten bis zum Knick von 95° (`knick`), Länge für eine Tasche von 0,55 des Wegs zum
  Mundwinkel (`tiefe`); nach jeder Stufe verfeinert. `maulFormenSchritte` ist dasselbe als Folge von Zwischenständen (je Runde
  einer). `ohneMitte` entfernt eine nur zum Formen angelegte Mittellinie am Ende wieder (zum Ansehen). Sicherung: Wächst das
  Netz über alle Maßen oder sind die Lagen nicht endlich, kommt `fehler` zurück.
- **Kern:** `haerteBei(l, loops)` in `loops.ts`: Härte je Probe für die Anzeige (1 am Knick, 0 an runden Stützstellen,
  dazwischen gleichmäßig). Die Rechnung nimmt weiter `kanteBei`.
- **Fenster** (`kurven.ts`): `maulFormenGewaehlt` startet den Lauf, `maulSchritt` rechnet je Bild zwei Runden weiter und zeigt
  den Stand (`&maulRunden=<n>`); Eingaben sind so lange gesperrt; ⌘Z führt hinter das Formen zurück; ein zweites Mal formen ist
  erlaubt. `&maulMitte=0` schaltet `ohneMitte` ein. Bänder im 3D mit Breite je Punkt (`bandGeometrie`), in den Blättern die
  Kante als Fläche (`kantenFlaeche`, Klasse `kante-band` in `form.css`), Linien 0,5 Bildpunkte, gewählte 1,25. K: Bleibt eine
  Linie hart, weil eine kreuzende dort knickt, sagt es die Meldung.

**Proben, alle erfüllt:**
- Fenster, „Maul formen“ (`GPU=1 node scripts/pruefen/form-maul-formen-fenster.mjs <bild>`): geformt in 2,0 s, 98 von 100
  Bildern mit Bewegung; 1 586 → 1 653 Punkte; zwei Loops, die Mittellinie mit zwei Punkten, Knick 95,0° und 95,0°, die
  Lippenlinie läuft an der Mitte rund durch; umgeschlagen 2; spiegelgleich; hinter dem Maul bis 24,8 neben der Kugel (Zitrone);
  „Fressen“ gibt die Meldung; ein Zug an der Unterlippe läuft; K lässt die Form stehen (bewegt 0,00); ⌘Z genau wie davor;
  keine Fehler in der Konsole.
- Fenster, Verjüngung (`form-kante-verjuengung-fenster.mjs`): Ring mit drei Punkten, K am mittleren: 3,00 Bildpunkte am Punkt,
  0,50 an den Nachbarn.
- Kern: 154 Tests (`src/dicht/`, `zerlegung.test.ts`), 24 im Fenster, Typen und Lint sauber.
- Bilder: `docs/progress/editor/schritt6-maul-einfach-fenster-2026-11-13.jpg` (Fenster nach dem Formen),
  `schritt6-maul-einfach-2026-11-13.jpg` (sein Modell „simple_mouth“ über dem automatisch geformten, aus dem Kern),
  `kanten-verjuengung-fenster-2026-11-13.jpg`.

**Gemessen (Plan, Tabelle): Ohne Mittellinie ist der Knick an den Lippen nicht eingestellt.** Mit Mittellinie 98° und 98° auf
zwei Netzen, Tasche 0,45 und 0,47. Ohne sie auf dem Netz des Fensters 93° und 100° mit einer Tasche von 0,82, auf einem
feineren 39° und 68° mit 0,23. Deshalb bleibt die Mittellinie im Standard stehen.

**Beim Bauen gefunden:**
1. Eine neue Mittellinie mit zwei glatten Punkten (angelegt, bevor die Lippen hart sind) zerdrückt die Kugel (Pfad bis 190
   daneben), und das Verfeinern lief auf 433 000 Punkte. Jetzt wird sie nach den harten Lippen angelegt (dann ist sie dort eine
   Ecke, jede Seite bekommt ihre Griffe für sich: die Zitrone, bis 28), und das Formen bricht ab, wenn das Netz davonläuft.
2. „Kante aus“ mit selbsttätigem Glätten der kreuzenden Linie stülpt an der Mittellinie mit zwei Punkten den Körper um.
   Zurückgenommen.
3. Die Zählung „umgeschlagen“ des Kerns (`falten`) meldet an beiden Modellen von Florian 6 Dreiecke am Mundwinkel; das
   automatisch geformte Maul liegt je nach Netz bei 0 bis 12 (das Fenster zählt 2).

**Offen (Florians Wort steht aus; im Plan als „Kanten neu“ und als Fragen):**
- Die Kante, die ihren Winkel selbst trägt (Beweis im Kern, Kriterium im Plan). Erst damit hält sein zweites Modell (nur die
  Maullinie) den Knick, und K bekommt an der Lippe einen klaren Sinn.
- Was die 70° am Mundwinkel meinen, und ob „Maul formen“ den Mundwinkel nach innen ziehen soll.
- Ecke und glatt an einer Kreuzung je Linie (heute im Fenster für alle Linien zusammen).
- Das Maul aus nur einer Linie (geschlossen unsichtbar): mit Etappe 2.
- Etappe 2: Kieferknochen am geformten Maul. Danach Schritt 5.
- An einer seiner Formen ist der Knopf noch nicht probiert. `/editor` ist nicht angefasst.

### 7.12 Beweis „die Kante trägt ihren Winkel selbst“ (13.11., 21:20 Uhr): hält

Florian auf die zwei Fragen aus 7.11: „Ja, es meint den Knick quer an den Mundwinkeln nach innen. Mache gerne erstmal das bzw.
den Beweis.“ Die 70° sind also der Knick der Haut quer über die Maullinie am Mundwinkel.

**Die Probe** (`apps/editor/scripts/pruefen/form-kante-winkel.ts`, aus `packages/shape` mit `npx vite-node …`; `DREIECKE=2000|
3000|6000`, `NAME=<gesicherte Form>`, `LIPPE`, `WINKEL`, `LOSLASSEN=1`, `MEHR=<Runden>`, `AUS=<datei.html>`): Kugel mit der
schmalen Form ums Maul, hart, sonst keine Linie. Am Löser ist nichts geändert: Die erste Reihe der Haut innen an der Linie
(`reiheAnlegen`: was die Linie umschließt, die Punkte neben ihr) ist ein Loop ohne Kette, dessen Proben je einen Punkt der Haut
binden (`reihenLoop`). Seine Ziele werden vor jedem Schritt neu gerechnet (`reihenZiele`): jeder Punkt um die Linie gedreht, bis
er um den Winkel gegen die Haut außen in den Körper knickt (`rahmen`: Tangente, Richtung der Haut außen, ihre Normale); Abstand
längs und quer wie beim Anlegen. Gedreht wird vom Knick der Form zum Soll in 12 Stufen zu 6 Schritten, nach jeder Stufe
verfeinert, am Ende gesetzt.

**Ergebnis:** die Tabelle im Plan (Schritt 6, „Beweis“). Kugel auf drei Netzen: 95,0°/95,0°, 95,1°/94,1°, 95,0°/95,0° an den
Lippen, 74,0°, 72,2°, 72,3° am Mundwinkel, Tasche 0,18 bis 0,20, die Haut steht. Florians „simple_mouth_more simple“: von
126,8°/116,4° auf 93,6°/94,6°, Mundwinkel von 43,5° auf 72,0°, steht, nichts umgeschlagen. Alle Punkte des Kriteriums erfüllt;
die 6 umgeschlagenen Dreiecke auf dem Netz des Fensters sind schon ohne jeden Winkel da (vom Verfeinern am spitzen Mundwinkel).

**Was der Beweis nicht zeigt:**
- Die Führung steht nur in der Probe. Ohne sie läuft der Winkel wieder davon (76°/80°, 132°/106°, 69°/66°; an seiner Form
  111°/107°): Sie muss in jede Rechnung (Zug, Nachlauf, Hintergrund), also in `LoopZug` oder in den Löser.
- Hinter der starren ersten Reihe ist das Innere unruhig (an seiner Form im Bild zu sehen; 400 Runden mehr ändern es nicht).
- Die Tiefe der Tasche ergibt sich (an der Kugel 0,2 des Wegs zum Mundwinkel).
- Genau am Mundwinkel gibt es innen keine Punkte der Haut; der Knick ist dort nicht gemessen.

**Als Nächstes (Florians Wort steht aus):** der Einbau in drei Etappen (Plan, „Vorschlag für den Einbau“): im Löser als weiches
Ziel der Ebene statt als starre Bindung; der Winkel als Angabe an der Linie; „Maul formen“ darauf, ohne Mittellinie.

### 7.13 Eingebaut: Die Kante trägt ihren Winkel selbst, „Maul formen“ in dritter Fassung (13.11., 22:15 Uhr)

Florian nach dem Beweis (7.12): „Dann mache Etappe 1.“ Gebaut in `form-bau` (5197); in seinem Fenster (5194) ist davon nichts.

**Abweichung von der Ankündigung:** Die erste Reihe sollte im Löser „beweglich statt starr“ werden, damit das Innere ruhiger
wird. Die Messung vorher zeigt: Die Unruhe kommt nicht von der starren Reihe. Sein Modell hat gesichert 5,6° mittleren Knick
zwischen Nachbardreiecken im Maul, nach bloßem Neurechnen ohne Winkeländerung 7,3°, mit dem Winkel geformt 6,1°; die erste Reihe
selbst ist die ruhigste (4,2°). Mein Bild vom Beweis war flach schattiert. Die Reihe bleibt deshalb geführt wie im Beweis (jede
Runde neu gebunden); sie quer fest und in der Ebene frei zu machen, hieße den Löser umbauen (eine Matrix für x, y, z).

**Kern:**
- `packages/shape/src/dicht/kantenWinkel.ts` (Test `kantenWinkel.test.ts`): `LoopPunkt.knick` (Grad, nach innen), `knickSoll`
  (gleitet zwischen den Punkten mit Angabe), `knickReihe` (erste Reihe innen an einem eingesetzten Ring: was die Linie umschließt
  = alle Teile der Haut außer dem größten), `knickRahmen`, `knickZiele` (jeder Punkt um die Linie gedreht, Abstand wie beim
  Anlegen; die Reihe geht mit dem Ziel der Linie mit), `knickLoop` (die Reihe als Loop ohne Kette: Proben `ecken: [v, a, b]`,
  `b: [1, 0, 0]`), `knickQuer` (Messung), `knickFuehrungen`.
- `LoopZug` (`loops.ts`): legt mit der Art `kurven` die Führungen an, bindet sie hinter den Loops der Form und rechnet ihre
  Ziele in `schritt` vor jeder Runde neu (dann je Aufruf des Lösers eine Runde). `start` und `lagen` bleiben auf die Loops der
  Form beschränkt. `loopStruktur` rechnet die Führungen mit (sonst passte eine fertige Zerlegung nicht).
- `maulFormen.ts`: Weg „Kante“ (Standard ohne Mittellinie durch beide Lippen): Mundwinkel, Lippen hart, Angaben an beiden Enden
  und am Mundwinkel vom gemessenen Knick in 12 Stufen zu 6 Schritten zum Soll (`knick` 95, `knickWinkel` 70), nach jeder Stufe
  verfeinert, am Ende gesetzt. Die harte Linie wird vorher nicht allein gesetzt (das verzöge die Kugel um 9). Weg „Mittellinie“
  wie in 7.11 (vorhandene Mittellinie durch beide Lippen, oder `weg: 'mitte'`). `ohneMitte` gibt es nicht mehr.

**Fenster (`kurven.ts`):** `?maulWeg=mitte` (zweite Fassung zum Vergleich), Meldung „… trägt ihren Knick selbst“, `kanteSetzen`
löscht mit „Kante aus“ auch `knick`, der Streuwert des Stands enthält `knick`, Prüfhaken `loops()` mit `knick` und
`knickGemessen(id)`. Sichern und Laden behalten die Angabe (`ablage.test.ts`).

**Proben, alle erfüllt:**
- `GPU=1 node scripts/pruefen/form-maul-formen-fenster.mjs <bild>` (Kugel): geformt in 1,6 s, 76 von 78 Bildern mit Bewegung;
  1 586 → 1 733 Punkte; ein Loop; Angaben 95°, 70°, 95°; gemessen 95,0° und 95,0°, Mundwinkel 71,9°; hinter dem Maul 4,4 neben
  der Kugel; umgeschlagen 0; nach einem Zug an der Unterlippe 95,0° und 95,0°; ⌘Z genau wie davor; keine Fehler.
- `GPU=1 NAME="simple_mouth_more simple" node scripts/pruefen/form-maul-formen-form.mjs <bild>`: von 126,8° und 116,4° auf 93,6°
  und 94,6°, Mundwinkel von 43,5° auf 71,9°; 4,5 s; umgeschlagen 0; nach einem Zug am Mundwinkel 93,6° und 94,4°; ⌘Z genau wie
  geladen.
- Kern: `form-kante-winkel.ts` (formt jetzt mit `maulFormen`): drei Netze 92,5° bis 95,1° an den Lippen, 72,3° bis 73,8° am
  Mundwinkel. 158 Tests im Kern, 24 im Fenster, Typen und Lint sauber; Donut-Probe und Verjüngungs-Probe wie vorher.
- Bilder: `docs/progress/editor/schritt6-maul-kante-fenster-2026-11-13.jpg`, `schritt6-maul-kante-florian-vorher-2026-11-13.jpg`,
  `schritt6-maul-kante-florian-nachher-2026-11-13.jpg`.

**Offen:**
- **K macht die Lippen nicht rund:** Nach „Kante aus“ misst die weiche Linie am Knick eine riesige Krümmung, die Rechnung im
  Hintergrund läuft auseinander, das Fenster meldet es und behält die Form (der Knick steht dann noch in der Haut, die Linie
  trägt ihn aber nicht mehr). Erst klären, was „rund“ am Maul heißen soll.
- Der Körper einer Kugel ohne Haltelinien verformt sich über sehr viele Runden langsam weiter (Kern: 14 nach 300 Runden), das
  Maul bleibt (0,9). An seinem Modell bleibt beides.
- Die Angabe lässt sich nicht von Hand setzen. Sie gilt nur an eingesetzten Ringen, nur in der Grundform (in der Pose rechnet
  `HautZiele` ohne Führung).
- Tiefe der Tasche nicht eingestellt. Genau am Mundwinkel liegt innen kein Punkt der Haut.
- Formen dauert an seinem Modell 4,5 s (`&maulRunden=4` halbiert es).
- Etappe 2 (Kieferknochen am geformten Maul, das Maul aus nur einer Linie), danach Schritt 5.

### 7.14 Schritt 6, Etappe 2: Kieferknochen am geformten Maul (13.11., 22:50 Uhr)

Florian: „Dann mache mal Kieferknochen. Bei rundem Maul meine ich nur die Lippe wird abgerundet.“ Gebaut in `form-bau` (5197);
in seinem Fenster (5194) ist davon nichts.

**Kern:**
- `maulGeformtAmLoop(h, l, ecke, opt)` in `packages/shape/src/dicht/maulLoop.ts`: das geformte Maul für die Knochen. Gleiche
  Gestalt wie `maulAmLoop` (`MaulAmLoop`), aber `offen` überall 0, `kantenOffen` leer, kein Inneres. Gewichte: außen das Feld von
  `maulAmLoop` mit `kieferWieLippe` (jeder Kiefer reicht mindestens so weit, wie seine Lippe lang ist: `kieferFeld` mit
  `dickeMin`); innen harmonisch von der Unterlippe (1) zur Oberlippe (0), der Übergang zwischen ¼ und ¾ (nahe einer Lippe dreht
  die Haut ganz mit ihr); außen die ersten drei Reihen neben den Lippen harmonisch zwischen Lippe und Feld; am Ende genau
  spiegelgleich gemacht. `wieVorher` wie bei `maulAmLoop`.
- `LoopZug` führt die erste Reihe einer Linie mit Knick jetzt auch in der Pose (`gedaechtnis`), nicht nur in der Grundform.

**Fenster (`kurven.ts`):** `maulSchnitt` wählt nach `maulGeformt` zwischen `maulGeformtAmLoop` und `maulAmLoop`
(`maulAktuell`). `maulAnlegen` nimmt geformte Ringe an; ein harter Ring ohne die Angabe wird dabei ein geformtes Maul; ein
vorhandener Mundwinkel bleibt. `hautZeigen` schneidet am geformten Maul nichts weg und zeigt kein eingesetztes Inneres
(`maulIstGeformt`); die Statuszeile meldet dort nicht mehr „Loop schneidet nicht“. Prüfhaken `loops()` mit `geformt`.

**Proben:**
- Kern: `form-kiefer-geformt.ts` (`NAME`, `RING`, `KIEFER=20,40`, `AUS`), Tabelle im Plan. Vorher/nachher an „simple_mouth_more
  simple“: 0 → 2 → 6 umgeschlagen und große Flächen von hinten, jetzt 0 → 0 → 0; an „maul handgemacht test“ 8 → 8 → 18, jetzt
  8 → 8 → 8 (der Zacken an der Kieferspitze ist weg).
- Fenster: `GPU=1 [NAME=… RING=…] [ALT=1] node scripts/pruefen/form-kiefer-fenster.mjs <bild>`: Kugel, „simple_mouth_more
  simple“, „maul handgemacht test“ (`RING=14`), und das Maul bisher (`ALT=1`): alles gut. `form-maul-formen-fenster.mjs`
  prüft jetzt, dass „Fressen“ am geformten Maul angeht und nichts wegschneidet.
- 159 Tests im Kern, 24 im Fenster, Typen und Lint sauber, Donut-Probe wie vorher.
- Bilder: `docs/progress/editor/schritt6-kiefer-florian-zu-2026-11-13.jpg`, `schritt6-kiefer-florian-offen-2026-11-13.jpg`,
  `schritt6-kiefer-kugel-offen-2026-11-13.jpg`, `schritt6-kiefer-zwei-kiefer-2026-11-13.jpg`.

**Offen:**
- **Das Maul aus nur einer Linie** (Florian: gefalteter Edgeloop, Lippen aufeinander, geschlossen unsichtbar): nicht gebaut.
  Entwurf und Beweis im Kern stehen in 7.15 (der Vorschlag mit dem Schnitt aus `maul.ts` ist damit ersetzt).
- **Runde Lippen:** „nur die Lippe wird abgerundet“. K an der Maullinie rundet noch nichts (7.13).
- Flache Tasche an der schmalen Form: offen eine gedehnte Wand dicht hinter den Lippen. Tiefe nicht einstellbar.
- Schritt 5 (Pose als Morph mit der Rechnung der Grundform) ist nicht gebaut; in der Pose rechnet `HautZiele`.
- Der Regler schließt nicht über die Grundform hinaus.

### 7.15 Das Maul aus nur einer Linie: Entwurf und Beweis im Kern (13.11., 23:50 Uhr)

Florian: „ok, dann weiter mit dem maul“. **Im Fenster ist nichts gebaut; im Kern ist nichts geändert.** Neu sind nur die Probe
`apps/editor/scripts/pruefen/form-maul-linie.ts`, zwei Bilder und die Messdatei. Der ganze Text mit Tabelle steht im Plan,
Schritt 6, „Das Maul aus nur einer Linie“.

- **Entwurf:** Die eine Linie ist die Oberlippe. Die Unterlippe ist ihr um den Mundwinkel gedrehtes Abbild (20°; Punkte und
  Griffe, „Zwilling“). Beide sind der gefaltete Ring; daraus wird ein geformtes Maul wie bisher. Gerechnet wird immer diese
  leicht geöffnete Lage. Gezeigt wird es zu: Der Kieferknochen dreht um denselben Winkel zurück, die Unterlippe (Gewicht 1) liegt
  dann genau auf der Oberlippe (Gewicht 0). Geschlossen fasst man nur die Oberlippe an, der Zwilling folgt.
- **Aufruf** (aus `packages/shape`, wenige Sekunden):
  `RINGE=-10,70 AUS=<blatt.html> npx vite-node ../../apps/editor/scripts/pruefen/form-maul-linie.ts`, dann
  `node apps/editor/scripts/pruefen/html-shot.mjs --jpg <blatt.html>`. Stellgrößen: `WINKEL0` (20), `DREIECKE` (2000), `AUF` (30),
  `BOGEN` (6), `RINGE` (ohne: die Kugel allein).
- **Hält in jedem Lauf, der sich rechnen lässt:** zu liegen die Lippen aufeinander (vorn 0,00, größter Spalt 0,08 bis 0,32: so
  genau gibt das Netz jede Linie wieder); die Rechnung steht; die Zwillinge bleiben beim Formen genau; um 30° geöffnet sind die
  Lippen vorn 47 auseinander, dahinter eine runde Tasche; mit zwei Haltelinien bleibt der Körper stehen (fern 0,2 bis 0,3).
- **Hält nicht: der Mundwinkel auf dem groben Netz** (2 000 Dreiecke, so groß wie das Rechennetz des Fensters). Auf dem letzten
  Zehntel der Linie ist die Tasche dünner als die Maschen: 0 bis 6 Dreiecke außen umgeschlagen, die Tasche tritt an 0 bis 3
  Stellen durch die Haut, je nach Lauf. Schon in der gerechneten Lage, also eine Schwäche von „Maul formen“ an einer spitzen
  Ecke; auf 6 000 Dreiecken sauber. Unter etwa 16° wird der Keil zu dünn (8° lässt sich nicht einsetzen).
- **Naht außen, zu:** im Mittel 3,2° bis 5,1° Knick; im flach schattierten Bild eine feine Naht und eine kleine Delle am
  Mundwinkel. „Quasi unsichtbar“ entscheidet Florian im Fenster.
- **Nicht geprüft:** mit einer Mittellinie durch das Maul (ihre Kreuzung an der Unterlippe muss mit dem Zwilling gehen; „Maul
  formen“ nimmt dann den Weg über die Mittellinie); an Florians Formen; alles im Fenster.
- **Nicht weiterverfolgt:** das geformte Maul in der Rechnung zudrücken. Die Probe dazu war am Mundwinkel falsch gebaut und ist
  nicht im Repo; sie beweist nichts. Dagegen spricht: Haut läge auf Haut (Knick unter 90°), am gefalteten Mundwinkel hat die
  Linie keine Richtung (`tangente` in `kantenWinkel.ts`), das Verdichten legt die dünne Tasche zusammen.
- **Was der Bau wäre** (nach seinem Wort, im Bau-Fenster): 1. die spitze Ecke am Mundwinkel (Kriterium: auf dem Rechennetz des
  Fensters außen nichts umgeschlagen, nichts tritt durch die Haut; Kugel und „simple_mouth_more simple“); 2. mit F eine offene
  Linie zeichnen (Zwilling anlegen, Maullinie sofort Kante, „Maul formen“ animiert); 3. Regler „Maul“ mit „zu“ bei 0
  (`knochenWinkel` klemmt heute negative Winkel auf 0); 4. Zwillingsregel beim Ziehen, Probe mit Mittellinie; 5. Linie
  ausblendbar, Naht glatt schattiert.
- **Fallen** (auch in `apps/editor/CLAUDE.md`): Der Mundwinkel muss vor `griffeAnlegen` eine Ecke sein; die Maullinie muss von
  Anfang an eine Kante sein (sonst zieht der Keil eine Kugel ohne Haltelinien zusammen); die Zählung „umgeschlagen“ über die
  ganze Haut zählt die zusammengefaltete Tasche mit, deshalb zählt die Probe außen und Tasche getrennt.
- Bilder: `docs/progress/editor/schritt6-maul-linie-2026-11-13.jpg` (2 000 Dreiecke), `schritt6-maul-linie-feines-netz-2026-11-13.jpg`
  (6 000); Zahlen: `schritt6-maul-linie-messung-2026-11-13.txt`.

### 7.16 Das Maul aus nur einer Linie im Bau-Fenster; Florian hält an: Das Maul bekommt ein eigenes System (14.11., 09:20 Uhr)

**Florian am 14.11., mitten in der Prüfung (wörtlich):**

> Ich unterbreche dich hier, da ich alte Muster wiedererkenne. Das Maul formt sich und das ist ok. Meine Sonderwünsche mit dem
> geschlossenen maul in jeder Position und wie sich die mundhöle formen soll ist ok, aber noch nicht gut. Das braucht noch sehr viel
> polishing. Dazu brauchst du genauere beschreibungen für die verschiedenen fälle sonst läuft es zu unendlichen testreihen. Ein wesen
> ohne jede kurve das ein maul bekommt ist ein edgcase. Geschlossene münder müssen gehen, können wenn das technisch besser ist aber
> auch später eingebaut werden. Sag mir mal wo wir in dieser session aktuell stehen. Wir haben wieder zwischenschritte eingebaut und
> punkte vor und zurückgestellt im plan. Zur info. Das Maul mit der feste eingeklappten wulst ist nicht was ich erwarte. wenn ich
> nachträglich linien durchs maul ziehe stören diese festen wulsten...Es gilt also zu überlegen was eine saubereere lösung wäre. Auch
> wenn ich ein maul über eine vorhanden kreuzung lege muss ich erst mit handarbeit die kreuzungspunkte zurechtlegen. Das ist noch
> nicht gut. Da die kreuzungspunkte gelöscht bzw automatisch optimal in die maultasche wandern müssen. Das braucht alles ein eigenes
> system und definition. Der weg stimmt schonmal, aber das sollten wir in einer eigenen großen session angehen.

**Was daraus folgt** (die Lesart der bauenden Sitzung; mit ihm abstimmen, bevor gebaut wird):

- Am Maul wird nichts weitergebaut und nichts weiter vermessen, bis seine Fälle beschrieben sind. Die Maul-Sitzung beginnt mit der
  Beschreibung (er beschreibt, die Sitzung fragt nach und schreibt mit), dann je Fall eine Probe an seiner Form.
- Maßstab sind Formen mit Linien. Eine Form ohne jede Linie, die ein Maul bekommt, ist ein Randfall. Dieser Block hat den größten
  Teil seiner Zeit in genau diesem Randfall verbracht (siehe „Wie der Block lief“).
- „Fest eingeklappte Wulst“ meint nach dieser Lesart das geformte Maul der dritten Fassung (7.13): die Maullinie als harte Kante
  mit 95° an den Lippen und 70° am Mundwinkel, die Tasche dahinter als Haut. Linien, die er danach durchs Maul zieht, stoßen an
  diese Wulst. Gesucht ist eine sauberere Lösung, keine Nachbesserung der Winkel.
- Kreuzungen unter einem Maul sollen von selbst verschwinden oder an die beste Stelle in der Tasche wandern. Heute legt er sie von
  Hand zurecht.
- Geschlossene Mäuler müssen gehen, dürfen aber später kommen, wenn das technisch besser ist.
- „Der Weg stimmt schonmal“: Die Richtung (das Maul formt sich aus seiner Linie, die Tasche ist Haut) bleibt.

**Was im Bau-Fenster steht** (Port 5197, Zweig `claude/form-bau`: `a500a7b5`, `86c421b6`, `effe1f24`; in seinem Fenster nichts):
Mit F ein offener Strich (Seite: von vor dem Umriss zum Mundwinkel; Front oder Top: über die Mitte) wird ein Maul aus einer Linie.
Die Linie ist die Oberlippe, die Unterlippe ihr um 20° um den Mundwinkel gedrehtes Abbild; es formt sich gleich, animiert, über
„Maul formen“ in dritter Fassung. Gerechnet wird die leicht geöffnete Lage. „Fressen“ mit dem Regler „Maul“ ganz links zeigt es
zu, nach rechts öffnet es. In der Grundform zieht ein Punkt einer Lippe seinen Zwilling mit; Doppelklick legt Punkt und Zwilling
an; ⌘Z nimmt Linie und Maul zusammen zurück. In der Pose wird die Maullinie nicht gezogen.

**Was hält** (gemessen an der Kugel ohne weitere Linien, Rechennetz des Fensters; Bilder
[`gerechnet`](progress/editor/schritt6-maul-linie-fenster-gerechnet-2026-11-14.jpg),
[`zu`](progress/editor/schritt6-maul-linie-fenster-zu-2026-11-14.jpg)):

| | Strich in der Seite | Strich in der Front |
| --- | --- | --- |
| Formen | 1,5 s, animiert | 1,5 s |
| Lippen als Abbilder | Abweichung 0 | 0 |
| Knick gemessen | 93,3° und 94,6° an den Lippen, 73,8° am Mundwinkel | 95,0° und 94,0°, 81,8° |
| umgeschlagen (außen und Tasche gemischt gezählt) | 0 | 0 |
| fern vom Maul (hintere Hälfte, Abstand von der Mitte) | 150,0 bis 150,2 → 150,1 bis 150,2 | ebenso |
| „Fressen“, Regler ganz links | vorn 0,00, größter Spalt 0,22 | 0,00 und 0,15 |
| Regler 30° und 55° | Lippen vorn 48,7 und 86,9 auseinander | |
| an der Oberlippe und am Mundwinkel gezogen | die Unterlippe geht mit, danach zu: Spalt 0,30 und 0,32 | nicht geprüft |

Fenster-Probe `form-maul-linie-fenster.mjs`: 24 Punkte in der Seite, alle erfüllt; Front alle erfüllt. Kern-Probe
`form-maul-linie.ts`: 12 Läufe (2 000, 3 000, 6 000 Dreiecke; 8° bis 24°; mit und ohne Haltelinien), 11 erfüllen alle vier
Punkte ([Messwerte](progress/editor/schritt6-maul-linie-messung-2026-11-14.txt)). 169 Tests im Kern, 24 im Editor; die bisherigen
Maul-Proben (`form-maul-formen-fenster`, `form-maul-formen-form`, `form-kiefer-fenster` an der Kugel und an
„simple_mouth_more simple“) melden „alles gut“. Heute nicht neu gelaufen: `form-donut-fenster`, `form-kante-verjuengung-fenster`.

**Was nicht hält:**

1. **Linien, die das Maul kreuzen (so sind seine Formen).** An „test_kaputt“ (Strich in der Seite von −178/−60 nach −55/−52):
   Das Maul formt sich in 1,1 s, die Form bleibt ([Bild](progress/editor/schritt6-maul-linie-test_kaputt-geformt-2026-11-14.jpg)).
   Aber die Mittellinie bekommt an der Unterlippe zwei Punkte am selben Ort, der Loop auf einer Seite bekommt nur an der Unterlippe
   eine Kreuzung, und die Maullinie hat 6 statt 7 Punkte: Die Lippen sind nicht mehr gepaart. Zu liegen sie vorn 2,63 auseinander
   (größter Spalt 2,84), an den Kreuzungen stehen dunkle Keile, und der untere Umriss der Form geht in der Pose sichtbar mit dem
   Kiefer mit ([Bild](progress/editor/schritt6-maul-linie-test_kaputt-zu-2026-11-14.jpg); die Bewegung des Umrisses ist nicht
   gemessen). Ursache der fehlenden Kreuzung: Die Suche hält einen Fund für schon vorhanden, wenn ein Kreuzungspunkt desselben
   Linienpaars näher als zwei mittlere Kanten liegt; die Lippen liegen enger beieinander.
2. **Eine Mittellinie ohne eigene Punkte verliert ihre Form**, sobald ein Maul sie kreuzt
   ([Bild](progress/editor/schritt6-maul-linie-mittellinie-ohne-punkte-2026-11-14.jpg)): Abstand der hinteren Hälfte von der Mitte
   150 → 49 bis 205. Das ist kein Fehler des neuen Mauls, sondern des Editors: Mit dem bisherigen Maul aus zwei Linien geschieht
   dasselbe (150 → 50 bis 170). Ein geschlossener Loop bekommt mit seinen ersten zwei Punkten einen Pfad aus zwei Kurvenstücken,
   auch wenn die seinen Verlauf nicht beschreiben. Hat die Mittellinie nur zwei Punkte aus einem Ring, bricht das Maul aus einer
   Linie ab („die Mittellinie hat an einer Lippe keinen Griff nach außen“). Seine Formen haben Mittellinien mit 4 bis 38 Punkten.
3. **Feines Netz (`&netz=dicht`):** Das Formen lief bei 4 900 Punkten in der letzten Stufe davon (ein Punkt der Rückwand der
   Tasche; die Ursache ist nicht gefunden). Jetzt setzt es dann mit halb so großen Stufen neu an und kommt durch, braucht aber
   21 s, und man sieht den ersten Versuch ausbrechen.
4. **Kern, Kugel allein, 8°:** geöffnet zählen in der Tasche 4 Dreiecke als umgeschlagen statt 2 (das Fenster rechnet immer 20°).
5. **Nicht gebaut:** Bearbeiten im geschlossenen Zustand (gehört zu Schritt 5), die Linie ausblenden und die Naht glätten („quasi
   unsichtbar“).

Die Einzelheiten zum Code und alle Fallen stehen in `apps/editor/CLAUDE.md` („Maul aus nur einer Linie“ und die Fallen ab „Eine
schmale Form als einzige runde Linie“).

**Wie der Block lief** (damit die nächste Sitzung es anders macht): Geprüft wurde zuerst und am längsten an der Kugel ohne Linien
(die Spitze am Mundwinkel, das Aufblasen der Kugel, das feine Netz). Seine Formen mit Linien kamen erst am Ende dran, und dort
liegen die eigentlichen Fragen. Aus einer Probe je Schritt wurden Reihen (zwölf Läufe im Kern, vier Varianten im Fenster).
Die Regel für die Maul-Sitzung: zuerst an seiner Form mit Linien, je Fall eine Probe, die vorher mit ihm beschrieben ist.

**Fragen für die Beschreibung des Maul-Systems** (Vorschlag der bauenden Sitzung; er ergänzt und entscheidet):

1. Die Lippe: Wie geht die Haut von außen in die Tasche über, wenn nicht als fest eingeklappte Wulst? Was bestimmt, wie rund sie
   ist?
2. Linien durchs Maul: Was tut eine Linie, die er nachträglich durchs Maul zieht (in die Tasche laufen, über die Öffnung springen,
   an der Lippe enden)? Gilt für die Mittellinie dasselbe wie für jede andere?
3. Kreuzungen unter einem neuen Maul: Wann werden sie gelöscht, wann wandern sie in die Tasche, und wohin dort?
4. Grundform: Ist das Maul in der Grundform zu oder leicht offen? Heute wird es 20° offen gerechnet, „zu“ dreht der Kieferknochen;
   dabei bewegt sich die Form unter dem Maul mit, sie ist zu also nicht genau die Form von vor dem Strich.
5. Geschlossen: Was heißt „quasi unsichtbar“ (keine Linie, glatte Naht)? Was lässt sich im geschlossenen Zustand ziehen?
6. Die Tasche: wie tief, welche Form, wovon hängt das ab? Der Mundwinkel: spitz oder rund?
7. Der Kiefer: Welcher Teil der Form geht beim Öffnen mit?
8. Welche seiner Formen sind die Fälle, an denen geprüft wird?

### 7.17 Neue Reihenfolge und der Zwischenschritt „Abzweigungen“ (14.11., 10:20 Uhr)

**Florian am 14.11. (wörtlich):**

> Deine Urteile zu 1, 2, 4a und 4b....das sieht gut aus bis jetzt
>
> Dann lass uns einen zwischenschritt einbauen, den wir auch fürs maul später gut nutzen können.
>
> Aktuell kann ch mit dem werkzeug p nicht direkt von vorhandenenlinien weiterziehen. Ich will zum beispiel bei einem edgeloop mit
> 4 punkten (z.B. kreis), die gegenüberliegenden punkte verbinden können, indem ich mit p von einem punkt zum anderen ziehe. Wenn
> ich das bei beiden paaren mache ergibt sich dadurch ein kreuz mit einem punkt in der kreuzung, die ich sehr exakt formen
> kann...z.B zu einem horn.
> Damit kann ich z.B. auch 2 mundwinkel verbinden und so die tiefe der maultasche bearbeiten wenn da noch kein loop läuft. Also
> grundsätzlich soll man von jeder linie und von jedem punkt aus eine verbundene abzweigung erstellen können. So reduzieren sich
> auch die doppelten punkte an engen stellen, da ich so genau arbeiten kann und punkte mehrfach verwenden kann.
>
> Dann machen wir erst schritt 5, dann 4c.
>
> Das Maul bekommt dann eine eigene session, vllt zusammen mit Zähnen und auch an der selktion wie bei blender können wir dann
> eher später arbeiten. Ich bin noch nicht sicher obe es das braucht und wie genau das umgesetzt werden kann.

**Was daraus folgt:**

- Zu Schritt 1, 2, 4a und 4b: „das sieht gut aus bis jetzt“. Das ist kein Abschluss, aber sein Urteil bisher.
- Reihenfolge: Zwischenschritt „Abzweigungen“, dann Schritt 5 (Posen), dann 4c (Rest der halben Haut).
- Das Maul bekommt eine eigene Sitzung, vielleicht zusammen mit Zähnen (7.16). Schritt 7 (Auswahl) kommt später; ob es das
  braucht und wie, ist offen.

**Der Zwischenschritt** steht mit Struktur, Fällen und Etappen im Plan („Zwischenschritt (14.11.): Abzweigungen“, vor Schritt 5).
Kurz: Es gibt offene Linien; jedes Ende liegt auf der Mitte (wie heute beim Ring) oder hängt an einem Punkt einer anderen Linie
und teilt ihn mit ihr. Mit P zieht man sie von einem Punkt oder einer Linie zu einem Punkt oder einer Linie, direkt (kürzester
Weg über die Haut) oder mit Punkten dazwischen. Offen ist nur, ob eine Abzweigung auch frei auf der Haut enden darf.

**Nachgelesen dafür (Code, nichts gemessen):** `stiftFertig` in `kurven.ts` verlangt mindestens drei Anker und legt die
geschlossene Form mit `formAusZeichnung` auf die Haut. `Loop.art` ist `mitte`, `ring` oder `paar`; offen ist nur der Ring, und
sein Ende gilt überall als Spiegelpunkt (`ringEnde`, z = 0). Rund 170 Stellen in Kern und Fenster fragen nach der Art einer
Linie. `loopEinsetzen` hat für Mitte, Ring und Paar je einen eigenen Weg; die gemeinsamen Teile (`einsetzen(proben)`: Weg über
die Kanten von Probe zu Probe) lassen sich für eine Kette von Punkt zu Punkt nutzen.

**Etappe 1, der kleine Beweis im Kern (14.11., 10:30 Uhr): hält.** Probe `apps/editor/scripts/pruefen/form-abzweigung.ts`
(Aufruf aus `packages/shape`; `AUS=<datei.html>` schreibt das Blatt, `KANTE=1` macht den Kreis zur Kante), Bild
[`zwischenschritt-abzweigung-2026-11-14.jpg`](progress/editor/zwischenschritt-abzweigung-2026-11-14.jpg), Messwerte daneben,
Tabelle im Plan. Kugel mit drei Linien und einem Kreis mit vier Punkten: Die zwei Abzweigungen von Punkt zu gegenüberliegendem
Punkt lassen sich einsetzen und teilen die Punkte des Kreises; in ihrer Kreuzung liegt ein gemeinsamer Punkt; um 90 herausgezogen
entsteht ein Horn entlang der vier Linienstücke (die Haut steht, umgeschlagen 0, Spitze 0,00 neben dem Ziel); der Kreis bewegt
sich nicht. Die Haut außerhalb geht bei rundem Kreis bis 4,0 mit, mit dem Kreis als Kante gar nicht.

Gebaut dafür, nur auf `claude/form-bau`: `Loop.haengt` und `endeAufMitte` (`loops.ts`), `abzweigen` (`einsetzen.ts`),
`abzweigung.test.ts`. Für alle bisherigen Linien ändert sich nichts (169 Tests im Kern, 24 im Editor, `form-donut-fenster` und
`form-maul-formen-fenster` „alles gut“). Was noch fehlt und welche Stellen noch nicht durchgesehen sind: `apps/editor/CLAUDE.md`
(„Abzweigungen“ und die Falle „Ein offenes Ende liegt …“).

**Als Nächstes, nach seinem Wort:** Etappe 2 (offene Linien überall im Kern: Verdichten, Löschen, Sichern und Laden, das Ende auf
der Mitte, Start und Ende auf einer Linie ohne Punkt), dann Etappe 3 (P im Bau-Fenster nach den Fällen 1 bis 8). Offen ist seine
Antwort, ob eine Abzweigung auch frei auf der Haut enden darf.

**Etappe 2 und 3 (14.11., bis 11:05 Uhr): im Bau-Fenster gebaut, bis auf Fall 4.** Florian: „Ja, so bauen“ (eine Abzweigung
endet immer an einem Punkt, auf einer Linie oder auf der Mitte). Tabelle der Probe und die drei Dinge, die beim Bauen dazukamen
(Punkte dazwischen nur, wo nötig; vorhandene Punkte werden mitbenutzt; der kürzere Weg), stehen im Plan. Bilder aus dem
Bau-Fenster an „test_kaputt“: [Kreuz](progress/editor/zwischenschritt-abzweigung-fenster-kreuz-2026-11-14.jpg),
[Horn](progress/editor/zwischenschritt-abzweigung-fenster-horn-2026-11-14.jpg),
[zur Mitte](progress/editor/zwischenschritt-abzweigung-fenster-zur-mitte-2026-11-14.jpg).

- **Bedienung:** P wählen, auf einem Punkt oder einer Linie drücken, zu einem anderen Punkt oder einer anderen Linie ziehen,
  loslassen. Auf einer Linie ohne Punkt entsteht dort einer. Im Blatt Front oder Top vom Punkt auf das Spiegelbild seiner Linie
  gezogen: Die Linie endet auf der Mitte. Beginnt der Strich nicht auf einem Punkt oder einer Linie, zeichnet P wie bisher eine
  geschlossene Form.
- **Löschen:** Die Abzweigung löschen lässt die Punkte der anderen Linie stehen. Ein Punkt, an dem eine Abzweigung hängt, bleibt.
  Eine Linie, an der Abzweigungen hängen, lässt sich nur zusammen mit ihnen löschen (neu festgelegt; Florian kann es ändern).
- **Geprüft:** `GPU=1 node scripts/pruefen/form-abzweigung-fenster.mjs` (aus `apps/editor`; 19 Punkte an „test_kaputt“), 174 Tests
  im Kern, 24 im Editor, Typen, Lint; `form-donut-fenster`, `form-maul-formen-fenster`, `form-kiefer-fenster`,
  `form-maul-linie-fenster` wie vorher.
- **Nicht gebaut:** Fall 4 (Punkte dazwischen beim Zeichnen). **Nicht geprüft:** in der Pose, über die Mitte gezogen, Knick an
  einer Abzweigung, seine anderen Formen, das feine Netz.
- **Code:** `packages/shape/src/dicht/einsetzen.ts` (`abzweigen`), `loops.ts` (`haengt`, `endeAufMitte`), `richtung.ts`;
  `apps/editor/src/form/kurven.ts` (Abschnitt „Abzweigung mit P“, `loeschen`, `punktAufLinie`). Einzelheiten und Fallen:
  `apps/editor/CLAUDE.md`.

## 8. Offen aus der Zeit davor

Florians Blick auf G4, auf Sichern und Laden und auf G5 Teil 1 steht aus. Die offenen Entscheidungen der alten Übergabe
(Abschnitt 5 dort: „Punkte wo nötig“, weich überblenden beim Einwechseln, Linie kehrt um, Vorsicht und Schutz) erledigen sich
zum Teil mit den Schritten 2 bis 4 und werden dort wieder aufgegriffen, nicht vorher.
