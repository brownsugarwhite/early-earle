# Feldnetz oder Kernring? Ehrliche Antwort zum Maul-Einsatz (Recherche 21.10.2026, abends)

> Florians Zwischenfrage (21.10. abends): „Ich bin seit Tagen mit der Optimierung von Mesh und Linien und neuen Funktionen
> im Editor beschäftigt und es geht alles sehr sehr langsam. Eine Nebensession hat jetzt gerade eine scheinbar elegantere
> Alternative vorgeschlagen: […] ein feldgesteuertes Vierecksnetz […] Vorbild ist QuadWild. […] Unser Weg wirkt auf mich
> durch die vielen Sonderregeln gerade auch nicht mehr sehr elegant, was absolute Grundvoraussetzung ist. Was ist die
> schönste, beste und eleganteste Lösung? […] Sag mir ehrlich, ob die alternative Lösung besser wäre und warum und wie lange
> der Umbau dauern würde. Die Zielsetzung des Planes für den Editor bleibt.“
>
> Gelesen: die Pläne zum Editor vom 13. bis 21.10. (Wesen-Editor 2, Phase 1/2, Maul als Einsatz samt Entwurf, Liniennetz,
> Vektorillustration, Fortsetzung Teil A), Kritik-Register, Übergabe, Code und Verlauf von Teil A
> (`packages/shape/src/kern/einsatz/`) und das Gespräch in der Nebensession. Recherchiert wurden feldgesteuerte und
> musterbasierte Vierecksnetze; die Quellen stehen am Ende. Kein Code geändert.

## Kurzantwort

1. **Die Richtung der Nebensession stimmt.** Ein Netz, das sich nach Linien richtet und seine Pole selbst setzt, ist besser und
   eleganter als der Kernring. Unsere Sonderregeln sind von Hand gebaute Einzelfälle davon. Die Ursache ist eine einzige frühe
   Entscheidung: Der Kernring legt das ganze halbe Maulfeld auf **ein** Rechteck (Abschnitt 1).
2. **Die eleganteste Fassung für uns ist aber schlanker als QuadWild, nämlich ohne Richtungsfeld.** Ein Richtungsfeld braucht
   man, um Linien erst zu finden. Unsere Linien kennen wir: Maullinie, Naht, Feldrand und Falten von A0. Sie zerlegen das Feld
   in Stücke. Ganzzahlen legen die Kantenzahlen fest, der Feldrand bleibt dabei fest wie bei QuadMixer (2019). Jedes Stück wird
   nach einem bewiesenen Muster gefüllt (Takayama 2014), mit so wenigen Polen wie nötig. Das ist der Kern von QuadWild ohne
   seinen empfindlichsten Teil; ich nenne es hier **Stücknetz** (Abschnitt 2).
3. **Der Mundwinkel wird dabei von selbst regulär.** Die Maullinie läuft über den Mundwinkel hinaus bis zum Feldrand weiter, wie
   bei den „zwei Rechtecken“ aus E1. Die sind damals nur an den Kantenzahlen gescheitert (1–6 Lippenspalten), und genau die
   lösen die Muster (Abschnitt 2).
4. **Nicht jetzt für den ganzen Körper.** Dort trägt das Raster aus Ringen und Reihen die Umrisse, Spanten und Loops selbst.
   Seine Sonderstücke (Kappen, Kragen, Fenster, Treppe) sind aber dieselbe Art Problem und kommen später an dieselbe Maschine
   (Abschnitte 3 und 4).
5. **Zielbild:** Das Liniennetz ist das Netz. Was du zeichnest, ist eine Linie; die Linien zerlegen die Haut in Stücke, und
   jedes Stück wird nach Muster gefüllt. Auch das Raster des Körpers ist nur ein solches Netz aus Ringen und Reihen
   (Abschnitt 4).
6. **Aufwand (geschätzt, nicht gemessen):** Beweis 3–5 Arbeitstage, bis zum heutigen Stand der Tore an allen 43 Fällen insgesamt
   etwa 2–3 Wochen. Ein volles Richtungsfeld-Verfahren käme auf etwa das Doppelte und wäre unsteter. Editor, Öffnen, Kiefer und
   Zähne (E3–E6) kosten bei jedem Weg gleich viel (Abschnitt 5).
7. **Empfehlung:** Den Kernring jetzt einfrieren und keine weitere Sonderregel mehr bauen. Danach ein zeitlich begrenzter Beweis
   „Stücknetz im Maulfeld“ an den schwersten Fällen, mit harten Kriterien. Umgestellt wird nur, wenn er gewinnt (Abschnitt 6).

