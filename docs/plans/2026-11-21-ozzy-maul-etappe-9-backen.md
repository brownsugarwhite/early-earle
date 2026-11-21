# Ozzy, Maul, Etappe 9: Backen fürs Spiel (21.11.2026)

Florian am 21.11.: „Backen“. Im Konzept ([`2026-11-20-ozzy-maul-zaehne-zunge.md`](2026-11-20-ozzy-maul-zaehne-zunge.md), Abschnitt 7
und Tabelle der Etappen): **zu keine Kante im Licht; Öffnen im Spiel-Renderer; höchstens 8 000 Dreiecke.** Seine Worte dazu:
„Beim gebackenen Model fürs Spiel muss das dann gut umgesetzt sein, dass die Posen/Blendshapes auch im Spiel hervorragend
funktionieren.“

Abschnitt 7 des Konzepts ist vor dem Nachtrag „das Maul ist echte Form“ geschrieben. Seitdem ist die Tasche Haut der Form: Es
muss nichts mehr aufgeschnitten und nichts eingesetzt werden. Dieser Plan sagt, was daraus fürs Backen folgt.

## 1. Was schon da ist

- **Ausdünnen** im Rechenkern seit dem 04.11. (`backen` in `packages/shape/src/dicht/backen.ts`, mit meshoptimizer): Es bleiben
  Punkte der dichten Form stehen, nur weniger; gebacken wird eine neue Liste von Dreiecken. Alles, was je Punkt gilt, gilt
  deshalb unverändert auch im Spielnetz. Ich benutze es, wie es ist (am Kern ändere ich nichts).
- **Die Teilung der Anzeige** (`werk.anzeigeIndex`, `anzeigeQuelle`): Ein Punkt auf einer harten Linie steht doppelt, jede
  Seite mit eigener Normale. Das ist genau die Teilung, die ein Spielnetz braucht.
- **Die Normalen der glatten Anzeige** kommen von den Rechenpunkten (`GlattPlan`, beruhigtes Feld), nicht von den feinen
  Stufen. Ein Punkt des Spielnetzes kann also genau die Normale tragen, mit der Ozzy ihn zeigt (Recherche vom 02.11.: Auf einem
  groben Netz mit harten Farbstufen entscheiden die Normalen).
- **Die Knochen der Pose:** je Punkt ein Drehwinkel um den Mundwinkel (`kieferWinkel`), davor der Versatz der Pose.
- **Das Material des Spiels** läuft in Ozzy schon (`gruen.ts`: das Earle-Material aus `@ee/render` auf dem WebGPU-Renderer von
  three).

## 2. Die Regel des Spielnetzes

**Jeder Punkt hat eine Grundlage, je Pose einen Versatz und je Pose einen Drehwinkel.** Mit dem Anteil `t` jeder Pose (0 bis 1):

    Ruhe   = Grundlage + Σ t · Versatz der Pose
    Winkel = Σ t · Drehwinkel der Pose
    Lage   = Ruhe, um das Scharnier gedreht um seinen Winkel (in der Seite; die Tiefe bleibt)

Das Scharnier ist der Mundwinkel, wie er in der gemischten Ruhe liegt (ein Punkt des Netzes). Für die Normale gilt dasselbe
(Grundlage, Versatz je Pose, gedreht um denselben Winkel, dann auf Länge eins). Das ist die Rechnung der Anzeige in Ozzy:
Steht eine Pose ganz (`t` = 1), liegt jeder Punkt des Spielnetzes genau dort, wo Ozzy ihn zeigt, und trägt dieselbe Normale.
Im Spiel ist es ein kurzer Vertex-Shader (je Pose vier Zahlen je Punkt für die Lage, drei für die Normale).

Das gilt für alles, was am Netz hängt, ohne Sonderfall:

- **Haut und Tasche:** die Punkte des Rechennetzes, ausgedünnt.
- **Zähne:** Ihre Grundlage ist die geschlossene Grundform. Dort haben sie in Ozzy die Länge null (sie stecken im Maul), ihre
  Punkte liegen am Fuß. In einer Pose stehen sie, wie Ozzy sie zeigt; der Versatz lässt sie wachsen, der Winkel ihres Kiefers
  dreht sie mit. Zähne je Pose (Scheibe 4 der Etappe 8) sind damit von selbst dabei.
- **Zunge** (zweite Scheibe): ihre Lage je Pose genauso; ihre Federn gehören dem Spiel.

**Zu ist unsichtbar:** In der geschlossenen Grundform liegen Ober- und Unterlippe Punkt für Punkt am selben Ort. Dort bekommen
beide dieselbe Normale: die der Haut außen, über beide Lippen gemittelt, als gäbe es das Maul nicht. Die Wände der Tasche
tragen ihre eigenen Normalen (die Lippe ist eine harte Linie und steht in der Teilung schon doppelt). In einer Pose trägt jede
Lippe die Normale, die Ozzy dort zeigt.

