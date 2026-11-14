// Plan 20.10., V3: Ziele von G/S/R in einem Blatt — was bewegt wird und wie das Ergebnis ins Dokument kommt. Reihenfolge:
// gewählte Knoten einer P-Linie, gewählte Punkte eines Spants (Front/Back), eigene Umrissknoten, Ringe fremder Knoten (nur
// in der Koordinate, die beide Ansichten teilen). Gerechnet wird in Arbeitskoordinaten: im Blatt, bei fremden Ringen in der
// Zeichnung ihres Knotens. Die Kurven sind der Stand am Anfang der Operation; jede Bewegung rechnet von dort aus.

import { type Ansicht, type Profil, type Profile, type V2, achsenRegeln, istAchsKnoten, spantKasten, spantNachWelt, spantRichtungNachWelt, spantTeilProfil, weltNachSpant, weltRichtungNachSpant } from '@ee/shape';
import { mitTeilProfil } from '@ee/shape/kern';
import { ausAnsicht2, inAnsicht2 } from '@ee/shape/versuch';
import { kantenPunktStetig } from '../../kanten/kantenFlaeche';
import { gemeinsamerZug, kantenKnotenLage, netzJetzt, umrissKnotenLage } from '../../netz/netzLage';
import { useEditor } from '../../state/editorStore';
import { useUi } from '../../state/uiStore';
import { uebernehmenAktiv } from '../aktiv';
import { type BKnoten, type Frei, type GKurve, type Sperre, auswahlMitte, freiImBlatt } from './abbildung';

export type ZielArt = 'kante' | 'spant' | 'umriss' | 'fremd';

export type ModalZiel = {
  art: ZielArt;
  /** Blatt, in dem die Operation läuft */
  ansicht: Ansicht;
  /** Kurven in Arbeitskoordinaten mit Auswahl (Stand am Anfang) */
  kurven: GKurve[];
  /** Mitte in Arbeitskoordinaten und im Blatt (S und R aus dem Zeiger, Anzeige) */
  mitte: V2;
  mitteBlatt: V2;
  /** Zahl der gewählten Punkte (Anzeige) */
  anzahl: number;
  /** R möglich? (fremde Ringe: nein) */
  drehen: boolean;
  /** Was eine Sperre im Blatt frei lässt (Achsenlinie, Zahlen); null = sie wirkt hier nicht */
  freiBlatt(s: Sperre | null): Frei | null;
  /** dasselbe in Arbeitskoordinaten */
  freiArbeit(s: Sperre | null): Frei | null;
  /** Versatz im Blatt → Arbeitskoordinaten */
  versatz(d: V2): V2;
  /** Ergebnis übernehmen (während der Geste; Umrisse gekoppelt, P-Linien auf der Haut) */
  setzen(kurven: BKnoten[][]): void;
};

const BLAETTER = ['seite', 'front', 'top'] as const;
type Blatt = (typeof BLAETTER)[number];

/** Koordinate, die zwei Ansichten teilen: Lage im Blatt (u/v) und in der Zeichnung der Quelle (x/y). */
const GEMEINSAM: Record<Blatt, Partial<Record<Blatt, { blatt: 'u' | 'v'; quelle: 'x' | 'y'; name: string }>>> = {
  seite: { front: { blatt: 'v', quelle: 'y', name: 'Y' }, top: { blatt: 'u', quelle: 'x', name: 'X' } },
  front: { seite: { blatt: 'v', quelle: 'y', name: 'Y' }, top: { blatt: 'u', quelle: 'y', name: 'Z' } },
  top: { seite: { blatt: 'u', quelle: 'x', name: 'X' }, front: { blatt: 'v', quelle: 'x', name: 'Z' } },
};

/** Spiegelachse eines halben Umrisses, wenn die Auswahl sie berührt (Mitte auf der Achse). */
const achseWennBeruehrt = (pr: Profil, indizes: Iterable<number>): 'x' | 'y' | null => {
  if (pr.art !== 'halb') return null;
  for (const i of indizes) if (istAchsKnoten(pr, i)) return pr.achse === 'senkrecht' ? 'x' : 'y';
  return null;
};

/** Ziel für G/S/R im Blatt (`nur` = genau diese Art, z. B. beim Knotenzug mit der Maus); null = nichts gewählt. */
export function zielFuer(ansicht: Ansicht, nur?: ZielArt): ModalZiel | null {
  for (const art of nur ? [nur] : (['kante', 'spant', 'umriss', 'fremd'] as const)) {
    const z = art === 'kante' ? kantenZiel(ansicht) : art === 'spant' ? spantZiel(ansicht) : art === 'umriss' ? umrissZiel(ansicht) : fremdZiel(ansicht);
    if (z) return z;
  }
  return null;
}

