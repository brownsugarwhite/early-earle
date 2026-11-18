# Entwurf Teil H: Werkzeug-Harmonie (Anhang zum Plan, 15.10.2026)

> Ausführlicher Entwurf zum freigegebenen Plan [`docs/plans/2026-10-15-maul-einsatz-harmonie-posen.md`](2026-10-15-maul-einsatz-harmonie-posen.md). Maßgeblich ist der Plan; wo dieser Entwurf abweicht oder Florian entschieden hat, gilt der Plan.

## Abgleich mit dem Plan und Florians Entscheidungen

- **Code-Stand:** Nach der Rücknahme von 7baee2d, 50c8976 und c10f695 (Commit 42ef353) entspricht der Code c97497b; Zeilenangaben „@c97“ bzw. „c97497b“ gelten weiter.
- **D1:** Florians Entscheidung 5 „Relief, seine Punkte bleiben“ – D1 gilt wie empfohlen.
- **Maullinien:** Entscheidung 6 „Maullinien bleiben, wo gezeichnet“ – die Linie des kürzeren Kiefers bekommt keinen Hautanker, sondern behält ihre Ansichtskoordinaten und ihren Abstand nach innen (betrifft 0.5, I4, 4.6 und den Typ `Knoten3` in 5). Augen behalten den Hautanker.
- **D2–D4** gelten wie empfohlen: Details strecken mit, eine Front-Änderung wirkt als Querschnittsvorlage, „Neu ableiten“ behält das Relief.
- **Abschnitt 4.9** (Pose über maskierte Neuableitung) gilt nicht: Posen folgen Teil B (Löser im posierten Raum).
- **Dokumentstände:** Teil H = v2, Teil B = v3.

## Vorbemerkung

Alle Codeverweise folgen einer Regel. Dateien, die 7baee2d, 50c8976 oder c10f695 berühren, werden nach c97497b zitiert und mit `@c97` markiert. Jede andere Datei wird nach HEAD zitiert. Mit `git diff c97497b HEAD --stat` habe ich geprüft, dass sich diese anderen Dateien seit c97497b nicht geändert haben.

---

## 0. Zusammenfassung

**Grundursache in einem Satz.** Der Körper wird als *globale* Funktion der Zeichnungen neu gerechnet, C(P). Pinseldetails, Maul, Augen und Linien hängen an diesem Ergebnis entweder über den *Index eines Vorlagenpunkts* oder über *eingefrorene Weltkoordinaten*. Dazu schreiben mehrere Codewege abgeleiteten Zustand am Undo-Verlauf vorbei ins Dokument zurück. Jede Änderung, die C(P) irgendwo ändert (und C ist global), verschiebt deshalb alles, was daran hängt.

**Empfohlene Architektur: fünf Entscheidungen.**

1. **Der grobe Käfig des Körpers ohne Maul (A0) wird im Dokument gespeichert.** Das ist „Käfig als Wahrheit“ aus Plan 4.1. Die Zeichnungen werden Griffe daran. D_form wird nicht gespeichert, sondern abgeleitet: d = B(C(P))⁻¹·(A0 − C(P)), ausgedrückt in einer Zellbasis des sauberen Käfigs.
2. **Jede Werkzeug-Handlung ist ein Vorgang.** Eingabe: Dokument vorher, Dokument nachher, Quelle der Änderung. Der Worker berechnet einen Abschluss, und der Abschluss ist genau ein Undo-Schritt. Sonst darf nichts abgeleiteten Zustand schreiben. Damit entfallen `setzeStationen`, `kantenAnFlaeche` (projiziert auf den Platzhalter-Loft) und das nachgelagerte „Formen folgen“.
3. **Änderungen an Profilen, Spanten und Kanten sind von der Bauart her örtlich.** Maskierte Neuableitung: A0' = A0 + m ⊙ (C(P') + B'·d − A0). Die Maske m kommt aus dem geänderten Kurvenstück der *Quell*ansicht. Weil d in der Zellbasis liegt, drehen und strecken sich Details mit der Fläche.
4. **Der Pinsel verschiebt nie Knoten.** Die schwarze Linie zeigt *Zeichnung + Pinsel-Relief* (B_v = P_v ⊕ R_v). Δ misst nur Widersprüche zwischen den Zeichnungen. Neue Knoten entstehen nur von Hand oder über einen ausdrücklichen Befehl „Relief übernehmen“, der örtlich so wenige Knoten wie möglich einfügt.
5. **Das Maul ist ein Einsatz auf A0 (Teil A) und schreibt nie in A0 oder die Stationen.** Die Schlitzlinie und die „gleich“-Linie behalten die Koordinaten der Ansicht, in der sie gezeichnet wurden; ihre Tiefe wird bei jedem Abschluss neu auf die Haut projiziert. Die Linie des kürzeren Kiefers und die Augen tragen einen Hautanker und folgen der Fläche.

**Was sich für Florian im Gefühl ändert.** Eine frische Zeichnung ergibt denselben Körper wie heute. Innerhalb eines bearbeiteten Bereichs gleicht das Ergebnis der heutigen frischen Ableitung. Außerhalb bewegt sich nichts. Beim Loslassen der Maus springt nichts. Der Pinsel wird in der schwarzen Linie sichtbar, ohne dass neue Punkte erscheinen.

**Entscheidungen, die nur Florian treffen kann.**
- D1: Pinsel-Relief auf der Linie (empfohlen) oder automatisches örtliches Einfügen von Knoten.
- D2: Gepinselte Details skalieren mit dem Körper (empfohlen) oder bleiben starr.
- D3: Eine Front-Änderung ändert die Querschnittsvorlage *aller* Ringe im entsprechenden Band (heutige Bedeutung, empfohlen) oder nur die der Ringe, die die Silhouette bilden.
- D4: „Neu ableiten“ behält standardmäßig das Relief.

---

## 1. Diagnose: jeder Weg, auf dem ein Werkzeug ein anderes stört

