// Form zuerst (06.11.2026), Beweis B: Bilder der Prüffälle aus `packages/shape/src/dicht/kurvenFaelle.ts`, je Fall eine Seite mit
// einer Spalte je Löser (gedaechtnis | kurven | kurven-jetzt) und zwei Blicken (Seite, schräg von unten vorn). Flächen flach
// schattiert (Kanten sieht man als Sprung im Licht), Loops schwarz (hart dick), gelöschte bzw. vorherige Form nicht.
// Aufruf aus packages/shape: npx vite-node ../../apps/editor/scripts/pruefen/form-b-bild.ts; dann aus apps/editor
// AUSGABE=<ordner> node scripts/pruefen/html-shot.mjs --jpg <ordner>/form-b-*.html
// Umgebung: FAELLE (Komma-Liste, Standard alle), ARTEN, AUSGABE (Standard apps/editor/pruefen-ausgabe/form-b).
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { type BFall, B_FAELLE, bFall } from '../../../../packages/shape/src/dicht/kurvenFaelle';
import { type HautArt, haerteBei, hautLagen } from '../../../../packages/shape/src/dicht/loops';

const faelle = (process.env.FAELLE ? process.env.FAELLE.split(',') : B_FAELLE) as BFall[];
const arten = (process.env.ARTEN ? process.env.ARTEN.split(',') : ['gedaechtnis', 'kurven', 'kurven-jetzt']) as HautArt[];
const out = process.env.AUSGABE ?? resolve(process.cwd(), '../../apps/editor/pruefen-ausgabe/form-b');
mkdirSync(out, { recursive: true });

const runden = (a: ArrayLike<number>, f = 100) => Array.from(a, (x) => Math.round(x * f) / f);

for (const fall of faelle) {
  const spalten = arten.map((art) => {
    const { h, loops } = bFall(fall, art);
    return {
      art,
      pos: runden(h.pos),
      tri: Array.from(h.tri),
      // je Loop seine Linie und (Ring, Paar) ihr Spiegelbild
      linien: loops.flatMap((l) => {
        const L = hautLagen(h, l);
        const hart = Math.max(...haerteBei(l, loops));
        const zu = l.art !== 'ring';
        const p = runden(L);
        if (l.art === 'mitte') return [{ p, zu, hart }];
        return [
          { p, zu, hart },
          { p: runden(Float64Array.from(L, (x, k) => (k % 3 === 2 ? -x : x))), zu, hart },
        ];
      }),
    };
  });
  const html = `<!doctype html><meta charset="utf-8"><style>body{margin:0;background:#f4f1ea;font:14px system-ui}
h1{font-size:16px;margin:10px 14px}.r{display:flex;gap:8px;padding:0 8px}.s{display:flex;flex-direction:column;align-items:center}
canvas{background:#e8e3d8}</style><h1>Beweis B · ${fall}</h1><div class="r" id="r"></div><script>
const SP=${JSON.stringify(spalten)};
const BLICKE=[['Seite',0,0],['schräg von unten vorn',-35,-25]];
function zeichnen(cv,d,az,el){const g=cv.getContext('2d');const W=cv.width,H=cv.height;
const ca=Math.cos(az*Math.PI/180),sa=Math.sin(az*Math.PI/180),ce=Math.cos(el*Math.PI/180),se=Math.sin(el*Math.PI/180);
const T=(x,y,z)=>{const x1=ca*x+sa*z,z1=-sa*x+ca*z;const y2=ce*y-se*z1,z2=se*y+ce*z1;return [x1,y2,z2]};
const P=d.pos,n=P.length/3,Q=new Float64Array(3*n);for(let i=0;i<n;i++){const q=T(P[3*i],P[3*i+1],P[3*i+2]);Q[3*i]=q[0];Q[3*i+1]=q[1];Q[3*i+2]=q[2]}
const s=W/520,cx=W/2,cy=H/2;const X=(i)=>cx+s*Q[3*i],Y=(i)=>cy-s*Q[3*i+1];
const tri=d.tri,F=[];for(let t=0;t<tri.length;t+=3){const a=tri[t],b=tri[t+1],c=tri[t+2];
const ux=Q[3*b]-Q[3*a],uy=Q[3*b+1]-Q[3*a+1],uz=Q[3*b+2]-Q[3*a+2],vx=Q[3*c]-Q[3*a],vy=Q[3*c+1]-Q[3*a+1],vz=Q[3*c+2]-Q[3*a+2];
let nx=uy*vz-uz*vy,ny=uz*vx-ux*vz,nz=ux*vy-uy*vx;const l=Math.hypot(nx,ny,nz)||1;nx/=l;ny/=l;nz/=l;if(nz<=0)continue;
const L=0.35*nx+0.55*ny+0.75*nz;F.push([(Q[3*a+2]+Q[3*b+2]+Q[3*c+2])/3,a,b,c,L])}
F.sort((p,q)=>p[0]-q[0]);for(const [,a,b,c,L] of F){const v=Math.max(0,L);const k=Math.round(70+170*v);
g.fillStyle='rgb('+k+','+Math.round(k*0.97)+','+Math.round(k*0.9)+')';g.strokeStyle=g.fillStyle;g.lineWidth=0.6;g.beginPath();g.moveTo(X(a),Y(a));g.lineTo(X(b),Y(b));g.lineTo(X(c),Y(c));g.closePath();g.fill();g.stroke()}
for(const li of d.linien){const p=li.p;g.strokeStyle=li.hart>0.5?'#000':'#2a5d8a';g.lineWidth=li.hart>0.5?2.4:1.2;g.beginPath();
for(let j=0;j<p.length/3;j++){const q=T(p[3*j],p[3*j+1],p[3*j+2]);const x=cx+s*q[0],y=cy-s*q[1];if(q[2]<-2){g.moveTo(x,y);continue}j?g.lineTo(x,y):g.moveTo(x,y)}
if(li.zu)g.closePath();g.stroke()}}
const r=document.getElementById('r');for(const d of SP){const sp=document.createElement('div');sp.className='s';sp.innerHTML='<b>'+d.art+'</b>';
for(const [name,az,el] of BLICKE){const cv=document.createElement('canvas');cv.width=520;cv.height=440;sp.appendChild(cv);const t=document.createElement('div');t.textContent=name;sp.appendChild(t);zeichnen(cv,d,az,el)}r.appendChild(sp)}
</script>`;
  const datei = resolve(out, `form-b-${fall}.html`);
  writeFileSync(datei, html);
  console.log(datei);
}
