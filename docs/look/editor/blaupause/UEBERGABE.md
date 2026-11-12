# Übergabe: Design des Wesen-Editors („Blaupause“)

Stand 11.11.2026, vormittags. Diese Übergabe gilt nur dem Design-Strang (Fenster, Darstellung von Körper, Linien, Punkten und
Griffen). Die Arbeit am Löser und an den Kurven läuft in einer anderen Sitzung weiter und hat ihre eigene Übergabe
(`docs/UEBERGABE.md` auf dem Zweig `claude/form-zuerst`).

## Start-Prompt für die neue Sitzung

> Lies `docs/look/editor/blaupause/UEBERGABE.md` und die Gedächtnis-Datei `feedback-designvision-blaupause-1110.md`. Wir feilen
> weiter am Design des Wesen-Editors im Prototyp „Blaupause“ (Artefakt, Quelle im Repo). Nichts am Editor-Code ändern, die andere
> Sitzung baut dort. Zeig mir jede Änderung als Bild.

## 1. Auftrag und Regeln

- **Auftrag (Florian, 10.11.):** Aussehen und Bedienung der Fenster, des Körpers, der Linien, Punkte und Griffe. Mischung aus
  Blaupause und Comic-Illustration: bold und brutalistisch, zugleich minimal, filigran und elegant. Bedienelemente so reduziert
  wie möglich. Es soll sich deutlich von anderen Editoren abheben und sich anfühlen, als arbeite man an einer Illustration.
- **Nur am Prototyp arbeiten.** Am Editor-Code ist in diesem Strang nichts geändert worden. Die bauende Sitzung arbeitet im
  Arbeitsbaum `.claude/worktrees/form-zuerst` (Zweig `claude/form-zuerst`, Datei `apps/editor/src/form/kurven.ts`, Server auf
  Port 5193). Dort nichts ändern, keine Ports 5193 und 5180 benutzen, keine andere Sitzung anschreiben.
- **Florian will sehen, nicht lesen.** Jede Änderung als Bild schicken (er folgt oft von einem anderen Gerät). Kleine Schritte.
- **Seine Zahlen wörtlich nehmen.** Eigene Ideen als Schalter daneben bauen, nie statt seiner Vorgabe.
- **Ehrlich bleiben:** Schwächen aus den Bildern nennen, nichts als fertig melden, was nur als Bild geprüft ist.
- **Keine Agenten-Fächer** und keine Workflows ohne Rückfrage (Wochenlimit).
- **Seine Begriffe:** „Linien“, „Punkte“, „Kante“ (durchgezogene Linie). Bei den Griffen: der **Stab** ist die Linie vom Punkt
  weg, das **Handle** ist der kleine Kreisbogen an ihrem Ende. Nie „Käfig“-Wörter.

## 2. Wo alles liegt

| Was | Ort |
|---|---|
| Prototyp, veröffentlicht | https://claude.ai/artifact/ACcBJ5tbixghqsEr3wVW3B (Version 15) |
| Quelle des Prototyps | `docs/look/editor/blaupause/blaupause.html` (eine Datei, alles darin) |
| Bilder aufnehmen | `docs/look/editor/blaupause/schau.cjs` |
| Skizze „Gleiten, Kippen, Knicken“ | `griffe-skizze.svg` hier, Bild in `docs/progress/editor/` |
| Bilder des Stands | `docs/progress/editor/blaupause-*.jpg` |
| Florians Vorgaben, Reihenfolge, Urteile | Gedächtnis `feedback-designvision-blaupause-1110.md` |
| Recherche „Pose wie Grundform bedienen“ | Gedächtnis `recherche-pose-wie-grundform-1110.md` |
| **`/editor`** (Standardversion „geometrie“ mit diesem Design, Abschnitt 11) | `http://localhost:5194/editor`, Code in `apps/editor` auf `claude/form-spiegel` |
| **Artefakt „Wesen-Editor“** (dasselbe, mit Florians drei Formen) | https://claude.ai/artifact/M9BbsZYtsNe868dyRz2VeA, gebaut mit `teststand/bau.mjs` |
| Teststand vom 11.11. mittags (Vorgänger, Abschnitt 10) | https://claude.ai/artifact/YL4ZhsiUQT9aVfcjZFBHga, Quelle in Commit `087ae214` |
| Bilder des Teststands | `docs/progress/editor/blaupause-teststand-*.jpg` |

`CLAUDE.md` ist in diesem Strang nicht geändert worden, weil die bauende Sitzung sie auf ihrem Zweig pflegt.

## 3. Was heute gilt

Zu sehen in Blatt 3 des Prototyps (damit startet er). Bilder: `blaupause-gesamt-2026-11-11.jpg`,
`blaupause-punkte-auswahl-griffe-2026-11-11.jpg`.

**Fenster**
- Alle vier Fenster sind echte 3D-Fenster mit einer Hausansicht (Seite, Front, Top, 3D). Ziehen dreht, das Rad zoomt.
- Beim Loslassen rastet die Ansicht innerhalb von 9° auf die nächste Achsansicht ein. Der Fenstername ist fett, wenn eingerastet,
  und fein, wenn frei gedreht. Daneben steht der Zoom in Prozent.
- „Wenden“ dreht ein Fenster um 180°. Doppelklick geht zurück zur Hausansicht und auf 100 %.
- Von vorn ist der Grund weiß, von hinten dunkel. In Blatt 3 heißt „vorn“ die Hausansicht des Fensters, und beim Drehen wandert
  eine harte Kante durchs Bild (Florian: „dein Vorschlag ist nicht schlecht“). Blatt 1 und 2 sind ältere Lesarten zum Vergleich.

**Outline**
- Um die Silhouette liegt außen eine Outline von 15 px, innen eine von 10 px (bei 100 %). Beide wachsen mit dem Zoom.

**Linien**
- Kante = durchgezogen, 4 px. Keine Kante = gestrichelt, 0,5 px, in einem sehr hellen Ton. Zwischen einem harten und einem
  weichen Punkt verjüngt sich die Linie.
- Die Linien wachsen mit dem Zoom (Schalter „Linien: wachsen mit“, an). Florian: „Das macht wirklich den Eindruck, man arbeitet
  an einer Illustration.“
- **Kanten liest man nur an den Linien ab.** Am Punkt gibt es dafür kein Zeichen.

**Farben**
- Das Dunkle ist ein sehr dunkles Grau (`#1c1c1f`), nicht mehr Dunkelblau.
- Zwei Farbplatten: Blau (`#1c43ff`) und Orange (`#ff6b1f`). Übereinander gedruckt ergeben sie genau dieses Grau.
- In der Leiste stehen drei Farbfelder zum Ausprobieren. „Platte 2 passend“ rechnet Platte 2 aus Dunkel und Platte 1.
- Alle Zwischentöne (Schattierung des Körpers, gestrichelte Linien, Leiste) sind Aufhellungen des Dunkels.

