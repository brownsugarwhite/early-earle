# early earle — Projektgedächtnis

Diese Datei lädt jede Claude-Session automatisch. Sie hält den Stand, die Arbeitsregeln und die bekannten Fallen fest. Bei jedem größeren Schritt aktuell halten (kurz, Verweise statt Wiederholung).

## Stand: Prototyp 1 abgeschlossen, Produktion beginnt

> **Neue Sitzung ab 16.10.2026 (Florian): Falten, Wirbelsäulen und Kantenlinien.** Einstieg mit allem aus der Exploration
> vom 13.–16.10. (Ziele, Entscheidungen, Editor- vs. Kern-Stand, Messungen, Ursachen, Lehren, Werkzeuge, Startempfehlung):
> [`docs/plans/2026-10-16-einstieg-falten-wirbelsaeulen-linien.md`](docs/plans/2026-10-16-einstieg-falten-wirbelsaeulen-linien.md).
> **Freigegebener Plan dieser Sitzung (16.10. vormittags):** [`docs/plans/2026-10-16-liniennetz-zielform-kaefig.md`](docs/plans/2026-10-16-liniennetz-zielform-kaefig.md)
> (Form zuerst, dann ein Käfig darüber; Schritte S0–S8 mit Toren und Stand).
> **Ab 20.10. gilt der Plan [`docs/plans/2026-10-20-vektorillustration-bedienung.md`](docs/plans/2026-10-20-vektorillustration-bedienung.md)**
> (freigegeben): ehrliche Bestandsaufnahme S0–S8a mit frischen Messungen und Extremtest, Zielbild Vektorillustration,
> Umrisse als Käfigschleifen mit Silhouettenbedingung, Linien gleichzeitig, Bedienung nach Blender (⌘R-Loops, G/S/R,
> proportional), Schritte V0–V9; ersetzt S8 des Plans vom 16.10.
> **Ab 21.10. läuft Teil A „Maul als Einsatz“** (Florians Wahl vor V7; E1-Tore im Kern erreicht, Abnahme offen, als Nächstes E2) nach
> [`docs/plans/2026-10-21-maul-einsatz-weiter.md`](docs/plans/2026-10-21-maul-einsatz-weiter.md) (Schritte E1–E6). Einstieg für
> eine frische Sitzung mit Start-Prompt, Stand, nächsten Schritten, Skripten und Fallen: [`docs/UEBERGABE.md`](docs/UEBERGABE.md).
> Stand 21.10. (dritte Sitzung, abends): E2 mit Leiter — Haut-Tor 41 von 43, Mundwinkel 43 von 43 (Abnahme offen; Planseite
> „Stand E2.6“, offen: Rex mittel gerade, Robbe hoch J).
> **21.10. spätabends: Grundsatzfrage „Feldnetz statt Kernring?“** (Florian: Eleganz ist Grundvoraussetzung) — Recherche
> [`docs/research/2026-10-21-feldnetz-oder-kernring.md`](docs/research/2026-10-21-feldnetz-oder-kernring.md): Empfehlung
> Kernring einfrieren, Beweis F0 „Stücknetz im Maulfeld“ (Linien → Stücke → Ganzzahlen → Muster, ohne Richtungsfeld).
> Weitergeführt für das ganze Netz und die Linien:
> [`docs/research/2026-10-21-netz-und-linien-gesamt.md`](docs/research/2026-10-21-netz-und-linien-gesamt.md) — Zielbild
> „ein Liniennetz, ein Löser“ (Umriss zuerst, Stücknetz, harte lineare Bedingungen, Daten an den Linien), Prüfphase P1 „Umriss
> zuerst“ → P2 „Stücknetz im Maulfeld“ → P3 „Liniennetz am ganzen Körper“, je mit Abbruchkriterien.
> **Florians Entscheidung offen; bis dahin keine neue Sonderregel am Kernring und kein Umbau.**
> **02.11.2026: Florians Klarstellungen Teil 1 wörtlich in [`docs/plans/2026-10-22-klarstellungen.md`](docs/plans/2026-10-22-klarstellungen.md)**
> (Ansichten = Outline-Illustrationen je Teil, verdeckte Linien bearbeitbar, Loops als gezeichnete Linien, „so rund wie
> möglich“, weniger Werkzeuge, Spielqualität von Anfang an). Dazu die **Gegenprüfung**
> [`docs/plans/2026-11-02-gegenpruefung-liniennetz.md`](docs/plans/2026-11-02-gegenpruefung-liniennetz.md) und der **Prüfplan
> P0–P3** [`docs/plans/2026-11-02-pruefplan-p0-p3.md`](docs/plans/2026-11-02-pruefplan-p0-p3.md) — **am 03.11. freigegeben;
> P0a angesehen, P1 Tag 1 (Umrissschleifen), Tag 2–3 (Schleifen-Käfig, Einteiler) und Tag 4–5 (Teile an der Naht) gebaut —
> Abnahme offen, Florians Blick auf die Bögen entscheidet.** Einstieg: [`docs/UEBERGABE.md`](docs/UEBERGABE.md).

