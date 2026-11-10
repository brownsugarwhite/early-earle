# Gegenprüfung „Versuche und Urteile“ — Wesen-Editor „Kurven als Wahrheit“ (10.11.2026)

Arbeitsbaum (unten **WT**): `/Users/bsw/Projekte/playground/early-earle/.claude/worktrees/form-zuerst`, Branch `claude/form-zuerst`.
Am Arbeitsbaum wurde nichts geändert.

## 0. Wie geprüft wurde, und was nicht

- **Gelesen (vollständig):** `WT/docs/plans/2026-11-06-kurven-als-wahrheit.md` (1 178 Zeilen, unten „Planseite“),
  `WT/docs/plans/2026-11-04-beweis-form-zuerst.md`, `WT/docs/research/2026-11-09-bilanz-wesen-editor.md` („Bilanz“),
  `WT/docs/research/2026-11-09-fibermesh-monstermash-richtung.md` („Recherche“), `WT/docs/research/2026-11-04-linien-aus-dem-netz.md`.
- **Gelesen (Code und Proben):** `packages/shape/src/dicht/ausKurven.ts` ganz; aus `dicht/kurven.ts`, `loops.ts`, `verdichten.ts`,
  `kruemmung.ts`, `intrinsisch.ts`, `einbettung.ts` die für den Löser wichtigen Teile; `loeser/zerlegung.ts`, `loeser/normalSystem.ts`;
  im Fenster `apps/editor/src/form/kurven.ts` Zug, Loslassen, Setzen, Schalter; die Proben `form-netzunabhaengig.ts`,
  `form-kuppel-probe.ts`, `form-loslassen-probe.mjs`, `form-mass-netz.ts`, `form-drei-faelle.mjs` (Ablauf); die Schranken der Tests
  `weiterZug.test.ts`, `ausKurven.test.ts`, `netzunabhaengig.test.ts`; `git log` seit dem 05.11.; `git show 476a874f` (der wieder
  entfernte Versuch „mitgelöst“); das Projektgedächtnis `WT/CLAUDE.md` Z. 878–1297 (Einträge 05./06.11.).
- **Nicht gemessen:** Meine Aufgabe nennt keine Messskripte. Ich habe keine Probe laufen lassen. „Gemessen“ heißt unten immer:
  von der bauenden Session gemessen und aufgeschrieben. Wo ich aus ihren Zahlen weitergerechnet habe, steht **nachgerechnet**.
  Vermutungen stehen als **vermutet**.
- **Nicht geprüft:** die Fachartikel selbst (FiberMesh, Schneider & Kobbelt, Andrews u. a.) — ich stütze mich auf ihre Wiedergabe in
  den Dokumenten und auf mein Fachwissen; das Fenster und die Bilder habe ich nicht angesehen.

## Kurzfassung

1. **Die zwei Kerndiagnosen der Session stimmen** und sind im Code nachvollziehbar: Das Maß mit gleichen Gewichten hängt am Netz
   (Sprung nach dem Verfeinern), und die Linienpunkte tragen ein Gedächtnis („so gebogen wie jetzt“).
2. **Der Schluss der Bilanz „am Löser gibt es keinen Hebel mehr, es bleibt nur Tempo“ ist nicht belegt.** Die drei Löser-Beweise des
   09.11. entstanden laut Git zwischen 09:30 und 12:14 Uhr. Zwei davon (Linien mit Richtung, Krümmung mitgelöst) haben ihre
   eigentliche Aussage bestätigt (Form eindeutig bzw. Form steht) und scheiterten an der ersten Umsetzung.
3. **Übersehen:** Die Runden laufen nur in Mausereignissen. Steht die Maus, rechnet nichts weiter; der Rest wird erst beim Loslassen
   sichtbar. Das ist ein Teil von „justiert nach“, der nichts mit dem Löser zu tun hat.
4. **Übersehen:** Die Kriterien hält nur der Prüffall, in dem sich zwei Linien an der gezogenen Stelle kreuzen (Hals). Ohr, Rüssel und
   Hörner hängen an einer einzigen Linie; ihre Dicke quer legt keine Linie fest. Ob die Form dort vom Weg abhängt, wurde nie gemessen.
5. **Fehler in der Bilanz:** „Drei Spalten in einem Durchgang lösen“ steht als offener billiger Schritt da, ist aber seit dem 06.11.
   gebaut. Das Tempo-Kriterium ist an 5 000 Punkten bemessen, Florians Netze haben 11 000–26 000.
6. **Messverfahren schwach:** je ein Lauf, zeitabhängige Rundenzahl im Fenster, Faltenzählungen, die bei gleicher Form um den Faktor 2
   streuen. Mehrere Urteile ruhen auf Unterschieden innerhalb dieser Streuung.
7. **Nie versucht** (trotz Nähe): eine Zielfunktion mit Liniensuche, Vorhersage aus den Mausschritten, Rechnen auf grobem und Zeigen
   auf feinem Netz, ein lineares Verfahren mit Richtung an den Linien, das vorhandene Krümmungsfeld aus den Linien (`kruemmung.ts`)
   zusammen mit dem Lösen über die ganze Haut.

---

## 1. Alle Löser- und Netz-Versuche seit dem 05.11.

Zahlen wie in den Dokumenten. „K/U“ = Knicke über 60° / umgeklappte Dreiecke. Einheiten: Welteinheiten, 0,89 px je Einheit bei 100 %.

