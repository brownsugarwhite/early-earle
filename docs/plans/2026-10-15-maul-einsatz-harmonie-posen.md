# Plan: Maul als Einsatz, Werkzeug-Harmonie und Posen-System (15.10.2026)

> Freigegeben von Florian am 15.10.2026 (Planmodus). Ausführliche Entwürfe: [Teil A Maul als Einsatz](2026-10-15-entwurf-maul-einsatz.md), [Teil H Werkzeug-Harmonie](2026-10-15-entwurf-werkzeug-harmonie.md), [Teil B Posen](2026-10-15-entwurf-posen.md). Ersetzt [„Fressen wie Editor“](2026-10-15-fressen-wie-editor.md) und führt den Entwurf [„Maul als Einsatz“](2026-10-15-maul-als-einsatz.md) aus.

## Kontext

Florian hat am 15.10. vormittags an seinen eigenen Wesen eine Kette von Grundfehlern gefunden und die Arbeit gestoppt („du machst gerade schnell schnell und machst alles nur verworren und kaputt“):

- **Form und Maul:** Der Körper lässt sich „ganz ok“ bauen; sobald das Maul dazukommt, wird es äußerst fragil: Nasen und Bäuche kollabieren (Langhals-Nase, Kugel mit Bauch unter hohem Maul), Kinn wird zur senkrechten Wand (Kugel, Seite Δ 27,5 px), am Ei wächst ein Schnabel aus dem Umriss (Δ 29,1 px), Falten und Wellen schon beim einfachsten Maul, der gelbe Umriss wird unruhig und ragt aus der schwarzen Form, steile Mundwinkel (J) sind unmöglich, ein echter Rex-Unterbiss zerreißt alles (Δ 201 px).
- **Fressen:** Nach der heutigen Änderung bleibt beim Zurückspringen auf „Editor“ die Pose-Form erhalten; mit Maul lässt sich in Fressen nichts verschieben; das Maul ist in der Pose nicht wie im Editor bearbeitbar.
- **Werkzeuge:** „Tools wie Ziehen und Aufblasen werden nicht korrekt auf die Shapes übertragen … jede Änderung der schwarzen Linie oder das Setzen des Mauls wirft unvorhersehbare Abweichungen aus … Alle Werkzeuge müssen perfekt harmonieren!“ (Bild: gepinselte Kugel, Seite Δ 25,2, Front Δ 37,5, rot 34 px).
- **Tests:** Meine Prüfungen liefen an wenigen festen Prüfwesen gegen eigene Zahlen; nichts davon ist abgenommen („Die Testwesen sind nur zum Testen … Keines erfüllt bisher meine Kriterien … Deine Tests waren sehr, sehr unvollständig“).

Seine Vorgaben (wörtlich zusammengefasst):
- Die **schwarze Form ist die Hauptform**; das Netz ist immer glatt außer an gewollten Kanten.
- Das **Maul sitzt perfekt und beeinflusst das Grundnetz nicht**: ein perfekter Schlitz genau an der gezeichneten Stelle; die Lippen folgen exakt der Mundlinie bzw. den beiden Kieferlinien, ohne dass das Netz seine Form ändert.
- **Über- und Unterbiss** perfekt über die Bézier-Griffe; **Ober- und Unterkiefer beeinflussen sich nicht**, wenn sie getrennt bearbeitet werden; **Topologie immer optimal**; Morphs sauber und glatt.
- **Alle Werkzeuge harmonieren:** Pinsel, schwarze Linien, Spanten, Maul greifen ineinander, ohne unvorhersehbare Abweichungen.
- **Posen und Blendshapes sind das Herzstück und Alleinstellungsmerkmal:** Editor-Tab = Grundform (Shapes und Maul wie im Editor), Pose-Tab = Pose; in der Pose ist alles genau wie im Editor bearbeitbar, die Lippen liegen exakt auf Rot/Blau; **in Fressen ist das Maul immer getrennt**, auch wenn es im Editor bündig ist; Hin- und Herspringen muss perfekt gehen; **Regler für Morphs zwischen den Posen** (am besten in „Posen & Leben“); **Bones je Pose separat positionierbar**.
- Grundidee über allem: **Blendshapes und Bones kombinieren für ganz extreme Posen** (seine Bögen 04/05/06: offen läuft die Unterlippe den Langhals hinab bzw. die Robbenbrust bis zum Boden; kleine geschlossene Mäuler werden groß und rund).

Grundlage ist die große Sitzung: Plan „Wesen-Editor 2“ (`docs/plans/2026-10-13-wesen-editor-2.md`) mit Käfig als Wahrheit, Kurven als Griffe, Topologie-Garantien (4.5: nur Loop-Cut, Inset, Bridge, Spiegeln; nach jeder Operation Mannigfaltigkeits-Test), Fressen-Pose = Knochen + Körper-Blendshape (5.2), „Posen & Leben“ mit allen Werkzeugen der Stufen 1–5 (9.4), Rückfall „Maul-Topologie als eigene Vorlage“ (13). Florians Maul-Bögen `docs/look/editor/04-wesen-mit-maeulern.png`, `05-maul-detail.png`, `06-rex-mit-maul.png` sind die Spezifikation für Linien (türkis zu/gleich, rot Oberkiefer, blau Unterkiefer, schwarzer Mundwinkel als gemeinsamer Punkt, offen Rot und Blau getrennt, schwarze Silhouette läuft durch den Mundwinkel).

**Entscheidungen Florian (Planmodus, 15.10.):**
1. Maulbau: **Einsatz um die Linie** (Feld um die Linie bekommt Ringe aus Vierecken, die der Linie folgen; Grundnetz außerhalb bitgleich, innen formtreu nachgelöst; Lippen exakt auf Rot/Blau; jede Linienform und Lage). Das geht über die große Sitzung hinaus (dort: Längsschleife einrasten, nur monotone Linien) und nutzt ihre erlaubten Operationen Inset/Bridge.
2. Bones: **Stellung je Pose, Rig gemeinsam** (Gelenklage und Gewichte gelten für alle Posen).
3. Reihenfolge: **erst Maul, dann Posen**; genauer (zweite Fragerunde): Prüfstand → **Tab-Sofortkorrektur** → Maul-Beweis → Werkzeug-Fundament → Maul in den Editor → Posen.
4. Die heutigen Fressen-Commits **zurücknehmen**.
5. Pinsel und Linie: Die schwarze Linie zeigt das **Pinsel-Relief, seine Punkte bleiben**; neue Punkte nur von Hand oder per „Relief übernehmen“.
6. Maullinien: **bleiben, wo gezeichnet** (in ihrer Ansicht; Anfang folgt der Kontur, Tiefe auf der Haut, der kürzere Kiefer behält seinen Abstand nach innen) — wie in Illustrator.
7. (Nachtrag 15.10. nachmittags) **Teil G „Grundkörper für jede Form“** kommt in den Plan, nach dem Maul-Beweis und vor dem Werkzeug-Fundament.

## Befund (Code-Analysen 15.10.)

**Warum das Maul den Körper verändert** (`kern/maul.ts`, `kern/ableiten.ts`):
1. Jeder Maulring wird umverteilt, damit eine feste Längsschleife auf der Lippe liegt (`maul.ts:626`, `ableiten.ts:1222`): über/unter der Lippe immer 4/4 bzw. 5/3 Punkte, egal wie hoch die Lippe sitzt → der Bauch unter einem hohen Maul klappt zur Flosse; die Schleifen springen zwischen umverteilten und normalen Ringen (Stirnfalte, Kinnwulst).
2. Ein Anfang über der Spitze ist nie ein Konturanfang (`maul.ts:400–415`): Die Lippe läuft durch die Spitze, und `schlitzNah` zieht die Körperspitze mit Gewicht 16 zum gezeichneten Anfang (hohes Maul, Ei-Schnabel).
3. Der kürzere Kiefer wird auf eine Wand gedrückt (`maul.ts:1840–1858`): Kinnwand, Unterbiss Δ 201 px.
4. Das Maul ändert die Stationen am ganzen Körper (`kappeMin`, `maulBereich`, Stapeln), und der Editor schreibt sie ins Dokument zurück (`kernBau.ts:161–165`); sie bleiben auch nach dem Entfernen des Mauls (Langhals-Nase).
5. Mit Maul löst der ganze Körper anders (Glättung 0,15 nur mit Maul, Breitengewicht 4 statt 16, keine Breitenpunkte an Eckringen).
6. Jeder Kiefer folgt seiner Linie spaltenweise ohne Glättung → zackige Breiten, unruhiger gelber Umriss.
7. Faltenumbau und nachträgliche Kettenlösungen an der Lippe → Wellen.
8. Die Lippe hat einen Punkt je Ring und läuft monoton längs: J-Haken, senkrechte Enden und seitliche Mäuler sind unmöglich.
9. Pinsel-Deltas hängen an Käfigindizes und werden **nach** dem Maulbau addiert (`wesen.ts:858, 941`) → mit Maul landen sie an anderen Stellen und auf den Lippen („rot 34 px“).
10. Beim Öffnen trennt die Standard-Schleife statt der Lippenhöhe Schädel und Kiefer; ein Bauch nahe dem Gelenk dreht mit.
11. Jede Geste mit Maul baut alles neu; nur drei Entscheidungen der Maullage sind eingefroren.