## 1. Was heute gebaut ist und warum es sich nach Flickwerk anfühlt

**Stand (aus Code und Verlauf):**
- Teil A liegt nur im Kern. Im Editor baut ein Maul weiter den alten Maulbau (`ableitenMitMaul`); E3/E4 stehen nur im Plan.
- `kern/einsatz/`: 12 Quelldateien mit 5 980 Zeilen und 960 Zeilen Tests, dazu Prüffall und Skripte. Speziell für den
  Kernring sind rund 2 700 Zeilen (Gitter, Lage und Zusammenbau in `topologie.ts`; die Leiter allein etwa 1 200 Zeilen), dazu
  gut 1 000 Zeilen Versuche (zwei Rechtecke, Band). Allgemein und weiter brauchbar sind Linie auf A0, Verfeinerung, Feldwahl,
  Karte aus Randstücken, Lippe, Haut lösen und Messen (etwa 2 200 Zeilen).
- 47 Optionen. Gut 20 davon sind Sonderregeln für bestimmte Lagen: Leiter 7, Mundwinkel 4, J-Linien und Stufennaht 3,
  Feldform 3, Naht, Spitzen, Silhouette, dazu Lippenecken, die die Topologie selbst setzt. Hinzu kommen etwa 15 feste
  Sonderregeln ohne Schalter.
- Gebaut in zwei Anläufen: A1–A7 in der Nacht 15./16.10., E1–E2.6 am 21.10. in vier Sitzungen. Das sind 19 Commits mit rund
  7 500 Zeilen. Dazu kommen über 30 gemessene und wieder verworfene Varianten (Listen auf der Planseite 21.10.).
- Ergebnis: Mundwinkel-Tor 43 von 43, Haut-Tor 41 von 43. Offen sind Rex mittel gerade (eine Falte kreuzt die Linie) und
  Robbe hoch J (Engstelle unter der Kopfnaht).

**Die Ursache:** Der Kernring legt das halbe Maulfeld mit einer harmonischen Karte auf ein einziges Rechteck
(`einsatz/karte.ts`). Der ganze Schlitz (Oberlippe, Mundwinkel, Unterlippe) wird eine Seite, der Feldrand die
gegenüberliegende, die Naht oben und unten die beiden anderen. Reihen und Speichen sind die Gitterlinien dieses Rechtecks. Das
hat drei mathematische Folgen, die kein Feinschliff behebt:
1. **Mundwinkel:** Um den Mundwinkel herum liegt ein voller Winkel von 360°, im Rechteck wird daraus eine gerade Kante (180°).
   Die Karte muss dort wie eine Wurzel aufbiegen; auf der Haut wächst alles mit dem Quadrat des Kartenabstands (Planseite E1:
   „Haut ∝ ζ²“). Jedes Gitter, das in der Karte regelmäßig ist, wird dort auf der Haut verzogen. Das stand schon im Code
   (`band.ts`: „Beides lässt sich in der Karte nicht reparieren“), gebaut wurde trotzdem weiter im Rechteck.
2. **Schmale Streifen:** Eine solche Karte staucht lange, schmale Stücke exponentiell zusammen; in der Mathematik heißt das
   „Crowding“. Bei Robbe hoch beträgt die Stauchung 1,9·10⁻³ bzw. 9,9·10⁻⁶.
3. **Merkmale im Innern:** Ein Rechteck kennt nur seine vier Ecken. Falten und Spitzen von A0 im Feld sind darin keine
   Gitterlinien. Sie gehen verloren oder brauchen eine eigene Konstruktion.

**Fast jede Sonderregel gleicht eine dieser drei Folgen aus:**

