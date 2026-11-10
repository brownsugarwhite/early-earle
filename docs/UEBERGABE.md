# Übergabe (Stand 10.11.2026 spätnachts: G1 bis G4 gebaut; Sichern und Laden; G5 erster Teil gebaut: keine flachen Dreiecke mehr an den Linien; Florian hat keine Wesen, er testet Formen)

**Branch `claude/form-zuerst`, Arbeitsbaum `.claude/worktrees/form-zuerst`.** Diese Datei ist der Einstieg. Die alte Übergabe aus der
Käfig-Zeit (Stand 04.11.) steht in der Git-Geschichte: `git show 82aed6dc:docs/UEBERGABE.md`.

**Auftrag (Florian, 10.11.):** Die Schritte G1–G4 aus dem Nachtrag von
[`docs/research/2026-11-10-gegenpruefung-kurven-loeser.md`](research/2026-11-10-gegenpruefung-kurven-loeser.md) bauen
(„`?gewichte=geometrie` als Zielmodell“): G1 Einsetzen ausschreiben, G2 Anzeige, G3 durchgehend rechnen, G4 Schweres in den Worker.
Kriterien stehen in der Tabelle des Nachtrags; Messwerte und Befunde je Schritt unter „Stand“ am Ende des Nachtrags.

**Stand der Schritte (10.11. spätabends; es baut die Sitzung der Gegenprüfung, die frühere bauende Sitzung ändert nichts mehr):**
- **G1 gebaut** (`6eae3883`): Einsetzen für eine und drei Spalten ausgeschrieben (`loeser/zerlegung.ts`, Test `zerlegung.test.ts`),
  bitgleich mit vorher. Runde „geometrie“ 12,8 → 7,7 ms / 32 → 15,5 ms / 73 → 32 ms bei 5 200 / 11 000 / 23 400 Punkten (Kern,
  Ohr-Zug); Lösen mit drei Spalten 6,0 → 1,7 ms. Kriterium bei 11 000 erfüllt (≤ 16 ms), bei 5 200 knapp nicht (7,7 statt ≤ 7 ms,
  bei belegter Maschine gemessen).
- **G2 gebaut** (`0f80f0e2`): Griffe in wahrer Länge, Bézier-Pfad auch im Zug (`pfadKurven(a, l, sp, li)`). Probe
  `form-griff-loslassen.mjs`: Sprung der Griffspitze beim Loslassen 0,00 px (vorher 42,5 px), Linie im Zug gegen danach 0,00 px.
  **Florian hat entschieden** (10.11.): „Die Griffe bleiben in wahrer Länge wie in Illustrator.“ Der Streckfaktor und der
  Vergleichsschalter `?griffe=mindest` sind entfernt (`44a0fb8d`).
- **G3 gebaut** (`44a0fb8d`, `ab3a8d95`): Über die ganze Haut rechnet der Löser im Bildtakt (`zugRechnen` in `schleife`), auch
  wenn die Maus ruht, bis die Form steht; `zugBewegen` setzt nur noch die Ziele und zeichnet die Kurven.
  - „Steht“ = in einer Runde kein Punkt über 0,05 Einheiten längs der Flächennormalen (`RUHE`, `rundeMitWeg`), höchstens 60 Runden
    nach der letzten Mausbewegung (`NACH_RUNDEN`). Je Bild Runden für höchstens 12 ms (`BUDGET_MS`), mindestens eine.
  - Loslassen: Runden am Ende nur noch, wenn die Haut nicht steht. Das Setzen danach rechnet, bis die Form steht (höchstens
    `RUNDEN_NEU` = 12; `?setzen=4` wie vorher).
  - Nach Neuaufsetzen und Einwechseln im Zug gelten sofort die Pfade als Ziele (`zieleVonJetzt`).
  - Gemessen im Fenster (Ohr, vor dem Loslassen gehalten, vor G3 → mit G3): Ruck beim Loslassen 1,06 → 0,00 / 0,85 → 0,00 /
    11,4 → 0,00 Einheiten bei 5 200 / 11 000 / 23 400 Punkten; Ende gegen vorher (99 % der Punkte) 1,2 → 0,35 / 0,6 → 0,04 /
    8,7 → 0,25–0,7. Schnell gezogen und gehalten lag die Haut vorher 39 Einheiten zurück, jetzt 1,4.
  - **Nicht behoben:** schneller Zug mit sofortigem Loslassen; die Stufen nach dem Loslassen (Verdichten, Setzen). Das ist G4.
- **Befunde aus G3** (Bericht, „Vier Befunde aus dem Messen“):
  1. Auf einem geänderten Netz schwingt ein neuer Löser vier bis fünf Runden über (Kugel mit frisch eingesetzten Loops: 3,9 /
     7,9 / 2,9 / 1,05 / 0,10 Einheiten, die ganze Haut). Auf demselben Netz und einer Haut, die steht, stört ein neuer Löser
     nicht (≤ 0,06). So entstehen die Stufen nach dem Loslassen und der Ruck beim ersten Greifen nach einem neuen Loop.
  2. Die Punkte gleiten längs der Fläche stetig weiter (bei 23 400 Punkten 0,04 Einheiten je Runde), die Form steht.
  3. Die Bremse hält die Haut nicht nur fest: Sie steht wirklich (Gegenprobe mit neuem Löser).
  4. Bei 23 400 Punkten hat das Prüfnetz 1 442 zu kurze Kanten; das Zusammenlegen im Zug hinterlässt bei (−115, 48, ±93) Punkte
     mit drei und vier Nachbarn, an denen die Haut unruhig bleibt. `&kurz=0` lässt die Haut dort einfallen.
- **Florian zu G3 (10.11.):** „Es gefällt mir schon besser. Auch die Performance ist schon besser, aber aktuell ruckt es während
  dem Ziehen noch spürbar.“ Und: „gleich zu G4“ (die neue Fassung ist damit freigegeben).
- **G4.1 gebaut** (`cf46b548`): Das Verfeinern im Zug läuft ganz im Hintergrund (`src/form/verfeinern.ts`,
  `verfeinern.worker.ts`; `zerlegen.worker.ts` gibt es nicht mehr). Beim Auslösen wird der Zug nicht mehr neu aufgesetzt (die
  Loops gehen als festgelegte Kopie in den Auftrag), eingewechselt wird im nächsten Bild an Stelle der Löserrunde
  (`eingetroffen`, `schleife`). Gemessen (Bilder im Zug über 33 / 50 / 100 ms, längster Abstand; vorher → jetzt): 5 200 Punkte
  5 / 4 / 0, 87 ms → 1 / 0 / 0, 46 ms; 11 000 Punkte 5 / 4 / 3, 130 ms → 2 / 1 / 0, 54 ms; 23 400 Punkte 89 / 22 / 5, 469 ms →
  42 / 3 / 1, 106 ms. Es bleiben das Einwechseln (10 / 28 / 59 ms, zweimal je Zug) und bei 23 400 Punkten die Runde selbst
  (29–33 ms je Bild; G5/G6).
- **Florian (10.11. abends):** „Ja, mach weiter mit G4.2 und G4.3: Nachlauf im Bildtakt nach dem Loslassen, dann Verdichten und
  Setzen verdeckt im Hintergrund und einmal einwechseln.“
- **G4.2 und G4.3 gebaut** (`d695c2b5`, `97ad1457`; Bericht „Stand (10.11. abends)“). Nur über die ganze Haut nach der Geometrie
  in der Grundform (`mitNachlauf()`); Pose, `?haut=gedaechtnis` und gleiche Gewichte laufen wie bisher.
  - **Nachlauf:** Steht die Haut beim Loslassen noch nicht, rechnet der Löser des Zugs im Bildtakt weiter (`nachlaufRechnen` in
    `schleife`), bis die Form steht. `zugEnde` rechnet dafür höchstens noch eine Runde.
  - **Aufräumen im Hintergrund:** Danach geht ein Auftrag an den Worker (`aufraeumenStarten` → `verfeinern.ts` `aufraeumen`):
    verdichten, zerlegen, setzen bis zur Ruhe, bis zu dreimal nachverfeinern. Das Fenster wechselt das Ergebnis einmal ein
    (`aufgeraeumtAnwenden`); in der Statuszeile steht so lange „verfeinert im Hintergrund“.
  - **Die Zerlegung kommt mit** (`vorlageBereit`): Das nächste Greifen zerlegt nicht. Greift man vorher, verfällt der Auftrag
    (`hintergrundFrei` legt den Worker neu an), und der Zug nimmt die Zerlegung des letzten Zugs. Der Kern prüft selbst, ob eine
    angebotene Zerlegung zur Struktur passt (`HautVorlage.struktur`, `strukturSchluessel` in `dicht/ausKurven.ts`); passt sie
    nicht, zerlegt er selbst.
  - **Der Stand entscheidet:** Nachlauf und Auftrag hängen an `standZahl()` (Netz, Streuwert der Lagen, Streuwert der Loops).
    Hat sich der Stand geändert (Rückgängig, Kante, neuer Loop, neuer Zug), enden sie ohne Wirkung. Keine Stelle, die den Stand
    ändert, muss dafür etwas tun.
  - **Fehler:** Meldet der Auftrag einen Fehler, räumt das Fenster diesen Zug selbst auf (`aufraeumenImFenster`). Fällt der Worker
    aus (`onerror`), läuft bis zum Neuladen alles im Fenster (`hintergrundAus`).
  - **Gemessen** (Ohr, schneller Zug, sofort losgelassen; 5 200 / 11 000 / 23 400 Punkte; vorher → jetzt): Sprung beim Loslassen
    1,1–1,7 / 0,7–0,9 / 0,9 → 0,00 Einheiten; das Loslassen selbst 58 / 115 / 274 → 3 / 5 / 6 ms; längster Abstand zwischen zwei
    Bildern danach 183 / 453 / 1 437 → 21 / 25 / 31 ms; Stillstand zusammen 0,5 / 0,8 / 3,7 s → keiner; ein Netzwechsel statt
    Sprung plus ein bis zwei. Das Einwechseln kommt nach 0,7–0,9 / 1,4–2,0 / 3,2–6,1 s und ändert die Haut um bis zu 3,1 / 1,2 /
    0,7 Einheiten (99 % der Punkte unter 2,1 / 0,5 / 0,3); nach einem langsamen Zug mit Halten 99 % unter ⅓ Einheit. 400 ms nach
    dem Loslassen wieder greifen bei 23 400 Punkten: 1,0 s → 23 ms.
  - **Offen** (Bericht, „Ehrlich offen nach G4.2/G4.3“): Das Einwechseln kommt auf dichten Netzen spät und ändert die Form
    einmal sichtbar (dieselbe Änderung wie vorher in Stufen; Ursache ist die Form des feineren Netzes, G5). Weich überblenden
    beim Einwechseln wäre möglich, ist nicht gebaut (Florians Entscheidung 8).
