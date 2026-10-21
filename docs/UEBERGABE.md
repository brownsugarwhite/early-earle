# Übergabe (Stand 21.10.2026, dritte Sitzung: Teil A „Maul als Einsatz“, E1 — Haut und Mundwinkel-Tor erreicht, weiter mit E2)

Branch `claude/editor-grundlayout`, PR mit Auto-Fix. **Diese Datei ist der Einstieg für eine frische Sitzung.** Alles zu Teil A
liegt bisher nur im Kern (`packages/shape/src/kern/einsatz/`); im Editor ist davon noch nichts zu sehen.

## Start der frischen Sitzung

Zum Einfügen (Florian):

> Lies `docs/UEBERGABE.md` und auf der Planseite `docs/plans/2026-10-21-maul-einsatz-weiter.md` den „Nachtrag E1 (dritte
> Sitzung)“. Weiter mit Teil A, E2: A0 wie im Editor (glatt, berühren, Hülle, Linien, Loops; mein Ablauf Kugel → umformen → Maul),
> Falten von A0 im Feld laufen auf einer Spalte weiter — damit Rex und Robbe in die Tore kommen.

Lesereihenfolge für die Sitzung:
1. `CLAUDE.md` (lädt von selbst: Stand, Regeln, Fallen; Einträge „2026-10-21 …“ unten in der Liste).
2. Diese Datei.
3. Planseite [`docs/plans/2026-10-21-maul-einsatz-weiter.md`](plans/2026-10-21-maul-einsatz-weiter.md): „Ursache am Mundwinkel und
   die Entscheidung“, „Schritte“ (E1–E6), „Stand E1“, die Nachträge E1 und vor allem **„Nachtrag E1 (dritte Sitzung)“** (Ergebnis,
   was gebaut ist, verworfene Wege, offene Befunde).
4. Register [`docs/plans/2026-10-14-kritik-phase-0.md`](plans/2026-10-14-kritik-phase-0.md), „Befunde aus E1“.
5. Grundlage Teil A: [`docs/plans/2026-10-15-maul-einsatz-harmonie-posen.md`](plans/2026-10-15-maul-einsatz-harmonie-posen.md)
   (Festlegungen, Schritte A1–A14).

## Worum es geht

Florian 21.10.: „Weiter mit Teil A ‚Maul als Einsatz‘: Damit sollen glatte Haut, Querschnitt aus der Hülle, Linien exakt und Loops
auch mit Maul wirken.“ Heute schaltet ein Maul den Körper auf den alten Maulbau um (`ableitenMitMaul`) — ohne all das. Der Einsatz
dreht es um: A0 ist der Körper ohne Maul mit allem, was der Körper kann; das Maul wird in die verfeinerte Fläche von A0 eingesetzt
(Feld um die Maullinie, Karte, Topologie, Lippe, Haut lösen = A3–A7), außerhalb des Felds bleibt der Körper bitgleich.

Reihenfolge: E1 Gitter (Tore erreicht, Abnahme offen) → **E2 A0 wie im Editor** → E3 Bau → E4 Editor, Maul zu (**Florians
Blick**) → E5 Öffnen → E6 Rest (Kiefer getrennt, Zähne, Augen, Rig, alter Maulbau raus, Abnahme).

Florians Aufträge am 21.10.: „zuerst die genaue Haut als Standard des Kernrings …, dann den Mundwinkel (Quadratgitter um c). Es
muss für alles eine elegante und saubere Lösung geben!“ — danach: „mach hier mit der Verdrehung an J-Linien weiter …, bis das
Mundwinkel-Tor auch an den vier J-Fällen hält.“

## Stand E1

- **Standard des Kernrings** (`einsatzFall(art, anfang, form)` ohne Optionen, `einsatzAblauf(f)` in
  `kern/pruefen/einsatzFall.ts`): Feld auf **K2, begradigt bis 1,5 Radien** (`kappe`), Schlitz genau auf der Linie
  (`schnittAufLinie`), Reihenzahl konform 10 … 16, **Fächer um c als Halbkreis** (`faecherKreis`, `faecher: 'kreis'`),
  **Nahtspeichen auf den Kartenlinien** (`naht: 'karte'`), Ausgleich außen 6 Runden, letzte Lippenspanne ¼ Feldkante, ohne
  Lippenwulst. Dünn besetzte Normalgleichungen in Lage und A7; ein Fall ≈ 3–7 s. Schleifengitter, K1 und `FALL_ALT` (K1,
  Kantenpfad) bleiben bitgleich.
- **Ganze Reihe** (39 ausgeglichene Fälle): Haut ≤ 0,25 px in 30 von 30 ohne Rex/Robbe (max 0,09, Median 0,07); **Mundwinkel-Tor
  (≤ A0 + 2°) in 30 von 30** ohne Rex/Robbe (größter Abstand 1,5°, J-Linien 0,9°); Knick im Feld höchstens A0 + 1,9°; Lippe
  ≤ 0,44 px; keine umgeklappte Zelle in allen 39 (über alle 54 Fälle eine, Langhals mittel gerade mit der Linie 21 px neben der
  Haut); außen bitgleich, Spiegel bitgenau. Bild der vier J-Fälle vorher/nachher:
  `docs/progress/editor/e1-mundwinkel-j-linien-2026-10-21.jpg`.
