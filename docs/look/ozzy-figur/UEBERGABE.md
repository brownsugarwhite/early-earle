# Übergabe: Ozzy-Figur (Stand 18.11.2026 nachts, Etappen A und B gebaut, C in drei Runden)

Neuer Strang neben dem Prototyp `claude/maskottchen`: Ozzy als 2,5D-Bewegungswerkzeug mit Physik, aus Florians eigenen SVGs.
Zweig `claude/ozzy-animation-physics-294508` (aufgesetzt auf `claude/maskottchen` @ ebb6fd21), Arbeitsbaum
`.claude/worktrees/ozzy-animation-physics-294508`. Plan: [`docs/plans/2026-11-18-ozzy-figur.md`](../../plans/2026-11-18-ozzy-figur.md)
(von Florian freigegeben: „Ja, A und B bauen“), Recherche: [`docs/research/2026-11-18-ozzy-figur-recherche.md`](../../research/2026-11-18-ozzy-figur-recherche.md).

## Starten

```bash
EDITOR_WEB=1 pnpm --filter @ee/editor exec vite --port 5213 --strictPort --host
```

Aus dem Wurzelordner des Arbeitsbaums; Eintrag `ozzy-figur` in `.claude/launch.json`. Seite `http://localhost:5213/ozzy-figur.html`
(mit `--host` auch vom iPhone im selben Netz über die Adresse des Macs). Schalter: `?szene=logo|profil|front|back|viertel|lieg1|lieg2|sitz1|sitz2|drehen|kopf|koerper`,
`&t=0…1` (Drehwinkel 0–90°), `&modus=exakt`, `&vorlage=1` (Florians Vorlage rot darüber).

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

## Fallen

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
