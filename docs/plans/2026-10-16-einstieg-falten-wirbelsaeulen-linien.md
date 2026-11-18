# Einstieg für die neue Sitzung: Falten, Wirbelsäulen, Kantenlinien (Übergabe 16.10.2026)

> Florian (16.10. morgens): „Ich würde gerne mit einer frischen Session die Falten-, Wirbelsäulen- und
> Kantenlinienproblematik angehen. Ich glaube, diese Session ist schon zu lang, und ich habe mit meinen Zwischenschritten
> für zu viel Verwirrung gesorgt. Sorge dafür, dass die nächste Session alle Informationen aus unserer großen
> Exploration hier hat.“

Dieses Dokument fasst die Exploration vom 13. bis 16.10. für genau diese drei Themen zusammen. Es ersetzt keine
Planseite, sondern ordnet sie: was gebaut ist, was gemessen wurde, was nicht funktioniert und warum, was Florian
entschieden hat, welche Werkzeuge es gibt und womit die neue Sitzung anfangen sollte. Branch `claude/editor-grundlayout`.

**Lesereihenfolge (≈ 20 min):** dieses Dokument → [`CLAUDE.md`](../../CLAUDE.md) (lädt automatisch) →
[`apps/editor/CLAUDE.md`](../../apps/editor/CLAUDE.md) (Fallen) → im Kritik-Register
[`2026-10-14-kritik-phase-0.md`](2026-10-14-kritik-phase-0.md) die Abschnitte ab „Befunde aus A7“ → bei Bedarf die
Planseiten (Links unten).

---

## 1. Was Florian will (über allem)

- **Ziel:** „der perfekte und innovativste Character-Editor aller Zeiten“, viel besser und schneller als in Blender.
  Er zeichnet drei Umrisse (Seite, Front, Top) wie in Illustrator; daraus entsteht live das Wesen im Earle-Look.
- **Genau und perfekt** (16.10., Antwort (a)): Eine Normalenabweichung von 1,4° an einer Linie „reicht nicht“. Toleranzen
  so eng wie möglich; immer die präziseste Lösung.
- **Wirbelsäulen-Baum automatisch** (16.10.): „Man erkennt an den 3 Shapes genau, welche Wirbelsäulen gebraucht werden.
  Sobald ein Vektorshape aus einer Ansicht einen Bauch bekommt, muss die Wirbelsäule in diese Richtung automatisch
  entstehen!“ Und: „Das ganze Mesh muss intelligenter sein und verstehen, welche Shapeform welche Art von Meshaufbau und
  Topologie verlangt!“ Formen wie die Ente brauchen mehrere Wirbelsäulen; Abkürzungen (2×2-Feld, angesteckte Teile)
  hat er als „total zerrissen“ zurückgewiesen.
- **Mundwinkel** (16.10., (c)): „werden doch von der blauen und roten Linie genau vorgegeben“ — die technische Lösung
  ist unsere Aufgabe. **Übergangsreihe statt ungleicher Lippen** (d): „so präzise und optimal wie möglich“.
- **Linien als Kurvennetz** (Entscheidung 11, Teil L): Konturen und Linien mit gemeinsamen Knoten, jede Linie eine
  Käfigschleife genau auf der Linie, Knick über Ecken im Querschnitt, kein Wirkbreiten-Regler, Spanten werden
  Querschnittslinien. Einen Entwurf mit Korrekturschicht und Band fand er zu kompliziert.
- **Grundidee des Editors** (15.10., gilt weiter): Blendshapes und Bones kombinieren; in jeder Pose arbeiten alle
  Werkzeuge wie im Editor. Jede neue Topologie muss Posen- und Pinseldaten mitnehmen können.
- **Sichtbar zählt:** Was er im Editor sieht, ist das Urteil. Eine sichtbare Falte ist ein Fehler, auch wenn sie alt ist.

## 2. Was heute im Editor läuft und was nur im Kern existiert

