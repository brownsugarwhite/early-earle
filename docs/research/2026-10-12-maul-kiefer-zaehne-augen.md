# Maul, Kiefer, Zähne, Rig und Augen: Recherche und Versuche (12.10.2026)

> Für Florian und die große Sitzung ab 13.10. Grundlage: Florians Ablauf vom 12.10. (Plan
> [`docs/plans/2026-10-12-maul-zaehne-rig.md`](../plans/2026-10-12-maul-zaehne-rig.md)), seine Bögen
> [`docs/look/editor/04–06`](../look/editor/) und die 19 Referenzbögen ([`docs/look/wesen-refs/`](../look/wesen-refs/)).
> Alles hier ist **Versuch**: Es beweist Machbarkeit und zeigt Grenzen, es ist nicht die fertige Bauweise.

## Kurzfassung

1. **Der Ablauf trägt.** Körper → Maullinie → Kiefer gleich oder getrennt → offener Zustand → Zähne → Rig entspricht dem Aufbau von Maul-Rigs in Film und Spiel (Innenlippe setzt die Außenlippe fort, Tasche reihenweise, Kiefer als Knochen plus Korrektur). Ein fertiges Werkzeug, das zwei Ansichten zu einem Wesen mit Maul und Zähnen macht, gibt es nicht (B2). Der nächste Forschungsprototyp (Huang u. a. 2022) nutzt Vorder- und Seitenzeichnung und koppelt beide über die gemeinsame Höhe, wie Florians Bögen es tun.
2. **Im Editor ausprobierbar** (Branch `claude/editor-grundlayout`):
   - Seitenleiste rechts ist immer offen.
   - Tab-Punkte in jeder Ansicht: braun Zähne, blau Maul, orange Rig, weiß Augen (folgt).
   - Maullinie ab Achse bzw. Kontur zeichnen. Neue Punkte rasten auf der Fläche ein, Enter beendet.
   - Kiefer gleich oder getrennt, offener Zustand im Tab Fressen.
   - Regler „Öffnung“, Zahnanzahl je Kiefer mit Zahnmenü. Die Rig-Anzeige zeigt das vorgeschlagene Gelenk.
   - Zähne im 3D und als Umrisse in Seite und Front: Klick wählt, Ziehen verschiebt längs des Zahnfleischs. Zähne, die geschlossen stören, werden rot, mit Vorschlägen per Klick.
3. **Maul im Netz funktioniert im Prinzip** (Tiger, Rex, Robbe, Langhals):
   - Die Topologie ist fest: 378 Käfigpunkte für jedes Wesen und jeden Zustand.
   - Die Lippenkante liegt auf Florians Linien, Abweichung 1,5–2,8 px.
   - Ein Reißverschluss trägt den wandernden Mundwinkel, die Tasche ist geschlossen flach und offen eine Bohne.
   - Zwischenstufen kommen aus Knochen plus Korrektur.
   - **Offen ist die Sauberkeit:** An Mundwinkeln, Lippenkanten und in der Tasche durchdringen sich noch Flächen. Ursachen und Abhilfe stehen in Abschnitt 4.
   - **Zähne** hängen am Zahnfleisch und folgen jedem Zustand, die Wurzel liegt exakt auf dem Zahnfleisch. Rex: 14 Oberzähne außen nach Bogen 06 (Abschnitt 3.4).
   - **Augen** sind gemalt auf der Haut (Schlitz, Knopf, Mandel) und fahren mit dem Schädel mit (Abschnitt 3.5).
4. **Drei Denkfehler, die das System auffangen muss:**
   - Lange Hälse brauchen eine Wirbelsäule statt Ringen entlang x (Langhals-Versuch).
   - Gezeichnete Ansichten widersprechen sich: offen bis 20 px, beim Rex Breite Front/Top 7–9 %. Deshalb muss die Kopplung die gemeinsame Koordinate führen.
   - Riesige Zähne passen geschlossen nicht. Florians Lösung (offen größer) ist richtig und braucht eine Kollisionsprüfung. Die Prüfung ist gebaut und schlägt Lösungen vor (Abschnitt 3.4).
5. **Dynamik und Varianten** gehen, wenn das Dokument nur Absicht speichert und alles daraus neu gebaut wird.
   - Feste Grundtopologie, Anker auf der Fläche bzw. der Wirbelsäule und benannte Zustände wie `maul.auf` und `auge.zu`, wie bei Spore.
   - Varianten entstehen durch Mischen, Teile-Tausch und Mutation, mit Florians Auswahl als Stilmaß (B4).

## 1. Florians Ablauf: was passt, wo es hakt (mit Belegen)

| Schritt | Einschätzung | Beleg |
|---|---|---|
| Start an der Spiegelachse (Front/Top) bzw. der Außenkontur (Seite) | **richtig**: Beides ist derselbe Punkt auf der Mittelebene | Versuch D1, E2E `maul.spec.ts`: Start rastet auf die Kontur, z = 0 |
| Maullinie in Seite und Front | Florian zeichnet je Linie in beiden Ansichten **gleich viele Punkte**, verteilt sie aber je Ansicht gleichmäßig entlang der Linie. Höhen stimmen nur an Start und Mundwinkel genau (Mitte bis 20 px Abweichung) | Nachziehen: Tiger zu ≤ 1,9 px, Rex zu 10–11 px, Rex offen 20,5 px, Robbe offen 11,9 px |
| Kiefer gleich/getrennt schon geschlossen (Überbiss, Unterbiss, Lippenbreite) | **richtig und nötig**: schafft Platz für Zähne. Die verdeckte Lippe muss nach innen | Rex: blauer Start 24 px innerhalb des Umrisses; Versuch setzt die verdeckte Unterlippe nach innen |
| Offener Zustand mit eigenen Linien und Silhouetten | **richtig**; der Mundwinkel wandert beim Öffnen (Tiger 58 px), deshalb **Reißverschluss**: Die Naht hat die offene Länge und ist geschlossen teils zu | Tiger-Bilder: geschlossen nur der vordere Teil sichtbar, bei 35 % öffnet vorn zuerst |
| Maul automatisch ins Netz | **machbar** mit fester Topologie; Lippenkante 1,5–2,8 px genau | Abschnitt 3 |
| Maultasche geschlossen so, dass sie optimal morpht | **machbar**: geschlossen flache Linse, offen Bohne; gleiche Punkte | Abschnitt 3 |
| Zähne immer richtig | **gebaut**: Jeder Zahn hängt an einer festen Stelle des Zahnfleischs und folgt jedem Zustand | Zahn-Versuch: Wurzel exakt auf dem Zahnfleisch zu, 50 %, offen (Abschnitt 3.4) |
| Riesenzähne offen größer | **richtig** (bewährter Trickfilm-Kniff); geschlossen braucht es eine Kollisionsprüfung | Prüfung gebaut: Tiger mit 6 langen Zähnen 5,7–11,1 px im Unterkiefer, jeder Vorschlag (außen, kürzen, offen größer) macht sie frei |
| Rig-Tab: Knochen zu/auf bearbeiten | **richtig**, aber Linien und Knochen dürfen sich nicht widersprechen: Knochen = Bewegung, Linien = Feinform relativ zum Kiefer | Gelenkschätzung exakt (synthetisch 0,1°), Rex: Unterkiefer 52°, Oberkiefer 16° |
| Augen als eigener Tab | **ja**: ein Auge ist ein kleines Maul (Lidlinien, Winkel, Blinzeln = zu, Augapfel innen); Schlitzauge bleibt gemalt | Recherche B3 |

**Denkfehler und Schwächen:**
1. **Eine Linie, drei Ansichten.**
   - Gezeichnet widersprechen sich die Ansichten (siehe Tabelle). Im Editor ist deshalb jeder Lippenpunkt ein 3D-Punkt, und jede Ansicht bearbeitet zwei seiner Koordinaten.
   - Die gemeinsame Koordinate ist damit automatisch gekoppelt. Neu gesetzte Punkte holen ihre Tiefe von der Fläche („Face Project“).
   - Weil Florian die Punkte je Ansicht gleichmäßig verteilt, entsprechen sich die Punkte über den **Bogenanteil**, nicht über die Höhe.
2. **Linien und Knochen.**
   - Bearbeitet man beides frei, widersprechen sie sich. Regel: Der Knochen trägt die starre Drehung (Gelenk aus „zu“ und „auf“ geschätzt), die Linien speichern die Feinform relativ zum Kiefer.
   - Daraus entsteht die Korrektur-Blendshape. Dreht Florian den Knochen, folgen die Linien.
3. **Zwei Öffnungsarten.**
   - *Kippen* (Rex, Schnabel) braucht Knochen, sonst schrumpft der Kiefer in der Mitte (−13 % bei 60°, −29 % bei 90°).
   - *Ziehen* (Robbe: Vorhang bis zum Boden; Langhals: Reißverschluss den Hals hinab) ist Blendshape.
   - Gemessen: Rex gemischt (Unterkiefer 52°, Rest 25 %), Robbe Ziehen (Rest 35 %, Oberkiefer nur verschoben), Tiger Ziehen (Unterkiefer wird 61 % länger).
4. **Riesenmäuler** (Robbe, Langhals, Stacheldrache):
   - Die Tasche ist so groß wie die Brust und dehnt sich bis etwa 3×.
   - Der Unterkiefer schwenkt in Kehle oder Boden (Rex: Kinn 30 px unter dem Boden).
   - Abhilfe: Kehlkette wie in der alten Werkstatt, Bodengrenze, eigene Zwischenform bei 50 %.
5. **Lange Hälse.**
   - Ringe entlang x können keinen Kopf über einem senkrechten Hals bilden; der Langhals-Versuch zerfällt sichtbar.
   - Abhilfe: Wirbelsäule aus der Mittelachse der Seitensilhouette (beschnitten und geglättet wie bei Teddy und RigMesh), Ringe senkrecht dazu. Sie ist zugleich die Knochenkette.
6. **Ein Mundwinkel-Punkt reicht nicht.** Bei 90–120° Öffnung klafft der Winkel um 2·d·sin(θ/2) auf. Besser ist eine kleine Zone aus ein bis zwei Übergangsflächen, dazu ein Halbwinkel-Knochen am Winkel (B1).
7. **Augen nicht als Kugel mit Kappe** (das war „oft verzogen“).
   - Gemalte Augen (SDF im Körpershader) für Schlitz, Knopf und Ausdruck.
   - Geformte Augen (Lidöffnung im Netz plus Augapfel, Lidknochen im Augenmittelpunkt) für Kugel und Mandel (B3).

## 2. Bedien-Versuch im Editor (zum Ausprobieren)

Web-Modus (`pnpm --filter @ee/editor dev:web`, Port 5180) oder als App (`pnpm editor`):

- **Seitenleiste rechts, immer offen** (Florian 12.10.).
  - Oben steht das Menü des aktiven Tabs, darunter die Library (aufklappbar, ⌘L).
  - Die Viewports sind dadurch schmaler. Das maximierte Quadrat ist 988 px groß statt 1037 px. Die Gestaltung der Leiste ist mein Entwurf.