| Nr | Wann (Commit) | Hypothese | Was gebaut wurde | Womit gemessen | Zahlen | Urteil der Session |
|---|---|---|---|---|---|---|
| V01 | 05.11. `bb0c837d` | Festes dichtes Netz, Kurven als Bindungen, Haut behält ihre Lage relativ (Gedächtnis) | `HautLoeser`/`HautZiele`: Laplace in Normalgleichungen, gelöst im Einflussbereich | `form-kurven-probe.mjs`, `kurven.test.ts` | 1–3,3 ms je Bewegung örtlich; ganze Kugel 12 ms | trägt; offen „höher ziehen macht tiefer“ |
| V01a | 05.11. | Krümmung zwischen den Kurven nach FiberMesh nachführen | im heutigen Code nicht vorhanden | — | „schaukelt sich auf dem Netz aus Surface Nets auf“ (`WT/CLAUDE.md:900`) | verworfen |
| V01b | 05.11. | Nur Normalenanteil, ohne Verteilung in der Fläche | im heutigen Code nicht vorhanden | — | Kugel fällt zusammen, Radius 52–157 (`ausKurven.ts:11–13`) | verworfen |
| V01c | 05.11. | Ganze Haut statt Bereich lösen (mit Gedächtnis) | im heutigen Code nicht vorhanden | — | Rücken 6–8 anders, 20–30 geglitten (`WT/CLAUDE.md:901`) | verworfen |
| V02 | 05.11. `c2380403` | Härte 0–3 = Glättung quer über die Linie abschwächen | Loops als Kantenketten ins Netz, Kantengewichte | `form-loops-braue.mjs` | Braue 43° hart / 30° weich | gebaut; am 06.11. „wirkt kaum“ |
| V03 | 05.11. `9b996ee3` | Netz muss sich selbst verdichten | `verdichten.ts`: Kanten über 1,75 Startkanten teilen, neue Punkte rund (wie PN-Dreiecke), Kanten zur Wertigkeit 6 drehen, entspannen; Züge in Stufen | `form-verdichten-probe.mjs` | längste Kante 63,6 → 15,1; umgeklappt 2/50 → 0/12 | trägt |
| V04 | 05.11. `d431d41b` | Krümmung der Felder kommt aus den Loops (flacher Boden) | `KruemmungsFeld` (skalar, harmonisch verteilt) im Gedächtnis-Löser | `form-boden-probe.mjs` | Boden 16,55 → 0,25 unter der Ebene | trägt; danach Rüssel/Hammer kollabieren |
| V05 | 06.11. `ed20a817` | Explosion = Rückkopplung über die eigene Dehnung | Dehnung aus den Loops, Auflösungsgrenze der Krümmung | `form-explosion-probe.mjs`, `weiterZug.test.ts` | Fall a 78/104 → 0/4 K; Fall c 1,7 Mio. → 6 416 Punkte | trägt |
| V06 | 06.11. `fee7946a` | Ein Loop sagt nur die Krümmung längs seiner selbst; quer kommt sie von kreuzenden Loops, sonst Gedächtnis | `KruemmungsFeld` als Tensor (N = t tᵀ, M = κ t tᵀ, K = N⁻¹M), nur im Gedächtnis-Löser | `form-explosion-probe.mjs` | Rüssel 20°: 49/14 → 2/0; Hammer 111/42 → 24/8; Rückschritt Überhang 0/0 → 20/6, Schlaufe 17/2 → 124/42 | trägt mit Rückschritt |
| V07 | 06.11. `ba27f292` | Gestauchte Dreiecke sind die Ursache der Restfalten | Kanten unter ½ Startkante zusammenlegen | `weiterZug.test.ts`, Fenster | Schlaufe 124/42 → 18/2; Hammer 28/6 → 8/0; Rüssel 12/0 → 20/2 | trägt |
| V08 | 06.11. `41099345` | Härte wirkt nicht wegen des Gedächtnisses der Haut | nur Messung; Kurzversuch FiberMesh „nicht im Code“ | `form-haerte-probe.mjs` | Pilz hart 3,3° / weich 4,2° | Ursache später als falsch erkannt (Planseite Z. 5–6) |
| V09 | 06.11. `ee9a4800` | Haut im Bereich je Zug neu aus den Kurven (wie FiberMesh) | `HautAusKurven`: je Runde messen, Krümmung harmonisch verteilen, Lagen lösen | `ausKurven.test.ts`, Fenster | Überhang 28/10 → 4/0; Hammer 7/0 → 18/6; Pilz 12 umgeklappt | „B allein kein Gewinn“ |
| V10 | 06.11. `f64ac0b9`, `50c3639f` | Der Rand des Bereichs trug die alte Wölbung ein | dasselbe über die ganze Haut; verschachtelte Zerlegung, in der Ruhe vorgerechnet; Setzen nach dem Zug (4 Runden) | Fenster, `form-greifen-probe.mjs` | Hammer 0/0; Überhang 6/0; 14–16 ms bei 5 200, 26–28 ms bei 15 400 Punkten | „überall gleich oder besser“, Standard |
| V10a | 06.11. | Krümmung aus den Kurven, Verteilung wie beim Anlegen | im heutigen Code nicht vorhanden | — | „verknittert“ (Planseite Z. 149–150) | verworfen |
| V11 | 06.11. `279d4e8f`, `6a393156` | Eine Kante muss die kreuzende Linie knicken | Griffe an Ecken von selbst: „rund“ gegen „Vector“ | `form-haerte-probe.mjs`, `pfad.test.ts` | Pilz 37° → 81–92°; Vector 110° | „rund“ (Florians Wahl) |
| V12 | 06.11. `43fba102` | „Ist Gedächtnis dann nicht besser?“ | nur Messung beider Löser | `form-hin-zurueck.mjs`, `form-greifen-probe.mjs`, `form-tempo-oertlich.mjs` | hin und zurück 1,84 gegen 0,65; kleiner Zug 1,5 gegen 14,5 ms | „aus den Kurven“ bleibt |
| V13 | 07.11. `a0d2f959` | Die Linie ist genau ihr Bézier-Pfad | Ziele = Pfad (`mitRest`, `pfadVersatz`), `linienAufPfad` | `form-restversatz.mjs`, `form-gleichgewicht.ts` | Linie ↔ Pfad 7,2 → 0,00; Kugel nach dem ersten Zug 0,65/0,22 → 2,35/1,09 | gebaut; „Punkte wo nötig“ offen |
| V14 | 08.11. `130816c6` | Linien im Netz mit fester Genauigkeit; Haut ebenso fein | `verdichten` mit `genau` = MK/40; Versuch `genauHaut` | `form-detail-probe.mjs` | Linie 1,02 → 0,18; `genauHaut`: Ohr 0,99 → 0,21, aber Rüssel 31/0 → 62/30 bis 108/46 | Linien ja, `genauHaut` verworfen |
| V15 | 08.11. `78da9e12` | Woher kommt der Sprung beim Loslassen? | nur Messung | `form-loslassen-probe.mjs` | ohne Verdichten 0,11 / 0,11 / 1,41; mit Setzen 4,9 / 5,4 / 32,2 (Hals/Ohr/Rüssel) | Ursache: Form hängt am Netz |
| V16 | 08.11. `53377344` | Krümmung nach der Geometrie messen und verteilen | `intrinsisch.ts` (intrinsische Delaunay, Kotangens ≥ 0); Matrix der Lagen bleibt, Korrektur gedämpft | `form-netzunabhaengig.ts`, `netzunabhaengig.test.ts`, Fenster | Hals 6,37 → 0,36; Rüssel 16,2 → 2,5; Fenster Hals 4,92 → 0,34, Ohr 5,98 → 8,69 | „netzunabhängig bewiesen“, Standard bleibt gleich |
| V16a–g | 08.11. | sieben Varianten (Kotangens geklemmt; nur messen; Gewichte einfrieren; Korrektur in Normalenrichtung; feste Dämpfung; tangential entspannen; Schwung) | im heutigen Code nicht vorhanden | — | je eine Zahl (Planseite Z. 712–716) | verworfen |
| V17 | 08.11. `d088e839`, `07d9d141` | Mit netzunabhängiger Form darf im Zug verfeinert werden | Verfeinern im Zug, Zerlegung im Worker, Einbettung, Matrix nach 1/Kantenlänge² | `form-loslassen-probe.mjs` | Hals 0,36; Rüssel 1,43; Ohr 3,62; Halt 35–52 ms | Rest ist Nachhinken |
| V18 | 08.11. `e781d9dd` | Florians drei Fälle | nur Messung | `form-drei-faelle.mjs` | Hörner 17,9–20,0 + 1,5–3,3 nach dem Loslassen; Griff 11: 2,9 → 6,1 % umgestülpt; Ohr 22,5° je Kante | Vorschlag in drei Teilen |
| V19 | 08.11. `7fe8a613` | Matrix nach der Geometrie → Löser kommt in 1–2 Runden an | Matrix aus Kotangens, im Hintergrund nachgeführt; dazu Scheibenmittel, Anderson, weiche Bindung (Code laut Planseite Z. 905 wieder entfernt) | `form-netzunabhaengig.ts`, `form-kuppel-probe.ts` | Nachhinken Ohr 1,35 → 3,65 → 4,40; mit festen Quellen 0,11 → 0,02 in 3 Runden | angehalten: „Ursache im Modell“ |
| V20 | 09.11. `9a557647` | Krümmung an den Linien aus den Linien selbst, quer „so rund wie möglich“ | fünf Anläufe (skalar), wieder entfernt | `form-kuppel-probe.ts`, `form-netzunabhaengig.ts`, `form-kap-ring.ts` | Kuppel 141 / 54 / läuft auseinander / 127; an Linienpunkten misst der Löser 9–225 % | angehalten |
| V21 | 09.11. `977dde2f`, `3059809c` | Linien brauchen Lage und Richtung (Schneider & Kobbelt) | `richtung.ts`; Krümmung je Seite über 3 Kantenlängen angepasst; Zeile für Punkte neben der Linie; Normalen nach Max | `form-kuppel-probe.ts`, `form-richtung-horn.ts`, `form-drei-faelle.mjs` | Kuppel ×1,25 → 150,0 ± 0,2; Richtung ≤ 0,52°; Hörner: umgestülpt ab Griff 1, läuft nach Griff 10 weg | „nach Tag 1 angehalten“ |
| V22 | 09.11. `1f1f5079` | Normalen nach Max (Maß 8 % zu flach) beheben den Sprung | Schalter `maxNormalen` | Kern und Fenster | Hals 6,34 → 6,14; Hörner 20,0+3,3 → 21,4+2,3; Kuppel 163,5/−141,7 → 137,4/−160,4 | kein Hebel |
| V23 | 09.11. `02cb59ca` | Messen und Rechnen mit demselben Maß | Matrix der Lagen aus Kotangens, volle Schritte | `form-netzunabhaengig.ts` | Hals Nachhinken 0,02 → 2,87; Rüssel läuft weg | „am ersten Tag angehalten“ |
| V24 | 09.11. `476a874f` (entfernt `75b94733`) | Krümmung an den Linien als Unbekannte mitlösen | je Runde GMRES über die Linienpunkte | `form-netzunabhaengig.ts`, `form-kuppel-probe.ts` | Hals 0,03 / 0,54; Ohr 0,12 / 2,21; Rüssel läuft nicht zusammen; 400–575 ms je Runde; gleiche Gewichte: „danach steht die Form (0,00)“ | verworfen |
| V25 | 08.11. (Florian) | Geometrie-Löser im Fenster | Florians Blick auf `?gewichte=geometrie` | Gefühl | „ruckelt“, Nachhinken stört mehr als Nachjustieren | Standard bleibt gleiche Gewichte |
| V26 | 09.11. `afb79d15` | Bilanz | Dokument | — | — | „kein Hebel mehr am Löser, Hebel ist Tempo“ |

