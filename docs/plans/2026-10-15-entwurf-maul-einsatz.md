# Entwurf Teil A: Maul als Einsatz (Anhang zum Plan, 15.10.2026)

> Ausführlicher Entwurf zum freigegebenen Plan [`docs/plans/2026-10-15-maul-einsatz-harmonie-posen.md`](2026-10-15-maul-einsatz-harmonie-posen.md). Maßgeblich ist der Plan; wo dieser Entwurf abweicht oder Florian entschieden hat, gilt der Plan.

## Abgleich mit dem Plan und Florians Entscheidungen

- **Code-Stand:** Nach der Rücknahme von 7baee2d, 50c8976 und c10f695 (Commit 42ef353) entspricht der Code c97497b; Zeilenangaben „@c97“ bzw. „c97497b“ gelten weiter.
- **Maullinien:** Florians Entscheidung 6 „Maullinien bleiben, wo gezeichnet“ ersetzt den Vorschlag in 8.3 (Linien als Oberflächenanker, die mit der Haut wandern; ebenso in 0.8 und 1 b): Jeder Knoten behält die Koordinaten seiner Ansicht (`blatt`), die dritte Koordinate wird entlang dieser Blickachse auf die Haut von A0 gelegt, der kürzere Kiefer behält seinen Abstand nach innen, der Anfang folgt der Kontur.
- **Rundmaul:** bleibt bis zu einer späteren Einsatz-Variante eigenständig.
- **Spaltbrücke (0.1, 1 a, 4.4):** Es gilt der Plan: A0 liest zur Laufzeit keine Mauldaten. Alte Spaltmarken werden einmalig bei der Migration in die Kontur gebacken (Teil H, `kern/harmonie/migration.ts`); `seiteMitBruecke` wird nur dort gebraucht. Deshalb darf `schlitz.ts` wie in 8.4 entfallen (die Brücke lebt in der Migration).
- **„Formen folgen“ mit Maul (1 f):** gilt nicht. „Formen folgen“ entfällt (Plan H4), die schwarze Linie zeigt das Relief (Florians Entscheidung 5). Das Relief wird am Körper ohne Maul (A0) gemessen; das Maul stört es deshalb nicht.
- **Schreiben ohne Undo-Schritt (8.3, Anker):** gilt nicht. Es gilt Teil H (I7, Vorgänge): Anker entstehen im Abschluss eines Vorgangs bzw. beim Laden als Teil der Migration, nie als versteckter Schreibvorgang. Wegen Entscheidung 6 („Linien bleiben, wo gezeichnet“) speichern Linienknoten ohnehin keine Flächenanker, sondern ihre besitzende Ansicht (`blatt`) und beim kürzeren Kiefer den Abstand nach innen.
- **Pfade (9.1 Schritt 0, Dateiliste am Ende):** Der Prüfstand liegt in `packages/shape/src/kern/pruefen/` (gebaut: `zufall.ts`, `koerper.ts`, `linien.ts`, `faelle.ts`, `masse.ts`, `werkzeuge.ts`, `reihe.test.ts`), nicht in `kern/pruefreihe/`.
- **Kleinster Winkel:** Es gilt 20° (Plan, 6.2, 9.2); die 25° in 2.5 sind ein Widerspruch des Entwurfs.
- **Florians Fragen aus Abschnitt 11:** Die Lippenkante (Frage 1) entscheidet er beim Look-Urteil 1 (A7). Die Topologie mit vier Polen (Frage 2) und „Linien folgen der Fläche“ (Frage 3) sind durch den Plan bzw. Entscheidung 6 geklärt. Kiefer-Spant v1 (Frage 4) gilt wie vorgeschlagen.

## Vorbemerkung

Ich habe die Pläne, Florians Zeichnungen und den Kern gelesen. Bei Dateien, die die drei zurückzunehmenden Commits berühren, habe ich die Fassungen von c97497b gelesen. Außerdem habe ich die Teile des Codes geprüft, auf die dieser Entwurf baut:

- `verfeinern` und `grenzMaske`: wie Falten wirken und wie die Indizes angeordnet sind.
- `pruefeKaefig`, `ausgleichsLoeser` und `luZerlegen`.
- Das Einsatzmuster in `augenHoehle.ts`.
- `deskriptoren`, `zaehne`, `posenAnker`, `pinsel` und `pruefstand`.
- `schlitz.ts` (`seiteMitSehne`, `seiteFuerLeiter`) und den CG-Löser mit Jacobi-Vorkonditionierung in `versuch/aufblasen.ts`.

---

## 0. Entscheidungen auf einen Blick

1. **A0 sieht das Maul nie.** Die einzigen Mauldaten, die der Grundkörper lesen darf, sind die markierten Anfangsknoten im Seitenprofil (die Enden des Spalts). Alle anderen Maulzweige in `ableiten.ts` entfallen: `kappeMin`, `maulBereich`, `glaettung` mit Maul, Breitengewicht 4, die offene Naht, die Umverteilung `lippe` und `kieferQuerschnitt`.
2. **Einsatz in den einmal exakt verfeinerten Käfig (refine¹(A0)), nicht in den Grundkäfig.** Außerhalb des Felds hat A genau die Grenzfläche von A0 (Beweis in 2.1). A wird eine Stufe weniger unterteilt als A0 (L−1), das endgültige feine Netz ist also so groß wie heute.
3. **Das Feld ist eine symmetrische Scheibe M aus verfeinerten Flächen, dazu ein unberührter Kragenring C.** In M liegt ein geordneter Kreisring: 2m+1 Speichen × J Reihen je Hälfte, die Lippenschleife, K Taschenreihen und ein m×m-Rachengitter. Die einzigen neuen unregelmäßigen Punkte sind 4 Fünferpole (Valenz 5) an den konvexen Ecken von M, dazu 4 verdeckte Punkte mit Valenz 3 im Rachen.
4. **Die Anordnung kommt aus einer beweisbar faltenfreien Karte.** Auf dem feinen Netz von A0, entlang des Schlitzes aufgeschnitten, wird eine konforme Abbildung auf ein Rechteck berechnet und dann nach dem Verfahren von Tutte auf das Einheitsquadrat neu eingebettet. Reihen sind u-Niveaus; Speichen sind Kurven, die in θ monoton steigen. Das funktioniert für jede Linienform (J, S, senkrecht, eingerollt) und jede Lage.
5. **Die Lippenkanten bilden eine einzige unendlich scharfe Faltenschleife.** Dadurch hängt die Lippenkurve nur von ihren eigenen Kontrollpunkten ab; diese lassen sich exakt an die Bézier-Linien anpassen (dichte, beidseitige Prüfung in jeder Ansicht). Der Mundwinkel ist ein Eckpunkt, seine Grenzlage ist also genau der gezeichnete schwarze Punkt.
6. **Die Haut wird formtreu gelöst, als linearer Ausgleich (kleinste Quadrate) an A0.** Die Systemmatrix ist je eingefrorener Topologie konstant; jede Aktualisierung ist ein Rückwärtseinsetzen. Die Tasche wird getrennt gelöst, weil die Falte beide Seiten entkoppelt.
7. **Kiefer: immer dieselbe Topologie (zwei Lippenketten).** Jede Kieferseite bekommt ihre eigene 2D-Verzerrung und ihr eigenes 3D-Korrekturfeld, getrieben nur von ihrer eigenen Linie. Bei eingefrorener Karte lässt die Bearbeitung eines Kiefers die andere Seite bitgleich.
8. **Linien werden Kurven, die auf der Fläche von A0 verankert sind** (Fläche, u, v, Tiefe). Das Maul folgt damit Körperänderungen und Pinselstrichen linear. Die Topologie ist im Dokument eingefroren und wird nur bei den aufgeführten Auslösern neu gebaut, am Gestenende.

---

## 1. Schichtenmodell: geprüft, mit Korrekturen

P → C(P) → **A0** = C(P) + D_form (Stufe 0, die heutige Kette ohne Maul unverändert) → **A0¹** = R·A0 (exakte Verfeinerung, Matrix R zwischengespeichert) → **A** = Einsatz(A0¹; Linien, Spec) → X(w) = Skin(A + Σ wᵢ Dᵢ; θ(w)).