| # | Weg | Mechanismus und Beleg | Urteil |
|---|---|---|---|
| 1 | Pinsel → schwarze Linien | Pinselversätze liegen in Weltkoordinaten und werden je Vorlagenindex gespeichert. Nur Vorlagenpunkte werden berührt (`apps/editor/src/kern/pinsel.ts:94`), Zuwächse werden in Weltkoordinaten addiert (`:136–148`), als `kaefig.deltas` gespeichert und nach jeder Ableitung in allen fünf Zweigen von `wesen.ts@c97:803–866` addiert (über `packages/shape/src/kern/pinsel.ts:39–64`). „Formen folgen“ passt **alle Segmente aller drei Profile** mit festen Knoten neu an (`folgen.ts:306–329`, `einfuegenAbPx = ∞`, `:350–364`). Eine Kugel mit 4 Knoten kann keine Beule darstellen: Der Plan hält fest, dass 23 → 1,0 px 6 eingefügte Knoten brauchte. **Mit Maul kehrt der Hook früh zurück** (`kernBau.ts@c97:201`), die schwarze Linie folgt also nie; das allein erklärt Seite Δ 25,2 / Front Δ 37,5. **Neuer Befund:** Das Neuansetzen D' = A_old − C(P') (`folgen.ts:331–343`) verteilt *Ausgleichsversätze über den ganzen Körper*, weil die globale Neuanpassung jedes Segment ein wenig ändert und C global ist. Diese Ausgleichsversätze liegen in Weltkoordinaten und sind deshalb nach der nächsten Linienänderung falsch. Das ist die „unvorhersehbare Abweichung“ nach dem Pinseln. | Bestätigt, dazu der Befund zu den Ausgleichsversätzen |
| 2 | Pinsel → Maul | `ableitenMitMaul`, danach `mitDeltas` (`wesen.ts@c97:831–835`). Der Lippenpfad besteht aus Vorlagenpunkten: Ringpunkt (i, jL) und Kappenzeile bL (`maul.ts@c97:1004–1022`). Ringe bis k werden umparametrisiert, sodass Ringpunkt jL auf der Lippe sitzt (`ableiten.ts:1217–1223`). Die Deltas treffen die Vorlagenpunkte der Oberlippe, aber nicht die Kopien der Unterlippe, deren Indizes ≥ n0 sind (`pinsel.ts:60`); die Lippen gehen also auseinander. „rot 34 px“ sind etwa 0,074 Einheiten, ein typischer Aufblasen-Betrag. Alle anderen Deltas landen auf umparametrisierten Höhen. | Bestätigt |
| 3 | Linienänderung → gepinselte Details | C ist nicht örtlich, und Details liegen je Index in Weltkoordinaten. **Quellen der Nichtörtlichkeit:** (a) eingefrorene Stationen sind Wirbelsäulenanteile der *aktuellen* Leiter (`ableiten.ts:173–195`, `673ff`), jede Längenänderung verschiebt also alle Ringe; (b) die Leiter ist ein globales DTW auf nach Bogenlänge neu abgetasteten Rücken- und Bauchlinien, und ihre Spitzen sind die Punkte mit kleinstem bzw. größtem x, die springen können (`versuch/wirbelsaeule.ts:156–186, 239–282`); (c) jedes „liegende“ Segment teilt sich einen Front-Lappen, gebaut aus yLo…yHi aller seiner Sprossen (`ableiten.ts:1108–1133, 784ff`), das erklärt den „Kugel-Scheitel 3 px“; (d) die Front-Vorlage wird über uMax/vMin/vMax normiert und mit `anteileVon(front)` abgetastet (`spanten.ts:240–267`), eine Front-Änderung an beliebiger Stelle tastet also jeden Querschnitt neu ab; (e) Ringbreite W = min(top(x), Front an der breitesten Stützstelle) (`ableiten.ts:1182–1205`); (f) Nahtziele nutzen Bogenlängenanteile (`:222–236, 362–410`). Gemessen ohne Maul: 3,0 px (Kugel) und 9,2 px (Komma) außerhalb des Bands (`2026-10-14-ruhiges-netz…md:193`). Präzisierung: (c) und (d) sind echte Formänderungen in Normalenrichtung, nicht nur tangentiales Gleiten. | Bestätigt und präzisiert |
| 4 | Linienänderung → Maul | Die gespeicherte 3D-Tiefe wird nur beim Anlegen eines Punkts genommen (`maul/maulFlaeche.ts:28–64`, `MaulEbene.tsx@c97:183, 210`, `lippeHaut.ts:1–4` „Danach gehört sie Florian“). **Neuer Befund:** Der Kern rastet den Lippenanfang bei jedem Bau neu auf die Kontur in der gezeichneten Höhe (`maul.ts@c97:325–366`), der gespeicherte erste Knoten wird aber nie aktualisiert. Nach einer Konturänderung laufen die gezeichnete rote Linie und die echte Lippe auseinander, und „rot px“ wächst. | Bestätigt, dazu neu |
| 5 | Maul setzen / verschieben / entfernen → Grundkörper und Pinsel | `ableitenMitMaul` leitet den **ganzen Körper** mit anderen Optionen ab: glättung 0,15 und breiteGewicht 4 (`maul.ts@c97:2222, 2291`); `kappeMin` schiebt Ring 0 nach hinten und erzwingt Abstände (`ableiten.ts:679–685`); `maulBereich` fügt Ringdichte hinzu. Fehlen den eingefrorenen Stationen die Maulringe, werden *alle* Stationen neu geplant (`ableiten.ts:583–584`), Index-Deltas landen also woanders. `st.gefroren.maul` wird geschrieben (`maul.ts@c97:2267`). Das Ergebnis wird ohne Undo-Schritt ins Dokument geschrieben (`kernBau.ts@c97:159–163`, `editorStore.ts@c97:217–222`) und überlebt das Entfernen des Mauls. `stationen.maul.kontur` steuert dann den nächsten Maulbau (`kern/maulDokument.ts:48`). Präzisierung: In der Bauweise Kern fügt das Maul keine Knoten mehr in die schwarze Linie ein (`maulFrei`, `editorStore.ts@c97:88`). Nur alte Marken ändern noch die Leiter (`kern/schlitz.ts:13–48, 61ff`). | Bestätigt und präzisiert |
| 6 | Spant / Reifen ↔ Pinsel | Ein neuer Spant verschiebt den nächsten freien Ring auf seine Station (`ableiten.ts:635–650`), und ein Zug am Reifen-Band verschiebt seinen Ring (`:696–707`); Index-Deltas gleiten mit dem Ring. Eine Spant-Änderung wirkt über die Hutfunktion zwischen benachbarten Stützstellen (`spanten.ts:169–184`); der äußerste Spant wirkt bis zum Körperende. Spanten sind auch von (3d) betroffen. | Bestätigt |
| 7 | Kante ↔ Linien / Pinsel | **Neuer Befund:** `kantenAnFlaeche` läuft nach jeder Formgeste (`editorStore.ts@c97:140–142`, auch `:107`). Es projiziert Kantenknoten auf den **Platzhalter-Loft S0** (`kanten/kantenFlaeche.ts:66–80` → `maulFlaeche.ts:12–20` → `flaecheS0`), nicht auf den Kern-Körper. Außerhalb der Loft-Silhouette ändern sich die Ansichtskoordinaten des Knotens (`versuch/flaechenlinie.ts:309ff`): ein versteckter Schreibvorgang. Unabhängig davon kommt die Zuordnung der Kantenschleifen zu den Falten aus den Sprossen von C (`ableiten.ts:1553–1563`) und kann nach einer Änderung in der Seite auf die Nachbarschleife springen. | Neu |
| 8 | Ecke umschalten (⌥) | Eine neue Ecke verschiebt einen Ring auf sich (`ableiten.ts:686–705`); die Details auf diesem Ring gleiten. | Bestätigt |
| 9 | Augen | Der Editor speichert einen Weltpunkt (`viewports/Steuerung3D.tsx:22–66`), und der Bau rastet ihn auf den nächsten feinen Punkt (`wesen.ts@c97:501–516`). Nach jeder Körperänderung gleitet das Auge in diskreten Sprüngen. Der Rückfall über Ring/j bewegt sich bei jeder Umverteilung der Ringe. | Neu |
| 10 | Beine | Beine nutzen eine eigene Ableitung mit einer anderen `haut`-Maske (`kern/teil.ts:303–332`), und die Deltas werden danach angewandt (`wesen.ts@c97:819–820`). Beine einschalten ändert den Grundkörper. | Neu |
| 11 | Pose ↔ Grundform | Im Fressen-Modus ohne Maul wird der Ruhekörper aus `posenProfile.fressen.seite` gebaut (`three/Szene3D.tsx@c97:141–142`). Pose-Deltas liegen je Index in Weltkoordinaten (`wesen.ts@c97:870–885`); Anker gibt es nur für Maulpunkte (`kern/posenAnker.ts`). Änderungen an der Grundform verschieben deshalb Posen. | Neu, für Teil B |
| 12 | Undo / Redo | Das Rückschreiben der Stationen geschieht außerhalb des Verlaufs. Das Ergebnis von „Formen folgen“ hängt vom Zwischenspeicher des Workers ab. Die Vorschau während der Geste (`ziehen`: ein Breitendurchgang mit dem alten Löser, `ableiten.ts:1713–1734`) weicht vom genauen Bau ab (`fertigstellen`: zwei Durchgänge, `:1668–1677`); das ergibt einen Sprung beim Loslassen. | Bestätigt |
| 13 | Speichern / Laden | Versteckte Eingaben, die nicht im Dokument stehen: der UI-Chip `useKernAnzeige.maul` (`kernBau.ts@c97:76–111`), das namensbasierte `pruefwesenBauplan(dok.name)` und `stationen.maul.kontur`. | Neu |

