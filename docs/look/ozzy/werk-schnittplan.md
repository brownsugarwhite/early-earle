# Schnittplan: das Werk aus `kurven.ts` lösen (Ozzy, Phase 1)

Stand 16.11.2026, Code-Stand `kurven.ts` in `claude/ozzy` (gleich `claude/form-bau`, `08c5b111`). Zweck: Ozzy rechnet genau mit dem
Stand von Sitzung 4, ohne Kopie (Plan [`2026-11-16-ozzy.md`](../../plans/2026-11-16-ozzy.md), Grundsatz G8, Phase 1). Wer diesen
Schritt baut, liest vorher `apps/editor/CLAUDE.md` (Fallen) und `docs/verlauf/2026-11-11-uebergabe-kurven.md`, Abschnitt 3 und 4.

## Ziel

- `apps/editor/src/form/werk/` hält eine Form und alles, was mit ihr geschieht: Stand (Haut, Linien, Kennungen, `MK`, `TOL`, Maul,
  Pose, Grundform), Zurück, Züge, Rechnen im Bildtakt, Nachlauf und Hintergrund, Linien einsetzen und löschen, Kante, Ecke, Donut,
  Maul formen, Kiefer, Pose, Behalten, Sichern, Laden. **Ohne DOM und ohne three.js.**
- `kurven.ts` wird die Hülle: three.js, SVG-Blätter, Knöpfe, Tasten, Zeiger, Test-Haken `__kurven`. **Verhaltensgleich:** dieselben
  Proben geben vorher und nachher dieselben Ergebnisse (unten).
- Ozzy benutzt dasselbe Werk (eine Form je Seite genügt).

## Befund (Zuordnung aller Funktionen, Tabelle unten)

Von 225 Funktionen auf oberster Ebene sind **93 schon reines Werk** (2 505 Zeilen, keine Anzeige), **25 reine Anzeige** (574 Zeilen),
**56 neutral** (Hilfen, 589 Zeilen) und **51 gemischt** (3 316 Zeilen). Fast alle gemischten Rechenteile rufen nur die Anzeige auf
(`allesZeigen`, `statusZeigen`, `hautZeigen`, `baenderZeigen`, `blaetterZeichnen`); das wird ein Haken. Die Züge rechnen schon in
Blatt-Koordinaten ohne Zoom (`imBlatt`, `inWelt` sind reine Abbildungen der Achse; der Zoom steckt nur in `blattPunkt` und `skala`):
Ozzys Wände, Felder und eingerastete Ansichten liefern genau diese Koordinaten.

## Die vier Stellen, an denen der Schnitt nicht mechanisch ist

1. **`allesZeigen` rechnet mit.** Es entfernt ein gelöschtes Maul (`poseVerlassen`), setzt die Ecken an Kreuzungen (`eckenAuto(loops)`,
   ändert das Modell), zeichnet, schreibt den Status, plant die Ruhe (`vorrechnenPlanen`) und das Behalten (`behaltenPlanen`). Im Werk:
   `geaendert()` = Maul prüfen, `eckenAuto`, `vorrechnenPlanen`, `behaltenPlanen`, dann das Ereignis „geändert“; die Hülle zeichnet
   darauf. Reihenfolge wie heute (Falle 19 der alten Übergabe: Wer `ruheOffen` setzt, ruft danach diese eine Stelle).
2. **`statusZeigen` liest viel vom Zustand** (Zug offen, Nachlauf, Aufräumen, Zeiten, Zerlegung, Verdichtung). Im Werk eine Funktion
   `zustandText(): string` (oder die Teile als Zahlen), die Hülle schreibt sie in die Statuszeile.
3. **`bildRechnen` (476 Zeilen) ist Rechnen und Zeichnen in einem.** Reihenfolge je Bild (Übergabe 11.11., Abschnitt 3): Maul-Schritt,
   einwechseln oder `zugRechnen`, `nachlaufRechnen`, `zwischenAnwenden`, `aufgeraeumtAnwenden`, wartenden Griff beginnen, zeichnen.
   Alles bis vor das Zeichnen wird `werk.takt()`; „flüssig zuerst“ misst, was das Bild sonst kostet (`bildRestMs`): Die Hülle meldet
   ihre Zeichenzeit (`werk.bildKostet(ms)`), damit das Budget gleich bleibt.
4. **Die Pose zeigt gedreht** (`alsAnzeige`, `anzeigeVon`, `inDerRuhe`): Das Drehen der Knochen gehört zur Rechnung des Gezeigten, nicht
   zum Bildschirm. `alsAnzeige` und die gedrehten Pfade (`stueckeGezeigt`, `pfadStuecke`) kommen ins Werk (`werk/pose.ts`) und werden
   von der Hülle aufgerufen; Ozzy braucht dasselbe.

## Gemeinsamer Zustand: wie man ihn verschiebt, ohne etwas zu verlieren

Heute sind es 284 `let` und `const` auf Modulebene. ES-Module geben gebundene Namen nur zum Lesen weiter. Vorschlag in zwei Schritten:
- **Schritt A, mechanisch:** alle Größen des Modells in ein Objekt `F` (die Form) in `werk/stand.ts`, jede Verwendung `haut` → `F.haut`.
  Nicht mit Suchen und Ersetzen (lokale Namen wie `haut` als Parameter gibt es überall), sondern mit dem Sprachdienst von TypeScript
  (`findReferences` je Deklaration auf oberster Ebene, dann ersetzen): ein kleines Skript, das nur die Verweise auf die eine Deklaration
  umschreibt. Danach Typen und die Proben: es darf sich nichts ändern.