- **Tab-Punkte** oben rechts in jeder Ansicht:
  - braun = Zähne, blau = Maul, weiß = Augen (folgt), orange = Rig (auch im 3D), pink = vergrößern
  - Ein zweiter Klick führt zurück zur Form. Die Farben für Rig und Augen sind vorläufig.
- **Maul (blau):**
  - Zeichenstift:
    - Der erste Klick rastet auf die Achse (Front) bzw. die Außenkontur (Seite) ein.
    - Jeder weitere Klick setzt einen Punkt. Seine dritte Koordinate kommt von der Fläche.
    - Enter oder Doppelklick beendet die Linie, der letzte Punkt wird der Mundwinkel (schwarz).
  - Danach bearbeiten wie die Profile: Punkt wählen und ziehen, Griffe mit ⌥, P/+/− zum Einfügen und Löschen.
  - Farben wie in den Bögen: türkis = Kiefer gleich, rot und blau = getrennt.
  - „Kiefer gleich/getrennt“ in der Leiste oder per Rechtsklick.
  - Tab Fressen = offener Zustand: Zuerst steht ein Vorschlag (Unterkiefer 30° gedreht); jede Bearbeitung macht ihn zu eigenen Linien.
- **3D:** Körper mit Maul, Rachen (maroon), Lippenband (cremerosa), Regler „Öffnung“ 0–100 % (Knochen plus Korrektur, mit Reißverschluss). Gebaut wird beim Loslassen (≈ 0,4 s).
- **Zähne (braun):**
  - Anzahl je Kiefer (−/+); die Zähne werden symmetrisch gesetzt, bei ungerader Zahl steht einer auf der Achse.
  - Die Zähne erscheinen im 3D und als Umrisse in Seite und Front.
  - Ein Klick wählt einen Zahn. Ziehen verschiebt ihn längs des Zahnfleischs; der Spiegelpartner folgt.
  - Der gewählte Zahn hat Regler für Länge, Breite, Rundheit, Schärfe, Neigung, Biegung, Spreizung und „außen“.
  - Im Tab Fressen gelten die Regler für den offenen Zustand.
  - Zähne, die geschlossen stören, sind rot. In der Seitenleiste stehen Befund und Vorschläge, ein Klick übernimmt.
- **Rig (orange):** vorgeschlagene Kiefergelenke und Knochen in Seite und Front, dazu Winkel und Restanteil in der Leiste. Verschieben folgt mit der Bauweise.
- **Prüfung:** E2E `apps/editor/e2e/maul.spec.ts` plus die 12 bisherigen Tests, alle grün mit WebGPU.

**Vorlagen:** `?versuch=maul&wesen=tiger|rex|robbe|langhals&zustand=zu|0.5|auf&kaefig=1&nah=1` zeigt Florians nachgezogene Wesen mit Maul. Bilder macht `node apps/editor/scripts/maul-bilder.mjs <wesen> [ordner] [zustände] [azimut]`.

## 3. Versuche (Zahlen)

### 3.1 Nachziehen (Rex, Robbe, Langhals)
Werkzeug: `apps/editor/scripts/nachziehen/` (Python, nur Standardbibliothek). Prüfbögen liegen unter `docs/progress/editor/nachziehen-*.png`.

- **Profile:** größter Anpassungsfehler 1,58 px, im Mittel 0,26–0,48 px. Die Maulpunkte wurden automatisch gefunden.
- **Gemeinsame Ausdehnungen** (Grenze 2 %):
  - Bis auf zwei Stellen stimmen sie auf 1,2 % überein.
  - **Rex, Breite Front zu Top:** 7,3 % zu, 9,3 % offen. Das liegt an der Zeichnung.
  - **Langhals offen, Höhe Front zu Seite:** 2,7 %.
- **Rex offen:** Das Kinn hängt 0,026 Kachel unter dem geschlossenen Boden. Der Versuch verschiebt den offenen Zustand deshalb so, dass der Körper deckungsgleich bleibt.

### 3.2 Maul im Netz (`packages/shape/src/versuch/maul.ts`)

**Topologie** (für jedes Wesen und jeden Zustand gleich, 378 Käfigpunkte):
- Röhre aus 18 Ringen × 16 Punkten, vorn eine 4×4-Kappe, hinten ein Pol.
- Die Naht läuft über die mittlere Kappenzeile und die Ringpunkte j = 4/12 von Ring 1 bis zum Winkelring 6. Jeder Nahtpunkt hat eine obere und eine untere Kopie.
- Die Tasche hat 7 Reihen je Spalte: Oberrand, innere Oberlippe, Gaumen, Rachen, Boden, innere Unterlippe, Unterrand. An jedem Mundwinkel sitzt ein versteckter Pol.

**Bau:**
- Die Ringe werden so verteilt, dass ihr Nahtpunkt genau auf der Linie liegt. Das Lippenband folgt in festem Abstand.
- Hinter der Stirn stehen die Ringe gleichmäßig in x. Nach Bogenlänge rückten sie bei steiler Naht zusammen und falteten.
- Mit offenem Zustand hat die Naht die offene Länge: Der Reißverschluss reicht bis zum offenen Mundwinkel.

**Offene Haut:** möglichst starr verformt (ARAP). Die Lippenränder sitzen exakt auf den offenen Linien, die Mittellinie wird in vier Durchgängen an den offenen Seitenumriss gelegt. Die Tasche bleibt aus dem Graphen, sonst hielte sie die Lippen zusammen.

**Ergebnisse:**

| | Tiger | Rex | Robbe | Langhals |
|---|---|---|---|---|
| Lippenkante gegen Linie | zu 1,5 px, auf 2,6–2,8 px | – | – | – |
| Oberkiefer (Winkel, Rest) | 15°, 0,32 | 16,5°, 0,46 | 3,9°, 0,92 (nur verschoben) | 36,3°, 0,41 (Kopf kippt) |
| Unterkiefer (Winkel, Rest) | 45°, 0,52 | 52,4°, 0,25 | 49,2°, 0,35 | 13°, 0,43 |
| Öffnungsart | Ziehen | gemischt | Ziehen | Ziehen |
| Kinn offen/zu (Abstand zum Gelenk) | 161 % (Kiefer gedehnt) | 115 % | 117 % | 108 % |
| Durchdringungen zu / auf (Dreieckspaare, Stufe 2) | 130 / 913 | 998 / 304 | 1112 / 962 | 700 / 2142 |

**Gelenkschätzung (synthetisch):** Drehungen von 20°, 60°, 90° und 120° um ein bekanntes Gelenk werden auf < 0,1° und < 10⁻⁶ in der Lage wiedergefunden. Die halbe Bewegung ist exakt die halbe Drehung (`kiefer.test.ts`).

**Zwischenstufen:**
- Lineare Überblendung verkürzt den drehenden Kiefer: Beim Rex steht das Kinn bei 50 % auf 96 % des Gelenkabstands.
- Knochen plus Korrektur halten die Drehung. Das Kinn steht bei 107 %, weil der offene Kiefer gedehnt ist.
- Bei α = 1 gibt die Knochenpose plus Korrektur exakt den offenen Käfig (< 10⁻⁹).

### 3.3 3D-Linie (`flaechenlinie.ts`, Strahlraster auf S0)
- Auf der Kugel liegt die Linie 0,43 px genau, der Start bei z = 0.
- In jeder Ansicht landet der gezogene Punkt exakt unter dem Cursor.
- **Tempo:** S0 bauen 85–135 ms, Raster 6–23 ms, ein Strahl 1,1–1,4 µs, eine Linie mit 100 Proben 0,14–0,35 ms.
- **Grenze des Ein-Ansicht-Modells:** In der Heimatansicht verdeckte Punkte (Wange hinter der Schnauze in der Front) lassen sich so nicht speichern. Deshalb speichert der Editor echte 3D-Punkte.

### 3.4 Zähne (`packages/shape/src/versuch/zaehne.ts`, im Editor `apps/editor/src/maul/zahnKoerper.ts` und `ZahnEbene.tsx`)

**Bauweise:**
- **Zahnfleisch:** die Mitte zwischen Lippenrand und innerer Lippe auf der Grenzfläche des Käfigs, in jeder Lage (zu, offen, jede Zwischenstufe).
- **Lage u:** von 0 (Mitte) bis 1 (Mundwinkel). u ist eine feste Stelle des Käfigs, nicht die Bogenlänge. Der Zahn rutscht deshalb nicht, wenn sich die Lippe beim Öffnen dehnt.
- **Rahmen:** t längs des Zahnfleischs, d zum Zahnfleisch des Gegenkiefers, i nach innen. Links ist das Spiegelbild von rechts.
- **Form:** ein gebogener Kegel, die Wurzel steckt mit 15 % der Länge im Zahnfleisch.
  - Rundheit: 0 = Klinge, 1 = rund, bis 2 = kastig (Querschnitt als Superellipse).
  - Schärfe: 0 = Kuppe, ⅓ = gerader Kegel, 1 = Nadel.
  - Biegung: Kreisbogen bis 90°.
  - Spreizung: seitliche Kippung längs des Zahnfleischs.
- **„außen“** (Rex-Fänge, Hauer): Der Zahn setzt am Lippenrand an, halbe Tiefe plus 1,5 px nach außen versetzt, und hängt über der Gegenlippe.
- **Werte für offen** (`auf`) werden mit der Öffnung stufenlos überblendet: zu + (auf − zu)·α. Das ist Florians „Riesenzähne offen größer“.

**Messwerte** (12 Tests am Tiger):
- **Reihen** mit 1–9 Zähnen je Kiefer sind spiegelgleich (< 10⁻⁹). Bei ungerader Zahl steht ein Zahn auf der Achse. Die untere Reihe steht standardmäßig in den Lücken der oberen.
- **Wurzel und Starrheit:** Die Wurzel liegt in jedem Zustand (zu, 50 %, offen) exakt auf dem Zahnfleisch, auch mit Werten für offen. Der Zahn bleibt starr (Abstände ändern sich ≤ 7·10⁻⁸).
- **Netze** sind geschlossen und nach außen gerichtet.
- **Tempo:**
  - 18 Zahnnetze: 1 ms
  - Zahnfleisch: 0,04 ms
  - Unterteilung: 16 ms
  - Ketten: 28 ms, einmal je Topologie
  - Prüfung: 75 ms ohne Befund, 185 ms mit Vorschlagsuche

**Prüfung im geschlossenen Maul** (`zahnPruefen`):
- **Befunde:**
  - Zahn im Gegenkiefer, mit Tiefe
  - Zahn sticht hinter dem sichtbaren Mundwinkel aus der Haut
  - außen-Zahn mit weniger als 1 px Luft
  - Zähne überlappen sich
- **Vorschläge** werden nie still angewandt: außen stellen, kürzen, „geschlossen klein, offen groß“, neigen, schmaler, nach vorn.
- **Tiger:**
  - Sechs lange Oberzähne (18,4 px) stoßen 5,7–11,1 px in den Unterkiefer.
  - Jeder der drei Vorschläge macht alle frei: außen, kürzen, offen größer.
- **Rex** (14 Oberzähne außen, nach Bogen 06): 4 melden sich.
  - Die vordersten überlappen sich an der Schnauzenspitze (2,7 und 6,8 px).
  - Einer stößt 0,7 px in den Unterkiefer.
  - Einem fehlen außen 0,9 px Luft.

