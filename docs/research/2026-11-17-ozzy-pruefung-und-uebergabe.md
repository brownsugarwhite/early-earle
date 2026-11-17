# Ozzy: Prüfung vom 17.11.2026 und Übergabe an die nächste Sitzung

Geschrieben von Sitzung 4 (der Sitzung des Kerns, Stand bis 14.11.) auf Florians Auftrag vom 17.11. Die nächste Sitzung soll Ozzy
optimieren und den Stand perfektionieren: das Offene aus Sitzung 4, dazu was diese Prüfung gefunden hat.

**Florian, 17.11. (gekürzt, wörtlich):** „Bitte checke nochmal ausführlich wie wir hier in der session stehen und untersuche genau
und ehrlich wie [die andere Sitzung] das design umgesetzt hat. […] ob bei der umsetzung auf deine technik fehler gemacht wurden, ob
das neu eingebaute eleganter und besser gelöst werden könnte. Welche hebel wir noch für die performance haben. Ich habe das gefühl es
gibt viele ruckler und die bedienung wirkt manchmal etwas zäh. Das hatten wir am ende hier schon weitestgehend behoben. Die
performance muss immer top sein. […] Ändere aber noch nichts. […] stellt sich auch wieder die frage nach einer nativen app. […] P und
freihandwerkzeug sind nun hauptwerkzeuge. L ist jetzt lasso und unser l für edgeloops gibt es nichtmehr. […] Bitte hier jetzt auch
keine ausschweifenden tests machen. Wenn du probleme oder fehler siehst dann vermerke das deutlich.“

**Wie geprüft wurde:** gelesen (Übergabe und Pläne von Ozzy, die vier Studien-Pläne, `werk.ts`, die Bildschleife und die Eingaben in
`ozzy/main.ts`, `werkHaut.ts`, `werkBlatt.ts`, die Shader in `linien/fluessig.ts` und `anfang/haut.ts`, `ozzy.css`), der Schnitt des
Werks mechanisch gegen `kurven.ts` vom 14.11. verglichen, und zwei Messläufe mit dem vorhandenen Werkzeug `ozzy-messen.mjs` an
„strange bird“. **Geändert wurde nichts.** Nicht geprüft: siehe Abschnitt 11.

## 1. Kurzfassung

1. **Die Technik von Sitzung 4 ist sauber übernommen.** Alle 177 Funktionen von `kurven.ts` (Stand `f248c538`, mit Abzweigungen und
   Pose Etappe 2 und 3) stehen im Werk; 174 sind bis auf die Umbenennung gleich, drei gewollt geändert. Ozzy rechnet wie das Prüffenster.
2. **Die Ruckler haben zwei getrennte Ursachen, beide gemessen:**
   - **Im Zug der Prozessor:** 17 ms je Bild (95 %: 27 ms). Das Werk rechnet bis zu 12 ms je Bild, weil seine Bremse „flüssig zuerst“
     in Ozzy nicht greift (**Fehler beim Einbau**, Abschnitt 3.1); dazu 5 ms glatte Haut.
   - **Beim Drehen die Grafikkarte:** Es wird nur 3,5 ms gerechnet, die Bilder kommen aber nur alle 22 ms. Mit einem Viertel der
     Bildpunkte kommen sie pünktlich. Die Seifenhaut wird für Retina weit teurer gezeichnet, als ihr Aussehen braucht (Abschnitt 4).
3. **Das zähe Gefühl kommt dazu vom Zeiger:** Er wird im Bild gezeichnet, der Systemzeiger ist aus. Jedes verpasste Bild ist ein
   Ruck des Zeigers selbst. Und gegriffen wird nur, was im Bild davor unter dem Zeiger hing (Abschnitt 7).
4. **Eine native App löst nichts davon.** Beide Engpässe sind Einstellungen und Aufbau, nicht die Plattform (Abschnitt 8).
5. **Vorschlag:** erst drei kleine Hebel mit Messblatt (Bildtakt, Auflösung der Seifenhaut, eine Stufe weniger im Zug), dann Zeiger und
   Greifen, dann der Löser aus dem Bildtakt; danach das Offene des Kerns (Abschnitt 9).

