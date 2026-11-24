# Ozzy als Suite, Teil 13: Ein Editor für alle Projekte

Stand 23.11.2026. Ohne Agenten und ohne Suche. Gelesen: README und Stil-Bibel (`docs/ART.md`) von Traumacoaster (Nachbarordner
`traumacoaster`), die Notizen zu Studio und Gassirunde, Teil 1 bis 12. Sammelphase: Hier wird nichts getestet und nichts gebaut.

**Dein Wort (23.11.):** „Im Grunde will ich einen Editor für all meine Projekte: Traumacoaster mit Level-, Karten- und Figureneditor,
dann early earle mit Figuren- und Geländeeditor. Dazu soll die ganze Physik und Spielmechanik aus dem Editor kommen. Selbst das
Ozzy-Logo und das Spiel Gassirunde sollen aus dem Editor kommen. Alles komplett und alles komplett gleich bedienbar. Kurven sind die
Wahrheit.“ Und zu den Stilen: Eyvind Earle, Rayman, Frank Miller, Okazaki, dazu ein eigener Vektorstil im Stil der Fahrgäste und von
Ozzy und „ein hochintelligenter Realismus, der Top-Performance bei beeindruckenden Ergebnissen und einer eigenen Interpretation von
Realismus liefert“.

Annahmen, bis du sie bestätigst: Mit „Okazaki“ ist Takashi Okazaki gemeint (Afro Samurai), mit den „Fahrbahngästen“ die Fahrgäste aus
Traumacoaster.

## 0 Kurzfassung

1. **Deine Projekte sprechen schon dieselbe Sprache.** Die Bahn in Traumacoaster ist eine Kurve mit Knoten und Griffen, die man mit dem
   Finger zeichnet; Studio und das Ozzy-Logo sind Vektorkurven; early earle formt mit Linien. Ein Editor für alles folgt aus dem, was du
   schon baust.
2. **Damit wird Ozzy Editor und Engine in einem,** im Geist von Dreams, aber mit Kurven als Wahrheit. Das korrigiert Teil 8, wo „alles in
   Ozzy“ noch „zu viel“ hieß. Der Ozzy-Player wird eine vollständige Laufzeit: Bild, Physik, Logik, Eingaben, Spielstand, Ton.
3. **Gleich bedienbar** heißt: eine Grammatik (Teil 4), eine Befehlsschicht (Teil 7), dieselben Gesten in 2D und 3D, im Level wie in der
   Figur.
4. **Spielmechanik:** Einfaches als Sätze (Studio), Schweres als Code-Bausteine mit Tests, die Claude im Zweig schreibt und die im
   Editor als Bausteine mit Drähten erscheinen.
5. **Werkzeuge werden Spielmechanik:** In Traumacoaster ist das Bahnzeichnen das Spiel selbst; der Player braucht also Ozzys
   Linienwerkzeug.
6. **Sechs Stile aus denselben Bausteinen:** Silhouette, Tonstufen, Tinte, Muster, Leuchten und Luft. Ein Stil ist ein Rezept über
   diese Bausteine.
7. **Stil-Bibeln werden Rezepte und Wächter:** Die sechs Regeln aus der Traumacoaster-Bibel („nie Stippling auf Figuren“, „Leuchten nur
   auf Interaktivem“) prüft Ozzy selbst, und Claude arbeitet innerhalb dieser Regeln.
8. **Realismus als eigene Deutung:** nicht die Physik nachrechnen, sondern das treffen, woran das Auge Wirklichkeit erkennt.

## 1 Deine Projekte und was sie vom Editor brauchen

| Projekt | Was es ist | Was es vom Editor braucht |
| --- | --- | --- |
| Ozzy-Logo | genaue Vektorform des Maskottchens, mit Animation | Kurven in 2D, genau; Posen und Leisten; dein Vektorstil; Ausgabe als SVG und Film |
| Gassirunde | Demo-Spiel aus Studio: Figur in einer 2D-Physikwelt (Box2D) mit eigener weicher Figur | Figuren in 2D, Physik in 2D, Regeln als Sätze, kleine Level |
| Traumacoaster | 2,5D-Physik-Achterbahn: Bahn per Fingerstrich, ein Zug mit nicht angeschnallten Fahrgästen, 150 Level in 10 Welten, Karte als Drehscheibe, Figureneditor; Leitbild Earle × Rayman Legends | Level (Bahn, Gelände in Bändern, Zonen), Karte, Figuren (Fahrgäste), Physik (Zug, fliegende Fahrgäste), Spielmechanik, das Bahnzeichnen als Werkzeug im Spiel |
| early earle | 2048 im Earle-Stil, 184 Level auf einer Kugelkarte, Formen von 2 bis 2048 | Figuren in 3D (Ozzy), Gelände (Teil 10), Karte (Teil 8), die 2048-Logik als Code-Baustein, die Leiter (Teil 3) |