**Passer** (der Versatz zweier Farbplatten, angeregt vom TikTok-Logo)
- Er sitzt **nur an der äußeren Outline**, nicht an den Kanten im Körper.
- Liegen die Platten deckungsgleich, sieht man das Dunkle. Laufen sie auseinander, erscheinen Blau und Orange.
- Drei Schalter, frei mischbar:
  - **Blick:** fester schräger Versatz wie im Logo. Von hinten vertauscht, von der Seite deckungsgleich.
  - **Wandel:** Platte 1 zeigt die Grundform, Platte 2 die Pose (Regler „Pose“, Prüf-Pose „Fressen“).
  - **Tiefe:** Der Versatz folgt der Tiefe, Nahes und Fernes laufen gegeneinander. Regler für die Stärke, Schalter „schräg“.
- Blatt 3 startet mit Blick und Wandel. Bilder: `blaupause-passer-*.jpg`.

**Punkte**
- Klein wie in Blender, so dick wie ihre Linie. Auf einer Kante ein heller Punkt in der dunklen Linie. Auf einer gestrichelten
  Linie ein dunkler Punkt von knapp 5 px mit hellem Saum.
- Ein gewählter Punkt wirft einen Verlauf in der Farbe von Platte 2 auf alle Linien, die durch ihn laufen. Er selbst ist dunkel.

**Griffe**
- Jede Linie hat am Punkt ein **gerades Griffpaar**, das nie knickt. Es liegt längs der mittleren Richtung der Linie.
- An jedem Stabende sitzt ein kleiner Kreisbogen (das Handle). Er liegt in der Haut.
- **Umschalt halten** (oder Schalter „Knick ⇧“): Nur die Bögen drehen sich, um ihren Stab herum, in die Ebene des Knicks. Die
  Stäbe bleiben stehen. Bilder: `blaupause-griffe-gerade-…` und `blaupause-griffe-umschalt-…`.
- In der Pose sind die Griffe aus.

## 4. Verworfen (nicht wieder vorschlagen)

- **Scheibe um den Punkt** (Kompass, Fächer, Blüte) und Hilfslinien: „Ich sehe doch alles auch ohne.“
- **Quadrat und Raute an der Griffspitze:** „deutlich zu fein“.
- **Dorn und Lücke** am Griff sowie der **zweifarbige Punkt:** abgelöst durch „Kanten liest man nur an den Linien ab“.
- **Körper in Gegenfarbe** zum Grund: „Das war vorher besser.“ Der Schalter „Gegenfarbe“ ist noch da, aber aus.
- **Haarlinie** an der Körperkante für die innere Outline: Er wollte das Gegenteil, dickere Outlines.
- **Farbplatten an den Kanten im Körper** und die **Farben des TikTok-Logos**.
- **Ganze Stäbe drehen** bei Umschalt: Es drehen sich nur die Bögen.

## 5. Offen (Florians Urteil steht aus)

1. Die Griffe im jetzigen Stand. Er wollte „zum Griff nochmal überlegen“; zum letzten Stand hat er nichts mehr gesagt.
2. An scharfen Ecken (Spitze, Mundwinkel) liegt das gerade Griffpaar nicht auf der Linie, es zeigt die Mitte beider Seiten.
3. An einer Kreuzung drehen sich mit Umschalt die Bögen beider Linien. Im Editor sollte sich nur das gegriffene Paar drehen.
4. Welche Passer-Schalter bleiben. Seine letzte Frage war, ob die Tiefe am elegantesten sei.
5. Bei 100 % sind die Punkte sehr unauffällig, vor allem auf gestrichelten Linien.
6. Bei starkem Zoom läuft die dicke Outline unter den Fensternamen, der dann schlecht zu lesen ist.
7. Der Körper hat drei Schattierungsstufen. Ob er ganz flach sein soll, ist nicht gefragt worden.
8. Die Bedienelemente selbst sind noch nicht gestaltet. Die Leiste unten ist nur eine Probierleiste.

## 6. Was der Prototyp nicht kann

- **Man kann nichts ziehen oder bearbeiten.** Punkte lassen sich nur wählen. Wie sich Griffe beim Ziehen anfühlen, ist ungeprüft.
- Der Körper ist ein fester Prüfkörper („Zwiebel mit Gesicht“), nicht das dichte Netz des Editors.
- Die Pose „Fressen“ ist eine feste Prüf-Verformung. In der Pose trifft die Auswahl verdeckter Punkte nicht genau.
- Geprüft ist alles nur als Bildschirmfoto in Chromium auf dem Mac. Safari, Handybreite und sehr große Fenster sind ungeprüft.
- Die Tiefe mit einer Rot-Cyan-Brille ist nie geprüft worden; mit Blau und Orange taugt sie dafür ohnehin nicht.

## 7. Am Prototyp weiterarbeiten

**Bilder aufnehmen** (aus diesem Ordner, Playwright kommt aus `apps/editor`):

```bash
DPR=2 node schau.cjs <ausgabe-präfix> '[{"n":"front","blatt":3,"waehle":3,"zoom":[[1,0.62]],"ansicht":[[1,-90,0]]}]'
```

Je Schritt: `n` (Name), `blatt`, `setze` (Werte der Leiste, z. B. `{"pBlick":true,"pose":0.7,"umschalt":true}`), `farbe`
(`{"tinte":"#…","a":"#…","b":"#…"}`), `zoom` (`[[Fenster, Wert]]`, 1,5 = 100 %, kleiner = näher), `ansicht`
(`[[Fenster, Azimut, Höhe]]`), `waehle` (Punktnummer, −1 = keiner), `clip`. Fenster: 0 Seite, 1 Front, 2 Top, 3 3D.
`LISTE=1` gibt die Punkte mit ihren Griffen aus. Ausgaben in den Scratchpad der Sitzung legen, nicht ins Repo.

**Artefakt aktualisieren:** aus einer neuen Sitzung erst das Artefakt mit der Adresse oben lesen, dann diese Datei mit derselben
Adresse veröffentlichen. Änderungen erst an der Datei machen, dann veröffentlichen. Die Seite ist eine einzelne Datei ohne
`<!doctype>`, `<html>`, `<head>` und `<body>`; three.js r128 kommt von cdnjs, die Schriften von Google Fonts.

**Aufbau der Datei** (von oben nach unten):
- Stil und Gerüst: vier `.fenster`, darunter die Probierleiste `#leiste`.
- `S` und `BLAETTER`: Zustand der Leiste und die drei Blätter.
- Prüfkörper: `flaeche(phi, t)`, `normale`, `LOOPS` (Linien mit Punkten, Härte und Ecke), `ortAuf`.
- `SCHEMA`: gemeinsamer Kopf aller Fragment-Shader. Darin `sigma` (0 = von vorn, 1 = von hinten), `strich` und `gegen`, die Farben
  als Uniforms (`uTinte`, `uPlA`, `uPlB`) und das Abstandsfeld (`abstandV`).
