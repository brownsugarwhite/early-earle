// Ozzy-Figur: Prüfhaken für die Proben der Etappen A und B (window.__ozzyFigur), aufgerufen von
// apps/editor/scripts/ozzy-figur/proben.mjs. Jede Messung zeichnet selbst und liest das Bild sofort (preserveDrawingBuffer).
import { abflachen, type Form, kasten, type Punkt } from './form';
import { type Ansicht, type Diagnose, EXAKT, type FigurRenderer, FLUESSIG, type Fluessig, type Szene } from './renderer';
import type { Regeln } from './szenen';
import { type AnsichtName, type FigurDaten, teilVon } from './vorlagen/import';

type SzenenName = AnsichtName | 'kopf' | 'koerper';
export interface PruefKontext {
  daten: FigurDaten;
  renderer: FigurRenderer;
  svgTexte: Record<string, string>;
  szeneBauen: (name: SzenenName, t: number, fl: Fluessig, regeln?: Regeln) => Szene;
  vorlageFuer: (name: SzenenName, t: number) => Form[] | null;
  einpassen: (name: SzenenName, w: number, h: number, oben: number, rand: number) => Ansicht;
  ansichtsDateien: Record<string, string>;
}

export function pruefhakenAnlegen(k: PruefKontext): void {
  const r = k.renderer;
  const gl = r.gl;
  /** RGBA von oben nach unten */
  const lesen = (): { px: Uint8Array; w: number; h: number } => {
    const w = r.breite;
    const h = r.hoehe;
    const roh = new Uint8Array(w * h * 4);
    gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, roh);
    const px = new Uint8Array(w * h * 4);
    for (let y = 0; y < h; y++) px.set(roh.subarray((h - 1 - y) * w * 4, (h - y) * w * 4), y * w * 4);
    return { px, w, h };
  };
  const zeigen = (name: SzenenName, t: number, fluessig: boolean, diagnose: Diagnose, w: number, h: number): Ansicht => {
    r.groesse(w, h);
    const a = k.einpassen(name, w, h, 0, Math.round(w * 0.03));
    r.zeichne(k.szeneBauen(name, t, fluessig ? FLUESSIG : EXAKT), a, diagnose);
    return a;
  };
  const svgBild = async (text: string, a: Ansicht, w: number, h: number): Promise<Uint8ClampedArray> => {
    const ohneMeta = text.replace(/<\?xml[^>]*>/, '').replace(/<metadata>[\s\S]*?<\/metadata>/, '');
    const svg = ohneMeta.replace(/viewBox="[^"]+"/, `viewBox="${a.x0} ${a.y0} ${w / a.massstab} ${h / a.massstab}" width="${w}" height="${h}" preserveAspectRatio="none"`);
    const bild = new Image();
    await new Promise<void>((ok, fehler) => {
      bild.onload = () => ok();
      bild.onerror = () => fehler(new Error('SVG lädt nicht'));
      bild.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
    });
    const cv = document.createElement('canvas');
    cv.width = w;
    cv.height = h;
    const c = cv.getContext('2d')!;
    c.fillStyle = '#fff';
    c.fillRect(0, 0, w, h);
    c.drawImage(bild, 0, 0, w, h);
    return c.getImageData(0, 0, w, h).data;
  };
  const alsPng = (daten: Uint8ClampedArray | Uint8Array, w: number, h: number): string => {
    const cv = document.createElement('canvas');
    cv.width = w;
    cv.height = h;
    const c = cv.getContext('2d')!;
    const img = c.createImageData(w, h);
    img.data.set(daten);
    c.putImageData(img, 0, 0);
    return cv.toDataURL('image/png');
  };

  const haken = {
    daten: k.daten,
    zeigen,
    bild: (): string => r.canvas.toDataURL('image/png'),
    /** Ausschnitt des letzten Bilds in Figur-Einheiten, vergrößert */
    ausschnitt(a: Ansicht, x0: number, y0: number, x1: number, y1: number, faktor = 4): string {
      const sx = (x0 - a.x0) * a.massstab, sy = (y0 - a.y0) * a.massstab, sw = (x1 - x0) * a.massstab, sh = (y1 - y0) * a.massstab;
      const cv = document.createElement('canvas');
      cv.width = Math.round(sw * faktor);
      cv.height = Math.round(sh * faktor);
      const c = cv.getContext('2d')!;
      c.imageSmoothingEnabled = false;
      c.drawImage(r.canvas, sx, sy, sw, sh, 0, 0, cv.width, cv.height);
      return cv.toDataURL('image/png');
    },

    /** A: exakter Modus gegen Florians SVG (gleicher Rahmen, gleiche Größe) */
    async vergleichVorlage(ansicht: AnsichtName, w = 1000, h = 1000) {
      const a = zeigen(ansicht, 0, false, 0, w, h);
      const { px } = lesen();
      const ref = await svgBild(k.svgTexte[k.ansichtsDateien[ansicht]!]!, a, w, h);
      const diff = new Uint8ClampedArray(w * h * 4);
      let nurNeu = 0;
      let nurVorlage = 0;
      let schwarz = 0;
      let summe = 0;
      let deutlich = 0;
      for (let i = 0; i < px.length; i += 4) {
        const la = px[i]! / 255;
        const lb = ref[i]! / 255;
        summe += Math.abs(la - lb);
        if (Math.abs(la - lb) > 0.5) deutlich++;
        if (lb < 0.5) schwarz++;
        const g = Math.round(235 - (1 - Math.min(la, lb)) * 60);
        diff[i] = g;
        diff[i + 1] = g;
        diff[i + 2] = g;
        diff[i + 3] = 255;
        if (la < 0.5 && lb >= 0.5) {
          nurNeu++;
          diff.set([220, 30, 30], i);
        } else if (lb < 0.5 && la >= 0.5) {
          nurVorlage++;
          diff.set([30, 90, 230], i);
        }
      }
      return { ansicht, nurNeu, nurVorlage, schwarz, anteil: (nurNeu + nurVorlage) / schwarz, deutlich, deutlichAnteil: deutlich / schwarz, mittel: summe / (w * h), diff: alsPng(diff, w, h) };
    },

    /** B: Spitzen schwarzer Teile, die weit weg von anderen Gruppen liegen: Umriss exakt gegen flüssig längs der Spitzenrichtung */
    spitzen(ansicht: AnsichtName, w = 1000, h = 1000) {
      const a = zeigen(ansicht, 0, false, 0, w, h);
      const exakt = lesen();
      zeigen(ansicht, 0, true, 0, w, h);
      const fl = lesen();
      const sz = k.szeneBauen(ansicht, 0, FLUESSIG);
      const kMax = Math.max(...Object.values(FLUESSIG));
      const umrisse = sz.teile.map((t) => abflachen(t.form, (q) => q, 3));
      const innen = (v: number[], x: number, y: number): boolean => {
        let wz = 0;
        const n = v.length / 2;
        for (let i = 0, j = n - 1; i < n; j = i++) {
          const ax = v[2 * j]!, ay = v[2 * j + 1]!, bx = v[2 * i]!, by = v[2 * i + 1]!;
          if (ay <= y) {
            if (by > y && (bx - ax) * (y - ay) - (x - ax) * (by - ay) > 0) wz++;
          } else if (by <= y && (bx - ax) * (y - ay) - (x - ax) * (by - ay) < 0) wz--;
        }
        return wz !== 0;
      };
      const abstand = (v: number[], x: number, y: number): number => {
        let m = Infinity;
        const n = v.length / 2;
        for (let i = 0; i < n; i++) {
          const j = (i + 1) % n;
          const ax = v[2 * i]!, ay = v[2 * i + 1]!, dx = v[2 * j]! - ax, dy = v[2 * j + 1]! - ay;
          const hh = Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / (dx * dx + dy * dy || 1)));
          m = Math.min(m, Math.hypot(x - ax - dx * hh, y - ay - dy * hh));
        }
        return m;
      };
      // Rand längs einer Richtung finden (Deckung 0,5, zwischen Bildpunkten interpoliert)
      const deckung = (bild: { px: Uint8Array; w: number }, x: number, y: number): number => {
        const x0 = Math.floor(x - 0.5), y0 = Math.floor(y - 0.5), fx = x - 0.5 - x0, fy = y - 0.5 - y0;
        const g = (xx: number, yy: number): number => 1 - bild.px[(yy * bild.w + xx) * 4]! / 255;
        return (g(x0, y0) * (1 - fx) + g(x0 + 1, y0) * fx) * (1 - fy) + (g(x0, y0 + 1) * (1 - fx) + g(x0 + 1, y0 + 1) * fx) * fy;
      };
      const rand = (bild: { px: Uint8Array; w: number }, p: Punkt, d: Punkt): number | null => {
        let vorher = deckung(bild, p[0] - d[0] * 8, p[1] - d[1] * 8);
        for (let s = -8 + 0.25; s <= 8; s += 0.25) {
          const c = deckung(bild, p[0] + d[0] * s, p[1] + d[1] * s);
          if (vorher >= 0.5 && c < 0.5) return s - 0.25 + (0.25 * (vorher - 0.5)) / (vorher - c);
          vorher = c;
        }
        return null;
      };
      const aus: { teil: string; anker: number; versatz: number }[] = [];
      let ausgelassen = 0;
      sz.teile.forEach((t, ti) => {
        if (t.weiss) return;
        const f = t.form;
        f.forEach((an, j) => {
          const vor = f[(j - 1 + f.length) % f.length]!;
          const nach = f[(j + 1) % f.length]!;
          const ein: Punkt = Math.hypot(an.p[0] - an.i[0], an.p[1] - an.i[1]) > 1e-3 ? [an.p[0] - an.i[0], an.p[1] - an.i[1]] : [an.p[0] - vor.o[0], an.p[1] - vor.o[1]];
          const raus: Punkt = Math.hypot(an.o[0] - an.p[0], an.o[1] - an.p[1]) > 1e-3 ? [an.o[0] - an.p[0], an.o[1] - an.p[1]] : [nach.i[0] - an.p[0], nach.i[1] - an.p[1]];
          const le = Math.hypot(...ein) || 1, lr = Math.hypot(...raus) || 1;
          const cosw = (ein[0] * raus[0] + ein[1] * raus[1]) / (le * lr);
          if (cosw > Math.cos((60 * Math.PI) / 180)) return; // keine Spitze
          let d: Punkt = [ein[0] / le - raus[0] / lr, ein[1] / le - raus[1] / lr];
          const ld = Math.hypot(...d) || 1;
          d = [d[0] / ld, d[1] / ld];
          const v = umrisse[ti]!;
          if (innen(v, an.p[0] + d[0] * 1.5, an.p[1] + d[1] * 1.5)) return; // nach innen gerichtet
          // frei: kein anderes schwarzes Teil (anderer Gruppe) näher als 2,5 × größte Stärke, und nicht von Schwarz verdeckt
          const frei = sz.teile.every((u, ui) => ui === ti || u.weiss || u.gruppe === t.gruppe || (abstand(umrisse[ui]!, an.p[0], an.p[1]) > 2.5 * kMax && !innen(umrisse[ui]!, an.p[0] + d[0] * 2, an.p[1] + d[1] * 2)));
          if (!frei) {
            ausgelassen++;
            return;
          }
          const p: Punkt = [(an.p[0] - a.x0) * a.massstab, (an.p[1] - a.y0) * a.massstab];
          const re = rand(exakt, p, d);
          const rf = rand(fl, p, d);
          if (re === null || rf === null) return;
          aus.push({ teil: t.name, anker: j, versatz: Math.round((rf - re) * 1000) / 1000 });
        });
      });
      return { ansicht, spitzen: aus, ausgelassen, groesster: Math.max(0, ...aus.map((x) => Math.abs(x.versatz))) };
    },

    /** B: markierte Bildpunkte zählen (1 = Weiß ohne Schwarz darunter, 2 = Ohrspalt) */
    zaehlen(name: SzenenName, t: number, fluessig: boolean, diagnose: Diagnose, w = 800, h = 800): number {
      zeigen(name, t, fluessig, diagnose, w, h);
      const { px } = lesen();
      let n = 0;
      for (let i = 0; i < px.length; i += 4) {
        if (diagnose === 1 && px[i]! > 200 && px[i + 1]! < 80 && px[i + 2]! < 80) n++;
        if (diagnose === 2 && px[i + 2]! > 200 && px[i]! < 60) n++;
      }
      return n;
    },

    /** B: Ohrspalt im Profil: Breite längs seiner Achse (12 Abschnitte) und Deckung mit Florians Keil */
    spalt(w = 1000, h = 1000, regeln?: Regeln) {
      r.groesse(w, h);
      const a = k.einpassen('kopf', w, h, 0, Math.round(w * 0.03));
      r.zeichne(k.szeneBauen('kopf', 1, FLUESSIG, regeln), a, 2);
      const { px } = lesen();
      const pts: Punkt[] = [];
      const maske = new Uint8Array(w * h);
      for (let y = 0; y < h; y++)
        for (let x = 0; x < w; x++) {
          const i = (y * w + x) * 4;
          if (px[i + 2]! > 200 && px[i]! < 60) {
            pts.push([x, y]);
            maske[y * w + x] = 1;
          }
        }
      // sichtbarer Teil von Florians Keil: im Keil und im fernen Ohr, und in seiner exakten Vorlage weiß (das nahe Ohr deckt den Rest)
      const kl = kasten(teilVon(k.daten.ansichten.logo, 'bohne')!.form);
      const kp = kasten(teilVon(k.daten.ansichten.profil, 'bohne')!.form);
      const cv = document.createElement('canvas');
      cv.width = w;
      cv.height = h;
      const c = cv.getContext('2d')!;
      const flaeche = (f: Form): void => {
        const v = abflachen(f, (q) => [(q[0] + kl[0] - kp[0] - a.x0) * a.massstab, (q[1] + kl[1] - kp[1] - a.y0) * a.massstab], 3);
        c.beginPath();
        for (let i = 0; i < v.length; i += 2) (i ? c.lineTo : c.moveTo).call(c, v[i]!, v[i + 1]!);
        c.closePath();
        c.fill();
      };
      flaeche(teilVon(k.daten.ansichten.profil, 'ohrSpalt')!.form);
      c.globalCompositeOperation = 'destination-in';
      flaeche(teilVon(k.daten.ansichten.profil, 'ohrB')!.form);
      const keilMaske = c.getImageData(0, 0, w, h).data;
      r.zeichne(k.szeneBauen('profil', 0, EXAKT), a, 0);
      const vorlage = lesen().px;
      const ref = new Uint8Array(w * h * 4);
      for (let i = 0; i < w * h; i++) ref[i * 4 + 3] = keilMaske[i * 4 + 3]! > 127 && vorlage[i * 4]! > 127 ? 255 : 0;
      let schnitt = 0;
      let vereint = 0;
      let refZahl = 0;
      for (let i = 0; i < w * h; i++) {
        const b = ref[i * 4 + 3]! > 127 ? 1 : 0;
        refZahl += b;
        if (b && maske[i]) schnitt++;
        if (b || maske[i]) vereint++;
      }
      // Hauptachse
      let mx = 0, my = 0;
      for (const p of pts) {
        mx += p[0];
        my += p[1];
      }
      mx /= pts.length || 1;
      my /= pts.length || 1;
      let sxx = 0, sxy = 0, syy = 0;
      for (const p of pts) {
        sxx += (p[0] - mx) ** 2;
        sxy += (p[0] - mx) * (p[1] - my);
        syy += (p[1] - my) ** 2;
      }
      const th = 0.5 * Math.atan2(2 * sxy, sxx - syy);
      const ax: Punkt = [Math.cos(th), Math.sin(th)];
      const proj = pts.map((p) => (p[0] - mx) * ax[0] + (p[1] - my) * ax[1]);
      const lo = Math.min(...proj), hi = Math.max(...proj);
      const n = 12;
      const breiten = new Array<number>(n).fill(0);
      for (const s of proj) breiten[Math.min(n - 1, Math.floor(((s - lo) / (hi - lo || 1)) * n))]! += 1;
      const abschnitt = (hi - lo) / n || 1;
      return {
        bildpunkte: pts.length,
        laenge: (hi - lo) / a.massstab,
        breiten: breiten.map((b) => Math.round((b / abschnitt / a.massstab) * 10) / 10),
        deckung: vereint ? schnitt / vereint : 0,
        keilBildpunkte: refZahl,
      };
    },

    /** B: Tempo je Bild (Szene bauen, zeichnen, auf die Grafikkarte warten) */
    tempo(name: SzenenName, t: number, fluessig: boolean, n = 120, w = 1000, h = 1000) {
      r.groesse(w, h);
      const a = k.einpassen(name, w, h, 0, 30);
      const z: number[] = [];
      const gpu: number[] = [];
      for (let i = 0; i < n; i++) {
        const t0 = performance.now();
        r.zeichne(k.szeneBauen(name, (t + i * 0.003) % 1, fluessig ? FLUESSIG : EXAKT), a, 0);
        r.warten();
        z.push(performance.now() - t0);
        if (Number.isFinite(r.letzte.gpuMs)) gpu.push(r.letzte.gpuMs);
      }
      const sortiert = (x: number[]): number[] => [...x].sort((u, v) => u - v);
      const zs = sortiert(z);
      const gs = sortiert(gpu);
      return {
        median: zs[Math.floor(n / 2)]!,
        p95: zs[Math.floor(n * 0.95)]!,
        gpuMedian: gs.length ? gs[Math.floor(gs.length / 2)]! : null,
        strecken: r.letzte.strecken,
        R: r.letzte.R,
        renderer: String(gl.getParameter(gl.RENDERER)),
      };
    },
  };
  (window as unknown as { __ozzyFigur: typeof haken }).__ozzyFigur = haken;
}
