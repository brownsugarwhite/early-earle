# Übergabe (aktueller Stand)

> Diese Datei wird am Ende jedes Arbeitsblocks **überschrieben**: Wo stehen wir, was ist offen, was ist der nächste Schritt. Historie in Git.

**Stand:** 2026-10-12 mittags. Sitzung „Maul, Zähne, Rig: Recherche und Versuche“ auf Florians Mac, Vorbereitung der großen Fable-Sitzung ab 13.10.
- Branch `claude/editor-grundlayout`, gepusht. Merge nach `main` erst nach Florians Abnahme.
- Plan: [`docs/plans/2026-10-12-maul-zaehne-rig.md`](plans/2026-10-12-maul-zaehne-rig.md)
- **Ergebnis-Dokument:** [`docs/research/2026-10-12-maul-kiefer-zaehne-augen.md`](research/2026-10-12-maul-kiefer-zaehne-augen.md), als Seite: https://claude.ai/artifact/WG3YJPn4SuL5acnY9yR9s1
- Gedächtnis des Editors: [`apps/editor/CLAUDE.md`](../apps/editor/CLAUDE.md)

Vorher: Grundlayout, Navigation und Kurven (11.10.) siehe `git show 902965d:docs/UEBERGABE.md`, alte Wesen-Werkstatt `git show 6029362:docs/UEBERGABE.md`.

## Florians Auftrag (12.10.)

Ablauf:
1. Körper aus Silhouetten und Kanten.
2. Maul-Tab (blau): Linie ab Achse bzw. Kontur bis zum Mundwinkel.
3. Kiefer gleich oder getrennt schon geschlossen (Überbiss, Unterbiss, Lippenbreite).
4. Offener Zustand. Das Maul wird automatisch ins Netz geschnitten, die Tasche morpht.
5. Zahn-Tab (braun): Anzahl je Kiefer, Zahnmenü (Rundheit, Schärfe, Neigung); Riesenzähne offen größer.

Dazu:
- Rig-Tab in allen Viewports, Augen evtl. als eigener Tab (Schlitzauge bleibt).
- **Seitenleiste rechts immer offen.**
- Danach Beine, Flügel, Schuppen, Muster, Shading. Die Wesen sollen dynamisch bleiben, Varianten erzeugt der Assistent selbst.

**Florians Frage zu den Lofts (12.10.):** Wir bleiben bei **Shapes → Loft → Käfig**.
- Der Loft (Querschnitte aus den drei Profilen) legt die Form fest.
- Der Catmull-Clark-Käfig ist das Netz darüber: Kanten, Maulschnitt, feste Topologie.
- Lange Hälse brauchen einen Loft entlang einer gebogenen Wirbelsäule.

## Was steht

**Bedien-Versuch im Editor** (E2E `apps/editor/e2e/maul.spec.ts` plus die 12 bisherigen, alle grün mit WebGPU):
- **Seitenleiste immer offen:** Tab-Menü oben, Library unten (aufklappbar, ⌘L). Die Viewports sind 604 px breit, das maximierte Quadrat 988 px.
- **Tab-Punkte:** braun Zähne, blau Maul, weiß Augen (Platzhalter), orange Rig (auch im 3D), pink vergrößern. Zustand `ebene` in `uiStore`.
- **Maul-Tab:**
  - Zeichenstift: Der Start rastet auf Achse bzw. Kontur ein, Punkte holen ihre Tiefe von der Fläche (`src/maul/maulFlaeche.ts`), Enter beendet.
  - Bearbeiten über 3D-Knoten, je Ansicht zwei Koordinaten (`packages/shape/src/versuch/linie3d.ts`).
  - Kiefer gleich/getrennt, Tab Fressen = offen (Vorschlag aus „zu“).
  - Regler „Öffnung“; das 3D baut beim Loslassen (`src/maul/maulKoerper.ts`).
- **Zahn-Tab:**
  - Anzahl je Kiefer, symmetrisch gesetzt; Regler je Zahn (im Tab Fressen für offen).
  - Die Zähne erscheinen **im 3D** am Zahnfleisch und folgen Öffnung, Knochen und Korrektur.
  - Seite und Front zeigen sie als Umrisse (`src/maul/ZahnEbene.tsx`): Klick wählt, Ziehen verschiebt längs des Zahnfleischs, der Spiegelpartner folgt.
  - Zähne, die geschlossen stören, sind rot (2D und 3D). Befund und Vorschläge stehen in der Leiste, ein Klick übernimmt.
- **⌘Z nach Reglern** wirkt jetzt. Vorher schluckte der fokussierte Regler das Kürzel.
- **Rig-Tab:** Anzeige der geschätzten Gelenke und Knochen (`src/maul/RigZeichnung.tsx`).
- **Dokument:** `maul` (3D-Lippenlinien zu/auf) und `zaehne` (Zahnreihen mit Werten für offen), optional in Version 0 (`packages/shape/src/dokument.ts`), Rundreise getestet.

**Technik-Versuche** (`packages/shape/src/versuch/`, Tests grün):