---

## 2. Schichtenmodell: geprüft und verbessert

**Was am geplanten Modell falsch ist** (P → C(P) → +D_form = A0 → Einsatz → A → Posen):
- „+D_form“ in Weltkoordinaten je Index ist genau der heutige Fehler.
- C ist global, also kann A0 = C(P) + D nie örtlich sein, solange C es nicht selbst ist.
- Das Modell hat keinen Platz für Zustand, der abgeleitet ist, aber erhalten bleiben muss (Stationen, Falten, Anker).

**Verbessertes Modell.**
- **Gespeicherte Wahrheit:**
  - P (Profile, Spanten, Kanten)
  - S: eingefrorene Stationen der Grundform *ohne Maul*
  - Φ: die Faltenmenge
  - X0: die Käfiglagen von A0, rechte Hälfte plus Naht, in Profileinheiten (≈ 228 Punkte bei R 24 × N 16; 342 beim Tiger mit N 24)
  - Maullinien mit ihren Ankern, dazu der Topologie-Eintrag des Einsatzes (Teil A)
  - Augenanker
  - Posendaten (Teil B)
- **Abgeleitet:**
  - der saubere Käfig C = C(P; S, Φ)
  - die Zellbasis B(C)
  - das Relieffeld d = B⁻¹·(X0 − C) (= D_form: Pinsel plus silhouettenneutrale „eingefrorene Drift“)
  - A = Einsatz(X0, Linien)
  - X(w) = Skin(A + Σ wᵢ·B_A·Dᵢ; θ(w))
- **Aktualisierungsregeln:**

| Operation | Regel |
|---|---|
| Griffänderung (Profil, Spant, Kante) | X0' = X0 + m ⊙ (C' + B'·d − X0) |
| Pinsel | X0' = X0 + ΔX |
| Maul, Augen | X0' = X0 (unverändert) |

X0 zu speichern ist algebraisch gleichwertig dazu, d zu speichern, aber robuster:
- Eine Änderung am Kern verändert nie still ein gespeichertes Wesen.
- Das Spiel braucht keine Ableitung, nur Unterteilung + Einsatz + Posen.
- Laden ist bitgleich, weil Doubles den Weg über JSON exakt überstehen.

---

## 3. Invarianten

Einheiten sind px bei 461 px je Kachel, der Vertrag aller vorhandenen Messungen.

| | Invariante | Schwelle | Gemessen wie |
|---|---|---|---|
| I1 | Kein Werkzeug vergrößert den Umrissfehler. Δ_v := dist(S_v(A), B_v), beidseitig, ohne Maulfenster und „Umweg“ | Δ_v ≤ max(1,0; Δ_v^C + 0,3), wobei Δ_v^C = dist(S_v(C(P)), P_v) der Widerspruch der Zeichnungen ist | `blattAbweichungen` mit B statt P, Raster 480 |
| I2 | Örtlichkeit | Außerhalb Ω (Träger der Maske, um 2 Ringe erweitert, also um den Träger der Unterteilung): feine Grenzpunkte **bitgleich**. Im Auslauf: Faltenmaximum höchstens +2°, Dellen ≤ 0,3 px gegen die harmonische Fortsetzung | Lage-Hash je Bereich; `faltenMass` |
| I3 | Maul-Operationen ändern A0 nie | `kaefig.lagen`, `stationen`, Φ bitgleich; Haut außerhalb des Einsatzfelds bitgleich; Augen bitgleich | Hashes |
| I4 | Linien liegen auf der Haut | Knoten der Schlitz- und der „gleich“-Linie: freie Koordinate ≤ 0,2 px neben der Haut; Abtastpunkte ≤ 0,5 px; gezeichnete Ansichtskoordinaten unverändert, außer sie werden bearbeitet. Linie des kürzeren Kiefers: Versatz des Ankers exakt erhalten. Lippen ≤ 1 px von ihren Linien nach *jeder* Operation, die nicht das Maul betrifft | maulAbweichung, Auswertung der Anker |
| I5 | Details reiten mit | Zellbasis-Koeffizienten der Punkte im Kernbereich ändern sich ≤ 1e-9. Höhenprofil einer Testbeule ändert sich ≤ 0,5 px bei Drehungen ≤ 90° und Streckung ∈ [0,5; 2] | Testbeule |
| I6 | Wiederholbarkeit | Undo / Redo / Speichern / Laden: JSON-Hash des Dokuments und Float32-Lage-Hash gleich | Hashes |
| I7 | Keine versteckten Schreibvorgänge | Die Dokumentreferenz ändert sich in 2 s Leerlauf nach einem Abschluss nicht; Stationen, Lagen und Φ ändern sich nur in Abschlüssen | Zähler der Store-Abonnements |
| I8 | Formneutrale Operationen | Knoten einfügen, Spant einfügen und „Relief übernehmen“: Lagen bitgleich; B_v bewegt sich ≤ 0,1 px (Spant einfügen mit Ringverlegung ≤ 0,3 px) | |
| I9 | Kein Sprung beim Loslassen | Letzte Vorschau gegen Abschluss ≤ 0,5 px (Flächenabstand) | |
| I10 | Glätte | `faltenMass` p99 ≤ vorher + 1°, max ≤ vorher + 2°; `saegezahn` wechsel ≤ vorher | |
| I11 | Pose hin und zurück | In eine Pose wechseln, darin bearbeiten und sie verlassen: P, X0 und Linien bitgleich (Vertrag mit Teil B) | |
| I12 | Zeiten (Worker) | Vorschau ≤ 20 ms je Bild; Abschluss ≤ 250 ms im Median; Pinselvorschau mit Einsatz ≤ 16 ms | |

