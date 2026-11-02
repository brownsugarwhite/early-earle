# Gegenprüfung: Ist „ein Liniennetz, ein Löser“ der eleganteste Weg zu Florians Zielbild? (02.11.2026)

> Schritt 2 des Vorgehens aus `docs/UEBERGABE.md` („Vorgehen ab 22.10.“). Grundlage: Florians Klarstellungen vom 02.11.
> ([`2026-10-22-klarstellungen.md`](2026-10-22-klarstellungen.md), wörtlich), die beiden Recherchen vom 21.10.
> ([Feldnetz oder Kernring?](../research/2026-10-21-feldnetz-oder-kernring.md), [Netz und Linien im
> Ganzen](../research/2026-10-21-netz-und-linien-gesamt.md)), die Pläne vom 13.–21.10., das Kritik-Register, der Code des
> Editors und des Kerns, frische Messungen (Abschnitt 8) und zwei weitere Recherchen (Abschnitt 9). Kein Code geändert, nichts
> umgebaut. Der Prüfplan dazu: [`2026-11-02-pruefplan-p0-p3.md`](2026-11-02-pruefplan-p0-p3.md).

## 0. Kurzantwort

1. **Ja, die Richtung stimmt — und deine Klarstellungen machen sie einfacher, nicht schwieriger.** „Ein Liniennetz, ein
   Löser“ bleibt das Zielbild. Drei Dinge ändern sich gegenüber den Recherchen vom 21.10., und jedes davon streicht
   Maschinerie statt welche hinzuzufügen:
   - **Die Ansichten sind Illustrationen aus Linien, nicht Silhouetten des Ganzen.** Jede Umrisslinie ist eine
     geschlossene Schleife auf der Haut (die Stelle, an der die Haut von der Blickrichtung wegkippt), sichtbar oder
     verdeckt, und läuft durch — der Bauch von oben unter dem Kopf hindurch, blass. Die beiden Zusatzpunkte der heutigen
     Vereinigungs-Silhouette gibt es nicht mehr; sie waren nie Teil deiner Zeichnung. Damit steht die Teile-Struktur **in der
     Zeichnung** statt in einer automatischen Erkennung (S4) — die Erkennung wird ein Vorschlag, den du annimmst oder änderst.
   - **Loops sind gezeichnete Linien.** Ein Edge Loop ist eine Linie in Seite oder Top (gestrichelt, wo er weich ist), die als
     Ring im Netz liegt. Spant, Reifen und ⌘R-Loop werden ein Ding, und die Topologie des Körpers steht damit ebenfalls in der
     Zeichnung. Die Muster-Füllung („Stücknetz“) braucht es nur noch dort, wo zwischen den Linien kein Gitter aufgeht:
     Kappen, Ansätze, Mundwinkel, Augen.
   - **Zwischen den Linien gilt „so rund wie möglich“ als Maß.** Das ersetzt die Füllung aus der Sichthülle („berühren
     rund | mittel | genau“, „Querschnitt aus der Hülle“) und die Kopie des Front-Umrisses in jeden Querschnitt (Front-Lappen,
     Spanten). Gemessen (Abschnitt 8): Die flachen Flanken — die Ursache der wilden Linien — kommen aus diesen gezeichneten
     Querschnitten und aus Zeichnungen, die selbst flach sind, **nicht** aus der Superellipse („mittel“ ändert das Flachband um
     höchstens 3 Punkte). Wo die Zeichnung flach ist (Kegel), bleibt der Umriss in der Tiefe unbestimmt — genau deshalb muss er
     eine geplante Linie sein. Die Sichthülle bleibt nur, um Widersprüche rot zu zeigen.
2. **Die Recherchen vom 21.10. hatten vier Lücken** (Abschnitt 4): Sie nahmen den Umriss je Ansicht als *eine* Schleife mit
   berechneten Sprüngen an T-Stößen statt als gezeichnete Schleifen je Teil; sie ließen die Füllung aus der Sichthülle stehen;
   sie hatten kein Spiel-Budget und keinen Spiel-Umschalter (das Budget kam erst am 22.10. dazu); und sie prüften die Linien
   nur als Zahlen (Knicke), nicht als Illustration, die du siehst. Dazu fehlte die Werkzeugfrage ganz.
3. **Werkzeuge:** Von den heutigen Chips und Werkzeugen entfallen im Zielbild neun, weil der Bau sie überflüssig macht
   (Spanten S, Reifen ⌃R, Haut heute|glatt, Umrisse berühren, Querschnitt heute|Hülle, Umrisse aus|an, Körper Röhre|Teile,
   Neu ableiten, Teile-Automatik als Wahrheit). Bleiben: Zeichnen wie Illustrator (A, P, ⌥-Ecke, ⇧W), G/S/R mit O, ⌘R-Loops,
   Pinsel für Relief und Posen, Maul, Zähne, Augen, Posen, Pauspapier. Tabelle in Abschnitt 5.
4. **Spielqualität von Anfang an:** Die Dichte des Käfigs kommt aus dem Spiel-Budget (Stufe 1 ≤ 8 000 Dreiecke samt Maul),
   nicht umgekehrt. Ein Umschalter „Spiel“ auf der Bühne zeigt Stufe 1 mit den Normalen der glatten Fläche und die Dreieckszahl.
   Heute: Körper ohne Maul 3 200 Dreiecke auf Stufe 1; der Maul-Einsatz auf K2 liegt schon auf Stufe 0 beim Zwei- bis
   Dreifachen des Budgets, auf Stufe 1 beim Zehnfachen (Abschnitt 8). Das wird ein hartes Tor in P2 und P3.
5. **Die Beweise P0–P3 testen jetzt das Richtige**, wenn sie umgebaut werden wie im Prüfplan: P0 geteilt (P0a Spielstufe auf
   dem Mac, sofort; P0b iPhone, wenn du da bist), P1 „Ansichten als Illustration“ (Konturschleifen, verdeckte Linien, runde
   Füllung, schwarze Linie = Umriss), P2 „Stücknetz im Maulfeld“ mit Budget-Tor, P3 „Loops und Linien am ganzen Körper“ mit
   Ansatz-Loops, Pol-Regel, Posen an Linien. Etwa drei Wochen Arbeitstage, jeder Beweis mit Abbruchkriterien und Bildern.
6. **Unkonventionelle Ideen, die sich zu prüfen lohnen** (Abschnitt 6): das Blatt ist das SVG (Anzeige = Ausgabe); Teile
   als überlappende Umrisse; Loops zeichnen heißt Ringe setzen; Härte = eine Zahl je Knoten für Falte und Strich; der Käfig
   ist das Spielnetz; Automatik nur als Vorschlagslinie, nie als Wahrheit.

## 1. Deine Klarstellungen als prüfbare Sätze

| Nr. | Deine Worte (gekürzt) | Prüfbarer Satz |
|---|---|---|
| K1 | „eine illustration mit outlines die sich automatisch aus der form + kante mit gezeigter verjüngung ergibt zusammen mit den edgeloops“ | Jede Ansicht zeigt Umrisslinien je Teil, Kanten mit Strichstärke = Härte (verjüngt zu den Enden) und Loops; alle drei sind Linien desselben Netzes. |
| K2 | „sinnvollerweise die meisten kanten edgeloops“ | Eine harte Kante ist in der Regel ein Ring (Loop) oder eine Längsreihe des Käfigs mit Falte; freie Linien sind der Sonderfall. |
| K3 | „outlines die … falten, höhe und tiefe andeuten können … Flosse … edgeloop gestrichelt für den ansatz … harte kante für ein überstehendes teil … von oben eine sichelform“ | Loops dürfen weich sein (gestrichelt, Härte 0) und trotzdem Form geben; der Ansatz eines Teils ist ein gezeichneter Loop auf dem Rumpf; eine überstehende Kante ist eine harte Linie; in der anderen Ansicht erscheint dieselbe Linie als ihre Projektion (Sichel). |
| K4 | „zu sehr auf spanten und silhouetten … alle werkzeuge … ob ich diese wirklich brauche“ | Werkzeuge, die nur eine Schwäche des Baus ausgleichen, entfallen (Abschnitt 5). |
| K5 | „halb- und viertelansichten … nicht immer 100%ig ableiten … das Mesh immer den exakten weg … ohne kante so rund wie möglich“ | Zwischen den Linien ist die Haut die glatteste Fläche, die alle Linien trifft; messbar als Krümmungsmaß in 45°-Ansichten, ohne flache Bänder und ohne Falten, die niemand gezeichnet hat. |
| K6 | „schwarze linie … so läuft wie die gelbe linie … bauch von oben durch den kopf … gestrichelt oder blasser … bearbeitbar … die 2 zusätzlichen punkte … brauchen wir nicht mehr“ | Die schwarze Linie ist der Umriss des Körpers (Δ = 0 durch Bauart). Umrisse laufen je Teil durch; verdeckte Stücke sind Linien mit Knoten; die Vereinigungs-Silhouette wird nur gezeichnet, nie gespeichert. |
| K7 | „aus 3 Outline-Illustrationen (5 mit unten und hinten) entsteht eine 3d grafik … Blueprints oder CAD grafiken … outlines zwischen 3px und 0px bzw gestrichelt“ | Die Ansichten sind die Vektorillustration selbst: dieselben Linien, dieselbe Schrift (3 px hart … 0 px weich, gestrichelt), Anzeige = Ausgabe. |
| K8 | „Das Mesh muss intelligent und super elegant sein“ | Keine Regel im Kern nennt einen Körper oder eine Lage; die Topologie folgt den gezeichneten Linien; Pole liegen nach einer allgemeinen Regel. |
| K9 | „von beginn umstellen … spielqualität … ob das mesh gut auf die low poly variante umgesetzt wird“ | Ein Umschalter zeigt das Spielnetz (Stufe 1) mit Dreieckszahl und Budget; der Käfig wird so dicht gebaut, dass Stufe 1 das Spielnetz ist. |
| K10 | „ehrlich bestätigen … gegen die aktuellen pläne und den bisherigen projektverlauf … keine abkürzungen“ | Diese Seite, Abschnitt 2 und 4; Messungen in 8; nichts als bestanden gemeldet. |