Gemeinsam: Kurven, Physik, Karten, Figuren, der Earle-Stil in zwei Projekten.

## 2 Ein Editor und eine Engine

- **Korrektur zu Teil 8 (Abschnitt 12):** Dort war „alles in Ozzy“ der Weg, den ich als zu viel abgelehnt habe. Mit deinem Ziel wird es
  der Weg. Die Notizen zu Studio sagten schon „eine App und eine Engine“, mit einer Physik, die hinter einem Weltadapter auch 3D kann.
- **Was die Laufzeit können muss:** Bildaufbau (Teil 9), Physik in 2D und 3D hinter einem Weltadapter, Regeln und Code-Bausteine,
  Eingaben (Finger, Stift, Maus, Lagesensor), Spielstand, Ton, Kamera, Ausgabe ins Web und später nativ (Teil 12).
- **Im Geist von Dreams,** wo alles in einem Programm entstand; anders als Dreams mit Kurven als Wahrheit, mit Ausgabe in deine eigenen
  Spiele und mit Claude als Mitarbeiter.
- **Ehrlich:** Das ist der größte denkbare Umfang. Er geht nur Stück für Stück, Projekt für Projekt (Abschnitt 9).

## 3 Gleich bedienbar, ganz konkret

| Handgriff | Traumacoaster | early earle | Ozzy-Logo und Gassirunde |
| --- | --- | --- | --- |
| Linie mit P, Punkte und Griffe | die Bahn | Kamm im Gelände, Ohr einer Form | Kontur des Logos |
| Regler Rundung | Kurvenradius der Bahn | Hang statt Klippe, runde Form | weiche oder spitze Ecke |
| Reihe auf einer Linie | Münzen entlang der Bahn | Level entlang des Kartenwegs | Schritte der Gassirunde |
| Vorlage mit Abweichung | Fahrgäste | Kartenpunkte, Bäume | Figuren der Gassirunde |
| Sätze („Sobald“, „Solange“, „Laune“) | Ziel erreicht, Fahrgast fliegt | Level geschafft, Zone öffnet sich | Ozzy findet einen Knochen |

Wer eines davon kann, kann alle.

## 4 Spielmechanik aus dem Editor

- **Sätze für das Einfache** (Studio, Teil 5): Bausteine, Drähte, „Sobald“, „Solange“, „Laune“.
- **Code-Bausteine für das Schwere:** die 2048-Regeln und der Löser (`packages/core`), die Bahnphysik von Traumacoaster. Im Editor sind
  sie Bausteine mit Ein- und Ausgängen; dahinter steht geprüfter Code mit Tests und Version. Claude schreibt sie im Zweig. Die Regel aus
  Teil 7 bleibt: Claude führt in Ozzy keinen freien Code aus; Code-Bausteine sind geprüfte Teile des Projekts.
- **Werkzeuge als Mechanik:** Das Bahnzeichnen in Traumacoaster ist Ozzys Linienwerkzeug im Spiel; ebenso könnte ein späteres Spiel das
  Kneten oder Aufblasen zur Mechanik machen.
- **Gleicher Ausgang im Spiel:** Spiele brauchen Physik, die immer gleich ausgeht; die Studio-Notizen halten das schon fest
  („Bitgleichheit nur fürs Spiel“).

## 5 Sechs Stile aus denselben Bausteinen

| Stil | Kennzeichen | Bausteine |
| --- | --- | --- |
| Eyvind Earle | Siebdruck, harte Stufen mit Verlauf innen, Staffeln, schwarze verzweigte Stämme mit Farbflecken | Tonstufen, Luft, Muster (Stippling), Tinte als Fläche |
| Rayman (Origins, Legends) | Sattheit, Leuchten, gemalte Kunst in 2,5D, Formen mit Schwung | Leuchten, Bemalung, Verformung entlang von Kurven; Ubisofts UbiArt Framework machte gezeichnete Kunst direkt spielbar |
| Frank Miller (Sin City) | Schwarz und Weiß in harten Flächen, eine Akzentfarbe, viel Negativraum | zwei Tonstufen, Tinte als Fläche, Akzentfarbe; Vorarbeit: die Sin-City-Shader aus dem Shader-Strang |
| Takashi Okazaki (Afro Samurai) | kräftige Tusche, raue Texturen, Spritzer, harte Schatten | Tinte mit Verjüngung, Muster (Körnung, Spritzer), Tonstufen |
| Dein Vektorstil (Fahrgäste, Ozzy) | flach, klare Silhouetten, Verjüngungen statt dünner Kontur, Weiß über der Kontur, Ohren als Silhouetten | Silhouette aus den Kurven, Tinte mit Verjüngung, zwei bis drei Tonstufen |
| Eigener Realismus | was das Auge als wirklich erkennt (Abschnitt 7) | Wirklichkeit als Kern (Teil 9) und kluge Tricks (Teil 12) |

