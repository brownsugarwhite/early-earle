// Nahtrundgang mit Lücke am Lippenanfang (15.10.): Beim Ringanfang (Maul unter der Nase, Florians Giraffe) fehlte die
// Nasenunterseite im Rundgang, die letzten Nahtpunkte bekamen ihre Ziele über den Rückweg die ganze Nase entlang — die
// Mittelnaht des Unterkiefers lag über dem Lippenanfang (geschlossen 92, offen 52–60 Durchdringungen).
import { describe, expect, it } from 'vitest';
import { type Vorlage, vorlageDokument } from '../versuch';
import langhalsRoh from '../versuch/vorlagen/langhals.json';
import { kugelMaulDokument, langhalsLinieDokument, pruefenMaul } from './pruefstand';

describe('Naht mit Lücke am Lippenanfang', () => {
  it('Langhals mit Maul unter dem Kopf (Ringanfang): keine Durchdringungen bei 0–100 %, Seite ≤ 2,5 px', () => {
    const dok = langhalsLinieDokument(vorlageDokument(langhalsRoh as unknown as Vorlage, 'zu', 'langhals'), { x: -0.125, y: 0.611 }, { x: -0.085, y: 0.635 }, { x: -0.04, y: 0.66 });
    const r = pruefenMaul(dok);
    for (const p of r.paare) expect(p.paare, `Öffnung ${p.oeffnung}`).toBe(0);
    expect(r.delta.seite).toBeLessThan(2.5);
    expect(r.lippen.oben.seite).toBeLessThan(1);
  }, 60_000);

  it('Kugel (Lippe an der Spitze): unverändert — Lippe auf der Linie, offen keine Durchdringungen', () => {
    const r = pruefenMaul(kugelMaulDokument('gleich', true));
    expect(r.lippen.oben.seite).toBeLessThan(0.5);
    for (const p of r.paare.slice(1, 4)) expect(p.paare, `Öffnung ${p.oeffnung}`).toBe(0);
  }, 60_000);
});
