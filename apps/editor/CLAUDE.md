# Wesen-Editor — Gedächtnis

Wird zusätzlich zur Root-`CLAUDE.md` geladen, sobald eine Sitzung in `apps/editor` arbeitet. **Kurz halten.** Das alte
Gedächtnis des Electron-Editors (Käfig-Zeit) liegt in `docs/verlauf/2026-11-12-editor-gedaechtnis-alt.md`.

## Was hier liegt

- **`src/form/werk.ts`** (seit 16.11., Ozzy Phase 1): Zustand und Handgriffe einer Form, Bildtakt `bildRechnen`, ohne DOM und
  three.js; die Anzeige über die Haken `anzeige`, geteilter Zustand `G`. **`kurven.html` + `src/form/kurven.ts`** ist die Hülle
  darum (Anzeige, Tasten, Test-Haken): das Prüffenster des Kerns (immer mit `?gewichte=geometrie`). Daneben `verfeinern.ts`
  mit `verfeinern.worker.ts` (Rechnen im Hintergrund) und `ablage.ts` (Sichern und Laden, Dateien in `wesen/`).
  Der Schnitt `kurven.ts` → `werk.ts` + Hülle ist wiederholbar: `scripts/werk-schnitt/schnitt.mjs` (Anleitung im Kopf). Ozzy ändert an
  der Rechnung nichts (Florian, 16.11.); `neuAusUmriss` (Form aus einer Silhouette) und `zugGriffRaum` (S6b: ein Zug am Griff um eine
  Verschiebung im Raum, mit seiner Zustimmung) sind neue Handgriffe aus bestehenden; im Schnitt-Skript vermerkt.
  **Ozzy** (`ozzy.html`, `src/ozzy/`) benutzt dasselbe Werk: Haken in `main.ts`, Schalter in `adresse.ts`, die glatte Anzeige in
  `werkHaut.ts` (aus `glattAnlegen`/`glattZeigen` von `kurven.ts` übernommen: Ändert sich die Anzeige dort, hier nachziehen).
  Bearbeiten in Ozzy (Phase 5.2): `werkBlatt.ts` ist der `Raum` der Linien-Studie (`src/linien/verhalten.ts`) aus dem Werk: je Bild alle
  Linien des Werks auf allen Flächen als ein Netz (Bildschirm), Ziehen und Drehen als Handgriffe des Werks mit Blattkoordinaten
  (`zugStarten`, `griffZugStarten`, `zugBewegen`, `zugEnde`). Probe `scripts/pruefen/ozzy-bearbeiten-fenster.mjs` (vergleicht mit
  `kurven.html`).
  **Seit dem 17.11. (Plan `docs/plans/2026-11-17-ozzy-stabil-schnell.md`, Etappe A):** Ozzy meldet dem Werk nach jedem Bild seine
  Kosten (`werk.bildRestMelden`, sonst greift „flüssig zuerst“ nicht). Muster und Dehnung der Seifenhaut sind stetig (`werkHaut.ts`:
  `uebernehmen` über Dreiecke beim Netzwechsel, `GlattPlan.mischen` beim Verfeinern, Übergabe von der Blase über ihren Bezug). Die
  Stufen der Anzeige richten sich nach der Größe im Bild (`werkHaut.bildMass`, `stufenFuer`; `?fein=<n>` legt sie fest). Der Fluss
  der Dicke ist eine Textur (`src/anfang/haut.ts`, `RAUSCH_…`); ohne sichtbare Blase zeichnet die Haut nur den Grund
  (`HautWerte.leer`), und ihr teures Ziel ist nur so groß wie der Kasten der Form im Bild (`HautWerte.ausschnitt`, `hautAusschnitt`
  in `main.ts`; wer etwas Neues in die Zeichenfläche der Haut zeichnet, das außerhalb dieses Kastens liegt, muss ihn erweitern). **B1 (17.11.):** Beim Drücken bestimmt `Verhalten.zielJetzt()` das Ziel für genau diesen Ort
  (vor `druecken`; bis dahin griff nur, was seit dem Bild davor am Zeiger hing). `?zeiger=system`: Der Zeiger des Systems vertritt den
  gezeichneten, solange dieser auf der Hand läge (`zeigerSystemSchritt` in `main.ts`; Probe `ozzy-zeiger-fenster.mjs`).
  **B2 (17.11.):** Eine Fläche bildet mit Tiefe ab (`Flaeche.hin(X, Y, T?)`), solange sie `raeumlich` ist (nicht längs ihrer Achse
  gesehen: ein Feld oder eine Ansicht wendet sich); dann stehen auch in der Seite beide Hälften im Netz (seine Struktur wechselt). In
  Ruhe zeigt die Seite die Hälfte, die zum Betrachter zeigt (`F.vorn`). Für die Felder ist `feldAbbildung` (`main.ts`) die eine
  Abbildung für Linien, Körper und Tiefe; wer dort etwas Neues zeichnet, nimmt sie (Probe `ozzy-wenden-raum-fenster.mjs`).
  `werkBlatt.bauen` baut nur, wenn sich seine Zeile ändert (`signatur`): **Wer `bauen` etwas Neues lesen lässt, trägt es dort ein**,
  sonst bleiben die Linien stehen. **B3 (17.11.):** Taste W zeigt im Raum das Kurvennetz auf der Form (weißer Körper, eine räumliche
  Fläche im Blatt der Achse, die dem Blick am nächsten liegt; `raumNetz` in `main.ts`). Auf einer räumlichen Fläche rechnet
  `Flaeche.her(x, y, T)` in der Tiefe des gegriffenen Orts: Wer dort etwas Neues greifen lässt, gibt die Tiefe mit. Florian meint mit
  „Netz“ und „Wireframe“ das Kurvennetz, nie die Dreiecke (`?netz=1|2` ist nur eine Prüfhilfe). **B4 (17.11.):** Nach ⌘Z fließt
  auch die Haut zurück (`werkHaut.rueckfluss`, über `werkBlatt.mitRueckfluss`). Merke: Das Netz vor und nach einem Zug hat keine
  gemeinsamen Nummern (verdichten ordnet neu); wer zwei Stände Punkt für Punkt vergleicht, braucht eine Zuordnung über die Fläche. Alle Proben: `node scripts/pruefen/ozzy-alle.mjs`; messen: `ozzy-karte-messen.mjs`, `ozzy-zug-messen.mjs`
  (gemeinsame Teile und „Flicken“ für Versuche ohne Eingriff in den Arbeitsbaum: `ozzy-teile.mjs`).
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
  gesicherte Form). **Seit dem 18.11. (Clipping, Plan `docs/plans/2026-11-18-ozzy-objekte-spiegel-naehte.md`):** Mit
  `werk.G.clipping` (Standard an) entsteht die Naht beim Loslassen von selbst (`mitteFest(true)` am Ende von `zugEnde`, sobald
  `ueberDerMitte()`), ohne eigenen Schritt für ⌘Z, und ist gewählt. `?clipping=0` gibt die Regel vom 13.11. zurück (damit läuft
  `form-donut-fenster.mjs`). In Ozzy schneidet die Anzeige im Zug je Bildpunkt ab: `werkHaut.spiegelSeite` setzt `netz.seite`
  nur an den Dreiecken, in denen eine Hälfte hinter der Ebene liegt (sonst 0: Ein Schnitt überall ließ längs der Mitte einen
  Streifen frei), `HautWerte.spiegelSchnitt` und `FesteWerte.spiegelSchnitt` schalten ihn. Wer ein neues Material baut, das die
  Haut des Werks zeigt, braucht denselben Schnitt (`aSeite`). Probe: `ozzy-donut-fenster.mjs` (`KUGEL=1`: frische Kugel).
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
- **Warum ein neuer Löser „empfindlich anlief“** (18.11., C1; der Anlauf von 16 Runden ist wieder heraus): An dünnen Stellen an der
  Mittelebene klappte die intrinsische Triangulierung Kanten der Mittelebene, die zwei Seiten bekamen verschiedene Gewichte, und die
  Rechnung auf der Hälfte (die eine Seite für beide nimmt) kam nie zur Ruhe; dazu war ein Schritt der Korrektur nicht begrenzt
  (300 Einheiten für einen Punkt mit Kanten von 3,6). Behoben in `ausKurven.ts`: `festGefaltet` (auf der Hälfte bleiben die Kanten
  der Mittelebene fest) und `SCHRITT_MAX` (kein Punkt wandert durch die Korrektur weiter als eine Kantenlänge je Runde). Wer die
  Hälfte ändert: Alles, was je Punkt gemessen oder gewichtet wird, muss für beide Seiten gleich herauskommen. **Eine Linie allein
  legt die Dicke nicht fest:** Eine Klinge (ein einzelner Punkt der Mitte weit hinausgezogen) kommt nicht zur Ruhe und behält
  umgeschlagene Dreiecke; das ist eine Frage an Florian (Feinschliff), kein Netzfehler.