---

## 2. Prüfung der Urteile

Einstufung: **trägt** · **trägt eingeschränkt** (nur im gemessenen Zuschnitt) · **nicht belegt** (Urteil geht über die Messung hinaus) ·
**nicht nachprüfbar** (Code oder Parameter fehlen).

### 2.1 Was sauber ist

- **V15/V16, Diagnose „Form hängt am Netz“ — trägt.** `vermessen` (`WT/packages/shape/src/dicht/kurven.ts:717–748`) teilt den
  Normalanteil des gleich gewichteten Laplace durch das mittlere Kantenquadrat. Das ist ein Mittel der Normalkrümmung über die
  Kantenrichtungen, gewichtet mit der Kantenlänge², also abhängig von der Streckung der Dreiecke. Die Messungen (Planseite Z. 656–660,
  Z. 1091–1094) passen dazu. Das Maß nach der Geometrie (`ausKurven.ts:778–803`) ist genau die halbe mittlere Krümmung
  (nachgerechnet: Σ w·l² = 4 × Voronoi-Fläche). Diese Diagnose ist die stärkste Arbeit der Session.
- **V19/V24, Diagnose „Linienpunkte tragen ein Gedächtnis“ — trägt.** Jeder Linienpunkt hat eine Laplace-Zeile
  (`ausKurven.ts:268–285`), sein Sollwert ist die an ihm selbst gemessene Krümmung (`ausKurven.ts:718` bzw. `812`, eingesetzt in
  `936`). Der Zustand bestätigt sich selbst.
- **V03, V05, V07 — tragen.** Verdichten, Dehnung aus den Loops und Zusammenlegen haben je einen klaren Vorher-Nachher-Beleg am selben
  Fall.
- **V11 „rund“ — trägt** als Look-Entscheidung von Florian, mit Bild.
- **Die eigene Kritik der Bilanz (Abschnitt 4, Punkte 1–5) trifft zu.** Punkt 1 habe ich am Code bestätigt: Die Kern-Probe rechnet
  60 Schritte × 2 Runden (`WT/apps/editor/scripts/pruefen/form-netzunabhaengig.ts:271–273`), das Fenster je Mausbewegung eine Runde
  und eine zweite nur, wenn die erste schnell genug war (`WT/apps/editor/src/form/kurven.ts:2075–2079`).

### 2.2 Urteile, die die Messung nicht oder nur eingeschränkt trägt

