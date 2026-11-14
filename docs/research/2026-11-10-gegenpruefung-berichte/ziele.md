# Florians Ziele als Prüfliste (Gegenprüfung „Kurven als Wahrheit“, Stand 10.11.2026)

Zweck: Jeder Vorschlag für Löser, Werkzeuge und Bedienung soll sich an dieser Liste messen lassen, bevor er Florian vorgelegt wird.
Am Arbeitsbaum wurde nichts geändert. Es wurde nichts gemessen; alles hier ist **gelesen** (Dokumente, Gedächtnisdateien, wenige
Codestellen) oder ausdrücklich als **vermutet** markiert.

## 0. Quellen, Kürzel, Grenzen

| Kürzel | Datei |
| --- | --- |
| [G] | `/Users/bsw/.claude/projects/-Users-bsw-Projekte-playground-early-earle/memory/feedback-florian-form-zuerst-dicht.md` |
| [Begriffe] | `…/memory/feedback-klare-begriffe.md` |
| [Vekt] | `…/memory/feedback-zielbild-vektorillustration.md` |
| [Illu] | `…/memory/feedback-ansichten-als-illustration.md` |
| [Eleg] | `…/memory/feedback-elegante-loesung-statt-stopp.md` |
| [Offen] | `…/memory/feedback-entscheidungen-offen.md` |
| [Fress] | `…/memory/feedback-fressen-pose-kern.md` |
| [M5], [Neu], [Outl] | `…/memory/feedback-florian-m5-m6-urteil.md`, `…/feedback-florian-editor-neu.md`, `…/feedback-keine-outlines.md` (zusätzlich gelesen für die Bausteine) |
| [K] | `docs/plans/2026-10-22-klarstellungen.md` (Florian wörtlich, drei Nachrichten) |
| [K2] | `docs/plans/2026-10-22-bausteine-wuensche.md` (leer: Teil 2 ist „noch nicht eingegangen“, Z. 3–4) |
| [P] | `docs/plans/2026-11-06-kurven-als-wahrheit.md` (Abschnitte 1–18) |
| [B] | `docs/research/2026-11-09-bilanz-wesen-editor.md` |
| [R] | `docs/research/2026-11-09-fibermesh-monstermash-richtung.md` |
| Code | `apps/editor/kurven.html`, `apps/editor/src/form/kurven.ts` (alle Pfade unter `/Users/bsw/Projekte/playground/early-earle/.claude/worktrees/form-zuerst/`) |

**Grenzen dieser Liste (ehrlich):**
- Die Chat-Verläufe selbst habe ich nicht. „Wörtlich“ heißt: so steht es in Anführungszeichen in der genannten Datei. Nur [K] ist
  ausdrücklich unverändert gespeichert; in [G] und [P] sind Zitate teils gekürzt („…“).
- **Vermutet:** Zitate, die mit „Ja, …“ beginnen und Kriterien oder Reihenfolgen enthalten (z. B. [P] Z. 653–654, 870–871, 977–978),
  sind wahrscheinlich Knopftexte, die die bauende Session formuliert und Florian abgeschickt hat ([Eleg] Z. 50–54 beschreibt
  diesen Knopf). Sie sind Zustimmung, aber nicht seine eigenen Worte. Frei geschriebene Sätze ([K], seine Fragen und Einwände)
  wiegen schwerer.
- Florians Vorgaben sind laut ihm selbst „alles nur Tests“ und Bauchentscheidungen ([Offen] Z. 12–15). MUSS heißt hier:
  mehrfach gesagt, zuletzt bestätigt, nicht widerrufen. Bessere Wege sind erlaubt, aber als Frage mit Bild, nicht stillschweigend.

---

## 1. MUSS

### 1.1 Das Modell

