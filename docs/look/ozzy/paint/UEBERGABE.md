# Übergabe: Paint-Modus in Ozzy (Stand 19.11.2026, 17:05 Uhr)

Florian will in Ozzy einen Paint-Modus mit Ebenen, einer Ebenen-Ansicht und einem neuen Material (sein Auftrag wörtlich im Plan).
Das Maul kommt später in einer eigenen Sitzung. Diese Übergabe wird am Ende jedes Blocks überschrieben.

## 1. Einstieg

| Was | Wo |
| --- | --- |
| Zweig, Arbeitsbaum | `claude/reverent-feynman-1efdd3`, `.claude/worktrees/reverent-feynman-1efdd3`. Baut auf dem Zweig der Objekte auf (`claude/ozzy-donut-mirror-system-7a31b7`, Stand `3a091f14`). **Nicht zusammengeführt**, weder mit ihm noch mit `claude/ozzy` noch mit `main`; erst auf sein Wort, am Schluss. |
| Fenster | `http://localhost:5215/ozzy.html`, Eintrag `ozzy-paint` in `.claude/launch.json`. Proben: `OZZY_URL=http://localhost:5215/ozzy.html`. Nie unter seinen Fenstern bauen (5205, 5211, 5194). |
| Plan | [`docs/plans/2026-11-19-ozzy-paint-modus.md`](../../../plans/2026-11-19-ozzy-paint-modus.md): Auftrag, seine Antworten, Etappen mit Kriterien, Bauweise (Abschnitt 7), Etappe 1 (Abschnitt 9), Schritte der Etappe 2 (Abschnitt 10), Etappe 2 mit Messwerten und Lücken (Abschnitt 11), Etappe 3, erster Schritt: die Farbe läuft ein (Abschnitt 12), Etappe 3, zweiter Schritt: Farben als Tropfen, Farbtropfen, Pipette (Abschnitt 13), **Abschnitt 14: Etappe 4, das Bild der Bedienung in zwei Fassungen** |
| Recherche | [`docs/research/2026-11-19-zbrush-grundmaterial.md`](../../../research/2026-11-19-zbrush-grundmaterial.md) |
| Seine Vorlagen | [`2026-11-19-zbrush-matcap-red-wax.png`](2026-11-19-zbrush-matcap-red-wax.png), [`2026-11-19-zbrush-red-wax-vierecke.webp`](2026-11-19-zbrush-red-wax-vierecke.webp) |
| Bilder und Filme | `docs/progress/ozzy/2026-11-19-paint-etappe-4-bedienung-bogen.jpg` (zusammengesetzt, nicht gebaut); `…-paint-etappe-3-farben-bogen.jpg`, `…-paint-etappe-3-farben.mp4` (an „strange bird“); `…-paint-etappe-3-bogen.jpg`, `…-paint-etappe-3-tinte.mp4`, `…-paint-etappe-3-honig.mp4`; `…-paint-etappe-2-bogen.jpg`, `…-paint-etappe-2.mp4` (an „strange bird“); `…-paint-etappe-1-bogen.jpg`, `…-paint-etappe-1.mp4`; davor `…-wachs-vergleich.png`, `…-wachs-strange-bird.png`, `…-dreiecke-zeigen.png`, `…-ebenen-ansicht-skizze.png` |

## 2. Stand

