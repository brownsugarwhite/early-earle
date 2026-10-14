// Gemeinsame Rechnung für Rig und Knochen der Fressen-Pose (Plan 5.2), in der Seite (KieferEbene) und auf der Bühne
// (knochen3d): Knochen bei einer Öffnung wie `maulPose`, und was ein Zug an einem Griff in die Maul-Optionen schreibt.
// Alle Punkte in Welt-Koordinaten der Seitenansicht (x, y), wie das Netz des Workers.
import type { V2 } from '@ee/shape';
import type { MaulOptionen } from '@ee/shape/kern';
import { aktuellesNetz } from '../kern/netzStand';
import { useUi } from '../state/uiStore';

export const GRAD = Math.PI / 180;

export type Rig = NonNullable<NonNullable<ReturnType<typeof aktuellesNetz>>['netz']['maul']>;

/** Griffe: Gelenk, Kieferlinie, Übergang (Rig) und die Knochen der Pose (drehen, ziehen). */
export type KieferGriff = 'gelenk' | 'weite' | 'w1' | 'w2' | 'kiefer-dreh' | 'kiefer-zug' | 'schaedel-dreh';

/** Rig des zuletzt gebauten Netzes (nur Bauweise Kern mit Maul). */
export function aktuellesRig(): Rig | null {
  if (useUi.getState().bauweise !== 'kern') return null;
  return aktuellesNetz()?.netz.maul ?? null;
}

export const rund = (x: number, s = 1000) => Math.round(x * s) / s;

/** Punkt p um c drehen (Bogenmaß, gegen den Uhrzeigersinn). */
export function drehen(p: V2, c: V2, a: number): V2 {
  const co = Math.cos(a);
  const si = Math.sin(a);
  return { x: c.x + (p.x - c.x) * co - (p.y - c.y) * si, y: c.y + (p.x - c.x) * si + (p.y - c.y) * co };
}

/** Vorzeichenbehafteter Winkel (Grad) von a nach b, gegen den Uhrzeigersinn positiv. */
export function winkelZwischen(a: V2, b: V2): number {
  return Math.atan2(a.x * b.y - a.y * b.x, a.x * b.x + a.y * b.y) / GRAD;
}

/** Punkt (Welt) beim Radius r und Winkel θ (Grad; 0° zur Schnauze, 90° nach unten) um das Gelenk. */
export function amGelenk(m: Rig, r: number, th: number): V2 {
  const g = m.rig.gelenk;
  return { x: g.x + r * m.rig.vorn * Math.cos(th * GRAD), y: g.y - r * Math.sin(th * GRAD) };
}

/** Winkel (Grad) eines Weltpunkts um das Gelenk, wie im Kern (−90 … 270). */
export function winkelAmGelenk(m: Rig, p: V2): number {
  const g = m.rig.gelenk;
  let th = Math.atan2(-(p.y - g.y), (p.x - g.x) * m.rig.vorn) / GRAD;
  if (th < -90) th += 360;
  return th;
}

/**
 * Knochen der Fressen-Pose bei Öffnung o (wie `maulPose`): Unterkiefer dreht um das Gelenk (−vorn · o · Winkel) und zieht
 * (o · Zug · Maullänge), der Schädel dreht um sein Gelenk hinten (vorn · o · Winkel).
 */
export function knochenBei(m: Rig, o: number) {
  const k = m.knochen;
  const v = m.rig.vorn;
  const g = m.rig.gelenk;
  const zug = { x: o * k.zug[0] * m.laenge * v, y: o * k.zug[1] * m.laenge };
  const aU = k.kippen ? -v * o * k.winkelUnten * GRAD : 0;
  const s = drehen(k.kieferSpitze, g, aU);
  return {
    kieferBasis: { x: g.x + zug.x, y: g.y + zug.y },
    kieferSpitze: { x: s.x + zug.x, y: s.y + zug.y },
    kieferMitte: { x: g.x + zug.x + 0.5 * (s.x - g.x), y: g.y + zug.y + 0.5 * (s.y - g.y) },
    schaedelBasis: k.schaedel,
    schaedelSpitze: drehen(k.schaedelSpitze, k.schaedel, v * o * k.winkelOben * GRAD),
  };
}

