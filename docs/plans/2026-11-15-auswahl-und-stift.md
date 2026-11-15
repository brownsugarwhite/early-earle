# Auswahl und Werkzeug P: Konzept (15.11.2026)

Teil des Strangs „Linien, Punkte, Zeiger“ ([Plan vom 14.11.](2026-11-14-linien-zeiger-tropfen.md), [Richtungen statt
Griffe](2026-11-15-richtungen-statt-griffe.md)). **Freigegeben am 15.11. abends** mit Florians Antworten auf die vier Fragen
(Abschnitt „Florians Antworten“ am Ende; wo sie von den Tabellen abweichen, gelten sie). Die Bilder sind gestellte Standbilder im echten Look der Proben, noch kein Verhalten:

- `docs/progress/linien/2026-11-15-konzept-stift-2d.png`: an seinem Fisch. Ein Loop unter dem Auge, die Auswahl am Auge; neun
  Bilder.
- `docs/progress/linien/2026-11-15-konzept-stift-raum.png`: an „teat firefish“, ein Ring um den Schwanz über die Mitte, schräg von
  hinten gesehen; drei Bilder. Der Ring folgt dort dem Schnitt der Haut mit einer Ebene quer zum Körper.
- Skripte: `apps/editor/scripts/linien/konzept-stift.mjs` und `konzept-stift-raum.mjs`.

## Florians Auftrag (15.11., wörtlich)

> „kann der cursor nach dem klick auf dem punkt bleiben statt zu seiner alten position zurückzugleiten? Und kann der übergang von
> normaler verdickung zur nadel noch smoother sein. Es soll immer fließen und nicht springen. Das Konzept an sich hast du sehr gut
> gemacht!
>
> Es gibt noch ein paar offene punkte. Momentan kann ich keinen punkt auswählen und es soll auch eine mehrfachselektion stattfinden
> können. Das Werkzeig P wird später für sehr vieles verwendung finden wie im editor. Ich würde gerne auch sehen wie ich damit
> eigene edgeloops ziehe. Es soll rein von der funktion wie das werkzeug P in illustrator funktionieren.
>
> Es soll aber auch hier wunderschön funktionieren im style und anmut harmonierend mit dem liquid drop design das wir bis jetzt hier
> erarbeitet haben.“

## Schon gebaut (15.11. nachmittags): Der Zeiger bleibt, die Schwellung fließt

- **Zeiger:** Nach dem Klick bleibt der gezeichnete Zeiger auf der Stelle (Punkt, Linie, Spitze des Griffs). Zur Maus findet er
  erst zurück, wenn sie sich bewegt: nach 40 px Weg zu knapp zwei Dritteln, nie von selbst. Was der Zeiger trifft, entscheidet
  der gezeichnete Zeiger.
- **Schwellung und Nadel sind eine Form.** Mitte, Reichweite je Seite, Höhe je Seite und Taille sind Federn. Kommt der Zeiger in
  die Nadel, fließt die Spindel die Linie entlang in den Punkt und wird dort zur Nadel. Vorher verschwand sie am Zeiger, und die
  Nadel erschien am Punkt. Schon beim Anflug hat die Linie die Form, die sie beim Treffen hat. Am Ende der Nadel hält sie ein
  Siebtel länger, damit nichts hin und her springt.
- Gemessen gegen den Stand von heute Mittag, auf demselben Weg (`scripts/linien/fliessen-film.mjs`):

  | | vorher | nachher |
  | --- | --- | --- |
  | Bilder mit zwei Buckeln auf der Linie | 10 | 0 |
  | tiefste Stärke beim Wechsel | 50 % | 91 % |
  | Abstand des Zeigers vom Punkt nach dem Klick | 6,75 px | 0 |
  | Rest des Versatzes nach 50 px Mausweg | – | 29 % |

  Film und Streifen: `docs/progress/linien/2026-11-15-fliessen-film.mp4` (links vorher, rechts nachher) und
  `…-fliessen-streifen.png`. `richtung-probe.mjs` und `stift-probe.mjs` halten.

## Die Idee in drei Sätzen

P ist eine Feder mit einem Tropfen Tinte. Wo man klickt, fällt er als Punkt, und vom letzten Punkt zum Zeiger spannt sich ein Faden,
die nächste Linie. Ziehen gibt dem Punkt Schwung, genau wie in Illustrator. Was schon da ist, nimmt den Faden auf: ein Punkt, eine
Linie, im Raum die Mitte. Eine Linie ist fertig, sobald sie an beiden Enden hängt. Gewählt ist, was angeschwollen bleibt.

