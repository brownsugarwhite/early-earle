# Wirbelsäule und ein Netz für alles (Vorschlag 12.10.2026 abends)

> Florian (12.10. abends): „Wie soll das Wirbelsäulensystem aussehen? Ein Hals nach oben mit Kopf darauf muss auch gehen! Und aktuell ist es so, dass eine Ansicht die komplette andere Ansicht formt. Das ist irgendwie auch unerwartet, auch bei den Spanten. Ich habe Probleme damit, schöne Formen und Kanten zu machen. Beim Fressen-Tab muss ich natürlich auch das ganze Mesh bearbeiten können, und das Maul muss auch im geschlossenen Zustand schon mit dem Mesh verbunden sein. Ich bin nicht sicher, ob die Techniken schon optimal kombiniert sind.“
>
> Status: **Vorschlag für die große Sitzung.** Die Wirbelsäule ist als Versuch gebaut und gemessen (Abschnitt 2). Alles andere ist Plan und braucht Florians Entscheidung (Abschnitt 7).

## Kurzfassung

**Nein, die Techniken sind noch nicht optimal kombiniert.** Heute gibt es vier Bauwege für das 3D:
- Platzhalter-Loft
- Kanten-Käfig
- Maul-Käfig
- Tiger-Käfig

Dazu hat die Front drei Rollen: Umriss, Querschnitt für den ganzen Körper und Hauptspant. Daher kommen die Überraschungen.

**Vorschlag: ein Netz auf einer Wirbelsäule.**
1. **Wirbelsäule:** Sie läuft in der Seite vom Schwanz zur Schnauze, die Ringe stehen senkrecht auf ihr. Damit geht ein Hals nach oben mit Kopf darauf (am Langhals getestet), und Biegen wird eine Pose (getestet).
2. **Jede Ansicht ist ein echter Umriss.** Jeder Punkt gehört zu einer Stelle des Körpers; Ziehen bewegt nur diese Stelle, nichts skaliert. Die Kopplung ist seit heute Abend schon so.
3. **Kanten:** Eine Kante ist eine Ecke in einem Shape (Umriss oder Spant) oder eine Kantenlinie mit Knickwinkel. Alles liegt im selben Netz.
4. **Maul:** Es gehört von Anfang an zum selben Netz und ist geschlossen verbunden; Kanten und Spanten gelten dort auch.
5. **Fressen ist eine Pose desselben Netzes:** Wirbelsäule biegen, Kiefer drehen, dann jeden Punkt jeder Linie ziehen.

## 1. Was heute nicht zusammenpasst

| Was du erlebst | Ursache im Code |
|---|---|
| Hals nach oben mit Kopf geht nicht | Alle Ringe stehen senkrecht auf der Längsachse x (Platzhalter-Loft, Kanten- und Maul-Käfig). Ein senkrechter Hals wird längs zerschnitten (`maul-langhals-zu-3d.png`). |
| Eine Ansicht formt die ganze andere | Die Front ist der Querschnitt an jeder Stelle, gestreckt auf Höhe × Breite. Ein Knick in der Front erscheint deshalb überall. |
| Auch Spanten verhalten sich unerwartet | Spanten sind auf Höhe × Breite ihrer Stelle normiert und strecken sich mit, wenn sich Seite oder Top ändern. Sie wirken bis zum nächsten Spant, vor dem ersten bis zur Spitze. |
| Schöne Kanten sind schwer | Härte allein macht kaum einen Knick (13° bei 100 %). Einen echten Winkel gibt es nur über Ecken in Shapes. Kantenlinien liegen auf festen Ringen, schräge Linien werden ungenau. |
| Maul wirkt wie ein eigenes Objekt | Mit Maul baut ein anderer Käfig. Kanten und Spanten fehlen dort, und im Fressen-Tab folgt der Körper nur automatisch dem Kiefer, bearbeiten kann man ihn nicht. |

## 2. Das Wirbelsäulensystem (Versuch, gebaut und gemessen)

Code: `packages/shape/src/versuch/wirbelsaeule.ts` (Tests `wirbelsaeule.test.ts`); im Editor `?versuch=wirbel&wesen=langhals|robbe|rex|tiger|kugel`, Bilder mit `apps/editor/scripts/wirbel-bilder.mjs`.

