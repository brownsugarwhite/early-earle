# Richtungen statt Griffe: Konzept (15.11.2026)

Teil des Strangs „Linien, Punkte, Zeiger“ ([Plan vom 14.11.](2026-11-14-linien-zeiger-tropfen.md)). **Konzept zur Freigabe.** Gebaut
ist davon nur die P-Regel (Abschnitt „Schon gebaut“). Die Bilder sind gestellte Standbilder im echten Look der Probe. Verhalten ist
das noch nicht:

- `docs/progress/linien/2026-11-15-konzept-2d.png`: an seinem Fisch, Kreuzung vorn am Kopf (Punkt 55, Linie 2), sechs Bilder.
- `docs/progress/linien/2026-11-15-konzept-raum.png`: an „teat firefish“, Kreuzung auf der Flanke (Anker 3, Linie 1), drei Bilder.
- Skripte: `apps/editor/scripts/linien/konzept-bilder.mjs` und `konzept-raum.mjs`. Sie legen Zunge, Griff, Ring und alte Richtung als
  zusätzliche Kapseln in dieselbe Anzeige.

## Florians Auftrag (15.11., wörtlich)

> „schön, der liquid effect und tropfen effect wirkt gut. Die genauen einstellungen muss ich noch testen. Das Konzept muss noch
> weiterentwickelt werden. Ich frage mich wie handles and den griffen aussehen könnten und ob sie überhaupt nötig sind oder es eine
> bessere bedienmethode gibt. Es muss immer ganzklar sein in welche richtung man an einem punk dreht. Man muss jede richtung an einer
> kreuzung enzeln knicken und wieder runden können und das drehen im raum muss immer eindeutig sein. Dabei soll das liquid konzept
> bei allem zu sehen und erhalten bleiben.
>
> Kannst du mir hier ein schönes und elegantes konzept ausarbeiten?
>
> die punkte auf der linie sollen nur erscheinen wenn ich mit werkzeug p einen punkt auf linien setzen kann. sonst nur die
> verdickung.“

Dazu sein Satz vom 13.11. (Plan „schnell, glatt, exakt“, Schritt 6): „An einer Kreuzung kann ein Punkt mit mehr als 2 Handles in eine
Richtung knicken, aber in eine andere rund verlaufen.“

## Die Antwort in drei Sätzen

Griffe braucht es als Wissen: Jede Richtung an einem Punkt hat einen Winkel und einen Schwung. Als eigene Anfasser, die neben der Linie
im Raum schweben, braucht es sie nicht: Die Richtung ist der Anfang der Linie selbst. Man fasst die Linie nahe am Punkt an und dreht
sie um den Punkt; der Griff erscheint nur, solange man ihn hält, als Haarlinie mit Perle, und ein Ring zeigt die Ebene, in der gedreht
wird.

## Begriffe

- **Richtung:** jedes Stück Linie, das einen Punkt verlässt. Ein Punkt auf einer Linie hat zwei, eine Kreuzung vier, ein Ende eine,
  eine Abzweigung drei.
- **Schwung:** wie weit eine Richtung trägt (die Länge ihres Bézier-Griffs).
- **rund oder Knick:** Die beiden Richtungen einer Linie an einem Punkt liegen auf einer Geraden und drehen zusammen (rund) oder jede
  dreht für sich (Knick). An einer Kreuzung gilt das **je Linie**. Ein Ende und der Ast einer Abzweigung haben kein Gegenüber; sie
  sind immer frei.
- **Nabe:** der Punkt, um den gedreht wird.

## Eine Formensprache: Man sieht vor dem Klick, was geschieht

| Unter dem Zeiger | Bild | Drücken und Ziehen |
| --- | --- | --- |
| Punkt | **Stern:** alle Linien durch ihn schwellen, Tropfen am Zeiger | Punkt verschieben (wie heute) |
| Linie nahe am Punkt | **Nadel:** die Linie schwillt vom Punkt aus an, so weit ihr Schwung reicht; rund auf beiden Seiten, geknickt nur auf dieser, mit Taille am Punkt | Richtung drehen |
| Linie weiter weg | **Spindel** an der Stelle | Linie dort biegen (wie heute) |
| Linie, mit P | **Perle** in der Linie | Punkt setzen (gebaut) |

In Ruhe: nur Linien und Punkte, keine Griffe (Bild 1). Was man berührt, bewegt man: den Punkt, die Richtung, die Stelle. Wo die
Nadel endet, beginnt die Stelle (die Nadel ist so lang wie der Schwung, mindestens 14 px, höchstens 45 % des Stücks). Damit ist auch
an einer Kreuzung klar, welche der vier Richtungen dreht: die, deren Linie man berührt (Bild 2 gegen Bild 3).