| | im Editor (was Florian sieht) | nur im Kern (Beweise, Bilder) |
|---|---|---|
| Grundkörper | eine Wirbelsäule je Wesen: Röhre 24 Ringe × 16 Punkte (`kern/ableiten.ts`), Ziele aus Sprossen + Querschnitt + Breite, Käfig durch die Ziele, Naht-/Breitenausgleich | Wirbelsäulen-Baum: Mittelachse, Zerlegung, Rumpf/Äste (`kern/grundkoerper/`) |
| Enden der Wirbelsäule | G2 mit Korrektur vom 16.10. (s. 3.2) | — |
| Maul | alter Maulbau `ableitenMitMaul` (`kern/maul.ts`) | Maul als Einsatz A1–A7 (`kern/einsatz/`) |
| Linien (P im Form-Tab) | „Kantenlinien → Falten“, erste Stufe (`kern/kanten.ts`: Treppe auf vorhandenen Kanten, formt nichts) | Linie wird Reihe/Ring „Fläche bleibt, Netz gleitet“ (`kern/netz/`) |
| Spanten | Reifen = Käfigringe (`kern/reifen.ts`) | — |
| Posen | B1–B7 (Posenliste, Knochen 3D, Linie der Pose, Rot/Blau der Pose, Posen & Leben) | — |

Der Editor friert nach dem ersten Bau die **Stationen** ein (`dok.kaefig.stationen`: Ringanteile, Kappen, Ecken,
Reifen, Maullage, Enden). Jede Kurvenänderung zieht denselben Käfig nach. **Jede neue Automatik muss mit diesem
eingefrorenen Zustand getestet werden** (s. 6).

---

## 3. Die drei Problemfelder

### 3.1 Falten

**Messung** (Faltenmaß: Winkel zwischen benachbarten feinen Flächen auf Stufe 3, Kanten über 20°; scharfe Kanten zählen
nicht; Stand 16.10. nach der Korrektur von G2):

| Fall | Falten | Ort / Ursache |
|---|---|---|
| Langhals (Library), ohne Maul | 23,3°, 32 Kanten | Kehle/Nacken, Knick Hals → Kopf; seit 14.10. 09:00 so (davor 28,9°, 102) |
| Rex (Library) | 93,2°, 77 | Schnauzenspitze |
| Robbe (Library) | 34,4°, 118 | Kopf |
| Überhang (Library „Ente“: Schnauze über dem Bauch) | 68,4°, 669 | Überhang am Kopf |
| Giraffe mit Bauch (Prüfkörper G) | 87,8°, 507; Front Δ 16,5 px, Top 17,6 | eine Wirbelsäule durch Z-Form |
| S-Hals / Drache | 52,4°, 268 / 28,4°, 112 | Knick, Halsansatz |
| Ente (Florians Bild, Prüfkörper G) | 171,2°, 416; Top Δ 50 px | Fächer im Körper, Flügel fehlen |
| Kugel mit kleinem Maul, Kiefer gleich | Haut 46° geschlossen | alter Maulbau |
| Langhals mit kleinem Maul | Lippe 157,7°, Haut 33,7° | alter Maulbau |
| Schnabel mit Kerbe + Unterbiss (Florians Ablauf) | Haut 177°, 268 Durchdringungen zu | alter Maulbau an spitzer Schnauze |
| Vase mit Hals aus der Kugel | 75,2°, 378 | senkrechtes Wesen, eine Wirbelsäule |

**Ursachen (belegt):**
1. **Eine Wirbelsäule für alles.** An engen Knicken (Hals → Kopf) und Z-Formen (Ente) fächern die Ringe an der
   Innenseite; senkrechte Wesen (Vase) brauchen eine senkrechte Achse. Die Leiter wird aus dem Seitenumriss gebildet
   (`versuch/wirbelsaeule.ts`, `kernLeiter`).
