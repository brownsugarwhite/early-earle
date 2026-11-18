# Werkzeuge und Bedienung, über den Tellerrand — Gegenprüfung `kurven.html` (10.11.2026)

**Auftrag.** Unabhängige Gegenprüfung des Prüffensters „Kurven als Wahrheit“, Teil „Werkzeuge und Bedienung“. Florians Befund:
Entweder justiert die Haut nach dem Loslassen nach, oder es ist ungenau und stockt. Seine Fragen: Geht es eleganter? Gibt es Fehler?
Haben wir etwas übersehen? Welche Werkzeuge machen den Editor schneller und genauer?

**Vorgehen.** Gelesen: Bilanz vom 09.11. (ganz), Klarstellungen vom 22.10./05.11. (ganz), Planseite „Kurven als Wahrheit“
(Abschnitte 1–7, 11–18), Recherche FiberMesh/Monster Mash (ganz), Werkzeugtabelle der Gegenprüfung vom 02.11., im Fenster
`apps/editor/src/form/kurven.ts` die Tasten-, Zeiger-, Anzeige- und Loslass-Wege, `apps/editor/kurven.html`, eine Probe
(`form-greifen-probe.mjs`). Das FiberMesh-Paper habe ich im Original gelesen (Abschnitt „User Interface“). Dazu rund 30 Web-Recherchen.

**Was die drei Wörter hier heißen.**
- **gelesen** = im Code, in den Dokumenten des Repos oder in einer abgerufenen Quelle nachgesehen (mit Datei:Zeile bzw. URL).
- **gemessen** = von mir gemessen. Ich habe in dieser Aufgabe **nichts gemessen** (kein Browser, kein Messskript war Teil des Auftrags).
  Zahlen aus der Planseite sind als „gelesen (Messung der Planseite)“ gekennzeichnet.
- **vermutet** = meine Folgerung, nicht geprüft.

Am Arbeitsbaum wurde nichts geändert.

---

## Kurzfassung

1. **Die Bedienung selbst ist sauber, aber schmal.** Stift, Punkte, Griffe, G/S/R und O sind stimmig gebaut. Es fehlen fast alle
   Präzisionshilfen, die Illustrator und Blender ausmachen: Zahlen, Feinmodus, Einrasten, Pfeiltasten, Wiederholen, Bearbeiten in der
   3D-Ansicht, verdeckte Linien blass.
2. **Beide Beschwerden hängen an derselben Art von Zug:** weit aus der Kugel herausziehen, live, auf einem dichten Netz. Kein Vorbild macht
   das so. FiberMesh rechnet live nur 600–2000 Punkte und vernetzt erst nach der Operation neu. Teddy, FiberMesh, ZBrush und Spore machen
   große Formänderungen als **eigene Operation** (Auswuchs, Kugelkette, Teil), kleine live.
   Der größte Hebel der Bedienung ist deshalb: **weite Züge überflüssig machen** (Auswuchs als Operation, Startform mit fertigen Loops).
3. **Drei Dinge im Fenster verfälschen das Gefühl oder die Messung** (gelesen):
   - „ms je Mausbewegung“ misst nur den Löser-Schritt, nicht Normalen, Bänder, drei SVG-Blätter und das Rendern.
   - Nach dem Loslassen zeigt das Fenster bis zu fünf Stände nacheinander. Das „Aufblähen in Stufen“ ist zum Teil eine Anzeige-Entscheidung.
   - Das Ziel „16 ms“ gilt für 60 Hz. Florians Bildschirm hat laut Projektgedächtnis 120 Hz (8,3 ms je Bild).
4. **Übersehen:** Es gibt kein Speichern. Sobald man speichert, muss man entscheiden, ob die Kurven allein die Form sind. Heute sind sie es
   nicht (die Haut trägt Netz-Geschichte und ein Gedächtnis an den Linien). Der einfachste ehrliche Test für „Kurven sind die Wahrheit“ fehlt:
   **nur die Kurven behalten, Haut neu aufbauen, vergleichen.**
5. **Wölbung ohne Regler:** FiberMesh löst „dicker/dünner“ mit einer zusätzlichen Linie, nicht mit einer Zahl. Das passt genau zu
   Florians Regel und nimmt dem Löser zugleich die Mehrdeutigkeit, die auf der Planseite dreimal als Ursache gemessen wurde.
6. **Nicht bauen:** Pinsel in der Grundform, Felder aus Abstandsfunktionen als Körper, Regler für Härte oder Wölbung, eine weitere
   Verdichtungsregel, eine kosmetische Überblendung des Nachjustierens als „Lösung“.

---

## 1. Was das Fenster heute kann (gelesen)

| Bereich | Vorhanden | Beleg |
| --- | --- | --- |
| Linien anlegen | L Loop schneiden, F Form frei zeichnen, P Stift wie Illustrator (Klick = Ecke, Ziehen = glatt, ⏎ schließt, ⌫ letzter Punkt) | `kurven.ts:3048–3062`, `3069–3078`, `2733–2845`; `kurven.html:16–21` |
| Punkte und Griffe | Punkt ziehen, Griff ziehen, Doppelklick auf Linie = neuer Punkt, Doppelklick oder ⌥-Klick = Ecke/glatt, ⌫ löschen, ⇧ Mehrfachauswahl | `kurven.ts:2891–2925`, `3099–3100` |
| Blender-Teil | G/S/R mit X/Y/Z, Klick oder ⏎ fertig, Esc zurück; O mit Radius `[ ]` | `kurven.ts:3037–3046`, `3067–3090` |
| Kante | K an/aus | `kurven.ts:3101–3102`, `2418` |
| Rückgängig | ⌘Z | `kurven.ts:3063–3066` |
| Pose | Knopf „Fressen“, zwei Regler Maul und Kopf | `kurven.html:41–47` |
| Ansicht | Zoom, Verschieben, Pos1 je Blatt | `kurven.ts:2991–3004`, `3082–3087` |
| 3D | Bänder sichtbar kräftig, verdeckt blass | `kurven.ts:481–529` |

| Fehlt | Beleg |
| --- | --- |
| Zahlen im Zug, Feinmodus (⇧), Einrasten (⌃), Pfeiltasten | Im Zug werden nur Esc, ⏎, X, Y, Z gelesen: `kurven.ts:3037–3046`; `shiftKey` kommt nur bei der Auswahl vor: `kurven.ts:2922` |
| Wiederholen (⇧⌘Z) | Nur `zurueck.pop()`: `kurven.ts:3063–3066` |
| Auswahlrechteck | Klick ins Leere leert die Auswahl: `kurven.ts:2893–2898` |
| Bearbeiten in der 3D-Ansicht | Zeiger-Wege nur für Seite, Front, Top: `kurven.ts:2984–2990`; 3D hat nur die Kamerasteuerung: `kurven.ts:643` |
| Hinten und Unten | Drei feste Abbildungen: `kurven.ts:678–681` |
| Drehen spiegelgleicher Loops außerhalb der Seite | Meldung statt Drehung: `kurven.ts:1859–1863` |
| Verdeckte Linien blass oder gestrichelt in den Blättern | Alle Linien gleich gezeichnet, nur die Spiegelhälfte leiser: `kurven.ts:1326–1339`, `form.css:85–86`, `428` |
| Durchklicken bei übereinanderliegenden Punkten | Der Kommentar nennt das Problem selbst: `kurven.ts:15`, `2903` |
| Wahl des Drehpunkts | Immer die Mitte der Auswahl: `kurven.ts:1929`, `1555–1562` |
| O entlang der Haut | Abstand im Raum: `kurven.ts:393`, `1873–1877`; Abfall „glatt“: `packages/shape/src/dicht/kurven.ts:792–796` |
| Linienpflege (vereinfachen, glätten, Kreis, eben) | Vereinfacht wird nur einmal beim Zeichnen mit F: `kurven.ts:2575–2576` |
| Prüfansichten (Zebra, Krümmung, Dehnung) | Keine Fundstelle in `kurven.ts` |
| Spielnetz-Umschalter | `backen.ts` wird nur von `apps/editor/src/form/main.ts` benutzt, nicht von `kurven.ts` (Importliste `kurven.ts:29–99`) |
| Speichern und Laden | Keine Fundstelle in `kurven.ts` und in `packages/shape/src/dicht/` |
| Warnung, wenn ein Griff die Linie umkehrt | Neun Meldungen, keine dazu: `kurven.ts:807, 846, 1860, 2375, 2379, 2404, 2591, 2691, 2797` |

