import pickle, math, json
lum=pickle.load(open('lum.pkl','rb'))
out,comp,big=pickle.load(open('seg.pkl','rb'))
H=len(lum); W=len(lum[0])
panels={'top':2,'seite':4,'front':3,'seite_auf':0,'front_auf':1}

def trace(cid, x0,y0,x1,y1):
    inside=lambda x,y: 0<=x<W and 0<=y<H and comp[y][x]==cid
    # start: topmost-leftmost pixel
    for y in range(y0,y1+1):
        xs=[x for x in range(x0,x1+1) if inside(x,y)]
        if xs: sx,sy=xs[0],y; break
    # Moore neighbor tracing (clockwise in image coords)
    nb=[(-1,0),(-1,-1),(0,-1),(1,-1),(1,0),(1,1),(0,1),(-1,1)]
    contour=[(sx,sy)]; cx,cy=sx,sy; back=0  # came from west
    for _ in range(200000):
        found=False
        for k in range(8):
            d=(back+1+k)%8
            nx,ny=cx+nb[d][0],cy+nb[d][1]
            if inside(nx,ny):
                back=(d+4)%8  # direction pointing back to previous
                # set back to the neighbor before d relative to new pixel
                back=(d+5)%8 if False else (d+4)%8
                cx,cy=nx,ny; found=True; break
        if not found: break
        if (cx,cy)==(sx,sy) and len(contour)>10: break
        contour.append((cx,cy))
    return contour

res={}
for name,cid in panels.items():
    c=[b for b in big if b[5]==cid][0]
    _,x0,y0,x1,y1,_=c
    k=trace(cid,x0,y0,x1,y1)
    res[name]={'bbox':[x0,y0,x1,y1],'kontur':k}
    print(name,len(k),k[:3],k[-2:])
pickle.dump(res,open('kontur.pkl','wb'))
