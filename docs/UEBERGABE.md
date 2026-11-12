# Übergabe (Stand 12.11.2026: Plan „schnell, glatt, exakt“ freigegeben, Schritt 0 erledigt, Schritt 1 beginnt)

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
| 1 Glatte Anzeige | **begonnen:** zuerst das Vergleichsbild (heute, gekrümmte Dreiecke, Unterteilung) an „strange bird“ |
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

## 4. Nächster Schritt: Schritt 1, glatte Anzeige

1. **Vergleichsbild** (vor jedem Einbau): „strange bird“ bei 300 % und 800 %, nebeneinander heute, gekrümmte Dreiecke im
   Shader und Unterteilung, jeweils mit geglätteter Farbstufe. Bauarten und Einzelheiten: Plan, Anhang A.1. Florians Auge
   entscheidet, welche eingebaut wird.
2. Einbau in `kurven.ts` hinter einem Schalter; Linienkanten tragen das exakte Stück des Bézier-Pfads, „Kante an“ bleibt
   scharf, an der Spiegelebene wird je Bildpunkt geschnitten, das Maul-Innere läuft durch dieselbe Anzeige.
3. Probe: ein Bild vorher und nachher an seinen drei Formen, einmal der Abstand der Bilder im Zug. Dabei einmal messen, was
   die drei Blätter und die Linienbänder je Bild kosten.

## 5. Offen aus der Zeit davor

Florians Blick auf G4, auf Sichern und Laden und auf G5 Teil 1 steht aus. Die offenen Entscheidungen der alten Übergabe
(Abschnitt 5 dort: „Punkte wo nötig“, weich überblenden beim Einwechseln, Linie kehrt um, Vorsicht und Schutz) erledigen sich
zum Teil mit den Schritten 2 bis 4 und werden dort wieder aufgegriffen, nicht vorher.