## 2. Abgleich mit den Plänen und dem Verlauf

Was deine Klarstellungen bestätigen, präzisieren oder ersetzen (jeweils mit der Stelle, an der es bisher stand):

| Klarstellung | Bisheriger Stand | Verhältnis | Folge |
|---|---|---|---|
| K1/K6 Umriss je Teil, verdeckt bearbeitbar | 16.10.: „Das 3D-Liniennetz ist die einzige Wahrheit, die schwarze Linie zeigt den Ist-Zustand“; Plan 16.10., Antwort 1: „verdeckte Linien der Teile — automatisch ergänzt, dezent gezeigt, von dir änderbar“; S4 zeigt verdeckte Teilumrisse gestrichelt („geraten“), per Klick als eigene Kurve, **ohne Wirkung auf den Körper** | **präzisiert** | Verdeckte Umrisse sind vollwertige Linien des Netzes mit Wirkung auf den Körper, nicht Anzeige. Die Vereinigungs-Silhouette (schwarze Linie mit Zusatzpunkten) entfällt als Zeichnung. |
| K1/K6 vs. 16.10. früh: „Die Wirbelsäulen-Baum muss automatisch entstehen können! … Sobald ein Vektorshape … einen Bauch bekommt, muss die Wirbelsäule … automatisch entstehen“ | S4 Teilerkennung (Skelett, Hysterese, eingefrorene Sehnen), S5 Baum aus der Erkennung | **Spannung** | Lesart (Entscheidung E2, Abschnitt 10): Die Automatik bleibt als **Vorschlag** — sie ergänzt die verdeckte Fortsetzung einer Umrissschleife, wie heute die gestrichelte Linie —, aber gebaut wird nur aus den Linien, die im Dokument stehen. Du zeichnest weiter nur Umrisse; der Vorschlag spart die Handarbeit, bestimmt aber nicht die Wahrheit. |
| K2 Loops als gezeichnete Linien | Teil L (15.10.): „Spanten gehen in den Linien auf … Ein Querschnitt ist eine geschlossene Linie“; Plan 20.10., 3.6: „Spant, Reifen und Blender-Loop werden ein Ding“; V6: ⌘R setzt Loops nur an einer Stelle längs der Wirbelsäule, Spanten in der Front bearbeitet, S und ⌃R noch da | **bestätigt, nicht fertig** | Ein Loop ist der Schnitt des Körpers mit der Fläche über der gezeichneten Kurve (Blickrichtung der Ansicht) — also auch schräg, gebogen, um einen Hals. Werkzeug S und ⌃R entfallen (Plan 20.10. sah das schon vor). |
| K3 Ansatz als gestrichelter Loop | S6: Fenster auf dem Fußabdruck des Teils, Kragen (R1), Fensterrand schwach gebunden | **vereinfacht** | Die Ansatzlinie ist gezeichnet (oder vorgeschlagen) und damit eine Linie wie jede andere; Fußabdruck-Rechnung und Fenster-Regeln entfallen. |
| K4 Werkzeuge | Plan 20.10., 1.3 Nr. 6 „Schalter wuchern“ und 4.5 „Chips, die nichts bewirken, gibt es nicht“ | **bestätigt** | Abschnitt 5: neun Chips/Werkzeuge entfallen im Zielbild. |
| K5 „so rund wie möglich“ | S2 glatte Haut (Glättung relativ zur Zielform), S3 „berühren mittel“ als Standard (Superellipse, von dir „mach weiter“ als Versuch), V4 „Querschnitt aus der Hülle“; 16.10., Antwort 4: „Manche Zeichnungen verlangen einen kantigen Körper“ | **ersetzt** | Die Füllung aus der Sichthülle war ein Versuch, keine Entscheidung. Neu: Kantig nur, wo eine harte Linie gezeichnet ist; sonst rund, und wo eine Ansicht etwas verlangt, das nur kantig ginge, wird es rot (Entscheidung E4). |
| K6 „wie die gelbe Linie“ | Gelb = Lichtsaum = echte Silhouette, wo sie > 2 px von der Kurve abweicht (Schritt 4, 15.10.); 16.10.: „Gelb soll leer sein“; Plan 20.10., Zielbild: Δ ≤ 0,5 px | **bestätigt** | Mit „Umriss zuerst“ ist Δ = 0 Bauart (Abschnitt 3.4); der Saum wird zur reinen Prüfung. |
| K7 Blueprint-Look | V8 „Vektor-Ausgabe und Linienschrift“ als letzter Schritt; Plan 20.10., 3.8 „Eine Linienschrift“ | **vorgezogen** | Die Blätter zeichnen die Illustration selbst (dieselbe Schrift wie das SVG); V8 wird Anzeige, nicht Export. |
| K9 Spielqualität | Phase 5 (Register): „Export ins Spiel“ zuletzt; Tafel „Spiel“ zeigt heute nur Kennzahlen; Budget-Tor seit 22.10. im Vorgehen | **vorgezogen** | P0a baut den Umschalter; Käfigdichte aus dem Budget (Abschnitt 3.6). |
| Grundidee 15.10. (Blendshapes + Bones, alle Werkzeuge in der Pose) | Teil B gebaut (B1–B7) | **unberührt** | Posen und Pinsel hängen an Linien statt an Punktnummern (Recherche 21.10., 3.5) — bleibt. |
| 11.10.: „Punkte setze ich von Hand … die Kopplung fügt nie Punkte ein“; 16.10.: „nur wenn wirklich notwendig“ | S1c Kopplung jedes Punkts | **vereinfacht** | Mit Umrissschleifen je Ansicht teilen sich zwei Ansichten nur die Kreuzungspunkte (sechs an einem Blob). Kopplung = Außenmaße + Kreuzungen + Widerspruchsprüfung; kein Einfügen mehr nötig (Abschnitt 3.5). |
| 14.10.: „Rot und Blau gehen von der Seite direkt in die schwarze Linie über“ | Maullinie als Kantenpfad, Teil A Einsatz | **bestätigt** | Die Maullinie ist eine Linie des Netzes mit Schlitz (Teil A bleibt, als Fall des Stücknetzes). |

## 3. Das Zielbild technisch, mit deinen Klarstellungen

### 3.1 Eine Linienschrift, sechs Linienarten
Alle Linien sind Kantenzüge des Käfigs (nach dem Bau exakte B-Splines, deshalb auch als Vektorkurven exakt). Je Knoten eine
Härte 0 … 1; sie steuert zugleich die Schärfe der Falte im Käfig und die Strichstärke im Blatt (0 px gestrichelt … 3 px schwarz),
die Enden laufen verjüngt aus.

| Linienart | Was sie im Netz ist | Wer sie setzt |
|---|---|---|
| Umrissschleife (je Ansicht, je Teil) | geschlossene Schleife auf der Haut, an der die Normale senkrecht zur Blickrichtung steht; in der Seite die Naht (z = 0), im Top die Breitenlinie, in der Front die Frontlinie — **mit** ihren verdeckten Stücken | du (verdeckte Stücke als Vorschlag) |
| Loop (Ring) | Schnitt des Körpers mit der Fläche über der gezeichneten Kurve längs der Blickrichtung (Seite oder Top); weich = gestrichelt | du (⌘R oder Stift) |
| Kante (P-Linie) | freie Linie auf der Haut; Längsreihe, Ring oder — wenn weder noch — eigene Schleife mit Polen | du |
| Ansatzlinie | Loop auf dem Rumpf, an dem ein Teil (Flosse, Bein, Flügel, Hals) ansetzt | du oder Vorschlag |
| Maullinie | Linie mit Schlitz (Teil A), Mundwinkel regulär | du |
| Augenlinie | geschlossene Schleife (Höhle, Lid, Brauenwulst als harte Linie) | du oder Klick |

