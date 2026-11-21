# Ozzy, Maul: Etappe 8, Posen

Stand 21.11.2026. Auftrag: Florians Wort „Posen“ zum Konzept
[`2026-11-20-ozzy-maul-zaehne-zunge.md`](2026-11-20-ozzy-maul-zaehne-zunge.md), Abschnitt 4.10 und 9: „Posen: alles in der Pose
bearbeiten (Form, Lippe, Zähne, Zunge), Posen als Tropfen, zwischen zwei Posen ziehen“, Kriterium „ein kleines Maul wird offen
groß und rund“. Sein Wunsch (Abschnitt 0): „In der Pose bearbeite ich alles exakt wie im Basis-Modus/Grundshape … nur mit dem
Unterschied, dass ich keine Punkte oder Linien hinzufügen kann. Die Punkte und Handles wandern in der Editor-Pose von einem Punkt
zum anderen.“ Und vom 15.10.: „dass über die Mischung aus Blendshape und Knochen auch sehr kleine geschlossene Mäuler sehr groß
werden können“.

## 1. Was heute schon geht (Versuch vom 21.11. an „teat firefish“, kein Code geändert)

Die Pose steht seit dem 14.11. im Werk: Eine Pose ist dieselbe Form in einer zweiten Lage (Linien und Haut als Versatz gegen die
Grundform), gerechnet wird in ihrer Ruhe, die Knochen drehen nur die Anzeige. Am Maul als echter Form heißt das:

| Was | Heute |
| --- | --- |
| In „Fressen“ einen Punkt der Form ziehen | geht; die Pose behält ihn; die Grundform bleibt |
| In „Fressen“ einen Punkt der Lippe ziehen | **gesperrt**, solange die Lippen in der Grundform verbunden sind (Meldung „Die Maullinie ziehst du in der Grundform“). Nur die zwei Enden am Umriss gehen (über ihre Kreuzung) |
| Dasselbe nach „Lippen trennen“ | geht: Jede Lippe für sich, die Haut folgt. Aber dann sind die Lippen auch in der Grundform getrennt |
| Ein kleiner Zug an der Lippe (20 Bildpunkte), dann „Fressen“ aus | die Grundform ist dieselbe (Linien 0,00 bewegt), die Pose kommt beim Betreten genau wieder |
| Große Züge an beiden Lippen (46 und 34 Bildpunkte) | **die Grundform ändert sich** (ihre Lippen stehen danach bis 20,6 auseinander, Dellen neben dem Maul). Ursache: Kreuzt eine gezogene Linie in der Pose eine andere, legt das Werk dort eine Kreuzung an; beim Verlassen bekommt die Grundform diesen Punkt, obwohl sich die Linien in ihr nicht kreuzen |
| Zwischen Grundform und Pose | ein Sprung (Knopf „Fressen“); nichts wandert |
| Mehrere Posen | eine („Fressen“) |

## 2. Was er danach kann

1. **In „Fressen“ ist jede Lippe frei.** Oben und unten haben dort ihre eigenen Punkte, auch wenn die Lippen in der Grundform
   verbunden sind (das Maul steht ja offen). In der Grundform gilt weiter ein Punkt für beide Lippen. So wird ein kleines Maul
   offen groß und rund.
2. **Die Grundform bleibt, was auch immer er in der Pose zieht.** In der Pose entstehen keine Punkte, auch keine Kreuzungen von
   selbst.
3. **Posen als Tropfen in einer Reihe:** „Grundform“ und „Fressen“ stehen als zwei Tropfen an einer Haarlinie. Ein Tipp auf einen
   Tropfen fährt dorthin (das Maul geht auf oder zu, die Form wandert mit). **Zwischen den zwei Tropfen gezogen** wandern Haut,
   Punkte und Griffe von der einen Lage zur anderen, die Kiefer drehen anteilig mit: Man sieht die Bewegung, die das Spiel
   später spielt. Losgelassen fährt es zum näheren Tropfen.
4. **Mehrere Posen** (Tropfen „Plus“, jede mit ihren Winkeln, ihrem Versatz und der Lage der Zunge): Scheibe 3, erst auf sein
   Wort, wenn er die ersten zwei gesehen hat.

## 3. Der Weg

### Scheibe 1: In der Pose ist die Lippe frei, und die Grundform bleibt (`form/werk.ts`)

- **Die Lippe der Pose ist die getrennte Lippe.** Beim Betreten der Pose verliert die Kopie der Lippe ihr Zeichen „zusammengeklappt“
  (`maulLinie`), genau wie nach „Lippen trennen“ (Etappe 3, die Probe hält seit dem 20.11.). Die Linie der Grundform behält es;
  beim Verlassen kommt es von dort zurück (`grundLoopsAus`). Die Sperre `maulLinieInPose` gilt damit nur noch dem alten Maul aus
  einer Linie vom 14.11. Formen, die in der Pose gesichert wurden, bekommen es beim Laden gleich.
- **Keine neuen Kreuzungen in der Pose** (`kreuzungenSuchen` tut in der Pose nichts): Die Pose ist dieselbe Form mit denselben
  Punkten. Kreuzen sich dort zwei Linien, liegt die Haut dort übereinander; das sieht er und zieht zurück.
- **Was „getrennt“ heißt, liest die Grundform:** `lippenGetrennt` fragt in der Pose die Linie der Grundform; der Tropfen „Lippen
  trennen“ hängt in der Pose nicht.
- An der Rechnung (Löser, Kern) ändert sich nichts.

### Scheibe 2: Zwischen Grundform und „Fressen“ ziehen (`form/werk.ts`, `ozzy/main.ts`, `ozzy.html`, `ozzy.css`)

