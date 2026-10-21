# Übergabe (Stand 21.10.2026, dritte Sitzung: Teil A „Maul als Einsatz“, E2 mit Leiter — Tore an 41 von 43 Fällen)

Branch `claude/editor-grundlayout`, PR mit Auto-Fix. **Diese Datei ist der Einstieg für eine frische Sitzung.** Alles zu Teil A
liegt bisher nur im Kern (`packages/shape/src/kern/einsatz/`); im Editor ist davon noch nichts zu sehen.

> **Nachtrag 21.10. spätabends — Grundsatzfrage offen:** Florian stellt den Kernring wegen der vielen Sonderregeln in Frage
> (Eleganz ist Grundvoraussetzung). Recherche: [`docs/research/2026-10-21-feldnetz-oder-kernring.md`](research/2026-10-21-feldnetz-oder-kernring.md)
> — Empfehlung: Kernring einfrieren (keine neue Sonderregel, die zwei offenen Fälle bleiben offen), dann Beweis F0
> „Stücknetz im Maulfeld“ (Linien → Stücke → Ganzzahlen → Muster; Bauplan und Kriterien in Abschnitt 6 der Recherche).
> Danach für das ganze Netz weitergeführt: [`docs/research/2026-10-21-netz-und-linien-gesamt.md`](research/2026-10-21-netz-und-linien-gesamt.md)
> — Zielbild „ein Liniennetz, ein Löser“, Prüfphase P1 „Umriss zuerst“ → P2 „Stücknetz im Maulfeld“ → P3 „Liniennetz am ganzen
> Körper“ (Abschnitt 6 dort, je mit Abbruchkriterien).
> **Bis Florian entschieden hat, nicht an den offenen Kernring-Fällen weiterbauen und nichts umbauen;** der Start-Prompt unten
> gilt erst, wenn er sich für den Kernring entscheidet.

## Vorgehen ab 22.10. (Vorschlag vom 21.10. spätabends; Florian entscheidet)

1. **Klarstellungen (Florian) kommen zuerst**, vor jedem Prüfplan, damit die Beweise das Richtige messen. Die Sitzung, die sie
   bekommt, legt sie als Erstes wörtlich in `docs/plans/2026-10-22-klarstellungen.md` ab, Bilder sofort unter
   `docs/look/klarstellungen-2026-10-22/`. Gliederung (Vorschlag):
   - Was bleiben soll (gefällt, nicht anfassen).
   - Was stört, am besten mit Bild.
   - Klarstellungen zum Zielbild: Umrisse, Linien, Härte, Maul, Posen, Bedienung.
   - Entscheidungen, die nur Florian treffen kann, zum Beispiel: welche Ansicht bei Widersprüchen gewinnt; Schleifen um den
     Mund ja oder nein; dünne Kanten als Klinge oder rund; Engstellen (Linie dicht an der Naht) als Grenze der Zeichnung.
   - Prüfwesen: drei bis fünf eigene Wesen oder Bögen, an denen die Beweise gemessen werden.
   - „Ich bin zufrieden, wenn …“: die Abnahme in seinen Worten.
   - Prioritäten und Budget: was zuerst sichtbar werden soll, Wochenlimit.
   - **Bausteine** (Zähne, Augen, Muster und Zonen, Shader, Anhängsel, Klingen) als eigener, klar getrennter Block: nur wörtlich
     speichern in `docs/plans/2026-10-22-bausteine-wuensche.md`. In der Gegenprüfung wird nur geprüft, was das Fundament dafür
     bereitstellen muss; geplant und gebaut werden sie erst nach den Beweisen, als eigene Phase im großen Plan.
