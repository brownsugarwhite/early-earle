"""LIESMICH-Textblock in der .blend (deutsch) und Anzeige im Text-Editor des Layout-Arbeitsbereichs."""
import datetime

import bpy

TEXT = """early earle — Blender-Bibliothek
================================

Alles, was im Spiel in 3D entsteht, aus den echten Generatoren des Spiels exportiert
(tools/export3d → tools/blender/build_library.py, neu bauen mit `pnpm assets:blender`).
Ausführlich: docs/BLENDER.md im Repo.

SZENEN (oben rechts umschalten)
  Wesen          alle Arten in jeder Stufe, die das Spiel zeigt (Tjorizo-Palette), die Blob-Linien
                 aller vier Zonen (Stufe 1–12) und die eigenen Wesen (content/genome/custom)
  Map            der Planet mit den zehn Welten (je Welt: Terrain, Bäume, Requisiten, Müll,
                 Kronenpunkte), Riesenbaum, Levelpfad (100 Knoten), Wahrzeichen, Vorlagen.
                 Kameras je Welt wie im Spiel („Kamera · Welt 01 …“), dazu die Planeten-Übersicht.
  Spielfeld      die Elemente-Schau: Plateau, Platten, alle Elemente aus den neun Grundformen
  REX            der Guide-Dino mit 22 Knochen (+ Variante mit sichtbarem Zubehör)
  Module         alle Module (Blender-GLBs und die im Code gebauten), nach Slot sortiert
  Materialien    alle Paletten als Farbstreifen, Musterkugeln (Materialarten und Muster)
  Eigenes Wesen  die Vorlage zum Bauen eigener Wesen + Live-Vorschau

ASSET-BROWSER
  Kataloge Wesen/…, Map/…, Spielfeld/…, REX, Module/…, Materialien/…, Eigenes Wesen.
  Die Katalogdatei blender_assets.cats.txt liegt neben dieser Datei (mitkopieren!).
  Tipp: Ordner assets/blender als Asset-Bibliothek eintragen (Einstellungen → Dateipfade).

WIE DIE WESEN GERIGGED SIND
  Der Körper ist im Spiel eine glatte Vereinigung von Kugeln (SDF). Jeder Mesh-Vertex hängt an
  bis zu vier Kugeln — genau das ist hier ein Deform-Knochen je Kugel (Knochenkopf = Kugelmitte),
  die Vertex-Gruppen tragen die Gewichte des Spiels. Ketten: Hals.01…, Rüssel.01…, Schwanz.01…,
  Wirbel.01… (Schlange). Beine: Hüfte → Knie → Fuß mit IK-Ziel „IK-Fuß.vorn.L“ usw.
  (Wurzel bewegen = alles; Körper bewegen = Füße bleiben stehen). Unterkiefer dreht am Scharnier.
  Knochensammlungen: Wurzel, Körper, Kopf, Hals, Rüssel, Schwanz, Wirbelsäule, Beine, IK.
  Die Kugeln selbst liegen ausgeblendet in „<Wesen> · Kugeln“, Hüften, Halsansatz, Maul und
  Kiefergelenk in „<Wesen> · Gelenke“ (Auge im Outliner einschalten).
  Module sitzen auf Sockel-Empties (Instanz der Modul-Collection), gehängt an den Knochen ihrer
  Ankerkugel; die Tönung steht als Eigenschaft ee_tint/ee_ink/ee_bone/ee_accent am Sockel.

MATERIALIEN
  Emission = Palettenfarbe (kein Ambient, kein Glanzlicht wie im Spiel); Licht und Schatten
  kommen über „Shader to RGB“ nur in EEVEE → Ansicht auf „Rendered“ bzw. „Material Preview“.
  Farbtransformation „Standard“ (sonst verschieben sich die Palettenfarben).
  Wesen: Gruppe „EE · Wesen-Körper“ (Grundfarbe, Innen, Rand, Glanz, Materialart, Muster).
  Map: „EE · Palettenatlas“ (Bild der Spielpalette) + „EE · Earle-Band“ (Tinte + Lichtstufen).

EIGENES WESEN BAUEN (Kurzfassung)
  1. Text-Editor → „ee_wesen.py“ → Skript ausführen (Alt P) — oder als Add-on installieren.
     Dann 3D-Ansicht → Seitenleiste (N) → Reiter „early earle“.
  2. Szene „Eigenes Wesen“: Kugeln verschieben/skalieren (Skalierung = Radius), Rollen in den
     Eigenschaften (ee_rolle, ee_kette, ee_bein), Module an Sockeln tauschen (Instanzieren →
     Collection), Name/Basis-Art/Farbe an „Wesen-Wurzel“. Die Vorschau zeigt den Körper live
     (sie vereint alles in „Eigenes Wesen · Kugeln“ — dort nur Kugeln ablegen).
     Oder: ein Wesen aus der Szene „Wesen“ duplizieren (Collection kopieren) und ändern.
  3. „early earle: Wesen exportieren“ → content/genome/custom/<id>.json
  4. Spiel: /lab/creature → „Eigene Wesen“ wählen (Dev-Server lädt die Datei sofort neu).
  Module selbst ändern: Collection im Modul-Szene bearbeiten und mit tools/blender/export_assets.py
  (--collection Module --only <id>) nach content/genome/assets exportieren.

WAS NICHT ZURÜCK INS SPIEL GEHT
  Map, Spielfeld und REX sind Referenz: das Spiel erzeugt sie im Code. Änderungen hier als
  Vorlage nutzen (oder als eigenes Modul/Set-Piece liefern) — Details in docs/BLENDER.md.
"""


def write(st):
    txt = bpy.data.texts.get("LIESMICH") or bpy.data.texts.new("LIESMICH")
    txt.clear()
    stamp = datetime.date.today().isoformat()
    git = (st.manifest.get("git") or {}).get("commit")
    txt.write(TEXT + f"\nGebaut am {stamp}" + (f" aus Commit {git}" if git else "") + ".\n")
    lines = "\n".join("  " + r for r in st.report)
    txt.write("\nBAUPROTOKOLL\n" + lines + "\n")
    # Im Layout-Arbeitsbereich die Zeitleiste zum Text-Editor mit LIESMICH machen (wenn vorhanden).
    try:
        screen = bpy.data.screens.get("Layout")
        if screen is not None:
            for area in screen.areas:
                if area.type in ("DOPESHEET_EDITOR", "TIMELINE"):
                    area.type = "TEXT_EDITOR"
                    area.spaces.active.text = txt
                    break
    except Exception:  # noqa: BLE001 — im Hintergrundmodus ohne Fenster optional
        pass
    return txt