## 2. Wo Sitzung 4 steht

**Gebaut bis 14.11., alles im Werk enthalten:** Schritt 1 (glatte Anzeige), 2 (kleines Rechennetz), 3 (Beweis, heutige Rechnung
bleibt), 4a (Donut), 4b erster Teil (Rechnung auf der Hälfte, „flüssig zuerst“), Schritt 6 bis zum Maul aus einer Linie (angehalten),
Abzweigungen mit P, Schritt 5 Etappe 2 (die Pose rechnet in ihrer Ruhe) und Etappe 3 (die Pose geht mit der Grundform mit). Stand,
Messwerte und Fallen: [`docs/UEBERGABE.md`](../UEBERGABE.md) (Abschnitte 7.16 bis 7.19),
[`docs/plans/2026-11-12-schnell-glatt-exakt.md`](../plans/2026-11-12-schnell-glatt-exakt.md), `apps/editor/CLAUDE.md`.

**Offen aus Sitzung 4:**

| Punkt | Stand |
| --- | --- |
| Florians Urteil zu Abzweigungen und Pose Etappe 2 und 3 | steht aus; beides ist jetzt in Ozzy benutzbar (P von Punkt oder Linie, „Fressen“) |
| Pose Etappe 4 (beide Seiten frei) | nicht begonnen; zuerst ein eigener kleiner Beweis (Rechnung und Linien setzen überall Spiegelpaare voraus) |
| Pose Etappe 5 (sein Ablauf an einer seiner Formen) | nicht begonnen |
| Umgeschlagene Dreiecke an der Mitte | Zug an der Kieferspitze von „maul handgemacht test“: 8 bis 10 kleine Dreiecke, in Grundform und Pose; Ozzy meldet dasselbe an dünnen Spitzen (Fischschwanz: 21) |
| Schritt 4c (Rest der halben Haut) | fest vorgemerkt („es soll nicht vergessen werden“), nicht begonnen |
| Griff eines glatt gesetzten Punkts bei Abzweigungen | wird nicht übernommen, wie er gezogen wurde |
| Maul-System | eigene Sitzung; zuerst beschreibt Florian die Fälle (Fragen in `docs/UEBERGABE.md` 7.16) |
| Schritt 7 (Auswahl wie in Blender) | in Ozzy inzwischen als Lasso gelöst; ob mehr nötig ist, entscheidet er |
| Nicht geprüft | feines Netz, Sichern und Laden in der Pose, gelöschte Punkte und Linien der Grundform bei bestehender Pose, G/S/R an ganzen Loops |

**Werkzeuge seit Ozzy** (für alle Proben und Texte): P und Freihand (N) sind die Hauptwerkzeuge. **L ist das Lasso.** Das alte L (Loop
schneiden) gibt es als Taste nicht mehr; ein Loop rundum entsteht mit P: zwei Klicks im Leeren quer über die Form, dann ↩ (derselbe
Handgriff im Werk, bisher nur gerade; gebogen ist offen). Im Prüffenster `kurven.html` gelten die alten Tasten weiter.

## 3. Prüfung der Übernahme

**Der Schnitt `kurven.ts` → `werk.ts` stimmt.** Verglichen wurden alle Funktionen der obersten Ebene von `kurven.ts` (`f248c538`)
mit `werk.ts` und der neuen Hülle `kurven.ts`, ohne Kommentare, ohne `export`, `G.` und `anzeige.`: 177 Funktionen, keine fehlt, 174
gleich. Anders sind nur `zugBewegen` (eine Zeile für `zugGriffRaum`, S6b) und `maulFormenGewaehlt`, `maulSchritt` (`eingabenSperren`
statt Zugriff auf die Seite). Neu im Werk: `neuAusUmriss`, `zugGriffRaum`. Der Schnitt ist wiederholbar
(`scripts/werk-schnitt/schnitt.mjs`). Das ist gute Arbeit und sollte so bleiben.

### 3.1 Fehler: Die Bremse „flüssig zuerst“ greift in Ozzy nicht

