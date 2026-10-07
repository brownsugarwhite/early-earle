# KI-Bild-zu-3D-Werkzeuge für die Wesen (Recherche, Stand 2026-10-04)

> Ergebnis einer Cloud-Session am Ende von Prototyp 1. Preise und Bedingungen stammen aus aktuellen Testberichten und Hilfeseiten (Herbst 2026). Die offiziellen Seiten von Meshy, Tripo und Rodin waren aus der Cloud-Umgebung **gesperrt** (Egress-Proxy), Lizenztexte wurden also nicht im Original gelesen. Vor dem Kauf und vor dem Store-Release die Lizenz des gewählten Tarifs prüfen.

## Ausgangslage

- Florian hat seine GPT-Entwürfe (Retriever, Drache, Löwe, Chimäre aus allen dreien; Vorder- und Seitenansicht) in **Meshy** getestet. Ergebnis laut Florian: „treffen den Look fast perfekt“. Meshy überträgt die gemalten Fellstreifen und Farbverläufe als Textur auf ein leicht kantiges Low-Poly-Mesh.
- Der prozedurale Gegenentwurf (Wesen-Baukasten, SDF + Strähnen-Generatoren, siehe [`../prototyp/README.md`](../prototyp/README.md)) kam trotz Vermessung an den Vorlagen nicht annähernd heran („total schlecht im Vergleich“).
- Florian hat (Stand 04.10.) **kein Meshy-Pro-Konto** und kann die Meshy-Modelle nicht herunterladen. Er testet weiter selbst.

## Vergleich

| Tool | Kosten | Kostenlos herunterladen? | Kommerziell nutzbar | Für uns wichtig |
|---|---|---|---|---|
| **Meshy** | Pro 20 $/Monat (1.000 Credits); Premium/Ultra/Studio teurer | Nur ältere Modellversionen, 10 Downloads im Monat; die neuesten Modelle (Meshy 6/7, laut Hilfeseite) brauchen einen bezahlten Tarif. Quellen widersprechen sich, ob „Meshy 5“ oder „Meshy 6 Lite“ kostenlos ladbar ist | Free: CC BY 4.0 (mit Namensnennung, öffentlich). Pro: privat, volle Rechte | Laut Vergleichstests die schönsten Texturen, viele Stil-Presets (Cartoon). Auto-Rigging auch für Vierbeiner, Export GLB/FBX mit Knochen. API |
| **Tripo** | Pro 19,90 $/Monat (~14 $ bei Jahreszahlung), 3.000 Credits | Ja, 200 Credits im Monat | Free: öffentlich, laut Preisseite nicht kommerziell. Pro: privat, kommerziell | **Segmentation v2 mit „Part Completion“**: zerlegt ein Modell in Teile und füllt die Schnittflächen (ca. 40–80 Credits pro Zerlegung, +5 Credits pro aufgefülltem Teil). In Tests stark bei Cartoon-Proportionen. Rigging für Vierbeiner |
| **Rodin (Hyper3D)** | Gratis erzeugen, nur der Download kostet (Credits zu 1,50 $, ca. 0,50–1,50 $ pro Modell); Creator 24 $/Monat | Erzeugen und Neuversuche gratis | Laut Testseiten in allen Tarifen | Stärkste Geometrie, gemalte Texturen schwächer. Billigster Weg zu kommerziell nutzbaren Dateien |
| Hunyuan3D 3.x (Tencent) | gehostet | – | **Lizenz schließt EU, Großbritannien und Südkorea aus** | Für uns rechtlich raus |
| TRELLIS.2 (Microsoft) | Open Source (MIT) | Hugging-Face-Demo | Abhängigkeiten (nvdiffrast/nvdiffrec) nur nicht kommerziell | Braucht NVIDIA-GPU mit 24 GB, läuft nicht auf dem Mac |

## Empfehlung (für Florians Entscheidung, nicht beschlossen)

1. **Kostenlos vergleichen:** dasselbe GPT-Bild (z. B. Retriever) bei Tripo (Free) und Rodin (gratis erzeugen) hochladen und neben den Meshy-Screenshot legen.
2. **Entscheiden:** Bleibt Meshy klar vorn → **Meshy Pro für einen Monat**, alle Wesen erzeugen, herunterladen, kündigen. Kommt Tripo nahe heran → **Tripo Pro** (Teile-Zerlegung mit aufgefüllten Schnittflächen spart Arbeit und löst Nähte unter Mähne und Kragen).
3. **Bezahlter Tarif auch wegen Vertraulichkeit:** Im Free-Tarif sind Modelle öffentlich (Community-Galerie).

