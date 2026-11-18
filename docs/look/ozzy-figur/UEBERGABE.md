# Übergabe: Ozzy-Figur (Stand 18.11.2026 abends, Etappen A und B gebaut)

Neuer Strang neben dem Prototyp `claude/maskottchen`: Ozzy als 2,5D-Bewegungswerkzeug mit Physik, aus Florians eigenen SVGs.
Zweig `claude/ozzy-animation-physics-294508` (aufgesetzt auf `claude/maskottchen` @ ebb6fd21), Arbeitsbaum
`.claude/worktrees/ozzy-animation-physics-294508`. Plan: [`docs/plans/2026-11-18-ozzy-figur.md`](../../plans/2026-11-18-ozzy-figur.md)
(von Florian freigegeben: „Ja, A und B bauen“), Recherche: [`docs/research/2026-11-18-ozzy-figur-recherche.md`](../../research/2026-11-18-ozzy-figur-recherche.md).

## Starten

```bash
EDITOR_WEB=1 pnpm --filter @ee/editor exec vite --port 5213 --strictPort --host
```

Aus dem Wurzelordner des Arbeitsbaums; Eintrag `ozzy-figur` in `.claude/launch.json`. Seite `http://localhost:5213/ozzy-figur.html`
(mit `--host` auch vom iPhone im selben Netz über die Adresse des Macs). Schalter: `?szene=logo|profil|front|back|lieg1|lieg2|kopf|koerper`,
`&t=0…1` (Drehwinkel), `&modus=exakt`, `&vorlage=1` (Florians Vorlage rot darüber).

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

## Fallen

- Gespiegelte Hälften (A/B) überlappen; nie mehrere Teile in einen Kanal (Schablone löscht Überlappungen gegensinniger Pfade aus).
- Das Minimum der Teilefelder ist innen kein Abstand zum Umriss: Für Weiß-Regeln den Kanal der Außenkanten nehmen.
- Bänder (Ohrspalt) als Deckung `deck(d − b) − deck(d)` zeichnen, sonst Haarlinie bei Breite 0.
- Florians Fenster ragen in der Front bis 6 über ihren Gips (über Bohne und Nachbarbein): Klemme nur beim Wandern, dann mitlaufend.
- Kriterium „Vorlage exakt“ an deutlichen Unterschieden messen (|Δ| > 0,5), nicht an Schwellen-Kippern der Kantenglättung.
- EXT_disjoint_timer_query liefert unter Chrome/Metal schwankende Werte (1,4 bis 5,5 ms für dasselbe Bild); maßgeblich ist die
  Zeit mit Warten in jedem Bild.
