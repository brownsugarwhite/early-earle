# Maul, Kiefer, Zähne, Rig und Augen: Recherche, Versuche, Vorbereitung der Fable-Sitzung

## Kontext

Florian (12.10.) beschreibt seinen Ablauf für den Wesen-Editor:
1. Körper aus Silhouetten plus Kanten (3 px = ganz hart, dünner = weicher).
2. Maul-Tab (blauer Punkt): Start an der Spiegelachse (Front/Top) bzw. an der Außenkontur (Seite), Maullinie bis zum Mundwinkel, bearbeitbar wie gewohnt.
3. Kiefer: Schon im geschlossenen Zustand, direkt nach dem ersten Einbau des Maulschlitzes, wählt er „gleich“ oder „getrennt“.
   - Getrennt heißt: Oberkiefer (rot) und Unterkiefer (blau) sind leicht geöffnet und einzeln bearbeitbar.
   - Damit stellt er Überbiss, Unterbiss und Lippenbreite ein. So entsteht Platz für die Zähne, und sie stoßen nicht durch die Kiefer.
4. Das Maul wird automatisch perfekt ins Netz geschnitten. Die Maultasche ist schon geschlossen so angelegt, dass sie optimal in den offenen Zustand morpht. Die Zähne liegen immer richtig.
5. Zahn-Tab (braun): Anzahl je Kiefer, symmetrisch gesetzt, einzeln wählbar und verschiebbar. Rechts ein Zahnmenü (Rundheit, Schärfe, Neigung).
   - Riesige Zähne können im geschlossenen Maul stören. Sie lassen sich deshalb im offenen Zustand größer machen und nachjustieren (Nachtrag Florian, 12.10.).

**Nachtrag 12.10. zur Oberfläche:** Die Seitenleiste rechts ist immer offen. Darin liegen Library, Wesen-Einstellungen usw.

Dazu kommen:
- ein Rig-Tab in allen Viewports (Kieferknochen zu/auf)
- ein besserer Augen-Aufbau, eventuell als eigener Tab; das kleine Schlitzauge bleibt
- später Beine, Flügel, Schuppen, Muster und Shading

Ziele:
- Die Wesen bleiben dynamisch, Beine und Animationen funktionieren je Typ gleich.
- Aus etwa zehn Figuren erzeuge ich später selbstständig Varianten im Look, bis zur „Giraffenspinne mit Rüssel, Drachenflügeln und Hauern“.

Auftrag:
- intensiv recherchieren und testen, ähnliche Techniken suchen
- Schwächen und Denkfehler benennen, Verbesserungen vorschlagen
- Funktionen gern schon testweise einbauen
- möglichst viel Wissen für die große Sitzung ab Dienstag (13.10.) sammeln

**Vorlagen:**
- Neue Bögen in `~/Desktop/2048/editorRefs`: `wesen mit mäulern.png` (Langhals, Robbe, Drachen-Reihe), `maulDetail.png` (Legende rot/blau/schwarz/türkis), `rex_body with maul.png` (Rex top/seite/front, zu mit Überbiss, auf)
- 19 Bögen (Kopien in `docs/look/wesen-refs/`): Bild 1/18 Schlitzaugen, 5/7/11/14 Zähne und offene Mäuler, 10 Augenarten, 19 Stacheldrachen/Elefanten

**Was es schon gibt:**
- Editor mit gekoppelten Profilen und Illustrator-Werkzeugen
- Versuch Tiger-Käfig (Catmull-Clark mit verjüngten Kanten, Anpassung an die Silhouetten)
- Die alte Wesen-Werkstatt (`packages/creature`) hat ein erprobtes Maul. Das übernehmen wir als Wissen, nicht als Code:
  - Lippenschnitt mit doppelten Kantenpunkten
  - Maultasche aus Reihen
  - Reißverschluss-Reihe bei ungleichen Kiefern
  - Schädelkippung samt Augen
  - Zähne längs der Lippe
  - gemaltes Schlitzauge, dazu Florians Urteile

## Erste Einschätzung (wird im Bericht belegt)

