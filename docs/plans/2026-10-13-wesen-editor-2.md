# Wesen-Editor 2: Plan für die Neukonzeption (13.10.2026)

> **Freigegeben von Florian am 13.10.2026 (abends).** Er hatte die Ergebnisse der Versuche vom 11.–13.10. als „sehr durchwachsen“ bewertet, die Shape-Idee weiterhin gut gefunden und gefragt, ob ausgefallene Wesen damit lösbar sind oder ein auf ihn zugeschnittener 3D-Editor mit Bibliothek besser wäre. Dieser Plan ist die Antwort.
>
> Referenzen: Florians Ordner `ref/editor/` (Bögen in `creatures/`, UI-Entwürfe in `UI/`, Versuchsbilder, Abzüge der Übergabe) liegt **lokal, nicht in Git**. Dieselben 19 Bögen liegen im Repo als `docs/look/wesen-refs/bild01…bild19` (Zuordnung nach Motiv, z. B. `rex_dragon_big mouth` → `bild05`, `dogs_mouth` → `bild08`, `raubkatzen…` → `bild09`, `grundblob eyes` → `bild10`, `rex_mouth_detail` → `bild11`, `schlangenwesen_aal` → `bild13`, `different_big mouths` → `bild14`, `leg variation…` → `bild15`, `favorite wesen!` → `bild16`, `musterTfell…` → `bild17`, `substance gas:fire` → `bild18`; vor dem Urteil das Bild öffnen). Die Abzüge unter `ref/editor/uebergabe/` entsprechen `docs/plans/2026-10-13-grosse-sitzung-wesen-editor.md` und `docs/research/2026-10-13-schnitte-ueberhaenge.md`.

## 0. Kurzfassung

- **Entscheidung:** Der Editor bekommt **einen echten 3D-Körper als einzige Wahrheit** (Subdivision-Käfig mit Spiegelung und Falten, wie Florians Blender-Gewohnheit Mirror + Subsurf + Crease), und Florians Kurven (Seitenumriss, Spanten, Kantenlinien, Wirbelsäule, Maullinie) werden **Griffe auf diesem Körper**, nicht mehr die Quelle, aus der der Körper jedes Mal neu abgeleitet wird. Dazu kommen Bausteine mit Automatik (Maul, Zähne, Augen, Teile, Klingen, Rig, Posen, Look) und der Earle-Look von der ersten Sekunde an.
- **Warum:** Alle sechs bisherigen Bauwege scheiterten am selben Punkt: Sie wollten das 3D aus drei 2D-Ansichten *ableiten*. Was keine Ansicht zeigt (Wangen, Kasten, Beulen, Teile), brauchte Sonderregeln, und jede Sonderregel zerstörte eine andere. Ein Körper mit Griffen hat keine Widersprüche zwischen Ansichten, weil jede Ansicht eine Projektion desselben Körpers ist.
- **Warum trotzdem „Shapes“:** Die Zeichnung bleibt der schnellste Einstieg (Umriss zeichnen → runder Körper steht) und bleibt als Griff jederzeit ziehbar. Nur die Richtung dreht sich: *einmal ableiten, dann bearbeiten*, statt *immer wieder ableiten*.
- **Was zuerst:** Phase 0 sind fünf Beweise in einer Woche mit harten Kriterien (Kern-Tempo und Genauigkeit, Maul mit Haps ohne Durchdringung, Teil nahtlos andocken, Earle-Material live, Feuer/Gas/Fell-Blob neben dem Bogen). Erst danach wird breit gebaut.
- **Plattform:** Web-App (Vite, React, three.js WebGPU/TSL) in der vorhandenen Electron-Hülle **und** identisch im Browser; Rechenkern in Workern und WASM/WebGPU-Compute, kein Node im Renderer. Die Entscheidung „App oder Browser“ bleibt damit reversibel.
- **UI:** Rahmen klassisch (Stamm mit neun Stufen-Knospen links, Bühne und drei Blätter in der Mitte, Tafel rechts immer offen, kleines Glas-Dock unten), Interaktion neu und am Körper (Ranken, Lupe mit Ringtext in drei Rollen, Reifen als greifbare Querschnitte, Kieferknopf, Fächer). Illustrator in den Blättern, Blender auf der Bühne, eine Konfliktregel. Earle als Kulisse im Rahmen, Block für alles Greifbare, Glas nur für Schwebendes; Bühne neutral (Papier/Nacht/Brett) statt Grün, damit die Farben stimmen. „L“-Initiale und Lupe bleiben (Abschnitt 9).
- **Maßstab:** Florians 19 Bögen (`ref/editor/creatures/`) sind die Spezifikation. Jeder Meilenstein endet mit einem Vergleichsbild Bogen | Render, gleicher Blick, gleicher Maßstab, und mit Messwerten (Umriss-Abweichung, Durchdringungen, Dreiecke, fps).

## 1. Kontext und Auftrag

- Seit dem 11.10. wurde der Wesen-Editor als Shape-/3D-Editor gebaut (`apps/editor`, `packages/shape`): drei Profile wie Illustrator, Blender-Navigation, Library, Dokumentformat; dann in Versuchen Maul, Zähne, Rig, Kanten, Spanten, Wirbelsäule, Schnitt-Loft und „rund“ (Übersicht `ref/editor/uebergabe/00-bilanz-grosse-sitzung.md`, `02-schnitte-ueberhaenge.md`).
- Florian (13.10.): Die Ergebnisse waren „sehr durchwachsen“; die Shape-Idee gefällt ihm nach wie vor sehr, aber er ist unschlüssig, ob ausgefallene Wesen so lösbar sind, oder ob ein echter, auf seine Bedürfnisse zugeschnittener 3D-Editor mit Bibliothek besser wäre. Ziel bleibt „der beste, dynamischste und innovativste Charakter-Editor für ein Spiel“.
- Konkrete Anforderungen aus seiner Nachricht (alle im Plan abgedeckt, Abschnitt in Klammern): Form, Maul zu/auf und Shading müssen aussehen wie die Referenzen, Teile dynamisch kombinierbar (3, 4, 6); Maul als Blendshapes + Knochen an Ober- und Unterkiefer, Maul einzeichnen, geschlossen bündig oder getrennt, Maultasche entsteht automatisch, Über-/Unterbiss klar darstellbar (5); Fressen-Pose = Blendshape von Maul UND Körper plus platzierbare Kieferknochen, Beine/Flügel/Schuppen je Pose anpassbar, Posen jederzeit umschaltbar (5, 6); Zähne verteilen, einzeln setzen, Regler Krümmung/Rundheit/Größe/Länge/Breite/Rotation, Farbe mit Verlauf (5); Augen gemalt/Schlitz/Glubschauge mit Zuständen Blinzeln, Sichel, X, Hypno-Spirale (5); Formen wie Löwe, Tiger, Rex, Drache (3, 4); Beine 2/4/6/8, Arme, Flügel, Flossen, Rückenschuppen, Schwanz, Hörner, Fühler als Teile im Tool, Andockstellen, flüssig oder angesteckt, je Pose anpassbar, reagieren aufs Rig (6, 7); Vektorlinien direkt auf dem Mesh für Muster/Zonen, hart/weich/hart→weich, überall gleich (8); Spielqualität live, Topologie immer sauber, scharfe Kanten mit sauberen Übergängen (4.5, 10); Shading-Stile in eigenem Tab (8); Fell, Feuer und Gas wie in den Referenzen, elegant animiert (8.5–8.7); UI einfacher, schlichter, Earle + Neobrutalismus + Liquid Glass, „L“-Initiale und Lupe behalten, Desktop + Tablet (9); App oder Browser (10).

## 2. Bilanz, selbstkritisch: Warum es bisher nicht wurde

Die Versuche haben viel Wissen gebracht (Kurvenbedienung, Dokumentformat, Kieferrechnung, Zähne am Zahnfleisch, Nachziehen der Bögen, Prüfwerkzeuge). Die Form aber blieb hinter den Bögen zurück. Fünf Ursachen, deutlich:

1. **Ableiten statt bearbeiten.** Sechs Bauwege (Loft, Kanten-Käfig, Maul-Käfig, Wirbelsäulen-Käfig, Schnitt-Loft, „rund“) leiteten den Körper jedes Mal neu aus den Ansichten ab. Jede Ansicht hatte dadurch globale Macht („eine Ansicht formt die andere“), und alles, was keine Ansicht zeigt, brauchte Sonderregeln (Normierung der Spanten, Kappe, Hälften-Regel, gestreckter Raum). Die Kombinationstabelle in der Bilanz (Kanten + Maul: nein; Biegen + Maul: nein …) ist die Folge.
2. **Die Form wurde weiß beurteilt.** Ohne Earle-Material, Augen und Muster war nie sichtbar, ob ein Körper „nach Bogen“ aussieht. Florian konnte nur Abweichungen in Pixeln sehen, keinen Look.
3. **Beine, Teile und Fell wurden nie angefangen.** Alle Zeit ging in den Rumpf. Auf den Bögen machen aber Mähne, Büschel, Flügel, Kämme und Beine den Charakter aus; der Rumpf ist meist ein Sack.
4. **Das Maul war ein eigener Käfig** an einer festen Stelle (vorn, Kappe), mit 130 bis 2142 Durchdringungen. Die Bögen zeigen Mäuler überall: vorn, unten, am Hals, ohne Unterkiefer, bis zum Boden.
5. **Zu viele Regeln, zu wenig Anfassen.** Härte-Stufen, Knickwinkel, Normierungen, Hinweistexte; im 3D konnte man nichts greifen. Florian: „Ich habe Probleme, schöne Formen und Kanten zu machen.“

**Was bleibt (bewährt):** Kurvenbedienung wie Illustrator, Blender-Navigation mit Trackpad-Wegen, Dokument speichert nur Absicht (zod, Rundreise), Nachziehen der Bögen (0,26–0,48 px), Kiefer = Knochen + Korrektur, Zähne am Zahnfleisch mit Prüfung, Faustregel „eine Kante ist eine Ecke in einem Shape“, Prüfstand (Vergleichsbilder, Pixelmessung, Durchdringungstest, E2E mit echter GPU), Werkstatt-Wissen zu Kiefer (Schädel kippt nach hinten, Unterkiefer fällt weniger, Kehlkette, Bohne, Bodengrenze), Look-Bausteine in `packages/render/src/creature2` (Muster, Zonen, Glimmer, Jelly-Lavalampe).

**Antwort auf Florians Kernfrage** („Shapes oder echter 3D-Editor à la Blender?“): **beides, in einer bestimmten Reihenfolge.** Ein echter 3D-Körper (wie Blender) ist die Wahrheit; die Shapes sind Einstieg und Griffe (wie Illustrator); und schneller als Blender wird es durch die Automatik der Bausteine, nicht durch mehr Modellierwerkzeuge. Blender nachzubauen wäre teuer und sinnlos, denn Blender gibt es schon; was es nirgends gibt, ist ein Editor, der aus Kurven und wenigen Griffen ein animierbares, spielfertiges Wesen im Earle-Look macht.

## 3. Zielvertrag: die Bögen als Spezifikation

### 3.1 Was die Bögen vom System verlangen

| Bogen (`ref/editor/creatures/`) | Was er fordert | Systemteil |
|---|---|---|
| `favorite wesen!.png`, `bodyshapes.png` | Aal mit Rundmaul und gezackten Flossen; Langhals-Saurier mit Kamm; Betta-Fisch mit Riesenflossen; Rex mit Flügelstummeln; Retriever-Gähnen; Drache mit Fledermausflügel und Maul am Hals | Kern, Maul überall, Klingen, Teile, Posen |
| `rex_dragon_big mouth.png`, `rex_mouth_detail.png`, `different_big mouths.png` | Maul als Bohne, offen so weit, dass es „ein anderes Tier mit einem Haps“ schluckt; Lippenband hell, Rachen maroon, große Zunge, gebogene cremefarbene Zähne mit Verlauf; Oberkiefer klappt samt Augen, Unterkiefer fällt | Maul, Zähne, Rig, Fressen-Pose, Look |
| `raubkatzen_mouth closed_kastenschnauze.png` | Kastenschnauze mit markantem Kinn, Nasenband, Mähne als Zacken, Streifen, untergeschlagene Pfoten, Schwanz als dünne Schleife | Kanten (Falten), Klingen, Muster, Teile |
| `dogs_mouth.png`, `langhals_variation_dog:giraffe.png` | W-Oberlippe, Schlappohren, Fellfahnen an Brust/Schwanz, Gähnbohne unter großer Nase, S-Hals, Tropfenkörper | Maul (Lippenform), Klingen (Kunstpinsel), Wirbelsäule |
| `fish_round mouth.png`, `schlangenwesen_aal.png` | Rundmaul ohne Kiefer, Sechseckschuppen, Flossen als gezackte Klingen, eingerollter Schlangenkörper | Maul-Art „Loch“, Muster, Klingen, Wirbelsäule |
| `leg variation_bird and spider.png` | Stelzbeine mit drei Zehen, 8 Knickbeine dünn oder dick und behaart, Schnäbel, Federhauben, Pfauenrad | Teile (gesteckt), Klingen, Muster |
| `musterTfell:struktur:flügel.png` | 13-stufige Reihen je Familie; **Fell-Blobs ganz aus Büscheln**; Flügel-Wesen; Streifen, Rosetten, Flecken, Salamander, Schuppen, Fisch-Muster | Fell-Material, Reihen (Varianten), Muster |
| `substance gas:fire.png` | Feuer- und Gas-Wesen in 13 Stufen: Körper aus Flammen/Schwaden mit Innenbändern, abgelöste Flämmchen/Bläschen, Beinchen aus Flammen | Materialart Feuer/Gas mit Animation |
| `pezenpez.png`, `grundblob eyes.png` | Jelly-Grundblob mit Schlitzauge, dunkler Innenblase, Bläschen; Augenzustände: zu, groß, Sichel, X, Spirale, Glubschauge | Jelly-Material, Augen |
| `blobs with big mouth.png` | Blobs mit Hauern, Tasche über Hauer, Stachelkränze, Flügel | Zähne außen bei geschlossenem Maul, Klingen |
| `skizze_generatied_wesen.png` | Florians Skizzen: Grundblob-Silhouetten, Rex, Giraffe, Krokodil, Löwe, Vögel | Nachzeichnen, Einstieg |
| `alle wesen_earle style.png` | das Gesamtbild: Sack-Körper auf dem Boden, Kopf dominiert, wenige große Formen, Airbrush in harten Feldern, Korn, keine Konturen | Look-Vertrag |