Das Werk rechnet im Bildtakt: je Bild eine Runde des Lösers und so viele weitere, wie in
`min(BUDGET_MS, BILD_MS − bildRestMs)` passen (12 ms, 14,5 ms). `bildRestMs` ist, „was das Bild sonst kostet“. Gemessen wird es am Ende
von `bildRechnen` als Dauer dieser Funktion ohne die Runden (`werk.ts`, Zeile 5350). Im Prüffenster zeichnen die Haken der Anzeige
innerhalb von `bildRechnen`; dort stimmt die Zahl. **In Ozzy setzen die Haken nur Merker** (`main.ts` ab Zeile 427: `werkNeu = true;
anstossen()`), gezeichnet wird danach in `bild()`. `bildRestMs` fällt deshalb gegen null, und das Werk rechnet bis zu **12 ms je Bild**;
Ozzys eigene Arbeit (glatte Haut, Linien, zwei Zeichenflächen) kommt obendrauf. Das ist genau der Zustand, den „flüssig zuerst“ am
13.11. behoben hatte.

**Abhilfe (klein, keine Änderung der Rechnung):** Ozzy misst sein ganzes Bild und meldet dem Werk den Rest (ein Setzer für
`bildRestMs` statt der Messung in `bildRechnen`, oder die Messung um Ozzys Teil ergänzen). `BILD_MS` aus dem Takt des Bildschirms
ableiten statt fest 14,5. An kleinen und mittleren Formen sinkt die Bildzeit im Zug damit sofort auf den Takt; an „strange bird“ läuft
ohnehin nur eine Runde (6,7 ms), dort hilft erst Abschnitt 5, A3.

### 3.2 Weitere Risiken aus dem Einbau

- **Die Pose wird je Bild mehrfach gedreht.** `werk.alsAnzeige` dreht bei jedem Aufruf die ganze Haut und kopiert alle Linien. In
  Sitzung 4 wurde das für die drei Blätter zusammengelegt (`blaetterZeichnen`). Ozzy ruft `alsAnzeige` an zwölf Stellen (`werkBlatt.ts`
  sechs, `main.ts` sechs: Haut, Linien, Strahltreffer bei jeder Zeigerbewegung, Pinsel). In „Fressen“ ist Ozzy dadurch spürbar teurer
  als in der Grundform. Abhilfe im Werk: das Gedrehte merken, solange sich Ruhe und Winkel nicht ändern (ein Zähler).
- **`werkHaut.ts` ist eine Kopie** der glatten Anzeige aus `kurven.ts` (steht auch in Ozzys Übergabe, Vorschlag 7). Jede Verbesserung
  der Anzeige muss heute an zwei Stellen geschehen.
- **Punkte ohne Spiegelbild:** Der Kern legt beim Verdichten nahe der Mitte Punkte ohne Spiegelbild an (Plan des Kerns, A.4: „strange
  bird“, 1 von 7 727). Ozzy hat das Sichern solcher Stände erlaubt (S11, mit Florians Wort), die Ursache blieb. **Folge:** Die Rechnung
  auf der Hälfte braucht für jeden Punkt ein Spiegelbild (`halbMoeglich`), sonst rechnet der Löser ohne Meldung auf der ganzen Haut, und
  Schritt 4c kann auf einem solchen Stand nicht aufbauen. Zuerst die Ursache im Kern beheben, dann eine Zählung „Punkte ohne Spiegelbild“
  in die Proben nehmen.
- **Start ohne Linie an der Spiegelkante (S9, Standard):** Damit beginnt jede neue Form als „Form ohne Linien“. In Sitzung 4 war das der
  Randfall mit bekannten Schwächen (ein einzelner Loop hält die Haut nicht, der erste Griff ruckt; zwei Punkte dicht beieinander machen
  die Zitrone). Ozzys Beweis sagt: Die Haut steht, die erste Linie lässt sie stehen, „der erste Zug baut das Netz neu“. **Zu prüfen
  (eine Probe):** erste Linie und erster Zug an einer aufgeblasenen Form ohne Linien; wie weit bewegt sich die Haut fern der Linie?