- **2026-10-04: Prototyp 1 ist abgeschlossen** (Archiv-Branch `prototyp-1`). Er diente zum Lernen. Florian: „Der Prototyp war sehr gut und aufschlussreich und hat bewiesen, dass die Spielidee toll ist.“ Viele Entscheidungen sind gefallen; die Gesamtdynamik und einige grafische Elemente haben ihm gefallen.
- **Jetzt beginnt die eigentliche Produktion mit dem finalen Look.** Grundlage wird **Florians neuer Plan mit neuem Hauptprompt**: Story, Charaktere und Map arbeitet er genauer aus und trägt sie in Dokumenten und Screenshots zusammen. Es folgen mehrere Runden und Iterationen.
- **Bis der neue Plan da ist:** keine Produktionsarbeit auf Basis der alten Pläne beginnen und den Prototyp-Code nicht eigenmächtig weiterbauen. Florian führt zwischendurch eigene Tests durch (u. a. KI-3D-Werkzeuge in der Cloud).
- **2026-10-05: Look-Beweis Grundblobs + Mischwesen** (Branch `claude/grundblobs`, Artefakt https://claude.ai/artifact/JfvK1CAf11oqfJXAiLyf5p): 13 Grundformen aus Florians Vorlage in Jelly/fest/Fell, Meshy-Modelle in Module zerlegt. Stand, Werkzeuge, Lücken: [`docs/look/grundblobs/README.md`](docs/look/grundblobs/README.md). Florian: Die Grundform der Blobs soll auch die Tierthemen tragen. **Urteil:** Mischwesen aus zerschnittenen ganzen Meshy-Tieren sehen „ganz ganz schlimm“ aus (Maßstab, Pose, Stil und Nähte passen nicht) – so nicht weiterverfolgen. Verworfen ist dieser Zusammenbau, nicht Meshy: Florians ganze Meshy-Modelle treffen den Look weiterhin „fast perfekt“. Test beendet mit einem **Modulsystem** (Elemente, Andockringe, Sockel, Editor): [`docs/look/modulsystem/SYSTEM.md`](docs/look/modulsystem/SYSTEM.md); Schnittlinien noch nicht abgenommen („meistens viel zu wenig geschnitten“).
- **2026-10-08/09: Wesen-Werkstatt, Blöcke 1–11 + Shader** (Lippenschnitt, Kieferrig mit Schädelkippung und Öffnungsart Ziehen/Kippen, Silhouetten- und Maul-Editor, Raubkatzenkopf mit Kastenmaul und Nasenrampe, zwei Maulränder und Maulspalt (Drache), glatte Maultasche, Schwanzansätze ohne Wulst, Musterzonen, Jelly-Lavalampe): Stand, Befunde und offene Punkte in [`docs/UEBERGABE.md`](docs/UEBERGABE.md); Florians Rückmeldungen chronologisch im Gedächtnis der Leitung. Harness-Bilder nur über `apps/game/e2e/wesen-shots.spec.ts` (Optionen in `docs/progress/wesen-lab-README.md`). **Stand 09.10.: Florian testet den Editor und sammelt Feedback; nächster Block = seine Liste.** Nach dem Pull den Dev-Server neu starten (HMR-Falle).
- **2026-10-07: Produktion beginnt mit Teil „Charaktere“.** Florian hat den Prototyp abgehakt und die Produktion in vier Teile gegliedert (Map, Spielfeld/Spielmechanik, Charaktere, UI). Zuerst entsteht die **Wesen-Werkstatt** (prozedurales Kreaturen-System + Charaktereditor) nach dem freigegebenen Plan [`docs/plans/2026-10-07-wesen-werkstatt.md`](docs/plans/2026-10-07-wesen-werkstatt.md): ein Bauplan je Wesen → implizite Form (Maul herausgeschnitten) → Skinned Mesh (Surface Nets im Worker) → gemaltes Earle-Wesen-Material nach Look-Vertrag; Phase 1 = Grundformen-Beweis mit Live-Reglern in `/lab/wesen`. **Das alte Spiel (Brett, Karte, Setzkasten, `packages/genome`, `render/src/creature`) bleibt unangetastet**, bis der Teil „Spielfeld“ umstellt. Neue Pakete: `packages/creature`, `packages/render/src/creature2`, `apps/game/src/lab/wesen`.
- **2026-10-11: Wesen-Editor als eigene Desktop-App** (`apps/editor`, Electron; Branch `claude/editor-grundlayout`). Florian baut den Charaktereditor neu als Shape-/3D-Editor: drei Profile (Seite, Front, Top) wie in Illustrator → live das Wesen, Navigation wie Blender, Layout exakt nach seiner Figma-Vorlage ([`docs/look/editor/`](docs/look/editor/)). Entscheidungen: eigene App im Monorepo (kein eigenes Repo), Format in `packages/shape`, jedes neue Wesen startet als Kugel. Stand: Grundlayout, Navigation, Kurven-Bedienung, Speichern/Library; das 3D zeigt einen **Platzhalter-Loft**. Die echte Bauweise folgt in einer großen Sitzung. Gedächtnis und Fallen des Editors: [`apps/editor/CLAUDE.md`](apps/editor/CLAUDE.md); Übergabe: [`docs/UEBERGABE.md`](docs/UEBERGABE.md).
- **2026-10-12: Maul, Zähne, Rig (Versuch, Vorbereitung der Fable-Sitzung):**
  - Florians Ablauf: Maullinie ab Achse/Kontur, Kiefer gleich/getrennt schon zu, offener Zustand, Zahn-Tab mit Zahnmenü, Rig-Tab; Seitenleiste immer offen.
  - Geprüft an Tiger, Rex, Robbe und Langhals (nachgezogen); Maul im Netz mit fester Topologie, Reißverschluss, Tasche, Kiefer als Knochen + Korrektur. Bedien-Versuch im Editor.
  - Bauweise bleibt **Shapes → Loft → Käfig**.
  - Dazu Zähne am Zahnfleisch (im 3D, in Seite/Front wählbar und verschiebbar, Prüfung im geschlossenen Maul mit Vorschlägen) und gemalte Augen auf der Haut.
  - Offen: Durchdringungen, Wirbelsäule für Hälse, Zahnrahmen je Öffnungsart, Augen-Tab.
- **2026-10-12 nachmittags: Kanten, Back/Bottom, verbundene Kiefer** (Florians Rückmeldung):
  - Kanten im Form-Tab: Linien mit Härte (gestrichelt 1 px = glatt bis schwarz 3 px = scharf), Breitenwerkzeug ⇧W und Tiefe.
  - Ecken der Silhouetten werden Kanten in den anderen Ansichten.
  - Back/Bottom als Tab.
  - Im Fressen-Tab folgt der Körper dem Kiefer.
  - 3D-Kanten im Käfig mit Zebrastreifen.
  - Ergebnis [`docs/research/2026-10-12-kanten-ansichten.md`](docs/research/2026-10-12-kanten-ansichten.md).
  - Spätnachmittags: **Spanten gebaut** (Querschnitte an gewählten Stellen, Front = vorn, Back = hinten, Werkzeug S). Regel: **Eine Kante ist eine Ecke in einem Shape**, der Winkel kommt aus der Form, die Härte ist die Rundung (Spant-Ecke 43° gegen 13° bei einer freien Linie).
  - Abends: Kopplung nur am entsprechenden Punkt (Florian). **Versuch Wirbelsäule** (Langhals: Hals hoch, Kopf drauf; Biegen als Pose) und Vorschlag **„Wirbelsäule und ein Netz für alles“** ([`docs/plans/2026-10-12-wirbelsaeule-ein-netz.md`](docs/plans/2026-10-12-wirbelsaeule-ein-netz.md)): ein Bauweg, Ansichten als echte Umrisse, örtliche Änderungen, Maul im selben Netz, Fressen als frei bearbeitbare Pose. Vier Entscheidungen für Florian stehen in Abschnitt 7.
  - Danach: Wirbelsäule zum Vergleichen als Tab am 3D-Fenster („creation · wirbelsäule“, Biegen als Vorschau). Maulanfänge sind Knoten des Seitenumrisses, Ziehen bewegt den Umriss mit (Über- und Unterbiss), geschlossen zeigt der Umriss den Maulspalt.
  - Nachts: Wirbelsäule selbst zeichnen, Maul auf der Wirbelsäule (gestreckter Raum), Form im Fressen-Tab bearbeitbar (Pose-Form mit gleicher Punktstruktur). Plan und Ergebnis: [`docs/plans/2026-10-12-wirbelsaeule-maul-fressen.md`](docs/plans/2026-10-12-wirbelsaeule-maul-fressen.md).
  - Ergebnis [`docs/research/2026-10-12-maul-kiefer-zaehne-augen.md`](docs/research/2026-10-12-maul-kiefer-zaehne-augen.md), Seite https://claude.ai/artifact/WG3YJPn4SuL5acnY9yR9s1, Übergabe [`docs/UEBERGABE.md`](docs/UEBERGABE.md).
- **2026-10-12 nachts:** Wirbelsäule selbst zeichnen, Form im Fressen-Tab, Maul auf der Wirbelsäule; spätnachts Maulloch und verbundene Kiefer repariert (Anfänge über Knotennummern, Kinnseite über den Winkel). Grenze: Maulanfang hinter der Schnauzenspitze braucht Schnauzenringe. Plan [`docs/plans/2026-10-12-wirbelsaeule-maul-fressen.md`](docs/plans/2026-10-12-wirbelsaeule-maul-fressen.md).
- **2026-10-12 spätnachts: Versuchsphase abgeschlossen, Bilanz für die große Sitzung.** Florian: „Alles bis jetzt waren nur Tests und Recherche!“ Ziel: „der perfekte und innovativste Character-Editor aller Zeiten“. Auftrag: aus allen Tests etwas Neues und Einzigartiges entwickeln, die optimale Bauweise für unsere Wesen, viel besser und schneller als in Blender. Alle bisherigen Festlegungen, auch Florians eigene zu Bedienung und UI, sind Tests und Bauchentscheidungen. Findet die große Sitzung einen besseren Weg, setzt sie ihn um. Einstieg mit Bilanz, deutlicher Liste, was nicht funktioniert, Kernfrage, Beinen, körperweiten Strukturen, Fahrplan und Entscheidungen: [`docs/plans/2026-10-13-grosse-sitzung-wesen-editor.md`](docs/plans/2026-10-13-grosse-sitzung-wesen-editor.md), Seite https://claude.ai/artifact/FkS5WTabmUmeKUgSDiGTuw.
- **2026-10-13 abends: Plan „Wesen-Editor 2“ freigegeben** ([`docs/plans/2026-10-13-wesen-editor-2.md`](docs/plans/2026-10-13-wesen-editor-2.md)). Florian: Versuche „sehr durchwachsen“, Shape-Idee weiter gut, Zweifel, ob ausgefallene Wesen so lösbar sind. Antwort: **ein Subdivision-Käfig (Spiegel, Falten) als einzige Wahrheit, Florians Kurven als Griffe** (einmal ableiten, dann bearbeiten), Bausteine mit Automatik (Maul überall am Kopf, Zähne, Augen mit Zuständen, Teile aus Bibliothek, Klingen, Zonen als Vektorformen im Atlas, Stile Feuer/Gas/Fell/Jelly, Posen als Deltas), Earle-Look live, eine Szene mit vier Kameras. **Phase 0 = fünf Beweise mit harten Kriterien, erst dann breit bauen.** Die Versuche in `packages/shape/src/versuch/` sind Wissen; ihre Kerne werden herausgelöst. UI: Stamm, Bühne + Blätter, Tafel, Dock; Illustrator in Blättern, Blender auf der Bühne; neutrale Bühne. Florians Referenzordner `ref/editor/` ist lokal (nicht in Git), die Bögen liegen in `docs/look/wesen-refs/`.
- **2026-10-13 nachts: Beweis 1 (Kern) bestanden, Beweis 4 begonnen.** Käfig-Kern in `packages/shape/src/{kaefig,subdivision,loeser,kern}` (`@ee/shape/kern`), Editor-Tab „kern“. Kugel 0,28 px, Rex 0,33, Langhals 0,97, Ente 1,21 (Seite), Kasten-Kugel Front 0,7 px mit 93°-Längsfalten, Zugschritt ≈ 3 ms. Breite nach der Projektionsregel (Top bei x, Front bei jeder Höhe), Querschnitte aus Front-Lappen bzw. Spanten. Earle-Material live im Tab. Ehrlich offen: Front/Top-Widersprüche werden still für die kleinere Breite entschieden, Ente braucht Teile, Reifen kein 3D-Griff, kein Worker. Ergebnis + Nachtrag [`docs/research/2026-10-13-beweis1-kern.md`](docs/research/2026-10-13-beweis1-kern.md). **Beweis 2 (Maul mit Haps) gebaut, zur Hälfte bestanden** ([`docs/research/2026-10-13-beweis2-maul.md`](docs/research/2026-10-13-beweis2-maul.md)): Maul als Kantenpfad im Käfig (Schleife einrasten, Schlitz, Tasche, Vorhang), Kiefer als Pose, Umbau 140 ms, Bohne mit Lippenband und Rachen; Kugel, Rex vorn und Rex unten 0 Durchdringungen bei allen Öffnungen (Lippe unter der Spitze = Überbiss); „Hals“ (Drache) noch mit Durchdringungen (Rachenlinie als Griff fehlt). Florian: Rex-Haps „scheint erstmal zu passen“; der getrennte Kiefer mit Überbiss (Unterkiefer läuft in den Oberkiefer) ist ihm wichtig, bleibt Phase 2. **Beweis 3 (Teil nahtlos) bestanden** ([`docs/research/2026-10-14-beweis3-teil.md`](docs/research/2026-10-14-beweis3-teil.md)): Beine als Ausstülpung eines 2×2-Felds (kein Punkt entfernt, keine Brücke), 0 Durchdringungen bei ±35°, Zebra ohne Knick; Kugel (runder Bauch) offen. **Beweis 5 (Feuer, Gas, Fell-Blob) gebaut** ([`docs/research/2026-10-14-beweis5-feuer-gas-fell.md`](docs/research/2026-10-14-beweis5-feuer-gas-fell.md)): Klingen als geteilte Käfige (Röhre 6 × 8, Flammenprofil, Linse, scharfe Spitze; 420 Büschel in 5 ms), Feuer/Gas-Bändermaterial, Wehen als Käfig-Pose; Standbilder und 3-s-Schleifen; Florians Urteil steht aus. **Phase 0 ist durchgebaut.** Falle: Interpolation ohne Glättung wellt neben scharfen Falten; Durchdringungstest auf Stufe 3 sprengt den Speicher (Stufe 2 nehmen).
- **2026-10-14: Phase 0 (fünf Beweise) durchgebaut** (Branch `claude/editor-grundlayout`, Editor-Tab `?versuch=kern`): Beweis 1 Kern bestanden; 2 Maul mit Haps bestanden für Kugel, Rex vorn, Rex unten, Tiger-Kastenschnauze und Drache (Hals; 14.10. abends: ebene Kappe an Kastenfronten, Hautfalten enden an der Lippe, Rachenlinie als Lotfußpunkt ab einem Racheneingang vor dem Halsansatz, Leiter an den Enden entfächert → alle Körper durchdringungsfrei; Florian: Rex-Haps „scheint zu passen“, Kiefer getrennt/Überbiss ist ihm wichtig → Phase 2); 3 Teil nahtlos bestanden für Rex und Kugel (Ausstülpung; 14.10. spätabends: Säulenringe mit gleichmäßigen Winkeln statt der gebündelten Feldrandwinkel, Feldrand wandert die Achse hinab); 4 Look live ganz (Tiger-Kopf mit Kastenschnauze, Ruhelage-Attribut gegen schwimmende Muster, Zahnverlauf, Zonen-Atlas `packages/shape/src/kern/atlas.ts` + `eeAtlas`/Half-Float-Texturen im Material; Vergleichsbild `docs/progress/editor/vergleich-tiger-kopf.png`, Urteil offen); 5 Feuer/Gas/Fell zweite Runde gebaut (Zwiebelkörper `zwiebel`, geschichtete wellige Bänder, Gas-Wirbel, Locken `kringel`, Kugelbläschen, gemaltes Büschelfeld `fellStaerke`; Florian zur ersten Runde: „ganz gut, treffen es noch nicht wirklich“, Urteil zur zweiten offen). Ergebnisse `docs/research/2026-10-1[34]-beweis*.md`, Stand und nächste Schritte in [`docs/UEBERGABE.md`](docs/UEBERGABE.md).
- **2026-10-14 abends, Florian:** Tiger-Kopf „zumindest schon besser als alle Versuche zuvor“, aber „vor allem das Maul passt noch nicht“; Auftrag: **„Mache erst alle Beweise ganz fertig“** (vor Phase 1). Fallen aus dem Maul-Block: Ringfalten, die den Schlitz kreuzen, machen die beiden Lippenkopien ungleich (Ecke gegen Faltenpunkt) → an der Lippe entschärfen; die kürzeste Leiter fächert an asymmetrisch gerundeten Enden um einen Punkt (Ringe und Kappe fallen zusammen) → `kernLeiter` entfächert; Durchdringungen immer nach Bereichen (Haut/Lippe/Tasche) auswerten, sonst sucht man am falschen Ort.
- **2026-10-14 nachts: Phase 1 freigegeben.** Florian: Kritik trifft zu, festhalten, „los mit Phase 1“. Register offener Kritik mit Phase je Punkt: [`docs/plans/2026-10-14-kritik-phase-0.md`](docs/plans/2026-10-14-kritik-phase-0.md) (vor jedem Meilenstein-Ende prüfen). Fahrplan Phase 1 in vier Meilensteinen (Fundament → Bühne → Griffe/Werkzeuge → Import/Aufräumen), Abnahme = Florian baut den Tiger-Kopf in ≤ 10 min: [`docs/plans/2026-10-14-phase-1-kern.md`](docs/plans/2026-10-14-phase-1-kern.md).
- **2026-10-14/15: Phase 1 „Kern breit“, M1–M3 gebaut** (Branch `claude/editor-grundlayout`, Fahrplan [`docs/plans/2026-10-14-phase-1-kern.md`](docs/plans/2026-10-14-phase-1-kern.md) mit Stand je Teil): M1 Wesen-Bau DOM-frei im Worker, Dokument v1 (Ausstattung, Käfig-Deltas); M2 eine Szene mit vier Kameras (Blätter zeigen den Körper hinter den Kurven), Picking; M3 Griffe und Werkzeuge: gezeichnete Maullinie baut den Kern, Augen per Klick und Rand, **Reifen** (Spanten als Käfigringe mit Perlen auf dem Körper, Perle/Band ziehen, ⌃R, ⌥-Ecke), Kieferknopf, **Pinsel** (G ziehen, I aufblasen, ⇧ glätten; Deltas im Dokument, kein Umbau), Kern als Standard-Bauweise mit Earle-Look, **UI nach Plan 9** (Stamm mit neun Stufen ⌘1–9, Tafel je Stufe, Dock, Layouts Riss/Bühne mit Tab, Grund Papier/Nacht/Grün). Abnahme-Probe per Skript läuft im normalen Editor durch; Florians Urteil und seine 10-Minuten-Probe stehen aus. **15.10. nachts** (Florian: UI „wirkt alles schon ganz gut“): Kantenlinien → Falten (erste Stufe), Tiger-Maul als Mercedesstern-Näherung (Florians Einwurf: Mundwinkel auf der Frontplatte; echter Stern braucht eine Plattenmaul-Topologie, Phase 2), **Fressen-Pose als Käfig-Deltas** (Florians Frage „kleines Maul → großes rundes offenes Maul?“ → ja, Pinsel im Fressen-Modus), M4.1 **Bogen hinlegen** (Pauspapier, ⌥B) und **Nachzeichnen** in TypeScript (Seite/Front/Top). Offen: M3 Kanten einrasten, Tafel 280, Bibliothek-Schublade; M4 Versuche aufräumen, E2E-Fixture. Stand und Bedienung: [`docs/UEBERGABE.md`](docs/UEBERGABE.md), Fallen: [`apps/editor/CLAUDE.md`](apps/editor/CLAUDE.md).
- **2026-10-15 morgens: Florians Kritik „Form weicht von der Zeichnung ab“ (Maul-Kerbe, Top/Seite des Tigers), Plan [`docs/plans/2026-10-15-zeichnung-ist-form.md`](docs/plans/2026-10-15-zeichnung-ist-form.md)** (Befund, drei Abnahmesätze, Reihenfolge: Breite an Top binden → Lippe auf gezeichneter Höhe → Käfig als Wahrheit → Saum und Zahl im Blatt). Blender ist nicht Teil des Plans. **Schritt 1 gebaut:** Sichthülle (Top bei x, Front nur am breitesten Punkt, Rest beschnitten) und Breitenpunkte im Ausgleichslöser (`breiteGewicht`, an den tatsächlichen Grenzlagen nachgerechnet); Top Rex 1,0 px, Tiger 4,0 (vorher 21,6), Langhals 14,2 (Brust: Kreis-Vorlage schräger Sprossen + 3 px Widerspruch). Rex-Front 11 px ist ein Widerspruch von Florians Front und Top (anzeigen, nicht lösen). Maulbau ohne Breitenpunkte (Kieferpose wirft sonst Hautfalten). **Schritt 2 gebaut:** gezeichnete Maullinie mit Anfang auf der Kontur (Weltpunkt `anfang`), Lippenhöhe je Ring aus der Kreuzung mit der Sprosse, Kappenzeile der Lippe auf dem Anfang, `unterSpitze` aus der Linie; die Kerbe (10–14 px) ist weg (Kugel 0,7 px, Rex 1,9–2,1 px = Rille). **Schritt 4 gebaut:** Δ-Zahl je Blatt im Titel (grün ≤ 2 px, ocker ≤ 6, sonst pink) und Lichtsaum, wo der Körper > 2 px von der Kurve abweicht (`kern/abweichung.ts`, im Worker nach jeder Ableitung). **Schritt 3 gebaut (Zuschnitt „Stationen einfrieren“):** Das Dokument friert die Ringverteilung nach dem ersten Ableiten ein (`kaefig.stationen`), jede Kurvenänderung zieht denselben Käfig nach (keine Neuwahl der Ringe, kein Springen, Pinsel-Deltas bleiben), Ecken/Reifen werden nachgeführt, Tafel „Neu ableiten“; Giraffenhals bleibt oben (Satz 3). Offen vom vollen Plan 4.1: Käfig selbst im Dokument, Kurven folgen dem Körper nicht automatisch. Stand und Reste auf der Planseite; nächster Schritt: Florians Abnahme der drei Sätze. **Prüfwesen in der Library** (Block „Prüfwesen · immer der aktuelle Stand“, frisch gebaut bei jedem Klick): Kugel, Rex, Tiger, Langhals, Drache, Ente, Robbe. **Florians Urteil:** „passt weitestgehend“, andere Wesen „viel besser und genauer als vorher“, gerade Linie beim Blob gut; sein Langhals-Riesenmaul kam von der Tiefe der Front-Maulpunkte aus dem Platzhalter-Loft → behoben (Tiefe vom Kern-Netz). Seine Regel: Feedback zu späteren Plan-Punkten wird im Kritik-Register notiert, gearbeitet wird nach Plan. Langhals-Brust gelöst (`liegendAb` 0,5: schräge Sprossen mit Front-Lappen statt Kreis, Top 14 → 4 px). **Danach:** Florian entscheidet „die Formen folgen immer“; naiver Versuch (Knoten auf die Silhouette rutschen) verworfen wegen Rückkopplung, richtige Bauweise auf der Planseite, Kern-Option `fuehrend` gebaut; **Phase 2 beginnt** nach [`docs/plans/2026-10-15-phase-2-maul.md`](docs/plans/2026-10-15-phase-2-maul.md) (Plattenmaul → Überbiss → runder Haps → Zähne → Augen → Maularten).
- **2026-10-15 vormittags: Phase 2 begonnen, M1 Plattenmaul gebaut** ([`docs/plans/2026-10-15-phase-2-maul.md`](docs/plans/2026-10-15-phase-2-maul.md), Stand): Mercedesstern ganz auf der Tiger-Frontplatte (Lippenzeile des Kappengitters nach dem Front-Verlauf gebogen, Winkel als Gitterpunkt, Scharnier bei 8 % hinter der Platte, 24 Punkte je Ring), Tiger 0 Durchdringungen bei allen Öffnungen, im Front-Blatt zeichenbar; Library-Tiger baut und öffnet sein Maul ohne Chip. Florian: „Mit den Kästen komme ich ganz gut zurecht … Tiger sollte ich ohne Probleme hinbekommen.“ Nächster Schritt M2 (Kiefer getrennt mit Überbiss). Fallen: Eine Treppe quer durchs Plattengitter lässt die Lippen beim Öffnen aneinander vorbeigleiten (Zeilen biegen statt Treppe); der Beutel muss mit dem Kieferband auslaufen (sonst wandern Bauchringe beim Öffnen); Diagnosen immer am Ring messen (Verschiebung je Ring, Skript `pose-ringe.ts`).
- **2026-10-15 mittags bis abends: M2 Kiefer getrennt** (Planseite Phase 2, Stand): Florians Grundbedingungen nach fünf Bildrunden („Unterkiefer kürzer und schmaler, ragt geschlossen hinein“, „kein grüner Lappen, von unten die Maultasche“, „zwei Teile des Shapes, keine Regler, verdeckte Durchdringung erlaubt“, „Rot und Blau exakt die Lippenkante“, „ein Spant über beide Kiefer → zwei Spanten in Front/Top“, „vorne sind die Lippen immer noch zusammen“). Gültig: **jede Lippenlinie mit eigenem Anfang**, die vordere ist der Schlitz auf der Kontur, die andere die versetzte Kante des kürzeren Kiefers (Rot vorn = Überbiss, Blau vorn = Unterbiss), der kürzere Kiefer rückt als Ganzes hinter seinen Anfang; Rex blaue Kante 0,0 px, offen 0 Durchdringungen; M3 erste Stufe (automatischer Haps). Verworfen (gemessen, Planseite): U-Lippe im Käfig, Band-Netz, Regler, Delta-Regel für die versetzte Kette. Offen: Kiefer-Spanten, px-Anzeige, Band am Winkel, Kappenfalte beim Unterbiss an scharfer Schnauze. Lehre: Florians Bedienvorgaben gehen vor Messregeln („0 Durchdringungen“ nur für Sichtbares). **Spätabends/nachts:** „Die Kiefer müssen NUR ihrer Linie folgen“ → Kanten direkt aus den gezeichneten 3D-Linien (Seite, Front, Top), Kiefer endet als Wand am eigenen Anfang, Maulgriffe in der Bauweise Kern ohne Umrissknoten (das alte Einrasten machte jeden Unterbiss zum Überbiss), px-Anzeige rot/blau im Blatt-Titel; **„Formen folgen“ nach dem Pinsel** (Profile an die Silhouette, Deltas nachgeführt, Körper bitgenau; Planseite „Zeichnung ist Form“, Stand 15.10. nachts). Fallen: halbe Silhouettenzüge nicht zyklisch behandeln; Grenzlagen messen, nicht Kontrollpunkte; alte Versuchs-Automatiken vor neuen Bauweisen abschalten.
- **2026-10-15 mittags: M2 Kiefer getrennt mit Überbiss gebaut** (Planseite Phase 2, Stand): Oberlippe als U aus zwei Falten-Reihen (Boden, Innenseite), Unterkieferkante steigt am Ring entlang auf die blaue Höhe und liegt doppelt tief innen; Rex 0 Durchdringungen bei allen Öffnungen; Tafel Maul: Chips gleich/getrennt, blaue Linie ziehbar; Rex-Prüfwesen mit Überbiss. Fallen (sieben Anläufe): Jeder Wechsel der Bauweise entlang des Pfads (Linse ↔ U) lässt eine steigende Kette durch ein Blatt laufen — das U muss überall stehen, wo die Kante steigt; U-Reihen brauchen Falten, sonst schießen die Kontrollpunkte über die Haut; die Innenseite am Ring entlang setzen (nicht an der Tangente); Kappenzeilen haben keine `hoehe`; Durchdringungen mit `orteNachBereich` lokalisieren (Skript `ueberbiss-check.ts`) und Schnittbilder zeichnen (`ueberbiss-schnitt.ts`), statt Parameter blind zu kehren. **Florians Grundbedingung zum Überbiss (15.10. mittags):** Unterkiefer und Lippe viel kürzer und schmaler als die Oberlippe, geschlossen etwas hineinragend, von der Seite eine klare Trennung — die Kürze kommt aus dem Anfang der roten Linie auf der Kontur (Kinn), die Prüflinie des Rex beginnt deshalb am Kinn; Einwärtsmaße waagerecht und nach der örtlichen Breite begrenzen. **Zweite und dritte Rückmeldung (Kugel/Band: „kein echter Überbiss … nicht, was ich wollte: Ober- und Unterkiefer separat als Teil des Shapes; Durchdringungen im Überbiss sind verdeckt; keine Regler“) → gültige Bauweise: zwei Teile des Shapes, blaue Linie gibt in der Seite die Höhe und im Front-Blatt die Breite des Unterkiefers vor, Unterkiefer geschlossen in den Oberkiefer geschoben, verdeckte Überlappung erlaubt, Abnahme = 0 Durchdringungen offen. Lehre: Florians Vorgaben zur Bedienung gehen vor Messregeln aus dem Plan; „0 Durchdringungen“ gilt nur für Sichtbares. Die Käfig-Klappe (7 Varianten) und das Band-Netz sind verworfen. Weitere Grundbedingungen (15.10. nachmittags): Rot und Blau exakt als Lippenkanten (heute rot 0,2 px, blau ≤ 2/5 px an Ringspalten, Kinn bis 10 px); ein Spant über beide Kiefer = zwei Spanten übereinander in Front und Top, je Kiefer bearbeitbar.** **M3 erste Stufe (15.10. nachmittags):** automatischer Haps als Blendshape in `maulPose` (`haps` 0…1, Winkel nach hinten/außen, Lippen auseinander, Haut mit smoothstep-Abfall); Tiger offen 3,5-mal so groß, 0 Durchdringungen; Falle: ein quadratischer Abfall oder Tiefe > 0,12 staucht die Haut (Gradient des Versatzes muss < 1 bleiben).
- **2026-10-14 nachmittags: Übernahme nach dem Abbruch der großen Sitzung** (ihre Einträge „15.10.“ stammen laut Commits vom 13./14.10.; ab hier echtes Datum). Ungespeicherter Stand gesichert (Formen folgen am Gestenende ohne eingefügte Knoten, führende Front örtlich, Kinnwand; Typfehler behoben, `pnpm typecheck` wieder grün), Prüfskripte nach `apps/editor/scripts/pruefen/`. **Florians Regel:** Die schwarze Linie ist die Wahrheit für den Umriss — das Netz liegt ruhig und geglättet auf ihr, Rot/Blau gehen von der Seite direkt in sie über (echter Maulschlitz), jeder Kiefer folgt nur seiner eigenen Linie und seinem eigenen Spant. Fahrplan (freigegeben, Reihenfolge nach seiner Wahl): Block 1 ruhiges Netz (Sägezahn/Falten beim Verziehen) → Block 2 Maulschlitz an der schwarzen Linie, getrennte Kiefer mit Kiefer-Spanten → Block 3 Phase 2 weiter: [`docs/plans/2026-10-14-ruhiges-netz-und-maulschlitz.md`](docs/plans/2026-10-14-ruhiges-netz-und-maulschlitz.md).
- **2026-10-14 nachts: Kiefer folgen ihrer Linie** (Florian: Griffe in Top/Front müssen wirken, Schwarz soll sich an einen breiteren Kiefer heften, Kiefer getrennt steuerbar, Schwarz ≈ geglättetes Gelb mit vorhandenen Punkten).
  - Rot und Blau gelten genau samt Griffen. Neue Linien liegen auf der Haut und beginnen rund (`lippeAnHaut`).
  - Jeder Kiefer streckt seine Ringhälften auf seine Linie.
  - In Front und Top heftet sich die schwarze Linie als Umweg an einen breiteren Kiefer; die Grundlinie bleibt, sonst wüchse jeder Ring mit.
  - Florians Unterbiss: Δ 1,5 / 3,3 / 2,6 px statt 46 / 20 / 21 px.
  - Offen: Kiefer-Spanten, Formen folgen mit Maul.
  - Planseite [`docs/plans/2026-10-14-ruhiges-netz-und-maulschlitz.md`](docs/plans/2026-10-14-ruhiges-netz-und-maulschlitz.md), Übergabe [`docs/UEBERGABE.md`](docs/UEBERGABE.md).
- **2026-10-14 spätnachts: Kugel-Kerbe und -Flosse behoben, Prüfreihe misst wie der Editor** (ac7fbcf, c5c15c9, a9bc9e1): Stirn des kürzeren Kiefers ≥ 40 %, Kappenspalten nach Bogenlänge, Ringe nicht an den Ecken der Schlitzsehne (Klinge der Unterlippe), Editor friert nur Stationen des aktuellen Dokuments ein (Laden-Fehler). Gefunden und offen: Naht hinter dem Mundwinkel beim Öffnen (jedes Maul, braucht ein Kiefermodell), Durchstechen bei fast bündigem kürzerem Kiefer. Stand: [`docs/UEBERGABE.md`](docs/UEBERGABE.md).
- **2026-10-14 spätnachts (danach): Leiter ohne Rückknick, Kiefergelenk nach Plan 5.2** (5cd89ee, 60e9bfa): fast bündiger kürzerer Kiefer sauber (Leiter nimmt die sichtbare Silhouette); Unterkiefergewichte nach Winkel und Reichweite um das Gelenk statt über ±1–2 Ringe (begründete Abweichung vom Plan, Naht hinter dem Mundwinkel weg, Rex/Tiger unverändert). Nächster Schritt: Gelenk und Kieferlinie als Griffe im Fressen-Tab. Planseite Phase 2, Übergabe.
- **2026-10-15 nachts: Block 2 zu Ende gebaut** (Florian schläft; „selbstständig weiter, extrem selbstkritisch, genau nach Plan“):
  - Chip „getrennt“ setzt den blauen Anfang hinter den roten (nicht an die Kehle).
  - Messfehler behoben: Die verdeckte Kinnspitze im Maulfenster zählte als Seiten-Δ (Kugel-Überbiss 11,5 → 1,3 px).
  - Maullage eingefroren (`GefroreneStationen.maul`: Winkelring, Ringanfang, Konturanfang mit Band um die Schwellen). Vorher sprang beim Ziehen eines Lippenanfangs die Punktzahl (Langhals 499 ↔ 513) bzw. die Lippe in eine andere Kappenzeile (Kugel, 18 px).
  - **Kiefer-Spanten:** `Spant.unten`; die Front zeigt Ober- und Unterkiefer als zwei Kurven, die Bühne zwei Perlenreihen.
  - Ehrliche Abnahme: Satz 1, 3, 4 erfüllt bis auf die Langhals-Kehle. **Lokalität (Satz 2) nicht erfüllt** (Schlitzanfang 10 px gezogen → 1,3–4,6 px außerhalb des Bands; ohne Maul schon 3–9 px), das gehört zu „Käfig als Wahrheit“.
  - Tabelle auf der Planseite [`docs/plans/2026-10-14-ruhiges-netz-und-maulschlitz.md`](docs/plans/2026-10-14-ruhiges-netz-und-maulschlitz.md), Kontaktbogen `docs/progress/editor/block2-stand-2026-10-15.jpg`, Übergabe [`docs/UEBERGABE.md`](docs/UEBERGABE.md). Nächster Schritt: Block 3 (Phase 2 M3 runder Haps, Kehlkette).
- **2026-10-15 nachts: Phase 2 M4 Zähne ganz gebaut** (Plan und Stand je Schritt auf der Planseite Phase 2, Abschnitt „M4 Zähne“):
  - Zahnmodell aus dem Versuch in den Kern herausgelöst (`kern/zahnModell.ts`, neu: Drehung, Größe); Zahnfleisch des Kern-Mauls (`kern/zaehne.ts`, u fest am Käfig).
  - Prüfung gegen den Gegenkiefer bei zu/25/50/100 % (`kern/zahnPruefung.ts`); verdeckte Überlappung beim Über-/Unterbiss gibt keinen Befund.
  - Automatik: geschlossen eingepasst, offen volle Länge; beim Überbiss stehen die oberen Zähne außen wie im Bogen 06. Zähne starr im eigenen Kiefer.
  - Editor: Tafel Zähne (`leiste/ZahnFeld.tsx`), Wählen/Ziehen auf Bühne und in den Blättern (`kern/zahnGriffe.ts`), Zahnfarbe über Uniforms, Prüfung als Worker-Auftrag mit Glut und Vorschlägen (`kern/zahnPruefStand.ts`).
  - Abnahme per Skript: Rex mit 14 Zähnen in 20,6 s, Prüfung frei (`docs/progress/editor/zaehne-m4-abnahme-rex-14-2026-10-15.jpg`).
  - Offen: Florians 10-Minuten-Probe, Zahngröße/-breite gegen die Referenz, „Setzen T“ und Fächer (Register).
- **2026-10-15 nachts: Phase 2 M5 Augen gebaut** (Planseite Phase 2, Abschnitt „M5 Augen“, Stand je Schritt):
  - Gemalt: Formen Schlitz/Knopf/Mandel, Zustände offen/zu/Sichel/X/Spirale/Schlitz als Abstandsformen (`creature2/material/augenFormen.ts`), Lid und Blinzeln; Prüfwesen PezenPez.
  - Glubschauge und Augapfel als Augenkugel (`creature2/material/augenKugel.ts`) an der posierten Stelle der Haut, folgen beim Öffnen dem Schädel; Lid im Material; Prüfwesen Glubsch (Bild 10), Rex mit Augäpfeln (Bild 11).
  - Augapfel-Höhle im Käfig (`kern/augenHoehle.ts`): Inset-Schleifen um einen Ringpunkt ohne Lippe, nur fürs gezeichnete Netz, keine Durchdringung mit der Höhle. **Brauenwulst nach drei Anläufen nicht gelöst** (Feld am Rex-Mundwinkel zu schmal) → Wege für Florian auf der Planseite.
  - Behoben: Maße (Augen, Lippenband, Material) aus der Ruhelage statt aus der Pose (Rex wuchs offen um 11 %); gedrehte Augen spiegelbildlich.
  - Abnahme per Skript: `docs/progress/editor/augen-m5-abnahme-2026-10-15.jpg`. Nächster Schritt nach Plan: M6 Maularten.
- **2026-10-15 früh: Phase 2 M6 Maularten** (Planseite Phase 2, Abschnitt „M6 Maularten“): Rundmaul als Aufsatz an der Kappenmitte (`kern/rundmaul.ts`, Prüfwesen Fisch, rund, weit, durchdringungsfrei), Drache öffnet 2,5-mal weiter (Kopf kippt 20°, Hals zieht 0,7), Kastenkinn über Kasten-Spanten/Kiefer-Spant. **W-Oberlippe (Hund) nach drei Anläufen nicht gelöst** (steigende Arme schneiden beim Öffnen), Drache mit vorstehender unterer Schnauze → Florians Entscheidungen. Abnahmebild `docs/progress/editor/maularten-m6-abnahme-2026-10-15.jpg`. **Phase 2 nach Plan durchgebaut.**
- **2026-10-15 mittags: Stopp, Planmodus, neuer Plan freigegeben** ([`docs/plans/2026-10-15-maul-einsatz-harmonie-posen.md`](docs/plans/2026-10-15-maul-einsatz-harmonie-posen.md), Entwürfe A/H/B daneben). Florian fand an eigenen Wesen Grundfehler: Maul zerstört den Körper (Bauch/Nase kollabieren, Kinnwand, Falten, J-Mundwinkel unmöglich, Rex-Unterbiss reißt), Fressen behält die Pose im Editor-Tab, Pinsel und Linien harmonieren nicht; „Die Testwesen sind nur zum Testen … nichts abgenommen“. Entscheidungen: **Maul als Einsatz** um die Linie (Grundnetz außerhalb bitgleich), **Bones: Stellung je Pose, Rig gemeinsam**, **Rücknahme** der Fressen-Commits (42ef353), **Relief** statt automatischer Punkte nach dem Pinsel, **Maullinien bleiben, wo gezeichnet**, Reihenfolge Prüfstand → Tab-Sofortkorrektur → Maul-Beweis → Werkzeug-Fundament (Käfig als Wahrheit) → Maul im Editor → Posen. Regeln: keine Meldung „bestanden“ ohne Florian, Zufallsreihe statt Prüfwesen, ein Schritt nach dem anderen, nach drei Fehlanläufen anhalten. Nachmittags (Florians Ente mit Flügeln, Giraffe mit Bauch vor der Nase): **Teil G „Grundkörper für jede Form“** kommt nach dem Maul-Beweis (Wirbelsäule aus der Mittelachse mit eingefrorenen Enden, Breite aus Top und Front zugleich, Flügel/Flossen als automatische Teile; erst Beweis).
- **2026-10-15 nachmittags/abends: B1 und B2 gebaut, Posen vorgezogen** (Entscheidung 8: „Shape und Maul im Fressen-Tab … das Wichtigste an dem Ganzen“ → B2–B6 direkt nach B1, auf dem heutigen Maulbau). B1: Editor-Tab zeigt immer die Grundform (`setzeZiel`); in Posen wirken bis B4–B6 nur Pinsel und Rig. B2: Kern `packages/shape/src/kern/posen/` (Knochen starr je Punkt, Ruhe-Deltas vor den Knochen, Haps als Saat; K6 gemessen → Pose mit Bezugs-Käfig, Übertrag aus der Umgebung statt Zellbasis), Fehler `spiegelIndex` bei bündigem Maul behoben (Fressen-Pose schief). Entscheidung 9: Editor-Tab = Grundpose, Standardpose **Idle**; **beliebig viele Wirbelsäulen** (Baum, Äste als Ausstülpung) als Grundlage für Teil G. Ergebnis [`docs/progress/editor/b2-tor-2026-10-15.md`](docs/progress/editor/b2-tor-2026-10-15.md), Stand [`docs/UEBERGABE.md`](docs/UEBERGABE.md).
- **2026-10-15 abends/nachts: B3, B3b, B4, B5 gebaut** (Abnahme offen; Florian zu B3/B3b/B4: „sieht schon ganz gut aus“, „weiter“):
  - B3: Dokument v2 mit Posenliste (Idle, Fressen, weitere), Pinsel und Knochen je Pose, Rig gemeinsam.
  - B3b: Knochen in 3D (Entscheidung 10: Gieren, Rollen, seitlich).
  - B4: Löser im posierten Raum, schwarze Linie im Seitenblatt einer Pose.
  - B5: Rot und Blau der Pose als Versatzfeld längs der natürlichen Lippe, Lippenprojektion im Ruheraum (die Knochen nehmen sie mit; 0,05 px), in Fressen immer getrennt, geschlossen türkis; die Linien folgen dem Pinsel von selbst.
  - Stand je Schritt auf der Planseite, Übergabe [`docs/UEBERGABE.md`](docs/UEBERGABE.md).
- **2026-10-15 nachts: Teil L freigegeben (Entscheidung 11), Linien als Kurvennetz** ([`docs/plans/2026-10-15-teil-l-linien-kurvennetz.md`](docs/plans/2026-10-15-teil-l-linien-kurvennetz.md)): Konturen und Linien mit gemeinsamen Knoten, jede Linie eine Käfigschleife genau auf der Linie, Knick über Ecken im Querschnitt, kein Wirkbreiten-Regler, Spanten werden Querschnittslinien. Florian wies einen ersten Entwurf (Korrekturschicht mit Wirkbreite, eingesetztes Band) als zu kompliziert zurück. Nächster Schritt L0 (Beweis im Kern), dann B6 mit Linien statt Reifen in der Pose.
- **2026-10-15/16 nachts (Florian schläft; Auftrag: Konturlinien, dann Grundform mit Ente und Bäuchen „perfekt“, danach B6, immer weiter):** L0.1 neu gebaut („Fläche bleibt, Netz gleitet“, `packages/shape/src/kern/netz/`: Reihe ≤ 0,3 px, Haut ≤ 0,22 px, schräge Linien 1,4° Normalen, Rex-Braue offen). **Teil G vorgezogen:** G1 Prüfkörper (`kern/pruefen/grundkoerper.ts`: Ente aus Florians Bild, Giraffe mit Bauch vor der Nase, Schwanenhals, Fisch), **G2 Enden der Wirbelsäule eingefroren/über Wege im Inneren** (`kern/grundkoerper/enden.ts`; bisherige Körper bitgleich, Ente Seite 76 → 5 px, Giraffe 49 → 1 px, kein Umspringen beim Zug am Bauch), G2b Fächer an inneren Ecken, **G4 Teile erster Beweis** (Erkennung gut, Bau noch schlecht). Stand und offene Entscheidungen: [`docs/UEBERGABE.md`](docs/UEBERGABE.md). Danach B6.
- **2026-10-16 früh: Teil A, A5–A7 gebaut, angehalten** (Florian schläft): A5 Topologie (außen bitgleich, Spiegel exakt), A6 Lippe (B-Spline der scharfen Schleife, krümmungsgewichtet, ab m = 10 ≤ 1 px), A7 Haut lösen (außen bitgleich; Kugel/Ei 0,75 px, Langhals 0,3 px, Rex/Robbe bis 4,7 px). Zwei Grundsatzbefunde mit Wegen im Kritik-Register: Mundwinkel als Ecke zweier geschlossener scharfer Lippen faltet unter Catmull–Clark; Lippenauflösung m hängt am Feldrand. Prüffall legt Linien wie der Editor auf die Haut (Zufallsreihe lag bis 13 px daneben). Übergabe [`docs/UEBERGABE.md`](docs/UEBERGABE.md).
- **2026-10-16 früh: B7 „Posen & Leben“ gebaut** (Florian vor dem Schlafen: „danach weiter mit B6, immer weiter“): Undo mit Zielwechsel, Vorschau getrennt vom Ziel (`ui.vorschau`, endet beim Bearbeiten), Tafel mit Posenliste und Fächer, Überblenden mit Abspielen, Geist und Zwischenbilder (Worker-Umrisse), Worker merkt Werte der Ruhelage (Gewichtswechsel 165 → 55 ms). `posen-b7.mjs` 43/43; nicht erreicht: flüssiges Abspielen (B10). Stand und Befunde: Planseite Teil B, Kritik-Register „Befunde aus B7“, [`docs/UEBERGABE.md`](docs/UEBERGABE.md).
- **2026-10-16 morgens: Regression G2 behoben** (00681e29): Florian fand im Editor einen „völlig zerrissenen“ Schnabel mit Unterbiss und eine falsche Vase aus der Kugel. Ursache: G2 fror beim ersten Bau der Startkugel die Enden der Wirbelsäule ein; nach dem Umformen lagen sie an der alten Kugelstelle. Mit Maul jetzt bitgleich wie vor G2, ohne Maul Enden nur, solange sie die Form tragen. Meine erste Prüfung hatte fälschlich „keine Regression“ gemeldet (nur frische Bauten verglichen). Regel: neue Automatiken immer mit Florians Ablauf prüfen (Kugel bauen → umformen → Maul). Alte sichtbare Falten (Langhals-Nacken, kleines Maul) stehen als Fehler im Kritik-Register.
- **2026-10-16 vormittags: Plan „Liniennetz, Zielform, Käfig“ freigegeben** ([`docs/plans/2026-10-16-liniennetz-zielform-kaefig.md`](docs/plans/2026-10-16-liniennetz-zielform-kaefig.md)). Befund: Die drei Fehler aus Florians Screenshots (Flügel fehlen, Kopf eingedrückt, Raute statt Ellipse) haben eine Wurzel — die Röhre nimmt je Ring aus jeder Ansicht nur eine Zahl und eine Form, die Front ist nur Obergrenze; P-Linien lagen auf der alten Versuchsfläche S0; manche Zeichnungen verlangen einen kantigen Körper (Look-Entscheidung). Bauweise: Form zuerst, dann der Käfig darüber — Teile auf der Mittelebene als verzweigte 2D-Fläche auf der Seite (Naht = schwarze Linie, auch an der Hohlkehle), seitliche Teile mit Ring-Einsatz (Teil-A-Maschine), Umrisse berühren statt begrenzen, Glättungsmaß im dünn besetzten Löser, Liniennetz in allen Ansichten. Schritte S0–S8, ein Schritt nach dem anderen. **S0 gebaut** (Abnahme offen): Prüfsatz aus Florians Screenshots, Faltenmaß nach Zonen (Rex 93° = gezeichnete Spitze, Kappen größte Faltenquelle), Δ genau, Widersprüche der Zeichnungen rot im Editor (eingedrückter Entenkopf = Front-/Top-Widerspruch bis 37 px).
- **2026-10-16 mittags: Plan „Liniennetz, Zielform, Käfig“ (freigegeben), S0, S1 und S1c gebaut** ([`docs/plans/2026-10-16-liniennetz-zielform-kaefig.md`](docs/plans/2026-10-16-liniennetz-zielform-kaefig.md), Stand und Tore dort). Florians Klarstellung: das 3D-Liniennetz ist die einzige Wahrheit, die schwarze Linie zeigt den Ist-Zustand, die bearbeitete Ansicht führt. Im Editor: Widersprüche rot + „angleichen“, Liniennetz in allen Blättern (Ringe, verdeckt blass, Stil „netz ton/farbe“), derselbe Punkt überall (Hover, Ziehen in fremden Blättern), Kopplung jedes Punkts in jeder Formgeste (`packages/shape/src/kopplungPunkte.ts`). Kontaktbogen `docs/progress/editor/s1-liniennetz-2026-10-16.jpg`. **Nachmittags, Florians Entscheidungen:** Stil „netz farbe“ ist Standard; fehlen der folgenden Ansicht Knoten, fügt die Kopplung einen ein — „nur wenn wirklich notwendig“ (Rest > 1 px, höchstens zwei je Zug, nur wenn es hilft; löst die Regel vom 11.10. „Kopplung fügt nie Punkte ein“ ab).
- **2026-10-16 nachmittags: S2 „Glatte Haut“ gebaut** (Abnahme offen; Stand und Tore auf der Planseite): dünn besetzter Löser (`loeser/normalSystem.ts`, = LU), Glättungsmaß relativ zur Zielform (nur die Abweichung vom Käfig der Ziele; die Falten kamen aus der Interpolation der Ziele), Kappen × 10, Naht 64 (`GLATTE_HAUT`). Im Editor Tafel Körper → „Haut heute | glatt“ (`ausstattung.glatt`, ohne Maul/Beine). Rex/Robbe/Langhals freie Haut ≤ 14,5° (heute bis 176°), Kappen 8–15° statt bis 172°. Nicht erfüllt (angehalten, Kritik-Register): Front von Vase/Giraffe +4–6 px (breiteste Ringstelle wandert, Sache von S3), Fernfeld (S5), Fisch-Volumen (S6). Bilder `docs/progress/editor/s2-glatte-haut-*.jpg`. Florian: „glatt“ ist Standard für neue Wesen (`neuesWesen()` im Editor-Store).
- **2026-10-16 nachmittags: S3 Look-Entscheidung vorbereitet (Test, Planseite S3):** Fülle der Querschnitte rund | mittel | genau (`kern/fuelle.ts`, Option `fuelle`; Tafel Körper → „Fülle (S3-Versuch)“): nur die Ringe, die die Front erreichen sollen, werden waagerecht voller (Superellipse), Ziel ist die Sichthülle, Verlauf längs der Ringe geglättet. Einfache Form Front 21,9 → 9,2 px (mittel); „genau“ macht gewöhnliche Wesen kastig. Empfehlung mittel; Florian: „mach weiter“.
- **2026-10-16 abends: S3 Teil 1 „Front berühren“ gebaut** (Planseite S3): `kern/rand.ts` — für jede Höhe, in der der Körper hinter der Front bleibt, wächst der dort am weitesten reichende Ring örtlich (Glocken über Höhe und Ringe) bis zur Sichthülle an seinem Punkt, Form höchstens weicher Kasten (mittel); Berührpunkte als Breitenpunkte (Gewicht ¼); über × 1,35 = anderes Teil, kein Wachstum. Tafel Körper → „Umrisse berühren aus | rund | mittel | genau“ (`ausstattung.fuelle`). Deine Form Front 21,9 → 8,3 px, Vase 13,7 → 2,3, Rex 10,3 → 7,3. Angehalten am Falten-Tor (Langhals/Drache +1,3–3,3°, Ente aus der Kugel). Bilder `docs/progress/editor/s3-beruehren-*.jpg`. **Teil 2:** Berühren (mittel) Standard für neue Wesen; Front-Blatt markiert „nur als Kante“ (orange) und „anderes Teil“ (violett); Breitenlinie als Griff versucht und zurückgestellt (gehört als 3D-Bedingung zu S5). Nächster Schritt: S4.
- **2026-10-16 abends: S4 „Teile erkennen“ gebaut (nur Anzeige; Abnahme offen, Planseite S4):** `kern/grundkoerper/teilbaum.ts` liest Rumpf, Mittelteile (Gabel, Knick, Stiel) und seitliche Paare (Hülle, Front, Top) mit Kehle am Ansatz; Hysterese 15 %, Sehnen eingefroren in `kaefig.stationen.teile`; `teilAnsicht.ts` zeigt je Blatt die Teile und verdeckte Teilumrisse. Editor: Tafel Körper oben Baumliste + Schalter, Teile/Wirbelsäulen in allen Blättern, Zeiger hebt hervor. Prüfsatz 25/25 (mehrdeutige als „erlaubt“, Florian entscheidet), Züge 17/1428 mit Wechsel, 4 hin und her (kleine Grenz-Wülste), Erkennung ≤ 23 ms. Bilder `docs/progress/editor/s4-teile-*.jpg`. **Florian (abends): „Die Einordnung passt.“** Danach gebaut: verdecktes Stück per Klick als eigene Kurve (`kern/grundkoerper/teilKurven.ts`, `dok.teile`, gespeichert im Rahmen der Stoßstellen mit der schwarzen Linie, Knoten ziehen, „Automatisch“ je Teil; noch ohne Wirkung auf den Körper). Nächster Schritt: S5 Mittelebenen-Baum.
- **2026-10-16 abends/nachts: S5 „Mittelebenen-Baum“ gebaut, im Editor als Geist** (Planseite S5, Abnahme offen): Körper = verdoppeltes 2D-Vierecksnetz der Seitenfläche, ein Streifen je Mittelteil (`kaefig/baumKaefig.ts`, `kern/grundkoerper/ebene.ts`, `baumBau.ts`); dünne Teile mitten am Rumpf als Verbindungsstück, dicke im Rumpfstreifen mit Enden durch das Kind (Vase Rand → Boden), klar dünne am Rumpfende mit Übergang 2:1. Tafel Körper → „Körper (S5): Röhre | Teile (Geist)“ (`ausstattung.koerper`): Baum hellblau durchscheinend über dem heutigen Körper. Giraffe Falten 23 → 11°, Δ 18,8/8,5 → 1,9/1,8 px; Vase Top 13,9 → 2,2; S-Hals 27 → 12°; Überhang 58 → 28°; Fisch 145 → 32°. Offen (Kritik-Register): Y-Stück für Gabeln, Hohlkehlen 20–25°, Kehrtwende Hals → Kopf, Käfiggüte, P-Linien auf dem Baum. Bilder `docs/progress/editor/s5-baum-*.jpg`.
- **2026-10-16 abends, Florians Entscheidung zu den P-Linien** (mit P auf die Haut gezeichnete Linien, die zur Kante werden): Reihenfolge bleibt — **S8 „P-Linien als echte Kanten (Linien exakt)“** nach S7, in Klartext mit seinem Ablauf (P zeichnen, ⇧W Härte, ⌥-Ecke für den Winkel, Bearbeiten in allen Ansichten und auf der Bühne, Posen) und zehn Toren; bis dahin **kein Rückschritt**: Auf mehrteiligen Körpern wirken P-Linien in S7 mindestens wie heute als Treppenfalte (je Streifen und über die Ansätze). Planseite S7/S8. Danach Florian: „ok, du kannst weiter machen“ → S5-Reste zuerst (Gabel/Y-Stück, überlappende Flossen, Hohlkehlen).
- **2026-10-16 nachts: S5-Reste gebaut** (Planseite „S5-Reste“, Abnahme offen):
  - Befund: Die Hohlkehlen-Falten kamen von den Punkten mit sechs Kanten auf der Naht (runder Rumpfring trifft spitzen
    Kindring); der Überhang-Grat kommt von der Front-Glocke, nicht von einer Gabel; der Fischschwanz trug schon.
  - **R1 Kragen statt Sehne** (Standard im Baum): Kindring 0 als U-Schleife auf der Rumpfhaut. Ansatz Giraffe/S-Hals/Ente
    11/13/16° statt 20/23/25°.
  - **R2** Rücken- und Bauchflosse über denselben Ringen: Fisch frei 32 → 22°, Δ besser in allen Blättern.
  - **R3** (Übergang höher am Hals) gemessen, nicht anwendbar.
  - **R4** (Überhang) nach drei Fehlanläufen angehalten.
  - Offen für Florian: dünne Kanten Klinge oder rund; danach S6 oder Überhang. Bilder `docs/progress/editor/s5-reste-kragen-*.jpg`.
- **2026-10-16 spätnachts: R5 Höhenfeld (Versuch), Klinge, S6 seitliche Teile gebaut** (Florian: „Mach so weiter wie es die
  beste Reihenfolge für dich ist. Hauptsache am Ende geht alles sauber.“; Planseite „Stand S6“, Abnahme offen):
  - R5 Höhenfeld (`hebung: 'feld'`) nur Versuch (vorn 3–7 px ungenauer); dünne Kanten als Klinge Standard im Baum.
  - **S6:** Paare (Flügel, Beine, Brustflossen, zweiter Hals) als Röhren über ein Fenster genau auf ihrem Fußabdruck in der
    Rumpfhaut, Säume im Löser auf dem gezeichneten Umriss; Teile, die nur eine Ansicht zeigt, nehmen ihre Dicke aus dem
    Überschuss der Front über den Rumpf (Entenflügel = Flanken der Glocke). Ente Top 37 → 1,7 px, Fisch-Brustflossen 3,5/2,9 px.
  - Im Editor nur der Geist (Tafel Körper → „Teile (Geist)“, Titel „N Streifen + k seitlich“); der Körper bleibt die Röhre (S7).
  - Offen (Kritik-Register „Befunde aus S6“): Beine am Bauch 28°, Ente Front 7,8 px, einfache Form, Zweihals-Brust.
    Bilder `docs/progress/editor/s6-*-2026-10-16.jpg`.
- **2026-10-17 früh: S7 Körper aus Teilen gebaut** (Florian: „Versuche mal noch weiter zu machen, so weit du kommst“; Planseite
  „S7 im Detail“ und „Stand S7“, Abnahme offen): Mit Tafel Körper → „Teile“ ist der Baum mit seitlichen Teilen der Körper im
  Editor (Earle-Look über `baumDeskriptoren`, Atlas, Δ, Augen), folgt während eines Zugs verformt (Mittelwert-Koordinaten,
  24–62 ms), trägt P-Linien als Treppenfalte, Pinsel (`kaefig.baumDeltas`) und Posen (`pose.baum`) mit Ruhelage je Delta.
  Noch nicht: Maul, Zähne, Reifen auf Teilen, „Formen folgen“ nach dem Pinsel, S7.5 (Standard nach Florians Blick).
  Prüfung `apps/editor/scripts/pruefen/s7-editor.mjs`. Wochenlimit am 17.10. früh bei 100 %.
- **2026-10-20: Plan „Vektorillustration aus einem Liniennetz“ freigegeben, V0 gebaut** (Abnahme offen; Stand am Ende der
  Planseite [`docs/plans/2026-10-20-vektorillustration-bedienung.md`](docs/plans/2026-10-20-vektorillustration-bedienung.md),
  Übergabe [`docs/UEBERGABE.md`](docs/UEBERGABE.md)). Florians Wahl: Reihenfolge gemischt, G nach Kontext, ⌘R-Loops mit
  echten Knoten. V0: ⌘R lädt nicht mehr neu, [ ] mit ⌥; Kopplung (⌘Z bringt eingefügte Punkte nicht zurück, Punktsetzen
  gleicht nicht still an); Teile (kein Klickfang, ein Bau je Geste, Seitenknoten am Teil); frische Ringwahl mit Rückfall
  (Stadionform); S8a-Rückschritte (Kreuzungen 24 → 1 px); ehrliche Tafel, Tore als `it.fails`, CI grün. Korrekturen am
  Plan: Stadionform klappt im Ablauf aus der Kugel nicht um; Augen per Klick gehen auf dem Baum; der Enten-Rückschritt
  kommt von der eingefrorenen Ringverteilung der Kugel. Nächster Schritt: Florians Blick, dann V1 Prüfstand „Extremreihe“.
- **2026-10-20 abends: V1 Prüfstand „Extremreihe“ gebaut** (Abnahme offen; „Stand V1“ auf der Planseite 20.10.).
  Florian: Die Cloud-Sitzung „Genauer Zug“ (Branch `claude/sweet-newton-w3ao60`) war ein Versehen — ignorieren, nicht
  zusammenführen; hier nach Plan weiter. V1: 39 Prüfkörper in sieben Gruppen (`kern/pruefen/extremreihe.ts`, sein Kegel mit
  stimmigen Maßen), Messung wie der Editor baut (`extremMessung.ts`: Röhre/Teile, frisch/Ablauf aus der Startkugel),
  Kontaktbögen und Tabelle in `docs/progress/editor/v1-extremreihe-*`, Grundzahlen als Test (`pnpm --filter @ee/shape
  test:extrem`, wöchentlich in CI), Ablauf-Szenarien im Editor (`v1-ablauf.mjs`), Zufallsreihe (`v1-zufallszuege.ts`).
  Behoben (je Test vorher rot): Stiftlinien zogen den Körper auf die Sehne zwischen ihren Knoten (Kugel mit zwei Linien
  Δ 10,5 → 1,3 px), Querlinien „Reihe“ ohne Kante, Absturz der Durchdringungsprüfung. Befunde im Kritik-Register („Befunde
  aus V1“). Nächster Schritt: Florians Blick, dann V2 „Saubere Linien“.
- **2026-10-20 nachts: V2 „Saubere Linien“ gebaut** (Abnahme offen; „Stand V2“ auf der Planseite 20.10.; Florian: „Weiter mit
  V2 nach Plan“). Umrisslinien statt Konturen (`kern/umrissKurven.ts`, Züge `umriss-*`): entlang der Zeichnung auf die
  Silhouette, Tiefe glatt aus den Strahlpaaren, 3D-Kurven mit seinen Knoten als Stützstellen; im Editor echte Kurven in den
  fremden Blättern, Knotenringe auf der Linie (≤ 0,5 px, folgen beim Ziehen), warme Teilfarben. Extremreihe vorher/nachher:
  Knicke 1968 → 18 (+58 auf Falten des Körpers), Schleifen 4 → 0, Haut ≤ 1 px; keine Formänderung. Tor nicht ganz (63 von 78
  sauber, 7 Fälle 0,5–0,85 px neben der Silhouette, Liniennetz Median 18 ms, an 7 Fällen 31–36 ms) — Register „Befunde aus
  V2“, `it.fails` in `test:extrem`. Bilder `docs/progress/editor/v2-*`. **Florian: „Die Linien wirken immer noch sehr sehr
  wild. Da müssen wir auf jeden Fall nochmal ran, aber vorerst weiter mit V3.“** — V2 nicht abgenommen, später an seinem
  Bild klären, welche Linien wild wirken.
- **2026-10-20 nachts: V3 „G/S/R und proportionales Bearbeiten in den Blättern“ gebaut** (Abnahme offen; „Stand V3“ auf der
  Planseite 20.10.). G/S/R wie Blender über einem Blatt mit Auswahl (eigene Umrissknoten, P-Linien-Knoten auf der Haut,
  Spantpunkte, fremde Ringe nur in der gemeinsamen Koordinate), X/Y/Z, ⇧X/⇧Y/⇧Z, Zahlen (px, Faktor, Grad), Enter/Klick
  übernimmt, Esc/Rechtsklick/⌘Z/Fokusverlust nimmt bitgleich zurück (`abbrechenGeste`); ohne Auswahl G = Pinsel, S =
  Spant-Werkzeug (bis V6). Proportional O/⇧O/⌥O mit dem Pinselradius, Rad und [ ] auch im Knotenzug. Code
  `apps/editor/src/editing/modal/`. Tore erfüllt (S 2 und R 90 exakt, Griffe kollinear, ≤ 6,4 ms je Mausbewegung, ein
  Undo-Schritt); Prüfskripte `modal-2d.mjs`, `proportional.mjs`, Bilder `docs/progress/editor/v3-*`. Befunde im Register
  (Spantpunkte unter Front-Knoten nicht greifbar; `spanten.spec.ts` rot an der alten Versuchs-Bauweise, unabhängig von V3).
  Nächster Schritt: Florians Blick, dann V4 „Exakte Umrisse“.
- **2026-10-20 nachts: V4 „Exakte Umrisse“ — Beweis angehalten** (Florian: „weiter mit V4“; die V2-Linien stören ihn → jetzt
  standardmäßig aus, Tafel „umrisse aus | an“). Im Kern hinter `ausstattung.umrisseExakt` (ohne ihn bitgleich): Löser je
  Achse (`loeser/achsen.ts`), Breitenlinie (`kern/umrisse.ts`) — trägt an runden Enden (Robbe Top 12,5 → 1,2 px, Kegel
  2,6 → 0,6), zerknittert Kappen an Kasten, stehendem Ende, Kerbe (Tiger, Vase, einfache Form). Frontlinie nach drei
  gemessenen Fehlanläufen angehalten: Die Röhre hat an der Front-Silhouette keine Käfigkurve. Entscheidung für Florian:
  A (Empfehlung) Struktur folgt den Umrissen — erst der Kern von V6 (Loop = neuer Ring), dann Ring an der breitesten Stelle
  und Kappen nach Endform; B Löser entlang der Normalen. Planseite „V4 — Beweis angehalten“, Register „Befunde aus V4“,
  Bogen `docs/progress/editor/v4-beweis-breitenlinie-2026-10-20.jpg`.
- **2026-10-20/21 nachts: V4 weiter — „Querschnitt aus der Sichthülle“ gebaut** (Florian: „Du musst nicht immer nach 3
  Versuchen stoppen … wähle die elegantere Lösung … Mesh immer schön und smooth außer bei gewollten Kanten“; dann vor dem
  Schlafen: selbstständig den ganzen Plan weiter, „das Mesh muss intelligent sein“). Weder A noch B, sondern die Ursache: Jeder
  liegende Ring staucht heute die ganze Front in seine Sprosse (Robbe: Rumpfring mit Kopf). Neu (`kern/huellenSchnitt.ts`,
  hinter `ausstattung.umrisseExakt`, ohne bitgleich): je Ring die Sichthülle geschnitten, Breite/Scheitel aus der Ansicht längs
  des Rings, Rundung nur ohne Zeichnung (Fülle der eigenen Front, „Fülle wo nötig“ ≤ mittel, flache Enden ohne Rundung),
  Reihenplan der Kette (Breitenlinie per dynamischer Programmierung, gezeichnete Ecken auf gemeinsamen Reihen). **Im Editor:**
  Tafel Körper → „Querschnitt: heute | aus der Hülle (V4)“. Robbe Δ 4,0/6,3/12,5 → 3,9/4,4/3,5 px, Giraffe Front 18,9 → 1,6,
  Hals 1:8 31,6 → 1,4, Kegel 7,3 → 3,0; Extremreihe im Bild 34 von 39 gleich/besser, schlechter Keil, Pilz, Blatt, Hammerhai,
  Seestern. Tor Δ ≤ 0,5 px nur bei Kugel/Ei (Fläche wölbt sich zwischen Käfigpunkten). Verworfen (gemessen): Bindungen/Gewichte
  der Hüllpunkte, angehobener Glättungsbezug, Schultern als Anker. Planseite „Stand V4 — Querschnitt aus der Sichthülle“.
- **2026-10-21 nachts: V5 „Linien exakt“ gebaut** (Abnahme offen; Planseite „Stand V5“, Register „Befunde aus V5“):
  mit „Querschnitt aus der Hülle (V4/V5)“ werden P-Linien **Käfigschleifen** (`kern/linienSchleifen.ts`): längs = Reihe im
  Reihenplan (optimale Reihenvergabe, Endringe durch die Endpunkte, Reihe läuft über drei Ringe aus), quer = eigener Ring, in
  die Linie gedreht (Nachbarn mit), schräg = Treppe. **Form zuerst:** erst der Körper ohne Linien, der Körper mit Linien
  bindet sich dort an ihn, wo die Linien den Käfig verschoben haben — die Linie legt die Schleife fest, nicht die Form; gedrehte
  Ringe tasten das Höhenfeld der natürlichen Ringe ab. Gegen S8a: Robbe Falte 172 → 10°, Haut 4,4 → 1,4 px; Kegel-Kante neu
  (0,7 px); Bau ≈ 1 s → 0,35 s; Kante bleibt im Zug; Umrisse mit Linien ≤ 0,7 px anders (im Editor geprüft, `v5-editor.mjs`).
  Schlechter: schräge Linien (Vase, Würfel, Krake), Lage in der Zeichenansicht 0,4–2 px (Tor 0,3 als `it.fails`).
- **2026-10-21 früh: V6 „Loops (⌘R)“ gebaut** (Abnahme offen; Planseite „V6 im Detail“, „Stand V6.1–V6.3“,
  Register „Befunde aus V6“, Übergabe): ⌘R/⌃R wie Blenders „Loop Cut and Slide“ (Vorschau, Rad = Anzahl, Gleiten, ein
  Undo-Schritt); ein Loop = Rücken-/Bauchknoten in der Seite + Breitenknoten im Top (liegender Ring) bzw. in der Front samt
  Spanten (stehender Ring), formneutral, plus eigener Käfigring (`kern/schleifen.ts`, Option `schleifen`, Röhre ohne
  Maul/Beine, beide Querschnitte). ⌥-Klick wählt einen Loop, G/S/R auf der Bühne formen ihn (`kern/schleifenGrs.ts`,
  Mindest-Einfluss = 3 × Verschiebung). Mit Maul/Beinen lösen sich Loops in Knoten auf. Unterwegs behoben: formneutrale Knoten
  änderten den Körper (Enden, Spitzenprobe, Ring-0-Ecken mit doppelten Ringen, harte Breitenpunkt-Schwelle, Breitenlinien-
  Raster, Breiten je Segment); Loops entscheiden nichts um; Leiter an den Loops festgeheftet. Tor „Einfügen ≤ 0,1 px“ verfehlt
  (Loop gibt Auflösung, Haut rückt am Loop zur Hülle, Langhals bis 4,5 px).
- **2026-10-21 früh: Florian wählt Teil A „Maul als Einsatz“ als nächsten Block** (damit glatte Haut, Hülle, Linien exakt und
  Loops auch mit Maul wirken). Fortsetzungsplan [`docs/plans/2026-10-21-maul-einsatz-weiter.md`](docs/plans/2026-10-21-maul-einsatz-weiter.md):
  Stand A1–A7 frisch gemessen (Knick am Mundwinkel 131–179° in allen Fällen), Ursache (zwei Hautflächen am Mundwinkel müssen
  360° überdecken), Entscheidung: Mundwinkel als regulärer Gitterpunkt am Ende eines Schnitts (Feld aus zwei Rechtecken über und
  unter der Linie samt Verlängerung; Vorversuch 7,8° statt 176°), Schritte E1–E6 (Gitter → A0 wie im Editor → Bau → Editor zu →
  Öffnen → Rest).
- **2026-10-21 vormittags: E1 „Kernring“ statt zwei Rechtecken** (Option `gitter: 'kernring'`, alter Weg bitgleich; Planseite
  „Stand E1“, Register „Befunde aus E1“). Zwei Rechtecke gemessen: Lippe nur 1–6 Spalten → verworfen. Kernring: Lippe m = M − 2,
  ein Ring um den Schlitz, c Faltenpunkt mit vier Hautflächen, Lippe endet als Falte (Spitze auf dem Mundwinkel, c eine halbe
  Spanne dahinter). Lage: Karte ist konform bis auf ein Seitenverhältnis a; innen Tutte in der um c zentrierten Auffaltung
  ζ' = √(ζ² − x_c), außen Tutte in der Karte; J konform passend; Zellen am Mundwinkel ≥ eine Kante von K1. Knick am Mundwinkel
  ≤ 12° in 29 von 39 Fällen (vorher keiner unter 131°), Tor (A0 + 2°) in 5 von 15; offen: Karte um c auf der Haut nicht
  symmetrisch, schiefe Felder, konforme Lippenstellen bei verwickelten Linien, Haut 0,6–1,3 px. Fallen: Topologie und Lippe
  müssen dieselbe Lage von c haben (Falte legt c vor); Dehnungsgewichte gegen eine gestufte Randlage zerdrücken den Mundwinkel;
  Festhalten der Mundwinkelspeiche faltet.
- **2026-10-21 mittags/nachmittags: E1 weiter, Übergabe für eine frische Sitzung** ([`docs/UEBERGABE.md`](docs/UEBERGABE.md) mit
  Start-Prompt). Mittags: Der Knick am Mundwinkel kommt von der Lage, nicht von der Topologie (Kissen mit quadratischen Zellen um c
  1,0°; im Feld liegt der Fächer 3–10-mal zu nah an c); sechs Lage-Varianten verworfen; Lippenwulst läuft zur Spitze aus.
  **Florians Wahl: „Mach zuerst die Haut wieder genauer (0,25 px), dann den Mundwinkel.“** Nachmittags: Feld auf K2
  (`einsatzFall(…, { stufe: 2 })`), J = 12, Ausgleich außen nach Hautlängen (`aussenRunden`) → Haut 0,16–0,22 px an Kugel, Ei,
  Birne, Langhals (vorher 0,3–1,3 px); noch Schalter. Nächste Schritte: das als Standard, dünn besetzter Löser (dichte LU 10–30 s je
  Fall), ganze Reihe + Haut-Tor, dann Mundwinkel als Quadratgitter um c (Planseite „Nachtrag E1 (nachmittags)“).
- **2026-10-21 (zweite Sitzung): Haut als Standard des Kernrings, Mundwinkel ohne Wulst** (Planseite „Nachtrag E1 (zweite
  Sitzung)“, Register „Befunde aus E1“, Übergabe [`docs/UEBERGABE.md`](docs/UEBERGABE.md)). Standard: Feld auf K2, Schlitz genau
  auf der Linie, Reihen 10–16, Ausgleich außen, dünn besetzte Löser (≈ 3–4 s je Fall), letzte Lippenspanne ¼ Feldkante, kein
  Lippenwulst. Ganze Reihe: Haut ≤ 0,25 px in 30 von 30 (Tor als Test `einsatz/kernring.extrem.ts`), Mundwinkel ≤ A0 + 2° in 26 von
  30 (vorher mit Wulst 1 von 39); verfehlt nur an J-Linien — Ursache die Verdrehung (Feldrand außen am Haken länger), Weg
  Übergangsreihe mit Polpaaren. Messung des Mundwinkels jetzt mit festem Umkreis (drei Feldkanten). Dreizehn Varianten (Lage und
  Lösen) gemessen und verworfen (Liste in der Übergabe). Bild `docs/progress/editor/e1-mundwinkel-ohne-wulst-2026-10-21.jpg`.
- **2026-10-21 (dritte Sitzung): Mundwinkel-Tor 30 von 30, auch an den J-Linien** (Florian: „mach hier mit der Verdrehung an
  J-Linien weiter …, bis das Mundwinkel-Tor auch an den vier J-Fällen hält“; Planseite „Nachtrag E1 (dritte Sitzung)“, Register,
  Übergabe [`docs/UEBERGABE.md`](docs/UEBERGABE.md)). Die Polpaare waren nicht der Hebel (die Verdrehung gibt es auch in Fällen,
  die das Tor halten). Neuer Standard des Kernrings auf K2: Feld begradigt bis 1,5 Radien (`kappe`), Fächer um c als Halbkreis
  auf der Haut (`faecherKreis`), Nahtspeichen auf den Kartenlinien ihrer Reihen (`naht: 'karte'`); K1 und `FALL_ALT` bitgleich.
  Ganze Reihe: Mundwinkel ≤ A0 + 2° in 30 von 30 (J-Linien höchstens 0,9° darüber), Haut max 0,22 → 0,09 px, Lippe ≤ 0,44 px,
  keine umgeklappte Zelle in allen 39 Fällen (vorher Robbe hoch), über alle 54 Fälle 64 → 1. Rex/Robbe bleiben bis E2 außerhalb
  der Tore (A0-Falten im Feld; spitzer Schlitzanfang bei Robbe hoch: Zellen bis 57 : 1). Mundwinkel-Tor jetzt `it`, neue Wächter
  in `kernring.test.ts` (am alten Code rot). Bild `docs/progress/editor/e1-mundwinkel-j-linien-2026-10-21.jpg`. Nächster Schritt:
  E2.
- **2026-10-21 (dritte Sitzung, danach): E2 — A0 wie im Editor, Spitzen von A0, Rex und Robbe in den Toren** (Florian: „Ja, mach
  hier mit E2 weiter (A0 wie im Editor, Rex und Robbe in die Tore)“; Planseite „E2 im Detail“ und „Stand E2“, Register „Befunde
  aus E2“, Übergabe). Neuer Standard des Kernrings auf K2: A0 wie im Editor im Prüffall (Startkugel, eingefrorene Ringe, glatt,
  berühren mittel), ein Ausgleich der Stufennaht (Verdrehung an J-Linien nicht mehr als Knick an Reihe J_i), letzte Lippenspanne
  0,15 Feldkante, Spitzen von A0 übernommen (auf der Naht als Nahtpunkt mit Punktschärfe; am Linienanfang als Ecke der Lippe,
  Phantompunkt 2U₀ − U₁), Naht nach Bogenlänge auf umparametrisierter Karte (`nahtBogen`), Knickmaß ohne die Umgebung von Spitzen.
  Ganze Reihe 43 Fälle: Mundwinkel 43 von 43, Haut-Tor 39 von 43 an allen Körpern (Rex/Robbe Haut 0,07–0,37 px statt bis 1 px).
  Offen: Robbe hoch (Haut faltet am spitzen Schlitzanfang → Eckenentfaltung), Rex mittel J (Querfalte vom Schlitz zur Naht → Kappe
  um die Spitze), Robbe tief J (Buckel der Lippe). Bild `docs/progress/editor/e2-spitzen-anfang-2026-10-21.jpg`.
- **2026-10-21 (dritte Sitzung, abends): E2.6 Leiter** (Florians Auftrag „Rex und Robbe in die Tore“; Planseite „Nachtrag E2
  (abends)“, „E2.6 Leiter — Bauplan“, „Stand E2.6“; Register; Übergabe). Befund: Robbe hoch ist kein spitzer Anfang, sondern ein
  schmaler Keil zwischen Linie und Kopfnaht (dort laufen im Kernring Reihen und Speichen beide längs, in jeder Lage); Rex mittel
  verliert eine Falte von A0, die als Ring um die Schnauzenfront die Linie kreuzt und zur Naht läuft; Robbe tief J folgte einer
  gewellten Linie (bis 0,75 px neben der Haut). Gebaut und Standard auf K2: **Lippenziel auf der Haut** (wie der Schlitz) und die
  **Leiter** — die Speichen der ersten q Lippenstellen enden auf der Naht (Falte als Halssprosse bzw. Hals am Ende des Keils), je
  Hälfte ein Dreier- und ein Fünferpol, Lippe m = M − 2 + (q − 1)/2, Ringfeld L-förmig in eigener Karte, Leiterfeld Tutte in seiner
  Karte, Ecke der Lippe an der Kreuzung, Schärfe von A0 auf Hals und Stück über P, Stufennaht nie an der Reihe einer Spitze; ohne
  Fund bitgleich. Haut-Tor 39 → 41 von 43 (Rex mittel J 0,13 px/27,4°, Robbe hoch gerade 0,21 px/7,3°, Robbe tief J 11,2°).
  Offen: Rex mittel gerade (Knick an der Kreuzung 29,6°, Tor 29,1°; örtlich A0 11°, Einsatz 26–30° auch bei J), Robbe hoch J
  (Engstelle 0,5 Feldkanten — zwei Leitern hintereinander oder als Grenze). Bild `docs/progress/editor/e2-leiter-2026-10-21.jpg`.
- **2026-10-21 spätabends: Recherche „Feldnetz oder Kernring?“** ([`docs/research/2026-10-21-feldnetz-oder-kernring.md`](docs/research/2026-10-21-feldnetz-oder-kernring.md);
  Florians Zwischenfrage nach dem Vorschlag einer Nebensession). Befund: Der Kernring legt das halbe Maulfeld auf ein einziges
  Rechteck (`einsatz/karte.ts`) — daraus folgen Wurzelverzerrung am Mundwinkel, Stauchung schmaler Streifen und fehlende
  Merkmale im Innern; fast alle der gut 20 Sonderregel-Schalter (und ≈ 15 feste Regeln) gleichen eine dieser Folgen aus. Die
  Richtung der Nebensession (Netz richtet sich nach Linien, Pole von selbst) stimmt; am elegantesten ist für uns aber das
  **Stücknetz** ohne Richtungsfeld: Feldrand, Naht, Maullinie samt Verlängerung über den Mundwinkel und Falten zerlegen das Feld
  in Stücke, Ganzzahlen mit festem Feldrand (wie QuadMixer 2019), Füllung nach bewiesenen Mustern (Takayama 2014, Tarini 2022);
  der Mundwinkel wird regulär wie bei den „zwei Rechtecken“, die Muster lösen deren Kantenzahl-Problem, die Leiter ist das
  kleinste Dreier-Fünfer-Muster. Kein Werkzeug kann den festen Feldrand (QuadWild: alles neu, GPL, C++). Nicht für den ganzen
  Körper jetzt; Zielbild „Das Liniennetz ist das Netz“. Empfehlung: Kernring einfrieren, Beweis F0 (3–5 Arbeitstage), gesamt bis
  zum heutigen Stand der Tore 2–3 Wochen. Entscheidung offen.
- **2026-10-21 spätabends (danach): Recherche „Netz und Linien im Ganzen“** ([`docs/research/2026-10-21-netz-und-linien-gesamt.md`](docs/research/2026-10-21-netz-und-linien-gesamt.md);
  Florian: „Betrifft das nur das Maul oder das ganze Mesh und die Linien? … ich möchte nicht, dass wir die Richtung wechseln und
  dann wieder etwas nicht funktioniert“). Fünf Recherchen (Flächen aus Kurvennetzen, Topologie aus Linien, Form aus drei
  Ansichten, saubere Umrisslinien, Produktion/Posen/Export). Befund: zwei Wurzeln — Topologie aus festen Vorlagen (Sonderregeln
  an Maul, Kanten, Ansätzen, Kappen, Loops, Augen) und „Körper zuerst“ bei den Umrissen (Umriss liegt, wo der Körper am
  breitesten ist; auf flachen Flanken in der Tiefe schlecht bestimmt → wilde Linien, Front/Top verfehlt; zwei Recherchen
  unabhängig gleich). Zielbild „ein Liniennetz, ein Löser“: Umriss zuerst (Prasad 2006, Cashman 2013: lineare Umriss-Bedingungen),
  Stücknetz aus harten (Umrisse, Kanten, Maul, Augen, Loops) und weichen Linien (Raster), Muster (Takayama 2014, Tarini 2022),
  Pol-Regel (Karčiauskas–Peters–Reif), Daten an Linien (Pixar Profile Mover). Verworfen: CAD-Flächen zwischen Linien (G1-Nähte
  knicken Farbstufen), globales Feldnetz, gelernte Netzerzeuger, Sichthülle mit Neuvernetzen. Prüfphase ≈ 2–2,5 Wochen: P1 Umriss
  zuerst → P2 Stücknetz im Maulfeld → P3 Liniennetz am ganzen Körper, je mit Abbruchkriterien. Entscheidung offen.
- **2026-11-02: Gegenprüfung und Prüfplan P0–P3 (Schritt 2 des Vorgehens vom 21.10.), zur Freigabe.** Florians Klarstellungen
  Teil 1 (wörtlich, `docs/plans/2026-10-22-klarstellungen.md`; Teil 2 kommt später): Die drei Ansichten sind Outline-Illustrationen
  je Teil (verdeckte Stücke blass/gestrichelt und bearbeitbar, der Bauch läuft von oben unter dem Kopf durch, die zwei
  Zusatzpunkte der Vereinigungs-Silhouette entfallen), Loops sind gezeichnete Linien („die meisten Kanten Edgeloops“), Härte =
  Strich 0–3 px, ohne Kante „so rund wie möglich“, zu viel Fokus auf Spanten/Silhouetten, Spielqualität von Anfang an umschaltbar.
  **Gegenprüfung** (`docs/plans/2026-11-02-gegenpruefung-liniennetz.md`): „Ein Liniennetz, ein Löser“ bleibt, wird einfacher —
  Umrissschleifen je Teil (verdeckte Fortsetzung = Rest des Teilumrisses, wie Monster Mash), Loop = Körperschnitt über der
  gezeichneten Kurve (Spant, Reifen, ⌘R werden eins), Fairness ohne Zielform statt Füllung aus der Sichthülle (die flachen
  Flanken von „berühren mittel“ sind die Ursache der wilden Linien), Käfig = Spielnetz (Stufe 1 mit Grenzflächen-Lagen und
  -Normalen, 8 · Käfigflächen ≤ 8 000 Dreiecke → Käfig ≤ 1 000 Flächen samt Maul; der Kernring auf K2 liegt beim Zehnfachen).
  Zehn Lücken, Werkzeugtabelle (zwölf Chips/Werkzeuge entfallen), 13 Ideen, Entscheidungen E1–E8. **Prüfplan**
  (`docs/plans/2026-11-02-pruefplan-p0-p3.md`): P0a Spielstufe im Editor → P1 „Ansichten als Illustration“ → P2 „Stücknetz im
  Maulfeld“ mit Budget-Tor → P3 „Loops und Linien am ganzen Körper“; P0b iPhone mit Florian; 14–19 Arbeitstage. Recherchen
  `docs/research/2026-11-02-recherche-linienzeichnung-3d.md`, `…-recherche-spielnetz.md`, Inventar `…-inventar-editor.md`,
  Messung `docs/progress/editor/spielstufe-2026-11-02.md` (Stufe 1 ohne Maul im Budget, Umriss auf der Grenzlage 0,4–2,8 px
  polygonal, Facetten abseits der Falten bis 133° = verdeckte Käfigfehler; **flache Flanken kommen aus den gezeichneten
  Querschnitten, nicht aus „berühren mittel“** — Korrektur an der Recherche vom 21.10.). Falle: macOS kennt kein `timeout`
  (Exit 127, Test lief gar nicht).
- **2026-11-03: Prüfplan freigegeben (E1–E8 wie vorgeschlagen), P0a „Spielstufe im Editor“ gebaut** (Abnahme offen; Planseite
  „Stand P0a“ in `docs/plans/2026-11-02-pruefplan-p0-p3.md`, Register „Befunde aus P0a“). Kern `kern/spielstufe.ts`: Option
  `stufen` (1 = Spielnetz) sortiert die Eckenwerte der Stufe 3 auf die Ecken der Stufe 1 um (Ecke (f, i) der Stufe 1 = Ecke 0
  der Stufe-3-Fläche 16·f + 4·i; Punkte auf der Grenzfläche, Normalen der glatten Fläche), ohne Option bitgleich; Editor:
  Eckknopf „Spiel“, Tafel Spiel, Titel mit Dreiecken/Budget und Umriss Stufe 1 ↔ 3 in Gerätepixeln bei 300 px Höhe. Befund:
  Budget hält ohne Maul (3 200–6 288 Dreiecke), aber Umriss-Tor (≤ 1 Gerätepixel) und Facetten-Tor fallen an Rex, Langhals,
  Robbe, Tigerkopf, Kegel — 16 Punkte je Ring sind für Stufe 1 zu grob, und abseits der Falten stecken Knicke von 45–88°, die
  Stufe 3 verdeckt → Dichteregel und Käfiggüte als Tor im neuen Bau. Mit Augapfel-Höhle bleibt Stufe 3. Fallen: In
  Playwright-Skripten `window.__editor` nie ohne Prüfung lesen (war kurz undefined); ein Schalter, der den Zustand nicht
  ändert, löst keinen Bau aus (nicht darauf warten); Bühnen-Kamera Azimut 0° = Seite, −90° = Front.
- **2026-11-03 (nachmittags): P1 Tag 1 „Umrissschleifen geplant“ gebaut** (Florian: „Die P0a-Bögen passen so weit. Weiter mit
  P1 „Ansichten als Illustration“ nach dem Prüfplan.“; Abnahme offen; Planseite „Stand P1 Tag 1“ im Prüfplan, Register „Befunde
  aus P1 Tag 1“, Übergabe). Kern `kern/umrissPlan.ts` hinter `Bauplan.umrissPlan` (ohne Option bitgleich): Umrissschleifen je
  Ansicht allein aus den drei Zeichnungen — Tiefe je Probe aus der Sichthülle (2 px innen abgetastet: genau auf der Linie
  zerfallen die Intervalle an Kastenkanten in Splitter), Intervallwahl per Viterbi, Tiefe mit kleinster Biegung in den
  Intervallen (aktive Menge, pentadiagonal; die gespannte Laplace-Folge knickte an jedem Klemmpunkt), **T-Stöße = konkave
  Ecken** (Tiefensprünge taugen nicht — Vereinigungs-Intervalle glätten sie), Sehnen zerlegen die Zeichnung in einen Flächenbaum,
  jede Fläche eine geschlossene Schleife mit Vorschlägen über die Sehnen (verdeckte Fortsetzung des ferneren Teils blass,
  sichtbare Schlusskontur des näheren dünn; Seite: alles verdeckt); die Ecke einer Sehne nimmt je Fläche das Intervall ihres
  Nachbarn. Liniennetz: Züge `plan-*`; Editor: Chip „umrisse geplant“ (Tafel Körper), `umrissSvg` = dasselbe Bild als SVG, Haken
  `__editor.umrissPlan/umrissSvg`. Tore (`kern/umrissPlan.test.ts`): (a) 0 px Jitter (V2 heute: 20 % der Punkte über 0,2 px,
  max 26 px), (b) 10 von 11 Körpern (Robbe Top von der Zeichnung erzwungen), (c) Langhals/Ente/Pilz schließen ohne
  Teilerkennung, (d) ≤ 0,012 px, (e) 1,3–4,7 ms. Offen: Tiefe aus Vereinigungs-Intervallen (Hals liegt in der Mitte der
  Vereinigung), Schlusskontur nur interpoliert, keine ganz verdeckten Schleifen, jede konkave Ecke ein T-Stoß. Bild
  `docs/progress/editor/p1-umrissschleifen-2026-11-03.jpg`. Nächster Schritt: Florians Blick, dann Tag 2–3 (Käfig um die
  Schleifen, ein Löser).
- **2026-11-03 (abends): P1 Tag 2–3 „Körper aus den Schleifen“ gebaut — Tore verfehlt, Abbruchkriterium des Prüfplans trifft,
  Entscheidung A/B/C offen** (Planseite „Stand P1 Tag 2–3“, Register „Befunde aus P1 Tag 2–3“, Übergabe). Kern
  `kern/schleifenKoerper.ts` hinter `Bauplan.schleifenKoerper` (bitgleich ohne): gekoppelter 3n-Löser — Naht quer zur Kurve,
  Top/Front-Schleifen über die nächsten feinen Punkte (Lage längs der Umrissnormale, Silhouettenbedingung P·w stationär;
  längs und Tiefe frei), Ziele schrittweise (4 px/Runde), ferne Proben weich, **Zielform des heutigen Baus als Füllung**
  (ohne Zielform keine Form: Ellipsen-Vorrang → Ellipsen, Laplace → Sehnen); Planer: Front-Tiefe aus der berührenden
  elliptischen Station. Editor: Chip „Körper heute | aus den Schleifen (P1)“ (`?schleifen=1`). Ergebnis: nur die Kugel hält alle
  Tore; Kegel Front 7,3 → 3,9, Robbe Top 12,5 → 5,1, Vase Top 13,8 → 6,5 px, aber umgeklappte Flächen an sieben Körpern genau
  dort, wo die Röhre die Schleife nicht hat (Flossen, Hut-Überhang, Brust unter dem Hals, Kasten-Kappen), Seite schlechter,
  Lösen 400–670 ms. „Die Ringe werden von der Schleife gesetzt“ (Plan) ist nicht gebaut. Fallen: Naht nie längs hart binden;
  Grenzflächen-Bindungen sehen hochfrequente Käfigmoden nicht (Käfig fliegt ohne Käfigzeilen davon); Reihenbiegung schiebt
  Ringe auf gleiche Abstände (Stationen längs verankern); Sprünge über 10 px je Runde klappen um; Stützpunkt-Regeln für die
  Front-Tiefe springen (f-Minimum nehmen). Bilder `docs/progress/editor/p1-koerper-2026-11-03.jpg`, `p1-koerper-draht-*.jpg`.
- **2026-11-03 (spätabends): P1 Tag 2–3, zweiter Anlauf — Schleifen-Käfig gebaut** (Abnahme offen; Planseite „Stand P1 Tag 2–3,
  zweiter Anlauf“ im Prüfplan, Register „Befunde aus P1 Tag 2–3, zweiter Anlauf“, Übergabe). Florian zur Entscheidung A/B/C: „Die
  Linie und das Modell sind doch exakt das selbe … die gelbe Linie sollte eigentlich die schwarze Linie sein“ — stimmt; die Lücken
  kamen aus dem Bau (Schlauch aus der Seite), nicht aus Widersprüchen; seine Wahl: „ok, dann machen wir es so!“ (Netz aus den
  Schleifen, zuerst ein Teil). Kern `kern/schleifenKaefig.ts` hinter `Bauplan.schleifenKaefig` (bitgleich ohne): die drei
  Umrissschleifen sind Käfigreihen (Naht, Reihe N/4 samt Kappenmitte, ein Ring), sechs Kreuzungen (flache Läufe → Mitte), Anker
  beim gleichen Bogenanteil, Inneres = die auf die Anker gestreckte Ringschleife, Achse x oder y nach der längeren Ausdehnung,
  Falten aus Ecken-Knoten (gebündelt je Seite), Schleifentiefe neu mit kleinster Biegung, ein gekoppelter Löser (Schleifen und
  Falten hart, Silhouettenbedingung, Inneres weich, Glättung der Abweichung). Planer: Winkelhalbierende an Ecken, Sehne an
  grifflosen Knoten. Editor: Chip „Schleifen-Käfig (P1)“ (`?schleifen=2`). Prüfkörper `kern/pruefen/einteiler.ts` (Kugel, Ei,
  scharfer Würfel, Zylinder, runde Vase, Kegel, Stift-Würfel, Vase aus der Kugel): Kugel 0,1, Ei 0,1/0,4/0,1, scharfer Würfel
  0,3 px (Falten 0°) halten alle Tore; Zylinder 0,7/1,0 und runde Vase 1,3 px halten die Glätte (Achse y; heute diagonale Sprossen,
  Top 14 px); Kegel (Kippung 84 px, Kappe faltet), Stift-Würfel (Rundung gegen Falte), Vase aus der Kugel (Messerkante) nicht.
  Bilder `docs/progress/editor/p1-kaefig-2026-11-03.jpg`, `p1-kaefig-draht-*`. Fallen: Krümmungsverdichtung je Bogen lässt
  Ringe kreuzen (gemeinsame Dichte je Seite); Soll-Zug der Planer-Tiefe wandert bei Kästen/Rotationskörpern 80–100 px; Ecken-
  Proben brauchen die Winkelhalbierende (Splitter-Intervalle); Extrem-Läufe 3 px; Δ-Raster 240 kappt Ecken um 1 px (Tests 1920).
  Nächster Schritt: Teile an der Naht (Langhals, Ente, Robbe, Pilz), dann P2.
- **2026-11-03 (nachts): P1 Tag 4–5 „Teile an der Naht“ gebaut** (Abnahme offen; Planseite „Stand P1 Tag 4–5“ im Prüfplan,
  Register „Befunde aus P1 Tag 4–5“, Übergabe). Florian: „Ja, bau den nächsten Beweis „Teile an der Naht“ (Langhals, Ente, Robbe,
  Pilz) auf dem Schleifen-Käfig, hinter dem Schalter, ohne Schalter bitgleich.“ Kern `kern/schleifenTeile.ts` (Einstieg
  `schleifenKaefig.ts`, Stücke `schleifenKern.ts`): Kinder aus Teilbaum (Mitte-Teile der Seite, nur auf liegendem Rumpf längs
  seiner Achse) und Planer (konkave Ecken); Rumpf = Einteiler aus Seite mit Sehnen und Front/Top aus der Hülle über dem
  Rumpfpolygon mit ebenen Ringen; Kinder als Röhren über ein Fenster (Streifen längs der Naht mit Reihen λ, auch über die Kappe;
  Fortsetzung über eine Kappe für den Pilz-Stiel mit Achse y), Kindringe aus der kürzesten monotonen Zuordnung der Bogenseiten,
  seitlich die Hülle, ein Löser; Tafel zeigt „Teile an der Naht“. Ergebnis: alle vier bauen, bitgleich ohne Option; Seite Pilz 0,7
  und Langhals 1,3 px, Robbe 4,6, Ente 15,5 (Schnabel); Front/Top 2–9 px (Breite aus der Hülle; Ente Top 58 = Flügel fehlen);
  Naht-Tor nur Langhals (29°; Robbe 58, Ente 41, Pilz 85°) → Abbruchkriterium trifft, Entscheidung bei Florian. Tests
  `schleifenTeile.test.ts` (8 grün, 14 `it.fails`), Bilder `docs/progress/editor/p1-teile-2026-11-03.jpg`, `p1-teile-draht-*`.
  Fallen: Rumpfschleifen nie aus beschnittenen Zeichnungen (Kind überdeckt den Rumpf in der Höhe, Tiefe springt); Tiefe durch
  Plateau-Intervalle glätten; die gerade Sehne mit Zwischenpunkten; Paarung der Kindseiten weder nach Bogenanteil noch nach
  Höhe noch nach Innennormale (je ein Körper fällt), sondern kürzeste monotone Zuordnung; ebene Ringe nicht für Einteiler
  (Plateaus); Maße bei mehrteiligen Körpern je Teil (die Achse im Mittel aller Punkte liegt im Hals).
- **2026-11-03 (abends): Tag 4–5 weitergeführt — Naht weich, Hülle als Obergrenze, Flügel als Paar, Röhrenende am Ende der
  Wirbelsäule** (Florian: „Also geht es nicht? …“ → Klarstellung: es geht, der Stopp war die Regel des Prüfplans; „dann gerne
  weitere wie du empfiehlst“; Planseite „Nachtrag 03.11. abends“, Register, Übergabe). Im Kern hinter dem Schalter, bitgleich ohne:
  absolute Glättung am Fensterrand (`nahtGlatt`), kein Zielpunkt seitlich außerhalb der Sichthülle (`huelleKlemmt`), Kindringe
  als Hüllenschnitte (`huellenRing`), Flügel als Kinder der Top-Ebene mit Spiegel (Fenster auf der Flanke, Dicke aus Front bei z
  und Seite bei x, Klemme der Dicke), die Röhre eines Naht-Kindes endet am Ende der Wirbelsäule (Ente: Schnabel statt Scheitel),
  Silhouettenbedingung je Ring in der Ansicht, die ihn von der Kante sieht; Nahtknick frei / an gezeichneten Ecken, „nach innen“
  mit Flächenanteil. Ente Seite 15,5 → 2,9, Top 57,7 → 2,7 px; Robbe Top 12,5 → 5,4, nach innen 176 → 0; Langhals nach innen
  888 → 26; Naht frei Langhals 17,9°, Ente 20,2°, Robbe 37,0° (Falte an den Fensterflanken), Pilz ohne freie Kante. Front/Top hält
  nur der Pilz (0,8/2,0). Fallen: Bänder nie in einer Ansicht, deren Blick in der Ringebene liegt (w = t × v entartet, Ringe
  falten); die Hüllen-Klemme eines Paars gilt der Dicke, nicht der seitlichen Lage; der flache Lauf um die Spitze darf das
  Wirbelsäulenende nicht verschieben; Nahtknicke an gezeichneten Ecken sind kein Fehler. Nächster Schritt: Florians Blick.
- **2026-11-03 (nachts): Robbenkopf als Endstück** (Florian: „Mach weiter mit der Robbe-Falte … dann Breite der Kinder aus eigenen
  Front-/Top-Schleifen.“; Planseite „Nachtrag 03.11. nachts“, Register, Übergabe). Befund: keine gezeichnete Ecke, der Kopf ist das
  Ende der Röhre; als Streifen Kuppel unter der Sehne → 37°. Gebaut (Option `endstueck`, Standard an): Rand = Ring durch das hintere
  Sehnenende, Kappe und Ringe davor laufen als freie Kopfringe weiter, Seite am Rumpfumriss verlängert, Paarung im gleichen
  Bogenanteil, alle Ringpunkte hart, keine Silhouettenbänder, Höhentest Ring ≤ 1,5 Sehnen. Robbe Naht 37 → 27,6°, Knicke 141 → 68°,
  nach innen 0 / 6, aber Front/Top 12,4/9,6 (Bauchecken zwischen den 16 Ringpunkten). „Breite aus eigenen Schleifen“ bringt an den
  vier Körpern nichts (Planer-Flächen nur an T-Stößen, dort misst die Hülle schon das Teil; die Fehler liegen am Rumpfboden).
  Fallen: kürzeste Zuordnung fächert bei dicken Enden; Röhrenringe als Pfad sind schräg im ganzen Rumpf; Hüllenringe brauchen alle
  Punkte hart und keine Bänder; ohne Höhentest wird jeder Hals am Vorderende zum Endstück; „nach innen“ mit der Rumpfmitte aus den
  Rumpfflächen messen.
- **2026-11-03 (spätabends): Dichte je Ring — Bauchecken und breiteste Stelle** (Florian: „Mach weiter mit der Dichte je Ring (Bauchecken
  und breiteste Stelle: Front/Top von Robbe, Langhals, Ente).“; Abnahme offen; Planseite „Nachtrag 03.11. spätabends“, Register,
  Übergabe). Befund: Die Ziele selbst lagen innen — Langhals: die Tiefe der Top-Schleife lag auf dem Plateau zu hoch und streckte die
  Ringvorlage senkrecht; Robbe: Endstück-Ringe als Hüllenschnitt-Ellipsen (sin θ · Hülle) und Rumpfecke zwischen zwei Abtastpunkten;
  Ente: Rumpf-Front unter den Flügeln aus der Lobbenschnitt-Sehne (Planer). Gebaut (Optionen, Standard an, ohne Schalter bitgleich):
  `rumpfTiefe: 'vorlage'` (Tiefe aus der Höhe der breitesten Front-Stelle je x), `ringDichteRumpf: 'kruemmung'` (`dichteKruemmung`, nur
  Rümpfe mit Kindern: Vorlage je Viertel nach √κ, Grunddichte 0,5, Kappe 4×, in der Schleifenebene, Ecken und scharfe Rundungen
  ausgenommen, Endzonen höchstens Kreiskrümmung; Einteiler bleiben nach Bogenlänge — der Kegel verlor 2,0 → 7,3 px, ungeklärt;
  `'spline'` als Versuch nicht besser), `vorlagenRing` (Endstück-Ringe aus der Vorlage: Bauchhälfte Vorlage × Seitenbreite, auf dem Bauch
  zur Hülle geblendet, Rückenhälfte → Halbellipse); Wendepunkt-Maß mit 1-px-Schwelle. Robbe 1,5/12,4/9,6 → 2,5/4,4/3,3 px (Naht 14,2°,
  0 nach innen, Glätte hält; neu Seite 2,5 am Rand, Überstand 4,7), Langhals Bauchecke 4,5 → 1,9 (Form Seite hält), Ente 4,5/2,7 (Naht
  25°), Pilz unverändert; Front/Top ≤ 2 px hält keiner. Offen: Kopfkrone und Rückengrat unter dem Kopf (Front-Umriss = Vereinigung von
  Rumpf und Kopf → Schleifen je Teil mit verdeckter Fortsetzung), Bauchecke 4,4 (N 24), Überstand, Kegel. Fallen: Vorlage × Hülle je
  Stelle zählt doppelt; Krümmung in der Schleifenebene messen; Hüllenschnitte an Sehnen erzeugen falsche Ecken; steifes Inneres bricht
  die Naht; Dichte, die Spalten neben der Naht verschiebt, verschiebt die Fenster der Kinder. Bilder
  `docs/progress/editor/p1-teile-dichte-*-2026-11-03.jpg`.
- **2026-11-03 (nachts): P1 abgeschlossen, Versuchsschalter abgeräumt, P2 beginnt** (Florian: „Bauen wir gerade wieder viele
  Sonderregeln? Ist der Beweis erbracht oder nicht?“ → „Räum die gemessen schlechten Schalter ab, schließ P1 ehrlich auf der
  Planseite ab und starte P2.“; Planseite „P1 — Abschluss“, Register, Übergabe). Bilanz: Prinzip bewiesen (Schleifen als
  Käfigreihen, ein Löser, Teile ohne Nahtfalte), Genauigkeit der Mehrteiler nicht (Front/Top ≤ 2 px hält keiner); die Restfehler
  sind strukturell — verdeckte Fortsetzung je Teil (Front/Top = Vereinigung von Rumpf und Kopf; mit P3 als bearbeitbare Linie im
  Editor) und N je Ring aus dem Spielbudget — und bekommen keine Regel mehr. Abgeräumt: Scheitelschub, Rumpfkippen, feste
  Spaltenzahl, Spline-Dichte, Krümmungsdichte für Einteiler, Krümmungsgewicht, Planer-Tiefe; die Alternativen zu Naht glatt, Hülle
  als Obergrenze, Hüllenringen, Endstück, harten Endstück-Punkten, Vorlagentiefe und Vorlagenring sind keine Schalter mehr.
  `KaefigOptionen` hat zwölf Felder; Tests und Messreihe bitgleich. **Lehre:** Der nächste Schritt wurde aus dem Register
  abgeleitet und als Knopf empfohlen — nie wieder; nach jedem Block Regeln zählen, ab der dritten „Struktur prüfen“, strukturelle
  Ursachen bekommen keine Regel. Nächster Schritt: P2 „Stücknetz im Maulfeld“ (Prüfplan, Recherche 21.10. Abschnitt 2 und 6).
- **2026-11-03 (nachts): P2 Tag 1 „Linien → Stücke“ gebaut** (Florian: „… und starte P2 (Stücknetz im Maulfeld)“; Abnahme offen;
  Planseite „P2 — Start, Tag 1“ im Prüfplan, Register „Befunde aus P2 Tag 1“, Übergabe). Kern `kern/einsatz/stuecke.ts` (eigener
  Schritt neben dem eingefrorenen Kernring, am Bau nichts geändert): Linien in der Karte → Stücke (Flächen des Liniengraphen) →
  Ecken nach drei Regeln ohne Körper oder Lage: Zusammenstöße verschiedener Linien (nicht Lippe → Verlängerung am Mundwinkel);
  **der Feldrand hat keine Ecken** (Treppe auf dem Käfiggitter, je Stück gerade Seite, Stufen = Fünfer-/Dreierpole wie außen
  vorgegeben); **Biegungen** gezeichneter Linien in der Tangentialebene (ab 45° Gesamtdrehung: Innenseite Ecke, Außenseite ein
  Schnitt als Geodäte durch den Knick bis zur nächsten Linie). Zehn Fälle: Dreiecke je ein Stück, 2–5 Seiten, keine konkave Ecke,
  Mundwinkel glatt, Feldkanten und Pole stimmen; J = Viereck vorn, Viereck unten mit Hakenecke, Zweieck hinter dem Haken.
  Verworfen (gemessen): Winkelecken auf dem Feldrand (5–17 Seiten), Gitterecken als Stückecken, „kürzerer Arm“, Wahl nach Luft.
  Tests `stuecke.test.ts` 4 grün, Bild `docs/progress/editor/p2-stuecke-2026-11-03.jpg`. Nächster Schritt Tag 2 (Ganzzahlen).
- **2026-11-04: P2 Tag 2–4 „Ganzzahlen, Muster, Käfig, Haut“ gebaut** (Florian: „ja zieh durch“; Abnahme offen; Planseite „P2 —
  Stand Tag 2–4“ im Prüfplan, Register „Befunde aus P2 Tag 2–4“, Übergabe). Kern `kern/einsatz/muster.ts` (kanonische Seiten, die
  Schlitzufer sind eine Seite; Ganzzahlen: Feldrand fest, Dichte, Polygonungleichung, Parität; Muster Dreieck/Fünfeck mit Mittelpol,
  Viereck als Gitter, sonst eine Teilung) und `kern/einsatz/stuecknetz.ts` (Tutte je Stück auf ein Vieleck mit den Eckwinkeln des
  Stücks, Käfig mit Spiegel und Lippenfalte, Übergabe an Lippe, Löser und Messung des Kernrings — unverändert). **Biegungen sind
  keine Ecken** (gemessen; Tag 1 hat zwei Regeln). K2: alle zehn Fälle bauen, Lippe ≤ 0,26 px, Haut ≤ 0,25 px 9 von 10, Mundwinkel
  ≤ A0 + 2° 8 von 10, Flächen ein Drittel des Kernrings, 4 Pole je Feld; zwei Fälle falten je eine bis zwei Zellen von 1 px² neben
  der Lippe (Vieleck mit geraden Seiten → formtreues Abflachen als Weg); Budget ≤ 300 hält auf K2 nicht, auf K1 fällt die
  Genauigkeit (Entscheidung Florian). Bogen `docs/progress/editor/p2-stuecknetz-2026-11-04.jpg`, Tests `stuecknetz.test.ts`.
- **2026-11-04: P2 Tag 5 „Formtreue Lage, Lippe am Kontrollpolygon, ganze Reihe“ gebaut** (Florian: „Ja, mach das formtreue
  Abflachen gegen die zwei Falten, dann die ganze Reihe.“; Abnahme offen; Planseite „P2 — Stand Tag 5“, Register „Befunde aus P2
  Tag 5“, Übergabe). LSCM je Stück gebaut, aber nicht der Hebel (Faltenstücke nicht konvex → Rückfall aufs Vieleck; Option bleibt).
  Gemessene Ursache: Reihen hingen an Abtastpunkten, der Käfig trägt das Kontrollpolygon der Lippe (1,2 px am Haken, 2,8 px am
  Mundwinkel) → Lippe (A6) vor der Lage, Reihen am Kontrollpolygon; Stationen nach Dichte auf der Linie (h, √(6ε/κ), Merkmalsgröße
  mit Keil < 45°, Boden h/4), Untergrenze der Lippen-Kantenzahl. Zehn Fälle: Lippe 0,02–0,13 px, Mundwinkel 10 von 10, Haut 8,
  Knick 7; **ganze Reihe** (`stuecknetz.extrem.ts`): 43 von 43 bauen, Mundwinkel 43 von 43, Haut-Tor 32 von 43 (Kernring 41).
  Offen: Knicke 3,7–7,6° auf glatten Körpern, Rex mittel gerade 32°, Robbe-Keil 0,44–0,62 px, Robbe hoch J (Pol im Hals des Hakens;
  Weg Schnitt am Hals + Muster für das ungleiche Viereck). Verworfen: γ = 4-Parameter (m verdoppelt), gleichmäßiges Verdichten.
  Keine neue Regel mit Körper oder Lage. P2 ist nach fünf Tagen am Ende → Bilanz und Florians Entscheidung.
- **2026-11-04: P2 — Bilanz nach fünf Tagen** (Florian: „Schreib die P2-Bilanz nach Prüfplan und leg mir die Entscheidung vor.“;
  Planseite „P2 — Bilanz nach fünf Tagen“, Übergabe). Formal trifft das Abbruchkriterium (Haut-Tor 32 von 43 gegen 41); Prinzip
  bewiesen (43 von 43 bauen, Mundwinkel 43 von 43, Lippe 0,02–0,13 px, ⅓ Flächen, zwei Regeln + drei Maße statt 20 Schaltern),
  Genauigkeit nicht (Knicke 4–8° auf glatten Körpern, Robbe-Keil/Hals, Rex-Falte), Budget auf K2 für beide unerreichbar, auf K1
  Stücknetz 236–704 Flächen mit 0,18–0,25 px an runden Körpern (Kernring 0,4–5,6). Vorlage: B zwei Tage Strukturarbeit mit Tor
  ≥ 41 von 43 (Empfehlung), A Kernring bleibt, Budget getrennt. **Entscheidung bei Florian; bis dahin nichts bauen.**
- **2026-11-04: Option B, Tag 1 — Tor erreicht** (Florian: „Option B … Tor Haut ≥ 41 von 43, sonst A.“; Planseite „P2 — Tag 6“,
  Register „Befunde aus P2 Tag 6“, Übergabe). Gemessen: der Knick auf glatten Körpern entsteht am Dreierpol erst im Löser (Start
  2,3–2,8°, gelöst 3,7–7,6°) → Glätte 0,1 statt 0,001 als Vorgabe des Stücknetzes (Startkäfig liegt auf A0); die Robbe hat eine
  Spitze von A0 (Nase) auf der Naht, deren Schärfe um 1 px sprang → Spitzen auf der Naht sind Knoten der Nahtlinie. **Ganze Reihe
  41 von 43 wie der Kernring, dieselben zwei offenen Fälle** (Rex mittel gerade 0,27 px, Robbe hoch J Falte). Keine Fallregel.
  Nächster Schritt nach Florians Wort: Tag 2 (Schnitt an Engstellen + Paare) oder Ersatz des Kernrings.
- **2026-11-04 mittags: Käfig-Arbeit angehalten.** Florian (maximal verunsichert) holte in der Session „3D mesh workflow
  simplification“ eine Zweitmeinung: Seine Vision ist „Form zuerst“ — die Ansichten zeigen dasselbe Netz (keine Widersprüche),
  so rund wie möglich, Loops mit Dicke = Härte, so viele Polygone wie nötig, fürs Spiel backen. Die Wurzel unserer Regelflut:
  Käfig als einzige Wahrheit (13.10.) und Käfig = Spielnetz (02.11.) → Topologie vor der Form. Alle vier Käfig-Wege sind dieselbe
  Reihenfolge; das Stücknetz ist nur die eleganteste Lösung innerhalb davon. Beweis „Form zuerst“ (drei Tage, eigener Arbeitsbaum)
  läuft dort; Kriterien und Messinstrumente von hier geschickt (Übergabe). **Hier nichts weiterbauen, bis der Beweis entschieden
  ist.** Lehre: „Der Käfig ist die Wahrheit“ war eine Entscheidung ohne Test; Florians Sculptris-Frage (16.10.) wurde mit
  Argumenten statt Messung abgewiesen.
- **2026-11-04 (danach): Plan „Beweis Form zuerst“ zur Freigabe** ([`docs/plans/2026-11-04-beweis-form-zuerst.md`](docs/plans/2026-11-04-beweis-form-zuerst.md),
  Branch `claude/form-zuerst`, Arbeitsbaum `.claude/worktrees/form-zuerst`). Acht Bausteine: Sichthülle als Grenze, Umrisse
  als Berührkurven (Umrissplan), Linien ins Netz schneiden, „so rund wie möglich“ (FiberMesh), Härte = Kopplung über die Linie,
  Teile als eigene Körper weich vereinigt, Backen auf ≤ 8 000 Dreiecke, **Ansichten = Outlines des Modells per Shader**
  (Florians Idee; ab Tag 1 im Editor, verdeckte Fortsetzungen blass von selbst, ersetzt die Umrissberechnung für die Anzeige
  ≈ 1 500 Zeilen). Sechs Tage mit den Toren der Käfig-Session (gemessen an
  den Fehlfällen des Käfigs, nicht an Kugel und Ei), Regeltabelle, Abbruch bei Regeln, die einen Körper oder eine Lage nennen.
  Gebaut wird erst nach Florians Ja.
- **2026-11-04 (abends): „Form zuerst“ zum Anfassen, ohne Planseite und ohne Tore** (Florian: „Ja, fang so an: Seite zeichnen
  und sofort eine runde Form sehen, ohne Planseite und ohne Tore. Zeig es mir, sobald es geht.“ Die Planseite vom Mittag ist
  damit beiseitegelegt; der nächste Schritt kommt aus Florians Blick). Gebaut: kleines Fenster `apps/editor/form.html`
  (`src/form/main.ts`; Start aus dem Arbeitsbaum: `EDITOR_WEB=1 pnpm --filter @ee/editor exec vite --port 5193`, dann
  `/form.html`). Seite: Punkte wie Vektoren (glatt oder Ecke per Doppelklick/⌥, Klick auf die Linie setzt einen Punkt, ⌫, ⌘Z),
  Front, Top und 3D zeigen dasselbe Modell, ihre Umrisse zeichnet ein Shader (Rückseiten mit fester Pixelbreite). Kern
  `packages/shape/src/dicht/` (`@ee/shape/dicht`): Körper = Vereinigung der größten Kugeln im Seitenumriss (schrumpfende Kugel
  je Umrisspunkt, g = maxᵢ(Rᵢ² − |p − cᵢ|²), Fläche z² = g), Surface Nets auf einem in z spiegelgleichen Raster, Punkte auf die
  weiteste Kugel projiziert, Normalen der Kugel; Kreis → Kugel (0,03 von 100), Streifen → runde Röhre, keine Topologie vorab.
  Grob beim Ziehen ≈ 15 ms (7–9 k Dreiecke), fein beim Loslassen 0,15–0,35 s (47–60 k). Fallen: Kugelradien ohne Toleranz
  schrumpfen an jeder Polygonecke auf null; „Kugel des nächsten Umrisspunkts“ statt Vereinigung gibt Kerben, wo die Kugelgröße
  wechselt; der Outline-Schub braucht das Kippen aus der Blicknormalen (Clip-Länge hat keine Pixelbedeutung) und einen
  Polygon-Versatz statt `clip.z`; Punkte nie beim Drücken neu zeichnen und auf `dblclick` hoffen (Klicks selbst zählen).
  Bilder `docs/progress/editor/form-zuerst-{langhals,ei}-2026-11-04.jpg` (`scripts/pruefen/form-bild.mjs`).
- **2026-11-04 (abends, danach): Linien auf der Form werden Kanten** (Florian: „Fühlt sich gut an. Weiter: Ich zeichne eine
  Linie auf die Form, und dort wird eine Kante, deren Strichdicke die Härte ist.“). Im Fenster: auf der Form ziehen zeichnet
  eine Linie (Freihand → wenige Punkte, Ramer–Douglas–Peucker), Linie anklicken wählt sie (Punkte ziehbar, Doppelklick Ecke),
  `+`/`−` oder `0`–`3` setzen die Strichdicke (auch je Punkt), ⌫ löscht, ⌘Z. Kern `dicht/kanten.ts`: die Linie bleibt auf der
  Fläche, links und rechts wird die Form in einer Zone von 1,2 Kugelradien flacher (Profil t (1 − t)², Knick an der Linie
  ≈ 16° je Seite bei 3 px), Härte = Tiefe und Rundung des Knicks, 0 px = weiche Linie ohne Kante (gestrichelt), Enden laufen aus;
  Normalen genau aus der Steigung des Profils. Front, Top und 3D zeichnen die Linien als Bänder mit Pixelbreite je Probe
  (sichtbar schwarz, verdeckt blass, weich gestrichelt). Fallen: Das Profil darf keine Rinne neben dem Grat machen (Neigung
  ≤ Zone / 4R) — sonst dreht sich die Fläche kurz von der Kamera weg und der Umriss-Shader zeichnet Kratzer; Netznormalen in der
  Zone rauschen auf Rastergröße (zackige Farbstufen), deshalb Normalen aus dem Profil und zwei Mittelungen über die Nachbarn;
  Vite merkt sich einen Importfehler einer Datei, die erst danach angelegt wird (Server neu starten). Offen: Die restlichen
  feinen Stufen der Farbbänder kommen vom Toon-Material auf Eckennormalen (Sache des echten Looks). Bilder
  `docs/progress/editor/form-zuerst-kanten-{ei,langhals}-2026-11-04.jpg`.
- **2026-11-04 (abends, danach): Linien bleiben an Ort und Stelle, die Form wächst zu ihnen** (Florian: „momentan wandern beim
  Verziehen der Seitenform die eingezeichneten Linien mit … ich habe es mir so vorgestellt, dass diese immer genau an Ort und
  Stelle bleiben … oben bildet sich dann ein Kranz oder eine Wulst, z. B. für Augenbrauen“; „Die Härte ist dann wie in Blender
  Edge Crease und macht einen richtigen Knick. Ohne Härte ist es eine runde Wulst.“). Eine Linie merkt sich den Umriss beim
  Zeichnen (`KantenLinie.bezug`) und liegt fest auf dessen Körper; zieht Florian den Umriss unter sie, spannt sich die Haut von
  der Linie zum Körper (konvexe Hülle je Kugel unter dem Punkt, Kugel geglättet und durch den Punkt gelegt), innen ebenso eine
  Rinne. Strich 3 px = Knick an der Linie (Kuppe nur ≈ eine Rasterzelle rund), 0 px = runde Kuppe vom Radius der Höhe (höchstens
  halbe Körperdicke); spiegelgleich über eine weiche Faltung an der Mittelebene. Rasterweite in 4-%-Stufen, damit der Körper
  der Linie dort genau dem heutigen gleicht, wo sich der Umriss nicht geändert hat. Gemessen (Kugel, Scheitel unter die Linie):
  Knick hart 105°, weich ≤ 10°; in der Seite höchstens 0,5 (hart) bzw. 1,8 px (weich) über der Linie; Front-Umriss glatt;
  Zug 32–36 ms, Loslassen 0,5–0,6 s. Fallen: Normalverschiebung mit breitem Abfall schob Umrisspunkte seitlich hinaus
  (Lappen); die Kugel unter der Linie wechselt an Mulden des Umrisses (Streifen); eine geglättete Kugel, die nicht durch den
  Punkt geht, hebt ihn um seinen Abstand zu weit; das Auslaufen der Härte an den Enden machte die Kuppe dort riesig — die Kuppe
  folgt der gesetzten Strichdicke; Steigungen aus dem Maximum vieler Kegel springen → Normalen dort aus der Fläche. Bilder
  `docs/progress/editor/form-zuerst-wulst-{hart,weich}-2026-11-04.jpg` (`scripts/pruefen/form-zug.mjs`).
- **2026-11-04 (abends, danach): Front und Top als Griffe auf dasselbe Modell** (Florian: „Linien passen so. Weiter: Front und
  Top als Griffe auf dasselbe Modell.“). Front und Top sind halbe Profile, spiegelgleich, über der Ausdehnung der Seite
  (`BreitenPunkt`: längs 0…1, quer = halbe Breite); unberührt folgen sie dem Körper (höchstens 6 Punkte auf dem Shader-Umriss,
  `profilAusBreite`), der erste Griff übernimmt sie. Der runde Körper wird nach den Linien in der Tiefe gestreckt,
  z → a(x) · b(y) · z (`dicht/ansichten.ts`: abwechselnd über die breiteste Stelle je Zeile/Spalte angepasst, Catmull-Rom,
  Normalen über die inverse transponierte Ableitung); die Seite bleibt, wie sie ist. Front und Top teilen die größte Breite:
  ändert sie sich in einem Blatt, folgt im anderen nur der breiteste Punkt. Punkte bleiben zwischen ihren Nachbarn, die Enden
  auf der Achse fest; Doppelklick Ecke, ⌫. Gemessen: nur Front oder nur Top ≤ 3 Einheiten, beide zusammen bis 3,3 (Grenze der
  Streckung a · b, als leichte Doppellinie sichtbar); Zug 14–16 ms, Loslassen 0,16 s. Falle: Ein gezogener Punkt, der über
  seinen Nachbarn rutscht, faltet das Profil — die Schleife wird über die ganze Höhe eine Kante im Körper. Bild
  `docs/progress/editor/form-zuerst-front-top-2026-11-04.jpg` (`scripts/pruefen/form-ansichten.mjs`).
- **2026-11-04 (abends, danach): Linien in allen drei Ansichten, jede Ansicht gelockt** (Florian: „Kannst du die Linienkanten
  auch von der Top- und Frontansicht bearbeitbar machen? … wenn ich sie seitlich nach oben bewege, rutscht sie an der
  Topansicht zur Mitte. Sie soll aber nur in der Seitenansicht bewegt werden. … Immer die Ansicht locken … Dadurch kann ich
  schöne Kanten und Wülste erstellen.“). Ein Linienpunkt hat, sobald er gezogen wurde, seine eigene Tiefe (`KantenPunkt.z`, vor
  der Streckung durch Front/Top); die Seite bewegt nur x/y, die Front y/z, das Top x/z. Ungezogene Punkte liegen auf dem
  Körper; dazwischen folgt die Linie dem Körper plus dem Versatz der Punkte (Hermite, an Ecken mit Knick). Verlässt ein Punkt
  die Form, wächst sie zu ihm (Haut wie bei der Wulst). In Front und Top: Linie anklicken (Trefferband beider Seiten), Punkte
  der gewählten Linie ziehen, Doppelklick Ecke, Strichdicke und ⌫ wie in der Seite. Kern liefert `linienZ` (Tiefe je Punkt) und
  die Streckung `tiefe`; das Fenster rechnet damit zwischen den Ansichten (`streckungBei`). Gemessen: Seite hoch → z bleibt
  137,6; Front → nur z; Top → nur x. Bild `docs/progress/editor/form-zuerst-linien-ansichten-2026-11-04.jpg`
  (`scripts/pruefen/form-linien-ansichten.mjs`).
- **2026-11-04 (nachts): Alle Ansichten gleichwertig — Beweis** (Florian: „Ja, beweise die Regel zuerst: außen Kugel, vier
  Beine, Seitenflossen, Lappen; dann eine innere Kontur … Ohne Teile, ohne Sonderregeln, mit Bildern.“; Alarm davor: keine Röhre,
  keine Teile, „das Mesh passt sich intelligent an“). Kern `dicht/gleich.ts` (`formAusAnsichten`), Prüffälle
  `dicht/prueffaelle.ts`, Test `gleich.test.ts`; im Fenster `?fall=kugel|beine|flossen|lappen|innen` (Zeichnung türkis unter
  dem schwarzen Umriss des Modells). Regel: Jede gezeichnete Fläche jeder Ansicht bekommt ihre größten Kreise; jeder Kreis wird
  ein Ellipsoid — in seiner Ansicht genau der Kreis, in der Tiefe höchstens so tief wie breit (Kugel) und nur so flach, wie
  die beiden anderen Ansichten verlangen (jede Sehne längs der Tiefe in der Zeichnung, von der Mitte nach außen dem
  anschließenden Abschnitt folgend), in der Tiefe dort, wo es am rundesten Platz hat (Gleichstand: Mitte, für die Seite die
  Mittelebene); Körper = Vereinigung, gespiegelt; Surface Nets, Punkte auf das weitest reichende Ellipsoid. Ohne Front/Top
  ist es genau der runde Körper der Seite. Innere Konturen: Flächen einer Ansicht in Zeichenreihenfolge (die spätere liegt
  obenauf); eine Kontur in einer früheren Fläche ist sichtbar → ihre Ellipsoide kommen zuletzt, nehmen in den anderen Ansichten
  den vordersten Abschnitt und liegen vor dem, was steht. Ergebnis: Kugel auf 0,5 von 150 genau; vier runde Beine (Radius 25,0
  in allen Richtungen) aus Seite + Front, flache Flossen aus Top + Front, Lappen aus einer Kerbe; alle Umrisse ≤ 1,6 Einheiten
  (spitze gezeichnete Ecken rundet das Raster um gut eine Zelle); fein 0,7–1,2 s. Innere Kontur: das nahe Bein liegt vorn, das
  ferne dahinter, aber wo Front/Top dem Oberschenkel kaum Platz vor dem Rumpf lassen, wird er dünn (kleine Umriss-Kratzer).
  Verworfen (gemessen): Glätten des Netzes (Taubin mit Umriss-Halt; Bild gleich, Kugel schlechter), „vorderst möglich“ für
  innere Konturen (Rumpf musste dahinter weichen → Risse). Fallen: Die nächste Zeile der Schnitt-Tabelle nahe einer Spitze lag
  bis eine Viertelzelle daneben und drückte die Kugel um 7 Einheiten ein → zwischen zwei Zeilen linear; gespiegelte Abschnitte je
  Sehne nicht mal so, mal so wählen (nur z ≥ 0); geglättete Kreisradien an Ecken nachprüfen (ragten über den Umriss);
  Prüfzeichnungen müssen zueinander passen (ein Oval aus vier Punkten wölbt sich über seine Punkte, Front und Top aus der
  gemessenen Ausdehnung bauen). Bilder `docs/progress/editor/form-gleich-{kugel,beine,flossen,lappen,innen}-2026-11-04.jpg`
  (`scripts/pruefen/form-gleich-bild.mjs`). Front und Top sind im Fenster in diesem Modus nur Anzeige (noch nicht zeichenbar).
- **2026-11-04 (nachts, danach): Front und Top zeichenbar wie die Seite** (Florian: „Mach Front und Top im Fenster zeichenbar wie
  die Seite (geschlossene Umrisse, gespiegelt), damit ich Beine und Flossen selbst ziehen kann.“). Front und Top sind halbe
  Umrisse auf der Seite z ≥ 0 (Front rechts, Top unten; Anfang und Ende auf der Mittelachse, sie gleiten nur auf ihr), gespiegelt
  geschlossen (`ganzerUmriss` im Kern); Punkt ziehen, Klick auf die Linie setzt einen Punkt (auch auf der Spiegelhälfte), Doppelklick
  Ecke, ⌫, ⌘Z wie in der Seite; die Spiegelhälfte leiser. Unberührt folgt eine Ansicht dem Körper, der erste Griff übernimmt sie.
  Bau: nur die Seite → der runde Körper samt Linien wie bisher; Front oder Top gezeichnet → alle Ansichten gleichwertig
  (`formAusAnsichten`), die nicht gezeichnete folgt dem runden Körper aus Seite und gezeichneter Ansicht (Breite je Stelle).
  Kopplung: Zieht Florian einen Punkt, der in seiner Ansicht ganz außen liegt, folgt in der anderen deren äußerster Punkt — nur
  wenn es dort genau einen gibt (Höhe Seite ↔ Front, Länge Seite ↔ Top, Breite Front ↔ Top). Kern schneller: Ellipsoide, die in
  einem größeren liegen, fallen weg (Kugel 300 → 1), Zug 32–51 ms, Loslassen 0,2–0,75 s. Gemessen mit der Maus aus der
  Startkugel (`scripts/pruefen/form-beine-ziehen.mjs`): zwei Beine in der Seite, eines in der Front → vier runde Beine, nichts
  dazwischen; Seite oben höher → Front folgt (150 → 190); Top und Front nach außen → Flossen bis 253 (gezeichnet 250); Linien
  unverändert (Seite → z bleibt 137,6). Offen: Linien formen den Körper noch nicht, sobald Front oder Top gezeichnet sind; mehrere
  Flächen je Ansicht (innere Konturen) nur über `?fall=innen` zum Ansehen. Fallen: Die Kopplung „äußerster Punkt folgt“ zog bei
  vier gleich tiefen Füßen ein Bein hoch (deshalb nur bei genau einem); eine Ansicht, die dem Körper folgt, hat ihren untersten
  Punkt auf der Mittelachse bei den Füßen der Seite — beim Übernehmen erst hinauf an den Bauch ziehen, sonst steht dort ein
  fünftes Bein. Bilder `docs/progress/editor/form-{beine,flossen}-ziehen-2026-11-04.jpg`.
- **2026-11-04 (nachmittags): Probe „Linien aus dem Netz“** (Florian: „… weicht stark von der Outline ab, was eigentlich nicht
  passieren sollte, da jede Ansicht und Outline das echte Mesh zeigt. Ist es sogar möglich, die Linien und Kanten ganz gegen
  Shader auszutauschen …? Kannst du das mal auf die Probe stellen und recherchieren und mir eine ehrliche Prognose geben …“).
  Befund: widersprüchliche Ansichten → Schnittmenge (sein Kopf reicht in der Seite über die gezeichnete Front, die großen
  Kreise fallen weg, Seite 41 Einheiten neben dem Mesh). Gebaut hinter `form.html?netz`: alle Umrisse vom Shader (auch die
  Seite), seine Punkte sind Griffe darauf; die bearbeitete Ansicht führt (`GleichOptionen.fuehrend`: Ansichten ohne Platz für
  einen Kreis reden bei ihm nicht mit, ohne Führung bitgleich), die anderen werden dem Mesh nachgeführt (`dicht/silhouette.ts`:
  echter Umriss = Rand der Vereinigung der projizierten Ellipsen; `dicht/folgen.ts`: Punkte bleiben bitgleich, wo ihr Stück auf
  dem Umriss liegt, sonst neue Punkte gierig + ausgedünnt, Ecken des Umrisses werden Ecken; die Kopplung äußerster Punkte ist mit
  `?netz` aus). Mit der Maus gemessen: Seite 40,9 → 1,5, alle Ansichten danach ≤ 3,2 Einheiten (Zelle 4,76); Flosse im Top: Seite
  bitgleich, Front 4 neue Punkte; 5 Runden ohne Änderung bitgleich, ohne Führung neu gebaut dasselbe. Kanten: Der Shader zeichnet
  sie, findet weiche aber nicht (≤ 10° gegen 105° bei 3 px) → bleiben gespeicherte Linien. Offen: Kerben der Vereinigung (weiche
  Vereinigung), eckige Füße werden rund, Kanten in gleichwertigen Ansichten samt Treffpunkten, Griffe auf inneren Linien, Lage der
  automatischen Punkte (Geschmack), Nachführen ohne Beschleunigung (Loslassen 1,3–1,5 s beim großen Vierbeiner). Bericht
  [`docs/research/2026-11-04-linien-aus-dem-netz.md`](docs/research/2026-11-04-linien-aus-dem-netz.md), Bilder
  `docs/progress/editor/form-netz-*-2026-11-04.jpg`, Prüfungen `scripts/pruefen/form-netz-probe.mjs` (Maus im Fenster),
  `form-netzlinien.ts` (Kern), Test `dicht/folgen.test.ts`. Fallen: Abstände Linie ↔ Umriss nie zu Probenpunkten messen (auf
  langen Stücken liegen die Proben bis zur halben Probenweite auseinander → falsche Läufe, 53 neue Punkte statt 0), sondern zur
  dicht abgetasteten Linie (`kurvenLinie`); Marching Squares mit dem Inneren links, jeden Fall einzeln herleiten; je Runde nur
  einen Lauf ersetzen (danach gelten die Nummern nicht mehr).
- **2026-11-04 (abends): Florians Modell und die Probe dazu (`form.html?linien`)** (Florian nach `?netz`: „… die echten
  Bearbeitungspunkte sollten auf den weichen bzw. harten Kanten liegen … Es geht irgendwie wieder darum, aus drei Formen eine
  Form zu erzwingen“; nachgestellt: selbst die führende Front blieb 66 Einheiten neben dem Mesh → drei gezeichnete Flächen sind
  der falsche Ausgangspunkt; dann: „Bau eine Probe nach meinem Modell …“).
  - **Das Modell:** eine Form, Linien auf ihr als Griffe, der Umriss nur Shader.
  - **Volumen:** Die Seite legt es an wie bisher.
  - **Umriss anfassen:** In Front oder Top wird die Linie, wo die Form von dort am breitesten ist, eine Raumlinie mit wenigen
    Punkten (Kugel: 3).
  - **Raumlinien:** Punkte im Raum; die Seite bewegt x/y, die Front y/z, das Top x/z. Gespeichert ist die Hälfte z ≥ 0, die
    Enden liegen auf dem Umriss der Seite und gehen mit ihm.
  - **Knoten:** Kreuzungen in der Seite werden gemeinsame Punkte.
  - **Form:** z = s(x, y) · √g. An den Linien ist s = z / √g, dazwischen ein nach Abstand gewichtetes Mittel, das zwischen
    den Linienwerten bleibt.
  - **Code:** `dicht/raumlinien.ts`; Option `raumlinien` in `rundAusSeite` (Kern), `Tiefenstreckung.feld` für die Streckung je
    Rasterpunkt (bikubisch, Normalen über die inverse transponierte Ableitung), `DichtesNetz.kontur` (wo am breitesten, Tiefe je
    Stelle).
  - **Mit der Maus gemessen:** Kugel → Ellipsoid (Front 150 → 210, Seite bleibt); Top vorn schmaler mit Knoten; Seite höher,
    die Linien bleiben; Birne in der Front über die Spiegelhälfte; ⌘Z exakt; Bau ≈ 150 ms.
  - **Verworfen (gemessen):** dünne Platte (Überschwingen an Spitzen auf das Doppelte, Kippen quer zu einer Achse); Strecken je
    Kugel (Startkugel nur gleichmäßig, keine Birne); 16 Punkte je angelegter Linie (ein Zug machte eine Spitze).
  - **Offen:** Volumen aus Front/Top zeichnen, Linien über den Seitenumriss hinaus (die Seite ist noch keine Linie wie die
    anderen), Härte der Raumlinien als Kante, rundere Füllung zwischen weit entfernten Linien (Front-Linie allein: schmaler
    Buckel im Top), kleine Nasen am Umriss.
  - **Bericht und Prüfung:** Nachträge in `docs/research/2026-11-04-linien-aus-dem-netz.md`, Bilder
    `docs/progress/editor/form-linien-*-2026-11-04.jpg`, Prüfung `scripts/pruefen/form-linien-probe.mjs`, Test
    `dicht/raumlinien.test.ts`.
  - **Fallen:**
    - Wer auf der Spiegelhälfte zieht, braucht den Betrag der Tiefe (mit `max(0, q)` kniff der Punkt die Form bei z = 0 ein).
    - Enden einer angelegten Linie nicht eine feste Zelle weiter setzen, sondern aus z² verlängern; sonst braucht ein Kreis acht
      statt drei Punkte.
    - Ein gewichtetes Mittel braucht zusammengefasste Proben je Zelle; doppelte Proben verschieben die Gewichte.
  - **Florians Urteil:** „der Ansatz ist nicht schlecht“, braucht viel Feintuning; Kopf und Bauch müssen im Top getrennt greifbar
    sein. Heute springt die angelegte Linie am Hals durch die Luft, weil sie je Stelle die breiteste Stelle der ganzen Form
    nimmt (daher auch die Lappen im Top); richtig wäre die örtlich breiteste Stelle des angefassten Stücks. Noch nicht gebaut.
- **2026-11-04 (nachts): Maul in der neuen Form — Probe** (Florian: „Ja, probier das Maul in der neuen Form: Maullinie in der
  Seite auf die Form zeichnen, dort aufschneiden, mit einem Regler öffnen.“; davor die Empfehlung: das Maul vor dem Feintuning,
  weil der schwerste Fall die Richtung entscheidet; der Käfig-Einsatz passt nicht in die dichte Form und bleibt eingefroren).
  - **Bedienung** (alle Modi des Fensters): In der Seite von außen über den Umriss in die Form ziehen = Maullinie (Anfang auf
    dem Umriss, gleitet mit ihm; Ende = Mundwinkel). Linie anklicken zeigt ihre Punkte (ziehen, Doppelklick Ecke, ⌫). Regler
    „Maul öffnen“ im 3D-Blatt (0–55°, nur Ansicht, kein Neubau); offen zeigt auch die Seite den Umriss des Modells, die
    Zeichnung türkis, die Unterlippe leiser daneben.
  - **Kern `dicht/maul.ts`** (`maulSchneiden`, `maulOeffnen`, `maulPunkt`): Das fertige Netz wird längs der Fläche
    aufgeschnitten, die die Linie in der Tiefe überstreicht. Kanten, die die Linie in der Seite kreuzen, werden geteilt (je
    Kreuzung zwei Punkte, der Mundwinkel ein Punkt je Seite); vorn läuft der Schnitt gerade über den Umriss hinaus und
    verbindet rechts und links. Lippen genau auf der Linie, geschlossen ist der Körper unverändert.
  - **Maulinneres:** Gaumen und Boden als Gewölbe in ihren Kiefer (40 % der Kieferdicke, in der Tiefe so breit, wie der Körper
    an der Stelle ist), am Mundwinkel treffen sie sich; Farbe dunkelrot.
  - **Öffnen:** Drehung um den Mundwinkel in der Seite (z bleibt). Gewicht = Winkel, unter dem der Punkt die Linie sieht (springt
    genau über der Linie, Übergang über 135° hinter und unter dem Mundwinkel) × Reichweite nach dem Abstand von der Unterlippe
    längs der Form (Dijkstra auf dem Tiefenraster, nie über die Linie, Lücken umgehend; Übergang von der Kieferdicke am
    Mundwinkel bis zum 1,5-Fachen). Normalen über die inverse transponierte Jacobi-Matrix. Ohne Kontur (alle Ansichten
    gleichwertig) wird das Tiefenraster aus dem Netz gerastert.
  - **Gemessen** (Test `dicht/maul.test.ts`, Maus `scripts/pruefen/form-maul-probe.mjs`): Lippen ≤ 0,001 neben der Linie; offen
    sind Körper und Inneres zusammen dicht, 0 umgeklappte Dreiecke bei 20/40/55°; Unterkiefer starr (≤ 0,001), Oberkiefer steht
    (0); Langhals: Brust jenseits der Lücke 0,000 bewegt; Schnitt 25 ms grob, 39 ms fein; Öffnen ohne Neubau.
  - **Verworfen (gemessen):** Übergang hinter dem Mundwinkel über 90° (bei 55° auf 8 % gestaucht, 20 umgeklappt); Reichweite
    nach dem Abstand zum Mundwinkel (die Brust unter dem Kopf drehte mit); Kieferdicke senkrecht unter dem Mundwinkel gemessen
    (trifft eine Lücke an ihrer Spitze nicht: 280 statt 37); Übergang im Kiefer selbst (588 umgeklappt).
  - **Offen:** Bei großem Winkel staucht sich die Kehle hinter dem Mundwinkel sichtbar. Ein Bein oder eine Brust direkt unter
    dem Mundwinkel verdreht sich am Ansatz; ein möglicher Weg ist eine Kinnlinie als Griff, die festlegt, wo der Unterkiefer
    endet. Von der Seite sieht man durch das offene Maul. Lippen ohne Rundung. Getrennte Kiefer (Über-/Unterbiss), Zähne,
    Posen und Backen fürs Spiel fehlen noch.
  - **Fallen:**
    - Gewölbetiefe nie in Rasterschritten messen: Das zeichnete Sägezähne in die Farbstufen. Bis zum Rand halbieren und längs
      glätten.
    - Das Abstandsfeld muss über den Umriss hinaus stetig sein; sonst mitteln Punkte am Umriss innen und außen, und das gab
      Falten. Jeder Rasterpunkt außen bekommt deshalb den Wert des nächsten innen.
    - Das Abstandsfeld braucht 16 Nachbarn: 8 verzerren bis 8 %, und über den Hebel zum Mundwinkel wird daraus eine Falte.
  - Bilder `docs/progress/editor/form-maul-{kugel-zu,kugel-offen,kopf-offen,langhals-offen,vierbeiner-offen}-2026-11-04.jpg`.
- **2026-11-04 (spätabends): Aufklärung und Backen — Probe.** Florian: „Machen wir das Feintuning hier? Ich dachte, hier geht es
  nur darum, Beweise für die Methode zu finden … Ist es hier schon Beweis genug … Kläre mich erst auf und prüfe dann das Backen.“
  Seine Sicht: Maul und Grundformen „wirken viel eleganter gelöst“; noch nicht passend: Griffe, Ansichten, die Übersetzung der
  schwarzen Linien und Punkte, die genaue Definition der Werkzeuge.
  - **Aufklärung (Stand):** Hier wird nicht feingetunt; jeder Schritt war eine Probe. Zwei Fragen waren in den letzten Tagen
    vermischt:
    - A) **Wie entsteht die Form (Methode)?** Mit „Form zuerst“ weitgehend bewiesen: Grundform, Beine und Flossen ohne Teile,
      Kanten mit Härte, Maul, jetzt auch das Backen. Offen ist noch die Pose am ganzen Körper.
    - B) **Wie wird bearbeitet (Bedienung)?** Offen: Griffe, Ansichten, Werkzeuge. `?netz` und `?linien` waren Erkundungen,
      keine Beweise.
    Der Käfig wollte A und B zugleich über eine feste Netzstruktur lösen (daher die Regelflut).
  - **Vorgeschlagene Reihenfolge:** Backen (erledigt) → kurze Probe Posen → Entscheidung „Form zuerst“ als Grundlage, Käfig
    archivieren → Bedienung als kurzes Dokument mit Florian festlegen, bevor gebaut wird → schrittweise in den echten Editor.
  - **Backen (`dicht/backen.ts`, `backen`, `maulBacken`):** Kantenkollaps nach dem Quadrikenfehler (meshoptimizer 1.1.1, MIT,
    lag über `@types/three` schon im Lockfile, jetzt Abhängigkeit von `@ee/shape`). Es bleiben Punkte der dichten Form stehen,
    gebacken wird nur eine neue Dreiecksliste; Normalen, Drehgewicht des Mauls und später Posen gelten deshalb unverändert.
    Mit Maul wird bei 30° Öffnung gebacken: Haut und Maulinneres treffen sich an den Lippen als Naht, und der Ausdünner nimmt
    beide Seiten gleich mit.
  - **Im Fenster:** Schalter „Spielnetz“ im 3D-Blatt (Drahtgitter, Dreiecke, Abweichung in px bei 300 px Höhe). Gebacken wird
    beim genauen Bau, beim Ziehen zeigt das Fenster die dichte Form.
  - **Gemessen** (Maus `scripts/pruefen/form-backen-probe.mjs`, Test in `maul.test.ts`):
    - Kugel, Kopf, Langhals und Vierbeiner mit Maul von 53 700–72 900 auf 8 000 Dreiecke, rund 4 100 Punkte.
    - Abweichung 0,2–0,6 px bei 300 px Höhe, Backen 35–40 ms.
    - Offen sind Körper und Inneres dicht (jede Kante zwei Dreiecke).
    - Umgeklappt: Kopf 0; Kugel 1 bei 30° und 5 bei 55° (Lippe, Kehle); Langhals 2.
    - Vierbeiner bei 40°: 162 umgeklappt am Ansatz des Vorderbeins. Die dichte Form hat dort bei gleicher Öffnung 396, das
      Umklappen kommt also von der Drehung (Bein direkt unter dem Mundwinkel), nicht vom Backen.
  - **Verworfen (gemessen):**
    - Geschlossen backen: Ober- und Unterlippe lagen aufeinander und wurden als eine Naht zugenäht (vier Kanten mit mehr als
      zwei Dreiecken).
    - Lippen festhalten: Der Ausdünner zog Punkte auf sie und ließ Splitterdreiecke längs der Lippe.
  - **Offen:** Posen am ganzen Körper; das Vorderbein unter dem Mundwinkel (Kinnlinie oder Drehgewicht neu); Maße fürs Spiel
    auf dem iPhone (Bildrate mit 36 Wesen) nicht gemessen; Look (Muster, Zonen) auf dem Spielnetz noch nicht.
  - Bilder `docs/progress/editor/form-backen-{kugel,kopf,langhals,vierbeiner}-offen-2026-11-04.jpg`.
