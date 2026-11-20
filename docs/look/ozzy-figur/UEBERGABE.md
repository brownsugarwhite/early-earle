# Übergabe: Ozzy-Figur (Stand 20.11.2026 früh: zurück im 2D; Kopf dreht 360°, Szene kopf360, 90°–180° in fünfter Fassung, dazu das Werkzeug zum Selbst-Bearbeiten (Stufe 1) mit Zeitleiste aller Schlüssel; 3D-Wege ruhen)

Neuer Strang neben dem Prototyp `claude/maskottchen`: Ozzy als 2,5D-Bewegungswerkzeug mit Physik, aus Florians eigenen SVGs.
Zweig `claude/ozzy-animation-physics-294508` (aufgesetzt auf `claude/maskottchen` @ ebb6fd21), Arbeitsbaum
`.claude/worktrees/ozzy-animation-physics-294508`. Plan: [`docs/plans/2026-11-18-ozzy-figur.md`](../../plans/2026-11-18-ozzy-figur.md)
(von Florian freigegeben: „Ja, A und B bauen“), Recherche: [`docs/research/2026-11-18-ozzy-figur-recherche.md`](../../research/2026-11-18-ozzy-figur-recherche.md).

## Starten

```bash
EDITOR_WEB=1 pnpm --filter @ee/editor exec vite --port 5213 --strictPort --host
```

Aus dem Wurzelordner des Arbeitsbaums; Eintrag `ozzy-figur` in `.claude/launch.json`. Seite `http://localhost:5213/ozzy-figur.html`
(mit `--host` auch vom iPhone im selben Netz über die Adresse des Macs). Schalter: `?szene=steuern|logo|profil|front|back|viertel|lieg1|lieg2|sitz1|sitz2|drehen|kopf|koerper|hinsetzen|hinlegen|umlegen|haltung|haltungP`,
`&t=0…1` (Drehwinkel 0–90° bzw. Weg der Haltung), `&modus=exakt`, `&vorlage=1` (Florians Vorlage rot darüber).

## Was steht

- **Vorlagen** `vorlagen/` (sechs SVGs aus Illustrator). Die Seite liest sie beim Laden (`?raw`): Ersetzt Florian eine Datei, zeigt
  die Seite sie nach dem Neuladen; der Import meldet in der Leiste unter „Import“.
- **Etappe A, Import** (`apps/editor/src/ozzy-figur/vorlagen/`): `svg.ts` liest path/polyline/polygon ohne DOM, verschmilzt die
  0,01-Schlusslinien des Exports; `import.ts` benennt die Teile je Ansicht (Tabelle `ANSICHTEN`, Rückansicht anatomisch benannt),
  prüft Farbe und Ankerzahl, ergänzt fehlende Anker formtreu (`ankerErgaenzen` in `form.ts`, Vergleich nach bester Drehung) und
  schreibt den Bericht: [`import-bericht.md`](import-bericht.md) (neu erzeugen mit `BERICHT=1 npx vitest run src/ozzy-figur/`).
  Einziger Ausgleich: das ferne Vorderbein der vier Seitenansichten (14 → 15 Anker, überall Stück 12 bei t ≈ 0,18).
- **Etappe B, Renderer** (`renderer.ts`, WebGL2): Abstandsfeld je Teil (bis 24), Vorzeichen per Schablone, **Außenkanten auf der
  Grafikkarte** (Vertex-Shader wirft innere Kanten weg), Bild mit weicher Vereinigung je Paar (Regler, 0 = exakt), Weiß in
  Malreihenfolge (später gezeichnetes Schwarz deckt es wie im SVG), Weiß im Träger (Fenster nur beim Wandern, Schwanz immer),
  Verdecken auf der abgewandten Seite, Ohrspalt automatisch. `szenen.ts`: die sechs Vorlagen, „Kopf dreht“ (Logo → Profil) und
  „Körper dreht“ (Front → Logo, Beine als Punkte im Raum, Fenster gleiten hinter den Gipsrand).
- **Seite** `apps/editor/ozzy-figur.html` + `src/ozzy-figur/main.ts`: Ansichten, Winkel mit „Drehen ▶“, exakt/flüssig, Regler je
  Paar, Vorlage rot darüber, Diagnose (Weiß ohne Schwarz rot, Ohrspalt blau), Dauerlauf mit Bildern/s und Zeiten (oben rechts).

## Proben (`apps/editor/scripts/ozzy-figur/proben.mjs`, startet einen eigenen Vite auf 5293)

Ergebnis vom 18.11. abends (`docs/progress/ozzy-figur/2026-11-18-proben-ab.json`, Bilder `2026-11-18-a-*`, `2026-11-18-b-*`):

| Probe | Ergebnis |
| --- | --- |
| A Vorlagen exakt | alle sechs: 0,000–0,006 % deutlich abweichende Bildpunkte; 0,1–0,4 % Kantenpixel kippen nur durch andere Kantenglättung (WebKit 0,12 %) ✓ |
| B1 Spitzen | freie Spitzen zwischen exakt und flüssig höchstens 0,19 Bildpunkte versetzt ✓ |
| B2 Weiß ohne Schwarz | Kopf- und Körperdrehung nie mehr als an den gezeichneten Enden ✓ |
| B3 Ohrspalt | verjüngt sich richtig (offen am fernen Ohr, innen spitz), deckt sich aber nur zu 25 % mit Florians sichtbarem Keil ✗ → Etappe C morpht seinen Keil als Teil des Profils; der automatische Spalt bleibt Rückfall für wackelnde Ohren |
| B4 Tempo | Mac, 1000 × 1000, mit Warten in jedem Bild: Chrome 2,6–3,6 ms, WebKit 2–3 ms je Bild ✓; **iPhone: Florian misst** (Dauerlauf) |

## Offen

1. Florians Messung auf dem iPhone (Seite mit `--host`, „Dauerlauf“ einschalten, Zahl oben rechts).
2. Sein Blick auf exakt/flüssig: welche Stärken je Paar (Regler), wo flüssig zu viel (an Brust/Vorderbein schwillt es an, links am
   Hals kleine Beulen).
3. Körperdrehung: In der Front liegt eine Haarspitze von Kopfmaske A über dem Fenster des rechten Vorderbeins, im Logo das Fenster
   über der Spitze. Die Szene wechselt bei 45° (kleiner Sprung möglich). Frage an Florian, was vorn sein soll; regelt Etappe D.
4. Etappe C: Ansichten-Raster (Kopf und Körper 360°, Nicken), Florians Keil als Schlüssel, 45°/135° vorschlagen.

## Etappe C, erster Teil (18.11. abends, nach Florians Rückmeldung)

Florian (18.11.): Drehung noch nicht schön; beim Kopf der Bart kantig, die schwarze Outline wandert nicht verjüngt mit („in der
3/4-Pose siehst du, wie ich meine“); die Bohnenenden müssen bei der Drehung Breite und Winkel der Beine annehmen; Beine bekommen
(abgerundete) Kanten, die Bohnenenden gehen nicht perfekt in die Beine über. Neue Vorlagen: `ozzy_viertel.svg` (3/4, „nur
ungefähr“), `ozzy_sit01.svg` (Sitzen, Kopf vorn), `ozzy_st02.svg` (Sitzen, Kopf im Profil). Umbauen erlaubt, wo es sauberer wird.

- **Import** kennt neun Ansichten (`viertel`, `sitz1`, `sitz2` neu, Keile als `keilV`/`keilH`). Neu: Laufrichtung und Startpunkt
  werden angeglichen, wenn ein Teil gespiegelt kopiert wurde (Fenster links vorn in der Front, Rückansicht); verglichen wird ohne
  Drehung, nur bei wechselnder Haltung mit Drehung (sonst passte ein fast symmetrisches Fenster auch auf dem Kopf).
- **Raster** (`raster.ts`): Körper über ψ mit 0° Front, 45° 3/4, 90° Logo; Kopf über θ mit 0°, 45° 3/4, 90° Profil; PCHIP je
  Ankerkoordinate, Griffe nach Winkel und Länge; Kopf am Hals (Punkt im Raum) plus Versatz je θ. Verdeckte Schlüssel gebaut:
  Fenster rechts hinten vorn als Streifen an der Gipskante (Klemme 14), links vorn in der Seite ebenso, hinterer Keil klein im
  Hinterbein, Ohrspalt vorn unter dem nahen Ohr, Schwanz vorn hinter der Bohne.
- **Bohnenenden**: Anker 1 (Hinterteil unten) hängt an der linken Außenkante des äußersten Beins (Anker 7/8 des Gipses), Anker 5
  (Brust unten) an der rechten (Anker 1/2); Versatz und Winkelunterschied aus den drei Schlüsseln, dazwischen weich. Schalter
  „Bohnenenden an den Beinen“ in der Leiste zum Vergleich.
- **Renderer**: Weiß kann „hinter“ einem schwarzen Teil liegen und weich davor treten (`hinter`, `hinterTiefe`): Das Schwanzweiß
  liegt vorn hinter der Bohne und tritt zwischen 30° und 45° hervor (in Florians 3/4 liegt der Schwanz vorn).
- **Malreihenfolge**: Front und 3/4 wie gezeichnet (Haarspitzen über den Fenstern, das linke Vorderfenster in der Front über der
  Spitze von Maske B), in der Seite das rechte Vorderfenster über Maske A (Wechsel bei 22,5° und 67,5°).
- **Proben** (`2026-11-18-proben-abc.json`, Bilder `2026-11-18-c-*`): alle neun Vorlagen exakt; **C1: das Raster trifft an allen
  Schlüsselwinkeln Florians Vorlagen genau** (0,000–0,001 % deutlich abweichend); keine Weiß-Lecks; Spitzen unverändert.
  Tempo am Mac während Illustrator und Simulator liefen (Last 6–7): 5–6 ms je Bild (vorher ohne Last 2,5–3 ms).

Offen nach C, erster Teil: Rückseite (90° → 180°, Zuordnung der gespiegelten Rückteile prüfen), Nicken, Sitzen als Pose (Etappe D),
Florians Urteil zu den Zwischenwinkeln (zwischen 45° und 90° am Kinn kleine Kerben).

## Etappe C, zweiter Teil (18.11. spätabends, nach Florians zweiter Rückmeldung)

Florian (18.11., zwei Bildschirmfotos in [`rueckmeldung-2026-11-18/`](rueckmeldung-2026-11-18/)): „am Kopf entstehen ab 45 bis 100
Grad noch komische Zacken und Auswucherungen“; die kleine Wulst weg, die wächst, je mehr Bohne und Beine verschmelzen; das Weiß
des Schwanzes soll kleiner werden, wenn es hinter dem Kopf verschwindet, nicht abgeschnitten; „Das weiße vom vorderbein sollte mit
dem weiß vom kopf verschmelzen. das sollte in allen posen dann funktionieren. das weicht dann etwas von meiner vorlage ab.“; die
Verjüngung der Outlines im Gesicht, wo das Weiß aus dem Schwarz tritt, „muss super smooth sein“.

- **Wulst Bohne–Bein weg:** `sminN` im Renderer: weiche Vereinigung nach Kantenrichtung (k mal (1 − cos)/1,2 aus den Ableitungen
  der Felder). Laufen die Kanten in dieselbe Richtung (die Bohne fließt tangential ins Bein), wird nichts aufgetragen; in Ecken und
  über Lücken rundet sie voll. Gilt für alle schwarzen Paare. Bild `2026-11-18-c2-beine.png`.
- **Schwanzweiß schrumpft:** `SCHWANZ_WEISS` in `raster.ts` skaliert das Weiß um seine Mitte (0 bis 22°, wächst bis 42°), statt es
  hinter Bohne oder Kopf abzuschneiden. Bild `2026-11-18-c2-schwanz.png`.
- **Weiß verschmilzt (Bart mit den Fenstern der Vorderbeine):** Gruppe je Teil (`weissGruppe`: `bart`, `fenster` nur für `fensterRV`
  und `fensterLV`), Stärke `weissWeiss` (Regler „Weiß – Weiß“ 0–60, Standard 28). Jedes Teil geht so ein, wie es nach der
  Malreihenfolge sichtbar ist (später gezeichnetes Schwarz als Abstand abgezogen); das Fenster darf sich dabei bis 0,3 k unter
  Kopf, Ohren und Nase schieben, so trennen schmale Haarspitzen und der Rand der Maske nicht mehr. Dann einfache weiche Vereinigung
  (ohne Kantenrichtung, deren Ableitungen an Knicken der Felder rauschen: ausgefranste Kanten) und Kantenglättung nach dem Gefälle.
  Sie schließt Lücken unter k/2 (14 Einheiten): **beim Drehen** (Körper 45° bis 75°, Kopf 45° bis 60°: Lücken 8–12) fließt das
  Weiß wie ein Tropfen ins Bein; **die stehenden Vorlagen** (Lücken 16–30) bekommen nur kleine Rundungen; **im Liegen** verschmelzen
  Bart und Pfotenfenster ganz, in `lieg1` bleibt dabei die mittlere Kerbe des Barts als schwarzer Tropfen eingeschlossen (Florians
  Entscheidung, Bild `2026-11-18-c2-weiss-liegen-nah.png`). Unterschiedsbilder: nur zwischen Bart und Fenstern wird es weiß,
  nirgends schwarz (`2026-11-18-c2-weiss-unterschied-*.png`).
