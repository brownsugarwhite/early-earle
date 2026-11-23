# Ozzy als Suite, Teil 5: Studio erklärt und eingebunden

Stand 23.11.2026. Grundlage: die Studio-Unterlagen auf dem Zweig `claude/ozzy-animation-physics-294508` (Konzept
`docs/plans/2026-11-20-studio-konzept.md`, Bauplan, Übergabe `docs/look/studio/UEBERGABE.md`), gelesen ohne Agenten. Vorher: Teil 1 bis 4
(`2026-11-23-ozzy-suite-*.md`). Nichts davon ist gebaut, außer was ausdrücklich als gebaut genannt ist.

**Deine Frage:** „Kannst du mir erklären, wie du den geplanten 2D-Editor nahtlos integrieren würdest? Ich habe den 2D-Editor als
Nebenprojekt mit Ultracode erstellt und kenne den Plan nicht genau. Kannst du seine Funktionsweise und Werkzeuge für mich beschreiben
und wie wir es integrieren, bzw. ob du davon etwas anders machen würdest?“

## 0 Kurzfassung

1. **Studio ist ein Editor für 2D-Vektorfiguren, der zugleich die Laufzeit des Spiels ist.** Editor und Spiel laden dieselbe Datei und
   rechnen mit demselben Code. Beispiel ist Ozzy, der Hund; die Demo „Gassirunde“ (Ozzy auf einem Hügel, den man dreht) soll nur mit
   den Mitteln des Editors entstehen.
2. **Das Herz ist der Regler:** Alles, was sich bewegt, hängt an Reglern mit Leisten (Kopfdrehung, Gelenkwinkel, Gangphase, Übergänge).
   Posen sind Stände der Regler, Übergänge laufen über Federn, nichts springt. In Ruhe ist jede Figur genau ihre Zeichnung.
3. **Gebaut ist nur M0:** das Gerüst aller Pakete mit Verträgen und Prüfungen (Commit e032014c). Seit dem 20.11. abends ruht Studio auf
   deinen Wunsch. Geplant sind M1 bis M11, grob geschätzt 155 bis 240 Arbeitstage bis zur ganzen Demo.
4. **Studio und Ozzy denken schon gleich:** Linien mit Punkten und Griffen als Wahrheit, Regler als Grundbaustein, „in Ruhe genau“,
   liquid drop, keine Modi, Wächter, Bibliothek, Befehle aus einem Register. Die Einbindung ist deshalb natürlich.
5. **Mein Vorschlag:** Studios Bewegungsteil (Regler, Leisten, Posen, Tafel, Ausgleich, Knochen, Autorig, Spiellogik) wird das
   Bewegungssystem der ganzen Suite, für 2D und für 3D. Eine 2D-Figur ist ein Blatt im Raum aus denselben Linien, das man aufblasen kann.
6. **Was ich anders machen würde:** den Umfang der Demo stark kürzen; eine App und eine Engine statt zweier; 3D-fähige Physik; die
   strenge Bitgleichheit nur fürs Spiel; kleine Proben mit deinem Auge statt „selbstständig durchbauen“; Scribble und Claude von Anfang
   an mitdenken.

## 1 Was Studio ist

Studio ist ein Werkzeug, mit dem du Figuren aus deinen eigenen Vektorzeichnungen zum Leben bringst, ohne zu programmieren. Du bringst
deine Formen als SVG mit oder zeichnest sie. Dann legst du ihre Zustände auf Leisten (etwa den Kopf von 0° bis 360°), formst Posen und
jeden Übergang selbst, hängst Physik, Effekte und Klang als kleine Bausteine an und verknüpfst alles mit Spiellogik in kurzen Sätzen.
Gearbeitet wird am Mac und am iPad mit Stift, gespielt und geprüft am iPhone.

**Die zehn Grundgesetze, kurz:**