Der Ablauf passt, und er entspricht dem Aufbau von Maul-Rigs in Film und Spiel. Zwei Punkte sind geometrisch richtig:
- Startpunkt an Achse bzw. Kontur: Beides ist derselbe Punkt auf der Mittelebene.
- Linienbreite = Kantenhärte: entspricht Illustrators Breitenwerkzeug ⇧W.

Schwächen und Denkfehler, die die Versuche prüfen:

1. **Eine Linie, drei Ansichten.** In deinen Bögen hat jede Lippenlinie in Seite und Front gleich viele Punkte in gleicher Höhe (Rex: rot 364/386/413/434 bzw. 364/379/405/429). Das ist bereits eine 3D-Linie.
   - Vorschlag: jeder Punkt ist ein 3D-Punkt, jede Ansicht bearbeitet zwei seiner Koordinaten (Seite x/y, Front z/y, Top x/z).
   - Die gemeinsame Koordinate ist gekoppelt wie bei den Profilen, die Linie erscheint automatisch in allen Ansichten.
   - Neu gesetzte Punkte rasten zuerst auf der Fläche ein (wie Blenders „Face Project“).
   - Das Netz passt sich danach an die Linie an, nicht umgekehrt.
   - Ohne Kopplung widersprechen sich die Ansichten (Mundwinkel in der Seite höher als in der Front).
2. **Linien und Knochen dürfen sich nicht widersprechen.**
   - Knochen bestimmen die Bewegung (Gelenk, Winkel).
   - Die Linien sind die Feinform, gespeichert relativ zum Kiefer. Daraus wird automatisch der Korrektur-Blendshape.
   - Das Gelenk wird beim ersten Öffnen aus „zu“ und „auf“ vorgeschlagen.
3. **Zwei Öffnungsarten.**
   - *Kippen* (Rex, Schnabel) braucht Knochen. Ein reiner Blendshape schrumpft den Kiefer um 29 % bei 90°.
   - *Ziehen* (Robbe: Vorhang bis zum Boden; Langhals und Stacheldrache: Reißverschluss den Hals hinab) braucht Blendshapes. Ein Knochen würde hier durch den Körper fahren.
   - Die meisten Mäuler mischen beides. Erkennbar ist der Anteil am Restfehler der starren Anpassung.
4. **Zähne: eine Grundlage, im offenen Zustand nachjustierbar (wie von dir vorgeschlagen).**
   - Jeder Zahn hängt an einer Stelle des Zahnfleischs und folgt so Knochen und Korrektur in jedem Zustand.
   - Im offenen Zustand kann er größer, länger, anders geneigt oder leicht versetzt sein. Beim Öffnen wächst er stufenlos hinein, ein bewährter Trickfilm-Kniff.
   - Eine Kollisionsprüfung im geschlossenen Zustand zeigt, welche Zähne stören. Lösungen: getrennte Kiefer (mehr Platz), Zahn außen über der Lippe (Bild 7, Rex-Bogen) oder geschlossen kleiner und offen groß.
   - Risiko: Versetzt man einen Zahn im offenen Zustand weit, rutscht er beim Öffnen sichtbar am Kiefer entlang. Der Versatz sollte deshalb klein bleiben.
5. **Kiefer gleich/getrennt schon im geschlossenen Zustand (Überbiss, Unterbiss, Lippenbreite).**
   - Das schafft den Platz für die Zähne.
   - Technisch muss die verdeckte Lippe nach innen, sonst durchdringen sich die Kiefer.
   - Die Haut zwischen den beiden Rändern wird zur Reißverschluss-Reihe (das hat die alte Werkstatt gelöst).
6. **Riesenmäuler** (Robbe, Langhals, Stacheldrache):
   - Die Tasche ist so groß wie die Brust und liegt geschlossen gefaltet im Körper.
   - Die Lippen dehnen sich bis etwa 3×. Die Mundwinkel brauchen genug Netz.
7. **Lange Hälse.** Der heutige Röhrenkäfig mit Ringen entlang x kann keinen Kopf über einem senkrechten Hals bilden.
   - Abhilfe: eine Wirbelsäule aus der Mittelachse der Seitenansicht.
   - Sie ist zugleich die Knochenkette fürs Rig.
