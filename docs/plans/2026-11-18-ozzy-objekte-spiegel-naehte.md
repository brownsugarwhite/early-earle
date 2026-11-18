# Ozzy: Objekte, Spiegel und Nähte (Plan, 18.11.2026)

Sitzung „Objekte und Spiegel“, Zweig `claude/ozzy-donut-mirror-system-7a31b7` (von `claude/ozzy`, Stand `6bef9f17`), eigener
Arbeitsbaum, eigenes Fenster: `http://localhost:5211/ozzy.html` (Eintrag `ozzy-objekte`). Dein Fenster 5205 bleibt, wie es ist.
Dein Auftrag steht wörtlich im Anhang A.

**Stand 18.11., spät: Etappe 0, 1, 2 (2a und 2b) und 3 sind gebaut** (Etappe 3 seit heute Abend; die Fahrt zum Blatt beim Plus
gehört nach deinem Wort zum Feinschliff: mehrere Silhouetten auf einem Blatt, der gemeinsame Rückweg, Sichern und Laden der ganzen Szene, Linien ruhender Objekte;
Abschnitt 10, „Etappe 3, der Rest“), **von Etappe 4 die erste Fassung: Verschmelzen und Abziehen in Ozzy** (zwei Knöpfe in der
Leiste, die Naht als Linie mit Kante, ⌘Z trennt wieder; Abschnitt 10, „Etappe 4 in Ozzy“). K an der Naht ist entschieden („Wie
Seifenblasen“) und wirkt wie an jeder Linie; an Formen ohne eigene Linien hält die Rechnung dabei noch nicht. **Das steht aus, dein
Wort** (du überlegst, ob Formen künftig schon mit Edgeloops beginnen; dann gäbe es den Fall nicht). Gebaut wird der Reihe nach (Abschnitt 6). Wo ich etwas für dich entschieden habe, steht
es in Abschnitt 7; was offen bleibt, in Abschnitt 8 und je Etappe in Abschnitt 10.

## 1. Warum der Donut in Ozzy nicht geht

Im Prüffenster (`kurven.html`, dein Fenster 5194) besteht der Donut aus drei Dingen. Ozzy hat nur das erste übernommen:

| Teil | Prüffenster | Ozzy |
| --- | --- | --- |
| Die Rechnung: Linien und Haut dürfen durch die Spiegelebene; „fest machen“ schneidet und verbindet (`mitteFestmachen`) | ja | ja (dasselbe Werk) |
| Die Anzeige schneidet jede Hälfte an der Spiegelebene ab (je Bildpunkt, im Material) | ja | **fehlt**: Ozzy hat eigene Materialien (Seifenhaut, Solid, …), der Schnitt steckte im Material des Prüffensters |
| Punkte an den Kreuzungen mit der Mitte, der gezogene Punkt markiert, Löschen macht fest | ja | **fehlt**: Das zeichneten die Blätter des Prüffensters, Ozzy zeichnet seine Linien selbst |

Nachgestellt an „strange bird“ (Punkt an der Seite in der Top-Ansicht 188 über die Mitte gezogen): Die Hälften laufen ungeschnitten
durcheinander. Bilder: [`2026-11-18-donut-vorher-seifenhaut.png`](../progress/ozzy/2026-11-18-donut-vorher-seifenhaut.png),
[`…-solid.png`](../progress/ozzy/2026-11-18-donut-vorher-solid.png). Es ist also nichts kaputtgegangen; der sichtbare Teil ist nie
nach Ozzy gekommen.

## 2. Die Idee: Objekte, Teile und die Naht

Drei Wörter tragen alles, was du beschrieben hast.

- **Objekt:** was der dunkle Zeiger (V) wählt. Es hat einen Namen, seinen eigenen Spiegel und besteht aus einem oder mehreren
  **Teilen**. Ein Teil ist eine geschlossene Haut mit ihren Linien (das, was Ozzy heute als ganze Form kennt).
- **Teil:** was der weiße Zeiger (A) bearbeitet: Punkte, Linien, Griffe. L wählt alles, was zum Teil unter dem Zeiger gehört.
- **Naht:** die Linie, an der zwei Häute sich treffen. Sie ist ein Loop wie jeder andere: zuerst eine Kante, mit K rund, ihre
  Punkte lassen sich ziehen. Was hinter der Naht liegt, wird nicht gezeigt.

Die Naht ist der Kern. **Donut, Clipping am Spiegel, Verschmelzen und Abziehen sind dieselbe Sache**, nur mit einem anderen
Gegenüber:

| Was sich trifft | Wo die Naht liegt | Was wegfällt |
| --- | --- | --- |
| eine Hälfte und ihr Spiegelbild (Clipping, Donut) | in der Spiegelebene | was hinter der Ebene liegt |
| zwei Objekte, die verschmelzen | auf der Schnittkurve der beiden Häute | was im jeweils anderen steckt |
| ein Objekt und eines, das abzieht | auf derselben Schnittkurve | was im Abziehenden steckt, und er selbst (seine Innenseite bleibt als Wand) |

Das ist auch die Antwort auf deine Frage, wie sich Womp und Plasticity auf Kurven übertragen: In Plasticity wird die Schnittkurve
zweier Flächen eine echte Kante, die man danach abrundet. In Womp rundet ein Regler („Goop“) den Übergang. Bei uns ist die
Schnittkurve eine **Linie mit Punkten und Griffen**, „Kante an“ ist die saubere Kante, „Kante aus“ (K) die Rundung, und weil die Haut
ohnehin rund aus den Linien entsteht, ist die Rundung keine eigene Fläche, sondern dieselbe Rechnung wie überall. Wie breit die
Rundung ausfällt, bestimmen die Linien daneben (wie bei jeder weichen Linie heute).

**Zwei Zustände je Naht**, damit nichts stockt:

- **lose** (während du ziehst oder ein Objekt verschiebst): Nichts wird gerechnet oder geschnitten. Die Anzeige blendet die
  Überschneidung je Bildpunkt aus. Das kostet fast nichts und folgt der Hand ohne Verzögerung.
- **fest** (beim Loslassen): Die Häute werden an der Naht geschnitten und verbunden, die Naht wird eine Linie und ist gewählt.

## 3. Bedienung

| Taste | Zeiger | Was |
| --- | --- | --- |
| **V** | dunkel (bleibt dunkel, auch auf der dunklen Rückseite; dort mit hellem Rand) | Objekte: Klick wählt, Ziehen verschiebt, G S R, ⌫ löscht das Objekt, Doppelklick wechselt zu A an diesem Objekt |
| **A** | weiß mit dunklem Rand (bleibt weiß, auch auf Weiß) | Punkte, Linien, Griffe, Felder wie heute |
| **P** | Feder | Linien zeichnen wie heute |
| **L** | | wählt alles Verbundene am Teil unter dem Zeiger (ohne Klick, wie in Blender); ⇧ + L nimmt es aus der Auswahl |
| **Q** | | Lasso (bisher L; in Illustrator liegt das Lasso auf Q) |
| **K** | | Kante an und aus, auch an einer Naht |
| **+** in der Leiste | | neues Objekt: Die Seitenansicht öffnet sich als Blatt, die vorhandenen Objekte stehen blass darin; zeichnen, ↩ bläst auf |
| **Spiegel** in der Leiste | | der Knopf mit drei Zuständen für das gewählte Objekt (Abschnitt 4) |

Leiste: `V A | Lasso P Freihand Formen | + Spiegel | Mülleimer` (das Plus kommt mit Etappe 3). Das Plus sitzt in der Leiste und
nicht oben rechts, weil dort schon „Fressen“ wächst und alles, was mit Objekten zu tun hat, an einer Stelle bleiben soll.

Beim ersten Zeichnen und nach dem Plus gilt: **Jede geschlossene Linie, die in keiner anderen liegt, wird ein Objekt.** Alle blasen
zusammen auf, jedes mit seinem eigenen Hals und Schnalz.

## 4. Der Spiegel-Knopf