### 3.2 Das Blatt ist die Illustration
Jedes Blatt zeichnet genau diese Linien in einer Schrift: eigene Hälfte schwarz, Spiegel weiß (wie heute), Härte = Strichstärke,
weich = gestrichelt, **verdeckt = blass** (Entscheidung E1), Enden verjüngt; fremde Linien (die Projektion eines Loops aus der
anderen Ansicht) in der Farbe ihrer Ansicht. Das SVG der Vektor-Ausgabe (V8) ist dasselbe Bild. Der Körper liegt wie heute
dahinter; Δ und Saum bleiben als Prüfung, sollen aber leer sein. Die Linien sind die Zeichnung des Editors (Blueprint), nicht
der Look im Spiel — dort gilt weiter „keine Konturen“ (Regel vom Prototyp), die Form trägt sich allein.

### 3.3 Topologie aus der Zeichnung
- **Ringe** sind die Loops. **Längsreihen** sind die Umrissschleifen, wo sie längs laufen (Naht, Breitenlinie), und die
  Längskanten (Tiger-Kasten). Zwischen zwei Loops und zwei Reihen liegt ein Viereck-Gitter — das ist der heutige Körper, nur
  mit **deinen** Ringen statt der automatisch verteilten.
- **Stücke mit drei, fünf oder mehr Seiten** entstehen nur dort, wo Linien zusammenlaufen: Kappen (Nase, Schwanz), der
  Ansatz-Loop auf dem Rumpf, der Mundwinkel, die Augenschleife, Kreuzungen schräger Kanten. Sie werden nach den bewiesenen
  Mustern gefüllt (Takayama 2014, Tarini 2022; Recherche 21.10.), Pole nach der Regel „Fünfer am Sattel, Dreier auf der Kuppe,
  fern von Linien“. Prüfkriterium dazu aus Schaefer–Warren–Zorin 2004 (Lofting von Kurvennetzen mit Catmull-Clark, 9.1): nur
  Pole mit drei oder fünf Kanten, und ein Stück mit k Rändern braucht mindestens |k − 4| davon.
- **Teile** sind keine eigene Maschinerie mehr: Ein Teil ist ein Stück Haut, das von einer Ansatzlinie umschlossen wird
  (Flosse, Bein) oder einfach die Fortsetzung des Körpers (Hals, Kopf). Was heute S4–S7 (Erkennung, Streifen, Fenster, Kragen,
  Klinge) leisten, wird: Ansatzlinie zeichnen oder annehmen, Röhre darüber, Muster am Ansatz.
- **Eingefroren** wird die Topologie, sobald sie steht (wie E3 vorsah); neu geplant wird nur, wenn eine Linie dazukommt,
  verschwindet oder eine Kreuzung wechselt — mit Hysterese, wie der Prüfplan misst.

### 3.4 Form aus den Linien: ein Löser
Ein dünn besetztes lineares System auf dem Käfig:
- **hart:** die Lage jeder Linie in ihrer Ansicht (zwei Koordinaten je Knoten; die dritte ist frei, außer an Kreuzungen);
  auf Umrissschleifen zusätzlich die Silhouettenbedingung (Normale senkrecht zur Blickrichtung; linear, Prasad 2006 / Cashman
  2013 — bei Catmull-Clark linear in den Nachbarreihen, Plan 20.10., 3.1). Die **Zuordnung** Umrisspunkt ↔ Käfigkurve ist
  der diskrete Teil (Plan 20.10., Risiko 1): Sie wird getrennt gesucht (dynamische Programmierung mit Stetigkeitsstrafe, wie
  Cashman 2013), dazwischen wird nur linear gelöst; zwei bis drei Wechsel, nie ein Neuvernetzen;
- **weich:** „so rund wie möglich“ — das Maß ist die Krümmungsvariation der Grenzfläche (Bi-Laplace auf dem Käfig, linear;
  Halstead–Kass–DeRose 1993, FiberMesh 2007), **ohne Zielform**. Heute glättet S2 relativ zu einer Zielform, deren
  Querschnitte aus dem Front-Umriss kopiert sind (Front-Lappen, Spanten); daher die flachen Flanken (Abschnitt 8 — nicht die
  Superellipse). Ohne Zielform kann die Fläche zwischen den Linien nur rund werden; kastig wird sie allein durch harte Linien;
- **Prüfung statt Bedingung:** Die Sichthülle der drei Ansichten dient nur noch dazu, Widersprüche rot zu zeigen (eine
  Umrissschleife, die ein anderes Blatt nicht erlaubt; ein Loop, der breiter ist als das Top an seiner Stelle). Nichts wird
  still entschieden. Bleibt zwischen den Schleifen ein Überstand (Sattel), ist der Rückfall Rivers 2010: Berührpunkte („Rims“)
  festhalten und nur einwärts glätten — die rundeste Fläche in der Hülle, die die Umrisse berührt.
- Mit „Umriss zuerst“ ist **Δ = 0 Bauart**: Die schwarze Linie ist die Projektion einer Käfigschleife, die hart auf ihr liegt.

### 3.5 Ansichten koppeln sich über Kreuzungen, nicht über jeden Punkt
Seite, Front und Top teilen sich nur die Punkte, an denen sich ihre Umrissschleifen auf der Haut kreuzen (an einem Blob sechs).
Alle anderen Knoten gehören genau einer Ansicht. Ziehst du in der Seite, ändert sich der Körper; die Top-Schleife bleibt deine
Linie — und wird rot, wo sie nicht mehr erreichbar ist (mit „angleichen“). Das ist die Kopplung vom 16.10. („die bearbeitete
Ansicht führt, die anderen folgen am entsprechenden Punkt“) ohne eingefügte Punkte: Es gibt keinen „entsprechenden Punkt“ mehr
außer an Kreuzungen. Zwischenansichten (45°) sind keine Zeichnung; dort gilt allein „so rund wie möglich“ (K5).

### 3.6 Der Käfig ist das Spielnetz
- Spiel-Budget: ≤ 8 000 Dreiecke je Wesen auf dem Brett, samt Maul → Käfig ≤ 1 000 Vierecke (Stufe 1 = 4 Vierecke je
  Käfigfläche = 8 Dreiecke). Ein Körper hat heute 400 Käfigflächen (3 200 Dreiecke auf Stufe 1); für Maul, Augen und Ansätze
  bleiben also rund 600 Flächen. Das Maulfeld des Stücknetzes bekommt seine Dichte aus diesem Rest, nicht aus einer zweifachen
  Verfeinerung des ganzen Käfigs (heute K2: 9 500–13 000 Flächen).
- **Umschalter „Spiel“** auf der Bühne: Stufe 1 statt 3, die Punkte **auf der Grenzfläche** (Limit-Stencil, wie Blenders „Use
  Limit Surface“) mit den **Normalen der Grenzfläche** — die Cel-Stufen bleiben glatt, nur die Silhouette ist polygonal; harte
  Falten als getrennte Normalen, halbscharfe als eine. Earle-Material wie im Spiel (Stufenkante mit fwidth-smoothstep),
  Dreieckszahl und Budget im Titel, Silhouettenfehler in Gerätepixeln **gegen die Grenzfläche** (nicht gegen Stufe 3) bei
  Spielgröße. Was du dort siehst, ist, was das Spiel zeigt. Zahlen in Abschnitt 8, Recherche in 9.2.
- **Dichteregel aus dem Fehlermaß:** Sagitta s ≈ l²/(8r). Bei 1 Gerätepixel Toleranz darf eine Stufe-1-Kante am Rumpf
  (r ≈ 200 px bei Spielgröße) ≈ 40 px lang sein, an der Schnauze (r ≈ 50 px) ≈ 20 px. Mit 16 Punkten je Ring liegt der Rumpf
  heute bei ≈ 4 px Fehler auf Stufe 1 — Stufe 1 braucht deshalb Grenzflächen-Lagen und eher 24 Punkte je Rumpfring. Aufteilung
  der 1 000 Flächen (Vorschlag): Körper 600–700, Maulfeld 200–300 (Rachen gröber), Zähne ≤ 100.
- Posen: Käfig-Deltas auf Stufe 1 zu backen ist **exakt** (Subdivision ist bei fester Topologie linear), jedes Morph-Ziel
  bekommt sein Normalen-Delta; Kieferknochen: „Käfig skinnen, dann unterteilen“ und umgekehrt unterscheiden sich nur im
  Übergangsband der Gewichte (Gelenk) — der Editor zeigt beides und das Δ. glTF wendet Morph vor Skinning an — unsere Reihenfolge.

