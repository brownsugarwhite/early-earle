# Rendern auf der Grafikkarte und 2D-Effekte für den Figureneditor

Thema 10 der Recherche zum Editor („Studio“). Stand: 20.11.2026.

**Frage:** Mit welchem Verfahren zeichnet der Editor seine Vektorformen auf der Grafikkarte (Mac, iPad, iPhone, im Browser
und in der App), und welche 2D-Effekte lohnen sich für eine schwarz-weiße Cartoonfigur im Spiel? Am Ende stehen eine
Empfehlung für die Architektur des Renderers, eine priorisierte Effektliste und offene Fragen.

**Grundlage:** Handbücher, Changelogs, Papers, Fehlerberichte und Nutzerstimmen (Links am Ende), dazu Code und Messwerte
unseres Prototyps (`apps/editor/src/ozzy-figur/renderer.ts`, `form.ts`, `docs/look/ozzy-figur/UEBERGABE.md`). Gegen Ende
war das Suchbudget dieses Durchgangs aufgebraucht; die wenigen Aussagen ohne frische Quelle sind als *Fachwissen*
gekennzeichnet. Alle Zeitangaben für das iPhone sind Schätzungen, solange niemand gemessen hat.

---

## Kurzfassung

1. **Für unseren Look zählt, ob der Renderer Abstände kennt, nicht wie schnell er Pfade füllt.** Weiches Verschmelzen,
   Verjüngungen statt Outlines, weiche Ränder, Schein, Kontaktschatten, Auflösen: Alles das sind Funktionen des Abstands
   zur Kante. Ein Abstandsfeld-Renderer liefert sie billig und aus einem Guss; ein Renderer, der nur Abdeckung rechnet,
   liefert keinen davon.
2. **Kein fertiger Renderer kann Flächen weich verschmelzen.** Rive, Vello, Skia/CanvasKit, PixiJS und ThorVG/Lottie
   rechnen Abdeckung. Am nächsten kommt Rives „Vector Feathering“ (weiche Kante analytisch aus der Geometrie, ohne
   Weichzeichner), aber auch das verschmilzt nichts.
3. **Unser Prototyp ist im Prinzip richtig gebaut:** Vorzeichen aus der Schablone (wie Stencil-and-Cover), Abstand aus
   „gespritzten“ Streckenrechtecken, Bild aus einem Shader mit weicher Vereinigung, Kantenglättung aus dem Abstand. Für ein
   Produkt fehlen: mehr als 24 Flächen, Verschmelz- und Ebenenregeln als Daten statt als Code, eine Abflachung mit stabiler
   Stückzahl und Felder, die beim Hineinzoomen nicht sättigen.
4. **Empfehlung Architektur:** eine Laufzeit für Editor und Spiel. Der Prozessor wertet aus (Knochen, Formschlüssel, Physik)
   und flacht mit fester Stückzahl ab; die Grafikkarte baut die Felder und rechnet das Bild in einem Durchgang, dessen
   Shader aus dem Verschmelz- und Ebenenmodell des Editors übersetzt wird. Effekte rechnen im selben Durchgang aus Abstand,
   Rauschen und Zeit; teure Nachbearbeitungen (Bloom, Weichzeichner, echte Bewegungsunschärfe) entfallen.
5. **Zweistufig bauen:** Stufe 1 verallgemeinert den heutigen Weg (Felder in Texturen) und misst ihn auf dem iPhone. Nur
   wenn Messung oder Szenengröße es verlangen, folgt Stufe 2: ein Kachel-Durchgang ohne Zwischentexturen (Abstand,
   Vorzeichen und Gefälle direkt im Bildshader; spart Speicherbandbreite, hebt die Grenze von 24 Flächen auf).
6. **Grafikschnittstelle: WebGL2 jetzt, WebGPU später.** WebGL2 läuft auf allen Zielgeräten, auch in der App (WKWebView);
   unsere Last besteht aus wenigen Zeichenaufrufen mit viel Rechnen je Bildpunkt, dafür ist WebGL2 ausreichend. WebGPU ist
   seit Safari 26 (September 2025) da, verlangt aber iOS 26 und hatte in den ersten Versionen schwere Fehler (behoben in
   Safari 26.4, März 2026).
7. **Kantenglättung aus dem Abstand ist für uns die beste:** stabil in Bewegung, scharf in jeder Zoomstufe und ohne
   Nahtfehler zwischen angrenzenden Flächen, weil die Vereinigung vor der Glättung passiert. Zu regeln bleiben Spitzen
   unter einem Bildpunkt und die Frage, ob in sRGB oder linear gemischt wird (sein Auge).
8. **Tempo:** Der Prototyp braucht am Mac 2 bis 3 ms je Bild (1000 × 1000 Bildpunkte). Auf dem iPhone 16 schätze ich das
   Zwei- bis Dreifache (rund 2,2 gegen 5 bis 6,4 TFLOPS, rund 60 gegen 150 GB/s). Das reicht für eine Figur bei 60 Bildern
   je Sekunde, aber nur, wenn nicht der ganze Bildschirm, sondern der Bereich der Figur gezeichnet wird. Erst messen.
9. **Effekte mit dem größten Nutzen für den Hund:** weiches Verschmelzen (da), Verjüngungen über Dickenregel und Linien
   mit Breitenprofil, Kontaktschatten auf der Scheibe, Squash and Stretch als Verformung, Schmierbild über Zeitversatz je
   Anker, Aufprallbild und Staubwölkchen. Danach Schein und Auflösen für Spielereignisse; Dithering, Halbton und Papierkorn
   als zuschaltbarer Stil; Wackeln (Line Boil) nur für Momente, weil es dem Grundsatz „glatt“ widerspricht.
10. **Eine Grammatik für alle Effekte:** Jeder Effekt ist ein Profil über dem Abstand (innen, Kante, außen), dazu höchstens
    Rauschen und Zeit, und jeder Wert kann von Schlüssel, Pose oder Spielgröße angetrieben werden (Tempo, Gleichgewicht).
    Damit bedient sich jeder Effekt gleich.

---

## 1 Ausgangslage

### 1.1 Was der Prototyp heute zeichnet

Der Renderer der Ozzy-Figur (WebGL2, eigene Zeichenfläche, läuft auch in der iOS-App) arbeitet in vier Durchgängen:

1. **Abstand.** Jede Fläche wird in Strecken abgeflacht. Jede Strecke wird als Rechteck mit der Reichweite R gezeichnet;
   der Fragment-Shader rechnet den Abstand zur Strecke, die Mischfunktion MIN behält den kleinsten. Bis zu 24 Flächen liegen
   in sechs Texturen mit je vier Kanälen (Halbgleitkomma; ohne Halbgleitkomma höchstens R = 24 Bildpunkte).
2. **Vorzeichen.** Je Fläche ein Fächer in die Schablone (Füllregel nonzero); innen wird der Kanal gekippt.
3. **Außenkante.** Dieselben Strecken noch einmal; Strecken, die in einem anderen schwarzen Teil liegen, fallen weg. Übrig
   bleibt der Abstand zum äußeren Umriss (für das Verdecken von Weiß).
4. **Bild.** Ein Vollbild-Shader liest alle Felder, vereinigt Schwarz je Gruppenpaar weich (polynomielles smin, dazu eine
   Fassung, die an tangentialen Übergängen keine Wulst aufträgt), legt Weiß in Malreihenfolge darüber, hält es mit einer
   weichen Klemme im Träger, verdeckt auf der abgewandten Seite, schneidet den Ohrspalt als verjüngten Keil und lässt dünnes
   Schwarz zwischen Bart und Umriss spitz auslaufen („Durchbruch“). Die Kantenglättung kommt aus dem Abstand.

Gemessen (Übergabe der Ozzy-Figur): am Mac bei 1000 × 1000 Bildpunkten 2,0 bis 3,6 ms je Bild (Safari 2,0 ms, Chrome
2,6 ms), unter fremder Last (Illustrator, Simulator) 5 bis 9 ms. Das iPhone ist nicht gemessen.

**Einordnung.** Der Prototyp verbindet zwei klassische Verfahren: Das Vorzeichen kommt aus der Schablone wie bei
Stencil-and-Cover (Abschnitt 2.2), der Abstand aus gespritzten Streckenrechtecken mit MIN-Mischung. Das ist ein solides
Fundament: exakte Abstände im Band, robustes Vorzeichen bei jeder Form, alles in WebGL2.

**Fünf Grenzen für ein Produkt** (aus dem Code gelesen, nicht gemessen):

- **Höchstens 24 Flächen je Bild** (sechs Texturen mal vier Kanäle). Ozzy kennt schon 25 Teilnamen (Bohne, vier Beine mit
  Fenstern, Keilen und Sohlen, Schwanz, zwei Kopfmasken, Ohren, Nase, Bart; nicht alle sind in jeder Ansicht zugleich da)
  und steht damit an der Grenze. Scheibe, Hindernisse, Requisiten oder eine zweite Figur passen nicht mehr in denselben Satz.
- **Alle Felder in voller Auflösung.** Je Bildpunkt werden rund 56 Byte geschrieben (sechs Feldtexturen und die Außenkante,
  je 8 Byte) und im Bilddurchgang wieder gelesen. Auf Apple-GPUs ist Speicherbandbreite der teure Posten, nicht das Rechnen
  (Abschnitt 4).
- **Die Reichweite R ist gedeckelt** (96 Bildpunkte, ohne Halbgleitkomma 24). R wächst mit dem Maßstab; bei starkem
  Hineinzoomen sättigen die Felder, und die weiche Vereinigung würde sich mit der Zoomstufe ändern (der Code warnt selbst
  davor, dass ein Feld, das innerhalb von k sättigt, die Kanten verschiebt). Nach dem Code liegt die Grenze bei k = 12 bei
  gut 6 Bildpunkten je Figur-Einheit, größere Werte (Verdecker, Durchbruch) senken sie; ob der Editor das beim Zoomen
  erreicht, ist zu prüfen. Für einen Editor, in dem er „mit dem Auge“ formt, darf sich der Look mit dem Zoom nicht ändern.
- **Regeln als Code.** Verschmelzgruppen, Paare und Sonderfälle sind für Ozzys Teile ausgeschrieben (Bohne, Bein, Kopf,
  Ohren, Nase, Bart, Fenster). Ein Editor braucht sie als Daten, die der Art Director einstellt.
