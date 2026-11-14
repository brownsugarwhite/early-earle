# Wesen-Editor — Gedächtnis

Wird zusätzlich zur Root-`CLAUDE.md` geladen, sobald eine Sitzung in `apps/editor` arbeitet. **Kurz halten.** Das alte
Gedächtnis des Electron-Editors (Käfig-Zeit) liegt in `docs/verlauf/2026-11-12-editor-gedaechtnis-alt.md`.

## Was hier liegt

- **`kurven.html` + `src/form/kurven.ts`:** der Editor, der zählt (immer mit `?gewichte=geometrie`). Daneben `verfeinern.ts`
  mit `verfeinern.worker.ts` (Rechnen im Hintergrund) und `ablage.ts` (Sichern und Laden, Dateien in `wesen/`).
- **`editor.html` + `src/form/editor.ts`, `blaupause.ts`, `lava.ts`:** derselbe Editor im Layout der Blaupause (`/editor`).
  Gehört der Design-Sitzung; nicht anfassen. `editor.ts` ist eine Kopie von `kurven.ts`.
- **`form.html` + `src/form/main.ts`** und alles übrige unter `src/` (Electron-App, Käfig-Editor): eingefroren.
- **`scripts/pruefen/`:** Proben. Die für `kurven.html` heißen `form-*`; viele gehören zu alten Ständen.

## Starten

```bash
EDITOR_WEB=1 pnpm --filter @ee/editor exec vite --port 5197 --strictPort
```

- Aus dem Wurzelordner des Arbeitsbaums. Einträge in `.claude/launch.json`: `kurven-alt` (5194, Florians Fenster),
  `kurven-bau` (5197, Bau). Vor einem Start `lsof -nP -iTCP:<port>` prüfen.
- Adresse: `http://localhost:<port>/kurven.html?gewichte=geometrie`. Schalter: `&dreiecke=<n>` (Größe des Startnetzes),
  `&form=bohne`, `&behalten=0` (immer die Startform). Die übrigen rund 25 Schalter sind Vergleiche alter Stände (Liste im
  Archiv der Übergabe, Abschnitt 7).
- **Kleines Rechennetz** (Schritt 2 des Plans vom 12.11., seit demselben Tag Standard): Startnetz mit 2 000 statt
  6 000 bestellten Dreiecken, dichter nach der Krümmung der Haut (`&genauHaut=0` schaltet das ab, `&genauFlaeche=<Anteil der
  Startkante>` stellt die Genauigkeit). `&netz=dicht` ist das Netz wie bis zum 12.11. Eine Form mit feinerem Netz wird beim
  Laden vergröbert (`netzVergroebern`). Der Browser behält je Netz eine eigene Form (Fächer „zuletzt-klein“ und „zuletzt“).
- **Glatte Anzeige** (Schritt 1 des Plans vom 12.11., seit demselben Tag Standard): `&anzeige=grob` schaltet sie zum Vergleich
  ab; `&fein=0|1|2|3` legt die Stufen der Verfeinerung fest, `&ruhe=<n>` die Durchgänge beim Beruhigen der Normalen. Rechnung in
  `src/form/glattPlan.ts`, Einbau in `kurven.ts` (`glattAnlegen`, `glattZeigen`, `hautMaterial`). Test-Haken `__kurven.glatt()`
  (null mit `&anzeige=grob`) und `__kurven.zeichnenMs()`.
- **„Form halten“** (B, fertige Haut direkt bewegen; 13.11.): von Florian ausprobiert und abgelehnt („Gefällt nicht“). Kein
  Knopf, keine Taste; zum Nachrechnen `&ziehen=direkt` oder `__kurven.halten(true)` (`LoopZug` mit der Art `direkt`,
  `dicht/direktZug.ts`, Probe `scripts/pruefen/form-halten-probe.mjs`). Nicht wieder vorschlagen, ohne dass er danach fragt.
- **Über die Mitte gezogen** (Schritt 4a, 13.11., auch in Florians Fenster): lose wie bisher, dazu Punkte, wo eine
  Linie die Mitte kreuzt, und der Punkt hinter der Mitte markiert; ihn löschen macht den Schnitt fest (`mitteFest` im Fenster,
  `mitteFestmachen` in `dicht/mitteSchnitt.ts`: Der Rand des Lochs wird ein Loop mit Kante); K am Rand macht ihn rund. Nur in
  der Grundform und ohne Maul. Probe im Fenster: `GPU=1 node scripts/pruefen/form-donut-fenster.mjs` (`NAME=<Form>` für eine
  gesicherte Form).
- **Rechnung auf der Hälfte** (Schritt 4b, erster Teil, 13.11.; seit dem 13.11. nachmittags auch in Florians Fenster): Der Löser faltet auf die
  Hälfte (`HautOptionen.halb`, im Fenster Standard, `&halb=0` schaltet es ab); das Netz bleibt ganz. Dazu „flüssig zuerst“: eine
  weitere Runde je Bild nur, wenn sie samt Anzeige in 14,5 ms passt (`&bildms=0`: nur das feste Budget, `&budget=<ms>` stellt
  es). Messen: im Kern `form-halb.ts`, im Fenster `GPU=1 HALTEN=0 NAME=<Form> node scripts/pruefen/form-halten-probe.mjs`.