2. **Feste Röhre 24 × 16.** Vierecke sind ungleich (geschätzt: Ringabstand am Körper ≈ 0,025, Spaltenabstand ≈ 0,047 Kachel); ein dünner
   Hals bekommt dieselben 16 Punkte je Ring wie der Bauch; an Spitzen drängen sich Ringe (Rex-Braue: Ringe 0–3 auf 19 px).
3. **Käfig durch die Ziele (Interpolation).** Liegen Ziele auf einer scharfen Ecke, wellt die Fläche daneben
   („Interpolation ohne Glättung wellt neben scharfen Falten“). Ziele müssen auf einer glatten Fläche liegen
   (z. B. Hohlkehle an Ansätzen).
4. **Alter Maulbau.** Schneidet das Maul in das Gitter des Körpers, feste Punktzahl über/unter der Lippe; der ganze
   Körper verschiebt sich (Bauch unter hohem Maul bis 60 px, Bild `a7-bauch-alt-neu-2026-10-16.jpg`). Lösung: Teil A.

### 3.2 Wirbelsäulen (Teil G)

**Gebaut und gemessen** (Planseite [Maul als Einsatz …](2026-10-15-maul-einsatz-harmonie-posen.md), Teil G und Stand):
- **G1 Prüfkörper** `kern/pruefen/grundkoerper.ts`: Ente (aus Florians Bild), Giraffe mit Bauch vor der Nase,
  Schwanenhals, Fisch mit Flossen.
- **G2 Enden** `kern/grundkoerper/enden.ts`: automatisch über Wege im Inneren (der innen fernste Punkt hinter einer
  Biegung wird Anfang) und eingefroren als Kurvenparameter. **Regression am 16.10. gefunden und behoben** (00681e29):
  Der Editor fror die Enden an der Startkugel ein; nach dem Umformen oder Maulzeichnen lagen sie an der alten Kugelstelle
  (Florians Schnabel Seite Δ 32 px, Unterbiss 822 Durchdringungen). Jetzt: mit Maul vorderster/hinterster Punkt wie vor
  G2 (bitgleich, 20 Maulfälle); ohne Maul gelten eingefrorene Enden nur, solange sie die Form tragen (Abstand ≥ 90 % des
  Durchmessers oder Weg innen ≥ 90 % des automatischen), andere Knotenzahl → automatisch.
- **G2b Fächer an inneren Ecken** (`leiterInnenEntfaechern`), nur ohne Maul.
- **G3 Querschnitt je Ring:** gemessen, verworfen (Schalter `querschnittJeRing` bleibt aus).
- **G4 Teile als Ausstülpung/angesteckt** (`teile.ts`, `teilBau.ts`): von Florian als Abkürzung zurückgewiesen.
- **G4 neu, Wirbelsäulen-Baum:**
  - `skelett.ts` Mittelachse jeder Silhouette (Abstandstransformation, Verdünnung, Graph, Rumpfachse durch die dickste
    Stelle), `zerlegung.ts` automatische Zerlegung der Seite: Hals bei Knick (≥ 50° gegen die Längsrichtung des Rumpfs)
    plus Dickensprung (< 0,55 des größten Radius), Flossen und Schwanzlappen als Gabeln; einfache Körper bleiben ganz.
    Funktioniert (Bild `g4-zerlegung-seite-2026-10-16.jpg`).
  - `baum.ts` Schritt 2 (Rumpf und Äste als getrennte Netze, Brücke unter dem Ast; Giraffe-Rumpf Falten 88° → 8°) und
    Schritt 3 (Äste aus einem Feld auf der Rumpfnaht, ein Netz) — **nach drei Anläufen angehalten**.
  - `knoten.ts` (16.10., Beweis 1 erster Stand, nur Kern): Fenster auf dem Rumpf, Ast über die Sehne in den Rumpf
    verlängert abgeleitet, erster Astring außerhalb des Rumpfs, Übergangsringe auf einer Hohlkehle.

