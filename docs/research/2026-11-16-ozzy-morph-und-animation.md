# Ozzy, das Maskottchen: wie man ihn morpht und animiert (Recherche, 16.11.2026)

Auftrag (Florian, 16.11.): Ozzy als Vektor nachbauen, in Teile zerlegen, Kopf um 360° drehbar, Animationen aus Vektormorph und
Knochen, die sauber ineinander übergehen; dazu eine Bibliothek, Filmstreifen und Steuerung wie im Jump'n'Run. Seine Rückmeldungen
während der Arbeit: „super smooth“, „tropfenförmig und wunderschön“, „spitz sein können“, „nichts wie ein Blatt drehen, die Dicke der
Silhouette nutzen“, „nur so viele Punkte wie nötig, viel mit den Bézier-Griffen arbeiten, keine Punkte hinzufügen“.

## 1. Was ein schöner Vektor-Morph braucht

- **Gerade Punktbahnen sind der Fehler.** After Effects und die meisten Werkzeuge schieben jeden Punkt auf gerader Linie von
  Schlüssel zu Schlüssel; dreht sich eine Form dabei, schrumpft und knickt sie in der Mitte. Abhilfe dort: gleiche Punktzahl, gleicher
  erster Punkt, anatomisch passende Punkte, mehr Schlüssel ([Adobe-Forum](https://community.adobe.com/t5/after-effects-discussions/how-do-i-morph-shapes-with-different-points-in-a-controlled-way/m-p/10037073),
  [Set First Vertex](https://www.provideocoalition.com/after-effects-hidden-gems-set-first-vertex/)).
- **Winkel und Längen statt Lagen** (Sederberg, Gao, Wang, Mu: „2-D shape blending: an intrinsic solution to the vertex path problem“,
  SIGGRAPH 1993, [Eintrag](https://history.siggraph.org/?p=118584)): Interpoliert man Kantenlängen und Winkel, entstehen deutlich
  bessere Zwischenformen; Formen drehen sich, statt zu schrumpfen.
- **So starr wie möglich** (Alexa, Cohen-Or, Levin, SIGGRAPH 2000, [PDF](https://www.tau.ac.il/~levin/arap.pdf)): örtliche Abbildung in
  Drehung und Dehnung zerlegen, Drehungen interpolieren; das geringstmöglich verzerrte Mittelbild.
- **Im Netz üblich:** GSAP MorphSVG wandelt alles in kubische Bézier-Stücke und hat einen Modus „rotational“ für Formen, die sich
  ineinander drehen sollen ([Doku](https://gsap.com/docs/v3/Plugins/MorphSVGPlugin)).
- **Profis bei 2D-Puppen** (Moho, Toon Boom, Spine, Rive): für jede Ansicht, in die die Figur dreht, eine Zeichnung (Front, 3/4,
  Seite, 3/4 hinten, hinten); dazwischen Vektor-Morph über Knochen; die Ohren sind die übliche Problemstelle
  ([Moho-Forum](https://lostmarble.com/forum/viewtopic.php?p=216587), [Spine-Forum](https://esotericsoftware.com/forum/d/13961),
  [Reallusion 360 Head Creator](https://cdn-www.reallusion.com/cartoon-animator/360-head-creator.html)).

**Folgerung für Ozzy:** Formen aus wenigen Bézier-Ankern mit Griffen (wie in Florians Illustrator-Datei), in jeder Ansicht dieselben
Anker; gemorpht nach Winkel und Länge (Griffe immer, Anker bei kompakten Teilen um ihren Schwerpunkt); glatte Anker bleiben glatt,
Ecken bleiben Ecken; nichts wird wie eine Karte gedreht oder gequetscht; fehlende Ansichten (3/4, hinten) gehören gezeichnet.

## 2. Steife Beine, Gang, Komik

- **Passives Gehen mit steifen Beinen** (McGeer 1990, [PDF](https://courses.ece.ucsb.edu/ECE594/594D_F13Byl/papers/McGeer90.pdf)): Der
  Körper wölbt sich wie ein umgedrehtes Pendel über das Standbein; damit das Schwungbein frei kommt, wiegt das Spielzeug seitlich.
  Für Ozzys Gipsbeine: Passgang (nahe Seite, dann ferne Seite) mit Wiegen; die Sohle rollt über ihre runden Ecken, der Körper hebt
  sich dabei leicht und fällt beim flachen Aufsetzen („klack“).
- **Gromit** hat keinen Mund; fast alles spielt die Stirn über den Augen, klein und kontrolliert, trocken
  ([Looper](https://www.looper.com/374599/the-untold-truth-of-wallace-and-gromit),
  [Aardman](https://www.inkl.com/news/the-art-of-aardman-why-wallace-never-learns-and-gromit-never-needs-to-speak)). Ozzys Schlitze sind
  genau so eine Stirn: heben (neugierig), senken und kippen (entschlossen), dazu Ohren und Kopfneigung. Situationskomik statt
  Übertreibung: Pausen, Doppelblicke, Unbeirrbarkeit.

## 3. Übergänge und Nachschwingen

- **Trägheits-Übergänge** (Bollo, GDC 2018, „Inertialization“, [GDC Vault](https://gdcvault.com/play/1025165/Inertialization-High-Performance-Animation-Transitions);
  [Dead Blending](https://theorangeduck.com/page/dead-blending)): statt hartem Überblenden die Differenz zwischen alter und neuer Pose
  mit ihrer Geschwindigkeit abklingen lassen. Für Ozzy reicht Überblenden im Zahlenraum der Pose (alle Clips liefern Zahlen, die
  Formen folgen daraus), mit weicher Kurve.
- **Nachschwingen** als gedämpfte Feder auf Ohren, Schopf, Schwanz, Bart und Kopf, über die Clips gelegt (leicht unterdämpft, um
  ζ 0,3 bis 0,6) ([Federn](https://theorangeduck.com/page/perfect-tracking-springs),
  [Secondary motion in 2D, Willett 2017](https://gfx.cs.princeton.edu/pubs/Willett_2017_SMF/paper.pdf)).

## 4. Steuerung wie im Jump'n'Run

Coyote-Zeit (kurz nach der Kante noch springen), Sprung-Puffer (Druck kurz vor der Landung merken), variable Sprunghöhe; Fenster
um 0,1 s ([Celeste-Gestaltung](https://gigazine.net/gsc_news/en/20200317-celeste-action-feel-things),
[Erklärung](https://bugnet.io/blog/coyote-time-and-input-buffering-explained)).
