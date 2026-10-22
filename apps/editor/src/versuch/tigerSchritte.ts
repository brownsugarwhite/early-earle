// VERSUCH (12.10.2026): So entsteht der Tiger aus Silhouetten und Kanten, in fünf Schritten zum Ansehen.
// ?versuch=tigerkaefig&schritt=1…5
//   1 Käfig (das Low-Poly-Objekt), 2 unterteilt ohne Anpassung, 3 angepasst, 4 mit Kanten, 5 Ergebnis,
//   6/7 wie 4/5, aber die Ringe an die Form angepasst (Eckpunkte, Krümmung).

import type { Ansicht, Dokument } from '@ee/shape';
import { type Netz, type V3, TIGER_STANDARD, anZielAnpassen, tigerKaefig, umriss, unterteilenMehrfach, zuDreiecken } from '@ee/shape/versuch';
import { useEditor } from '../state/editorStore';
import type { Renderer3D } from '../three/Renderer3D';
import { type UeberLinie, tigerLaden, useUeberlagerung } from './ueberlagerung';

const GRAU = '#19232b';
const PINK = '#ff0095';
const ROT = '#e0306a';
const TUERKIS = '#00b8a5';

function kanten(netz: Netz): [number, number][] {
  const m = new Map<string, [number, number]>();
  for (const f of netz.flaechen) for (let i = 0; i < f.length; i++) {
    const a = f[i]!;
    const b = f[(i + 1) % f.length]!;
    m.set(a < b ? `${a},${b}` : `${b},${a}`, [a, b]);
  }
  return [...m.values()];
}

const proj = (p: V3, a: Ansicht) => (a === 'seite' ? { x: p[0], y: p[1] } : a === 'front' ? { x: p[2], y: p[1] } : { x: p[0], y: p[2] });

/** Käfigkanten als Linien in einer 2D-Ansicht; Kanten mit Schärfe pink und dicker. */
function kaefigLinien(netz: Netz, a: Ansicht, mitSchaerfe: boolean): UeberLinie[] {
  const out: UeberLinie[] = [];
  for (const [i, j] of kanten(netz)) {
    // in Front und Top nur die sichtbare (rechte bzw. obere) Hälfte zeichnen
    if (a !== 'seite' && netz.punkte[i]![2] < -1e-6 && netz.punkte[j]![2] < -1e-6) continue;
    const s = mitSchaerfe ? (netz.schaerfe.get(i < j ? `${i},${j}` : `${j},${i}`) ?? 0) : 0;
    out.push({ punkte: [proj(netz.punkte[i]!, a), proj(netz.punkte[j]!, a)], farbe: s > 0 ? PINK : GRAU, breite: s > 0 ? 1.5 + s : 1, ...(s > 0 ? {} : { strich: '3 3' }) });
  }
  return out;
}

function linien3d(netz: Netz, mitSchaerfe: boolean): { punkte: Float32Array; farben: Float32Array } {
  const k = kanten(netz);
  const punkte = new Float32Array(k.length * 6);
  const farben = new Float32Array(k.length * 6);
  k.forEach(([i, j], n) => {
    punkte.set(netz.punkte[i]!, n * 6);
    punkte.set(netz.punkte[j]!, n * 6 + 3);
    const s = mitSchaerfe ? (netz.schaerfe.get(i < j ? `${i},${j}` : `${j},${i}`) ?? 0) : 0;
    const c = s > 0 ? [1, 0, 0.58] : [0.1, 0.14, 0.17];
    farben.set([...c, ...c], n * 6);
  });
  return { punkte, farben };
}

export async function tigerSchritt(nummer: number, renderer: () => Renderer3D | null) {
  let schritt = nummer;
  await tigerLaden('zu');
  const dok: Dokument = useEditor.getState().dok;
  const formAngepasst = schritt >= 6;
  if (formAngepasst) schritt -= 2;
  const tk = tigerKaefig(dok, { ...TIGER_STANDARD, angepasst: formAngepasst });
  const ohneKanten: Netz = { ...tk.netz, schaerfe: new Map() };
  const roh = ohneKanten;
  const angepasst = anZielAnpassen(ohneKanten, tk.ziel);
  const mitKanten = anZielAnpassen(tk.netz, tk.ziel);

  const kaefig = schritt <= 2 ? roh : schritt === 3 ? angepasst : mitKanten;
  const flaeche = schritt === 1 ? null : unterteilenMehrfach(kaefig, 3);

  // 2D: Käfig und Umriss der Fläche über der Zeichnung
  const ueber = { ...useUeberlagerung.getState() };
  for (const a of ['seite', 'front', 'top'] as const) {
    const linien: UeberLinie[] = schritt < 5 ? kaefigLinien(kaefig, a, schritt >= 4) : [];
    if (flaeche && schritt >= 2) {
      const u = umriss(flaeche, a).filter((p) => a === 'seite' || (a === 'front' ? p.x >= 0 : p.y >= 0));
      linien.push({ punkte: u, farbe: schritt === 2 ? ROT : TUERKIS, breite: 2.5, zu: a === 'seite' });
    }
    ueber[a] = { ...ueber[a]!, linien };
  }
  useUeberlagerung.setState(ueber);

  // 3D: Käfig (facettiert) oder Fläche, dazu das Käfiggitter
  const r = renderer();
  if (!r) return;
  const n = flaeche ? zuDreiecken(flaeche, 40) : zuDreiecken(kaefig, 0);
  r.setzeDreiecke(n.positionen, n.normalen);
  if (schritt < 5) {
    const l = linien3d(kaefig, schritt >= 4);
    r.setzeLinien(l.punkte, l.farben);
  } else r.setzeLinien(null);
}