- **Aufräumen im Kern nachstellen** (18.11.): `npx vite-node ../../apps/editor/scripts/pruefen/form-aufraeumen.ts <stand>` aus
  `packages/shape` rechnet den Auftrag des Fensters Schritt für Schritt (Sekunden statt Minuten); den Stand liefert Ozzy über den
  Haken `standGepackt` (Base64 einer `.wesen`-Datei), die umgeschlagenen Dreiecke einzeln `__ozzy.umgeschlagen()`. Ein Modul für
  einen Lauf ändern, auch im Hintergrund: `FLICKEN='{"**/datei.ts*":[["suchen","ersetzen"]]}'` vor jeder Probe mit `ozzy-teile.mjs`.
- **Zählungen zuerst prüfen** (18.11.): Vier der neun Züge des Messblatts ließen eine Linie sich selbst kreuzen (dann räumt das Werk
  mit Absicht nicht auf), zwei griffen eine Richtung statt eines Punkts. Die Probe `ozzy-zuege-fenster.mjs` greift nur Punkte und
  wertet Züge mit gekreuzter Linie nicht. 30 Bildpunkte an der Wand sind rund 150 Einheiten.
- **`verdichten` übernimmt die Spiegelpaare, mit denen es rechnet** (18.11.), statt sie aus gerundeten Lagen neu zu lesen: Ein Paar
  dichter als 0,0005 an der Mittelebene verlor sonst seine Paarung (der eine wurde sein eigenes Spiegelbild, der andere stand danach
  ohne da, und die Rechnung schaltete still auf die ganze Haut um). Wer sonst `hautAus` auf einen Stand mit solchen Paaren ruft, hat
  dieselbe Falle.
- **Umgeschlagene Dreiecke richtet `verdichten` auf** (18.11., `aufrichten`, Standard an; `nadelnZusammenlegen` ohne): Kante drehen,
  Ecke längs der Fläche rücken, kurze Kante zusammenlegen. Harte Punkte zählen als Bezug nicht (an einer Kante ist die Falte
  gewollt). Im Zug wechselt `verfeinern` dafür allein kein Netz ein; das Aufräumen richtet zum Schluss noch einmal auf.
- **P quer über die Form** (C2, 18.11.): `werk.vorhangSchneiden(a, anker)` (Kern `loopAusVorhang`: Schnitt mit dem Vorhang durch
  den Strich; `stelleImBlatt`, `wendeStellen`, `griffeAufStrich`, `vorhangWeg`). Ein Strich, der im Leeren beginnt und endet und mit
  ↩ beendet wird (`StiftWerk.schliessen(false)`), ist ein Loop rundum; auf dem ersten Punkt geschlossen (`schliessen(true)`) eine
  Form auf der Haut. Merke: (1) Ein Loop, der vorn und hinten über denselben Strich läuft, braucht Punkte an den Umkehrstellen
  (verdeckt, `vonSelbst`), sonst liegt sein Pfad 10 bis 25 Einheiten daneben. (2) Der Strich ist je gezeichnetem Stück gleichmäßig
  im Kurvenparameter abgetastet (`stiftStrich`): Nur dann stimmt die Ableitung in `griffeAufStrich`; an einem gezeichneten Punkt
  treffen zwei Stücke mit verschiedenem Tempo aufeinander (einseitig ableiten). (3) Eine Kreuzung mit einer vorhandenen Linie teilt
  deren Punkt: Dort liegt der neue Loop bis einen halben Bildpunkt neben dem Strich. (4) `aufraeumen` richtet zum Schluss auch auf,
  wenn nur gesetzt wurde (`AufraeumAuftrag.aufrichten`); `aufrichtenJetzt` gleich nach dem Schnitt. Proben:
  `ozzy-p-schnitt-fenster.mjs`, `ozzy-p-ueberall-fenster.mjs` (zwölf Lagen, 160 s), Kern `form-vorhang.ts`, Test `vorhang.test.ts`.
- **Gewichte und Vermessen auf der Hälfte (D1, Teil 1, 18.11.):** `intrinsisch.ts` (`halbNetzVon`, `intrinsischeGewichteHalb`),
  `vermessen(…, halb)`, `hautNormalenHalb`. Merke: (1) Spiegeln kehrt den Umlaufsinn um: Das Spiegelbild der Halbkante a→b ist
  b′→a′ (ihr Eintrag steht bei b′). (2) Verglichen wird mit `HautOptionen.gewichteGanz` (Kern `form-halb.ts`, Test
  `halbNetz.test.ts`); welche Kante geklappt ist, darf sich unterscheiden, wo vier Punkte auf einem Kreis liegen (Gewicht null):
  Verglichen wird, was der Löser liest (Summe der Gewichte je Nachbar). (3) Ein Netz mit einem verkehrt herum gespeicherten Dreieck
  hat keine Hälfte (dann wie bisher über die ganze Haut); der Fisch der C1-Probe ist so eins. (4) Die Rechnung setzt genau
  spiegelgleiche Lagen voraus, wie die Faltung des Lösers.
- **Langsame Bilder im Zug (D1, Teil 2, 18.11.):** (1) Was im Zug nur ab und zu neu gerechnet wird, nie für mehrere Dinge im selben
  Bild (die drei Tiefenkarten der Wände: `werkBlatt.karteFuer`, `karteZuletzt`). (2) Ein Netzwechsel im Zug kostet ein Bild von 25
  bis 55 ms: Der Hintergrund meldet `wenig`, wenn nur zusammengelegt würde (unter 2 % der Punkte), dann wechselt das Werk nicht
  und fragt nach `VERFEINERN_PAUSE_MS` wieder. (3) Zum Suchen: je Bild die Teile aus `__ozzy.messen` (Werk, Haut, Linien, …, Wände)
  ansehen, nicht nur Median und 95 %; ein Profil des Hauptfadens über das Protokoll des Testbrowsers (`Profiler.start`).
- **Felder (C4, 18.11.):** `src/ozzy/werkFelder.ts`. Ein Feld ist die Haut zwischen Linien; gewählt ist es eine Auswahl von Punkten
  des Werks (`werk.G.auswahl`: die sichtbaren Punkte auf seinem Rand) plus die Tönung. Merke: (1) Es hängt an einer Saat (Ort tief im
  Feld) und wird nach jedem Netzwechsel von dort neu gefüllt; es bleibt nur, solange alle Punkte seines Rands gewählt sind
  (`nachfuehren`, je Bild). (2) Die Tönung ist eine zweite Dreiecksliste auf den Punkten des weißen Körpers
  (`Koerper.toenung` in `fluessig.ts`); sie setzt voraus, dass die feinen Dreiecke eines Dreiecks der Anzeige hintereinander stehen
  (4^Stufen je Dreieck, `GlattPlan.triFein`) und dass die Anzeige alle Dreiecke der Haut zeigt (`werk.anzeigeIndex`). Getönte
  Bildpunkte stehen mit Deckung 0,5 im Puffer des Körpers (daran erkennt die Anzeige sie auf der dunklen Rückseite). (3) Der Klick
  auf die Form in einer flachen Ansicht entscheidet sich erst mit der Bewegung (`feldDruck` in `main.ts`): ohne Weg wählt er, an
  einem gewählten Feld zieht er, sonst beginnt das Drehen am Ort des Drückens. (4) G, S, R (`tastenZug`) sind `werk.zugStarten`
  mit `g`, `s`, `r`; solange er läuft, gehören alle Tasten ihm. (5) ⇧ + Klick schaltet ein Feld um, ohne die Fahrt in die
  Ansicht, die ⇧ sonst beim Loslassen auslöst; der zweite Klick eines ⇧ + Doppelklicks nimmt das Umschalten zurück. Probe
  `ozzy-felder-fenster.mjs`.
- **Gleiten auf der Haut (C3, 18.11.) ist nicht gebaut: Die Form bleibt dabei nicht stehen** (Kernprobe `form-gleiten.ts`, Zahlen im
  Plan unter C3). Die Linien tragen die Form (eine weiche Linie gelöscht: 9 bis 66 Einheiten); 10 Einheiten Gleitweg ändern die Haut
  um 2 bis 6 Einheiten. Wer es doch baut oder misst: (1) die Linie nicht neu einsetzen (`loopEinsetzen` scheitert dicht neben ihrer
  alten Kette), sondern die Punkte des Netzes unter ihr längs der Haut rücken, in Schritten von höchstens 0,3 Kantenlängen, mit
  `verdichten` dazwischen; (2) die Griffe nicht neu aus der Linie lesen (`griffeAnlegen` findet die Griffe seiner Linien nicht
  wieder: 5 bis 14 Einheiten daneben), sondern mitdrehen und je Stück an die Haut anpassen; (3) eine Kreuzung wandert auf der Kette
  der anderen Linie, die bekommt dort einen genau geteilten Punkt (`punktEinfuegen` mit `aufPfad`); (4) immer mit Kontrolle messen
  (Weite 0 muss 0,00 geben), vom ruhenden Stand aus (die gesicherte „strange bird“ liegt bis 18 Einheiten neben ihrer Ruhe).
