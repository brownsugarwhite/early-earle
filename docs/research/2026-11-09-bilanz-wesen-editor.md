# Bilanz Wesen-Editor seit dem 11.10.: was wir probiert haben, was trägt, was wir vereinfachen (09.11.2026)

**Anlass.** Florian: „Wir haben jetzt soo viel probiert. Kannst du es mir nochmal alles genau zusammenfassen? Und welche
Kombinationen es gibt. Was der aktuell beste und eleganteste Weg ist. Und überprüfe bitte, ob wir vllt etwas übersehen haben oder
eine alte Regel das Verfahren oder Tests verfälscht. … Gehe alles, was wir seit Anfang der Editorarbeit angefangen haben, nochmal
durch und kontrolliere ehrlich auf Relevanz. Für mich ist es wichtig, dass ich schnell und genau die Charaktere erstellen kann. Wenn
das im Browser geht, ist es schön. Wenn technisch eine richtige Software eleganter und besser wäre, sollten wir das in Erwägung
ziehen.“

**Grundlage:** der Verlauf in `CLAUDE.md`, die Planseiten und Recherchen seit dem 11.10., der heutige Code
(`packages/shape/src/dicht/`, `apps/editor/src/form/`) und die Messungen vom 08. und 09.11. Am Code wurde nichts geändert.

## Kurzfassung

- **Vier Abschnitte.**
  1. Drei Profile → Loft (11.–12.10.).
  2. Käfig aus den Silhouetten (13.10.–04.11.).
  3. Dichte Form aus den Ansichten (`form.html`, 04.–05.11.).
  4. Kurven als Wahrheit (`kurven.html`, seit 05.11.).
  
  Die ersten drei holten die Form aus den Umrissen der Ansichten. Erst der vierte holt sie aus Linien auf dem Körper
  (FiberMesh-/Illustrator-Prinzip).
- **Der richtige Weg ist der vierte.** Er passt zu deiner Arbeitsweise: Linien und Punkte wie in Illustrator, Werkzeuge wie in
  Blender, Umrisse nur als Ergebnis. Maul, Pose und Backen laufen darin schon. Keiner der alten Wege wird mit dem neuen Prinzip
  insgesamt eleganter (Abschnitt 5). Zwei Teile davon sind aber wieder nützlich: die Startform aus einer Seitenzeichnung und das
  Stücknetz für das Spielnetz.
- **Was heute noch stört, hat zwei Ursachen:**
  - Der Standard-Löser (gleiche Gewichte) rechnet auf einem anderen Netz eine andere Form. Deshalb bläht sich die Form nach dem
    Loslassen in Stufen auf, und bei extremen Griffen werden Stellen schwarz.
  - Der Löser nach der Geometrie hat dieses Problem fast nicht (Hörner nach dem Loslassen 4,6 statt 23,3 Einheiten, kaum Schwarz),
    ist aber zu langsam: nur eine Runde je Mausbewegung, dazu Halte beim Verfeinern. Das sind das Nachhinken und Ruckeln, die dich
    am 08.11. gestört haben.
- **Die drei Löser-Beweise vom 09.11. haben nichts gebracht.** Weitere Formeln am Löser haben gemessen keinen Hebel mehr. Der Hebel
  ist Tempo, dazu Aufräumen.
- **Übersehen oder verfälscht** (Abschnitt 4):
  - Die Kern-Probe rechnet viermal so viele Runden je Zug wie das Fenster. Dadurch sah das Nachhinken im Kern bis zehnmal kleiner
    aus.
  - Die Kugel mit einem Ring ist als Test mehrdeutig.
  - Den Geometrie-Löser hast du am Tempo gemessen, nicht an der Form.
  - Die Dichte bleibt nur deshalb bei „nach Länge“, weil der Standard-Löser feinere Netze nicht verträgt.
  - Viel Altcode und Versuchsschalter; eine halbe Haut statt der ganzen spiegelgleichen wäre einfacher.
- **Browser oder richtige Software:** Die Form-Fragen löst keine Plattform. Eine schnellere Rechnung löst aber genau das, was noch
  fehlt: Nachhinken, Ruckeln, dichtere Netze und den sauberen Löser. **Empfehlung:** Die Oberfläche des Editors bleibt, nur der
  Rechenkern kommt aus JavaScript heraus. Zuerst wird gemessen, ob WebAssembly reicht (dann bleibt der Browser); sonst ein natives
  Modul in der vorhandenen Electron-App.