Eine Gruppe in der Leiste mit drei Feldern für das gewählte Objekt: **aus · an · Clipping**. Jedes Feld ist direkt wählbar, ein
Tropfen fließt zum geltenden Zustand. Die Zeichen: ein Tropfen allein, zwei Tropfen, die sich überragen, zwei verschmolzene Tropfen.

| Zustand | Was du siehst | Bewegen mit V |
| --- | --- | --- |
| **Clipping** (an mit Clipping) | An der Spiegelebene sind die beiden eine Form; was über die Ebene reicht, verschmilzt dort (Naht). | in der Ebene (längs, hoch, skalieren; drehen nur in der Seite) |
| **an** | Das Objekt und sein Spiegelbild; was über die Ebene reicht, überragt sich, nichts verschmilzt. | ein ganzes Objekt frei, das Spiegelbild geht gegengleich mit; eine verschmolzene Form in der Ebene |
| **aus** | ein ganzes Objekt, kein Spiegelbild; beide Seiten lassen sich verschieden formen | frei, in alle Richtungen |

**„Anwenden“ ist „aus“** (deine Antwort vom 18.11. auf meine Frage, was „Spiegel aus“ an einer verschmolzenen Form heißen soll: „Ja,
so bauen“): Eine verschmolzene Form bleibt ganz und wird frei, ein Schritt für ⌘Z. Ein eigener Befehl „anwenden“ bleibt nur für
den Fall, dass ein freies Objekt und sein Spiegelbild zwei getrennte Teile werden sollen; das braucht mehrere Teile je Objekt
(Etappe 3) und ist noch nicht gebaut.

Die Regeln dazu:

1. **Mit Clipping:** Führt ein Zug über die Ebene, entsteht beim Loslassen die Naht von selbst, als Kante, und ist gewählt. K
   macht sie rund. Kein markierter Punkt, kein Löschen. ⌘Z nimmt Zug und Naht zusammen zurück. *(gebaut, Etappe 0)*
2. **Erst ohne Clipping ineinanderschieben, dann Clipping ein:** Die Überschneidung zieht sich in 0,42 s in die Ebene zurück (die
   Anzeige schneidet erst so tief hinter der Ebene, wie die Überschneidung reicht, und wandert zur Ebene), dann steht die Naht und
   ist gewählt. ⌘Z trennt wieder und stellt den Knopf zurück. *(gebaut: an einer verschmolzenen Form in Etappe 2a, an einem freien
   Objekt und seinem Spiegelbild in Etappe 2b)*
3. **Clipping aus an einer verschmolzenen Form:** Sie bleibt an der Mitte verbunden, wie sie ist. Was du danach über die Mitte
   ziehst, überragt sich, statt zu verschmelzen. *(gebaut)* Zur Seite schieben lässt sich erst ein ganzes Objekt: dafür „aus“
   (die Form wird ganz), mit V verschieben, wieder „an“. *(gebaut, Etappe 2b)*
4. **Clipping wartet:** Steht der Knopf auf Clipping und liegt das freie Objekt neben der Ebene, geschieht nichts; sobald du es
   mit V über die Ebene schiebst (oder einen Punkt hinüberziehst), verschmilzt es beim Loslassen. *(gebaut, Etappe 2b)*
5. Das erste Objekt und jedes neue beginnen wie heute: in der Mitte, **an mit Clipping**.
6. **An einer freien Form ist jede Linie eine für sich:** Was du mit P zeichnest, entsteht nur dort, ohne Gegenstück auf der anderen
   Seite. Zeigt das Objekt sein Spiegelbild, zeichnet das Bild die Linie mit. *(gebaut, Etappe 2b)*

**Wie es innen aussieht** (für die nächste Sitzung): Es gibt zwei Arten von Haut. *Verschmolzen:* eine ganze Haut aus Spiegelpaaren,
die Linien sind die Hälfte z ≥ 0 (so rechnet der Kern seit je). *Frei:* eine Haut ohne Paare (`hautFrei`), jede Linie ein
geschlossener Loop für sich (Art `paar`, dazu Abzweigungen); ihr Spiegelbild ist nur Anzeige (`werk.G.spiegelbild`,
`werkHaut.zeigeNetz`). Der Knopf wechselt die Art nur an zwei Stellen: „aus“ macht aus einer verschmolzenen Form eine freie
(`werk.spiegelAus`, Kern `spiegelAnwenden` in `frei.ts`), und „Clipping“ macht aus einer freien, die über die Ebene reicht, eine
verschmolzene (`werk.mitteFest`, Kern `mitteFestmachen` nimmt eine freie Haut als „die Hälfte“). Alles andere schaltet nur
`werk.G.clipping`, `werk.G.spiegelbild` und die Anzeige. Die Werkzeuge des Kerns lesen die Art an der Haut ab und setzen an einer
freien nichts spiegelgleich (`kantenTeilen`, `dreieckTeilen`, `loopEinsetzen`, `loopAusVorhang`, `formAusZeichnung`, `abzweigen`,
`verdichten`).

## 5. Was bewiesen ist und was nicht

| Frage | Stand | Beleg |
| --- | --- | --- |
| Trägt die Rechnung eine Form ohne Spiegel (aus, anwenden, einseitig formen)? | **Ja.** Kugel mit drei Loops, Spiegel angewendet: bleibt in Ruhe (0,00), ein Punkt nur auf einer Seite 40 hinaus: Die Haut folgt, die andere Seite bleibt (höchstens 2,2 weit weg), nichts umgeschlagen, 4 Runden bis zur Ruhe. Alle 190 Tests des Kerns halten. | `form-frei.ts`, `packages/shape/src/dicht/frei.ts` |
| Räumt das Netz an einer freien Form auf, und lassen sich dort Linien anlegen? | **Ja** (seit dem 18.11. nachmittags). `verdichten` arbeitet ohne Spiegelpaare; P quer, eine Form auf der Haut und eine Abzweigung entstehen an einer freien Form für sich, ohne Gegenstück. Derselbe Strich liegt an der freien Form genau wie an der gespiegelten (gleiche Punkte, gleiche Maße), nur einmal. | Tests `frei.test.ts`, Probe `ozzy-frei-linien-fenster.mjs` |
| Eine Falle dabei | Eine freie Form muss bleiben, wo sie ist: Weit vom Ursprung weg gerechnet wandert die Haut (bei 3 000 Einheiten um 13 in 400 Runden, bei 20 000 läuft sie davon). | `DZ=3000 … form-frei.ts` |
| Naht an der Spiegelebene | **Ja**, das ist der Donut vom 13.11. (`mitteFestmachen`). Seit dem 18.11. auch für ein freies Objekt, das an die Ebene geschoben wird: hin und zurück (aus, dann Clipping) gibt die Form von vorher; eine um 80 verschobene Kugel verschmilzt mit einer Naht vom erwarteten Halbmesser, nichts umgeschlagen. | Tests `mitteSchnitt.test.ts`, `frei.test.ts` |
| Naht zwischen zwei Objekten (verschmelzen, abziehen) | **Bewiesen im Kern (18.11., 17:40 Uhr), für die feste Naht mit Kante.** Zwei freie Kugeln mit je drei Linien (Halbmesser 150 und 90, schräg versetzt). Der Schnitt der Netze kommt von der Bibliothek Manifold (75 bis 95 ms für 2 × 5 200 Punkte). Die Haut ist geschlossen, der Rauminhalt stimmt auf ein Zehntausendstel, die Naht ist eine geschlossene Kette. Die vier Linien, die in die andere Form laufen, sind an der Naht geschnitten (ihr Pfad genau geteilt, die neuen Enden 0,04 neben ihrem Punkt der Naht) und hängen dort wie Abzweigungen; die Naht hat an diesen acht Stellen Punkte. Die Rechnung steht nach 2 bis 3 Runden, nichts umgeschlagen, alle Linien 0,00 neben ihren Pfaden; der Knick an der Naht ist 91° (verschmelzen) und 86° (abziehen: eine saubere Kante, die Wand der Höhle trägt die Linien des abgezogenen Objekts). Ein Punkt der Naht um 20 gezogen: Beide Formen folgen, nichts schlägt um. **K an der Naht hält als Rechnung, aber noch nicht als Bild:** Der Knick sinkt auf 17°, doch die Form geht weit mit (bis 22,5 Einheiten an der Naht, bis 7,6 weiter als 100 Einheiten entfernt, mehr als die Hälfte aller Punkte), und beim Abziehen fällt die Höhle zu einer flachen, faltigen Mulde zusammen. Grund: Eine weiche Linie heißt „überall glatt“, und drei Linien je Kugel halten die Form nicht. Zwei Wege zu einer schmalen Rundung sind gemessen (Abschnitt 10, Beweis 2): Begleitlinien halten die Form nicht; die Haut außerhalb eines Streifens festhalten hält sie genau, zeigt aber den Rand des Streifens. | `form-naht.ts` (`ART=abziehen`), Bilder [verschmelzen](../progress/ozzy/2026-11-18-naht-verschmelzen.jpg), [abziehen](../progress/ozzy/2026-11-18-naht-abziehen.jpg) |
| Auseinanderziehen wie zwei Seifenblasen (Hals wird schmaler, reißt ab) | **Nicht bewiesen**, und der schwerste Punkt. Zwei Wege, beide zuerst als Film: (a) Die Naht bleibt eine echte Linie und folgt beim Verschieben der Schnittkurve; die heutige Rechnung zieht den Hals von selbst glatt (so schnell wie ein gewöhnlicher Zug). (b) Nur die Anzeige rundet den Übergang, gerechnet wird beim Loslassen. Kriterium: 60 Bilder je Sekunde im Zug an zwei Formen mit je 3 000 Punkten, kein Sprung beim Loslassen. | Etappe 5 |
| Den Hilfsloop bearbeiten, und beide Objekte passen sich an | **Nicht bewiesen.** Vorschlag: Die Naht gehört keinem der beiden Objekte; ihre Verformung von Hand wird gegen die gerechnete Schnittkurve gemerkt und lebt und vergeht mit ihr. | Etappe 5 |
| Mehrere Objekte in Ozzy | nicht gebaut, kein Beweis nötig: Das Werk rechnet immer an einem Teil; die anderen stehen als fertige Häute im Bild und werden beim Anfassen eingewechselt (der Stand eines Teils ist dasselbe wie eine gesicherte Form). Offen ist nur das Tempo des Einwechselns (Ziel: unter einem Bild für Formen bis 3 000 Punkte). | Etappe 3 |