- **Ein Zug mit dem Einfluss O hängt davon ab, wann das Verfeinern eingewechselt wird** (17.11.): Das Einwechseln setzt den Zug mit
  neuen Gewichten auf; mitten in der Bewegung gibt das andere Lagen der Nachbarpunkte als danach (an „teat firefish“ 1,4 Einheiten
  bei einem Zug um 119). Proben, die Ozzy mit dem Prüffenster vergleichen, ziehen rasch und halten dann, bis das Verfeinern da ist
  (`ozzy-pinsel-fenster.mjs`). Wird ein Fenster schneller oder langsamer, verschieben sich solche Zeitpunkte.
- **Frische Form, Schrittweite (18.11.):** `SCHRITT_MAX` (C1) macht aus einem Davonlaufen (nicht endlich, wird verworfen, die Form
  bleibt) ein Davonkriechen (endlich, „steht“). Mit keiner oder einer Linie hat die Rechnung keinen festen Ausgang: Dieselbe Form
  lief im Mitschnitt einmal ruhig aus (Rauminhalt minus 3 %) und einmal davon (plus 38 %, feineres Netz: das 3,4-Fache). **Sicherung
  im Auftrag (`verfeinern.ts`, `aufraeumen`):** ohne Linien wird nie gesetzt; ändert sich der Rauminhalt über den Auftrag um mehr als
  `RAUMINHALT_GRENZE` (30 %), ohne dass sich eine Linie bewegt hat, gilt der Stand vor dem Setzen, verdichtet und aufgerichtet
  (`abgebrochen` mit Haut). Geprüft wird am Ende, nicht je Stufe (eine Zwischenstufe darf plus 25 % haben und sich wieder setzen).
  Nachstellen im Kern: `form-aufraeumen.ts <stand>` (mit `SCHRITT=0 MITTE=0` wie vor C1); im Fenster die Stufen mitschreiben: ein
  Flicken, der in `setze` `console.log` ruft (die Konsole des Workers kommt bei der Seite an). Der Kern-Nachbau trifft eine frische
  Form nicht genau (das Laden legt sie neu an): im Zweifel im Fenster messen. Merke: Eine Probe für „hält“ misst gegen die
  gezeichnete Form (Umriss, Ausdehnung, Rauminhalt), nie nur, ob die Haut steht; und eine frische Form hat ein zehnmal gröberes
  Netz als seine gesicherten (650 bis 730 statt 3 500 bis 11 400 Punkte), wenn sie mit halber Länge 150 angelegt wird
  (`WERK_HALBMESSER`); die Netzkante ist fest. **Seit dem 18.11. abends legt `werkFormAnlegen` (`main.ts`) größer an, was sonst
  dünner als `WERK_DICKE` (115, halbe Dicke) wäre**, höchstens `WERK_GROESSER`-fach (4); die Dicke ist der größte Kreis, der in die
  Zeichnung passt (`groessterInnenkreis`). Im Bild bleibt die Form gleich groß (`werkHaut.f`). Proben, die eine frische Form
  messen, rechnen darum im Maß des Blatts (Werk geteilt durch `werk().f`), nie mit festen Werk-Einheiten.
- **Materialien (18.11.):** `src/ozzy/material.ts` (`FesteHaut`): Solid (aus `kurven.ts`, Zeile für Zeile) und Zebra (Matcap des
  alten Editors) zeichnen die glatte Anzeige des Werks in ein eigenes Ziel und legen es über den Grund der Seifenhaut
  (`Haut.zeichnen` mit `leer`); `material` in `main.ts` (null = Seifenhaut), Menü und Taste M, `?material=`. Florian will sie exakt
  wie erarbeitet, keine eigene Fassung. **Wachs (19.11., Sitzung „Paint-Modus“):** ZBrushs „MatCap Red Wax“ als drittes festes
  Material, eine Matcap wie die Zebra; das Kugelbild (`src/ozzy/wachs.ts`) ist an Florians Vorlage ausgemessen, der Farbton in OKLCH
  gedreht (Feinregler „Material Wachs“, `?wachs=<Grad>`, 0 = ZBrushs Rot). Merke: (1) Das Ziel von `FesteHaut` hält seitdem 16 Bit
  je Kanal: Es trägt lineare Werte, mit 8 Bit zeigte ein weicher dunkler Verlauf Ringe. (2) Die Kante der hinteren Raumecke liegt
  bei allen festen Materialien als feine Linie über der Form (nicht behoben). (3) Vergleich gegen die Vorlage:
  `scripts/ozzy/wachs-vergleich.mjs` (nimmt die Zeichenfläche der Haut allein, gleich nach `__ozzy.bild()`); Recherche
  `docs/research/2026-11-19-zbrush-grundmaterial.md`. Eigenes Fenster des Strangs: 5215 (`ozzy-paint`), Proben mit
  `OZZY_URL=http://localhost:5215/ozzy.html`.
- **Paint-Modus, Etappe 1 (19.11., Sitzung „Paint-Modus“; Plan `docs/plans/2026-11-19-ozzy-paint-modus.md`, Abschnitt 7 und 9):**
  `src/ozzy/farbe/` (ohne DOM bis auf `anzeige.ts`; Tests `farbe.test.ts`), in `main.ts` das `farbWerk` mit schmalen Nahtstellen
  (Suchwort `malModus`). Taste B, P/Ellipse/Freihand zeichnen über `werkBlatt.stiftZiel` Farblinien statt Linien der Form, ein
  Klick auf die Form im Raum füllt. Merke: (1) Ein Ort ist ein Dreieck des Rechennetzes mit Gewichten; die Bemalung liest das
  Werk nur (Haken `werkSumme` prüft es). (2) Netzwechsel: `punkteZuordnen` verlässt sich darauf, dass `netzGewachsen` die
  gebliebenen Punkte vorn und in ihrer Reihenfolge lässt, und prüft jedes Paar am Ort; wer das im Werk ändert, nimmt der
  Bemalung den Halt (sie fällt dann auf „nächster Ort“ zurück). (3) Gezeichnet wird ohne Schnitt ins Netz: je Bildpunkt Abstand
  und Seite zur Farblinie aus einer Datentextur; das setzt wie `Koerper.toenung` voraus, dass die Anzeige alle Dreiecke der Haut
  in ihrer Reihenfolge zeigt, je 4^Stufen feine. Auf Wachs über `FesteWerte.danach`, auf hellem Solid über `GastWerte.ueberzug`.
  (4) Wer einen neuen Ort baut, an dem Linien stehen, zeichnet im Paint-Modus auch die Farblinien dort (`ruheLinien()` trägt
  sie; die Bedingung ist `ruhende.length || (malModus && !farbWerk.leer)`). (5) Die Bemalung kriecht bei weiten Zügen (das Werk
  rechnet die Haut ohne Gedächtnis neu; Plan 9.3): nicht am Netzwechsel suchen. Proben: `ozzy-farbe-fenster.mjs` (fünf Kriterien,
  `WEITE`, `DIAG`), `ozzy-farbe-form.mjs` (an einer gesicherten Form), Film `scripts/ozzy/paint-film.mjs`. Fallen der Proben
  (Tropfen „Maul formen“ über dem Anfasser, Griff der Raumecke hinter der Form, Einrasten des Zeigers, Kanten messen):
  `docs/look/ozzy/paint/UEBERGABE.md`, Abschnitt 7.
