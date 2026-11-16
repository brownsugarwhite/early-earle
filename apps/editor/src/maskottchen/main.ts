// Ozzy läuft: Bühne mit vier Reitern.
//   Spielen      Ozzy im Level steuern (Pfeile/WASD, Umschalt, Leertaste, Tasten für die Späße; Knöpfe auf dem iPhone)
//   Bibliothek   jeden Clip antippen; weich übergeblendet (Dauer, Tempo, Richtung, Federn einstellbar)
//   Filmstreifen Clips aneinanderreihen, Dauer und Übergang je Karte, abspielen, als Video (WebM) und JSON sichern
//   Drehen       Kopf und Körper rundherum, Regler für jeden Wert der Pose
import { Buehne } from './buehne';
import { CLIP, CLIPS, KANTE, KONTEXT_STANDARD } from './clips';
import { BODEN_Y, Figur } from './figur';
import { type Pose, RUHE } from './pose';
import { type Eingabe, LEVEL, Spiel } from './spiel';
import { Spieler } from './spieler';

const buehne = new Buehne(
  document.getElementById('leinwand') as HTMLCanvasElement,
  document.getElementById('figur') as HTMLCanvasElement,
  document.getElementById('oben') as HTMLCanvasElement,
);
const figur = new Figur();
const leiste = document.getElementById('leiste')!;
const hud = document.getElementById('hud')!;

type Reiter = 'spielen' | 'bibliothek' | 'film' | 'drehen';
let reiter: Reiter = (new URLSearchParams(location.search).get('reiter') as Reiter) || 'bibliothek';

// ---- gemeinsame Zeichenhilfen -------------------------------------------------------------------------------------------
const kamera = { x: 800, y: 900 };
function kameraFolgen(x: number, hoehe: number, dt: number, sofort = false): void {
  const m = Math.min(buehne.breite / 4200, (buehne.hoehe - 70) / 2400);
  buehne.kamera.massstab = m;
  const k = sofort ? 1 : 1 - Math.exp(-dt * 2.6);
  kamera.x += (x - kamera.x) * k;
  const zielY = BODEN_Y - hoehe * 0.6 - (buehne.hoehe * 0.8 - buehne.hoehe / 2) / m;
  kamera.y += (zielY - kamera.y) * (sofort ? 1 : 1 - Math.exp(-dt * 2));
  buehne.kamera.x = kamera.x;
  buehne.kamera.y = kamera.y;
}
function bodenLinie(): void {
  const c = buehne.ctx;
  const halb = buehne.breite / buehne.kamera.massstab;
  c.fillStyle = 'rgba(31,26,23,0.16)';
  c.fillRect(buehne.kamera.x - halb, BODEN_Y, halb * 2, 4 / buehne.kamera.massstab);
}
/** Boden mit den Stufen, die Ozzy in Bibliothek und Filmstreifen hoch- und hinuntergestiegen ist */
function gelaendeZeichnen(sp: Spieler): void {
  const c = buehne.ctx;
  const m = buehne.kamera.massstab;
  const halb = buehne.breite / m;
  const x0 = buehne.kamera.x - halb;
  const x1 = buehne.kamera.x + halb;
  const w = [{ x: -Infinity, h: 0 }, ...sp.gelaende];
  for (let i = 0; i < w.length; i++) {
    const a = Math.max(x0, w[i]!.x);
    const b = Math.min(x1, w[i + 1]?.x ?? Infinity);
    if (b <= a) continue;
    const h = w[i]!.h;
    const y = BODEN_Y - h;
    if (h > 0) {
      c.fillStyle = 'rgba(31,26,23,0.07)';
      c.fillRect(a, y, b - a, h);
    }
    c.fillStyle = 'rgba(31,26,23,0.18)';
    c.fillRect(a, y, b - a, 4 / m);
    // Kante sichtbar machen
    if (i > 0 && w[i]!.x > x0 && w[i]!.x < x1) c.fillRect(w[i]!.x - 2 / m, BODEN_Y - Math.max(h, w[i - 1]!.h), 4 / m, Math.abs(h - w[i - 1]!.h));
  }
}
/** Einblendungen am Kopf: „Wuff!“, Zzz, ? */
function einblenden(p: Pose, clip: string, t: number, dy = 0): void {
  const c = buehne.ctx;
  const [kx, ky] = figur.kopfPunkt(p);
  const y = ky + dy;
  c.save();
  c.fillStyle = buehne.farben.schwarz;
  c.textAlign = 'center';
  c.font = `400 ${150}px Lobster, Georgia, serif`;
  const rechts = Math.sin((p.psi * Math.PI) / 180) >= 0 ? 1 : -1;
  if (clip === 'bellen' && t > 0.15 && t < 1.0) {
    c.globalAlpha = Math.min(1, (t - 0.15) * 8) * Math.min(1, (1.0 - t) * 4);
    c.fillText('Wuff!', kx + rechts * (700 + t * 120), y - 250 - t * 60);
  }
  if (clip === 'schlafen') {
    for (let k = 0; k < 3; k++) {
      const u = (t * 0.35 + k / 3) % 1;
      c.globalAlpha = Math.sin(u * Math.PI) * 0.9;
      c.font = `400 ${90 + u * 70}px Lobster, Georgia, serif`;
      c.fillText('z', kx + rechts * (380 + u * 260) + Math.sin(u * 7) * 40, y - 520 - u * 520);
    }
  }
  if (clip === 'kopfSchief' && t > 0.3 && t < 2.0) {
    c.globalAlpha = Math.min(1, (t - 0.3) * 5) * Math.min(1, (2.0 - t) * 4);
    c.fillText('?', kx + rechts * 640, y - 760);
  }
  if ((clip === 'erstarren' && t > 0.1 && t < 0.9) || (clip === 'umschauen' && t > 0.1 && t < 0.6)) {
    c.globalAlpha = 0.9;
    c.fillText('!', kx - rechts * 120, y - 900);
  }
  c.restore();
}
function figurZeichnen(p: Pose, dy = 0): void {
  const c = buehne.ctx;
  c.save();
  c.translate(0, dy);
  buehne.figur(figur.zeichenteile(p));
  c.restore();
}