| Sonderregel (heute Standard) | gleicht aus | im Stücknetz |
|---|---|---|
| Auffaltung um c (ζ′ = √(ζ² − x_c)), zwei Tutte-Stufen mit Stufennaht | 1 Mundwinkel | entfällt: c liegt mitten auf einer geraden Stückseite (Lippe und Verlängerung), die Zellen werden von selbst etwa gleich große Quadrate |
| Fächer als Halbkreis, letzte Lippenspanne 0,15 Feldkante | 1 | entfällt |
| Nahtausgleich, Ausgleich außen (6 Runden) | 1 und 2 (Verdrehung an J-Linien, Stauchung am Feldrand) | entfällt: Jedes Stück hat seine eigene Karte, ein Muster nimmt die Unterschiede der Kantenzahlen auf |
| Naht nach Bogenlänge auf umparametrisierter Karte, Nahtspeichen auf Kartenlinien | 2 (Stauchung an der Naht) | entfällt |
| Feld gekappt bei 1,5 Radien | 1 und 2 (große Felder verzerren) | Feldwahl bleibt, die Feldform verzerrt aber nichts mehr |
| Spitzen von A0 als Nahtpunkt oder Lippenecke | 3 | allgemein: Spitzen sind Ecken von Stücken |
| Leiter (Falte oder Keil erkennen, Feld teilen, Leiterkarte, Dreier- und Fünferpol, m = M − 2 + (q − 1)/2) | 2 und 3 | entsteht von selbst: Die Falte ist eine Stückgrenze; der Streifen ist ein Stück mit ungleichen Gegenseiten, und dessen Muster setzt ein Dreier-Fünfer-Paar wie die Leiter |
| geplant: zwei Leitern hintereinander, Falten neben dem Maul, P-Linien am Maul, Loops durchs Feld, Mäuler ohne Naht, Plattenmaul (Tiger), Rundmaul | dieselben drei | dieselbe Maschine, keine neue Regel |

Daran sieht man auch, warum es zuletzt so langsam ging: Jede neue Lage (Falte, Keil, Engstelle) brauchte eine neue
Konstruktion und danach eine neue Runde Messungen an 43 Fällen. Das Muster stand schon in der Bilanz vom 13.10. (Ursache 1:
„jede Sonderregel zerstörte eine andere“) und ist im Maul wiedergekommen.

**Warum wir den Weg nicht gleich genommen haben** (ehrlich, aus den Akten): Die Bilanz vom 13.10. hatte „Topologie automatisch:
ja, nach dem Vorbild ‚ZRemesher mit Führungslinien‘“ sogar zugesagt. Am selben Tag wurde ein Netz, das entlang der Linien neu
entsteht, aber für den **ganzen Körper** zurückgestellt (Recherche „Schnitte und Überhänge“: „wechselt bei jeder Bearbeitung die
Topologie“). Für den ständig bearbeiteten Körper war das richtig. Beim Maul-Einsatz (örtlich, einmal erzeugt, dann eingefroren)
gilt der Einwand nicht; die Entscheidung wurde am 15.10. unbesehen mitgenommen. Der Entwurf vom 15.10. hielt die Wurzelstelle
am Mundwinkel sogar für einen Vorteil („von selbst die elliptischen Mundschleifen“). Getragen hat das nicht: Zuerst faltete die
Haut am Mundwinkel (A7, 16.10.), dann lag das Gitter um c verzerrt (E1, 21.10.). Ab da wurde die Karte geflickt statt ersetzt.
Die „zwei Rechtecke“ (E1, morgens) hatten am Mundwinkel schon die richtige Topologie, scheiterten aber an den Kantenzahlen,
und dafür gab es damals kein Werkzeug.

## 2. Der elegantere Weg: Stücke aus den Linien, gefüllt nach Mustern

**In vier Schritten** (für das halbe Feld; die andere Hälfte ist das Spiegelbild):
1. **Linien → Stücke.** Feldrand, Naht, Maullinie samt ihrer Verlängerung vom Mundwinkel bis zum Feldrand und die Falten von A0
   zerlegen das Feld in Stücke. Ecken liegen dort, wo eine Grenze deutlich abknickt (bei QuadMixer ab etwa 22°); für sehr
   spitze Winkel gilt eine eigene, allgemeine Regel. Konkave Stücke werden an der Innenecke geteilt.
2. **Ganzzahlen.** Je Stückseite wird eine Kantenzahl gewählt. Die Seiten am Feldrand liegen fest (wie außen), Ober- und
   Unterlippe sind gleich, jede Seite hat mindestens eine Kante, und die Summe je Stück ist gerade. Sonst gilt: so nah wie möglich
   an der gewünschten Kantenlänge und so wenige Pole wie möglich. Bei uns sind das einige Dutzend ganze Zahlen; eine kleine
   Suche löst das genau.
3. **Muster.** Jedes Stück mit 2 bis 6 Seiten lässt sich bei jeder gültigen Kantenzahl mit Vierecken füllen. Das ist bewiesen
   (Takayama, Panozzo, Sorkine-Hornung 2014), mit der kleinsten Zahl an Polen. Für Stücke mit nur einem Pol gibt es sogar eine
   geschlossene Formel (Tarini 2022). Haben gegenüberliegende Seiten verschiedene Zahlen, setzt das Muster Pole, meist ein
   Dreier-Fünfer-Paar; unsere Leiter ist genau so ein Paar. Für Stücke mit vier Seiten gibt es fünf Grundmuster, die mit
   eingeschobenen Schleifen jeden gültigen Fall abdecken. Unter mehreren gültigen Mustern wählen wir nach eigenem Maß (passt,
   nichts klappt um, Pole fern von Lippe und Feldrand).
