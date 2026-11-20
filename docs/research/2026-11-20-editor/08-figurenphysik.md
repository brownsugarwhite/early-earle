# Figurenphysik: Nachschwingen, Weichkörper, Gleichgewicht, Gehen, Stolpern, Fallen

Recherche vom 20.11.2026 · Thema 8 der Editor-Recherche („Studio“) · Grundlage: Handbücher, Laufzeit-Quelltexte, Papers,
Vorträge und Stimmen von Nutzern (Quellen in Abschnitt 12).

Hinweis zur Quellenlage: Die Websuche war für alle Recherchen dieses Tages auf ein gemeinsames Kontingent begrenzt, das während
dieser Arbeit aufgebraucht wurde. Danach habe ich nur noch bekannte Primärquellen direkt abgerufen. Einige PDFs (SIMBICON,
Formabgleich, „Small Steps“) ließen sich nicht als Text lesen; ihre Aussagen sind aus Sekundärquellen oder als bekannte
Standardergebnisse belegt und so gekennzeichnet. Zahlen, die ich nicht selbst gemessen habe, stehen als Startwerte zum Prüfen da.

---

## Kurzfassung

1. **Die besten Programme lassen die Animation führen und die Physik nur abweichen.** Spine rechnet je Knochen einen Versatz zur
   animierten Lage, der zu null zurückfedert; Live2D schreibt sein Pendel in Parameter, die zwischen gezeichneten Schlüsselformen
   mischen; Unreal treibt simulierte Körper mit Federn auf die laufende Animation. Für Studio heißt das: **In Ruhe ist die Figur
   genau ihre Zeichnung.** Physik ist eine Abweichung, die abklingt.
2. **Eine Feder für alles.** Frequenz (Tempo) und Dämpfungsverhältnis (Wippen) sind die einzigen Regler, die sich nicht
   gegenseitig verstellen; Box2D v3 beschreibt jede weiche Bedingung genau so (Hertz und Dämpfungsverhältnis), Unreal mit Stärke und
   Dämpfungsverhältnis. Mit einem dritten Regler „Vorgriff“ (Anfangsantwort r: negativ = Ausholen, über 1 = Überschießen) deckt
   dieselbe Feder Nachschwingen, Ausholen und Übertreiben ab. Spines Stärke/Masse/Trägheit und Live2Ds vier Regler sind gekoppelt;
   Nutzer von Federknochen beklagen genau das.
3. **Nachschwingen auf gezeichnete Formen, nicht auf freie Punkte.** Ohren, Bart, Wangen sollen über ein Pendel einen Parameter
   treiben, der zwischen Florians Schlüsselformen mischt (Live2D-Weg, seit Spine 4.3 auch als „Slider“). Lange Teile wie der
   Schwanz bekommen eine Kette mit Federn. Freie Weichkörper auf den Ankern nur für Gelee-Effekte.
4. **Weiche Vektorflächen ohne Knicke:** Anker und Griffe nie als einzelne Massenpunkte simulieren. Gerechnet wird auf wenigen
   Kontrollpunkten (Körperbrocken, Ring), die Form folgt über ein glattes Verformungsfeld, das Anker und beide Griffe mit derselben
   lokalen Abbildung bewegt; affine Abbildungen erhalten Geraden, also bleiben glatte Anker glatt.
5. **Weichkörper-Verfahren:** XPBD mit vielen Teilschritten (Macklin, Müller) und Formabgleich (Müller 2005) sind unbedingt stabil
   und klein genug für JavaScript. Mit der gerade animierten Pose als Ruheform wackelt eine Fläche nur vorübergehend.
6. **Gleichgewicht ohne Robotik-Forschung:** Ein voll simulierter, über Gelenkmomente balancierender Vierbeiner (Coros u. a. 2011)
   ist machbar, aber nur über Optimierung einstellbar. Spiele mit Charakter nehmen einen **vereinfachten Körper** (Rain World: zwei
   Körperbrocken; Gibbon: erst der Schwerpunkt, dann die Glieder) plus prozedurale Schritte und gezeichnete Posen.
7. **Wann ein Schritt nötig ist, sagt der Kipppunkt** (Capture Point, Pratt 2006; „extrapolierter Schwerpunkt“, Hof 2005):
   ξ = x + ẋ/ω₀. Wohin der Fuß geht, sagt die Raibert-Regel. Beides ist billig, anschaulich darstellbar und passt auf eine
   gekrümmte, sich drehende Fläche.
8. **Ozzys Tapsen bergab** entsteht physikalisch korrekt aus „Hangabtrieb gegen begrenzte Bremskraft der Beine“: Kann er den Hang
   nicht halten, rollt der Schwerpunkt los, der Kipppunkt verlässt die Stützstrecke, er muss treten; zu schnell → Stolpern. Ein
   Regler (Bremskraft in g) legt fest, ab welcher Neigung das passiert; ein echter Hund stünde auf leichten Hängen still.
9. **Stürze als aktive Ragdoll mit Spannungskurve:** Beim Stolpern sinkt die Spannung, die die Glieder in ihre Posen zieht; die
   Figur fällt mit Schwung aus der Animation (Lage und Geschwindigkeit übernommen); zum Aufstehen wird die Lage erkannt, eine
   gezeichnete Aufsteh-Folge gewählt und die Spannung wieder hochgefahren. Alles ohne Sprung.
10. **Übergänge zwischen Posen:** Gezeichnete Übergänge, wo Florian sie formt; als Kitt für Unterbrechungen der Trägheits-Übergang
    (Bollo, GDC 2018) bzw. Holdens Federn, die der Prototyp schon nutzt.
11. **Technik:** ein eigener kleiner XPBD-Löser in TypeScript für alles an der Figur und für die Welt des Demospiels (Rad und
    Hindernisse als Abstandsfelder), fester Takt 240 Hz, Darstellung interpoliert. Box2D v3 (Phaser Box2D als JavaScript-Port, unter
    70 KB) oder Rapier (WASM, plattformübergreifend deterministisch) bleiben als Weltlöser für spätere Spiele andockbar.
12. **Im Editor einstellbar, aber minimal:** Schwerpunkt (automatisch aus den Flächen), je Teil eine Feder mit drei Reglern und
    Grenzbogen, Spannung je Pose, Fußfolge-Diagramm, Bremskraft, Haftung, Mut, Sprung als gezogene Bahn, Sturz- und Aufstehposen, ein
    Prüfstand zum Schubsen, Schütteln und Raddrehen mit Röntgenansicht (Schwerpunkt, Stützstrecke, Kipppunkt) und „Aufnehmen“, das
    eine Physik-Aufnahme in bearbeitbare Schlüssel verwandelt.

---

## 1. Rahmen

**Frage:** Wie bekommt eine Vektorfigur Sekundärbewegung, weiche Flächen, Gleichgewicht, prozedurales Gehen, Stolpern, lustiges
Hinfallen und Aufstehen, und was davon ist Animation, was Physik? Ziel ist eine Architektur für Ozzy, einen vierbeinigen
Cartoonhund aus Vektorflächen, der auf einer gekrümmten, vom Spieler gedrehten Scheibe läuft, balanciert, springt, stolpert und
fällt, und eine Liste dessen, was ein Art Director ohne Programmierkenntnisse im Editor einstellen muss.

**Randbedingungen:**

- Florian entscheidet mit dem Auge; Formen müssen glatt laufen (keine Sprünge, kein Rutschen, kein Verklumpen, keine Kerben). Er will
  Übergänge selbst formen. Ozzy muss in Ruhe genau wie das Logo aussehen.
- Geräte: Mac (M3 Pro, Bildschirm bis 120 Hz), iPhone 16 (60 Hz), iPad mit Stift. Web-Technik (TypeScript, Vite, WebGL2).
- Florian (18.11.) zu den Haltungen: Die Beine dürfen nicht durch den Boden drehen; es muss immer weich und physikalisch korrekt
  sein.
- Der Prototyp (`apps/editor/src/ozzy-figur/`) hat schon: kritisch gedämpfte Federn auf den Gewichten der Haltungen (Teilschritt
  1/240 s), Abläufe mit Zusatzbewegungen (Hüpfer, Aufprall, Seufzer, Wedeln) als reine Funktionen der Zeit, und Beine mit einem
  „Rückgrat“: einer Bézier von der Hüfte zum Fuß, die sich biegt und ihre Länge behält, wenn Hüfte und Fuß zusammenrücken. Das ist
  bereits ein Gummischlauch-IK und wird unten weiterverwendet.

**Begriffe in diesem Bericht:** *Feder* (gedämpfte Feder mit Tempo, Wippen, Vorgriff), *Spannung* (wie fest ein Teil seiner
animierten Zielpose folgt, 0 = schlaff, 100 % = exakt), *Schwerpunkt*, *Stützstrecke* (zwischen hinterster und vorderster Pfote am
Boden), *Kipppunkt* (Capture Point), *Schrittplaner*, *Haftung* (Reibung der Pfoten), *Bremskraft* (was die Beine längs des Bodens
leisten können), *Prüfstand* (Testszene im Editor).

---

## 2. Nachschwingen (Sekundärbewegung)

### 2.1 Spine: Physik-Beschränkungen auf Knochen

Seit Version 4.2 hat Spine „physics constraints“. Eine Beschränkung hängt an einem Knochen und wirkt anteilig (0 bis 100) auf
Verschiebung X und Y, Drehung, Scherung X und Skalierung X. Im Laufzeit-Code (spine-core) hält jede Eigenschaft einen Versatz und
eine Geschwindigkeit; gerechnet wird in festen Teilschritten h (Einstellung „FPS“, das Handbuch empfiehlt 30 bis 60), Restzeit wird
ins nächste Bild übertragen:

```
Trägheit:  Versatz += (vorige Lage − jetzige Lage) · Trägheit      (je Bild begrenzt durch „Limit“ · Δt)
Feder:     v       += (Wind − Versatz · Stärke) · (1/Masse) · h
           Versatz += v · h
Dämpfung:  v       *= Dämpfung^(60 · h)                            (Dämpfung gilt je 1/60 s)
Ergebnis:  Knochen  = animierte Lage + Versatz · Mix
```