- **Florian (10.11. spätabends):** „dann mach wie du empfiehlst“ (G4.4).
- **G4.4 gebaut** (`9e755156`, `124e32a3`, `9c5aa3f5`; Bericht „Stand (10.11. spätabends)“): nach Loop, Punkt, Kante, Löschen und
  Rückgängig rechnet der Hintergrund.
  - **Offene Arbeit je Stand:** `ruheOffen` (`setzen`: die Haut steht nicht zum Stand; `nurInRuhe`: das Setzen gilt nur, wenn
    sie dabei zur Ruhe kommt; `verdichten`: danach aufräumen; `ziele`). Es gehört zum Stand und steht im Schnappschuss
    (Rückgängig bringt es zurück). 30 ms nach jeder Änderung prüft `ruheImHintergrund` (aus `vorrechnenPlanen`), was für den
    Stand zu tun ist, und gibt es an den Hintergrund; ein Auftrag für einen früheren Stand verfällt.
  - **Auftrag mit Vorstufe** (`verfeinern.ts`, `zuerstSetzen`): zerlegen, setzen bis zur Ruhe (höchstens 60 Runden),
    Zwischenstand melden (gesetzte Lagen auf demselben Netz, samt Zerlegung); danach wie G4.3. Im Fenster `zwischenAnwenden`
    (Lagen übernehmen, `festlegenAlle`, `kreuzungenSuchen`), später `aufgeraeumtAnwenden`.
  - **Kante an/aus, Löschen:** `hautNeuRechnen` setzt nur noch `ruheOffen` (mit `sofort` rechnet es wie früher im Fenster; das
    braucht `eckeUmschalten`, und die Rückfälle ohne Hintergrund).
  - **Neuer Loop** (`ruheNoetig` in `loopSchneiden`, `formErstellen`, `stiftFertig`): setzen im Hintergrund nur, wenn sich
    Loops kreuzen, nur in Ruhe, ohne Aufräumen. `?loopsetzen=0`: wie vorher.
  - **Sonst** (Punkt gesetzt, Rückgängig, Ecke umgeschaltet): nur die Zerlegung für das nächste Greifen im Hintergrund.
  - **Der Griff wartet** (`gegriffen`, `griffWartet`, `griffNachholen`): Rechnet der Hintergrund für genau diesen Stand noch
    (setzt oder zerlegt), beginnt ein Zug erst, wenn das Ergebnis da ist, höchstens 4 s später; nach einem Zug wartet er nicht.
  - **Gemessen** (Stillstand des Fensters bei 5 200 / 11 000 / 23 400 Punkten, vorher → jetzt): Kante an 0,37 / 0,92 / 2,5 s →
    keiner; Kante aus 0,49 / 1,4 / 6,2 s → keiner; Punkt setzen 0,09 / 0,28 / 1,0 s → keiner / keiner / 0,08 s; Punkt löschen
    0,17 / 0,55 / 1,6 s → keiner; Rückgängig 0,11 / 0,31 / 1,05 s → keiner; Loop schneiden 0,2 / 0,4–0,8 / 1,1–1,3 s → 0–0,12 /
    0,06–0,12 / 0,11–0,34 s. Die Kante erscheint nach 0,2–0,3 / 0,5–0,6 / 1,6–2,6 s. Erster Griff nach den Loops: Ausschlag fern vom
    Griff 7,0 / 11,6 / 25,9 → 0,14 / 0,12 / 0,20 Einheiten je Bild.
  - **Befund:** Mit einem einzelnen Loop hält nichts die Haut (Kern `loeser/mess10.ts`: ein neuer Löser schlägt bis 149
    Einheiten je Runde aus, 23–36 Runden; im Fenster zog das Setzen nach dem ersten Ring die Kugel bei 11 000 Punkten 11
    Einheiten flach, nach dem dritten Loop lief die Haut auseinander). Deshalb die Bedingung „Loops kreuzen sich“.
  - **Offen** (Bericht, „Ehrlich offen nach G4.4“): die Kante erscheint auf dichten Netzen erst nach 1,6–2,6 s; mit einem
    einzelnen Loop ruckt der erste Griff wie bisher; Loop schneiden hält noch 0,1–0,2 s an; Ecke umschalten rechnet im Fenster.
- **Florian (10.11. nachts):** „Weiter mit G5: zuerst mein Wesen sichern und laden können (es übersteht dann auch das Neuladen),
  dann die Güte des Netzes an meinen echten Wesen messen.“
- **Sichern und Laden gebaut** (`92b60a5b`; Bericht „Stand (10.11. nachts)“). `src/form/ablage.ts` (Format, ohne DOM), in
  `kurven.ts` der Abschnitt „Wesen behalten, sichern, laden“ (ab Zeile 3830), `vite.config.ts` (`wesenAblage`), Knöpfe in
  `kurven.html`.
  - **Behalten:** Der Stand liegt im Browser (IndexedDB `early-earle-kurven`, Fach `stand`, Schlüssel `zuletzt`) und kommt beim
    Start zurück (`behaltenesHolen`), wenn die Startform der Adresse dieselbe ist (`START_KENNUNG`: `form`, `dreiecke`).
    Geschrieben wird 0,8 s nach der ersten Änderung seit dem letzten Mal (`behaltenPlanen` aus `allesZeigen` und
    `ausschnittGeaendert`), nicht im Zug, Nachlauf oder wartenden Griff, nie die leere Startform, nie ein Stand, den `pruefen`
    ablehnt. `&behalten=0` schaltet es ab.
  - **Sichern** (Knopf, ⌘S; `wesenSichern`): `PUT /__wesen/<Name>` schreibt `wesen/<Name>.eewesen` im Arbeitsbaum (erst `.neu`,
    dann umbenennen). Namensfeld im Fenster (kein Dialog); ein anderer vorhandener Name erst beim zweiten Drücken; ⌘S nimmt den
    Namen von zuletzt. Läuft die Haut noch nach, wartet es. Ohne Server legt der Browser die Datei ab.
  - **Laden** (`ladenZeigen`, `wesenLaden`): Liste aus `GET /__wesen/`, dazu „Datei …“. **Neu** (`wesenNeu`): die Startform.
    Beides über `wesenUebernehmen` = ein Schritt für ⌘Z (`zurueck.push(schnappschuss())`, dann `standAnwenden`).
  - **Wesen von vorher** (`davorMerken`, Schlüssel `davor`): Was „Laden“ oder „Neu“ ersetzt, bleibt im Browser liegen und steht
    in der Liste von „Laden“ ganz oben (über das Neuladen hinweg, wenn ⌘Z es nicht mehr bringt).
  - **Das Maß gehört zum Wesen:** `MK` und `TOL` sind veränderlich und stehen im Schnappschuss (`mk`); ein geladenes Wesen behält
    seine Netzdichte.
  - **Format:** Kennung `EEKW1`, Kopf als JSON (Stand mit Verweisen), die großen Felder binär an durch 8 teilbaren Stellen; −0
    und nicht endliche Zahlen eigens. `entpacken` prüft (`pruefen`) und wirft mit lesbarem Grund. 0,4 MB bei 5 000, 2,0 MB bei
    24 000 Punkten; Packen im Fenster 1–4 ms.
  - **Geprüft:** `ablage.test.ts` (4), `form-ablage-probe.mjs` (27 Prüfungen, bei 5 000 und 24 000 Punkten alle gut),
    `form-nachlauf-probe.mjs` (18) und `form-aendern-probe.mjs` unverändert.
  - **Grenzen:** die Liste der Schritte wird nicht gesichert; nur dieser Browser und dieselbe Startform; keine älteren
    Fassungen; kein Löschen im Fenster.
- **G5 Teil 1: Werkzeug für die Güte des Netzes** (`64354dac`): `scripts/pruefen/form-netzguete.ts` liest gesicherte Wesen,
  `form-probewesen.mjs` baut Probewesen mit der Maus. Erste Zahlen an Probewesen (Bericht, Tabelle und fünf Befunde):
  - Das Netz ist nicht dichter als das Startnetz (0,98–1,19) und wächst mit der Fläche.
  - Beim Spielen (hinaus und zurück, gleiche Form) wächst es um 7–10 %: geteilt wird über 1,75 Startkanten, zusammengelegt erst
    unter 0,5.
  - An den Linien bleiben flache Dreiecke stehen (drei aufeinanderfolgende Punkte einer Linie, 14–28 je Wesen); nach dem
    Schneiden eines Loops Nadeln bis zum ersten Aufräumen. Das sind die unruhigen Stellen aus G3.
  - Für die Rundung genügten rund 3 000 Punkte (Schätzung), ob mit 7 100 oder 32 900 gerechnet.
- **Klarstellung von Florian (10.11. nachts): „Es gibt von mir keine Wesen. … Ich teste immer nur ein paar Formen, aber wie soll
  ich jetzt schon Wesen machen. Es ist ja nur die Grundform-Erzeugung bis jetzt.“**
  - Die Annahme „Florians Wesen haben 11 000 bis 26 000 Punkte“ stammt aus zwei seiner Bildschirmfotos vom 08.11. (Hörner mit
    Griffspiel: 18 234 und 26 284 Punkte). Sie stand so in der Übergabe der früheren Sitzung und zieht sich durch den Bericht
    (auch das Kriterium von G5). Fertige Wesen gibt es nicht; von ihm ist dafür nichts zu erwarten.
  - „An meinen echten Wesen messen“ war kein Satz von ihm, sondern der Text eines Knopfs, den diese Sitzung ihm angeboten hat.
  - **Nachgestellt** (`form-drei-faelle.mjs` mit `ABLEGEN=fall-hoerner`, dann `form-netzguete.ts`; Ausgabe
    `ausgaben/g5-netzguete-fall-hoerner.txt`): Derselbe Fall endet heute bei 7 352 Punkten (Dichte 1,05 des Startnetzes), nicht
    bei 18 000 bis 26 000. **Ob das Netz bei seinem Testen heute noch so wächst, ist damit offen**; der Teil „Zahl der Punkte“
    von G5 hat keine bestätigte Grundlage. Bestätigt sind die Mängel der Güte: flache Dreiecke an den Linien in jeder Form, nach
    dem Griffspiel 18 umgeklappte Dreiecke (die meisten an den Hornspitzen), 7 bis 10 % Wachsen beim Spielen.
  - Sichern bleibt nützlich, aber als Angebot: Wenn eine Form beim Testen auffällt (unruhig, eckig, langsam, die letzte Zahl der
    Statuszeile über 10 000), sichert ein Klick genau diesen Stand zum Nachsehen.
- **Florian (10.11. spätnachts):** „Kannst du gerne so machen wie du es vorgeschlagen hast. Es macht Sinn, den Plan jetzt erst
  zu beenden und dann an Maul, Posen und genaue Werkzeugfunktion zu gehen, oder? Ich möchte später gerne mehr Funktionen wie bei
  FiberMesh haben. Dass ich Formen subtrahieren, addieren kann und Elemente wie Beine anfügen kann und dabei einen smoothen
  Übergang zwischen Teilen kreieren, dass sie später ein Mesh sind und der Linien… das ist jetzt erstmal noch nicht der richtige
  Zeitpunkt und sollte später kommen, oder?“ Beides bestätigt (Reihenfolge siehe Abschnitt 5).
