# Cuts the toy out of each framed card so it can sit on a coloured mat.
# (Old wooden cards; the game now uses tools/cut-felt.py.)
from PIL import Image, ImageDraw, ImageFilter
import numpy as np, sys, glob, os
src_dir, out_dir, sheet_path = sys.argv[1:4]
os.makedirs(out_dir, exist_ok=True)
X0,Y0,S=104,92,367
tiles=[]
for f in sorted(glob.glob(src_dir+'/card-*.webp')):
    i=os.path.basename(f)[5:-5]
    im=Image.open(f).convert('RGB')
    a=np.array(im.crop((X0,Y0,X0+S,Y0+S))).astype(int)
    edge=np.concatenate([a[:4].reshape(-1,3),a[-4:].reshape(-1,3),a[:,:4].reshape(-1,3),a[:,-4:].reshape(-1,3)])
    bg=np.median(edge,0)
    # magenta smudges (source-art artefacts) -> background
    mag=(a[:,:,0]-a[:,:,1]>40)&(a[:,:,2]-a[:,:,1]>25)
    mag[:int(S*0.6)]=False
    m=Image.fromarray((mag*255).astype('uint8')).filter(ImageFilter.MaxFilter(5))
    mag=np.array(m)>0
    a[mag]=bg
    sq=Image.fromarray(a.astype('uint8'))
    fill=sq.copy()
    prot=((a[:,:,0]-a[:,:,2])<22)&(a.sum(2)>560)
    fa=np.array(fill); fa[prot]=[0,0,255]; fill=Image.fromarray(fa)
    for seed in [(1,1),(S-2,1),(1,S-2),(S-2,S-2),(S//2,1),(1,S//2),(S-2,S//2),(S//2,S-2)]:
        if fill.getpixel(seed)!=(255,0,255):
            ImageDraw.floodfill(fill,seed,(255,0,255),thresh=22)
    f2=np.array(fill)
    reg=(f2[:,:,0]==255)&(f2[:,:,1]==0)&(f2[:,:,2]==255)
    dark=np.clip(bg.sum()-a.sum(2),0,None)
    alpha=np.where(reg, np.clip(dark*1.3,0,150), 255).astype(float)
    # fade toward crop border so frame shading never shows
    yy,xx=np.mgrid[0:S,0:S]
    border=np.minimum.reduce([yy,xx,S-1-yy,S-1-xx]).astype(float)
    alpha=np.where(reg, alpha*np.clip(border/18,0,1), alpha)
    al=Image.fromarray(alpha.clip(0,255).astype('uint8')).filter(ImageFilter.GaussianBlur(0.7))
    arr=np.dstack([a.astype('uint8'), np.array(al)])
    arr[reg,:3]=[80,52,30]
    out=Image.fromarray(arr,'RGBA').resize((320,320),Image.LANCZOS)
    out.save(f'{out_dir}/{i}.webp','WEBP',quality=86,method=6)
    t=Image.new('RGBA',(320,320),(185,208,142,255)); t.alpha_composite(out); tiles.append(t)
cols=6; rows=(len(tiles)+cols-1)//cols
sheet=Image.new('RGB',(320*cols,320*rows),(255,255,255))
for k,t in enumerate(tiles): sheet.paste(t.convert('RGB'),((k%cols)*320,(k//cols)*320))
sheet.resize((160*cols,160*rows)).save(sheet_path)
