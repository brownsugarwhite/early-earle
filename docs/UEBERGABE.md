# Übergabe (aktueller Stand)

> Diese Datei wird am Ende jedes Arbeitsblocks **überschrieben**: Wo stehen wir, was ist offen, was ist der nächste Schritt. Historie in Git.

**Stand:** 2026-10-12 spätnachts. Sitzungen „Maul, Zähne, Rig“, „Kanten, Ansichten, verbundene Kiefer“, „Spanten“ und „Wirbelsäule“ auf Florians Mac, Vorbereitung der großen Fable-Sitzung ab 13.10.
- Branch `claude/editor-grundlayout`, gepusht. Merge nach `main` erst nach Florians Abnahme.
- Plan: [`docs/plans/2026-10-12-maul-zaehne-rig.md`](plans/2026-10-12-maul-zaehne-rig.md)
- **Ergebnis-Dokument:** [`docs/research/2026-10-12-maul-kiefer-zaehne-augen.md`](research/2026-10-12-maul-kiefer-zaehne-augen.md), als Seite: https://claude.ai/artifact/WG3YJPn4SuL5acnY9yR9s1
- **Nachmittag – Kanten und Ansichten:** Plan [`docs/plans/2026-10-12-kanten-ansichten.md`](plans/2026-10-12-kanten-ansichten.md), Ergebnis [`docs/research/2026-10-12-kanten-ansichten.md`](research/2026-10-12-kanten-ansichten.md) (Antworten auf Florians Fragen, Recherche mit 52 Quellen)
- **Spätnachmittag – Spanten:** Plan [`docs/plans/2026-10-12-spanten.md`](plans/2026-10-12-spanten.md), Ergebnis im Abschnitt „Nachtrag“ von [`docs/research/2026-10-12-kanten-ansichten.md`](research/2026-10-12-kanten-ansichten.md)
- **Abends – Wirbelsäule und ein Netz für alles (Vorschlag mit Versuch):** [`docs/plans/2026-10-12-wirbelsaeule-ein-netz.md`](plans/2026-10-12-wirbelsaeule-ein-netz.md) – **Einstieg für die große Sitzung**, vier Entscheidungen für Florian in Abschnitt 7
- Gedächtnis des Editors: [`apps/editor/CLAUDE.md`](../apps/editor/CLAUDE.md)

Vorher: Grundlayout, Navigation und Kurven (11.10.) siehe `git show 902965d:docs/UEBERGABE.md`, alte Wesen-Werkstatt `git show 6029362:docs/UEBERGABE.md`.

## Florians Auftrag (12.10.)

Ablauf:
1. Körper aus Silhouetten und Kanten.
2. Maul-Tab (blau): Linie ab Achse bzw. Kontur bis zum Mundwinkel.
3. Kiefer gleich oder getrennt schon geschlossen (Überbiss, Unterbiss, Lippenbreite).
4. Offener Zustand. Das Maul wird automatisch ins Netz geschnitten, die Tasche morpht.
5. Zahn-Tab (braun): Anzahl je Kiefer, Zahnmenü (Rundheit, Schärfe, Neigung); Riesenzähne offen größer.

Dazu:
- Rig-Tab in allen Viewports, Augen evtl. als eigener Tab (Schlitzauge bleibt).
- **Seitenleiste rechts immer offen.**
- Danach Beine, Flügel, Schuppen, Muster, Shading. Die Wesen sollen dynamisch bleiben, Varianten erzeugt der Assistent selbst.

**Florians Frage zu den Lofts (12.10.):** Wir bleiben bei **Shapes → Loft → Käfig**.
- Der Loft (Querschnitte aus den drei Profilen) legt die Form fest.
- Der Catmull-Clark-Käfig ist das Netz darüber: Kanten, Maulschnitt, feste Topologie.
- Lange Hälse brauchen einen Loft entlang einer gebogenen Wirbelsäule.

## Was steht