- **Tempo der Verschmelzung:** Die Stärke vergrößerte die Reichweite aller Abstandsfelder (R 40 → 88 Bildpunkte) und verdoppelte so
  die Zeit je Bild (Mac 3 → 6 ms). Jetzt hat jedes Teil seine eigene Reichweite (Attribut `reich` je Strecke): k + 4 Bildpunkte
  nur ab dem ersten verschmelzenden Teil der Malreihenfolge, sonst wie bisher; kodiert wird mit dem größten R. Bild unverändert,
  Kosten etwa +1 ms (3,0 → 4,0 ms in Chrome und WebKit ohne fremde Last).
- **Kopf, Zacken zwischen 45° und 90°:** Griffe, die zwischen zwei Schlüsseln mehr als 100° schwenken, werden geradlinig gemischt
  (über den Winkel schlugen sie einen Kreis: Haken). Fransenspitzen, die im 3/4 scharf nach außen zeigen und im Profil flach liegen
  (`bartB` 2, `kopfB` 2), werden zwischen 45° und 90° im Rahmen ihrer Nachbarn geführt (`spitzenFinden`, `spitzenFuehren`). Damit sind
  45° bis 60° ruhig. **Offen:** am Kinnband zwischen 63° und 78° kleine Haken und Stufen, neben der Nase zwischen 60° und 72° eine
  kleine Stufe, an der fernen Wange um 10° ein dünner Haken und um 30–35° eine kleine Stufe (`2026-11-18-c2-offen-kinnband.png`,
  `2026-11-18-c2-offen-wange.png`). **Ursache:** In Florians 3/4 liegt die Bartspitze vor ihrer Kerbe, im Profil liegen beide in
  umgekehrter Reihenfolge auf der Kinnlinie; fünf Stücke der fernen Seite kehren ihre Sehne zwischen zwei Schlüsseln um (`kopfB`
  4→5 zwischen 0° und 45°; `kopfB` 2→3, `bartB` 2→3, 4→5, 6→7 zwischen 45° und 90°), die Anker laufen aneinander vorbei. Dazu
  haben seine Pfade viele Eckpunkte mit nur einem Griff (der andere hat Länge 0); deren Richtung dreht sich beim Mischen nicht mit.
- **Versucht und zurückgenommen** (je Bild geprüft, keiner hielt): umkehrende Stücke auf einen Punkt falten mit der Sehnenrichtung
  des Schlüssels (Kinn bei 69–78° glatt, aber eine schwarze Zacke neben der Nase bei 63–66°); nur die Stufe quer zur Kontur
  herausnehmen (Haarlinien, weil die inneren Griffe stehen blieben); die gemischte Sehne samt inneren Griffen bis zum Vorbeilaufen
  verkürzen (Zacke an der Nase) oder nur kurz davor (kein Unterschied); Eckpunkte mit Griff 0 unterwegs mit gemischter Richtung
  öffnen (neue Zacken an der Nase).
- **Vorschlag für die nächste Runde:** die Ursache in den Schlüsseln beheben statt beim Mischen: Im Profil liegen die betroffenen
  Anker auf einer glatten Strecke; sie dort längs der Strecke in die Reihenfolge des 3/4 legen (Form bleibt, nur die Lage der Anker
  ändert sich), dann kehrt sich keine Sehne mehr um. Oder Florian zeichnet einen Zwischenschlüssel um 67°.
- **Proben** (`2026-11-18-c2-proben.json`, Bilder `2026-11-18-c2-c-*`): A, B1, B2, C1 bestanden wie vorher. Tempo diesmal unter
  fremder Last (Illustrator, Photoshop, Simulator: Last 7): ohne Verschmelzung 7,6 ms, mit 9,0 ms je Bild.

Offen nach C, zweiter Teil: Florians Urteil zur Verschmelzung (Stärke, Tropfen im Liegen), Kinn und Wange der fernen Seite (siehe
oben), Rückseite 90° → 180°, Nicken, Sitzen als Pose (Etappe D), seine Messung auf dem iPhone.

## Etappe C, dritter Teil (18.11. nachts, nach Florians dritter Rückmeldung)

Florian (18.11.): „weiß weiß muss aus sein. der tropfen ins bein sieht doch nicht gut aus. kann aber das weiß vom bein mit dem
äußeren schwarz vom bein verschmelzen“, dazu eine Vorlage für 67°, „nur kurz in photoshop gemacht und nicht als svg“
([`vorlagen/ozzy_kopf67_florian.png`](vorlagen/ozzy_kopf67_florian.png): mein Bild der Kopfdrehung bei 67°, ferne Kopfseite
übermalt).

- **Weiß – Weiß aus** (Standard 0, der Regler bleibt zum Vergleich).
- **Weiß – Schwarz** (neu, Standard 8, Regler 0–30): Beinfenster geben dem Schwarz, das über ihnen gezeichnet ist (Haarspitzen der
  Maske, die Zickzacklinie über der Pfote im Liegen), weich nach (`smax(w, −ueber, k)` statt harter Kante): Die Haarspitze drückt
  sich als runde Delle ins Fenster. Es entsteht nirgends neues Weiß; an den Vorlagen ändern sich nur diese Stellen (Front, 3/4,
  Sitzen, Liegen, je unter 140 Bildpunkte bei 600 × 600). Bild `2026-11-18-c3-weiss-schwarz.png`.
- **Bauchspalt ohne Fransen:** Der helle Spalt unter dem Bauch war bei Kopf 60–67° oben ausgefranst. Ursache war die Vereinigung
  Kopf–Körper nach Kantenrichtung: Wo eine Haarspitze der Maske am Bauch endet, rauschen deren Ableitungen. Kopf–Körper vereinigt jetzt
  ohne Kantenrichtung; Nacken und Brust bekommen eine weiche Rundung in der Ecke, keine Wulst (Bohne–Bein bleibt nach Kantenrichtung).
- **Zwischenschlüssel 67° aus seiner Übermalung** (`vorlagen/zwischen.ts`, Skripte `scripts/ozzy-figur/zwischen67/`): seine Übermalung
  auf meine Darstellung gelegt (99,7 % Deckung, wo er nichts geändert hat), seine Kontur der fernen Bartkante gelesen, `bartB` neu
  gesetzt: Kerbe und Spitze der Franse tiefer, die Bartkante bis zur feinen Spitze des Bands an der Nase, darüber deckt der Bart die
  Maske (kein Haken mehr), Bézier-Stücke nach kleinsten Quadraten angepasst. Bei 67° deckt sich das Bild jetzt mit seiner Übermalung
  bis auf die Spitze der Stirnfranse (bei ihm etwas länger). Für Teile mit einem Zwischenschlüssel zwischen 45° und 90° ist die
  Spitzenführung aus.
- **Faltschlüssel** (verborgen, `faltSchluessel` in `raster.ts`): Kehrt ein Stück zwischen zwei Schlüsseln seine Sehne um (mehr als
  135°), wird zum Zeitpunkt der kürzesten gemischten Sehne ein Schlüssel eingesetzt, in dem es sich auf einen Punkt zusammengezogen
  hat (äußere Griffe auf eine gemeinsame Tangente). Davor und danach mischt alles wie sonst. Eingesetzt: `bartB` bei 79,4° (die
  Franse und das Paar 4/5 zwischen 67° und 90°), `kopfB` bei 20,3°. Anders als das Falten beim Mischen (vierter Versuch der letzten
  Runde) ist das ein fester Schlüssel: Die Bewegung davor und danach bleibt die gemischte.
- **Ergebnis am Kinn:** Von 63° bis 90° läuft das Band glatt, die Franse schrumpft gleichmäßig und zieht sich bei 79° in die Kontur
  zurück (`2026-11-18-c3-kinnband.png` gegen `2026-11-18-c2-offen-kinnband.png`; `2026-11-18-c3-kinn.png`; Abgleich mit seiner
  Übermalung `2026-11-18-c3-vergleich67.png`). An der Nase bei 75–87° nur noch Kantenpixel.
- **Offen:** die ferne Wange zwischen 0° und 45° (dünner Haken um 10°, kleine Stufe um 25–35°, `2026-11-18-c3-offen-wange.png`):
  ginge auf demselben Weg, wenn Florian eine Übermalung um 22° macht; die Spitze der Stirnfranse bei 67°.
- **Proben** (`2026-11-18-c3-proben.json`, Bilder `2026-11-18-c3-c-*`): A, B1, B2, C1 bestanden. Tempo unter fremder Last
  schwankend (Last 7–8); Weiß – Schwarz kostet messbar nichts.

## Etappe D, erster Teil (D1): Haltungen Stehen, Sitzen, Liegen (18.11. nachts)

Florian: „Erst weiter mit D“ (die ferne Wange zwischen 0° und 45° wartet). Plan für D in
[`docs/plans/2026-11-18-ozzy-figur.md`](../../plans/2026-11-18-ozzy-figur.md), Abschnitt 12.

- **Befund vorab** (Messung an seinen sechs Seitenvorlagen): Der Kopf hat in allen Haltungen genau dieselbe Form, er sitzt nur woanders
  (einzige Ausnahme: die Maske im Liegen, Abweichung 13 bzw. 5). Der Schwanz dreht starr (−22° Sitzen, +12° Liegen). Die Vorderbeine
  bleiben beim Sitzen gleich, die Hinterbeine klappen um etwa 90°, beim Liegen alle vier; dazu Formänderungen bis 28. Die Bohne kippt
  9–12° und verformt sich stark. In seinen beiden Liegevorlagen ist die Bohne verschieden gekippt (−9° vorn, −5° Profil).
- **Haltungen** (`haltung.ts`, im Raster über `Lage.haltung`, nur mit ψ = 90): Jedes Körperteil hängt an einem Knochen (Drehpunkt:
  oberes Ende des Beins, Schwanzwurzel, Mitte der Bohne; Winkel und Lage des Drehpunkts je Haltung aus einer starren Anpassung an
  seine Zeichnung); was danach fehlt, ist eine Korrekturform im Knochen (dreht mit). Gemischt werden Winkel, Lage und Korrektur
  (PCHIP über die Haltung). Fenster und Keile hängen am Knochen ihres Beins, das Schwanzweiß am Schwanz. Zwei Reihen (Kopf vorn:
  Logo, sit01, laydown01; Kopf im Profil: stand02, st02, laydown02), nach dem Kopfwinkel gemischt. Der Kopf wandert mit (Versatz je
  Haltung und Reihe), dazu die kleinen Korrekturen der Maske. Teile, die in einer Haltung fehlen (hinterer Keil im Sitzen, Keile im
  Liegen), ziehen sich auf ihren Drehpunkt zusammen.
- **Lage der Haltungen zueinander** (seine Zeichenflächen sind verschieden groß): Beim Hinsetzen bleiben die Vorderpfoten stehen
  (Vorderbein rechts deckt sich), beim Hinlegen bleibt das Hinterteil liegen (hinteres Ende der Bohne wie im Sitzen), alle auf dem
  Boden.
- **Malreihenfolge:** ab der Hälfte zur nächsten Haltung die seiner Vorlage; der Ohrspalt liegt dabei vorn direkt unter dem nahen Ohr
  (sonst sah man ihn im Sitzen als weiße Kerbe im Ohr).
- **Schwanzweiß hinter der Bohne:** Liegt der Schwanz hinter der Bohne (beim Hinlegen wandert er von unten nach oben), wird sein Weiß
  kleiner, je tiefer seine Mitte hinter dem Umriss steckt (`weissHinterSchwarz`), statt durchzuscheinen.
- **Seite:** Szenen „Hinsetzen, Hinlegen“ (`?szene=haltung`) und „Hinsetzen, Kopf im Profil“ (`haltungP`); der Regler zeigt 0 Stehen,
  1 Sitzen, 2 Liegen. Rote Vorlage darüber an den Haltungen.
- **Proben** (`2026-11-18-d1-proben.json`, Bilder `2026-11-18-d1-*`): an den vier Haltungsvorlagen exakt (0,000–0,007 % deutlich);
  kein Weiß außerhalb des Umrisses; Tests `haltung.test.ts` (Anker für Anker exakt; Vorderpfoten bleiben beim Hinsetzen stehen, das
  ferne Vorderbein ist im Sitzen 0,45 Einheiten anders gezeichnet). Übergang Bohne–Bein beim Hinsetzen ohne Kante
  (`2026-11-18-d1-huefte-hinsetzen.png`).
- **Offen, sein Urteil:** Vom Sitzen ins Liegen schwenkt das Hinterbein durch die Senkrechte (es zeigt im Sitzen nach vorn, im Liegen
  nach hinten): Ozzy kniet kurz (um 1,5, `2026-11-18-d1-huefte-hinlegen.png`). Alternativen: direkt vom Stehen hinlegen, oder das
  Hinterbein in die Tiefe drehen (schmal werden und hinten wieder aufgehen). Kleiner Rest: Beim Hinsetzen schließt sich der Spalt
  zwischen den Beinen mit einem winzigen hellen Punkt (um 0,3).