// ---- Bibliothek -----------------------------------------------------------------------------------------------------------
const bibSpieler = new Spieler(figur);
let bibBlend = 0.35;
function bibliothekAufbauen(): void {
  const karten = CLIPS.filter((c) => !['absprung', 'flug', 'landung'].includes(c.name))
    .map((c) => `<button class="karte" data-clip="${c.name}"><b>${c.titel}</b><small>${c.text}</small></button>`)
    .join('');
  leiste.innerHTML = `<h2>Bibliothek</h2><p>Antippen spielt den Clip; er geht weich aus dem laufenden hervor. Einmal-Clips enden von selbst in Stehen.</p>
  <label class="regler"><span>Übergang</span><input id="b-blend" type="range" min="0.05" max="1.5" step="0.05" value="${bibBlend}"/><span id="b-blend-z"></span></label>
  <label class="regler"><span>Tempo</span><input id="b-tempo" type="range" min="0.2" max="2" step="0.05" value="${bibSpieler.tempo}"/><span id="b-tempo-z"></span></label>
  <div class="reihe" style="margin:8px 0 12px"><button class="knopf" id="b-richtung">Richtung wechseln</button><button class="knopf" id="b-federn">Federn</button><button class="knopf" id="b-mitte">Zur Mitte</button></div>
  <div class="liste">${karten}</div>`;
  const blend = leiste.querySelector<HTMLInputElement>('#b-blend')!;
  const blendZ = leiste.querySelector('#b-blend-z')!;
  const tempo = leiste.querySelector<HTMLInputElement>('#b-tempo')!;
  const tempoZ = leiste.querySelector('#b-tempo-z')!;
  const setze = () => {
    bibBlend = Number(blend.value);
    bibSpieler.tempo = Number(tempo.value);
    blendZ.textContent = `${bibBlend.toFixed(2)} s`;
    tempoZ.textContent = `${bibSpieler.tempo.toFixed(2)}×`;
  };
  blend.addEventListener('input', setze);
  tempo.addEventListener('input', setze);
  setze();
  const federn = leiste.querySelector('#b-federn')!;
  federn.classList.toggle('an', bibSpieler.federnAn);
  federn.addEventListener('click', () => {
    bibSpieler.federnAn = !bibSpieler.federnAn;
    federn.classList.toggle('an', bibSpieler.federnAn);
  });
  leiste.querySelector('#b-richtung')!.addEventListener('click', () => bibSpieler.spiele('umdrehen', bibBlend));
  leiste.querySelector('#b-mitte')!.addEventListener('click', () => bibSpieler.setzen(800, bibSpieler.richtung));
  for (const k of leiste.querySelectorAll<HTMLButtonElement>('.karte'))
    k.addEventListener('click', () => {
      bibSpieler.spiele(k.dataset['clip']!, bibBlend);
      markieren();
    });
  markieren();
}
function markieren(): void {
  for (const k of leiste.querySelectorAll<HTMLButtonElement>('.karte')) k.classList.toggle('an', k.dataset['clip'] === aktiverSpieler().clipName);
}
function aktiverSpieler(): Spieler {
  return reiter === 'film' ? filmSpieler : reiter === 'spielen' ? spiel.spieler : bibSpieler;
}
let letzterClip = '';
function bibliothekBild(dt: number): void {
  const p = bibSpieler.update(dt);
  // weit gelaufen: sanft zurück in die Mitte (Bühne bleibt im Bild)
  if (Math.abs(bibSpieler.x - 800) > 9000) bibSpieler.setzen(800 - Math.sign(bibSpieler.x - 800) * 3000, bibSpieler.richtung);
  kameraFolgen(p.x, bibSpieler.hoehe, dt);
  buehne.anfangen();
  gelaendeZeichnen(bibSpieler);
  figurZeichnen(p, -bibSpieler.hoehe);
  einblenden(p, bibSpieler.clipName, bibSpieler.clipZeit, -bibSpieler.hoehe);
  buehne.abschliessen();
  if (bibSpieler.clipName !== letzterClip) {
    letzterClip = bibSpieler.clipName;
    markieren();
  }
  hud.textContent = `${CLIP[bibSpieler.clipName]?.titel ?? ''}`;
}

