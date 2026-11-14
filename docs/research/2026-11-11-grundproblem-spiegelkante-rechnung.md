# Ein Schritt zurück: Spiegelkante, verdrehte Griffe, „Wobbeln“ — was das Grundproblem ist (11.11.2026)

Untersuchung ohne Bau. Am Fenster `kurven.html` und am Löser ist hierfür nichts geändert; dazugekommen sind nur Proben und
Messskripte. Stand des Codes: `6ba0bcb3` (Schritt „Stabilität an der Spiegelachse“ vom 11.11. morgens).

> **Nachtrag (11.11. mittags):** Die Abschnitte 3 und 5 vergleichen die beiden Rechnungen an einzelnen Griffen. Abschnitt 9
> (Zufallsfolgen im Fenster) schränkt das ein: Beim Spielen im Fenster ist die alte Rechnung nicht gutmütiger. Die Untersuchung ist
> auf Florians Wort hin beendet; gebaut wird das gespiegelte Grundmesh (Abschnitt 10).

## Anlass

Florian, 11.11. vormittags, nach meiner Meldung zu diesem Schritt und meinem Vorschlag, den Rest beim verdrehten Griff mit einem
weiteren Mechanismus zu beheben:

> „Ich glaube an dieser Stelle wird es verkompliziert und wir verbessern das Problem grundsätzlich nicht. Es muss eine elegantere
> Lösung geben und ich habe das Gefühl es liegt an der Spiegelkante. Das Mesh soll natürlich gespiegelt werden, dadurch haben wir
> automatisch immer die Mittelkante. Wenn ich die Mittelkante bei test_kaputt zuerst ziehe und dann die beiden äußeren, dann kommen
> viele Probleme und das Wobbeln erst gar nicht. Die aktuelle Lösung trägt nicht und auch wenn ich andere Griffe ziehe sehe ich wie
> das Mesh lange nachwobbelt, es gibt komische Wölbungen, und es reißt/verdreht sich. Auch dass ich nicht einfach den Handle wieder
> zurückdrehen kann und dann weitermachen kann ohne dass das Mesh dann total kaputt und fragil ist ist ein großes Problem. Ich denke
> wir müssen hier nochmal einen Schritt zurück gehen und das Grundproblem genauer untersuchen. Das Grundmesh soll immer gespiegelt
> sein, was vielleicht das ein oder andere Problem löst. Ich weiß dass in einigen Versionen vor dieser Session Schleifen einfach
> schwarze Löcher waren und diese dann auch nach Absetzen und dann bei erneutem Zurückdrehen einfach verschwanden ohne das Mesh zu
> beschädigen. Ich bin nicht ganz sicher aber dieses Verhalten kam entweder mit der Geometrie-Lösung oder mit dieser Session.“

## Kurzfassung

1. **Es sind zwei verschiedene Probleme, und er hat bei beiden recht.**
2. **Die Spiegelkante** war der Grund, warum in den letzten Tagen bei seiner Reihenfolge (Mitte zuletzt) alles zerbrach: Auf jedem
   Stand vom 07. bis 09.11. lag der Loop der Mitte dann nur lose auf, in der alten wie in der neuen Rechnung, und schon der erste
   gedrehte Griff klappte 40 bis 60 Dreiecke um. Mit der Mitte zuerst war dort alles ruhig, und Schleifen waren kleine schwarze
   Löcher (2 bis 8 Dreiecke), die beim Zurückdrehen verschwanden. Seine Erinnerung stimmt. Seit heute früh ist die Ursache
   behoben; das Netz hält seine Spiegelung aber weiter nur über Buchführung. Sein Vorschlag (Grundmesh gespiegelt) nimmt diese
   Buchführung ganz weg.
3. **Dass ein Fehlgriff die Haut lange bewegt und sie danach nicht mehr dieselbe ist,** kommt aus der Geometrie-Rechnung
   (`?gewichte=geometrie`, seit dem 10.11. sein Standard), nicht aus der Spiegelkante und nicht aus den Änderungen von heute.
   Gemessen im Kern an seinen Formen, ohne Fenster: Ist ein Griff verdreht, faltet die Geometrie-Rechnung tiefer (an
   `test_kaputt` 28 umgeklappte Dreiecke, alte Rechnung 0; am Vogel 144 gegen 28) und kommt lange nicht zur Ruhe (`test_kaputt`
   55 Runden, Vogel nach 60 Runden noch 2,4 Einheiten je Runde; alte Rechnung 2 bis 8 Runden). Nach einem weit verdrehten und
   zurückgedrehten Griff an der Hornspitze des Vogels bleiben mit ihr 22 umgeklappte Dreiecke und 16 scharfe Knicke (in Ruhe
   waren es 6 und 8), mit der alten 2 und 0. Gewöhnliche Griffdrehungen (40°) überstehen beide ohne Schaden.
4. **Der Preis der alten Rechnung** ist der, dessentwegen wir am 08.11. von ihr weggegangen sind: Ihre Form hängt am Netz. Nach
   jedem Loslassen setzt sich die Haut sichtbar nach (am Firefish gut anderthalb Sekunden, mit der Geometrie-Rechnung gar nicht),
   und bei langen Zügen springt die Form (im Kern 6 Einheiten am Hals, 36 am Rüssel; Geometrie-Rechnung 0,4 und 1,7). **Keine
   der beiden Rechnungen kann beides.**