**Im Editor (Zahn-Tab):**
- Die Zähne erscheinen im 3D und folgen Öffnung, Knochen und Korrektur.
- Seite und Front zeigen ihre Umrisse.
  - Ein Klick wählt einen Zahn, Ziehen verschiebt ihn längs des Zahnfleischs.
  - Der Spiegelpartner folgt, der Mittelzahn bleibt auf der Achse.
- Störende Zähne werden rot, in 2D und 3D. Befund und Vorschläge stehen in der Seitenleiste, ein Klick übernimmt einen Vorschlag.
- Die Prüfung läuft beim Loslassen. Während einer Geste gilt der letzte Stand, damit die Regler flüssig bleiben.
- **Behoben:** Nach dem Ziehen eines Reglers behielt dieser den Fokus, und ⌘Z wirkte nicht. Jetzt wirken ⌘-Kürzel auch dort.
- **Bilder:**
  - `zaehne-rex-zu/0.5/auf.png`
  - `zahn-tab.png` (Editor mit rotem Zahn und Vorschlag)
  - `vergleich-zaehne-rex.png` (Florians Bogen | Versuch)

**Befunde und Entscheidungen für Florian:**
1. **Zähne folgen den Lippen, nicht dem Kieferknochen.**
   - Der Rahmen kommt aus der Fläche (Richtung Gegenkiefer). Gegen den Knochen gerechnet drehen sich die Zähne des Tigers zwischen zu und offen zusätzlich, oben um 2–131°, unten um 53–79°. Grund: Der Tiger öffnet durch Ziehen, die Korrektur überwiegt.
   - Dadurch stehen sie offen quer über der Öffnung, wie in deinen offenen Bögen. Starr mit dem Knochen zeigten sie beim Tiger aus der Öffnung heraus.
   - Vorschlag: je Öffnungsart. Kippen (Rex) folgt dem Knochen, Ziehen (Robbe, Tiger) den Lippen.
2. **Senkrecht oder schräg.**
   - Im Rex-Bogen stehen die Zähne senkrecht. Im Versuch kippen sie nach hinten, weil die Lippe dort schräg zum Gegenkiefer läuft (Vergleichsbild).
   - Abhilfe: Option „senkrecht in der Seitenansicht“ oder eine Grundneigung je Wesen.
3. **Dichte Reihen melden Überlappung.** Florians Rex-Zähne berühren sich. Die Prüfung meldet das als Überlappung. Berührung sollte deshalb ein eigener, erlaubter Fall werden.
4. **Prüfhinweis zur Taschenlinse geprüft.**
   - Der Zahn-Versuch vermutete die Durchdringungen im geschlossenen Maul in der Öffnungsrichtung der Linse („oben“ statt senkrecht zur Naht).
   - Umgestellt wurde es schlechter: Tiger 130 → 190, Robbe 1112 → 1200. Die Änderung ist zurückgenommen, die Ursachen stehen in Abschnitt 4.
   - Seine Annahme, getrennte Kiefer fehlten im geschlossenen Käfig, trifft nicht zu: `maulKaefig` setzt die getrennte Unterlippe auch geschlossen, verdeckt nach innen. Er hatte nur am Tiger geprüft, der geschlossen eine Linie hat.

### 3.5 Augen (gemalt, `apps/editor/src/versuch/maulVersuch.ts`)

Florians Augenumrisse aus der Seitenansicht werden auf die geschlossene Haut projiziert, gespiegelt und beim Öffnen mit dem Oberkiefer bewegt. Bilder: `docs/progress/editor/augen-*.png`.

- **Arten wie in seinen Bögen:**
  - Rex: Mandel mit oranger Iris, Pupille und Lidstrich.
  - Robbe: Knopf mit Glanzpunkt.
  - Langhals: Schlitz.
- **Bau:**
  - Die Fläche des Umrisses wird in Ringen (100/75/50/25 %) auf die Haut gelegt, damit sie der Wölbung folgt. Ein flacher Fächer versank in der Haut.
  - Abstand über der Haut: 0,002–0,0035 Kachel, je Ebene etwas mehr (Iris, Pupille, Lid).
- **Fallen:**
  - Florians Umrisse laufen mal links-, mal rechtsherum. Bei einseitigem Material verschwanden Knopf und Iris, weil sie von hinten gesehen wurden. Abhilfe: den Umlaufsinn nach der Hautnormalen ausrichten.
  - Linien wie das Lid sind keine Flächen. Als Fläche zur Mitte hin gefüllt ergab die gebogene Lidlinie eine dunkle Sichel. Abhilfe: als Strich mit Versatz entlang der Bildnormalen, zu den Enden verjüngt.
- **Grenzen:**
  - **Seitliche Projektion:** Auf Flächen, die sich wegdrehen, wird das Auge gestreckt (Langhals).
  - **Starr am Oberkiefer:**
    - Funktioniert, solange das Auge auf dem starren Schädel sitzt (Rex offen).
    - Liegt es nahe der Grenze zum Hals, sinkt es beim Öffnen teilweise ein (Langhals offen).
- **Empfehlung für den Augen-Tab:**
  - Das Auge wird **an der Fläche verankert** (Käfigfläche plus u/v), mit eigenem Tangentenrahmen. So folgt es der Haut in jedem Zustand.
  - Gemalt wird es im Körpershader als Abstandsfeld (Schlitz, Knopf, Mandel, Ausdruck), siehe B3. Die Dreiecke hier sind nur der Beweis, dass Lage und Bewegung stimmen.

## 4. Offene Probleme und Abhilfe (für die große Sitzung)

1. **Durchdringungen** (Tabelle oben). Gefunden über die Rückverfolgung auf Käfigflächen:
   - **Mundwinkel:** Obere und untere Hautfläche am Winkelpunkt kreuzen sich, eine Fläche verdreht sich. → Mundwinkel als Zone aus 1–2 Übergangsflächen (B1), Punktschärfe als Option.
   - **Anpassung schwingt über:** Die Ziele sind fast sauber (Tiger zu: 12 Paare), nach 10 Anpassungen sind es 130. → Ausgleich nach kleinsten Quadraten mit Laplace-Regularisierung statt „Käfig += Ziel − Grenze“; Grenzmasken statt dreifacher Unterteilung (auch fürs Tempo).
   - **Tasche gegen Haut:**
     - Offen schneiden Spalten die Lippenkanten.
     - Beim Überbiss sticht die innere Oberlippe durch die versteckte Unterlippe.
     - → Tasche als Versatz der Kiefer-Innenflächen bauen und eindringende Punkte per Abstandsfeld nach außen schieben (wie OmniFaceRig). Beim Überbiss braucht die Spalte eine S-Form (über die Unterlippe hinweg).
   - **Unterkiefer schwenkt in Kehle oder Boden** (Tiger, Rex, Robbe). → Kehlkette (⅔/⅓ der Drehung, wie in der alten Werkstatt) und Bodengrenze.
2. **Lange Hälse:** Wirbelsäulen-Röhre statt Ringen entlang x (siehe 1.5); Ring- und Nahtindizes bleiben gleich.
3. **Offene Silhouetten pro Pose** fehlen im Dokument. Der Bedien-Versuch nutzt dieselben Profile für zu und offen. Fable braucht Pose-Profile mit gleicher Punktstruktur.
4. **Reißverschluss im Spiel:** Ein globales Morph-Gewicht reicht nicht. Es braucht je Punkt eine Startzeit (Attribut `_ZIP`, TSL-Knoten) und einen Lippenschluss-Regler wie mouthClose (B1).
5. **Budget im Spiel:** höchstens 3 Morph-Ziele (Maul auf, Blinzeln, Ausdruck), für alle Wesen gleich viele. Etwa 0,8 MB je Art. Ein Draw Call je Wesen plus Schatten ergibt bei 36 Wesen ≈ 72 Draw Calls (B1).

## 5. Datenmodell und Bauweise (Empfehlung für Fable)

**Shapes → Loft → Käfig** (Florians Frage 12.10.: „Sind wir ganz weg von den Lofts?“ Nein.)
- **Shapes → Loft:** Aus den drei Profilen werden Querschnitts-Ringe: Höhe aus der Seite, Breite aus dem Top, Form aus der Front (`ringKontext` in `tigerKaefig.ts`, dieselbe Rechnung wie der Platzhalter-Loft). Der Loft legt fest, *welche Form* das Wesen hat.
- **Loft → Käfig:** Die Käfig-Ringe liegen genau auf den Loft-Ringen, wie Edgeloops. Der Käfig mit Catmull-Clark ist das Netz, das über den Loft gespannt wird (in Blender: Loft plus Subsurf).
- **Warum der Käfig dazukommt:** Er liefert, was der reine Loft (96 × 96 Punkte) nicht kann: scharfe und verjüngte Kanten, den Maulschnitt mit Tasche und eine feste Topologie für Blendshapes, Rig und Varianten.
- **Lange Hälse:** Die Wirbelsäulen-Röhre ist ebenfalls ein Loft, entlang einer gebogenen Wirbelsäule statt entlang x.

Bereits im Dokument (optional, Version 0): `maul` und `zaehne`, siehe `packages/shape/src/dokument.ts`.

```ts
maul   = { zu: { oben: Linie3, unten?: Linie3 }, auf?: { oben: Linie3, unten?: Linie3 } }   // Linie3 = 3D-Bézier, Knoten 0 auf z = 0
zaehne = { oben: Zahnreihe, unten: Zahnreihe }   // Zahnreihe = { anzahl, zaehne: ZahnEintrag[] } (rechte Hälfte, Mittelzahn zuerst)
ZahnEintrag = { u, laenge, breite, rundheit, schaerfe, neigung, biegung, spreizung, aussen, auf?: Teilwerte }
```

Dazu empfohlen (B2, B4):

- `wirbelsaeule`: Kurve, aus dem Seitenprofil vorgeschlagen; danach ein eigenes Objekt, das nicht bei jeder Profiländerung springt.
- `regionen`: Kopf, Hals, Rumpf, Schwanz als t-Grenzen.
- `posen[name].profile`: gleiche Punktstruktur.
- `anbauten[]`: Sockel in Wirbelkoordinaten (Region, t, Winkel, Tiefe, Drehung); Typ, Anzahl, Spiegeln, Parameter, Fähigkeiten.
- `augen[]`: Typ (schlitz | knopf | kugel | mandel), Anker, Größe, Farben, Pupille, Lidöffnung (nur Kugel/Mandel).
- **Benannte Zustände je Teiltyp:** `maul.auf`, `auge.zu`, `fluegel.angelegt`, `ruessel.rollen` (0…1). Zielformen entstehen durch Bauen bei 0 und 1.

**Grundsatz:**
- Das Dokument speichert nur Absicht.
- Käfig, Netz, Tasche, Zähne, Knochen, Gewichte und Korrektur werden immer neu gebaut. Damit ist die Reihenfolge der Tabs egal, und Beine kommen später ohne Neuanfang dazu.

## 6. Reihenfolge für die große Sitzung (Vorschlag)

