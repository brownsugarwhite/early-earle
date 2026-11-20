# Spine und die Skelett-Werkzeuge: was wir übernehmen und was wir besser machen

Recherche für den Figureneditor „Studio“ (Arbeitstitel), 20.11.2026. Bericht 01 der Reihe `docs/research/2026-11-20-editor/`.

**Frage.** Wie arbeiten Spine und die übrigen 2D-Skelett-Werkzeuge (DragonBones, Spriter Pro, Creature, Unity 2D Animation,
Godot Skeleton2D/Polygon2D) im Einzelnen? Was loben Animatoren, was hassen sie? Und was folgt daraus für einen Vektor-Figureneditor
mit Schlüsselformen, Knochen, Physik und Spiellogik, den ein Art Director ohne Programmierkenntnisse auf Mac, iPad und iPhone
bedient? Beispiel ist Ozzy, Testfall das Spiel auf dem Rad.

**Methode.** Vor allem Primärquellen: Handbuchseiten, Versionshinweise und Lizenztexte der Hersteller, dazu eine Stelle im
Laufzeit-Code von Spine. Ergänzt um Forenfäden mit Antworten der Hersteller und Stimmen von Nutzern. Wörtliche Zitate höchstens
eines je Quelle. **Einschränkungen:** Das gemeinsame Kontingent der Websuche war gegen Ende aufgebraucht; Unity und Godot habe ich
deshalb direkt aus ihren Handbuchseiten gelesen. Der Pflegestand von DragonBones, Spriter und Creature stützt sich teils auf Dritte
(Foren, Spiegelseiten); das steht jeweils dabei. Vergleichsportale haben kaum echte Bewertungen und zählen nur am Rand. Live2D und
Rive stehen in [`../2026-11-18-ozzy-figur-recherche.md`](../2026-11-18-ozzy-figur-recherche.md) und in den Nachbarberichten dieser
Reihe; hier kommen sie nur zum Vergleich vor.

---

## 0. Das Wichtigste in Kürze

1. **Spine ist das Vorbild für die Semantik, nicht für das Werkzeug.** Spine (aktuell 4.3, laut Changelog stabil seit 14.05.2026)
   ist das ausgereifteste 2D-Skelettwerkzeug. Sein Datenmodell (Knochen, Plätze, Anhänge, Gewichte, Constraints, Skins, Ereignisse)
   und vor allem seine Laufzeit-Semantik (Spuren, gerichtete Mischzeiten je Animationspaar, Schwellen beim Überblenden) sind
   erprobt und gut dokumentiert. Das übernehmen wir als Pflichtenheft.
2. **Für unseren Look scheidet Spine als Werkzeug aus.** Spine ist bildbasiert (Rastertexturen auf Dreiecksnetzen), Bézier-Pfade
   sind dort nur Hilfslinien. Flächen verschmelzen nicht, Verjüngungen statt Outlines gehen nicht, einen Editor für iPad oder iPhone
   gibt es nicht.
3. **Spines Formschlüssel sind genau das, was wir besser machen müssen.** Verformungsschlüssel verschieben jeden Netzpunkt
   geradlinig von Schlüssel zu Schlüssel und gelten immer für die ganze Fläche; der Hersteller rät selbst davon ab. Unser Prototyp
   mischt Anker per PCHIP und Griffe nach Winkel und Länge. Das ist der richtige Weg.
4. **Das wertvollste technische Detail:** Bei gewichteten Netzen legt Spine Formkorrekturen als Versatz **je Knochen-Einfluss im
   Raum des Knochens** ab und häutet erst danach (Laufzeit-Code). So wandert ein Morph mit dem Knochen mit. Diese Reihenfolge
   (Morph im Knochenraum, dann Haut) macht das Zusammenspiel von Morph und Knochen stabil.
5. **Gewichte auf Bézier-Griffen gibt es in Spine schon** (bei Pfaden). Spine rät, Knoten und beide Griffe gleich zu gewichten.
   Der Grund: Nur bei gleichen Gewichten erfahren die drei Punkte dieselbe Abbildung, bleiben auf einer Geraden, und die Kurve
   bleibt glatt. Eigene Griff-Gewichte brauchen deshalb einen Glätte-Schutz.
6. **Spines Physik ist kein Kettensimulator.** Seit 4.2 bekommt jeder Knochen einen Versatz, der aus seiner Bewegung entsteht und
   von Federkraft zur gekeyten Pose zurückgezogen wird (Trägheit, Stärke, Dämpfung, Masse, Wind, Schwerkraft, Grenze, feste Rate).
   Das ältere Modell aus Knoten und Federn hat der Hersteller verworfen, weil es oft durchhing oder sich streckte. Für das
   Nachschwingen von Ohren, Schwanz und Bart übernehmen; für Ozzy auf dem Rad braucht es zusätzlich eine Weltphysik, die Spine
   nicht hat.
7. **Der Regler ist der gemeinsame Baustein.** Spine 4.3 „Slider“ (eine Animation an einer Stelle angewendet, auf Wunsch von einer
   Knocheneigenschaft getrieben), Live2D-Parameter, Creatures „Animation Controllers“ und unser Kopfdreh-Raster sind dasselbe
   Prinzip. Zeit, Kopfwinkel, Tempo und Haltungen lassen sich alle als Regler mit Schlüsseln ausdrücken.
8. **Übergänge sind überall dünn.** Spine kennt eine gerichtete Mischzeit je Paar mit Standardwert, ab 4.3 eine nichtlineare
   Mischkurve und Überblenden ohne „Einsacken“. Godot hat dieselbe Tabelle und dazu eine A*-Wegsuche durch Zwischenzustände;
   Unity zeigt im Übergangsgraph Fußkontakte an. Kein Werkzeug speichert Übergänge mit Ankern (was stehen bleibt) und eigenen
   Zwischenabläufen. Genau das kann unser Prototyp schon und sollte das Herz des Editors werden.
9. **Autorig gibt es nur halb.** Spine und Unity rechnen Gewichte (Unity auch die Netzgeometrie), die Knochen setzt der Mensch, und
   sie müssen über der Fläche liegen. Creature platziert Knochen per maschinellem Lernen, aber nur für Menschenfiguren. Ein Autorig
   aus der Formanalyse (Mittelachse, Vorlage „Vierbeiner“, glatte formbewusste Gewichte wie bei BBW) wäre ein echter Vorsprung.
10. **Was Animatoren an Spine loben:** Physik als Zeitgewinn, kleine Daten, Wiederverwendung über Skins, Laufzeiten für viele Engines,
    schnelle Antworten des Herstellers. **Was sie hassen:** den Baum in großen Projekten, die Falle Setup-Modus (alles ist relativ
    zur Grundpose), fehlende Formschlüssel und fehlende Spiegelung, mühsames Gewichtsmalen, Preis und Lernkurve.
11. **Die Alternativen taugen nicht als Werkzeug:** DragonBones ist frei, aber laut Dritten seit etwa 2018 verwaist; Spriter Pro
    (2014) hat keine Netze, Spriter 2 steckt seit 2018 in Vorabfassungen; Creature hat starke Automatik und „Motoren“, ist aber
    bildbasiert und erkennbar wenig gepflegt; Unity 2D und Godot sind an ihre Engine gebunden und verlangen Programmieren. Einzelne
    Ideen daraus lohnen sich.
12. **Lizenz:** Spine-Laufzeiten dürfen nicht in einem Produkt stecken, das anderen das Erstellen oder Bearbeiten von Skeletten
    oder Animationen ersetzt. Ein eigener Editor braucht also eigenen Code und ein eigenes Format; ein Export nach Spine wäre heikel,
    sobald der Editor an andere geht.
13. **Empfehlung:** eigener Editor mit Spines Semantik als Pflichtenheft, aber vektornativ, mit Reglern als Grundbaustein, einer
    Übergangs-Matrix mit Ankern und Federn, Physik in zwei Schichten, eingebauter Spiegelung und ohne Setup/Animate-Falle.

---

## 1. Spine im Detail (Stand 4.3)

### 1.1 Bausteine