- **Kante mit eigenem Winkel** (13.11.; nur in `form-bau`): Ein Punkt einer Linie kann den Knick der Haut quer über die Linie
  angeben (`LoopPunkt.knick`, Grad, nach innen); dazwischen gleitet er. Kern `packages/shape/src/dicht/kantenWinkel.ts`:
  `LoopZug` bindet für jede solche Linie die erste Reihe der Haut innen als Loop ohne Kette mit und rechnet ihre Ziele vor
  jeder Runde neu (um die Linie gedreht, gegen die Haut außen gemessen). Nur eingesetzte Ringe, nur in der Grundform. Messen:
  `__kurven.knickGemessen(id)`; Kern-Probe `form-kante-winkel.ts` (`DREIECKE`, `NAME=<Form>`, `LOSLASSEN=1`, `MEHR=<Runden>`).
- **Maul formen** (Schritt 6, 13.11., dritte Fassung; nur in `form-bau`, Knopf „Maul formen“): Am gewählten Ring wird die
  Maullinie hart und trägt ihren Knick selbst (95° an den Lippen, 70° am Mundwinkel); keine Mittellinie, kein Punkt im Maul.
  Läuft schon eine Mittellinie durch beide Lippen, knickt stattdessen ihr Griff nach innen (zweite Fassung; `&maulWeg=mitte`
  legt sie zum Vergleich an). Kern: `maulFormen` und `maulFormenSchritte` (`maulFormen.ts`); das Fenster zeigt die Schritte
  (`maulSchritt`, `&maulRunden=<n>`: Runden je Bild) und sperrt so lange die Eingaben. Der Ring trägt danach `maulGeformt`.
  Das Maul aus der schmalen Form mit eingesetztem Inneren (`maulAmLoop`) besteht daneben weiter. Proben: `GPU=1 node scripts/pruefen/form-maul-formen-fenster.mjs` (Kugel),
  `GPU=1 NAME=<Form> node scripts/pruefen/form-maul-formen-form.mjs` (eine gesicherte Form), `form-maul-einfach.ts` (Kern, zweite
  Fassung), `form-linien.ts` (eine gesicherte Form lesen), Tests `maulFormen.test.ts`, `kantenWinkel.test.ts`. Die erste
  Fassung (durchgestanzt, Querlinie) liegt in `90b98322`.
- **Kieferknochen am geformten Maul** (Etappe 2, 13.11.; nur in `form-bau`): „Fressen“ und die Regler arbeiten an einem Ring
  mit `maulGeformt` (ein harter Ring wird beim ersten „Fressen“ einer): Kern `maulGeformtAmLoop` (`maulLoop.ts`), im Fenster
  `maulSchnitt`. Nichts wird weggeschnitten oder eingesetzt; der Kiefer reicht so weit unter die Lippe, wie sie lang ist; innen
  weich vom Boden zum Gaumen. Proben: `form-kiefer-geformt.ts` (Kern, Bildblatt zu und offen), `GPU=1 [NAME=… RING=…] [ALT=1]
  node scripts/pruefen/form-kiefer-fenster.mjs`.
- **Maul aus nur einer Linie** (14.11.; nur in `form-bau`): Ein offener Strich mit F (Seite: vom Umriss vorn, ein Ende vor dem
  Körper, zum Mundwinkel; Front und Top: über die Mitte gezogen oder von ihr aus) wird ein Ring mit `maulLinie` (Grad, 20): Die
  Linie ist die Oberlippe, die Unterlippe ihr um den Mundwinkel gedrehtes Abbild (Kern `maulLinie.ts`: `maulLinieAusZeichnung`,
  `zwillinge`, `zwillingeSetzen`, `zwillingeFestlegen`, `zwillingeAngleichen`). Er wird gleich geformt
  (`maulLinieErstellen` → `maulFormenGewaehlt(standDavor)`: ein ⌘Z nimmt Linie und Maul zurück) und ist dann das Maul der Form.
  Gerechnet wird diese leicht geöffnete Lage; der Regler „Maul“ zählt von „zu“ (`maulZu`, `knochenJetzt`; `knochenWinkel` mit
  `zuBis`). In der Grundform zieht ein Punkt seinen Zwilling mit (`verschiebungen`, `Zug.punktD`; Griffe in `zugBewegen`);
  Kreuzungen, Doppelklick und Löschen halten die Lippen gepaart; der Mundwinkel bleibt Ecke. In der Pose wird die Maullinie nicht
  gezogen (`maulLinieInPose`): Bearbeiten im geschlossenen Zustand gehört zu Schritt 5. Proben: `form-maul-linie.ts` (Kern),
  `GPU=1 [ANSICHT=front] [MITTE=1] node scripts/pruefen/form-maul-linie-fenster.mjs`. **Stand 14.11.: hält nur an einer Form
  ohne Linien durchs Maul** (Kugel, Strich in Seite oder Front). Kreuzt eine andere Linie das Maul (Mittellinie, Loop auf einer
  Seite: so sind Florians Formen), verlieren die Lippen ihre Paarung, und `MITTE=1` erfüllt den Punkt „fern vom Maul bleibt die
  Form“ nicht (siehe Fallen). Nicht weiterbauen, bevor das Maul-System beschrieben ist (`docs/UEBERGABE.md`, Abschnitt 7.16).