Korrekturen am Entwurfsmodell:
- **(a) A0 liest nur die markierten Knoten.** Es braucht sie für die Spaltbrücke (`seiteMitBruecke`, 4.4). Tests:
  - Kiefer gleich: Ein Maul hinzufügen, bearbeiten oder löschen lässt A0 bitgleich. Das behebt Befund 4: Änderungen bleiben nach dem Entfernen des Mauls nicht mehr bestehen.
  - Kiefer getrennt: A0 ändert sich nur im Einflussbereich der Brücke.
- **(b) Die Linien werden als Oberflächenanker auf A0 gespeichert** (8.3). Die Pinsel-Deltas D_form gehören zu A0, das Maul folgt also Pinselstrichen (behebt Befund 9).
- **(c) Die Kieferform (Über-/Unterbiss, breiterer Kiefer, Kiefer-Spant) liegt im Einsatz, je Kieferseite.** Sie gehört nicht zu A0.
- **(d) A tritt auf wie eine `Ableitung`.** Es hat `kaefig`, `unterteilung` (L−1 Stufen) und `fein`; `vorlage` bleibt die Röhrenvorlage von A0. Dazu trägt es `basis` = A0 für Werkzeuge, die den Körper ohne Maul brauchen: Reifen, den Pinsel im Grundmodus, das Δ je Blatt, die Verankerung der Linien.
- **(e) Der Schlüssel des A0-Zwischenspeichers im Worker enthält keine Mauldaten.** Eine Linienänderung leitet A0 nie neu ab (behebt Befund 11).
- **(f) „Formen folgen“ funktioniert mit Maul wieder.** Es läuft auf A0, und das Maul folgt.

---

## 2. Topologie

### 2.1 In welche Stufe eingesetzt wird

| | Stufe 0 (≈ 400 Punkte) | **Stufe 1 (≈ 1600 Punkte)** | Stufe 2 (≈ 6400) |
|---|---|---|---|
| Kragenbreite (Zone, in der sich die Grenzfläche ändert) | 1 Grundfläche, ≈ 0,05 × 0,15 auf einer Kugel | halb so breit | ein Viertel |
| Lippenauflösung m (an die Randlänge gebunden, 2.3) | oft < 6 | ≈ 2× | übermäßig |
| Pole sitzen in | großen Flächen (im Cel-Shading sichtbar) | kleinen Flächen | |
| Größe des feinen Netzes | – | wie heute (A auf L−1) | |
| Folgen für die nachgelagerten Schritte | keine | Käfig 4×, nur örtliche Lösungen | zu groß |

**Wahl: Stufe 1.** Auf A wird nie eine globale LU-Zerlegung gebraucht; alle Maulsysteme sind örtlich und haben ≤ ~500 Unbekannte.

**Kragen-Lemma** (liefert die Garantie „außen bitgleich“):
- Mit DeRose-Falten hängt die Grenzfläche über einer Fläche F (und jede endliche Stufe davon) nur von zwei Dingen ab: von den Lagen der Punkte aller Flächen, die einen Punkt mit F teilen, und von den Valenzen der Ecken von F selbst.
- Also: Sei M die Menge der ersetzten Flächen und C der Ring der Flächen, die die Randpunkte von M von außen berühren. Behält C seine Topologie und behalten alle seine Punkte ihre Lage, ist jede Fläche außerhalb von M∪C unverändert.
- Die Randpunkte von M dürfen ihre Valenz ändern. Das betrifft nur die Grenzfläche von C, die der formtreue Ausgleich dann anpasst.
- Praktische Form: Außerhalb von M∪C gleicht A dem A0 bis ≤ 1e-12, weil sich nur die Summationsreihenfolge unterscheidet. Für strikte Bitgleichheit werden die äußeren feinen Blöcke über die Blockreihenfolge aus dem zwischengespeicherten feinen Netz von A0 kopiert, genau wie es `hoehlenTopologie.feinAlt` schon tut.

**Index-Regel.** A behält den vollen verfeinerten Indexraum:
- Verfeinerte Punkte in M werden tot (nicht referenziert, Rolle `tot`). Neue Punkte werden angehängt.
- Die Eckpunkte aus Stufe 0 (Indizes < n0) und alle verfeinerten Indizes behalten ihre Bedeutung über Topologie-Neubauten hinweg. Pose-Deltas auf ihnen bleiben erhalten.
- `kaefigAusFlaechen`, `verfeinern` und `grenzMaske` vertragen schon Punkte ohne Kanten (sie nehmen die Zweige n = 0 bzw. n < 3). Nutzer zeichnen nur Flächen.

### 2.2 Schlitzhülle aus den Linien

- **Eingaben.** Die verankerten Linien werden als 3D-Kurven red(t) (Rot) und blue(t) (Blau) ausgewertet, mit t ∈ [0,1] nach Bogenlänge; t = 1 ist der gemeinsame Mundwinkel. Sie werden auf das feine Netz von A0 projiziert, beschränkt auf die rechte Hälfte: red′, blue′. Die Anfänge werden exakt auf die Naht projiziert.
- **Trennung.** ν(t) ist die Richtung in der Tangentialebene senkrecht zum Schlitz, zur Schädelseite zeigend. σ(t) = (red′ − blue′)·ν.
- **Hülle.**
  - Obere Seite H⁺ = red′, wo σ > ε, sonst mid = proj(½(red′+blue′)).
  - Untere Seite H⁻ = blue′, wo σ > ε, sonst mid.
  - Wo σ > ε, wird der Bereich zwischen den Seiten ausgeschnitten: ein offener Lippenspalt in Ruhe.
  - Kiefer gleich (σ = 0): ein Schlitz der Breite null entlang der Linie.
- **Warum diese Regel.** Sie ist stetig in den Linien, auch wenn die Linien ihre Rollen tauschen oder sich kreuzen. Außerdem garantiert sie, dass die Verzerrungen je Kiefer (4.2) eine Kieferseite immer nur strecken, nie stauchen.

### 2.3 Feldwahl (`einsatz/feld.ts`)

1. **Abstand.** Für jede verfeinerte Fläche wird ihr 3D-Abstand zur Hülle über ihre feinen Abtastpunkte berechnet, mit Zusammenhangsprüfung (Dijkstra über die Flächennachbarschaft).
2. **Nötiger Radius je Seite.**
   - Reihen: r_rows = 3·h₁, wobei h₁ der Median der verfeinerten Kantenlängen nahe dem Schlitz ist.
   - Auslauf der Korrektur: r_δ± = max|D±|/0,35 + h₁ (Steigungsgrenze, 4.2).
   - Mundwinkelzone: ≥ 3h₁ über den Mundwinkel hinaus.
   - Wenn es einen Kiefer-Spant gibt: sein unterer Ringteil.
3. **Saat.** Die Flächen innerhalb des nötigen Radius nehmen, ihre Spiegelbilder hinzufügen, die Zusammenhangskomponente behalten, die den Schlitz enthält, und Löcher füllen, bis es eine Scheibe ist.
4. **Begradigen.** Für jeden Randpunkt v sei f_v = Anzahl der M-Flächen an v. Nach dem Einsetzen wird seine Valenz **val_v − f_v + 2**.
   - Nach Gauß–Bonnet gilt Σ_boundary(2 − f_v) = 4 − Σ_interior(4 − val), es sind also mindestens 4 Fünferpole nötig. Punkte mit Valenz 3 in M (Kappenecken) senken diese Zahl; eine konvexe Ecke auf einem Punkt mit Valenz 3 wird regulär.
   - M wachsen lassen, bis es genau die minimalen konvexen Ecken gibt (2 je Seite), keine konkaven Ecken, und bis die Pole ≥ 2 Reihen von der Lippe entfernt in Bereichen geringer Krümmung sitzen.
5. **Bedingungen.**
   - Faltenkanten dürfen auf dem Rand von M oder in C liegen; sie bleiben automatisch erhalten.
   - Eine Falte in M ist nur erlaubt, wenn sie am Schlitz endet. Sie wird dann an einer Speiche ausgerichtet, und ihre letzte Kante läuft auf Schärfe 0 aus, damit der Lippenpunkt nicht 3 scharfe Kanten bekommt und zur Ecke wird. Sonst wird M so beschnitten, dass die Falte am Rand entlangläuft.
   - Reservierte Zonen werden gemieden: Augenhöhlen plus ein Ring sowie M∪C anderer Einsätze.