- **Schritt B:** die Funktionen der Spalte „Werk“ und die Rechenteile der „gemischten“ in ihre Module verschieben (Tabelle, Spalte Ziel),
  die Aufrufe der Anzeige über `werk.haken` (die Hülle setzt `alles`, `status`, `haut`, `baender`, `blaetter`, `regler`). UI-Zustand
  (`auswahl`, `modus`, `oAn`, `radius`, `meldung` als Text, Zoom je Blatt) bleibt in der Hülle; wo das Werk ihn braucht (die Auswahl für
  einen Zug, O und Radius), wird er übergeben.

## Schnittstelle (Entwurf)

- **Handgriffe** (je ein Schritt für Zurück): `zugBeginnen({ ansicht, ziel, x, y, modal?, achse? })` mit Blatt-Koordinaten,
  `zugBewegen(x, y)`, `zugEnde(ok)`, `linieEinsetzen(...)` (heute `loopSchneiden`, `formErstellen`, `stiftFertig`,
  `abzweigungErstellen`, `maulLinieErstellen`), `punktSetzen`, `loeschen(auswahl)`, `kanteSetzen(auswahl)`, `eckeSchalten`,
  `mitteFest`, `maulFormen`, `poseBetreten`, `poseVerlassen`, `knochen(kiefer, schaedel)`, `zurueck`, `neu(umriss?)`, `laden(stand)`,
  `stand()` (für Sichern und Behalten).
- **Takt:** `takt()` je Bild; Ereignisse `geaendert` (Netz, Lagen, Linien, Stand) für die Anzeige.
- **Lesen:** `haut`, `loops` (in der Pose über `alsAnzeige`), `glatt` (Plan der glatten Anzeige), Pfade der Linien, Punkte, Kreuzungen,
  Härte je Stelle, Inneres des Mauls, `beschaeftigt`.
- **Treffer:** Strahl auf die Haut, nächste Linie und nächster Punkt in einer Ansicht (heute über die SVG-Blätter: in der Hülle bleibt
  das Treffen im Blatt, das Werk bekommt nur, was getroffen wurde).

## Reihenfolge und Proben

Jeder Schritt einzeln committen, vor und nach jedem Schritt dieselben Proben (aus `apps/editor`, Server des Arbeitsbaums, `GPU=1`,
nicht gleichzeitig mit vitest, währenddessen nichts unter `src` ändern):

```bash
GPU=1 node scripts/pruefen/form-maul-loop.mjs
GPU=1 node scripts/pruefen/form-fressen-pose.mjs
GPU=1 node scripts/pruefen/form-abzweigung-fenster.mjs
GPU=1 node scripts/pruefen/form-donut-fenster.mjs
GPU=1 node scripts/pruefen/form-pose-fenster.mjs
GPU=1 node scripts/pruefen/form-pose-mitgehen-fenster.mjs
GPU=1 node scripts/pruefen/form-maul-formen-fenster.mjs
GPU=1 node scripts/pruefen/form-kiefer-fenster.mjs
GPU=1 NAME="teat firefish" node scripts/pruefen/form-gesichert-zug.mjs
```

Dazu `npx vitest run src/form/` (Fenster), aus `packages/shape` `npx vitest run src/dicht/ src/loeser/zerlegung.test.ts`, Typen beider
Pakete. Die Adresse der Proben über `KURVEN_URL=http://localhost:5205/kurven.html?gewichte=geometrie`. Vor dem ersten Schritt die
Ergebnisse festhalten (Ausgabe in `docs/progress/ozzy/werk-proben-vorher.txt`).

1. Ablage, Behalten, Zurück (`schnappschuss`, `wiederherstellen`, `standJetzt`, `standAnwenden`, `behalten…`) nach `werk/ablage.ts`.
2. Zustand nach `F` (Schritt A oben).
3. Hintergrund und Nachlauf (`zerleger`, `einwechseln`, `nachlaufRechnen`, `aufraeumen…`, `ruheImHintergrund`, `vorrechnenPlanen`).
4. Züge und Rechnen im Bildtakt (`zugStarten` … `zugEnde`, `zugRechnen`, `rundeMitWeg`, `davon…`, `abbildung`) und `takt()`.
5. Linien einsetzen und löschen, Kante, Ecke, Donut (`loopSchneiden`, `einsetzen…`, `formErstellen`, `stiftFertig` (Teil), `abzweig…`
   (Teil), `loeschen`, `kanteSetzen`, `eckeUmschalten` (Teil), `mitteFest`).
6. Maul und Pose (`maul…`, `pose…`, `knochen…`, `alsAnzeige`, `grundAufPfad`, `netzGewachsen`).

Bricht eine Probe, den Schritt zurücknehmen und kleiner schneiden, nicht flicken.

## Danach in Ozzy

- Die Blase ist die glatte Anzeige des Werks (`GlattPlan`) mit dem Material der Seifenhaut (`../anfang/haut.ts` bekommt ein Netz statt
  `Koerper`; Dehnung gegen den Stand beim Anfassen).
- Wände, Felder und eingerastete Ansicht zeigen die Linien des Werks (Pfade je Linie, Härte für die Breite) und den Umriss der Haut je
  Ansicht; bearbeitet wird über `Raum`, `StiftWerk` und `Dreher` der Linien-Studie, deren Brücken das Werk rufen.
- Das Ende des Aufblasens ist die Form des Werks aus der Silhouette (Phase 3, mit dem kleinen Beweis „ein einzelner Loop“ zuerst).

## Tabelle: jede Funktion von `kurven.ts`

„Art“: Werk = rechnet, keine Anzeige; Anzeige = nur Anzeige; gemischt = beides (in „Kopplung“ steht, was von der Anzeige benutzt wird);
neutral = Hilfe ohne beides. „Ziel“ nach dem Abschnitt im Code; bei gemischten Funktionen gehört der Rechenteil ins Werk, der Rest in die
Hülle. Erzeugt mit einem Skript über den Stand `08c5b111` (Zählung nach Namen, also eine Landkarte, keine Prüfung).