- **Die Pose rechnet in ihrer Ruhe** (Schritt 5, Etappe 2, 14.11.; nur in `form-bau`): In der Pose sind `haut` und `loops` die
  Ruhe der Pose (Grundform plus Versatz), `grund` die Grundform. Die Knochen drehen nur, was gezeigt wird: `hautZeigen`,
  `baenderZeigen` und `blattZeichnen` laufen über `alsAnzeige` (dort stehen in `haut` und `loops` die gedrehten Kopien,
  `inAnzeige` ist wahr; auch `zug.lagen` und `zug.griffeNeu` sind dann gedreht). Die Abbildung eines Zugs gilt für das Gezeigte
  und wird je Punkt mit dessen Winkel zurückgedreht (`inDerRuhe`); die Regler setzen nur die Winkel. Gespeichert wird die Pose als
  Versatz gegen die Grundform: `pose.delta` (Haut) und `pose.linien` (Punkte und Griffe der Linien). **Am geformten Maul** ist
  die Ruhe der Pose eine Form wie die Grundform (dieselbe Rechnung, genaue Linien, Setzen und Aufräumen im Hintergrund); neue
  Punkte, Linien und Löschen gibt es dort nicht (`nurInGrundform`). **Am Maul aus der schmalen Form** bleibt die Rechnung wie
  bis zum 14.11. (`altePose`). **Der Pfad einer Linie wird in der Pose aus der Ruhe genommen** und Stelle für Stelle mit dem
  Winkel der Haut dort gedreht (`anzeigeVon` hält dafür die Linien der Ruhe, solange gezeichnet wird): im Blatt
  `stueckeGezeigt` (Stücke, längs derer sich der Winkel ändert, abgetastet; die übrigen als Kurve wie in der Grundform), für die
  Bänder im 3D-Bild und die glatte Kante der Haut `pfadStuecke` (je Kante der Haut das Stück der Ruhe, an seinen Enden gedreht).
  Die drei Blätter zeichnet `blaetterZeichnen` mit einem Drehen für alle. Die Haken der Proben melden in der Pose das Gezeigte;
  `ruheLagen`, `ruheLoops`, `ruheUmgeschlagen` geben die Ruhe, `pfadRest` misst in der Ruhe, `pfadRestGezeigt` die gezeichnete
  Linie gegen die gezeigte Haut, `blaetterMs` das Zeichnen der Blätter. Probe: `GPU=1 [NAME=…] [RING=…] node
  scripts/pruefen/form-pose-fenster.mjs` (an „maul handgemacht test“).
- **Die Pose geht mit der Grundform mit** (Schritt 5, Etappe 3, 14.11.; nur in `form-bau`): Pose = Grundform plus Versatz, für
  die Haut je Punkt des Netzes (`pose.delta`), für die Linien je Punkt und Griff (`pose.linien`, dazu die Stelle `s` jedes Punkts
  und die Länge der Linie). Drei Dinge halten das zusammen: (1) Wächst das Netz in der Pose, liegt ein neuer Punkt auf einer
  Linie in der Grundform genau auf deren Pfad, an derselben Stelle wie in der Pose (`grundAufPfad` in `netzGewachsen`). (2) Beim
  Verlassen zählt der Blendshape gegen die Grundform, wie sie danach ist (`poseVerlassen`). (3) Beim Betreten bekommt jede Linie
  ihren Versatz für die Punkte, die sie jetzt hat (`poseVersatzFuer`: gleiche Stelle = gleicher Punkt; ein neuer Punkt teilt den
  Versatz, wie er das Stück der Grundform geteilt hat; ohne Zusammenhang wird die Linie an der Haut der Pose abgelesen), und die
  Haut der Pose setzt sich auf ihre Linien, jede Probe an ihrer Stelle (`linienAufPfad` mit `behalten`, ab `POSE_GENAU`). Probe:
  `GPU=1 [NUR=0ABCD] [DIAG=1] node scripts/pruefen/form-pose-mitgehen-fenster.mjs` (gemeinsame Teile in `form-pose-teile.mjs`).