| Etappe | Stand |
| --- | --- |
| 0 Material „Wachs“ | gebaut. Sein Wort: Farbton „-40 sieht gut aus“. |
| Schalter „Dreiecke zeigen“ | gebaut auf seinen Wunsch (Menü, `?facetten=1`). Sein Urteil steht aus. |
| 1 Der Beweis | gebaut (19.11.). Vier von fünf Kriterien halten; die Bemalung kriecht bei weiten Zügen an der Form (Plan 9.3). Sein Wort danach: „Etappe 2 starten“. |
| 2 Farblinien bedienen wie Linien | gebaut (19.11.). P direkt auf der Form, Punkte und Richtungen mit A, offen und gekreuzt, die Mitte. Beide Proben halten, an der Kugel und an „strange bird“. Was fehlt: Plan 11.4. Sein Wort danach: „Etappe 3 starten“ (kein Urteil in Worten). |
| **3 Füllen mit dem Farbtropfen** | **gebaut (19.11.), sein Urteil steht aus.** Erster Schritt: Die Farbe läuft ein; sein Wort dazu: „Tinte“ (eingestellt; „Honig“ bleibt über `?fuellen=honig`). Zweiter Schritt: Farben als Tropfen unter der Leiste (antippen, ziehen und fallen lassen, Plus, Mülleimer), Farbtropfen (F), Pipette (I). Ihm vorgelegt mit Bildblatt und Film an „strange bird“. Was fehlt: Plan 13.4. Sein Wort danach: „Etappe 4 starten“ (kein Urteil in Worten). |
| **4 Weichheit an Linien und Punkten** | **begonnen (19.11.), seine Wahl steht aus. Gebaut ist nichts.** Vorgelegt: ein Bildblatt mit zwei Fassungen der Bedienung (Fassung 1 „Tropfen ziehen“: ein Tropfen am Faden quer zur Farblinie an jedem gewählten Punkt; Fassung 2 „Wasser“: ein Werkzeug mit Ring, das längs der Kante malt). Mein Vorschlag: Fassung 1 zuerst. Bauweise und Kriterien: Plan 14.6. |
| 5 bis 7 | nicht begonnen. **Nichts davon ohne sein Wort bauen.** |

**Die Frage, die bei ihm liegt:** welche Fassung der Bedienung gilt (1, 2, beide, oder anders). Erst danach wird Etappe 4
gebaut. Dazu, ohne dass es aufhält: sein Urteil zu Etappe 3, und ob das Füllen mit A bleiben soll (Plan 13.3).

## 3. Was gebaut ist

### Material „Wachs“ und „Dreiecke zeigen“

`apps/editor/src/ozzy/wachs.ts`, `material.ts` (drittes festes Material; Ziel mit 16 Bit; `FesteWerte.flach`, `danach`), `main.ts`
(Feinregler, `?wachs=`, `dreieckeZeigen`). Einzelheiten: Recherche und `apps/editor/CLAUDE.md`.

### Paint-Modus

- **Bedienung:** B (Knopf „Farbe“ am iPad) schaltet den Modus. Im Raum gehören A, P und Lasso den Farblinien (`farbAn`,
  `modellSetzen`): P setzt Punkte direkt auf der Form (Klick Ecke, Ziehen rund, Faden, auf dem ersten Punkt schließen, ↩ offen,
  ⌫, Esc); A zieht Punkte, dreht Richtungen (Nadel, Ring, ⌥ knickt), ⌫ löscht; die Mitte zeigt sich mit P als Punktreihe, P
  rastet auf ihr ein, eine Farblinie von der Mitte zur Mitte ist von selbst fertig. Ein Klick auf die Form (ohne dass etwas am
  Zeiger hängt) füllt. **Farbtropfen (F):** nichts hängt am Zeiger, jeder Klick auf die Form füllt, ⌥ + Klick nimmt die Farbe
  auf. **Pipette (I):** Ring am Zeiger in der Farbe unter ihm, ein Klick nimmt sie auf, dann gilt der Farbtropfen. **Die Farben**
  hängen als Tropfen unter der Leiste: antippen wählt, den gewählten noch einmal antippen öffnet den Farbwähler, das Plus legt
  eine an, ziehen und über der Form loslassen füllt (mit jedem Werkzeug), auf den Mülleimer gezogen ist die Farbe verworfen.
  Ellipse (E) und Freihand (N) zeichnen wie in Etappe 1 an einer Wand oder eingerastet. ⌘Z über den
  gemeinsamen Rückweg (`{ art: 'farbe' }`); Sichern und Laden (`WesenStand.farbe`, Version 2 mit Punkten und Richtungen); je
  Objekt eine Bemalung (`Ruhend.farbe`).