Schwerkraft wirkt als konstante Kraft entlang Welt-Y, Wind entlang Welt-X; bei Drehungen werden beide über die Knochenlänge zu einem
Drehmoment. „Mix“ ist keybar, ebenso das Zurücksetzen; „Global“ lässt eine Zeitleistenzeile viele Beschränkungen gemeinsam steuern
(z. B. Wind). Im Editor läuft die Physik mit „Simulate“ dauernd; ohne Simulate spult Spine beim Scrubben von Bild 0 vor, und die
Option „Deterministic“ rechnet jedes gezeigte Bild von vorn, damit eine Stelle immer gleich aussieht (kostet Rechenzeit, kann am
Schleifenende springen). „Warm Up“ lässt Schleifen eingeschwungen beginnen. Spine backt Physik ausdrücklich nicht in Schlüssel. Für
das Versetzen einer Figur (Teleport) gibt es Hilfen, die den gespeicherten Bezugspunkt mitverschieben, damit nichts nachpeitscht.

**Spine 4.3** bringt drei Dinge, die für uns wichtig sind: Physik verhält sich auch bei niedrigen Bildraten korrekter, Physik und IK
können **volumenerhaltend stauchen** (scaleY wächst, wenn scaleX schrumpft), und es gibt **Slider**: eine Beschränkung, die eine
Animation auf beliebige keybare Eigenschaften legt und von Drehung, Lage, Größe oder Scherung eines Knochens gesteuert werden kann.
Ein physikalisch schwingender Knochen kann damit gezeichnete Formwechsel auslösen.

- **Stärken:** billig, robust, Teil des Rigs, keybar, im Editor sofort sichtbar; Ruhe = animierte Pose.
- **Schwächen:** Laut Spine-Mitarbeitern verändern Masse und Stärke beide die Schwingfrequenz, Trägheit und Masse hängen zusammen;
  man stellt also gekoppelte Regler. Bei niedrigem Takt unruhig. Keine Kollisionen. Je Kettenglied eine eigene Beschränkung. Nicht in
  der günstigsten Ausgabe (Essential) enthalten.

### 2.2 Live2D: das Pendel schreibt in Parameter

In Live2D Cubism ist Physik ein mehrstufiges Pendel **zwischen Parametern**. Eingänge sind Parameter (Kopfwinkel X/Z, Körperdrehung
X/Z oder beliebige andere, z. B. Körper Y, damit Haare beim Sprung aufbauschen), jeweils mit Einfluss in Prozent. Das Pendel hat
Stufen (Voreinstellungen Haar 2-stufig, 3-stufig, 10, 20), jede Stufe gibt einen Ausgabe-Parameter. Vier Regler: Dauer (Tempo),
Schwingfreude (Ausschlag; empfohlen 0,7 bis 0,99), Reaktion (wie schnell es anspricht) und Abklingen. Ausgänge haben Skalierung,
Spiegeln (links/rechts) und eine Anzeige, wie viel des Parameterbereichs genutzt wird. Im Laufzeit-Code ist jede Stufe ein
Massenpunkt in festem Abstand zum vorigen, Verlet-artig bewegt, mit Schwerkraftrichtung aus dem Eingangswinkel; der Takt ist fest,
die Ausgaben werden zwischen den letzten beiden Schritten linear interpoliert. Getestet wird durch Ziehen im Ansichtsfenster: Das
Gesicht folgt dem Zeiger, die Haare schwingen.

- **Stärke für uns:** Die Physik landet **immer auf gezeichneten Schlüsselformen**; nichts kann aus dem Modell fallen. Genau das
  braucht Ozzy („genau wie das Logo“).
- **Schwächen:** vier nicht physikalisch benannte Regler, die sich gegenseitig beeinflussen; Ausgaben müssen nachskaliert werden;
  keine Welt, keine Kollision. In VTube Studio wird Physik als Letztes gerechnet und überschreibt alles; die Reihenfolge der
  Auswertung ist also eine Designentscheidung.

### 2.3 Federknochen in Engines und bei Avatar-Bastlern

- **VRChat PhysBones** (eingestellt von sehr vielen Nicht-Programmierern): Zug zur Ruhe (Pull), Nachwippen (Spring bzw. Momentum),
  Steifigkeit, Schwerkraft mit „Gravity Falloff“ (bei 1 verändert die Schwerkraft die Ruhepose gar nicht), Dämpfen der Eigenbewegung
  (Immobile), Grenzen als Kegel, Scharnier oder Kugelsegment, Radius und Kollider, Dehnen und Stauchen mit Höchstwerten, Greifen und
  Posieren durch Spieler, und **Kurven entlang der Kette** für fast jeden Wert (Wurzel steif, Spitze locker). Die bekannteste
  Nutzerkritik: Die Regler wirken je nach Modus und anderen Reglern verschieden, man lernt sie nur durch Ausprobieren; gewünscht
  wird, dass **jeder Regler genau eine Sache tut**.
- **Godot** hat für 2D einen „Jiggle“-Modifikator (Steifigkeit, Masse, Dämpfung, Schwerkraft, Kollision), als experimentell
  markiert.
- **Unreal „Physics Control“** treibt simulierte Körper auf Ziele: lineare und Drehstärke, **Dämpfungsverhältnis (1 = kritisch,
  schnellstmöglich ohne Überschwingen)** plus Zusatzdämpfung, und Geschwindigkeits-Multiplikatoren, die bestimmen, ob der Körper der
  Bewegung der Animation folgt oder sich wie gegen Luftwiderstand stemmt. Die Ziele können auf der laufenden Animation liegen.

### 2.4 Verlet-Ketten

Jakobsen („Advanced Character Physics“, Hitman 2001): Massenpunkte speichern aktuelle und vorige Lage (die Geschwindigkeit steckt
in der Differenz), Abstandsbedingungen werden nacheinander exakt hergestellt und ein paar Mal wiederholt, Kollisionen durch
Herausschieben gelöst. Starre Körper entstehen aus Punkten, Ragdolls aus geteilten Punkten mit Winkelgrenzen. Stabil, weil nichts
über steife Federkräfte läuft und Fehler sich nicht aufschaukeln. Das ist die Urform von PBD (Abschnitt 3) und genügt für Schwanz,
Leine, lange Ohren.

### 2.5 Die Feder als Grundbaustein

| Formulierung | Regler | Was sie kann |
|---|---|---|
| Kritisch gedämpfte Feder (Holden, „Spring-It-On“) | Halbwertszeit | exakte Lösung, unabhängig von der Bildrate; Trägheits-Übergang als abklingender Versatz; Steuerung, deren Zukunft vorhersagbar ist |
| System zweiter Ordnung („Giving Personality to Procedural Animations using Math“) | Frequenz f, Dämpfung ζ, Antwort r | Nachschwingen (ζ < 1), Ausholen (r < 0), Überschießen (r > 1); implizit gerechnet unbedingt stabil |
| Cartoon-Filter (Wang u. a., SIGGRAPH 2006) | Stärke | zieht eine geglättete Beschleunigung vom Signal ab: Ausholen, Nachschwingen, Übertreibung, Stauchen und Strecken auf beliebigen Kurven |
| Weiche Bedingungen (Box2D v3), Physics Control (Unreal) | Hertz bzw. Stärke, Dämpfungsverhältnis | dieselbe Feder als Gelenk oder Kontakt im Physiklöser |

Die Formel der zweiten Ordnung, die ich als gemeinsamen Baustein empfehle (Eingang x, Ausgang y):

```
k1 = ζ / (π·f)      k2 = 1 / (2π·f)²      k3 = r·ζ / (2π·f)
y'' = (x + k3·x' − y − k1·y') / k2
```

f ist das Tempo (Schwingungen je Sekunde), ζ das Wippen (0,2 wippt lange nach, 1 kommt ohne Überschwingen an), r der Vorgriff
(0 läuft weich an, 1 folgt sofort, über 1 schießt über, unter 0 holt aus). **f und ζ sind voneinander unabhängig**, anders als
Stärke/Masse in Spine. Das erfüllt die Forderung der PhysBones-Nutzer: ein Regler, eine Wirkung.

### 2.6 Gegenüberstellung für Ozzy

| Weg | Was bewegt sich | Bleibt Ozzy wie gezeichnet? | Bedienung | Urteil |
|---|---|---|---|---|
| Knochenfeder (Spine) | Knochen dreht/verschiebt, Form folgt über Gewichte | in Ruhe ja; im Schwung so gut wie die Gewichte | mittel (gekoppelte Regler) | für Ketten (Schwanz) und für Teile ohne Schlüsselformen |
| Parameterpendel (Live2D, Spine-Slider) | ein Parameter mischt gezeichnete Schlüsselformen | **immer** | gut, sobald Schlüsselformen da sind | **Standard für Ohren, Bart, Wangen, Zunge** |
| Weichkörper auf Ankern | die Anker selbst | nein (freie Verformung, Knickgefahr) | schwer zu kontrollieren | nur für Gelee-Effekte, nie an Ozzys Gesicht |
| Filter (Cartoon-Filter, Feder auf Kurven) | jede animierte Größe | ja (wirkt auf Parameter) | ein Regler | als Würze auf Posenübergängen und Körperbewegung |

**Urteil:** Eine Feder (f, ζ, r) als einziger Baustein. Wo Florian Schlüsselformen zeichnet, treibt sie Parameter (Ohr
„hoch/runter/vor/zurück“); wo ein Teil lang und gegliedert ist, treibt sie eine Kette. Weichkörper nur, wo es sichtbar weich sein
soll. In Ruhe ist jeder Versatz null (Schwerkraft wie bei „Gravity Falloff = 1“: die gezeichnete Pose ist die Ruhelage).

---

## 3. Weichkörper für Vektorflächen

### 3.1 PBD und XPBD

Ablauf je Teilschritt h: Geschwindigkeit plus Schwerkraft, Lage vorhersagen, jede Bedingung (Abstand, Fläche, Winkel, Formabgleich,
Kontakt, Gelenk) direkt auf den Lagen erfüllen, Geschwindigkeit aus der Lageänderung zurückrechnen. XPBD (Macklin, Müller,
Chentanez 2016) gibt jeder Bedingung C eine Nachgiebigkeit α (Kehrwert der Steifigkeit) und einen Lagrange-Multiplikator λ:

```
α̃  = α / h²
Δλ = (−C − α̃·λ) / (Σ wᵢ·|∇ᵢC|² + α̃)          wᵢ = 1/mᵢ
xᵢ ← xᵢ + wᵢ·∇ᵢC·Δλ ,   λ ← λ + Δλ
```