export const istKnochenGriff = (a: KieferGriff) => a === 'kiefer-dreh' || a === 'kiefer-zug' || a === 'schaedel-dreh';

/**
 * Zug an einem Griff: aus dem Stand am Gestenbeginn (Rig `m`, Zeiger `p0`) die Maul-Optionen für den Zeiger p.
 * Knochen relativ zum Griff (die Öffnung springt beim Greifen auf 100 %; absolut sprang der Knochen zum Zeiger).
 */
export function griffZug(m: Rig, art: KieferGriff, p0: V2): (p: V2) => Partial<MaulOptionen> {
  const { rig, laenge: L, knochen: kn } = m;
  const [r10, r20] = rig.kieferReichweite;
  const [a10, a20] = rig.kieferWinkel;
  switch (art) {
    case 'gelenk':
      // Versatz gegen den Mundwinkel in Maullängen (x nach hinten, y nach oben), wie `kieferGelenk` im Kern
      return (p) => ({ gelenk: [rund((rig.mundwinkel.x - p.x) / (rig.vorn * L)), rund((p.y - rig.mundwinkel.y) / L)] });
    case 'weite': {
      // relativ zum Griff: der Griff sitzt oft als Raute am Blattrand, weit innerhalb der echten Kieferlinie; absolut
      // sprang die Reichweite beim ersten Zug auf den Zeigerabstand (Kugel 2,0 → 0,83 Maullängen)
      const d0 = Math.hypot(p0.x - rig.gelenk.x, p0.y - rig.gelenk.y);
      return (p) => {
        const r2 = Math.max(0.3, r20 + (Math.hypot(p.x - rig.gelenk.x, p.y - rig.gelenk.y) - d0) / L);
        return { kieferReichweite: [rund((r2 * r10) / r20), rund(r2)] };
      };
    }
    case 'w1':
      return (p) => ({ kieferWinkel: [rund(Math.max(0, Math.min(a20 - 20, winkelAmGelenk(m, p))), 10), a20] });
    case 'w2':
      return (p) => ({ kieferWinkel: [a10, rund(Math.min(200, Math.max(a10 + 20, winkelAmGelenk(m, p))), 10)] });
    case 'kiefer-dreh': {
      // Drehung des Zeigers um das gezogene Gelenk seit dem Greifen; in `maulPose` dreht der Kiefer um −vorn · Winkel
      const basis = { x: rig.gelenk.x + kn.zug[0] * L * rig.vorn, y: rig.gelenk.y + kn.zug[1] * L };
      return (p) => {
        const phi = winkelZwischen({ x: p0.x - basis.x, y: p0.y - basis.y }, { x: p.x - basis.x, y: p.y - basis.y });
        return { winkelUnten: rund(Math.max(-20, Math.min(120, kn.winkelUnten - rig.vorn * phi)), 10) };
      };
    }
    case 'kiefer-zug':
      // Zug in Maullängen (x zur Schnauze, y nach oben), vom Stand am Gestenbeginn
      return (p) => ({ kieferZug: [rund(kn.zug[0] + ((p.x - p0.x) * rig.vorn) / L), rund(kn.zug[1] + (p.y - p0.y) / L)] });
    case 'schaedel-dreh':
      return (p) => {
        const phi = winkelZwischen({ x: p0.x - kn.schaedel.x, y: p0.y - kn.schaedel.y }, { x: p.x - kn.schaedel.x, y: p.y - kn.schaedel.y });
        return { winkelOben: rund(Math.max(-20, Math.min(60, kn.winkelOben + rig.vorn * phi)), 10) };
      };
  }
}