5. **Dahinter steht dieselbe Ursache**, die seit dem 08.11. auf der Planseite steht: Die Linien geben der Haut nur ihre Lage vor;
   wie stark sie sich wölbt, misst die Rechnung an der Haut selbst. Damit hat die Aufgabe keine eindeutige Lösung. Die alte
   Rechnung überdeckt das mit dem Netz (stabil, aber netzabhängig), die Geometrie-Rechnung legt es offen (netzunabhängig, aber
   suchend und empfindlich). Sechs Versuche heute, das im Kern billig zu heilen, sind gemessen gescheitert (Abschnitt 6).
6. **Mein Verfahrensfehler:** Sein Fenster (Port 5193) läuft aus dem Arbeitsbaum, in dem ich baue. Von etwa 6:45 bis 8:40 Uhr lief
   dort meine Versuchsrechnung (Normalfluss für alle Fälle), danach bis 9:20 Uhr Zwischenstände. Was er in dieser Zeit gesehen hat,
   war nicht der gemeldete Stand.

## 1. Womit gemessen wurde

- **Fenster, auf jedem Stand seit dem 05.11.:** `apps/editor/scripts/pruefen/form-griffe-probe-versionen.mjs`. Die Probe benutzt
  nur Haken, die es seit dem 05.11. gibt, und rechnet Rauminhalt, Knicke und umgeklappte Dreiecke selbst aus Lagen und Dreiecken.
  Wie lange sich die Haut nach dem Loslassen bewegt, misst sie durch Abfragen alle 100 ms.
  - `FORM=kugel-a`: von der Kugel an in seiner Reihenfolge (zwei Loops rundum, der Loop auf einer Seite dreimal hinausgezogen,
    dann die Mitte); `kugel-b`: die Mitte zuerst; `FORM=<Name>`: eine gesicherte Form.
  - `TEST=dreh`: spielen, einen Griff um 40° drehen und zurück, einen Griff verdrehen (auf die Gegenseite), loslassen,
    zurückdrehen, weiterarbeiten. `TEST=alle`: jeden Griff einer Form. `TEST=sprung`: Sprung nach dem Loslassen.
    `TEST=zufall`: Zufallsfolge wie beim Herumspielen.
  - Ältere Stände laufen im Arbeitsbaum `.claude/worktrees/form-alt` auf Port 5194.
- **Kern, ohne Fenster:** `form-griff-verdreht.ts` (`GRAD=40` oder `180`, `GEWICHTE=gleich`, `NEU=1`, `VORLAGE=1`),
  `form-gesichert-stabil.ts` (`GEWICHTE=gleich`). Ausgabe:
  `apps/editor/scripts/pruefen/gegenpruefung-2026-11-10/ausgaben/grund-griff-kern-2026-11-11.txt`.

## 2. Die Stände im Vergleich (Fenster, von der Kugel an)

Je Feld: umgeklappte Dreiecke nach dem Schritt. „lose“: Der Loop der Mitte ließ sich nicht ins Netz einsetzen.

| Stand | Rechnung | Reihenfolge | Mitte | Griff 40° gedreht | zurück | Griff verdreht, losgelassen | zurückgedreht | weitergearbeitet |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 07.11. `a0d2f959` | alt | Mitte zuletzt | **lose** | 38 | 66 | 93 | 114 | 129–144 |
| 07.11. `a0d2f959` | alt | Mitte zuerst | eingesetzt | – | – | 8 | 0 | 0 |
| 08.11. `640c2595` | alt | Mitte zuletzt | **lose** | 56 | 64 | 165 | 107 | 134–154 |
| 08.11. `640c2595` | alt | Mitte zuerst | eingesetzt | – | – | 2 | 0 | 0 |
| 09.11. `75b94733` | alt | Mitte zuletzt | **lose** | 56 | 66 | 163 | 126 | 140–156 |
| 09.11. `75b94733` | alt | Mitte zuerst | eingesetzt | – | – | 2 | 4 | 4 |
| 09.11. `75b94733` | Geometrie | Mitte zuletzt | **lose** | 66 | 60 | 108 | 86 | 93–96 |
| 09.11. `75b94733` | Geometrie | Mitte zuerst | eingesetzt | – | – | 4 | 2 | 2 |
| heute `6ba0bcb3` | alt | Mitte zuletzt | eingesetzt | 0 | 0 | 6 | 0 | 0 |
| heute `6ba0bcb3` | alt | Mitte zuerst | eingesetzt | – | – | 12 | 0 | 0 |
| heute `6ba0bcb3` | Geometrie | Mitte zuletzt | eingesetzt | 0 | 0 | 54 | 0 | 0 |
| heute `6ba0bcb3` | Geometrie | Mitte zuerst | eingesetzt | – | – | 40 | 0 | 0 |

(„–“: Die Probe traf in dieser Reihenfolge den Griff nicht; der Schritt fehlt. Die Stände vom 07. und 08.11. kennen
`?gewichte=geometrie` noch nicht, beide Adressen rechnen dort gleich.)

- **Mitte zuletzt war auf jedem älteren Stand kaputt, in beiden Rechnungen.** Die Mittellinie lag lose, und jeder Schritt
  machte es schlimmer. Das ist die Spiegelkante: Das Aufräumen des Netzes hatte Kanten auf der Mittelebene quer gedreht (seit dem
  05.11.), und der Loop der Mitte fand seinen Weg nicht mehr.