- **2026-11-04 (nachts): Posen, getrennte Kiefer, mehrere Maulpunkte — Proben** (Florian vor dem Schlafen: „Mache alle nötigen
  Tests und Proben … selbstständig und selbstkritisch … Verfalle dabei nicht in endlose Testreihen und vermeide weitere
  Sonderregelungen … Teste auch bitte die getrennten Kiefer und die Bearbeitung mehrerer Maulpunkte“; vorher die Frage nach
  Bézier-Griffen).
  - **Bézier-Griffe:** grundsätzlich kein Problem. Der Kern liest nur abgetastete Kurven; betroffen sind Bedienung und Speichern
    (≈ ein Tag), der alte Editor hat sie schon. Die Griffe bleiben vorerst, wie sie sind.
  - **Posen** (`dicht/pose.ts`; im Fenster Schalter „Pose“, Regler Maul und Kopf, Pinsel in Seite, Front, Top und durch das offene
    Maul aufs Innere, Größe mit `[ ]`):
    - Eine Pose ist Unterkiefer und Schädel in Grad plus die Züge des Blendshapes (Mitte, Verschiebung, Radius; spiegelgleich).
      Erst der Blendshape, dann die Knochen.
    - Sie hängt am Raum, nicht an Punktnummern: Sie gilt nach einer Änderung der Grundform weiter und auf dem Spielnetz.
    - Mit der Maus gemessen (`scripts/pruefen/form-pose-probe.mjs`): Knochen 0 Umklapper; Pinsel 3–4 ms je Mausbewegung ohne
      Bild (der Testbrowser ohne Grafikkarte braucht ≈ 90 ms je Bild); ⌘Z je Strich und je Reglergriff; „Pose aus“ zeigt die
      Grundform bitgleich; nach einer Änderung der Grundform dicht; Spielnetz mit Pose dicht und ohne Umklapper.
  - **Gefunden und behoben:**
    - Ein Zug am Gelenk riss die Naht hinter dem Mundwinkel auf (24–28 offene Kanten). Dort liegen Gaumen und Boden auf der
      Gelenkachse; der Zug schob sie von ihr weg, dann drehten beide um die alte Achse in entgegengesetzte Richtungen. Jetzt
      drehen die Knochen um die Achse, wie der Blendshape sie verschoben hat (je Punkt auf seiner Tiefe). Test in
      `pose.test.ts`; die Gegenprobe mit fester Achse fällt durch.
    - Ein Pinselstrich ins offene Maul traf nichts; jetzt trifft er das Innere.
    - Ein neu geladener Körper ließ „Pose“ an (jeder Druck wurde ein Pinselstrich).
  - **Getrennte Kiefer** (`MaulLinie.kurz`; im Fenster eine zweite Linie von außen zum selben Mundwinkel, gestrichelt):
    - Die zweite Linie liegt im längeren Kiefer. Der kürzere ist der auf der anderen Seite der Maullinie, wie im alten Editor
      „Unterkiefer geschlossen in den Oberkiefer geschoben“: über dem Schlitz Überbiss, darunter Unterbiss.
    - Seine Lippe rückt vom Schlitz auf ihre Linie (gleicher Bogenanteil, am Mundwinkel nicht). Sie nimmt die Tiefe der Form an
      der neuen Stelle an, vorn 15 % schmaler, so steckt sie geschlossen verdeckt im längeren Kiefer.
    - Die Haut seiner Seite rückt mit, längs der Form auslaufend, und gleitet dabei auf der Form (in der Seite hält eine weiche
      Wand am Umriss). Das Innere rückt mit demselben Feld. Die Knochengewichte bleiben die von vor dem Rücken.
    - Gemessen: Überbiss und Unterbiss, Maullinie gerade, als S und als J, Kugel, Kopf und Langhals — geschlossen, offen (20/40°)
      und in der Pose dicht, 0 Umklapper (Fenster `form-kiefer-probe.mjs` und Tests in `maul.test.ts`). Der kürzere Kiefer ist in
      der Front sichtbar schmaler.
  - **Mehrere Maulpunkte:** gewählte Maullinie anklicken = neuer Punkt (gleich ziehen), ⇧-Klick wählt mehrere, die zusammen
    gezogen werden, ⌫ löscht Punkte bzw. die zweite Linie (Kiefer wieder gleich). Gemessen: zwei Punkte genau um dieselbe
    Strecke, der Mundwinkel bleibt; mit S-Form und zweiter Linie dicht, 0 Umklapper.
  - **Verworfen (gemessen):**
    - Welcher Kiefer kürzer ist, nach der Seite des Anfangs der zweiten Linie: Eine Linie, die weit unter dem Schlitzanfang
      beginnt, schob die Front des Kiefers aus der Form.
    - Die Tiefe aus dem Verhältnis gemittelter √g-Rasterwerte: rauschte am Umriss und kippte Normalen. Jetzt wird g gemittelt,
      dazu kleinere Schritte der Differenzen am Umriss.
    - Nur die nächste Stelle der Maullinie: riss die Haut hinter den Bögen einer S-Linie auf.
    - Mittelung über alle Proben der Linie: reichte hinter den Mundwinkel und an den Enden über die Lippe. Jetzt nah an der
      Linie die nächste Stelle, weiter weg ein geglättetes Rasterfeld.
    - Das Innere Spalte für Spalte mit der Lippe rücken: Die Spalten kreuzten sich an Bögen.
  - **Offen (ehrlich):**
    - Vierbeiner mit dem Vorderbein direkt unter dem Mundwinkel: 396 Umklapper bei 40° am Ansatz. Kommt vom Drehgewicht des
      Unterkiefers, nicht von Posen; Weg Kinnlinie oder Drehgewicht neu.
    - Nachtrag zum Maul: Auf dem feinen Netz (≈ 58 000 Dreiecke) mit gerader Linie klappen bei 55° 12 Dreiecke am unteren Pol
      um, auch ohne zweite Linie (50°: 0).
    - Pinselzüge nahe der Lippe klappen im Maulinneren einzelne Splitter um (unter 1 Einheit², unsichtbar).
    - Kehle staucht bei großem Winkel. Der Pinsel kann nur ziehen (noch kein Glätten oder Aufblasen).
    - Eine zweite Linie, die weit vom Schlitzanfang am Umriss beginnt, schiebt die Front des Kiefers (die Wand hält sie in der
      Form, natürlich wirkt es nicht): am besten am Anfang der Maullinie beginnen.
  - Prüfungen `scripts/pruefen/form-pose-probe.mjs`, `form-kiefer-probe.mjs`; Tests `dicht/pose.test.ts`, `dicht/maul.test.ts`
    (34 grün); Bilder `docs/progress/editor/form-pose-*-2026-11-04.jpg`, `form-kiefer-*-2026-11-04.jpg`.