### 3.2 Messbare Abnahme (je Meilenstein, automatisch)

- **Umriss:** Seite, Front, Top ≤ 1 px (461 px je Kachel) gegen die gezeichnete Kurve; Überdeckung mit dem Bogen (IoU der Silhouette) ≥ 0,90 bei nachgezogenen Prüfwesen.
- **Sauberkeit:** 0 Durchdringungen bei Maul 0/25/50/75/100 %, in Ruhe- und Laufpose; Netz immer geschlossen und mannigfaltig (automatischer Test nach jeder Operation).
- **Tempo:** Vorschau ≤ 16 ms je Zugschritt (Griff oder Pinsel), genaues Netz ≤ 100 ms nach dem Loslassen, Maul-Umbau ≤ 200 ms.
- **Spiel:** 36 Wesen auf dem iPhone 16 ≥ 58 fps, ≤ 100 Draw Calls, Körper ≤ 8 000 Dreiecke je Wesen auf dem Brett.
- **Florian:** Vergleichsbild Bogen | Render (gleiche Ansicht, gleicher Maßstab, weißer Grund, Licht rechts oben) und sein „ja“. Ohne Vergleichsbild gilt kein Meilenstein als fertig.

### 3.3 Abgleich-Protokoll

Jede Sitzung öffnet die betroffenen Bögen vor dem Urteil (Regel aus dem Gedächtnis: Referenzbilder sofort sichern und vor jedem Urteil öffnen). Prüfwesen mit Nachziehen aus den Bögen: Rex (`rex_dragon_big mouth` links), Drache (rechts), Löwe und Tiger (`raubkatzen…`), Retriever (`dogs_mouth`), Aal (`favorite wesen!` links), Flamingo und dicke Spinne (`leg variation…`), Fell-Blob und Feuer- und Gas-Blob Stufe 7 (`musterTfell…`, `substance gas:fire`), PezenPez. Reihenfolge im Fahrplan (Abschnitt 11).

## 4. Die Bauweise: ein Körper, viele Griffe

### 4.1 Die Wahrheit: ein Subdivision-Käfig je Wesen

- **Käfig:** geschlossenes Vierecksnetz mit wenigen hundert bis wenigen tausend Punkten, gespiegelt an der Mittelebene (nur die rechte Hälfte wird gespeichert und bearbeitet, die linke ist Spiegel). Catmull-Clark mit **halbscharfen Falten** je Kante (Härte 0 … ∞), genau wie Blender Crease. Die Oberfläche ist dadurch per Konstruktion glatt, geschlossen und ohne Risse; scharfe Kanten sind Falten, weiche Kanten sind Falten mit kleiner Härte (Florians „1 px gestrichelt → 3 px schwarz“ bleibt als Anzeige).
- **Vorlagen je Bauplan:** Jedes Wesen beginnt aus einer Vorlage mit gutem Kantenfluss: eine Röhre aus **Ringen entlang einer Wirbelsäule** (Kappe vorn und hinten), mit markierten Zonen: Kopf, Hals, Rumpf, Schwanz; Augenflächen; Beinfelder (2×2 oder 3×3 Flächen = Andockstellen mit 8 bzw. 12 Randpunkten). Baupläne: Blob, Rumpf-mit-Hals (Langhals, Vogel), Schlange/Fisch (lange Röhre), Spinne (Kugel mit acht Feldern). Die Vorlage legt Ring- und Punktzahl fest; die Form ist frei.
- **Einstieg wie bisher, nur einmal:** Seitenumriss zeichnen oder Bogen nachziehen → Poisson-Aufblasen (Versuch „rund“, das Florian als „Tropfenform“ gefiel) → Ringe der Vorlage werden auf den aufgeblasenen Körper gelegt (Wirbelsäule aus der Mittelachse, Ringe senkrecht dazu, Breite aus Top/Front) → fertig ist der Käfig. Ab hier wird nur noch bearbeitet; nie wieder neu abgeleitet.

### 4.2 Die Griffe: Florians Kurven auf dem Körper

Alle Kurven sind **Kurven auf der Käfigfläche**, mit Illustrator-Bedienung (Zeichenstift, Griffe, ⌥-Ecke, Auswahlrechteck, Pfeiltasten). Sie sind gleichzeitig in jeder Ansicht und im 3D sichtbar und ziehbar.

| Griff | Was er ist | Wirkung beim Ziehen |
|---|---|---|
| **Seitenumriss** | der Schnitt des Körpers durch die Spiegelebene (die Naht-Schleife des Käfigs: Rückenlinie und Bauchlinie), als Bézier mit Florians Punkten | bewegt die Nahtpunkte örtlich (Band aus wenigen Ringen, Abfall einstellbar); die Grenzfläche geht exakt durch die Kurve (Interpolation nach Halstead/Kass/DeRose, lineare Vorkorrektur). Überhänge, Schnauze über Bauch und Kerben sind einfach Teile einer geschlossenen Schleife; nichts wird „ausgeblockt“ |
| **Spanten** | Querschnitte = Ringe des Käfigs, bearbeitet in Front/Back als Halbprofil; beliebig viele, an jeder Station einfügbar (ein neuer Spant ändert die Form um 0, weil er aus der Fläche kommt) | nur dieser Ring bewegt sich (Nachbarn mit Abfall); Spanten werden **nicht** normiert |
| **Breitenlinie (Top)** | die Linie der breitesten Ringpunkte, als Kurve | zieht die Breite genau dieses Rings, sonst nichts (Florians Erwartung: „nur der oberste Punkt wandert“) |
| **Wirbelsäule** | die Kette der Ringmitten; Hals hoch, Kopf drauf; auch selbst zeichenbar | verlegt Ringe starr mit (⌥) oder biegt den Körper als Pose (Knochenkette) |
| **Kantenlinie** | eine gezeichnete Linie auf der Fläche; eine Kantenschleife des Käfigs wird **auf die Linie gelegt** (siehe „Schleifen einrasten“ unten); Härte je Punkt | Falte mit Härte; Ecke im Spant oder Umriss = Falte quer bzw. längs („eine Kante ist eine Ecke in einem Shape“ gilt weiter, ohne Sonderregel) |
| **Maullinie, Augenlinien, Ansatzlinien** | Kurven auf der Fläche, gespeichert in Flächenkoordinaten (Käfigfläche + u,v), nicht an Punktnummern | siehe Abschnitte 5 bis 7 |

Ein Punkt kann mehreren Kurven gehören (Maulanfang = Umrissknoten, Spant-Ecke = Kantenpunkt). Ziehen bewegt ihn in allen und sonst nichts (Prinzip der gemeinsamen Punkte, aus den Tests übernommen).

**Schleifen einrasten (statt Freischnitt):** Der Käfig ist eine Röhre aus Ringen × Längsschleifen. Eine gezeichnete Linie, die die Ringe je einmal kreuzt (Maullinie, Längskante, Augenlinie), wird so auf den Käfig gelegt, dass eine **vorhandene Längsschleife** sie trifft: In jedem Ring wird der Punkt dieser Schleife an die Kreuzung mit der Linie gesetzt und die übrigen Ringpunkte werden gleichmäßig umverteilt (die Topologie bleibt, nur die Ringparametrisierung dreht sich örtlich). Linien quer zum Körper (Rundmaul, Halsring, Kanten um den Kasten) treffen entsprechend einen **Ring**, der bei Bedarf als neuer Ring eingefügt wird (Loop-Cut quer, reine Vierecke; Lage aus dem Grenzflächen-Schnitt, Formänderung ≤ 0,1 px). Verdichtung (mehr Ringe am Kopf, mehr Längsschleifen am Maul) ist ebenfalls ein Loop-Cut. Ein freier Schnitt entlang beliebiger Linien („Knife Project“) wird **nicht** gebaut: Er erzeugt Dreiecke und N-Ecke und war in der Bilanz der Grund für kippende Topologien. Linien, die einen Ring mehrfach kreuzen, werden auf die nächste monotone Lage gezogen und das wird angezeigt.

### 4.3 Direktes Formen im 3D (und in jeder Ansicht)

Wenige Pinsel, Blender-Gefühl, immer symmetrisch: **Ziehen** (weich, Radius mit F wie in Blender), **Aufblasen**, **Glätten**, **Abflachen**, **Falte** (Härte malen), **Kneifen**. Sie wirken auf die Käfigpunkte (nicht auf das feine Netz); dadurch bleiben Topologie und Griffe gültig, und das Ergebnis ist immer eine glatte Subdivision-Fläche. Ein örtliches Werkzeug für Beulen und Mulden war die größte Lücke der Tests (F5 der Bilanz).

### 4.4 Tempo: Subdivision als Matrix

- Solange sich die Topologie nicht ändert (und sie ändert sich nur bei Loop-Cut, Maulschnitt, Andocken), ist Catmull-Clark mit festen Härten eine **lineare Abbildung**: feine Punkte = S · Käfigpunkte. S (dünn besetzt) wird einmal je Topologie gebaut; jeder Zugschritt ist dann eine Matrix-Vektor-Multiplikation (Mikrosekunden bis wenige ms, auch bei Stufe 3). Normalen und Grenzflächen-Korrektur ebenso linear.
- Daraus folgt: Posen, Blendshapes, Mischen von Varianten und Skinning laufen **auf dem Käfig** (wenige hundert Punkte) und werden mit derselben Matrix fein. Drei Morph-Ziele je Wesen auf dem Brett bleiben billig.
- Zwei Umsetzungen, die beide vorbereitet werden: CPU im Worker (Matrix, immer verfügbar) und WebGPU-Compute (Halbkanten-Verfeinerung nach Dupuy/Vanhoey 2021, public domain/MIT, mit halbscharfen Falten, GLSL-Vorlage vorhanden) für Stufe 3–4 im Editor. Keine JS-Bibliothek kann Catmull-Clark mit Falten (`opensubdiv-wasm` hat keine Schärfe-Schnittstelle, `three-subdivide` nur Loop); der Eigenbau ist begründet. Der vorhandene `packages/shape/src/versuch/catmullClark.ts` (173 Zeilen, Kantenregeln nach DeRose mit Chaikin-Abfall und Punktschärfe korrekt, aber Objekt-Implementierung mit String-Schlüsseln, ohne Randregel und ohne Grenzflächen-Auswertung) dient als **Spezifikation und Testvorlage**; neu gebaut wird er als Halbkanten-Struktur auf Typed Arrays mit vorberechneter Matrix und Grenzflächen-Masken (Stam 1998: Grenzlage hängt linear vom Käfig ab).
- Käfig-Löser (Griffe → Käfigpunkte): kleine dünn besetzte Gleichungssysteme (Laplace-Glattheit + Punktbedingungen), einmal faktorisiert je Topologie, dann je Zugschritt nur Rückwärtseinsetzen. Reicht ohne WASM in TypeScript bei ≤ 5 000 Käfigpunkten. Bausteine dafür gibt es schon: ARAP, Horn-Quaternion und harmonische Fortsetzung in `packages/shape/src/versuch/kiefer.ts`, CG-Löser im Poisson-Aufblasen (`aufblasen.ts`).
- **Worker ab Tag 1.** Heute läuft der ganze Bau synchron im Hauptthread (Maul 0,4 s, Seitenteile 0,35 s). Das Muster „neuester Auftrag gewinnt“ aus `apps/game/src/lab/wesen/buildClient.ts` + `build.worker.ts` wird übernommen: Käfig-Operationen und Löser im Hauptthread (klein, sofort), Matrix-Subdivision Stufe ≥ 2, Atlas-Rasterung, Prüfungen und Export im Worker.

### 4.5 Topologie-Garantien (Florian: „nichts darf zerrissen oder löchrig sein“)

- Nur Operationen, die Mannigfaltigkeit erhalten: Loop-Cut, Inset (Maultasche, Andockloch), Bridge zweier Ränder gleicher Punktzahl, Spiegeln. Nach jeder Operation ein automatischer Test (geschlossen, mannigfaltig, Orientierung, keine Doppelkanten); schlägt er fehl, wird die Operation verworfen und gemeldet.
- Glatte Flächen sind glatt, Kanten sind Falten mit gezeichneter Härte, Übergänge in runde Formen entstehen, weil die Härte entlang der Linie ausläuft (Breitenwerkzeug ⇧W auf der Kantenlinie).
- Anzeige: Käfig, Zebra, Netzfluss (Kantenschleifen), Krümmung; „Spiel“-Schalter zeigt Stufe 1 (Brett) statt Stufe 3 (Nahansicht).

