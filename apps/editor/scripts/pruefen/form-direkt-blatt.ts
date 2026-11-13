// Plan vom 12.11.2026, Schritt 3: ein Blatt mit Bildern aus dem Kern (ohne Fenster). Je Zeile ein Fall, je Spalte eine Rechnung
// (links heute, rechts neu), in jeder Spalte die Blicke untereinander. Flächen flach schattiert (jeden Knick sieht man), Linien
// blau, harte schwarz; rot ist eine Fläche, deren Rückseite man sieht (umgestülpt).
// Geschrieben wird eine HTML-Datei; als Bild: aus apps/editor `node scripts/pruefen/html-shot.mjs --jpg <datei.html>`.
import { writeFileSync } from 'node:fs';
import type { Haut } from '../../../../packages/shape/src/dicht/kurven';
import { type Loop, hautLagen, kanteBei } from '../../../../packages/shape/src/dicht/loops';

/** `schnitt`: Strecken eines Schnitts durch die Haut (je vier Zahlen: u1, v1, u2, v2), als eigenes Bild unter den Blicken */
export type BlattBild = { name: string; h: Haut; loops: readonly Loop[]; notiz?: string; schnitt?: { titel: string; strecken: number[]; mass: number } };
export type BlattZeile = { titel: string; bilder: BlattBild[]; blicke?: readonly Blick[]; mass?: number };
/** Blick: Name, Drehung um die Hochachse und Neigung (Grad); 0/0 = Seite (von +z); dazu die Höhe des Bilds als Anteil seiner Breite */
export type Blick = readonly [string, number, number, number?];
export const BLICKE: readonly Blick[] = [
  ['Seite', 0, 0],
  ['von oben', 0, 90],
  ['schräg von vorn', -40, 20],
];

const runden = (a: ArrayLike<number>, f = 100): number[] => Array.from(a, (x) => Math.round(x * f) / f);

function daten(b: BlattBild): object {
  const { h, loops } = b;
  return {
    name: b.name,
    notiz: b.notiz ?? '',
    schnitt: b.schnitt ? { titel: b.schnitt.titel, mass: b.schnitt.mass, strecken: runden(b.schnitt.strecken) } : null,
    pos: runden(h.pos),
    tri: Array.from(h.tri),
    linien: loops.flatMap((l) => {
      const L = hautLagen(h, l);
      const hart = Math.max(0, ...kanteBei(l, loops));
      const zu = l.art !== 'ring';
      const p = runden(L);
      if (l.art === 'mitte') return [{ p, zu, hart }];
      return [
        { p, zu, hart },
        { p: runden(Float64Array.from(L, (x, k) => (k % 3 === 2 ? -x : x))), zu, hart },
      ];
    }),
  };
}