## Drehen

1. Zeiger auf die Linie nahe am Punkt: die Nadel. Rund zeigt sie beide Seiten (die Gegenseite dreht mit), geknickt nur die eine (Bild 3).
2. Drücken: Der Zeiger gleitet an die Spitze des Griffs (wie heute beim Greifen), aus der Nadel zieht sich der Griff als Haarlinie
   mit einer Perle, und der Ring wächst aus dem Punkt. Sein Radius ist der Schwung, mindestens 22 px, damit der Hebel reicht (Bild 4).
3. Ziehen: Die Richtung zeigt immer genau auf den Zeiger, der Winkel folgt ohne Sprung. Der Griff klebt am Ring: Wer nur dreht,
   ändert den Schwung nicht. Erst wer deutlich nach außen oder innen zieht (mehr als ein Zehntel des Radius), macht die Linie runder
   oder spitzer, und der Ring geht mit.
4. Rund dreht die Linie als Ganzes um den Punkt, die Gegenseite behält ihren Schwung. Die alte Richtung steht grün, bis man loslässt
   (Bild 5).
5. Loslassen: Griff und Ring fließen in den Punkt zurück, der Zeiger gleitet zurück unter die Maus.

## Knicken und Runden, jede Richtung für sich

- **⌥ beim Ziehen:** Die Richtung reißt von ihrer Gegenseite los, die Nadel schnürt sich am Punkt zur Taille, und sie dreht allein
  (Bild 6). Der Punkt sitzt dann hart als Fuge zwischen den Seiten.
- **Zurück in die Flucht:** Kommt eine geknickte Richtung bis auf 5° an die Gerade ihrer Gegenseite, rastet sie ein, und die Taille
  fließt zu. Sie ist wieder rund. Mit gehaltenem ⌥ rastet nichts.
- **Doppelklick auf eine Richtung:** Knick und rund im Wechsel. Beim Runden fließt die angeklickte Richtung in die Flucht ihrer
  Gegenseite (animiert, nichts springt).
- **An einer Kreuzung für jede Linie einzeln.** Heute knicken dort alle Griffe zusammen (`eckeUmschalten`, `eckeGezeigt` in
  `kurven.ts`: „sobald einer seiner Loops dort eine hat […] knicken alle seine Griffe“). Das ändert sich.
- **Für die Haut** (meine Lesart seines Satzes vom 13.11., zu bestätigen): Knickt Linie A an der Kreuzung, während B rund
  durchläuft, liegt dort eine Kante entlang B: 1 px am Knick, zu den runden Nachbarn hin auf 0,25 px verjüngt. Knicken beide, wird es
  eine Spitze. Das passt zu dem, was der Editor heute schon von selbst tut: Wo eine Kante kreuzt, darf die andere Linie knicken
  (`autoEcke`).

## Drehen im Raum: immer um eine Achse, die man sieht

- **In den Blättern Seite, Front, Top:** in der Ebene des Blatts, wie in einer Zeichnung. Die Tiefe bleibt, die anderen Blätter ändern
  sich nicht.
- **Im 3D, Standard: auf der Haut.** Der Ring liegt auf der Haut, die Achse ist ihre Senkrechte am Punkt (an einer Kreuzung aus den
  Richtungen beider Linien). Die Richtung gleitet über die Haut, die Linie bleibt auf dem Körper (Raum, Bild 1 und 2).
- **Im 3D mit ⇧: aus der Haut.** Der Ring stellt sich auf (durch die Richtung und die Senkrechte), die Richtung kippt aus der Haut oder
  in sie hinein, und die Form wölbt sich. Was vom Ring in der Haut liegt, ist grün wie alles Verdeckte (Raum, Bild 3).
- Beide Achsen hängen an der Form, nicht am Blick: Dieselbe Bewegung tut aus jeder Ansicht dasselbe, und der Ring ist da, bevor sich
  etwas bewegt. Sieht man den Ring fast von der Kante (flacher als 20°), wird der Winkel um den Punkt auf dem Bildschirm gemessen statt
  auf dem Ring. Die Achse bleibt dieselbe, nichts springt.
- **Nicht vorgeschlagen:** im 3D in der Bildebene drehen (wie R in Blender). Auf dem Bildschirm ist das eindeutig, im Raum nicht: Aus
  einer schrägen Ansicht kippt die Richtung dabei in die Haut, ohne dass man es sieht. So zieht der Editor heute die Griffe („in der
  Ebene des Blatts verschoben (die Tiefe bleibt)“, `zugBewegen`).

## Flüssig bei allem