## Vorgaben für Florians GPT-Bilder (damit die 3D-Erzeugung und das Zerlegen klappen)

- **Neutrale Standpose** statt Brüllen oder Sitzen: Maul leicht offen, Beine gerade, Flügel ausgebreitet, Schwanz gestreckt. Ausdruck liefert später die Animation; verdrehte Posen lassen sich schlecht riggen.
- **Weiches Licht von oben vorn**, keine harten Schlagschatten (sonst lässt sich die Haut schlecht umfärben).
- **Immer derselbe Stil-Prompt**, jeweils **Vorder-, Seiten- und Rückansicht** (Meshy und Tripo verarbeiten mehrere Ansichten, die Form wird deutlich besser).
- Ein Wesen pro Bild, neutraler Hintergrund, keine dicken Konturen.

## Polygon- und Texturbudget (Erfahrungswerte, noch nicht gemessen)

Das Brett zeigt bis zu 6×6 = 36 Wesen. Draw-Call-Budget ≤ 100 (STYLE §5.8).

| Stufe | Wo | Dreiecke pro Wesen | Textur |
|---|---|---|---|
| Nah | Held auf der Karte, Splash, Verschmelz-Moment, Sammlung (1–3) | 15.000–25.000 | 2048² |
| **Spielfeld** | bis 36 Wesen, je ~150 px hoch | **3.000–5.000** | 1024² |
| Fern | kleine Figuren auf der Karte | 800–1.500 | 512² |

- 36 × 5.000 = 180.000 Dreiecke, mit Schattenpass ~360.000: im Desktop-Browser trivial, für die iPhone-12-Klasse voraussichtlich in Ordnung. Mehr bringt auf dem Brett nichts (Pixel-kleine Dreiecke kosten die GPU mehrfach; die Prototyp-Brettkörper nutzen ~900 Vertices, `CreatureMeshBodies.ts`).
- **Wichtiger als Dreiecke:** ein Mesh, ein Material und ein Texturatlas pro Wesen (Teile beim Bauen zusammenführen), sonst 7 Teile × 36 Wesen ≈ 250 Draw Calls. **Texturspeicher:** 36 × 2048² unkomprimiert ≈ 576 MB sprengt das iPhone → 1024² + KTX2 (~1 MB pro Wesen). Skelett: ≤ 4 Einflüsse pro Vertex, ~20–40 Knochen.
- Meshy liefert je nach Einstellung 30.000 bis über 300.000 Dreiecke → Reduktion auf die drei Stufen gehört in die Aufbereitung.
- Messen mit 36 Wesen auf einem 6×6-Brett im Lab (Perf-Badge: fps, p99, Draw Calls), am Desktop und auf dem iPhone, bevor die Pipeline skaliert.

## Pipeline-Skizze „Meshy-Look + dynamisch“ (Vorschlag aus der Session, nicht beschlossen)

1. **Form = Module:** jedes KI-Wesen in Blender (headless `bpy`, als pip-Paket `bpy` 5.0.1 auch in der Cloud verfügbar, dort noch nicht getestet) zerlegen: Rumpf, Kopf mit Oberkiefer, Unterkiefer, Mähne/Kragen, Ohren, Schwanz, Flügel, Beine. Gemeinsames Skelett pro Bauplan (Vierbeiner, Zweibeiner, Drache, Insekt 6 Beine, Spinne 8 Beine, Schlange). Schnitte dort, wo etwas darüberliegt (Mähne, Fellkragen, Flügelwurzel); Teile ragen über die Schnittkante (oder Tripo Part Completion). Rümpfe in zwei Varianten: glatt und mit Fell (Fellsilhouette ist Geometrie).
2. **Haut = Shader statt fester Textur:** aus der KI-Textur die gemalte Helligkeit (Pinselstriche, Licht) und Bereichsmasken (Bauch, Rücken, Mähne, Krallen; per Farbclustering) gewinnen; das Spiel legt Palette, Muster (Flecken, Streifen, Rosetten, Bänder, Schuppenreihen) und Struktur (Schuppen, Chitin, Federn, Haut) darüber. Risiko: prozedurale Muster müssen so pinselig wirken wie die KI-Textur — nur per Prototyp klärbar.
3. **Material = Feuer, Rauch, Gas, Jelly** als Shader + Partikel über jedem Körper (KI-Tools liefern das nicht).
4. **Animation** pro Bauplan prozedural; Verschmelzen verdeckt den Teiltausch im Pop-Moment (GDD 7.5).
5. Grenzen: nicht jede Kombination sieht gut aus (Übergangsteile wie Kragen oder Kompatibilitätsregeln, GDD 7.2); das KI-Maul ist offen modelliert, der Unterkiefer lässt sich nur in kleinem Bereich bewegen; Meshy-Netze sind unsauber (Dreiecke, offene Kanten, viele Fellinseln).
6. Vorgeschlagener Beweis vor dem Skalieren: ein Monat Pro-Tarif, die drei vorhandenen Wesen plus eine Spinne; daran Teiletausch (Spinnenbeine am Löwen), Umfärben + 3 Muster + Schuppenstruktur, Feuer- und Rauchvariante, Animation.