8. **Augen sind kleine Mäuler.**
   - Lidlinie oben/unten, Winkel, Blinzeln = geschlossen, Augapfel innen: das ist derselbe Mechanismus wie beim Maul, deshalb ein eigener Tab.
   - Das Schlitzauge bleibt als gemalte Form; Ausdrucksaugen wie Sichel, Spirale und X werden Aufkleber.
9. **Dynamik und Varianten.**
   - Das Dokument speichert nur Absicht (Linien, Werte, Anker auf der Fläche). Netz, Knochen, Gewichte und Blendshapes werden immer neu gebaut.
   - Damit ist die Reihenfolge der Tabs egal, und Beine kommen später ohne Neuanfang dazu.
   - Eine feste Grundtopologie und Anker erlauben Mischen, Übertragen (Rex-Maul auf Robbe) und Mutieren.
   - Animation je Typ läuft wie bei Spore: benannte Zustände (Maul auf/zu, Blinzeln) plus prozedurale Beine.

## Entscheidung der Fragerunde (12.10.)

- **Umfang: Maul und Zähne klickbar.**
  - Der Rig-Punkt zeigt das vorgeschlagene Gelenk, die Seitenleiste hat den Regler „Öffnung“ 0–100 %.
  - Rig-Tab und Augen-Tab bleiben Versuch bzw. Recherche. Die Fable-Sitzung baut alles endgültig.
- **Nachtrag Florian (12.10.):**
  - Kiefer gleich/getrennt wählt er schon im geschlossenen Zustand. Das ergibt Überbiss, Unterbiss und Lippenbreite und damit Platz für die Zähne.
  - Riesige Zähne macht er im offenen Zustand größer und justiert sie dort.
  - Die Seitenleiste rechts ist immer offen und enthält Library, Wesen-Einstellungen usw.

## Arbeitspakete

Branch `claude/editor-grundlayout`. Nach jedem Schritt committen und pushen.

### A. Sichern (zuerst, eigener Commit)
- Florians drei Bögen nach `docs/look/editor/`:
  - `04-wesen-mit-maeulern.png`
  - `05-maul-detail.png`
  - `06-rex-mit-maul.png`
  - Beschreibung in `docs/look/editor/README.md`
- Diesen Plan nach `docs/plans/2026-10-12-maul-zaehne-rig.md` legen.
- Gedächtnis `feedback-florian-editor-neu.md` um einen Nachtrag vom 12.10. ergänzen:
  - Ablauf 1–5
  - Kiefer gleich/getrennt schon im geschlossenen Zustand; Riesenzähne offen größer und justierbar
  - Seitenleiste rechts immer offen (Library, Wesen-Einstellungen usw.)
  - Tab-Farben: blau = Maul, braun = Zähne, Rig-Punkt in allen Viewports
  - Augen als eigener Tab erwogen, Schlitzauge bleibt
  - Reihenfolge danach: Bein → Flügel → Schuppen → Muster/Shading
  - Varianten-Ziel
  - Ordner `~/Desktop/2048/referenzen` von ihm genannt (Kopien liegen in `docs/look/wesen-refs/`)

### B. Recherche (4 Hintergrund-Agenten, Web, parallel)

Jeder liefert einen deutschen Abschnitt mit Quellen und „Was heißt das für uns“. Zusammengeführt wird in `docs/research/2026-10-12-maul-kiefer-zaehne-augen.md`.

- **B1 Maul und Kiefer in Film- und Spiel-Rigs:**
  - Maultaschen-Topologie
  - Lip-Zipper und Sticky Lips (Blender Studio)
  - Lage des Kiefergelenks, Korrektur-Shapes (Pose Space Deformation)
  - Zerlegung aus Beispielen in Knochen und Blendshapes (SSDR)
  - ARKit/FACS (jawOpen + mouthClose), MetaHuman
  - OmniFaceRig (06/2026): Mundraum, Zähne und Zunge automatisch aus Vorlagen, kollisionsfrei nachgeführt
- **B2 Werkzeuge mit ähnlichem Ansatz:**
  - Spore: Rigblocks, benannter Clip „OpenClose“ für jedes Maul
  - Monster Mash, RigMesh, Teddy/FiberMesh
  - Gravity Sketch (SubD)
  - Maya „Curve on Surface“; Blender Snap, Shrinkwrap und Quad Draw
  - Infinigen-Kreaturen
  - Skelett aus der Silhouette (Mittelachse, Pinocchio), automatische Gewichte (Bone Heat)