- **Abflachung nach Länge.** Die Stückzahl je Kurvenstück folgt der Länge des Kontrollpolygons (Wurzel der Länge mal 1,5,
  höchstens 96). Ändert sich die Länge im Morph, springt die Zahl, und alle Strecken des Stücks rücken ein wenig: ein Risiko
  für leises Flimmern an langsam morphenden Kanten. Nebenbei: `preserveDrawingBuffer: true` kostet auf Mobilgeräten eine
  Kopie je Bild und gehört im Spiel abgeschaltet (*Fachwissen*).

### 1.2 Was der Look vom Renderer verlangt

| Anforderung (aus seinen Rückmeldungen) | Folge für den Renderer |
| --- | --- |
| Flächen verschmelzen weich („liquid drop“), Übergänge glatt | Abstand je Fläche, weiche Vereinigung mit einstellbarem Radius je Paar |
| Nie eine durchgängige dünne Outline; Verjüngungen wachsen weich ein und aus; Weiß läuft über die Outline | Die Dicke des Schwarz zwischen Weiß und Umriss muss messbar sein: Abstände zu zwei Kanten |
| Glatt vor Skizzentreue: keine Sprünge, kein Rutschen, keine Kerben | zeitlich stabile Abflachung und Glättung, kein Einrasten an Bildpunkten |
| Exakt wie das Logo; nur die Beinschattierung in Bewegung darf aus dem Shader kommen | Kanten exakt auf der Vektorform; Effekte zurückhaltend, einzeln abschaltbar |
| Er formt mit dem Auge, auch stark vergrößert | scharf in jeder Zoomstufe, kein Look-Wechsel mit dem Zoom |
| Mac (M3 Pro), iPad mit Stift, iPhone 16; Safari und App | sichere Basis WebGL2; freundlich zu Kachel-GPUs (wenig Bandbreite) |
| Editor und Spiel zeigen dasselbe („exakt wie erarbeitet“) | eine Laufzeit für beide, kein zweiter Renderer im Spiel |

---

## 2 Wie die Verfahren arbeiten

### 2.1 Triangulierung (earcut, libtess2) mit MSAA

**Mechanik.** Der Pfad wird auf dem Prozessor zu einem Polygon abgeflacht und in Dreiecke zerlegt; die Grafikkarte füllt
die Dreiecke. **earcut** (Mapbox) schneidet „Ohren“ ab und ist sehr schnell, garantiert bei verdrehten oder sich selbst
schneidenden Polygonen laut eigener Doku aber kein korrektes Ergebnis; es bietet eine Prüffunktion (Flächenabweichung).
**libtess2** (die Tessellierung aus GLU) arbeitet mit einer Kehrlinie, beherrscht Füllregeln und Selbstschnitte, ist aber
deutlich langsamer (ein alter Vergleich an einem Gebäudeumriss: rund 796 000 gegen 51 000 Durchläufe je Sekunde). Kanten
werden über Multisampling (MSAA) geglättet. **PixiJS v8** nutzt earcut und rät in der eigenen Anleitung ausdrücklich davon
ab, Grafiken in jedem Bild neu aufzubauen; für Wechsel soll man vorbereitete Grafik-Kontexte tauschen.

**Stärken.** Billig beim Zeichnen, überall verfügbar, gut für statische Formen, Oberflächen und Partikel.

**Schwächen für uns.** Ein Morph verlangt in jedem Bild eine neue Zerlegung auf dem Prozessor, und Zwischenformen können
sich selbst schneiden. Kanten sind nur so gut wie MSAA (bei vierfachem Multisampling fünf Stufen an der Kante; dünne
Spitzen zerfallen in Treppen). Es gibt keinen Abstand, also kein Verschmelzen und keine Verjüngung aus der Dicke. Striche
brauchen eine eigene Kontur-Erzeugung mit Ecken und Enden.

### 2.2 Schablone und Decken (Stencil-and-Cover)

**Mechanik.** Erster Durchgang: ein Fächer von einem beliebigen Punkt zu allen Kanten in die Schablone. Jedes Dreieck zählt
je nach Umlaufsinn +1 oder −1; so entsteht die Windungszahl je Bildpunkt, bei beliebigen Selbstschnitten, für nonzero und
even-odd. Kurvenstücke kommen als kleine Dreiecke mit implizitem Test dazu; Kokojima und Kollegen haben das 2006
ausdrücklich für verformbare Formen beschrieben. Zweiter Durchgang: ein Rechteck über die Form, gezeichnet nur dort, wo die
Schablone nicht null ist, und dabei zurückgesetzt. NVIDIA hat das 2011 als Treiber-Erweiterung NV_path_rendering gebaut
(Kilgard und Bolz 2012); später kam ein kombinierter Aufruf für Skia und Chromium dazu. Im Web gibt es die Erweiterung nicht.

**Stärken.** Keine Zerlegung, robust bei jeder Form, ideal für Formen, die sich in jedem Bild ändern.

**Schwächen.** Kantenglättung nur über MSAA oder Überabtastung; zwei Durchgänge je Pfad; kein Abstand.

**Für uns.** Der Prototyp nutzt genau diese Technik für das Vorzeichen. Ein guter Baustein, kein ganzer Renderer.

### 2.3 Loop-Blinn (2005)

**Mechanik.** Die Hülle jedes Kurvenstücks wird trianguliert; jede Ecke bekommt Koordinaten, aus denen der Pixel-Shader
eine implizite Gleichung auswertet (quadratisch u² − v, kubisch k³ − l·m). Das Vorzeichen sagt innen oder außen. Kubische
Kurven müssen vorher klassifiziert werden (Serpentine, Schleife, Spitze), Schleifen an ihrem Doppelpunkt geteilt und
überlappende Hüllen unterteilt. Geglättet wird über einen aus Bildschirm-Ableitungen angenäherten Abstand innerhalb der
Hülle; an den Dreieckskanten braucht es zusätzlich MSAA. Das Patent ist laut Google Patents am 25.03.2026 abgelaufen.

**Für uns nicht geeignet.** Die Vorarbeit auf dem Prozessor (Klassifikation, Unterteilung, Triangulierung) müsste bei jedem
Morph neu laufen; das Buchkapitel selbst verweist für dynamische Kurven auf das Schablonen-Verfahren. Auflösungsunabhängige
Kurven haben wir über Abstände ohnehin.

### 2.4 Abstandsfelder und analytische Abstände

**Mechanik.** Statt „wie viel der Fläche deckt diesen Bildpunkt“ wird gerechnet „wie weit ist der Bildpunkt von der Kante,
mit Vorzeichen“. Daraus folgt die Abdeckung (Rampe über etwa einen Bildpunkt), und aus demselben Wert alles Weitere: weiche
Kante, Kontur, Schein, Schlagschatten. Valve hat das 2007 für Schrift und Abzeichen mit Abstandstexturen niedriger Auflösung
gezeigt, samt dieser Effekte; Ecken runden sich dabei ab, was zwei Kanäle (oder mehrkanalige Felder, MSDF, *Fachwissen*)
auffangen.

Es gibt drei Wege zum Feld:

- **Vorgerechnete Texturen** (Valve, MSDF): billig, aber nur für starre oder mit einem Netz verbogene Formen. Unsere Formen
  ändern ihren Umriss im Morph. Für uns nur als Export („backen“) interessant.
- **Aus einem Rasterbild per Jump Flooding:** Zahl der Vollbilddurchgänge wächst mit dem Logarithmus der Auflösung, das
  Ergebnis ist leicht ungenau, jeder Durchgang kostet Bandbreite. Wir haben die Vektoren und brauchen das nicht.
- **Analytisch aus den Kurven:** Abstand zu Strecken (wenige Rechenschritte) oder zu quadratischen Stücken (eine kubische
  Gleichung je Stück), dazu die Windungszahl über Kreuzungen. Je Bildpunkt nur über die Kurven der Nähe, sonst wird es
  teuer. Unser Prototyp erreicht die Nähe über gespritzte Rechtecke; die Alternative sind Kurvenlisten je Band oder Kachel
  (Abschnitt 2.5 und 8).

**Weiche Vereinigung (smooth minimum).** Die bekannte Sammlung von Inigo Quilez ordnet die Varianten nach ihrem Kern:
polynomiell (schnell, wirkt nur im Bereich k, das heißt anderswo bleibt die Form exakt; bei mehr als zwei Flächen von der
Reihenfolge abhängig), exponentiell (reihenfolgeunabhängig für beliebig viele Flächen, verändert die Form aber überall ein
wenig und kostet mehr), Wurzel-, Potenz- und Kreisformen (die kreisförmige gibt eine echte Kreisverrundung). Normiert man k,
ist k direkt der Radius der Verrundung, ein guter Regler für den Art Director. Dieselbe Rechnung liefert einen Mischwert, mit
dem sich Farben oder Effekte über die Naht blenden lassen; das Gegenstück smax ergibt weiche Schnitte und Klemmen (so hält
der Prototyp Weiß im Träger). Bekannte Falle: Wo viele Teile sich stark überlappen, quillt die Vereinigung auf, weil
dieselbe Gegend mehrfach zählt; eine Korrektur mit negativen Gegengewichten ist veröffentlicht. Der Prototyp löst das
Wulst-Problem an tangentialen Übergängen schon heute mit einem richtungsabhängigen k.

**Stärken.** Verschmelzen und alle Randeffekte aus einem Wert; Kantenglättung stabil und in jeder Größe scharf; keine
Nahtfehler zwischen angrenzenden Flächen (die Vereinigung passiert vor der Glättung); keine Zerlegung, ein Morph kostet
nichts extra.

**Schwächen.** Die Kosten wachsen mit Bildpunkten mal Kurven in der Nähe, also braucht es Splatting oder Kurvenlisten je
Kachel. Exakte Abstände zu kubischen Kurven sind teuer (Quintik); man flacht ab oder zerlegt in quadratische Stücke. Nach
smin ist das Feld kein exakter Abstand mehr (Gefälle unter 1), die Glättung muss das Gefälle berücksichtigen (der Prototyp
tut das beim verschmelzenden Weiß). Das Vorzeichen braucht bei sich selbst schneidenden Zwischenformen eine robuste
Windungszahl.

### 2.5 Abdeckung je Bildpunkt aus Kurvenlisten: Slug und Verwandte