### 4.6 Was das gegenüber Blender und den Versuchen bringt

| | Blender | Versuche 11.–13.10. | Wesen-Editor 2 |
|---|---|---|---|
| Grundform | Box-Modeling, Loop Cuts, Mirror/Subsurf von Hand | drei Umrisse, fünf Ableitungen mit Widersprüchen | Umriss zeichnen → Körper steht; danach Griffe und Pinsel auf einem Körper |
| Querschnitte | Loop Cut + Punkte schieben | normierte Spanten mit globaler Wirkung | Ringe als Spanten, örtlich, exakt |
| Kanten | Crease von Hand je Kante | Härte-Stufen, Knickwinkel, Tiefe | Linie zeichnen, Härte auslaufen lassen |
| Maul | Lippenschleifen, Tasche, Rig, Korrekturen: Stunden | eigener Käfig, nur vorn, Durchdringungen | Linie auf dem Körper, Tasche/Kiefer/Korrektur automatisch, überall am Kopf |
| Beine, Flügel | Extrudieren, Gewichte, IK | fehlten | Teile aus der Bibliothek andocken, verschmolzen oder gesteckt, Rig automatisch |
| Fell, Kämme | Partikel/Geometry Nodes | fehlten | Klingen als Pinsel auf Ansatzlinien |
| Look | Shader-Netzwerk, UV, Malen | weiß mit Matcap | Earle-Look immer an; Zonen als Vektorformen auf dem Körper |
| Spiel | Export, Budget von Hand | fehlte | dieselbe Datei; Budget live |

## 5. Maul, Kiefer, Zähne, Augen

### 5.1 Maul einzeichnen, geschlossen bündig oder getrennt

1. **Maullinie** (Zeichenstift, Stufe „Maul“): auf dem Körper, in Seite, Front oder 3D; Start an der Spiegelebene, Ende am Mundwinkel (schwarz). Eine Längsschleife des Käfigs wird auf sie gelegt (4.2 „Schleifen einrasten“): Der Lippenpunkt jedes beteiligten Rings wandert auf die Linie, die Ringe davor bleiben Schnauze. So kann das Maul vorn, unten, am Hals oder hoch unter der Nase liegen, und die 4×4-Kappe ist keine Grenze mehr, weil die Lippenschleife durch die Kappe laufen darf. Das Rundmaul ist ein Ring nahe der Spitze, dessen Inneres (die Kappe) die Öffnung wird.
2. **Kiefer gleich oder getrennt (schon geschlossen):** „gleich“ = eine Linie, beide Lippen bündig. „getrennt“ = Ober- (rot) und Unterlippe (blau) werden eigene Kurven; dazwischen liegt ein Lippenband. Überbiss, Unterbiss und Lippenbreite entstehen durch Ziehen der beiden Kurven (Florians Bogen `06-rex-mit-maul`). Hauer eines Kiefers können dann geschlossen außen liegen (`blobs with big mouth`).
3. **Maulart:** Schnitt (Standard), Rundmaul/Loch (Fisch, Aal: eine geschlossene Linie, kein Kiefer), ohne Unterkiefer (Drache: die Unterlippe läuft am Hals hinab, Kinnseite über den Winkel wie im Versuch), W-Oberlippe (Hund, mit Scharte).
4. **Tasche automatisch:** Der Käfig wird entlang der Lippenlinie(n) geschlitzt; beide Ränder bekommen Lippenschleifen (Lippenband hell) und eine nach innen gezogene Tasche (Rachen maroon) mit Zunge (Kissen, eigener kleiner Käfig an der Unterkieferinnenfläche). Geschlossen ist die Tasche eine flache Linse im Körper, offen eine Bohne. Der Mundwinkel ist eine Zone (mehrere Punkte mit Reißverschluss-Gewicht), kein Einzelpunkt (Ursache der Durchdringungen im Versuch).

### 5.2 Kiefer-Rig und Fressen-Pose

- **Zwei Knochen:** Schädel (kippt nach hinten und hebt den Kopf, nimmt Oberkiefer, Nase, Augen mit) und Unterkiefer (fällt, bei Robbe/Drache zieht er sich lang: „Ziehen“ statt „Kippen“). Gelenklage wird aus zu/auf geschätzt (Kieferrechnung aus dem Versuch, < 0,1°) und ist als Griff im 3D verschiebbar. Dazu Kehlkette (⅔/⅓) und Bodengrenze (Unterkiefer fährt nie durch Boden oder Körper; am Limit öffnet der Schädel weiter).
- **Gewichte automatisch** aus Lippenlinie, Kieferlinie (zweiter Griff: wo der Unterkiefer in den Hals übergeht; beim Drachen der ganze Hals) und Ringindex; glatter Übergang über ±1–2 Ringe.
- **Fressen-Pose = Knochen + Körper-Blendshape.** Die Pose zeigt zuerst, was die Knochen ergeben; dann bearbeitet Florian **alles** in der Pose (Umriss, Spanten, Pinsel, Teile): Diese Abweichung wird als Korrektur-Blendshape des ganzen Käfigs gespeichert (Posen = Deltas auf dem Käfig mit gleicher Punktstruktur, also immer gültig). So werden offene Bohne, hochgehobener Kopf und mitlaufender Hinterkopf (Florians Rückmeldungen vom 08.10.) direkt formbar.
- **Weitere Posen** (Brüllen, Schlafen, Lauf-Extrem) funktionieren identisch; Umschalten jederzeit; Zwischenstufen per Regler. Spiel-Export: 3 Morph-Ziele (zu→auf, Blinzeln, eine freie) plus Knochen.

### 5.3 Zähne

- **Verteilen:** Anzahl je Kiefer, symmetrisch; sie sitzen am Zahnfleisch (die Lippenschleife nach innen versetzt), Abstand nach Zahnbreite, Größenwechsel (Fänge vorn), geschlossen nach außen (Hauer) oder innen.
- **Einzeln wählen und setzen:** Klick in Seite/Front/3D, Ziehen längs des Zahnfleischs, Regler **Krümmung, Rundheit, Größe, Länge/Breite, Rotation**, im offenen Zustand optional größer (Riesenzähne).
- **Farbe:** eine Farbe für alle Zähne mit Verlauf (Wurzel dunkler → Spitze heller), im Shader.
- **Prüfung:** Kollision mit dem Gegenkiefer bei zu, 50 % und auf; Vorschlag „kürzen/neigen“ (aus dem Versuch, 12 Tests).
- **Spiel:** Zähne als Instanzen mit Parametertextur (ein Draw Call für alle Zähne aller Wesen); sie hängen starr an ihrem Kieferknochen.

### 5.4 Augen

Drei Augenarten, alle mit denselben Zuständen (zu/Blinzeln, offen, große Sichel „freuen“, X, Hypno-Spirale, Schlitz):

| Art | Technik | wann |
|---|---|---|
| **gemalt** (Schlitz, Punkt, Sichel, X, Spirale) | Aufkleber im Shader: Form als Abstandsfunktion in einem lokalen Rahmen auf der Haut (Augenpunkt = Griff auf der Fläche, Größe, Drehung); Zustände sind Formen, das Blinzeln ist eine Überblendung | Blobs, Fell-Blobs, Feuer/Gas, Vögel |
| **im Mesh mit Augapfel** (Rex, Drache, Löwe) | Augenlinie auf dem Körper → Inset-Loop mit harter Falte (Brauenwulst, Lidrand als Falte), Augapfel als Kugel in der Höhle; Lid = Blendshape der Lidschleife; Iris/Pupille im Shader auf der Kugel | Raubtiere, Drachen |
| **Glubschauge** | Kugel-Teil auf dem Kopf angedockt (Stiel optional), Pupille und Lid im Shader | Schnecke, Fisch, Cartoon-Blob |

Alle drei sind eine Stufe „Augen“ mit demselben Zustands-Regler; die Zustände sind im Spiel Animationen (Blinzeln, Tod = X, Gefahr/Hypno = Spirale drehend).

## 6. Teile: Beine, Arme, Flügel, Flossen, Schwanz, Hörner, Fühler

- **Ein Teil ist ein kleines Wesen:** eigener Käfig, mit denselben Werkzeugen gebaut (Umriss → aufblasen → Griffe → Pinsel), mit einem **Ansatzring** (8 oder 12 Punkte) und einer **Knochenkette** aus seiner Mittelachse (Gelenke = Ecken der Achse). Teile liegen in der Bibliothek (Rex-Bein, Säulenbein mit Saugnapf-Fuß, Vogel-Stelzbein mit drei Zehen, Spinnen-Knickbein, Rex-Ärmchen, Affenarm, Fledermausflügel-Arm, Flosse, Schwanz dünn/dick, Horn, Fühler, Rüssel, Schlappohr) und sind frei bearbeitbar und erweiterbar.
- **Andocken:** Florian klickt eine Andockstelle auf dem Körper (Fläche + Richtung + Größe, gespeichert in Flächenkoordinaten). Zwei Arten, pro Teil umschaltbar:
  - **verschmolzen:** 2×2 oder 3×3 Käfigflächen werden eingesetzt (Inset) und mit dem Ansatzring verbunden (Bridge) → ein mannigfaltiger Käfig, Catmull-Clark macht die Schulter nahtlos; Weichheit = Abstand des ersten Teil-Rings und Härte der Ansatzkante.
  - **angesteckt:** Teil durchdringt den Körper eine Gelenklänge tief (Stelzbeine, Spinnenbeine, Hörner, Fühler, Glubschauge); kein Topologie-Umbau, sofort.
- **Anzahl und Spiegelung:** 2/4/6/8 Beine = Andockstellen als Reihe entlang der Wirbelsäule, gespiegelt automatisch; „ein Sockel“ (verschmolzene Beinpaare) als Option.
- **Rig und Gewichte:** Knochen aus der Teilachse, Gewichte nach Ringindex (Ansatzringe örtlich, sonst schert der Rumpf wie bei Spore), Hilfsknochen an Knie/Hüfte für Volumen; IK: Säulenbeine analytisch mit Fußsperre, Vögel 3 Segmente, Spinnen FABRIK. Lauf-, Steh- und Atemzyklus im Editor (Demo) und im Spiel.
- **Posen:** Teile sind in jeder Pose bearbeitbar (eigene Deltas je Pose), Flügel falten/spreizen, Beine beugen; Deltas folgen dem Rig korrekt, weil sie auf dem Käfig im Knochenraum gespeichert werden.
- **Draw Calls:** verschmolzene und angesteckte Teile liegen im selben Skinned Mesh wie der Körper (ein Draw Call je Wesen plus Schatten).

## 7. Klingen: Fell, Mähnen, Kämme, Stacheln, Federn, Flossen, Flügelhaut

Übernommen aus der Bilanz (Abschnitt 8) und bestätigt an den Bögen: Fell sind **wenige große, geformte Klingen**, keine Haare. Das Grundelement **Klinge** = geschlossene 2D-Bézier-Form (eigenes Zeichenfeld, wie ein Illustrator-Pinsel) mit Dicke (⇧W), Querschnitt (flach/Linse/rund), Biegung, Drall; gesetzt mit **Pinselarten** auf **Ansatzlinien** (Kurven auf dem Körper): Kunst (eine Klinge über die Linie: Ohr, Schwanzfahne, Finne), Streu (viele: Retriever-Brust, Löwenmähne), Muster (Reihe mit Anfang/Ende: Rückenkamm, Stachelkranz), Fläche (Poisson-Verteilung mit Dichte: Fell-Blob, Gefieder). Kurven entlang der Linie: Größe, Abstand, **Abheben** (0 = nur gemalt, > 0 = gebaut), Neigung/Kämmrichtung, Farbstufe. Optionale **Hülle**: Florian zeichnet den Zielumriss der Mähne in einer Ansicht, die Klingen füllen ihn.

- **Gemalt** (Standard): Jede Klinge schreibt ihren Fußabdruck mit Abstandsfeld und Richtung in die Hauttextur (Abschnitt 8.2); scharfe Ränder, Verlauf dunkel→hell, Fellstrich; folgt Posen ohne Mehrarbeit.
- **Gebaut** (Abheben > 0): deckende Geometrie (6–8 Abschnitte × 2–4 quer), mit dem Körper in **ein** Skinned Mesh verschmolzen, Gewichte von der Haut darunter, Normalen als Mischung Körper/Eigen (Cel-Stufen laufen über die Büschel), Bewegung im Vertex-Shader (Gewicht t², Zufallsphase, Nachschwingen), Reihen in Lamination (Dachziegel ohne Sortieren). Keine Alpha-Karten, keine Shells (iPhone).
- **Flügel/Segel:** Klinge, deren Vorderkante an Fingerknochen hängt; Haut zwischen Fingern als Feld mit Durchhang und Flattern im Vertex-Shader.
- **Je Vorlage:** Retriever (Streu „Flamme“ in Reihen, Ohren als Kunstpinsel), Löwe (Ringlinie ums Gesicht, 2–3 Reihen Zacke), Stacheldrache (Musterpinsel auf Rückenlinie, Fächer am Kopf), Rex-Finne (Kunstpinsel Dreieck), Vogel (Federreihen gemalt, Schwungfedern gebaut, Haube als Streu), Aal (Flossen als Kunstpinsel gezackt).