**Warum Fressen/Posen nicht tragen** (Editor und `kern/wesen.ts`):
1. Der Editor-Knopf setzt erst den Modus, dann die Öffnung; der Kern überblendet die Pose bei Öffnung > 0 in jedem Modus, und neu gebaut wird bei einer Öffnungsänderung nur mit Maul → Wesen ohne Maul behalten die Pose (`MenuBar.tsx:16`, `wesen.ts:865`, `Szene3D.tsx:335`).
2. Die Öffnung steuert Überblendung und Knochen in jedem Modus (Regler in Maul/Zähne, Kieferknopf; Knochen greifen setzt 100 %).
3. Pose entfernen, Laden und Neu wechseln den Modus, ohne die Öffnung zurückzusetzen.
4. Pose-Bearbeitungen landen in der Grundform (Ruhen/Laufen: alle Werkzeuge außer dem Pinsel; Punkte einfügen; Kiefer gleich/getrennt).
5. Datenlücken: Knochen nur global, ein Pose-Käfig im Zwischenspeicher, Bauplan nur Öffnung + eine Pose; „Modus“ heißt zugleich „was ich bearbeite“ und „was ich sehe“; Pose-Deltas werden nach den Knochen addiert.

**Warum die Werkzeuge nicht harmonieren:**
1. Pinsel-Deltas sind Weltversätze je Käfigpunkt relativ zu einem Käfig, der bei jeder Linienänderung neu abgeleitet wird; die Neuableitung ist nicht örtlich (10 px Zug → 3–9 px außerhalb des Bands, schon ohne Maul) → Pinseldetails wandern.
2. „Formen folgen“ passt die Linien mit festen Knoten an: Eine gepinselte Silhouette ist mit 4 Knoten (Kugel) nicht darstellbar → Δ 25/37 px; die nächste Linienänderung lässt den Körper dann auf die ungenaue Linie springen.
3. Maullinien speichern ihre Tiefe beim Zeichnen; nach Pinsel oder Linienänderung liegen sie nicht mehr auf der Haut.
4. Mit Maul: siehe Maul 9.

## Grundsätze für die ganze Arbeit

1. **Keine Meldung „fertig/bestanden“ ohne Florians Abnahme.** Meldungen heißen „gebaut, gemessen an …, Abnahme offen“. Jede Stufe endet mit Kontaktbögen, die ich selbst kritisch ansehe, bevor ich sie zeige.
2. **Ein Schritt, dann Prüfung, dann Florian.** Kein paralleles Anfangen mehrerer Baustellen; nach jedem Teil des Plans Halt mit Bildern und Zahlen.
3. **Zufallsreihe statt Testwesen** als Tor für jeden Schritt (Teil V).
4. Der Grundform-Bau ohne Maul bleibt in Form und Gefühl, wie er ist (Florian: „ganz ok“); neu ist nur, dass Änderungen örtlich bleiben und nichts Verstecktes mehr ins Dokument schreibt.
5. Der Editor bleibt nach jedem Schritt lauffähig (Schalter alt/neu bis zum Einbau); nach jedem Teilschritt committen und pushen, `docs/UEBERGABE.md` am Ende jedes Blocks.
6. Nach drei gemessenen Fehlanläufen an derselben Stelle halte ich an und berichte, statt weiterzuprobieren. Kritik zu späteren Teilen kommt ins Register und wird nach Plan abgearbeitet.

## Reihenfolge (Überblick)

| Stufe | Inhalt | Halt für Florian |
|---|---|---|
| 0 | Aufräumen: Revert, Plan und Entwürfe ins Repo | – |
| 1 | Prüfstand (Teil V) und Werkzeug-Matrix auf dem heutigen Stand = Ausgangslage; deine Fehler als Zahlen nachgestellt | Bögen der Ausgangslage |
| 2 | Sofortkorrektur Tab-Wechsel (B1): Editor zeigt immer die Grundform | Du probierst das Hin- und Herspringen |
| 3 | Maul-Beweis A1–A11 als eigenständiges Kernmodul | Look-Urteile 1–3 |
| 4 | Grundkörper-Beweis G1–G5 (Teil G, Nachtrag 15.10.) | Bögen: deine Ente, Giraffe mit Bauch vor der Nase, Fisch mit Flossen |
| 5 | Werkzeug-Fundament H1–H5: Vorgänge, X0 im Dokument, örtliche Änderungen, Relief, Linien auf der Haut | Probe: Körperbau wie vorher, Pinsel und Linien greifen ineinander |
| 6 | Maul und Grundkörper im Editor: A12–A14 mit H6, Einbau von G; alter Maulbau gelöscht | Deine Probe mit eigenen Wesen |
| 7 | H7: „Relief übernehmen“, Neu ableiten | – |
| 8 | Posen B2–B10 | nach jedem Schritt |
| 9 | H8/H9: ganze Matrix, Abschluss | Abnahme |

## Teil 0: Aufräumen (zuerst)

- `git revert c10f695 50c8976 7baee2d` (Pose-Sicht im Editor-Speicher, Pose-Käfig im Kern, Pose-Form im Dokument), danach `pnpm typecheck`, `pnpm test`, `pnpm lint`, E2E `kern-ablauf`.
- Dieser Plan als `docs/plans/2026-10-15-maul-einsatz-harmonie-posen.md` ins Repo, dazu die drei ausführlichen Entwürfe als deutsche Anhänge (`docs/plans/2026-10-15-entwurf-maul-einsatz.md`, `…-entwurf-werkzeug-harmonie.md`, `…-entwurf-posen.md`); `docs/plans/2026-10-15-maul-als-einsatz.md` verweist darauf.
- Bleibt: Zähne (838eed3), Rundmaul (0649a43), Pinsel in „Posen & Leben“ und Fressen-Deltas ohne Schlitzmaul (ac40aa5), Pläne und Grundidee in `CLAUDE.md`.
- `docs/plans/2026-10-15-fressen-wie-editor.md` als abgelöst markieren (Verweis auf diesen Plan), Kritik-Register um die Befunde von heute ergänzen, `docs/UEBERGABE.md` überschreiben.

## Teil V: Prüfstand zuerst (vor jedem Umbau)

Ziel: Jede spätere Meldung stützt sich auf Hunderte reproduzierbare Fälle statt auf sieben Prüfwesen. Bestehende Messbausteine werden wiederverwendet (`kern/pruefstand.ts`: `regionen`, `hautAusNetz`, `selbstDurchdringungen`; `kern/abweichung.ts`: `blattAbweichungen`; `faltenMass`, `saegezahn`, `lokalitaet`; Skripte in `apps/editor/scripts/pruefen/`).

**V1 Zufallsreihe** (`packages/shape/src/kern/pruefen/zufallsreihe.ts`, fester Startwert):
- Körper: Kugel, Ei, Wurst (lang), Turm (hoch), Flunder (flach), Birne (Bauch unter dem Kopf), Kasten (Tiger-Schnauze mit Spanten/Kanten), Langhals, Robbe, Drache; je Körper Zufallsvarianten (Länge/Höhe ±30 %, Kopfgröße, Bauchwölbung, Schnauzenlänge).
- Maullinie: Anfang hoch/mittel/tief/seitlich (nicht auf der Mitte)/unter dem Kinn/am Hals; Form gerade/nach oben/nach unten/J mit steilem Ende/S/senkrechtes Ende; kurz/lang.
- Kiefer: gleich, Überbiss, Unterbiss (Versatz klein/groß, schmaler/breiter).
- Öffnung 0/25/50/75/100 %; danach Bearbeitungen: Anfang ziehen, Mundwinkel ziehen, Schädel +18 px, Kinn tiefer, Schnauze länger, Pinselbeule am Maul, Pinsel auf der Silhouette.
- Umfang: Tor-Teilmenge ≈ 200 geschichtete Fälle (≈ 1 min) bei jedem Schritt, ≈ 40 bei jedem Commit als Test, nachts die ganze Reihe (≈ 1000 Aufbauten × 5 Bearbeitungen).