- `U`: Uniforms, die sich alle Materialien teilen. `FARBE` und `farbenSetzen`: die Farbfelder.
- `POSE_VS` mit `sicht()` (Pose und Scherung nach Tiefe) und `posiert()` (die Prüf-Pose).
- Körper (`koerperMat`), Maske (`maskeMat`) und Fluten (`flutMat`): Aus der Maske des Körpers entsteht je Fenster ein Abstandsfeld
  zur Silhouette (Jump Flooding, je Achse zwei Bytes).
- `hgMat`: Grund und Outlines. Die äußere Outline wird von zwei Platten gedruckt, jede mit eigenem Feld und Versatz.
- Linien: `LINIE_VS`, `LINIE_FS`, `linienMat`, `segmente`. Breite in Bildpunkten, Verjüngung nach Härte, Strichelung,
  Verlauf der Auswahl (`uWahl…`).
- Punkte: Liste `punkte` (Griffe, Linien je Punkt, Lage in der Pose), `PUNKT_VS`, `PUNKT_FS`, `punkteFaerben`.
- `griffeBauen`: gerade Griffpaare und Bögen; `knickDreh` ist die Drehung bei Umschalt.
- `feldRechnen` und `zeichnen`: je Fenster Felder rechnen, dann Grund, Körper, Linien und Punkte zeichnen.
- Drehen, Einrasten, Wenden (`tween`, `rasten`, `wenden`, `schritt`), Zeiger, Leiste, Haken `window.__blaupause`.

**Toter Code,** der beim Aufräumen weg kann: Scheiben-Griffe (`kegelVon`, Zweig `S.griffe === 'scheibe'`, Netz `kompass`),
Griffspitzen (`griffSpitzen`, `uStartAusD`), zweifarbiger Punkt (`teilungen`, `uTeilen`), Farbplatten der Linien (`matPlC`,
`matPlR`), Gegenfarbe (`unter`, `uKehr`).

## 8. Übertragung in den Editor (nichts davon gebaut)

Erst nach Florians Wort, und abgestimmt mit der bauenden Sitzung. Was ich beim Lesen des Editor-Codes gefunden habe:

- Die drei Blätter in `kurven.html` sind SVG, gestylt in `apps/editor/src/form/form.css`. Diese zwei Dateien fasst die bauende
  Sitzung kaum an; nur dort wäre Design-Arbeit parallel möglich, in einem eigenen Arbeitsbaum. Alle Größen und das 3D-Fenster
  stecken in `kurven.ts`.
- Ein Griff wird heute in der Ebene des Blatts verschoben, die Tiefe bleibt (`zugBewegen` in `kurven.ts`). Das trägt für
  eingerastete 3D-Fenster unverändert. Offen ist nur das frei gedrehte Fenster.
- Der Kern führt glatt oder Ecke schon je Linie (`ecke` von Hand, `autoEcke` an der Kreuzung mit einer Kante; `istEcke` und
  `griffZiehen` in `packages/shape/src/dicht/loops.ts`). Das Fenster zeigt aber ein Zeichen für die ganze Kreuzung
  (`eckeGezeigt`) und macht beim Anfassen eines Griffs auch dessen Linie zur Ecke.
- Florians gerades Griffpaar mit Umschalt wäre ein anderes Griffmodell als heute: Richtung plus Knick statt zwei freier Griffe.
- Die doppelte Outline braucht ein Abstandsfeld je Fenster. Das Skript meldet im Prototyp unter 2 ms je Bild auf dem M3 Pro; die
  Zahl stammt aus einem Fenster ohne Anzeige und ist nicht belastbar. Im Editor vor dem Einbau messen.

## 9. Recherche zum Passer (11.11.)