| Nr. | Vorgabe | Zitat, Datum, Quelle |
| --- | --- | --- |
| M1 | **Dichtes Netz, das sich selbst erzeugt; rund, wo keine Kante gezeichnet ist.** | „Es soll ja ein dichtes netz sein das sich selbst generiert.“ „Die form bläst sich immer zur optimalen rundung auf.“ (05.11., [K] Z. 42) · „Wenn keine kante angezeichnet ist sollte es also immer einfach so rund wie möglich in dn nächsten punkt übergehen.“ (02.11., [K] Z. 17) |
| M2 | **Die Kurven sind die Wahrheit, die Haut entsteht daraus jedes Mal neu.** Kein geknetetes Netz mit eigener Geschichte. | „Bei einem Netz.....klingt nach einem anderen system...mehr nach käfig statt unserer neuen form.“ (05.11., [K] Z. 39–40) · „hatten wir die Lösung mit dem Netz, das sich immer neu baut, nicht auch schon? … klingt nach dem was ich ursprünglich vorgegeben habe.“ (06.11., [G] Z. 337–338) |
| M3 | **Kanten, Edgeloops und Kieferlippen sind dieselbe Sache:** Linien auf der Form. | „Das wichige ist aber dass kanten, edgloops … und unterschiedliche kiefer nichts anderes als edgloops bzw kanten sind.“ (05.11., [K] Z. 42) |
| M4 | **Der Umriss ist nur Ergebnis, kein Griff.** Bearbeitet werden die Punkte und Griffe auf den Loops. | „Die outline ist die outline, bearbeitet werden aber die griffe auf den loops und kanten.“ (05.11., [K] Z. 42) · „Die Outlines dürfen nichtmehr in dem sinn als grifflinie gesehen werden.“ (05.11., [K] Z. 33) |
| M5 | **Jede Ansicht zeigt dasselbe echte Mesh; keine Widersprüche zwischen Ansichten.** | „… da jede Ansicht und Outline das echte Mesh zeigt.“ (04.11., [G] Z. 105–107) · „Es geht irgendwie wieder darum, aus drei Formen eine Form zu erzwingen. Aber wir wollen ja direkt die Form in den Ansichten bearbeiten, nur die Darstellung ist eine andere.“ (04.11., [G] Z. 116–119) |
| M6 | **Alle Seiten gleichwertig**, überall alles machbar. | „… die seiten sollen auch am ende alle gleichwertig sein, dass ich überall alles machen kann.“ (05.11., [K] Z. 33) |
| M7 | **Breite und Höhe sind entkoppelt.** Schmaler machen nimmt keine Höhe. | „… die art des aufblasens (wenn ich etwas schmale mache nehme ich ihm auch die höhe) …“ als Mangel (05.11., [K] Z. 44) · „ich gebe kopf und bauch ein edgloop und über diesen steuer ich die breite von oben oder von vorne...das geht von allen seiten so.“ (05.11., [K] Z. 42) |
| M8 | **Ein zusammenhängendes Netz, kein Verschmelzen zum „Donut“.** Ein Ende steckt im anderen, auch bei getrennten Kiefern. | „Das mesh soll nicht zu einem "donut" verschmelzen können sondern ein ende steckt dann in dem anderen. das gleiche prinzip gilt bei getrennten kieferern. Es ist alles mit dem netz verbunden.“ (05.11., [K] Z. 33) |
| M9 | **Nur Loops.** Keine offenen Linien; Braue = Loop ums Auge, oben hart; Mund = Loop, Mundwinkel sind Punkte. Griffe entstehen nur an Kreuzungen oder als Punkte, die er setzt. Die Kugel startet ohne Loops. | Regeln „Nur Loops“ (05.11. nachts, [G] Z. 216–219; dort nicht wörtlich, „nach drei Fragen“) |
| M10 | **Kante ist an oder aus; der Winkel kommt aus der Form; Rundung über die Grifflängen.** | „Die härte des knicks entsteht doch automatisch und kann im grunde nur ganz oder garnicht sein. Alles dazwischen ist rund mit verschiedenen handlelängen oder nicht?“ (06.11., [P] Z. 154–155) · Knick „rund“ statt „Vector“: „ja dann rund“ (06.11., [P] Z. 327–328) |
| M11 | **So viele Polygone wie nötig, fürs Spiel wird gebacken.** | Vision 04.11. ([G] Z. 13–14, sinngemäß: „wie bei ZBrush/Sculptris“) · „Sollte das Mesh nicht dynamisch verdichten?“ (05.11., [G] Z. 241–242) |

### 1.2 Das Gefühl beim Ziehen (der Kern von Florians heutigem Befund)

| Nr. | Vorgabe | Zitat, Datum, Quelle |
| --- | --- | --- |
| M12 | **Live und exakt: Was er beim Ziehen sieht, ist das Ergebnis.** Nach dem Loslassen ändert sich nichts Sichtbares mehr. | „In meiner Vision ist das Mesh wirklich live dynamisch und verdichtet/lockert sich perfekt während des Zuges.“ (08.11., [P] Z. 579–580) · „Ich dachte, wenn sich das Mesh beim Zug exakt immer neu aus den Linien entwickelt und dabei live verdichtet …, haben wir weder Ecken noch ein Springen nach dem Loslassen“ (09.11., [P] Z. 923–924) · Befund 10.11.: „entweder sehe ich noch Veränderungen beim Loslassen der Handles und das Mesh justiert nach oder es ist ungenau und stockt.“ (Auftrag) |
| M13 | **Verdichten ist unsichtbar: gleiche Form, nur runder.** | „… warum das verdichtete Mesh überhaupt eine andere Form annimmt. Das ganze sollte doch komplett unsichtbar sein, außer an den Kanten der langen Flossen oder Rüssel … und da sollte es ja einfach nur abrunden, aber in exakt der gleichen Form.“ (09.11., [P] Z. 1080–1082) |
| M14 | **Kein Nachhinken, kein Ruckeln. Nachhinken ist schlimmer als Nachjustieren.** | Urteil 08.11.: Version ohne `?gewichte=geometrie` „viel lieber“; mit Geometrie ruckelt es, „das Nachhinken stört viel mehr als das Nachjustieren nach dem Loslassen“ ([G] Z. 433–434; dort sinngemäß, nur „viel lieber“ in Anführungszeichen) |
| M15 | **Haut immer glatt, auch bei kleinen Details und hohem Zoom.** Er arbeitet bei 300 % und mehr. | „die Haut sollte immer glatt sein, auch bei kleinen Details und hoher Zoomstufe“ (08.11., [P] Z. 575–576) · „… warum es ungenau und eckig wird, wenn ich kleine Details rausziehe … Die Linie wird ganz kantig.“ (08.11., [P] Z. 500–501) · Zoom 300 %: [G] Z. 409 |
| M16 | **Dichte dort, wo die Form sie braucht** (kleine Details), auch nach dem Loslassen. | 08.11. 17:45, [G] Z. 445–448 (sinngemäß, mit Bild `form-detail-grob-florian-2026-11-08.webp`) |
| M17 | **Keine Abstürze, keine Hänger, nichts Schwarzes.** | „Das Mesh "explodiert" und die Seite hängt sich auf.“ (06.11., [G] Z. 295–296) · schwarze Löcher an den Hörnern (08.11., [G] Z. 440–441) |
| M18 | **Kriterien, denen er zugestimmt hat:** Sprung beim Loslassen ≤ ½ Bildpunkt, je Mausbewegung ≤ 16 ms. | [P] Z. 653–654 (08.11.; vermutlich Knopftext, siehe Abschnitt 0). **Achtung:** gemessen wurde bei 100 % (0,89 px je Einheit, [P] Z. 686–687); Florian arbeitet bei ≥ 300 % (2,74 px je Einheit bei 307 %, [P] Z. 526). Siehe Befund 12. |