| Körper | eine Wirbelsäule | Baum Schritt 3 (`baum.ts`) | Knoten v1 (`knoten.ts`) |
|---|---|---|---|
| Giraffe mit Bauch | Δ 1,0/16,5/17,6 · 87,8° (507) | 1,0/4,3/1,3 · 100° (1096) | 2,1/2,6/1,3 · 178,6° (922) |
| Langhals | 1,5/3,8/3,8 · 23,3° (32) | 3,3/3,7/6,5 · 175,8° (759) | 1,7/3,4/4,8 · 177,6° (674) |
| Drache | 1,5/3,8/3,6 · 28,4° (112) | 3,3/4,3/6,5 · 175,8° (1011) | 1,6/3,4/4,9 · 169,6° (1053) |
| S-Hals | 1,8/2,5/6,6 · 52,4° (268) | 10,9/6,2/8,2 · 165,6° (1330) | 1,6/1,4/6,2 · 133,3° (522) |
| Ente | 4,3/6,6/50,0 · 171,2° (416) | 12,8/4,2/50,6 · 179,6° (2258) | 48,2/7,0/50,6 · 176,2° (3314) |

(Δ Seite/Front/Top in px bei 461 je Kachel; Falten größter Winkel, Kanten über 20°.)

**Was wir daraus gelernt haben (16.10., Nahaufnahmen mit `knoten-diagnose.ts`):**
1. **Die Idee Baum ist richtig, der Ansatz war falsch.** So bauen es ZBrush (ZSpheres, Adaptive Skin), der
   Skin-Modifier in Blender, B-Mesh (Ji, Liu, Wang 2010) und Skeletal Quad Meshes (Bærentzen u. a. 2012): an jedem
   Abzweig ein Knoten, jedes Glied schließt mit dem eigenen Ring an. Unser Feld auf der Rumpfnaht war lang und schmal
   (Langhals 12 × 4 Flächen), der Hals rund → verzogene Vierecke an der Sehne (553 von 759 Falten).
2. **Ungleiche Vierecke treiben alles.** Mit 24 Rumpfringen wird das Fenster unter einem schrägen Hals 8–12 Ringe lang
   → 24–32 Punkte je Halsring (dünner Hals mit schmalen Streifen), Übergang stets 3 Ringe (Maximum). Gleich große
   Vierecke (Ringzahl aus Länge und Umfang) gehören deshalb an den Anfang, nicht ans Ende.
3. **Die Brücke unter dem Ast wölbt sich** (Hermite mit Tangentenlänge = Sehne, an der Brust senkrecht) zu einer Kuppel
   in den Hals → der erste Astring außerhalb liegt hoch, viele Ringe fallen weg (Ente: 12 von 24, Kopf zu grob → Seite
   48 px). Brücke flacher machen oder Astringe nach Länge über den behaltenen Teil verteilen.
4. **Zwei Fälle von Knick:** Setzt der Hals am Ende des Rumpfs an (Langhals, Drache: die Brust läuft gerade in den Hals,
   Sehnenende A an der Rumpfspitze), ist eine Fortsetzung der Röhre mit gutem Knick richtig — die eine Wirbelsäule ist
   dort schon am besten (23°). Läuft der Rumpf über den Ansatz hinaus weiter (Giraffe mit Bauch, Ente, S-Hals), ist das
   Fenster richtig. Regel: Fenster, wenn der Rumpf jenseits der Sehne weitergeht; sonst Fortsetzung.
5. **Knick im Ast** (Hals → Kopf) braucht dieselbe Lösung: Kopf als eigenes Glied am Hals oder Ringe, die nur innen
   fächern.
6. **Sichthülle:** Rumpf und Ast bekommen ihre Breiten aus denselben Front/Top-Umrissen; wo der Hals in die Schultern
   ausläuft, decken sich beide Flächen. Die Zerlegung ist eine Frage der Topologie; die Ziele im Übergang sollten auf
   einer gemischten glatten Fläche liegen (Hohlkehle zwischen Rumpf- und Astziel).