1. Eine Form, viele Zustände: Jede Schlüsselform ist eine Bearbeitung derselben Punkte; die Zuordnung wird nie geraten.
2. In Ruhe ist jede Figur genau ihre Zeichnung.
3. Alles, was sich bewegt, hängt an Reglern.
4. Geändert wird an der aktiven Stelle; vor jedem Zug sieht man, wo er landet.
5. Deine Schlüssel gehören dir: keine Automatik ändert oder löscht sie.
6. Zeit nur, wo erzählt wird: Reaktionen sind Regler und Federn, Zeit gibt es in gestalteten Übergängen und im Mitschnitt.
7. Eine Laufzeit für Editor und Spiel.
8. Eine Grammatik überall: Tippen wählt, Ziehen ändert, Halten zeigt mehr, Doppeltippen geht hinein.
9. Nichts springt: Wächter melden Knicke, Falten und Kerben, statt still zu reparieren.
10. Die Demo bestimmt den Umfang.

## 2 Wie Studio funktioniert

| Baustein | Wie er funktioniert |
| --- | --- |
| **Formen** | geschlossene Pfade aus Punkten mit fester Kennung, glatt oder Ecke, mit Griffen; deine SVGs werden genau übernommen (ein Punkt wird nur glatt, wenn er es fast schon ist) |
| **Bindungen** | Ein Teil hängt mit Schlüsseln an einem oder zwei Reglern. Die **Ansicht** (etwa Kopf θ) ersetzt die Gestalt; **Zusatzformen** addieren etwas: Formziel (freier Regler), Korrekturform (am Gelenkwinkel), Kreuzschlüssel (zwei Regler), Posenkorrektur, Nachschwingen |
| **Mischen** | „Rahmen + Rest“: Drehung und Größe getrennt vom kleinen Rest; genau an jedem Schlüssel, schrumpft nicht, glatt bleibt glatt |
| **Leisten (Zeitmodell)** | eine Leiste je Achse: Ansicht (rund), Gelenk, frei, Physik, Spiel, Phase (Schritt, Trab, Galopp), Übergang (Taktleiste), Strecke (Lage auf dem Hügel), Mitschnitt (die letzten 20 s im Spiel). Ein Schlüssel ist immer die ganze Form eines Teils, nie eine einzelne Zahl. Felder mit zwei Achsen (höchstens 3 × 3 Schlüssel) |
| **Knochen** | drei Aufhängungen: starr (ganz an einem Knochen), Biegeachse (eine Bézier-Achse, Länge bleibt, zugleich Zielführung), Gewichte (bis vier Knochen je Punkt). Jeder Knochenwinkel ist ein Regler mit eigener Leiste |
| **Autorig** | Knopf „Knochen vorschlagen“: Die Knochen wachsen in einer halben Sekunde vom Rumpf nach außen, drei Sekunden Probewackeln, eine Frage nur bei echtem Zweifel. Das Ergebnis ist ein einziger Rückgängig-Schritt und rechnet nie von selbst nach. Nebenbei entsteht das Körpermodell für die Physik |
| **Posen** | benannte Stände der Regler in vier Schichten (Körper; Kopf und Blick; Gesicht; Physik). Posenkarten in einer Reihe; die Karte „Ausprobieren“ speichert nie. Springt ein Sollwert, übernimmt eine gedämpfte Feder den Unterschied: nichts springt, jeder Wechsel behält den Schwung |
| **Übergänge und Tafel** | gestaltete Übergänge mit Zwischenposen, Kontakten und Marken; die Tafel zeigt „von × nach“ für alle Posen: Standard, gestaltet, „über X“, gesperrt, Verweilen. Dazu Zyklen für Gangarten und Kehrtwenden |
| **Physik** | Box2D (als WebAssembly) für die Welt: Hügel, Rumpf, Kopf, Stürze, Dinge. Eine eigene Schicht für Ohren, Bart, Schwanz und Stauchung. Physik schreibt nur in sichtbare Regler und ist in Ruhe null |
| **Effekte und Bild** | ein Renderer mit Abstandsfeldern (WebGL2): Verschmelzen, Verjüngungen statt Outline, weiche Ränder, Schein, Kontaktschatten. Verbindungen („verschmelzen“ oder „Fuge“) und Effekte sind Daten mit Reglern; eine Kostenampel zeigt das Tempo |
| **Spiellogik ohne Code** | Bausteine (fertige Verhalten mit Reglern, Messwerten, Zuständen, Ereignissen), Drähte (Quelle, Kennlinie, Glätten, Regler) und Regeln als Sätze: „Sobald …“, „Solange …“, „Laune …“. Ein Knopf „Warum?“ erklärt, was gerade wirkt |