// ---- Filmstreifen ---------------------------------------------------------------------------------------------------------
interface Schritt {
  clip: string;
  dauer: number;
  uebergang: number;
}
const FILM_SPEICHER = 'ozzy-filmstreifen';
let film: Schritt[] = (() => {
  try {
    const roh = localStorage.getItem(FILM_SPEICHER);
    if (roh) return JSON.parse(roh) as Schritt[];
  } catch {
    /* leer */
  }
  return [
    { clip: 'stehen', dauer: 1.5, uebergang: 0.3 },
    { clip: 'zielFixieren', dauer: 1.8, uebergang: 0.3 },
    { clip: 'laufen', dauer: 4.5, uebergang: 0.4 },
    { clip: 'stolpern', dauer: 2.8, uebergang: 0.15 },
    { clip: 'schuetteln', dauer: 1.7, uebergang: 0.3 },
    { clip: 'laufen', dauer: 3.4, uebergang: 0.4 },
    { clip: 'anhalten', dauer: 1.7, uebergang: 0.25 },
    { clip: 'kopfSchief', dauer: 2.4, uebergang: 0.3 },
    { clip: 'hinsetzen', dauer: 1.9, uebergang: 0.3 },
    { clip: 'sitzen', dauer: 3, uebergang: 0.3 },
  ];
})();
const filmSpieler = new Spieler(figur);
let filmLaeuft = false;
let filmSchleife = true;
let filmIndex = -1;
let filmSchrittZeit = 0;
let aufnahme: MediaRecorder | null = null;
function filmSichern(): void {
  try {
    localStorage.setItem(FILM_SPEICHER, JSON.stringify(film));
  } catch {
    /* privat */
  }
}
function filmStart(): void {
  filmSpieler.setzen(800, 1);
  filmSpieler.spiele(film[0]?.clip ?? 'stehen', 0.01, 1);
  filmIndex = 0;
  filmSchrittZeit = 0;
  filmLaeuft = true;
  kameraFolgen(800, 0, 0, true);
  filmAufbauen();
}
function filmStop(): void {
  filmLaeuft = false;
  filmIndex = -1;
  if (aufnahme && aufnahme.state !== 'inactive') aufnahme.stop();
  filmAufbauen();
}
function filmAufbauen(): void {
  const palette = CLIPS.map((c) => `<button class="knopf klein" data-neu="${c.name}">${c.titel}</button>`).join('');
  const karten = film
    .map(
      (s, i) => `<div class="schritt${i === filmIndex ? ' an' : ''}" data-i="${i}">
      <b>${i + 1}. ${CLIP[s.clip]?.titel ?? s.clip}</b>
      <label>Dauer <input type="number" step="0.1" min="0.1" value="${s.dauer}" data-feld="dauer"/> s</label>
      <label>Übergang <input type="number" step="0.05" min="0" value="${s.uebergang}" data-feld="uebergang"/> s</label>
      <span class="werkzeuge"><button data-tun="hoch" title="nach oben">↑</button><button data-tun="runter" title="nach unten">↓</button><button data-tun="weg" title="entfernen">✕</button></span>
    </div>`,
    )
    .join('');
  const gesamt = film.reduce((a, s) => a + s.dauer, 0);
  leiste.innerHTML = `<h2>Filmstreifen</h2><p>Clips anfügen, Dauer und Übergang je Karte einstellen, abspielen. Gesamt ${gesamt.toFixed(1)} s.</p>
  <div class="reihe" style="margin-bottom:10px">
    <button class="knopf${filmLaeuft ? ' an' : ''}" id="f-spielen">${filmLaeuft ? 'Stopp' : 'Abspielen'}</button>
    <button class="knopf${filmSchleife ? ' an' : ''}" id="f-schleife">Schleife</button>
    <button class="knopf" id="f-video">${aufnahme && aufnahme.state === 'recording' ? 'Aufnahme läuft …' : 'Als Video'}</button>
    <button class="knopf" id="f-json">JSON sichern</button>
    <label class="knopf" style="cursor:pointer">JSON laden<input id="f-laden" type="file" accept="application/json" hidden/></label>
  </div>
  <div class="streifen">${karten}</div>
  <h3>Anfügen</h3><div class="reihe">${palette}</div>`;
  leiste.querySelector('#f-spielen')!.addEventListener('click', () => (filmLaeuft ? filmStop() : filmStart()));
  leiste.querySelector('#f-schleife')!.addEventListener('click', () => {
    filmSchleife = !filmSchleife;
    filmAufbauen();
  });
  leiste.querySelector('#f-video')!.addEventListener('click', videoAufnehmen);
  leiste.querySelector('#f-json')!.addEventListener('click', () => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([JSON.stringify(film, null, 2)], { type: 'application/json' }));
    a.download = 'ozzy-filmstreifen.json';
    a.click();
  });
  leiste.querySelector<HTMLInputElement>('#f-laden')!.addEventListener('change', async (ev) => {
    const f = (ev.target as HTMLInputElement).files?.[0];
    if (!f) return;
    try {
      const neu = JSON.parse(await f.text()) as Schritt[];
      if (Array.isArray(neu)) {
        film = neu.filter((s) => CLIP[s.clip]);
        filmSichern();
        filmAufbauen();
      }
    } catch {
      /* ungültig */
    }
  });
  for (const b of leiste.querySelectorAll<HTMLButtonElement>('[data-neu]'))
    b.addEventListener('click', () => {
      const c = CLIP[b.dataset['neu']!]!;
      film.push({ clip: c.name, dauer: c.schleife ? Math.max(2, c.dauer) : c.dauer, uebergang: 0.3 });
      filmSichern();
      filmAufbauen();
    });
  for (const k of leiste.querySelectorAll<HTMLDivElement>('.schritt')) {
    const i = Number(k.dataset['i']);
    for (const ein of k.querySelectorAll<HTMLInputElement>('input'))
      ein.addEventListener('change', () => {
        const feld = ein.dataset['feld'] as 'dauer' | 'uebergang';
        film[i]![feld] = Math.max(feld === 'dauer' ? 0.1 : 0, Number(ein.value) || 0);
        filmSichern();
      });
    for (const b of k.querySelectorAll<HTMLButtonElement>('[data-tun]'))
      b.addEventListener('click', () => {
        const tun = b.dataset['tun'];
        if (tun === 'weg') film.splice(i, 1);
        if (tun === 'hoch' && i > 0) [film[i - 1], film[i]] = [film[i]!, film[i - 1]!];
        if (tun === 'runter' && i < film.length - 1) [film[i + 1], film[i]] = [film[i]!, film[i + 1]!];
        filmSichern();
        filmAufbauen();
      });
  }
}
function videoAufnehmen(): void {
  if (aufnahme && aufnahme.state === 'recording') return;
  const strom = buehne.grund.captureStream(30);
  const art = ['video/webm;codecs=vp9', 'video/webm', 'video/mp4'].find((t) => MediaRecorder.isTypeSupported(t)) ?? '';
  const teile: Blob[] = [];
  aufnahme = new MediaRecorder(strom, art ? { mimeType: art, videoBitsPerSecond: 6_000_000 } : undefined);
  aufnahme.ondataavailable = (e) => e.data.size && teile.push(e.data);
  aufnahme.onstop = () => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob(teile, { type: aufnahme?.mimeType || 'video/webm' }));
    a.download = `ozzy-filmstreifen.${(aufnahme?.mimeType ?? '').includes('mp4') ? 'mp4' : 'webm'}`;
    a.click();
    aufnahme = null;
    if (reiter === 'film') filmAufbauen();
  };
  filmSchleife = false;
  filmStart();
  aufnahme.start();
  filmAufbauen();
}
function filmBild(dt: number): void {
  if (filmLaeuft && film.length) {
    filmSchrittZeit += dt;
    const s = film[filmIndex]!;
    if (filmSchrittZeit >= s.dauer) {
      filmIndex++;
      filmSchrittZeit = 0;
      if (filmIndex >= film.length) {
        if (filmSchleife) {
          filmIndex = 0;
          filmSpieler.setzen(800, 1);
          filmSpieler.spiele(film[0]!.clip, film[0]!.uebergang, 1);
        } else {
          filmStop();
        }
      } else filmSpieler.spiele(film[filmIndex]!.clip, film[filmIndex]!.uebergang);
      if (reiter === 'film') filmAufbauen();
    }
  }
  const p = filmSpieler.update(dt);
  kameraFolgen(p.x, filmSpieler.hoehe, dt);
  buehne.anfangen();
  gelaendeZeichnen(filmSpieler);
  figurZeichnen(p, -filmSpieler.hoehe);
  einblenden(p, filmSpieler.clipName, filmSpieler.clipZeit, -filmSpieler.hoehe);
  buehne.abschliessen();
  hud.textContent = filmLaeuft ? `${filmIndex + 1}/${film.length}: ${CLIP[filmSpieler.clipName]?.titel ?? ''}` : 'Abspielen drücken';
}