7. **Senkrechte Wesen** (Vase): Enden nach links/rechts sind falsch; mit der Korrektur läuft die Achse in den Kopf
   (Seite Δ 1,9 px), gut ist die Form erst mit dem Baum.

**Plan dazu:** [`2026-10-16-formgerechte-topologie.md`](2026-10-16-formgerechte-topologie.md) (zur Freigabe, nicht
freigegeben): Form erkennen → Teile einordnen (Rumpf, runder Ast, flacher Ast, Gabel, Knick, Kappe) → Aufbau je Art
(gleich große Vierecke mit Übergangsreihen, Ansatz als Knoten mit Übergangsringen, Knick innen fächernd, Linsenringe,
Hosen-Topologie) → Einpassen → Einfrieren; Beweise 1–6. Mit den Lehren oben sollte die Reihenfolge angepasst werden:
gleich große Vierecke und die Unterscheidung Fenster/Fortsetzung vor dem Ansatz.

### 3.3 Kantenlinien (Teil L)

Planseite [`2026-10-15-teil-l-linien-kurvennetz.md`](2026-10-15-teil-l-linien-kurvennetz.md) (Stand mit allen Zahlen).

**Gebaut (nur Kern, `kern/netz/`):** „Die Fläche bleibt, das Netz gleitet“ — die fertige Fläche ist eine Funktion S(u, v)
über dem Röhrengitter (`gitter.ts`); eine Linie ist darin eine Kurve. Die Reihe j* (Längslinie, `einpassen.ts`
`reiheEinpassen`) bzw. der Ring i* (Querlinie, `ringEinpassen.ts`) gleitet im Parameterraum genau darauf; Gleitfeld als
dünne Platte (0 auf Konturen und Kappen), Ausgleich senkrecht zur Haut gegen die alte Fläche, Bezugskäfig gegen
Zacken; gemeinsamer Löser `ausgleichGleiten`. Ohne Linien ist die Ableitung bitgleich.

| Fall | Schleife auf der Linie | Haut | Normalen |
|---|---|---|---|
| Kugel, Längslinie waagerecht | 0,04 px | 0,035 px | 0,19° |
| Kugel, schräg über die breiteste Stelle | 0,29 px | 0,21 px | 1,38° |
| Ei, Bogen über die Flanke | 0,23 px | 0,22 px | 1,44° |
| Rex-Braue (kurz, steil, an der Schnauze) | 0,21 px | 0,41 px | 24,3° |
| Kugel, Querlinie senkrecht | 0,16 px | 0,05 px | 0,82° |
| Langhals quer / steil (25°) | 0,04 / 0,07 px | 0,03 / 0,22 px | 2,1° / 6,6° |
| Pinselbeule neben neuer Linie (Fall 5) | — | 0,43 px | 2,0° |

**Was nicht reicht und warum:**
- **Normalen bei schrägen Linien 1,4–6,6°** — Florian: nicht genug. Ursache: Auflösung des Käfigs (8 Reihen je Hälfte;
  eine gescherte Verteilung lässt sich mit bikubischen Flächen nur genähert darstellen). Drei Anläufe mit Gewichten und
  Feldern brachten es nicht unter 1°. Wege, die noch nicht gemessen sind: **örtliche exakte Verfeinerung** um die Linie
  (Teil A, A2 zeigt: eine Stufe exakt verfeinert = gleiche Grenzfläche mit 4× Punkten; darauf die Linie als Reihe des
  feineren Gitters), **Verdichtung** (eine Reihe/ein Ring mehr dort, wo die Linie läuft), **Ringverteilung, die
  gezeichnete Linien berücksichtigt**. Ziel nach Florians (a): Haut ≤ 0,05 px, Normalen ≤ 0,1°.