6. **Lippenauflösung.** Die Kantenzahl E des halben Rands muss gerade sein; dann ist **m = E/2**.
   - m_min = max(6, 2·Bézier-Segmente + 2·Eckknoten + 2). m_max = 20.
   - Zu klein: M wachsen lassen. Zu groß: eine Übergangsreihe mit symmetrischen 3/5-Polpaaren in der äußersten Reihe einfügen (nur als Rückfall).
7. **Gleichgewicht.** Randpunkt m muss „hinter“ dem Mundwinkel liegen (kleines |θ_out(m) − θ_c|); sonst die kürzere Seite wachsen lassen.
8. **Ausgabe.** `EinsatzSpec` mit {`feld` (verfeinerte Flächen-IDs), Kragen, geordneter Rand ab der vorderen Mittellinie T, m, J, K, Variante, Faltenspeichen}. Deterministisch: stabile Sortierungen, feste Iterationszahlen.

### 2.4 Karte (`einsatz/karte.ts`)

- **Netz.** Das zwischengespeicherte feine Netz von A0 auf Stufe L, beschränkt auf das halbe Feld (nur M, ≈ 2000–4000 Punkte). Vierecke werden entlang der kürzeren Diagonale geteilt.
  - Der Rand von M ist der feine Kantenpfad, der aus seinen Käfigkanten hervorgeht (wie bei `feinKette`).
  - Die Hülle wird auf einen feinen Kantenpfad eingerastet (einfach, höchstens ½ feine Kante von der Kurve entfernt), und das Netz wird entlang dieses Pfads aufgeschnitten: Pfadpunkte werden verdoppelt, außer dem Mundwinkel. Eine offene Linse wird aus dem Netz gelöscht.
- **Schritt 1, konforme Abbildung auf ein Rechteck:**
  - U ist harmonisch (Kotangensgewichte) mit U = 0 auf dem Schlitz bzw. der Linse, U = 1 auf dem Rand von M und Normalableitung null auf der Mittellinie.
  - V ist harmonisch mit V = 0 auf dem oberen Stück der Mittellinie, V = 1 auf dem unteren und Normalableitung null auf Schlitz und Rand.
  - Im Kontinuum sind das konjugierte Paare: orthogonale Niveaulinien und keine kritischen Punkte. Nahe dem Mundwinkel ergibt die konforme Struktur elliptische Schleifen – genau die klassischen Mundschleifen.
- **Schritt 2, Neueinbettung nach Tutte.** Die Randwerte aus Schritt 1 (monoton; erzwungen) dienen als Dirichlet-Daten. Beide Koordinaten werden noch einmal mit positiven symmetrischen Gewichten gelöst (Kotangens auf ≥ 0,05·Mittelwert begrenzt, oder Mittelwertgewichte).
  - Nach Tutte/Floater ist das eine **Bijektion auf das konvexe Einheitsquadrat**. Die Orientierung jedes Dreiecks wird geprüft.
- **Löser.** Den CG-Löser mit Jacobi-Vorkonditionierung (`loesen` in `versuch/aufblasen.ts`) nach `loeser/cg.ts` herauslösen; Warmstart aus der vorigen Karte. Danach ein Zellraster für die Umkehrsuche chart⁻¹(u, θ) → (feines Dreieck, baryzentrische Gewichte) bauen.
- **Seitliches Maul (erreicht die Mittellinie nicht):** den vollen Kreisring nehmen, entlang einer Speiche aufschneiden, θ periodisch (0 und 1 auf den beiden Seiten des Schnitts).

### 2.5 Geordnetes Gitter

- **Reihen.** u₀ = 0 ist die Lippenschleife, u_J = 1 der Rand von M. Die Niveaus werden so gewählt, dass der 3D-Reihenabstand von ≈ 0,6h₁ auf h₁ wächst. J ∈ [3,7], Standard 4–5.
- **Speichen.** k = 0..2m:
  - θ_out(k) = V-Wert des Randpunkts k von M (fest).
  - θ_in(k) wird auf dem Schlitz gewählt: eine Mischung aus gleichmäßigem θ und krümmungsgewichteter Bogenlänge, mit erzwungenen Punkten am Mundwinkel (k = m) und an Bézier-Eckknoten.
  - Speichenkurve: θ_k(u) = (1−s(u))·θ_in(k) + s(u)·θ_out(k), mit s = smoothstep. Das ist für jedes u streng steigend in k; Speichen kreuzen sich also nie, und jede trifft jede Reihe genau einmal.
- **Gitterpunkt** (r, k) = chart⁻¹(u_r, θ_k(u_r)), ein Punkt auf A0. Er dient als Ziel und als Startwert.
- **Mundwinkelzone.** Die konforme Abbildung drängt die Speichen am Mundwinkel von selbst zusammen (Wurzelsingularität). Erzwungen: ≥ 3 Speichen je Seite innerhalb von 12 % der Lippenlänge.
- **Qualitäts-Tor auf der Fläche.** Alle Vierecke positiv orientiert; Seitenverhältnis ≤ 4; kleinster Winkel ≥ 25°.

### 2.6 Lippenschleife und Mundwinkel

- **Reihe 0 = geschlossene Schleife aus 4m Punkten:** U₀…U_{m−1} (Oberlippe), c (Mundwinkel), D_{m−1}…D₀ (Unterlippe), dazu das Spiegelbild. Jeder Punkt hat Valenz 4: zwei Schleifenkanten, eine Hautkante, eine Taschenkante.
- **Schärfe.** Alle Schleifenkanten sind unendlich scharf. c bekommt unendliche Punktschärfe: Seine Grenzlage ist c, und die Lippen treffen sich unter einem Winkel. Bézier-Eckknoten werden weitere Eckpunkte.
- **U und D sind immer getrennte Punkte.** In Ruhe mit gleichen Kiefern fallen sie räumlich zusammen; in der Fressen-Pose trennen sie sich immer.

### 2.7 Tasche und Rachen

- **Taschenreihen** p = 1..K (K = 5, Bereich 4–6): p = 1 Innenlippe, p = 2 Zahnfleischlinie, p = 3..K Wände. Jede ist eine Schleife aus 4m Kanten auf denselben Speichen wie die Lippen; die parallelen Ketten, die `zaehne.ts` erwartet, bleiben also parallel. Die Mundwinkelspalte läuft c → P₁(c) … P_K(c).
- **Verschluss: ein m×m-Vierecksgitter** auf der letzten Schleife. Seine Ecken sind P_K(U₀), P_K(c_R), P_K(D₀), P_K(c_L).
  - Die Spiegelebene ist die Gitterdiagonale U₀–D₀ (ihre Punkte haben z = 0). Die Trennung oben/unten ist die Gegendiagonale. Nur Vierecke.
  - Das verlangt gleiche Zahlen auf beiden Lippen (m_U = m_D = m); deshalb bekommen beide Lippen immer dasselbe m.
- **Prüfung.** `pruefeKaefig` nach dem Zusammensetzen; bei einem Fehler wird die Operation verworfen und gemeldet (Plan 4.5).

### 2.8 Besondere Lagen

- **Spiegel und Naht.** Alles wird auf dem halben Feld berechnet und gespiegelt. Die Mittellinienspeichen (k = 0 und 2m), U₀, D₀, die Mittellinienpunkte der Tasche und die Rachendiagonale liegen exakt bei z = 0 (z wird aus dem Ausgleich eliminiert).
- **Seitliche Mäuler, die die Mittellinie nicht erreichen.** Variante „seitlich“: ein Kreisring mit zwei Mundwinkeln je Seite, gespiegelt als zwei Felder; Rachengitter (m/2)×(m/2).
- **Kappe oder Spitze, unter dem Kinn, am Hals.** Kein Sonderfall: Das Feld wird nach der Geometrie auf dem verfeinerten A0 gewählt, Pole an Kappenecken können aufgenommen werden (2.3, Schritt 4), und die Karte funktioniert für jede Scheibe.
- **Vorhandene Falten** (Plattenkanten am Kasten, Kanten): siehe 2.3, Schritt 5.
- **Tiger-Plattenmaul (Mercedesstern).** Ein normaler Einsatz mit kurzem ∧-förmigem Schlitz auf der flachen Frontplatte. Die Linie wird im Front-Blatt gezeichnet und auf der Platte verankert. Die Randfalten der Platte bleiben auf dem Rand von M oder in C. Der alte Fehler der W-Lippe (steigende Arme reißen beim Öffnen) verschwindet von der Struktur her: Die „untere Seite“ ist durch die Topologie bestimmt, nicht durch Ringschleifen.
- **Reihenfolge mit anderen Einsätzen.** A0 → verfeinern → Maul-Einsatz → Augenhöhlen auf A.
  - `augenHoehle` muss M∪C meiden und auf Stufe 1 einen 2-Ring nehmen (gleicher Fußabdruck wie der heutige 1-Ring auf Stufe 0).
  - Rundmaul und Schlitzmaul schließen sich in v1 weiter gegenseitig aus. Später wird das Rundmaul derselbe Einsatz mit O-förmigem innerem Rand.