- **G5, erster Teil gebaut: keine flachen Dreiecke mehr an den Linien** (`2be21c5b`; Bericht „Stand (10.11. spätnachts)“).
  - **Ursache nachgewiesen** (Kern, `netz/m8-ohren.ts`): Sie entstehen nur beim Zusammenlegen. Schneidet eine Linie eine Ecke
    knapp ab, hat der abgeschnittene Punkt kurze Kanten zu drei aufeinanderfolgenden Punkten der Linie; fällt er in den ersten
    oder letzten, spannt sein Dreieck danach die drei Punkte auf. Der Test „kippt um mehr als 60°“ sieht ein Dreieck ohne Fläche
    nicht. Auf demselben Netz: ohne Schutz 8 flache Dreiecke, mit Schutz 0.
  - **Im Kern** (`dicht/verdichten.ts`): (1) Zusammenlegen (`legen`) und Drehen (`drehen`) lassen kein Dreieck flach werden
    (kleinster Winkel unter `FLACH` = 10° und dabei mehr als halbiert); (2) vorhandene flache Dreiecke (kleinster Winkel unter
    5°, ein Winkel über 150°) werden aufgelöst, indem ihre lange Kante gedreht wird (Ergebnis `geloest`; ein Netz, an dem nur das
    zu tun ist, kommt jetzt auch zurück statt `null`); (3) `nadelnZusammenlegen(h, loops, mk)` (nur Kanten an Linien unter 0,22
    Startkanten, ohne Teilen, Drehen, Entspannen; Option `nurKetten`). Option `flachSchutz: false` rechnet wie vorher.
  - **Im Fenster:** `nadelnWeg()` am Ende von `einsetzenLetzten` (nur wenn am neuen Loop eine so kurze Kante liegt); die Puffer
    der Anzeige werden nach dem Einsetzen jetzt einmal am Ende aufgebaut. Schalter `&flach=0` (Option `flachSchutz`) und `&nadeln=0`;
    Haken `zeiten().nadeln`.
  - **Gemessen im Fenster** (Probeformen neu gebaut, vorher → jetzt, Dreiecke beider Seiten): flach längs einer Linie 14–28 → 0,
    Dreiecke unter 1° 14–26 → 0, Punkte mit ≤ 3 Nachbarn 6–12 → 0, unruhige Stellen je Seite 6–14 → 0 (die fünf Formen mit Zügen);
    Nadeln nach dem Schneiden 20 → 0 (5 200 Punkte) und 228 → 2 (23 400). Punkte und Kantenlängen unverändert. Tests im Kern
    118 von 118 (`dicht/flach.test.ts` neu), Fenster 16 von 16.
  - **Nicht geändert, gemessen:** das Rechnen selbst (gleich viele Runden mit und ohne Nadeln, `mess10.ts` mit `NADELN=1`); das
    Ausschlagen mit einem einzelnen Loop (Vermutung „kommt von den Nadeln“ widerlegt); der Knoten im Hörner-Fall (je drei
    Läufe, die Streuung ist größer als der Unterschied); das Wachsen beim Spielen (7 108 → 7 590).
  - **Kosten:** Loop schneiden steht bei 5 200 Punkten 88–100 ms statt 41–69 ms, wenn am Loop Nadeln liegen (das
    Zusammenlegen selbst rund 20 / 40 / 80 ms bei 5 400 / 11 200 / 23 600 Punkten).
  - **Dabei behoben:** Unter Playwright (`navigator.webdriver`) behält das Fenster nichts mehr, außer mit `&behalten=1`. Seit dem
    Sichern und Laden begannen Proben, die die Seite je Fall neu laden, den zweiten Fall mit der Form des ersten (die Härte-Probe
    blieb hängen).
- **Als Nächstes:** Florians Blick auf G4, auf Sichern/Laden und auf diesen Schritt. Vom Plan G1–G6 ist danach nichts Pflicht
  mehr offen: Der Teil „Zahl der Punkte“ von G5 und G6 ruhen, bis ein dichtes Netz aus seinem Testen vorliegt. Dann nach seiner
  Reihenfolge: Maul, Posen, genaue Werkzeuge (Abschnitt 5).

## 1. Stand

- **Letzter Code-Commit:** `2be21c5b` (G5 Teil 1: keine flachen Dreiecke an den Linien); davor `92b60a5b` (Sichern und Laden).
  Alles ist committet und gepusht (lokal = `origin/claude/form-zuerst`).
- **Halbfertiges:** keins. Am 09.11. sind zwei Löser-Versuche wieder entfernt worden („gleiches Maß“, „Krümmung an den Linien
  mitgelöst“; Stand des zweiten in `476a874f`). Der Code des Lösers (`dicht/ausKurven.ts`) ist seit `1f1f5079` (Schalter
  `maxNormalen`) im Rechnen unverändert; G1 hat nur das Einsetzen in `loeser/zerlegung.ts` ausgeschrieben, G2 und G3 nur das
  Fenster. G4.3 hat im Löser nur die Annahme einer angebotenen Zerlegung geändert (Prüfung der Struktur, `vorlageGenutzt`).
- **Läuft:** ein Vite-Server auf Port 5193 aus diesem Arbeitsbaum. Seit dem 10.11. mittags gehört er der Sitzung der
  Gegenprüfung (Konfiguration `kurven` in `.claude/launch.json` des Hauptordners, mit `pnpm -C <Arbeitsbaum>`); der alte Prozess
  der früheren Sitzung ist beendet. Florian testet damit. Vor einem eigenen Start `lsof -i :5193` prüfen. Port 5180 gehört dem
  alten Editor, nicht benutzen.
- **Dokumente:**
  - Gegenprüfung mit Nachtrag (Maßstab für G1–G4): `docs/research/2026-11-10-gegenpruefung-kurven-loeser.md`; Einzelberichte in
    `docs/research/2026-11-10-gegenpruefung-berichte/`; Skripte und Ausgaben in
    `apps/editor/scripts/pruefen/gegenpruefung-2026-11-10/` (README).
  - Bilanz seit dem 11.10.: `docs/research/2026-11-09-bilanz-wesen-editor.md` (zwei Fehler darin, siehe Abschnitt 6).
  - Planseite des Wegs: `docs/plans/2026-11-06-kurven-als-wahrheit.md` (Abschnitte 1–18, chronologisch).
  - Florians Klarstellungen wörtlich: `docs/plans/2026-10-22-klarstellungen.md` (Nachrichten 1–3).
  - Verlauf: `CLAUDE.md`, Einträge ab 04.11. („Form zuerst“).

## 2. Starten und testen

**Server** (aus dem Wurzelordner des Arbeitsbaums):

```bash
EDITOR_WEB=1 pnpm --filter @ee/editor exec vite --port 5193 --strictPort
```

- **Florians Adresse jetzt:** `http://localhost:5193/kurven.html?gewichte=geometrie`. Standard ohne Schalter ist der Löser mit gleichen
  Gewichten. `?form=bohne` startet mit einer Bohne statt der Kugel, `?dreiecke=<n>` setzt die Größe des Startnetzes (Standard 6 000).
  Seit dem 10.11. nachts kommt beim Laden der Seite das Wesen von zuletzt zurück (`&behalten=0`: immer die Startform). Proben
  beginnen mit einem leeren Browser und merken davon nichts; im Vorschau-Fenster und in Florians Browser bleibt das Wesen.
- **Altes Fenster** `form.html` (Form aus den Ansichten) und der alte Editor (`pnpm editor`, Käfig) werden nicht mehr benutzt.
- **Test-Haken im Fenster:** `window.__kurven` (`kurven.ts`, ab Zeile 3635; `zeiten()` trägt seit G4.1 auch `messung`,
  `hintergrundTeile`, `auspacken`, `einwechslungTeile`, seit G4.3 `nachlauf`, `nachlaufRunden`, `aufraeumen`, `auftrag` (der
  letzte Auftrag: `nr`, `angewendet`, Zeiten), `hintergrundAus`, `loslassen`; neu `roh` (Lagen und Dreiecke ohne Kopie),
  `ausfall` und `auftragFehler` (Fehler nachstellen); seit G4.4 `ruheOffen`, `auftragNr`, `zwischen` (letzter Zwischenstand),
  `griffWartet` und `beschaeftigt` (rechnet noch etwas oder steht etwas an: darauf warten Proben statt auf feste Zeiten); seit
  dem 10.11. nachts `ablage` (`sichern(name)`, `laden(name)`, `liste()`, `neu()`, `behalten()` (jetzt behalten und warten, bis
  es im Browser liegt), `bereit()` (beim Start ist nachgesehen), `mk()`, `name()`, `bytes()`, `davor()`)):
  `weiterrechnen` (n Runden im laufenden Zug),
  `nachrechnen`, `loops`, `auswahl`, `pfadRest`, `knickAm`, `griffe`, `kamera`, `knick`, `umgeschlagen`, `maul`, `zeiten` (zug,
  zerlegen, bereich, verdichtung, punkte, stufen, endrunden, offen, nachRunden, hintergrund, ausloesung, einwechslung,
  hintergrundMs, stufeMs, neuRechnen, vorrechnen, nachLoesen), `lagen`, `grundLagen`, `pose`, `dreiecke`, `meldung`, `bild` (Weltpunkt →
  Pixel im Blatt), `ausschnitt` (Zoom je Blatt), `felder`, `setzeRadius`, `symmetrie`, `masse`.

**Tests, die grün sein müssen:**
- Fenster, aus `apps/editor`: `npx vitest run src/form/` (16 Tests: die Aufträge im Hintergrund, im Zug, nach dem Loslassen,
  mit Vorstufe; das Wesen als Datei).
- Kern der dichten Form, aus `packages/shape`: `npx vitest run src/dicht/ src/loeser/zerlegung.test.ts`. Zuletzt 118 von 118
  grün (10.11. spätnachts, mit `flach.test.ts`), etwa 20 s. Ausgaben
  bestandener Tests nur mit `--reporter=verbose`. `HAUT=gedaechtnis` lässt `loops.test.ts` und `weiterZug.test.ts` mit dem alten
  Löser laufen (Standard `kurven`).
- Typen: `pnpm --filter @ee/shape typecheck` (09.11. grün); `pnpm --filter @ee/editor exec tsc --noEmit -p tsconfig.json` (10.11.
  grün). Lint: `pnpm --filter @ee/editor exec eslint <dateien>` (10.11. sauber für die geänderten Dateien). `prettier` mit der
  Vorgabe des Repos passt nicht zu den Dateien unter `form/` (lange Zeilen); nicht umformatieren.
- **Nicht** die ganze Testreihe von `@ee/shape`: Die Zeit- und Lasttests des Käfigs reißen unter Last (ohne Bezug zu `dicht/`).
- Die Tests unter `dicht/` haben keine Zeitschranken. Die Grenzen in `weiterZug.test.ts` (A–E) hängen an der Reihenfolge des
  Zusammenlegens und haben deshalb Abstand. Wer das Zusammenlegen oder den Löser ändert, sieht dort zuerst etwas.

**Proben im Fenster** (aus `apps/editor`: `node scripts/pruefen/<probe>.mjs`, Variante über `KURVEN_URL=…`; nie gleichzeitig mit
vitest; während sie laufen, keine Dateien unter `packages/shape/src` oder `apps/editor/src` ändern):

