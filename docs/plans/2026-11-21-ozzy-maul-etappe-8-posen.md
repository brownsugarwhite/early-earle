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
- **Neue Punkte des Netzes nehmen ihren Platz in die andere Lage mit** (beim Bauen dazugekommen, `form/zweiteLage.ts`): Pose und
  Grundform teilen ihr Netz. Wuchs es in der Pose, bekam ein neuer Punkt in der Grundform bisher den Ort der Pose minus den
  gemittelten Versatz seiner Nachbarn. An den Lippen eines weit geöffneten Mauls ändert sich der Versatz von Punkt zu Punkt
  stark: Gemessen lagen neue Punkte nach dem großen Maul bis 11,6 neben ihrer Stelle, die gezeigte Haut der Grundform bis 3,7
  neben der von vorher. Jetzt nimmt ein neuer Punkt seinen Platz im alten Dreieck mit und liegt in der anderen Lage auf deren
  runder Fläche (so genau, wie das Verdichten selbst seine Punkte legt); wo beide Lagen deckungsgleich sind, teilt er den Versatz
  genau. Dasselbe gilt in der Gegenrichtung (das Netz wächst in der Grundform, die Pose bleibt).
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
| P2 | „Fressen“ aus | die Linien der Grundform höchstens 0,01 bewegt, ihre Lippen liegen aufeinander (höchstens der Haarspalt, 0,06), die Lippe ist wieder zusammengeklappt; die gezeigte Haut höchstens 1 neben der von vorher und an höchstens 1 % ihrer Proben mehr als 0,05; in der freien Haut kein Dreieck mehr umgeschlagen. **Berichtigt am 21.11.:** Zuerst stand hier „die Haut höchstens 0,05 neben der von vorher“. Das hält kein gemeinsames Netz: Es richtet sich nach der Lage, in der gearbeitet wird; legt es in der Pose Punkte zusammen, fehlen sie auch der Grundform, und ihre Fläche weicht dort um die Feinheit ab, die das Netz ohnehin hat (ein Sechzehntel der Startkante, rund 0,9). Gemessen wird darum an dem, was er sieht |
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

## 6. Ergebnis (21.11.)

Gebaut sind Scheibe 1 und Scheibe 2 (Commits `1aaa91ff`, `645acb6e`). Scheibe 3 (mehrere Posen) wartet auf sein Wort.
Bild: [`docs/progress/ozzy/2026-11-21-maul-etappe8-posen.jpg`](../progress/ozzy/2026-11-21-maul-etappe8-posen.jpg).

**Was er jetzt kann**

- In „Fressen“ zieht er jeden Punkt und jede Richtung der Ober- und der Unterlippe für sich, auch wenn die Lippen in der
  Grundform verbunden sind. Die Grundform behält dabei ihre Linien genau (0,000) und ihre zusammengeklappte Lippe.
- Oben rechts stehen „Grundform“ und „Fressen“ als zwei Tropfen an einem Faden. Ein Tipp fährt hin (rund eine Drittelsekunde),
  am Faden gezogen wandern Haut, Punkte, Griffe, Kiefer, Zähne und das getönte Papier mit dem Zeiger; losgelassen fährt es zum
  näheren Tropfen. Ein Tipp auf „Fressen“ in der Pose führt wie bisher zurück.

**Beim Bauen dazugekommen**

- `form/zweiteLage.ts`: Neue Punkte des Netzes nehmen ihren Platz in die andere Lage mit (Abschnitt 3, Scheibe 1). Gegenprobe
  mit der Regel von vorher: Nach dem großen Maul lag die gezeigte Haut der Grundform 2,9 bis 3,7 neben der von vorher (1,4 % der
  Proben über 0,05), jetzt 0,6 (0,4 %).
- Die Anzeige behält beim Betreten und Verlassen der Pose ihren Plan: das lange Bild beim Eintritt 48 statt 81 ms. Geprüft im
  Bild: Pose und Grundform sind Bildpunkt für Bildpunkt gleich, ob der Plan bleibt oder neu angelegt wird.

**Proben** (`ozzy-maul-posen-fenster.mjs`, an „teat firefish“, alle erfüllt)