- **Code:** `apps/editor/src/ozzy/farbe/` (ohne DOM und three bis auf `anzeige.ts`):
  `ort.ts` (Ort = Dreieck + Gewichte, `spur`, `spurImVorhang`, `punkteZuordnen`, `orteUebergeben`), `kurve.ts` (Punkte und
  Richtungen, `stueckImBild`, `stueckLegen`), `treffer.ts` (`strahlAufNetz`, `ParallelTreffer`, `BildTreffer`), `ketten.ts`
  (Ketten je Dreieck, `kreuzungenTeilen`), `flaechen.ts`, `bemalung.ts` (Modell, Datei, `linienAusTreffern`), `fein.ts`,
  `naechster.ts`, `anzeige.ts` (Zeichnen je Bildpunkt), `farbwerk.ts` (hält alles zusammen, folgt je Bild der Haut des Werks),
  `farbBlatt.ts` (das Modell für das Verhalten der Linien-Studie). In `main.ts`: `farbWerk`, `farbBlatt`, `malModus`, `farbAn`,
  `hautJetzt()`, `farbSicht()`, `farbeZeigen()`, die Nahtstellen in Bild, Zeiger, Tasten, Rückweg, Ablage.
- **Bauweise in vier Sätzen:** Die Bemalung sitzt an den Punkten des Rechennetzes (Dreieck + Gewichte) und geht ohne Rechnung
  mit; beim Netzwechsel bleibt ein Ort in seinem Dreieck, wenn es das noch gibt, sonst wird er gesucht. Eine Farblinie ist eine
  dichte Folge solcher Orte, einzelne davon sind ihre Punkte mit zwei Richtungen im Maß ihres Dreiecks. Die Kurve zwischen zwei
  sichtbaren Punkten wird im Bild gelegt, längs des Blicks auf die glatte Anzeige; nur angefasste Stücke werden neu gelegt.
  Gezeichnet wird ohne Schnitt ins Netz: Die Grafikkarte rechnet je Bildpunkt Abstand und Seite zur Farblinie.
- **Etappe 3, erster Schritt:** Eine neue Füllung läuft ein (`farbe/fliessen.ts`: die Weite jeder Stelle von der Saat, über die
  Haut, nur innerhalb der Fläche; `anzeige.ts`: die neue Farbe steht, wo die Front schon war; `farbwerk.ts`: `FLIESSEN`,
  `fliessen(dt)`). Feinregler „Füllen“, `?fuellen=tinte|honig|0`; im Testbrowser ohne Angabe aus. Der Farbtropfen am Zeiger ist
  ein Element der Seite (`#farbtropfen`).
- **Etappe 3, zweiter Schritt:** `farbe/farbLeiste.ts` (die Tropfen unter der Leiste; Farben in `localStorage`, `ozzy.farben`;
  das unsichtbare Farbfeld `#farbe-farbe` öffnet den Farbwähler, Proben und Filme setzen darüber die gewählte Farbe), `leiste.ts`
  (`LeistenWerkzeug` mit `tropfen` und `pipette`, `malZeigen`, `farbeZeigen`), `main.ts` (`farbWerkzeug()`: Der Zeiger geht dann
  nicht an das Verhalten der Linien; `farbAufnehmenBei`, `farbUnter`, `farbZug`), `farbwerk.ts` (`farbeBei`).
- **Am Werk und am Rechenkern ist nichts geändert** (Proben: Prüfsumme der Form).

### Messwerte und Lücken

Etappe 1: Plan, Abschnitt 9. Etappe 2: Plan, Abschnitt 11 (11.3 die Tabelle, 11.4 was fehlt). Kurz: Punkte 0,00 Gerätepunkte
neben den Klicks; Richtungen 0,00° neben dem Zeiger; an „strange bird“ kostet Bedienen je Schritt rund 2 ms und die Bemalung je
Bild 2,8 ms; die Bemalung kriecht bei weiten Zügen an der Form (unverändert).

## 4. Was im Plan für ihn entschieden ist (er kann es umdrehen)