| Probe | wofür |
| --- | --- |
| `form-drei-faelle.mjs` | Florians Hörner mit Griffspiel (`FALL=hoerner`) und das kleine Detail (`FALL=detail`): Zeit je Mausbewegung, Knicke, umgeklappt, **umgestülpt** (schwarze Stellen), jede Änderung nach dem Loslassen. Seit G3: `HALTEN=<ms>` (je Bild Bewegung und Rauminhalt beim Halten), `GPU=1` |
| `form-loslassen-probe.mjs` | Sprung nach dem Loslassen (Hals, Ohr, Rüssel); seit G4.1 auch die Zeile „Bilder im Zug“ (Abstand von Bild zu Bild, Arbeit im Hauptthread je Bild, je Auslösen und Einwechseln). Seit G3: `HALTEN=<ms>` vor dem Loslassen, `PAUSE=<ms>` je Mausschritt, `GPU=1`, `REST=<Runden>` (Rest zur Ruhe), `FERN=<Einheiten>` (Ausschläge fern vom Griff je Bild), `SICHERN`/`VERGLEICH` (zwei Läufe gegeneinander); der Stand vor und nach dem Loslassen wird im Fenster festgehalten. Seit G4.2/G4.3 liest sie nach dem Loslassen im Fenster mit (Abstand der Bilder und wo die längsten liegen, Bewegung bei gleichem Netz, jeder Netzwechsel mit dem Stand davor und danach, Zeiten des Auftrags); `WIEDER=<ms>` greift noch einmal, `NACH=5x6` rechnet am Ende weiter (steht die Haut?); `&nachlauf=0` in `KURVEN_URL` zeigt den Ablauf von vorher |
| `form-nachlauf-probe.mjs` | (G4.2–G4.4) Nachlauf und Hintergrund dürfen einen geänderten Stand nicht anfassen: ⌘Z sofort, ⌘Z während der Hintergrund rechnet und danach, gleich wieder greifen, Kante, neuer Loop (beide setzen sich seit G4.4 selbst), Fehler im Auftrag, Ausfall des Workers; 18 Prüfungen, `KURVEN_URL` mit `&dreiecke=14000` für 11 000 Punkte |
| `form-aendern-probe.mjs` | (G4.4) Was hält das Fenster bei Loop, Kante, Punkt setzen, Löschen, Rückgängig an, und was macht der erste Griff danach: je Schritt die längsten Abstände zwischen zwei Bildern, Netzwechsel, Bewegung der Haut, Zeiten aus dem Hintergrund; beim Griff der Ausschlag fern vom Griff (untere Hälfte) je Bild. `NUR=loops\|griff\|kante\|punkt\|sofort`; `&nachlauf=0` zeigt den Ablauf von vorher, `&loopsetzen=0` nur ohne das Setzen nach neuen Loops |
| `form-ablage-probe.mjs` | (10.11. nachts) Behalten, Sichern, Laden: neu laden (Bit für Bit), Zug danach, ⌘Z, Sichern mit Feld und ⌘S, Name bleibt, kein Überschreiben, Neu, Laden, Wesen von vorher, Fressen-Pose, andere Startform; 27 Prüfungen. Legt „probe-ablage…“ in `wesen/` an und räumt sie wieder weg (`LASSEN=1` lässt sie liegen) |
| `form-probewesen.mjs` | (G5) baut mit der Maus immer dieselben Probewesen (Kugel mit drei Loops → Hals und Kopf → Rüssel, Ohr, Kante → gespielt) und legt sie nach `pruefen-ausgabe/probewesen/` (nicht in `wesen/`); `NAME`, `SPIEL=<n>` (so oft hinaus und zurück, mit der Zahl der Punkte nach jedem Mal), `ZIEL` |
| `form-alte-proben.sh` | (G5) elf ältere Proben nacheinander (Härte, Boden, Kreuzung, Griffe, Stift, Maul, Fressen, hin und zurück, zwei weite Züge, Griff loslassen) für den Vergleich zweier Schalter: `zsh scripts/pruefen/form-alte-proben.sh <name> ['&flach=0&nadeln=0']`, danach `diff -r pruefen-ausgabe/alte-proben/<a> <b>` |
| `form-anlauf-probe.mjs` | die ersten Bilder eines winzigen Zugs (Anlauf eines neuen Lösers); `ZWEIMAL=1` greift ein zweites Mal |
| `form-griff-loslassen.mjs` | Griff bzw. Punkt (`ZUG=punkt`) ziehen und loslassen: Spitze unter der Maus, Sprung, Linie im Zug gegen danach, Runden am Ende |
| `form-explosion-probe.mjs` | weite Züge `FALL=a\|b\|c\|d\|e\|f\|g\|p` (Überhang, Schnabel, Schlaufe, Stauchen, Rüssel mit Griff, Hammer, Pilz) |
| `form-greifen-probe.mjs` | Tempo beim Greifen, je Mausbewegung, beim Loslassen, bei 5 200 und 15 400 Punkten |
| `form-boden-probe.mjs`, `form-haerte-probe.mjs` | flacher Boden; Kante an Pilz, Linse, Braue |
| `form-hin-zurueck.mjs` | Punkt hinaus und zurück, Linie ohne Welle (`ZYKLEN`) |
| `form-stift-probe.mjs`, `form-stift-kreuzung-probe.mjs` | Stift P, Form über Linien genau |
| `form-griffe-probe.mjs`, `form-punkte-zoom-probe.mjs`, `form-spiegelpunkt-probe.mjs`, `form-kreuzung-probe.mjs` | Griffe, Punkte wie Illustrator, Zoom, Ringenden, Kreuzung = ein Punkt |
| `form-maul-loop.mjs`, `form-fressen-pose.mjs` | Maul als Loop; Fressen-Pose (Blendshape, Grundform bitgleich) |
| `form-detail-probe.mjs`, `form-verdichten-probe.mjs` | kleine Details, Verdichten |

**Proben im Kern** (aus `packages/shape`: `npx vite-node ../../apps/editor/scripts/pruefen/<probe>.ts`):
- `gegenpruefung-2026-11-10/netz/m8-ohren.ts` (G5): der Ablauf der Probeformen ohne Fenster (drei Loops, Hals, aufräumen, Ring,
  Kopf, aufräumen), nach jedem Schritt die spitzen Dreiecke nach Art, bei jedem Aufräumen die Teile des Verdichtens einzeln;
  `OHNE_SCHUTZ=1` (wie vorher), `NADELN=1` (Nadeln gleich weg), `DREIECKE`.
- `form-netzguete.ts` (G5): die Güte des Netzes an gesicherten Wesen (`wesen/*.eewesen`; `WESEN="Name,Name"`, `ORDNER=<anderer
  Ordner>`, `DATEI=<pfad>`, `BILD=<ordner>` schreibt je Wesen `<Name>-netz.html`, daraus ein Bild mit
  `node scripts/pruefen/html-shot.mjs --jpg <datei>` aus `apps/editor`). Sieben Abschnitte je Wesen und eine Übersicht; die
  Sehnenfehler in festen Einheiten (0,2 und 0,8), damit Wesen aus verschieden dichten Startnetzen vergleichbar sind.
- `form-netzunabhaengig.ts` (`FALL=hals|ohr|ruessel`, `GEWICHTE=gleich|geometrie`): Nachhinken, Sprung beim Verfeinern. **Achtung:**
  Standard sind 60 Mausschritte mit je zwei Runden, das Fenster rechnet 30 mit je einer. Für Nachhinken `SCHRITTE=30 JE_SCHRITT=1`.
- `form-mass-netz.ts`: wie stark das Maß dieselbe Fläche nach dem Verfeinern anders liest.
- Die Messkopie des Lösers und die Skripte der Gegenprüfung (`loeser/mess1.ts` mit `GEWICHTE=geometrie`, `algebra/a4-kern.ts` mit
  `loesen3` …) in `apps/editor/scripts/pruefen/gegenpruefung-2026-11-10/`. Seit G3 dort auch `loeser/mess7.ts` (Form gegen Gleiten
  nach dem Zug, Anlauf eines neuen Lösers; `FALL=ruhe` ohne Zug), `loeser/mess8.ts` (neuer Löser auf dem Ruhestand, Stand der
  Bremse) und `netz/m7-unruhige-stelle.mjs` (Fenster, 23 400 Punkte). Seit G4.4 `loeser/mess10.ts` (hält die Haut, wenn man sie
  nach einem neuen Loop setzt: `LOOPS=ring,mitte,ring2`, `SETZEN=jeder|ende`, `DREIECKE`).

**Was wackelt:**
- Fenster-Proben sind nicht genau wiederholbar. Die Runden je Bild hängen an der Uhr, das Setzen an einem Zeitgeber. Derselbe
  Fall gab am 08.11. 11,4 und am 09.11. 4,6 Einheiten; die Hörner im verknoteten Zustand am 10.11. 5 bis 66 (fünf Läufe).
- **Ohne `GPU=1` rechnet der Software-Renderer jedes Bild etwa 100 ms lang.** Seit G3 hängt das Rechnen am Bild: Dann kommen
  nur zehn Runden je Sekunde zustande, und ein Zug der Probe dauert doppelt so lang. Für alles, was Zeit oder Nachhinken misst,
  `GPU=1` setzen (Proben, die den Schalter noch nicht haben: `chromium.launch({ args: ['--use-angle=metal', '--enable-gpu',
  '--ignore-gpu-blocklist', '--enable-unsafe-webgpu'] })`).
- Den Stand „vor dem Loslassen“ im Fenster festhalten (Listener in der Erfassungsphase, wie in `form-loslassen-probe.mjs`), nicht
  mit einem Aufruf davor: Seit G3 rechnet die Haut zwischen dem Aufruf und dem Loslassen weiter.
- Große Stände erst am Ende der Probe aus dem Fenster holen: Das Übertragen hält das Fenster an (bei 23 400 Punkten rund 60 ms)
  und stand zuerst als „längster Abstand 93 ms“ mitten im Nachlauf in der Messung.
- Wann das Einwechseln kommt, schwankt mit der Zahl der Durchgänge im Hintergrund (bei 23 400 Punkten 3 bis 6 s).
- Zum Vergleichen mit einem alten Stand: `git show <commit>:apps/editor/src/form/kurven.ts > src/form/kurvenAlt.ts`, dazu eine
  Kopie von `kurven.html` mit diesem Skript (beides danach löschen). Beide Stände laufen dann auf demselben Server.
- Faltenzahlen streuen bei gleicher Form um den Faktor 2.
- Zeiten nur als Verhältnisse lesen; bei belegter Maschine gibt es Ausreißer.

## 3. Karte von `apps/editor/src/form/kurven.ts` (4 680 Zeilen, Stand `92b60a5b`)

Seit `2be21c5b` (G5 Teil 1) liegt alles ab Zeile 3110 um rund 50 höher als im nächsten Absatz genannt: `einsetzenLetzten` 3092 (baut die
Puffer der Anzeige jetzt einmal am Ende), `NADELN` 3123, `FLACH_SCHUTZ` 3128, `nadelnWeg` 3130, `verdichtenOptionen` 3031 (gibt
`flachSchutz` mit). Im Kern `dicht/verdichten.ts`: `FLACH`, `kleinsterWinkel`, der Schutz in `legen` und `drehen`, das Auflösen vor
dem Drehen nach Wertigkeit, `nadelnZusammenlegen` am Ende der Datei.