Gegenposition aus der vorherigen Session (unbestätigter Plan „Wesen-Baukasten v4“, [`../prototyp/wesen-v4-plan-unbestaetigt.md`](../prototyp/wesen-v4-plan-unbestaetigt.md)): KI-3D nur für **Teile**, **nie Farbe backen**, Farbe/Muster komplett im Shader, Detail aus einer Normal-Map-Bibliothek. Der Meshy-Test vom 04.10. spricht dafür, die gemalte Helligkeit aus der KI-Textur zu **behalten** und nur Farbe und Muster dynamisch zu machen. Die Entscheidung trifft Florian im neuen Plan.

## Nachtrag 2026-10-05: Meshy-API und Meshy-MCP-Server

**Was die API kann** (REST, asynchrone Tasks): Text-to-3D, Image-to-3D, **Multi-Image-to-3D** (Vorder-, Seiten-, Rückansicht), **Retexture** (bestehendes Mesh neu bemalen per Text- oder Bild-Stil), **Remesh** (Zielpolygonzahl, Quad- oder Dreiecks-Topologie), Auto-Rigging und Animation. Parameter u. a. `target_polycount`, `topology`, `pose_mode`, `texture_prompt`, `enable_pbr`, `texture_resolution` (bis 8K). **Rigging nur für Zweibeiner/Menschen** (Animation „biped“) — für unsere Tiere bleibt das eigene Skelett pro Bauplan. API-Zugang ist im Pro-Tarif enthalten (bis 10 parallele Tasks).

**Credits pro Task** (laut Meshy-Hilfe): Image-/Multi-Image-to-3D 20 ohne, 30 mit Textur (2K/4K), 35 bei 8K · Retexture 10 (2K/4K) bzw. 15 (8K) · Remesh 5 · Rigging 5 · Animation 3. Pro-Tarif: 1.000 Credits/Monat.

**Meshy-MCP-Server** (offiziell, npm `@meshy-ai/meshy-mcp-server`, Quelltext `github.com/meshy-dev/meshy-mcp-server`): macht die API als Werkzeuge für Claude nutzbar (Erzeugen, Status, Download, Retexture, Remesh, Rigging, Bildwerkzeuge). Liest den Schlüssel aus `MESHY_API_KEY`.

**Was sich am Workflow verbessert (Vorschlag):**
1. **Pipeline per Befehl statt Web-App:** Florian legt Ansichten unter `assets/ref-florian/wesen/<id>/` ab; ein Skript erzeugt per Multi-Image-to-3D mit festen Einstellungen, lädt GLB, normalisiert, zerlegt, erzeugt LODs, Manifest und einen Kontaktbogen neben der Vorlage. Reproduzierbar und versioniert.
2. **Mehrere Kandidaten pro Wesen** (z. B. 3) automatisch erzeugen, Florian wählt im Kontaktbogen.
3. **Retexture als größter Hebel:** dasselbe Modul-Mesh mit gemalten Varianten bemalen lassen (Fell, Schuppen, Chitin, Tigerstreifen, Flecken, Farbstimmungen). Das ersetzt das größte Stilrisiko — prozedurale Muster, die nicht pinselig genug wirken — durch Meshy-Look-Texturen. Im Spiel ist ein Texturtausch auf demselben Mesh kostenlos und dynamisch; Umfärben im Shader kommt für unbegrenzte Paletten obendrauf. **Testen:** ob Retexture die UVs bzw. die Topologie erhält, wie gut es auf zerlegten Teilen statt ganzen Wesen wirkt, und wie konsistent der Stil über viele Varianten bleibt.
4. **Remesh für LODs** (5 Credits je Stufe) oder kostenlos selbst per Blender/gltf-transform.
5. **Claude erzeugt direkt in der Session** über den MCP-Server („drei Varianten Drachenflügel“), verarbeitet und zeigt den Vergleich.
6. **Nicht im fertigen Spiel:** Erzeugung dauert Minuten, kostet Credits, braucht Netz und schwankt im Ergebnis. Alles entsteht zur Produktionszeit; das Spiel kombiniert fertige Teile und Texturen.

