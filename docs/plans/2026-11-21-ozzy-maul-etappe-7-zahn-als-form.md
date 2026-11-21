# Ozzy, Maul: Etappe 7, ein Zahn als kleine Form

Stand 21.11.2026. Auftrag: Florians Wort „Etappe 7“ zum Konzept
[`2026-11-20-ozzy-maul-zaehne-zunge.md`](2026-11-20-ozzy-maul-zaehne-zunge.md) (dort Abschnitt 9, Zeile 8, und 12.4):
„Ein Zahn als kleine Form: in der Linse mit Linien und Punkten frei formen“, Kriterium „ein Zahn, den keine Vorlage kann“.
Sein Wunsch dazu (Abschnitt 0): „Ich kann hier den Zahn separat bearbeiten.“ Und 4.7: „In einer späteren Etappe trägt er dort
seine eigenen Linien und Punkte, und die gewohnten Werkzeuge gelten in der Linse.“

## 1. Was er danach kann

1. **Jeder Zahn in der Linse trägt drei Linien:** seine Linie von vorn, seine Linie von der Seite und die Linie quer, an der er aus
   dem Zahnfleisch tritt. Das ist der Anfang jeder Form in Ozzy im Kleinen (Silhouette, Loop längs, Loop quer); die Linien teilen
   sich sechs Punkte: die Spitze und vier Punkte am Zahnfleisch (links, rechts, vorn, hinten).
2. **Die Linse rastet ein wie Ozzy:** Wer den Zahn von Hand nahe an „von vorn“, „von der Seite“ oder „von oben“ dreht, dem rastet er
   ein (die Kamera wird schmal, wie beim Einrasten der Form). Ein Tipp auf eine Linie dreht den Zahn in ihre Ansicht.
3. **Eingerastet trägt die Linie dieser Ansicht ihre Punkte**, und es gilt dasselbe Verhalten wie an der Form (dieselbe Rechnung,
   `linien/verhalten.ts`, kein Nachbau): Punkt ziehen, die Linie zwischen zwei Punkten ziehen, Richtung drehen (⌥ knickt,
   Doppelklick schaltet Knick und rund), mit P einen Punkt auf die Linie setzen, ⌫ löscht gewählte Punkte.
4. **Was er ändert, gilt dem, was gewählt ist** (wie Vorlage und Größe heute): beiden Reihen, einer Reihe, oder einem Zahn mit
   seinem Spiegelbild. Die Zähne im Maul gehen sofort mit. Je Griff ein Schritt für ⌘Z.
5. **Am Formenring steht die eigene Form als neuntes Zeichen** (ihr Umriss). Die acht Vorlagen bleiben; wer zu einer Vorlage dreht
   und zurück, hat seine Form noch.

## 2. Der Weg

### 2.1 Die Form eines Zahns aus drei Linien (`ozzy/zahnGestalt.ts`, ohne DOM, mit Tests)

- `ZahnGestalt`: `vorn` (offene Linie in x und y: Zahnfleisch links, Spitze, Zahnfleisch rechts), `seite` (offen in z und y: hinten,
  Spitze, vorn), `quer` (geschlossen in x und z, durch die vier Punkte am Zahnfleisch). Anker wie im Bleistift-Kern (`Anker` aus
  `@ee/shape/zeichnen`: Lage, zwei Griffe, Ecke). Dazu, was die Linien nicht tragen und von der Vorlage bleibt: Höcker, Wurzel.
- **Die Haut zwischen den Linien:** Die vier Hälften (links, rechts, vorn, hinten) laufen vom Zahnfleisch zur Spitze. Ein Ring geht
  durch die vier Stellen gleichen Fortschritts (Fortschritt = gestiegene Höhe plus ein kleiner Anteil des Wegs: Ringe folgen der
  Höhe, flache Kuppen bekommen trotzdem Ringe). Er ist das Bild der Linie quer: in x zwischen links und rechts, in z zwischen hinten
  und vorn gespannt, in der Höhe durch die vier Stellen gelegt. So liegen alle drei Linien genau auf der Haut. Überhänge, Haken und
  Zacken auf einer Linie gehen (anders als bei einem Stapel waagerechter Scheiben).
- **Jede Vorlage als Linien** (`gestaltAusForm`): die vier Hälften und der Querschnitt der Vorlage abgetastet und mit den wenigsten
  Ankern angepasst (`anpassen` aus dem Bleistift-Kern, nur gelesen).
- **Netz:** für das Maul dieselbe Zahl Punkte und Dreiecke wie eine Vorlage (16 Ringe mal 20, zwei Deckel): Das Greifen der Zähne
  und der weiche Wechsel bleiben. Für die Linse ein feineres.