## 3 Werkzeuge und Bedienung

- **Vier Gesten ohne Ausnahme:** Tippen wählt und geht hin, Ziehen ändert an der Stelle, Halten zeigt mehr, Doppeltippen geht hinein
  (Figur, dann Teil, dann Punkt).
- **Werkzeuge:** Anfasser zum Posieren; V verschiebt Teile; A formt Punkte und Griffe; P setzt, was die Linse zeigt (Punkte, Gelenke,
  Zonen); ⇧C wandelt Punkte um; L ist das Lasso; W malt Gewichte; B zeigt das reine Bild; ⌘K sucht jeden Befehl.
- **Vier Linsen** (Tasten 1 bis 4): Form, Knochen, Physik, Spiel. Sie bestimmen nur, was greifbar ist, nie, was eine Geste bedeutet.
- **Die Stelle:** Die Bühne wählt Dinge, die Leiste wählt, wo ein Zug landet (Grundform, Pose, Achse und Wert, Übergang und Zeitpunkt,
  „nur in Pose X“, Ausprobieren). Vier Zeichen zeigen sie: der Tropfen auf der Leiste, der farbige Rand der Bühne, die Statuszeile
  („ändert: Kopf 150° · alle Posen“) und eine Vorschau vor dem Zug.
- **Neben jedem Wert ein Schlüsselpunkt:** ○ ändert sich nicht, ◌ ändert sich, ● Schlüssel.
- **Feste Orte statt schwebender Fenster:** Bühne (mindestens drei Viertel), Posenreihe, Leiste, Eigenschaften, Bibliothek, Prüfer,
  Befehlssuche.
- **Geräte:** am Mac alles; am iPad quer mit Stift (der Stift formt, der Finger bewegt die Ansicht); am iPhone quer spielen, hochkant
  ansehen und kleine Korrekturen. Im Spiel setzt ein Knopf einen Merker, den man am Mac genau nachspielt.

## 4 Stand und Aufwand

| Etappe | Inhalt | Tage (Schätzung des Plans) |
| --- | --- | --- |
| **M0 Verträge** (gebaut) | alle Pakete, Grenzen, Typen, Prüfungen | 4–5 |
| M1 Kern, Kopf, Vergleichsbild | Format, Form-Laufzeit, Renderer-Grundstufe, Speicher, deine Kopfdrehung als Daten | 12–18 |
| M2 Messen, Rad, Tapsen | Messseite, „Rad mit Gewicht“, erster spielbarer Stand | 8–11 |
| M3 Werkbank | Bühne, Leiste, Stelle, Vorschau, Zwiebelhaut, Speichern, Rückgängig | 9–13 |
| M4 Posen, Übergänge, Knochen | Ausgleich, Taktleiste, Tafel, Biegeachsen | 15–21 |
| M5 Physik am Mac | Welt, Vierbeiner mit Körpermodell, Chips | 15–22 |
| M6 Spielwiese auf dem iPhone | Spiel-App, Renderer Stufe 1, Korrekturformen | 11–16 |
| M7 bis M10 | Morgen-, Mittags- und Abendrunde: Regeln, Launen, Stürze, Autorig mit Katze, Regen, Pfützen, Tagebuch | 70–108 |
| M11 Ton, App, Feinschliff | Musik, Haptik, App-Hülle, Export | 12–20 |