- **Abzweigungen** (14.11.; nur in `form-bau`, Zwischenschritt im Plan): eine offene Linie, die an Punkten anderer Linien hängt
  und sie mit ihnen teilt (gleiche `kreuzung`). Im Modell ein `ring` mit `Loop.haengt = [Anfang, Ende]`; `endeAufMitte(l, 0 | 1)`
  sagt, ob ein Ende auf der Mittelebene liegt (der Ring wie bisher) oder hängt. **Im Fenster, mit P:** Klick auf einen Punkt oder
  eine Linie beginnt sie (`abzweigBeginnen`: auf einer Linie ohne Punkt entsteht er sofort, `punktAufLinie`; das Werkzeug bleibt
  an), Klick auf die Haut setzt einen Punkt dazwischen (Klick = Ecke, Klicken und Ziehen = glatt), Klick auf einen anderen Punkt
  oder eine andere Linie beendet sie (`abzweigWeiter` → `abzweigungErstellen`); ⌫ nimmt den letzten Punkt zurück, Esc bricht ab
  (`abzweigAbbrechen`). Oder in einem Zug: auf dem Anfang drücken, auf dem Ende loslassen. Vom Punkt auf das Spiegelbild seiner
  Linie endet sie auf der Mitte. **Im Kern:** `abzweigen(h, loops, von, nach | 'spiegel', id, naechsteKreuzung, ueber)` in
  `einsetzen.ts`: von Punkt zu Punkt (auch über die gesetzten, `AbzweigPunkt`) der Schnitt der Haut mit der Ebene durch beide
  Punkte und ihre mittlere Normale, die kürzere der zwei Richtungen; jede gekreuzte Kante wird geteilt (spiegelgleich, andere
  Ketten bekommen den Punkt); ein gesetzter Punkt wird ein Punkt des Netzes (`eckeBei`). Kommt der Weg einem Punkt einer
  eingesetzten Linie näher als
  `ABZWEIG_NAH` (0,5) mittlere Kanten, läuft er über diesen Punkt und teilt ihn. Danach `kreuzungenSuchen`, `eckenAuto`,
  `griffeAnlegen` mit Punkten dazwischen nur, wo der Pfad sonst weiter als `ABZWEIG_GENAU` (0,25) Kanten neben dem Weg läge.
  Löschen: Ein Punkt, an dem eine Abzweigung hängt, bleibt; eine Linie, an der Abzweigungen hängen, geht nur zusammen mit ihnen.
  Proben: `form-abzweigung.ts` (Kern, Florians Beispiel; `KANTE=1`), `GPU=1 [NAME=…] node
  scripts/pruefen/form-abzweigung-fenster.mjs` (Fenster, an „test_kaputt“, mit Klicks), Test `abzweigung.test.ts`. **Noch nicht
  gebaut:** der Griff eines glatt gesetzten Punkts, wie er gezogen wurde (der Punkt wird nur glatt, seine Griffe passt
  `griffeAnlegen` an), ein freies Ende.
- **Linienbreiten** (13.11.): 3 Bildpunkte am Knick, ein halber an runden Punkten, dazwischen verjüngt (`haerteBei` im Kern;
  `baenderZeigen` mit Breite je Punkt, in den Blättern `kantenFlaeche` und die Klasse `kante-band`). Probe:
  `GPU=1 node scripts/pruefen/form-kante-verjuengung-fenster.mjs`.
- Test-Haken im Fenster: `window.__kurven` (`zeiten()`, `lagen`, `loops`, `ablage`, `beschaeftigt` …).

## Prüfen

- Fenster, aus `apps/editor`: `npx vitest run src/form/`.
- Kern, aus `packages/shape`: `npx vitest run src/dicht/ src/loeser/zerlegung.test.ts` (etwa 20 s).
- Typen: `pnpm --filter @ee/shape typecheck` und `pnpm --filter @ee/editor exec tsc --noEmit -p tsconfig.json`.
- Lint nur für geänderte Dateien: `pnpm --filter @ee/editor exec eslint <dateien>`. `prettier` nicht auf `src/form/` (lange
  Zeilen sind dort Absicht).
- Proben im Fenster: `node scripts/pruefen/<probe>.mjs` aus `apps/editor`, Adresse über `KURVEN_URL=…`. Für alles, was Zeit
  misst, `GPU=1` (ohne rechnet der Software-Renderer jedes Bild rund 100 ms). Nie gleichzeitig mit vitest; währenddessen keine
  Dateien unter `src` ändern.
- Proben im Kern: aus `packages/shape` mit `npx vite-node ../../apps/editor/scripts/pruefen/<probe>.ts`.
- Beweis „Haut direkt aus den Linien“ (Schritt 3, 13.11.): `form-direkt.ts` rechnet alle Fälle in rund 45 s, mit
  `BLATT=<pfad ohne Endung>` auch die Bilder aus dem Kern (`form-direkt-blatt.ts`, ohne Fenster). Gesicherte Formen lädt
  `formLaden` in `form-direkt-faelle.ts` wie das Fenster (lose Loops eingesetzt, auf das kleine Netz vergröbert). Der zweite
  Beweis „B“ (fertige Haut direkt bewegen, biegen, anfassen) ist `form-direkt-b.ts` (20 s). Die heutige Rechnung auf einem Teil
  der Haut (`LoopZug` mit Bereich, `kurven`) läuft davon; nicht darauf bauen.
- Donut (Schritt 4, 13.11.): `form-donut.ts` (verschmelzen allein: der Rand bleibt eine Kante) und `form-donut-regel.ts`
  (Florians Regel: beim Loslassen geschnitten, an den neuen Kreuzungen Punkte ohne Knick, der Rand ein neuer Loop; hält mit der
  heutigen Rechnung). Gemeinsame Teile in `form-donut-teile.ts`. Wer die Haut an der Spiegelebene schneidet, legt Punkte dicht
  an der Ebene selbst auf die Ebene (`verschmelzen` mit `fangen`): An den schmalen Dreiecken sonst kommt die heutige Rechnung
  auf feinem Netz nicht zur Ruhe.

## Was man nicht verletzen darf

- **Spiegelpaare:** Die Haut ist ganz und spiegelgleich, jeder Punkt hat seinen Partner (`haut.spiegel`), Punkte der
  Mittelebene liegen genau bei z = 0. Einsetzen, Teilen und Zusammenlegen erzeugen nur Paare. (Das ändert sich mit Schritt 4
  des Plans: dann ist die Hälfte die Wahrheit.)