Damit hängt die Steifigkeit nicht mehr von Schrittweite und Iterationszahl ab (das große Problem des alten PBD); α = 0 ist eine
harte Bedingung. „Small Steps in Physics Simulation“ (Macklin u. a. 2019) zeigt: Bei gleicher Rechenzeit sind viele Teilschritte
mit je einer Iteration genauer, steifer und weniger künstlich gedämpft als wenige Schritte mit vielen Iterationen. Müller u. a.
(2020) erweitern XPBD auf starre Körper und Gelenke. Müllers „Ten Minute Physics“ zeigt Weichkörper, starre Körper und Gelenke als
kurze JavaScript/HTML-Beispiele (Folgen 10, 12, 22, 25). Grenzen: Reibung ist eine Annäherung (Box2D-Autor Catto berichtet von
Schwierigkeiten mit Reibung in XPBD), sehr schnelle kleine Teile können ohne Zusatz durch dünne Wände tunneln.

**Für uns:** XPBD ist unbedingt stabil. Die „explodierende Haut“ der Kurven-Zeit kann so nicht passieren; eine zu steif gestellte
Feder wird höchstens hart, nie instabil.

### 3.2 Formabgleich (Shape Matching)

Müller u. a. (SIGGRAPH 2005), Standardergebnis: Punkte ohne Netz; je Schritt die beste starre Lage der Ruheform suchen, Ziele
daraus, Punkte mit Steifigkeit α hinziehen.

```
c  = Schwerpunkt der Punkte,  c⁰ = Schwerpunkt der Ruheform
A  = Σ mᵢ·(xᵢ − c)(xᵢ⁰ − c⁰)ᵀ ,   R = Drehanteil von A (Polarzerlegung)
gᵢ = R·(xᵢ⁰ − c⁰) + c ,           xᵢ ← xᵢ + α·(gᵢ − xᵢ)
```

Erweiterungen: β mischt eine affine Verformung zu (Stauchen, Scheren), quadratische Verformung erlaubt Biegen (in 2D fünf Terme), Cluster
erlauben Formen mit Gliedern. Unbedingt stabil, weil kein Punkt über sein Ziel hinausgezogen wird. Entscheidend für uns: **Die
Ruheform darf sich in jedem Bild ändern.** Nimmt man die gerade animierte Pose als Ruheform, wackelt die Fläche nur vorübergehend
und kehrt immer in die Zeichnung zurück.

### 3.3 Gelee-Körper und Spiele, die davon leben

JellyCar lebt von Weichkörperphysik, die Spiel und Stil prägt; die typische Bauart solcher Körper sind Massenpunkte am Umriss, Federn
entlang und quer, eine Formfeder zur Ruheform und ein Innendruck, der die Fläche hält. In XPBD sind das Abstands-, Flächen- und
Formabgleichs-Bedingungen. **LocoRoco** (PSP 2006) ist das wichtigste Spiel-Vorbild für Ozzy: Man steuert nicht die Figur, sondern
**kippt die Welt**; die weichen Blasen rollen in Kipprichtung, springen, wenn man beide Tasten drückt und loslässt, teilen sich und
verschmelzen wieder. Das ist Ozzys Rad-Mechanik und das „liquid drop“-Verschmelzen in einem.

### 3.4 Bézier-Flächen weich machen, ohne Knicke

Florians Erfahrung: Kerben und Knicke sind Fehler. Simuliert man Anker und Griffe als freie Massenpunkte, drehen die beiden Griffe
eines glatten Ankers verschieden, und es entsteht ein Knick. Daraus folgen drei Regeln:

1. **Verformung als glatte Abbildung.** Affine Abbildungen erhalten Geraden und Teilverhältnisse. Die Physik verformt ein Feld
   (Knochen-Gewichte, Formabgleich je Cluster, Verformungsgitter), nicht die Anker einzeln. Der Anker wandert mit dem Feld; seine
   beiden Griffe werden als Richtungen relativ zum Anker mit der **lokalen Abbildung des Feldes am Anker** gedreht und gestreckt.
   Dann bleiben sie auf einer Linie, und ein glatter Anker bleibt exakt glatt, auch wenn das Feld stark verformt. Gerechnet wird auf
   wenigen Kontrollpunkten: Ozzys Bohne als zwei Körperbrocken (wie Rain Worlds Figur) plus ein Ring aus 6 bis 12 Punkten.
2. **Fläche erhalten.** In 2D ist das „Volumen“ die Fläche; eine Flächenbedingung lässt die Bohne beim Aufprall seitlich
   ausweichen. Spine 4.3 macht dasselbe mit volumenerhaltendem scaleY auf Knochen.
3. **Keine Eigenkollision nötig.** Wo sich Ozzys Teile berühren, verschmilzt der Renderer sie ohnehin weich (Abstandsfelder, weiche
   Vereinigung). Die Physik muss Kinn und Brust nicht auseinanderhalten; Überlappung sieht gewollt aus.

Wo Florian Stauchformen zeichnet (Plumps, Landung), treibt eine Feder auf der Vertikalbeschleunigung einfach einen Parameter
„Stauchung“ zwischen seinen Formen (der Prototyp hat dafür schon „plumps“ und „seufzer“ als Zeitfunktionen).

### 3.5 Gegenüberstellung Weichkörper

| Weg | Glätte der Kontur | Bleibt in der Zeichnung | Aufwand | Urteil |
|---|---|---|---|---|
| Parameter-Stauchung (gezeichnete Formen + Feder) | exakt | ja | gering | **erste Wahl für Ozzys Körper** |
| Formabgleich auf Kontrollpunkten + Verformungsfeld | glatt (affin je Cluster) | kehrt zurück (Ruheform = Pose) | mittel | für freies Wabbeln, Aufprall, Gelee-Hindernisse |
| XPBD-Federnetz auf Ankern (Gelee) | Knickgefahr | nein | mittel | nur für Effekte, die wabbelig sein sollen |
| Druckkörper (Fläche halten) | glatt, wenn über Feld | nein | mittel | für Blasen, Bälle, Tropfen |

---

## 4. Gleichgewicht und aktive Ragdolls

### 4.1 Umgekehrtes Pendel, Kipppunkt, Stützstrecke

Der Körper als Masse auf einem masselosen Bein über dem Stützpunkt p, Höhe h konstant (lineares umgekehrtes Pendel):

```
ẍ  = ω₀²·(x − p) ,      ω₀ = √(g/h)
ξ  = x + ẋ/ω₀           (Kipppunkt / Capture Point / extrapolierter Schwerpunkt)
```

Liegt ξ in der Stützfläche, kann die Figur ohne Schritt anhalten; liegt er außerhalb, muss sie nach ξ treten, sonst fällt sie (Pratt
u. a. 2006; Hof u. a. 2005; die Literatur nennt Hofs XCoM und den Capture Point dieselbe Größe). Für einen Vierbeiner in der
Seitenansicht ist die Stützfläche die **Stützstrecke** zwischen hinterster und vorderster Pfote am Boden.

Statisch gilt am Hang mit Neigung α, Stützstrecke L und Schwerpunkthöhe h_S:

```
Kippen:   tan α > (L/2) / h_S          Beispiel L = h_S  →  ab etwa 27°
Rutschen: tan α > μ                    (Haftreibung der Pfoten)
```

Ein echter Hund steht auf leichten Hängen also still. Ozzys gewünschtes Tapsen bergab muss aus einer **schwachen Bremskraft** kommen
(Abschnitt 9.4), nicht aus dem Kippen. Auf Erhöhungen (konvexen Stellen) wird die Stützstrecke kürzer und die Bodennormalen unter
den Pfoten verschieden; dort wird das Balancieren von selbst heikler, ohne Sonderregel.

### 4.2 Voll simulierte Regler: SIMBICON und der simulierte Hund

- **SIMBICON** (Yin, Loken, van de Panne, SIGGRAPH 2007): ein Zustandsautomat aus **Zielposen**; jedes Gelenk folgt seiner Pose mit
  einem PD-Regler; Rumpf und Schwungbein werden in Weltkoordinaten geregelt; das Gleichgewicht hält eine lineare Regel für den
  Fußaufsatz: `θ_soll = θ₀ + c_d·d + c_v·v` (d: Abstand Standfuß–Schwerpunkt, v: Schwerpunkt-Geschwindigkeit; die Hüftmitte dient
  als Ersatz für den Schwerpunkt). Daraus entstehen Gehen in alle Richtungen, Laufen, Hüpfen; Stile entstehen durch Ändern der
  Zielposen. (Formel aus Sekundärquellen, das PDF war nicht lesbar.)
- **Coros u. a., „Locomotion Skills for Simulated Quadrupeds“** (SIGGRAPH 2011): ein physikalisch simulierter Hund mit Schritt, Trab,
  Pass, Galopp, Sprüngen auf und über Hindernisse, Sitzen, Liegen, Aufstehen und Aufrappeln nach einem Sturz; Bausteine: Gang-Graphen,
  zwei Beinrahmen (vorn, hinten), biegsame Wirbelsäule, virtuelle Kräfte über die transponierte Jacobi-Matrix; robust gegen Stöße und
  unebenen Boden, verglichen mit Filmaufnahmen eines Hundes. Die Stile kommen aus Optimierung.
- **Lehre:** Die Zielposen dort entsprechen unseren gezeichneten Posen, und die Fußplatzierungsregel ist billig und gut. Aber ein
  über Gelenkmomente balancierender Vierbeiner wird über Optimierung und Fachwissen eingestellt, nicht von einem Art Director.

### 4.3 Aktive Ragdoll: PD auf eine animierte Zielpose

Jedes Glied wird mit einer Feder auf seine Animationspose gezogen:

```
τ = k_p·(θ_Ziel − θ) − k_d·θ̇ ,     mit Trägheit I:  k_p = I·(2πf)² ,  k_d = 2ζ·I·(2πf)
```

Explizit gerechnet werden hohe k_p instabil; weiche Bedingungen (Box2D v3, Hertz und Dämpfungsverhältnis) und XPBD-Nachgiebigkeit
rechnen dieselbe Feder implizit und bleiben stabil. Darum kann „Spannung“ frei bis 100 % gedreht werden.

**Werkzeuge, die das für Animatoren bedienbar machen:**

- **Unreal Physics Control:** Stärke und Dämpfungsverhältnis je Körper, zur Laufzeit veränderbar, Ziele auf der laufenden Animation.
- **Spine in Unity:** Die Unity-Laufzeit von Spine bringt eine fertige Komponente mit, die aus einem Spine-Skelett eine 2D-Ragdoll
  macht (SkeletonRagdoll2D, mit Beispielszene). Im Spine-Editor selbst gibt es keine Ragdoll; dort endet Physik beim Nachschwingen.
