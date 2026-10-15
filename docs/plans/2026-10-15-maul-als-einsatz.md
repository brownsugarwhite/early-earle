# Maul als Einsatz (15.10.2026)

> Florian (15.10. vormittags, mit Bildern): „Wenn die Figur einen Bauch unter dem Maul hat, fällt er in sich zusammen wie bei der Giraffe die Nase. Das Ergebnis ist ein unbearbeitbares, völlig zerrissenes Wesen.“ — „Mundwinkel können diese Form nicht annehmen! Das muss auch gehen. Es ist immer noch viel zu fragil und unflexibel! Du solltest maximal selbstkritisch sein und alle Fälle testen, bevor du zum nächsten Schritt gehst!“ — „Bei hoch sitzendem Maul passieren die komischsten Sachen!“ — „Selbst bei den einfachsten Mäulern entstehen so viele hässliche Falten. Es muss alles viel smoother sein!“

## Befund: der Maulbau aus Phase 2 trägt nicht

Vier Fehlerklassen, eine Wurzel:

1. **Hohes Maul / Bauch unter dem Maul:** Der Bereich unter der Lippe klappt zu einer Spitze oder Flosse zusammen (Top Δ 29–57 px). Diagnose läuft (Unteragent), Ergebnis kommt hierher.
2. **Mundwinkel in beliebiger Form:** Eine Linie, die am Ende steil nach oben oder unten läuft, kann die Lippe nicht abbilden (Seite „rot 19,1 px“): Der Lippenpfad hat genau einen Punkt je Ring und läuft monoton längs des Körpers; entlang eines Rings kann er nicht laufen.
3. **Zerbrechlich gegen Formänderungen:** Schon ein Rex mit 18 px höherem Schädel (auch frei abgeleitet, ohne Pose) faltet geschlossen die Oberlippe und hat offen 44–78 Durchdringungen; die Grundform 0 (gemessen beim Bau von „Fressen wie Editor“, `kern/fressenPose.test.ts`).
4. **Falten auf dem Körper** schon beim einfachsten Maul (gerade Linie unten an der Kugel): senkrechte Falte über die Stirn, Wulst am Kinn.

**Wurzel:** Die Lippe wird an die Ringe des Körpers gehängt. Dafür werden die Ringpunkte des ganzen Körpers umverteilt (eine Längsschleife auf die Lippe gelegt), Ringe auf den Mundwinkel gerastet, die Kappe umgebogen, und für jede Lage gibt es einen Sonderfall (Kappe, Ringanfang, Plattenmaul, Kinnwand, Versatz, Rachenlinie). Jeder Sonderfall behebt eine Stelle und verschiebt das Problem an eine andere; die Umverteilung macht die Vierecke ungleich, die Unterteilung zeigt das als Falten.

## Idee: Der Körper bleibt, das Maul wird eingesetzt

Vorbild sind Rundmaul und Augapfel (Phase 2 M5/M6), die sauber laufen: Sie ersetzen nur ein kleines Feld des Käfigs durch eingesetzte Ringe (Aufsatz), der Rest des Körpers bleibt bitgleich.

- **Feld:** die Käfigflächen um die gezeichnete Linie (auf dem Körper, beide Hälften gespiegelt), als Scheibe mit einem Randring aus Körperkanten. Der Körper außerhalb bleibt unberührt, glatt, mit seiner eigenen Ringverteilung.
- **Einsatz:** Zwischen dem Randring und der Linie liegen Ringe aus Vierecken (ein Kreisring, die Linie als geschlossene Schleife Oberlippe → Mundwinkel → Unterlippe → zurück). Die Ringe gehen vom Rand (Körper) gleichmäßig in die Form der Linie über; die innersten sind Lippe außen, Lippenkante (Falte), Lippe innen; dahinter die Tasche als weitere Ringe nach innen bis zum Rachen. Jede Linienform, jede Lage (hoch, tief, seitlich, unter dem Kinn, am Hals) ist derselbe Fall.
- **Falten nur an der Lippe:** Die Lippenkante ist die einzige scharfe Linie; ihre Härte ist ein Regler (weich bis scharf).
- **Kiefer:** Oberkiefer = Feldhälfte über der Linie, Unterkiefer = darunter; Gelenk am Mundwinkel; Gewichte im Feld nach dem Winkel um das Gelenk (wie heute), der Körper außerhalb nach Winkel und Reichweite. Über-/Unterbiss: die beiden Lippenkanten liegen getrennt (rote und blaue Linie), der kürzere Kiefer läuft im Feld hinter seiner Kante aus.
- **Fressen wie Editor:** Die Topologie hängt nur am Feld (Flächen, Punktzahlen je Ring) — sie wird eingefroren wie die Stationen; die Pose übernimmt sie (gleiche Topologie, Blendshape).

## Phase A: Beweis (vor jedem Einbau)

Harte Kriterien, alle in einer Prüfreihe (`kern/maulEinsatz.test.ts` + Bilder):

| Fall | Kriterium |
|---|---|
| Kugel, gerade Linie unten (Florians Bild) | keine Falte außerhalb des Felds (Faltenmaß der Haut ≤ dem Körper ohne Maul + 2°), Lippe ≤ 1 px an der Linie |
| hohes Maul (Anfang 60–70 % der Höhe), Bauch darunter | kein Zusammenklappen (Δ je Blatt ≤ 3 px außerhalb der Lippe), 0 Durchdringungen bei 0/25/50/75/100 % |
| Mundwinkel steil nach oben / unten, S-Linie, senkrechtes Ende | Lippe ≤ 1 px an der Linie über die ganze Länge |
| Maul seitlich, unter dem Kinn, am Hals (Langhals, Drache) | wie oben |
| Kiefer gleich, Überbiss, Unterbiss | Lippenkanten ≤ 1 px, offen 0 sichtbare Durchdringungen |
| Körper geändert (Schädel +18 px, Schnauze länger, Kinn tiefer) bei gleicher Linie | 0 Durchdringungen, keine Lippenfalte (heute 44–78 Paare) |
| Fressen-Pose (Griffe der Pose, Pinsel) | Topologie gleich, Überblendung fügt nichts hinzu |
| Rex, Tiger (Kastenschnauze), Kugel, Ei, Fisch | alle oben |

Look: Vergleichsbilder neben Florians Bögen (`rex_mouth_detail`, `different_big mouths`, `dogs_mouth`, Bild 14), vorher/nachher gegen den heutigen Maulbau.

## Phase B: Einbau (nur nach bestandenem Beweis und Florians Urteil)

Zähne (Zahnfleisch am Einsatz), Lippenband/Rachen (Deskriptoren aus dem Feld), Treffer, Griffe (Anfänge, Mundwinkel), Kiefer-Spanten, Haps, Plattenmaul-Ersatz (Mercedesstern als Linienform), alte Maul-Versuche aufräumen.

## Offen

- Wie groß das Feld um die Linie ist (Ringe Abstand) und ob es bei sehr langen Mäulern (Rex) die halbe Kopfseite umfasst — im Beweis messen.
- Ob der Kinn-/Kastenbereich (Tiger) eigene Spanten im Feld braucht.
