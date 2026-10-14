# Zeichnung ist Form: Korrektur des Kerns (15.10.2026)

> Florian, 15.10. morgens: „Das Maul ist meistens ganz anders geformt als die Zeichnung … Auch beim Tiger weicht die Form von oben und von der Seite sehr vom eingezeichneten Shape ab.“ Antwort: Das ist der Vertrag von Phase 1 (Plan 3.2), nicht einer späteren Phase. Diese Seite hält fest, was gemessen ist, was fehlt, und in welcher Reihenfolge es behoben wird. Abgenommen wird mit Florians Sätzen, nicht mit meinen Zahlen.

## 1. Befund (gemessen, 15.10. morgens)

Abweichung zwischen Körper-Silhouette und gezeichneter Kurve je Blatt, Stufe 2, Pixel bei 461 px je Kachel (`scratchpad/umriss-abweichung.ts` mit `umrissAusNetz`):

| Wesen | Seite | Front | Top |
|---|---|---|---|
| Kugel | 0,4 | 0,3 | 0,4 |
| Rex | 0,8 | **11,1** | 1,7 |
| Tiger (Kasten-Spanten) | 2,6 | 2,9 | **21,6** |
| Langhals | 1,4 | 4,3 | **17,5** |

- Die Blatt-Kameras decken sich mit den Kurven (Kugel: Mitte ≤ 1,3 px, Radius ≤ 0,7 px daneben). Die Abweichung ist echte Geometrie.
- **Nur die Seite ist angepasst:** Der Naht-Löser zieht die Grenzfläche durch die Seitenkurve. Für Top und Front gibt es keinen Löser; die Ringbreiten werden am Käfig gesetzt, die Grenzfläche liegt innen, und bei Widersprüchen zwischen Top und Front gilt still die kleinere Breite.
- **Maul:** Die Lippe darf vorn nur an der Spitze oder eine Kappenreihe darunter beginnen (zwei Höhen). Gezeichnete Linien bekamen fest „eine Reihe darunter“ (Überbiss-Trick des Rex): eine gerade Linie knickt vorn zur Kappenreihe, die Kerbe.
- **Bauweise:** Der Körper wird bei jeder Änderung neu aus den drei Shapes abgeleitet. Plan 4.1 sah vor: einmal ableiten, dann nur noch den Käfig bearbeiten. Dieser zweite Teil ist nicht gebaut; Pinsel-Deltas liegen nur obendrauf.

## 2. Abnahme (Florians Sätze)

1. „Die gerade Maullinie ergibt ein gerades Maul.“ Allgemein: Die Lippe liegt dort, wo ich sie zeichne, in jedem Blatt.
2. „Der Umriss von oben ist mein Umriss.“ Allgemein: In allen drei Blättern liegt der Körper auf meiner Kurve; wo meine Kurven sich widersprechen, sehe ich es, der Kern entscheidet nicht still.
3. „Den Giraffenhals ziehe ich hoch, und er bleibt hoch.“ Allgemein: Was ich am Körper ändere, bleibt; keine Ansicht formt eine andere.

Messbar dazu: Seite, Front und Top je ≤ 1 px (Kugel, Rex, Tiger, Langhals), Lippe gegen gezeichnete Linie ≤ 1 px im Blatt, und die Zahlen stehen in der Tafel, nicht nur in Tests.

## 3. Reihenfolge

1. **Breitenschleife an die Top-Kurve binden** (heute). Der Ausgleichslöser bekommt neben den Nahtpunkten je Ring den breitesten Punkt (rechts und gespiegelt) als Bedingung: Grenzlage z = Top-Breite bei x. Damit gilt: **Top bestimmt die Breite, Front und Spanten bestimmen die Form des Querschnitts.** Die Front-Silhouette wird nicht mehr still verrechnet, ihre Abweichung wird gemessen und angezeigt.
2. **Lippe auf der gezeichneten Höhe.** Zuerst: Lippenanfang aus der Höhe der Zeichnung (Spitze oder darunter), dann die Kappe an der Lippe so teilen, dass der Anfang genau auf der Höhe liegt (Längsschnitt durch die Kappe). Messung: Lippe gegen Linie je Blatt.
3. **Käfig als Wahrheit.** Der Käfig steht im Dokument; die Ableitung läuft nur noch beim Anlegen (Kugel, Umriss, Nachzeichnen) und auf Wunsch. Danach: Seitenkurve = Griff für die Naht (Löser wie heute, örtlich), Top-Kurve = Griff für die Breitenschleife, Reifen = Ringe direkt, Pinsel = Deltas im Käfig, Maullinie = Schleife auf dem Käfig. Nichts wird neu abgeleitet.
4. **Saum und Zahl im Blatt.** Je Blatt die Abweichung als Zahl im Titel und als Lichtsaum, wo sie > 2 px ist (Plan 9.8). Erst dann wieder Oberfläche oder neue Funktionen.

## 4. Was bleibt

Look, Maul mit Zähnen, Kieferknopf, Augen, Reifen, Pinsel, Stamm/Tafel/Dock, Bogen und Nachzeichnen hängen am Käfig und bleiben. Blender ist nicht Teil dieses Plans.

## Stand

- 15.10. morgens: Befund gemessen, Seite geschrieben. Schritt 1 begonnen.