- **Noch nicht:** Haltung zusammen mit Körperdrehung (ψ ≠ 90), D2 (Beine mit zwei Knochen für den Gang), D3 (Strecken, Ducken,
  Ausdruck).

## Etappe D, zweiter Teil: Haltungen frei und weich ineinander, Steuerung (18.11. nachts)

Florian: „er soll beides können. alle posen müssen smooth ineinanderlaufen. das system muss sehr stabil und robust sein.“ – „Die
beine dürfen auch nicht durch den boden drehen. Es muss immer smooth sein und immer physikalisch korrekt. Aus dem stehen kann er
einfach alle viere von sich strecken und auf den bauch rutschen. beim hinsetzen erst das hintere bein krümmen und dann nach vorne
rausstrecken.“ – „vom sitzen ins liegen soll sich das hintere bein zur kamera in einer fake 3d drehung nach hinten drehen.“ Plan:
Abschnitt 12a. Ersetzt aus dem ersten Teil: die feste Kette, das Zusammenziehen fehlender Teile auf den Drehpunkt und den harten
Wechsel der Malreihenfolge; die offene Frage zum Knien ist mit der Drehung zur Kamera beantwortet.

- **Raum aus Gewichten** (`haltung.ts`): Stehen, Hocke, Sitzen, Liegen. Jede Mischung (Summe 1) hat genau eine Gestalt, an den
  Vorlagen genau seine Zeichnung. Die **Hocke** ist gebaut: 40 % auf dem Weg zum Sitzen, die Hinterpfoten bleiben stehen, die
  Hinterbeine krümmen sich. Wege (`weg`): Hinsetzen und Aufstehen über die Hocke, Stehen ↔ Liegen und Sitzen ↔ Liegen direkt.
- **Beine mit Rückgrat** (Hermite-Kurve Hüfte → Fuß, Richtung an Hüfte und Sohle). Die Richtung wird als Einheitsvektor gemischt:
  Bis gut 98° dreht das Bein in der Bildebene (Spreizen beim Hinlegen). Heben sich die Richtungen auf (Hinterbein im Sitzen vorn, im
  Liegen hinten), zeigt es zur Kamera und wird kurz. Sein Weiß verschwindet (unter 0,45 der Länge ganz), die Seitenansicht läuft
  auch quer in eine runde Sohle ein (Mitte der Fußkappe, wächst mit 1 − kurz²). So dreht sich das Hinterbein zur Kamera nach hinten.
- **Boden:** Kein Fuß geht unter den Boden (Grenze nach Dicke und Neigung der Sohle; an den Vorlagen so tief, wie er gezeichnet
  ist). Der tiefste Punkt liegt in jeder Mischung auf dem gemischten Boden der Vorlagen.
- **Knochenkette:** Beine, Schwanz und Kopf hängen an der Bohne (gemischt in ihrem Knochen, mit ihr gedreht), damit sich zwischen
  zwei Vorlagen keine Hüfte vom Körper löst. Was in den gemischten Haltungen an derselben Stelle steht (Vorderpfoten, Schulter beim
  Hinsetzen), bleibt dort (Streuung unter 4 Einheiten): Die Vorderpfoten wandern beim Hinsetzen 0,02.
- **Fehlende Teile** (Keile zwischen den Beinen) ziehen sich auf den ersten 30 % des Wegs auf die Achse ihres Beins zurück. Vorher
  wanderte der hintere Keil zur Hüfte, quer durchs Weiß des Beins.
- **Weiche Malreihenfolge** (`Haltungen.deckung`, Renderer `deckung`): Jedes schwarze Teil deckt ein weißes nach dem Anteil der
  Haltungen, in denen es darüber liegt. Dazwischen schiebt es sich von innen über das Weiß (Kinn über das Pfotenfenster beim
  Umlegen), statt beim Wechsel der führenden Haltung umzuklappen. Gerechnet wird nur, wo Weiß liegt; so bleibt es bei rund 3 ms je
  Bild wie an den Vorlagen.
- **Steuerung** (`steuerung.ts`, Szene „Ozzy steuern“, `?szene=steuern`): Knöpfe Stehen, Sitzen, Liegen (Tasten 1, 2, 3), Regler
  Kopf (0–90°) und Tempo. Ein Leitpunkt fährt den Weg ab (weich an und ab, ohne an der Hocke anzuhalten); die Gewichte folgen ihm an
  einer kritisch gedämpften Feder. Ein Knopf mitten im Wechsel geht von dort weiter, wo Ozzy gerade ist, und behält den Schwung,
  soweit er in die neue Richtung zeigt. Am Ziel rastet er genau ein (Vorlage exakt). Prüfhaken `steuern`, `steuerKopf`,
  `steuerSchritt`, `steuerZustand`.
- **Szenen zum Prüfen:** „Hinsetzen“ (über die Hocke), „Hinlegen (direkt)“, „Vom Sitzen hinlegen“, dazu die Ketten „Sitzen, dann
  Liegen“ (vorn und im Profil).
- **Prüfungen:** `haltung.test.ts`: Vorlagen Anker für Anker; 150 zufällige Mischungen mit Kopfwinkel endlich und auf dem Boden;
  sechs Wechsel bei Kopf 0°, 45° und 90° stetig (kein Anker springt mehr als 6 je 1/200 des Wegs); weiche Reihenfolge nur zwischen den
  Vorlagen; Vorderpfoten stehen. `steuerung.test.ts`: Hinsetzen über die Hocke und genau am Ziel; alle Wechsel, Unterbrechungen und
  300 zufällige Klicks ohne Sprung (höchstens 0,023 Gewicht je Bild) und ohne Ruck. Proben (`proben.mjs`): A, B1, B2, C1 bestanden
  wie bisher, neu **D2** (kein Bildsprung an Anfang, Ende, Hocke und Wechsel der führenden Haltung: überall 0 Bildpunkte). Tempo im
  Wechsel 2,8–3,1 ms (Chrome), 3 ms (WebKit). Bilder `docs/progress/ozzy-figur/2026-11-18-d-*`.
- **Kleine Reste (sein Auge entscheidet):** Beim Umlegen schließt sich der Spalt zwischen Kinn und fernem Vorderbein von außen; ein
  kleines Weiß bleibt kurz eingeschlossen und schrumpft wie eine Luftblase (um 30–40 % des Wegs). Das Weiß des Hinterbeins wird beim
  Wegdrehen und Wiederkommen kurz zum Punkt (um 30 % und 70 %).
- **Noch nicht:** Haltung zusammen mit Körperdrehung (ψ ≠ 90), D2 (Gang), D3 (Strecken, Ducken, Ausdruck).

## Etappe D, dritter Teil: Abläufe mit Charakter (19.11.)

Florian (19.11.): „Erstmal musst du das sitzen und liegen und vor allem das liegen aus dem sitzen und umgekehrt anpassen. Es sieht
nicht gut aus! Vor allem die drehung des hinterbeins.“ Zwei Arten Hinsetzen (mit Hüpfer auf den Hintern; wie bisher, aber deutlich
gebogen, erst am Boden nach vorn strecken), Rutschen feilen, gemütlich hinlegen, vom Sitzen ins Liegen vorn runtergleiten, Hintern
hoch, Hinterbein gebogen aufstellen, nach hinten durchrutschen; „witziger und schöner“. Plan: Abschnitt 12b. Die Drehung des
Hinterbeins zur Kamera kommt auf keinem Weg mehr vor (nur noch Rückfall für freie Mischungen, ab 120° Unterschied).

- **Bein biegt sich mit fester Länge** (`rueckgratBauen`): Bézier von der Hüfte zum Fuß nach Bogenlänge abgelaufen; ist der Abstand
  kürzer als das Bein, werden die Griffe in gedämpften Schritten länger, bis die Länge stimmt, und die Biegung wird sanft
  zurückgenommen, je näher sie dem Falten kommt (Knick der Abtastung je Länge, Umkehr zählt als starker Knick). Alles ohne
  Verzweigung, damit das Ergebnis stetig mitwandert. Biegung und Sohle gelten gegen die Linie Hüfte–Fuß, wie sie nach Stehenbleiben
  und Boden wirklich liegt.
- **Zwei gebaute Haltungen** (`zwischenhaltungenBauen`): *tiefe Hocke* (Körper, Kopf, Schwanz wie im Sitzen: Hintern am Boden;
  Hinterbeine mit der Hüfte am Körper wie im Stehen, Pfote 22 vor der Hüfte, kräftig gebogen, Knie nach vorn, Sohle flach) und
  *Diener* (Bohne um die Hüften der Vorderbeine gekippt, bis die Hinterbeine bei 0,76 ihrer Länge leicht gebogen stehen; Vorderbeine
  und Kopf wie im Liegen, nach vorn gestreckt; Schwanz 20° hoch). Ein Teil ist dort nur da, wenn es in beiden Ausgangshaltungen da
  ist (der Keil zwischen den Hinterbeinen zieht sich so schon beim Einknicken zurück). Malreihenfolge: Hocke wie Sitzen, Diener wie
  Liegen.
- **Abläufe** (`ablauf.ts`): Folge von Abschnitten (Ziel, Dauer, Zeitkurve weich/fallen/auf/linear) mit Zusatzbewegungen: Hüpfer
  (Drehung um die vorderste Pfote am Boden, Bogen in der Zeit), Aufprall (Stauchen am Boden mit gedämpfter Schwingung, der Kopf
  federt nach), Seufzer (langsames Stauchen, Kopf sinkt nach), Wedeln (3 Hz). Reine Funktion der Zeit; als Szenen ohne Feder
  (`hinsetzen`, `huepfer`, `rutschen`, `gemuetlich`, `umlegen`, `aufsetzen`, `aufstehen`, `aufstehenSitz`; ▶ spielt sie in echter
  Zeit). Zeiten bei Tempo 1: Hinsetzen 1,2 s, Hüpfer 0,54 s + 0,7 s Nachfedern, Rutschen 0,8 s + 0,7 s, gemütlich 2,1 s + 1,1 s,
  Umlegen 1,4 s + 0,6 s.
- **Steuerung** (`steuerung.ts`): fünf Knöpfe (Stehen, Sitzen, Sitzen mit Hüpfer, Liegen rutschen, Liegen gemütlich; Tasten 1 bis 5),
  Kopf, Tempo. Sie spielt den Ablauf von der Haltung, die gerade führt, ab dem Leitpunkt; die Gewichte folgen an der Feder;
  Zusatzbewegungen eines unterbrochenen Ablaufs klingen in 0,25 s aus.
- **Prüfungen:** 44 Tests (`haltung.test.ts`: Vorlagen exakt, zufällige Mischungen auf dem Boden, neun Wechsel stetig, alle acht
  Abläufe in 1/240-Sekunden-Schritten stetig und nichts im Boden, Ende genau in der Zielhaltung; `steuerung.test.ts`: Hocke im
  Hinsetzen, Hüpfer hebt ab und plumpst, alle Wege genau am Ziel, Unterbrechungen und 300 Zufallsklicks ohne Sprung). Proben A, B1,
  B2, C1 bestanden wie bisher; D2 jetzt je Ablauf an Anfang, Ende, Grenzen und Mitten der Abschnitte mit zwei Schrittweiten (bei
  1/4000 überall 0 Bildpunkte). Tempo 2,5–3 ms je Bild. Bilder `docs/progress/ozzy-figur/2026-11-19-d-*.png`, Video
  `2026-11-19-d-ablaeufe.mp4` (alle Abläufe nacheinander, echte Zeit).
- **Kleine Reste (sein Auge entscheidet):** Beim Hüpfer kippt der Kopf mit der Drehung um die Vorderpfote leicht nach vorn (bis rund
  40 Einheiten am höchsten Punkt). In der tiefen Hocke ist das Hinterbein zum Teil vom Körper verdeckt, die Biegung liest sich vor
  allem auf dem Weg dorthin. Zahlen (Biegung, Höhe im Diener, Zeiten, Stärke von Aufprall und Wedeln) sind Konstanten am Kopf von
  `haltung.ts` und `ablauf.ts`.

## Etappe D, vierter Teil: stärker gebogen, Kopf im Sitzen zurück, nichts rutscht (19.11. vormittags)

Florian (19.11.): „bein stärker biegen, und achte darauf dass die weiße fläche am bein immer etwa das gleiche volumen hat. Kannst du
beim sitzen den kopf etwas weiter zurück machen? … Die beine rutchen bei manchen animationen weil die posen verschiedenen
positionierungen haben.“ Plan: Abschnitt 12c.