- **Mitte zuerst war auf jedem älteren Stand gutmütig.** Ein verdrehter Griff gab ein kleines schwarzes Loch, das beim
  Zurückdrehen fast oder ganz verschwand. Genau so erinnert er es.
- **Heute sind beide Reihenfolgen heil**, und nach dem Zurückdrehen liegt die Haut an dieser einfachen Form wieder genau wie vorher.
  Solange der Griff verdreht ist, ist das Loch mit der Geometrie-Rechnung aber viel größer als früher (40 bis 54 statt 4
  Dreiecke): Seit G3 (10.11.) rechnet die Haut im Bildtakt weiter, bis sie steht, und folgt einer verdrehten Linie deshalb ganz.

## 3. Gedrehte und verdrehte Griffe an seinen Formen (Kern, ohne Fenster)

Griff am obersten Punkt von Loop 4 (an `test_kaputt` und am Firefish die Mitte, am Vogel die Hornspitze), derselbe Löser über
den ganzen Ablauf, kein Netzumbau, fünf Runden je Mausschritt, danach 60 Runden. Zahlenpaare: umgeklappte Dreiecke / Knicke über
150°. „Ruhe ab Runde“: von da an bewegt sich kein Punkt mehr als 0,05 Einheiten je Runde.

| Form | Rechnung | in Ruhe | Griff 40° gedreht · Ruhe ab Runde | zurück | Griff verdreht (180°) · Ruhe ab Runde | zurückgedreht · Punkte neben vorher |
| --- | --- | --- | --- | --- | --- | --- |
| `test_kaputt` (6 200 Punkte) | Geometrie | 0 / 0 | 0 / 0 · 1 | 0 / 0 | 28 / 40 · 55 | 0 / 0 · bis 11,8 |
| | alt | 0 / 0 | 0 / 0 · 1 | 0 / 0 | 0 / 2 · 2 | 0 / 0 · bis 1,8 |
| Vogel (16 000) | Geometrie | 6 / 8 | 6 / 8 · 6 | 6 / 8 | 144 / 114 · nie (nach 60 Runden noch 2,4 je Runde) | 4 / 2 · bis 14,8 |
| | alt | 4 / 4 | 4 / 6 · 1 | 4 / 4 | 28 / 28 · 8 | 4 / 2 · bis 6,6 |
| Firefish (27 800) | Geometrie | 0 / 9 | 0 / 9 · kriecht (0,02 bis 0,08 je Runde) | 0 / 9 | 6 / 12 · 60 | 0 / 9 · bis 2,2 |
| | alt | 0 / 0 | 0 / 0 · 2 | 0 / 0 | 0 / 0 · 1 | 0 / 0 · bis 2,6 |

Derselbe Ablauf mit einem weiter verdrehten Griff (um (−200, −17, 0) gezogen statt genau auf die Gegenseite gedreht):

| Form | Rechnung | in Ruhe | verdreht | zurück |
| --- | --- | --- | --- | --- |
| `test_kaputt` | Geometrie | 0 / 0 | 36 / 26 | 0 / 0, Punkte bis 15,4 verrutscht |
| | alt | 0 / 0 | 4 / 2 | 0 / 0, bis 3,3 |
| Vogel | Geometrie | 6 / 8 | 202 / 178 | **22 / 16**, bis 32 |
| | alt | 4 / 4 | 92 / 80 | 2 / 0, bis 13 |
| Firefish | Geometrie | 0 / 9 | 14 / 20 | 0 / 10, bis 38 |
| | alt | 0 / 0 | 10 / 4 | 0 / 0, bis 3,2 |

- **Gewöhnliche Griffdrehungen (40°) überstehen beide Rechnungen ohne Schaden.** Mit der Geometrie-Rechnung kriecht die Haut an
  den großen Formen danach weiter, aber unter einem Zehntel Bildpunkt je Runde.
- **Ist ein Griff verdreht, unterscheiden sie sich deutlich.** Die Geometrie-Rechnung faltet tiefer und kommt lange nicht zur Ruhe:
  an `test_kaputt` 40 Runden lang 0,3 bis 1,7 Einheiten je Runde, am Vogel nach 60 Runden noch 2,4 (eine Runde kostet dort 20 ms,
  am Firefish 37 ms). Das ist das „lange Nachwobbeln“ nach einem Fehlgriff. Die alte Rechnung steht nach 2 bis 8 Runden.
- **Nach dem Zurückdrehen** ist die Haut mit der alten Rechnung wieder die alte. Mit der Geometrie-Rechnung sind die Punkte
  längs der Fläche bis 15 bis 38 Einheiten verrutscht, und am Vogel bleibt nach dem weiten Verdrehen Schaden (22 / 16 statt
  6 / 8). Das ist das „fragil“.
- Der Firefish hat mit der Geometrie-Rechnung schon in Ruhe 9 Knicke über 150° (dünne Flossenränder), mit der alten 0; beim
  Setzen mit der alten Rechnung ändert sich seine gesicherte Form um bis 8,4 Einheiten (im Mittel 1,2). Die beiden Rechnungen
  führen an dünnen Stellen also zu leicht verschiedenen Formen.