4. **Einbetten und Lösen.** Jedes Stück bekommt seine eigene Karte (Tutte), danach geht es weiter wie heute: aufschneiden
   entlang der Maullinie, Lippe exakt (A6), Haut lösen (A7), Tasche und Rachen an den beiden Lippenketten, Messen, dieselben Tore.

**Was das am Mundwinkel bedeutet:** Weil die Maullinie über c hinaus weiterläuft, liegt c mitten auf einer geraden Stückseite,
oben wie unten. Ein voller Winkel von 360° wird so auf zwei Stücke mit je 180° verteilt, und nichts muss aufbiegen. c hat vier
Hautflächen wie im Kernring heute, und die Zellen um c werden ohne Fächer, Auffaltung und Stufen etwa gleich große Quadrate.
Genau diese Bedingung hat E1 gemessen: Mit Quadraten ergab der Kissen-Vorversuch 1,0°. Weil das Netz erst nach dem Vernetzen
entlang der Maullinie aufgeschnitten wird, haben Ober- und Unterlippe von selbst dieselben Stellen. Ein Schlitz kostet dabei
keinen einzigen Pol, wenn seine Enden reguläre Punkte mit vier Vierecken sind (Indexrechnung nach Macq u. a. 2020).

**Warum ohne Richtungsfeld:**
- QuadWild braucht das Feld, weil es beliebige Modelle ohne vorgegebene Linien neu vernetzt. Das Feld findet dort die
  Stückgrenzen.
- In unserem kleinen Feld sind die Grenzen gegeben: Feldrand, Naht, Maullinie mit Verlängerung, Falten. Ein Richtungsfeld würde
  meist dieselben Linien wiederfinden, und zwar mit empfindlichem Nachzeichnen genau an den schweren Stellen (Keil,
  Faltenkreuzung).
- Die Verfasser von QuadMixer schreiben, dass Verfahren mit globaler feldgesteuerter Parametrisierung bei fest vorgegebenen
  Randkantenzahlen keine gültigen Netze garantieren. Deshalb füllen sie mit Mustern. Unser Feldrand ist genau so ein fester Rand.
- Ein Richtungsfeld bleibt als Werkzeug im Hinterkopf, falls ein Stück ohne passende Linie zu groß oder zu krumm wird.

**Was das Stücknetz nicht von selbst weiß:** dass um den Mund Schleifen laufen sollen, wie im Blender-Muster, das beim weiten
Öffnen hilft. Ohne Vorgabe laufen die Reihen am Mundwinkel geradeaus weiter. Will man die Schleifen, legt man eine
Führungslinie um den Mund. Das ist dann eine weitere Linie und keine Sonderkonstruktion. Ob wir sie brauchen, zeigt E5
(Öffnen).

## 3. Ehrliche Bewertung der Wege

| | (a) QuadWild direkt | (b) Richtungsfeld wie vorgeschlagen | (c) Stücknetz (Empfehlung) | (d) Kernring weiter |
|---|---|---|---|---|
| fester Feldrand, außen bitgleich | nein (vernetzt alles neu) | ja, mit Aufwand | ja, Randzahlen sind Konstanten | ja |
| Linien exakt als Kanten | ja (Merkmale sind Stückgrenzen) | ja | ja | nur mit Sonderregel |
| Mundwinkel | – | regulär | regulär, ohne Kunstgriff | regulär, mit Fächer und Stufen |
| neue Lagen | – | allgemein | allgemein | je eine neue Bauweise |
| Topologie beim Ziehen | springt | kann springen (QuadMixer räumt das ein) | wenige Ganzzahl-Entscheidungen, Hysterese | springt bei m, J |
| Code | C++, GPL-3, Gurobi oder Bi-MDF, Qt, Boost | neu: Feld, Nachzeichnen, Prüfschleife | neu: Stücke, Ganzzahlen, Muster | vorhanden |
| Risiko | passt nicht | mittel bis hoch | mittel | niedrig je Fall, hoch auf Dauer |

### Wo es nicht von selbst besser ist (Risiken)

- **Regeln gibt es auch dort, aber allgemeine.** Ein Beispiel: wann eine abknickende Grenze als Ecke zählt und wie konkave
  Stücke geteilt werden. Solche Regeln gelten überall gleich und nennen keinen Körper und keine Lage. „Gar keine Regeln“
  verspricht kein Verfahren.