**Abends** (Florian: Hals nach oben mit Kopf darauf muss gehen; eine Ansicht formt unerwartet die andere, auch bei Spanten; schöne Formen und Kanten sind schwer; Fressen muss das ganze Netz bearbeiten können; Maul geschlossen verbunden; „sind die Techniken optimal kombiniert?“):
- **Antwort:** Nein, noch nicht. Es gibt vier Bauwege (Platzhalter-Loft, Kanten-, Maul-, Tiger-Käfig), und die Front ist zugleich Umriss, Querschnitt für alles und Hauptspant. Der Vorschlag ist ein Netz auf einer Wirbelsäule (Plan oben).
- **Versuch Wirbelsäule** (`packages/shape/src/versuch/wirbelsaeule.ts`, Editor `?versuch=wirbel&wesen=langhals|robbe|rex|tiger|kugel`, Bilder `apps/editor/scripts/wirbel-bilder.mjs`):
  - Seitenumriss → Rücken- und Bauchlinie → Wirbelsäule (Mitte der kürzesten Leiter, geglättet, gerade Enden) → Ringe senkrecht dazu.
  - Breite je Ring aus Top (liegend) oder Front (stehend), Flanke liegender Teile aus der Front, Pole an den Spitzen.
  - Langhals: Hals hoch, Kopf drauf; Umriss Seite 5 px, Front 5 px, Top 14 px (max).
  - Pose „Biegen“ als Gelenkkette mit gleicher Topologie (`wirbelBiegen`, `kaefigAusSprossen`).
  - Bilder `docs/progress/editor/wirbel-*.png`.
- **Grenzen:** Querschnitt im Versuch nur zwei Viertelellipsen (Front bei Robbe/Rex bis 16 px daneben), Kastenschnauze wird rund (braucht Kappe), Innenseite starker Biegungen staucht, kleine Durchdringungen an den Polen.
- **Zum Vergleichen eingebaut** (Florian: „so einbauen, dass ich es vergleichen kann“):
  - Tab „creation · wirbelsäule“ am 3D-Fenster.
  - Wirbelsäule und Sprossen in der Seite, 3D-Umriss gestrichelt in allen Ansichten.
  - Seitenleiste mit Regler „Biegen“ und „Stelle“ (nur Vorschau).
  - Liegende Wesen haben die Front samt Spanten als Querschnitt.
  - Code `apps/editor/src/wirbel/`, E2E `wirbel.spec.ts`.
- **Maul an der Umrisslinie** (Florian: „Maulspalt wie bei der Fressen-Pose, nur so sauber Über- oder Unterbiss“):
  - Die Maulanfänge sind Knoten des Seitenumrisses. Ziehen bewegt den Knoten, und der Umriss geht mit (Unterbiss, Überbiss).
  - Geschlossen mit getrennten Kiefern zeigt der Umriss den Spalt.
  - Code `packages/shape/src/versuch/maulUmriss.ts`, `MaulEbene.tsx`; E2E in `maul.spec.ts`.
- **Recherche** (31 Quellen) steht in Abschnitt 8 des Plans.

**Nachts** (Florian: Wirbelsäule selbst zeichnen, Maul mit Wirbelsäule, Form im Fressen-Tab; Plan und Ergebnis [`docs/plans/2026-10-12-wirbelsaeule-maul-fressen.md`](plans/2026-10-12-wirbelsaeule-maul-fressen.md)):
- **Wirbelsäule selbst zeichnen** (`dok.wirbelsaeule`): Seitenleiste „selbst zeichnen“, „Vorschlag übernehmen“, „automatisch“. Punkte ziehen verlegt die Ringe, der Umriss bleibt.
- **Form im Fressen-Tab** (`dok.posenProfile.fressen.seite`):
  - Die Seite bearbeitet die Pose-Form mit gleicher Punktstruktur, die offenen Maulanfänge sind ihre Punkte.
  - Im 3D legt sich die offene Haut an die Pose-Form.
  - Fressen-Tab = Öffnung 100 %, Editor-Tab = 0 %.
- **Maul auf der Wirbelsäule:** Der Maul-Käfig läuft im gestreckten Raum (`wirbelMaul.ts`), mit Zähnen, zu und offen.
- **Grenzen:**
  - Beginnt das Maul weit hinter der Schnauzenspitze, trägt die Kappe die ganze Schnauze, die Stirn wird im 3D flacher (≈ 10 px); es braucht Schnauzenringe im Maul-Käfig.
  - Biegen mit Maul fehlt noch.
  - Mit stehenden Teilen sind die Querschnitte oval.