**Mechanik.** Slug (Lengyel, Paper 2017, Stand 2026 überarbeitet) rendert Schrift und Vektorgrafik direkt aus den
Bézier-Daten, ohne Texturen. Die Form ist in Bänder geteilt; jedes Band kennt die Kurven, die es schneiden. Der Pixel-Shader
bestimmt über Strahlen durch den Bildpunkt mit einer robusten Wurzel-Klassifikation die Windungszahl und daraus die
Abdeckung. Seit der Überarbeitung erweitert der Vertex-Shader das Umrisspolygon je Bild um genau einen halben Bildpunkt
(„dynamic dilation“), damit jeder angeschnittene Bildpunkt gezeichnet wird und keine Fläche verschwendet ist. Das Patent ist
seit 17.03.2026 gemeinfrei, die Referenz-Shader stehen unter MIT; HarfBuzz hat ein Modul für Schrift auf der Grafikkarte
nach diesem Verfahren. Ein Vorläufer derselben Idee ist das Verfahren von Nehab und Hoppe (2008): Jede Bildzelle trägt einen
Strom der Primitiven, die sie berühren, und der Pixel-Shader liest ihn.

**Für uns.** Vorbild für die Datenstruktur (Kurvenlisten je Band oder Kachel, ein Durchgang ohne Zwischentexturen) und für
robuste Windungszahlen. Selbst rechnet Slug Abdeckung, keinen Abstand: kein Verschmelzen.

### 2.6 Rechenshader-Rasterer: Vello und die „Sparse Strips“

**Mechanik.** Vello (Linebender, Rust und wgpu) ist eine Pipeline aus Rechenshadern: Pfade kodieren, abflachen (Striche über
Euler-Spiralen, ausgezeichnet auf der HPG 2024), in Kacheln von 16 × 16 Bildpunkten einsortieren, je Kachel eine
Befehlsliste, dann je Bildpunkt die exakte Flächenabdeckung; Präfixsummen machen die eigentlich serielle Arbeit parallel. Die
Entwickler nennen 177 Bilder je Sekunde für ihre Testszene „paris-30k“ (eine Stadtkarte) bei 1600 × 1600 Bildpunkten auf
einem M1 Max, ausdrücklich als günstigsten Fall. Ihre eigenen Folien (2025)
nennen die Grenzen: moderne GPU nötig, kein WebGL, schwer vorhersagbarer Speicherbedarf, komplexe Shaderlogik; das Web ist
laut README kein Hauptziel. Daraus entstanden die „Sparse Strips“: Streifen von wenigen Bildpunkten Höhe, innen nur
Vollflächen. **vello_cpu** rendert auf dem Prozessor (SIMD), **vello_gpu** (bis November 2026 „vello_hybrid“, Version 0.4.0
vom 11.11.2026) teilt die Arbeit: Der Prozessor bereitet Pfade und Streifen vor, die Grafikkarte malt und mischt. Es gibt ein
WebGL2-Backend; Masken, komplexe Filter und manche Mischmodi fehlen noch und brechen ab; bei dynamischen, vektorlastigen
Szenen liegt es hinter dem Rechenshader-Vello. Eine Neufassung ersetzte die grobe Rasterung, weil deren Aufwand auf dem
Prozessor den Vorteil der Grafikkarte auffraß.

**Für uns.** Technisch exzellent für allgemeine 2D-Grafik (Oberflächen, Karten, Schrift). Aber Abdeckung statt Abstand,
Einbindung über Rust und WASM, junge Web-Pfade. Nicht für die Figur.

### 2.7 Der Rive-Renderer

**Mechanik.** Rive hat einen eigenen Renderer gebaut und als Open Source veröffentlicht, weil Skia und Canvas 2D Funktionen
über alle Plattformen hinweg begrenzten. Pfade werden in Dreiecksflecken mit eingebauter Kantenglättung zerlegt; jedes Dreieck addiert
je nach Umlaufsinn positive oder negative Abdeckung. Aufgelöst wird je Bildpunkt über „Pixel Local Storage“ (bevorzugt, unter
anderem auf Apple-GPUs), sonst über Fragment Shader Interlock, Atomics oder als letzte Stufe MSAA. Im Web läuft das über
Emscripten auf WebGL2 mit einer WebGL-tauglichen Variante. Standardmäßig wird mit verschachteltem Gradientenrauschen
gedithert. **Vector Feathering** (2025): Die Abdeckungsrampe folgt dem Integral einer Glockenkurve statt einer Geraden, mit
einer 2D-Korrektur an Krümmungen und Ecken; so entstehen Schatten und Schein ohne Weichzeichner, die beim Zoomen Vektor
bleiben. Feathering braucht den Rive-Renderer und stellt die Füllregel auf „clockwise“ um. Verjüngte Striche waren zur Zeit
des Feathering-Artikels erst geplant.

**Für uns.** Bestätigt das Prinzip „Effekte analytisch aus der Geometrie statt als Nachbearbeitung“. Verschmilzt aber nicht.
Nur den Renderer (C++ als WASM, ohne Rive-Format) einzubinden, wäre aufwendig und brächte uns keinen der Kerneffekte.

### 2.8 Skia und CanvasKit

Skia ist die 2D-Bibliothek von Chrome und Android, CanvasKit ist Skia als WASM mit WebGL. Chrome nutzt seit Juli 2025 auf
Apple Silicon das neue Backend Graphite (über Dawn, die WebGPU-Umsetzung von Chrome); CanvasKit wurde darauf laut Skia-Team
(Juni 2025) nicht umgestellt, ein späterer Forumsbeitrag nennt den Web-Pfad von Graphite ruhend. Das WASM ist mehrere MB
groß; ein Vergleich von 2024 fand CanvasKit beim Bilderzeichnen langsamer als Canvas 2D, auch in Safari (Aufruf-Overhead).
Eigene Shader (SkSL) wirken auf Farben, nicht auf Pfadabstände. **Für uns:** schwer, kein Verschmelzen, nein.

### 2.9 PixiJS v8

Starker 2D-Renderer für Sprites, Partikel, Filter und Oberflächen, mit WebGL- und WebGPU-Backend. Vektorgrafik läuft über
earcut (Abschnitt 2.1); dynamische Formen sollen nicht in jedem Bild neu gebaut werden, für echte Verformung verweist die Doku
auf Netze mit automatischer Aktualisierung. Verschmelzen ginge nur als Filter (Weichzeichnen plus Schwelle, der bekannte
„Gooey“-Trick), was je Bild Weichzeichner-Durchgänge kostet und keine exakten Kanten liefert. **Für uns:** nicht für die
Figur; wir brauchen es auch nicht für Partikel (Staubwölkchen sind bei uns verschmelzende Kreise im selben Shader).

### 2.10 ThorVG und dotLottie

ThorVG ist der Renderer hinter dem dotLottie-Spieler. Seit Mai 2026 gibt es drei Backends: Software (Standard, breiteste
Unterstützung), WebGL2 (empfohlen für animationsreiche Oberflächen) und WebGPU (experimentell); die Herstellerzahlen zum
Tempo (über 150 Prozent gegenüber früher, an anderer Stelle bis 13 Prozent für WebGPU) sind nicht unabhängig belegt.
**Für uns:** möglicher Exportweg (eine Figur ohne Verschmelzen als Lottie), nicht Kern.

### 2.11 Canvas 2D, SVG und DOM

Für die Oberfläche des Editors (Panels, Zeitleiste, Listen) ist das DOM richtig: zugänglich, mit Stift und Maus gut
bedienbar, kostet die Grafikkarte nichts. Griffe, Knochen, Auswahlrahmen und Zwiebelhaut-Umrisse können als SVG oder
Canvas 2D über der Zeichenfläche liegen (scharf, leicht zu treffen) oder im eigenen Renderer als Linien aus dem Abstand
entstehen. Die Figur selbst gehört nicht in Canvas 2D (keine eigenen Shader).

### 2.12 Was die Animationsprogramme selbst tun

- **Spine** zeichnet Bilder auf verformbaren Netzen. Die Laufzeiten kennen nur wenige eingebaute Effekte: zweifarbiges
  Tönen („Tint Black“, braucht einen eigenen Shader und bricht teils das Bündeln von Zeichenaufrufen) und Vertex-Effekte
  wie Zittern („Jitter“) und Wirbel („Swirl“). Alles Weitere macht die Engine.
- **Rive:** eigener Vektor-Renderer mit Feathering, Dithering und Mischmodi; keine weiche Vereinigung.
- **After Effects und Lottie:** verjüngte Striche mit Breite je Stelle und weichem Ein- und Auslauf in After Effects; die
  Lottie-Spieler (ThorVG, Skia) zeichnen Pfade, Effekte gehen beim Export meist verloren.
- **Moho:** Linienbreite je Punkt; die Verjüngung folgt einer festen S-Kurve, Nutzer wünschen mehr Kontrolle.
- **Inkscape Power Stroke:** Breite als Liste von Paaren (Stelle, Breite) mit wählbarer Interpolation.

Niemand verbindet Vektorformen, weiches Verschmelzen und Effekte aus dem Abstand. Das ist die Lücke, in der unser Editor
steht.

### 2.13 Übersicht

| Verfahren | Kanten | Abstand / Verschmelzen | Form ändert sich jedes Bild | iPhone und Safari | Aufwand, Risiko | Urteil für die Figur |
| --- | --- | --- | --- | --- | --- | --- |
| Triangulierung + MSAA (earcut, PixiJS) | mittel (MSAA) | nein | Neu-Zerlegung je Bild | gut | gering | nein |
| Schablone und Decken | MSAA | nein (nur Vorzeichen) | sehr gut | gut | gering | als Baustein (Vorzeichen) |
| Loop-Blinn | gut innen, MSAA an Kanten | nein | Vorarbeit je Bild | gut | hoch | nein |
| Abstandsfeld, analytisch (unser Weg) | sehr gut, stabil | ja, voll | sehr gut | gut (WebGL2) | eigener Code | **ja** |
| Slug (Kurvenlisten) | exakt | nein (Abdeckung) | gut | gut | mittel | Vorbild für Kacheln |
| Vello / vello_gpu | exakt | nein | gut | WebGPU bzw. junges WebGL2 | hoch (Rust/WASM) | nein |
| Rive-Renderer | exakt, Feathering | nein | gut | gut (WebGL2/WASM) | hoch (C++/WASM) | nein |
| Skia / CanvasKit | gut | nein | gut | WebGL, mehrere MB | hoch | nein |
| ThorVG / dotLottie | gut | nein | gut | WebGL2, WebGPU exp. | mittel | nur Export |