- **Was es brauchte** (Planseite „Nachtrag E1 (dritte Sitzung)“): Nicht die Verdrehung (die Polpaare wären der falsche Hebel
  gewesen), sondern (1) ein Feld, das das Band um die Linie bleibt (ganz begradigt wuchs es über den Kopf, das reine Band hatte
  Buckel mit Fünferpolpaaren), (2) der Fächer um c als Halbkreis auf der Haut (aus der Karte lag er gekippt), (3) Nahtspeichen auf
  den Kartenlinien (nach Bogenlänge passten sie nicht zu Reihe J_i, Robbe hoch und Rex klappten um).
- **Rex/Robbe** (bis E2 außerhalb der Tore): nichts mehr umgeklappt, Knick 9–43° statt bis 179°, Haut 0,08–1,0 px statt bis 4 px.
  Rest an Rex mittel und Robbe hoch: A0 trägt dort eigene Falten im Feld (Schnauzenkante 105°, Kerbe 18°).
- **Versuch „Band“** (`einsatzTopologie(…, { lage: 'band', feldDreiecke })`) bleibt als Option, ist nicht Standard.

## Nächste Schritte (in dieser Reihenfolge)

1. **E2** (A0 wie im Editor: glatt, berühren, Hülle, Linien, Loops; Florians Ablauf Kugel → umformen → Maul). Falten von A0 im
   Feld laufen auf einer Spalte weiter — das holt Rex und Robbe in die Tore (heute ausgenommen). Dabei der **spitze
   Schlitzanfang** (Robbe hoch: die Linie trifft die Naht spitz, Zellen an Reihe J_i bis 57 : 1; Weg: Reihe J_i nahe der Naht nach
   Bogenlänge statt über den Lippenstellen, oder ein eigener Schlitzanfang) und **Rex tief J** am Mundwinkel (8,6° bei A0 4,3°).
2. **E3** (`maulEinsatzBauen`, eingefrorene Topologie im Dokument, schneller Zugweg), **E4** (Schalter „Maul: Einsatz“ im
   Editor, Maul zu → Florians Blick), E5, E6.
3. Klein, wenn es stört: spitze Zellen in der letzten Zellreihe am Feldrand (bis 1,4°, Knick unauffällig).

**Nicht wiederholen** (gemessen und verworfen, Planseite „Nachtrag E1“ bis „Nachtrag E1 (dritte Sitzung)“): Gewichte nach
Hautlänge am Mundwinkel, radiale Umparametrisierung, Ideallage nur innen, innere Stufe in W', Polarkoordinaten um c; Normalenbindung
in A7, Zellform als Quadrate (MIPS: logarithmisch-polare Spirale um c), Zellform zur Kissen-Vorlage, Reihen nach Hautlänge auf den
Kartenspeichen, Naht der Stufen glätten, Karte auf feinerem Netz, Feld verlängern; Übergangsreihe mit Polpaaren, symmetrischer
Schlitz in der Karte, Auffaltung der Karte an der Spitze, Ortskarte, reines Band ohne Kappe, Fächer als Quadrat, Fächer hinterher
drehen, Fächer um den Kontrollpunkt c (faltet, wo die Linie neben der Haut liegt).

Je Schritt: Planseite „Stand …“ nachtragen, Register, Bilder, commit + push; nichts als „bestanden“ melden ohne Florian.

## Werkzeuge

- **Tests:** `packages/shape/src/kern/einsatz/kernring.test.ts` (Lippe als Falte, Topologie an 54 Fällen auf K2, Wächter: genaue
  Haut an drei Fällen, Mundwinkel an drei J-Linien, keine umgeklappte Zelle an Robbe hoch), `kernring.extrem.ts` (ganze Reihe:
  Haut-Tor samt „nirgends umgeklappt“, Mundwinkel-Tor; `npx vitest run -c vitest.extrem.config.ts src/kern/einsatz/kernring.extrem.ts`
  aus `packages/shape`, ≈ 4,5 min), dazu die übrigen `einsatz/*.test.ts` (`FALL_ALT`, bitgleich). Lauf:
  `pnpm --filter @ee/shape test`.
- **Messskripte** (aus `packages/shape`: `npx vite-node ../../apps/editor/scripts/pruefen/<datei>`):
  - `teilA/e1-reihe-k2.ts` — ganze Reihe nach dem Standard (≈ 4 min, im Hintergrund): je Fall Haut, Knick, Mundwinkel (je gegen
    A0), umgeklappt, Güte, Lippe; Summe am Ende. Umgebung `FAELLE`, `LAGE` (karte/band), `J`, `ECKE`, `WULST`, `VERL`, `FELD`,
    `KAPPE`, `FAECHER`, `NAHT`, `AUS` (JSON-Zeilen). `KAPPE=0 FAECHER=tutte NAHT=bogen` = Stand der zweiten Sitzung.
  - `einsatz-loesen.ts` — Nahaufnahme des Mundwinkels (A0 · Einsatz · Abstand · Zebra): `NEU=1 NAH=3` (NAH in Feldkanten, fester
    Ausschnitt), optional `J`, `ECKE`, `WULST`, `LAGE`, `KAPPE`, `FAECHER`, `NAHT`, `AUSGABE` (Ordner); Bild mit
    `node scripts/pruefen/html-shot.mjs <html> <png> 1300` (aus `apps/editor`).
  - `teilA/e1-gitterbild.ts` — Gitter als SVG (`AUSGABE=<datei.html>`, `NAH`, `LAGE`, `ECKE`, `KAPPE`, `FAECHER`, `NAHT`).
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
