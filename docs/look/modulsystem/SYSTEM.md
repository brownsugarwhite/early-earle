# Modulsystem: Aufteilung und Elemente (Stand Test-Abschluss 2026-10-05)

Ergebnis des Tests „Mischwesen“. Florian: „Ich brauche ein klares System für die Aufteilung und Elemente … ich will den Test jetzt beenden.“ Das Aussehen war ausdrücklich nicht das Ziel. Editor im Artefakt (Tab „Editor“): https://claude.ai/artifact/JfvK1CAf11oqfJXAiLyf5p

## Begriffe

| Begriff | Bedeutung |
|---|---|
| **Element** | Ein Stück eines Wesens mit genau einem Typ. Schlüssel `modell:teil`, z. B. `giraffe:hals`, `spinne:bein_5`. |
| **Typ** | `rumpf`, `kopf`, `hals`, `bein`, `arm`, `schwanz`, `ohr`. Neue Typen später z. B. `fluegel`, `horn`, `maehne`, `kiefer`. |
| **Andockring** | Der Schnittring, an dem ein Element vom Rest getrennt wurde: Mitte, Normale (zeigt vom Körper weg ins Element), Radius (Umfang / 2π). Jedes Element außer dem Rumpf hat genau einen. |
| **Sockel** | Ein Ring auf einem Element, an den ein anderes Element andocken kann. Gleiche Daten wie ein Andockring plus Name und Typ. Der Rumpf hat die meisten Sockel; Elemente können selbst Sockel tragen (der Giraffenhals trägt den Kopf-Sockel). Daraus entsteht ein Baum. |
| **Kombination** | Rumpf + Zuordnung „Sockelpfad → Element“, z. B. `{ "hals": "giraffe:hals", "hals/kopf": "giraffe:kopf", "bein_vl": "spinne:bein_5" }`. |

## Regeln

- **Passend:** `hals ← hals | kopf`, `kopf ← kopf`, `bein ← bein | arm`, `arm ← arm | bein`, `schwanz ← schwanz`, `ohr ← ohr`.
- **Andocken:** Element-Ring auf Sockel legen: Mitte auf Mitte, Normale auf Normale; „oben“ bleibt oben (Projektion der Welt-Oben-Achse, bei senkrechten Ringen die Vorwärtsachse); Maßstab = Sockelradius / Ringradius (begrenzt 0,35–3); fremde Elemente um 0,22 × Sockelradius in den Körper versenkt, das Original am eigenen Platz nicht.
- **Kontrolle:** Jedes Modell muss sich aus seinen eigenen Elementen exakt wieder zusammensetzen (Giraffe im Editor: erfüllt).
- **Stehen:** Nach dem Zusammenbau wird das Wesen auf den Boden gestellt (tiefster Punkt auf y = 0).
- **Grundblob als Rumpf:** Sockel entstehen aus festen Richtungen (Hals oben, Ohren und Arme seitlich, vier Beine unten, Schwanz hinten) als Treffer auf der Blob-Oberfläche; Radius relativ zur Blob-Breite. Ein angedockter Kopf blendet die Blob-Augen aus.

## Pipeline (Werkzeuge unter `tools/`)

1. `schnittlinien.py` – Schnittringe bestimmen (Skelett + Querschnitt; für angewachsene Teile Ansatzpunkte, als „gesetzt“ markiert; unsichere grau). **Hier liegt die größte Lücke:** Florian: „meistens viel zu wenig geschnitten“. Nächste Runde: Florians eingezeichnete Linien als Ansatzpunkte übernehmen.
2. `elemente.py` – entlang der Ringe schneiden: nur im Ringbereich, Rest über die Oberfläche zuordnen, Ringflächen exakt teilen; Rückfall Ebenenschnitt; Plausibilitätsprüfung (ein Teil reicht nicht weiter als vom Ring bis zur Spitze); Öffnungen mit Fächer verschließen; Sockel dem Stück auf der anderen Seite des Rings zuordnen; packen (`assets/elemente.json`, `assets/elemente-mesh.txt`, `assets/element-<modell>.jpg`).
3. Editor (Artefakt, Tab „Editor“) – Rumpf wählen, je Sockel ein passendes Element oder leer, Zufall, Original, Kombination als Daten.

## Stand der Elemente

| Modell | Elemente | Nicht geschnitten |
|---|---|---|
| Giraffe | Rumpf, Hals (trägt Kopf), Kopf, 4 Beine, Schwanz | – |
| Spinne | Rumpf, 8 Beine | – |
| Rex | Rumpf, 2 Beine (Hüfte/Knöchel aus Stufe 1), Schwanz | Kopf (kein Hals), Arme (Schnitt nahm Körperseite mit) |
| Retriever | Rumpf, 2 Ohren, Schwanz | Kopf (Hals unter Mähne, Maul offen), Beine (unter dem Fell) |

## Was für die Produktion fehlt

1. **Schnittlinien nach Florians Vorgabe** (großzügiger: mit Schulter, Hüfte, Halsansatz) und daraus eine Regel für neue Modelle.
2. **Modelle für Modularität erzeugen:** neutrale Pose, erkennbarer Hals, sichtbare Beine, geschlossenes oder klar abgesetztes Maul, gleicher Stil-Prompt.
3. **Übergänge:** Ring auf die Rumpfoberfläche ziehen und weich angleichen (Form, Normalen, Farbe), sonst Kragen.
4. **Einheitlicher Stil:** gemeinsame Beleuchtung, Farbe aus der Palette, optional Meshy-Retexture.
5. **Gelenke und Bewegung:** Knochen pro Elementtyp (Bein: Hüfte–Knie–Fuß, Hals: Kette, Kiefer), automatische Gewichte.
6. **Leistung:** ein Draw Call pro Elementtyp über Instanzen, Atlas-Texturen.