**Spätnachts** (Florian: „Das Maul macht kein Loch in den Shape mehr, bei Fressen sind die Kiefer nicht mal mehr mit dem Shape verbunden“; Nachtrag im Plan [`docs/plans/2026-10-12-wirbelsaeule-maul-fressen.md`](plans/2026-10-12-wirbelsaeule-maul-fressen.md)):
- **Ursachen:** Der Spalt suchte die Maulanfänge nur über ihre Lage. Die Kinnseite kam aus der Höhe der Nachbarknoten und war an der Kopfunterseite zufällig die Schnauze. Bei Kiefer gleich war der Kinngriff über den Spalt hinweg gedreht.
- **Jetzt:** Maulanfänge über Knotennummern (Umriss und Pose-Form), Kinnseite über den Winkel zur Maulrichtung, Reparatur beim Laden (fehlende oder vertauschte Anfänge), Griffe je Kieferseite, gestrichelter 3D-Umriss nur aus der Haut.
- **Tests:** `maulUmriss.test.ts` (9), E2E „Kiefer bleiben verbunden“ und „Maul an der Kopfunterseite“; Bilder `fressen-verbunden.png`, `fressen-unterseite.png`.

**Spätnachmittag** (Florian: „Mach das mit den Spanten mal“ und „Kanten und Härten scheinen mir noch nicht ganz schlüssig“):
- **Regel:** Eine Kante ist eine Ecke in einem Shape. Ecke in Seite/Top = Kante quer, Ecke in einem Spant = Kante längs. Der Winkel kommt aus der Form, die Härte ist die Rundung.
  - Gemessen: Spant-Ecke mit 100 % knickt um 43°, eine freie Linie mit 100 % um 13° (`kanten.test.ts`, Test „Spant-Ecke“).
- **Spanten** (`packages/shape/src/spanten.ts`, Editor `src/spanten/SpantEbene.tsx`):
  - Werkzeug S setzt einen Querschnitt in Seite oder Top. Spantlinien S1 … Sn und Hauptspant H lassen sich ziehen.
  - Front zeigt die vorderen, Back die hinteren Spanten. Der gewählte wird wie ein Profil bearbeitet; ⌥ macht eine Ecke, die als Längskante in Seite und Top erscheint.
  - P, + und − wirken in allen Spanten und der Front (gleiche Punktstruktur). Seitenleiste mit Formvorschau, Lage, „wie Hauptspant“, löschen.
- **Rechnung:**
  - Normiert auf den Kasten aus Seite und Top, Hauptspant = Front an der dicksten Stelle.
  - Lineare Überblendung Punkt für Punkt; ein neuer Spant ändert die Form nicht.
  - Loft, Ringe und Kanten-Käfig holen den Querschnitt je Station (`vorlageBei`); ohne Spanten bleibt alles wie vorher.
- **Datenmodell:** `dok.spanten?: { f, profil }[]`, `dok.hauptspant?: number`.
- **Tests:** `spanten.test.ts` (8), `kanten.test.ts` (Spant-Ecke), E2E `spanten.spec.ts`. Alle 16 E2E grün.
- **Bilder:** `docs/progress/editor/spanten-schnauze-{editor,3d,zebra}.png`, `spanten-tab.png`.
- **Kopplung der Ansichten umgestellt** (Florian, abends):
  - Beim Bearbeiten wandert in den anderen Ansichten nur der entsprechende Punkt mit seinen Griffen. Punkte bis 5 % darunter gehen anteilig mit, alles andere bleibt.
  - Beim Laden bleibt die verteilte Korrektur.
  - Code `kopplung.ts` (`KOPPEL_BAND`), Bild `kopplung-punkt.png`.
- Antworten auf „oberer/unterer Spant?“ und „hat das 3D mit dem Wesen zu tun?“ im Nachtrag des Ergebnis-Dokuments.