**V10 „B über die ganze Haut ist überall gleich oder besser“ (Planseite Z. 174) — trägt eingeschränkt.**
- Dieselbe Seite nennt drei schlechtere Fälle (Z. 225–230: Überhang 30/6, Rüssel im Kern 28/6 statt 20/2, Schlaufe 38/12 statt 14/2).
- Die Testschranken wurden dafür gelockert: Für „kurven“ sind doppelt so viele Falten erlaubt wie für den alten Löser
  (`WT/packages/shape/src/dicht/weiterZug.test.ts:318–319` und `492–493`).
- Was mit B neu in die Welt kam, wurde am 06.11. nicht gemessen: das Setzen des verdichteten Netzes nach dem Loslassen (Z. 199). Genau
  das ist seit dem 08.11. Florians Hauptklage.
- Der Gedächtnis-Löser setzt nach dem Loslassen konstruktionsbedingt nicht nach (`kurven.ts:2317`: nur `!mitBereich()`). Er wurde
  nie gegen die Kriterien „Sprung“ und „Nachhinken“ gemessen: `gedaechtnis` kommt auf der Planseite nach Z. 401 nicht mehr vor.
  **Zu messen:** `form-loslassen-probe.mjs` und `form-drei-faelle.mjs` mit `?haut=gedaechtnis`.

**V09 → V10, Umkehr binnen 14 Minuten.** 13:27 Uhr „B allein ist kein Gewinn“, 13:41 Uhr „überall gleich oder besser“, 14:12 Uhr
Standard. Die Korrektur war richtig (Rand des Bereichs), aber die Prüfzeit für die neue Aussage war ein Lauf je Fall.

**V14 „`genauHaut` verworfen“ — trägt eingeschränkt.** Gemessen nur mit gleichen Gewichten (08.11. vormittags, vor V16). Die Bilanz
schließt daraus: „Mit dem Löser nach der Geometrie wäre Dichte nach Rundung ungefährlich“ (Bilanz Z. 218–219). Das ist nicht gemessen.
**Zu messen:** `?gewichte=geometrie&genauHaut=1` an Rüssel, Überhang, Fressen-Pose.

**V16 „Sprung im Fenster“ und V25 Florians Urteil — trägt eingeschränkt.**
- Im Fenster hängt an `?gewichte=geometrie` ein Bündel: anderes Maß, gedämpfte Schritte, andere Matrix, Verfeinern im Zug und
  Zerlegen im Hintergrund (`kurven.ts:287` und `2090`: nur mit `geometrie`). Florian hat das Bündel beurteilt. „Ruckelt“ kommt vom
  Verfeinern im Zug (Halt 35–52 ms), „hinkt nach“ von der Dämpfung. Getrennt (`?live=0`) hat er es nicht gesehen.
- Die Bilanz nennt nur das ungleiche Tempo (Punkt 4), nicht das Bündel.

**V17 „Was bleibt, ist Nachhinken“ — nicht belegt für Ohr, Rüssel, Hörner.**
- Das Kriterium hält nur der Hals. Im Hals-Fall wird eine **Kreuzung** gezogen (`form-netzunabhaengig.ts:217–225`): Zwei Linien
  legen die Spitze in zwei Richtungen fest. Im Ohr-Fall bewegt sich nur der Ring (Z. 226–254), im Rüssel-Fall nur die Mittellinie
  (Z. 255–270), bei den Hörnern nur der Ring. Dort legt keine Linie die Dicke quer fest.
- Die Session erklärt den Rest mit Nachhinken und Auflösung. Gleich gut passt (vermutet): In diesen Fällen ist die Form zwischen den
  Linien nicht eindeutig, sie hängt vom Weg ab und kriecht. Dafür sprechen die eigenen Beobachtungen „kriecht danach weiter (28 → 38
  in 30 Runden)“ (Z. 1014), „schwingt einmal hin und zurück“ (Z. 1144) und „die umgestülpte Stelle wächst durch die Rechenrunden
  selbst“ (Z. 806–807).
- **Zu messen (fehlt ganz):** Wegunabhängigkeit. Dieselben Endlagen der Linien auf zwei Wegen erreichen (30 gegen 120 Schritte;
  erst hinaus, dann seitlich, und umgekehrt), beide fertig rechnen, Formen vergleichen. Das ist die direkte Prüfung von „Kurven als
  Wahrheit“. Bisher gibt es nur „hin und zurück“ an der Kugel mit dem Standard-Löser (0,65 statt 0,23, Z. 406).

**V19, Nebenversuche (Scheibenmittel, Anderson, weiche Bindung) — nicht nachprüfbar.** Der Code ist laut Planseite Z. 905
wieder entfernt; im Verlauf der Löser-Datei findet `git log -S` weder „Anderson“ noch „Schwung“. Für Anderson fehlen
Fenstergröße, die beschleunigte Größe und ob die gedämpfte oder die ungedämpfte Runde beschleunigt wurde. Auf einer Runde, die
ungedämpft mit dem Faktor 1,7 wächst (Z. 887–888), kann keine Beschleunigung helfen; auf der gedämpften (0,65–0,77 je Runde) wäre
sie der naheliegende Kandidat. Ebenso nicht nachprüfbar sind die sieben Varianten V16a–g und V01a–c, V10a: je ein Satz mit einer
Zahl, kein Code im heutigen Stand.

**V20 „Teil 1 neu“ — trägt für die fünf gebauten Anläufe, nicht für die Idee.**
- Angekündigt war: „Quer zur Linie gilt ‚so rund wie möglich‘, **außer eine kreuzende Linie sagt etwas anderes**. Das ist die
  ‚Krümmung mit Richtung‘ vom 06.11., aber ohne Gedächtnis“ (Z. 909–911).
- Gebaut wurden fünf skalare Anläufe (Z. 929–934). Keiner nimmt die Querkrümmung von der kreuzenden Linie. Der Befund lautet dann
  selbst: „Die Krümmung quer muss von kreuzenden Linien kommen“ (Z. 940).
- Genau das kann der Code vom 06.11. schon: `KruemmungsFeld` verteilt je Linie die bedeckte Richtung und ihre Krümmung als Tensor
  (`WT/packages/shape/src/dicht/kruemmung.ts:9–24`). Es wirkt nur hinter `?haut=gedaechtnis` (`loops.ts:880–883`), und die Bilanz
  will es als Altlast entfernen (Bilanz Z. 318, Z. 327). Die Kombination „Krümmung als Tensor aus den Linien + Lösen über die ganze
  Haut + nichts an der Haut messen“ wurde nie gebaut.

**V21 „Linien mit Richtung“ — die Idee ist bestätigt, verworfen wurde eine Umsetzung.**
- Bestätigt: Die Kuppel kommt zurück (150,0 ± 0,2), die Richtung lässt sich aus dem Liniennetz gewinnen (≤ 0,52°). Keine andere
  Variante hat die Form eindeutig gemacht.
