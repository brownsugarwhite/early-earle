# Maul als Einsatz — Fortsetzung (21.10.2026)

Florian 21.10.: „Weiter mit Teil A ‚Maul als Einsatz‘: Damit sollen glatte Haut, Querschnitt aus der Hülle, Linien exakt und
Loops auch mit Maul wirken.“ Grundlage bleibt Teil A des freigegebenen Plans
[`2026-10-15-maul-einsatz-harmonie-posen.md`](2026-10-15-maul-einsatz-harmonie-posen.md) (acht Festlegungen, Schritte A1–A14).
Diese Seite hält fest, was seitdem gilt, was ich technisch neu entscheide und in welcher Reihenfolge es in den Editor kommt.

## Warum der Einsatz

Heute schaltet ein Maul den Körper auf den alten Maulbau um (`ableitenMitMaul`): ohne glatte Haut, ohne „Umrisse berühren“, ohne
Querschnitt aus der Hülle, ohne Linien exakt, ohne Loops (Loops lösen sich in Knoten auf). Der Einsatz dreht das um: **A0 ist der
Körper ohne Maul — mit allem, was der Körper kann** (glatt, berühren, Hülle, Linien, Loops, Pinsel). Das Maul wird danach in die
einmal verfeinerte Fläche von A0 eingesetzt; außerhalb seines Felds bleibt der Körper bitgleich.

## Stand A1–A7 (Kern, 15./16.10., frisch gemessen 21.10.)

A1 Linie auf A0, A2 exakte Verfeinerung, A3 Feldwahl, A4 Karte, A5 Topologie, A6 Lippe, A7 Haut lösen — alle Tests grün.
Gemessen an 15 ausgeglichenen Fällen (Kugel, Ei, Rex, Langhals, Robbe; Kiefer gleich, zu):

| | Kugel/Ei | Langhals | Rex | Robbe |
|---|---|---|---|---|
| Haut gegen A0 | 0,31–0,49 px | 0,16–0,18 px | 1,8–2,2 px | 3,6–4,0 px |
| Knick (größter, Fläche) | **131–179°** | **158–176°** | **176–179°** | **176–179°** |
| A0 ohne Maul | 2–3° | 6° | 105° (Schnauzenkante) | 18° |

Die Lippe trifft ab m = 10 die Linie auf ≤ 1 px (m = 16: ≤ 0,3 px). **Der Knick sitzt immer am Mundwinkel**: Die Fläche klappt
dort um. Rex und Robbe: Falten bzw. feine Kerben von A0 im Feld gehen verloren.

## Ursache am Mundwinkel und die Entscheidung (technisch, Florian 16.10.: „die Falte dort ist meine Aufgabe“)

Im heutigen Gitter laufen die Hautreihen als Schleifen um den Mund (konzentrisch), jede Reihe wendet am Mundwinkel um 180°.
Am Mundwinkel c liegen deshalb nur **zwei** Hautflächen, die zusammen 360° überdecken müssen (der geschlossene Schlitz hat die
Breite null). Catmull–Clark gibt einem Sektor aus k Flächen von sich aus k · 90° — zwei Flächen sind 180°: Die Fläche faltet
(Biermann/Levin/Zorin 2000). Drei Anläufe am alten Gitter (Ecke, Spitze, Sektorregel) blieben gefaltet oder halb sauber.

**Neu: Der Mundwinkel ist ein regulärer Gitterpunkt am Ende eines Schnitts.** Das Feld wird als zwei Rechtecke vernetzt — über
und unter der Maullinie samt ihrer Verlängerung vom Mundwinkel bis zum Feldrand —, Spalten quer zur Linie, Reihen längs. Die
Lippen sind die beiden Seiten des Schnitts; c hat vier Hautflächen (natürlich 360°), dazu die Tasche. **Vorversuch** (Kissen mit
geschlossenem Schlitz, Catmull–Clark Stufe 3, größter Knick am Schlitzende): c als Faltenpunkt **7,8°**, c als Ecke 20,9°
(zum Vergleich: heutiges Gitter 131–179°). Also c als Faltenpunkt (ohne Punktschärfe); die Spitze der Lippen liegt dann ⅓ Kante
hinter c — die Lippenanpassung legt c so, dass die Grenzlage genau auf dem schwarzen Punkt (Mundwinkel) liegt.

