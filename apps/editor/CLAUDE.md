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
- **Vor Arbeit an `kurven.ts` oder am Löser lesen:** `docs/verlauf/2026-11-11-uebergabe-kurven.md`, Abschnitt 3 (Karte von
  `kurven.ts`) und Abschnitt 4 (Fallen, was schon kaputtging).