- Gescheitert ist die Rechnung „Krümmung je Seite an der Haut anpassen“ (`ausKurven.ts:430–565`) mit fünf Schutzkonstanten
  (`ausKurven.ts:136–145`). Die Session nennt das Muster selbst: „Die schwache Stelle ist jedes Mal, die Krümmung an den Linien in
  jeder Runde an der Haut zu messen“ (Z. 1028–1029). Die Richtung wurde also wieder über eine Messung an der Haut eingespeist.
- Der Hörner-Fall im Fenster lief mit `?richtung=1` auf gleichen Gewichten ohne Verfeinern im Zug. Das Aufblähen in Stufen nach dem
  Loslassen (Z. 1018) ist dort die bekannte Netzabhängigkeit, kein Befund über die Richtung.
- „Nach Tag 1 angehalten“ heißt laut Git: Recherche 09:30 Uhr, erster Stand 10:20 Uhr, angehalten 11:11 Uhr.
- Die Recherche nennt für den Abbruch einen Rückfall: „rein linear aus der Richtung“ (Recherche Z. 129, Z. 145–146). Er steht unter
  „Wege danach“ (Planseite Z. 1041–1046) nicht mehr und wurde nicht gebaut.

**V22 „Normalen nach Max: an der Kuppel schlechter“ — das Kuppel-Urteil ist ein Artefakt.**
- Nachgerechnet aus Z. 1056–1057 (nur aus höchstem und tiefstem Punkt, die Form dazwischen kenne ich nicht): Der Endstand
  131,8 / −169,0 hat den Halbmesser 150,4 und die Mitte bei −18,6. Eine Kugel durch den Ring (Radius 150) mit dieser Mitte hätte
  151,2. Das ist fast genau eine der Kugeln durch den Ring. Der heutige Stand (155,7 / −150,3) hat den Halbmesser 153,0, wo die
  passende Kugel 150,0 hätte; er ist also gestreckt und weniger rund. „Wandert weiter“ heißt hier: Die Kugel gleitet längs der
  mehrdeutigen Schar. Das sagt nichts über die Güte des Maßes.
- Die Bilanz sagt selbst, dass dieser Test mehrdeutig ist (Punkt 2). Für V22 wurde er trotzdem als Beleg „wird schlechter“ benutzt.
- Der Rest des Urteils (kein Hebel gegen den Sprung) trägt in der Tendenz, liegt aber in der Streuung (siehe 2.3).

**V23 „gleiches Maß“ — trägt, aber war vorhersehbar.** Die Session schreibt es selbst (Z. 1126–1128): Dasselbe stand schon in
Abschnitt 12. Laut Git lagen zwischen Vorschlag und Abbruch 17 Minuten.

**V24 „Krümmung mitgelöst: verworfen“ — nicht belegt.**
- Laut Git: Beginn nach 11:57 Uhr, gemessen und eingecheckt 12:12 Uhr, entfernt 12:14 Uhr.
- Die Eigenschaft, für die es gebaut wurde, ist eingetreten: kein Gedächtnis, keine Dämpfung, „danach steht die Form (0,00)“ mit
  gleichen Gewichten, Nachhinken 0,03 (Z. 1159–1164).
- „35-mal langsamer“ ist die erste Umsetzung, nicht die Idee: GMRES ohne Vorkonditionierer bis 10⁻⁶ (höchstens 80 Schritte), nach der
  Geometrie innen konjugierte Gradienten bis 10⁻¹⁰, je GMRES-Schritt zwei volle Lösungen (`git show 476a874f`, `schrittGekoppelt`). Die Normalen ändern sich ohnehin jede Runde;
  eine so genaue innere Lösung ist Verschwendung.
- „Rüssel läuft nicht zusammen“: ungedämpfte volle Schritte auf dem gestreckten Netz, ohne Schrittweitensteuerung.
- Der Vergleich „Sprung 0,54 gegen 0,37“ misst zwei fertig gerechnete Netze gegeneinander. Ohne Gedächtnis wäre das der
  Diskretisierungsfehler des gestreckten Netzes (vermutet); beide Werte liegen unter 1 px.
- Im Fenster an Florians Fällen (Hörner, Aufblasen in Stufen, schwarze Stellen) wurde es nie gemessen.
- **Zu messen:** dieselbe Rechnung mit grober innerer Toleranz und Start bei der letzten Lösung; Runden und Reste zählen statt Zeit;
  Hörner-Fall: Bewegung nach dem Loslassen und umgestülpte Fläche.

**V26 „Kein Hebel mehr am Löser, der Hebel ist Tempo“ (Bilanz Z. 33–34) — nicht belegt.**
- Die drei „Beweise“ plus Weg a entstanden am 09.11. zwischen 09:30 und 12:14 Uhr. Angesetzt waren je zwei Arbeitstage mit Abbruch.
- Zwei davon (V21, V24) haben ihre Kernaussage bestätigt und scheiterten an Robustheit bzw. Tempo der ersten Fassung.
- Dieselbe Planseite sagt am 08.11. das Gegenteil: „Schneller rechnen (WebAssembly, nativ) ändert daran nichts“ (Z. 899–900).
- Was Tempo kann, lässt sich abschätzen (nachgerechnet, grobes Modell): Holt eine Runde 23–35 % auf (Z. 758–759), dann bleibt bei
  gleichmäßigem Zug ein Rückstand, der mit ρᵏ/(1 − ρᵏ) fällt (ρ ≈ 0,65–0,77, k Runden je Bewegung): bei ρ = 0,7 das 2,3-Fache
  eines Mausschritts bei einer Runde, das 0,5-Fache bei drei, das 0,2-Fache bei fünf. Vom gemessenen Rückstand im Fenster aus
  (Ohr 2,41, Rüssel 1,28 bei einer Runde, Z. 751–753) braucht ½ px (0,56 Einheiten) am Ohr drei bis fünf Runden je Bewegung, am
  Rüssel etwa zwei. Bei 5 200 Punkten heißt das 3–5 ms je Runde (heute 10–12). Bei 15 400 Punkten kostet schon die einfachere
  Runde mit gleichen Gewichten 26–29 ms (Z. 206, Z. 561); dort bräuchte es das Sechs- bis Zehnfache an Tempo. Die Bilanz schätzt
  für WebAssembly das Zwei- bis Vierfache (Bilanz Z. 299).

### 2.3 Messverfahren, die mehrere Urteile schwächen