// ---- Spielen ----------------------------------------------------------------------------------------------------------------
const spiel = new Spiel(new Spieler(figur));
spiel.neustart();
const tasten = new Set<string>();
let aktion: string | null = null;
const AKTIONEN: Record<string, string> = { e: 'schnueffeln', q: 'umschauen', b: 'bellen', f: 'schuetteln', t: 'kopfSchief', z: 'ziel', k: 'kratzen', x: 'erstarren', r: 'wedeln', v: 'zuwenden', h: 'abwenden' };
window.addEventListener('keydown', (e) => {
  if ((e.target as HTMLElement)?.tagName === 'INPUT') return;
  if (reiter === 'spielen' && [' ', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) e.preventDefault();
  tasten.add(e.key.toLowerCase());
  if (!e.repeat && AKTIONEN[e.key.toLowerCase()]) aktion = AKTIONEN[e.key.toLowerCase()]!;
});
window.addEventListener('keyup', (e) => tasten.delete(e.key.toLowerCase()));
window.addEventListener('blur', () => tasten.clear());
const knoepfe = new Set<string>();
function spielenAufbauen(): void {
  leiste.innerHTML = `<h2>Spielen</h2><p>Ozzy will zum Knochen. Er ist langsam, aber nicht aufzuhalten.</p>
  <h3>Tasten</h3>
  <p><b>← →</b> oder <b>A D</b> laufen · <b>Umschalt</b> eilen · <b>Leertaste</b>, <b>↑</b> oder <b>W</b> springen (kurz = klein) · <b>↓</b> oder <b>S</b> setzen/aufstehen</p>
  <p><b>E</b> schnüffeln · <b>Q</b> umschauen · <b>B</b> bellen · <b>F</b> schütteln · <b>T</b> Kopf schief · <b>Z</b> Ziel fixieren · <b>K</b> kratzen · <b>X</b> erschrecken · <b>R</b> wedeln · <b>V</b> zu uns drehen · <b>H</b> Rücken zudrehen</p>
  <p>Niedrige Stufen klettert er angestrengt hinauf und steigt sie vorsichtig hinunter; hohe muss er springen. Steht er lange, dreht er sich zu uns, setzt sich, später legt er sich schlafen.</p>
  <div class="reihe"><button class="knopf" id="s-neu">Von vorn</button></div>`;
  leiste.querySelector('#s-neu')!.addEventListener('click', () => spiel.neustart());
  steuerungZeigen(true);
}
function steuerungZeigen(an: boolean): void {
  let feld = document.getElementById('steuerung');
  if (!an) {
    feld?.remove();
    return;
  }
  if (feld) return;
  feld = document.createElement('div');
  feld.id = 'steuerung';
  feld.innerHTML = `<div class="links"><button data-k="links">◀</button><button data-k="rechts">▶</button></div>
  <div class="rechts"><button data-k="eilen">eilen</button><button data-k="runter">⌄</button><button data-k="springen">⤒</button>
  <button data-a="bellen">wuff</button><button data-a="schnueffeln">schnüffeln</button><button data-a="umschauen">umschauen</button></div>`;
  document.getElementById('buehne')!.appendChild(feld);
  for (const b of feld.querySelectorAll<HTMLButtonElement>('button')) {
    const k = b.dataset['k'];
    const a = b.dataset['a'];
    b.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      if (k) knoepfe.add(k);
      if (a) aktion = a;
      b.classList.add('an');
    });
    const los = () => {
      if (k) knoepfe.delete(k);
      b.classList.remove('an');
    };
    b.addEventListener('pointerup', los);
    b.addEventListener('pointercancel', los);
    b.addEventListener('pointerleave', los);
  }
}
function spielenBild(dt: number): void {
  const t = (k: string) => tasten.has(k);
  const eingabe: Eingabe = {
    links: t('arrowleft') || t('a') || knoepfe.has('links'),
    rechts: t('arrowright') || t('d') || knoepfe.has('rechts'),
    eilen: t('shift') || knoepfe.has('eilen'),
    springen: t(' ') || t('arrowup') || t('w') || knoepfe.has('springen'),
    runter: t('arrowdown') || t('s') || knoepfe.has('runter'),
    aktion,
  };
  aktion = null;
  spiel.update(dt, eingabe);
  const p = spiel.spieler.update(dt);
  if (!spiel.amBoden) p.boden = 0;
  kameraFolgen(p.x + spiel.spieler.richtung * 500, spiel.hoehe, dt);
  buehne.anfangen();
  const halb = buehne.breite / buehne.kamera.massstab;
  spiel.zeichnen(buehne.ctx, buehne.farben.schwarz, buehne.kamera.x - halb, buehne.kamera.x + halb);
  figurZeichnen(p, -spiel.hoehe);
  einblenden(p, spiel.spieler.clipName, spiel.spieler.clipZeit, -spiel.hoehe);
  if (spiel.meldung) {
    const c = buehne.ctx;
    buehne.bildschirm(c);
    c.fillStyle = buehne.farben.schwarz;
    c.font = '400 34px Lobster, Georgia, serif';
    c.textAlign = 'center';
    c.fillText(spiel.meldung, buehne.breite / 2, 110);
  }
  buehne.abschliessen();
  const weg = Math.max(0, Math.round((LEVEL.ziel - spiel.spieler.x) / 100));
  hud.textContent = spiel.geschafft ? 'Geschafft! (Von vorn: Knopf rechts)' : `${CLIP[spiel.spieler.clipName]?.titel ?? ''} · noch ${weg} Schritte bis zum Knochen`;
}