2. **Gegenprüfung und Prüfplan (eine kurze Sitzung, ½–1 Tag, kein Code).** Eine frische Sitzung liest beide Recherchen und die
   Klarstellungen. Sie prüft das Zielbild „ein Liniennetz, ein Löser“ kritisch: Lücken, Denkfehler, bessere unkonventionelle
   Ideen, und ob die Beweise das Richtige testen. Dann schreibt sie den Prüfplan P1–P3 mit Florians Kriterien nach `docs/plans/`.
   Florian gibt frei. Der Prüfplan nimmt zwei Anker für die Bausteine mit: eine Zahnfleischreihe im Maul-Stücknetz (P2) und einen
   Augenumriss mit Brauenwulst als harte Linie (P3; der Brauenwulst scheiterte am 15.10. an der Topologie). Dazu kommen:
   - **ein Budget-Tor in P2 und P3:** Das Spielnetz auf Brettstufe hat höchstens 8 000 Dreiecke je Wesen, samt Maul. Heute bläht der
     Maul-Einsatz auf K2 den Käfig von 400 auf 9 500–13 000 Flächen auf; schon die Käfigflächen allein sind 19 000–26 000 Dreiecke.
     Ein Körper ohne Maul hat auf Stufe 1 3 200 Dreiecke, ein Mehrteiler 1 700–6 300. Messung:
     `apps/editor/scripts/pruefen/dreieck-budget.ts`.
   - **eine Spiel-Probe P0** (1–2 Tage, dazu etwa 30 Minuten von Florian am iPhone): 36 heutige Prüfwesen auf Stufe 1 und 2 als
     gebackene Netze mit Earle-Material, Kieferknochen, ein bis drei Morph-Zielen und Schatten, auf dem echten Brett in der echten
     Karte. Gemessen wird in Safari (WebGPU) und in der App (WKWebView, womöglich WebGL2) nach `docs/progress/karte-perf-iphone16.md`:
     fps, p99, Draw Calls. P0 hängt nicht vom Netz ab und kann vor oder neben P1 laufen.
3. **Beweise P1 → P2 → P3 (etwa 2–2,5 Wochen).** Streng nach Prüfplan, im Kern hinter Schaltern, nichts im Editor umgestellt,
   Kernring eingefroren. Nach jedem Beweis gibt es Kontaktbögen und Zahlen, dann urteilt Florian; die Abbruchkriterien gelten.
4. **Großer Plan (eine Sitzung, etwa 1 Tag).** Er baut auf den Ergebnissen auf: Bauweise, Reihenfolge des Umbaus, Einbau in den
   Editor und was vom heutigen Code bleibt. Florian gibt frei.
5. **Umbau Stück für Stück**, je mit Toren. Der heutige Stand bleibt Rückfall, bis ein Stück nachweislich besser ist.

**Stand der Bausteine** (Plan „Wesen-Editor 2“, Phasen 2–5; Einzelheiten im Kritik-Register):

| Baustein | gebaut | offen | hängt am Netz? |
|---|---|---|---|
| Earle-Material, Shader | live im Editor (Beweis 4: Tiger-Kopf, Zonen-Atlas, Ruhelage gegen schwimmende Muster) | Florians Urteil; Feuer ohne Verläufe, Gas weit von der Vorlage, Fell am weitesten vom Bogen (Beweis 5) | kaum (Deskriptoren, Atlas-Koordinaten) |
| Muster und Zonen | Muster im Material (Streifen, Flecken, Rosetten, Schuppen), Zonen-Atlas im Kern | Zonen im Editor als Vektorformen zeichnen (Phase 4) | ja, für die Lage auf der Haut |
| Zähne | Phase 2 M4: Zahnmodell, Zahnfleisch, Prüfung, Tafel, Ziehen | sitzen auf dem alten Maulbau; Florians Wunschliste (15.10. angekündigt: Überschneidungen erlaubt, runde Blobzähne, vor/zurück), „Setzen T“, Größe gegen die Referenz | ja, über das Zahnfleisch |
| Augen | Phase 2 M5: gemalte Augen mit Zuständen, Glubschauge und Augapfel, Höhle im Käfig | Brauenwulst ungelöst, kein Blick, Lid ohne Muster | gemalt nein; Höhle und Braue ja |
| Teile, Anhängsel | Beweis 3 (Säulenbein), Körper aus Teilen (S5–S7) | Teil-Bibliothek, Andocken, IK, Laufen (Phase 3) | ja, stark (Ansätze) |
| Klingen (Fell, Kämme, Flossen) | nur Beweis 5 | Phase 4 | ja, über Ansatzlinien |
| Posen und Rig | Teil B weitgehend gebaut | Daten hängen an Punktnummern | ja, Übertrag beim Neubau |
| Spiel-Export | – | Phase 5 | nein (gebackenes Netz) |