| Datei | Inhalt |
|---|---|
| `maul.ts` | Maul-Käfig mit fester Topologie (378 Punkte). Naht mit oberer/unterer Kopie und Reißverschluss bis zum offenen Mundwinkel; Ringe auf die Linie verteilt, mit Lippenband. Tasche: geschlossen eine Linse, offen eine Bohne. Getrennte Unterlippe, verdeckt nach innen. Offene Haut per ARAP an Lippen und offener Seitensilhouette. `maulZwischen` mit Knochen + Korrektur, `reissverschluss` |
| `kiefer.ts` | Starre Anpassung (Horn), Schraubachse, Öffnungsart, LBS, ARAP; synthetisch exakt (`kiefer.test.ts`) |
| `flaechenlinie.ts` | Linie auf der Fläche (Strahlraster auf S0), Ziehen in jeder Ansicht, Konsistenzmaß |
| `pruefen.ts` | Selbstdurchdringung (mit Bereichen), Orientierung, Randketten durch Unterteilungen |
| `vorlagen.ts`, `vorlagen/*.json` | Tiger, Rex, Robbe, Langhals als Testvorlagen |
| `zaehne.ts` | Zähne am Zahnfleisch (feste Stelle u, Rahmen zum Gegenkiefer, Form, „außen“, Werte für offen), Netze, Prüfung im geschlossenen Maul mit Vorschlägen; 12 Tests |

- **Nachgezogen:** Rex, Robbe und Langhals aus Florians Bögen (`apps/editor/scripts/nachziehen/`, Daten unter `apps/editor/public/versuch/<wesen>/`, Prüfbögen `docs/progress/editor/nachziehen-*.png`).
- **Augen-Versuch:** Florians Augenumrisse sind auf die Haut gemalt (Rex Mandel, Robbe Knopf, Langhals Schlitz) und fahren mit dem Schädel mit (`docs/progress/editor/augen-*.png`).
- **Rex mit Zähnen:** 14 Oberzähne außen nach Bogen 06 (`zaehne-rex-*.png`, `vergleich-zaehne-rex.png`). Die Prüfung meldet 4: Überlappung an der Schnauzenspitze, 0,7 px im Unterkiefer, 0,9 px zu wenig Luft.
- **Ansehen:** `?versuch=maul&wesen=tiger|rex|robbe|langhals&zustand=zu|0.5|auf&kaefig=1&nah=1` (`&zaehne=0` ohne Zähne). Bilder macht `node apps/editor/scripts/maul-bilder.mjs <wesen> [ordner] [zustände] [azimut]`.

**Wichtigste Messwerte:**
- Lippenkante 1,5–2,8 px genau.
- Gelenkschätzung synthetisch < 0,1°.
- Rex: Unterkiefer 52°, Restanteil 25 % (gemischt). Robbe: Ziehen. Tiger: Unterkiefer gedehnt (+61 %). Langhals: Kopf kippt 36°.
- Florians Ansichten widersprechen sich: offen bis 20 px, Rex Breite Front/Top 7–9 %.

## Offen (Reihenfolge für die große Sitzung)

1. **Wirbelsäulen-Röhre:** Der Langhals zerfällt mit Ringen entlang x. Dazu Pose-Profile mit gleicher Punktstruktur; der Bedien-Versuch nutzt für zu und offen dieselben Profile.
2. **Durchdringungen beseitigen.** Geschlossen sind es 130 (Tiger) bis 1100 Dreieckspaare, offen 300 bis 2100. Ursachen (Rückverfolgung auf Käfigflächen):
   - Ein einzelner Mundwinkelpunkt → Mundwinkel-Zone mit Halbwinkel-Knochen.
   - Die Anpassung schwingt über → Ausgleich mit Laplace-Regularisierung, Grenzmasken.
   - Tasche gegen Lippen → Tasche als Versatz der Kiefer-Innenflächen plus Schieben per Abstandsfeld; beim Überbiss eine S-Spalte.
   - Der Unterkiefer schwenkt in Kehle oder Boden → Kehlkette und Bodengrenze.
3. **Zähne:** Der Versuch steht. Zu entscheiden bzw. zu bauen:
   - Rahmen je Öffnungsart (Kippen am Knochen, Ziehen an den Lippen).
   - Option „senkrecht in der Seite“: Im Rex-Bogen stehen die Zähne senkrecht, im Versuch kippen sie nach hinten.
   - Berührung erlauben, Prüfung auch offen und bei Zwischenstufen.
4. **Rig-Tab bearbeitbar:** Gelenk ziehen, die Linien folgen dem Knochen (Korrektur relativ zum Kiefer).
5. **Augen-Tab:**
   - An der Fläche verankert (Käfigfläche plus Lage) statt starr am Kiefer. Beim Langhals sinkt das starre Auge offen ein.
   - Gemalt als Abstandsfeld im Körpershader (Schlitz, Knopf, Mandel, Ausdruck), danach Kugel und Mandel mit Lidöffnung im Netz.
6. **Spiel-Laufzeit:** Skinning, höchstens 3 Morph-Ziele, Reißverschluss als Attribut je Punkt. Danach Beine (Rig-Vorlagen und Gangtabelle nach Spore) und der Variantengenerator.

Außerdem:
- **Florians Abnahme** steht aus:
  - Bedienung (Seitenleiste, Tab-Punkte, Farben für Rig und Augen sind vorläufig)
  - Grundlayout, Glas, Ornament (Entwürfe von mir)
- Kein Schließen-Schutz, kein App-Icon (wie 11.10.).

## Nächster Schritt

Florian probiert den Maul-Tab aus und entscheidet die Reihenfolge der großen Sitzung (Vorschlag oben).

Einstieg für Fable:
- `docs/research/2026-10-12-maul-kiefer-zaehne-augen.md`, Abschnitte 4–6
- `packages/shape/src/versuch/maul.ts`
- `apps/editor/src/maul/`