1. **Wirbelsäulen-Röhre**, damit Langhals und Giraffe tragen, mit Pose-Profilen.
2. **Maul sauber:**
   - Mundwinkel-Zone, Tasche aus Kiefer-Innenflächen mit Abstandsfeld-Schieben, geregelte Anpassung (Ziel: 0 Durchdringungen zu, auf und bei 25/50/75 %).
   - Kehlkette und Bodengrenze.
3. **Zähne:** Der Versuch steht (am Zahnfleisch, Prüfung mit Vorschlägen). Für die Bauweise fehlen:
   - Rahmen je Öffnungsart (Kippen am Knochen, Ziehen an den Lippen) und eine Option „senkrecht“.
   - Berührung als erlaubter Fall.
   - Prüfung auch offen und bei Zwischenstufen.
   - Zähne im selben Netz bzw. Draw Call fürs Spiel.
4. **Rig-Tab bearbeitbar:** Gelenk verschieben, Halbwinkel-Knochen; die Linien folgen dem Knochen.
5. **Augen-Tab:** zuerst gemalt (SDF), dann Kugel und Mandel mit Lidöffnung.
6. **Spiel-Laufzeit:** Skinning, 3 Morph-Ziele, Reißverschluss-Attribut. Danach Beine (Rig-Vorlagen und Gangtabelle) und der Variantengenerator.

## Anhang: Recherche-Abschnitte (Hintergrund-Recherche 12.10., mit Quellen)

### B1 Maul und Kiefer in Film- und Spiel-Rigs

**Befunde**

**Maultasche und Lippenränder.** Die Innenlippe setzt Kantenfluss und Parametrisierung der Außenlippe fort: die letzte Lippenkante Reihe für Reihe nach innen bis zum Rachen ziehen; das Innere wird ganz modelliert, weil es sichtbar mitverformt wird [1]. Die Lage der Mundwinkelspitze gilt als wichtigste Modellierentscheidung: Sie legt fest, wo die Lippen verbunden bleiben und wo sie sich trennen [1]. Am Winkel läuft die Innenlippen-Schleife hinter der Hautschleife; eine eingeschobene Übergangsfläche verbindet beide [2].

**Sehr weite Öffnungen.** Für Daves riesiges Maul (Penguins of Madagascar) reichte kein Kopf-Drehpunkt: DreamWorks rechnete die Maulverformung je Pose im Raum des Halses (offen) oder des Kopfes (zu); der gedehnte Rachen brauchte automatische und manuelle Entspannung, die Zähne ließen sich je Pose umstellen [3]. Pixar: weite runde Münder verzerren die Topologie um Nase und Wangen; der Mund wurde dort vom Kopf gelöst [4]. Schlangen öffnen mit mehreren Gelenken in Reihe [5].

**Durchdringung.** OmniFaceRig (Juni 2026): knochenloses FACS-Rig mit bis zu 155 Blendshapes aus reinen Oberflächennetzen; Zähne, Zahnfleisch und Zunge aus vier Vorlagen (Human, Canine, Monster, Flat), per RBF eingepasst und per ARAP vorplatziert; aus der konvexen Hülle der Zähne ein SDF, eindringende Gesichtspunkte iterativ entlang des Gradienten nach außen geschoben, für jeden Ausdruck geprüft; untere Zahnreihe folgt dem Kiefer per Regel; Durchdringung laut Autoren 0,05 %; Grenzen: drei Gesichtsfamilien, offline 20–30 s; scheitert bei Schnabel, sehr breitem Fischmaul und langer Schnauze [6].

**Klebrige Lippen, Mundwinkel.** Face Robots Lip Stiction: Haftpunkte an den Winkeln, einstellbare Spaltbreite, malbare Haftzone, eine Seal-Falloff-Kurve, die wie ein Reißverschluss von den Winkeln zur Mitte schließt [7]. Blender Studio baut einen Lip Zipper auf einem Bandnetz aus der inneren Lippenschleife [8][9]. Rigify mischt den Einfluss von Kiefer und Mund je Lippenschleife mit Abfall, mit Sperrmodus [10]. ARKit trennt jawOpen und mouthClose (Lippen bei offenem Kiefer geschlossen) [11]. Im Delgo-Rig drehen eigene Winkelknochen etwa die halbe Kieferdrehung mit [12]. Das Öffnen des Kiefers zieht den Mundwinkel leicht nach unten [13].

**Kiefer: Knochen plus Korrektur.** Lineare Blendshapes führen jeden Vertex auf einer Geraden; Animatoren modellierten teils alle drei bis fünf Bilder eine neue Form [14]; jawOpen wird deshalb oft mit Skinning kombiniert [13]. Pose Space Deformation speichert Korrekturen im lokalen Rahmen und interpoliert sie über die Pose [14]. In-betweens ergeben stückweise lineare Bahnen [13][15]. MetaHuman bewegt die Masse mit Gelenken; Vertex-Verschiebung nur in LOD 0, „Per-vertex shape interpolation is linear and therefore looks artificial when moving large masses“ [16]. Übliche Kiefer-Rigs drehen um einen festen Punkt und schieben zusätzlich vor und zurück; der echte Kiefer folgt einer Bahn mit drei Freiheitsgraden [17]. Lineares Skinning fällt bei großen Winkeln in sich zusammen [14]; Dual Quaternions beheben das fast ohne Mehrkosten (Ausbeulen möglich) [18]. ARAP-Interpolation zerlegt die Bewegung in Drehung und Dehnung [19]. Morphs wirken vor dem Skinning; eine in offener Pose geformte Korrektur muss durch das Skinning zurückgerechnet werden (Maya invertShape) [20].

**Zerlegung, Drehachse.** SSDR gewinnt Skinning aus Beispielposen (wenige starre Knochen, dünne konvexe Gewichte) [21]. Dem Bones (EA, BSD-3) löst Gewichte zu gegebenen Transformationen oder umgekehrt [22]. Zwei Posen bestimmen die Drehachse eindeutig; Fehler in Richtung und Lage sind umgekehrt proportional zum Drehwinkel, der Richtungsfehler auch zur Streuung der Messpunkte [23]. Bei 90–120° ist die Achse gut bestimmt.

**Laufzeit.** glTF: Morphs auf Position, Normale, Tangente vor allen Transformationen; Zahl der Ziele unbegrenzt, 4 Gelenke je Satz, eigene Attribute mit Unterstrich [24]. three.js r186 (Quelltext geprüft): Morph-Ziele in einer Float32-Array-Textur (16 B je Vertex, Attribut, Ziel), Shader-Schleife überspringt Gewicht 0, Morph vor dem Skinning, Gewichte je Instanz nur beim ungehäuteten InstancedMesh, gleicher WGSL-Code wird geteilt [25]. Frühere Kompilier-Hänger mit 52 Morphs seit der Shader-Schleife behoben [26]. Unreal: Pose Driver treibt Korrekturen per RBF aus der Knochenorientierung [27].

**Was heißt das für uns**

1. **Mundwinkel als kleine Zone, nicht als ein Vertex (weicht vom Plan ab).** Ein geteilter Eckvertex trägt 90–120° kaum; besser 1–2 Übergangsflächen im Käfig [2], Kantenschärfe je Zustand getrennt gebacken. Der Winkel klafft um 2·d·sin(θ/2) auf, bei 120° um 1,73·d (d = Abstand Winkel–Achse); der Editor soll d anzeigen und warnen.
2. **Taschenreihen wie geplant** [1]; im Scharnierband mindestens zwei Reihen; beim Backen des offenen Zustands die Tasche bei festen Lippenrändern glätten [3]; Zahnfleischreihen starr wie die Zähne.
3. **Kippen: Achse in 2D schätzen.** Bei symmetrischen Wesen nur ein Drehpunkt in der Seitenansicht; dafür starre, weit gestreute Punkte (Zahnfleischlinie, Kinn, Kieferwinkel), keine Lippen [23]; 3D-Kabsch nur zur Kontrolle; Drehpunkt als Griff im Rig-Tab, unplausibel → Florian setzt ihn, der Rest wird zum Schub des Kieferknochens [17].
4. **Halbwinkel-Knochen ergänzen:** Zwei Knochen mit Gewicht 0,5 ziehen einen Punkt auf cos(θ/2) seines Achsabstands zusammen, bei 120° auf 50 %; ein Knochen mit halbem Winkel [12] hebt das auf cos 30° = 87 %.
5. **Korrektur vor dem Skinning speichern:** Δ = (Σ w_b·M_b)⁻¹·p_offen − p_zu [20]; ohne Halbwinkel-Knochen verstärkt die Inversion bei 120° um Faktor 2, bei 180° singulär. Größere Zähne im offenen Zustand gehören in Δ.
6. **„Perfekt“ gilt nur an den zwei gezeichneten Zuständen.** Zwischenstufen gegen eine ARAP-Referenz messen [19] und auf Durchdringung prüfen; bei Bedarf ein Zwischenziel bei 0,5 backen [15].
7. **Ziehen braucht einen Reißverschluss-Mechanismus:** fast geradlinige Wege (Robbe) → ein Morph ist exakt; ein Reißverschluss braucht je Vertex eine Startzeit s_i entlang des Spalts: w_i = smoothstep((t − s_i)/f), als Attribut `_ZIP` und eigener TSL-Knoten (Prinzip Seal Falloff [7]); Lippenschluss als eigener Regler neben t, wie mouthClose [11].
8. **Zähne im selben Netz und starr** (Gewicht 1,0 oben am Kopf, unten am Kiefer); Kollision im Editor wie OmniFaceRig (SDF je Zahnhülle, Lippen und Tasche nach außen schieben) für zu, offen und Zwischenstellungen [6]; Hauer außen markiert und ausgenommen; vier Zahnvorlagen als Presets.
9. **Ein Parameter treibt alles, wie bei MetaHuman [16]:** Öffnung t steuert Kieferwinkel, Korrekturgewicht und Reißverschluss.
10. **Budget:** höchstens 3 Morph-Ziele mit Normalen, für alle Wesen gleich viele; Speicher 8 000 Vertices × 3 Ziele × 32 B ≈ 0,8 MB je Art; Standardweg 36 Wesen = 36 Draw Calls plus Schattenpass ≈ 72; ein Draw Call für alle Körper braucht einen eigenen Skinning-Pfad mit Knochen- und Gewichtstextur.
11. **Von OmniFaceRig übernehmen:** SDF-Schieben, Zahnvorlagen, Prüfung je Pose. Nicht übernehmen: Gesichtsvorlage, 155 FACS-Formen, Bildanalyse (scheitert an unseren Extremfällen); Florians gezeichnete Lippenlinien sind der bessere Ausgangspunkt.

**Unsicher:** Blender-Studio-Lektionen kostenpflichtig (nur Titel geprüft); OmniFaceRig-Zahlen sind Angaben der Autoren; Woltring nur Abstract; MetaHuman-Kiefer-Korrekturlogik nicht öffentlich.