## 1. Was wir seit dem 11.10. gemacht haben

### A. Drei Profile → Loft (11.–12.10.)

- **Ansatz:** Seite, Front und Top wie in Illustrator, gekoppelt; daraus ein Platzhalter-Loft. Dazu Versuche: Kanten mit Härte
  (Strich 1–3 px), Spanten, Wirbelsäule, Maul/Zahn/Rig-Tabs, Schnitt-Loft, „rund“.
- **Die Form kam aus:** drei Silhouetten.
- **Deine Kritik:** Kopplung nur am entsprechenden Punkt, keine automatischen Punkte („genau wie in Illustrator“); „Das mit den
  Kanten und Härten scheint mir noch nicht ganz schlüssig“; Formen und Mäuler passen nicht; am Ende „Alles bis jetzt waren nur
  Tests und Recherche!“
- **Was bleibt:** Punkte und Griffe wie Illustrator, Blender-Navigation, das Electron-Gerüst, Library, Undo.

### B. Käfig aus den Silhouetten (13.10.–04.11.)

- **Ansatz:** Ein Catmull–Clark-Käfig ist die einzige Wahrheit, deine Kurven sind Griffe. Der Käfig wird aus den drei
  Silhouetten abgeleitet (Röhre mit Ringen und Kappen) und von einem Löser auf die Zeichnungen gezogen. Darauf aufgebaut:
  - Maul (Plattenmaul, Kiefer getrennt, später Maul als Einsatz mit Kernring und Leiter);
  - Posen (Knochen + Blendshape je Pose);
  - Teile (Baum, Kragen, seitliche Teile), Umrisse berühren, Querschnitt aus der Hülle;
  - P-Linien als Käfigschleifen, ⌘R-Loops;
  - Schleifen-Käfig (P1) und Stücknetz im Maulfeld (P2).
- **Die Form kam aus:** den Silhouetten (Sichthülle), am Ende aus Umrissschleifen.
- **Deine Kritik:**
  - Tiger-Kopf „besser als alle Versuche zuvor“, aber „vor allem das Maul passt noch nicht“ (14.10.).
  - Form weicht von der Zeichnung ab (15.10. morgens).
  - Das Maul zerstört den Körper: Bauch und Nase kollabieren, Kinnwand, J-Mundwinkel unmöglich, Unterbiss reißt (15.10. mittags).
  - Flügel fehlen, Kopf eingedrückt, Raute statt Ellipse (16.10.).
  - „Die Linien wirken immer noch sehr sehr wild“ (20.10.).
  - „Bauen wir gerade wieder viele Sonderregeln? Ist der Beweis erbracht oder nicht?“ (03.11.); am 04.11. warst du stark
    verunsichert.
- **Gelobt:** die Oberfläche („wirkt alles schon ganz gut“), „Zeichnung ist Form“ („passt weitestgehend“), die Einordnung der
  Teile, die ersten Posen.
- **Ursache (04.11.):** Die Topologie stand vor der Form (Käfig als Wahrheit, dann auch noch Käfig = Spielnetz). Außerdem kam die
  Form aus drei Silhouetten, die sich widersprechen. Jedes Merkmal (Maul, Teile, Kappen, Kanten) brauchte eigene Regeln, allein der
  Kernring gut 20 Schalter.
- **Was bleibt:**
  - das Editor-Gerüst (Stamm, Tafel, Dock, Bühne mit Blättern, Worker, Pauspapier);
  - das Posen-Konzept (Knochenstellung je Pose, Rig gemeinsam, Blendshape);
  - Zähne, Augen, Earle-Material mit Zonen-Atlas, Feuer/Gas/Fell;
  - das Wissen aus dem Stücknetz (für das Spielnetz, Abschnitt 5).

### C. Dichte Form aus den Ansichten (`form.html`, 04.–05.11.)

- **Ansatz:** ein dichtes Netz statt eines Käfigs.
  - Die Seite ergibt einen runden Körper (Vereinigung der größten Kugeln).
  - Linien werden Kanten (Strich = Härte, die Form wächst zu den Linien).
  - Front und Top strecken den Körper, später alle Ansichten gleichwertig (Ellipsoide).
  - Varianten `?netz` und `?linien`.
  - Dazu Maul (Schnitt + Gewölbe), Backen, Posen, Kiefer trennen, Teile.
