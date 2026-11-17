# For toys whose colour is close to the card background (the sheep's wool):
# keeps every warm pixel, closes holes and keeps the solid body.
# Usage: python3 tools/cut-soft-edge.py assets/cards-framed/card-sheep.webp public/cards/sheep.webp
from PIL import Image, ImageDraw, ImageFilter
import numpy as np, sys
X0,Y0,S=104,92,367
src,out=sys.argv[1:3]
a=np.array(Image.open(src).convert('RGB').crop((X0,Y0,X0+S,Y0+S))).astype(int)
edge=np.concatenate([a[:4].reshape(-1,3),a[-4:].reshape(-1,3),a[:,:4].reshape(-1,3),a[:,-4:].reshape(-1,3)])
bg=np.median(edge,0)
warm=a[:,:,0]-a[:,:,2]
dist=np.sqrt(((a-bg)**2).sum(2))
mag=(a[:,:,0]-a[:,:,1]>40)&(a[:,:,2]-a[:,:,1]>25)
fg=((warm>43)|(dist>30))&~mag
m=Image.fromarray((fg*255).astype('uint8'))
m=m.filter(ImageFilter.MinFilter(3)).filter(ImageFilter.MaxFilter(7)).filter(ImageFilter.MinFilter(5))  # denoise + close
# fill holes: flood exterior
ext=m.copy(); ImageDraw.floodfill(ext,(0,0),128)
solid=np.array(ext)!=128
# keep the biggest blob: flood from centre
lab=Image.fromarray((solid*255).astype("uint8")).copy(); ImageDraw.floodfill(lab,(S//2,S//2),77)
body=np.array(lab)==77
alpha=Image.fromarray((body*255).astype("uint8")).filter(ImageFilter.MinFilter(5)).filter(ImageFilter.GaussianBlur(1.0))
al=np.array(alpha).astype(float)
# soft ground shadow outside the body
dark=np.clip(bg.sum()-a.sum(2),0,None)
shadow=np.where(~body&~mag, np.clip(dark*1.1,0,110),0)
yy,xx=np.mgrid[0:S,0:S]; border=np.minimum.reduce([yy,xx,S-1-yy,S-1-xx]).astype(float)
shadow*=np.clip(border/18,0,1)
A=np.maximum(al,shadow)
rgb=a.copy(); rgb[~body]=[80,52,30]
img=Image.fromarray(np.dstack([rgb.astype('uint8'),A.clip(0,255).astype('uint8')]),'RGBA').resize((320,320),Image.LANCZOS)
img.save(out,'WEBP',quality=86,method=6)