Was das außerdem löst:
- **Lippenauflösung frei vom Feldrand:** m = Spalten bis c; der Rest der Spalten liegt auf der Verlängerung (heute m = E/2, also
  schlechte Gitter bei langen Lippen oder schlechte Lippen bei kleinen Feldern — Befunde A5/A6).
- **Nur Vierecke, unregelmäßige Punkte nur an den Rechteckecken am Feldrand** (wie heute die vier Fünferpole).
- Ober- und Unterseite dürfen verschieden viele Reihen haben (Lippe hoch an der Naht: oben wenige, unten viele).

Was es kostet: Die Reihen laufen nicht mehr als Schleifen um den Mund (das Blender-Muster für Hand-Animation). Unsere Posen
rechnet der Kern (Knochen + Blendshape), Schleifen braucht hier niemand; beim Öffnen dehnt sich das Gitter um c — gemessen in E5.

## Schritte (je Schritt Kern-Test mit Tor, Bilder, Stand hier; was nicht erreicht ist, bleibt als `it.fails` mit Registereintrag)

- **E1 Gitter aus zwei Rechtecken (Kern).** Schnitt verlängern (Pfad vom Mundwinkel zum Feldrand in Richtung der Linie), Karte je
  Hälfte auf ein Rechteck (Tutte, Rand nach Bogenlänge), Topologie neu (Haut, Lippen, Tasche, Rachen; Spiegel und Naht wie heute),
  Lippe (A6) mit Faltenpunkt am Mundwinkel, Haut lösen (A7). **Tor** an den 54 Fällen der Einsatz-Reihe: Knick am Mundwinkel
  ≤ Knick von A0 + 2°, Haut gegen A0 ≤ 0,25 px (wo A0 keine feineren Details trägt als das Gitter), außen bitgleich, Spiegel
  bitgenau, Lippe ≤ 1 px, Viereckgüte ≥ 20° / ≤ 4:1.
- **E2 A0 wie im Editor (Kern).** A0 mit glatter Haut, „berühren mittel“, Querschnitt aus der Hülle, Linien, Loops; Florians
  Ablauf (Startkugel → umformen → Maul). Falten von A0 im Feld (Rex-Schnauzenkante) laufen auf einer Spalte weiter.
- **E3 Bau (Kern).** `maulEinsatzBauen` (`einsatz/einsatz.ts`): eingefrorene Topologie im Dokument (`kaefig.maulEinsatz`),
  schneller Weg für Gesten (feste Matrix, Rückwärtseinsetzen), Zeiten wie der Körper.
- **E4 Editor: geschlossenes Maul.** Schalter „Maul: Einsatz“; der Körper mit Maul hat alle Körperwerkzeuge. → **Dein Blick**
  (zu; Earle-Look, Zebra, Abweichung gegen den Körper ohne Maul).
- **E5 Öffnen.** Tasche lösen (A8), Kiefergewichte und Haps (A11), Fressen und Posen (Teil B) auf dem Einsatz.
- **E6 Rest.** Kiefer getrennt (A9: Über-/Unterbiss), Zähne, Augen, Deskriptoren, Rig, Lippen-px (A13), alter Maulbau
  entfernt; Abnahme (A14).

Du siehst also zuerst das geschlossene Maul auf dem vollen Körper (E4), dann das offene (E5), dann den Rest (E6).

## Risiken

- **Feldform:** Ein schiefes Feld gibt schiefe Rechtecke (Viereckgüte). Die Feldwahl (A3) bleibt, die Ecken der Rechtecke werden
  so gewählt, dass oben und unten gleich viele Spalten liegen; reicht das nicht, kommt die kompakte Feldwahl (Register, Weg 1).
- **Tasche am Mundwinkel:** Innen bilden zwei Taschenflächen einen Sektor von fast 0°; geschlossen verdeckt, offen im Fressen
  sichtbar — in E5 messen.
- **Mäuler ohne Naht** (seitlich) und das Plattenmaul (Tiger-Stern) sind Sonderfälle der Rechtecke (zwei Mundwinkel,
  Platte) — nach E4.