**Quellen**
1. Autodesk Softimage 2014: Modeling the Mouth Area (Face Robot) – https://download.autodesk.com/global/docs/softimage2014/en_us/files/face_modeling_ModelingtheMouthArea.htm
2. Orinoco: Corners of the mouth (Updated), Blender Artists 2006 – https://blenderartists.org/t/corners-of-the-mouth-updated/368051
3. Boucher, Dirksen: Rigging Octopuses in Penguins of Madagascar, DigiPro 2015 – https://research.dreamworks.com/wp-content/uploads/2018/07/octopus_rigging_digipro_extended_abstract_FINAL-Edited.pdf
4. Lykkegaard, Lacaze, Page: Eyes Without a Face, SIGGRAPH Talks 2023 – https://history.siggraph.org/?p=129531
5. Snake skeleton (Wikipedia) – https://en.wikipedia.org/wiki/Snake_skeleton
6. Wang et al.: OmniFaceRig, arXiv 2606.08043 (2026) – https://arxiv.org/abs/2606.08043
7. Autodesk Softimage 2014: Lip Stiction (Face Robot) – https://download.autodesk.com/global/docs/softimage2014/en_us/files/propref_facebot_LipStiction.htm
8. Blender Studio: Facial Rigging, Kapitel Lips – https://studio.blender.org/training/facial-rigging/chapter/lips/
9. Blender Studio: Storm, Produktionslog 308 – https://studio.blender.org/projects/storm/production-log/308/
10. Blender-Handbuch: Rigify Face (skin_jaw, basic_tongue) – https://docs.blender.org/manual/en/dev/addons/rigify/rig_types/face.html
11. Apple: ARKit mouthClose – https://developer.apple.com/documentation/arkit/arfaceanchor/blendshapelocation/mouthclose
12. Grubb: Facial Animation Rig for Delgo, Schritt 10 – https://www.highend3d.com/maya/tutorials/character/c/facial-animation-rig-for-delgo/page/4
13. Lewis et al.: Practice and Theory of Blendshape Facial Models, Eurographics STAR 2014 – https://scribblethink.org/Work/Pdfs/blendshapes_MAIN.pdf
14. Lewis, Cordner, Fong: Pose Space Deformation, SIGGRAPH 2000 – https://www.scribblethink.org/Work/PSD/PSD.pdf
15. Autodesk Maya: Add in-between target shapes – https://help.autodesk.com/cloudhelp/2017/ENU/Maya/files/GUID-FF40A342-2F43-42C5-A8C9-8C5E3D91B565.htm
16. Epic: MetaHuman DNA – Rig Definition and Rig Operation – https://dev.epicgames.com/documentation/metahuman/metahuman-dna-rig-definition-and-rig-operation
17. Zoss, Bradley, Bérard, Beeler: An Empirical Rig for Jaw Animation, SIGGRAPH 2018 – https://studios.disneyresearch.com/?p=38499
18. Kavan et al.: Skinning with Dual Quaternions, I3D 2007 – https://users.cs.utah.edu/~ladislav/kavan07skinning/kavan07skinning.html
19. Alexa, Cohen-Or, Levin: As-Rigid-As-Possible Shape Interpolation, SIGGRAPH 2000 – https://www.tau.ac.il/~levin/arap.pdf
20. Vernon: cvShapeInverter (heute in Maya als invertShape) – https://github.com/chadmv/cvshapeinverter
21. Le, Deng: Smooth Skinning Decomposition with Rigid Bones, SIGGRAPH Asia 2012 – https://graphics.cs.uh.edu/ble/papers/2012sa-ssdr/index.html
22. EA SEED: Dem Bones – https://github.com/electronicarts/dem-bones
23. Woltring et al.: Finite centroid and helical axis estimation from noisy landmark measurements, J. Biomech. 1985 – https://research.tue.nl/en/publications/e98c5d15-de59-4116-a217-d58740a99b18
24. Khronos: glTF 2.0 Specification – https://registry.khronos.org/glTF/specs/2.0/glTF-2.0.html
25. three.js r186, Quelltext Morph.js, NodeMaterial.js, RenderObject.js, Pipelines.js (node_modules/three@0.186.1) – https://github.com/mrdoob/three.js/blob/r186/src/nodes/accessors/Morph.js
26. three.js-Forum: WebGPURenderer shader compilation time with many morphs – https://discourse.threejs.org/t/webgpurenderer-shader-compilation-time-is-long-with-models-with-a-lot-of-morphs/60446
27. Epic: AnimNode_PoseDriver (Python-API) – https://dev.epicgames.com/documentation/en-us/unreal-engine/python-api/class/AnimNode_PoseDriver

### B2 Werkzeuge und Verfahren mit ähnlichem Ansatz

#### Befunde

**1. Spore (2008)**
- **Körper:** Rumpf mit Wirbelsäule, Glieder und Teile daran [1]. Die Haut ist eine einzige implizite Fläche (Metaballs), bei jeder Änderung neu vernetzt: topologisch robust, aber ohne lokale Kontrolle [2]. Startform „Bohne“; Ziehpunkte wie Wirbel halfen der Animation [4].
- **Teile („Rigblocks“):** Mäuler, Augen, Greifer, Füße sind vorgefertigte Modelle mit Gelenken oder Blendshapes und Verformungsgriffen [2, 3]. Tags („capabilities“: mouth, grasper, foot …); Verformungskanäle je Teiltyp genormt: alle Mäuler reagieren auf denselben Auf/Zu-Kanal [1]. Clips mit festen Namen („OpenClose“, „Pointing“) [3]. Animatoren wählen Teile über Tags; die Autoren nennen diese Auszeichnung „immensely powerful, efficient, and robust“ [1].
- **Struktur:** Graphen mit Schleifen hemmten die Spieler → Baum mit der Wirbelsäule als Wurzel. Der IK-Löser legt einen Spline durch lange Wirbelsäulen; ein Maul gibt sein Ziel an das Wirbelsegment weiter [1].
- **Bilanz:** Haut bleibt glatt, Animation läuft sofort im Editor, ~90 % der Animationen bestanden Tests über Hunderte Wesen [1, 2]. Gewichte nach dem erzeugenden Teil ließen dicke Rümpfe scheren; Glieder verschmolzen zu Schwimmhäuten; automatische UVs 10- bis 100-mal schlechter [2]. Teile bewusst cartoonhaft [5]. Zufällige Kombinationen sahen schlechter aus als Wesen von Künstlern; Beine waren das Schwerste [4].

**2. Skizzenbasiertes Modellieren**
- **Teddy** bläst Konturen über die Chordalachse auf [6]; **FiberMesh** behält gezeichnete Kurven als glatte oder scharfe Griffe [7].
- **RigMesh** modelliert und riggt in einem Schritt; Skelett aus der gestutzten, geglätteten Chordalachse; Gelenke nach Achsknick und Dickenänderung. Grenzen: ohne klare Symmetrieachse kein brauchbares Skelett; an fast runden Konturstellen instabil; Laien bauten für Gesichtsdetails unnatürliche Skelette [8].
- **Monster Mash** bläst Teile aus einer Ansicht auf und animiert sofort; Grenze: Tiefe kaum steuerbar, mehrere Ansichten als Zukunftsarbeit [9].
- **Orthografische Ansichten:** Rivers et al. definieren Teile über zwei bis drei Silhouetten, verknüpfen per CSG und glätten; organische Formen ausdrücklich als Grenze [10]. **Huang et al. (2022)** arbeiten mit Vorder- und Seitenzeichnung; die gemeinsame Höhe dient als Epipolarbedingung, das Bearbeiten in der zweiten Ansicht wird eindimensional; Augen und Mund über Additions- und Erosionsstriche [11].
- **Lernverfahren** liefern schnell Formen, wenig steuerbar; bei Lun et al. fehlen Details, Skizzen sind zwischen den Ansichten inkonsistent [12]. DrawingSpinUp (2024) animiert einzelne Zeichnungen [13].

**3. Produktionswerkzeuge**
- **Einrasten auf Flächen:** Maya „Make Live“ [14]; Kurven auf der Fläche liegen im UV-Raum und gleiten in U und V [15]. Blender: „Face Project“ (entlang der Blickrichtung) und „Face Nearest“; „Snap Peel Object“ ignoriert innere Flächen; Shrinkwrap [16]. RetopoFlow „Contours“ legt mit einem Strich quer über eine Röhre einen Ring um sie [17].
- **Führungskurven:** ZRemesher-Führungen sind nur Vorschläge [18]. Kurvenpinsel mit Flächen-Snap reihen Teile wie Zähne entlang einer Linie und richten sie an der Normale aus [19].
- **Zwei Ansichten:** Rhino „Crv2View“ macht aus zwei ebenen Kurven verschiedener Ansichten eine Raumkurve [20]. ILoveSketch zeigt die „Zeichenbarkeit“ einer Ansicht als Deckkraft; ein automatischer Wechsel der Zeichenmethode war zu sprunghaft [21].
- **Falten:** Gravity Sketch setzt Falten auf Kanten oder Ringe; schärfer mit zusätzlichen Ringen daneben [22]. Pixars halbscharfe Falten liegen auf Kanten des Kontrollnetzes [23].
- **Grundformen:** Blenders Skin-Modifier macht aus Skelett und Radien ein Quadnetz entlang des Skeletts [24]. ZBrush ShadowBox und TriAxis erzeugen Volumen aus drei Silhouetten, nur als Blockout [25, 26].
- **Houdini:** kein belastbarer Kreaturen-Baukasten gefunden, nur Bausteine wie biharmonische Gewichte [34].

**4. Infinigen**
- Genom als Baum; Knoten = Teile mit Parametern, Kanten = Anbindung [27]. Rumpf und Kopf sind NURBS aus Mittellinie mit Profilen, geprüft an 30 von Hand modellierten Beispielen; Rauschen direkt auf Kontrollpunkten sah unrealistisch aus [27]. Jedes Teil liefert Netz und Skelettlinie; Kiefer mit Reglern für Zahngrößen, Zahndichte, Schiefe und Zunge [27]. Anbindung (u, v, r) plus Drehung [27]. Gelenke mit Winkelgrenzen, benannte IK-Ziele, Gänge als geschlossene Fußkurven mit Phasenversatz [27]. Teilnetze werden vereint und an Schnittkurven verbrückt, danach Voxel-Remesh und Glätten; Gewichte aus Blenders Automatik [28].

**5. Skelett und Gewichte**
- Die Mittelachse reagiert empfindlich auf kleine Störungen am Rand [29]; Teddy und RigMesh stutzen und glätten [6, 8]. Pinocchio: 13 von 16 Figuren korrekt, dünne Glieder scheitern, Gewichte aus Wärmegleichgewicht [30]; Blenders Bone Heat beruht darauf [31] und scheitert oft an losen Teilen wie Zähnen [32]. Geodesic Voxel Binding verträgt mehrteilige, offene, sich schneidende Netze [33]; Houdini Biharmonic für weiche Verformung [34]; UniRig (2025) [35]. Für blobbige Cartoonwesen: Heat-Verfahren funktionieren auf geschlossenen Netzen aus einem Stück; Probleme machen lose Teile, dicke Rümpfe [2] und runde Bereiche ohne klare Achse [8].

**6. Gibt es das schon?** Soweit gefunden: nein. ShadowBox/Add-ons nur Blockout [25, 26]; Rivers et al. nur harte Formen [10]; Huang et al. Forschungsprototyp [11]; Rhino ohne Rig [20]; Spore ohne Profile [1]; Infinigen nur offline [27]; KI aus bis zu vier Bildern liefert Netze ohne Struktur [36].