Start-Prompt für Schritt 2 (zum Einfügen; die eckige Klammer durch die eigenen Punkte ersetzen):

> Lies `CLAUDE.md`, `docs/UEBERGABE.md` (Abschnitt „Vorgehen ab 22.10.“) und die Recherchen
> `docs/research/2026-10-21-feldnetz-oder-kernring.md` und `docs/research/2026-10-21-netz-und-linien-gesamt.md`. Hier sind meine
> Klarstellungen: […]. Lege sie zuerst wörtlich in `docs/plans/2026-10-22-klarstellungen.md` ab (Bilder nach `docs/look/`),
> den Block „Bausteine“ getrennt in `docs/plans/2026-10-22-bausteine-wuensche.md` (nur speichern, nicht planen).
> Dann: (1) Gegenprüfung — ist „ein Liniennetz, ein Löser“ wirklich der eleganteste Weg zu meinem Zielbild? Suche Lücken,
> Denkfehler und unkonventionelle bessere Ideen und prüfe, ob die Beweise das Richtige testen. (2) Schreib den Prüfplan P1–P3 mit
> meinen Klarstellungen als Kriterien (Fälle, Messungen, Abbruchkriterien, Bilder je Schritt) nach `docs/plans/` und leg ihn mir
> zur Freigabe vor. Kein Code, kein Umbau.

Start-Prompt für Schritt 3 (nach der Freigabe):

> Lies `CLAUDE.md`, `docs/UEBERGABE.md` und den freigegebenen Prüfplan in `docs/plans/`. Führe P1 aus, streng nach Plan: im Kern
> hinter einem Schalter, nichts im Editor, nach jedem Tag Kontaktbögen und Zahlen, Abbruchkriterien strikt, nichts als bestanden
> melden. Danach P2, dann P3; nach jedem Beweis anhalten und mir die Bilder zeigen.

## Start der frischen Sitzung (nur, falls Florian beim Kernring bleibt)

Zum Einfügen (Florian):

> Lies `docs/UEBERGABE.md` und auf der Planseite `docs/plans/2026-10-21-maul-einsatz-weiter.md` „E2.6 Leiter — Bauplan“ und
> „Stand E2.6“. Weiter mit Teil A, E2: die zwei offenen Fälle (Rex mittel gerade: Knick an der Kreuzung der Falte mit der Linie;
> Robbe hoch J: Engstelle — zwei Leitern hintereinander oder als Grenze), dann E2.4 (A0 mit Hülle, P-Linien am Maul, Loops), dann
> E3.

Lesereihenfolge für die Sitzung:
1. `CLAUDE.md` (lädt von selbst: Stand, Regeln, Fallen; Einträge „2026-10-21 …“ unten in der Liste).
2. Diese Datei.
3. Planseite [`docs/plans/2026-10-21-maul-einsatz-weiter.md`](plans/2026-10-21-maul-einsatz-weiter.md): „Ursache am Mundwinkel und
   die Entscheidung“, „Schritte“ (E1–E6), „Stand E1“, die Nachträge E1, **„E2 im Detail“** und **„Stand E2“** (Ergebnis, was
   gebaut ist, verworfene Wege, offene Fälle).
