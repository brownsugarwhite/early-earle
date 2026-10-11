import pickle, json, math, zlib, struct
from collections import deque
lum=pickle.load(open('lum.pkl','rb'))
out,comp,big=pickle.load(open('seg.pkl','rb'))
H=len(lum); W=len(lum[0])
d=open('tiger.bmp','rb').read()
off=struct.unpack_from('<I',d,10)[0]; row=((W*3+3)//4)*4
def rgb(x,y):
    i=off+y*row+x*3
    return d[i+2],d[i+1],d[i]
prof=json.load(open('profile_px.json'))
K=0.6/291
# Abbildung Bild → Welt je Ansicht
abb={
 'seite':     dict(cx=641,  boden=383),
 'front':     dict(cx=1004, boden=383),
 'top':       dict(cx=254.5, achse=235),
 'seite_auf': dict(cx=1425, boden=387),
 'front_auf': dict(cx=1790, boden=386),
}
def welt(name,u,v):
    a=abb[name]
    if name=='top': return ((u-a['cx'])*K, (a['achse']-v)*K)
    return ((u-a['cx'])*K, (a['boden']-v)*K)
def rel(dx,dy): return (dx*K, -dy*K)

profile={}
for name,p in prof.items():
    kn=[]
    for k in p['knoten']:
        x,y=welt(name,*k['p'])
        ein=rel(*k['ein']) if k['ein'] else (0.0,0.0)
        aus=rel(*k['aus']) if k['aus'] else (0.0,0.0)
        kn.append({'p':{'x':round(x,5),'y':round(y,5)},'ein':{'x':round(ein[0],5),'y':round(ein[1],5)},'aus':{'x':round(aus[0],5),'y':round(aus[1],5)},'art':k['art']})
    pr={'art':p['art'],'knoten':kn}
    if p['art']=='halb': pr['achse']=p['achse']
    profile[name]=pr

# Abstand zum Außenraum (für das Entfernen der Außenkontur aus den Linienbildern)
dist=[[99]*W for _ in range(H)]
q=deque()
for y in range(H):
    for x in range(W):
        if out[y][x]: dist[y][x]=0; q.append((x,y))
while q:
    x,y=q.popleft(); dd=dist[y][x]
    if dd>=7: continue
    for dx,dy in ((1,0),(-1,0),(0,1),(0,-1)):
        nx,ny=x+dx,y+dy
        if 0<=nx<W and 0<=ny<H and dist[ny][nx]>dd+1: dist[ny][nx]=dd+1; q.append((nx,ny))

# Punkte: farbige Flecken und schwarze Punkte (dichte dunkle Kerne)
def farbe(r,g,b):
    if max(r,g,b)-min(r,g,b)<45: return None
    if g>r and b>r*1.1 and g>120: return 'tuerkis'
    if r>g and r>b: return 'rot'
    if b>r and b>g: return 'blau'
    return None
markiert=[[None]*W for _ in range(H)]
for y in range(H):
    for x in range(W):
        f=farbe(*rgb(x,y))
        if f: markiert[y][x]=f
        elif lum[y][x]<70:
            n=sum(1 for yy in range(max(0,y-3),min(H,y+4)) for xx in range(max(0,x-3),min(W,x+4)) if lum[yy][xx]<90)
            if n>=34: markiert[y][x]='schwarz'
# Flecken bündeln
gesehen=[[False]*W for _ in range(H)]
flecken=[]
for y in range(H):
    for x in range(W):
        if markiert[y][x] and not gesehen[y][x]:
            f=markiert[y][x]; q=deque([(x,y)]); gesehen[y][x]=True; pts=[]
            while q:
                cx,cy=q.popleft(); pts.append((cx,cy))
                for dx in (-1,0,1):
                    for dy in (-1,0,1):
                        nx,ny=cx+dx,cy+dy
                        if 0<=nx<W and 0<=ny<H and not gesehen[ny][nx] and markiert[ny][nx]==f:
                            gesehen[ny][nx]=True; q.append((nx,ny))
            if len(pts)>=8:
                mx=sum(p[0] for p in pts)/len(pts); my=sum(p[1] for p in pts)/len(pts)
                flecken.append((f,mx,my,len(pts)))

def ansicht_von(u):
    for name,p in prof.items():
        x0,y0,x1,y1=p['bbox']
        if x0-15<=u<=x1+15: return name
    return None
MANUELL={
 'seite':[('tuerkis',460.5,209.5),('tuerkis',464,216.5),('tuerkis',467.5,223.5),('schwarz',471,231)],
 'front':[('tuerkis',1005.5,208.5),('tuerkis',1018.5,215.5),('tuerkis',1031.5,221.5),('schwarz',1045,231)],
 'top':[],
 'seite_auf':[('rot',1234,91),('rot',1268,102),('rot',1289,143),('schwarz',1297,190),('blau',1296,235),('blau',1279,278),('blau',1253,299)],
 'front_auf':[('rot',1790,106),('rot',1827,116),('rot',1843,149),('schwarz',1849,191),('blau',1846,236),('blau',1828,288),('blau',1792,302)],
}
punkte={}
for a,l in MANUELL.items():
    punkte[a]=[{'farbe':f,'x':round(welt(a,u,v)[0],5),'y':round(welt(a,u,v)[1],5)} for f,u,v in l]
flecken=[(f,u,v,0) for a,l in MANUELL.items() for f,u,v in l]
for a,l in punkte.items(): print(a,[(p['farbe']) for p in l])

# Linienbilder (innere Linien, ohne Außenkontur und Punkte), RGBA-PNG je Ansicht
def png(w,h,pixels):
    raw=b''.join(b'\x00'+bytes(pixels[y*w*4:(y+1)*w*4]) for y in range(h))
    def chunk(t,data): return struct.pack('>I',len(data))+t+data+struct.pack('>I',zlib.crc32(t+data)&0xffffffff)
    return b'\x89PNG\r\n\x1a\n'+chunk(b'IHDR',struct.pack('>IIBBBBB',w,h,8,6,0,0,0))+chunk(b'IDAT',zlib.compress(raw,9))+chunk(b'IEND',b'')
bilder={}
for name,p in prof.items():
    x0,y0,x1,y1=p['bbox']; x0-=4;y0-=4;x1+=4;y1+=4
    w=x1-x0+1; h=y1-y0+1
    px=bytearray(w*h*4)
    for y in range(y0,y1+1):
        for x in range(x0,x1+1):
            if not (0<=x<W and 0<=y<H): continue
            L=lum[y][x]
            if L>=238 or dist[y][x]<=4: continue
            r_,g_,b_=rgb(x,y)
            if max(r_,g_,b_)-min(r_,g_,b_)>=40: continue
            # Punkte aussparen
            if any(abs(x-fx)<7 and abs(y-fy)<7 for f,fx,fy,n in flecken): continue
            a=min(1.0,(238-L)/150)
            i=((y-y0)*w+(x-x0))*4
            px[i:i+4]=bytes((25,35,43,int(a*255)))
    open(f'linien-{name}.png','wb').write(png(w,h,px))
    # Weltrechteck des Bildes
    xa,ya=welt(name,x0,y0); xb,yb=welt(name,x1+1,y1+1)
    bilder[name]={'datei':f'linien-{name}.png','x0':round(xa,5),'y0':round(ya,5),'x1':round(xb,5),'y1':round(yb,5)}
json.dump({'profile':profile,'punkte':punkte,'bilder':bilder},open('tiger.json','w'),indent=1)
print('ok', {k:len(v['knoten']) for k,v in profile.items()})
