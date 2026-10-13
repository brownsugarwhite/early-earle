# Phase 0, Beweis 3: Teil nahtlos (14.10.2026, nachts)

> Plan: [`docs/plans/2026-10-13-wesen-editor-2.md`](../plans/2026-10-13-wesen-editor-2.md), Abschnitte 6 und 11.1 (3). Code: `packages/shape/src/kern/teil.ts` (Einstieg `@ee/shape/kern`), Editor-Tab „kern“ mit Chips „Beine: aus · verschmolzen · angesteckt“ und Regler „Schwung“ (`apps/editor/src/kern/kernBau.ts`), URL `&beine=verschmolzen&schwung=35&zebra=1`. Messung `packages/shape/src/kern/beweis3.test.ts` (Stufe 2). Bilder `docs/progress/editor/kern-beine-rex-<art>-<schwung>-<zebra|earle>.png` (`BEINE=1 node apps/editor/scripts/kern-bilder.mjs rex`).

Kriterium des Plans: Rex-Säulenbein aus einem Teil, verschmolzen (Inset + Bridge) und angesteckt, Beinschwung ±35°; Zebra ohne Knick über die Hüfte, keine Durchdringung, Umbau ≤ 200 ms.

## Was gebaut ist

1. **Verschmolzen als Ausstülpung** (Blenders Extrude, Plan 9.4 „E ausstülpen“) statt Inset + Bridge: Um den Hüftpunkt (Vorlagen-Ringpunkt) liegt ein Feld aus 2 × 2 Flächen. Die vier Flächen wandern als **Sohle** ans Beinende, der Feldrand (8 Punkte) bleibt am Körper und ist Ring 0 des Beins, dazwischen entstehen 5 Ringe aus je 8 neuen Punkten, der Feldmittelpunkt wird Sohlenmitte. Kein Punkt wird entfernt, keine Brücke, nur Vierecke, alle Vorlagen-Indizes bleiben gültig; Umlaufsinn aus der angrenzenden Körperfläche; Käfig geschlossen und mannigfaltig (`pruefeKaefig`). Gespiegelte Beine entstehen automatisch (Winkel N − j). Das Feld darf weder Naht noch Kappen berühren (sonst teilen sich die gespiegelten Beine Punkte).
2. **Beinform**: Achse halb Lot, halb Hautnormale an der Hüfte; Länge 30 % der Körperhöhe (oder bis zum Boden), Säulen-Halbmesser 7 % der Höhe, die Schulter wächst vom Feldrand über zwei Ringe auf die Säule, der Fuß 15 % weiter; Ringpunkte im Rahmen quer zur Achse an den Winkeln der Feldrandpunkte (kein Drall).
3. **Angesteckt**: eigene Röhre (6 Ringe × 8 mit Kappen), oben eine Gelenklänge (35 % der Beinlänge) im Körper, eigener Löser (58 Käfigpunkte), im Editor als eigenes feines Netz angehängt; Deskriptoren der Hüfte (Körperfarbe).
4. **Schwung** als Pose auf dem Käfig: Drehung um den Hüftpunkt in der Seitenebene, Gewicht 0 am Feldrand, ½ in Ring 1, 1 ab Ring 2 (verschmolzen) bzw. starr (angesteckt); die Matrix liefert das Netz.
5. **Deskriptoren**: Beinpunkte erben die Wirbelsäulen-Werte der Hüfte, `eeTeil` = 1 (für Socken, Plan 8.1).

## Messwerte (Stufe 2; Rex 482 Käfigpunkte = 402 + 2 × 40)

| Fall | Umbau (Stufe 3) | Durchdringungen −35° / 0° / +35° | Käfig |
|---|---|---|---|
| Rex, zwei Säulenbeine verschmolzen (Ring 15, Winkel 6) | **116 ms** | **0 / 0 / 0** | geschlossen, mannigfaltig |
| Rex, angesteckt | 2 × 58 Punkte, eigener Löser | – (steckt im Körper, gewollt) | je Bein sauber |
| Kugel, verschmolzen (Ring 12, Winkel 6) | 36 ms (Stufe 2) | ≈ 230 (Bein/Bein) | sauber |

**Zebra:** In `kern-beine-rex-verschmolzen-0-zebra.png` und `-35-zebra.png` laufen die Streifen ohne Knick vom Rumpf über die Schulter in die Beine, auch im Schwung; angesteckt (`kern-beine-rex-angesteckt-35-zebra.png`) zeigt den gewollten Versatz am Ansatz. Im Editor hebt `kernBauen` den Körper mit Beinen auf die Füße (tiefster Punkt auf den Boden).