- **Rex-Braue** (24°): zu wenige Ringe an der Schnauzenspitze — dieselbe Ursache wie 3.1 Punkt 2.
- **Offen in L0:** Fall 2 (Knick längs der Linie aus der Ecke im Querschnitt; braucht Querschnitte je Ring durch die
  Linienkreuzung), Fall 3 (Querschnitt aus Linien, Tiger-Kastenschnauze dreifach), Panzerrand (Schleife durch die
  Kappen), eine Schleife mehr bei dichten Linien (Fall 5, Loop-Cut mit Übertrag), Fall 6 (Linien in der Pose). Danach
  L1 (Linien im Editor), L2 (Spanten werden Querschnittslinien).

### 3.4 Zusammenhang mit dem Maul (Teil A) und den Posen (Teil B)

- **Teil A „Maul als Einsatz“** (`kern/einsatz/`, A1–A7 gebaut, nicht im Editor): A0 (Körper ohne Maul) bleibt außerhalb
  von Feld und Kragen bitgleich; Feld aus einmal exakt verfeinerten Flächen um die Linie, faltenfreie Karte
  (konform + Tutte), Lippen als unendlich scharfe Schleife exakt auf Rot/Blau (ab m = 10 ≤ 0,8 px), Haut formtreu.
  **Zwei Grundsatzbefunde, angehalten:** (1) Der Mundwinkel faltet bei geschlossenen, unendlich scharfen Lippen
  (Catmull–Clark gibt zwei Hautflächen 180° statt 360°; Ecke 15/15 gefaltet, Spitze 8/15 sauber, Eckregel mit
  Sektorwinkel nach Biermann/Levin/Zorin 2000 singulär) — Florian (c): Rot und Blau geben den Mundwinkel vor, die Lösung
  ist technisch. (2) Die Lippenauflösung m hängt am Feldrand — Florian (d): Übergangsreihe (3/5-Polpaare). Wege im
  Kritik-Register („Befunde aus A7“). Teil A behebt die Maulfalten aus 3.1.
- **Dieselbe Maschine:** exakte Verfeinerung (A2), Karte (A4), örtliches Neuvernetzen mit Ausgleich gegen A0 (A5–A7),
  das Gleiten aus Teil L und die Übergangsreihen aus dem Topologie-Plan sind Bausteine einer gemeinsamen Bauweise
  „Zielfläche fest, Netz örtlich neu“. Es lohnt, sie für Maul, Linien und Ansätze gemeinsam zu denken.
- **Posen (B1–B7) hängen an Käfignummern:** Ruhe-Deltas je Pose mit Bezugs-Käfig, Übertrag aus der Umgebung bei neuer
  Topologie (`kern/posen/uebertrag.ts`, K6). Jede neue Topologie (Baum, Linienschleifen, Einsatz) muss Pinsel- und
  Posendaten über ihre Lage übertragen.
- **Teil H „Werkzeug-Harmonie“** (Entwurf [`2026-10-15-entwurf-werkzeug-harmonie.md`](2026-10-15-entwurf-werkzeug-harmonie.md),
  nicht begonnen): Käfig als Wahrheit (A0 im Dokument), Werkzeug-Handlung = ein Vorgang, örtliche Änderungen über
  maskierte Neuableitung, Pinsel-Relief auf der schwarzen Linie. Betrifft, wie Linien und Wirbelsäulen später bedient werden.

---

## 4. Florians Regeln (gültig)

1. Technische Entscheidungen trifft die Sitzung selbst, immer die präziseste Lösung. Florian nur zu Look und Bedienung
   fragen, in seiner Sprache (was er sieht). Freigegebene Bauweisen nie still durch Abkürzungen ersetzen.
2. Keine Meldung „fertig/bestanden“ ohne Florian: „gebaut, gemessen an …, Abnahme offen“.
3. Nach drei gemessenen Fehlanläufen an derselben Stelle anhalten und berichten.
4. Pläne erst ins Repo, dann zur Freigabe; große Bauweisen erst nach Freigabe.
5. **Mit Florians Ablauf testen:** neue Kugel bauen (Stationen frieren ein) → umformen, Knoten einfügen → Maul zeichnen;
   Prüfreihe mit `KUGEL0=1`. Jede sichtbare Falte über 20° ist ein Fehler. Immer sagen, was im Editor ist und was nur im Kern.