### 3.7 Was bleibt
Löser, Catmull-Clark, Messungen (Δ, Falten nach Zonen, Durchdringung), Extremreihe, Maul-Prüffälle, Posen-Kern (Teil B),
Zähne und Augen (Phase 2, hängen an Linien), Earle-Material, Editor-Gerüst (Blätter, Bühne, Stamm, Tafel, Undo, Library).
Wegfallen würden nach bestandenen Beweisen: Kernring und Leiter, Treppe, Frontlinie aus Ringstücken, Breitenpunkte, „berühren“
und „Fülle“, Hüllenschnitt, Teilerkennung als Bau-Grundlage, Fenster und Kragen, Spanten und Reifen als eigene Dinge.

## 4. Lücken und Denkfehler — in den Recherchen vom 21.10., in den Plänen, und bei mir

| Nr. | Lücke / Denkfehler | Wo | Folge im Prüfplan |
|---|---|---|---|
| L1 | **Umriss als eine Schleife je Ansicht** mit berechneten Sprüngen an T-Stößen („springt nur an T-Stößen“). Richtig: Umrissschleifen je Teil, verdeckte Stücke gezeichnet oder vorgeschlagen; T-Stöße sind nur Anzeige. Monster Mash (2020) arbeitet genau so: Teile als überlappende Umrisse, die verdeckte Fortsetzung ist der Rest des Teilumrisses (9.1). | Recherche 21.10., 3.4 und P1 | P1 prüft Schleifen je Teil samt verdeckten Stücken (Langhals, Ente, Zweihals), nicht nur einteilige Körper. |
| L2 | **Teilerkennung als Fundament** (S4 → S5 → S6 → S7): Jede Erkennung kann kippen (Hysterese, Ratsche, Sehnen), und jeder Kipp springt den Körper. Mit Ansatzlinien in der Zeichnung ist das Fundament fest. | Plan 16.10., S4–S7; Recherche 21.10., 3.3 („weiche Linien aus dem Raster“) | P3 baut Teile aus Ansatzlinien; die Erkennung liefert nur Vorschläge, gemessen nur als Vorschlagsgüte. |
| L3 | **Füllung aus der Sichthülle und Front-Lappen** blieben in Kandidat C stehen („Glätte zur Fülle“, Hüllenschnitt). Flache Bänder (Haut parallel zum Blick) sind die Ursache der wilden Linien — in Abschnitt 8 gemessen, mit einer Korrektur an der Recherche vom 21.10.: Sie kommen aus den gezeichneten Querschnitten (Front-Umriss in jeden Ring kopiert) und aus flachen Zeichnungen, nicht aus der Superellipse „mittel“ (≤ 3 Punkte Unterschied). | Recherche 21.10., 3.6 und 5; Plan 20.10., V4 | P1 misst „so rund wie möglich“ (Flachband relativ zur Kugel, Wendepunkte, Zebra in 45°-Ansichten) und verlangt, dass keine Fülle-Option mehr gebraucht wird; wo die Zeichnung flach ist, zählt allein die geplante Linie. |
| L4 | **Spiel-Budget und Spielstufe** fehlten in den Recherchen; das Budget-Tor kam am 22.10. dazu, ein Umschalter nirgends. Der Maul-Einsatz auf K2 liegt beim Dreifachen des Budgets. | Übergabe 22.10. | P0a baut den Umschalter zuerst; P2 und P3 haben das Budget als hartes Tor; die Käfigdichte ist Eingabe, nicht Ergebnis. |
| L5 | **Linien nur als Zahlen geprüft** (Knicke, Schleifen): 1968 → 18 Knicke, und du sahst sie trotzdem als „sehr sehr wild“. Mit Linien als Projektion von Käfigkurven ist die Frage anders: nicht „wie glatt ist die geschnittene Kontur“, sondern „ist die Linie ruhig, wenn der Körper wackelt“ und „ist es die Linie, die du gezeichnet hast“. | Register „Befunde aus V2“ | P1, Tag 1: Jitter-Test (Käfig 0,1 px gewackelt → Linie ≤ 0,2 px), Kontaktbogen an deinen Wesen, dein Urteil. |
| L6 | **Werkzeugfrage** fehlte: Die Recherchen prüften Bauweisen, nicht, welche Werkzeuge im Zielbild übrig bleiben. | — | Abschnitt 5; P3 misst die Werkzeug-Matrix nur noch für die verbleibenden Werkzeuge. |
| L7 | **„Ein Löser“ ohne Widerspruchsregel für alle Linien:** Ein Loop in der Seite kann dem Top widersprechen, eine Kante zwei Ansichten. Regel: Jede Linie bindet nur in ihrer Ansicht (zwei Koordinaten); Widersprüche gibt es nur an Kreuzungen und gegen die Sichthülle — dort rot. | Recherche 21.10., 5 | P1 und P3 prüfen gezielt widersprüchliche Linien (rot, nichts still). |
| L8 | **Stabilität** wurde als Prozentzahl geplant (90 % gleiche Topologie bei ±2 px). Mit gezeichneten Loops sind fast alle Entscheidungen explizit; nur Muster und Pole sind automatisch. Das Tor wird schärfer: Topologie wechselt nur, wenn Linien dazukommen, verschwinden oder Kreuzungen wechseln. | Recherche 21.10., P3 | P3-Tor neu gefasst. |
| L9 | **Reihenfolge „Struktur vor Genauigkeit“** (Plan 20.10., 1.3 Nr. 1) droht wieder: Erst Teile, Loops, Muster, dann Umrisse. Deshalb bleibt P1 (Umrisse, runde Füllung) der erste Beweis, und P3 darf nichts bauen, was P1 nicht bindet. | — | Reihenfolge P0a → P1 → P2 → P3. |
| L10 | **Mein Fehler im Verlauf:** Teil A wurde über Tage im Kern gebaut (7 500 Zeilen), ohne dass du etwas im Editor sahst (Register 21.10.). Der Prüfplan verlangt deshalb je Beweis am ersten Tag ein Bild aus dem Editor, nicht nur Kern-Zahlen. | Übergabe 21.10. | Jeder Beweis hat ein „Was du am ersten Tag siehst“. |

**Was nicht stimmt an deinen Klarstellungen (ehrlich):** nichts Grundsätzliches. Zwei Stellen, an denen ich etwas anders
lese, als es klingt, und die du entscheiden musst (Abschnitt 10): (a) „gestrichelt oder erkennbar blasser“ für verdeckte
Linien — gestrichelt ist heute schon „weich“ (Härte 0), deshalb schlage ich **blass = verdeckt, gestrichelt = weich** vor;
(b) „die meisten Kanten Edgeloops“ heißt nicht, dass jede Kante ein Ring sein muss: Längskanten (Tiger-Kasten, Panzerrand)
sind Längsreihen, auch Linien des Netzes, nur anders herum.

## 5. Werkzeuge: brauchst du sie?

Grundlage: das Inventar des heutigen Editors (Abschnitt 9.3, Dock, Tasten, Tafel je Stufe). Maßstab: Plan 20.10., 4.5
(„Chips, die nichts bewirken, gibt es nicht“) und deine Klarstellungen.