---

## 4. Mechanismen

### 4.1 Vorgänge: Vorschau und Abschluss

- **Während einer Geste** berechnet der Worker-Auftrag `vorschau(start, jetzt, quelle)` ein *vorläufiges* X0 über den schnellen Pfad (`ziehen`, eingefrorene Maske, Linienaktualisierung erster Ordnung) und baut daraus das Netz.
- **Am Ende einer Geste** wartet `endeGeste` auf `uebernehmen(start, jetzt, quelle)`. Es nutzt das vorhandene Hook-Muster aus `kernBau.ts@c97:195–203`. Der Abschluss liefert einen Patch (`kaefig.lagen/stationen/falten`, neu projiziertes `maul`, Augenanker). Der Patch wird angewandt, dann schließt `abschliessen` genau einen Undo-Schritt.
- **Einzelaktionen** (Stift, ⌥, Entf, Pfeiltasten, Kontextmenü) werden als Mikrogesten verpackt. Abschlüsse laufen der Reihe nach durch eine Warteschlange (FIFO). Jeder Pfeiltastenschritt bleibt sein eigener Undo-Schritt, wie Florian es festgelegt hat; Undo wartet, bis die Warteschlange leer ist.
- **Gegen einen Sprung** rechnet der Abschluss die genaue Ableitung. I9 begrenzt den Unterschied; wenn nötig, bekommt `ziehen` dieselben zwei Breitendurchgänge wie `fertigstellen`.

### 4.2 Örtlichkeit von Griffänderungen

**Verglichene Möglichkeiten:**

| | M1: maskiertes Mischen | M2: Griff-Löser | M3: Hybrid (empfohlen) |
|---|---|---|---|
| Idee | X0' = X0 + m⊙(T − X0), mit T = C(P') + B'd | min Σ w‖Sᵢ X − targetᵢ‖² + λ‖L(X − X0)‖², Naht- und Breitenbedingungen, mit `ausgleichsLoeser` | C-Ziele im Kernbereich; biharmonische Fortsetzung von Δ über den Auslauf |
| Gefühl im Bereich | gleich der frischen Ableitung | ändert sich: Querschnitte kommen nicht mehr aus Front-Lappen oder Top-Breiten; gummiartiges Strecken bei großen Änderungen (Hälse) | gleich der frischen Ableitung |
| Örtlichkeit | exakt außerhalb der Maske | exakt außerhalb der Bedingungen | exakt außerhalb |
| Risiken | ein Teil der Drift von C wird in den Auslauf gemischt | Silhouettenbedingungen in Front/Top sind nichtlinear und brauchen wiederholtes Neuzuordnen; ARAP nötig für Drehungen | kleine zusätzliche Lösung |
| Kosten | O(n) | Zerlegung je Bedingungsmenge | dichte Lösung mit ≈ 100 Punkten, < 2 ms |

**Empfehlung: M3.** Zuerst M1 bauen: Es ist eine einzeilige Mischung hinter derselben Schnittstelle, und seine Messungen entscheiden, ob die Lösung im Auslauf gebraucht wird. Große Verformungen sind für keine der beiden ein Problem: Der Kernbereich umfasst das ganze geänderte Kurvenstück, und |ΔP| ist an der Grenze des Kernbereichs per Definition ≈ 0. Der Auslauf nimmt also nur die Drift von C auf, nie große Drehungen.

**Maske.** Für jeden Punkt gilt m_i = m_r(i) · μ_j(i), mit
- S(x) = 6x⁵ − 15x⁴ + 10x³
- Kernbereich K: m_r = 1
- Ringabstand 1…w: m_r = 1 − S(d/(w+1)), mit w = 3
- darüber hinaus: 0

Das geänderte Kurvenstück ist Σ = {t : |P'(t) − P(t)| > 0,05 px}, abgetastet an 64 Punkten je Segment.

| Quelle | Kernbereich K auf der Wirbelsäule | Winkelanteil μ |
|---|---|---|
| Seite (Knoten, Griff, löschen) | Ringe, deren Nahtanker (i,0) oder (i,N/2) in C oder C' höchstens h_r (= ½ des örtlichen Nahtabstands) von Σ_old ∪ Σ_new entfernt liegen. Kappenzeilen zählen als Ringe −1 und R | 1 |
| Top | Ringe, deren x-Intervall [min x(Σ) − h, max x(Σ) + h] überlappt | 1 |
| Front | Alle Ringe ohne Spanten; mit Spanten die Hutfunktion des Hauptspants | Vorlagen-Abtastpunkte j, deren Front-Parameter in Σ liegt (abgebildet über `anteileVon`), ± 2 Abtastpunkte Auslauf, gespiegelt auf N−j |
| Spant s | Träger der Hutfunktion h_s; dort m = 1, weil ΔC schon proportional zu h_s ist; darüber hinaus w = 2 | Abtastpunkte der geänderten Spant-Knoten |
| Kante | Punkte innerhalb von 2 Käfigkanten um Kanten, deren Schärfe sich geändert hat | – |
| Ringverlegung (neue Ecke, neuer oder entfernter Spant, Reifen-Band) | Ringe zwischen alter und neuer Station jedes verlegten Rings, + w; d wird zuerst umverteilt (4.3) | 1 |
| Folgeänderungen (Kopplung `abgleichen` in anderen Ansichten) | **Nur die Maske der Quelle.** Das überträgt Florians Regel „Kopplung nur am entsprechenden Punkt“ in 3D und beseitigt den Kugel-Scheitel-Effekt | |
| Formneutral (Einfügen mit dem Stift) | Erkannt (max \|P'(t') − P(t)\| < 1e-9): X0 unverändert, keine Ableitung | |

- **Adaptive Prüfung (≤ 2 Runden).** Nach der Berechnung von X0' wird die Quellansicht entlang Σ gemessen. Wo sie Δ^C + 0,3 px übersteigt, werden K um diesen Punkt 2 Ringe hinzugefügt, und es wird neu gerechnet. Das fängt eine zu kleine Maske ab.
- **M3-Lösung im Auslauf.** Unbekannte sind die Δᵢ im Auslauf. Minimiere Σ ‖(LΔ)ᵢ‖², mit L dem faltenbewussten gleichförmigen Laplace-Operator (die Logik des Glättungsterms von `ausgleichsLoeser`). Dirichlet-Bedingungen zwei Ringe tief: Δ = T − X0 im Kernbereich, Δ = 0 außerhalb.

