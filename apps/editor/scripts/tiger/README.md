# Tiger-Konzept → Editor (Versuch 11.10.2026)

Zieht die Silhouetten aus Florians Konzeptbild `docs/look/editor/03-tiger-konzept.webp` automatisch nach und legt sie als Editor-Profile ab (`apps/editor/public/versuch/tiger/`).

**Ablauf** (Python 3, ohne Zusatzpakete; im Arbeitsordner):
1. Das Bild als `tiger.bmp` (24 bit) bereitlegen: `sips -s format bmp …`
2. Helligkeiten nach `lum.pkl` schreiben und den Außenraum füllen (`seg.pkl`); Code wie in der Sitzung vom 11.10.
3. `kontur.py` verfolgt den Umriss je Ansicht.
4. `fit.py` erkennt Ecken und passt Bézier-Kurven an (Schneider-Verfahren, Fehler ≤ 1,6 px).
5. `export.py` rechnet in Kachel-Einheiten um und schreibt dabei:
   - Profile
   - Maulpunkte (von Hand gesetzt)
   - Bilder der inneren Linien (ohne Außenkontur und Punkte)

**Ansehen im Editor** (Web-Modus):
- `?versuch=tiger&zustand=zu`
- `?versuch=tiger&zustand=auf`

**Bilder:** `node apps/editor/scripts/tiger-bilder.mjs`