- **Keil und schräge Faltenkreuzung bleiben schwer, in jedem Verfahren.** Ein sehr spitzer Keil zwischen Linie und Naht oder
  eine Falte, die die Maullinie schräg kreuzt, verlangt entweder gescherte Vierecke oder einen Pol an der Stelle. Das Stücknetz
  entscheidet das nach einer allgemeinen Regel, nicht pro Fall.
- **Einbettung:** Muster legen nur fest, welche Punkte verbunden sind. Die Lage macht unser Lösen. Gleichmäßiges Glätten klappt
  in konkaven Stücken Vierecke um, darum werden konkave Stücke geteilt.
- **Genauigkeit:** Die 0,25 px der Haut sind in jedem Verfahren unsere eigene Arbeit (A7); kein Fachartikel behandelt das
  Einpassen einer Catmull-Clark-Grenzfläche.
- **Muster richtig umsetzen:** Musterbibliotheken sind fehleranfällig. Darum prüfen wir jedes Muster für alle kleinen
  Kantenzahlen erschöpfend (nur Vierecke, erwartete Valenzen).
- **Stabilität:** Kleine Änderungen der Linie dürfen das Netz nicht umwerfen. Die Stückgrenzen folgen der Linie stetig, nur die
  Ganzzahlen springen. Dafür gilt, was E3 ohnehin vorsieht: Topologie eingefroren, Neubau nur an festen Auslösern mit Hysterese.
  Eine Arbeit über stetig mitlaufende Vierecksnetze bei laufender Bearbeitung habe ich nicht gefunden.
- **Lizenzen:** QuadWild, QuadMixer und Takayamas Mustercode stehen unter GPL; der Code zum Skizzen-Vernetzen (Takayama 2013)
  ist nur für nichtkommerzielle Forschung frei. Wir bauen nach den Veröffentlichungen nach und kopieren keinen Code.
- **Nichts davon steht im Code.** Es gibt kein Richtungsfeld, keine Stückzerlegung, keine Ganzzahlen und keine Muster
  (0 Treffer in `packages/shape`). Wiederverwenden lassen sich die Verlängerung der Linie aus dem Versuch „zwei Rechtecke“
  (`rechteck.ts`), die Karte aus Randstücken (`karteAusStuecken`), das Erkennen von Falten (`leiter.ts`), Tutte, die Löser, das
  Lösen der Haut, das Messen, die Fälle und die Tore.

### Warum nicht QuadWild direkt (oder Instant Meshes, QuadriFlow, ein Browser-Werkzeug)

- **QuadWild** übernimmt Merkmale als feste Stückgrenzen, gut. Es vernetzt aber das ganze Eingabenetz neu, hat keine Vorgabe
  für feste Randzahlen und keine Spiegelung, liefert geglättete Punkte statt eines eingepassten Käfigs und braucht C++ mit
  Gurobi oder Bi-MDF (GPL-3). Auf einem großen Prüfsatz liefert es in weniger als 0,5 % der Modelle kein brauchbares Netz;
  das Programm hat sich seit dem Artikel geändert.
- **Bi-MDF** (2023) macht den Ganzzahl-Schritt von QuadWild schnell und erlaubt Kanten mit festem Fluss, also auch feste
  Kantenzahlen. Bei unserer Größe reicht aber eine kleine eigene Suche.
- **Instant Meshes und QuadriFlow** richten Kanten nur ungefähr aus. Sie steuern die Pole nicht und kennen weder feste
  Randzahlen noch Linien als Bedingung. Das Blender-Handbuch schreibt zur Retopologie, für die Topologie verformter Figuren gebe
  es noch keine perfekten Automatiken, sie entstehe von Hand.
- **Takayama u. a. (2013)** schreiben dasselbe aus der Forschung: Figurenbauer wollen Kantenfluss und Pole selbst bestimmen,
  automatische Verfahren erreichen die Güte von Hand gebauter Netze noch nicht. Ihre Antwort sind gezeichnete Stückgrenzen
  mit automatisch gesetzten, verschiebbaren Polen, also genau das Stücknetz.
- **Im Browser** gibt es nichts Passendes. `@autoremesher/wasm` kann keine Linien oder Führungen; für Instant Meshes, QuadriFlow,
  QuadWild und QuadMixer fand sich kein Browser-Paket.
- **In der Praxis** legen Figurenbauer die Topologie um den Mund von Hand oder mit starken Führungen an. Kein Werkzeug sichert
  Schleifen um einen Maulschlitz zu.