- **Bein stärker gebogen, das Weiß bleibt gleich groß:** Ist das Rückgrat kürzer als das Bein, wird das Bein nicht gestaucht oder
  verbreitert, sondern liegt von der Sohle aus in voller Länge auf dem Rückgrat; der Rest schiebt sich in den Körper (`beinOrt`). Das
  Fenster behält Form und Fläche. In der tiefen Hocke biegt sich das Hinterbein mit der Ferse nach hinten (`HOCKE_BIEGUNG` −1), der
  Körper geht 28 hinter das Sitzen (`HOCKE_ZURUECK`): Der Hintern landet hinter den Pfoten. `rueckgratBauen` nimmt die Biegung
  zurück, bis die Kurve nicht faltet (`FALTEN` 1, sonst schneiden die inneren Kanten schwarze Spitzen ins Weiß).
- **Kopf im Sitzen 18 zurück und 4 tiefer** (`KOPF_SITZEN`, Kopf vorn und im Profil): Nur zurück stand die Ohrwurzel knapp neben dem
  Rücken, dazwischen blieb eine feine weiße Sichel; mit 4 tiefer geht der Kopf auf dem Hals nach hinten wie bei einer Drehung um die
  Schultern. Rote Vorlage und Probe C1 zeigen seine geänderte Vorlage (`kopfVersatzVorlage`; C1 verschiebt die Kopfpfade im SVG).
  Bild `2026-11-19-e-kopf-sitzen.png` (links seine Vorlage, rechts neu; oben Kopf vorn, unten im Profil).
- **Nichts rutscht, was stehen soll:** Jeder Abschnitt eines Ablaufs nennt, was dort steht (`steht`: Vorderpfoten, Hinterpfoten,
  alle, oder der Hintern). Ozzy verschiebt sich je Abschnitt als Ganzes um das, was dieser Ort sonst wanderte (`ankerX` in
  `haltung.ts`, Effekt `versatz` aus `ablaufBei`). Seine Vorlagen liegen verschieden (die Hinterpfoten im Sitzen weit vorn, im
  Liegen weit hinten); dagegen hilft nur das. Zuordnung: Hinsetzen (Hocke auf den Hinterpfoten, Sitzen auf dem Hintern), Hüpfer
  (Ausholen auf allen, Sprung auf den Vorderpfoten), Rutschen (alle, sie rutschen mit Absicht weg), gemütlich (Diener auf den
  Hinterpfoten, Liegen auf den Vorderpfoten), Umlegen (Diener auf dem Hintern, Liegen vorn), Aufsetzen (Diener vorn, Hocke hinten,
  Sitzen Hintern), Aufstehen (Diener vorn, Stehen hinten), Aufstehen aus dem Sitzen (Hocke Hintern, Stehen hinten).
  - **Vorderpfoten machen einen Schritt:** Vom Hintern aus stehen sie im Sitzen 28 weiter hinten als in der Hocke. Sie heben sich
    deshalb in der Hocke um 10 (`HOCKE_HEBEN`, das Gewicht ist hinten) und setzen den Weg zum Sitzen in der Luft.
  - **Steuerung:** Das Bild folgt Ozzy (Zeitkonstante 0,9 s), der Boden hat Marken alle 40 Einheiten. Die Verschiebung kommt aus dem
    Ablauf am Leitpunkt und läuft an derselben Feder wie die Gewichte; die Zusatzbewegungen kommen um die Verzögerung der Feder
    (2/feder) später.
  - Im reinen Stehen gelten die Zusatzbewegungen jetzt auch (vorher sprang Ozzy am Ende vom Aufstehen um 22 bis 28 zurück).
- **Gemessen:** Was stehen soll, bleibt auf 0,5 genau stehen, solange es den Boden berührt (alle Abläufe außer Rutschen). Was sich
  bewegen soll, geht weiter über den Boden: das Hinterbein, das sich beim Hinsetzen nach vorn streckt (rund 75), beim Aufsetzen unter
  den Körper kommt (rund 100) und beim Umlegen nach hinten durchrutscht, die Vorderpfoten beim gemütlichen Hinlegen und Umlegen nach
  vorn. Diese Wege könnten als kleine Schritte in der Luft gehen (sein Wort).
- **Prüfungen:** 52 Tests (neu: in jedem Abschnitt rutscht nicht, was stehen soll; Kette Stehen–Hocke–Sitzen mit gehobenen
  Vorderpfoten; Steuerung mit Ankern: Verschiebung wie im Ablauf, weich, Hinterpfoten stehen beim Einknicken). Proben A, B1, B2, C1
  (Sitzen gegen die geänderte Vorlage), D2 bestanden, Tempo 2,6–3 ms je Bild (`2026-11-19-e-proben.json`). Bilder
  `2026-11-19-e-<ablauf>.png` (Boden rot, Marken in der Welt blau), Video `2026-11-19-e-ablaeufe.mp4`.
- **Größen seiner Vorlagen (gemessen, nicht angeglichen):** Kopf, Ohren und Schwanz sind überall gleich groß. Die Beine im Liegen
  sind 9 bis 15 % größer (Fläche) als im Stehen, das nahe Hinterbein im Sitzen 21 %; die Fenster im Liegen bis 150 %, im Sitzen 118
  bis 123 %; die Bohne im Sitzen 83 %, im Liegen 109 %. Beim Wechsel wachsen und schrumpfen sie deshalb. Angleichen nur auf sein Wort.

## Beweis 3D: Ozzy als Körper aus seinen Zeichnungen (19.11. mittags)

Florian (19.11.): „ich spreche von der 360 grad drehung. Es kann eigentlich nicht sein dass wir jetzt tage an so einfachen
animationen … rumdoktorn … verdacht dass … wir für jeden übergang eine extra animation brauchen“. Diagnose und Vorschlag:
[`docs/plans/2026-11-19-ozzy-figur-3d.md`](../../plans/2026-11-19-ozzy-figur-3d.md); er: „Ja, 3D-Beweis“. Am 2,5D-Körper wird nicht
weitergebaut, bis er entscheidet.

- **Seite** `apps/editor/ozzy-raum.html` (Port 5213 wie die Figur): Winkel 0–360°, „Drehen ▶“, Knöpfe je 45°, Florians Zeichnung rot
  darüber (0°, 45°, 90°, 180°, 270°). Schalter: `?weiss=0` nur die schwarze Form, `?bunt=1` Teile farbig, `?sicht=0` ohne
  Sichtbarkeit, `?weissArt=fest` Weiß als feste Bemalung (Versuch, schlechter), `?h=` Rasterweite des Netzes, `?k=` Rundung.
- **Körper** (`raum/koerper.ts`): jedes Teil (Bohne, Kopf mit Bart, Nase, Ohren, Beine, Schwanz, Keile) aus Front (X, Y) und Seite
  (Z, Y): innen, wo beide Umrisse innen sind, je Höhe ein elliptischer Querschnitt im Rechteck der beiden Intervalle (eines je Zeile:
  die Hülle; Kerben schneidet der Umriss als Rille ein), in der Höhe geglättet (σ 4). Teile weich vereinigt (k 3). Paarteile sind in Z
  gleich (das nahe Teil der Seite); die fernen schauen beim Blick von der Seite vor, wie Florian sie zeichnet (`PaarKarte`: Rechteck
  des nahen auf das des fernen abgebildet, mit sin²ψ). Schwanz und hinterer Keil nehmen ihre Breite aus der Rückansicht.
- **Netz** (`raum/netz.ts`): Surface Nets auf 2,5 Einheiten (grob nach fein), Ecken mit Newton auf die Fläche, Normalen aus dem
  Abstandsfeld; rund 100 000 Ecken, gebaut im Worker in gut 2 s.
- **Weiß** (`raum/masken.ts`, `raum/zeichner.ts`): je Ansicht (Front, Seite, Rücken; links = Seite gespiegelt) das sichtbare Weiß
  seiner Zeichnung als Abstandsfeld. Der Zeichner (three.js, flach, ohne Licht und Outline) mischt die beiden nächsten Ansichten nach
  dem Winkel, jede nur, wo sie die Fläche sieht (je Schlüsselansicht ein Tiefenbild wie bei Schatten, Abstand wächst mit der Schräge,
  vier Proben) und gewichtet nach der Richtung der Fläche (Front auf seitlichen Flächen zog Streifen).
- **Probe** (`scripts/ozzy-figur/raum-probe.mjs`, Ergebnis `2026-11-19-raum-probe.json`): Deckung 0° 98,7 %, 90° 96,1 %, 180° 90,5 %;
  Tempo Chrome 2,6 ms, Safari 2,0 ms je Bild. Bilder `2026-11-19-raum-ansichten.png` (3D neben seinen Zeichnungen), `-deckung.png`,
  `-umlauf.png` (20°-Schritte), `-bildfolge.png` (5°), Video `-umlauf.mp4`.
- **Was trägt:** Umriss und Drehung (0–360° ohne Haken und Stufen), Front und Seite seiner Zeichnungen, Tempo.
- **Was nicht trägt:** das Weiß zwischen den Ansichten (zwei Zeichnungen legen verschiedenes Weiß an dieselbe Stelle, gemischt wird
  es unruhig) und der Rücken (seine Rückansicht ist kein Spiegelbild der Front). Weiterer Weg: das Weiß einmal im Raum festlegen
  (auf den Körper gemalt, etwa in Blender auf diesem Netz, oder je Merkmal aus einer Ansicht), die Rückansicht als Spiegel der Front.

## Rohmodell aus Blender (19.11. nachmittags)

Florian zum Beweis 3D: „das schlechteste aus beiden welten … ein völlig zerrissenes 3d model“. Dann: „Ja blender klingt besser. das
weiß kann auch gerne aus einem shader kommen. Im gesicht vllt nicht aber am körper bzw den beinen schon. Die ansichten sind nicht
100%ig exakt. es sind recht schnelle drafts gewesen“. Plan: Abschnitt 7 von `docs/plans/2026-11-19-ozzy-figur-3d.md`.

- **Bauen:** `/Applications/Blender.app/Contents/MacOS/Blender -b --factory-startup --python tools/ozzy-figur/ozzy_roh.py --
  docs/look/ozzy-figur/3d` (rund 2 s; Blender muss nicht offen sein). Schreibt `ozzy-roh.blend` und `ozzy-roh.glb`, druckt die Maße
  jedes Netzes in Figur-Einheiten (Zeilen `MASS`).
- **Maße** stehen als Zahlen am Kopf des Skripts (Bohne, Beine, Schwanz, Kopf, Nase, Ohren), gelesen aus seinen Zeichnungen Zeile für
  Zeile (Skript der Messung im Verlauf: Breiten je Höhe in Front, Seite, Rücken).
- **Seite** `ozzy-3d.html` (Port 5213): Winkel, „Drehen ▶“, Regler „Fenster“, seine Zeichnung rot darüber. Prüfhaken `__ozzy3d`
  (`zeigen`, `bild`, `vergleich`, `tempo`).
- **Weiß:** Beine und Schwanz per Shader (Weiß, wo die Fläche zur Kamera schaut; Gewicht aus der Eckfarbe „fenster“, die das Skript aus
  dem Abstand zu Beinen und Bohne setzt; Sohle schwarz). Gesicht: seine Frontzeichnung fest aufgemalt, scharfe Kanten, nie bis an den
  Umriss.
- **Stand:** Front 79 %, Rücken 85 % Deckung; von der Seite fehlt der weiße Bart an der Wange (Seite 50 %). Dreht ohne Risse. Bilder
  `docs/progress/ozzy-figur/2026-11-19-3d-vergleich.png`, `-umlauf.png`, Video `-umlauf.mp4`.
- **Bart als eigene Form** (sein Wunsch): Jede Fläche des Kopfes nimmt die Zeichnung, zu der sie schaut (Front bis etwa 53°, dahinter
  die Seite, scharfe Grenze; `?gesicht=kante`, Versuche `schnitt`, `mischen`, `front`). Front 77 %, Seite 61 %, Rücken 83 %. Rest: bei
  50–60° eine senkrechte Kante an der Braue. Bilder `2026-11-19-3d-bart-*`, Plan Abschnitt 7a.
- **Metaball-Fallen:** Blender begrenzt `size_x/y/z` auf 20 (größte Achse über den Radius, die anderen als Anteil). Sichtbarer Radius
  einer Kugel = 0,5748 × Radius bei Schwelle 0,6 und Steifheit 2. Bei Kapseln ist `size_x` die halbe Länge (absolut). Metaballs mit
  demselben Grundnamen verschmelzen über Objekte hinweg (Koerper und Kopf getrennt halten).

## Modell aus der Front aufgeblasen (19.11. nachmittags; Kopf zuerst)

Florian zum Rohmodell: „Es soll schon genau wie mein logo sein … so sieht es garnicht gut aus! kein bisschen“; dann: „ich habe keine
projektion gezeichnet. Front ist am wichtigsten. seite und 3/4 sind angenähert...das musst du eben auch machen. Ich verlange ja nicht
dass es es 100% trifft. aber es war ja komplett daneben und unschön“. Plan: [`docs/plans/2026-11-19-ozzy-modell.md`](../../plans/2026-11-19-ozzy-modell.md).