- **Ragdoll Dynamics 3.0 (Maya):** ein „Live Mode“, in dem man Marker im Ansichtsfenster zieht und die Figur physikalisch posiert,
  statt Rig-Regler zu bedienen; laut Herstellerangaben dreimal schneller als über die Rig-Regler. Gedacht ist, Simulationen als
  Schlüssel ins Rig zurückzuschreiben und dort weiterzubearbeiten.
- **Cascadeur:** Schwerpunkt und Stützpunkte („fulcrum points“) als Kern; „AutoPhysics“ zeigt eine physikalisch korrigierte
  Geisterfigur neben der eigenen Animation, die Zeitleiste färbt Phasen ohne Bodenkontakt (ballistisch), mit wenigen und mit vielen
  Stützpunkten; der Animator übernimmt die Korrektur per Knopf oder ändert Posen und Timing; „Prioritätsbilder“ bleiben unangetastet.
  Das ist das beste Vorbild für eine **Röntgenansicht** in Studio.

**Wie Spiele die Figur aufrecht halten:** Die physikalisch saubere Variante regelt Impuls und Drehimpuls über Schwerpunkt und Druckpunkt
(Macchietto, Zordan, Shelton 2009). Die verbreitete Spiele-Variante ist eine **schwache Wurzelfeder** („Hand Gottes“): Ziele in
Weltkoordinaten plus eine einstellbare Aufrecht-Feder; ist sie schwach genug, fällt die Figur bei starkem Ungleichgewicht oder
hartem Treffer (Dynamo, Wrotek u. a. 2006). Foren zu aktiven Ragdolls (Unity, Roblox) beschreiben dasselbe: schlaffe Ragdoll,
dann Kräfte oder Drehmomente, die den Rumpf aufrecht halten.

**Stimmen aus Spielen:**

- *Human: Fall Flat:* Der Entwickler wollte jeden Arm einzeln physikalisch steuern; die Bewegung ist absichtlich ungelenk und
  wackelig, die Physik nach seinen Worten manchmal unvorhersehbar.
- *Wobbledogs:* Die Hunde sind vollständig physikalisch simuliert, weil gebackene Animation nicht dieselbe Lebendigkeit hatte. Der
  Entwickler nennt die Einrichtung der Physik einen Albtraum und will nie wieder ein vollständig physikgetriebenes Spiel machen. Weil
  die Bewegung nicht vorhersagbar ist, kann die Spiellogik nicht garantieren, dass ein Hund einen Ort erreicht; das Verhalten wurde
  deshalb um Reize im Moment gebaut.
- *Euphoria (GTA IV, Red Dead):* eine Bibliothek physikalischer Verhalten (Taumeln, Sturz abfangen, Kopf schützen, Zappeln in der
  Luft); geht dem Abfangen ein Stolpern voraus, versucht die Figur erst, das Gleichgewicht zu halten. Die Lizenzierung endete 2017.

**Lehre:** Für ein Spiel, in dem der Spieler Ozzy **vorsichtig** balanciert, ist Vorhersagbarkeit Pflicht. Vollständige
Ragdoll-Fortbewegung wäre lustig, aber unsteuerbar. Aktive Ragdoll gehört in den Sturz, nicht ins Gehen.

### 4.4 Lernende Regler

DeepMimic (Peng u. a. 2018) lernt physikalische Regler aus Bewegungsaufnahmen; „Mode-Adaptive Neural Networks for Quadruped Motion
Control“ (Zhang, Starke, Komura, Saito 2018) erzeugt aus Hunde-Aufnahmen kinematisch Schritt, Pass, Trab, Galopp, Sprung, Sitzen.
Beides braucht Trainingsdaten, Rechenzeit und eine Lernumgebung; einstellen kann es ein Art Director nicht, und gezeichnete
Cartoon-Posen passen nicht zu Aufnahmen echter Hunde. Nicht unser Weg.

### 4.5 Gegenüberstellung Gleichgewicht und Fortbewegung

| Weg | Lebendigkeit | Steuerbarkeit fürs Spiel | Einstellbar ohne Programmieren | Aufwand | Urteil |
|---|---|---|---|---|---|
| Voll simuliert (SIMBICON/Coros) | hoch, physikalisch echt | mittel | nein (Optimierung, Fachwissen) | sehr hoch | nein |
| Aktive Ragdoll mit Aufrecht-Feder (Gang Beasts, HFF, Wobbledogs) | sehr hoch, sehr komisch | gering | teils | hoch | nur für Stolpern und Sturz |
| **Vereinfachter Körper + Schrittplaner + gezeichnete Posen + Federn** (Rain World, Overgrowth, Gibbon) | hoch | hoch | ja (wenige Regler, Posen) | mittel | **ja, Kern für Ozzy** |
| Reine Animation mit Zustandsautomat (klassisch Spine/Rive) | mittel, wirkt wiederholt | sehr hoch | ja | gering | zu starr für Rad und Hindernisse |
| Lernende Regler | hoch | mittel | nein | sehr hoch | nein |

---

## 5. Prozedurales Gehen auf unebenem, bewegtem Boden

### 5.1 Vorbilder

- **Rain World** (GDC 2016, Jakobsson und Therrien): Die Spielfigur besteht physikalisch aus zwei Kugeln in festem Abstand; sie kann
  rollen, kippen, rutschen, sich durch Röhren quetschen. Gliedmaßen und Schwanz sind nur gezeichnet und bewegen sich prozedural aus
  Körperlage und Eingabe. Der Entwickler arbeitet mit Punkten im Raum statt mit abgespielten Bildern.
- **Overgrowth** (Rosen, GDC 2014): flüssige, reaktive Bewegung aus sehr wenigen Schlüsselposen plus einfacher Prozedur und Physik
  (ein Forenbericht spricht von 13 Schlüsselposen insgesamt; nicht geprüft). Ein Entwicklerbeitrag aus der Entstehungszeit (auf
  ModDB gespiegelt, nur über eine Zusammenfassung gelesen) beschreibt, dass rein prozedurale Animation zu wenig Kontrolle gab; das
  Ergebnis ist eine Mischung aus Schlüsselposen, Prozedur und Physik.
- **Gibbon: Beyond the Trees:** erst der Schwerpunkt (Schwung bleibt erhalten, ballistische Flugbahnen werden geplant), dann Rigs
  von grob nach fein (2 Punkte, 5 Punkte, 14 Punkte mit IK, dann das Skelett); jede Stufe ist Bedingung für die nächste, so bleiben
  Schwung und Handkontakt stetig. Toleranzen für unperfekte Griffe; abrupte Schübe oder Stopps wirken unphysikalisch.
- **Spore** (Hecker u. a., SIGGRAPH 2008): Animationen werden einmal relativ zu Körpermerkmalen geschrieben und zur Laufzeit auf
  beliebige, von Spielern gebaute Körper mit beliebig vielen Beinen übertragen, inklusive prozeduralem Gang. Das ist das Vorbild für
  „unendlich erweiterbar“: Der Schrittplaner darf keine Beinzahl und keine Figur kennen.

### 5.2 Der Schrittplaner

Je Bein:

1. **Ruhepunkt:** der Punkt unter Schulter bzw. Hüfte auf dem Boden (auf dem Rad: entlang der Linie zum Radmittelpunkt).
2. **Standpfote:** bleibt fest **in Bodenkoordinaten**, auf dem Rad also in Radkoordinaten; sie dreht mit dem Rad und rutscht nie
   (außer die Haftung reißt, siehe Stolpern).
3. **Auslöser für einen Schritt** (der erste, der zutrifft):
   - Takt der Gangart (Rhythmus, Fußfolge, siehe unten),
   - Abstand Pfote–Ruhepunkt größer als die Reichweite (die Figur ist über die Pfote hinausgelaufen),
   - der Kipppunkt ξ verlässt die Stützstrecke (Notschritt in Richtung ξ).
4. **Zielpunkt** nach der Raibert-Regel: `p = Ruhepunkt + (T_Stand/2)·v + k·(v − v_soll)`. Der erste Teil setzt den Fuß so, dass
   das Bein in der nächsten Standphase gleich weit vor und zurück schwingt; der zweite bremst oder beschleunigt. Der Zielpunkt wird
   auf die Bodenkontur projiziert und gegen Hindernisse geprüft (Abstandsfeld der Formen): Liegt er in einem Hindernis, wird er
   versetzt oder die Schwungbahn höher.
5. **Schwungbahn:** von Abheben bis Aufsetzen eine Kurve, deren Höhe und Form Florian als gezogene Bahn einstellt (gezeichnete
   Pfotenbahn statt Formel), mit Zeitkurve (abheben schnell, aufsetzen weich).
6. **Körper:** Höhe und Neigung des Rumpfs folgen den Standpfoten über eine Feder (vorne höher als hinten → Rumpf neigt sich),
   dazu das Wippen aus den gezeichneten Gangposen.

**Gangarten des Hundes** (als Fußfolge-Diagramm im Editor):

| Gangart | Takte | Fußfolge | Pfoten am Boden | Für Ozzy |
|---|---|---|---|---|
| Schritt | 4 | eine Pfote nach der anderen (üblich: hinten links, vorn links, hinten rechts, vorn rechts) | drei | Tapsen, Balancieren |
| Pass | 2 | Beine einer Seite gemeinsam | zwei | müdes, faules Gehen (Welpen, schwere Hunde) |
| Trab | 2 | diagonale Paare gemeinsam | zwei (beim fliegenden Trab kurz keine) | zügiges Laufen |
| Kanter / Galopp | Kanter 3, Galopp 4; unsymmetrisch | Kanter: hinten, dann hinten + vorn diagonal, dann vorn; Galopp mit Schwebephase | wechselnd, zeitweise keine | Losrennen, Panik vor dem Sturz |

In der Seitenansicht sieht man nahe und ferne Beine; der Planer behandelt alle vier, die fernen sind nur anders gezeichnet.

### 5.3 Beine: IK, das nicht durch den Boden dreht

- **Zwei-Knochen-IK** wie in Spine: Beugerichtung, **Weichheit** (ohne sie schnappt das Bein kurz vor voller Streckung gerade, was
  unnatürlich aussieht; mit Weichheit wird es zur Streckung hin langsamer) und Dehnen. Spine nennt ausdrücklich Füße auf unebenem
  Boden als Anwendung.
- **Für Ozzy besser:** Das „Rückgrat“ des Prototyps ist schon ein Gummischlauch-IK: eine Bézier von der Hüfte zur Pfote, die ihre
  Länge behält und sich biegt, statt zu knicken. Der Schrittplaner liefert nur den Pfotenpunkt und die Sohlenrichtung (aus der
  Bodennormalen), das Rückgrat macht daraus das Bein. Kein Knie kann umschnappen, weil es keins gibt.