- **B3 Augen:**
  - Textur- bzw. Aufkleberaugen (Animal Crossing, Splatoon)
  - Augapfel mit Lid-Rig, Lid folgt dem Blick
  - Schlitzpupillen, Blinzeln als Morph, Ausdrucksaugen
  - Augen auf sehr verschiedenen Köpfen
- **B4 Dynamik und Varianten:**
  - Retargeting nach Spore (Hecker 2008), No Man's Sky, Impossible Creatures, Infinigen
  - AnyTop (2025, Bewegung für beliebige Skelette)
  - prozedurale Gangarten mit IK
  - Teile-Synthese aus Beispielen, Formraum mit Korrespondenz
  - LLM-Erzeugung im eigenen Format mit Qualitätsprüfung

### C. Nachziehen: Rex, Robbe, Langhals (1 Hintergrund-Agent, nur `apps/editor/scripts/nachziehen/**` und `apps/editor/public/versuch/{rex,robbe,langhals}/**`)
- **Werkzeug:** Die Tiger-Pipeline (`apps/editor/scripts/tiger/`: `kontur.py`, `fit.py`, `export.py`) wird verallgemeinert. Die bisher nicht gesicherten Schritte 1–2 kommen dazu: BMP lesen, Außenraum füllen.
- **Je Wesen:**
  - Profile „zu“: Seite, Front, Top
  - Profile „auf“: Seite, Front
  - Lippenlinien je Ansicht und Zustand: türkis, rot, blau, schwarzer Winkel. Florians Punkte werden die Knoten, er hat sie von Hand gesetzt.
  - Augenumrisse
- **Prüfung:** gleicher Maßstab je Wesen. Die gemeinsamen Ausdehnungen der Ansichten stimmen auf 2 % überein. Die Höhen gleicher Lippenpunkte in Seite und Front werden gemessen; das belegt das 3D-Punkt-Modell.

### D. Technik-Versuche (`packages/shape/src/versuch/`, mit Vitest und Bildern)
- **D1 3D-Linie:**
  - Knoten in 3D, Ansicht bearbeitet zwei Koordinaten, Startknoten auf der Mittelebene bzw. Kontur, neue Knoten rasten auf der Fläche ein.
  - Projektion in alle Ansichten.
  - Konsistenzmaß zwischen Seite und Front.
- **D2 Maul im Netz:**
  - Schlitz, Lippenschleifen und Maultasche im Röhrenkäfig mit fester Punktzahl; die Topologie ist für zu und auf gleich.
  - Der Schlitz läuft über die Ringpunkte j = 4/12 von Ring 1 bis zum Winkelring und über die mittlere Zeile der 4×4-Kappe.
  - Jeder Ring wird so neu verteilt, dass seine Schlitzpunkte genau auf der Linie liegen (oberer und unterer Bogen je 8 Abschnitte). So entsteht keine Zickzack-Kante.
  - Die Tasche entsteht aus Reihen: Oberrand → Gaumen → Rachen → Boden → Unterrand. Die Lippenkante wird scharf.
  - Angepasst wird je Zustand an Silhouetten und Lippenlinien. Geschlossen darf nichts durchdringen.
  - Die Algorithmen prüft ein Planungs-Agent gegen; seine Hinweise fließen vor D2 ein.
- **D3 Kiefer = Knochen + Korrektur:**
  - starre Anpassung je Kiefer, Gelenkachse, Gewichte, Rest als Korrektur-Blendshape
  - Zwischenstufen Knochen+Korrektur gegen linear
  - Öffnungsart (Kippen/Ziehen) aus dem Restfehler
- **D4 Zähne:**
  - parametrischer Zahn (Länge, Breite, Rundheit, Schärfe, Neigung, Biegung, außen)
  - symmetrisch nach Anzahl je Kiefer
  - am Zahnfleisch befestigt, folgt Knochen und Korrektur
  - im offenen Zustand eigene Werte (größer, Neigung, kleiner Versatz), stufenlos überblendet
  - Kollisionsprüfung im geschlossenen Zustand mit Vorschlag
  - Rex-Fänge: geschlossen getrennte Kiefer bzw. außen, offen groß
