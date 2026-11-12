// Leiser Ton als zweiter Kanal (SATIN-Studie: Gestalter fanden Klang für Kurvengüte nützlich). Nie der einzige Kanal,
// standardmäßig aus. Alles synthetisch, keine Dateien.

export class Ton {
  constructor() {
    this.ctx = null;
  }
  wecken() {
    if (!this.ctx) {
      const C = window.AudioContext || window.webkitAudioContext;
      if (!C) return;
      this.ctx = new C();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.18;
      this.master.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') this.ctx.resume();
  }
  ton(freq, dauer, art = 'sine', bis = null, laut = 1, start = 0) {
    const c = this.ctx;
    if (!c) return;
    const t = c.currentTime + start;
    const o = c.createOscillator(), g = c.createGain();
    o.type = art;
    o.frequency.setValueAtTime(freq, t);
    if (bis) o.frequency.exponentialRampToValueAtTime(bis, t + dauer);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(laut, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dauer);
    o.connect(g).connect(this.master);
    o.start(t);
    o.stop(t + dauer + 0.02);
  }
  rauschen(dauer, von, bis, laut = 0.5, q = 4) {
    const c = this.ctx;
    if (!c) return;
    const n = Math.floor(c.sampleRate * dauer);
    const b = c.createBuffer(1, n, c.sampleRate);
    const d = b.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
    const s = c.createBufferSource();
    s.buffer = b;
    const f = c.createBiquadFilter();
    f.type = 'bandpass';
    f.Q.value = q;
    const t = c.currentTime;
    f.frequency.setValueAtTime(von, t);
    f.frequency.exponentialRampToValueAtTime(bis, t + dauer);
    const g = c.createGain();
    g.gain.value = laut;
    s.connect(f).connect(g).connect(this.master);
    s.start();
  }
  spielen(art) {
    if (!this.ctx) return;
    switch (art) {
      case 'greifen': return this.ton(1400, 0.03, 'sine', null, 0.4);
      case 'wahl': return this.ton(1100, 0.04, 'sine', null, 0.35);
      case 'punkt': return this.ton(900, 0.09, 'sine', 420, 0.8);
      case 'schnitt': return this.rauschen(0.22, 600, 4200, 0.6, 6);
      case 'form': this.ton(660, 0.18, 'triangle', null, 0.4); return this.ton(990, 0.22, 'triangle', null, 0.3, 0.06);
      case 'kante': return this.ton(220, 0.12, 'sine', 140, 0.9);
      case 'weg': return this.rauschen(0.25, 2500, 300, 0.5, 2);
      case 'nein': this.ton(180, 0.07, 'square', null, 0.25); return this.ton(150, 0.09, 'square', null, 0.25, 0.1);
      case 'rasten': return this.rauschen(0.04, 3000, 2500, 0.7, 10);
      case 'falten': return this.rauschen(0.35, 300, 1800, 0.35, 1.2);
      case 'zurueck': return this.ton(700, 0.06, 'sine', 500, 0.4);
      case 'vor': return this.ton(500, 0.06, 'sine', 700, 0.4);
      case 'tick': return this.ton(1800, 0.015, 'sine', null, 0.3);
      case 'roentgen': return this.ton(300, 0.3, 'sine', 600, 0.25);
      case 'hilfe': return this.ton(520, 0.25, 'triangle', 780, 0.25);
      case 'tusche': return this.ton(260, 0.2, 'sine', 200, 0.3);
      case 'zeit': return this.ton(400, 0.2, 'triangle', 300, 0.25);
      default:
    }
  }
}