- **Paint-Modus, Etappe 2 (19.11.; Plan, Abschnitt 10 und 11):** `farbe/farbBlatt.ts` ist für die Farblinien, was `werkBlatt.ts`
  für die Linien der Form ist (Schnittstelle `Raum`): Im Paint-Modus bekommt das eine `Verhalten` dieses Modell (`modellSetzen`;
  Schalter `farbAn`: im Raum mit A, P oder Lasso). Merke: (1) Die Punkte einer Farblinie sind einzelne ihrer Orte; eine Richtung
  steht im Maß des Dreiecks ihres Orts (drei Zahlen, Summe null; `kurve.ts`). (2) Die Kurve zwischen zwei sichtbaren Punkten wird
  im Bild gelegt (`stueckImBild`; `BildTreffer` ist ein Raster der Dreiecke im Bild und trifft die glatte Anzeige wie ein Klick),
  im Raum (`stueckLegen`) nur, wenn ein Punkt nicht zu sehen ist: An einer steilen Stelle ist eine Richtung im Raum viel länger
  als ihr Bild, und der nächste Ort der Haut zu einer Kurve fern von ihr springt an Falten auf einen anderen Körperteil. (3)
  Springt die Kurve im Bild auf die Haut hinter einem Überhang, führt `spurImVorhang` den Weg in der Ebene des Blicks (von den
  zwei Wegen um den Ring der kürzere). (4) Die Mitte: Ein Ort genau in der Spiegelebene hat das Gewicht null der Ecke gegenüber
  (`zurMitte`); `ortIn` rückt jeden Ort vom Rand weg, ihn also nie durch `ortIn` schicken. Eine fertige Farblinie endet an der
  Mitte (`linienAusTreffern`: Der längere Teil gilt). Kreuzt eine Farblinie ihr Spiegelbild, liegt die Kreuzung genau auf einer
  Kante des Netzes: Dort teilt `kreuzungenTeilen` nicht, `flaechen.ts` ordnet die zwei Ketten am Rand nach ihrer Richtung (sonst
  läuft die Füllung aus). (5) Was verdeckt ist, entscheidet die Anzeige der Linien über die Tiefe des Körpers (`linienKoerper`
  mit `nurTiefe`); den Namen `farbAn` nie örtlich neu vergeben (so galt die Verdeckung vor der ersten Farblinie nicht). (6) Eine
  Probe an der Kugel reicht nicht: `ozzy-farbe-bedienen-fenster.mjs` (Kugel) und `ozzy-farbe-mitte-fenster.mjs` („strange bird“:
  Überhang, Mitte, Tempo); Film `scripts/ozzy/paint-bedienen-film.mjs`. Was fehlt: Plan 11.4.
- **Paint-Modus, Etappe 3, erster Schritt (19.11.; Plan, Abschnitt 12): Eine Füllung läuft ein.** `farbe/fliessen.ts` rechnet je
  Punkt des Rechennetzes die Weite von der Saat (über die Haut, nur in der Fläche der Füllung), `anzeige.ts` zeigt die neue Farbe,
  wo die Front schon war (`FlussBild` beim Bauen, je Bild nur `flussSetzen`), `farbwerk.ts` führt die Zeit (`fliessen(dt)` vor
  `schritt`, `FLIESSEN.tinte|honig`, Feinregler „Füllen“, `?fuellen=tinte|honig|0`). Merke: (1) Nur längs der Kanten gerechnet
  läuft die Front in Sechsecken: Aus zwei bekannten Ecken folgt die dritte über eine Quelle hinter der Kante (`quelle`), und im
  Inneren eines Dreiecks wird rund statt eben gemischt (`weiteImDreieck`, im Shader `weiteRund`). (2) Der Haufen vergleicht seine
  Einträge mit dem Feld der Weiten: beide doppelt genau, sonst gilt ein Eintrag nach dem Runden als überholt und sein Punkt wird
  nie fertig. (3) An einer Farblinie geht es nur zwischen Ecken derselben Zelle weiter (`Flaechen.rand[].ecken`: ohne Kette
  dazwischen; `flaechenRechnen` führt dafür eine zweite Vereinigung nur innerhalb des Dreiecks); die Anzeige bekommt je Kette und
  Seite drei Weiten, auch für Ecken jenseits der Farblinie (weitergedacht). (4) Ableitungen im Shader nie von Werten nehmen, die
  aus der Datentextur je nach nächster Kette kommen (sie springen): Die Breite der Front kommt aus `dFdx(vWelt)`. (5) Jedes
  `ableiten` beendet ein Einlaufen (Netzwechsel, Handgriff an einer Farblinie, ⌘Z); nur eine eben gesetzte Füllung läuft neu ein.
  (6) Im Testbrowser ist das Einlaufen ohne `fuellen=` aus: Die Proben der Etappen 1 und 2 lesen die Farbe gleich nach dem Klick.
  Probe `ozzy-farbe-fliessen-fenster.mjs`, Film `scripts/ozzy/paint-fuellen-film.mjs`, Tests `fliessen.test.ts`.
- **Paint-Modus, Etappe 3, zweiter Schritt (19.11.; Plan, Abschnitt 13): Farben als Tropfen, Farbtropfen (F), Pipette (I).**
  `farbe/farbLeiste.ts` hält die Farben (Tropfen unter der Leiste, `localStorage` `ozzy.farben`) und meldet an `main.ts`
  (`FarbZiele`: gewählt, Zug, fallen, Mülleimer). Merke: (1) `raumWerkzeug` hat den Typ `LeistenWerkzeug` (`leiste.ts`: die
  Werkzeuge des Blatts, dazu `tropfen` und `pipette`); das Blatt kennt die zwei nicht (`werkzeugGewaehlt` lässt sie nicht durch).
  (2) Mit `farbWerkzeug()` bekommt das Verhalten der Linien keinen Zeiger (wie bei Freihand und Formen: `zeigerWeg`, kein
  `zeigerSetzen`, Ozzys eigener Pfeil): So hängt nichts am Zeiger, und derselbe Weg wie bei A (`farbDruck`) füllt oder nimmt
  auf. `farbAn` gilt dabei weiter, sonst stünden die Farblinien anders da. (3) Das Farbfeld `#farbe-farbe` muss in der Seite
  bleiben: Es öffnet den Farbwähler des Systems (`showPicker`, sonst `click`), und Proben und Filme setzen darüber die gewählte
  Farbe (`input`, `change`). Unsichtbar ist es über Deckung null, nicht über `hidden` (ob ein Feld ohne Kasten den Wähler
  öffnet, ist nicht geprüft). (4) Ein
  Tropfen wird im `pointerdown` der Reihe gefangen (`setPointerCapture`): Beim Ziehen bekommt die Zeichenfläche keine Bewegung,
  der Ort kommt aus dem Ereignis (`farbZug`), nicht aus `zeiger`. (5) Die Tropfen der Leiste, der am Zeiger (`ozzy.html`) und
  das Zeichen des Farbtropfens sind derselbe Pfad; wer einen ändert, ändert alle drei. (6) Mit dem Farbtropfen gilt ⌥ der
  Farbe: `roentgenZiel` nimmt `farbWerkzeug()` aus. Probe `ozzy-farbe-tropfen-fenster.mjs`, Film
  `scripts/ozzy/paint-farben-film.mjs`.
- **Paint-Modus, Etappe 4 (19.11.; Plan, Abschnitt 15): weiche Kanten, der Tropfen am Faden.** Jeder Punkt einer Farblinie kann
  eine Breite tragen (`FarbPunkt.breite`); `weich.ts` rechnet daraus je Punkt des Rechennetzes Abstand, Breite und Füllung
  jenseits, `anzeige.ts` mischt sie in jedem Dreieck aus seinen drei Ecken. Merke: (1) Eine Farblinie ist keine Punktquelle:
  Mit der Quelle hinter der Kante (`quelle` in `fliessen.ts`) kommt der Abstand nahe an der Farblinie zu kurz heraus (2 von 15
  Einheiten); hier gilt die ebene Front (`ueber` in `weich.ts`). (2) Die Breite an einer Stelle ist die der Farblinie an ihrem
  nächsten Punkt, auch wenn sie dort null ist: Das Feld geht darum auch von den harten Stücken einer weichen Farblinie aus,
  sonst stehen neben ihnen Zacken (ein Verlauf, der vom weichen Stück herüberreicht). (3) Rand und Inneres müssen mit denselben
  Werten rechnen: Der Rand rechnete erst seinen eigenen Abstand je Bildpunkt, an jeder Kante zum Nachbardreieck stand eine
  Stufe. Jetzt trägt jede Kette den Abstand der drei Ecken mit Vorzeichen (links positiv), linear gemischt wie innen; die
  harte Kante selbst bleibt die genaue je Bildpunkt. (4) Ohne Breite läuft der alte Zweig der Zeichenprogramme (`uWeich` 0, die
  reinen Materialien): So bleibt das Bild Bildpunkt für Bildpunkt gleich. Wer dort umräumt, prüft das mit Probe 50. (5) Die
  Datentextur hat je Kette fünf Zeilen vor den Punkten (Kopf, zwei Weiten für das Einlaufen, zwei für die weiche Kante). (6) Der
  Tropfen am Faden wird vor dem Verhalten der Linien gegriffen (`weichGriffBei` im Drücken); beim Ziehen bekommt das Verhalten
  trotzdem den Zeiger (`zeigerSetzen`), sonst bleibt sein Pfeil stehen. (7) ⌘Z leert die Auswahl: Danach gibt es keine Tropfen,
  eine Probe liest die Breite dann über `farbPunkte`. Probe `ozzy-farbe-weich-fenster.mjs`, Tests `weich.test.ts`.