| Nr. | Gemessen |
| --- | --- |
| P1 | Punkt 2 der Unterlippe ging 21,9, sein Zwilling 0,000; ein Schritt, ⌘Z nimmt ihn genau |
| P2 | Linien 0,000; Paare 0,050; zusammengeklappt; gezeigte Haut höchstens 0,27 neben vorher (0,06 % der Proben über 0,05) |
| P3 | Linien der Pose 0,000 neben dem Stand beim Verlassen |
| P4 | keine Linie hat einen Punkt mehr; Linien 0,000; gezeigte Haut höchstens 0,59 (0,4 %); in der freien Haut nichts umgeschlagen (zwischen Linien 6, siehe Liste 155) |
| P5 | 23 Zähne; ein Lippenpunkt lässt sich bei geschlossener Linse greifen (17,5), der weiteste Zahnfuß geht 13,6 Bildpunkte mit |
| P6 | P und ⌫ ändern nichts und melden es; „Lippen trennen“ hängt nicht |
| P7 | gesichert und geladen: Pose an, Linien beider Lagen 0,000 |
| P8 | Zug an der Lippe: Grundform 13,9 bis 16,9 ms, Pose 18,0 bis 21,8 ms je Bild (das Kriterium hält knapp; Liste 156) |
| Q1 | auf und zu je 15 bis 17 Bilder unterwegs, größter Schritt 0,07 bis 0,12 |
| Q2 | am Faden: Anteil 0,500, Maul 21,0° von 42,0°; ein gezogener Punkt fern vom Maul steht 0,0 % neben der Mitte; bei 0,3 losgelassen Grundform, bei 0,72 Pose |
| Q3 | Grundform nach allem Wandern bitgleich; kein Schritt mehr |
| Q4 | unterwegs im Mittel 9,4 bis 12,0 ms je Bild; das Bild des Eintritts 24 bis 45 ms |

Dazu laufen weiter: die neun Proben am Maul (`ozzy-maul-fenster`, `-pose-`, `-sichern-`, `-zaehne-`, `-zunge-`, `-farbe-`,
`-lippe-`, `-material-`, `-zahnform-`: 120 Kriterien), `ozzy-zurueck-haut-`, `-bearbeiten-`, `-p-schnitt-`, `-zeiger-`, `-zuege-`,
`-felder-fenster` und 123 Tests (`src/form/`, `src/ozzy/`). `ozzy-farbe-fenster` hält zwei Kriterien nicht, mit und ohne die
Änderungen dieser Etappe gleich (Liste 166).

**Was an den Kriterien berichtigt wurde**

- P2 und P4: „Haut höchstens 0,05“ ist durch das Maß an der gezeigten Haut ersetzt (oben in der Tabelle begründet).
- Q2: Der Punkt, der „in der Mitte seiner zwei Lagen“ stehen soll, ist einer fern vom Maul. Ein Punkt der Lippe dreht mit dem
  Kiefer; er steht beim halben Winkel, nicht in der Mitte der Geraden.
- Q4 wertet die Bilder unterwegs; das Bild des Eintritts in die Pose steht für sich daneben.

**Was nicht gezeigt ist**

Ob ein kleines Maul damit „groß und rund“ wird. Meine Züge in Probe und Bild sind grob (einzelne Punkte 20 bis 40 Bildpunkte),
und was dem Bild am meisten im Weg steht, sind die Kiefer aus Etappe 2 (Liste 20 bis 22): Der Unterkiefer klappt als dünner
Lappen ab, und am Ende seiner Reichweite steht in der Seite eine Stufe. Das entscheidet sein Versuch an seiner Form.

**Offen:** Liste, Punkte 153 bis 166.

## 7. Scheibe 3: mehrere Posen (Plan, 21.11.)

Sein Wort vom 21.11.: „erstmal mehrere posen. … Kiefer richten und feinschliff kommen dann zum schluss.“ Konzept 4.10: „Die Posen
stehen als Tropfen in einer Reihe (Grundform, Fressen, Plus); zwischen zwei Tropfen gezogen, wandern Punkte und Griffe von der
einen Lage zur anderen.“ Gespeichert wird je Pose, was heute die eine Pose trägt: die Winkel der zwei Kiefer und der Versatz
jedes Punkts und Griffs gegen die Grundform; dazu ihr Name und die Lage der Zunge (Liste, 112).

### 7.1 Was er danach kann

1. **Plus:** Am Ende der Reihe hängt ein kleiner Tropfen „+“. Ein Tipp legt eine Pose an: eine Kopie dessen, was er gerade sieht
   (in einer Pose: diese Pose mit Winkeln und Form; in der Grundform: die Grundform, das Maul zu). Sie ist gleich gewählt und
   heißt „Pose 2“, „Pose 3“ …