// ---- Drehen -----------------------------------------------------------------------------------------------------------------
const drehPose: Pose = { ...RUHE };
const REGLER: [keyof Pose, string, number, number, number][] = [
  ['theta', 'Kopf θ', -180, 180, 1],
  ['psi', 'Körper ψ', -180, 180, 1],
  ['kopfNicken', 'Nicken', -40, 40, 1],
  ['kopfNeigen', 'Neigen', -40, 40, 1],
  ['ohrH', 'Ohr hinten', -40, 40, 1],
  ['ohrV', 'Ohr vorn', -40, 40, 1],
  ['schopf', 'Schopf', -40, 40, 1],
  ['brauen', 'Brauen', -20, 20, 1],
  ['brauenKipp', 'Brauen kipp', -20, 20, 1],
  ['nase', 'Nase', -1, 1, 0.05],
  ['bart', 'Bart', -20, 20, 1],
  ['schwanz', 'Schwanz', -60, 60, 1],
  ['nicken', 'Körper nicken', -30, 30, 1],
  ['rollen', 'Wiegen', -20, 20, 1],
  ['beinVN', 'Bein vorn nah', -45, 45, 1],
  ['beinVF', 'Bein vorn fern', -45, 45, 1],
  ['beinHN', 'Bein hinten nah', -45, 45, 1],
  ['beinHF', 'Bein hinten fern', -45, 45, 1],
];
function drehenAufbauen(): void {
  leiste.innerHTML = `<h2>Drehen</h2><p>Kopf und Körper rundherum. Schlüssel sind Florians Ansichten: Front 0°, Logo 15°, Seite 90°; negativ gespiegelt. Hinten (über 90°) ist ein Entwurf ohne Vorlage.</p><div id="regler"></div>
  <h3>Anzeige</h3>
  <label class="regler"><span>Flüssig</span><input id="glaette" type="range" min="0" max="50" step="1" value="${buehne.glaette}"/><span id="glaette-zahl"></span></label>
  <div class="reihe"><button class="knopf" id="ruhe">Logo-Pose</button></div>`;
  const gl = leiste.querySelector<HTMLInputElement>('#glaette')!;
  const glz = leiste.querySelector('#glaette-zahl')!;
  const glSetzen = () => {
    buehne.glaette = Number(gl.value);
    glz.textContent = buehne.glaette ? String(buehne.glaette) : 'aus';
  };
  gl.addEventListener('input', glSetzen);
  glSetzen();
  const box = leiste.querySelector('#regler')!;
  for (const [k, name, min, max, schritt] of REGLER) {
    const z = document.createElement('label');
    z.className = 'regler';
    z.innerHTML = `<span>${name}</span><input type="range" min="${min}" max="${max}" step="${schritt}" value="${drehPose[k]}"/><span></span>`;
    const ein = z.querySelector('input')!;
    const zahl = z.querySelectorAll('span')[1]!;
    const setze = () => {
      drehPose[k] = Number(ein.value);
      zahl.textContent = String(Math.round(drehPose[k] * 100) / 100);
    };
    ein.addEventListener('input', setze);
    setze();
    box.appendChild(z);
  }
  leiste.querySelector('#ruhe')!.addEventListener('click', () => {
    Object.assign(drehPose, RUHE);
    drehenAufbauen();
  });
}
function drehenBild(): void {
  buehne.einpassen(100, 0, 1830, BODEN_Y + 40, 0.06, 60);
  buehne.anfangen();
  bodenLinie();
  const p = { ...drehPose };
  figur.boden(p, 0);
  buehne.figur(figur.zeichenteile(p));
  buehne.abschliessen();
  hud.textContent = '';
}