**Gefühl.** Frische Dokumente sind unverändert (X0 = C(P)). Der einzige spürbare Unterschied: Ferne Bereiche hören auf zu „atmen“, wenn Florian woanders bearbeitet (sein Satz 3). Selbstkritik: X0 wird pfadabhängig. Nach vielen Änderungen weicht der Körper durch silhouettenneutrale eingefrorene Drift leicht von „Neu ableiten“ ab. Diesen Unterschied als Diagnosewert Δ_frisch zeigen.

### 4.3 Details transportieren: die Zellbasis

Für jeden Punkt i der rechten Hälfte oder der Naht von C, mit c(r, j) den Lagen des sauberen Käfigs:
- e_t = ½(c(r+1, j) − c(r−1, j)), an den Endringen einseitig
- e_b = ½(c(r, j+1) − c(r, j−1)), zyklisch
- n = norm(e_t × e_b), nach außen orientiert
- e_n = n·√|e_t × e_b|
- B_i = [e_t | e_b | e_n]

Innere Kappenpunkte nutzen ihre Nachbarn im Kappengitter (über `kappe()`).

- **Naht (j = 0 oder N/2, Kappe a = c/2):** Wegen der Spiegelsymmetrie liegt e_b rein in z-Richtung. β = 0 speichern, damit die Naht bei z = 0 bleibt.
- **Transport:** dᵢ = Bᵢ⁻¹·(X0ᵢ − cᵢ), dann Tᵢ = c'ᵢ + B'ᵢ·dᵢ.
- **Schutz:** Bei cond(B) > 50 oder |e_t| < 1e-4 einen Orthonormalrahmen nehmen, skaliert mit der mittleren Kantenlänge. Streckverhältnisse je Achse auf [0,25; 4] begrenzen.
- **D2:** Die Standard-Zellbasis lässt Details mit dem Körper skalieren. Die starre Alternative orthonormiert B.
- **Wann d neu angesetzt wird:** implizit bei jedem Abschluss (d immer relativ zum aktuellen C); ausdrücklich beim Umverteilen, bei „Relief übernehmen“ und bei der Migration.
- **Umverteilen** nach Stationsänderungen: für einen neuen Ring r bei f' mit f_i ≤ f' ≤ f_{i+1} gilt d'_{r,j} = (1−λ)·d_{i,j} + λ·d_{i+1,j}, mit λ = (f' − f_i)/(f_{i+1} − f_i).

### 4.4 Pinsel → schwarze Linien

**Möglichkeiten:**
- (i) Automatisches örtliches Einfügen von Knoten am Ende jedes Strichs. P trägt den sichtbaren Umriss exakt, aber Punkte erscheinen von selbst; Florian hat „willkürliche Punkte“ abgelehnt.
- (ii) **Relief.** P bleibt genau so, wie Florian es gezeichnet hat, und der Pinsel wird darüber gezeigt. Das ist wie ein Live-Effekt in Illustrator.
- (iii) Die Änderung in vorhandene Griffe aufnehmen, ohne Knoten einzufügen. Griffe bewegen sich automatisch; das ist das alte Problem „Form springt“.
- (iv) Ein 2D-Werkzeug „Umformen“ auf den Kurven, als spätere Ergänzung.

**Empfehlung:** standardmäßig (ii), dazu ein ausdrücklicher Befehl „Relief übernehmen“, der den Algorithmus von (i) ausführt, beschränkt auf das Kurvenstück mit Relief und hervorgehoben. Möglichkeit (ii) passt zu allen Aussagen Florians: „gelbe = schwarze Linie“, Knoten nur von Hand, und die schwarze Linie ist die Hauptform.

**Relief berechnen.**
- P_v wird an 64 Punkten je Segment abgetastet, Normale n_v nach außen (geschlossenes Profil: nach dem Vorzeichen der Fläche; halbes Profil: von der Achse weg).
- s_X(t) ist der vorzeichenbehaftete Abstand von P_v(t) entlang n_v zu S_v(X), der Silhouette aus `umrissAusNetz` bei Raster 480. Den nächsten Schnittpunkt innerhalb |s| ≤ 0,1 nehmen; sonst auf den nächstgelegenen Punkt zurückfallen.
- R_v(t) = s_A0(t) − s_C(t). Auf 0 setzen, wo |R| < 0,05 px, damit B_v ≡ P_v bitgenau gilt, wo kein Pinsel wirkte. Ebenfalls 0 im Maulfenster und im Umweg.
- Angezeigte Linie: B_v(t) = P_v(t) + R_v(t)·n_v(t).
- Knoten werden bei B_v(tᵢ) mit den Griffen von P gezeichnet. P selbst wird gestrichelt gezeichnet, wo |R| > 1 px.
- Während eines Zugs wird R_v am Gestenbeginn eingefroren und am selben (Segment, t) ausgewertet; das Relief reitet also mit der Kurve.
- Der Stift trifft B_v und liefert (s, t); `einfuegen` ist formneutral.
- Die Kopplung nutzt weiter die Ausdehnung von P. Beide gekoppelten Ansichten tragen dasselbe Relief und bleiben so stimmig.
- Δ bedeutet jetzt nur noch Widersprüche der Zeichnungen. Die Tafel zeigt das Relief als eigenen neutralen Wert.

**„Relief übernehmen“ (ausdrücklich; je Ansicht oder für alle drei).** Algorithmus:
1. Betroffen sind Segmente mit |R| > 0,3 px. Die äußeren Knoten des Abschnitts bleiben fest, samt ihren äußeren Griffen. Glatte äußere Knoten behalten ihre Tangentenrichtung; nur die Grifflänge ist frei.
2. Ziel T = B_v, beschränkt auf den Abschnitt, also die Silhouette der *Grenzfläche* von A0. Bei getrennten Kiefern das Maulfenster ausnehmen. Für Front und Top `halbZug` nutzen und den halben Umriss nie zyklisch behandeln.
3. Für Front: zuerst alle neuen Knoten formneutral mit `spantenPunktEinfuegen` einfügen (Front und alle Spanten am selben (s, t)). Erst dann die Front-Knoten bewegen.
4. Vorhandene innere Knoten wandern zu monotonen Fußpunkten. Tangenten: Glatte Knoten nehmen die Tangente von T (zentrale Differenz ±L/200); Ecken behalten Ecktangenten; Achsenknoten bleiben auf der Achse, mit der Tangente senkrecht dazu (`achsenRegeln`).
5. `fitSegment` je Segment. Fehler = größter Abstand der Abtastpunkte von T zur kubischen Kurve, beidseitig gemessen. Übersteigt er 0,7 px, am schlechtesten Abtastpunkt teilen (Tiefe ≤ 4, mindestens 6 Abtastpunkte je Stück).
6. Eingefügte Knoten gierig entfernen, solange der Fehler ≤ 0,7 px bleibt.
7. Abschluss. X0 ist unverändert (gespeichert), und R ≈ 0 im Abschnitt. Die neuen Knoten werden nur im UI-Zustand hervorgehoben, nie im Dokument.

