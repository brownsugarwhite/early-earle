# Übergabe (Stand 12.11.2026 nachmittags: Plan „schnell, glatt, exakt“ freigegeben, Schritt 0 erledigt, Schritt 1: Vergleichsbild liegt vor, Florians Wahl der Bauart steht aus)

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
| 1 Glatte Anzeige | **Vergleichsbild fertig, Wahl der Bauart bei Florian** (Abschnitt 4); eingebaut ist noch nichts |
| 2 Kleines Rechennetz | offen |
| 3 Beweis „Haut direkt aus den Linien“ | offen |
| 4 Echte Spiegelung und neue Rechnung ins Fenster | offen |
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
- **Gebaut wird in `.claude/worktrees/form-bau`** (Port 5197). Ein fertiger Schritt kommt erst nach Florians Blick per Merge
  nach `claude/form-spiegel`; das lädt sein Fenster neu, also vorher ansagen.
- **Zweige zusammenhalten:** Die Design-Sitzung committet Doku im Hauptordner auf `claude/editor-grundlayout` und Code in
  `form-alt` auf `claude/form-spiegel`. Am Ende eines Schritts in `form-alt` `git merge claude/editor-grundlayout` (nur Doku),
  danach im Hauptordner `git merge --ff-only claude/form-spiegel`.

## 4. Schritt 1, glatte Anzeige: Stand und nächster Schritt

**Vergleichsbild (12.11.), „strange bird“, vier Fassungen nebeneinander:**
`docs/progress/editor/anzeige-vergleich-ganz-2026-11-12.jpg` (ganze Form und 144 %),
`…-300-2026-11-12.jpg` (Kopf und Ohr bei 300 %), `…-800-2026-11-12.jpg` (Farbstufe und Ohrkante bei 800 %).

| Fassung | Befund |
| --- | --- |
| heute | Farbstufen eckig (je Dreieck gerade) und ohne Kantenglättung |
| heute, nur die Farbstufe geglättet | weiche Kante, aber dieselben Ecken: Die Kantenglättung allein reicht nicht |
| **gekrümmte Dreiecke, ruhig schattiert** (Empfehlung) | Form geht durch alle Rechenpunkte, Linien exakt auf dem Pfad, nichts schwingt über; Farbstufen so ruhig wie bei der Unterteilung |
| unterteilt (Loop, zwei Stufen, mit Versatz) | Farbstufen ruhig; an scharfen Graten (Ohrkante) wölbt die Fläche über die Linie (Kontur wird dick und wellig, die Linie verschwindet) |

- **Die empfohlene Fassung im Einzelnen** (`apps/editor/src/form/glatt.ts`): Lagen = zweimal ohne Glätten verfeinern
  (`verfeinernGekruemmt`: neuer Punkt in der Mitte der gewölbten Kante, auf Linien in der Mitte des Pfadstücks); Normalen = die
  der gewöhnlichen Unterteilung desselben Netzes ohne Versatz (`unterteilen` und `netzNormalen`). Beide Verfeinerungen zählen ihre
  Punkte gleich, die Normalen passen Punkt für Punkt. Kanten der Haut auf Linien tragen ihr Stück des Bézier-Pfads
  (`pfadKanten` im Kern, `anzeigeNetz`); harte Linien sind aufgetrennt (je Seite eigene Normale).
- **Verworfen (gesehen, nicht nur gerechnet):** gekrümmte Dreiecke mit den Normalen von heute oder mit beruhigten Normalen je
  Rechenpunkt (kleine Wellen an jeder Dreieckskante, auch nach zweimaligem Verfeinern); Unterteilung mit freien weichen Linien
  (Pfad bis 0,8 Einheiten neben der Fläche, an Graten Wellen in der Kontur).
- **Was die glatte Anzeige nicht behebt:** Die Farbstufen laufen ruhig, aber noch in Wellen. Die kommen aus der gerechneten Haut
  selbst (kleine Knicke an den Linien, fast ebene Flächen). Das ist Sache von Schritt 3.
- **Gemessen an „strange bird“** (16 010 Punkte, 2 004 Kanten auf Linien): Die Punkte der Haut liegen auf den Linien genau auf
  dem Pfad (0,000 Einheiten). Rechenzeit der Probe, noch ohne jede Vorarbeit je Netz: Netz der Anzeige 11 ms, beide
  Verfeinerungen zusammen rund 380 ms. Für das Fenster heißt das: bei den heutigen Punktzahlen eine Stufe, zwei Stufen erst mit
  dem kleinen Rechennetz (Schritt 2), und die Zuordnung der Kanten einmal je Netz statt je Bild.
- **Die Testseite:** `http://localhost:5197/anzeige.html?name=strange%20bird` (Server `kurven-bau`); Schalter stehen im Kopf von
  `apps/editor/src/form/anzeigeProbe.ts`. Bilder: aus `apps/editor`
  `node scripts/pruefen/anzeige-bild.mjs <ziel.jpg> 'name=strange%20bird&z1=2.7&m1=-330,40,80&z2=2.7&m2=-60,300,40&info=0'`.

**Nächster Schritt (nach Florians Wahl):** Einbau in `kurven.ts` hinter einem Schalter, im Arbeitsbaum `form-bau`:
1. Netz der Anzeige und die Zuordnung der Verfeinerung einmal je Netzstand (nach `teilungNeu`), Lagen und Normalen je Bild.
2. Die geglättete Farbstufe statt `MeshToonMaterial` mit harter Schwelle; Umriss und Maul-Inneres auf derselben Geometrie.
3. An der Spiegelebene je Bildpunkt schneiden (Schnittebene des Materials) statt `anzeigeZ`.
4. Strahltreffer (Zeichnen, Greifen) gegen die feine Fläche.
5. Probe: ein Bild vorher und nachher an seinen drei Formen, einmal der Abstand der Bilder im Zug; dabei einmal messen, was die
   drei Blätter und die Linienbänder je Bild kosten.

## 5. Offen aus der Zeit davor

Florians Blick auf G4, auf Sichern und Laden und auf G5 Teil 1 steht aus. Die offenen Entscheidungen der alten Übergabe
(Abschnitt 5 dort: „Punkte wo nötig“, weich überblenden beim Einwechseln, Linie kehrt um, Vorsicht und Schutz) erledigen sich
zum Teil mit den Schritten 2 bis 4 und werden dort wieder aufgegriffen, nicht vorher.