- **Greifen hängt vom Bild davor ab** (Ozzys eigene Falle „erst zeigen, dann drücken“): `druecken` greift den Tropfen, der seit dem
  letzten Bild am Zeiger hängt (`verhalten.ts`, `zustand === 'folgt'`); gibt es keinen, dreht das Drücken die Ansicht oder zieht einen
  Rahmen. Mit der Maus liegt fast immer ein Bild dazwischen. Mit Stift oder Finger ohne Schweben nicht: Der erste Tipp auf einen Punkt
  greift dann nichts. Abhilfe: beim Drücken das Ziel für genau diesen Ort sofort bestimmen (dieselbe Suche, ohne Animation).

## 4. Tempo: was gemessen ist

Werkzeug `apps/editor/scripts/pruefen/ozzy-messen.mjs`, Testbrowser mit Grafikkarte, 1440 × 900, Form „strange bird“ (7 437
Rechenpunkte), je ein Lauf am 17.11. nachmittags. „Rechnen“ ist die Zeit von `bild()` auf dem Prozessor, „Abstand“ der Abstand zweier
Bilder (im Testbrowser an 60 Hz gebunden). Zweite Spalte: derselbe Lauf mit einfacher statt doppelter Pixeldichte (Kopie der Probe mit
`deviceScaleFactor: 1`), also einem Viertel der Bildpunkte.

| Ablauf | doppelte Dichte: Rechnen (Median / 95 %) · Abstand | einfache Dichte: Rechnen · Abstand |
| --- | --- | --- |
| Drehen im Raum (1,5 s) | 3,5 / 4,6 ms · **22,0 / 36,0 ms** | 3,0 / 3,7 ms · 16,7 / 21,9 ms |
| Vier Ansichten auf und zu | 4,2 / 7,3 ms · 16,7 / 19,1 ms | 3,8 / 5,5 ms · 16,9 / 27,7 ms |
| Zug an der Wand (1 s) | **17,0 / 26,8 ms** · 18,4 / 28,7 ms | 17,3 / 24,8 ms · 19,4 / 30,3 ms |
| nach dem Zug, Haut steht (liest jedes Bild zurück) | 18,1 / 20,5 ms | 10,4 / 15,1 ms |

Teile im Zug (Median): Werk 6,7 · glatte Haut 5,2 · Linien bauen 1,5 · Seifenhaut zeichnen 0,3 · Linien zeichnen 0,4 · Wände 0,5 ·
nicht zugeordnet rund 2,4 ms. Ozzys Messblatt vom 16.11. (alle drei Formen): [`docs/progress/ozzy/2026-11-16-messen.md`](../progress/ozzy/2026-11-16-messen.md).

**Was daraus folgt:**

- **Im Zug bremst der Prozessor,** unabhängig von der Dichte, unverändert seit dem 16.11. (damals 17,3 / 24,8). Ein Bild dauert länger
  als ein Takt von 60 Hz; an einem Bildschirm mit 120 Hz sind das zwei bis drei Takte je Bild und ungleichmäßig.
- **Beim Drehen bremst die Grafikkarte.** Gerechnet werden 3,5 ms, die Bilder kommen bei doppelter Dichte nur alle 22 ms, bei einfacher
  pünktlich. Wo jedes Bild zurückgelesen wird, wartet der Prozessor auf die Grafikkarte: 18 gegen 10 ms. Die Zeiten der Ozzy-Sitzung
  („Seifenhaut zeichnen 0,3 ms“) messen nur das Absetzen der Befehle, nicht die Arbeit der Grafikkarte; die kam in keiner Messung vor.
- **Warum die Seifenhaut so teuer ist** (`src/anfang/haut.ts`, gelesen): Sie zeichnet in ein Ziel mit **vierfacher Kantenglättung und
  16 Bit je Kanal** (`samples: 4`, `HalfFloatType`) in voller Gerätedichte (`renderer.setPixelRatio(D)`), und das Netz der Anzeige (an
  „strange bird“ 119 000 Punkte, 238 000 Dreiecke) in **vier durchsichtigen Durchgängen** (Rückseite und Vorderseite je zweimal) plus
  einem deckenden. Bei doppelter Dichte sind das 5,2 Millionen Bildpunkte mal vier Abtastungen.