**Die gemeinsamen Bausteine:** Silhouette (aus den Kurven), Tonstufen, Tinte (Linie mit Verjüngung, Fläche in Schwarz), Muster
(Stippling, Raster, Schraffur, Körnung, Spritzer), Leuchten, Luft (Staffeln). Jeder Stil ist ein Rezept über diese sechs; neue Stile
entstehen, indem man die Rezepte mischt oder ein neues schreibt.

## 6 Stil-Bibeln als Rezepte und Wächter

- **Traumacoaster** hat seine Bibel schon (`docs/ART.md`, sechs Regeln): harte Kanten in drei Tönen; Stippling auf der Schattenseite,
  nie auf der Bahn, nie auf Figuren; schwarze verzweigte Stämme mit Farbflecken; Hügel als Bänder; Luftperspektive in Stufen; Leuchten
  nur auf Interaktivem. In Ozzy wird jede Regel ein Regler oder ein Wächter.
- **Ebenso** die Regeln für Ozzy (Verjüngungen statt Outline, Weiß über der Kontur) und für early earle (`docs/STYLE.md`: harte
  Cel-Stufen, keine Outlines, der Verlauf läuft nie über eine Stufenkante).
- **Was das für die Zusammenarbeit heißt:** Deine Stilregeln werden ausführbar. Claude schlägt nur vor, was die Wächter durchlässt, und
  du siehst sofort, welche Regel eine Idee verletzen würde.

## 7 Realismus als eigene Deutung

- **Nicht nachrechnen, sondern treffen, woran das Auge Wirklichkeit erkennt:** Schatten, wo Dinge sich berühren; Dunkel in Ecken; Glanz
  am Rand; Licht, das durch Haut und Wachs scheint; Luft, die mit der Entfernung heller wird; scharfe Details an der Silhouette. In der
  Forschung heißt das „Visual Equivalence“: Zwei Bilder wirken gleich, auch wenn ihre Bildpunkte verschieden sind. Die Rechenzeit geht
  dorthin, wo das Auge hinsieht.
- **Aus denselben Bausteinen:** mehr Tonstufen bis zum stetigen Licht, Tinte wird Kontaktschatten, Muster wird feines Detail, Luft wird
  Atmosphäre. Realismus ist so das ferne Ende desselben Stilreglers (Teil 9, Nachtrag).
- **Eine eigene Deutung,** zum Beispiel: echte Werkstoffe, aber Earles Bildaufbau und Palette; echtes Licht, aber eine gezeichnete
  Schattengrenze. Dazu die Tricks aus Teil 12: gemalte Kugel, gelernte Looks, die Neural Engine als Maler.

## 8 Was sich am bisherigen Konzept ändert

- **Teil 8, Abschnitt 12:** „alles in Ozzy“ wird das Ziel; der Player wird eine vollständige Laufzeit.
- **Teil 5 (Studio):** Studio ist von Anfang an Teil desselben Editors (die Studio-Notizen sagten schon „eine App und eine Engine“).
- **Teil 7:** Code-Bausteine sind geprüfte Teile des Projekts; freier Code bleibt ausgeschlossen.
- **Teil 9:** Die Stile haben jetzt Namen, und die Stil-Bibeln werden Rezepte.
- **Teil 12:** Die Breite bleibt das größte Risiko; die Antwort darauf ist die Treppe aus deinen Projekten.

## 9 Deine Projekte als Treppe (zur Information, keine Entscheidung nötig)

Jedes Projekt fügt dem Editor ein Stockwerk hinzu, und jedes ist ein echtes Ergebnis, kein Test.

**Nachtrag auf deine Frage „zuerst die Gassirunde?“ (23.11.):** Ja, aber nicht „alles“ (der Studio-Plan M0 bis M11 war auf 120 bis 200
Arbeitstage geschätzt), sondern der dünnste vollständige Durchstich durch alle Schichten. Davor kommen zwei Schritte, damit die
Gassirunde schon im gemeinsamen Editor entsteht und nicht als eigene 2D-App:

0. **Ein Stamm:** die Stränge zusammenführen (Ozzy, Maul, Paint, Objekte, Shader, Studio), auf dein Wort.
1. **Das Fundament:** Befehlsschicht, Szene als Text, ein Kurven-Kern für 2D und 3D, das Gerüst des Players, die Physik hinter dem
   Weltadapter.
2. **Ozzy-Logo und Gassirunde:** Ozzy als genaue Vektorfigur (das Logo kommt dabei mit), Gehen als Posen, eine 2D-Physikwelt (Box2D) mit
   weicher Figur, ein paar Sätze, ein kurzer Level, spielbar auf dem iPhone. Fertig heißt: Alles darin entstand mit den Werkzeugen des
   Editors.
3. **Traumacoaster:** Level, Karte, die Bahn als Werkzeug im Spiel, 2,5D, Earle × Rayman.
4. **early earle:** Formen in 3D, Gelände, die Kugelkarte, die 2048-Logik als Code-Baustein.

Die 3D-Arbeit an Ozzy (Formen, Maul, Paint, Shader) geht dabei nicht verloren: Sie ist das spätere Stockwerk 4 und kommt über den Stamm
ins Haus.

## 10 Nachtrag: Herzstück und Hülle (24.11.)

**Dein Wort:** „Die Kurven- und Scribble-Erkennung und wie sich das Mesh beim Ziehen verhält, sind das Herzstück. Layout und Bearbeitung
sollten unabhängig davon entwickelt werden können, aber die aktuellste Version sollte immer in Ozzy sein.“

- **Das Herzstück (der Kern):** Linien und Kurven (Bézier und echte Kreise, Punkte genau einfügen und wieder wegnehmen), die
  Scribble-Erkennung (Teil 6) und das Verhalten beim Ziehen: Punkte nach Bedarf, Reichweite bis zu den Nachbarn, das Licht als Anzeige,
  die Haut aus den Linien (Teil 16). Nach außen hat der Kern genau eine Tür, die Befehlsschicht (Teil 7).
- **Die Hülle:** Layout, Werkzeuge, Ansichten, Gesten, liquid drop. Sie spricht nur über die Befehlsschicht mit dem Kern. Deshalb lassen
  sich beide getrennt entwickeln, und auch ein späterer Umzug des Kerns (etwa nach Rust, Teil 12) ließe die Hülle unverändert.
- **Immer die neueste Fassung in Ozzy:**
  - Der Kern ist ein eigenes Paket im selben Repo, kein eigener langlebiger Zweig. Jeder fertige Schritt kommt sofort in den Stamm, den Ozzy
    benutzt.
  - Für konzentrierte Arbeit hat der Kern ein kleines eigenes Prüffenster; dasselbe Ergebnis ist zugleich in Ozzy zu sehen.
  - Während des Umbaus laufen alter und neuer Kern nebeneinander, mit einem Schalter in Ozzy. Der alte bleibt unangetastet, bis du
    umschaltest.
  - Bei jedem Schritt laufen die Tests des Kerns und eine kurze Probe in Ozzy; was Ozzy bricht, kommt nicht in den Stamm.
- **Was dafür zuerst feststehen muss:** die Befehlsschicht und die Szene als Text, denn sie sind die Fuge zwischen Kern und Hülle. Und ein
  Stamm: Heute liegen Ozzy, Maul, Paint, Objekte, Shader und Studio in getrennten Zweigen. „Immer in Ozzy“ setzt einen Stamm voraus, den
  es noch nicht gibt; zusammengeführt wird nur auf dein Wort.

## 11 Quellen

- Traumacoaster: `README.md` und `docs/ART.md` (Stil-Bibel) im Nachbarordner `traumacoaster`.
- Studio: Notizen zum Plan-Nachtrag (eine App und eine Engine; Physik hinter einem Weltadapter; Bitgleichheit nur fürs Spiel; Demo
  Gassirunde), Teil 5.
- early earle: `docs/STYLE.md`; die Earle-Bausteine in `packages/render/src/earle/`.
- Forschung (ohne Link): G. Ramanarayanan, J. Ferwerda, B. Walter, K. Bala, „Visual Equivalence: Towards a New Standard for Image
  Fidelity“, SIGGRAPH 2007.
- Vorbilder (ohne Link): Dreams (Media Molecule), UbiArt Framework (Ubisoft, Rayman Origins und Legends).
- Vorher: Teil 1 bis 12.