- **2026-11-05: Kiefer trennen — Probe** (Florian: „sieht alles recht gut aus bis auf Über- und Unterbiss. Ich will Ober- bzw.
  Unterkiefer wirklich separat bearbeiten können … deutlich länger oder breiter … Platz für riesige Vampirzähne oder Hauer, die
  nicht durch die Lippe durchstoßen, sondern genau in der Lücke liegen“; wie im alten Editor: Lippen erst zusammen, ein Knopf
  trennt).
  - **Bedienung:** Knopf „Kiefer trennen“ im 3D-Blatt. Die Maullinie wird die Oberlippe (rot), die Unterlippe (blau) eine eigene
    Linie, zuerst an derselben Stelle und 0,85 so breit. Kiefer wählen mit Ober/Unter oder per Klick auf die Lippe; die Seite zieht
    die Lage der Punkte, Front und Top ihre Breite (nach außen breiter, nach innen schmaler). Der Anfang gleitet auf dem Umriss,
    der Mundwinkel gehört beiden. „Kiefer zusammen“ (oder ⌫ auf der Unterlippe) ist bitgleich zum Maul vor dem Trennen.
  - **Kern** (`dicht/maul.ts`): `MaulLinie.unten`, `MaulPunkt.b` (Breite gegen die Form; monoton kubisch durch die Punkte, am
    Mundwinkel 1, der Anfang nimmt die des zweiten Punkts). Geschnitten wird an der Oberlippe; jeder Kiefer folgt seiner Lippe
    (`kieferFolgen`): die Lage in der Seite mit Auslauf 3 × Verschiebung (der gezeichnete Umriss bleibt), die Breite über den ganzen
    Kiefer (so weit, wie er am Mundwinkel dick ist). `MaulSchnitt.unten`, `.tiefe`; ersetzt `kurz` (zweite Linie im längeren Kiefer).
  - **Gemessen** (Maus, `scripts/pruefen/form-kiefer-trennen.mjs`): Breiten wie gezogen (oben 1,24, unten 0,67 → zwischen den Lippen
    42–70 Einheiten Platz an der Kugel mit Radius 150, am Kopf 32–51); offen dicht, 0 umgeklappt geschlossen und bis 55°; Unterkiefer
    kürzer (Anfang 33 Einheiten zurück) 10 Splitter unter 1 Einheit²; Bau fein 0,44–0,76 s (zusammen 0,31 s).
  - **Fallen:** Die Wand am Umriss muss am neuen Ort messen. An der alten Stelle gemessen glitt die Haut an runden Umrissen um τ²κ/2
    hinaus (bis 773 Punkte draußen), zurückgedrückt falteten die steilen Dreiecke am Rand. Und sie darf Punkte, die bleiben, nie
    berühren (Band relativ zum Abstand). Gleiten längs des Umrisses (Bogenlänge) faltete in der Überblendung zum Geradeaus
    (gemessen, verworfen). Punkte einer gewählten Lippe über den Umrisspunkten zeichnen (ihr Anfang liegt oft auf einem). Die
    Regler der Pose legen Rückgängig-Schritte an.
  - **Offen:** ein Kiefer sehr viel kürzer (Anfang 78 Einheiten zurück) lässt am Rand 2 Dreiecke umklappen; im S-Fall auf feinem
    Netz klappt 1 Dreieck im Maulinneren um (älter, unabhängig vom Auslauf); eine Oberlippe breiter als die Form macht an der Kugel
    einen Wulst (in der Front „Ohren“). Zähne fehlen noch.
  - Bilder `docs/progress/editor/form-trennen-*-2026-11-05.jpg`.