**Nachmittag (Florians Rückmeldung 12.10. mittags):**
- **Kiefer verbunden:**
  - Gemeinsamer Mundwinkel für Ober- und Unterlinie (`mundwinkelVerbinden`), der offene Vorschlag dreht um den Mundwinkel.
  - Der Maulanfang klebt an der Seitenkontur (`maulAnKontur`).
  - Im Fressen-Tab zeigt jede Ansicht den Umriss des geöffneten 3D-Körpers (nur Haut, Kerbe an den Lippen; `umrissAusNetz`, `src/maul/offenerUmriss.ts`).
- **Kantenlinien im Form-Tab** (`src/kanten/`):
  - Zeichenstift auf freier Fläche; Knoten liegen auf der Fläche (Blickrichtung je Ansicht, stetig beim Ziehen) und folgen Formänderungen.
  - Härte je Knoten. Darstellung gestrichelt (zoomfest, längere Striche mit wachsender Härte) bis schwarz 3 px.
  - Einstellen über Regler, Stufen, „weich auslaufen“ und das Breitenwerkzeug ⇧W (Kreis = Härte).
  - Kantenliste und Ebenenschalter (zeigen, blass, aus).
- **Ecken der Silhouetten:** Härte je Eckpunkt (Regler, ⇧W). Sie erscheinen als Kanten in den anderen Ansichten (`eckKanten`), ein Klick wählt die Ecke.
- **Back und Bottom:** Tab am Viewport-Titel, echte Spiegelung, verdeckte Linien blass.
- **Datenmodell:** `dok.kanten?: Kante[]`, Profil-Knoten `haerte?` (Rundreise getestet).
- **Tests:** E2E `kanten.spec.ts` (neu), `maul.spec.ts`; Unit `linie3d.test.ts`, `umriss3d.test.ts`, `kantenFlaeche.test.ts`.
- **3D-Kanten** (`packages/shape/src/versuch/kanten.ts`, Editor `src/kanten/kantenKoerper.ts`):
  - Mit Kanten oder Ecken baut das 3D einen Käfig aus den Profilen mit Kantenschärfe nach der Härte. Die Tiefe (+ Grat, − Rinne) verschiebt die Ziele.
  - Die gewählte Kante erscheint türkis im 3D, dazu gibt es Zebrastreifen.
  - Befund: Härte macht schärfer, nicht tiefer. Tief wird eine Kante über eine Ecke der Silhouette oder die Tiefe.
  - Grenzen: schräge Linien, Linien im Gesicht, noch nicht zusammen mit dem Maul-Käfig.

**Vormittag:**

**Bedien-Versuch im Editor** (E2E `apps/editor/e2e/maul.spec.ts` plus die 12 bisherigen, alle grün mit WebGPU):
- **Seitenleiste immer offen:** Tab-Menü oben, Library unten (aufklappbar, ⌘L). Die Viewports sind 604 px breit, das maximierte Quadrat 988 px.
- **Tab-Punkte:** braun Zähne, blau Maul, weiß Augen (Platzhalter), orange Rig (auch im 3D), pink vergrößern. Zustand `ebene` in `uiStore`.
- **Maul-Tab:**
  - Zeichenstift: Der Start rastet auf Achse bzw. Kontur ein, Punkte holen ihre Tiefe von der Fläche (`src/maul/maulFlaeche.ts`), Enter beendet.
  - Bearbeiten über 3D-Knoten, je Ansicht zwei Koordinaten (`packages/shape/src/versuch/linie3d.ts`).
  - Kiefer gleich/getrennt, Tab Fressen = offen (Vorschlag aus „zu“).
  - Regler „Öffnung“; das 3D baut beim Loslassen (`src/maul/maulKoerper.ts`).
- **Zahn-Tab:**
  - Anzahl je Kiefer, symmetrisch gesetzt; Regler je Zahn (im Tab Fressen für offen).
  - Die Zähne erscheinen **im 3D** am Zahnfleisch und folgen Öffnung, Knochen und Korrektur.
  - Seite und Front zeigen sie als Umrisse (`src/maul/ZahnEbene.tsx`): Klick wählt, Ziehen verschiebt längs des Zahnfleischs, der Spiegelpartner folgt.
  - Zähne, die geschlossen stören, sind rot (2D und 3D). Befund und Vorschläge stehen in der Leiste, ein Klick übernimmt.
