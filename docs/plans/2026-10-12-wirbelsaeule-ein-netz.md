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