**V2 Maße je Fall** (`kern/pruefen/masse.ts`):
- Formtreue: Abstand der Haut zur Grenzfläche des Körpers ohne Maul (px bei 461 px je Kachel), getrennt nach außerhalb des Felds / im Feld außerhalb der Lippe.
- Δ je Blatt mit und ohne Maul (außerhalb des Maulfensters); Lippe an der Linie dicht über die **ganze** Linienlänge (heute nur an Käfigspalten gemessen).
- Falten außerhalb der Lippe gegen den Körper ohne Maul, Sägezahn; Zusammenklappen (kleinste Flächen, umgeklappte Normalen).
- Durchdringungen bei 25–100 % nach Bereichen (Abnahme: 0 sichtbare).
- Kieferunabhängigkeit: Blau ziehen bewegt keinen Punkt des Oberkiefers (bitgleich, ≤ 1e-12), Rot keinen des Unterkiefers.
- Örtlichkeit: Änderung außerhalb des bearbeiteten Bereichs; Tempo (Umbau, Zugschritt).
- Ab Teil B: Lippen auf den Pose-Linien, Morph-Glätte (10 Zwischenstufen, Bahnen ohne Knick, keine Falten, 0 sichtbare Durchdringungen).

**V3 Kontaktbögen** je Klasse (zu/offen, zwei Blicke, Linien eingeblendet), schlechteste Fälle zuerst (`apps/editor/scripts/pruefen/reihe-boegen.ts` über das vorhandene `html-shot.mjs`). Ich sehe jeden Bogen selbst durch, bevor er zu Florian geht.

**V4 Ausgangslage:** Der heutige Maulbau und die heutigen Werkzeugketten laufen zuerst durch die Reihe; Zahlen und Bögen sind der Vergleich, den jeder neue Teil in **allen** Klassen schlagen muss.

**V5 Werkzeug-Matrix** (Teil H) und **V6 Editor-Abläufe mit echten Zeigergesten** (Playwright, eigener Vite auf 5192 über `run-check.sh`, nie Port 5180): Zeichnen, Ziehen, Pinsel, Maul, Kiefer getrennt, Tabwechsel, Undo, Speichern/Laden.

**Tor für jeden Teil:** Reihe hält die Schwellen und schlägt die Ausgangslage → Bögen an Florian → „abgenommen“ sagt nur Florian.

## Teil A: Maul als Einsatz

**Bauweise (acht Festlegungen):**
1. **A0 sieht das Maul nie.** Der Körper ohne Maul (im Beweis C(P) + Pinsel-Deltas wie heute, ab Teil H die gespeicherten Lagen X0) wird gebaut wie heute; alle Maulzweige in `ableiten.ts` entfallen (`kappeMin`, `maulBereich`, Glättung und Breitengewicht mit Maul, offene Naht, Umverteilen der Ringe auf die Lippe, `kieferQuerschnitt`). Maul zeichnen, ändern oder entfernen lässt A0 bitgleich (behebt Befund 1, 4, 5). Alte Dokumente mit Spaltmarken bekommen ihre Brücke einmalig in die Kontur gebacken (Migration in Teil H).
2. **Einsatz in den einmal exakt verfeinerten Käfig** (Stufe 1: gleiche Grenzfläche wie A0, ≈ 4× Punkte; A wird eine Stufe weniger unterteilt, das feine Netz bleibt so groß wie heute). Außerhalb des Felds M und eines unberührten Kragenrings C ist A bitgleich zu A0 (die Grenzfläche über einer Fläche hängt nur von ihrem Nachbarring ab; feine Blöcke werden aus A0 kopiert wie heute bei der Augenhöhle).
3. **Feld = symmetrische Scheibe** verfeinerter Flächen um die Linie; darin ein geordneter Ring: 2m+1 Speichen × J Reihen je Hälfte, die Lippenschleife, K Taschenreihen und ein m×m-Rachengitter, nur Vierecke. Neue unregelmäßige Punkte nur vier Fünferpole an den Feldecken (das Blender-Muster der Mundschleifen) und vier verdeckte Dreier im Rachen.
4. **Anordnung aus einer beweisbar faltenfreien Karte:** Das feine Netz von A0 wird im Feld entlang des Schlitzes aufgeschnitten, konform auf ein Rechteck und mit Tutte bijektiv auf das Einheitsquadrat gelegt; Reihen = Höhenlinien, Speichen kreuzen sich nie. Das trägt jede Linienform (J, S, senkrecht, eingerollt) und jede Lage (hoch, tief, Spitze, Kinn, Hals, seitlich, Kastenfront); am Mundwinkel entstehen von selbst die elliptischen Mundschleifen.
5. **Lippenkanten = eine unendlich scharfe Faltenschleife:** Ihre Grenzkurve hängt nur von ihren eigenen Punkten ab und wird exakt an die Bézier-Linien angepasst (dicht und beidseitig in jedem Blatt geprüft, ≤ 1 px, Ziel 0,3 px); der Mundwinkel ist ein Eckpunkt und liegt genau auf dem schwarzen Punkt, die Anfänge exakt auf der Naht. Geschlossen eine feine Rille (Lippenwulst ≈ 0,4 px), damit sich die Lippen nicht tangential berühren.
6. **Haut formtreu:** linearer Ausgleich an A0 (Normalabweichung stark, tangential schwach gewichtet); die Matrix ist je eingefrorener Topologie fest, jede Änderung ist ein Rückwärtseinsetzen. Die Tasche wird getrennt gelöst (die Falte entkoppelt beide Seiten).
7. **Kiefer: immer dieselbe Topologie mit zwei Lippenketten**, bei „gleich“ deckungsgleich. Jede Kieferseite hat ihre eigene Verzerrung in der Karte und ihr eigenes 3D-Korrekturfeld (biharmonisch, läuft glatt in A0 aus), getrieben nur von ihrer eigenen Linie → Rot ziehen lässt die Unterseite bitgleich, Blau die Oberseite; nur der gemeinsame Mundwinkel wirkt auf beide. Über-/Unterbiss: Der kürzere, schmalere Kiefer weicht über sein Korrekturfeld nach innen aus (verdeckte Überlappung erlaubt); ein breiterer Kiefer erscheint als „Umweg“ der schwarzen Linie. Der Kiefer-Spant (`Spant.unten`) ist ein Ziel im Korrekturfeld seiner Seite.
8. **Topologie eingefroren** im Dokument (`kaefig.maulEinsatz`: Feld, Randanfang, m, J, K, Variante, Faltenspeichen). Neu gebaut wird nur am Gestenende bei festen Auslösern (Linie verlässt das Feld, Lippen-Fit > 1 px, Steigungsgrenze des Korrekturfelds verletzt, Falten- oder Augenkonflikt, Neu ableiten, Pose braucht mehr Reihen), mit Hysterese (≤ 1 Neubau je Hin-und-her-Zug). Sonst höchstens eine neue Karte bei gleicher Topologie.

**Öffnen** (Grundlage für Teil B): Kiefergewichte aus der Seite des Schlitzes (Ober/Unter, am Mundwinkel ein Reißverschluss über ≥ 3 Speichen) und der Geometrie um das Gelenk (`gelenkGewicht`), geglättet, Faltenprüfung je Fläche; ersetzt die Trennung an der Standard-Schleife (Befund 10). Haps wird ein Ruhe-Blendshape auf dem geordneten Gitter (Saat in Teil B). Reserve: m ≥ 6 je Hälfte (runde Öffnung), K ≥ 5, J ≥ 4 (Dehnung Langhals/Robbe).

