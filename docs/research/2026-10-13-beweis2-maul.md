# Phase 0, Beweis 2: Maul mit Haps (13.10.2026, nachts)

> Plan: [`docs/plans/2026-10-13-wesen-editor-2.md`](../plans/2026-10-13-wesen-editor-2.md), Abschnitte 5.1, 5.2 und 11.1 (2). Code: `packages/shape/src/kern/maul.ts` (Einstieg `@ee/shape/kern`), Editor-Tab „kern“ mit Chips „Maul: aus · vorn · unten · hals“, Regler „Öffnung“ und „Käfig zeigen“ (`apps/editor/src/kern/kernBau.ts`). Messung `packages/shape/src/kern/beweis2.test.ts` (Stufe 2, Ausgabe mit `--reporter=verbose --silent=false`), Diagnose nach Käfig-Elternflächen `maul.diag.test.ts`. Bilder `docs/progress/editor/kern-maul-<wesen>-<lage>-<zu|halb|auf>[-kaefig].png` (`MAUL=1 node apps/editor/scripts/kern-bilder.mjs`).

Kriterium des Plans: Maullinie an drei Stellen (vorn, unten, Hals) → Längsschleife einrasten, Schlitz, Tasche, Kiefer, Öffnung 100 %; 0 Durchdringungen bei 0/25/50/75/100 %, Bohne, Umbau ≤ 200 ms, Vergleich mit `rex_mouth_detail` und dem Drachen.

## Was gebaut ist

1. **Maullinie in Wirbelsäulen-Koordinaten** (`MaulLinie = { fv }`: Anteil f der Wirbelsäule, Höhe v auf der Sprosse). So liegt die Lippe immer auf der Fläche, auch wo die Sprossen fächern (Hinterkopf, Halsansatz); eine gezeichnete 2D-Linie wird mit `maulLinieAusPunkten` übersetzt, `maulLiniePunkte` liefert sie dicht zurück. Vorgefertigte Linien je Lage: `maulLinieVorlage(dok, 'vorn' | 'unten' | 'hals')`.
2. **Schleife einrasten** (Plan 4.2): Der Pfad ist die Kappenzeile durch die Spitze plus die Längsschleife j_L = N/4 bis zum Winkelring k. Jeder Ring und jeder Quadratring der Kappe wird so umparametrisiert (`umparametrisieren`, Ecken bleiben Stützstellen), dass sein Lippenpunkt auf der Linie liegt; die Station des Winkelrings rastet auf den gezeichneten Mundwinkel (der Ring auf den Winkel, nicht umgekehrt).
3. **Schlitz**: obere und untere Kopie je Pfadpunkt (der Mundwinkel bleibt ein Punkt), Flächen unterhalb des Schlitzes werden auf die Kopien umgeschrieben; Lippenkanten sind scharfe Falten; **Rille**: beide Ketten 1,2 % der Höhe nach innen (dunkle Maullinie wie auf den Bögen; Ober- und Unterhaut treffen sich im Winkel statt tangential).
4. **Tasche**: K = 3 Inset-Reihen je Kette (Lippe → Zahnfleisch → Rachen) als Linse (Dicke nach lokaler Dicke, wächst nach innen), Rachenziel je Spalte auf der Wirbelsäule zwischen Lippenstation und Winkelring (nie hinter dem Scharnier), Winkelsäule, **Vorhang** aus Vierecken zwischen oberer und unterer Reihe K mit je einem Dreieck in den Mundwinkeln (die einzigen Nicht-Vierecke); Umlaufsinn aus der Haut abgeleitet, Käfig geschlossen und mannigfaltig (`pruefeKaefig`). Taschenpunkte werden in der mittleren Höhe und innerhalb von 80 % der Breite ihrer Station gehalten.
5. **Löser**: Käfig durch die Ziele, Naht-Ausgleich nur auf der Haut (Start über der Spitze), Lippenziele mit Nahtgewicht; **Laplace-Glättung** im Ausgleich (`glaettung`, Plan 4.4) gegen den Wellenschlag reiner Interpolation neben scharfen Falten; untere Kette bitgleich auf die obere; Tasche gegen die Ketten nachgelöst (mit Glättung), damit Ober- und Unterblatt spiegelbildlich bleiben.
6. **Kiefer** (`maulPose`): Unterkiefer dreht um die Achse durch die Mundwinkel (Gewichte aus der Lage zum Schlitz, Kehlband 2 Ringe), Schädel kippt um ein Gelenk hinten (Werkstatt-Wissen), Band 8 Ringe; Öffnungsart „ziehen“ (Robbe, Drache) als Verschiebung entlang Rachen → Lippe; Kieferplatte mit Kehlbeutel als Option. Posen laufen auf dem Käfig, die Matrix liefert das Netz (Öffnung ≈ 3 ms).
7. **Look**: Deskriptoren für Rachen (Tiefe), Lippenband (Abstand zur Lippe), Unterlippenseite und Kante; Lippenband 3 % der Höhe; Rex-Palette: Lippenband hell, Rachen maroon (Bilder).
8. **Diagnose**: Durchdringungen je Paar von Käfig-Elternflächen (Kindflächen je Stufe in Eltern-Reihenfolge), Taschenpunkte außerhalb der Haut, lange Käfigkanten. Damit wurden die Ursachen unten gefunden.