4. Register [`docs/plans/2026-10-14-kritik-phase-0.md`](plans/2026-10-14-kritik-phase-0.md), „Befunde aus E2“ und „Befunde aus E1“.
5. Grundlage Teil A: [`docs/plans/2026-10-15-maul-einsatz-harmonie-posen.md`](plans/2026-10-15-maul-einsatz-harmonie-posen.md)
   (Festlegungen, Schritte A1–A14).

## Worum es geht

Florian 21.10.: „Weiter mit Teil A ‚Maul als Einsatz‘: Damit sollen glatte Haut, Querschnitt aus der Hülle, Linien exakt und Loops
auch mit Maul wirken.“ Heute schaltet ein Maul den Körper auf den alten Maulbau um (`ableitenMitMaul`) — ohne all das. Der Einsatz
dreht es um: A0 ist der Körper ohne Maul mit allem, was der Körper kann; das Maul wird in die verfeinerte Fläche von A0 eingesetzt
(Feld um die Maullinie, Karte, Topologie, Lippe, Haut lösen = A3–A7), außerhalb des Felds bleibt der Körper bitgleich.

Reihenfolge: E1 Gitter (Tore erreicht, Abnahme offen) → **E2 A0 wie im Editor (läuft)** → E3 Bau → E4 Editor, Maul zu
(**Florians Blick**) → E5 Öffnen → E6 Rest (Kiefer getrennt, Zähne, Augen, Rig, alter Maulbau raus, Abnahme).

Florians Aufträge am 21.10.: „zuerst die genaue Haut als Standard des Kernrings …, dann den Mundwinkel (Quadratgitter um c). Es
muss für alles eine elegante und saubere Lösung geben!“ — danach: „mach hier mit der Verdrehung an J-Linien weiter …, bis das
Mundwinkel-Tor auch an den vier J-Fällen hält.“ — danach: „Ja, mach hier mit E2 weiter (A0 wie im Editor, Rex und Robbe in die
Tore).“

## Stand E1/E2

- **Standard des Kernrings auf K2** (`einsatzFall(art, anfang, form)` ohne Optionen, `einsatzAblauf(f)` in
  `kern/pruefen/einsatzFall.ts`): **A0 wie im Editor** (Startkugel, eingefrorene Ringe, umgeformt, glatte Haut, „berühren
  mittel“), **Lippenziel auf der Haut** (wie der Schlitz, E2.6), Feld begradigt bis 1,5 Radien, Schlitz genau auf der Linie,
  Reihenzahl konform 10 … 16, Fächer um c als Halbkreis, Naht nach Bogenlänge auf einer umparametrisierten Karte, ein Ausgleich
  der Stufennaht, Ausgleich außen, letzte Lippenspanne 0,15 Feldkante, Spitzen von A0 übernommen, ohne Lippenwulst, **Leiter**
  (E2.6: wo eine Falte von A0 die Linie kreuzt und zur Naht läuft oder der Streifen zur Naht ein schmaler Keil ist, enden die
  Speichen der ersten q Lippenstellen auf der Naht). K1 und `FALL_ALT` bitgleich.
- **Leiter** (`einsatz/leiter.ts`, `einsatz/leiterGitter.ts`): Erkennen (Falte/Keil), Halbfeld am Hals geteilt, Ringkarte und
  Leiterkarte (Lippe und Naht gegenüber, keine Stauchung), Ringfeld als L-förmiges Kernring-Gitter (`kernGitterL`), Leiterfeld als
  Tutte-Gitter, je Hälfte ein Dreier- und ein Fünferpol, Lippe m = M − 2 + (q − 1)/2 (Leiterteil gleichmäßig, Ringteil nach
  Bogenlänge), an einer Falte eine Ecke der Lippe (`lippenPunkt/lippeAnpassen(…, ecken)`), Schärfe der Falte auf dem Hals und
  dem Stück über P, Stufennaht nie an der Reihe einer Spitze. Ohne Fund bitgleich.