- Der Film „Spider-Verse“ ersetzt Unschärfe durch versetzte Farbplatten: unscharf heißt dort „aus dem Passer“.
  [Cartoon Brew](https://www.cartoonbrew.com/feature-film/if-its-not-broke-break-it-sony-imageworks-renegade-approach-to-spider-man-into-the-spider-verse-167321.html),
  [Foundry](https://www.foundry.com/insights/film-tv/graphic-look-in-comp-spiderman)
- Das Logo spielt auf Rot-Cyan-3D-Bilder an. [Creative Bloq](https://creativebloq.com/news/tiktok-logo-history)
- Animationsprogramme färben das Bild davor und danach in zwei Farben (Zwiebelhaut).
  [Blender-Handbuch](https://docs.blender.org/manual/en/4.1/grease_pencil/properties/onion_skinning.html)
- Rot wirkt für die meisten näher als Blau, aber schwach und nicht bei allen.
  [TU Delft](https://repository.tudelft.nl/file/File_391bf7f8-b758-4e07-ab1a-996a407c26e7?preview=1)

## 10. Teststand (11.11., mittags)

Florians Auftrag: „den aktuellsten Stand schon mit echten Kurven und dem 3D-Modell bauen, so dass die Handles funktionieren, dass ich
einen echten Teststand habe. Die Einstellungen kannst du in einem Aufklappmenü verbergen.“ Dazu: „ohne die andere Sitzung mit den
Reparaturarbeiten an der Kurve zu stören.“

**Wie er gebaut ist**
- Eigene Seite neben dem Prototyp, eigenes Artefakt (Adresse oben). Der Prototyp `blaupause.html` und sein Artefakt sind unverändert.
- `teststand/fenster.ts` ist eine **Kopie** von `apps/editor/src/form/kurven.ts` aus dem festen Stand `6ba0bcb3` (Zweig
  `claude/form-zuerst`). Löser, Linien, Punkte, Werkzeuge und Abläufe sind die des Editors. Geändert (jede Stelle mit „Teststand“
  kommentiert): Darstellung, vier drehbare Fenster, Treffer, Griffe, Leiste. `teststand/gl.ts` enthält die Shader der Blaupause.
- `node bau.mjs` holt Kern und Helfer per `git archive` aus `6ba0bcb3` (der Arbeitsbaum der anderen Sitzung wird nicht angefasst),
  bündelt alles mit esbuild zu einer Seite und legt Florians drei Formen aus `wesen/` desselben Stands hinein (gzip, base64):
  `teststand/dist/blaupause-teststand.html` (3,8 MB, nicht im Repo). `STAND=<commit>` nimmt einen anderen Kern; Änderungen der
  anderen Sitzung an `kurven.ts` selbst kommen damit aber **nicht** mit (dann `kurven.ts` neu kopieren und die Teststand-Stellen
  nachziehen).
- Bilder: `DPR=2 node schau.cjs <präfix> '[…]'` (Schritte im Kopf des Skripts: Form laden, Ansicht, Zoom, Punkt wählen, Griff oder
  Punkt mit der echten Maus ziehen, mit Umschalt, Fenster drehen oder wenden, Menü aufklappen).

**Was geht** (geprüft nur in Chromium auf dem Mac, mit echten Mauszügen)
- Start mit „strange bird“ (16 010 Punkte, 9 Linien); im Menü Kugel, „teat firefish“ (27 770 Punkte), „test_kaputt“. Die Form bleibt
  im Browser über das Neuladen. Alle Fenster mit einem Maßstab (höchstens 100 %), die Form ganz zu sehen.
- Vier echte 3D-Fenster: Grund ziehen dreht, Einrasten innerhalb von 9°, Wenden (von hinten dunkel), Doppelklick auf den Grund =
  Hausansicht und ganze Form, Pos1 = alle Fenster.
- Punkte und Griffe ziehen in **jedem** Fenster, auch frei gedreht und gewendet (in der Ebene des Fensters, die Tiefe bleibt).
  Treffer nur auf Sichtbares; X (Durchsicht) zeigt Verdecktes blass und macht es greifbar.
- Griffe: je Linie das gerade Paar mit Bögen. **Bogen ziehen = gleiten**: das Paar dreht sich als Gerade, der gezogene Griff bekommt
  die Entfernung der Maus, der andere behält seine Länge, ein Knick bleibt (gemessen: 14 → 45 Einheiten, die Gegenseite bleibt 119).
  **Umschalt halten**: die Bögen drehen sich um den Stab in die Knickebene und wandern an das wahre Ende ihres Griffs; **mit Umschalt
  ziehen = knicken**: nur dieser Griff bewegt sich, der Punkt wird eine Ecke (wie Skizze „Knicken“). Der Kern macht die kreuzende
  Linie an so einem Knick von selbst zur Kante (seine Regel ab 15°), die Haut knickt dort.
- Alle Werkzeuge des Editors: Doppelklick auf Linie (neuer Punkt), auf Punkt/Griff (Ecke ↔ glatt), K, ⌫, G/S/R, O, ⌘Z; L, F, P nur in
  der Hausansicht von Seite, Front, Top. Passer, Farben, „Linien wachsen mit“, „Knick ⇧“ im Menü „Einstellungen“.
- Zeichnen aller vier Fenster etwa 1–1,5 ms je Bild (Messung mit gl.finish, nicht belastbar); Zug im Editor-Löser 11–22 ms.

**Abweichungen von der Blaupause (Florians Urteil offen)**
- Doppelklick führt zur ganzen Form statt auf 100 % (die Formen sind größer als die Prüfkugel; 100 % bleibt das Maß der Outlines).
- Mit Umschalt wandern die Bögen an das wahre Griffende (eigene Idee, damit man den Knick dort greift). Nach einem Knick schweben sie
  dann frei neben dem Stab, der die mittlere Richtung zeigt (Bild 4 in `blaupause-teststand-griffe-2026-11-11.jpg`).
- Knicken bewegt nur den gegriffenen Griff. Ein erster Versuch ließ beide Seiten gleich weit kippen; das zog die lange Seite mit und
  machte einen Haken in die Linie (verworfen).

**Offen und Schwächen**
- Im Artefakt-Rahmen selbst nicht geprüft (der eingebaute Browser ist bei claude.ai nicht angemeldet); Hintergrund-Rechner aus einem
  Blob, Speicher und Schriften sollten dort gehen, laut Regeln des Artefakts.
- Pose und Passer „Wandel“ brauchen ein Maul; keine der drei Formen hat eins.
- Sichern unter einem Namen gibt es nicht (keine Ablage, keine Dateien im Artefakt).
- Bei Zoom laufen Linien und Outline unter den Fensternamen (Punkt 6 oben).

## 11. Übertragen in den Editor: `/editor` (11.11., abends)

Florian: „die andere Session ist vorerst fertig. `http://localhost:5194/kurven.html?gewichte=geometrie` ist die neue
Standardversion. Kannst du diese auch so vermerken und unter einem eigenen Link veröffentlichen /editor. Bitte wende das Layout
direkt an.“ Dazu: das 3D als „original halbtransparentes, glossy Blobmaterial“ (seine Vorlage: das Jelly des Spiels), ohne
Outlines, mit Umschalter auf das Papier; Seite/Front/Top in Farben, Outline und Verlauf seiner Logo-Vorlage („illudiy“), mit dem
Schatten der dicken Outline auf der äußeren, kombiniert mit „Blick“, „noch mehr bold“; die Schattierung nicht zackig, sondern
„scharf wie saubere Vektorkurven“.

**Wo:** `http://localhost:5194/editor` (Arbeitsbaum `.claude/worktrees/form-alt`, Zweig `claude/form-spiegel`, gepusht; `kurven.html`
dort unverändert). `?laden=<Name>` öffnet ein gesichertes Wesen aus `wesen/`. Artefakt mit Florians drei Formen:
https://claude.ai/artifact/M9BbsZYtsNe868dyRz2VeA („Wesen-Editor“, gebaut mit `teststand/bau.mjs` aus `claude/form-spiegel`).
Bilder: `docs/progress/editor/editor-blaupause-{gesamt,bogen}-2026-11-11.jpg`.

**Code** (alle neu, im Editor): `apps/editor/editor.html` (Gerüst und Leiste), `src/form/editor.ts` (= `kurven.ts` von `09f39297`
per `git merge-file` mit dem Teststand zusammengeführt, ohne Konflikt; „geometrie“ ohne Parameter Standard, `?gewichte=gleich`),
`src/form/blaupause.ts` (Darstellung), `scripts/editor-bilder.cjs` (Bilder mit echten Mauszügen, wie `schau.cjs`). Eintrag im
Projektgedächtnis von `claude/form-spiegel` (`CLAUDE.md`). Ändert jemand `kurven.ts`, muss `editor.ts` nachgezogen werden
(dreifache Zusammenführung, Basis = `09f39297`). Der Teststand-Code hier im Ordner ist entfernt (Geschichte: Commit `087ae214`);
das alte Artefakt „Blaupause Teststand“ zeigt weiter den Stand vom Mittag.

**Seite, Front, Top (Logo-Look):** Grund `#17131b` (von hinten `#f4eff6`), Körper weiß mit leichtem Verlauf nach unten, die
Schattenseite nur zart lavendel; dahinter die **Extrusion** in Rosa (`#ff72a9`): die Silhouette, längs eines Versatzes nach links
unten gezogen (sechs Schritte, 18 px bei 100 %); um beides die **dicke Kontur** in Petrol (`#003f4e`, 28 px), darum der **Rand** im
Verlauf `#ff72a9` → `#fca4de` → `#d4b3f5` → `#936ffb` (12 px), auf dem die Kontur ihren **Schatten** nach unten wirft (72 % der
Randbreite, gesättigter und dunkler). Extrusion und Schatten versetzen sich wie „Blick“: von vorn nach links unten bzw. unten, von
der Seite keiner, von hinten nach oben. Wandel und Tiefe wirken weiter auf Rand und Schatten. Kontur und Rand als Regler im Menü,
sechs Farbfelder. Linien und Griffe in Petrol, Auswahl in Lila.

**3D:** Jelly (Grund `#081b25` wie im Spiel): drei Töne mit scharfen Grenzen (Licht oben links `#3bfcf2` … Schattenseite `#008e89`),
**Innenlappen aus der Dicke des Körpers** (Rückseiten-Tiefe je Bildpunkt, unten etwas mehr wie der Bodenlappen der Vorlage), vier
Bläschen (Punkte der Haut, ein Stück nach innen), Glanzstrich und Punkt nur auf der oberen Rundung, Linien weiß. Knopf „Jelly/Papier“
im Fenster schaltet auf den Papierkörper der Blaupause (ohne Outlines).

**Glatt:** Normalen der Anzeige über die Nachbarn geglättet (acht Runden, Kanten ausgenommen) **und im Bild**: ein Feld aus
Blicknormale, Tiefe und Dicke wird waagerecht und senkrecht weichgezeichnet (Halbmesser 2,5 Netzkanten, Nachbarn hinter einem
Tiefensprung zählen nicht); erst danach liegen die scharfen Grenzen. Vorher liefen sie als Treppe über die Dreiecke (Bild im Bogen).

**Farben roh in sRGB:** three r186 rechnet `new Color('#hex')` in den linearen Raum um, die Shader schreiben aber ohne Rückwandlung.
Das machte alles dunkler und satter (Petrol fast schwarz) — es betraf auch schon den Teststand vom Mittag.

**Offen:** Florians Urteil zu allem; der Fensterkopf liegt bei Zoom über dem weißen Körper (weiße Schrift unlesbar); die Innenlappen
der Kugel liegen ineinander (die Vorlage hat zwei getrennte Lappen); Bläschen und Glanz sind einfache Regeln, keine Gestaltung je
Wesen; geprüft nur in Chromium auf dem Mac (Playwright, echte Mauszüge), das Artefakt nicht im Artefakt-Rahmen.

### Nachtrag 11.11. spätabends: TikTok, Wenden, Kontrast, glatter, Lava

Florian zum Stand von `/editor`: „sieht schon durchaus gut“, dazu fünf Wünsche (wörtlich gekürzt): den „TikTok-Effekt wie bei der
Ursprungsversion, so dass die dunkelblaue Linie aus der Überschneidung der beiden anderen entsteht“; „die Griffe immer Kontrast …
wenn ein Griff über eine dunkle Linie geht, soll der Bereich, der im Dunkleren liegt, weiß sein“; Schattierung „noch eine Spur
mehr geglättet, die Stufen sind jetzt stark abgerundet, aber immer noch sichtbar“; im Jelly beim Herausziehen von Hals oder Kopf
„mehrere dunkle Bubbles … immer rund/bohnenförmig … wie Bubbles in einer Lavalampe, mehr oder weniger unabhängig vom Mesh“; und
„beim Seitenwechsel sollen Modell und dunkelblaue Outline wieder Farben umkehren wie zuvor“. Commit `f2e62643` auf
`claude/form-spiegel`, Artefakt Version 4. Bilder `docs/progress/editor/editor-{tiktok-gesamt,tiktok-lava-bogen,griffe-kontrast-nah,
gewendet,schattierung-300,lava-nah}-2026-11-11.jpg`.

- **TikTok** (Passer, Standard an): die dicke Kontur aus zwei Platten in den Farben des Verlaufs, jede ein Band von ihrem Körper bis
  zur Kontur, Rosa nach rechts oben, Lila nach links unten versetzt (je ⅕ der Kontur, mit „Blick“: von der Seite keiner, von hinten
  umgekehrt); wo beide liegen, Petrol. Innen ein Streifen der einen, außen einer der anderen Farbe, wie Blau/Orange der Blaupause.
  Der Rand liegt um beide Platten; der Schatten entfällt (Schalter aus = die Kontur mit Schatten von vorher). Rand-Regler jetzt ab 0
  (Rand 0 zeigt die Platten pur, Bild 2). Ehrlich: Wo der Verlauf des Rands dieselbe Farbe hat wie der Streifen, verschwimmt er.
- **Wenden:** Körper und Kontur tauschen wie in der Blaupause (`kipp(sigma)`): von hinten Körper Petrol (Schattenseite ⅔), Kontur,
  Linien und Inneres des Mauls weiß, der Grund hell; die Kante läuft beim Drehen durchs Bild.
- **Griffe mit Kontrast:** Nach Grund, Körper, Linien und Punkten kopiert jedes Fenster sein Bild in eine Textur
  (`copyFramebufferToTexture`); Stäbe und Bögen lesen darunter die Helligkeit je Bildpunkt: dunkle Tinte wird über Dunklem weiß
  (Luma < 0,36–0,48), helle Tinte (Jelly, Rückseite) über sehr Hellem dunkel (> 0,84–0,92). Punkte bleiben, wie sie sind.
- **Glatter:** Halbmesser der Glättung im Bild 4,5 × 0,75 Netzkanten ohne die alte Obergrenze von 28 px (die ließ beim Zoomen die
  Kanten des Netzes als runde Stufen stehen), zwei Runden waagerecht/senkrecht mit 25 Abtastpunkten, Felder linear gefiltert. Die
  Extrusion steckt jetzt im Abstandsfeld selbst (die Maske wird längs der Extrusion bis zu 64-mal versetzt gezeichnet) — vorher
  sechs Kopien im Shader, das gab bei starkem Zoom Zacken an der rosa Kante.
- **Lava** (`src/form/lava.ts`, ersetzt die Innenlappen aus der Dicke): Das gezeigte Netz wird in Würfel zerlegt (40 längs der
  größten Ausdehnung, innen per Strahl längs x), exakte Abstandstransformation; die größten Kugeln, die sich nicht überdecken (ab ¼
  der größten), sind Anker. Die Blase ist ein Ellipsoid nach dem dicken Kern um den Anker (Hauptachsen der Würfel mit ≥ 0,7 seiner
  Tiefe): im flachen Rumpf eine breite Linse, in einer Kugel eine Kugel. Je Blase zwei Ellipsoide (eine Bohne), weich verschmolzen,
  auch mit den Nachbarn; sie treiben, atmen, das kleinere schwappt (Perioden 6–17 s); unten dunkler als oben. Formänderung → neue
  Anker höchstens alle 250 ms (2–8 ms), die Blasen schwimmen hin, neue wachsen, alte schrumpfen. Gezeichnet als Ellipsen im Bild
  (E = P·M·Pᵀ), Rand scharf. Für die Bewegung zeichnet nur das 3D-Fenster neu (`preserveDrawingBuffer`, höchstens 60/s; geprüft:
  die drei anderen Fenster bleiben bitgleich stehen). Schalter „Lava bewegt“.
- **Offen:** Florians Urteil; ein dünner herausgezogener Hals bekommt keine Blase (unter ¼ der dicksten Stelle) — ein dicker Kopf
  schon; die Bögen der Griffe stehen in der Seitenansicht oft von der Kante (3D-Bögen, älter); bei starkem Zoom haben Kantenlinien
  und Punkte nahe der Silhouette Zähne bzw. halbe Kreise (Tiefentest gegen den Körper, älter, nicht angefasst).

**Danach (Florian: „statt des weißen Backgrounds in den Fenstern ein schönes Hellblau“):** Der Grund von hinten (Seitenwechsel) ist
jetzt `#bfe3fa` statt `#f4eff6`, als Farbfeld „Grund hinten“ im Menü. Verglichen mit `#b3d4ff` (lavendelblau) und `#c4ecf2` (eisblau):
`docs/progress/editor/editor-hellblau-{kandidaten,gewendet}-2026-11-11.jpg`. Commit `f0157dfe`, Artefakt Version 5. Der Papierkörper
im 3D (Knopf „Papier“) hat vorn weiter Weiß.

**Danach (Florian: „lieber Lavendel, und der TikTok-Effekt soll an allen Seiten gleich sein, die pinke innere Seite kommt weiter als
die fliederfarbene“):** Grund hinten `#b3d4ff`. Gemessen an „teat firefish“ (Strahlen von der Körpermitte): innen Rosa 10–32
Bildpunkte, Lila 0–9 — die rosa Extrusion (18 px nach links unten) legte sich zum rosa Streifen. Die Extrusion ist jetzt ein eigener
Schalter („Extrusion“ bei Outline, Standard aus, Farbe „Körper Schatten“); ohne sie sind Rosa und Lila innen wie außen gleich breit
(an der Kugel punktsymmetrisch: innen je ⅕ der Kontur × Blick, außen das Doppelte, weil die Platten innen am Körper beginnen).
Commit `c7e0808b`, Artefakt Version 6, Bilder `docs/progress/editor/editor-{tiktok-symmetrisch,lavendelblau-gewendet}-2026-11-11.jpg`.

**Danach (Florian, mit Vorlage `docs/look/editor/blaupause/vorlage-langer-schatten-2026-11-11.png`: „in den 3 Fenstern mit der Outline
auch noch den großen flachen Schatten mit harten Kanten, der auf der dunkelblauen Fläche liegt … immer schräg nach links unten statt
rechts“):** Das ganze Abzeichen (alles bis zum äußeren Rand des Rands; bei TikTok beide Platten) wirft einen langen Schatten auf den
Grund, immer unter 45° nach links unten, harte geglättete Kante. Vorlage gemessen: Grund `#081b25`, Schatten am Logo `#051318`
(≈ ⅔), nach hinten heller → hier am Abzeichen Grund × 0,64, über die Fensterlänge auf ≈ × 0,8 auslaufend, von hinten (heller Grund)
nur 45 % davon. Regler „Schatten“ bei Outline (0–80 %, 36 %; 0 = aus). Rechnung: Maske des Abzeichens aus den Abstandsfeldern,
dann ~11 Verdopplungsschritte nach links unten (Deckung = Höchstwert, Weg = kürzester), halbe Gleitkommazahlen.
Commit `698c336d`, Artefakt Version 7, Bilder `docs/progress/editor/editor-langer-schatten{,-hinten}-2026-11-11.jpg`.

**Danach (Florian: „die weißen Glanzpunkte noch mehr wie in meiner Referenz … immer eine untere dunkle Bohne als Kontaktebene zum Boden
und mindestens eine Lavalampen-Bohne, etwas heller … größere Wesen mehr Lavabohnen, aber aktuell zu viele … nur bei großen Köpfen und
Bäuchen oder größerer Skalierung“):** Vorlage gemessen (Jelly-Blob): untere Bohne × 0,6–0,7 der Jelly-Farbe, obere × 0,9; Glanzstrich
bei 0,9 des Halbmessers zwischen 112° und 140°, Punkt bei 151°. Gebaut (`src/form/lava.ts` `lavaPlan`, `blaupause.ts`):
- **Kontaktbohne** (× 0,66): flach und achsparallel in der unteren Hälfte des größten Teils, Breite an ihrer Höhe gemessen; liegt
  still, atmet nur; eigene Schicht unter der Lava.
- **Lavabohnen** (× 0,87): eine im oberen Teil des größten Teils; weitere nur in großen Teilen auf der Mittelebene (≥ 0,62 des
  größten und ≥ 0,45 der Startkugel `R_BEZUG` = 141; Paare wie Flügel und Beine nie); bei größerer Skalierung (größtes Teil ab
  1,6 × Startkugel) bis zu drei im größten Teil; höchstens vier. Startkugel und „strange bird“: eine, „teat firefish“: zwei (großer Kopf).
- **Glanz:** gebogener weißer Strich und länglicher Punkt innen am Umriss oben links, je großem Teil im Winkelbereich von seiner Mitte
  aus, aus einem eigenen Abstandsfeld (Abstand zum Umriss innen); nicht auf dünnen Armen und Hörnern. An der Kugel genau wie die
  Vorlage, an verwickelten Formen am Kopf oben links (kleiner, weil die Teile kleiner sind).
- **Fallen:** Löschen mit Deckkraft 0 setzt in three.js alle Kanäle auf 0 (vormultiplizierte Deckkraft) — Saat als Fläche zeichnen;
  `atan(0, 0)` gibt auf manchen Grafikkarten NaN; Feldwerte vor `fwidth` begrenzen (Sprung an der Reichweite zeichnet feine Linien).
Commit `722aecca`, Artefakt Version 8, Bilder `docs/progress/editor/editor-jelly-{glanz-bohnen,teat-firefish}-2026-11-11.jpg`.

**Danach (Florian: „echte Kanten sollen in den 3 Ansichten wieder die gleiche verjüngende Outline/Kontur bekommen wie in der
Ursprungsform des Editors, in gleicher Dicke und Farbe wie meine Kanten jetzt“):** wie `umrissMaterial` in `kurven.ts` — der Körper
umgestülpt (Rückseiten), im Bild längs der Normale nach außen geschoben, umso weiter, je mehr die Fläche zur Seite zeigt (voll ab
0,35): an Umrissen im Inneren (Hörner vor dem Kopf, Falten) und an echten Kanten eine Linie, die sich verjüngt. Breite 4 Bildpunkte bei
100 % (wachsen mit wie die Kantenlinien), Farbe Petrol, von hinten weiß. Nur Seite, Front, Top. Commit `d3f7dc95`, Artefakt Version 9,
Bilder `docs/progress/editor/editor-kanten-kontur{,-nah,-hinten}-2026-11-11.jpg`.

**Danach (Florian: „eine 4px Kontur um alles … kann weg“, und: „der Kontaktbohne überzeugt noch nicht … eine abgerundete Andeutung
des echten Kontaktbereichs, wenn das Modell immer auf dem Boden steht … immer Abstand zur Kante wie bei einem Glas-Effekt … immer stark
abgerundet“):**
- Die verjüngende Kontur zeichnet nur noch im Inneren der Silhouette (Abstandsfeld des Körpers); außen liegt die dicke Kontur.
- Kontaktbohne neu (`kontaktFeld` in `blaupause.ts`): je Bildpunkt der Strahl durchs Glas zwischen Vorder- und Rückseite (Dicke aus
  den Rückseiten), an beiden Enden ⅒ des größten Teils frei (Glasrand); reicht er tiefer als 0,42 des größten Teils über den Boden
  (tiefster Punkt des Körpers), gehört der Bildpunkt dazu. Dann weich gerechnet (Halbmesser ⅓ des größten Teils) und im Jelly bei der
  Hälfte scharf geschnitten: immer rund, nie am Rand, dort, wo das Wesen wirklich aufliegt (Kugel: unten wie die Vorlage; Vogel: unter
  dem Bauch; „teat firefish“: unter dem tiefsten Teil). Das Ellipsoid aus `lava.ts` wird dafür nicht mehr benutzt.
Commit `66f82121`, Artefakt Version 10, Bilder `docs/progress/editor/editor-{kontaktbohne,kontur-innen}-2026-11-11.jpg`.

**Danach (Florian: „Kontaktbereich sollte die untere Kontur nicht berühren und bei den verwinkelten Wesen etwas größer sein und auch
mehr als nur das unterste Teil betreffen. Alle unteren Flächen sollten einen haben. Je weiter unten desto größer. Aber immer so
abgerundet, dass die untere Kontur nicht berührt wird, wie in meiner Referenz“):** Kontaktbereiche aus einer **Bodenkarte** (der Körper
von unten: Höhe der Unterseite je Bodenpunkt) — ein Punkt im Glas gehört dazu, wenn er über der Unterseite darunter liegt, mit Abstand,
bis zu einer Schicht, die umso dicker ist, je näher diese Unterseite am Boden liegt. **Glasrand in alle Richtungen** über den Abstand zur
Haut aus der Abstandstransformation der Lava (`AbstandFeld` in `lava.ts`, als 3D-Textur). Maß = größter Teil, bei verwinkelten Wesen aus
der Körperhöhe (≥ 0,24 der Höhe); weich gerechnet und rund geschnitten. Commit `79abefc9`, Artefakt Version 11, Bilder
`docs/progress/editor/editor-kontaktbereiche{,-fisch}-2026-11-11.jpg`.

**Danach (Florian, mit markierten Bildern `docs/look/editor/blaupause/feedback/glanz-markiert-2026-11-11.jpg` und
`kontakt-zu-hoch-2026-11-11.png`: „rote Pfeile auf den Glanzbereich, der mich stört … teilweise an unlogischen Stellen und an hohen
runden Teilen fehlt es. Beim Kontaktbereich geht er jetzt zu hoch und ist zu weit von der unteren Kontur entfernt, lieber etwas breiter
und weniger Höhe“):**
- **Glanz an der Kontur** statt an der Neigung der Fläche (die gab in Kehlen Striche und an kleinen Teilen nur Haarstriche): ein
  Abstandsfeld im Inneren der Silhouette des 3D-Fensters (halbe Auflösung, Saat = Hintergrund), daraus je Teil der Halbmesser (größter
  Abstand auf dem Weg nach innen, weich gerechnet). Band in 0,12 R Abstand zur Kontur, Breite ≈ 1,24 √R Bildpunkte bei 100 % (mindestens
  3,4), wo die Fläche nach oben links zeigt; Strich und Punkt nach Länge (Kugel wie die Vorlage: Strich 110°–146°, Punkt um 160°; an
  kleinen Teilen über größere Winkel, der Punkt wandert die linke Flanke hinunter). Liegt Richtung Licht innerhalb von 2,5 Strichbreiten
  ein anderes Teil, wird das Band schmaler bis zu nichts (keine Striche in Kehlen und Gabeln). Als Feld gezeichnet, leicht weich gerechnet
  und scharf geschnitten: runde Enden, keine Knicke der Dreiecke.
- **Kontakt als flache Bohne** (Schalter „Kontakt flach“ unter Anzeige, Standard an; aus = Bodenbereich durchs Glas wie Version 11): drin,
  wer von hier schräg nach links unten und nach rechts unten (je 35°) um D aus dem um den Rand verkleinerten Körper fällt — unten an jeder
  nach unten zeigenden Kontur eine Bohne mit gewölbter Oberkante, die an steilen Stellen ausläuft. Rand 0,045 · Maß, D = 0,46 · Maß ×
  (1 − Höhe der Kontur über dem Boden / max(0,8 · Maß, 0,5 · Körperhöhe)); unter 35 % von D keine Bohne (sonst Flecken an hohen Teilen).
  Kugel: Bohne ≈ ⅙ der Höhe statt ⅓, 10 Bildpunkte über der Kontur.
- **Verworfen (gemessen):** Richtung aus dem Gefälle des Abstandsfelds (folgt der Treppe der Bildpunkte, Striche zerfallen in Perlen);
  feste Winkelbereiche (auf geraden Flanken alles oder nichts); Kontakt als Band mit Höhe am Bildpunkt (dünne Sichel) oder parallel zur
  Kontur (Schale statt Bohne). **Falle:** weich gerechnete Felder in 8 Bit fransen an flachen Stellen aus → halbe Gleitkommazahlen.
Commit `938304c5`, Artefakt Version 12, Bilder `docs/progress/editor/editor-glanz-kontakt{,-ansichten,-bogen}-2026-11-11.png`.

**Danach (Florian, Bild `docs/look/editor/blaupause/feedback/kanten-outline-2026-11-11.png`: „bei harten Kanten ist auch nochmals eine
extra dünne Outline, diese soll auch verschwinden; passt die Outline, die sich selbst bildet, schon richtig? Es sieht manchmal aus, als
würde es schweben. Und am unteren Oberkiefer sollte doch auch eine Outline entstehen, wenn es so überlappt, oder nicht?“):**
- **Die dünne Extra-Outline** war die Kantenlinie selbst: Liegt eine Linie mit Kante auf dem Umriss, zeichnete die Logo-Ansicht sie samt
  weißem Hof neben die dicke Kontur — daher das Schweben. Linien und Höfe im Abstand von gut einer Linienbreite zum Umriss zeichnen dort
  nicht mehr (Probe des Abstandsfelds rundum); gewählte Linien bleiben sichtbar. Die verjüngende Kontur selbst war richtig.
- **Kontur am überlappenden Kiefer:** Das offene Maul zählte für die Maske als außen, die verjüngende Kontur davor wurde verworfen; und
  das Innere war Petrol wie die Kontur. Jetzt gehört das Innere zur Silhouette (`maskeInnen`), es hat den Ton des Grunds (wie ein Loch im
  Abzeichen, von hinten der helle), und an Kiefern und Ohren vor dem offenen Maul läuft die verjüngende Kontur.
- **Passer „Wandel“ in der Pose:** Der Puffer `aGrund` (Lage in der Grundform) wurde in `editor.ts` nie gefüllt — in jeder Pose fiel die
  Platte der Grundform und damit das ganze Petrol weg. Jetzt aus `grund.haut` (an der Spiegelebene abgeschnitten wie die Anzeige).
- Nachstellen: „strange bird“, Linie 1 wählen, „Fressen“. **Offen:** Linien, die hinter der verjüngenden Kontur durchlaufen, zeigen bei
  starkem Zoom eine kleine Treppe am Hof (Tiefentest gegen die Kontur), nicht angefasst.
Commit `9224c45a`, Artefakt Version 13, Bilder `docs/progress/editor/editor-{kante-umriss-maul,maul-offen-front}-2026-11-11.png`.

**Danach (Florian 12.11.: „da sind ja immer noch diese dünnen weißen Konturen … die will ich nicht, egal wo … Kanten sollen direkt in
die dicke Outline am Rand übergehen, wie aus einem Guss“; „du hast hier nichts behoben … es fehlt immer noch die dunkle Kontur beim
Mund“; „wenn etwas überlappt, entsteht eine Kante … egal wo“):** Version 13 hatte die Linien am Umriss nur ausgeblendet (Lücke zur
Outline) und die Maulstelle an einer anderen Form nachgestellt; seine Stelle war nicht behoben. Jetzt (Logo-Look, Commit `3979efa6`):
- **Kante an jeder Überlappung:** Konturstreifen aus der Form (`streifenBauen` in `blaupause.ts`): je Dreieck, dessen Ecken vom Blick
  verschieden kippen (Normale ⟂ Blick), ein Stück Kontur; als Streifen nach außen auf das Verdeckte, nach außen nach hinten gekippt
  (läuft aus, wo das Verdeckte dicht dahinter liegt), Tiefentest gegen den Körper. Entsteht auch an eng aufeinanderliegenden Teilen und
  am offenen Maul, wo die verjüngende Kontur (umgestülpter Körper, bleibt zusätzlich) nichts zeigte.
- **Keine dünnen weißen Konturen:** keine Höfe um Linien, nichts über der dicken Kontur (auch keine weichen Linien), Punkte ohne hellen
  Saum (auf harten Linien weiße Vollpunkte). Linien etwas weiter vor der Fläche (vorher Treppen an steilen Stellen).
- **Wie aus einem Guss:** Beide TikTok-Platten beginnen innen am Körper — das Petrol liegt überall direkt an, Rosa und Lila nur außen
  (vorher innen je nach Seite ein schmaler Streifen, die „Lücke zur dunklen Outline“). Kanten laufen bis in die Outline.
- **Maul:** Die Linie des Mauls ist immer eine harte, dunkle Kante; das Innere im Ton des Grunds.
- Nachstellen wie Florian: Kugel, mit F eine schmale Form vorn über den Umriss zeichnen, wählen, „Fressen“ an/aus (Skript
  `maul-bauen.cjs` im Scratchpad der Sitzung, Ablauf in der Beschreibung). **Offen:** Konturstreifen enden an manchen Stellen stumpf statt
  spitz (wo die Kontur hinter eine Fläche läuft).
Artefakt Version 14, Bild `docs/progress/editor/editor-kante-ueberlappung-2026-11-12.png`.

**Danach (Florian 12.11.: „jetzt fehlt der innere TikTok-Effekt und die automatischen Kanten verjüngen nicht schön smooth auf 0,
meistens brechen sie einfach ab mit einer Kante“):** Mit „Abstand zur dunklen Outline“ war die Lücke durch das Ausblenden gemeint, nicht
der innere TikTok-Streifen → TikTok innen wieder wie vorher (jede Platte ab ihrer versetzten Silhouette). Die Konturstreifen aus der Form
(Version 14) sind wieder entfernt: Im Vergleich (`__teststand.bild` blendet Teile aus) zeichnete die verjüngende Kontur jede geprüfte
Überlappung selbst und lief spitz aus; die Streifen lagen voll breit darüber und endeten stumpf (auch mit Breite nach dem Tiefenabstand
und mit gekippter Tiefe nicht anders, ihr Ende ist der Rand des Stücks, nicht die verdeckte Fläche). Die einzige echte Lücke war der Rand
des offenen Mauls → harte Maul-Linie (bleibt). Ebenfalls geblieben: keine Höfe, nichts über der dicken Kontur, einfarbige Punkte, Linien
weiter vor der Fläche. Commit `3d74f0a7`, Artefakt Version 15, Bild `docs/progress/editor/editor-kanten-spitz-tiktok-2026-11-12.png`.

**Danach (Florian 12.11.: „kann ich beides haben — den TikTok-Effekt innen, so groß wie den außen … und die Konturen gehen trotzdem zur
dunklen Linie“, „harte Linien, die über die Kontur zur Rückseite laufen, in voller Breite in die Kontur“, dann klärend: „das Innere der
dunklen Kontur wird der Umriss und der innere TikTok-Effekt läuft weiter innen“):** Beide Platten beginnen am Körper, die dunkle Kontur
liegt direkt am Umriss. Den inneren TikTok-Streifen malt der Körper selbst (`logoMat`): am Umriss die Farbe der nach innen versetzten
Platte, so breit wie außen (doppelter Versatz in Richtung der Normale), Abstand zum Umriss aus dem Feld im Inneren (`glanzFeld(…, false)`,
halbe Auflösung). Linien und Konturen liegen darüber und laufen direkt ins Petrol. Ein Zwischenschritt (Streifen zwischen Körper und
Petrol, Linien per „Brücke“ hinübergeführt) ist verworfen. Commit `a61f3c87`, Artefakt Version 16, Bild
`docs/progress/editor/editor-tiktok-innen-2026-11-12.png`.

**Danach (Florian 12.11.: „Mach den TikTok-Effekt doch bitte wieder so wie vorher, aber ohne die Brücken zur Outline“):** Der innere
Streifen liegt wieder zwischen Körper und Petrol (außerhalb des Körpers), so breit wie der äußere (die nach außen versetzte Platte beginnt
innen beim doppelten Versatz: `qA = min(dE, 2·dA − dE)`); kein Streifen auf dem Körper, keine Brücke — Linien enden am Körperrand.
Commit `0c32a375`, Artefakt Version 17, Bild `docs/progress/editor/editor-tiktok-ohne-bruecken-2026-11-12.png`. Server 5194
(„kurven-alt“) war aus und ist über die Vorschau neu gestartet.