## 8. Haut und Look: Material, Zonen, Muster, Stile, Feuer, Gas, Fell, Jelly

### 8.1 Earle-Material (immer an)

Regeln aus dem Look-Vertrag (15 Regeln in `docs/plans/2026-10-07-wesen-werkstatt.md` Z. 179–201, Messwerte und Farben in `docs/look/wesen-refs/ZIELSYSTEM.md`): Figurenlicht rechts oben (Azimut 35–45°, Höhe 40°, kameragebunden), drei Wertzonen mit Verlauf in der Stufe und weich gefederten Kanten (5–10 % der Körperhöhe), Schatten als Farbe (OKLab L −0,12…−0,18, 8–15° kühler, nie Grau), Papierkorn 3–6 %, Rim ≈ 0,15 nur zur Lichtseite, **keine Konturen**, Farbfelder stoßen weich-hart aneinander (Federung 1–2 %), Maulkanten pixelscharf, Rachen maroon, cremefarbene Zähne hell zur Spitze, Augen klein mit dunklem Ring, Fell als Flammenbüschel 8–25 % der Körperhöhe, Feuer Gelb → Orange → Rot → Magenta → Violett, Nebel Grün → Türkis.

**Vorhanden und direkt wiederverwendbar** (`packages/render/src/creature2/material/`, TSL auf WebGPU mit WebGL2-Rückfall, unbeleuchtetes Material mit eigenem Figurenlicht): `createCreatureMaterial` mit `stepShade` (Stufen, Federung, Verlauf), OKLab-Farbrollen (`farbRolle`, `STIL_STANDARD`), Rim, Bodenkontakt, Korn und Glimmer, Lippenband/Rachen/Zahnfleisch; `musterMasks` (Streifen mit Pinselspitzen, Ringel, Punkte, Rosetten, Platten, Sechseckschuppen, Flecken, Salamander, Koi) in Wirbelsäulen-Koordinaten; `zonenMaske` (Bauch, Latz, Rückenstreifen, Band, Augenmaske, Socken, Schwanzspitze, je mit Musterbezug); `createJellyMaterial` (Lavalampe, Bodenlappen, Bläschen ohne Kontur, Brechung); Schlitzaugen mit Blinzeln; `createEyeMaterial` (Glubsch-, Schlangen-, Drachen-, Schwarzweißauge) und `createLidMaterial`; `createToothMaterial` mit Verlauf Ansatz → Spitze und `createTongueMaterial`; Hypno-Spirale als `spiralEye` im REX-Material (`packages/render/src/rex/rexMaterial.ts`), zu portieren. Dazu der Stil-Regler-Katalog mit Würfelbereichen (`apps/game/src/lab/wesen/regler.ts`) und die Bögen-Kamera mit IoU-Messung aus dem Wesen-Lab.

**Anpassungen, die der neue Kern leisten muss:** (1) Der Shader erwartet je Vertex 16 Deskriptor-Floats (`eeSpine` s/θ/Umfang/Bauch, `eeRegion` Rachen/Maulkante/Gesicht/Höhle, `eeExtra` AO/Dicke/Kante/Unterlippe, `eePucker`, `eeTeil`); aus dem Käfig entlang der Wirbelsäule fallen s, θ und Umfang direkt ab, Maulkante und Tasche aus der Maul-Topologie, AO wird gebacken. (2) Muster, Zonen und gemalte Augen rechnen in `positionGeometry` (Ruhelage): Posen und Biegen laufen deshalb als Skinning und Morph auf der GPU, oder das Netz führt die Ruhelage als eigenes Attribut mit; sonst schwimmen die Muster. (3) `apps/editor` bekommt `@ee/render` als Abhängigkeit, `installTslFunctionCacheFix` ist Pflicht. (4) Bekannte Fehler beheben: Naht der Musterkoordinaten bei ±π, Sprung am Schwanzansatz, Schlitzaugen-Kante auf `fwidth`, Zahnmaterial über Uniforms statt Neuerzeugung. (5) Für das Brett werden Körper, Zunge, Lider und Augäpfel in **ein** Netz mit Regionsflags verschmolzen (heute bis 8 Draw Calls je Wesen plus 3 im Schattenpass), Zähne bleiben Instanzen.

Der Editor und das Spiel nutzen **denselben** Shader; Bühne mit neutralem, leicht getöntem Grund (umschaltbar Papier/Nacht/Brett) statt des grellen Grüns, das Farben verfälscht.

### 8.2 Zonen als Vektorformen direkt auf dem Körper (Florians Illustrator-Wunsch)

- **Zeichenfläche = die Haut.** Jede Käfigfläche bekommt eine eigene Kachel in einem Textur-Atlas (Ptex-Prinzip: ohne UV-Abwicklung, ohne Nähte; Kacheln mit Rand für Filterung; Htex als Variante geprüft). Das feine Netz erbt (Fläche, u, v). Da die Topologie je Wesen fest ist, folgen alle Felder jeder Pose und jedem Griff automatisch. Die vorhandenen prozeduralen Zonen (`zonenMaske`, höchstens 3, nur Grundformen wie Bauch/Latz/Band) bleiben als schnelle Vorgaben; der Atlas hebt die Grenze „3 Zonen, feste Formen“ auf.
- **Formen zeichnen:** Zeichenstift auf dem Körper in jeder Ansicht; geschlossene Formen (Bauchfeld, Latz, Augenring, Socken, Aal-Linien, Flügelbänder), gespeichert als Kurven in Flächenkoordinaten. Ein Worker rastert sie als **Abstandsfelder** in den Atlas; der Shader macht daraus Kanten **hart, weich oder hart→weich** (Weichheit je Punkt der Form, mit ⇧W wie beim Pinsel). Ergebnis: die Übergänge der Bögen (scharfe Latzkante, weich auslaufende Rückenfarbe).
- **Je Zone:** Farbe (Stufe im Verlauf), Muster (Streifen, Flecken, Rosetten, Sechseckschuppen, Punkte, Fisch-Bänder aus der Werkstatt-Musterbibliothek, prozedural im Shader, mit Skalierung und Richtung entlang der Wirbelsäule) und Glanz/Korn. Dasselbe System gilt für Teile, Klingen und Zähne („alles überall gleich“, wie Blender es konsequent macht).

### 8.3 Stile (eigener Tab „Haut“)

Stilvorlagen als Parametersätze auf dem einen Material: **fest** (Standard, matt, Korn), **Jelly** (Brechung, dunkle Innenblase als Lavalampe, Bläschen ohne Kontur, Glimmer), **Fell** (gemalte Klingenfelder + Fellstrich), **Schuppe/Panzer** (Sechseck-Relief, härtere Stufen), **Feder** (Fahnen-Muster), **Feuer**, **Gas**. Licht (Sonnenwinkel, Stufenzahl, Schattenfarbe) als Welt-Vorgabe, nicht je Wesen.

### 8.4 Fell-Blobs (Bogen `musterTfell…`, fünf Reihen)

Körper = Kugel-Käfig; Fell = Flächen-Pinsel über den ganzen Körper (Klingen „Flamme“ in versetzten Reihen, Größe nach Stufe), **gemalt** auf der Fläche (Abstandsfelder, Fellstrich, dunkel→hell je Büschel) und **gebaut** nur am Umriss (Abheben steigt zum Rand: die Silhouette wird zackig, der Kern bleibt ein Draw Call). Muster (Tiger, Leopard, Dalmatiner, Scheckung) laufen als Zonenfarbe über die Büschel. Augen gemalt. Stufen 1–13 einer Reihe: dieselbe Vorlage, wachsende Größe, Büschelzahl und Musterdichte (Abschnitt 8.8).

### 8.5 Feuer-Wesen (Bogen `substance gas:fire`, untere Reihe)

Der Bogen zeigt: Körper aus einer Flammenform (Zwiebel/Tropfen mit Zungen nach oben), innen helle wellige Bänder, Farbe von Gelb (klein) nach Orange/Rot/Magenta/Violett (groß), außen kleine abgelöste Flämmchen, Beinchen aus Flammen, Augen als dunkle Schlitze. Look-Vertrag R13: „Diese Optik soll **exakt** getroffen werden.“

**Warum die alten Versuche nicht reichen** (Prototyp „Feuer v2“ in `packages/render/src/blob/compileSdf.ts` und `blobShading.ts`, „Gas v2“ ebenda mit Alpha-Dither und Partikeln, `docs/progress/p1b-fire-v2.png`, `p1b-gas-v2.png`): Sie wurden nie gegen den Bogen geprüft (er kam erst am 07.10.), setzen auf SDF-Rauschen in harten Bändern ohne gemalte Flammenformen und waren die teuersten Looks (Raymarch × 36: 23–32 ms). Der Werkstatt-Plan (K6: emissiver Höhenverlauf, gebogene Kegelsegel, Funken-Quads; Nebel mit Fresnel-Ausdünnung und Schwaden-Segeln) wurde nie gebaut. Verwertbar ist die Airbrush-Kante der Welt-Nebelbänke (`packages/render/src/earle/mist/mistBanks.ts`: Korn nur im Saum, wellige Ränder).
- **Körper:** Käfig wie sonst (Tropfen), Material „Feuer“: ein **Flussfeld** (Noise, das in Körperkoordinaten nach oben strömt) wird in 3 Bänder posterisiert (dunkel außen → hell innen), Bandgrenzen leicht gewellt; die Bänder sind die „inneren Zungen“ des Bogens. Keine Transparenz, keine Partikel-Alpha.
- **Zungen:** Klingen „Flamme“ (Musterpinsel auf Scheitel- und Rückenlinie, Kunstpinsel für die große Hauptzunge), im Vertex-Shader gebogen und geweht (Gewicht t², Phase je Klinge, Amplitude nach Stufe), Form posterisiert wie der Körper.
- **Flämmchen:** kleine Instanzen (Tropfen-Käfig, 4–8 je Wesen) auf einer Bahn um den Scheitel: steigen, schrumpfen, Zufallsphase; im Spiel über die Klingen-Instanzliste, kein zusätzlicher Draw Call.
- **Animation:** Strömung + Zungen + Flämmchen laufen aus einer Zeit-Uniform; Fressen-Pose und Beine wie bei jedem Wesen. Elegant heißt: langsam, weich, kein Flackern (Noise mit niedriger Frequenz, Bandgrenzen mit Hysterese).
- **Beweis in Phase 0:** Stufe 7 des Bogens neben dem Render, Standbild und 3-s-Schleife.

### 8.6 Gas-Wesen (obere Reihe)

Wie Feuer, aber: Flussfeld langsamer, Bänder weicher (hart→weich), Farbe Grün → Türkis → Blau, Form rundlicher (Kugel-Käfig, Beinchen als weiche Klingen), außen **Bläschen** statt Flämmchen (kleine Kugeln, die aufsteigen und platzen = Skalierung auf 0), oben Schwaden (Klingen „Wolke“ mit Linsenquerschnitt, weich gebogen). Zustand „Gas“ ist derselbe Shader-Pfad mit anderen Parametern.

### 8.7 Jelly (PezenPez)

Aus der Werkstatt übernommen und perfektioniert: Brechung mit Hintergrundpass (Lichter mit `layers.enableAll()`, Falle bekannt), dunkle Innenblase als Lavalampe (organisch, langsam), weiße Bläschen ohne Kontur, Glimmer oben links, Bodenschatten mit Abstand zum Rand. Schlitzauge gemalt mit Blinzeln. PezenPez ist der Ur-Blob: Alle Grundformen entstehen aus ihm durch Form und Größe. Offen aus der Übergabe vom 09.10.: Jelly ist blasser als Bild 1 (L 189 gegen 219), und das Jelly-Material kennt noch kein Maul, keine Muster und keine Zonen (nötig für Jelly-Wesen mit Hauern, `blobs with big mouth`).

### 8.7a Augen-Zustände (Ergänzung zu 5.4)

Vorhanden: Schlitz mit Blinzeln, vier Augapfel-Typen mit Oberlid, Höhlenring, Spirale im REX-Material. Fehlt: lachende Sichel, X, Splat, Unterlid, Blick. Umsetzung wie in der Recherche vom 12.10. empfohlen: gemalte Abstandsformen (Superellipse, Vesica/Sichel, Mond, abgerundetes X, Ring, Spirale) in einem lokalen Augenrahmen mit einem gemeinsamen Lidkanal; dieselben Formen liegen als Iris/Pupille auf Augäpfeln und Glubschaugen.

### 8.8 Reihen und Varianten (13 Stufen je Familie)

Der Bogen zeigt je Familie 13 Stufen (die 2048-Kacheln 2 … 8192). Im Editor ist eine **Reihe** ein Wesen mit Stufen: Stufe 1 ist der kleine Blob, jede Stufe erbt die vorige (gleicher Käfig, gleiche Topologie) und fügt Größe, Teile, Klingen, Musterdichte hinzu; Zwischenstufen entstehen durch Mischen gleicher Käfige. Mischen über Baupläne hinweg (Giraffenspinne) läuft über Teile-Tausch an Andockstellen. Das alte `packages/genome` (Vererbung) ist Wissen, kein Code dafür.

## 9. Bedienung und UI

