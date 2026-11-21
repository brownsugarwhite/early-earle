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

## 6. Ergebnis der Scheibe 1 (21.11.)

Gebaut (Commits `12be33d0`, `0ccb2d31`). Bild:
[`docs/progress/ozzy/2026-11-21-maul-etappe9-backen.jpg`](../progress/ozzy/2026-11-21-maul-etappe9-backen.jpg).

**Was er jetzt kann:** Im Feinregler steht der Schalter „Wie im Spiel“. Im Raum zeigt Ozzy dann statt der Haut das gebackene
Netz: höchstens 8 000 Dreiecke für Haut, Maul und Zähne (an „teat firefish“ 7 936 statt 23 400), gebacken in unter einer
Zehntelsekunde, neu nach jedem Schritt, sobald die Form steht. Die Reihe der Posen und der Faden treiben es mit der Rechnung
des Spiels; mit „Dreiecke zeigen“ dazu sieht er die Dreiecke des Spielnetzes; mit dem grünen Material sieht er es im Material
des Spiels. Zu ist das Maul im Spielnetz nicht zu sehen.

**Was sich gegen den Plan geändert hat (offen gesagt):**

- **Die Ansicht gilt im Raum.** Eingerastet zeichnet Ozzy das Blatt mit den Linien, kein Material; dort bleibt alles wie es
  ist. Die Probe läuft deshalb im Raum.
- **Die Grundlage ist die Grundform mit den Kiefern bei null.** Die Form ist mit einem Haarspalt am Maul gerechnet (0,03°
  am Mundwinkel); im Spielnetz ist er zu. B2 heißt für die Grundform deshalb: die Haut außen höchstens 0,1 daneben (gemessen
  0,07), nicht 0,01.
- **Die zwei Lippen haben im Rechennetz keine Zwillinge Punkt für Punkt** (sie sind verschieden unterteilt: 24 und 22 Punkte
  je Lippe). Der Plan nahm an, die Lippen lägen Punkt für Punkt aufeinander. Das Spielnetz teilt jetzt beide Lippen an
  denselben Stellen längs der Lippe (wo eine einen Punkt hat, bekommt die andere einen: er liegt zwischen zwei Punkten der
  Form) und legt in der Grundlage die Punkte der einen Lippe auf die der anderen. B4 misst das; die Normalen dürfen 0,05°
  auseinander liegen statt 0 (die Genauigkeit der Zahlen: gemessen 0,016°).
- **Ausgedünnt wird in der Pose mit dem engsten offenen Maul,** mit dem Drehwinkel dieser und der weitesten Pose als
  Merkmalen. Mit nur der weitesten Pose knickte die Haut in „Fressen“ am Hals 7,8 Einheiten neben der Anzeige.
- **B6:** Die Probe läuft im Raum, und dort kosten Linien und Wände je Bild einer Fahrt schon rund 15 ms (Liste, 157). Gemessen
  wird deshalb, was die Ansicht selbst je Bild kostet, und dieselbe Fahrt mit und ohne Ansicht.

**Proben** (`ozzy-backen-fenster.mjs`, an „teat firefish“ mit Zähnen, „Fressen“ und einer zweiten Pose; alle erfüllt, die
Werte des letzten von elf Läufen)

| Nr. | Gemessen |
| --- | --- |
| B1 | 7 936 Dreiecke (Haut 7 016, Zähne 920) statt 23 400; 4 162 Punkte |
| B2 | „Fressen“ und Pose 2: Haut 0,000, Zähne 0,000, Normalen 0,02°. Grundform: Haut außen 0,069, Zähne 0,055, Normalen der Haut außen 0,04°; mit Absicht anders: die Lippen bis 1,2 längs der Lippe verschoben (in anderen Läufen bis 2,3), ihre Normalen bis 9,8°, in der Tasche bis 1,1° |
| B3 | Grundform außen: 183 992 Punkte der glatten Anzeige, neun Zehntel bis 0,86, im Mittel 0,42, höchstens 2,31. „Fressen“: 0,85 / 0,41 / 2,31. Dazu gemessen: Pose 2 höchstens 5,42 (am Hals); in der Tasche höchstens 1,6 |
| B4 | 48 Punkte der Lippen von außen, 23 Paare am selben Ort (Abstand 0), Normalen dort höchstens 0,016° verschieden; beide Lippen stehen an 23 Stellen, 16 davon eingesetzt |
| B5 | am Faden: Anteile 0,5 wie die Reihe. Die Rechnung des Spiels liegt dort neben der Fahrt des Editors: Haut 0,6 (andere Läufe bis 1,15), Zähne 10,9, Normalen an den Lippen bis 44° |
| B6 | gebacken in 74 ms (67 bis 78); die Ansicht selbst im teuersten Bild 0,5 ms; vier Fahrten: nicht neu gebacken, jedes der 151 Bilder zeigt das Spielnetz; unterwegs im Raum mit der Ansicht 24,5 ms je Bild, ohne 23,6 ms |
| B7 | aus: Haut 0 neben vorher; grün: geladen, zu sehen (WebGPU), das Spielnetz gezeigt |

Dazu: 14 Tests für `form/spielform.ts` (die Rechnung des Spiels, die Normalen an der geschlossenen Lippe, die Lippen gleich
teilen, der Abstand zum Netz); `npx vitest run src/form/ src/ozzy/` (153 Tests), Typen, Lint. Es laufen weiter:
`ozzy-maul-fenster` (19), `-zaehne-` (27), `-posen-` (15), `-posen-zaehne-` (11), `-zunge-` (28), `-farbe-` (8),
`-material-fenster` (3).

**Für ihn entschieden (sein Urteil steht aus):** der Schalter im Feinregler (kein Tropfen); 40 Dreiecke je Zahn, der Rest für
die Haut; die Grundlage mit geschlossenem Haarspalt; zwischen den Lagen mischt das Spiel die Posen (die Zähne wachsen mit dem
Anteil der Pose).

**Offen:** Liste, Punkte 187 bis 196.

