from PIL import Image, ImageDraw, ImageFilter
import numpy as np
I='/tmp/claude-0/-home-user-sea-of-grass/6fe1b9e5-e44b-56b9-9adf-1ea7f01092b4/images/'
a=Image.open(I+'46.webp').convert('RGB')
b=Image.open(I+'47.webp').convert('RGB')
o=Image.open('/home/user/sea-of-grass/proscenium/art/cat-swing/cat-swing-paint-current.png').convert('RGB').resize(a.size)
W,H=a.size
def mask(poly,blur):
    m=Image.new('L',(W,H),0); ImageDraw.Draw(m).polygon(poly,fill=255)
    return m.filter(ImageFilter.GaussianBlur(blur))
# tone-match the original's leg/body to the base image's lighter palette
def match(src,ref_box,src_box):
    s=np.asarray(src).astype(float); r=np.asarray(a.crop(ref_box)).astype(float).reshape(-1,3); q=np.asarray(src.crop(src_box)).astype(float).reshape(-1,3)
    out=(s-q.mean(0))/(q.std(0)+1e-6)*r.std(0)+r.mean(0)
    return Image.fromarray(np.clip(out,0,255).astype('uint8'))
o2=match(o,(720,1540,940,1700),(705,1500,935,1700))
out=Image.composite(b,a,mask([(420,1560),(700,1560),(700,1700),(1116,1700),(1116,2000),(470,2000),(470,1860),(480,1710),(420,1700)],14))
# clean floor under the right half: 47's leg-free floor patch, tiled and mirrored
patch=b.crop((490,1690,665,2000))
fl=out.copy()
for i,x in enumerate(range(655,1116,175)): fl.paste(patch if i%2==0 else patch.transpose(Image.FLIP_LEFT_RIGHT),(x,1690))
out=Image.composite(fl,out,mask([(660,1700),(1116,1700),(1116,2000),(660,2000)],6))
# 46's crossing arm and lower body above the floor, right side: replaced by the original's tucked leg and body
m=mask([(752,1400),(752,1615),(712,1660),(712,1700),(722,1780),(745,1852),(940,1852),(952,1725),(1116,1725),(1116,1400)],6)
fade=Image.new('L',(W,H),255); d=ImageDraw.Draw(fade)
for y in range(1400,1500): d.line((0,y,W,y),fill=int(255*(y-1400)/100))
d.rectangle((0,0,W,1400),fill=0)
from PIL import ImageChops
out=Image.composite(o2,out,ImageChops.multiply(m,fade))
out.save('comp2.png')
out.crop((300,1250,1116,2000)).save('comp2_crop.png')