---

## 3 Kantenglättung

**Drei Familien.**

- **Analytische Flächenabdeckung** (Vello, Rive, Slug): exakt je Pfad. Werden Pfade nacheinander gemischt, scheint an
  gemeinsamen Kanten der Hintergrund durch („conflation artifacts“, der Begriff stammt von Kilgard und Bolz): Zwei Flächen,
  die sich genau berühren, ergeben an der Naht keinen vollen Ton. Bei uns wäre das ein grauer Saum, wo Weiß an Schwarz
  grenzt. Der Prototyp kennt das Problem (halbes Schwarz unter halbem Weiß gab 75 Prozent Grau) und löst es im
  Abstandsraum.
- **MSAA:** keine Nahtfehler (die Proben gehören zur Geometrie), auf Kachel-GPUs billig, weil im Kachelspeicher aufgelöst
  wird. Aber wenige Stufen (vierfach: fünf), dünne Spitzen zerfallen, Bewegung zeigt Treppen.
- **Aus dem Abstand:** Abdeckung = Rampe über den Abstand, geteilt durch die Bildpunktbreite. Exakt, wo der Abstand exakt
  ist; die Vereinigung passiert vorher, also keine Nähte; unabhängig vom Maßstab; in Bewegung stabil.

**Was beim Abstand zu regeln ist.**

1. **Gefälle nach smin:** Im Bereich der Vereinigung ist das Gefälle kleiner als 1; die Rampe wird durch das gemessene
   Gefälle geteilt, sonst wird die Kante dort zu weich.
2. **Spitzen unter einem Bildpunkt:** Eine Verjüngung, die dünner als ein Bildpunkt wird, deckt nur noch anteilig; sie wirkt
   als lange blasse Linie. Der Prototyp nimmt einen Rest unter 0,75 Bildpunkten ganz weg. Das gehört als feste Regel in den
   Renderer.
3. **Stabile Abflachung:** Die Stückzahl je Kurvenstück darf sich im Morph nicht ändern. Vorschlag: Stückzahl je Stück aus
   dem größten Bedarf über alle Schlüssel der Animation und die höchste Zoomstufe, Fehler unter 0,1 Bildpunkt (die
   analytische Formel von Levien für quadratische Stücke gibt die nötige Zahl direkt an).
4. **Gamma:** Mischt man die Kantenrampe in sRGB statt linear, wirken schwarze Linien auf Weiß etwas kräftiger und weiße
   Spitzen auf Schwarz etwas dünner. Beides ist vertretbar; es soll einmal gewählt und von seinem Auge gegen das Logo
   geprüft werden.
5. **Breite der Rampe:** 1 Bildpunkt als Standard. Ein Regler von 0,8 bis 1,2 ist billig und hilft beim Abgleich mit dem
   Logo, wie es Illustrator zeigt.

**Urteil:** Kantenglättung aus dem Abstand, mit Gefälle-Korrektur, Spitzenregel und stabiler Abflachung. MSAA wird nicht
gebraucht.

---

## 4 Tempo auf iPhone, iPad und Mac

### 4.1 Wie Apple-GPUs arbeiten

Apple-GPUs rendern in Kacheln: Sie sortieren zuerst die Geometrie, dann rechnen sie Kachel für Kachel im schnellen
Kachelspeicher und schreiben am Ende jeder Kachel das Ergebnis in den Hauptspeicher. Apple empfiehlt, nur zu laden und zu
speichern, was gebraucht wird, und Durchgänge so zu legen, dass wenig Lade- und Speicherverkehr entsteht; MSAA-Proben können
ganz im Kachelspeicher bleiben. **Folge für uns:** Die teuren Posten sind die Zahl der Durchgänge und die Bytes je Bildpunkt,
die in den Hauptspeicher gehen. Rechnen im Shader ist vergleichsweise billig. Jede Nachbearbeitung mit eigenem Durchgang
(Bloom, Weichzeichner) kostet Bandbreite und Strom.

### 4.2 Was der heutige Weg kostet (Rechnung mit Annahmen)

- **Speicher:** rund 56 Byte je Bildpunkt geschrieben und 56 gelesen, also gut 110 Byte je Bildpunkt und Bild. Für den
  Bereich einer Figur von angenommen 700 × 700 Bildpunkten (Ozzy auf dem iPhone in Spielgröße) sind das etwa 55 MB je Bild
  oder 3,3 GB/s bei 60 Bildern je Sekunde, rund 5 Prozent der Bandbreite des iPhone 16 (etwa 60 GB/s, *Fachwissen*:
  LPDDR5X an 64 Bit). Für den ganzen Bildschirm (2556 × 1179) wären es rund 20 GB/s, ein Drittel der Bandbreite: zu viel
  für Dauerbetrieb.
- **Rechnen:** Die Rechtecke um die Strecken decken etwa Umfang mal 2R; dazu der Bilddurchgang mit einer Schleife über alle
  Flächen. Beides ist für eine Figur klein.
- **Schätzung iPhone 16:** Die GPU des A18 liegt nach Fremdangaben bei rund 2,2 TFLOPS, ein M3 Pro nach eigener Rechnung
  bei 5 bis 6,4 (14 oder 18 Kerne, *Fachwissen*); die Bandbreite bei rund 60 gegen 150 GB/s. Aus 2 bis 3 ms am Mac werden auf dem iPhone grob 5 bis 9 ms für dieselbe Fläche von
  1000 × 1000 Bildpunkten. Für eine Figur in Spielgröße reicht das bei 60 Bildern je Sekunde; für den ganzen Bildschirm nicht.
  **Nicht gemessen.**

### 4.3 Was ein Kachel-Durchgang kosten würde (Stufe 2, Rechnung mit Annahmen)

Je Bildpunkt werden die Strecken der eigenen Kachel geprüft (Abstand und Kreuzung, rund 20 Rechenschritte je Strecke). Bei
50 bis 150 Strecken in Reichweite sind das 1 000 bis 3 000 Schritte je Bildpunkt, für 0,5 Millionen Bildpunkte bei 60 Bildern
je Sekunde 30 bis 90 GFLOP/s, also wenige Prozent des A18. Geschrieben wird nur die Farbe (4 Byte je Bildpunkt); die
Streckendaten liegen im Textur-Zwischenspeicher, weil alle Bildpunkte einer Kachel dieselbe Liste lesen. Der Kachel-Durchgang
tauscht Speicherverkehr gegen Rechnen, genau das, was Apple-GPUs gut können. **Der Haken:** Große Verschmelzradien (k bis
etwa 100 Bildpunkte) machen die Listen lang, weil jede Strecke in allen Kacheln ihrer Reichweite stehen muss. Abhilfe: die
Reichweite je Flächenpaar statt global, längere Stücke (quadratisch statt gerade) und später das Einsortieren auf der
Grafikkarte (WebGPU).

### 4.4 Vorschlag für ein Budget

| Posten | iPhone 16, 60 Hz (16,7 ms) | Mac 120 Hz (8,3 ms) |
| --- | --- | --- |
| Spiellogik und Physik | ≤ 4 ms | ≤ 2 ms |
| Auswerten der Figur (Knochen, Schlüssel), Abflachen, Einsortieren | ≤ 2 ms | ≤ 1 ms |
| Grafikkarte, ganze Szene | ≤ 8 ms (Reserve für Wärme) | ≤ 4 ms |

### 4.5 Wie gemessen wird

Die Zeitabfrage der Grafikkarte, die der Prototyp nutzt, steht nicht in jedem Browser zur Verfügung; ob Safari auf dem iPhone
sie anbietet, ist zu prüfen. Verlässlich ist die Bildzeit: Abstand der Bildaufrufe über 10 Sekunden (Median und 95 Prozent)
und ein Dauerlauf von 5 Minuten (Wärme drosselt das iPhone). Kriterium für Stufe 1: Ozzy in Spielgröße auf dem iPhone 16, in
Safari und in der App, hält 60 Bilder je Sekunde über 5 Minuten, ohne dass die Bildzeit im Mittel über 12 ms steigt.

---

## 5 WebGL2 oder WebGPU (Stand November 2026)

**Fakten.**

- **WebGPU** ist seit Safari 26.0 (September 2025) auf macOS Tahoe, iOS 26, iPadOS 26 und visionOS 26 standardmäßig an;
  ältere Systeme haben es nicht. Laut WebKit bildet WebGPU Metal besser ab als WebGL, das viel Übersetzungsarbeit braucht.
- **In der App (WKWebView):** Ein Apple-Mitarbeiter schrieb, die Funktion wirke in WKWebView, sobald sie standardmäßig an
  sei, also ab iOS 26. Eine ausdrückliche Bestätigung für Capacitor habe ich nicht gefunden: auf dem Gerät prüfen.
- **Reife:** Ein Spiele-Baukasten meldete WebGPU auf iOS ab Safari 26.0.1 als unbrauchbar (verschwindende Zeichenfläche);
  behoben in Safari 26.4 (März 2026). Im Apple-Forum gibt es Berichte über Abstürze des Grafikprozesses auf einem iPhone 15
  unter iOS 26.4. Für Safari 27 (Herbst 2026) habe ich keine Angaben geprüft.
- **WebGL2** läuft in Safari seit Jahren über ANGLE auf Metal, auch in WKWebView. Nach dem Umstieg auf Metal gab es
  2021 bis 2023 Berichte über Leistungseinbrüche; die betrafen vor allem viele Zeichenaufrufe.
- **three.js:** Der WebGPURenderer fällt auf WebGL2 zurück, TSL übersetzt in WGSL und GLSL; im Forum gibt es Berichte über
  langsamere Bilder als mit dem alten WebGL-Renderer bei vielen Objekten.

**Bewertung für unseren Fall.** Unsere Last sind wenige Zeichenaufrufe mit viel Rechnen je Bildpunkt. Dafür ist der Vorteil
von WebGPU klein: Der Shader wird ohnehin in Metal übersetzt, und der Übersetzungsaufwand von WebGL fällt nur je Aufruf an.
WebGPU lohnt erst, wenn wir Rechenshader brauchen: Einsortieren in Kacheln auf der Grafikkarte, viele Figuren, Partikel oder
Physik auf der Grafikkarte. Dafür nehmen wir iOS 26 als Mindestversion und frische Fehler in Kauf.