Summe laut Plan grob 155 bis 240 Arbeitstage. Bewusst nicht vorgesehen: Mehrspur-Zeitleiste, Knoteneditor, Skripte, zwei Modi,
Vektor-Export, WebGPU (nur als Reserve).

## 5 Was schon zusammenpasst

| Studio | Ozzy und Suite-Konzept |
| --- | --- |
| Formen aus Punkten mit Kennung und Griffen | Linien als Wahrheit (Teil 4: Linie) |
| Alles hängt an Reglern | Bewegung als Regler über die Zeit (Teil 4) |
| In Ruhe genau die Zeichnung | „In Bewegung lebendig, in Ruhe genau“ (Teil 2) |
| Ausgleich über Federn | Wasserballon-Haut, die nachschwingt |
| Verschmelzen und Fugen mit Maß | Verbindung: verschmelzen, ansetzen, mit Rundung an der Naht |
| Wächter statt stiller Reparatur | Wächter (Teil 1) |
| Befehlsregister mit ⌘K | eine Befehlsschicht für Hand und KI |
| Deine Schlüssel gehören dir, Herkunft je Schlüssel | Was die KI tut, ist ein normaler Schritt; volle Kontrolle |
| liquid drop, Lobster, Tropfen auf der Leiste | dasselbe Designsystem |

## 6 Wie ich Studio nahtlos einbinden würde

1. **Eine Linie für 2D und 3D.** Studios Form ist eine geschlossene Linie in einer Ebene. In Ozzy wird sie ein Blatt im Raum. Ohne Körper
   bleibt sie flach (eine 2D-Figur); mit „blasen“ oder „ziehen“ wird sie räumlich. Dieselben Werkzeuge (P, A, V, L) gelten für beides.
2. **Studios Bewegungsteil wird das Bewegungssystem der ganzen Suite.** Regler, Leisten, Posenreihe, Tafel, Ausgleich, Übergänge und
   Mitschnitt gelten auch für Glimm in 3D: Eine 3D-Pose ist ein Stand der Linien, die Kopfdrehung eine Ansichtsachse. Das ist der reifste
   Teil der bisherigen Arbeit und ersetzt auf Dauer die Posen-Scheiben des Maul-Strangs.
3. **Knochen und Autorig auch in 3D.** Eine Biegeachse ist eine Bézier-Linie und funktioniert im Raum genauso; die Vorlage „Vierbeiner“
   riggt auch Glimm.
4. **Spiellogik ohne Code für alles Interaktive:** Bausteine, Drähte und Regeln als Sätze steuern auch die Kartenpunkte und
   Kamerafahrten der early-earle-Karte.
5. **Studios Speicher wird Ozzys Dokument:** Format, Verlauf, Herkunft je Schlüssel und Schutzregel tragen die Textform der Szene, das
   Rückgängig und die Zweige. Genau darauf setzt der Claude-MCP auf: Jeder Schritt von Claude ist ein Diff mit Herkunft „Claude“, und die
   Schutzregel verbietet ihm, deine Schlüssel zu überschreiben.
6. **Linsen gleich Stationen.** Studios Linsen (Form, Knochen, Physik, Spiel) und die Stationen der Suite (Zeichnen, Formen, Färben,
   Beleben, Inszenieren, Ausgeben) werden eine Liste: Form, Färben, Knochen, Physik, Spiel. Sie bestimmen, was greifbar ist.
7. **Abstandsfeld-Zeichnung als Zeichenweise der Engine.** Studios Renderer mit Verschmelzen und Verjüngungen wird ein Baustein der
   Ozzy-Engine (für flache Figuren und als Stil), nicht ein zweiter Renderer daneben.
