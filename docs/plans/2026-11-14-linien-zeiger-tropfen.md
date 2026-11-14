# Linien, Punkte, Zeiger: flüssig (Plan vom 14.11.2026)

Eigener Strang neben dem Plan „schnell, glatt, exakt“. Arbeitsbaum `.claude/worktrees/look-linien` (Zweig `claude/look-linien`,
Port 5199, Eintrag `linien-look`). Übergabe: [`docs/look/linien/UEBERGABE.md`](../look/linien/UEBERGABE.md).

## Florians Auftrag (14.11., gekürzt)

Optik und Verhalten von Maus, Mesh und Linien anpassen; grobe Entwürfe aus Illustrator
(`docs/look/linien/2026-11-14-florian-fisch-entwurf.webp`, `…-nah.webp`).

- Linien ganz dünn: äußere Outline 1 px, innere Linien 0,25 px. Punkte 2,5 px. Ein kleiner, schlichter, dreieckiger Zeiger.
- Kanten 1 px, verjüngt auf mindestens 0,25 px. Verdeckte Linien und Punkte in `#b9d1b4`.
- Linien und Netz reagieren dynamisch auf die Maus, weich und „liquid“ animiert, alles ausgewogen.
- Punkte werden magnetische Tropfen. Linien verdicken nahe am Zeiger und laufen weich in 0,25 bzw. 1 px aus.
- Punkte springen in der Nähe zum Zeiger, mit einer weichen Verbindung wie ein Tropfen zur verdickten Linie oder Kreuzung. Klicken:
  Der Punkt bleibt am Zeiger, bis man loslässt; solange verschiebt man die Linie oder Kreuzung an dieser Stelle.
- „Mach es dir nicht einfach“: eine ausgefeilte Kombination von Animationen, die die Bedienung intuitiver macht.
- „Wenn es einfacher ist, erst an einem 2D-Objekt wie meinem Fisch, bevor wir es auf das 3D-Mesh anwenden. Wie du es für besser
  hältst.“

## Entscheidung: zuerst 2D an seinem Fisch

Die Blätter des Editors (Seite, Front, Top) sind 2D-Ansichten mit Linien und Punkten als SVG darüber (`blattZeichnen` in
`kurven.ts`). Eine Anzeige, die 2D-Pfade flüssig zeichnet, kann diese SVG-Zeichnung später ersetzen. So lässt sich Aussehen und
Gefühl in Ruhe an seinem Entwurf prüfen, ohne den Editor anzufassen, an dem die andere Sitzung baut.

## Schritt 1 (gebaut, 14.11.): Probe am Fisch

- Seite `apps/editor/linien.html`, Code `apps/editor/src/linien/`. Der Fisch ist aus seinem Entwurf gewonnen
  (`scripts/linien/fisch-aus-entwurf.mjs`): 41 Punkte, 20 Linien als Bézier-Pfade, Umriss, innere Linien, Kanten, die verdeckte
  Linie im Maul.
- **Maß:** Der Entwurf ist dreifach exportiert. Dann stimmen seine Stärken genau (Umriss 3 Bildpunkte = 1 px, innen rund 0,75 =
  0,25 px), und die Punkte sind 2,5 px **Durchmesser** (gezeichnet 7,5 Bildpunkte). Gebaut ist es so, wie es gezeichnet ist; der
  Feinregler „Punkt (Radius)“ geht bis 4.
- **Drei Stufen:** (1) Anflug: Die nächste Linie schwillt an, spitz wie ein Pinselstrich, weich in ihre Breite auslaufend, und
  gleitet mit. (2) Tropfen: Nahe genug löst sich ein Tropfen und hängt an der Zeigerspitze, mit Hals zur Linie; ein Punkt in der Nähe
  springt selbst und schwillt zum Tropfen, alle Linien durch ihn schwellen (an Kreuzungen der Stern). Zu weit weg: Er fließt zurück.
  (3) Greifen: Drücken hält den Tropfen am Zeiger bis zum Loslassen. **Seit Florians erstem Urteil (14.11., abends: „sehr gut, bei
  Klick soll aber nicht der Punkt/Linie zum Cursor gleiten. Umgekehrt wäre es cooler … gerne animiert“):** Beim Drücken bleibt die
  Stelle, wo sie ist; der gezeichnete Zeiger gleitet auf sie (Feder „Zeiger gleitet“), der Tropfen fließt mit ihm hinein. Beim Ziehen
  folgt die Stelle genau der Bewegung der Maus, der Zeiger sitzt auf ihr; beim Loslassen gleitet er zurück unter die Maus. Geprüft:
  beim Klick 0,000 px Bewegung der Stelle, im Zug liegt der Zeiger 0,000 px auf Punkt bzw. Linie.
- **Zeichnen:** WebGL2, alles sind Kapseln mit zwei Radien. Linien vereinigen sich hart (Kreuzungen scharf wie gezeichnet), Punkte,
  Tropfen und Hälse weich (sie fließen in die Linie). Haarlinien decken so viel, wie sie breit sind.
- **Probe:** Vergleichsbild an den vier Stellen seines Entwurfs, gleicher Ausschnitt
  (`docs/progress/linien/2026-11-14-vergleich-*.jpg`, Skript `scripts/linien/vergleich.mjs`).

## Offen (Florians Wort fehlt)

1. Punkte 2,5 px Durchmesser (wie gezeichnet) oder 2,5 px Radius (wie geschrieben)?
2. „Mesh“: Gebaut ist das Netz aus Linien und Punkten. Soll auch die Haut im 3D-Fenster beim Ziehen weich nachschwingen?
3. Werte: Er stellt sie im Feinregler ein und schickt sie mit „Werte kopieren“.

## Schritt 2 (vorgeschlagen, erst nach seinem Urteil): in den Editor

- In Seite, Front und Top die SVG-Zeichnung der Linien und Punkte durch die flüssige Anzeige ersetzen. Treffer und Ziehen bleiben
  die des Editors (Punkt, Kreuzung, Griff, Stift); dazu kommen Anflug, Tropfen und Halten aus der Probe.
- Verdeckt: Was hinter der Haut liegt, grün; die Tiefe kommt aus dem 3D (Tiefenpuffer oder Strahl), heute zeichnet das Blatt alles.
- Umriss: die Silhouette der Haut als 1-px-Linie (heute ein Shader).
- 3D-Fenster (Bänder) danach.
- Gebaut im Bau-Fenster, nie unter Florians Fenster; abgestimmt mit dem Plan „schnell, glatt, exakt“ (Pause bis 17.11.) und mit der
  Design-Sitzung an `/editor`. Probe: dieselbe Bewegung an „teat firefish“ in der Seite, Vergleichsbild vorher und nachher.