Es gibt keine Rückkopplung: P wird nie automatisch aus der Silhouette abgeleitet, und X0 wird nur innerhalb maskierter Vorgänge neu berechnet.

### 4.5 Bedeutung der Pinsel

- **Ziehen und Aufblasen** wirken in Weltkoordinaten auf X0 (rechte Hälfte plus Naht, gespiegelt wie heute).
- **Glätten (⇧)** glättet das Relief d, nicht die Lagen. A0 ← C + B·smooth(d); die Grundform schrumpft also nicht mehr. Der Worker schickt `treffer.sauber` (den Käfig C) und die Zellbasen.
- **Neu: ⌥⇧ „zur Zeichnung“** treibt d gegen 0.
- **Treffer werden in die Ruhelage abgebildet** (baryzentrisch auf `netz.ruhe`, wie es `augeSetzen` schon tut).

**Mit Maul.** Gewichte werden nur auf den Käfigpunkten von A0 berechnet. Ein Treffer auf einer Einsatzfläche wird über die Anker Einsatzpunkt → A0 aus Teil A abgebildet. Bei eingefrorener Einsatz-Topologie gilt:

X_I = M_I·X0 + N_I·Λ + k, mit den Linien Λ = E_Λ·X0 + o (Anker linear ausgewertet, Rahmen am Gestenbeginn eingefroren)

also X_I = G·X0 + g, wobei G dünn besetzt ist und je Bild angewandt wird. Am Gestenende: genaue Neuprojektion plus genaue Lösung des Einsatzes.

### 4.6 Maullinien auf der Haut

| Projektionsart | Wirkung | Verwendung |
|---|---|---|
| Nächster Punkt | driftet bei großen Änderungen tangential | nur für Abtastpunkte zwischen Knoten (eine Korrektur zweiter Ordnung) |
| Entlang der Achse der besitzenden Ansicht | hält genau, was Florian in dieser Ansicht gezeichnet hat | **Knoten der Schlitz- und der „gleich“-Linie** |
| Gespeicherte Flächenkoordinaten (f, u, v) | bewegt sich mit der Haut wie ein Tattoo | **Linie des kürzeren Kiefers** (mit Versatz) und Augen |

- **Besitzende Ansicht je Knoten.** `blatt` wird von der letzten Ansicht gesetzt, die den Knoten bearbeitet hat. Ihre zwei Koordinaten sind fest. Die freie Koordinate ist der Schnittpunkt mit A0 entlang der Achse dieser Ansicht, der **dem vorigen Wert am nächsten** liegt (Stetigkeit, wie in `kantenPunktStetig`).
- **Tiefengriffe** kommen aus einem verallgemeinerten Ausgleich `lippeAnHaut` je besitzender Ansicht. Wo ein Segment gemischte Besitzer hat, bekommen die Abtastpunkte die Korrektur zum nächsten Punkt; ihr Maximum wird gemeldet.
- **Der Anfang ist ein Konturanker.** In der Seite nutzt er das vorhandene `frontPunkt` in der gespeicherten Höhe; in Front und Top liegt er auf der Achse. Der wirksame Punkt wird im Abschluss **in Knoten 0 zurückgeschrieben**; das schließt den Befund aus Zeile 4 der Diagnose.
- **Die Linie des kürzeren Kiefers nutzt einen Hautanker** {f, u, v, o}: den nächsten Punkt auf A0, gesucht *nur auf der eigenen Kieferseite* (beim Überbiss unter der Schlitzlinie), mit o = B⁻¹·(p − S). Bearbeitungen in einer Ansicht ändern p, und der Abschluss berechnet den Anker neu.
- **Wenn ein Pinsel die Haut unter eine Linie schiebt**, folgt die Tiefe, und die Ansichtskoordinaten bleiben. Verlässt die gezeichnete Lage in der Ansicht die Silhouette, bleibt die letzte Tiefe, markiert als „neben der Haut x px“ im Lippen-Chip.
- **Während einer Pinselgeste** wird die Tiefe in erster Ordnung aktualisiert (Δz = n·ΔP / n_z, linear in X0). Am Gestenende ist sie genau.

### 4.7 Augen, Beine, Kanten

- **Augen:** `augen.anker = {f, u, v}`. Auswertung durch bilineare Interpolation in der feinen Fläche der Kachel f (Nachschlagen je Fläche aus `kachelung`). Ändern sich die Stationen, wird über den nächsten Punkt neu verankert.
- **Beine:** Sie müssen demselben Einsatz-Vertrag folgen wie das Maul. Hier nicht im Umfang; als Folgeaufgabe vermerkt.
- **Kanten:** In der Bauweise Kern entfällt `kantenAnFlaeche`; Knoten behalten ihre gezeichneten Ansichtskoordinaten. Die Faltenmenge Φ wird gespeichert und nur bei Änderungen an Kanten oder Ecken neu berechnet (Überschreiben über `AbleitOptionen.falten`, damit C Φ nutzt).

### 4.8 Stationen

Stationen kommen nur aus der Grundform ohne Maul und nur durch diese Abschlüsse: Anlegen, neue oder entfernte Ecke, neuer oder entfernter Spant, Verschieben eines Reifen-Bands und „Neu ableiten“. Nie aus Maul, Beinen oder Posen. `GefroreneStationen.maul` wird entfernt; der Topologie-Eintrag aus Teil A liegt in `maul.einsatz`.

„Neu ableiten“ hat zwei Varianten:
- (a) Standard: S_new wird frisch gewählt, und X0' = C(P; S_new) + B_new·resample(d). Die Form bleibt (Umverteilen ≤ 0,3 px).
- (b) „Zurück zur Zeichnung“: X0' = C(P; S_new). Das Relief wird ausdrücklich verworfen.

### 4.9 Vertrag für Teil B (Posen)

- Posen lesen A und schreiben nie P, X0 oder Linien.
- Blendshapes Dᵢ werden in der Zellbasis von A gespeichert und folgen so Änderungen an der Grundform.
- Der Käfig einer mit Griffen bearbeiteten Pose ist X0 ⊕ masked(C(P_pose) − C(P)); das nutzt `uebernehmen` wieder.

---

## 5. Datenmodell und Ablauf

**Dokumentversion 2 (`packages/shape/src/dokument.ts`).** Das zod-Schema muss zuerst erweitert werden, weil zod unbekannte Felder verwirft.

```ts
type Hautanker = { f: number; u: number; v: number; o?: [number, number, number] };
type Knoten3 = { p: V3T; ein: V3T; aus: V3T; art: 'glatt'|'ecke';
                 blatt?: 'seite'|'front'|'top'; anker?: Hautanker };
type KaefigV2 = {
  vorlage: { ringe: number; ring: number };
  stationen: GefroreneStationen;          // ohne `maul`
  lagen: number[];                        // A0, rechte Hälfte + Naht, Profileinheiten (÷ skalierung)
  falten: { kanten: [number, number, number][]; punkte: [number, number][] };
  abgleich: { kern: number };
  posen?: Record<string, KaefigDelta[]>;  // bis Teil B
};
// AugenWerte: + anker?: Hautanker (ring/j bleibt als Rückfall für alte Daten); version: 2
```

