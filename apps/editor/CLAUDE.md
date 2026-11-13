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
- **Maul formen** (Schritt 6, 13.11., zweite Fassung; nur in `form-bau`, Knopf „Maul formen“): Am gewählten Ring wird die
  Maullinie hart, die Mittellinie (angelegt, wenn sie fehlt: zwei Punkte an den Lippen) knickt an beiden Lippen um 95° ins Maul;
  im Maul kein Punkt. Kern: `maulFormen` und `maulFormenSchritte` (`packages/shape/src/dicht/maulFormen.ts`); das Fenster zeigt
  die Schritte (`maulSchritt`, `&maulRunden=<n>`: Runden je Bild) und sperrt so lange die Eingaben. `&maulMitte=0`: die nur zum
  Formen angelegte Mittellinie am Ende wieder entfernen (der Knick ist dann nicht eingestellt, er hängt am Netz). Der Ring
  trägt danach `maulGeformt`; „Fressen“ und die Regler gibt es daran noch nicht (Meldung). Das Maul aus der schmalen Form mit
  eingesetztem Inneren (`maulAmLoop`) besteht daneben weiter. Proben: `GPU=1 node scripts/pruefen/form-maul-formen-fenster.mjs`
  (Fenster), `form-maul-einfach.ts` (Kern, mit Bildblatt; `OHNE_MITTE=1`, `MITTE=1`, `DREIECKE=3000`), `form-linien.ts` (eine
  gesicherte Form lesen: Punkte, Griffe, Knicke), Test `maulFormen.test.ts`. Die erste Fassung (durchgestanzt, Querlinie) liegt
  in `90b98322`.
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
- **Linie = Bézier-Pfad nur in der Grundform.** In der Pose rechnet ein anderer Löser (`HautZiele`, mit Gedächtnis).
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
- Ein einzelner Ring bestimmt die Form nicht: Ohne kreuzende Linie landet die Haut je nach Netz woanders (Maul ohne
  Mittellinie: Knick an den Lippen 93°/100° oder 39°/68°).
- Wer in Schritten rechnet und unterwegs verfeinert, braucht eine Obergrenze für das Netz (ein davongelaufener Lauf wuchs auf
  433 000 Punkte und hielt Minuten).
- `falten().umgeklappt` zählt am spitzen Mundwinkel auch an Florians eigenen Modellen 6 Dreiecke: nicht als „nichts
  umgeschlagen“ prüfen, sondern gegen diesen Stand.
- **Vor Arbeit an `kurven.ts` oder am Löser lesen:** `docs/verlauf/2026-11-11-uebergabe-kurven.md`, Abschnitt 3 (Karte von
  `kurven.ts`) und Abschnitt 4 (Fallen, was schon kaputtging).