**Sauber gelöst (gelesen):**
- Der Stift verhält sich wie in Illustrator, Griffe sind gespeichert, ein Punkt ändert nur seine zwei Stücke (`kurven.ts:1596–1600`, `2012–2034`).
- G/S/R nimmt die Griffe mit, wie Illustrator es tut (`kurven.ts:2019–2030`).
- Der Bereich wächst mit dem Zug („Abziehen“ aus FiberMesh, `kurven.ts:2100–2107`). Er gilt aber nur noch in der Pose und mit
  `?haut=gedaechtnis` (`kurven.ts:2088`), nicht im Standard.
- Die Hilfetexte in den Blättern nennen alle Tasten (`kurven.html:16–21`).

---

## 2. Befunde, die „justiert nach“ und „stockt“ direkt betreffen

### B1. Die Zeit „je Mausbewegung“ misst nur den Löser (gelesen)

- Gemessen wird nur um `z.loeser.schritt(...)`: `kurven.ts:2074–2081`.
- Danach laufen bei jeder Mausbewegung ungemessen:
  - `hautZeigen()` mit neuen Normalen über die ganze Haut (`kurven.ts:1036`, `1042–1078`),
  - `baenderZeigen()`, das vier Geometrien aus JavaScript-Listen neu baut und acht alte wegwirft (`kurven.ts:1191–1198`, `1085–1120`),
  - dreimal `blattZeichnen()`, das jedes SVG leert und alle Elemente neu anlegt (`kurven.ts:1323`), bei Kanten ein `<line>` je Probe
    (`kurven.ts:1341–1356`),
  - `statusZeigen()` und das Rendern von vier Ansichten im nächsten Bild (`kurven.ts:3108–3152`).
- Die Proben lesen genau diese Liste aus (`form-greifen-probe.mjs:55–59`, Haken `kurven.ts:3336–3337`). Die Zahlen der Planseite
  („14–16 ms je Mausbewegung bei 5 200 Punkten“, Abschnitt 6) sind also Löser-Zeiten.
- **Folge (vermutet):** Die wirkliche Zeit je Bild im Zug ist höher als berichtet. Wie viel, weiß niemand. Das Kriterium „≤ 16 ms“ wurde gegen
  eine Zahl geprüft, die einen Teil der Arbeit nicht enthält.
- **Vorschlag:** Den ganzen Handler messen und zusätzlich den Abstand der gezeichneten Bilder (`requestAnimationFrame`) während des Zugs.
  Erst dann über Tempo entscheiden. Aufwand: eine Stunde.

### B2. Nach dem Loslassen zeigt das Fenster bis zu fünf Stände (gelesen)

- Beim Loslassen: vier weitere Runden, dann Verdichten, dann Anzeige (`kurven.ts:2305`, `2314`, `2328`). Das ist Stand 1; die neuen Punkte
  liegen dabei „erst nur rund zwischen den alten“ (Kommentar `kurven.ts:2315–2316`).
- 30 ms später: Setzen mit vier Runden, Anzeige (`kurven.ts:1451–1462`, `1472–1475`, `1479`). Stand 2.
- Dann bis zu dreimal: noch einmal feiner, noch einmal setzen, noch einmal zeigen (`kurven.ts:1464–1471`). Stände 3 bis 5.
- Das deckt sich mit der Planseite, Abschnitt 11, Fall 1: Die Stelle wächst „in drei Schritten weiter“.
- **Griffzüge verfeinern nie im Zug.** Das Verfeinern im Zug gibt es nur mit `?gewichte=geometrie`, und auch dort schließt die Bedingung
  Griffe aus (`kurven.ts:2090`, `!z.griff`). Im Standard wird immer erst am Ende verdichtet (Kommentar `kurven.ts:2086–2087`).
  Zieht Florian an einem Griff, kommt die ganze Netzänderung also in jedem Modus nach dem Loslassen. Das passt zu seinem Wort
  „beim Loslassen der Handles“.
- **Einordnung:** Die Größe der Änderung ist Sache des Lösers. Dass man sie als Treppe sieht, ist Sache des Fensters.
- **Vorschlag, ehrlich als Linderung:** Zwischenstände nicht zeigen, sondern nur den letzten (ein Schritt statt mehrerer). Das löst nichts,
  macht aber aus „arbeitet nach“ ein einmaliges Setzen. Die Ursache gehen die Ideen 1, 2 und A an.

### B3. Das Ziel „16 ms“ gilt für 60 Bilder je Sekunde (gelesen und vermutet)

- Die Kriterien der Planseite rechnen mit 16 ms (Abschnitt 11, Teil 1; Bilanz Abschnitt 7).
- Im Projektgedächtnis steht für Florians Mac „M3 Pro/120Hz“. Bei 120 Hz dauert ein Bild 8,3 ms.
- **Vermutet:** Ein Handler mit 14–16 ms Löser-Zeit plus Anzeige (B1) lässt auf diesem Bildschirm Bilder aus, in unregelmäßigem Takt.
  Das liest sich als Stocken, auch wenn „16 ms“ eingehalten ist. Ob sein Fenster wirklich mit 120 Hz läuft, konnte ich nicht prüfen.

### B4. Weite Züge sind der schlechteste Fall, und nur dort stört es stark (gelesen, Messungen der Planseite)

- Hörner 170 Einheiten hinaus: nach dem Loslassen 20,0 + 3,3 Einheiten (Standard) bzw. 4,6 (nach der Geometrie). Ohne Verdichten nur 1,5
  (Abschnitt 11, Fall 2; Abschnitt 18).
- Kleine Griffzüge 1–5 danach: 0,4–2,0 Einheiten (Abschnitt 18, Tabelle).
- Die Dehnung des Netzes erzwingt das Verdichten, das Verdichten ändert die Form (Abschnitt 17).
- **Folge für die Bedienung:** Wer selten weit zieht, sieht selten etwas springen. Das ist der Grund für die Ideen 1 und 2.

### B5. Übersehen: Speichern entscheidet die Wahrheitsfrage (gelesen und vermutet)

- Es gibt kein Speichern (Tabelle oben). Die Bilanz führt es unter „fehlt noch“.
- Speichert man **nur die Kurven** (das wäre „Kurven sind die Wahrheit“), entsteht beim Laden eine andere Haut: Das frische Netz ist anders,
  und die Linien tragen ein Gedächtnis (Planseite Abschnitt 18: jede weiche Linie hat das Ziel „so gebogen wie jetzt“). Die Planseite
  misst die Abhängigkeit vom Netz am Ohr mit 7,96 Einheiten (Standard) bzw. 1,81 (nach der Geometrie), Abschnitt 12.
- Speichert man **die Haut mit**, sind die Kurven nicht die ganze Wahrheit, und Dateien werden groß und an ein Netz gebunden.
- **Vorschlag:** Diese Rundreise als festen Test und als Befehl einführen (Idee C). Sie ist das direkteste Maß für das Prinzip und für
  jeden Löser-Kandidaten: Kurven behalten, Haut auf frischem Netz neu aufbauen, Abstand messen.

### B6. Die Spielvorschau fehlt im Kurven-Fenster (gelesen)

- Florian am 02.11.: Er will von Beginn an auf Spielqualität umstellen können.
- Das Backen gibt es im Kern (`packages/shape/src/dicht/backen.ts`), das Kurven-Fenster benutzt es nicht.
- Das Spiel zeigt höchstens 8 000 Dreiecke (Bilanz Abschnitt 2). Die Haut im Editor hat bei 5 200 Punkten schon etwa 10 000 Dreiecke und
  wuchs in Florians Fall auf 26 284 Punkte (Planseite Abschnitt 11). Der Editor rechnet live feiner, als das Spiel je zeigt.

### B7. O misst den Abstand im Raum (gelesen)

- `abstandSym` ist der gerade Abstand, auch zum Spiegelbild (`kurven.ts:393`, `1873–1877`).
- Folge: Punkte auf der anderen Seite einer dünnen Flosse, die Gegenlippe oder ein zweites Horn gehen mit, obwohl sie auf der Haut weit
  weg sind. Blender hat dafür „Connected Only“.