**Migration** (`kern/harmonie/migration.ts`, aufgerufen nach `dokumentLesen` für Dokumente unter Version 2):
- Stationen: die gespeicherten Stationen ohne `.maul` nehmen.
- A0 = C(P; S) + Deltas: das, was Florian ohne Maul sehen würde.
- Alte Lippenmarken: die Sehne (`seiteMitSehne`) ins Profil backen und die Marken entfernen.
- Linien: besitzende Ansicht = `seite`, dann einmal die Neuprojektion auf die Haut laufen lassen.
- Augen: `punkt` → Anker.
- Die Ausstattung ausschreiben, damit der Bau nichts mehr über den Namen nachschlägt.
- Eine Sicherungskopie der Originaldatei behalten.

**Neue Kernmodule** (`packages/shape/src/kern/harmonie/`):
- `sauber.ts`: C(P) mit S und Φ, zwischengespeichert
- `zellbasis.ts`
- `maske.ts`: `spanne()`, `bereich(quelle, …)`
- `uebernehmen.ts`: `uebernehmen`, `vorschau`
- `umstationieren.ts`
- `relief.ts`
- `anker.ts`: Hautanker, Ansichtsanker, `linienAufHaut`
- `backen.ts`: „Relief übernehmen“, aufgebaut auf einer örtlich beschränkten Variante von `profilAnZug`
- `migration.ts`

`wesen.ts` baut dann aus `lagen` + Φ (keine Ableitung nötig), führt den Einsatz aus und liefert `relief`, `treffer.sauber`, die Zellbasen und Angaben zu `letzteUebernahme`.

**Worker und Client** (`wesen.worker.ts`, `wesenClient.ts`): die Aufträge `vorschau` und `uebernehmen` (beide nach „der neueste gewinnt“, mit garantierter Reihenfolge für Abschlüsse) und `backen` hinzufügen. `folgen` stilllegen.

**Änderungen im Editor.**
- `editorStore.ts`: `beginGeste(quelle)`, ein asynchrones `endeGeste`, Mikrogesten, eine Warteschlange für Abschlüsse; `setzeStationen` löschen; kein `kantenAnFlaeche` in der Bauweise Kern.
- `kernBau.ts`: das Rückschreiben der Stationen und den folgen-Hook entfernen; den Abschluss-Hook hinzufügen.
- `Szene3D.tsx`: während Gesten `kernVorschau` ausführen, sonst `kernBauen`.
- `View2D.tsx`: B_v zeichnen, P gestrichelt, Knoten auf B_v.
- `kern/pinsel.ts`: `lagen` schreiben; Glätten auf dem Relief.
- `MaulEbene.tsx`: `blatt` setzen, wenn ein Knoten bearbeitet wird.
- `Steuerung3D.tsx`: Augen als Anker speichern.
- Der UI-Chip für das Maul wird entweder Teil des Dokuments oder reine Anzeige.

---

## 6. Prüfung mit der Werkzeug-Matrix

**Prüfaufbau im Kern.** `apps/editor/scripts/pruefen/werkzeug-matrix.ts`, ausgeführt mit `npx vite-node` aus `packages/shape`. Er nutzt dasselbe `uebernehmen` wie der Worker.

- **Körper (mulberry32 mit festem Startwert):** Kugel, Ei, lang (Rex-Vorlage), hoch, flach, Bauch, Kasten (Spanten), Langhals, Komma (`kommaDokument`). Jeder bekommt zufällige Knotenversätze von 10–40 px, 0–3 Spanten, 0–2 Kanten und 0–4 Pinselstriche.
- **Operationen (etwa 28):**
  - Züge in Seite, Front und Top sowie Griffzüge (alle über `abgleichen`)
  - Einfügen mit dem Stift, Löschen, ⌥-Ecke
  - Spant einfügen, Reifen-Perle ziehen, Reifen-Band ziehen
  - Kante: neu, Härte ändern
  - Pinsel Ziehen, Aufblasen, Glätten
  - Maul: zeichnen (gerade / hoch / runter / J / S), Anfang ziehen, Mundwinkel ziehen, gleich↔getrennt, Überbiss / Unterbiss, entfernen
  - Augen; Beine (sobald im Umfang); Pose hin und zurück
  - Undo / Redo (Tiefe 1–5), Speichern / Laden (über JSON hin und zurück), Neu ableiten (beide Varianten), Relief übernehmen
- **Abfolgen:**
  - alle geordneten Paare (≈ 28² × 9 Körper)
  - 200 Zufallsgänge × 30 Schritte
  - fest: **Florians Ablauf** (Kugel → Aufblasen und Ziehen → Knotenzüge in Seite und Front → Maul zeichnen → Ziehen nahe dem Maul → Maulanfang ziehen → Undo×n / Redo×n → Laden)
- **Gemessen nach jedem Schritt:** I1 (Δ, Relief), I2 (Lagen außerhalb Ω, Falten im Auslauf), I3 (Hashes), I4 (Lippen-px, Linientiefe, Anker), I5 (Testbeule), I6 (Hashes), I7 (Dokumentidentität nach einem Bau im Leerlauf), I8, I9 (Vorschau gegen Abschluss), I10, I12.
- **Ausgabe:** `pruefen-ausgabe/werkzeug-matrix.json`, eine Tabelle je Operationspaar, schlechteste Fälle zuerst. **Kontaktbögen** über `html-shot.mjs`: die 24 schlechtesten Schritte, vorher und nachher, je vier Ansichten, mit B_v, gestricheltem P, Silhouette, Lippen, Maskenfärbung und den Zahlen.

**Ende zu Ende mit echten Zeigerzügen.** `apps/editor/scripts/pruefen/werkzeug-harmonie.mjs`, ausgeführt über `run-check.sh` (Vite auf **5192**, nie 5180). Neue Hooks: `__editor.kaefigHash()`, `netzHash()`, `letzteUebernahme()`, `relief(ansicht)`.

| | Ablauf | Was geprüft wird |
|---|---|---|
| E1 | Florians Fall | `[data-delta]` ≤ 1, Relief sichtbar, `.vp-lippe` ≤ 1, Hashes nach Undo / Redo und Laden |
| E2 | Rex: Reifen-Perle nach dem Pinseln | Örtlichkeit außerhalb der Maske |
| E3 | Langhals: Halszug mit einer gepinselten Beule am Kopf | Die Beule dreht mit dem Hals |
| E4 | Tiger: Kante nach dem Pinseln; Plattenmaul | nach Teil A |
| E5 | Einfügen mit dem Stift auf einer Relieflinie, dann „Relief übernehmen“ | Hash von `lagen` unverändert |
| E6 | Pose hin und zurück | Teil B |

