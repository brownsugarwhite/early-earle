# Beweis „Form zuerst“: dichte Form aus den Ansichten, Spielnetz gebacken (04.11.2026)

> **Nachtrag 04.11. abends: beiseitegelegt.** Florian: „Ja, fang so an: Seite zeichnen und sofort eine runde Form sehen, ohne
> Planseite und ohne Tore. Zeig es mir, sobald es geht.“ Gebaut wird in kleinen Schritten zum Anfassen, der nächste Schritt
> kommt aus seinem Blick. Diese Seite bleibt als Wissen (Bausteine, Fehlfälle des Käfigs, Messinstrumente), nicht als Auftrag.
> Stand: `CLAUDE.md`, Eintrag „Form zuerst zum Anfassen“.

> **Zur Freigabe durch Florian.** Anlass ist Florians Frage vom 04.11.: „In meiner Vision war das alles viel unkomplizierter …
> so viele Polys wie nötig wie bei ZBrush/Sculptris, dann fürs Spiel runterbacken … Outlines per Shader … warum versteifen wir
> uns auf feste Shapes und Grundformen, die 1000 Regeln brauchen?“ Die Antwort der Session „3D mesh workflow simplification“
> steht kurz in Abschnitt 1. Die Tore sind mit der Käfig-Session (P2 Stücknetz) abgestimmt. Dort ist die Käfig-Arbeit
> angehalten, bis dieser Beweis entschieden ist (Commit 82aed6dc). Gearbeitet wird im Arbeitsbaum `.claude/worktrees/form-zuerst`
> auf Branch `claude/form-zuerst`. Die Dateien und die Doku von P2 bleiben unberührt.

## 0. Kurzfassung

- **Was geprüft wird:** Aus Florians drei Zeichnungen und seinen Linien entsteht ohne vorab festgelegte Topologie ein dichter,
  runder Körper, der die Zeichnungen trifft. Geprüft wird an genau den Fällen, an denen die Käfig-Wege gescheitert sind. Das
  Spielnetz wird am Ende gebacken. **Die Ansichten sind die Outlines des Modells, gezeichnet von einem Shader** (Florians Idee,
  Baustein 8, ab Tag 1): Es gibt keine eigene Umrissberechnung mehr für die Anzeige.
- **Acht Bausteine, sonst nichts** (Abschnitt 2). Alles, was darüber hinausgeht, ist eine Regel. Sie kommt mit Grund in die
  Regeltabelle (Abschnitt 5) und wird gezählt.
- **Sechs Tage:** Einteiler im Editor mit Outline-Ansichten → Mehrteiler mit verdeckten Linien → Linien mit Härte → Backen mit
  Pose → Maul (zwei Tage). Jeder Tag hat Tore, einen Bogen zum Vergleich mit dem Käfig und ein Abbruchkriterium (Abschnitt 3).
- **Nachtrag 04.11. (Florian: „Was ist mit meiner Shader-als-Outline-Idee?“):** In der ersten Fassung stand der Shader nur als
  Teil von Tag 3 und nicht als Baustein. Das war falsch gewichtet, denn er erspart eine ganze Maschinerie und zeigt Florian das
  Ergebnis so, wie er es beurteilt. Jetzt ist er Baustein 8 und ab Tag 1 im Editor; damit hält der Plan auch unsere eigene
  Lehre L10 ein („am ersten Tag ein Bild aus dem Editor“).
- **Nicht Teil des Beweises:** Tempo beim Ziehen (wird gemessen, ist aber kein Tor), Muster und Zonen, Zähne, Augen,
  Feuer/Gas/Fell und der Umbau des Editors. Der Käfig bleibt unverändert Standard und Rückfall.

## 1. Warum dieser Beweis