### 2.9 Ergebnis-Topologie

| Punktklasse | Valenz |
|---|---|
| Hautreihen, Speichen, Lippenschleife, Taschenreihen, Mundwinkel c | 4 |
| Die 4 konvexen Ecken von M (2 je Seite) | 5 (weniger, wenn Punkte mit Valenz 3 aufgenommen werden) |
| Ecken des Rachengitters (verdeckt) | 3 |
| Übergangsreihe (nur Rückfall) | symmetrische 3/5-Paare, äußerste Reihe |

---

## 3. Lösen

### 3.1 Lippenkanten exakt auf den Linien (`einsatz/lippe.ts`)

- **Warum sie entkoppelt ist.** Die Grenzkurve einer unendlich scharfen Falte ist der gleichmäßige kubische B-Spline der Faltenpunkte. An der Mittellinie nutzt er gespiegelte Geisterpunkte; an Eckpunkten ist er eingespannt. Es gelten die Regeln aus `verfeinern` (Faltenpunkt (6P+o₁+o₂)/8, Faltenkante = Mittelpunkt) und `grenzMaske` ((4P+o₁+o₂)/6). Die Kurve hängt nur von diesen Punkten ab.
- **Anpassung.** Minimiere Σ_j |C(s_j) − L(t_j)|² + λ·Σ|Δ²P|², mit 16 Abtastpunkten je Spanne, unter den Bedingungen:
  - C(0) = Anfang (der markierte Knoten);
  - P_m = c;
  - C läuft durch jeden Bézier-Eckknoten.
  
  Start mit einer krümmungsgewichteten Parametrisierung, dann 2–3 Newton-Korrekturen der Fußpunkte. Jedes System ist winzig (m+1 Unbekannte je Segment).
- **Prüfung.** Beidseitiger Hausdorff-Abstand an 64 Abtastpunkten je Spanne: Seite (x,y), Front (z,y), Top (x,z) und 3D.
  - Tor ≤ 1 px, Ziel ≤ 0,3 px.
  - Über 1 px: m += 2; das ist ein Auslöser für einen Topologie-Neubau.

### 3.2 Haut formtreu (`einsatz/loesen.ts`)

- **Unbekannte.** Innere Hautpunkte der rechten Hälfte (Reihen 1..J−1, Speichen 0..2m; z auf den Mittellinienspeichen eliminiert), ≈ 60–150 Punkte.
- **Fest.** Die Faltenschleife, der Rand von M, C, alles außerhalb (alles in den Lagen von A0¹).
- **Abtastpunkte.** Alle feinen Punkte von A in M∪C, rechte Hälfte (≈ 1500–4000).
- **Ziele.**
  - In M: Jeder Käfigpunkt bekommt seine Kartenkoordinaten; diese werden mit der Matrix von A unterteilt (positive Gewichte halten sie im Quadrat), A0 wird an diesen Koordinaten über chart⁻¹ nachgeschlagen, dann kommen Lippenwulst (3.3) und Kieferkorrektur δ (4.2) dazu.
  - In C: der eigene feine Punkt von A0 an derselben Blockposition.
- **Das Residuum ist anisotrop.** Normalanteil mit Gewicht 1, Tangentialanteil mit Gewicht 0,05: Die Form wird erzwungen, die Parametrisierung nur regularisiert. Das gleicht die Naht zwischen kartenparametrisierten Zielen in M und A0-parametrisierten Zielen in C aus.
- **Glätteterm.** λ ≈ 1e-3·Σ|L(x − x_init)|² (Umbrella-Laplace, Startwert = Gitterpunkte).
- **Linear in A0.** Ziele t = T·S_A0·A0 (T = baryzentrisches Nachschlagen, 3 Nicht-Null-Einträge je Zeile), also x = K·[A0; crease; δ] mit K konstant je Karte.
  - Normalmatrix ≤ ~450² (xyz gekoppelt), LU einmal je (Spec, Karte).
- **Warum die Haut die Tasche nicht beachtet.** Neben einer unendlich scharfen Falte lesen Flächen-, Kanten- und Eckpunkte auf der Hautseite nie Taschenpunkte. Haut und Tasche werden deshalb unabhängig gelöst.

### 3.3 Lippenwulst und Rille bei geschlossenem Maul

- Die Lippenkante bleibt exakt auf der Linie.
- Hautabtastpunkte im Lippenband (3D-Abstand d zur Falte ≤ w_b ≈ 0,03·Kopfhöhe am Maul) bekommen einen Zielversatz h_r·sin²(πd/w_b)·n, mit Scheitel h_r ≈ 0,4 px.
  - Jede geschlossene Lippe trifft die Kante dann in einem V von etwa 4–6°: keine tangentiale Berührung.
  - Die einzige verbleibende Berührung sind die zusammenfallenden Faltenkanten. Sie bekommen im Durchdringungstest eine eigene erlaubte Klasse, „geschlossene Lippenkante“.
- Taschenreihe p = 1 (Innenlippe) wird um die halbe Linsendicke `linse` versetzt (Oberlippe nach oben, Unterlippe nach unten).
- Das sind feste Gestaltungskonstanten, die im Look-Beweis geprüft werden. Keine Regler.

### 3.4 Tasche und Rachen (`einsatz/tasche.ts`)

- Regelbasierte Ziele plus Glättung; linear, konstante Matrix je Spec.
  - Taschenreihe p: Lippenpunkt + d_p · Richtung zu einem Rachenpunkt im Kopf.
  - Tiefe ≤ 0,6 × örtliche Kopfdicke (Strahltest) und nie hinter der Gelenkebene.
  - Linsenversatz oben/unten ±`linse`.
  - Rachengitter: bilineare Füllung, dann Laplace-Glättung mit fester Lippenschleife und fester letzter Taschenreihe.
- Die Geometrie ist verdeckt. Prüfung: keine Durchdringung zwischen Tasche und Haut in der geschlossenen Ruhepose.

### 3.5 Messbare Kriterien für das Lösen

Alle px-Werte bei 461 px je Kachel.

| Kriterium | Schwelle |
|---|---|
| Außerhalb M∪C gegen A0 | ≤ 1e-12 in Weltkoordinaten (bitgleich mit Blockkopie) |
| D_pos: Abstand A ↔ A0 in M∪C, ohne Lippenband, Tasche und Korrekturzonen | ≤ 0,25 px |
| D_norm: Normalabweichung, gleicher Bereich | max ≤ 1,0°, p99 ≤ 0,5° |
| Falten (`faltenMass`, Haut außerhalb des Lippenbands) | ≤ A0 im gleichen Bereich + 2°; Anzahl > 20° ≤ Anzahl bei A0 |
| Δ je Blatt (`blattAbweichungen`), ohne das verdeckte Fenster und den Umweg | A − A0 ≤ 0,5 px |
| Lippenkurve gegen Linie (3.1) | ≤ 1 px in jeder Ansicht; Mundwinkel und Anfang ≤ 0,1 px |

**Was exakt ist und was genähert.** Exakt: das Äußere, Anfangs- und Mundwinkelpunkt, Symmetrie, Geschlossenheit. Innerhalb der Schwellen: der Lippen-B-Spline gegen die Bézier-Kurve und die Haut in M. Catmull-Clark-Pole haben eine eingebaute Krümmungseigenheit; erwartet sind etwa 0,05 px und 0,3–0,5° auf Stufe 1, geprüft im Beweis.

---

## 4. Kiefer

### 4.1 Eine Topologie für „gleich“ und „getrennt“