- **2026-11-05 (vormittags): Echte Trennung — Kieferanfänge als Punkte des Umrisses, zwei Schnitte (Probe)** (Florian: „man soll die
  einzelnen Kiefer wirklich frei verschieben können, nicht nur entlang der Konturlinie … Es soll eine echte Trennung sein. Wo Kiefer
  und Outline sich treffen, entsteht ein echter Punkt, die Kiefer sind dann echter Teil der Outline“).
  - **Bedienung:** Der Anfang jeder Lippe ist ein Punkt des Umrisses (`UmrissPunkt.lippe`, getrennt rot/blau), frei zu ziehen (Seite
    x/y, Front die Höhe, Top die Länge); der Umriss geht mit. Zusammen ein Punkt, getrennt zwei nebeneinander, dazwischen ein gerades
    Stück (die Front des Mauls, leise gestrichelt, keine neuen Punkte darauf). Ein neuer Maulanfang rastet auf einen Umrisspunkt in
    6 px ein. Getrennt behalten beide Punkte die Richtung der Linie beim Trennen (`UmrissPunkt.richtung`).
  - **Kern** (`dicht/kiefer.ts`, Hilfen `maulGrund.ts`): geschnitten an beiden Lippen, dazwischen die Linse (Unterlippe unter der
    Oberlippe = Lücke, fällt weg; darüber = Überdeckung, gehört beiden Kiefern). Kreuzen sich die Sehnen in einem Dreieck, liegt ein
    Kreuzpunkt in beiden Wegen; Stücke werden gegen die Sehnen im Dreieck eingeordnet (gegen die Kurven fehlte ein hauchdünnes Stück).
    Eine Lippe schneidet erst, wo sie ¼ Rasterweite tief in der Form liegt; ihr Winkel für das Drehgewicht läuft gegen die Linie
    hinaus, an einer einspringenden Ecke oder gekürzt längs der Außennormale.
  - **Allgemein:** Richtung durch einen Umrisspunkt nach den Abständen (Parabel durch drei Punkte; ein Punkt dicht neben einem anderen
    lag mit „Nachbar zu Nachbar“ bis 26 Einheiten neben dem Kreis). Kugelradien nach dem Glätten noch einmal schrumpfen (an einer
    einspringenden Ecke ragten sie 27 Einheiten über den Umriss, das Raster schnitt die Form auf). Backen mit den Knochengewichten
    (ein großes Dreieck über dem Übergang klappte in der Pose um).
  - **Gemessen:** Kern 42 Tests grün (Überbiss, Lücke, breit, S, J, kürzer, darüber; freie Anfänge: Oberkiefer vor, Lücke vorn,
    Unterbiss; „getrennt, aber gleich“ öffnet wie zusammen). Maus (`form-kiefer-trennen.mjs`): freie Anfänge dicht, 0 umgeklappt bis
    40°. **Ungelöst:** Überdeckung durch gezogene Lippenpunkte 8–16 offene Kanten (kugel-ueberbiss 20–55°, kugel-unterbiss 40°), nach
    einem Zug zweier Punkte 34 umgeklappt geschlossen.
  - **Florians Einwurf:** Ein Über- oder Unterbiss ist dasselbe wie ein Kopf über einem Bauch. Kopf und Bauch (und die Kiefer)
    brauchen in der Top-Ansicht je einen eigenen Umriss, getrennt bearbeitbar, die nicht verschmelzen; der vorstehende Kiefer „fest“
    mit eigenem Umriss von oben wie beim Langhals. Ursache: Der Körper ist die Vereinigung der Kugeln eines einzigen Seitenumrisses,
    das Maul nur ein Schnitt darin; Lappen, die sich berühren, verschmelzen, und das gerade Stück zwischen den Anfängen schließt den
    Unterkiefer. Nächster Schritt nach Florians Wort: Teile.
  - Bilder `docs/progress/editor/form-kiefer-frei-*-2026-11-05.jpg`.
- **2026-11-05 (mittags): Teile — Probe 1 „Kopf über Bauch“** (Konzept `docs/plans/2026-11-05-teile-konzept.md`; Florian: „Teile
  entstehen von selbst an Einbuchtungen, oder nur, wenn du eine Naht ziehst. Das würde ich beides gerne testen … Härte kommt von der
  Naht“; kein fester Käfig, es bleibt „Form zuerst“).
  - **Bedienung** (Leiste in der Seite): „Teile von selbst“ an, dann wird eine Einbuchtung beim Loslassen ein eigenes Teil, wenn sie
    „ab“-mal so tief wie breit ist (Regler 0,3–3, daneben die tiefste noch ungeteilte; der Regler teilt beim Loslassen sofort). „Naht
    ziehen“: ein Strich quer durch die Form teilt sie. Jedes Teil hat in Seite, Front und Top seinen eigenen Umriss mit eigenen
    Punkten (ziehen, einfügen, Doppelklick Ecke, ⌫); verdeckte Stücke blass gestrichelt und greifbar; sichtbare Umrisse in Front und
    Top zeichnet der Shader (auch den Kopf vor dem Körper). ⌘Z nimmt Zug und Teilung in einem Schritt zurück. Mit Teilen noch kein
    Maul und keine Linien (wirken im Bau aus Teilen noch nicht).
  - **Kern** (`dicht/teile.ts`, `formAusTeilen` in `gleich.ts`): Einbuchtung = Tasche gegen die Hülle; die Naht ist die kürzeste
    Sehne von der Spitze quer durch die Form. Liegt ein gesetzter Punkt (fast) so tief wie die Spitze, ist er die Spitze. Jedes Teil
    ist ein Bogen des alten Umrisses; am Gegenpunkt läuft es am alten Umriss weiter und schließt gerade durch das andere Teil (keine
    Rille). An der Spitze enden beide als Ecke, die zu ihrer Flanke die alte Richtung behält (`UmrissPunkt.naht`; die Linie bleibt dort
    bitgleich, die geteilte Einbuchtung teilt nicht noch einmal). Jedes Teil wird aus seinen eigenen Umrissen gebaut, alle
    Ellipsoide zusammen ein Netz (harte Vereinigung).
  - **Gemessen** (Maus `scripts/pruefen/form-teile-probe.mjs`, Tests `dicht/teile.test.ts`, Kern 44 grün): Kopf über Bauch teilt
    beim Loslassen, dicht, 0 umgeklappt; der Kopf im Top schmaler gezogen ändert nur den Kopf; Kopf auf den Bauch gezogen bleibt ein
    eigener Lappen (Falte statt Verschmelzen); ⌘Z bitgleich; Zug ≈ 28 ms statt 10 ms (Front/Top der Teile gemerkt je Zeichnung).
  - **Offen (ehrlich):** Eine Naht quer durch eine runde Form (Kugel) gibt zwei Teile, die fast die ganze Form decken: Damit an der
    Naht keine Rille entsteht, muss jedes Teil etwa eine Körperdicke über die Naht reichen. Ein Teil dort schmaler zu ziehen ändert
    deshalb kaum etwas (der andere deckt es). Weg: Härte an der Naht (weich = die Tiefe läuft über die Naht weiter, dann reicht ein
    schmaler Saum); Florians Entscheidung. Berührt ein Teil die Haut eines anderen, gibt die harte Vereinigung Berührstellen (Kopf auf
    Bauch: 6 Kanten mit 4 Dreiecken, mit schmalem Kopf 4 umgeklappt) und dunkle Kerben in engen Falten; auch dafür die weiche Naht.
  - Fallen: Die Fortsetzung an der Spitze die andere Flanke entlang behält die Einbuchtung im Teil (bei kleiner Schwelle teilte es
    noch einmal); ein Hilfspunkt neben der Spitze mit der alten Richtung beulte den Bogen (Deckung verfehlt) — die Ecke mit Richtung
    ersetzt ihn. Abgeleitete Umrisse (≤ 6 Punkte) liegen bis einige Pixel neben dem Shader: sichtbar nicht zeichnen (Doppellinien).
  - Bilder `docs/progress/editor/form-teile-*-2026-11-05.jpg`.
- **2026-11-05 (nachmittags): Teile in `?linien`** (Florian nach seinem Test: „Ich kann es nicht nachstellen … beim Ziehen entstehen die
  Linien ganz woanders … wirkt sehr instabil. Warum sind wir jetzt nicht mehr bei ?linien?“ — Antwort: meine Entscheidung ohne ihn zu
  fragen; seine Bohne hatte eine Einbuchtung 0,1 bei Schwelle 1,0, geteilt wurde nur beim Loslassen; im normalen Fenster verlängern
  Front/Top die Form nicht über die Seite. Dann: „Ja, bau die Teile in ?linien ein: eigener Seitenumriss und eigene Linien je Teil, im
  Top und in der Front die Linie je Teil, Naht schon beim Ziehen sichtbar, Naht von Hand bleibt.“).
  - **Bedienung** (`form.html?linien`, auch im normalen Fenster): Beim Ziehen eines Umrisspunkts zeigt die Seite die Naht türkis
    gestrichelt, sobald die Einbuchtung die Schwelle erreicht; beim Loslassen wird geteilt. Schwelle jetzt 0,5 (Regler 0,2–3). In Front
    und Top fasst ein Druck auf den Umriss die Linie des nächsten Teils (auch verdeckt, dort gestrichelt); die neue Linie gehört diesem
    Teil und formt nur es. Beim Teilen gehen die Linien zum Teil, in dem sie überwiegend liegen; Knoten zwischen Teilen lösen sich.
  - **Kern** (`rundAusTeilen` in `dicht/rund.ts`): jedes Teil der runde Körper seiner Seite, gestreckt durch seine Linien (sₖ · √gₖ),
    auf einem gemeinsamen Raster; zusammen die größte Tiefe (Tiefe² = max sₖ² gₖ), vernetzt wird die gestreckte Fläche; jeder Punkt
    auf das Teil, das an seiner Stelle am tiefsten ist (vor dessen Streckung auf seine Kugel, dann gestreckt); `konturen` je Teil.
    `rundAusSeite` unverändert (Vernetzung, Kugelprojektion und Ausrichtung herausgezogen, gegen die alte Fassung bitgleich geprüft).
  - **Gemessen** (Maus `scripts/pruefen/form-teile-linien.mjs`, Kern 46 Tests grün): Naht beim Ziehen sichtbar, Teilung beim
    Loslassen; Kopf im Top 48,4 → 41,5 schmaler, Bauch 100,6 → 117,5 breiter, das andere Teil je unverändert; ⌘Z zurück ohne Linien;
    Zug mit Teilen 1,9 ms Zeichnen + 8,9 ms grober Bau; das normale Fenster wie vorher (gleiche Zahlen).
  - **Offen:** In der Kehle zwischen Teilen 2 doppelt belegte Kanten (zwei Punkte auf derselben Stelle), mit schmalem Kopf zeitweise 2
    umgeklappte Dreiecke; die Naht durch eine runde Form deckt in `?linien` ebenso fast alles; ein einzelner weit gezogener Linienpunkt
    gibt eine Spitze (Linien allgemein, nicht Teile); Maul und Kantenlinien mit Teilen noch nicht. Weg für Kehle und runde Naht: Härte
    an der Naht.
  - Bilder `docs/progress/editor/form-teile-linien-*-2026-11-05.jpg`.
- **2026-11-05 (abends): Florians Klarstellung zu Outlines und Edgeloops** (wörtlich in `docs/plans/2026-10-22-klarstellungen.md`,
  Nachricht 2): Teile sind keine gute Lösung. Outlines sind keine Grifflinien mehr; Griffe sind die Netzpunkte, die sich aus dem
  Startumriss und den gezeichneten Linien und Kanten ergeben, wie bei einem 3D-Modell. Edgeloops sind Werkzeug und später
  Leitlinien der Topologie. Kein Verschmelzen zum Donut: ein Ende steckt im anderen (auch bei getrennten Kiefern), alles ein Netz.
  Alle Ansichten gleichwertig, Bézier-Griffe. Einschätzung: Mit dem heutigen Bau (Volumen bei jeder Änderung neu aus dem Umriss)
  geht das nicht, ein Volumen verschmilzt bei Berührung immer. Nötig: Nach dem Start ist das Netz die Wahrheit, Linien und Loops
  verformen es (wie FiberMesh, Nealen u. a. 2007). Startform, Maulschnitt, Posen und Backen bleiben. Florians Entscheidung offen.
- **2026-11-05 (abends, danach): Beweis „Kurven als Wahrheit“** (Florian nach Nachricht 3: „Startumriss als erster Loop mit
  Bézier-Punkten, Loops um Kopf und Bauch, im Top schmaler ohne Höhenverlust, Einflusskreis wie O, Kopf in den Bauch ohne
  Verschmelzen, Umrisse glatt, Tempo messen“). Eigenes Fenster `apps/editor/kurven.html` (`src/form/kurven.ts`, `?form=kugel|bohne`).
  - **Modell:** Die Haut ist ein festes dichtes Netz (einmal aus dem Startumriss, `rundAusSeite`, ≈ 7–9 k Dreiecke); bearbeitet werden
    nur Kurven auf ihr. Kurve 0 ist der Startumriss (Bézier-Punkte, Griffe automatisch rund oder gezogen), Loops sind die Hälfte
    z ≥ 0 eines Rings (Schnitt quer über den Körper, L in der Seite, wenige Punkte), ihre Enden liegen auf dem Startumriss und gehen
    mit ihm. Der Umriss ist in allen Ansichten nur Shader.
  - **Kern `dicht/kurven.ts`:** `HautLoeser` = Laplace in Normalgleichungen (biharmonisch), je Punkt die Lage beim Anlegen (mit der
    Normale gedreht, mit der Kante gestreckt) plus die Kurven als Bindungen (baryzentrisch, Verschiebung seit dem Anlegen).
    Gelöst wird nur im **Einflussbereich** (`einflussBereich`: so weit wie O bzw. so weit, wie die gezogenen Punkte von ihren
    Nachbarn entfernt sind, um die Stücke, die sich ändern); außerhalb bleibt jeder Punkt bitgleich. Je Zug neu angelegt (Bezug =
    Stand davor). O: `einfluss` wie Blender „glatt“. Proben auf der Mittelebene hängen an beiden Hälften (`Haut.spiegel`).
  - **Gemessen** (Maus `scripts/pruefen/form-kurven-probe.mjs`, Tests `dicht/kurven.test.ts`): Loop schneiden ändert die Haut nicht
    (0); Kopf-Loop im Top auf 60 %: Kopf 48,5 → 30,3 tief, Höhe unten 1,9 höher (2 %), Bauch bitgleich; O (Radius 90): Nachbarn
    gehen anteilig mit, ⌘Z bitgleich; Bézier-Griff gezogen 0 umgeklappt; Kopf in den Bauch (5 Punkte gewählt, 50 nach unten): ein
    Netz, kein Verschmelzen, 38–40 Dreiecke in der zugedrückten Kerbe umgeklappt (innen), außerhalb des Bereichs 0. Tempo: örtlich
    1–3,3 ms je Mausbewegung, Zerlegen 1–11 ms je Zug (Bereich 600–1750 Punkte); ganze Kugel (4 Punkte, Bereich = alles) 12 ms je
    Bewegung, 120–160 ms Zerlegen beim Greifen. Spiegelgleich auf 10⁻⁸.
  - **Verworfen (gemessen):** Krümmung zwischen den Kurven nach FiberMesh nachführen (schaukelt sich auf dem Netz aus Surface Nets
    auf), Krümmung allein ohne die Verteilung in der Fläche (Kugel fällt zusammen), ganze Haut ohne Bereich lösen (Kopf 50 runter →
    Rücken 6–8 Einheiten anders, 20–30 geglitten), Krümmung mit Kante² strecken (höher gezogene Kugel 150 → 186 tief).
  - **Offen:** Höher ziehen macht noch etwas tiefer (Kugel oben +60: Tiefe 162–166 bei Breite 153; ein affiner Bezug je Punkt würde
    das trennen, ungetestet); keine Punkte einfügen/löschen, Loops nur in der Seite schneiden, keine Härte (Kanten) und keine Kiefer
    in diesem Fenster; Netzauflösung fest.
  - Fallen: Eine Bindung auf der Mittelebene an nur einem Dreieck macht den Körper beim Ziehen schief (Gegenprobe 0,7 Einheiten);
    schief **wirkende** Front kann die Schattierung sein (erst `__kurven.symmetrie()` messen); vitest-Logs nur mit `--reporter=verbose`.
    Bilder `docs/progress/editor/form-kurven-*-2026-11-05.jpg`.
- **2026-11-05 (nachts): Schritt 1 „Nur Loops“** (Florian nach drei Fragen: „Kugel ohne Loops, Loops schneiden in allen drei
  Ansichten, geschlossene Formen zeichnen, auf jeder Linie Punkte setzen und löschen wie in Illustrator, Kreuzungen als automatische
  Punkte, ganzen Loop wählen und mit G/S/R und O formen. Härte danach.“; seine Regeln: keine offenen Linien, Brauen = Loop ums Auge
  oben hart, Mund = Loop; Griffe entstehen an Kreuzungen oder als gesetzte Punkte). `kurven.html` ist jetzt dieses Fenster (der
  Beweis davor steht in bb0c837d).
  - **Kern `dicht/loops.ts`:** Ein Loop sind Proben auf der Haut (Dreieck + baryzentrisch), `mitte` (Mittelebene), `ring` (Hälfte z ≥ 0,
    Enden auf der Mitte), `paar` (eine Seite, Spiegelzwilling). `loopAusSchnitt`: Ebene durch die gezogene Linie und die Blickrichtung,
    Schnitt durch Ablaufen der Dreiecke (`schnittLinien`); Seite immer Ring, Front/Top nah an der Mitte = `mitte`, quer über die Mitte
    = Ring (Ebene spiegelgleich gemacht), sonst `paar`; von mehreren Schnittlinien die nächste zur Linie, dann die vorderste.
    `formAusZeichnung`: geschlossene Form per Strahl auf die vorderste Haut, über die Mitte gezeichnet ein Ring. `kreuzungenZwischen`
    (nächste Punkte der Strecken). `verschiebungLaengs`: Punkte verschieben den Loop zwischen ihren Nachbarn (Hermite längs s; ein Punkt
    auf einem geschlossenen Loop bewegt ihn ganz; Ringenden spiegelgleich). `LoopZug`/`festlegen`: Bindungen samt Spiegel, nach jedem
    Zug Ruhe = Lagen auf der Haut. Löser verallgemeinert: `HautZiele` (Ziele je Bindung), `HautLoeser` darüber; neu die Drehung um die
    Normale je Punkt (2D-Procrustes der Nachbarn).
  - **Fenster:** L schneidet (in allen Ansichten), F zeichnet eine Form (Freihand → wenige Punkte, Ramer–Douglas–Peucker), Punkt oder
    Linie anklicken (⇧ mehrere) und ziehen, Doppelklick auf eine Linie = Punkt (Klicks selbst gezählt), ⌫ löscht eigene Punkte bzw.
    Loops (Kreuzungen nicht), G/S/R modal mit X/Y/Z, O mit [ ], ⌘Z. Einflussbereich je Zug aus den Proben, die sich bewegen.
  - **Gemessen** (Maus `scripts/pruefen/form-kurven-probe.mjs`, Tests `dicht/loops.test.ts`): drei Schnitte → Ring, Ring, Mitte mit
    5 Kreuzungen (6 mit Spiegel), Haut unverändert; Kreuzung vorn im Top 150 → 100: Tiefe 100,1, Höhe und Länge 150,2 bleiben,
    spiegelgleich, 0 umgeklappt, 11–15 ms je Mausbewegung (Bereich fast die ganze Kugel, Zerlegen 113–130 ms); Form ums Auge mit 4
    Punkten, Doppelklick 4 → 5, ⌫ → 4, Haut unverändert; Mitte als Ganzes auf 1,2 in der Höhe → Ei 180 hoch, Tiefe bleibt 150 (die
    anderen Loops halten sie); O (80) oben 40 hoch: 0 umgeklappt; ⌘Z bis zum Anfang bitgleich.
  - **Offen (ehrlich):** Ohne O wirkt ein ganzer Loop nur auf die Haut um ihn: S ×1,3 drückt den Ring daneben zusammen (Wulst), R 30°
    klappt 22 Dreiecke um (vorher 34, mit der Drehung um die Normale). Mit O weich (0 bzw. 2), dafür gehen Loops in der Nähe mit wie in
    Blender. Keine Härte, keine Bézier-Griffe an Punkten (Punkte verschieben, Form zwischen ihnen glatt), Kreuzungen nur beim
    Entstehen und nach Zügen gesucht, Netz fest (keine örtliche Verdichtung). Bilder `docs/progress/editor/form-loops-*-2026-11-05.jpg`.
- **2026-11-05 (nachts, danach): Härte, Loops als Kanten im Netz** (Florian: „Weiter mit der Härte: Härte je Punkt entlang des Loops,
  Braue als Augen-Form oben hart und hochgezogen.“).
  - **Bedienung:** Punkte oder ganze Loops wählen, Taste 0–3 setzt die Härte, + / − ändern um 0,5; zwischen den Punkten läuft sie
    linear längs des Loops (`haerteBei`). Harte Stücke sind schwarz, so breit wie die Härte (Blätter und 3D).
  - **Befund zuerst:** Gewichte über die Linie allein wirken nicht (hart und weich 0,6 Einheiten auseinander), solange die Linie nur
    auf Dreiecken liegt: Mehrere Proben je Dreieck halten einen Streifen Dreiecke fest, darin kann nichts knicken.
  - **Kern `dicht/einsetzen.ts` (`loopEinsetzen`):** Jeder neue Loop wird eine Kette von Kanten: über die Dreiecke abgelaufen,
    je gekreuzte Kante ein neuer Punkt, jedes Dreieck dreigeteilt (Viereck an der kürzeren Diagonale, spiegelgleiche Vierecke mit
    Mittelpunkt, sonst wird das Netz schief), der Ring als ganzer Ring, das Paar samt Zwilling; die Mitte läuft schon über Punkte
    auf z = 0 (die Kugel hat welche, sonst wäre sie nicht spiegelgleich zu triangulieren); andere Loops bekommen die Punkte auf ihren
    geteilten Kanten; danach die Splitter neben der Linie in der Fläche entspannt. Schnittebenen genau durch Netzpunkte werden um
    10⁻³ verschoben.
  - **Härte im Löser:** gerichtete Gewichte (`kantenSchluessel` von → zu): Die Punkte einer harten Linie glätten nur längs, nicht über
    sie hinweg; die Seiten hängen weiter an ihr. **Anzeige wie Auto Smooth:** Netzpunkte auf harten Linien doppelt, je Seite eine
    Normale, nach der Härte gemischt (sonst mittelt die Schattierung über den Knick).
  - **Gemessen** (Tests `loops.test.ts` 6, Maus `scripts/pruefen/form-loops-braue.mjs`): Braue (obere drei Punkte, O 45, 12 nach außen,
    5 hoch) Knick quer über die Linie hart 42,7° gegen weich 29,8°, unten 6–7°; im Bild bricht die Lichtstufe hart an der Linie ab,
    weich läuft sie darüber. Einsetzen spiegelgleich (0 Dreiecke ohne Spiegelbild), Länge bleibt; drei Achsen-Loops, Schmaler, O,
    ⌘Z wie vorher.
  - **Offen (ehrlich):** Der Unterschied hart/weich ist bei dieser Netzdichte (Kante ≈ 6,5 bei Radius 150) mäßig; eine runde Wulst
    ist auch nur 1–2 Zellen breit (örtlich verdichten fehlt). Ein ganzer Loop ohne O gedreht klappt 30 Dreiecke um (vor dem Einsetzen
    22), skaliert 2. Härte ändert eine schon gezogene Form erst beim nächsten Zug. Bilder `docs/progress/editor/form-loops-braue-*`.
- **2026-11-05 (nachts, danach): Bézier-Griffe, Ecke und glatt, Ecke von selbst an harten Kreuzungen** (Florian: „Bau Bézier-Griffe an
  die Punkte (glatt oder Ecke, für den Verlauf der Linie) und lass die Härte als eigene Einstellung; wo ein Loop einen harten kreuzt,
  wird sein Punkt dort automatisch eine Ecke.“).
  - **Bedienung:** Ein gewählter Punkt zeigt seine zwei Griffe (an einer gewählten Kreuzung auch die des anderen Loops). Ein Griff biegt
    nur die zwei Stücke am Punkt, die Punkte bleiben. Glatt ● hält die Griffe gegenüber (der andere dreht mit), an einer Ecke ◆ sind sie
    getrennt. Doppelklick oder ⌥-Klick auf einen Punkt schaltet um (zweimal = wieder automatisch); wird eine Ecke mit Knick glatt, kommen
    ihre Griffe auf die Winkelhalbierende und die Haut folgt. Härte bleibt Taste 0–3.
  - **Kern (`dicht/loops.ts`):** Griffe werden nicht gespeichert, sondern am Verlauf der Linie abgelesen (`griffeBei`): Steigung je Seite
    aus einem kubischen Ausgleichspolynom in s über die Proben bis zum Nachbarpunkt (`steigungSeite`), Länge ⅓ des Abstands. Ein
    Griffzug wirkt mit den Bernstein-Gewichten 3t(1 − t)² bzw. 3t²(1 − t) (`verschiebungLaengs(l, D, griffe)`, `griffZiehen`,
    `griffeAusrichten`); beim Verschieben nimmt eine Ecke die Steigung je Seite vom Nachbarn dieser Seite (sie knickt), glatt wie bisher
    aus beiden. `eckenAuto`: Kreuzung mit einem Loop, der dort Härte > 0 hat → `autoEcke`; von Hand (`ecke`) gilt vor. Härte: Kreuzungen
    ohne eigene Härte sind keine Stützstellen mehr (ein kreuzender Loop unterbrach sonst eine harte Linie), eingefügte Punkte behalten
    die Härte des Verlaufs.
  - **Gemessen** (Tests `loops.test.ts` 11, davon 5 neu; Maus `scripts/pruefen/form-griffe-probe.mjs`): Griff biegt nur sein Stück
    (größter Ausschlag 3,92 von 4 bei t ≈ 0,4); glatter Griffzug 1,2–1,4 ms je Mausbewegung, 12 von 57 Proben bewegt, Knick am Punkt
    1,9°, 0 umgeklappt; Ecke, Griff um 40° gedreht: Knick 36°, 0 umgeklappt; zurück auf glatt 0,1°; ⌘Z bitgleich. Harter Ring mit S ×1,15:
    der Punkt des kreuzenden Rings wird von selbst eine Ecke, der Grat quer über den harten Ring hält an der Kreuzung 14,1° (sonst 13,3°),
    von Hand glatt sackt er dort auf 4,6° (im Nahbild läuft die Lichtkante unter den Ring). Ältere Proben (Loops, Braue) unverändert.
  - **Fallen:** Steigungen einer eingesetzten Linie nie aus wenigen Proben oder mit festem Endpunkt messen: Die Kette ist streckenweise
    eine Sehne durch ein großes Dreieck, ein Punkt mitten darauf liegt 0,3 innen. Differenzen sahen Scheinknicke bis 13°, eine angepasste
    Bézier-Strecke 5–11° (sie kann einen Bogen nicht nach Bogenlänge laufen lassen), das Polynom je Seite ohne den Punkt 0,7–3,2°
    (Zacken des Netzes) → Ausrichten erst ab 4°. Ein Prüfzug, der einen Griff am Punkt vorbei nach hinten dreht, schlägt eine Schleife
    (umgeklappte Dreiecke), wie in Illustrator.
  - **Offen (ehrlich):** Die Blätter haben keinen Zoom; auf kleinen Formen wären die Griffe ≈ 8 px lang, sie werden mindestens 28 px lang
    gezeigt und wirken dann im selben Verhältnis feiner (Hebel). Mit O wirkt ein Zug über Gewichte je Probe, dort spielt die Ecke keine
    Rolle (der kreuzende Loop bleibt rund). Die Ecke am harten Ring gibt der kreuzenden Linie ein Zelt bis zu ihren Nachbarpunkten (weit
    entfernte Nachbarn = flaches Zelt). Bilder `docs/progress/editor/form-griffe-*-2026-11-05.jpg`.