**Schnittstelle** (`packages/shape/src/kern/einsatz/einsatz.ts`): `maulEinsatzBauen`, `maulEinsatzAktualisieren`; `MaulEinsatz` mit Lippenketten oben/unten (Index m = Mundwinkel), Hautgitter, Taschenreihen, Rachen, Spiegel, Rollen, Anker (Rolle, Kiefer, Bogenanteil s, Abstand ρ), Quelle, Tiefe, Lippenabstand, Umweg-Flächen, Rig-Daten. Er ersetzt alle Nutzer von `MaulAbleitung`: Zahnfleisch = Taschenreihe 2, Deskriptoren aus Rollen und Ankern, Augenhöhle meidet Feld + Kragen, Reifen auf A0, Rig-Griffe an Lippenanfängen und Mundwinkel, Lippen-px dicht über die ganze Linie, `einsatz/anker.ts` statt `posenAnker.ts` (nichts rastet, nichts wird verworfen).

**Plattenmaul, seitliche Mäuler, Rundmaul:** Der Tiger-Mercedesstern ist ein normaler Einsatz mit kurzem ∧-Schlitz auf der Frontplatte (Plattenkanten bleiben am Feldrand oder im Kragen; das W-Problem entfällt, weil „unten“ durch die Topologie bestimmt ist). Mäuler, die die Mitte nicht erreichen: Variante mit zwei gespiegelten Feldern. Rundmaul: später derselbe Einsatz mit rundem innerem Rand; bis dahin bleibt es eigenständig.

**Gelöscht nach dem Einbau:** `maulLage`, `maulKaefig`, `ableitenMitMaul` samt Sonderfällen (Kappe, Ringanfang, Platte, Wand, Coons, Versatzketten, `kieferZ`, `schlitzNah`), die Maulzweige in `ableiten.ts`, `schlitz.ts`, `maulDokument.ts`, `posenAnker.ts`, `lippeHaut.ts`, die alten Maul-Tests (ersetzt durch Einsatz-Tests). Bis dahin schaltet ein Kern-Schalter `maulBau: 'alt' | 'einsatz'`; der Editor bleibt jederzeit lauffähig.

**Schritte** (jeder: eigenständiges Kernmodul + Tests + Kontaktbögen, vor jedem Einbau):
- **A1** `einsatz/flaeche.ts` (Linie auf A0, Projektion, Feldausschnitt, Schnitt). **A2** `einsatz/verfeinern.ts` (exakte Verfeinerung samt Falten; Gleichheit ≤ 1e-12). **A3** `einsatz/feld.ts` (Scheibe, symmetrisch, Polzahl wie vorhergesagt; Bögen 8 Körper × 6 Linienformen inkl. Spitze, Kinn, Hals, Kasten). **A4** `loeser/cg.ts` + `einsatz/karte.ts` (0 umgeklappte Dreiecke in der ganzen Reihe). **A5** `einsatz/topologie.ts` (geschlossen, Spiegel exakt, außen bitgleich). **A6** `einsatz/lippe.ts` (J, S, senkrecht, Haken ≤ 1 px überall).
- **A7** `einsatz/loesen.ts`, nur gleiche Kiefer → **Florians Look-Urteil 1** (Ruhe, zu; Zebra, Earle-Look, Wärmebild A gegen A0; dabei entscheidet er die Lippenkante: scharf oder leicht gerundet).
- **A8** `einsatz/tasche.ts`. **A9** `einsatz/kiefer.ts` (Über-/Unterbiss, Unabhängigkeit) → **Look-Urteil 2**.
- **A10** `einsatz/einsatz.ts` (Bau + schneller Pfad): ganze Zufallsreihe gegen die Ausgangslage, jede Klasse besser und unter den Schwellen; A10b seitliche Mäuler.
- **A11** `einsatz/gewichte.ts`, einfache Knochenpose, Haps → **Look-Urteil 3** (offen).
- **A12** Dokument und Editor (zusammen mit H6): Linien auf A0, Treffer auf A0, Worker-Zwischenspeicher, schnelle Pfade; E2E (zeichnen, Anfang/Mundwinkel/Knoten ziehen, Körper ziehen mit Maul live, Pinsel mit Maul, öffnen/schließen).
- **A13** Nutzer umstellen (Zähne, Deskriptoren, Augen, Reifen, Kiefer-Spant, Umweg, Tigerstern), alten Code löschen. **A14** Abnahme: ganze Reihe, Florians Fälle, Bögen neben seinen Referenzbögen.

**Schwellen** (px bei 461 px je Kachel, in jeder Klasse der Zufallsreihe): außerhalb Feld + Kragen bitgleich; Haut im Feld außerhalb Lippe/Tasche ≤ 0,25 px und ≤ 1° von A0; Falten ≤ A0 + 2°; Δ je Blatt mit gegen ohne Maul ≤ 0,5 px; Lippe ≤ 1 px in jedem Blatt (Mundwinkel und Anfang ≤ 0,1 px); keine umgeklappte Fläche, Seitenverhältnis ≤ 4, kleinster Winkel ≥ 20°; 0 sichtbare Durchdringungen bei 25–100 %; Kieferunabhängigkeit ≤ 1e-12; ≤ 1 Topologie-Neubau je Zugfolge; Linie ziehen ≈ 10–20 ms, Gestenende ≤ 150 ms, Neubau ≤ 250 ms.

**Abbruchregeln** (nach drei gemessenen Anläufen anhalten und Florian berichten): Pol- oder Kragenreste sichtbar im Earle-Look (> 5 % der Fälle über 1,5° oder 0,5 px) → Pole auf flache Stellen, sonst Stufe-2-Verfeinerung. Lippen-Fit > 1 px in > 2 % → Eckpunkte an Krümmungsspitzen, größeres m. Kiefer nicht unabhängig → Konstruktionsfehler, beheben. Offen sichtbare Durchdringungen > 5 % bei 100 % → breiterer Reißverschluss, Taschentiefe, Rig-Vorlagen je Maulart. Feldwahl unstet (> 3 % mit mehr als einem Neubau je Zugfolge) → Rückfall der großen Sitzung **„Maul-Topologie als eigene Vorlage je Maulart“** (feste Feldvorlagen; Karte, Lösen, Kiefer und Posen bleiben gleich, der Rückfall ist billig).

## Teil H: Werkzeug-Harmonie

**Wurzel:** Der Körper wird als globale Funktion der Zeichnungen neu gerechnet; Pinsel, Maul, Augen und Linien hängen an Käfigindizes oder eingefrorenen Weltlagen; mehrere Wege schreiben abgeleitete Zustände am Undo vorbei ins Dokument. Jede Änderung irgendwo verschiebt deshalb alles, was daran hängt.

**Zusätzliche Befunde:**
- „Formen folgen“ springt mit Maul gar nicht an (`kernBau.ts:201`): Die schwarze Linie folgt nie (Florians Δ 25/37). Ohne Maul verteilt das Neuansetzen der Deltas Ausgleichsversätze über den ganzen Körper, die nach der nächsten Linienänderung falsch sind.
- Der Kern rastet den Lippenanfang bei jedem Bau neu auf die Kontur, der gespeicherte erste Knoten bleibt alt → Rot läuft nach Konturänderungen auseinander.
- `kantenAnFlaeche` projiziert Kantenknoten nach jeder Formgeste auf den Platzhalter-Loft (versteckter Schreibvorgang); Augen rasten auf den nächsten feinen Punkt; Beine leiten den Körper anders ab.
- Versteckte Eingaben außerhalb des Dokuments (Maul-Chip, Ausstattung über den Namen, `stationen.maul.kontur`); die Vorschau beim Ziehen rechnet anders als der genaue Bau (Sprung beim Loslassen).