| Werkzeug / Chip | heute | im Zielbild | warum |
|---|---|---|---|
| **A** Auswahl, **P** Stift (Punkt setzen/löschen, auf freier Fläche Linie), **+ / −**, **⌥** Ecke, Pfeiltasten, Auswahlrechteck | Illustrator-Teil | **bleibt** | Zeichnen ist die Bedienung. Der Stift zeichnet jede Linienart (Umriss, Loop, Kante, Ansatz, Maul); die Art kommt aus dem Ort (auf dem Umriss, quer über den Körper, frei). |
| **⇧W** Härte (0 … 3 px) | je Knoten einer P-Linie; Umrisse ohne Härte | **bleibt, für alle Linien** | Härte = Falte und Strich in einem (K1, K7); auch Umrissschleifen bekommen sie (Kastenkante des Tigers). |
| **G / S / R**, X/Y/Z, Zahlen, Esc, **O** proportional, Rad = Radius | V3 in den Blättern, V6 auf der Bühne | **bleibt** | Blender-Teil (20.10.). |
| **⌘R** Loop einziehen, **⌥-Klick** Loop wählen, GG gleiten | V6, nur Röhre ohne Maul/Beine, Ring an einer Stelle längs der Wirbelsäule | **bleibt, wird allgemein** | Ein Loop ist eine gezeichnete Linie quer über den Körper in Seite oder Top; ⌘R ist die Abkürzung dafür (gerade Linie an der Zeigerstelle). Mit Maul und Teilen. |
| **S** Spant = Reifen (ein Datum unter zwei Namen: Dock sagt „Reifen“, Hinweis „Spant“; im Blatt dreifach gezeichnet), Spanten in Front/Back, Hauptspant H, Kiefer-Spant | Querschnitt an einer Stelle, rastet einen der 24 Ringe ein; **ein einziger Spant schaltet alle Ringe** auf die Spanten-Überblendung um | **entfällt** | Ein Spant ist ein Loop; den Querschnitt eines Loops bearbeitest du in Front/Back als die Projektion desselben Loops (Plan 20.10., 3.6; Teil L). Kiefer-Spant = Loop auf dem Unterkiefer. |
| **⌃R** Reifen | ist heute schon ⌘R (Loops); der Reifen-Weg `reifenNeuAmZeiger` ist toter Code | **entfällt** (aufräumen) | geht in ⌘R/Loops auf (Plan 20.10., 4.1). |
| P-Linien: **„Tiefe“** (Grat/Rinne), Chips glatt/weich/fest/scharf, „weich auslaufen“, Kennzeichnung genau/Treppe | „Tiefe“ ist nur Anzeige (Hof), der Kern liest sie nicht; genau/Treppe zeigt die Baugrenze | **entfällt** bis auf die Härte | Grat/Rinne kommt, wenn überhaupt, aus dem Härte-Modell (E8); „Treppe“ gibt es im Zielbild nicht. |
| Maul: **Vorlage aus \| vorn \| unten \| hals** (Fertigmaul aus Beweis 2, nicht im Dokument) | Versuch | **entfällt** | die gezeichnete Maullinie ist die einzige Quelle. |
| Stufe Teile ⌘5: **Beine aus \| verschmolzen \| angesteckt + Schwung** (Beweis 3, nicht im Dokument) | Versuch | **wird Ansatzlinie** | ein Bein ist ein Teil an einer gezeichneten (oder vorgeschlagenen) Ansatzlinie (P3). |
| **G** Pinsel ziehen, **I** aufblasen, **⇧** glätten, **[ ]** | Grundform (Deltas) und Posen | **bleibt — für Relief und Posen** | Blendshapes sind deine Grundidee (15.10.). In der Grundform ist der Pinsel ein Relief über der Form aus Linien (Entscheidung 15.10.: „Relief“), er verschiebt keine Linie; in Posen formt er den Blendshape. |
| Tafel Körper: **Haut heute \| glatt** | S2 | **entfällt** | Es gibt nur noch den einen Löser (3.4). |
| Tafel Körper: **Umrisse berühren aus \| rund \| mittel \| genau** | S3, Standard „mittel“ | **entfällt** | Umrisse binden hart; Fülle ist „so rund wie möglich“. |
| Tafel Körper: **Querschnitt heute \| aus der Hülle (V4)**, **umrisse aus \| an (V2)** | V4, V2 | **entfällt** | Querschnitt aus Loops und Fairness; Linien sind die geplanten. |
| Tafel Körper: **Körper Röhre \| Teile** | S7 | **entfällt** | Ein Körper (Plan 20.10., V7). |
| Tafel Körper: **Ringe eingefroren / Neu ableiten** | Schritt 3 (15.10.) | **entfällt** | Ringe sind deine Loops; Einfrieren ist nur noch die Topologie im Dokument, ohne Knopf. |
| Tafel Teile: Baumliste, Schalter, **Automatisch** je Teil, verdeckte Kurve per Klick | S4 | **wird „Vorschläge“** | Die Automatik schlägt verdeckte Umrissstücke und Ansatzlinien vor (Entscheidung E2); angenommen sind es Linien, sonst nichts. |
| Tafel Körper: **Kanten zeigen \| blass \| aus**, **netz ton \| farbe** | S1; „aus“ blendet das ganze Liniennetz samt fremder Ringe | **wird Ebenen** | wie Illustrator-Ebenen: Umrisse, Loops, Kanten, verdeckt, fremde Ansicht — ein- und ausblenden, nicht „Stil“. Heute gibt es vier verschiedene Verdeckt-Stile und **weiche Käfigkanten werden gar nicht gezeichnet** — genau die Loops, die du gestrichelt sehen willst. |
| Käfig, Zebra, Matcap (Diagnose); Fell ⌘6, Haut ⌘7 Palette/Stil (Look-Tests, nicht im Dokument) | D / Versuch | **bleibt**; Look-Werte gehören ins Dokument (Teil 2) | — |
| Maul: Maullinie zeichnen, Chips **gleich \| getrennt**, Kieferknopf, Rig-Griffe, Rundmaul | Phase 2, Teil A/B | **bleibt** | Maullinie = Linie mit Schlitz; Kiefer getrennt = zwei Linien mit eigenem Anfang (14./15.10.). |
| Zähne, Augen (Tafeln, Klick, Ziehen) | Phase 2 M4/M5 | **bleibt** (Teil 2) | hängen an Linien (Zahnfleischreihe, Augenschleife). |
| Posen & Leben: Posenliste, Knochen, Überblenden, Geist | Teil B | **bleibt** | Daten an Linien statt Punktnummern. |
| **⌥B** Pauspapier, Nachzeichnen | M4.1 | **bleibt** | Einstieg von Bögen. |
| Layouts Riss/Bühne, Grund Papier/Nacht/Grün, Stamm ⌘1–9, Library | Plan 9 | **bleibt** | — |
| Δ im Blatt-Titel, Lichtsaum, Widerspruch rot + angleichen | Schritt 4, S0/S1c | **bleibt als Prüfung** | Δ soll 0 sein; rot bleibt die einzige Meldung über die Form. |

Ergebnis: **zwölf** Dinge entfallen (Spant/Reifen, ⌃R-Reste, Haut heute|glatt, berühren, Querschnitt heute|Hülle, umrisse
aus|an, Körper Röhre|Teile, Neu ableiten, Teile-Automatik als Wahrheit, P-Linien-Tiefe mit Chips, Maul-Vorlage, Beine-Chips),
drei werden allgemeiner (Stift, ⇧W, ⌘R), eins wird zum Vorschlag (Teile), eins zu Ebenen (Netzanzeige); alles andere bleibt.
Kein neues Werkzeug kommt hinzu — außer dem Umschalter „Spiel“ auf der Bühne (K9). Was dahinter im Kern wegfallen kann, wenn
die Beweise halten: die Silhouetten-Maschinerie aus Breite, Berühren, Fülle, Hüllenschnitt, V4-Umrisse, Formen folgen (≈ 4 700
Zeilen) und die Teilerkennung als Bau-Grundlage (> 3 000 Zeilen) — Inventar in 9.3.

## 6. Unkonventionelle Ideen (mit Prüfstein)

| Nr. | Idee | Warum elegant | Prüfstein | Risiko |
|---|---|---|---|---|
| I1 | **Das Blatt ist das SVG.** Die Blätter zeichnen die Illustration mit genau der Schrift der Vektor-Ausgabe; „Export“ speichert, was du siehst. | Eine Linienschrift, kein zweiter Weg; was im Blatt stimmt, stimmt im SVG. | P1, Tag 1: Blatt und SVG decken sich (≤ 0,1 px). | Rendern der Verdeckung je Linie (Sichtbarkeit auf dem feinen Netz) muss ≤ 16 ms bleiben. |
| I2 | **Teile sind überlappende Umrisse.** Wie in deinen Skizzen (Bogen 02: Kopf über Rumpf, Mähne): Jedes Teil hat seine Umrissschleife, verdeckte Stücke blass. T-Stöße sind nur Anzeige. Vorbild: SmoothSketch (Karpenko, Hughes 2006) ergänzt verdeckte Konturen an T-Stößen automatisch — bei uns zeichnest oder bestätigst du sie. | Keine Erkennung, keine Sehnen, kein Skelett; die Struktur steht in der Zeichnung. | P1: Langhals/Ente von oben mit durchlaufendem Bauch; P3: Flosse mit Ansatz-Loop. | Du musst verdeckte Stücke sehen und ziehen wollen; sonst Vorschlag (E2). |
| I3 | **Loops zeichnen = Ringe setzen.** Ein Loop ist der Körperschnitt über der gezeichneten Kurve, also auch gebogen, schräg, um einen Hals; weich = gestrichelt, hart = Kante. | Topologie durch Zeichnen, wie Blender-Loops, aber in deiner Ansicht; ersetzt Spanten, Reifen, Ringwahl. | P3: Langhals mit drei gezeichneten Loops, Kegel mit schrägem Loop. | Dichte Loops in einer Biegung (Mindest-Einfluss wie V6). |
| I4 | **„So rund wie möglich“ als Maß.** Krümmungsvariation ohne Zielform; kantig nur durch harte Linien. | Streicht Fülle, berühren, Hüllenschnitt und Front-Lappen; die gezeichnete Ursache der wilden Linien bleibt (flache Formen), aber dort ist die Linie dann geplant. | P1: Flachband je Ansicht ≤ 1,5 × Kugel (13 %) an runden Körpern, außerhalb gezeichneter gerader Strecken; Zebra in 45°-Ansichten ohne Bänder. | Lange Körper mit wenigen Linien sacken zwischen den Linien ab → Loops dazu (die Zeichnung sagt es). |
| I5 | **Der Käfig ist das Spielnetz.** Dichte aus dem Budget; Stufe 1 = Spiel, Stufe 3 = Vorschau; Umschalter von Anfang an. | Keine Umwandlung, kein Reduzieren, kein zweiter Export-Weg. | P0a: Zahlen heute; P2/P3: Budget-Tor. | Lippen und Mundwinkel brauchen Dichte: das Maulfeld bekommt sie örtlich (Muster), nicht global (K2). |
| I6 | **Härte = eine Zahl je Knoten** für Falte (Schärfe im Käfig) und Strich (0–3 px). | Eine Schrift, ein Regler (⇧W), kein „Tiefe“-Feld. | P3: Härte 0/50/100 % → Winkel und Strich gemessen. | Die sichtbare Rundung hängt an der Käfigauflösung (Plan 20.10., 3.4); ein Stützloop hilft. |
| I7 | **Automatik nur als Vorschlagslinie.** Alles Automatische (verdeckte Stücke, Ansatz, Loop-Vorschläge, Mundwinkel-Verlängerung) erscheint als Vorschlagslinie, die du annimmst (Klick) oder ignorierst. | Passt zu deiner Regel vom 11.10. (keine automatischen Punkte) und zur Lockerung vom 16.10. (einfügen nur wenn nötig). | P1/P3: Vorschlag an deinen Wesen, Trefferquote. | — |
| I8 | **Fünf Ansichten als Ebenen eines Dokuments**: Unten und Hinten nur, wo sie etwas zeigen, das die drei nicht zeigen (verdeckte Linien decken viel davon ab). | Weniger Zeichnung für denselben Körper. | später, an deinen Wesen. | — |

