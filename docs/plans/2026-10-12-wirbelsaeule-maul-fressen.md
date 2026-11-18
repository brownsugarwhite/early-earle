# Wirbelsäule selbst zeichnen, Maul mit Wirbelsäule, Form im Fressen-Tab (Plan 12.10.2026 nachts)

> Florian: „Kann ich die Wirbelsäule auch selbst einzeichnen, und kannst du es kombinieren, dass es auch mit dem Maul
> funktioniert? Und in der Fressenpose muss ich auch den Shape bearbeiten können!“

Grundlage: [`2026-10-12-wirbelsaeule-ein-netz.md`](2026-10-12-wirbelsaeule-ein-netz.md). Drei Schritte, nach jedem Commit und Push.

## 1. Wirbelsäule selbst zeichnen

- **Datenmodell:** `dok.wirbelsaeule?: Linie3` (Knoten in der Seite, z = 0). Fehlt sie, schlägt der Editor sie aus dem Umriss vor (wie bisher).
- **Bau:**
  - Die gezeichnete Linie wird an beiden Enden gerade bis zum Umriss verlängert; dort sitzen die Pole.
  - Der Umriss wird an diesen Punkten in Rücken- und Bauchlinie geteilt.
  - Die Ringe stehen senkrecht auf der gezeichneten Linie.
- **Bedienung** (Tab „wirbelsäule“, Form):
  - Seitenleiste mit „selbst zeichnen“ (Klicks in der Seite, Enter beendet, Esc bricht ab), „Vorschlag übernehmen“ (die automatische Wirbelsäule wird ziehbar) und „automatisch“.
  - In der Seite: Punkte ziehen. P auf der Linie fügt einen Punkt ein, P oder − auf einem Punkt löscht ihn.
  - Der Umriss bleibt dabei stehen; die Ringe verlegen sich.

## 2. Form im Fressen-Tab

- **Datenmodell:** `dok.posenProfile?.fressen?.seite?: Profil`, die Seitenform der Pose mit derselben Punktstruktur wie der geschlossene Umriss. Front und Top folgen im Fressen-Tab dem Kiefer (Anzeige).
- **Start:** Die Form, die der Fressen-Tab heute zeigt. Jeder Knoten wird über das 3D vom geschlossenen auf den offenen Körper abgebildet; die Griffe drehen und strecken sich mit.
  - Gespeichert wird beim ersten Bearbeiten.
  - Fehlt der zweite Maulanfang (Kiefer gleich), kommt ein Knoten an derselben Stelle dazu, damit sich das Maul öffnen kann.
- **Bearbeiten** wie im Form-Tab: Punkte, Griffe, ⌥, P, +, −, Pfeiltasten.
  - Punkt einfügen oder löschen im Editor-Tab tut dasselbe in der Pose.
  - Die offenen Maulanfänge folgen ihren Knoten.
- **Umriss mit offenem Maul:** wie geschlossen der Spalt, nur mit den offenen Lippen.
- **3D:**
  - Mit Maul legt sich die offene Haut an die bearbeitete Seitenform (ARAP, wie bei Florians nachgezogenen Bögen).
  - Ohne Maul ist der Fressen-Körper der Loft aus der Pose-Form.

## 3. Maul mit Wirbelsäule

- Der Maul-Käfig rechnet heute in x: Stationen, Projektion auf die Fläche, Stirn, Dichte. Er bekommt einen **Stationsraum** mit zwei Fassungen:
  - x (wie bisher, unverändert)
  - Wirbelsäule (Station = Lage entlang der Wirbelsäule, Ring = Wirbelsäulen-Ring an dieser Stelle, Projektion in der Ringebene)
- Im Tab „wirbelsäule“ baut das Maul dann auf den Ringen der Wirbelsäule: Hals hoch, Kopf drauf, Maul im Kopf.
- **Prüfen:** Die Maul-Tests mit Tiger, Rex, Robbe und Langhals bleiben in x unverändert; neu kommt der Langhals mit Maul auf der Wirbelsäule (Netz geschlossen, Lippen auf den Linien).