1. **Je ein Lauf, und das Fenster ist nicht deterministisch.** Die zweite Runde je Mausbewegung hängt an der gemessenen Zeit
   (`kurven.ts:2077–2078`), das Einwechseln am Worker, das Setzen an einem Timer von 30 ms (`kurven.ts:1451`). Die Session schreibt
   selbst: „Unter Last kommen weniger Mausschritte an …, der Zug geht einen anderen Weg“ (`WT/CLAUDE.md:1294–1295`).
   Beispiel: Derselbe Fall „Hörner 170 hinaus, `?gewichte=geometrie`“ gibt am 08.11. 11,4 Einheiten (Planseite Z. 820) und am
   09.11. 4,6 (Z. 1137). Die Bilanz zitiert die 4,6 (Z. 30).
2. **Faltenzählungen streuen um den Faktor 2.** Die Reihenfolge beim Zusammenlegen ändert Fall A von 6/2 auf 14/4
   (`WT/CLAUDE.md:1272–1273`); zwei Läufe desselben Falls geben 62/30 und 108/46 (Planseite Z. 545). Unterschiede wie 13/0 gegen
   14/0 oder 28/6 gegen 20/2 sagen nichts.
3. **Größter Abstand eines einzelnen Punkts** als Maß für „Sprung“. Ein Ausreißer an einer Spitze bestimmt die Zahl. Die Proben
   geben auch 99 % und Mittel aus (`form-netzunabhaengig.ts:203`); in den Tabellen steht meist nur der größte Wert.
4. **„Fertig gerechnet“ = 30 Runden mit neuem Löser** (`form-netzunabhaengig.ts:320–325`). Für die Variante mit Richtung nennt die
   Session selbst „halbiert sich etwa alle 10 Runden“ (Z. 1006); der Standard „pendelt dauerhaft um etwa 0,3“ (Z. 891). Ein Rest
   wird nicht ausgegeben. Der Schalter `KONVERGENZ=1` dafür ist da, seine Zahlen stehen nicht auf der Planseite.
5. **Die Kern-Probe führt die Linien nicht auf ihrem Pfad.** Sie verschiebt nur (`form-netzunabhaengig.ts:80–87`) und liest die
   Punkte beim Festlegen von der Haut (`:299`). Das Fenster zielt seit dem 07.11. genau auf den Pfad (`kurven.ts:1696–1707`,
   `1460`). Das ist ein dritter Unterschied zwischen Kern und Fenster, den die Bilanz nicht nennt. Wirkung: nicht gemessen.
6. **Prüfnetz 5 200 Punkte, 30 gleichmäßige Mausschritte, frische Kugel.** Florians Netze: 11 000 Punkte (`WT/CLAUDE.md:1195`),
   26 284 im Fall mit den schwarzen Stellen (Planseite Z. 784–785). Lange Sitzungen mit vielen Zügen nacheinander prüft nur die
   Hörner-Probe.

### 2.4 Umgekehrte Urteile (Hinweis auf die Fehlerquote schneller Urteile)

| Urteil | wann | umgekehrt |
|---|---|---|
| „Krümmung nach FiberMesh nachführen schaukelt sich auf“ (V01a) | 05.11. | 06.11.: als B gebaut, Standard |
| „Ganze Haut lösen“ verworfen (V01c) | 05.11. | 06.11.: Standard |
| „Gedächtnis verhindert die Kante“ (V08) | 06.11. mittags | 06.11. nachmittags: falsch vermutet |
| „B allein kein Gewinn“ (V09) | 06.11. 13:27 | 13:41: „überall gleich oder besser“ |
| „Messen und Rechnen müssten dasselbe Maß benutzen“ (Abschnitt 17) | 09.11. 11:40 | 11:57: „meine Erklärung war falsch“ |

Fünf Umkehrungen in fünf Tagen. Das spricht nicht gegen die Session (sie korrigiert sich ehrlich), aber gegen endgültige Urteile
nach einem einzigen Anlauf.

---

## 3. Was nie versucht wurde

