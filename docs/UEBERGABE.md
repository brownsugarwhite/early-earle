# Übergabe (Stand 12.11.2026 abends: Schritt 1 „glatte Anzeige“ ist im Bau-Zweig eingebaut, Schalter `&anzeige=glatt`; Florians Blick steht aus, sein Fenster ist unverändert)

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
| 1 Glatte Anzeige | **eingebaut in `form-bau` hinter `&anzeige=glatt`** (Abschnitt 4); Florians Blick und sein Ja zum Zusammenführen stehen aus |
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

## 4. Schritt 1, glatte Anzeige: gebaut, gemessen, was offen ist

**Florian am 12.11.: „Spalte 3 einbauen“** (aus dem Vergleichsbild `docs/progress/editor/anzeige-vergleich-…-2026-11-12.jpg`:
gekrümmte Dreiecke, ruhig schattiert). Gebaut im Arbeitsbaum `form-bau` (Zweig `claude/form-bau`), zu sehen unter
`http://localhost:5197/kurven.html?gewichte=geometrie&anzeige=glatt` (Server `kurven-bau`). Ohne den Schalter ist alles wie vorher.

**Was der Schalter tut** (nur Anzeige, die Rechnung ist unverändert):
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

**Bilder** (`docs/progress/editor/`, je links wie heute, rechts mit Schalter): `anzeige-fenster-strange-bird-2026-11-12.jpg`,
`anzeige-fenster-strange-bird-nah-2026-11-12.jpg` (Front bei 260 %), `anzeige-fenster-teat-firefish-2026-11-12.jpg`,
`anzeige-fenster-test_kaputt-2026-11-12.jpg`, `anzeige-fenster-ueber-die-mitte-2026-11-12.jpg` (Punkt über die Mitte gezogen: der
Lochrand).

**Gemessen** (ohne Bildschirm, „strange bird“, 16 010 Punkte, derselbe Zug; Zeiten nur als Verhältnisse lesen):
- Abstand der Bilder im Zug: Median 21 ms wie heute, 23 ms mit Schalter (keine Stufe: 2,6 ms je Bild, Linienbänder 0,5 ms). Mit
  einer Stufe wären es 26 ms (4,2 ms und 2,0 ms für die Bänder auf dem Pfad). Die Löserrunde kostet 17,5 ms: Sie bestimmt das
  Tempo, nicht die Anzeige. Das ändert erst Schritt 2.
- Zeichnen aller vier Felder: 8 ms wie heute; mit Schalter 7 ms ohne Stufe, 9 ms mit einer, 12 ms mit zweien (512 000
  Dreiecke). Ein Blatt kostet rund 1 ms, der feste Teil je Bild rund 5 ms.
- Nach dem Loslassen: einmal ein Bild von bis zu 57 ms, wenn die Stufen der Ruhe angelegt werden (heute 31 ms).
- Rechnung allein, 16 386 Punkte: 2,4 ms ohne Stufe, 3,3 ms mit einer, 7,0 ms mit zweien.

**Geprüft:** Maul-Probe mit Schalter (`form-maul-loop.mjs`): keine offenen Kanten, ⌘Z genau, keine Fehler. Tests:
`apps/editor/src/form/glattPlan.test.ts` (schnelle Rechnung gegen die Fassung des Vergleichsbilds; Normalen an einer Kugel mit
ungleichmäßigem Netz und an einem Grat), `packages/shape/src/dicht/linieAufPfad.test.ts` (Pfadstücke je Kante). Neue Proben in
`apps/editor/scripts/pruefen/`: `anzeige-vorher-nachher.mjs`, `bilder-nebeneinander.mjs`, `anzeige-zeichnen-zeit.mjs`;
`form-gesichert-zug.mjs` nennt mit Schalter die Kosten der Anzeige je Bild.

**Offen in Schritt 1:**
1. **Florians Blick** (Port 5197 mit Schalter, oder die Bilder). Mit seinem Ja: Zusammenführen nach `claude/form-spiegel` (sein
   Fenster auf 5194 lädt neu, vorher ansagen) und den Schalter zum Standard machen.
2. Strahltreffer (Zeichnen, Greifen) gegen die feine Fläche: auf Schritt 2 verschoben. Bei den heutigen Punktzahlen liegt die
   grobe Fläche nur Bruchteile einer Einheit neben der feinen.
3. Das Innere des Mauls hat dieselbe geglättete Farbstufe, wird aber nicht verfeinert.
4. Nicht Sache der Anzeige: Wo die gerechnete Haut selbst wellig ist (kleine Knicke an den Linien, fast ebene Flächen), laufen
   die Farbstufen ruhig, aber in Wellen. Das ist Schritt 3.

**Nächster Schritt:** Schritt 2 „kleines Rechennetz“ (Plan, Anhang A.2). Dort prüfen, ob es das Beruhigen der Normalen noch
braucht (die Punkte liegen dann auf der gerechneten Fläche), und die Stufen im Zug neu festlegen.

## 5. Offen aus der Zeit davor

Florians Blick auf G4, auf Sichern und Laden und auf G5 Teil 1 steht aus. Die offenen Entscheidungen der alten Übergabe
(Abschnitt 5 dort: „Punkte wo nötig“, weich überblenden beim Einwechseln, Linie kehrt um, Vorsicht und Schutz) erledigen sich
zum Teil mit den Schritten 2 bis 4 und werden dort wieder aufgegriffen, nicht vorher.