## Reihenfolge

1 (klein) → 2 (mittel) → 3 (groß). Nach jedem Schritt: Typecheck, Unit- und E2E-Tests, Bilder, Commit, Push.

## Nachtrag (12.10. nachts): gebaut

1. **Wirbelsäule selbst zeichnen** (`dok.wirbelsaeule`, `eigeneWirbelsaeule`, Editor `src/wirbel/WirbelEbene.tsx`):
   - Seitenleiste „selbst zeichnen“, „Vorschlag übernehmen“, „automatisch“.
   - Punkte ziehen; mit dem Zeichenstift einfügen und löschen.
   - E2E `wirbel.spec.ts`, Bild `docs/progress/editor/wirbel-selbst-gezeichnet.png`.
2. **Form im Fressen-Tab** (`dok.posenProfile.fressen.seite`, Editor `src/maul/fressenForm.ts`, `src/editing/aktiv.ts`):
   - Die Seite bearbeitet die Pose-Form. Start ist die Form, der der Körper mit dem Kiefer folgt; gespeichert wird beim ersten Bearbeiten.
   - Punkte einfügen oder löschen wirkt in beiden Formen.
   - Die offenen Maulanfänge sind Punkte der Pose-Form, in beide Richtungen.
   - Im 3D legt sich die offene Haut an die Pose-Form.
   - Der Fressen-Tab öffnet das Maul auf 100 %, der Editor-Tab auf 0 %.
   - E2E in `maul.spec.ts`, Bild `fressen-form.png`.
3. **Maul auf der Wirbelsäule** (`packages/shape/src/versuch/wirbelMaul.ts`):
   - Der Maul-Käfig läuft unverändert im gestreckten Raum. Er nimmt dafür Querschnitte (`rkFrei`) und den offenen Umriss (`umrissAuf`) von außen.
   - Danach kommt jeder Punkt zurück in die Welt; die Topologie ist dieselbe wie entlang x.
   - Im Tab „wirbelsäule“ läuft das Maul mit: zu, offen, mit Zähnen. Linien rasten dort auf dem Wirbelsäulen-Körper ein.
   - E2E `wirbel.spec.ts`, Bilder `wirbel-maul-zu.png`, `wirbel-maul-auf.png`.

**Messung** (Seitenumriss max, Maul im 3D; Test `wirbelMaul.test.ts`):

| Wesen | entlang x | Wirbelsäule |
|---|---|---|
| Langhals | 36,1 px | 24,0 px |
| Robbe | 4,6 px | 9,3 px |
| Rex | 5,6 px | 4,3 px |
| Tiger | 15,0 px | 18,5 px |

Der gestreckte Raum ist exakt (hin und zurück unter 0,1 px).

**Grenzen:**
- **Maulanfang weit hinter der Schnauzenspitze** (dein nachgezogener Langhals: Maul unter dem Kopf): Vor dem Maul gibt es im Käfig nur die 4×4-Kappe, die Kopfspitze wird zu spitz. Das gilt entlang x genauso.
  - Abhilfe: Ringe vor dem Maulanfang (Schnauzenringe); das ändert die Topologie des Maul-Käfigs.
  - Mäuler, die vorn an der Kontur beginnen, betrifft es nicht.
- Biegen ist mit Maul noch nicht im 3D (nur ohne Maul).
- Robbe: Mit stehenden Ringen sind die Querschnitte oval, deshalb liegt die Front weiter daneben.
- Front und Top folgen im Fressen-Tab dem Kiefer (Anzeige). Eigene Posen außer Fressen sind noch nicht bearbeitbar.
- Kanten-Härte fehlt in der Wirbelsäulen-Bauweise.


## Nachtrag (12.10. spätnachts): Maulloch und verbundene Kiefer