- Oberseite: Speichen k < m mit Reihen ≥ 1, die U-Kette und die obere Tasche. Unterseite: k > m. Die Mundwinkelspeiche ist gemeinsam.
- Gleich gegen getrennt, Überbiss gegen Unterbiss: keine Topologieänderung. Auch der Rollentausch (welcher Kiefer länger ist) ist keine Topologieänderung.

### 4.2 Anordnung und Formkorrektur je Seite (`einsatz/kiefer.ts`)

- **(a) 2D-Verzerrung ω± in der Karte.** Sie verschiebt die Lippenreihe der Seite von der eingefrorenen Hülle auf proj(eigene Linie).
  - Diskret harmonisch auf dem (k, r)-Gitter dieser Seite. Dirichlet-Bedingungen: Lippenreihe = Verschiebung; Rand = 0; Mundwinkelspeiche = 0; die Mittellinie bewegt sich nur entlang ihrer selbst.
  - Dank der Hüllenregel ist das immer eine Streckung. Eine Faltenprüfung läuft trotzdem.
- **(b) 3D-Korrekturfeld δ±** (Vertiefung oder Wölbung) auf den Käfigpunkten dieser Seite.
  - Biharmonisch auf dem (k, r)-Gitter. Harte Bedingungen:
    - Lippenreihe: δ = line(t) − der auf A0 gehobene Lippenpunkt (= −depth·n plus ein tangentialer Rest);
    - Reihen J und J−1: δ = 0, das Feld läuft also C¹-stetig in A0 aus;
    - Mundwinkelspeiche: δ = 0.
  - Weiche Bedingungen:
    - der verdeckte Teil der eigenen schwarzen Linie dieses Kiefers auf seiner Mittellinienspeiche (Seitenansicht);
    - die untere Kurve des Kiefer-Spants, wo seine Station diese Seite kreuzt.
  - δ wird mit der Matrix von A unterteilt und zu den Zielen dieser Seite addiert.
- **Steigungsgrenze** |∇δ| ≤ 0,35. Sie bestimmt den Sicherheitsabstand des Felds (2.3); eine Verletzung löst einen Topologie-Neubau aus.
- Gleiche Kiefer: δ = 0, ω = 0.

### 4.3 Garantie der Unabhängigkeit (Karte während der Bearbeitung eingefroren)

| Bearbeitung | Ändert | Bitgleich |
|---|---|---|
| Knoten der roten Linie | U-Falte, obere Verzerrung/δ/Reihen, obere Tasche, Rachen (verdeckt) | Unterseite, untere Tasche, Mundwinkelspalte |
| Knoten der blauen Linie | spiegelbildlich zur Zeile darüber | Oberseite |
| Mundwinkel (gemeinsamer Punkt) | beide Seiten nahe dem Mundwinkel | – |
| Anfang des längeren Kiefers (Spaltende) | A0 im Bereich der Brücke (4.4), das Maul folgt | – |
| Anfang des kürzeren Kiefers (verdeckt) | nur das Korrekturziel auf der Mittellinie dieser Seite | A0, die andere Seite |
| Neue Karte (nur wenn die Qualität es verlangt) | beide Seiten gleiten auf der Fläche | Grenzfläche der anderen Seite ≤ 0,1 px |

Lippenwulst und δ jeder Seite hängen nur von der Linie dieser Seite ab. Der Test M9 in 9.2 misst das.

### 4.4 Spalt in der Seitenansicht → A0 (`schlitz.ts`: `seiteMitBruecke` ersetzt `seiteMitSehne` und `seiteFuerLeiter`)

- Der Seitenumriss von A0 über den Spalt ist eine **G1-stetige kubische Brücke**:
  - Sie beginnt am längeren Anfang, mit der Umrisstangente des längeren Kiefers.
  - Sie endet an der schwarzen Linie des kürzeren Kiefers: am kürzeren Anfang selbst, wenn dieser sichtbar ist; sonst am ersten Punkt nach dem Rückknick, an dem eine schleifenfreie kubische Hermite-Kurve mit beschränkter Krümmung existiert.
  - Die markierten Knoten sind nie Ecken.
- Direkt nachdem „getrennt“ die Linie geteilt hat, gibt die Brücke das ursprüngliche Segment wieder (gleiche Endtangenten); das Teilen ist also stetig.
- Sie hängt nur von Profildaten ab. Die Projektion der roten Linie zu nehmen, ergäbe eine zirkuläre Abhängigkeit, weil Rot auf A0 verankert ist.
- Die Brücke liegt in der Korrekturzone des kürzeren Kiefers, ihre genaue Form ist also unsichtbar. Der verdeckte Teil der schwarzen Linie des kürzeren Kiefers wird ein δ-Ziel (4.2 b).

### 4.5 Umweg (schwarze Linie als Umweg über einen breiteren Kiefer)

- Wo δ nach außen zeigt (der Kiefer ist breiter als A0), werden die Flächen dieser Seite markiert. Sie ersetzen `kieferBreiter`/`kieferFlaechen`.
- Markierte Flächen werden aus Δ ausgenommen, und ihre Silhouette wird als Teil der schwarzen Linie gezeichnet, wie Florian es beschrieben hat.

### 4.6 Kiefer-Spanten (`Spant.unten`)

- Weiter nötig: Sie sind die einzige Steuerung des Querschnitts eines Kiefers unterhalb seiner Lippe.
- **v1:** A0 nimmt die Hauptkurve `profil` des Spants für den ganzen Ring, A0 bleibt also unabhängig vom Maul. Die untere Kurve ist ein δ-Ziel auf der Unterseite, und die Feldwahl schließt den unteren Ringteil der Station ein.
- Der in Front/Top gezeigte Teilungspunkt ist die Kreuzung des Schlitzes an dieser Station.
- **v2, nur wenn nötig:** eine Einhüllende in A0 (die den Spalt im Spant schließt wie im Seitenprofil).

---

## 5. Öffnen (der Posen-Entwurf ist getrennt; die Topologie muss ihn tragen)

- **Gewichte ersetzen die Trennung nach dem Schleifenindex (jL)** (behebt Befund 10):
  - w(v) = (1 − β(u_v))·w_side(v) + β(u_v)·w_geo(v);
  - w_side = 0 auf der Oberseite und 1 auf der Unterseite; über die Mundwinkelzone ein Reißverschluss (smoothstep über ≥ 3 Speichen je Seite, w(c) = ½);
  - β = smoothstep(u / 0,6);
  - Taschenpunkte übernehmen w_side ihres Lippenpunkts; Rachen = smoothstep der Koordinate entlang der Gegendiagonale;
  - w_geo = das vorhandene `gelenkGewicht` (Winkel und Reichweite um das Gelenk), beschränkt auf den Bereich unterhalb der Richtung Gelenk–Schlitz;
  - danach 2 Laplace-Glättungsdurchgänge im Feld mit festen Lippenreihen. Schädelgewichte funktionieren genauso.
- **Faltenprüfung je Fläche:** |∇w|·r_hinge·α_max ≤ 0,5 beim größten Posenwinkel. Scheitert sie, Reißverschluss oder β verbreitern.
- **Kapazität.** m ≥ 6 je Hälfte ergibt einen runden Öffnungsring; K ≥ 5 und J ≥ 4 für die Dehnung (Langhals, Robbenbrust). Eine Pose, die mehr Reihen braucht, löst einen gewöhnlichen Topologie-Neubau mit Umrechnung der Deltas aus (6.3).
- **Haps** wird ein prozeduraler Blendshape im Ruheraum auf dem geordneten Gitter: Der Mundwinkel wandert nach hinten und außen; die Lippen wölben sich mit sin(π·s) auseinander, die Unterlippe voll, die Oberlippe zu 60 %; die Haut folgt mit β.
- **Durchdringungen.** Ein Paar gilt als sichtbar, wenn eine der beiden Flächen in ID-Puffern aus 14 Richtungen bei 512² erscheint (CPU-Rasterer). Tor: 0 sichtbare Paare bei 25/50/75/100 %; verdeckte Paare werden gemeldet. **Morph:** In einem Durchlauf mit 40 Schritten ist die größte Bewegung je Schritt ≤ 3× der mittlere Schritt, und keine feine Fläche klappt um.

---

## 6. Einfrieren und Topologie-Neubau