**Grobe Kostenschätzung (Annahmen, nicht gemessen):** 50 Grundwesen × 3 Kandidaten × 30 = 4.500 Credits; 150 Teile × 5 Haut-Varianten × 10 = 7.500 Credits; zusammen ≈ 12.000 Credits — deutlich mehr als ein Pro-Monat. Lieber erst den Beweis (drei Wesen plus Spinne) und die echten Verbrauchswerte messen.

**Voraussetzungen in der Cloud-Umgebung:** `api.meshy.ai` ist derzeit vom Netzwerk-Profil gesperrt (getestet am 05.10.: Verbindung abgelehnt). Florian muss in den Umgebungs-Einstellungen unter Netzwerkzugriff „Custom“ wählen und `api.meshy.ai` (plus die Download-Domain der Modelldateien, zeigt sich beim ersten Lauf) zu den erlaubten Domains hinzufügen, und den API-Schlüssel als Umgebungsvariable `MESHY_API_KEY` hinterlegen (nie in den Chat). Wirksam ab einer neuen Session. Alternativ läuft die Pipeline auf Florians Mac.

Quellen: [Meshy API](https://www.meshy.ai/api) · [Image to 3D API](https://docs.meshy.ai/en/api/image-to-3d) · [Multi-Image to 3D API](https://docs.meshy.ai/en/api/multi-image-to-3d) · [Retexture API](https://docs.meshy.ai/en/api/retexture) · [Remesh API](https://docs.meshy.ai/en/api/remesh) · [Changelog](https://docs.meshy.ai/en/api/changelog) · [Credits pro API-Task](https://help.meshy.ai/en/articles/16815622-how-many-credits-does-each-meshy-api-task-cost) · [Meshy MCP Server (Glama)](https://glama.ai/mcp/servers/meshy-dev/meshy-mcp-server) · [Meshy AI Integration](https://docs.meshy.ai/api/ai)

## Quellen

- [Meshy Pricing (offiziell)](https://www.meshy.ai/pricing) · [Meshy Free Plan](https://help.meshy.ai/en/articles/15696428-what-is-included-on-the-free-plan) · [Meshy: Why Can't I Download My Model](https://help.meshy.ai/en/articles/10421033-why-can-t-i-download-my-model) · [Meshy Pricing 2026 – 3dcreatorhub](https://3dcreatorhub.com/meshy-ai-pricing) · [Meshy AI Rigging](https://www.meshy.ai/features/ai-auto-rigging)
- [Tripo Pricing 2026 – Costbench](https://costbench.com/software/ai-3d-generation/tripo-ai/) · [Tripo Review 2026 – MakerStack](https://makerstack.co/reviews/tripo-ai-review/) · [Tripo Segmentation v2](https://www.tripo3d.ai/blog/tripo-segmentation-v2) · [Tripo Segmentation auf Scenario](https://www.scenario.com/blog/tripo-segmentation-3d-mesh-editable-parts-scenario) · [Tripo Rigging Vierbeiner](https://www.tripo3d.ai/blog/mixamo-alternative-rigging-non-humanoid-quadruped-characters)
- [Rodin Free Plan – Costbench](https://costbench.com/software/ai-3d-generation/rodin-hyper3d/free-plan/) · [Rodin Review 2026 – MakerStack](https://makerstack.co/reviews/hyper3d-rodin-review/)
- [Generative 3D Tools Compared (April 2026) – StraySpark](https://www.strayspark.studio/blog/generative-3d-tools-comparison-meshy-rodin-tripo-csm-2026) · [AI 3D Model Comparison – ideate](https://ideate.xyz/blogs/posts/ai-3d-model-comparison-trellis-tripo-meshy-rodin-hunyuan)
- [Hunyuan3D-2 Lizenz](https://huggingface.co/tencent/Hunyuan3D-2/blob/main/LICENSE) · [Hunyuan3D-Versionen 2026 – TripoSR](https://triposr.org/blog/hunyuan3d-versions)
- [TRELLIS.2 – Cinevva](https://app.cinevva.com/pt-BR/news/2026-03-20-trellis-2-microsoft-open-source-3d) · [Is Trellis 2 Free? – 3D AI Studio](https://www.3daistudio.com/blog/is-trellis-2-free-pricing-how-to-get-started)