- **D5 Augen als kleine Mäuler:**
  - Lidöffnung mit Lidlinien und Winkeln, Augapfel; Blinzeln = Zustand „zu“
  - Arten: Schlitz (gemalt, bleibt), Knopf, Kugel, Mandel mit Lid, Ausdruck als Aufkleber
  - Bilder an Rex und Robbe
- **D6 Wirbelsäulen-Röhre:**
  - Mittelachse der Seitensilhouette ergibt die Wirbelsäule; Ringe stehen senkrecht dazu. Damit geht der Langhals mit Kopf über dem Hals.
  - Die Wirbelsäule ist zugleich die Knochenkette.
- **D7 Varianten (kleiner Beweis):**
  - Käfige gleicher Topologie mischen
  - Teile übertragen (Rex-Maul und Zähne auf die Robbe)
  - mutieren
  - Raster aus etwa 12 Varianten

### E. Bedien-Versuch im Editor (gewählt: Maul + Zähne klickbar)
- **Seitenleiste rechts immer offen** (Florian 12.10.):
  - Glasleiste, Breite etwa 360 px.
  - Oben ein Bereich, der zum aktiven Tab passt:
    - Form = Wesen-Einstellungen (Name, Größe, Posen)
    - Maul = gleich/getrennt, Öffnungsart, Regler „Öffnung“
    - Zähne = Zahnmenü
    - Rig = Gelenk
  - Darunter die Library mit Kategorien und Karten.
  - Der Knopf „Library“ und ⌘L springen zur Library.
- **Layout und Tests:** `berechneLayout` rechnet die Leiste fest ein.
  - Beim Maximieren wird das Quadrat so groß wie möglich. Die Spalte der drei kleinen Viewports bleibt mindestens etwa 240 px breit. Weil die Leiste Platz nimmt, ist das Quadrat dort nicht mehr ganz so hoch wie die volle Höhe.
  - Die Federanimation der Library entfällt.
  - Die betroffenen Layout- und E2E-Tests (Library auf/zu, Viewports schmaler, Maximieren) werden angepasst; der Rest bleibt grün.
- **Eckpunkte als Tabs:**
  - braun = Zähne, blau = Maul (2D-Ansichten)
  - neu: Rig-Punkt in allen 4 Viewports (vorläufig orange)
  - Augen-Punkt nur als Platzhalter (vorläufig weiß, Hinweis „folgt“)
  - Aktiver Tab ist hervorgehoben; Esc oder ein zweiter Klick führt zurück zur Form.
  - Neuer Zustand `ebene` in `uiStore`.
- **Dokument:**
  - Optionale Felder `maul`, `zaehne` und Pose-Daten für „fressen“ (offene Profile und Lippenlinien, gleiche Punktstruktur) in `packages/shape/src/dokument.ts`.
  - zod verwirft unbekannte Felder beim Laden. Deshalb kommt zuerst das Schema, dann ein Rundreise-Test.
- **Maul-Tab** (eigene SVG-Ebene; die Profil-Bedienung in `View2D.tsx` bleibt unangetastet, die Profile sind dann nur Kontext):
  - Stift: Der erste Klick rastet auf der Achse (Front/Top) bzw. der Kontur (Seite) ein. Jeder weitere Klick setzt einen Punkt, Ziehen ergibt einen glatten Punkt. Enter oder Esc beendet die Linie, der letzte Punkt wird der Mundwinkel (schwarz).
  - Bearbeiten wie bei den Profilen: Direktauswahl, Griffe, ⌥, Rechteck, Pfeiltasten, +/−.
  - Farben wie in Florians Bögen: türkis = zu und gleich, rot = Oberkiefer, blau = Unterkiefer, schwarz = Winkel.
  - „Kiefer gleich/getrennt“ steht direkt nach dem ersten Schlitz zur Wahl, schon im geschlossenen Zustand (Leiste und Rechtsklick).
    - Getrennt teilt die Linie in rot/blau, leicht geöffnet. So stellt er Überbiss, Unterbiss und Lippenbreite ein.
    - Die verdeckte Lippe wird im Netz automatisch nach innen gesetzt.
  - Editor-Tab = zu, Fressen-Tab = auf. Beim ersten Aufruf wird „auf“ aus „zu“ mit vorgeschlagener Öffnung erzeugt.