Seit dem 10.11. nachts (Sichern und Laden) liegt alles ab Zeile 190 um 10 bis 20 höher als unten für G4.4 genannt, ab 3830 um
rund 420. Neu: `MK`/`TOL` als `let` 198, `schnappschuss` 389 (trägt `mk`), `wiederherstellen` 402, Tasten 3757 (⌘S zuerst; im
Namensfeld gehören die Tasten dem Feld), **Wesen behalten, sichern, laden 3830–4298:** `BEHALTEN` 3849, `START_KENNUNG` 3851,
`standJetzt` 3854, `START_STAND` 3870, `zieleAus` 3873, `standAnwenden` 3884 (beendet, was rechnet, und ruft
`wiederherstellen`), `speicher` 3929, `behaltenPlanen` 3969, `behaltenJetzt` 3973, `davorMerken` 4007, `behaltenesHolen` 4021,
`ablageListe` 4051, `wesenSichern` 4063, `wesenUebernehmen` 4096, `wesenLaden` 4102, `wesenNeu` 4114, `sichernZeigen` 4148,
`sichernKurz` 4204, `ladenZeigen` 4213; `rendern` 4301, `schleife` 4347, Haken ab 4379 (`ablage` 4393). Daneben `ablage.ts`
(`WesenStand`, `packen`, `zusammen`, `entpacken`, `pruefen`, `auskunft`; ohne Importe zur Laufzeit, damit die Messskripte es aus
`packages/shape` lesen können) und `ablage.test.ts`.

Die Zeilen der Tabelle stammen vom Stand `ab3a8d95`; seit G4.4 liegen sie ab 345 um rund 12 höher, ab 1430 um rund 40, ab 2180
um 60 bis 590 höher. Stand nach G4.4: `RuheOffen`/`ruheOffen` 356, `schnappschuss` 381 (trägt `ruhe`), `vorrechnenPlanen` 1470
(30 ms nach jeder Änderung: `ruheImHintergrund`, sonst wie früher im Fenster), `statusZeigen` 1547, `loeserFuer` 1715,
`eckeUmschalten` 1848, `zugStarten` 1898, `zugBewegen` 2108, `rundeMitWeg` 2180, `zugRechnen` 2202, `zugStufe` 2251,
`stufeImHintergrund` 2288, `einwechseln` 2332, `zerleger` 2424 (mit `onmessage`: Zwischenstand, Ergebnis, Fehler; `onerror`),
`hintergrundFrei` 2513, **Rechnen im Hintergrund (G4.2–G4.4) 2520–2910:** `NACHLAUF` 2547, `mitNachlauf` 2548, `vorlageBereit`
2568, `lagenZahl` 2591, `loopsZahl` 2598, `standZahl` 2637, `nachlaufRechnen` 2640, `aufraeumenImFenster` 2680,
`ruheImHintergrund` 2694, `aufraeumenStarten` 2722, `zwischenAnwenden` 2770, `gegriffen` 2809, `griffWartet` 2812,
`griffNachholen` 2825, `aufgeraeumtAnwenden` 2835; `zugEnde` 2912, `nachVerdichten` 3000, `verdichtenOptionen` 3014,
`loopSchneiden` 3033, `ruheNoetig` 3056, `kanteSetzen` 3099, `hautNeuRechnen` 3133, `linienAufPfad` 3196, `druecken` 3554,
`loslassen` 3655, `rendern` 3814, `schleife` 3860 (Reihenfolge je Bild: einwechseln oder `zugRechnen`, `nachlaufRechnen`,
`zwischenAnwenden`, `aufgeraeumtAnwenden`, wartenden Griff beginnen, zeichnen), Haken ab 3891.
Neben `kurven.ts`: `verfeinern.ts` (die Aufträge: `verfeinern` im Zug; `aufraeumen` nach dem Loslassen und, mit Vorstufe, nach
Kante, Löschen, neuem Loop; `hautFlach`, `hautAusFlach`), `verfeinern.worker.ts`, `verfeinern.test.ts`. `zugNeuAufsetzen` gibt es
nicht mehr.

| Zeilen | Abschnitt |
| --- | --- |
| 129–335 | Konstanten und Schalter: `RUNDEN_ZUG` 141, `RUNDEN_ENDE` 142, `BUDGET_MS` 150, `RUHE` 151 (G3), `HAUT` 215, `GEWICHTE` 222, `mitBereich` 236, `exakt` 242, `RUNDEN_NEU` 253, `KURZ` 265, `GENAU` 277, `LIVE` 285, `linieUngenau` 293, `gestreckt` 320 |
| 178–426 | Haut und Loops; **Rückgängig**: `zurueck` 347 (Stapel ohne Grenze), `schnappschuss` 359, `wiederherstellen` 370 (setzt auch das Ziel Pose/Grundform); `kreuzungenSuchen` 398 |
| 427–711 | Darstellung: `teilungNeu` 542, `geometrieNeu` 600, Kameras, Zoom je Blatt |
| 712–817 | **Maul**: `maulAktuell` 755, `innenZeigen` 783, `maulAnlegen` 801 |
| 818–1017 | **Pose**: `poseKnochen` 824, `poseBetreten` 838, `poseSichern` 866, `grundLoopsAus` 880, `poseVerlassen` 912, `netzGewachsen` 933 (Werte je Punkt nach dem Verdichten umordnen), `knochenSetzen` 961, Regler |
| 1018–1243 | Anzeige: `hautZeigen` 1020 (merkt die Normalen in `normalenGezeigt` für das Maß „steht“), `bandGeometrie` 1086, `baenderZeigen` 1158, `pfad` 1210 (Streckenzug), `pfadKurven` 1227 (Bézier-Pfad, auch im Zug) |
| 1264–1302 | **Griffe**: `griffeZumZeigen` 1274 (wahre Länge; kein Faktor mehr) |
| 1304–1422 | **Blätter zeichnen**: `blattZeichnen` 1307 (in der Grundform immer der Bézier-Pfad; liest nur Ziele, Punkte und Griffe, nicht die Haut), `allesZeigen` 1407 |
| 1424–1485 | **Setzen nach dem Loslassen**: `SETZEN_RUHE` 1444, `vorrechnenPlanen` 1445 (30 ms nach dem Zug: neuer `LoopZug`, Zerlegen im Hauptthread, Runden bis die Form steht (höchstens `RUNDEN_NEU`), dann bis zu dreimal `nachVerdichten(true)` und wieder setzen) |
| 1486–1505 | Messen und Status: `statusZeigen` 1491 („(rechnet)“, solange der Zug `offen` ist) |
| 1506–1838 | **Zug starten** (Teil 1): Typ `Zug` ab 1508 (neu: `zielNeu`, `offen`, `nachRunden`), `zug` 1553, `abbildung` 1556, `loeserHaut` 1629, `loeserFuer` 1659 (in der Pose Gedächtnis mit Bereich), `stueckLoeser` 1670, `griffZugStarten` 1723, `punkteAnKreuzung` 1764, `eckeGezeigt` 1781, `eckeUmschalten` 1790 |
| 1839–2048 | **Zug starten** (Teil 2): `zugStarten` 1839, `punktNach` 1974, `verschiebungen` 1988 |
| 2049–2105 | **Zug bewegen**: `zugBewegen` 2049. Über die ganze Haut setzt es nur die Ziele (`zielNeu`, `offen`) und zeichnet die Blätter (2086–2094); mit Bereich (Pose, `?haut=gedaechtnis`) rechnet es wie bisher im Mausereignis (2095–2104) |
| 2107–2177 | **Rechnen im Bildtakt (G3)**: `NACH_RUNDEN` 2111, `rundeMitWeg` 2119 (eine Runde, zurück kommt die Bewegung der Form längs der Normalen), `zugRechnen` 2139 (je Bild Runden bis `BUDGET_MS`, bis die Form steht; Verfeinern im Zug nach einer Mausbewegung, nur `geometrie`, nicht bei Griffen), `zieleVonJetzt` 2174 |
| 2179–2386 | **Verfeinern im Zug**: `zugStufe` 2187, `stufeImHintergrund` 2221, `zugNeuAufsetzen` 2252, `einwechseln` 2277, `HINTERGRUND` 2333, Worker `zerleger` 2350 (`src/form/zerlegen.worker.ts`, ohne Fehlerbehandlung), `zugGriffeUebernehmen` 2372 |
| 2389–2470 | **Loslassen**: `zugEnde` 2389 (Runden am Ende nur, wenn der Zug noch `offen` ist; Linien festlegen, Kreuzungen, Verdichten, `linienAufPfad`, `poseSichern`, Rückgängig-Eintrag); `nachVerdichten` 2438, `verdichtetesNetz` 2452 |
| 2471–2819 | `loopSchneiden` 2473, `einsetzenLetzten` 2495, `kanteSetzen` 2519, `hautNeuRechnen` 2553, `linienAufPfad` 2610 (Gedächtnis, örtlich; Grund im Kommentar), `formErstellen` 2667, `stelleAmPfad` 2707, `punktAmKlick` 2748, `loeschen` 2787 |
| 2820–2944 | Stift P |
| 2945–3206 | Maus und Tasten: `druecken` 2965, `bewegen` 3029, `loslassen` 3056, Tasten 3136 (G/S/R ohne Prüfung der Zusatztasten) |
| 3207–3270 | Zeichnen: `rendern` 3207, `schleife` 3253 (ruft zuerst `zugRechnen`, zeichnet dann) |
| 3271–3524 | Test-Haken `window.__kurven` |

**Was man nicht verletzen darf:**
- **Spiegelpaare.** Die Haut ist ganz und spiegelgleich, jeder Punkt hat seinen Partner (`haut.spiegel`), Punkte der Mittelebene
  liegen genau bei z = 0. Einsetzen, Teilen und Zusammenlegen erzeugen nur Paare (spiegelgleiche Vierecke mit Mittelpunkt,
  Rücknahme über ein Journal je Dreieck). Der Löser stellt nach jeder Runde die Symmetrie her (Ende von `schritt` in
  `dicht/ausKurven.ts`). `hautAus` ordnet Partner über Lagen zu, die auf 0,001 gerundet sind.
- **Spiegelpunkte.** Ein `ring` ist die Hälfte z ≥ 0; seine Enden liegen auf der Mittelebene. Dort hat ein Punkt zwei Griffe, der
  zweite ist das Spiegelbild des inneren. Unsichtbare Punkte `vonSelbst` an den Ringenden halten Griffe. Sie sind nicht greifbar
  und keine Stützstelle der Kante.
- **Kreuzung = ein Punkt.** Die Punkte zweier Loops mit derselben `kreuzung`-Nummer sind derselbe Ort. Ecke und Griffe gelten über
  `punkteAnKreuzung`/`eckeGezeigt`, ein Doppelklick schaltet alle.
- **Linie = Pfad nur in der Grundform** (`exakt`). In der Pose folgt die Linie je Probe.
- **Der andere Löser in der Pose.** In der Pose rechnet `HautZiele` (Gedächtnis, mit Bereich, ohne Krümmungsfeld), weil die
  Maulöffnung das Krümmungsfeld stört. `linienAufPfad` rechnet örtlich mit Gedächtnis, weil aus den Kurven schon der erste Ring die
  Kugel 10 Einheiten wegzog. Beides ist Absicht, siehe die Kommentare an `loeserFuer` und `linienAufPfad`.
