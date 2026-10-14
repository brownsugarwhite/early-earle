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
- **15.10. vormittags: Schritt 1 gebaut** (`packages/shape/src/kern/ableiten.ts`). Gemessen wie oben (Stufe 2, 461 px je Kachel, Kurve wie gezeichnet, ohne Streckung des Top):

  | Wesen | Seite | Front | Top | vorher Top |
  |---|---|---|---|---|
  | Kugel | 0,4 | 0,3 | 0,5 | 0,4 |
  | Rex | 0,8 | 11,1 | **1,0** | 1,7 |
  | Tiger (Kasten-Spanten) | 2,6 | 3,0 | **4,0** (mit Maul 7,5) | 21,6 |
  | Langhals | 1,4 | 4,0 | **14,2** | 17,5 |

  Was gebaut ist:
  1. **Sichthülle statt Schrumpfen.** Der Maßstab eines Rings ist Top bei x, begrenzt durch die Front nur auf der Höhe der breitesten Stützstelle; die übrigen Stützstellen werden einzeln auf die Front ihrer Höhe beschnitten. Vorher engte die Front an jeder Höhe den ganzen Ring ein: Der Tiger-Kasten unter der runden Front schrumpfte als Ganzes (21,6 → 7,0 px allein dadurch).
  2. **Breitenpunkte im Ausgleichslöser** (`breitenSchleife`, Gewicht `breiteGewicht` 16): je Ring alle Stützstellen innerhalb 5 % der größten Breite (bei Kästen die ganze flache Seite), rechts und gespiegelt, dazu die feinen Punkte der Längskanten zwischen ihnen (wie die feinen Nahtpunkte). Ziel je Punkt = Anteil · min(Top bei x, Front bei y) an seiner **tatsächlichen Grenzlage** (zwei Nachrechnungen; die Ringe sind geneigt, der Kasten des Tigers fällt vorn ab). Der Zug (`ziehen`) rechnet einen Durchgang nach: Stufe 3 5–9 ms je Schritt statt 3 ms, Ableitung +12 ms (102 statt 87 ms).
  3. **Reifen auf einer Ecke** teilt den Ring (statt eines zweiten Rings daneben), außer Ring 0 und R−1.
  4. Beweis 1 prüft jetzt Front und Top (Kugel ≤ 1 px, Rex Top ≤ 1,5 px, Langhals Top < 16 px als Wächter).

  Was bleibt, ehrlich:
  - **Rex Front 11 px ist ein Widerspruch der Zeichnungen:** Florians Front ist am breitesten Punkt 0,014 (6,5 px) breiter als sein Top, am Kopf 10 px. Der Kern darf nicht breiter als das Top werden; die Abweichung gehört ins Blatt (Schritt 4).
  - **Langhals Top 14 px an der Brust:** Das Top will dort 0,13 Halbbreite; Seite (Bauchlinie bei y = 0,15) und Front (0,125 auf dieser Höhe) lassen höchstens 0,125 zu (3 px Widerspruch). Der Rest kommt von der Kreis-Vorlage der schrägen Sprossen am Hals-Rumpf-Übergang (breitester Punkt auf halber Sprossenhöhe, wo die Front schon schmal ist). Weg: Ringe senkrecht zur Wirbelsäule oder Lappen-Vorlage für geneigte Sprossen.
  - **Tiger Top 4 px:** die ebene Frontplatte des Kastens gegen die runde Nase der Top-Kurve (Kasten ist Florians Wunsch, die Kurve ist nachgezogen) und die steile Wand Schnauze → Wangen zwischen zwei Ringen.
  - **Mit Maul ohne Breitenpunkte:** Die Breitenpunkte machen den Käfig wellig, und die Kieferpose wirft daraus Hautfalten (Tiger-Stern 70 Durchdringungen bei 50 %; Glättung 4 hilft, kostet aber 1 px an der Kugel). Der Maulbau nutzt deshalb nur die Sichthülle (Tiger mit Maul Top 7,5 px). Offen für Schritt 3 (Käfig als Wahrheit): Pose auf dem geglätteten Käfig.
  - Probiert und verworfen: Nahtanteile nach der Sehnenlänge der feinen Lagen (Naht Rex 0,34 → 0,54 px); Breitenpunkte nur am breitesten Punkt (Kastenwand 24 px, weil der Ring geneigt ist).