- **Knickmaß** (`einsatzMessen`): Kanten im Umkreis einer Feldkante um eine Spitze (von A0, beim Einsatz auch die eigenen und Ecken,
  an denen drei Falten zusammenlaufen) zählen nicht.
- **Ganze Reihe** (43 ausgeglichene Fälle): Haut-Tor (≤ 0,25 px, Knick ≤ A0 + 2°, Lippe ≤ 1 px, nirgends umgeklappt) **41 von
  43**, Mundwinkel 43 von 43, Lippe ≤ 1 px 43 von 43; ohne Rex/Robbe Haut max 0,09 px. Bilder
  `docs/progress/editor/e2-spitzen-anfang-2026-10-21.jpg`, `docs/progress/editor/e2-leiter-2026-10-21.jpg`.
- **Offen** (Register „Befunde aus E2“): Rex mittel gerade (Knick 29,6° an der Kreuzung, Tor 29,1°; örtlich A0 ≤ 11°, Einsatz
  26–30°), Robbe hoch J (Engstelle 0,5 Feldkanten, faltet). E2.4 noch nicht gemessen.

## Nächste Schritte (in dieser Reihenfolge)

1. **Rex mittel gerade: Knick an der Kreuzung.** Bei gerade läuft die Falte von A0 0,5 px auf der Linie (zwei Schlitzpunkte),
   bevor sie unten zur Naht geht; der Knick sitzt in Reihe 1 neben P. Gemessen ohne Wirkung: halbscharfe Falte an der Lippe, Ecke
   der Lippe allein, stetige Lippenteilung, Stück fest auf der Falte. Erst die Lage von Falte, Lippe und Reihe 1 an P im Bild
   vergleichen (`kreuzung-bild`-Art: Käfig an P, Falten rot), dann lösen.
2. **Robbe hoch J: Engstelle** — zwei Leitern hintereinander (vor der Engstelle ohne Holme, dahinter bis zur Weite), oder Florian
   entscheidet, die Engstelle als Grenze der Zeichnung zu behandeln.
3. **E2.4:** A0 mit Querschnitt aus der Hülle (`A0PLAN='{"umrisseExakt":true}'`), P-Linien am Maul, Loops — je Variante die
   ganze Reihe; Falten, die den Schlitz kreuzen, sind jetzt die Leiter (E2.3 a/b gebaut).
4. **E3** (`maulEinsatzBauen`, eingefrorene Topologie im Dokument, schneller Zugweg), **E4** (Schalter „Maul: Einsatz“ im
   Editor, Maul zu → Florians Blick), E5, E6.

**Nicht wiederholen** (gemessen und verworfen, Planseite „Nachtrag E1“ bis „Nachtrag E1 (dritte Sitzung)“): Gewichte nach
Hautlänge am Mundwinkel, radiale Umparametrisierung, Ideallage nur innen, innere Stufe in W', Polarkoordinaten um c; Normalenbindung
in A7, Zellform als Quadrate (MIPS: logarithmisch-polare Spirale um c), Zellform zur Kissen-Vorlage, Reihen nach Hautlänge auf den
Kartenspeichen, Naht der Stufen glätten, Karte auf feinerem Netz, Feld verlängern; Übergangsreihe mit Polpaaren, symmetrischer
Schlitz in der Karte, Auffaltung der Karte an der Spitze, Ortskarte, reines Band ohne Kappe, Fächer als Quadrat, Fächer hinterher
drehen, Fächer um den Kontrollpunkt c (faltet, wo die Linie neben der Haut liegt); (E2) eine Stufe statt zwei, Verdrehung
anteilig in Reihe J_i, Reihe J_i weiter außen, Fächerachse aus Endtangente oder letzter Lippenkante, Fächerradius = letzte
Lippenspanne, ganzer Ring um c fest, drei Schritte Nahtausgleich, Polpaare für die Verdrehung, Ecke am Linienanfang ohne
passende Lippe.