**So entsteht der Körper:**
1. **Rücken- und Bauchlinie:** Der Seitenumriss wird an Schnauzen- und Schwanzspitze geteilt.
2. **Wirbelsäule:** die Mitte zwischen Rücken- und Bauchlinie, aus der kürzesten Leiter zwischen beiden Linien (dynamische Programmierung), geglättet. An den Spitzen läuft sie gerade aus.
3. **Ringe:** Sie stehen senkrecht auf der Wirbelsäule und reichen genau von der Rücken- bis zur Bauchlinie. Der Seitenumriss stimmt damit immer.
4. **Breite je Ring:** Sie kommt aus der Ansicht, die den Ring von der Kante sieht:
   - liegende Teile (Rumpf, Kopf) aus dem Top
   - stehende Teile (Hals) aus der Front

   Rechnerisch ist es die kleinere der beiden Umrissbreiten, denn jeder Umriss ist eine Hülle.
5. **Querschnitt:** zwei Viertelellipsen, die breiteste Stelle (Flanke) in der Höhe c. Liegende Teile holen c aus der Front (Birnenbauch, Eierkopf), stehende sind rund.
6. **Netz:** ein Catmull-Clark-Käfig (44 Ringe × 16, Pole an den Spitzen), angepasst, bis die Grenzfläche die Ringe trifft.

**Bilder** (`docs/progress/editor/`):
- `wirbel-langhals-vergleich.png`: deine Vorlage, bisher, neu
- `wirbel-langhals-editor.png`: Wirbelsäule (dunkelrot) und Sprossen in der Seite; orange = liegt, Breite aus dem Top; blau = steht, Breite aus der Front
- `wirbel-vier.png`: Langhals, Robbe, Rex, Tiger mit derselben Bauweise
- `wirbel-hals-biegen.png`: Pose, Hals um ±30° gebogen

**Messwerte** (Abweichung der Umrisse des 3D-Körpers von der Zeichnung, Pixel in der Grundansicht, max / mittel):

| Wesen | Seite | Front | Top | Bau |
|---|---|---|---|---|
| Kugel | 1,1 / 0,2 | 0,5 / 0,2 | 1,2 / 0,2 | – |
| Langhals | 5,4 / 0,3 | 5,3 / 1,7 | 14,0 / 3,1 | 0,3 s |
| Robbe | 6,1 / 0,4 | 16,2 / 5,5 | 3,8 / 1,6 | 0,3 s |
| Rex | 2,1 / 0,2 | 15,5 / 4,8 | 6,7 / 3,1 | 0,3 s |
| Tiger | 16,5 / 1,1 | 3,1 / 1,1 | 4,5 / 0,9 | 0,2 s |

- Beim **Langhals** stehen 16 von 44 Ringen; ihre Breite kommt aus der Front. Der Hals steht, der Kopf sitzt darauf.
- Die **Front** liegt bei Robbe und Rex noch bis 16 px daneben, weil der Querschnitt im Versuch nur zwei Viertelellipsen sind. Mit der gezeichneten Front als Vorlage je Hälfte (wie heute im Loft) wird sie genau.
- Die **Tiger-Kastenschnauze** wird rund (Seite 16,5 px): Eine flache Stirnfläche braucht eine Kappe statt eines Pols, die Kastenkanten brauchen Ecken in Spanten.
- **Pose:** Biegen ist eine Gelenkkette. Die Abstände entlang der Wirbelsäule bleiben exakt, Punkt- und Flächenzahl sind gleich wie in Ruhe, damit sind Blendshapes möglich (Test).
- **Grenzen:**
  - Bei −30° staucht die Innenseite der Biegung sichtbar.
  - An den Polen gibt es kleine Durchdringungen (unter 2 px).
  - Verzweigungen (Beine, Ohren, Flügel) sind eigene Teile an Andockringen.

## 3. Örtlich statt global (Antwort auf „eine Ansicht formt die andere“)