| Idee | Stand | Beleg | Bemerkung |
|---|---|---|---|
| **Zielfunktion mit Liniensuche** | nie | Die Wörter Zielfunktion, Energie, Liniensuche, Newton kommen in keinem der fünf Dokumente vor. Statt einer Schrittweitenregel gibt es je Punkt „halbieren bei Vorzeichenwechsel“ (`ausKurven.ts:941`). | Am nächsten: V24 (lineares Teilproblem je Runde, ohne Gütemaß, ungedämpft). Ohne Zielfunktion gibt es kein „fertig“, kein „besser“ und keinen Schutz vor dem Auseinanderlaufen. |
| **Anderson-Beschleunigung** | einmal, nicht nachprüfbar | Planseite Z. 904, Code nie eingecheckt | Auf welcher Runde (gedämpft oder ungedämpft) ist unbekannt. |
| **Vorhersage aus den letzten Mausschritten** | nie | kein Vorkommen | „Schwung“ (Z. 716) war ein Schwungterm im Löser, keine Vorhersage aus der Maus. Bei gleichmäßigem Zug ist der Rückstand ein fester Bruchteil der Geschwindigkeit; eine Vorhersage nimmt genau den weg, ohne schnellere Runden (vermutet). |
| **Runden von der Maus entkoppeln** (weiterrechnen, solange gehalten wird; Abbruch nach Rest) | nie | Runden nur in `zugBewegen` (`kurven.ts:2041–2098`); die Bildschleife zeichnet nur (`kurven.ts:3151–3157`) | Siehe Befund in Abschnitt 4, Annahme 3. |
| **Linearisierte Antwort beim Greifen vorausrechnen** | nie in dieser Form | Z. 713–715 ist eine andere Linearisierung | Der Gedächtnis-Löser ist faktisch eine lineare Antwort (1,5 ms örtlich, Z. 409). Die Mischung „lineare Antwort sofort, Kurven-Löser als Ziel“ wurde nie gebaut. |
| **Grobes Netz lösen, glatt hochrechnen** (Mehrgitter, Unterteilung) | nie | „Mehrgitter“ nur als Zitat (Recherche Z. 113); „grobe Vorschau“ nur als Risiko (Beweis-Plan Z. 194–195) | Bausteine sind da: `einbettung.ts` trägt ein feines Netz auf einer groben Haut, `verdichten.ts` legt Punkte rund. Florians Satz „es sollte einfach nur abrunden, aber in exakt der gleichen Form“ (Z. 1081–1082) beschreibt genau eine Unterteilung. |
| **Anzeige feiner als das Rechennetz** | nie | Anzeige und Löser teilen das Netz | Würde „grobe kleine Details“ von der Dichte im Löser trennen. `genauHaut` scheiterte am Löser, nicht an der Anzeige. |
| **Harte statt weicher Bindungen** | nie | Gewicht fest 100 (`loops.ts:882–883`) | Die Genauigkeit ist kein Problem (Linie ↔ Pfad 0,00, Z. 489). Der mögliche Nutzen läge in der Struktur (Linienpunkte fallen als Unbekannte weg). Offen, kein klarer Gewinn. |
| **Neue Punkte beim Verdichten auf eine glatte Fläche** | **gebaut** | `verdichten.ts:7–9` (kubisch nach den Normalen der Enden, auf Linien genau auf dem Pfad) | Nicht versucht: das Maß beim Netzwechsel abgleichen (je Punkt den Unterschied „gemessen neu − Soll“ einmal merken), sodass das verfeinerte Netz von selbst im Gleichgewicht ist. Das würde den Sprung beim Standard-Löser an der Wurzel nehmen (vermutet; Preis: ein kleines Gedächtnis des Diskretisierungsfehlers). |
| **Kanten klappen** | teils | `verdichten.ts:4–5` (zur Wertigkeit 6, nur beim Verdichten); `intrinsisch.ts` (nur rechnerisch) | Ein gleichmäßiges Netz, wie FiberMesh es voraussetzt, wurde nie hergestellt. „Tangential entspannen“ einmal verworfen (Z. 715–716), ohne Angabe, ob die Punkte auf der Fläche blieben. |
| **Gleichmäßiges Startnetz** | nie | Start aus Surface Nets; Dreiecke im Mittel 1,77 gestreckt (Z. 1093) | Die Bilanz nennt es (Punkt 9), ohne Schritt daraus. |
| **Lineares Verfahren** (Andrews, Joshi, Carr 2011) | nie, nicht zitiert | „Andrews“ kommt nicht vor | Verwandt: Rückfall „rein linear aus der Richtung“ (Recherche Z. 129), nie gebaut. Verworfen wurde nur eine dünne Platte als Höhenfeld in `form.html?linien` (`linien-aus-dem-netz.md` Z. 238–239), ein anderes Verfahren. Mit Lage **und** Richtung an den Linien ist ein lineares System eindeutig und in einem Schritt gelöst; die Richtung liefert `richtung.ts` schon (≤ 0,52°). Vorbehalt: Bei weiten Zügen altert die Metrik, auf der das System steht. |
| **Krümmung an Kreuzungen aus den Kurven selbst** (Satz von Euler) | in anderer Form ja, aber nur im alten Löser | `kruemmung.ts:9–24` (Tensor aus den Linien, 06.11.); Anläufe in Abschnitt 13 skalar | Kreuzen sich zwei Linien, geben ihre Krümmungen längs zusammen die mittlere Krümmung dort, ohne Messung an der Haut. Nie mit dem Lösen über die ganze Haut verbunden. |
| **Gedächtnis-Löser gegen Sprung und Nachhinken messen** | nie | kein Vorkommen nach Z. 401 | siehe 2.2, V10 |
| **Wegunabhängigkeit messen** | nie | — | siehe 2.2, V17 |
| **Tempo-These billig prüfen** | nur im Kern | Bilanz Z. 203–205 (Ohr 0,23 gegen 2,41 bei vierfachen Runden) | Im Fenster mit Florian ginge es ohne Umbau: `?dreiecke=1500` oder ein langsamer Zug geben dieselbe Zahl Runden je Weg wie ein vierfach schneller Kern. Vor WebAssembly machen. |

---

## 4. Annahmen, die sich durch alle Versuche ziehen

1. **Eine Runde = an der Haut messen → Krümmung verteilen → Lagen lösen** (`ausKurven.ts:890–1093`). Alle Varianten vom 08./09.11.
   ändern nur, womit gemessen oder gelöst wird. Nie gefragt: Welche Größe wird eigentlich kleinstmöglich gemacht?
2. **Die Krümmung an den Linien wird an der Haut gemessen**, und zwar an den schlechtesten Punkten des Netzes: Eingesetzte Linien
   haben schmale Dreiecke und kurze Kanten, der Löser misst dort 9–225 % des Werts (Z. 942–945). Die Session hat das erkannt
   (Z. 1028–1029), aber auch die Richtungs-Variante speiste wieder über eine Messung an der Haut ein.
3. **Gerechnet wird nur, wenn sich die Maus bewegt, und in festen Rundenzahlen.** Im Zug 1–2 Runden je Ereignis
   (`kurven.ts:2075–2079`), beim Loslassen 4 (`:2305`), beim Setzen 4 (`:1459–1462`), nach Kante oder Löschen 12 (`:255`). Kein
   Abbruch nach Rest. Hält Florian die Maus still, bleibt der Rückstand stehen und entlädt sich beim Loslassen. Der Stand in der Ruhe
   ist „vier Runden weiter“, nicht „fertig“; der nächste Griff rechnet daran weiter.
4. **Verfeinern ist ein Ereignis mit neuem Löser.** Jeder neue Löser beginnt mit voller Schrittweite und ohne Start aus der letzten
   Lösung (`ausKurven.ts:194–196`, `913–916`; neue Löser in `kurven.ts:1455`, `1662`, `3175`). Beim Einwechseln im Zug und beim
   Setzen nach dem Loslassen geht der Dämpfungszustand verloren (vermutet: ein Grund für „schwingt einmal hin und zurück“).
5. **Die ganze Haut je Runde, ein Netz für Rechnen und Zeigen.** Auflösung, Tempo und Stabilität hängen deshalb aneinander.
6. **Die Verteilung der Punkte in der Fläche bleibt eingefroren** (`tang` in `vermessen`, `ausKurven.ts:11–13`). Das Netz bleibt
   gestreckt; also muss das Maß die Streckung aushalten. FiberMesh geht den anderen Weg (gleichmäßiges Netz).
   Beweis B war ausdrücklich „wie FiberMesh, gleichmäßiges Netz“ bestellt (Z. 99–100) und mit „Ziele nur in Normalenrichtung,
   Kantenlängen an den Linien, danach gleichmäßig neu vernetzt“ beschrieben (Z. 84–86). Gebaut wurde keins der drei. Die
   Netzabhängigkeit wurde später als „FiberMesh hat dieselbe Schwäche“ verbucht (Z. 1100).
7. **Ein Löser für alles: entweder gleiche Gewichte oder Geometrie.** Nie: verschiedene Löser für verschiedene Phasen (sofortige
   Antwort im Zug, genaue Form als Ziel).
8. **Wo keine Linie die Form festlegt, füllt die Haut von gestern.** Es gibt keine Regel dafür. Die Bilanz nennt das „eine Frage für
   später“ (Z. 227–228). Es ist die Frage hinter „bläst sich in Stufen auf“.
