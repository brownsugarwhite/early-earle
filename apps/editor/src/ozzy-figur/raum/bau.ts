// Ozzy im Raum (Beweis 3D): alles, was aus Florians SVGs gebaut wird (Körper, Netz, Weiß, Sichtbarkeit), ohne DOM. Läuft im Worker.
import { importieren } from '../vorlagen/import';
import { figurBauen, paarKarten, type PaarKarte } from './koerper';
import { type Maske, maskeVon } from './masken';
import { type Netz, netzBauen } from './netz';

export interface Bau {
  netz: Netz;
  karten: PaarKarte[];
  masken: { front: Maske; seite: Maske; ruecken: Maske };
  zeiten: Record<string, number>;
}

export function bauen(texte: Record<string, string>, h = 2.5, k = 3): Bau {
  const zeiten: Record<string, number> = {};
  let t = performance.now();
  const schritt = (name: string): void => {
    const jetzt = performance.now();
    zeiten[name] = Math.round(jetzt - t);
    t = jetzt;
  };
  const d = importieren(texte);
  schritt('import');
  const figur = figurBauen(d, k);
  const karten = paarKarten(d);
  schritt('koerper');
  const netz = netzBauen(figur, h);
  schritt('netz');
  const masken = { front: maskeVon(d, 'front'), seite: maskeVon(d, 'profil'), ruecken: maskeVon(d, 'back') };
  schritt('masken');
  return { netz, karten, masken, zeiten };
}