- Was gemeint ist, schwillt an; was losgelassen wird, fließt zurück.
- Rund ist weich: Die Nadel fließt ohne Taille durch den Punkt. Knick ist hart: Der Punkt sitzt als Fuge.
- Nichts erscheint auf einen Schlag: Der Griff zieht sich aus der Nadel, der Ring wächst aus dem Punkt. Beim Reißen schnürt sich die
  Taille mit einem kleinen Nachfedern, beim Runden fließt sie zu.
- Linien bleiben unter sich hart (Kreuzungen scharf wie gezeichnet). Weich verschmelzen nur Punkte, Tropfen, Perlen und der Fuß des
  Griffs.
- Federn: Sprünge mit leichtem Überschwingen (Tropfen, Einrasten), Ring und Griff ruhig gedämpft (Genauigkeit vor Spiel).

## Schon gebaut (15.11.): Punkt auf der Linie nur mit P

- **Ohne P:** Unter dem Zeiger zeigt die Linie nur ihre Verdickung. Greifen und Ziehen biegen sie wie bisher.
- **Mit P** (Taste P oder Knopf „P · Punkt setzen“, Esc beendet): Eine Perle in Tropfengröße sitzt in der Linie. Mit 4 px ist sie in
  der Verdickung (3,5 px) zu sehen; eine Perle in Punktgröße (2,5 px) ginge darin unter. Geht der Zeiger weg, löst sie sich als Tropfen.
  Drücken setzt dort den Punkt (die Linie behält ihren Verlauf), er bleibt gegriffen, Ziehen verschiebt ihn gleich. Im Raum
  bekommt das Spiegelbild denselben Punkt. ⌘Z nimmt ihn wieder heraus.
- Bild `docs/progress/linien/2026-11-15-stift.png` (ohne P, mit P am Zeiger, mit P daneben). Probe
  `scripts/linien/stift-probe.mjs`:
  - In 2D ohne P kein Tropfen (Größe 0), Verdickung voll, Ziehen setzt keinen Punkt.
  - Mit P: Perle 1,6 × Punkt. Nach dem Setzen ein Punkt und ein Stück mehr, die Linie weicht um höchstens 0,004 px von vorher ab.
    Gezogen genau 10 / −8 px, ⌘Z wie vorher.
  - Im Raum zwei Anker und zwei Stücke mehr, das Spiegelbild genau gespiegelt (0 Abweichung), ⌘Z wie vorher.

## Nächste Schritte (nach seinem Wort)

1. **Konzept-Probe** in `linien.html` (sein Fisch) und `raum.html`. Bauen: Nadel, Griff, Ring, Knick mit ⌥, Einrasten, Doppelklick;
   im Raum der Ring auf der Haut und mit ⇧ aufgestellt. Die Probe steht vorher fest: an der Kreuzung aus den Bildern eine Richtung
   um 30° drehen, einmal rund und einmal geknickt. Die Linie muss dem Zeiger auf 0,1° genau folgen, und beim Drücken und Loslassen
   darf nichts springen.
2. **Danach der Einbau in den Editor**, zusammen mit Schritt 2 des Strangs. Das Knicken je Linie an der Kreuzung ändert
   `eckeUmschalten` und `eckeGezeigt` in `kurven.ts`, also den Kern des Editors. Das geschieht im Bau-Fenster und abgestimmt mit dem
   Plan „schnell, glatt, exakt“ (Pause bis 17.11.).

## Freigabe (15.11.)

Florian: „Ja, so bauen“. Damit gelten die Vorschläge zu den Fragen 1 bis 4: Griff nur beim Halten; Knicken mit ⌥, Runden durch
Einrasten oder Doppelklick; im 3D auf der Haut, mit ⇧ aus der Haut; Schwung durch Ziehen nach außen und innen mit Rasten am Ring.
Frage 5 (Kante entlang B) betrifft die Haut im Editor, nicht die Probe; sie bleibt offen. Gebaut wird Schritt 1 der „Nächsten Schritte“.

## Fragen an Florian (vor der Freigabe)

1. Griff nur, solange man ihn hält (Vorschlag), oder beim gewählten Punkt dauerhaft sichtbar?
2. Knicken mit ⌥ beim Ziehen, Runden durch Einrasten oder Doppelklick (Vorschlag)?
3. Im 3D auf der Haut als Standard und ⇧ für „aus der Haut“ (Vorschlag), oder wie in Blender in der Bildebene?
4. Schwung durch Ziehen nach außen und innen, mit Rasten am Ring (Vorschlag), oder getrennt?
5. Stimmt die Lesart „Knickt A an der Kreuzung, liegt dort eine Kante entlang B“?