2. **Wählen:** Ein Tipp auf einen Tropfen fährt dorthin, von der Grundform aus oder direkt von einer anderen Pose (ohne Umweg
   über die Grundform). Ein Tipp auf die gewählte Pose führt wie bisher zurück in die Grundform.
3. **Wandern:** Zwischen je zwei benachbarten Tropfen hängt ein Faden. Am Faden gezogen wandert die Form zwischen diesen zwei
   Lagen: Haut, Punkte, Griffe und die Winkel der Kiefer. Losgelassen fährt sie zum näheren Tropfen.
4. **Benennen:** Einen Tropfen gedrückt halten (ohne zu ziehen): Sein Name wird ein Feld zum Schreiben; ↩ übernimmt, Esc
   verwirft. „Grundform“ heißt immer so.
5. **Löschen:** Den Tropfen einer Pose auf den Mülleimer der Leiste ziehen (wie eine Farbe). Eine Pose bleibt immer.
6. **⌘Z** nimmt Anlegen, Löschen und Benennen zurück (je ein Schritt). Wählen und Wandern sind keine Schritte.
7. **Sichern und Laden** tragen alle Posen und welche gewählt ist. Eine Datei von vorher hat eine Pose („Fressen“).
8. Die zwei Regler, die Tropfen der Kiefer und der Blick ins Maul gelten der gewählten Pose; die Zunge bleibt je Pose liegen,
   wohin sie dort gezogen wurde.

### 7.2 Der Weg

- **Werk (`form/werk.ts`):** `posen` (alle Posen der Form in der Reihenfolge der Reihe); `pose` bleibt „die gewählte“ und ist
  eine von ihnen. `PoseStand` bekommt `name` und `zunge`. Handgriffe: `poseAnlegen`, `poseWaehlen`, `poseWechseln` (von der
  betretenen Pose in eine andere), `poseLoeschen`, `poseBenennen`. Der Schritt für ⌘Z und der Stand für die Datei tragen alle
  Posen (`Schnappschuss.posen`, `WesenStand.posen`, `poseNr`; `pose` bleibt darin die gewählte, damit ältere Stände und das
  Prüffenster weiter lesen).
- **Alle Posen gehen mit dem Netz mit:** `netzGewachsen` führt den Versatz jeder Pose nach, nicht nur den der gewählten; neue
  Punkte liegen in jeder Lage auf deren runder Fläche (`zweiteLage.ts`, wie in Scheibe 1).
- **Die Anzeige zwischen zwei Posen:** Neben dem Anteil zwischen Grundform und Pose (`poseAnteil`) gibt es ein Ziel
  (`poseZiel`: eine andere Pose und wie weit die Anzeige schon dort ist). `alsAnzeige` mischt dann die Ruhe der betretenen Pose
  mit der Lage der anderen (Grundform plus deren Versatz; ihre Linien wie beim Betreten), die Winkel der Kiefer anteilig. Am
  Ziel angekommen wechselt das Werk die Pose (`poseWechseln`). Unterwegs wird nicht gegriffen.
- **Die Reihe (`ozzy/main.ts`, `ozzy.html`, `ozzy.css`):** aus den Posen des Werks gebaut (der erste Tropfen behält die Kennung
  `#fressen-knopf`); ein Faden je Nachbarpaar, ein Tropfen für den Stand, der längs der Reihe läuft; Plus; Halten zum
  Benennen; Ziehen eines Tropfens zum Mülleimer.
- Am Rechenkern (`packages/shape`) ändert sich nichts.

### 7.3 Proben (vorab festgelegt)

Neue Fensterprobe `ozzy-maul-posen-reihe-fenster.mjs` an „teat firefish“ (Maul geschnitten, eingerastete Seite):