Zwischen Florians Figma (vier Felder, Pillen, Blender-Navigation, Illustrator-Kurven, Seitenleiste immer offen) und dem früheren Claude-Entwurf (Stamm, Glas, Lupe, Ranken, Zweig-Regler, Zeitast) liegt die Wahrheit so: **Rahmen klassisch, Interaktion neu.** Alles Innovative passiert am Zeiger und auf dem Körper (Ranken, Lupe, Reifen, Kieferknopf, Fächer); der Rahmen ist ruhig. Es fallen weg: Unteräste mit Zahlen, dreierlei Glas, Hinweistexte im Bild, farbige Eckpunkte an jedem Viewport, der grelle Grün-Verlauf, Irish Grover.

### 9.1 Sieben Grundsätze

1. **Alles ist dieselbe Szene.** Seite, Front, Top und Bühne sind vier Kameras auf einen Körper; Back/Links/Bottom sind dieselbe Kamera gedreht (⌃1/3/7), keine eigenen Fenster. Was man in einem Feld anfasst, bewegt sich sofort in allen; eine Ansicht „formt“ nie die andere.
2. **Griffe statt Regler.** Alles mit Form wird an der Form gezogen (Umriss, Reifen, Kante, Lippe, Zahn, Auge, Beinstrich, Ansatzlinie, Kieferknopf). Regler nur für Mengen und Stärken, höchstens sechs je Stufe.
3. **Zeichnen baut.** Eine Linie auf dem Körper ist ein Auftrag: Maullinie → Schnitt mit Tasche und Kiefer; Beinstrich → Glied mit Knochen; Ansatzlinie → Pinselspur; Farbfeld → Hautzone. Florian zeichnet, der Editor erledigt Topologie, Rig, Gewichte.
4. **Kontext am Zeiger.** Rechtsklick/Long-Press öffnet den **Fächer** (sechs Einträge, abhängig vom Getroffenen); die **Lupe** erscheint beim langsamen Ziehen von selbst. Werkzeuge liegen im Dock, Eigenschaften auf der Tafel; nichts klappt aus, nichts verschiebt sich.
5. **Immer im Look, immer lebendig.** Earle-Material ab der Kugel; Posen jederzeit umschaltbar (Q, Kieferknopf), in jeder Pose alles bearbeitbar; Atmen und Blinzeln auf Wunsch (⇧Space).
6. **Nichts geht verloren.** Undo als Zeitfaden mit Abzweigen, „Variante speichern“ (⌘⇧S) ein Tastendruck, Teile wandern per Drag in die Bibliothek.
7. **Rückmeldung flüstert.** Abweichung, Durchdringung und Budget erscheinen als Lichtsaum, Glut oder eine Zeile am Tafelfuß; nie Dialog, nie Ton, nie Rot über dem ganzen Bild.

**Was daran neu ist** (gegen Blender, Illustrator, Spore, Nomad): Bézier-Umrisse als Live-Griffe auf einem Subdivision-Körper; **Ranken** (Hover über einem Punkt zeigt denselben Punkt in den anderen Ansichten und als Lichtpunkt auf dem Körper, beim Ziehen mit Zahl „+6 px“: „was bewegt sich mit?“ wird gesehen, nicht erraten); **Reifen** (Querschnitte als greifbare Ringe mit Perlen direkt auf dem Körper, ⌃R auf der Haut setzt einen neuen senkrecht zur örtlichen Achse, auch quer zum Hals); **Kieferknopf** (bohnenförmiger Griff am Mundwinkel: ziehen öffnet 0–100 %, Doppelklick rastet; Fressen ist körperlich, kein Tab); **Lupe** in drei Rollen; **Pose-Bearbeitung ohne Modus** (ein Chip zeigt, ob Grundform oder Pose geschrieben wird); **Bogen mit Saum** (Pauspapier hinter dem Blatt, Magnet an seiner Kante, Abweichung als Lichtsaum plus „Δ 1,4 px“).

### 9.2 Layout

Zwei Layouts, mit **Tab** umschaltbar (Feder 0,6 s), je Stufe ein Standard, die letzte Wahl wird je Stufe gemerkt. Maße (CSS-px, Desktop ab 1440 × 900): Stamm 56, Tafel 280 (N blendet sie aus), Kopfzeile 48, Dock 52 (schwebt), Lücken 16, Blätter-Spalte 240–320 (ziehbar). Felder sind runde Papierflächen (Radius 18) auf dunklem Rahmen, Titel als Glaspille **im** Feld.

- **„Riss“** (Standard für Körper): vier gleich große Felder Seite, Front, Top, Bühne. Kopfzeile: Initiale + Name, Posen-Pillen (Ruhe · Fressen · +), Größe, ⌘L, Speichern.
- **„Bühne“** (Standard für alle anderen Stufen): eine große Bühne, links daneben die drei Blätter als Spalte; das erste Blatt darf doppelt hoch sein (Maul: Seite groß). Klick auf einen Blatt-Titel tauscht es mit der Bühne (der Körper bleibt stehen, nur die Rahmen fliegen).
- **Standard je Stufe:** Körper = Riss · Maul = Bühne + Seite groß · Zähne = Bühne (Kamera fliegt ans Maul) + Seite/Front · Augen = Bühne + Seite/Front · Teile = Bühne, ein Teil öffnet sich als **Teil-Werkstatt** (kleiner Riss als Overlay, „Fertig“ kehrt zurück) · Fell & Klingen = Bühne + Klingenblatt (2D-Zeichenfeld der Klinge) · Haut = Bühne, meist orthografisch · Posen & Leben = Bühne · Spiel = Bühne wird Spielbrett, Blätter aus.
- **Kameras wie Blender:** 1 Front, 3 Seite, 7 Top, ⌃ = Gegenseite, 5 ortho ↔ perspektivisch, 0 Spielkamera, Home einpassen, . Auswahl einpassen; die Tasten wirken auf das Feld unter dem Zeiger. Flip-Pille im Blatt-Titel („SEITE ◂▸“). Maximieren ⌃Space oder Doppelklick auf den Titel (bleibt auf seiner Seite, Rest als Miniaturen). Navigation: Rad = Zoom, Mitte = Schieben, Rechts-Ziehen = Drehen, Space = Hand; Trackpad: zwei Finger = Drehen in der Bühne / Schieben im Blatt, ⇧ + zwei Finger = Schieben in der Bühne, Pinch = Zoom, Doppeltipp = einpassen.
- **Tablet (iPad):** quer Stamm links, Blätter als Streifen unter der Bühne (Tipp = tauschen, Pinch = maximieren, Wischen = Front ↔ Back), Tafel als rechtes Sheet 300 pt; hoch Knospen als Reihe über einem Bottom-Sheet mit drei Rasten. Handy im Hinterkopf: ein Feld mit Tabs, vier Werkzeuge, nur Körper/Maul/Zähne/Augen bearbeitbar.

### 9.3 Der Stamm (Stufen)

Senkrechter Stamm links mit neun **Knospen** von oben nach unten, Wurzel ist die Initiale. Keine Äste, keine Zahlen, keine Eckpunkte an Viewports (die Stufe gilt für den ganzen Körper). Knospe Ø 36: hohl = leer, gefüllt = hat Inhalt (Form wird Blatt: Radius 50 % 50 % 50 % 12 %), leuchtender Ring = aktiv; der Stamm ist bis zur letzten gefüllten Knospe hell. Label beim Hover und bei der aktiven Knospe. Springen frei (Klick, ⌘1–9); Reihenfolge wird nahegelegt durch die Tafelzeile „Weiter → Maul“ und ein einmaliges Pulsen der nächsten Knospe. Voraussetzungen werden erklärt, nicht gesperrt („Zuerst eine Maullinie zeichnen“, mit Sprung).

| Nr. | Knospe | Farbe | Inhalt |
|---|---|---|---|
| 1 | Körper | Limette `#C9F23F` | Umriss, Reifen, Kanten, Achse |
| 2 | Maul | Blau `#2E8BFF` | Maullinie, Kiefer, Biss, Tasche |
| 3 | Zähne | Ocker `#D9A441` | verteilen, setzen, Form, Farbe |
| 4 | Augen | Knochen `#F4F1E4` | Art, Zustände |
| 5 | Teile | Orange `#FF7A1A` | Beine, Arme, Flügel, Flossen, Schwanz, Hörner, Fühler, Andockstellen |
| 6 | Fell & Klingen | Türkis `#7CE6D5` | Büschel, Mähnen, Kämme, Stacheln, Federn |
| 7 | Haut | Violett `#B48CFF` | Farbfelder, Muster, Übergang, Material |
| 8 | Posen & Leben | Pink `#FF2E9A` | Fressen, Posen, Atmen, Blinzeln, Gehen |
| 9 | Spiel | Neon `#B8FF2A` | Brettvorschau, Budget |

### 9.4 Werkzeuge, Kürzel, Gesten

**Konfliktregel (einmal festgelegt):** In **Blättern gilt Illustrator** (A/V Direktauswahl, P Stift, + / −, ⌥-Ecke, ⌥-Griff brechen, ⇧W Breite = Härte, Space-Hand, Rechteck, ⇧-Klick, Pfeile 1 pt / ⇧ 10 pt). Auf der **Bühne gilt Blender** (G ziehen weich, I aufblasen, ⇧ halten = glätten, ⌃ halten = umkehren, F Radius, ⇧F Stärke, ⌃R Reifen, E ausstülpen, ⌥Z Röntgen, Z Darstellung, X löschen, H/⌥H verbergen, N Tafel). **Beide einig, beides gilt:** R drehen, S skalieren (Blender-Art mit X/Y/Z-Achse), ⌘Z/⇧⌘Z, Home/⌘0, ⌘A, ⌥A. **Aufgelöste Konflikte:** S = skalieren (Spant wird ⌃R), X = löschen (Röntgen wird ⌥Z), P = Stift (Blender-Pinch fällt), A = Direktauswahl (alle = ⌘A), I = Pipette nur in Haut (sonst aufblasen), Space = Hand (abspielen = ⇧Space). Stufen ⌘1–9, Layout Tab, Pose Q/⇧Q, Bogen ⌥B, Tastenkarte ?, Esc stuft ab (Linie abbrechen → Auswahl-Werkzeug → Auswahl leeren).

**Der Stift P ist die eine Zeichen-Grammatik:** auf einer Kurve = Punkt einfügen, auf einem Punkt = löschen, auf freier Fläche = neue Linie der aktuellen Stufe (Körper: Kante; Maul: Maullinie, nur ab Kontur oder Achse; Fell: Ansatzlinie; Haut: Farbfeld; Teile: Strich mit Radius ⇧W). Enter/Doppelklick beendet, Esc bricht ab. Cursorform und Flüstern zeigen je Stufe, was entsteht.

| Stufe | Dock (höchstens 7) | Direkt auf dem Körper | Fächer |
|---|---|---|---|
| Körper | Auswahl A · Stift P · Ziehen G · Aufblasen I · Reifen ⌃R · Härte ⇧W · Achse W | Umrisspunkte, Reifen-Perlen und -Bänder, Kantenlinien, Radiusring bei F | Glatt · Ecke · Löschen · Reifen hier · Härte · Lupe; auf Haut: Ziehen · Aufblasen · Glätten · Falte · Reifen hier · Achse hier |
| Maul | Auswahl · Stift · Kiefer K (gleich/getrennt) · Öffnen (Kieferknopf) | Maullinie, rote Oberlippe, blaue Unterlippe, schwarzer Mundwinkel, Kieferknopf | gleich · getrennt · Überbiss · Unterbiss · Maul löschen · Lupe |
| Zähne | Auswahl · Setzen T · Verteilen · Form (Tafel) | Zahn gleitet am Zahnfleisch, Spitze = Länge, Seite = Breite | Hauer · Spiegeln aus · kopieren · löschen · Prüfen (Lupe zeigt zu) |
| Augen | Auswahl · Setzen T | Auge gleitet auf der Haut, Rand = Größe, Griff = Blick | Schlitz · Knopf · Glubsch · Zustand ▸ · löschen |
| Teile | Auswahl · Andocken T · Ausstülpen E · Strich P · Bibliothek ⌘L (Drag aufs Wesen) | Andockring = Lage, Ringrand = Weichheit (verschmolzen ↔ angesteckt), Gelenkpunkte | Bein · Arm · Flügel · Flosse · Schwanz · Horn · Bearbeiten (Teil-Werkstatt) · Spiegeln · löschen |
| Fell & Klingen | Auswahl · Ansatzlinie P · Pinsel B (Kunst/Streu/Muster) · Klinge formen · Radius F | Ansatzlinie, einzelne Klingen (Größe, Neigung), Hülle in der Seite | Büschel · Zacke · Stachel · Feder · Flosse · Abheben · Kämmen |
| Haut | Auswahl · Farbfeld P · Eimer K · Pipette I · Übergang ⇧W | Farbfeld-Punkte wie Illustrator, auf der Haut gleitend | Streifen · Flecken · Rosetten · Schuppen · Material ▸ · Farbe |
| Posen & Leben | Pose Q · Neue Pose · alle Werkzeuge der Stufen 1–5 | Kieferknopf, Beine/Flügel je Pose, Achse biegen | kopieren · zurücksetzen · Standard · Atmen · Blinzeln · Gehen |
| Spiel | Spielkamera 0 · Leben ⇧Space · Brettgröße · Budget | nichts bearbeitbar | Nacht · Papier · Brett · Vergleich mit Bogen |

**Fächer:** rund, sechs Knospen um den Zeiger, Mitte zeigt das Getroffene („Punkt 4 · Seite“); Bedienung wie Blenders Pie (halten und wischen = ausführen beim Loslassen; kurzer Klick = offen lassen). Rechts-Ziehen bleibt Drehen: Schwelle 4 px oder 180 ms. Tablet: Long-Press, Pencil-Squeeze.