### 1.3 Linien, Punkte, Griffe (Illustrator)

| Nr. | Vorgabe | Zitat, Datum, Quelle |
| --- | --- | --- |
| M19 | **Punkte und Griffe exakt wie in Illustrator, örtlich:** Ein Punkt ändert nur die zwei Stücke bis zu seinen Nachbarn. | „Punkte verhalten sich noch nicht wie in Illustrator, die Bewegung eines Punktes wirkt über den nächsten Punkt hinaus, komische Kanten“ (05.11., [G] Z. 235–236) |
| M20 | **Stift P, Einfügen, Löschen wie Illustrator.** Nach dem Löschen liegt die Linie zwischen den neuen Nachbarn mit deren Griffen. | „… ein Werkzeug wie P bei Illustrator, bei dem man Punkt für Punkt mit Handle einmalt. Wenn ich aktuell einen Punkt lösche, bleibt die Linie einfach wie sie ist … Kann es so sein wie bei Illustrator …?“ (06.11., [P] Z. 12–14) |
| M21 | **Die Linie ist genau ihr Bézier-Pfad.** | „ja genau zur Bézier-Kurve machen“ (07.11., [P] Z. 423) |
| M22 | **Eine gezeichnete Form liegt exakt wie gezeichnet auf der Haut und verändert die Haut nicht.** | „Die Form soll exakt wie eingezeichnet direkt auf der Haut liegen, ohne diese zu verändern“ (08.11., [P] Z. 577–578) |
| M23 | **Linien bleiben, wo sie sind.** | Linien bleiben „immer genau an Ort und Stelle“ (04.11., [G] Z. 57–58) |
| M24 | **Hin und zurück ergibt dasselbe.** | „wenn ich einen Punkt rausziehe und dann wieder zurücksetze, ist das Mesh nicht gleich. Warum?“ (06.11., [P] Z. 358–359) |
| M25 | **Jeder sichtbare Griff ist greifbar und knickbar**, auch an Spiegelpunkten und Kreuzungen. Eine Kreuzung ist für ihn ein Punkt. | „Das Handle unten kann ich nicht bewegen, hier ist immer ein Knick — auch bei den Spiegelpunkten soll das Handle bewegbar und knickbar sein.“ (05.11., [G] Z. 247–248) · „seitlichen Griff nicht knicken, obwohl er als harter Punkt ausgewählt ist“ (05.11., [G] Z. 262) |
| M26 | **Ansicht gesperrt:** In einer Ansicht bewegt sich ein Punkt nur in deren zwei Koordinaten. | „Immer die Ansicht locken und nicht in eine andere Richtung bewegen … dadurch kann ich schöne Kanten und Wülste erstellen“ (04.11., [G] Z. 63–65) |
| M27 | **Werkzeuge wie Blender:** G/S/R, O mit Einflusskreis. „Perfekte Mischung aus Vektorwerkzeugen und Blender.“ | „punkte kann man als bezierpunkte bearbeiten und es funktionieren die tools wie (o) in blender mit dem circle of influence. Es soll die perfekte mischung aus vektorwerkzeugen und blender sein.“ (05.11., [K] Z. 42) |
| M28 | **Zoom in den Blättern.** | „Zoom in den Blättern gerne“ (05.11., [G] Z. 235–236) |

### 1.4 Posen (Grundidee des ganzen Editors)

| Nr. | Vorgabe | Zitat, Datum, Quelle |
| --- | --- | --- |
| M29 | **Jede Pose = Knochen + Blendshape; in der Pose arbeiten dieselben Werkzeuge wie im Editor.** | „Wenn ich auf Fressen-Pose klicke, konnte ich immer den Blendshape fürs Fressen einstellen. … Das war ja die Idee des ganzen Editors.“ (15.10., [Fress] Z. 11) · „Warum kann man in der Pose nicht einfach ganz normal die Bézier-Punkte bearbeiten und den Blendshape erstellen? Der Pinsel ist nice to have, aber erstmal mit niedrigerer Prio.“ (05.11., [G] Z. 282–283) |
| M30 | **Wo der Kiefer endet, regeln Knochen und Gewichte, keine Zusatzlinien.** | „ich bin nicht sicher mit der Kinnlinie. Machen das nicht später die Bones und die Weights?“ (05.11., [G] Z. 274–275) |
| M31 | **Kiefer wirklich getrennt bearbeitbar** (ein Knopf trennt), Platz für riesige Zähne in der Lücke. | 05.11. morgens, [G] Z. 159–163 (sinngemäß) · „Die Kiefer frei verschieben, nicht nur entlang der Konturlinie … Wo Kiefer und Outline sich treffen, entsteht ein echter Punkt.“ (05.11., [G] Z. 169–170) |

### 1.5 Ergebnis und Arbeitsweise