1. **Nur der entsprechende Punkt bewegt sich**, in jeder Ansicht und im 3D. Nichts streckt sich mit. Für die Kopplung der Umrisse gilt das seit heute Abend (`kopplung.ts`).
2. **Umrisse sind Hüllen.** Die Seite legt Rücken- und Bauchlinie genau fest. Die Breite eines Rings kommt aus Top oder Front, je nachdem, welche Ansicht ihn von der Kante sieht. Zieht man an der Front in Halshöhe, ändert sich nur der Hals.
3. **Die Front ist kein Querschnitt für alles mehr.** Sie zeigt den echten Umriss und dazu die Spanten der liegenden Teile (Spantenriss: vorn in Front, hinten in Back).
4. **Spanten hängen an drei Linien statt an einem Kasten:**
   - oben an der Rückenlinie, unten an der Bauchlinie, seitlich an der Breitenlinie
   - jede Hälfte für sich: Hebt man den Rücken, ändert sich nur die obere Hälfte, die Flanke bleibt
   - die Reichweite eines Spants (bis zu den Nachbarn) ist in der Seite sichtbar
5. **Breitenlinie:** die Höhe der breitesten Stelle als eigene, ziehbare Linie in der Seite. Im Versuch kommt sie noch aus der Front.

## 4. Schöne Formen und Kanten

- **Eine Kante ist eine Ecke in einem Shape** (wie heute Nachmittag): Umriss-Ecke = Kante quer, Spant-Ecke = Kante längs. Den Winkel gibt die Form, die Härte rundet.
- **Neu: Kantenlinie mit Knickwinkel** statt Tiefe. Die Fläche knickt an der Linie um den Winkel, die Härte rundet. Damit hat jede Linie beide Größen wie eine Ecke.
- **Rundheit je Abschnitt** (rund ↔ kastig) als Regler auf der Wirbelsäule, ohne Spanten zu zeichnen: Kopf kastig, Hals rund, Bauch weich.
- **Alles im selben Netz:** Kanten, Spanten und Lippen bekommen eigene Längsschleifen entlang der Wirbelsäule (wie heute im Kanten-Käfig).
- **Prüfen:** Zebrastreifen (gibt es), Spantenriss, Umriss des 3D-Körpers gestrichelt in jeder Ansicht (gibt es im Versuch).

## 5. Maul verbunden, Fressen bearbeitbar

- **Maul im selben Netz:**
  - Das Kopfende des Wirbelsäulen-Käfigs bekommt den Maulschnitt aus dem Maul-Versuch (`maul.ts`: Naht, Reißverschluss, Tasche).
  - Geschlossen liegen Ober- und Unterlippe aufeinander, das Netz ist verbunden.
  - Kein eigenes Objekt, kein eigener Bauweg; Kanten und Spanten gelten am Kopf wie überall.
- **Fressen ist eine Pose desselben Netzes** (gleiche Linien, gleiche Punktstruktur):
  1. Startvorschlag: Der Kieferknochen dreht den Unterkiefer, die Wirbelsäule darf mitbiegen (Kopf hebt sich).
  2. Danach ist jeder Punkt jeder Linie ziehbar: Umrisse, Spanten, Kanten, Lippen.
  3. Gespeichert wird die Abweichung von „zu“.
  4. Zwischenstufen entstehen aus Knochen plus Korrektur, wie im Maul-Versuch gemessen.
- **Eigene Posen** („Neue Pose“) arbeiten genauso.

## 6. Reihenfolge für die große Sitzung

1. **Wirbelsäulen-Käfig als einziger Bauweg.** Er ersetzt Platzhalter-Loft, Kanten- und Tiger-Käfig. Die Wirbelsäule ist in der Seite sichtbar und ziehbar.
2. **Vorlage aus der Front je Hälfte** (Front genau), Breitenlinie, Spanten auf der Wirbelsäule mit gemeinsamen Punkten.
3. **Kanten im selben Käfig:** Ecken, Kantenlinien mit Knickwinkel, Rundheit je Abschnitt; dazu eine Kappe für flache Stirnflächen.
4. **Maul im selben Käfig** (Kopfende), geschlossen verbunden; Zähne und Augen hängen daran.
5. **Posen:** Fressen mit Biegen, Kiefer und freiem Bearbeiten aller Linien.
6. **Anbauteile** (Beine, Flügel) an Andockringen, Wirbelsäule als Knochenkette fürs Rig.

## 7. Entscheidungen (Florian)