- **Ein Ring ist die Hälfte z ≥ 0**, seine Enden liegen auf der Mittelebene; dort hat ein Punkt zwei Griffe.
- **Eine Kreuzung ist ein Punkt:** Punkte zweier Loops mit derselben `kreuzung`-Nummer sind derselbe Ort.
- **Linie = Bézier-Pfad** in der Grundform und, seit dem 14.11. in `form-bau`, in der Pose am geformten Maul. In der Pose am
  Maul aus der schmalen Form (`altePose`) rechnet ein anderer Löser (`HautZiele`, mit Gedächtnis).
- **Werte je Punkt nach jedem Netzwechsel umordnen** (Blendshape, Knochenwinkel, Stand des Lösers).
- **Der Stand entscheidet:** Was der Hintergrund rechnet, gehört zu einem Stand (`standZahl`) und wird nur angewendet, wenn er
  noch derselbe ist.
- **Seit der Zusammenführung vom 11.11.:** Linien dürfen durch die Spiegelebene, die Anzeige schneidet ab (`anzeigeZ`). Keine
  Wand im Löser.

## Fallen

- Jede Änderung unter `src` lädt das Fenster neu; Florian sieht jede Zwischenfassung, wenn er den Port offen hat
  (`lsof -nP -iTCP:<port>` zeigt, wer zusieht).
- Fenster-Proben sind nicht genau wiederholbar (die Runden je Bild hängen an der Uhr). Zeiten nur als Verhältnisse lesen.
- Unter Playwright behält das Fenster nichts (`navigator.webdriver`); `&behalten=1` schaltet es ein.
- Proben warten auf `zeiten().beschaeftigt`, nicht auf feste Zeiten, und prüfen vor einer Abstandsmessung, ob die Lagen
  endlich sind. Große Stände erst am Ende aus dem Fenster holen (das Übertragen hält es an).
- Zählungen an der gerechneten Haut sehen auch, was hinter der Spiegelebene liegt und gar nicht gezeigt wird.
- Der Körper zeigt eine eigene, verfeinerte Geometrie (glatte Anzeige). Die groben Puffer (`hautLagen`, `anzeigeZ`) werden
  weiter gefüllt: An ihnen messen die Proben und hängen die Strahltreffer. Für die Schattierung der glatten Anzeige die
  Normalen nie nach der Fläche gewichten (sie kippen auf ungleichmäßigem Netz zur dichteren Seite) und beim Mitteln kein
  Gewicht nehmen, das schon bei kleinen Winkeln fällt (`glattPlan.ts`, `normalenUndGewichte`, `feldBeruhigen`).
- Mit einem einzelnen Loop hält die heutige Rechnung die Haut nicht (der erste Griff ruckt).
- Mit dem kleinen Rechennetz hat die Startkugel 1 500 Punkte und eine Startkante von rund 15. Proben, die feste Punktzahlen
  oder Orte auf dem alten Startnetz erwarten, mit `&netz=dicht` laufen lassen. Ein überall gleich grobes Netz (`&genauHaut=0`)
  lässt kleine Details zusammenfallen: Die Verfeinerung nach Krümmung gehört zum kleinen Netz.
- Wer in der Ruhe etwas vorbereitet (wie `direktBereiten`), darf die Lagen der Haut nicht anfassen, auch nicht um
  Rundungsreste: `standZahl` ändert sich sonst, und der Hintergrund beginnt immer wieder von vorn.
- Eine Probe, die „ihren“ Punkt nach einem Zug nach der Lage wiederfindet (weitester von der Mitte), greift an einer Form mit
  vielen Kreuzungen danach einen anderen: die Kennung der Kreuzung merken. In der Front liegen bei großen Formen andere Punkte
  vor dem gesuchten (`ZUGBLATT=top` in `form-donut-fenster.mjs`).
- Die Anzeige legt Punkte hinter der Mitte auf die Mitte (`anzeigeZ`), sie schneidet keine Dreiecke: Wer „gezeigt vorher“ mit
  einer geschnittenen Haut vergleicht, sieht am Rand bis zu einer Kante Unterschied.
- `loesenSpalten` der Zerlegung ist nur für 1, 3 und 6 Spalten ausgeschrieben (dazu `loesenZwei`); jede andere Zahl läuft über
  den allgemeinen Weg und braucht je Spalte rund viermal so lange. Eine Vorlage aus zerlegten Systemen immer mit
  `vorlageAusSystemen` bauen (auf der Hälfte sind es drei Systeme, nicht zwei).
- Wird eine Runde kürzer, rechnet das Fenster mehr Runden je Bild: Nach jeder Beschleunigung des Lösers die Bilder im Zug
  messen (Median und 95 %), nicht nur das Rechnen je Bild.
- Geometrie nie fertig ins Netz bauen und die Rechnung darauf loslassen (ein eingeschweißtes Maul kam in acht Fassungen nicht
  zur Ruhe). Formen heißt: an Linien ziehen, in Schritten, die Haut folgt; dazwischen verfeinern wie nach einem Zug.