| Nr. | Vorgabe | Zitat, Datum, Quelle |
| --- | --- | --- |
| M32 | **Die drei (fünf) Ansichten sehen aus wie Blueprints / Vektorillustrationen.** | „das endergebnis in den 3 ansichten soll immernoch aussehen wie ein blueprint oder eine vectorillustration.“ (05.11., [K] Z. 42) · „… wie Blueprints oder CAD grafiken mit organischen formen und cuttenden outlines zwischen 3px und 0px bzw gestrichelt.“ (02.11., [K] Z. 19) |
| M33 | **Spielqualität von Anfang an umschaltbar.** | „Wichtig ist auch dass ich von beginn umstellen kann um den character auch in spielqualität zu sehen und ob das mesh gut auf die low poly variante umgesetzt wird“ (02.11., [K] Z. 21) |
| M34 | **Schnell und genau Charaktere erstellen** ist das Ziel; Browser oder richtige Software ist offen. | „Für mich ist es wichtig, dass ich schnell und genau die Charaktere erstellen kann. Wenn das im Browser geht, ist es schön. Wenn technisch eine richtige Software eleganter und besser wäre, sollten wir das in Erwägung ziehen.“ (09.11., [B] Z. 6–8) |
| M35 | **Wenige Werkzeuge, keine Regler, wo die Zeichnung es vorgibt.** | „Bitte überprüfe hier nochmal alle werkzeuge und ob ich diese wirklich brauche.“ (02.11., [K] Z. 17) · „Keine Regler dort, wo die Zeichnung es vorgibt.“ (15.10., [Offen] Z. 28, sinngemäß) |
| M36 | **Schön und glatt außer an gewollten Kanten.** | „Wichtig ist, dass das Mesh später immer schön und smooth aussieht außer bei gewollten Kanten.“ (20.10., [Eleg] Z. 11–13) |
| M37 | **Abnahme nur an seinen Wesen im Editor, mit Bild; Tore nur für Dinge, die man sieht.** Zeigen statt planen. | 04.11., [G] Z. 100–103 · „Ja, fang so an: Seite zeichnen und sofort eine runde Form sehen, ohne Planseite und ohne Tore. Zeig es mir, sobald es geht.“ (04.11., [G] Z. 32–33) |
| M38 | **Sein Modell genau bauen oder die Abweichung nennen und fragen.** Das Prüffenster (`kurven.html`) ist seine Hauptlinie; nie ohne Rückfrage wechseln. | „Warum sind wir jetzt nicht mehr bei ?linien?“ (05.11., [G] Z. 183–185) · Lehre [G] Z. 342–344 |
| M39 | **Fragen zuerst beantworten, wenn er darum bittet; ehrlich, mit Messung.** | 08.11., [G] Z. 413–420 |

---

## 2. NIE (verworfen, mit Zitat)

| Nr. | Verworfen | Zitat, Datum, Quelle |
| --- | --- | --- |
| N1 | **Käfig / Kontrollnetz als Form**, feste Topologie vor der Form. | „Warum versteifen wir uns auf feste Shapes und Grundformen, die 1000 Regeln brauchen?“ (04.11., [G] Z. 15–16) · „… mehr nach käfig statt unserer neuen form.“ (05.11., [K] Z. 39–40) |
| N2 | **Verformtes Netz als Wahrheit** (Haut mit Gedächtnis als Hauptweg). | wie M2; dazu „ist gedächtnis dann nicht besser?“ → gemessen nein, „es bleibt aus den Kurven“ (06.11., [P] Z. 400–419; [G] Z. 391–392) |
| N3 | **Teile.** | „Das mit den teilen halte ich für keine gute Lösung. Vorher war es ein teil verschmilz und jetzt sind es zwei. … es wirkt sehr instabil“ (05.11., [K] Z. 31) |
| N4 | **Röhren, Schemata, Regeln, die eine Richtung bevorzugen.** | „Wenn ich höre, dass wir wieder etwas aus einer Röhre ziehen und es in gewisse Richtungen nicht geht, klingeln bei mir die Alarmglocken. Das hatten wir schon zweimal …“ (04.11., [G] Z. 69–71) |
| N5 | **Umriss als Griff; Ansichten als Bedingungen, die sich widersprechen dürfen.** | wie M4, M5 |
| N6 | **Linien und Punkte, die von selbst entstehen.** | „… die ansichtslinien die von alleine entstehen, das verzerren des meshes in den anderen ansichten … und dass edgloops/umrisse so ungerade mit viel zu vielen punkten sind macht die bearbeitung und einschätzung für mich gerade schwer.“ (05.11., [K] Z. 44) |
| N7 | **Zusatz-Loops für die Verformung in Posen** (Kinnlinie). | wie M30 |
| N8 | **Härte als Zahl 0–3.** | wie M10; umgesetzt als Kante an/aus (Taste K), [P] Z. 209–211 |
| N9 | **Lösungen, die nach Nachjustieren klingen** (konkret: gleiche Gewichte + saubere Dreiecke + nur live verdichten; und: jede Linie trägt ihre Rundung quer als eigene Angabe). | „Mir gefallen vom Gefühl her beide deiner Lösungen nicht gut und klingen nach viel Nachjustieren.“ (09.11., [R] Z. 3–5; die beiden Wege: [P] Z. 950–952) |
| N10 | **Sonderregeln, die sich häufen.** | „machen wir wieder sonderregeln gerade?“ (06.11., [P] Z. 15) · „Bauen wir gerade wieder viele Sonderregeln? Ist der Beweis erbracht oder nicht?“ (03.11., [B] Z. 75) |
| N11 | **Prüfreihen, Formlisten, Bögen vor dem Sehen.** | „… ignoriere diese Bögen. Das widerspricht wieder allem, was wir tun wollten.“ (04.11., [G] Z. 92–94) |
| N12 | **Andere Sessions von sich aus anschreiben.** | Regel nach Florians Ärger (04.11., [G] Z. 147–150) |
| N13 | **Sonder-Automatiken, wenn die allgemeinen Werkzeuge es können.** | 15.10., [M5] Z. 13–19 (sinngemäß: Brauenwulst, Rundmaul, Hundemaul „mit den normalen Werkzeugen“) |
| N14 | **Gemessen verworfen von der bauenden Session** (kein Florian-Zitat, aber vor jedem Löser-Vorschlag nachlesen): Matrix nach der Geometrie ([P] §12), Krümmung aus den Linien quer ([P] §13), Linien mit Richtung über Messung je Seite ([P] §15), Normalen nach Max ([P] §16), gleiches Maß ([P] §18), Krümmung an den Linien mitgelöst ([P] §18), Haut genau mit Standard-Löser ([P] Z. 538–552), Anderson, Schwung, feste Dämpfung, tangentiales Entspannen ([P] Z. 712–716, 902–906). | Lehre: „Vor jedem Löser-Vorschlag die Planseite … durchsuchen … nach drei Löser-Beweisen ohne Gewinn keinen vierten vorschlagen, sondern Tempo oder Bedienung zur Wahl stellen“ ([G] Z. 485–488) |