- **Zahn-Tab:**
  - Das Zahnmenü steht im Tab-Bereich der Leiste.
  - Anzahl oben und unten, symmetrisch.
  - Ein Klick wählt einen Zahn und öffnet das Untermenü: Länge, Breite, Rundheit, Schärfe, Neigung, Biegung, „außen“.
  - Ziehen verschiebt den Zahn längs des Zahnfleischs, der Spiegelpartner folgt.
  - Im Fressen-Tab (offen) ändern dieselben Regler die Werte für den offenen Zustand („offen größer“).
  - Ein Zahn, der geschlossen stört, ist rot markiert.
- **Rig-Punkt (Anzeige):**
  - Vorgeschlagenes Gelenk und Kieferknochen in Seite, Front und 3D.
  - Das Gelenk ist versuchsweise verschiebbar.
- **3D:**
  - Maul mit Rachen, Lippenband und Zähnen.
  - Regler „Öffnung“ in der Leiste, bei Maul, Zähnen und Rig.
  - `Renderer3D` bekommt Farben je Bereich (Vertexfarbe × Matcap).
  - Gebaut wird beim Loslassen; beim Ziehen gilt Stufe 1–2.
- **E2E:**
  - neu: Tab-Wechsel, Maullinie zeichnen, „ungleich“, Zahnanzahl, Zahn wählen und Regler bedienen, Öffnung
  - die 12 bestehenden Tests bleiben grün

### F. Bericht und Übergabe
- **Artefakt-Seite** „Maul, Zähne, Rig“:
  - Bilder je Versuch und Zahlen
  - Schwächen und Vorschläge
  - ähnliche Techniken mit Quellen
  - Datenmodell und Reihenfolge für Fable
- **Repo:**
  - `docs/research/…` (B plus Befunde aus D)
  - `docs/UEBERGABE.md` überschreiben
  - `apps/editor/CLAUDE.md` (Entscheidungen, Fallen) und `CLAUDE.md` (Stand) aktualisieren
  - Gedächtnis aktualisieren
- **Chat-Antwort** mit Kurzfassung und Link. Bilder per SendUserFile, sobald sie entstehen.

## Prüfmaße der Versuche (Pixel bezogen auf 800 px Kachel)
- **D1:**
  - Florians Lippenpunkte in Seite und Front: Höhenabweichung gleicher Punkte im Mittel ≤ 3 px. Das belegt das 3D-Punkt-Modell.
  - Eine Bearbeitung in der Seite ändert in der Front nur die gemeinsame Koordinate. Der Fehler ist exakt 0.
  - Der Startknoten bleibt auf z = 0 und auf der Seitenkontur (≤ 0,5 px).
- **D2:**
  - Der Käfig ist in beiden Zuständen geschlossen (jede Kante hat 2 Flächen). Die Punkt- und Flächenzahl ist für zu und auf gleich.
  - Die Lippenkante weicht von den gezeichneten Linien höchstens 1 px ab (Seite und Front, beide Zustände).
  - Die Silhouette außerhalb des Mauls weicht ≤ 1 px (zu) bzw. ≤ 2 px (auf) ab.
  - Es gibt 0 Selbstdurchdringungen (Dreieckstest auf Stufe 2) für zu und auf.
- **D3:**
  - Synthetisch, bei bekannter Drehung: Achse ≤ 1°, Winkel ≤ 1°, Lage ≤ 1 % der Kopflänge.
  - Rex wird als „Kippen“ erkannt, Robbe als „Ziehen“.
  - Abstand Kinn–Gelenk bei 50 %: linear schrumpft er um etwa 1 − cos(θ/2), Knochen plus Korrektur bleibt innerhalb 2 %.
  - Selbstdurchdringungen bei 25/50/75 % werden für beide Verfahren gezählt.
