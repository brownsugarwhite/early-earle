# 06 · Mathematik von Formmorph und Verformung

Recherche für den Editor „Studio“ (20.11.2026). Thema: wie Vektorformen von einer Schlüsselform in die nächste morphen, wie
Knochen sie verformen, wie Morph, Knochen, Korrekturformen und Physik zusammenspielen, und welche Rechenkette für den Editor und
für Ozzy die beste ist. Grundlage sind Aufsätze, Handbücher und Laufzeit-Quelltext (Liste am Ende) sowie der Prototyp unter
`apps/editor/src/ozzy-figur/`. Die Recherchen vom 16.11. ([Morph und Animation](../2026-11-16-ozzy-morph-und-animation.md)) und
18.11. ([Ozzy-Figur](../2026-11-18-ozzy-figur-recherche.md)) gelten weiter; hier geht es tiefer in die Rechnung.

**Quellenlage.** Das gemeinsame Suchkontingent der Sitzung war gegen Ende aufgebraucht, und einige Herstellerseiten (Adobe-Hilfe,
Toon-Boom-Handbuch, die Foren von Spine und Moho) ließen sich nicht laden. Aussagen, die nur aus Handbuchkenntnis stammen und in
dieser Runde nicht erneut geprüft werden konnten, sind mit **†** markiert. Alle Formeln ohne Quellenangabe sind eigene Herleitungen
und als solche gekennzeichnet („Vorschlag“).

---

## Kurzfassung

1. **Drehung gehört in einen Rahmen, nur der Rest wird gerade gemischt.** Jedes Verfahren, das weich aussieht, zerlegt Bewegung in
   Drehung und Größe (gemischt über Winkel und Logarithmus) und einen kleinen Rest (gerade gemischt): ARAP-Interpolation je Dreieck,
   intrinsisches Mischen je Sehne, Dual-Quaternionen beim Skinning, Live2Ds „erweiterte Interpolation“, GSAPs Modus „rotational“,
   Spines Rat „Knochen statt Verformungsschlüssel“.
2. **Gerades Mischen schrumpft Drehungen um den Faktor cos(Δφ/2).** Ein Punkt, der sich zwischen zwei Schlüsseln um 90° dreht,
   liegt in der Mitte nur bei 71 % seines Abstands zum Drehpunkt. Beim Skinning gilt dieselbe Zahl: zwei Knochen je 50 %, um 90°
   geknickt, ziehen das Gelenk auf 71 % zusammen.
3. **Monoton (PCHIP) ist richtig für Winkel und Längen, falsch für x und y eines drehenden Punkts.** Liegen zwei Schlüssel bei
   −45° und +45°, hat ein Punkt in beiden dasselbe x; PCHIP hält x flach, die Form wird in der Mitte schmal. Im Rahmen gemischt
   (Winkel monoton) entsteht der Bogen.
4. **Glatte Anker brauchen einen gemeinsamen Griffwinkel.** Gerades Mischen der Griffe knickt einen glatten Anker, sobald sich das
   Längenverhältnis seiner beiden Griffe zwischen den Schlüsseln ändert. Mit einem gemeinsamen Winkel je glattem Anker bleibt er in
   jeder Stufe glatt: Morph, Formziele, Knochen, Physik („Glätte-Regel“, Abschnitt 4.4 und 8).
5. **Die Zuordnung der Anker ist bei uns kein Ratespiel.** Alle Schlüssel einer Form sind Bearbeitungen derselben Anker (wie Florians
   SVGs). Neue Anker werden in allen Zuständen exakt eingesetzt (Teilen nach de Casteljau); nur der Import fremder Formen braucht
   eine automatische Zuordnung (dynamische Programmierung) mit sichtbaren, verschiebbaren Paaren als Formhinweisen.
6. **Vorbeilaufende Anker sind ein Ereignis, kein Kurvenfehler.** Dreht sich ein Stück Kontur weg, schrumpft es auf einen Punkt
   (Falte). Der Faltschlüssel des Prototyps ist dafür das richtige Modell; im Studio wird er eine sichtbare, verschiebbare Marke. Drei
   billige Prüfungen je Bild (Sehnenumkehr, Schlaufe im Stück, Selbstschnitt) melden den Rest.
7. **Skinning auf Anker und Griffe, nicht auf ein Dreiecksnetz.** Für scharfe Vektoren, unseren Abstandsfeld-Renderer und wenige
   Anker ist das die richtige Ebene; so machen es Rive und Illustrators Puppet Warp. Ein Dreiecksnetz im Inneren ist nur
   Rechenhilfe für Gewichte und für das Biege-Werkzeug.
8. **Im 2D sind Drehungen komplexe Zahlen.** Die gemischte Drehung ist m = Σ wⱼ·e^{iθⱼ}; Linear Blend Skinning schrumpft um |m|.
   Normiert (m/|m|) und um einen je Anker vorberechneten Drehpunkt gedreht („optimierte Drehzentren“), bleibt das Gelenk voll, mit
   weniger Ausbeulen als bei Dual-Quaternionen, fast zum Preis von LBS.
9. **Griffe erben standardmäßig die Bewegung ihres Ankers.** Das ist rechnerisch dasselbe wie „Griff hat die Gewichte seines Ankers“
   und hält glatte Anker automatisch glatt. Eigene Griffgewichte sind ein Schalter (wie in Rive); danach stellt ein Glätte-Schutz die
   gemeinsame Tangente wieder her. Für lange Stücke über ein Gelenk gibt es den Kurven-Ausgleich nach Liu, Jacobson und Gingold
   (2014), den Illustrator als Puppet Warp übernommen hat.
10. **Gewichte automatisch über Wärmeleitung** (Baran und Popović 2007): ein dünn besetztes Gleichungssystem, einmal zerlegt, je Knochen
    ein Rückwärtseinsetzen. Bounded Biharmonic Weights sind noch schöner, brauchen aber quadratische Optimierung; sie sind die
    zweite Stufe.
11. **Korrekturformen an Knochenwinkeln** (Pose Space Deformation; in Moho „Smart Bones“) liegen im Ruheraum, damit sie mit den
    Knochen mitdrehen. Für einen Winkel genügt PCHIP über dem Winkel, für zwei Winkel ein kleines Raster oder normierte radiale
    Basisfunktionen.
12. **„Pose zeichnen, Studio zerlegt“:** Formt Florian eine Pose frei, passt das Studio je Knochen die beste Drehung ein (gewichteter
    Procrustes) und speichert nur den Rest als Korrektur. Übergänge drehen dann, statt zu schrumpfen, ohne dass er Knochen bedienen
    muss.
13. **Rechenkette:** Grundform → Ansichts-Morph → Formziele und Korrekturen (Ruheraum) → Knochenphysik → Skinning (Anker, Griffe) →
    Ankerphysik (Formabgleich) → Wächter → Abstandsfelder und Effekte. Nach Überschlag kostet das je Bild bei einigen hundert Ankern
    Bruchteile einer Millisekunde (zu messen); teuer ist nur das einmalige Rechnen der Gewichte.
14. **Ehrlich zu Ozzy:** Ozzy besteht aus getrennten, meist steifen Teilen, die der Renderer weich verschmilzt. Für die meisten
    Teile reicht „Teil starr am Knochen“. Gewichte braucht es nur, wo eine einzelne Form sich biegt (Schwanz, Ohren, Bohne beim
    Stauchen, Hals). Das spart viel Bedienung.

---

## 0. Was der Prototyp heute rechnet

Aus `form.ts` und `raster.ts`:

- **Form:** geschlossener Pfad aus kubischen Stücken; Anker `p` mit Griff davor `i` und danach `o`, beide als absolute Punkte.
- **Zwischen Schlüsseln** (`formAusSchluesseln`): Anker per PCHIP je Koordinate über dem Winkel; Griffe nach Winkel (stetig
  abgewickelt) und Länge, beide per PCHIP. Schwenkt ein Griff zwischen zwei Schlüsseln weiter als 100°, wird er gerade gemischt
  (sonst schlägt er einen Kreis). Die PCHIP-Steigung ist die gewichtete harmonische Mittelung (Fritsch–Butland, wie MATLABs
  `pchip`), an den Enden die einseitige Sekante.
- **Faltschlüssel** (`faltSchluessel`): Kehrt sich die Sehne zweier Nachbaranker zwischen zwei Schlüsseln um mehr als 135° um
  (cos < −0,707), wird zur Zeit der kürzesten gemischten Sehne ein verborgener Schlüssel eingesetzt, in dem beide Anker auf einen Punkt
  mit gemeinsamer Tangente zusammengezogen sind. Die Anker treffen sich, statt aneinander vorbeizulaufen.
- **Morph zweier Formen** (`morphen`): `linear`, `winkel` (Anker gerade, Griffe nach Winkel und Länge) und `aehnlich` (Procrustes
  je Teil: Drehung, Größe, Lage getrennt; Rest wie `winkel`).
- **Abgleich:** `ankerErgaenzen` teilt ein Stück exakt (Kurve bleibt gleich) an der Stelle mit dem kleinsten Procrustes-Rest;
  `verschiebungsKosten` findet den Startanker; `umkehren` dreht die Laufrichtung.

**Einordnung.** Das ist für „wenige Anker, gezeichnete Schlüssel“ schon nahe am Stand der Technik und besser als After Effects,
Animate oder Spines Verformungsschlüssel. Drei Lücken: (1) Ein Rahmen gibt es nur je ganzem Teil, nicht örtlich; daher braucht es
die 100°-Ausnahme für Griffe. (2) PCHIP auf x und y drehender Punkte schrumpft zwischen Schlüsseln (Abschnitt 2.2). (3) Knochen,
Gewichte und Korrekturformen fehlen; das ist das eigentliche Neuland des Studios.

---

## 1. Zuordnung der Anker

### 1.1 Was die Programme tun

