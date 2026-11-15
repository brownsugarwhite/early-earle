# Anfang einer Form und Seifenhaut: Konzept (15.11.2026)

Eigener Strang neben „Linien, Punkte, Zeiger“ (der Look der Linien kommt von dort, [Plan vom 14.11.](2026-11-14-linien-zeiger-tropfen.md)
im Zweig `claude/look-linien`). Hier: wie eine neue Form beginnt, wie sie aufgeblasen wird und aus welchem Material ihre Haut ist.
Florians schneller Entwurf der Materialien (keine feste Vorlage): `docs/look/anfang/2026-11-15-entwurf-materialien.webp`.

## Florians Auftrag (15.11., wörtlich)

> „Hier möchte ich den Start in die Szene und das Basismaterial für mein Mesh/Wesen erstellen.
>
> Eine neue Form soll man immer von der Seite beginnen. Man hat eine fast leere Seite vor sich und wird mit dem Text draw a
> silhouette in der Mitte des Bildschirms begrüßt. Ähnlich wie bei einem neuen Chat in der Claude KI App, nur soll man zeichnen
> statt einen Prompt einzugeben.
>
> Dazu hat man das Illustrator-Werkzeug wie „P“ oder ein Freihandtool zur Verfügung, mit dem man einen geschlossenen Loop erzeugt.
> Alles soll dem Look entsprechen „liquid drop“, den wir gerade in der Session „Mesh und Linien Interaktivität“ erarbeiten: feine
> Haarlinien, Punkte als Tropfen und alles bewegt sich dynamisch und harmonisch zusammen. Das Freihandwerkzeug machen wir später.
>
> Wenn ich eine geschlossene Form gezeichnet habe und diese mit Enter bestätigt habe, zieht sich die Silhouette zurück und die
> Kamera dreht sich leicht. Das Zurückziehen der Silhouette soll sein, als würde man einen mit Seifenhaut überzogenen Seifenring
> nach hinten bewegen, und aus der Haut wird durch den Fahrtwind das 3D-Objekt mit einer eleganten, wobbeligen Animation
> aufgeblasen. Es soll sehr intuitiv und dynamisch wirken. Das Seifenblasenmaterial soll wunderschön geshaded sein. Es soll
> einerseits schlicht und elegant aussehen, dabei mit der Aufspaltung der Farben arbeiten. Es kann gerne abstrahiert sein und auch
> zum Eyvind-Earle-Stil passen. Teste gerne mehrere verschiedene Versionen gegeneinander und sei maximal kreativ.
>
> Angehängt ist ein schneller Entwurf von Materialien mit GPT. Du darfst gerne eine bessere Lösung entwickeln. Es ist keine feste
> Referenz. Am besten sollten die materialeigenen Effekte zur intuitiven Bearbeitung beitragen, falls du hier eine coole Idee hast,
> bin ich sehr dankbar.
>
> Entwickle ein richtig cooles und gleichzeitig elegantes und sehr minimalistisches Konzept für die Anfangsanimation des Aufblasens
> und des Materials.“

## Die Idee in drei Sätzen

Eine neue Form beginnt auf einem leeren Blatt: In der Mitte steht „draw a silhouette“, am Zeiger hängt der Tropfen von P. Schließt
sich der Loop, spannt sich in ihm eine Seifenhaut; ↩ zieht den Ring nach hinten, der Fahrtwind bläst die Haut zur Form auf, sie
schwingt nach und kommt zur Ruhe, während die Kamera ein Stück um sie herumgeht. Die Farben der Haut entstehen wie bei einer echten
Seifenhaut aus ihrer Dicke: Wo sie gedehnt wird, wird sie dünner und wechselt die Farbe, so zeigt das Material beim Bearbeiten,
was mit der Haut geschieht.

## Ablauf

1. **Leeres Blatt.** Weißes Papier, in der Mitte klein und ruhig „draw a silhouette“. Sonst nichts. Der Zeiger ist P: an der Feder
   hängt ein Tropfen (wie im Konzept „Auswahl und Werkzeug P“, Bild 1).
2. **Zeichnen mit P** wie in Illustrator: Klick setzt eine Ecke, Ziehen gibt Schwung (Griffe als Haarlinien mit Perlen), ⌥ bricht
   den Griff, ⌫ nimmt den letzten Punkt zurück, Esc verwirft. Vom letzten Punkt zur Feder spannt sich der Faden. Mit dem ersten Punkt
   blasst der Text aus. Umriss 1 px, Punkte 2,5 px, Tinte wie in der Linien-Probe.
3. **Schließen.** Am ersten Punkt öffnet sich ein Ring, Klick schließt, eine Welle läuft einmal um den Loop. Im selben Moment
   spannt sich die Haut: ein zarter Schimmer mit fließenden Farben im Loop, wie die Seifenhaut in einem Ring. Ein leiser Hinweis „↩“.
   Punkte und Griffe lassen sich noch ziehen.