- Seit dem 13.10. ist ein grober Viereck-Käfig die einzige Wahrheit, seit dem 02.11. auch das Spielnetz (Gegenprüfung, I5:
  „Keine Umwandlung, kein Reduzieren“). Er muss gleichzeitig die Zeichnungen treffen, jede Linie als Loop tragen, das Maul
  samt Mundwinkel enthalten, in allen Posen faltenfrei bleiben und ins Budget passen. Die Topologie muss also stehen, bevor es
  die Form gibt. Das ist eine automatische Retopologie im Voraus. Jede neue Form brauchte deshalb eine neue Topologie-Regel
  (Kernring, Leiter, Fenster, Kragen, Endstück, Stücknetz). Der Kern hat heute ≈ 44 600 Zeilen, davon ≈ 8 700 für den
  Maul-Einsatz.
- Alle vier Käfig-Wege (Röhre, Schleifen-Käfig, Kernring, Stücknetz) gehen in dieser Reihenfolge vor. Ihre Restfehler entstehen
  daraus, dass die Topologie vor der Form feststeht, und das Budget hält bei keinem (Abschnitt 3, „Woran der Käfig scheiterte“).
- Dichte Wege wurden nie mit allen drei Zeichnungen als Bedingung gebaut:
  - Werkstatt 07.10.: Abstandsfeld aus Grundkörpern, 52–74 % Deckung mit den Bögen.
  - Schnitt-Loft 13.10.: grobes Raster, Florians Urteil „zerrissen, kantig“.
  - „rund“ 13.10.: nur die Seite war Bedingung, Top/Front lagen bis 37 px daneben. Die Tropfenform gefiel.

  Am 16.10. wurden dichte Wege mit Argumenten verworfen, die Editor und Spiel vermischten. Am 21.10. fielen sie allein wegen
  „keine feste Topologie“. Eine feste Topologie braucht aber nur das Spielnetz, und das kann am Ende gebacken werden. So läuft
  es auch in der Produktion: erst formen, dann reduzieren und die Normalen backen.
- Vorbilder:
  - Rivers, Durand, Igarashi 2010: Silhouetten in mehreren Ansichten, Berührkurven fest, Glätten nur nach innen, live.
  - FiberMesh 2007: Kurven glatt oder scharf, dazwischen eine Fläche „so rund wie möglich“; das Netz ist nur Mittel zum Zweck.
  - Monster Mash 2020: Teile als überlappende Umrisse, weich vereinigt.
  - Fürs Backen mit Posen: Landreneau/Schaefer 2009 und DeCoro/Rusinkiewicz 2005.

## 2. Bauweise: acht Bausteine

Das Netz ist ein Dreiecksnetz der rechten Hälfte, gespiegelt. Die Kantenlänge beträgt 1–2 px bei 461 px je Blatt (die
Messgröße von `abweichung.ts`). Die Topologie trägt keine Bedeutung: Sie entsteht beim Vernetzen und darf sich bei jeder
Änderung ändern. Bedeutung tragen nur die Zeichnungen, die Linien und die Daten an ihnen.

1. **Sichthülle als Grenze.** Je Ansicht gibt es ein 2D-Abstandsfeld zur gezeichneten Kurve, längs der Blickrichtung gestreckt.
   Die Hülle ist ihr Schnitt. Der Körper liegt nie außerhalb der Hülle, damit bleibt jede Ansicht in ihrer Zeichnung.
   Widersprüche zwischen den Zeichnungen zeigt die Hülle wie heute rot.
2. **Umrisse als Berührkurven.** `umrissPlan(dok)` aus P1 Tag 1 liefert je Ansicht die 3D-Schleifen: Tiefe aus der Hülle mit
   kleinster Biegung, T-Stöße als Sehnen, in 1–5 ms. Entlang dieser Kurven berührt der Körper seine Hülle. Sie gelten als feste
   Bedingungen.
3. **Linien ins Netz schneiden.** Jede Kurve (Berührkurve, P-Linie, später die Maullinie) wird als Kette von Netzkanten
   eingesetzt; an den Kreuzungen werden die Dreiecke geteilt. Das ist ein einziges Werkzeug statt vieler Topologie-Regeln. Auf
   Dreiecken braucht es dafür keine Pole, Muster oder Ganzzahlen.
