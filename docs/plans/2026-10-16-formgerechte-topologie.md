# Plan: Formgerechte Topologie — der Wirbelsäulen-Baum, der seine Form versteht (16.10.2026)

Ergänzt Teil G des freigegebenen Plans „Maul als Einsatz, Werkzeug-Harmonie und Posen“
([`2026-10-15-maul-einsatz-harmonie-posen.md`](2026-10-15-maul-einsatz-harmonie-posen.md)) und ersetzt dort den Bauweg von
G4 neu ab Schritt 3. **Zur Freigabe durch Florian.**

## Anlass

Florian (16.10. früh): „Die Wirbelsäulen-Baum muss automatisch entstehen können! Man erkennt an den 3 Shapes genau welche
‚Wirbelsäulen‘ gebraucht werden. Sobald ein Vektorshape aus einer Ansicht einen Bauch bekommt, muss die Wirbelsäule in
diese Richtung automatisch entstehen!“ — und danach: „Überlege nochmal, ob das mit dem Wirbelsäulenbaum nicht doch die
eleganteste Lösung ist … Das ganze Mesh muss intelligenter sein und verstehen, welche Shapeform welche Art von Meshaufbau
und Topologie verlangt!“

## Antwort: Ja — der Baum ist der richtige Weg, gescheitert ist der Ansatz der Äste

- **So bauen es die Vorbilder:** ZBrush (ZSpheres, „Adaptive Skin“), der Skin-Modifier in Blender, in der Forschung B-Mesh
  (Ji, Liu, Wang 2010) und Skeletal Quad Meshes (Bærentzen, Misztal, Wełnicka 2012). Gemeinsam: ein Baum aus Gliedern mit
  Radius; jedes Glied wird eine Röhre aus Vierecken; **an jedem Abzweig sitzt ein kleiner Knoten**, dessen Form sich aus den
  Richtungen der angeschlossenen Glieder ergibt, und jedes Glied schließt mit seinem eigenen Ring an eine Seite dieses
  Knotens an. Unterschiedliche Ringgrößen werden örtlich vermittelt. Danach wird unterteilt und auf die Zielform gezogen.
- **So habe ich es gebaut (G4 neu, Schritt 3, angehalten):** Feld auf der Rumpfnaht entlang der Schnittsehne, Ast mit so
  vielen Punkten je Ring, wie der Feldrand hat. An der schrägen Halsbasis wurde das Feld lang und schmal (Langhals 12 × 4
  Flächen), der Hals ist rund: Die Vierecke dazwischen verzogen sich (553 von 759 Falten an der Sehne). Das ist der Weg der
  Beine aus Beweis 3 — gut für einen kleinen Ast, der senkrecht aus der Haut kommt, nicht für einen Hals, der schräg auf
  einem langen Ansatz sitzt.
- **Was schon steht und bleibt:** Mittelachse der drei Silhouetten (`kern/grundkoerper/skelett.ts`), automatische
  Zerlegung (`zerlegung.ts`: Hals bei Knick + Dickensprung, Flossen und Schwanzlappen als Gabeln, einfache Körper bleiben
  ganz), Rumpf mit eigener Wirbelsäule (kein Fächer mehr im Entenkörper; Giraffe-Rumpf Falten 88° → 8°).

## Konzept: Form erkennen → Teile einordnen → Aufbau je Art → einpassen → einfrieren

1. **Form erkennen (aus den drei Shapes, automatisch):** Mittelachsen mit Radius je Punkt (Seite für die Mittelebene, Top und
   Front für seitliche Paare), Dicke und Dickensprünge, flach oder rund (Verhältnis der Breiten in Front und Top quer zur
   Achse), Gabeln, Knicke (Abweichung von der Geradeausrichtung im Verhältnis zum Radius), Ecken und Kanten der Profile
   (Teil L).
2. **Teile einordnen:**
   - **Rumpf** (dickster Teil, eigene Wirbelsäule wie heute),
   - **runder Ast** (Hals, Schwanz, Bein, Augenstiel),
   - **flacher Ast** (Flügel, Flosse: in einer Ansicht breit, in der anderen dünn),
   - **Gabel** (zwei etwa gleich dicke Fortsetzungen: Schwanzlappen, zwei Hälse),
   - **Knick** (die Achse biegt enger, als der Radius erlaubt: Hals → Kopf),
   - **Kappe/Spitze** (Schnauze, Schwanzende) und **Kanten** (Ecken der Profile).
3. **Aufbau je Art (Topologie-Rezepte):**
   - **Gleich große Vierecke überall:** Punkte je Ring nach Umfang und einer Ziel-Kantenlänge (dicker Rumpf viele, dünner Hals
     wenige; immer durch 8 teilbar, damit Kappen aufgehen), Ringabstand nach Krümmung. Wechselt die Punktzahl entlang eines
     Teils, vermittelt eine **Übergangsreihe mit Polpaaren** (Valenz 3/5) — dieselbe Technik wie im Maul-Einsatz (Teil A).
   - **Ansatz eines Asts = Knoten:** Das Feld auf dem Elternteil ist **so groß wie der Querschnitt des Asts am Ansatz**
     (quer aus Front bzw. Top, längs aus der Sehne; beide Seiten etwa gleich lang, also k × k Flächen für 4k Punkte je Ring).
     **Übergangsringe** heben den Feldrand zuerst entlang der Flächennormale ab und drehen dann in die Astrichtung (wie eine
     Hohlkehle); ihr Querschnitt geht vom Feldrand in den Ast-Querschnitt über. Ist der Ast dicker, als ein k × k-Feld
     erlaubt, wird das Feld breiter und der Ast vermittelt seine Punktzahl über eine Übergangsreihe.
   - **Knick:** Die Ringe drehen um die Innenseite (Fächer nur innen, außen gleichmäßig), statt der kürzesten Leiter.
     Biegt die Achse enger als etwa der Radius, wird der Knick ein Knoten wie ein Abzweig (Kopf als Glied am Hals).
   - **Flacher Ast:** Linsenringe mit wenigen Punkten über die Dicke und einer Kante an der Linsenspitze (scharf oder weich nach
     Zeichnung), Ansatz wie oben, aber das Feld liegt längs der Wurzel des Flügels.
   - **Gabel:** Ein Ring teilt sich in zwei (Hosen-Topologie): Der Elternring hat so viele Punkte wie beide Kinder zusammen,
     abzüglich der gemeinsamen Mittelkante.
   - **Kanten:** Kantenschleifen genau auf der Kante (Teil L, „Fläche bleibt, Netz gleitet“).