- **Boden als harte Grenze:** Pfote und Unterschenkel bekommen eine Kontaktbedingung gegen das Abstandsfeld des Bodens. Damit gilt
  Florians Satz „nie durch den Boden“ auch bei Physik und Stürzen.

### 5.4 Hindernisse, Stufen, Sprung, bewegter Boden

- **Überlaufen:** Ist ein Hindernis niedriger als die Schritthöhe, setzt der Planer die Pfote darauf, der Rumpf steigt über die
  Feder mit. Höher → Hüpfer oder Sprung.
- **Sprung nach Höhe und Dauer statt Schwerkraft und Startgeschwindigkeit** (Pittman, GDC 2016: designerfreundliche Eingaben wie
  Höhe und Weite, dazu schnelleres Fallen nach dem Scheitel und Höhe nach Tastendauer):

  ```
  v₀ = 2h / t_Scheitel        g_Sprung = 2h / t_Scheitel²
  ```

  Florian zieht die Bahn (Scheitelhöhe, Weite), Studio rechnet v₀ und g.
- **Bewegter Boden:** Wer vom drehenden Rad abspringt, behält die Bahngeschwindigkeit der Stelle (ω·R) und fliegt tangential weiter.
  Bei der Landung entscheidet der Geschwindigkeitsunterschied zwischen Pfoten und Boden über weiches Landen, Rutschen oder Stolpern.
  In Weltkoordinaten gerechnet stimmt das von selbst, ohne Scheinkräfte.

---

## 6. Stolpern und lustiges Hinfallen

### 6.1 Auslöser (alle physikalisch messbar, keine Sonderregel je Figur)

| Auslöser | Messgröße |
|---|---|
| Hängenbleiben | Schwungpfote trifft ein Hindernis, bevor sie aufsetzt |
| Rutschen | nötige Bremskraft größer als die Haftung (Boden beschleunigt unter den Pfoten zu stark) |
| Überrennen | nötiges Schritttempo größer als das höchste (Schrittfrequenz × Schrittlänge reicht nicht) |
| Überkippen | Kipppunkt ξ außerhalb dessen, was ein Schritt erreichen kann |
| Harte Landung | Aufprallgeschwindigkeit oder Gleitgeschwindigkeit bei der Landung zu groß |

### 6.2 Ablauf

1. **Fangversuch:** schnelle, länger werdende Fangschritte zum Kipppunkt, Vorderpfoten greifen nach vorn, Kopf hoch, Schwanz als
   Gegengewicht (Euphorias Taumeln und Abfangen im Kleinen).
2. **Entscheidung:** Kommt ξ wieder in Reichweite, fängt er sich (mit einer komischen Wackel-Pose); sonst Sturz.
3. **Sturz:** Spannung fällt (z. B. von 100 % auf 30 % in 0,1 s), Ziel ist eine gezeichnete Purzel-Pose; die zwei Körperbrocken rollen
   auf der Rundung des Rads von selbst.
4. **Aufprall:** Stauchung über Feder oder Flächenbedingung, Ohren und Bart schlagen nach.
5. **Liegen:** Spannung nahe null, kurze Ruhe, gezeichnete Liegepose als schwaches Ziel (Zunge raus, Sterne: Effekte).
6. **Aufstehen** (Abschnitt 7) und **Schütteln:** eine kurze, schnelle Drehbewegung des Körpers; Ohren, Bart und Schwanz fliegen über
   ihre Federn. Billig, typisch Hund, und zeigt die Sekundärphysik wie nichts sonst.

### 6.3 Was es lustig macht

- **Der Moment davor:** eine sehr kurze Zeitlupe beim Auslöser (das klassische Zögern in der Luft, bevor es kracht), dann volle
  Geschwindigkeit. Als Regler „Zeitlupe beim Stolpern“ (Dauer, Faktor).
- **Übertreibung mit Maß:** Vorgriff r < 0 (Ausholen) und Überschießen auf den Posenfedern; Cartoon-Filter als Würze.
- **Abwechslung ohne Willkür:** Physik erzeugt jedes Mal einen etwas anderen Sturz; zusätzlicher Zufall nur mit festem Startwert,
  damit derselbe Sturz im Prüfstand wiederholbar ist.
- **Folgeaktion:** Ein Sturz, nach dem Ozzy sich schüttelt und beleidigt weitergeht, ist witziger als ein Sturz allein.

---

## 7. Übergänge zwischen Animation und Physik

### 7.1 Hinein in die Ragdoll

- Alle Körper starten **mit Lage und Geschwindigkeit der Animation** (Geschwindigkeit aus den letzten beiden Teilschritten). Sonst
  friert die Figur im ersten Bild ein oder springt.
- Die Spannung sinkt über eine Kurve, nicht schlagartig; die Ziele wechseln auf die Sturzpose. Unreal regelt mit den
  Geschwindigkeits-Multiplikatoren zusätzlich, ob ein Körper der Bewegung der Animation folgt oder sich gegen sie stemmt.

### 7.2 Heraus und Aufstehen

1. **Ruhe erkennen:** Bewegungsenergie unter einer Schwelle für eine Mindestzeit.
2. **Lage einordnen:** Rücken, Seite, Bauch (Ausrichtung des Rumpfs, welche Seite oben ist).
3. **Aufsteh-Folge wählen:** die gezeichnete Folge, deren erste Pose der Lage am nächsten ist. Zordan u. a. (SIGGRAPH 2005) suchen
   so in einer Bewegungsdatenbank die passendste Erholung nach einem Stoß und lassen die Simulation dorthin laufen.
4. **Wurzel ausrichten:** Die Aufsteh-Folge beginnt dort, wo der Körper liegt.
5. **Zurück zur Animation:** entweder **physikalisch** (die Spannung wird auf die Aufsteh-Posen hochgefahren; der Körper wird
   hineingezogen, nichts springt; am Ende auf rein kinematisch umschalten, wenn der Fehler klein ist) oder **kinematisch** (die
   letzte Ragdoll-Pose festhalten, Unreal nennt das „Pose Snapshot“, und mit einem Trägheits-Übergang in die Aufsteh-Folge
   überblenden). Für Studio empfehle ich den physikalischen Weg, weil er dieselbe Spannung benutzt wie alles andere.

### 7.3 Posenübergänge allgemein

- **Trägheits-Übergang** (Bollo, GDC 2018, Gears of War 4): Statt zwei Zustände während des Übergangs zu rechnen, wird der Versatz
  zwischen alt und neu beim Wechsel gespeichert und abgebaut; es wird nur noch ein Zustand ausgewertet. Holden baut den Versatz mit
  einer kritisch gedämpften Feder ab (ohne feste Dauer, mit möglichem Überschwingen).
- **Dead Blending** (Holden): die alte Bewegung mit abklingender Geschwindigkeit weiterlaufen lassen und überblenden; braucht
  nur Pose und Geschwindigkeit; Nachteile: kann Einzelheiten verwischen und bei langen Übergängen unnatürlich werden.
- **Für Studio:** Gezeichnete Übergänge (Florian formt sie selbst) haben Vorrang. Wird ein Übergang unterbrochen, nimmt ein
  Trägheits-Übergang den Versatz auf. Physik liegt immer obenauf und darf in jedem Übergang mit einer Spannungskurve gedämpft oder
  verstärkt werden. Der Prototyp macht das im Kleinen schon (kritisch gedämpfte Feder auf den Gewichten, Ausklang unterbrochener
  Zusatzbewegungen).

---

## 8. Technik: Löser, Takt, Determinismus

### 8.1 Physiklöser für Web, Mac, iPad, iPhone

| Option | Was | Stärken | Schwächen | Für uns |
|---|---|---|---|---|
| **Eigener XPBD-Kern** (TypeScript) | Teilchen, starre Körper, Bedingungen mit Nachgiebigkeit, viele Teilschritte | ein Löser für Federn, Ketten, Weichkörper, Ragdoll, Kontakte; arbeitet direkt auf unseren Daten (Parameter, Knochen, Kontrollpunkte); unbedingt stabil; klein; Spannung = Nachgiebigkeit | Kontakte, Reibung, schnelle Teile selbst bauen und prüfen; kein fertiges Stapeln vieler Kisten | **Kern für die Figur und die Demo-Welt** |
| **Box2D v3** (C; als WASM oder als Phaser Box2D, JavaScript-Port von 3.0, MIT, unter 70 KB gezippt) | starre Körper, Soft-Step-Löser (weiche Bedingungen mit Hertz/Dämpfung, Teilschritte, Entspannen), Kontinuierliche Kollision, Gelenke mit Federn und Motoren | Industriestandard in 2D, sehr robuste Kontakte und Stapel, einzeln mehr als doppelt so schnell wie 2.4 | nur starre Körper; Federn an Formen und Parametern brauchen trotzdem eigenen Code; JS-Port auf Stand 3.0 | **Weltlöser für spätere Spiele** mit vielen losen Dingen |
| **Rapier 2D** (Rust → WASM) | starre Körper, Gelenke (auch Multikörper), Motoren als PD mit Kraftgrenze, Schnappschüsse | laut Dokumentation plattformübergreifend deterministisch (wenn die Eingaben es sind; `Math.sin` kann je Plattform abweichen) | WASM-Start asynchron, Datenaustausch je Bild; nur starre Körper | Alternative zu Box2D, wenn Wiederholungen über Geräte zählen |
| Planck.js | TypeScript/JS-Neuschrieb von Box2D (alte Generation) | reines JS, gepflegt | älterer Löser | nein |
| Matter.js | eigene JS-Engine | einfach | weniger robust, nur starre Körper | nein |
| Spine- oder Rive-Laufzeit | Physik der Fremdlaufzeit (Rive: Physik nur über eigene Skripte) | fertig | fremdes Datenmodell, kein Verschmelzen, keine Welt | nein |

**Empfehlung:** Für alles, was an der Figur hängt, und für die Welt der Demo (ein Rad, ein paar Hindernisse, einige lose Dinge)
ein eigener XPBD-Kern. Er macht „alles funktioniert gleich“ technisch wahr: Jede Feder, jedes Gelenk, jeder Kontakt ist eine
Bedingung mit Tempo und Wippen. Von Anfang an eine schmale Schnittstelle zur Welt vorsehen, damit Box2D v3 (bzw. Rapier) später
als Weltlöser andocken kann, wenn ein Spiel Stapel und viele schnelle Körper braucht. Die Figur bleibt dann im eigenen Kern, die
Kopplung läuft über Kontaktkräfte an Pfoten und Körperbrocken.