4. **„So rund wie möglich“.** Geglättet wird nach FiberMesh:
   - die Krümmung von den Kurven aus glatt über die Fläche verteilen,
   - die Lagen danach lösen (zwei dünn besetzte Systeme mit `laplace` und `cgDirichlet` aus `loeser/cg.ts`),
   - die Fläche in die Hülle klemmen,
   - das Ganze einige Runden wiederholen.

   Drei Kreise ergeben so eine Kugel.
5. **Härte = Kopplung über die Linie.** Ein Strich von 0 px heißt volle Kopplung (glatt), 3 px heißt keine Kopplung (Falte),
   dazwischen geht es stetig. Der Winkel kommt aus der Form, wie seit dem 12.10. vereinbart.
6. **Teile = eigene Körper, weich vereinigt.** Jedes Teil bekommt seine eigenen Schleifen (Flächenbaum des Umrissplans samt
   verdeckter Fortsetzung, wie Florians Illustrationen je Teil) und durchläuft die Bausteine 1–5. Danach werden die
   Abstandsfelder weich vereinigt (Kehle am Ansatz), und das Ganze wird neu vernetzt. Den Radius der Kehle gibt die Härte der
   Ansatzlinie vor.
7. **Backen.** Das dichte Netz wird auf ≤ 8 000 Dreiecke ausgedünnt. Der Fehler wird dabei über Ruhe- und Posenlage zugleich
   gemessen; gezeichnete Linien und Mittelebene sind geschützt. Die Normalen kommen von der dichten Fläche. Kandidat ist der
   Vereinfacher von meshoptimizer (läuft in JavaScript), sonst ein eigener Kantenkollaps nach Fehlerquadriken.
8. **Ansichten = Outlines des Modells, gezeichnet von einem Shader** (Florians Idee). Die Blätter zeigen keine nachgerechneten
   Kurven mehr, sondern das Modell selbst als Illustration:
   - **Umriss:** In den drei Blättern ist die Blickrichtung fest. Je Blatt und Bau wird die Kontur des dichten Netzes einmal
     bestimmt, als glatte Kontur aus den Normalen (Hertzmann/Zorin 2000), und zwar je Teil getrennt.
   - **Linien:** Dazu kommen die gezeichneten Linien und die Ansatzlinien, also die Stellen, an denen zwei Teile sich treffen.
   - **Strich:** Der Umriss hat einen festen Strich. Gezeichnete Linien haben 0–3 px nach ihrer Härte, verjüngte Enden und sind
     weich gestrichelt. Ansatzlinien sind gestrichelt.
   - **Sichtbarkeit:** Der Shader vergleicht jede Linie mit der Tiefe des Körpers: sichtbar voll, verdeckt blass
     (Entscheidung E1).
   - **Verdeckte Fortsetzungen entstehen von selbst:** Jedes Teil ist ein eigener Körper (Baustein 6). Sein Umriss läuft hinter
     dem anderen Teil weiter und erscheint dort blass, etwa der Bauch unter dem Kopf oder der Rumpf unter den Flügeln. Genau an
     dieser Stelle (Front/Top als Vereinigung von Rumpf und Kopf) scheiterte P1.
   - **Bühne:** Mit freier Kamera gilt dieselbe Kontur je Bild oder ein Kantenfilter auf Tiefe und Normale.
   - **SVG:** Dieselben Linien ergeben das SVG (Idee I1: das Blatt ist das SVG).
   - **Florians Kurvenpunkte** liegen als Griffe darüber. Wo Modell und Zeichnung auseinandergehen, sieht er es sofort.
   - **Was entfällt:** Die eigene Umrissberechnung für die Anzeige (`umrissKurven.ts` und `netzSicht.ts`, zusammen ≈ 1 500
     Zeilen, dazu der Chip „umrisse aus | an“) wird nicht mehr gebraucht. Die „sehr sehr wilden“ Linien von V2 waren solche
     nachgerechneten Kurven auf dem groben Käfig.
   - **Spiel:** Dort gilt bisher Florians Regel vom 30.09.: keine dünnen Konturen, nur keine oder eine absurd fette
     Verlaufskontur. Derselbe Shader kann das später auch; entschieden wird es nicht in diesem Beweis.