- Die flüssige Anzeige der Linien ist dagegen gut gebaut (Kacheln mit Listen je Kachel, ein Durchgang über das Bild).

**Vorbehalte:** je ein Lauf; Testbrowser, nicht Florians Fenster; die Zeit der Grafikkarte ist nicht direkt gemessen, sondern aus dem
Vergleich der Dichten und dem Zurücklesen geschlossen. Die nächste Sitzung misst zuerst im echten Fenster (Abschnitt 5, B3).

## 5. Hebel fürs Tempo, nach Wirkung je Aufwand

**A. Klein (Stunden), zuerst:**

| | Hebel | Erwartung (Schätzung) | Probe |
| --- | --- | --- | --- |
| A1 | Bildtakt richtig: Ozzy meldet dem Werk, was sein Bild kostet (3.1); `BILD_MS` aus dem Bildschirmtakt | Zug an kleinen und mittleren Formen hält den Takt, statt bis 12 ms zu rechnen | Messblatt: Zug an „maul handgemacht test“ (16.11.: 16,2 ms) |
| A2 | Seifenhaut: bei doppelter Dichte ohne vierfache Kantenglättung; in Bewegung kleineres Ziel, in der Ruhe das scharfe Bild; prüfen, ob 16 Bit und zwei Durchgänge je Seite nötig sind | Drehen kommt pünktlich; größter Gewinn an großen Fenstern und Bildschirmen | Vergleichsbild in Ruhe und Film in Bewegung, **Florians Auge**; Abstand der Bilder beim Drehen |
| A3 | Glatte Haut im Zug eine Stufe statt zwei (`GLATT_IM_ZUG` ist 260 000 Dreiecke, „strange bird“ liegt mit 238 000 knapp darunter); in der Ruhe wie heute zwei | 5,2 → rund 1,5 ms je Bild im Zug | Vergleichsbild im Zug; Messblatt |
| A4 | Kleinigkeiten in den Eingaben: `getBoundingClientRect` nicht bei jedem Ereignis (auch je zusammengefasstem Ereignis); Strahl gegen die Haut (`werkHautTreffen`, alle Dreiecke) einmal je Bild statt je Zeigerbewegung; `alsAnzeige` merken (3.2) | weniger Arbeit zwischen den Bildern, vor allem mit Stift (bis 240 Ereignisse je Sekunde) und in der Pose | Messblatt Pose |
| A5 | Weichzeichner hinter Leiste, Tropfen und Menü (`backdrop-filter`) über weißem Papier: kaum sichtbar, kostet bei jedem Bild der Flächen darunter | klein am Mac, mehr am iPad | Vergleichsbild, Florians Auge |

Nach A1 und A3 sollte der Zug an „strange bird“ bei rund 13 ms liegen (eine Runde 6,7 + Haut 1,5 + Rest 5), also stabil 60 Bilder je
Sekunde. Das ist eine Schätzung, kein Messwert.

**B. Mittel (Tage):**

- **B1 Linien nicht jedes Bild neu bauen.** `werkBlatt.bauen` baut je Bild alle Linien auf allen Flächen aus Objekten, Zeichenketten
  als Schlüssel und Abbildungen (1,5 ms, dazu viel Abfall für die Speicherbereinigung: kleine Aussetzer). Besser: Aufbau (Punkte,
  Schlüssel, Kontrollpunkte im Werk) nur, wenn sich das Werk ändert; je Bild nur die Lagen durch die Abbildung der Fläche schicken
  (Zahlenfelder). Passt zu Ozzys Vorschlag 3 „eine Abbildung je Fläche“ und sollte zusammen gebaut werden.
- **B2 Glatte Haut vom Prozessor nehmen.** Heute rechnet der Prozessor je Bild alle feinen Punkte und reicht für die Seifenhaut drei
  Werte je Punkt weiter, danach wird das Netz zweimal hochgeladen (Seifenhaut und weißer Körper, zwei Zeichenflächen). Wege: die
  Rechnung in einen Worker (ein Bild Verzug nur für die Haut), oder die letzte Stufe und das Weiterreichen in den Shader (feines Netz
  fest, je Bild nur die groben Lagen und Normalen als Textur). Dann gleich für Prüffenster und Ozzy gemeinsam (3.2).
