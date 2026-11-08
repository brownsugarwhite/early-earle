# Zeichnen, Aufblasen, Schneiden, Anbauen: Teddy und FiberMesh mit Illustrator-Werkzeugen

Stand 08.11.2026, **Entwurf, Recherche läuft noch** (wird heute ergänzt). Branch `claude/nice-lovelace-gxxpux`, aufgesetzt auf
`claude/form-zuerst` (Stand 640c2595, „Stift-Form liegt genau wie gezeichnet“). Noch nichts gebaut.

## Anlass (Florian, 08.11., wörtlich)

> ich würde gerne ein paar frische funktionen in den neuen editor einbauen. die idee stammt von fibermesh und teddy. Bei beidem
> startet man mit dem zeichnen einer grundform von der seite. Das ist gut. Das soll auch mein neuer startpunkt sein.
>
> Ich möchte es aber eher an illustrator angleichen und möchte dazu eine kleine elegante werkzeugleiste mit freihand zeichnen (n in
> illustrator mit sehr geglättetem stroke). Es soll sich anfühlen als würde man in photoshop mit einem harten pinsel mit 100%
> glättung zeichnen. Dabei nur die allernötigsten handlepunkte setzen. Dann werkzeug P von illustrator. Es ist schon gebaut. Aber
> ich will damit bereits die erste form von der seite zeichnen können. Es soll vorgegebene Formen wie kreis und ellipse geben und
> rechteck/quadrat. hier kann man die form von der seite erstellen die dann aufgeblasen wird wie bei teddy oder fibermesh. Ein
> weiterer button fügt saubere meshloops an den optimalen stellen ein (beim kreis z.B mittig von jeder seite). Quadrat mit harten
> kanten. bei organischen formen müssen intelligent die wichtigsten edgeloops gefunden und gesetzt werden. Auch die loops können
> organisch und weich sein.
>
> ich möchte weitere formen abschneiden und und erweitern können wie bei teddy oder fibermesh, indem ich durch edgloops
> abgesteckte bereiche auf dem mesh markieren und löschen kann. Die abschnittstellen bilden saubere harte kanten. ( Ähnlich wie es
> jetzt schon beim maul ist) Beim extrude möchte ich zusätzliche formen an abgeschnittene stellen oder einfach in den freien raum
> malen können wie bei fibermesh, nur mit meinen illustrator tools..die form soll sich dann auch aufblasen und wenn ich direkt an
> edgeloop punkten gezeichnet habe soll die form aus dem loop entstehen auch wie bei teddy oder fibermesh. Ich muss allgemein auch
> punkte mit p oder n(pinselwelkzrug) direkt von punkten des mesh's weiterzeichnen können also dass die linie der neuen form
> direkt an einer kreuzung anfängt und verbunden ist.
>
> Recherchiere erstmal ausgiebig und mache dir einen plan für die umsetzung. es soll dann an die arbeit der aktuell arbeitenden
> session anknüpfen.

## Gliederung (wird gefüllt)

1. Kurzfassung für Florian
2. Anknüpfung an die laufende Session (`kurven.html`, Kern `packages/shape/src/dicht/`)
3. Recherche (Teddy, FiberMesh, Monster Mash; Stift-Glättung; Loops von selbst)
4. Bedienung (Werkzeugleiste, Zeichenmodus, Ablauf)
5. Bausteine
6. Schritte mit Toren
7. Entscheidungen für Florian
8. Risiken