**Bauweise (fünf Festlegungen):**
1. **Käfig als Wahrheit** (Plan 4.1 der großen Sitzung, bisher nicht gebaut): Das Dokument speichert die Käfiglagen X0 des Körpers **ohne Maul** (rechte Hälfte + Naht, ≈ 230–340 Punkte), dazu Stationen (nur vom Körper ohne Maul) und Falten. Die Zeichnungen sind Griffe. Das Pinsel-Relief d = B⁻¹·(X0 − C(P)) wird abgeleitet, nicht gespeichert; B ist die Zellbasis des sauberen Käfigs C(P), Details strecken und drehen also mit der Fläche.
2. **Jede Werkzeug-Handlung ist ein Vorgang:** Vorschau während der Geste, genauer Abschluss am Ende im Worker, genau ein Undo-Schritt. Sonst schreibt nichts mehr ins Dokument (weg: Rückschreiben der Stationen, `kantenAnFlaeche` im Kern, „Formen folgen“ nach dem Bau).
3. **Änderungen an Linien, Spanten und Kanten sind örtlich:** X0' = X0 + m ⊙ (C(P') + B'·d − X0). Die Maske m kommt aus dem geänderten Kurvenstück der bearbeiteten Ansicht (Seite/Top: Ringe im geänderten Bereich + 3 Ringe Auslauf; Front: alle Ringe, nur die geänderten Winkel; Spant: sein Einflussbereich). Gekoppelte Folgeänderungen anderer Ansichten bekommen keine eigene Maske — Florians „Kopplung nur am entsprechenden Punkt“ in 3D. Innen genau wie heute frisch abgeleitet, außen bitgleich, im Auslauf ein kleiner biharmonischer Ausgleich. Frische Wesen sehen aus wie heute.
4. **Der Pinsel verschiebt keine Knoten** (Entscheidung 5): Die schwarze Linie zeigt Zeichnung + Pinsel-Relief (B_v = P_v + R_v·n_v), Florians Knoten sitzen darauf. Wo kein Pinsel wirkte, ist sie bitgenau seine Bézier-Kurve; wo das Relief > 1 px ist, erscheint die gezeichnete Kurve zusätzlich gestrichelt. Δ zeigt nur noch Widersprüche zwischen den Zeichnungen. Neue Knoten entstehen nur von Hand oder über den Befehl **„Relief übernehmen“** (örtlich, so wenige Knoten wie nötig, ≤ 0,7 px, markiert).
5. **Das Maul ist ein Einsatz auf X0** und schreibt nie in X0 oder die Stationen. **Maullinien bleiben, wo Florian sie gezeichnet hat** (Entscheidung 6): Jeder Knoten behält die Koordinaten der Ansicht, in der er zuletzt bearbeitet wurde (`blatt`); die dritte Koordinate wird bei jedem Abschluss entlang dieser Blickachse auf die Haut gelegt (nächste Lösung zur vorigen Tiefe), bei der Linie des kürzeren Kiefers mit ihrem gespeicherten Abstand nach innen. Der Anfang folgt der Kontur und wird in den Knoten zurückgeschrieben. Liegt eine gezeichnete Stelle nach einer Körperänderung neben dem Körper, bleibt die letzte Tiefe und der Titel meldet „neben der Haut x px“. Augen tragen einen Hautanker (Fläche, u, v) und reiten mit der Haut.

Pinsel im Einzelnen: Ziehen/Aufblasen wirken auf X0; Glätten (⇧) glättet das Relief statt der Lagen (der Körper schrumpft nicht mehr); neu ⌥⇧ „zur Zeichnung“ (Relief → 0); mit Maul folgt der Einsatz während des Strichs linear, am Ende genau. „Neu ableiten“ behält standardmäßig die Form (Relief neu verteilt, ≤ 0,3 px); die Variante „Zurück zur Zeichnung“ verwirft das Relief ausdrücklich.

**Maße (Invarianten), nach jeder Handlung:**
- I1 Δ je Blatt ≤ max(1 px, Widerspruch der Zeichnungen + 0,3 px).
- I2 Außerhalb der Maske bitgleich; im Auslauf Falten ≤ +2°, Dellen ≤ 0,3 px.
- I3 Maul-Handlungen ändern X0, Stationen, Falten und Augen nicht (bitgleich).
- I4 Linien auf der Haut (Knoten ≤ 0,2 px, dazwischen ≤ 0,5 px); Lippen ≤ 1 px nach jeder Handlung, die nicht das Maul betrifft.
- I5 Eine Testbeule ändert ihre Höhe ≤ 0,5 px bei Drehung ≤ 90° und Streckung 0,5–2.
- I6 Undo/Redo/Speichern/Laden bitgleich. I7 Keine Schreibvorgänge außerhalb von Vorgängen.
- I8 Formneutrale Handlungen (Knoten einfügen, Spant einfügen, Relief übernehmen) ändern X0 nicht. I9 Kein Sprung beim Loslassen (≤ 0,5 px). I10 Glätte nicht schlechter als vorher.
- I12 Vorschau ≤ 20 ms je Bild, Abschluss ≤ 250 ms (Median).

**Dokument v2** (`dokument.ts`, Schema zuerst): `kaefig.lagen` (X0), `kaefig.falten`, Stationen ohne `maul`, Maulknoten mit `blatt` (besitzende Ansicht) und beim kürzeren Kiefer mit Abstand zur Haut, Augen mit `anker`, Ausstattung ausgeschrieben. Migration: X0 = C(P; S) + alte Deltas (das, was Florian ohne Maul sah), alte Lippenmarken in die Kontur backen, Linien einmal auf die Haut legen, Augen → Anker, Sicherungskopie der Datei; anhalten, wenn sich ein gespeichertes Wesen um > 2 px ändert (außer Linientiefe).

**Module:** `packages/shape/src/kern/harmonie/` (`sauber`, `zellbasis`, `maske`, `uebernehmen`, `umstationieren`, `relief`, `anker`, `backen`, `migration`); Worker-Aufträge `vorschau`, `uebernehmen`, `backen` statt `folgen`; Editor: `beginGeste(quelle)`, asynchrones `endeGeste` mit Warteschlange (`editorStore.ts`), `View2D` zeichnet B_v, `kern/pinsel.ts` schreibt X0.

**Werkzeug-Matrix** (`apps/editor/scripts/pruefen/werkzeug-matrix.ts` im Kern, `werkzeug-harmonie.mjs` mit echten Zügen): ≈ 28 Handlungen (Ziehen in allen Blättern, Knoten einfügen/löschen/Ecke, Spant, Reifen, Kante, Pinsel G/I/⇧, Maul zeichnen/Anfang/Mundwinkel/gleich↔getrennt/Über-/Unterbiss/entfernen, Augen, Pose hin und zurück, Undo/Redo, Speichern/Laden, Neu ableiten, Relief übernehmen) auf 9 Körpern: alle Paare, 200 Zufallsgänge à 30 Schritte und fest **Florians Ablauf** (Kugel → Aufblasen/Ziehen → Knoten in Seite und Front → Maul zeichnen → Ziehen am Maul → Maulanfang ziehen → Undo/Redo → Laden). Nach jedem Schritt I1–I12; die 24 schlechtesten Schritte als Kontaktbogen.

**Schritte:**
- **H0** Matrix auf dem heutigen Stand; sie muss Florians Zahlen nachstellen (Δ ≈ 25/37 px, rot ≈ 34 px, Örtlichkeit 3/9 px).
- **H1** Vorgänge (Abschluss-Auftrag, asynchrones Gestenende, Warteschlange), Rückschreiben entfernen, Ausstattung ausschreiben → I6, I7 bei sonst gleichem Verhalten.
- **H2** Dokument v2 mit X0, Migration, Pinsel schreibt X0, Bau aus X0 → Wesen ohne Maul bitgleich wie vorher, Laden bitgleich.
- **H3** Masken, Zellbasis, Vorschau, formneutrale Erkennung, Umverteilen → I2, I5, I8–I10; Florian prüft: „Körperbau fühlt sich gleich an“. (Nur falls nötig: Stationen als Kurvenparameter statt Wirbelsäulen-Anteile.)
- **H4** Relief-Anzeige, Δ-Trennung, Knoten auf B_v, Glätten auf dem Relief, „zur Zeichnung“; „Formen folgen“ entfällt → Florians Probe.
- **H5** Linien auf der Haut, Augen-Anker → I4.
- **H6** Einsatz aus Teil A einbinden (Bau-Reihenfolge, linearer schneller Pfad, Treffer-Abbildung) → I3 bitgenau, Lippen ≤ 1 px nach jeder Nicht-Maul-Handlung.
- **H7** „Relief übernehmen“ und die beiden Varianten von „Neu ableiten“.
- **H8** Vertragstests mit Teil B (Pose rein und raus: P, X0, Linien bitgleich). **H9** Ganze Matrix nachts, Kontaktbögen, Florians Abnahme.

**Abbruchregeln:** Masken-Artefakte (Faltenzuwachs > 2° oder Dellen > 0,5 px in > 2 % der Schritte trotz Auslaufbreite 2–4 und Ausgleich) → Stationen als Kurvenparameter, sonst Löser im Auslauf. Florian lehnt das Relief ab → „Relief übernehmen“ läuft automatisch nach jedem Strich (Algorithmus ist derselbe). Abschluss > 400 ms → Zerlegung wiederverwenden. Details verzerren (Beule > 20 % bei Streckung < 1,5) → starre Rahmen.