function blattZiel(ansicht: Ansicht): Pick<ModalZiel, 'freiBlatt' | 'freiArbeit' | 'versatz' | 'drehen' | 'ansicht'> {
  return { ansicht, drehen: true, freiBlatt: (s) => freiImBlatt(ansicht, s), freiArbeit: (s) => freiImBlatt(ansicht, s), versatz: (d) => d };
}

/** Eigene Umrissknoten des Blatts; die anderen Ansichten folgen über die Kopplung wie bei einem Zug. */
function umrissZiel(ansicht: Ansicht): ModalZiel | null {
  const auswahlBasis = useUi.getState().auswahl;
  const basis: Profile = useEditor.getState().dok.profile;
  const pr = basis[ansicht];
  const sel = auswahlBasis[ansicht].filter((i) => i >= 0 && i < pr.knoten.length);
  if (!sel.length) return null;
  const gewaehlt = new Set(sel);
  const mitte = auswahlMitte(sel.map((i) => pr.knoten[i]!.p), achseWennBeruehrt(pr, sel));
  return {
    ...blattZiel(ansicht),
    art: 'umriss',
    kurven: [{ knoten: pr.knoten, geschlossen: pr.art === 'geschlossen', gewaehlt }],
    mitte,
    mitteBlatt: mitte,
    anzahl: sel.length,
    setzen: ([knoten]) => uebernehmenAktiv(ansicht, achsenRegeln({ ...pr, knoten: knoten as Profil['knoten'] }), sel, basis, auswahlBasis),
  };
}

/**
 * Ringe fremder Knoten (gewählt in ihrer Zeichnung, z. B. durch Greifen des Rings): nur die Koordinate, die beide
 * Ansichten teilen, bewegt sich; gerechnet wird in der Zeichnung des Knotens, die Mitte im Blatt ist die der Ringe.
 */
function fremdZiel(ansicht: Ansicht): ModalZiel | null {
  const ns = netzJetzt();
  if (!ns) return null;
  const ui = useUi.getState();
  const dok = useEditor.getState().dok;
  const kandidaten = BLAETTER.filter((q) => q !== ansicht && ui.auswahl[q].length);
  const quelle = kandidaten.find((q) => q === ui.aktiv) ?? kandidaten[0];
  const g = quelle ? GEMEINSAM[ansicht as Blatt][quelle] : undefined;
  if (!quelle || !g) return null;
  const basis: Profile = dok.profile;
  const auswahlBasis = ui.auswahl;
  const pr = basis[quelle];
  const sel = auswahlBasis[quelle].filter((i) => i >= 0 && i < pr.knoten.length);
  const ringe = sel.flatMap((i) => {
    const l = umrissKnotenLage(dok, quelle, i, false, ns);
    return l ? [inAnsicht2(l.p, ansicht)] : [];
  });
  if (!sel.length || !ringe.length) return null;
  const nurGemeinsam = (s: Sperre | null): boolean => {
    const f = freiImBlatt(ansicht, s);
    return !!f && f[g.blatt];
  };
  return {
    art: 'fremd',
    ansicht,
    drehen: false,
    kurven: [{ knoten: pr.knoten, geschlossen: pr.art === 'geschlossen', gewaehlt: new Set(sel) }],
    mitte: auswahlMitte(sel.map((i) => pr.knoten[i]!.p), achseWennBeruehrt(pr, sel)),
    mitteBlatt: auswahlMitte(ringe, null),
    anzahl: sel.length,
    freiBlatt: (s) => (nurGemeinsam(s) ? { u: g.blatt === 'u', v: g.blatt === 'v' } : null),
    freiArbeit: (s) => (nurGemeinsam(s) ? { u: g.quelle === 'x', v: g.quelle === 'y' } : null),
    versatz: (d) => gemeinsamerZug(ansicht, quelle, d, false),
    setzen: ([knoten]) => uebernehmenAktiv(quelle, achsenRegeln({ ...pr, knoten: knoten as Profil['knoten'] }), sel, basis, auswahlBasis),
  };
}

/** Name der gemeinsamen Koordinate (Hinweis bei fremden Ringen). */
export function gemeinsameAchse(ansicht: Ansicht): string | null {
  const ui = useUi.getState();
  const q = BLAETTER.find((x) => x !== ansicht && ui.auswahl[x].length);
  return q ? (GEMEINSAM[ansicht as Blatt][q]?.name ?? null) : null;
}