- **Skelett:** alles, was eine Figur ausmacht (Knochen, Plätze, Anhänge, Constraints); ein Projekt kann mehrere Skelette haben
  ([Grundbegriffe](https://esotericsoftware.com/spine-basic-concepts)).
- **Knochen** bilden einen Baum. Jeder hat Drehung, Verschiebung, Skalierung und Scherung; Kinder erben die Bewegung.
- **Slots (Plätze)** hängen an Knochen und halten beliebig viele **Attachments (Anhänge)**, von denen höchstens einer sichtbar ist.
  Der Platz trennt die Zeichenreihenfolge vom Knochenbaum: Ein Teil am selben Knochen kann vor oder hinter Teilen anderer Knochen
  liegen. Die **Zeichenreihenfolge** ist schlicht die Liste der Plätze; der Platz tönt seine Anhänge mit einer Farbe.
- **Anhang-Arten:** Bild (Region), Netz (Mesh), Pfad (Bézier-Kurve), Begrenzungsrahmen, Ausschnitt (Clipping), Punkt. Gewichte
  wirken auf Netze, Pfade, Begrenzungsrahmen und Ausschnitte ([Gewichte](https://esotericsoftware.com/spine-weights)).
- Seit 4.3 können **Ordner der Zeichenreihenfolge** eigene Schlüssel in eigenen Zeilen tragen
  ([4.3 veröffentlicht](https://en.esotericsoftware.com/blog/Spine-4.3-released)).

### 1.2 Grundpose und die zwei Modi

- Im **Setup-Modus** baut man das Rig und legt die Grundpose fest; im **Animate-Modus** setzt man Schlüssel auf der Zeitleiste.
  Ohne „Auto Key“ gehen Änderungen verloren, sobald man auf der Zeitleiste springt.
- Knochen-Schlüssel sind **relativ zur Grundpose** gespeichert (Drehung, Skalierung, Scherung in lokalen Achsen, Verschiebung in
  den Achsen des Elternknochens). Wer die Grundpose ändert, ändert alle Animationen
  ([Schlüssel](https://esotericsoftware.com/spine-keys)).
- Das ist eine berüchtigte Falle: Ein Nutzer testete IK in der Grundpose, danach stimmten seine Animationen nicht mehr; ein
  ausgeblendetes Schwert tauchte in allen Animationen auf. Der Rat des Herstellers: zum Testen eine Wegwerf-Animation anlegen
  ([Forum 10531](https://esotericsoftware.com/forum/d/10531)). Ein automatischer Ausgleich beim Ändern der Grundpose war 2019 als
  GitHub-Issue #167 geplant; bis dahin muss man jede betroffene Animation von Hand nachziehen
  ([Forum 13067](https://esotericsoftware.com/forum/d/13067)).
- Für **weitere Grundposen** (andere Hand, anderer Oberkörper) empfiehlt der Hersteller eine „Setup-Pose-Animation“, die nicht
  exportiert wird und aus der man Schlüssel in andere Animationen kopiert
  ([Tutorial „Rigging new poses“](https://esotericsoftware.com/blog/Rigging-new-poses-tutorial)). Eine Posen-Bibliothek gibt es
  nicht; erst die Slider von 4.3 (1.5) machen Posen wiederverwendbar.

### 1.3 Netze und Verformungsschlüssel

- Netze gibt es nur in Spine Professional. Ein Bild wird zum Netz mit **Hülle** (äußerer Umriss, cyan), **inneren Punkten** und
  **eigenen Kanten** (orange); den Rest trianguliert Spine selbst, automatische Kanten kreuzen eigene nie. Löcher gehen nicht.
  Verformung ist örtlich: Ein Punkt bewegt nur die Dreiecke, zu denen er gehört; deshalb setzt man Punkte und Kanten an Nase, Mund,
  Gelenken gezielt ([Netze](https://esotericsoftware.com/spine-meshes)).
- **Generate** legt ein Raster innerer Punkte an, **Trace** zieht die Hülle automatisch aus dem Alphakanal (Detail, Hohlstellen,
  Verfeinerung, Alpha-Schwelle, Abstand). Beide **löschen alle Gewichte und Verformungsschlüssel**. 4.3 macht Trace schneller,
  genauer und für viele Netze zugleich ([4.3](https://en.esotericsoftware.com/blog/Spine-4.3-released)).
- **Verknüpfte Netze** teilen Punkte, UVs und Gewichte mit einem Quellnetz, aber nicht das Bild (z. B. für Varianten); sie können
  die Schlüssel der Quelle erben.
- **Verformungsschlüssel (Deform Keys):** Im Animate-Modus verschobene Punkte werden gespeichert. Zwischen Schlüsseln läuft jeder
  Punkt **auf gerader Linie**; Drehung und Skalierung, mit denen man die Punkte bewegt hat, werden nicht gespeichert, nur die
  Lagen ([Netze](https://esotericsoftware.com/spine-meshes)). Ein Schlüssel umfasst **alle Punkte eines Anhangs**; einen Teil
  der Fläche getrennt zu keyen geht nicht. Der Hersteller dazu: „all vertices for an attachment are keyed together“
  ([Forum 28508](https://esotericsoftware.com/forum/d/28508)).
- Der Hersteller rät durchgehend, Verformung über **Gewichte und Knochen** zu machen und Verformungsschlüssel nur sparsam für Fälle
  zu nehmen, die Gewichte nicht schaffen: Schlüssel sind schwer zu überarbeiten, speichern je Knochen eine Lage und laufen
  geradlinig ([Blog „Mesh weight workflows“](https://esotericsoftware.com/blog/Mesh-weight-workflows)).
- **Leistung:** Netzpunkte rechnet der Prozessor jedes Bild neu. Jeder Knochen, der einen Punkt gewichtet, kostet eine
  Transformation (100 Punkte mit je 2 Knochen = 200).

### 1.4 Gewichte

- **Binden:** Knochen wählen, „Bind“, Netz anklicken (oder umgekehrt). Beim ersten Binden rechnet Spine Gewichte automatisch.
  Spätere Knochen ändern bestehende Gewichte nicht; dafür „Auto“ erneut drücken
  ([Gewichte](https://esotericsoftware.com/spine-weights)).
- **Auto** nimmt laut Handbuch nicht den einfachen Abstand, sondern berücksichtigt die Topographie des Netzes; es lässt sich auf
  gewählte Punkte oder gewählte Knochen beschränken. Es versagt, wenn Knochen das Netz nicht überdecken.
- **Anzeige:** jeder Knochen eine Farbe, Tortendiagramme je Punkt, farbige Überlagerung der Fläche.
- **Werkzeuge:** direktes Ziehen (rauf/runter) oder exakter Wert; Pinsel Hinzufügen, Entfernen, Ersetzen mit Stärke, Größe und
  weichem Rand. Die Summe je Punkt bleibt 100 %: Fügt man einem Knochen etwas hinzu, verlieren die anderen.
  **Glätten** mittelt mit Nachbarn entlang der Hüllen- und eigenen Kanten; **Prune** begrenzt die Knochen je Punkt und entfernt
  kleine Gewichte (mit Vorschau); **Weld** gleicht Gewichte über Netzgrenzen an, damit zwei Netze wie eines verformen; **Swap**,
  **Lock** je Knochen und Netz, Kopieren/Einfügen.
- **Bindungspose:** Spine merkt sich beim Binden die Lage jedes Punkts relativ zu jedem Knochen. Bewegt man danach Knochen und ändert
  Gewichte, springen Punkte in der Grundpose; „Update“ bindet neu. Typischer Fehler: Knochen bewegen, binden, zurückbewegen
  ([Blog](https://esotericsoftware.com/blog/Mesh-weight-workflows)).
- **Empfohlener Ablauf** (Blog): zuerst die äußersten Punkte zu 100 % ihrem Knochen geben, dann dazwischen mischen; gruppenweise
  vorgehen; von oben nach unten im Baum; in einer **Testanimation** prüfen, die die Knochen über ihren ganzen Bereich bewegt.
- **4.3:** Gewichte über mehrere Netze malen; Binden, Weld, Glätten, Auto und Prune für viele Netze zugleich; bessere Auto-Gewichte.

### 1.5 Constraints

Alle Constraints sind nur in Spine Professional enthalten und haben einen keybaren **Mix** (0–100 %).

**IK** ([Handbuch](https://esotericsoftware.com/spine-ik-constraints))

- Ein Knochen (zeigt aufs Ziel) oder zwei Knochen (Eltern und direktes Kind, Spitze erreicht das Ziel). Drei und mehr nicht, weil
  das Ergebnis nicht eindeutig ist; dafür mehrere IK-Constraints oder FK.
- **Biegerichtung** (zwei Knochen), **Compress** (ein Knochen schrumpft, wenn das Ziel zu nah ist), **Stretch** (Knochen dehnen
  sich, wenn das Ziel zu weit ist), **Uniform**, **Softness** (zwei Knochen bremsen vor der vollen Streckung, statt am Ende
  plötzlich zu beschleunigen). Alles keybar.
- Mix zwischen 0 und 100 kann die Drehung beim Bewegen des Ziels umschlagen lassen, weil die Mischung den kürzesten Drehweg nimmt.
- Im Editor gibt es zusätzlich das **Pose-Werkzeug** (IK über mehrere Knochen nur zum Posieren)
  ([In depth](https://esotericsoftware.com/spine-in-depth)). 4.3 bringt beim Dehnen ein **volumenerhaltendes ScaleY**.
- Laut Handbuch dient IK auch dazu, Ziele zur Laufzeit an unebenen Boden anzupassen.

**Transform** ([Handbuch](https://esotericsoftware.com/spine-transform-constraints))

- Kopiert Drehung, Verschiebung, Skalierung und/oder Scherung eines Zielknochens auf andere Knochen, lokal oder in der Welt,
  absolut oder relativ, mit Versatz („Match“ übernimmt die aktuelle Lage). Anwendungen: anderer Elternknochen (Hut, Waffe),
  Knochen auf halbem Weg zwischen zwei anderen.
- **4.3 überarbeitet:** Eigenschaften lassen sich auf andere Eigenschaften abbilden (Verschiebung treibt Drehung oder Skalierung),
  Werte auf Bereiche klemmen, Quelle und Ziel getrennt in Welt- oder lokalem Raum
  ([4.3](https://en.esotericsoftware.com/blog/Spine-4.3-released)).

**Pfad** ([Constraint](https://esotericsoftware.com/spine-path-constraints), [Pfade](https://esotericsoftware.com/spine-paths))

- Ein Pfad-Anhang ist eine Bézier-Kurve aus **Knoten und Griffen**; seine Punkte lassen sich **wie Netzpunkte gewichten**. Das
  Handbuch rät, einem Knoten und seinen beiden Griffen **dieselben Gewichte** zu geben. Offene und geschlossene Pfade, „Constant
  Speed“ für gleichmäßiges Gleiten. Bedienung wie in Illustrator: Alt löst einen Griff (Spitze), Shift sperrt den Winkel.
- Der Constraint setzt Knochen entlang des Pfads: Abstände nach Knochenlänge, fest, prozentual oder proportional; Lage fest oder
  prozentual; Drehung **Tangente**, **Kette** (starre Glieder, Panzerkette) oder **Kette mit Skalierung** (dehnbare Glieder,
  Seil). Teil-Mix kann die Drehung umschlagen lassen.
- Als Verformungsschlüssel gekeyte Pfadpunkte laufen wieder geradlinig; das Handbuch rät auch hier zu Gewichten.

**Physik (seit 4.2, verbessert in 4.3)** ([Handbuch](https://esotericsoftware.com/spine-physics-constraints))

- Ein Physik-Constraint gehört zu **einem Knochen**. Je Eigenschaft (Verschiebung X, Verschiebung Y, Drehung, Scherung X,
  Skalierung X) regelt ein Schieber, wie stark die Physik wirkt. Für unterschiedliche Einstellungen je Eigenschaft stapelt man
  mehrere Constraints auf denselben Knochen. Die Knochenlänge zählt mit.
- **Parameter:** Trägheit (wie viel der Knochenbewegung in den Versatz geht; erzeugt das Nachziehen, keine Kraft), Stärke (Feder
  zurück zur Pose ohne Constraint), Dämpfung (bremst schnelle Bewegung stärker, unterdrückt Schwingen, ohne sanfte Bewegung zu
  lähmen), Masse (Trägheit gegen Beschleunigung; mehr Masse braucht mehr Stärke), Wind (feste Kraft entlang Welt-X), Schwerkraft
  (entlang Welt-Y), Grenze (deckelt das Tempo, auf das die Physik reagiert), Rate in Bildern je Sekunde (30–60 empfohlen; darunter
  ruckelt und versagt es eher), Mix (keybar), Global (eine Zeitleisten-Zeile für viele Constraints).
- **Editor:** „Simulate“ (Physik läuft live; ist es aus, spult die Physik beim Scrubben von Bild 0 bis zum aktuellen Bild vor),
  „Deterministic“ (jedes Bild neu ab 0, gleiches Bild zeigt gleiche Pose; kostet Rechenzeit, nur im Editor), Reset (auch keybar),
  „Warm Up“ (lässt Schleifen vor dem Export einschwingen). Ein **Referenzmaß** des Skeletts legt fest, wie Schwerkraft auf Drehung und Skalierung wirkt; wer die Figur
  skaliert, skaliert es mit.
- **Laufzeit:** Physik läuft live aus dem aktuellen Zustand und reagiert auch auf die Bewegung der Figur in der Spielwelt (in Unity
  über „Physics Inheritance“) ([4.2-Blog](https://esotericsoftware.com/blog/Spine-4.2-The-physics-revolution)). Der Aufruf je
  Bild: `Skeleton.update(delta)` und `updateWorldTransform(Physics.update)`.
- **Bauart:** Laut Hersteller verschiebt das System jeden Knochen abhängig von seiner Bewegung und zieht ihn per Physik zur Pose
  ohne Constraint zurück; die gekeyte Pose bleibt die Grundlage, die Physik legt Nachziehen und Überschwingen darüber. Ein früherer,
  fast fertiger Ansatz aus Knoten und Federn wurde verworfen, weil er oft durchhing oder sich streckte; die Physik ist eigener,
  leichter Code, damit sie in allen Engines gleich läuft ([Forum 24635](https://esotericsoftware.com/forum/d/24635)).
- **4.3:** volumenerhaltendes ScaleY, glatter, reaktionsschneller und deterministischer, besser bei niedriger Rate; Wind und
  Schwerkraft für das ganze Skelett zur Laufzeit; **„Key Constrained“** wandelt die Bewegung aus Constraints und Physik in Schlüssel
  um, die man danach von Hand nachbearbeiten kann.
- Keine Kollision: Weder Handbuch noch Versionshinweise nennen Zusammenstöße der Physik-Knochen mit etwas.

**Slider (seit 4.3)** ([Handbuch](https://esotericsoftware.com/spine-sliders))

- Ein Slider wendet eine **Animation an einer bestimmten Stelle** an, statt sie abzuspielen. Einstellungen: Schleife, **additiv**
  (relativ zur vorhandenen Pose) oder überschreibend, **Bild** (keybar in anderen Animationen) oder **Knochen als Treiber**: Ein
  gewählter Bereich einer Knocheneigenschaft (z. B. Drehung 0–90°) wird auf einen gewählten Bereich von Bildern der Animation
  abgebildet, lokal oder in der Welt. Mix keybar.
- Der Hersteller nennt als Zweck: Posen wiederverwenden, Blendshapes mischen oder morphen; Animationen können den Slider oder seinen
  Steuerknochen keyen ([4.3](https://en.esotericsoftware.com/blog/Spine-4.3-released)).
- Grenze aus Nutzersicht: Ein Slider mischt ganze Animationen, nicht einzelne Teile eines Netzes; wer nur das Auge eines Netzes
  getrennt vom Mund formen will, kommt damit nicht weiter ([Forum 28508](https://esotericsoftware.com/forum/d/28508)).
- Das ist dasselbe Prinzip wie Live2D-Parameter mit Schlüsselformen und wie unser Kopfdreh-Raster (Schlüsselformen je Winkel).

**Reihenfolge und Posen-Modell:** 4.3 trennt in der Laufzeit Grundpose, Pose ohne Constraints, Pose mit Constraints und
angewendeten Zustand ([4.3](https://en.esotericsoftware.com/blog/Spine-4.3-released)). Diese Trennung ist die Voraussetzung dafür,
dass Physik relativ zur ungebundenen Pose rechnet und Mischungen sauber bleiben.

### 1.6 Skins (Varianten)

- Ein **Platzhalter** im Platz steht für den Anhang, den die aktive Skin liefert; Animationen keyen den Platzhalter, nicht den
  konkreten Anhang, und gelten so für alle Varianten ([Skins](https://esotericsoftware.com/spine-skins)).
- **Skin-Knochen und -Constraints** sind nur aktiv, wenn ihre Skin aktiv ist, und kosten sonst nichts; damit lassen sich andere
  Proportionen mit denselben Animationen bedienen.
- **Mischen zur Laufzeit:** Eine neue Skin aus mehreren zusammensetzen (Kopf, Hut, Jacke). 4.3: Skins per Ziehen zusammenführen.
- Fallen: Ein inaktiver Kindknochen bricht seine Nachfahren; gewichtete Punkte an inaktiven Knochen landen bei 0,0.

### 1.7 Ereignisse

- Ereignisse werden einmal angelegt (in Ordnern, Ordnername wird Präfix) und auf der Zeitleiste gekeyt. Nutzlast: Ganzzahl,
  Kommazahl, Text; mit Tonpfad werden sie zu Ton-Ereignissen mit Lautstärke und Balance. Die Laufzeit spielt keinen Ton ab; das
  Spiel hört auf das Ereignis und handelt ([Ereignisse](https://esotericsoftware.com/spine-events)).
- Beim Überblenden feuern Ereignisse der **ausgehenden** Animation standardmäßig nicht mehr (Schwelle `eventThreshold`, 1.8).

### 1.8 Abspielen und Mischen: AnimationState

([Animationen anwenden](https://esotericsoftware.com/spine-applying-animations), [API](https://esotericsoftware.com/spine-api-reference),
[Vorschau](https://esotericsoftware.com/spine-preview))

- **Trennung von Daten und Zustand:** `AnimationStateData` ist zustandslos und lässt sich zwischen vielen Figuren teilen; sie hält
  die **Standard-Mischzeit** (`defaultMix`) und **Mischzeiten je Paar** (`setMix(von, nach, Dauer)`), und zwar **gerichtet**:
  A→B darf anders sein als B→A. `AnimationState` hält den Zustand je Figur; jedes Bild `update(delta)`, dann `apply(skeleton)`.
- **Spuren (Tracks):** nummeriert ab 0, aufsteigend angewendet; höhere Spuren liegen über niedrigeren (z. B. Schießen nur mit dem
  Arm über dem Laufen). `setAnimation` ersetzt, `addAnimation(..., delay)` reiht ein, **leere Animationen** blenden zur Grundpose
  oder von ihr her.
- **TrackEntry** (je abgespielte Animation): `alpha` (Mischung mit der Spur darunter), `additive`, `mixDuration`, `mixTime`,
  **`mixInterpolation`** (Kurve der Überblendung, ab 4.3; vorher immer linear), `eventThreshold`, `mixAttachmentThreshold`,
  `mixDrawOrderThreshold` (bis zu welchem Mischanteil Ereignisse, Anhangwechsel und Zeichenreihenfolge der ausgehenden Animation
  noch gelten; Standard 0), `alphaAttachmentThreshold`, `reverse`, `shortestRotation` (Standard aus: Die Drehrichtung wird zu
  Beginn der Mischung festgelegt und gehalten, damit nichts umschlägt), `timeScale`, `delay`, `trackEnd`.
- **Zuhörer** bekommen Beginn, Unterbrechung, Ende, Abschluss, Ereignisse; Änderungen im Zuhörer wirken ab dem nächsten `apply`.
- **„Einsacken“ (Dipping):** Beim Überblenden auf einer höheren Spur schien bisher kurz die Pose der Spur darunter (oder die
  Grundpose) durch, und unterbrochene Überblendungen konnten springen; dagegen gab es `holdPrevious` und `interruptAlpha`
  ([Vorschau](https://esotericsoftware.com/spine-preview)). 4.3 überblendet ohne Einsacken; additives Mischen ersetzt
  `holdPrevious` ([4.3](https://en.esotericsoftware.com/blog/Spine-4.3-released)).
- **Wo die Mischzeiten leben:** in der Laufzeit. Das Vorschaufenster des Editors hat mehrere Spuren und je Spur Regler für Tempo,
  Mischzeit, Alpha, „Hold previous“ und Additiv, um Überblendungen live zu beurteilen; die Tabelle der Mischzeiten je Paar pflegt man
  aber im Spiel, in Unity etwa als Standard plus Paarliste im SkeletonDataAsset
  ([Forum zu Mix-Einstellungen in Unity](https://esotericsoftware.com/forum/d/12629)). Der Animator kann Übergänge also nicht im
  Editor festlegen und mitliefern.
- **Was gemischt wird:** Werte überblenden linear nach dem Mischanteil (ab 4.3 mit Kurve); diskrete Dinge (Anhangwechsel,
  Zeichenreihenfolge, Ereignisse) schalten an Schwellen um. Es gibt weder Anker (was stehen bleibt) noch Zwischenabläufe.

### 1.9 Zeitleiste: Dopesheet, Graph, Favor, Zwiebelhaut

- **Dopesheet** zeigt nur das Timing: Übersichtszeile, Zeilen je Knochen, darunter Zeilen je Eigenschaft; jede Schlüsselart eine
  Farbe, Linien zeigen die Interpolation (linear, Bézier, gestuft). Filter je Eigenschaft, Sperre, Rahmen ziehen und an der Kante
  skalieren (auch spiegeln), „Adjust“ (Werkzeugbewegung verschiebt alle gewählten Schlüssel um denselben Betrag), Schleifenbereich
  ([Dopesheet](https://esotericsoftware.com/spine-dopesheet)).
- **Graph** zeigt Werte über der Zeit, X und Y getrennt keybar. Schlüsseltyp gestuft, linear oder Bézier; Griffe mit Alt lösen,
  mit Shift nur die Länge; Vorlagen Automatisch, Getrennt, Flach, Bounce, Ease out, Ease in. **Favor-Regler:** zieht die gewählten
  Schlüssel Richtung vorherigem oder nächstem Schlüssel (auch Überschwingen), Mittelwerte, Grundpose; **Store/Swap** hält eine
  Kurve zum Vergleich ([Graph](https://esotericsoftware.com/spine-graph)).
- **4.3:** Dopesheet und Graph laufen synchron (Schlüssel im Dopesheet wählen zeigt seine Kurve), Bézier-Griffe passen sich an,
  wenn sich Werte ändern, „zuletzt gewählte Kurve“ als Standard für neue Schlüssel, Rechenausdrücke in Zahlenfeldern, eine
  **Problem-Ansicht** mit Ein-Klick-Lösungen ([4.3](https://en.esotericsoftware.com/blog/Spine-4.3-released)).
- Dazu Zwiebelhaut (Ghosting), Auto-Key, Vorschaufenster.

### 1.10 Laufzeiten, Lizenz, Preise, Plattformen

- **Laufzeiten:** offiziell 19 Engines und Frameworks in 7 Sprachen, über 40 von Dritten
  ([In depth](https://esotericsoftware.com/spine-in-depth)); darunter spine-ts (WebGL, Canvas, Three.js, Pixi, Phaser, Player),
  spine-unity, spine-godot, spine-ue, spine-ios, spine-flutter, spine-cpp. 4.3 bringt HTML-Export und **Web Components**
  (`<spine-skeleton>` ohne eigenes Skript), mehrkernige Unity-Laufzeit und große Umbauten (spine-c neu, spine-cpp umgebaut,
  cocos2d-x gestrichen). **4.2 und 4.3 verlangten jeweils neues Exportieren** aller Daten.
- **Lizenz:** Wer die Laufzeiten einbaut, braucht eine Editor-Lizenz; Spiele dürfen frei verteilt werden, Endnutzer brauchen keine
  Lizenz. Abschnitt 2.1 verlangt, dass jedes Produkt den Laufzeiten wesentliche eigene Funktion hinzufügt und **kein an andere
  gegebenes Produkt den Spine-Editor beim Erstellen oder Bearbeiten von Skeletten oder Animationen ersetzt**; ausdrücklich verboten
  ist ein Produkt, mit dem Nutzer Skelette riggen oder Animationen keyen, die außerhalb des Produkts mit den Laufzeiten laufen
  ([Editor-Lizenz](https://esotericsoftware.com/spine-editor-license),
  [Laufzeit-Lizenz](https://esotericsoftware.com/spine-runtimes-license)). Hinweis: keine Rechtsberatung.
- **Preise:** Essential 69 $ (Liste 99 $) ohne Netze, Gewichte, IK-, Transform-, Pfad- und Physik-Constraints, Slider und
  Skin-Knochen; Professional 379 $ (Liste 449 $); Enterprise 2 499 $ Grundpreis plus 379 $ je Nutzer und Jahr, Pflicht ab
  500 000 $ Jahresumsatz einschließlich Finanzierung ([Kauf](https://esotericsoftware.com/spine-purchase)).
- **Plattformen:** Windows, macOS (Apple Silicon ab 12, Intel ab 11), Linux; kein iPad. Die Probefassung kann nicht speichern
  und nicht exportieren ([Download](https://esotericsoftware.com/spine-download)).

### 1.11 Was Animatoren loben und was sie hassen

**Lob**

- **Physik:** Ein Nutzer nennt die Physik-Constraints „a game changer for our productivity“; Fehler bei Wind und Schwerkraft in
  der Unity-Laufzeit behob der Hersteller binnen Tagen ([Forum 25363](https://esotericsoftware.com/forum/d/25363)). Der Hersteller
  wirbt damit, dass Sekundärbewegung nicht mehr mühsam von Hand gekeyt werden muss
  ([4.2-Blog](https://esotericsoftware.com/blog/Spine-4.2-The-physics-revolution)).
- **Wiederverwendung und kleine Daten:** Teile werden wiederverwendet statt Bild für Bild gezeichnet; Skins ergeben viele
  Kombinationen bei kaum mehr Daten; die Unity-Anbindung war für viele der Hauptgrund
  ([Steam-Diskussion Spriter gegen Spine](https://steamcommunity.com/app/332360/discussions/0/617319461034893318/)).
- **Breite der Laufzeiten** und ein Hersteller, der im Forum ausführlich antwortet (alle gelesenen Fäden).

**Kritik**

- **Lernkurve und Preis:** steiler als Spriter, die volle Fassung deutlich teurer, die günstige Fassung ohne Netze und IK
  (Steam-Diskussion, ältere Stimmen).
- **Der Baum:** In großen Projekten nur per Scrollen erreichbar; der Hersteller plant eigene Ansichten für Baumteile
  ([Forum 24176](https://esotericsoftware.com/forum/d/24176)). Ältere Vorschläge: Ordner für Animationen, Constraints höher im Baum,
  Knotenarten im Baum ausblenden, Constraint-Verbindungen hervorheben ([Forum 7463](https://esotericsoftware.com/forum/d/7463)).
- **Setup-Modus-Falle:** siehe 1.2 (Forum 10531, 13067).
- **Keine Formschlüssel:** Gesichter mit Constraints und Gewichten zu bauen ist mühsam verglichen mit Live2D, wo man Punkte zieht
  und als Formschlüssel speichert. Gewünscht: Formschlüssel je Teil, Grenzen für Constraints, automatische Überblendung beim
  Anhangwechsel. Der Hersteller will beim Ansatz Knochen plus Constraints bleiben, plant Joystick-artige Steuerung; Spiegeln habe
  hohe Priorität ([Forum 27847](https://esotericsoftware.com/forum/d/27847), [Forum 26046](https://esotericsoftware.com/forum/d/26046)).
- **Gewichte malen:** Ab etwa 10 Knochen sind die Farben kaum zu unterscheiden (auch für Farbenblinde), Glätten erreicht innere
  Punkte nur über eigene Kanten, Gewichte Punkt für Punkt sind auf dichten Netzen langsam
  ([Forum 15276](https://esotericsoftware.com/forum/d/15276)).
- **Viele Schlüssel:** Bei großen Schlüsselmengen wird Wählen träge; früher ließen sich nicht alle Schlüsselarten zusammen
  verschieben ([Forum 10420](https://esotericsoftware.com/forum/d/10420), älter).
- **Engine-Anbindung:** In Godot berichten Nutzer von Abstürzen beim Beenden und einem nötigen eigenen Editor-Build; ein Nutzer
  nennt die 2D-Skelettarbeit dort „very frustrating in practice“
  ([Godot-Forum](https://forum.godotengine.org/t/state-of-skeleton2d-in-godot-bone-2d-rigging-cutout-animations/65393)).

---

## 2. Die anderen Werkzeuge

### 2.1 DragonBones

- **Was es kann:** freies Skelett-Werkzeug für Windows und Mac mit Netzen, Freiformverformung (FFD), Haut mit Gewichten, IK und
  Pose-Werkzeug mit IK über mehrere Knochen, Kurveneditor, Zwiebelhaut, verschachtelten Animationen, Import aus Photoshop-Ebenen,
  Spine und Cocos, Export als JSON ([DragonBones](https://dragonbones.github.io/en/animation.html)).
- **Mischen zur Laufzeit:** `fadeIn(Name, Blendzeit, Wiederholungen, Ebene, Gruppe, Ausblend-Modus, additiv …)`. Höhere Ebenen
  bekommen zuerst Gewicht; ist es aufgebraucht, gehen tiefere leer aus. Gruppen bestimmen, welche Zustände einander ersetzen; ein
  Zustand kann darauf verzichten, die Anzeige der Plätze zu steuern
  ([Laufzeit-API](https://h1ve2.github.io/pixi-dragonbones-runtime/api/8.x/classes/AnimationState)). Mischzeiten je Paar als Tabelle
  gibt es nicht; die Blendzeit hängt am Aufruf.
- **Stand:** Die Website trägt Copyright bis 2017; die letzte Pro-Fassung ist 5.6.x (um 2018). Dritte beschreiben den Pro-Editor
  als geschlossen und teils an eine Anmeldung gebunden, Herausgeber Egret scheint das Projekt aufgegeben zu haben; Nutzer im
  Godot-Forum halten es für eingestellt (Angaben Dritter, keine offizielle Mitteilung).
- **Für uns:** keine Option; Gruppen und Ebenen beim Ausblenden sind eine brauchbare Idee für Schichten.

### 2.2 Spriter Pro

- **Was es kann:** Teile-Animation (Sprites drehen, verschieben, tauschen) mit Knochen, IK, Schlüsseln mit automatischen
  Zwischenbildern, Easing-Kurven, Pixel-Art-Modus, Kollisionsbereichen, punktgenauem Erzeugen von Geschossen und Partikeln,
  Tönen und Lippensynchronität (Papagayo) ([Steam](https://store.steampowered.com/app/332360/Spriter_Pro/)). Für Spiellogik
  interessant: **Character Maps** (Teile-Sätze tauschen und kombinieren), **Variablen** (im Ablauf gesetzt, im Spiel gelesen; Zahlen
  werden nicht interpoliert), **Tags**, **Ereignisse**, **Punkte** und **Boxen**
  ([Phaser-Player mit Pro-Funktionen](https://www.html5gamedevs.com/topic/20682-spriter-player-for-phaser-spriter-pro-features-added)).
- **Was fehlt:** Netze und Gewichte. Weiche Teile (Kleidung) musste man Bild für Bild zeichnen (Steam-Diskussion, 2015).
- **Stand:** erschienen am 14.11.2014, 54,99 €, 70 % positive von rund 200 Steam-Bewertungen. Spriter 2 mit Netzverformung war ab
  2018 vorbestellbar ([Ankündigung](https://www.gamedev.net/news/spriter-2-the-2d-animation-tool-now-available-for-pre-order-r483/));
  es gibt Hinweise auf Vorabfassungen (ein Build 0.7 mit Netz-Werkzeugen), eine fertige Fassung habe ich nicht gefunden; Nutzer
  nennen es lange verzögert (Godot-Forum).
- **Für uns:** keine Option. Die Idee, dass Animatoren **Variablen, Tags, Punkte und Boxen** selbst auf die Zeitleiste legen, ist
  für die Spiellogik wertvoll.

### 2.3 Creature (Kestrel Moon)

- **Aufbau:** drei Modi: Meshing (PNG zu Netzregionen, formen, unterteilen, schneiden), Rigging (Regionen, Knochen, Gewichte),
  Animation (Motoren, Kurven, Export) ([Modi und Inhaltsverzeichnis](https://kestrelmoon.com/creaturedocs/Overview/Main_Application_Modes.html)).
- **Gewichte:** Manuell (Pinsel mit Radius, Härte, Wert), **Auto** (Einfluss wird von einem Radius aus über Iterationen
  ausgebreitet), **Smart** (ein Klick, nur Glättungs-Iterationen; für Einsteiger empfohlen). Je Knochen lassen sich betroffene
  Regionen ein- und ausschließen, z. B. das andere Bein
  ([Gewichte](https://kestrelmoon.com/creaturedocs/Rigging/Rigging_Bone_And_Weighting_Mode.html)).
- **Smart AI Rig:** platziert Knochenknoten per Deep Learning über einer Standard-T-Pose und gewichtet auf Wunsch; **nur für
  Menschenfiguren**, nur Creature Pro für Windows, Ergebnis muss oft nachgezogen werden
  ([Smart AI Rig](https://kestrelmoon.com/creaturedocs/Rigging/Smart_AI_Rig.html)). Dazu Rig-Vorlagen und ein Konverter aus Spine.
- **Motoren statt Schlüssel:** Alle Bewegung kommt aus Motoren auf Knochen oder Regionen
  ([Motoren](https://kestrelmoon.com/creaturedocs/Animation/Motors_Introduction.html)). Knochen-Motoren: FK, IK, Smooth IK, IK
  Rotate, Bend Physics, Smooth Bend Physics, Pin Rope Physics, Rotate Cycle, Move Bounce, Free FK, Leg, Custom Cycle (eigene
  Keyframes als Zyklus), Reverse Foot, Path Bone. Verformungs-Motoren: Blink, Cage, Control Points, Flap, Physics, Simple
  Transform, Grid, Poly. Dazu Kraftfelder (Wind), „Motion Enhancers“ (Bewegung verstärken), Partikel, KI-Gang („Deep AI Walk“),
  Lippensynchronität.
- **Physik:** Bend Physics ist eine Kette aus mindestens zwei Knochen mit Steifigkeit, Dehnsteifigkeit, Dämpfung, Schwerkraftfaktor
  und den Modi „Stability“ (Form halten, stabil) und „Motion“ (lebhafter, instabiler)
  ([Bend Physics](https://kestrelmoon.com/creaturedocs/Animation/Bone_Motors/Bend_Physics_Motor.html)). Physik reagiert auf die
  Bewegung des Elternknochens; Steifigkeit und Dämpfung stellt man gemeinsam ein; Muskelspannung entsteht durch gekeyte
  Steifigkeit; bei der Flächenphysik malt man einen starren „Kleber“-Bereich innen, der Rand schwingt frei
  ([Physik verstehen](https://kestrelmoon.com/creaturedocs/Tutorials_And_Walkthroughs/Understanding_Physics_Motors.html)).
- **Animation Controllers:** Posen aus beliebigen Knochen- und Verformungsmotoren werden an den Ecken eines Polygons (bis 12 Punkte,
  optional Ruhepose in der Mitte) oder einer Linie abgelegt; ein gezogener Punkt mischt sie; gekeyt werden nur X und Y. Beispiele:
  Kopfdrehung in Pseudo-3D, Muskelspannung ([Controller](https://kestrelmoon.com/creaturedocs/Animation/Advanced_Character_Control_with_Animation_Controllers.html)).
  **Morph Targets** bringen dasselbe ins Spiel: Clips an Polygonecken, ein Zielpunkt dreht den Kopf live
  ([Morph Targets](https://kestrelmoon.com/creaturedocs/Animation/Morph_Targets_For_GameEngines.html)).
- **Export:** JSON und Binär wie Spine, dazu FBX und Alembic. Verformungs-Motoren blähen Exporte auf, weil jede Netzlage je Bild
  gespeichert wird. Ein Herstellervergleich behauptet 12 Minuten statt 2 Stunden 24 für dieselbe Schleife, weil Netze, Gewichte und
  Wind automatisch entstehen ([Vergleich des Herstellers](https://deepmotion.com/post/2d-game-animation-creature-vs-spine), parteiisch).
- **Stand:** Die Handbücher sind online; ein Changelog-Spiegel endet 2018, den aktuellen Pflegestand konnte ich nicht belegen.
- **Für uns:** keine Option (bildbasiert, unklare Pflege, KI-Rig nur für Menschen). Zwei Ideen sind Gold wert: **Motoren** als
  wiederverwendbare prozedurale Bausteine (Wedeln, Wippen, Gang) und **Controller** als 2D-Feld aus Posen.

### 2.4 Unity 2D Animation (mit PSD Importer und Animator)

- **Import:** Der PSD Importer macht aus einer .psb-Datei ein Prefab mit einem Sprite je Ebene, in der Anordnung der Datei
  („Character Rig“) oder als Atlas („Mosaic“). Mischmodi, Deckkraft und Effekte der Ebenen gehen verloren
  ([PSD Importer](https://docs.unity3d.com/Packages/com.unity.2d.psdimporter@9.0/manual/index.html)).
- **Skinning-Editor:** Knochen ziehen (Kette setzt sich fort); **Auto Geometry** mit Umriss-Detail, Alpha-Toleranz,
  Unterteilung und optional sofortigen Gewichten; Punkte, Kanten, Kanten teilen; **Auto Weights** nur für Sprites, deren Netz
  von Knochen geschnitten wird, mit Normalisieren; Gewichts-Regler und -Pinsel mit den Modi Hinzufügen/Abziehen,
  Wachsen/Schrumpfen (nur schon beeinflusste Punkte) und Glätten; Listen „welche Knochen wirken auf dieses Sprite“ und umgekehrt;
  **Preview Pose** zum Ausprobieren, ohne zu speichern ([Rigging-Ablauf](https://docs.unity3d.com/Packages/com.unity.2d.animation@10.1/manual/CharacterRig.html),
  [Werkzeuge](https://docs.unity3d.com/Packages/com.unity.2d.animation@10.1/manual/SkinEdToolsShortcuts.html)).
- **2D IK:** Ein IK-Manager am Wurzelknochen mit Löserliste (Reihenfolge zählt), Löser **Limb** (zwei Knochen), **CCD** und
  **FABRIK** (Ketten mit Länge, Iterationen, Toleranz), Gewicht je Löser und gesamt
  ([2D IK](https://docs.unity3d.com/Packages/com.unity.2d.animation@10.1/manual/2DIK.html)).
- **Übergänge (Animator):** Jeder Übergang ist ein Pfeil zwischen zwei Zuständen mit Dauer (Sekunden oder Anteil), Austrittszeit,
  Startversatz im Ziel, Unterbrechungsregeln und Bedingungen über Parameter. Der Übergangsgraph zeigt, wie sich die Clips
  überlappen, und als Linie die **Fußkontakte**, damit beim Überblenden kein Fuß rutscht
  ([Übergänge](https://docs.unity.com/en-us/engine/current/manual/animation-section/animation-mecanim/animation-animator-controller/animation-state-machines/class-transition)).
- **Für uns:** keine Option (Engine-Editor, Programmieren nötig, bildbasiert). Übernehmen: **Auto Geometry plus Auto Weights in
  einem Schritt**, **Probierpose ohne Speichern**, **Fußkontakt im Übergang sichtbar machen**.

### 2.5 Godot Skeleton2D und Polygon2D

- **Ablauf:** Polygon2D mit Textur, Umriss im UV-Editor punktweise ziehen, nach Verschieben „Copy Polygon to UV“; Skeleton2D mit
  Bone2D-Baum; Ruhepose überschreiben (nach jeder Knochenänderung erneut); Knochen **von Hand** mit dem Polygon synchronisieren,
  Gewichte malen (weiß voll, schwarz nichts). Die automatische Triangulation biegt oft unerwartet; dann innere Punkte von Hand
  ergänzen ([2D-Skelette](https://docs.godotengine.org/en/stable/tutorials/animation/2d_skeletons.html)).
- **Nachschwingen:** `SkeletonModification2DJiggle` (experimentell) mit Steifigkeit, Masse, Dämpfung, Schwerkraft, Überschreiben je
  Gelenk und **Kollision mit Collidern** ([Jiggle](https://docs.godotengine.org/en/stable/classes/class_skeletonmodification2djiggle.html)).
- **Übergänge:** Der AnimationPlayer hat eine Standard-Blendzeit und **Blendzeiten je Paar** (`set_blend_time(von, nach, s)`),
  Warteschlange und Folge-Animation ([AnimationPlayer](https://docs.godotengine.org/en/stable/classes/class_animationplayer.html)).
  Der AnimationTree hat BlendSpace1D/2D (Punkte in einer Fläche, Delaunay-Dreiecke, diskreter Modus für Bild-für-Bild), einen
  Zustandsautomaten mit Blendzeit und **Blendkurve** je Übergang, Umschaltmodi (sofort, synchron, am Ende), Bedingungen und
  Ausdrücken, Prioritäten und **`travel()`, das per A* einen Weg über Zwischenzustände zum Ziel sucht**; dazu Root Motion
  ([AnimationTree](https://docs.godotengine.org/en/stable/tutorials/animation/animation_tree.html)).
- **Stimmen:** viel Handarbeit, Doku dünner als sonst in Godot; ein Asset („Scalable Vector Shapes 2D“) bringt Skeleton2D-Rigging
  für Vektorformen (Godot-Forum, 2024–2026).
- **Für uns:** keine Option als Werkzeug. Übernehmen: **Blendzeiten je Paar plus Wegsuche über Zwischenzustände**, **Blendkurve
  je Übergang**, **Kollision im Nachschwingen**.

### 2.6 Übersicht

| | Spine 4.3 | DragonBones | Spriter Pro | Creature | Unity 2D | Godot 2D |
|---|---|---|---|---|---|---|
| Grafik | Bilder auf Netzen | Bilder auf Netzen | Bilder, starr | Bilder auf Netzen | Bilder auf Netzen | Bilder auf Polygonen |
| Vektorformen | nein (Pfade nur als Hilfslinien) | nein | nein | nein | nein | nur per Zusatz-Asset |
| Gewichte | ja, sehr reif | ja | nein | ja (manuell/auto/smart) | ja (auto) | ja (von Hand) |
| Auto-Geometrie | Trace, Generate | – | – | Meshing | Auto Geometry | – |
| Auto-Knochen | nein | nein | nein | nur Menschenfiguren | nein | nein |
| Formschlüssel | ganze Fläche, geradlinig | FFD | – | Verformungs-Motoren | – | – |
| Regler/Posenfeld | Slider (4.3) | – | – | Controller (1D/2D) | Blend Trees | BlendSpace1D/2D |
| Nachschwingen | Physik je Knochen | – | – | Motoren (Kette, Fläche, Wind) | – | Jiggle (experimentell, mit Kollision) |
| Übergänge | Mischzeit je Paar (Laufzeit), Spuren | Fade mit Ebene/Gruppe | – | – | Pfeile mit Bedingungen | Blendzeit je Paar, A*-Weg |
| Spiellogik-Daten | Ereignisse, Rahmen, Punkte | Ereignisse | Variablen, Tags, Punkte, Boxen | – | über Engine | über Engine |
| Editor-Plattform | Win, Mac, Linux | Win, Mac | Desktop (nicht geprüft) | Win, Mac | Engine | Engine |
| Pflege | sehr aktiv | verwaist (Dritte) | ruht | unklar | aktiv | aktiv, 2D-Teile experimentell |

„–“ heißt hier und in den Tabellen unten: in den gelesenen Quellen nicht vorhanden oder nicht beschrieben.

---

## 3. Mechaniken im Querschnitt

### 3.1 Morph und Knochen: wie sie zusammenspielen

**Was es gibt**

- **Gewichte (Haut):** Jeder Punkt folgt einer gewichteten Summe von Knochenbewegungen. Robust, sparsam, unabhängig je Knochen
  animierbar; überall vorhanden.
- **Freie Formschlüssel:** Spines Verformungsschlüssel, DragonBones' FFD. Ganze Fläche je Schlüssel, geradlinige Punktbahnen,
  schwer zu überarbeiten. Genau die Schwäche, an der Formen beim Drehen schrumpfen und knicken (siehe
  [`../2026-11-16-ozzy-morph-und-animation.md`](../2026-11-16-ozzy-morph-und-animation.md)).
- **Getriebene Formschlüssel (Regler):** Spine-Slider (ab 4.3), Live2D-Parameter, Creature-Controller, Unity Blend Trees, Godot
  BlendSpaces. Die Form hängt nicht an der Zeit, sondern an einem Wert (Kopfwinkel, Knochendrehung, Tempo).

**Das entscheidende Detail aus Spine.** Bei gewichteten Netzen addiert die Laufzeit den Verformungsversatz **je Knochen-Einfluss im
lokalen Raum des Knochens** und transformiert erst danach mit dem Knochen
([Laufzeit-Code](https://github.com/EsotericSoftware/spine-runtimes/blob/4.2/spine-ts/spine-core/src/attachments/Attachment.ts)):
Der Punkt wird für jeden Einfluss mit seinem eigenen Versatz in die Welt gebracht und dann nach Gewicht summiert. Folge: Eine
Formkorrektur, die man bei gebeugtem Bein zeichnet, dreht mit dem Bein mit und bleibt bei jeder Lage richtig. Ungewichtete Netze
ersetzen ihre Punkte durch die Schlüssellagen im Raum ihres einen Knochens.

**Gewichte auf Griffen und warum Spine gleiche Gewichte empfiehlt.** Bei linearer Haut bildet jeder Punkt mit der gewichteten Summe
der Knochenmatrizen ab. Haben Anker und beide Griffe **dieselben Gewichte**, erfahren alle drei **dieselbe affine Abbildung**;
affine Abbildungen erhalten Geraden und Teilverhältnisse, ein glatter Anker bleibt glatt. Weichen die Gewichte ab, bekommt jeder der
drei Punkte eine andere Abbildung; die Griffe verlassen ihre gemeinsame Gerade, und am Anker entsteht ein Knick. Spine sagt nur
„gleiche Gewichte für beste Ergebnisse“ ([Pfade](https://esotericsoftware.com/spine-paths)); die Begründung ist meine Rechnung.
Florians Wunsch, Griffe einzeln zu gewichten, ist also sinnvoll, aber nur mit Glätte-Schutz:

- **Standard:** Griffe erben die Gewichte ihres Ankers (glatt garantiert).
- **Eigene Griff-Gewichte** wirken nicht auf die Lage, sondern auf **Richtung und Länge**: Der Anker wird normal gehäutet; bei
  glatten Ankern drehen beide Griffe um dieselbe gewichtete Drehung (sie bleiben auf einer Geraden), ihre **Längen** dürfen eigenen
  Gewichten folgen. Nur bei **Ecken** (bewusst geknickten Ankern) darf jeder Griff eine eigene Drehung haben. Das ist dieselbe
  Regel, nach der der Prototyp schon zwischen Schlüsseln mischt (Griffe nach Winkel und Länge, glatt bleibt glatt).

**Folgerung.** Knochen machen die große Bewegung, Schlüsselformen die Feinform, und zwar **im Raum des Knochens**; Schlüsselformen
werden weich gemischt (PCHIP, Winkel und Länge) statt geradlinig; Schlüsselformen können an der Zeit, an einem Regler oder an der
Drehung eines Knochens hängen (Korrekturform je Gelenkwinkel, wie Spines Slider mit Knochen als Treiber).

### 3.2 Übergänge von jeder Pose in jede

| Verfahren | Wer legt fest | je Paar | Kurve | Unterbrechen | Weg über Zwischenposen | Kontakt/Anker |
|---|---|---|---|---|---|---|
| Spine AnimationState | Programmierer (Laufzeit) | ja, gerichtet, mit Standard | ab 4.3 | ab 4.3 ohne Einsacken | – | – |
| Godot AnimationPlayer | Editor | ja, mit Standard | – | – | nur Folge-Animation | – |
| Godot AnimationTree | Editor (Graph) | je Pfeil | ja | Umschaltmodi | **ja, A*** | – |
| Unity Animator | Editor (Graph) | je Pfeil | – | Unterbrechungsquelle | – | **Anzeige** der Fußkontakte |
| DragonBones | Programmierer | – (je Aufruf) | – | Ausblend-Modi | – | – |
| Unser Prototyp | Abläufe in Code, Steuerung | je Haltungspaar | Zeitkurven | **kritisch gedämpfte Feder** | **ja** (über Hocke und Diener) | **ja** (`steht`: Vorder-/Hinterpfoten, Hintern) |

Lehren:

- **Gerichtet und mit Standard** (Spine, Godot): Jede Zelle der Matrix hat einen Wert, die meisten den Standard. Das ist die
  minimale, verständliche Form.
- **Kurve je Übergang** (Spine 4.3, Godot): Eine lineare Überblendung wirkt mechanisch; eine Kurve kostet nichts.
- **Kein Einsacken beim Unterbrechen** (Spine 4.3): Unser Prototyp löst das schon mit einer Feder auf den Gewichten.
- **Weg über Zwischenposen** (Godot `travel()` mit A*): Wer „von Liegen zu Stehen“ verlangt, bekommt automatisch „Liegen →
  Sitzen → Stehen“, wenn nur diese Übergänge gezeichnet sind. Der Prototyp macht das von Hand; im Editor sollte es automatisch sein.
- **Kontakt** (nur Unity zeigt ihn, keiner hält ihn): Was beim Übergang auf dem Boden bleibt, ist für eine glaubwürdige Figur
  wichtiger als die Dauer. Das ist eine echte Lücke aller Werkzeuge.
- **Diskrete Wechsel** (Anhang, Zeichenreihenfolge) schalten in allen Werkzeugen an Schwellen um und springen. Unser Renderer kann
  Flächen weich verschmelzen; Wechsel der Reihenfolge lassen sich damit überblenden statt umschalten.

### 3.3 Physik

| Modell | Wo | Stärken | Schwächen |
|---|---|---|---|
| Versatz je Knochen um die Pose | Spine 4.2/4.3 | stabil, folgt der gekeyten Pose, leicht einzustellen, läuft in allen Engines gleich | keine Kollision, keine echte Kette, Rate 30–60 |
| Kette mit Steifigkeit | Creature Bend Physics | Schwanz, Seil, Stoff in einem Motor | Modus „Motion“ instabil; Steifigkeit und Dämpfung hängen aneinander |
| Fläche mit „Kleber“ | Creature Deform Physics | Bauch, Backen, Wabbeln | Export schwer (jede Netzlage je Bild) |
| Jiggle mit Collidern | Godot (experimentell) | Kollision | experimentell |
| Knoten und Federn | Spine-Vorabversion, verworfen | frei | hängt durch oder streckt sich (Hersteller) |

Lehren:

- **Nachschwingen gehört um die gekeyte Pose** (Spine): Die Pose bleibt die Wahrheit, die Physik legt Nachziehen und Überschwingen
  darüber. Das passt zu Florians Grundsatz, dass sein Auge entscheidet: Seine Pose wird nie von der Physik verdrängt.
- **Parameter zum Übernehmen:** Trägheit, Stärke, Dämpfung, Masse, Wind, Schwerkraft, Grenze, Mix, Volumen erhalten; je Kanal
  (X, Y, Drehung, Scherung, Skalierung) zuschaltbar; ein Referenzmaß der Figur.
- **Besser machen:** Vorlagen statt Zahlen („Ohr“, „Schwanz“, „Bart“, „Bauch“), Kollision mit dem eigenen Körper und dem Boden
  (Godot hat sie, Spine nicht), feste kleine Teilschritte statt 30–60 je Sekunde (der Prototyp rechnet mit 1/240 s), Wind aus dem
  Fahrtwind, Schwerkraft aus der Lage.
- **Weltphysik ist eine zweite Schicht.** Ozzy auf dem Rad braucht Körper, Kontakte, Balance, Stolpern und Fallen. Das macht keines
  der Skelett-Werkzeuge; dort ist es Sache der Engine und des Programmierers. Unser Editor muss diese Schicht so einstellbar machen
  wie die Posen: Die Posen sind Ziele, die Physik zieht den Körper dorthin oder lässt ihn fallen.
- **Physik festhalten** (Spine 4.3 „Key Constrained“): Bewegung aus Physik in Schlüssel wandeln und danach von Hand formen. Das
  entspricht Florians Wunsch, Übergänge selbst zu formen statt raten zu lassen.
- **Scrubben ohne Überraschungen** (Spine „Deterministic“) und **Einschwingen für Schleifen** („Warm Up“) übernehmen.

### 3.4 Autorig und automatische Gewichte

| Werkzeug | Netz/Umriss | Knochen | Gewichte | Haken |
|---|---|---|---|---|
| Spine | Trace aus Alpha, Generate (Raster) | von Hand | Auto nach Netztopographie | Knochen müssen das Netz überdecken; Trace/Generate löschen Gewichte |
| Unity 2D | Auto Geometry (Detail, Alpha, Unterteilung) | von Hand | Auto Weights, Normalisieren | nur Sprites, die Knochen schneiden |
| Creature | Meshing aus PNG | Smart AI Rig (nur Menschenfiguren), Vorlagen | Smart, Auto (Ausbreitung), manuell | KI nur Windows Pro |
| Godot | von Hand | von Hand | von Hand | Synchronisieren von Hand |
| Forschung: BBW | – | Punkte, Knochen beliebig kombiniert | glatt, begrenzt, örtlich, formbewusst; einmal rechnen, dann Echtzeit | – |

([BBW, SIGGRAPH 2011](https://igl.ethz.ch/projects/bbw/))

Lehren für uns: Unsere Formen sind schon das Netz (Anker und Griffe); es gibt kein Netz zu erzeugen. Ein Autorig kann aus der
**Mittelachse** jeder Form Knochenketten vorschlagen (Bohne: Kette aus zwei bis drei Knochen; Beine: zwei Knochen mit Rückgrat;
Schwanz: Kette; Ohren: ein bis zwei Knochen mit Schwung), **Vorlagen** (Vierbeiner wie Ozzy) geben die Namen und die
Physik-Voreinstellungen, und formbewusste glatte Gewichte (Art BBW, Abstand innerhalb der Form statt Luftlinie) gelten für Anker;
Griffe erben sie (3.1). Knochen dürfen außerhalb der Fläche liegen, ohne dass etwas versagt. Florian zieht danach nur noch, was
nicht passt.

### 3.5 Zeitleiste oder etwas Besseres?

| System | Vorbild | Stärke | Schwäche | Für unseren Fall |
|---|---|---|---|---|
| Dopesheet plus Kurveneditor | Spine, Unity | genaues Timing, überlappende Bewegung, vertraut | dicht, viele Zeilen, Lernkurve; Timing und Werte getrennt | nur auf Wunsch, als Detail |
| Posen-Karten (von Pose zu Pose) | Prototyp-Werkzeug (Schlüssel als Karten) | denkt wie ein Zeichner, wenige Elemente | Überlappung fehlt | Hauptform eines Ablaufs |
| Regler mit Schlüsseln | Spine-Slider, Live2D, Creature-Controller | ideal für Spiel und Drehen, kein Zeitbezug nötig | kein Timing | Hauptform für Figur und Spiel |
| Zustandsgraph mit Pfeilen | Unity, Godot | Logik sichtbar | Pfeile wuchern | ersetzt durch Übergangs-Matrix plus Wegsuche |

Ehrliches Urteil: Ein klassisches Dopesheet braucht man für feines Schauspiel-Timing; als **Einstieg** ist es für einen
Character- und Physik-Spieleditor das falsche Werkzeug. Spine selbst geht mit Physik, Slidern und „Key Constrained“ in Richtung
weniger Schlüssel. Für uns: **Posen und Regler zuerst**, ein Ablauf ist eine Leiste aus Posen-Karten mit Kurvenvorlage je Abschnitt
und Versatz-Griffen für Überlappung (Ohr später als Kopf), die Physik ersetzt das meiste Nachkeyen; der volle Kurveneditor öffnet
sich nur für eine gewählte Eigenschaft. Übernehmen aus Spine: Favor-Regler (Zwischenpose Richtung vorherige/nächste Pose ziehen),
Zwiebelhaut, Kurvenvorlagen, „Adjust“ (alle gewählten Schlüssel gemeinsam verschieben).

---

## 4. Ehrliche Gegenüberstellung für unseren Fall

**Kriterien** (in der Reihenfolge ihres Gewichts): (1) Vektorformen aus Bézier-Ankern, exakt wie gezeichnet; (2) glatte Morphs und
gutes Zusammenspiel mit Knochen; (3) Nachschwing- und Weltphysik sowie Spiellogik; (4) unser Look (Verschmelzen, Verjüngungen statt
Outlines); (5) Bedienung ohne Programmieren; (6) Mac, iPad, iPhone; (7) Pflege, Lizenz, Kosten.

| Kriterium | Spine | DragonBones | Spriter | Creature | Unity 2D | Godot 2D | Eigener Editor |
|---|---|---|---|---|---|---|---|
| (1) Vektor exakt | nein | nein | nein | nein | nein | teils (Asset) | ja |
| (2) glatte Morphs | teils (geradlinig; Slider) | teils | nein | teils | nein | nein | ja (Prototyp belegt es) |
| (2) Knochen und Gewichte | ja, sehr gut | ja | nur starr | ja | ja | ja, mühsam | zu bauen |
| (3) Nachschwingen | ja | nein | nein | ja | nein | teils | zu bauen (Vorbild Spine) |
| (3) Weltphysik und Logik | nein (Engine) | nein | teils (Variablen) | nein | ja, mit Code | ja, mit Code | ja (Ziel) |
| (4) unser Look | nein | nein | nein | nein | nein | nein | ja (Renderer vorhanden) |
| (5) ohne Programmieren | ja | ja | ja | ja | nein | nein | Ziel |
| (6) iPad/iPhone | nur Laufzeit | nein | nein | nein | nein | nein | ja (Web) |
| (7) Pflege, Lizenz | sehr gut; 379 $; Editor-Produkte verboten | verwaist | ruht | unklar | gut | gut, 2D experimentell | unsere Verantwortung |

**Urteil.** Bräuchten wir nur ein Spiel mit gezeichneten Rasterfiguren, wäre Spine die sichere Wahl: reif, gepflegt, mit Physik
und Laufzeiten für alles. Unsere Grundlage sind aber Vektorformen, die exakt wie Florians Zeichnungen aussehen, weich morphen und
miteinander verschmelzen. Das kann keines der Werkzeuge, und der Look ist nicht verhandelbar. Deshalb: **eigener Editor**, aber
ohne das Rad neu zu erfinden. Spines Laufzeit-Semantik ist ein gutes Pflichtenheft (Knochenbaum, Zeichenreihenfolge, Constraints,
Physik-Parameter, Spuren und Mischen, Ereignisse mit Schwellen, Varianten), Creatures Motoren und Controller, Godots Wegsuche und
Unitys Auto-Geometrie liefern die fehlenden Ideen. Der Aufwand ist real; ihn trägt, dass der Prototyp die schwierigsten Teile
(glatte Schlüsselformen, Faltschlüssel, Verschmelzen, Abläufe mit Ankern, Feder-Steuerung) schon zeigt.

**Lizenzfolge:** Im eigenen Editor keinen Spine-Laufzeitcode verwenden und kein Spine-Format als Export anbieten, solange der Editor
an andere gehen könnte (Abschnitt 2.1 der Editor-Lizenz). Begriffe und Ideen sind frei; Code und Format bleiben unsere eigenen.

---

## 5. Empfehlungen für unseren Editor

### 5.1 Begriffe (Vorschlag; Florian entscheidet)

| Spine | Studio | Bemerkung |
|---|---|---|
| Skeleton | Figur | |
| Bone | Knochen | |
| Slot | Ebene | Platz in der Zeichenreihenfolge |
| Attachment | Form | Vektorform aus Ankern und Griffen; Varianten je Ebene |
| Mesh | entfällt | die Form selbst ist das Netz |
| Weights | Gewichte | auf Ankern, Griffe erben (3.1) |
| Deform key | Schlüsselform | weich gemischt, im Knochenraum |
| Setup pose | Grundpose | eine Pose wie jede andere |
| Animation | Ablauf | Leiste aus Posen-Karten |
| Mix | Übergang | Zelle der Übergangs-Matrix |
| Track | Schicht | z. B. Kopf über Gang |
| IK constraint | Ziel | Pfote zieht Bein |
| Transform constraint | Kopplung | |
| Path constraint | Bahn | Rückgrat von Bein und Schwanz |
| Physics constraint | Schwung | Nachschwingen |
| Slider | Regler | Grundbaustein (5.2) |
| Skin | Variante | |
| Event | Marke | |
| Bounding box / Point | Zone / Punkt | „Fühler“ für die Spiellogik |

### 5.2 Übernehmen

1. **Datenmodell nach Spine:** Knochenbaum mit Drehung, Verschiebung, Skalierung, Scherung; Ebenen, die die Zeichenreihenfolge vom
   Knochenbaum trennen; Varianten mit Platzhaltern; Ereignisse mit Nutzlast. Daten (teilbar, zustandslos) und Zustand (je Figur)
   getrennt halten, wie `AnimationStateData` und `AnimationState`.
2. **Posen-Modell von 4.3:** Grundpose, Pose ohne Kopplungen, Pose mit Kopplungen, angewendete Pose getrennt halten; Physik rechnet
   relativ zur Pose ohne Kopplungen.
3. **Morph im Knochenraum:** Schlüsselformen als Versatz im Raum des Knochens ablegen (bei mehreren Einflüssen je Einfluss) und
   erst danach häuten (Laufzeit-Code von Spine).
4. **Physik-Parameter von Spine** (Trägheit, Stärke, Dämpfung, Masse, Wind, Schwerkraft, Grenze, Mix, Volumen erhalten) je Kanal,
   Referenzmaß der Figur, deterministisches Scrubben, Einschwingen für Schleifen, „Physik festhalten“ als Schlüssel.
5. **Mischen nach Spine:** gerichtete Übergänge mit Standardwert, Kurve je Übergang, Schichten mit Alpha und additiv, Schwellen für
   Marken und diskrete Wechsel, kein Einsacken beim Unterbrechen.
6. **IK nach Spine:** ein oder zwei Knochen, Softness, Stretch mit Volumen, Biegerichtung; Pose-Werkzeug (Pfote ziehen, Kette
   folgt) als Bedienung im Editor.
7. **Bahn nach Spine:** Kette mit Skalierung für Rückgrat von Bein und Schwanz (der Prototyp tut das schon mit Bogenlänge).
8. **Werkzeuge der Zeitleiste:** Favor-Regler, Zwiebelhaut, Kurvenvorlagen, gemeinsames Verschieben, Hinweis-Ansicht mit
   Ein-Klick-Lösungen (Spine 4.3).
9. **Aus Creature:** Motoren als wiederverwendbare Bewegungen (Wedeln, Wippen, Tapsen) und Controller als 2D-Feld aus Posen.
10. **Aus Unity:** Umriss und Gewichte in einem Schritt, Probierpose ohne Speichern, Fußkontakt im Übergang sichtbar.
11. **Aus Godot:** Wegsuche über Zwischenposen, Blendkurve je Übergang, Kollision im Nachschwingen.
12. **Aus Spriter:** Variablen, Tags, Punkte und Boxen auf der Zeitleiste für die Spiellogik.

### 5.3 Besser machen

1. **Vektornativ:** Keine Dreiecksnetze, keine Texturen, keine UVs. Die Form aus Ankern und Griffen ist das, was Knochen bewegen
   und Schlüssel formen; der Renderer zeichnet sie glatt und verschmilzt Flächen.
2. **Weiche Schlüsselformen statt gerader Bahnen:** PCHIP für Anker, Winkel und Länge für Griffe, Faltschlüssel gegen
   aneinander vorbeilaufende Anker (Prototyp). Schlüssel nur für einen Teil einer Form erlauben (Spines größter Mangel laut Nutzern).
3. **Regler als einziger Grundbaustein:** Zeit, Kopfwinkel, Tempo, Neigung, Haltung und jede Korrekturform sind Regler mit
   Schlüsseln. Ein Regler wird von Hand, von einem Knochen (Korrekturform je Gelenkwinkel), von der Physik oder von der Spiellogik
   getrieben. Alles funktioniert gleich: wählen, ziehen, Schlüssel setzen, Kurve wählen.
4. **Übergangs-Matrix statt Pfeilgewirr:** ein Raster „von“ × „nach“ mit kleinen Filmstreifen; leere Zellen nehmen Standarddauer
   und -kurve oder den kürzesten Weg über gezeichnete Übergänge; eine Zelle kann einen eigenen Zwischenablauf halten mit **Anker**
   (was stehen bleibt), Zeitkurve und Effekten (Hüpfer, Aufprall, Seufzer). Unterbrechen jederzeit über eine kritisch gedämpfte
   Feder. Die Übergänge liegen im Editor und gehen mit ins Spiel; kein Programmierer muss sie nachtragen.
5. **Physik in zwei Schichten:** Schwung um die Pose (Spine-Modell, mit Vorlagen und Kollision) und Weltphysik für Körper,
   Kontakte, Balance, Stolpern und Fallen, mit Posen als Zielen.
6. **Keine Setup/Animate-Falle:** Die Grundpose ist eine Pose. Wird sie geändert, fragt der Editor: „In allen Posen ausgleichen?“
   (Spines offener Wunsch #167). Ausprobieren geht immer in einer Probierpose, die nichts speichert. Keine Bindungspose, die der
   Nutzer verwalten muss: Ändert sich die Grundpose, bindet der Editor selbst neu.
7. **Griff-Gewichte mit Glätte-Schutz** (3.1): Standard gleich dem Anker; eigene Gewichte nur auf Länge, bei Ecken auch auf
   Richtung.
8. **Autorig aus der Form** (3.4): Mittelachse, Vorlage „Vierbeiner“, formbewusste glatte Gewichte, Physik-Voreinstellungen je
   Knochenart.
9. **Spiegeln eingebaut:** Paare links/rechts für Knochen, Formen, Posen und Schlüssel; spiegelgleiche Hälften wie im Kopfraster
   (Spine fehlt das bis heute).
10. **Diskrete Wechsel weich:** Wechsel der Zeichenreihenfolge (Ohr vor oder hinter dem Kopf beim Drehen) und Formwechsel über den
    Renderer kurz überblenden statt springen.
11. **Gewichte lesbar machen:** nicht zehn ähnliche Farben, sondern nur der gewählte Knochen hell, der Rest grau; Gewicht als
    Wärme auf der Form, Zahlen nur auf Wunsch.
12. **Baum ersetzen:** Auswahl direkt auf der Figur, Liste nur gefiltert für das Gewählte; keine Navigation durch einen langen
    Baum (Spines meistgenannte Klage).
13. **Ein Format, das wandert:** eigenes JSON mit Versionsnummer und Übersetzung alter Stände beim Laden, statt „neu exportieren“
    bei jeder großen Version.

### 5.4 Reihenfolge der Rechnung (Vorschlag)

1. Regler-Werte bestimmen (Zeit, Spiel, Physik, Hand).
2. Lokale Knochenlagen aus Posen und Schichten mischen (Übergänge, Federn).
3. Kopplungen anwenden (Ziel, Kopplung, Bahn) → Pose mit Kopplungen.
4. Schwung (Nachschwingen) relativ zur Pose ohne Kopplungen; Kollision.
5. Weltlagen der Knochen.
6. Schlüsselformen der Regler mischen (PCHIP, Winkel/Länge), als Versatz im Knochenraum.
7. Häuten: Anker nach Gewichten, Griffe nach Richtung und Länge (3.1).
8. Zeichnen: Ebenen in Reihenfolge, Verschmelzen, Verjüngungen.

### 5.5 Für Ozzy und das Rad-Spiel

- **Rig:** Bohne als Kette, Beine mit zwei Knochen und Rückgrat (Bahn mit Skalierung), Ziel je Pfote auf der Radoberfläche (IK
  passt Ziele zur Laufzeit an unebenen Boden an; bei uns an die Krümmung), Kopf an einem Knochen mit Regler „Kopfwinkel“ (das
  vorhandene Raster), Ohren, Schwanz und Bart mit Schwung; Wind aus der Drehgeschwindigkeit des Rads.
- **Regler:** Tempo (Tapsen, Laufen, Stolpern), Neigung (bergauf, bergab), Balance (Schwanken), Kopfwinkel; Tempo × Neigung als
  2D-Feld wie ein BlendSpace oder Creature-Controller.
- **Übergänge:** Stehen ↔ Tapsen ↔ Laufen mit Anker „Pfote am Boden“; Stolpern und Hinfallen als Übergang, den die Weltphysik
  auslöst; „Physik festhalten“, damit Florian einen Sturz nachformen kann.
- **Marken und Fühler:** „Pfote setzt auf“ (Ton, Staub), „stolpert“, „fällt“ als Marken; Zonen an Pfoten und Körper für Hindernisse.

---

## 6. Offene Fragen

1. Ist „Studio“ nur unser Werkzeug oder ein Produkt für andere? Davon hängen Lizenzfragen (kein Spine-Export), Plattformen und
   Pflegeaufwand ab.
2. Brauchen Formen jemals Rasterbilder (Texturen, Fell)? Wenn ja, als Füllung einer Vektorform, nicht als Netz wie in Spine?
3. Schlüsselformen: absolut speichern (genau Florians Zeichnung) oder als Versatz im Knochenraum, oder absolut eingeben und intern
   umrechnen? Wie sollen absolute Schlüssel wirken, wenn der Knochen anders steht als beim Zeichnen?
4. Wie viele Knochen je Anker (Spine begrenzt per Prune frei; zwei bis vier scheinen genug)?
5. Reicht Florian der Glätte-Schutz bei Griff-Gewichten (Länge frei, Richtung nur bei Ecken), oder will er Griffe ganz frei?
6. Wo endet Nachschwingen, wo beginnt Weltphysik (z. B. Wabbeln der Bohne als Fläche mit „Kleber“ wie in Creature)?
7. Kollision im Nachschwingen: Ohr gegen Kopf, Schwanz gegen Boden und Rad, wie weit ist das nötig?
8. Übergänge: standardmäßig automatisch (Feder, Kurve, Wegsuche) und nur besondere gezeichnet, oder jede wichtige Zelle gezeichnet?
9. Begriffe der Oberfläche (Regler, Kopplung, Bahn, Schwung, Marke, Fühler): Florian entscheidet.
10. Wechsel der Zeichenreihenfolge beim 360°-Drehen weich überblenden: gefällt ihm das im Bild, oder will er einen harten Wechsel an
    einem Winkel, den er setzt?
11. Braucht es Schichten (Kopf über Gang) schon für Ozzy, oder reicht zuerst eine Schicht plus Regler?

---

## 7. Quellen

**Spine (Hersteller)**

- Grundbegriffe: <https://esotericsoftware.com/spine-basic-concepts>
- Schlüssel: <https://esotericsoftware.com/spine-keys>
- Netze: <https://esotericsoftware.com/spine-meshes>
- Gewichte: <https://esotericsoftware.com/spine-weights>
- Blog „Mesh weight workflows“: <https://esotericsoftware.com/blog/Mesh-weight-workflows>
- IK: <https://esotericsoftware.com/spine-ik-constraints>
- Transform: <https://esotericsoftware.com/spine-transform-constraints>
- Pfad-Constraint: <https://esotericsoftware.com/spine-path-constraints>
- Pfade: <https://esotericsoftware.com/spine-paths>
- Physik: <https://esotericsoftware.com/spine-physics-constraints>
- Slider: <https://esotericsoftware.com/spine-sliders>
- Skins: <https://esotericsoftware.com/spine-skins>
- Ereignisse: <https://esotericsoftware.com/spine-events>
- Animationen anwenden: <https://esotericsoftware.com/spine-applying-animations>
- API-Referenz: <https://esotericsoftware.com/spine-api-reference>
- Vorschau: <https://esotericsoftware.com/spine-preview>
- Dopesheet: <https://esotericsoftware.com/spine-dopesheet>
- Graph: <https://esotericsoftware.com/spine-graph>
- Funktionen im Überblick: <https://esotericsoftware.com/spine-in-depth>
- Blog 4.2 (Physik): <https://esotericsoftware.com/blog/Spine-4.2-The-physics-revolution>
- Blog 4.3: <https://en.esotericsoftware.com/blog/Spine-4.3-released>
- Changelog (4.3 stabil am 14.05.2026): <https://eu.esotericsoftware.com/spine-changelog>
- Tutorial neue Posen: <https://esotericsoftware.com/blog/Rigging-new-poses-tutorial>
- Kauf und Editionen: <https://esotericsoftware.com/spine-purchase>
- Download und Plattformen: <https://esotericsoftware.com/spine-download>
- Editor-Lizenz: <https://esotericsoftware.com/spine-editor-license>
- Laufzeit-Lizenz: <https://esotericsoftware.com/spine-runtimes-license>
- Laufzeit-Code (Verformung im Knochenraum): <https://github.com/EsotericSoftware/spine-runtimes/blob/4.2/spine-ts/spine-core/src/attachments/Attachment.ts>

**Spine (Forum, Stimmen)**

- Rückmeldung eines Nutzers (Gesichter, Formschlüssel, Spiegeln): <https://esotericsoftware.com/forum/d/27847>
- Formschlüssel: <https://esotericsoftware.com/forum/d/28508>
- Vorschlag Formschlüssel: <https://esotericsoftware.com/forum/d/26046>
- Probleme im Arbeitsablauf: <https://esotericsoftware.com/forum/d/10420>
- Vorschläge zur Bedienung (Baum): <https://esotericsoftware.com/forum/d/7463>
- Vorschlag zur Oberfläche (Baum): <https://esotericsoftware.com/forum/d/24176>
- Gewichte malen: <https://esotericsoftware.com/forum/d/15276>
- Animationen nach Setup-Modus kaputt: <https://esotericsoftware.com/forum/d/10531>
- Grundpose ändern ohne Animationen zu brechen: <https://esotericsoftware.com/forum/d/13067>
- Physik 4.2, allgemeine Fragen: <https://esotericsoftware.com/forum/d/25363>
- 4.2-Beta (Bauart der Physik): <https://esotericsoftware.com/forum/d/24635>
- Mischzeiten in Unity: <https://esotericsoftware.com/forum/d/12629>
- Steam-Diskussion Spriter gegen Spine: <https://steamcommunity.com/app/332360/discussions/0/617319461034893318/>
- Godot-Forum zu Skeleton2D: <https://forum.godotengine.org/t/state-of-skeleton2d-in-godot-bone-2d-rigging-cutout-animations/65393>

**DragonBones, Spriter, Creature**

- DragonBones: <https://dragonbones.github.io/en/animation.html>
- DragonBones-Laufzeit (AnimationState): <https://h1ve2.github.io/pixi-dragonbones-runtime/api/8.x/classes/AnimationState>
- Spriter Pro (Steam): <https://store.steampowered.com/app/332360/Spriter_Pro/>
- Spriter 2 Vorbestellung (2018): <https://www.gamedev.net/news/spriter-2-the-2d-animation-tool-now-available-for-pre-order-r483/>
- Spriter-Player mit Pro-Funktionen: <https://www.html5gamedevs.com/topic/20682-spriter-player-for-phaser-spriter-pro-features-added>
- Creature, Modi und Inhalt: <https://kestrelmoon.com/creaturedocs/Overview/Main_Application_Modes.html>
- Creature, Knochen und Gewichte: <https://kestrelmoon.com/creaturedocs/Rigging/Rigging_Bone_And_Weighting_Mode.html>
- Creature, Smart AI Rig: <https://kestrelmoon.com/creaturedocs/Rigging/Smart_AI_Rig.html>
- Creature, Motoren: <https://kestrelmoon.com/creaturedocs/Animation/Motors_Introduction.html>
- Creature, Bend Physics: <https://kestrelmoon.com/creaturedocs/Animation/Bone_Motors/Bend_Physics_Motor.html>
- Creature, Physik verstehen: <https://kestrelmoon.com/creaturedocs/Tutorials_And_Walkthroughs/Understanding_Physics_Motors.html>
- Creature, Animation Controllers: <https://kestrelmoon.com/creaturedocs/Animation/Advanced_Character_Control_with_Animation_Controllers.html>
- Creature, Morph Targets: <https://kestrelmoon.com/creaturedocs/Animation/Morph_Targets_For_GameEngines.html>
- Creature gegen Spine (Hersteller, parteiisch): <https://deepmotion.com/post/2d-game-animation-creature-vs-spine>
- Cartoon Brew über Creature: <https://www.cartoonbrew.com/tech/midas-touch-automates-2d-animation-new-creature-tool-151493.html>

**Unity und Godot**

- Unity Rigging-Ablauf: <https://docs.unity3d.com/Packages/com.unity.2d.animation@10.1/manual/CharacterRig.html>
- Unity Skinning-Werkzeuge: <https://docs.unity3d.com/Packages/com.unity.2d.animation@10.1/manual/SkinEdToolsShortcuts.html>
- Unity 2D IK: <https://docs.unity3d.com/Packages/com.unity.2d.animation@10.1/manual/2DIK.html>
- Unity PSD Importer: <https://docs.unity3d.com/Packages/com.unity.2d.psdimporter@9.0/manual/index.html>
- Unity Übergänge: <https://docs.unity.com/en-us/engine/current/manual/animation-section/animation-mecanim/animation-animator-controller/animation-state-machines/class-transition>
- Godot 2D-Skelette: <https://docs.godotengine.org/en/stable/tutorials/animation/2d_skeletons.html>
- Godot Jiggle: <https://docs.godotengine.org/en/stable/classes/class_skeletonmodification2djiggle.html>
- Godot AnimationPlayer: <https://docs.godotengine.org/en/stable/classes/class_animationplayer.html>
- Godot AnimationTree: <https://docs.godotengine.org/en/stable/tutorials/animation/animation_tree.html>

**Forschung und frühere Berichte**

- Bounded Biharmonic Weights (SIGGRAPH 2011): <https://igl.ethz.ch/projects/bbw/>
- Morph und Animation (16.11.): [`../2026-11-16-ozzy-morph-und-animation.md`](../2026-11-16-ozzy-morph-und-animation.md)
- Ozzy-Figur, Live2D und Rive (18.11.): [`../2026-11-18-ozzy-figur-recherche.md`](../2026-11-18-ozzy-figur-recherche.md)
