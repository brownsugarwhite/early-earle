# Vision: Der Kurven-Editor als Raum (Arbeitsfassung 1, 12.11.2026)

> Auftrag: der coolste und eleganteste Editor für Florians Kurven. Minimalistisch, „alles funktioniert gleich“,
> selbsterklärend, Shader und Animation statt Text. Keine der festgelegten Regeln gilt für diese Sitzung; die andere Sitzung
> (Kurve reparieren) wird nicht berührt. Recherche: [`RECHERCHE.md`](RECHERCHE.md). Diese Fassung entsteht vor den
> Prototypen und wird nach den Tests überarbeitet.

## Der Satz

**Das Wesen steht in einer Ecke aus Papier. Seine Schatten an den Wänden sind die Ansichten. Eine Hand formt, zwei Finger
schauen. Was du tust, zeigt sich in Licht, nicht in Worten.**

## Drei Säulen

### 1. Raum: Es gibt keine Fenster, nur einen Raum, der sich falten lässt

Florians vier Fenster (Seite oben links, Front rechts daneben, Top darunter, 3D in der Ecke) sind keine Willkür. Sie sind exakt
die **europäische Projektionsmethode** (ISO 5456-2, Methode 1): Das Objekt steht zwischen Betrachter und Wand und wirft seine
Ansicht nach hinten wie einen Schatten. Klappt man die drei Wände einer Raumecke flach auf, entsteht genau sein Blatt.

Daraus folgt der Raum mit drei Zuständen derselben Szene, zwischen denen es keine Knöpfe gibt, nur Bewegung:

| Zustand | Bild | Wofür | Hinein |
|---|---|---|---|
| **Raum** (gefaltet) | Das Jelly-Wesen steht in einer Ecke aus drei Wänden: Boden = Top, Rückwand = Seite, Seitenwand = Front. Auf jeder Wand liegt seine Ansicht als Illustration, wie ein Schatten. | Verstehen, wie alles zusammenhängt; frei schräg schneiden | zwei Finger drehen, bis keine Achse mehr gerade ist |
| **Blatt** (aufgefaltet) | Die Wände klappen flach: Florians 2×2, aber **ein Maßstab** für alle, ohne Rahmen und Titel. Die Lage sagt, welche Ansicht es ist. | Genau arbeiten, alle Ansichten zugleich | aus dem Raum herauszoomen: die Wände klappen auf |
| **Blick** | Eine Ansicht füllt den Bildschirm (Telefon). | Eine Ansicht groß | in eine Ansicht hineinzoomen; oder im Raum auf eine Achse einrasten |

- **Ordnungslinien** (aus dem Schiffbau und dem technischen Zeichnen): Fasst man einen Punkt an, laufen feine Lichtstrahlen zu
  seinen Bildern in den anderen Ansichten. Im Raum gehen sie senkrecht vom Wesen zu den Wänden; auf dem Blatt waagerecht und
  senkrecht, zwischen Front und Top über die 45°-Gehrungslinie der Zeichner. So sieht man, welche Linie in der Front welche in
  der Seite ist (Florian, 05.11.: „Die Querschnitte von Kopf und Bauch sind in den anderen Ansichten noch nicht gut zu
  bearbeiten“).
- **Die Wände bleiben hinten.** Dreht man um das Wesen herum, klappt die Ecke mit, so dass die Wände immer hinter dem Wesen
  stehen. Von hinten gesehen ist der Grund hell (das Wenden der Blaupause), ohne Knopf.
- **Ganz weit herausgezoomt** liegt das Regal: Jedes Wesen hat seinen eigenen kleinen Raum, das Regal hält die Räume. Laden =
  hineinzoomen, Neu = der Raum mit der leeren Kugel. Sichern geschieht von selbst (Ausblick, nicht im Prototyp).

### 2. Hand: Eine Grammatik für alles

| Regel | Bedeutung |
|---|---|
| **Ein Finger macht.** | Auf einem Ding: es formen. Auf der Leere oder auf der Haut: zeichnen. |
| **Zwei Finger schauen.** | Ziehen = Blick drehen. Kneifen = Zoom und Falten. Tippen = einen Schritt zurück. Kreisen = Zeit spulen. |
| **Ein ruhender Finger hält.** | Was unter ihm liegt, bleibt. Er begrenzt den Einfluss wie ein Zirkel und macht aus einem Griffzug einen Knick. |
| **Mehr tippen, mehr nehmen.** | 1× Punkt, 2× Loop, 3× alles (wie Wort und Absatz im Text). |
| **Kritzeln nimmt weg.** | Immer eine Schicht: Tusche → Bleistift → nichts. |
| **Nachfahren tuscht.** | Eine Linie entlangfahren macht das Stück zur Kante (durchgezogen). Wie ein Tuschezeichner, der die Bleistiftlinie nachzieht. |
| **Halten zeigt Verborgenes.** | Auf dem Wesen: Röntgen (Linien dahinter werden greifbar). Auf der Leere: Lichtspuren der Gesten, die hier gehen. |