/**
 * Knoten von P-Linien in der Ansicht des Blatts: Lage = der gezeigte Punkt auf der Haut; nach der Abbildung wieder auf die
 * Haut gelegt (wie beim Ziehen). Alle Linien sind Kandidaten fürs proportionale Bearbeiten, gewählt ist die eine.
 */
function kantenZiel(ansicht: Ansicht): ModalZiel | null {
  const a = useUi.getState().kantenAuswahl;
  const liste = useEditor.getState().dok.kanten ?? [];
  const k = a ? liste[a.kante] : undefined;
  const sel = a && k ? a.indizes.filter((i) => i >= 0 && i < k.knoten.length) : [];
  if (!a || !k || !sel.length) return null;
  const ns = netzJetzt();
  const lagen = liste.map((kk, ki) => kk.knoten.map((kn, i) => (ns ? kantenKnotenLage(kk, ki, i, ns) : kn.p)));
  const kurven: GKurve[] = liste.map((kk, ki) => ({
    knoten: kk.knoten.map((kn, i) => ({ p: inAnsicht2(lagen[ki]![i]!, ansicht), ein: inAnsicht2(kn.ein, ansicht), aus: inAnsicht2(kn.aus, ansicht), art: kn.art })),
    geschlossen: false,
    gewaehlt: new Set(ki === a.kante ? sel : []),
  }));
  const mitte = auswahlMitte(sel.map((i) => kurven[a.kante]!.knoten[i]!.p), null);
  return {
    ...blattZiel(ansicht),
    art: 'kante',
    kurven,
    mitte,
    mitteBlatt: mitte,
    anzahl: sel.length,
    setzen: (neu) => {
      const dok = useEditor.getState().dok;
      const out = liste.map((kk, ki) => {
        let anders = false;
        const knoten = kk.knoten.map((kn, i) => {
          const b = kurven[ki]!.knoten[i]!;
          const n = neu[ki]?.[i];
          if (!n || n === b) return kn;
          anders = true;
          const alt = lagen[ki]![i]!;
          const p = n.p === b.p ? kn.p : (kantenPunktStetig(dok, ansicht, n.p, alt) ?? ausAnsicht2(alt, ansicht, n.p));
          return { ...kn, p, ein: ausAnsicht2(kn.ein, ansicht, n.ein), aus: ausAnsicht2(kn.aus, ansicht, n.aus) };
        });
        return anders ? { ...kk, knoten } : kk;
      });
      useEditor.getState().setzeKanten(out);
    },
  };
}

/** Punkte des gewählten Spants (Front/Back), in Blatt-Koordinaten über den Kasten des Spants. */
function spantZiel(ansicht: Ansicht): ModalZiel | null {
  if (ansicht !== 'front') return null;
  const s = useUi.getState().spantAuswahl;
  const dok = useEditor.getState().dok;
  const sp = s ? dok.spanten?.[s.spant] : undefined;
  if (!s || !sp) return null;
  const teil = s.teil ?? 'oben';
  const pr = spantTeilProfil(sp, teil);
  const sel = s.knoten.filter((i) => i >= 0 && i < pr.knoten.length);
  if (!sel.length) return null;
  const k = spantKasten(dok, sp.f);
  const welt: BKnoten[] = pr.knoten.map((kn) => ({ ...kn, p: spantNachWelt(k, kn.p), ein: spantRichtungNachWelt(k, kn.ein), aus: spantRichtungNachWelt(k, kn.aus) }));
  const mitte = auswahlMitte(sel.map((i) => welt[i]!.p), achseWennBeruehrt(pr, sel));
  return {
    ...blattZiel(ansicht),
    art: 'spant',
    kurven: [{ knoten: welt, geschlossen: pr.art === 'geschlossen', gewaehlt: new Set(sel) }],
    mitte,
    mitteBlatt: mitte,
    anzahl: sel.length,
    setzen: ([knoten]) => {
      const zurueck = knoten!.map((kn, i) => (kn === welt[i] ? pr.knoten[i]! : { ...pr.knoten[i]!, p: weltNachSpant(k, kn.p), ein: weltRichtungNachSpant(k, kn.ein), aus: weltRichtungNachSpant(k, kn.aus) }));
      const liste = (useEditor.getState().dok.spanten ?? []).slice();
      liste[s.spant] = mitTeilProfil(sp, teil, achsenRegeln({ ...pr, knoten: zurueck }));
      useEditor.getState().setzeSpanten(liste);
    },
  };
}