- **Seite** `ozzy-modell.html` (Port 5213), Code `src/ozzy-figur/modell/`: `aufblasen.ts` (Poisson im Umriss, Tiefe je Zeile aus der
  zweiten Ansicht, Block, Surface Nets), `kopf.ts` (Stand 1: runder Kopf mit aufgemaltem Weiß, `?kopf=rund`), `bart.ts` (Stand 2:
  Bart als eigener weißer Block vor dem schwarzen Schädel, Standard). Prüfhaken `__ozzyModell` (`zeigen(ψ, b, h, nurKopf)`, `bild`,
  `vergleich(ψ, ansicht, b, h, spiegeln, mitZeichnung, ausrichten)`), Schalter `?schattiert=1` (Form mit Licht), `?umriss=1` (nur
  Silhouette), `?randFarbe=%23ff2020` (Rand rot), Zahlen des Barts als Adresse (`rundung`, `woelbung`, `flacher`, `naseVor`, …).
- **Probe** `node scripts/ozzy-figur/modell-vergleich.mjs <aus.png>` aus `apps/editor` (Server auf 5213): 3D, Zeichnung, Unterschied je
  Ansicht.
- **Stand 2:** Deckung nur Kopf, ausgerichtet: Front 92 %, 3/4 58 %, Seite 65 %, Rücken 90 %. Bilder
  `docs/progress/ozzy-modell/kopf-2-bart-vergleich.png`, Drehung `kopf-2-bart-drehung.mp4`. Körper, Beine, Schwanz noch nicht.
- **Offen (sein Auge):** Seine Seite zeigt den Bart rund 200 tief, sein 3/4 ein flacheres Gesicht; das Modell folgt der Seite.
- **Urteil Florian (19.11.) zu Stand 2:** „ups, das ist ni. Sieht ja wieder komplett anders ud ganz verzogen aus. Ich dachte das kannst du aber scheinbar siehst du niht wie es aussehen soll und machst das einfach nach deckungswerten...das ist ja überhaupt nicht aussagekräftig. Du kannst es nicht machen wenn du nicht verstehst wie es aussehen soll.“ Nicht weiterbauen. Vorschlag an ihn: Er formt Ozzy in Blender, ich bereite die Datei mit seinen Zeichnungen als Hintergrund und dem fertigen Look live im Fenster vor und übernehme danach Export, Look im Spiel, Skelett, Animation, Physik; oder 2D mit weiteren gezeichneten Zwischenansichten. Seine Wahl steht aus.

## Kopf dreht 360° in 2D (19.11. nachmittags)

Florian nach dem 3D-Modell: „versuch mal die 360 grad drehung vom kopf in 2d fertig zu machen. dann machen wir den körper. die ersten
90grad waren schon ganz gut. die brauchen nur feinschliff und waren der schwerste teil.“

- **Szene** „Kopf dreht 360°“ (`?szene=kopf360`, nur der Kopf; `t` 0 → 1 ist 0° → 360°). Bilder `docs/progress/ozzy-figur/2026-11-19-kopf360-blatt.png`
  (15°-Schritte), Video `2026-11-19-kopf360.mp4`.
- **Schlüssel** (`raster.ts`, Kopf über θ von 0° bis 360°, `Lage.theta` nicht mehr auf 90° begrenzt, `Lage.nurKopf`): 0° Logo, 45° 3/4,
  67° (Bart B, seine Übermalung), 90° Profil, **180° Rücken** (wie eingelesen: läuft gleichsinnig mit dem Profil; nach der Front
  umnummeriert fiel der Kopf bei 135° zu einem Streifen zusammen). **180°–360° gespiegelt:** je Teil die Schlüssel des Partners (A ↔ B)
  gespiegelt (`kopfGespiegelt`, die Nase umnummeriert), bei 360° wieder seine Front; Malreihenfolge der Kopfteile in der zweiten Hälfte
  A ↔ B getauscht; Versatz des Kopfs gespiegelt (`versatzBei`).
- **90° → 180° (ohne Zeichnung von ihm, gebaut):** Bart zieht sich bis 150° (fern bis 112°) auf einen Punkt am rechten Kopfrand zusammen,
  Nase gleitet an der Vorderkante der Schnauze (104°) dahinter und verschwindet (118°), Ohrspalt bis 140°; ferne Maske taucht im Kopf unter
  (102°), liegt zusammengeschoben im Kopf (112°) und wächst mit ihren Zacken zur linken Hälfte (140°); der Scheitel der nahen Maske
  wird bis 112° zur runden Wange; fernes Ohr früh hinter das nahe (105°). Bart bleibt dabei mit Rand 8 in seiner Maske (Klemme über
  den Träger, `BART_KLEMME`).
- **Verdecken 8 als Standard** (`REGELN.verdecken`; die Regel „abgewandte Seite wird verdeckt, nicht gequetscht“ vom 16.11.): zwischen
  den Schlüsselwinkeln behält die abgewandte Wange ihren schwarzen Rand (bei 10°–20° stach das Weiß sonst durch); an 0°, 45°, 90°, 180°
  ohne Wirkung. In der zweiten Hälfte liegt die abgewandte Seite links.
- **Geprüft:** an 0°, 45°, 90°, 180° deckt sich jeder Anker mit seiner Zeichnung (0,00); 52 Tests grün.
- **Offen:** Stirnfranse der fernen Seite bei 52°–82° (und gespiegelt 278°–308°): ein runder Knubbel an einem Stiel, in seiner
  Übermalung bei 67° eine dünne, spitze Locke → Zwischenschlüssel der fernen Maske bei 67° aus seiner Übermalung (Werkzeuge in
  `scripts/ozzy-figur/zwischen67/`). 90°–150° ist gebaut, nicht gezeichnet: eine Übermalung um 120° von ihm wäre der nächste Schlüssel.
  Danach der Körper.

### Zweite Fassung von 90° bis 180° (19.11. abends, nach Florians Rückmeldung)

Florian: „das weiß muss vor der linie bleiben und nur leicht verjüngen. Die nase muss hinter den kopf wechseln. Die barthaare links die
nach rechts rauswandern schrumpfen nicht so wie sie es beim drehen tun würden. Sie werden so komisch zur mitte rausgezogen“. Alle drei
Punkte lagen in 90°–180°: Die ferne Maske (der schwarze Untergrund der Schnauze) tauchte ab 90° unter, das Weiß davor verlor seinen
Grund, und die Klemme schnitt es am Scheitel der nahen Maske ab (eine Linie durchs Gesicht, bei 97° fein, dann dick); die Nase blieb
außen vor dem Kopf stehen; der Bart wurde zu einem Punkt rechts in der Mitte gezogen. Vorher/nachher:
`docs/progress/ozzy-figur/2026-11-19-kopf360-2-vorher-nachher.png`, Blatt `…-kopf360-2-blatt.png`, Video `…-kopf360-2.mp4`.

- **Nahe Maske um die Schnauze** (`schnauzenKurve`, Schlüssel `WICKEL` 96°–135°): Ihr Scheitel (Stück 8 → 0) liegt im Profil unter dem
  Weiß; bis 96° legt er sich unter dem Weiß um die ganze Schnauze (Umriss aus Bart A und B mit Rand 8 und der fernen Maske, eine Kurve nach
  kleinsten Quadraten, wo sie innen bliebe, nachgeschoben). Die ferne Maske bleibt bis 96° stehen und taucht erst dann unter (104°).
- **Gesicht dreht sich weg** (`wegGedreht`, Schlüssel `GESICHT_WEG` 100°–180° für Bart A und B, Maske bis 135°): mit dem Kosinus des Wegs
  schmaler (Barthaare werden kürzer wie bei einer Drehung), dabei an den rechten Rand des Rückens; im letzten Viertel klappt es in der Höhe
  dorthin, wo die nahe Maske im Rücken ihren rechten Rand hat (sonst schnitt deren steigender Unterrand den Bart waagerecht ab). Die
  Vorderkante der Schnauze bleibt fast stehen. Die Klemme (Bart in der nahen Maske) wirkt erst ab 96°, wenn die Maske ganz darum liegt,
  und wächst bis 150° auf 8: Das Weiß behält seinen Rand und läuft am Ende darin aus.
- **Nase:** wird bis 100° zur Spitze hin schmal (wie beim Wegdrehen) und liegt dann im schwarzen Rand der Schnauze; dort wechselt sie in der
  Malreihenfolge hinter das Weiß (nicht zu sehen), zieht sich verborgen zusammen und wächst im Kopf zur Nase des Rückens. Versucht und
  verworfen: weiche Malreihenfolge (`deckung`), die Nase löste sich von ihrem Rand her auf (kurz ein „V“).
- **Verdecken nur zwischen Front und Profil** (0°–90°, 270°–360°): Es zog an jeder äußeren Kante des Schwarz, auch an der, die die nahe
  Maske unter dem Weiß überstreicht (feine Linien bei 92°–94°).
- **Erste Hälfte unverändert** (`anschlussBauen`, `kopfVorn`): Die Mischung bei 45°–90° hängt am ersten Schlüssel hinter 90°. Mit den
  neuen Schlüsseln wäre die ferne Wange bei 60°–85° bis 15 schmaler und die Nase bis 11 verschoben gewesen. Die erste Hälfte (und gespiegelt
  270°–360°) mischt deshalb mit den ersten verborgenen Schlüsseln, mit denen Florian sie gesehen hat. Rest gegen den Stand c9b42b03: bis
  1,9 an Griffen der Masken (ob ein Griff über den Winkel oder geradlinig gemischt wird, entscheidet die ganze Liste), die Umrisse liegen
  übereinander.
- **Bart und Ohrspalt in der zweiten Hälfte** (`ohneRuecken`): Teile, die im Rücken fehlen, sind zwischen 180° und 270° das gespiegelte
  Gegenstück der ersten Hälfte. Sie wechseln bei 180° verborgen die Seite (gemischt wanderte der Bart bei 184°–190° quer über den Hinterkopf).
- **Geprüft:** an 0°, 45°, 90°, 180° jeder Anker 0,00; 52 Tests grün; keine Sprünge zwischen 88° und 272° (Schritte 0,5°, je vier Viertel).
  Anker der Kopfteile in Kopfkoordinaten: `npx vite-node scripts/ozzy-figur/kopf-daten.ts <θ,…>` (aus `apps/editor`).
- **Offen:** sein Urteil. Unten rechts bei 145°–160° kleine Stufen, wo die Zacken der nahen Maske zum Rand des Rückens hochwandern (gab es
  vorher auch). Die Schnauze ist ab 96° eine glatte Rundung (die Stirnfranse vorn verschwindet dort). Stirnfranse bei 52°–82° wie oben.

### Dritte Fassung nach Florians Skizzen (19.11. spätabends)

Florian zur zweiten Fassung: „Die ohren sollen nicht drehen. sie sind sillhouetten. es reicht wenn sie etwas schmaler und wieder breiter
werden. Das weiß muss über die schwarze outline laufen und smooth verschwinden wenn ozzy uns den hinterkopf zudreht. Die nase springt. Sie
muss schmaler werden und die form dann ausskalieren bevor sie hinter den kopf dreht wie ein realistischer 3d "knubbel". die barthaare
skaliere einfach nur klien und morphen nicht schön und realistisch beim hinterkopf zudrehen.“ Dazu Skizzen bei 6 %, etwa 36 % und 42 % der
Drehung (21,6°, ≈130°, ≈151°; `vorlagen/ozzy_kopf_skizze_*`): „wie das weiß durch die outline an dr wange bricht und wieder zurückkommt. es
sollen immer schöne verjüngungen ins weiß entstehen die smooth ein und auswachsen. nie eine durchgängige dünne outline.“ Und: „bei 36% könnte
sogar noch ein wenig der nase zu sehen sein bevor sie zum hinterkopf verschwindet. see muss smooth ausfaden“. Skizze, vorher und nachher je
Winkel: `docs/progress/ozzy-figur/2026-11-19-kopf360-3-skizzen.png`, Blatt `…-kopf360-3-blatt.png`, Video `…-kopf360-3.mp4`.

- **Durchbruch statt Verdecken** (Renderer, `Szene.durchbruch`, Regel `durchbruch` 8, Regler in der Leiste; `verdecken` jetzt 0):
  Schwarz zwischen dem Bart und dem Umriss, das dort dünner als 0,4 × 8 ist, nimmt das Weiß ganz; bis 8 nimmt es nur den inneren Teil (der
  Rand läuft spitz aus), dickeres bleibt. Dicke je Bildpunkt = Abstand zum Weiß + Abstand zum Umriss; Schwarz über dem Bart (Nase) bleibt. Nur
  zwischen den Schlüsseln (Gewicht |sin 4θ| zwischen Front und Profil, |sin 2θ| beim Wegdrehen): an seinen Zeichnungen ohne Wirkung. So bricht
  bei 6 % das Weiß an der fernen Wange durch, oben und unten läuft der Rand spitz aus. Stärke 12 nahm unten an der Wange zu viel.