## Teil G: Grundkörper für jede Form (Nachtrag 15.10. nachmittags)

> Florian (15.10., Bild `docs/look/editor/florian-2026-10-15-ente-fluegel.webp`: Seite Δ 124 px, Top Δ 86 px): „Ich verstehe nicht, warum Shapes mit Bauch, Hals und Flügeln oder Flossen nicht genauso umgesetzt werden können. Aus den Shapes lässt sich sehr genau ableiten, was verlangt ist … Ich hätte erwartet, dass aus dem Beispiel eine weiche Ente mit Flügeln entsteht … Bei der Giraffe geht es, wenn der Bauch unten nicht weiter nach vorne ragt als die Nasenspitze. Sobald er das tut, springt es um und es wird verzogen. Es muss flexibler und intelligenter werden … Den Mund muss ich auch hier völlig frei setzen können, ob an Bauch, Hals oder oben/unten an der Nase.“

**Befund:** Der Grundkörper ist eine Röhre aus Ringen entlang einer Wirbelsäule.
1. **Umspringen:** Die Wirbelsäule entsteht aus dem Seitenumriss, Anfang und Ende sind der vorderste und der hinterste Punkt (`versuch/wirbelsaeule.ts`, Leiter). Ragt der Bauch weiter vor als die Nase, wird der Bauch zum Anfang, und die Röhre klappt um.
2. **Flügel und Flossen:** Jeder Ring hat genau einen Querschnitt (aus der Front bzw. den Spanten), seine Breite kommt aus dem Top an dieser Stelle. Aus Flügeln oder Flossen im Top wird so ein breiter Klotz statt dünner Teile in einer bestimmten Höhe.
3. **S-Hals:** Läuft der Hals über den Körper zurück, liegen an derselben Stelle zwei Teile übereinander; eine Röhre mit einem Ring je Stelle kann das nur verdreht darstellen.

Die Information der drei Shapes reicht: Ihr Schnitt beschreibt, was verlangt ist. Der heutige Bau nutzt ihn nur entlang einer einzigen Röhre. Der Maul-Einsatz (Teil A) hängt nicht davon ab, wie der Körper gebaut ist; er setzt auf jeden Körper auf, der hier entsteht.

**Ansatz (zu beweisen, nicht versprochen):**
1. **Wirbelsäule aus der Mittelachse** des Seitenumrisses statt aus vorderstem und hinterstem Punkt. Die Enden werden einmal gewählt und als Kurvenparameter eingefroren; beim Bearbeiten springt nichts um.
2. **Breite je Ring aus Top und Front zugleich** (Schnitt der Ansichten an der Lage des Rings).
3. **Teile automatisch:** Was die Shapes zeigen, die Röhre aber nicht erklären kann (Flügel, Flossen, Beine, Ohren), wird als nahtlose Ausstülpung angesetzt (wie die Beine aus Beweis 3): Umriss aus der zeigenden Ansicht, Dicke und Höhe aus den anderen.
4. **Rückfall zum Vergleich:** allgemeiner Schnitt der drei Ansichten als glatte Fläche mit neu gelegtem Vierecknetz, falls 1–3 nicht reichen.

**Schritte:**
- **G1** Prüfkörper und Ausgangslage: Florians Ente (aus seinem Bild nachgestellt), Giraffe mit Bauch vor der Nase, S-Hals, Fisch mit Flossen, Robbe, seine Bögen; die Zufallsreihe um solche Körper erweitert. Ausgangslage messen.
- **G2** Mittelachsen-Wirbelsäule mit eingefrorenen Enden.
- **G3** Breite aus beiden Ansichten.
- **G4** automatische Teile.
- **G5** Kontaktbögen → **Florians Urteil**.

**Kriterien:** Δ ≤ 1–2 px in allen Blättern (außer echten Widersprüchen der Zeichnungen, die angezeigt werden); glatt wie die Kugel (Faltenmaß); kein Umspringen beim Ziehen (Sprung ≤ 0,5 px in der Zug-Matrix); das Maul aus Teil A setzt auf jeden dieser Körper an jeder Stelle; Gestenende ≤ 250 ms.

**Abhängigkeiten:** Teil H nutzt die Ableitung C(P) als Erzeuger und kommt deshalb nach der Entscheidung über G. Der Einbau von G geschieht mit dem Maul im Editor (Stufe 6).

**Abbruchregel:** Nach drei gemessenen Fehlanläufen an derselben Körperklasse Bericht an Florian und Rückfall 4 prüfen.

## Teil B: Posen und Blendshapes

**Bauweise (zehn Festlegungen):**
1. **Eine Ruhe-Form A** (X0 aus Teil H + Maul-Einsatz aus Teil A, eingefrorene Topologie) ist die einzige Geometrie. Eine Pose speichert keine eigene Form, nur: Knochenstellung θ, Ruhe-Deltas d (in der Zellbasis von A — derselbe Baustein wie das Pinsel-Relief in Teil H, sodass Posen jeder Änderung der Grundform folgen), Linienversätze λ (Rot/Blau relativ zu den Grundlinien), Saat (Haps) und Zahn-Abweichungen. Das **Rig** (Gelenke, Gewichte) ist gemeinsam und hängt nur an A.
2. **Auswertung** X(w) = Skin(A + Σ wᵢ·Dᵢ ; Σ wᵢ·θᵢ) auf dem Käfig, danach unterteilen. w = 0 liefert A bitgleich (Abkürzung ohne Rechnen), w = 1 einer Pose genau die geformte Pose.
3. **Skin = starre Transformation je Punkt** (Drehung um Gelenke + Versatz, wie heute Kiefer, Schädel, Beutel, Beine), exakt umkehrbar. Kein lineares Mischen von Matrizen (fällt bei 90° zusammen); spätere 3D-Knochen mit Dual-Quaternionen.
4. **Deltas im Ruheraum** (vor den Knochen): Zwischenstufen drehen mit den Knochen, eine spätere Knochenänderung nimmt die Form mit. Eine Korrektur nach den Knochen läge bei 58° Kiefer in der Mitte um 0,25·|D| daneben (≈ 10–20 px).
5. **Lippen exakt auf den Pose-Linien:** Bei jeder Auswertung legt ein kleiner gemerkter Löser die Lippenketten auf Rot/Blau der Pose (hart an Knoten, Anfängen, Mundwinkel; weich dazwischen). Die Pose-Linien sind relativ zu den Grundlinien gespeichert → nach jeder Änderung von Grundform, Rig oder Knochen bleiben die Lippen genau auf der Linie. **Jede Pose hat immer zwei Linien (Rot, Blau) mit eigenem Anfang und gemeinsamem Mundwinkel**, auch wenn die Grundform „gleich“ ist.
6. **In der Pose sind alle Linien Griffe am posierten Körper:** Ein Löser im posierten Raum bewegt den Käfig örtlich und rechnet in Ruhe-Deltas zurück (ΔD = Rᵀ·ΔX). Keine zweite Ableitung aus Pose-Profilen (daran ist „Fressen wie Editor“ gescheitert).
7. **„Was ich bearbeite“ (Ziel: Editor oder Pose) und „was ich sehe“ (Gewichte) sind getrennte Zustände.** Der Editor-Tab zeigt immer A bitgleich; Vorschauen sind sichtbar markiert und enden von selbst.
8. **Haps wird eine Saat** der Fressen-Pose (einmal ausgerechnet, als Ruhe-Delta weiter formbar). Das Rundmaul soll ein immer vorhandener Käfig-Einsatz werden (Teil A, später); bis dahin gilt eine Ausnahme: seine Öffnung ist ein Radius zwischen zu und auf, und es bleibt sichtbar, sobald es Posen gibt.
9. **Alle Posen haben dieselbe Topologie**; Anker und eine Topologie-Signatur rechnen Pose-Daten bei Strukturänderungen um (nie still verwerfen, wie heute bei `gleicheTopologieKaefig`).
10. **Export:** beliebig viele Posen im Editor, Markierung „Spiel-Pose“, im Spiel höchstens 3 gleichzeitig aktiv.