Aus der Recherche vom 02.11. (9.1), je mit Quelle:

| Nr. | Idee | Warum elegant | Prüfstein | Risiko |
|---|---|---|---|---|
| I9 | **Loop-Vorschlag beim Schweben** (Campen & Kobbelt 2014, Dual Strip Weaving): Über dem Blatt schlägt der Editor den biegeenergie-minimalen Loop durch die Zeigerstelle vor, der die vorhandenen Linien kreuzt; Klick setzt, Rad blättert Alternativen. ⌘R bleibt die Abkürzung. | Loops entstehen dort, wo das Netz sie braucht, mit einem Klick. | P3, Langhals: Vorschlag trifft die von Hand gezeichneten Loops ≤ 2 px. | Vorschlag muss ≤ 16 ms sein. |
| I10 | **Härte als Energie statt Falten-Topologie** (Prasad 2006, §3.3): Quer zur Linie ersetzt die Strichbreite stufenlos die Biege- durch Membranenergie. | „weich bis scharf“ ist eine Zahl im Löser; keine Schwelle, ab der eine Falte „an“ ist. | P3, ein Fall gegen die halbscharfe Falte (OpenSubdiv-Art): Winkel und Rundungsbreite bei 0/25/50/75/100 %. | Sichtbare Rundung hängt an der Käfigdichte — wie bei Falten. |
| I11 | **Strichbreite = Winkel der beiden Normalen** (CrossShade 2012; Halstead–Kass–DeRose 1993: Normalen sind in Catmull-Clark linear in den Kontrollpunkten): Die Breite gibt den Winkel der Normalen beiderseits der Kante vor, im selben linearen System. | Winkel direkt aus dem Strich statt aus einer Ecke im Querschnitt. | P3, Tiger-Kasten: Winkel aus Breite gegen Winkel aus Ecke. | Widerspricht der Regel vom 12.10. („Winkel aus der Form, Härte ist die Rundung“) — Look-Entscheidung, siehe E8. |
| I12 | **Teil-Domänen mit Tiefenordnung** (Monster Mash 2020): Teile als eigene Käfigbereiche jenseits ihrer Ansatzlinie; die Ordnung vorn/hinten gilt als Ungleichung auch in Posen. | „Bauch hinter Kopf“ bleibt in jeder Pose ohne Durchdringung. | P3, Rex Fressen mit Linien: 0 Durchdringungen zwischen Teilen. | Ungleichungen machen das System nicht mehr rein linear (QP). |
| I13 | **Zuordnung als Glättungsreserve** (Cashman 2013): Umrisspunkte dürfen diskret entlang der Käfigkanten wandern; wo Kappen heute knittern (Kasten, Kerbe, stehendes Ende), löst das Wandern der Zuordnung das Problem statt neuer Ringe. | Keine Sonderregel „Kappen nach Endform“. | P1, Würfel, Vase, Tiger-Block: Kappen ≤ 15° ohne Zusatzregel. | DP-Zuordnung muss stabil bleiben (Hysterese). |

## 7. Prüfen die Beweise P0–P3 das Richtige?

| Beweis (Recherche 21.10.) | prüfte | fehlt nach deinen Klarstellungen | neu (Prüfplan) |
|---|---|---|---|
| P0 Spiel-Probe (36 Wesen auf dem iPhone) | fps, p99, Draw Calls | Was du **siehst**: Stufe 1 im Editor, Silhouette, Cel-Stufen, Budget je Wesen; braucht dich am iPhone | **P0a** Spielstufe im Editor (Mac, sofort), **P0b** iPhone (mit dir) |
| P1 Umriss zuerst | Δ ≤ 0,5 px an einteiligen Körpern, Linien ohne Sprünge, Widersprüche, Zug ohne Sprung, Tempo | Umrisse je Teil mit verdeckten Stücken; „so rund wie möglich“ messbar; 45°-Ansichten; Blatt als Illustration; Jitter-Ruhe | **P1 „Ansichten als Illustration“** |
| P2 Stücknetz im Maulfeld | Tore wie heute, keine Regel je Körper, ±2 px, Muster erschöpfend | Budget (Maulfeld ≤ 300 Flächen), Zahnfleischreihe, Mundwinkel-Verlängerung als Vorschlagslinie, Spielstufe des Mauls | **P2 mit Budget-Tor** |
| P3 Liniennetz am ganzen Körper | Stücke gültig, Pole nach Regel, ±2 px, Posen übertragen, Tempo | Loops als gezeichnete Linien (schräg, gebogen), Ansatz-Loops statt Fenster, Augenschleife mit Brauenwulst, Werkzeuge der Tabelle 5, Härte = Strich | **P3 „Loops und Linien am ganzen Körper“** |

Die Reihenfolge bleibt P1 → P2 → P3 (P0a davor, P0b wann du kannst), aus dem Grund in L9.

## 8. Messungen heute (02.11.)

Skript `apps/editor/scripts/pruefen/spielstufe.ts` (Körper gebaut wie der Editor, Stufen frisch aus dem gelösten Käfig,
Grenzlage mit der Halstead-Maske derselben Stufe; Gegenprobe Stufe 3 gegen `abl.fein` 0,0000 px), Bilder
`spielstufe-bild.mjs`; Tabellen wörtlich in [`docs/progress/editor/spielstufe-2026-11-02.md`](../progress/editor/spielstufe-2026-11-02.md).

