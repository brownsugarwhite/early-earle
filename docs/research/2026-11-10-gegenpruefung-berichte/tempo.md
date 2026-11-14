# Gegenprüfung „Schnelle Löser für interaktive Geometrie“ (10.11.2026)

Auftrag: Für den Löser „aus den Kurven“ (`kurven.html`, Weg „nach der Geometrie“) klären, was die Fachliteratur und der Stand der
Browser-Technik gegen drei Dinge hergeben: Nachhinken im Zug bei einer Runde je Mausbewegung, Halte von 35–52 ms beim Verfeinern,
Zerlegen beim Greifen 0,1–0,35 s.

**Wie dieser Bericht zu lesen ist.** Ich habe den Code und die Planseite gelesen und Quellen im Netz gelesen. **Ich habe nichts
gemessen** (meine Aufgabe nennt keine Messskripte). Jede Aussage trägt eine Marke:
- **gelesen (Code)** mit Datei:Zeile im Arbeitsbaum `…/worktrees/form-zuerst`,
- **gelesen (Quelle)** mit URL,
- **gelesen (Planseite)** mit Abschnitt von `docs/plans/2026-11-06-kurven-als-wahrheit.md`,
- **gerechnet / vermutet**: von mir abgeleitet, nicht gemessen,
- **aus dem Gedächtnis**: nicht an einer Quelle nachgeprüft.

Die PDFs der Arbeiten ließen sich nur mit einem groben Textauszug lesen (Tabellen ja, Formeln nein).

## Kurzfassung

1. **Die klassischen Beschleuniger (Anderson, Tschebyschow, L-BFGS, BCQN) passen nicht auf diesen Löser.** Alle vier setzen eine
   Zielfunktion oder eine zusammenziehende Abbildung voraus und zahlen sich erst über viele Runden an *einem festen* Problem aus. Der
   Löser hier hat keine Zielfunktion, ungedämpft wächst sein Fehler (Planseite 12), und im Zug gibt es eine Runde je neuem Ziel.
   Anderson und Schwung sind auf der Planseite schon gemessen und verworfen (Abschnitte 12 und 9). Die Literatur bestätigt das Urteil.
2. **Mehrgitter, WebGPU und Modal-Reduktion lohnen bei 5 000–30 000 Punkten nicht.** Zwei Arbeiten mit Tabellen zeigen: Bei
   10 000–24 000 Punkten ist das Einsetzen in eine fertige Zerlegung 3- bis 12-mal schneller als Mehrgitter.
3. **Der größte Hebel liegt nicht in der Numerik, sondern im Ablauf** (im Code gelesen): Der Löser rechnet nur, wenn ein Mausereignis
   kommt; ruht die Maus bei gedrückter Taste, steht er, und der Rest wird beim Loslassen nachgeholt. Verdichten und Zeilenaufbau
   laufen im Hauptthread (das sind die 35–52 ms), ebenso das Vorrechnen der Zerlegung nach jedem Zug. Griff-Züge verfeinern im Zug gar
   nicht.
4. **Für mehr Runden je Bild** gibt es drei sichere Schritte, die die Form nicht ändern: nur eine Hälfte rechnen (Spiegelung, etwa
   2-mal), das Einsetzen straffen und nach WebAssembly bringen (Quellen: etwa 2-mal gegen JavaScript), beides zusammen etwa 3–4 Runden je
   Bild bei 5 200 Punkten (gerechnet).
5. **Eine Vorhersage im Griff-Raum** (lineare Antwort der Haut auf den gezogenen Punkt, eine Spalte beim Greifen) ist auf der Planseite
   nicht gemessen und billig zu prüfen.
6. Zwei Einschätzungen der Bilanz halte ich für zu günstig bzw. schon erledigt: „drei Spalten in einem Durchgang“ ist im Code schon so;
   „nativ 10- bis 30-mal schneller zerlegen“ stützen die Quellen nicht (eher 4–9-mal).

## 1. Der Löser heute, soweit er für das Tempo zählt (gelesen, Code)

**Eine Runde** (`packages/shape/src/dicht/ausKurven.ts:890–1093`, Weg `geometrie`):
1. Haut vermessen (Normalen, Laplace je Punkt): Zeile 899.
2. Intrinsische Triangulierung neu: Zeile 906; darauf Krümmung messen: 907.
3. Krümmung verteilen: konjugierte Gradienten, vorkonditioniert mit dem einmal zerlegten Laplace des Netzes, gestartet bei der letzten
   Lösung, Genauigkeit 10⁻³, höchstens 60 Schritte (`ausKurven.ts:810–887`); je Schritt ein Einsetzen mit einer Spalte (Zeilen 858, 876).
4. Rechte Seite bauen (932–1013), **ein** Einsetzen mit drei Spalten für die Lagen (1064).
5. Spiegelgleich mitteln (1073–1092).

**Die Matrix der Lagen** ist die Normalgleichung Σ g·aᵀa aus Laplace-Zeilen (Gewicht 1) und Bindungen (Gewicht 100)
(`ausKurven.ts:265–301, 357`; `loeser/zerlegung.ts:51–56`). Das ist ein quadrierter Laplace: etwa 19 statt 7 Einträge je Zeile
(Zahlen nach Botsch u. a. 2005; im Code nicht gezählt). Zerlegt wird Zeile für Zeile wie `cs_chol` (CSparse), geordnet mit einer
eigenen verschachtelten Zerlegung über Breitensuche (`zerlegung.ts:113–283, 335–443`).

**Zeiten laut Planseite** (nicht von mir gemessen): Runde 11–12,5 ms bei 5 200 Punkten, davon 6,2–6,6 ms Einsetzen der Lagen und
2,5–4,2 ms Verteilen der Krümmung (Abschnitt 18); Zerlegen 0,23 s bei 7 900, 0,5 s bei 15 400, 1,2 s bei 27 800 Punkten
(`zerlegung.ts:1–9`). Aus diesen drei Zahlen folgt ein Wachstum mit etwa n^1,3 (gerechnet).