**Dokument v3** (auf v2 aus Teil H; `packages/shape/src/dokument.ts`, Schema zuerst, Migration in `dokumentLesen`):
- `posen: Pose[]` (Reihenfolge = Anzeige, genau eine Fressen-Pose). `Pose = { id, name, art, stellung (Kiefer: Winkel/Zug/Ziehen, Schädel: Winkel; später Hals, Beine), form (Deltas in der Zellbasis von A), linien (Versatz je Knoten der Grundlinie für Rot und Blau, Mundwinkel), saat (Haps, Rund), zaehne, spiel? }`.
- `rig` (Kiefer: Art, Gewichtsart, Gelenk, Winkel, Reichweite; Schädelgelenk) aus den bisherigen Pose-Feldern von `maulOptionen`; `kaefig.topologie` (Signatur, Ankertabelle je Käfigpunkt: Ring/Kappe/Einsatz (Rolle, Kiefer, Bogenanteil s, Abstand ρ aus Teil A)/Teil, Rückfall Fläche + (u, v)).
- Entfällt: `kaefig.posen`, feste Liste `POSEN`, Pose-Felder in `maulOptionen`, `posenProfile`. Nicht gespeichert: Ziel, Vorschau-Gewichte, Überblendung, Geist.
- Migration: Fressen-Stellung aus `maulOptionen`; alte Fressen-Deltas (nach den Knochen gespeichert) rechnet der Worker exakt in Ruhe-Deltas um (Test: neu = alt bei voller Öffnung, ≤ 1e-9); Ruhen/Laufen/Inklusion exakt (ohne Knochen).

**Bearbeiten in der Pose** (Werkzeug-Router `apps/editor/src/werkzeuge/ziel.ts`: jedes Werkzeug erklärt seine Wirkung für Editor und Pose; Test je Werkzeug: Grundform bleibt bitgleich):

| Griff in der Pose | wirkt auf |
|---|---|
| Schwarze Linien: Seite = posierte Naht mit den Knoten der Grundlinie (über die Bogenlänge abgebildet, Griffe angepasst); Front/Top = posierte Silhouette | Pose-Form über den Löser |
| Rot, Blau, Anfänge, Mundwinkel (zwei Koordinaten je Blatt wie im Editor) | Linienversätze → Lippen folgen exakt |
| Reifen-Perlen | Pose-Form über den Löser |
| Pinsel G/I/⇧ | Pose-Form direkt; die Pose-Linien folgen danach im selben Undo-Schritt |
| Knochen (Unterkiefer drehen/ziehen, Schädel drehen; später Hals, Beine) | Stellung der Pose |
| Zähne | Abweichungen der Pose |
| Rig (Gelenke, Gewichte) | alle Posen |

- In der Pose gesperrt (Hinweis „nur im Editor“): Knoten löschen, neue Maullinie, gleich/getrennt, neue Reifen/Kanten/Spanten, Neu ableiten, Augen setzen. Formneutrales Knoten-Einfügen wirkt in Grundform und allen Posen zugleich.
- **Löser im posierten Raum** (`packages/shape/src/loeser/posenLoeser.ts`, `cholesky.ts`; Zeilen- und Glättungshelfer aus `ausgleichsLoeser` in `loeser/grenzflaeche.ts` herauslösen): Unbekannte = Verschiebung im Einflussbereich (rechte Hälfte + Naht), Energie = Laplace-Glätte + Dämpfung + weiche/harte Bedingungen an Zeilen der Grenzmatrix, je Blatt nur dessen zwei Koordinaten; einmal zerlegen je Geste (Bandordnung + Hüllen-Cholesky, harte Bedingungen über das Schur-Komplement), je Zugschritt nur Rückwärtseinsetzen (< 1 ms); zwei feste Randringe → glatter Auslauf, außerhalb exakt 0.

**Editor-Tab und Wechsel** (behebt die vier Ursachen aus dem Befund):
- Eine Aktion `setzeZiel` für Tabs, Chips, Q und Kieferknopf: setzt das Ziel, beendet Vorschauen, erhöht eine Anzeige-Generation → genau ein Bau, mit oder ohne Maul. Der Kern sieht nur noch Gewichte, nicht mehr Modus und Öffnung.
- Die Öffnungsregler in Maul/Zähne/Rundmaul/Fressen entfallen. Der **Kieferknopf wird Vorschau** (Ziehen zeigt Fressen live; endet beim nächsten Bearbeiten, Esc, Tab- oder Stufenwechsel; Doppelklick wechselt Editor ↔ Fressen). Knochengriffe gibt es nur in einer Pose; Greifen ändert keine Gewichte.
- Das Netz trägt seine Generation; Bühne und Blätter zeigen nur die passende → kein veraltetes Bild nach dem Wechsel. Undo stellt Dokument **und** Ziel wieder her (Hinweis „↶ Fressen: Unterlippe“). Laden startet im Editor ohne Vorschau. Die Zahnprüfung rechnet ihre Zustände selbst (Fressen 0/25/50/100 %).

**„Posen & Leben“ (Stufe 8)** nach Florians Entwurf (Regler „Fressen 0–100 %“, „Biegen“, „Stelle“, „gestrichelt in allen Ansichten: die gewählte Pose über der Grundform“):
- Kopf: Tabs „Editor · Fressen · … · ＋“ (Q/⇧Q); Rechtsklick: Duplizieren, Umbenennen, Zurücksetzen (Form/Knochen/Linien), Löschen, Spiel-Pose.
- Bühne: Chip „✎ Fressen“ färbt den Rahmen; während einer Vorschau „Vorschau · Brüllen 40 % ×“; Geist (gestrichelt) der jeweils anderen Form in allen Blättern; Knochen im 3D.
- Tafel: Posenliste mit Regler je Pose (Vorschau 0–100 %); **Überblenden „von → nach“** mit Schieben, Abspielen und Zwischenbildern; Knochen der Pose; Form der Pose (Haps, glätten, zurücksetzen); Rig für alle Posen (Gelenke, Gewichte, anzeigen); Rückmeldung „Unterlippe 0,2 px auf der blauen Linie“.
- Alle Werkzeuge der Stufen 1–5 wirken in der Pose (ein Stufenwechsel behält das Ziel).

**Worker:** Zwischenspeicher A → Rig-Gewichte → je Pose (Deltas, Saat, Lippenprojektion) → Löser-Zerlegungen; Auftrag `posieren` (nur Gewichte) ≤ 8 ms, Tabwechsel ≤ 50 ms, Zugschritt ≤ 16 ms; Dreieckszerlegung mit gemerkter Topologie (heutiges `zuDreiecken` ist zum Schieben zu langsam).

**Anforderungen an Teil A:** Lippenketten und Mundwinkelzone als Indizes; je Einsatzpunkt (Rolle, Reihe, u); Lippen-Abtastzeilen der Grenzmatrix mit Linienparametern; eine Funktion „Lippen auf Linien legen“ für einen gegebenen Käfig; genug Lippenpunkte für runde Öffnungen; Taschenreihen, die sich auf ≈ 3× Maullänge dehnen lassen (Robbe, Langhals); Rundmaul als immer vorhandener Einsatz.

**Schritte** (jeder endet mit Bildern und Zahlen für Florian):
- **B1** Tab-Wechsel und Ziel-Router auf den heutigen Posendaten (klein und unabhängig; kann als Sofortkorrektur vor Teil A kommen).
- **B2** Kern `packages/shape/src/kern/posen/` (Skin, Auswertung, Anker, Rahmen, Saat, Migration); Gleichheit alt ≡ neu bei voller Pose.
- **B3** Dokument v3, Speicher, Worker, Tabs; Pinsel schreibt Ruhe-Deltas; Knochengriffe vom posierten Skelett; Rig-Abschnitt.
- **B4** Löser im posierten Raum. **B5** Pose-Linien, Lippenprojektion, Linien folgen dem Pinsel.
- **B6** Schwarze Linien und Reifen in der Pose; Matrix „jedes Werkzeug × jede Pose“ mit echten Zügen.
- **B7** Ganze Tafel, Geister, Überblenden/Abspielen, Undo mit Zielwechsel.
- **B8** Extreme Posen (Langhals: Blau den Hals hinab; Robbe: bis zum Boden; Drache: Kopf kippt; Tiger: rundes Maul) und Glätte; Zwischenschlüssel nur, wenn die Messung es verlangt.
- **B9** Zähne (starr im Kiefer, Ausrichtung nach dem Zahnfleisch), Augen, Beine, Rundmaul in Posen; Halskette „Biegen/Stelle“.
- **B10** Export-Probe und Budget.