6. Eigener Vite auf 5192 (`run-check.sh`) bzw. eigene Ports (`vergleich/editor-lauf.sh`), nie Florians 5180; nie in
   `~/Documents/early earle Editor/Bibliothek` schreiben; `assets/fonts/Hippie Movement.otf` nie committen.
7. Deutsch, klare Sätze, keine Modellnamen in Commits/Docs/Code (außer der Co-Authored-By-Zeile); nach jedem Teilschritt
   committen und pushen; am Blockende `docs/UEBERGABE.md` überschreiben; nach einem Pull muss Florian den Dev-Server neu
   starten (HMR-Falle).

## 5. Code-Landkarte für diese Themen

| Datei | Inhalt |
|---|---|
| `packages/shape/src/kern/ableiten.ts` | Bau mit einer Wirbelsäule: `kernLeiter` (Enden, Entfächern), `stationenWaehlen`/`stationenNachfuehren` (Ringverteilung, eingefroren), `faltenSetzen`, `querschnitteFuer`, `zieleBerechnen`, `fertigstellen` (Käfig durch Ziele, Naht- und Breitenausgleich), `ziehen` (schneller Zug) |
| `packages/shape/src/versuch/wirbelsaeule.ts` | Leiter (kürzeste Leiter zwischen Rücken- und Bauchlinie) |
| `packages/shape/src/kaefig/roehre.ts`, `kaefig/halbkanten.ts` | Röhren-Vorlage (R × N, Kappen c × c, N durch 8 für Nähte durch die Kappe), Halbkanten-Käfig |
| `packages/shape/src/subdivision/`, `loeser/` | Catmull–Clark als Matrix, Grenz-/Ausgleichslöser, `posenLoeser`, `glattLoeser`, `cg` |
| `packages/shape/src/kern/grundkoerper/` | `enden.ts` (G2 + Korrektur), `mittelachse.ts`, `skelett.ts`, `zerlegung.ts`, `baum.ts` (Schritt 2/3), `knoten.ts` (Beweis 1 v1), `teile.ts`/`teilBau.ts` (G4 alt) |
| `packages/shape/src/kern/netz/` | Teil L: `gitter.ts`, `einpassen.ts`, `ringEinpassen.ts`, Tests mit Tor-Ausgabe |
| `packages/shape/src/kern/einsatz/` | Teil A: `flaeche`, `verfeinern`, `feld`, `karte`, `topologie`, `lippe`, `loesen` + Tests |
| `packages/shape/src/kern/maul.ts` | alter Maulbau (im Editor aktiv) |
| `packages/shape/src/kern/kanten.ts`, `kern/reifen.ts` | heutige Kantenlinien (Treppe) und Reifen im Editor |
| `packages/shape/src/kern/pruefstand.ts`, `kern/pruefen/`, `kern/abweichung.ts` | Maße (Faltenmaß, `pruefenMaul`, Durchdringungen nach Bereichen), Prüfkörper, Zufallsreihe, Δ je Blatt |
| `packages/shape/src/kern/wesen.ts` | Bau im Worker (`wesenBauen`, Stand-Cache, Bauplan) |
| `apps/editor/src/kern/kernBau.ts`, `state/editorStore.ts` | Adapter Editor → Bauplan, Einfrieren der Stationen (`setzeStationen`) |

## 6. Werkzeuge und Prüfungen

Überblick: [`apps/editor/scripts/pruefen/README.md`](../../apps/editor/scripts/pruefen/README.md) (mit Nachtrag 16.10.).
Die wichtigsten für diese Themen:
- **Kontaktbögen:** `grundkoerper-g.ts` (Grundkörper, `BAUM=…`), `knoten-diagnose.ts` (Ansatz in Nahaufnahme, Falten
  rot), `skelett-g4.ts`, `zerlegung-g4.ts`, `netz-l0.ts`, `einsatz-*.ts`, `pruefreihe.ts` + `pruefreihe-bilder.mjs`.