**Pencil und Finger:** Pencil zeichnet und zieht, Finger navigieren (ein Finger drehen/schieben, zwei zoomen, zwei tippen Undo, drei Redo); Pencil-Doppeltipp = Auswahl ↔ Stift; Hover zeigt Ranken und Lupenring; Druck = Radius/Stärke; „Nur der Pencil zeichnet“ standardmäßig an; Lupe durch Finger-Halten 120 ms.

### 9.5 Tafel und Bibliothek

**Tafel** (Inspektor) immer offen, Inhalt kontextuell: Überschrift = Stufe (in Stufenfarbe), darunter höchstens sechs Felder zur Auswahl, am Fuß „Weiter → …“ und das Flüstern; N blendet sie aus. Ein Reglertyp, der **Zweig-Regler** (Bahn 8 px, Knopf 18 px, Wert in Mono; ⇧ oder Zeiger nach unten = zehnfach feiner); Umschalter als Blockpillen; keine Listen (Kanten, Reifen, Zähne wählt man im Bild, der Chip oben zeigt die Wahl). Beispiele: Körper = Punkt (Glatt · Ecke · Frei), Härte, Radius/Abfall, Spiegeln, Bogen (Deckkraft, Magnet), Grund; Maul = Kiefer, Öffnung, Über-/Unterbiss, Lippenbreite, Öffnungsart; Zähne = Anzahl oben/unten (Stepper), Länge, Schärfe, Neigung, Farbe mit Verlauf, „Mehr“ eingeklappt; Spiel = Dreiecke / Draw Calls / fps als Balken, Brettgröße, Vergleich.

**Bibliothek** verlässt die Tafel: ⌘L oder Klick auf die Initiale öffnet eine Schublade neben dem Stamm (Wesen · Teile · Klingen · Stile · Varianten als Karten mit Initiale und Vorschau); Karten lassen sich auf die Bühne ziehen (Teil andocken, Wesen laden). Tablet: Bottom-Sheet.

### 9.6 Die besonderen Elemente

1. **Initiale:** erster Buchstabe des Wesennamens in Grenze Gotisch auf einer Kachel in der Hauptfarbe des Wesens, der Name in Caprasimo; Wurzel des Stamms, Siegel beim Speichern, Badge auf jeder Bibliothekskarte. Der eine erlaubte gotische Akzent.
2. **Lupe mit Ringtext:** Glaskreis Ø 180 px (Tablet 220 pt), 3-fach, Ringtext in Mono-Versalien. Drei Rollen, eine Form: **Präzision** (erscheint von selbst unter 20 px/s oder beim Finger-Halten; „x 0,140 · y 0,052 · rastet Kante · Höhe → Front“), **Röntgen** (⌥Z halten: Käfig, Reifen, Achse, Knochen, Maultasche; „Reifen 3 · 44 × 16 · Kiefer 52°“), **Prüfung** (in Zähne/Teile: zeigt die Stelle im geschlossenen Maul bzw. in der Extrempose; „Zahn 3 stößt · 2 px“).
3. **Reifen:** Querschnitte als Ringe mit acht Perlen (Abschnitt 4.2 Spanten), Band ziehen = entlang der Achse schieben, Perle ziehen = Querschnitt formen (mit Bézier-Griffen); Front/Back zeigen den gewählten Reifen als Kurve, andere blass; nur in Stufe Körper und im Röntgen sichtbar.
4. **Ranken:** Hover 0,6 s zeigt gestrichelte Kurven zu demselben Punkt in den anderen Blättern und einen Lichtpunkt auf dem Körper; beim Ziehen bleiben sie, mit Zahl am Ziel.
5. **Kieferknopf:** bohnenförmiger Griff am Mundwinkel (ab Stufe Maul), Prozent im Lupenring.

Organische Formen sonst nur als bedienbare Elemente (Knospen, Fächer, Kiesel-Umschalter), keine Dekoration. Zeitfaden im Dock (↶ ··●·· ↷, Hover zeigt die letzten zwölf Schritte als Perlen, Ändern nach Zurück erzeugt einen Zweig) in Phase 6.

### 9.7 Visueller Stil: Earle als Kulisse, Block als Griff, Glas als Schwebendes

- **Earle = Kulisse**, nur im Rahmen: zwei gestaffelte Hügel-Silhouetten in Tinte-Stufen (`#0F171C` über `#141E24`) unter dem Dock und hinter dem Stamm, Nebelbank, 2 % Korn, langsam driftend. Nie hinter dem Wesen.
- **Neobrutalismus = Block** für Tafel, Knöpfe, Knospen, Umschalter, Karten: flache Füllung ohne Rand (Konturregel), harter Versatzschatten `-6px 4px 0 var(--tinte)` in Sonnenrichtung der Bühne (Sonne rechts oben), fette Typo, Radius 8.
- **Liquid Glass = Schwebendes:** Lupe, Fächer, Dock, Blatt-Titel, Chips: `backdrop-filter: blur(18px) saturate(1.6)`, Tönung 12 % Stufenfarbe, Lichtkante oben (ein Reflex, kein Rand), Radius 22, kein Schlagschatten, lichtbrechender Rand per SVG-Verdrängung (`ui/Glasfilter.tsx` vorhanden). Kein Glas auf Glas.
- **Bühne und Blätter:** warm-neutrales Papier `#E3DFD3 → #CFCABD` (Standard) mit hartem Bodenschatten; „Nacht“ `#232C33 → #1A2228`; „Brett“ = echte Spiel-Kachel mit Spiellicht und Spielgröße. Rahmen `#121A20`/`#1A252C`, Text Tinte `#0F171C` / Kreide `#F4F1E4` (nie reines Schwarz/Weiß). Kurven: 3 px Tinte (bei Nacht Kreide), Spiegelhälfte 35 %, Punkt Ø 10 `#00FFE1`, Griff 6-px-Quadrat, Reifen `#8A7CFF`, Achse `#FF5C8A`, Lippen rot `#FF3B5C` / blau `#2E8BFF`, Mundwinkel Tinte; alle Maße zoomunabhängig. Mit dem Grün-Verlauf wird die Farbtreue am Tiger gegengeprüft (Erwartung: Grün verfälscht Ocker und Orange).
- **Schriften:** Caprasimo (Name, große Zahlen; nie Knöpfe), Bricolage Grotesque (Bedienung 13–15 px, Tafelüberschrift 24, Abschnittstitel 11 Versalien), Fragment Mono (Messwerte, Tasten, Ringtext), Grenze Gotisch (nur Initiale). Radien: Glas 22 · Feld 18 · Block 8. **Bewegung** als Federn (`linear()`-Springs aus dem Entwurf): Feder 0,6 s (Auswahl, Pillen), Sanft 0,95 s (Kameraflug, Layout, Tauschen), Wachsen 1,2 s (Knospe, Fächer), Fließen 2,2 s (Nebel, Ranken); `prefers-reduced-motion` → 0,2 s linear. Cursor zustandsabhängig (Stift +/−/Ecke, Reifen, Radiusring).

### 9.8 Rückmeldung und Qualität

| Was | Wie | Nie |
|---|---|---|
| Abweichung vom Bogen | **Saum**: heller Lichtsaum, wo der Umriss > 2 px abweicht; „Δ 1,4 px“ im Blatt-Titel (grün ≤ 2, ocker ≤ 6, sonst pink) | Dialog, roter Bogen |
| Mitbewegung | Ranke mit Zahl beim Ziehen (Widersprüche zwischen Ansichten gibt es nicht mehr) | Hinweistexte „Front folgt“ |
| Durchdringungen (Zähne, Kiefer, Teile, Klingen) | **Glut**: die Stelle glimmt warm auf dem Körper; Zähler am Tafelfuß, Klick fliegt hin und öffnet die Prüf-Lupe | Liste der Dreieckspaare |
| Vorschlag | **Chip** unter dem Flüstern („Zahn 3 stößt · Kürzen · Neigen · Versetzen“), ein Klick wendet an, Undo nimmt zurück | automatisches Ändern |
| Budget | **Waage**: drei Balken (Dreiecke, Draw Calls, fps), winzig am Bühnenfuß, groß in Stufe Spiel; ocker ab 80 %, pink ab 100 % | Prozentzahlen im Bild |
| Topologie | nur im Röntgen (⌥Z) und auf Wunsch Z Zebra/Käfig | dauernde Drahtgitter |
| Speichern | Initiale pulst, Chip „gespeichert 14:21“ | Dialog |
| Flüstern | eine Zeile am Tafelfuß, höchstens 8 Wörter, bleibt bis gelöst, jede Meldung mit Handlung | Toasts |

### 9.9 Onboarding: vom leeren Start zum Blob mit Maul und Augen in fünf Minuten

0:00 Neues Wesen (⌘N): Kugel im Earle-Look auf Papier, Tafel mit Namensfeld und Kacheln „Kugel“ / „Bogen hinlegen“ (PNG-Ablage), Layout Riss · 0:20 Name tippen → Initiale wächst · 0:30 Seite: Scheitel hochziehen → Körper streckt sich örtlich, Radiusring, Ranke zur Front mit „+14 px“, Knospe Körper füllt sich · 0:50 vorderen unteren Punkt ziehen, Griff mit ⌥ brechen → Sack-Form · 1:10 Bühne: ⌃R auf den Bauch, Perlen ziehen → Reifen, Top zeigt den Bauch breiter · 1:30 ⌘2 Maul: Layout wechselt sanft, Kamera fliegt zur Schnauze, Flüstern „Stift: an der Kontur beginnen“ · 1:40 P an der Kontur, zwei Punkte zum Mundwinkel, Enter → Schnitt, Tasche, Kieferknopf · 2:10 Kieferknopf ziehen → Bohne, Rachen, Zunge, Lupenring „Öffnung 62 %“, Doppelklick 100 %, Q zurück · 2:30 ⌘3 Zähne: oben 6, unten 4 → verteilt; ein Zahn glimmt, Chip „Kürzen“ · 3:30 ⌘4 Augen: T auf den Kopf → Auge mit Ring, gespiegelt, Rand = Größe · 4:20 ⇧Space: atmet und blinzelt · 4:40 ⌘S: Initiale pulst, Karte in der Bibliothek, Tafelfuß „Weiter → Teile“. Mit **Bogen**: PNG auf ein Blatt ziehen → Pauspapier (40 %), „Nachzeichnen“ setzt den Umriss (8–12 Punkte, vorhandenes Werkzeug), der Körper wird aufgeblasen, Saum und Δ-Zahl zeigen die Treue.

### 9.10 Risiken des Bedienkonzepts und Tests

| Risiko | Test mit Florian |
|---|---|
| Kürzelkollisionen (S, X, I, Space) | Tastenkarte zeigen, 20 min freies Arbeiten mit Tastenlog; Ziel < 3 Fehlgriffe nach Tag 2; Alternativbelegung bereit (Spant auf S, Skalieren ⇧S) |
| Rechtsklick: Drehen gegen Fächer | Schwelle 4 px / 180 ms; zehnmal abwechselnd drehen und öffnen, Fehlöffnungen = 0 |
| Lupe erscheint ungewollt | Schwelle 20 px/s, 250 ms Verzögerung; Aufgabe „Punkt 1 px versetzen“ |
| Trackpad: zwei Finger drehen (Bühne) gegen schieben (Blatt) | Wechselaufgabe; Rückfall „zwei Finger = schieben überall, ⌥ = drehen“ |
| Reifen verdecken den Körper (Langhals mit 8 Reifen) | Reifen nur in Körper und Röntgen; Lesbarkeit prüfen |
| Neutrale Bühne wirkt „tot“ gegen das alte Grün | Tiger auf Papier, Nacht, Brett und Grün nebeneinander; Farbtreue gegen den Bogen |
| Tafel stiehlt Breite bei 1440 | Tiger-Kopf bei 1440 und 1728; unter 1600 Standard „Bühne“ |
| Pose ohne Modus verwirrt | Chip „Pose: Fressen“ auf Bühne und Tafel; Aufgabe „Rücken in Fressen formen, Ruhe prüfen“ |
| Stift bedeutet je Stufe etwas anderes | Cursorform und Flüstern; Aufgabe über drei Stufen, Fehlzeichnungen zählen |
| Bibliothek nicht mehr in der Tafel | „Bein andocken“: Schublade gegen Tafel-Fach (Zeit, Wege) |

Usability-Aufgaben (laut denken, Zeit, Fehler, Abbrüche, Urteil „so will ich Wesen bauen“): Tiger-Kopf mit Kastenschnauze in 10 min; Rex-Maul mit Überbiss, 6 Außenzähnen, Fressen ohne Glut in 8 min; Langhals mit Maul unter dem Kopf in 6 min; Retriever-Mähne und Ohren in 10 min; Giraffenspinne mit Hauern aus Bibliotheksteilen in 15 min; Blind-Test Kürzel (Tag 1 und 3); Tablet: Tiger-Kopf mit Pencil in 15 min.

### 9.11 Übergang vom Alten

