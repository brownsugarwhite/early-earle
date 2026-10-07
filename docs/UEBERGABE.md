# Übergabe (aktueller Stand)

> Diese Datei wird am Ende jedes Arbeitsblocks **überschrieben**: Wo stehen wir, was ist offen, was ist der nächste Schritt. Historie in Git.

**Stand:** 2026-10-08 früh (Nachtschicht), Sitzung „Wesen-Werkstatt“ (Florians Mac, Branch `main`). Pläne: [`docs/plans/2026-10-07-wesen-werkstatt.md`](plans/2026-10-07-wesen-werkstatt.md) (v1) und [`docs/plans/2026-10-07-wesen-werkstatt-v2.md`](plans/2026-10-07-wesen-werkstatt-v2.md) (Lückenliste, Formen aus Profilkurven, Held zuerst). **Zielsystem:** [`docs/look/wesen-refs/ZIELSYSTEM.md`](look/wesen-refs/ZIELSYSTEM.md) — gemessene Zieltabelle je Wesen aus Florians 19 Bildern (`docs/look/wesen-refs/`, Ausschnitte in `crops/`, Messwerkzeug `scripts/wesen/messen.mjs`). **Nur Florians Prompt und die 19 Bilder sind Referenz.** Florian will morgen gemeinsam weitermachen.

## Milestone dieser Nacht: das Maul als Lippenschnitt

Florian: „Alle Linien und Kanten scharf, mit schönen Übergängen und NIE ausgefressen.“ Der Höhlenschnitt im Distanzfeld konnte das nicht (Dual Contouring legt am Schnitt einen Vertex je Zelle → Treppe, Farbe läuft dreiecksweise über die Kante). Jetzt:

- **Lippenschnitt** (`mesh/mundschnitt.ts`): Die Haut wird **geschlossen** vermascht und dann entlang der Maullinie (Nullmenge F = h − h_Lippe(φ) im Trägerrahmen, nur zwischen den Mundwinkeln) aufgeschnitten. Jede gekreuzte Kante bekommt einen Schnittpunkt **zweimal** (Rand oben/unten, in Ruhe identisch), Dreiecke werden geteilt, an den Mundwinkeln endet der Schlitz in einem gemeinsamen Spitzenvertex. Dahinter die **Maultasche** (Gitter Rand oben → Gaumen → Rachen → Boden → Rand unten; Gaumen- und Bodenwölbung in Ober-/Unterkiefer begrenzt). Das Netz bleibt geschlossen (0 offene Kanten), die Kante ist exakt die Kurve, beide Seiten haben eigene Normalen und Regionen → pixelscharf bei jeder Netzdichte. **Geschlossen ist per Konstruktion perfekt** (`maul.oeffnung` ist jetzt die **Öffnungsweite**, nicht mehr der Bauzustand).
- **Rig** (`mouth/pose.ts`): Unterkiefer dreht um das Gelenk am Hinterkopf, Oberkopf klappt mit Anteil `oeffnungOben` zurück (bei tiefem Maul 0); Lochmaul weitet sich radial (`eePucker`). Kiefergewichte **hart je Seite** (die Haut ist getrennt) und aus **allen** Knochen (großer Rex-Kopf trägt Rumpfgewicht); Unterkiefer = starrer Löffel bis zur Kiefertiefe.
- **Maullinie geschwungen** (`maul.schwung`: Senke hinter der Schnauze, Anstieg zum Winkel; Florian: „wie Dino/Schlange, keine Gerade“).
- **Zähne** auf dem Rand mit Größenprofil (Eckzahn ≈ 0,33 der Spanne, vorn mittel, hinten klein; `zaehne.aussen` Fangzähne außen), gebogene Kegel; **Zunge** als Körper mit Rinne und runder Spitze hinten auf dem Boden; **Zahnfleischsaum** innen am Rand (Shader), **Lippenband** als Abstandsfeld (`region.y` = Abstand zur Kante) mit Ableitungs-Antialiasing — Breite aus `maul.lippe`, 0 = Giraffe unsichtbar.
- **Augen**: `augen.lage` (vorn ↔ hinten am Schädel) statt Winkel vom Maulrand.
- **Formschicht**: Profil-Lofts (Achsenmodus für Rumpf/Kopf/Beine; **Segmentmodus mit Gehrungsebenen** für Hals/Schwanz/Schlange: Minimum über Segmente, Vorzeichen als Enthaltensein — keine Sprünge). Rumpf + Hals ein Tropfen-Loft, Hals weitet sich oben in den Hinterkopf (Florian: „Übergang Hals → Kopf tropfenförmiger“). Culling nur außerhalb des Hüllquaders (Risse behoben). Bauch/Rücken bei langem Hals je Gruppe, stetig gemischt.
- **Ergebnisbilder** (`docs/progress/wesen-vergleich-<id>[-zu|-auf].png`, Render | Referenz): Rex offen mit Fängen, Zahnfleisch, Rachen, Zunge; Rex zu mit sauberem Lippenband und zwei Fängen außen; Giraffe zu unsichtbar, auf = Bohne; Aal offen mit Zahnreihen rundum.