1. **Wirbelsäulen-Netz als einzige Bauweise?** Empfehlung: ja.
2. **Ziehen an der Wirbelsäule = biegen** (Umriss geht mit), mit ⌥ nur die Linie verlegen? Empfehlung: ja.
3. **Front = echter Umriss plus Spantenriss** statt Querschnitt für alles? Empfehlung: ja.
4. **Fressen = Pose mit freiem Bearbeiten aller Linien?** Empfehlung: ja.

## Nachtrag (12.10. abends): zum Vergleichen eingebaut

Florian: „Kannst du das schon so einbauen, dass ich es vergleichen kann?“

**Tab am 3D-Fenster:** „creation · wirbelsäule“, wie „front · back“.
- „creation“ ist die bisherige Bauweise: Platzhalter-Loft, Kanten- oder Maul-Käfig.
- „wirbelsäule“ baut aus denselben Profilen den Wirbelsäulen-Körper, live beim Zeichnen. Während einer Geste geht es schnell, beim Loslassen genau.

**Anzeige:**
- In der Seite: die Wirbelsäule (dunkelrot) und die Sprossen. Orange heißt Breite aus dem Top, blau heißt Breite aus der Front.
- In allen Ansichten: der Umriss des 3D-Körpers gestrichelt.

**Seitenleiste (Bereich „Wirbelsäule“):**
- Ringzahl, Zahl der stehenden Ringe, Quelle des Querschnitts
- Regler „Biegen“ (−60° … 60°) und „Stelle“ (ab der Schnauze), Knopf „gerade“
- Biegen ist nur eine Vorschau und wird nicht gespeichert.

**Querschnitt:**
- Liegt das ganze Wesen, gilt deine Front samt Spanten als Querschnitt wie bisher (Kugel: Front 0,4 px).
- Mit stehenden Teilen bleibt er oval, weil die Front dann ein Umriss aus Rumpf, Hals und Kopf ist.

**Noch nicht in dieser Bauweise:** Maul, Kanten-Härte, Kastenschnauze. Die 3D-Kamera bleibt, wie sie ist; hohe Köpfe zeigt das Mausrad (herauszoomen).

**Code und Test:** `apps/editor/src/wirbel/` (`wirbelKoerper.ts`, `WirbelEbene.tsx`), E2E `apps/editor/e2e/wirbel.spec.ts`, Bild `docs/progress/editor/wirbel-vergleich-tab.png`.

## Nachtrag (12.10. abends): Maul an der Umrisslinie, Maulspalt, Über- und Unterbiss

Florian: „Das Maul muss an der Umrisslinie direkt sitzen und ein Maulspalt muss entstehen, so wie bei der Fressen-Pose! Nur so kann ich sauber einen Über- oder Unterbiss erstellen.“

- **Maulanfänge sind Knoten des Seitenumrisses** (gemeinsame Punkte, formtreu eingefügt):
  - Beim Zeichnen der Maullinie wird ihr Anfang ein Umrissknoten.
  - Bei „getrennt“ wird der Anfang der Unterlinie ein zweiter Knoten auf der Kinnseite.
- **Ziehen am Maulanfang bewegt den Umrissknoten**, der Umriss geht mit:
  - Unterkiefer-Anfang nach vorn: Das Kinn kommt mit, das ist ein Unterbiss.
  - Oberkiefer-Anfang nach vorn: Die Schnauze kommt mit, das ist ein Überbiss.
  - Umgekehrt folgt der Anfang dem Knoten genau, wenn man ihn im Form-Tab zieht.
  - Ein Zug ist ein Rückgängig-Schritt. Die anderen Ansichten folgen über die Kopplung (nur die Spitze).
- **Maulspalt:** Geschlossen mit getrennten Kiefern läuft der Seitenumriss vom Oberlippen-Anfang die Oberlippe entlang zum Mundwinkel und die Unterlippe zurück, wie im Fressen-Tab.
- **Code und Test:** `packages/shape/src/versuch/maulUmriss.ts` (`maulAnfaengeEinbauen`, `umrissMitSpalt`, Tests), `maulAnKontur` folgt Knoten, Editor `src/maul/MaulEbene.tsx` (`setzeLippenImUmriss`), E2E in `maul.spec.ts`, Bild `docs/progress/editor/maul-unterbiss.png`.

## 8. Was andere machen (Recherche 12.10. abends, mit Quellen)

