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

## Quellen

- [Meshy Pricing (offiziell)](https://www.meshy.ai/pricing) · [Meshy Free Plan](https://help.meshy.ai/en/articles/15696428-what-is-included-on-the-free-plan) · [Meshy: Why Can't I Download My Model](https://help.meshy.ai/en/articles/10421033-why-can-t-i-download-my-model) · [Meshy Pricing 2026 – 3dcreatorhub](https://3dcreatorhub.com/meshy-ai-pricing) · [Meshy AI Rigging](https://www.meshy.ai/features/ai-auto-rigging)
- [Tripo Pricing 2026 – Costbench](https://costbench.com/software/ai-3d-generation/tripo-ai/) · [Tripo Review 2026 – MakerStack](https://makerstack.co/reviews/tripo-ai-review/) · [Tripo Segmentation v2](https://www.tripo3d.ai/blog/tripo-segmentation-v2) · [Tripo Segmentation auf Scenario](https://www.scenario.com/blog/tripo-segmentation-3d-mesh-editable-parts-scenario) · [Tripo Rigging Vierbeiner](https://www.tripo3d.ai/blog/mixamo-alternative-rigging-non-humanoid-quadruped-characters)
- [Rodin Free Plan – Costbench](https://costbench.com/software/ai-3d-generation/rodin-hyper3d/free-plan/) · [Rodin Review 2026 – MakerStack](https://makerstack.co/reviews/hyper3d-rodin-review/)
- [Generative 3D Tools Compared (April 2026) – StraySpark](https://www.strayspark.studio/blog/generative-3d-tools-comparison-meshy-rodin-tripo-csm-2026) · [AI 3D Model Comparison – ideate](https://ideate.xyz/blogs/posts/ai-3d-model-comparison-trellis-tripo-meshy-rodin-hunyuan)
- [Hunyuan3D-2 Lizenz](https://huggingface.co/tencent/Hunyuan3D-2/blob/main/LICENSE) · [Hunyuan3D-Versionen 2026 – TripoSR](https://triposr.org/blog/hunyuan3d-versions)
- [TRELLIS.2 – Cinevva](https://app.cinevva.com/pt-BR/news/2026-03-20-trellis-2-microsoft-open-source-3d) · [Is Trellis 2 Free? – 3D AI Studio](https://www.3daistudio.com/blog/is-trellis-2-free-pricing-how-to-get-started)