- An der einfachen Form `test_kaputt` ist der Unterschied klein. Deshalb haben meine Proben vom Morgen (alle an `test_kaputt`)
  ihn nicht gezeigt.
- Im Fenster kommt eines dazu (am Morgen gemessen): Wird nach dem Loslassen neu gegriffen, legt das Fenster einen neuen Löser an.
  Seine Matrix ist nach den Kantenlängen der Lage beim Anlegen gewichtet; auf der gefalteten Haut gebaut, führt sie beim
  Zurückdrehen in eine andere Ruhelage (an `test_kaputt` 10 / 8 statt 0 / 0). Die alte Rechnung hat diese Abhängigkeit nicht
  (derselbe und ein neuer Löser geben mit ihr auf den Punkt dasselbe).

## 4. Was die Spiegelkante damit zu tun hat

- **Sie war der Auslöser der letzten Tage** (Abschnitt 2), nicht die Ursache von Abschnitt 3.
- Das Netz ist heute ein ganzes Netz mit einer Liste „wer ist wessen Spiegelbild“. Jede Netzoperation muss die beiden Hälften von
  Hand gleich halten: In `verdichten.ts`, `einsetzen.ts`, `loops.ts`, `kurven.ts` und im Fenster kümmern sich rund 300 Zeilen nur
  darum. Der Löser selbst weiß von der Spiegelung nichts; er rechnet beide Hälften.
- Bricht diese Buchführung an einer Stelle (so am 05.11. das Drehen von Kanten auf der Mittelebene), gibt es die Mittelkante im
  Netz nicht mehr als durchgehende Kette. Heute früh ist das an der Quelle behoben; die Bauart bleibt.
- **Sein Vorschlag, das Grundmesh immer gespiegelt:** Das Netz ist nur noch eine Hälfte, ihr Rand ist die Mittelkante, die andere
  Hälfte ist ihr Spiegelbild. Dann gibt es die Mittelkante immer, sie kann nicht brechen, nichts kann über die Mitte geraten, und
  die Buchführung entfällt. Dazu rechnet der Löser nur noch die Hälfte der Punkte (das war G6, „halbe Haut“, bisher nur als
  Tempo-Schritt gedacht; er hatte am 10.11. entschieden, dass die Grundform immer spiegelgleich ist).
- Was es nicht löst: Abschnitt 3. Auf der Mittelebene kennt die Haut aus der Spiegelung zwar ihre Richtung (sie kreuzt die Ebene
  senkrecht); ein Versuch, das im heutigen Löser zu nutzen, machte es aber schlechter (Abschnitt 6).

## 5. Der Preis der alten Rechnung: Sprung nach dem Loslassen

Im Kern (`form-netzunabhaengig.ts`, wie am 08.11.): Hals und Rüssel aus der Kugel gezogen, dann das Netz verdichtet wie nach dem
Loslassen. Wie weit die Form danach springt:

| | alte Rechnung | Geometrie-Rechnung |
| --- | --- | --- |
| Hals | 6,3 | 0,4 |
| Rüssel | 35,6 | 1,7 |

Im Fenster von heute an seinen Formen (`TEST=sprung`: der oberste, unterste, vorderste und äußerste Punkt je 60 Einheiten
hinausgezogen, jeder Zug auf der frisch geladenen Form nach einem kleinen Vorzug; verglichen wird die Haut kurz vor dem
Loslassen mit der Haut in Ruhe):

| Form | Rechnung | sichtbare Bewegung nach dem Loslassen | bis alles ruht (samt Aufräumen im Hintergrund) | Rauminhalt ändert sich danach | Ausdehnung ändert sich danach |
| --- | --- | --- | --- | --- | --- |
| `test_kaputt` | Geometrie | keine | 0,3 bis 0,5 s | 0,0 % | 0,0 |
| | alt | 0 bis 0,4 s | 0,2 bis 0,4 s | 0,1 bis 0,2 % | 0,0 |
| Vogel | Geometrie | keine | 1,0 bis 2,1 s | 0,0 % | 0,0 |
| | alt | 0 bis 0,8 s | 0,7 bis 2,5 s | 0,0 bis 0,2 % | 0,0 bis 0,3 |
| Firefish | Geometrie | keine | 2,2 bis 5,5 s | 0,0 % | 0,0 bis 0,1 |
| | alt | 0 bis 3,3 s (in drei von vier Zügen 1,5 s und mehr) | 1,5 bis 5,1 s | 0,0 bis 0,1 % | 0,0 bis 0,1 |

(„sichtbar“: mehr als 0,5 Einheiten zwischen zwei Abfragen im Abstand von 100 ms.)

- **Mit der Geometrie-Rechnung bewegt sich nach dem Loslassen sichtbar nichts.** Das Fenster rechnet und räumt im Hintergrund
  weiter (am Firefish 2 bis 5 s), die Form bleibt dabei stehen.
- **Mit der alten Rechnung setzt sich die Haut nach jedem Loslassen sichtbar nach,** am Firefish gut anderthalb Sekunden lang.
  Bei Zügen dieser Größe ändert sich die Form dabei kaum (Rauminhalt bis 0,2 %); groß wird der Sprung bei langen Zügen, die
  neue Glieder ziehen (Tabelle oben). Das ist das „justiert nach“ vom 08.11.
- Die alte Rechnung läuft im Fenster außerdem noch ohne die Schritte G4 (Nachlauf, Aufräumen im Hintergrund); die gelten bisher
  nur für die Geometrie-Rechnung.