**Maße Teil B:** R0 A bitgleich nach jeder Folge von Pose-Bearbeitungen, Wechseln, Vorschauen; R1 Dokument ohne `posen` unverändert nach jeder Pose-Bearbeitung; P0 Pose bitgleich nach Wechseln und Laden; L1 Lippen ≤ 1 px auf den Pose-Linien (Ziel 0,25 px); M1 0 sichtbare Durchdringungen bei t = 0 … 1 in Zehnteln für Editor → Pose und Pose → Pose; M2 keine neuen Falten oder winzigen Flächen; M3 Bahnen ohne Knick oder Umkehr; M5 außerhalb des Einflussbereichs exakt 0; Zeiten wie oben.

## Risiken und Abbruchregeln

- **Einsatz-Qualität** (Pole im Earle-Look, Lippen-Fit, Öffnen ohne Durchdringung) ist das größte Einzelrisiko → Beweis zuerst, drei Look-Urteile, Rückfall „Maul-Topologie als eigene Vorlage je Maulart“.
- **Örtliche Änderungen** zeigen Masken-Artefakte → Stationen als Kurvenparameter, sonst Löser im Auslauf.
- **Relief-Anzeige gefällt nicht** → nach jedem Strich automatisch örtliche Punkte (derselbe Algorithmus).
- **Tempo** (Löser in Posen, Abschluss am Gestenende) → Lösen beim Loslassen, Zerlegungen wiederverwenden.
- **Extreme Posen** (Robbe, Langhals) hängen an der Dehnreserve des Einsatzes → Anforderung an Teil A und Messung; Zwischenschlüssel nur, wenn die Messung sie verlangt.
- **Migration gespeicherter Wesen** → Sicherungskopie, anhalten bei > 2 px Abweichung.
- **Umfang:** Das ist ein großer Umbau über mehrere Tage. Jede Stufe endet lauffähig und gepusht; bei ≈ 90 % des Limits Übergabe schreiben.
- Die Abbruchregeln je Teil stehen in den Teilen A, H und B.

## Dateien

**Neu:** `packages/shape/src/kern/pruefen/` (Zufallsreihe, Maße, Tests), `kern/einsatz/` (Teil A), `kern/grundkoerper/` (Teil G), `kern/harmonie/` (Teil H), `kern/posen/` (Teil B), `kern/rig.ts`, `packages/shape/src/loeser/{cg,posenLoeser,cholesky}.ts`; `apps/editor/src/werkzeuge/ziel.ts`; Skripte `apps/editor/scripts/pruefen/{zufallsreihe,reihe-boegen,werkzeug-matrix}.ts`, `werkzeug-harmonie.mjs`, `posen-kontakt.mjs`; E2E `apps/editor/e2e/{maul-einsatz,posen-wechsel,posen-mischen,posen-anlegen}.spec.ts`.

**Geändert, Kern:** `dokument.ts` (v2, v3, Migration), `kern/wesen.ts` (Bau aus X0 → verfeinern → Einsatz → Posen, Zwischenspeicher je Schicht), `kern/ableiten.ts` (Maulzweige raus), `kern/maul.ts` (nur Rig-Teile bleiben, nach `rig.ts`), `kern/pinsel.ts`, `kern/abweichung.ts` (Relief; Δ nur für Widersprüche), `kern/zaehne.ts`, `kern/deskriptoren.ts`, `kern/augenHoehle.ts`, `kern/rundmaul.ts`.

**Geändert, Editor:** `state/editorStore.ts` (Vorgänge, Ziel, Undo mit Ziel), `state/uiStore.ts` (Vorschau statt Öffnung), `kern/kernBau.ts`, `kern/wesenClient.ts`, `kern/wesen.worker.ts`, `three/Szene3D.tsx` (Generation, Auslöser), `viewports/View2D.tsx` (Relief-Linie, Pose-Linien), `viewports/Steuerung3D.tsx`, `kern/pinsel.ts`, `kern/griffe.ts` (Kieferknopf als Vorschau), `maul/MaulEbene.tsx`, `maul/maulFlaeche.ts`, `menu/MenuBar.tsx`, `leiste/Seitenleiste.tsx` („Posen & Leben“), `kiefer/*`.

**Gelöscht:** `kern/schlitz.ts`, `kern/maulDokument.ts`, `kern/posenAnker.ts`, `kern/lippeHaut.ts`, `kern/folgen.ts`, die Maulteile von `maul.ts`, die veralteten Fressen-Tests in `e2e/maul.spec.ts`.

**Wiederverwendet:** `verfeinern`, `grenzMaske`, `unterteilung` (`subdivision/catmullClark.ts`); Blockabbildung aus `kern/augenHoehle.ts`; `feinKette` (`kern/reifen.ts`); `kachelung` (`kern/atlas.ts`); Zeilen und Glättung aus `ausgleichsLoeser` (`loeser/grenzflaeche.ts`); `luZerlegen` (`loeser/lu.ts`); CG aus `versuch/aufblasen.ts`; `selbstDurchdringungen` (`versuch/pruefen.ts`); `fitSegment` (`fit.ts`) und `profilAnZug` (für „Relief übernehmen“); `gelenkGewicht`; `blattAbweichungen`; `faltenMass`, `saegezahn`, `regionen`, `hautAusNetz` (`kern/pruefstand.ts`); `html-shot.mjs`, `run-check.sh`.

## Verifikation (Ende zu Ende)

- **Jeder Commit:** `pnpm typecheck`, `pnpm test`, `pnpm lint`, schnelle Teilmenge der Zufallsreihe und der Werkzeug-Matrix.
- **Jede Stufe:** ganze Zufallsreihe und Matrix, Kontaktbögen der schlechtesten Fälle, E2E mit echten Zeigergesten auf eigenem Vite (5192), Zahlen gegen die Ausgangslage, dann Halt für Florian.
- **Schluss:** Florians eigener Ablauf im Editor — Kugel → Ziehen/Aufblasen → schwarze Linien → Maul zeichnen → getrennt, Über- und Unterbiss über die Bézier-Griffe → Fressen formen (Linien, Pinsel, Knochen) → zurück in den Editor → Überblenden in „Posen & Leben“ → Speichern/Laden. Erwartet: Δ ≤ 1 px, Lippen ≤ 1 px, Grundform bitgleich nach jeder Pose-Arbeit, keine sichtbaren Durchdringungen, glatte Morphs. „Abgenommen“ sagt Florian.

## Stand

- **15.10. Teil 0:** Rücknahme von 7baee2d, 50c8976, c10f695 als 42ef353 (Code = c97497b; typecheck, lint, Unit-Tests, E2E kern-ablauf grün). Plan und Entwürfe im Repo.
- **15.10. Stufe 1 gebaut** (Abnahme offen): Prüfstand `kern/pruefen/` (6c770ce), Ausgangslage des heutigen Maulbaus und der Werkzeuge in [`docs/progress/editor/ausgangslage-2026-10-15.md`](../progress/editor/ausgangslage-2026-10-15.md) mit acht Kontaktbögen. Zufallsreihe 200 Fälle: alle bauen, alle verletzen mindestens eine Schwelle; einfachste Mäuler (40): ebenso. Werkzeug-Matrix: Linienänderungen nicht örtlich (≈ 10 px fern), „getrennt“ 21 px fern, Maul entfernen stellt den Körper nicht wieder her, ein Absturz im Bau. Nachmittags Teil G ergänzt (8b2cc52). Nächster Schritt: B1 nach Florians Blick auf die Ausgangslage.
- **15.10. Stufe 2, B1 gebaut** (Abnahme offen): `setzeZiel` (Öffnung/Stärke und Modus in einem Zug) für Tabs, Chips, Kieferknopf-Doppelklick, Knochengriffe; Neubau bei jeder Öffnungsänderung auch ohne Maul; Pose entfernen, Laden, Neu setzen zurück; Vorschau im Editor-Tab endet beim Stufenwechsel und beim Bearbeiten (`werkzeuge/ziel.ts`); Kern bei Öffnung 0 bitgleich die Ruhelage; in einer Pose wirkt nur, was zur Pose gehört (Pinsel, Rig), sonst Hinweis. Geprüft: `kern/grundform.test.ts`, E2E `tab-wechsel.mjs` mit echten Klicks und Pinselzügen (20 Wechsel an Kugel und Rex, 23/23), Gegenprobe am alten Code schlägt fehl; Bild [`docs/progress/editor/b1-tab-wechsel-2026-10-15.jpg`](../progress/editor/b1-tab-wechsel-2026-10-15.jpg). Nächster Schritt: Florian probiert, dann Stufe 3 (Maul-Beweis A1).
