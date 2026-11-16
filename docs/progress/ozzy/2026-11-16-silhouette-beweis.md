# Ozzy, Phase 3: Beweis „eine Form aus der Silhouette“ (16.11.2026, nachmittags)

**Gebaut:** `neuAusUmriss(anker)` im Werk (`apps/editor/src/form/werk.ts`). Die Silhouette wird mit `rundAusSeite` rund aufgeblasen
(so dicht wie die Startform der Adresse), und sie selbst wird die Linie der Mitte: Anker sind die Punkte, Griffe die Griffe, wo die
Linie an einem Anker die Richtung wechselt, ist der Punkt eine Ecke. Ein Schritt für ⌘Z, wie Laden. Prüfhaken
`__kurven.ablage.neuAusUmriss`. Probe: `apps/editor/scripts/pruefen/ozzy-silhouette-fenster.mjs` (ein Fisch mit vier Ecken am
Schwanz, eine Ellipse; Prüffenster `kurven.html?gewichte=geometrie` auf Port 5205, Rechennetz der Adresse).

## Kriterien (vorher festgelegt, Plan Phase 3) und Ergebnis

| Kriterium | Fisch (692 Punkte) | Ellipse (812 Punkte) |
| --- | --- | --- |
| Punkte und Griffe der Linie sind die gezeichneten | genau | genau |
| Linie auf ihrem Pfad (höchstens 0,5) | 0,07 | 0,005 |
| Haut in der Seite höchstens 0,5 außerhalb der Silhouette | 0,63 (ein Punktpaar an der unteren Schwanzspitze) | 0,005 |
| keine umgeschlagenen Dreiecke | 4 (an derselben Spitze) | 0 |
| Anfassen ohne Zug: die Haut bewegt sich um weniger als 0,2 | 0,000 (an zwei Punkten) | 0,000 (an zwei Punkten) |
| der erste Zug ruckt nicht | **nein: im ersten Bild springt die ganze Haut um bis zu 17,5** | **nein: abseits bis 18,5 neben der Haut davor** |

Dauer: die Form steht nach 80 bis 160 ms, der Hintergrund ist nach rund 0,5 s fertig.

## Was springt

Mit nur einer Linie setzt das Werk die Haut nicht (`ruheNoetig`: erst wenn sich Linien kreuzen). Der erste Zug rechnet sie dann aus
dieser Linie neu, und die Rechnung hat ihre eigene Rundung: Der Schwanz des Fischs wird so dick wie hoch (Top: eine Birne statt einer
Flosse), der Körper 7,5 dicker, an den einspringenden Ecken der Schwanzwurzel wölbt sich die Haut bis 2,5 über die Linie. Diese Form
ist stabil: nach 30 und nach 120 Runden dieselbe (größte Dicke 172,3 und 172,1; aufgeblasen 164,8). Bild:
[`2026-11-16-silhouette-ruck.png`](2026-11-16-silhouette-ruck.png).

## Versuche

- **Dichteres Netz** (6 000 und 14 000 Dreiecke): an der Schwanzspitze 0,68 und 0,93 außerhalb, umgeschlagen 4 und 0. Der Sprung
  bleibt (er kommt aus der Rechnung, nicht aus dem Netz).
- **Zwei kreuzende Linien gleich nach dem Aufblasen** (L in der Seite: waagerecht durch Nase und Schwanz, senkrecht an der dicksten
  Stelle): Jetzt kreuzen sich Linien, die Haut setzt sich. Der Fisch liegt danach bis 13,1 neben der aufgeblasenen Form (Schwanzwurzel;
  450 von 871 Punkten weiter als 2, 214 weiter als 5, im Körper 5 bis 7), die Ellipse bis 1,7. Ein Zug von 12 bewegt die Haut abseits
  danach noch bis 3,6 (Fisch) und 2,5 (Ellipse).

## Schluss

Die heutige Rechnung macht aus den Linien ihre eigene runde Form. Die aufgeblasene Form hält sie nicht, auch nicht mit zwei weiteren
Linien. Zwei Wege (Übergabe, `docs/look/ozzy/UEBERGABE.md`): Das Aufblasen endet in der Form der Rechnung (A), oder die Rechnung
bekommt eine Schicht, die die Dicke vom Aufblasen trägt (B). Florian entscheidet.