#### Was heißt das für uns
1. **Semantik-Vertrag nach Spore [1, 3]:** Tags (Maul, Auge, Fuß, Hals, Schwanz, Flügel) und genormte Kanäle wie `maul.auf` 0…1; unsere Lippenlinien für „zu“ und „auf“ sind die beiden Enden dieses Kanals; Spielanimationen sprechen nur Tags an.
2. **Teile als Baum, angebunden wie bei Infinigen [27]:** (u, v, r) plus Drehung im Parameterraum des Elternteils; jedes Teil liefert Netz und Knochenlinie.
3. **Linien auf der Haut im Flächenparameter speichern** (Ring t, Winkel φ), nicht als freie 3D-Kurve [15]: Lippen wandern mit, wenn Florian ein Profil ändert; jede Ansicht bedient dieselben zwei Freiheitsgrade; neue Punkte nur auf die äußere Hülle des aktiven Teils projizieren [16, 17].
4. **Freie Raumkurven** (Rückgrat, Knochenlinien, Zielkurven des offenen Mauls): in der zweiten Ansicht nur die fehlende Koordinate freigeben, Hilfslinien aus der anderen Ansicht zeigen [11, 20]; wo eine Linie in einer Ansicht fast zu einem Punkt schrumpft, die Griffe abschwächen [21].
5. **Falten brauchen Käfigkanten [23]:** gezeichnete Kantenlinien werden Kantenzüge im Käfig (Vorlage ausrichten oder Ring einfügen); harte Kanten brauchen Hilfsringe [22].
6. **Silhouetten allein reichen nicht [10]:** je Ring eine eigene Querschnittsform (rund bis kastig); Augenhöhlen, Nasenlöcher, Maultasche nur über Linien und Schnitte.
7. **Das Rückgrat nur vorschlagen [8, 29]:** Achse stutzen und glätten, Gelenke nach der Dicke; danach ein eigenes Objekt, das Florian greifen kann und das nicht bei jeder Profiländerung springt; lange Hälse über Spline mit wenigen Punkten [1].
8. **Gewichte aus der Konstruktion ableiten:** Welcher Ring zu welchem Knochen gehört, wissen wir; weich über mehrere Ringe überblenden [2]; Zähne, Augen, Hörner starr [32]; Bone Heat nur als Rückfall.
9. **Zähne als Reihe auf der Zahnfleischlinie**, Regler wie Infinigens Kiefer, Ausrichtung an der Normale, starre Teile im selben Skinned Mesh [19, 27].
10. **Maul und Übergänge:** Spore und Infinigen machen das Maul zum eigenen Teil [1, 27]; unser Schnitt mit Maultasche ist ehrgeiziger, ein eigenes Kieferteil wäre der Rückfall. Beine, Flügel, Hörner zuerst als überlappende Röhren; Verschmelzen nur als Test mit dem Kriterium „Naht in der Nahansicht unsichtbar“ (Remesh zerstört die feste Topologie [28]).
11. **Look absichern:** Florians Bögen als Referenzsatz wie Infinigens 30 Vorbilder; zufällige Kombinationen brauchen gute Vorgaben [4, 27].
12. **Bilanz:** stärker als die Vorbilder: feste Topologie (stabile UVs, Muster, Gewichte), drei Ansichten statt Aufblasen, Bézier-Präzision. Schwächer: Verzweigungen und Formen, die in keiner Silhouette sichtbar sind. Ein fertiges Werkzeug gibt es nicht; der Eigenbau ist begründet.

#### Quellen
1. Hecker et al. 2008 – https://chrishecker.com/Real-time_Motion_Retargeting_to_Highly_Varied_User-Created_Morphologies
2. Hecker: My Liner Notes for Spore – https://www.chrishecker.com/My_Liner_Notes_for_Spore
3. Ng: Spore – Rigblocks and SkinPaint – https://janeng.com/?p=143
4. Gingold Talks Spore's „Magic Crayon“ Approach – https://gamedeveloper.com/game-platforms/gingold-talks-i-spore-i-s-magic-crayon-approach
5. D.I.C.E.: Will Wright & the Spore Team – https://www.gamedeveloper.com/game-platforms/d-i-c-e-will-wright-the-ymc--i-spore-i-team
6. Igarashi et al. 1999: Teddy – https://www-ui.is.s.u-tokyo.ac.jp/~takeo/papers/siggraph99.pdf
7. Nealen et al. 2007: FiberMesh – https://www-ui.is.s.u-tokyo.ac.jp/~takeo/research/fibermesh
8. Borosán et al. 2012: RigMesh – https://cragl.cs.gmu.edu/rigmesh/
9. Dvorožňák et al. 2020: Monster Mash – https://dcgi.fel.cvut.cz/~sykorad/monster_mash.html
10. Rivers, Durand, Igarashi 2010: 3D Modeling with Silhouettes – https://www-ui.is.s.u-tokyo.ac.jp/~takeo/papers/alec_siggraph2010_silhouette.pdf
11. Huang, Xie, Fukusato 2022: Interactive 3D Character Modeling from 2D Orthogonal Drawings with Annotations – https://arxiv.org/abs/2201.11284
12. Lun et al. 2017: 3D Shape Reconstruction from Sketches via Multi-view Convolutional Networks – https://arxiv.org/abs/1707.06375
13. Zhou et al. 2024: DrawingSpinUp – https://arxiv.org/abs/2409.08615
14. Maya: Make Live – https://download.autodesk.com/us/Maya/2009help/files/Modify__Make_Live.htm
15. Maya: Curves-on-surface – https://download.autodesk.com/us/maya/2010help/files/Trimming_Curvesonsurface.htm
16. Blender-Handbuch: Snapping – https://docs.blender.org/manual/en/latest/editors/3dview/controls/snapping.html
17. RetopoFlow – https://blendermarket.com/products/retopoflow
18. ZBrushCentral: ZRemesher ignoring guides – https://www.zbrushcentral.com/t/zremesher-ignoring-guides-with-curve-strength-at-100/436054
19. Novedge: Efficient IMM Placement with ZBrush Curve Brushes – https://novedge.com/blogs/design-news/zbrush-tip-efficient-imm-placement-with-zbrush-curve-brushes
20. Rhino: Crv2View – https://docs.mcneel.com/rhino/8/help/en-us/commands/crv2view.htm
21. Bae, Balakrishnan, Singh 2008: ILoveSketch – https://sketch.kaist.ac.kr/pdf/publications/2008_uist_ilovesketch.pdf
22. Gravity Sketch: Crease – https://help.gravitysketch.com/hc/en-us/articles/5913003925533-Crease
23. DeRose, Kass, Truong 1998 – https://graphics.pixar.com/library/Geri/paper.pdf
24. Blender-Handbuch: Skin Modifier – https://docs.blender.org/manual/en/2.83/modeling/modifiers/generate/skin.html
25. ZBrush: ShadowBox – https://help.maxon.net/zbp/en-us/Content/html/4_palettes_tool-3-geometry-shadowbox.html
26. TriAxis Modeler – https://superhivemarket.com/products/triaxis-modeler/docs
27. Raistrick et al. 2023: Infinigen – https://arxiv.org/abs/2306.09310
28. Infinigen: joining.py – https://github.com/princeton-vl/infinigen/blob/main/src/infinigen/assets/objects/creatures/util/joining.py
29. Miklos, Giesen, Pauly 2010: Discrete Scale Axis Representations – https://www.cs.princeton.edu/courses/archive/spring11/cos598A/pdfs/Miklos10.pdf
30. Baran, Popović 2007: Pinocchio – https://people.csail.mit.edu/ibaran/papers/2007-SIGGRAPH-Pinocchio.pdf
31. Blender-Quelltext: meshlaplacian.cc – https://github.com/blender/blender/blob/main/source/blender/editors/armature/meshlaplacian.cc
32. Clary 2017, bf-animsys: Bone Heat Weighting failed – https://archive.blender.org/lists/bf-animsys/2017-April/000255.html
33. Dionne, de Lasa 2013: Geodesic Voxel Binding – https://diglib.eg.org/handle/10.2312/15001
34. Houdini: KineFX Capture – https://www.sidefx.com/docs/houdini/character/kinefx/capture.html
35. Zhang et al. 2025: UniRig – https://arxiv.org/abs/2504.12451
36. Meshy-Hilfe: Multi-View – https://intercom.help/meshy/en/articles/12634481-how-to-use-multi-view

### B3 Augen für stilisierte Wesen

**Befunde**

*Gemalt oder als Kugel?*
- **Wind Waker:** Augen, Brauen und Pupillen sind eigene kleine Meshes knapp über dem Gesicht. Wenige kleine Texturen tragen alle Ausdrücke: 7 Augenformen, 6 Brauen, 9 Münder und 1 Pupille. Die Pupille wird im Shader mit der Augentextur maskiert. Blick und Pupillenweite entstehen durch Verschieben und Skalieren der UVs, nicht des Meshes [1].
- **Mii:** Die Face Library zeichnet Augen, Brauen, Mund, Bart und Muttermal als Teile in eine Masken-Textur. Jedes Teil hat Position, Skalierung und Drehung. Es gibt eine Maske je Ausdruck, bis zu 19. Ein Ausdruck ist eine kleine Tabelle: ein anderer Augen- oder Mundtyp und dazu Versätze für Augendrehung und Brauen. Jedes Auge hat einen eigenen Texturindex, etwa für Zwinkern [2].
- **Animal Crossing, Splatoon, Pokémon:** Dafür fand sich keine belastbare Primärquelle. Foren beschreiben für Pokémon einen Ausdrucks-Atlas mit UV-Versatz; geprüft ist das nicht. Ein Fan-Nachbau im Animal-Crossing-Stil trennt Augen- und Mundpartie vom Kopf, schaltet Texturen um und holt die Tiefe aus Normal Maps [3]. Ob das Original so arbeitet, ist offen.
- **Spore:** Augen sind angesetzte 3D-Teile wie Münder und Greifer. Die Teile haben skalare Verformungskurven, etwa für das Öffnen und Schließen von Händen, Mündern und Augen. Diese Kurven sind je Teiltyp standardisiert [4].
- **SDF statt Textur:** Ein Shader-Tutorial baut Augen und Pupillen aus 2D-Distanzfunktionen. Das Blinzeln ist ein kurzer Tausch gegen ein flaches, abgerundetes Rechteck [5]. Der Katalog von Inigo Quilez hat exakte Formen für fast alle unsere Typen: Ellipse, Vesica (Schlitzpupille), Moon (Sichel), Rounded X und Ring [6].
- **Abwägung (eigene Einschätzung):** Gemalte Augen sind billig, haben scharfe Ränder, sind grafisch frei und sofort tauschbar. Ihnen fehlt aber Tiefe, und bei starker Krümmung oder an der Silhouette verzerren sie. Augäpfel bringen Tiefe, Glanz und echte Lider. Dafür kosten sie Arbeit am Rig und gegen Durchdringungen. Bei kleiner Größe sieht man den Gewinn kaum.