- **Paint-Modus, Etappe 5 (19.11.; Plan, Abschnitt 16): Ebenen.** `Bemalung.ebenen` zählt von unten nach oben, `Ebene.aus` ist
  ausgeblendet; `farbwerk.ts` hält je Ebene, die gezeichnet wird, ihren abgeleiteten Stand, `anzeige.ts` je Ebene eine
  `FarbAnzeige`, `FarbStapel` zeichnet alle; der Stapel am Rand ist `farbe/ebenenStapel.ts` (`#ebenen`). Merke: (1) three
  zeichnet alles Deckende vor allem Durchscheinenden, gleich was `renderOrder` sagt: Alle Materialien der Bemalung stehen darum
  in der Reihe der durchscheinenden (`transparent: true`; wo sie decken, ist das Überblenden trotzdem aus). (2) Über dem hellen
  Solid wird multipliziert, dort deckt nichts von selbst: Mehrere Ebenen werden erst gesammelt (`FarbStapel.sammeln`: alle
  Ebenen in ein eigenes Bild, Bildschirmwerte, oben deckt unten) und dann einmal verrechnet, mit dem Körper selbst statt über
  die ganze Fläche (sonst färbt es am Umriss die Stellen neben dem Körper mit) und nur, wo die Tiefe gleich der zuvor
  geschriebenen ist (`invariant gl_Position` in beiden Programmen). (3) Auf Wachs deckt schon das Überlagern; gesammelt wird
  dort nur, wenn eine Ebene über der untersten weiche Kanten hat (überlagert mischte sie im Licht, heller als innerhalb einer
  Ebene) und keine Füllung einläuft. Das Sammeln kostet bei 2880 × 1800 rund 3,5 ms je Bild: nicht ohne Not einschalten. Am
  Umriss steht im Sammelbild alles mal dem Teil des Bildpunkts, den der Körper deckt; für das Wachs steht dieser Teil in einem
  zweiten Bild (sonst schiene am Umriss Wachs durch die Farbe). (4) Ein Ziel mit Kantenglättung gibt nach jedem Durchgang seine
  Farbe frei: Alles, was hinein soll, in einer Szene, ein Durchgang. (5) Neu gerechnet wird nur die geänderte Ebene
  (`geaendert()` meint die aktive; `alt` alle); wer einen Handgriff baut, der eine andere Ebene ändert, setzt `alt`. (6) Was man
  sieht und wo man malt (`aus`, `aktiv`), sind keine Schritte: `sichtUebernehmen` trägt sie in jeden Stand, der zurückkommt
  (⌘Z, zurück auf ein altes Netz). `merken(h)` blendet die aktive Ebene ein; Handgriffe am Stapel rufen `merken(h, false)`.
  (7) Die Haken `farbPunkte`, `farbBreite`, `farbLinieImBild` meinen die aktive Ebene; `farbe().ebenen` zählt von unten,
  `farbEbenen().ebenen` von oben. (8) Was ein Bild kostet, samt Grafikkarte messen (`mitKarte`): Die Zeit von `bild()` allein
  zeigte vom Sammeln nichts. Probe `ozzy-farbe-ebenen-fenster.mjs`, Tests `ebenen.test.ts`.
- **Paint-Modus, Etappe 6 (19.11.; Plan, Abschnitt 17 und 18): die Ebenen-Ansicht** (Florian: „dann fassung b“; schräg versetzt;
  auf Wachs und hellem Solid; X oder der Knopf über dem Stapel). In `main.ts` alles mit `faecher`. Je Ebene, die zu sehen ist,
  eine Kopie: ein Bild im Bild (`s`, `tx`, `ty`) und ein Bereich der Tiefe (`za`, `zb`). Merke: (1) Alle Kopien stehen in einem
  Durchgang (`uBild`, `uTiefe` in den Programmen; `material.ts` `kopienStellen`, `anzeige.ts` `FarbKopie`); je Kopie ein ganzes
  Bild des Wachses kostete das Doppelte. Das helle Solid zeichnet je Kopie ein eigenes Bild (`gast.ts` `kopien`, von hinten nach
  vorn, alle Fenster gleich groß); `src/form/blaupause.ts` bleibt unberührt. (2) Größe und Platz hängen am Kreis um die Form
  (`faecherKreis`), nicht an ihrem Kasten im Bild (`hautAusschnitt`). (3) Gemalt wird an der vorderen Kopie: `farbSicht()` gibt
  dem Blatt der Farblinien ihre Abbildung (`faecherMatrix`), `linienKoerper()` stellt den Körper für die Verdeckung dorthin; wer
  sonst einen Strahl der Kamera braucht, rechnet den Zeiger zurück (`malOrt`, `faecherZurueck`). Im Drücken steht eine Weiche:
  auf einer hinteren Kopie → `faecherDruck` (drehen oder wählen), sonst der gewohnte Weg. (4) Damit die Bewegung mit dem Bild
  von vorher beginnt, zeigt eine Kopie am Anfang auch die Ebenen der Kopien hinter ihr und lässt sie verblassen (`nur`,
  `uSicht`). (5) Zoom und Schwenk seit dem Auffächern gelten dem ganzen Bild der Kopien (`blick0`); beim Zusammenschieben
  kehren sie zurück. (6) Aufgefächert treten Wände, Kanten und Punkt der Raumecke zurück (`faecherStill`), und die Drehung rastet
  nicht ein. (7) Der Platz einer Ebene zählt im Fenster von oben, im Farbwerk von unten. Proben
  `ozzy-farbe-faecher-fenster.mjs`, `ozzy-farbe-faecher-malen-fenster.mjs` (beide auch mit `MATERIAL='helles solid'`),
  `ozzy-farbe-faecher-tempo.mjs`.
- **Bilder und Filme: den Blick setzen, nicht mit der Maus drehen (19.11.).** Beim Loslassen läuft die Form mit Schwung nach
  (`schwung`), je nach Takt verschieden weit: Dieselben Schritte geben jedes Mal ein etwas anderes Bild, und feste Stellen im
  Skript treffen dann daneben. `__ozzy.blickSetzen({ gier, neigung, zoom, schwenkX, schwenkY })` setzt den Blick ohne Schwung
  (Zoom bis 12; das Mausrad endet bei 4). Wo eine Stelle auf der Form gebraucht wird, sie suchen (`farbOrtFrei`, `farbTiefe`),
  nicht festschreiben (`scripts/ozzy/paint-weich-szene.mjs`). Haut und Linien lassen sich getrennt aufnehmen: nach
  `film(true)` und `bild()` sofort `#haut.toDataURL()` und `#linien.toDataURL()`.
- **Jelly und helles Solid (18.11., `src/ozzy/gast.ts`):** `BlaupauseBild` aus `src/form/blaupause.ts` läuft unverändert als Gast
  auf der eigenen Fläche `#gast` (zweiter WebGL-Renderer mit Kantenglättung, über `#haut`, unter `#linien`). Was der Gast tut: (1)
  den Grund verbergen (`Reflect.get(bild, 'hgNetz')`: ein privates Feld; benennt die Design-Sitzung es um, steht eine Warnung in der
  Konsole und der dunkle Grund ist wieder da, die Probe fällt); (2) die Haut für Ozzys räumliche Kamera verzerren (quer zum Blick mal
  Abstand der Mitte / eigener Abstand, Normalen mit dem transponierten Kehrwert), denn der Renderer rechnet Tiefe und Dicke nur
  parallel; `gast().abweichung` misst das Bild gegen Ozzys Kamera (0,00 Gerätepunkte); (3) das Fenster des Renderers auf die Haut im
  Bild beschneiden (alle seine Durchgänge kosten nach Fläche); (4) Bläschen, Bodenkontakt, Lava und Maße wie `rendern` in
  `editor.ts` (dort kopiert; ohne Auge, Lava-Uhr steht); (5) helles Solid: Logo-Look mit `kontur: 0, rand: 0` und davor die Fläche
  des Körpers in Petrol im Kreis versetzt (gleichmäßige Kante um den Umriss). **Falle:** In ein Ziel mit Kantenglättung (`samples`)
  kann `zeichne` nicht umgeleitet werden: Es zeichnet ein Fenster in mehreren `render`-Aufrufen, und three gibt nach jedem die
  Farbe des Ziels frei (`invalidateFramebuffer`). Darum die eigene Leinwand. `finish()` wartet im Browser nicht auf die
  Grafikkarte; zum Messen einen Bildpunkt zurücklesen (`gast(true)`).