1. **Was eingefroren ist.** `kaefig.maulEinsatz` = {`version`, `feld` (verfeinerte Flächen-IDs), `rimStart`, m, J, K, Variante, Faltenspeichen} steht im Dokument, wie die eingefrorenen Stationen. Die Karte lebt im Worker-Stand; sie lässt sich neu berechnen und wird nicht gespeichert.
2. **Neue Karte** (gleiche Topologie, nur tangentiales Gleiten), am Gestenende, wenn:
   - eine Verzerrung um mehr als 30 % des ersten Reihenabstands staucht;
   - ein Viereck umklappt oder einen kleinsten Winkel < 20° hat;
   - die konforme Verzerrung der Karte nach Änderungen an A0 den Wert 2 übersteigt.
3. **Topologie-Neubau** (nie während eines Zugs), am Gestenende, wenn eine dieser Bedingungen gilt:
   - **Hülle außerhalb von M:** Die Hülle verlässt das sichere Innere von M (< 1 Reihe vom Rand, oder die Mundwinkelzone passt nicht mehr).
   - **Lippen-Fit:** Die Lippenanpassung überschreitet mit dem aktuellen m 1 px.
   - **Steigungsgrenze:** Die Steigungsgrenze von δ ist verletzt.
   - **Konflikt mit einer Falte oder reservierten Zone.**
   - **„Neu ableiten“:** Die Anordnung von A0 auf Stufe 0 hat sich geändert.
   - **Posen-Kapazität:** Der Posen-Entwurf verlangt mehr Reihen.
   - **Hysterese:** Das neue M bekommt in Änderungsrichtung einen zusätzlichen Ring Reserve, und ein Auslöser muss am Gestenende noch gelten. Tor der Zugmatrix: ≤ 1 Topologie-Neubau je Hin-und-her-Zug mit 30 Schritten.
4. **Pose-Deltas über einen Topologie-Neubau mitnehmen** (`einsatz/anker.ts`, ersetzt `posenAnker.ts`):
   - Deltas liegen im Ruheraum.
   - Verfeinerte Punkte, die außerhalb von M bleiben, behalten ihren Index.
   - Einsatzpunkte tragen einen kanonischen geometrischen Anker {Rolle ∈ Haut/Lippe/Tasche/Rachen/Mundwinkel, Kiefer, s = Bogenlängenanteil entlang der Linie dieses Kiefers, ρ = Abstand von der Lippe, normiert auf die Maullänge (Haut) bzw. Tiefenanteil (Tasche), oder normiertes (a, b) für den Rachen}. Er ist unabhängig von der Karte, also stabil.
   - Neue Punkte werden je Rolle bilinear aus dem alten geordneten Gitter interpoliert. Verfeinerte Punkte, die in M hinein- oder aus M herauswandern, werden über ihre Kartenkoordinaten umgerechnet.
   - Anders als heute bei `posenUmhaengen` rastet nichts ein, und nichts wird verworfen.

---

## 7. Tempo (Rex/Tiger, Worker)

| Pfad | Kosten | Anmerkungen |
|---|---|---|
| Linie ziehen (schnell) | ~10–20 ms | Anker → Faltenanpassung → Verzerrungen (Rückwärtseinsetzen) → Ziele T·… → Rückwärtseinsetzen für Haut/δ/Tasche (< 1 ms) → S_A·x (2–3 ms) → Pose und Dreiecke |
| Körper ziehen mit Maul (schnell) | ~15 ms | A0 über `ziehen` (~3 ms) + R·A0 + lineare Aktualisierung des Einsatzes (heute unmöglich: das Maul sperrt Züge) |
| Pinsel mit Maul | ms | D_form → A0 → lineare Aktualisierung, kein Neubau |
| Gestenende, Linienänderung | ≤ 60 ms | + wahlweise neue Karte ≈ 30 ms (4 CG-Lösungen auf ≈ 3000 Punkten) |
| Gestenende, Körperänderung | ≤ 150 ms | volle Ableitung von A0 mit eingefrorenen Stationen (`unterteilung` nach Topologie- und Faltensignatur zwischenspeichern, spart 30–60 ms) + lineare Aktualisierung |
| Topologie-Neubau | ≤ 250 ms | Feld 2 + Karte 30 + Zusammensetzen 5 + `unterteilung(A, L−1)` 30–50 + LU (≤ 450²) 5 ms; kann asynchron laufen, während die verzerrte alte Topologie sichtbar bleibt |
| Zähne automatisch einpassen | 50–95 ms | asynchron, nachdem das Netz gezeigt ist, zwischengespeichert nach einem Hash von A0 + Linien |

- Dicht gegen dünn besetzt: Jedes Maulsystem hat ≤ ~500 Unbekannte, also dichte LU. Dünn besetzt braucht man nur für die Kartenlösungen (CG).
- Zwischenspeicher in `WesenStand.einsatz`: {Spec-Signatur, Topologie von A, `unterteilung`, Abtastmengen, LU-Zerlegungen, Karte, T, Matrizen für Verzerrung/δ/Tasche}, mit dem Schlüssel (Topologie- und Faltensignatur von A0, Spec).

---

## 8. Schnittstellen und Einbau

### 8.1 Neue Typen (`einsatz/einsatz.ts`)

- `maulEinsatzBauen(A0, linien, spec?) → {A: Ableitung-like, einsatz: MaulEinsatz, spec}`
- `maulEinsatzAktualisieren(stand, A0, linien)`
- `einsatzPose(A, einsatz, oeffnung, deltas, rig)`

`MaulEinsatz` enthält:
- `lippeOben[0..m]`, `lippeUnten[0..m]` (Index m = c), dazu Kopien für die linke Seite;
- `haut[r][k]`, `tasche.{oben,unten}[p][t]`, `tasche.ecke[p]`, `rachen[]`;
- `spiegel`;
- `rolle` (behält die alten Codes 0 Haut, 1/2 Lippe, 3/4 Tasche, 5 Rachen, 6 Mundwinkelspalte; neu 255 tot);
- `anker` (s, ρ);
- `quelle` (aus dem Nachschlagen in der Karte auf dem feinen Netz von A0);
- `tiefe`, `lippenAbstand`, `untenSeite`, `ausserhalb` (Umweg);
- `rig` {mundwinkel, anfang, gewichtUnten/Oben, basis für `kieferGewichteSetzen`};
- `laenge`, `vorn`, `kopfHoehe`, `zug`.

### 8.2 Was jeden Nutzer von `MaulAbleitung` ersetzt

| Nutzer | Ersatz |
|---|---|
| `zaehne.ts` (Zahnfleischlinie = erste Taschenreihe, Rand über `feinKette`, `lage.m`, `versatz`) | Zahnfleischlinie = Taschenreihe p=2; Randketten = `lippeOben/Unten`; m = spec.m; „Zähne außen“ aus σ vorn |
| `posenAnker.ts`, `KaefigDelta.anker` | `einsatz/anker.ts` (6.4) |
| `hapsAnwenden`, `maulPose` | `einsatzPose` mit Gewichten aus Abschnitt 5 |
| `maulAbweichung` (nur an Käfigspalten) | dichte Grenzkurve der Falte gegen die Linie, je Ansicht → `WesenInfo.maul` |
| `deskriptoren.ts` (art, tiefe, lippenAbstand, untenSeite, quelle) | aus `rolle`/`anker`; Werte der Wirbelsäule über R·(Werte der Stufe 0) und Nachschlagen in der Karte |
| `augenHoehle` (meidet die Lippe über `art`) | meidet M∪C; 2-Ring auf Stufe 1 |
| Käfiglinien in wesen.ts, Bereiche im Prüfstand | `rolle` |
| Reifen in Maulringen (`lage.jL`, `vRing`) | Reifen auf A0 (`basis`); Teilung am Kiefer-Spant = Kreuzung des Schlitzes an der Station |
| Rig-Griffe (`pfad[0]`, `unten[0]`, Mundwinkel) | `lippeOben[0]`, `lippeUnten[0]`, c |
| `gewichtFarben` | neue Gewichte |
| `kieferBreiter` → `kieferFlaechen` → Umweg | Markierungen `ausserhalb` (4.5) |
| `kopfHoehe` (Lippenband) | Dicke von A0 im Schwerpunkt des Schlitzes |
| `treffer.vorlage` / Grundpinsel | `treffer.basis` = Käfig von A0 auf Stufe 0 (Grundpinsel); `treffer.kaefig` = A (Pose-Pinsel) |

### 8.3 Dokumentänderungen und Migration