*Augapfel und Lider*
- Bei Cartoon-Lidern laufen Gelenke vom Augenmittelpunkt zu Punkten am Lidrand. So gleitet das Lid über die Kugel [7]. Formziele (Blendshapes) bewegen Punkte auf Geraden und schneiden deshalb in die Kugel. Eine Drehung um den Mittelpunkt hält den Abstand.
- Rigify führt Ober- und Unterlid als zwei Ketten, die sich in den Winkeln treffen. Die Ketten haften an der Augenoberfläche und folgen der Drehung des Augapfels mit einstellbarem Anteil, waagerecht und senkrecht getrennt [8].
- Für Unterteilungsflächen gelten konzentrische Kantenringe um die Öffnung als übliche Praxis, wie beim Mund (keine Primärquelle abgerufen).
- Heikel sind gestreckte Augäpfel. Das Gleiten braucht dann Hilfsflächen, und ein Test mit skalierter Kugel war instabil [7]. Das passt zu den verzerrten Augen aus Kugel und Kappe im Prototyp (Vermutung).
- **Linse und Brechung:** Pixar gab den Augen in „Monsters University“ eine realistischere Form mit Brechungsshader; einen klaren, grafischen Glanzpunkt wollte das Team trotzdem selbst steuern (nur aus einer Zusammenfassung bekannt) [9]. Animal Logic berechnet die Hornhaut-Brechung verformbarer Figuren in Echtzeit im Viewport [10]. Unity hat dafür einen Knoten (nur HDRP) [11]. Nebenwirkung: Die Hornhaut lässt die Pupille größer und verschoben erscheinen, der Blick im Bild weicht von der Animation ab [12].

*Pupillen und Iris im Shader*
- Ein prozedurales Godot-Auge bricht den Sichtstrahl mit `refract()` und schneidet die Irisebene; Iris aus Polarkoordinaten; Regler für Irisgröße, Pupillenweite und Wölbung [13].
- **Kosten (Schätzung):** Ein SDF-Auge ist reine Arithmetik, einige Dutzend Operationen ohne Texturzugriff. Bei rund 80 px Kopfhöhe auf dem iPhone misst ein Auge mit 10 % Kopfhöhe etwa 8 px. Kanten mit `fwidth` geglättet, geht auch in WebGL2.

*Augen auf sehr verschiedenen Köpfen*
- Spore animiert über Fähigkeiten statt über feste Skelette; ein Lookat-Regler mit weichen Grenzen richtet den Kopf aus [4].
- Harte Brauenwülste gehen in Catmull-Clark mit halbscharfen Kanten [14].

*Blick*
- „Eyes Alive“ erzeugt Sakkaden aus statistischen Modellen [15]. Engines begrenzen den Blick (Unity `clampWeight`) [16].
- **Für kleine Wesen (Schätzung):** Bei Augen von 6 bis 10 px sind Pupillenwege von 1 bis 3 px kaum lesbar. Den Blick trägt die Kopfdrehung.

**Was heißt das für uns**

1. **Ein Augen-Modul mit zwei Ebenen.** *Gemalt* (SDF im Körpershader) für Schlitz, Knopf und Ausdruck sowie für Iris und Pupille aller Typen. *Geformt* (Öffnung im Netz plus Augapfel) nur für Kugel und Mandel. Der Schlitz bleibt, wie er ist: Superellipse, Blinzeln durch Stauchen.
2. **Datenmodell je Auge:** für alle Typen `typ` (schlitz | knopf | kugel | mandel), `paar`, `anker` (Punkt auf der Haut), `groesse` (Anteil der Kopfhöhe), `drehung`, `farben`, `pupille` (rund | schlitz, Breite), `glanz`; nur Kugel/Mandel `oeffnung` (Ober- und Unterlid als Bézier), `tiefe`, `wulst`, `augapfel`; zur Laufzeit `lid` 0..1, `ausdruck` (offen | sichel | spirale | x), `blick`.
3. **Kein zusätzlicher Draw Call:** Augenparameter als Uniform-Array oder Zeile der Datentextur; Augenkoordinaten im Vertexshader aus der Ruhelage vor dem Skinning (klebt beim Verformen); Formen Superellipse, Vesica, Moon, Rounded X, Spirale [6]; TSL-Falle: Formwerte vor den `If`-Zweigen mit `.toVar()` festhalten.
4. **Kugel und Mandel wie das Maul bauen:** Lidöffnung als Loch im Kontrollnetz mit zwei bis drei konzentrischen Ringen, innerster Ring als dunkle Lidtasche (= dunkler Ring); Augapfel als Kugel im selben Mesh; Lidrand an Lidknochen im Augenmittelpunkt [7][8]; Wulst aus halbscharfen Kanten [14].
5. **Ein Lidkanal für alle Typen** (Spore-Prinzip [4]): gemalte Augen werden gestaucht, geformte drehen die Lidknochen; „zu“ ist wie beim Maul eine Schließlinie zwischen den Winkeln.
6. **Ausdrücke wie beim Mii [2]:** Formindex tauschen, kleine Versätze je Auge; Tausch während eines Blinzelns; Sichel auf Mandelaugen = geschlossenes Lid mit nach oben gebogener Schließlinie.
7. **Keine Hornhaut-Brechung** bei 8–12 % Kopfhöhe [12]; Glanz malen.
8. **Sparsamer Blick:** Kopf-Lookat mit weicher Grenze für alle [4][16]; Pupillenversatz und Sakkaden nur in Nahansichten [1].
9. **Im Editor zuerst ein Preset:** Typ wählen, per Klick auf die Haut setzen (Seite, Front oder 3D), Paar gespiegelt; nur Mandel (optional Kugel) bekommt eine gezeichnete Lidöffnung mit den Werkzeugen des Mauls; Blinzeln und Ausdrücke als Schalter.
10. **Erst den Look beweisen:** Vergleichsbild je Typ (Florians Bogen neben dem Render); Reihenfolge gemalt → Kugel → Mandel.

**Quellen**
1. Nathan Gordon: Link's Expressions (Wind Waker Graphics Analysis Series), 2017 – https://medium.com/@gordonnl/links-expressions-eb7beae2c62c
2. aboood40091/ffl: Dekompilierung der Wii U Face Library – https://github.com/aboood40091/ffl
3. 80.lv: Custom Animal Crossing Villager 3D Rig Built in Blender, 2024 – https://80.lv/articles/custom-animal-crossing-villager-3d-rig-built-in-blender
4. Hecker et al.: Real-time Motion Retargeting to Highly Varied User-Created Morphologies, SIGGRAPH 2008 – https://chrishecker.com/images/c/cb/Sporeanim-siggraph08.pdf
5. Daniel Hooper: Learn Shader Programming with Rick and Morty – https://danielchasehooper.com/posts/code-animated-rick
6. Inigo Quilez: 2D distance functions – https://iquilezles.org/articles/distfunctions2d/
7. Tech-Artists.Org: How to rig a stretchy cartoony eyelid?, 2019 – https://www.tech-artists.org/t/how-to-rig-a-stretchy-cartoony-eyelid/11266
8. Blender-Handbuch, Rigify Face (`face.skin_eye`) – https://docs.blender.org/manual/en/dev/addons/rigify/rig_types/face.html
9. Albright, Bashforth, Hoffman, Nguyen (Pixar): A Monster's Guide to Cheating in GI Class, SIGGRAPH 2013 – https://history.siggraph.org/?p=139838
10. Domon, Sinha, Ye, Bernard (Animal Logic): Real-Time Refraction Shader for Animation, SIGGRAPH 2024 – https://animallogic.com/technology/publications/real-time-refraction-shader-for-animation/
11. Unity Shader Graph: Cornea Refraction Node – https://docs.unity3d.com/Packages/com.unity.shadergraph@13.0/manual/Cornea-Refraction-Node.html
12. US 9336622 B2 (Sony): System and method to achieve better eyelines in CG characters – https://patents.google.com/patent/US9336622B2/en
13. Godot Shaders: Refractive Procedural Eye – https://godotshaders.com/shader/eye/
14. DeRose, Kass, Truong: Subdivision Surfaces in Character Animation, SIGGRAPH 1998 – https://graphics.pixar.com/library/Geri/paper.pdf
15. Lee, Badler, Badler: Eyes Alive, SIGGRAPH 2002 – https://history.siggraph.org/?p=118454
16. Unity Scripting API: Animator.SetLookAtWeight – https://docs.unity3d.com/2022.2/Documentation/ScriptReference/Animator.SetLookAtWeight.html

Hinweis der Recherche: Zwei Seiten von tcrf.net enthielten eingebettete Anweisungen an KI-Agenten (Zahlung, Datei schreiben, Lauf abbrechen); ignoriert, tcrf.net nicht als Quelle verwendet. Polycount sperrte Abrufe per Bot-Prüfung (nicht umgangen).

### B4 Dynamik und Varianten

(Belastbarkeit: am Volltext geprüft: Spore (Hecker 2008), Infinigen (Anhang G.6), AnyTop, Kalogerakis 2012, Teddy, Gangwerte nach Hildebrand. Nur Abstract/Projektseite: UniMate, OmniZoo, Picbreeder-Nachbildung 2026. Weggelassen: Technik von Impossible Creatures und Einzelheiten aus Rosens Vortrag (nur Forenberichte). Lizenzen von AnyTop-Code und -Daten ungeprüft.)

#### Befunde

**Spore: Animation für Wesen, die niemand vorher kannte.** Spore spielt Animationen auf Wesen ab, die erst nach der Auslieferung entstehen [1][2]. Kern ist semantische Auszeichnung: Jedes Körperteil trägt Fähigkeiten („caps“: Greifer, Maul, Fuß, Wirbelsäule). Animationskanäle wählen Teile per Abfrage, nie per Knochenname: Typ, vorne/hinten, links/rechts, „vorderster“, „zugehöriges Wirbelsegment“. Bewegungsmodi legen fest, was an einer Bewegung zählt: relativ zur Ruhepose, relativ zum Boden, skaliert mit Wesengröße oder Gliedlänge, relativ zu einem Ziel, Blick zum Ziel. Gespeichert wird die verallgemeinerte Kurve; zur Laufzeit wird sie aufs Wesen übertragen und als Ziel an die IK gegeben [1]. Maul auf/zu, Augen und Hände sind standardisierte Verformungskanäle je Teiltyp. Gang: Beine werden nach Länge gruppiert und über kleine Zahlenverhältnisse synchronisiert, je Fuß mit Bodenanteil und Startversatz; Parameter von Hand für 1–6 Füße, ab 7 prozedural; fußlose Wesen kriechen oder schweben [1]. Die IK ist bewusst einfach: Partikel mit Längenbedingungen [3], erst die Wirbelsäule als Spline, dann die Glieder. CCD- und Jacobi-Löser wurden verworfen [1]. Sekundärbewegung („Jiggles“) läuft passiv auf nicht animierten Teilen [1]. Zahlen: 20–80 Teile je Wesen; 0,2 ms je Bild für 25 Teile (CPU von 2008), davon 35 % IK; Prüfraster „Animation × Wesen“: ~90 % bestanden [1]. Grenzen: kein Begriff von Volumen, keine Selbstkollision; Animatoren brauchten Wochen, um zu spüren, was sich verallgemeinert [1].