- **Grün (18.11., `src/ozzy/gruen.ts`):** das Earle-Material (`createCreatureMaterial`, `@ee/render`) mit der Palette „Blob“
  (`src/three/wesenLook.ts`), aufgesetzt wie `Renderer3D.ts`; auf `#gast-earle` mit dem WebGPU-Renderer von three (`?backend=webgl`
  erzwingt WebGL 2), per `import('./gruen')` erst bei Wahl geladen. Die Kamera bekommt Ozzys Matrizen; für WebGPU wird die Zeile
  der Tiefe umgerechnet (0 bis 1 statt −1 bis 1) und `coordinateSystem` vorab gesetzt, sonst rechnet three die Projektion neu. Die
  16 Werte je Ecke stehen auf null bis auf `eeSpine.w = 1` (Rücken: kein Bauch, Punkte überall) und `eeRegion.y` (weit weg von einer
  Maulkante); `eeRest` ist die Form vom Boden aus. Der Bauch kommt später (Florian); dann braucht es Bauch und Rücken je Ecke.
  Die Konsole warnt beim Übersetzen vielfach „Return statement used in an inline 'Fn()'“ (wie im alten Editor, kein Fehler).
- **Objekte, Etappe 1 (18.11., Plan `docs/plans/2026-11-18-ozzy-objekte-spiegel-naehte.md`):** Werkzeug `objekt` (V, dunkler
  Zeiger) neben `auswahl` (A, weißer Zeiger); `objektModus()` in `main.ts`. Im Objekt-Modus ist `bearbeitenAn` falsch (das
  Verhalten bedient die Linien nicht, sie werden schlicht gezeichnet, ohne Punkte); `pErlaubt` hängt deshalb an `stabil`, nicht an
  `bearbeitenAn`. `objektUnter(x, y)` sagt, ob die Form unter dem Zeiger liegt (im Raum Strahl gegen die Haut, flach der Ort im
  Blatt). Die Füllung des Zeigers ist fest (`Szene.zeigerFarbe`: 1 weiß, 2 dunkel), nur der Rand tauscht auf der Rückseite. L ist
  „Verbundenes wählen“ (`verbundenesWaehlen`), das Lasso liegt auf Q: Proben, die mit V „zurück zur Auswahl“ meinten, drücken jetzt A.
  Merke: Eine Regel in `werkBlatt.auswahlAbgleichen`, die Ankern mehr Auswahl gibt, als das Verhalten gesetzt hat, ändert dessen
  Zustand (ein ganz gewählter Loop zeigte alle seine Punkte gewählt; danach verlor P den ersten Klick, Probe `ozzy-p-schnitt`).
- **Spiegel und freie Form (Etappe 2, 18.11.; Plan wie oben, Abschnitt 4):** Es gibt zwei Arten von Haut. *Verschmolzen* (wie
  immer: Spiegelpaare, die Linien sind die Hälfte z ≥ 0) und *frei* (`hautFrei`: kein Punkt hat einen Partner, jede Linie ist ein
  geschlossener Loop für sich, Art `paar`, dazu Abzweigungen; „Spiegel aus“). `werk.istFrei()`, `werk.spiegelStand()` (`clip`,
  `an`, `aus`), `werk.spiegelAus()` (verschmolzen → frei, Kern `spiegelAnwenden`), `werk.mitteFest()` (frei → verschmolzen, wenn das
  Objekt über die Ebene reicht; `freiSeite()`, `clipSeiten()`). Merke: (1) Das Spiegelbild einer freien Form ist nur Anzeige
  (`G.spiegelbild`): Wer die Haut des Werks zeigt, nimmt `werkHaut.zeigeNetz` (Netz samt Spiegelbild), nicht `werkHaut.netz`; die
  Linien spiegelt `werkBlatt` mit `werk.spiegelbildGilt()`. (2) Die Werkzeuge des Kerns lesen die Art an der Haut ab und setzen an
  einer freien nichts spiegelgleich (`kantenTeilen`, `dreieckTeilen`, `loopEinsetzen`, `loopAusVorhang`, `formAusZeichnung`,
  `abzweigen`, `verdichten`): Wer ein neues Werkzeug baut, das teilt oder einsetzt, fragt `hautFrei` und gibt es an `hautAus`
  weiter (`ohnePaare`), sonst findet ein Punkt nahe z = 0 sich selbst als Partner. (3) An einer freien Form zählt, von welcher
  Seite man die Ansicht sieht: `G.stift.vorn` und der letzte Parameter von `abzweigungErstellen` tragen `Flaeche.vorn`,
  `werk.vonHinten` übersetzt es für den Kern (`strahl`, `formAusZeichnung` mit `hinten`). (4) Eine freie Form nicht weit vom
  Ursprung weg rechnen: Der Löser hängt am Abstand (bei 3 000 Einheiten wandert eine Kugel um 13 in 400 Runden, bei 20 000 läuft
  sie davon). (5) Die Donut-Regel vom 13.11. beim Löschen gilt nur noch mit `?clipping=0` (`DONUT_REGEL_1311`) und nie an einer
  freien Form: Dort hatte das Löschen eines Punkts bei z < 0 die Form verschmolzen. (6) Mit V wird die Form ohne Löser abgebildet
  (`werk.formZugStarten`, `formZugBewegen`, `formZugEnde`; in `main.ts` `objektZug…`); wer dem Werk neue Werte je Punkt gibt, muss
  sie dort mit abbilden. (7) ⌫ ohne gewählte Punkte lässt in Ozzy die Luft ab (so gewollt): Eine Probe, die löschen will, wählt
  vorher einen Punkt. Proben: `ozzy-spiegel-fenster.mjs` (`NUR=clip|aus|objekt`), `ozzy-frei-linien-fenster.mjs`, Tests
  `frei.test.ts`; Film `scripts/ozzy/spiegel-film.mjs`.
- **Mehrere Objekte (Etappe 3, erste Scheibe, 18.11.):** Ein Objekt ist ein Stand des Werks plus seine eigene Anzeige. Das Werk
  rechnet immer an einem, dem aktiven; die anderen ruhen (`ruhende` in `main.ts`: je Objekt sein `werk.ObjektStand` samt Rückweg und
  Spiegel, eine eigene `WerkHaut`, seine Zeichnung, seine Blase, grobe Haut und Kasten im Raum für Treffer). `werkHaut` ist deshalb
  ein `let`: Beim Wechsel (`objektAktivieren`) wechseln Anzeige, Werk (`werk.objektAblegen`, `objektAufnehmen`), Zeichnung, Blase,
  `werkForm` und die Marken des Spiegels zusammen. Merke: (1) Jedes Objekt hat sein eigenes Maß (`werkHaut.f`, `mitte`); die Netze
  der Anzeige liegen im Raum, die Spiegelebene z = 0 ist für alle dieselbe. Nie ein Maß oder eine Lage des Werks über einen Wechsel
  hinweg merken. (2) Die Seifenhaut zeichnet die ruhenden als eigenes Netz (`Haut.ruheSetzen`, eigene Durchgänge, `HautWerte.ruheSicht`);
  alles andere, was die Haut als ein Netz zeigt, nimmt `zeigeNetzAlle()` statt `werkHaut.zeigeNetz`. (3) Wer etwas am Kasten der Form
  im Bild festmacht (Raum, Ausschnitt der Seifenhaut, Umrisse), rechnet über alle Objekte (`werkMasseWelt`, `hautAusschnitt`,
  `umrissJetzt`); `werkMasseWeltAktiv` ist das aktive allein. (4) `neu(true)` (das Plus) lässt die ruhenden stehen, `neu()` räumt
  alle ab; der Haken `form(anker, true)` zeichnet aufs Blatt eines neuen Objekts. (5) Ablegen geht nur in Ruhe (`werk.objektRuht`:
  kein Zug, nicht in der Pose); rechnet der Hintergrund noch, steht sein Auftrag wieder im Stand des Objekts. (6) `typeof werkForm`
  in einem Typ ist an der Stelle auf `null` verengt: den Typ ausschreiben. Probe: `ozzy-objekte-fenster.mjs`. Offenes: Plan,
  Abschnitt 10 („Was an Etappe 3 offen bleibt“). **Der Rest von Etappe 3 (18.11. spät):** (7) *Die Reihe* (`reihe`,
  `reiheSchritt` in `main.ts`): mehrere geschlossene Linien auf einem Blatt (`Blatt.silhouettenNetze`) oder die Objekte einer
  geladenen Szene werden nacheinander zum aktiven Objekt, blasen auf und werden abgelegt, sobald sie stehen; nach der ersten
  läuft die Zeit 2,5-fach (`REIHE_TEMPO`), und Kamera, Wände und Linien nehmen den Moment vom Ende der Fahrt (`mBuehne`), nur
  die Blase den laufenden. Der Raum rechnet die wartenden mit (`reiheKaesten` in `werkMasseWelt`). Solange `reihe` gesetzt ist,
  ruht die Bedienung. (8) *Der gemeinsame Rückweg* (`rueckweg`, `rueckwegAbgleichen`, `rueckwegAnders`): je Schritt im Werk ein
  Eintrag mit der Kennung seines Objekts, abgelesen an der Länge von `werk.zurueck` über `werkForm.zurueck` (je Bild und vor
  jedem Ablegen); ein gelöschtes Objekt liegt als Eintrag mit seinem ganzen `Ruhend` bereit. Kennungen vergibt `objektZaehler`
  und nie zweimal (ein aufgenommenes oder gelöschtes Objekt kann zurückkommen). (9) *Szene sichern und laden*: `WesenStand.ozzy`
  (`ablage.ts`: Spiegel und Maß dieser Form, dazu die weiteren Objekte mit ihren Ständen; `werk.standAus` macht aus dem
  Schnappschuss eines ruhenden einen Stand, `werk.wesenHolen` holt eine Datei, ohne sie zu übernehmen). `formLaden` legt die
  Szene als Ganzes mittig aufs Blatt (alle Maße mit demselben Faktor) und lässt die Reihe laufen; das Prüffenster lädt aus der
  Datei nur die Form selbst. (10) *Linien ruhender Objekte*: `Ruhend.linien` (Strecken im Raum samt Spiegelbildern, beim Ablegen
  aus `l.ruhe` gelesen), gezeichnet in `wandLinien`, `linienDerAnsicht`, `felderLinien` (`ruheLinien`, `streckenZeichnen`);
  die Umrisse der ruhenden an der Rückwand über `ruheUmrisse(2)`. Wer einen neuen Ort baut, an dem Linien stehen, zeichnet sie
  dort mit. (11) `objektBei` schießt in einer flachen Fläche einen Strahl längs ihrer Achse (Blatt wie `werkFelder.treffer`);
  `imFeld` gibt Gerätepunkte, Haken geben CSS-Pixel. Proben: `ozzy-reihe-fenster.mjs`, `ozzy-objekte-fenster.mjs` (8b bis 8d).