## Werkzeug P: Bedienung wie in Illustrator

| Geste | Illustrator | hier |
| --- | --- | --- |
| Klick ins Leere | Ankerpunkt (Ecke) | Der Tropfen fällt als Punkt (Ecke), der Faden hängt an ihm (Bild 2) |
| Klicken und Ziehen | glatter Punkt, beide Griffe | Griffe ziehen sich als Haarlinien mit Perlen aus dem Punkt, beide Seiten gespiegelt (Bild 3); wie der Griff beim Drehen |
| ⌥ beim Ziehen | Griff brechen | Nur die neue Richtung folgt, am Punkt schnürt sich die Taille (Knick, Bild 4), wie beim Drehen |
| ⇧ | 45°-Schritte | 45°-Schritte für Linie und Griff |
| Leertaste beim Ziehen | Punkt verschieben | Punkt verschieben |
| zwischen den Klicks | Vorschau (Gummiband) | Der Faden ist die nächste Linie genau so, wie sie wird: eine Haarlinie, die zum Tropfen an der Feder hin anschwillt |
| Zeiger am ersten Punkt | Schließen („o“) | Der Punkt öffnet sich zum Ring, der Faden zieht sich zu ihm (Bild 5). Klick schließt den Loop, eine Welle läuft einmal herum (Bild 6). Ziehen schließt glatt |
| Klick auf den letzten Punkt | Griff einziehen | Seine neue Richtung fließt in ihn zurück, die nächste Linie beginnt gerade |
| Esc oder ↩ | offen beenden | Der Faden fließt in den letzten Punkt zurück, die Linie bleibt offen |
| ⌫ beim Zeichnen | letzten Punkt löschen | Der letzte Punkt fließt in den vorletzten zurück |
| auf einer Linie, nicht zeichnend | Punkt hinzufügen („+“) | Perle in der Linie, Klick setzt den Punkt (gebaut) |
| am Ende einer offenen Linie | weiterzeichnen („/“) | Das Ende schwillt, Klick zeichnet dort weiter |
| auf einem Punkt, nicht zeichnend | Punkt löschen („−“) | **Frage 1:** Vorschlag: eine Abzweigung beginnen, wie heute P im Editor. Löschen geht über Auswahl und ⌫ |

## Im Netz: Punkte teilen, abzweigen, kreuzen

Das ist der Teil, den Illustrator nicht kennt; er kommt aus den Abzweigungen im Editor (14.11.).

- **Abzweigen:** Beginnt man auf einem Punkt oder einer Linie, hängt die neue Linie dort an. Auf einer Linie entsteht der Punkt
  dabei (wie heute im Editor).
- **Anhängen:** Ein Klick auf einen vorhandenen Punkt oder eine Linie hängt die neue Linie dort an (ein gemeinsamer Punkt). Kommt
  der Faden heran, schwillt das Vorhandene an (Punkt: Stern, Linie: Perle), und der Faden verschmilzt weich mit ihm.
- **Kreuzen:** Läuft der Faden zwischen zwei Klicks über eine Linie, teilen beide dort einen Punkt, ohne dass man ihn trifft
  (Bild 6, zwei Kreuzungen). So macht es der Editor schon.
- **Eine Regel für das Ende:** Eine Linie ist fertig, sobald sie an beiden Enden hängt: an sich selbst (Loop), an Vorhandenem
  (Punkt, Linie) oder im Raum an der Mitte (Ring). Bis dahin zeichnet P weiter, auch durch Vorhandenes hindurch (dort ein
  gemeinsamer Punkt). Esc lässt sie offen.
  - Von Punkt zu Punkt sind es zwei Klicks, wie heute im Editor (sein Beispiel Kreis, Kreuz, Horn).
  - Ein frei begonnener Loop läuft durch vorhandene Punkte, bis man den Anfang trifft.
  - **Frage 2:** diese Regel, oder immer wie Illustrator (weiter bis Anfang, Esc oder ↩)?

## Edge Loops im Raum