1. **Linienknoten verankert.** `Linie3`-Knoten in `dok.maul.zu.oben/unten` bekommen einen optionalen `anker {f (Fläche von A0 auf Stufe 0), u, v, tiefe (mit Vorzeichen, entlang −n)}`. Griffe bleiben in v1 dreidimensional. Auswertung: Bézier durch die verankerten Knoten → auf A0 projizieren → depth(t)·n abziehen. Jede Ansicht bearbeitet ihre zwei Koordinaten; die dritte wird relativ zur Fläche gehalten.
   - Alte Dokumente: Der Editor berechnet die Anker nach dem ersten Bau und schreibt sie ohne Undo-Schritt, wie die Stationen.
   - `punktAufKern` muss gegen **A0** verankern, nicht gegen das gebaute Netz. Heute liest es das Netz, das die Linie selbst geformt hat: eine Rückkopplung.
2. **`kaefig.maulEinsatz`** wie in Abschnitt 6.
3. **`KaefigDelta.anker` v2** {rolle, kiefer, s, rho}. v1 {rolle, reihe, u} wird gelesen und umgewandelt.
4. **`GefroreneStationen.maul`** wird weiter gelesen, dann ignoriert und beim Speichern weggelassen. Stationen, die eingefroren wurden, während es ein Maul gab, bleiben, wie sie sind (keine überraschende Änderung). „Neu ableiten“ bietet an, sie zu bereinigen.
5. **`ausstattung.maulLinie` (f,v)** für Prüfwesen wird in 3D-Linien umgewandelt (`maulLiniePunkte`), die Prüfwesen werden neu angelegt, und der Typ wird gelöscht. Nur für den Bau genutzte `maulOptionen` (reihen, tiefe, platte, beutel, lippenSchaerfe, …) werden überflüssig; Pose-Optionen bleiben.
6. Zuerst das Schema, dann ein Test auf verlustfreies Schreiben und Lesen, dann die Migration in `dokumentLesen` (zod verwirft unbekannte Felder).

### 8.4 Gelöschter Code (nachdem der neue Weg Schritt 13 besteht)

- **`maul.ts`:** maulLage, maulKaefig, ableitenMitMaul, versatzKetteLoesen, taschenNachloesen, kieferVersatz, zugWerkzeuge, maulLinieAus/UntenAusPunkten, anteilUndHoehe, maulAnteil, plattenTreppe/gitterLage/randAB, kieferZ, schlitzNah, LIPPE_V_MIN/MAX, anfangKappeMin, konturAnfang, frontFlach, BREITE_MIT_MAUL, maulLinieVorlage, kieferFlaechen, maulAbweichung, maulPose, hapsAnwenden.
  - Bleiben und wandern nach `kern/rig.ts`: gelenkGewicht, kieferGelenk, schaedelGelenk, MAUL_POSE_OPTIONEN.
- **`ableiten.ts`:** der Zweig `lippe` von `umparametrisieren`; `kieferQuerschnitt`; der Parameter `SchlitzLage` von `zieleBerechnen`/`kastenKappe`; `kappeMin` in `stationenWaehlen`/`stationenNachfuehren`; `MaulBereich`/`maulOk`; die Maulfelder von `Rohbau`; `breitenSchleife(…, maulBau)`; die Maulsperre in `ziehen`.
- **Ganze Module:** `schlitz.ts` (`seiteMitSehne`, `seiteFuerLeiter`, `umrissDichtOffen`), `maulDokument.ts`, `posenAnker.ts`, `lippeHaut.ts`, `kieferSchnitt` (die Anzeigehelfer bleiben).
- **Maul-Tests:** die Maulteile von beweis2, maul.diag, maullinie, maullage-gefroren, naht (offene Naht). Sie werden durch die Einsatz-Tests ersetzt.
- **Editor:** der Weg über `maulLinieAusDokument`, `punktAufKern`, die Sonderfälle Wand/Coons.

---

## 9. Umsetzungsreihenfolge (jeder Schritt: eigenständiges Kernmodul + Tests + Kontaktbögen, vor jedem Einbau)

### 9.1 Schritte

- **Schritt 0 – Rücknahme und Ausgangslage.**
  - 7baee2d, 50c8976, c10f695 zurücknehmen.
  - `kern/pruefreihe/{zufall,koerper,linien,metriken,sichtbarkeit}.ts`, den Läufer `apps/editor/scripts/pruefen/zufallsreihe.ts` (vite-node) und `zufallsreihe-bilder.mjs` bauen.
  - Das **heutige** Maul mit eingefrorenen Stationen (`mitStationenVon`) als Ausgangslage laufen lassen.
  - *Tor:* Florians gemeldete Fälle lassen sich in Zahlen nachstellen (Top 29–57 px, Kinn 27,5, Schnabel 29,1, J „rot 19,1“, Unterbiss 201, Schädel +18 → 44–78 Paare); Bericht zur Ausgangslage und Kontaktbögen der schlechtesten Fälle sind committet.
- **Schritt 1 – `einsatz/flaeche.ts`:** Anker, Auswertung von A0, Projektion, Ausschnitt des feinen Felds, feiner Kantenpfad, Schnitt. *Tor:* Hin- und Rückweg ≤ 1e-9; das aufgeschnittene Netz ist eine Scheibe.
- **Schritt 2 – `einsatz/verfeinern.ts`:** R, Indextabellen, Übertragung der Falten. *Tor:* verfeinert auf Stufe L−1 = A0 auf Stufe L bis ≤ 1e-12, Falten eingeschlossen.
- **Schritt 3 – `einsatz/feld.ts`.** *Tor:* Scheibe, symmetrisch, Polzahl wie vorhergesagt, Determinismus; Feld-Bögen für 8 Körper × 6 Linienformen (mit Spitze, Kinn, Hals, Kasten).
- **Schritt 4 – `loeser/cg.ts` und `einsatz/karte.ts`.** *Tor:* 0 umgeklappte Kartendreiecke in der ganzen Reihe; Schwellen der Gitterqualität; Gitter-Bögen.
- **Schritt 5 – `einsatz/topologie.ts`.** *Tor:* `pruefeKaefig` in Ordnung, Spiegel exakt, außen gleich (Test des Kragen-Lemmas), Valenz-Histogramm wie vorhergesagt.
- **Schritt 6 – `einsatz/lippe.ts`.** *Tor:* J/S/senkrecht/Haken/W-Mundwinkel ≤ 1 px überall, p95 ≤ 0,3 px.
- **Schritt 7 – `einsatz/loesen.ts`, nur gleiche Kiefer.** *Tor:* Schwellen für D_pos, D_norm, Falten und Δ; Bögen A gegen A0 (Zebra, Cel, Wärmebild der Abweichung). **Florians Look-Urteil 1** (Ruhe, zu).
- **Schritt 8 – `einsatz/tasche.ts`.** *Tor:* keine Durchdringung Tasche/Haut bei geschlossenem Maul; Tiefe im Kopf.
- **Schritt 9 – `einsatz/kiefer.ts` und `seiteMitBruecke`.** *Tor:* Lippen ≤ 1 px; Unabhängigkeit (M9); Steigungsgrenze; Bögen für Über-/Unterbiss (Seite, Front, von unten). **Look-Urteil 2.**
- **Schritt 10 – `einsatz/einsatz.ts`** (Bau plus schnelle Aktualisierung). *Tor:* ganze Reihe gegen die Ausgangslage, jede Klasse schlägt die Ausgangslage und hält die absoluten Schwellen; Zeiten. 10b: Variante seitliches Maul.
- **Schritt 11 – `einsatz/gewichte.ts`, einfache Knochenpose und Haps.** *Tor:* 0 sichtbare Paare bei 25/50/75/100 %, Morph-Maß. **Look-Urteil 3** (offen).
- **Schritt 12 – Dokument und Editor.** Schema und Migration, Bearbeiten verankerter Linien, `treffer.basis`, Worker-Zwischenspeicher und schnelle Pfade. *Tor:* E2E (zeichnen, Anfang/Mundwinkel/Knoten ziehen, Körper live ziehen mit Maul, Pinsel mit Maul, öffnen/schließen) und die Zeitbudgets.
- **Schritt 13 – Nutzer und Aufräumen.** Zähne, Deskriptoren, Augen, Reifen, Anzeige des Kiefer-Spants, Umweg, Haps, Tigerstern; den alten Code löschen.
- **Schritt 14 – Abnahme.** Ganze Reihe, Florians Fälle, Bögen neben den Referenzbögen (rex_mouth_detail, different big mouths, dogs_mouth). Meldungen lauten „gebaut, gemessen an …, Abnahme offen“.