- **D4:**
  - Paare liegen exakt gespiegelt; bei ungerader Zahl steht ein Zahn auf der Achse.
  - Jede Zahnwurzel liegt auf dem Zahnfleisch (≤ 0,5 px), zu, auf und bei 50 %. Das gilt auch mit Werten für den offenen Zustand.
  - Geschlossen dringt kein Zahn in den Gegenkiefer ein; Verstöße werden mit Tiefe gemeldet, „außen“-Zähne liegen frei.
  - Getrennte Kiefer schaffen messbar Platz: Spalt bzw. Überbiss in px gegen die zulässige Zahnlänge.

## Datenmodell-Entwurf (im Versuch erprobt, Fable entscheidet endgültig)

Welt (x, y, z): Seite zeigt (x, y), Front (z, y), Top (x, z) wie `kopplung.ts` (ZUORDNUNG). Version 0 bleibt, alle neuen Felder sind optional.

```ts
Knoten3   = { p: V3, ein: V3, aus: V3, art: 'glatt' | 'ecke' }
Linie3    = { knoten: Knoten3[] }              // Knoten 0 auf der Mittelebene (z = 0), letzter = Mundwinkel
Lippen    = { oben: Linie3, unten?: Linie3 }   // unten fehlt = gleich (türkis)
maul?     = { zu: Lippen, art?: 'auto' | 'kippen' | 'ziehen' }
posenDaten?.fressen = { profile?: Teilprofile, maul?: Lippen }   // offen; gleiche Punktstruktur wie „zu“
zaehne?   = { oben: Zahnreihe, unten: Zahnreihe }
Zahnreihe = { anzahl: number, zaehne: Zahn[] }  // rechte Hälfte (+ Mittelzahn bei ungerader Zahl), gespiegelt
Zahn      = { t, laenge, breite, rundheit, schaerfe, neigung, biegung, aussen: boolean,   // t = Lage auf der Halblippe 0…1
              auf?: Partial<{ t, laenge, breite, neigung, biegung }> }               // offener Zustand, stufenlos überblendet
rig?      = { kiefer?: { gelenk: V3, oben: Winkel, unten: Winkel } }   // fehlt = automatisch vorgeschlagen
```

Grundsatz: Das Dokument speichert nur Absicht. Käfig, Netz, Tasche, Zähne, Knochen, Gewichte und Korrektur-Blendshape werden bei jeder Änderung daraus gebaut.

## Wichtige Dateien

**Neu**
- `packages/shape/src/versuch/`, je mit Test:
  - `linie3d.ts` (D1)
  - `maul.ts` (D2)
  - `kiefer.ts` (D3)
  - `zaehne.ts` (D4)
  - `augen.ts` (D5)
  - `wirbelsaeule.ts` (D6)
  - `varianten.ts` (D7)
  - `pruefen.ts` (Dreiecks-Durchdringung, Abweichungen)
- `apps/editor/scripts/nachziehen/` und `apps/editor/public/versuch/{rex,robbe,langhals}/` (C)
- `apps/editor/scripts/maul-bilder.mjs`
- `apps/editor/src/maul/`: SVG-Ebene der 3D-Linien, Stift-Logik, `ZahnPanel.tsx`
- `apps/editor/e2e/maul.spec.ts`

**Geändert**
- `packages/shape/src/dokument.ts`: optionale Felder plus Rundreise-Test
- `packages/shape/src/versuch/index.ts`
- `apps/editor/src/state/uiStore.ts`: `ebene`, Panel-Platz, Zahnauswahl, `oeffnung`
- `apps/editor/src/state/editorStore.ts`: Maul und Zähne mit Gesten-Undo
- `apps/editor/src/viewports/Viewport.tsx`: Punkte als Tabs, Rig-Punkt; dazu `editor.css` und `tokens.css`
- `apps/editor/src/viewports/View2D.tsx`: nur Profil-Bedienung abschalten, wenn `ebene ≠ form`, und Linien-Ebene einhängen
- `apps/editor/src/three/Renderer3D.ts`: Bereichsfarben, Knochenlinien
- `apps/editor/src/three/Szene3D.tsx`: Maul-Bauweg
- `apps/editor/src/library/LibraryPanel.tsx` → Seitenleiste mit Tab-Bereich und Library; `layout/layout.ts` (feste Leiste, Maximieren mit Mindestspalte), `layout/animation.ts`, `layout.test.ts`, `e2e/editor.spec.ts` (Library- und Maximier-Tests angepasst); Electron-Menü ⌘L
- `apps/editor/src/hooks.ts`: Enter/Esc im Maul-Stift
- `apps/editor/src/versuch/ueberlagerung.ts`: lädt Rex, Robbe, Langhals