**Das Fenster** (`apps/editor/src/form/kurven.ts`):
- Runden laufen **nur in `zugBewegen`**, also nur bei einem Mausereignis (2041–2098; Runden 2075–2078). Die Bildschleife zeichnet nur
  (3154–3160). Weitere Aufrufer von `schritt` sind das Loslassen (2305, vier Runden) und das Vorrechnen in der Ruhe (1459).
- Chrome liefert `pointermove` seit Version 60 gebündelt einmal vor jedem Bild
  ([Chrome-Blog](https://developer.chrome.com/blog/aligning-input-events)). „Eine Runde je Mausbewegung“ heißt also: eine Runde je Bild.
- Die Zeit „je Mausbewegung“ misst **nur den Löser** (2074–2080). Das Zeichnen danach (Haut mit Normalen in JavaScript 1020–1083, Bänder,
  drei Blätter, Status: 2094–2097) ist nicht in der Zahl.
- Verfeinern im Zug gibt es nur mit `gewichte=geometrie` **und nicht bei Griff-Zügen** (`!z.griff`, Zeile 2090).
- Beim Auslösen einer Verfeinerung arbeitet der Hauptthread: Zug neu aufsetzen, verdichten, einbetten, Zeilen bauen (2137–2165). Der
  Worker zerlegt nur (`zerlegen.worker.ts:7–13`).
- Nach jedem Loslassen plant `vorrechnenPlanen` 30 ms später im **Hauptthread**: neue Zerlegung, vier Runden, dann bis zu drei weitere
  Durchgänge „nachteilen → neu zerlegen → setzen“ (1448–1479). Jeder Durchgang zeigt sein Ergebnis.
- Die Matrix hängt nach der Geometrie an den Kantenlängen beim Anlegen (`ausKurven.ts:254–258`). Nach jedem Zug ist sie also neu; der
  Merker für gleiche Matrizen (`zerlegung.ts:19–21, 59–72`) greift dann nicht.

## 2. Antworten auf die sechs Fragen

### Frage 1: Beschleuniger für Runden mit fertig zerlegter Matrix

| Verfahren | Voraussetzung laut Quelle | Gewinn laut Quelle | Quelle |
| --- | --- | --- | --- |
| Anderson (Peng u. a. 2018) | Zielfunktion muss auswertbar sein; der beschleunigte Schritt gilt nur, wenn die Energie sinkt, sonst der normale Schritt; der Löser selbst muss die Energie in jeder Runde senken. Fenster m = 5. | „deutlich weniger Runden“, Zahlen nur in Bildern. Fern der Lösung „langsam oder Stillstand an falscher Lösung“ möglich. | [ar5iv 1805.05715](https://ar5iv.labs.arxiv.org/html/1805.05715) |
| Tschebyschow (Wang 2015) | Schätzwert ρ für das Zusammenziehen je Runde, von Hand eingestellt. Zu groß: Schwingen, nahe 1: läuft auseinander. Start um S = 10 Runden verzögert, dazu Unterrelaxation 0,9. | mindestens eine Größenordnung bei Projective Dynamics | [Wang 2015 (PDF)](https://wanghmin.github.io/publication/wang-2015-csi/Wang-2015-CSI.pdf) |
| L-BFGS mit Laplace-Zerlegung als Start (Liu u. a. 2017) | Energie, Gradient und Liniensuche (Armijo); ohne Liniensuche „kann die Simulation explodieren“. m = 5. | mehr als 10-mal schneller als ein Newton-Schritt; m = 2 etwa wie Tschebyschow | [ar5iv 1604.07378](https://ar5iv.labs.arxiv.org/html/1604.07378) |
| BCQN (Zhu u. a. 2018) | Energie, Gradient, Liniensuche; nur feste Lagebindungen | bis über 10-mal gegen AQP | [ar5iv 1705.00039](https://ar5iv.labs.arxiv.org/html/1705.00039) |

**Folgerung für uns:**
- Der Löser hat **keine Zielfunktion** (er löst je Runde „Soll-Krümmung minus gemessene Krümmung“, `ausKurven.ts:937–945`). Damit fehlt
  Anderson die Sicherung und L-BFGS/BCQN die Liniensuche.
- Ungedämpft zieht die Abbildung nicht zusammen: Der Fehler wächst je Runde um das 1,7-Fache bzw. schwingt mit −2,4 (Planseite 12). Die
  Dämpfung je Punkt (`ausKurven.ts:941`) macht sie erst stabil. Tschebyschow verlangt ρ < 1 und eine fast lineare Abbildung; die
  Dämpfung je Punkt ist keines von beidem.
- **Schon gemessen und verworfen:** Anderson (Planseite 12: „erst 0,02, dann schaukelt es sich wieder auf; mit Neustart … läuft der
  Löser auseinander“), Schwung (Planseite 9: „überschwingt bis 58“). Die Planseite sagt nicht, auf welcher Abbildung Anderson lief
  (gedämpft oder nicht, mit festen oder gemessenen Quellen); das lässt sich nachträglich nicht prüfen.
- **Fallstrick bewegte Ziele:** Keine der vier Arbeiten behandelt Ziele, die sich jede Runde ändern. Alle bauen ihre Wirkung aus der
  Geschichte von 5–10 Runden desselben Problems auf (Fenster m = 5; Tschebyschow startet erst nach 10 Runden). Bei einer Runde je Bild
  ist die Geschichte immer die eines anderen Problems (vermutet, aus den Voraussetzungen abgeleitet).
- **Urteil:** nicht noch einmal versuchen. Sinnvoll wäre es erst, wenn die Form als Minimum einer Energie gerechnet würde; der Versuch
  in diese Richtung („Krümmung mitgelöst“, Planseite 18) war 35-mal langsamer und nicht besser.

### Frage 2: Vorhersage

- **Vorab gerechnete Antworten sind in der interaktiven Verformung üblich.** Botsch & Kobbelt 2004 rechnen je Freiheitsgrad des Griffs
  eine „Basisfunktion“ vor und setzen je Bild nur noch zusammen: 35 000 Punkte im Bereich, Vorrechnen unter 15 s, 25 ms je Bild auf
  Hardware von 2004 ([PDF](https://graphics.rwth-aachen.de/media/papers/modeling1.pdf)).
- **Modal-Reduktion** (Hildebrandt u. a. 2011) erreicht 10 Bilder je Sekunde und mehr bei 130 000 Punkten, braucht aber eine Ruheform,
  eine Verformungsenergie und eine Vorrechnung (Schwingungsformen); ohne Reduktion sei bei 5 000–10 000 Punkten schon 1 Bild je Sekunde
  schwer ([Preprint](https://opus4.kobv.de/opus4-matheon/files/834/deformation_prep.pdf)). Bei uns gibt es keine Ruheform, und jede neue
  Linie würde die Basis entwerten. **Passt nicht.**
- **Sensitivität als Vorhersage, Simulation zieht nach:** „Sensitive Couture“ (Umetani u. a. 2011) arbeitet so (aus dem Gedächtnis; die
  Projektseite nennt das Verfahren nicht, [Seite](http://www.cs.columbia.edu/cg/SC/)). Die Startschätzung aus der letzten Bewegung ist in
  Projective Dynamics Standard (aus dem Gedächtnis).

**Was das für diesen Löser heißt (gelesen im Code, Folgerung von mir):**
- Die Bindungsziele gehen **linear** in die rechte Seite ein (`ausKurven.ts:992–1013`), und alle drei Koordinaten teilen eine Matrix
  (`zerlegung.ts:321`). Für ein Verschieben (G) oder einen Griff-Zug bewegt sich jede gebundene Probe um „Gewicht × Vektor“. Die lineare
  Antwort der ganzen Haut ist deshalb **ein Skalarfeld b = M⁻¹·(100·Cᵀs)**: eine einzige Spalte Einsetzen beim Greifen (Größenordnung
  2 ms), nicht drei. Für Skalieren und Drehen sind es vier Spalten.
- Damit kostet eine Vorhersage je Bild nur n Multiplikationen: Lagen += b · Mausschritt, **vor** der Runde. Die Runde misst dann die
  Krümmung an einer Haut, die die neuen Ziele schon erfüllt. Das entspricht einer zusätzlichen halben Runde ohne ihre Kosten.
- Eine zweite, noch billigere Stufe ist die Sekante im Griff-Raum: Lagen += (letzte Änderung der Haut) × (neuer Mausschritt, auf den
  letzten projiziert, durch dessen Länge). Steht die Maus, ist der Zuschlag null. Das unterscheidet sie vom verworfenen „Schwung“, der
  auch bei stehender Maus weiterschiebt.
- **Auf der Planseite gesucht:** In den Abschnitten 9–18 steht nur Schwung (9) und Anderson (12). Eine Vorhersage aus der Mausbewegung
  oder aus der linearen Antwort ist dort nicht gemessen.
- **Ehrlich:** Wie viel das bringt, weiß ich nicht. Im einfachen Modell (Fehler schrumpft je Runde auf ρ) verschwindet das Nachhinken
  bei gleichmäßigem Zug mit der Sekante ganz, dafür klingt eine Störung langsamer ab (√ρ statt ρ) und kann einmal überschwingen
  (gerechnet). Die Dämpfung je Punkt (Halbieren bei Vorzeichenwechsel) kann auf die Vorhersage anspringen. Das muss die Kern-Probe zeigen.

### Frage 3: Mehrgitter und Hierarchie

- **Botsch, Bommes, Kobbelt 2005** (Pentium 4, 3,0 GHz, TAUCS; drei rechte Seiten; [PDF](https://cgg.unibe.ch/media/papers/solvers1.pdf)):

  | Punkte | System | Cholesky: Zerlegen / 3 Lösungen | Mehrgitter: Aufbau / 3 Lösungen |
  | --- | --- | --- | --- |
  | 10 000 | Laplace | 0,14 s / 0,03 s | 0,65 s / 0,09 s |
  | 10 000 | Bi-Laplace | 0,35 s / 0,04 s | 0,65 s / 0,48 s |
  | 50 000 | Laplace | 1,00 s / 0,15 s | 4,00 s / 0,57 s |
  | 50 000 | Bi-Laplace | 2,82 s / 0,28 s | 4,05 s / 2,34 s |

  Ihr Urteil: Zählt die Zeit je Bild, sind die direkten Löser „klar überlegen“; beim Bi-Laplace ist der Abstand noch größer.
- **Shi u. a. 2006** (Pentium 4, 3,8 GHz; [PDF](https://i.cs.hku.hk/~yzyu/publication/multigrid_mesh-sig06.pdf)): Bei 24 188 freien
  Punkten braucht CHOLMOD 0,43 s zum Zerlegen und 0,03 s zum Einsetzen; ihr Mehrgitter 0,06 s Aufbau und 0,13 s bis 10⁻³. Mehrgitter
  schlägt die **Zerlegung**, nicht das Einsetzen. Erst bei sehr großen Netzen (ab etwa 100 000) dreht sich das. Ihre gröbste Stufe hat
  2 000–2 500 Punkte und wird direkt gelöst.
- **Folgerung:** Bei 5 000–30 000 Punkten liegt das ganze Netz ein bis zwei Stufen über dem, was Mehrgitter selbst direkt löst. Für die
  Runde (Einsetzen) bringt es nichts. Für die Zerlegung beim Greifen wäre ein iterativer Start denkbar, aber der quadrierte Laplace ist
  schlecht konditioniert (Botsch: der iterative Löser braucht bei 10 000 Punkten 0,44 s je drei Lösungen statt 0,04 s).
- **Kontrollnetz mit Unterteilungsfläche als Anzeige:** Das ist der Käfig-Weg, den das Projekt für die Form verlassen hat (Bilanz
  Abschnitt 5). Als reiner Rechentrick (grob lösen, fein nachziehen) wäre es ein Zweigitter-Verfahren; siehe oben, lohnt bei dieser
  Größe nicht.

### Frage 4: Zerlegungen wiederverwenden

- **Herholz & Alexa 2018 „Factor Once“:** Die Zerlegung des ganzen Netzes wird für Teilnetze mit Randbedingungen weiterverwendet; bis
  10-mal schneller als neu zerlegen, in ihren Versuchen nie langsamer ([Projektseite](https://phherholz.github.io/SigAsia2018/); nur
  Zusammenfassung gelesen, das PDF war zu groß).
- **Herholz & Sorkine-Hornung 2020:** Es werden nur die Spalten neu gerechnet, die im Eliminationsbaum von der Änderung abhängen
  (Teil-Zerlegung nach Hecht u. a. 2012). Beispiel mit etwa 100 000 Punkten: von Grund auf 410 ms, mit Update 24 ms. Unter 10 geänderten
  Spalten sind Rang-1-Updates besser. Grenzen laut Arbeit: **neue Punkte** sind bei allen Update-Verfahren die Schwachstelle; CHOLMOD kann
  eine Zeile nur einfügen, wenn dafür vorab eine leere Zeile angelegt wurde
  ([PDF](https://igl.ethz.ch/projects/sparse-cholesky-update/sparse-cholesky-update-paper.pdf)).
- **CHOLMOD** enthält Update/Downdate und wählt selbst zwischen zwei Bauarten: supernodal erst ab 40 Rechenschritten je Eintrag von L,
  sonst die einfache Zeile-für-Zeile-Bauart ([Quelltext cholmod_analyze](https://grok.dragonflybsd.org/xref/dports/math/suitesparse-ldl/SuiteSparse-5.10.1/CHOLMOD/Cholesky/cholmod_analyze.c?a=true)).
- **Was man im Browser bräuchte:** Eine fertige CHOLMOD-Fassung für WebAssembly habe ich nicht gefunden (gesucht; kein Treffer).
  CHOLMOD braucht für die supernodale Bauart BLAS/LAPACK. Der Code von Herholz baut auf CHOLMOD auf und ist nativ.
- **Folgerung für das Verfeinern im Zug:**
  - Die Halte von 35–52 ms kommen **nicht** vom Zerlegen (das läuft schon im Worker), sondern vom Verdichten (18–31 ms) und vom
    Zeilenaufbau (12–17 ms) im Hauptthread (Planseite 10; Code `kurven.ts:2137–2165`). Ein Update-Verfahren behebt sie nicht.
  - Ein Update könnte die 113–186 ms verkürzen, in denen auf dem alten, gestreckten Netz weitergezogen wird (Planseite 10).
  - Der passende Zuschnitt für die eigene Zerlegung: die Punkte um die gezogene Stelle **zuletzt** ordnen. Dann ändert Verfeinern dort
    nur den hinteren Block; die Zeile-für-Zeile-Bauart (`zerlegung.ts:241–280`) kann ab der ersten geänderten Zeile neu aufsetzen, neue
    Punkte kommen hinten dazu. Das ist dieselbe Idee wie bei Herholz (abhängige Spalten neu), ohne fremde Bibliothek. Aufwand eher
    2–4 Tage als einer; der Gewinn ist ungewiss, weil die obersten Trenner der verschachtelten Ordnung den größten Teil der Rechnung
    tragen (vermutet).

### Frage 5: Rechenkern im Browser

**Fertige Löser:**
- geometry-processing-js: Eigen über Emscripten (asm.js), dünn besetzte Cholesky-Zerlegung im Browser; „für viele Aufgaben in
  Schlagdistanz zu nativem Code“, ohne Zahlen ([GitHub](https://github.com/GeometryCollective/geometry-processing-js)).
- eigen-js: Teilmenge von Eigen 3.3.9 als WebAssembly; ob die dünn besetzten Löser dabei sind, steht nicht auf der Seite
  ([GitHub](https://github.com/BertrandBev/eigen-js)).
- faer (Rust): dünn besetzte Cholesky-Zerlegung mit Schwelle zwischen einfacher und supernodaler Bauart; WebAssembly nicht belegt
  ([docs.rs](https://docs.rs/faer-sparse)).
- Monster Mash baut seine Web-Fassung als C++ mit Emscripten ([GitHub](https://github.com/google/monster-mash)). Der Weg ist also für
  genau diese Art Werkzeug erprobt.
- CHOLMOD/SuiteSparse als WebAssembly: nichts Fertiges gefunden.

**Gemessene Vergleiche:**
- Dünn besetzte Matrix mal Vektor, 2 000 Matrizen (Sandhu, Herrera, Hendren 2018; Chrome 66, Firefox 59): JavaScript 2,2- bis 5,8-mal
  langsamer als C; WebAssembly in Firefox wie C, in Chrome etwa 2-mal langsamer; WebAssembly „mindestens 2-mal schneller als
  JavaScript“. In JavaScript war einfache Genauigkeit meist **langsamer** als doppelte
  ([Folien](https://speakerdeck.com/dherre3/sparse-matrices-on-the-web-characterizing-the-performance-and-optimal-format-selection-of-sparse-matrix-vector-multiplication-in-javascript-and-webassembly)).
- Allgemein (Jangda u. a. 2019, SPEC): WebAssembly im Mittel 45 % (Firefox) bis 55 % (Chrome) langsamer als nativ, im schlimmsten Fall
  2,1- bzw. 2,5-mal ([USENIX](https://www.usenix.org/conference/atc19/presentation/jangda)).
- **Für dünn besetzte Cholesky-Zerlegung in WebAssembly (mit oder ohne SIMD/Threads) habe ich keine gemessene Quelle gefunden.** Die
  Zahlen oben sind von 2018/2019; die Browser haben sich seitdem geändert.
- Threads im Browser brauchen „cross-origin isolation“; eine Arbeit von 2026 misst im Browser deshalb nur mit einem Thread
  ([ICMS 2026](https://icms-conference.org/2026/papers/paper77/main.pdf)). In Electron lässt sich das einstellen (aus dem Gedächtnis).

**Was realistisch ist (gerechnet / vermutet, zu messen):**
- **Die Bauart der eigenen Zerlegung ist für diese Größe die richtige.** CHOLMOD würde hier selbst die einfache Bauart wählen (Regel
  „unter 40 Rechenschritte je Eintrag“); der eigene Code ist dieselbe Bauart. Ein Wechsel auf „supernodal“ ist kein Hebel (vermutet;
  das Verhältnis für unsere Matrix ist nicht gemessen).
- **Vergleich über die Jahre:** Botsch 2005 zerlegt den Bi-Laplace mit 10 000 Punkten in 0,35 s und setzt drei Spalten in 0,04 s ein
  (Pentium 4). Der eigene JavaScript-Code liegt auf dem M3 hochgerechnet bei etwa 0,31 s und 14 ms. Das Einsetzen ist also 3-mal
  schneller als 2005, das Zerlegen kaum. Bei etwa 8- bis 12-mal schnellerer Hardware (aus dem Gedächtnis) hat das **Zerlegen mehr Luft
  (grob 4–9-mal) als das Einsetzen (grob 3-mal)**. Zweiter Anker: Herholz 2020 baut und löst ein Laplace-System mit 100 000 Punkten in
  410 ms; auf 8 000 Punkte und den quadrierten Laplace umgerechnet sind das etwa 50 ms gegen 230 ms heute.
- **WebAssembly:** Einsetzen etwa 1,5- bis 2,5-mal, Zerlegen 2- bis 3-mal gegen heute (aus den Quellen oben abgeleitet). SIMD kann beim
  Einsetzen die drei Spalten gemeinsam rechnen (der Mehrgitter-Löser bei Botsch nutzt SSE für bis zu vier rechte Seiten).
- **Die Bilanz nennt für ein natives Modul „Zerlegen 10- bis 30-mal, Runde 5- bis 10-mal“.** Das stützen die Quellen nicht; ich lese
  eher 4–9-mal und 3-mal heraus.
- **WebGPU für PCG oder Mehrgitter: nein.** Vorwärts- und Rückwärtseinsetzen sind „weitgehend sequentiell“ und auf der Grafikkarte
  langsamer als auf dem Prozessor (Wang 2015). Jacobi-artige Verfahren laufen dort gut, brauchen für den quadrierten Laplace aber sehr
  viele Schritte. Eine Messung für WebGPU bei 10 000 Unbekannten habe ich nicht gefunden.

### Frage 6: Sculpting-Programme und FiberMesh

- **SculptGL** ist JavaScript mit WebGL; dynamische Topologie arbeitet örtlich „in Echtzeit“, das Neuvernetzen nutzt Surface Nets
  ([Seite des Autors](https://stephaneginier.com/)). Ein Pinselstrich fasst nur die Punkte unter dem Pinsel an; es gibt keine Rechnung
  über die ganze Haut (aus dem Gedächtnis: Octree für die Suche, nur geänderte Stücke gehen an die Grafikkarte). **Nomad** ist die
  Nachfolge-App für iOS/Android mit Web-Demo und Desktop-Beta; zur Bauart sagen die Quellen nichts (C++ aus dem Gedächtnis).
- **Das Tempo dieser Programme kommt aus der Örtlichkeit, nicht aus einem schnellen Löser.** Es lässt sich deshalb nicht übertragen: Eine
  Haut, die sich aus Linien „so rund wie möglich“ rechnet, ist ihrem Wesen nach eine Rechnung über die ganze Haut (oder einen Bereich
  mit Rand).
- **FiberMesh** (Nealen u. a. 2007, [PDF](https://www-ui.is.s.u-tokyo.ac.jp/~takeo/papers/fibermesh.pdf)): Java, der Löser nativ über
  JNI; 600–2 000 Punkte bei 10–15 Bildern je Sekunde auf einem Pentium M mit 1 GHz; 5–10 Runden bis zur Ruhe; einmal zerlegen, dann nur
  einsetzen; **neu vernetzt wird erst nach dem Loslassen**, weil sonst neu zerlegt werden müsste; für größere Netze schlagen sie vor,
  nur einen Teil zu bearbeiten. Die Netz-unabhängige Variante (Willmore) war ihnen „deutlich zu langsam“ und ohne Normalen instabil.
  FiberMesh hat das Problem also nicht gelöst, sondern klein gehalten (deckt sich mit der Recherche vom 09.11.).
- **Nachbauten von FiberMesh** mit Tempo-Angaben habe ich nicht gefunden.

## 3. Wie viele Runden je Bild es braucht (gerechnet)

Modell: Der Abstand zur fertigen Form schrumpft je Runde auf das ρ-Fache; die Planseite nennt am Ohr 0,65–0,77 (Abschnitt 10). Bei
gleichmäßigem Zug und k Runden je Mausschritt bleibt die Haut um ρ^k / (1 − ρ^k) Mausschritte zurück.

| Runden je Bild | Rückstand in Mausschritten (ρ = 0,7) | Ohr, hochgerechnet aus 2,41 Einheiten |
| --- | --- | --- |
| 1 (heute) | 2,33 | 2,41 (2,1 px) |
| 2 | 0,96 | ≈ 1,0 (0,9 px) |
| 3 | 0,52 | ≈ 0,54 (0,5 px) |
| 4 | 0,32 | ≈ 0,33 (0,3 px) |

Für das Kriterium „½ Bildpunkt“ braucht es also 3–4 Runden je Bild: **Runde ≤ 4–5 ms bei 60 Bildern je Sekunde**. Auf einem
120-Hz-Bildschirm kommt ein Mausereignis alle 8,3 ms; dort passt schon heute keine ganze Runde samt Zeichnen in ein Bild (vermutet: ein
Grund für „stockt“). Das Modell ist grob: Die Dämpfung je Punkt ist nicht linear.

## 4. Rangliste für genau dieses Problem

### 1. Rechnen vom Mausereignis lösen, alles Schwere in den Worker

- **Was:** (a) Solange gezogen wird, rechnet der Löser weiter, auch wenn die Maus ruht (zuerst im Bildtakt, später im Worker).
  (b) Verdichten, Einbetten und Zeilenaufbau ziehen zum Zerlegen in den Worker. (c) Das Vorrechnen nach dem Loslassen samt den bis zu
  drei Nachteil-Durchgängen ebenfalls. (d) Griff-Züge verfeinern im Zug wie Punkt-Züge. (e) Die Zeit je Bild einmal ganz messen
  (Löser plus Zeichnen).
- **Gewinn:** Halte 35–52 ms → nur noch das Einwechseln (4–9 ms, Planseite 10). Kein gesperrtes Fenster 30 ms nach jedem Zug. Was beim
  Loslassen noch nachrückt, rückt schon nach, während die Hand ruht. Gegen das Nachhinken *in der Bewegung* hilft es nur, soweit das
  Zeichnen heute Runden verdrängt.
- **Beleg:** Code `kurven.ts:2041–2098, 2137–2165, 1448–1479, 2090, 3154–3160`; Planseite 10 („könnte ebenfalls in den Worker“).
- **Risiko:** klein bis mittel. Zwei Stände (Fenster, Worker) müssen zusammenpassen; ein Zug, der während eines Auftrags endet, muss
  ihn sauber verwerfen (das Muster gibt es schon, `kurven.ts:2259–2264, 2296–2297`). Gemeinsamer Speicher zwischen Fenster und Worker
  braucht „cross-origin isolation“; ohne ihn werden die Lagen je Bild kopiert (bei 5 200 Punkten 125 KB, unkritisch).
- **Ein-Tages-Experiment:** Nur Teil (a): In der Bildschleife eine Runde rechnen, wenn ein Zug läuft und in diesem Bild kein
  Mausereignis kam. Mit `form-loslassen-probe.mjs` (Ohr, Rüssel, Hals) und `form-drei-faelle.mjs` (Hörner) je einmal sofort loslassen
  und einmal nach 150 ms Halten. Maß: größte Verschiebung in den Endrunden (wird schon erfasst, `kurven.ts:2303–2308`) und Bewegung nach
  dem Loslassen. Erwartung: nach dem Halten nahe null.

### 2. Nur eine Hälfte rechnen (Spiegelung im Löser)

- **Was:** Die Unbekannten der linken Hälfte durch ihre Spiegelpartner ersetzen. Für x und y entsteht ein „gleichsinniges“ System, für
  z ein „gegensinniges“ ohne die Punkte der Mittelebene. Beide haben etwa halb so viele Unbekannte. Das Netz selbst bleibt, wie es ist.
- **Gewinn (gerechnet aus dem Wachstum n^1,2–1,3 bei Botsch und im eigenen Code):** Einsetzen der Lagen etwa 2,2-mal schneller
  (6,4 → ≈ 3 ms), Verteilen der Krümmung etwa 2-mal; Runde 11–12 → ≈ 6 ms. Zerlegen: zwei halbe Systeme, zusammen etwa 0,8 der
  heutigen Zeit, in zwei Workern etwa 2,5-mal schneller.
- **Beleg:** Der Löser mittelt heute nach jeder Runde spiegelgleich (`ausKurven.ts:1073–1092`). Sind Netz, Gewichte und Bindungen
  spiegelgleich, ist die gefaltete Rechnung dieselbe Lösung (Spiegelung und Matrix vertauschen). Sind die Bindungen es nicht, ist die
  gefaltete Rechnung der saubere Ausgleich im spiegelgleichen Raum statt „lösen, dann mitteln“. Bilanz Abschnitt 4, Punkt 7 nennt die
  halbe Haut schon als Vereinfachung, beziffert sie aber nicht.
- **Risiko:** mittel. Zeilen an der Mittelebene; ob alle Bindungen spiegelgleich vorliegen, habe ich nicht geprüft. Entscheidung 3 der
  Bilanz (Grundform immer symmetrisch) ist Voraussetzung; Posen laufen über den anderen Löser.
- **Ein-Tages-Experiment (nur Zählen):** Kern-Skript, das aus den vorhandenen Zeilen das gefaltete Zeilenpaar baut. Maße: Einträge von L
  (`huelle`, `zerlegung.ts:324`) ganz gegen halb; Unterschied der Lösung gegen „ganz lösen + mitteln“ (soll ≤ 10⁻⁹ sein); Runden bis zur
  Ruhe unverändert.

### 3. Einsetzen straffen: erst zählen, dann JavaScript, dann WebAssembly

- **Was:** (a) Zählen: Einträge von L je Unbekannte gegen eine Ordnung nach kleinstem Grad (Botsch nennt für 5 000 Punkte Laplace
  104 000–106 000 Einträge, also etwa 21 je Zeile; für den quadrierten Laplace ist das 2,5- bis 3-Fache zu erwarten). Liegt der eigene
  Wert deutlich darüber, ist die Ordnung der billigste Hebel für Zerlegen **und** Einsetzen. (b) Die Schleife für drei Spalten fest
  ausschreiben und die Felder nicht je Lösung neu anlegen (`zerlegung.ts:289–320`: innere Schleife über variables k, zwei neue Felder
  je Aufruf; das Verteilen der Krümmung ruft das je Runde 3–4-mal, `ausKurven.ts:858, 876`). (c) Dieselben 30 Zeilen als WebAssembly,
  mit SIMD über die Spalten.
- **Gewinn:** (b) unbekannt, vermutlich 1,2–1,5-mal; (c) laut Quellen etwa 2-mal gegen JavaScript (Stand 2018). Zusammen mit Maßnahme 2:
  Runde ≈ 3,5–4,5 ms, also 3–4 Runden je Bild (gerechnet).
- **Beleg:** Sandhu u. a. 2018, Jangda u. a. 2019, Botsch u. a. 2005 (oben); Monster Mash und geometry-processing-js als Vorbilder für
  den Bauweg.
- **Risiko:** mittel. Die Zahlen sind alt; auf dem M3 mit heutigem Chrome kann der Abstand kleiner sein. Deshalb erst nur das Einsetzen
  portieren und messen, bevor der ganze Kern umzieht.
- **Ein-Tages-Experiment:** `einsetzen` allein nach WebAssembly (Rust, C oder AssemblyScript), die Felder Lp/Li/Lx einmal je Zerlegung
  hinüberkopieren. Maß: Lösungen je Sekunde auf den Zerlegungen von 5 200 und 27 800 Punkten, JavaScript gegen WebAssembly im selben
  Lauf abwechselnd (Verhältnis, nicht Zeit). Abbruch: unter 1,5-mal lohnt der Umzug nicht.
- **Hinweis zur Bilanz:** „Drei Spalten in einem Durchgang lösen“ (Bilanz Abschnitt 6) ist schon so gebaut (`zerlegung.ts:311–321`).
  Daraus kommt kein Gewinn mehr.

### 4. Vorhersage im Griff-Raum

- **Was:** Beim Greifen eine Spalte einsetzen (lineare Antwort b, Frage 2). Je Bild vor der Runde: Lagen += b · Mausschritt. Zweite
  Stufe: Sekante aus dem letzten Schritt.
- **Gewinn:** unbekannt. Im Modell wirkt sie wie eine zusätzliche halbe bis ganze Runde je Bild, ohne deren Kosten.
- **Beleg:** Botsch & Kobbelt 2004 (vorab gerechnete Antwort je Freiheitsgrad des Griffs); Code: Ziele gehen linear ein
  (`ausKurven.ts:992–1013`), eine Matrix für alle Koordinaten (`zerlegung.ts:321`). Auf der Planseite nicht gemessen.
- **Risiko:** mittel. Die Dämpfung je Punkt kann auf die Vorhersage reagieren; die Sekante kann bei einer Richtungsumkehr einmal
  überschwingen. Bei weiten Zügen ändert sich die Antwort; nach jedem Einwechseln ist b neu zu rechnen (eine Spalte).
- **Ein-Tages-Experiment:** In `form-netzunabhaengig.ts` (eine Runde je Schritt, wie im Fenster) vor jeder Runde vorhersagen. Maße:
  Nachhinken an Ohr, Rüssel, Hals; dazu ein Halt mitten im Zug (schwingt es über?) und eine Umkehr. Abbruch: Wird ein Fall schlechter
  oder schwingt es über, weg damit.

### 5. Teil-Zerlegung beim Verfeinern (gezogene Stelle zuletzt ordnen)

- **Was:** siehe Frage 4. Nur der hintere Block wird neu zerlegt, wenn dort verfeinert wird.
- **Gewinn:** Die 113–186 ms auf dem alten Netz könnten deutlich kürzer werden. Die Halte behebt es nicht (das tut Maßnahme 1).
- **Beleg:** Herholz & Alexa 2018, Herholz & Sorkine-Hornung 2020 (410 → 24 ms bei 100 000 Punkten, andere Aufgabe).
- **Risiko:** hoch. Eigene Numerik, mehr als ein Tag; der Gewinn hängt davon ab, wie viel der Rechnung in den obersten Trennern liegt.
- **Ein-Tages-Experiment (nur Zählen):** Für einen aufgezeichneten Verfeinerungsschritt die berührten Punkte samt zwei Nachbarringen
  zuletzt ordnen und zählen: Anteil der Einträge und der Rechenschritte von L in diesen Zeilen, und wie viel Füllung die erzwungene
  Ordnung kostet. Liegt der Anteil über einem Drittel, lohnt es nicht.

### Nicht in der Rangliste (geprüft, nicht empfohlen)

| Idee | Grund |
| --- | --- |
| Anderson, Tschebyschow, L-BFGS, BCQN | keine Zielfunktion, ungedämpft nicht zusammenziehend, eine Runde je Ziel; Planseite 9 und 12 gemessen |
| Mehrgitter für die Runde | bei 10 000–24 000 Punkten 3- bis 12-mal langsamer als Einsetzen (Botsch 2005, Shi 2006) |
| WebGPU | Einsetzen ist sequentiell (Wang 2015); keine Messung bei dieser Größe gefunden |
| Modal-Reduktion, vorab gerechnete Basen als Ersatz für den Löser | braucht Ruheform, Energie und Vorrechnung (Hildebrandt 2011); die rechte Seite ändert sich hier jede Runde ganz |
| Supernodale Zerlegung, CHOLMOD im Browser | für diese Größe wählt CHOLMOD selbst die einfache Bauart; keine fertige WebAssembly-Fassung gefunden |
| Natives Modul jetzt | die Quellen stützen 4–9-mal beim Zerlegen und etwa 3-mal beim Einsetzen, nicht 10–30-mal; erst Maßnahmen 1–3 messen |
| Andere Matrix für die Lagen (einfacher Laplace mit harten Bindungen statt quadriertem) | wäre laut Botsch 2,5-mal billiger zu zerlegen und 1,3–1,9-mal billiger einzusetzen; aber zwei Matrix-Wechsel haben das Nachhinken gemessen vergrößert (Planseite 12 und 18). Nicht ohne neuen Grund anfassen. |

## 5. Was ich nicht prüfen konnte

- Keine eigene Messung: alle Zeiten stammen von der Planseite, alle Gewinne sind gerechnet oder aus Quellen übertragen.
- Wie viele Einträge L heute hat (`huelle`), wie gut also die eigene Ordnung ist.
- Was das Zeichnen je Mausbewegung kostet (es ist in keiner Zahl der Planseite enthalten, soweit ich gelesen habe).
- Ob alle Bindungen spiegelgleich vorliegen (Voraussetzung für die exakte Gleichheit in Maßnahme 2).
- Auf welcher Abbildung Anderson in Abschnitt 12 lief.
- Herholz & Alexa 2018 nur als Zusammenfassung; Sensitive Couture und die Bauart von Nomad/SculptGL nur aus dem Gedächtnis.
- Ob Florians Bildschirm mit 120 Hz läuft (das Projektgedächtnis nennt „M3 Pro/120Hz“).
- Der Standard-Löser (gleiche Gewichte) war nicht mein Thema: Sein Sprung nach dem Loslassen kommt aus dem Maß (Planseite 17), nicht aus
  dem Tempo. Alle Maßnahmen oben wirken nur zusammen mit dem Weg „nach der Geometrie“.

## 6. Quellen

- Peng, Deng, Zhang, Geng, Qin, Liu 2018, Anderson Acceleration for Geometry Optimization and Physics Simulation: https://ar5iv.labs.arxiv.org/html/1805.05715
- Wang 2015, A Chebyshev Semi-Iterative Approach for Accelerating Projective and Position-based Dynamics: https://wanghmin.github.io/publication/wang-2015-csi/Wang-2015-CSI.pdf
- Liu, Bouaziz, Kavan 2017, Quasi-Newton Methods for Real-Time Simulation of Hyperelastic Materials: https://ar5iv.labs.arxiv.org/html/1604.07378
- Zhu, Bridson, Kaufman 2018, Blended Cured Quasi-Newton for Distortion Optimization: https://ar5iv.labs.arxiv.org/html/1705.00039
- Botsch, Bommes, Kobbelt 2005, Efficient Linear System Solvers for Mesh Processing: https://cgg.unibe.ch/media/papers/solvers1.pdf
- Shi, Yu, Bell, Feng 2006, A Fast Multigrid Algorithm for Mesh Deformation: https://i.cs.hku.hk/~yzyu/publication/multigrid_mesh-sig06.pdf
- Botsch, Kobbelt 2004, An Intuitive Framework for Real-Time Freeform Modeling: https://graphics.rwth-aachen.de/media/papers/modeling1.pdf
- Hildebrandt, Schulz, von Tycowicz, Polthier 2011, Interactive Surface Modeling using Modal Analysis: https://opus4.kobv.de/opus4-matheon/files/834/deformation_prep.pdf
- Herholz, Alexa 2018, Factor Once: https://phherholz.github.io/SigAsia2018/
- Herholz, Sorkine-Hornung 2020, Sparse Cholesky Updates for Interactive Mesh Parameterization: https://igl.ethz.ch/projects/sparse-cholesky-update/sparse-cholesky-update-paper.pdf
- CHOLMOD, Wahl der Bauart (cholmod_analyze): https://grok.dragonflybsd.org/xref/dports/math/suitesparse-ldl/SuiteSparse-5.10.1/CHOLMOD/Cholesky/cholmod_analyze.c?a=true
- Sandhu, Herrera, Hendren 2018, Sparse matrices on the web (Folien): https://speakerdeck.com/dherre3/sparse-matrices-on-the-web-characterizing-the-performance-and-optimal-format-selection-of-sparse-matrix-vector-multiplication-in-javascript-and-webassembly
- Jangda, Powers, Berger, Guha 2019, Not So Fast: https://www.usenix.org/conference/atc19/presentation/jangda
- Chrome, Aligned input events: https://developer.chrome.com/blog/aligning-input-events
- geometry-processing-js: https://github.com/GeometryCollective/geometry-processing-js
- eigen-js: https://github.com/BertrandBev/eigen-js
- faer-sparse: https://docs.rs/faer-sparse
- Monster Mash (Quelltext, Bau mit Emscripten): https://github.com/google/monster-mash
- SculptGL / Nomad (Seite des Autors): https://stephaneginier.com/
- Nealen, Igarashi, Sorkine, Alexa 2007, FiberMesh: https://www-ui.is.s.u-tokyo.ac.jp/~takeo/papers/fibermesh.pdf
- Pham 2026, WebAssembly for browser-based scientific computing (ICMS): https://icms-conference.org/2026/papers/paper77/main.pdf
- Umetani, Kaufman, Igarashi, Grinspun 2011, Sensitive Couture (Projektseite): http://www.cs.columbia.edu/cg/SC/