- **Die Form kam aus:** den Ansichten (Volumen), bei `?linien` aus Raumlinien.
- **Deine Kritik:**
  - „Fühlt sich gut an“; Maul und Grundformen „wirken viel eleganter gelöst“.
  - Bei `?netz`: „Es geht irgendwie wieder darum, aus drei Formen eine Form zu erzwingen.“
  - `?linien`: „der Ansatz ist nicht schlecht“, aber viel Feintuning nötig.
  - Teile: „keine gute Lösung … wirkt sehr instabil“.
  - Am 05.11.: Die Outlines „machen bei organischen Formen extrem krumme Linien“, „wenn ich etwas schmaler mache, nehme ich ihm
    auch die Höhe“, Edgeloops und Umrisse „so ungerade mit viel zu vielen Punkten“. Dein Zielbild: „Die Form bläst sich immer zur
    optimalen Rundung auf … die perfekte Mischung aus Vektorwerkzeugen und Blender.“
- **Ursache:** Auch hier ist der Umriss eine Eingabe. Ein Volumen aus Ansichten verschmilzt bei Berührung, und die Ansichten
  widersprechen sich weiter.
- **Was bleibt:** das dichte Netz, Umrisse per Shader, Maulschnitt mit Kiefergewichten, Backen (meshoptimizer), das Posen-Prinzip;
  die runde Startform aus einer Seitenzeichnung (Abschnitt 5).

### D. Kurven als Wahrheit (`kurven.html`, seit 05.11.)

- **Ansatz:** Eine dichte Haut entsteht einmal aus einer Startform. Danach sind deine Loops (geschlossene Bézier-Linien) die
  Wahrheit, und die Haut rechnet sich zwischen ihnen rund. Punkte und Griffe wie in Illustrator, Stift P, G/S/R und O wie in
  Blender, Kante an/aus (knickt rund), Maul als Loop, Fressen-Pose, Verdichten während des Zugs.
- **Die Form kommt aus:** den Kurven.
- **Deine Kritik und was daraus wurde:**

  | Kritik | Ergebnis |
  | --- | --- |
  | Kopf mit zu wenigen Polygonen | Netz verdichtet sich selbst |
  | Griff am Ringende nicht beweglich | behoben |
  | Boden mit Höckern | Krümmung folgt den Loops |
  | Netz „explodiert“ | behoben |
  | Rüssel und Hammer kollabieren | erst Krümmung mit Richtung, dann Löser über die ganze Haut |
  | Pilz bläst sich auf | Kante knickt |
  | „Machen wir wieder Sonderregeln?“ | teilweise ja |
  | Härte ohne Wirkung | Kante an/aus („nur ganz oder gar nicht“) |
  | Punkt hin und zurück ungleich | behoben |
  | Kleine Details eckig | Linien genau |
  | Stift-Form ungenau | behoben |
  | Sprung beim Loslassen | Löser nach der Geometrie mit Verfeinern im Zug; dein Urteil am 08.11.: ohne „viel lieber“, der neue ruckelt, Nachhinken stört mehr als Nachjustieren |
  | Hörner blähen sich in Stufen auf, schwarze Löcher, grobe Details (08.11.) | offen |
  | Lösungen „klingen nach viel Nachjustieren“ (09.11.) | drei Beweise ohne Gewinn |
- **Stand:** siehe Abschnitt 2.

## 2. Was heute steht (`kurven.html`)

**Trägt** (gemessen, meist mit der Maus im Fenster):
- Loops schneiden in allen Ansichten, Formen zeichnen (F), Stift P (≤ 0,35 px neben der Zeichnung), Punkte und Griffe wie in
  Illustrator (ein Punkt ändert nur die Stücke bis zu seinen Nachbarn), Kreuzung = ein Punkt, Spiegelpunkte, Zoom.