4. **Einpassen:** Danach legt sich das Netz wie heute genau auf die Umrisse (Naht auf dem vollen Seitenumriss, Breiten aus
   Front und Top, Ausgleich). Der Käfig bleibt die einzige Wahrheit.
5. **Einfrieren:** Teile, Rezepte und Ansätze werden wie die Stationen eingefroren. Ein Zug verschiebt nur Lagen; neu
   geplant wird nur, wenn sich die Einordnung ändert (eine neue Ausbuchtung, ein Ast verschwindet) — mit Übertrag der
   Pinsel- und Pose-Daten über ihre Lage (wie der Übertrag aus der Umgebung in B2).

## Beweise in dieser Reihenfolge (je Schritt Bilder und Zahlen, dann weiter; nach drei Fehlanläufen an derselben Stelle Halt)

1. **Ansatz als Knoten, runder Ast:** Hals auf dem Rumpf — Giraffe, Langhals, Drache, S-Hals, Ente (Hals ohne Kopf-Knick).
   Kriterien: an der Halsbasis keine Falte über 20° (gemessen nach Orten, Ansatzzone eigens), kleinster Flächenwinkel ≥ 25°,
   Seitenverhältnis ≤ 3; Δ je Blatt höchstens so groß wie mit der einzelnen Wirbelsäule (Ziel ≤ 2 px); Zebra ohne Knick am
   Ansatz; Körper ohne Ast bitgleich.
2. **Gleich große Vierecke:** Punkte je Ring nach Umfang mit Übergangsreihe (dicker Rumpf ↔ dünner Hals). Kriterium: Kantenlänge
   über das ganze Netz innerhalb Faktor 2 um den Median, keine neuen Falten.
3. **Knick:** Hals → Kopf (Ente, Giraffe, S-Hals). Kriterium: keine Falte über 20° im Knick, Seite Δ ≤ 2 px.
4. **Flacher Ast:** Flügel der Ente (aus dem Top: ganzer Flügel vom Abzweig bis zur Spitze; Höhe und Dicke aus der Front),
   Brustflossen des Fischs. Kriterium: Top und Front Δ ≤ 2 px, Linsenkante sichtbar, Ansatz ohne Falte.
5. **Gabel und Mittelebenen-Äste:** Schwanzlappen und Rücken-/Bauchflosse des Fischs. Kriterium wie oben.
6. **Kontaktbögen neben Florians Bögen (Ente aus seinem Bild), dann Florians Urteil (G5).** Erst danach in den Editor (mit
   Einfrieren, Undo, Posen).

## Risiken und Grenzen (ehrlich)

- Punktzahl-Wechsel (Polpaare) an einem Ast und am Maul-Einsatz müssen zusammenpassen, wenn das Maul auf einem Ast sitzt
  (Ente: Schnabel am Kopf-Glied). Das Maul kommt deshalb nach dem Knick-Beweis.
- Teile, die in einer Ansicht vor dem Körper liegen, haben dort keinen eigenen Umriss (Flügel in der Seite): Ihre Lage kommt
  aus den anderen beiden Ansichten; ist sie mehrdeutig, wählt die Automatik und Florian kann verschieben.
- Zwei Äste dicht nebeneinander (Beine, Flossen) dürfen sich nicht durchdringen: Prüfung nach Bereichen wie beim Maul.

## Dateien

- Neu: `packages/shape/src/kern/grundkoerper/knoten.ts` (Ansatz als Knoten, Übergangsringe), `topologie.ts` (Rezepte,
  Punkte je Ring, Übergangsreihe), Tests je Beweis; Skripte `apps/editor/scripts/pruefen/grundkoerper-g.ts` (BAUM-Modus),
  `skelett-g4.ts`, `zerlegung-g4.ts`.
- Weiterverwendet: `skelett.ts`, `zerlegung.ts`, `baum.ts` (Zerlegung, Brücke, Rumpf), `ableiten.ts` (Leiter, Stationen,
  Ziele, Ausgleich), Übergangsreihe aus Teil A (`kern/einsatz/`), Teil L (`kern/netz/`).

## Verifikation

Kern-Tests je Beweis mit den Kriterien oben, Faltenorte nach Zonen (Ansatz, Knick, Kappe, Rumpf), Kontaktbögen (Seite,
Front, Top, schräg, Zebra), alle bisherigen Prüfkörper ohne Äste bitgleich; `pnpm typecheck`, `pnpm test`, `pnpm lint` je
Commit. „Bestanden“ sagt Florian.