- **Florians Ablauf und Regressionen:** `vergleich/ablauf.mjs` (Editor: Kugel → Schnabel → Unterbiss, Kugel → Vase),
  `vergleich/ablauf-kern.ts` (dasselbe im Kern), `vergleich/editor-lauf.sh` / `kern-lauf.sh` (beliebiger Commit gegen
  heute), `vergleich/buehne.mjs`, `vergleich/bau.ts`; `pruefreihe.ts` mit `KUGEL0=1`.
- **Unit-Tests:** `packages/shape/src/kern/grundkoerper/enden.test.ts` (inkl. Regressionstests G2),
  `kern/netz/*.test.ts`, `kern/einsatz/*.test.ts`. Schwere Tests laufen unter Parallellast 30–40 s (Zeitgrenze 120 s);
  Tempo-Tests einzeln prüfen, wenn die Maschine belastet ist (`uptime`).
- **Bilder ansehen:** HTML über `html-shot.mjs` in PNG, dann selbst ansehen, bevor etwas gemeldet wird.

## 7. Empfehlung für den Start

1. **Fehlerkatalog in Florians Ablauf** als Ausgangslage (ein Kontaktbogen, Bilder aus dem Editor + Zahlen): neue Kugel
   → Schnabel ± Maul, Vase/Hals, Ente aus seinem Bild, Giraffe mit Bauch, Langhals-Nacken, kleine Mäuler auf runden
   Formen, Linien auf Kugel/Ei/Rex (Kern). Kriterium: keine sichtbare Falte über 20°, Δ ≤ 2 px. Florian zeigen.
2. **Planmodus für eine gemeinsame Bauweise** von Topologie, Einpassen, Linien und Ansätzen (3.4: „Zielfläche fest,
   Netz örtlich neu“; Formerkennung → Teiltypen → Aufbau je Art → Einpassen → Einfrieren), mit Beweisreihenfolge und
   harten Kriterien je Schritt; die Lehren aus 3.2 (gleich große Vierecke zuerst, Fenster/Fortsetzung, flache Brücke,
   Hohlkehle) und 3.3 (exakte Verfeinerung für Linien) einarbeiten. Den Plan „Formgerechte Topologie“ dabei ablösen oder
   fortschreiben. Freigabe einholen.
3. Dann Beweis für Beweis, je mit Bildern an Florian; nach drei Fehlanläufen anhalten.

## 8. Weitere Planseiten und Bilder

- Freigegebener Gesamtplan: [`2026-10-15-maul-einsatz-harmonie-posen.md`](2026-10-15-maul-einsatz-harmonie-posen.md)
  (Teil A, H, G, B, L; Stand je Schritt), Entwürfe A/H/B daneben.
- Kritik-Register: [`2026-10-14-kritik-phase-0.md`](2026-10-14-kritik-phase-0.md) (Befunde aus A7, B7, G4 neu, Regression G2).
- Bilder in `docs/progress/editor/`: `g1-ausgangslage-2026-10-15.jpg`, `g2-enden-2026-10-15.jpg`,
  `g4-zerlegung-seite-2026-10-16.jpg`, `g4-baum-schritt3-2026-10-16.jpg`, `l0-linie-als-reihe-2026-10-15.jpg`,
  `l0-reihe-und-ring-2026-10-16.jpg`, `a5-topologie-2026-10-16.jpg`, `a7-haut-geloest-2026-10-16.jpg`,
  `a7-bauch-alt-neu-2026-10-16.jpg`.
- Florians Referenzen: `docs/look/wesen-refs/` (Bögen), `docs/look/editor/florian-2026-10-15-ente-fluegel.webp`.