**Ausgedünnt wird in einer offenen Lage** (die Lippen liegen dann auseinander; geschlossen nähte der Ausdünner sie zusammen:
am 04.11. gemessen), mit den Normalen und den Gewichten der Kiefer als Merkmalen. Die Zähne werden je Zahnform für sich
ausgedünnt (rund 40 Dreiecke je Zahn; Recherche vom 02.11.: 40 bis 60) und zählen zum Budget.

## 3. Scheiben

**Scheibe 1 (jetzt): der Backkern und die Ansicht „Wie im Spiel“.**

- Backen: Haut mit Tasche und Zähne als ein Spielnetz mit höchstens 8 000 Dreiecken, nach der Regel oben, für die Grundform
  und alle Posen.
- Im Feinregler ein Schalter **„Wie im Spiel“** (neben „Dreiecke zeigen“): Ozzy zeigt dann das gebackene Netz statt der Haut,
  mit jedem Material, auch mit dem grünen (dem Material des Spiels). Die Reihe der Posen und der Faden treiben es mit der
  Rechnung des Spiels. Die Statuszeile nennt die Zahl der Dreiecke. Beim Ziehen an der Form zeigt Ozzy die Haut wie sonst;
  danach wird neu gebacken.
- Gilt für eine Form für sich (ein Objekt, gespiegelt mit Clipping, wie alle Formen mit Maul bisher).

**Scheibe 2 (auf sein Wort):** die Zunge; die Farben (Ebene „Maul“, Zähne, Zunge, Bemalung) als Farbe je Punkt; beide Hälften
gleich ausgedünnt; mehrere Objekte.

**Scheibe 3 (auf sein Wort):** die Datei fürs Spiel und das Laden im Renderer des Spiels (die Rechnung im Vertex-Shader). Das
berührt `packages/render` und `apps/game`; das alte Spiel bleibt bis dahin unangetastet.

## 4. Proben (vorher festgelegt; `ozzy-backen-fenster.mjs`, an „teat firefish“ mit Maul, Zähnen und zwei Posen)

| Nr. | Kriterium |
| --- | --- |
| B1 | Das Spielnetz hat höchstens 8 000 Dreiecke (Haut, Tasche und Zähne zusammen). |
| B2 | In der Grundform und in jeder Pose liegt jeder Punkt des Spielnetzes dort, wo Ozzy ihn zeigt: höchstens 0,01 Einheiten daneben (Haut und Zähne); seine Normale weicht höchstens 0,5° ab (an der geschlossenen Lippe ist sie mit Absicht anders: B4). |
| B3 | Nah an der Form: Neun Zehntel der Punkte der glatten Anzeige liegen höchstens 1 Einheit neben dem Spielnetz, keiner mehr als 5 (die Form ist rund 1 000 lang; eine Einheit ist bei üblicher Größe rund ein Bildpunkt). Geschlossen und in „Fressen“. |
| B4 | Zu keine Kante im Licht: An der geschlossenen Lippe tragen die zwei Lippen an jedem Punkt dieselbe Lage und dieselbe Normale (Unterschied 0). Im Bild der Grundform ist längs der Lippe keine Linie zu sehen (angesehen, auf Wachs). |
| B5 | Öffnen: Am Faden auf der Hälfte zwischen Grundform und „Fressen“ steht das gezeigte Spielnetz dort, wo die Rechnung des Spiels es hinstellt (höchstens 0,01). Wie weit das von der Fahrt des Editors abweicht, wird gemessen und berichtet (ohne Schwelle: Die Fahrt des Editors rechnet das Feld der Kiefer je Winkel neu, das Spiel mischt zwischen den Posen). |
| B6 | Tempo: Backen dauert höchstens 0,5 s; die Ansicht rechnet je Bild höchstens 4 ms. |
| B7 | „Wie im Spiel“ aus: Die Anzeige ist dieselbe wie vorher (Punkte gleich). Mit dem grünen Material zeichnet das Spielnetz ohne Fehler. |
| K | keine Fehler in der Konsole |

Dazu Tests für die Rechnung des Spielnetzes (an den Posen genau die gegebenen Lagen, dazwischen stetig) und für das Angleichen
der Normalen an der geschlossenen Lippe.

## 5. Nicht in Scheibe 1

Zunge, Farben, Datei, das Spiel selbst; beide Hälften gleich ausdünnen (der Ausdünner kennt den Spiegel nicht; gemessen wird,
wie verschieden die Hälften werden); harte Linien, die keine Lippe sind, bleiben wie in der Teilung der Anzeige (nicht eigens
geprüft); Formen ohne Spiegel, Verbund und mehrere Objekte.