Vernetzt wird mit den Surface Nets der alten Werkstatt (`packages/creature/src/mesh/surfaceNets.ts`: `contour`,
`projectAndNormals`, `largestComponent`). Ob sie als Abhängigkeit eingebunden oder herausgelöst werden, entscheidet der erste
Tag.

## 3. Tage, Tore, Bilder

**Woran der Käfig scheiterte** (der Maßstab, von der Käfig-Session gemessen):

- **P1 Mehrteiler:** Tor Front/Top ≤ 2 px verfehlt (Robbe 4,4/3,3, Langhals 4,1/2,9, Ente 4,5/2,7, Pilz 0,8/2,0 px). Naht-Tor
  (Ansatz ohne Falte ≤ 15°) verfehlt: Langhals 18–20°, Ente 20–25°, Robbe 14–37°. Ursache sind verdeckte Fortsetzungen, die
  keine Ansicht zeigt.
- **P1 Einteiler:** gescheitert an Kegel (Kippung 84 px, Kappe faltet), Stift-Würfel (Rundung gegen Falte) und Vase aus der
  Kugel (Messerkante); Zylinder und runde Vase 0,7–1,3 px. Kugel, Ei und scharfen Würfel trifft der Käfig schon.
- **P0a Spielstufe:** Umriss-Tor (≤ 1 Gerätepixel bei 300 px Höhe) verfehlt an Rex, Langhals, Robbe, Tigerkopf und Kegel;
  Knicke von 45–88° abseits der Falten.
- **P2 Maul:** offen an Robbe hoch J und Rex mittel gerade. Das Öffnen (Tasche, Rachen, Kiefer-Pose) wurde nie gebaut. Das
  Maulfeld hat auf K2 1 200–3 700 Flächen, das Tor liegt bei 300.

Im dichten Netz ist „Haut ≤ 0,25 px gegen A0“ kein Tor mehr, denn das Netz ist die Fläche. Verglichen werden: Δ je Blatt gegen
die Zeichnung, Knick, Umriss-Tor des Spielnetzes, Mundwinkel im Zebra und die Regelzahl.

**Messung, für alle Tage gleich:**

- Δ je Blatt mit `blattAbweichungen`, Raster 1920 (240 kappt Ecken um 1 px).
- Knick = Normalenänderung über 2 px Abstand, abseits gezeichneter Ecken und Linien. Dasselbe Maß an A0 ergibt an glatten
  Körpern 1,6°.
- Prüfkörper im Ablauf aus der Startkugel (`extremMessung.ts`: `startkugel`, `imAblauf`), wo es ihn gibt.
- Bögen mit demselben Renderer wie die Käfig-Bögen (`p2-bogen.ts`, `kontaktbogen-html.ts`, `html-shot.mjs`):
  A0 | Käfig (bester Stand) | dicht | Zebra.