Je Schritt: Planseite „Stand …“ nachtragen, Register, Bilder, commit + push; nichts als „bestanden“ melden ohne Florian.

## Fallen aus E2.6 (Leiter)

- **Die Ursache prüfen, bevor man baut:** Robbe hoch war kein spitzer Anfang (78°), sondern ein langer schmaler Keil zwischen
  Linie und Naht — in einem Streifen zwischen zwei *benachbarten* Seiten des Kartenrechtecks laufen Reihen und Speichen beide
  längs, in jeder Lage. Die geplante Eckenentfaltung hätte nichts geholfen.
- **Zählung:** Jede Sprosse spart dem Feldrand eine Speiche — die Lippe muss um (q − 1)/2 wachsen, q ungerade.
- **Coons-Flächen tragen keine langen, eingeschnürten Streifen** (Robbe hoch J faltete) — Leiterfeld in seiner eigenen Karte
  mit Tutte legen.
- **Lippenteilung an P stetig halten:** konform in der Ringkarte sprang sie an P auf das Doppelte.
- **Käfig und Lippe brauchen dieselbe Regel** (wieder): An einer Kreuzung laufen im Käfig drei scharfe Kanten zusammen (Ecke),
  also hat auch die angepasste Lippe dort eine Ecke.
- **Globaler gegen örtlichen Vergleich:** Das Knick-Tor vergleicht mit dem größten Knick von A0 im Feld — an der Kreuzung hat A0
  örtlich 11°, der Einsatz 26–30°; Rex mittel J liegt nur deshalb im Tor, weil A0 an der Schnauzenspitze 27° hat.
- **Langsame Reihe:** Läuft Florian gleichzeitig Chrome/Photoshop, braucht die ganze Reihe 30–40 min statt 5.

## Werkzeuge

- **Tests:** `packages/shape/src/kern/einsatz/kernring.test.ts` (Lippe als Falte, Topologie an 54 Fällen auf K2, Wächter: genaue
  Haut an drei Fällen, Mundwinkel an drei J-Linien, keine umgeklappte Zelle an Robbe hoch, Spitzen von A0 an Robbe mittel und Rex
  mittel), `kernring.extrem.ts` (ganze Reihe: Haut-Tor an allen Körpern außer `OFFEN`, dasselbe über alle Fälle als `it.fails`,
  Mundwinkel-Tor an allen; `npx vitest run -c vitest.extrem.config.ts src/kern/einsatz/kernring.extrem.ts` aus `packages/shape`,
  ≈ 5 min), dazu die übrigen `einsatz/*.test.ts` (`FALL_ALT`, bitgleich). Lauf:
  `pnpm --filter @ee/shape test`.
- **Messskripte** (aus `packages/shape`: `npx vite-node ../../apps/editor/scripts/pruefen/<datei>`):
  - `teilA/e1-reihe-k2.ts` — ganze Reihe nach dem Standard (≈ 4 min, im Hintergrund): je Fall Haut, Knick, Mundwinkel (je gegen
    A0), umgeklappt, Güte, Lippe, Leiter; Summe am Ende. Umgebung `FAELLE`, `LAGE` (karte/band), `J`, `ECKE`, `WULST`, `VERL`,
    `FELD`, `KAPPE`, `FAECHER`, `NAHT`, `A0` (alt|editor), `A0PLAN`, `NR`, `SPITZEN`, `LAH` (0 = Lippenziel aus der Linie),
    `LEITER` (0 = ohne Leiter), `AUS` (JSON-Zeilen). `A0=alt ECKE=0.25 NAHT=karte NR=0 SPITZEN=0 LAH=0 LEITER=0` = Stand vor E2.
  - `einsatz-loesen.ts` — Nahaufnahme des Mundwinkels (A0 · Einsatz · Abstand · Zebra): `NEU=1 NAH=3` (NAH in Feldkanten, fester
    Ausschnitt; `ANFANG=1` um den Linienanfang), optional `J`, `ECKE`, `WULST`, `LAGE`, `KAPPE`, `FAECHER`, `NAHT`, `A0`, `NR`,
    `SPITZEN`, `LAH`, `LEITER`, `STELLE` (Ausschnitt um eine Lippenstelle, z. B. den Hals), `AUSGABE` (Ordner); Bild mit
    `node scripts/pruefen/html-shot.mjs <html> <png> 1300` (aus `apps/editor`).
  - `teilA/e1-gitterbild.ts` — Gitter als SVG (`AUSGABE=<datei.html>`, `NAH`, `ANFANG`, `LAGE`, `ECKE`, `KAPPE`, `FAECHER`,
    `NAHT`, `A0`).
  - `teilA/e1-haut.ts`, `teilA/e1-reihe.ts`, `teilA/e1-faecher.ts`, Kissen-Vorversuche wie bisher.