/** das Blatt schreiben; `breite`: Breite des ganzen Blatts in Bildpunkten (die Spalten einer Zeile teilen sie sich) */
export function blattSchreiben(datei: string, titel: string, zeilen: readonly BlattZeile[], breite = 1560): void {
  const Z = zeilen.map((z) => {
    // gemeinsamer Maßstab je Zeile: die größte Ausdehnung aller Bilder
    let m = 0;
    for (const b of z.bilder) for (let i = 0; i < b.h.pos.length; i++) m = Math.max(m, Math.abs(b.h.pos[i]!));
    return { titel: z.titel, blicke: z.blicke ?? BLICKE, mass: z.mass ?? 2.15 * m, bilder: z.bilder.map(daten) };
  });
  const html = `<!doctype html><meta charset="utf-8"><style>body{margin:0;background:#f4f1ea;font:15px system-ui;color:#222;width:${breite + 40}px}
h1{font-size:20px;margin:14px 20px 2px}h2{font-size:17px;margin:18px 20px 6px}.l{margin:0 20px;color:#555;font-size:13px}.r{display:flex;gap:10px;padding:0 20px}
.s{display:flex;flex-direction:column;align-items:flex-start}.s b{font-size:15px;margin-bottom:3px}.k{display:flex;flex-direction:column;align-items:center;font-size:12px;color:#666;margin-bottom:4px}
canvas{background:#e8e3d8}.n{font-size:13px;color:#333;line-height:1.3}</style><h1>${titel}</h1>
<div class="l">Blaue Linien: Loops, schwarz: Kante an. Rot: umgestülpte Fläche (man sieht ihre Rückseite). Flach schattiert, damit jeder Knick zu sehen ist.</div><div id="w"></div><script>
const Z=${JSON.stringify(Z)};const BREITE=${breite};
function zeichnen(cv,d,az,el,mass){const g=cv.getContext('2d');const W=cv.width,H=cv.height;
const ca=Math.cos(az*Math.PI/180),sa=Math.sin(az*Math.PI/180),ce=Math.cos(el*Math.PI/180),se=Math.sin(el*Math.PI/180);
const T=(x,y,z)=>{const x1=ca*x+sa*z,z1=-sa*x+ca*z;const y2=ce*y-se*z1,z2=se*y+ce*z1;return [x1,y2,z2]};
const P=d.pos,n=P.length/3,Q=new Float64Array(3*n);let u0=1e9,u1=-1e9,v0=1e9,v1=-1e9;for(let i=0;i<n;i++){const q=T(P[3*i],P[3*i+1],P[3*i+2]);Q[3*i]=q[0];Q[3*i+1]=q[1];Q[3*i+2]=q[2];u0=Math.min(u0,q[0]);u1=Math.max(u1,q[0]);v0=Math.min(v0,q[1]);v1=Math.max(v1,q[1])}
const s=W/mass,cx=W/2-s*(u0+u1)/2,cy=H/2+s*(v0+v1)/2;const X=(i)=>cx+s*Q[3*i],Y=(i)=>cy-s*Q[3*i+1];
const tri=d.tri,F=[];for(let t=0;t<tri.length;t+=3){const a=tri[t],b=tri[t+1],c=tri[t+2];
const ux=Q[3*b]-Q[3*a],uy=Q[3*b+1]-Q[3*a+1],uz=Q[3*b+2]-Q[3*a+2],vx=Q[3*c]-Q[3*a],vy=Q[3*c+1]-Q[3*a+1],vz=Q[3*c+2]-Q[3*a+2];
let nx=uy*vz-uz*vy,ny=uz*vx-ux*vz,nz=ux*vy-uy*vx;const l=Math.hypot(nx,ny,nz)||1;nx/=l;ny/=l;nz/=l;
const L=0.35*nx+0.55*ny+0.75*nz;F.push([(Q[3*a+2]+Q[3*b+2]+Q[3*c+2])/3,a,b,c,L,nz])}
F.sort((p,q)=>p[0]-q[0]);for(const [,a,b,c,L,nz] of F){let col;if(nz<=0){col='rgb(176,74,60)'}else{const v=Math.max(0,L);const k=Math.round(70+170*v);col='rgb('+k+','+Math.round(k*0.97)+','+Math.round(k*0.9)+')'}
g.fillStyle=col;g.strokeStyle=col;g.lineWidth=0.6;g.beginPath();g.moveTo(X(a),Y(a));g.lineTo(X(b),Y(b));g.lineTo(X(c),Y(c));g.closePath();g.fill();g.stroke()}
for(const li of d.linien){const p=li.p;g.strokeStyle=li.hart>0.5?'#000':'#2a5d8a';g.lineWidth=li.hart>0.5?2.2:1.1;g.beginPath();let offen=false;
for(let j=0;j<p.length/3;j++){const q=T(p[3*j],p[3*j+1],p[3*j+2]);const x=cx+s*q[0],y=cy-s*q[1];if(q[2]<-1){offen=false;continue}if(offen)g.lineTo(x,y);else g.moveTo(x,y);offen=true}
g.stroke()}}
const w=document.getElementById('w');for(const z of Z){const h=document.createElement('h2');h.textContent=z.titel;w.appendChild(h);const r=document.createElement('div');r.className='r';w.appendChild(r);
const B=Math.floor((BREITE-10*(z.bilder.length-1))/z.bilder.length);
// Höhe eines Bilds: nach der Ausdehnung der Form in diesem Blick (alle Spalten gleich)
for(const d of z.bilder){const sp=document.createElement('div');sp.className='s';sp.style.width=B+'px';const t=document.createElement('b');t.textContent=d.name;sp.appendChild(t);
for(const [name,az,el,hoch] of z.blicke){const k=document.createElement('div');k.className='k';const cv=document.createElement('canvas');cv.width=B;cv.height=Math.round(B*(hoch||0.62));k.appendChild(cv);const u=document.createElement('div');u.textContent=name;k.appendChild(u);sp.appendChild(k);zeichnen(cv,d,az,el,z.mass)}
if(d.schnitt){const k=document.createElement('div');k.className='k';const cv=document.createElement('canvas');cv.width=B;cv.height=Math.round(B*0.5);k.appendChild(cv);const u=document.createElement('div');u.textContent=d.schnitt.titel;k.appendChild(u);sp.appendChild(k);
const g=cv.getContext('2d');const sc=cv.width/d.schnitt.mass;g.strokeStyle='#b9b2a3';g.lineWidth=1;g.beginPath();g.moveTo(0,cv.height/2);g.lineTo(cv.width,cv.height/2);g.stroke();g.strokeStyle='#222';g.lineWidth=1.6;g.beginPath();const S=d.schnitt.strecken;for(let i=0;i<S.length;i+=4){g.moveTo(cv.width/2+sc*S[i],cv.height/2-sc*S[i+1]);g.lineTo(cv.width/2+sc*S[i+2],cv.height/2-sc*S[i+3])}g.stroke()}
if(d.notiz){const nn=document.createElement('div');nn.className='n';nn.textContent=d.notiz;sp.appendChild(nn)}r.appendChild(sp)}}
</script>`;
  writeFileSync(datei, html);
}
