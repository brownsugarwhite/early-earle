# Übergabe: Ozzy-Figur (Stand 18.11.2026 abends, Etappen A und B gebaut, C begonnen)

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

## Fallen

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