- Brauchbar wäre QuadWild nur als Vergleich: einmal offline auf die schweren Fälle angewendet, zeigt es, wo ein Feldverfahren
  Stückgrenzen und Pole hinsetzt. Dafür müsste ich ein fremdes Programm herunterladen und bauen. Das mache ich nur mit deinem OK;
  nötig ist es nicht.

### Warum nicht gleich der ganze Körper

- Der Körper ist ein Raster aus Ringen entlang der Wirbelsäule und Reihen. Daraus kommen die Umrisse (Naht = Seitenumriss,
  Breitenlinie = Top), die Spanten (= Ringe) und die Loops (⌘R = neuer Ring), also genau deine Bedienung aus Illustrator und
  Blender. Ein Netz über den ganzen Körper bräuchte zuerst eine fertige glatte Zielfläche; heute entsteht die glatte Form erst
  durch den Käfig selbst. Das wäre ein Neubau von V0 bis V6 mit offenem Ausgang.
- Ehrlich: Auch das Raster hat Sonderstücke (Kappen, Kragen und Fenster an Ansätzen, Treppe und verzogene Reihe für schräge
  Linien), und einige extreme Formen sind noch kaputt (Würfel, Krake, Seestern; Register V1/V5). Schräge Linien über viele
  Reihen brauchen Pole (Register V5). Das sind aber örtliche Fälle, und genau dafür ist die Maschine aus dem Maul gedacht
  (Abschnitt 4).

## 4. Die schönste Lösung insgesamt: Das Liniennetz ist das Netz

- Takayama u. a. (2013) haben genau diesen Ablauf für Figurenbauer vorgeschlagen: Kurven auf die Fläche zeichnen, daraus Stücke,
  die Stücke nach Mustern füllen, Pole automatisch und verschiebbar. Das ist wörtlich, was du für den Editor willst. Am 16.10.
  hast du gefordert, das Mesh müsse „verstehen, welche Shapeform welche Art von Meshaufbau und Topologie verlangt“, am 20.10.,
  es solle sich „jeder Form optimal anpassen“. Dein Zielbild vom 17.10. ist eine Vektorillustration aus einem Liniennetz.
- **Unser Raster ist schon ein solches Liniennetz:** Ringe und Reihen zerlegen die Haut in Stücke mit vier Seiten und gleichen
  Gegenseiten, also in regelmäßige Gitter. Maul, Augenhöhlen, schräge Kanten, Ansätze und Kappen sind dann einfach weitere
  Linien und Stücke, die nach Mustern gefüllt werden.
- **Reihenfolge:** zuerst der Maul-Einsatz (örtlich, fester Rand, eingefroren). Danach dieselbe Maschine für Augenhöhlen (heute
  eigene Inset-Schleifen, Brauenwulst ungelöst), schräge P-Linien (heute Treppe), Ansätze von Teilen (heute Fenster und Kragen),
  Nasenlöcher und Kerben. Ob am Ende auch das Raster selbst aus dieser Maschine kommt, entscheiden wir an Messungen, wenn sie an
  Maul, Augen und schrägen Linien trägt.
- Damit gilt im ganzen Editor eine Regel: **Was du zeichnest, ist eine Linie; die Linien zerlegen die Haut, jedes Stück wird nach
  Muster gefüllt.**

## 5. Aufwand (geschätzt, nicht gemessen)

| Schritt | Stücknetz (c) | Kernring weiter (d) |
|---|---|---|
| Beweis an 10–12 Fällen mit Bildern | 3–5 Arbeitstage | – |
| bis zum heutigen Stand der Tore an allen 43 Fällen | weitere 1–2 Wochen | die 2 offenen Fälle: je eine neue Regel, Dauer offen |
| E3 (eingefrorene Topologie, schneller Weg), E4 (Editor, Maul zu) | 3–5 Tage | 3–5 Tage |
| E5, E6 (Öffnen, Kiefer, Zähne, Augen, Rig) | gleich | gleich |
| neue Lagen danach (Tiger, seitlich, Rundmaul, Falten am Maul) | Linie vorgeben, messen | je eine neue Bauweise |

- **Ein volles Richtungsfeld-Verfahren (b)** bräuchte zusätzlich das Feld und ein verlässliches Nachzeichnen der Stückgrenzen
  mit Prüfschleife. Das ist nach der Literatur der schwerste Teil; grob kostet es das Doppelte von (c), und das Netz springt
  leichter.