- **Naht zwischen zwei Objekten (Etappe 4, 18.11.; erste Fassung in Ozzy):** der Baustein `src/form/naht.ts`
  (`objekteVerbinden`, wartefrei `objekteVerbindenMit` nach `manifoldLaden`; Tests `naht.test.ts`), im Werk `objektVerbinden`
  (ein Schritt für ⌘Z), in `main.ts` `nahtPartner`, `objekteVerbindenJetzt`, `nahtMarken`/`nahtNachZurueck` (⌘Z gibt das
  aufgenommene Objekt wieder heraus), in der Leiste zwei Knöpfe (`nahtZeigen`). Proben: `ozzy-naht-fenster.mjs` (`LINIE=1`: mit
  Linien der Mitte), im Kern `form-naht.ts` (aus `packages/shape`: `[ART=abziehen] [BLATT=<pfad>] [STREIFEN=15,30] [BEGLEIT=15] npx
  vite-node ../../apps/editor/scripts/pruefen/form-naht.ts`; sie misst am Baustein). Den Schnitt zweier Netze rechnet `manifold-3d`
  (`pnpm add` schreibt `package.json` um: danach zurücksetzen und die eine Zeile von Hand eintragen). Merke: (1) Jedes Dreieck
  bekommt seine eigene `faceID`, sonst legt die Bibliothek Dreiecke zusammen; alte Punkte werden über ihre Lage in einfacher
  Genauigkeit wiedergefunden und behalten ihre genaue Lage, neu sind nur die Punkte der Naht. (2) Eine Linie, die in die andere Form
  läuft, wird an der Naht geschnitten: Pfad teilen am Punkt, der dem Nahtpunkt am nächsten liegt (`stueckNaechstes`,
  `stueckTeilen`), die Stelle `s` des neuen Punkts aus dem Parameter im Stück (dann behalten alle Proben ihre Stelle); das Stück
  draußen ist ein `ring`, der am geschnittenen Ende hängt (`haengt`); die Kreuzungen der zweiten Form zählen neu. (3) Gespiegelte
  Formen: Die Hälfte z ≥ 0 des Schnitts wird behalten und gespiegelt, die Paare stehen dabei fest (`{ ...hautAus(pos, tri, true),
  spiegel }`, nie aus gerundeten Lagen lesen: Ein Punkt der Naht dicht an der Ebene fände sich selbst). Die Naht ist dann ein Ring
  von der Ebene zur Ebene, eine Linie der Mitte wird ein offenes Stück in der Ebene, das an den Enden der Naht hängt. (4) Der
  Spiegel folgt einer Regel: Das Bild bleibt (gespiegelt + gespiegelt oder + freies Teil mit Spiegelbild: gespiegelt; gespiegelt +
  Teil ohne Spiegel: Die Form wird frei, `aFrei`; zwei freie mit ungleichem Spiegel: Fehler). (5) Das Teil kommt im Maß des Objekts,
  das bleibt (`hautImMass`, `loopImMass`: k = f / f des Teils, d = Unterschied der Mitten mal f). (6) Die Schnittkurve hinterlässt
  sehr kurze Kanten: `nadelnWeg`, dann setzen (`hautNeuRechnen`). (7) Die Bibliothek wird erst beim ersten Verbinden geladen
  (`import('manifold-3d')`, ihre WASM-Datei über `?url`): Nach dem Warten prüfen, ob das Werk noch dieselbe Haut hat und ruht.
  (8) `netzGewachsen` erwartet die gebliebenen Punkte vorn; die Zuordnung des Schnitts ist nicht so geordnet, darum nur ohne Pose
  und ohne Maul. (9) Wie weit eine Rechnung die Haut bewegt hat, nie aus `heute().weg` lesen (nur der letzte Abschnitt): die Haut
  vorher und nachher über `flaechenAbstand` vergleichen. (10) **K an der Naht:** weich wie jede Linie (Florian: „Wie Seifenblasen“).
  Mit eigenen Linien an den Formen hält es (die Formen gehen stark mit); an Formen ohne eigene Linien läuft die Rechnung
  auseinander, das Werk behält die Form („Hier ließ sich das Netz nicht aufräumen“). Begleitlinien halten nicht, außen festhalten
  (Halte-Loop) zeigt den Rand des Streifens. Zahlen und Offenes: Plan, Abschnitt 10.
- **Die Naht lebt (Etappe 5, Beweis im Kern, 18.11. nachts):** `scripts/pruefen/form-naht-ziehen.ts` (aus
  `packages/shape`: `[BLATT=<pfad>] [ABSTAENDE=150,180,…] [RICHTUNG=x,y,z] [RAMPE=30] [NACH=0] npx vite-node …`). Die kleine Form
  wandert weg; bei jedem Abstand wird aus den zwei unveränderten Formen neu verbunden (`objekteVerbinden`) und gerechnet. Ergebnis:
  Die Naht schrumpft stetig und verschwindet, nichts springt; mit Kante ist der Schnitt allein die Form (46 bis 78 ms je Stand),
  weich rechnet 1,2 bis 1,7 s dazu. Merke: (1) `falten().umgeklappt` schlägt an einer sehr scharfen Kante an, ohne dass etwas
  gefaltet ist (über 120° mitteln die Ecken der Naht über beide Seiten): dort Falten gegen Nachbardreiecke zählen (`gefaltet` in
  der Probe). (2) Läuft die Naht genau durch eine Kreuzung zweier Linien (weniger als eine halbe Netzkante daneben), entstehen
  sehr kurze Linienstücke, und die weiche Naht faltet dort 2 bis 10 Dreiecke; feinere Stufen oder weiteres Aufräumen ändern es
  nicht (offen). Plan, Abschnitt 12.