Prüfungen: `pnpm typecheck`, `pnpm lint`, Wesen-Tests 18/18, Game-Tests 256/256, Lab-E2E 6/6, GPU-E2E 1/1 — alles grün auf `main`.

## Was noch nicht stimmt (nach Florians Bildern)

1. **Körper**: Rex-Rumpf ist ein Findling (Bild 5: gedrungene Bohne mit Brust, kurze dicke Beine, Flügel, Stummelarme); Tiger-Vorlage gerade erst nach Bild 9/14 neu gesetzt (sitzendes Ei, großer Kopf, Vorderpfoten) — Bild prüfen. Giraffen-Körper ist nahe (Birne, Tropfen), Hals noch zu dick, Kopf zu rund.
2. **Kopfprofile** noch generisch (Schädel/Schnauze aus Formeln); Plan v2: Profilkurven aus den Bildern abnehmen (Bild 11 Rex-Kopf, Bild 6 Giraffe, Bild 9 Katze).
3. **Shading**: zu glatt/„CG“ (Bögen: Airbrush, kühle gesättigte Schatten, Korn, kein Glanz). Belly-Linie am Rex hart.
4. **Zähne**: Form ok, Verteilung/Länge weiter gegen Bild 5/11 (lange Fänge vorn).
5. **Rundmaul/Zwischenformen** (Kugelfisch Bild 4, Aal-Übergang) ungeprüft nach dem Umbau; W-Lippe/Nasenspiegel der Katze fehlt; Drache ohne Unterkiefer (Öffnung via Oberkiefer) ungeprüft.
6. **Augen**: bündiger Augapfel mit Ring, Lider/Blinzeln (K3) fehlen; Giraffen-Auge zu weit vorn/mittig.
7. **Feineres Gitter um den Kopf** (rechtwinklig, variable Teilung) und **Silhouetten-Überdeckung** im Harness noch nicht gebaut.
8. Ohren, Hörner, Flügel, dünne Schwänze, Spinnenbeine, Rückenschuppen: **eigene Elemente** (Florian), nicht Teil der Masse.

## Nächste Schritte

1. Bilder der neuen Tiger-Vorlage und der Rundmäuler prüfen; Fehler sofort beheben.
2. Profilkurven aus Bild 11/6/9 → Kopf (Plan v2 Punkt 2), Rumpf-Bohne Rex.
3. Rechtwinkliges Gitter mit Verfeinerung um den Kopf; Silhouetten-IoU im Harness.
4. Shading nach den Bögen (Airbrush), Augen bündig mit Ring, Lider.
5. Dann mit Florian: Look-Abnahme Rex.

## Fallen / Hinweise

- **Nur Florians 19 Bilder** sind Referenz; nichts anderes öffnen oder suchen.
- Das Mesh ist **geschlossen** gebaut; `maul.oeffnung` = Öffnungsweite (Lab-Vorschau folgt ihr standardmäßig; Harness `EE_MAUL=zu|auf|bau`, `bau` = wie Lab).
- Lofts: gerade Teile im Achsenmodus, gebogene im Segmentmodus; fast doppelte Nachbarpunkte werden verschmolzen, offene Enden ohne Kappe rund geschlossen.
- Culling nur außerhalb des Hüllquaders (`bd > 0`), sonst Risse. Stetigkeitstest `sdf/stetig.test.ts`.
- Kiefer-/Oberkiefergewichte: hart je Seite (`seite` aus dem Lippenschnitt), aus allen Knochen.
- Deskriptor-Puffer: 14 Floats (Spine 4, Region 4, Extra 3, Pucker 3); `eeClosed` gibt es nicht mehr.
- Lab per Browser-Klicks ist unzuverlässig (Referenzen veralten); Bilder immer über den Harness.
- Vorschau der Leitung: `game-dev-http` (5174); Florians Server 5173 nicht anfassen.