Hinweis zu N14: Florian fragt am 10.11. ausdrücklich „Kann man den Löser noch verbessern?“. Ein neuer Löser-Vorschlag ist damit erlaubt,
muss aber sagen, worin er sich von den sechs gemessenen unterscheidet, und im Fenster an seinen Fällen laufen (Abschnitt 8).

---

## 3. WÜNSCHE (gesagt, noch nicht gebaut oder nicht im Prüffenster)

| Nr. | Wunsch | Quelle | Stand |
| --- | --- | --- | --- |
| W1 | Netz verdichtet **und lockert** sich live im Zug, unsichtbar | [P] Z. 579–580 | nur hinter `?gewichte=geometrie` ([P] §10); Standard verdichtet nach dem Loslassen und setzt sich dann in bis zu vier Schritten (gelesen: `kurven.ts` Z. 1451–1478, Timer 30 ms, `nachVerfeinert < 3`) |
| W2 | Dichte nach Rundung (feine Ohren, Hörner) | [G] Z. 445–448 | offen ([B] Z. 156) |
| W3 | Hinter- und Unteransicht, Konturen scheinen durch | „Wir werden ja auch Hinter- und Bottomansicht haben, und die Konturen sollen durchscheinen, also gibt es nichts, das nicht sichtbar ist.“ (04.11., [G] Z. 77–78) | Fenster hat Seite, Front, Top, 3D (gelesen: `kurven.ts` Z. 3115–3120) |
| W4 | Blueprint-Darstellung: Strich 3 px … 0 px, Verjüngung, verdeckt blass/gestrichelt und bearbeitbar | [K] Z. 13–19; [Vekt] Z. 11 | nicht geprüft, wie weit das Fenster das zeigt |
| W5 | Spielqualität-Umschalter | [K] Z. 21 | Backen gibt es in `form.html` ([G] Z. 143–144); in `kurven.ts` kein Treffer für Backen/Spielnetz (gelesen, Suche) |
| W6 | Startform aus einer Seitenzeichnung | „Fühlt sich gut an.“ zu genau diesem Schritt (04.11., [G] Z. 35) | nicht im Kurven-Fenster ([B] Z. 194) |
| W7 | Pinsel in Posen | „nice to have, aber erstmal mit niedrigerer Prio“ ([G] Z. 283) | offen |
| W8 | Weitere Posen, Überblenden, zwischen Posen springen | [Neu] Z. 166; [B] Z. 160–161 | nur Fressen-Pose |
| W9 | Kopf und Bauch im Top getrennt greifbar; Über-/Unterbiss wie „Kopf über Bauch“ | [G] Z. 129–131, 171–174 | im Kurven-Modell über Loops gedacht; Urteil aus |
| W10 | Getrennte Kiefer am Maul-Loop, Lippen mit Rundung | [G] Z. 159–163 | in `kurven.html` offen (Worktree-`CLAUDE.md` Z. 1118: „Lippen ohne Rundung, Zähne, getrennte Kiefer am Loop, Posen“) |
| W11 | Rückgängig **und** Wiederholen | nicht von Florian verlangt | gelesen: nur ⌘Z (`kurven.ts` Z. 3063–3066), kein Wiederholen |
| W12 | G/S/R mit Zahlen und ⇧-Achsen wie im alten Editor (V3) | Stand 20.10. in der Projekt-`CLAUDE.md` (V3) | gelesen: im Zug nur Esc, ⏎, X/Y/Z (`kurven.ts` Z. 3037–3046) |

W11 und W12 sind keine Florian-Zitate, sondern Lücken gegenüber „Werkzeuge wie Blender“ (M27); als Vorschlag kennzeichnen.

---

## 4. Offene Entscheidungen (liegen bei Florian)

1. **Prinzip bestätigen:** Kurven als Wahrheit auf dichtem Netz, Käfig nur noch fürs Spielnetz? ([B] Z. 335)
2. **Tempo zuerst** (JavaScript → WebAssembly → natives Modul)? ([B] Z. 336) Seine Haltung: offen für „richtige Software“ ([B] Z. 6–8).
3. **Grundform immer symmetrisch** (dann halbe Haut)? ([B] Z. 337)
4. **„Punkte wo nötig“** als Standard für neue Loops? Sein Stand: „etwas besser, aber ich muss es weiter testen“ (08.11., [P] Z. 502).
5. **Griff, der die Linie umkehren lässt:** rot zeigen oder begrenzen? ([B] Z. 339; [P] Z. 861–862)
6. **Löser nach der Geometrie als Standard?** ([P] Z. 778) Sein Urteil vom 08.11. galt bei dem damaligen Tempo ([B] Z. 214–216).
7. **Klarstellungen Teil 2 (Bausteine)** stehen aus ([K2] Z. 3–4).
8. **Urteile, die noch ausstehen** (gebaut, von ihm nicht bewertet): Maul als Loop, Fressen-Pose mit Punkten, Stift P, Kante „rund“ im
   Alltag, Linie = Pfad ([G] Z. 272, 293, 399 je „Urteil aus“ bzw. „Wahl steht aus“).

---

## 5. Wörter