### 9.2 Zufallsreihe (mit festem Startwert)

- **Generator.** Fester Startwert (mulberry32); ±5–10 % Störung innerhalb jeder Klasse.
  - Körper: Kugel, Ei, lang, hoch, flach, Kugel mit Bauch, Kasten (24 je Ring), Langhals.
  - Anfang: hoch, mittel, tief, seitlich (seitlich erst nach 10b).
  - Form: gerade, nach oben, nach unten, J, S. Länge: kurz, lang.
  - Kiefer: gleich, Überbiss, Unterbiss. Öffnung: 0, ¼, ½, 1.
  - Bearbeitungen: keine, Anfang ±10 px ziehen, Mundwinkel ±10 px ziehen, Schädel +18 px, Kinn −12 px.
- **Umfang.** Tor-Teilmenge: 200 geschichtete Fälle (≈ 1 min). Nachts: ≈ 960 Konfigurationen × 5 Bearbeitungen.
- **Maße:**
  - M1 ΔΔ je Blatt;
  - M2 D_pos;
  - M3 D_norm;
  - M4 Falten gegen A0;
  - M5 Krümmungssprünge (Verhältnis zu A0 ≤ 1,5);
  - M6 Netzqualität (keine umgeklappte Fläche; Seitenverhältnis ≤ 4; kleinster Winkel ≥ 20°; Pole wie vorhergesagt);
  - M7 Hausdorff-Abstand der Lippe je Ansicht;
  - M8 sichtbare/verdeckte Paare;
  - M9 Kieferunabhängigkeit (≤ 1e-12 bei eingefrorener Karte, ≤ 0,1 px nach neuer Karte);
  - M10 Örtlichkeit bei Körperänderungen (≤ Örtlichkeit ohne Maul + 0,5 px);
  - M11 Sprung beim Topologie-Neubau ≤ 0,5 px außerhalb des Lippenbands, kein Pendeln;
  - M12 Morph;
  - M13 Zeiten;
  - M14 geschlossen, mannigfaltig, orientiert, Spiegel exakt.
- **Schwellen.** Alle Klassen müssen M1 ≤ 0,5 px, M2 ≤ 0,25 px, M3 ≤ 1°, M4 ≤ +2°, M7 ≤ 1 px, M8 sichtbar = 0, M9, M11 und M14 bestehen. Klassenspezifisch:

| Klasse | Zusatzregel |
|---|---|
| Hoher Anfang + Bauch | M1 ist das Hauptmaß |
| J/S/senkrecht | M7 ist das Hauptmaß |
| Über-/Unterbiss geschlossen | verdeckte Paare erlaubt |
| Bearbeitungen | ≤ 1 Topologie-Neubau je Zugfolge |
| Kasten/Platte | Falten bleiben erhalten (scharfe Kanten außerhalb von M unverändert) |
| Öffnungen | M8 und M12 |

- **Kontaktbögen** je Klasse: die 12 schlechtesten Fälle, 2 Blicke, zu und offen, Zebra + Cel + Drahtgitter. Vor jeder Meldung kritisch angesehen.

---

## 10. Risiken, Abbruchregeln, Rückfälle

| Risiko | Abbruchregel (nach 3 gemessenen Anläufen, dann anhalten und Florian berichten) | Rückfall |
|---|---|---|
| Pol- oder Kragenrest im Cel-Shading sichtbar | > 5 % der Fälle mit gleichen Kiefern mit D_norm > 1,5° oder D_pos > 0,5 px | Regeln für die Pollage (flache Bereiche, vorhandene Punkte mit Valenz 3 aufnehmen); Verfeinerung auf Stufe 2 (das Lösen bleibt örtlich, Käfig 4×) |
| Karte entartet (eingerollte Haken, winzige Schlitze) | ein umgeklapptes Dreieck bei einer nicht entarteten Zeichnung (nach Tutte sollten es 0 sein) | feineres Kartennetz; transfinit + Winslow-Glättung; Warnung „Linie zu eng gekrümmt“ |
| Lippen-Fit > 1 px | > 2 % der Fälle bei m ≤ m_max | Eckpunkte an Krümmungsspitzen; größeres m_max |
| Kiefer nicht unabhängig | jedes Versagen von M9 | keiner – das ist ein Konstruktionsfehler und muss behoben werden |
| Durchdringungen beim Öffnen | > 5 % sichtbare Paare bei 100 % | breiterer Reißverschluss/β, Grenze der Taschentiefe; Rig-Vorlagen je Maulart; Übergabe an den Posen-Entwurf |
| Feldwahl unstet | > 3 % der Fälle mit > 1 Topologie-Neubau je Bearbeitungsfolge oder M3-Fehler durch die Pollage | **Rückfall des Plans „Maul-Topologie als eigene Vorlage je Maulart“:** feste Feld-Specs je Maulart und Körpervorlage. Karte, Lösen, Kiefer und Pose bleiben gleich; dieser Rückfall ist also billig. |
| Tempo | > 250 ms am Gestenende | Zwischenspeichern, asynchroner Topologie-Neubau, CG mit Warmstart |
| Bruch beim Einbau | – | Kern-Schalter `maulBau: 'alt' \| 'einsatz'` bis Schritt 13; der alte Code bleibt bis dahin |
| Maul und Augenhöhlen konkurrieren um Platz (Rex) | – | reservierte Zonen, Warnung „Auge zu nah am Maul“ |

---

## 11. Fragen an Florian (vor Schritt 7 nötig)

1. **Lippenkante:** pixelscharfe Falte (Standard, passt zum Look-Vertrag) oder leicht gerundet? Das entscheidet die Schärfe des Mundwinkels und den Lippenwulst.
2. **Topologie:** konzentrische Schleifen mit 4 Polen an den Feldecken (Blender-Konvention) – ist das als „optimal“ annehmbar?
3. **Linien folgen der Fläche**, wenn der Kopf umgeformt wird (wie in Blender, das Maul streckt sich mit der Schnauze) – bestätigen?
4. **Kiefer-Spant v1** wirkt nur im Maulbereich – reicht das vorerst?

---

### Wichtige Dateien für die Umsetzung
- /Users/bsw/Projekte/playground/early-earle/packages/shape/src/kern/einsatz/ (neu: `einsatz.ts`, `feld.ts`, `karte.ts`, `topologie.ts`, `lippe.ts`, `loesen.ts`, `kiefer.ts`, `tasche.ts`, `gewichte.ts`, `anker.ts`, `flaeche.ts`, `verfeinern.ts`; dazu `packages/shape/src/loeser/cg.ts`)
- /Users/bsw/Projekte/playground/early-earle/packages/shape/src/kern/wesen.ts (Kette A0 → verfeinern → Einsatz → Pose; Worker-Zwischenspeicher; Felder von `WesenNetz`)
- /Users/bsw/Projekte/playground/early-earle/packages/shape/src/kern/ableiten.ts und /Users/bsw/Projekte/playground/early-earle/packages/shape/src/kern/schlitz.ts (alle Maulzweige entfernen; `seiteMitBruecke`)
- /Users/bsw/Projekte/playground/early-earle/packages/shape/src/dokument.ts (verankerte Linien, `kaefig.maulEinsatz`, Anker v2, Migration)
- /Users/bsw/Projekte/playground/early-earle/packages/shape/src/kern/pruefstand.ts sowie neu /Users/bsw/Projekte/playground/early-earle/packages/shape/src/kern/pruefreihe/ und /Users/bsw/Projekte/playground/early-earle/apps/editor/scripts/pruefen/zufallsreihe.ts (Ausgangslage und Tore)

Wiederverwendeter Referenzcode: `subdivision/catmullClark.ts` (`verfeinern`, `grenzMaske`, `unterteilung`), `kern/augenHoehle.ts` (Flächenersatz plus Abbildung über die Blockreihenfolge), `kern/reifen.ts` (`feinKette`), `kern/atlas.ts` (`kachelung`), `loeser/lu.ts`, `versuch/aufblasen.ts` (CG zum Herauslösen), `versuch/pruefen.ts` (`selbstDurchdringungen`).