| Tag | Inhalt | Körper | Tore |
|---|---|---|---|
| 1 | Einteiler im Editor: Bausteine 1–4 und 8 | Kugel, Ei, scharfer Würfel, Zylinder, runde Vase, Kegel, Stift-Würfel, Vase aus der Kugel (`EINTEILER`) | Umrisse in allen drei Blättern ≤ 0,5 px; keine Falte, die niemand gezeichnet hat (Knick ≤ 3°); Zebra unter 45° rund; Outline im Blatt = Umriss des Modells, ruhig (Netz um 0,1 px gestört → Linie ≤ 0,2 px, Lehre L5); Zeichnen ≤ 16 ms je Bild; im Editor sichtbar (Chip „Körper: Käfig \| dicht“); Bauzeit gemessen (kein Tor) |
| 2 | Mehrteiler: Baustein 6 | Langhals, Ente, Robbe, Pilz | Seite ≤ 1 px, Front/Top ≤ 2 px; Ansatz ohne Falte ≤ 15°; verdeckte Fortsetzungen blass im Blatt (Bauch unter dem Kopf, Rumpf unter den Flügeln), Ansatzlinien gestrichelt |
| 3 | Linien mit Härte: Bausteine 3, 5, 8 | Kegel-Kante, Stift-Würfel, Tigerkopf | Kante ≤ 0,3 px auf der Linie; Faltenwinkel steigt mit der Härte 0/50/100 %; Strich im Blatt 0 → 3 px, Enden verjüngt, weich gestrichelt; Linie um ±2 px verschoben → Form ändert sich nur örtlich |
| 4 | Backen mit Pose: Baustein 7 | Rex, Langhals, Robbe, Tigerkopf, Kegel | ≤ 8 000 Dreiecke; Umriss ≤ 1 Gerätepixel bei 300 px Höhe; eine Pose (Knochen + Formdelta als Verschiebung im Raum) durch das gebackene Netz ohne sichtbare Durchdringung; Cel-Stufen ohne Treppen (Florians Blick) |
| 5–6 | Maul als Schnitt | Robbe hoch J, Rex mittel gerade, Tigerkopf (Mercedesstern auf der Frontplatte), Langhals hoch J | Lippen exakt auf der Linie (Schnitt); geöffnet bei 50 und 100 %: Mundwinkel glatt im Zebra, 0 Durchdringungen auf sichtbarer Haut; samt Tasche und Rachen ≤ 8 000 Dreiecke |

**Abbruch:**

- Tag 1 verfehlt die Form-Tore an den Einteilern, ohne dass eine neue Regel hilft → Abbruch und Bericht.
- Eine Regel, die einen Körper oder eine Lage nennt → Abbruch.
- Ab der dritten neuen Regel wird angehalten: Struktur prüfen, Florian fragen.
- „Bestanden“ sagt Florian, nachdem er den Bogen gesehen hat.

**Was du siehst:** ab Tag 1 den dichten Körper im Editor, die drei Blätter als Outline-Illustration des Modells mit deinen
Kurven darüber, und jeden Tag einen Bogen neben dem Käfig.

## 4. Messinstrumente (vorhanden, werden wiederverwendet)

- **Prüfkörper:** `kern/pruefen/einteiler.ts`, `grundkoerper.ts`, `koerper.ts`, `extremreihe.ts`; Maullinien in `linien.ts`,
  Maulfälle in `einsatzFall.ts`.
- **Florians Ablauf:** `kern/pruefen/extremMessung.ts` (`startkugel`, `imAblauf`, `editorBauen`, `umrissLinien`,
  `abstandFlaeche`, `linieAufHaut`).
- **Δ je Blatt:** `kern/abweichung.ts`; `blattAbweichungen` nimmt beliebige Netze.
- **Umrissplan:** `kern/umrissPlan.ts` (`umrissPlan`, `punkt3`, Tore in `umrissPlan.test.ts`).
- **Spielstufe:** `kern/spielstufe.ts` (`SPIEL_BUDGET`, `SPIEL_HOEHE_PX`, `spielGeraetepixel`). Der Umrissvergleich braucht
  eine Fassung, die gegen das dichte Netz misst statt gegen den Käfig.
- **Löser:** `loeser/cg.ts` (`laplace` mit Kotangens-Gewichten, `cgDirichlet`), `loeser/normalSystem.ts`.
- **Dichte Werkzeuge der alten Werkstatt:** `packages/creature/src/mesh/` (Surface Nets, Dual Contouring, `cutMouth`),
  `packages/creature/src/sdf/`.
- **Tore als Tests:** `vitest.extrem.config.ts` (`pnpm --filter @ee/shape test:extrem`), Vorlage
  `kern/einsatz/stuecknetz.extrem.ts` mit `it` / `it.fails` und OFFEN-Liste. Ein verfehltes Tor wird nie still übergangen.
- **Fallen:**
  - macOS kennt kein `timeout`.
  - Grenzlagen messen, nicht Kontrollpunkte.
  - Den Knick am Start gegen den gelösten Zustand messen.
  - Nie in `~/Documents/early earle Editor/Bibliothek` schreiben.
  - Florians Dev-Server (Port 5180) nicht benutzen.
  - Während E2E keine Dateien unter `apps/editor/src` oder `packages/shape` ändern.