- **Werte je Punkt nach jedem Netzwechsel umordnen** (`alt`, `netzGewachsen`): Blendshape `pose.delta`, Knochenwinkel. Neu gilt das
  auch für den Stand des Lösers (siehe Abschnitt 6, G4).
- **Die Maulöffnung** (`verborgen`) wird weder verdichtet noch gezeigt; in der Pose löst der Löser ohne sie (`loeserHaut`).
- **Der Stand entscheidet** (seit G4.3/G4.4). Was der Hintergrund rechnet, gehört zu einem Stand (`standZahl`: Netz, Lagen,
  Loops, Maul, Pose) und wird nur angewendet, wenn er noch derselbe ist. Was für einen Stand offen ist (`ruheOffen`), steht im
  Schnappschuss. Nur eine Stelle startet Aufträge in der Ruhe (`ruheImHintergrund`), nur der Zug und sein Nachlauf starten das
  Aufräumen nach dem Loslassen.

## 4. Fallen (was schon kaputtging, woran man es merkt)

1. **Spiegelgleichheit verloren:** Einmal wurde ein Ring über die Mitte rückwärts abgelaufen (20 Punkte ohne Partner), einmal sind
   Rundungsfehler in großen Bereichen bis 1e-3 gewachsen. Merkt man an `__kurven.symmetrie()` über 1e-8 oder an Verdichten-Fehlern.
2. **Explosion und Hänger** (06.11.): Der Löser streckte mit der Dehnung der eigenen Kanten. Merkt man an Koordinaten über 5 000 und
   Millionen Punkten; `form-drei-faelle.mjs` bricht dann ab.
3. **Umgestülpte Haut bestätigt sich selbst** (08.11.): „umgeklappt“ zählt sie nicht, erst die Strahl-Parität („umgestülpt“).
4. **Nummern vergleichen nach dem Verdichten:** Fast alles zählt dann als umgeklappt. Über Lagen bzw. die Stelle `s` vergleichen.
   (10.11.: Eine Probe meldete nach „Kante an“ eine Bewegung von 321 Einheiten; das Netz war neu nummeriert, die Form dieselbe.
   Ob das Netz gewechselt hat, an den Dreiecken prüfen, nicht an der Zahl der Punkte.)
5. **Proben parallel zu vitest:** Es kommen weniger Mausereignisse an (140 ms je Bewegung), und der Zug geht einen anderen Weg.
6. **Dateien im Vite-Root ändern, während eine Fenster-Probe läuft:** Die Seite lädt neu, die Probe misst Unsinn. Läuft Florians
   Fenster, lädt es auch bei ihm neu.
7. **Proben mit der Maus:**
   - Ein Klick vor dem Zug kommt als Doppelklick an.
   - F ist nach dem Zeichnen schon aus; ein zweites F zeichnet bei jedem Zug neu.
   - Punkte nach Lage wählen nur ohne unsichtbare Ringenden (`sichtbar`).
   - Die Hornspitze in der Front wählen, in der Seite liegt sie auf dem Umriss.
8. **Kern-Probe mit zwei Runden je Schritt:** Das Nachhinken sieht zehnmal kleiner aus als im Fenster.
9. **Kugel mit einem Ring als Kriterium:** Jede Kugel durch den Ring ist eine Lösung. Taugt nicht.
10. **Ein neuer Löser beginnt ohne den Stand des alten:** Bremse `beta`, `dVorher` und Startwert `cWarm` sind dann zurückgesetzt, und
    die ersten Runden machen volle Schritte (bei `geometrie` Pendeln). Gemessen am 10.11.: Das stört nur auf einem geänderten
    Netz (dort 4 bis 8 Einheiten über die ganze Haut, vier bis fünf Runden lang); auf demselben Netz und einer Haut, die steht,
    bewegt ein neuer Löser nichts.
11. **Vite merkt sich einen Importfehler** einer Datei, die erst danach angelegt wird: Server neu starten.
12. **Werkzeuge:** `git apply` aus einem Unterordner lässt Pfade außerhalb still aus; macOS hat kein `timeout`; das Werkzeug lehnt
    lange Bash-Ketten mit `cd` und Git ab (einzelne Befehle, `git -C`).
13. **„Steht“ nie an der ganzen Bewegung der Punkte messen:** Nach der Geometrie gleiten die Punkte längs der Fläche stetig weiter
    (bei 23 400 Punkten 0,04 Einheiten je Runde). Immer die Bewegung längs der Normalen nehmen oder den Abstand zur Fläche davor.
14. **`&kurz=0` auf einem dichten Netz:** Bei 23 400 Punkten wächst das Netz im Zug auf 35 700 Punkte, und die Haut fällt ein.
15. **Auf das Ende einer Probe warten:** `pgrep -f <probe>` in einer Warteschleife findet die Schleife selbst. Die Probe mit
    `run_in_background` starten und auf die Meldung warten.
16. **Was im Hintergrund gerechnet wird, gehört zu einem Stand** (G4.3): Das Ergebnis nur anwenden, wenn `standZahl()` noch
    derselbe ist. Wer den Loops ein Feld gibt, das die Haut bestimmt, nimmt es in `loopsZahl` auf; sonst wechselt ein Ergebnis
    ein, das zu einem anderen Stand gehört. Was nur die Anzeige betrifft (`cur`, Auswahl), gehört nicht hinein.
17. **Eine angebotene Zerlegung gilt nur für ihre Struktur** (Netz, Bindungen, Kanten, Quellen der Krümmung): Der Kern prüft das
    seit G4.3 selbst (`strukturSchluessel`). Die Lagen gehören nicht zur Struktur; die Gewichte nach der Geometrie stammen dann
    von den Lagen, mit denen zerlegt wurde (für einen Zug gleich nach dem letzten gewollt).
18. **Mit einem einzelnen Loop hält nichts die Haut** (G4.4, `loeser/mess10.ts`): Ein neuer Löser schlägt dann bis 149 Einheiten
    je Runde aus, braucht 23 bis 36 Runden und landet je nach Netz woanders; jedes Aufräumen danach beginnt wieder mit einem
    neuen Löser und bricht nach zwölf Runden ab, mitten im Ausschlag. Im Fenster zog das Setzen nach dem ersten Ring die Kugel
    bei 11 000 Punkten 11 Einheiten flach, nach dem dritten Loop lief die Haut auseinander. Deshalb setzt sich die Haut nach
    einem neuen Loop nur, wenn sich Loops kreuzen, nur in Ruhe und ohne Aufräumen. Wer das lockert, misst zuerst bei 11 000
    und 23 400 Punkten mit dem Ring als erstem Loop.
19. **Was offen ist, gehört zum Stand** (`ruheOffen`): Wer eine Änderung baut, nach der die Haut nicht mehr steht, setzt
    `ruheOffen` und ruft `allesZeigen` (das plant die Ruhe); er rechnet nicht selbst und startet keinen Auftrag von Hand.
    Zwischen dem Setzen von `ruheOffen` und dem Auftrag liegen 30 ms: Was in derselben Behandlung noch am Stand ändert, gehört
    davor.
20. **Proben warten auf `zeiten().beschaeftigt`**, nicht auf feste Zeiten: Seit G4.4 kommen Kante, Löschen und das Setzen nach
    einem Loop später (0,2 bis 2,6 s). Eine Probe, die nach K 150 ms wartete, las die Haut vor der Kante.
21. **Eine Probe darf nicht in `flaeche()` hängen:** Läuft die Haut auseinander (nicht endliche Lagen), läuft das Raster der
    Abstandsmessung endlos. Vor dem Messen `every(Number.isFinite)` prüfen (wie `form-aendern-probe.mjs`).
22. **Das Wesen von zuletzt kommt zurück** (seit dem 10.11. nachts): Wer im Vorschau-Fenster oder in einem eigenen Browser
    „die Kugel“ erwartet, bekommt die Form von vorhin. Für einen sauberen Anfang „Neu“ drücken oder `&behalten=0` anhängen.
    **Unter Playwright (`navigator.webdriver`) behält das Fenster nichts**, außer mit `&behalten=1` (so `form-ablage-probe.mjs`):
    Proben, die die Seite je Fall neu laden, bekamen sonst die Form des vorigen Falls (die Härte-Probe hing; bemerkt erst beim
    Vergleichslauf der älteren Proben, weil nach dem Sichern und Laden nur Proben mit einem einzigen Laden gelaufen waren). Eine
    neue Eigenschaft des Fensters, die über das Laden hinaus wirkt, gegen eine Probe mit mehreren Fällen prüfen.
23. **Ein neues Feld im Stand gehört an vier Stellen:** `Schnappschuss` (mit `schnappschuss`/`wiederherstellen`), `WesenStand`
    (`ablage.ts`, mit `pruefen`), `standJetzt`/`standAnwenden` und, wenn es die Haut bestimmt, `loopsZahl` (Falle 16). Fehlt es
    in `standJetzt`, überlebt es ⌘Z, aber nicht das Neuladen. `form-ablage-probe.mjs` vergleicht Bit für Bit, was die Haken zeigen.
24. **`behaltenPlanen` steht in `allesZeigen`**, die Größen dazu (`BEHALTEN`, `behaltenBereit` …) werden erst weiter unten im
    Modul angelegt. Das geht, weil `allesZeigen` zum ersten Mal ganz am Ende läuft. Wer `allesZeigen` oder `ausschnittGeaendert`
    früher beim Laden aufruft, bekommt „Cannot access … before initialization“.
25. **Mitten im Nachlauf ist der Stand nicht fertig** (die Linien liegen fest, die Haut läuft noch): Behalten überspringt das,
    Sichern wartet. Wer den Stand anderswo ablegt, tut es ebenso.
26. **Probewesen nicht in `wesen/` liegen lassen:** Die Liste von „Laden“ zeigt den Ordner; Florian soll dort nur sehen, was
    er selbst gesichert hat. `form-probewesen.mjs` und `form-drei-faelle.mjs` (`ABLEGEN`) verschieben ihre Dateien,
    `form-ablage-probe.mjs` löscht sie.
27. **Messskripte, die `ablage.ts` lesen, laufen aus `packages/shape`** (wie alle Kern-Proben; aus `apps/editor` zöge vite-node
    die Konfiguration des Editors mit Electron). `ablage.ts` importiert deshalb nur Typen.
28. **Zwei Läufe von `form-probewesen.mjs` geben nicht dasselbe Netz** (Züge mit der Maus hängen an der Uhr): Punkte ±10,
    spitze Dreiecke 16 bis 26. Vorher/nachher-Vergleiche brauchen mehrere Läufe oder denselben gesicherten Stand als Anfang.
29. **Florian hat keine Wesen, er testet Formen** (10.11. nachts). Nie von „deinen Wesen“ sprechen und nichts von ihm
    verlangen, was fertige Wesen voraussetzt. Zahlen aus seinen Bildschirmfotos sind Zahlen eines Tests, keine Eigenschaft
    „seiner Wesen“: vor einem Schritt, der auf ihnen steht, den Fall nachstellen und messen (die 18 000 bis 26 000 Punkte
    ließen sich am 10.11. nicht nachstellen).
