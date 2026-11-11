// Loft-Messung (11.11.2026): Bilder ohne Server. Schreibt eine HTML-Seite mit Tafeln; jede Tafel zeichnet Netze (Tiefenpuffer,
// weich schattiert, wahlweise Zebrastreifen) und Linien (verdeckt blass) in einer der drei Ansichten oder schräg.
// Als Bild: aus apps/editor `node scripts/pruefen/html-shot.mjs --jpg <datei.html>`.
import fs from 'node:fs';

export type BildNetz = { pos: ArrayLike<number>; tri: ArrayLike<number>; farbe?: [number, number, number]; zebra?: boolean; wert?: ArrayLike<number> };
export type BildLinie = { pts: ArrayLike<number>; farbe?: string; dick?: number; name?: string; zu?: boolean };
export type Tafel = {
  titel: string;
  /** 'seite' (von +z), 'front' (von −x), 'top' (von +y) oder Drehung [Azimut°, Höhe°] */
  blick: 'seite' | 'front' | 'top' | [number, number];
  netze: BildNetz[];
  linien?: BildLinie[];
  /** Ausschnitt in Welt (xmin, xmax, ymin, ymax, zmin, zmax); fehlt: alles */
  kasten?: [number, number, number, number, number, number];
  breit?: number;
  hoch?: number;
  /** Skala für `wert` je Punkt (Farbe von 0 = Grundfarbe bis max = rot) */
  wertMax?: number;
};

const b64 = (a: Float32Array | Uint32Array): string => Buffer.from(a.buffer, a.byteOffset, a.byteLength).toString('base64');

