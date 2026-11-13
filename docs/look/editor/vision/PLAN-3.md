# Runde 3 (13.11.2026): Ein Bild

## Florians Rückmeldung zu Runde 2 (wörtlich)

> „Was mich stört dass du die grundbedienung und materialien und eigentlich alles bis auf die ansichten von der vorherigen
> version übernommen hast. Ich habe mir da ehrlichgesagt eine insgesammt komplettere und durchdachtere und innovativere lösung
> vorgestellt. Eigentlich haben wir jetzt nr die fesnster etwas anders verteilt. Keines davon hat irgendwelche vorteile und mehr
> nachteile eines gewöhnlichen editor layouts. Die Projektion fand ich noch am besten...aber ich verstehe die vorteile gegenüber
> der normalen ansichten nicht. Auch die punkte linien outlines und materialien...da hast du dir ja garnichts überlegt...wie soll
> das dann alles zusammenspielen. Ich wollte eigentlich dass du wirklich SELBST die optimalste und eleganeste lösung für einen
> editor suchst. … wege auch ab wie viel ich zum beispiel bei dem blatt mit den vielen ansichten hin und herscrollen muss. wie
> viele bildschirmsprünge und überlagerungen es gibt die nur nachteile bringen. Bitte fang nochmal richtig an …“

## Was in Runde 1 und 2 falsch war

- Ich habe vom Layout aus gedacht, nicht von der Aufgabe. Drei Anordnungen derselben Fenster, keine löst ein Problem der vier
  Fenster; jede bringt neue (Bullaugen decken zu, das Blatt zwingt zum Zoomen und Schwenken, die Platten zum Entziffern).
- Bedienung, Material, Punkte, Linien und Konturen kamen unverändert aus Runde 1. Es gab kein Zusammenspiel, nur Teile.

## Die Aufgabe, neu gedacht

**Warum es vier Fenster gibt:** Ein Punkt im Raum braucht drei Zahlen, eine Maus liefert zwei. Zwei Fenster liefern zusammen
drei. Jede Lösung ohne Fenster muss die dritte Zahl anders liefern.

**Der Fund:** In Florians Modell liegt jede Kurve schon in einer natürlichen Fläche:

| Kurve | wie im Schiffbau | ihre Fläche | was ein Zug darin bedeutet |
|---|---|---|---|
| Mitte (`mitte`) | Kiel, Profil | die Mittelebene z = 0 | das Profil formen |
| Ring (`ring`) | Spant | seine Querebene (enthält die z-Achse) | den Querschnitt formen |
| Form (`paar`) | Luke, Auge, Flosse | die Haut | auf der Haut verschieben |

Die dritte Zahl liefert also die Kurve selbst. Wer einen Spant greift, bewegt den Punkt in der Spantebene, aus jedem Blickwinkel.
Damit braucht man kein zweites Fenster mehr, um einen Punkt im Raum zu setzen. Die Ansichten Seite, Front, Top werden
**Zustände der einen Kamera** statt Fenster.

## Grundsätze (jeder mit Abwägung)

1. **Ein Bild.** Der ganze Bildschirm ist eine Ansicht. Keine Fenster, keine Linsen, keine Überlagerung, kein Scrollen.
   *Dafür:* viermal so viel Fläche, keine Blickwege, nichts deckt das Wesen zu. *Dagegen:* nie zwei Ansichten zugleich.
   *Ausgleich:* Grundsatz 2 (man braucht keine zweite Ansicht zum Setzen), 5 (Ansichten in einer Viertelsekunde, ohne Sprung)
   und der Grundriss am Boden (die Draufsicht ist immer da).
2. **Jede Kurve bewegt sich in ihrer Fläche.** Punkte, Griffe und Linienstücke eines Spants bleiben in seiner Ebene (er bleibt
   ein ebener Querschnitt), Mittelpunkte in der Mittelebene, Formen auf der Haut. Die Fläche erscheint als Glas, solange man zieht.
   ⇧ beim Ziehen: quer zur Fläche (einen Spant am Körper entlangschieben, eine Form herausziehen). Liegt die Fläche fast
   flach zum Blick, gilt die Bildebene. *Dagegen:* eine Regel mehr. *Dafür:* Spanten werden nie verbogen, Punkte nie aus
   Versehen in die Tiefe geschoben (der häufigste Fehler mit einem Fenster).