Das Wort „Farblinie“; „gewohnte Tools“ = seine Werkzeuge aus Ozzy (bestätigt, Pinsel vielleicht später); gemalt wird im Raum und
eingerastet; Bemalung gespiegelt wie das Objekt, **eine Farblinie über die Mitte endet an der Mitte** (der längere Teil gilt);
nur Farblinien begrenzen Farbflächen; Tasten B, F, I als Vorschlag; Farbtropfen am Zeiger; auf Wachs färbt das Material Gemaltes
nicht ein; die Ebenen-Ansicht als aufgefächerter Raum (Skizze). Neu in Etappe 2, von mir entschieden: Die Kurve liegt, wie man
sie im Bild zieht (nicht wie die Richtungen im Raum stehen). Neu in Etappe 3 (Plan 13.3): Mit A füllt ein Klick auf freie Haut
weiter; acht Farben am Anfang als Platzhalter; die Farben gehören zum Browser, nicht zur Form; nach der Pipette gilt der
Farbtropfen; mit dem Farbtropfen nimmt ⌥ die Farbe auf (kein Röntgen).

## 5. Was hier besonders zählt

- Deutsch, kurz, in seinen Wörtern. Frage und Wahlmöglichkeiten wörtlich in die Abschlussnachricht (am Handy sieht er keine
  Kästen), Bilder mitschicken. Nie „bestanden“ ohne ihn. Zuerst zeigen, was sich an seiner Form geändert hat.
- Budget: keine Fächer aus Agenten, keine Workflows, keine Messreihen ohne Rückfrage; nur die betroffenen Proben und Tests.
- Am Rechenkern (`packages/shape`), am Werk, am Verbund, am Sitz der Loops und am Aufblasen nichts ändern, ohne ihn zu fragen. Eine
  Stelle im Plan sieht noch einen Zusatz vor und sagt, dass vorher gefragt wird: die Farben im Verbund (5.3, vor Etappe 7).
- **An seiner Form prüfen, nicht nur an der Kugel.** Etappe 2 hielt an der Kugel in allen Kriterien und an „strange bird“ nicht
  (Falten, Überhänge, die Mitte): Das zeigte erst der Film.
- Ozzy läuft auch am iPad mit Stift (kein ⌥): jede Geste von Anfang an dafür mitbauen. **Am iPad ist vom Paint-Modus noch nichts
  geprüft.**
- Materialien nie nachempfinden, wo es eine Quelle gibt („exakt wie erarbeitet“). Das helle Solid bleibt der Gast, unverändert.
- `CLAUDE.md` (Wurzel) steht knapp unter 10 240 Bytes: den Stand ersetzen, nicht anhängen.

## 6. Prüfen

- Typen: `pnpm --filter @ee/editor exec tsc --noEmit -p tsconfig.json`. Lint nur geänderte Dateien:
  `pnpm --filter @ee/editor exec eslint <dateien>`.
- Tests, aus `apps/editor`: `npx vitest run src/ozzy/` (41 Tests: Bemalung, Kurven, Einlaufen, Kugelbild des Wachses, Rechner des
  Verbunds).
