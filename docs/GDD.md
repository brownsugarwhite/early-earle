# early earle — Gamedesign-Dokument v0.1

> **Status:** v0.1 (Phase 0), Stand 2026-09-29. Grundlage ist der freigegebene Masterplan v0.1; Belege und Zahlen stammen aus den vier Recherche-Reports in `docs/research/` (kondensiert in [`RESEARCH.md`](RESEARCH.md)). Stilregeln im Detail: [`STYLE.md`](STYLE.md). Engine-Vergleich: [`ADR/0001-engine.md`](ADR/0001-engine.md). Phasen, Prototypen, Werkzeuge: [`PRODUCTION.md`](PRODUCTION.md).
>
> **Für wen:** Florian (Art Direction, Entscheidungen), Nicole (Test, Content), KI-Agent (Umsetzung). Das Dokument ist bewusst mit Platz für Optimierung geschrieben.
>
> **Legende:** **Offen** = noch nicht entschieden. **Zu verfeinern** = im Prinzip entschieden, Zahlen oder Details ändern sich mit Prototyp- und Testdaten. *(unverifiziert)* = Aussage ohne belastbare Quelle.

---

## 1. Vision und Pitch

**Ein Satz.** early earle ist ein levelbasiertes 2048: Man wischt zähflüssige Blob-Wesen über ein kleines Raster, zwei gleiche verschmelzen zu einem neuen, größeren Wesen, und mit jedem geschafften Level kehren Farbe und Leben auf einen zerbrochenen Müllplaneten zurück — gezeichnet im Stil **„Neo-Brutalismus trifft Eyvind Earle"**.

**Warum es das noch nicht gibt.** Die Recherche fand kein bekanntes Spiel, das 2048-Wischen mit Level-Map, sich entwickelnden Wesen und einer Geschichte verbindet. Die nächsten Verwandten sind Threes (Kacheln mit Charakter und Spawn-Vorschau), Pudding Monsters (Wisch-Blobs in Leveln), Triple Town (Evolutionskette, Wesen als Blocker) und Merge Dragons (totes Land heilen). Die Lücke ist echt. Die Match-3-Forschung warnt zugleich: erzwungene „innovative" Levelmodi überfordern Spieler. Deshalb: **eine** Kernmechanik, konsequent ausgebaut, keine Sondermodi.

**Messlatte.** Candy Crush, Best Fiends und Apple-Arcade-Titel — bei minimalem Personalaufwand: Florian (Art Direction, Module, Illustration, Paletten), Nicole (Test, Content), KI-Agent als dritter Entwickler (Code, Generatoren, Level, Kalibrierung, Docs).