- **Keine der beiden Rechnungen kann beides:** ruhig nach dem Loslassen und gutmütig bei Fehlgriffen.

## 6. Versuche im Kern, das Grundproblem billig zu heilen (nur gemessen, in einer Arbeitskopie; nichts davon ist im Fenster)

Verdrehter Griff an `test_kaputt`, je derselbe Löser und ein neuer Löser auf der gefalteten Haut:

| Variante | verdreht: umgeklappt | zurück, derselbe Löser | zurück, neuer Löser | Urteil |
| --- | --- | --- | --- | --- |
| Geometrie-Rechnung (heute) | 36 | heil, Punkte bis 15 verrutscht | 4 Knicke, 1 % Rauminhalt fehlt | – |
| alte Rechnung | 4 | heil, bis 3 verrutscht | genau wie derselbe Löser | gutmütig |
| Geometrie, Matrix gleich gewichtet | 52 | heil, bis 11 | heil, bis 27 | heilt, faltet aber tiefer |
| Geometrie, Wölbung an den Linien fest (kein Gedächtnis je Runde) | 334 | 316 bleiben | läuft auseinander | schlechter |
| Geometrie, Spiegelkante ohne Gedächtnis | 172 | 36 bleiben | 200 bleiben | schlechter |
| Geometrie, alle Linien ohne Gedächtnis | 690 | 702 bleiben (schon in Ruhe 336) | 790 | unbrauchbar |
| alte Rechnung, Punkte längs der Fläche entspannt | **0** | **genau (0,00)** | genau | am verdrehten Griff ideal, aber: |

Dazu, nur im Messskript (`SPERRE=1`): **Die Haut folgt einer Linie nicht, solange sie sich selbst kreuzt.** An `test_kaputt`
entsteht bei einem weit verdrehten Griff der Mitte dann gar keine Falte (0 statt 36 umgeklappte Dreiecke). Am Horn des Vogels
kreuzt sich die Linie beim Verdrehen aber nie selbst (sie legt sich im Raum neben sich); dort greift es nicht, der Schaden bleibt
(22 / 16). Das gilt genauso für die Hilfe von heute früh („kreuzt sich eine Linie selbst, bleibt das Netz“): Sie schützt flache
Linien wie die Mitte, nicht jede.

Die letzte Variante der Tabelle sah nach einer Lösung aus (kein umgeklapptes Dreieck, exakte Rückkehr). Zwei Gegenproben haben sie erledigt:
Die Kugel mit einem einzigen Loop schwingt mit ihr dauerhaft (50 ↔ 315 statt 150), und der Sprung nach dem Verfeinern wird größer
statt kleiner (Hals 29 statt 6, Rüssel 124 statt 36). Damit ist heute keine billige Heilung gefunden. Das deckt sich mit den drei
Beweisen vom 09.11. (Planseite „Kurven als Wahrheit“, Abschnitte 12 bis 18).

## 7. Was das Grundproblem ist

Planseite, Abschnitt 12 (08.11.): „Misst der Löser die Krümmung an einer Linie an der Haut selbst, legen die Linien die Form
zwischen sich nicht fest.“ Abschnitt 14: Die Gleichung, die gerechnet wird, braucht an den Linien Lage **und Richtung**; wir geben
nur die Lage vor. Daraus folgt alles, was er beschreibt:

- Die Rechnung hat kein festes Ziel, auf das sie zuläuft. Sie sucht (Wobbeln) und braucht eine Bremse (Nachhinken).
- Es gibt zu denselben Linien mehr als eine Ruhelage. Welche erreicht wird, hängt vom Weg ab (komische Wölbungen, nach dem
  Zurückdrehen nicht dieselbe Form).
- Eine gefaltete Stelle „bestätigt sich selbst“ (schwarze Löcher, die bleiben).

Die alte Rechnung hält dagegen, weil ihr Maß am Netz hängt: Das Netz wirkt wie ein Gerüst. Dafür ändert sich die Form, wenn sich
das Netz ändert. Die Geometrie-Rechnung nimmt das Gerüst weg; übrig bleibt die Aufgabe ohne eindeutige Lösung.

## 8. Vorschlag

Nichts davon ist begonnen.

1. **Sein Fenster ruhig stellen (Arbeitsweise, sofort):** Ich baue ab jetzt in einem zweiten Arbeitsbaum mit eigenem Port. In den
   Arbeitsbaum seines Fensters kommen nur geprüfte Commits, und ich sage dazu, wann sich sein Fenster geändert hat.
2. **Grundmesh gespiegelt als Beweis (sein Vorschlag; G6 mit neuem Ziel).** Unabhängig von der Frage der Rechnung. Zuerst im Kern
   an seinen drei Formen, in zwei Teilen: (a) der Löser rechnet nur die Hälfte (Kriterien: gleiche Form wie heute auf 0,1
   Einheiten, eine Runde höchstens 60 % der heutigen Zeit); (b) die Netzoperationen arbeiten auf der Hälfte mit Rand
   (Kriterien: die Mittelkante ist ohne Buchführung immer da; die zwölf groben Abläufe an `test_kaputt` und sein Ablauf von der
   Kugel an bleiben heil; die Hilfen an der Spiegelkante von heute früh entfallen). Danach erst das Fenster.