- **2026-11-05 (nachts, danach): Punkte wie in Illustrator, Zoom in den Blättern** (Florian: „Bei den Punkten fällt mir auf, dass sie
  sich noch nicht wie bei Illustrator verhalten. Die Bewegung eines Punktes hat Einfluss über den nächsten Punkt hinaus, dadurch
  entstehen teilweise komische Kanten.“ und „Zoom in den Blättern gerne“).
  - **Ursache:** `verschiebungLaengs` nahm die Steigung an jedem Punkt aus seinen Nachbarn (Catmull-Rom). Ein gezogener Punkt drehte
    damit die Richtung seiner Nachbarpunkte mit, das Stück dahinter bog sich (oberer Punkt 40 hoch: 2,96 Einheiten jenseits der
    Nachbarn, an Kreuzungen gegen den anderen Loop, am Rand des Bereichs abgeschnitten → Knick).
  - **Jetzt:** Die Griffe gehen mit ihrem Punkt (Steigung der Verschiebung 0 an jedem Punkt), ein Punkt ändert nur die zwei Stücke bis
    zu seinen Nachbarn (gemessen 0,00 jenseits). S/R drehen und skalieren die Griffe mit (`griffeAbbilden`: f(p + Griff) − f(p)); über
    die Punkte skaliert wird die Form ums Auge auf 0,03 genau größer (vorher 1,01). Ecken von Hand behalten ihre Griffe; nur Ecken von
    selbst (`istVektorEcke`, Kreuzung mit hartem Loop) nehmen die Sehne zum Nachbarn (wie Blenders „Vector“), damit die Linie dem Grat
    folgt (Grat an der Kreuzung 14,8° gegen 14,6° sonst, glatt 4,4°); fasst man ihren Griff an, wird sie eine Ecke von Hand.
  - **Zoom:** Jedes Blatt hat einen Ausschnitt (Mitte, Zoom 0,25–40); Rad und Pinch zoomen zum Zeiger, zwei Finger und die mittlere
    Taste verschieben, Pos1 zeigt alles, der Kopf zeigt den Zoom („Seite · 182 %“). Kameras, SVG, Hilfslinien und der Haken `bild`
    rechnen mit dem Ausschnitt (Punkte im Blatt gegen die Abbildung 0,00 px); Griffe werden mit wachsendem Zoom echt lang (Faktor 3,5 →
    1,9 bei 182 %). Haken `__kurven.ausschnitt(a, v?)`.
  - **Gemessen** (Tests 13 in `loops.test.ts`, Maus `scripts/pruefen/form-punkte-zoom-probe.mjs`, ältere Proben): obere Kreuzung 40
    hoch → Ring und Mitte jenseits der Nachbarn 0,00, Ei glatt, 0 umgeklappt, spiegelgleich; Braue unverändert (42,7° / 29,8°); in der
    Folge der Loop-Probe dreht die ganze Augen-Form ohne O jetzt 38 statt 30 Dreiecke um (Dreh-Code unverändert, die Haut darunter ist
    nach Schritt 2 anders; Drehen ohne O war schon offen).
  - Bilder `docs/progress/editor/form-punkte-*-2026-11-05.jpg`.
- **2026-11-05 (nachts, danach): Netz verdichtet sich selbst, Bereich wächst mit dem Zug** (Florian mit Bild
  `docs/progress/editor/form-kopf-florian-2026-11-05.png`: „wenn ich jetzt aber einen Kopf rausziehe, habe ich das Gefühl, dieser hat
  kaum Polygone … Sollte das Mesh nicht dynamisch verdichten, dass immer genug Polygone für eine runde Form da sind?“).
  - **Befund:** Das Netz entsteht einmal aus der Kugel (Kante im Mittel 8,6, höchstens 14,4) und wurde danach nur verformt. Ein
    nachgestellter Kopf: Kanten bis 3,8-mal so lang; zwei weite Züge: bis 63,6 lang, 50 umgeschlagene Dreiecke (die dunklen Kratzer).
  - **Kern `dicht/verdichten.ts`:** Kanten länger als 1,75 × mittlere Startkante werden geteilt (längste zuerst, mit Spiegelbild; ein
    Dreieck über der Mittelebene bekommt einen Mittelpunkt). Neue Punkte liegen rund: auf einem Loop nach Catmull–Rom längs der Kette,
    in der Fläche in der Mitte der Kurve nach den Normalen der Enden (wie PN-Dreiecke; an harten Loops die Normale der Seite). Danach
    Kanten drehen zur Wertigkeit 6 (nur wenn kürzer und ohne tiefere Falte) und neue Punkte in der Fläche entspannen. Loops bleiben
    Ketten, ihre Punkte bleiben. Der Löser hält die Haut jetzt genau spiegelgleich (`HautZiele.schritt`; vorher wuchsen
    Rundungsfehler in großen Bereichen bis 10⁻³, dann fand die Spiegelzuordnung Punkte nicht mehr).
  - **Fenster:** verdichtet nach jedem Zug. Weite Züge laufen in Stufen: Reicht der Zug über den halben Bereich, wird der Stand
    festgehalten, verdichtet und mit einem Bereich weitergeführt, der mindestens so weit reicht wie gezogen (wie das Abziehen in
    FiberMesh). Ohne das blieb die Kappe vor einem Ring 44 Einheiten zurück und faltete sich ein. ⌘Z und Esc nehmen den ganzen Zug
    zurück; `?verdichten=0` zum Vergleich.
  - **Gemessen** (Maus `scripts/pruefen/form-verdichten-probe.mjs`, Tests `verdichten.test.ts` 3): Kopf aus einem Ring, zwei weite
    Züge: längste Kante 15,1 (ohne 63,6), umgeschlagen 0 und 12 (ohne 2 und 50), Netz 4 918 → 9 407 Punkte, Verdichten 35–40 ms, eine
    Stufe 73–98 ms, 9–11 ms je Mausbewegung. Im Kern: 95 % der Knicke im Kopf 7,7° → 5,7°, geschlossen, Dreiecke spiegelgleich, Ketten
    heil. Die anderen Proben unverändert; die Augen-Form ×1,3 skaliert: 0 umgeschlagen; ganz gedreht ohne O: 10 (offen).
  - **Verworfen (gemessen):** Kanten drehen ohne Längenprüfung (lange Kanten, ein Knick von 63°); Stufen schon bei Dehnung der Haut
    (18–20 Falten statt 12: Jede Stufe nimmt Ansätze von Falten als neue Ruhe).
  - **Offen:** Die 12 Restfalten entstehen im Löser beim zweiten weiten Zug (der Hals wird längs gedehnt, die Haut hält ihre Krümmung
    mit einem Maß für alle Richtungen fest). Zu kurze Kanten werden noch nicht zusammengelegt (gestauchte Stellen bleiben fein). Große
    Bereiche zerlegen langsamer (ganze Kugel 140–220 ms beim Greifen).
  - Bilder `docs/progress/editor/form-verdichten-{fest,verdichtet}-{seite,3d}-2026-11-05.jpg`.
- **2026-11-05 (nachts, danach): Griffe an Spiegelpunkten** (Florian mit Bild `docs/progress/editor/form-ringende-florian-2026-11-05.png`:
  „Das Handle unten kann ich nicht bewegen. Hier ist immer ein Knick. Auch bei den Spiegelpunkten soll das Handle bewegbar und knickbar
  sein.“).
  - **Ursache:** Am Ende eines Rings (Punkt auf der Mittelebene) gab es nur den Griff nach innen. Glatt hieß dort „senkrecht zur
    Mittelebene“, deshalb ließ der Zug nur die Tiefe zu (im Top senkrecht), seitlich bewegte sich nichts. Ausrichten brauchte zwei
    Griffe und tat dort nichts: Ein geknicktes Ende ließ sich nie glätten. Dazu liegt an der Spitze der Punkt der Mitte obenauf, ein
    Doppelklick traf ihn und nicht das Ende des Rings.
  - **Jetzt (Kern `dicht/loops.ts`, `ringEnde`):** Ein Spiegelpunkt hat zwei Griffe, der zweite ist das Spiegelbild des inneren
    (`griffeBei`, immer wie sie sind). Beide sind frei ziehbar (`griffZiehen`; am Spiegelbild gezogen wirkt der Zug gespiegelt), der
    innere bleibt auf seiner Seite der Mittelebene. Schräg zur Mittelebene knickt die Linie spiegelgleich; das Fenster macht den Punkt
    beim ersten Zug zur Ecke. Glatt ausrichten stellt den Griff senkrecht zur Mittelebene, Länge bleibt (`griffeAusrichten`).
    S/R: das Spiegelbild folgt dem inneren Griff (`griffeAbbilden`).
  - **Fenster:** Doppelklick auf einen Griff schaltet seinen Punkt um (Ecke ↔ glatt), auch an Kreuzungen, an denen der Punkt des
    anderen Loops obenauf liegt.
  - **Gemessen** (Test `loops.test.ts` 14, neu „Spiegelpunkt“; Maus `scripts/pruefen/form-spiegelpunkt-probe.mjs` in Florians Aufbau:
    Ring waagerecht, Mitte, Ring senkrecht, Nase 80 vor): im Top unterer Griff 70 px seitlich, er folgt um 70 px (vorher 0), Knick an
    der Spitze 96,9°, 0 umgeschlagen, spiegelgleich auf 3·10⁻¹⁴, 2,9–6,2 ms je Mausbewegung; oberer (gespiegelter) Griff 40 px, der
    untere geht um 40 px mit, Knick 121°; Doppelklick auf den Griff: glatt, Knick 0,1°; ⌘Z bitgleich. Im Kern: Griff (Länge 157)
    40 seitlich → Knick 28,1° (Soll 28,5°), ausgerichtet 0,0°. Ältere Proben (Griffe, Punkte und Zoom) mit denselben Zahlen.
  - **Offen:** Ausrichten behält die Länge des Griffs: Nach weiten Zügen wird die Spitze glatt, aber stumpf (dann den Griff längs
    kürzen). In der Seite liegen ein senkrechter Griff und sein Spiegelbild genau auf dem Punkt (dort nicht zu greifen, er zeigt in die
    Tiefe). Bilder `docs/progress/editor/form-spiegelpunkt-*-2026-11-05.jpg`.
- **2026-11-05 (nachts, danach): Die Krümmung der Haut folgt den Loops** (Florian mit zwei Bildern: Fischschwanz-Lappen „das mit dem
  Verdichten klappt bei Details noch nicht 100%ig“ (`docs/progress/editor/form-detail-florian-2026-11-05.png`) und ein Boden mit vier
  Höckern „Ich verstehe, dass das Mesh sich immer versucht aufzublasen, aber kann es bei sowas erkennen, dass eine Fläche gefordert
  ist?“ (`form-boden-florian-2026-11-05.webp`)).
  - **Befund (nachgestellt, Höcker 19,8):** Der Löser hielt je Punkt die Krümmung beim Anfassen fest. Werden die Loops um ein Feld
    flach, wölbt es sich weiter wie die Kugel. Dazu das Gedächtnis: Jeder Zug startet vom Stand davor. Im Ablauf „Mittelpunkt hoch
    (die Arme werden S-förmig, die Ecke am Ring behält die Richtung der Kugel), dann die Griffe an den Ecken waagerecht“ blieben die
    Höcker des ersten Zugs stehen (16,6).
  - **Jetzt (`dicht/kruemmung.ts`, Prinzip FiberMesh):** Jeder Loop trägt die Krümmung der Haut an seinen Proben (`Loop.kap`,
    `kapS`; beim ersten Zug an den Nachbarn neben dem Loop gemessen, am Ende jedes Zugs um die Änderung seiner Krümmung längs des
    Loops in Richtung der Normale weitergeschrieben, `LoopZug.kruemmungFestlegen`). Die Felder dazwischen werden in jedem Zug neu
    harmonisch daraus verteilt (`KruemmungsFeld`), am Rand des Bereichs aus der Haut, die bleibt. Ein harter Loop und Punkte mit Ecke
    geben nichts weiter, über sie hinweg fließt nichts; die Messung längs des Loops endet an Ecken. Fenster: `?kruemmung=0` zum
    Vergleich. Doppelklick zählt jetzt die Zeit des Ereignisses (der Löser zerlegt beim ersten Klick).
  - **Gemessen** (Kern `loops.test.ts` „Krümmung folgt den Loops“, Maus `scripts/pruefen/form-boden-probe.mjs`): Florians Ablauf im
    Fenster: tiefster Punkt unter der Ebene 16,55 → **0,25**, 0 umgeschlagen; im Kern in zwei Zügen 2,46 → 0,26. Harter Ring um den
    Äquator ×1,15: Die Kuppe liegt höchstens 2,5 neben dem abgeplatteten Ellipsoid (vorher bis 10,6), der Grat am Rand 14,7° → 8,4°.
    Ältere Proben (Griffe, Punkte und Zoom, Spiegelpunkt, Verdichten) mit denselben Zahlen; Kopf zwei weite Züge 0/14 statt 0/12
    umgeschlagen.
  - **Verworfen (gemessen):** nur die Änderung je Zug (Felder behalten ihr Gedächtnis: Boden 12,8 statt flach); harte Loops sagen jeder
    Seite die Krümmung mit der Normale dieser Seite (schaukelt über die erste Reihe Dreiecke auf, Kuppen zu flach, Grat 27°); Startwert
    an den Punkten des Loops gemessen (die liegen auf Sehnen innen, die Kugel wurde ein Viertel flacher, Grat 43°); Verdichten auch
    nach der Drehung der Normalen je Kante (`verdichten`-Option `winkel`, im Fenster `?winkel=1`: am langen Lappen 14 statt 4
    umgeschlagen, am dicken gleich).
  - **Offen:** Florians eckige Lappen konnte ich nicht nachstellen (meine Lappen: Drehung je Kante 95 % ≈ 10°, glatter Umriss); an der
    Kreuzung mit einem harten Loop knickt der kreuzende Loop mit seiner Ecke von selbst (15°) jetzt stärker als die Haut daneben (8°).
    Ein Feld nur aus harten Loops behält seine Krümmung (nichts sagt dort „flach“). Bilder `docs/progress/editor/form-boden-{alt,neu}-*`,
    `form-kruemmung-ring-{alt,neu}-3d-2026-11-05.jpg`.
- **2026-11-05 (nachts, danach): Eine Kreuzung ist ein Punkt** (Florian mit Bild `docs/progress/editor/form-kreuzung-griff-florian-2026-11-05.png`:
  „In der Front kann ich den seitlichen Griff nicht knicken, obwohl er als harter Punkt ausgewählt ist. Wenn ich einen Loop im unteren
  Bereich platziere, geht es.“).
  - **Ursache (nachgestellt, hing an der Reihenfolge der Loops):** An einer Kreuzung liegen die Punkte zweier Loops übereinander, jeder
    mit eigenem Zustand. Die 3 macht den angeklickten Loop dort hart, der andere wird dort von selbst eine Ecke. Die sichtbaren Griffe
    gehörten je nach Reihenfolge dem glatten Punkt (knickte nicht, 0,5°) oder der Ecke (knickte, 41°).
  - **Jetzt (Fenster):** Eine Kreuzung ist als Ecke ◆ zu sehen, sobald einer ihrer Loops dort eine hat (`eckeGezeigt`). Ein Griff an
    einem Punkt, der so zu sehen ist, knickt (der Punkt seines Loops wird beim ersten Zug eine Ecke von Hand). Doppelklick auf Punkt oder
    Griff schaltet alle Loops an der Kreuzung um (`punkteAnKreuzung`).
  - **Gemessen** (Maus `scripts/pruefen/form-kreuzung-probe.mjs`, beide Reihenfolgen): nach der 3 als Ecke zu sehen, Griff des Umrisses
    60 px seitlich → Knick 41,1°, 0 umgeschlagen; Doppelklick → beide glatt, 0,0°; ⌘Z bitgleich. Ältere Proben mit denselben Zahlen.
    Bilder `form-kreuzung-{geknickt,glatt}-2026-11-05.jpg`.
- **2026-11-05 (abends): Maul als Loop** (Florian: „Ja, fang mit dem Maul als Loop an: mit F als schmale Form ums Maul zeichnen,
  Mundwinkel als Punkte, ein Regler öffnet es.“).
  - **Bedienung (`kurven.html`):** Mit F eine schmale Form ums Maul zeichnen, in der Seite vorn über den Umriss hinaus (neu: wird ein Ring,
    Enden genau auf Kanten der Mittelebene, `ringUeberUmriss`) oder in Front/Top über die Mitte. Die neue Form ist gewählt; der Regler
    „Maul“ im 3D-Blatt (0–55°) macht den gewählten Ring zum Maul: Sein Inneres ist die Öffnung, die Hälften sind Ober- und Unterlippe,
    der Punkt am weitesten von der Mitte seiner Enden wird der Mundwinkel (`LoopPunkt.mundwinkel`, Ecke ◆, sonst ein neuer Punkt). Der
    Loop des Mauls ist rot. Offen ist nur die Ansicht: Das Netz bleibt geschlossen, die Lippen sind Loops wie die anderen (Punkte ziehen
    geht auch bei offenem Maul), die Blätter zeigen den Umriss des offenen Modells und die Zeichnung in Ruhe. Bei 0° zeigt das Maul die
    Form, wie gezeichnet (schmal = Spalt). ⌘Z nimmt Öffnen und Anlegen schrittweise zurück (gemessen bis zum Anfang).
  - **Kern `dicht/maulLoop.ts` (`maulAmLoop`, `mundwinkelProbe`):** geschnitten genau längs der Kette des Loops im Netz (die kleinere
    Seite des Rings fällt weg). Gaumen und Boden: von jedem Punkt der Lippe ein Bogen quer zu seinem Spiegelpunkt, gewölbt in den Kiefer
    (eine Richtung für das ganze Maul, quer zu Mundwinkel → Mitte vorn), am Mundwinkel treffen sie sich. Gewichte der Drehung wie bei
    den getrennten Kiefern (`kieferFeld`/`dickeAmMundwinkel` aus `kiefer.ts` herausgelöst, dort bitgleich), Öffnen mit `maulOeffnen`.
    Im Zug gelten die Gewichte vom Anfang weiter (`wieVorher`): 2–3 ms statt 40 ms.
  - **Nebenbei behoben:** Mit F über die Mitte gezeichnete Ringe wurden beim Einsetzen in der Spiegelhälfte rückwärts abgelaufen und
    kreuzten andere Kanten: 20 Punkte ohne Spiegelpartner. Jetzt wird die Hälfte abgelaufen und gespiegelt (`wegOffen`); geschnittene
    Ringe bleiben bitgleich (Test „Einsetzen … spiegelgleich“ mit beiden Formen).
  - **Gemessen** (Kern `maulLoop.test.ts`, Maus `scripts/pruefen/form-maul-loop.mjs`, `FALL=front`): zu genau wie vorher, offen 20/40/55°
    dicht (0 offene Kanten), Unterlippe genau gedreht, Oberlippe steht, spiegelgleich; Seite 0 umgeschlagen bis 55°. Front im Fenster:
    Haut 0 bis 20°, 10 bei 40° (Kinn), Gaumen 4 sehr kleine. Unterlippe bei offenem Maul 12 nach unten gezogen: dicht, 2–6 umgeschlagen
    am Mundwinkel bzw. vorn, ⌘Z bitgleich; Zug 2,5–3,5 ms je Bewegung.
  - **Fallen:** Das Innere nie an der Lippe in der Seitenansicht aufhängen (eine Lippe vorn am Gesicht faltet sich in der Seite: 48 offene
    Kanten); die Richtung in den Kiefer nicht je Punkt quer zum Mundwinkel nehmen (kippt hinter dem Mundwinkel: 47 umgeschlagen); der
    Gaumen darf an der Lippe nicht breiter werden als sie (höchstens ×1,5, sonst nicht monoton).
  - **Offen:** Beim Öffnen knickt die Haut unten am Körper (dort läuft die Kieferdrehung nach dem Abstand von der Unterlippe aus, wie in
    der ersten Maul-Probe; auf einer Kugel liegt das mitten im Kinn). Weg im Loop-Modell: eine Kinnlinie als Loop, wo der Unterkiefer
    endet. Lippen ohne Rundung, Zähne, getrennte Kiefer am Loop, Posen. Bilder `docs/progress/editor/form-maul-loop-*-2026-11-05.jpg`.
  - **Nachtrag (Florian: „ich bin nicht sicher mit der Kinnlinie. Machen das nicht später die Bones und die Weights?“):** Ja. Der
    Regler ist schon ein Kieferknochen mit automatischen Gewichten (`kieferFeld`: Winkel × Abstand von der Unterlippe, Abfall von einer
    bis anderthalb Kieferdicken); der Knick ist dieser Abfall weit vom Gelenk (Falle 14.10.: Hebel × Gefälle × Winkel > 1; Übergänge im
    Winkel um das Gelenk knicken nicht, solange sie breiter sind als der Öffnungswinkel). Keine Kinnlinie: Wo der Unterkiefer endet,
    entscheiden die Gewichte der Pose (Kiefer gegen den Rest des Körpers), den Rest bei großem Winkel der Pinsel; Gewichte malen nur,
    wenn das nicht reicht. Dasselbe gilt für das Vorderbein unter dem Mundwinkel aus der ersten Maul-Probe.
- **2026-11-05 (nachts): Fressen-Pose auf dem dichten Netz, Kiefergewichte ohne Knick** (Florian: „ja baue mal die Fressen-Pose“;
  davor: „Warum kann man in der Pose nicht einfach ganz normal die Bézier-Punkte bearbeiten und den Blendshape erstellen? Der Pinsel
  ist nice to have, aber erstmal mit niedrigerer Prio“).
  - **Bedienung (`kurven.html`):** Knopf „Fressen“ im 3D-Blatt oder die Regler Maul (Unterkiefer 0–55°) und Kopf (Schädel 0–40°)
    zeigen die Pose (das Maul anlegen wie bisher: schmale Form mit F, wählen). In der Pose wirken alle Werkzeuge wie in der Grundform
    (Punkte, Griffe, G/S/R, O, neue Punkte und Loops) auf das, was zu sehen ist; die Grundform bleibt. „Fressen“ noch einmal: zurück.
    ⌘Z nimmt Schritte samt Ziel zurück. Die Grundform zeigt das Maul zu, so wie es gezeichnet ist. Der Pinsel kommt später.
  - **Kern `dicht/poseLoop.ts`:** `knochenWinkel` (je Punkt ein Winkel aus den Gewichten des Maulschnitts der Grundform),
    `knochenDrehen` (je Punkt starr um den Mundwinkel, genau umkehrbar; der Mundwinkel dreht nicht, das Gelenk bleibt beim Bearbeiten
    gültig), `innenPosieren`, `ergaenzen` (Werte für neue Netzpunkte aus den Nachbarn, spiegelgleich). Bearbeitet wird die posierte
    Haut; nach jedem Schritt zurückgedreht ist Ruhe der Pose − Grundform der Blendshape (`pose.delta`). Grundform und Pose haben
    dasselbe Netz: Verdichtet die Pose oder bekommt sie einen Loop, bekommt die Grundform dieselben Punkte (`netzGewachsen`), und
    neue Punkte der Grundform bekommen Werte im Blendshape. Punkte, Ecken, Härte und Loops aus der Pose gelten danach auch in der
    Grundform (formneutral).
  - **Gewichte ohne Knick** (`kieferFeld` mit `hebel`, nur beim Maul am Loop): Der Kiefer läuft so lang aus, wie die Haut dort beim
    größten Winkel wandert (1,5 × Abstand vom Mundwinkel × Winkel), höchstens zwei Kieferdicken. Knick bei 40°: Kugel Seite p99 10,1 →
    1,0°, größter 49 → 12° (am Mundwinkel); Kugel Front p99 15 → 7°, größter 117 → 21°; Bohne: der Bauch geht höchstens 4 Einheiten
    mit (mit vier Kieferdicken 13, unbegrenzt 23). Test `kiefergewichte.test.ts`.
  - **Nebenbei:** Die Knöpfe im 3D-Blatt nahmen keinen Mausklick an (die Kamerasteuerung fing den Zeiger; Loop, Form, Einfluss) →
    die Leiste hält Zeigerereignisse an wie in `form.html`. Verdichten lässt die Öffnung des Mauls aus (`verdichten`, `verborgen`).
  - **Gemessen** (Maus `scripts/pruefen/form-fressen-pose.mjs`, auch `FALL=front`; Kern `poseLoop.test.ts`): Pose dicht, 0 umgeklappt;
    Unterlippe in der Pose 25 nach unten: Blendshape genau 25, Grundform bitgleich, dicht, Haut 0 umgeklappt (Front 6 Splitter an der
    Unterlippe, wie schon im offenen Maul der Grundform), Inneres 3; 1,8–2,3 ms je Bewegung. Maul 45°/Kopf 10° und zurück: wie vorher
    (10⁻¹³). Loop in der Grundform 30 hoch, die Pose folgt an derselben Stelle, der Blendshape bleibt. ⌘Z ×12 bis zum Anfang.
  - **Fallen:** In der Pose überspannt die verborgene Fläche der Öffnung das offene Maul und klappt um; mit ihr schaukelte sich der
    Löser auf (ein Punkt 10 000 Einheiten weit) → in der Pose löst er ohne die Öffnung (`loeserHaut`) und ohne die Krümmung der Loops
    (sie gehört zur geschlossenen Grundform; am Rand der Öffnung verknitterte die Haut, 146 Einheiten, 16 umgeklappt), jeder Punkt
    behält seine Krümmung. Prüfskripte: vor dem Ziehen nicht klicken (der zweite Druck war ein Doppelklick: neuer Punkt statt Zug);
    nach dem Zeichnen mit F ist F schon aus (ein zweites F zeichnete bei jedem Zug eine neue Form); offene Kanten mit Toleranz zählen
    (Haut Float64, Inneres Float32: Runden trennte gleiche Punkte, 16 falsche „offene Kanten“).
  - **Offen:** Pinsel in der Pose; weitere Posen und Überblenden; Speichern/Laden (gibt es im Fenster noch nicht); in der Pose folgt
    die Krümmung nicht den Loops (flacher Boden zwischen geraden Loops gilt dort nicht); die Gewichte sind automatisch (wo der Kiefer
    endet, malen oder an Knochen des Körpers festmachen, wenn es nötig wird). Bilder `docs/progress/editor/form-fressen-*-2026-11-05.jpg`.
- **2026-11-06: Explosion behoben, die Dehnung der Haut kommt aus den Loops** (Florian mit Bildern: „teilweise passiert bei den
  einfachsten Formen schon das. Das Mesh "explodiert" und die Seite hängt sich auf.“).
  - **Nachgestellt** (Maus `scripts/pruefen/form-explosion-probe.mjs`, `FALL=a|b|c|d`, Kugel mit drei Loops):
    - a: hinten weit nach hinten (Ecke), vorn nach vorn, oben weit über vorn hinaus (Ei mit Überhang): bis 104 Knicke über 60°,
      28 umgeklappt.
    - b: Schnabel aus einem neuen Punkt der Mitte: 46–104 Knicke.
    - c: dann die Griffe an der Spitze herumgedreht, bis die Linie eine Schlaufe schlägt: Haut bis 10⁴⁰, 1,7 Millionen Punkte, die
      Seite hing 118 s (Florians erstes Bild).
  - **Zwei Ursachen:**
    - Der Löser streckte jeden Punkt mit der Dehnung seiner eigenen Kanten (Verteilung und Krümmung). Das ist eine Rückkopplung: Eine
      Falte hat lange Kanten, also größere Ziele, also eine tiefere Falte. Ohne Verdichten flog die Haut schon in Fall a auf 10¹⁴⁷.
    - An einer Schlaufe oder Spitze eines Loops misst die Parabel eine beliebig große Krümmung (kaum Steigung), das Krümmungsfeld
      verteilt sie in die Haut.
  - **Jetzt:**
    - `HautZiele.dehnung` (`dicht/kurven.ts`): je Bindung, wie weit ihr Loop dort gedehnt ist (Abstand zu den Nachbarn in der Kette
      jetzt gegen beim Anlegen), feste Punkte 1, dazwischen glatt mit derselben Zerlegung wie der Löser (eine Spalte). Sie streckt
      nur die Krümmung; die Verteilung in der Fläche wird gedreht, nicht gestreckt.
    - Ein Loop gibt höchstens die Krümmung weiter, die seine Proben auflösen (Radius ≥ Probenabstand, `dicht/kruemmung.ts`).
    - `LoopZug` baut die Ketten immer (auch in der Pose), das Krümmungsfeld nur mit `kruemmung`.
  - **Gemessen** (Maus, alt → neu):
    - a: 78/104 → 0/4 Knicke über 60°, 14/28 → 0/0 umgeklappt.
    - b: 46/68/104 → 0/0/0 Knicke.
    - c: 6 416 Punkte statt 1,7 Millionen, Maße wie gezogen, 0,8 s. Die Schlaufe selbst faltet die Haut (19 Knicke), das Stück in der
      Schlaufe stülpt sich um (die Linie läuft dort verkehrt herum).
    - Stauchen (d) sauber wie vorher.
    - Ältere Proben gleich oder fast gleich: Boden, Maul, Kreuzung, Spiegelpunkt, Griffe, Zoom, Fressen-Pose (25 für 25); Braue
      34,8°/25,9° statt 34,3°/25,7°.
    - Kern: 79 Tests grün, neu `dicht/weiterZug.test.ts` (am alten Löser rot: Überhang 150 Knicke, 22 umgeklappt).
  - **Verworfen (gemessen):**
    - Drehung je Punkt aus dem ganzen Ring der Nachbarn (Procrustes): nicht besser.
    - Dehnung aus den Loops auch für die Verteilung: am weit gezogenen Kopf eine Falte von 148° (längs des Loops gedehnt heißt nicht
      quer dazu).
    - Die eigene Dehnung nur zum Stauchen: Beim Schnabel faltete die gestauchte Haut weiter.
    - Ganz ohne Verteilung: Auf dem Netz aus Surface Nets wird die Kugel ohne Änderung uneben (145–158).
    - Dehnung² für die Krümmung: Kuppen am harten Ring bis 11 zu hoch.
  - **Offen:**
    - Das Zerlegen wächst stark mit der Punktzahl (5 000 Punkte 0,23 s, 10 000 0,6 s, 18 000 2 s), ein weiter Zug zerlegt in seinen
      Stufen bis zu fünfmal. Mit Florians 11 000 Punkten ruckelt ein weiter Zug deshalb weiter. Weg: schneller zerlegen
      (verschachtelte Zerlegung statt der Hülle).
    - Im Kern-Test der Pose (mit der Öffnung im Löser) geht ein Punkt unter der Lippe 35,7 statt 20 mit; im Fenster (ohne Öffnung)
      genau 25 für 25.
    - **Rüssel (Florian, danach: „was ist das? … wenn du am Rüssel den Handle bewegst, passiert das“):** Langer dünner Rüssel, Ring
      um den Ansatz, dann den Griff an der Spitze gedreht → die Spitze stülpt sich um (schwarz, im Top eine Blase hinter einer
      Einschnürung). Nachgestellt mit `form-explosion-probe.mjs` `FALL=e GRIFF=<Grad>` und `FALL=f`: schon 20° Drehung knickt, −45°
      105 Knicke über 60°, 28 umgeklappt; ohne Krümmungsfeld (`?kruemmung=0`) 23 und 0. Ursache: Das Krümmungsfeld gibt die
      Krümmungsänderung eines Loops in alle Richtungen weiter. Die Ränder eines Rüssels sind fast gerade oder nach innen gebogen,
      also sagt das Feld „flach“ oder „hohl“ auch quer über den Rüssel; der dünne Querschnitt wird zusammengezogen, bis die Seiten
      durcheinander gehen. Beim Flachen Boden ist genau das gewollt. Weg: Ein Loop sagt nur die Krümmung längs seiner selbst, quer
      dazu misst die Haut selbst (wie FiberMesh, aber nur für die Querrichtung). Der alte Löser explodierte in Fall f (333 000
      Punkte, 15 s); dreht der Griff so weit, dass sich die Linie kreuzt (90°), stülpt sich das Stück hinter der Kreuzung um wie bei
      jeder Schlaufe. Zweiter Fall (Florian: „es kollabiert zur Mittelachse on top, ohne dass ich da etwas mache“): Hammerform nur in
      der Seite gezogen (Oberkante und Vorderkante gerade, Unterkante hohl), im Top schnürt sich der Kopf zur Mittelachse ein und
      stülpt sich vorn um — dieselbe Ursache. Ein Ausweg nur mit Gedächtnis quer (der Loop ändert nur seine Hälfte) brächte die
      Höcker im flachen Boden zurück (sein Fall vom 05.11.); richtig ist eine Krümmung mit Richtung (jeder Loop sagt seine Richtung,
      quer kommt sie von den Loops, die quer laufen, sonst bleibt die Haut, wie sie ist). Entscheidung bei Florian (gefallen und
      gebaut: Eintrag darunter).
  - **Falle:** `git apply` aus einem Unterordner lässt Pfade außerhalb still aus (Gegenproben vom Wurzelordner aus).
  - Bilder `docs/progress/editor/form-explosion-{a,b,c}-{vorher,nachher}-2026-11-06.jpg`.
- **2026-11-06 (vormittags): Krümmung mit Richtung** (Florian: „Ja, bau die Krümmung mit Richtung: jeder Loop sagt nur seine
  Richtung, quer kommt sie von den Loops, die quer laufen, sonst bleibt die Haut, wie sie ist. Boden muss flach bleiben, Rüssel und
  Hammer dürfen nicht kollabieren.“).
  - **Kern `dicht/kruemmung.ts`:** Ein Loop sagt an jedem Punkt zwei Tensoren im Raum: N = t tᵀ (welche Richtung er bedeckt) und
    M = κ·t tᵀ (seine Krümmung längs). Beide werden harmonisch in die Felder verteilt; der Rand des Bereichs gibt die ganze Krümmung
    der Haut, die stehen bleibt. Je Punkt K = (N + b)⁻¹(M + b·Gedächtnis) in seiner Tangentialebene, die Zahl des Lösers ½·Spur(K·E)
    mit der Verteilung E der Kanten. Wo Loops beide Richtungen bedecken (gekreuzte Arme eines Bodens), kommt die Krümmung ganz aus
    ihnen; ein Ring um einen Rüssel sagt sie quer längs des Rüssels; wo nichts quer läuft, gilt das Gedächtnis.
    - Gedächtnis = Krümmung beim Anfassen mit Richtung (je Kante gemessen, kleinste Quadrate, so verschoben, dass es genau die Zahl
      des Lösers gibt: ohne Loops bleibt die Haut genau); an Loop-Punkten das der Nachbarn ohne Loop; b = 0,02.
    - Gerechnet im Material beim Anfassen (die Loops hängen an der Haut, ihre Richtung darin bleibt): N einmal je Zug, M einmal je
      Schritt, sechs Spalten in einem Durchgang (`loesenSpalten` im Normalsystem).
    - Die Loops sagen die Krümmung, wie sie jetzt ist: `Loop.kap`, das Messen beim ersten Zug und `kruemmungFestlegen` sind weg (im
      Kern, im Fenster und in der Pose).
    - Die Krümmung aus den Loops geht mit Dehnung² in den Löser, das Gedächtnis mit Dehnung (alles mit Dehnung machte die absolute
      Krümmung zu flach: Ring ×1,15 7,8 zu tief, jetzt 2,7). Die Auflösungsgrenze misst den Abstand der Proben jetzt.
  - **Gemessen (Fenster, `form-explosion-probe.mjs`, alt → neu):** Rüssel, Griff an der Spitze 20°: 49 Knicke über 60°/14 umgeklappt
    → 2/0; −45°: die Spitze stülpte sich schwarz um (105/28) → dünne Spitze, nicht umgestülpt (57/24, winzige Dreiecke ganz vorn).
    Langer Hammer (neu `FALL=g HAMMER=lang`): nach der geraden Vorderkante 111/42 → 24/8, der Kopf bleibt in Front und Top rund.
    Kurzer Hammer 0/0. Boden 0,26 → 0,22; Kopf aus einem Ring zwei weite Züge 0/0; Braue, Kreuzung, Spiegelpunkt, Griffe, Punkte und
    Zoom, Maul, Fressen-Pose wie vorher. Je Mausbewegung auf der ganzen Kugel 21 → 23 ms (erst 35: Zwischenfelder je Punkt
    verursachten Müllsammeln, jetzt ohne).
  - **Kern** (`dicht/weiterZug.test.ts`): Zug jetzt wie das Fenster in Mausschritten mit Stufen (vorher gleiche Stufen; dabei suchte
    der Test den gezogenen Punkt neu und zog in späteren Stufen an der falschen Kreuzung). Neu C (Rüssel, Griff 45°): alt 166/30 →
    neu 12/0. Neu D (Hammer, Kopf weit vorn): alt 32/14 → 28/6, Kopf rund.
  - **Rückschritt (ehrlich, als offenes Ziel `it.fails`):** Überhangspitze (A) 0/0 → 20/6, im Fenster 0/0 → 24/8 (kleine Rille längs
    der Mitte an der Spitze); Schlaufe (B, die Spitze stülpt sich in beiden um) 17/2 → 124/42. Ursache gemessen: An solchen Spitzen
    sind die Dreiecke stark gestaucht (93 % der Kanten in einer Richtung), quer dazu sagen die Loops ihre Krümmung, der Laplace sieht
    diese Richtung nicht. Weg: zu kurze Kanten zusammenlegen (offen seit 05.11.). Augenform ohne O um 30° gedreht: 4 → 12 umgeklappt.
  - **Verworfen (gemessen):** nur die Spur (¼·Spur K): an Spitzen robuster, aber ein lang gedehnter Rüssel wurde ein breites Paddel
    (±172 statt ±40); alles im Raum, wie es jetzt liegt (Richtungen jetzt, je Punkt mit Normale und Drehung in der Fläche gedreht):
    teurer, nicht besser; isotropes Gedächtnis (halbiert die Krümmung quer an jedem Loop); Gedächtnis 0,005–0,1, Auflösungsgrenze
    zwei/drei Probenabstände, Mindestanteil jeder Richtung in E: nichts Wesentliches.
  - Fallen: Ein Test, der den gezogenen Punkt in jeder Stufe neu als nächsten zum Startort sucht, zieht nach ein paar Stufen am
    falschen Punkt (Punkte über ihre Stelle s festhalten). Im Browser kosten viele kleine Arrays je Punkt und Schritt mehr als die
    Rechnung (Müllsammeln). `NAH` im Probe-Skript nur beim letzten Bild (sonst zielen die folgenden Züge daneben).
  - Bilder `docs/progress/editor/form-richtung-{ruessel,hammer}-{vorher,nachher}-2026-11-06.jpg`.