| Element | Florians Figma/Test | Claude-Entwurf | Entscheidung |
|---|---|---|---|
| Stufenwahl | Farbpunkte je Viewport | Stamm mit Ästen und Zahlen | Stamm mit neun Knospen |
| Grund | Grün-Verlauf | Grün + Himmel | Papier, Nacht, Brett; Earle nur im Rahmen |
| Seitenleiste | immer offen, mit Library | Glas-Inspektor | Tafel als Block, immer offen; Bibliothek als Schublade |
| Kurven | 3 px, Ø 10, 6-px-Griffe, Cyan | 2,5 px, Ø 7 | Florians Maße |
| Werkzeuge | Kürzel, kein Dock | Dock mit Zeitleiste | kleines Glas-Dock je Stufe, Zeitfaden klein (Phase 6) |
| Kontextmenü | Glas-Liste | Zweigfächer mit Ästen | Fächer mit sechs Knospen, Blender-Pie |
| Spanten | S1/S2/H-Linien | Kacheln auf der Tafel | Reifen auf dem Körper |
| Fressen | eigener Tab | Pose-Pillen | Kieferknopf + Pose-Pillen + Q |
| Schrift | Irish Grover | Caprasimo/Bricolage/Fragment/Grenze | Claude-Satz |
| Hinweistexte im Bild | – | „Höhe folgt · Front“ | fallen weg; Ranken mit Zahl |

Betroffene Dateien: `apps/editor/src/layout/layout.ts` (Rechtecke für Stamm, Blätter, Bühne, Tafel, beide Layouts, Tablet), `hooks.ts` (Kürzel nach 9.4), `leiste/Seitenleiste.tsx` → Tafel (neu, zerlegt), `styles/tokens.css` (Farben, Schriften, Radien, Schatten, Federn, Papier/Nacht/Brett), `viewports/Steuerung3D.tsx` (Fächer-Schwelle, Reifen- und Kieferknopf-Griffe, Lupe, Trackpad/Pencil).

## 10. Plattform, Pakete, Format, Spiel

- **App oder Browser:** Beides, mit einer Codebasis. Electron (vorhanden) ist die tägliche App (verlässliches WebGPU durch eigenes Chromium, Dateizugriff auf Florians Bibliothek, Fenster/Menüs); der Web-Modus (`editor-web`, Port 5180) ist identisch und erlaubt Tests auf dem iPad. Regel: kein Node im Renderer, alle Rechenkerne als Worker/WASM/WebGPU-Compute. Tauri wäre kleiner, bringt aber WebView-Unterschiede bei WebGPU; nicht nötig.
- **Bestand (Bestandsaufnahme 13.10.):** `packages/shape` hat 1 390 Zeilen Kern und 11 013 Zeilen Versuche (sieben Netztypen, sechs Bauwege, gewählt über eine if-Kaskade in `apps/editor/src/three/Szene3D.tsx` und `?versuch=`-Routing); `apps/editor` hat rund 3 800 Zeilen Gerüst und 4 460 Zeilen Versuchsebenen; keine Worker; kein Picking im 3D; das Spiel importiert `@ee/shape` nicht (Format frei änderbar). Das Earle-Material (`packages/render/src/creature2/material/`: `earleCreature.ts`, `muster.ts`, `eye.ts`, `jelly.ts`, 2 248 Zeilen TSL) existiert und wird im Editor nicht genutzt.
- **Pakete:**
  - `packages/shape` (DOM-frei, nur zod) wird der Rechenkern des neuen Editors; die Versuche (`src/versuch/`) werden nach dem Entscheidungstest entfernt, ihre Kerne vorher herausgelöst:
    - **behalten:** `bezier.ts`, `profil.ts` (Illustrator-Verhalten, formtreues Einfügen/Löschen; bester Code im Paket), `dokument.ts` (zod-Muster, Rundreise-Tests; Schema neu mit `version: 1` und Migration), `kopplung.ts` (Band „am Punkt“), `versuch/v3.ts`, `versuch/dreiecke2d.ts` (CDT), `versuch/aufblasen.ts` (Poisson-FEM/CG, Blatt), `versuch/seitenteile.ts` (`vereinigeNetze`), `versuch/schnittLoft.ts` (nur `surfaceNets`, `taubin`, `netzAusgeben`, Felzenszwalb), `versuch/flaechenlinie.ts` (`strahlRaster`), `versuch/kiefer.ts` (Horn, ARAP, harmonische Fortsetzung, Öffnungsart), `versuch/umriss3d.ts` und `versuch/pruefen.ts` (Prüfstand), `versuch/vorlagen*` (Prüfwesen-JSON), `versuch/zaehne.ts` (Zahnmodell und Prüfung, umgebaut auf die neue Kieferlinie).
    - **Spezifikation, neu bauen:** `versuch/catmullClark.ts` (siehe 4.4).
    - **nur Wissen:** `kaefig.ts`, `tigerKaefig.ts`, `kanten.ts`, `maul.ts`, `maulUmriss.ts`, `wirbelMaul.ts`, `wirbelsaeule.ts` (Leiter und Biegen als Idee), `rundSpanten.ts`, `spanten.ts` (Normierung), `platzhalter/loft.ts`.
    - **neu:** `kaefig/` (Halbkanten auf Typed Arrays, Spiegel, Falten, Loop-Cut, Inset, Bridge, Mannigfaltigkeits-Test), `subdivision/` (Matrix, Grenzflächen-Masken, Compute-Variante), `loeser/` (Griffe → Käfig, Grenzflächen-Interpolation), `flaeche/` (Kurven und Punkte in Flächenkoordinaten), `maul/`, `augen/`, `teile/`, `klingen/`, `rig/` (Gewichte aus Ringindex, Hilfsknochen, IK), `posen/`, `atlas/` (Ptex-Kacheln, Abstandsfelder), `export/`.
  - `packages/render/src/creature2`: Earle-Material erweitern um Zonen-Atlas, Augen-Aufkleber mit Zuständen, Zahn-Instanzen mit Verlauf, Stile Feuer/Gas/Fell, Klingen-Wehen; vom Spiel und Editor geteilt. Die TSL-Fallen aus `CLAUDE.md` (If-Zweige mit `.toVar()`, `hash` negativ, Ebenenlicht) gelten weiter.
  - `apps/editor`: **behalten** `layout/` (Raster, Federn), `viewports/ansicht2d.ts`, `Steuerung3D.tsx` + `three/kamera.ts` (Blender-Navigation mit Trackpad), `three/Renderer3D.ts` (Scissor, Rendern bei Bedarf, `compileAsync`, Schatten), `three/matcap.ts` (Zebra bleibt als Prüfansicht), `electron/`, `library/`, `state/editorStore.ts` (Undo mit Gesten; Schritte bekommen Namen), `hooks.ts`/`aktionen.ts` (Tastatur, Menübrücke), `styles/` (Tokens; Gestaltung wird vom UI-Entwurf abgelöst), `scripts/nachziehen/` (Bogen-Import; später nach TS), `scripts/vergleich.mjs`, E2E-Muster (`window.__stores`, `data-*`, `EE_GPU`, `E2E_PORT`; neu eine gemeinsame Fixture). **Neu:** Bühne mit vier Kameras und Picking (Raycast auf das feine Netz, Rückabbildung auf Käfig und Griff), Werkzeugsystem je Stufe, Inspektor, Bibliothek für Teile. **Weg:** `View2D.tsx` als SVG-Editor mit sieben Versuchsebenen, `Szene3D.tsx`, `Seitenleiste.tsx` (760 Zeilen, eine Datei), die 16 Versuchsfelder im `uiStore`, `maul/`, `kanten/`, `spanten/`, `wirbel/`, `schnitte/`, `rund/`, `versuch/`.
- **Dokument `ee-wesen` v1 (bisher `version: 0` ohne Migration):** speichert Absicht **und** den Käfig (Punkte der rechten Hälfte, Topologie als Halbkanten-Arrays, Härten, Bauplan, Vorlagenstand) plus Kurven in Flächenkoordinaten, Maul (Art, Lippen, Kieferlinie, Gelenk), Zähne, Augen, Teile (Verweis auf Bibliothek + Andockstelle + eigene Deltas), Klingen (Form, Ansatzlinie, Pinsel, Kurven), Zonen und Stil, Posen als Deltas, Reihenstufen. Netz, Gewichte, Atlas und Export werden deterministisch daraus gebaut (Worker). zod verwirft unbekannte Felder (Falle): Schema zuerst, dann Rundreise-Test, dann Migration von v0 (Profile → Käfig über das Aufblasen).
- **Ins Spiel:** Das Brett zeichnet heute die Prototyp-Körper (SDF-Kugeln, eigenes TSL-Skinning in `packages/render/src/creature/CreatureMeshBodies`, UBO an der 16-KB-Grenze); das Werkstatt-SkinnedMesh (`creature2/CreatureMesh.ts`) läuft nur in `/lab/wesen`; Morph-Ziele gibt es nirgends. Weg: ein Skinned Mesh je Editor-Wesen (Körper + Teile + gebaute Klingen) mit Knochen- und Morph-Daten in Datentexturen (eigener TSL-Pfad, weil three r186 Morph-Gewichte je Instanz nur ohne Skinning kennt und `BatchedMesh` pro Instanz zeichnet), 3 Morph-Ziele, Zonen-Atlas, Zähne als Instanzen, Schatten aus demselben Pass; Brett = Stufe 1 (≤ 8 k Dreiecke), Nahansicht = Stufe 2. Erst Einzel-Draw-Calls (36 + Schatten), dann Slot-Arena für „ein Draw Call für alle Körper“ (Teil „Spielfeld“). Messung mit Perf-Badge und `renderer.info` auf dem iPhone 16; WebGL2-Pfad der App mitdenken (kein Compute, UBO-Grenze, Vertex-Texture-Fetch).

## 11. Fahrplan

Reihenfolge nach Risiko: erst beweisen, dann der Kern, dann das, was den Charakter ausmacht (Maul, Teile, Fell, Haut), zuletzt Spiel und Varianten. Jede Phase endet mit Vergleichsbild, Messwerten, Push und einer überschriebenen `docs/UEBERGABE.md` (Arbeitsregel 2). Parallele Baustellen in eigenen Arbeitsbäumen mit Zuständigkeit nach Pfaden (Kern `packages/shape`, Look `packages/render/src/creature2`, Bühne/UI `apps/editor`).

| Phase | Ziel | Umfang (Pfade) | Abnahme |
|---|---|---|---|
| **0 Beweise** (≈ 1 Woche) | fünf Spikes, bevor breit gebaut wird | siehe 11.1 | Kriterien in 11.1 |
| **1 Kern** | ein Körper, viele Griffe; Earle-Look live; alte Bauwege weg | `packages/shape/src/{kaefig,subdivision,loeser,flaeche,atlas}/`, Dokument v1 + Migration, Worker (`packages/shape` DOM-frei, Muster aus `apps/game/src/lab/wesen/buildClient.ts`); `apps/editor/src/{buehne,werkzeuge,stufen,inspektor}/` neu, `three/Renderer3D.ts` um vier Kameras und Picking erweitert, `@ee/render` als Abhängigkeit; Löschen von `View2D.tsx`, `Szene3D.tsx`, `Seitenleiste.tsx`, `maul/ kanten/ spanten/ wirbel/ schnitte/ rund/ versuch/`, `uiStore`-Versuchsfelder, `?versuch=`-Routing; Kerne aus `versuch/` herausgelöst (Abschnitt 10) | Kugel, Rex-Rumpf, Langhals (Hals hoch), Überhang-Ente, Tiger-Kopf mit Kastenschnauze ≤ 1 px in allen Ansichten; Vorschau ≤ 16 ms, Umbau ≤ 100 ms; Florian baut den Tiger-Kopf selbst in ≤ 10 min und sagt „fühlt sich gut an“ |
| **2 Maul, Zähne, Augen** | Abschnitt 5 komplett | `packages/shape/src/{maul,zaehne,augen,posen,rig}/` (Zahnmodell aus `versuch/zaehne.ts`, Kieferrechnung aus `versuch/kiefer.ts`, Werkstatt-Wissen aus `packages/creature/src/mouth/pose.ts`); Look: Lippenband/Rachen/Zunge/Zahnverlauf aus `creature2`, Augen-Zustände neu (8.7a) | 0 Durchdringungen bei 0/25/50/75/100 %; Mäuler vorn, unten, am Hals, ohne Unterkiefer, Rundmaul, W-Lippe; Überbiss am Rex-Bogen; Zähne verteilt und einzeln gesetzt; drei Augenarten mit sechs Zuständen; Fressen-Pose in allen Ansichten bearbeitbar; Vergleichsbilder `rex_mouth_detail`, `different_big mouths`, `dogs_mouth` |
| **3 Teile und Rig** | Abschnitt 6 | `packages/shape/src/{teile,rig}/`, Teil-Bibliothek (Dokumente in `content/creatures/teile/`), Andocken (Inset + Bridge, gesteckt), Gewichte aus Ringindex, IK, Laufdemo (Hüftschwung aus `creature2/CreatureMesh.ts` Z. 586–634) | Rex (Säulenbeine, Ärmchen), Retriever (vier Säulen), Flamingo (Stelzen, drei Zehen), dicke und dünne Spinne (8 Beine), Drachenflügel-Arm neben den Bögen; Zebra ohne Knick an Schultern; Beinschwung ±35° ohne Durchdringung; ein Draw Call je Wesen |
| **4 Klingen und Haut** | Abschnitte 7 und 8 | `packages/shape/src/{klingen,atlas}/`, `creature2/material/` um Atlas-Zonen, Klingenfelder, Feuer, Gas, Fell, Augen-Zustände; Stile-Tab | Retriever (Büschel), Löwe (Mähne), Stacheldrache (Kamm, Flügel), Aal (Flossen, Schuppen), Fell-Blob, Feuer Stufe 7, Gas Stufe 7, PezenPez neben den Bögen; Florian zeichnet eine Bauchzone und einen Augenring selbst |
| **5 Posen, Leben, Spiel** | weitere Posen, Atmen/Blinzeln/Gehen, Export, Brett | `packages/shape/src/export/`, Spiel-Adapter (neue Visual-Art neben `BoardBlobs`, Datentexturen für Knochen und Morphs, Zahn-Instanzen), Brett-Vorschau im Editor, Perf-Badge | 36 Editor-Wesen auf dem iPhone 16 ≥ 58 fps, p99 < 20 ms, ≤ 100 Draw Calls; WebGL2-Pfad läuft |
| **6 Reihen, Varianten, Politur** | 13 Stufen je Familie, Mischen, Tablet | `packages/shape/src/reihen/`, Bibliothek mit Varianten, UI-Feinschliff, Pencil/Touch | Raster aus 12 Varianten einer Familie, Florian wählt; eine Reihe 1–13 des Fell-Blobs |