**Befunde:**
- **Wirbelsäule:**
  - Spore formt den Rumpf um eine Kette von Wirbeln; die Haut ist eine implizite Fläche, robust, aber ohne örtliche Kontrolle [1, 2].
  - Blenders Skin-Modifier und ZSpheres machen aus Skelett und Radien ein Vierecksnetz entlang des Skeletts [4, 5].
  - Teddy, RigMesh und 3-Sweep schlagen die Achse aus dem Umriss vor (Chordalachse, geglättet) und stellen die Querschnitte auf Sehnen zwischen den beiden Umrissseiten [6, 7, 8].
  - Eine Röhre schneidet sich nicht, solange ihr Radius kleiner ist als der Krümmungsradius der Achse (r < 1/κ) [9]. Sehnen zwischen zwei Umrisslinien kreuzen sich nicht.
- **Linien statt Ansichten:**
  - Im Linienriss des Schiffbaus kommen Sheer, Deckskante, Knick und Kiel zuerst in Seiten- und Wasserlinienriss; jeder Spant läuft durch die festen Punkte dieser Linien. „Gestrakt“ heißt: Alle Ansichten stimmen in allen Messpunkten überein [16, 17, 18].
  - Rhino Crv2View macht aus zwei Ansichten eine Raumkurve [12]. Sweep2 legt die Profilenden auf zwei Schienen [13].
  - Gordon-Flächen verlangen, dass Profile und Führungskurven sich in gemeinsamen Punkten schneiden [15]; Alias-Kurvennetze ebenso [14].
- **Kanten:**
  - Ein Crease schärft nur einen Knick, den der Käfig schon hat [22–25]. Das passt zur Messung: Spant-Ecke 43°, freie Linie 13°.
  - In Rhino gilt: „Hat die Eingangskurve einen Knick, hat die Fläche eine Falte.“ [26]
  - FiberMesh-Kurven sind Griffe, die man aus der Fläche zieht [27].
- **Posen:**
  - Pose Space Deformation, Blender (Korrekturformen) und Maya PSD modellieren die Form in der Pose und speichern die Differenz im lokalen Rahmen [28–30].
  - Lippen werden geschlossen modelliert, die Innenlippe läuft bis zum Rachen [31].

**Was heißt das für uns:**
1. **Wirbelsäule aus der Seite vorschlagen**, danach als Griffkurve führen. So macht es der Versuch.
2. **Ringe als Sehnen zwischen Rücken- und Bauchlinie**, Zuordnung monoton. Der Versuch stellt sie senkrecht zur Wirbelsäule und hält die Zuordnung monoton, das ist gleichwertig, solange r < 1/κ gilt. An engen Biegungen gewinnen die Sehnen.
3. **Breite aus der Ansicht mit der besten Sicht:** Hals aus der Front, Rumpf aus dem Top.
4. **Gemeinsame Punkte statt Skalieren:** Spant und Längslinie treffen sich in einem Punkt; die Front zeigt Spanten (Spantenriss) statt eines Querschnitts für alles.
5. **Kante = Ecke in Umriss, Spant oder Linie, Härte = Rundung.** Eine freie Linie braucht einen Griff, der sie aus der Fläche zieht (Knickwinkel).
6. **Maul geschlossen im selben Netz, offen als Korrektur**, die im Fressen-Tab auf dem ganzen Netz bearbeitet wird.
7. **Implizite Haut (Spore) nur als Rückfall:** Ihr fehlen örtliche Kontrolle und Kanten.

Lücken laut Recherche: Eine eigene „Linie größter Breite“ ist im Linienriss nicht belegt. Spores Mausrad für Masse ist nur durch einen Pressebericht belegt. Einen Fächer an engen Biegungen nennt keine Quelle.

