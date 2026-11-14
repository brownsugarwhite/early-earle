# Recherche: Haben FiberMesh oder Monster Mash das Nachhinken gelöst? (09.11.2026)

**Anlass.** Florian nach den Wegen A und B (Planseite „Kurven als Wahrheit“, Abschnitt 13): „Mir gefallen vom Gefühl her beide deiner
Lösungen nicht gut und klingen nach viel Nachjustieren. Hat FiberMesh oder Monster Mash solche Probleme gelöst? Recherchiere bitte
nochmal richtig und überlege, ob es nicht ehrlich eine elegantere Lösung gibt.“

Gelesen: FiberMesh (Nealen u. a. 2007) und Monster Mash (Dvorožňák u. a. 2020) ganz; dazu die Arbeit, auf die FiberMesh sich stützt
(Schneider & Kobbelt 2001, „Geometric fairing of irregular meshes for free-form surface design“), und CrossShade (Shao u. a. 2012).

## Kurzantwort

- **Nein, keiner der beiden hat es gelöst.**
  - FiberMesh hat dieselben Schwächen und lebt mit ihnen: Es rechnet in Runden, hält die Form mit einem Gedächtnis fest, vernetzt
    erst nach dem Loslassen neu und ist nach eigener Angabe nicht ganz unabhängig vom Netz.
  - Monster Mash umgeht die Frage: Die runde Form entsteht einmal in geschlossener Form aus der 2D-Zeichnung, danach wird sie nur
    noch verformt.
- **Die Ursache ist mathematisch und seit 2001 bekannt.** FiberMesh und unser Löser rechnen dieselbe Gleichung: Die Krümmung
  verteilt sich so glatt wie möglich (ΔH = 0). Diese Gleichung braucht an jeder Linie **Lage und Richtung** der Fläche (die
  Normale). Mit der Lage allein passen unendlich viele Formen.
  - Unser Löser misst die fehlende Angabe deshalb an der Haut. Daher kommen das Nachhinken, die Stufen nach dem Loslassen und
    die schwarzen Löcher.
  - FiberMesh schreibt selbst, dass die vom Netz unabhängige Lösung bei Kurven ohne Normalen instabil wird. Genau das haben wir
    mit `gewichte=geometrie` gesehen.
- **Die elegante Lösung:** Jede Linie kennt ihre Richtung, und zwar von selbst aus dem Liniennetz. Wo sich zwei Linien kreuzen,
  spannen sie die Fläche auf; dort ist die Richtung genau bestimmt, ohne zusätzliche Daten. Dann ist die Form durch die Linien
  eindeutig festgelegt, und Verfeinern ändert nur die Näherung, nicht die Form.
- **Ehrlich offen ist das Tempo.** „Eindeutig“ heißt noch nicht „in einer Runde“. Ein naiver Schnellversuch hielt nicht
  (Abschnitt 4). Das muss ein Beweis zeigen (Abschnitt 6).

## 1. FiberMesh (2007): dieselben Schwächen

- **Ablauf:** Jede Runde hat zwei Schritte: erst die Krümmungen glätten, dann die Lagen dazu lösen. Bis zur Ruhe braucht es nach
  eigener Angabe 5–10 Runden; die Matrix wird einmal zerlegt, danach nur noch eingesetzt. Das ist genau unser Löser „aus den
  Kurven“.
- **Gedächtnis:** Die Krümmung wird an *allen* Punkten zur gerade gemessenen hingezogen (Gleichung 6). Sie schreiben, dass die
  Krümmung an den Kurven sich – anders als bei Schneider & Kobbelt, wo sie am Rand fest ist – in späteren Runden ändern darf.
  - Das hält die Form ruhig, macht sie aber vom Weg abhängig.
  - Unser Weg B hat dieses Gedächtnis entfernt. Damit wurde die verdeckte Mehrdeutigkeit sichtbar (Kuppel 163 statt 150, schwarze
    Löcher).
