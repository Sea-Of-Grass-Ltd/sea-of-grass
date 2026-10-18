# Cool the shrike's body and wings from the cat's warm fawn back to shrike greys/whites.
import numpy as np
from PIL import Image, ImageDraw, ImageFilter
import sys
src,dst=sys.argv[1],sys.argv[2]
im=Image.open(src).convert('RGB'); W,H=im.size
a=np.asarray(im).astype(float)
m=Image.new('L',(W,H),0)
ImageDraw.Draw(m).polygon([(468,1150),(640,1140),(700,1170),(694,1260),(684,1330),(660,1460),(560,1470),(500,1440),(468,1300)],fill=255)
ImageDraw.Draw(m).line([(662,1120),(606,1240)],fill=0,width=14)  # keep the string tan
m=np.asarray(m.filter(ImageFilter.GaussianBlur(4))).astype(float)/255
lum=a@[0.299,0.587,0.114]
w=np.clip((lum-110)/70,0,1)*m                     # only the light fills, not ink lines or string
warm=np.clip((a[...,0]-a[...,2])/40,0,1)           # only pixels that are warm
w*=warm
g=np.stack([lum*0.99,lum*1.0,lum*1.015],-1)+np.array([3,3,3])
out=a*(1-w[...,None])+g*w[...,None]
Image.fromarray(np.clip(out,0,255).astype('uint8')).save(dst)