**Quellen:**
1. Hecker: My Liner Notes for Spore – https://www.chrishecker.com/My_Liner_Notes_for_Spore
2. Hecker et al. 2008: Real-time Motion Retargeting (Spore) – https://chrishecker.com/Real-time_Motion_Retargeting_to_Highly_Varied_User-Created_Morphologies
3. Yan 2008: Spore Creature Creator (Gaming Nexus) – https://www.gamingnexus.com/Article/1862/Spore-Creature-Creator
4. Blender-Handbuch: Skin Modifier – https://docs.blender.org/manual/en/latest/modeling/modifiers/generate/skin.html
5. Maxon: ZSpheres – https://help.maxon.net/zbr/en-us/Content/html/user-guide/3d-modeling/modeling-basics/creating-meshes/zspheres/zspheres.html
6. Chen et al. 2013: 3-Sweep – https://cg.cs.tsinghua.edu.cn/papers/SIGASIA-2013-3sweep.pdf
7. Igarashi et al. 1999: Teddy – https://www-ui.is.s.u-tokyo.ac.jp/~takeo/papers/siggraph99.pdf
8. Borosán et al. 2012: RigMesh – https://cragl.cs.gmu.edu/rigmesh/
9. Patrikalakis, Maekawa, Cho: Shape Interrogation, §11.6.2 – https://web.mit.edu/hyperbook/Patrikalakis-Maekawa-Cho/node237.html
10. Wang et al. 2008: Rotation Minimizing Frames – https://doi.org/10.1145/1330511.1330513
11. Rhino 8: Sweep1 – https://docs.mcneel.com/rhino/8/help/en-us/commands/sweep1.htm
12. Rhino 8: Crv2View – https://docs.mcneel.com/rhino/8/help/en-us/commands/crv2view.htm
13. Rhino 8: Sweep2 – https://docs.mcneel.com/rhino/8/help/en-us/commands/sweep2.htm
14. Alias 2015: Understand curve networks – https://help.autodesk.com/cloudhelp/2015/ENU/Alias-Modeling/files/Understand_curve_networks.htm
15. Siggel et al. 2019: TiGL (Gordon-Flächen) – https://arxiv.org/abs/1810.10795
16. Riley, Turner 1995: FAO Fisheries Technical Paper 354, Lofting – https://www.fao.org/4/V9468E/v9468e05.htm
17. Moore 1928 (Auszug): Traditional Model Yacht Design – https://usvmyg.org/?p=9536
18. NZQA Unit Standard 23241: Loft a boat hull – https://www.nzqa.govt.nz/nqfdocs/units/pdf/23241.pdf
19. Volkswagen: Know your lines – Arteon – https://www.volkswagen.com.my/brand-and-experience/volksphere/spotlight/know-your-lines-the-volkswagen-arteon
20. Bae et al. 2008: ILoveSketch – https://sketch.kaist.ac.kr/pdf/publications/2008_uist_ilovesketch.pdf
21. Rhino 8: NetworkSrf – https://docs.mcneel.com/rhino/8/help/en-us/commands/networksrf.htm
22. Blender-Handbuch: Subdivision Surface Modifier – https://docs.blender.org/manual/en/latest/modeling/modifiers/generate/subdivision_surface.html
23. Pixar: US-Patent 6,222,553 – https://patents.google.com/patent/US6222553
24. OpenSubdiv: Semi-Sharp Creases – https://github.com/PixarAnimationStudios/OpenSubdiv/blob/release/documentation/subdivision_surfaces.rst
25. Raitt, Minter 2000: Digital Sculpture Techniques – https://web.archive.org/web/20170516170023/http://www.theminters.com/misc/articles/derived-surfaces/derived-surfaces.pdf
26. Rhino 8: Crease splitting enabled – https://docs.mcneel.com/rhino/8/help/en-us/popup_moreinformation/creasesplttingenabled.htm
27. Nealen et al. 2007: FiberMesh – https://www-ui.is.s.u-tokyo.ac.jp/~takeo/papers/fibermesh.pdf
28. Lewis et al. 2000: Pose Space Deformation – https://www.scribblethink.org/Work/PSD/PSD.pdf
29. Blender-Handbuch: Drivers, Workflow & Examples – https://docs.blender.org/manual/en/latest/animation/drivers/workflow_examples.html
30. Maya: Create pose space deformations – https://help.autodesk.com/cloudhelp/ENU/MayaCRE-CharacterAnimation/files/GUID-00699C13-8CA1-450C-937D-57C7B3DFD8C6.htm
31. Softimage 2014 (Face Robot): Modeling the Mouth Area – https://download.autodesk.com/global/docs/softimage2014/en_us/files/face_modeling_ModelingtheMouthArea.htm
