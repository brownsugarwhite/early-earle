# Übergabe: Ozzy-Figur (Stand 19.11.2026: 2,5D A–D gebaut; Beweis 3D durchgefallen; Rohmodell aus Blender, ozzy-3d.html)

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
- **Metaball-Fallen:** Blender begrenzt `size_x/y/z` auf 20 (größte Achse über den Radius, die anderen als Anteil). Sichtbarer Radius
  einer Kugel = 0,5748 × Radius bei Schwelle 0,6 und Steifheit 2. Bei Kapseln ist `size_x` die halbe Länge (absolut). Metaballs mit
  demselben Grundnamen verschmelzen über Objekte hinweg (Koerper und Kopf getrennt halten).

## Fallen

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