### 8.2 Takt und Determinismus

- **Fester Takt:** Physik in Teilschritten von 1/240 s (wie der Prototyp), Darstellung zwischen den letzten beiden Zuständen
  interpoliert (so macht es die Live2D-Laufzeit). Dadurch sieht es auf dem iPhone 16 (60 Hz) und dem Mac (120 Hz) gleich aus.
  Lange Pausen (Tab im Hintergrund) begrenzen: Restzeit über einer Schwelle verwerfen statt nachzurechnen.
- **Scrubben mit Physik:** wie Spines „Deterministic“: beim Scrubben vom Anfang des Clips mit festem Takt nachrechnen. Für eine
  Figur ist das billig. So zeigt jedes Bild immer dasselbe, und Florian kann an Stellen mit Physik Schlüssel setzen.
- **Wiederholbarkeit:** gleicher Startwert, gleiche Eingaben, gleicher Takt → gleicher Ablauf auf demselben Gerät. Über Browser
  hinweg nur, wenn Winkelfunktionen selbst gerechnet werden (Rapier warnt vor genau diesem Punkt).
- **Zurücksetzen:** Wird die Figur versetzt (Neustart, Szenenwechsel), Bezugspunkte der Federn mitversetzen (Spines
  Teleport-Hilfen), sonst peitschen Ohren nach.

### 8.3 Kosten

Ozzy hat grob 15 Körper (zwei Rumpfbrocken, Kopf, vier Beine aus je zwei Gliedern, Schwanzkette) und einige Dutzend Kontrollpunkte
für Weichkörper und Federn. Bei 240 Teilschritten je Sekunde ist das nach Erfahrung mit solchen Lösern ein Bruchteil einer
Millisekunde je Bild in JavaScript. Das ist eine Schätzung; die erste Etappe misst es auf dem iPhone 16 (Kriterium: Physik unter
1 ms je Bild bei 60 Hz).

---

## 9. Empfehlung: Architektur für Ozzy auf dem Rad

### 9.1 Leitidee: Ziel, Feder, Wirklichkeit

- **Animation gibt Ziele:** Posen, Übergänge, Gangposen, Sturz- und Aufstehposen, Schlüsselformen der Ohren. Alles, was Florian
  zeichnet.
- **Physik ist die Wirklichkeit:** Schwerpunkt, Schwung, Kontakt mit dem Rad, Stöße, Nachschwingen.
- **Federn verbinden beides:** Jedes Teil folgt seinem Ziel mit einer Feder (Tempo, Wippen, Vorgriff) und einer Spannung. Spannung
  100 % = exakt animiert, 0 % = schlaff.
- **Ruhe = Zeichnung:** Physik schreibt nur Versätze und Parameter, die in Ruhe null sind.
- **Physik meldet zurück:** Tempo wählt Gangart und Takt, Beschleunigung neigt den Körper, Landestoß treibt die Stauchung, ein
  Auslöser startet „Stolpern“. Die Prozedur (Schrittplaner, IK) übersetzt zwischen beiden.

**Was ist was:**

| Bereich | Animation (gezeichnet) | Prozedur (gerechnet, ohne Kräfte) | Physik (Masse, Kräfte) |
|---|---|---|---|
| Form und Ausdruck | Posen, Übergänge, Gesicht | Mischung nach Zustand | Stauchung als Abweichung |
| Gehen | Gangposen, Form der Pfotenbahn | Schrittzeitpunkt, Zielpunkt, Bein-IK, Rumpfhöhe und -neigung | Schwung, Hangabtrieb, Bremskraft, Rutschen |
| Gleichgewicht | Lehn- und Wackelposen | Kipppunkt, Schrittauslöser | Aufrecht-Feder mit Kraftgrenze |
| Sprung | Ausholen, Flug, Landung | Absprungzeitpunkt, Bahn aus Höhe und Dauer | Flugbahn, Schwung vom Rad, Landestoß |
| Nebenteile | Schlüsselformen von Ohren, Bart, Wangen | – | Federn treiben Parameter; Kette für den Schwanz |
| Sturz | Purzel-, Liege-, Aufstehposen | Lage erkennen, Aufsteh-Folge wählen | aktive Ragdoll mit Spannungskurve |
| Welt | Formen der Hindernisse | – | Rad, Kontakte, lose Dinge |

### 9.2 Schichten

| Schicht | Aufgabe | Art | Takt | Florian stellt ein |
|---|---|---|---|---|
| 0 Eingabe und Rad | Finger dreht das Rad über eine Feder mit Kraftgrenze | Physik | Teilschritt | Radgewicht, Reibung, Rückwirkung von Ozzy |
| 1 Absicht | Zustand, Wunschtempo, Launen („bleibt stehen“, „rennt los“), Sprungwunsch | Spiellogik (Zustandsautomat) | Bild | Zustände, Launen, Übergänge |
| 2 Körper | Schwerpunkt: Hangabtrieb, begrenzte Bremskraft, Sprungbahn, Kontakt | Physik (vereinfachter Körper) | Teilschritt | Kraft, Haftung, Gewicht, Sprunghöhe und -dauer |
| 3 Schritte | Pfoten setzen, Gangart, Schwungbahn, Stolper-Auslöser | Prozedur | Teilschritt | Fußfolge, Schrittlänge, Schritthöhe, Mut |
| 4 Posen | Mischung der gezeichneten Posen nach Zustand und Gangphase; Übergänge | Animation | Teilschritt (nur Ziele: Knochen, Parameter), Bild (Formen) | alle Posen und Übergänge |
| 5 Anpassung | Beine per Rückgrat zu den Pfoten, Rumpfhöhe und -neigung, Blick | Prozedur | Teilschritt | Grenzen, Weichheit |
| 6 Spannung | Glieder folgen ihren Zielen; im Sturz aktive Ragdoll | Physik (Gelenke) | Teilschritt | Spannung je Pose und Teil, Kurven |
| 7 Nachschwingen | Ohren, Bart, Wangen, Schwanz, Stauchung, Kopfstabilisierung | Physik (Federn auf Parameter/Ketten) | Teilschritt | Tempo, Wippen, Vorgriff, Grenzen |
| 8 Zeichnen | Formen verformen, verschmelzen, Shader | Darstellung | Bild | Look |

### 9.3 Ablauf je Bild

Einmal je Bild:

1. Eingabe lesen (Finger am Rad, Tippen).
2. Absicht liest Fühler (Neigung unter Ozzy, Tempo, Hindernis vorn, Zustand) und setzt Sollwerte (Wunschtempo, Gangart, Spannung,
   Sprung).

Dann je Teilschritt (1/240 s):

3. Rad: Feder zum Fingerwinkel mit Kraftgrenze; optional Rückwirkung von Ozzys Beinkräften.
4. Körper: Schwerpunkt integrieren (Schwerkraft, Beinkraft mit Grenze, Kontakte), Sprung ballistisch.
5. Schrittplaner: Stand- und Schwungpfoten, Zielpunkte, Auslöser für Stolpern.
6. Posen-Ziele mischen (Zustand, Gangphase; nur Knochen und Parameter), dann IK und Rumpfanpassung → Zielskelett und Zielparameter.
7. Spannung: physikalische Glieder zu den Zielen ziehen (im Normalfall hoch, also praktisch kinematisch; im Sturz niedrig).
8. Nachschwingen: Federn auf Ohren, Bart, Schwanz, Stauchung.

Nach dem letzten Teilschritt: Formen aus Skelett und Parametern bauen, zwischen den letzten beiden Zuständen interpolieren,
verschmelzen und zeichnen. Die Reihenfolge ist Absicht: Nachschwingen kommt zuletzt (wie in Spine und VTube Studio), damit es auf
allem anderen aufsitzt.

### 9.4 Ozzys Körpermodell

- **Rumpf als zwei Körperbrocken** (Brust und Becken, wie Rain Worlds Figur), verbunden durch eine steife, leicht nachgiebige
  Abstandsbedingung mit Biegefeder: Damit kann die Bohne kippen, rollen, sich beim Aufprall stauchen; der **Kopf** ist ein dritter
  Brocken an einer Feder (Kopfstabilisierung: Hunde halten den Kopf ruhig, Feder mit Ziel in Weltrichtung).
- **Beine als Federbeine:** Solange er steht oder geht, tragen die Beine den Rumpf über Federn zum Boden (Höhe aus den
  Gangposen), wie bei Spiele-Steuerungen mit schwebendem Körper und Federstrahl nach unten. Die gezeichneten Beine folgen über das
  Rückgrat den Pfoten.
- **Längs des Bodens ein Wagen mit begrenzter Kraft** (das macht das Tapsen):

  ```
  a_Hang = g·sin α                                  (α: Neigung unter Ozzy, auf dem Rad = sein Winkel vom Scheitel)
  a_Bein = begrenze( k·(v_soll − v), ± a_max·cos α ) (a_max: Bremskraft in g, „Standfestigkeit“)
  v     ← v + (a_Hang + a_Bein)·h
  ```

  Stehen bleiben kann er, solange `tan α ≤ a_max/g`. Mit a_max = 0,15 g (Startwert) heißt das: Bis etwa 8,5° vom Scheitel steht er,
  darüber rollt sein Schwerpunkt bergab los, der Kipppunkt verlässt die Stützstrecke, der Planer muss Schritte setzen. Je weiter vom
  Scheitel, desto schneller. Überschreitet das nötige Tempo das höchste Schritttempo → Stolpern. Der Spieler hält ihn, indem er das
  Rad so dreht, dass Ozzy nahe am Scheitel bleibt (Laufband). Auf dem Rad gilt für Ozzys Winkel φ vom Scheitel:
  `φ̇ = ω_Rad + v/R` (v: Laufgeschwindigkeit der Pfoten relativ zur Radoberfläche, R: Radradius); hält der Spieler ω_Rad·R ≈ −v,
  bleibt Ozzy oben und läuft auf der Stelle.
- **Eigener Kopf:** Die Absicht verändert nur Sollwerte: Bocken = v_soll 0 und höhere Bremskraft (stemmt die Pfoten; reißt die Haftung
  trotzdem, rutscht er mit gestemmten Pfoten, eine gezeichnete Pose); Schnüffeln = Stopp, der Spieler muss das Rad still halten;
  Losrennen = v_soll springt hoch, Gangart Galopp. Die Physik bleibt immer dieselbe.
- **Rückwirkung aufs Rad** (Entscheidung offen): Physikalisch korrekt drückt jeder Beinschub das Rad entgegen (Laufrad-Gefühl).
  Wie stark, hängt am Verhältnis von Radträgheit zu Ozzys Masse; als Regler „Radgewicht“.