- **Fälle:** `<körper>/<anfang>/<form>` (z. B. `kugel/mittel/gerade`, `ei/tief/j`, `langhals/hoch/j`), Liste `einsatzFaelle()`;
  „ausgeglichen“ = Linie ≤ 1 px auf der Haut (`hautAbstand`), das sind 39 von 54.

## Fallen aus E1

- **Mundwinkel nicht in Lippenspannen messen:** Ein Messbereich, der an der letzten Lippenspanne hängt, schrumpft mit ihr und
  schönt jede Verkleinerung der Spanne. Fester Umkreis (drei Feldkanten) für Maß und Bilder.
- **Lippenwulst und K2 vertragen sich nicht:** Ein schmales Band mit 0,4 px Höhe löst der feinere Käfig auf (Steigung bis 12°) —
  3–5° Knick längs der Lippe. Wer Abstand zwischen geschlossenen Lippen will: in der Tasche (A8), nicht in der Haut.
- **Schlitz und Linie müssen aufeinander liegen:** Ein Kantenpfad bis 2,8 px neben der Linie gibt am Mundwinkel 160–179°.
- **Feste Ränder einer Tutte-Stufe müssen zueinander passen:** Nahtspeichen nach Bogenlänge und eine Reihe auf ihrer Kartenlinie
  widersprechen sich, sobald die Karte längs der Naht ungleich dehnt — der Rand der äußeren Stufe läuft zurück, Zellen klappen um.
  Alles, was in einer Stufe fest ist, in denselben Koordinaten setzen.
- **Vorgaben auf der Haut aus Lagen der Haut bauen:** Der Kontrollpunkt c der Lippe liegt neben der Haut, wenn die Linie es tut;
  ein Kreis um ihn faltete 19–32 Zellen. Mittelpunkt ist die Lage von c in der Karte.
- **Ein größeres Feld macht Fälle erst echt:** Mit dem ganz begradigten Feld fielen Rex/Robbe auf eine grobe Lippe zurück (m = 14)
  und zeigten Fehler nicht, die das Band um die Linie zeigt. Nach einer Feldänderung immer die ganze Reihe samt Rex/Robbe und die
  15 Fälle neben der Haut ansehen (`umgeklappt` über alle 54).
- **Konforme Lagen sind um c gestaucht** und die Karte zeigt am Linienende nicht in die Verlängerung — Lagen, die Richtungen der
  Karte an c übernehmen, falten (Reihen nach Hautlänge: 179°).
- Nachbarlisten für `normalSystem` ohne doppelte Einträge übergeben: Cuthill–McKee reiht sonst Punkte doppelt ein, die Zerlegung
  bricht mit „nicht positiv definit in Zeile 0 (0)“ ab.
- Tests an der Naht: −0 gegen 0 scheitert an `toBe` — Fehler sammeln und vergleichen, nicht je Wert `toBe`.
- Gegenproben am alten Code mit `git stash push -- <nur die Quelldateien>`, dann `git stash pop` (vorher `git diff` sichern).