- Kalendarisch hängt das am Wochenlimit. Die größte Unsicherheit sind die Muster und die Teilung konkaver Stücke; dafür ist der
  Beweis da.
- Zum Vergleich: Der Kernring entstand an etwa anderthalb Tagen und schaffte 41 von 43 Fällen. Jede neue Lage hat seitdem wieder
  Arbeit gemacht.
- **Code:** Ersetzt würden die rund 2 700 Zeilen für Kernring, Lage und Leiter. Neu kämen geschätzt 1 500–2 500 Zeilen hinzu
  (Stücke, Ganzzahlen, Muster, Einbetten). Erhalten bleiben Linie auf A0, Verfeinerung, Feldwahl, Lippe, Haut lösen, Löser,
  Messen, die 54 Fälle und die Tore. Dazu kommt der Zusammenbau von Rollen, Spiegel und Schärfen in `topologie.ts`, sobald er
  aus dem Kernring herausgelöst ist.

## 6. Empfehlung

1. **Kernring einfrieren.** Keine weitere Sonderregel; die zwei offenen Fälle bleiben offen. Der Stand bleibt als Rückfall und
   als Messlatte.
2. **Beweis F0 „Stücknetz im Maulfeld“** (Kern, Option `gitter: 'stuecke'`, ohne die Option bitgleich), zeitlich begrenzt auf
   fünf Arbeitstage:
   - **Fälle:** Rex mittel gerade und J, Robbe hoch gerade und J, Rex tief J, Robbe tief J, Kugel mittel J, Ei tief J,
     Langhals hoch J, Birne mittel S, dazu ein Tigerkopf mit Kastenschnauze, dessen Kanten das Maul kreuzen.
   - **Kriterien:**
     - dieselben Tore wie heute: Haut ≤ 0,25 px, Knick ≤ A0 + 2°, Mundwinkel ≤ A0 + 2°, Lippe ≤ 1 px, nirgends umgeklappt,
       außen bitgleich, Spiegel bitgenau;
     - keine Regel im Code, die einen Körper oder eine Lage benennt;
     - wird die Linie um ±2 px verschoben, bleibt die Topologie gleich;
     - jedes Muster für alle kleinen Kantenzahlen erschöpfend geprüft.
   - **Bilder:** A0, Kernring, Stücknetz und Zebra im gleichen Ausschnitt, dazu die Stücke mit ihren Polen.
   - **Bauplan:**
     1. Linien in der Karte: Feldrand, Naht, Maullinie mit Verlängerung bis zum Feldrand (aus `rechteck.ts`), Falten von A0
        (Erkennen aus `leiter.ts`). Die Stücke sind die Flächen dieses Liniengraphen. Ecken liegen, wo die Grenze um mehr als
        etwa 22° abknickt; konkave Stücke werden geteilt. Bild der Stücke an allen Fällen.
     2. Ganzzahlen: Feldrand fest, Oberlippe = Unterlippe, gerade Summe je Stück, jede Seite ≥ 1, nah an einer Feldkante je
        Kante, möglichst wenige Pole und keine auf Lippe oder Feldrand. Exakte kleine Suche mit Hysterese.
     3. Muster: zuerst die geschlossenen Formeln für Stücke mit einem Pol (Tarini 2022) samt Auffüllen, danach die übrigen
        Fälle nach Takayama 2014. Die Wahl unter gültigen Mustern trifft unser eigenes Maß.
     4. Einbetten: Tutte je Stück in seiner eigenen Karte (`karteAusStuecken`), dann aufschneiden, Lippe (A6), Haut (A7),
        Tasche und Rachen wie heute, Messen und Tore; Bilder neben dem Kernring.
3. **Gewinnt der Beweis,** wird das Stücknetz Standard (ganze Reihe, Tests). Der Kernring-Code fliegt raus, dann folgen E3 und
   E4. **Verliert er,** geht es mit dem eingefrorenen Kernring in E3 und E4, und wir wissen, warum.

**Alternative (deine Wahl):** zuerst E3 und E4 mit dem eingefrorenen Kernring. Dann siehst du das Maul in 3–5 Tagen im Editor
an deinen eigenen Wesen, und der Beweis folgt danach. Bis zum Stücknetz dauert das rund eine Woche länger. E3 würde dann die
ganze Einsatz-Topologie im Dokument speichern statt der Kernring-Größen m, J und K; so lässt sich das Gitter später tauschen.
Die Nebensession hatte diese Reihenfolge empfohlen. Ich rate zum Beweis zuerst, weil E3 und E5 sonst auf einem Gitter aufbauen,
das wir ersetzen wollen, und weil jede neue Lage an deinen eigenen Wesen wieder nach einer Sonderregel rufen würde.