- **Der Verbund (Etappe 5 in Ozzy, 19.11.; Plan, Abschnitt 13):** Verschmelzen und Abziehen sind ein Zustand des Objekts
  (`verbundVon` in `main.ts`: `art`, `rund`, `breite`), kein Schritt; die Objekte bleiben Objekte. Was zu sehen ist, wird
  abgeleitet: `verbundSoll()` bildet je Bild die Körper (was verschmilzt, abzüglich der Objekte, die abziehen; nach den Kästen),
  `verbund.ts` gibt dem Rechner im Hintergrund (`verbund.worker.ts`) den neuesten Stand, `verbundRechnen.ts` schneidet die
  **gezeigten** Häute (`manifold-3d`), findet die Naht, rundet und liefert ein Netz, die Naht als Strecken und die Umrisse.
  Proben: `ozzy-verbund-fenster.mjs` (Standard `loops=1`), Tests `src/ozzy/verbundRechnen.test.ts` (laufen in Node, ohne Fenster).
  Merke: (1) **Zwei Rechner:** einer für das Ziehen (`eilig`, grobe Stufe: `WerkHaut.stufeMitHoechstens`, die ersten Punkte des
  gezeigten Netzes sind die Punkte der gröberen Stufe, `netzAufStufe`), einer für die Ruhe; ein Ergebnis gilt nur, wenn kein
  neueres zu sehen ist. Der Rechner behält je Objekt zwei Stände; fehlt einer, meldet er `fehlt`, und das Netz kommt noch einmal.
  (2) **Ein Zug am ganzen Objekt schickt nur die Abbildung** (`verbundZugMerken` in `objektZugBeginnen`, `verbundZugAbbildung`
  aus vier Punkten der Haut des Werks): Das Anlegen eines Körpers kostet so viel wie der halbe Schnitt. Wer einen neuen Zug baut,
  der die Haut nur abbildet, kann denselben Weg nehmen; alles andere schickt das Netz. (3) **Die Bibliothek richtet die Normalen
  nicht:** Sie kommen, wie sie hineingingen (am Spiegelbild ungespiegelt, an der Wand eines Lochs nach außen); `nachbearbeiten`
  bildet sie mit `runTransform` ab und dreht je Lauf nach den Dreiecken um. `getMesh(3)` tat in dieser Fassung (3.5.5) nichts.
  Ein Lauf ohne Dreiecke steht trotzdem in `runOriginalID` (ob ein Abzieher beißt, an `runIndex` ablesen). Die Anzeige führt
  Dreiecke je nach Form andersherum: vor dem Schnitt nach dem Rauminhalt drehen. (4) **Die Rundung** ist die weiche Vereinigung
  an der Naht (Kopf von `verbundRechnen.ts`). An der Naht liegen Punkte in jedem Abstand und hauchdünne Dreiecke: Richtungen nie
  aus der Lage einzelner Punkte nehmen (aus den zwei Normalen der Naht), Krümmungen längs der Naht nach Länge glätten, und
  Punkte dicht an der Naht genau mit ihr mitführen (ihr Weg = der der Naht + der Unterschied der eigenen Rechnung zur Rechnung an
  der Naht), sonst klappen diese Dreiecke um. Die Tests zählen das (`umgeklappt`, `nahtUnruhe`). In inneren Schleifen kein
  `Math.hypot` (um ein Vielfaches langsamer als die Wurzel). (5) **Anzeige:** Die Seifenhaut hat zwei Plätze für ruhende Netze
  (`ruheSetzen(netz, platz)`: 0 die Objekte für sich, 1 der Verbund); das aktive Netz wird mit `aktivAus` nicht gezeichnet, ein
  aktives Objekt, das abzieht, mit `blaseSicht` blass. `verbundVerdeckt(id)` sagt, ob ein Objekt im gezeigten Verbund aufgeht:
  Wer Netze, Umrisse oder Linien aller Objekte zusammensetzt (`zeigeNetzAlle`, `umrissJetzt`, `ruheUmrissTeile`, `ruheLinien`),
  fragt es. Ruhende Netze tragen Dehnung 1 (nicht 0: Das liest die Anzeige als gestaucht). (6) **Wählen** (`objektBei`): alle
  Durchgänge des Strahls durch alle Häute der Reihe nach; getroffen ist die erste Stelle, an der er in den Körper tritt (tritt er
  dort aus einem Abzieher aus, gehört die Wand ihm). (7) Die zwei Knöpfe schalten (`verbundKnopf`), ⌥ + Klick wendet an
  (`objekteVerbindenJetzt`, Etappe 4); Proben, die anwenden wollen: `s.click('#naht-vereinen', { modifiers: ['Alt'] })`.
  (8) Offen: den Hilfsloop greifen; der Farbsprung zweier Schichtmuster an der Naht; die Rundung an stark geformten Stellen.
- **Formen beginnen mit Edgeloops (seit dem 18.11. spät der Standard; Florian: „ok, dann starten wir mit loops“):** `startLoops`
  in `main.ts`, Menü „Start mit drei Loops“ (gemerkt), `?loops=0|1`. **Im Testbrowser (`navigator.webdriver`) und mit `ohneLinie=`
  in der Adresse sind sie aus:** Die Proben prüfen ihr Thema an der Form ohne Start-Loops, an der ihre Kriterien gemessen sind;
  eine neue Probe, die den Standard meint, schreibt `loops=1` (`ozzy-start-loops-fenster.mjs`). Nach dem Aufblasen, sobald die
  Form steht (`werkBild`), legt `startLoopsAnlegen` mit `werk.vorhangSchneiden` zwei Loops rundum durch die dickste Stelle der
  Silhouette (`innenkreis`): quer und längs, je ein Strich vom Leeren ins Leere mit einem Punkt in der Mitte. `startFertig()`
  sagt, ob die frische Form fertig angelegt ist (die Reihe wartet darauf); `werkAufsBlatt` behält die Merker `startLoops` und
  `ohneLinie`. Gemessen: Die Form steht, K an einer Naht hält (−2,2 % statt −22 %), aber zwischen drei Loops fällt die Haut ein
  (Kreis −9,7 % Rauminhalt). Wo die Loops sitzen und wie aufgeblasen wird, daran wird mit Florian noch gearbeitet (Plan „Objekte,
  Spiegel und Nähte“, Abschnitt 11). Haken `radien()` misst die Rundheit.
- **Studie „Maul, Zähne, Zunge“ (20.11., Zweig `claude/ozzy-maul`; Konzept `docs/plans/2026-11-20-ozzy-maul-zaehne-zunge.md`):**
  `maul.html`, `src/maulstudie/` (steht neben Ozzy, liest eine gesicherte Form, ändert weder Ozzy noch Werk noch Kern). Das Maul
  ist ein Schnitt in der gezeigten Haut längs einer Linie in der Seitenebene (`schnitt.ts`, `manifold-3d` über `manifoldLaden`);
  Kiefer drehen je Punkt um den Mundwinkel (`kieferFeld`, `kieferStellen`). Merke: (1) Die Bibliothek braucht einen Keil mit
  Breite: Geschlossen zeigt die Studie darum die Form selbst; die geschnittene Haut zeigte eine Haarlinie. (2) Im Auslauf hinter
  dem Mundwinkel die Normalen aus der gestellten Haut neu rechnen (`auslaufNormalen`). (3) Die Wand hat fast keine eigenen Punkte:
  ihre Farbe (Zahnfleischring) rechnet der Shader je Bildpunkt aus der Tabelle `MaulSchnitt.breite`. (4) Wer den Zeiger fängt
  (`setPointerCapture`), bekommt beim Loslassen das fangende Feld als Ziel: das Angetippte beim Drücken merken (`linse.ts`). (5)
  Ein Strahl von three trifft ein einseitiges Material nur beim Eintreten (`dickeBei` schießt von beiden Seiten). (6) Bilder:
  `scripts/ozzy/maul-studie-bilder.mjs`, `maul-studie-bogen.mjs`; Haken `window.__maul`. Einstieg:
  `docs/look/ozzy/maul/UEBERGABE.md`.
- **Fenster der App (18.11.):** Am 18.11. mittags liefen 5205 und 5197 nicht mehr (die Sitzung, die sie gestartet hatte, war
  beendet); 5205 hat die Sitzung „Objekte“ neu gestartet (Eintrag `ozzy`), ihr eigenes Fenster ist 5211 (`ozzy-objekte`). Die App hält offenbar nur drei Vorschau-Server zugleich; ein vierter `preview_start` verdrängt den
  ältesten (so verschwanden nacheinander Ozzy 5205 und Florians 5197). Vor einem Start `lsof -nP -iTCP -sTCP:LISTEN | grep 51`
  ansehen, einen eigenen erst beenden, und danach prüfen, dass 5194, 5197 und 5205 laufen.
- **Look gegen die Vorlage (18.11.):** `node scripts/pruefen/ozzy-look-messen.mjs [ordner]` legt dieselbe Form gleich groß in
  `raum.html` (Port 5199, Eintrag `linien-look`) und Ozzy und misst die Breite des Umrisses. Wo der weiße Körper den Umriss zeichnet
  (`F.tiefe`), bleibt die Linie der Mitte in der Seite fein (`werkBlatt.ts`); sonst lägen zwei Striche übereinander. Die Wände im
  Raum zeichnen noch Striche entlang jeder Kontur (`wandLinien`, Tiefenkarten).
- **Vor Arbeit an `kurven.ts` oder am Löser lesen:** `docs/verlauf/2026-11-11-uebergabe-kurven.md`, Abschnitt 3 (Karte von
  `kurven.ts`) und Abschnitt 4 (Fallen, was schon kaputtging).
