// Prüfstand „ruhiges Netz“ (Block 1): Florians Komma und die Wächter Kugel, Rex, Tiger, Langhals. Misst Δ je Blatt,
// Faltenmaß, Sägezahn und Lokalität; Zahlen mit `--reporter=verbose` lesen.
import { describe, expect, it } from 'vitest';
import { neuesDokument } from '../dokument';
import langhalsRoh from '../versuch/vorlagen/langhals.json';
import rexRoh from '../versuch/vorlagen/rex.json';
import tigerRoh from '../versuch/vorlagen/tiger.json';
import { type Vorlage, vorlageDokument } from '../versuch/vorlagen';
import { kastenSpanten } from './kasten';
import { kommaDokument, kugelMaulDokument, lokalitaet, pruefen, pruefenMaul, ringTabelle } from './pruefstand';

declare const console: { log: (...a: unknown[]) => void };
const f1 = (x: number) => x.toFixed(1);

function bericht(name: string, r: ReturnType<typeof pruefen>) {
  console.log(`${name}: Δ Seite ${f1(r.delta.seite)} / Front ${f1(r.delta.front)} / Top ${f1(r.delta.top)} px · Falten max ${f1(r.falte.max)}° p99 ${f1(r.falte.p99)}° (>20°: ${r.falte.ueber20}) · Sägezahn ${r.saege} · ${r.zeit.toFixed(0)} ms`);
}

function tigerDokument() {
  const d = vorlageDokument(tigerRoh as unknown as Vorlage, 'zu', 'tiger');
  return { ...d, spanten: kastenSpanten(d.profile.front, 0.02, 0.15, 0.25, 0.85) };
}

describe('Prüfstand ruhiges Netz', () => {
  it('Florians Komma (hochgezogener Schwanz): Maße und Ringtabelle', () => {
    const dok = kommaDokument();
    const r3 = pruefen(dok, { stufen: 3 });
    bericht('Komma Stufe 3', r3);
    const r2 = pruefen(dok, { stufen: 2 });
    bericht('Komma Stufe 2', r2);
    for (const z of ringTabelle(r2.abl)) console.log(`  Ring ${z.i}: Mitte (${z.mitte.x.toFixed(3)}, ${z.mitte.y.toFixed(3)}) Neigung ${z.neigung.toFixed(2)} Breite ${z.breite.toFixed(4)} Höhe ${z.hoehe.toFixed(4)}`);
    expect(Number.isFinite(r3.delta.front)).toBe(true);
  });
  it('Seite über Front und Top hinausgezogen (Komma, Front/Top noch Kugel): runder Schwanz statt Kasten', () => {
    // 14.10.: Ringe außerhalb des Tops bekamen die größte Top-Breite — der Schwanz wurde ein Kasten (Front Δ 135 px)
    const k = kommaDokument();
    const kugel = neuesDokument('kugel');
    const dok = { ...k, profile: { ...k.profile, front: kugel.profile.front, top: kugel.profile.top } };
    const r = pruefen(dok, { stufen: 2 });
    bericht('Komma nur Seite', r);
    const tab = ringTabelle(r.abl);
    // Ringe hinter dem Top-Ende (x > 0,265) sind rund (höchstens halbe Sprosse), nie die Kugelbreite 0,265 (Kasten)
    for (const z of tab) if (z.mitte.x > 0.3) expect(z.breite).toBeLessThan(0.15);
    // Falten: vorher 1087 Kanten > 20° (Grat an der Naht aus der gestreckten Lappen-Vorlage), jetzt bleibt nur der Sprung
    // an der Oberkante der Front (Stützstellen darunter beschnitten, darüber nicht) — ein Widerspruch der Zeichnungen
    expect(r.falte.ueber20).toBeLessThan(300);
  });
  it('Wächter: Kugel, Rex, Tiger (Kasten), Langhals', () => {
    const faelle = [
      ['Kugel', neuesDokument('kugel')],
      ['Rex', vorlageDokument(rexRoh as unknown as Vorlage, 'zu', 'rex')],
      ['Tiger', tigerDokument()],
      ['Langhals', vorlageDokument(langhalsRoh as unknown as Vorlage, 'zu', 'langhals')],
    ] as const;
    for (const [name, dok] of faelle) bericht(`${name} Stufe 2`, pruefen(dok, { stufen: 2 }));
    expect(true).toBe(true);
  });
  it('Lokalität: Kugel-Scheitel und Komma-Spitze 10 px ziehen', () => {
    const d = 10 / 461;
    const kugel = lokalitaet(neuesDokument('kugel'), 'seite', 0, { x: 0, y: d }, { stufen: 2 });
    console.log(`Kugel, Scheitel 10 px hoch: fern ${f1(kugel.fern)} px, gesamt ${f1(kugel.gesamt)} px`);
    const komma = lokalitaet(kommaDokument(), 'seite', 1, { x: 0, y: d }, { stufen: 2 });
    console.log(`Komma, Spitze 10 px hoch: fern ${f1(komma.fern)} px, gesamt ${f1(komma.gesamt)} px`);
    expect(Number.isFinite(komma.fern)).toBe(true);
  });
});

describe('Prüfstand Maul (Block 2): Florians Kugel-Fälle', () => {
  const bericht = (name: string, r: ReturnType<typeof pruefenMaul>) => {
    const l = r.lippen;
    const px = (x: number | null | undefined) => (x === null || x === undefined ? '–' : x.toFixed(1));
    const paare = r.paare.map((p) => `${Math.round(p.oeffnung * 100)}%:${p.paare}${p.paare ? `(${Object.entries(p.nachBereich).sort((a, b) => b[1] - a[1]).slice(0, 2).map(([k, n]) => `${k} ${n}`).join(', ')})` : ''}`).join(' ');
    console.log(`${name}: Δ ${f1(r.delta.seite)} / ${f1(r.delta.front)} / ${f1(r.delta.top)} px · rot ${px(l.oben.seite)}/${px(l.oben.front)} blau ${px(l.unten?.seite)}/${px(l.unten?.front)} px · Falten ${f1(r.falte.max)}° (>20°: ${r.falte.ueber20}) · Paare ${paare} · ${r.zeit.toFixed(0)} ms`);
  };
  for (const art of ['gleich', 'ueberbiss', 'schnabel', 'unterbiss', 'florian'] as const) {
    it(`Kugel ${art}: Maße (frei und mit Lippenknoten in der schwarzen Linie)`, { timeout: 60_000 }, () => {
      const r = pruefenMaul(kugelMaulDokument(art));
      bericht(`Kugel ${art}`, r);
      const m = pruefenMaul(kugelMaulDokument(art, true));
      bericht(`Kugel ${art} (Marken)`, m);
      expect(Number.isFinite(r.delta.seite)).toBe(true);
    });
  }
});