- G/S/R mit Achsen, O mit Radius.
- Kante an/aus, knickt rund: Pilz 92°, Linse 83°, Reihenfolge egal.
- Flacher Boden zwischen geraden Loops (0,01–0,25 Einheiten unter der Ebene).
- Linien genau im Netz (Ohr 0,5 px), Hin und zurück genau.
- Maul als Loop: offen dicht, in der Seite 0 umgeklappt bis 55°. Fressen-Pose: Blendshape genau, Grundform bitgleich.
- Backen auf 8 000 Dreiecke (0,2–0,6 px bei 300 px Höhe).
- Tempo im Standard: 14–16 ms je Mausbewegung bei 5 200 Punkten.

**Stört:**
1. **Nachjustieren nach dem Loslassen (Standard):** Hörner 20,0 + 3,3 Einheiten. Ursache: Das Maß des Standard-Lösers liest
   dieselbe Fläche auf dem verfeinerten Netz 7–8 % stärker gekrümmt (nach der Geometrie 1,4–2,3 %).
2. **Nachhinken und Ruckeln (nach der Geometrie):** Eine Runde dauert etwa 10–12 ms, also passt eine je Mausbewegung. Gedämpft holt
   sie am Ohr nur ein Drittel auf, und das Verfeinern hält den Zug 35–52 ms an.
3. **Schwarze Stellen bei extremen Griffen:** Kehrt die Linie an einer Spitze um, faltet die Haut (Standard bei Griff 11: 19,8 % der
   Fläche; nach der Geometrie 16–18 Dreiecke).
4. **Grobe kleine Details:** Verdichtet wird nur nach Kantenlänge, nicht nach Rundung (Ohr: 22,5° Drehung je Kante, Rumpf 4°).
5. **Darunter:** An jedem Punkt einer weichen Linie sagt der Löser „bleib so gebogen, wie du gerade bist“. Die Linien tragen damit
   ein Gedächtnis. Nach der Geometrie wirkt das kaum, mit gleichen Gewichten verstärkt es Punkt 1.

**Fehlt noch:** Speichern/Laden, Startform aus einer Zeichnung, Zähne, Augen, Look (Zonen, Earle-Material), mehrere Posen mit
Überblenden, Einbau in den Editor.

## 3. Die Bausteine und ihre Kombinationen

**Die Stellschrauben:**

| Stellschraube | Varianten |
| --- | --- |
| Woher die Form kommt | drei Silhouetten · Kurven auf der Haut · Startform aus einer Seite, danach Kurven |
| Wie die Fläche dargestellt wird | Käfig (Unterteilungsfläche, Topologie vorab) · Volumen (Kugeln/Ellipsoide, jedes Mal neu vernetzt) · dichtes Netz (fest, verformt, verdichtet) |
| Wie die Haut zwischen den Linien entsteht | Ausgleich auf Ziele aus Silhouetten (Käfig) · Gedächtnis (Startform behalten) · aus den Kurven (Krümmung an den Linien gemessen, wie FiberMesh) · dazu Krümmung mit Richtung · Linien mit Richtung · Krümmung an den Linien mitgelöst |
| Maß der Krümmung | gleiche Gewichte · nach der Geometrie |
| Dichte | fest · nach Länge · Linien genau · im Zug · nach Rundung (offen) |
| Wo gerechnet wird | Hauptthread · Worker · WebAssembly · natives Modul |

**Gebaute Kombinationen:**

| Kombination | Wann | Ergebnis |
| --- | --- | --- |
| Silhouetten + Käfig + Ausgleich | 13.10.–03.11. | an einfachen Körpern genau (0,2–2 px); Regelflut an Maul, Teilen, Kappen; Ansichten widersprechen sich |
| Umrissschleifen + Käfig (P1) | 03.11. | Einteiler gut, Mehrteiler in Front/Top über 2 px (strukturell) |
| Kurven im Maulfeld + Stücknetz (P2) | 03.–04.11. | Prinzip bewiesen (43 von 43 bauen), Genauigkeit 41 von 43 |
| Silhouetten + Volumen (`form.html`) | 04.11. | rund und schnell; Ansichten widersprechen sich, Teile verschmelzen |
| Seite + Raumlinien (`?linien`) | 04.11. | „nicht schlecht“; Linien springen am Hals, Kopf und Bauch im Top nicht getrennt |
| Kurven + dicht + Gedächtnis (+ Krümmung mit Richtung) | 05.–06.11. | gute Bedienung; Höcker, Härte ohne Wirkung; mit Richtung Rüssel und Hammer gut |
| **Kurven + dicht + aus den Kurven, gleiche Gewichte (heute Standard)** | seit 06.11. | Kanten, Boden, Pilz gut; Form hängt am Netz → Aufblähen nach dem Loslassen; Schwarz bei Extremgriffen |
| … + nach der Geometrie + Verfeinern im Zug | 08.11. | Form fast netzunabhängig, kaum Schwarz; Nachhinken und Ruckeln |
| … + Linien mit Richtung | 09.11. | im Hörner-Fall schlechter, sechs Schutzregeln |
| … + Normalen nach Max | 09.11. | kein Hebel |
| … + gleiches Maß beim Messen und Rechnen | 09.11. | schlechter |
| … + Krümmung an den Linien mitgelöst | 09.11. | ohne Gedächtnis, aber nicht besser, 35-mal langsamer |

