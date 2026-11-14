import pickle, math, json
res=pickle.load(open('kontur.pkl','rb'))

def sub(a,b): return (a[0]-b[0],a[1]-b[1])
def add(a,b): return (a[0]+b[0],a[1]+b[1])
def mul(a,s): return (a[0]*s,a[1]*s)
def dot(a,b): return a[0]*b[0]+a[1]*b[1]
def norm(a):
    l=math.hypot(*a); return (a[0]/l,a[1]/l) if l>1e-12 else (0.0,0.0)
def dist(a,b): return math.hypot(a[0]-b[0],a[1]-b[1])

def glaetten(pts, geschlossen, r=2):
    n=len(pts); out=[]
    for i in range(n):
        if not geschlossen and (i<r or i>=n-r): out.append(pts[i]); continue
        sx=sy=0
        for k in range(-r,r+1):
            p=pts[(i+k)%n]; sx+=p[0]; sy+=p[1]
        out.append((sx/(2*r+1), sy/(2*r+1)))
    return out

def resample(pts, step, geschlossen):
    seq=pts+[pts[0]] if geschlossen else pts
    out=[seq[0]]; rest=0.0
    for i in range(1,len(seq)):
        a,b=seq[i-1],seq[i]; L=dist(a,b); t=step-rest
        while t<=L:
            out.append((a[0]+(b[0]-a[0])*t/L, a[1]+(b[1]-a[1])*t/L)); t+=step
        rest=L-(t-step)
    if geschlossen and dist(out[-1],out[0])<step*0.5: out.pop()
    if not geschlossen and dist(out[-1],seq[-1])>0.3: out.append(seq[-1])
    return out

def ecken(pts, geschlossen, m=5, grad=42):
    n=len(pts); wink=[0.0]*n
    for i in range(n):
        if not geschlossen and (i<m or i>=n-m): continue
        a=pts[(i-m)%n]; p=pts[i]; b=pts[(i+m)%n]
        u=norm(sub(p,a)); v=norm(sub(b,p))
        wink[i]=math.degrees(math.acos(max(-1,min(1,dot(u,v)))))
    idx=[]
    for i in range(n):
        if wink[i]<grad: continue
        if all(wink[i]>=wink[(i+k)%n] for k in range(-8,9) if k):
            idx.append(i)
    return idx

# --- Schneider ---
def bez(b,t):
    s=1-t
    return (s*s*s*b[0][0]+3*s*s*t*b[1][0]+3*s*t*t*b[2][0]+t*t*t*b[3][0], s*s*s*b[0][1]+3*s*s*t*b[1][1]+3*s*t*t*b[2][1]+t*t*t*b[3][1])
def bezd(b,t):
    s=1-t
    return (3*s*s*(b[1][0]-b[0][0])+6*s*t*(b[2][0]-b[1][0])+3*t*t*(b[3][0]-b[2][0]), 3*s*s*(b[1][1]-b[0][1])+6*s*t*(b[2][1]-b[1][1])+3*t*t*(b[3][1]-b[2][1]))
def bezdd(b,t):
    return (6*(1-t)*(b[2][0]-2*b[1][0]+b[0][0])+6*t*(b[3][0]-2*b[2][0]+b[1][0]), 6*(1-t)*(b[2][1]-2*b[1][1]+b[0][1])+6*t*(b[3][1]-2*b[2][1]+b[1][1]))
def chord(pts):
    u=[0.0]
    for i in range(1,len(pts)): u.append(u[-1]+dist(pts[i],pts[i-1]))
    return [x/u[-1] for x in u]