- **⌘Z nach Reglern** wirkt jetzt. Vorher schluckte der fokussierte Regler das Kürzel.
- **Rig-Tab:** Anzeige der geschätzten Gelenke und Knochen (`src/maul/RigZeichnung.tsx`).
- **Dokument:** `maul` (3D-Lippenlinien zu/auf) und `zaehne` (Zahnreihen mit Werten für offen), optional in Version 0 (`packages/shape/src/dokument.ts`), Rundreise getestet.

**Technik-Versuche** (`packages/shape/src/versuch/`, Tests grün):

| Datei | Inhalt |
|---|---|
| `maul.ts` | Maul-Käfig mit fester Topologie (378 Punkte). Naht mit oberer/unterer Kopie und Reißverschluss bis zum offenen Mundwinkel; Ringe auf die Linie verteilt, mit Lippenband. Tasche: geschlossen eine Linse, offen eine Bohne. Getrennte Unterlippe, verdeckt nach innen. Offene Haut per ARAP an Lippen und offener Seitensilhouette. `maulZwischen` mit Knochen + Korrektur, `reissverschluss` |
| `kiefer.ts` | Starre Anpassung (Horn), Schraubachse, Öffnungsart, LBS, ARAP; synthetisch exakt (`kiefer.test.ts`) |
| `flaechenlinie.ts` | Linie auf der Fläche (Strahlraster auf S0), Ziehen in jeder Ansicht, Konsistenzmaß |
| `pruefen.ts` | Selbstdurchdringung (mit Bereichen), Orientierung, Randketten durch Unterteilungen |
| `vorlagen.ts`, `vorlagen/*.json` | Tiger, Rex, Robbe, Langhals als Testvorlagen |
| `zaehne.ts` | Zähne am Zahnfleisch (feste Stelle u, Rahmen zum Gegenkiefer, Form, „außen“, Werte für offen), Netze, Prüfung im geschlossenen Maul mit Vorschlägen; 12 Tests |

- **Nachgezogen:** Rex, Robbe und Langhals aus Florians Bögen (`apps/editor/scripts/nachziehen/`, Daten unter `apps/editor/public/versuch/<wesen>/`, Prüfbögen `docs/progress/editor/nachziehen-*.png`).
- **Augen-Versuch:** Florians Augenumrisse sind auf die Haut gemalt (Rex Mandel, Robbe Knopf, Langhals Schlitz) und fahren mit dem Schädel mit (`docs/progress/editor/augen-*.png`).
- **Rex mit Zähnen:** 14 Oberzähne außen nach Bogen 06 (`zaehne-rex-*.png`, `vergleich-zaehne-rex.png`). Die Prüfung meldet 4: Überlappung an der Schnauzenspitze, 0,7 px im Unterkiefer, 0,9 px zu wenig Luft.
- **Ansehen:** `?versuch=maul&wesen=tiger|rex|robbe|langhals&zustand=zu|0.5|auf&kaefig=1&nah=1` (`&zaehne=0` ohne Zähne). Bilder macht `node apps/editor/scripts/maul-bilder.mjs <wesen> [ordner] [zustände] [azimut]`.

**Wichtigste Messwerte:**
- Lippenkante 1,5–2,8 px genau.
- Gelenkschätzung synthetisch < 0,1°.
- Rex: Unterkiefer 52°, Restanteil 25 % (gemischt). Robbe: Ziehen. Tiger: Unterkiefer gedehnt (+61 %). Langhals: Kopf kippt 36°.
- Florians Ansichten widersprechen sich: offen bis 20 px, Rex Breite Front/Top 7–9 %.

## Offen (Reihenfolge für die große Sitzung)