30. **Knopftexte sind keine Aussagen von Florian.** Der Text eines angebotenen Knopfs kommt als seine Nachricht zurück. Er
    darf nur enthalten, was er entscheidet, keine Annahme über ihn („meine echten Wesen“ stand so im Knopf und danach als Zitat
    in der Übergabe).
31. **Ein Dreieck ohne Fläche hat keine verlässliche Richtung.** Prüfungen der Art „kippt das Dreieck um mehr als 60°?“ lassen
    es durch. Wer im Verdichten Dreiecke umhängt (zusammenlegen, drehen), prüft die Güte des neuen Dreiecks eigens
    (`kleinsterWinkel`, `FLACH`). Was schon flach ist, darf dabei bleiben, wie es ist, sonst fallen Nadeln nicht mehr zusammen.
32. **Auflösen nur, was wirklich flach ist** (kleinster Winkel unter 5°): Mit „ein Winkel über 150°“ allein drehte jeder Aufruf
    beim Verfeinern im Zug 10 bis 14 Kanten stumpfer, aber brauchbarer Dreiecke; mit „über 170°“ blieben flache Dreiecke an leicht
    gebogenen Linien (168,5°) stehen.
33. **Eine Vermutung zur Ursache mit dem Schalter prüfen, bevor sie im Bericht steht:** „Die Nadeln lassen den Löser mit einem
    einzelnen Loop ausschlagen“ war in zehn Minuten widerlegt (`mess10.ts` mit `NADELN=1`).
34. **`ABLEGEN` in `form-drei-faelle.mjs` überschreibt eine Datei gleichen Namens** bei den Probeformen: für vorher/nachher
    verschiedene Namen nehmen (der Stand „vorher“ des Hörner-Falls ging so verloren; seine Messung war schon abgelegt).
35. **Lange Fenster-Läufe im Hintergrund starten und so lange nichts unter `apps/editor` und `packages/shape/src` ändern.** Ein
    Lauf der elf älteren Proben dauert rund zehn Minuten, der Hörner-Fall zwei Minuten je Lauf.

## 5. Florian: letzte Urteile, offene Entscheidungen, Testfälle

**Urteile:**
- **10.11.:**
  - „Die Griffe bleiben in wahrer Länge wie in Illustrator. Mach weiter mit G3.“ (nach G1/G2)
  - Zu G3: „Es gefällt mir schon besser. Auch die Performance ist schon besser, aber aktuell ruckt es während dem Ziehen noch
    spürbar.“ Zu G4.1 bis G4.4 steht sein Blick aus.
  - „Das Ergebnis ist schon ganz gut, aber entweder sehe ich noch Veränderungen beim Loslassen der Handles und das Mesh justiert nach,
    oder es ist ungenau und stockt.“
  - `?gewichte=geometrie` ist für ihn „bis auf das Tempo schon recht nah dran“, „bisher elegantester Weg mit bester Genauigkeit,
    aber zu langsam“.
  - Er will, dass die andere Sitzung G1–G4 baut.
  - Nachts: „Weiter mit G5: zuerst mein Wesen sichern und laden können (es übersteht dann auch das Neuladen), dann die Güte
    des Netzes an meinen echten Wesen messen.“ (Das war der Text eines angebotenen Knopfs, nicht sein Wortlaut.) Sichern und
    Laden sind gebaut, sein Blick darauf steht aus.
  - Danach, auf die Bitte, „seine Wesen“ zu sichern: „Es gibt von mir keine Wesen. Ich weiß nicht, was du damit meinst. Ich
    teste immer nur ein paar Formen, aber wie soll ich jetzt schon Wesen machen. Es ist ja nur die Grundform-Erzeugung bis
    jetzt.“
  - Spätnachts: „Kannst du gerne so machen wie du es vorgeschlagen hast“ (die flachen Dreiecke an den Linien), dazu seine
    Reihenfolge und der Wunsch nach Funktionen wie bei FiberMesh für später (Entscheidung 12).
- **09.11.:**
  - Die Löser-Wege „klingen nach viel Nachjustieren“.
  - „… warum das verdichtete Mesh überhaupt eine andere Form annimmt … sollte einfach nur abrunden, aber in exakt der gleichen Form.“
- **08.11.:** ohne Geometrie „viel lieber“, weil Geometrie ruckelte und nachhinkte. Durch das Urteil vom 10.11. überholt; beurteilt
  war damals ein Bündel aus Maß, Bremse, Matrix und Halten beim Verfeinern.
- **07.11.:** „Punkte wo nötig“ (`?punkte=noetig`) „etwas besser“, er testet weiter.
- **06.11.:** Die Kante knickt „rund“ (nicht Vector); ein Knick ist da oder nicht (Kante an/aus statt Härte 0–3).
- **Grundsätze (05.11., Klarstellungen 2 und 3):**
  - Kurven sind die Wahrheit, die Haut bläst sich zur optimalen Rundung auf, Umrisse sind nur Ergebnis.
  - Kanten = Edgeloops; kein Verschmelzen, alles ein Netz.
  - Bézier-Punkte und O wie in Blender, „die perfekte Mischung aus Vektorwerkzeugen und Blender“.

**Offene Entscheidungen:**
1. ~~Griffe in wahrer Länge oder Mindestlänge~~ Entschieden am 10.11.: wahre Länge wie in Illustrator.
2. Grundform immer symmetrisch? Dann rechnet der Löser eine halbe Haut (G6).
3. Welche Werkzeuge zuerst (Gegenprüfung Abschnitt 6).
4. „Punkte wo nötig“ als Standard für neue Loops.
5. Linie kehrt um: rot zeigen und die Haut dort beim letzten gültigen Stand lassen (Vorschlag der Gegenprüfung), oder den Griff
   begrenzen.
6. `?gewichte=geometrie` als Standard, nach seinem Test mit G1–G4.
7. ~~G4 in der neuen Fassung~~ Freigegeben am 10.11. („gleich zu G4“, „mach weiter mit G4.2 und G4.3“, „dann mach wie du
   empfiehlst“). G4.1 bis G4.4 sind gebaut; sein Blick steht aus.
8. Beim Einwechseln nach dem Loslassen weich überblenden (rund 0,15 s) statt umzuspringen? Vorgelegt am 10.11. abends; er hat
   stattdessen G4.4 gewählt, die Frage bleibt offen.
9. Die Änderung von 2 Einheiten, wenn sich die Haut nach dem zweiten Loop setzt, kommt vom Bézier-Pfad ohne Zusatzpunkte (ein
   halber Ring mit zwei Punkten ist kein genauer Kreis). Sie hängt an Entscheidung 4 („Punkte wo nötig“).
10. ~~Wie weiter nach der Klarstellung~~ Entschieden am 10.11. spätnachts: die flachen Dreiecke und Nadeln an den Linien
    beheben (gebaut). Der Teil „Zahl der Punkte“ von G5 ruht, bis ein dichtes Netz aus seinem Testen vorliegt.
12. **Reihenfolge nach dem Plan (Florian, 10.11. spätnachts, bestätigt):** erst den Plan beenden, dann Maul, Posen, genaue
    Werkzeugfunktionen. **Später, ausdrücklich noch nicht jetzt:** Funktionen wie bei FiberMesh (Formen addieren und subtrahieren,
    Elemente wie Beine anfügen mit weichem Übergang zwischen den Teilen, am Ende ein Netz; sein Satz zu den Linien dabei bricht ab
    und ist vor dem Bauen zu klären). Das erweitert seinen Grundsatz vom 05.11. („kein Verschmelzen, alles ein Netz“). Bis dahin
    nichts bauen, was es verbaut (Format der gesicherten Formen, Annahme „immer spiegelgleich“, Regeln an den Linien); wenn es so
    weit ist, zuerst ein kleiner Beweis (zwei Formen zu einem Netz, die Naht als Linie).
13. Ob das Zusammenlegen der Nadeln gleich nach dem Schneiden bleiben soll: Es kostet beim Schneiden eines Loops 30 bis 50 ms
    (5 200 Punkte) und ändert am Rechnen nichts Messbares; es hält das Netz zu jeder Zeit frei von Dreiecken ohne Fläche.
11. Sollen gesicherte Stände ins Repo (dann sind Messungen an ihnen wiederholbar, je Stand 0,5 bis 3 MB)? Bisher liegt im
    Ordner `wesen/` nur die Beschreibung.

**Seine Testfälle** (Bilder in `docs/progress/editor/`):
- Hörner aus dem senkrechten Ring mit Griffspiel: `form-ohren-aufblasen-florian-2026-11-08.webp`; das Bild mit den schwarzen
  Stellen liegt nur im Chat.
- Grobes kleines Detail (Ohr): `form-detail-grob-florian-2026-11-08.webp`.
- Pilz: `form-pilz-florian-2026-11-06.webp`.
- Boden mit vier Höckern: `form-boden-florian-2026-11-05.webp`.
- Fischschwanz-Lappen: `form-detail-florian-2026-11-05.png`.
- Kopf aus einem Ring: `form-kopf-florian-2026-11-05.png`.
- Ringende: `form-ringende-florian-2026-11-05.png`.
- Kreuzungsgriff: `form-kreuzung-griff-florian-2026-11-05.png`.
- Dazu Rüssel und Hammer (06.11.), Braue, Maul als Loop und Fressen-Pose.

**Zoom und Netzgröße:** Florian arbeitet bei etwa 300 % (1 Einheit = 2,7 px; ein halber Bildpunkt = 0,18 Einheiten), am Detail auch
höher. Er testet Formen, fertige Wesen gibt es nicht (Klarstellung vom 10.11. nachts, siehe oben). In zwei seiner Bildschirmfotos
vom 08.11. (Hörner mit Griffspiel) standen 18 234 Punkte bei 49 ms je Zug und danach 26 284 Punkte bei 126 ms; daraus wurde in
dieser Datei und im Bericht „seine Wesen haben 11 000–26 000 Punkte“. Derselbe Fall, am 10.11. nachts nachgestellt, endet bei
7 352 Punkten. Wie groß seine Netze beim Testen heute werden, ist nicht bekannt (die letzte Zahl der Statuszeile zeigt es ihm).
Die Prüfkugel hat 5 200. Kriterien weiter auch bei 11 000+ Punkten messen, aber nicht mehr mit „seine Wesen“ begründen.

## 6. Einwände und Ergänzungen der bauenden Sitzung zur Gegenprüfung

Die Gegenprüfung stimmt in den Hauptpunkten. Drei Stellen sind im Code nachgesehen und bestätigt: Griff-Faktor, Bremse nur bei
`geometrie`, allgemeines Einsetzen. Die Schlussfolgerung der Bilanz („am Löser kein Hebel mehr“) und deren Schätzungen für nativ
(„5- bis 30-mal“) waren falsch; die gemessenen Zahlen der Gegenprüfung gelten.

**Was Absicht ist:**
- *(Nachtrag 10.11.: Florian hat entschieden, die Griffe bleiben in wahrer Länge; Faktor und Mindestlänge sind entfernt. Der
  folgende Punkt ist damit Geschichte.)*