- **2026-11-06 (mittags): Pilz-Rand knickt zwischen den Ecken, zu kurze Kanten werden zusammengelegt** (Florian: „Viel besser...
  Ja kanten zusammenlegen und schau dir das noch an: wenn ich z.B einen solchen Pilz baue, versucht das mesh sich zwischen den 4
  knckpunkten "aufzublasen". Kann man es so machen dass die linie den knick zwischen den zwei punkten interpoliert?“; Bild
  `docs/progress/editor/form-pilz-florian-2026-11-06.webp`).
  - **Knick wird Härte (`dicht/loops.ts`, `knickAm`, `haerteBei(l, loops)`):** Knickt eine Linie an einer Ecke (◆) über einen Loop
    wirklich (Winkel ihrer Griffe, wie die Linie sie zeigt), wird der gekreuzte Loop dort hart: ab 5° beginnt es, ab 30° Härte 3.
    Zwischen seinen Kreuzungen läuft die Härte linear (eine Kreuzung ohne Knick: 0), mit der eigenen Härte gilt das Größere. Alle
    Aufrufer geben die Loops mit (Löser, Verdichten, im Fenster Normalen und Bänder). Der Pilz-Rand knickt rundum, keine Polster.
  - **Zusammenlegen (`dicht/verdichten.ts`, Option `kurz`; im Fenster ½ Startkante, `?kurz=0` zum Vergleich):** nach dem Teilen; ein
    Punkt der Kante fällt weg, der andere bleibt, wo er ist (die Form ändert sich nur um die Sehne), spiegelgleich (auf der Mitte nur
    in einen Punkt der Mitte, nie über die Mitte in sein Spiegelbild). Kreuzungen, je Punkt eines Loops die nächste Probe, Enden der
    Ringe und Ecken verborgener Dreiecke bleiben. Auf einer Linie (Kette) nur längs und nur unter `kurzKette` (Standard ½ `kurz`).
    Geprüft wird: Verbindungsbedingung (genau zwei gemeinsame Nachbarn), die Gegenpunkte behalten mindestens drei Nachbarn, kein
    Dreieck kippt über 60°, keine Kante über `maxKante`; das Spiegelbild wird über ein Journal je Dreieck zurückgenommen, wenn es nicht geht.
    Danach neu nummeriert: alte Punkte vorn in ihrer Reihenfolge, Ergebnis `alt` (je neuer Punkt die alte Nummer, −1 neu); das
    Fenster ordnet Blendshape und Knochenwinkel damit um (`netzGewachsen(nAlt, alt, vorher)`), die Punkte, in die gelegt wurde,
    werden mit den neuen entspannt.
  - **Gemessen im Kern** (`weiterZug.test.ts`, Knicke über 60°/umgeklappt): B Schlaufe 124/42 → 18/2 (jetzt `it`), A Überhangspitze
    20/6 → 6/2 (jetzt `it` mit Abstand), D Hammer 28/6 → 8/0, C Rüssel mit gedrehtem Griff 12/0 → 20/2 (an der Spitze des flachen
    Rüssels). Die Fälle sind empfindlich gegen die Reihenfolge des Zusammenlegens: Bei gleichem Rang zuerst den älteren statt den
    neueren Punkt wegzulegen gab A 14/4, B 10/0, C 10/0 — die Grenzen der Tests haben deshalb Abstand. Neu `verdichten.test.ts`
    „Gestaucht“ (1 362 → 217 Kanten unter ½, geschlossen, spiegelgleich, Ketten und Kreuzungen an Ort, 40–60 ms) und `loops.test.ts`
    „Pilz“ (Knick 63° → Härte 3,0 an der Ecke, 1,5 halbwegs, 0 an der nächsten Kreuzung).
  - **Gemessen im Fenster** (`form-explosion-probe.mjs`, mit der Maus, ohne → mit; Knicke über 60°/umgeklappt): langer Hammer
    79/26 → 7/0 (die Kratzer weg), Schlaufe 46/16 → 14/2, Rüssel mit Griff −45° 36/6 → 13/0, Pilz (neu `FALL=p`) 0 umgeklappt, der
    Rand knickt rundum; Überhang (A) in den letzten Schritten 0/0 und 8/4 → 12/4 und 28/10 (zwei kleine Kratzer an der Unterseite
    der Spitze; Draufsicht und Front runder als ohne). Verdichten samt Zusammenlegen 15–36 ms. Ältere Proben gleich oder besser
    (Boden 0,22 → 0,15, Fressen-Pose Front 10 → 6 umgeschlagen, Braue 36,8°/28,2°, Griffe 2,3°/36,0°, Grundform in der Pose: alle
    gebliebenen Punkte genau an Ort); ein Punktzug bewegt die Linie jenseits der Nachbarpunkte jetzt bis 0,1 (zusammengelegte
    Linienproben: die Sehne liegt minimal neben der alten Probe).
  - **Linien nicht ausdünnen (gemessen):** Mit allen Linienstücken unter ½ blieben einer Augenform 30 von 57 Proben; die Griffe werden
    aus den Proben abgelesen (Ausgleichspolynom je Seite), der glatte Punkt las danach 23° Knick statt 2°, ein Eckzug 5° statt 36°.
    Ohne Linienpunkte blieben schmale Dreiecke an den Linien (Schnabel 8 statt 0 Knicke über 60°, Hammer 24). Mit ¼ an Linien: Griffe
    wie vorher (glatt 2,3° statt 1,8°, Ecke 36,0° statt 35,9°), Ergebnisse fast wie mit allem.
  - **Offen (ehrlich):** Spitzen, an denen sich zwei Loops kreuzen oder ein Griff gedreht wird (A, C), falten weiter ein wenig (dort
    sind die Dreiecke nicht gestaucht, das Zusammenlegen trifft die Ursache nicht). Ein aus der Kugel gezogener Rüssel ist ein flaches
    Paddel (Breite : Höhe ≈ 3,5 : 1; so schon seit der Krümmung mit Richtung, quer gilt das Gedächtnis der Kugel); mit Zusammenlegen
    geht der Löser über die Stufen einen anderen Weg (im Kern Breite ±5 %, im Fenster sichtbar schmaler).
  - **Fallen:** Wer Werte je Netzpunkt hält, muss nach dem Verdichten umordnen (`alt`); „das Netz wächst nur“ gilt nicht mehr. Die
    Proben `form-griffe`, `form-punkte-zoom`, `form-fressen-pose` verglichen Lagen über Nummern (zählten nach dem Zusammenlegen fast
    alle Dreiecke als umgeklappt) → jetzt umgeklappt gegen die Normalen der Ecken, Linien über die Stelle s (neu `s` im Haken
    `loops`), Grundform über gleiche Lagen. Fenster-Proben nie parallel zu `vitest` laufen lassen: Unter Last kommen weniger
    Mausschritte an (140 ms je Bewegung), der Zug geht einen anderen Weg.
  - Bilder `docs/progress/editor/form-pilz-{vorher,nachher}-2026-11-06.jpg`, `form-kurz-hammer-{vorher,nachher}-2026-11-06.jpg`.
- **2026-11-06 (nachmittags): Härte geprüft, FiberMesh gelesen, Konzept „Kurven als Wahrheit“ zur Freigabe** (Florian: „machen wir
  wieder sonderregeln gerade?“ → teilweise; dann „die härte hat bei mir noch nicht die erwartete wirkung … Was macht z.B FiberMesh
  anders? … ein Werkzeug wie P bei Illustrator … Punkte löschen … wie bei Illustrator?“).
  - **Härte gemessen** (`scripts/pruefen/form-haerte-probe.mjs`): Pilz mit hartem Rand 3,3° Knick quer über den Rand gegen weich
    4,2°; nachträglich hart gesetzt keine Wirkung, auch nach einem Zug; Linse (oben und unten zur Mitte) ohne Kante, zwei runde
    Kappen gäben ≈ 67°. Wirkung nur, wo die Linie selbst gegen die Haut bewegt wird (Braue 37° gegen 28°). Ursache: Das Gedächtnis
    der Haut hält die alte runde Krümmung beider Seiten; Härte erlaubt den Knick nur, nichts erzeugt ihn, und ohne Zug rechnet sich
    nichts neu.
  - **FiberMesh** (Nealen u. a. 2007): rechnet die Fläche nach jeder Änderung aus den Kurven neu (Glättung bis zum Stillstand, Ziele
    nur in Normalenrichtung, Kantenlängen an den Kurven, nach dem Zug neu vernetzt); scharf = nur Lage (C0); Kurvenart ändern oder
    Kurve löschen formt sofort neu. Grenzen laut Paper: netzabhängig, kleine Netze. Kurzversuch auf unserem Netz (nicht im Code):
    die unberührte Kugel bleibt nicht rund (9 %), Kante noch klein — braucht ein gleichmäßiges Netz, also einen eigenen Beweis.
  - **Vorschlag** [`docs/plans/2026-11-06-kurven-als-wahrheit.md`](docs/plans/2026-11-06-kurven-als-wahrheit.md): A Linien als
    Bézier-Pfade mit gespeicherten Griffen, Stift P, Löschen und Einfügen wie Illustrator (die Schwellen aus abgelesenen Griffen
    fallen weg), danach B Fläche aus den Kurven als Beweis mit Abbruchkriterien. Entscheidung bei Florian.
  - Bilder `docs/progress/editor/form-haerte-{pilz-hart,linse-hart,linse-weich}-2026-11-06.jpg`.
- **2026-11-06 (nachmittags, danach): Beweis B „Haut aus den Kurven“** (Florian: „Ja, beweis zuerst B … A danach.“; Ergebnis
  Abschnitt 4 in [`docs/plans/2026-11-06-kurven-als-wahrheit.md`](docs/plans/2026-11-06-kurven-als-wahrheit.md)).
  - **Gebaut:** `dicht/ausKurven.ts` (`HautAusKurven`): Haut im Bereich ohne Gedächtnis aus den Loops (Krümmung harmonisch aus den
    Loops, wie sie gerade gemessen sind, und dem Rand des Bereichs; über harte Linien und Ecken nichts; Verteilung, wie die Punkte
    liegen). `LoopZug(…, art)` mit `HautArt` `gedaechtnis` | `kurven`; im Fenster `?haut=kurven` (Standard bleibt der heutige).
    Neu für beide: nach Härte und Löschen rechnet die ganze Haut neu (`hautNeuRechnen`, 0,2–0,4 s). Prüffälle `dicht/kurvenFaelle.ts`,
    Test `dicht/ausKurven.test.ts`, Bilder über `scripts/pruefen/form-b-bild.ts`; `HAUT=kurven` lässt `weiterZug.test.ts` und den
    Boden in `loops.test.ts` mit dem neuen Löser laufen; `form-haerte-probe.mjs` hat den Fall `loeschen`.
  - **Befund:** Die Kante kommt aus den Linien, nicht aus der Haut: Knicken die Querlinien am harten Rand (Griff zum Nachbarpunkt),
    machen beide Löser die volle Kante (Pilz 77° bzw. 78°, Soll ≈ 78°); knicken sie nicht, keiner. Heute knickt eine Ecke von selbst
    nur die Verschiebung, nicht die Linie — deshalb wirkte Härte bei Florian kaum. Die Vermutung „das Gedächtnis ist schuld“ war falsch.
  - **Neuer Löser allein kein Gewinn:** besser am Überhang (28/10 → 4/0), Boden (0,23 → 0,00), Löschen (Beule 24,9 → 0,7 statt
    7,2), schneller je Bewegung; schlechter, wo wenige Linien ein Feld spannen (Lappen unter dem Pilzrand, 12 umgeklappt; Hammer
    7/0 → 18/6). Verworfen (gemessen): Krümmung aus den Kurven mit der Verteilung beim Anfassen (Haut verknittert).
  - **Vorschlag:** A mit dem Knick zuerst (Ecke knickt die Linie, harte Kreuzung → Griffe zu den Nachbarpunkten, dann neu rechnen).
  - Fallen: Ein Löser, der die Krümmung an den Linien misst und harmonisch verteilt, hat zwischen weit entfernten Linien viele
    Gleichgewichte (die Linien messen die Wölbung, die sie halten) — Flächen zwischen wenigen Linien bleiben gewölbt. Kern-Prüfungen
    über die ganze Haut ohne Verdichten zeigen andere Falten als das Fenster (Bereiche, Stufen, Verdichten): beides messen. Bilder
    `docs/progress/editor/form-b-{kern,fenster}-*-2026-11-06.jpg`.
  - **Nachtrag abends, Korrektur** (Florian: „Die härte des knicks entsteht doch automatisch und kann im grunde nur ganz oder garnicht
    sein … Variante B scheint in fast allem besser zu sein“; Abschnitt 5 der Planseite): Die Lappen und der Hammer kamen vom
    **Bereich** des Zugs — sein Rand trug die alte Wölbung ins Feld. Über die ganze Haut gelöst (wie FiberMesh; `?haut=kurven` rechnet
    jetzt immer so) ist B überall gleich oder besser: Pilz geknickt 0 umgeklappt, Pilz wie bei Florian Kante 34° (heute 3°), Überhang
    28/10 → 6/0, Hammer 7/0 → 0/0, Rüssel 13/0 → 14/0, Boden 0,14 → 0,11; je Bewegung 11–23 ms, Zerlegen beim Greifen 0,1–0,35 s (bei
    10 000 Punkten 0,6 s, 18 000 2 s — offen, bevor B Standard wird). Härte: Florian hat recht, ein Knick ist da oder nicht; die Zahl
    0–3 schwächte nur die Glättung quer über die Linie (Zwischenwerte = Rundung über ein, zwei Dreiecke, netzabhängig). Vorschlag:
    Ecken knicken, „Kante“ an/aus je Linie oder Stück, Rundung über die Griffe, Zahl weg. Bilder
    `docs/progress/editor/form-b-fenster-pilz{,-geknickt}-ganz-2026-11-06.jpg`. Falle: Ein Löser ohne Gedächtnis darf nicht nur in
    einem Bereich rechnen — der Rand des Bereichs ist dann sein Gedächtnis.
- **2026-11-06 (abends): B über die ganze Haut ist Standard, Greifen schnell, Kante an/aus statt Härte 0–3** (Florian: „Ja: B über
  die ganze Haut als Standard (Greifen auch bei vielen Punkten schnell machen), Härte als Kante an/aus statt 0–3, danach A mit echten
  Griffen und Stift P.“; Abschnitt 6 der Planseite [`docs/plans/2026-11-06-kurven-als-wahrheit.md`](docs/plans/2026-11-06-kurven-als-wahrheit.md),
  Plan für A in Abschnitt 7).
  - **Standard:** `kurven.html` rechnet in jedem Zug die ganze Haut aus den Kurven, ohne Stufen und ohne Bereich (`?haut=gedaechtnis`
    zum Vergleich; in der Pose wie bisher). Hat ein Zug verdichtet, setzt sich das neue Netz in der Ruhe (`nachLoesenOffen`, 4 Runden).
    Je Mausbewegung eine zweite Runde nur, wenn die erste unter 12 ms blieb.
  - **Zerlegung** (`loeser/zerlegung.ts`, `normalSystemZerlegt`): Cholesky wie CSparse (Eliminationsbaum, Zeilenmuster, Spaltenzahlen)
    mit verschachtelter Ordnung (BFS-Ebenen als Trenner, Blätter ≤ 16), gemerkt nach einem Fingerabdruck der Zeilen; das Fenster
    rechnet sie nach jeder Änderung in der Ruhe vor. Zerlegen 7 900 Punkte 0,37 → 0,23 s, 15 400 1,3 → 0,5 s, 27 800 4,1 → 1,2 s;
    Greifen danach 7–31 ms. Mit der Maus (`form-greifen-probe.mjs`): 5 200 Punkte Drücken 84–101 ms, je Bewegung 14–16 ms, Loslassen
    71–80 ms; 15 400 Punkte 134–156 ms, 26–28 ms, 200 ms, Setzen in der Ruhe 0,6 s.
  - **Kante an/aus** (`LoopPunkt.kante`, `Loop.kante`, `kanteAn`, `kanteBei`; Taste K für gewählte Punkte oder den ganzen Loop):
    Stützstellen sind Punkte mit eigener Kante und Punkte, die keine Kreuzung sind; ein Stück ist Kante, wenn eines seiner Enden Kante
    ist (der Knick läuft zum nächsten weichen Punkt aus). Eine Kreuzung, an der die andere Linie mindestens 15° knickt, zählt als Kante.
    Über eine Kante fließt nichts (Gewicht 0), die Anzeige trennt die Normalen, das Band ist schwarz. Im Fenster (Knick quer, Median):
    Pilz-Rand 37° gegen weich 10°, Linse 24° gegen 9°, Braue 48° gegen 13°. Nachträglich zur Kante gemacht nur 10° → 15°: Die kreuzenden
    Linien laufen glatt über den Rand, die Haut folgt ihnen; den Knick bringt A (Ecke von selbst mit Griffen zu den Nachbarn).
  - **Die anderen Proben** gleich oder besser (Boden 0,11, Kreuzung, Griffe, Spiegelpunkt, Maul dicht und ⌘Z genau, Fressen-Pose 25 für
    25, Hammer 0/0, Rüssel −45° 8/0, Überhang nach den letzten Zügen 0/0). **Schlechter:** Überhang direkt nach dem weiten Zug 30
    Knicke über 60° und 6 umgeklappt (Kern-Test und Fenster gleich, die nächsten Züge glätten es; ohne das Setzen 4/0, mit mehr Runden
    schlechter — die Kurven sagen dort diese Form), Rüssel im Kern-Test 28/6 statt 20/2, Schlaufe 38/12 statt 14/2. Die Grenzen der
    Kern-Tests stehen dort, mit Begründung.
  - Fallen: Vor einer Grenze im Kern-Test prüfen, ob das Fenster am selben Schritt misst (der Überhang-Test endet nach „oben −300“, die
    Fenster-Probe zwei Züge später; „0/0 im Fenster“ war ein anderer Schritt). `RUHE=<ms>` in `form-explosion-probe.mjs` misst nach dem
    Setzen noch einmal. Die Probe `form-maul-loop.mjs` hatte drei Fehler (ein zweites F zeichnete neu, ein Klick vor dem Zug kam als
    Doppelklick an, ⌘Z wurde gegen 55° statt 30° verglichen) — daher das frühere „⌘Z 4,2e+1“; jetzt genau.
- **2026-11-06 (spätabends): Teil A — gespeicherte Griffe, Löschen wie Illustrator, Stift P, Kante knickt** (Florian: „Ja, fang
  mit A an: Linien als Bézier-Pfade mit echten Griffen, dann Stift P, nach Abschnitt 7 der Planseite.“; „Stand Teil A“ in
  [`docs/plans/2026-11-06-kurven-als-wahrheit.md`](docs/plans/2026-11-06-kurven-als-wahrheit.md)).
  - **Entscheidung beim Bauen:** Die Linie behält beim Anlegen genau ihre Form auf der Haut, jeder Punkt speichert seine Griffe
    (`LoopPunkt.ein/aus`, `Loop.pfad`), jeder Zug verformt die Linie genau wie das Bézier-Stück aus Punkten und Griffen
    (`verschiebungLaengs` war das schon; neu: danach `griffeUebernehmen` statt neu ablesen). Den Pfad als Linie zu nehmen (Plan)
    hätte schon das Anlegen die Haut ändern lassen (ein halber Ring als ein Stück liegt bis 6 Einheiten neben dem Kreis).
  - **Kern:** `dicht/pfad.ts` (Bézier-Stück: Punkt, Teilen, Anpassen nach kleinsten Quadraten mit oder ohne feste Richtungen);
    `loops.ts`: `griffeAnlegen` (aus der Linie, glatte Punkte auf einer Geraden, Spiegelpunkte senkrecht), `punktEinfuegen` teilt
    (de Casteljau), `punkteLoeschen` (Nachbarn über ihre Griffe, Längen angepasst, Linie folgt), `griffeNach`/`griffeUebernehmen`,
    `griffeSetzen`, `kantenKnicken`, `griffeErgaenzen`. Ringe halten an ihren Enden Griffe in Punkten `vonSelbst` (unsichtbar, nicht
    greifbar, keine Stützstelle der Kante; eine Kreuzung darauf macht sie zum Spiegelpunkt). Tests `dicht/pfad.test.ts` (6).
  - **Fenster:** Ein neuer Loop liest seine Griffe nach seinen Kreuzungen; Züge, Ecke/glatt, Löschen und Pose tragen sie mit;
    **Stift P** (Klick = Ecke, Ziehen = glatter Punkt, erster Punkt oder ⏎ schließt, ⌫ letzter Punkt zurück; Griffe in die Fläche
    gehoben); **Kante (K) knickt** die kreuzenden Linien (jede Seite so rund wie möglich; `?knick=vektor` = Blenders „Vector“ aus
    dem Plan, macht den Pilzhut zur Glocke). `?griffe=0` zeigt das Ablesen wie vorher.
  - **Gemessen mit der Maus:** Einfügen lässt die Linie genau stehen, Löschen bewegt sie zwischen den Nachbarn 0,17 (Augen-Form),
    ⌘Z genau (`form-pfad-probe.mjs`); Stift: Linie im Blatt ≤ 0,35 px neben der Zeichnung, Griffe genau wie gezogen, Haut
    unverändert (`form-stift-probe.mjs`); Kante nachträglich am Pilz 15° → 92°, Kugel mit Kante 5° → 27° (Vector 71°), Linse
    24° → 73°. Ältere Proben gleich oder besser (Griffe ohne 2,8° Zacken, Rüssel mit gedrehtem Griff 8/0 statt 12/2, Fressen-Pose
    25 für 25); etwas schlechter der Boden (0,25 statt 0,11 unter der Ebene). Bilder
    `docs/progress/editor/form-{pfad-loeschen,stift,kante-knick-vergleich}-*-2026-11-06.jpg`.
  - **Verworfen (gemessen):** neue Punkte und Nachbarlängen beim Einfügen aus der Linie neu anpassen (Rüsselspitze: Griffe 600 lang);
    Ecke von selbst, wo die Linie über 15° knickt (Ecken sperren die Krümmung im Löser: 30 statt 6 Knicke über 60°); sichtbare
    Punkte an jedem Ringende (der Kopf-Zug griff den Endpunkt statt des Rings).
  - **Fallen:** Proben, die Punkte nach ihrer Lage wählen, müssen unsichtbare Ringenden auslassen (`sichtbar` im Prüfhaken; sonst
    greift der Zug ins Leere). Ein neuer Punkt liegt auf der Linie, nicht auf dem gespeicherten Stück (beide weichen um den Abstand
    des Stücks zur Linie voneinander ab); Tests vergleichen deshalb die Linie, nicht den Pfad. Kern-Tests ohne Verdichten falten an
    scharfen Knicken mehr als das Fenster (16 gegen 0) — wie das Fenster verdichten und setzen.
  - **Offen:** die alte Ableselogik entfernen (wenn der Knick entschieden ist); Florians Blick auf Stift, Löschen und Knick.
- **2026-11-06 (nachts): Kante knickt rund, auch beim Ziehen; altes Ablesen entfernt** (Florian nach dem Vergleich Kuppel/Glocke:
  „ja dann rund“; Planseite Abschnitt 7, „Schritt 5“).
  - **Regel:** Eine Ecke von selbst (Kreuzung mit einer Kante) hält jede Seite so rund wie möglich (natürliches Ende). K setzt es
    (`kantenKnicken`), jeder Zug hält es (`griffVersatzImZug` in `verschiebungLaengs` und `griffeNach`: Griff + ½ · (Nachbarpunkt +
    dessen Griff − Punkt), nebeneinanderliegende Ecken in Runden). Ebenso: ein gelöschter Kanten-Loop macht seine Kreuzungen glatt,
    ein Doppelklick zurück zur Ecke von selbst knickt rund, ein neuer Loop über einer Kante liest dort seine Griffe je Seite (`eckenAuto`
    vor `griffeAnlegen`), ohne die Form zu ändern.
  - **Entfernt:** das Ablesen am Verlauf (`steigungSeite`), `?griffe=0`, `?knick=vektor`; `istVektorEcke` heißt `istEckeVonSelbst`;
    `griffeBei`, `griffZiehen`, `griffeAbbilden`, `griffeAusrichten` ohne Lagen.
  - **Gemessen mit der Maus:** Pilz erst Kante, dann Unterseite hinauf 92° (vorher 81°), umgekehrt 92° — die Reihenfolge ist egal;
    Kugel 27°; Linse 83° mit 8 kleinen umgeklappten Dreiecken (vorher 73°/2; zwei Kugelkappen wären 67°); die anderen Proben wie
    vorher. Bild `docs/progress/editor/form-kante-rund-reihenfolge-2026-11-06.jpg`.
  - **Fallen:** Kern-Tests, die Griffe brauchen, legen sie wie das Fenster an (jeder neue Loop nach seinen Kreuzungen
    `griffeAnlegen`); ein Zug am Griff übernimmt ihn am Ende (`griffeUebernehmen`), sonst sieht der nächste Griffzug den alten. Die
    ganze Testreihe von `@ee/shape` auf einmal reißt die Zeit- und Lasttests des Käfigs (Minuten je Test, ohne Bezug zu `dicht/`) —
    für die dichte Form `npx vitest run src/dicht/`.
- **2026-11-06 (nachts, danach): Punkt hinaus und zurück gibt wieder dieselbe Linie** (Florian: „wenn ich einen Punkt rausziehe
  und dann wieder zurücksetze, ist das Mesh nicht gleich. Warum?“, mit Bild der Wellen; Planseite Abschnitt 7, „Nachtrag“).
  - **Ursache gemessen** (`scripts/pruefen/form-hin-zurueck.mjs`): Ohne Verdichten kommt die Linie genau zurück; wo sie sich beim
    Hinausziehen nicht ändert, wandert sie auch nicht (0,00). Die Wellen kommen von den neuen Punkten, die das Verdichten beim
    Hinausziehen in die Linie setzt: Sie bekommen ihre Stelle s in der Mitte, lagen aber nach Sehnenlänge (Welle 0,38 nach 220
    hinaus und zurück) bzw. nach Catmull–Rom in s (0,18; 0,56 nach 400) daneben. Neben dem festen Nachbarpunkt wächst der Zug im
    Stück quadratisch an; dort trifft Catmull–Rom 0,67 daneben (nachgerechnet; gemessen 0,65). Ein Zug zurück rechnet nach s, der
    Fehler bleibt als Buckel.
  - **Jetzt** (`verdichten.ts`, `aufLoop`; `pfadBei` in `loops.ts`): Ein neuer Punkt einer Linie mit Griffen liegt genau auf dem
    Bézier-Stück, dazu der Abstand der Linie von ihrem Pfad (beim Anlegen klein und gleichmäßig, ein Zug ändert ihn nicht),
    zwischen den Enden der Kante gemittelt; ohne Griffe Catmull–Rom nach s. Im Fenster nach 100, 220 und 400 hinaus und zurück
    Welle 0,07 wie vor dem Zug. Test `weiterZug.test.ts` E (Gegenprobe mit Catmull–Rom rot: 0,645).
  - **Nicht geändert:** Ganz gleich ist das Netz danach nicht (mehr Punkte, andere Dreiecke); die Form bleibt, wo sie war.
  - **Schlechter:** die absichtlich verdrehte Schlaufe (Explosion c, letzter Schritt) 40/12 statt 34/10 Knicke über 60°/umgeklappt,
    im Kern-Test C (Rüssel, Griff 45°) 37/6 statt 34/2 — die neuen Punkte folgen dort einer verkehrt laufenden Linie genau. Die
    anderen Proben wie vorher.
- **2026-11-06 (nachts, danach): Gedächtnis gegen „aus den Kurven“ gemessen** (Florian: „ist gedächtnis dann nicht besser?“; Planseite
  „Kurven als Wahrheit“, Nachtrag): Das Gedächtnis ist nur bei kleinen Zügen schneller (etwa zehnmal), bei großen langsamer. In der
  Form ist „aus den Kurven“ überall gleich oder besser; nach Hin und Zurück bleibt mit Gedächtnis fast dreimal so viel stehen. Es
  bleibt „aus den Kurven“. Probe `scripts/pruefen/form-tempo-oertlich.mjs`.
- **2026-11-07: Die Linie ist ihr Pfad** (Florian: „ja genau zur Bézier-Kurve machen“; gebaut ohne Zusatzpunkte, meine Empfehlung,
  `?punkte=noetig` zum Vergleich; Planseite „Kurven als Wahrheit“, Nachtrag 07.11.).
  - **Was gilt:**
    - In der Grundform liegt jede Linie genau auf dem Bézier-Pfad aus ihren Punkten und Griffen: an gleicher Stelle 0,00 statt bis
      7,2, Griff ↔ Linie 0,0°. Die Haut folgt, die Punkte bleiben, wohin sie gezogen werden.
    - Jede Probe hat ihren Platz auf dem Pfad (t im Stück). Beim Anlegen kommt sie an den nächsten Punkt des Pfads
      (`pfadParameter`), danach behält sie ihn; ein kreuzender Loop vermisst sie nicht mehr neu (`loopErgaenzt` in `einsetzen.ts`).
    - Eine Kreuzung ist ein Ort auf beiden Pfaden. O formt über Punkte und Griffspitzen (`griffeProportional`).
    - Stift: Eine geklickte Ecke hat im Blatt keinen Griff, in der Tiefe folgt sie der Haut (`eckenTiefe`). Ein gerade gezeichnetes
      Stück bekommt ein Drittel der Sehne, es bleibt gerade.
    - Ein neuer Loop springt beim Anlegen örtlich mit Gedächtnis auf seinen Pfad (`linienAufPfad` im Fenster).
    - In der Pose bleibt alles wie bisher.
  - **Preis ohne Zusatzpunkte:** Ein Halbkreis als ein Stück liegt bis 1,4 % neben dem Kreis, seine Krümmung schwankt um etwa 15 %,
    und die Haut entsteht aus der Krümmung der Linien. Die Kugel mit drei Loops nach dem ersten Zug weicht deshalb bis 2,35 ab, im
    Mittel 1,09 (bisher 0,65 / 0,22). Mit Punkten wo nötig: 4 / 6 / 3 statt 3 / 4 / 3 Punkte, so rund wie bisher (0,67 / 0,22, Kern
    `form-gleichgewicht.ts`), aber ein Zusatzpunkt landete 10 Einheiten neben einer späteren Kreuzung, und deren Zug machte oben
    einen Zipfel (Bilder `docs/progress/editor/form-linie-pfad-{ohne,noetig}-2026-11-07.jpg`). Florians Wahl steht aus.
  - **Gemessen:** Hin und zurück kommen Punkt und Linie genau wieder, die Haut beim 2. und 3. Mal bis 0,19 / 0,18. Stift 0,33 px neben
    der Zeichnung, Boden 0,01, Pilz 90°, Löschen 0,10 statt 0,17. Schlechter: Überhang (Explosion a) nach dem letzten Zug 6 bis 12
    Knicke über 60° und 2 umgeklappt an der Schnabelspitze (vorher 0 / 0). Kugel mit Kante knickt 42,5° statt 27°.
  - **Fallen:** Mit dem Löser über die ganze Haut zog schon ein einzelner Ring die Kugel 10,6 weg (mit nur einem Loop hält nichts sie
    rund), deshalb örtlich mit Gedächtnis. Nie Dateien im Vite-Root ändern, während Fenster-Proben laufen (das Fenster lädt neu, die
    Probe misst Unsinn). Die Stelle s einer Probe ist nicht mehr die Bogenlänge, sondern der Platz auf dem Pfad (Proben suchen nach s).
    Ein geschlossener Loop mit weniger als zwei Punkten hat keinen Pfad und folgt weiter je Probe.
  - Kern-Test `dicht/linieAufPfad.test.ts`, Haken `__kurven.pfadRest()`, `form-hin-zurueck.mjs` mit `ZYKLEN`,
    `form-explosion-probe.mjs` mit `PFAD=1`.
- **2026-11-08: Kleine Details genau** (Florian mit Bild: „warum es ungenau und eckig wird, wenn ich kleine Details rausziehe … Die
  Linie wird ganz kantig. Der Punkt sitzt nicht mehr exakt auf der Linie, und ich habe Probleme, einen neuen Punkt einzufügen“; zu
  „Punkte wo nötig“: „etwas besser“, er testet weiter; Planseite „Kurven als Wahrheit“, Nachtrag 08.11.).
  - **Ursachen** (nachgestellt mit `form-detail-probe.mjs`, Ohr aus dem senkrechten Ring): Die Linie wurde durch grobe Netzpunkte
    gezeichnet (bis 13,6 auseinander, Kurve um 1,02 abgeschnitten = 2,8 px bei 307 %), der Punkt lag 0,92 daneben, und ein Doppelklick
    nahe einem Punkt wurde in s verworfen (s ist nach einem Zug keine Länge mehr).
  - **Jetzt:** `verdichten` mit `genau` (MK/40): Kanten einer Linie werden geteilt, wo sie weiter von ihrer Kurve abweichen (an einem
    Punkt darin, sonst in der Mitte, genau auf die Kurve), nur in der Grundform, nach dem Setzen noch einmal. Die Blätter zeichnen die
    Linie als Bézier-Pfad (SVG). Doppelklick setzt den Punkt an die nächste Stelle des Pfads, verworfen nur unter 3 px an einem Punkt.
    Ohr: Linie 0,18 (0,5 px), Punkt 0,10, Einfügen an der Flanke geht.
  - **Nicht gemacht:** Die Haut zwischen den Linien ebenso fein (`?genauHaut=1`) macht das Ohr rund (0,21 statt 0,99), aber weite Züge
    schlechter (Rüssel bis 108 Knicke / 46 umgeklappt statt 31 / 0, Fressen-Pose 8 statt 0): eigener Schritt.
  - **Fallen:** Verfeinerungen nach Normalen wuchern in Falten (Überhang 1 724 Knicke) — zuerst Überhang und Rüssel prüfen. Eine Schranke
    beim Zusammenlegen gegen „nicht schlechter als vorher“ messen (eine feste ließ einen doppelten Punkt an einer Stift-Ecke stehen). Was
    an Pfaden hängt, gilt nur in der Grundform.
- **2026-11-08 (abends): Sprung beim Loslassen und Stift-Form über Linien gemessen, noch nichts geändert** (Florian: Haut „immer
  glatt, auch bei kleinen Details und hoher Zoomstufe“; Stift-Form über Linien „sehr ungenau … von den Punkten auf den Kreuzungen
  verzogen … soll exakt wie eingezeichnet direkt auf der Haut liegen, ohne diese zu verändern“; Fragen zum Sprung beim Loslassen und
  „live dynamisch verdichten“ — erst beantworten; „Punkte wo nötig“ weiter offen; Planseite „Kurven als Wahrheit“, Abschnitt 8).
  - **Sprung** (`form-loslassen-probe.mjs`): Während des Zugs ist die Haut auf ihrem Netz fertig gerechnet (Loslassen ohne Verdichten
    ≤ 1,4). Eine halbe Sekunde später setzt sich das verdichtete Netz: Hals 4,9, Ohr 5,4, Rüssel 32 Einheiten. Ursache: Der Löser
    rechnet „glatt“ als gleich gewichtetes Mittel der Nachbarn (wie FiberMesh), die Form hängt vom Netz ab. Live verdichten braucht
    zuerst einen netzunabhängigen Löser (Kotangens-Gewichte, Verteilung getrennt), dann Netzschritte im Zug; teuer ist das Neuzerlegen
    (110–153 ms bei 5 000–6 500 Punkten), nicht das Verdichten.
  - **Stift über Linien** (`form-stift-kreuzung-probe.mjs`, Kreis R 78 über zwei Ringe): Linie bis 3,2 px neben der Zeichnung (welliges
    Achteck wie in Florians Bild), Haut bis 2,4 bewegt. Ursache: Die Kreuzungen teilen die gezeichneten Stücke, die Anker behalten den
    Griff des ganzen Stücks (43,1 statt 21,5), die Kreuzungen bekommen abgelesene Griffe, `linienAufPfad` legt die Linie darauf und die
    Haut folgt; dazu liegt der Pfad in der Tiefe nicht auf der Haut. Weg: de Casteljau an den Kreuzungen, Tiefe der Griffe an die Haut.
- **2026-11-08 (abends, danach): Stift-Form genau über Linien** (Florian: „ok, machen wir es so“ — erst der Stift, dann der Löser als
  Beweis, dann Haut fein und live; Planseite „Kurven als Wahrheit“, Abschnitt 8, „Stand“). Kern `griffeAusZeichnung` (`dicht/loops.ts`,
  im Fenster aus `stiftFertig`): Jeder Punkt bekommt seine Stelle auf der Zeichnung, jedes Stück des Pfads ist im Blatt genau das Stück
  der Zeichnung (de Casteljau an Kreuzungen und Ringenden); die Tiefe der Griffe nach kleinsten Quadraten an die Linie auf der Haut
  (glatte Anker gekoppelt, Kreuzungen je Seite, Ecken an geraden Stücken ein Drittel der Sehne, an gebogenen danach einzeln). Mit der
  Maus: Kreis über zwei Ringe 3,2 px → 0,0 px neben der Zeichnung, Haut 2,43 → 0,13 bewegt; großer Kreis 0,42, Quadrat aus Ecken 0,25,
  Augen-Form und Ring über die Mitte wie gezeichnet, 0 umgeklappt. Rest: Grate der alten Linien (ihre Kurven treffen die Kugel nicht
  genau). Fallen: „gerade“ aus der Zeichnung entscheiden (Kreuzungen sitzen bis 0,09 neben der Geraden); ein Griff nur in der Tiefe
  (Ecke an gebogenem Stück) nicht frei mit den anderen anpassen (4 umgeklappt).