- **Gesicht offen** (keine Klemme, kein Wickelrand mehr): Die Schnauze, wie er sie im Profil gezeichnet hat (Stirnfranse, offene Stirn,
  Nase, nach oben auslaufender Kiefer), wird als Ganzes schmaler (`wegGedreht`, `wegBreite`: cos(1,25 φ), bei 130° 0,66, bei 151° 0,23, ab
  162° 0), in voller Höhe, ihr rechter Rand bleibt der Rand des Kopfs. Als schmaler Streifen gleitet es über den Rand hinaus und liegt ganz
  weggedreht außerhalb beider Seiten des Rückens.
- **Nahe Maske übernimmt Stirnfranse und Kiefer** (Schlüssel `WICKEL` 96°–150°): Anker 8 wird die Spitze der Stirnfranse (erste Zeile, in
  der das Weiß die ferne Maske erreicht), Anker 0 die Kinnspitze (tiefster Punkt der fernen Maske); die Stücke 7 → 8, 8 → 0, 0 → 1 folgen dem
  Umriss aus naher Maske, ferner Maske und Weiß (`kurveDurch`, kleinste Quadrate), an der offenen Stirn 2 unter dem Weiß. Anker 8, 0 und 1
  gehen mit dem Gesicht (so bleibt der Kiefer unter dem Bart), die übrigen von 90° zum Rücken. Die ferne Maske taucht danach unter wie bisher.
- **Nase:** steht bis 94° (die erste Hälfte kommt im Profil zur Ruhe an), wird dann am rechten Rand schmaler und kleiner wie ein Knubbel
  (`NASE_FORM`: Breite 0,85/0,6/0,4, Höhe 0,97/0,85/0,65 bei 100°/115°/130°), ist bei 140° ein Punkt und liegt danach hinter dem Weiß. Vorher
  verlor sie gleich hinter 90° bis 4 Einheiten Breite je Grad und war bei 100° weg (der Sprung).
- **Ohren als Silhouetten** (`RUECKEN_OHR`, `RUECKEN_ANKER`): Das Ohr links im Profil bleibt links und wird das linke des Rückens, das
  mittlere wandert nach rechts; im Rücken tauschen die Ohren dafür ihre Rollen und laufen andersherum (Spitze zu Spitze, Ansatz zu Ansatz),
  das Bild des Rückens bleibt dasselbe. Jedes behält seine Lehne. Versucht und verworfen: Umklappen über die Breite 0 (jedes Ohr stand kurz
  als dünne Spitze über dem Kopf).
- **Erste Hälfte:** Formen wie im Stand 06c26dc9 (bei 0°–90° und 270°–360° jeder Anker gleich); geändert ist dort nur das Bild durch den
  Durchbruch.
- **Geprüft:** an 0°, 45°, 90°, 180° jede Form 0,00 (im Rücken die Ohren mit getauschten Namen); 52 Tests grün; keine Sprünge über die ganze
  Drehung (0,5°-Schritte, je vier Viertel). Proben: `scripts/ozzy-figur/teil-weg.ts` (Weg und Breite eines Teils je Grad),
  `scripts/ozzy-figur/zeilen.ts` (je Zeile die rechten Kanten von Weiß und Masken).
- **Offen:** sein Urteil. Stirnfranse bei 52°–82° wie oben. Unten rechts bei 145°–165° wandern die Zacken der nahen Maske weiter zum Rand des
  Rückens (kleine Stufen).

### Vierte Fassung nach den Skizzen bei 30 % und 40 % (19.11. nachts; zurückgenommen)

**Zurückgenommen** (Florian: „jetzt wurde es schlechter“, siehe fünfte Fassung); geblieben ist nur der Bildausschnitt.

Florian: „hier noch eine ergänzung für 30 und 40%. es wird schon deutlich besser. Die Ohren sollten auch etwas weiter zusammen sein von der
seite, dass der drehungseffekt besser wirkt. Feile weiter“ (Skizzen `vorlagen/ozzy_kopf_skizze_30prozent.png`, `…_40prozent.png`; 30 % = 108°,
40 % = 144°). Bei 40 % ist der Kopf schon der Rücken, nur unten rechts beißen Barthaare in den Umriss; seine ältere Skizze bei 42 % (ein Streifen
Gesicht am Rand) passt dazu nicht, gebaut ist nach der neueren. Skizze, vorher und nachher bei 108°, 129°, 144°:
`docs/progress/ozzy-figur/2026-11-19-kopf360-4-skizzen.png`, Blatt `…-kopf360-4-blatt.png`, Video `…-kopf360-4.mp4`.

- **Gesicht:** Breite nach den Skizzen (`GESICHT_BREITE`: 0,8 bei 108°, 0,67 bei 130°). Ab 130° wird es zum rechten Rand hin schmal und ist bis
  146° darin verschwunden (`SCHWINDEN_*`); nur das unterste Viertel (die Barthaare) 6° später, zuletzt 45 außerhalb des Rands (dort ist es auch
  gespiegelt am breiteren linken Rand und am linken Ohr nicht zu sehen). Versucht und verworfen: hinter den Rand gleiten lassen (das Gesicht
  lag dabei halb über dem Kopf, durch den Augenkeil schien die Maske als Horn), unten 8° und das untere Drittel später (der untere Teil deckte
  den Kopf schräg ab, der Augenkeil blieb als Strich).
- **Nahe Maske:** bis 130° wie vorher mit dem Gesicht, bei 148° (`RUECKEN_DA`) wie im Rücken. Ebenso die Ohren.
- **Nase:** Breite und Höhe 0,8/0,96, 0,62/0,9, 0,5/0,78, 0,4/0,65 bei 100°, 108°, 120°, 130°; bei 137° weg.
- **Ohren:** Das mittlere bleibt von der Seite nah am linken (Anteil seines Wegs zum Rücken: 0,03, 0,06, 0,12, 0,6 bei 110°, 120°, 130°,
  140°; `OHR_WEG`). Abstand der Spitzen zur Kopfbreite bei 130° 0,40 (Skizze 0,38), bei 144° 0,68 (Skizze 0,69).
- **Bildausschnitt:** nur das Schwarz (`szenenKasten`); sonst rechnete die Seite das unsichtbar weggedrehte Gesicht mit und zeigte den Kopf
  kleiner.
- **Geprüft:** an 0°, 45°, 90°, 180° jede Form 0,00; 52 Tests grün; keine Sprünge (0,5°-Schritte, je vier Viertel); am schnellsten bei
  136°–138° (Gesicht verschwindet, Ohr geht an seinen Platz), wie seine Skizzen von 36 % zu 40 %.
- **Offen:** sein Urteil. Stirnfranse bei 52°–82°.

### Fünfte Fassung: zurück zur dritten, sanft gefeilt (19.11. nachts)

Florian zur vierten Fassung: „oh. jetzt wurde es schlechter die riesen lücke an ohr. der kopf rutscht nach links. Es sieht nichtmehr smooth
aus“, und zu seinem Bild bei 114°: „du musst doch sehn dass das ihr schwebt unddie bewegung nicht smooth ist“. Die vierte Fassung war bei 148°
schon der Rücken; danach schob nur noch der Versatz den fertigen Kopf nach links (Schwerpunkt des Schwarz 320 → 375 zwischen 132° und 144°,
dann 30 Bildpunkte zurück). `raster.ts` steht deshalb wieder auf der dritten Fassung (71531665), darauf drei sanfte Änderungen. Blatt
(3. Fassung, 4. Fassung, neu; darunter das linke Ohr vergrößert): `docs/progress/ozzy-figur/2026-11-19-kopf360-5-blatt.png`, Skizzen
`…-kopf360-5-skizzen.png`, Video `…-kopf360-5.mp4`.

- **Linkes Ohr sitzt an** (`HINTERKOPF_ZOEGERN` 2): Die Anker der nahen Maske, die im Profil am Hinterkopf liegen (links der Mitte ihres
  Kastens, ohne Stirnfranse, Kinn und Kieferspitze), gehen gleichmäßig beschleunigt zum Rücken (Anteil des Wegs = Anteil der Drehung hoch 2).
  Vorher liefen die Anker unter dem Ohr ab 100° zur Mitte des Rückens, bevor die ferne Maske links stand; unter dem Ohr blieb eine Kerbe (bei
  114° am tiefsten, auch schon in der dritten Fassung). Versucht und verworfen: alle Anker außer der Schnauze langsamer (die Unterkante wurde
  eine Diagonale, rechts stand ein Kasten).
- **Ohren von der Seite näher** (`OHR_ZOEGERN` 1,6): Das mittlere Ohr geht gleichmäßig beschleunigt an seinen Platz; Zwischenschlüssel nur bei
  110° und 125°, danach holt es weich auf (am schnellsten bei 144°–156°, 1,3 Einheiten je Grad) und kommt bei 180° langsam an. Versucht und
  verworfen: Zwischenschlüssel bis 170° (rechts neben dem Ohr eine runde Schulter bei 150°–162°, gespiegelt sprang das linke Ohr hinter 180°;
  siehe Fallen).
- **Gesicht etwas früher weg** (`GESICHT_WEG_BIS` 156°, vorher 162°): Breite cos φ, bei 129° 0,6, bei 144° 0,28. Die nahe Maske folgt dem
  Gesicht bis 140° (`WICKEL` endet dort) und rundet danach zum Rücken. Sie gleitet nicht mit dem Gesicht über den Rand (`wegMaske`), sonst stand
  rechts ein schwarzer Kasten.
- **Bildausschnitt** aus der vierten Fassung bleibt (nur das Schwarz).
- **Geprüft:** 0°–90° und 270°–360° jeder Anker gleich wie in der dritten Fassung; an 0°, 45°, 90°, 180° jede Form 0,00; 52 Tests grün; keine
  Sprünge (2°-Schritte, je vier Viertel, 88°–272°). Der Schwerpunkt des Schwarz steigt wie in der dritten Fassung (+33 auf 24°, vorher +34), am
  höchsten bei 150° statt 156°. Beide Ohren laufen weich durch 180° (bremsen, kehren um).
- **Offen:** sein Urteil. Bei 144° (40 %) ist noch ein schmaler Streifen Gesicht zu sehen, in seiner Skizze schon der ganze Rücken. Ganz nach
  der Skizze hieße: Rücken bei 144° fertig, dann steht der Kopf bis 216° still oder rutscht (vierte Fassung). Stirnfranse bei 52°–82°.

### Sechste Fassung: Zacken rechts unten, saubere Spitzen (19.11. nachts; Formen zurückgenommen)

**Formen zurückgenommen** (Florian: „ohman, jetzt ist es wieder viel schlechter geworden. Siehst du das denn nicht. Du siehst doch selbst
wenn die haare beim morph zeklumpen und der kopf hässlich slided“): `raster.ts` wieder wie die fünfte Fassung (33f13ebf; die sechste verschob
die Masken bei 144°–216° um bis zu 68 Einheiten). Geblieben sind die sauberen Spitzen im Renderer (erster Punkt unten). Danach baute ich ihm
das Werkzeug (nächster Abschnitt).

Florian zur fünften Fassung: „ok, besser. Ich finde zwischen 156 bis 180 verklumpen rechts unten die schwarzen zacken nicht schön. Und
bekommst du das „ausverjüngen“ der schwarzen kontur noch sauberer hin. Vorallem bei der unteren Gesichtshälfte“. Vorher und nachher:
`docs/progress/ozzy-figur/2026-11-19-kopf360-6-gesicht.png` (untere Gesichtshälfte 102°–132°, groß), `…-kopf360-6-zacken.png` (rechts unten
150°–180°), Video `…-kopf360-6.mp4`.

- **Saubere Spitzen** (Renderer): Unter der Nase blieb vom Durchbruch eine blasse, gepunktete Linie, an den Spitzen der Stirnfranse ebenso.
  Drei Ursachen, gemessen an den Grauwerten quer über den Rand (bei 120° unter der Nase 128 und 204 statt 255): Der Durchbruch nahm nur
  Bildpunkte mit der Mitte im Schwarz und außerhalb des Barts; die geglätteten Säume am Umriss und an der Kante des Barts blieben grau
  (jetzt `schwarz < 0.5`, `wRoh > -0.5`). Ein Rest dünner als `DURCH_REST` (0,75 Bildpunkte) geht mit. Und wo Bart und Umriss an derselben
  Kante enden, gab „Schwarz halb, darüber Weiß halb“ 75 % Grau: Sichtbar ist jetzt nur das Schwarz außerhalb des Weißen
  (`1 − max(sw − hell, 0)`, sonst unverändert). Alle neun Vorlagen weiter 0,000–0,006 % deutlich abweichend.
- **Rechts unten ohne Klumpen** (`RECHTS_GLATT` 160°): Die Kieferspitze der nahen Maske (im Profil unten unter dem Bart) wird im Rücken eine
  Kerbe an der rechten Seite; auf dem Weg dorthin beulte sich das Stück davor zum Klumpen aus, zwischen ihr und dem Kinn stand ein Spalt oder
  Haken. Jetzt liegen bei 160° die Anker zwischen der rechten Seite (rechtester Anker der unteren Hälfte im Rücken) und der tiefsten Spitze auf
  einem glatten Bogen: Die Zacken des Kiefers ziehen sich davor ein, die des Rückens wachsen danach heraus. Bei 156° ist die Unterkante kurz
  fast gerade.