### 2.2 Wo die eigene Form steht (`form/werk.ts`, `form/ablage.ts`, `ozzy/zaehne.ts`)

- An der Reihe und am einzelnen Zahn: `gestalt?` neben `form`; `form = EIGENE` heißt „die eigene Form gilt“. Ein Zahn ohne eigene
  erbt die seiner Reihe. Die eigene Form bleibt stehen, wenn eine Vorlage gilt (zurückdrehen holt sie wieder). Werte werden nie am
  Ort geändert (die Schritte für ⌘Z teilen sie sich); Sichern und Laden tragen sie mit.
- `zahnPlaetze` gibt jedem Platz seine Gestalt mit; `zaehneNetz` und `zahnKapseln` nehmen ihr Netz (je Gestalt einmal gebaut).
- Das Spiegelbild und beide Kiefer brauchen keine Regel: Die Achsen des Zahns heißen überall gleich (x nach hinten, z zur Lippe).

### 2.3 Die Linse (`maulstudie/linse.ts`, `linse.css`) und Ozzy (`ozzy/main.ts`)

- Einrasten nach dem Drehen von Hand (unter 9° wie in Ozzy), Kamera schmal (Dolly-Zoom), von oben größer gestellt.
- Über dem Bild liegt eine zweite Leinwand mit der flüssigen Anzeige (`linien/fluessig.ts`) und einem eigenen `Verhalten` in 2D:
  Das Netz ist die Linie der Ansicht in Bildpunkten der Linse. Nach jedem Bild wird das Netz zurückgelesen; hat es sich geändert,
  wird die Gestalt gesetzt. Die Punkte am Zahnfleisch bleiben auf seiner Linie, die geteilten Punkte nehmen ihre zweite Linie mit.
  Dafür bekommt `Verhalten` einen kleinen Haken (`halten`), der in 2D nach jedem Zug gerufen wird; ohne ihn bleibt alles wie es ist.
- Die anderen zwei Linien und, frei gedreht, alle drei stehen ruhig auf dem Zahn (fein; was auf der abgewandten Seite liegt, nicht).
- Ozzy: Ziele der Linse um die Gestalt erweitert, neuntes Zeichen, P und ⌫ und Esc gehen an die Linse, solange dort etwas gewählt
  ist oder der Zeiger in ihr steht; es ist immer nur eines gewählt.

## 3. Reihenfolge und Proben (vorab festgelegt)

| Scheibe | Was | Probe und Kriterium |
| --- | --- | --- |
| 1 | `zahnGestalt.ts`: Linien, Haut, Netz, jede Vorlage als Linien | Test: jede der acht Vorlagen als Linien liegt höchstens 0,03 (2 % der Zahnlänge) neben ihrem Netz; alle drei Linien liegen auf der Haut (unter 1e-6); gleich viele Punkte und Dreiecke wie die Vorlage |
| 2 | Werte, Plätze, Netz im Maul, Sichern | Test: ein Zahn mit eigener Form steht im Maul; ohne eigene Form ist das Netz Zahl für Zahl wie vorher; Probe „sichern“: Sichern und Laden tragen die Form |
| 3 | Die Linse rastet ein, zeigt Linien, formt | Fensterprobe (neu, `ozzy-maul-zahnform-fenster.mjs`): einrasten von vorn, Spitze ziehen, die Zähne im Maul ändern sich; neuntes Zeichen; ⌘Z; P setzt einen Punkt, ⌫ nimmt ihn; ein Zahn allein; Bild je Griff unter 16,7 ms |
| 4 | Bild, Liste, Übergabe | ein Bild von Nahem: ein Zahn mit Haken und einer mit Zacken („den keine Vorlage kann“) |

Bestehende Proben, die danach wieder laufen müssen: `ozzy-maul-zaehne-fenster`, `ozzy-maul-sichern-fenster`, `ozzy-maul-fenster`,
`ozzy-maul-zunge-fenster`; Tests `src/form/`, `src/ozzy/`; Typen.

## 4. Was bewusst nicht dazugehört

- Frei gedreht (nicht eingerastet) lassen sich die Linien nicht ziehen; neue Linien auf dem Zahn (weitere Loops) gibt es nicht.
- Die Wurzel bleibt die der Vorlage (sie ist nur in der Linse zu sehen). Höcker der Backe bleiben als Zusatz der Vorlage.
- Eine eigene Form an einen anderen Zahn weitergeben (außer: Der Zahn erbt die seiner Reihe).
- Der Rechenkern (`packages/shape`) bleibt unberührt; `anpassen` und die Pfad-Rechnung werden nur benutzt.
