// Zahn-Versuch (12.10.): Zähne aus dem Dokument am Zahnfleisch des Maul-Käfigs (`packages/shape/src/versuch/zaehne.ts`).
// Das Dokument speichert die rechte Hälfte je Kiefer; hier entstehen beide Seiten. Ohne Abhängigkeit vom Maul-Körper,
// damit auch die Versuchsseite (`?versuch=maul`) sie nutzen kann.

import type { Zaehne, ZahnEintrag, Zahnreihe } from '@ee/shape';
import { type Kiefer, type MaulKaefig, type Netz, type Zahn, type ZahnAuf, type ZahnForm, zahnNetze, zahnfleischAusKaefig } from '@ee/shape/versuch';

const ZAHN_FARBE: [number, number, number] = [0.97, 0.94, 0.86];

/** Tiefe (quer zum Zahnfleisch) fehlt im Dokument: ¾ der Breite. */
const TIEFE = 0.75;

function zahnAus(e: ZahnEintrag, kiefer: Kiefer, seite: -1 | 0 | 1): Zahn {
  const form: ZahnForm = {
    laenge: e.laenge,
    breite: e.breite,
    tiefe: e.breite * TIEFE,
    rundheit: e.rundheit,
    schaerfe: e.schaerfe,
    neigung: e.neigung,
    biegung: e.biegung,
    spreizung: e.spreizung,
    aussen: e.aussen,
  };
  const zahn: Zahn = { ...form, kiefer, u: seite === 0 ? 0 : e.u, seite };
  if (e.auf && Object.keys(e.auf).length) {
    const auf: ZahnAuf = { ...e.auf };
    if (e.auf.breite !== undefined) auf.tiefe = e.auf.breite * TIEFE;
    zahn.auf = auf;
  }
  return zahn;
}

/** Ein Zahn beider Seiten mit seinem Eintrag im Dokument (Kiefer, Index der rechten Hälfte). */
export type ZahnMitQuelle = { zahn: Zahn; kiefer: Kiefer; index: number };

/** Dokument (rechte Hälfte je Kiefer, bei ungerader Zahl zuerst der Mittelzahn) → Zähne beider Seiten. */
export function zahnListe(z: Zaehne | undefined): ZahnMitQuelle[] {
  if (!z) return [];
  const reihe = (r: Zahnreihe, kiefer: Kiefer): ZahnMitQuelle[] =>
    r.zaehne.flatMap((e, index) =>
      r.anzahl % 2 === 1 && index === 0
        ? [{ zahn: zahnAus(e, kiefer, 0), kiefer, index }]
        : [
            { zahn: zahnAus(e, kiefer, 1), kiefer, index },
            { zahn: zahnAus(e, kiefer, -1), kiefer, index },
          ],
    );
  return [...reihe(z.oben, 'oben'), ...reihe(z.unten, 'unten')];
}

export const zaehneAusDok = (z: Zaehne | undefined): Zahn[] => zahnListe(z).map((q) => q.zahn);

const fleischSpeicher = new WeakMap<Netz, ReturnType<typeof zahnfleischAusKaefig>>();

/** Zahnfleisch beider Kiefer für eine Lage des Käfigs (gemerkt je Käfig-Objekt). */
export function fleischVon(mk: MaulKaefig, kaefig: Netz, stufen = 3): ReturnType<typeof zahnfleischAusKaefig> {
  let f = fleischSpeicher.get(kaefig);
  if (!f) {
    f = zahnfleischAusKaefig(mk, kaefig, stufen);
    fleischSpeicher.set(kaefig, f);
  }
  return f;
}

/** Zähne am Zahnfleisch des Käfigs in der Lage `kaefig` (Öffnung α), als Dreiecke mit Zahnfarbe. */
export function zahnDreiecke(mk: MaulKaefig, kaefig: Netz, zaehne: readonly Zahn[], alpha: number, stufen = 3) {
  const fleisch = fleischVon(mk, kaefig, stufen);
  const z = zahnNetze(zaehne, fleisch, alpha);
  const farben = new Float32Array(z.positionen.length);
  for (let i = 0; i < farben.length; i += 3) farben.set(ZAHN_FARBE, i);
  return { positionen: z.positionen, normalen: z.normalen, farben };
}

export const anhaengen = (a: Float32Array, b: Float32Array) => {
  const c = new Float32Array(a.length + b.length);
  c.set(a);
  c.set(b, a.length);
  return c;
};