**Was ein Strich bedeutet, entscheidet seine Form**, und man sieht es, bevor man loslässt:

- quer über den Körper (hinein und wieder hinaus) → **Loop**; ein Lichtring läuft um den Körper, wo er entstehen wird;
- auf der Haut geschlossen → **Form** (z. B. Auge, Maul); kurz vor dem Schließen zieht ein Magnet das Ende an;
- hin und her über etwas → **löschen**; das Ziel franst schon beim Kritzeln aus;
- längs einer Linie → **tuschen**; die Tusche läuft hinter dem Finger her.

**Gegenstücke auf dem Mac:** Klick = Tippen, Maus ziehen = ein Finger, Trackpad mit zwei Fingern = Blick, Kneifen oder Rad =
Zoom, ⇧ = ruhender Finger, ⌥ halten = Röntgen, ⌘Z. Die bisherigen Tasten (G/S/R, O, K, L, F) bleiben als unsichtbare
Abkürzung.

**Pose ohne Regler:** Man greift ins Maul und zieht es auf. Das offene Maul *ist* die Pose. Solange es offen ist, wirkt jede
Formänderung auf die Pose (Blendshape). Zuziehen kehrt zur Grundform zurück. Der Passer zeigt den Zustand: Platte 1 trägt die
Grundform, Platte 2 die Pose; je weiter das Maul offen ist, desto weiter laufen die Platten auseinander.

### 3. Licht: Die Sprache ohne Worte

Grundregel aus der Luftfahrt: **Dunkles Cockpit.** Zu sehen sind nur das Wesen, seine Linien und Punkte. Alles andere erscheint,
wenn es gebraucht wird, und geht wieder.

| Signal | Bedeutet | Wann |
|---|---|---|
| Nähe | „Das kannst du greifen“: Punkte schwellen, das nächste Ziel bekommt einen Ring | Zeiger in der Nähe (Maus) |
| Perle | „Hier entsteht ein Punkt“: eine Perle gleitet auf der Linie mit | Zeiger über einer Linie |
| Ordnungslinien | „Hier ist derselbe Punkt in den anderen Ansichten“ | anfassen, ziehen |
| Seifenhaut | „Hier wird die Haut neu gefunden“: Schillern, das beim Loslassen erstarrt | während einer Formänderung |
| Zirkel | Einflussbereich zwischen ziehendem und ruhendem Finger | zweiter Finger |
| Lichtring | Vorschau des neuen Loops | Strich quer über den Körper |
| Tusche / Ausfransen | Kante entsteht / etwas verschwindet | nachfahren / kritzeln |
| Spiegelglas | „Hier ist die Mitte“: Glasebene mit Lichtflecken, der Zwilling leuchtet | Punkt nahe der Mittelebene |
| Röntgenlinse | Durchsicht an einer Stelle | halten |
| Passer | Pose gegen Grundform | Maul offen |
| Geister | frühere Formen | Zeit spulen |
| Einrasten | Das Jelly-Wesen wird zur flachen Illustration (perspektivisch → parallel) | Drehen nahe einer Achse |

Dazu, nur als Zusatz: leiser Ton (Bleistift, Zupfen, Reißverschluss) und in der App ein Tick der Haptik beim Einrasten und Fangen.

### 4. Leben

Das Wesen atmet kaum merklich und schaut dem Finger nach. Beim Loslassen wackelt das Jelly kurz. Während eines Zugs hält es still.
(Spore: Der Rechner haucht dem Geschaffenen Leben ein; Tester liebten ihre Wesen, auch wenn etwas schiefging.)

## Was wegfällt

Werkzeugleiste (Loop, Form, Stift, Einfluss, Fressen), die Regler Maul und Kopf, Neu/Sichern/Laden, Fenstertitel,
Wenden-Knöpfe, Hilfetexte, Statuszeile. Es bleiben das Wesen, seine Linien, Punkte und Griffe.

## Was bleibt

Das Datenmodell (Loops `mitte`/`ring`/`paar`, Punkte, Bézier-Griffe, Kanten, Spiegel, Maul, Pose), der Look der Blaupause für
die Ansichten und das Jelly für das 3D, die Tasten als zweiter Weg. Die Vision ist unabhängig vom Löser; sie liegt als Schicht
über dem, was die andere Sitzung baut.

## Offene Fragen, die die Prototypen beantworten sollen

1. Trägt die Raumecke im Arbeiten, oder ist sie nur schön? (Kriterium: Kann man auf einer schrägen Wand sinnvoll ziehen?)
2. Ist „Nachfahren tuscht“ von „Linie biegen“ sicher zu trennen? (Kriterium: Richtung der ersten 12 px.)
3. Lenkt die Seifenhaut ab, oder zeigt sie, wie weit ein Zug reicht?
4. Reicht ein Maßstab für alle Ansichten auf dem Blatt?
5. Wie fühlt sich „ein Finger zeichnet auf der Leere“ an, wenn man eigentlich drehen wollte?