## 6. Etappen

Jede Etappe endet mit einer sichtbaren Probe (Film oder Bild, vorher und nachher) und ist für sich benutzbar.

| | Was | Probe |
| --- | --- | --- |
| **0** | **Donut in Ozzy, neue Regel.** *(gebaut)* Die Anzeige schneidet beim Ziehen über die Mitte jede Hälfte an der Ebene ab (Seifenhaut, Solid, Zebra). Beim Loslassen entsteht die Naht von selbst und ist gewählt, K macht sie rund, ⌘Z nimmt beides zurück. | `ozzy-donut-fenster.mjs`, Film |
| **1** | **V, A, P und die zwei Zeiger; L wählt Verbundenes, Q ist das Lasso.** *(gebaut)* V wählt das Objekt; verschieben lässt es sich ab Etappe 2b und 3 (mit einem einzigen verschmolzenen Objekt sähe man es nicht: Der Raum richtet sich nach der Form aus). | `ozzy-modi-fenster.mjs`, Film der Zeiger auf Weiß und auf der Rückseite |
| **2a** | **Der Spiegel-Knopf, erster Teil:** an mit Clipping ↔ an; die Fahrt beim Einschalten des Clippings. *(gebaut)* | `ozzy-spiegel-fenster.mjs`, Film |
| **2b** | **Der Spiegel-Knopf, zweiter Teil:** aus und anwenden. *(gebaut; offen bleibt, was in Abschnitt 10 steht)* Dazu die freie Form im Werk: Das Netz räumt auch ohne Spiegelpaare auf (`verdichten`), Linien zeichnen ohne Spiegel (P quer, Form auf der Haut), das Spiegelbild als Anzeige, Clipping an einem ganzen Objekt, das an die Ebene geschoben wird; Verschieben mit V. | Film: Kugel, aus, einseitig formen, zur Seite, an, Clipping |
| **3** | **Mehrere Objekte:** Plus in der Leiste, Aufblasen je Objekt, Wählen und Verschieben mit V, Bearbeiten mit A; mehrere Silhouetten auf einem Blatt, ⌘Z über alle Objekte, Sichern und Laden der Szene, Linien ruhender Objekte *(gebaut; die Fahrt zum Blatt beim Plus kommt mit dem Feinschliff)*. | `ozzy-objekte-fenster.mjs`, `ozzy-reihe-fenster.mjs`; Bildbogen (ein Film steht aus) |
| **4** | **Naht zwischen Objekten, fest:** Beweis im Kern *(gehalten)*, dann „verschmelzen“ und „abziehen“ *(erste Fassung gebaut: zwei Knöpfe in der Leiste)*; die Naht als Kante, mit K weich *(hält an Formen mit eigenen Linien; ohne noch nicht)*. | Kern-Probe mit Bild; `ozzy-naht-fenster.mjs`, Bildbogen (ein Film steht aus) |
| **5** | **Naht lebt:** verschmolzene Objekte wieder verschieben und auseinanderziehen (Hals, Abriss), die Naht bearbeiten. | Film in echter Geschwindigkeit |
| **6** | Danach, wie du geschrieben hast: Seifenhaut, Tempo und Bedienung ansehen (Liste in Abschnitt 8). | Messblatt |

### Etappe 3: wie mehrere Objekte gebaut werden (18.11., 16:45 Uhr)

Gelesen, bevor gebaut wird: Ozzy hat für die eine Form drei Dinge, die zusammengehören. Das Werk (Stand der Rechnung, samt Rückweg
für ⌘Z), ihre glatte Anzeige (`WerkHaut`: sie liegt schon in den Koordinaten des Raums vor, mit eigenem Maß und eigener Mitte) und
die Zeichnung auf dem Blatt (für „Luft ablassen“).

- **Ein Objekt ist ein Stand des Werks plus seine eigene Anzeige.** Das Werk rechnet immer an einem, dem aktiven. Die anderen ruhen:
  Ihr Stand liegt bereit (`werk.objektAblegen`, `werk.objektAufnehmen`), ihre fertige Haut steht im Bild und kostet nichts, solange
  niemand sie anfasst. Wer ein ruhendes Objekt anklickt, macht es zum aktiven (der Tausch ist ein Zuweisen, keine Rechnung).
- **Jedes Objekt rechnet in seiner eigenen Größe** (jede Form wie bisher rund 150 Einheiten groß, mit eigenem Maß `f`): So gelten
  alle Maße des Kerns unverändert, auch für ein kleines Ohr neben einem großen Körper, und nichts wird weit vom Ursprung gerechnet.
- **Der Rückweg gehört dem Objekt** (⌘Z nimmt den letzten Schritt am aktiven Objekt zurück). Ein gemeinsamer Rückweg über alle
  Objekte (auch für „neues Objekt“ und „Objekt gelöscht“) ist der zweite Schritt.
- **Das Plus** öffnet das Blatt der Seite: Die vorhandenen Objekte stehen blass darin, gezeichnet wird das neue, ↩ bläst es auf.
- **Luft ablassen** (zurück zur Zeichnung) gibt es, solange es ein Objekt gibt. Mit mehreren löscht ⌫ im Objekt-Modus das gewählte.

Reihenfolge: (a) Plus, zweites Objekt, wählen mit V und A, bewegen, Spiegel je Objekt, löschen, alle Materialien für alle Objekte
*(gebaut, 18.11.)*; (b) mehrere Silhouetten auf dem ersten Blatt *(gebaut)*; (c) Linien ruhender Objekte blass zeigen *(gebaut)*; (d) gemeinsamer
Rückweg *(gebaut)*; (e) Sichern und Laden mit mehreren Objekten *(gebaut)*; (f) die Fahrt zum Blatt beim Plus *(Feinschliff, dein Wort vom 18.11.)*.