**Wiederverwendet**
- `bezier.ts` (`teilen`, `punktAuf`; dazu kommen 3D-Fassungen)
- `profil.ts` (Einfüge- und Löschlogik als Vorbild)
- `kopplung.ts` (ZUORDNUNG)
- `catmullClark.ts` (`unterteilen`, `zuDreiecken`)
- `tigerKaefig.ts` (`anZielAnpassen`, `umriss`, `formStationen`, Kappe)
- `ansicht2d.ts` (`zuBild`, `zuWelt`)
- Muster aus `editing/gekoppelt.ts`

**Nur als Wissen** aus `packages/creature`:
- `mesh/mundschnitt.ts`: Taschenreihen, ideale Normalen, Reißverschluss-Eltern
- `mouth/pose.ts`: Schädelkippung, Bodengrenze
- `mesh/descriptors.ts`: weiche Trennung hinter den Mundwinkeln
- `mesh/build.ts`: Zahn-Größenprofil, Eckzahn

## Prüfung
- **Je Schritt:** `pnpm typecheck`, `pnpm test`, `pnpm lint`.
- **Versuche (Vitest):** Prüfmaße stehen oben bei D1–D4. Die Bilder erzeugt ein Skript wie `tiger-schritte.mjs` (`apps/editor/scripts/maul-bilder.mjs`), Ablage `docs/progress/editor/maul-*.png`.
- **Editor:**
  - E2E im Web-Modus mit echter GPU: `E2E_PORT=5191 EE_GPU=1 pnpm --filter @ee/editor e2e`, 12 bestehende plus neue Tests.
  - Live-Prüfung mit dem Vorschau-Werkzeug `editor-web` (Port 5180). Florians `game-dev` bleibt unberührt.
  - Konsole ohne Fehler.

## Reihenfolge nach Wert
1. **A** Sichern, dann pushen.
2. **B** Recherche-Agenten und **C** Nachzieh-Agent starten, beide im Hintergrund.
3. **D2 + D3** am Rex (Kern). Bis C fertig ist, laufen sie mit von Hand eingetragenen Punkten aus dem Bogen. Danach Bilder.
4. **D4** Zähne, dann Bilder.
5. **D1** 3D-Linie (Grundlage für E).
6. **E** Bedien-Versuch (Maul, Zähne, Rig-Anzeige, Öffnungsregler).
7. **D6** Wirbelsäule (Langhals), dann D2/D3 mit Robbe und Langhals (Ziehen).
8. **D5** Augen, **D7** Varianten (wird bei knappem Limit auf Recherche gekürzt).
9. **F** Bericht, Übergabe, Gedächtnis.

## Risiken
- **Mäuler weit weg von halber Kopfhöhe:** Bei der Robbe sitzt das Maul hoch unter der Nase, beim Langhals am Hals. Die Neuverteilung der Ringpunkte kann dort verzerren. Rückfall: eine zusätzliche Schleife je Lippe.
- **Durchdringung im geschlossenen Zustand:** Tasche gegen Haut, Zähne gegen Kiefer. Beides wird gemessen und im Bericht offen benannt.
- **Nachziehen:** Dünne Linien haben Lücken, und Punkte auf farbigen Linien sind schwer zu erkennen. Rückfall: Punkte aus dem Bogen von Hand übernehmen (wie die Maulpunkte beim Tiger).
- **Tempo:** Die Anpassung mit Stufe 3 ist zu langsam fürs Ziehen. Darum wird beim Loslassen gebaut; für Fable empfehle ich Grenzmasken statt Unterteilung und einen Worker.
- **Limit:** Agenten nur gezielt einsetzen. Bei Knappheit werden D7 und D5 zuerst gekürzt.
- **Feste Seitenleiste:** Sie verändert das Figma-Raster. Die Viewports werden schmaler, das maximierte Quadrat kleiner. Deshalb gibt es ein neues Vergleichsbild, und die Leistengestaltung wird als mein Entwurf gekennzeichnet.