3. **Die Rechnung: seine Wahl, mit seinen Händen.** Beide laufen im heutigen Stand (mit und ohne `?gewichte=geometrie`), die
   Korrekturen an der Spiegelkante gelten für beide. Er probiert an Vogel und Firefish dasselbe mit beiden Adressen und sagt,
   welche Schwäche ihn weniger stört: das Nachsetzen nach jedem Loslassen (alt) oder die Empfindlichkeit bei Fehlgriffen
   (Geometrie). Wählt er die alte, ziehe ich für sie die Schritte G4 nach. Bis dahin baue ich an der Rechnung nichts.
4. **Das Grundproblem selbst** (Linien mit Richtung) bleibt die offene Frage dahinter. Auf der Mittelebene ist die Richtung aus
   der Spiegelung bekannt; mit dem gespiegelten Grundmesh ist der Rand der Hälfte die natürliche Stelle für einen neuen, kleinen
   Anlauf. Nicht vorher und nicht ohne sein Wort.

Die Hilfen von heute früh (Sperren im Zug, „Linie kreuzt sich selbst“, Normalfluss für lose Loops) sind Krücken um die
Buchführung der Spiegelung und um die Empfindlichkeit der Geometrie-Rechnung. Mit Schritt 2 werden die an der Spiegelkante
überflüssig, mit der Wahl in Schritt 3 vielleicht die anderen. Sie bleiben bis dahin, weil ohne sie die groben Abläufe an
`test_kaputt` wieder schlechter enden.

## 9. Nachtrag (mittags): Zufallsfolgen im Fenster — die alte Rechnung ist dort nicht gutmütiger

`TEST=zufall` (30 Schritte: Punkte 20 bis 80 Einheiten ziehen, Griffe 20 bis 70° drehen, Griffe verdrehen und meist wieder
zurückdrehen), heutiger Stand. Am Ende der Folge: Knicke über 150° / umgeklappte Dreiecke.

| Form | Folge | Geometrie-Rechnung | alte Rechnung |
| --- | --- | --- | --- |
| `test_kaputt` | 1 | 20 / 10 | 14 / 20 |
| `test_kaputt` | 2 | 10 / 0 | 25 / 6 |
| Vogel (20 Schritte) | 1 | 50 / 48 | 51 / 40 |
| frisch aus der Kugel (Mitte zuerst) | 1 | 896 / 812 | 86 / 50 |

Zum Vergleich der Stand vom 08.11. (`640c2595`), frisch aus der Kugel, Folge 1, nach 28 Schritten: 134 / 186.

- **Keine Folge endet heil, in keiner der beiden Rechnungen.** Mal ist die eine milder, mal die andere. „Zurück zur alten
  Rechnung“ löst es also nicht; Abschnitt 3 gilt für einen einzelnen verdrehten Griff im Kern, ohne Netzumbau.
- **An dünnen Spitzen reicht eine gewöhnliche Griffdrehung.** `test_kaputt`, Folge 2, Schritt 2: Griff um 30° gedreht, die Linie
  kreuzt sich an der Spitze selbst, 8 bis 14 Knicke über 150° und 16 bis 18 umgeklappte Dreiecke.
- **Bleibt ein Griff verdreht stehen,** hält die Hilfe von heute früh das Netz an („kreuzt sich selbst“). Alles Weitere rechnet auf
  diesem Netz, der Schaden wächst (Vogel, Schritte 10 bis 20: 16 / 8 → 50 / 48).
- **Nach Verdrehen und Zurückdrehen bleibt Schaden,** wenn das Aufräumen auf der gefalteten Haut gelaufen ist (`test_kaputt`,
  Folge 1, Schritte 17 und 18, Geometrie-Rechnung: 2 / 0 → 8 / 2).
- **Die alte Rechnung** setzt sich nach fast jedem Loslassen sichtbar nach (0,2 bis 2,3 s) und hinterlässt auch bei gewöhnlichen
  Zügen Knicke (`test_kaputt`, Folge 1, Schritt 3: 6 Knicke über 150° und 2 umgeklappte Dreiecke, die bleiben). Sie läuft im
  Fenster ohne die Schritte G3 und G4.
- **Gewöhnliche Punktzüge im Kern** (`form-gesichert-stabil.ts`, dieselben Züge, Haut vorher gesetzt): Vogel, 284 Fälle mit 30
  und 60 Einheiten: zur Ruhe 283 (Geometrie) und 282 (alt), umgeklappte Dreiecke bleiben in beiden in 81 Fällen. Firefish, 196
  Fälle mit 60 und 150 Einheiten: zur Ruhe 188 und 192, umgeklappte Dreiecke bleiben in 90 und 92 Fällen. Bei Punktzügen
  verhalten sich die Rechnungen also gleich; der Unterschied aus Abschnitt 3 betrifft verdrehte Griffe.
- **Nicht ausgewertet:** Die Reihe über die Stände zwischen dem 08.11. und heute ist abgebrochen (Abschnitt 10). Die Folgen
  enthalten grobe Schritte und Griffe, die verdreht stehen bleiben. Sie zeigen, dass sich Schaden ansammelt, aber nicht, welche
  Änderung welchen Schaden gebracht hat.

Protokolle: `apps/editor/scripts/pruefen/gegenpruefung-2026-11-10/ausgaben/grund-fenster-2026-11-11.txt`.