## 7. Was ich für dich entschieden habe (sag, wenn du es anders willst)

- Lasso auf **Q**, damit L frei wird.
- Das Plus in der Leiste statt oben rechts.
- „Clipping aus“ an einer verschmolzenen Form lässt sie an der Mitte verbunden (Regel 3 oben); ganz und frei wird sie mit „aus“.
- Neue Objekte beginnen in der Mitte mit Clipping, wie das erste.
- Nach dem Aufblasen bist du wie heute bei den Punkten (A); V ist der Schritt zurück zum ganzen Objekt.

- Der Spiegel-Knopf hat drei Felder nebeneinander (aus, an, Clipping) statt eines Knopfs, der weiterschaltet: So ist jeder Zustand
  ein Klick, und man sieht alle drei.
- An einer freien Form, die ihr Spiegelbild zeigt, gilt ein Strich, der nur das Spiegelbild trifft, als sein Spiegelbild: Die Linie
  entsteht an der Form.
- Mit V dreht sich eine verschmolzene Form nur in der Seite (sonst verließe sie die Spiegelebene); ein freies Objekt dreht frei.

**Beantwortet (18.11.):** Was „Spiegel aus“ an einer verschmolzenen Form bedeutet. Mein Vorschlag war: Sie bleibt ganz und ist ab
dann frei, beide Seiten lassen sich verschieden formen (dasselbe wie „anwenden“). Deine Antwort: „Ja, so bauen“. So ist es gebaut.

- **Etappe 4 (18.11. abends):** Verschmelzen und Abziehen sind zwei Knöpfe neben dem Plus, zu sehen erst mit mehr als einem
  Objekt (kein Schalter je Objekt: Solange die Naht nicht „lebt“, wäre er nur ein Knopf mit Gedächtnis). Beim Verschmelzen bleibt
  das größere Objekt (in seinem Maß wird weitergerechnet), beim Abziehen ist das gewählte das Werkzeug. Danach ist der weiße
  Zeiger an, damit die gewählte Naht zu sehen ist und K sofort wirkt. Eine Naht, an der keine Linie endet, bekommt von selbst
  vier Punkte in gleichen Abständen (wie ein Kreis mit vier Punkten), sonst wäre sie nicht zu greifen. Der Spiegel folgt einer
  Regel: Das Bild bleibt, wie es ist.

- **Etappe 3, der Rest (18.11. spät):** Jede geschlossene Linie eines Blatts wird ein Objekt (auch eine, die in einer anderen
  liegt); die größte ist „Form 1“ und am Ende gewählt, die anderen blasen danach 2,5-mal so rasch auf. ⌘Z gilt jetzt für alle
  Objekte gemeinsam: Es nimmt den letzten Schritt zurück, wo er geschah, und wählt dafür dessen Objekt (vorher gehörte ⌘Z dem
  gewählten Objekt). Eine Szene ist eine Datei. Die Linien ruhender Objekte sind feine Striche ohne Punkte.

## 8. Noch ausstehend (nicht in diesen Etappen)

**Aus dieser Sitzung:**
- Jelly, helles Solid und Grün schneiden beim Ziehen über die Mitte noch nicht ab (sie laufen in fremden Renderern) und zeigen das
  Spiegelbild eines freien Objekts nicht. Nach dem Loslassen einer verschmolzenen Form stimmt das Bild in allen Materialien, weil die
  Naht dann fest ist.
- Die Wände im Raum und der weiße Körper der Linienansichten zeigen während des Zugs noch beide Hälften ganz; die Tiefenkarten (was
  als verdeckt gilt) kennen das Spiegelbild eines freien Objekts nicht.
- Abzweigungen (hängende Linien) gehen beim Wechsel des Spiegels noch nicht mit: Mit einer Abzweigung lässt sich eine verschmolzene
  Form nicht auf „aus“ stellen und eine freie nicht verschmelzen (die Statuszeile sagt es; erst die Abzweigung löschen).
- Ein freies Objekt und sein Spiegelbild als zwei getrennte Teile („anwenden“ ohne Verschmelzen): braucht mehrere Teile je Objekt.
- Der Zustand des Spiegels wird noch nicht mit der Form gesichert (eine geladene Form beginnt mit Clipping); eine freie Form wird
  beim Laden wieder als gespiegelte gelesen. Das gehört zu „Sichern und Laden“ in Etappe 3.
- Seite an einem freien Objekt mit Spiegelbild: Objekt und Bild liegen in dieser Ansicht hintereinander. Gezeichnet und gegriffen
  wird am Objekt; liegt das Bild davor, verdeckt es das (dafür einmal wenden oder im Raum arbeiten).
- An einer freien Form gibt es keine Form „über den Umriss hinaus“ (an der gespiegelten wird daraus ein Ring über die Mitte).
- Zeichnet man an einer freien Form genau auf einer vorhandenen Linie entlang (etwa durch ihre frühere Mitte), entstehen schmale
  umgeschlagene Dreiecke zwischen beiden (gemessen 12). An der gespiegelten Form fängt die Regel „Den Loop in der Mitte gibt es
  schon“ das ab; für die freie fehlt eine solche Regel.
- Drehen einer verschmolzenen Form quer zur Spiegelebene, Material je Objekt, Objektliste mit Namen.
- Das Maul als abziehendes Objekt (deine Idee): erst nach Etappe 4 und nach deiner Beschreibung der Fälle.
- Beim Verschieben eines Objekts richtet sich der Raum nach der Form aus (er wird kleiner, wenn Objekt und Spiegelbild
  auseinanderrücken); das geschieht in einer Fahrt, ist aber ungewohnt. Ansehen, wenn es mehrere Objekte gibt.

**Aus der Übergabe von Ozzy (unverändert offen):** Schritt 1, 3 und 5 nach deinem ersten Test (Loops vorzeichnen, Seifenhaut im
Zug, flüssig drehen) samt den Wänden; E Tempo II (Löser neben dem Bild); Tempo am Mac und am iPhone nie gemessen (Ziel 120 Bilder
je Sekunde: Median 6 ms, 95 % 8 ms); iPad am echten Gerät; Gleiten; der Bauch im Grün; `main.ts` aufteilen (6 549 Zeilen). Siehe
[`docs/look/ozzy/UEBERGABE.md`](../look/ozzy/UEBERGABE.md), Abschnitt 7 und 8.

**Was mir beim Lesen aufgefallen ist** (nichts davon gebaut):
- Mit mehreren Objekten wächst die Anzeige (jede Haut verfeinert, jedes Spiegelbild doppelt). Die Stufen der Anzeige sollten sich
  dann je Objekt nach seiner Größe im Bild richten, und ruhende Objekte sollten gar nicht neu gerechnet werden.
- Die Seifenhaut zeichnet heute ein Netz. Bei durchsichtigen Materialien sieht man an überlappenden Objekten das Innere; das löst
  die lose Naht (Ausblenden je Bildpunkt), sie gehört deshalb zu Etappe 4 und nicht erst zum Feinschliff.

## 9. Recherche

- **FiberMesh** (Nealen, Igarashi, Sorkine, Alexa 2007): Kurven sind die Griffe, die Fläche wird durch sie gerechnet; neue Teile
  entstehen durch einen geschlossenen Strich auf der Fläche und einen Umriss-Strich (Extrusion), die Kurve am Ansatz ist weich oder
  scharf. Kein Verschmelzen getrennter Objekte. Unser Kern ist dieser Ansatz.
- **Plasticity** (NURBS, Parasolid): Vereinigen, Abziehen, Schneiden; die Werkzeuge können bleiben („Keep Tools“); die Schnittkurven
  sind danach echte Kanten, die man direkt abrundet. Lehre: Schnittkurve = Kante = etwas, das man danach anfassen kann.