3. **Zeichnen statt zerren.** Wer eine Kurve anders will, zeichnet sie nach: Ein Strich, der nahe an einer Kurve beginnt und
   endet, ersetzt dieses Stück (in ihrer Fläche). So arbeiten Zeichner (Baudel 1994: „Oversketching“; ILoveSketch 2008).
   Punkte und Griffe bleiben für die Feinarbeit. Dieselbe Stiftgeste: quer über den Umriss = neuer Spant, geschlossen = Form,
   Zickzack = weg.
4. **Haut wie Ton.** Ziehen auf der Haut (nicht auf einer Kurve) schiebt die Kurven darunter mit weichem Rand mit (wie der
   Move-Pinsel in ZBrush). Vor dem Zug zeigt ein Lichtfleck, wie weit es reicht; das Rad ändert es während des Zugs.
   *Dagegen:* Ziehen auf dem Wesen dreht nicht mehr. *Ausgleich:* Leere dreht, ⌥ + Ziehen und die mittlere Taste drehen überall.
5. **Ansichten federn.** Taste 1, 3 oder 7 halten: Die Kamera schwenkt auf Seite, Front oder Top; loslassen: zurück, wo man war.
   Tippen: bleiben. Drehen nahe einer Achse rastet ein. Immer als Kamerafahrt, nie als Sprung (ViewCube, Khan et al. 2008:
   Übergänge halten die Orientierung). Gehaltene Modi verhindern Modusfehler besser als gemerkte (Sellen, Kurtenbach,
   Buxton 1992).
6. **Der Blick bestimmt den Look.** Im Raum ist das Wesen Jelly, auf einer Achse wird es Florians Illustration (weißer Körper,
   dicke Kontur, Passer, langer Schatten, gestrichelte Linien): Dolly-Zoom in die Parallelansicht und Materialübergang in
   einer Bewegung. Beide Looks, die Florian schon hat, werden ein Material mit zwei Zuständen.
7. **Eine Formensprache** (Abschnitt unten): Kiel, Spanten, Formen unterscheiden sich durch Gewicht, nicht durch Farbe.
   Punkte erscheinen nur an der Kurve unter der Hand und im Licht des Zeigers; Griffe nur am aktiven Punkt; Hilfen (Fläche,
   Einfluss, Vorschau) nur während der Handlung. Jede Farbe hat genau eine Bedeutung.

## Bedienung

| | Maus und Tastatur | iPad |
|---|---|---|
| Drehen | links auf Leere ziehen, oder ⌥ + ziehen, oder mittlere Taste; nahe einer Achse einrasten | ein Finger auf Leere |
| Haut formen | links auf der Haut ziehen; Rad im Zug = Reichweite | ein Finger auf der Haut |
| Punkt, Griff, Kurve ziehen | links ziehen (in ihrer Fläche); ⇧ = quer dazu | Finger |
| Wählen, Punkt setzen, Ecke | Klick; Doppelklick auf Kurve = Punkt; Doppelklick auf Punkt = Ecke ↔ glatt | tippen, doppelt tippen |
| Zeichnen | rechte Taste oder P: nachzeichnen, quer = Spant, geschlossen = Form, Zickzack = weg | Pencil |
| Ansichten | 1 / 3 / 7 halten = kurz, tippen = bleiben; 0 = Raum | doppelt tippen ins Leere = nächste Achse und zurück |
| Zoom, Schwenken | Rad; Leertaste + ziehen | zwei Finger |
| Sonst | ⌘Z, ⇧⌘Z, ⌫, K, F, X halten (Röntgen), ?, Esc | zwei / drei Finger tippen |

## Formensprache