- **Die Mindestlänge der Griffe (28 px) ist Absicht** (05.11.). Kurze Griffe lägen sonst unter dem Punkt und wären nicht zu greifen.
  Der Zug wirkt dann im selben Verhältnis feiner, wie ein Hebel. Fehlerhaft ist nur, dass der Faktor nach dem Loslassen (und in
  den anderen Blättern schon im Zug) neu gerechnet wird. Vorschlag für G2, solange Florian nicht „wahre Länge“ wählt: Faktor je
  Punkt festhalten, solange er gewählt ist, und nur bei Zoom oder neuer Auswahl neu rechnen. Dass der kürzere Griff den Faktor für
  beide bestimmt, ist ebenfalls Absicht: Beide Griffe eines glatten Punkts stehen so sichtbar auf einer Linie.
- **Streckenzug im Zug** (`kurven.ts:1332`) war Absicht aus Tempo-Gründen und zeigte, wo die Haut gerade ist. Mit „die Kurve ist
  die Wahrheit“ ist der Pfad richtig, der Mehraufwand ist klein. Einverstanden mit G2.

**Ergänzungen zu G1–G4:**
- **G1:** `einsetzen(B, k)` in `loeser/zerlegung.ts` (in `systemAusDaten`, ab Zeile 286; auch `normalSystemZerlegt` endet dort, Zeile 70) dient beidem, `loesen` mit drei und
  `loesenSpalte` mit einer Spalte. Der Worker baut sein System über `systemAusDaten`, also wirkt eine Änderung dort überall. Die
  Kehrwerte der Diagonale lohnen sich einmal je Zerlegung statt je Aufruf. Tests unter `dicht/` vergleichen keine Bits des Lösers,
  „bitgleich“ meint dort Rückgängig und die Grundform in der Pose.
- **G2:** Die Reihenfolge in `zugBewegen` ist heute: Löser (2074–2078), dann Haut, Bänder, drei Blätter (2094–2097). Die Kurven
  (Punkte, Griffe, Pfad) lassen sich vor den Löser ziehen; dafür braucht `blattZeichnen` eine Fassung, die nur die Linien neu
  zeichnet.
- **G3:**
  - Beim Rechnen im Bildtakt nicht je Runde die ganze Anzeige neu bauen, sondern einmal je Bild. Die Anzeige (Normalen, Bänder, drei
    SVG-Blätter) kostet heute ungemessen mit.
  - Der Pfad mit Bereich (`mitBereich()`: Pose und `?haut=gedaechtnis`) rechnet mit `RUNDEN_ZUG` und in Stufen; ihn zunächst
    unverändert lassen.
  - Dass `geometrie` vom Weg abhängt (Gegenprüfung Anhang A: 2,7 Einheiten bei einem großen Schritt), sollte nach G3 nicht von der
    Zuggeschwindigkeit abhängen. Das am besten mit einem schnellen und einem langsamen Zug prüfen.
    *(Nachtrag 10.11., geprüft mit `form-loslassen-probe.mjs` und `SICHERN`/`VERGLEICH`, Ohr, 2 s gehalten: schnell gegen langsam
    1,4 Einheiten (99 % der Punkte 0,6), zwei langsame Läufe 0,4; vor G3 lag die Haut nach dem schnellen Zug 39 Einheiten zurück.)*
- **G4:**
  - Wer den Löser nach dem Netzwechsel neu baut, sollte `beta`, `dVorher` und `cWarm` des alten über `alt` übernehmen (neue Punkte:
    Mittel der Nachbarn). Sonst pendelt jeder neue Löser in den ersten Runden (Falle 10).
    *(Nachtrag 10.11., gemessen mit `loeser/mess8.ts`: Auf demselben Netz und einer Haut, die steht, stört ein neuer Löser nicht.
    Der Anlauf kommt vom geänderten Netz. Ob das Weitergeben auf einem neuen Netz hilft, erst messen; der sichere Weg ist, das
    Setzen verdeckt bis zur Ruhe zu rechnen.)*
  - Dem Worker fehlt eine Fehlerbehandlung. *(Erledigt mit G4.1 und G4.3: Fehler eines Auftrags kommen als Meldung zurück, bei
    einem Ausfall des Workers läuft alles im Fenster weiter.)*
  - Die Zerlegungen werden nach einem Fingerabdruck der Zeilen gemerkt (`merken`); eine Zerlegung aus dem Worker gehört in denselben
    Speicher.
  - Für das Setzen nach dem Loslassen (`vorrechnenPlanen`) gilt dasselbe wie für das Verfeinern im Zug: einmal einwechseln statt bis
    zu vier Stufen. *(Gebaut mit G4.3 für das Loslassen; `vorrechnenPlanen` rechnet nur noch nach den anderen Änderungen.)*
- **G5** (danach): Das Netz wächst vor allem durch `GENAU` = MK/40, das nach fast jedem Zug an Details nachteilt, und durch bis zu
  drei Nachverfeinerungen nach dem Loslassen (`nachVerfeinert`).
- **Messen:**
  - Kriterien bei Florians Netzgröße (11 000+) und 300 % prüfen, nicht nur an der Kugel mit 5 200 Punkten.
  - Nachhinken auch während des Zugs messen, nicht nur danach.
  - Kern-Proben mit einer Runde je Mausschritt rechnen lassen.

**Nicht nötig, wenn `geometrie` der Weg ist** (wie im Nachtrag): Bremse für „gleich“, `HALT` skalenfrei, Ausgleich beim
Netzwechsel. Der Ausgleich ist selbst ein kleines Gedächtnis und am Rüssel nach dem nächsten Zug schlechter.

**Zwei Fehler in der Bilanz vom 09.11.** (in der Datei nicht korrigiert):
1. Backen gibt es nur in `form.html`, in `kurven.html` ist es nicht angeschlossen. Abschnitt 2 der Bilanz führt es unter „Trägt“.
2. Altcode: Nur `form.html` braucht 7 Dateien (2 483 Zeilen); an `kurven.html` hängen 22 Dateien (knapp 13 000 Zeilen). Darin
   stecken Teile, die nur `form.html` nutzt (siehe Abschnitt 7).

## 7. Altlasten und was nicht angefasst wird

**Schalter in `kurven.ts`** (20):

| Schalter | Einordnung |
| --- | --- |
| `form`, `dreiecke` | Betrieb (Startform, Größe des Startnetzes) |
| `gewichte` | Betrieb, bis `geometrie` Standard ist (Florians Entscheidung 6) |
| `live`, `hintergrund`, `verdichten`, `kurz` | Vergleich für G3/G4, bleiben vorerst (`kurz=0` lässt ein dichtes Netz einfallen, Falle 14) |
| `setzen=4` | Vergleich seit G3: das Setzen nach dem Loslassen mit genau vier Runden wie vorher; wirkt nur noch im alten Ablauf (`nachlauf=0`, ohne Hintergrund) |
| `nachlauf=0` | Vergleich seit G4.2–G4.4: der Ablauf von vorher (nach dem Loslassen und nach jeder Änderung alles im Fenster, in Stufen) |
| `loopsetzen=0` | Vergleich seit G4.4: Die Haut setzt sich nach einem neuen Loop nicht von selbst (erst der erste Griff setzt sie) |
| `genau`, `liveGenau`, `liveKante` | Stellgrößen des Verdichtens; Thema von G5 |
| `punkte=noetig` | offene Entscheidung 4, bleibt |
| `haut=gedaechtnis` | Altlast für die Grundform (der Gedächtnis-Löser selbst wird für Pose und `linienAufPfad` gebraucht) |
| `kruemmung=0` | Altlast, wirkt nur mit dem Gedächtnis-Löser |
| `richtung=1`, `maxnormalen=1` | Beweise vom 09.11., Altlast |
| `winkel=1` | verworfene Verdichtung, Altlast |
| `genauHaut=1` | verworfen, solange die Form am Netz hing; mit `geometrie` neu zu prüfen (G5) |

**Code, der Altlast ist** (entfernen nur nach Florians Freigabe, und erst nach G1–G4, damit der Vergleich möglich bleibt):
- `dicht/ausKurven.ts`: `MESSREIHE`/`messreiheSetzen`, Richtung je Seite (`seitenMessen`, `seitenAnlegen`, `seitenSektor`,
  `seitenWert`, `ersteReihe`, Zeilen G1), Option `maxNormalen`.
- `dicht/richtung.ts` (nur `?richtung=1`).
- `dicht/kruemmung.ts`: die Klasse `KruemmungsFeld` (nur `?haut=gedaechtnis`). `KETTE_K` und `KruemmungsKetten` werden gebraucht.
- `dicht/kurven.ts`: `HautLoeser` (Beweis vom 05.11., nur noch in `kurven.test.ts`). `HautZiele` wird gebraucht.
- Nur von `form.html` gebraucht: `backen`, `folgen`, `gleich`, `pose`, `prueffaelle`, `silhouette`, `teile`. **`backen.ts` bleibt**:
  Das Spielnetz soll in `kurven.html` kommen.
- In gemeinsam genutzten Dateien nur für `form.html`: Raumlinien, Ansichten-Streckung und Kantenprofile (über `rund.ts`), Maulschnitt
  und getrennte Kiefer aus `form.html` (`maul.ts`, `kiefer.ts`). `maulLoop` braucht daraus `kieferFeld`, `dickeAmMundwinkel` und
  `maulOeffnen`.
- `form.html` mit `src/form/main.ts` (3 204 Zeilen): altes Fenster, nicht ohne Florian löschen.
- 52 Proben `form-*` in `apps/editor/scripts/pruefen/`, viele für alte Stände.

**Nicht anfassen** (ohne Florians Wort):
- den Gedächtnis-Löser in der Pose und in `linienAufPfad` (Gründe in Abschnitt 3);
- Spiegel- und Kreuzungslogik;
- Pfad und Griffe (`dicht/pfad.ts`, `griffeAnlegen`, `griffeAusZeichnung`, `griffeUebernehmen`);
- Maul am Loop (`dicht/maulLoop.ts`) und die Fressen-Pose (`dicht/poseLoop.ts`);
- `backen.ts`;
- den eingefrorenen Käfig unter `packages/shape/src/kern/` und den alten Editor.

## 8. Arbeitsregeln (Kurzfassung)

- Deutsch, kurz, konkret. Keine Modellnamen in Commits, Docs oder Code. Commits mit der Co-Autor-Zeile wie bisher.
- Nach jedem Schritt committen und pushen. Kein bare `git stash`.
- Florians Fragen zuerst beantworten, mit Messung statt Vermutung. Nie andere Sitzungen anschreiben ohne sein Wort.
- Keine Sonderregel, die einen Körper oder eine Lage nennt; ab der dritten neuen Regel je Block die Struktur prüfen.
- Vor einem Löser-Vorschlag die Planseite „Kurven als Wahrheit“ nach früheren Messungen derselben Idee durchsuchen.
- Florian arbeitet oft per Fernsteuerung: Die Abschlussnachricht muss Frage und Wahlmöglichkeiten selbst enthalten.
- Klare Begriffe: „dichtes Netz“, „Linien“, „Loops“, „Punkte“. Keine Käfig-Begriffe, sie verunsichern ihn.