**Benutzen** ([Begriffe] Z. 17–20; [G] Z. 419–420):
- „dichtes Netz“ (wie Sculptris/ZBrush) für die Form; „Haut“ ist in [P] durchgehend eingeführt.
- „Linien“ oder „Loops“ für das, was er zeichnet; „Punkte“ und „Griffe“ nur für die Punkte seiner Linien.
- „Kante“ (an/aus), „Ecke“, „Kreuzung“, „Umriss“ (nur als Ergebnis).
- „Falten“ oder „Kratzer im Netz“ statt „umgeklappte Dreiecke“, oder kurz erklären.
- Seine eigenen Wörter für das Problem: „justiert nach“, „springt“, „stockt“, „ruckelt“, „bläst sich auf“.
- Wo Struktur entsteht (eine Linie wird eine Kette von Kanten im Netz): dazusagen, dass sie nur dort entsteht, wo er eine Linie zieht.

**Vermeiden:**
- „Käfig“, „Loop-Netz“, „Ringe“, „Reihen“, „Gitter“, „Kontrollnetz“, „Netz als Wahrheit“ ([Begriffe] Z. 11–20; [K] Z. 39–40).
- „Teile“, „Röhre“, „Schlauch“, „Spanten“, „Silhouette als Vorgabe“ ([K] Z. 15, 31; [G] Z. 69–71).
- „Härte 0–3“, „Regler“, „Schwelle“, „Tor“, „Prüfreihe“ als Angebot ([P] Z. 154–155; [G] Z. 92–96).
- Fachwörter ohne Übersetzung (Kotangens, Laplace, GMRES, Fixpunkt): Er „kann das technisch nicht entscheiden“ ([Eleg] Z. 12).
- Modellnamen (Projektregel 8).
- „bestanden“, „gelöst“, „fertig“ ohne sein Urteil ([Eleg] Z. 25).

---

## 6. Was Florian an der heutigen Bedienung gelobt und bemängelt hat

**Gelobt** (dichtes Netz und Kurven-Fenster):
- „Fühlt sich gut an.“ (04.11., [G] Z. 35) · „Die Outlines als Shader fühlen sich viel besser an … Es fühlt sich nach Minuten schon
  mehr nach meiner Vision an als das hier nach Wochen.“ (04.11., [G] Z. 98–100)
- „Ich habe grundsetzlich ein gutes gefühl bei der methode, da das mesh sehr organisch wirkt. Das gefällt mir.“ (05.11., [K] Z. 33)
- „Es hat sich mit den linien nicht schlecht angefühlt.“ (05.11., [K] Z. 44)
- Maul und Grundformen „viel eleganter“ (04.11., [G] Z. 143)
- „Viel besser...“ nach der Krümmung mit Richtung (06.11., [G] Z. 321)
- „Variante B scheint in fast allem besser zu sein.“ (06.11., [P] Z. 155–156)
- „Punkte wo nötig“: „etwas besser“ (08.11., [P] Z. 502)
- Standard-Löser beim Ziehen „viel lieber“ als der nach der Geometrie (08.11., [G] Z. 433)
- 10.11.: „Das Ergebnis ist schon ganz gut“ (Auftrag)
- Älter, zur Oberfläche des Editors: „wirkt alles schon ganz gut“ (15.10., [B] Z. 77)

**Bemängelt und laut Planseite behoben** (Florians Bestätigung fehlt meist):
- Punkt wirkt über den Nachbarn hinaus ([G] Z. 235–239) · Griff am Spiegelpunkt gesperrt ([G] Z. 247–251) · Kreuzung knickt nicht
  ([G] Z. 262–265) · Kopf „kaum Polygone“ ([G] Z. 241–244) · Boden mit Höckern ([G] Z. 254–260) · Netz „explodiert“ ([G] Z. 295–299) ·
  Rüssel und Hammer kollabieren ([G] Z. 304–317) · Härte wirkungslos, Löschen lässt die Linie stehen ([P] Z. 10–14) · Hin und zurück
  ungleich ([P] Z. 358–373) · Biegung zwischen zwei Punkten nicht glättbar ([P] Z. 375–377) · Linie kantig, Punkt neben der Linie,
  Einfügen am Detail ([P] Z. 500–535) · Stift-Form über Linien verzogen ([P] Z. 604–639).

**Bemängelt und offen:**
- **Nachjustieren / Aufblasen in Stufen nach dem Loslassen** ([P] Z. 578; [G] Z. 435–437; Auftrag 10.11.).
- **Ruckeln und Nachhinken** beim Löser nach der Geometrie ([G] Z. 433–434); 10.11.: „ungenau und stockt“.
- **Schwarze Löcher** bei Hörnern mit Griffspiel; 26 284 Punkte, 126 ms je Zug ([G] Z. 440–441).
- **Grobe kleine Details**, Haut nicht glatt bei hohem Zoom ([G] Z. 445–448; [P] Z. 533, 538).
- 10.11., über die bauende Session: sie „hat viel getestet und Regler eingebaut und kommt gerade nicht weiter“. Gelesen dazu:
  `kurven.ts` liest 17 Schalter aus der Adresse (Z. 139, 178, 209, 211, 217, 224, 230, 232, 249, 260, 267, 279, 280, 287, 288, 290,
  2236); sichtbare Schieberegler gibt es nur zwei, Maul und Kopf (`kurven.html` Z. 43, 46).

---

## 7. Was für einen fertigen Charakter noch fehlt, und was dazu entschieden ist