- **Netzabhängigkeit:** Sie benutzen den gleich gewichteten Laplace und sagen selbst, dass das Ergebnis deshalb nicht ganz
  unabhängig von der Vernetzung ist.
  - Als Ausweg nennen sie Schneider & Kobbelt.
  - Ihr Versuch mit dem Willmore-Fluss (vom Netz unabhängig) war deutlich langsamer und **wurde mit Kurven ohne Normalen instabil**.
    Das entspricht unserem `gewichte=geometrie`.
- **Neu vernetzt wird erst nach dem Loslassen**, weil sich sonst die Zerlegung ändert. Genau dort springt es.
- **Größe:** 600–2000 Punkte bei 10–15 Bildern je Sekunde (2007). Wir rechnen mit 5 000–15 000 Punkten.

**Fazit:** Was Florian sieht, steckt in FiberMesh selbst. Dort ist es nur kleiner (kleine Netze, Gedächtnis).

## 2. Monster Mash (2020): umgeht die Frage

- **Form:** Monster Mash bläst die 2D-Zeichnung in geschlossener Form auf (Poisson-Gleichung, dann Wurzel, also runde Querschnitte).
  Es wird nichts gesucht, also hinkt nichts nach.
- **Bearbeiten:** Die aufgeblasene Form ist eine feste Ruheform. Griffe verformen sie (ARAP: Stücke drehen sich, möglichst ohne
  Dehnung), mit begrenzten Runden je Bild. Das konvergiert schnell, weil die Ruheform die Krümmung trägt.
- **Woher die Richtung kommt:** Am gezeichneten Umriss liegt die Normale in der Zeichenebene. Die fehlende Angabe liefert die
  Zeichnung also umsonst.
- **Grenzen nach eigener Angabe:**
  - Es gibt nur eine Ansicht.
  - Tiefenverhältnisse lassen sich kaum steuern.
  - Die Tiefenordnung hängt an der Ansicht.
  - Große Netze werden langsam.
- **Warum nicht übernehmen:** Eine Ruheform verformen heißt posieren, nicht formen. Neues Volumen (ein Horn aus der Kugel) dehnt
  die Haut gegen ARAP. Für Posen (Fressen) ist das Prinzip richtig; dort haben wir schon Knochen und Blendshape.

## 3. Die Wurzel (Schneider & Kobbelt 2001)

- **Die Gleichung braucht Lage und Normale.** Die Gleichung „mittlere Krümmung verteilt sich so glatt wie möglich“ (ΔH = 0) ist
  vierter Ordnung und braucht an jedem Rand zwei Angaben: Lage und Normale (G1).
  - Dann hat sie eine eindeutige glatte Lösung.
  - Kugeln und Zylinder sind genaue Lösungen.
  - Verfeinern oder neu Vernetzen gibt laut Abstract nur eine andere Näherung derselben glatten Fläche.
  - Gerechnet wird in zwei geschachtelten Schritten (Krümmung, dann Lagen), wie bei FiberMesh und bei uns. Die Krümmung am Rand
    wird jede Runde gemessen, aber **mit der bekannten Tangentialebene**.
- **Unserem Löser B fehlt die Normale.** Er rechnet genau das, gibt an den Linien aber nur die Lage vor und misst die Krümmung an
  der Haut mit der Normale, die die Haut gerade hat. Damit fehlt eine Angabe:
  - Jede Kuppelhöhe passt zu sich selbst (gemessen am 08.11.: 163 statt 150; Planseite Abschnitt 12).
  - Eine gekippte Haut an der Linie (ein Knick von wenigen Grad) ist für ihn ebenso richtig wie die glatte.
  - Jede Runde misst die Antwort auf ihre eigene Frage. Das gibt Nachhinken, Schwingen (heute schon unberührt: 122 → 227 → 177 → …),
    Stufen nach dem Loslassen und schwarze Löcher, denn eine umgestülpte Kuppel bestätigt sich selbst.
- **Teil 1 neu (09.11.) suchte die falsche Angabe.** Er suchte die fehlende Angabe als Krümmung quer zur Linie, und die trägt eine
  Linie nicht (Abschnitt 13). Die Normale dagegen trägt das Liniennetz.

## 4. Elegante Lösung: Linien mit Richtung

Die Richtung jeder Linie ergibt sich von selbst:

1. **An Kreuzungen:** Zwei Linien spannen dort die Fläche auf. Die Normale steht senkrecht auf beiden Tangenten. Das ist reine
   Geometrie der Linien (so gewinnt auch CrossShade 2012 Normalen aus gezeichneten Querschnitten: an den Kreuzungen, dann längs der
   Linien weitergereicht).
2. **Auf der Mittelebene:** Die Normale liegt aus Symmetrie in der Spiegelebene.
3. **Zwischen den Kreuzungen:** Die Richtung dreht sich gleichmäßig um die Linie, wie ein Band, das an den Kreuzungen
   festgehalten wird.
4. **Bei einer Linie, die nichts kreuzt** (Augenform): Sie behält die Richtung, die sie beim Zeichnen hatte, und dreht mit der
   Linie, so wie ein Bézier-Griff seine Richtung behält.

**Kanten** kommen dann von selbst: Knickt eine Querlinie an einer Kante (das macht K heute schon), hat die Fläche dort beidseits
eine eigene Richtung.

Florian stellt dabei nichts ein, es gibt nichts nachzujustieren.

**Was dann gilt (laut den Arbeiten, bei uns noch zu beweisen):**
- Die Form ist durch Linien und Richtung eindeutig, gemessen wird an der Haut nichts mehr.
- Schwarze Löcher sind ausgeschlossen, denn die Richtung nach außen ist vorgegeben.
- Hin und zurück gibt genau dieselbe Form.
- Verdichten während des Zugs ändert die Form nicht, nur ihre Näherung. Der Sprung nach dem Loslassen fällt damit weg.
- Die vom Netz unabhängigen Gewichte werden stabil, weil instabil nur ohne Normalen war.

**Was wegfallen könnte:** das Gedächtnis, die Dämpfung je Punkt, die Auflösungsgrenze der Krümmung an Schlaufen und die eigene
Härte-Behandlung im Löser (dafür zwei Richtungen an der Kante).

**Ehrlich offen:**
- **Tempo:** Schneider & Kobbelt rechnen ebenfalls in Runden (mit Mehrgitter), und eindeutig heißt nicht sofort. Ob es in jedem
  Bild ohne sichtbares Nachhinken fertig wird, weiß ich nicht.
- **Ein naiver Schnellversuch hielt nicht** (09.11., nicht im Code): Nur die Normale in der eigenen Zeile des Linienpunkts zu
  tauschen, brachte die Kuppel nicht zurück (×1,25 lief auf 199, ×0,8 pendelte um 145).
  - Die Richtung muss wie in der Arbeit in die Krümmungsmessung am Linienpunkt eingehen.
  - Dabei wird jede Seite der Linie für sich gemessen, mit der bekannten Tangentialebene.
  - Das ist eine echte Änderung am Löser, kein Schalter.

## 5. Geprüft und nicht empfohlen

| Weg | Gut | Warum nicht |
|---|---|---|
| Ruheform + Verformung (Monster Mash, ARAP, Laplace mit Drehungen) | sofort, ohne Gedächtnis | Bearbeiten wird Posieren; neues Volumen (Horn, Hals) verzerrt |
| Implizite Fläche (Feld durch die Linien, dann vernetzen) | rund, sofort | Teile verschmelzen bei Annäherung (Donut, gegen Florians Regel); Punkte behalten ihren Ort nicht (Posen, Maul) |
| Flächenstücke wie im CAD (Coons, Gregory) | sofort, genau | braucht Stücke mit Ecken: das ist der Käfig-Weg, den wir verlassen haben |
| Willmore-Fluss (rundeste Fläche) | rund, vom Netz unabhängig | laut FiberMesh langsam und ohne Normalen instabil |
| Rein linear aus der Richtung (Richtungsfeld, dann integrieren) | kein Nachhinken von der Bauart her | Rundung nur genähert; Rückfall, falls der Beweis am Tempo scheitert |

## 6. Vorschlag: Beweis „Linien mit Richtung“ (zwei Tage, mit Abbruch)