- **2026-11-08 (nachts): Beweis „Form unabhängig vom Netz“** (Florian: „Form unabhängig vom Netz, Kriterien Sprung beim Loslassen
  höchstens ein halber Bildpunkt, je Mausbewegung höchstens 16 ms“; Planseite „Kurven als Wahrheit“, Abschnitt 9).
  - **Ursache:** Der Löser misst die Krümmung mit gleichen Gewichten (auf gestreckten Dreiecken vor allem längs der langen Kanten) und
    verteilt sie nach der Zahl der Nachbarn; dieselben Linien geben auf einem anderen Netz eine andere Form (Hals 6,4 Einheiten).
  - **Gebaut** (Fenster `?gewichte=geometrie`, Standard bleibt bis zu Florians Wort): `dicht/intrinsisch.ts` (intrinsische
    Delaunay-Triangulierung, Kotangens ≥ 0, 1–3 ms), `HautAusKurven` mit `geometrie` (Krümmung darauf gemessen und verteilt, konjugierte
    Gradienten mit dem Laplace des Netzes als Vorkonditionierer; Matrix und Verteilung der Punkte wie bisher; Korrektur je Punkt
    halbiert, wenn sie das Vorzeichen wechselt). Test `dicht/netzunabhaengig.test.ts`, Messreihe `form-netzunabhaengig.ts`.
  - **Gemessen:** Startnetz 6 000 / 12 000 gegen 24 000 Dreiecke 0,51 / 0,26 (bisher 0,86 / 3,64). Im Fenster (Sprung, 0,89 px je
    Einheit): Hals 4,9 → 0,34 (0,30 px), Rüssel 33,9 → 7,9, Ohr 6,0 → 8,7 (schneller Zug) bzw. 5,8 → 4,8 (langsamer); je Mausbewegung
    10–13 ms statt 16. Ohr und Rüssel: Der Zug läuft auf dem gestreckten Netz vom Greifen, nach dem Loslassen werden Netz und Linien
    feiner; der Löser zeigt dann die feinere Form. Abhilfe ist Schritt 3 (während des Zugs verfeinern, Zerlegung im Hintergrund; die
    Form hängt nicht mehr daran). Offen: Linse (an 10 % des harten Rands kein Knick, 14 statt 6 umgeklappt), Überhang 20 statt 6–12 Knicke.
  - **Verworfen (gemessen):** geklemmter Kotangens, nur messen, eingefrorene Gewichte, Normalkorrektur mit dem geometrischen Operator
    (explodiert), feste Dämpfung, tangential entspannen (Form wandert 4–6), Schwung (überschwingt).
  - **Falle:** Ein Fixpunktverfahren kann sich je Runde kaum bewegen und doch weit vom Ziel sein (`__kurven.nachrechnen(n)`, Probe `NACH`).
- **2026-11-08 (nachts, danach): Schritt 3 — Verfeinern im Zug, Zerlegung im Hintergrund** (Florian: „Ja, weiter mit Schritt 3: Netz und
  Linien schon während des Zugs verfeinern, Zerlegung im Hintergrund.“; Planseite „Kurven als Wahrheit“, Abschnitt 10).
  - **Gebaut** (nur `?gewichte=geometrie`; `?live=0`, `?hintergrund=0` zum Vergleich): Haut gestreckt oder Linie ungenau → Zug festhalten,
    mit derselben Zerlegung weiter (`HautOptionen.vorlage`; die Matrix bestimmt nur das Tempo), feineres Netz aus diesem Stand, Punkte
    eingebettet in die alte Haut (`dicht/einbettung.ts`), Zeilen (`nurZeilen`) flach an den Worker `src/form/zerlegen.worker.ts`
    (`zerlegungsDaten`/`systemAusDaten` in `loeser/zerlegung.ts`); zurück → mitten im Zug einwechseln. Die Matrix nach der Geometrie
    gewichtet jetzt nach 1 / Kantenlänge² (je Punkt höchstens zehnfach verschieden).
  - **Gemessen im Fenster:** Sprung Hals 0,36, Rüssel 1,4 (bisher 33,9), Ohr 3,6 Einheiten; je Mausbewegung 11,5–13,4 ms (höchstens 19);
    Auslösen 35–52 ms, Einwechseln 4–9 ms (Vordergrund 130–195 ms je Stufe). Rest = Nachhinken im schnellen Zug (eine Runde je Bewegung).
    Linse jetzt mit Kante überall (80,6°, 2 umgeklappt), Überhang 2 statt 6–20 Knicke.
  - **Fallen:** Beim Einwechseln die Punkte der Linien aus dem Stand von jetzt übernehmen (`verdichten` kopiert sie beim Auslösen). Den
    Versatz der Einbettung im Rahmen des Dreiecks speichern, nicht längs der gemittelten Normale (Rückweg nur 0,009 genau). Längengewichte
    ohne Begrenzung lassen den Löser auf gestreckten Netzen auseinanderlaufen.
- **2026-11-08 (abends): Florians drei Fälle nachgestellt und gemessen, Vorschlag Löser-Schritt** (Florian: „stell meine drei Fälle nach und
  miss sie … Danach schlag mir den Löser-Schritt mit Kriterien vor“; Planseite „Kurven als Wahrheit“, Abschnitt 11; Probe
  `scripts/pruefen/form-drei-faelle.mjs`, neu gezählt „umgestülpt“ = Außenseite zeigt ins Innere, Strahl-Parität).
  - **Schwarze Stellen:** Ein sehr langer, gedrehter Griff biegt die Linie an der Hornspitze zurück (Knick 144°, Selbstkreuzung); die Haut
    faltet, 2,9 % der Fläche umgestülpt am hinteren Teil der Hörner. Nach dem Loslassen wächst die Stelle in drei Schritten auf 6,1 %, das
    Verdichten setzt 900 Punkte dazu. Auch ohne Verdichten wächst sie (28 Einheiten): Der Löser misst die Krümmung an der Haut und drückt
    längs ihrer Normale, eine umgestülpte Stelle bestätigt sich selbst.
  - **Aufblasen in Stufen ohne Falte:** Hörner 170 hinaus → nach dem Loslassen 19,4 Einheiten, ohne Verdichten 1,5 (die Form hängt vom Netz ab).
  - **Grobes Detail:** Am Ohr sind die Kanten so lang wie am Rumpf (9,0 gegen 8,3), die Normale dreht je Kante 22,5° statt 4° (verdichtet
    wird nur nach Länge); `genauHaut` 12,3°.
  - **Vorschlag:** Teil 1 Form netzunabhängig und sofort (Matrix nach der Geometrie, im Hintergrund nachgeführt; Beweis mit Abbruch nach zwei
    Tagen), Teil 2 Dichte nach Abweichung (eine Regel statt drei), Teil 3 nie umgestülpt (Richtung von den Linien; Linie rot oder Griff
    begrenzt = Florians Wahl). Entscheidung bei Florian.
  - **Fallen:** „umgeklappt“ (Dreieck gegen seine Ecken) sieht eine ganz umgestülpte Stelle nicht, dafür die Strahl-Parität; lange Griffe
    ragen aus dem Blatt (Proben zoomen dann heraus); in der Seite liegt die Hornspitze auf dem Umriss (in der Front wählen); Schritte
    zwischen Fenster-Läufen mit und ohne `geometrie` nicht Zug für Zug vergleichen (die Züge laufen anders).
- **2026-11-08 (abends, danach): Teil 1 als Beweis angehalten, die Ursache liegt im Modell** (Florian: „Ja, fang mit Teil 1 als Beweis an …“;
  Planseite „Kurven als Wahrheit“, Abschnitt 12). Die Matrix nach der Geometrie macht das Nachhinken größer (Ohr 1,35 → 3,65, nachgeführt
  4,40). Ursache: Der Löser misst die Krümmung an den Linien an der Haut selbst; dann legen die Linien die Form nicht fest (Kugel mit einem
  Ring: Kuppel ×1,25 bleibt bei 163 statt 150, unberührt ±50 % in den ersten Runden, steht bei 155,7; `form-kuppel-probe.ts`). Mit fester
  Krümmung an den Linien steht der Löser nach drei Runden (`SCHWINGEN`, `QFEST=1` in `form-netzunabhaengig.ts`). Verworfen: Scheibenmittel,
  Anderson, weiche Bindung (Code entfernt, Schalter `messreiheSetzen` bleibt). Vorschlag: Krümmung an den Linien aus den Linien selbst
  (Pfad gegen die Normale, quer „so rund wie möglich“, ohne Gedächtnis). Entscheidung bei Florian.
- **2026-11-09: Teil 1 neu (Krümmung aus den Linien) nach fünf Anläufen angehalten** (Planseite „Kurven als Wahrheit“, Abschnitt 13).
  Längs ist die Krümmung aus dem Verlauf der Linie genau (1,00); quer trägt die Linie nichts: „quer so stark wie längs“ macht am Ansatz eines
  Ohrs (Sattel) eine Delle und lässt das Ohr auseinanderlaufen, Querwerte von der Haut beim Anfassen fallen zusammen bzw. laufen auseinander.
  Befund: An den Punkten einer eingesetzten Linie misst der Löser die Krümmung der Haut grob falsch (Kugel: 9–225 %, nach dem Verdichten
  16–134 %; daneben 99–106 %; `form-kap-ring.ts`), ein Paraboloid über 4 Kanten trifft sie auf 2,5 %. Löser unverändert; Entscheidung bei
  Florian. Falle: Eine Kuppel über genau einem Ring am Äquator ist ein Grenzfall (Halbkugel), als Kriterium ungeeignet.
- **2026-11-09 (danach): Recherche „FiberMesh, Monster Mash und die fehlende Angabe an den Linien“** (Florian: „beide deiner Lösungen …
  klingen nach viel Nachjustieren. Hat FiberMesh oder Monster Mash solche Probleme gelöst? … ob es nicht ehrlich eine elegantere Lösung
  gibt“; [`docs/research/2026-11-09-fibermesh-monstermash-richtung.md`](docs/research/2026-11-09-fibermesh-monstermash-richtung.md),
  Planseite „Kurven als Wahrheit“, Abschnitt 14).
  - Keiner der beiden hat es gelöst. FiberMesh lebt mit Runden, Gedächtnis, Neuvernetzen nach dem Loslassen und Netzabhängigkeit; mit
    Kurven ohne Normalen wird die netzunabhängige Lösung dort selbst instabil. Monster Mash bläst die 2D-Zeichnung auf und verformt dann
    eine Ruheform.
  - Wurzel (Schneider & Kobbelt 2001): ΔH = 0 braucht an den Linien Lage **und Richtung** (Normale). Dann ist die Form eindeutig und
    netzunabhängig; nur mit der Lage passen unendlich viele Formen. Daraus folgen Mehrdeutigkeit, Nachhinken, Stufen und schwarze Löcher.
  - Vorschlag „Linien mit Richtung“, von selbst aus dem Liniennetz: an Kreuzungen senkrecht auf beiden Tangenten, auf der Mittelebene aus
    der Symmetrie, dazwischen gleichmäßig, einsame Linien wie gezeichnet. Beweis mit Kriterien und Abbruch; Entscheidung bei Florian.
  - Falle: Die Normale nur in der eigenen Zeile des Linienpunkts zu tauschen, wirkt nicht (Kuppel ×1,25 → 199). Die Richtung gehört in die
    Krümmungsmessung je Seite der Linie.
- **2026-11-09 (abends): Beweis „Linien mit Richtung“ nach Tag 1 angehalten** (Florian: „Ja, bau den Beweis … mit Kriterien und Abbruch
  nach zwei Tagen.“; Planseite „Kurven als Wahrheit“, Abschnitt 15; hinter `kurven.html?richtung=1`, ohne bitgleich).
  - **Bestätigt:** Mit Richtung ist die Form eindeutig: Kuppel ×1,25/×0,8 → 150 ± 0,2 (ohne: 163). Die Richtung kommt aus dem Netz
    (`dicht/richtung.ts`, Kugel mit drei Loops ≤ 0,52°).
  - **Nebenbefund:** Das Maß des Lösers misst die Krümmung 8 % zu flach (nach Fläche gemittelte Normalen); mit den Normalen nach Max
    (`hautNormalenMax`) 1 %.
  - **Nicht robust:** Die Krümmung je Seite an den Linien messen braucht sechs Schutzregeln. In Florians Hörner-Fall ist es schlechter als
    heute (umgestülpt ab Griff 1, Griff 8 bis 5,9 %, nach Griff 10 läuft die Haut weg). Der Sprung nach dem Verfeinern bleibt (gleiche
    Gewichte); nach der Geometrie halbiert sich der Fehler nur alle 10 Runden.
  - Muster aller drei Anläufe: die Krümmung an den Linien jede Runde an der Haut messen. Wege für Florian: (a) Normalen nach Max allein im
    heutigen Löser prüfen, (b) Krümmung an den Linien als Unbekannte in einem gemeinsamen System, (c) beim heutigen Löser bleiben.
  - **Fallen:**
    - Proben-Ausgabe nicht durch `tail` schicken: Sie kommt erst am Ende, eine laufende Probe sieht dann aus wie eine hängende.
    - Die Auswertung von `form-drei-faelle.mjs` hängt stundenlang, wenn die Haut weggelaufen ist; die Probe prüft das jetzt vorher.
    - Eine Seite ohne Punkte neben der Linie (Winkel zwischen zwei kreuzenden Linien) hat keine bestimmte Krümmung.
- **2026-11-09 (abends, danach): Weg a — Normalen nach Max allein im heutigen Löser** (Florian: „Prüf die Normalen nach Max allein im
  heutigen Löser … Keine neuen Regeln.“; Planseite „Kurven als Wahrheit“, Abschnitt 16; Schalter `?maxnormalen=1`, ohne bitgleich).
  - Kein Hebel gegen das Aufblasen nach dem Loslassen: Hals 6,3 → 6,1, Rüssel 35,5 → 37,2, Hörner im Fenster 21,5 → 22,2 Einheiten. Der
    Sprung kommt aus den gleichen Gewichten, nicht aus den Normalen.
  - Kuppel schlechter (wandert weiter: 137 / −160 statt 163,5 / −141,7).
  - Etwas besser: Nachhinken am Rüssel (0,94 → 0,19) und die schwarzen Stellen bei Griff 11 (19,8 → 13,6 %); dafür dort ein größerer
    Sprung (31,7 → 43,7). Je Mausbewegung etwa 1 ms mehr.
  - Nicht Standard. Gegen den Sprung wirkte bisher nur die Messung nach der Geometrie mit Verfeinern im Zug (Hals 0,36, Rüssel 1,4); ihr
    Nachteil war das Nachhinken.
- **2026-11-09 (abends, danach): Warum Verfeinern die Form ändert, zwei Löser-Tests, Bilanz** (Planseite „Kurven als Wahrheit“,
  Abschnitte 17 und 18).
  - Florians Frage: „warum das verdichtete Mesh überhaupt eine andere Form annimmt … sollte einfach nur abrunden“. Gemessen: Das Maß des
    heutigen Lösers liest dieselbe Fläche nach dem Verfeinern 7–8 % stärker gekrümmt, das Maß nach der Geometrie nur 1,4–2,3 %.
  - Beweis „gleiches Maß beim Messen und Rechnen“ (sein „ja“): schlechter, am ersten Tag angehalten. Meine Erklärung dazu war falsch;
    Abschnitt 12 hatte es schon gemessen.
  - Ursache im Code: Jeder Punkt einer weichen Linie hat eine eigene Zeile „so gebogen wie jetzt“. Die Linien tragen damit ein Gedächtnis.
  - Test „Krümmung an den Linien mitgelöst“ (gemischte Form der Plattengleichung, GMRES; Stand in Commit 476a874f, wieder entfernt): ohne
    Gedächtnis, aber nicht besser als der heutige Weg nach der Geometrie (Ohr Sprung 2,21 statt 1,55), am Rüssel nicht zusammengelaufen,
    400–575 ms je Runde. Eine Kugel mit nur einem Ring ist mit keinem Löser eindeutig (jede Kugel durch den Ring passt).
  - Florians Hörner-Fall im Fenster nach der Geometrie: nach dem Loslassen 4,6 statt 23,3 Einheiten, kaum schwarz (statt 19,8 % bei Griff
    11), 12,4–19,7 ms je Mausbewegung. Sein Urteil vom 08.11. bleibt: ruckelt beim Ziehen, Nachhinken stört mehr als Nachjustieren.
  - Bilanz: Eine weitere Formel am Löser hat gemessen keinen Hebel mehr. Was bleibt, ist Tempo (mehr Runden je Mausbewegung, Verfeinern
    ohne Halt). Entscheidung bei Florian.
- **2026-11-09 (spätabends): Bilanz seit dem 11.10.** (Florian: „… alles nochmal genau zusammenfassen … Kombinationen … bester und
  elegantester Weg … übersehen oder eine alte Regel verfälscht … Browser oder richtige Software“;
  [`docs/research/2026-11-09-bilanz-wesen-editor.md`](docs/research/2026-11-09-bilanz-wesen-editor.md)).
  - Vier Abschnitte: Profile → Loft, Käfig aus Silhouetten, Form aus Ansichten (`form.html`), Kurven als Wahrheit (`kurven.html`). Nur
    der vierte holt die Form aus Linien; er bleibt der Weg. Kein alter Form-Weg wird mit dem Kurven-Prinzip eleganter. Wieder nützlich
    sind die Startform aus einer Seitenzeichnung und der Käfig bzw. das Stücknetz aus den Loops, aber nur fürs Spielnetz.
  - Übersehen oder verfälscht:
    - Die Kern-Probe rechnet viermal so viele Runden je Zug wie das Fenster, das Nachhinken sah dort bis zehnmal kleiner aus.
    - Die Kugel mit einem Ring ist als Test mehrdeutig.
    - Der Geometrie-Löser wurde am Tempo verworfen, nicht an der Form.
    - Die Dichte bleibt nur wegen des Standard-Lösers bei „nach Länge“.
    - Viel Altcode (knapp 16 000 Zeilen in `dicht/`, 17 Schalter); die ganze spiegelgleiche Haut macht jeden Netzschritt teuer.
  - Empfehlung: Prinzip bleibt; der Geometrie-Löser wird Standard, sobald er schnell ist. Dafür kommt der Rechenkern stufenweise aus
    JavaScript heraus, je nach Messung: Worker → WebAssembly → natives Modul in der Electron-App. Vorher aufräumen. Fünf
    Entscheidungen offen.
- **2026-11-10: Unabhängige Gegenprüfung von `kurven.html`** (Florian: „… entweder sehe ich noch Veränderungen beim Loslassen der
  Handles und das Mesh justiert nach oder es ist ungenau und stockt … Gibt es Fehler? … Kann man den Löser noch verbessern?“;
  [`docs/research/2026-11-10-gegenpruefung-kurven-loeser.md`](docs/research/2026-11-10-gegenpruefung-kurven-loeser.md),
  Einzelberichte `docs/research/2026-11-10-gegenpruefung-berichte/`, Messskripte
  `apps/editor/scripts/pruefen/gegenpruefung-2026-11-10/`). Von einer anderen Session, am Code nichts geändert; Entscheidung
  bei Florian.
  - Fünf getrennte Ursachen, vier davon ohne neue Formel behebbar:
    - Die Griffe springen beim Loslassen (der Anzeigefaktor `griffFaktor` wird neu gerechnet).
    - Der Löser rechnet nur im Mausereignis; nach dem Loslassen folgen bis zu fünf sichtbare Stufen.
    - Der Standard-Löser pendelt, die Bremse gibt es nur bei „geometrie“: je Runde Ohr ±0,3–0,6, Rüssel ±2, bei 23 400
      Punkten Ohr ±2,4 und Rüssel 5–26 Einheiten. Mit der Bremse nach 3–4 Runden ruhig.
    - Der Netzwechsel ändert die Form. Ein Ausgleich beim Wechsel nimmt den Sprung (Hals 6,3 → 0,3, Rüssel 35 → 1,0); am
      Rüssel ist er beim Weiterziehen noch nicht gut.
    - `loesenSpalten(rhs, 3)` ist 3,7-mal langsamer als dieselbe Rechnung ausgeschrieben (6,0 → 1,6 ms; Runde 9 → 4,5 ms).
  - Übersehen: `HALT = 1e-6` wirkt im quadrierten Krümmungssystem als Gedächtnis, umso stärker, je dichter das Netz ist (ein
    Ring, 19 000 Punkte: nur 32 % der Korrektur kommen an). Die Form hängt am Weg (Ohr rund 1 Einheit). „Zug ms“ misst nur den
    Löser. Die Kriterien gelten bei 100 % und 5 200 Punkten; Florian arbeitet bei 300 % mit 11 000–26 000 Punkten.
  - Urteile, die nicht tragen: „kein Hebel mehr am Löser, nur Tempo“; „mitgelöst verworfen“ (17 Minuten); „Linien mit Richtung“
    (Idee bestätigt, die Umsetzung scheiterte); „Normalen nach Max an der Kuppel schlechter“ (Artefakt des mehrdeutigen Tests).
    WebAssembly bringt beim Lösen nur das 1,7-Fache über gut geschriebenes JavaScript, beim Zerlegen das 2,4-Fache.
  - Vorschlag: vier Regeln (Kurve sofort; Haut rechnet durchgehend, bis sie steht; Netzwechsel ändert die Form nicht; ein
    Löser, der von selbst zur Ruhe kommt) in acht kleinen Schritten. Größere Wege (linear aus Linien mit Richtung, kleines
    Rechennetz mit glatter Anzeige, mitgelöst sauber, Sofort-Antwort aus dem Griff) erst nach je einer Tagesmessung. Dazu eine
    Werkzeugliste (Präzision im Zug, verdeckte Linien blass, Auswuchs als Operation, Stütz-Loop, Rundreise-Test).
  - Nachtrag (Florian: `?gewichte=geometrie` kam ihm am besten vor, nur zu langsam): Pendeln, `HALT` und Ausgleich betreffen
    nur den Standard-Löser. „geometrie“ ist langsam aus drei Gründen: die Runde (12,8 / 32 / 73 ms bei 5 200 / 11 000 /
    23 400 Punkten, 80–87 % in den zwei Einsetz-Schritten), viel mehr Runden auf dichten Netzen (Rückstand nach einem Zug
    1,4 / 3,5 / 19 Einheiten, 5 / 10 / 30 Runden bis zur Ruhe) und Neuzerlegen im Hauptthread nach jedem Zug (0,2–1,2 s).
    Reihenfolge G1–G6 im Nachtrag des Berichts; das Rechennetz sollte nicht auf 20 000 Punkte wachsen.
  - **Stand 10.11. mittags:** Florian übergibt den Bau an die Sitzung der Gegenprüfung (Übergabe `docs/UEBERGABE.md`). G1
    gebaut (`6eae3883`: Einsetzen ausgeschrieben, bitgleich; Runde „geometrie“ 12,8 → 7,7 / 32 → 15,5 / 73 → 32 ms). G2 gebaut
    (`0f80f0e2`: Griffe in wahrer Länge, `?griffe=mindest` zum Vergleich; Bézier-Pfad auch im Zug; Sprung der Griffspitze beim
    Loslassen 42,5 → 0 px). Florians Blick und seine Entscheidung zur Grifflänge stehen aus; als Nächstes G3.
  - Fallen: Eine Messkopie des Lösers erst mit `MODE=gleichheit` gegen das Original prüfen. Varianten immer auch auf einem
    dichten Netz messen (`DREIECKE=30000`); Pendeln und Kriechen zeigen sich dort zuerst. Neun Prüfer parallel haben Florians
    Wochenlimit aufgebraucht: große Fächer nur nach Rückfrage.
- Die vorhandenen Dokumente (`docs/GDD.md`, `docs/STYLE.md`, `docs/PRODUCTION.md`, ADRs) beschreiben den **Prototyp**. Sie sind Erfahrungsschatz und Ausgangsmaterial, kein Auftrag. Wo der neue Plan abweicht, gilt der neue Plan.
- **Vor jeder Planung lesen:** die aktuelle Übergabe [`docs/UEBERGABE.md`](docs/UEBERGABE.md) mit dem Einstiegsdokument der laufenden Arbeit; für Spiel-Themen zusätzlich [`docs/prototyp/README.md`](docs/prototyp/README.md) (Abschluss, Entscheidungen, Lehren, offene Punkte).

## Grundidee des Wesen-Editors (Florian, 15.10.2026 — über allem)

**Blendshapes und Bones kombinieren, um ganz extreme Posen und Verformungen zu schaffen.** Jede Pose (Fressen, weitere) = Knochen + Blendshape; in der Pose arbeiten alle Werkzeuge exakt wie im Editor (Umrisse gekoppelt, Maullinien, Reifen, Pinsel), das Ergebnis ist der Blendshape. Vor jeder Meldung in jeder Pose mit jedem Werkzeug etwas verschieben (mit und ohne Maul): `apps/editor/scripts/pruefen/fressen-pinsel.mjs` und Nachfolger. Plan: [`docs/plans/2026-10-15-maul-einsatz-harmonie-posen.md`](docs/plans/2026-10-15-maul-einsatz-harmonie-posen.md), Teil B (Posen speichern nur Knochenstellung, Ruhe-Deltas und Linienversätze; Editor-Tab zeigt immer die Grundform; Lippen exakt auf den Pose-Linien; Regler zum Überblenden in „Posen & Leben“). (Dieses Grundkriterium war in der Kern-Umstellung weggefallen und wurde zwei Tage nicht bemerkt; der erste Wiederaufbau „Fressen wie Editor“ ist zurückgenommen.)

## Menschen

- **Florian** (illudiy): Art Direction, alle Entscheidungen, Blender, GPT-Entwürfe, Tests auf dem iPhone 16 („eyePhone (2)“) und dem Mac (M3 Pro). Arbeitet oft von unterwegs über die Claude-App und hat ein Wochenlimit.
- **Nicole**: Tests (Versuche pro Level), Kalibrierdaten, Content.
- Kommunikation **auf Deutsch**, kurz und konkret. Rückfragen nur bei echten Entscheidungen.

## Arbeitsregeln (aus Prototyp 1 gelernt)

1. **Look zuerst beweisen, dann bauen.** Vor größerem Code ein Vergleichsbild bauen (Vorlage und Render nebeneinander, gleiche Ansicht, gleicher Maßstab) und Florian zeigen. Nie Look-Gleichheit versprechen, ohne es getestet zu haben. Wenn ein fertiges Werkzeug (z. B. Meshy) den Look schneller trifft, das früh sagen. (Der prozedurale Wesen-Baukasten kostete einen Tag und blieb weit hinter einem Meshy-Test zurück, den Florian in Minuten gemacht hatte.) Nachtrag 2026-10-05: Bei unbewiesenen Ansätzen nicht „kann ich“ sagen, sondern „ich teste es, Kriterium X“; einen schnellen Test als Test zeigen und nicht als Ergebnis verkaufen (die Mischwesen wurden als „Meshy-Look“ angekündigt und waren unterirdisch).
2. **Früh und oft committen und pushen, Limits einplanen.** Das 5-Stunden-Limit teilen sich alle Sitzungen und Unteragenten (die nach der Limit-Meldung weiterlaufen); bei ≈ 90 % Übergabe schreiben und Agenten committen lassen. Der Cloud-Container ist flüchtig, Sessions enden abrupt am Nutzungslimit. Nach jedem abgeschlossenen Teilschritt pushen; am Ende jedes Arbeitsblocks `docs/UEBERGABE.md` überschreiben (Stand, offen, nächster Schritt). Lokale Sessions auf Florians Mac: nichts ungepusht liegen lassen.
3. **Pläne sofort ins Repo.** Lange Pläne erst als Datei unter `docs/` committen, dann zur Freigabe vorlegen. (Der Plan „Wesen-Baukasten v4“ lag nur in `~/.claude/plans` und wäre mit der Session verloren gegangen.)
4. **Florian testet live.** Den Dev-Server `game-dev` (`.claude/launch.json`, HTTPS 5173) startet Florian; Agenten starten ihn nicht ungefragt. Test-Fenster absprechen, sonst stören Änderungen seine Sitzung.
5. **Parallele Baustellen** in eigenen Git-Arbeitsbäumen mit Zuständigkeit nach Pfaden; Integration durch die Leitung; danach gemeinsam prüfen.
6. **Jede Änderung isoliert prüfen:** `pnpm typecheck`, `pnpm test`, `pnpm lint`, betroffene E2E. GPU-Tests (`e2e/webgpu.spec.ts`, `karte-perf-webgpu.spec.ts`) laufen nur lokal mit echter GPU; CI hat keine GPU (Smoke mit WebGL2/SwiftShader).
7. **Messen statt schätzen.** Leistungsaussagen mit Perf-Badge (fps, p99, Draw Calls) bzw. `?bench=…`; Ziele: iPhone ≥ 58 fps, p99 < 20 ms, 36 Wesen auf dem Brett, Draw Calls ≤ 100.
8. **Texte:** Deutsch, klare Sätze, keine Modellnamen in Commits, Docs oder Code. Nachträge mit Datum statt Altes zu überschreiben (außer `UEBERGABE.md`). Screenshots in `docs/progress/`.

## Cloud-Umgebung: Grenzen

- Keine echte GPU (Chromium mit SwiftShader), kein Blender (das pip-Paket `bpy` 5.0.1 wäre installierbar, ungetestet), iPhone nicht erreichbar.
- Git-Push geht auf Branches, **Tags lehnt der Proxy mit 403 ab** (Archiv deshalb als Branch, z. B. `prototyp-1`); **Branches löschen geht aus der Cloud auch nicht** (Florian löscht auf GitHub). Node 22 reicht für `pnpm install --frozen-lockfile`; Playwright im Repo erwartet eine andere Chromium-Version → `executablePath` auf `/opt/pw-browsers/chromium-1194/chrome-linux/chrome`; Screenshots mit DPR 1.
- Netz über einen Proxy: CDNs wie `cdn.jsdelivr.net` und viele Websites (z. B. meshy.ai, tripo3d.ai, costbench.com) sind gesperrt. npm-Registry und pip gehen. Für Artefakte three.js lokal per npm installieren und im Playwright-Test die CDN-URLs auf die lokale Kopie umleiten.
- Playwright: global unter `/opt/node-tools/node_modules/playwright`, Chromium unter `/opt/pw-browsers` (nicht `playwright install` ausführen). CDN-Skripte im Test per `route.fulfill` aus der lokalen Kopie liefern (`route.continue` auf http geht nicht).
- **Artefakte liefern kein `.glb` aus** (nur Web-Typen wie .json/.txt/.jpg/.png). Meshes deshalb gepackt als gzip+base64-`.txt` laden (`DecompressionStream`), siehe `docs/look/grundblobs/tools/packen.py`.
- **pymeshlab** (texturtreues Ausdünnen) braucht `apt-get install libopengl0 libglu1-mesa`; es liest GLB mit Wedge-UVs, kann Texturen aber nicht schreiben (Textur direkt aus dem GLB lesen) und liefert UVs mit Ursprung unten links (`flipY = true`). Bedingungen in muparser kennen kein `!` (`(...) == 0`).
- Meshy-GLBs mit 1,5 Mio. Dreiecken sprengen den Speicher bei `trimesh.split`: erst ausdünnen, dann schneiden; Nähte (UV) vor Komponenten- und Randberechnung verschweißen.

## Bekannte technische Fallen (nicht wiederholen)

- **iOS-App ≠ Safari:** Die App läuft unter `capacitor://localhost` (kein HTTPS) und bekommt vermutlich WebGL2 statt WebGPU. Fehler „nur in der App“ zuerst im WebGL2/WebKit-Pfad suchen (`?backend=webgl`, `?shadowcompat=manual`). In der App höchstens 60 fps. Auf dem Gerät gibt es keine Sicht auf GPU-/Shaderfehler → Fehleranzeige im Spiel einplanen, sonst Safari-Web-Inspektor mit Debug-Build. (Offener Fall: Kartenboden fehlte nur in der App, `docs/prototyp/README.md` §7.2.)
- **WebKit-Schatten:** `sampler2DShadow` liefert immer 0 → manueller Tiefenvergleich mit `textureLoad` (three r186 erzeugt `textureLod` ohne `.x`; Fix `019cf25`). Ein kaputter Vergleich färbt den Boden in Tinte `#081b25` = Hintergrundfarbe, der Boden wirkt verschwunden.
- **WebGPU braucht HTTPS**, sonst stiller WebGL2-Fallback. Der Perf-Badge zeigt das Backend; `?backend=webgl` erzwingt den Fallback. Der iOS-Simulator kann nur WebGL2; WebGPU nur auf dem Gerät.
- **TSL-Funktions-Cache pro Builder** (`packages/render/src/common/tslFunctionCache.ts`). three.js baut TSL-Layout-Funktionen sonst einmal pro Backend und gibt sie an spätere Pipelines ohne deren Puffer weiter (WGSL „unresolved value NodeBuffer“): Plateau und Wesen waren unsichtbar.
- **three r186 Schatten:** `ShadowNode` zeichnet höchstens einmal je `frameId` und Kamera; mehrere `render()` in einer Aufgabe zeichnen den Schatten nur im ersten. Benchmarks müssen `nodeFrame` je Bild weiterschalten.
- **Draw Calls wachsen mit der Wesen-Vielfalt:** `CreatureMeshBodies.variantFor()` legt ein Mesh pro Formschlüssel an, `PartPool` ein InstancedMesh pro Modul. `BatchedMesh` zeichnet in three r186 (WebGPU) pro Instanz. Der `BlobParamBlock` liegt nahe der 16-KB-Uniform-Grenze. Die Produktions-Architektur muss Vielfalt tragen (ein Draw Call für alle Körper, Zustand als Datentextur).
- **Draw Calls messen** per Hook auf `renderer.info` (nicht am Perf-Badge), erst nach dem Brett-Warmup, Median/Max über 10 Bilder. Große Objekte per Horizont-Formel `acos(R/(R+H))` kullen.
- **Schatten:** Florian will echte, scharfe Schatten ohne Wackeln bei 60 fps; **keine Decal-/aufgelegten Schatten**, Sonne kameragebunden 10°/70°. Wackeln kommt vom Refit je Bild → eingerastete Karte, Slide statt Refit. Bandsplitter bei tiefer Sonne sind keine Risse.
- **Karte:** `rebuildContent` beim Schwenken ist der größte Hauptthread-Posten; Schattenpässe verdoppeln die Draw Calls (Mac-Baseline `docs/progress/karte-perf-mac-baseline.md`, iPhone-Protokoll `karte-perf-iphone16.md`).
- **E2E:** `E2E_PORT` für parallele Läufe; Fetch-Sperrports wie 4190 meiden; nur auf ruhiger Maschine (SwiftShader unter Last → Timeouts); während eines Laufs keine Dateien im Vite-Root ändern (Hot Reload); echte GPU `EE_GPU=1` ist Referenz. CI pro Push nur Typen, Unit-Tests, Lint, Build; E2E wöchentlich oder auf Knopfdruck.
- **Werkzeuge:** JSON-Inhalte nie per `json.dumps` neu schreiben (formatiert die Datei um), gezielt Zeilen ersetzen. macOS: BSD-`sed` (kein `\b`, `-i ''`) → Python; Dateisystem unterscheidet keine Groß-/Kleinschreibung. Vorschau-Tool kann selbstsigniertes HTTPS nicht öffnen → Konfiguration `game-dev-http` (Port 5174).
- **Schrift:** Caprasimo (OFL) mit `unicode-range`, ihre Mathe-Zeichen sind Platzhalter.
- **TSL-Werte in `If`-Zweigen:** Ein Node, den mehrere `If`-Zweige teilen, wird nur im ersten Zweig gebaut, der ihn benutzt — in den anderen ist er 0 (Schuppen, Platten, Punkte, Rosetten, Flecken wurden deshalb nie gezeichnet). Gemeinsame Werte **vor** den Zweigen mit `.toVar()` festhalten. Außerdem macht `hash()` aus three/tsl negative Eingaben zu 0, und die Zellkennung `x + 57·y + 113·z` kollidiert (Streifen im Korn) → `hashPos`/`hash3` in `material/muster.ts` benutzen.
- **three.js-Lichter sind ebenengefiltert:** Wer mit `camera.layers` getrennte Pässe rendert (z. B. Hintergrund für Jelly-Brechung), muss den Lichtern `layers.enableAll()` geben, sonst ist der Pass schwarz. Eine eigene Klasse `Blob` verdeckt das globale `Blob` (TDZ-Fehler) – nicht so nennen.
- **Grundform aus Zeichnung:** Silhouette an der Standlinie spiegeln und per Poisson aufblasen (Dicke ~ √Randabstand), glattes Abstandsfeld statt Voxel (sonst Treppen), weicher Betrag statt |z| (sonst Kante am Rand), nach Marching Cubes nur die größte Komponente behalten (sonst Splitter → Taubin zieht Spitzen). Details, die *vor* dem Körper gezeichnet sind (Füße Stufe 13), liegen nicht in der Silhouette und brauchen Zusatzformen.
- **iPhone-Deploy:** `IOS_TEAM_ID=R67BLW649H IOS_DEVICE="eyePhone (2)" pnpm --filter @ee/game ios:device` (Florians Mac; iPhone entsperrt lassen, sonst nur Installation ohne Start); Details in `docs/IOS.md`. Ein gemeinsamer Deploy am Ende eines Arbeitsblocks, mit parallelen Sessions abgestimmt.

## Projekt-Landkarte

- `packages/core` Regeln und Solver (DOM-frei, gemeinsamer Vertrag) · `packages/genome` Wesen-Daten (SDF-Körper, Module, Vererbung, Fortbewegung) · `packages/physics` · `packages/world` Karte (unendliche Ebene, Route) · `packages/render` three.js WebGPU/TSL.
- `apps/game` Vite + React + Capacitor (Routen `/`, `/play`, `/lab/*`, `/editor/*`, Werkstatt in der App) · `apps/editor` Wesen-Editor als Desktop-App (Electron, Renderer auch im Browser) · `apps/godot` Vergleichstrack (ruht).
- `packages/shape` Wesen-Editor: Bézier-Profile, Dokumentformat `ee-wesen`, Platzhalter-Loft (DOM-frei).
- `content/` alle Inhalte als JSON mit zod-Schemas (Level, Zonen, Route, Genom, REX, Klassik) · `tools/` Blender-Skripte, Export, Level-Werkzeuge · `assets/` Blender-Bibliothek, Florians Referenzen, Schriften.
- `docs/` Pläne (Prototyp-Stand), `docs/prototyp/` Abschluss, `docs/research/` Recherchen, `docs/progress/` Bilder und Messungen.
- Befehle: `pnpm install`, `pnpm dev` (HTTPS), `pnpm editor` (Wesen-Editor, Electron), `pnpm editor:app` (`.app` bauen), `pnpm typecheck`, `pnpm test`, `pnpm lint`, `pnpm e2e`, `pnpm assets:blender`.

## Offene Grundsatzentscheidungen für die Produktion

- **Wesen-Pipeline:** KI-3D (Meshy/Tripo) + Zerlegen in Module + Farbe/Muster im Shader, oder prozedural, oder eine Mischung. Florian testet noch. Material: `docs/research/ki-3d-tools-2026-10.md`, `docs/prototyp/wesen-v4-plan-unbestaetigt.md`.
- **Stack-Gate** (ADR-0001) formal offen: three.js + Capacitor ist der Arbeits-Track und erfüllte auf dem iPhone 16 die Bildratenziele; Godot ruht als Fallback.
- Erlösmodell, Name „early earle“ (Markenrecht), Tierschutz-Modell (GDD §11–12, §15).