## Nicht nachgeprüft

- Den QuadWild-Artikel selbst, die beiden Übersichtsartikel und Peng 2014 konnte die Recherche nicht im Volltext lesen; die
  Angaben dazu stammen aus Code, README, Kurzfassungen und späteren Artikeln (Bi-MDF 2023, QuadMixer 2019).
- Die Indexrechnung für Schlitze (ein Schlitz mit regulären Enden kostet keinen Pol) ist aus Macq u. a. 2020 abgeleitet, dort
  für Ecken als Vermutung formuliert.
- Alle Aufwandszahlen sind Schätzungen. Ob 3–5 Tage für den Beweis reichen, hängt an den Mustern und an der Teilung konkaver
  Stücke.

## Quellen

- Pietroni, Nuvoli, Alderighi, Cignoni, Tarini: Reliable Feature-Line Driven Quad-Remeshing (QuadWild). ACM TOG 40(4), 2021.
  https://doi.org/10.1145/3450626.3459941 · Code (GPL-3): https://github.com/nicopietroni/quadwild
- Heistermann, Warnett, Bommes: Min-Deviation-Flow in Bi-directed Graphs for T-Mesh Quantization. ACM TOG 42(4), 2023.
  https://doi.org/10.1145/3592437 · https://www.algohex.eu/publications/bimdf-quantization/ · Code (GPL-3):
  https://github.com/cgg-bern/quadwild-bimdf
- Nuvoli, Hernandez, Esperança, Scateni, Cignoni, Pietroni: QuadMixer — Layout Preserving Blending of Quadrilateral Meshes.
  ACM TOG 38(6), 2019. https://opus.lib.uts.edu.au/bitstream/10453/137672/4/quadmixeR.pdf
- Takayama, Panozzo, Sorkine-Hornung: Pattern-Based Quadrangulation for N-Sided Patches. CGF 33(5), 2014.
  https://cims.nyu.edu/gcl/papers/pattern-based-quadrangulation.pdf
- Takayama, Panozzo, Sorkine-Hornung, Sorkine-Hornung: Sketch-Based Generation and Editing of Quad Meshes. ACM TOG 32(4), 2013.
  https://igl.ethz.ch/projects/sketch-retopo/
- Tarini: Closed-form Quadrangulation of N-Sided Patches. Computers & Graphics 107, 2022. https://arxiv.org/abs/2101.11569 ·
  https://tarini.di.unimi.it/cc-ability.html
- Reberol, Georgiadis, Remacle: Quasi-structured quadrilateral meshing in Gmsh. https://arxiv.org/abs/2103.04652
- Jakob, Tarini, Panozzo, Sorkine-Hornung: Instant Field-Aligned Meshes. ACM TOG 34(6), 2015.
- Huang, Zhou, Niessner, Shewchuk, Guibas: QuadriFlow — A Scalable and Robust Method for Quadrangulation. CGF 37(5), 2018.
- Bommes, Zimmer, Kobbelt: Mixed-Integer Quadrangulation. ACM TOG 28(3), 2009.
- Campen, Bommes, Kobbelt: Quantized Global Parametrization. ACM TOG 34(6), 2015.
- Peng, Zhang, Kobayashi, Wonka: Connectivity Editing for Quadrilateral Meshes. ACM TOG 30(6), 2011.
- Campen, Kobbelt: Quad Layout Embedding via Aligned Parameterization. CGF 33(8), 2014; Dual Strip Weaving. ACM TOG 33(6), 2014.
- Macq, Reberol, Henrotte, Beaufort, Chemin, Remacle, Van Schaftingen: Ginzburg-Landau energy and placement of singularities in
  generated cross fields, 2020 (Grad der Singularitäten an Randecken). https://arxiv.org/abs/2010.16381
- Bommes u. a.: Quad-Mesh Generation and Processing — A Survey. CGF 32(6), 2013. https://doi.org/10.1111/cgf.12014
- Campen: Partitioning Surfaces Into Quadrilateral Patches — A Survey. CGF 36(8), 2017. https://doi.org/10.1111/cgf.13153
- Blender-Handbuch, Retopologie (Abschnitt Voxel/Remesh): https://docs.blender.org/manual/en/latest/modeling/meshes/retopology.html
- Exoside Quad Remesher, Benutzerdokumentation 1.3 (Führungen, Kantenschleifen).
- npm: `@autoremesher/wasm` (AutoRemesher als WebAssembly, ohne Linien und Führungen).