// ---- Reiter und Takt --------------------------------------------------------------------------------------------------------
function reiterSetzen(r: Reiter): void {
  reiter = r;
  for (const b of document.querySelectorAll<HTMLButtonElement>('#reiter button')) b.setAttribute('aria-selected', String(b.dataset['reiter'] === r));
  steuerungZeigen(false);
  if (r === 'drehen') drehenAufbauen();
  else if (r === 'bibliothek') bibliothekAufbauen();
  else if (r === 'film') filmAufbauen();
  else spielenAufbauen();
  const u = new URL(location.href);
  u.searchParams.set('reiter', r);
  history.replaceState(null, '', u);
  kameraFolgen(aktiverSpieler().x, 0, 0, true);
}
for (const b of document.querySelectorAll<HTMLButtonElement>('#reiter button')) b.addEventListener('click', () => reiterSetzen(b.dataset['reiter'] as Reiter));
reiterSetzen(reiter);

// ---- Prüfblätter (für Proben: flüssig gezeichnet wie auf der Bühne) -------------------------------------------------------
let angehalten = false;
/** Raster aus Posen zeichnen: je Feld ein Weltausschnitt [x0, y0, x1, y1] */
function blattZeichnen(posen: Pose[], texte: string[], spalten: number, rahmen: [number, number, number, number], ueber: number[][][] = []): void {
  angehalten = true;
  const zeilen = Math.ceil(posen.length / spalten);
  const fw = buehne.breite / spalten;
  const fh = buehne.hoehe / zeilen;
  const [x0, y0, x1, y1] = rahmen;
  const m = Math.min(fw / (x1 - x0), (fh - 18) / (y1 - y0));
  buehne.anfangen();
  posen.forEach((p, i) => {
    const sx = (i % spalten) * fw;
    const sy = Math.floor(i / spalten) * fh;
    buehne.kamera.massstab = m;
    buehne.kamera.x = x0 + (buehne.breite / 2 - sx) / m;
    buehne.kamera.y = y0 + (buehne.hoehe / 2 - sy) / m;
    const c = buehne.ctx;
    // jedes Feld für sich (nichts ragt ins Nachbarfeld)
    c.save();
    buehne.bildschirm(c);
    c.beginPath();
    c.rect(sx, sy, fw, fh);
    c.clip();
    buehne.welt();
    c.fillStyle = 'rgba(31,26,23,0.12)';
    c.fillRect(x0, BODEN_Y, x1 - x0, 3 / m);
    // Stufe (Treppen-Clips): Lage relativ zur Wurzel des Felds, Höhe; die Figur steht auf ihrem Grund
    const st = (p as Pose & { _stufe?: { x: number; h: number; grund: number } })._stufe;
    if (st) {
      c.fillStyle = 'rgba(31,26,23,0.14)';
      if (st.h > 0) c.fillRect(st.x, BODEN_Y - st.h, x1 - st.x, st.h);
      else c.fillRect(x0, BODEN_Y, st.x - x0, -st.h);
    }
    c.save();
    c.translate(0, st ? -st.grund : 0);
    buehne.figur(figur.zeichenteile(p));
    // Vorlage darüber (Prüfen gegen Florians Zeichnung): rote Linien in Weltkoordinaten
    if (ueber.length) {
      c.strokeStyle = 'rgba(220,30,30,0.85)';
      c.lineWidth = 1.5 / m;
      for (const linie of ueber) {
        c.beginPath();
        linie.forEach(([x, y], j) => (j ? c.lineTo(x!, y!) : c.moveTo(x!, y!)));
        c.stroke();
      }
    }
    c.restore();
    c.restore();
    buehne.bildschirm(c);
    c.fillStyle = '#1f1a17';
    c.font = '12px system-ui';
    c.textAlign = 'left';
    c.fillText(texte[i] ?? '', sx + 6, sy + fh - 6);
    c.strokeStyle = 'rgba(31,26,23,0.08)';
    c.strokeRect(sx, sy, fw, fh);
  });
}
function clipPosen(name: string, bilder: number, abstand: number, von = 'stehen', mitlaufen = true): Pose[] {
  const sp = new Spieler(figur, von);
  sp.update(0.016);
  const start = sp.x;
  sp.spiele(name, 0.01);
  const treppe = CLIP[name]?.treppe;
  const out: Pose[] = [];
  let t = 0;
  for (let i = 0; i < bilder; i++) {
    while (t < i * abstand - 1e-9) {
      sp.update(1 / 120);
      t += 1 / 120;
    }
    const p: Pose & { _stufe?: { x: number; h: number; grund: number } } = { ...sp.update(0.0001) };
    const verschieben = mitlaufen ? sp.x - 800 : start - 800;
    p.x -= verschieben;
    // Stufe fürs Blatt: Kante relativ zum gezeichneten Ozzy; der Grund unter ihm steigt am Ende des Clips um die Stufe
    if (treppe) p._stufe = { x: start + KANTE - verschieben, h: treppe * KONTEXT_STANDARD.stufe, grund: sp.hoehe };
    out.push(p);
  }
  return out;
}

let letzte = performance.now();
function bild(jetzt: number): void {
  const dt = Math.min(0.05, Math.max(0, (jetzt - letzte) / 1000));
  letzte = jetzt;
  if (angehalten) {
    requestAnimationFrame(bild);
    return;
  }
  if (reiter === 'drehen') drehenBild();
  else if (reiter === 'bibliothek') bibliothekBild(dt);
  else if (reiter === 'film') filmBild(dt);
  else spielenBild(dt);
  requestAnimationFrame(bild);
}
requestAnimationFrame(bild);

// Test-Haken
(window as unknown as { __ozzy: unknown }).__ozzy = {
  figur,
  drehPose,
  buehne,
  bibSpieler,
  filmSpieler,
  spiel,
  RUHE,
  blattZeichnen,
  clipPosen,
  weiter: () => {
    angehalten = false;
  },
};