- **Ein Anteil der Pose (0 … 1), nur für die Anzeige:** `alsAnzeige` zeigt in der Pose Grundform plus Anteil mal Versatz (Haut,
  Punkte, Griffe, Proben der Linien) und dreht die Knochen um den Anteil ihrer Winkel. Bei 1 ist alles wie heute. Unter 1 wird
  nicht gezogen und nichts gerechnet (reine Anzeige); Zähne und Zunge gehen mit, weil sie an der gezeigten Haut hängen.
- **Die Reihe:** In der Tafel oben rechts stehen statt des Knopfs zwei Tropfen an einer Haarlinie, „Grundform“ und „Fressen“
  (der Tropfen „Fressen“ behält seine Kennung, die Proben tippen ihn weiter an). Dazwischen läuft ein kleiner Tropfen: der Stand.
  Tippen fährt in 0,35 s hin; an der Linie ziehen stellt den Anteil; losgelassen fährt es zum näheren Ende. Bei 0 angekommen
  wird die Pose verlassen. Die zwei Regler „Maul“ und „Kopf“ bleiben vorerst (Liste, Punkt 23).
- Kein Schritt für ⌘Z (wie der Knopf heute).

### Scheibe 3 (auf sein Wort): mehrere Posen

Eine Liste von Posen statt der einen (`pose` bleibt „die gewählte“): Tropfen „Plus“ legt eine an (Kopie der gewählten), Tippen
wählt, Ziehen zwischen zwei Nachbarn wandert; die Lage der Zunge gehört zur Pose (Liste, 112); Sichern und Laden; löschen. Im
Werk müssen dafür die Stellen, die den Versatz der Pose beim Netzwechsel mitführen (drei), alle Posen mitführen. Vorher ein
eigener kleiner Plan.

## 4. Proben (vorab festgelegt)

Neue Fensterprobe `ozzy-maul-posen-fenster.mjs` an „teat firefish“ (Maul geschnitten, Lippen verbunden):

| Nr. | Was | Kriterium |
| --- | --- | --- |
| P1 | In „Fressen“ einen inneren Punkt der Unterlippe 20 Bildpunkte nach unten ziehen | er geht (keine Meldung), sein Zwilling an der Oberlippe bleibt (höchstens 0,05); das Werk kommt zur Ruhe; ein Schritt, ⌘Z nimmt ihn |
| P2 | „Fressen“ aus | die Linien der Grundform höchstens 0,01 bewegt, ihre Lippen liegen aufeinander (höchstens der Haarspalt, 0,06), die Lippe ist wieder zusammengeklappt; die Haut höchstens 0,05 neben der von vorher (gemessen als Abstand zur Fläche, das Netz darf Punkte bekommen haben) |
| P3 | „Fressen“ wieder an | die Linien der Pose wie verlassen (höchstens 0,01) |
| P4 | Das große Maul: alle inneren Punkte der Unterlippe 40 nach unten, der Oberlippe 30 nach oben (dabei kreuzen sich Linien) | keine Linie hat einen Punkt mehr; nach „Fressen“ aus gilt P2 |
| P5 | Zähne an, in der Pose | ihr Netz ist endlich; ein Zahn am gezogenen Punkt steht woanders als vorher |
| P6 | In der Pose: P auf eine Linie, ⌫ auf einen gewählten Punkt | Meldung, nichts ändert sich; „Lippen trennen“ hängt nicht |
| P7 | In der Pose sichern, neu laden | Pose und Grundform wie vorher (Linien höchstens 0,01) |
| P8 | Tempo: der Zug aus P1 | Ozzy rechnet je Bild im Mittel nicht mehr als beim selben Zug an getrennten Lippen heute (höchstens ein Fünftel darüber) |
| Q1 | Die Reihe: Tipp auf „Fressen“, dann auf „Grundform“ | das Maul geht stetig auf und zu (der Anteil wächst von Bild zu Bild); danach Pose an beziehungsweise aus |
| Q2 | An der Linie auf die Hälfte ziehen | ein gezogener Punkt der Lippe steht gezeigt in der Mitte zwischen seinen zwei Lagen (höchstens 5 % daneben), die Kiefer beim halben Winkel; losgelassen fährt es zum näheren Tropfen |
| Q3 | Nach allem Wandern | die Grundform bitgleich, kein Schritt für ⌘Z mehr als vorher |
| Q4 | Tempo beim Wandern | Ozzy rechnet je Bild höchstens 16,7 ms |

Dazu ein Bild: dieselbe Form in der Grundform (kleines Maul, zu) und in „Fressen“ (groß und rund), gleiche Ansicht.
Bestehende Proben, die danach laufen müssen: `ozzy-maul-fenster`, `ozzy-maul-zaehne-fenster`, `ozzy-maul-zunge-fenster`,
`ozzy-maul-sichern-fenster`, `ozzy-maul-zahnform-fenster`, `ozzy-maul-pose-fenster` (das geformte Maul vom 16.11.); Tests
`src/form/`, `src/ozzy/`; Typen.

## 5. Was bewusst nicht dazugehört

- **Zähne je Pose:** Ihre Werte gelten für alle Lagen; in der Pose gehen sie mit der Haut mit. Einen Zahn nur in der Pose rücken
  gibt es nicht.
- **Beide Seiten frei in der Pose** (Plan vom 12.11., Schritt 5, Etappe 4): Die Pose bleibt gespiegelt.
- **Backen** fürs Spiel (Etappe 9).
- Der Rechenkern (`packages/shape`) bleibt unberührt.