- **Auf der Haut:** Der Tropfen liegt auf der Haut unter dem Zeiger, Punkte entstehen auf ihr. Der Faden läuft über die Haut, nie
  durch sie hindurch. Griffe zieht man in der Ebene der Haut wie beim Drehen; ⇧ beim Drücken hebt sie heraus.
- **Spiegelgleich:** Was man auf einer Seite zeichnet, entsteht auf der anderen mit, wie beim Punktsetzen mit P. Was hinter der
  Form liegt, ist grün.
- **Die Mitte:** Kommt der Zeiger in ihre Nähe, zeigt sie sich als Punktreihe auf der Haut, nur nahe am Zeiger (Raum, Bild 1). Der
  Tropfen rastet auf ihr ein. Ein Punkt auf der Mitte ist ein Spiegelpunkt.
- **Ring um den Körper:** Man beginnt an der Mitte, setzt Punkte über die Flanke und klickt wieder auf die Mitte (Raum, Bild 2).
  Dann hängt die Linie an beiden Enden: Mit ihrem Spiegelbild ist sie ein Ring um den Körper, und die Welle läuft einmal um beide
  Hälften (Raum, Bild 3). So speichert der Editor Ringe heute schon: die Hälfte mit z ≥ 0, die Enden auf der Mitte.
- Ein Loop auf einer Seite, der die Mitte nicht berührt, bildet mit seinem Spiegelbild ein Paar.

## Auswahl

- **Klick auf einen Punkt:** gewählt. Er bleibt ein Tropfen (4 px), und seine Linien schwellen ruhig an, ein kleiner Stern (Bild 7).
  Drücken und Ziehen verschiebt ihn wie bisher.
- **⇧-Klick:** dazu oder weg.
- **Ziehen im Leeren:** ein Rahmen aus einer Haarlinie mit runden Ecken. Punkte darin schwellen an, während er über sie streicht
  (Bild 8). Beim Loslassen zieht er sich um die Auswahl zusammen und vergeht. Mit ⇧ kommt dazu.
- **Doppelklick auf eine Linie:** alle ihre Punkte, der ganze Loop. Eine Welle läuft die Linie entlang (Bild 9). Das entspricht
  ⌥-Klick in Blender.
- **Ziehen an einem gewählten Punkt:** Alle gewählten gehen genau um denselben Weg mit.
- **⌫:** Die gewählten Punkte verschwinden. Die Linie läuft durch die Nachbarn weiter, so nah am alten Verlauf wie möglich.
- **Esc oder Klick ins Leere:** Auswahl weg. **⌘A:** alle.
- **Im Raum (Frage 3):** Ziehen im Leeren dreht dort heute die Ansicht.
  - Vorschlag: überall gleich, Ziehen im Leeren zieht den Rahmen (wie in 2D und in Blender). Die Ansicht dreht man mit zwei Fingern
    (geht schon) oder mit ⌥ + Ziehen.
  - Andere Möglichkeit: Ziehen dreht weiter, und der Rahmen kommt mit ⌘ + Ziehen.

## Flüssig bei allem

- Was gemeint ist, schwillt an; was losgelassen wird, fließt zurück (wie bisher).
- Neu in der Formensprache:
  - der Tropfen an der Feder (P ist geladen);
  - der Faden (die nächste Linie);
  - der Ring am ersten Punkt (schließen);
  - die Welle (fertig);
  - die Punktreihe der Mitte (Raum);
  - der ruhige kleine Stern (gewählt);
  - der Rahmen.
- Klick ins Leere: Der Tropfen fällt und fließt in den Punkt. An der Feder bildet sich ein neuer, aus der Spitze nachgeschoben.
- Nichts erscheint auf einen Schlag, und nichts springt. Die neuen Formen sind Federn wie die Schwellung.

## Was die Probe nach dem Bau beweisen muss (vorher festgelegt)

- **2D, sein Fisch:** einen Loop mit vier Punkten zeichnen, zwei davon geklickt und zwei gezogen, einer mit ⌥, dann schließen.
  - Die Linie ist geschlossen und hat vier Punkte plus die Kreuzungen mit vorhandenen Linien.
  - Die Griffe stehen genau so, wie gezogen (Abweichung unter 0,01).
  - Die Linie nach dem Klick ist genau der Faden vor dem Klick (kein Sprung).
  - Von Punkt zu Punkt: zwei Klicks, die neue Linie teilt beide Punkte.
