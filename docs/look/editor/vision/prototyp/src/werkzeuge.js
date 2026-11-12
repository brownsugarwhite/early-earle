// Ergänzende Handlungen: Zirkel, Wenden, Blick direkt, Löschen und Kante über Tasten (zweiter Weg auf dem Mac).

import { App } from './app.js';
import { punktLoeschen, glaetten } from './linien.js';
import { dist } from './mathe.js';

// Zirkel: Abstand zwischen ziehendem und ruhendem Finger = Halbmesser des Einflusses
App.prototype.zirkel = function (einer, x, y) {
  const z = this.zug;
  if (!z) return;
  if (z.art === 'punkt') {
    const p0 = z.ziel.sp ? [z.ziel.P.p[0], z.ziel.P.p[1], -z.ziel.P.p[2]] : z.ziel.P.p;
    const q = z.sicht.inEbene(p0, x, y);
    this.einfluss = dist(p0, q);
    this.einflussAnwenden();
    this.zugBewegen(einer.x, einer.y);
  } else if (z.art === 'griff') {
    z.brechen = true;
  }
};

// Im Blick: zwei Finger drehen → um 90° weiter (Seite → Front → Seite von hinten → Front von hinten)
App.prototype.wenden = function (richtung) {
  const R = this.raum;
  if (R.modus !== 'blick' || R.blick === 'top') return;
  const folge = [['seite', false], ['front', false], ['seite', true], ['front', true]];
  const jetzt = folge.findIndex(([n, h]) => n === R.blick && h === R.sichten[R.blick].hinten);
  const nxt = folge[(jetzt + (richtung > 0 ? 1 : 3)) % 4];
  this.ausBlick();
  const rs = R.sichten.raum;
  const az = { seite: nxt[1] ? Math.PI : 0, front: nxt[1] ? Math.PI / 2 : -Math.PI / 2 }[nxt[0]];
  let d = az - rs.azimut;
  while (d > Math.PI) d -= 2 * Math.PI;
  while (d < -Math.PI) d += 2 * Math.PI;
  this.kamFahrt = { zielAz: rs.azimut + d, zielH: 0, t: 0, dann: () => this.zuBlick({ n: nxt[0], hinten: nxt[1] }) };
  this.klang('falten');
};

App.prototype.modusSetzenDirekt = function (name) {
  const R = this.raum;
  if (R.modus === 'blatt') {
    R.blick = name;
    R.modus = 'blick';
    R.blickT = 0;
    R.blickAnim = { zu: 1 };
    return;
  }
  if (R.modus === 'blick') this.ausBlick();
  const rs = R.sichten.raum;
  const ziel = { seite: [0, 0], front: [-Math.PI / 2, 0], top: [rs.azimut, Math.PI / 2 * 0.999] }[name];
  let d = ziel[0] - rs.azimut;
  while (d > Math.PI) d -= 2 * Math.PI;
  while (d < -Math.PI) d += 2 * Math.PI;
  this.kamFahrt = { zielAz: rs.azimut + d, zielH: ziel[1], t: 0, dann: () => this.zuBlick({ n: name, hinten: false }) };
};

App.prototype.auswahlLoeschen = function () {
  if (!this.auswahl.size) return this.verweigern();
  // ganzer Loop gewählt → Loop weg; sonst Punkte weg
  for (const L of [...this.linien]) {
    if (L.art !== 'mitte' && L.punkte.every((P) => this.auswahl.has(P.id))) {
      this.haut.linien = this.linien.filter((x) => x !== L);
      this.auswahl.clear();
      this.haut.struktur();
      this.verformen(true);
      this.klang('weg');
      this.merken();
      return;
    }
  }
  let n = 0;
  for (const id of [...this.auswahl]) {
    const q = this.punktMitId(id);
    if (!q || q.P.kreuz) continue;
    if (punktLoeschen(q.L, q.i)) {
      this.haut.einbetten(q.L);
      n++;
    }
  }
  this.auswahl.clear();
  if (!n) return this.verweigern();
  this.haut.struktur();
  this.verformen(true);
  this.klang('weg');
  this.merken();
};

App.prototype.auswahlKante = function () {
  if (!this.auswahl.size) return this.verweigern();
  const ps = [...this.auswahl].map((id) => this.punktMitId(id)).filter(Boolean);
  const an = !ps.every((q) => q.P.kante);
  for (const q of ps) for (const R of this.verbunden(q.P)) R.kante = an;
  this.klang(an ? 'kante' : 'weg');
  this.merken();
};

export { glaetten };