def generate(pts,u,t1,t2):
    p0,p3=pts[0],pts[-1]
    C=[[0,0],[0,0]]; X=[0,0]
    for i,t in enumerate(u):
        s=1-t; b1=3*s*s*t; b2=3*s*t*t
        A1=mul(t1,b1); A2=mul(t2,b2)
        C[0][0]+=dot(A1,A1); C[0][1]+=dot(A1,A2); C[1][1]+=dot(A2,A2)
        tmp=sub(pts[i], add(mul(p0,s*s*s+b1), mul(p3,b2+t*t*t)))
        X[0]+=dot(A1,tmp); X[1]+=dot(A2,tmp)
    C[1][0]=C[0][1]
    det=C[0][0]*C[1][1]-C[0][1]*C[1][0]
    seg=dist(p0,p3)
    if abs(det)<1e-12: al=be=seg/3
    else:
        al=(X[0]*C[1][1]-X[1]*C[0][1])/det; be=(C[0][0]*X[1]-C[1][0]*X[0])/det
    if al<1e-6*seg or be<1e-6*seg: al=be=seg/3
    return [p0, add(p0,mul(t1,al)), add(p3,mul(t2,be)), p3]
def maxerr(pts,b,u):
    m=0; sp=len(pts)//2
    for i in range(1,len(pts)-1):
        d=dist(bez(b,u[i]),pts[i])**2
        if d>=m: m=d; sp=i
    return m,sp
def reparam(pts,b,u):
    out=[]
    for p,t in zip(pts,u):
        q=sub(bez(b,t),p); d1=bezd(b,t); d2=bezdd(b,t)
        num=dot(q,d1); den=dot(d1,d1)+dot(q,d2)
        out.append(t if abs(den)<1e-12 else min(1,max(0,t-num/den)))
    return out
def fitkubik(pts,t1,t2,err):
    if len(pts)==2:
        dd=dist(pts[0],pts[1])/3
        return [[pts[0],add(pts[0],mul(t1,dd)),add(pts[1],mul(t2,dd)),pts[1]]]
    u=chord(pts); b=generate(pts,u,t1,t2); m,sp=maxerr(pts,b,u)
    if m<err: return [b]
    if m<err*4:
        for _ in range(6):
            u=reparam(pts,b,u); b=generate(pts,u,t1,t2); m,sp=maxerr(pts,b,u)
            if m<err: return [b]
    sp=max(1,min(len(pts)-2,sp))
    tc=norm(sub(pts[sp-1],pts[sp+1]))
    return fitkubik(pts[:sp+1],t1,tc,err)+fitkubik(pts[sp:],mul(tc,-1),t2,err)

def tangente_start(pts): return norm(sub(pts[min(3,len(pts)-1)],pts[0]))
def tangente_ende(pts): return norm(sub(pts[max(0,len(pts)-4)],pts[-1]))

def zu_knoten(kurven, ecke_start, ecke_ende, geschlossen):
    """kurven: Liste von Bezier [p0,c1,c2,p3]; ergibt Knotenliste mit absoluten Griffen"""
    kn=[]
    for i,b in enumerate(kurven):
        if i==0:
            kn.append({'p':b[0],'ein':None,'aus':sub(b[1],b[0]),'art':'ecke' if ecke_start else 'glatt'})
        else:
            kn[-1]['aus']=sub(b[1],b[0])
        kn.append({'p':b[3],'ein':sub(b[2],b[3]),'aus':None,'art':'glatt'})
    kn[-1]['art']='ecke' if ecke_ende else 'glatt'
    return kn

def profil_geschlossen(kontur, err):
    pts=resample(glaetten(kontur,True,2),2.0,True)
    ek=ecken(pts,True)
    if not ek:
        # an der höchsten Stelle beginnen
        ek=[min(range(len(pts)),key=lambda i:pts[i][1])]; glatt_start=True
    else: glatt_start=False
    n=len(pts); kn_all=[]
    for j,a in enumerate(ek):
        b=ek[(j+1)%len(ek)]
        seg=[pts[(a+k)%n] for k in range(((b-a)%n or n)+1)]
        if glatt_start:
            t1=norm(sub(pts[(a+2)%n],pts[(a-2)%n])); t2=mul(t1,-1)
        else:
            t1=tangente_start(seg); t2=tangente_ende(seg)
        kurven=fitkubik(seg,t1,t2,err)
        kn=zu_knoten(kurven, not glatt_start, not glatt_start, False)
        if kn_all:
            # Ende des letzten Segments == Anfang dieses: zusammenführen
            kn_all[-1]['aus']=kn[0]['aus']
            kn_all.extend(kn[1:])
        else:
            kn_all.extend(kn)
    # Schluss: letzter Knoten == erster Knoten
    last=kn_all.pop()
    kn_all[0]['ein']=last['ein']
    return kn_all