**Nicht gebaut und sinnvoll:**
- Startform aus einer Seitenzeichnung (wie `form.html`), danach Kurven (wie `kurven.html`).
- Kurven + dicht + nach der Geometrie + **schneller Kern** + Dichte nach Rundung. Das ist die Empfehlung (Abschnitt 7).
- Spielnetz aus den Loops (Stücknetz, Abschnitt 5).

**Nicht gebaut, geprüft und nicht empfohlen:** Flächenstücke über das Kurvennetz (Abschnitt 5, „Käfig aus dem Kurvennetz“).

## 4. Ehrliche Prüfung: übersehen, verfälscht, unnötig kompliziert

**Tests, die etwas anderes gemessen haben, als du siehst:**
1. **Die Kern-Probe rechnet viermal so viele Runden je Zug wie das Fenster:** 60 Mausschritte mit je zwei Runden gegen 30
   Mausbewegungen mit meist einer. Deshalb sah das Nachhinken im Kern bis zehnmal kleiner aus (Ohr im Kern 0,23 Einheiten, im
   Fenster 2,41). Meine Aussage vom 09.11. („am Hals hält der Geometrie-Weg die Kriterien“) gilt nur im Kern.
2. **Die Kugel mit einem Ring ist als Test mehrdeutig.** Jede Kugel durch den Ring ist eine glatte Lösung (gemessen: Von ×1,25 aus
   endet sie als Kugel, deren Mitte 8 Einheiten über dem Ring liegt). Der Test hat zwei Beweise geleitet. „Mit Richtung eindeutig“ galt nur, weil die Normale
   der richtigen Kugel vorgegeben war.
3. **Der Sprung im Kern wird ohne Verfeinern im Zug gemessen.** Damit misst er vor allem, wie ungenau das gestreckte Netz beim
   Greifen ist. Im Fenster (mit Verfeinern im Zug) ist der Rest vor allem Nachhinken.

**Urteile, die an etwas anderem hingen:**

4. **Geometrie gegen Standard bei ungleichem Tempo.** Den Geometrie-Löser hast du am 08.11. wegen Ruckeln und Nachhinken verworfen.
   Beides sind Folgen des Tempos (eine Runde je Bewegung, 35–52 ms Halt beim Verfeinern), nicht der Form. Mit einem schnelleren
   Kern fiele der Vergleich anders aus.
5. **Die Dichte bleibt bei „nach Länge“, weil der Standard-Löser feinere Netze nicht verträgt.** „Haut genau“ (dichter an kleinen
   Details) wurde verworfen, weil der Standard-Löser auf feinerem Netz eine andere Form rechnet. Mit dem Löser nach der Geometrie
   wäre Dichte nach Rundung ungefährlich. Deine groben Ohren hängen also am Löser, nicht an der Dichteregel.

**Unnötig kompliziert:**

6. **Zwei Löser für eine Haut.** Die Grundform rechnet „aus den Kurven“, Pose und Anlegen neuer Linien „mit Gedächtnis“.
   - Das Gedächtnis hat dort einen Grund: Wenige Linien legen die Form nicht fest. Aus den Kurven gerechnet zog schon der erste
     Ring die Kugel um 10 Einheiten weg; in der Pose stört die Maulöffnung das Krümmungsfeld.
   - Die Krümmung mit Richtung (`KruemmungsFeld`, gebaut für den Gedächtnis-Löser) wirkt aber nur noch hinter `?haut=gedaechtnis`.
   - Beide Löser zu einem zu machen, ist deshalb keine reine Aufräumarbeit, sondern eine Frage für später: Was gilt, wo keine Linie
     die Form festlegt?