**Urteil.** WebGL2 als Basis jetzt. Der Renderer bekommt eine schmale Schnittstelle (Felder bauen, Bild rechnen), hinter
der später ein WebGPU-Backend stehen kann; die Daten liegen schon heute in Texturen, die sich eins zu eins in Speicherpuffer
übersetzen lassen. Eine kleine Probeseite prüft auf seinen Geräten in Safari und in der App, ob WebGPU da ist.

---

## 6 Effekte für einen schwarz-weißen Cartoonhund

Kostenstufen in diesem Abschnitt: **frei** = wenige Rechenschritte im ohnehin laufenden Bilddurchgang; **gering** = einige
Dutzend Schritte je Bildpunkt oder Rechnen auf dem Prozessor je Anker; **mittel** = zusätzliche Geometrie oder mehrfache
Auswertung; **hoch** = zusätzliche Vollbilddurchgänge.

### 6.1 Weiches Verschmelzen (Metaballs, Smooth Union)

**Mechanik:** smin je Flächenpaar mit Radius k, im Prototyp mit richtungsabhängigem k gegen Wülste an tangentialen
Übergängen; smax für Klemmen; Mischwert für Farben über die Naht (Weiß mit Weiß, Bart mit Fenster). **Kosten:** frei, sobald
die Felder da sind. **Nutzen:** der Kern des Looks und der Grund, warum Morphs weich wirken: Teile, die sich nähern,
fließen ineinander statt sich zu überschneiden. **Empfehlung:** bleibt Kern. Im Editor als „Verbindung“ zwischen zwei
Flächen mit einem Radius in Figur-Einheiten (sichtbar als Kreis an der Naht), Schalter „ohne Wulst“, animierbar in Posen. Der
Gooey-Trick (Weichzeichnen plus Schwelle) ist keine Alternative: teurer und ungenau.

### 6.2 Verjüngungen und variable Kanten statt dünner Outlines

**Zwei Mechanismen, beide aus dem Abstand:**

- **Dickenregel (aus der Form):** Die Dicke des Schwarz zwischen Weiß und Umriss ist die Summe zweier Abstände. Unter einer
  Mindestdicke nimmt das Weiß das Schwarz ganz, bis zu einer Auslaufdicke läuft es spitz aus, darüber bleibt es. So entsteht
  nie eine durchgängige dünne Linie; Verjüngungen wachsen weich ein und aus, wenn sich die Formen bewegen. Der Prototyp tut
  das als „Durchbruch“ am Bart. Im Editor wird daraus eine allgemeine Kantenregel je weißer Fläche mit zwei Reglern
  (Mindestdicke, Auslauf).
- **Linie mit Breitenprofil (gezeichnet):** für Maul, Lider, Brauen, Bewegungslinien. Abstand zur Mittellinie minus halbe
  Breite an der Stelle s; s ist die Bogenlänge des nächsten Punkts, die je Strecke mitgeführt wird. Die Breite hängt an den
  Ankern und dazwischen (wie Illustrators Breitenwerkzeug, Inkscapes Power Stroke als Paare von Stelle und Breite, After
  Effects mit weichem Ein- und Auslauf an den Enden). Breiten sind normale Attribute: Sie morphen mit den Schlüsseln und
  können von Physik getrieben werden (gedehnte Linie wird dünner).

**Kosten:** gering. **Nutzen:** sehr hoch, direkt aus seinen Vorgaben. **Empfehlung:** beide gleich einbauen. Wo sich die
Breite schnell ändert, ist der Wert kein exakter Abstand; die Gefälle-Korrektur der Kantenglättung fängt das auf.

### 6.3 Schattierung innerhalb harter Stufen (Cel, Rand, Verlauf)

**Mechanik:** Aus dem Abstand nach innen wird eine Wölbung (zum Beispiel ein Kreisprofil bis zur Tiefe r), aus deren
Gefälle eine Normale, aus Normale und Lichtrichtung ein Helligkeitswert. Dieser wird in zwei oder drei harte Stufen geteilt,
innerhalb jeder Stufe darf ein sanfter Verlauf laufen (sein Grundsatz „Verläufe nur innerhalb harter Stufen“). Randlicht ist
ein schmales Band innen an der Kante, das nur auf der Lichtseite erscheint. Werkzeuge für 2D-Sprites erzeugen Normalen genauso
aus einer Abstandstransformation der Silhouette (Laigter, ein Paper zu Pixel-Art). **Kosten:** gering. Das Gefälle sollte aus
der nächsten Strecke kommen (exakt und glatt), nicht aus Bildschirm-Ableitungen, die an Knicken rauschen (der Prototyp hat das
erlebt). Im heutigen Weg speichern die Felder nur den Abstand, im Kachel-Durchgang fällt das Gefälle mit ab: ein Grund für
Stufe 2, wenn Schattierung wichtig wird. **Nutzen für Ozzy:** Er soll exakt wie das Logo aussehen; erlaubt ist ausdrücklich
die Beinschattierung in Bewegung. Damit beginnen: ferne Beine bekommen eine Stufe (Grau, Raster oder Dither), sobald sie
hinter den Körper treten, angetrieben von der Pose. **Empfehlung:** als Baustein bauen, für Ozzy zuerst nur an den Beinen.

### 6.4 Kontaktschatten

**Mechanik:** Die Scheibe ist ein Kreis mit exaktem Abstand. Der Kontaktschatten ist ein weicher Fleck auf dem Band der
Scheibenkante, dort wo der Abstand zu den Pfoten klein ist; dazu ein Bodenschatten unter dem Körper, dessen Breite und
Deckkraft von der Höhe über dem Boden abhängt (beim Sprung schrumpft er, beim Aufprall wird er satt). Für weichere Schatten
in einer Lichtrichtung gibt es die bekannte Abstandsrechnung mit wenigen Schritten (Verhältnis von Abstand zu Weglänge, ein
Regler für die Härte). **Kosten:** gering. **Nutzen:** hoch, denn das Spiel handelt vom Stehen auf einer Krümmung: Der
Schatten zeigt, wo die Pfoten Halt haben und wann er abhebt. **Empfehlung:** gleich einbauen. In Schwarz-Weiß als helles Grau
oder als Raster (6.8, 6.9).

### 6.5 Squash and Stretch

**Mechanik:** gehört zur Verformung, nicht zum Shader: Die Anker werden entlang der Geschwindigkeit gestreckt und quer dazu
gestaucht (Fläche bleibt erhalten), beim Aufprall umgekehrt. Velocity Skinning (Eurographics 2021) macht das je Punkt aus der
Geschwindigkeit der Knochen, in einem Durchgang, und liefert dabei auch das Nachziehen weicher Teile. **Kosten:** gering
(Prozessor, einige Hundert Anker). **Nutzen:** sehr hoch für Sprünge, Stolpern, Hinfallen. **Empfehlung:** als
Verformungsbaustein der Laufzeit, mit Stärke als Regler und von Physik angetrieben. Der Renderer muss dafür nichts können.

### 6.6 Schmierbilder und Bewegungsunschärfe

**Mechanik:** Das Verfahren SMEAR (SIGGRAPH 2024, als Blender-Erweiterung verfügbar) erzeugt gestreckte Zwischenbilder
entlang der Bahn, dazu Mehrfachbilder und Bewegungslinien, alles über Regelfunktionen künstlerisch steuerbar und in
interaktivem Tempo. Der Kern (*Fachwissen*, die Projektseite war beim Abruf gesperrt): Jeder Punkt liest seine Bahn zu einer
leicht verschobenen Zeit ab; Punkte hinten in Bewegungsrichtung hängen zurück, Punkte vorn eilen voraus. Für
unsere Vektorfiguren passt das ideal, denn jede Ankerbahn ist bekannt (Schlüssel, Posen, Physik-Verlauf). **Varianten:**
Zeitversatz je Anker (keine zusätzliche Geometrie), Mehrfachbilder (Kopien zu früheren Zeiten, blasser oder weich mit der
Figur verschmolzen), Bewegungslinien (Linien mit Breitenprofil aus den Bahnen von Nase, Pfoten, Schwanzspitze). Echte
Bewegungsunschärfe über mehrere Teilbilder kostet ein Vielfaches und passt nicht zum harten Schwarz-Weiß. **Kosten:**
Zeitversatz gering, Mehrfachbilder mittel (mehr Flächen), echte Unschärfe hoch. **Nutzen:** hoch für die komischen Stürze und
schnellen Wendungen. **Empfehlung:** Zeitversatz und Bewegungslinien gleich, Mehrfachbilder sparsam, keine echte Unschärfe.
Auslösen über Tempo-Schwellen, mit Reglern für Stärke und Richtung.

### 6.7 Line Boil und Wackeln

**Mechanik:** Rauschen verschiebt die Kanten (im Shader die Abtaststelle, oder auf dem Prozessor die Anker), und die Zeit
des Rauschens wird gestuft: Neues Muster nur alle zwei Bilder („on twos“) oder 8 bis 12 Mal je Sekunde. So machen es After
Effects (Turbulent Displace mit gestufter Zeit), SVG-Filter und Spiel-Shader. Spine kennt Zittern als Vertex-Effekt.
**Kosten:** frei bis gering. **Nutzen:** zwiespältig. Sein Grundsatz ist „glatt“, ohne Rutschen und Kerben; dauerhaftes
Wackeln widerspricht dem. Als Moment ist es stark: Zittern, wenn er am Abgrund balanciert (die Stärke folgt der
Absturzgefahr), Schwindel nach dem Sturz. **Empfehlung:** als Effekt für Momente, angetrieben von einer Spielgröße; nie als
Standard.

### 6.8 Dithering

**Mechanik:** Graustufen werden zu Mustern aus reinem Schwarz und Weiß, geordnet (Bayer) oder mit blauem Rauschen. Zwei
Zwecke: technisch gegen Stufen in weichen Verläufen (Rive dithert standardmäßig), stilistisch als 1-Bit-Look für die wenigen
Grautöne (Kontaktschatten, ferne Beine, Schein). Falle: Ein am Bildschirm festes Muster „schwimmt“, wenn sich die Figur
bewegt. Return of the Obra Dinn hängt das Muster an eine Kugel um die Kamera und wechselte von Bayer zu blauem Rauschen;
neuere Arbeiten halten Punkte auf der Fläche fest und ihre Größe am Bildschirm gleich. Für uns: Muster an der Figur oder an der
Scheibe verankern, die Größe in Zweierpotenzen mit dem Zoom mitführen. **Kosten:** frei. **Nutzen:** mittel bis hoch, wenn
er Grau zulässt, nur als Raster. **Empfehlung:** technisch gleich (gegen Stufen), als Stil zuschaltbar.