1. **Richtung je Linienpunkt** aus dem Netz (Kreuzungen, Mittelebene, dazwischen gleichmäßig, einsame Linien wie gezeichnet). Prüfung:
   Kugel mit drei Loops, die Richtungen liegen höchstens 1° neben den Kugelnormalen.
2. **Löser nach Schneider & Kobbelt:** Linienpunkte sind Ränder mit bekannter Tangentialebene, die Krümmung wird je Seite gemessen;
   kein Gedächtnis, keine Dämpfung.

**Kriterien:**
- Kuppel ×1,25 und ×0,8 kommt zur Kugel zurück (≤ 0,5 Einheiten).
- In Florians drei Fällen (Hörner mit Griffspiel, Aufblasen in Stufen, kleines Detail) kein schwarzes Loch.
- Nachhinken nach jeder Mausbewegung ≤ ½ Bildpunkt, Sprung nach dem Loslassen ≤ ½ Bildpunkt.
- Höchstens 16 ms je Mausbewegung; Hin und zurück genau.
- Boden, Pilz, Linse und Braue gleich oder besser.

**Abbruch:** nach zwei Tagen, wenn die Kuppel nicht zurückkommt oder das Nachhinken bleibt. Dann der Rückfall „rein linear aus der
Richtung“ als nächster Kandidat.

## Quellen

- A. Nealen, T. Igarashi, O. Sorkine, M. Alexa: FiberMesh: Designing Freeform Surfaces with 3D Curves. SIGGRAPH 2007 (Abschnitte 3.2,
  3.3, 4: Runden, Gedächtnis, Netzabhängigkeit, Willmore-Versuch, Neuvernetzen nach dem Loslassen, Netzgrößen).
- M. Dvorožňák, D. Sýkora, C. Curtis, B. Curless, O. Sorkine-Hornung, D. Salesin: Monster Mash: A Single-View Approach to Casual 3D
  Modeling and Animation. SIGGRAPH Asia 2020 (Aufblasen, ARAP mit Ruheform, Abschnitt 6 Grenzen).
- R. Schneider, L. Kobbelt: Geometric fairing of irregular meshes for free-form surface design. Computer Aided Geometric Design 18(4),
  2001, S. 359–379 ([PDF](https://graphics.rwth-aachen.de/media/papers/geom_fair1.pdf)): ΔH = 0 mit G1-Rand, eindeutig, Kugel und Zylinder als
  Lösungen, Unabhängigkeit vom Netz, zwei geschachtelte Schritte.
- C. Shao, A. Bousseau, A. Sheffer, K. Singh: CrossShade: Shading Concept Sketches Using Cross-Section Curves. ACM TOG 31(4), 2012
  ([HAL](https://hal-univ-tlse3.archives-ouvertes.fr/INRIA/hal-00703202)): Normalen an Kreuzungen, längs und zwischen den Linien weitergereicht.
- M. Wardetzky u. a.: Discrete Quadratic Curvature Energies. CAGD 2007 (von FiberMesh zitiert: ohne Normalen am Rand instabil).

## Nachtrag (09.11., Beweis nach Tag 1 angehalten)

Ergebnis auf der Planseite „Kurven als Wahrheit“, Abschnitt 15.
- **Bestätigt:** Mit Richtung an den Linien ist die Form eindeutig. Eine überhöhte oder abgeflachte Kuppel kommt zur Kugel zurück, ohne
  Richtung bleibt sie bei 163. Die Richtung lässt sich von selbst aus dem Liniennetz gewinnen (Kugel mit drei Loops: höchstens 0,52°
  daneben).
- **Nicht bestätigt:** Die Rechnung nach Schneider & Kobbelt (Krümmung an den Linien je Seite messen) ist auf unserem Netz nicht robust.
  - Sie brauchte sechs Schutzregeln.
  - In Florians Hörner-Fall zeigt sie umgestülpte Stellen früher als heute und läuft nach Griff 10 weg.
  - Den Sprung nach dem Verfeinern behebt sie mit gleichen Gewichten nicht.
- **Nebenbefund:** Das Maß des Lösers misst die Krümmung heute 8 % zu flach, weil die Normalen nach Fläche gemittelt werden. Mit den
  Normalen nach Max (1999) ist es auf 1 % genau.