## Messwerte (Stufe 2, 461 px je Kachel; Käfig 527–653 Punkte)

| Fall | Umbau (Stufe 3) | Lippe → Linie | Durchdringungen 0 / 25 / 50 / 75 / 100 % | Spalt vorn bei 100 % |
|---|---|---|---|---|
| Kugel, vorn | 55 ms (Stufe 2) | 2,4 px (Rille) | **0 / 0 / 0 / 0 / 0** | 128 % der Maullänge |
| Rex, vorn | **140 ms** | 1,3 px (Rille) | 120 / 10 / 10 / 10 / 10 (offen nur am Apex) | 143 % |
| Rex, unten | 49 ms (Stufe 2) | 0,6 px | 368 / 92 / 94 / … | 139 % |
| Langhals, Hals (zieht) | 69 ms (Stufe 2) | 4,0 px | 2538 / 1894 / … | 90 % |

Bohne: ja (Bild `kern-maul-rex-vorn-auf.png`: Lippenband hell, Rachen maroon, Oberkiefer kippt, Unterkiefer fällt). Umbau 140 ms ✓ (≤ 200). Öffnung als Pose ≈ 3 ms.

## Was stimmt und was nicht (deutlich)

- **Trägt:** Maul als Kantenpfad im selben Käfig (keine eigene Topologie je Maulart nötig), Schleife einrasten je Ring, Tasche mit Vorhang nur aus Vierecken plus zwei Dreiecken, Käfig immer geschlossen, Kiefer als Käfig-Pose. Die Kugel erfüllt das Kriterium vollständig. Der Rex öffnet sauber bis auf 10 Paare an der Spitze.
- **Apex:** Die Rex-Schnauze ist in der Vorlage eine scharfe Ecke, die Lippe beginnt genau dort. In einer Spitze ohne Dicke ist kein Platz für eine Tasche; die unteren Blätter streifen die Kinnhaut (10 Paare, unsichtbar). Weg: Lippenanfang unterhalb der Spitze (Kappenzeile b_L < c/2, Topologie ist vorbereitet) oder eine stumpfe Kappe.
- **Geschlossen am Rex (120):** Ober- und Unterblatt der Tasche kreuzen sich knapp hinter der Lippe, wo die Schnauze dünn ist (Linse ≈ 1–2 px). Weg: Verdichtung (Loop-Cut neben der Lippe, Plan 4.2) und ein Mindestabstand der Blätter.
- **Unten (368):** gleicher Mechanismus an der Kinnspitze plus die tiefe Lippe nahe der Bauchnaht (kleine untere Ringhälfte).
- **Hals (2538):** Die Tasche faltet sich, wo das Maul um den Hinterkopf in den Hals läuft (Spalten verschiedener Lage zielen auf nahe Rachenpunkte), und „ziehen“ ist nur als Richtung gebaut, nicht gegen die Haut geprüft. Bild `kern-maul-langhals-hals-auf-kaefig.png` zeigt es. Weg: Rachenlinie als eigene Kurve (Plan 5.1: Kieferlinie als zweiter Griff), Kehlkette.
- **Kehle/Nacken:** Hinter dem Mundwinkel teilt die Schleife den Ring in Schädel- und Kieferseite; folgt nur die obere Hälfte dem Schädel, entsteht eine Scherlinie längs des Halses (Langhals), folgt der ganze Ring, faltet sich die Kugel unten. Beides ist als Option da (`nackenGanz`); die Werkstatt-Ketten (⅔/⅓) fehlen noch.
- **Kinnboden bei Blobs:** Eine starre untere Halbkugel kann 58° kippen, ohne dass der Kinnboden in den Bauch schwingt (Kugel 0 Paare); die Kieferplatte mit Kehlbeutel war ein Irrweg (faltete), bleibt als Option aus.
- **Nicht gebaut:** Zähne, Zunge, Kiefer getrennt (Überbiss als Griff; ein Überbiss-Versuch lag die Unterlippe falsch, deshalb die Rille), Maulart Loch/W-Lippe, Zug am Seitenumriss mit Maul (Umbau statt Zug, ≈ 150 ms), Stufe 3 im Durchdringungstest (Rasterbeschleuniger sprengt den Speicher).

## Urteil

Beweis 2 ist **zur Hälfte bestanden**: Mechanik, Topologie, Tempo, Bohne und Look stimmen; die Kugel erfüllt alle Kriterien, der Rex offen bis auf den Apex. Nicht erfüllt sind 0 Durchdringungen geschlossen am Rex, „unten“ und „Hals“. Das spricht nicht gegen die Bauweise (die Fehler sind örtlich: dünne Spitze, Blattabstand, Rachenlinie am Hals), der Rückfall aus Plan 13 (Maul-Topologie als Vorlage je Maulart) ist nicht nötig. Entscheidung für Florian: den Haps am Rex ansehen (`kern-maul-rex-vorn-auf.png` gegen `rex_mouth_detail`) und ob die Rille als Maullinie gefällt; dann Apex-Regel, Loop-Cut neben der Lippe und Rachenlinie als Griff.