7. **Ganze spiegelgleiche Haut.** Jeder Netzschritt muss Spiegelpaare pflegen: Einsetzen (spiegelgleiche Vierecke mit Mittelpunkt),
   Teilen, Zusammenlegen (Journal je Dreieck) und nach jeder Lösung eine Symmetrie-Korrektur. Eine halbe Haut mit Spiegelrand wäre
   einfacher; die Pose würde erst am Ende gespiegelt. Das geht nur, wenn die Grundform immer symmetrisch ist (Entscheidung 3).
8. **Altlasten.**
   - `dicht/` hat knapp 16 000 Zeilen (dazu 4 900 Zeilen Tests). Große Teile stammen aus `form.html` und werden im heutigen Weg
     nicht mehr gebraucht (Ellipsoide, `?netz`, `?linien`, Teile, Raumlinien, Kantenprofile).
   - `kurven.html` hat 17 Schalter, dazu kommen 52 Proben.
   - Die Hintergrund-Zerlegung mit Einwechseln gibt es nur, weil das Zerlegen in JavaScript langsam ist (0,23 s bei 7 900 Punkten,
     1,2 s bei 27 800).
   
   Das bremst jede Änderung und jede Prüfung.
9. **Unregelmäßiges Startnetz** (Surface Nets). Es verstärkt die Netzabhängigkeit des Standard-Maßes; schon die unberührte Kugel
   wird ohne Verteilung uneben (145–158).

**Kleinere Punkte:**

10. **Ein Halbkreis als ein Bézier-Stück** liegt bis 1,4 % neben dem Kreis. Weil die Haut aus den Linien entsteht, wird sie
    sichtbar weniger rund (Kugel nach dem ersten Zug im Mittel 1,1 statt 0,2 Einheiten). „Punkte wo nötig“ (Viertelkreise) behebt
    das; deine Wahl steht aus.
11. **Ein Griff, der die Linie umkehren lässt,** macht in jedem Löser eine Falte. Das ist eine Bedienfrage (Linie rot zeigen oder
    Griff begrenzen), keine Löserfrage.

**Alte Regeln, die damals verfälscht haben** (heute erledigt, für die Bilanz):

12. Käfig = Spielnetz: Die Form musste in ein grobes Budgetnetz passen.
13. Abnahme an der Abweichung von den Silhouetten: Gemessen wurde gegen Zeichnungen, die sich widersprechen.
14. Form aus drei Silhouetten statt aus Linien.

**Nicht unnötig kompliziert** (bleibt):
- Loops als Kantenketten im Netz: nötig für echte Knicke.
- Gespeicherte Griffe: Illustrator-Verhalten.
- Verdichten mit genauen Linien: nötig für kleine Details.
- Backen mit meshoptimizer: einfach und genau.

## 5. Alte Wege mit dem Kurven-Prinzip neu bewertet