## 10. Entscheidung (Florian, 11.11. mittags): den Fehler an sich beseitigen

> „Wir haben jetzt seeeehr viel meines Wochenlimits wieder für viele Testreihen im Hintergrund aufgebraucht um zu finden wo der
> Fehler auftrat oder ob mein Gefühl richtig war. Sollten wir nicht lieber den Fehler an sich beseitigen. Wenn das Mesh wirklich
> einfach gespiegelt würde sollten doch alle Probleme mit der Spiegelkante verschwinden. Momentan ist es ja genau das Problem, dass
> wenn ein Teil einer Kurve über die Spiegelkante kommt wird das Mesh rissig. Hinziehen und zurückziehen geht dann gar nicht mehr.
> Können wir dann nicht einfach wie bei Blenders Mirror Modifier das Mesh spiegeln und ich kann ganz normal über die Spiegelkante
> ziehen und das Mesh verschmilzt dann. Wenn ich die Spiegelung dann später ‚applie‘ sollte das Problem ja sowieso nicht mehr
> auftreten oder? Das mit den Schleifen selbst ohne dass sie die Spiegelkanten berühren geht schon besser, zumindest bei einfachen
> Meshes … das muss ich genauer untersuchen. Also mach weiter wie du es für richtig hältst. Wenn du den letzten Schritt abschließen
> willst, dann mach das zuerst. Ich werde bei der ‚random‘ Testerei immer etwas skeptisch.“

- Die Testreihen sind gestoppt; mit diesem Abschnitt ist die Untersuchung beendet.
- **Gebaut wird das gespiegelte Grundmesh** nach dem Vorbild des Mirror-Modifiers: Eine Hälfte ist die Wahrheit, die andere ihr
  Spiegelbild. Was über die Spiegelkante gezogen wird, verschmilzt dort mit seinem Spiegelbild; hinüberziehen und zurückziehen
  muss gehen. Geprüft wird gezielt an diesem Fall, nicht mit Zufallsfolgen.
- Die verdrehten Griffe abseits der Spiegelkante (Abschnitte 3 und 9) bleiben danach als eigenes Thema; Florian sieht sie sich
  zuerst selbst an.

## 11. Gebaut (11.11. mittags): Wand an der Spiegelkante, die Anzeige verschmilzt die Hälften

> **Berichtigung (11.11. mittags, kurz danach): Dieser Abschnitt beschreibt die falsche Fassung.** Florians Lob galt nicht der
> Fassung mit der Wand, sondern der Zwischenfassung davor (hier unter „Gemessen und verworfen“ als erste genannt): Linien dürfen
> durch die Spiegelebene, die Anzeige schneidet ab und verschmilzt. Zur Wand sagte er: „jetzt sind die ganzen Fehler wieder da …
> wenn ich in die Mitte ziehe und absetze und wieder zurück. Das fühlt sich an wie vorher.“ Gültig ist Abschnitt 12.

Commit `a4490f2f`. Florian hat den Stand in Chrome auf Port 5194 selbst getestet: „Es fühlt sich gerade ziemlich gut an mit der
Spiegelung. Ich habe die meisten Fälle selbst getestet über Mitte ziehen und auch Schleifen, es ist jetzt viel mehr wie ich es mir
vorgestellt habe.“

**Sein Fall, nachgestellt** (`form-ablauf-probe.mjs`, `test_kaputt`, frisch geladen: den äußersten Punkt des Loops auf einer Seite
250 an die Mitte gezogen und losgelassen): Auf dem Stand von heute früh steht danach ein schwarzes Loch an der Spiegelkante
(`docs/progress/editor/form-spiegelkante-vorher-2026-11-11.jpg`). Die Zählung „umgeschlagene Dreiecke“ meldete dabei 0: Sie sieht
nicht, wenn die beiden Hälften durcheinander laufen. Deshalb hieß es am Morgen „heil“, obwohl Florian Risse sah. Die Probe misst
jetzt zusätzlich die umgestülpten Stellen (`lib-umgestuelpt.mjs`, das Maß vom 08.11.), auf dem neuen Stand an der gezeigten Haut.

**Ursache:** Die Linie blieb seit heute früh auf ihrer Seite, die Haut daneben aber nicht. Wo sie über die Spiegelebene geriet,
steckte sie in der anderen Hälfte (im Kern-Test bis zu 10 Punkte, bis 2,3 Einheiten tief).

**Gebaut:**
- `hautSeiten` (Kern): auf welcher Seite der Spiegelebene jeder Punkt liegt, am Netz gelesen (die Mittelkante trennt es in Stücke),
  nicht an der Lage.
- `hautWand` (Kern, in jeder Runde beider Löser): Kein Punkt kommt auf die Seite seines Spiegelbilds, wie „Clipping“ beim Spiegeln
  in Blender. `?wand=0` zeigt den Stand ohne sie.
- Fenster: Die Anzeige verschmilzt die Hälften, wie „Merge“: Dreiecke, die ganz auf der Spiegelebene liegen, werden nicht gezeigt,
  ihre Randpunkte bekommen die Normale eines verschmolzenen Punkts.
- Ergebnis an seinem Fall: kein schwarzes Loch mehr (`form-spiegelkante-nachher-2026-11-11.jpg`). Kern-Test `wand.test.ts`: im
  ganzen Ablauf kein Punkt auf der falschen Seite, zurückgezogen kein umgeklapptes Dreieck, Haut 2,8 Einheiten neben vorher (Radius
  150).