## Was stimmt und was nicht (deutlich)

- **Trägt:** Ausstülpen als Teil-Anschluss ist einfacher und sauberer als Inset + Bridge: ein Vorgang, keine Nähte, Vorlagen-Indizes bleiben, Catmull-Clark macht die Schulter rund. Der Rex erfüllt alle messbaren Kriterien.
- **Rundbauch (Kugel):** Das 2 × 2-Feld liegt bei Winkel 6 auf einer 45°-Flanke (bei N = 16 ist das die tiefste erlaubte Stelle ohne die Naht); der erste Beinring legt sich innen über den Feldrand, die Schulter faltet. Weg: Verdichtung der Ringe (Loop-Cut), damit Felder am Boden liegen, oder der Schulterring folgt der Hautnormale statt der Beinachse.
- **Nicht gebaut:** Teil als Bibliotheks-Dokument (Plan 6: eigener Käfig mit Ansatzring), Knochenkette mit Knie und Fuß, IK, Gewichte nach Ringindex des Teils, 3 × 3-Felder (N = 12 bräuchte eine gerade Kappengröße), Flügel/Flossen/Schwanz als Teile, Rex-Boden (die Füße stehen unter dem Boden, weil der Rex-Bauch der Vorlage auf dem Boden liegt; der Körper müsste um die Beinlänge gehoben werden).

## Urteil

Beweis 3 ist für das Rex-Säulenbein **bestanden**: Käfig geschlossen, 0 Durchdringungen bei −35/0/+35°, Umbau 116 ms, Zebra ohne Knick, angesteckt als Alternative. Offen: Beine an runden Bäuchen (Kugel), Teil als Bibliotheks-Dokument mit Ansatzring, Knochenkette mit Knie und Fuß, weitere Teile (Flügel, Flossen, Schwanz, Hörner). Nächster Schritt nach Plan 11.1: Beweis 5 (Feuer, Gas, Fell-Blob); vorbereitet sind die Klinge (`kern/klinge.ts`) und das Feuer/Gas-Material (`creature2/material/feuer.ts`).

## Nachtrag 14.10. spätabends: Beine am runden Bauch sauber, Beweis 3 ganz bestanden

Die Kugel (Ansatz Ring 12, Winkel 6, 45°-Flanke) hatte 212–230 Durchdringungen im Bein selbst. Zwei Ursachen, beide in `beineAnsetzen` (`kern/teil.ts`):

1. **Bündelwinkel.** Die Ringpunkte der Säule standen an den Winkeln der acht Feldrandpunkte um die Achse. Bei dichten Ringen und weiten Winkeln (Kugel: Feld 0,05 breit, 0,17 hoch) liegen diese Winkel in zwei Bündeln (dreimal 75–105°, dreimal 255–285°, dazu 0° und 180°); jeder Säulenring hatte drei fast gleiche Punkte innen und außen, Splitterflächen, und die Grenzfläche schnitt sich auf der Mittelebene des Beins (x der Hüfte; Ringe 4–5). Jetzt stehen die Säulenpunkte **gleichmäßig alle 45°**, um den Feldrand herum bestmöglich gedreht (kreismittlerer Versatz), Umlaufsinn des Rands erhalten.
2. **Gekippter Feldrand.** Der Rand liegt auf der Kugel 45° gegen die Beinachse (halb Lot, halb Normale) gekippt; der erste Säulenring senkrecht zur Achse lag bergab höher als der Rand, die Innenwand faltete. Jetzt **wandert der Feldrand als Ganzes die Achse hinab** und blendet über die Schulterringe in den Kreis (`verschoben → kreis`, Anteil r/schulter).

Dazu die Option `lot` (Anteil des Lots an der Achse, Standard 0,5). Messung Stufe 2: **Kugel 0 / 0 / 0 bei −35/0/+35°**, Rex unverändert 0 / 0 / 0, Umbau 112 ms. Der Test `beweis3.test.ts` verlangt jetzt für beide 0. Bilder `kern-beine-kugel-verschmolzen-{-35,0,35}-{zebra,earle}.png`.

**Urteil neu:** Beweis 3 ist **ganz bestanden** (Rex und Kugel). Offen (Phase 3): Teil als Bibliotheks-Dokument mit Ansatzring, Knochenkette mit Knie und Fuß, IK, 3 × 3-Felder, Flügel/Flossen/Schwanz, Rex auf die Füße gehoben (im Editor bereits).