Florian (mit zwei Bildern der Seite im Fressen-Tab): „Das Maul macht auch kein Loch in den Shape mehr, bei Fressen sind die Kiefer nicht mal mehr mit dem Shape verbunden.“ Im Bild lief der Umriss vom Oberlippen- zum Unterlippen-Anfang quer durchs Maul, der gestrichelte 3D-Umriss lag weit neben der Form.

**Ursachen:**
1. **Spalt nur über die Lage:** `umrissMitSpalt` suchte die Maulanfänge über ihre Lage (0,5 px). In der Pose-Form und bei Mäulern von vor dem Umbau lagen sie nicht genau auf Knoten. Dann gab es keinen Spalt, und der Umriss lief durchs Maul.
2. **Reihenfolge der Anfänge:** Die Kinnseite kam aus der Höhe der beiden Nachbarknoten. An der Unterseite des Kopfes liegen beide gleich hoch, die Wahl war zufällig. Offen hing dann die Schnauze am Kinn und der Unterkiefer an der Oberlippe.
3. **Kiefer gleich:** Der zweite Anfang (Kinn) bekam einen Griff, der über den Spalt hinweg gedreht war. Unter dem Kinn entstand eine Delle.
4. Der gestrichelte 3D-Umriss in der Bauweise Wirbelsäule umfasste die Maultasche.

**Jetzt:**
- **Maulanfänge über Knotennummern** (`maulAnfangIndizes`): Die Pose-Form hat dieselben Nummern, die offenen Anfänge rasten immer genau auf ihre Knoten (`poseMitAnfaengen`). Der Spalt ist der kürzeste Weg zwischen den beiden Anfängen.
- **Kinnseite über den Winkel zur Maulrichtung** (`kinnRichtung`, `paarOrdnen`): Von der Maulrichtung (Anfang → Mundwinkel) aus liegt gegen den Uhrzeigersinn die Oberkieferseite (Schnauze links), im Uhrzeigersinn das Kinn. Das gilt für getrennte Kiefer, für den zweiten Anfang bei Kiefer gleich und für deckungsgleiche Paare, an jeder Stelle des Umrisses.
- **Reparatur beim Laden und bei jeder Maul-Änderung** (`maulImUmrissSichern`): Fehlende Anfänge werden eingebaut. Liegen zwei nahe Anfänge vertauscht, tauschen sie ihre Knoten. Eine gespeicherte Pose-Form bekommt eingefügte Knoten mit.
- **Pose-Form ableiten:** Die Griffe an den Maulanfängen drehen je Seite mit (Ober- bzw. Unterkiefer), das Spaltstück wird gerade.
- **Kiefer gleich mit gespeicherter Pose:** Beide deckungsgleichen Anfänge wandern beim Ziehen zusammen.
- **Gestrichelter 3D-Umriss** nur aus der Haut (`maulUmrisseSetzen`).
- **Tests:** `maulUmriss.test.ts` (Kopfunterseite, gespiegelt, vertauscht, deckungsgleich; mit der alten Regel schlagen 6 von 9 fehl), E2E „Kiefer bleiben verbunden“ und „Maul an der Kopfunterseite“. Bilder `docs/progress/editor/fressen-verbunden.png`, `fressen-unterseite.png`, Überlagerung `fressen-umrisse.png` (Form im Fressen-Tab, geschlossen, 3D).

**Grenze bleibt: Maulanfang hinter der Schnauzenspitze.** Die Kappe vor Ring 1 trägt dann die ganze Schnauze. Im 3D wird die Stirn flacher, der gestrichelte Umriss weicht dort geschlossen um etwa 10 px ab (Langhals, Standardzoom; Maul an der Spitze: 4 px). Abhilfe sind Schnauzenringe vor dem Maulanfang; das ändert die Topologie des Maul-Käfigs und gehört in die große Sitzung. Bis dahin das Maul vorn an der Schnauze beginnen lassen.