- **B3 Messen, was man sieht.** Im Messblatt fehlen: verpasste Bilder im echten Fenster am echten Takt, die Zeit der Grafikkarte
  (Zeitmessung der Grafikkarte, wo der Browser sie hergibt; sonst der Vergleich der Dichten), ein Schalter für die Dichte in
  `ozzy-messen.mjs`, der nicht zugeordnete Rest als eigener Teil. Messblatt vor und nach jedem Schritt, je ein Lauf.

**C. Groß (Kern):**

- **C1 Der Löser aus dem Bildtakt.** Solange eine Runde im Bild läuft, kostet der Zug an großen Formen mindestens die Runde (6,7 ms).
  Für 120 Bilder je Sekunde im Zug muss die Runde in einen Worker; das Bild holt die jeweils neueste Haut. Der Kern ist dafür geeignet
  (ohne Seite und ohne three.js, `verfeinern.worker.ts` zeigt den Weg); heikel sind Netzwechsel, Nachlauf, Pose und der Stand. Eigener
  Plan mit Beweis zuerst.
- **C2 Schritt 4c** (Rest der halben Haut) macht jede Runde kürzer und war dafür vorgemerkt; Voraussetzung: keine Punkte ohne
  Spiegelbild (3.2).
- **C3 Später:** der Löser als WebAssembly, die Anzeige auf WebGPU (Abschnitt 8).

**Ziel mit Florian klären:** Ozzys Plan nennt 120 Bilder je Sekunde (Median 6 ms). Mit A und B sind stabile 60 erreichbar, 120 im Zug
erst mit C1. Gleichmäßige 60 fühlen sich besser an als ein Wechsel zwischen 60 und 120.

## 6. Eleganter bauen

Ozzys Übergabe nennt selbst neun Punkte (Abschnitt 8 dort). Dem stimme ich zu; meine Gewichtung und Ergänzungen:

1. **Erst messen und die kleinen Hebel, dann schneiden.** `main.ts` (5 643 Zeilen) mechanisch aufzuteilen ist richtig, aber erst nach
   A1 bis A5: Die Aufteilung ändert kein Verhalten und kein Tempo.
2. **Eine Bildschleife mit benannten Abschnitten und Messpunkten** (Werk, Haut, Linien bauen, Zeichnen, Oberfläche). Heute liegen
   rund 2,4 ms im Zug und im Ansichtswechsel noch mehr außerhalb der Messpunkte.
3. **Das Werk sagt mit einem Zähler, was sich geändert hat** (Netz, Lagen, Linien, Pose), statt dass Ozzy aus Merkern und Zeiten rät
   (`werkNeu`, `werkZuletzt < 2500`, `geaendert < 200`). Daran hängen B1, B2 und das Merken in `alsAnzeige`.
4. **Abbildung je Fläche und B1 zusammen** (ein Typ für Wand, Feld, eingerastete Ansicht, Kistennetz): weniger Stellen, an denen es
   auseinanderläuft (zweimal geschehen), und die Voraussetzung, Linien nur noch zu verschieben statt neu zu bauen.
5. **Eine Art Fahrt** (Ozzys Vorschlag 4) und **die Proben als eine Reihe** (Vorschlag 1) sind klein und lohnen sich.
6. **Zwei Zeichenflächen mit zwei Grafik-Kontexten** (Seifenhaut, Linien) sind heute getrennt; das feine Netz liegt dadurch doppelt auf
   der Grafikkarte. Vorteil der Trennung: Die Haut darf eine kleinere Auflösung haben als die Linien (A2). Erst nach B2 neu bewerten.

## 7. Design und Bedienung: Vorschläge

Ich habe Ozzy nur kurz selbst bedient und sonst Bilder und Code gelesen; das sind Vorschläge, Florians Auge entscheidet.