**Gemessen und verworfen:**
- *Linien und Haut frei durch die Spiegelebene, nur die Anzeige schneidet ab* (das wäre der Mirror-Modifier wörtlich): Die Haut
  faltet sich dann an der Mittelkante selbst, weil die beiden Streifen daneben die Seiten tauschen. Schon 17 Einheiten hinüber
  ließen 8 Knicke und 4 umgeklappte Dreiecke zurück (mit Wand 0), weit gezogen 482 Knicke und 632 umgeklappte.
- *Rechnung wie heute früh, nur die Anzeige schneidet ab:* Aus dem schwarzen Loch wird eine Kerbe im Umriss.
- *Linie ohne Abstand bis an die Ebene:* im Kern-Test zurückgezogen 61 statt 2,8 Einheiten neben vorher, im Fenster schwarze
  Kanten längs der Naht. Der Abstand von heute früh bleibt.

**Offen:**
- **Sehr weit an die Mitte gezogen kann die Haut an der Wand Falten werfen.** Nach den zwölf groben Schritten von heute früh denselben
  Punkt 250 an die Mitte: ein Lauf endete mit 122 Knicken über 150° und 94 umgeklappten Dreiecken, ein zweiter mit 714 und 733
  (`form-spiegelkante-weit-falten-2026-11-11.jpg`), und zurückgezogen blieb es dort schlecht. Ohne Wand lag derselbe Schritt bei
  108 und 76. Der Grund ist in allen Fassungen derselbe: Die Haut zwischen der Linie und der Mitte hat keinen Platz mehr, und es
  gibt noch nichts, das sie dort im Zug wegnimmt.
- Gerechnet werden weiter beide Hälften, und das Netz führt seine Spiegelung weiter über Buchführung. „Nur noch eine Hälfte
  rechnen“ (halbe Rechenzeit, keine Buchführung) ist nicht gebaut.
- Die Spiegelung „applien“ (ein ganzes Netz ohne Spiegel) gibt es noch nicht.

Protokoll: `apps/editor/scripts/pruefen/gegenpruefung-2026-11-10/ausgaben/spiegelkante-wand-2026-11-11.txt`.

## 12. Gültiger Stand (11.11. mittags): über die Mitte ziehen, die Anzeige verschmilzt

Commit `09f39297` (die Wand aus `a4490f2f` ist wieder heraus).

**Was geschehen ist:** Während ich baute, sah Florian in Chrome auf Port 5194 jede Zwischenfassung. Sein Lob („fühlt sich gerade
ziemlich gut an … viel mehr wie ich es mir vorgestellt habe“) habe ich der Fassung mit der Wand zugeordnet, ohne nachzufragen, und
diese gesichert. Er danach: „nein, das war nicht das, was ich gesehen habe? Jetzt sind die ganzen Fehler wieder da. Während du
gearbeitet hast, konnte ich über die Mittelgrenze ziehen und das Mesh ist verschmolzen. Das war gut. Dann gab es kurz eine Wand in
der Mitte und es ging. Jetzt gibt es wieder diese Fehler, wenn ich in die Mitte ziehe und absetze und wieder zurück. Das fühlt sich
an wie vorher.“

**Gültig ist die Fassung, die er gut fand:**
- Linien und Punkte dürfen durch die Spiegelebene (`pfadLagen` ohne Abstand, `zGrenzen` hält nur die Mittelebene und die Enden
  eines Rings, `punktNach` ohne Grenze; `mitteAbstand`, `mitteGrenze` und die Wand `hautWand` gibt es nicht mehr).
- Gerechnet wird damit wie überall; an der Mitte wird nichts gequetscht.
- Die Anzeige schneidet jede Hälfte an der Spiegelebene ab (`anzeigeZ` nach `hautSeiten`) und zeigt Dreiecke nicht, die danach
  ganz auf ihr liegen: Dort verschmelzen die Hälften, wie beim Mirror-Modifier.

**Warum ich sie verworfen hatte, und was daran falsch war:** Meine Probe zählte Knicke und umgeklappte Dreiecke an der gerechneten
Haut (nach einem Zug 17 Einheiten über die Mitte 8 und 4, weit gezogen 482 und 632). Ein großer Teil davon liegt hinter der
Spiegelebene und wird gar nicht gezeigt. Sein Auge hat die gezeigte Form beurteilt, meine Zahl die verborgene. Zum zweiten Mal an
diesem Tag hat eine Zählung dem widersprochen, was er sieht, und ich bin der Zählung gefolgt.

**Die Fassung mit der Wand** (Abschnitt 11) hatte in meiner eigenen Probe den Fall, den er dann selbst fand: zur Mitte ziehen,
absetzen, zurück endete in einem von zwei Läufen mit 714 Knicken und 733 umgeklappten Dreiecken. Ich habe das als seltenen Fall
eingeordnet.

**Offen, ungeprüft:** wie sich die gültige Fassung in Florians Händen bei weiten Zügen, nach dem Absetzen und beim Zurückziehen
verhält (sein Urteil steht für das, was er während des Bauens probiert hat); die Linien werden hinter der Mitte weiter ganz
gezeichnet; gerechnet werden weiter beide Hälften; „applien“ gibt es nicht.