export function bildSeite(datei: string, titel: string, untertitel: string, tafeln: Tafel[], spalten = 2): void {
  const daten = tafeln.map((t) => ({
    titel: t.titel,
    blick: t.blick,
    kasten: t.kasten ?? null,
    breit: t.breit ?? 760,
    hoch: t.hoch ?? 520,
    wertMax: t.wertMax ?? 0,
    netze: t.netze.map((n) => ({
      pos: b64(Float32Array.from(n.pos as ArrayLike<number>)),
      tri: b64(Uint32Array.from(n.tri as ArrayLike<number>)),
      farbe: n.farbe ?? [226, 184, 138],
      zebra: !!n.zebra,
      wert: n.wert ? b64(Float32Array.from(n.wert as ArrayLike<number>)) : null,
    })),
    linien: (t.linien ?? []).map((l) => ({ pts: b64(Float32Array.from(l.pts as ArrayLike<number>)), farbe: l.farbe ?? '#0b6b5c', dick: l.dick ?? 1.6, name: l.name ?? '', zu: !!l.zu })),
  }));
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>${titel}</title><style>
body{margin:0;padding:22px 24px;background:#efe8dc;font:14px/1.4 -apple-system,Helvetica,Arial,sans-serif;color:#1d1a16}
h1{font-size:21px;margin:0 0 4px}p{margin:0 0 14px;color:#5b5348;max-width:1500px}
.raster{display:grid;grid-template-columns:repeat(${spalten},max-content);gap:14px}
.tafel{background:#f7f2e9;border-radius:10px;padding:10px 12px 12px}.tafel b{display:block;margin:0 0 6px;font-weight:600}
canvas{display:block;border-radius:6px;background:#fbf8f2}</style></head><body><h1>${titel}</h1><p>${untertitel}</p><div class="raster" id="r"></div>
<script>
const DATEN=${JSON.stringify(daten)};
const f32=s=>{const b=atob(s),u=new Uint8Array(b.length);for(let i=0;i<b.length;i++)u[i]=b.charCodeAt(i);return new Float32Array(u.buffer)};
const u32=s=>{const b=atob(s),u=new Uint8Array(b.length);for(let i=0;i<b.length;i++)u[i]=b.charCodeAt(i);return new Uint32Array(u.buffer)};
function achsen(blick){ // Bildachsen rechts (R), oben (U), zum Betrachter (T)
  if(blick==='seite')return{R:[1,0,0],U:[0,1,0],T:[0,0,1]};
  if(blick==='front')return{R:[0,0,1],U:[0,1,0],T:[-1,0,0]};
  if(blick==='top')return{R:[1,0,0],U:[0,0,-1],T:[0,1,0]};
  const az=blick[0]*Math.PI/180,el=blick[1]*Math.PI/180;
  const T=[Math.sin(az)*Math.cos(el),Math.sin(el),Math.cos(az)*Math.cos(el)];
  const R=[Math.cos(az),0,-Math.sin(az)];
  const U=[T[1]*R[2]-T[2]*R[1],T[2]*R[0]-T[0]*R[2],T[0]*R[1]-T[1]*R[0]];
  return{R,U,T};
}
for(const t of DATEN){
  const div=document.createElement('div');div.className='tafel';div.innerHTML='<b>'+t.titel+'</b>';
  const cv=document.createElement('canvas');cv.width=t.breit;cv.height=t.hoch;div.appendChild(cv);document.getElementById('r').appendChild(div);
  const W=t.breit,H=t.hoch,ctx=cv.getContext('2d');
  const {R,U,T}=achsen(t.blick);
  const netze=t.netze.map(n=>({pos:f32(n.pos),tri:u32(n.tri),farbe:n.farbe,zebra:n.zebra,wert:n.wert?f32(n.wert):null}));
  const linien=t.linien.map(l=>({...l,pts:f32(l.pts)}));
  const drin=(x,y,z)=>!t.kasten||(x>=t.kasten[0]&&x<=t.kasten[1]&&y>=t.kasten[2]&&y<=t.kasten[3]&&z>=t.kasten[4]&&z<=t.kasten[5]);
  let a0=1e9,a1=-1e9,b0=1e9,b1=-1e9;
  const nimm=(x,y,z)=>{if(!drin(x,y,z))return;const a=x*R[0]+y*R[1]+z*R[2],b=x*U[0]+y*U[1]+z*U[2];a0=Math.min(a0,a);a1=Math.max(a1,a);b0=Math.min(b0,b);b1=Math.max(b1,b)};
  if(t.kasten){const k=t.kasten;for(const x of[k[0],k[1]])for(const y of[k[2],k[3]])for(const z of[k[4],k[5]]){const a=x*R[0]+y*R[1]+z*R[2],b=x*U[0]+y*U[1]+z*U[2];a0=Math.min(a0,a);a1=Math.max(a1,a);b0=Math.min(b0,b);b1=Math.max(b1,b)}}
  else{for(const n of netze)for(let i=0;i<n.pos.length;i+=3)nimm(n.pos[i],n.pos[i+1],n.pos[i+2]);
  for(const l of linien)for(let i=0;i<l.pts.length;i+=3)nimm(l.pts[i],l.pts[i+1],l.pts[i+2]);}
  const rand=18,s=Math.min((W-2*rand)/Math.max(1e-6,a1-a0),(H-2*rand)/Math.max(1e-6,b1-b0));
  const ox=W/2-s*(a0+a1)/2,oy=H/2+s*(b0+b1)/2;
  const px=(x,y,z)=>[ox+s*(x*R[0]+y*R[1]+z*R[2]),oy-s*(x*U[0]+y*U[1]+z*U[2]),x*T[0]+y*T[1]+z*T[2]];
  const img=ctx.createImageData(W,H),zb=new Float32Array(W*H).fill(-1e30);
  for(let i=0;i<W*H;i++){img.data[4*i]=251;img.data[4*i+1]=248;img.data[4*i+2]=242;img.data[4*i+3]=255}
  const L=[0.35,0.75,0.55],ll=Math.hypot(...L);L[0]/=ll;L[1]/=ll;L[2]/=ll;
  for(const n of netze){
    const P=n.pos,nv=P.length/3,N=new Float32Array(P.length);
    for(let k=0;k<n.tri.length;k+=3){const a=n.tri[k],b=n.tri[k+1],c=n.tri[k+2];
      const ux=P[3*b]-P[3*a],uy=P[3*b+1]-P[3*a+1],uz=P[3*b+2]-P[3*a+2],vx=P[3*c]-P[3*a],vy=P[3*c+1]-P[3*a+1],vz=P[3*c+2]-P[3*a+2];
      const nx=uy*vz-uz*vy,ny=uz*vx-ux*vz,nz=ux*vy-uy*vx;for(const q of[a,b,c]){N[3*q]+=nx;N[3*q+1]+=ny;N[3*q+2]+=nz}}
    for(let i=0;i<nv;i++){const l=Math.hypot(N[3*i],N[3*i+1],N[3*i+2])||1;N[3*i]/=l;N[3*i+1]/=l;N[3*i+2]/=l}
    const S=new Float32Array(3*nv);for(let i=0;i<nv;i++){const q=px(P[3*i],P[3*i+1],P[3*i+2]);S[3*i]=q[0];S[3*i+1]=q[1];S[3*i+2]=q[2]}
    for(let k=0;k<n.tri.length;k+=3){const a=n.tri[k],b=n.tri[k+1],c=n.tri[k+2];
      const x0=S[3*a],y0=S[3*a+1],x1=S[3*b],y1=S[3*b+1],x2=S[3*c],y2=S[3*c+1];
      const fl=(x1-x0)*(y2-y0)-(x2-x0)*(y1-y0);if(Math.abs(fl)<1e-9)continue;
      const xa=Math.max(0,Math.floor(Math.min(x0,x1,x2))),xb=Math.min(W-1,Math.ceil(Math.max(x0,x1,x2)));
      const ya=Math.max(0,Math.floor(Math.min(y0,y1,y2))),yb=Math.min(H-1,Math.ceil(Math.max(y0,y1,y2)));
      for(let y=ya;y<=yb;y++)for(let x=xa;x<=xb;x++){
        const w0=((x1-x)*(y2-y)-(x2-x)*(y1-y))/fl,w1=((x2-x)*(y0-y)-(x0-x)*(y2-y))/fl,w2=1-w0-w1;
        if(w0<-1e-4||w1<-1e-4||w2<-1e-4)continue;
        const z=w0*S[3*a+2]+w1*S[3*b+2]+w2*S[3*c+2],i=y*W+x;if(z<=zb[i])continue;zb[i]=z;
        let nx=w0*N[3*a]+w1*N[3*b]+w2*N[3*c],ny=w0*N[3*a+1]+w1*N[3*b+1]+w2*N[3*c+1],nz=w0*N[3*a+2]+w1*N[3*b+2]+w2*N[3*c+2];
        const nl=Math.hypot(nx,ny,nz)||1;nx/=nl;ny/=nl;nz/=nl;
        let nt=nx*T[0]+ny*T[1]+nz*T[2];if(nt<0){nx=-nx;ny=-ny;nz=-nz;nt=-nt}
        const nr=nx*R[0]+ny*R[1]+nz*R[2],nu=nx*U[0]+ny*U[1]+nz*U[2];
        let h=0.42+0.58*Math.max(0,nr*L[0]+nu*L[1]+nt*L[2]);
        let r=n.farbe[0],g=n.farbe[1],bl=n.farbe[2];
        if(n.zebra){const st=Math.sin(34*Math.atan2(nu,nt+1e-6)+10*nr);const k=st>0?1:0.12;r=235*k+10;g=235*k+10;bl=235*k+10;h=0.75+0.25*h}
        if(n.wert&&t.wertMax>0){const wv=Math.min(1,(w0*n.wert[a]+w1*n.wert[b]+w2*n.wert[c])/t.wertMax);
          const stops=[[236,231,220],[255,221,128],[250,150,70],[200,30,45]];const u=wv*3,j=Math.min(2,Math.floor(u)),f=u-j;
          r=stops[j][0]+(stops[j+1][0]-stops[j][0])*f;g=stops[j][1]+(stops[j+1][1]-stops[j][1])*f;bl=stops[j][2]+(stops[j+1][2]-stops[j][2])*f;h=0.7+0.3*h}
        img.data[4*i]=r*h;img.data[4*i+1]=g*h;img.data[4*i+2]=bl*h}
    }
  }
  // Umriss: Pixel am Rand der Tiefe dunkler
  const kopie=new Uint8ClampedArray(img.data);
  for(let y=1;y<H-1;y++)for(let x=1;x<W-1;x++){const i=y*W+x;if(zb[i]<-1e29)continue;
    if(zb[i-1]<-1e29||zb[i+1]<-1e29||zb[i-W]<-1e29||zb[i+W]<-1e29){kopie[4*i]=30;kopie[4*i+1]=26;kopie[4*i+2]=22}}
  img.data.set(kopie);ctx.putImageData(img,0,0);
  // Linien: sichtbar kräftig, verdeckt blass
  for(const l of linien){const m=l.pts.length/3;if(m<2)continue;
    for(const sicht of[false,true]){ctx.beginPath();ctx.lineWidth=l.dick;ctx.strokeStyle=l.farbe;ctx.globalAlpha=sicht?1:0.22;let an=false;
      const end=l.zu?m:m-1;
      for(let j=0;j<end;j++){const a=px(l.pts[3*j],l.pts[3*j+1],l.pts[3*j+2]),k=(j+1)%m,b=px(l.pts[3*k],l.pts[3*k+1],l.pts[3*k+2]);
        const mx=Math.round((a[0]+b[0])/2),my=Math.round((a[1]+b[1])/2),mz=(a[2]+b[2])/2;
        const zi=(mx>=0&&mx<W&&my>=0&&my<H)?zb[my*W+mx]:-1e30;const vorn=mz>=zi-2.5;
        if(vorn===sicht){ctx.moveTo(a[0],a[1]);ctx.lineTo(b[0],b[1])}}
      ctx.stroke()}
    ctx.globalAlpha=1;
    if(l.name){let best=0,bz=-1e30;for(let j=0;j<m;j++){const q=px(l.pts[3*j],l.pts[3*j+1],l.pts[3*j+2]);if(q[2]>bz){bz=q[2];best=j}}
      const q=px(l.pts[3*best],l.pts[3*best+1],l.pts[3*best+2]);ctx.font='bold 12px -apple-system,Helvetica';ctx.fillStyle='#fff';ctx.strokeStyle='#fff';ctx.lineWidth=3;ctx.strokeText(l.name,q[0]+4,q[1]-4);ctx.fillStyle=l.farbe;ctx.fillText(l.name,q[0]+4,q[1]-4)}
  }
}
</script></body></html>`;
  fs.writeFileSync(datei, html);
}