def profil_halb(pfad, err, achse):
    pts=resample(glaetten(pfad,False,2),2.0,False)
    ek=[i for i in ecken(pts,False) if 4<i<len(pts)-5]
    grenzen=[0]+ek+[len(pts)-1]
    kn_all=[]
    for j in range(len(grenzen)-1):
        a,b=grenzen[j],grenzen[j+1]
        seg=pts[a:b+1]
        if j==0:
            t1=(1.0,0.0) if achse=='senkrecht' else (0.0,-1.0)
        else: t1=tangente_start(seg)
        if j==len(grenzen)-2:
            t2=(1.0,0.0) if achse=='senkrecht' else (0.0,-1.0)
        else: t2=tangente_ende(seg)
        kurven=fitkubik(seg,t1,t2,err)
        kn=zu_knoten(kurven, j>0, j<len(grenzen)-2, False)
        if kn_all:
            kn_all[-1]['aus']=kn[0]['aus']; kn_all[-1]['art']='ecke'
            kn_all.extend(kn[1:])
        else: kn_all.extend(kn)
    kn_all[0]['art']='glatt'; kn_all[-1]['art']='glatt'
    return kn_all

def halbpfad(kontur, achse, wert):
    n=len(kontur)
    if achse=='senkrecht':
        # rechte Hälfte, von oben (Achse) im Uhrzeigersinn nach unten (Achse)
        oben=min((i for i in range(n) if abs(kontur[i][0]-wert)<=1), key=lambda i:kontur[i][1])
        unten=max((i for i in range(n) if abs(kontur[i][0]-wert)<=1), key=lambda i:kontur[i][1])
        pfad=[kontur[(oben+k)%n] for k in range(((unten-oben)%n)+1)]
        pfad=[(max(wert,p[0]),p[1]) for p in pfad]
        pfad[0]=(wert,pfad[0][1]); pfad[-1]=(wert,pfad[-1][1])
    else:
        links=min((i for i in range(n) if abs(kontur[i][1]-wert)<=1), key=lambda i:kontur[i][0])
        rechts=max((i for i in range(n) if abs(kontur[i][1]-wert)<=1), key=lambda i:kontur[i][0])
        pfad=[kontur[(links+k)%n] for k in range(((rechts-links)%n)+1)]
        pfad=[(p[0],min(wert,p[1])) for p in pfad]
        pfad[0]=(pfad[0][0],wert); pfad[-1]=(pfad[-1][0],wert)
    return pfad

ERR=(1.6)**2
out={}
for name in ('seite','front','top','seite_auf','front_auf'):
    r=res[name]; x0,y0,x1,y1=r['bbox']; k=r['kontur']
    if name.startswith('seite'):
        kn=profil_geschlossen(k,ERR); art={'art':'geschlossen'}
    elif name.startswith('front'):
        ax=(x0+x1)/2; kn=profil_halb(halbpfad(k,'senkrecht',round(ax)),ERR,'senkrecht'); art={'art':'halb','achse':'senkrecht','achsWert':round(ax)}
    else:
        ay=(y0+y1)/2; kn=profil_halb(halbpfad(k,'waagerecht',round(ay)),ERR,'waagerecht'); art={'art':'halb','achse':'waagerecht','achsWert':round(ay)}
    out[name]={**art,'bbox':r['bbox'],'knoten':kn}
    print(name, len(kn), 'Knoten', sum(1 for x in kn if x['art']=='ecke'),'Ecken')
json.dump(out,open('profile_px.json','w'))
