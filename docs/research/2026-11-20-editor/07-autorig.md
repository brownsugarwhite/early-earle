# Intelligenter Autorig für 2D-Vektorfiguren (Recherche 07, 20.11.2026)

Teil der Recherche zum Figureneditor „Studio“. Frage: Wie bekommt eine Figur aus Vektorteilen mit einem Klick Knochen,
Gelenke, Gewichte, Rollen (Bein, Kopf, Schwanz, Ohr), Seiten (links/rechts) und Spiegelpaare, so dass sie sofort benutzbar und
leicht zu korrigieren ist? Am Ende steht ein konkreter Algorithmus für unseren Fall.

Hinweis zur Arbeitsweise: Das Kontingent der Websuche teilen sich alle Teilrecherchen dieser Runde; es war nach etwa
zwanzig eigenen Anfragen erschöpft. Danach habe ich nur noch bekannte Primärquellen direkt geöffnet (Handbücher, Papers,
Quelltext). Einige
Hintergrundaussagen (Straight Skeleton, Mittelachse über Voronoi, Teilungsregeln der Wahrnehmung, Pose-Space-Korrekturen,
Marker-Autorigger in 3D) stützen sich auf Fachwissen; sie sind im Text als solche gekennzeichnet.

---

## Kurzfassung

- **Keines der untersuchten Werkzeuge riggt eine 2D-Vektorfigur aus Teilen vollautomatisch mit Rollen, Seiten und
  Gewichten.** Die Bausteine gibt es einzeln: Skelette aus Silhouetten (Forschung), Vorlagen für Tiere (Duik, Cartoon Animator), Namensregeln
  (Character Animator, Spine-PSD-Import, Live2D-Vorlagen), automatische Gewichte (Unity, Spine, Rive, Moho, Blender).
- **Animated Drawings** (Meta, 2023) zeigt die beste Kette für Laien: erkennen, Skelett setzen, mit „so starr wie möglich“
  verformen, sofort eine Bewegung zeigen, Fehler durch Ziehen der Gelenke korrigieren. Es kann aber nur Menschenfiguren, und
  sein schwächster Schritt ist das Ausschneiden der Figur aus dem Bild. Diesen Schritt brauchen wir nicht: Unsere Figuren
  bestehen schon aus getrennten Teilen.
- **Pinocchio** (Baran und Popović, 2007) bettet eine bekannte Vorlage in eine Form ein und rechnet die Gewichte über einen
  Wärmeausgleich. Zwei Lehren gelten direkt für uns: Die Übergangszone an einem Gelenk soll etwa so breit sein wie das Glied dick
  ist, und Knie und Ellbogen lassen sich aus der Form allein nicht zuverlässig finden.
- **Gewichte für Bézier-Griffe** naiv nach der Lage des Griffs zu rechnen, ist fehleranfällig, weil Griffe weit neben der Kurve
  liegen können (Liu, Jacobson, Gingold 2014; daraus wurde Illustrators „Puppet Warp“). Richtig ist, die Gewichte aus der Kurve
  selbst abzuleiten und die Glätte an den Ankern zu erhalten. Rive erlaubt schon heute eigene Gewichte für Griffe.
- **Empfehlung für uns:** ein deterministischer, erklärbarer Autorig aus drei Quellen: (1) dem **Teile-Graphen** (Überlappung,
  Enthaltensein, Kontakt, Malreihenfolge), (2) einer **Vorlage als Daten** (Vierbeiner, Zweibeiner, Vogel …), die Rollen,
  Knochenart, Bewegungsgrenzen und Physik vorschlägt, (3) einer **Achse je Teil** (Chordal-Achse aus einer
  Dreieckszerlegung, beschnitten wie in Teddy), die Gelenke, Dicke und die Gewichte liefert.
- **Biegeachsen statt Knochenketten** für Beine, Schwanz und Ohren: Das ist genau das „Rückgrat“, das der Prototyp für Ozzys
  Beine von Hand gebaut hat (Bézier von der Hüfte zum Fuß, Länge bleibt, Form im Achsenraum). Der Autorig verallgemeinert es.
- **Gewichte nur innerhalb eines Teils**, über die Lage entlang seiner Achse; weiße Aufsätze und Füllteile erben das Feld
  ihres Wirts; Griffe erben vom Anker, außer ein Stück überspannt ein Gelenk.
- **Zusammenspiel mit dem Morph:** Gelenke „reiten“ auf der Form ihres Elternteils (starre Anpassung über dessen Anker), und
  Korrekturformen leben im Knochenraum. So passen Knochen und Formen in jeder Ansicht und jeder Haltung zusammen.
- **Bedienung:** ein Klick, Ergebnis geschätzt in unter 50 ms, sofort ein kurzes Probewackeln, Fragen nur bei echter Unsicherheit,
  Korrekturen durch Ziehen von Gelenkringen und Antippen von Teilen, jede Korrektur bleibt beim Neu-Riggen erhalten, das
  Ganze ist ein Rückgängig-Schritt.
- **Prüfstein ist schon da:** Der Prototyp kennt Ozzys Teile, Eltern (`ELTER`), Spiegelpartner (`PARTNER`) und Kopfteile von
  Hand. Der Autorig muss diese Zuordnung von selbst finden; das ist eine fertige, ehrliche Probe.

---

## 1. Ausgangslage: Was unsere Figuren mitbringen

Der Prototyp (`apps/editor/src/ozzy-figur/`) zeigt, was ein Autorig bei uns vorfindet und was er liefern muss:

- **Teile als geschlossene kubische Bézier-Pfade** (Anker mit Griff davor und danach, `form.ts`). Ozzy hat in der Seitenansicht
  19 gezeichnete Teile: Bohne (Körper), vier Beine, zwei Kopfmasken, zwei Ohren, Ohrspalt, Nase, zwei Bartteile, Schwanz, das
  Weiß des Schwanzes, zwei weiße Beinfenster, zwei Keile zwischen den Beinen (`vorlagen/import.ts`).
- **Malreihenfolge** je Ansicht ist bekannt. Achtung: Alle schwarzen Teile verschmelzen im Renderer; deshalb ist ihre Reihenfolge
  kein verlässlicher Tiefenhinweis (in der Seitenansicht liegen alle vier Beine über der Bohne).
- **Gleiche Anker in allen Ansichten:** Jedes Teil hat in jeder Ansicht dieselben Anker, nur verschoben. Damit gelten Gewichte je
  Anker für alle Ansichten und Schlüsselformen.
- **Namen sind vorhanden, aber nicht garantiert.** Florians Dateien sind benannt, eine neue Figur muss es nicht sein. Der Autorig
  darf Namen als Hinweis nutzen, aber nie voraussetzen.
- **Handgebaute Vorlage des Rigs:** `haltung.ts` hängt Teile an Knochen (Drehpunkt, Winkel, Lage je Haltung) und speichert
  Korrekturen „im Knochen“, bei Beinen längs und quer zur Achse. Beine haben ein **Rückgrat**: eine Bézier-Kurve von der Hüfte
  zum Fuß, nach Bogenlänge abgelaufen; ist der Abstand kürzer als das Bein, biegt es sich und behält seine Länge. Weiße Teile
  hängen am Knochen ihres schwarzen Wirts (`ELTER`: Fenster am Bein, Keil am Bein, Schwanzweiß am Schwanz).

Daraus folgt der Auftrag an den Autorig: dieselbe Struktur, die heute von Hand im Code steht, **für jede Figur von selbst**
anlegen: Einheiten, Eltern, Rollen, Seiten, Gelenke, Achsen, Gewichte, Anheftung an die Form, Bewegungsgrenzen, Physik.

---

## 2. Was die besten Programme und Verfahren tun

### 2.1 Skelett aus der Silhouette