| Nr. | Was | Kriterium |
| --- | --- | --- |
| R1 | In „Fressen“ auf Plus | eine zweite Pose „Pose 2“ ist gewählt; gezeigte Haut und Winkel wie in „Fressen“ (Haut höchstens 0,01 anders); ein Schritt, ⌘Z nimmt sie, die Reihe zeigt wieder zwei Tropfen |
| R2 | In Pose 2 einen Punkt der Lippe ziehen und den Unterkiefer weiter öffnen; dann „Fressen“, dann Grundform | „Fressen“ hat seine Linien (höchstens 0,01) und seine Winkel behalten; die Grundform ihre Linien (höchstens 0,01) |
| R3 | Aus „Fressen“ ein Tipp auf Pose 2 | die Fahrt geht direkt: Der Winkel des Mauls läuft stetig vom einen zum anderen Wert und verlässt den Bereich dazwischen nie (kein Umweg über „zu“); danach ist Pose 2 gewählt, ihre Linien wie verlassen (höchstens 0,01) |
| R4 | Am Faden zwischen „Fressen“ und Pose 2 auf die Hälfte | der Winkel des Mauls ist das Mittel beider Posen (höchstens 0,5°), ein in Pose 2 gezogener Punkt fern vom Maul steht in der Mitte seiner zwei Lagen (höchstens 5 % des Wegs); unter der Hälfte losgelassen „Fressen“, darüber Pose 2 |
| R5 | In Pose 2 das Maul weit formen (das Netz wächst), zurück | „Fressen“ und die Grundform: Linien höchstens 0,01; die gezeigte Haut beider höchstens 1 neben vorher, höchstens 1 % der Proben über 0,05 |
| R6 | Pose 2 halten, „Gähnen“ schreiben, ↩ | der Tropfen heißt so; ein Schritt, ⌘Z gibt „Pose 2“ zurück |
| R7 | Sichern, neu laden | zwei Posen mit ihren Namen, Winkeln und Linien (höchstens 0,01); die gewählte ist gewählt |
| R8 | Den Tropfen der zweiten Pose auf den Mülleimer ziehen | eine Pose bleibt, die Form steht in der Grundform; ⌘Z bringt die Pose wieder (Linien höchstens 0,01); die letzte Pose lässt sich nicht löschen |
| R9 | Tempo: die Fahrt zwischen zwei Posen | Ozzy rechnet unterwegs je Bild im Mittel höchstens 16,7 ms |

Bestehende Proben, die danach laufen müssen: `ozzy-maul-posen-fenster` (P1 bis P8, Q1 bis Q4), `ozzy-maul-fenster`,
`-sichern-`, `-zunge-`, `-zaehne-`, `-pose-fenster`; Tests `src/form/`, `src/ozzy/`; Typen.

### 7.4 Was bewusst nicht dazugehört

- **Zähne je Pose** (ihre Werte gelten für alle Lagen), Posen umordnen, drei Posen zugleich mischen.
- **Die Kiefer** (Liste 20 bis 22) und der Feinschliff: nach seinem Wort zum Schluss, zusammen mit seinem Feedback.
- Das Maul aus der schmalen Form (vor dem 14.11.) behält seine eine Pose.

### 7.5 Ergebnis (21.11.)

Gebaut (Commit `6a3454af`). Bild:
[`docs/progress/ozzy/2026-11-21-maul-etappe8-mehrere-posen.jpg`](../progress/ozzy/2026-11-21-maul-etappe8-mehrere-posen.jpg).

**Was er jetzt kann:** alles aus 7.1. In der Tafel oben rechts stehen die Grundform und jede Pose als Tropfen, dazwischen je
ein Faden, am Ende ein kleines Plus. Plus legt eine Pose an (eine Kopie dessen, was er sieht), ein Tipp fährt direkt von Pose
zu Pose, am Faden zwischen zwei Posen wandert die Form, Halten benennt, auf den Mülleimer gezogen ist eine Pose weg.

**Proben** (`ozzy-maul-posen-reihe-fenster.mjs`, an „teat firefish“, alle erfüllt)