Zusammen: Werk 93 Funktionen (2505 Zeilen), neutral 56 Funktionen (589 Zeilen), gemischt 51 Funktionen (3316 Zeilen), Anzeige 25 Funktionen (574 Zeilen)

| Zeile | Länge | Funktion | Abschnitt | Art | Ziel | Kopplung an die Anzeige |
| ---: | ---: | --- | --- | --- | --- | --- |
| 242 | 141 | `kreis` |  | Werk | ? |  |
| 383 | 3 | `altePose` | Haut und Loops | Werk | werk/stand.ts |  |
| 386 | 10 | `mitBereich` | Haut und Loops | neutral | Hilfe (bleibt, wo sie gebraucht wird) |  |
| 396 | 6 | `direktGilt` | Haut und Loops | Werk | werk/stand.ts |  |
| 402 | 6 | `direktNehmen` | Haut und Loops | Werk | werk/stand.ts |  |
| 408 | 13 | `direktBereiten` | Haut und Loops | Werk | werk/stand.ts |  |
| 421 | 7 | `exakt` | Haut und Loops | neutral | Hilfe (bleibt, wo sie gebraucht wird) |  |
| 428 | 36 | `festlegenAlle` | Haut und Loops | Werk | werk/stand.ts |  |
| 464 | 24 | `GENAU_HAUT` | Haut und Loops | neutral | Hilfe (bleibt, wo sie gebraucht wird) |  |
| 488 | 27 | `linieUngenau` | Haut und Loops | Werk | werk/stand.ts |  |
| 515 | 43 | `gestreckt` | Haut und Loops | Werk | werk/stand.ts |  |
| 558 | 10 | `kopieLoop` | Haut und Loops | neutral | Hilfe (bleibt, wo sie gebraucht wird) |  |
| 568 | 1 | `poseKopie` | Haut und Loops | neutral | Hilfe (bleibt, wo sie gebraucht wird) |  |
| 569 | 13 | `schnappschuss` | Haut und Loops | Werk | werk/stand.ts |  |
| 582 | 20 | `wiederherstellen` | Haut und Loops | gemischt | werk/stand.ts | `allesZeigen`, `reglerZeigen` |
| 602 | 1 | `loopNr` | Haut und Loops | Werk | werk/stand.ts |  |
| 603 | 1 | `lageAus` | Haut und Loops | neutral | Hilfe (bleibt, wo sie gebraucht wird) |  |
| 604 | 1 | `spiegeln` | Haut und Loops | neutral | Hilfe (bleibt, wo sie gebraucht wird) |  |
| 605 | 1 | `abstand` | Haut und Loops | neutral | Hilfe (bleibt, wo sie gebraucht wird) |  |
| 606 | 7 | `abstandSym` | Haut und Loops | neutral | Hilfe (bleibt, wo sie gebraucht wird) |  |
| 613 | 33 | `kreuzungenSuchen` | Haut und Loops | Werk | werk/stand.ts |  |
| 646 | 39 | `feld` | Darstellung | Anzeige | Hülle | `blaetter`, `document`, `felder`, `knopf`, `leinwand`, `renderer`, `statusZeile`, `szene` … |
| 685 | 58 | `hautMaterial` | Darstellung | Werk | Hülle (Anzeige) |  |
| 743 | 62 | `bandMaterial` | Darstellung | Anzeige | Hülle | `koerper`, `umriss` |
| 805 | 58 | `teilungNeu` | Darstellung | Werk | Hülle (Anzeige) |  |
| 863 | 27 | `geometrieNeu` | Darstellung | Anzeige | Hülle | `baender`, `koerper`, `setAttribute`, `szene`, `umriss` |
| 890 | 43 | `ortho` | Darstellung | Anzeige | Hülle | `ausschnitt`, `dreiKamera`, `felder`, `getBoundingClientRect`, `kameras`, `neuZeichnen`, `steuerung` |
| 933 | 6 | `skala` | Darstellung | Anzeige | Hülle | `ausschnitt`, `felder`, `getBoundingClientRect` |
| 939 | 2 | `imBlatt` | Darstellung | neutral | Hilfe (bleibt, wo sie gebraucht wird) |  |
| 941 | 2 | `inWelt` | Darstellung | neutral | Hilfe (bleibt, wo sie gebraucht wird) |  |
| 943 | 7 | `blattPunkt` | Darstellung | Anzeige | Hülle | `ausschnitt`, `felder`, `getBoundingClientRect` |
| 950 | 10 | `zoomen` | Darstellung | Anzeige | Hülle | `ausschnitt`, `blattPunkt` |
| 960 | 7 | `schieben` | Darstellung | Anzeige | Hülle | `ausschnitt` |
| 967 | 26 | `ausschnittGeaendert` | Darstellung | gemischt | Hülle (Anzeige) | `ausschnitt`, `blattZeichnen`, `document`, `felder`, `knopf`, `kopfRegler`, `maulRegler`, `neuZeichnen` |
| 993 | 7 | `fingerabdruck` | Maul | neutral | Hilfe (bleibt, wo sie gebraucht wird) |  |
| 1000 | 20 | `mundwinkelVon` | Maul | neutral | Hilfe (bleibt, wo sie gebraucht wird) |  |
| 1020 | 18 | `maulAktuell` | Maul | Werk | werk/maul.ts |  |
| 1038 | 7 | `maulIstGeformt` | Maul | Werk | werk/maul.ts |  |
| 1045 | 5 | `maulSchnitt` | Maul | neutral | Hilfe (bleibt, wo sie gebraucht wird) |  |
| 1050 | 10 | `indexOhneOeffnung` | Maul | neutral | Hilfe (bleibt, wo sie gebraucht wird) |  |
| 1060 | 18 | `innenZeigen` | Maul | Anzeige | Hülle | `innenZeigen`, `setAttribute` |
| 1078 | 29 | `maulAnlegen` | Maul | Werk | werk/maul.ts |  |
| 1107 | 6 | `maulZu` | Fressen-Pose | Werk | werk/pose.ts |  |
| 1113 | 9 | `knochenJetzt` | Fressen-Pose | Werk | werk/pose.ts |  |
| 1122 | 14 | `poseKnochen` | Fressen-Pose | Werk | werk/pose.ts |  |
| 1136 | 67 | `poseBetreten` | Fressen-Pose | Werk | werk/pose.ts |  |
| 1203 | 78 | `poseVersatzFuer` | Fressen-Pose | neutral | Hilfe (bleibt, wo sie gebraucht wird) |  |
| 1281 | 8 | `nurInGrundform` | Fressen-Pose | gemischt | werk/pose.ts | `statusZeigen` |
| 1289 | 20 | `poseSichern` | Fressen-Pose | Werk | werk/pose.ts |  |
| 1309 | 9 | `gedreht` | Die Pose zeigen | neutral | Hilfe (bleibt, wo sie gebraucht wird) |  |
| 1318 | 7 | `vektorGedreht` | Die Pose zeigen | neutral | Hilfe (bleibt, wo sie gebraucht wird) |  |
| 1325 | 4 | `winkelJeProbe` | Die Pose zeigen | neutral | Hilfe (bleibt, wo sie gebraucht wird) |  |
| 1329 | 15 | `winkelBei` | Die Pose zeigen | neutral | Hilfe (bleibt, wo sie gebraucht wird) |  |
| 1344 | 21 | `loopGedreht` | Die Pose zeigen | Werk | werk/pose.ts (Rechnung) · Hülle (Anzeige) |  |
| 1365 | 54 | `alsAnzeige` | Die Pose zeigen | Werk | werk/pose.ts (Rechnung) · Hülle (Anzeige) |  |
| 1419 | 32 | `grundLoopsAus` | Die Pose zeigen | Werk | werk/pose.ts (Rechnung) · Hülle (Anzeige) |  |
| 1451 | 25 | `poseVerlassen` | Die Pose zeigen | Werk | werk/pose.ts (Rechnung) · Hülle (Anzeige) |  |
| 1476 | 34 | `grundAufPfad` | Die Pose zeigen | Werk | werk/pose.ts (Rechnung) · Hülle (Anzeige) |  |
| 1510 | 8 | `nurGewachsen` | Die Pose zeigen | neutral | Hilfe (bleibt, wo sie gebraucht wird) |  |
| 1518 | 26 | `netzGewachsen` | Die Pose zeigen | Werk | werk/pose.ts (Rechnung) · Hülle (Anzeige) |  |
| 1544 | 9 | `knochenSetzen` | Die Pose zeigen | Werk | werk/pose.ts (Rechnung) · Hülle (Anzeige) |  |
| 1553 | 58 | `reglerZeigen` | Die Pose zeigen | gemischt | werk/pose.ts (Rechnung) · Hülle (Anzeige) | `allesZeigen`, `baenderZeigen`, `blaetterZeichnen`, `hautZeigen`, `kopfRegler`, `maulRegler`, `reglerZeigen`, `setAttribute` … |
| 1611 | 40 | `maulFormenGewaehlt` | Die Pose zeigen | gemischt | werk/pose.ts (Rechnung) · Hülle (Anzeige) | `document`, `statusZeigen` |
| 1651 | 78 | `maulSchritt` | Die Pose zeigen | gemischt | werk/pose.ts (Rechnung) · Hülle (Anzeige) | `allesZeigen`, `baenderZeigen`, `blaetterZeichnen`, `document`, `hautZeigen`, `reglerZeigen`, `statusZeigen` |
| 1729 | 5 | `hautSeite` | Die Pose zeigen | Werk | werk/pose.ts (Rechnung) · Hülle (Anzeige) |  |
| 1734 | 13 | `anzeigeZ` | Die Pose zeigen | Werk | werk/pose.ts (Rechnung) · Hülle (Anzeige) |  |
| 1747 | 28 | `indexOhneAnliegende` | Die Pose zeigen | Werk | werk/pose.ts (Rechnung) · Hülle (Anzeige) |  |
| 1775 | 107 | `hautZeigen` | Die Pose zeigen | gemischt | werk/pose.ts (Rechnung) · Hülle (Anzeige) | `glattZeigen`, `hautZeigen`, `innenZeigen`, `neuZeichnen` |
| 1882 | 3 | `glattOrt` | Die Pose zeigen | neutral | Hilfe (bleibt, wo sie gebraucht wird) |  |
| 1885 | 3 | `glattKenn` | Die Pose zeigen | Werk | werk/pose.ts (Rechnung) · Hülle (Anzeige) |  |
| 1888 | 7 | `glattStufen` | Die Pose zeigen | neutral | Hilfe (bleibt, wo sie gebraucht wird) |  |
| 1895 | 3 | `glattZiel` | Die Pose zeigen | neutral | Hilfe (bleibt, wo sie gebraucht wird) |  |
| 1898 | 5 | `glattOffen` | Die Pose zeigen | neutral | Hilfe (bleibt, wo sie gebraucht wird) |  |
| 1903 | 75 | `glattAnlegen` | Die Pose zeigen | Werk | werk/pose.ts (Rechnung) · Hülle (Anzeige) |  |
| 1978 | 24 | `pfadStuecke` | Die Pose zeigen | Werk | werk/pose.ts (Rechnung) · Hülle (Anzeige) |  |
| 2002 | 74 | `glattZeigen` | Die Pose zeigen | gemischt | werk/pose.ts (Rechnung) · Hülle (Anzeige) | `glattZeigen`, `koerper`, `setAttribute`, `umriss` |
| 2076 | 15 | `glattInRuhe` | Die Pose zeigen | gemischt | werk/pose.ts (Rechnung) · Hülle (Anzeige) | `baenderZeigen`, `hautZeigen` |
| 2091 | 42 | `bandGeometrie` | Die Pose zeigen | Anzeige | Hülle | `document`, `knopf`, `setAttribute` |
| 2133 | 3 | `uvAus` | Die Pose zeigen | neutral | Hilfe (bleibt, wo sie gebraucht wird) |  |
| 2136 | 8 | `linienVon` | Die Pose zeigen | neutral | Hilfe (bleibt, wo sie gebraucht wird) |  |
| 2144 | 3 | `aktuelleLagen` | Die Pose zeigen | Werk | werk/pose.ts (Rechnung) · Hülle (Anzeige) |  |
| 2147 | 6 | `zeigeLage` | Die Pose zeigen | neutral | Hilfe (bleibt, wo sie gebraucht wird) |  |
| 2153 | 16 | `streckeOffen` | Die Pose zeigen | Werk | werk/pose.ts (Rechnung) · Hülle (Anzeige) |  |
| 2169 | 23 | `zwischenPunkte` | Die Pose zeigen | neutral | Hilfe (bleibt, wo sie gebraucht wird) |  |
| 2192 | 3 | `breiteBei` | Die Pose zeigen | neutral | Hilfe (bleibt, wo sie gebraucht wird) |  |
| 2195 | 58 | `baenderZeigen` | Die Pose zeigen | gemischt | werk/pose.ts (Rechnung) · Hülle (Anzeige) | `baender`, `baenderZeigen`, `neuZeichnen`, `renderer` |
| 2253 | 6 | `element` | Die Pose zeigen | Anzeige | Hülle | `document`, `setAttribute` |
| 2259 | 7 | `pfad` | Die Pose zeigen | Anzeige | Hülle | `imBlatt` |
| 2266 | 10 | `plus3` | Die Pose zeigen | Werk | werk/pose.ts (Rechnung) · Hülle (Anzeige) |  |
| 2276 | 30 | `pfadKurven` | Die Pose zeigen | gemischt | werk/pose.ts (Rechnung) · Hülle (Anzeige) | `imBlatt` |
| 2306 | 16 | `kubisch` | Die Pose zeigen | Werk | werk/pose.ts (Rechnung) · Hülle (Anzeige) |  |
| 2322 | 68 | `stueckeGezeigt` | Die Pose zeigen | Werk | werk/pose.ts (Rechnung) · Hülle (Anzeige) |  |
| 2390 | 33 | `gezeichnetNeben` | Die Pose zeigen | neutral | Hilfe (bleibt, wo sie gebraucht wird) |  |
| 2423 | 29 | `kantenFlaeche` | Die Pose zeigen | neutral | Hilfe (bleibt, wo sie gebraucht wird) |  |
| 2452 | 26 | `auswahlMitte` | Die Pose zeigen | Werk | werk/pose.ts (Rechnung) · Hülle (Anzeige) |  |
| 2478 | 34 | `griffeZumZeigen` | Die Pose zeigen | Werk | werk/pose.ts (Rechnung) · Hülle (Anzeige) |  |
| 2512 | 5 | `blaetterZeichnen` | Die Pose zeigen | Anzeige | Hülle | `blaetterZeichnen`, `blattZeichnen` |
| 2517 | 138 | `blattZeichnen` | Die Pose zeigen | gemischt | werk/pose.ts (Rechnung) · Hülle (Anzeige) | `ausschnitt`, `blaetter`, `blattZeichnen`, `classList`, `element`, `felder`, `getBoundingClientRect`, `imBlatt` … |
| 2655 | 39 | `allesZeigen` | Die Pose zeigen | gemischt | werk/pose.ts (Rechnung) · Hülle (Anzeige) | `allesZeigen`, `baenderZeigen`, `blaetterZeichnen`, `hautZeigen`, `reglerZeigen`, `setAttribute`, `statusZeigen` |
| 2694 | 71 | `vorrechnenPlanen` | Die Pose zeigen | gemischt | werk/pose.ts (Rechnung) · Hülle (Anzeige) | `allesZeigen`, `baenderZeigen`, `blaetterZeichnen`, `hautZeigen`, `statusZeigen` |
| 2765 | 15 | `vorrechnenAus` | Die Pose zeigen | neutral | Hilfe (bleibt, wo sie gebraucht wird) |  |
| 2780 | 7 | `merke` | Messen | neutral | Hilfe (bleibt, wo sie gebraucht wird) |  |
| 2787 | 11 | `hinterDerMitteZahl` | Messen | Werk | Hülle |  |
| 2798 | 88 | `statusZeigen` | Messen | gemischt | Hülle | `statusZeigen`, `statusZeile` |
| 2886 | 33 | `abbildung` | Ziehen und G/S/R | gemischt | werk/zug.ts | `imBlatt`, `inWelt` |
| 2919 | 5 | `zFest` | Ziehen und G/S/R | neutral | Hilfe (bleibt, wo sie gebraucht wird) |  |
| 2924 | 10 | `ausdehnung` | Ziehen und G/S/R | neutral | Hilfe (bleibt, wo sie gebraucht wird) |  |
| 2934 | 25 | `stueckUm` | Ziehen und G/S/R | Werk | werk/zug.ts |  |
| 2959 | 30 | `loeserHaut` | Ziehen und G/S/R | Werk | werk/zug.ts |  |
| 2989 | 15 | `loeserFuer` | Ziehen und G/S/R | Werk | werk/zug.ts |  |
| 3004 | 15 | `stueckLoeser` | Ziehen und G/S/R | Werk | werk/zug.ts |  |
| 3019 | 11 | `griffVerschiebung` | Ziehen und G/S/R | neutral | Hilfe (bleibt, wo sie gebraucht wird) |  |
| 3030 | 9 | `restZumPfad` | Ziehen und G/S/R | Werk | werk/zug.ts |  |
| 3039 | 13 | `mitRest` | Ziehen und G/S/R | Werk | werk/zug.ts |  |
| 3052 | 8 | `zGrenzen` | Ziehen und G/S/R | neutral | Hilfe (bleibt, wo sie gebraucht wird) |  |
| 3060 | 45 | `griffZugStarten` | Ziehen und G/S/R | Werk | werk/zug.ts |  |
| 3105 | 17 | `punkteAnKreuzung` | Ziehen und G/S/R | Werk | werk/zug.ts |  |
| 3122 | 9 | `eckeGezeigt` | Ziehen und G/S/R | Werk | werk/zug.ts |  |
| 3131 | 60 | `eckeUmschalten` | Ziehen und G/S/R | gemischt | werk/zug.ts | `allesZeigen`, `statusZeigen` |
| 3191 | 8 | `maulLinieInPose` | Ziehen und G/S/R | gemischt | werk/zug.ts | `statusZeigen` |
| 3199 | 162 | `zugStarten` | Ziehen und G/S/R | gemischt | werk/zug.ts | `statusZeigen` |
| 3361 | 18 | `inDerRuhe` | Ziehen und G/S/R | Werk | werk/zug.ts |  |
| 3379 | 13 | `punktNach` | Ziehen und G/S/R | neutral | Hilfe (bleibt, wo sie gebraucht wird) |  |
| 3392 | 105 | `verschiebungen` | Ziehen und G/S/R | Werk | werk/zug.ts |  |
| 3497 | 93 | `zugBewegen` | Ziehen und G/S/R | gemischt | werk/zug.ts | `baenderZeigen`, `blaetterZeichnen`, `hautZeigen`, `inWelt`, `statusZeigen` |
| 3590 | 56 | `rundeMitWeg` | Ziehen und G/S/R | Werk | werk/zug.ts |  |
| 3646 | 29 | `davonGrenze` | Ziehen und G/S/R | Werk | werk/zug.ts |  |
| 3675 | 18 | `davongelaufen` | Ziehen und G/S/R | gemischt | werk/zug.ts | `statusZeigen` |
| 3693 | 45 | `umgeschlageneZahl` | Ziehen und G/S/R | Werk | werk/zug.ts |  |
| 3738 | 41 | `zugRechnen` | Ziehen und G/S/R | gemischt | werk/zug.ts | `baenderZeigen`, `hautZeigen`, `statusZeigen` |
| 3779 | 13 | `zieleVonJetzt` | Ziehen und G/S/R | Werk | werk/zug.ts |  |
| 3792 | 38 | `zugStufe` | Ziehen und G/S/R | Werk | werk/zug.ts |  |
| 3830 | 44 | `stufeImHintergrund` | Ziehen und G/S/R | Werk | werk/zug.ts |  |
| 3874 | 96 | `einwechseln` | Ziehen und G/S/R | gemischt | werk/zug.ts | `baenderZeigen`, `blaetterZeichnen`, `hautZeigen`, `statusZeigen` |
| 3970 | 96 | `zerleger` | Ziehen und G/S/R | gemischt | werk/zug.ts | `allesZeigen`, `statusZeigen` |
| 4066 | 35 | `hintergrundFrei` | Ziehen und G/S/R | Werk | werk/zug.ts |  |
| 4101 | 30 | `mitNachlauf` | Nach dem Loslassen und nach jeder  | Werk | werk/hintergrund.ts |  |
| 4131 | 3 | `netzZahl` | Nach dem Loslassen und nach jeder  | Werk | werk/hintergrund.ts |  |
| 4134 | 5 | `strukturJetzt` | Nach dem Loslassen und nach jeder  | Werk | werk/hintergrund.ts |  |
| 4139 | 2 | `vorlagePasst` | Nach dem Loslassen und nach jeder  | neutral | Hilfe (bleibt, wo sie gebraucht wird) |  |
| 4141 | 34 | `vorlageGenau` | Nach dem Loslassen und nach jeder  | neutral | Hilfe (bleibt, wo sie gebraucht wird) |  |
| 4175 | 7 | `lagenZahl` | Nach dem Loslassen und nach jeder  | neutral | Hilfe (bleibt, wo sie gebraucht wird) |  |
| 4182 | 40 | `loopsZahl` | Nach dem Loslassen und nach jeder  | Werk | werk/hintergrund.ts |  |
| 4222 | 3 | `standZahl` | Nach dem Loslassen und nach jeder  | Werk | werk/hintergrund.ts |  |
| 4225 | 1 | `linienGekreuzt` | Nach dem Loslassen und nach jeder  | Werk | werk/hintergrund.ts |  |
| 4226 | 13 | `GEKREUZT_TEXT` | Nach dem Loslassen und nach jeder  | Werk | werk/hintergrund.ts |  |
| 4239 | 12 | `nachZugAufraeumen` | Nach dem Loslassen und nach jeder  | Werk | werk/hintergrund.ts |  |
| 4251 | 45 | `nachlaufRechnen` | Nach dem Loslassen und nach jeder  | gemischt | werk/hintergrund.ts | `allesZeigen`, `baenderZeigen`, `blaetterZeichnen`, `hautZeigen`, `statusZeigen` |
| 4296 | 14 | `aufraeumenImFenster` | Nach dem Loslassen und nach jeder  | Werk | werk/hintergrund.ts |  |
| 4310 | 28 | `ruheImHintergrund` | Nach dem Loslassen und nach jeder  | gemischt | werk/hintergrund.ts | `statusZeigen` |
| 4338 | 51 | `aufraeumenStarten` | Nach dem Loslassen und nach jeder  | gemischt | werk/hintergrund.ts | `statusZeigen` |
| 4389 | 43 | `zwischenAnwenden` | Nach dem Loslassen und nach jeder  | gemischt | werk/hintergrund.ts | `allesZeigen` |
| 4432 | 15 | `griffWartet` | Nach dem Loslassen und nach jeder  | Werk | werk/hintergrund.ts |  |
| 4447 | 10 | `griffNachholen` | Nach dem Loslassen und nach jeder  | gemischt | werk/hintergrund.ts | `statusZeigen` |
| 4457 | 68 | `aufgeraeumtAnwenden` | Nach dem Loslassen und nach jeder  | gemischt | werk/hintergrund.ts | `allesZeigen`, `statusZeigen` |
| 4525 | 12 | `zugGriffeUebernehmen` | Nach dem Loslassen und nach jeder  | Werk | werk/hintergrund.ts |  |
| 4537 | 17 | `zwillingsEcken` | Nach dem Loslassen und nach jeder  | Werk | werk/hintergrund.ts |  |
| 4554 | 7 | `zugGriffeAblesen` | Nach dem Loslassen und nach jeder  | Werk | werk/hintergrund.ts |  |
| 4561 | 108 | `zugEnde` | Nach dem Loslassen und nach jeder  | gemischt | werk/hintergrund.ts | `allesZeigen` |
| 4669 | 26 | `nachVerdichten` | Nach dem Loslassen und nach jeder  | Werk | werk/hintergrund.ts |  |
| 4695 | 20 | `netzVergroebern` | Nach dem Loslassen und nach jeder  | Werk | werk/hintergrund.ts |  |
| 4715 | 12 | `verdichtenOptionen` | Nach dem Loslassen und nach jeder  | Werk | werk/hintergrund.ts |  |
| 4727 | 7 | `verdichtetesNetz` | Nach dem Loslassen und nach jeder  | Werk | werk/hintergrund.ts |  |
| 4734 | 25 | `loopSchneiden` | Loops schneiden, Formen zeichnen,  | Werk | werk/linien.ts |  |
| 4759 | 21 | `ruheNoetig` | Loops schneiden, Formen zeichnen,  | Werk | werk/linien.ts |  |
| 4780 | 31 | `einsetzenLetzten` | Loops schneiden, Formen zeichnen,  | Werk | werk/linien.ts |  |
| 4811 | 35 | `einsetzenNachholen` | Loops schneiden, Formen zeichnen,  | gemischt | werk/linien.ts | `hautZeigen` |
| 4846 | 31 | `nadelnWeg` | Loops schneiden, Formen zeichnen,  | Werk | werk/linien.ts |  |
| 4877 | 57 | `kanteSetzen` | Loops schneiden, Formen zeichnen,  | gemischt | werk/linien.ts | `allesZeigen` |
| 4934 | 80 | `hautNeuRechnen` | Loops schneiden, Formen zeichnen,  | Werk | werk/linien.ts |  |
| 5014 | 33 | `linienAufPfad` | Loops schneiden, Formen zeichnen,  | Werk | werk/linien.ts |  |
| 5047 | 35 | `vereinfachen` | Loops schneiden, Formen zeichnen,  | neutral | Hilfe (bleibt, wo sie gebraucht wird) |  |
| 5082 | 73 | `maulLinieErstellen` | Loops schneiden, Formen zeichnen,  | Werk | werk/linien.ts |  |
| 5155 | 53 | `formErstellen` | Loops schneiden, Formen zeichnen,  | Werk | werk/linien.ts |  |
| 5208 | 45 | `stelleAmPfad` | Loops schneiden, Formen zeichnen,  | Anzeige | Hülle | `imBlatt` |
| 5253 | 35 | `punktAufLinie` | Loops schneiden, Formen zeichnen,  | gemischt | werk/linien.ts | `imBlatt` |
| 5288 | 19 | `punktAmKlick` | Loops schneiden, Formen zeichnen,  | gemischt | werk/linien.ts | `allesZeigen` |
| 5307 | 27 | `mitteFest` | Loops schneiden, Formen zeichnen,  | gemischt | werk/linien.ts | `allesZeigen`, `statusZeigen` |
| 5334 | 109 | `loeschen` | Loops schneiden, Formen zeichnen,  | gemischt | werk/linien.ts | `allesZeigen`, `statusZeigen` |
| 5443 | 15 | `stiftDruecken` | Stift P | Anzeige | Hülle | `blattZeichnen` |
| 5458 | 10 | `stiftBewegen` | Stift P | neutral | Hilfe (bleibt, wo sie gebraucht wird) |  |
| 5468 | 7 | `stiftStueck` | Stift P | neutral | Hilfe (bleibt, wo sie gebraucht wird) |  |
| 5475 | 27 | `stiftZeichnen` | Stift P | Anzeige | Hülle | `element` |
| 5502 | 86 | `stiftFertig` | Stift P | gemischt | werk/linien.ts (Einsetzen) · Hülle (Gesten) | `allesZeigen` |
| 5588 | 7 | `abzweigOrt` | Abzweigung mit P (Zwischenschritt, | neutral | Hilfe (bleibt, wo sie gebraucht wird) |  |
| 5595 | 10 | `abzweigOrtUnter` | Abzweigung mit P (Zwischenschritt, | Anzeige | Hülle | `blaetter`, `blattPunkt`, `document` |
| 5605 | 7 | `abzweigAnfangImBlatt` | Abzweigung mit P (Zwischenschritt, | gemischt | werk/linien.ts (Einsetzen) · Hülle (Gesten) | `imBlatt` |
| 5612 | 11 | `abzweigIstAnfang` | Abzweigung mit P (Zwischenschritt, | Werk | werk/linien.ts (Einsetzen) · Hülle (Gesten) |  |
| 5623 | 18 | `abzweigZeichnen` | Abzweigung mit P (Zwischenschritt, | Anzeige | Hülle | `element` |
| 5641 | 28 | `abzweigBeginnen` | Abzweigung mit P (Zwischenschritt, | Werk | werk/linien.ts (Einsetzen) · Hülle (Gesten) |  |
| 5669 | 10 | `abzweigAbbrechen` | Abzweigung mit P (Zwischenschritt, | neutral | Hilfe (bleibt, wo sie gebraucht wird) |  |
| 5679 | 75 | `abzweigungErstellen` | Abzweigung mit P (Zwischenschritt, | Werk | werk/linien.ts (Einsetzen) · Hülle (Gesten) |  |
| 5754 | 32 | `abzweigWeiter` | Abzweigung mit P (Zwischenschritt, | Anzeige | Hülle | `allesZeigen`, `blaetter`, `blattZeichnen`, `statusZeigen` |
| 5786 | 10 | `doppelklick` | Maus und Tasten | neutral | Hilfe (bleibt, wo sie gebraucht wird) |  |
| 5796 | 88 | `druecken` | Maus und Tasten | gemischt | Hülle | `allesZeigen`, `blaetter`, `blattPunkt`, `blattZeichnen`, `statusZeigen` |
| 5884 | 38 | `bewegen` | Maus und Tasten | gemischt | Hülle | `blattPunkt`, `blattZeichnen` |
| 5922 | 110 | `loslassen` | Maus und Tasten | gemischt | Hülle | `allesZeigen`, `blaetter`, `blattPunkt`, `blattZeichnen`, `document`, `statusZeigen`, `window` |
| 6032 | 134 | `haltenSchalten` | Maus und Tasten | gemischt | Hülle | `allesZeigen`, `ausschnitt`, `statusZeigen`, `window` |
| 6166 | 10 | `BEHALTEN` | Wesen behalten, sichern, laden (10 | neutral | Hilfe (bleibt, wo sie gebraucht wird) |  |
| 6176 | 20 | `standJetzt` | Wesen behalten, sichern, laden (10 | gemischt | werk/ablage.ts (Stand) · Hülle (Knöpfe) | `ausschnitt` |
| 6196 | 12 | `zieleAus` | Wesen behalten, sichern, laden (10 | Werk | werk/ablage.ts (Stand) · Hülle (Knöpfe) |  |
| 6208 | 69 | `standAnwenden` | Wesen behalten, sichern, laden (10 | gemischt | werk/ablage.ts (Stand) · Hülle (Knöpfe) | `allesZeigen`, `ausschnitt` |
| 6277 | 41 | `speicher` | Behalten im Browser | Werk | werk/ablage.ts |  |
| 6318 | 1 | `nameGueltig` | Behalten im Browser | neutral | Hilfe (bleibt, wo sie gebraucht wird) |  |
| 6319 | 6 | `behaltenSchluessel` | Behalten im Browser | gemischt | werk/ablage.ts | `ausschnitt` |
| 6325 | 4 | `behaltenPlanen` | Behalten im Browser | neutral | Hilfe (bleibt, wo sie gebraucht wird) |  |
| 6329 | 34 | `behaltenJetzt` | Behalten im Browser | Werk | werk/ablage.ts |  |
| 6363 | 11 | `davorMerken` | Behalten im Browser | Werk | werk/ablage.ts |  |
| 6374 | 3 | `davorHolen` | Behalten im Browser | neutral | Hilfe (bleibt, wo sie gebraucht wird) |  |
| 6377 | 43 | `behaltenesHolen` | Behalten im Browser | gemischt | werk/ablage.ts | `statusZeigen` |
| 6420 | 9 | `ablageListe` | Sichern und Laden unter einem Name | neutral | Hilfe (bleibt, wo sie gebraucht wird) |  |
| 6429 | 3 | `namenPruefen` | Sichern und Laden unter einem Name | neutral | Hilfe (bleibt, wo sie gebraucht wird) |  |
| 6432 | 33 | `wesenSichern` | Sichern und Laden unter einem Name | gemischt | werk/ablage.ts (Stand) · Hülle (Feld) | `document` |
| 6465 | 7 | `wesenUebernehmen` | Sichern und Laden unter einem Name | Werk | werk/ablage.ts (Stand) · Hülle (Feld) |  |
| 6472 | 12 | `wesenLaden` | Sichern und Laden unter einem Name | neutral | Hilfe (bleibt, wo sie gebraucht wird) |  |
| 6484 | 16 | `wesenNeu` | Sichern und Laden unter einem Name | Anzeige | Hülle | `ablageFeld`, `document`, `knopf` |
| 6500 | 10 | `ablageSchliessen` | die drei Knöpfe und ihr Feld | Anzeige | Hülle | `ablageFeld`, `setAttribute` |
| 6510 | 4 | `sagen` | die drei Knöpfe und ihr Feld | Anzeige | Hülle | `statusZeigen` |
| 6514 | 4 | `datumKurz` | die drei Knöpfe und ihr Feld | neutral | Hilfe (bleibt, wo sie gebraucht wird) |  |
| 6518 | 56 | `sichernZeigen` | die drei Knöpfe und ihr Feld | Anzeige | Hülle | `ablageFeld`, `document`, `knopf`, `sagen`, `setAttribute` |
| 6574 | 9 | `sichernKurz` | die drei Knöpfe und ihr Feld | Anzeige | Hülle | `sagen` |
| 6583 | 88 | `ladenZeigen` | die drei Knöpfe und ihr Feld | gemischt | Hülle | `ablageFeld`, `document`, `knopf`, `sagen`, `setAttribute` |
| 6671 | 53 | `rendern` | Zeichnen | Anzeige | Hülle | `ausschnitt`, `baender`, `dreiKamera`, `felder`, `getBoundingClientRect`, `kameras`, `renderer`, `rendern` … |
| 6724 | 26 | `schleife` | Zeichnen | gemischt | Hülle | `statusZeigen` |
| 6750 | 476 | `bildRechnen` | Zeichnen | gemischt | Hülle | `allesZeigen`, `ausschnitt`, `baenderZeigen`, `blaetterZeichnen`, `dreiKamera`, `felder`, `getBoundingClientRect`, `hautZeigen` … |