1. **Zeiger.** Der Systemzeiger ist aus (`#linien { cursor: none }`), der Zeiger wird im Bild gezeichnet. Er hängt damit mindestens
   ein Bild hinter der Hand und ruckt mit jedem verpassten Bild; dafür ist das Auge sehr empfindlich. Vorschlag: der Systemzeiger (als
   eigene Form je Werkzeug) für Ruhe und Zeigen, der gezeichnete Zeiger nur, solange er sich von der Hand lösen soll (beim Greifen
   gleitet er zur Stelle). Tropfen, Schwellung und Feld bleiben flüssig im Bild. Zuerst als Film zum Vergleich.
2. **Greifen sofort beim Drücken** (3.2): wichtig für Stift und Finger, und für schnelles Arbeiten mit der Maus.
3. **Nach dem Loslassen** sitzt der gezeichnete Zeiger noch an der Stelle und findet erst mit der Bewegung zur Hand zurück (gewollt).
   Solange sollte für das nächste Ziel die Hand zählen, nicht der gezeichnete Zeiger.
4. **Die Hinweiszeile** unten ist länger als das Fenster und links und rechts abgeschnitten (in allen Bildern vom 17.11.). Vorschlag:
   nur, was unter dem Zeiger und mit dem Werkzeug gerade möglich ist (höchstens drei Angaben), der Rest hinter einem Tropfen „?“ oder
   an den Tropfen der Leiste (Taste im Tropfen).
5. **Auflösung in Bewegung** (A2): Die Seifenhaut ist weich; ein kleineres Bild während der Drehung fällt vermutlich nicht auf, die
   Linien bleiben scharf (eigene Fläche). Sein Auge entscheidet am Film.
6. **⌘Z:** Die Linien fließen zurück, die Haut springt (steht in Ozzys Liste); die Haut sollte mitfließen oder beides springen.
7. **G/S/R** an der Auswahl gibt es im Prüffenster; in Ozzys Bedienung habe ich es nicht gefunden. Gewollt? Mit dem Lasso läge es nahe.
8. **Loop rundum mit P** ist nur gerade; gebogen (Punkte unterwegs) wäre derselbe Handgriff wie die Abzweigung mit Zwischenpunkten.

## 8. Native App?

**Empfehlung: jetzt nicht.** Gründe:

- Beide gemessenen Engpässe liegen nicht am Browser: ein Zähler, der in Ozzy nichts mehr misst, und ein Zeichenziel, das für Retina
  viermal zu groß angelegt ist. Nativ wären beide genauso da.
- Rechenkern, Werk, Studien und Ozzy (zusammen deutlich über 30 000 Zeilen) müssten neu geschrieben werden; das sind Monate ohne neue
  Funktion, und die Proben im Browser fielen weg.
- **Materialien und Effekte müssen im Spiel gleich aussehen.** Das Spiel zeichnet mit three.js auf WebGPU (`packages/render`). Baut
  Ozzy seine Materialien dort, gibt es sie einmal; in einer nativen App gäbe es sie zweimal, mit dem Risiko, dass der Look
  auseinanderläuft.
- Der Weg im Web ist noch lang: Löser im Worker (C1), Haut auf der Grafikkarte (B2), später WebGPU für Fell und Schichten und der Löser
  als WebAssembly.

**Wann neu fragen:** wenn nach A bis C1 der Stift am iPad im Browser nicht gut genug ist (Verzögerung des Strichs, Schweben, Druck).
Dann zuerst eine schmale native Hülle um dieselbe Seite prüfen, nicht eine neue App.

## 9. Vorschlag für die nächste Sitzung

Je Block eine vorher festgelegte Probe; Aussehen entscheidet Florian an Bild oder Film.

1. **Messen im echten Fenster** (B3, klein): Messblatt um Dichte, verpasste Bilder und den Rest ergänzen; Stand heute an seinen drei
   Formen. Das ist die Grundlinie für alles Weitere.
2. **Bildtakt** (A1) und **Eingaben** (A4): kein sichtbarer Unterschied außer dem Tempo. Probe: Messblatt, dazu die 24 Proben von Ozzy
   und die Proben des Prüffensters (`form-*`), die den Zug betreffen.
