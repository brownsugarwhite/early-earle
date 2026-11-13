# Runde 2 (13.11.2026): drei neue Vollbild-Prototypen

Florians Rückmeldung zu Runde 1 (wörtlich): „Leider für mich mit der Maus am Desktop nicht bedienbar oder ich verstehe es zu
mindest nicht wie. Ich hätte auch erwartet dass du das layout veränderst. … Gerade sieht es halt aus wie vorher nur als
raumecke....langweilig. Bitte gib mir auch anständige fullscreenprototypen. … Es soll auch am ipad bedienbar sein aber auch vor
allem mit maus und tastatur.“

## Was falsch war

- Touch zuerst gedacht: Ein Finger auf der Leere zeichnete. Mit der Maus hieß das: Linksziehen dreht nicht, sondern zeichnet.
  Gegen Florians Gewohnheit („Grund ziehen dreht“) und ohne sichtbaren Hinweis.
- Das Layout ordnete nur die vier Ansichten neu (Raumecke). Inhaltlich dasselbe wie vorher.
- Der Prototyp steckte klein in einer Seite.

## Neue gemeinsame Grammatik (Maus und Tastatur zuerst)

| Eingabe | Wirkung |
|---|---|
| Links ziehen auf der Leere | drehen (wie heute), nahe einer Achse einrasten |
| Links auf Punkt, Griff, Linie | wählen, ziehen, biegen |
| Doppelklick Linie / Punkt | Punkt einsetzen / Ecke ↔ glatt (wie heute) |
| **Rechts ziehen** (oder ⌥ + links, oder Stift P) | zeichnen: quer = Loop, geschlossen = Form, Zickzack = löschen, längs einer Linie = Kante |
| Rad | Zoom am Zeiger; während eines Zugs: Einfluss (wie O) |
| Mitte, Leertaste oder ⇧ + links ziehen | schwenken |
| Tasten | 1/3/7/0 Ansichten, ⌘Z/⇧⌘Z, ⌫, K, L, F, G/S/R, Pos1, ? |
| iPad | Finger = greifen und drehen, Pencil = zeichnen, zwei Finger = Zoom/Schwenk und Tippen = zurück |

Dazu: eigene Zeiger je Lage (drehen, greifen, Perle, Stift), eine Geistermaus zeigt beim Start drei Gesten, `?` zeigt sie wieder.

## Drei Layouts, je eine eigene Vollbildseite

1. **Bullaugen:** eine einzige große 3D-Ansicht. Die Punkte erscheinen nur im Licht um den Zeiger (Taschenlampe). Die anderen
   Ansichten kommen als runde Linsen zum Zeiger, jede auf der Seite, von der aus sie schaut (Top oben, Seite seitlich), zentriert
   auf die Stelle unter dem Zeiger. Klick in eine Linse tauscht sie mit der Hauptansicht.
2. **Modellblatt:** ein lebendes Turnaround-Blatt (Front, ¾, Seite, ¾ hinten, Rücken, darunter Top) auf Papier, Konstruktions-
   linien in Non-Photo-Blau. Höhen fluchten über alle Ansichten. Ziehen auf der Leere dreht alle Ansichten zugleich.
3. **Drei Platten:** Seite, Top und Front als Risograph-Platten übereinander (gleiche Höhe, gleiche Länge, Mitte auf Mitte).
   Die Platte unter dem Zeiger wird kräftig, die anderen blass. Man schiebt die Platten auseinander (bis zum Blatt) oder
   zusammen. Der Passer wird zum Layout.

Die Raumecke bleibt als Vergleich (mit derselben Maus-Grammatik).