### 11.1 Phase 0: fünf Beweise mit harten Kriterien

Alle fünf laufen als eigene kleine Prüfseiten im Editor (eine Route je Beweis) mit Skripten für Bilder und Messwerte, damit Florian sie am Mac öffnen kann. Reihenfolge: 1 und 4 zuerst (alles andere hängt daran), dann 2, 3, 5 parallel in Arbeitsbäumen.

1. **Kern-Tempo und Treue:** Vorlagen-Käfig (Röhre 24 Ringe × 16, Kappen) → Halbkanten-Struktur → Matrix-Subdivision Stufe 3 im Worker → Seitenumriss als Griff mit Grenzflächen-Interpolation; Poisson-Einstieg aus `aufblasen.ts`. Kriterium: Kugel und Rex-Seite ≤ 0,5 px, Zugschritt ≤ 5 ms (Käfig) und ≤ 16 ms (fein), Überhang-Ente (`docs/look/editor/07`) ≤ 2 px ohne Sonderregel, Langhals mit stehendem Hals ≤ 2 px.
   **Stand 13.10. nachts: gebaut und gemessen** ([`docs/research/2026-10-13-beweis1-kern.md`](../research/2026-10-13-beweis1-kern.md)): Kugel 0,27 px ✓, Rex 0,70 px ✗ (Spitzen-Ecke), Langhals 1,52 px ✓, Ente 1,14 px ✓ (Seite; Falten am Überhang), Zugschritt 2,6 ms ✓. Bestanden mit zwei offenen Punkten.
2. **Maul mit Haps:** Maullinie an drei Stellen (vorn, unten, Hals) → Längsschleife einrasten, Schlitz, Tasche, Kiefer, Öffnung 100 %. Kriterium: 0 Durchdringungen, Bohne, Umbau ≤ 200 ms, Vergleich mit `rex_mouth_detail` und dem Drachen rechts in `rex_dragon_big mouth`.
3. **Teil nahtlos:** Rex-Säulenbein aus einem Teil-Dokument, verschmolzen (Inset + Bridge) und angesteckt, Beinschwung ±35°. Kriterium: Zebra ohne Knick über die Hüfte, keine Durchdringung, Umbau ≤ 200 ms.
4. **Look live:** `createCreatureMaterial` auf dem neuen Netz mit Deskriptoren aus dem Käfig, Zonen-Atlas mit einem harten Bauchfeld und einem weich auslaufenden Rückenfeld, Tiger-Streifen, gemaltes Auge mit Blinzeln, Zahnverlauf. Kriterium: Vergleichsbild Tiger-Kopf neben `raubkatzen…`, Florians Urteil; keine Muster, die beim Ziehen schwimmen.
5. **Feuer, Gas, Fell-Blob:** je Stufe 7 des Bogens als Standbild und 3-s-Schleife auf einer Kugel-Vorlage (ohne Maul). Kriterium: Florians Urteil „so geht es weiter“ für mindestens zwei von drei; der dritte bekommt eine zweite Runde mit konkreter Liste.

Scheitert Beweis 1 oder 2, wird der Kern nicht breit gebaut, sondern der Rückfall aus Abschnitt 13 geprüft (Griffe ohne Löser bzw. Maul-Topologie als Vorlage je Maulart).

## 12. Verifikation

- **Unit-Tests (vitest, `packages/shape`)** je Operation: Loop-Cut, Inset, Bridge, Spiegel, Matrix-Subdivision gegen die alte Objekt-Implementierung (`versuch/catmullClark.ts` als Orakel, gleiche Ergebnisse auf 1e-9), Löser, Flächenkoordinaten (Rundreise Kurve ↔ Fläche), Maul-Umbau, Zähne (die 12 Tests aus `zaehne.ts` übernehmen), Export; immer mit Mannigfaltigkeits-Test (`versuch/pruefen.ts`: `orientiertGeschlossen`, `selbstDurchdringungen`) und Determinismus (gleiche Eingabe → bitgleiches Netz).
- **Formtreue:** Umrisse je Ansicht mit `versuch/umriss3d.ts` und `apps/editor/src/rund/umrissMessen.ts` (px bei 461 px je Kachel); Silhouetten-IoU gegen die Bögen mit `scripts/wesen/iou.mjs` und `messen.mjs` (Ziel ≥ 0,90); Prüfwesen aus `versuch/vorlagen/*.json` und neu nachgezogene aus `apps/editor/scripts/nachziehen/`.
- **Sauberkeit:** Durchdringungstest bei Maul 0/25/50/75/100 %, in Ruhe- und Laufpose, mit allen Teilen und gebauten Klingen; Zahnprüfung zu/50 %/auf.
- **Tempo:** Zeitmessung je Zugschritt und je Umbau in den Tests (Schranken großzügig, weil Tests parallel laufen; Falle bekannt) und live im Perf-Badge des Editors.
- **E2E (Playwright, echte GPU `EE_GPU=1`, `E2E_PORT=5191`):** Bühne mit vier Kameras, Werkzeuge je Stufe, Posen-Wechsel, Bibliothek; gemeinsame Fixture statt je Spec eigener Helfer; Bilder nach `docs/progress/editor/`; der Editor-E2E-Lauf kommt in die wöchentliche CI (heute nur das Spiel).
- **Vergleichsbilder:** je Meilenstein Bogen | Render mit der Bögen-Kamera aus dem Wesen-Lab (weißer Grund, Licht rechts oben, Dreiviertel von rechts vorn), Montage wie `scripts/vergleich.mjs`; Feuer/Gas zusätzlich als 3-s-Schleife (Video oder Bildfolge).
- **Spiel:** Export eines Prüfwesens, 36 Instanzen auf dem Brett, Draw Calls über `renderer.info` (Median/Max über 10 Bilder nach Warmup), fps und p99 mit dem Perf-Badge; iPhone-Deploy nach `docs/IOS.md` am Ende jedes Blocks, der das Spiel berührt; WebGL2-Pfad (`?backend=webgl`) mitprüfen.
- **Usability mit Florian** je Phase, mit Zeit und Urteil protokolliert: „Tiger-Kopf mit Kastenschnauze in 10 min“, „Rex-Maul mit Überbiss und 14 Zähnen in 10 min“, „Retriever-Mähne in 10 min“, „neues Wesen mit Maul, Zähnen, Beinen und Kamm in 30 min“.

## 13. Risiken und Rückfalllinien

| Risiko | Vorbeugung | Rückfall |
|---|---|---|
| Griff-Löser fühlt sich „schwammig“ oder zieht zu weit | Band-Abfall einstellbar, Kopplung nur am entsprechenden Punkt (bewährt), Lupe | Griffe bewegen Käfigpunkte direkt (ohne Löser), Grenzflächen-Korrektur bleibt |
| Umverteilen der Ringpunkte verzerrt das Netz bei steil laufenden Linien (Lippe, die den Hals hinabläuft) | Verdichtung durch Loop-Cuts quer und längs, Umverteilung mit Glättung über Nachbarringe; Anzeige der Netzqualität (Zebra, Netzfluss) | Maul-Topologie als eigene Vorlage je Maulart (vorn, unten, Hals, Rundmaul), ausgewählt statt frei gezeichnet |
| Verschmolzene Teile verziehen die Rumpfringe bei schrägem Ansatz | Andockflächen gleiten entlang der Ringe; Kehlen-Valenz 5 bewusst gesetzt | Teil angesteckt + gemalter Übergang (Zone mit weicher Kante) |
| Zonen-Atlas zu groß fürs iPhone | Kacheln 16–32 px, Abstandsfelder statt Farbe, Kanäle gepackt | Zonen als wenige analytische Formen im Shader |
| Feuer/Gas sehen „shaderig“ statt gemalt aus | Posterisierung mit gewellten Bandgrenzen, Korn, langsame Bewegung; Abgleich am Bogen in Phase 0 | Flammen als gezeichnete Klingen ohne Noise, nur Vertex-Wehen |
| Tempo bei Stufe 3 im Editor | Matrix im Worker, Compute-Pfad | Stufe 2 im Editor, Stufe 3 nur beim Loslassen |
| Zu viele Werkzeuge wieder | Phase 0 und 1 mit minimaler Oberfläche; Usability-Aufgaben mit Florian | Werkzeuge hinter dem Pie-Menü, Stufen reduzieren |

## 14. Entscheidungen, die ich getroffen habe (und die Florian kippen kann)

| Entscheidung | Warum | Alternative |
|---|---|---|
| 3D-Körper als Wahrheit, Kurven als Griffe | sechs Ableitungen scheiterten an Widersprüchen; Blender-Gewohnheit; Griffe behalten die Shape-Bedienung | nur Shapes (Grenze bewiesen) oder nur Sculpt (langsamer als Griffe für Umrisse) |
| Eine Szene, vier Kameras statt SVG-Editoren | Look in jeder Ansicht, keine Doppelimplementierung, Abweichung sofort sichtbar | SVG-Ansichten behalten (schnell, aber weiß und doppelt) |
| Catmull-Clark im Eigenbau (Matrix + Compute) | keine JS-Bibliothek mit Falten; Falten sind der Kern der Kanten | `opensubdiv-wasm` ohne Falten |
| Teile als eigene Käfige aus der Bibliothek, Andocken verschmolzen/gesteckt | Florians Wunsch nach Wiederverwendung; nahtlos durch Bridge + Subdivision | Ausstülpen aus dem Rumpf-Käfig von Hand (wie Blender) |
| Fell als Klingen, meist gemalt | Bögen zeigen große Büschel; iPhone-Budget; frühere Schalen „schuppig“ | Shells/Fins (verworfen) |
| Zonen als Vektorformen im Ptex-Atlas | Florians Illustrator-Wunsch, überall gleich, folgt Posen | nur prozedurale Zonen (max. 3, feste Formen) |
| Electron + Browser mit einer Codebasis | verlässliches WebGPU, Dateizugriff; iPad über den Web-Modus | Tauri (WebView-Unsicherheit bei WebGPU) |
| Phase 0 vor dem breiten Bau | Arbeitsregel 1: erst beweisen; die Bilanz verlangt einen Entscheidungstest | sofort breit bauen (Risiko wie bisher) |

Fragen an Florian vor der Freigabe: Reihenfolge der Prüfwesen, Bogen-Import als Teil von Phase 1, Umfang der ersten Teil-Bibliothek, Zeitfenster für seine Usability-Runden (er testet live; Arbeitsregel 4).

## 15. Quellen (Auswahl)

- Dupuy, Vanhoey: A Halfedge Refinement Rule for Parallel Catmull-Clark Subdivision (HPG 2021), Code public domain/MIT mit halbscharfen Falten und GLSL-Port: https://github.com/jdupuy/HalfedgeCatmullClark
- Halstead, Kass, DeRose: Efficient, Fair Interpolation using Catmull-Clark Surfaces (SIGGRAPH 1993): https://graphics.pixar.com/library/FairSubdivision/paper.pdf
- Nealen u. a.: FiberMesh (2007) und A Sketch-Based Interface for Detail-Preserving Mesh Editing (2005): https://igl.ethz.ch/projects/FiberMesh/fibermesh.pdf
- Dvorožňák u. a.: Monster Mash (2020), Apache-2.0, Emscripten-Build: https://github.com/google/monster-mash
- Burley, Lacewell: Ptex (2008); Dupuy u. a.: Htex per-halfedge texturing (2022): https://arxiv.org/abs/2207.05618
- `@nasedkinpv/opensubdiv-wasm` (OpenSubdiv für three.js, 209 KB): https://github.com/nasedkinpv/opensubdiv-wasm
- Hecker: My Liner Notes for Spore; Real-time Motion Retargeting (SIGGRAPH 2008): https://www.chrishecker.com/My_Liner_Notes_for_Spore
- McGuire, Fein: Real-time Rendering of Cartoon Smoke and Clouds (2006): https://faculty.digipen.edu/~gherron/references/References/NPR/mf-2006-toonsmoke.pdf
- Media Molecule Dreams, Rendering-Doku (Flecks, Hulls/Fluff): https://tapgiles.com/docs/rendering.html
- Recherchen des Projekts: `ref/editor/uebergabe/00-bilanz-grosse-sitzung.md` (Abschnitte 7–9, 14), `02-schnitte-ueberhaenge.md` (40 Quellen), `docs/research/*.md`