- Proben, aus `apps/editor`, immer mit `GPU=1 OZZY_URL=http://localhost:5215/ozzy.html`; Stand 19.11., 16:30 Uhr: alle halten
  (die Zeile zum Tempo beim Drehen in `ozzy-farbe-fenster.mjs` riss einmal, als drei Proben hintereinander liefen, und hielt
  allein wiederholt).
  - `node scripts/pruefen/ozzy-farbe-tropfen-fenster.mjs [ordner]`: Etappe 3, zweiter Schritt, an einer Kugel mit echten Klicks
    (30 nur im Paint-Modus, 31 F greift nichts, 32 antippen und füllen, 33 Pipette, 34 ⌥ + Klick, 35 ziehen, fallen lassen,
    Mülleimer, 36 Farbe ändern und Neuladen, 37 B).
  - `[ART=tinte|honig] node scripts/pruefen/ozzy-farbe-fliessen-fenster.mjs [ordner]`: Etappe 3 an einer Kugel (20 läuft vom Klick
    aus, 22 offene Farblinie staut, 23 Tempo, 24 ⌘Z mittendrin, 25 Farbtropfen am Zeiger).
  - `node scripts/pruefen/ozzy-farbe-bedienen-fenster.mjs [ordner]`: Etappe 2 an einer Kugel, jede Geste mit einzelnen Klicks
    (Kriterien 0 bis 6, 8, 9).
  - `[NAME=<Form>] node scripts/pruefen/ozzy-farbe-mitte-fenster.mjs [ordner]`: Etappe 2 an „strange bird“ (10 Raster gegen
    Strahl, 11 Überhang, 16 verdeckter Punkt, 12 von der Mitte zur Mitte, 13 quer über die Mitte, 15 Tempo beim Bedienen).
    `DIAG=1` nennt die gewählten Stellen.
  - `node scripts/pruefen/ozzy-farbe-fenster.mjs [ordner]`: die fünf Kriterien der Etappe 1 an einer Kugel. Kriterium 2 hält bei
    `WEITE=15`, nicht bei 55. `DIAG=1`, `PROFIL=1`.
  - `[NAME=<Form>] [WEITE=20] node scripts/pruefen/ozzy-farbe-form.mjs [ordner]`: Etappe 1 an einer gesicherten Form.
  - `node scripts/pruefen/ozzy-material-fenster.mjs [ordner]`: die Materialien (2b Wachs, 2c Dreiecke zeigen).
- Bildblatt der Etappe 4 (zusammengesetzt): `GPU=1 OZZY_URL=… node scripts/ozzy/paint-weich-szene.mjs <ordner>` nimmt die Szene
  auf (Haut und Linien getrennt, `szene.js`), `node scripts/ozzy/paint-weich-bogen.mjs <ordner>` setzt das Blatt.
- Filme: `OZZY_URL=… node scripts/ozzy/paint-farben-film.mjs <ziel.mp4>` (Etappe 3: Tropfen, Farbtropfen, Pipette; über der
  Leiste zeichnet der Film einen eigenen Pfeil, weil ein Mitschnitt den Zeiger des Systems nicht zeigt),
  `[ART=tinte|honig] node scripts/ozzy/paint-fuellen-film.mjs <ziel.mp4>` (Etappe 3: die Farbe läuft ein),
  `scripts/ozzy/paint-bedienen-film.mjs` (Etappe 2, an „strange bird“ von vorn),
  `scripts/ozzy/paint-film.mjs` (Etappe 1). Vergleichsbild Wachs: `scripts/ozzy/wachs-vergleich.mjs`.

## 7. Fallen und Aufgefallenes

- **Frischer Arbeitsbaum:** erst `pnpm install --frozen-lockfile --prefer-offline`, sonst läuft nichts.
- **Vorschau-Server:** vor einem Start `lsof -nP -iTCP -sTCP:LISTEN | grep 51` ansehen und danach prüfen, dass 5194, 5205, 5211 und
  5213 noch laufen. **5211 (das Fenster der Objekte) hat diese Sitzung am 19.11. um 10:06 neu gestartet; es hängt an ihr.**
- **`farbAn` in `main.ts`** ist der Schalter „die Farblinien werden gerade bedient“ (im Raum mit A, P, Lasso). In der Bildfunktion
  gab es einen örtlichen Namen gleichen Wortlauts für „die Farbe ist zu sehen“; er verdeckte den Schalter, und solange nichts
  gemalt war, galt die Verdeckung der Linien nicht. Er heißt jetzt `farbeDa`. Wer dort einen Namen vergibt: vorher suchen.
- **Was verdeckt ist, entscheidet die Anzeige der Linien je Bildpunkt** über die Tiefe des Körpers (er steht im Paint-Modus mit
  Deckung 0 in der Szene). Sieht man Linien durch die Form, zuerst `__ozzy.farbVerdeckung()` lesen (soll 0,02 sein).
- **Der Blick steht nach dem Drehen mit der Maus nicht jedes Mal gleich:** Beim Loslassen läuft die Form mit Schwung nach, je
  nach Takt verschieden weit (so fielen die Szenen der Filme verschieden aus). Für Bilder und Filme den Blick setzen:
  `__ozzy.blickSetzen({ gier, neigung, zoom })`; oder vor dem Loslassen eine halbe Sekunde ruhen. Der Zoom mit dem Mausrad endet
  bei 4; zwölf Schritte zu 100 sind schon mehr.
