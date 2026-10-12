// Zahn-Versuch (12.10.): Zähne aus dem Dokument am Zahnfleisch des Maul-Käfigs (`packages/shape/src/versuch/zaehne.ts`).
// Das Dokument speichert die rechte Hälfte je Kiefer; hier entstehen beide Seiten. Ohne Abhängigkeit vom Maul-Körper,
// damit auch die Versuchsseite (`?versuch=maul`) sie nutzen kann.

import type { Zaehne, ZahnEintrag, Zahnreihe } from '@ee/shape';
import {
  type Kiefer,
  type MaulKaefig,
  type Netz,
  type Zahn,
  type ZahnAenderung,
  type ZahnAuf,
  type ZahnBefund,
  type ZahnForm,
  zahnNetze,
  zahnPruefen,
  zahnfleischAusKaefig,
} from '@ee/shape/versuch';

const ZAHN_FARBE: [number, number, number] = [0.97, 0.94, 0.86];
/** Zahn, der geschlossen stört (Prüfung des Zahn-Versuchs) */
const ZAHN_ROT: [number, number, number] = [0.95, 0.25, 0.22];

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

/** Zähne am Zahnfleisch des Käfigs in der Lage `kaefig` (Öffnung α), als Dreiecke; `rot` = Indizes störender Zähne. */
export function zahnDreiecke(mk: MaulKaefig, kaefig: Netz, zaehne: readonly Zahn[], alpha: number, stufen = 3, rot: ReadonlySet<number> = new Set()) {
  const fleisch = fleischVon(mk, kaefig, stufen);
  const z = zahnNetze(zaehne, fleisch, alpha);
  const farben = new Float32Array(z.positionen.length);
  z.bereiche.forEach((b, i) => {
    const c = rot.has(i) ? ZAHN_ROT : ZAHN_FARBE;
    for (let k = b.start; k < b.start + b.anzahl; k++) farben.set(c, k * 3);
  });
  return { positionen: z.positionen, normalen: z.normalen, farben };
}

// ---------- Prüfung im geschlossenen Maul ----------

/** Schwerster Befund eines Dokument-Zahns (beide Seiten zusammen); `listenIndex` = Lage in `zahnListe`. */
export type ZahnMeldung = { kiefer: Kiefer; index: number; befund: ZahnBefund; listenIndizes: number[] };

let pruefSpeicher: { kaefig: Netz; zaehne: Zaehne; meldungen: ZahnMeldung[] } | null = null;

/**
 * Prüfung der Zähne im geschlossenen Maul (`zahnPruefen`, 75–185 ms): gemerkt je Käfig und Zahnreihen. Während einer
 * Geste `zahnMeldungenZuletzt()` benutzen, damit Regler flüssig bleiben.
 */
export function zahnMeldungen(mk: MaulKaefig, zu: Netz, zaehne: Zaehne): ZahnMeldung[] {
  if (pruefSpeicher && pruefSpeicher.kaefig === zu && pruefSpeicher.zaehne === zaehne) return pruefSpeicher.meldungen;
  const liste = zahnListe(zaehne);
  const befunde = liste.length ? zahnPruefen(mk, zu, liste.map((q) => q.zahn)) : [];
  const je = new Map<string, ZahnMeldung>();
  for (const b of befunde) {
    const q = liste[b.zahn];
    if (!q || b.art === 'ok') continue;
    const schluessel = `${q.kiefer}:${q.index}`;
    const alt = je.get(schluessel);
    if (!alt) je.set(schluessel, { kiefer: q.kiefer, index: q.index, befund: b, listenIndizes: [b.zahn] });
    else {
      if (!alt.listenIndizes.includes(b.zahn)) alt.listenIndizes.push(b.zahn);
      if (b.tiefe > alt.befund.tiefe) alt.befund = b;
    }
  }
  const meldungen = [...je.values()];
  pruefSpeicher = { kaefig: zu, zaehne, meldungen };
  return meldungen;
}

export const zahnMeldungenZuletzt = (): ZahnMeldung[] => pruefSpeicher?.meldungen ?? [];

/** Befund in Worten (Bildpunkte der 461-px-Kachel wie die Regler). */
export function befundText(b: ZahnBefund): string {
  const px = Math.max(0.1, b.tiefe * 461).toFixed(1).replace('.', ',');
  if (b.art === 'durchKiefer') return `stößt ${px} px in den Gegenkiefer`;
  if (b.art === 'zuNah') return `außen zu nah an der Gegenlippe (${px} px Luft fehlen)`;
  if (b.art === 'zahnZahn') return `überlappt einen Nachbarzahn um ${px} px`;
  return `sticht ${px} px aus der Haut`;
}

/** Vorschlag des Prüfers auf den Dokument-Zahn anwenden (die Tiefe folgt im Dokument der Breite). */
export function aenderungAnwenden(e: ZahnEintrag, a: ZahnAenderung): ZahnEintrag {
  const neu: ZahnEintrag = { ...e };
  for (const k of ['laenge', 'breite', 'rundheit', 'schaerfe', 'neigung', 'biegung', 'spreizung', 'u'] as const) {
    const v = a[k];
    if (v !== undefined) neu[k] = v;
  }
  if (a.aussen !== undefined) neu.aussen = a.aussen;
  if (a.auf) {
    const auf = { ...e.auf, ...a.auf };
    delete auf.tiefe;
    neu.auf = auf;
  }
  return neu;
}

export const anhaengen = (a: Float32Array, b: Float32Array) => {
  const c = new Float32Array(a.length + b.length);
  c.set(a);
  c.set(b, a.length);
  return c;
};
