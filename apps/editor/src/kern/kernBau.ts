// Wesen-Editor 2, Tab „kern“ (Phase 0 → Phase 1 / M1): dünner Adapter zwischen Editor-Zustand und dem Wesen-Bau.
// Die Rechnung liegt DOM-frei in `packages/shape/src/kern/wesen.ts` und läuft im Worker (`wesen.worker.ts`,
// „neuester Auftrag gewinnt“); hier entsteht aus Dokument und Anzeige-Zustand nur der Bauplan.

import type { Dokument } from '@ee/shape';
import { type BeinArt, type Bauplan, type MaulArt, type StilArt, type WesenInfo, type WesenNetz, maulLinieAusPunkten, pruefwesenBauplan } from '@ee/shape/kern';
import { abtasten3 } from '@ee/shape/versuch';
import { create } from 'zustand';
import { useUi } from '../state/uiStore';
import { type Look, PALETTEN } from '../three/wesenLook';
import { WesenClient } from './wesenClient';

export type { BeinArt, MaulArt, StilArt };
export type KernInfo = WesenInfo;
export type KernNetz = WesenNetz;

const q = new URLSearchParams(location.search);
// Earle-Look von der ersten Sekunde an (Plan 9.1); `?look=matcap` zeigt die Prüfansicht, `?palette=` wählt die Farben
const startLook: Look = q.get('look') === 'matcap' ? 'matcap' : 'earle';
const startPalette = q.get('palette') && PALETTEN[q.get('palette')!] ? q.get('palette')! : 'blob';
const startMaul: MaulArt = (['vorn', 'unten', 'hals'] as const).find((a) => a === q.get('maul')) ?? 'aus';
const startBeine: BeinArt = (['verschmolzen', 'angesteckt'] as const).find((a) => a === q.get('beine')) ?? 'aus';
const startStil: StilArt = (['feuer', 'gas', 'fell'] as const).find((a) => a === q.get('stil')) ?? 'fest';
if (q.get('oeffnung')) useUi.getState().setzeOeffnung(Number(q.get('oeffnung')));
if (q.get('zebra') === '1') useUi.getState().setzeZebra(true);
/** Zonen-Atlas (Beweis 4) an, `&atlas=0` zeigt die prozeduralen Zonen */
const atlasAn = q.get('atlas') !== '0';
// Kamera für Bilder: `kamera=azimut°,elevation°,distanz[,zielX,zielY,zielZ]`
if (q.get('kamera')) {
  const [az, el, dist, zx, zy, zz] = q.get('kamera')!.split(',').map(Number);
  if (Number.isFinite(az) && Number.isFinite(el) && Number.isFinite(dist)) useUi.setState({ kamera: { azimut: (az! * Math.PI) / 180, elevation: (el! * Math.PI) / 180, distanz: dist!, ziel: [zx ?? 0, zy ?? 0.18, zz ?? 0] } });
}

export const useKernAnzeige = create<{
  info: KernInfo | null;
  look: Look;
  palette: string;
  /** Beweis 2: Maul an einer der drei Stellen (vorgefertigte Linie je Wesen) */
  maul: MaulArt;
  /** Käfig als Linien zeigen (Röntgen) */
  kaefig: boolean;
  /** Beweis 3: zwei Säulenbeine (Ring 15, Winkel 6, gespiegelt), Schwung in Grad */
  beine: BeinArt;
  schwung: number;
  /** Beweis 5: Stil fest · feuer · gas · fell (Klingen als Käfige, Feuer/Gas-Material) */
  stil: StilArt;
  setzeStil: (s: StilArt) => void;
  setzeLook: (l: Look) => void;
  setzePalette: (p: string) => void;
  setzeMaul: (m: MaulArt) => void;
  setzeKaefig: (an: boolean) => void;
  setzeBeine: (b: BeinArt) => void;
  setzeSchwung: (grad: number) => void;
}>((set) => ({
  info: null,
  look: startLook,
  palette: startPalette,
  maul: startMaul,
  kaefig: q.get('kaefig') === '1',
  beine: startBeine,
  schwung: q.get('schwung') ? Number(q.get('schwung')) : 0,
  stil: startStil,
  setzeStil: (stil) => set({ stil }),
  setzeLook: (look) => set({ look }),
  setzePalette: (palette) => set({ palette }),
  setzeMaul: (maul) => set({ maul }),
  setzeKaefig: (kaefig) => set({ kaefig }),
  setzeBeine: (beine) => set({ beine }),
  setzeSchwung: (schwung) => set({ schwung: Math.max(-60, Math.min(60, schwung)) }),
}));

/**
 * Bauplan: Prüfwesen-Anteile nach Namen, darüber die Ausstattung des Dokuments (Version 1), darüber der Anzeige-Zustand.
 * Eine im Maul-Tab gezeichnete Lippenlinie (`dok.maul.zu.oben`, Florians Ablauf vom 12.10.: ab Kontur oder Achse zum
 * Mundwinkel) wird die Maullinie des Kerns (M3); fehlt eine Lage, gilt „vorn“ (Kippen).
 */
export function bauplanAus(dok: Dokument): Partial<Bauplan> {
  const s = useKernAnzeige.getState();
  const aus = { ...pruefwesenBauplan(dok.name), ...(dok.ausstattung ?? {}) };
  let maulLinie = aus.maulLinie;
  let maul: MaulArt = s.maul;
  const gezeichnet = dok.maul?.zu.oben;
  if (!dok.ausstattung?.maulLinie && gezeichnet && gezeichnet.knoten.length >= 2) {
    try {
      const sk = dok.skalierung;
      const punkte = abtasten3(gezeichnet, 24).map((p) => ({ x: p[0] * sk, y: p[1] * sk }));
      maulLinie = { ...maulLinieAusPunkten(dok, punkte), unterSpitze: 1 };
      if (maul === 'aus') maul = 'vorn';
    } catch (e) {
      console.warn('[kern] Maullinie aus Zeichnung nicht übersetzbar:', e);
    }
  }
  return {
    ...aus,
    ...(maulLinie ? { maulLinie } : {}),
    maul,
    oeffnung: useUi.getState().oeffnung,
    beine: s.beine,
    schwung: s.schwung,
    stil: s.stil,
    earle: s.look === 'earle',
    kaefigLinien: s.kaefig,
    atlas: atlasAn,
  };
}

let client: WesenClient | null = null;
function derClient(): WesenClient {
  client ??= new WesenClient();
  return client;
}

let letztesNetz: { netz: KernNetz; skalierung: number } | null = null;
/** Das zuletzt gebaute Netz (für Treffer und Griffe im Hauptthread), mit dem Maßstab des Dokuments. */
export function aktuellesNetz(): { netz: KernNetz; skalierung: number } | null {
  return letztesNetz;
}

/** Feines Netz der Bauweise „kern“ im Worker bauen; während Gesten nur Zug, sonst Ableitung. Der neueste Auftrag gewinnt. */
export function kernBauen(dok: Dokument, schnell: boolean, cb: (netz: KernNetz) => void): void {
  derClient().bauen(dok, bauplanAus(dok), schnell, (netz) => {
    useKernAnzeige.setState({ info: netz.info });
    letztesNetz = { netz, skalierung: dok.skalierung };
    cb(netz);
  });
}

/** Animation (Beweis 5): Klingen für die Zeit t; false, wenn der Worker beschäftigt ist. */
export function kernAnimieren(zeit: number, cb: (a: { positionen: Float32Array; normalen: Float32Array } | null) => void): boolean {
  return derClient().animieren(zeit, cb);
}