| Nr. | Gemessen |
| --- | --- |
| R1 | „Pose 2“ gewählt, gezeigte Haut 0,000 anders als „Fressen“, Winkel gleich; ein Schritt, ⌘Z nimmt sie |
| R2 | Pose 2 geformt (Linien bis 32,9 anders, Maul 50°): „Fressen“ Linien 0,000 und 34°/8°, Grundform Linien 0,000 |
| R3 | das Maul läuft von 42,0° nach 58,0° in 18 Bildern, nie darunter (größter Schritt 1,3°); danach Pose 2, Linien 0,000 |
| R4 | am Faden: Anteil 0,500, Maul 50,0° (das Mittel), der ferne Punkt 0,0 % neben der Mitte; bei 0,3 losgelassen „Fressen“, bei 0,72 Pose 2 |
| R5 | Netz 11 698 → 11 890 Punkte (zweiter Lauf 11 878): „Fressen“ Linien 0,000, gezeigte Haut höchstens 0,79 (zweiter Lauf 0,83; 0,65 und 0,70 % der Proben über 0,05); Grundform 0,000 und 0,79 (0,82; je 0,61 %) |
| R6 | „Gähnen“ steht am Tropfen; ein Schritt, ⌘Z gibt „Pose 2“ zurück |
| R7 | geladen: Fressen, Gähnen; gewählt die zweite, Pose an; Winkel 34/8 und 50/8; Linien aller drei Lagen 0,000 |
| R8 | nach dem Mülleimer: „Fressen“, Grundform; ⌘Z bringt „Gähnen“ zurück (Linien 0,000); die letzte Pose bleibt („Eine Pose bleibt immer“) |
| R9 | unterwegs im Mittel 9,4 ms je Bild, das langsamste 24,9 ms (zweiter Lauf 10,7 und 26,3 ms) |

Die zwei Läufe unterscheiden sich in R5 und R9, weil das Netz je nach Takt der Bilder an anderen Stellen wächst.

Dazu laufen weiter: `ozzy-maul-posen-fenster` (P1 bis P8, Q1 bis Q4), `ozzy-maul-fenster`, `-sichern-`, `-zunge-`, `-zaehne-`,
`-pose-`, `-lippe-fenster`, `ozzy-zurueck-haut-`, `-bearbeiten-`, `-zuege-fenster` und 123 Tests. `ozzy-maul-zahnform-fenster`
hält alles bis auf sein Tempo (G10) bei hoher Last des Rechners; direkt gegen den Stand vor dieser Scheibe gemessen ist es gleich
(9,0 ms vorher, 8,5 ms jetzt je Bild). Die Lage der Zunge je Pose ist von Hand im Skript geprüft (in „Fressen“ abgelegt, Plus
nimmt sie mit, in Pose 2 gelöst, „Fressen“ behält seine).

**Für ihn entschieden (sein Urteil steht aus):** Eine neue Pose ist eine Kopie dessen, was zu sehen ist (in der Grundform: das
Maul zu). Sie heißt „Pose 2“ … und steht am Ende der Reihe. Ein Tipp auf die gewählte Pose führt zurück in die Grundform.
Benennen durch Halten, Löschen über den Mülleimer der Leiste. Höchstens acht Posen.

**Offen:** Liste, Punkte 167 bis 176.

## 8. Scheibe 4: Zähne je Pose (21.11., auf sein „Zähne je Pose“)

Konzept 4.10: „Gespeichert wird je Pose: die Winkel der Knochen und der Versatz jedes Punkts und Griffs gegen die Grundform. Neu
ist nur, was dazukommt: die Punkte der Lippenlinie, die Lage jedes Zahns, die Kette der Zunge.“ Die Lippe und die Zunge sind
gebaut; die Zähne gelten bisher für alle Lagen gleich (Liste, 162).

### 8.1 Was er danach kann

- **In einer Pose stellt die Linse die Zähne dieser Pose:** Größe, Neigung, Verlauf und Sitz der Reihen, dazu einzelne Zähne
  rücken und ihre Größe. Die Grundform und die anderen Posen behalten ihre.
- **In der Grundform gestellt gilt es für alle Posen.** Jede Pose behält, was sie anders hat (ein Versatz, wie bei den Punkten
  der Form: Wird die Reihe in der Grundform größer, wird sie es in jeder Pose um dasselbe).
- **Was die Zähne sind, gilt für alle Posen,** auch wenn es in einer Pose gestellt wird: Anzahl, Lücken (⌫), Form (Vorlage und
  eigene Form) und Farbe. Das ist die Regel der Posen („dieselbe Form in einer anderen Lage, mit denselben Punkten und
  Linien“); gesperrt wird dabei nichts, die Statuszeile sagt, wofür der Griff gilt.
- **Zwischen zwei Lagen wandern die Zähne:** von dort, wo sie in der einen stehen, dorthin, wo sie in der anderen stehen. Beim
  Ankommen springt nichts.
- Plus nimmt die Zähne der gezeigten Pose mit; ⌘Z, Sichern und Laden tragen sie.

### 8.2 Struktur