- **15.10. mittags: Schritt 2 gebaut** (`packages/shape/src/kern/maul.ts`, Test `maullinie.test.ts`). Die gezeichnete Linie wird anders gelesen:
  1. **Anfang auf der Kontur.** Der vorderste Konturpunkt auf der Höhe des ersten gezeichneten Punkts ist der Maulanfang (als erste Stütze mit v = 0 und als Weltpunkt `anfang` in der Linie). Die Bauchnaht der Lippen-Kappenzeile bekommt genau diesen Punkt als Ziel; liegt der Anfang hinter der Kappenzeile, rückt die Zeile auf ihn (nur rückwärts; an runden Spitzen bleibt sie, sonst wird ihr Quadratring winzig). Liegt der Anfang hinter Ring 0 (Rex: Linie hinter der Kinnecke), rückt Ring 0 hinter den Anfang (`kappeMin`), Ecken dazwischen bekommen keinen Ring.
  2. **Kreuzungen statt nächster Sprosse.** Die Lippenhöhe je Ring ist die Kreuzung der Linie mit der Sprosse (vorher: nächste Sprosse je gezeichnetem Punkt); `unterSpitze` kommt aus der Linie (1 mit Konturanfang oder scharfer Spitze, sonst 0), der Editor setzt nichts mehr fest.
  3. Mindesthöhe der Lippe 0,05 statt 0,1 der Sprosse (0,1 hob eine Linie dicht über der Kinnlinie um 2 px).

  Gemessen (Stufe 2, Lippenpfad gegen die gezeichnete gerade Linie, Nahtanfang gegen den gezeichneten Anfang, Durchdringungen bei 0/50/100 %):

  | Fall | Lippe→Linie | Anfang→S | Durchdringungen |
  |---|---|---|---|
  | Kugel, gerade Linie 0,03 unter der Spitze | 0,7 px | 2,8 px (Rille) | 0 |
  | Rex, gerade Linie auf der Schnauzenfront | 2,1 px (Rille) | 2,6 px (Rille) | 0 |
  | Rex, gerade Linie hinter der Kinnecke | 1,9 px | 2,0 px | 0 |
  | Rex, Linie aus der scharfen Spitze (Überbiss) | 2,0 px | – | 0 |

  Die Kerbe (vorher 10–14 px: die Lippe lief vorn zur Kappenreihe oder zur Spitze) ist weg. Was bleibt: Die Lippe liegt in der **Rille** (vorn am tiefsten, 0,012 · Maulhöhe), auf einer schrägen Unterseite zeigt „nach innen“ in der Seitenansicht nach oben: 2–3 px. An einer **scharfen Spitze** (Rex) beginnt eine Linie aus der Spitze weiter an der Bauchnaht der Kappenzeile (Überbiss; in der Spitze ist kein Platz für die Tasche), an einer runden Spitze (Kugel) durch die Spitze. Kastenfronten (Tiger) unverändert: Lippe durch die Plattenmitte auf der gezeichneten Höhe. Alle Maul-Tests (Beweis 2) bestehen.
- **15.10. nachmittags: Schritt 4 gebaut** (`packages/shape/src/kern/abweichung.ts`, Worker `wesen.ts`, Editor `Viewport.tsx`/`View2D.tsx`): Nach jeder echten Ableitung misst der Worker je Blatt die Abweichung Körper ↔ Kurve (Silhouette des feinen Netzes in Ruhelage gegen das gezeichnete Profil, beide Richtungen, px bei 461 px je Kachel, ≈ 30 ms) und liefert den **Saum** (Silhouettenpunkte mit Abweichung). Im Blatt-Titel steht **„Δ 2,5 px“** (grün ≤ 2, ocker ≤ 6, sonst pink), im Blatt leuchtet der Saum, wo der Körper > 2 px von der Kurve abweicht; die Tafel „Spiel“ zeigt alle drei Zahlen. Während Gesten bleibt der letzte Stand. Geprüft im Web-Modus: Kugel Δ 0,4/0,5/0,5 (grün, kein Saum), Tiger Δ 2,5/3,0/4,8 (ocker, Saum an Frontplatte und Wangen); Bilder `docs/progress/editor/zeichnung-ist-form-delta-{kugel,tiger}.png`. Damit sieht Florian die Widersprüche seiner drei Kurven (Rex-Front, Langhals-Brust, Tiger-Platte) selbst; der Kern entscheidet nicht mehr still. Offen in Schritt 4: der Saum zeigt nur den Körper, nicht die Richtung (zu breit / zu schmal); Schwelle 2 px fest.
- **Nächster Schritt: 3 (Käfig als Wahrheit)**, eigene Sitzung; davor Florians Abnahme der Sätze 1 und 2 im Editor.