## Fallen aus E2

- **Käfig und Lippe brauchen dieselbe Regel:** Eine Ecke an U₀ nur im Käfig (Punktschärfe) ohne die Ecke in der Lippenanpassung
  machte die Haut schlechter (Rex mittel 0,5 → 3,8 px). Jede Regel am Lippenrand gilt in Topologie, Lippe (A6), Lösen (A7) und
  Messen gleich (`t.lippenAnfang`).
- **Reihenwahl in der Koordinate der Reihen:** Mit umparametrisierter Naht liegen die Reihen in U'; ein scharfer Nahtpunkt, dessen
  Reihe noch in U gesucht wurde, landete auf der falschen Reihe, die Nahtpunkte verloren ihre Ordnung (168–179°).
- **Knick an Spitzen nicht messen:** Der Winkel zwischen den feinen Flächen an einer Spitze hängt am Netz; der Umkreis muss den
  Käfig-Ring der Spitze fassen (eine Feldkante, eine halbe reichte nicht).
- **Ergebnisse doppelt prüfen:** Ein Lauf mit `SPITZEN=1` zeigte einmal keine Wirkung, der nächste schon — wichtige Zahlen mit einem
  zweiten Weg bestätigen (Einzelskript und Reihe).

## Davor (V0–V6, Abnahme offen)

Maßgeblich bleibt der am 20.10. freigegebene Plan
[`docs/plans/2026-10-20-vektorillustration-bedienung.md`](plans/2026-10-20-vektorillustration-bedienung.md) (Stände V0–V6.4 am
Ende der Seite); Teil A ist der Block, den Florian am 21.10. früh davor gezogen hat. Gebaut und im Editor (Abnahme offen): V0
Fallen und Bedienfehler, V1 Prüfstand „Extremreihe“, V3 G/S/R und proportional in den Blättern, V4 Querschnitt aus der Sichthülle,
V5 P-Linien als Käfigschleifen, V6 ⌘R-Loops (Bühne und Blätter, G/S/R, mehrere Loops); V2-Linien nicht abgenommen („sehr sehr
wild“, standardmäßig aus). Offen danach: V6-Rest (jeden Käfigring als Loop, Loops auf „Teile“/mit Maul), V5-Rest (Lage 0,3 px,
Grat), V7 ein Körper, V8 Vektor-Ausgabe, V9 Abnahme.

## Arbeitsregeln

- Ein Schritt nach dem anderen, Bild und Stand je Schritt; keine Meldung „fertig/bestanden“ ohne Florian. Nach Fehlanläufen nicht
  stur anhalten (Florian 20.10.): Ursache verstehen, die elegantere Lösung suchen; technische Wege selbst entscheiden und begründet
  auf die Planseite schreiben. Maßstab: Netz immer glatt und schön außer an gewollten Kanten.
- Jede Korrektur mit einem Test, der vorher rot ist; verfehlte Tore als `it.fails` mit Registereintrag, nie still gelockert. Neue
  Wege hinter Schaltern, ohne sie bitgleich.
- Mit Florians Ablauf testen (Kugel → umformen → Maul). Immer sagen, was im Editor ist und was nur im Kern (Teil A: bisher nur
  Kern).
- Eigener Vite auf 5192 (`apps/editor/scripts/pruefen/run-check.sh`), nie Florians 5180, seinen Dev-Server nicht starten. Während
  eines E2E-Laufs keine Dateien unter `apps/editor/src` oder `packages/shape` ändern; E2E-Läufe überschreiben Bilder in
  `docs/progress/editor/` — vor dem Commit zurückholen. Nie `assets/fonts/Hippie Movement.otf` committen; nie in
  `~/Documents/early earle Editor/Bibliothek` schreiben.
- Keine Modellnamen in Commits, Docs oder Code. Nach jedem Teilschritt committen und pushen; diese Datei am Ende jedes Blocks
  überschreiben.