- **Asymmetrie des Rückens weich verteilt** (`ASYM_BIS` 144°): Gespiegelte Schlüssel der zweiten Hälfte bekommen den Unterschied des Rückens
  zu seinem Spiegelbild dazu (voll bei 180°, weich auslaufend bis 216°). Nötig für den Bogen bei 160° (gespiegelt bei 200°). Versucht und
  verworfen: bis 270° auslaufen lassen (Bart und Ohrspalt werden ohne Ausgleich gespiegelt; links stand bei 216°–234° ein dicker schwarzer Rand
  ums Gesicht).
- **Weißer Faden links bei 181°–187° weg** (stand schon in der dritten Fassung): Das weggedrehte Gesicht (Bart ohne Breite) lag gespiegelt im
  Schwarz, weil sein Abstand „außerhalb des Rückens“ an den Ankern gemessen war; die Wange wölbt sich zwischen zwei Ankern weiter hinaus.
  Jetzt an der Kurve gemessen (`xAus`); der Bart liegt von 154° bis 206° ganz außerhalb des Kopfs.
- **Geprüft:** an 0°, 45°, 90°, 180° jede Form 0,00; 52 Tests grün; keine Sprünge (2°-Schritte, 88°–272°); Vorlagen wie oben; Schwerpunkt des
  Schwarz glatt (am höchsten bei 150°–156°, wie vorher).
- **Offen:** sein Urteil, auch zur fast geraden Unterkante bei 156°. Bei 144° noch ein Streifen Gesicht (seine Antwort steht aus). Stirnfranse
  bei 52°–82°.

## Werkzeug: Formen selbst bearbeiten (Stufe 1, 19.11. nachts)

Florian: „ursprünglich war geplant dass ich sowas doch selbst anpassen kann indem du mich posen und unsaubere stellen in den übergängen
einfach selbst anpassen lässt. Baue mir dazu vektorbearbeitungstools wie in illutrator ein.“ Plan:
[`docs/plans/2026-11-19-ozzy-figur-werkzeug.md`](../../plans/2026-11-19-ozzy-figur-werkzeug.md). Bild: `docs/progress/ozzy-figur/2026-11-19-werkzeug.png`.

- **Bedienung** (Szenen „Kopf dreht 360°“, „Kopf dreht“, „Ozzy dreht sich“; Knopf „Bearbeiten“ oder Taste B; `werkzeug.ts`): Direktauswahl (A),
  Auswahl (V), Ankerpunkt umwandeln (⇧C). ⇧ wählt mehrere Anker, ein Rahmen lässt sich überall außer auf Ankern aufziehen, Pfeiltasten
  verschieben (⇧ 10), ⌥ am Griff macht eine Ecke. ⌘ + Scrollen zoomt (Trackpad: zusammenziehen), Scrollen oder Leertaste + Ziehen verschiebt,
  ⌘0 zeigt die ganze Figur. „,“ und „.“ drehen um 1° (⇧ 5°). ⌘Z, ⇧⌘Z. Liste „Deine Schlüssel“ (hinspringen, löschen). Auf Touch: Anker ziehen,
  mit zwei Fingern zoomen (nicht am Gerät geprüft). Keine Punkte hinzufügen oder löschen.
- **Schlüssel** (`raster.ts`: `KopfKorrektur`, `korrekturEinsetzen`, `korrekturAus`): Jede Änderung wird die Form des Teils bei diesem Winkel
  (0,5°), in Kopfkoordinaten. Bis 90° wird sie vor dem Anschluss der ersten Hälfte eingesetzt, dahinter nach den gebauten Schlüsseln und vor
  dem Spiegeln. Gebaute Schlüssel desselben Teils näher als 4° fallen weg; 0°, 45°, 90°, 180° und der gezeichnete Zwischenschlüssel bleiben
  (außer er ändert genau dort). In der zweiten Hälfte wird eine Änderung der gespiegelte Schlüssel des Partners in der ersten: Eine Änderung
  bei 210° ist gespiegelt die bei 150°.
- **Ablage:** `docs/look/ozzy-figur/schluessel.json` (eine Zeile je Schlüssel, Anker als [px, py, ix, iy, ox, oy]), geschrieben über den
  Dev-Server (`vite.config.ts`, `/__ozzy-figur/schluessel`), gelesen beim Öffnen. Jede Änderung baut das Raster neu (rund 0,13 s); beim Ziehen
  zeigt das Werkzeug die gezogene Form direkt (`ersetzen`).
- **Winkelregler** der 360°-Szene zeigt jetzt den echten Winkel (vorher ein Viertel davon).
- **Geprüft** (`node scripts/ozzy-figur/werkzeug-probe.mjs` aus `apps/editor`; seit dem 20.11. mit einer Attrappe der Datei, siehe Fallen): Anker,
  glatter Griff (Knick bleibt 0°), Griff mit ⌥ (Ecke), Ankerpunkt hin und zurück, Auswahl, Pfeiltasten, Rahmen, Winkel, Änderung bei 210° gilt
  gespiegelt bei 150°, Zoom, Datei, Zurück und Wieder, nach dem Neuladen derselbe Stand. Ohne Schlüssel alles wie vorher (Schlüssel 0,00,
  52 Tests). Zwei kräftig gezogene Schlüssel bei 150° ergeben keinen Sprung (größte Änderung je 2° 11 370, ohne 11 244).
- **Offen:** sein Urteil zur Bedienung; Stufe 2 (Körper) und 3 (Haltungen, Abläufe) nach seinem Wort; Illustrator-Rundweg später.

### Zeitleiste mit allen Schlüsseln (20.11. früh)

Florian, nachdem er die ersten Schlüssel gesetzt hatte (16 an Bart A und B, Maske A und B): „Ich müsste aber auch deine schlüsselbilder sehen
um es richtig bearbeiten zu können. Im moment shee ich nur meine“. Bilder: `docs/progress/ozzy-figur/2026-11-20-zeitleiste.png` (360°),
`…-zeitleiste-90.png` („Kopf dreht“), `…-zeitleiste-iphone.png`.

- **Zeitleiste** unter der Bühne, nur im Bearbeiten (`werkzeug.ts`, `zlZeichnen`; die Figur wird darüber eingepasst, `einpassen(…, unten)`):
  eine Zeile je Kopfteil, oben, was im Bild oben liegt (Nase, Bart B, Bart A, Maske A, Maske B, Ohr A, Ohrspalt, Ohr B). Schwarze Raute:
  seine Vorlage (Logo, 3/4, Profil, Rücken, seine Übermalung bei 67°); helle Raute: von mir gebaut; Punkt: verborgener Faltschlüssel; blaue
  Raute: sein Schlüssel. Ab 180° grau hinterlegt und blasser (gespiegelt). Abspielkopf mit Winkel. „Kopf dreht 360°“ zeigt 0°–360°, „Kopf
  dreht“ und „Ozzy dreht sich“ 0°–90°. Auf kleiner Bühne (iPhone) knapper (114 statt 153 Bildpunkte).
- **Bedienung:** Klick auf eine Raute springt genau dorthin und wählt das Teil (Maus 5, Finger 9 Bildpunkte daneben); Klick oder Ziehen
  daneben dreht den Kopf (0,5°), in der Zeile des gewählten Teils rastet er an dessen Schlüsseln ein; Klick auf den Namen wählt nur das Teil.
  J und K springen zum vorigen und nächsten Schlüssel des gewählten Teils (ohne Teil: aller; Faltschlüssel zählen nicht).
- **Status oben links:** wessen Schlüssel hier liegt und wozu („mein Schlüssel: Bart dreht mit dem Gesicht weg“, „deine Vorlage: Profil“,
  „dein Schlüssel (gespiegelt aus 150°, Bart A)“, „zwischen zwei Schlüsseln“); über einer Raute der Schlüssel unter dem Zeiger. Darunter rot,
  welche meiner Schlüssel ein Zug hier ersetzen würde (näher als 4°, `wegfallend`); in der Zeitleiste sind sie rot umrandet.
- **Raster** (`raster.ts`): Jeder Schlüssel trägt seine Herkunft (`Schluessel.art`: vorlage, dein, gebaut, falte) und wozu er da ist
  (`grund`); das Spiegeln nimmt beides mit. `schluesselUebersicht()` gibt je Teil die Schlüssel, die das Bild bestimmen, wie `szene` sie
  liest: 0°–90° und 270°–360° aus der ersten Hälfte mit ihrem Anschluss, 90°–270° aus der Drehung nach hinten, Teile ohne Rücken von 180° bis
  270° aus dem Partner. Die Anschlussschlüssel der ersten Hälfte hinter 90° wirken nur mit und stehen nicht in der Zeitleiste. Je Raster
  einmal gerechnet (168 Schlüssel mit seinen 16).
- **Geprüft** (`node scripts/ozzy-figur/zeitleiste-probe.mjs` aus `apps/editor`, `BILD=<ordner>` für Bilder): Übersicht, Klick auf eine Raute,
  J/K, Text über einer Raute (auch gespiegelt), Ziehen im Lineal und in einer Zeile (rastet ein), Zug bei 150° (sein Schlüssel kommt dazu, mein
  Schlüssel bei 152° fällt weg, gespiegelt bei 210°; ⌘Z nimmt ihn zurück), Klick auf einen Namen, „Kopf dreht“, iPhone hochkant. Dazu
  `werkzeug-probe.mjs` wie am 19.11., 52 Tests, Typen, Lint.

### Zwiebelhaut (20.11. vormittags)

Florian: „Mache erst die Zwiebelhaut“. Knopf „Zwiebelhaut“ oder Taste Z im Bearbeiten: Für das gewählte Teil liegen der Schlüssel davor
(orange) und danach (grün) als Umriss über dem Bild, an ihrem echten Ort (der Kopf sitzt je Winkel anders); das gewählte Teil kräftig, die
übrigen Kopfteile blass, der Winkel am höchsten Punkt (davor links, danach rechts). Faltschlüssel zählen nicht. Oben links „Zwiebelhaut: davor
148°, danach 152°“, in der Zeitleiste Ringe in denselben Farben. Gerechnet über `lageBei` (main.ts), je Raster gemerkt (`teileBei`). Bild:
`docs/progress/ozzy-figur/2026-11-20-zwiebelhaut.png` (bei 150° sieht man, wie weit Bart A von seinem Schlüssel bei 148° zu meinem bei 152°
springt). Probe: Abschnitt 8c in `zeitleiste-probe.mjs`.

## Fallen

- Proben und Prüfaufrufe sehen Florians Schlüssel aus `schluessel.json` (die Seite lädt sie beim Öffnen). Nie seine Schlüssel löschen und nie
  in seine Datei schreiben: Er arbeitet oft gleichzeitig im Fenster, und was er speichert, während eine Probe die Datei geleert hat, wäre beim
  Zurückschreiben verloren. Proben laden und speichern deshalb über eine Attrappe im Browser (`page.route('**/__ozzy-figur/schluessel', …)`,
  wie `werkzeug-probe.mjs` und `zeitleiste-probe.mjs`) und prüfen am Ende, dass seine Datei unberührt ist.
- Hat Florian das Fenster offen (`lsof -nP -iTCP:5213` zeigt Chrome), lädt jede Änderung unter `src/ozzy-figur` seine Seite neu (Zoom und ⌘Z
  weg). Größere Umbauten in einer Kopie bauen (`src/ozzy-figur-bau/` mit `ozzy-figur-bau.html`, gleicher Server; eine fremde Seite lädt seine
  nicht neu) und erst am Ende in einem Schritt zurückkopieren; die Kopie danach löschen.

- Schlüssel kurz vor 180° werden in die zweite Hälfte gespiegelt (Teil n bei 360° − w ist der gespiegelte Partner bei w). Florians Rücken ist
  nicht spiegelgleich. In der sechsten Fassung bekamen gespiegelte Schlüssel über `ASYM_BIS` den Unterschied weich dazu (mit ihren Formen
  zurückgenommen, steht nicht mehr im Code); sonst holt jedes Teil ihn zwischen 180° und dem ersten gespiegelten Schlüssel nach (Zwischenschlüssel des mittleren Ohrs bis 170°: das linke Ohr lief hinter
  180° 37 Einheiten in 10°). Der Ausgleich muss vor dem Gesicht auslaufen (Bart und Ohrspalt werden ohne ihn gespiegelt). Die Ohren um 180°
  prüfen: `npx vite-node scripts/ozzy-figur/teil-weg.ts ohrA 170 196 2`.
- Weiß über Schwarz an derselben Kante: Mit Kantenglättung ergibt „Schwarz halb, darüber Weiß halb“ 75 % Grau, eine Linie, die niemand
  gezeichnet hat. Der Renderer zeigt deshalb nur das Schwarz außerhalb des Weißen. Blasse Linien am Bildpunkt nachmessen (Grauwerte quer
  über den Rand), bevor man an der Form ändert.
