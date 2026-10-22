// VERSUCH (12.10.2026): Florians nachgezogene Wesen als Testvorlagen (Profile zu/auf und Maulpunkte je Ansicht).
// Formate: Tiger (`punkte` je Ansicht als farbige Punktliste) und die nachgezogenen Bögen (`linien` je Ansicht).

import type { Dokument } from '../dokument';
import { neuesDokument } from '../dokument';
import type { Profil } from '../profil';
import type { V3 } from './catmullClark';
import type { MaulEingabe } from './maul';

export type VorlagePunkt = { farbe: 'tuerkis' | 'schwarz' | 'rot' | 'blau'; x: number; y: number };
export type VorlageLinie = { farbe: 'tuerkis' | 'rot' | 'blau'; punkte: { x: number; y: number }[] };
export type Vorlage = {
  profile: Record<string, Profil>;
  punkte?: Record<string, VorlagePunkt[]>;
  linien?: Record<string, VorlageLinie[]>;
  /** Nachzieh-Daten; `registrierung.boden_versatz_kachel`: offen steht der Körper so viel höher (Kinn unter dem Boden) */
  meta?: { ansichten?: Record<string, { registrierung?: { boden_versatz_kachel?: number } }> };
};

/** Versatz des offenen Zustands, damit der Körper offen und zu deckungsgleich steht (Rex: Kinn reicht unter den Boden). */
function offenVersatz(v: Vorlage): number {
  return v.meta?.ansichten?.seite_auf?.registrierung?.boden_versatz_kachel ?? 0;
}

function profilVerschoben(p: Profil, dy: number): Profil {
  if (!dy) return p;
  return { ...p, knoten: p.knoten.map((k) => ({ ...k, p: { x: k.p.x, y: k.p.y - dy } })) } as Profil;
}

export function vorlageDokument(v: Vorlage, zustand: 'zu' | 'auf', name = 'Vorlage'): Dokument {
  const d = neuesDokument(name);
  const dy = offenVersatz(v);
  const p = (k: string) => (k.endsWith('_auf') && v.profile[k] ? profilVerschoben(v.profile[k]!, dy) : v.profile[k] ?? v.profile[k.replace('_auf', '')]!);
  const auf = zustand === 'auf';
  return { ...d, profile: { seite: p(auf ? 'seite_auf' : 'seite'), front: p(auf ? 'front_auf' : 'front'), top: p('top') } };
}

type Zug = { x: number; y: number }[];

/** Linien einer Ansicht: Start (Achse/Kontur) → Mundwinkel, je Farbe. */
function linienVon(v: Vorlage, ansicht: string): Partial<Record<'tuerkis' | 'rot' | 'blau', Zug>> {
  const out: Partial<Record<'tuerkis' | 'rot' | 'blau', Zug>> = {};
  const dy = ansicht.endsWith('_auf') ? offenVersatz(v) : 0;
  if (v.linien?.[ansicht]) {
    for (const l of v.linien[ansicht]!) out[l.farbe] = l.punkte.map((p) => ({ x: p.x, y: p.y - dy }));
    return out;
  }
  const pts = v.punkte?.[ansicht] ?? [];
  const ecke = pts.find((p) => p.farbe === 'schwarz');
  const von = (f: 'tuerkis' | 'rot' | 'blau') => pts.filter((p) => p.farbe === f).map(({ x, y }) => ({ x, y }));
  if (von('tuerkis').length) out.tuerkis = [...von('tuerkis'), ...(ecke ? [ecke] : [])];
  // Tiger: rot läuft vom Start zum Mundwinkel, blau vom Mundwinkel zum Start
  if (von('rot').length) out.rot = [...von('rot'), ...(ecke ? [ecke] : [])];
  if (von('blau').length) out.blau = [...von('blau').reverse(), ...(ecke ? [ecke] : [])];
  return out;
}

/** Zwei Ansichten zu 3D-Punkten (gleicher Index): Seite gibt x und y, Front z und y (y gemittelt). */
export function ausZweiAnsichten(seite: Zug, front: Zug): { punkte: V3[]; abweichungY: number[] } {
  const n = Math.min(seite.length, front.length);
  const punkte: V3[] = [];
  const abweichungY: number[] = [];
  for (let i = 0; i < n; i++) {
    const s = seite[i]!;
    const f = front[i]!;
    punkte.push([s.x, (s.y + f.y) / 2, Math.abs(f.x)]);
    abweichungY.push(Math.abs(s.y - f.y));
  }
  if (punkte.length) punkte[0] = [punkte[0]![0], punkte[0]![1], 0];
  return { punkte, abweichungY };
}

export function vorlageMaul(v: Vorlage): { eingabe: MaulEingabe; abweichungY: number[] } {
  const s = linienVon(v, 'seite');
  const f = linienVon(v, 'front');
  const sa = linienVon(v, 'seite_auf');
  const fa = linienVon(v, 'front_auf');
  const abw: number[] = [];
  const zwei = (a?: Zug, b?: Zug) => {
    if (!a || !b) return undefined;
    const r = ausZweiAnsichten(a, b);
    abw.push(...r.abweichungY);
    return r.punkte;
  };
  const zuOben = zwei(s.tuerkis ?? s.rot, f.tuerkis ?? f.rot);
  if (!zuOben) throw new Error('Vorlage ohne geschlossene Maullinie');
  const zuUnten = s.tuerkis ? undefined : zwei(s.blau, f.blau);
  const aufOben = zwei(sa.rot, fa.rot);
  const aufUnten = zwei(sa.blau, fa.blau);
  const eingabe: MaulEingabe = {
    zu: zuUnten ? { oben: zuOben, unten: zuUnten } : { oben: zuOben },
    ...(aufOben && aufUnten ? { auf: { oben: aufOben, unten: aufUnten }, dokAuf: vorlageDokument(v, 'auf') } : {}),
  };
  return { eingabe, abweichungY: abw };
}