| Baustein | Stand im Kurven-Fenster | Schon entschieden oder gesagt |
| --- | --- | --- |
| **Speichern / Laden** | fehlt ([B] Z. 160; in `kurven.ts` kein Speichern gefunden, nur Rückgängig-Stapel) | Format `ee-wesen` und Library gibt es im Editor-Gerüst (11.10., [Neu] Z. 19–23); jedes neue Wesen startet als Kugel ([Neu] Z. 27; [G] Z. 216) |
| **Einbau in den Editor** (Stamm, Tafel, Dock, Library) | `kurven.html` ist nur ein Prüffenster ([B] Z. 275) | Oberfläche „wirkt alles schon ganz gut“; Seitenleiste immer offen (12.10.) |
| **Startform** | Kugel oder Bohne über die Adresse (`kurven.ts` Z. 178) | Seitenzeichnung als Start gefiel ihm (04.11.); danach darf der Umriss kein Griff sein (M4) |
| **Maul** | Maul als Loop, Regler öffnet, Netz bleibt geschlossen ([G] Z. 267–272) | Maul = Loop, Mundwinkel = Punkte (05.11.); „mit F als schmale Form ums Maul zeichnen“ ([G] Z. 267) |
| **Getrennte Kiefer, Über-/Unterbiss** | am Loop offen | ein Knopf trennt; Kiefer als Loops; „ein Ende steckt im anderen“; Platz für Hauer ([G] Z. 159–163; [K] Z. 33) |
| **Zähne** | fehlen (für den Käfig gebaut, [B] Z. 85, 274) | dürfen sich überschneiden („das macht ein Maul erst aus“), vor/zurück verschiebbar, auch ganz rund („süße Blobzähne“) (15.10., [M5] Z. 14); auf die Kiefer verteilen, einzeln wählen; Krümmung, Rundheit, Größe, Länge/Breite, Rotation; eine Farbe mit Verlauf (13.10., [Neu] Z. 167); Riesenzähne offen größer ([Neu] Z. 57) |
| **Augen** | fehlen | gemalt (Schlitz), Schlitz im Mesh mit Augapfel, Glubschauge; Zustände Blinzeln, Sichel, X, Spirale (13.10., [Neu] Z. 168); Brauen gemalt oder schwebend, Wulst mit Körperwerkzeugen (15.10., [M5] Z. 13); heute: Braue = Loop ums Auge, oben hart ([G] Z. 217) |
| **Posen** | Fressen-Pose (Knochen Maul/Kopf, Blendshape über Punkte) ([G] Z. 290–293) | Knochen + Blendshape je Pose, Rig gemeinsam, Stellung je Pose; Grundansicht = Grundpose, Standardpose Idle; Knochen in 3D (15.10., Projekt-`CLAUDE.md`); Punkte vor Pinsel (05.11.) |
| **Look** (Earle-Material, Zonen, Muster, Feuer/Gas/Fell) | fehlt im Fenster | Look seiner Bögen ist der Maßstab; Vektorlinien auf dem Mesh wie Illustrator-Shapes, Übergänge hart/weich ([Neu] Z. 170); Feuer „fehlen Verläufe“, Gas „weit von der Vorlage weg“ (14.10.); im **Spiel** keine dünnen Outlines ([Outl] Z. 8) — die Shader-Umrisse sind Editor-Darstellung |
| **Anhängsel** (Beine, Flügel, Flossen, Hörner, Klingen) | aus der Haut gezogen (Hörner, Ohren); keine Bibliothek | Teil 2 der Klarstellungen steht aus ([K2]); „ohne Sonderregeln oder Teile“ ([G] Z. 71) |
| **Spielnetz** | Backen in `form.html` (8 000 Dreiecke, 0,2–0,6 px, [G] Z. 143–144); kein Schalter in `kurven.ts` | backen statt Käfig = Spielnetz; Loops „später zusätzlich guidelines für die topologie“ ([K] Z. 33); Budget und iPhone-Ziele aus den Arbeitsregeln |
| **Weitere Ansichten** | Seite, Front, Top, 3D | hinten und unten kommen dazu (W3) |

---

## 8. Kurzes Prüfraster für jeden Vorschlag

Ein Vorschlag fällt durch, wenn eine Antwort „ja“ ist:

1. Ändert sich nach dem Loslassen noch etwas Sichtbares (bei 300 % Zoom)? (M12, M13, M18)
2. Hinkt die Haut im Zug hinter der Maus her, oder hält der Zug an? (M14)
3. Entsteht eine Linie, ein Punkt oder ein Griff, den Florian nicht gesetzt hat? (M9, N6)
4. Bewegt sich eine Linie, ein Punkt oder ein Griff, den er nicht angefasst hat? (M19, M22, M23)
5. Ändert eine neue Linie beim Anlegen die Haut? (M22)
6. Koppelt der Vorschlag Breite und Höhe, oder bevorzugt er eine Richtung oder Achse? (M7, N4)
7. Braucht er eine neue Zahl, einen Regler oder eine Angabe je Linie, die Florian einstellen muss? (M35, N8, N9)
8. Führt er Teile, Umriss-Griffe, einen Käfig oder ein Netz mit eigener Geschichte ein, oder klingt er so? (N1–N5)
9. Nennt eine Regel einen Körperteil oder eine Lage; ist es die dritte neue Regel im Block? (N10)
10. Begrenzt er die Punktzahl oder vergröbert er Details? (M11, M15, M16)
11. Wurde dieselbe Idee in [P] §9–18 schon gemessen? (N14)
12. Funktioniert er nur in der Grundform und nicht in der Pose? (M29)

Und zum Vorgehen: an Florians Fällen im Fenster zeigen (Hörner mit Griffspiel, Ohr, Rüssel, Hals: `form-drei-faelle.mjs`,
`form-loslassen-probe.mjs`), Kern-Proben mit so vielen Runden je Mausbewegung wie das Fenster ([G] Z. 494–497), Tempo ehrlich nennen.

---

## 9. Befunde: naheliegende Vorschläge, die gegen eine Vorgabe verstoßen würden

Alle Befunde sind gelesen, nicht gemessen. Jeder nennt die Vorgabe, gegen die der Vorschlag stieße.