9. **Linien sind Kanten des Netzes.** Jede Linienänderung ändert das Netz und erzeugt die schlechten Dreiecke aus Annahme 2.
10. **Bindungen weich, Lagen als kleinste Quadrate** (`loops.ts:882–883`, Normalgleichungen in `normalSystem.ts`). Nie hinterfragt;
    vermutlich unschädlich.
11. **Geprüft wird an der frischen Kugel mit drei Loops und 5 200 Punkten**, mit dem größten Abstand eines Punkts aus einem Lauf.

---

## 5. Die fünf Entscheidungen der Bilanz (Abschnitt 8): die richtigen Fragen?

1. **„Prinzip bestätigen, Käfig nur fürs Spielnetz?“** — Berechtigt, aber es sind zwei Fragen, und die wichtigere fehlt: **Was soll
   gelten, wo keine Linie die Form festlegt?** (rundeste Form ohne Gedächtnis · Form von vorher · der Editor verlangt oder setzt dort
   eine Querlinie). Das entscheidet über Ohr, Horn, Rüssel und über das Aufblähen. Florian kann das am Beispiel entscheiden.
2. **„Tempo zuerst?“** — So nicht entscheidungsreif.
   - Einer der zwei billigen JavaScript-Schritte ist schon gebaut (siehe 6.1).
   - Das Kriterium „Runde ≤ 5 ms bei 5 000 Punkten“ ist am Prüfnetz bemessen, nicht an Florians Netzen.
   - Die These lässt sich vorher ohne Umbau im Fenster prüfen (Abschnitt 3, letzte Zeile).
   - Drei billigere Hebel sind unversucht: Runden von der Maus entkoppeln, Vorhersage, Dämpfungszustand mitnehmen.
   - Tempo behebt weder die Mehrdeutigkeit noch das Wachsen umgestülpter Stellen (Planseite Z. 899–900).
3. **„Grundform immer symmetrisch?“** — Richtige Frage, eigene Sache. Sie vereinfacht den Code, hat aber mit Florians Klage nichts
   zu tun. Nicht mit den anderen in einen Topf.
4. **„Punkte wo nötig?“** — Zu klein gestellt. Dahinter steht: Die ganze Haut reagiert auf 1,4 % Abweichung einer Linie (Kugel im
   Mittel 1,1 statt 0,2, Bilanz Z. 245–247). Das ist eine Eigenschaft des Verfahrens (Form aus der Krümmung der Linien), keine
   Geschmacksfrage. Florian hat schon geantwortet: „etwas besser, muss weiter testen“.
5. **„Umkehr-Griff: rot oder begrenzen?“** — Richtige Bedienfrage. Sie ersetzt aber nicht, dass der Löser eine umgestülpte Stelle
   nicht weiter wachsen lassen darf (Z. 806–811).

**Es fehlen:** die Frage aus Punkt 1; „erst die offenen Messungen, dann Tempo“; und für Florian ein Gefühlstest der getrennten Teile
(`?gewichte=geometrie&live=0`; `?haut=gedaechtnis`), bevor über den Standard-Löser entschieden wird.

---

## 6. Fehler und Widersprüche in den Dokumenten

1. **Bilanz Z. 298 und Z. 328:** „Drei Spalten in einem Durchgang lösen“ als offener Schritt mit „vielleicht 1,5-mal schneller“.
   Das ist gebaut: `loesen` ruft `loesenSpalten(rhs, 3)` in einem Durchgang (`WT/packages/shape/src/loeser/zerlegung.ts:289–323`),
   im Kommentar seit „06.11.“ (`normalSystem.ts:19–20`). Der Gewinn ist schon eingerechnet.
2. **Planseite Z. 174 gegen Z. 225–232 und die Tests:** „überall gleich oder besser“ (siehe 2.2, V10).
3. **Planseite Z. 899–900 gegen Bilanz Z. 33–34:** „Schneller rechnen ändert nichts“ gegen „der Hebel ist Tempo“.
4. **Planseite Z. 820 gegen Z. 1137:** derselbe Fall 11,4 und 4,6 Einheiten, ohne Erklärung.
5. **Planseite Z. 1071:** „An der Kuppel wird es schlechter“ — Artefakt des mehrdeutigen Tests (siehe 2.2, V22).
6. **„Tag 1“, „am ersten Tag“** in den Überschriften der Abschnitte 15 und 18: laut Git 101 bzw. 17 Minuten. Kein inhaltlicher
   Fehler, aber Florian liest daraus mehr Gründlichkeit, als da war.
7. **Bilanz Z. 318/327:** will die „Krümmung mit Richtung“ als Altlast entfernen. Sie ist der einzige vorhandene Baustein, der die
   Krümmung aus den Linien statt von der Haut nimmt (siehe 2.2, V20). Vor dem Löschen prüfen.

---

## 7. Messungen, die fehlen (in dieser Reihenfolge, jede klein)

1. **Wegunabhängigkeit** an Ohr, Hörnern, Rüssel: gleiche Endlinien, zwei Wege, Formen vergleichen (größter Wert, 99 %, Mittel).
2. **Rückstand bei stehender Maus:** im Kern nach dem letzten Mausschritt Runde für Runde den Rest ausgeben (`KONVERGENZ=1` gibt es).
   Wie viele Runden bis ½ px? Das sagt, was „weiterrechnen, solange gehalten wird“ bringt.
3. **Gedächtnis-Löser** in `form-loslassen-probe.mjs` und `form-drei-faelle.mjs`.
4. **Geometrie ohne Verfeinern im Zug** (`?live=0`) und **Geometrie mit `genauHaut`** — die zwei unbelegten Aussagen der Bilanz.
5. **Jede Fenster-Zahl dreimal**, mit Spanne. Dafür die zweite Runde an eine feste Regel binden statt an die Uhr.
6. **Mitgelöst** mit grober innerer Toleranz: Runden und Reste zählen; Hörner im Fenster.
7. **Tempo-These im Fenster** mit `?dreiecke=1500` und Florians Hand.

## 8. Grenzen dieser Prüfung

- Ich habe nichts gemessen. Alle Zahlen stammen aus den Dokumenten; meine Rechnungen daraus sind einfache Überschläge.
- Die Rückstands-Abschätzung in 2.2 (V26) nimmt eine feste Aufholrate je Runde an. Das ist ein Modell, keine Messung.
- Die Aussage „Ohr, Rüssel, Hörner sind quer unbestimmt“ ist aus dem Aufbau der Proben gelesen; dass daher der Rest kommt, ist vermutet.
- Die Vorschläge in Abschnitt 3 sind nicht erprobt. Für keinen behaupte ich, dass er Florians Kriterien hält.