- Eine neu geschnittene Linie mit nur zwei Punkten dicht beieinander läuft in einem Stück um den ganzen Körper: Die Kugel wird
  zur Zitrone (um 21 bis 28 verformt). Florian (13.11.): kein Fehler, „das logische Ergebnis“, solange er keine Haltelinien
  gezogen hat; keine Punkte von selbst dazusetzen (`griffeAnlegen` mit `punkteBis` war die erste, abgelehnte Antwort).
- Eine Kante an einem Punkt reicht bis zu den Nachbarpunkten. Soll sie nur ein Stück weit gelten, braucht die Linie dahinter
  einen Punkt mit `kante: false`.
- Kreuzt eine neue Linie eine alte dicht an einem ihrer Punkte (Mundwinkel), wird dieser Punkt die Kreuzung; sonst liegen dort
  zwei Punkte, und die Griffe des Mundwinkels verteilen sich auf beide.
- Eine geschlossene Linie mit nur zwei Punkten dicht beieinander (die Mittellinie an den Lippen) nie glatt anlegen: Ein
  Griffpaar auf einer Geraden für das kurze und das lange Stück legt ihren Pfad bis 190 neben die Kugel. Erst die Kante, die
  sie kreuzt (dann ist sie dort eine Ecke und jede Seite passt für sich).
- An einer solchen Linie die Griffe nie von selbst ausrichten (Ecke → glatt, „Kante aus“): Sie sind mehrere Hundert lang, der
  Körper stülpt sich um.
- Ein einzelner Ring bestimmt die Form nicht: Ohne kreuzende Linie und ohne Angabe des Knicks landet die Haut je nach Netz
  woanders (Maul ohne Mittellinie: Knick an den Lippen 93°/100° oder 39°/68°). Dafür gibt es `LoopPunkt.knick`.
- Wer in Schritten rechnet und unterwegs verfeinert, braucht eine Obergrenze für das Netz (ein davongelaufener Lauf wuchs auf
  433 000 Punkte und hielt Minuten).
- `falten().umgeklappt` zählt am spitzen Mundwinkel auch an Florians eigenen Modellen 6 Dreiecke: nicht als „nichts
  umgeschlagen“ prüfen, sondern gegen diesen Stand.
- Eine harte Linie, die ihren Knick trägt, nie erst allein setzen lassen (ohne Angabe verzieht ein einzelner Ring die Form: an
  der Kugel um 9) und nie in einem Schritt weich schalten: Eine weiche Linie misst an einem Knick eine riesige Krümmung, die
  Rechnung läuft auseinander.
- Wer `LoopZug` ändert: Die Führungen stehen hinter den Loops der Form im Plan; `start` und `lagen` zeigen nur die Loops der
  Form. `loopStruktur` muss dieselben Bindungen sehen wie `LoopZug`, sonst passt eine fertige Zerlegung nicht.
- Das Gewichtsfeld der Kiefer (`kieferFeld`) kennt die Form nur als Raster in der Seite: An dünnen Stellen (Kieferspitze)
  liegt ein Punkt außerhalb und bekommt 0. Neben den Lippen deshalb über die Haut verteilen, nicht das Feld lesen. Und: Seine
  Kieferdicke ist die Dicke der Form am Mundwinkel; sitzt der Mundwinkel an der Rückseite der Form, ist sie fast null.
- Gewichte, die der Reihe nach über die Punkte verteilt werden, am Ende je Spiegelpaar mitteln (sonst ist die Pose nicht mehr
  spiegelgleich).
- Ein Punkt, an dem eine Linie umkehrt (der Mundwinkel eines Keils), muss vor `griffeAnlegen` eine Ecke sein; als glatter Punkt
  bekommt er dort einen unsinnig langen Griff (gemessen 12 Millionen, das Netz wuchs danach auf 131 000 Punkte).
- Eine schmale Form als einzige runde Linie zieht eine Kugel ohne Haltelinien zusammen: Eine Maullinie ist von Anfang an eine
  Kante. Und umgekehrt: Mit einer Kante als einziger Linie hält über die ganze Haut gerechnet nichts die Größe (beim Formen
  blies sich die Kugel von 150 auf 420 auf). „Maul formen“ ohne Mittellinie hält deshalb die Haut fern vom Maul mit Bindungen
  an ihrem Ort (`halteLoop`; weiter als `MaulFormenOptionen.umkreis` × Ausdehnung der Maullinie, Standard 0,75) und rechnet über
  die ganze Haut. Nur im Umkreis gerechnet lief auf dem feinen Netz die Tasche davon.
- „Maul formen“ (Weg „Kante“) kann auf einem feinen Netz davonlaufen (4 900 Punkte: in der letzten von zwölf Stufen bricht ein
  Punkt der Rückwand der Tasche aus; Ursache nicht behoben). `maulFormenSchritte` formt dann von vorn mit doppelt so vielen,
  halb so großen Stufen (höchstens zweimal). Im Fenster sieht man den ersten Versuch ausbrechen, bevor es neu ansetzt
  (`&netz=dicht`: 21 s, Meldungen „Computed radius is NaN“ in der Konsole): Davonlaufen früher erkennen, den Stand nicht zeigen.