| Maß | Ergebnis |
|---|---|
| Dreiecke Stufe 1 | Röhre 400 Käfigflächen → **3 200**; Teile 3 344 (Ente), 3 968 (Vierbeiner), 6 288 (Fisch) — ohne Maul im Budget. **Mit Maul gibt es heute keine Stufe 1:** der Einsatz sitzt auf K2; der Käfig mit Maul hat als Stufe 0 schon 18 928 (Rex) bzw. 25 958 (Kugel) Dreiecke, eine Stufe darüber 75 712 bzw. 103 832 |
| Umriss Stufe 1 gegen Stufe 3 (px bei 461 je Kachel) | reine Catmull-Clark-Lage max 0,9–4,8 (Kasten und Kegel in der Front), Mittel 0,1–0,8; **auf der Grenzlage max 0,4–2,8, Mittel 0,1–0,6** — bei Spielgröße (300 px) sind das ≈ 0,3–1,8 Gerätepixel |
| Δ gegen die Zeichnung | Stufe 3 reproduziert den Editor exakt (Robbe Top 12,5, Vierbeiner Front 16,2, Ente Front 12,6 px sind schon da); Stufe 1 legt auf der Grenzlage im Mittel 0,1 px darauf, als rohe Lage 0,5–0,6 |
| Facetten Stufe 1 (Knick zwischen Nachbarflächen, 95 %) | Kugel/Ei 11–12°, Rex/Langhals/Robbe/Tigerkopf/Kegel 20–24°, Teile 29–34°; Anteil > 20°: 0 % (Kugel), 5–12 % (Röhre), 18–25 % (Teile). **Maxima abseits aller gezeichneten Falten:** Rex 133° (erstes Ringband an der Schnauze; Stufe 3 dort 14°), Tigerkopf 56°, Kegel 54° (Ecke des Dreiecks ohne Falte), Langhals 53° (oben am Hals), Teile 61–89°; auf der Grenzlage Rex 36°, Tigerkopf 30° |
| Sichtprobe (Cel-Stufen, 480 px) | Stufe 1 mit glatten Punktnormalen ist von Stufe 3 nicht zu unterscheiden (Grenznormalen ebenso); nur flach schattiert treppen die Cel-Grenzen. Polygonaler Umriss Rex ≤ 1,5 px, Langhals ≤ 3 px — fällt nicht auf. Bilder `spielstufe-rex-…`, `spielstufe-langhals-2026-11-02.png` |
| Flachband Stufe 3 (Anteil der Fläche, Normale < 5° zur Blickrichtung; Kugel-Bezug 8,7 %) | Seite: Rex 18,9 %, Robbe 21,8 %, Tigerkopf 17,7 %, **Kegel 34,4 %** (gezeichnetes Dreieck in der Front = gerade Flanken), Langhals 11,5 %; Front: Vierbeiner 31,0 %, Ente 20,0 %, Langhals 15,9 %, Fisch 14,8 %; Top: Vierbeiner 23,7 %. **„Berühren“ mittel gegen aus bzw. rund: höchstens 3,2 Punkte Unterschied**, bei Kugel, Ei, Tigerkopf, Kegel keiner. „mittel“ kauft dafür Δ Front (Rex 10,3 → 7,3, Robbe 8,5 → 6,2, Ente 14,3 → 12,6, Vierbeiner 21,4 → 16,2 px) |
| Käfig mit Maul (K2 + Einsatz) ohne weitere Stufe | Haut auf Stufe-2-Niveau (95 % 5,7° Kugel, 20,4° Rex); Maxima 103–179° aus Tasche und Rachen |

**Lesart:**
1. **Stufe 1 trägt das Budget, aber nur ohne Maul;** der Einsatz auf K2 braucht das Sechs- bis Achtfache dessen, was für
   Lippe, Tasche, Rachen und Zähne bleibt (1 700–4 800 Dreiecke). Das ist das Budget-Tor in P2.
2. **Der Spiel-Umriss ist auf 1–3 px polygonal, nicht 5–15;** die großen Δ-Zahlen hat Stufe 3 schon. Die Grenzlage halbiert
   den Rest und kostet nichts (eine Maske je Käfigpunkt beim Backen).
3. **Das eigentliche Problem der Stufe 1 sind die Facetten abseits der Falten** (Rex 133° an der Schnauze, Langhals 53°,
   Kegel 54°): Stellen, an denen der Käfig schon auf Stufe 3 Falten von 14–27° hinterlässt und die Stufe 3 verdeckt. Mit
   „Käfig = Spielnetz“ wird die Käfiggüte (kleinster Innenwinkel, Seitenverhältnis; Rex heute 29° / 24,9) ein echtes Tor
   (Prüfplan P0a/P1/P3).
4. **Korrektur an der Recherche vom 21.10.:** Flache Flanken kommen aus den gezeichneten Querschnitten (Front-Umriss in jeden
   Ring kopiert) und aus Zeichnungen, die wirklich flach sind — nicht aus der Superellipse. Die Folgerung bleibt: Wo ein Drittel
   der Fläche in der Blickrichtung liegt, ist der Umriss in der Tiefe schlecht bestimmt, unabhängig von der Fülle-Stufe. Darum
   muss der Umriss eine geplante Linie sein (P1) — und die runde Füllung ersetzt die Front-Lappen, nicht nur „mittel“.
5. **Messfalle:** Δ (`blattAbweichungen`) ist an exakt achsparallelen Flächen auf 0,2 px empfindlich (Tigerkopf Front 2,29
   gegen 2,09 im Editor: `umrissStuecke` teilt nach dem Vorzeichen der Newell-Komponente). Register-Eintrag.

Nicht gemessen: Körper mit Maul auf Stufe 1/2 (gibt es heute nicht), Zähne, Augen, Beine, Posen, Earle-Material und Schatten im
Spiel, Grenznormalen als Zahl (nur im Bild). Das ist P0a/P0b.

## 9. Recherche (02.11.)

### 9.1 Linienzeichnungen in 3D, Loops als Linien, runde Füllung
Recherche (02.11., Quellen in `docs/research/2026-11-02-recherche-linienzeichnung-3d.md`), das Wesentliche:
- **Leitbefund:** Kein veröffentlichtes System deckt das geklärte Zielbild als Ganzes ab (Umrisse je Teil mit gezeichneter
  verdeckter Fortsetzung, Kanten mit Strichbreite = Härte, Loops als Linien in Orthoansichten, dazwischen „so rund wie
  möglich“, Ausgabe ein Viereckskäfig). Die Zutaten sind einzeln belegt und großteils linear oder bewiesen.
- **Verdeckte Linien:** SmoothSketch (2006) vervollständigt verdeckte Konturen automatisch (lokal, Selbstdurchdringungen,
  keine Falten); **Monster Mash (2020, Apache 2.0)** lässt den Nutzer Teile als überlappende Umrisse zeichnen — die verdeckte
  Fortsetzung ist der Rest des Teilumrisses, die Tiefenordnung hält ein Löser mit Ungleichungen. Niemand nimmt die gezeichnete
  verdeckte Linie als Flächenbedingung; wir wären die Ersten.
- **Orthoansichten:** Rivers 2010 (Sichthülle als CSG, Rims festhalten, nur einwärts glätten), **Prasad 2006** (thin-plate +
  lineare Silhouettenbedingungen = ein KKT-System, dünn besetzt, globales Optimum; Falten über Membranenergie quer zur Linie),
  **Cashman 2013** (dasselbe auf Subdivision; Zuordnung Kontur ↔ Fläche diskret, abwechselnd mit linearem Lösen; Code).
  **Schaefer–Warren–Zorin 2004** ist der direkteste Vorläufer: Kurvennetz → Vierecke je Stück mit nur Valenz 3 und 5
  (Schranke Σ|val − 4| ≥ |k − 4|), Catmull-Clark interpoliert die Kurven exakt. Loops als 2D-Linien in Orthoansichten nimmt
  keines dieser Systeme — das ist unser eigener Beitrag (V5/V6 tun es heute schon in erster Form).
- **Runde Füllung:** Halstead–Kass–DeRose 1993 (Punkt- und Normaleninterpolation auf der Grenzfläche, Fairness als ein
  lineares System), FiberMesh 2007 (zwei lineare Systeme, 10–15 fps bei 600–2 000 Punkten auf einem Pentium-M), Welch–Witkin,
  Botsch–Kobbelt. „Linear + Silhouette + Fairness“ als Ganzes für Käfige hat niemand gebaut.
- **Illustration und Rückkopplung:** ConTesse 2023 (Apache 2.0) berechnet korrekte sichtbare Konturen von
  Subdivision-Flächen — als unabhängiger Prüfer unserer Linien brauchbar (bauen nur mit deinem OK). Blender Line Art und
  Pencil+ zeichnen verdeckte Linien als eigene Ebene (gestrichelt), ohne Dicke nach Faltenwinkel. Kein System hält eine
  persistente Vektorillustration mit Kanten und Loops als editierbare Wahrheit mit 3D-Rückkopplung.
- **Loops als Primitive:** Takayama 2013 (Stückgrenzen skizzieren, patentiert), Dual Strip Weaving 2014 (Loop als
  Atomoperation mit Vorschlag beim Schweben), Retopoflow „Contours“ (Strich quer über ein Glied → Ring). Alle auf vorhandener
  Oberfläche.
- **Urteil der Recherche:** Nichts schlägt „ein Liniennetz, ein Löser“; zu ergänzen sind Rims (Rivers), die getrennte
  Zuordnungssuche (Cashman), die Schranke |k − 4| mit Valenz 3/5 (Schaefer), „verdeckte Fortsetzung = Teilumriss“ (Monster
  Mash) und ConTesse als Prüfer — alle fünf sind in Abschnitt 3, 6 und im Prüfplan aufgenommen.

### 9.2 Spielqualität aus dem Käfig
Recherche (02.11., Quellen in `docs/research/2026-11-02-recherche-spielnetz.md`), das Wesentliche:
- **Grundrechnung:** Dreiecke(Stufe L) = 2 · F · 4^L für F Käfigflächen — 400 Flächen: 3 200 / 12 800 / 51 200 (L1–L3);
  1 000 Flächen: 8 000 auf L1. Bei ≤ 8 000 Dreiecken ist Stufe 1 die einzige Stufe, die einen Käfig mit 400–1 000 Flächen trägt.
  Der heutige Maul-Einsatz (9 500–13 000 Flächen) liegt auf Stufe 0 bei 19 000–26 000, auf Stufe 1 bei 76 000–104 000 Dreiecken.