### B8. Die Blätter zeigen Verdecktes wie Sichtbares (gelesen)

- In Front und Top liegt die Rückseite eines Rings im selben Strich über der Vorderseite (`kurven.ts:1326–1339`).
- Florians Klarstellung vom 02.11. verlangt verdeckte Linien gestrichelt oder blasser, und bearbeitbar.
- Mit zehn und mehr Loops werden die Blätter unlesbar, und man greift den falschen Punkt (das Fenster kennt das Problem: `kurven.ts:15`).

---

## 3. Wie andere es lösen

| Werkzeug | Kern der Bedienung | Was sich übertragen lässt |
| --- | --- | --- |
| **FiberMesh** (2007, gelesen im Paper) | Fünf Werkzeuge: Zeichnen (Erzeugen, Schnitt, Auswuchs, Tunnel, Linie hinzufügen), Ziehen an Linien mit mitwachsendem Bereich, Reiben (glättet eine Linie, je mehr, desto glatter), Radieren, Art wechseln (glatt ↔ scharf). Radieren und Artwechsel rechnen beim Loslassen. Neu vernetzt wird nur am Ende einer Operation. 600–2000 Punkte, 10–15 Bilder je Sekunde. Eine zusätzliche Linie quer dient als Griff für die Dicke. | Auswuchs als Operation, Reiben, Linie als Dicken-Griff, kleines Rechennetz |
| **Teddy / SmoothTeddy** | Erzeugen, Schneiden, Auswuchs als Strich-Operationen | wie FiberMesh |
| **Monster Mash** | Einmal aufblasen (geschlossene Formel), danach nur verformen | Für Posen richtig, für die Form nicht (Recherche vom 09.11., bestätigt) |
| **ShapeShop** | Körper aus Feldern in einem Baum; der Baum ist die Baugeschichte, jedes gezeichnete Stück bleibt änderbar | Baugeschichte als Dokument (Idee C), nicht die Felder |
| **SecondSkin** | Striche werden relativ zur Schicht darunter gedeutet | Teile als Kurvensätze, die auf der Haut sitzen (Idee 13) |
| **ILoveSketch** | Achsen-Widget wählt die Zeichenfläche; die Ansicht dreht sich so, dass die Linie gut zu zeichnen ist | Blatt auf den Loop legen (Idee 6) |
| **BendSketch** | Stricharten: Rand, Biegestrich, scharfe Kante, Grat und Tal | Bestätigt: Wölbung durch Linien angeben, nicht durch Zahlen |
| **True2Form, CASSIE** | 3D-Kurven aus Skizzen erraten bzw. in VR zeichnen | Nicht übertragen (siehe Abschnitt 6) |
| **Regularized Kelvinlets** (Pixar) | Greifen, Drehen, Skalieren, Kneifen als geschlossene Formeln eines elastischen Körpers, volumentreu; in Blender seit 2.81 der Pinsel „Elastic Deform“ | Abfall für O, Pinsel in Posen (Idee 10) |
| **Spore** | Wirbel ziehen, Mausrad macht den Körper an einem Wirbel dicker oder dünner; Teile mit Mausrad und Zusatzgriffen; Haut aus Kugelfeldern | Kugelkette mit Mausrad als Startform (Idee 2), Mausrad als Dicke eines Loops (Idee 3) |
| **ZBrush** | Kugelketten (ZSpheres) werden zur Haut; Führungskurven steuern den Kantenfluss beim Neuvernetzen; Falten per Crease | Startform; Loops als Führung fürs Spielnetz (steht schon in der Bilanz) |
| **Sculptris, Nomad** | Netz wird unter dem Pinsel feiner | Schon vorhanden (Verdichten); hier die Quelle des Springens |
| **Blender** | Griffarten automatisch, Vektor, ausgerichtet, frei; O mit „nur verbunden“ und „aus der Ansicht“; Zahlen im Zug, ⇧ fein, ⌃ rastet; Kante gleiten (GG); LoopTools (Kreis, eben, Abstand, entspannen); Radius und Neigung je Kurvenpunkt | Ideen 3, 7, 9, 10 |
| **Illustrator** | Krümmungswerkzeug (nur Punkte, die Kurve läuft glatt hindurch), Glätten, Vereinfachen mit Punktzahl vorher/nachher, Breitenwerkzeug, Ankerpunkt umwandeln, intelligente Hilfslinien | Ideen 3 und 7 |
| **Figma** | Linie direkt anfassen und biegen; Netze statt Pfade (drei Linien an einem Punkt) | Linie direkt biegen (Idee 7); Kreuzung = ein Punkt gibt es schon |
| **Schriftgestaltung** (Speed Punk, Glyphs, FontLab) | Krümmung als Kamm an der Kurve; „Harmonisieren“ macht die Krümmung an einem glatten Punkt stetig; Verbindungslinie der Griffe zum Ausgleichen | Ideen 4 und 7. Das ist die strengste Bézier-Schule, die es gibt. |
| **Rhino** | Krümmungsgraph, Zebra, Umgebungsbild als Prüfansichten | Idee 11 |
| **Womp, MagicaCSG, Substance Modeler, Project Neo** | Körper aus Abstandsfeldern, live und ohne Springen, Verschmelzen mit einem Regler; Neo gibt Vektoren an Illustrator zurück | Nicht für den Körper (verschmilzt). Die Rückgabe als Vektor ist interessant (Idee D) |

Nicht belegt: Zu **Plasticity/xNURBS** fand ich keine offizielle Beschreibung der Bedienung. **Gravity Sketch** habe ich nicht recherchiert.
**Spore:** Die Wiki-Seite war nicht abrufbar; Mausrad und Wirbel stammen aus einem Anspielbericht und einem Handbuch-Auszug.

---

## 4. Vierzehn Ideen für diesen Editor, nach Wert für „schnell und präzise“

Aufwand grob in Arbeitstagen. „Passt zu Kurven als Wahrheit“ heißt: Nach der Operation gibt es nur Linien, Punkte und Griffe, sonst nichts.

### 1. Auswuchs als eigene Operation (E)

- **Problem:** Horn, Ohr, Flosse, Hals entstehen heute, indem man Punkte weit aus der Kugel zieht. Genau dieser Zug dehnt das Netz,
  erzwingt das Verdichten und springt danach (B4). Bei langem Griffspiel wird es schwarz (Planseite Abschnitt 11).