- **Raum, „teat firefish“:** ein Ring von der Mitte über die Flanke zur Mitte.
  - Beide Enden liegen genau auf z = 0, das Spiegelbild ist genau gespiegelt.
  - Alle Punkte liegen auf der Haut (Abstand unter 0,5 % des Radius).
  - Der Faden ist auf der sichtbaren Seite nie grün.
- **Auswahl:**
  - Der Rahmen wählt genau die Punkte darin, ⇧ fügt hinzu.
  - Ziehen bewegt alle gewählten genau um den Mausweg.
  - ⌫ löscht, und die Linie bleibt geschlossen.
- Dazu ein Film je Probe, vom echten Verhalten, Bild für Bild.

## Fragen an Florian

1. P auf einem vorhandenen Punkt, wenn man nicht zeichnet: eine Abzweigung beginnen, wie im Editor (Vorschlag), oder löschen wie
   in Illustrator?
2. Ende einer Linie: „fertig, sobald sie an beiden Enden hängt“ (Vorschlag), oder immer wie Illustrator weiterzeichnen bis zum
   Anfang, Esc oder ↩?
3. Rahmen im Raum: Ziehen im Leeren wie in 2D, die Ansicht dreht mit zwei Fingern oder ⌥ + Ziehen (Vorschlag), oder ⌘ + Ziehen?
4. Gewählt: Tropfen mit ruhigem kleinem Stern (Vorschlag), oder deutlicher?

## Florians Antworten (15.11. abends, wörtlich) und was daraus folgt

> „1. Abzweigung beginnen. schon der erste punkt soll ziehbar sein um eine kurve zu erzeugen.
> 2. Linie ist fertig wenn sich der loop schließt. Man kann mit esc abbrechen. Aber im gegensatz zum jetzigen editor, soll man wenn
> ma eine linie beginnt und auf einen anderen punkt die verbindung zieht auch dieser ziehbar sein und das ist dann sein zweites
> handlepaar des punktes. Beim schließen eines loops auch wie bei illustrator auch den letzten verbindenden punt ziehen um die
> exakte endverbindung/krümmung einzustellen. Nicht einfach rund verbinden...wenn zwei (oder mehr) punkte verbunden sind und ich
> enter drücke, soll auch die linie entstehen. Offene enden soll es nicht geben. Nur loop. Ich bin nicht sicher ob der aktuelle
> editor das zulässt.
> 3. ⌥ + Ziehen...die genaue tastenbelegung müssen woir später noch ausarbeiten
> 4. Versuchen wirs erstmal so“

Damit gilt für den Bau (ersetzt die Zeilen oben, wo sie abweichen):

- **Ziehen an jedem Punkt, auch am ersten und am letzten.** Beginnt die Linie auf einem vorhandenen Punkt (oder auf einer Linie,
  dort entsteht er), gibt Ziehen ihr dort Schwung. Endet sie auf einem vorhandenen Punkt oder einer Linie, gibt Ziehen dort genauso
  Schwung. Das ist das zweite Griffpaar des Punkts: Seine eigene Linie behält ihr Paar, die neue bekommt ein eigenes. Beim Ziehen
  zeigen sich beide Griffe des Paars.
- **Schließen wie in Illustrator:** Ziehen auf dem ersten Punkt stellt die Krümmung der Verbindung genau ein. Ohne ⌥ ändern sich
  beide Griffe des ersten Punkts (er bleibt rund), mit ⌥ nur der Griff der Schlussverbindung.
- **Keine offenen Enden, nur Loops.** Eine Linie ist fertig, sobald sie kein offenes Ende mehr hat: Sie schließt sich auf ihrem
  ersten Punkt, oder sie hängt mit beiden Enden an Vorhandenem (Abzweigung). Frei begonnen läuft sie durch Vorhandenes hindurch,
  bis sie sich schließt.
- **↩ schließt:** Sind zwei oder mehr Punkte verbunden, verbindet ↩ den letzten mit dem ersten, wie ein Klick auf den ersten Punkt.
- **Esc bricht ab:** Die angefangene Linie verschwindet samt ihren Kreuzungspunkten. Ein Punkt, den P auf eine vorhandene Linie
  gesetzt hat, bleibt (das ist das Punktsetzen von heute).