### 9.5 Rad und Welt

- **Rad** als starrer Körper mit Drehachse; der Finger zieht über eine Feder (Startwerte f ≈ 4 Hz, ζ ≈ 1) mit Grenze der
  Winkelbeschleunigung. Trägheit macht vorsichtiges Drehen zur Fähigkeit.
- **Hindernisse** sind Vektorformen, die am Rad hängen; Kollision über ihr Abstandsfeld (dieselben Formen, die der Renderer
  zeichnet). Die Formen geben Masse und Schwerpunkt aus ihrer Fläche.
- **Lose Dinge** (Ball, Knochen, Wackelpudding) als eigene Körper im selben Löser.
- **Alles in Weltkoordinaten:** Abspringen erbt die Bahngeschwindigkeit, Landen prüft den Unterschied; keine Scheinkräfte nötig.

### 9.6 Zustände und Übergänge

| Zustand | Physik | Animation | Wechsel wenn |
|---|---|---|---|
| Stehen | Körper auf Federbeinen, Haltekraft | Standpose, Atmen, Blick | Hangabtrieb > Bremskraft, Laune |
| Tapsen/Gehen | Wagen, Schrittplaner | Gangposen nach Phase | Tempo-Schwellen der Gangarten |
| Bocken | hohe Bremskraft, Rutschen möglich | Stemm-Pose | Laune endet, Haftung reißt |
| Springen | ballistisch, Schwung vom Rad | Ausholen, Flug, Landung | Sprungwunsch oder Hindernis |
| Stolpern | Fangschritte zum Kipppunkt | Taumel-Posen | Auslöser aus 6.1 |
| Fallen | aktive Ragdoll, Spannung niedrig | Purzel-Pose als Ziel | Fangen misslingt |
| Liegen | fast schlaff | Liegepose | Ruhe erkannt |
| Aufstehen | Spannung steigt auf Aufsteh-Posen | Aufsteh-Folge je Lage | Folge fertig |
| Schütteln | schnelle Körperdrehung, Federn fliegen | Schüttel-Pose | nach Aufstehen oder Nässe |

### 9.7 Was im Editor einstellbar sein muss

Grundsatz: wenige Regler, jeder mit genau einer Wirkung; was sich zeigen lässt, liegt auf der Figur statt in einem Feld; alles hat
eine automatische Voreinstellung.

| Gruppe | Einstellung | Darstellung | Automatisch |
|---|---|---|---|
| Masse | Schwerpunkt, Gewicht | Punkt auf der Figur (ziehbar), Regler leicht–schwer | aus den Flächen der Formen |
| Feder je Teil | Tempo, Wippen, Vorgriff, Schwerkraft-Anteil, Grenzen, Ziel (Knochen oder Form-Parameter) | drei Regler, Grenze als Bogen auf der Figur | Vorlagen: Ohr, Schlappohr, Bart, Schwanz, Bauch, Stauchung |
| Spannung | je Pose und Teil, Kurve in Übergängen | Farbe auf der Figur (fest bis locker), Kurve an der Zeitleiste | 100 % beim Gehen, Sturzkurve vorgegeben |
| Gang | Fußfolge je Gangart, Schrittlänge, Schritthöhe, Tempo-Schwellen | Balken je Pfote über einen Zyklus; Pfotenbahn als ziehbare Kurve | Hunde-Gangarten |
| Gleichgewicht | Bremskraft, Haftung, Mut (Spielraum des Kipppunkts), Tollpatschigkeit | Regler; Röntgenansicht zeigt Wirkung | Startwerte |
| Sprung | Höhe, Dauer, Ausholen, Landung | Bahn ziehen | aus Pose „Ausholen“ und „Landung“ |
| Sturz | Auslöser-Schwellen, Sturz- und Liegeposen, Aufsteh-Folgen je Lage, Zeitlupe | Posen wie überall; Schwellen als Linien im Prüfstand | eine Folge je Lage |
| Welt | Rad (Radius, Gewicht, Reibung, Rückwirkung), Schwerkraft, Wind zum Testen | auf der Bühne | Startwerte |

Dazu drei **Charakter-Regler**, die mehrere Werte gemeinsam verschieben und sich aufklappen lassen: *schwer–leicht* (Tempo der
Federn, Stauchung, Sprung), *fest–wabbelig* (Wippen, Spannung der Nebenteile), *geschickt–tollpatschig* (Bremskraft, Mut,
Streuung der Schritte, Stolperschwellen). Ob diese Bündelung trägt, muss am Prüfstand gezeigt werden.

**Startwerte zum Prüfen** (nicht gemessen): Ohren f 2,5 Hz, ζ 0,35; Bart und Wangen f 4 Hz, ζ 0,45; Schwanz als Kette f 2 Hz,
ζ 0,3 (Spitze weicher); Stauchung f 5 Hz, ζ 0,5; Kopfstabilisierung f 6 Hz, ζ 1; Spannung im Sturz 30 %, beim Liegen 5 %, beim
Aufstehen in 0,4 s auf 100 %.

### 9.8 Prüfstand im Editor

- **Schubsen** (Figur anklicken und ziehen, loslassen), **Schütteln**, **Rad drehen** mit der Maus oder dem Finger, **Wind**.
- **Röntgen:** Schwerpunkt, Stützstrecke, Kipppunkt (rot, wenn außerhalb), Pfotenbahnen, Kräfte als Pfeile; Zeitleiste färbt
  Phasen ohne Bodenkontakt wie Cascadeur.
- **Zeitlupe, Einzelschritt, Wiederholen** (gleicher Startwert).
- **Aufnehmen:** eine Physik-Aufnahme wird zu Schlüsseln in der Zeitleiste, die Florian bearbeiten kann (wie das Zurückschreiben
  aufs Rig in Ragdoll Dynamics oder das Übernehmen in Cascadeur). Im Spiel bleibt Physik live.
- **Ohr greifen:** ein Teil mit dem Finger packen und schnippen (wie Greifen und Posieren bei PhysBones).

### 9.9 Etappen mit sichtbaren Proben

| Etappe | Inhalt | Probe (vorher festgelegt) |
|---|---|---|
| 1 | Feder-Baustein (f, ζ, r), Prüfstand mit Schubsen und Schütteln, Ohren/Bart als Parameter, Schwanz als Kette | Ozzy wird geschubst: Ohren schwingen nach und stehen danach **exakt** wie gezeichnet; Physik unter 1 ms je Bild auf dem iPhone 16 |
| 2 | Rad, Körpermodell (Brocken, Federbeine, Wagen mit Bremskraft), Schrittplaner, Rückgrat-Beine | oben steht er still; Rad 15° gedreht → er tapst bergab; Pfoten rutschen nie, kein Bein durch den Boden |
| 3 | Gangarten, Fußfolge, Rumpfwippen, Stolpern mit Fangschritten | Rad schnell gedreht → er stolpert und fängt sich bzw. nicht, ohne Sprung in der Form |
| 4 | Sprung, Stufen, Hindernisse | kleiner Stein wird überlaufen, größerer übersprungen; Absprung vom drehenden Rad fliegt tangential |
| 5 | Sturz als aktive Ragdoll, Liegen, Aufstehen je Lage, Schütteln | drei Stürze in drei Lagen, jedes Mal Aufstehen ohne Sprung |
| 6 | Weichkörper: Stauchung der Bohne, Gelee-Hindernis | Landung staucht flächentreu, keine Kerbe, kein Knick |
| 7 | Aufnehmen in Schlüssel, Wiederholen | dieselbe Aufnahme zweimal abgespielt ist bildgleich |

---

## 10. Gegenüberstellungen kompakt

| Frage | Möglichkeiten | Urteil |
|---|---|---|
| Wie wird Nachschwingen beschrieben? | Spine (Trägheit, Stärke, Dämpfung, Masse), Live2D (Dauer, Schwingfreude, Reaktion, Abklingen), PhysBones (Pull, Spring, Stiffness …), Frequenz + Dämpfungsverhältnis (+ Vorgriff) | **Frequenz, Dämpfung, Vorgriff**: unabhängig, physikalisch, deckt Ausholen und Überschießen ab |
| Worauf wirkt Nachschwingen? | Knochen, Parameter zwischen Schlüsselformen, freie Anker | **Parameter** für Gesichtsteile, Knochenketten für lange Teile, freie Anker nie im Gesicht |
| Wie werden Vektorflächen weich? | Parameter-Stauchung, Formabgleich mit Verformungsfeld, Federnetz auf Ankern, Druckkörper | Parameter zuerst, Formabgleich auf Kontrollpunkten für freies Wabbeln; nie Anker einzeln |
| Wie geht Ozzy? | voll simuliert, aktive Ragdoll, vereinfachter Körper + Prozedur + Posen, reine Animation, lernend | **vereinfachter Körper + Schrittplaner + Posen + Federn** |
| Wann tritt er? | fester Takt, Abstand zur Ruhelage, Kipppunkt | Takt für den Rhythmus, Abstand gegen Abdriften, Kipppunkt für Notschritte |
| Warum tapst er bergab? | Kippen (echt, erst ab ~27°), Charakter-Regel, begrenzte Bremskraft | **begrenzte Bremskraft** (physikalisch, ein Regler), Charakter über Launen obenauf |
| Wie fällt er? | Physik-Wurzel + gezeichnete Sturzposen, aktive Ragdoll mit Spannungskurve | aktive Ragdoll mit Spannung auf gezeichnete Ziele (Etappe 5); bis dahin Wurzel + Posen |
| Wie kommt er zurück? | Pose festhalten + Überblenden, Spannung hochfahren | Spannung hochfahren auf die gewählte Aufsteh-Folge |
| Welcher Löser? | eigener XPBD-Kern, Box2D v3, Rapier, Planck, Matter | **eigener XPBD-Kern**; Box2D v3 bzw. Rapier als späterer Weltlöser |
| Physik in Schlüssel backen? | nie (Spine), immer, auf Wunsch | **auf Wunsch** („Aufnehmen“); im Spiel live |

---

## 11. Offene Fragen an Florian

1. **Hang:** Soll Ozzy auf leichter Neigung stehen bleiben können (Bremskraft-Schwelle, Vorschlag etwa 8° bis 10° vom Scheitel),
   oder soll er schon bei der kleinsten Neigung lostapsen?
