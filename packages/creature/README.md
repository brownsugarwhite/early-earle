# @ee/creature — Wesen-Werkstatt, Kern

Engine-freier Kern der Wesen (Plan: `docs/plans/2026-10-07-wesen-werkstatt.md`). Ein **Bauplan** (JSON, zod-Schema mit
Reglerkatalog `BAUPLAN_REGLER`) wird zu einer **impliziten Form** (SDF-Szene), daraus entsteht per **Surface Nets** ein
Mesh mit **Deskriptoren** und einem **prozeduralen Skelett**. Der Renderer (`packages/render/src/creature2`) macht daraus
ein SkinnedMesh mit dem Earle-Wesen-Material.

| Modul | Inhalt |
|---|---|
| `bauplan/schema.ts` | Bauplan v1: Körper, Hals, Kopf, Maul, Zähne, Zunge, Augen, Unterkörper, Schwanz, Anbauten, Muster, Verhalten; `parseBauplan`, `defaultBauplan`, `getAt`/`setAt`; Katalog `BAUPLAN_REGLER` (Pfad, Gruppe, Label, Bereich) für schema-getriebene Panels |
| `bauplan/hash.ts` | `shapeHash` (formbestimmend → Mesh-Cache) und `styleHash` (Farben/Muster → nur Uniforms) |
| `sdf/scene.ts` | Primitive (Rundkegel, Ellipsoid mit Würfel-Blend, Rotationskörper aus Radiusfunktion mit Standfläche/Deckel, freie Funktion), weiche Vereinigung/Subtraktion, Hüllquader-Culling (`compileScene`), `evalSceneDetailed` für Teilabstände, Tetraeder-Gradient |
| `sdf/build.ts` | Bauplan → Szene + Knochen + Teilgruppen (Kurven für Wirbelsäulen-Koordinaten) + Augen; Körperprofil `bodyRadii` |
| `mouth/mouth.ts` | Maulvolumen (Loch ↔ Keil, Höhe, Neigung, Winkel-Rückzug, Kiefer, Biss, Kinnschnitt), Lippenwülste/-ring, Zähne auf den Lippenkurven, Zunge, Kieferzone |
| `mouth/closing.ts` | Verschluss-Morph (`eeClosed`: perfekt geschlossen), Spitzmund-Morph (`eePucker`: Lochmaul weitet sich), Kieferwinkel |
| `mesh/surfaceNets.ts` | Gitterlauf mit Narrow-Band, Mannigfaltigkeits-Suche, größte Komponente, Taubin, Projektion, Normalen |
| `mesh/descriptors.ts` | je Vertex: Knochengewichte (Körper nach Höhe, Kieferzone), `eeSpine` (Bogenlänge, Winkel, Umfang, Bauch/Rücken), `eeRegion` (Rachen, Lippe, Gesicht, Höhle), `eeAo`, `eeThick` |
| `mesh/build.ts` | `buildCreature(bauplan, { resolution })` → `CreatureBuild` (alles, was der Renderer braucht; worker-tauglich) |

Konventionen: Körperraum +Z vorn, +Y oben, Boden y = 0; Längen in Blob-Einheiten (`koerper.hoehe` 1 = Standardblob).
Alle Abstände sind **Schranken**, keine exakten Distanzen — Narrow-Band und Culling rechnen deshalb mit Sicherheitsrand.
Tests: `pnpm --filter @ee/creature test` (Schema, Konstruktion, Mesh-Invarianten, Bauzeiten je Grundform).