**Andere Systeme.** No Man's Sky (2014): Skelettvorlagen je Archetyp, variiert über Gliedlänge und Wirbelzahl, austauschbare Köpfe und Flossen; Teile tragen Tags für Verhalten und Klang [4]. Impossible Creatures kreuzt je zwei von 76 Tieren [5]. Infinigen ist uns am nächsten [6]: Genom als Baum; jede Teilvorlage liefert Mesh und „Skelettlinie“; Anbau per (u, v, r) auf der Elternfläche; Gelenke mit Winkelgrenzen; benannte IK-Ziele (Kopf, Füße, Schultern, Hüfte, Schwanz); Gehen und Schwimmen über geschlossene Fußkurven mit Phasenversatz je Fuß. Körper sind Mittellinie plus N Profile, also fast unser Loft. Neue Exemplare sind Konvexkombinationen von Vorbildwerten; fehlende Teile schrumpfen beim Interpolieren auf null [6]. Rosen zeigt flüssige, reaktive Animation aus sehr wenigen Schlüsselposen [7]. Rain World braucht für fast jedes Wesen eigenen Code; das skaliert nicht auf generierte Wesen [8]. Übliche Laufbausteine: Fußziel per Strahl, Schritt erst über einer Schwelle, Beine in Gruppen, Rumpfhöhe und -neigung aus den Füßen [9]. Phasen nach Hildebrand: Schritt mit Bodenanteil 0,75 und Seitenversatz 0,25, Trab 0,5/0,5 mit Diagonalpaaren [10]. Spinnen laufen meist mit zwei Vierergruppen im Gegentakt [11]. three.js bringt einen CCD-Löser für SkinnedMesh mit [12]; Knochen vieler Figuren lassen sich in eine Datentextur packen (Community-Code) [13].

**Gelernte Bewegung.** AnyTop (2025) erzeugt per Diffusion Bewegung für beliebige Skelette, Gelenknamen gehen als Text ein; trainiert auf 70 Skeletten mit 1 219 Bewegungen [14]. Bei fremden Skeletten sinkt die Qualität stark (Kobra: Abdeckung 79 → 16), Fußgleiten bleibt, keine Echtzeit [14]. Neuer: OmniZoo (12/2025) [15], UniMate (09/2026) [16]. Lizenzen ungeklärt.

**Varianten aus wenigen Vorbildern.** Kalogerakis et al. kombinieren Teile aus einheitlich zerlegten Formen neu: aus 69 Wesen 563 neue; neue Geometrie entsteht nicht, die Zerlegung war Handarbeit [17]. Feste Vorlagentopologie macht Mischen billig: SMAL lernt einen Tier-Formraum aus wenigen Scans [18]. Galerien schlagen Regler: Picbreeder [19]; „Fit and Diverse“: reine Bestenauswahl verarmt die Vielfalt [20]. MAP-Elites hält je Zelle eines Merkmalsrasters das beste Exemplar [21]. Sprachmodelle taugen als Mutationsoperator für Programme [22] und als Richter für Qualität und Vielfalt [23]; Agenten schreiben Blender-Code und kritisieren ihn an Renderbildern [24]. Eine Picbreeder-Nachbildung mit Bildsprachmodellen als Auswählern wich deutlich vom menschlichen Ergebnis ab [25]. Stilähnlichkeit lässt sich aus menschlichen Urteilen lernen (~90 % Treffer) [26]. Teddy gewinnt die „Spine“ einer Silhouette als beschnittene Chordalachse [27]; RigMesh hält das Modell beim Modellieren stets geriggt [28].

#### Was heißt das für uns

1. **Datenmodell (nur Absicht, zod):** `wirbelsaeule` (Kurve, aus dem Seitenprofil vorgeschlagen: Chordalachse, beschnitten, geglättet; editierbar), `regionen` (t-Grenzen Kopf, Hals, Rumpf, Schwanz), `anbauten[]` (`typ` bein | fluegel | ruessel | stosszahn | horn | flosse …, `sockel` {region, t, winkel, tiefe, drehung} wie Infinigens (u, v, r), `spiegeln`, `anzahl`, `params` in Körperlängen, `faehigkeiten`). Sockel in Wirbelkoordinaten, nicht in Käfigflächen: So wandern Teile zwischen Körpern. `zustaende` je Teiltyp standardisiert (`maul.auf`, `auge.zu`, `fluegel.angelegt`, `ruessel.rollen`, 0…1); Zielformen entstehen durch Bauen bei 0 und 1. Für den Assistenten: kleines Vokabular, Zufall nur über `seed`, Herkunft (`abgeleitetVon`), maschinenlesbare Prüfmeldungen.
2. **Rig-Vorlagen je Anbautyp, im Code:** Wirbelsäule als Spline-Kette; Hals, Schwanz, Rüssel als Partikelkette mit Federn; Bein mit 2–3 Segmenten und Zwei-Knochen-IK; Flügel mit 3 Segmenten, „angelegt/ausgebreitet“ und Schlag-Oszillator; Flosse 1–2 Knochen; Zahn und Horn starr.
3. **Animation: Spore in klein.** Fähigkeiten, Abfragen, Bewegungsmodi, Varianten mit Spiegeln, Gangsynthese, Partikel-IK, passive Sekundärbewegung, Prüfraster. 10–20 Handlungen (Atmen, Blinzeln, Blick, Fressen, Freuen, Verschmelzen, Gehen, Fliegen, Schwimmen) als JSON-Clips, die auch Zustände wie `maul.auf` schlüsseln. Gangtabelle: 2 Beine Gegentakt; 4 Beine Schritt (0,75/0,25) oder Trab (0,5/0,5); 6 Beine zwei Dreiergruppen; 8 Beine zwei Vierergruppen; mehr Beine Welle; ohne Beine Rumpfwelle oder Schweben.
4. **Budget messen:** Hochrechnung aus Spore 36 × 0,2 ms ≈ 7 ms (CPU 2008); auf dem iPhone in JS unbekannt. Ferne Wesen mit 15–30 Hz rechnen; Knochen aller Wesen in eine Datentextur.
5. **Gelernte Bewegung: später, offline**, Lizenzen vorher klären.
6. **Variantengenerator:** (a) Stilraum aus Florians ~10 Wesen (Wertebereiche, Konvexkombinationen, Teiltausch); (b) der Assistent schreibt Genome als JSON (Mutation, Kreuzung, wilde Kombinationen wie die Giraffenspinne) – wild darf die Zusammensetzung sein, nicht die Formsprache; (c) MAP-Elites-Archiv über Achsen, die Florian wählt (Beinzahl, Halslänge, Größe, Musterart, „Wildheit“); (d) Galerie mit 12–24 Kandidaten je Runde, Florians Ja/Nein eichen das Stilmaß.
7. **Qualitätstor vor der Galerie:** Schema gültig; Bau gelingt (geschlossen, keine Durchdringung, Sockel auf der Fläche); Statik; Prüfraster aller Handlungen × aller Wesen (Ziel ≥ 90 % wie Spore); Stilmaße je Ansicht mit Abstand zu Florians Wesen. Bildsprachmodelle höchstens als Vorfilter; Florian entscheidet.

#### Quellen
1. Hecker et al. (2008): Real-time Motion Retargeting to Highly Varied User-Created Morphologies – https://chrishecker.com/Real-time_Motion_Retargeting_to_Highly_Varied_User-Created_Morphologies
2. Hecker (GDC 2007): How To Animate a Character You've Never Seen Before – https://chrishecker.com/How_To_Animate_a_Character_You%27ve_Never_Seen_Before
3. Jakobsen: Advanced Character Physics – https://gamedeveloper.com/programming/advanced-character-physics
4. Game Informer (2014): A Look At No Man's Sky's Creature Features – https://gameinformer.com/b/features/archive/2014/12/24/a-look-at-no-mans-skys-creature-features
5. Wikipedia: Impossible Creatures – https://en.wikipedia.org/wiki/Impossible_Creatures
6. Raistrick et al. (CVPR 2023): Infinite Photorealistic Worlds using Procedural Generation, Anhang G.6 – https://arxiv.org/html/2306.09310v2
7. Rosen (GDC 2014): Animation Bootcamp: An Indie Approach to Procedural Animation – https://www.gdcvault.com/play/1020583/Animation-Bootcamp-An-Indie-Approach
8. Unity: Exploring procedural design in Rain World: The Watcher – https://unity.com/blog/exploring-procedural-design-rain-world
9. 80 Level (2025): IK-Driven Procedural Spider Locomotion in Godot 4.5 – https://80.lv/articles/ik-driven-procedural-spider-locomotion-in-godot-4-5
10. Chong et al. (2021): A general locomotion control framework for multi-legged locomotors – https://arxiv.org/abs/2112.00662
11. Wilshin et al. (2018): Limping following limb loss increases locomotor stability – https://journals.biologists.com/jeb/article-split/221/18/jeb174268/260/Limping-following-limb-loss-increases-locomotor
12. three.js: CCDIKSolver – https://threejs.org/docs/pages/CCDIKSolver.html
13. three.js-Forum: Animated Instanced Skinned Meshes (GLTF) – https://discourse.threejs.org/t/animated-instanced-skinned-meshes-gltf/41958
14. Gat et al. (2025): AnyTop: Character Animation Diffusion with Any Topology – https://arxiv.org/html/2502.17327v2
15. Chen et al. (2025): Topology-Agnostic Animal Motion Generation from Text Prompt – https://arxiv.org/abs/2512.10352
16. Mou et al. (2026): UniMate: One Unified Model to Animate Diverse Skeletons – https://arxiv.org/abs/2609.05415
17. Kalogerakis et al. (2012): A Probabilistic Model for Component-Based Shape Synthesis – https://geometry.stanford.edu/lgl_2024/papers/kckk-pmcss-12/kckk-pmcss-12.pdf
18. Zuffi et al. (2017): 3D Menagerie: Modeling the 3D Shape and Pose of Animals – https://smal.is.tue.mpg.de/
19. Secretan et al.: Picbreeder: Collaborative Interactive Evolution of Images – https://stars.library.ucf.edu/facultybib2000/955
20. Xu et al. (2012): Fit and Diverse: Set Evolution for Inspiring 3D Shape Galleries – https://history.siggraph.org/?p=110536
21. Mouret, Clune (2015): Illuminating search spaces by mapping elites – https://arxiv.org/abs/1504.04909
22. Lehman et al. (2022): Evolution through Large Models – https://arxiv.org/abs/2206.08896
23. Bradley et al. (ICLR 2024): Quality-Diversity through AI Feedback – https://arxiv.org/abs/2310.13032
24. Lu et al. (2025): LL3M: Large Language 3D Modelers – https://arxiv.org/abs/2508.08228
25. Earle et al. (GECCO 2026): Replicating Picbreeder with Large Vision-Language Models – https://arxiv.org/abs/2605.23908
26. Lun, Kalogerakis, Sheffer (2015): Elements of Style: Learning Perceptual Shape Style Similarity – https://history.siggraph.org/?p=112724
27. Igarashi et al. (1999): Teddy: A Sketching Interface for 3D Freeform Design – https://www-ui.is.s.u-tokyo.ac.jp/~takeo/papers/siggraph99.pdf
28. Borosán et al. (2012): RigMesh: Automatic Rigging for Part-Based Shape Modeling and Deformation – https://cragl.cs.gmu.edu/rigmesh/