## 5. Regeln (wird während des Beweises geführt)

| Nr. | Regel | Grund | nennt Körper oder Lage? |
|---|---|---|---|
| – | noch keine | | |

## 6. Was bleibt, was ruht

- **Bleibt so oder so:** Umrissplan, Prüfkörper, Messreihe und Bögen, Posen als Knochen + Blendshape (Florians Grundidee), der
  Look (Cel-Stufen, Zonen-Atlas), die Editor-Oberfläche und Florians Klarstellungen Teil 1.
- **Ruht bis zur Entscheidung:** die Käfig-Arbeit in der Käfig-Session (Hals-Schnitt, Ersatz des Kernrings, E3/E4 auf dem
  Käfig). Im Editor bleibt der Käfig der Standard und der Rückfall.

## 7. Risiken (ehrlich)

- **Tempo:** Glätten auf 20 000–50 000 Punkten dauert in TypeScript Sekunden. Der Beweis misst nur. Für den Editor braucht es
  später eine grobe Vorschau beim Ziehen und die volle Auflösung beim Loslassen.
- **Ecken ohne Linie:** Hat ein Umriss eine Ecke, ohne dass eine Linie gezeichnet ist, gibt die Hülle eine Antwort darauf, wo
  die Kante läuft (Kegel, Würfel). Ob sie Florian gefällt, zeigt Tag 1.
- **Umrissplan:** Seine offenen Punkte (Tiefe aus Vereinigungs-Intervallen, ganz verdeckte Schleifen) treffen auch diesen Weg.
  Tag 2 zeigt, ob Teile als eigene Körper sie lösen.
- **Muster und Pinsel:** Muster brauchen Flächenkoordinaten, Pinsel ein Verschiebungsfeld im Raum statt Punktnummern. Im Beweis
  wird das nur für eine Pose gezeigt.
- **Editor am ersten Tag:** Der Worker baut den dichten Körper neben dem Käfig, die Blätter bekommen den Outline-Shader. Dauert
  die Einbindung länger, zeigt Tag 1 zuerst den Bogen mit denselben Linien (gleiche Kontur-Rechnung), und der Editor folgt an
  Tag 2. Das wird dann ausdrücklich gemeldet.
- **Das Maul** bleibt das schwerste Stück. Der Schnitt macht die Lippen exakt; wie der Mundwinkel beim Öffnen aussieht, ist
  offen.

## 8. Dateien (neu, nur in diesem Arbeitsbaum)

- `packages/shape/src/dicht/`:
  - `huelle.ts`: Sichthülle
  - `netz.ts`: Dreiecksnetz, Spiegel, Normalen
  - `schneiden.ts`: Linien einsetzen
  - `glaetten.ts`: rund wie möglich, Härte
  - `teile.ts`: Teile vereinigen
  - `kontur.ts`: Konturen je Blatt und Teil, Ansatzlinien, SVG
  - `backen.ts`, `messen.ts`
  - Tests `dicht/*.test.ts`, Tore `dicht/form.extrem.ts`
- Editor: dichter Bau im Worker als zweite Bauweise neben dem Käfig, Outline-Durchgang für die Blätter in
  `apps/editor/src/three/` (Linien mit Breite, Tiefenvergleich: sichtbar voll, verdeckt blass), Chip „Körper: Käfig | dicht“.
- Skripte `apps/editor/scripts/pruefen/dicht-*.ts`, Bögen `docs/progress/editor/dicht-*.jpg`.
- Den Stand je Tag schreibt der Beweis an das Ende dieser Seite.

## 9. Verifikation

- Je Commit `pnpm typecheck`, `pnpm test` und `pnpm lint`.
- Die Tore laufen in `test:extrem` (`it` / `it.fails`, OFFEN-Liste).
- Jeden Tag ein Bogen.
- Am Ende Florians Urteil.