- Teile ohne Breite (weggedrehtes Gesicht, Bart bei 0) zeichnen sich im Schwarz als Faden. Ihr Abstand „außerhalb“ an der Kurve messen, nicht
  an den Ankern.
- Wer Anker eines Teils verzögert, nimmt nur die am Umriss, der stehen bleiben soll. Verzögerte Anker an der Unterkante ziehen zwischen sich
  und den mitgehenden eine gerade Kante.

- Eine harte Grenze in einer Suche (Faltgrenze, „lang genug“) macht die Form unstetig, sobald die Kurve an der Grenze liegt: gedämpfte
  feste Schrittzahl und sanftes Zurücknehmen statt Halbierungssuche mit Verzweigung. Prüfen mit Schritten von 1/200 und feiner.
- Griffe ohne Biegerichtung (gerades Bein, Abstand knapp unter der Länge) laufen bei langer Grifflänge auf der Geraden hin und her;
  die Krümmung aus Ableitungen sieht das nicht (sie ist dort 0).
- Ein Rückgrat gegen die gemischte Richtung statt gegen die tatsächliche Linie Hüfte–Fuß schlägt eine S-Kurve unter den Boden, sobald
  der Boden den Fuß anhebt.
- Eine Sprungprobe mit einer einzigen Schrittweite hält schnelle Bewegung (Absprung, Aufprall) für Sprünge: zwei Schrittweiten.
- 3D aus zwei Ansichten: Getrennte Intervalle einer Zeile (Kerben, Bartzacken, zwei Kopfhälften) ergaben je einen Strang über die
  ganze Tiefe, schräg als Grate sichtbar: je Zeile ein Intervall (die Hülle). Eine Lücke zwischen zwei Teilen einer Ansicht (Scheitel)
  wird im Raum ein Schlitz: Teile mit ihrem Weiß vereinigen. Ein Sprung des Intervalls von Zeile zu Zeile wird eine Stufe, die keine
  Ansicht sieht (schwarze Linie): in der Höhe glätten.
- Füllen mehrerer Linienzüge in einem Durchgang mit Umlaufzahl löscht Überlappungen mit verschiedenem Umlaufsinn aus: je Linienzug
  füllen, dann vereinigen.
- Projizierte Zeichnungen brauchen eine Sichtprüfung je Pixel (Tiefenbild) mit Abstand nach der Schräge; je Ecke geprüft oder mit
  festem Abstand gibt es Treppen und feine Streifen.
- Den Ort einer Pfote an den Ankern ihrer Sohle messen, nicht an der Kontaktfläche (Punkte bis 1 über dem tiefsten): Hebt sich die
  Zehe um 2, wandert die Mitte der Kontaktfläche um 10, ohne dass etwas rutscht.
- Die Verschiebung in der Steuerung nie an den gezeigten Gewichten mit dem Anker des Abschnitts messen, in dem der Leitpunkt schon
  ist: Die Feder hinkt nach, ein Bein, das noch wandert, gilt dann als stehend (Aufstehen verschob sich um 60 statt 28).
- Eine steife Pfote (Gerade aus dem Fuß, weich ins Rückgrat übergehend) knickt den Umriss, wenn das Rückgrat kurz und stark gebogen
  ist; sie half auch nicht (gemessen an den Ankern stand die Pfote schon).

- Weiß, das von vorn aufgemalt wird, liegt auf einem runden Körper an der Seite breit: Alles, was von vorn nah am Umriss liegt (Rand,
  Kappe am Ohransatz, Mündung einer Augenkerbe), wird von der Seite ein Balken oder Fleck. Zwei Zeichnungen ineinander zu schieben
  (Abstandsfelder mischen) gibt doppelte Linien. Was hilft: eine eigene Form für das Weiß (Bart), vorn die Front, an den Seiten die Seite.
- Der Rand ums Weiß als vergrößerte Hülle (Rückseiten) sticht in Mulden durch die Fläche: beim Zeichnen nach hinten schieben
  (`gl_Position.z += …`), dann erscheint er nur außerhalb des Umrisses. Seine Breite je Stelle aus der Zeichnung (`randBreiten`).
- Abstandsfelder aus Masken haben Treppen von einer halben Zelle; bilinear gelesen flackern die Flächenrichtungen von Zelle zu Zelle
  (Streifen, durchstechender Rand): weichzeichnen (σ = 1) und bikubisch lesen.
- Aufblasen mit einem Maß je Zeile macht aus schmalen Zeilen (Bartzacken) flache Finnen: Maß nur langsam ändern (Glättung 25).
- Eine Form, die auf eine Linie ohne Breite zusammenläuft, zeichnet der Renderer als Haarlinie: Verschwindendes immer auf einen Punkt
  ziehen. Die weiche Deckung (`deckung`) deckt das Innere einer großen Fläche sofort ganz (das Feld ist innen gesättigt): nur für kleine
  Überlappungen.
- Ein Teil, das in einer Drehung von einer Seite zur anderen muss (ferne Maske: Streifen vorn im Profil, linke Hälfte im Rücken), läuft
  verdeckt: erst untertauchen, dann am Zielrand zusammengeschoben bereitlegen und von dort wachsen. Quer durch den Kopf gemischt fällt
  der Umriss ein.
- Teile, die in einer Haltung fehlen, nie zu einem fernen Punkt ziehen (sie wandern sichtbar durch anderes): dort zurückziehen, wo
  sie verdeckt sind, und früh im Weg.
- Gelenke in der Welt mischen, wenn sie stehen bleiben, sonst im Knochen der Bohne: Eine Hüfte, die geradlinig zwischen zwei
  Vorlagen wandert, während sich die Bohne dreht, löst sich vom Körper; eine Schulter, die mit der Bohne dreht, obwohl das Bein
  steht, rutscht.
- Ein flach gezeichnetes Bein, das durch die Kamera dreht, dreht sich in der Bildebene um 180° (wie ein Blatt): quer einlaufen
  lassen, die Sohle trägt die Form. Eine Wurzel in der Größe (√(1 − kurz²)) schießt am Anfang aus dem Fuß.
- Die Felder sind nur bis R (Band um die Kanten) genau, innen gesättigt: Die weiche Deckung wirkt nur in diesem Band.
- Proben im Fenster: Das erste Bild der Seite zeichnet über das erste Prüfbild (zwei Bilder abwarten). Umklappende Bildpunkte
  (|Δ| > 128) zählen bei winzigen Schritten nur Sprünge, stetige Bewegung bleibt bei 0.


- Seine Vorlagen haben verschieden große Zeichenflächen: Haltungen über anatomische Bezüge zueinander legen (Vorderpfote,
  Hinterteil), nie über die Bohnenmitte (die verformt sich).
- Der Körper hängt in den Haltungen auch vom Kopfwinkel ab (Liegen vorn und im Profil verschieden gekippt): je Reihe eigene Knochen.

- `sminN` rauscht auch an Schwarz, wo eine scharfe Spitze einer Gruppe an einer anderen endet (Haarspitze am Bauch): Kopf–Körper
  deshalb ohne Kantenrichtung.
- Ein gezeichneter Zwischenschlüssel und die Spitzenführung schließen sich aus (die Führung mischt nur zwischen 45° und 90°).
- Übermalungen von Florian als Bild: zuerst auf die Darstellung legen (Maßstab und Versatz über die Deckung der unveränderten
  Flächen), dann nur die Teile anpassen, die er geändert hat (Unterschiedsbild zeigt sie).

- Jede weiche Vereinigung braucht Felder, die bis k reichen: Sättigt ein Feld innerhalb von k, verschiebt `smin` jede Kante
  (der Bart wuchs bei Reichweite 0,6 k überall um 2 Bildpunkte). Reichweite je Teil, nie unter k.
- Die Reichweite der Felder bestimmt die Zeit des ersten Durchgangs: Eine große Stärke für alle Teile verdoppelte die Zeit je Bild.
- `sminN` (nach Kantenrichtung) nur für Schwarz: An Weiß mit Knicken aus `max`/`min` rauschen die Ableitungen, die Kanten fransen aus.
- Verschmelzendes Weiß muss die Malreihenfolge als Abstand mitnehmen (`max(w, −ueber)`), sonst verliert ein Fenster die Haarspitze,
  die über ihm gezeichnet ist.
- Große Stärke an vielen nahen Kanten (Zickzack des Barts über dem Pfotenfenster) lässt schwarze Tropfen stehen: an den liegenden
  Vorlagen prüfen.
- Florians Pfade haben viele Eckpunkte mit nur einem Griff; ihre Richtung kommt vom nächsten Kontrollpunkt und wird beim Mischen
  nicht mitgedreht.

- Gespiegelte Hälften (A/B) überlappen; nie mehrere Teile in einen Kanal (Schablone löscht Überlappungen gegensinniger Pfade aus).
- Das Minimum der Teilefelder ist innen kein Abstand zum Umriss: Für Weiß-Regeln den Kanal der Außenkanten nehmen.
- Bänder (Ohrspalt) als Deckung `deck(d − b) − deck(d)` zeichnen, sonst Haarlinie bei Breite 0.
- Florians Fenster ragen in der Front bis 6 über ihren Gips (über Bohne und Nachbarbein): Klemme nur beim Wandern, dann mitlaufend.
- Kriterium „Vorlage exakt“ an deutlichen Unterschieden messen (|Δ| > 0,5), nicht an Schwellen-Kippern der Kantenglättung.
- Ein gespiegelt kopiertes Teil läuft andersherum: Morph verdreht sich (Fenster wurde zum Stern). Der Import gleicht an; ohne
  Drehung vergleichen, sonst passt ein symmetrisches Teil auch verkehrt herum.
- Verdeckte Schlüssel immer so bauen, dass die Klemme sie ganz abdeckt (Streifen an der Gipskante, nicht an der eigenen Kante).
- EXT_disjoint_timer_query liefert unter Chrome/Metal schwankende Werte (1,4 bis 5,5 ms für dasselbe Bild); maßgeblich ist die
  Zeit mit Warten in jedem Bild.
- Ein neuer Schlüssel hinter einem gezeichneten ändert die Mischung davor: PCHIP nimmt die Steigung am Schlüssel aus beiden Nachbarn. Wer
  hinter 90° baut, prüft 45°–90° gegen den alten Stand (Umrisse übereinander, nicht nur die Schlüsselwinkel); die erste Hälfte mischt mit
  ihrem eigenen Anschluss (`anschlussBauen`).
- Verdecken zieht an jeder äußeren Kante des Schwarz, auch an einer, die unter überstehendem Weiß liegt: Dort entstehen feine Linien.
- Eine Klemme erst einschalten, wenn der Träger ganz um das Weiß liegt; schaltet sie ein, während er noch wandert, schneidet sie mit einem
  Ruck (Sprungprobe mit allen vier Vierteln eines Schritts, ein Viertel allein übersieht ihn).
- Teile ohne Schlüssel im Rücken (Bart, Ohrspalt) wechseln bei 180° die Seite: in der zweiten Hälfte gespiegelt aus der ersten nehmen.
  Über 180° gemischt wandern sie durch den Kopf (als Punkt unsichtbar, mit Fläche nicht).
- Liegt Schwarz genau unter der Kante des Weiß, mischt die Kantenglättung beide zu einer feinen grauen Linie: das Schwarz ein paar Einheiten
  unter das Weiß legen.
- Ein Teil ohne Breite zeichnet der Renderer als Haarlinie, auch Weiß auf Schwarz. Was am Rand verschwindet, gleitet als schmaler Streifen
  über den Rand hinaus. Der Rücken ist nicht symmetrisch (links 147, rechts 130): Was in der ersten Hälfte knapp außen liegt, liegt gespiegelt
  nahe 180° innen. Ganz weggedrehtes darum außerhalb beider Seiten ablegen.
- Ein neuer verborgener Schlüssel kurz hinter einem gezeichneten setzt die Bewegung dort mit einem Ruck in Gang (die Nase verlor gleich
  hinter 90° bis 4 Einheiten Breite je Grad): einen Schlüssel zum Stehen danach setzen, dann läuft sie weich an.
- Ohren, die im Rücken gespiegelt ankommen, drehen sich gemischt wie Zeiger; umgeklappt über die Breite 0 stehen sie kurz als dünne Spitze.
  Silhouetten mit gleicher Lehne verbinden (`RUECKEN_OHR`). Proben, die den Rücken Anker für Anker nach Namen vergleichen, nehmen dort die
  Ohren als Formen (getauscht, andersherum).
- Ein Gesicht, das zum Verschwinden seitlich hinausgleitet, liegt dabei halb über dem Kopf: Durch seine Kerben scheint die Maske als Horn. Zum
  Rand hin schmal werden lassen.
- Der Bildausschnitt der Seite zählt nur das Schwarz; Weiß außerhalb ist auf weißem Grund nicht zu sehen und darf ihn nicht vergrößern.
- Die Sprungprobe meldet hin und wieder einen einzelnen Schritt, der sich beim direkten Rendern (umklappende Bildpunkte zwischen beiden Winkeln als
  Kasten) nicht zeigt: erst nachrendern, dann suchen.