| Element | im Raum (Jelly) | auf der Achse (Illustration) | wann sichtbar |
|---|---|---|---|
| Haut | Jelly, durchscheinend, Lava, Glanz; feine dunkle Kontur | weißer Körper, Lavendel im Schatten, dicke Kontur, Passer, langer Schatten | immer |
| Kiel | durchgehende helle Linie, doppelt so stark wie ein Spant | Petrol, gestrichelt (Kante: durchgezogen) | immer |
| Spant | feine Linie; unter der Hand: ganzer Ring hell, seine Ebene als Glas | Petrol, gestrichelt | immer |
| Form | feine Linie mit zarter Füllung | wie Spant | immer |
| Punkt | Niete: klein, glatt ●, Ecke ◆ | dasselbe in Petrol | an der Kurve unter der Hand, im Licht des Zeigers, gewählte immer |
| Griff | zwei Nadeln mit runder Spitze | dasselbe | nur am aktiven Punkt |
| Fläche | Glas in Jelly-Türkis mit feinem Raster | entfällt (Bildebene) | während eines Zugs |
| Einfluss | Flieder-Licht auf der Haut | dasselbe | beim Schweben über der Haut, im Zug |
| Boden | Scheibe mit Raststrichen, darauf der Grundriss (Draufsicht) | entfällt | im Raum |

Farben (Florians Palette, je eine Bedeutung): Weiß/Petrol = Struktur, Lila = gewählt, Flieder = Hand (Einfluss, Vorschau),
Jelly-Türkis = Fläche, Rosa = weg.

## Verworfen

- Fenster, Linsen, Blätter, Platten (Runde 1 und 2): Fläche geteilt oder verdeckt, Blickwege, Zoom und Schwenk.
- Kamera dreht sich von selbst zur Kurve (ILoveSketch dreht beim Zeichnen): beim Ziehen desorientierend; die Fläche löst es ohne
  Bewegung.
- Silhouetten als Bearbeitungsgriffe (Nealen et al. 2005): die Kurven sind Florians Wahrheit, nicht der Umriss.

## Bauplan

Neue Klasse `Werft` (`prototyp/src/werkstatt/werft.js`, Seite `dist/werft.html`), auf der Werkstatt-Basis (Ereignisse,
Geistermaus, Film), mit eigener Grammatik und eigenem Zeichnen:

1. Flächen je Kurve (Ebene des Spants, Mittelebene, Haut), Ziehen von Punkt, Griff, Kurvenstück darin; ⇧ quer; Glas.
2. Formensprache: Gewichte je Art, Punkte nur an der Kurve unter der Hand und im Licht, Rauten für Ecken, Griffe am aktiven Punkt.
3. Ein Material mit zwei Zuständen (Jelly ↔ Illustration) samt Kontur aus dem Abstandsfeld, Dolly-Zoom, Boden mit Grundriss.
4. Federnde Ansichten (1/3/7 halten oder tippen), Einrasten beim Drehen.
5. Haut formen (Ziehen auf der Haut mit weichem Rand, Lichtfleck vorher).
6. Nachzeichnen (Stück einer Kurve ersetzen), Schnitt, Form, Zickzack.
7. Geistermaus, Film, Prüfung mit echten Mauszügen, Präsentation (gleiche Adresse).

## Stand (laufend)

- 13.11. Werft gebaut (`prototyp/src/werkstatt/werft.js`, Einstieg `src/einstieg/werft.js`, `node bau.mjs src/einstieg/werft.js
  dist/werft.html Werft`): Flächen je Kurve (Ring: Ebene aus der Hauptrichtung der Punkte in x-y, Ringende: Gerade, Kiel: z = 0,
  Form: Haut wie beim Greifen), Glas der Fläche (beim Zug voll, beim Schweben über einer Kurve schwach), Haut formen
  (`hautZugStart`, Rad im Zug = Reichweite), Nachzeichnen (`nachZiel`, `nachzeichnen`), federnde Ansichten (`ansichtDruck`,
  `ansichtLos`), Jelly ↔ Illustration nach `rs.parallel` (Überblendung über `werft:illu`), Kontur aus Maske (`konturFS`),
  Boden mit Grundriss (`bodenFS`, Draufsicht-Maske 512²), Linien nach Art gewichtet, Punkte nur an der Kurve unter der Hand,
  Rauten für Ecken (Zustand + 10). Geprüft mit Mauszügen: Spantpunkt bleibt in seiner Ebene, Haut formen, Taste 1 → Seite als
  Illustration, 0 → Raum. Drehbücher: `start`, kurze Filme `achse`, `ebene`, `haut`, `nach`, `spant`, `feder`.
- Nächste Schritte: Film prüfen, kurze Filme aufnehmen, Präsentation Runde 3 (gleiche Artefakt-Adresse, Start in der Seite),
  KONZEPT-Nachtrag, Push.