- **Im Raum:** Ziehen im Leeren zieht den Rahmen, ⌥ + Ziehen dreht die Ansicht, ⌥ + ⇧ + Ziehen verschiebt sie (wie Blender mit
  nachgebildeter Mitteltaste), zwei Finger drehen, Pinch zoomt. Vorläufig, die Tastenbelegung arbeiten wir später aus.
- **Gewählt:** Tropfen mit ruhigem kleinem Stern, wie im Bild.
- Werkzeuge: P zeichnet, V (oder Esc, wenn nichts gezeichnet wird) wählt aus.

Zu seiner Frage, ob der Editor das zulässt: Im Bau-Fenster (Abzweigungen vom 14.11.) ist eine Linie schon entweder geschlossen oder
sie hängt an beiden Enden an Punkten anderer Linien (ein Ende darf auf der Mitte liegen, mit dem Spiegelbild ist sie dann ein Ring).
Ein freies offenes Ende gibt es dort nicht. Es fehlen dort das Ziehen am ersten und letzten Punkt, ↩ und das Schließen mit Ziehen.

### Probe nach dem Bau (an seine Antworten angepasst)

- **2D, sein Fisch:**
  - Ein Loop mit vier Punkten, zwei geklickt, zwei gezogen (einer mit ⌥), geschlossen mit Ziehen auf dem ersten Punkt: geschlossen,
    vier Punkte plus Kreuzungen, Griffe genau wie gezogen (Abweichung unter 0,01), die Linie nach jedem Klick genau der Faden davor.
  - Eine Abzweigung von Punkt zu Punkt, an beiden Enden gezogen: Beide Punkte haben ihr altes Griffpaar unverändert und für die neue
    Linie den gezogenen Griff.
  - Ein freier Anfang, zwei Punkte, ↩: geschlossen. Esc mitten im Zeichnen: Das Netz ist wieder wie vorher.
- **Raum, „teat firefish“:** Ring von der Mitte über die Flanke zur Mitte: beide Enden genau auf z = 0, das Spiegelbild genau
  gespiegelt, alle Punkte auf der Haut (unter 0,5 % des Radius), der Faden auf der sichtbaren Seite nie grün.
- **Auswahl:** Rahmen wählt genau die Punkte darin, ⇧ fügt hinzu; Ziehen bewegt alle gewählten genau um den Mausweg; ⌫ löscht, die
  Linie bleibt geschlossen.
- Ein Film je Probe vom echten Verhalten.

## Gebaut (15.11. abends)

In beiden Proben (`linien.html`, `raum.html`, Port 5199), mit seinen Antworten. Code: `apps/editor/src/linien/stift.ts` (P, Rechnung
in 2D, Schnittstelle `StiftWerk`), `auswahl.ts` (Auswahl in 2D), `verhalten.ts` (Ablauf und Aussehen), `raum.ts` (P und Auswahl auf
der Haut).

- **P:** Der Tropfen hängt an der Feder; ein Klick lässt ihn als Punkt fallen, an der Feder wächst ein neuer nach. Der Faden ist die
  nächste Linie genau so, wie sie wird, und schwillt zum Tropfen hin an; wo er Linien kreuzt, wachsen Punkte. Ziehen zieht beide
  Griffe aus dem Punkt (Haarlinie mit Perle), ⌥ bricht (die alte Lage grün), ⇧ 45°, Leertaste verschiebt den Punkt. Am ersten Punkt
  öffnet sich ein Ring; Klick oder Ziehen schließt, ↩ ebenso, eine Welle läuft einmal herum. Esc bricht ab, ⌫ nimmt den letzten
  Punkt zurück. Auf Vorhandenem beginnen oder enden ist eine Abzweigung mit eigenem Griffpaar dort.
- **Im Raum:** Punkte entstehen auf der Haut, die Spiegelseite zeichnet mit (grün dahinter). Nahe der Mitte zeigt sie sich als
  Punktreihe, P rastet ein; von der Mitte über die Flanke zurück zur Mitte wird mit dem Spiegelbild ein Ring. Der Faden und die
  neue Linie liegen auf der Haut.
- **Auswahl:** Klick, ⇧, Rahmen, Doppelklick auf eine Linie (der Loop mit Welle), Ziehen aller gewählten, ⌫ (die Punkte vergehen,
  die Linie läuft angepasst weiter), Esc, ⌘A. Gewählt: Tropfen mit ruhigem kleinem Stern. Im Raum wählt der Rahmen nur Sichtbares.
  Punkte, die zwei Linien teilen (Kreuzungen, Enden von Abzweigungen), bleiben bei ⌫ stehen und gewählt, wie im Editor
  („Kreuzungen bleiben, solange sich die Loops kreuzen“).