- **Das Fenster im Browser-Bereich der App kann im Hintergrund langsam laufen** (einmal war die Form vier Sekunden nach dem
  Laden noch nicht da): nach dem Laden und zwischen den Handgriffen `__ozzy.bild(1 / 30)` einige Male rufen. Nach einer Probe dort `localStorage.removeItem('ozzy.farben')`, sonst bleiben die Farben der Probe stehen.
- **Der Farbwähler des Systems** lässt sich in einer Probe nicht bedienen: Die Probe setzt `#farbe-farbe` (Wert, dann `input` und
  `change`), das gilt dem gewählten Tropfen.
- **Einlaufen Bild für Bild ansehen:** `__ozzy.film(true)` hält die Schleife an, `__ozzy.bild(dt)` rechnet ein Bild mit dieser
  Zeit, `__ozzy.farbFluss()` sagt, wie weit die Front ist. Im Filmskript wechselt P mit einem zweiten Druck auf P zurück zu A:
  zwischen zwei Formen erst A, dann P drücken.
- **Bilder der Haut allein:** `__ozzy.film(true)`, `__ozzy.bild(1 / 60)`, dann sofort `#haut.toDataURL()`; danach `film(false)`.
  Die Fläche des Gasts (helles Solid) gibt so kein Bild her: aus einem Bildschirmfoto der Seite lesen.
- **Eine Kante messen:** nie zwischen Bildpunkten mischen. Die Probe sammelt alle Bildpunkte in einem Streifen um die Farblinie
  mit ihrem Abstand und liest daraus das Profil.
- **Der Zeiger rastet mit P auf Linien und Punkte der Form ein,** wenn über die Wand gezeichnet wird (Ellipse, Freihand,
  eingerastet); ein Punkt der Farblinie liegt dann dort, wo der Zeiger steht.
- **Proben, die an der Wand des Tops ziehen:** Unter einem gewählten Ring hängt der Tropfen „Maul formen“ und kann genau über dem
  Anfasser liegen. Vorher die Auswahl leeren: Esc, aber nur, wenn etwas gewählt ist (ohne Auswahl lässt Esc die Luft ab). Und
  hinter der Form liegt in der Grundansicht bei (685; 545) der Griff der Raumecke: Ein Klick dort klappt auf, statt zu füllen.
- **„strange bird“ in der Grundansicht:** Die Mitte liegt verdeckt in der Falte zwischen den zwei Körperhälften; die vordere
  Hälfte hängt über. Für Proben an der Mitte die Form von vorn drehen (im Leeren 170 Pixel nach links ziehen; so der Film).
- **„strange bird“ kommt nach einem Zug hin und zurück nicht an ihren Platz** (Haut bis 4,5 Einheiten daneben). Wer dort misst,
  vergleicht die Bemalung mit der Haut, nicht mit ihrer Lage davor.
- **Die Kanten der hinteren Raumecke und die Zeichnungen an den Wänden** liegen bei allen festen Materialien als feine Linien über
  der Form (schon vor dieser Sitzung; im Bildblatt der Etappe 2, Bild 6, am linken Flügel zu sehen). Nicht behoben.
- **Ein Ziel mit linearen Farben braucht mehr als 8 Bit,** sobald weiche dunkle Verläufe darin stehen.
- **Zusammenführen später:** Dieser Zweig ändert `main.ts` an schmalen Nahtstellen (Suchwörter `farbWerk`, `farbBlatt`, `malModus`,
  `farbAn`, `farbWerkzeug`, `farbLeiste`), dazu `leiste.ts` (zwei Werkzeuge, `LeistenWerkzeug`), `material.ts`, `gast.ts`
  (`ueberzug`), `werkBlatt.ts` (`stiftZiel`), `ablage.ts` (`farbe`), `ozzy.html`, `ozzy.css` und beide `CLAUDE.md`. Der Stand in `CLAUDE.md` wird beim Zusammenführen ohnehin neu geschrieben.