- **Praxis:** Film wertet die Grenzfläche aus (OpenSubdiv); Spiele backen (Call of Duty: Ghosts tessellierte zur Laufzeit,
  blieb Ausnahme: „at low tessellation rates, off-line subdivision outperforms hardware tessellation“). Stilisierte Figuren:
  Guilty Gear Xrd ≈ 40 000 Dreiecke (PS4, Nahaufnahme, Normalen von Hand), Wind Waker ≈ 2 800; mobil 3 000–10 000.
  Blender: Viewport- und Render-Stufe getrennt, „Use Limit Surface“ setzt die Punkte auf die Grenzfläche.
- **Normalen:** Grenzflächen-Normalen auf dem Stufe-1-Netz sind das Gegenstück zum Normal-Map-Backen (Blender „Data Transfer →
  Custom Normals“, Anime-Standard; Arc System Works setzt Normalen von Hand, weil binäre Cel-Schattierung jedes Normalenrauschen
  zeigt). Jedes Morph-Ziel braucht ein eigenes Normalen-Delta (glTF erlaubt Targets für NORMAL; three.js lädt sie).
- **Silhouette:** s = R(1 − cos(π/n)): 16 Segmente 1,9 % R, 32 Segmente 0,48 %; Toleranz in der Praxis 1–2 px je Kante
  (Nanite 1 px, Unreal-Tessellation 2 px, Reyes ½ px). Bei 300–500 Gerätepixeln sind 1–2 px unsichtbar. Adaptive Verfeinerung
  ohne Tessellierungsstufe gibt es (Compute-Bisektion, Dupuy/Deliot 2022), aber der WebGL2-Rückfall kann sie nicht, und
  36 Wesen bei dieser Größe brauchen sie nicht: gebackene Stufen (L1 nah, L0 fern) sind Standard.
- **Cel-Stufen auf grobem Netz:** Die Stufengrenze ist die Isolinie von N·L und knickt an jeder Dreieckskante; Abhilfe in
  dieser Reihenfolge: Grenznormalen → fwidth-smoothstep (three.js MeshToonMaterial seit r144) → Schwellen-Offset per Malzone →
  mehr Ringe nur dort, wo die Grenze läuft.
- **Posen:** Subdivision ist bei fester Topologie linear → Käfig-Deltas auf Stufe 1 backen ist exakt; Knochen sind nicht
  linear, aber Subdivision ist affin-invariant → Unterschied nur im Gewichtsband (Gelenkband ≥ 2 Käfigringe); Zahlen dazu gibt
  es nicht, der Editor soll beides rechnen.
- **Reduzieren hinterher** (Un-Subdivide, QuadriFlow, Maya Reduce) erhält Lippen-, Reifen- und Faltenloops nicht verlässlich —
  Notnagel, keine Pipeline. „Weniger Stufen“ ist die exakte Reduktion; der K2-Einsatz ist davon ausgenommen (keine reine
  Verfeinerung).

### 9.3 Inventar des Editors (Grundlage für Abschnitt 5)
Vollständig in `docs/research/2026-11-02-inventar-editor.md` (Dock und Tasten je Stufe, Griffe, Tafel-Chips mit dem Feld,
das sie schalten, Spanten/Reifen/Loops, Silhouetten-Maschinerie, Spiel-Stufe, Linienschrift der Blätter, Doppelungen). Das
Wesentliche:
- **Spant und Reifen sind ein Datum** (`dok.spanten`, halbes Profil normiert auf den Kasten aus Seite × Top) in zwei
  Darstellungen; der Loop (`dok.schleifen`) ist ein eigenes Konzept mit eigenem Ring, aber ohne eigenen Querschnitt. Ein
  einziger Spant schaltet alle Ringe auf die Spanten-Überblendung um. Fünf Quellen für Ringe (Ringwahl, Ecken, Reifen,
  Linienringe, Loops), vier Wege zum Querschnitt (Front-Lappen, Spanten, berühren, Hülle).
- **Silhouetten-Maschinerie** ≈ 4 280 Zeilen (`breite`, `rand`, `fuelle`, `huellenSchnitt`, `umrisse` (im Editor nie aktiv),
  `huelle`, `umrissKurven`, `netzSicht`, `abweichung`) + `folgen` 394 + Teilerkennung > 3 000 Zeilen; S4-Teile, Δ, Saum und
  Widerspruch laufen in jedem genauen Bau.
- **Linienschrift heute:** P-Linien und Falten nur aus scharfen Käfigkanten (1 + 2·h px, gestrichelt unter h = 0,25; verdeckt
  Deckkraft 0,25); fremde Umrisse nur mit „umrisse an“ (Seite blau, Front lila, Top grün); Teile-Umrisse „4 4“; Loops orange;
  vier verschiedene Verdeckt-Stile. Weiche Loops sind unsichtbar.
- **Spiel-Stufe:** Tafel zeigt nur Kennzahlen; die Unterteilungsstufe ist die Konstante `ABLEIT_STANDARD.stufen = 3`; angezeigt
  wird schon die **Grenzfläche** der Stufe 3 (`anwenden3(grenze)`) — Stufe 1 mit Grenzmaske ist derselbe Weg (P0a).
- **Ohne Wirkung oder tot:** `kern/umrisse.ts`, die P-Linien-„Tiefe“, eigene Teilkurven (`dok.teile`), `reifenNeuAmZeiger`;
  Look-Werte (Beine, Fell, Palette, Stil, Maul-Vorlage) liegen nicht im Dokument.

## 10. Entscheidungen, die nur du treffen kannst

| Nr. | Frage | Mein Vorschlag |
|---|---|---|
| E1 | Verdeckte Linien: blass oder gestrichelt? | **blass** (gestrichelt bleibt „weich“, wie heute die Härte 0). |
| E2 | Verdeckte Umrissstücke und Ansatzlinien: zeichnest du sie, oder schlägt der Editor sie vor? | **Vorschlag** (blasse Vorschlagslinie, Klick nimmt sie an); gebaut wird nur, was im Dokument steht. |
| E3 | Spanten (S) und Reifen (⌃R) entfallen zugunsten gezeichneter Loops (⌘R + Stift)? | **ja**. |
| E4 | Kantig nur, wo eine harte Linie gezeichnet ist; sonst rund, und ein Widerspruch wird rot statt still kantig? | **ja**. |
| E5 | Spiel-Umschalter: Stufe 1 fest als Spielnetz, Budget 8 000 Dreiecke samt Maul, Dreieckszahl immer sichtbar? | **ja**. |
| E6 | Prüfwesen der Beweise: deine eigenen (Langhals, Ente, Vierbeiner, Zweihals, Kegel, Rex, Tiger) plus Extremreihe? | **ja**, deine zuerst. |
| E7 | Loops in der Front/Back: als Projektion des Loops bearbeitbar (Querschnitt), oder nur in Seite/Top gezeichnet? | **bearbeitbar** (ersetzt den Spant). |
| E8 | Was bedeutet die Strichbreite einer Kante: nur die Rundung (Winkel aus der Form, Regel vom 12.10.) oder auch den Winkel (I11)? | **Rundung** wie bisher; I11 nur als Versuch in P3. |

## 11. Ehrlich offen

- Ein System „drei Linien-Illustrationen → eingepasster Catmull-Clark-Käfig mit Live-Bearbeitung“ hat niemand veröffentlicht
  (Recherche 21.10. und 9.1). Die Bausteine sind erprobt; das Zusammensetzen prüfen die Beweise. Ein unabhängiger Prüfer der
  Konturen (ConTesse, C++) wäre nützlich; ich baue fremde Programme nur mit deinem OK.
- „So rund wie möglich“ ist als Krümmungsvariation definiert; ob das deinem Auge entspricht, zeigt erst P1 an deinen Wesen.
- Die Härte-Rundung hängt an der Käfigauflösung (≈ 5–9 px bei drei Stufen); feinere Rundungen brauchen Stützloops.
- Mehrere Loops dicht in einer Biegung, sehr spitze Keile (Robbe hoch J) und schräge Kanten über viele Reihen bleiben die
  schweren Stellen jedes Verfahrens; sie stehen als Fälle im Prüfplan, nicht als gelöst.
- Zahlen zu Aufwand sind Schätzungen; nach jedem Beweis wird neu geschätzt.
- Die Messung vom 02.11. gilt für den heutigen Kern ohne Maul; wie das Spiel selbst (WebGPU/TSL, Atlas) Stufe 1 schattiert,
  zeigt erst P0a/P0b.