### 6.9 Halbton

**Mechanik:** ein gedrehtes Punktraster, Radius der Punkte aus dem Grauwert, Punkte als Kreise mit Abstand und damit scharf
in jeder Zoomstufe; verankert wie beim Dithering. **Kosten:** frei. **Nutzen:** mittel; Comic-Druck-Look für Schatten, passt
zu Schwarz-Weiß. **Empfehlung:** Stiloption neben Dithering, für Schatten und ferne Beine.

### 6.10 Papierkorn

**Mechanik:** eine kachelbare Korntextur, multipliziert auf Hintergrund und optional auf Weiß. Am Bildschirm verankert wirkt
sie wie eine Scheibe vor der Szene (der Effekt der „Duschtür“); in der Welt verankert (an der Scheibe, am Hintergrund) bleibt
sie ruhig. **Kosten:** frei (ein Texturzugriff). **Nutzen:** gering bis mittel, Wärme für Hintergrund und Scheibe.
**Empfehlung:** später, als Stiloption.

### 6.11 Glühen

**Mechanik:** Schein aus dem Abstand außen (exponentieller Abfall, Radius und Stärke als Regler); Rives Feathering zeigt, wie
gut das analytisch aussieht. Ein Bloom mit Herunterrechnen und Weichzeichnen braucht mehrere Durchgänge und ist auf Kachel-GPUs
teuer; wir brauchen ihn nicht. **Kosten:** frei. **Nutzen:** mittel, für Spielereignisse (Gegenstände, ein Hinweis auf den
„süßen Punkt“ der Balance, ein Moment höchster Konzentration). **Empfehlung:** bald, nur aus dem Abstand.

### 6.12 Auflösen

**Mechanik:** Abdeckung mal Schwelle gegen eine Rauschtextur, an der Schwellkante ein schmales Band in Effektfarbe. Mit
Abstand lässt sich steuern, ob es vom Rand nach innen frisst oder entlang einer Richtung läuft. Ein Texturzugriff,
prozedurales Rauschen ist teurer. **Kosten:** frei bis gering. **Nutzen:** mittel, für Ein- und Ausblenden von Levels, „Puff“
beim Herausfallen, Gegenstände. In Schwarz-Weiß am schönsten als Auflösen in Ditherpunkte oder Staub. **Empfehlung:** bald.

### 6.13 Weitere Effekte mit großem Nutzen

- **Aufprallbild:** ein bis zwei Bilder mit vertauschtem Schwarz und Weiß beim Aufschlagen. Frei, sehr komisch, ein
  klassisches Mittel.
- **Staubwölkchen und Tropfen:** wenige Kreise (oder kleine Formen) mit Physik, die untereinander und mit dem Boden weich
  verschmelzen und schrumpfen. Gering, passt perfekt zum Look („liquid drop“).
- **Weiche Kante (Feather):** Abdeckungsrampe nach einer Glockenkurve statt einer Geraden (wie Rive), etwa für Schatten.
  Frei.
- **Bewegung der Scheibe:** Muster auf der drehenden Scheibe (Kerben, Punkte) lassen sich bei hohem Tempo analytisch über den
  Drehwinkel mitteln, statt Teilbilder zu rendern. Gering.

---

## 7 Ehrliche Gegenüberstellungen für unseren Fall

Unser Fall: ein Charakter- und Physik-Spieleditor, ein Art Director ohne Programmierkenntnisse, Mac sowie iPad und iPhone,
schwarz-weiße Figuren mit weichem Verschmelzen und Verjüngungen.

### 7.1 Kern-Renderer

| Möglichkeit | Für | Gegen | Urteil |
| --- | --- | --- | --- |
| Eigener Abstandsfeld-Renderer (Linie des Prototyps) | einzige Möglichkeit mit Verschmelzen und Dickenregel; Effekte aus einem Wert; klein; läuft; volle Kontrolle | eigener Code, eigene Pflege; Kosten je Bildpunkt müssen im Griff bleiben | **wählen** |
| Rive-Renderer | ausgereift, schnell, Feathering, Dithering | kein Verschmelzen; C++/WASM ohne Rive-Format aufwendig | nein |
| Vello / vello_gpu | exakte Abdeckung, viele Pfade | kein Abstand; Rust/WASM; Web nicht Hauptziel, WebGL2-Pfad jung | nein |
| Skia / CanvasKit | bewährt, viele Funktionen | mehrere MB, kein Verschmelzen, kein Graphite im Web | nein |
| PixiJS v8 | Sprites, Partikel, Filter, WebGPU | Vektorformen über Triangulierung, kein Abstand | nein |
| ThorVG / Lottie | Exportformat, breite Spieler | kein Verschmelzen | nur Export |

### 7.2 Wie die Felder entstehen

| Möglichkeit | Für | Gegen | Urteil |
| --- | --- | --- | --- |
| Splatting in Texturen (heute) | läuft, einfach, große Radien kosten nur Füllfläche, alles auf der Grafikkarte | 24 Flächen; Bandbreite; R gedeckelt (Zoom); kein Gefälle | **Stufe 1: verallgemeinern und messen** |
| Kachel-Durchgang (Kurvenlisten wie Slug, Nehab/Hoppe, Vello) | ein Durchgang, kaum Bandbreite, keine Flächengrenze, exaktes Gefälle, kein Deckel | Einsortieren auf dem Prozessor; große k machen Listen lang; Vorzeichen braucht Kachelmarken | **Stufe 2, wenn Messung oder Szene es verlangen** |
| Jump Flooding aus Rasterbild | allgemein | viele Vollbilddurchgänge, ungenau | nein |
| Vorgerechnete Abstandstexturen auf Netzen | sehr billig | Formen ändern sich im Morph; Vereinigung verzerrter Felder ungenau | nur zum Backen für fremde Engines |

### 7.3 Kurven im Feld

| Möglichkeit | Für | Gegen | Urteil |
| --- | --- | --- | --- |
| Abflachen in Strecken mit fester Stückzahl | billigste Abstände, einfaches Vorzeichen, Bogenlänge für Breiten | viele Strecken bei hoher Genauigkeit | **wählen** (Fehler unter 0,1 Bildpunkt, Zahl aus größtem Bedarf) |
| Exakter Abstand zu quadratischen Stücken | wenige Stücke, exakte Kurve bei jedem Zoom | kubische Gleichung je Stück und Bildpunkt; kubische Kurven vorher teilen | später, falls Zoom oder Kachellisten es verlangen |
| Abdeckung wie Slug | exakt, gemeinfrei | kein Abstand | nein |

### 7.4 Effekte: im Bilddurchgang oder als Nachbearbeitung

| Möglichkeit | Für | Gegen | Urteil |
| --- | --- | --- | --- |
| Im Bilddurchgang aus Abstand, Rauschen, Zeit | fast frei, scharf, eine Grammatik | Shader wächst (Übersetzung aus dem Modell hält ihn schlank) | **wählen** |
| Nachbearbeitung (Bloom, Weichzeichner, Teilbild-Unschärfe) | vertraute Bausteine | je Durchgang Bandbreite und Strom auf Kachel-GPUs; weich statt scharf | nur, wenn ein Effekt anders nicht geht |

### 7.5 Grafikschnittstelle

| Möglichkeit | Für | Gegen | Urteil |
| --- | --- | --- | --- |
| WebGL2 | überall, auch WKWebView und ältere iOS; der Prototyp läuft | keine Rechenshader, keine Speicherpuffer | **jetzt** |
| WebGPU | Rechenshader, bessere Abbildung auf Metal | iOS 26 nötig; frühe Fehler (bis 26.4); in der App zu prüfen | später, als zweites Backend |
| three.js mit TSL (wie das alte Spiel) | ein Shadertext für beide Schnittstellen | Gewicht, Berichte über Leistungsverluste, die Figur braucht keine 3D-Szene | nicht für die Figur; offen für Einbettung ins alte Spiel |

### 7.6 Eine Laufzeit oder Export

| Möglichkeit | Für | Gegen | Urteil |
| --- | --- | --- | --- |
| Das Spiel nutzt die Laufzeit des Editors | exakt wie erarbeitet; ein Renderer | eigene Laufzeit für jede Plattform nötig | **wählen** für das Ozzy-Spiel |
| Export in fremde Formate (Lottie, Rive, Spine) | andere Engines | Verschmelzen und Dickenregel gehen verloren oder müssen gebacken werden | später, als Notausgang |

---

## 8 Empfohlene Renderer-Architektur

### 8.1 Grundsatz: Abstand ist die Sprache

Jede Fläche, jede Linie, die Scheibe, Hindernisse und Partikel liefern dem Renderer einen Abstand mit Vorzeichen. Alles,
was man sieht, ist eine Funktion dieser Abstände: Abdeckung, Verschmelzen, Dickenregel, Schatten, Schein, Auflösen. Die
gleichen Abstandsfunktionen für Scheibe und Hindernisse lassen sich auf dem Prozessor für die Physik auswerten
(Bodenkontakt, Normale am Fuß): Was man sieht, ist, woran er stößt.

### 8.2 Datenfluss

```
Zustand von Editor oder Spiel (Knochen, Formschlüssel, Posen, Physik)
   │  Auswerten je Bild (Prozessor)
   ▼
Anker und Griffe je Fläche, Breiten je Linie, Effektwerte
   │  Squash and Stretch, Zeitversatz fürs Schmierbild (Prozessor, je Anker)
   │  Abflachen mit fester Stückzahl, Bogenlänge je Strecke (Prozessor)
   ▼
Strecken je Fläche und Linie
   │  Felder bauen (Grafikkarte)
   │    Stufe 1: Streckenrechtecke, MIN-Mischen, Vorzeichen aus der Schablone (wie heute)
   │    Stufe 2: Kurvenlisten je Kachel, Abstand und Gefälle direkt im Bilddurchgang
   ▼
Bilddurchgang: ein Fragment-Shader, aus dem Modell des Editors übersetzt
   Verschmelzgraph (smin je Verbindung) → Ebenen und Malreihenfolge → Träger, Klemme, Dickenregel
   → Kantenglättung aus dem Abstand → Effekte aus Abstand, Rauschen, Zeit
   ▼
Farbe (nur sie wird in den Speicher geschrieben)
```