- **Modell:** `PoseStand.zaehne` ist der Versatz der Pose gegen die Zähne der Grundform (`G.maul.zaehne`): je Reihe vier
  Zahlen (Größe, Neigung, Verlauf, Sitz), je Zahn drei (längs, zur Tiefe, Faktor der Größe). Drei reine Handgriffe in
  `form/zahnVersatz.ts`: Grundform plus Versatz; das, was die Linse in einer Pose stellt, teilen in „für alle“ und „nur
  hier“; den Versatz passend halten, wenn eine Reihe andere Zähne bekommt (mit der Anzahl fällt, was einzelne Zähne anders
  hatten, in jeder Pose).
- **Werk:** `zaehneJetzt()` (was die Linse zeigt und stellt: in der betretenen Pose ihre Zähne, sonst die der Grundform);
  `zaehneSetzen` teilt in der Pose; `zaehneGezeigt()` nennt der Anzeige eine Lage oder zwei mit dem Anteil.
- **Anzeige:** Die Plätze der Zähne werden je Lage in ihrer Ruhe gelesen (wie bisher für die betretene). Beim Wandern stehen
  beide Sätze an der gezeigten Haut, und jeder Punkt jedes Zahns liegt anteilig dazwischen. Das gilt auch für Lagen mit
  denselben Werten: Die Plätze hängen an der Lippe der Lage, bisher wechselten sie erst beim Ankommen.
- Am Rechenkern ändert sich nichts.

### 8.3 Proben (vorher festgelegt; `ozzy-maul-posen-zaehne-fenster.mjs`, an „teat firefish“)

| Nr. | Kriterium |
| --- | --- |
| Z1 | In „Fressen“ die Größe der Zähne gestellt: Die Zähne dort sind länger; die Werte der Grundform und einer zweiten Pose sind dieselben wie vorher. Ein Schritt, ⌘Z nimmt ihn. |
| Z2 | In der Grundform die Neigung gestellt: Sie gilt in allen Posen; „Fressen“ behält dazu seinen Unterschied der Größe (auf 1e-9). |
| Z3 | In einer Pose die Anzahl gestellt: Sie gilt in der Grundform und in jeder Pose; die Statuszeile sagt es. |
| Z4 | In der zweiten Pose einen Zahn gerückt: nur dort; in „Fressen“ steht er an seinem Platz (Werte gleich, Spitze höchstens 0,01 daneben). |
| Z5 | Am Faden zwischen zwei Posen mit verschiedenen Zähnen auf der Hälfte: Die Spitze eines Zahns liegt höchstens 5 % ihres Wegs neben der Mitte ihrer zwei Lagen. Beim Ankommen: letztes Bild der Fahrt und Stand danach höchstens 0,05 auseinander (größter Abstand über alle Punkte der Zähne). |
| Z6 | Plus in einer Pose mit eigenen Zähnen: Die neue Pose hat dieselben Werte. |
| Z7 | Gesichert und geladen: jede Pose mit ihren Zähnen (Werte gleich). |
| Z8 | Tempo: die Fahrt zwischen zwei Posen mit verschiedenen Zähnen im Mittel höchstens 16,7 ms je Bild. |
| K | keine Fehler in der Konsole |

Dazu Tests für `zahnVersatz.ts` (hin und zurück ohne Rest; für alle und nur hier; die Anzahl lässt den Versatz einzelner
Zähne fallen), und die Proben der Zähne, der Zahnform, der Zunge und der Posen laufen weiter.

### 8.4 Nicht in dieser Scheibe

Eine andere Form oder Farbe der Zähne je Pose; Zähne, die es nur in einer Pose gibt; ein Handgriff „Zähne dieser Pose wie in
der Grundform“. Kommt auf die Liste.

### 8.5 Ergebnis (21.11.)

Gebaut (Commits `c53b706c`, `e01f6cba`, `43ee7a54`). Bild:
[`docs/progress/ozzy/2026-11-21-maul-etappe8-zaehne-je-pose.jpg`](../progress/ozzy/2026-11-21-maul-etappe8-zaehne-je-pose.jpg).

**Was er jetzt kann:** alles aus 8.1. Dazu sagt die Linse beim Wechsel der Lage kurz, wessen Zähne sie zeigt („Fressen“,
„Grundform“), und die Statuszeile sagt bei jedem Griff, wofür er gilt.