- **Womp**: Formen aus Abstandsfeldern; jedes Objekt ist „positiv“ oder „negativ“, „Goop“ stellt ein, wie weich es mit den anderen
  verläuft; die Reihenfolge in der Liste bestimmt, wen ein negatives Objekt trifft. Lehre: Verschmelzen und Abziehen als Eigenschaft
  des Objekts, nicht als einmaliger Befehl; alles bleibt verschiebbar.
- **ZBrush Live Boolean, Blender (Boolean- und Mirror-Modifier, Metaballs):** erst eine schnelle Vorschau in der Anzeige, dann auf
  Wunsch das echte Netz. Das ist „lose“ und „fest“.
- **Manifold** (`manifold-3d`, Apache 2.0): robuster Schnitt zweier geschlossener Netze, merkt je Dreieck, aus welchem Netz es stammt.

Quellen: [FiberMesh](https://www-ui.is.s.u-tokyo.ac.jp/~takeo/papers/fibermesh.pdf) ·
[Womp, Goop](https://www.womp.com/blogs/the-ultimate-guide-to-goop-liquid-3d-modeling-thats-changing-everything) ·
[Plasticity, Fillet](https://doc.plasticity.xyz/sketch/fillet) ·
[Plasticity, Boolean (inoffiziell)](https://plasticity-unofficial-document-nakcinpm5-shinjiesaki.vercel.app/solid/boolean) ·
[Manifold, Mesh](https://manifoldcad.org/jsdocs/classes/manifold.Mesh.html) · [manifold-3d](https://npmjs.com/package/manifold-3d)

## 10. Gebaut

| Etappe | Was | Probe, Bild |
| --- | --- | --- |
| Beweis 1 | Freie Form im Kern (`frei.ts`: `spiegelAnwenden`; `hautFrei`, `hautAus` mit `ohnePaare`; Einsetzen und Verdichten geben die Freiheit weiter) | `form-frei.ts`: alles gut |
| 0 | **Donut in Ozzy.** Im Zug schneidet die Anzeige jede Hälfte an der Spiegelebene ab (Seifenhaut, Solid, Zebra; nur dort, wo eine Hälfte wirklich über die Ebene reicht, damit längs der Mitte kein Streifen frei bleibt). Beim Loslassen entsteht die Naht von selbst (`werk.mitteFest(true)` aus `zugEnde`, Schalter `G.clipping`), ist gewählt (als Ganzes und mit ihren Punkten, damit man es sieht), K macht sie rund, ein ⌘Z nimmt Zug und Naht zurück. | `ozzy-donut-fenster.mjs` (an „strange bird“ und mit `KUGEL=1` an einer frischen Kugel: alles gut). Bilder: [vorher](../progress/ozzy/2026-11-18-donut-0-vorher.png), [im Zug](../progress/ozzy/2026-11-18-donut-1-im-zug.png), [Naht](../progress/ozzy/2026-11-18-donut-2-naht.png), [rund](../progress/ozzy/2026-11-18-donut-3-rund.png) |
| 1 | **Zwei Zeiger, Objekt-Modus, L und Q.** V: dunkler Zeiger, die Linien stehen still (keine Punkte, nichts zu greifen), Klick auf die Form wählt sie (darunter hängt ein dunkles Schild mit ihrem Namen), Klick daneben wählt ab, Doppelklick wechselt zu ihren Punkten, ⌫ löscht nur ein gewähltes Objekt. A: weißer Zeiger, alles wie bisher. Keiner tauscht auf der dunklen Rückseite die Farbe (`Szene.zeigerFarbe` in `fluessig.ts`). L wählt alle Punkte des Teils unter dem Zeiger, ⇧ + L nimmt sie heraus; das Lasso liegt auf Q. Leiste: `V A | Lasso P Freihand Formen | Mülleimer`. | `ozzy-modi-fenster.mjs`: alles gut. Bild: [die vier Zeiger](../progress/ozzy/2026-11-18-zeiger.png) |
| 2a | **Spiegel-Knopf, erster Teil.** In der Leiste, mit Zeichen je Zustand; ein Klick schaltet zwischen „an mit Clipping“ und „an“ (`werk.G.clipping`). Ohne Clipping bleibt ein Zug über die Mitte, wie er ist (die Hälften überragen sich, die Anzeige schneidet nicht). Clipping ein: die Fahrt (`spiegelFahrt`, 0,42 s), dann macht das Werk den Schnitt fest, die Naht ist gewählt; ⌘Z trennt wieder und stellt den Knopf zurück. Eine neue Form beginnt mit Clipping. | `ozzy-spiegel-fenster.mjs`: alles gut. [Bilderbogen](../progress/ozzy/2026-11-18-clipping-bogen.png), [Film](../progress/ozzy/2026-11-18-clipping-einschalten.mp4) |
| 2b | **Spiegel aus, an, Clipping an einem ganzen Objekt.** Der Knopf ist jetzt eine Gruppe mit drei Feldern. **Aus** an einer verschmolzenen Form: Sie bleibt ganz und wird frei (`werk.spiegelAus`; Muster und Dehnung der Seifenhaut bleiben stehen), ein Schritt für ⌘Z; danach lässt sich jede Seite für sich formen. **An** an einer freien Form: Ihr Spiegelbild wird gezeigt (Haut und Linien), gerechnet wird ein Netz. **Clipping** an einem freien Objekt, das über die Ebene reicht: die Fahrt, dann eine verschmolzene Form mit Naht (gewählt, K macht sie rund); liegt es neben der Ebene, wartet das Clipping und verschmilzt beim nächsten Loslassen über der Ebene. | `ozzy-spiegel-fenster.mjs` (drei Teile): alles gut. [Bilderbogen](../progress/ozzy/2026-11-18-spiegel-aus-an-clipping-bogen.png), [Film](../progress/ozzy/2026-11-18-spiegel-aus-an-clipping.mp4) (21 s, echte Zeit) |
| 2b | **Objekte bewegen mit V.** Ziehen am Objekt verschiebt es; G, S, R mit Achsen (X, Y, Z), ↩ oder Klick setzt, Esc bricht ab. Ohne Rechnung: Alle Lagen, Linien und Griffe werden abgebildet, die Form bleibt genau dieselbe. Eine verschmolzene Form bleibt in der Spiegelebene. | dritter Teil derselben Probe (`NUR=objekt`) |
| 2b | **Linien an der freien Form.** P quer gibt einen Loop rundum, eine geschlossene Form liegt auf der Seite der Haut, die man sieht (auch in einer gewendeten Ansicht), eine Abzweigung verbindet zwei Punkte; Freihand und Formen ebenso. Jede Linie entsteht für sich. K und Löschen wirken nur an ihr. Trifft ein Strich in Front oder Top nur das gezeigte Spiegelbild, entsteht die Linie an der Form. | `ozzy-frei-linien-fenster.mjs`: alles gut. [Bilderbogen](../progress/ozzy/2026-11-18-frei-linien-bogen.png) |
| 3 (erste Scheibe) | **Mehrere Objekte, das Plus.** Das Plus in der Leiste öffnet das leere Blatt, die vorhandenen Objekte stehen blass darin; zeichnen, ↩ bläst das neue auf (Esc führt zurück). Mit V wählt ein Klick das Objekt unter dem Zeiger (Schild „Form 1“, „Form 2“) und macht es zum aktiven; mit A genauso, dann erscheinen seine Linien und Punkte. Spiegel und ⌘Z gehören dem Objekt. ⌫ im Objekt-Modus und der Mülleimer löschen das aktive, solange es andere gibt. „Luft ablassen“ wirkt am aktiven Objekt. Jedes Objekt rechnet in seiner eigenen Größe (ein kleines hat dasselbe dichte Netz wie ein großes: 1 500 Punkte bei 80 und bei 130 Halbmesser). Der Raum, die Umrisse an den Wänden und alle Materialien zeigen alle Objekte. | `ozzy-objekte-fenster.mjs`: alles gut. [Bilderbogen](../progress/ozzy/2026-11-18-objekte-plus-bogen.png) |
| 3 (der Rest) | **Mehrere Silhouetten, gemeinsamer Rückweg, Szene sichern und laden, Linien ruhender Objekte.** Jede geschlossene Linie auf einem Blatt wird ein Objekt (auch auf dem Blatt des Plus). ⌘Z holt ein gelöschtes Objekt zurück und nimmt den letzten Schritt dort zurück, wo er geschah. Sichern und Laden tragen die ganze Szene. Die Linien eines ruhenden Objekts stehen als feine Striche an den Wänden und in den Ansichten; in den Feldern der Vier Ansichten lässt sich ein ruhendes Objekt anklicken. | `ozzy-reihe-fenster.mjs`, `ozzy-objekte-fenster.mjs` (8b bis 8d); Bildbogen `docs/progress/ozzy/2026-11-18-etappe-3-rest-bogen.png` |
| 4 (erste Fassung) | **Verschmelzen und Abziehen.** Sobald es mehr als ein Objekt gibt, stehen neben dem Plus zwei Knöpfe; sie sind an, wenn das gewählte Objekt ein anderes berührt. **Verschmelzen:** Die zwei werden eine Form. **Abziehen:** Das gewählte Objekt wird aus dem anderen herausgeschnitten. An der Schnittkurve liegt die Naht: eine Linie mit Kante, mit Punkten, gewählt (der weiße Zeiger ist an, K wirkt sofort). Linien, die in die andere Form liefen, enden an der Naht. ⌘Z trennt wieder und gibt das andere Objekt zurück. Der Spiegel: Das Bild bleibt, wie es ist (zwei gespiegelte bleiben gespiegelt; ein Teil mit Spiegelbild verschmilzt auf beiden Seiten; mit einem Teil ohne Spiegel wird die Form ganz und frei). | `ozzy-naht-fenster.mjs` (ohne und mit `LINIE=1`), Tests `naht.test.ts`; Bildbogen `docs/progress/ozzy/2026-11-18-naht-in-ozzy-bogen.png` |

**Beweis 2 (18.11., 17:40 Uhr): die Naht zwischen zwei Objekten.** Ergebnis in Abschnitt 5 (Zeile „Naht zwischen zwei Objekten“).
Was daraus folgt:
- **Verschmelzen und Abziehen mit Kante lassen sich bauen** (Etappe 4): schneiden und verbinden beim Loslassen, die Naht ist danach
  eine Linie mit Punkten, die geschnittenen Linien hängen an ihr. Seit dem 18.11. abends in Ozzy gebaut (nächster Absatz); die
  Kern-Probe misst seitdem am Baustein von Ozzy und kommt auf dieselben Zahlen.
- **Entschieden (Florian, 18.11. abends): „Wie Seifenblasen“.** K macht die Naht weich wie jede andere Linie, die Formen gehen mit
  (die erste Zeile der Tabelle). Der Streifen mit festgehaltener Haut und die Begleitlinien werden nicht gebaut.
- **K an der Naht, was gemessen wurde.** Drei Arten zu runden sind gemessen (Kriterium für eine schmale
  Rundung: außerhalb ihres Streifens bewegt sich die Haut höchstens 0,5):

  | Art | Knick an der Naht (mit Kante 91°) | Wie weit die Form mitgeht | Bild |
  | --- | --- | --- | --- |
  | **K wie heute** (die Naht wird eine weiche Linie) | 17° im Mittel | bis 22,5 an der Naht, bis 7,6 weiter als 100 Einheiten entfernt | ruhig und glatt; beim Verschmelzen ein breites Tal („wie zwei Seifenblasen“), beim Abziehen fällt die Höhle zusammen |
  | **Begleitlinien** (je eine weiche Linie auf jeder Form, 15 neben der Naht) | 27° | bis 9,9, auch außerhalb des Streifens; fern bis 1,3 | **hält das Kriterium nicht**: Eine weiche Linie hält nur ihren Ort, nicht die Richtung der Haut |
  | **außen festhalten** (alles weiter als 15 oder 30 von der Naht bleibt an seinem Ort; der Baustein ist der Halte-Loop vom „Maul formen“) | 35° (Streifen ±15), 25° (±30) | im Streifen bis 3,1 bzw. 5,5; außerhalb 0,00 | hält das Kriterium; **der Rand des Streifens ist als unruhiger Ring zu sehen** (er folgt den Punkten des Netzes) |

  (Für den dritten Weg hätte ein weicher Rand gefehlt; mit Florians Entscheidung entfällt er.)
- **Noch nicht geprüft:** ein verschmolzenes (gespiegeltes) Objekt als Partner; Formen mit sehr verschieden feinen Netzen; eine
  Naht aus mehreren Schnittkurven; Linien, die genau längs der Naht laufen; die lose Naht (Ausblenden je Bildpunkt beim Ziehen).
- Die Bibliothek zieht 32 Pakete nach (für ihr Kommandozeilenwerkzeug); im Produkt braucht es nur zwei ihrer Dateien. Sie steht
  wie alles im Editor unter `devDependencies` von `apps/editor` und wird im Fenster erst beim ersten Verbinden geladen.

**Etappe 4 in Ozzy (18.11., 19:15 Uhr): Verschmelzen und Abziehen, erste Fassung.**

Wie es gebaut ist:
- **Der Baustein** `apps/editor/src/form/naht.ts` (`objekteVerbinden`): Den Schnitt der zwei Netze rechnet die Bibliothek; alle
  Punkte, die es gab, bleiben genau, wo sie lagen, neu sind nur die Punkte der Naht. Linien, die in die andere Form liefen, werden
  an der Naht geschnitten (ihr Pfad genau geteilt) und hängen dort. Die Naht ist ein Loop mit Kante.
- **Gespiegelte Formen:** Verbunden wird die Hälfte z ≥ 0 und dann gespiegelt, so bleiben die Spiegelpaare genau. Die Naht läuft
  dann von der Spiegelebene zur Spiegelebene (ein Ring), eine Linie der Mitte endet an ihren zwei Enden.
- **Der Spiegel, eine Regel: Das Bild bleibt, wie es ist.** Zwei gespiegelte Formen: gespiegelt. Gespiegelt und ein freies Teil mit
  Spiegelbild: gespiegelt, das Teil sitzt danach auf beiden Seiten. Gespiegelt und ein Teil ohne Spiegel: Die Form wird ganz und
  frei (wie „Spiegel aus“), ⌘Z stellt auch das zurück. Zwei freie mit demselben Spiegel: frei wie zuvor.
- **Im Werk** `werk.objektVerbinden`: ein Schritt für ⌘Z; danach räumt das Netz an der Naht auf, und die Haut setzt sich wie nach
  jeder neuen Kante. **In Ozzy** (`main.ts`): `nahtPartner` findet das Objekt, das das gewählte berührt (ihre Kästen überlappen
  sich; bei mehreren das mit der größten Überlappung); ⌘Z hinter den Schritt legt das aufgenommene Objekt wieder dazu.

Gemessen (zwei frische Formen, Halbmesser 130 und 80, je 1 500 Punkte; `ozzy-naht-fenster.mjs`):

| | ohne eigene Linien (dein Standard) | beide mit ihrer Linie der Mitte |
| --- | --- | --- |
| bis verbunden (Klick bis neue Form) | 243 ms | 275 ms |
| Rauminhalt gleich nach dem Verbinden | 11 037 Tsd., wie gerechnet (Summe ohne die Linse) | 11 037 Tsd. |
| nachdem sich die Haut gesetzt hat | 11 329 Tsd. (**+2,6 %**) | 11 039 Tsd. (+0,02 %) |
| Abziehen, nach dem Setzen (gerechnet 8 903 Tsd.) | 9 168 Tsd. (**+3,0 %**) | 8 912 Tsd. (+0,1 %) |
| Naht | ein Ring mit 3 Punkten (mit dem Spiegelbild vier rundum) | derselbe, dazu enden zwei Stücke der Mittellinien an ihr |
| umgeschlagene Dreiecke | 0 | 0 |
| **K an der Naht** | **die Rechnung läuft auseinander; das Werk behält die Form und meldet es** | hält: Die Naht wird weich, die Formen gehen mit, deutlich (Rauminhalt −22 %, an der Naht entsteht ein Hals) |

Dazu 10 Tests des Bausteins (frei, gespiegelt, Teil mit und ohne Spiegelbild, Fehlerfälle) und die Kern-Probe `form-naht.ts`.

**Was an Etappe 4 offen bleibt** (die erste Fassung ist benutzbar, aber nicht fertig):
1. **K an der Naht an Formen ohne eigene Linien hält nicht** (Tabelle). Du hast „Wie Seifenblasen“ gewählt: Die Naht ist dann eine
   weiche Linie wie jede andere, und eine einzelne weiche Linie an einem scharfen Knick hat in der heutigen Rechnung keinen festen
   Ausgang. Mit eigenen Linien an den Formen hält es. **Steht aus, dein Wort (18.11. spät):** „Ich weiß noch nicht wie das gelöst
   werden soll. Vllt starte ich auch schon mit edgeloops und es gibt dann den fall ohne gar nicht...das muss ich noch erörtern“.
   Bis dahin wird dazu nichts bewiesen und nichts gebaut; das Werk behält in dem Fall die Form.
2. **Nach dem Verbinden wächst eine Form ohne eigene Linien um rund 3 %** (die Haut setzt sich an ihrer ersten Linie; mit eigenen
   Linien bleibt sie stehen). Das ist dieselbe Rechnung wie nach jeder ersten Linie an einer frischen Form.
3. **Der Spiegel:** Ein Objekt, das sein Spiegelbild zeigt, und eines ohne (beide frei) lassen sich noch nicht verbinden (Meldung:
   erst bei beiden denselben Spiegel wählen). Ein Teil mit Spiegelbild, das über die Spiegelebene reicht, erst mit Clipping.
4. **Linien, die an der Naht hängen:** An einer solchen Form lässt sich der Spiegel danach nicht ausschalten und nicht an der Ebene
   verschmelzen (hängende Linien sind dort noch nicht ausgeschrieben; derselbe offene Punkt wie in Etappe 2).
5. Formen mit einem Maul lassen sich noch nicht verbinden.
6. **Kein lebendes Verbinden:** Verschmelzen ist ein Schritt. Die Teile danach wieder verschieben oder auseinanderziehen (Hals,
   Abriss) ist Etappe 5; bis dahin trennt ⌘Z. Einen Schalter je Objekt („dieses Objekt zieht ab“) gibt es deshalb noch nicht.
7. Verbunden wird immer mit einem Objekt (dem mit der größten Überlappung); berührt das gewählte mehrere, eines nach dem anderen.
8. Keine Fahrt beim Verschmelzen (die Haut wechselt mit einem Schnitt). Die Knöpfe haben noch keine Tasten, ihre Zeichen sind ein
   erster Entwurf.
9. Am gewählten Naht-Ring bietet Ozzy „Maul“ an (wie an jedem Ring mit Kante). „Luft ablassen“ zeigt nur die Zeichnung des
   Objekts, das geblieben ist.
10. Nicht geprüft: Formen mit sehr verschieden feinen Netzen, eine Naht aus mehreren Schnittkurven, Linien längs der Naht, große
    Formen (deine gesicherten haben 3 500 bis 11 400 Punkte; im Kern 85 ms bei zweimal 5 200).

**Geprüft am 18.11., 19:10 Uhr (Etappe 4, erste Fassung):** Typen, Lint, 35 Tests des Fensters (10 neue), alle 37 Fenster-Proben
gegen 5211, die Kern-Probe `form-naht.ts` für beide Arten. Am Kern (`packages/shape`) ist nichts geändert.

**Etappe 3, der Rest (18.11., spät).** Du hast gewählt: „Mach erstmal den rest von etappe 3.“

- **Mehrere Silhouetten auf einem Blatt.** Jede geschlossene Linie wird ein Objekt. ↩ bläst die größte auf wie immer; die anderen
  folgen der Reihe nach, rascher (2,5-fach), die Kamera bleibt dabei im Raum, und der Raum richtet sich von Anfang an nach allen.
  Am Ende ist die größte „Form 1“ und gewählt. Gilt genauso auf dem Blatt des Plus. Gemessen an drei Kreisen: 4,8 s vom ↩, bis
  alle stehen; jede Form liegt auf 0,2 Bildpunkte, wo sie gezeichnet wurde. Solange die Reihe läuft, ruht die Bedienung.
- **Der gemeinsame Rückweg.** ⌘Z nimmt den letzten Schritt zurück, wo er geschah: Lag er an einem anderen Objekt, wird es dafür
  gewählt (die Meldung sagt es). Ein gelöschtes Objekt kommt mit ⌘Z zurück, mit seinem eigenen Rückweg. Eine Nummer („Form 2“)
  wird nicht noch einmal vergeben, solange ihr Objekt zurückkommen kann.
- **Sichern und Laden tragen die ganze Szene:** alle Objekte mit Lage, Größe und Spiegel; dasselbe Objekt ist danach gewählt.
  Die Datei bleibt eine Wesen-Datei (das Prüffenster lädt aus ihr die gewählte Form, wie bisher), ältere Dateien laden wie
  bisher. Gemessen: fünf Objekte gesichert und geladen, Unterschied in Lage und Größe 0,000.
- **Linien ruhender Objekte** stehen als feine Striche an allen drei Wänden, in der eingerasteten Ansicht und in den Feldern der
  Vier Ansichten (ohne Punkte; zu greifen sind sie, sobald das Objekt gewählt ist). An der Rückwand stehen jetzt auch die Umrisse
  der ruhenden Objekte (sie fehlten dort).
- **Kleines:** In den Feldern der Vier Ansichten macht ein Klick auf ein ruhendes Objekt es zum gewählten. Auf dem Blatt des Plus
  steht der Schriftzug nicht mehr über den blassen Objekten.

**Geprüft am 18.11., spät (Etappe 3, der Rest):** Typen, Lint, 35 Tests des Fensters, alle 38 Fenster-Proben gegen 5211. Am Kern
(`packages/shape`) ist nichts geändert.

**Was an Etappe 3 offen bleibt:**
1. **Die Fahrt zum Blatt beim Plus:** Es wechselt weiter mit einem Schnitt aufs Blatt (keine Fahrt wie beim Luftablassen).
   **Dein Wort (18.11. spät): „Du kannst die fahrt erstmal weglassen. Das gehört dann zum feinschliff“.** Sie wird jetzt nicht
   gebaut und steht für den Feinschliff (Etappe 6).
2. **Die Reihe bläst nacheinander auf, nicht alle zugleich** (das Werk rechnet immer an einer Form). Ob das Tempo und die
   Reihenfolge so gefallen, ist dein Urteil.
3. **⌘Z nimmt „neues Objekt“ nicht zurück** (löschen lässt es sich mit ⌫, und das Löschen lässt sich zurücknehmen). ⌘Z auf dem
   Blatt eines Objekts aus einer Reihe kann die Zeichnung der anderen zurückholen.
4. Die Linien ruhender Objekte sind Striche ohne Verdeckung: An der Form selbst (Kurvennetz, Taste W) stehen nur die Linien des
   gewählten Objekts, und seine Linien gelten hinter einem ruhenden nicht als verdeckt.
5. Jede geschlossene Linie wird ein Objekt, auch eine, die ganz in einer anderen liegt (sie sitzt dann im Inneren).
6. S (skalieren) mit V ändert die Punkte samt Netzmaß; besser wäre, nur das Maß des Objekts zu ändern. Nicht gemessen, ob ein
   stark verkleinertes Objekt sich anders anfühlt.
7. Tempo mit vielen Objekten ist nicht gemessen. Ruhende Objekte kosten in der Seifenhaut nichts je Bild; die festen Materialien
   laden bei jedem Zug das Netz aller Objekte neu hoch.
8. Der Rückweg wird nicht gesichert (wie bisher).

**Geprüft am 18.11., 16:30 Uhr:** Typen (`@ee/shape`, `@ee/editor`), Lint der geänderten Dateien, 200 Tests des Kerns, 25 des
Fensters, alle 35 Fenster-Proben gegen 5211, dazu `form-donut-fenster.mjs` im Prüffenster mit `&clipping=0` (die Regel vom 13.11.).

**Was an Etappe 2b offen bleibt:** die ersten neun Punkte von Abschnitt 8 („Aus dieser Sitzung“). Dazu ein Fund, der behoben ist:
An einer freien Form hatte das Löschen eines Punkts auf der Seite z < 0 die alte Donut-Regel ausgelöst („Punkt hinter der Mitte
löschen macht den Schnitt fest“) und die ganze Form an der Ebene verschmolzen. Die Regel gilt jetzt nur noch im Prüffenster mit
`?clipping=0` und nie an einer freien Form; in Ozzy löscht Löschen.

**Was an Etappe 2a offen bleibt:** (1) Der Zustand des Spiegels wird noch nicht mit der Form gesichert (eine geladene Form beginnt
mit Clipping). (2) In der Pose und während „Maul formen“ ist der Knopf aus; mit einem Maul lässt sich der Spiegel nicht ausschalten.

**Was an Etappe 1 offen bleibt:** (1) Verschieben, Skalieren und Drehen mit V sind seit Etappe 2b da. (2) An der Seifenhaut zeigt nur das Schild, was gewählt ist; ein Umriss am
gewählten Objekt kommt mit Etappe 3 (dann je Objekt). (3) Auf dem Blatt gilt V noch wie A (weißer Zeiger): Ganze Linien verschieben
kommt mit den mehreren Silhouetten in Etappe 3.

**Was an Etappe 0 offen bleibt:** (1) Wo die Hälften flach aufeinandertreffen, ist die Naht als Kante eine Schneide; direkt an ihr
zählt die Probe an „strange bird“ 8 sehr schmale umgeschlagene Dreiecke (das größte ein Achtel eines mittleren Dreiecks), mit K sind
es 0. Zu sehen ist davon nichts. (2) Mit einem Maul und in der Pose entsteht keine Naht (so war es schon am 13.11.); die Form bleibt
dann lose, und die Statuszeile sagt es. (3) Reicht das Loch bis an die Linie der Mitte (ein Zug dicht am Umriss), kann der Kern
nicht schneiden; auch dann bleibt die Form lose. (4) Jelly, helles Solid, Grün, die Wände und der weiße Körper zeigen im Zug noch
beide Hälften ganz.

**Geprüft am 18.11., 14 Uhr (Etappe 0 bis 2a):** Typen, Lint, 190 Tests des Kerns, 25 des Fensters,
alle 33 Fenster-Proben gegen 5211 (`ozzy-silhouette` hielt in einem von drei Läufen nicht: der erste Griff an einer frischen Form
mit einer Linie schwankt, am unveränderten Stand genauso).

## Anhang A: Dein Auftrag (18.11.2026, wörtlich)

> […] in dieser session möchte ich ein paar coole features einbauen. Aktuell geht in Ozzy der donut effekt nichtmehr. Ich
> weiß nicht warum die andere session ihn nicht übernommen hat.
>
> Ich möchte hier ein elegantes system erarbeiten um weitere objekte einzufügen und an der spiegelung arbeiten.
>
> Was dazu alles nötig ist:
>
> 1. Wie bei blender oder illustrator brauche ich einen object mode. bei meinem fall dargestellt von einem dunklen statt weißen
>    cursor. auf schwarz darf es also nicht die farbe tauschen. damit man mit weißem und schwarzem cursor nicht durcheinander kommt.
> 2. V ist schwarzer cursor für das ganze objekt und A ist weißer cursor für die punkte (edit) wie bei illustrator. P bleibt das
>    linienwerkzeug
> 3. Wie bei blender kann ein objekt auch aus mehrerer meshes bestehen und diese kann ich ebenfalls wie bei blender mit l auswählen
>    wenn ich darüber fahre. deselektieren auch wie bei blender. L ist aktuell das lasso werkzeug. Das belegen wir dann anders.
> 4. Ich möchte einen multifunktionsknopf für den mirrormodifier. jedes objekt kann unabhängig voneinander verschiedene
>    mirroreinstellungen haben.
> 5. Der knopf: der knopf kann folgende states haben. mirror an, mirror aus, mirror an mit clipping. Ich möchte auch dass der donut
>    wieder sauber funktioniert und dass ich mirror modifier applien kann, dann ist es nichtmehr gespiegelt sondern ein ganzes mesh
>    und ich kann asymetrische dinge gestalten. Ohne mirror kann ich ein objekt frei bewegen. mit mirror spiegelt es sich und die
>    seiten können sich überragen. Mit clipping verschmelzen die spiegelkanten zu einem edgeloop. Wie beim donut soll dann erstmal
>    eine harte kante entstehen. Die regel vom donut, dass man den rot markierten punkt dann erst löschen muss entfällt. nach dem
>    loslassen entsteht der edgeloop an der spiegelkante von selbst und ist ausgewählt. mit k macht an ihn smooth.
> 6. Ich kann mirrorhälften erst ohne clipping ineienanderschieben und dann clipping einschalten um sie zu verschmelzen. Gerne mit
>    einer schönen animation.
> 7. neue objekte sollen auf genauso coole weise wie das erste objekt ins spiel aufgeblasen werden und auch beim ersten einzeichnen
>    können bereits mehrere objekte eingezeichnet werden die dann aufgeblasen werden. Ich will einen klinen + button oben rechts.
>    Überlege dir bitte die optimale bedienung für das erstellen zusätzlicher objekte. Vielleicht über ein + in der werkzeugleiste
>    statt rechts oben. wenn man es klickt öffnet sich die seitenansicht.
> 8. Objekte sollen genau wie beim mirror auch über einen edgeloop verschmelzen können. Ich kann sie frei platzieren und
>    ineinanderschieben. wenn ich die beiden selectireten objekte dann verschmelzerundet der edgloop ab. Es soll aber nur eine art
>    hilfsedgeloop sein, der smooth entsteht wenn ich objekte ineinanderschiebe. Ich kann ihn auch ein und ausschalten pro objekt.
>    wenn er eingeschaltet ist wird der hilfsedgkoop bedienbar und rund. die überschneidung ist ausgeblendet. wenn ich den hilfsloop
>    bearbeite, verändert das beide meshes so dass es immer passt. ich kann objekte dann auch einfach wieder auseinanderschieben und
>    der hilfsedgloop verschwindet. Das auseinanderziehen wirkt dann als würden sich zwei seifenblasen über einen schmaler werdenden
>    hals trennen.
> 9. Ich würde gerne auch objekte voneinander subtrahieren können, so dass es eine saubere kante ergibt. Das könnten wir später dann
>    vllt auch für das maul nutzen. Als vorbild dafür gelten womp 3d und plasticty. Wie können wir ein solches system optimal auf
>    unsere kurven übertragen?
> 10. Wichtig ist dass immer alles exakt den kurven folgt und neue edgeloops beim verschmelzen smooth sind und die form genau an den
>     kurven anliegt. Auch komplexe formen mit teuren materialien wie blasenhaut sollen immer und bei jeder zoomstufe smooth aussehen
>     und die bedienung muss immer flüssig und ohne stocken, verzögerung oder dämpfung arbeiten.
>
> Sei bitte wirklich kreativ und ehrlich und suche dabei immer die eleganteste und optimale lösung. Du kannst gerne auch
> recherchieren wie andere programme wie plasticity so etwas machen oder fibermesh und nurbs editoren.
>
> Eine Andere Sitzung hat bereits viel an Ozzy opzimiert aber es gibt vor allem für Performance und Anzeige noch sehr viel zu tun.
> Ließ genau den stand nach und schau auch selbst nochmal ob man etwas besser machen kann. Lass uns erstmal die becshriebenen
> features einbauen und dann sehen wo wir mit seifenhaut, performance und bedienung stehen. Halte alle offenen punkte aber klar als
> noch ausstehend fest.