| Programm | Mechanik der Zuordnung | Stärke | Schwäche |
|---|---|---|---|
| After Effects (Pfad-Schlüssel) | nach Index; der „erste Scheitelpunkt“ legt den Start fest; bei ungleicher Zahl ergänzt AE Punkte. † „Smart Mask Interpolation“ erzeugt dichte Zwischenschlüssel mit gebogenen Bahnen, mit Reglern u. a. für Biegesteifigkeit und 1:1-Zuordnung | vorhersagbar bei gleicher Punktzahl | gerade Bahnen schrumpfen und knicken; Praxis-Rat: gleiche Punktzahl, gleicher Start, mehr Schlüssel ([Forum](https://community.adobe.com/t5/after-effects-discussions/how-do-i-morph-shapes-with-different-points-in-a-controlled-way/m-p/10037073), [Set First Vertex](https://www.provideocoalition.com/after-effects-hidden-gems-set-first-vertex/)) |
| Adobe Animate (Form-Tween) † | bis zu 26 Formmarken a–z, auf Start- und Endform gesetzt; Rat: in Reihenfolge rund um die Form setzen, bei schwierigen Formen Zwischenformen anlegen | verständliche Hinweise | zwischen den Marken unkontrolliert; berüchtigt für Verdrehen |
| Toon Boom Harmony (Morphing) † | Hinweis-Arten für Kontur, Zone, Bleistiftlinie und „Fluchtpunkt“ (wohin eine verschwindende Form schrumpft) | der Fluchtpunkt-Hinweis ist genau unser Falten-Fall | viele Hinweis-Arten, viel Bedienung |
| GSAP MorphSVG | alles in kubische Stücke; Anker ergänzen, bis die Zahlen gleich sind; `shapeIndex: "auto"` sucht den Startversatz (falscher Versatz lässt die Form sich überkreuzen); `map` paart Teilpfade nach Größe, Lage oder Ankerzahl; `smooth` streut Anker ein; `type: "rotational"` mischt Drehung und Länge; `curveMode` mischt Griffe glatter Anker nach Winkel und Länge ([Doku](https://gsap.com/docs/v3/Plugins/MorphSVGPlugin/)) | gute Automatik; Drehmodus gegen Knicke in der Mitte | Drehmodus braucht einen Drehpunkt (`origin`); laut Doku kann `curveMode` bei eng liegenden Ankern schlechter aussehen |
| Flubber | Kurven werden zu Polygonen abgetastet (`maxSegmentLength`), dann „bestmöglich geraten“ ([README](https://github.com/veltman/flubber)) | robust für beliebige Formen | die Originalanker bleiben bei Kurven nicht erhalten; nicht weiter bearbeitbar |
| Rive, Spine, Moho, Live2D | keine Zuordnung nötig: Eckpunkte existieren über die ganze Zeitleiste, Schlüssel speichern ihre Lagen | nie falsch zugeordnet | Spine: Netz neu erzeugen oder Eckpunkte zurücksetzen löscht alle Gewichte und Verformungsschlüssel ([Spine-Handbuch Meshes](https://eu.esotericsoftware.com/spine-meshes.md)) |

### 1.2 Verfahren

1. **Laufrichtung angleichen:** Vorzeichen der Fläche (Shoelace-Formel über die Anker) vergleichen, notfalls umkehren
   (Prototyp: `flaeche`, `umkehren`).
2. **Startanker:** für jede zyklische Verschiebung s die Kosten K(s) = Σⱼ |âⱼ − b̂ⱼ₊ₛ|² nach Normierung (Schwerpunkt, mittlerer
   Radius, wahlweise beste Drehung) bilden und das Minimum nehmen. O(n²), im Prototyp vorhanden (`verschiebungsKosten`).
3. **Ungleiche Ankerzahl:** dynamische Programmierung über beide Ankerfolgen, wie Dynamic Time Warping. Kosten je Paar aus der Lage
   auf der Bogenlänge (0 bis 1), dem Abbiegewinkel an den Ankern und der örtlichen Lage nach Procrustes; erlaubte Schritte „Paar“
   und „im anderen Pfad einen Anker einsetzen“. Sederberg und Greenwood (SIGGRAPH 1992) suchten so die Zuordnung mit der kleinsten
   Dehn- und Biegearbeit; Sebastian, Klein und Kimia (2003) gleichen Kurven über Länge und Krümmung ab. Aufwand O(n·m) je
   Startversatz; bei 20 Ankern nach Überschlag weit unter einer Millisekunde.
4. **Anker einsetzen, ohne die Kurve zu ändern** (de Casteljau bei Parameter t im Stück P0, P1, P2, P3):

   ```
   P01 = lerp(P0,P1,t)   P12 = lerp(P1,P2,t)   P23 = lerp(P2,P3,t)
   P012 = lerp(P01,P12,t)   P123 = lerp(P12,P23,t)   B = lerp(P012,P123,t)
   neuer Anker B mit Griff davor P012 und danach P123; alter Griff P1 → P01, alter Griff P2 → P23
   ```

   t wird so gewählt, dass der neue Anker auf derselben Bogenlängen-Lage liegt wie sein Partner in der anderen Form.
5. **Formhinweise als harte Bedingung:** Jedes Paar mit gleicher Farbe auf beiden Formen teilt die Programmierung in unabhängige
   Abschnitte; zwischen den Paaren rechnet die Automatik. So vereint man Animates Formmarken und die Automatik von GSAP in einem
   Werkzeug.
6. **Entfernen ist verlustbehaftet:** Ein Anker kann nur weg, wenn seine zwei Nachbarstücke durch ein Stück ersetzt werden, das am
   besten passt (kleinste Quadrate über abgetastete Punkte, Endanker und Tangentenrichtungen fest). Das passiert in jedem Zustand
   einzeln; die Abweichung wird vorher angezeigt.

### 1.3 Für uns

- **Eine Form, viele Zustände.** Jeder Ansichts-Schlüssel, jedes Formziel und jede Korrektur ist dieselbe Ankerliste. Setzt Florian
  einen Anker, entsteht er in allen Zuständen (exakt geteilt, die Kurven bleiben gleich). Löscht er einen, sieht er vorher die
  Abweichung je Zustand.
- **Import** (SVG aus Illustrator): Laufrichtung, Startanker, dann die Programmierung; das Ergebnis erscheint als farbige Paare auf
  beiden Formen. Ein verschobenes Paar wird zum Hinweis, die Automatik rechnet nur zwischen den Hinweisen neu.
- **Keine Abtastung zu Polygonen** wie bei Flubber: Die Anker sind Florians Zeichnung und bleiben es.

---

## 2. Anker und Griffe zwischen Schlüsseln

### 2.1 Was gerade Bahnen kosten

**Drehung.** Ein Punkt im Abstand r von einem Drehpunkt, der sich zwischen zwei Schlüsseln um Δφ dreht, liegt bei gerader Bahn in
der Mitte im Abstand r·cos(Δφ/2):

| Δφ | 45° | 90° | 135° | 180° |
|---|---|---|---|---|
| Abstand in der Mitte | 92 % | 71 % | 38 % | 0 % |

Das ist das „Schrumpfen“, das Sederberg u. a. (SIGGRAPH 1993) für lineare und kubische Eckpunkt-Bahnen beschreiben, und der Grund,
warum Live2D eine „erweiterte Interpolation“ eingebaut hat: Dreht man ein Netz oder einen Verformer über Keyforms statt über einen
Rotationsverformer, läuft die Mitte auf gerader Bahn und schrumpft; die erweiterte Interpolation legt deshalb Zwischenschlüssel auf
eine Ellipsenbahn ([Live2D](https://docs.live2d.com/en/cubism-editor-manual/extended-interpolation/)). Spine sagt dasselbe über
seine Verformungsschlüssel: „interpolation between deform keys always moves the vertices in a straight line“
([Spine](https://eu.esotericsoftware.com/spine-meshes.md)); große Bewegungen gehören deshalb an Knochen.

**Griffe.** Ein glatter Anker hat in beiden Schlüsseln gegenläufige Griffe: h⁻ = −λ·h⁺. Werden die Griffe gerade gemischt, gilt für
das Kreuzprodukt der gemischten Griffe (eigene Herleitung):

```
h⁺(t) = (1−t)·h⁺₀ + t·h⁺₁,   h⁻(t) = −[(1−t)·λ₀·h⁺₀ + t·λ₁·h⁺₁]
h⁻(t) × h⁺(t) = −t(1−t)·(λ₀ − λ₁)·(h⁺₀ × h⁺₁)
```

Der Anker bleibt also nur glatt, wenn sich das Längenverhältnis nicht ändert (λ₀ = λ₁) oder die Griffe nicht drehen. Sonst entsteht
in der Mitte ein Knick. Werden beide Griffe dagegen über **einen gemeinsamen Winkel** und zwei Längen gemischt
(h⁺ = ℓ⁺·e^{iα}, h⁻ = −ℓ⁻·e^{iα}), bleiben sie in jeder Stufe gegenläufig. GSAP beschreibt genau diesen Effekt: der Drehmodus
mindert Knicke an glatten Ankern in der Mitte des Morphs ([GSAP](https://gsap.com/docs/v3/Plugins/MorphSVGPlugin/)). Dazu kommt:
gerade gemischte Griffe werden bei einer Drehung um Δφ ebenfalls um cos(Δφ/2) kürzer, die Kurve wird in der Mitte flacher.

### 2.2 Welche Kurve über mehrere Schlüssel

| Kurve über die Schlüssel | Stetigkeit | trifft Schlüssel genau | Überschwingen | wirkt beim Verschieben eines Schlüssels auf | Eignung |
|---|---|---|---|---|---|
| gerade, stückweise | C0, Knick an jedem Schlüssel | ja | nein | die Nachbarn | nur als Rückfall |
| PCHIP (monoton kubisch, Fritsch–Carlson 1980, Fritsch–Butland 1984) | C1 | ja | nein, jede Größe bleibt zwischen ihren Nachbarwerten | die Nachbarn | **Standard für Winkel, Log-Größen und kleine Reste** |
| Catmull-Rom (kardinal) | C1 | ja | ja | die Nachbarn | wenn Schwung gewollt ist; für räumliche Bahnen mit zentripetaler Parametrisierung (α = ½), der einzigen ohne Spitzen und Selbstschnitte im Stück ([Yuksel u. a.](http://www.cemyuksel.com/research/catmullrom_param/)) |
| natürlicher kubischer Spline | C2 | ja | ja, schwingt nach | alles | nein: ein Schlüssel verändert die ganze Bewegung |
| Kochanek–Bartels (Spannung, Stetigkeit, Neigung; SIGGRAPH 1984) | C1, wählbar weniger | ja | wählbar | die Nachbarn | als Regler „straff ↔ schwungvoll“ je Schlüssel |

**Der entscheidende Punkt.** Monotonie ist genau richtig für Größen, die zwischen zwei Schlüsseln nicht über sie hinauslaufen
sollen: Drehwinkel, Logarithmus der Größe, Griffwinkel relativ zur Kontur, kleine Reste. Sie ist falsch für x und y eines Punkts,
der sich dreht: Liegen Schlüssel bei −45° und +45°, hat der Punkt in beiden dasselbe x, PCHIP hält x flach, und der Bogen über 0°
fehlt. Im Prototyp fällt das kaum auf, weil die Schlüssel dicht liegen (Florians 16 Schlüssel, dazu gebaute und Faltschlüssel); bei
einem Editor, in dem man mit wenigen Schlüsseln anfängt, fällt es sofort auf. Abhilfe ist der Rahmen (2.4 und 2.6): Dann ist der
Winkel die gemischte Größe, und er ist monoton.

PCHIP ist nur C1: Die Beschleunigung springt an den Schlüsseln. Bei dichten Schlüsseln sieht man das nicht; wird es sichtbar, hilft
ein weiterer Schlüssel oder C2 nur für die Rahmenwinkel.

### 2.3 Griffe: Winkel und Länge, relativ zur Kontur

Im Prototyp werden Griffwinkel absolut gemischt. Dreht sich die Kontur um einen Anker herum (Stirnfranse, Ohrspitze), dreht der Griff
mit und kann zwischen zwei Schlüsseln mehr als 100° schwenken; dann hilft nur gerades Mischen. Besser ist es, den Griff **relativ
zur örtlichen Tangente** zu speichern (Vorschlag, als komplexe Zahlen geschrieben):

```
τᵢ = (pᵢ₊₁ − pᵢ₋₁) / |pᵢ₊₁ − pᵢ₋₁|        örtliche Tangente aus den Nachbarankern
Lᵢ = |pᵢ₊₁ − pᵢ₋₁| / 2                    örtlicher Maßstab
qᵢ = hᵢ / (τᵢ · Lᵢ)                       Griff relativ zur Kontur, ohne Einheit
gemischt wird ln|qᵢ| und arg qᵢ (PCHIP über die Schlüssel)
hᵢ(u) = τᵢ(u) · Lᵢ(u) · exp(ln qᵢ(u))     τ und L aus den bereits gemischten Ankern
```

- Dreht sich die Kontur, dreht τ mit; q bleibt fast gleich. Kein Kreisschlagen, keine 100°-Ausnahme.
- An jedem Schlüssel kommt exakt Florians Griff heraus.
- **Glatter Anker:** ein gemeinsamer Winkel arg q für beide Griffe (der Griff davor zeigt genau entgegengesetzt), zwei Längen.
  **Ecke:** zwei unabhängige Winkel.
- **Griff der Länge 0** (eingezogen): ln 0 gibt es nicht. Dann wird die Länge gerade gemischt und der Winkel vom Nachbarschlüssel
  übernommen (der Prototyp macht das schon).
- **Länge geometrisch oder linear:** geometrisch (über den Logarithmus) ist unabhängig vom Maßstab und kann nicht negativ werden;
  linear erreicht genau null. Standard geometrisch, linear sobald ein Schlüssel null hat.

### 2.4 Drehung statt gerade auf drei Ebenen

#### a) Ganzes Teil: Ähnlichkeit als komplexe Zahl

Mit Schwerpunkten c_A, c_B und den zentrierten Ankern xⱼ, yⱼ als komplexe Zahlen ist die beste Ähnlichkeit (Procrustes, kleinste
Quadrate)

```
a = Σ conj(xⱼ)·yⱼ / Σ |xⱼ|²        Größe s = |a|, Drehung θ = arg a
f(z) = c_B + a·(z − c_A) = a·z + b,   b = c_B − a·c_A
```

Das ist genau die Rechnung von `morphen(…, 'aehnlich')` (dort `sxx + i·sxy = Σ conj(x)·y`). Der Prototyp mischt danach Drehung und
Größe um den Schwerpunkt und schiebt den Schwerpunkt geradlinig. **Eleganter (Vorschlag):** Jede Ähnlichkeit mit a ≠ 1 hat einen
festen Punkt

```
z* = b / (1 − a)
f_t(z) = z* + aᵗ·(z − z*),   aᵗ = sᵗ·e^{i·t·θ}
```

Jeder Punkt läuft auf einer logarithmischen Spirale um z* (bei s = 1 auf einem Kreis); jede Zwischenform ist exakt eine Ähnlichkeit,
und das Ergebnis hängt nicht davon ab, welchen Mittelpunkt man wählt. Für ein Ohr, das um seinen Ansatz schwingt, liegt z* nahe am
Ansatz, und der Ansatz bleibt stehen; beim Drehen um den Schwerpunkt wandert er ein wenig. Für fast reine Verschiebung (a ≈ 1) läuft
z* ins Unendliche; dann gilt der Grenzfall f_t(z) = z + t·b. Über mehrere Schlüssel: PCHIP auf θ (abgewickelt), ln s und den
Schwerpunkt (oder den festen Punkt).

#### b) Kontur: intrinsisch (Sederberg, Gao, Wang, Mu 1993)

Statt Lagen werden Sehnenlängen und Abbiegewinkel gemischt; die Form wird durch Ablaufen der Kontur wieder aufgebaut. Laut
Zusammenfassung vermeidet das das Schrumpfen drehender Körper und neue Knicke ([SIGGRAPH-Archiv](https://history.siggraph.org/?p=118584)).
Weil die gemischte Kontur sich im Allgemeinen nicht mehr schließt, wird der Schließfehler über die Sehnen verteilt (kleinste
Quadrate). Lage und Gesamtdrehung müssen aus dem Teilrahmen (a) kommen. Schwäche für uns: Eine Sehne kann nicht durch null gehen
(Längen bleiben positiv), sie schwingt stattdessen herum; bei echten Falten (Abschnitt 3) ist das falsch.

#### c) Fläche: ARAP-Interpolation (Alexa, Cohen-Or, Levin 2000)

Mechanik nach dem Aufsatz ([PDF](https://www.tau.ac.il/~levin/arap.pdf)):

1. Beide Formen brauchen eine **kompatible Dreiecksteilung** (gleiche Verbindungen).
2. Für jedes Dreieck die affine Abbildung A von Quelle zu Ziel bestimmen und polar zerlegen: A = R_γ·S (Drehung um γ, symmetrischer
   Teil S). Die Autoren haben das gegen die Singulärwertzerlegung (dreht unnötig über 180°) und die QR-Zerlegung abgewogen.
3. Gewünschte Zwischenabbildung: A(t) = R_{t·γ}·((1−t)·I + t·S).
4. Die Lagen V(t) minimieren E = Σ_f ‖A_f(t) − B_f(t)‖²_F, wobei B_f(t) die tatsächliche Abbildung des Dreiecks f auf V(t) ist (linear
   in V(t)). Ein Punkt wird festgehalten. Die Matrix der quadratischen Form hängt nicht von t ab: einmal zerlegen, je Bild ein
   Rückwärtseinsetzen. Eine symmetrische Fassung mischt die Aufgaben aus beiden Richtungen.

Grenzen: Der Drehwinkel je Dreieck liegt in (−π, π]; dreht sich ein Teil zwischen zwei Schlüsseln um mehr als 180°, müssen die
Winkel benachbarter Dreiecke abgestimmt werden (spätere Arbeiten, u. a. Baxter, Barla und Anjyo 2008 „Rigid shape interpolation using
normal equations“, auch für viele Schlüssel). Für uns ist die kompatible Teilung leicht: Alle Schlüssel teilen dieselben Anker, also
wird das Innere der Grundform einmal trianguliert (Kurvenpunkte als Randbedingung) und in jeden Schlüssel durch eine ARAP-Anpassung
mit festem Rand übertragen. Anker sind Netzpunkte; Griffe werden im Rahmen ihres Dreiecks gemischt (h(t) = R_f(t)·[Griff in
Dreieckskoordinaten, nach 2.3 gemischt]; Vorschlag). Kosten: einige hundert Dreiecke je Teil, ein dünn besetztes Rückwärtseinsetzen
je Bild.

Wann: Teile, die sich **in sich biegen**, ohne Knochen zu haben (Schwanz rollt sich ein, ein Bein als eine einzige Form knickt).

#### d) Mit Garantie: begrenzte Verzerrung

Chen, Weber, Keren, Ben-Chen (SIGGRAPH 2013, „Planar Shape Interpolation with Bounded Distortion“), Chien, Chen, Weber (SIGGRAPH
2016, „Bounded Distortion Harmonic Shape Interpolation“) und Chen, Weber (SIGGRAPH Asia 2017, lokal injektive Verformung auf der
Grafikkarte) garantieren Zwischenformen ohne umgeklappte Dreiecke ([Publikationsliste](https://renjiec.github.io/)). Das kostet eine
Optimierung je Bild oder je Schlüsselpaar. Für uns erst nötig, wenn Faltungen im Inneren zum Problem werden; derzeit nicht.

### 2.5 Periodische Parameter (Kopf 360°)

Für einen umlaufenden Winkel werden die Schlüssel vor PCHIP fortgesetzt (θₖ − 360° und θₖ + 360°, mindestens zwei auf jeder Seite).
Dann passen die Steigungen an der Naht 0°/360°, und es gibt dort keinen Ruck. Griff- und Rahmenwinkel werden über den ganzen Umlauf
stetig abgewickelt; ein Teil, das sich beim Umlauf selbst einmal ganz dreht, muss am Ende um genau 360° weitergedreht sein. Der
Prototyp spiegelt die zweite Hälfte (180° bis 360°) und kommt so weitgehend ohne diese Fortsetzung aus; im allgemeinen Editor braucht
man sie.

### 2.6 Empfohlene Mischart „Rahmen + Rest“

Vorschlag für jede Form mit Schlüsseln an Parameterwerten uₖ (Kopfwinkel, Zeit, Pose):

```
je Schlüssel k:
  aₖ = sₖ·e^{iθₖ}, cₖ        Teilrahmen: Procrustes zur Grundform (θ abgewickelt)
  rᵢₖ = (pᵢₖ − cₖ) / aₖ      Rest der Anker im Teilrahmen
  qᵢₖ = hᵢₖ / (aₖ·τᵢₖ·Lᵢₖ)    Griffe relativ zur örtlichen Tangente (aus rᵢₖ), 2.3
beim Wert u:
  θ(u), ln s(u), c(u)        PCHIP
  rᵢ(u)                      PCHIP je Koordinate (Reste sind klein)
  pᵢ(u) = c(u) + a(u)·rᵢ(u)
  τᵢ(u), Lᵢ(u) aus rᵢ(u);  qᵢ(u) über ln|q| und arg q (PCHIP; glatte Anker: ein Winkel)
  hᵢ(u) = a(u)·τᵢ(u)·Lᵢ(u)·exp(ln qᵢ(u))
danach: Falten-Prüfung auf den Resten rᵢ (Abschnitt 3)
```

Eigenschaften: an den Schlüsseln exakt; C1; jede gemischte Größe monoton zwischen ihren Nachbarn; Drehungen des Teils und örtliche
Drehungen der Griffe ohne Schrumpfen; glatte Anker bleiben glatt; Aufwand O(n) je Bild. `aehnlich` und `winkel` des Prototyps sind
Sonderfälle. Was es nicht kann: starke Biegung innerhalb eines Teils (dafür Knochen oder 2.4 c).

---

## 3. Wenn Anker aneinander vorbeilaufen

### 3.1 Drei Fälle und wie man sie erkennt

| Fall | Was man sieht | Prüfung je Bild |
|---|---|---|
| **Sehnenumkehr:** Zwei Nachbaranker liegen in zwei Schlüsseln in umgekehrter Reihenfolge auf einer Linie | beim Mischen geht die Sehne durch null, die Griffe sind noch lang: Haken, Zacke, „Stufe quer zur Kontur“ | cₖ = pᵢ₊₁,ₖ − pᵢ,ₖ; Umkehr wenn cₖ·cₖ₊₁ < −cos(45°)·|cₖ|·|cₖ₊₁| (Prototyp: 135°). Auf den Resten im Teilrahmen prüfen, sonst meldet eine Drehung des ganzen Teils falschen Alarm |
| **Schlaufe im Stück:** Die beiden Griffe eines Stücks kreuzen sich | kleine Schlinge oder Spitze in der Kurve | Normalform nach Stone und DeRose (1989): die ersten drei Kontrollpunkte auf ein festes Dreieck abbilden; wo der vierte landet, entscheidet zwischen Bogen, Wendepunkt(en), Spitze und Schlaufe. Billiger erster Hinweis (kein Beweis): die Strecken P0P1 und P2P3 schneiden sich |
| **Selbstschnitt der Kontur** oder Durchdringen eines anderen Teils | Schnauze durch die Wange, Kontur über sich selbst | Sweep über die abgeflachte Kontur (n·log n); im Editor als Warnung, nicht zur Laufzeit |

### 3.2 Warum es passiert

- Florian zeichnet zwei Ansichten mit denselben Ankern, aber zwei Anker vertauschen ihre Reihenfolge auf der Kontur (Fransen, die im
  Profil auf einer Linie liegen; das Beispiel steht im Prototyp).
- Bei einer Drehung im Raum wandert ein Stück Kontur hinter die Form. In der Projektion schrumpft es auf einen Punkt und verschwindet;
  es läuft nicht rückwärts. Das physikalisch richtige Modell ist also das **Zusammenziehen**, nicht das Durchlaufen. Harmony hat dafür
  den Fluchtpunkt-Hinweis (†), der Prototyp den Faltschlüssel.

### 3.3 Abhilfe, in dieser Reihenfolge

1. **Vermeiden:** gute Zuordnung (Abschnitt 1) und Rahmen (2.6). Viele scheinbare Umkehrungen sind nur Drehungen des ganzen Teils;
   im Teilrahmen verschwinden sie.
2. **Falte als Ereignis:** wie im Prototyp zur Zeit der kürzesten Sehne einen Schlüssel einsetzen, in dem die beiden Anker auf einen
   Punkt mit gemeinsamer Tangente zusammengezogen sind. Im Studio als sichtbare Marke auf der Zeitleiste und in der Form, verschiebbar
   (wann) und formbar (wie). Die Automatik schlägt vor, Florian entscheidet.
3. **Intrinsisch mischen** (2.4 b), wenn keine Falte erkannt wird: Sehnen können dann nicht durch null gehen.
4. **Garantien** (2.4 d) nur für Netze im Inneren, derzeit nicht nötig.
5. **Nie still reparieren:** Schlaufe und Selbstschnitt werden rot markiert, wie Kerben in der Nahaufnahme. Das Auge entscheidet.

---

## 4. Knochen: Skinning im 2D

### 4.1 Linear Blend Skinning und warum es einknickt

```
x' = Σⱼ wⱼ·Tⱼ(x),   Tⱼ(x) = Aⱼ·x + tⱼ,   Σⱼ wⱼ = 1
```

Im 2D ist eine Drehung um θ die komplexe Zahl e^{iθ}. Sind die Knochen reine Drehungen, ist der gemischte lineare Teil (eigene
Herleitung)

```
m = Σⱼ wⱼ·e^{iθⱼ},   Σⱼ wⱼ·R(θⱼ) = |m|·R(arg m),   |m| ≤ 1
zwei Knochen zu je 50 %, Knick φ:   m = e^{iφ/2}·cos(φ/2)
```

| Knick φ | 30° | 60° | 90° | 120° | 150° |
|---|---|---|---|---|---|
| Faktor cos(φ/2) | 0,97 | 0,87 | 0,71 | 0,50 | 0,26 |

Die Drehung stimmt (halber Winkel), aber alles schrumpft zum Gelenk hin: das „einknickende Gelenk“. Die „Bonbonpapier“-Verdrehung
der 3D-Literatur gibt es im 2D nicht (sie braucht eine Drehachse entlang des Knochens), das Einknicken schon. Libigl beschreibt
dasselbe allgemein: Gemischte Drehmatrizen sind keine Drehung mehr, Formen schrumpfen und fallen an Gelenken zusammen
([libigl-Tutorial](https://libigl.github.io/tutorial/)). Baran und Popović nennen als Gegenmittel die Breite des Übergangs: ungefähr
proportional zum Abstand vom Gelenk zur Oberfläche ([Pinocchio](https://people.csail.mit.edu/ibaran/papers/2007-SIGGRAPH-Pinocchio.pdf)).

### 4.2 Drehungen richtig mischen

- **Normierte komplexe Drehung:** R̄ = m/|m|. Bleibt die Frage, um welchen Punkt gedreht wird.
- **Dual-komplexe Zahlen:** das 2D-Gegenstück der Dual-Quaternionen; Drehung und Verschiebung in einem Objekt, billig zu mischen
  (Matsuda, Kaji, Ochiai 2016, [arXiv](https://arxiv.org/abs/1601.01754); Dual-Quaternion-Skinning: Kavan u. a. 2008,
  [PDF](https://users.cs.utah.edu/~ladislav/kavan08geometric/kavan08geometric.pdf)). Gewichtet addieren, normieren, das Ergebnis ist
  starr. Bekannter Nachteil der Dual-Quaternionen: Ausbeulen am Gelenk.
- **Optimierte Drehzentren** (Le und Hodgins, SIGGRAPH 2016, [Disney Research](https://studios.disneyresearch.com/?p=39548)): Je Punkt
  wird einmal aus Ruhelage und Gewichten ein Drehzentrum c vorberechnet (gewichteter Schwerpunkt der Punkte mit ähnlichen Gewichten);
  zur Laufzeit wird starr um dieses Zentrum gedreht. Laut den Autoren mindert das den Volumenverlust von LBS und das Ausbeulen der
  Dual-Quaternionen, bei Echtzeit-Tempo und gleicher Einrichtung wie andere Skelett-Verfahren. Im 2D (nach dem Aufsatz, komplex
  geschrieben):

  ```
  x' = R̄·(x − c) + Σⱼ wⱼ·Tⱼ(c),   R̄ = m/|m|
  ```

- **Stauchen und Strecken** (Vorschlag): Skalierung getrennt mischen, S̄ = Σ wⱼ·Sⱼ (oder über den Logarithmus), dann
  x' = R̄·S̄·(x − c) + Σ wⱼ·Tⱼ(c).
- **Rückfall:** Ist |m| fast null (zwei gleich gewichtete Knochen, 180° gegeneinander), gilt LBS.

**Für uns:** Drehzentren im 2D kosten je Anker eine komplexe Multiplikation mehr als LBS. Sie sind die richtige Grundeinstellung;
LBS bleibt als Schalter für Effekte, bei denen das Zusammenziehen gewollt ist.

### 4.3 Auf Anker und Griffe oder auf ein Dreiecksnetz?

| Programm | Wo die Knochen wirken | Mechanik |
|---|---|---|
| **Rive** | auf Eckpunkte von Vektorpfaden; Eckpunkt **und seine Bézier-Griffe** lassen sich getrennt gewichten | Laufzeit: je Punkt bis zu vier Knochen, Gewichte als Bytes; der Griff davor und danach wird mit eigenen Gewichten verformt; gemischt wird die 2×3-Matrix (LBS, ohne Drehungs-Sonderbehandlung). Auto-Gewichte nach dem nächsten Knochen mit „Blend“ (Übergangsbreite) und „Influence“ (Knochen je Punkt) ([Handbuch](https://rive.app/docs/editor/manipulating-shapes/bones.md), [weight.cpp](https://skia.googlesource.com/external/github.com/rive-app/rive-cpp/+/HEAD/src/bones/weight.cpp), [cubic_vertex.cpp](https://skia.googlesource.com/external/github.com/rive-app/rive-cpp/+/bb1dc56b1b46b3060f82011964df538d12db6dd3/src/shapes/cubic_vertex.cpp)) |
| **Spine** | auf Dreiecksnetze über Bildern | Gewichte je Eckpunkt; Verformungsschlüssel werden bei gewichteten Netzen **je Einfluss im Raum des Knochens** addiert, bevor der Knochen sie bewegt ([Laufzeit-Quelltext](https://raw.githubusercontent.com/EsotericSoftware/spine-runtimes/4.2/spine-ts/spine-core/src/attachments/Attachment.ts)); Auto-Gewichte „berücksichtigen die Topographie des Netzes“, Verfahren nicht offengelegt; Pinsel, Glätten, Begrenzen auf n Knochen, Sperren ([Weights](http://esotericsoftware.com/spine-weights)) |
| **Live2D** | auf Netze und hierarchische Verformer (Gitter- und Drehverformer) | Formen an Parameterwerten (Keyforms), dazwischen gerade gemischt; Blend Shapes addieren Formunterschiede, um das Vervielfachen der Keyforms zu vermeiden ([Blend Shapes](https://docs.live2d.com/en/cubism-editor-manual/blend-shape/)) |
| **After Effects** (Puppet) | auf ein Dreiecksnetz über der Ebene | Laut Adobe-Hilfe verformt sich das Netz beim Ziehen der Pins so starr wie möglich; Adobe nennt den Aufsatz nicht, die Herkunft aus Igarashi u. a. 2005 ist naheliegend ([Adobe-Hilfe](https://helpx.adobe.com/after-effects/using/animating-puppet-tools.html), [ARAP](https://www-ui.is.s.u-tokyo.ac.jp/~takeo/research/rigid)) |
| **Illustrator** (Puppet Warp) | auf Bézier-Anker **und** Griffe | Kurven-Ausgleich nach Liu, Jacobson, Gingold: „This research was adopted by Adobe Illustrator as the Puppet Warp tool.“ ([Projektseite](https://cragl.cs.gmu.edu/splineskin/)) |
| **Moho** | auf Vektorpunkte (Bindung an Knochen) † | „Smart Bones“ sind Korrekturposen, die ein Knochenwinkel auslöst, vergleichbar mit Pose Space Deformation ([Lester Banks](https://lesterbanks.com/2016/11/working-mohos-smart-bone-actions/)) |

**Gegenüberstellung.** Ein Dreiecksnetz kann jede Gewichtsauflösung und ARAP, verliert aber die Vektorschärfe (Bild auf Netz) oder
müsste unser Abstandsfeld durch die Verformung zurückrechnen. Kontrollpunkte bleiben scharf, editierbar und billig; ihre Schwäche ist,
dass die Verformung nur an Ankern und Griffen ausgewertet wird. Liu u. a. zeigen das an einem Steuerpunkt in der Mitte eines Stücks,
dessen Einfluss keinen Kontrollpunkt erreicht. **Für uns: Kontrollpunkte**, mit einem Netz im Inneren nur als Rechenhilfe (Gewichte, Biege-
Werkzeug), und mit Ankern an Gelenken oder dem Kurven-Ausgleich, wo ein Stück über ein Gelenk läuft.

### 4.4 Griffe unter Knochen

| Weg | Rechnung | Glätte | Wann |
|---|---|---|---|
| **G0 Griff erbt** | Griff nimmt die Gewichte seines Ankers. Rechnerisch dasselbe wie „Griff wird mit dem gemischten linearen Teil des Ankers abgebildet“: h' = (Σ wⱼAⱼ)·h bei LBS, h' = R̄·S̄·h bei Drehzentren (eigene Herleitung) | eine lineare Abbildung erhält Gegenläufigkeit und Längenverhältnis: glatt bleibt glatt | Standard |
| **G1 eigene Gewichte** (wie Rive) | Griffspitze wie ein eigener Punkt mit eigenen Gewichten | kann glatte Anker knicken → Glätte-Schutz | für Spezialeffekte: Rive-Beispiele gewichten Griffe anders als ihren Anker, sodass sie beim Skalieren eines Knochens unterschiedlich schnell wandern und ein räumlicher Eindruck entsteht † |
| **G2 Kurven-Ausgleich** (Liu, Jacobson, Gingold 2014) | Anker und Griffe so legen, dass die Kurve der verformten Kurve am nächsten kommt: min ∫‖C'·m(s) − x̃(s)‖² ds; Lösung C' = Σⱼ Tⱼ·(C·Ŵⱼ·Â⁻¹) mit Â = ∫ m·mᵀ, Ŵⱼ = ∫ wⱼ(B(s))·m·mᵀ ([PDF](https://cragl.cs.gmu.edu/splineskin/Skinning%20Cubic%20Bezier%20Splines%20and%20Catmull-Clark%20Subdivision%20Surfaces.pdf)) | Bedingungen für C0, C1 und G1 sind lineare Nebenbedingungen (G1 mit festem Längenverhältnis); freies G1 braucht wenige Iterationen | lange Stücke über einem Gelenk; Laufzeit wie LBS (vorberechnete Matrizen je Knochen) |
| G3 Jacobi-Matrix am Anker | Griff mit der vollen Ableitung der Verformung am Anker | braucht Ableitungen der Gewichte; für gemalte Gewichte nicht verfügbar | nicht nötig |

**Glätte-Schutz** nach G1 oder Physik (eigene Herleitung): Am glatten Anker p' mit verformten Griffvektoren u = i' − p' und
v = o' − p' sucht man die gemeinsame Richtung d, die beide Spitzen am wenigsten verschiebt, wenn ihre Längen bleiben:

```
d = (|v|·v − |u|·u) / ‖|v|·v − |u|·u‖,   i'' = p' − |u|·d,   o'' = p' + |v|·d
```

Ecken bleiben frei. Liu u. a. halten bestehende G1-Übergänge genauso über das feste Längenverhältnis
(c₄ − c₃ = (d₂ − d₁)·‖c₄ − c₃‖/‖d₂ − d₁‖) und erwähnen, dass Illustrator glatte Punkte beim Zeichnen C1 anlegt und beim Bearbeiten
zu G1 lockert. Unser „glatt“ ist G1.

**Rechenbeispiel Kurven-Ausgleich mit Morph:** Ändert ein Formziel die Ruhe-Kontrollpunkte C, ändert sich nur C in C·Ŵⱼ·Â⁻¹;
Ŵⱼ und Â bleiben, wenn die Gewichte am Kurvenparameter hängen. Bei 20 Ankern sind das je Knochen gut tausend Multiplikationen.

### 4.5 Biegen ohne Knochen: ARAP-Verformung (Igarashi, Moscovich, Hughes 2005)

Florian zieht an Stecknadeln, die Form biegt sich, als wäre sie aus Gummi: Das ist ARAP-Verformung, Grundlage von Puppet-Werkzeugen.
Die Umsetzung (Igarashi und Igarashi 2009, [PDF](https://www-ui.is.s.u-tokyo.ac.jp/~takeo/papers/takeo_jgt09_arapFlattening.pdf)) löst
zwei lineare Aufgaben: erst Drehung und gleichmäßige Größe frei, Scherung bestraft; dann werden die Drehungen je Dreieck übernommen und
die Größe angepasst. Matrizen werden beim Setzen oder Entfernen von Nadeln zerlegt; beim Ziehen bleibt nur Rückwärtseinsetzen. Die
Autoren warnen: „extreme deformations can cause fold over of the mesh“. Allgemeiner ist das lokal-globale ARAP (Drehung je Dreieck per
Polarzerlegung, dann ein dünn besetztes System; [libigl](https://libigl.github.io/tutorial/)).

**Für uns:** das Werkzeug „Biegen“ zum Formen von Schlüsseln und Posen, auch ohne Knochen. Das Ergebnis wird als Form gespeichert
(Schlüssel oder Korrektur), nicht als Laufzeit-Verformung; so bleibt alles „eine Form, viele Zustände“.

---

## 5. Gewichte und Autorig

### 5.1 Verfahren im Vergleich

| Verfahren | Rechnung | glatt | örtlich | formbewusst (springt nicht über Lücken) | in [0, 1] | Aufwand in TypeScript |
|---|---|---|---|---|---|---|
| nächster Knochen + Übergang (Rive „Auto“) | Abstand | mittel | ja | nein | ja | klein |
| Spine „Auto“ | „berücksichtigt die Topographie des Netzes“, nicht offengelegt | ? | ? | laut Handbuch ja | ja | – |
| **Wärmeleitung** (Baran und Popović 2007) | (−Δ + H)·wᵢ = H·pᵢ; Hⱼⱼ = c/d(j)², wenn die kürzeste Strecke zum nächsten Knochen im Inneren liegt, sonst 0; pᵢⱼ = 1, wenn Knochen i der nächste ist. Die Matrix hängt nicht vom Knochen ab: einmal zerlegen | ja | weitgehend | ja | praktisch ja | mittel |
| **Bounded Biharmonic Weights** (Jacobson, Baran, Popović, Sorkine 2011) | min Σᵢ ∫(Δwᵢ)²; wᵢ = 1 am eigenen Griff, 0 an den anderen; 0 ≤ wᵢ ≤ 1; Σ wᵢ = 1; quadratische Optimierung (libigl: Active Set oder MOSEK). Für Punkte, Knochen und Hüllen gemischt ([Projekt](https://igl.ethz.ch/projects/bbw/), [libigl](https://libigl.github.io/tutorial/)) | sehr | ja | ja | erzwungen | groß (kein fertiger Löser in TS) |
| harmonische Koordinaten (Joshi u. a. 2007) | Laplace-Gleichung im Inneren einer Hülle | ja | ja | ja | ja | mittel |
| Mittelwert-Koordinaten (Floater 2003; Hormann und Floater 2006) | geschlossene Formel; glatt und robust für beliebige einfache Polygone; bei nicht konvexen Hüllen nicht mehr unbedingt positiv ([PDF](https://www.inf.usi.ch/hormann/papers/Hormann.2006.MVC.pdf)) | ja | nein | nein | nein | klein |
| Green-Koordinaten (Lipman, Levin, Cohen-Or 2008) | geschlossene Formel, formtreu (im 2D konform) | ja | nein | nein | nein | klein |

„Hülle“ meint ein grobes Polygon um die Form (in der Literatur „cage“). Hüllkoordinaten sind gut für Verformer wie Live2Ds
Gitterverformer (ganze Teile stauchen, wabbeln); für Knochen sind Wärmeleitung und BBW die richtige Wahl.

### 5.2 Rechengebiet für Vektorformen

Liu u. a. haben für BBW im 2D die größte geschlossene Kurve trianguliert, mit Kurvenpunkten als Randbedingung (je Kurve 100 Proben
oder eine je Pixel). Für uns (Vorschlag):

1. Inneres jedes Teils (oder aller Teile einer Knochenkette) triangulieren, Kurvenpunkte als Rand.
2. Gewichte an den Netzpunkten rechnen (Wärme), an den Ankern ablesen.
3. **Griffe:** Standard „erbt“ (G0). Wer eigene Griffgewichte will, bekommt als Vorschlag das Gewicht der Kurve bei einem Drittel
   (Griff danach) bzw. zwei Dritteln (Griff davor) des Stücks; danach Glätte-Schutz.
4. Bindung an die Ruheform; Formziele verschieben Anker, die Gewichte bleiben am Anker (kein Neurechnen je Bild).

### 5.3 Nacharbeit

Höchstens vier Knochen je Anker (Rive packt genau vier, Spine begrenzt über „Prune“), Summe 1, Glätten entlang der Kontur, Sperren
einzelner Knochen (Rive und Spine), Spiegeln für symmetrische Figuren. Gemalt wird mit Pinsel wie in Spine (Stärke, Größe,
weicher Rand), sichtbar als Farbe auf der Kontur und als kleine Torte am Anker (Rive).

### 5.4 Knochen aus Bewegung vorschlagen (Vorschlag)

Zeichnet Florian ein Ohr in zwei Lagen, ist der feste Punkt der Ähnlichkeit z* = b/(1 − a) (2.4 a) der natürliche Drehpunkt. Über
mehrere Lagen k mit bekannten Drehungen aₖ (Procrustes) ist er die Lösung kleinster Quadrate:

```
pᵢₖ ≈ z* + aₖ·(pᵢ₀ − z*)   ⇒   z* = Σₖ,ᵢ conj(1 − aₖ)·(pᵢₖ − aₖ·pᵢ₀) / Σₖ,ᵢ |1 − aₖ|²
```

Das Studio schlägt dort einen Knochen vor. Die volle Fassung (Knochen und Gewichte aus Beispielformen zugleich) ist „Smooth Skinning
Decomposition with Rigid Bones“ (Le und Deng, SIGGRAPH Asia 2012); für Ozzy reicht der Drehpunkt je Teil.

---

## 6. Morph und Knochen zusammen

### 6.1 Reihenfolge: erst Form, dann Knochen

Korrekturen gehören in den **Ruheraum**, also vor das Skinning: Lewis, Cordner und Fong speichern die Abweichungen im örtlichen
Rahmen, sodass reine Gelenkbewegung null Abweichung ergibt ([PSD](https://www.scribblethink.org/Work/PSD/PSD.pdf)). Spine macht es
bei gewichteten Netzen ebenso: Die Verformung wird je Einfluss im Raum des Knochens addiert, bevor der Knochen sie bewegt
([Laufzeit](https://raw.githubusercontent.com/EsotericSoftware/spine-runtimes/4.2/spine-ts/spine-core/src/attachments/Attachment.ts)).
Damit dreht eine Korrektur am Knie mit dem Unterschenkel mit.

### 6.2 Vier Arten von Formänderung, eine Bedienung

| Art | ausgelöst durch | Vorbild | Rechnung |
|---|---|---|---|
| **Ansichts-Schlüssel** | ein Parameter (Kopfwinkel, Körperwinkel) | Live2D-Keyforms, Rive-Joysticks, Prototyp `raster.ts` | Rahmen + Rest (2.6) |
| **Formziel** (additiv) | Regler 0…1 (Augen schließen, Bohne stauchen) | Live2D Blend Shapes (addieren, an Grenzen geklemmt, können sich gegenseitig aufheben) | S = S₀ + Σₖ wₖ·ΔSₖ |
| **Korrekturform** | Knochenwinkel | Pose Space Deformation, Moho Smart Bones | ΔS(β) per PCHIP über β (6.3) |
| **Übergangsform** | Übergang von Pose A nach B | Zwischenzeichnung im Trickfilm | Glocke über dem Übergang (6.5) |

Alle vier sind Deltas auf derselben Ankerliste, gezeichnet mit denselben Werkzeugen: Florian stellt den Auslöser ein (Winkel, Regler,
Übergangsmitte) und formt; das Studio speichert das Delta in der richtigen Schicht. **Griff-Deltas** werden polar gespeichert
(gemeinsamer Winkel für glatte Anker, Längen über den Logarithmus), damit auch die Summe mehrerer Deltas glatte Anker glatt lässt.
Additive Deltas mischen sich gerade; drehartige Änderungen gehören deshalb in Rahmen oder Knochen, nicht in Formziele.

### 6.3 Korrekturformen (Pose Space Deformation)

Nach Lewis u. a. (SIGGRAPH 2000): Eine Pose ist die Stellung der Regler; für einen Ellbogen ist der Raum eindimensional (ein Winkel),
für die Schulter mehrdimensional. Gemischt wird mit radialen Basisfunktionen, d̂(x) = Σₖ wₖ·φ(‖x − xₖ‖), meist Gaußglocken; die
Gewichte folgen aus einem linearen System (Normalgleichung ΦᵀΦ·w = Φᵀd). Für uns:

- **ein Winkel** (Knie, Hals): PCHIP über dem Winkel mit (β_Ruhe, 0) als festem Schlüssel; außerhalb festhalten. So arbeiten Moho
  Smart Bones aus Sicht des Nutzers: Knochen drehen, Form korrigieren.
- **zwei Winkel** (Kopf links/rechts und oben/unten): Raster mit höchstens 3 × 3 Formen wie Live2D, bilinear oder PCHIP je Richtung;
  bei unregelmäßig gesetzten Formen normierte Gaußglocken (Summe der Gewichte 1, kein Überschwingen).

### 6.4 „Pose zeichnen, Studio zerlegt“ (Vorschlag)

Florian will Übergänge selbst formen, nicht Knochen bedienen. Zeichnet er eine Pose frei (Illustrator-Werkzeuge, Biegen), passt das
Studio vom Rumpf nach außen je Knochen die beste Drehung ein und speichert nur den Rest:

```
θⱼ = arg Σᵢ wᵢⱼ · conj(xᵢ − J)·(yᵢ − J')        gewichteter Procrustes um das Gelenk (J Ruhe, J' Pose)
δᵢ = Mᵢ⁻¹·(yᵢ − skin(xᵢ))                       Rest zurück in den Ruheraum (Mᵢ = gemischter linearer Teil am Anker)
```

Der Rest wird zur Korrektur am Knochenwinkel (6.3) oder zum Posen-Delta. Gewinn: Zwischen zwei gezeichneten Posen drehen die Knochen
(kein Schrumpfen), und der kleine Rest mischt sich gerade. Das ist dieselbe Zerlegung „Drehung plus Rest“ wie in der ARAP-Interpolation,
nur auf Knochen-Ebene.

### 6.5 Übergänge zwischen Posen (Vorschlag)

Posen sind Zahlen: Knochenwinkel, Formregler, Ansichtswinkel. Ein Übergang mischt sie:

```
P(s) = lerp(A, B, e(s)) + b(s)·Δ_AB      e: Ease-Kurve (e(0)=0, e(1)=1), b: Glocke (b(0)=b(1)=0, z. B. 4s(1−s))
Winkel: B relativ zu A abgewickelt (kürzester Weg) oder in der gewählten Drehrichtung
Versatz je Teil: s_Teil = clamp((s − δ_Teil)/(1 − δ_Teil))   (Ohren und Schwanz folgen später)
```

Δ_AB ist die **Übergangsform**: Florian formt sie bei s = ½ wie jede andere Form; Anfang und Ende bleiben unberührt. Für das
Umschalten mitten in einer Bewegung (Spiel) ist Inertialisierung die bessere Wahl (Recherche 16.11.).

### 6.6 Delta Mush

Delta Mush (Mancewicz, Derksen, Wilson, DigiPro 2014, [Archiv](https://history.siggraph.org/?p=138877)) glättet eine
beliebige Verformung (Laplace-Glättung) und setzt die in der Ruhelage gemessenen Details wieder ein; einfache Bindungen sehen dadurch
sauber aus. Direct Delta Mush (Le und Lewis 2019, [EA SEED](https://www.ea.com/seed/news/siggraph2019-direct-delta-mush)) ersetzt das
Iterieren durch eine direkte Rechnung in der Größenordnung von Skinning-Verfahren. Für uns geringe Priorität: Mit wenigen Ankern,
Drehzentren und Korrekturformen gibt es kaum etwas zu glätten. Denkbar später als „Glätten“ nach der Ankerphysik.

---

## 7. Physik in der Kette

| Ebene | Was | Vorbild | Formel / Regler |
|---|---|---|---|
| **Knochen** | Nachschwingen von Ohren, Schwanz, Kopf | Spine-Physik-Bedingungen ([Handbuch](https://esotericsoftware.com/spine-physics-constraints)) | Versatz gegenüber der animierten Pose für x, y, Drehung, Scherung, Skalierung; Regler Trägheit, Stärke (zieht zur Pose zurück), Masse, Dämpfung, Wind, Schwerkraft, Mischung; abspielbar von Bild 0 an (deterministisch) |
| **Parameter** | Physik schreibt Regler (Kopfneigung, Ohrschwung) | Live2D-Physik †, „Rig-Space Physics“ (Hahn u. a. 2012) | Feder auf dem Parameter; alles Weitere (Morph, Korrekturen, Skinning) läuft unverändert |
| **Anker** | Wabbeln der Bohne, Aufprall | Formabgleich „Meshless Deformations Based on Shape Matching“ (Müller u. a. 2005, [PDF](https://matthias-research.github.io/pages/publications/MeshlessDeformations_SIG05.pdf)) | Ziel gᵢ = R·(x⁰ᵢ − x⁰_cm) + x_cm, R aus der Polarzerlegung von A_pq; vᵢ += α·(gᵢ − xᵢ)/h; bedingungslos stabil; lineare und quadratische Moden (β) erlauben Stauchen; Teilgruppen für mehr Freiheit |

**Für uns (Vorschlag):** Das Ziel des Formabgleichs ist in jedem Bild die geskinnte und gemorphte Form (x⁰ = animierte Form), so wabbelt
die Bohne um die Animation herum, statt sie zu ersetzen. Griffe folgen der örtlichen Drehung ihres Ankers (R aus dem Formabgleich), so
bleiben glatte Anker glatt; danach Glätte-Schutz. Reihenfolge: Knochenphysik vor dem Skinning und vor den Korrekturen (ein
schwingender Schwanz löst seine Korrekturen aus), Ankerphysik nach dem Skinning.

---

## 8. Empfohlene Rechenkette

```
Eingang je Bild: Parameter π (Knochenwinkel, Formregler, Ansichtswinkel, Physik- und Spielwerte)

0 Grundform S₀        Anker p, Griffe h⁻, h⁺ als Vektoren; Art je Anker: glatt (ein Winkel) | Ecke (zwei Winkel)
1 Ansichts-Morph      S_θ = Rahmen + Rest (2.6): pᵢ = c + a·rᵢ,  hᵢ = a·τᵢ·Lᵢ·exp(ln qᵢ);  Falten als Ereignisse (3)
2 Formziele, Korrekt. S = S_θ + Σₖ wₖ(π)·ΔSₖ   (Ruheraum; Griff-Deltas polar; Korrektur-Gewichte = PCHIP über Knochenwinkel)
3 Knochenphysik       βⱼ ← βⱼ_anim + Feder(Trägheit, Stärke, Dämpfung, Schwerkraft)
4 Skinning            pᵢ' = R̄ᵢ·S̄ᵢ·(pᵢ − cᵢ) + Σⱼ wᵢⱼ·Tⱼ(cᵢ),   R̄ᵢ = mᵢ/|mᵢ|,  mᵢ = Σⱼ wᵢⱼ·e^{iβⱼ}
                      Griffe: h' = R̄·S̄·h (erben)  | eigene Gewichte + Glätte-Schutz  | Kurven-Ausgleich je Knochen
                      starre Teile: ein Knochen, Gewicht 1 (der Renderer verschmilzt die Teile)
5 Ankerphysik         Formabgleich zum Ziel aus 4:  x += α·(g − x);  Griffe drehen mit R
6 Wächter             Sehnenumkehr, Schlaufe (Stone–DeRose), Selbstschnitt → Marke im Editor; Glätte-Schutz an glatten Ankern
7 Darstellung         Kurven → Abstandsfelder, weiches Verschmelzen, Verjüngungen, 2D-Shader
```

**Kosten.** Schritte 1 bis 6 sind O(Anker × Knochen je Anker); nach Überschlag bei einigen hundert Ankern Bruchteile einer
Millisekunde in TypeScript, auch auf dem iPhone (mit der ersten Probe zu messen). Einmalig beim Binden: Triangulieren, Wärme-Gewichte
(eine Zerlegung, ein Rückwärtseinsetzen je Knochen), Drehzentren. Der Kurven-Ausgleich (G2) kostet einmal eine kleine Zerlegung je
Form und zur Laufzeit Matrixprodukte wie LBS.

**Die Glätte-Regel (gilt in jeder Stufe).** Glatte Anker haben einen gemeinsamen Griffwinkel: im Morph (2.3), in Deltas (6.2), unter
Knochen (4.4, G0 automatisch), in der Physik (7). Wo eine Stufe das nicht von selbst erfüllt (eigene Griffgewichte, Ankerphysik),
stellt der Glätte-Schutz es wieder her. Ecken bleiben Ecken.

---

## 9. Gegenüberstellungen für unseren Fall

Kriterien: Florian entscheidet mit dem Auge und programmiert nicht; Formen müssen glatt laufen (keine Sprünge, kein Rutschen, kein
Verklumpen); er will Übergänge selbst formen; Mac, iPad und iPhone; wenige Anker, viel Arbeit mit Griffen.

### 9.1 Mischen zwischen Schlüsselformen

| Art | genau an Schlüsseln | Drehung ohne Schrumpfen | Biegung im Teil | Schutz vor Vorbeilaufen | Bau | Laufzeit | verständlich |
|---|---|---|---|---|---|---|---|
| gerade | ja | nein | nein | nein | trivial | trivial | ja, aber hässlich |
| PCHIP auf x/y, Griffe polar absolut (heute) | ja | nur mit dichten Schlüsseln | nein | Faltschlüssel | da | trivial | ja |
| **Rahmen + Rest, Griffe relativ** (2.6) | ja | ja (Teil und örtlich) | nein | Faltschlüssel, weniger Fehlalarme | klein | trivial | ja |
| intrinsisch (Sederberg) | ja | ja | ja, entlang der Kontur | Sehne kann nicht durch null | mittel | klein | mittel (Schließfehler wandert) |
| ARAP-Interpolation (Alexa) | ja | ja | ja | gut, ohne Garantie | mittel bis groß | klein | ja |
| begrenzte Verzerrung (Chen u. a.) | ja | ja | ja | garantiert im Netz | groß | Optimierung | ja |

**Urteil:** Rahmen + Rest als Standard für neue Formen; ARAP-Interpolation als Mischart „biegen“ je Teil für Formen, die sich ohne
Knochen in sich biegen. Bei Florians fertigen Schlüsseln (Kopfdrehung) wird die Mischart nie still gewechselt, nur nach
Vergleichsbild und auf sein Wort.

### 9.2 Skinning

| Art | Gelenk bleibt voll | Ausbeulen | Kosten | Bemerkung |
|---|---|---|---|---|
| LBS (Rive, Spine) | nein, Faktor cos(φ/2) | nein | minimal | Standard der Branche |
| normierte komplexe Drehung, Verschiebung gerade gemischt | ja | je nach Bezugspunkt | minimal | Ergebnis hängt vom gewählten Ursprung ab, unsauber |
| dual-komplex (2D-Dual-Quaternionen) | ja | ja, typisch | klein | starr, sauber definiert |
| **Drehzentren** (Le und Hodgins) | ja | gemindert | klein | einmal Zentren rechnen |
| ARAP-Nadeln | ja | nein | ein System je Bild | als Werkzeug, nicht zur Laufzeit |

**Urteil:** Drehzentren als Standard, LBS als Schalter.

### 9.3 Griffe unter Knochen

**Urteil:** G0 (erben) als Standard; G1 (eigene Gewichte) als Schalter je Griff mit automatischem Glätte-Schutz; G2 (Kurven-Ausgleich)
nur, wenn ein Stück über ein Gelenk läuft und das Studio dort nicht einfach einen Anker setzen darf (Florian will wenige Anker).

### 9.4 Gewichte

**Urteil:** Wärmeleitung als Autorig-Standard (gutes Ergebnis, kleines lineares System); Pinsel, Glätten, Sperren zum Nacharbeiten;
BBW erst, wenn Wärme sichtbar nicht reicht. Für Ozzy zuerst „Teil starr am Knochen“; Gewichte nur für Schwanz, Ohren, Hals, Bohne.

### 9.5 Ort der Verformung

**Urteil:** Kontrollpunkte (scharf, editierbar, passend zum Abstandsfeld-Renderer); Dreiecksnetz nur als Rechenhilfe.

---

## 10. Empfehlungen

1. **„Eine Form, viele Zustände“ als Grundgesetz:** Ansichts-Schlüssel, Formziele, Korrekturen und Übergangsformen sind Deltas auf
   derselben Ankerliste; neue Anker exakt in allen Zuständen (de Casteljau), Löschen nur mit angezeigter Abweichung.
2. **Mischart „Rahmen + Rest“** mit Griffen relativ zur örtlichen Tangente (2.6) als Standard für neue Formen; die 100°-Ausnahme
   entfällt. Für fertige Schlüssel nur nach Vergleichsbild.
3. **Glätte-Regel** überall: glatte Anker mit gemeinsamem Griffwinkel, Glätte-Schutz nach jeder Stufe, die ihn verletzen kann.
4. **Falten als sichtbare Ereignisse** (Marke, verschiebbar, formbar), dazu drei Prüfungen je Bild mit roter Markierung statt stiller
   Reparatur.
5. **Skinning auf Anker und Griffe** mit Drehzentren (komplex normiert), höchstens vier Knochen je Anker, LBS als Schalter.
6. **Griffe erben** standardmäßig; eigene Griffgewichte als Schalter je Griff; Kurven-Ausgleich nach Liu u. a. als spätere Stufe.
7. **Autorig-Gewichte über Wärmeleitung** auf einer Triangulierung des Inneren; Ablesen an Ankern; Pinsel, Glätten, Sperren, Spiegeln.
8. **Knochen aus Bewegung vorschlagen:** fester Punkt der Ähnlichkeit zwischen zwei gezeichneten Lagen als Drehpunkt.
9. **Korrekturformen** im Ruheraum, ausgelöst durch einen Knochenwinkel (PCHIP), später zwei Winkel (Raster).
10. **„Pose zeichnen, Studio zerlegt“:** freie Pose → Drehungen in die Knochen (gewichteter Procrustes), Rest als Korrektur.
11. **Übergänge** als Mischung im Zahlenraum der Pose mit Ease-Kurve, optionaler Übergangsform (Glocke) und Versatz je Teil.
12. **Physik** auf drei Ebenen in fester Reihenfolge: Knochen (Federn wie Spine), Parameter, Anker (Formabgleich zur animierten Form).
13. **Biegen-Werkzeug** (ARAP-Nadeln) zum Formen von Schlüsseln und Posen; Ergebnis wird als Form gespeichert.
14. **Ozzy zuerst einfach:** starre Teile an Knochen plus Verschmelzen im Renderer; Gewichte nur, wo eine Form sich biegt.

## 11. Sichtbare Proben (je Schritt vorher festgelegt)

1. **Ohr dreht 120° zwischen zwei Schlüsseln:** gerade, PCHIP heute, Rahmen + Rest, feste-Punkt-Spirale nebeneinander, gleiche
   Ansicht, Mitte des Übergangs. Kriterium: kein Schrumpfen, Ansatz bleibt am Kopf, keine Knicke an glatten Ankern.
2. **Stirnfranse zwischen 52° und 82°** (offene Stelle der Kopfdrehung): Griffe absolut gegen relativ zur Tangente. Kriterium: kein
   Kreisschlagen, keine Kerbe in der Nahaufnahme.
3. **Schwanz mit drei Knochen, 90° gebogen:** LBS gegen Drehzentren, beide mit Wärme-Gewichten. Kriterium: Biegung bleibt voll, keine
   Delle innen.
4. **Griff mit eigenem Gewicht an glattem Anker:** ohne und mit Glätte-Schutz. Kriterium: kein Knick am Anker in keinem Bild.
5. **Korrektur am Kniewinkel** (Bohne beult beim Hinsetzen): Knochen drehen, formen, durchspielen. Kriterium: Korrektur dreht mit dem
   Bein, Übergang ohne Ruck.

## 12. Offene Fragen

- **An Florian:** Soll das Studio Drehungen aus einer frei gezeichneten Pose automatisch in Knochen auslagern (6.4), oder will er
  Knochen und Formen getrennt bedienen?
- **An Florian:** Dürfen Formen zwischen zwei Schlüsseln über die Schlüssel hinausschwingen (Schwung als Stilmittel, Regler je
  Schlüssel), oder immer monoton wie heute?
- **An Florian:** Falten automatisch einsetzen und als Marke zeigen, oder erst fragen?
- **Technisch:** Reicht für Ozzy „Rahmen + Rest“, oder braucht ein Teil (Schwanz, Fransen) die ARAP-Interpolation? Klärt Probe 1/2.
- **Technisch:** Wie viel bringt der Kurven-Ausgleich (G2) gegenüber einem zusätzlichen Gelenk-Anker bei Florians wenigen Ankern?
- **Technisch:** Dünn besetzte Zerlegung in TypeScript für Wärme-Gewichte (eigene LDLᵀ oder vorkonditioniertes CG): Aufwand und Tempo auf
  dem iPad prüfen; BBW-Löser (quadratische Optimierung) erst bei Bedarf.
- **Technisch:** Mehrere Konturen in einer Form (Löcher) und Teile, die erscheinen oder verschwinden (Länge-null-Stücke statt neuer
  Anker), sind im Morph noch nicht durchdacht.
- **Nicht geprüft in dieser Runde (†):** Details von Animate-Formmarken, Harmony-Hinweisen, After Effects „Smart Mask Interpolation“
  und Live2D-Physik; vor einer Entscheidung, die darauf beruht, nachlesen.

## 13. Quellen

**Aufsätze und Projektseiten**

- Alexa, Cohen-Or, Levin: As-Rigid-As-Possible Shape Interpolation, SIGGRAPH 2000 — [PDF](https://www.tau.ac.il/~levin/arap.pdf)
- Igarashi, Moscovich, Hughes: As-Rigid-As-Possible Shape Manipulation, SIGGRAPH 2005 — [Projekt](https://www-ui.is.s.u-tokyo.ac.jp/~takeo/research/rigid)
- Igarashi, Igarashi: Implementing As-Rigid-As-Possible Shape Manipulation and Surface Flattening, JGT 2009 — [PDF](https://www-ui.is.s.u-tokyo.ac.jp/~takeo/papers/takeo_jgt09_arapFlattening.pdf)
- Jacobson, Baran, Popović, Sorkine: Bounded Biharmonic Weights for Real-Time Deformation, SIGGRAPH 2011 — [Projekt](https://igl.ethz.ch/projects/bbw/), [Adobe Research](https://research.adobe.com/publication/bounded-biharmonic-weights-for-real-time-deformation)
- libigl-Tutorial (biharmonische Verformung, BBW, DQS gegen LBS, ARAP, FAST) — [Tutorial](https://libigl.github.io/tutorial/)
- Liu, Jacobson, Gingold: Skinning Cubic Bézier Splines and Catmull-Clark Subdivision Surfaces, SIGGRAPH Asia 2014 — [Projekt](https://cragl.cs.gmu.edu/splineskin/), [PDF](https://cragl.cs.gmu.edu/splineskin/Skinning%20Cubic%20Bezier%20Splines%20and%20Catmull-Clark%20Subdivision%20Surfaces.pdf), [Code 2D](https://github.com/songrun/VectorSkinning)
- Baran, Popović: Automatic Rigging and Animation of 3D Characters (Pinocchio, Wärme-Gewichte), SIGGRAPH 2007 — [PDF](https://people.csail.mit.edu/ibaran/papers/2007-SIGGRAPH-Pinocchio.pdf)
- Lewis, Cordner, Fong: Pose Space Deformation, SIGGRAPH 2000 — [PDF](https://www.scribblethink.org/Work/PSD/PSD.pdf)
- Mancewicz, Derksen, Wilson: Delta Mush: Smoothing Deformations While Preserving Detail, DigiPro 2014 — [Archiv](https://history.siggraph.org/?p=138877)
- Le, Lewis: Direct Delta Mush Skinning and Variants, SIGGRAPH 2019 — [EA SEED](https://www.ea.com/seed/news/siggraph2019-direct-delta-mush)
- Le, Hodgins: Real-time Skeletal Skinning with Optimized Centers of Rotation, SIGGRAPH 2016 — [Disney Research](https://studios.disneyresearch.com/?p=39548)
- Kavan, Collins, Žára, O'Sullivan: Geometric Skinning with Approximate Dual Quaternion Blending, TOG 2008 — [PDF](https://users.cs.utah.edu/~ladislav/kavan08geometric/kavan08geometric.pdf)
- Matsuda, Kaji, Ochiai: Anti-commutative Dual Complex Numbers and 2D Rigid Transformation, 2016 — [arXiv](https://arxiv.org/abs/1601.01754)
- Sederberg, Gao, Wang, Mu: 2-D Shape Blending: An Intrinsic Solution to the Vertex Path Problem, SIGGRAPH 1993 — [Archiv](https://history.siggraph.org/?p=118584)
- Hormann, Floater: Mean Value Coordinates for Arbitrary Planar Polygons, TOG 2006 — [PDF](https://www.inf.usi.ch/hormann/papers/Hormann.2006.MVC.pdf)
- Yuksel, Schaefer, Keyser: Parameterization and Applications of Catmull-Rom Curves — [Projekt](http://www.cemyuksel.com/research/catmullrom_param/)
- Chen, Weber u. a.: Planar Shape Interpolation with Bounded Distortion (2013), Bounded Distortion Harmonic Shape Interpolation (2016), GPU-Accelerated Locally Injective Shape Deformation (2017) — [Publikationsliste](https://renjiec.github.io/)
- Müller, Heidelberger, Teschner, Gross: Meshless Deformations Based on Shape Matching, SIGGRAPH 2005 — [PDF](https://matthias-research.github.io/pages/publications/MeshlessDeformations_SIG05.pdf)
- Ohne Link (bekannte Literatur, in dieser Runde nicht abgerufen): Sederberg, Greenwood: A Physically Based Approach to 2-D Shape
  Blending (SIGGRAPH 1992); Sebastian, Klein, Kimia: On Aligning Curves (PAMI 2003); Fritsch, Carlson: Monotone Piecewise Cubic
  Interpolation (SIAM 1980); Fritsch, Butland (1984); Kochanek, Bartels: Interpolating Splines with Local Tension, Continuity, and Bias
  Control (SIGGRAPH 1984); Stone, DeRose: A Geometric Characterization of Parametric Cubic Curves (TOG 1989); Joshi u. a.: Harmonic
  Coordinates for Character Articulation (SIGGRAPH 2007); Floater: Mean Value Coordinates (CAGD 2003); Lipman, Levin, Cohen-Or: Green
  Coordinates (SIGGRAPH 2008); Baxter, Barla, Anjyo: Rigid Shape Interpolation Using Normal Equations (NPAR 2008); Le, Deng: Smooth
  Skinning Decomposition with Rigid Bones (SIGGRAPH Asia 2012); Hahn u. a.: Rig-Space Physics (SIGGRAPH 2012).

**Handbücher und Quelltext**

- Rive: Bones, Bind, Auto-Weights, Griffgewichte — [Handbuch](https://rive.app/docs/editor/manipulating-shapes/bones.md), [Tipps](https://rive.app/docs/editor/manipulating-shapes/bone-tips.md); Laufzeit [weight.cpp](https://skia.googlesource.com/external/github.com/rive-app/rive-cpp/+/HEAD/src/bones/weight.cpp), [cubic_vertex.cpp](https://skia.googlesource.com/external/github.com/rive-app/rive-cpp/+/bb1dc56b1b46b3060f82011964df538d12db6dd3/src/shapes/cubic_vertex.cpp), [cubic_weight (Rust-Port)](https://docs.fuchsia.dev/rust/src/rive_rs/bones/cubic_weight.rs.html)
- Spine: [Weights](http://esotericsoftware.com/spine-weights), [Meshes](https://eu.esotericsoftware.com/spine-meshes.md), [Physik](https://esotericsoftware.com/spine-physics-constraints), [Laufzeit computeWorldVertices](https://raw.githubusercontent.com/EsotericSoftware/spine-runtimes/4.2/spine-ts/spine-core/src/attachments/Attachment.ts)
- Live2D Cubism: [Erweiterte Interpolation](https://docs.live2d.com/en/cubism-editor-manual/extended-interpolation/), [Blend Shapes](https://docs.live2d.com/en/cubism-editor-manual/blend-shape/), [Keyforms X/Y](https://docs.live2d.com/en/cubism-editor-manual/keyform-xydirection/)
- GSAP MorphSVG — [Doku](https://gsap.com/docs/v3/Plugins/MorphSVGPlugin/); Flubber — [README](https://github.com/veltman/flubber)
- Adobe After Effects Puppet — [Hilfe](https://helpx.adobe.com/after-effects/using/animating-puppet-tools.html) (Inhalt über die Suche bestätigt, Seite selbst gesperrt)
- Moho Smart Bones — [Lester Banks](https://lesterbanks.com/2016/11/working-mohos-smart-bone-actions/)
- Nutzerstimmen After Effects — [Adobe-Forum](https://community.adobe.com/t5/after-effects-discussions/how-do-i-morph-shapes-with-different-points-in-a-controlled-way/m-p/10037073), [ProVideo Coalition](https://www.provideocoalition.com/after-effects-hidden-gems-set-first-vertex/) (aus der Recherche vom 16.11.)

**Im Repo**

- Prototyp: `apps/editor/src/ozzy-figur/form.ts` (Morph, PCHIP, Abgleich), `raster.ts` (Schlüssel, Faltschlüssel)
- Frühere Recherchen: [`2026-11-16-ozzy-morph-und-animation.md`](../2026-11-16-ozzy-morph-und-animation.md),
  [`2026-11-18-ozzy-figur-recherche.md`](../2026-11-18-ozzy-figur-recherche.md)