**Beim Bau gefunden und behoben:** Hält die Linse das Maul der Grundform offen, klappte es bei jedem Wechsel zwischen Grundform
und Pose erst zu (von 42° auf 0°) und ging dann wieder auf, seit Scheibe 2. Das ist der Ablauf, mit dem man Zähne je Pose
stellt. Jetzt zählt der Anteil der Pose vom Blick ins Maul aus (`werk.offenAnteil`): Das Maul bleibt offen, es wandern nur
Form und Zähne. Dafür kam Z9 dazu (nicht vorher festgelegt).

**Proben** (`ozzy-maul-posen-zaehne-fenster.mjs`, an „teat firefish“, alle erfüllt; die Werte des vierten von fünf Läufen)

| Nr. | Gemessen |
| --- | --- |
| Z1 | Größe in „Fressen“ 0,920 → 1,090 (längster Zahn 30,3 → 35,9); Grundform 0,920, Pose 2 0,920; Statuszeile „Zähne: gilt in „Fressen“ …“; ein Schritt, nach ⌘Z 0,920 |
| Z2 | Neigung 0,120 → 0,230 in der Grundform, in „Fressen“ und Pose 2 0,230; die Größe in „Fressen“ bleibt 0,170 über der Grundform |
| Z3 | Anzahl oben 12 → 13 in Pose 2; Grundform 13/12, „Fressen“ 13/12; Statuszeile „Zähne: Anzahl, Lücken, Form und Farbe gelten für alle Posen“ |
| Z4 | Zahn 1 mit Spiegelbild 11 im Bild gewählt und gezogen: Versatz in Pose 2 längs 0,154 (Spiegelbild gleich), seine Spitze rückt 16,0; ein Schritt; Grundform ohne eigene Zähne; „Fressen“: Werte gleich, Punkte der Zähne 0,000 neben vorher |
| Z5 | am Faden: Anteile 1 / 0,500 / 0; die Spitze (16,25 zwischen den Posen) 0,0 % neben der Mitte; am Anfang gehalten 0,000 neben Pose 2, am Ende 0,000 neben „Fressen“, beim Ankommen 0,000 (die zwei Posen selbst liegen bis 46,9 auseinander) |
| Z6 | Plus in „Fressen“: die neue Pose hat dieselben Werte (Größe 1,090; Grundform 0,920) |
| Z7 | geladen: Grundform gleich, Zähne je Pose gleich (beide mit Versatz), die gewählte Pose gewählt |
| Z8 | 104 Bilder unterwegs: im Mittel 11,9 ms, Median 12,5 ms, das langsamste 38,1 ms (die anderen Läufe: 11,8 · 10,6 · mit gewähltem Zahn vor dem Griff an den Marken 15,0 · danach 12,9 ms) |
| Z9 | bei offener Linse: zur Grundform 79 Bilder, kleinster Wert 42,0°; wieder hinein 82 Bilder, kleinster Wert 42,0° („Fressen“ steht 42,0° offen); die Linse sagt „Grundform“, dann „Fressen“ |

Z4 setzte den Versatz zuerst über den Haken der Probe; im letzten Stand wählt und zieht die Probe den Zahn mit dem Zeiger.
Dabei fiel Z8 von 11 auf 15 ms: Die zwei Marken am gewählten Zahn ließen je Bild die ganze Haut neu drehen
(`werkHautTreffen`). Sie nutzen jetzt die Lagen, mit denen die Zähne gebaut sind.

Dazu laufen weiter (alle erfüllt): `ozzy-maul-posen-fenster` (15), `ozzy-maul-posen-reihe-fenster` (R1 bis R9),
`ozzy-maul-fenster` (19), `-zaehne-` (27), `-zahnform-` (12), `-zunge-` (28), `-pose-` (6), `-sichern-` (5), `-lippe-` (12),
`-farbe-fenster` (8); `npx vitest run src/form/ src/ozzy/` (139 Tests, davon 16 neu), Typen, Lint der geänderten Dateien.

**Für ihn entschieden (sein Urteil steht aus):**

- Eine Pose kann anders haben, wie die Zähne stehen und wie groß sie sind (Größe, Neigung, Verlauf, Sitz; gerückte Zähne, die
  Größe eines Zahns). Was die Zähne sind (Anzahl, Lücken, Form, Farbe), gilt für alle Posen.
- In einer Pose gestellt gilt „was die Zähne sind“ trotzdem, für alle Posen; gesperrt ist nichts.
- Der Unterschied einer Pose wird dazugezählt (ein Versatz, wie bei den Punkten der Form), nicht festgehalten.

**Offen:** Liste, Punkte 177 bis 186.