1. **Wirbelsäulen-Netz als einziger Bauweg** (Versuch steht, Plan `docs/plans/2026-10-12-wirbelsaeule-ein-netz.md`, Reihenfolge dort in Abschnitt 6). Dazu Posen mit gleicher Punktstruktur, Fressen frei bearbeitbar.
2. **Durchdringungen beseitigen.** Geschlossen sind es 130 (Tiger) bis 1100 Dreieckspaare, offen 300 bis 2100. Ursachen (Rückverfolgung auf Käfigflächen):
   - Ein einzelner Mundwinkelpunkt → Mundwinkel-Zone mit Halbwinkel-Knochen.
   - Die Anpassung schwingt über → Ausgleich mit Laplace-Regularisierung, Grenzmasken.
   - Tasche gegen Lippen → Tasche als Versatz der Kiefer-Innenflächen plus Schieben per Abstandsfeld; beim Überbiss eine S-Spalte.
   - Der Unterkiefer schwenkt in Kehle oder Boden → Kehlkette und Bodengrenze.
3. **Zähne:** Der Versuch steht. Zu entscheiden bzw. zu bauen:
   - Rahmen je Öffnungsart (Kippen am Knochen, Ziehen an den Lippen).
   - Option „senkrecht in der Seite“: Im Rex-Bogen stehen die Zähne senkrecht, im Versuch kippen sie nach hinten.
   - Berührung erlauben, Prüfung auch offen und bei Zwischenstufen.
4. **Rig-Tab bearbeitbar:** Gelenk ziehen, die Linien folgen dem Knochen (Korrektur relativ zum Kiefer).
5. **Augen-Tab:**
   - An der Fläche verankert (Käfigfläche plus Lage) statt starr am Kiefer. Beim Langhals sinkt das starre Auge offen ein.
   - Gemalt als Abstandsfeld im Körpershader (Schlitz, Knopf, Mandel, Ausdruck), danach Kugel und Mandel mit Lidöffnung im Netz.
6. **Spiel-Laufzeit:** Skinning, höchstens 3 Morph-Ziele, Reißverschluss als Attribut je Punkt. Danach Beine (Rig-Vorlagen und Gangtabelle nach Spore) und der Variantengenerator.

Außerdem:
- **Florians Abnahme** steht aus:
  - Bedienung (Seitenleiste, Tab-Punkte, Farben für Rig und Augen sind vorläufig)
  - Grundlayout, Glas, Ornament (Entwürfe von mir)
- Kein Schließen-Schutz, kein App-Icon (wie 11.10.).

**Offen aus dem Nachmittag** (siehe `docs/research/2026-10-12-kanten-ansichten.md`, Abschnitte 1, 4, 5):
- ~~Spanten~~ gebaut (spätnachmittags). Offen daraus:
  - Freie Kantenlinien bekommen einen Knickwinkel statt der Tiefe (dann haben sie Winkel und Härte wie Ecken).
  - Die Längskante eines Spants in der Seite direkt ziehbar machen (ändert den Spant-Punkt).
  - Überblendung linear oder kubisch (glatter, dafür ändert ein neuer Spant die Form leicht): nach Florians Test entscheiden.
  - Spantenriss als eigene Ansicht (links hinten, rechts vorn) wäre eine Alternative; Back bleibt vorerst.
- Kanten zusammen mit dem Maul-Käfig; Netz entlang beliebiger Linien (Quad-Netz aus einem Kurvennetz) statt fester Ringe.
- Härte als Radius relativ zur Körpergröße speichern; die Kantenschärfe hängt an der Käfigdichte.
- Knick oben an der Schnauze im offenen Umriss (Grenze der Kiefergewichte).
- Eigene Pose-Profile für Fressen (heute folgt der Körper automatisch).

## Nächster Schritt

Florian entscheidet die vier Punkte in Abschnitt 7 des Plans `docs/plans/2026-10-12-wirbelsaeule-ein-netz.md` (Wirbelsäulen-Netz als einzige Bauweise, Biegen beim Ziehen, Front als echter Umriss plus Spantenriss, Fressen als frei bearbeitbare Pose). Danach baut die große Sitzung nach Abschnitt 6. Außerdem offen: Knickwinkel für freie Linien, Überblendung linear oder kubisch.

Einstieg für Fable:
- `docs/research/2026-10-12-maul-kiefer-zaehne-augen.md`, Abschnitte 4–6
- `packages/shape/src/versuch/maul.ts`
- `apps/editor/src/maul/`