**CI-Teilmenge:** `kern/harmonie/*.test.ts`, 20 kurze Gänge mit festem Startwert, exakte Prüfungen von I2, I3, I6 und I8 (etwa 60 s).

---

## 7. Umsetzungsreihenfolge mit Toren

| Schritt | Inhalt | Tor |
|---|---|---|
| H0 | Nach der Rücknahme: Prüfaufbau und Operationen auf der heutigen Kette, als Ausgangslage | stellt Florians Zahlen nach (Δ ≈ 25/37 px, rot ≈ 34 px ±20 %) und die Örtlichkeit 3 / 9 px |
| H0.5 (wahlweise, nur wenn Teil A noch weit weg ist) | Zwischenlösung im Maulzweig: Relief über parametrisches Umverteilen anwenden; Gewicht 0 auf dem Lippenpfad, 0,5 bei 1 Ring, 1 ab 2 Ringen; die Kopien der Unterlippe bekommen den Wert der Oberlippe; keine Maulstationen mehr schreiben | rot ≤ 1 px nach dem Pinseln in E1; Dokumente ohne Maul unverändert |
| H1 | Vorgänge: Abschluss-Auftrag, asynchrones Gestenende, Warteschlange; `setzeStationen` und `kantenAnFlaeche` (Kern) entfernen; Ausstattung ausschreiben | I6 und I7 grün bei sonst gleichem Verhalten |
| H2 | Dokument v2 mit gespeichertem X0, Migration, Pinsel schreibt X0, Bau aus X0 + Φ | Dokumente ohne Maul bitgleich wie vorher; Laden bitgleich |
| H3 | Masken (M1 → M3), Zellbasis, Vorschaupfad, Erkennung formneutraler Operationen, Umverteilen | I2, I5, I8, I9, I10 auf der Matrix; I1 ohne Maul; Florian: „Körperbau fühlt sich gleich an“ |
| H3b (bedingt) | Stationen als Kurvenparameter (s, t) statt als Wirbelsäulenanteile einfrieren; das beseitigt Drift (a, b) und Spitzensprünge von der Wurzel her | nur wenn H3 an Drift oder Verlegung scheitert oder E3 scheitert |
| H4 | Relief-Anzeige, Δ-Trennung, Knoten auf B_v, Glätten auf dem Relief, „zur Zeichnung“; „Formen folgen“ stilllegen | E1 grün; Florians 10-Minuten-Probe → Entscheidung D1 |
| H5 | Linien auf der Haut, Augenanker (funktioniert auch mit dem alten Maulbau) | I4 auf der Matrix |
| H6 | Einsatz aus Teil A einbinden: Bau-Reihenfolge, linearer schneller Pfad, Treffer-Abbildung | I3 bitgenau; Lippen ≤ 1 px nach jeder Operation, die nicht das Maul betrifft; I12 |
| H7 | „Relief übernehmen“ und die Varianten von „Neu ableiten“ | I8; Florians Entscheidungen D1 und D4 |
| H8 | Vertragstests mit Teil B | I11 |
| H9 | Ganze Matrix (nachts), Kontaktbögen, Dokumentation | Florians Abnahme |

**Was H6 von Teil A braucht:**
- einen Topologie-Eintrag des Einsatzes in `maul.einsatz`, der sich nur durch Maul-Operationen im selben Abschluss ändert
- einen Einsatz, der bei fester Topologie affin-linear in X0 ist
- einen A0-Anker für jeden Einsatzpunkt
- Eingabelinien als wirksame 3D-Polylinien
- Kiefer-Spanten (`Spant.unten`) und das Plattenmaul, im Einsatz behandelt

**Risiken und Abbruchregeln.**
- **K1 (Masken-Artefakte):** Faltenzuwachs > 2° oder Dellen > 0,5 px in mehr als 2 % der Matrixschritte, nachdem w ∈ {2, 3, 4} und M3 versucht wurden. Dann H3b, sonst Rückfall auf M2 im Auslauf.
- **K2 (Relief abgelehnt):** Lehnt Florian die Relief-Anzeige ab, wird das automatische örtliche „Übernehmen“ (Möglichkeit i) zum Standard. Der Algorithmus ist fertig.
- **K3 (Abschluss zu langsam):** Median des Abschlusses > 400 ms auf Florians Mac. Dann die LU-Zerlegung wiederverwenden, wenn die Bedingungsmenge gleich bleibt, und zu einer optimistischen UI übergehen.
- **K4 (Details verzerren):** Die Beulenhöhe ändert sich um > 20 % bei Streckung < 1,5. Dann auf starre Rahmen umstellen.
- **K5 (Einsatz nicht linear):** Die Pinselvorschau nahe dem Maul aktualisiert den Einsatz nur mit 10 Hz. Annehmbarer Rückfall, kein Halt.
- **K6 (Migration):** Ändert die Migration eines von Florians gespeicherten Wesen um mehr als 2 px (abgesehen von der Linientiefe), anhalten und beheben, bevor es ausgeliefert wird.

---

## 8. Selbstkritik und offene Punkte

- **Pfadabhängigkeit.** A0 ist keine reine Funktion von P mehr. Das ist gewollt (Satz 3), muss aber erklärt werden, und Δ_frisch muss sichtbar sein.
- **Maskenregeln sind Heuristiken.** D3 (Front als Vorlage oder als Silhouette) ist eine echte Mehrdeutigkeit. Die adaptive Prüfung fängt zu kleine Masken ab, aber nicht zu große.
- **Das Relief hat Grenzen.** An Überhängen oder unter einem großen Relief wird die Strahlabbildung mehrdeutig; dort fällt sie auf den nächsten Punkt zurück, wird markiert, und der Nutzer kann sie backen. Zwischen den Knoten ist die schwarze Linie keine reine Bézier-Kurve mehr.
- **Jeder Abschluss kostet einen Weg zum Worker und zurück.** Die Warteschlange muss robust sein: Ein Pointerdown wartet, bis ausstehende Abschlüsse angekommen sind.
- **Die Migration** verschiebt die Tiefe vorhandener Maullinien einmalig (sie wandern auf die Haut) und backt alte Sehnen ins Profil. Florian muss das erfahren.
- **Beine und Kiefer-Spanten** werden hier genannt, aber nicht entworfen (Beine fallen unter den Einsatz-Vertrag, Kiefer-Spanten unter Teil A).

---

### Wichtige Dateien für die Umsetzung
- /Users/bsw/Projekte/playground/early-earle/packages/shape/src/kern/wesen.ts (gelesen in c97497b)
- /Users/bsw/Projekte/playground/early-earle/packages/shape/src/kern/ableiten.ts
- /Users/bsw/Projekte/playground/early-earle/packages/shape/src/dokument.ts (gelesen in c97497b)
- /Users/bsw/Projekte/playground/early-earle/apps/editor/src/state/editorStore.ts (gelesen in c97497b)
- /Users/bsw/Projekte/playground/early-earle/apps/editor/src/kern/kernBau.ts (gelesen in c97497b)