1. **Zweistufig rechnen** (im Zug grob, nach dem Loslassen genau; Neuvernetzen in der Ruhe; den Sprung weich einblenden).
   Das ist genau, was Florian heute sieht und bemängelt (M12, M13). Der Standard tut es schon: nach dem Zug setzt sich das verdichtete
   Netz per Timer und verfeinert bis zu dreimal nach (`kurven.ts` Z. 1451–1478).
2. **Den Sprung gegen Nachhinken tauschen** (mehr Dämpfung, Löser nach der Geometrie als Standard bei heutigem Tempo).
   Florians Urteil vom 08.11.: Nachhinken stört mehr ([G] Z. 433–434; [P] Z. 1176).
3. **Flächenstücke oder Unterteilungsfläche über dem Kurvennetz als Form.** Für Florian ist das der Käfig (N1); die Bilanz selbst
   stuft es nur fürs Spielnetz als gut ein ([B] Z. 268).
4. **Ruheform verformen** (Monster-Mash-Weg, „so starr wie möglich“, Haut mit Gedächtnis als Hauptlöser). Verstößt gegen M2/N2.
5. **Zusätzliche Angabe oder Zahl je Linie** (Rundung quer, Richtungsgriff, Spannung, Härte 0–1). Von ihm abgelehnt (N8, N9, M35).
   Selbsttätig aus dem Liniennetz gewonnene Richtung hat er dagegen als Beweis freigegeben ([P] Z. 977–978).
6. **Hilfslinien oder Punkte von selbst** (mehr Linien, damit die Form festliegt; „Punkte wo nötig“ als stiller Standard).
   Verstößt gegen M9/N6; „Punkte wo nötig“ ist seine offene Wahl.
7. **Getrennte Körper vereinigen oder Volumen verschmelzen** (Abstandsfelder, Kugel-Vereinigung, Skelett-Röhren für Hörner und Hals).
   Verstößt gegen N3, N4, M8.
8. **Umriss oder Ansichten als Bedingung für den Löser** (Silhouette treffen, Sichthülle). Verstößt gegen M4, M5.
9. **Volumen erhalten oder nach Dicke aufblasen**, um Aufblähen und Schrumpfen zu bändigen. Koppelt Breite und Höhe (M7).
10. **Linien oder Griffe von selbst korrigieren** (auf die Haut zurückziehen, neu abtasten, Griffe kürzen oder sperren, die Umkehr
    still begrenzen). Verstößt gegen M19, M23, M25; „rot oder begrenzen“ ist seine offene Entscheidung.
11. **Löser ganz ohne Geschichte** (Form nur aus den Kurven). Kollidiert mit M22 (neue Linie ändert die Haut nicht) und mit der Kugel
    ohne Loops: Mit dem Löser über die ganze Haut zog schon der erste Ring die Kugel bis 10,6 weg ([P] Z. 472–473, dort gemessen).
    Ein solcher Vorschlag muss sagen, was bei 0–2 Loops und beim Anlegen gilt.
12. **„½ Bildpunkt bei 100 %“ als Ziel.** Florian arbeitet bei ≥ 300 %. Der beste gemessene Stand (Hals 0,34–0,36 Einheiten,
    [P] Z. 691, 751) ist bei 307 % rund 0,9–1,0 Bildpunkte, Rüssel 1,43 → 3,9, Ohr 3,62 → 9,9 (eigene Umrechnung mit 2,74 px je
    Einheit aus [P] Z. 526).
13. **Punktzahl deckeln oder gröber rechnen, um Tempo zu gewinnen.** Verstößt gegen M11, M15, M16.
14. **Glätte nur in der Anzeige** (Normalen glätten, Tessellation im Shader), während das Netz grob bleibt. Dann zeigen Ansicht und
    Umriss nicht mehr das echte Mesh (M5), und Spielnetz und Kanten stimmen nicht mit dem Gesehenen (M33).
15. **Glätt- oder Aufblas-Pinsel in der Grundform** als Korrektur. Der Löser aus den Kurven überschreibt ihn ([B] Z. 270); Pinsel
    nur in Posen und mit niedriger Priorität (M29).
16. **Offene Striche** für Brauen, Falten, Kanten. Verstößt gegen M9.
17. **Halbe Haut voraussetzen.** Symmetrie der Grundform ist nicht entschieden (Abschnitt 4, Nr. 3).
18. **Neue Schalter, Toleranzen oder Qualitätsregler** für Florian. Sein Befund vom 10.11. nennt die Regler als Teil des Problems;
    es gibt schon 17 Schalter in `kurven.ts`.
19. **Punkt beim Ziehen auf der Haut gleiten lassen / freier 3D-Griff in den Blättern.** Verstößt gegen die gesperrte Ansicht (M26).
20. **Zusatz-Loops für Posen** (Kinnlinie, Gelenklinien). Verstößt gegen M30.

**Nicht verboten, obwohl man es meinen könnte:** ein Rechenkern außerhalb von JavaScript oder eine native App (M34); ein Käfig oder
Stücknetz aus den Loops **nur für das Spielnetz** ([K] Z. 33: Loops als „guidelines für die topologie“); Ecken von selbst an
Kreuzungen mit einer Kante (seine Entscheidung vom 05.11., [G] Z. 228–230); Gedächtnis in der Pose (dort ist der Blendshape gewollt).

**Vermutet, nicht geprüft:** Das Tempo-Kriterium „≤ 16 ms je Mausbewegung“ entspricht 60 Bildern je Sekunde. Laut Gedächtnis-Index
hat Florians Mac ein 120-Hz-Display; gerechnet wird je Mausereignis im selben Schritt (`kurven.ts` Z. 2952, 3007–3011). Ob „stockt“
schon bei eingehaltenen 16 ms auftritt, lässt sich nur an seinem Gerät klären.
