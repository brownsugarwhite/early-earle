"""Welche Ansicht wo auf Florians Bögen liegt (Pixel der Vorlage) und was dazu gehört.

Ansichten:
- seite, seite_auf: geschlossenes Profil (Kopf links), Boden = tiefster Umrisspunkt der Ansicht
- front, front_auf: Halbprofil, editierbar ist die dunkle rechte Hälfte, Achse = Spiegelachse der Zeichnung
- top: Halbprofil, die dunkle Hälfte liegt im Bild unten und wird nach oben gespiegelt (editierbar y ≥ 0)
- seite_zaehne, front_zaehne (nur Rex): Zeichnung mit Zähnen, nur als Linienbild, auf seite/front gelegt

`box` = Rechteck (x0, y0, x1, y1) in der Vorlage, das die Ansicht ganz enthält. Fremde Striche im Rechteck
stören nicht (es zählt die größte Umrissfläche). `augen` = ungefähre Mitte gezeichneter (nicht gefüllter)
Augen; gefüllte Augen findet das Skript selbst.
"""

ROOT_LOOK = 'docs/look/editor/'

WESEN = {
    'rex': {
        'titel': 'Rex',
        'bild': ROOT_LOOK + '06-rex-mit-maul.png',
        'auge_art': 'mandel',
        'ansichten': {
            'top': {'box': (0, 125, 875, 580), 'augen': [(258, 435)]},
            'seite': {'box': (2385, 85, 3272, 515), 'augen': [(2637, 150)]},
            'front': {'box': (3290, 90, 3762, 525), 'augen': [(3632, 168)]},
            'seite_auf': {'box': (2395, 650, 3292, 1185), 'augen': [(2654, 727)]},
            'front_auf': {'box': (3290, 650, 3765, 1185), 'augen': [(3653, 721)]},
            'seite_zaehne': {'box': (880, 135, 1765, 570), 'nur_bild': 'seite'},
            'front_zaehne': {'box': (1760, 135, 2232, 570), 'nur_bild': 'front'},
        },
    },
    'langhals': {
        'titel': 'Langhals',
        'bild': ROOT_LOOK + '04-wesen-mit-maeulern.png',
        'auge_art': 'schlitz',
        'ansichten': {
            'top': {'box': (150, 535, 570, 800)},
            'seite': {'box': (470, 135, 895, 800)},
            'front': {'box': (915, 135, 1175, 795)},
            'seite_auf': {'box': (1235, 95, 1670, 800)},
            'front_auf': {'box': (1685, 75, 1945, 800)},
        },
    },
    'robbe': {
        'titel': 'Robbe',
        'bild': ROOT_LOOK + '04-wesen-mit-maeulern.png',
        'auge_art': 'knopf',
        'ansichten': {
            'top': {'box': (150, 920, 615, 1290)},
            'seite': {'box': (665, 895, 1128, 1290)},
            'front': {'box': (1170, 895, 1535, 1290)},
            'seite_auf': {'box': (1578, 872, 2048, 1282)},
            'front_auf': {'box': (2090, 880, 2462, 1290)},
        },
    },
}

# Zielgröße: max(Länge, Höhe) der geschlossenen Seitenansicht in Kacheln
ZIEL_GROESSE = 0.75