- `loopEinsetzen` (Ring), seit dem 14.11.: An einer Kehre der Linie (über 140°, der Mundwinkel eines Keils) setzt es zwei Punkte
  ins Netz, auf der Achse durch die Kehre einen davor und einen dahinter (keinen auf der Kehre selbst: zwei Punkte der Kette am
  selben Ort brechen die Spiegelzuordnung), und lässt den Weg auf der Kante zwischen ihnen umkehren, genau an der Kehre. Kanten,
  die der Weg zweimal kreuzt, werden vorher zwischen den Kreuzungen geteilt (`kantenTeilen`, spiegelgleich); beim Ablaufen wird
  das Startdreieck quer zur Kante gewählt. Geht es mit Kehren nicht, wird ohne sie eingesetzt (wie vorher: die Spitze bis 14
  Einheiten abgeschnitten). `einsetzenGrund` sagt, warum es null ergab.
- Kreuzungen an einer schmalen Form: `kreuzungenSuchen` hält einen Fund für schon vorhanden, wenn ein Kreuzungspunkt desselben
  Loop-Paars näher als 8 × `TOL` liegt (2 mittlere Kanten, im Rechennetz rund 30). Liegen die Lippen enger beieinander, bekommt
  die zweite Lippe ihre Kreuzung nicht oder später doppelt (an `test_kaputt`: zwei Punkte der Mittellinie am selben Ort, die
  Maullinie mit 6 statt 7 Punkten, `zwillinge` null, das Maul schließt mit 2,8 Spalt).
- Ein geschlossener Loop ohne Punkte (mit L geschnitten) bekommt mit seinen ersten zwei Punkten einen Pfad (`punktEinfuegen`,
  `vorher <= 1`), auch wenn zwei Kurvenstücke seinen Verlauf nicht beschreiben. Liegen beide Punkte dicht beieinander (die
  Kreuzungen mit einem Maul), verliert er seine Form: Mittellinie an der Kugel, Abstand der hinteren Hälfte von der Mitte 150 →
  49 bis 205, mit dem Maul aus zwei Linien genauso. Schon ein Ring quer durch eine Mittellinie ohne Punkte drückt die Kugel vorn
  um 9 ein. Florians Formen haben Mittellinien mit 4 bis 38 Punkten.
- `punktEinfuegen` mit `aufPfad` setzt den Punkt an den Teilungspunkt des Stücks beim Anteil der Bogenlänge; auf einem langen
  Stück liegt der einige Einheiten neben der Stelle, an der sich die Ketten kreuzen (gemessen 6,5 auf einem Stück über 210°).
- Ein offenes Ende liegt seit dem 14.11. nicht mehr immer auf der Mittelebene: nach `endeAufMitte(l, 0 | 1)` fragen, nicht nach
  `art === 'ring'`. Umgestellt sind `loops.ts` (Lagen, Pfad, Griffe, `ringEnde`, Nachbarn längs der Kette), `loopNeu`,
  `loopErgaenzt`, das Ende von `verdichten`, `richtung.ts` und im Fenster `zFest`, `zGrenzen` und die Auswahl fürs Maul (eine
  Abzweigung ist kein Maul-Ring). `ablage.ts` trägt `haengt` von selbst (Test). Noch nicht durchgesehen: `mitteSchnitt.ts` (eine
  Abzweigung über die Mitte gezogen), `kantenWinkel.ts` (Knick an einer Abzweigung), `folgen.ts`, `raumlinien.ts`, die Pose.
- Eine lange Linie mit nur zwei Punkten kann der Haut nicht folgen: Ihr einzelnes Kurvenstück wird der Pfad, und `linienAufPfad`
  zieht die Haut dorthin (gemessen: Eine Abzweigung vom Flügel von „test_kaputt“ zur Mitte verzog die ganze Form, 38 Dreiecke
  umgeschlagen). Deshalb `griffeAnlegen(…, punkteBis)` bei Abzweigungen. Dieselbe Schwäche haben Loops mit zwei Punkten.
- In der Pose außerhalb von `alsAnzeige` nie davon ausgehen, dass `haut` und `loops` die gezeigte Lage sind (das war bis zum
  14.11. so). Wer einen Ort im Blatt braucht (Treffer, Mitte der Auswahl), dreht ihn mit dem Winkel seines Punkts (`gedreht`,
  `winkelBei`) oder rechnet in `alsAnzeige`. Ein Stand, der vor dem 14.11. in der Pose gesichert wurde, enthält die gedrehte Lage:
  `standAnwenden` dreht ihn einmal zurück (`pose.inRuhe` fehlt dort).
- Zieht man an „maul handgemacht test“ die Spitze des Unterkiefers (ein Punkt an der Mittelebene) 25 nach unten, schlagen 8 bis
  10 kleine Dreiecke an der Mitte um, in der Grundform wie in der Pose. Das ist keine Sache der Pose.
- Eine Bézier-Kurve, die sich mit den Knochen dreht, ist nur dort wieder die Kurve aus gedrehten Punkten und Griffen, wo sich
  der Winkel längs des Stücks nicht ändert. Im Übergang zwischen Kiefer und Schädel lag die so gezeichnete Linie an „maul
  handgemacht test“ bis 13,26 neben der gezeigten Haut (die Haut selbst stimmte; Stand 2c, am 14.11. behoben). Wer in der Pose
  etwas aus `l.punkte` und den Griffen der gedrehten Kopie zeichnet oder misst, nimmt den Pfad der Ruhe und dreht je Stelle
  (`stueckeGezeigt`, `pfadStuecke`). Nicht gemessen: Im Übergang ist ein Griff nicht genau die Tangente der gezeigten Linie.