| Weg | Damals | Mit „Kurven als Wahrheit“ heute | Urteil |
| --- | --- | --- | --- |
| Drei Silhouetten als Form (Loft, Käfig, Ellipsoide) | Ansichten widersprechen sich, Form weicht ab | Umrisse sind Ergebnis (Shader) | bleibt verworfen; **eine Seitenzeichnung als Startform** ist aber gut („fühlt sich gut an“) |
| **Käfig aus dem Kurvennetz** (Kreuzungen = Punkte, Felder = Flächen, Fläche per Unterteilung oder Coons/Gregory) | nie gebaut; der Käfig kam aus Silhouetten | genau, ohne Löser, Verfeinern ändert nichts, Härte 0–3 als echte Kantenschärfe (Pixar). Aber: Zwischen wenigen Linien wird die Fläche flach, wenn die Linien keine Richtung mitgeben (erwartet, nicht gemessen: Eine Kugel mit drei Loops würde ein abgerundetes Oktaeder). Jede Augen- oder Maulform in einem Feld macht ein Loch, das zerschnitten werden muss; Einzel-Loops und n-Ecken brauchen eigene Muster. Das ist dieselbe Regelfamilie wie im Käfig. | **nicht für die Form; für das Spielnetz sehr gut** (Backen entlang der Loops, Zonen und UVs je Feld, Detailstufen). Das Wissen aus P2 passt genau; das sagtest du am 05.11. selbst („Edgeloops … später Guidelines für die Topologie“) |
| Härte 0–3 | im dichten Netz netzabhängig | nur in einer Unterteilungsfläche echt | bleibt Kante an/aus; käme beim Spielnetz aus dem Kurvennetz zurück |
| Pinsel in der Grundform | Deltas im Käfig | widerspricht „Kurven als Wahrheit“ (der Löser würde ihn überschreiben) | nur in Posen (Blendshape) |
| Teile | instabil | Loops um Kopf und Bauch decken es ab | verworfen |
| Maul als Einsatz (Kernring, Stücknetz) | gut 20 Schalter | Maul als Loop: Schnitt + Gewölbe, viel einfacher | verworfen |
| Posen (Teil B: Stellung je Pose, Rig gemeinsam, Überblenden) | gelobt | lebt in der Fressen-Pose weiter | übernehmen, mehrere Posen und Überblenden fehlen |
| Zähne, Augen, Look, Feuer/Gas/Fell | für den Käfig gebaut | unabhängig von der Form | übernehmen, auf dichte Haut bzw. Spielnetz umstellen |
| Editor-Gerüst | „wirkt ganz gut“ | `kurven.html` ist nur ein Prüffenster | übernehmen, `kurven.html` gehört hinein |
| Umrisslinien (V2), Umrissplan (P1) | „sehr sehr wild“ | Umrisse vom Shader | verworfen |
| Linien mit Richtung | Messung nicht robust | Richtungen aus dem Netz stimmen (≤ 0,52°) | Wissen; gebraucht nur für Flächen über das Kurvennetz |

**Kurz:** Mit dem neuen Prinzip wird kein alter Form-Weg eleganter. Der Käfig kommt aber an einer anderen Stelle zurück, beim
Spielnetz, und zwar aus deinen Loops statt aus Silhouetten.

## 6. Browser oder richtige Software?

**Was keine Plattform löst:** wie die Haut zwischen den Linien entsteht, Topologie, Bedienung. Eine native App hätte dieselben
Form-Fragen gehabt.

**Was an der Rechengeschwindigkeit hängt, und das ist fast alles, was noch stört:**
- Nachhinken: wie viele Runden in eine Mausbewegung passen. Heute eine (10–12 ms). Jede weitere holt am Ohr etwa ein Drittel auf.
- Ruckeln: Halte beim Verfeinern (35–52 ms).
- Dichtere Netze (Dichte nach Rundung) machen jede Runde teurer.
- Der saubere Löser (Krümmung mitgelöst, ohne Gedächtnis) war in JavaScript 35-mal zu langsam.
- Zerlegen: 0,23 s bei 7 900 Punkten, 1,2 s bei 27 800. Deshalb gibt es die Hintergrund-Zerlegung mit Einwechseln.

**Möglichkeiten** (Faktoren sind Schätzungen, zu messen):

| Weg | Gewinn | Aufwand und Folgen |
| --- | --- | --- |
| JavaScript verbessern: Verfeinern und Matrixaufbau in den Worker, drei Spalten in einem Durchgang lösen | Halte weg; Runde vielleicht 1,5-mal schneller | klein, nichts Neues |
| Rechenkern in WebAssembly (Rust oder C++, z. B. Eigen) | Runde vielleicht 2- bis 4-mal schneller; läuft im Browser und in Electron | mittel; Prüfwege (Vite, Playwright) bleiben |
| Natives Modul in der vorhandenen Electron-App (C++ mit Eigen, CHOLMOD, OpenSubdiv) | Zerlegen etwa 10- bis 30-mal, Runde 5- bis 10-mal schneller; ausgereifte Bibliotheken statt eigener Numerik | größer; Editor nur noch auf dem Mac (kein Browser), C++-Bau je Electron-Version, Prüfungen über Electron |
| Ganz eigene native App (Swift/Metal, Qt) | wie natives Modul | sehr groß, die Oberfläche gibt es schon — nicht sinnvoll |
| Blender als Grundlage | du kennst es | eigene Löser in Python zu langsam; wir kämpften gegen Blenders Modell; Ziel ist ein Editor, der schneller ist als Blender — nicht sinnvoll |