**Mittelachse (Blum).** Die Mittelachse ist die Menge der Mittelpunkte aller größten Kreise, die in die Form passen. Sie ist
exakt, aber empfindlich: Jede kleine Delle im Umriss erzeugt einen neuen Ast. Deshalb braucht jedes Verfahren ein
**Beschneiden** (Überblick: [Eppstein, Medial Axes](https://ics.uci.edu/~eppstein/gina/medial.html)).

**Beschneiden mit diskreter Kurvenevolution** (Bai, Latecki, Liu, IEEE PAMI 2007): Der Umriss wird zuerst vereinfacht
(Punkte mit dem kleinsten Beitrag zur Form fallen schrittweise weg); nur Äste, die zu einem verbliebenen Konvex-Abschnitt des
Umrisses führen, bleiben. Das Verfahren erzeugt keine Scheinäste, erhält die Topologie und verschiebt die Skelettpunkte nicht
([Wikipedia-Zusammenfassung](https://en.wikipedia.org/wiki/Discrete_skeleton_evolution), [PubMed-Eintrag](https://www.pubmed.gov/17224615/)).

**Chordal-Achse über eine Dreieckszerlegung** (Prasad; bekannt aus Teddy, Igarashi u. a. 1999,
[PDF](https://www-ui.is.s.u-tokyo.ac.jp/~takeo/papers/siggraph99.pdf)). Mechanik, wie Teddy sie beschreibt:

1. Der geschlossene Umriss wird **eingeschränkt Delaunay-trianguliert** (die Umrisskanten bleiben erhalten).
2. Jedes Dreieck bekommt eine Klasse: **End-Dreieck** (zwei Umrisskanten), **Ärmel-Dreieck** (eine Umrisskante),
   **Knoten-Dreieck** (keine Umrisskante).
3. Die Achse verbindet die Mittelpunkte der inneren Kanten (der „Sehnen“ quer durch die Form).
4. **Beschneiden:** Von jedem End-Dreieck aus wird eine Region schrittweise vergrößert. Über der inneren Kante als Durchmesser
   steht ein Halbkreis; liegen alle bisher besuchten Umrisspunkte darin, wird das Nachbardreieck dazugenommen. Liegt ein Punkt
   außerhalb, bleibt der Ast, nur sein Ende wird vereinfacht (Fächer vom Mittelpunkt der Sehne). Erreicht die Region ein
   Knoten-Dreieck, war der Ast unbedeutend und fällt weg. So verschwinden kleine Ausbuchtungen, echte Glieder bleiben.

Für Vektorformen ist das ideal: Die Dreieckszerlegung eines abgeflachten Bézier-Pfads ist schnell und robust, und jede Sehne
liefert die **örtliche Dicke** gleich mit (halbe Sehnenlänge). Arbeiten zur berichtigten Chordal-Achse nennen als Vorteil die
Stabilität bei ungleichmäßig abgetastetem Umriss und gliedern die Achse in Glieder (vom Knoten- bis zum End-Dreieck) und
Rumpfstücke ([OSTI](https://www.osti.gov/biblio/977914), [Springer](https://rd.springer.com/chapter/10.1007/978-3-540-31965-8_25);
nur Suchauszüge gelesen).

**Straight Skeleton** (Fachwissen): Es entsteht, wenn man alle Umrisskanten gleich schnell nach innen schiebt. Bei Polygonen aus
abgeflachten Kurven läuft zu jeder kleinen Ecke ein Ast; robuste Umsetzungen sind aufwendig (Ereignis-gesteuert). Stark bei
Gebäuden und Dächern, schwächer bei organischen Formen. Für uns kein Vorteil gegenüber der Chordal-Achse.

**Raster-Skelettierung** (Ausdünnen von Pixelmasken, dann Beschneiden; Fachwissen): abhängig von der Auflösung und nur sinnvoll,
wenn man ohnehin eine Pixelmaske hat (wie Animated Drawings). Für Vektorteile unnötig.

### 2.2 Animated Drawings (Meta, 2023)

Smith, Zheng, Li, Jain, Hodgins: *A Method for Animating Children's Drawings of the Human Figure*, ACM TOG 2023
([arXiv](https://arxiv.org/abs/2303.12741), [HTML-Fassung](https://ar5iv.labs.arxiv.org/html/2303.12741),
[MIT DSpace](https://dspace.mit.edu/handle/1721.1/150815)). Mechanik:

1. **Figur finden:** ein auf Kinderzeichnungen nachtrainierter Detektor (Mask R-CNN) mit nur einer Klasse „menschliche Figur“.
2. **Ausschneiden:** bewusst klassische Bildverarbeitung statt Netz: Graustufen, adaptiver Schwellwert, morphologisches
   Schließen und Weiten, Fluten vom Rand her, größtes Polygon behalten.
3. **Gelenke schätzen:** ein Posenmodell mit einer Wärmekarte je Gelenk; von 17 Punkten nutzt das Rig 13 (Schultern, Ellbogen,
   Handgelenke, Hüften, Knie, Knöchel, Nase). Wurzel = Mitte der Hüften, Brust = Mitte der Schultern.
4. **Netz und Teile:** Delaunay-Dreiecke aus der Maske; jedes Dreieck gehört zum Knochen, der seinem Schwerpunkt am nächsten
   liegt (neun Gruppen), damit Glieder vor oder hinter dem Rumpf gezeichnet werden können.
5. **Verformen:** „so starr wie möglich“ (ARAP, Igarashi u. a. 2005, [PDF](https://www-ui.is.s.u-tokyo.ac.jp/~takeo/papers/rigid.pdf))
   mit den Gelenken als Nadeln; Knochenlängen bleiben, nichts wird verkürzt.
6. **Bewegung übertragen:** Motion-Capture wird auf eine Ebene projiziert, getrennt für Arme und Beine („twisted perspective“).

**Korrektur in der Demo:** Rahmen ziehen, Maske mit Stift und Radierer ausbessern, Gelenke verschieben (nicht hinzufügen oder
löschen; ein unerwünschtes Gelenk schiebt man weit weg), dann Bewegung aus einer festen Galerie wählen.

**Zahlen und Grenzen:** Gelenke werden in der freien Wildbahn zu etwa 90 % richtig gefunden, das Ausschneiden ist der
schwächste Schritt (ohne Korrektur kommen nur etwa 40 % der Bilder durch alle Stufen). Nur Menschenfiguren; Vierbeiner waren
ein häufiger Wunsch der Nutzer, werden aber nicht unterstützt.

**Was wir übernehmen:** die Reihenfolge „erst Ergebnis zeigen, dann korrigieren“, die Korrektur durch Ziehen von Gelenken, das
sofortige Abspielen einer Bewegung. **Was wir nicht brauchen:** Erkennen und Ausschneiden (unsere Teile sind getrennt), ein
neuronales Posenmodell (kein Training, keine Server, kein Rätselraten).

### 2.3 Pinocchio: Vorlage einbetten, Gewichte über Wärme

Baran und Popović, *Automatic Rigging and Animation of 3D Characters*, SIGGRAPH 2007
([PDF](https://people.csail.mit.edu/ibaran/papers/2007-SIGGRAPH-Pinocchio.pdf)). Der Kern ist ein Perspektivwechsel: nicht ein
Skelett aus der Form **ziehen**, sondern ein **bekanntes** Skelett (Zweibeiner, Vierbeiner, Kentaur) in die Form **einbetten**.

- **Einbetten:** Abstandsfeld, Näherung der Mittelfläche, Kugeln hineinpacken (größte zuerst), Graph aus den Kugelmitten. Dann
  eine diskrete Suche mit einer Straffunktion aus neun Teilen: zu kurze Knochen, falsche Richtungen, ungleiche Längen bei
  symmetrischen Knochen, Ketten, die sich Punkte teilen, Füße fern vom Boden, Endgelenke nicht an äußersten Punkten u. a. Die
  Gewichtung der neun Teile wurde aus guten und schlechten Beispielen gelernt. Danach wird kontinuierlich verfeinert.
- **Gewichte über Wärmeausgleich:** Knochen i hat Temperatur 1, alle anderen 0; die Gleichgewichtstemperatur auf der Oberfläche ist
  das Gewicht. Jeder Punkt bekommt Wärme nur vom nächsten Knochen, **wenn die Verbindung im Inneren der Form verläuft**; die
  Stärke fällt mit dem Quadrat des Abstands. Eine dünn besetzte Gleichung, einmal zerlegt, für alle Knochen wiederverwendet; die
  Gewichte ergeben automatisch zusammen 1.
- **Geforderte Eigenschaften der Gewichte:** unabhängig von der Netzauflösung, glatt, und **die Übergangsbreite zwischen zwei
  Knochen etwa proportional zum Abstand des Gelenks zur Oberfläche**. Reine Abstandsregeln scheitern, weil sie die Form nicht
  kennen (Beispiel der Autoren: Ein Stück Rumpf hängt plötzlich am Arm).
- **Ergebnis und Grenzen:** 13 von 16 unbekannten Figuren richtig, drei weitere mit einem einzigen Hinweis. Sehr dünne Glieder
  fallen durch. **Knie und Ellbogen sitzen oft falsch; die Autoren kennen keinen verlässlichen Weg**, sie zu finden, weil sie bei
  manchen Figuren dicker, bei anderen dünner sind als der Rest des Glieds.

### 2.4 Neuronales Riggen (RigNet und Nachfolger)

Xu, Zhou, Kalogerakis, Landreth, Singh: *RigNet*, SIGGRAPH 2020 ([arXiv](https://arxiv.org/abs/2005.00559),
[HTML-Fassung](https://ar5iv.labs.arxiv.org/html/2005.00559)). Trainiert auf 2 703 geriggten 3D-Figuren. Ein Graph-Netz
schiebt Oberflächenpunkte zu vermuteten Gelenken, gewichtet sie mit einer gelernten Aufmerksamkeit und bündelt sie
(Mean-Shift); ein zweites Netz schätzt, welche Gelenke verbunden sind, und ein **minimaler Spannbaum** ab einer geschätzten
Wurzel ergibt das Skelett; die Haut wird aus geodätischen Abständen im Volumen zu den fünf nächsten Knochen gelernt. Ein Regler
steuert die Dichte der Gelenke. RigNet schlägt in den Messungen der Autoren Pinocchio, BBW und Mayas Geodesic-Voxel-Bindung.
Grenzen laut Autoren: überzählige Gelenke in Armen, fehlende Hilfsgelenke, nur ein Rig je Trainingsfigur.

Für uns zählt: Diese Verfahren sind für 3D-Netze gebaut, brauchen große Datensätze, laufen nicht leicht offline auf dem iPad und
liefern ein Ergebnis, das man nicht erklären kann. Für eine Figur aus benannten, getrennten Vektorteilen sind sie Überbau.

### 2.5 Vorlagen und Namensregeln in 2D-Werkzeugen

- **Duik (After Effects):** fertige „Strukturen“ für Arm (auch Vorderbein), Bein (auch Hinterbein), Wirbelsäule, Schwanz und
  freie Ketten; Gliedtypen **plantigrad, digitigrad (Hund, Katze), ungulat**; danach richtet der Autorig die Struktur ein, laut
  Wiki passend zu den gewählten Teilen; Schwänze wahlweise mit Bézier-IK oder FK mit automatischem Nachschwingen. Der Nutzer legt
  die Struktur selbst auf die Zeichnung ([Wiki: Strukturen](https://github.com/RxLaboratory/Duik/wiki/create-structures); Erfahrungsbericht mit
  einer Kuh: [Pixel Bakery](https://pixelbakery.com/recipes/character-rigging); Überblick:
  [School of Motion](https://schoolofmotion.com/blog/how-to-rig-quadrupeds-animation)).
- **Cartoon Animator (Reallusion):** Vierbeiner-Vorlage mit festen Knochennamen für Hund, Katze, Pferd; Grafiken werden über
  Ebenennamen zugeordnet; dafür passen dann Bewegungsbibliotheken ([Produktseite](https://reallusion.com/cartoon-animator/custom-2d-character.html),
  [Handbuch PSD mit Vorlagenknochen](https://manual.reallusion.com/Cartoon_Animator_4/ENU/Pipeline/Content/Resources/4.1/07_PSD_In/Creating_PSD_Characters_Template_Bone.htm)).
  Nutzer scheitern an abweichenden Namen (Fehlermeldungen über fehlende Vorlagenknochen); der Rat im Forum lautet, die
  Vorlagendatei zu nehmen und nichts umzubenennen ([Forum](https://discussions.reallusion.com/t/ask-custom-character-rig-not-working-properly-in-cartoon-animator/12883)).
- **Character Animator (Adobe):** Ebenen und Griffe mit bestimmten Namen (Kopf, Mund, Augen, Ellbogen, Knie …) bekommen beim Import
  automatisch ihre Rolle; eigenständige Gruppen, die ihr Elternteil überlappen, werden **automatisch dort angeheftet**, wo ihr
  Ursprungspunkt liegt; Anheftart fest, Gelenk oder frei
  ([Grafik vorbereiten](https://helpx.adobe.com/adobe-character-animator/desktop/creating-and-controlling-puppets/prepare-artwork.html),
  [Netz, Anheftung, Griffe](https://helpx.adobe.com/adobe-character-animator/desktop/rigging/attachment-and-handles.html); die
  Seiten waren direkt gesperrt, Inhalt aus den Suchauszügen).
- **Live2D Cubism, Modellvorlagen:** Teile, Verformer-Struktur, Parameter-Schlüsselformen und Physik werden von einem fertigen
  Modell auf ein neues übertragen. Zugeordnet wird **zuerst nach gleichem Namen, sonst nach Lage und Größe**, nachdem man die
  Vorlage grob über das neue Modell gelegt hat; falsche Zuordnungen korrigiert man paarweise
  ([Handbuch](https://docs.live2d.com/en/cubism-editor-manual/template), [Anwenden](https://docs.live2d.com/en/cubism-editor-manual/applying-the-model-template/)).
- **Spine, PSD-Import:** Ein Tag `[bone]` im Gruppennamen erzeugt einen Knochen in der Mitte der ersten sichtbaren Ebene;
  bestehende Knochen werden nicht verschoben ([Handbuch](https://esotericsoftware.com/spine-import-psd)). Reine Namensregel ohne
  Formanalyse.
- **RubberHose (After Effects):** Glieder als „Schläuche“, gebaut mit einem Klick oder durch Zeichnen eines Pfads, mit
  Biegepunkten für S-Kurven, Finger und Schwänze; ausdrücklich keine mathematisch exakte IK, dafür Stil-Voreinstellungen
  ([Produktseite](https://battleaxe.co/rubberhose)). Das ist die Cartoon-Antwort auf „Beine ohne Knie“.

**Gemeinsames Muster:** Eine Vorlage liefert Bedeutung (Rollen, Namen, Bewegungsgrenzen, Physik), die Zuordnung zur Zeichnung
geschieht über **Namen** (brüchig) oder **von Hand** (mühsam). Nur Live2D fällt auf Lage und Größe zurück, und nur Character
Animator nutzt die **Überlappung** als Anheftpunkt. Niemand nutzt die Geometrie der Teile systematisch.

### 2.6 Automatische Gewichte

- **Unity 2D Animation:** „Auto Geometry“ baut ein Dreiecksnetz aus dem Sprite-Umriss, „Associate Bones“ verbindet Knochen mit
  den Sprites, über denen sie liegen, „Generate“ rechnet Gewichte; dazu Regler und Pinsel (Hinzufügen/Abziehen,
  Wachsen/Schrumpfen, Glätten) ([Handbuch](https://docs.unity3d.com/Packages/com.unity.2d.animation@9.1/manual/SkinEdToolsShortcuts.html),
  [Arbeitsablauf](https://docs.unity3d.com/Packages/com.unity.2d.animation@7.2/manual/CharacterRig.html)). Im Quelltext des
  Pakets steckt dahinter **Bounded Biharmonic Weights**: Knochen werden mit je vier Stützpunkten in die Dreieckszerlegung
  eingefügt, gelöst wird iterativ mit 100 Durchläufen
  ([Spiegel des Paket-Quelltexts](https://github.com/needle-mirror/com.unity.2d.animation), Datei
  `Editor/SkinningModule/WeightsGenerator/BoundedBiharmonicWeightsGenerator.cs`).
- **Bounded Biharmonic Weights** (Jacobson, Baran, Popović, Sorkine 2011, [PDF](https://homes.cs.washington.edu/~jovan/papers/jacobson-2011-bbw.pdf);
  Fachwissen, die Datei war für das Abrufwerkzeug zu groß): Gewichte minimieren eine Glätte-Energie zweiter Ordnung, sind an
  ihrem Knochen 1 und an den anderen 0, liegen zwischen 0 und 1 und summieren sich zu 1. Ergebnis: glatt, örtlich, formbewusst,
  für Punkte, Knochen und Hüllen. Preis: ein Optimierungsproblem je Figur.
- **Spine:** Beim ersten Binden werden Gewichte automatisch gerechnet, laut Handbuch nicht nach einfachem Abstand, sondern unter
  Berücksichtigung der Netz-Topografie; dazu Glätten, Ausdünnen (höchstens n Knochen je Punkt, Schwellwert), Angleichen zwischen
  Netzen, Tauschen, Sperren, Neu-Binden ([Weights-Ansicht](https://esotericsoftware.com/spine-weights)). Typische Stolpersteine
  aus dem Forum: „Auto“ rechnet nur für ausgewählte Knochen, und Knochen, die das Netz nicht überlappen, bekommen nichts
  ([Forum](https://fr.esotericsoftware.com/forum/d/28557-mesh-auto-weighting-only-assigns-to-first-bone),
  [Forum](https://ko.esotericsoftware.com/forum/d/9644-bones-will-not-bind-to-a-mesh); Inhalt aus den Suchauszügen).
- **Rive:** Gewichte je Punkt eines Vektorpfads; **ein Anker und seine Bézier-Griffe können getrennt gewichtet werden**.
  „Auto-Weights“ nimmt den nächsten Knochen und mischt an den Grenzen (Regler „Blend“ und „Influence“ = höchstens n Knochen je
  Punkt); Anzeige als kleine Tortendiagramme, Glätten, Sperren ([Handbuch Bones](https://rive.app/docs/editor/manipulating-shapes/bones)).
- **Moho:** „Flexibles Binden“ (jeder Knochen wirkt auf jeden Punkt, mit dem Abstand abnehmend; das Handbuch selbst warnt vor
  gummiartigen Bewegungen, etwa einem zuckenden Zeh, wenn der Arm sich bewegt), „Bereichs-Binden“ mit sichtbarem
  Einflussradius je Knochen (Werkzeug „Bone Strength“; Punkte außerhalb aller Bereiche folgen dem nächsten Knochen),
  Punkt-Binden (starr), Ebenen-Binden (ganze Ebene an einen Knochen) ([Tutorial 3.1](https://www.lostmarble.com/moho/manual/tut03/01)).
- **Blender:** „Mit automatischen Gewichten“ nutzt die Wärme-Methode („bone heat“), „mit Hüllen-Gewichten“ die einstellbaren
  Hüllen der Knochen ([Handbuch](https://docs.blender.org/manual/en/latest/animation/armatures/skinning/parenting.html)). Häufigste
  Klage: „Bone heat weighting failed“ bei unverbundenen Netzteilen, winzigen Flächen oder ungünstigem Maßstab; der Rat lautet oft,
  die Teile zu trennen und einzeln zu gewichten ([Bugreport](https://projects.blender.org/blender/blender/issues/45493),
  [Sammlung von Lösungen](https://www.blendernation.com/2023/05/19/solutions-to-bone-heat-weighting-error/)). Für 2D-Striche
  (Grease Pencil) gibt es eine eigene, abstandsbasierte Variante, deren Ergebnisse Nutzer meist von Hand nachmalen
  ([Bugreport](https://projects.blender.org/blender/blender/issues/104077), Suchauszug).
- **Creature:** wirbt mit „intelligenter“ Knochengewichtung, automatischen Laufzyklen und Weichkörper-Dynamik; das Verfahren ist
  nicht beschrieben ([Produktseite](https://kestrelmoon.com/creature/creature2D.html)).

### 2.7 Gewichte für Bézier-Kurven (der wichtigste Fund für „Gewichte auf Griffen“)

Liu, Jacobson, Gingold: *Skinning Cubic Bézier Splines and Catmull-Clark Subdivision Surfaces*, SIGGRAPH Asia 2014
([Projektseite](https://cragl.cs.gmu.edu/splineskin/), [Code 2D](https://github.com/songrun/VectorSkinning)). Laut Projektseite
wurde die Arbeit als „Puppet Warp“ in Illustrator übernommen.

- **Problem:** Wendet man eine Knochenverformung einfach auf alle Kontrollpunkte an, ist das nicht dasselbe, wie die Kurve zu
  verformen. Griffe liegen oft weit neben der Kurve und bekommen dort ganz andere Gewichte; und wer nur an Kontrollpunkten
  auswertet, verpasst, was innerhalb eines Stücks passiert. Auch die Variante „Anker verformen, Griffe mit der örtlichen
  Ableitung am Anker mitnehmen“ zählt bei den Autoren zu den naiven Ansätzen.
- **Lösung:** Die neuen Kontrollpunkte werden so gewählt, dass die Kurve der verformten Kurve **entlang ihrer ganzen Länge**
  möglichst nahe kommt (kleinste Quadrate über das Integral). Weil die Knochenverformung linear ist, schrumpft das zu **einer
  vorab gerechneten Matrix je Knochen**; zur Laufzeit wird nur multipliziert und addiert. Nebenbedingungen erhalten C0, C1,
  G1 oder einen festen Winkel an den Ankern; Ecken bleiben Ecken, glatte Anker bleiben glatt.
- **Grenze:** Hat ein Stück zu wenige Anker für die gewünschte Biegung, entstehen Wellen; die Autoren lösen das durch
  **zusätzliche Anker** und nennen das automatische Einfügen als nächsten Schritt.

### 2.8 Was Nutzer berichten (Stärken und Schwächen in einem Satz)

| Werkzeug | Stärke | Schwäche aus Nutzersicht |
| --- | --- | --- |
| Animated Drawings | in Sekunden eine laufende Figur, Korrektur durch Ziehen | nur Menschen; Ausschneiden scheitert oft; Gelenke nicht hinzufügbar |
| Pinocchio | Vorlage mit Bedeutung, formbewusste Gewichte | Knie und Ellbogen unzuverlässig, sehr dünne Glieder fallen durch |
| Spine | volle Kontrolle, gute Werkzeuge zum Nachbessern | alles Handarbeit; „Auto“ verwirrt (nur gewählte Knochen, nur überlappende) |
| Unity 2D | BBW liefert glatte Gewichte mit einem Klick | Netz aus Pixeln; Raster-, nicht Vektorfiguren |
| Rive | Gewichte auch für Griffe, klare Anzeige | Auto-Gewichte nur nach Nähe; Formen verschmelzen nicht |
| Moho | sichtbare Einflussbereiche, schnell verstanden | flexibles Binden wirkt gummiartig; Bereiche brauchen Pflege |
| Blender | Wärme-Methode als Standard | bricht bei getrennten Teilen ab; für 2D-Striche wenig brauchbar |
| Duik, Cartoon Animator | Vierbeiner-Vorlagen mit IK und Bibliotheken | Zuordnung über Namen oder Handarbeit; abweichende Namen brechen den Import |
| Character Animator | Anheften an der Überlappung, Rollen über Namen | Namensschema muss man kennen |

---

## 3. Ehrliche Gegenüberstellung für unseren Fall

Unser Fall: Charakter- und Physik-Spieleditor; ein Art Director ohne Programmierkenntnisse, der mit dem Auge entscheidet;
Mac, iPad und iPhone; Figuren aus getrennten, benannten Vektorteilen mit gleichen Ankern in allen Ansichten; Schlüsselformen und
Haltungen statt freier 3D-Drehung; Look entsteht aus Verjüngungen und verschmelzenden Flächen.

### 3.1 Wie entsteht das Skelett?

| Ansatz | Kann gut | Scheitert an | Für uns |
| --- | --- | --- | --- |
| Handarbeit wie Spine | alles, genau | Zeit, Fachwissen | nur als Korrektur |
| Skelett aus der ganzen Silhouette (Mittelachse, Straight Skeleton, Chordal-Achse) | Glieder einer einzigen Form finden | Scheinäste, keine Bedeutung, Überlappungen von Teilen | **je Teil ja**, für die ganze Figur nur als Notweg |
| Posenschätzung mit Netz (Animated Drawings) | Bilder ohne Struktur | nur trainierte Körperbaupläne; Server oder großes Modell; nicht erklärbar | nein |
| Vorlage einbetten (Pinocchio, Duik, Cartoon Animator, Live2D) | Bedeutung, IK, Physik, Bibliotheken | Knie-Lage, Namenszwang, Handzuordnung | **ja, als Daten und Vorschlag** |
| Neuronales Riggen (RigNet u. a.) | beliebige 3D-Netze | 3D, Daten, Rechenzeit, Erklärbarkeit | nein |
| **Teile-Graph + Vorlage + Achse je Teil** (Vorschlag) | nutzt, was die Figur schon hat; schnell, offline, erklärbar, korrigierbar | Figuren aus einem einzigen Umriss; neue Körperbaupläne brauchen eine Vorlage | **ja** |

### 3.2 Wie entstehen die Gewichte?

| Verfahren | Wo es steckt | Stärke | Schwäche | Für uns |
| --- | --- | --- | --- | --- |
| starr (ein Knochen je Teil) | Moho Ebenen-Binden, Character Animator „fest“ | einfach, stabil | Knick am Gelenk | Standard für Kopf, Nase, Bart |
| Abstand oder Hülle | Rive, Moho, Blender-Hüllen | sofort verständlich | greift über Lücken in Nachbarteile | nur innerhalb eines Teils |
| Wärmeausgleich | Blender, Pinocchio | glatt, formbewusst | Gleichungssystem; bricht bei getrennten Teilen | Rückfall |
| Bounded Biharmonic Weights | Unity 2D | sehr glatt, örtlich, beschränkt | Optimierung, schwerer zu erklären | Rückfall für runde Teile mit mehreren Knochen |
| **Achsen-Koordinate** (Vorschlag) | Prototyp-Rückgrat, Kurvenverformer | exakt für längliche Teile, keine Leckage, ein Regler je Gelenk | braucht eine Achse | **Standard** für Beine, Schwanz, Ohren, Rumpf |
| Kurven-Fit nach Liu u. a. | Illustrator Puppet Warp | Bézier bleibt Bézier, Glätte garantiert | Vorberechnung je Teil | **Zusatz** für lange Stücke über Gelenken |

### 3.3 Knochenkette oder Biegeachse für Beine, Schwanz, Ohren?

- **Knochenkette** (Spine, Unity, Duik): vertraut, exportierbar; braucht Gewichte, Gelenkpositionen (Knie!) und knickt sichtbar,
  wenn die Übergänge schmal sind; lineares Mischen lässt Gelenke bei starker Beugung einfallen.
- **Biegeachse** (RubberHose, Kurvenverformer wie in Toon Boom Harmony [Fachwissen], das Rückgrat im Prototyp): ein Glied ist eine Bézier-Kurve von der
  Wurzel zum Ende, die Form wird entlang der Bogenlänge abgelegt. Keine Gewichte nötig, kein Einfallen, Länge bleibt; IK ist
  trivial (Ende setzen, Biegung folgt). Schwäche: echte harte Knie-Knicke muss man über eine zweite Achse oder eine
  Korrekturform holen.
- **Urteil:** Biegeachse als Standard für Cartoon-Glieder (Ozzys Beine wurden genau so gebaut; Florian hat am 19.11. deutlicheres
  Biegen und eine gleichbleibende weiße Fläche am Bein verlangt, beides leistet die längenhaltende Achse); Knochenkette nur, wo
  die Vorlage ein echtes Knie verlangt.

### 3.4 Wie korrigiert man das Ergebnis?

| Muster | Beispiel | Bewertung für uns |
| --- | --- | --- |
| Erst Marker setzen, dann rechnen | 3D-Autorigger mit Markern an Kinn, Handgelenken, Knien (Fachwissen) | ein Schritt zu viel; der AD weiß vorher nicht, was das Werkzeug braucht |
| Erst rechnen, dann Gelenke ziehen | Animated Drawings | **gut**: sofort ein Ergebnis, Korrektur am sichtbaren Fehler |
| Gewichte malen | Spine, Unity, Rive | nötig für Fachleute, aber nicht der erste Weg |
| Anheften an der Überlappung | Character Animator | **gut**: die Zeichnung selbst sagt, wo ein Teil hängt |
| Vorlage über die Figur legen | Live2D | gut als Rückfall bei fremden Körperbauplänen |

---

## 4. Vorschlag: der Autorig in neun Schritten

Grundsätze: **deterministisch** (gleiche Eingabe, gleiches Ergebnis), **erklärbar** (jede Entscheidung hat einen sichtbaren
Grund), **keine Sonderregel für einen Körper** (Ozzy-Wissen steckt nur in der Vorlage als Daten, nie im Code; Projektregel 7),
**alles in Millisekunden** (läuft bei jeder Formänderung neu, in einem Worker).

### Schritt 0: Vorbereitung je Teil

1. **Abflachen:** jedes kubische Stück adaptiv in eine Polylinie (Toleranz etwa 0,05 % der Figurhöhe); jeder Polygonpunkt
   merkt sich sein Stück k und seinen Parameter t (Rückweg zum Bézier).
2. **Maße:** Fläche, Schwerpunkt, Trägheitsachsen (zweite Momente der Fläche) und **Streckung** e = Wurzel aus dem Verhältnis der
   beiden Eigenwerte.
3. **Rechennetz (unsichtbar):** eingeschränkte Delaunay-Zerlegung des Polygons.
4. **Achse:** Chordal-Achse mit dem Halbkreis-Beschneiden aus Teddy. Die **Hauptachse** ist der längste Weg im beschnittenen
   Achsenbaum; zu jedem Achsenpunkt gehört die **Dicke** r(s) (halbe Sehnenlänge). Ist e < 1,6 (rundes Teil), gilt statt der
   Achse die längere Trägheitsachse durch den Schwerpunkt.
5. **Achse als Bézier:** Die Hauptachse wird mit einer kubischen Bézier-Kurve (bei großem Fehler zwei) nach Bogenlänge angenähert.
   Das ist genau das Format des Prototyp-Rückgrats.

### Schritt 1: Beziehungen zwischen den Teilen

Für jedes Paar (A, B) mit überlappenden Begrenzungsrahmen: Schnittfläche O(A, B) per Polygon-Verschneidung, Anteil
c(A in B) = O / Fläche(A), Abstand und Länge der Berührung, falls sie sich nicht schneiden. Daraus vier Beziehungsarten
(Startwerte, an mehreren Figuren zu prüfen):

| Art | Regel | Beispiel Ozzy |
| --- | --- | --- |
| **Aufsatz** | A liegt zu mindestens 85 % in B (oder in einem Verbund) und ist kleiner als die Hälfte von B | Beinfenster, Nase, Bart, Ohrspalt, Schwanzweiß |
| **Verbund** | ähnlich groß, berühren sich auf langer Strecke oder überlappen stark, keines ragt mit freiem Ende aus dem anderen, die Vereinigung ist mindestens so kompakt wie die Teile | Kopfmasken A und B |
| **Füllteil** | überlappt zwei oder mehr Einheiten deutlich, hat kein freies Ende | Keile zwischen den Beinen |
| **Gelenk** | ragt mit einem freien Ende aus einer anderen Einheit heraus | Beine, Schwanz, Ohren, Kopf am Rumpf |

Das **freie Ende** eines Teils ist das Ende seiner Hauptachse, das (entlang der Achse gemessen) am weitesten von der
Überlappung entfernt ist.

### Schritt 2: Baum der Einheiten

- **Einheiten** sind Verbünde und alle Teile, die weder Aufsatz noch Füllteil sind.
- **Wurzel:** die größte Einheit mit den meisten Nachbarn (bei Ozzy die Bohne).
- **Eltern:** maximaler Spannbaum ab der Wurzel über die Verbindungsstärke (Schnittfläche plus Berührungslänge mal mittlere
  Dicke), mit der Bedingung, dass das Elternteil näher an der Wurzel liegt. Dasselbe Bauprinzip (Spannbaum ab einer Wurzel)
  nutzt RigNet, nur mit gelernten statt geometrischen Kosten.
- **Aufsätze** hängen an ihrem Wirt, **Füllteile** an ihrem Wirt mit der größten Überlappung (wie im Prototyp: Keil am Bein)
  und werden zu den anderen Wirten hin weich gemischt (Schritt 6).

### Schritt 3: Rollen mit einer Vorlage

**Körperrahmen:** Ursprung im Schwerpunkt der Wurzel, x entlang ihrer Hauptachse, y nach oben (Bildschirm und Bodenlinie;
gerigget wird in der Grundhaltung, bei Ozzy „Stehen“ im Profil). Das Vorzeichen von x (wo ist vorn?) ist offen; der Autorig
rechnet beide Möglichkeiten.

**Merkmale je Einheit:** Lage ihres Gelenks im Körperrahmen (vorn/hinten, oben/unten, auf die Körperlänge normiert),
Richtung der Achse (abwärts, aufwärts, nach hinten), Streckung, Größe relativ zur Wurzel, berührt den Boden (tiefster Punkt
nahe der Bodenlinie), Zahl der Kinder und Aufsätze, Elternrolle.

**Vorlage Vierbeiner (als Daten, Auszug):**

| Rolle | Anzahl | Elternrolle | Erwartete Merkmale | Knochenart | Voreinstellung |
| --- | --- | --- | --- | --- | --- |
| Rumpf | 1 | – | Wurzel, waagrecht gestreckt | Biegeachse, 2 Abschnitte (Becken, Brust) | Schwerpunkt, Atmen |
| Kopf | 1 | Rumpf | vorn, oben, viele Aufsätze, 1–2 Teile | starr (+ Nacken-Gelenk) | Blickziel |
| Bein vorn | 2 | Rumpf | vorn, unten, abwärts, gestreckt, Bodenkontakt | Biegeachse | Fußziel, Boden, Beugerichtung aus der Zeichnung |
| Bein hinten | 2 | Rumpf | hinten, unten, abwärts, Bodenkontakt | Biegeachse | wie vorn |
| Schwanz | 0–1 | Rumpf | hinteres Ende, aufwärts oder nach hinten, kein Bodenkontakt | Biegeachse | Federkette, 3–4 Punkte |
| Ohr | 0–2 | Kopf | obere Kopfhälfte, ragt heraus | Biegeachse | Federkette, 2 Punkte |
| Nase, Auge, Bart | beliebig | Kopf | Aufsätze | erbt | – |

**Zuordnung:** Für jede Einheit und jede Rolle eine Punktzahl aus weichen Rampen je Merkmal (z. B. „Richtung abwärts“ zählt
voll bis 30° Abweichung, nichts ab 70°). Die beste Gesamtzuordnung findet die **Ungarische Methode** (Einheiten gegen
Rollenplätze, dazu Plätze „Sonstiges“), je einmal für „Kopf rechts“ und „Kopf links“; die bessere gewinnt. Bei 20 Einheiten
dauert das Mikrosekunden. Ähnlich gewichtet Pinocchio seine Straf-Terme, nur hier von Hand gesetzt und sichtbar.

**Namen als Hinweis:** Enthält ein Teilname ein Wort aus einem kleinen Wörterbuch (kopf/head, ohr/ear, bein/leg, schwanz/tail,
nase/nose, auge/eye, bart/beard, arm, flügel/wing …), steigt die Punktzahl für diese Rolle stark, ohne sie zu erzwingen. Ein
Widerspruch zwischen Name und Geometrie wird als Frage gezeigt, nicht still entschieden. (Live2D macht es ähnlich: erst Namen,
dann Lage und Größe.)

**Sicherheit:** Der Abstand zwischen bester und zweitbester Zuordnung je Einheit ist ihr Sicherheitswert. Nur Einheiten unter
einer Schwelle bekommen im Editor ein Fragezeichen.

**Andere Körperbaupläne:** Zweibeiner, Vogel, Fisch, Schlange, Insekt sind weitere Vorlagen-Dateien. Eine allgemeine Vorlage
„Wesen“ gibt jedem herausragenden Teil eine Biegeachse und nennt es „Glied 1 … n“. So bleibt der Autorig erweiterbar, ohne
neuen Code.

### Schritt 4: Seiten, Paare, Namen

- **Ansicht erkennen:** Ist die Figur um eine senkrechte Achse nahezu spiegelgleich (gespiegelte Teile decken sich mit ihren
  Partnern), ist es eine Front- oder Rückansicht; sonst Seite oder Dreiviertel.
- **Front:** Paare sind Teile, deren Spiegelbild ein anderes Teil deckt (Zuordnung nach Deckung und Form). Das im Bild linke Teil
  ist die **rechte Seite der Figur**. **Rücken:** umgekehrt (erkennbar daran, dass die Gesichts-Aufsätze fehlen und der
  Schwanz vorn liegt).
- **Seite:** Paare sind Einheiten mit gleicher Rolle (zwei Vorderbeine). Innerhalb eines Paars ist das **später gemalte** Teil
  näher; gibt das nichts her, das Teil mit sichtbaren weißen Aufsätzen (bei Ozzy tragen nur die nahen Beine Fenster). Schaut die
  Figur nach rechts, zeigt sie dem Betrachter ihre **rechte** Seite; die nahen Teile heißen dann „rechts“, schaut sie nach links,
  „links“. Das deckt sich mit dem Prototyp (in der Profilansicht liegen beinRV und beinRH vorn).
- **Jede Frage in der leichtesten Ansicht beantworten:** Rollen und vorn/hinten in der Seitenansicht, links/rechts und
  Spiegelpaare in der Frontansicht. Weil ein Teil in allen Ansichten dasselbe Teil ist, gilt die Antwort überall.
- **Anker-Entsprechung der Paare:** In der Frontansicht wird jedes Paar gespiegelt und die Anker zyklisch ausgerichtet (beste
  Verschiebung, ggf. umgekehrte Richtung), wie es der Import schon tut. Damit lassen sich Gelenke, Gewichte und Korrekturen von
  einer Seite auf die andere übertragen.
- **Namen:** anatomisch, auf Deutsch, mit stabiler Kennung: „Bein vorn rechts“ (`bein.vorn.r`), „Ohr links“ (`ohr.l`),
  „Schwanz“ (`schwanz`). Rolle und Seite werden als Daten gespeichert, nicht nur als Text, damit Spiellogik und Bewegungen
  „alle Beine“ oder „Ohr links“ ansprechen können.

### Schritt 5: Gelenke und Knochen

- **Gelenkpunkt** einer Einheit C an ihrem Eltern P: Man läuft Cs Hauptachse vom freien Ende her zu P; das Gelenk liegt dort, wo
  die Achse in P eintritt, um eine halbe örtliche Dicke nach innen versetzt (der Drehpunkt sitzt im Elternteil, die Wurzel des
  Glieds bleibt beim Drehen bedeckt). Reicht C nicht in P hinein, gilt die Mitte der Berührung; hat C keine Achse, der Schwerpunkt
  der Überlappung. (Character Animator heftet ebenfalls an der Überlappung an, dort per Hand gesetztem Ursprung.)
- **Knochenart** nach Vorlage: starr, Biegeachse oder Kette. Eine **Biegeachse** ist die Bézier-Achse aus Schritt 0 vom Gelenk
  zum freien Ende, mit festgehaltener Bogenlänge, Ende als Ziel (IK) und Biegung an beiden Enden, genau wie das Rückgrat im
  Prototyp (Hüfte, Fuß, Abstand, Biegung an Hüfte und Sohle).
- **Knie, wenn die Vorlage welche verlangt:** in dieser Reihenfolge an (1) einer Biegung, die schon in der Zeichnung steckt
  (Krümmungsmaximum der Achse), (2) einer deutlichen Verengung (Minimum der Dicke), (3) dem Anteil aus der Vorlage. Weil
  Pinocchio zeigt, dass das unsicher bleibt, ist ein Knie immer ein sichtbarer Vorschlag mit Ring zum Verschieben.
- **Fuß:** Berührt eine Einheit den Boden, wird ihr freies Ende ein **Fuß** mit Bodenkontakt; die Sohlenrichtung ist die
  Tangente des Umrisses am tiefsten Punkt.
- **Beugerichtung:** aus dem Vorzeichen der Achsenkrümmung in der Zeichnung; ist das Bein gerade, aus der Vorlage.

### Schritt 6: Gewichte

1. **Starre Einheiten** (Kopf): alle Anker und Griffe 1,0 an ihrem Knochen.
2. **Achsen-Koordinate für längliche Einheiten:** Jeder Punkt bekommt die Lage s seines Fußpunkts auf der Achse **über das
   Rechennetz**, nicht über den Luftabstand: Ein Punkt in einem Ärmel-Dreieck wird auf die Strecke zwischen den Mittelpunkten
   seiner beiden Sehnen projiziert, in einem End-Fächer gilt das Achsenende, in einem Knoten-Dreieck der nächste der drei Arme.
   So kann nichts über eine Lücke in ein anderes Glied „lecken“ (der Fehler, den Pinocchio bei Abstandsregeln beschreibt).
   - Mit **Biegeachse** braucht es keine Gewichte: Der Punkt wird als (s, d) gespeichert (Lage entlang, Abstand quer, d relativ
     zur Dicke) und an der gebogenen Achse wieder abgelegt.
   - Mit **Kette**: weiche Stufenfunktionen über s; die Übergangszone am Gelenk j ist ±κ · r(s_j) breit (κ = 1 als Start,
     **Pinocchios Regel: Übergang so breit wie das Glied dick**). κ ist der einzige Regler, den der AD je Gelenk sieht
     („weich/hart“, siehe Abschnitt 5).
3. **Naht zum Elternteil:** Punkte von C, die hinter dem Gelenk im Elternteil liegen, gehen über dieselbe weiche Stufe in den
   Elternknochen über. Das hält die Wurzel des Glieds im Rumpf; das weiche Verschmelzen im Renderer verdeckt den Rest.
4. **Aufsätze erben das Feld ihres Wirts:** Ihre Punkte bekommen (s, d) bzw. Gewichte bezogen auf die Achse des Wirts (oder
   baryzentrisch aus dessen Rechennetz). So biegt sich ein weißes Beinfenster mit dem Bein, statt starr mitzufahren.
5. **Füllteile** (Keile): jeder Punkt folgt dem geodätisch nächsten Wirt, zwischen zwei Wirten weich gemischt.
6. **Griffe:** Ein Griff übernimmt die Gewichte seines Ankers (dann bleiben Anker und beide Griffe unter derselben Abbildung;
   gerade Linien bleiben gerade, ein glatter Anker bleibt glatt). **Ausnahme:** Überspannt das Stück eine Gelenkzone (sein
   Fußpunkt auf der Kurve bei t = 1/3 bzw. 2/3 liegt in s mehr als eine halbe Zonenbreite vom Anker entfernt), bekommt der
   Griff eigene Gewichte, **ausgewertet am Kurvenpunkt, nicht an der Lage des Griffs** (Lehre aus Liu u. a.). Danach
   **Glätte-Reparatur:** War der Anker in der Ruheform glatt (Griffe auf einer Linie), werden beide Griffe auf die gemittelte
   Richtung gedreht, ihre Längen bleiben; Ecken bleiben Ecken. Ehrlich gesagt: Diese Grundregel liegt nahe an dem, was Liu u. a.
   als naiven Ansatz vergleichen. Sie ist schnell und bei kurzen Stücken gut genug; wo sie sichtbar versagt, helfen ein
   zusätzlicher Anker (Punkt 7) oder die kurventreue Option (Punkt 10).
7. **Zu wenige Anker:** Überspannt ein einziges langes Stück ein Gelenk, schlägt der Autorig vor, dort einen Anker formtreu
   einzufügen (de Casteljau, `teilen` gibt es schon). Weil alle Schlüsselformen dieselben Anker haben, wird an derselben Stelle
   (Stück k, Parameter t) in allen Schlüsseln geteilt. Das ist eine sichtbare Änderung an der Zeichnung und braucht deshalb
   ein Ja.
8. **Aufräumen:** höchstens zwei Knochen je Punkt in Ketten, drei an Verzweigungen; Gewichte unter 0,02 fallen weg; Summe 1;
   zwei Glättungsdurchläufe entlang des Umrisses (Nachbarn im Pfad, wie Spines „Smooth“).
9. **Rückfall für runde Einheiten mit mehreren Knochen:** Bounded Biharmonic Weights auf dem Rechennetz des Teils, iterativ
   gelöst (wie in Unity), an Ankern und Kurvenpunkten der Griffe abgelesen.
10. **Option „kurventreu“:** Für Teile, an denen der AD Wellen sieht, die Methode von Liu u. a.: je Knochen eine vorab gerechnete
    Matrix, Glätte an den Ankern als Nebenbedingung. Bei Ozzy-Größen (einige hundert Kontrollpunkte) ist das sofort fertig.

### Schritt 7: Morph und Knochen greifen ineinander

Das ist der Punkt, an dem 2D-Werkzeuge meist kranken: Knochen haben eine feste Ruhelage, Formen morphen darunter weg (die
Ohren gelten in allen Werkzeugen als Problemstelle, siehe Recherche vom 18.11.). Vorschlag in drei Schichten:

1. **Anheftung (Gelenke reiten auf der Form):** Jeder Gelenkpunkt und sein Ruhewinkel werden relativ zu den **Ankern des
   Elternteils** gespeichert: Zu jedem Zustand (Ansicht, Kopfdrehung, Haltung, Korrektur) wird die starre Bewegung bestimmt, die
   die nahen Eltern-Anker (nach Abstand zum Gelenk gewichtet) am besten von der Bezugsform in die aktuelle Form bringt
   (**Moving Least Squares, starre Variante**, Schaefer, McPhail, Warren 2006, [PDF](https://people.engr.tamu.edu/schaefer/research/mls.pdf)).
   Dreht sich der Kopf durch seine Schlüsselformen, wandern die Ohrgelenke mit, ohne dass jemand sie keyt. Starr heißt: kein
   Scheren, keine Skalierung des Gelenkrahmens.
2. **Lage (Pose):** Animation, IK, Physik und Haltungsschlüssel bewegen Knochen und Biegeachsen relativ zu dieser Ruhelage.
3. **Form im Knochenraum:** Schlüsselformen und Korrekturformen eines Teils werden als Versatz in den Koordinaten seines
   Knochens bzw. seiner Achse gespeichert (längs und quer, wie im Prototyp). Korrekturformen, die ein Gelenkwinkel auslöst, sind
   die bekannte Pose-Space-Idee aus dem 3D-Bereich (Fachwissen).

**Reihenfolge je Bild:** Morph-Parameter → Ruhelage der Gelenke aus der Form → Pose (Animation, IK, Physik) → Formen im
Knochenraum und Haut (Achse oder Gewichte) → Glätte-Reparatur → Renderer (Verschmelzen). Weil die Gewichte je Anker gelten und
alle Schlüssel dieselben Anker haben, gelten sie in jeder Ansicht.

### Schritt 8: Bewegungsgrenzen, Physik und Spiel aus demselben Lauf

- **IK** für Beine (Ziel am Fuß, Bodenkontakt), Beugerichtung aus Schritt 5, Winkelgrenzen aus der Vorlage.
- **Federketten** für Schwanz und Ohren (Steifigkeit nach Länge und Dicke voreingestellt).
- **Masse und Schwerpunkt** aus den Flächen der Teile (Dichte einstellbar). Für das Rad-Spiel ist das die wichtigste Größe:
  Ozzys Gleichgewicht hängt am Schwerpunkt über der Krümmung.
- **Kollisionsformen:** Kapseln entlang jeder Achse mit Radius aus dem Dickenverlauf, eine Kapsel oder Ellipse für den Rumpf;
  Füße als Kontaktpunkte. So kann Ozzy Hindernisse übersteigen, ohne dass jemand Kollisionsformen zeichnet.
- **Adressen für Spiellogik:** Rollen und Seiten sind abfragbar („wenn ein Fuß den Kontakt verliert …“, „Ohren schlackern beim
  Stolpern“), und Bewegungen aus einer Bibliothek passen auf jede Figur mit derselben Vorlage (wie bei Cartoon Animator oder
  Pinocchios Bewegungsbibliothek, nur ohne Namenszwang).

### Ablauf als Übersicht

```
autorig(figur, vorlage, gepinnt):
  für jedes Teil: abflachen; Fläche, Schwerpunkt, Trägheitsachsen, Streckung;
                  Rechennetz (eingeschränkte Delaunay-Zerlegung); Chordal-Achse, beschnitten; Dicke r(s); Achse als Bézier
  beziehungen  ← Schnittflächen, Anteile, Berührungen aller Paare
  verbünde, aufsätze, füllteile, gelenkteile ← klassifizieren(beziehungen)
  wurzel       ← größte Einheit mit den meisten Nachbarn
  baum         ← maximaler Spannbaum ab der Wurzel (Schnittfläche + Berührung)
  für vorn in {rechts, links}: zuordnung[vorn] ← ungarisch(punkte(einheiten, vorlage, vorn), gepinnt)
  rollen, sicherheit ← beste Zuordnung, Abstand zur zweitbesten
  seiten, paare, namen ← spiegelung (Front) | Tiefe im Paar + Blickrichtung (Seite)
  je Einheit: gelenk ← Eintritt der Achse ins Elternteil; knochen ← Vorlage (starr | Biegeachse | Kette)
  haut ← (s, d) entlang der Achse | weiche Stufen um Gelenke | erben (Aufsätze, Füllteile) | Rückfall BBW
  griffe ← erben vom Anker, außer über Gelenkzonen (Kurvenpunkt); Glätte-Reparatur
  anheftung ← starre MLS-Gewichte der Eltern-Anker je Gelenk
  ik, federn, masse, kapseln, füße ← Vorlage + Geometrie
  gib rig zurück (ein Rückgängig-Schritt) und die Liste unsicherer Entscheidungen
```

### Erwartetes Ergebnis an Ozzy (Profilansicht „Stehen“)

| Teil | Art | Rolle | hängt an | Bewegung |
| --- | --- | --- | --- | --- |
| bohne | Einheit (Wurzel) | Rumpf | – | Biegeachse, Becken und Brust |
| kopfA + kopfB | Verbund | Kopf | Rumpf | starr, Nacken-Gelenk |
| ohrA, ohrB | Einheiten | Ohr rechts (nah), Ohr links (fern) | Kopf | Biegeachse, Federkette |
| ohrSpalt | Aufsatz | – | Ohr, das ihn enthält | erbt |
| nase, bartA, bartB | Aufsätze | Nase, Bart | Kopf | erbt |
| schwanz | Einheit | Schwanz | Rumpf | Biegeachse, Federkette |
| schwanzW | Aufsatz | – | Schwanz | erbt |
| beinRV, beinRH | Einheiten | Bein vorn/hinten rechts (nah) | Rumpf | Biegeachse, Fuß am Boden |
| beinLV, beinLH | Einheiten | Bein vorn/hinten links (fern) | Rumpf | Biegeachse, Fuß am Boden |
| fensterRV, fensterRH | Aufsätze | – | Bein RV, RH | erbt (biegt mit) |
| keilV, keilH | Füllteile | – | Bein RV bzw. RH (wie in den Handdaten), Rand zum Rumpf weich | erbt gemischt |

Neun bewegliche Elemente für 19 Teile: Rumpf, Kopf, zwei Ohren, Schwanz, vier Beine. Das ist so wenig, wie es für Stehen,
Sitzen, Liegen, Laufen und Stolpern geht. Die heutigen Handdaten (`ELTER`, `PARTNER`, Kopfteile in `haltung.ts`) sind die
Musterlösung für eine automatische Prüfung.

---

## 5. Bedienung: ein Klick, sichtbar, rückgängig

1. **Auslösen:** ein Knopf „Bewegen vorbereiten“ (oder automatisch beim ersten Wechsel in den Bewegen-Modus). Der Lauf dauert für
   eine Figur wie Ozzy geschätzt deutlich unter 50 ms (abschätzen, nicht gemessen; Probe in Abschnitt 9).
2. **Zeigen:** Die Knochen wachsen in einer halben Sekunde vom Rumpf nach außen; Teile werden kurz in ruhigen Rollenfarben
   getönt; Gelenke erscheinen als kleine Ringe, Achsen als feine, sich verjüngende Linien (keine durchgehenden Outlines, passend
   zu den Look-Regeln); Namen als kleine Schilder, nur solange die Rig-Ebene sichtbar ist.
3. **Probewackeln:** Sofort danach spielt eine drei Sekunden lange Probe: Beine treten, Schwanz wedelt, Ohren schlackern, Kopf
   nickt, Rumpf atmet. Ein falsch angehängtes Teil sieht man in diesem Moment, ohne etwas zu verstehen (Animated Drawings zeigt
   ebenfalls sofort eine Bewegung, 3D-Autorigger eine Vorschau-Animation; letzteres Fachwissen).
4. **Fragen nur bei Unsicherheit:** Entscheidungen mit kleinem Sicherheitswert tragen ein Fragezeichen. Antippen zeigt zwei
   kleine Vorschauen („Kopf hier“ / „Kopf dort“), ein Tippen entscheidet.
5. **Korrigieren mit derselben Grammatik wie überall im Editor:**
   - Gelenkring ziehen: Gelenk verschieben.
   - Rand des Rings ziehen: Übergang weicher oder härter (κ).
   - Teil antippen: Rolle im Ringmenü wählen (Bein, Schwanz, Ohr, starr, Aufsatz …).
   - Teil auf ein anderes ziehen: dort anheften.
   - Achse antippen: „biegsam / starr / mit Knie“.
   - Gewichte malen nur als Fachwerkzeug (Pinsel hinzufügen, abziehen, glätten; Sperren je Knochen wie bei Spine und Rive).
6. **Gepinnt bleibt gepinnt:** Jede Korrektur wird als Entscheidung des AD markiert (kleiner Stecknadel-Punkt). Ein neuer Lauf,
   etwa nach einem neuen Teil wie einem Hut, behandelt gepinnte Entscheidungen als feste Bedingungen. Neu angelegte Teile
   werden automatisch an die Einheit geheftet, die sie am stärksten überlappen.
7. **Rückgängig:** Der ganze Autorig ist ein Schritt, jede Korrektur ein weiterer.
8. **Lebendig:** Ändert der AD eine Form, rechnet der Autorig für nicht gepinnte Teile sofort nach (Achse, s-Werte, Gewichte);
   gepinnte Gewichte bleiben je Anker erhalten, neue Anker bekommen interpolierte Werte. Spine braucht dafür ein manuelles
   Neu-Binden; bei uns geschieht es von selbst.

---

## 6. Technik

- **Sprache und Ort:** TypeScript wie der Prototyp, in einem Web Worker (das Muster gibt es schon in `raum/bau.worker.ts`);
  läuft offline auf Mac, iPad und iPhone, kein Server, kein Modell.
- **Bausteine:** eingeschränkte Delaunay-Zerlegung (kleine erprobte JS-Bibliothek wie `cdt2d` oder `poly2tri`, oder eigene
  Umsetzung), Polygon-Verschneidung (Martinez-Rueda oder Clipper als JS), Ungarische Methode (etwa 60 Zeilen), starre MLS
  (geschlossene Formel), BBW als Rückfall (projiziertes Gauß-Seidel auf wenigen hundert Dreiecken), Kurven-Fit nach Liu u. a.
  (kleines lineares Gleichungssystem je Teil, einmal vorab). Bibliotheksnamen sind Vorschläge, nicht geprüft.
- **Datenmodell (Kern):** Vorlage (JSON: Rollen, Merkmale, Knochenart, Grenzen, Physik, Namen) · Rig (Einheiten, Rollen,
  Seiten, Paare mit Anker-Entsprechung, Gelenke mit Anheftung an Eltern-Anker, Achsen je Schlüssel, Haut je Anker und Griff,
  gepinnte Entscheidungen, Sicherheitswerte).
- **Grenzen der Technik:** Biegeachsen sind kein Standard anderer Laufzeiten (Spine, Unity). Ein späterer Export müsste sie in
  Knochenketten mit Gewichten backen. Für unseren eigenen Spiel-Renderer ist das kein Hindernis.

---

## 7. Empfehlungen

1. **Autorig als eigener, kleiner Rechenkern** in TypeScript (Worker), deterministisch, ohne Netz-Modelle und ohne Server.
2. **Teile-Graph zuerst:** Überlappung, Enthaltensein, Berührung, Malreihenfolge bestimmen Aufsätze, Verbünde, Füllteile,
   Gelenke und Eltern.
3. **Vorlagen als Daten** (zuerst „Vierbeiner“, dann „Wesen“ als allgemeiner Rückfall), Zuordnung über Punktzahlen und die
   Ungarische Methode, beide Blickrichtungen probieren, Namen nur als starker Hinweis.
4. **Achse je Teil** über Chordal-Achse mit Teddy-Beschneiden; daraus Gelenkpunkt, Dicke, Bézier-Achse.
5. **Biegeachsen als Standard** für Beine, Schwanz, Ohren und Rumpf (das Prototyp-Rückgrat verallgemeinert); Knochenketten nur,
   wo die Vorlage ein echtes Knie verlangt.
6. **Haut über die Achsen-Koordinate**, Übergangsbreite gleich der örtlichen Dicke, ein Regler je Gelenk; Aufsätze und Füllteile
   erben; Griffe erben, außer über Gelenkzonen (dann am Kurvenpunkt ausgewertet), danach Glätte-Reparatur.
7. **Gelenke reiten auf der Form** (starre MLS über die Eltern-Anker), Korrekturformen im Knochenraum, feste Reihenfolge je Bild.
8. **Seiten anatomisch:** Front über Spiegelung, Seite über Tiefe im Paar und Blickrichtung; jede Frage in der leichtesten
   Ansicht beantworten; Anker-Entsprechung der Paare zum Spiegeln von Korrekturen.
9. **Bedienung:** ein Klick, Probewackeln, Fragezeichen nur bei Unsicherheit, Ringe ziehen, Teile antippen oder anheften,
   Pinnen, ein Rückgängig-Schritt, lebendiges Nachrechnen.
10. **Nebenprodukte gleich mitliefern:** IK mit Bodenkontakt, Federketten, Masse und Schwerpunkt, Kollisionskapseln, Rollen als
    Adressen für Spiellogik.
11. **Kurven-Fit nach Liu u. a. als zweite Stufe** vorsehen, nicht als ersten Bauschritt; vorher prüfen, ob Florian an Gelenken
    Wellen oder Knicke sieht.
12. **Probe an Ozzy** wie in Abschnitt 9, verglichen mit den Handdaten des Prototyps; Urteil über Look und Bewegung bei Florian.

---

## 8. Risiken und offene Fragen

**Risiken**

- **Figuren aus einem einzigen Umriss** (ohne Teile) brauchen den Notweg: Teilung an Paaren starker Einbuchtungen (Minima-Regel
  und Short-Cut-Regel aus der Wahrnehmungsforschung, Fachwissen) und Chordal-Achse der Gesamtform. Das ist weniger
  zuverlässig. Unsere eigene Pipeline erzeugt aber Teile.
- **Schwellwerte** (85 % Enthaltensein, Streckung 1,6 usw.) sind Startwerte. Mit nur einer echten Figur droht Überanpassung an
  Ozzy. Gegenmittel: Florians Testformen und zwei bis drei einfache fremde Figuren (Vogel, Fisch, Mensch) als Proben.
- **Tiefe aus der Malreihenfolge** ist bei gleichfarbigen, verschmelzenden Teilen schwach; deshalb nur innerhalb eines Paars
  und mit Rückfrage bei Gleichstand.
- **Knie** bleiben ein Vorschlag (Pinocchio). Bei Biegeachsen entfällt das Problem weitgehend.
- **Lineares Mischen** knickt bei starker Beugung ein; Biegeachsen vermeiden das, Knochenketten brauchen bei Bedarf eine
  Korrekturform oder eine Drehwinkel-Mischung.
- **Anker einfügen** verändert die Zeichnung (wenn auch formtreu) und alle Schlüssel; nur mit Ja des AD.

**Offene Fragen an Florian**

1. Soll der Autorig beim Import einer Figur von selbst laufen oder erst auf Knopfdruck?
2. Beine standardmäßig als **biegsame Achse** (wie jetzt im Prototyp) oder mit **sichtbarem Knie**?
3. In welcher Ansicht soll Ozzy gerigget werden: Profil „Stehen“ (stand02) oder Logo?
4. Sollen Ohren und Schwanz von Anfang an federn (Physik an), oder erst, wenn er es einschaltet?
5. Die zwei Kopfmasken als **ein** Kopf mit einem Knochen (Drehung kommt aus den Schlüsselformen) – richtig so?
6. Sollen die Keile zwischen den Beinen am nahen Bein hängen (wie heute) oder zwischen Bein und Rumpf gemischt werden?
7. Gewichte malen: überhaupt sichtbar für ihn, oder nur als verstecktes Fachwerkzeug?

---

## 9. Probe (vor dem Bau festgelegt)

- **Eingabe:** Ozzy, Profilansicht „Stehen“, ohne Teilnamen (Namen entfernt), dann noch einmal mit Namen.
- **Automatisch prüfbar:** Rollen, Seiten, Eltern und Aufsätze stimmen mit `ELTER`, `PARTNER` und den Kopfteilen des Prototyps
  überein (Abweichungen werden aufgelistet, nicht versteckt); Laufzeit auf dem iPhone unter 50 ms.
- **Sichtbar für Florian (gleiche Ansicht vorher/nachher):** das Probewackeln; Kriterien: keine Lücke und kein Knick an Hüften,
  Schultern, Nacken und Schwanzansatz; Weiß bleibt in seinem schwarzen Wirt; Beine behalten beim Biegen ihre Länge; Ohrgelenke
  wandern bei der Kopfdrehung mit.
- **Fremde Figuren:** eine einfache Vogel- und eine Fischform aus wenigen Teilen; Kriterium: sinnvolle Rollen mit der Vorlage
  „Wesen“, keine Abstürze, Fragezeichen nur an echten Zweifelsfällen.
- **Urteil:** Florian entscheidet über Look und Bewegung; Zählungen allein gelten nicht als bestanden.

---

## 10. Quellen

Geöffnet und gelesen (Primärquellen):

- Smith u. a. 2023, Animated Drawings: [arXiv](https://arxiv.org/abs/2303.12741), [HTML](https://ar5iv.labs.arxiv.org/html/2303.12741), [MIT DSpace](https://dspace.mit.edu/handle/1721.1/150815)
- Baran, Popović 2007, Pinocchio: [PDF](https://people.csail.mit.edu/ibaran/papers/2007-SIGGRAPH-Pinocchio.pdf)
- Xu u. a. 2020, RigNet: [arXiv](https://arxiv.org/abs/2005.00559), [HTML](https://ar5iv.labs.arxiv.org/html/2005.00559)
- Liu, Jacobson, Gingold 2014, Skinning Cubic Bézier Splines: [Projektseite](https://cragl.cs.gmu.edu/splineskin/), [Code](https://github.com/songrun/VectorSkinning)
- Igarashi, Matsuoka, Tanaka 1999, Teddy (Chordal-Achse, Beschneiden): [PDF](https://www-ui.is.s.u-tokyo.ac.jp/~takeo/papers/siggraph99.pdf)
- Igarashi, Moscovich, Hughes 2005, As-Rigid-As-Possible Shape Manipulation: [PDF](https://www-ui.is.s.u-tokyo.ac.jp/~takeo/papers/rigid.pdf)
- Schaefer, McPhail, Warren 2006, Image Deformation Using Moving Least Squares: [PDF](https://people.engr.tamu.edu/schaefer/research/mls.pdf)
- Unity 2D Animation: [Werkzeuge](https://docs.unity3d.com/Packages/com.unity.2d.animation@9.1/manual/SkinEdToolsShortcuts.html), [Arbeitsablauf](https://docs.unity3d.com/Packages/com.unity.2d.animation@7.2/manual/CharacterRig.html), [Paket-Quelltext (Spiegel)](https://github.com/needle-mirror/com.unity.2d.animation)
- Spine: [Weights-Ansicht](https://esotericsoftware.com/spine-weights), [PSD-Import](https://esotericsoftware.com/spine-import-psd)
- Rive: [Bones und Gewichte](https://rive.app/docs/editor/manipulating-shapes/bones)
- Moho: [Tutorial 3.1, Binden](https://www.lostmarble.com/moho/manual/tut03/01)
- Blender: [Handbuch, Parenting mit Gewichten](https://docs.blender.org/manual/en/latest/animation/armatures/skinning/parenting.html)
- Live2D Cubism: [Modellvorlagen](https://docs.live2d.com/en/cubism-editor-manual/template)
- Duik: [Wiki, Strukturen](https://github.com/RxLaboratory/Duik/wiki/create-structures)
- RubberHose: [Produktseite](https://battleaxe.co/rubberhose)
- Creature: [Produktseite](https://kestrelmoon.com/creature/creature2D.html)

Aus Suchauszügen (Seite nicht vollständig gelesen oder gesperrt):

- Bai, Latecki, Liu 2007, Beschneiden mit diskreter Kurvenevolution: [Wikipedia](https://en.wikipedia.org/wiki/Discrete_skeleton_evolution), [PubMed](https://www.pubmed.gov/17224615/)
- Chordal-Achse (Prasad): [OSTI](https://www.osti.gov/biblio/977914), [Springer](https://rd.springer.com/chapter/10.1007/978-3-540-31965-8_25); Mittelachsen-Überblick: [Eppstein](https://ics.uci.edu/~eppstein/gina/medial.html)
- Character Animator: [Grafik vorbereiten](https://helpx.adobe.com/adobe-character-animator/desktop/creating-and-controlling-puppets/prepare-artwork.html), [Netz, Anheftung, Griffe](https://helpx.adobe.com/adobe-character-animator/desktop/rigging/attachment-and-handles.html)
- Live2D: [Vorlage anwenden](https://docs.live2d.com/en/cubism-editor-manual/applying-the-model-template/)
- Cartoon Animator: [Produktseite](https://reallusion.com/cartoon-animator/custom-2d-character.html), [Handbuch PSD-Vorlagenknochen](https://manual.reallusion.com/Cartoon_Animator_4/ENU/Pipeline/Content/Resources/4.1/07_PSD_In/Creating_PSD_Characters_Template_Bone.htm), [Forum](https://discussions.reallusion.com/t/ask-custom-character-rig-not-working-properly-in-cartoon-animator/12883)
- Duik bei Vierbeinern: [School of Motion](https://schoolofmotion.com/blog/how-to-rig-quadrupeds-animation), [Pixel Bakery](https://pixelbakery.com/recipes/character-rigging)
- Spine-Forum: [Auto-Gewichte nur für den ersten Knochen](https://fr.esotericsoftware.com/forum/d/28557-mesh-auto-weighting-only-assigns-to-first-bone), [Knochen binden nicht](https://ko.esotericsoftware.com/forum/d/9644-bones-will-not-bind-to-a-mesh)
- Blender-Probleme: [Bone heat failed](https://projects.blender.org/blender/blender/issues/45493), [Lösungen](https://www.blendernation.com/2023/05/19/solutions-to-bone-heat-weighting-error/), [Grease-Pencil-Gewichte](https://projects.blender.org/blender/blender/issues/104077)

Bekannt, in dieser Runde nicht vollständig geöffnet:

- Jacobson, Baran, Popović, Sorkine 2011, Bounded Biharmonic Weights: [PDF](https://homes.cs.washington.edu/~jovan/papers/jacobson-2011-bbw.pdf) (für das Abrufwerkzeug zu groß)
- Pose-Space-Korrekturen (Lewis u. a. 2000), Minima- und Short-Cut-Regel der Teilwahrnehmung, Straight Skeleton, Marker-Autorigger in 3D: Fachwissen ohne neue Quelle

Frühere Recherchen im Repo:

- [`docs/research/2026-11-18-ozzy-figur-recherche.md`](../2026-11-18-ozzy-figur-recherche.md) (Live2D-Raster, Rive, Ohren als Problemstelle)
- [`docs/research/2026-11-16-ozzy-morph-und-animation.md`](../2026-11-16-ozzy-morph-und-animation.md) (Morph-Grundlagen, so starr wie möglich)