- **Vorbild:** Teddy und FiberMesh: geschlossener Strich auf der Haut, dann ein Umriss-Strich; das System baut die neue Haut in einem
  Schritt und vernetzt danach. Die Striche bleiben als Linien auf der Haut. In Blender ist es E.
  ([FiberMesh, Abschnitt 2.1](https://www-ui.is.s.u-tokyo.ac.jp/~takeo/papers/fibermesh.pdf))
- **Ablauf:** Fuß-Loop wählen oder mit F zeichnen. E drücken. Im Blatt mit dem Stift den Verlauf des Auswuchses zeichnen (zwei, drei
  Punkte mit Griffen) oder einfach herausziehen. Während der Geste zeigt das Fenster nur die Kurven und eine blasse Hülle. Beim Loslassen
  entsteht die Haut mit Dreiecken in der richtigen Größe, dazu ein Loop am Fuß und ein Loop über die Spitze.
- **Passt:** Es bleibt eine Haut. Es entstehen nur Loops. Kein Teil, keine Erkennung, kein eigener Umriss je Teil.
- **Aufwand:** 3–5 Tage. Bausteine gibt es: Loops einsetzen (`packages/shape/src/dicht/einsetzen.ts`), runde Form aus einem Umriss
  (`rundAusSeite`, `packages/shape/src/dicht/rund.ts:412`), Verdichten (`verdichten.ts`). Wie gut sie sich dafür eignen, habe ich nicht
  geprüft.
- **Risiko:** Die Naht am Fuß muss ohne Falte ansetzen; Auswüchse auf der Mittelebene und als Spiegelpaar sind zwei Fälle. Die Geste ist
  nicht „live“ im strengen Sinn: Vorschau, dann Ergebnis. Das ist bei Blenders Schleifenschnitt genauso und wird dort nicht als
  Nachjustieren empfunden, weil die Vorschau nicht vorgibt, das Ergebnis zu sein.
- **Sicherheit:** vermutet. Stützt sich auf B4.

### 2. Startform mit fertigen Loops

- **Problem:** Jedes Wesen beginnt als Kugel und wird weit verzogen. Die ersten Minuten sind die mit den weitesten Zügen.
- **Vorbild:** Spore (Wirbel ziehen, Mausrad für die Dicke), ZBrush-Kugelketten, und der eigene Weg aus `form.html`, den Florian mochte
  (Bilanz Abschnitt 5). ([Spore-Anspielbericht](https://gamesradar.com/spore-creature-creator-hands-on),
  [ZSpheres](https://help.maxon.net/zbp/en-us/Content/html/5_sculpting-and-painting_zsphere-essentials.html))
- **Ablauf:** Seitenumriss einmal mit dem Stift zeichnen (oder eine Kugelkette ziehen, Mausrad = Dicke). Daraus entsteht die runde Haut in
  ihren endgültigen Maßen. Neu gegenüber der Bilanz: Die Startform bringt Loops mit, nämlich den gezeichneten Umriss als Loop der
  Mittelebene (genau sein Bézier-Pfad) und Ringe an den dicksten und dünnsten Stellen.
- **Passt:** Der Umriss ist nur der Samen. Danach ist er ein Loop wie jeder andere. Das ist nicht „Umrisse als Eingabe“ im verworfenen Sinn
  (drei Ansichten erzwingen eine Form).
- **Aufwand:** 1–2 Tage. Der Startumriss ist heute schon ein Parameter (`kurven.ts:155–182`, `?form=kugel|bohne`).
- **Risiko:** Florian hat am 05.11. festgelegt, dass die Kugel ohne Loops beginnt. Die Startform mit Loops sollte deshalb eine Wahl sein
  (Bibliothek), keine Änderung seiner Regel.
- **Sicherheit:** Bausteine gelesen, Wirkung vermutet.

### 3. Präzision im Zug: Zahlen, fein, einrasten, Pfeiltasten, Maße

- **Problem:** Alles geht nur nach Augenmaß. „Genau“ ist so nicht erreichbar.
- **Vorbild:** Blender: nach G/S/R eine Zahl tippen, ⇧ für fein, ⌃ rastet
  ([Zahlen](https://docs.blender.org/manual/en/3.0/scene_layout/object/editing/transform/control/index.html),
  [fein und Raster](https://docs.blender.org/manual/en/3.0/scene_layout/object/editing/transform/control/precision.html)).
  Illustrator: Pfeiltasten, intelligente Hilfslinien
  ([Optionen](https://helpx.adobe.com/ph_fil/illustrator/desktop/measure-and-align/grids-and-guides/smart-guides-options.html)).
  Spore: Mausrad über einem Wirbel.
- **Inhalt:**
  - Zahl tippen im Zug (Einheiten, Faktor, Grad); ⇧ = zehnmal feiner; Pfeiltasten schieben die Auswahl.
  - Einrasten mit ⌃: Griff auf 0/45/90° im Blatt; Griff gleich lang wie der gegenüber; Punkt auf die Höhe oder Länge eines anderen Punkts
    (Hilfslinie erscheint); Punkt auf die Mittelebene; Punkt auf eine Kreuzung.
  - Mausrad über einem gewählten Loop = S um seine Mitte (dicker, dünner), ohne Tastenwechsel.
  - Anzeige am Zeiger während des Zugs: Δx, Δy, Grifflänge, Winkel.
  - Drehpunkt wählbar: Mitte der Auswahl, angeklickter Punkt, Mittelebene.
  - Wiederholen (⇧⌘Z) und Auswahlrechteck.
- **Passt:** Alles wirkt nur auf Punkte und Griffe.
- **Aufwand:** 2–3 Tage. Im Haupteditor gibt es die Zahleneingabe für G/S/R schon (gelesen:
  `apps/editor/src/editing/modal/abbildung.ts:268–276`; Pfeiltasten und Achsen laut `apps/editor/CLAUDE.md`, Abschnitt V3); das ist
  Nachziehen, keine Erfindung.
- **Risiko:** Gering. Einrasten nur mit gedrückter Taste, sonst stört es beim freien Formen.

### 4. Umkehr-Wächter und Krümmungskamm: rot statt schwarz

- **Problem:** Zieht man einen Griff so weit, dass die Linie umkehrt, kann die Haut nur gefaltet folgen. Es wird schwarz (Planseite
  Abschnitt 11, Fall 1; Bilanz Punkt 11: „Bedienfrage, keine Löserfrage“).
- **Vorbild:** Schriftgestaltung: Der Krümmungskamm zeigt an der Kurve, wo sie sich staut, bevor man es an der Form sieht
  ([Speed Punk](https://github.com/yanone/speedpunk)). Rhino: Krümmungsgraph
  ([Befehl](https://docs.mcneel.com/rhino/5/help/en-us/commands/curvaturegraph.htm)).
- **Inhalt:**
  - Kamm an der gewählten Linie (ein Schalter). Er zeigt Sprünge der Krümmung an glatten Punkten und Spitzen.
  - Zwei rein geometrische Prüfungen am Bézier-Pfad, bei jeder Mausbewegung: Die Richtung der Linie kehrt innerhalb eines Stücks um; zwei
    nicht benachbarte Stellen der Linie berühren sich im Raum. Das betroffene Stück wird rot.
  - Solange ein Stück rot ist, folgt die Haut dort nicht weiter (sie bleibt beim letzten gültigen Stand). Der Griff bleibt frei beweglich.
    Ein Klick auf das rote Stück setzt den Griff auf die letzte gültige Länge.
- **Passt:** Geprüft wird die Linie, nicht die Haut. Keine Regel nennt einen Körper oder eine Lage.
- **Aufwand:** 1–2 Tage.
- **Risiko:** Eine Schlaufe, die sich nur im Blatt kreuzt, aber im Raum nicht berührt, ist erlaubt (sie ist ein Prüffall der Planseite).
  Deshalb im Raum prüfen, nicht im Blatt.
- **Zu Entscheidung 5 der Bilanz** („rot zeigen oder begrenzen“): rot zeigen und die Haut anhalten. Den Griff nicht festhalten;
  Illustrator hält nie einen Griff fest.

### 5. Verdeckte Linien blass, Solo, Durchklicken

- **Problem:** B8.
- **Vorbild:** Technische Zeichnung; Blenders Durchsicht-Schalter; Illustrators Isolationsmodus.
- **Inhalt:** In jedem Blatt verdeckte Stücke gestrichelt und blass, weiter greifbar. Beim Klick gewinnt das sichtbare Stück; ⌥-Klick oder
  Tab wechselt zum nächsten darunter. Taste „/“: nur die gewählten Loops zeigen (Solo), alle anderen blass und nicht greifbar.
- **Passt:** Reine Anzeige und Auswahl. Erfüllt die Klarstellung vom 02.11. wörtlich.
- **Aufwand:** 1–2 Tage. Die Sichtbarkeit je Probe lässt sich aus dem Tiefenbild der Blattkamera lesen (einmal nach jedem Setzen).
  Das 3D-Blatt unterscheidet sichtbar und verdeckt schon (`kurven.ts:481–529`).
- **Risiko:** Gering.

### 6. Blatt auf den Loop legen, Bearbeiten in 3D, Hinten und Unten

- **Problem:** Bearbeitet wird nur in drei festen Ansichten. Ein schräges Horn, ein Auge an der Kopfseite oder ein Fuß-Loop sind in
  allen dreien verkürzt. Florian am 05.11.: Alle Seiten sollen gleichwertig sein.
- **Vorbild:** Blender: Ansicht auf die Auswahl ausrichten, G in jeder Ansicht. ILoveSketch: Die Ansicht dreht sich zur Linie
  ([Paper](https://sketch.kaist.ac.kr/publications/2008_uist_ilovesketch)).
- **Inhalt:**
  - Eine Taste legt ein Blatt genau auf die Ebene des gewählten Loops. Dort ist der Loop eine unverzerrte 2D-Form und lässt sich bearbeiten
    wie ein Illustrator-Pfad. Das ist der alte Spant, aber für jeden Loop und ohne eigenes Werkzeug.
  - Im 3D-Blatt Punkte und Griffe greifen: Ziehen in der Bildebene, mit ⌥ entlang der Hautnormale (ein Punkt „bläst auf“), mit X/Y/Z
    entlang der Achse.
  - Hinten und Unten als Umschalter an Front und Top.
- **Passt:** Bearbeitet werden dieselben Punkte und Griffe.
- **Aufwand:** 3–5 Tage. Die drei Abbildungen sind fest eingebaut (`kurven.ts:678–681`, dazu Sonderfälle wie `kurven.ts:1859`,
  `1577–1580`).
- **Risiko:** Mittel, wegen der vielen Stellen mit festen Ansichten. Hinten und Unten allein sind klein.

### 7. Linienpflege: Kreis, eben, harmonisieren, ausgleichen, vereinfachen, reiben, direkt biegen

- **Problem:** Die Haut folgt den Linien genau. Jede Unruhe einer Linie wird eine Beule. Florian am 05.11.: Loops seien „so ungerade mit
  viel zu vielen Punkten“. Pflegewerkzeuge für Linien gibt es keine.
- **Vorbild und Inhalt:**
  - **Kreis/Ellipse** und **eben:** Loop auf den bestpassenden Kreis bzw. in seine Ebene legen (Blender LoopTools:
    [Handbuch](https://docs.blender.org/manual/en/4.1/addons/mesh/looptools.html)). Für Augen, Nüstern, Ringe.
  - **Harmonisieren:** An einem glatten Punkt die Grifflängen so setzen, dass die Krümmung stetig durchläuft
    ([Glyphs](https://glyphsapp.com/learn/harmonization)). Ein Tastendruck für die Auswahl.
  - **Griffe ausgleichen:** Doppelklick auf die Verbindungslinie zweier Griffe gleicht sie aus; Ziehen an ihr ändert die Spannung, ohne
    das Verhältnis zu ändern (FontLab, „Tunni-Linien“: [Diskussion](https://typedrawers.com/discussion/5101/smoothness-of-tunni-curves)).
  - **Vereinfachen** mit Vorschau und Punktzahl vorher/nachher
    ([Illustrator](https://helpx.adobe.com/illustrator/desktop/draw-shapes-and-paths/modify-paths/simplify-paths-advanced-options-overview.html)).
    Heute nur einmal beim Zeichnen mit F (`kurven.ts:2575–2576`).
  - **Reiben:** Über eine Linie hin und her fahren glättet sie schrittweise (FiberMesh, Abschnitt 2.3). FiberMesh begründet, warum das nicht
    automatisch geschieht: Es ist nicht klar, wie stark.
  - **Linie direkt biegen:** ⌘-Ziehen an einem Stück verformt es, die Griffe passen sich an
    ([Figma](https://www.figma.com/blog/introducing-vector-networks/)).
  - **Punktart „automatisch“:** Der Punkt hat keine eigenen Griffe, die Linie läuft so glatt wie möglich hindurch (Illustrators
    Krümmungswerkzeug: [Hilfe](https://helpx.adobe.com/illustrator/using/curvature-tool.html); Blenders Griffart „Automatic“:
    [Handbuch](https://docs.blender.org/manual/en/2.90/modeling/curves/structure.html)). Fasst man einen Griff an, wird der Punkt normal.
- **Passt:** Alles sind Rechnungen an Bézier-Pfaden. Der Löser bleibt unberührt. Jede Verbesserung der Linie verbessert die Haut.
- **Aufwand:** je Werkzeug ½–1 Tag.
- **Risiko:** Gering. Nichts davon darf von selbst laufen oder Punkte von selbst setzen (Florians Regel vom 11.10.). Der Kreis braucht
  vier Punkte; das berührt die offene Entscheidung „Punkte wo nötig“ (Bilanz, Entscheidung 4).

### 8. Wölbung als Linie: Stütz-Loop mit einem Klick, und zeigen, wo keine Linie die Form festlegt

- **Problem:** „Wenn ich etwas schmaler mache, nehme ich ihm auch die Höhe“ (Florian, 05.11.). Und: Zwischen wenigen Linien ist die Form
  nicht festgelegt. Die Planseite misst das dreimal als Ursache (Abschnitt 12: jede Kuppelhöhe passt; Abschnitt 13: quer trägt eine
  Linie nichts; Abschnitt 18: jede Kugel durch den Ring ist eine Lösung). Dort rät der Löser, und was er rät, hängt am Netz.
- **Vorbild:** FiberMesh nennt eine zusätzliche Linie quer über den Körper einen
  „convenient handle to adjust the amount of inflation“ (Abschnitt 2.1). BendSketch gibt Wölbung mit Biegestrichen an
  ([Projektseite](https://haopan.github.io/bendsketch.html)).
- **Inhalt:**
  - Klick auf die Haut zwischen den Linien mit einem Werkzeug „Stütze“: Das Fenster zeigt beim Schweben den Loop durch diese Stelle,
    der die Nachbarlinien kreuzt. Klick setzt ihn. Der Punkt unter dem Zeiger ist gewählt; Ziehen entlang der Normale macht die Stelle
    dicker oder dünner. Der Loop bleibt sichtbar und löschbar.
  - Ein Schalter färbt die Haut nach dem Abstand zur nächsten Linie. Weit weg von jeder Linie heißt: Hier bestimmt keine Linie die Form.
- **Passt:** Die Wölbung ist eine Linie. Es gibt keine Zahl, keinen Regler und keinen verborgenen Wert je Feld.
- **Aufwand:** 2–3 Tage. Das Schneiden eines Loops quer über den Körper gibt es (L, `kurven.ts:2372`). Der Vorschlag beim Schweben
  steht als Idee I9 schon in der Gegenprüfung vom 02.11.
- **Risiko:** Mehr Linien machen die Blätter voller (deshalb Idee 5 zuerst). Florian hat am 06.11. über FiberMesh gehört: „Dort
  zeichnet man mehr Linien“; ob ihm das liegt, entscheidet nur er.
- **Abgrenzung zum Löser:** Die Varianten „jede Linie trägt ihre Rundung quer als eigene Angabe“ und „aufblasen nach der Dicke“ hat
  Florian nach Abschnitt 13 abgelehnt („viel Nachjustieren“). „Linien mit Richtung“ wurde in Abschnitt 15 gemessen und angehalten.
  Diese Idee gibt der Linie keine neue Angabe, sie setzt eine weitere Linie.

### 9. Gleiten auf der Haut (GG) und Parallel-Loop

- **Problem:** Eine Linie verschieben heißt heute immer die Form verschieben. Man kann eine Linie nicht an eine bessere Stelle rücken,
  ohne die Form zu ändern. Und die Breite einer Rundung neben einer Kante lässt sich nur über Griffe kreuzender Linien steuern.
- **Vorbild:** Blender: Kante gleiten
  ([Handbuch](https://docs.blender.org/manual/en/dev/modeling/meshes/editing/edge/edge_slide.html)). Im Modellieren mit
  Unterteilungsflächen ist der Stütz-Loop neben der Kante das Standardmittel: Sein Abstand ist die Breite der Rundung.
- **Inhalt:** GG lässt den gewählten Loop auf der stehenden Haut gleiten. ⇧D mit Gleiten legt eine Kopie im festen Abstand daneben.
- **Passt:** Danach sind es gewöhnliche Loops.
- **Aufwand:** 2–3 Tage.
- **Risiko:** Formneutral ist das Gleiten nur näherungsweise, denn die Haut rechnet sich aus den Linien neu. Wie groß der Unterschied
  ist, muss gemessen werden. Als Anhalt: Nach dem Löschen einer Form blieb auf der Planseite ein Rest von 0,7 Einheiten (Abschnitt 5).

### 10. O entlang der Haut, elastischer Abfall, Pinsel in Posen ohne Löser

- **Problem:** B7. Und: In Posen ist ein Pinsel erwünscht, aber nachrangig (Bilanz Abschnitt 5).
- **Vorbild:** Blender „Connected Only“ und „Projected from View“
  ([Handbuch](https://docs.blender.org/manual/en/dev/editors/3dview/controls/proportional_editing.html)). Regularized Kelvinlets
  ([Pixar](https://graphics.pixar.com/library/Kelvinlets)); Blender nennt sie als Grundlage von „Elastic Deform“
  ([Versionshinweise 2.81](https://wiki.blender.org/release_notes/2.81/sculpt/)).
- **Inhalt:**
  - O misst den Abstand entlang der Haut (Umschalter wie in Blender).
  - Der Abfall von O wahlweise elastisch: Nachbarn weichen aus, statt nur mitzugehen. Es wirkt weiter nur auf Punkte und Griffspitzen.
  - In Posen ein Greif-Pinsel als geschlossene Formel je Hautpunkt. Dort gibt es keinen Löser, also weder Nachhinken noch Setzen.
- **Passt:** In der Grundform ändert O nur Punkte und Griffe. Der Pinsel bleibt in der Pose (Blendshape).
- **Aufwand:** 2–3 Tage.
- **Risiko:** Kelvinlets wirken im Raum; ohne die Maske „entlang der Haut“ greifen sie durch dünne Stellen.

### 11. Prüfansichten: Stufen/Zebra, Dehnung, Nachlauf, Spielnetz

- **Problem:** Unebenheiten sieht man im Earle-Look als zackige Farbstufen, aber erst spät. Ob die Haut fertig gerechnet ist, sieht man
  gar nicht. Die Spielvorschau fehlt (B6).
- **Vorbild:** Rhino Zebra ([Befehl](https://docs.mcneel.com/rhino/7/help/en-us/commands/zebra.htm)); im Haupteditor gibt es Zebra schon.
- **Inhalt:** Vier Schalter, je eine Taste: enge Stufen (Zebra); Dehnung der Dreiecke als Farbe (zeigt, wo ein Zug das Netz überfordert);
  Nachlauf als Farbe (wo die Haut noch nicht steht; der Haken `nachrechnen` zeigt, dass das Fenster es prüfen kann, `kurven.ts:3173`);
  Spielnetz (gebacken, 8 000 Dreiecke, bei 300 px Höhe).
- **Passt:** Reine Anzeige.
- **Aufwand:** 1–2 Tage.
- **Risiko:** Keins. Die Nachlauf-Farbe ist zugleich das ehrlichste Messgerät für jeden künftigen Löser-Versuch.

### 12. Vorher/Nachher, Linie stummschalten, Stände

- **Problem:** Man sieht nicht, was ein Zug genau geändert hat, und kann eine Linie nicht probeweise weglassen.
- **Vorbild:** Zwiebelhaut der Animation; FiberMesh zeigt beim Radieren die Form ohne die Linie (Abschnitt 2.4); Versionen in Figma.
- **Inhalt:** Im Zug der alte Umriss als dünne graue Linie in den Blättern. Eine Taste zeigt gedrückt den Stand vor dem letzten Schritt.
  Ein Loop lässt sich stummschalten: Die Haut rechnet ohne ihn, er bleibt blass liegen und kommt mit einem Klick zurück. Benannte
  Stände nebeneinander.
- **Passt:** Stummschalten ist „Linie löschen“ ohne Verlust.
- **Aufwand:** 2 Tage.
- **Risiko:** Stumm und wieder an muss dieselbe Form geben. Mit dem Gedächtnis an den Linien (Planseite Abschnitt 18) ist das nicht
  sicher. Das ist zugleich ein guter Test.

### 13. Bibliothek als Kurvensätze (Stempel)

- **Problem:** Hörner, Ohren, Flossen, Augenhöhlen wiederholen sich von Wesen zu Wesen.
- **Vorbild:** Spore-Teile (Mausrad skaliert, ⌥-Ziehen kopiert); SecondSkin
  ([Projektseite](https://www.dgp.toronto.edu/~depaolic/projects/secondSkin)); Symbole in Illustrator.
- **Inhalt:** Ein gespeicherter Auswuchs ist ein Satz Loops mit Griffen relativ zu seinem Fuß. Klick auf die Haut setzt ihn, Mausrad
  skaliert, Ziehen dreht. Danach sind es gewöhnliche Loops auf einer Haut.
- **Passt:** Es gibt kein Teil-Objekt und keine Automatik.
- **Aufwand:** 2–3 Tage nach Idee 1 und nach dem Speichern.
- **Risiko:** Darf nicht zur „Teile-Automatik“ werden: kein Erkennen, kein eigenes Verhalten, nur Einfügen.

### 14. Speichern als Kurven, mit Rundreise-Test

- **Problem:** B5.
- **Inhalt:** Das Dokument enthält Startumriss, Loops (Punkte, Griffe, Kante, Art), Operationen (Idee 1) und Posen. Laden baut die Haut
  neu auf. Ein fester Test misst den Abstand zwischen der Haut vor dem Speichern und nach dem Laden.
- **Passt:** Es ist die Definition des Prinzips.
- **Aufwand:** 2 Tage für das Format, der Test dazu ½ Tag.
- **Risiko:** Der Test wird heute nicht bestehen (siehe B5). Das ist kein Grund, ihn nicht zu bauen: Er zeigt, wie weit die Haut von
  „nur aus den Kurven“ entfernt ist, in einer Zahl, die Florian versteht.

---

## 5. Vier Ideen außerhalb des bisherigen Rahmens

### A. Kleines Rechennetz, glatt unterteilte Anzeige

- **Gedanke:** Heute ist das gezeigte Netz das gerechnete Netz, Punkt für Punkt (`kurven.ts:1036–1078`; doppelt gezeigt werden nur
  Punkte auf Kanten, `kurven.ts:544–599`). Deshalb muss das Rechennetz so fein sein, wie die Haut aussehen soll, und deshalb wird im und
  nach dem Zug verdichtet. FiberMesh rechnete live 600–2000 Punkte. Das Spiel zeigt höchstens 8 000 Dreiecke.
- **Vorschlag:** Rechnen auf 1 500–2 500 Punkten. Zeigen mit einer glatten Unterteilung, in der die Linien genau auf ihrem Bézier-Pfad
  liegen und Kanten scharf bleiben (auf der Grafikkarte:
  [Phong-Tessellation](https://www.telecom-paristech.fr/~boubek/papers/PhongTessellation/), oder einmal unterteilt in JavaScript).
  Verdichtet wird das Rechennetz nur noch, wo die Form es braucht (dünne Flosse), nicht für das Aussehen.
- **Was es bringen soll (vermutet):** Mehr Runden je Mausbewegung (eine Runde kostet bei 5 200 Punkten 10–12 ms, Bilanz Abschnitt 2;
  jede weitere holt am Ohr etwa ein Drittel auf, Bilanz Abschnitt 6). Weniger Verdichten, also weniger Sprünge. Glatte kleine Details
  ohne mehr Rechenpunkte (heute dreht die Fläche am Ohr 22,5° je Kante, Planseite Abschnitt 11, Fall 3).
- **Grenzen:**
  - Das Springen beim Verdichten bleibt, wo doch verdichtet wird. Es wird seltener, nicht unmöglich.
  - Details, die kleiner sind als eine Kante des Rechennetzes, brauchen weiter örtliche Dichte.
  - Die Unterteilung muss Kanten und Linien genau treffen; das ist eigene Arbeit (3–5 Tage).
  - Es ist nicht gemessen. Auf der Planseite steht nichts dazu (gesucht nach Anzeige, Unterteilung, Tessellation).
- **Billige Probe ohne Bau:** `kurven.html?dreiecke=2000&gewichte=geometrie` (der Schalter ist da, `kurven.ts:139`). Die Facetten
  dabei ignorieren und nur fühlen: Hinkt es noch nach? Springt es noch beim Loslassen?

### B. Nachziehen statt Griffe ziehen

- **Gedanke:** Ein Illustrator korrigiert eine Kurve oft schneller, indem er sie neu zieht, als über sechs Griffe.
- **Vorschlag:** Werkzeug „Nachziehen“: Ein Strich über ein Stück einer Linie ersetzt dieses Stück. Der Strich wird als Bézier-Pfad mit
  so wenigen Punkten wie möglich angepasst (die Anpassung gibt es, `packages/shape/src/fit.ts`; der Stift liegt laut Bilanz ≤ 0,35 px neben
  der Zeichnung). Die Haut rechnet einmal am Ende des Strichs.
- **Vorbild:** Überzeichnen in Teddy und FiberMesh; ILoveSketch mit mehreren Strichen je Kurve.
- **Grenzen gegenüber Florians Vorgaben:** Er will exakte Griffe; die bleiben, das Werkzeug kommt dazu. Der angepasste Pfad ist eine
  Näherung des Strichs. Für Stift-Tablett oder Trackpad gedacht. Als einmalige Operation hat es kein Nachhinken, aber auch kein Live-Bild.

### C. Die Form als Rezept: „Neu aufbauen“

- **Gedanke:** Das Dokument ist nicht die Haut, sondern das, woraus sie entsteht: Startumriss, Operationen, Kurven (Idee 14). Dann gibt es
  einen Befehl „Neu aufbauen“: frisches, gleichmäßiges Netz in gewählter Dichte, einmal aus den Kurven gerechnet.
- **Nutzen:**
  - Die Netz-Geschichte verschwindet auf Wunsch (26 000 Punkte in einer Falte, gestreckte Dreiecke).
  - Dieselbe Form in jeder Dichte: fein für Standbilder, grob fürs Spiel.
  - Jeder Löser-Versuch bekommt ein einziges, hartes Kriterium: Aufbauen aus den Kurven ergibt die gezeigte Form.
- **Vorbild:** ShapeShop (Baugeschichte als Dokument,
  [Paper](https://diglib.eg.org/items/5f1714ab-9e03-46f0-b7bb-96289a8b3ec2/full)); Project Neo wirbt mit zerstörungsfreiem Arbeiten
  ([Seite](https://adobe.com/products/illustrator/2d-to-3d.html)).
- **Grenzen:** Heute ändert das Neuaufbauen die Form (B5). Der Befehl macht das sichtbar, statt es zu verstecken. Ob Florian eine Form
  akzeptiert, die sich beim Neuaufbauen um ein, zwei Einheiten setzt, ist seine Entscheidung. Wo keine Linie die Form festlegt (Idee 8),
  wird der Unterschied am größten sein.

### D. Zwischenablage mit Illustrator

- **Gedanke:** Florian zeichnet täglich in Illustrator. Die Blätter sind Vektorzeichnungen.
- **Vorschlag:** Einen Pfad aus Illustrator kopieren und in ein Blatt einfügen: Er wird wie mit dem Stift gezeichnet auf die Haut gelegt
  und ist dann ein Loop mit denselben Punkten und Griffen. Umgekehrt: ein Blatt als SVG kopieren (Linien, Kanten dick, Verdecktes
  gestrichelt). Die Gegenprüfung vom 02.11. hatte die Hälfte davon als Idee I1 („Das Blatt ist das SVG“).
- **Grenzen:** Eine Ansicht trägt keine Tiefe; die kommt wie beim Stift von der Haut. Ein Pfad, der neben dem Körper liegt, ergibt keinen
  Loop. Ob Illustrator SVG in die Zwischenablage legt, hängt an einer Einstellung dort; nicht geprüft.

---

## 6. Was man nicht bauen sollte, obwohl es naheliegt

| Naheliegend | Warum nicht |
| --- | --- |
| **Pinsel in der Grundform** (wie ZBrush, Nomad, Sculptris) | Der Löser würde jeden Strich überschreiben, oder es entsteht eine zweite Wahrheit neben den Kurven. Die Bilanz (Abschnitt 5) hält das fest; die Vorbilder ändern daran nichts. Pinsel gehören in die Pose. |
| **Körper aus Abstandsfeldern** (Womp, MagicaCSG, Spore-Haut, ShapeShop, Project Neo) | Live und ohne Springen, aber die Körper verschmelzen bei Berührung, und Punkte behalten keinen festen Ort (Posen, Maul, Zonen). Florian hat das Verschmelzen verworfen; die Recherche vom 09.11. kam zum selben Schluss. Als einmaliger Samen für die Startform ist es in Ordnung (`rundAusSeite` ist genau das). |
| **Regler oder Zahlen für Härte, Wölbung, Druck je Feld, Neigung je Linienpunkt** (Blenders Radius und Neigung, Illustrators Breitenwerkzeug) | Jede dieser Zahlen ist ein verborgener Wert neben der Linie. Florian: Härte „ganz oder gar nicht“ (Planseite Abschnitt 5), Rundung über Griffe. Die Wölbung als Linie (Idee 8) leistet dasselbe ohne Zahl. |
| **Griff festhalten, damit die Linie nicht umkehrt** | Illustrator hält nie einen Griff fest. Ein Griff, der plötzlich stehen bleibt, fühlt sich kaputt an. Besser rot zeigen und die Haut anhalten (Idee 4). |
| **Von selbst glätten, vereinfachen oder Punkte setzen** | Florians Regel seit dem 11.10. FiberMesh entscheidet sich aus demselben Grund für das Reiben von Hand. |
| **Noch eine Verdichtungsregel** (nach Winkel, nach Rundung, in der Falte anders) | Zwei Versuche sind gemessen schlechter (`?winkel=1`: `kurven.ts:256–260`; `?genauHaut=1`: `kurven.ts:274–277`). Solange das Verdichten die Form ändert, verschiebt jede Regel das Springen nur. |
| **Das Nachjustieren überblenden und für gelöst erklären** | Eine weiche Überblendung nach dem Loslassen versteckt die Änderung. Zwischenstände nicht zu zeigen (B2) ist vertretbar; es als Lösung zu melden nicht. |
| **Verformen einer Ruheform als Live-Vorschau, danach aus den Kurven setzen** (Monster-Mash-Art) | Der Unterschied zwischen Vorschau und Ergebnis wäre wieder ein Setzen nach dem Loslassen, also genau Florians Beschwerde. |
| **3D-Linien aus Skizzen erraten** (True2Form) **oder in VR zeichnen** (CASSIE, Gravity Sketch) | Erraten ist Automatik mit Mehrdeutigkeit. Hier liegt jede Linie auf der Haut, die Tiefe ist bekannt. VR passt nicht zu Maus, Blättern und Vektorgriffen. |
| **Flächenstücke zwischen den Linien als Form** (xNURBS, Coons) | Braucht ein Netz aus Feldern mit Ecken; einzelne Loops und Augenformen brauchen Sonderfälle. Die Bilanz (Abschnitt 5) hat das geprüft und nur fürs Spielnetz empfohlen. Ich sehe keinen Grund, das anders zu sehen. |
| **Freie Asymmetrie in der Grundform** | Verdoppelt die Arbeit an jeder Linie und am Kern. Schiefe gehört in die Pose (Bilanz, Entscheidung 3). |
| **Schalter aus den Versuchen als Bedienelemente** | Das Fenster hat 17 URL-Schalter (gezählt in `kurven.ts`). Keiner davon ist eine Gestaltungsentscheidung für Florian. |
| **Ein Zahlenfeld-Panel für alles** | Zahlen gehören in den Zug (tippen nach G/S/R), nicht in eine Tafel voller Felder. Sonst ist es wieder eine Regler-Flut. |

---

## 7. Reihenfolge, wenn Florian zustimmt

1. **Messen, was er sieht** (B1, B2, B3): ganzer Handler, Bildabstände, Zwischenstände zählen. Ein halber Tag. Ohne das ist jede
   Tempo-Entscheidung blind.
2. **Die billige Probe zu Idee A** im Fenster: `?dreiecke=2000&gewichte=geometrie`. Zehn Minuten für Florian.
3. **Rundreise-Test** (Idee 14/C): eine Zahl für „Kurven sind die Wahrheit“.
4. **Präzision und Lesbarkeit** (Ideen 3, 4, 5): kleine, sichere Schritte, sofort spürbar.
5. **Auswuchs und Startform** (Ideen 1, 2): der große Hebel gegen weite Züge.
6. Danach nach Florians Gefühl: Linienpflege (7), Stütz-Loop (8), Blatt auf den Loop (6).

Die Schritte 1 bis 3 sind Prüfungen, keine Bauten. Sie können die Rangfolge danach ändern.

---

## 8. Was ich nicht prüfen konnte

- **Keine eigene Messung.** Wie viel Zeit die Anzeige je Mausbewegung kostet (B1), ob Idee A das Nachhinken wirklich senkt, wie
  formneutral das Gleiten ist (Idee 9): alles offen.
- **Kein Blick ins laufende Fenster.** Alle Aussagen über das Verhalten stammen aus dem Code und den Dokumenten.
- **Bildwiederholrate** von Florians Fenster (B3): aus dem Projektgedächtnis, nicht geprüft.
- **Den Kern** (`packages/shape/src/dicht/`, `loeser/`) habe ich nur an einzelnen Stellen gelesen (Einflussfunktion, Dateiliste). Aussagen
  über den Löser stammen von der Planseite.
- **Quellen:** Blender-Seiten zum Ausrichten der Ansicht und Illustrators Buntstift habe ich nicht abgerufen. Plasticity/xNURBS und
  Gravity Sketch sind nicht belegt. Spore nur aus zweiter Hand. Dass Blenders „Elastic Deform“ auf den Kelvinlets beruht, steht in den
  Versionshinweisen zu 2.81, nicht auf der abgerufenen Handbuchseite.
- **Aufwände** sind Schätzungen ohne Kenntnis aller Sonderfälle im Fenster (Spiegel, Ringenden, Maul, Pose).

---

## Quellen

**Repo (gelesen):**
- `docs/research/2026-11-09-bilanz-wesen-editor.md`
- `docs/plans/2026-11-06-kurven-als-wahrheit.md` (Abschnitte 1–7, 11–18)
- `docs/research/2026-11-09-fibermesh-monstermash-richtung.md`
- `docs/plans/2026-10-22-klarstellungen.md`
- `docs/plans/2026-11-02-gegenpruefung-liniennetz.md` (Abschnitte 5 und 6)
- `docs/plans/2026-11-05-teile-konzept.md` (Kopf)
- `apps/editor/src/form/kurven.ts`, `apps/editor/kurven.html`, `apps/editor/src/form/form.css`
- `apps/editor/scripts/pruefen/form-greifen-probe.mjs`
- `packages/shape/src/dicht/kurven.ts:792–796`

**Forschung:**
- Nealen, Igarashi, Sorkine, Alexa: FiberMesh, SIGGRAPH 2007 — [PDF](https://www-ui.is.s.u-tokyo.ac.jp/~takeo/papers/fibermesh.pdf),
  [Projektseite](https://www-ui.is.s.u-tokyo.ac.jp/~takeo/research/fibermesh) (Abschnitte 2.1–2.4, 3, Ergebnisse im Original gelesen)
- de Goes, James: Regularized Kelvinlets, SIGGRAPH 2017 — [Pixar](https://graphics.pixar.com/library/Kelvinlets);
  [Sharp Kelvinlets](https://graphics.pixar.com/library/SharpKelvinlets)
- De Paoli, Singh: SecondSkin, SIGGRAPH 2015 — [Projektseite](https://www.dgp.toronto.edu/~depaolic/projects/secondSkin)
- Bae, Balakrishnan, Singh: ILoveSketch, UIST 2008 — [KAIST](https://sketch.kaist.ac.kr/publications/2008_uist_ilovesketch)
- Xu u. a.: True2Form, SIGGRAPH 2014 — [UBC](https://www.cs.ubc.ca/labs/imager/tr/2014/True2Form/index.htm)
- Yu u. a.: CASSIE, CHI 2021 — [Projektseite](https://em-yu.github.io/research/cassie)
- Li u. a.: BendSketch, SIGGRAPH 2017 — [Projektseite](https://haopan.github.io/bendsketch.html)
- Schmidt u. a.: ShapeShop, 2005 — [Eurographics](https://diglib.eg.org/items/5f1714ab-9e03-46f0-b7bb-96289a8b3ec2/full)
- Mori, Igarashi: Plushie, SIGGRAPH 2007 — [PDF](https://www-ui.is.s.u-tokyo.ac.jp/~takeo/papers/mori_siggraph2007_plushie.pdf)
- Dvorožňák u. a.: Monster Mash, SIGGRAPH Asia 2020 — [Projektseite](https://dcgi.fel.cvut.cz/home/sykorad/monster_mash)
- Boubekeur, Alexa: Phong Tessellation, 2008 — [Projektseite](https://www.telecom-paristech.fr/~boubek/papers/PhongTessellation/)
- Botsch, Kobbelt: An Intuitive Framework for Real-Time Freeform Modeling, 2004 —
  [RWTH](https://www.graphics.rwth-aachen.de/publication/03100/) (nur als Hintergrund gelesen, nicht verwendet)
- Stanko u. a.: Surfacing Curve Networks with Normal Control, 2016 — [HAL](https://hal.archives-ouvertes.fr/hal-01342465)
  (nur als Hintergrund)

**Produkte:**
- Blender: [Griffarten](https://docs.blender.org/manual/en/2.90/modeling/curves/structure.html),
  [O](https://docs.blender.org/manual/en/dev/editors/3dview/controls/proportional_editing.html),
  [Zahlen](https://docs.blender.org/manual/en/3.0/scene_layout/object/editing/transform/control/index.html),
  [fein und Raster](https://docs.blender.org/manual/en/3.0/scene_layout/object/editing/transform/control/precision.html),
  [Kante gleiten](https://docs.blender.org/manual/en/dev/modeling/meshes/editing/edge/edge_slide.html),
  [LoopTools](https://docs.blender.org/manual/en/4.1/addons/mesh/looptools.html),
  [Kurvenstift](https://docs.blender.org/manual/de/dev/modeling/curves_new/tools/pen.html),
  [Radius und Neigung](https://docs.blender.org/manual/en/4.1/modeling/curves/editing/control_points.html),
  [Elastic Deform](https://docs.blender.org/manual/en/dev/sculpt_paint/sculpting/brushes/elastic_deform.html),
  [Versionshinweise 2.81](https://wiki.blender.org/release_notes/2.81/sculpt/)
- Illustrator: [Krümmungswerkzeug](https://helpx.adobe.com/illustrator/using/curvature-tool.html),
  [Glätten](https://helpx.adobe.com/illustrator/using/tool-techniques/smooth-tool.html),
  [Vereinfachen](https://helpx.adobe.com/illustrator/desktop/draw-shapes-and-paths/modify-paths/simplify-paths-advanced-options-overview.html),
  [intelligente Hilfslinien](https://helpx.adobe.com/ph_fil/illustrator/desktop/measure-and-align/grids-and-guides/smart-guides-options.html)
- Figma: [Vector Networks](https://www.figma.com/blog/introducing-vector-networks/)
- Adobe Project Neo: [Übersicht](https://adobe.com/products/illustrator/2d-to-3d.html),
  [Hilfe](https://helpx.adobe.com/es/project-neo/help/overview.html)
- Womp: [Goop](https://www.womp.com/blogs/the-ultimate-guide-to-goop-liquid-3d-modeling-thats-changing-everything);
  Substance 3D Modeler: [Produktseite](https://www.adobe.com/products/substance3d/apps/modeler.html)
- Spore: [Anspielbericht](https://gamesradar.com/spore-creature-creator-hands-on),
  [Hecker, Liner Notes](https://www.chrishecker.com/My_Liner_Notes_for_Spore),
  [Gingold, Magic Crayons](https://www.gamedeveloper.com/game-platforms/gingold-talks-i-spore-i-s-magic-crayon-approach)
- ZBrush: [ZSpheres](https://help.maxon.net/zbp/en-us/Content/html/5_sculpting-and-painting_zsphere-essentials.html),
  [Adaptive Skin](https://help.maxon.net/zbr/en-us/Content/html/reference-guide/tool/zsphere/adaptive-skin/adaptive-skin.html),
  [Führungskurven, Drittquelle](https://novedge.com/blogs/design-news/zbrush-tip-zremesher-guide-curves-for-directed-edge-flow)
- Nomad Sculpt: [App Store](https://apps.apple.com/gb/app/nomad-sculpt/id1519508653)
- Rhino: [Krümmungsgraph](https://docs.mcneel.com/rhino/5/help/en-us/commands/curvaturegraph.htm),
  [Zebra](https://docs.mcneel.com/rhino/7/help/en-us/commands/zebra.htm)
- Schriftgestaltung: [Speed Punk](https://github.com/yanone/speedpunk), [Glyphs: Harmonisieren](https://glyphsapp.com/learn/harmonization),
  [Tunni-Linien](https://typedrawers.com/discussion/5101/smoothness-of-tunni-curves)