**Was gesetzt ist.** Der Splashscreen (illudiy-„i" mit dem Blob als i-Punkt) und der Anfangsblob **pezenpez** (Screenshot 3). Alles andere in diesem Dokument ist Vorschlag.

**Zweck.** Ein Drittel der Nettoeinnahmen geht an Tierschutz-Organisationen. Das ist Teil des Konzepts und im Spiel sichtbar (Abschnitt 11).

**Plattformen.** App-first (iOS, Android), außerdem im Browser. Echtes 3D, echtes Rigging, 3D- und 2D-Partikel, Apple Liquid Glass (an Earle angepasst) mit Fallbacks für Android und Web.

## 2. Stil-Leitsatz

„Neo-Brutalismus trifft Eyvind Earle" steht über allem.

- **Earle liefert Welt, Licht und Ornament**: gestapelte horizontale Bänder, gemeißelte Hügel, messerscharfe Riesenschatten, Kronen aus dunklen Kuppeln mit hellem Punktrand, Juwelentöne gegen getöntes Fast-Schwarz.
- **Neo-Brutalismus liefert Raster, HUD und Typografie**: ungefilterte Flächenfarben, harte Versatzschatten, große rohe Grotesk, sichtbare Konstruktion.
- **Liquid Glass** ist „gefärbtes Glas über Earle-Bändern", nie der Apple-Standardlook.

**Konturen-Regel (Florian, verbindlich).** Es gibt genau zwei Zustände:

1. **Keine Kontur** — Standard für alles: Figuren, Terrain, Pflanzen, Raster, Typo, Buttons. Kanten entstehen ausschließlich aus Wertkontrast. Keine Inverted-Hull-Outlines, keine Screen-Space-Outlines, keine dünnen oder mittleren Umrandungen — nirgends.
2. **Eine einzige, komplett übertrieben fette Verlaufskontur**, wie die pinke Kontur des illudiy-„i" im Splashscreen (Breite ~8–12 % der Elementgröße, Zweifarb-Verlauf, hart abgesetzt). Reserviert für wenige Hero-Elemente: Level-Platte, REX-Emblem, Hauptaktion, Zonen-Portal.

Filigrane Linien und Muster — Earles fraktale Astzeichnungen, die vertikalen Striche und Schraffuren seiner Monolithe, Punkt- und Rautenmuster in den Kronen, dazu mathematische Ornamente (Phyllotaxis-Spiralen, Lissajous-Bahnen, Truchet-Kacheln, Moiré-Streifen) — sind ausdrücklich erwünscht: **als Ornament und Textur, nie als Umriss**, und sie leben (Zeit-Uniforms). Details, Paletten und Do/Don't: [`STYLE.md`](STYLE.md).

## 3. Welt und Plot

### 3.1 Prämisse

Der Planet heißt **Earle**. Die alten Lebensformen sind fort; zurück blieben Müllgebirge, Ölsümpfe und ausgasende Halden. Aus den Gasen kondensierte zähes Leben: die **Blobs** — selten, dumm und weich. **pezenpez**, ein Anfangsblob mit einem schlechten Auge (dunkler Schlitz), ist nicht klug, aber zäh. Er ist der erste, der begreift, dass zwei Gleiche zu etwas Neuem werden können. Der Planet *bricht*: Sichtbare Risse ziehen sich über die Kugel-Map. Jede geheilte Zone schließt einen Riss.

### 3.2 REX

REX ist das Gedächtnis der alten Erde: ein uraltes Wesen mit Spiral-Augen (benommen von den Gasen, wie im illudiy-Logo), das den Untergang gesehen hat und die neuen Kleinen begleitet. Er erklärt nichts lang — er zeigt, jubelt, verzweifelt komisch, taucht am Map-Rand auf, hängt an Level-Kanten, kommentiert Combos und Fehlversuche. Rolle wie der Yeti in Candy Crush, aber mit Charakter und einer eigenen Mini-Story pro Zone. Auftrittskadenz: Abschnitt 9.

### 3.3 Vier Zonen für die ersten 100 Level

Zonennamen aus Florians Draft (Screenshot 6).

| Zone | Level | Welt | Palette | Material-Freischaltung |
|---|---|---|---|---|
| **Tjorizo** | 1–25 | Rosttal, Gasquellen, Schrotthügel | Türkis, Rost, Neongrün-Himmel | Jelly (Start) |
| **Syrup** | 26–50 | Sirup-/Ölsumpf, klebrige Ebenen, Rohre | Bernstein, Violett, Orange | Flüssig (Level 27) |
| **Luzz** | 51–75 | Leucht-Nebel-Hochland, Punktwälder, Käfigruinen | Blau, Türkis, Weißnebel | Gas (Level 52) |
| **Wooding** | 76–100 | Erster echter Wald wächst zurück | Earle-Gelbgrün, Schwarzkronen | Feuer, kontrolliertes Brennen (Level 77) |

Jede Zone endet mit einem **Riss-Level** (25, 50, 75, 100) und hat einen **Mid-Zone-Spike** (13, 38, 63, 88). Level 100 ist „das erste Wäldchen": Die Kugel ergrünt sichtbar, mit Ausblick auf Zone 5+ (Ozean, Eis, Stadtruine, …). Das Zonensystem ist unendlich erweiterbar: neue Zone = neue Palette, 1–2 neue Elemente, neue Material-/Asset-Familie.

### 3.4 Aufbruch statt Tod („Evolve & Release")

Erreicht ein Blob die Zielstufe eines Levels (die **Kappe**), stirbt er nicht und verschwindet nicht einfach: Er **verlässt das Raster** mit einer Kamerafahrt und taucht als neues Wesen in der Map-Zone auf. Die Map füllt sich so mit den Wesen, die der Spieler selbst erschaffen hat — sie sind die „Mutationspartner", die pezenpez sucht. Vorbilder: World of Goo (Goo-Bälle in die Röhre) und Terra Nil („keine Spur hinterlassen"). Spielmechanisch entlastet der Aufbruch das Brett (Prinzip „Maximalstufe verschwindet" aus 2048 Variants) und ist gleichzeitig der Story-Moment.

### 3.5 Erzählmittel

Von entsättigt zu gesättigt. Tiere kehren zurück (als Earle-Silhouetten). Die Kugel als persistentes „Fenster", das sich verändert. Abschieds- und Freilassungsmomente. Kein Text, wo ein Bild reicht.

## 4. Kernloop

1. Auf der Kugel-Map ein Level antippen — der „Weiter"-Knoten ist immer einen Daumen-Tipp entfernt (Auto-Rotation zum aktuellen Knoten).
2. Kamerafahrt ins Level; die Rasterplatte klappt aus dem Boden.
3. 2048-Raster mit **einem** Ziel („erzeuge einen 128er", „befreie 3 eingeschlossene Blobs", „räume den Müll in N Zügen").
4. Belohnung: neue Mutationsstufe, Aufbruch der Zielwesen auf die Map, der Map-Abschnitt lebt auf (Pflanzen wachsen, Farbe kehrt zurück; am Zonenende schließt sich der Riss).
5. REX kommentiert; zurück zur Map ohne Ladebildschirm — alle Übergänge sind eine kontinuierliche Kamerafahrt.

Referenz für die Sitzungslänge: Puzzle-Sitzungen dauern im Mittel ≈ 5,6 Minuten. Ein Level muss darin bequem Platz haben.

## 5. Regeln

### 5.1 Grundregeln

- Raster **4×4 bis 6×6** mit Masken (Risse = Zellen, die nicht existieren) und Pfeilern. Tutorial-Bretter sind kleiner, ab 1×3 (Abschnitt 6.6).
- Ein Wisch bewegt alle Figuren in die Wischrichtung; zwei gleiche Stufen, die aufeinandertreffen, verschmelzen zur nächsten Stufe.
- Nach jedem Zug spawnt eine Figur **aus einer Gasquelle** (Spawn-Tabelle pro Level). Der **nächste Spawn ist immer sichtbar** (Vorschau wie in Threes).
- **Zuglimit** pro Level. Verändert kein Wisch mehr etwas, oder sind die Züge aufgebraucht, ist der Versuch verloren: **keine Leben, sofort neu**.
- Stufen werden als **Wesen** dargestellt; Zahlen sind ein optionales Badge.
- **Aufbruch**: Erreicht ein Blob die Level-Kappe, verlässt er das Raster. Zwei gleichzeitige Aufbrüche erzeugen eine **Stufenbombe**.
- Levelziele liegen bei **Stufe 5–8 (32–256)** mit vorplatzierten Blobs. Stufe 11 (2048) nur in Set-Piece-Leveln — ein 2048er braucht ~930 Züge.
- **Höchstens 3–4 Elementtypen pro Level**; jedes Level hat *eine* Idee; jedes Level ist **ohne Booster lösbar** (Bot-verifiziert); eine Idee wiederholt sich nicht innerhalb von ~50 Leveln.

### 5.2 Zwei Strukturprobleme von 2048, die das Leveldesign löst

1. **Die Ecken-Strategie** gewinnt fast immer. Gegenmittel: unregelmäßige Bretter, Innenpfeiler (schaffen neue Verschmelzorte) und **Ziele in der Mitte** — Figuren rutschen immer an Wände, Randziele sind leicht, Mittelziele schwer.
2. **Exponentielle Kosten** (~930 Züge bis 2048). Gegenmittel: Zielstufen 5–8, vorplatzierte Blobs, Aufbruch.

Von Threes übernommen: Vorschau des nächsten Spawns und gerichtete Spawns (nur aus Gasquellen) — mehr Kontrolle ohne mehr Schwierigkeit.

### 5.3 Regeln im Detail (Vertrag für Kern, Renderer und Solver)

Dieser Abschnitt ist der verbindliche Vertrag zwischen `@ee/core` (Regeln), dem Renderer (Timeline) und dem Solver (Bots). Änderungen hier ziehen Änderungen dort nach sich.

**Zugphasen in fester Reihenfolge.** Jedes Ereignis (`slide`, `merge`, `special`, `release`, `tierBomb`, `spawn`, …) trägt einen Phasenindex; der Renderer baut daraus die Animations-Timeline.

| Phase | Inhalt |
|---|---|
| 1 | Rutschen + Verschmelzen |
| 2 | Nebenwirkungen an der Landezelle und ihren vier Nachbarn (heilen, Spore sammeln, Schrott −1 Lage, Kruste tauen, Schläfer wecken, Käfig öffnen, Nebel aufdecken, Fäulnis immunisieren; Feuer verbrennt Kruste/Fäulnis daneben) |
| 3 | Spezialteile (Strahl-/Knall-Blob entstehen, Spezialteile zünden, Kombo-Tabelle) |
| 4 | Dynamik: Gasstrom, Streuner, Fäulnis, Giftwolke |
| 5 | Aufbruch (`tier ≥ cap` → `release`; zwei in einem Zug → `tierBomb`) |
| 6 | Spawn |
| 7 | Ziele, Score, Züge (Sieg, wenn alle Ziele erfüllt) |

**Regeln.**

- Rutschen erfolgt **schrittweise pro Blob** (nicht als Array-Kompression), damit Öl, Gas, Rohr und Strom sauber komponieren.
- Rohr-Ausgang belegt = Rohr blockiert.
- Gefrorene, eingesperrte und schlafende Blobs wirken als Pfeiler.
- Amöbe + Amöbe = Stufe 2.
- Ein Wisch, der nichts verändert, zählt nicht (kostet keinen Zug). **Verloren ist, wenn kein Wisch mehr etwas verändert** — nicht „Brett voll".
- Der nächste Spawn wird **vorgezogen und im Snapshot gespeichert** (Vorschau; Rückspulen würfelt nicht neu). Spawn-Fallback pro Level (`none` oder `anyEmpty`), wenn alle Quellen-Nachbarn belegt sind.
- Eingabe wird nach der Rutschphase wieder angenommen (Warteschlange Tiefe 1); Rutschen **140 ms**, Verschmelz-Blend **300 ms**, überlappend.
- Spezialteil-Schwellen `lineAt` und `burstAt` sind **pro Level Daten** (Richtwerte 2–3 bzw. 3–4). Zwei Verschmelzungen pro Wisch sind in 2048 Routine; feste Schwellen würden das Brett fluten. Der Solver meldet die Häufigkeit (Abnahmewert P3: Strahl-Blobs auf ≤ 40 % der Wische).
- Determinismus: `seed = hash32(levelId, attempt)`, RNG `mulberry32` als reine Funktion; der Solver würfelt nicht, sondern zählt Zufallsknoten auf.
- Alle Content-Dateien tragen `schemaVersion`; Blob-IDs sind stabil und werden nie wiederverwendet (Animation hängt daran); Invariante `cap ≥ Zielstufe`.
- Rückspulen = Snapshots (unveränderliche Zustände).
- **Score-Formel — Zu verfeinern.** Vorschlag als Ausgangspunkt (Standard-2048): Jede Verschmelzung zählt den Wert des Kindes (2^Stufe). Boni für Spezialteile, Kombos und Aufbruch werden in P3 zusammen mit dem Kern festgelegt und hier eingetragen.

### 5.4 Zieltypen

Stufe N erreichen · N Blobs aufbrechen lassen · alle verdorrten Zellen heilen („bring alles zum Blühen") · Sporen sammeln · Gefangene befreien und zum Ausgang führen · Schrott räumen · Stufe X liefern (Bestellung) · Fäulnis eindämmen · Streuner beruhigen · Punkte in N Zügen. Mischziele ab Syrup; Multi-Ziele in Wooding.

### 5.5 Element-Taxonomie

Abgeglichen mit Kings Blocker-Framework (GDC 2020). Klammer: King-Merkmale — **N** Natur, **B** Bewegung, **E** Entdeckung, **Z** Zerstörung. Der häufigste und zugänglichste Typ ist *stationär, farblos, geschichtet, entfernbar, Verschmelzung-daneben* („daneben" ist deutlich leichter zu treffen als „darauf": 104 vs. 44 mögliche Konfigurationen).

| Gruppe | Element | Verhalten im Raster | King |
|---|---|---|---|
| Layout | **Riss** | Zelle existiert nicht (unregelmäßige Bretter) | Layout-Hebel |
| | **Pfeiler** | unbewegliche, permanente Zelle = Innenwand, schafft neue Verschmelzorte | B-stationär, Z-unentfernbar |
| | **Fossilwand** | Wand zwischen zwei Zellen, kostet keine Zelle | Kanten-Typ |
| | **Ölpfütze** | eintretende Figur bleibt stehen | dynamischer Boden |
| | **Gasstrom** | schiebt eine Figur nach jedem Wisch um eine Zelle | E-dynamisch |
| | **Rohrpaar** | Figur tritt in A ein, kommt bei B heraus | dynamisch |
| Zellblocker | **Schrott** (1–3 Lagen) | verliert eine Lage, wenn eine Verschmelzung daneben endet | N-geschichtet, Z-daneben |
| | **Schrottberg 2×2** | 4–8 Treffer | N-Raum, geschichtet |
| | **Kruste** | Figur festgefroren; Nachbar-Verschmelzungen tauen sie | B-gesperrt |
| | **Schläfer** | verschmilzt erst, wenn eine Nachbar-Verschmelzung ihn weckt | E-verkettet |
| | **Käfig** | mit Nachbar-Verschmelzungen öffnen, dann Wesen zur Ausgangszelle führen (Rettung) | gesperrt + Ziel |
| | **Nebelzelle** | Inhalt verborgen, bis aufgedeckt | E-versteckt |
| Boden | **Verdorrt / tief verdorrt** | heilt, wenn eine Verschmelzung *auf* der Zelle landet; Mitte schwer, Rand leicht | Z-darauf |
| | **Vergrabene Spore** | wird gesammelt, wenn eine Verschmelzung auf der Zelle landet | Sammelziel |
| Bedrohung (selten) | **Fäulnis** | frisst alle N Züge eine freie Nachbarzelle, außer eine Verschmelzung berührte sie | E-dynamisch („Schokolade") |
| | **Giftwolke** | Countdown, friert danach eine Figur ein (kein Fail) | Countdown |
| | **Streuner** | wandert pro Wisch eine Zelle; eingekesselt wird er zum Helfer (Triple-Town-Bär) | B-beweglich |
| Spawn | **Gasquelle** | spawnt Basis-Blobs daneben; der Spawn-Raten-Hebel des Designers | Spawn-Hebel |
| | **Vorschau** | nächster Spawn immer sichtbar | Threes |
| Spezialteile | **Amöbe** | verschmilzt mit jeder Stufe | Joker |
| | **Strahl-Blob** | entsteht ab `lineAt` Verschmelzungen in einem Wisch (Richtwert 2–3, pro Level Daten); räumt Reihe/Spalte in Wischrichtung | |
| | **Knall-Blob** | entsteht ab `burstAt` Verschmelzungen in einem Wisch (Richtwert 3–4); 3×3-Sprengung | |
| | **Stufenbombe** | zwei gleichzeitige Aufbrüche; entfernt alle Blobs einer Stufe | |
| | **REX-Meter** | füllt sich mit Verschmelzungen; voll = REX-Brüller (räumt eine Blocker-Reihe) | Best-Fiends-Fähigkeit |
| | **Kombos** | Strahl+Strahl = Kreuz · Strahl+Knall = Dreifachkreuz · Knall+Knall = 5×5 · Stufenbombe+Spezial = Umwandlung | |

### 5.6 Material-Eigenschaften

Verbinden Evolution und Leveldesign — bewusst nur **drei Regeln**:

- **Flüssig** gleitet durch Ölpfützen.
- **Gas** schwebt über Risse und Fossilwände (kann dort aber nicht anhalten).
- **Feuer** verbrennt Kruste und Fäulnis beim Verschmelzen und entzündet Öl (Knall).

Jelly ist neutral, Fell vorerst kosmetisch.

### 5.7 Booster

Alle erspielbar, nie erzwungen: **Rückspulen** (wichtigster Booster für Casual) · **Pflücken** (eine Figur entfernen) · **Tausch** · **+5 Züge** · **Mischen**. Freischaltung: Rückspulen (8), Pflücken (17), Tausch (35). **Zu verfeinern:** Freischaltlevel für +5 Züge und Mischen sowie für den REX-Meter fehlen im Skelett noch.

### 5.8 Vier Schwierigkeitshebel (King)

Blocker · Spawn-Rate (Gasquellen, Spezial-/Zielspawns) · Designstil (explosiv, präzise, Reise, knobelig, fleißig) · Layout (offen/eng, Lücken).

## 6. 100-Level-Progression

Skelett; die Einzel-Level werden generiert, Bot-kalibriert und im Editor nachjustiert.

### 6.1 Kalibrierregeln

Aus Royal Match, King, Playrix und Room 8:

- Gemessen werden **Versuche pro Level**, nicht die Gewinnrate.
- Ziel: Level 1–20 **≤ 1,1 Versuche** (≥ 90–95 % im ersten Anlauf); normal **1,2–1,4**; **H** (hart) **1,6–2,0**; **SH** (sehr hart) **≤ 2,5** und *kurz* („wenn ein Level wirklich hart ist, muss es auch wirklich kurz sein").
- Züge: **30–38** (Level 1–20), **25–30** (21–60), **23–27** (61–100).
- Jedes neue Element bekommt **2–3 Solo-Einführungslevel** („lernen → prüfen → feiern"); das Einführungslevel ist leichter und enthält nur das neue Element.
- **Nie zwei harte Level hintereinander.** Sägezahn: 5 Level steigend, das 6. fällt.
- **Jedes 10. Level ist ein Feier-Level** („Ehrenrunde": spektakuläre Verschmelzung, Kamera).
- Harte Level werden **markiert**.
- Tutorial ohne Text: Der Spieler *tut* es (Plants-vs-Zombies-Regel: ≤ 8 Wörter auf dem Bildschirm). Jedes Level als Kishōtenketsu: einführen, entwickeln, wenden, abschließen.

### 6.2 Skelett

| Zone / Level | Neue Elemente (Level) | Zieltypen | Marker |
|---|---|---|---|
| **Tjorizo 1–10** | Wischen + Verschmelzen + Vorschau (1, fließend aus dem Splash, REX zeigt nur die Richtung), Zuglimit (2), Pfeiler (6), Booster Rückspulen (8) | Stufe erreichen, Punkte | 10 Feier |
| **Tjorizo 11–25** | Schrott (11), Sporen sammeln (14), Amöbe (16), Booster Pflücken (17), Aufbruch/Kappe (18), verdorrte Zellen (21), Strahl-Blob (24) | Schrott räumen, sammeln, heilen | 19 H, 20 Feier, 25 H = Zonenfinale (erster Riss schließt) |
| **Syrup 26–50** | Fossilwand (26), Material Flüssig (27), Käfig/Rettung (31), Knall-Blob (34), Booster Tausch (35), Kruste (41), Riss-Formen (43), Gasquellen als Hebel (46) | Retten, heilen, Mischziele | 28 H, 29 Verschnaufer, 30 Feier, 36 H, 39 H, 40 Feier, 45 H, 49 H, 50 Feier + Zonenfinale |
| **Luzz 51–75** | Schläfer (51), Material Gas (52), Stufenbombe (54), Kombos (56), Fäulnis (61), Ölpfütze (64), Giftwolke (66), Schrottberg 2×2 (71), Liefer-Ziel (73) | Aufbrechen lassen, Fäulnis eindämmen, liefern | 55 H, 59 SH, 60 Feier, 65 H, 69 SH, 70 Feier, 75 H Zonenfinale |
| **Wooding 76–100** | Rohrpaar (76), Material Feuer (77), Nebelzelle (81), Gasstrom (84), Streuner (91), Finale-Remix (96–99) | Streuner beruhigen, Multi-Ziele | 79 SH, 80 Feier, 85 H, 89 SH, 90 Feier, 95 H, 99 SH (kurz), **100 Finale**: großes Raster, alle Materialien, der Wald ergrünt |

**Zu verfeinern:**
- Die Mid-Zone-Spikes (13, 38, 63, 88) aus dem Plot sind im Skelett noch nicht als H markiert — Abgleich mit „nie zwei harte Level hintereinander" und dem Sägezahn steht aus.
- Level 50 ist als „Feier + Zonenfinale" markiert, 25 und 75 als H — die Härte der Zonenfinale wird vereinheitlicht oder bewusst variiert.
- „Großes Raster" im Finale meint die Obergrenze 6×6 der Grundregeln; das Level-Schema lässt technisch bis 8×8 zu.

### 6.3 Level-Typen im Generator

Tutorial · „fuu" (1–2 Züge, Belohnung) · Komfort · Können · H · SH · Feier.

### 6.4 Bot ist nicht Mensch

Der Bot prüft Lösbarkeit und schätzt Versuche — aber er liefert die Gewinnwahrscheinlichkeit *unter seiner eigenen Strategie*, nicht menschliche Versuche. Deshalb drei Bot-Stufen (`novice`, `average`, `strong`) und eine Abbildung auf Versuche, die an **Nicoles echten Daten** gefittet wird. Bis dahin werden **Bänder** berichtet, keine Absolutwerte. Ausreißer werden ersetzt. Details zum Solver: [`RESEARCH.md`](RESEARCH.md), Abschnitt Architektur.

### 6.5 Nach dem Launch

Abbruchrate pro Level (Playrix-Praxis: Level mit > 2 % Abbruch per A/B-Test ersetzen). Kings Regel: **Spaß getrennt von Schwierigkeit messen** (Zeit bis Abbruch, Zeit bis Sieg); „Retention gewinnt immer".

### 6.6 Tutorial-Bretter (Nachtrag Iteration 4, 2026-09-30)

Florian: Nach „Tippen" springt der Blob direkt in Level 1, das die Grundmechanik zeigt; die ersten Level haben nur so viele Zellen, wie ihre Mechanik zum Erklären braucht.

- **Raster ab 1×N.** Das Level-Schema erlaubt 1..8 × 1..8 mit mindestens zwei spielbaren Zellen (vorher ab 3×3). Das Plateau wird für mindestens 2×2 Zellen angelegt, damit ein 1×3-Streifen auf einem Plateau steht und nicht auf einem Steg. Die Kamera rahmt mindestens 3×3 Zellen (Grid-Lab; im Flow `FlowScene.levelPose`), die Wesen behalten ihre gewohnte Größe.
- **Spawn-Skript** (`spawn.script`, optional, höchstens 32 Einträge). Eintrag k ist der k-te Spawn: Stufe 1–3, Art (normal oder Amöbe), optional eine Zelle. Solange das Skript läuft, zeigt die Vorschau seinen nächsten Eintrag, und es wird nicht gewürfelt. Ist die Zielzelle beim Spawn belegt, landet der Blob auf einer zufälligen freien Zelle. Danach gilt die Spawn-Tabelle. Die Skript-Position steckt im Zustand, Rückspulen würfelt also auch hier nicht neu. Der Solver rechnet eine freie Zielzelle als einen einzigen Zweig und die Vorschau aus dem Skript ohne Zufallsknoten.
- **Zugband.** Die 30–38 Züge aus 6.1 gelten ab 4×4. Kleine Bretter bekommen so viele Züge, wie ihre Mechanik braucht.

**Level 1–6** (IDs unverändert, Level 7–10 unverändert; kalibriert mit `tools/levels/calibrate.ts`, Gewinnrate Anfänger-Bot / starker Bot). Bretter in ASCII-Stufen wie in `levelFromAscii` (1 = 2, 2 = 4, 3 = 8; `P` Pfeiler, `X1` Schrott, `s` Spore, `w` verdorrt), Startblobs und Ziele als Werte:

| # | Name | Brett | Ziel | Züge | Anfänger / stark |
|---|---|---|---|---|---|
| 1 | Zwei werden eins | 1×3 `1 1 2`, Skript: Stufe 1 | Stufe 3 (8) | frei | 100 % / 100 % |
| 2 | Züge zählen | 3×2 `1 1 . / 2 . .` | Stufe 4 (16) | 10 | 95 % / 100 % |
| 3 | Weiter so | 3×3, Start 4 · 2 · 2 | Stufe 4 (16) | 16 | 100 % / 100 % |
| 4 | Punkte sammeln | 3×3, Start 4 · 4 · 2 · 2 | 60 Punkte | 20 | 100 % / 100 % |
| 5 | Der Vierundsechziger | 4×4, Start 16 · 8 · 8 · 4 · 4 · 2 · 2 | Stufe 6 (64) | 35 | 96 % / 100 % |
| 6 | Der Pfeiler | 3×3 `1 . 1 / . P . / . 2 .` | Stufe 4 (16) | 18 | 100 % / 100 % |

Level 1 ist unverlierbar: Hoch und runter verändern auf einem 1×3-Streifen nichts. Der erste Seitwisch verschmilzt die beiden 2er, das Skript füllt die Lücke mit einer 2, der zweite Seitwisch macht die 8. Ein Test durchsucht alle Wische, Spawnzellen und Vorschauen und findet nur Siege nach genau zwei Wischen. Level 5 war mit 30 Zügen geplant; auf 4×4 braucht der Anfänger-Bot 35 (bei 30 gewinnt er nur 82–90 %).

**Einführungslevel späterer Mechaniken, verkleinert** (die Folgelevel 12, 13, 15, 17, 19, 22, 23 und 25 behalten ihr Raster):

| # | Mechanik | vorher | jetzt (festes Brett) | Idee | Züge | Anfänger / stark |
|---|---|---|---|---|---|---|
| 11 | Schrott | 4×4, zufällig | 3×3 `1 1 X1 / . . . / X1 2 2` | Verschmelzen neben dem Schrott knackt ihn: einmal nach rechts, einmal nach links | 12 | 100 % / 100 % |
| 14 | Sporen | 4×4, zufällig | 3×3 `1 1 s / . . . / s 2 2` | Die Sporen liegen am Reihenende, die Verschmelzung landet darauf | 12 | 100 % / 100 % |
| 16 | Amöbe | 4×4, zufällig | 3×3 `. 3 . / . . . / 2 . 2`, Skript: Amöbe in die Mitte | Jeder erste Wisch lässt die Mitte frei; die Amöbe hebt die 16 zur 32 | 16 | 100 % / 100 % |
| 18 | Aufbruch | 4×4, Kappe 5 | 3×3 `3 3 . / . . . / . 2 2`, Kappe 4, zwei Aufbrüche | Der erste Seitwisch lässt das obere Paar aufbrechen, das zweite wird gebaut | 16 | 100 % / 100 % |
| 21 | Verdorrt | 4×4, zufällig | 3×3 `w . 2 / 1 . 2 / 1 . w` | Die verdorrten Zellen liegen am Spaltenende: hoch heilt links, runter heilt rechts | 12 | 100 % / 100 % |
| 24 | Strahl | 5×5, zufällig | 4×4 `1 1 2 2` über zwei doppelten Schrottzellen | Zwei Paare ergeben zwei Verschmelzungen und damit einen Strahl-Blob; er zündet in etwa 9 von 10 Spielen | 24 | 98 % / 100 % |

**REX dazu** (`content/rex/lines.json`): Level 1 „Wisch zur Seite." Nach dem ersten Wisch „Da kommt Nachschub für uns." Nach dem ersten Sieg die Szene `afterLevel1` (Vorschlag, frei änderbar): „Schau, es bleibt bei uns." / „Die Erde ist zerbrochen." / „Jeder Stein heilt ein Stück." / „Da vorne wartet der nächste." Neue Auslöser: `locked` „Noch zu. Erst der davor.", `collection.new` „Neu! Ab in den Setzkasten.", `classic.unlock` „Neues Raster frei!"

## 7. Evolution: das Genom-System

Ziel: 100.000e Varianten aus wenigen handgefertigten Modulen, ohne handgemachte Animation, komplett datengetrieben, im Editor justierbar.

### 7.1 Schichten einer Figur

1. **Körper** = Signed-Distance-Field (SDF): Smooth-Union aus 2–8 Kugeln/Ellipsoiden + Noise-Verformung. Parameter: Größe, Streckung, Lappenanzahl, Viskosität (Wackelmaß), Atemfrequenz. Der Körper ist *immer* in Bewegung (Noise über Zeit + Physik-Impulse).
2. **Material** = Shader-Variante auf demselben SDF: **Jelly** (Screenshot 3: Glanzlicht, innere dunklere Formen als halbtransparente „Organe", Bläschen), **Flüssig** (flacher, spritzt), **Gas** (Volumen-Wirbel, weiche Kante), **Feuer** (Flammen-Partikel + Emission), **Fell** (Shell-/Fin-Rendering, später).
3. **Palette** = Basis-, Innen-, Glanz- und Bläschenfarbe, pro Zone/Stufe abgeleitet.
4. **Assets an Sockeln** auf der Körperoberfläche (Sockel in Kugelkoordinaten + Normalenausrichtung): Auge(n), Zähne, Hörner, Ohren, Rüssel, Flügel, Beine, Schweif, Kamm, Krone, Stacheln … Von Florian als glTF-Module in Blender gebaut (mit Bones), Bewegung aber **prozedural**: Federphysik („Jiggle"), Noise-Idle, IK, Blick-Verfolgung, Reaktions-Verben (blinzeln, flattern, stampfen, schnauben).
5. **Persönlichkeit** = Parameter für Idle-Tempo, Schreckhaftigkeit, Neugier (Augen folgen dem Finger), Quetsch-Härte.

### 7.2 Genom-Regel

`Figur = f(Zone, Stufe, Material, Seed)`. Datenstruktur: `{stufe, körperform, palette, muster, material{glanz, transluzenz}, augen{typ, anzahl}, mund, assets[{sockel, teilId, skalierung, tönung}], bewegung{sprungkraft, blinzelrate}}` aus `hash(seed, stufe, id)` mit festem Zufallsgenerator. Kompatibilitätstabellen verhindern unmögliche Kombinationen.

**Deterministisch**: Dieselbe Stufe sieht in einer Zone gleich aus (Wiedererkennung, Editierbarkeit), zwischen Zonen unterschiedlich (Abwechslung). Der Editor bearbeitet **Regeln und Module**, nicht Einzelfiguren.

### 7.3 Vererbung

Verschmelzung A + B → Kind (Stufe + 1) erbt Assets beider Eltern, bekommt an definierten Stufen ein neues Asset und wechselt an Material-Schwellen das Material (Slime-Rancher-„Largo"-Prinzip: jedes Wesen einzigartig, trotzdem autorisiert).

### 7.4 Render-Strategie (Kurzfassung, Entscheidung in P1)

Zwei Kandidaten werden im Blob-Lab nebeneinander gebaut; Florian wählt gegen Screenshot 3:

- **(a) SDF-Raymarching pro Figur** (TSL, ≤ 32 Schritte, Bounding-Box): Smooth-Min, innere transparente „Organe", Rim, Glanz, Bläschen. Wird zuerst gebaut, weil (b) es ohnehin für den Verschmelz-Blend braucht. Kostenabschätzung: 36 Blobs ≈ 0,3 G SDF-Auswertungen pro Frame — grenzwertig auf iPhone-12-Klasse.
- **(b) Jiggle-Mesh + SDF-Gesicht** (Slime-Rancher-Rezept): gemeinsames Low-Poly-Körpermesh (~400 Vertices) mit prozeduralem, volumenerhaltendem Squash/Stretch, Fresnel-Rim, Wrap-Diffuse als Fake-Subsurface, Glanzlicht, innerer Gradient, Refraktion für transluzente Arten; Gesichter/Augen als SDF-Texturen (≈ 64×64, in jeder Größe scharf); Extras als eigene Meshes.

Unabhängig vom Kandidaten: **Echtes SDF-Raymarching für den Verschmelzmoment** (~300 ms). Rig wird **im Code** erzeugt (Root, Kern, Oben, Unten, radiale Bones); Nachschwingen über VRM-Spring-Bones, IK per CCDIK. **Eine** SDF-Definition läuft identisch auf CPU (TS) und GPU (TSL), damit Sockel und Bild übereinstimmen. **Figuren haben keine Kontur** (Screenshot 3 hat keine): Kanten aus Rim, Glanz und Wertkontrast; feine Linien nur als Muster auf der Haut (Adern, Schraffur, Punktreihen) je nach Material.

### 7.5 Verschmelzanimation (generiert, nicht gekeyframt)

SDF-Smooth-Min-Interpolation über Zeit mit Viskositätskurve → Tropfen-Partikel (selbst kleine SDF-Kugeln, fallen zurück in den Körper) → Assets lösen sich mit Federn und docken neu an → Material-Effekt (Gas: Wirbel; Feuer: Aufflammen; Flüssig: Spritzer) → „Pop" der neuen Stufe mit Squash/Stretch. Timeline: 0–300 ms Blend (Kugelliste A ∪ B, B-Zentren wandern zu A, 4–8 Tropfenkugeln), 300–450 ms Morph zum Kind-Genom mit Squash-Pop. Intensität skaliert mit Stufe: Ein 4096er darf über das Raster hinauswachsen, Kamera-Shake, Partikelregen.

### 7.6 Physik auf dem Raster

Figuren sind weiche Körper: Rutsch-Impuls beim Wischen, Anrempeln am Rasterende (Quetschung per Material verschieden: Jelly wabbelt, Gas verformt sich weich, Flüssig spritzt, Feuer flackert auf). Wand/Pfeiler-Stopp = doppelter Gegenimpuls. Standard ist ein TypeScript-`SquashDriver` (Federn bzw. Shape Matching); Rapier-Softbodies nur als P1-Experiment hinter derselben Schnittstelle.

## 8. Map: rotierbare Kugel, ohne Wiederholung

### 8.1 Zwei Ansichten, ein Modell

Vorbild: der Globus in Super Mario Odyssey. Die **Kugel** dient Überblick, Zonenwahl und dem Rollen mit dem Finger; große Casual-Puzzler nutzen vertikal scrollende Maps — der Globus ist ein Unterscheidungsmerkmal. Beim Hineinzoomen wechselt die Ansicht in eine **gekrümmte Ebene** (Animal-Crossing-„Rolling Log", Krümmung nur in der Projektion) für den regionalen Level-Pfad, auf dem Knoten und Figuren groß und tippbar sind. Die **Rückseite der Kugel** wird als großer Moment enthüllt.

### 8.2 Geometrie und Determinismus

- Cube-Sphere mit Quadtree-Chunks; sichtbare Chunks nach Kamera geladen; kleiner Planetenradius + weiter FOV (70–80°) + Vertex-Shader-„Krümmungsverstärkung" → deutlich sichtbare Wölbung.
- Nahtlose Biome über 3D-Simplex-Noise auf der Kugel; gleichmäßige Punkte per Fibonacci-Gitter.
- `seed = hash(zoneId, chunkX, chunkY)`; Höhenfeld aus glattem Low-Frequency-Noise („gemeißelte Hügel", keine Grate); die Zone bestimmt Palette, Vegetationsfamilie, Müll-Dichte.
- Jenseits der autorisierten Zonen vergibt der Generator neue Zonen prozedural → in alle Richtungen Neues, nie Wiederholung, trotzdem „autorisierter" Look durch Set-Pieces.

### 8.3 Set-Pieces und Pfad

Blender-Module von Florian (Monolith, toter Baum, Ruine, Schrotthaufen, Rohrgeflecht) per Poisson-Disk + Regeln gestreut; prozedurale Punktbäume füllen den Rest. Level-Pfad als Großkreis-Spirale über die Kugel (Pol zu Pol), Knoten in festen Bogenlängen, Zonengrenzen als sichtbare Risse.

### 8.4 Kamera

Orbit mit Trägheit (der Finger „rollt" die Kugel, τ ≈ 0,4 s), Pinch-Zoom. Tipp auf Knoten → Dolly + FOV-Fahrt, die Rasterplatte „klappt" aus dem Boden (brutalistische Platte). Tipp auf Figur → Fahrt zur Figur, Detailkarte mit Animation.

### 8.5 Lebendige Map

Wachstumsparameter 0–1 pro Chunk aus dem Level-Fortschritt → Pflanzendichte, Skalierung, Sättigung, Partikeldichte. Earle-Muster „atmen" per Zeit-Uniform. Gerettete Tiere als Silhouetten. Alles permanent animiert: Muster, Punkte-Pflanzen, Partikel.

### 8.6 Übergänge

Splash-„i" (DOM/SVG) → Blob hüpft (derselbe SDF-Renderer) → Kamera zieht von seinem Knoten zurück → Map. **Kein Ladebildschirm**; alle Übergänge sind eine kontinuierliche Kamerafahrt (Abnahme P5: „ein Take ohne Schnitt").

## 9. REX-Kadenz

Aus der Analyse von Candy Crush, Best Fiends und Royal Match:

| Anlass | Form |
|---|---|
| Neue Mechanik | Mikro-Satz, höchstens **8 Wörter**; REX zeigt statt zu erklären |
| Alle 5–10 Level | kurze Szene |
| Zonenanfänge (1, 26, 51, 76) und Zonenmitten (13, 38, 63, 88) | Kapitel-Szene |
| Zonenfinale (25, 50, 75, 100) | großer emotionaler Beat: Riss schließt sich, Tiere kehren zurück |
| Combos, Fehlversuche | Kommentar, Jubel, komische Verzweiflung |

Alle Sprüche liegen in `content/rex/lines.json` (pro Anlass), zweisprachig ab Phase 3 (DE/EN). Szenen stehen dort als `scenes.<id>`: Sätze, die REX nacheinander sagt, jeder höchstens 8 Wörter (zuerst `afterLevel1`, Abschnitt 6.6).

## 10. UI und HUD

### 10.1 Liquid Glass und Fallbacks

- **iOS 26+**: natives **SwiftUI-Overlay** über dem Spiel per eigenem Capacitor-Plugin (`glassEffect`, `GlassEffectContainer`; Touch-Durchleitung auf transparenten Flächen; Zustand als JSON-Nachrichten). Trägt HUD-Pille (Score/Züge), Pause, Booster-Leiste, Sheets. Das Spielbrett bleibt die „Content-Ebene". Apple-Leitlinie: Glas nur für die Navigationsebene, kein Glas auf Glas; Reduce Transparency/Motion werden automatisch berücksichtigt.
- **Android / Web**: Glas **im Spiel-Canvas als TSL-Effekt** (Rundrechteck-Normale, Snell-Brechung, Farbsplit, Randlicht) und `backdrop-filter` für HTML-Menüs (SVG-Refraktion nur in Chromium; Safari/Firefox fallen auf Blur zurück).
- Getönt nach Zonenpalette — „gefärbtes Glas über Earle-Bändern".
- Im Godot-Track: natives iOS-Plugin-Overlay oder Shader-Nachbildung (siehe ADR).

### 10.2 Neo-brutalistische Tokens (Earle-Variante)

Bereits als CSS-Tokens im Scaffold (`apps/game/src/styles/tokens.css`): `--ink #0f1c22`, `--ink-soft #242c0b`, `--paper #f7f6d8`, Zonenfarben (`--sky-1/-2`, `--neon`, `--teal`, `--khaki`, `--khaki-deep`, `--rust`, `--pink`, `--violet`, `--cyan`), `--sun-shadow: 8px 3px 0`, `--radius: 0`.

Regeln:
- **Kein Tintenrand** (Konturen-Regel). Versatzschatten `8px 3px 0 var(--ink)` **in Sonnenrichtung** — UI-Schatten echoen die Weltschatten.
- Juwelenton-Füllungen, nur **gestufte Serigrafie-Verläufe**, klobige Grotesk-Überschriften, filigrane Musterlinien als Trenner und Hintergrund, höchstens **ein** gotischer Akzent.
- Die fette Verlaufskontur nur an den wenigen Hero-Elementen (Level-Platte, REX-Emblem, Hauptaktion, Zonen-Portal).
- Große Bedienelemente, Bottom-Sheets, Undo; touch-first.

### 10.3 Text- und Tutorialregeln

≤ 8 Wörter auf dem Bildschirm. Der Spieler tut es, statt zu lesen. Levelziel wird auf der Map vor dem Level gezeigt (Best-Fiends-Praxis). Harte Level sind markiert. Zahlen-Badges optional (Einstellung).

## 11. Tierschutz-Modell (App-Store-sicher)

**Regeln, an die wir uns halten müssen.** Apple 3.2.2(iv) verbietet das Sammeln von Spenden in der App (Ausnahme: zugelassene Non-Profits per Apple Pay, 3.2.1(vi)); Google Play verbietet Spenden über Play Billing. Metadaten und Versprechen müssen zutreffen (2.3).

**Deshalb das Terra-Nil/Alba-Modell: Das Studio spendet aus eigenen Einnahmen.**
- Kein Kauf wird als Spende verkauft, kein Spenden-Button in der App. Hinweistext: „Käufe sind keine Spenden und nicht steuerlich absetzbar."
- Versprechen prüfbar formulieren: **„ein Drittel unserer Nettoeinnahmen** (nach Store-Gebühren, Steuern, Erstattungen)" — Umsatz ist leichter zu prüfen als Gewinn. Kosten sauber durchrechnen: **Ein gegebenes Versprechen wird nie gekürzt** (Humble-Bundle-Lektion 2021).
- Quartalsweise Transparenzberichte mit Belegen (wie Tab for a Cause); Partnerverträge in den App-Review-Notizen.

**Im Spiel, ohne Bezahlung:**
- **Fürsorge-Punkte** durch Spielen; Spieler stimmen ab, wie der Quartalstopf auf Partner verteilt wird (das Studio zahlt, die Spieler lenken).
- Studio-weite Spenden-Meilensteine schalten **kostenlose Kosmetik für alle** frei.
- **Feldtagebuch** mit echten Tiergeschichten (mit Einverständnis der Organisation, wie Avias „Play for Paws").
- Kugel-Overlay zeigt geförderte Projekte als **Schutzgebiete**; gerettete Tiere als Earle-Silhouetten.

**Später, optional:** Link zur Partner-Website (nur erlaubt, wenn die App kostenlos ist); Apple-Pay-Spenden nur mit zugelassenen Non-Profits. Community: Playing for the Planet, Green Game Jam.

**Rechtlich:** Cause-Related Marketing ist in Deutschland zulässig (BGH 2005), darf aber nicht irreführen — Rechts- und Steuerprüfung vor Release. **Offen:** Partnerwahl (Kandidaten: Humane World for Animals, Empfehlungen von Animal Charity Evaluators; Deutscher Tierschutzbund und Vier Pfoten *(unverifiziert)*), exakte Prozentbasis.

## 12. Erlösmodell — bewusst offen

Florians Entscheidung (2026-09-29): Drei Wege bleiben bis nach dem Vertical Slice möglich. **Keiner ist entschieden.**

| Option | Kurzbeschreibung | Was dafür spricht | Was zu prüfen ist |
|---|---|---|---|
| **(1) Gratis + einmaliger Vollversions-Kauf** | Zone 1 frei (Grenze konfigurierbar), danach ein Kauf | einfach, vertrauensbildend, passt zum Spenden-Versprechen | Konversion bei Casual-Publikum; ob Kosmetik-/Kapitelpakete dazukommen (Empfehlung der Recherche) |
| **(2) Faires Free-to-Play** | Booster/Kosmetik als IAP, optional Rewarded Ads; Royal-Match-Ethik (keine erzwungene Werbung, Großzügigkeit zuerst, kein früher Kaufdruck) | größte Reichweite; Benchmarks: Zahlerquote ≥ 1,7 %, Top 3,5–4 % | Regulierung (Royal Match: Sammelklage 2024), keine Lootboxen, keine Energie |
| **(3) Apple Arcade** | keine IAP, keine Werbung; Vorabfinanzierung + Engagement-Topf | Finanzierung, Prestige, passt zu „keine Leben" | verlangt Mobil-Exklusivität → Web-/Android-Version klären; Auszahlungen seit 2020 gesunken; Spiele ohne Wachstum werden entfernt; Vertragsbedingungen vor Entscheidung prüfen |

**Design-Leitplanken, damit alle drei offen bleiben:**
- **Keine Leben, keine Energie, keine Werbung im Kernloop** (passt zu allen dreien).
- Booster-Ökonomie nur „erspielbar"; Kaufwege hinter einem **`Storefront`-Adapter mit Feature-Flag** (Einmalkauf, IAP oder „alles frei" für Arcade).
- Die Grenze „Zone 1 frei" ist **konfigurierbar**.
- **Game Center und natives Chrome von Anfang an** (Arcade und App Review 4.2 verlangen beides).
- Das Drittel-Versprechen wird **für jedes Modell formuliert** (bei Arcade auf Basis der Apple-Auszahlungen).

Entscheidung mit Daten aus dem Vertical Slice in Phase 1/2, festgeschrieben in Phase 3.

## 13. Editoren (touch-first, gleiche App)

Eine Web-App, Routen: `/play`, `/lab/*` (Prototypen), `/editor/levels`, `/editor/creatures`, `/editor/map`. Gleiche Renderer wie das Spiel (WYSIWYG), große Bedienelemente, Bottom-Sheets, Undo. Inhalte werden als JSON gespeichert: im Dev-Modus über einen Vite-Endpunkt (`/__content/…`, zod-validiert, atomar) direkt ins Repo; im Produktions-Build Download/Share-Sheet plus lokale Entwürfe; später Firebase.

- **Creature-Editor**: Genom-Regeln, Sockelpositionen, Asset-Zuordnung pro Stufe/Zone, Material-Parameter, Persönlichkeit; Live-Vorschau aller Animationen (Idle, Quetschen, Verschmelzen, Reaktionen) mit Reglern.
- **Level-Editor**: Rastermaske malen, Elemente setzen, Ziele/Züge/Spawn-Tabellen; **Auto-Solver** (drei Bot-Stufen) prüft Lösbarkeit und schätzt Versuche-Bänder — ersetzt zusammen mit Nicoles Kalibrierdaten ein großes Testteam.
- **Map-Editor**: Zonen, Paletten, Set-Piece-Regeln, Pfadverlauf, Wachstumsvorschau.

Content-Layout (siehe `content/README.md`): `zones/*.json`, `levels/NNN.json`, `genome/rules.json`, `genome/assets/*.glb`, `rex/lines.json`; alle mit `schemaVersion`.

## 14. Telemetrie und Benchmarks

Ab Phase 2 (PostHog für Events, Feature Flags und Schwierigkeits-Experimente; Sentry für Crashes; Firebase für Save-Sync „Fortschritt nur vorwärts" und Remote Config).

**Was wir messen:** Versuche pro Level (Median), Abbruchrate pro Level, Zeit bis Sieg / bis Abbruch (Spaß getrennt von Schwierigkeit), Spezialteil-Häufigkeit, Booster-Nutzung, Sitzungslänge, Retention, Fit der Bot-Abbildung an Nicoles Daten.

**Benchmarks (GameAnalytics 2025/2026, Match-3-Praxis):**

| Kennzahl | Puzzle-Median | Top-Segment |
|---|---|---|
| D1 | ≈ 20 % | ≈ 40 % (Top 10 %) |
| D7 | ≈ 4,5 % | 11–12 % (Top 10 %); Match-3 „gut" > 20 % |
| D28 | ≈ 1,2 % | ≈ 3 % (Top 25 % genreübergreifend) |
| Sitzung | ≈ 5,6 min | |
| Zahlerquote (nur bei F2P relevant) | ≥ 1,7 % | 3,5–4 % (Candy Crush: 2,3 %) |
| Abbruch pro Level | < 2 % (Playrix-Schwelle) | |

## 15. Offene Fragen und Zu-verfeinern-Liste

**Offen (Entscheidung steht aus):**
- **Erlösmodell** — Abschnitt 12; Entscheidung nach Vertical Slice.
- **Engine/Stack** — Vergleich three.js + Capacitor vs. Godot 4.7, Gate nach P1/P2/P6 ([`ADR/0001-engine.md`](ADR/0001-engine.md)).
- **Blob-Render-Kandidat (a)/(b)** — Florian wählt in P1.
- **Name** — „early earle" nutzt den Namen eines geschützten Künstlers (Eyvind Earle Publishing hält Marke und Rechte); als Produktionstitel in Ordnung, vor Release prüfen.
- **Tierschutz** — Rechts-/Steuerprüfung, Partnerwahl, exakte Prozentbasis.

**Zu verfeinern (mit Prototyp-/Testdaten):**
- Score-Formel und Boni (P3).
- Spezialteil-Schwellen pro Level (Solver-Report).
- Freischaltlevel für +5 Züge, Mischen, REX-Meter.
- Mid-Zone-Spikes vs. H-Marker; Härte der Zonenfinale (25/50/75).
- Bot→Versuche-Abbildung (Fit an Nicoles Daten); bis dahin Bänder.
- Paletten (k-Means-Start, in OKLab verfeinern), Bandanzahl, Schattenform (P2-Feedback).
- Zone 5+ (Ozean, Eis, Stadtruine …) nach Level 100.
- Fell-Material (kosmetisch, später).

### Nachtrag 2026-09-29 (Abend) — Fragen aus der Kern-Implementierung an Florian/Nicole

Der Spielkern (`packages/core`) hat beim Bauen und Kalibrieren der Level 1–25 folgende Regel-Lücken sichtbar gemacht; die Umsetzung hat jeweils eine vorläufige Entscheidung getroffen (kursiv), die Design-Entscheidung steht aus:

1. **Rettung braucht eine Ausgangszelle?** *Vorläufig: Käfig geöffnet = gerettet.* Alternative: Boden-Art `exit`, zu der das befreite Wesen geführt werden muss (mehr Puzzle, mehr Züge).
2. **Stufenbombe — welche Stufe wird entfernt?** *Vorläufig: die häufigste Stufe auf dem Brett (bei Gleichstand die niedrigste).*
3. **Strahl-Achse** — beim Entstehen festgelegt (Wischachse) oder beim Auslösen? *Vorläufig: beim Entstehen (Plan §16).*
4. **Liefern** entfernt das gelieferte Wesen vom Brett. *Vorläufig ja* (wie Aufbruch).
5. **Strahl-Blobs schaden Stufen-Zielen**: Ein Strahl räumt die ganze Reihe und vernichtet Masse; bei "Stufe N erreichen" bricht die Gewinnrate ein (100 % → 63 % beim starken Bot). Level 24 führt den Strahl deshalb mit einem Schrott-Ziel ein. Vorschlag zur Entscheidung: Strahl entfernt nur Wesen *unter* der Stufe des auslösenden Blobs (schont Gleiche und Höhere) — dann bleibt er auch bei Stufen-Zielen ein Werkzeug.
6. **Zwei gleichzeitige Aufbrüche** lösen bereits in Level 19 eine Stufenbombe aus (formal erst ab Level 54 eingeführt). Seltener Fall; entweder in Tjorizo deaktivieren oder als Überraschungsmoment stehen lassen.
7. **Punkteziele** (150/260) sind bot-abgeleitet und werden mit Nicoles Versuchen neu gefittet; Level 8 liegt am Bandrand (Anfänger-Bot 91 %).
8. **Level 1 ohne Zuglimit** (`moves: 99` als "frei"); die UI blendet den Zähler aus — bestätigen.

### Nachtrag 2026-09-29 (Abend, II) — Erkenntnisse aus der Kalibrierung von Syrup (Level 26–50)

Alle 50 Level liegen im Zielband (`content/levels/_calibration.json`). Beobachtungen, die Design-Entscheidungen brauchen:

9. **Käfige sind eine Klippe**: Einlagige Käfige am Rand öffnen sich nach 1–4 Zügen von selbst, zweilagige im Inneren senken den Anfänger-Bot auf 2–30 %. Ein echter Regler wäre die Ausgangszelle (Frage 1) oder Lagen pro Käfig.
10. **Heilen in der Mitte ohne Pfeiler** ist brutal (15 % beim Anfänger-Bot) — "Mitte schwer" aus dem GDD bestätigt; Intro-Level heilen am Rand plus eine tiefe Zelle.
11. **Gasquellen in der Mitte füttern Blocker** (Spawns direkt neben Schrott/Käfig machen sie trivial); Quellen an den Seiten mit Innen-Blockern funktionieren.
12. `reachTier 6` braucht bei 28–30 Zügen ~50 Startmasse für ein Komfort-Band.
13. **Flüssig** ist nur gegen Jelly sichtbar; Level 27/28/29/37 tragen deshalb Jelly-Startblobs. Konflikt: Öl ist im Plan erst bei 64 (Luzz) vorgesehen, Syrup führt es mit Flüssig bei 27 ein — Entscheidung nötig (Vorschlag: Öl bleibt in Syrup, Luzz bekommt dafür Gasstrom früher).
14. Knall-Blobs zünden bei `burstAt 3` auf 2–7 % der Wische; Intro-Level 34 sollte `burstAt 2` bekommen (wie beim Strahl). In den Feier-Leveln 40/50 entsteht der Knall im Siegeswisch und zündet nie (reines Spektakel).
15. Mehrere Normal-Level nutzen zufällige Platzierung (`any`); der Seed entscheidet viel — im Level-Editor sichten.

### Nachtrag 2026-09-29 (Abend, III) — Kalibrierung Luzz (51–75) und Wooding (76–100)

Alle 100 Level liegen im Zielband (`content/levels/_calibration.json`, Solver `strong`/`novice`). Neue Regeln, die für die Elementliste nötig waren: Feuer-Verschmelzung auf Öl → Öl brennt und löst eine Knall-Sprengung aus; Sprengungen verbrennen Fäulnis (sonst hätte Luzz keine Waffe gegen Fäulnis); Zieltypen `clearRot` ("Fäulnis eindämmen") und `calmStrays` ("Streuner beruhigen").

16. **Fäulnis** ist für den Anfänger-Bot brutal, wenn sie nur durch Sprengungen verschwindet (Menschen zielen, Bots nicht): Level 61 führt sie als Störung ein (Stufenziel), 62 bekämpft sie (`clearRot`, `burstAt 2`, Fäulnis am Rand). Hinweis: `burstAt ≤ lineAt` bedeutet, dass nie Strahlen entstehen (Knall gewinnt bei Gleichstand).
17. **Feuer trivialisiert Fäulnis** (ein Fäulnisfeld war in 3 Zügen weg); zwei Felder plus Öl-Bomben machen daraus ein Level.
18. **Streuner beruhigen sich zu leicht**: "eingekesselt = kein freier Nachbar" ist in jeder Ecke sofort erreicht. Vorschlag: beruhigt nur, wenn kein freier Nachbar *und* im letzten Zug keine Bewegung möglich war. Streuner-Level tragen vorerst ein zweites Ziel.
19. **Lieferungen kosten Masse**: 3× Stufe 5 in 28 Zügen → 8 % Gewinnrate; 2× ist die richtige Bestellgröße.
20. Gas schwebt über Fossilwände, daher binden Wände in Luzz nur Jelly-Startblobs (Kontrastprinzip wie bei Flüssig).
21. **Finale (100)**: 8 Heilungen + Stufe 7 war unschaffbar (19 % beim starken Bot); jetzt 5 Randheilungen, 6×6 mit Pfeilerblock, 30 Züge → 53 % Anfänger, 98 % stark. Entscheidung: 30 Züge statt "kurz" — als Set-Piece vertretbar?
22. Kombos (Kreuz, Dreifachkreuz, 5×5) treten bei `lineAt 2 / burstAt 3` auf ~2 % der Wische auf — als seltenes Spektakel akzeptieren oder ein kombofreundliches Level bauen?

## 16. Iteration 4: Einstieg, Modi, Sammlung, Klassik (Nachtrag 2026-09-30)

Florians neun Punkte vom 30.09. nachmittags, umgesetzt in den Baustellen B1–B7 (Plan: `~/.claude/plans/ich-habe-noch-einige-distributed-summit.md`).

- **Loader und Splash** (§8.6 erweitert): Der kursive i-Stamm ist der Ladebalken (echter, gewichteter Fortschritt, Prozent in Caprasimo). Bei 100 % kreuzt der Schatten einer Möwe das Bild, der erste Blob fällt als „Möwen-Haufen“ auf das i (Flatsch), Kontur, Flamme, ® und Sterne bauen sich neo-brutal mit ihren Schatten auf, dann „Tippen“. Beim Tippen zeichnet sich das i aus und der 3D-Held übernimmt am i-Punkt. Logo aus Florians AI-Datei (`ref/loader and splash.ai`), iOS-Startbild = erstes Loader-Bild.
- **Erster Start:** Im echten Modus springt der Blob nach „Tippen“ direkt in Level 1 (1×3-Brett, §6.6), ein Wisch-Pfeil zeigt die Richtung. Nach dem ersten Sieg landet er auf dem geschafften Knoten, hüpft Punkt für Punkt den Pfad entlang zum nächsten (die Freischaltung erscheint beim Ankommen), und REX erzählt die Lage in vier Zeilen (`content/rex/lines.json`, `scenes.afterLevel1`).
- **Aufbruch (§3.4 umgesetzt):** Der Held bleibt der Blob und trägt keine Teile mehr. Die im Level neu erspielten Wesen verlassen das Plateau und wohnen danach neben dem Knoten, an dem sie gefunden wurden (höchstens 7 mobil / 14 hoch leben gleichzeitig am Blickpunkt).
- **Echter und freier Modus:** Echt = wie im fertigen Spiel: nur freigespielte Level sind startbar (gesperrte Steine wackeln, REX: „Noch zu. Erst der davor.“), gescrollt wird nur um den freigespielten Pfad plus ein Stück Vorschau (Gummiband). Frei = Entwicklung: jede Stelle, jedes Level. Getrennte Stände (`ee.progress.v2`), Umschalten in der Werkstatt; Store-Builds sind immer echt.
- **Sammlung und Setzkasten:** Ein Wesen ist „erspielt“, wenn sein Aussehen (Zone, Stufe, Art) im Level zum ersten Mal entsteht (Verschmelzung oder Spawn, keine Startblobs, nicht in Klassik) — „NEU!“-Stempel auf dem Brett. Der Katalog kennt heute 253 mögliche Wesen (Tjorizo 60, Syrup 66, Luzz 61, Wooding 66). Der Setzkasten zeigt je Zone Fächer (Stufe × Art): gefundene Wesen lebendig, fehlende als Tintensilhouette, nicht erreichte Zonen mit Deckel.
- **Klassik-2048:** endloses 2048 am aktuellen Knoten des Helden, ohne Zugbegrenzung und Spezialteile, Ende bei „Kein Zug mehr“. Formate schalten sich mit dem Levelfortschritt frei (4×4 ab L5, 3×3 ab L10, 5×5 ab L15, 6×6 ab L25, Kreuz ab L40, Ring ab L50, Riss ab L60). Je Stufe erscheint das Wesen aus der höchsten Zone, in der die Stufe gesammelt wurde (sonst das Tjorizo-Grundwesen); Klassik zählt nicht für die Sammlung. Bestwerte je Format.
- **Die Möwe im Spiel:** Etwa alle 3–5 Züge bringt eine Möwe den neuen kleinsten oder zweitkleinsten Blob: nur ihr Schatten gleitet übers Brett, sie ruft, der Blob fällt mit Flatsch genau in seine Zelle (in Level 1 schon beim ersten Zug). Rein darstellend (keine Regeländerung), deterministisch je Level und Seed.
- **Ton:** Der Lautlos-Schalter schaltet das Spiel stumm (Apple-Standard, Florian 30.09.). Alle neuen Klänge sind prozedural (Möwenruf als Formantstimme).