2. **Rad:** Soll Ozzys Gewicht das Rad mitdrehen (Laufrad, physikalisch korrekt, schwerer zu spielen), oder dreht nur der Spieler?
3. **Nachschwingen:** Nur zwischen seinen gezeichneten Formen (immer exakt), oder darf an manchen Teilen auch frei verformt werden
   (lebendiger, aber nicht mehr genau seine Zeichnung)?
4. **Sturz:** Schlaff-physikalisch (jedes Mal anders, sehr komisch) oder gezeichnet mit Physik nur in der Bahn (vorhersehbarer)?
   Vorschlag: beide im Prüfstand nebeneinander zeigen.
5. **Springen:** auf Tippen des Spielers oder von selbst vor Hindernissen, wenn das Tempo passt?
6. **Beine:** Gehen alle vier Beine in der Seitenansicht eigene Schritte (nah und fern versetzt), wie bei einem echten Hund?
7. **Wiederholungen:** Braucht das Spiel Aufnahmen oder Geister, die auf anderen Geräten genau gleich ablaufen?
8. **Charakter-Regler:** Möchte er die Physik über wenige Charakter-Regler (schwer–leicht, fest–wabbelig, geschickt–tollpatschig)
   einstellen oder lieber jede Feder einzeln?

---

## 12. Quellen

**Nachschwingen in Animationsprogrammen**

- Spine, Physik-Beschränkungen: https://esotericsoftware.com/spine-physics-constraints
- Spine, Laufzeit-Code der Physik (spine-core 4.2): https://cdn.jsdelivr.net/npm/@esotericsoftware/spine-core@4.2.110/dist/PhysicsConstraint.js
- Spine 4.3 (Slider, volumenerhaltendes scaleY, Physik bei niedrigen Raten): https://esotericsoftware.com/blog/Spine-4.3-released
- Spine-Forum, 4.2-Beta (Masse und Stärke wirken beide auf die Frequenz): https://esotericsoftware.com/forum/d/24635-42-beta-status-update
- Spine, IK-Beschränkungen (Weichheit, Beugerichtung, Füße auf unebenem Boden): https://esotericsoftware.com/spine-ik-constraints
- spine-unity, SkeletonRagdoll2D: https://esotericsoftware.com/spine-unity-utility-components
- Live2D, Physik einrichten: https://docs.live2d.com/en/cubism-editor-manual/physical-operation-setting/
- Live2D, Physik-Übersicht: https://docs.live2d.com/en/cubism-editor-manual/physics-operation/
- Live2D-Laufzeit, Physik (Kopie des Cubism-Frameworks): https://cdn.jsdelivr.net/npm/live2d-renderer@0.6.6/framework/src/physics/cubismphysics.ts
- VTube Studio, Modelleinstellungen (Physik wird zuletzt gerechnet): https://github.com/DenchiSoft/VTubeStudio/wiki/VTS-Model-Settings
- VRChat PhysBones: https://creators.vrchat.com/common-components/physbones
- VRChat, Nutzerkritik an den Reglern: https://feedback.vrchat.com/sdk-bug-reports/p/physbones-physics-sliders-are-too-obtuse
- Godot, SkeletonModification2DJiggle: https://docs.godotengine.org/en/stable/classes/class_skeletonmodification2djiggle.html
- Unreal, Physics Control: https://dev.epicgames.com/documentation/unreal-engine/API/Plugins/PhysicsControl · https://dev.epicgames.com/documentation/en-us/unreal-engine/python-api/class/PhysicsControlData
- Unreal, Pose Snapshot: https://dev.epicgames.com/documentation/en-us/unreal-engine/pose-snapshot-in-unreal-engine
- Rive, Skripte (Physik nur über eigene Skripte): https://rive.app/blog/scripting-is-live-in-rive

**Federn, Übergänge, Cartoon-Bewegung**

- Holden, Federn („Spring-It-On“): https://theorangeduck.com/page/spring-roll-call
- Holden, Dead Blending: https://theorangeduck.com/page/dead-blending
- Bollo, Inertialization (GDC 2018): https://www.gdcvault.com/play/1025165/Inertialization-High-Performance-Animation-Transitions
- „Giving Personality to Procedural Animations using Math“ (Video): https://www.youtube.com/watch?v=KPoeNZZ6H4s · Zusammenfassung: https://hackaday.com/2022/06/30/a-math-based-personality-for-games
- Wang, Drucker, Agrawala, Cohen, The Cartoon Animation Filter (SIGGRAPH 2006): https://www.microsoft.com/en-us/research/publication/the-cartoon-animation-filter/
- Pittman, Building a Better Jump (GDC 2016): https://www.gdcvault.com/play/1023559/Math-for-Game-Programmers-Building

**Löser und Weichkörper**

- Jakobsen, Advanced Character Physics: https://www.gamedeveloper.com/programming/advanced-character-physics
- Macklin, Müller, Chentanez, XPBD (2016): https://matthias-research.github.io/pages/publications/XPBD.pdf
- Macklin u. a., Small Steps in Physics Simulation (2019): https://mmacklin.com/smallsteps.pdf (PDF nicht maschinell lesbar; Aussage als bekanntes Ergebnis)
- Müller u. a., Detailed Rigid Body Simulation with XPBD (2020): https://matthias-research.github.io/pages/publications/PBDBodies.pdf
- Müller u. a., Meshless Deformations Based on Shape Matching (2005): https://matthias-research.github.io/pages/publications/MeshlessDeformations_SIG05.pdf (PDF nicht maschinell lesbar; Formeln als bekanntes Ergebnis)
- Ten Minute Physics (JavaScript-Beispiele): https://matthias-research.github.io/pages/tenMinutePhysics/index.html
- Box2D v3.0: https://box2d.org/posts/2024/08/releasing-box2d-3.0/
- Box2D, Solver2D und Soft Step: https://box2d.org/posts/2024/02/solver2d/
- Phaser Box2D: https://github.com/phaserjs/phaser-box2d
- Rapier, Determinismus (JS): https://rapier.rs/docs/user_guides/javascript/determinism
- Rapier, Gelenke und Motoren (JS): https://rapier.rs/docs/user_guides/javascript/joints
- Planck.js: https://github.com/piqnt/planck.js
- Matter.js: https://github.com/liabru/matter-js
- JellyCar: https://en.wikipedia.org/wiki/JellyCar
- LocoRoco: https://en.wikipedia.org/wiki/LocoRoco

**Gleichgewicht, aktive Ragdolls, Werkzeuge**

- SIMBICON (Projektseite): https://www.cs.ubc.ca/~van/papers/Simbicon.htm · Formel der Fußplatzierung nach Sekundärquellen: https://frankzhang427.github.io/pdf/improved_simbicon.pdf · https://jchen114.github.io/SIMBICON-Web
- Coros u. a., Locomotion Skills for Simulated Quadrupeds (2011): https://www.cs.ubc.ca/~van/papers/2011-TOG-quadruped/index.html
- Pratt u. a., Capture Point (2006): https://cs.utexas.edu/~shivaram/readings/b2hd-PrattCDG2006.html
- Hof, Gazendam, Sinke, The condition for dynamic stability (J. Biomech. 2005): https://doi.org/10.1016/j.jbiomech.2004.03.025
- Raibert-Regel (Fußplatzierung), Sekundärquellen: https://pages.github.berkeley.edu/EECS-106/sp22-site/assets/scribe_notes/scribe_lec_14A.pdf · https://arxiv.org/pdf/2212.05154 · Original: Raibert, Legged Robots That Balance (MIT Press 1986)
- Macchietto, Zordan, Shelton, Momentum Control for Balance (2009): https://www.cs.ucr.edu/~cshelton/papers/MacZorShe09.html
- Wrotek u. a., Dynamo (schwache Wurzelfeder, einstellbares Gleichgewicht): https://www.academia.edu/17537898/Dynamo_Dynamic_Data_driven_Character_Control_with_Adjustable_Balance · https://cs.brown.edu/research/pubs/theses/masters/2006/pwrotek.pdf
- Zordan u. a., Dynamic Response for Motion Capture Animation (SIGGRAPH 2005): https://doi.org/10.1145/1073204.1073249
- Geijtenbeek, Pronost, Interactive Character Animation Using Simulated Physics (Überblick, 2012): https://doi.org/10.1111/j.1467-8659.2012.03189.x
- Euphoria: https://en.wikipedia.org/wiki/Euphoria_(software) · https://gta.wiki/w/Euphoria
- Cascadeur, AutoPhysics: https://cascadeur.com/help/tools/autophysics · Stützpunkte: https://cascadeur.com/help/tools/physics_tools/autophysics/fulcrum_points
- Ragdoll Dynamics 3.0 (Live Mode): https://www.cgchannel.com/2022/11/imbalance-releases-ragdoll-dynamics-3-0-for-maya
- DeepMimic: https://xbpeng.github.io/projects/DeepMimic/index.html
- Mode-Adaptive Neural Networks (Hunde): https://github.com/sebastianstarke/AI4Animation

**Spiele und Vorträge**

- Rain World (GDC 2016, Bericht): https://gamedeveloper.com/art/video-animating-i-rain-world-i-and-its-many-squishy-stretchy-creatures · Interview zur Bauart: https://unity.com/blog/exploring-procedural-design-rain-world
- Overgrowth (GDC 2014): https://gdcvault.com/play/1020049/Animation-Bootcamp-An-Indie-Approach · Forenbericht (13 Posen): https://discussions.unity.com/t/an-indie-approach-to-procedural-animation-gdc-video-talk/538228 · Entwicklerbeitrag (ModDB, Abruf gesperrt, nur Zusammenfassung): https://www.moddb.com/news/why-we-are-not-using-euphoria/
- Gibbon: Beyond the Trees: https://www.gamedeveloper.com/programming/deep-dive-physics-based-animation-in-gibbon-beyond-the-trees
- Spore (Hecker u. a. 2008): https://chrishecker.com/Real-time_Motion_Retargeting_to_Highly_Varied_User-Created_Morphologies
- Wobbledogs (Interview): https://gamedeveloper.com/design/behind-the-ai-and-physics-of-i-wobbledogs-i-procedurally-goofy-wobbledogs
- Human: Fall Flat (Interviews): https://gamingbolt.com/human-fall-flat-interview-what-dreams-may-come · https://www.pcgamer.com/human-fall-flat-is-a-physics-based-game-about-dreams-mysteries-and-breaking-stuff
- Gangarten des Hundes: https://en.wikipedia.org/wiki/Dog_gait
- Federnde Spielfigur mit schwebendem Körper (Nachbau des Very-Very-Valet-Ansatzes): https://joebinns.itch.io/stylised-character-controller