- **Pose und Grundform teilen die Stelle jeder Probe auf ihrem Pfad** (dasselbe t in beiden). Wer nur auf einer Seite die
  Stellen neu vergibt (`pfadParameter`, in `linienAufPfad` ohne `behalten`), verschiebt die andere beim nächsten Wechsel längs
  ihrer Linien. Und: Ein Wert, der für neue Punkte des Netzes aus den Nachbarn gemittelt wird (Blendshape, Lage der Grundform),
  stimmt an einer Linie nicht, wo sich ihr Versatz längs ändert (gemessen bis 2 daneben): dort aus dem Pfad nehmen.
- Das gemeinsame Netz richtet sich nach der Lage, in der gerade gearbeitet wird: Ein Zug in der Pose verfeinert und räumt auch
  das Netz der Grundform auf (ihre gebliebenen Punkte liegen, wo sie lagen; die Fläche weicht um die Feinheit des Netzes ab).
- Proben im Blatt: Im Seitenblatt liegen Punkte verschiedener Linien hintereinander; die Maus greift, was vorn liegt (so zog eine
  Probe statt eines Lippenpunkts die Kreuzung am Gaumen). Punkte wählen, vor und hinter denen kein anderer liegt (`freiImBlatt`
  in `form-pose-mitgehen-fenster.mjs`). Das erste „Fressen“ richtet das Maul ein und ordnet dabei die Punkte der Linie neu: den
  Stand der Grundform erst nach einem ersten An und Aus nehmen.
- **P wird geklickt, nicht gezogen** (Florian, 14.11.: „es werden keine punkte gesetzt wenn ich mit p auf eine linie klicke. Das
  wekzeug springt dann sofort wieder raus“): Die erste Fassung kannte nur Drücken, Ziehen, Loslassen; ein Klick galt als Anfang
  und Ende am selben Ort. Jede Geste eines Werkzeugs zuerst mit einzelnen Klicks prüfen, die Probe genauso.
- Kehrt der Weg einer Abzweigung an einem gesetzten Punkt um wie eine Haarnadel, kreuzt er dieselbe Kante zweimal: `abzweigen`
  teilt sie zwischen den Kreuzungen und sucht neu (`doppeltGekreuzt`, wie am Mundwinkel). Ohne das waren zwei Punkte der Kette
  nicht verbunden.
- `kreuzungenSuchen` hält auch ein knappes Vorbeilaufen (näher als `TOL`) am Ende einer Linie für eine Kreuzung und setzt dort
  einen zweiten Punkt an dieselbe Stelle. `abzweigen` führt den Weg deshalb über nahe Punkte; für andere neue Linien gilt das nicht.
- Im Fenster sind die Punkte der Spiegelseite nicht zu greifen: Unter dem Zeiger liegt dort die gespiegelte Linie (`data-m="1"`,
  ohne `data-i`); `punktAufLinie` findet den Punkt an der Stelle.
- Verläuft eine Abzweigung flach neben ihrer Linie los, kreuzt ihr Weg (ein ebener Schnitt) dieselbe Linie nach einer Weile noch
  einmal; dazwischen liegen beide dicht beieinander. Das ist richtig gerechnet, aber selten gewollt.
- Das Bildblatt des Kerns (`blattSchreiben`) zeichnet Linien nur vor der Mitte des Bilds und schließt geschlossene Linien nicht:
  für ein sauberes Bild die Linien selbst übergeben (`fertig`), die Mitte des Bilds hinter die Stelle legen.
- Nach dem Einsetzen einer spitzen Form die Nadeln wegräumen (`nadelnZusammenlegen`, im Fenster `nadelnWeg`), bevor weiter
  gerechnet wird. Fallen zwei Punkte der Linie auf einen Ort, ordnet `hautAus` die Spiegelpartner über gerundete Lagen falsch zu,
  und alles, was danach das Netz neu aufbaut, scheitert (so fiel `knickReihe` aus).
- `umgeschlageneZahl` und `falten` zählen jedes Dreieck gegen die Normalen seiner Ecken, außen und Tasche gemischt: Die steile
  Wand der Tasche am Mundwinkel zählt mit (an der Kugel 2), ein gefaltetes Maul viel mehr. Getrennt zählt `form-maul-linie.ts`.
- Kern-Bilder (`blattSchreiben`) sind flach schattiert und übertreiben jede Unruhe; ob etwas ruhig aussieht, im Fenster ansehen
  (Unruhe messen: `form-kante-winkel.ts`, Knick zwischen Nachbardreiecken; Florians Modelle liegen gesichert bei 5,6° bis 6,3°,
  nach jedem Neurechnen bei rund 7°).
- **Vor Arbeit an `kurven.ts` oder am Löser lesen:** `docs/verlauf/2026-11-11-uebergabe-kurven.md`, Abschnitt 3 (Karte von
  `kurven.ts`) und Abschnitt 4 (Fallen, was schon kaputtging).