8. **Abziehen und Aufblasen zwischen 2D und 3D** (Teil 1, 7.2): Aus einer 3D-Form entstehen Studio-Schlüssel mit denselben Punkten (Front,
   3/4, Seite), die du korrigierst; aus einer Studio-Figur wird eine Form.

## 7 Was ich anders machen würde

1. **Den Umfang kürzen.** Die Gassirunde mit Morgen-, Mittags- und Abendrunde, Katze, Regen, Pfützen und Tagebuch kostet allein M7 bis
   M10 etwa 70 bis 108 Tage. Für die Suite zählt der Kern; als Probe dient, was early earle braucht (Posen, Verschmelzen, Karte).
2. **Eine App, eine Engine.** Studio ist eine eigene App mit eigenen Paketen und React für die Felder; Ozzy hat seine eigene Bedienung.
   Für eine Suite braucht es ein Dokument, eine Oberfläche und eine Engine. Studios Pakete werden Bibliotheken darunter.
3. **Physik für 2D und 3D.** Box2D kann nur 2D. Ein Weg mit derselben Schnittstelle für beides (etwa Rapier, das es in 2D und 3D gibt,
   oder Jolt für 3D) hinter Studios `WeltAdapter`.
4. **Bitgleichheit nur, wo sie zählt.** Studio verbietet in der Rechnung sogar die eingebauten Winkelfunktionen, damit Editor, Spiel und
   jede Umgebung bitgleich rechnen. Für Wiederholungen im Spiel und Tests ist das wertvoll, für die Darstellung im Editor zu teuer.
5. **Kleine Proben mit deinem Auge statt „selbstständig durchbauen“.** Studios Plan sah vor, alle Etappen in parallelen Agenten-Wellen
   ohne dein Urteil durchzubauen. Das sprengt dein Wochenlimit und widerspricht „Look zuerst beweisen“.
6. **Scribble und Claude von Anfang an.** Studio hat dafür noch nichts vorgesehen („Pose zeichnen, Studio zerlegt“ ist verschoben). Ein
   Strich durch die Figur (Linie der Bewegung) sollte eine Pose stellen; Comic-Zeichen sollten Launen auslösen; Claude sollte die Befehle
   aus dem Register bedienen.
7. **Gemeinsame Begriffe.** Studio sagt „Aufhängung“, „Stelle“, „Chips“, „Leiste“, „Tafel“, „Bühne“; die Suite sagt „Linien“, „Körper“,
   „Werkstoff“, „Stil“. Ein gemeinsames Wörterbuch, bevor weitergebaut wird.

## 8 Vorgeschlagener Weg

| Schritt | Inhalt | Probe |
| --- | --- | --- |
| 1 | gemeinsames Wörterbuch und ein gemeinsames Datenmodell der Linie für 2D und 3D | Papier, dein Wort |
| 2 | Studios Kern (Format, Speicher, Regler, Mischen) als Bibliothek unter Ozzy | deine Kopfdrehung läuft in Ozzy genau wie im Prototyp |
| 3 | Posenreihe, Leiste und Ausgleich an einer 3D-Form | Glimm wechselt Posen ohne Sprung, in Ruhe genau |
| 4 | 2D-Figur als Blatt im Raum, Abziehen und Aufblasen | eine Studio-Figur und eine Ozzy-Form in einer Szene |
| 5 | Spiellogik an einem Kartenpunkt | ein Kartenpunkt reagiert auf Antippen, ohne Code |

Dazu bleibt der Vorschlag aus Teil 4: zuerst ein Gesamtkonzept aus allen Teilen, die Rundungs-Probe und die Tempo-Messseite.

## 9 Offene Entscheidungen (deine)

1. Soll Studios Bewegungsteil das Bewegungssystem der ganzen Suite werden?
2. Darf die Gassirunde als Demo stark gekürzt werden, zugunsten dessen, was early earle braucht?
3. Eine App für alles, oder Studio vorerst als eigene App mit gemeinsamem Kern?