**Empfehlung:** Die Oberfläche bleibt (Electron, im Browser lauffähig). Nur der Rechenkern zieht um, und das stufenweise nach
Messung:
1. die billigen Schritte in JavaScript;
2. reicht das nicht, derselbe Kern als WebAssembly;
3. reicht auch das nicht, ein natives Modul.

Das Spiel auf dem iPhone braucht nur das gebackene Netz und ist davon nicht betroffen.

## 7. Empfehlung: der beste und eleganteste Weg

1. **Prinzip bleibt:** Kurven als Wahrheit auf einer dichten Haut. Nur hier steuerst du die Form direkt über Linien, ohne dass eine
   Topologie-Vorlage oder Ansichten dazwischenfunken.
2. **Der Löser nach der Geometrie wird Standard, sobald er schnell ist.** Dann bleibt die Form nach dem Loslassen stehen, Nachhinken
   und Ruckeln sind weg, und Dichte nach Rundung wird möglich (feine Ohren).
3. **Vorher aufräumen:** Altlasten aus `form.html`, die Krümmung mit Richtung und die Versuchsschalter entfernen. Die halbe Haut
   mit Spiegelrand folgt nach Entscheidung 3.
4. **Danach der Weg zum Charakter:** Startform aus einer Seitenzeichnung, Speichern, Einbau in den Editor (Gerüst, Library), Zähne,
   Augen, Look, mehrere Posen; zuletzt das Spielnetz aus den Loops.

**Kleiner Plan** (je Schritt ein Kriterium, du urteilst über das Gefühl):

| Schritt | Inhalt | Kriterium |
| --- | --- | --- |
| 1. Aufräumen | Altlasten aus `form.html`, Krümmung mit Richtung, Versuchsschalter und Versuchspfade (Richtung, Max-Normalen) entfernen | alle heutigen Proben gleich |
| 2. Tempo | erst JavaScript (Worker, drei Spalten), dann messen; reicht es nicht: WebAssembly | kein Halt über 16 ms beim Verfeinern; Runde ≤ 5 ms bei 5 000 Punkten |
| 3. Geometrie-Standard | so viele Runden je Mausbewegung, wie in 16 ms passen | dein Test im Fenster: kein spürbares Nachhinken, nach dem Loslassen ≤ ½ Bildpunkt bei normalen Zügen |
| 4. Dichte nach Rundung | Kanten teilen, wo die Normale je Kante stärker dreht | Ohr ≤ 8° je Kante, höchstens 1,5-mal so viele Punkte |
| 5. Umkehr-Griff | Linie rot oder Griff begrenzen (deine Wahl) | keine schwarzen Stellen ohne Umkehr |

## 8. Deine Entscheidungen

1. **Prinzip „Kurven als Wahrheit, dichtes Netz“** als Grundlage bestätigen, den Käfig nur noch fürs Spielnetz?
2. **Tempo zuerst** (JavaScript → WebAssembly → nativ, je nach Messung)?
3. **Grundform immer symmetrisch?** Dann rechnen wir nur eine Hälfte (einfacher, schneller); Posen dürfen weiter schief sein.
4. **„Punkte wo nötig“** (Viertelkreise) als Standard für neue Loops?
5. **Griff, der die Linie umkehren lässt:** rot zeigen oder begrenzen?

## Quellen im Repo

- Verlauf: `CLAUDE.md` (Stand-Liste ab 11.10.).
- Käfig-Zeit: `docs/plans/2026-10-13-wesen-editor-2.md`, `…/2026-10-15-maul-einsatz-harmonie-posen.md`,
  `…/2026-10-16-liniennetz-zielform-kaefig.md`, `…/2026-10-20-vektorillustration-bedienung.md`, `…/2026-11-02-pruefplan-p0-p3.md`;
  Recherchen `docs/research/2026-10-16-sculptris-oder-kaefig.md`, `…/2026-10-21-netz-und-linien-gesamt.md`.
- Form zuerst: `docs/plans/2026-11-04-beweis-form-zuerst.md`, `docs/research/2026-11-04-linien-aus-dem-netz.md`.
- Kurven als Wahrheit: `docs/plans/2026-11-06-kurven-als-wahrheit.md` (Abschnitte 1–18),
  `docs/research/2026-11-09-fibermesh-monstermash-richtung.md`.
- Florians Klarstellungen wörtlich: `docs/plans/2026-10-22-klarstellungen.md`.
