from PIL import Image
from pathlib import Path
import json
import numpy as np
from scipy import ndimage
P=Path(__file__).parent/'assets'
im=Image.open(P/'safari.png').convert('RGBA')
rows=[0,180,330,480,630,747,884,1000]; atlas=Image.new('RGBA',(960,1260))
for r in range(7):
 for c in range(6):
  box=(round(c*im.width/6),round(rows[r]*im.height/1000),round((c+1)*im.width/6),round(rows[r+1]*im.height/1000))
  f=im.crop(box)
  arr=np.array(f); labels,n=ndimage.label(arr[:,:,3]>24); sizes=np.bincount(labels.ravel()); sizes[0]=0
  if n:
   keep=sizes>=max(25,sizes.max()*.008); arr[:,:,3][~keep[labels]]=0
   f=Image.fromarray(arr)
  bb=f.getbbox()
  if not bb: continue
  # Preserve horizontal anchor from the original column and a shared foot baseline.
  q=f.crop(bb); q=q.resize((round(q.width*.4),round(q.height*.4)),Image.Resampling.NEAREST)
  x=80-round(f.width*.4/2)+round(bb[0]*.4); y=174-q.height
  atlas.alpha_composite(q,(c*160+x,r*180+y))
arr=np.array(atlas); mask=(arr[:,:,2]>arr[:,:,0].astype(float)*1.12)&(arr[:,:,1]>arr[:,:,0].astype(float)*1.08)
g=arr[:,:,1].copy();b=arr[:,:,2].copy();arr[:,:,0][mask]=np.minimum(240,g[mask].astype(float)*1.05);arr[:,:,1][mask]=g[mask]*.83;arr[:,:,2][mask]=b[mask]*.48
Image.fromarray(arr).save(P/'safari-atlas.png')
for name,bounds,tile,scale in [('camera',[0,115,211,302,379,474,583,657,760],160,.38),('orb',[0,85,185,280,405,480,570,660,760],128,.6)]:
 im=Image.open(P/(name+'.png')).convert('RGBA'); out=Image.new('RGBA',(tile*8,tile))
 for i in range(8):
  f=im.crop((round(bounds[i]/760*im.width),0,round(bounds[i+1]/760*im.width),im.height)); bb=f.getbbox()
  if not bb: continue
  f=f.crop(bb); f=f.resize((max(1,round(f.width*scale)),max(1,round(f.height*scale))),Image.Resampling.NEAREST)
  # The supplied cyan light becomes a muted gold appropriate for the autumn palette.
  pix=f.load()
  for y in range(f.height):
   for x in range(f.width):
    r,g,b,a=pix[x,y]
    if b>r*1.12 and g>r*1.08: pix[x,y]=(min(240,int(g*1.05)),int(g*.83),int(b*.48),a)
  out.alpha_composite(f,(i*tile+(tile-f.width)//2,(tile-f.height)//2))
 out.save(P/(name+'-atlas.png'))
print('Atlases prepared')