3. **Seifenhaut und Stufen** (A2, A3, A5): je ein Vergleichsbild und ein Film; sein Wort.
4. **Zeiger und Greifen** (Abschnitt 7, 1 bis 3): Film zum Vergleich; sein Wort.
5. **Linien und Haut** (B1, B2, mit Abschnitt 6, 3 und 4): eigener kleiner Plan.
6. **Kern:** Punkte ohne Spiegelbild (Ursache), umgeschlagene Dreiecke an der Mitte, erste Linie an der Form ohne Linien (Probe), dann
   der Löser im Worker (C1) mit Beweis zuerst, dann 4c. Pose Etappe 4 und 5 nach seinem Urteil zu Etappe 2 und 3.

**Fragen an Florian zu Beginn:**

1. Ziel fürs Erste gleichmäßige 60 Bilder je Sekunde, 120 als zweiter Schritt (mit C1)?
2. Darf die Seifenhaut in Bewegung mit kleinerer Auflösung zeichnen, wenn die Ruhe scharf bleibt?
3. Systemzeiger für Ruhe und Zeigen (Abschnitt 7.1): als Film zum Vergleich bauen?
4. In welcher Reihenfolge: erst Tempo (Blöcke 1 bis 5), dann Kern (Block 6)?

## 10. Einstieg

| Was | Wo |
| --- | --- |
| Arbeitsbaum, Zweig, Server | `.claude/worktrees/ozzy`, `claude/ozzy`, Port 5205 (`ozzy.html`, daneben das Prüffenster `kurven.html?gewichte=geometrie`) |
| Stand, Bedienung, Aufbau, Fallen von Ozzy | [`docs/look/ozzy/UEBERGABE.md`](../look/ozzy/UEBERGABE.md), Pläne `docs/plans/2026-11-16-ozzy.md` und `…-ozzy-weiter.md` |
| Kern: Plan, Übergabe, Fallen | `docs/plans/2026-11-12-schnell-glatt-exakt.md`, `docs/UEBERGABE.md` (Stand 14.11.), `apps/editor/CLAUDE.md` |
| Messen | aus `apps/editor`: `GPU=1 FORMEN="strange bird" node scripts/pruefen/ozzy-messen.mjs` (rund eine Minute je Form); im Fenster `?info=1` |
| Stellen im Code | Bildtakt des Werks: `werk.ts` `BUDGET_MS`, `BILD_MS`, `bildRestMs`, `bildRechnen`, `zugRechnen`; Ozzy: `main.ts` `schleife`, `bild`, `werkBild`, Haken ab Zeile 427, Zeigerbewegung ab 4068; Seifenhaut: `src/anfang/haut.ts` (Ziel mit `samples: 4`, fünf Materialien); glatte Haut: `werkHaut.rechnen`, `werk.glattStufen`, `GLATT_IM_ZUG`; Linien: `werkBlatt.bauen` |

**Regeln, die weiter gelten:** Florians Fenster (`form-alt`, Port 5194) nicht anfassen. Nichts ohne Vergleichsbild oder Film, nie
„bestanden“ ohne ihn. Keine Messreihen im Hintergrund, je Schritt ein Lauf. Ozzys Sitzung durfte am Rechenkern nichts ändern; die
nächste Sitzung ist die des Kerns und darf es, mit Probe am Prüffenster und an Ozzy. S21 (Gleiten der Wände) ruht.

## 11. Nicht geprüft

- Die Studien im Einzelnen (`src/linien/raum.ts`, `verhalten.ts`, `src/anfang/`): nur ihre Pläne und die Stellen, die Ozzy je Bild ruft.
- Ob die 24 Proben von Ozzy und die Proben des Prüffensters heute halten (Ozzys Übergabe sagt: ja, am 17.11.); keine davon lief hier.
- Das iPad und das iPhone, Florians echtes Fenster, 120 Hz.
- Aufblasen und Laden ohne Zurücklesen (die vorhandene Messung liest dort jedes Bild zurück: 26 bis 42 ms je Bild sind kein Tempowert).
- Der Zweig `claude/maskottchen`.