Bedienelemente (Griffe, Knochen, Auswahl, Zwiebelhaut-Umrisse) liegen als SVG oder Canvas 2D darüber; Panels und
Zeitleiste sind DOM.

### 8.3 Bausteine des Zeichenmodells

| Baustein | Was der Art Director einstellt | Was der Renderer daraus macht |
| --- | --- | --- |
| Fläche | Form, Farbe, Ebene | Abstand mit Vorzeichen |
| Linie mit Breitenprofil | Mittellinie, Breite je Anker, Enden | Abstand zur Mittellinie minus halbe Breite an der Stelle |
| Verbindung | zwei Flächen, Radius, „ohne Wulst“ | smin mit diesem Radius |
| Träger | weiße Fläche bleibt in schwarzer, Mindestrand | smax-Klemme |
| Kantenregel | Mindestdicke, Auslauf | Dickenregel (Durchbruch) |
| Ebene und Malreihenfolge | Reihenfolge, weicher Wechsel zwischen Posen | Deckung mit Anteil (wie heute im Prototyp) |
| Effekt | Wo, Profil, Antrieb (siehe 8.4) | Funktion im Bilddurchgang |

Aus diesen Daten erzeugt der Editor den Bildshader. Er wird nur neu übersetzt, wenn sich die Struktur ändert (eine
Verbindung kommt dazu, eine Fläche wechselt die Gruppe), nicht bei jedem Regler; Regler sind Uniforms.

### 8.4 Eine Bediengrammatik für alle Effekte

Jeder Effekt hat dieselben drei Teile, und jeder bedient sich gleich:

1. **Wo:** eine Auswahl von Flächen oder Linien (wie jede andere Auswahl im Editor).
2. **Profil:** eine kleine Kurve über dem Abstand (innen, Kante, außen) für Stärke oder Farbe, dazu höchstens Rauschen
   (Körnung, Tempo) und Zeit (gestuft oder fließend). Schein, weiche Kante, Kontaktschatten, Auflösen, Randlicht sind alle
   solche Profile.
3. **Antrieb:** fest, über Schlüssel und Posen, oder über eine Spielgröße (Tempo, Gleichgewicht, Absturzgefahr, Aufprall).
   Derselbe Mechanismus, der im Editor alles andere antreibt.

Eine Feldansicht (Linien gleichen Abstands, Zonen der Verschmelzung) hilft, Radien und Profile mit dem Auge zu verstehen; der
Prototyp hat schon Diagnoseansichten.

### 8.5 Stufenplan

- **Stufe 0, Messprobe (vor jedem Umbau):** Der heutige Prototyp auf dem iPhone 16 und dem iPad, in Safari und in der App,
  Ozzy in Spielgröße. Kriterium wie in 4.5. Dazu eine Probeseite für WebGPU.
- **Stufe 1, Verallgemeinern:** Renderer als Modul mit schmaler Schnittstelle; Verschmelz- und Ebenenmodell als Daten, Shader
  daraus übersetzt; nur der Bereich jeder Figur wird gezeichnet; feste Stückzahl beim Abflachen; Reichweite je Flächenpaar
  statt global; mehrere Feldsätze, wenn eine Szene mehr als 24 Flächen braucht (je Figur ein Satz); `preserveDrawingBuffer`
  im Spiel aus; Spitzenregel und Gefälle-Korrektur überall.
- **Stufe 2, Kachel-Durchgang (nur bei Bedarf):** Kurvenlisten je Kachel, Abstand, Vorzeichen und Gefälle im Bildshader; kein
  Deckel für R, keine Grenze der Flächenzahl, wenig Bandbreite. Auslöser: Messung verfehlt das Kriterium, mehrere Figuren,
  sichtbare Sättigung beim Zoomen oder Schattierung, die glatte Normalen braucht.
- **Stufe 3, Effekte A** (Abschnitt 9) im Bilddurchgang, mit der Grammatik aus 8.4.
- **Stufe 4, WebGPU-Backend (optional):** Einsortieren auf der Grafikkarte, viele Partikel; erst wenn iOS 26 auf seinen
  Geräten stabil ist.
- **Stufe 5, Export:** Bildfolgen und Sprite-Sheets aus derselben Laufzeit; Vektor-Export ohne Verschmelzen (SVG, Lottie) als
  Notausgang, oder mit gebackener Kontur (Umriss aus dem Feld, Bézier-Anpassung).

### 8.6 Risiken

- **Eigener Code:** Kein fremdes Team pflegt ihn. Gegenmittel: kleine Schnittstelle, Bildvergleiche als Proben (fester Stand
  gegen gespeichertes Bild).
- **Vorzeichen in Zwischenformen:** Schneidet sich eine Form im Morph selbst, kann das Vorzeichen kippen. Die Schablone
  (nonzero) ist robust; im Kachel-Durchgang braucht es Kachelmarken vom Prozessor oder eine echte Windungszahl.
- **Kosten großer Radien:** Ein sehr flüssiger Look (großes k überall) verlängert die Kurvenlisten; die Reichweite je Paar
  hält das klein.
- **Effekte gegen das Logo:** Jeder Effekt muss einzeln abschaltbar sein; Standard ist „aus“, außer Verschmelzen,
  Dickenregel und Kontaktschatten.

---

## 9 Empfohlene Effektliste

| Effekt | Mechanik | GPU | Prozessor | Nutzen für Ozzy | Stufe |
| --- | --- | --- | --- | --- | --- |
| Weiches Verschmelzen | smin je Verbindung, ohne Wulst | frei | – | sehr hoch | A (da) |
| Dickenregel (Verjüngung aus der Form) | Summe zweier Abstände, Mindestdicke, Auslauf | frei | – | sehr hoch | A |
| Linie mit Breitenprofil | Abstand zur Mittellinie minus Breite an der Stelle | gering | Bogenlänge | hoch (Maul, Lider, Linien) | A |
| Kantenglättung mit Spitzenregel | Rampe aus dem Abstand, Gefälle-Korrektur | frei | – | sehr hoch | A |
| Kontaktschatten und Bodenschatten | Abstand zu Pfoten und Scheibe, Höhe über Boden | gering | – | hoch (zeigt Halt) | A |
| Squash and Stretch | Anker entlang der Geschwindigkeit, flächentreu | – | gering | sehr hoch | A |
| Schmierbild über Zeitversatz, Bewegungslinien | Bahn je Anker zu verschobener Zeit | gering | gering | hoch (Stürze) | A |
| Aufprallbild | Schwarz und Weiß tauschen, ein bis zwei Bilder | frei | – | hoch (Komik) | A |
| Dithering gegen Stufen | Bayer oder blaues Rauschen, verankert | frei | – | technisch nötig | A |
| Staubwölkchen, Tropfen | verschmelzende Kreise mit Physik | gering | gering | hoch | B |
| Schein | Abstand außen, exponentiell | frei | – | mittel (Spielereignisse) | B |
| Auflösen | Schwelle gegen Rauschen, Kantenband | frei | – | mittel (Levels, Puff) | B |
| Beinschattierung, Stufen mit Verlauf | Wölbung aus Abstand, Stufen | gering | – | mittel (von ihm erlaubt) | B |
| Wackeln (Line Boil) für Momente | Rauschen, gestufte Zeit | frei | – | mittel (Zittern am Abgrund) | B |
| Mehrfachbilder | Kopien zu früheren Zeiten | mittel | gering | mittel | B |
| Dithering und Halbton als Stil | Raster aus Grauwert, verankert | frei | – | Stilfrage | C |
| Papierkorn | Korntextur in der Welt | frei | – | gering | C |
| Randlicht | Band innen an der Lichtseite | gering | – | gering bis mittel | C |
| Bloom, Weichzeichner, echte Bewegungsunschärfe | Nachbearbeitung | hoch | – | gering | nicht bauen |

A = gleich einbauen, B = bald für das Spielgefühl, C = Stiloption später.

---

## 10 Offene Fragen

1. **Grau oder nur Schwarz-Weiß?** Darf der Kontaktschatten (und die Beinschattierung) ein Grauton sein, oder soll jedes Grau
   als Raster aus reinem Schwarz und Weiß erscheinen (Dithering oder Halbton)?
2. **Wackeln überhaupt?** Ist Line Boil für Momente (Zittern am Abgrund, Schwindel) erwünscht, oder widerspricht es dem
   Grundsatz „glatt“ ganz?
3. **iPhone-Messung:** Hält der heutige Weg das Kriterium aus 4.5? Davon hängt ab, ob Stufe 2 früh nötig ist.
4. **WebGPU auf seinen Geräten:** Welche iOS- und Safari-Version laufen auf iPhone 16 und iPad, und meldet die App
   (WKWebView, Capacitor) WebGPU? Was hat Safari 27 geändert (nicht geprüft)?
5. **Sättigung beim Zoom:** Erreicht der Editor beim Hineinzoomen den Deckel der Reichweite, und ändert sich dann sichtbar
   das Verschmelzen?
6. **Kantenglättung gegen das Logo:** sRGB- oder lineares Mischen, Breite der Rampe; Vergleich mit dem Logo, wie Illustrator
   es zeigt, an seinem Bildschirm.
7. **Auflösung auf dem iPhone:** volle Dichte (dreifach) oder zweifach für die Figur? Abstandskanten bleiben auch bei
   zweifacher Dichte glatt, aber etwas weicher.
8. **Export:** Muss eine Figur außerhalb unserer Laufzeit laufen (Lottie, Rive, Spine, Unity, das alte three.js-Spiel)? Dann
   braucht es Backen (Bildfolgen oder Kontur aus dem Feld).
9. **Zahl der Figuren im Spiel:** Nur Ozzy, oder Begleiter und Gegner gleichzeitig? Mehrere Figuren sprechen für den
   Kachel-Durchgang.

---

## Quellen

**Prototyp und Projekt**

- Code: `apps/editor/src/ozzy-figur/renderer.ts`, `apps/editor/src/ozzy-figur/form.ts`
- Messwerte: `docs/look/ozzy-figur/UEBERGABE.md`

**Verfahren und Renderer**

