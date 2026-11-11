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
| **Teststand** (echte Linien, echtes Netz, ziehbare Griffe), veröffentlicht | https://claude.ai/artifact/YL4ZhsiUQT9aVfcjZFBHga |
| Quelle des Teststands, Bauen, Bilder | `teststand/` hier (Abschnitt 10) |
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