- **Kreuzungen im Raum** (nachgebaut am selben Abend, Florian: „Kreuzungen bauen“): Gesucht wird auf der Haut, unabhängig von der
  Ansicht, also auch hinten: Stücke, die sich näher als 3 % des Radius kommen, deren Haut in dieselbe Richtung zeigt (nicht über eine
  dünne Stelle hinweg) und die sich in der Ebene der Haut schneiden; genau mit Newton in dieser Ebene. Eingesetzt wird, wenn die
  Linie fertig ist, eine Kreuzung nach der anderen: ein gemeinsamer Punkt auf der gekreuzten Linie und sein Spiegelbild, die neue
  Linie und ihr Spiegelbild werden dort geteilt. Beim Zeichnen wachsen sie als Vorschau, wo beide auf dem Bildschirm gleich tief liegen.

Probe (vorher festgelegt, alles im echten Fenster mit Maus und Tasten):

| Kriterium | Ergebnis |
| --- | --- |
| 2D Loop: vier Punkte (zwei geklickt, zwei gezogen, einer mit ⌥), geschlossen mit Ziehen | geschlossen, 4 Punkte + 2 Kreuzungen, Abweichung von den gezogenen Griffen 0,00008 |
| Linie nach dem Klick = Faden davor | Abweichung 0,00002 |
| Abzweigung von Punkt zu Punkt, an beiden Enden gezogen | hängt an beiden, Griffe genau wie gezogen, alte Griffpaare unverändert |
| ↩ schließt, Esc stellt das Netz wieder her | ja, ja |
| Rahmen wählt genau die Punkte darin, ⇧ dazu, Ziehen um den Mausweg, ⌫ hält Loops geschlossen | ja (Abweichung 0) |
| ⇧ 45°, Leertaste verschiebt den Punkt (Griff bleibt), Klick auf den letzten Punkt zieht den Griff ein | 45,000°, (4, 3) genau, ja |
| Raum: Ring Mitte – Flanke – Mitte an „teat firefish“ | geschlossen, beide Enden genau z = 0, Spiegelbild genau (0), Punkte auf der Haut (0,002 % des Radius) |
| Raum: Faden auf der sichtbaren Seite nie grün | an drei Stellen 0 falsch grün; grün nur, wo er wirklich unter den Körper läuft |
| Raum: Kreuzungen des Rings mit vorhandenen Linien | 2 gemeinsame Punkte (ein Spiegelpaar), danach keine Kreuzung ohne Punkt, die gekreuzten Linien behalten ihren Verlauf (Abweichung 0,0002 % des Radius, so genau misst die Probe) |
| Raum: Rahmen, Ziehen, ⌫, ⌥ + Ziehen dreht | nur Sichtbares gewählt, gegriffener Punkt genau (die anderen 0,26 und 0,03 px, Perspektive), Ring bleibt zu, die Kreuzung bleibt stehen und gewählt, dreht |
| ⌫ lässt geteilte Punkte stehen (2D) | ja, sie bleiben gewählt; die übrigen sind weg |

Proben: `apps/editor/scripts/linien/stift-zeichnen-probe.mjs`, `stift-raum-probe.mjs` (Ausgabe JSON). Bilder
`docs/progress/linien/2026-11-15-stift-probe-2d.png` und `…-raum.png`; Filme vom echten Verhalten `…-stift-film-2d.mp4` (32 s) und
`…-stift-film-raum.mp4` (24 s), Skript `stift-film.mjs`. `richtung-probe.mjs` hält unverändert.

Grenzen und offen:

- Die Linie im Raum liegt in der Anzeige auf der Haut; gerechnet ist sie ein Bézier-Pfad durch ihre Punkte (im Editor folgt die Haut
  ohnehin den Linien).
- Liegen mehrere gewählte Punkte auf einer Linie, fließen ihre Sterne zu einer längeren Schwellung zusammen.
- Nach dem Überqueren einer Linie hält der Tropfen sie noch 1,8 Fangradien weit: Drücken knapp daneben zieht die Linie statt eines
  Rahmens.
- Die Tastenbelegung ist vorläufig (seine Antwort 3).