- Triangulierung: [earcut (Mapbox)](https://github.com/mapbox/earcut),
  [Vergleich earcut und libtess](https://andrewmarsh.com/software/tesselation-web/),
  [PixiJS v8: Graphics](https://pixijs.com/8.x/guides/components/scene-objects/graphics),
  [PixiJS v8 erschienen](https://pixijs.com/blog/pixi-v8-launches)
- Schablone und Decken: [NVIDIA: GPU Accelerated Path Rendering](https://developer.nvidia.com/gpu-accelerated-path-rendering),
  [Spezifikation NV_path_rendering](https://developer.download.nvidia.com/assets/gamedev/files/GL_NV_path_rendering.txt),
  [Gemeinsame Kanten und „conflation“](https://wh0.github.io/2019/11/05/rasterization.html)
- Loop-Blinn: [Paper bei Microsoft Research](https://www.microsoft.com/en-us/research/publication/resolution-independent-curve-rendering-using-programmable-graphics-hardware/),
  [GPU Gems 3, Kapitel 25](https://developer.nvidia.com/gpugems/gpugems3/part-iv-image-effects/chapter-25-rendering-vector-art-gpu),
  [Patent US7564459B2 (abgelaufen 25.03.2026)](https://patents.google.com/patent/US7564459B2)
- Abstandsfelder: [Valve 2007: Improved Alpha-Tested Magnification](https://steamcdn-a.akamaihd.net/apps/valve/2007/SIGGRAPH2007_AlphaTestedMagnification.pdf),
  [Jump Flooding](https://www.comp.nus.edu.sg/~tants/jfa.html),
  [Quilez: smooth minimum](https://iquilezles.org/articles/smin),
  [Quilez: 2D-Abstandsfunktionen](https://iquilezles.org/articles/distfunctions2d),
  [Korrektur gegen Aufquellen bei smin](https://www.smish.dev/math/smin_overlap_correction),
  [Lektion: weiches Mischen von Abstandsfeldern](https://gamedev.net/shaderlab/28-smooth-sdf-blending/)
- Slug: [A Decade of Slug (Lengyel, 17.03.2026)](https://terathon.com/blog/decade-slug.html),
  [Referenz-Shader (MIT)](https://github.com/EricLengyel/Slug),
  [JCGT 2017](https://jcgt.org/published/0006/02/02/paper.pdf),
  [Bericht Hackaday](https://hackaday.com/2026/03/20/slug-algorithm-for-on-gpu-rendering-of-fonts-with-bezier-curves-now-in-public-domain)
- Nehab und Hoppe: [Random-Access Rendering of General Vector Graphics](https://hhoppe.com/proj/ravg/)
- Vello: [vello_gpu (früher vello_hybrid), 0.4.0](https://docs.rs/vello_gpu),
  [vello README](https://docs.rs/crate/vello/latest),
  [Sparse Strips im Repository](https://skia.googlesource.com/external/github.com/linebender/vello/+/refs/heads/main/sparse_strips),
  [Neufassung von vello_hybrid](https://skia.googlesource.com/external/github.com/linebender/vello/+/refs/heads/upstream/20260724%5E),
  [Folien RustWeek 2025](https://docs.google.com/presentation/d/1f_vKBJMaD68ifBO2j83lBly9Zdk-2bsvj_DIHXxvcuk/htmlpresent),
  [Linebender März 2025](https://linebender.org/blog/tmil-15/),
  [Linebender Oktober 2025](https://linebender.org/blog/tmil-22/),
  [GPU-friendly Stroke Expansion (HPG 2024)](https://arxiv.org/abs/2405.00127)
- Abflachen: [kurbo, analytisches Abflachen quadratischer Kurven](https://docs.rs/kurbo/0.9.3/src/kurbo/quadbez.rs.html),
  [Folgebeitrag zur Formel](https://dragostis.github.io/posts/analytic-quad-offset)
- Rive: [Renderer als Open Source](https://rive.app/blog/rive-renderer-now-open-source-and-available-on-all-platforms),
  [Renderer-Modi](https://rive.app/docs/runtimes/cpp/renderers),
  [Wie Rive Feathering neu erfand](https://rive.app/blog/how-rive-reinvented-feathering-for-the-vectorian-era),
  [Vector Feathering (Doku)](https://rive.app/docs/editor/fundamentals/vector-feathering)
- Skia und CanvasKit: [CanvasKit](https://skia.googlesource.com/skia/+/refs/heads/main/modules/canvaskit),
  [Graphite in Chrome](https://blog.google/chromium/introducing-skia-graphite-chromes/),
  [skia-discuss: CanvasKit und WebGPU](https://groups.google.com/g/skia-discuss/c/LNxndMgsyDk),
  [skia-discuss: drawImage-Tempo](https://groups.google.com/g/skia-discuss/c/CXF1misjJrc)
- ThorVG und dotLottie: [dotlottie-web mit WebGL und WebGPU (08.05.2026)](https://lottiefiles.com/blog/working-with-lottie-animations/hardware-accelerated-lottie-on-the-web-dotlottie-web-now-ships-webgl-webgpu),
  [ThorVG 1.1](https://www.thorvg.org/post/thorvg-v1-1-rising-the-standard)

**Plattform und Tempo**

- [WebKit: WWDC25, Safari 26 beta](https://webkit.org/blog/16993/news-from-wwdc25-web-technology-coming-this-fall-in-safari-26-beta/),
  [WebKit: Safari 26.1](https://webkit.org/blog/17541/webkit-features-for-safari-26-1/),
  [web.dev: WebGPU in allen großen Browsern](https://web.dev/blog/webgpu-supported-major-browsers),
  [gpuweb: Stand der Umsetzungen](https://github.com/gpuweb/gpuweb/wiki/Implementation-Status)
- [WebKit-Fehler 301627 (Flackern, behoben in 26.4)](https://bugs.webkit.org/show_bug.cgi?id=301627),
  [WebKit-Fehler 299237 (navigator.gpu ab OS 26)](https://bugs.webkit.org/show_bug.cgi?id=299237),
  [Apple-Forum: WebGPU in WKWebView](https://developer.apple.com/forums/thread/770862),
  [Apple-Forum: Absturz iPhone 15, iOS 26.4](https://developer.apple.com/forums/thread/822200)
- [WebKit-Fehler 255987 (WebGL über Metal langsamer)](https://bugs.webkit.org/show_bug.cgi?id=255987),
  [WebKit-Fehler 228012 (WebGL2 über Metal)](https://bugs.webkit.org/show_bug.cgi?id=228012)
- [three.js WebGPURenderer](https://threejs.org/manual/en/webgpurenderer),
  [Forum: TSL, WebGL2 und WebGPU](https://discourse.threejs.org/t/tsl-and-webgl2-vs-webgpu/87974),
  [Forum: WebGPURenderer langsamer als WebGLRenderer](https://discourse.threejs.org/t/why-webgpurenderer-performance-significantly-lower-than-webglrenderer/77629)
- [Apple: Apps auf Kachel-GPUs zuschneiden](https://developer.apple.com/documentation/metal/tailor-your-apps-for-apple-gpus-and-tile-based-deferred-rendering),
  [WWDC 2020: Apple-GPUs (10632)](https://developer.apple.com/videos/play/wwdc2020/10632/),
  [A18: Rechenleistung (Fremdangabe)](https://www.cpu-monkey.com/en/benchmark-apple_a18-bench_11)

**Effekte**

- Verschmelzen: siehe Abstandsfelder; [Gooey-Effekt (Weichzeichnen plus Schwelle)](https://css-tricks.com/?p=195076)
- Verjüngungen: [Inkscape Power Stroke](https://wiki.inkscape.org/wiki/PowerStroke),
  [SVG-Vorschlag variable Strichbreite](https://www.w3.org/Graphics/SVG/WG/wiki/Proposals/Variable_width_stroke),
  [After Effects: Striche verjüngen](https://helpx.adobe.com/after-effects/using/taper-shape-strokes.html),
  [Moho-Forum: Verjüngung](https://www.lostmarble.com/forum/viewtopic.php?p=207178),
  [Variable Linienbreiten in R](https://www.stat.auckland.ac.nz/~paul/Reports/VWline/vwline-intro/power-curve.html)
- Schattierung: [Laigter: Normalen aus der Silhouette](https://laigter.readthedocs.io/en/latest/HowTo/normal-map-generation.html),
  [Normalen für Pixel-Art (Paper)](https://arxiv.org/abs/2212.09692)
- Schatten: [Quilez: weiche Schatten](https://iquilezles.org/articles/rmshadows),
  [Lektion: weiche Schatten und Verdeckung](https://gamedev.net/shaderlab/32-soft-shadows-and-ambient-occlusion/)
- Squash and Stretch: [Velocity Skinning (Eurographics 2021)](https://arxiv.org/abs/2104.04934)
- Schmierbilder: [SMEAR (SIGGRAPH 2024)](https://hal-iogs.archives-ouvertes.fr/hal-04576817v1),
  [SMEAR als Blender-Erweiterung](https://extensions.blender.org/add-ons/smear/),
  [SIGGRAPH-Blog zu SMEAR](https://blog.siggraph.org/?p=18894),
  [Interactive Art-Directable Smear Frame Stylization](https://hal-cnam.archives-ouvertes.fr/AFIG/hal-04285524v1)
- Line Boil: [Handgezeichnete Bewegung mit SVG-Filtern](https://camillovisini.com/coding/simulating-hand-drawn-motion-with-svg-filters),
  [After Effects: Wiggle und Line Boil](https://www.premiumbeat.com/blog/wiggle-text-line-boil),
  [Godot: Line Jitter](https://godotshaders.com/?p=12146)
- Dithering: [Surface-Stable Fractal Dithering](https://runevision.com/tech/dither3d),
  [Obra Dinn: Dithering auf der Kugel](https://dev.to/arkacoc13/return-of-the-obra-dinn-spherical-mapped-dithering-for-a-1bpp-first-person-game-9h8)
- Auflösen: [Codrops: Dissolve mit Shadern (2025)](https://tympanus.net/codrops/2025/02/17/implementing-a-dissolve-effect-with-shaders-and-particles-in-three-js/),
  [Godot: 2D-Auflösen mit Brandkante](https://godotshaders.com/?p=6688)
- Spine-Effekte: [Spine-Laufzeit, SwirlEffect](https://cdn.jsdelivr.net/npm/spine-runtimes@3.5.35/spine-ts/core/src/vertexeffects/SwirlEffect.ts),
  [Cocos: Spine-Komponente mit Vertex-Effekten](https://docs.cocos.com/creator/3.0/manual/en/components/spine.html),
  [spine-unity: Rendering und Tint Black](https://esotericsoftware.com/spine-unity-rendering)