4. **Aufblasen (↩).** Der Ring weicht nach hinten aus, die Haut bleibt im Fahrtwind zurück und wölbt sich nach vorn, dann schlägt die
   hintere Hälfte durch und schließt die Form (spiegelgleich). Die Haut schwingt zwei, drei Mal nach (Feder, kein Abspann), die
   Kamera dreht sich dabei etwa 30° zur Seite und ein wenig von oben. Beim Dehnen wird die Haut dünner: Die Farben laufen über die
   Form und beruhigen sich. Dauer etwa 1,5 s. Der Loop bleibt als Haarlinie auf der Form, das Verdeckte grün wie in der Raum-Probe.
5. **Ruhe.** Die Form schwebt, die Farben fließen sehr langsam. ⌫ oder Esc lässt die Luft wieder heraus (zurück zum Loop auf dem
   Blatt, zum Ändern und neu Aufblasen).

## Material: Fassungen gegeneinander

Alle Fassungen rechnen dieselbe Physik der dünnen Schicht (Farbe aus Dicke und Blickwinkel, eine Farbtafel wie die Interferenzfarben
nach Michel-Lévy); sie unterscheiden sich darin, wie viel davon man sieht und wie abstrakt es ist.

1. **Seifenhaut:** durchsichtig, Farben nur in der Spiegelung, weiche Lichter, am Rand stärker. Am nächsten an einer echten Blase.
2. **Irisdruck:** deckend wie Perlmutt, drei harte Lichtstufen mit Verlauf in jeder Stufe (wie bei Earle), die Farben der Schicht
   darauf wie ein Irisdruck im Siebdruck, in Bändern.
3. **Horizont:** eine gläserne Blase, die einen abstrakten Horizont spiegelt (heller Himmel, dunkles Land, harte Kante mit Verlauf
   in jeder Fläche, wie Earle). Nur an dieser Kante spaltet sich das Licht in Farben auf.
4. **Höhenlinien:** die Farbringe folgen der Form wie Höhenlinien auf einer Karte. Man liest die Wölbung direkt ab; zieht man an der
   Haut, drängen sich die Ringe zusammen (wie bei Spannungsoptik).

Grund jeweils Papier (wie der Editor) oder Nacht (dunkel, wie der Entwurf).

## Das Material hilft beim Bearbeiten

- **Spannung:** Wird die Haut gedehnt, wird sie dünner und ändert die Farbe, dort und nur dort. Man sieht beim Ziehen, wie weit die
  Haut nachgibt; danach beruhigt sich die Farbe langsam.
- **Hauch:** Der Zeiger haucht die Haut an. Unter ihm wird sie ein wenig dünner, die Farben weichen zur Seite. So zeigt die Haut
  selbst, wo der Zeiger auf ihr liegt, ohne Zeichen.
- **Fahrtwind:** Dreht man die Ansicht, fließen die Farben gegen die Bewegung und kommen danach zur Ruhe.
- **Zu dünn:** Eine echte Seifenhaut wird vor dem Platzen golden, dann silbern, dann schwarz. Dieselbe Folge kann zeigen, wo die
  Haut zu stark gedehnt ist.

## Probe

- Arbeitsbaum `.claude/worktrees/anfang`, Zweig `claude/anfang` (von `claude/form-spiegel`, 23aa8e7d), Eintrag `anfang` in
  `.claude/launch.json`, Port 5203, Seite `anfang.html`. Code in `apps/editor/src/anfang/`. Die flüssige Anzeige der Linien ist eine
  Kopie von `src/linien/fluessig.ts` (Stand d762e508); am Look der Linien wird hier nichts entschieden.
- Die Haut der Probe ist ein eigenes Netz (Loop → Dreiecke → Wölbung aus der Poisson-Gleichung, Wurzel davon wie bei Monster Mash);
  der Editor und sein Löser bleiben unberührt. Wie die aufgeblasene Form in den Editor kommt, entscheidet Florian nach der Probe.
- **Festgelegte Probe:**
  1. Übergang vom Blatt in den Raum ohne Sprung: Im ersten Bild nach ↩ liegt der Loop auf weniger als einen halben Bildpunkt genau
     dort, wo er gezeichnet wurde.
  2. Der Rand bleibt geschlossen, keine Falten, keine Spitzen; die Form steht nach höchstens 2 s still.
  3. 60 Bilder je Sekunde am Mac während des Aufblasens.
  4. Film des Ablaufs und ein Bildstreifen je Fassung an derselben Form, gleiche Ansicht: `docs/progress/anfang/`.
- Später, nicht jetzt: Freihandwerkzeug; Einbau in den Editor; Platzen und Schatten auf dem Papier, falls die Probe sie braucht.
