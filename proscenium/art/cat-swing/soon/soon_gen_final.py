import subprocess, sys
S=sys.argv[1]
HEAD='''<!doctype html><html><head><meta charset="utf-8"><style>
@font-face{font-family:Federo;src:url(fonts/Federo.ttf)}
@font-face{font-family:Italiana;src:url(fonts/Italiana.ttf)}
@font-face{font-family:Poiret;src:url(fonts/PoiretOne.ttf)}
@font-face{font-family:Marcellus;src:url(fonts/Marcellus.ttf)}
html,body{margin:0;width:1116px;height:2100px;background:#000;overflow:hidden}
.b{position:absolute;left:0;top:0;width:1116px;height:2000px;background:url(base_fix.png) 0 0/1116px 2000px}
.t{position:absolute;color:#efe3cf;white-space:nowrap}
</style></head><body><div class="b"></div>'''
INK='#efe3cf'
orb='<span style="display:inline-block;width:74px;height:74px;border-radius:50%;margin:0 12px;vertical-align:-2px;background:radial-gradient(circle at 36% 32%,#fbf7f0 0 6%,#dcd5c8 10%,#bdb4a5 72%,#958c7e 100%);box-shadow:0 0 0 3px #3a2e25"></span>'
V={
# vertical, sinking down the black column toward the bird, fading
'A': '<div class="t" style="font-family:Italiana;font-size:128px;left:318px;top:330px;width:140px;text-align:center;line-height:158px">'
     + ''.join(f'<div>{c}</div>' for c in 'soon')
     + ''.join('<div style="font-size:70px;line-height:52px">.</div>' for _ in range(3)) + '</div>',
# engraved outline letters, letterspaced, under the tail curl
'B': f'<div class="t" style="font-family:Federo;font-size:150px;letter-spacing:40px;left:150px;top:520px;color:transparent;-webkit-text-stroke:2.2px {INK}">soon</div>'
     f'<div class="t" style="left:168px;top:722px;width:410px;height:1.5px;background:{INK};opacity:.35"></div>'
     f'<div class="t" style="font-family:Federo;font-size:60px;letter-spacing:18px;left:296px;top:730px;opacity:.45">...</div>',
# o's as the cat's blank eyes
'C': f'<div class="t" style="font-family:Poiret;font-size:132px;left:178px;top:560px">s{orb}{orb}n</div>',
# sinking baseline: each letter lower and fainter
'D': '<div class="t" style="font-family:Italiana;font-size:150px;left:165px;top:470px">'
     + ''.join(f'<span style="display:inline-block;transform:translateY({dy}px);opacity:{o};margin-right:22px">{c}</span>' for c,dy,o in zip('soon',[0,40,90,150],[.95,.85,.72,.6]))
     + ''.join(f'<span style="display:inline-block;transform:translateY({dy}px);opacity:{o};font-size:80px">.</span>' for dy,o in [(260,.45),(330,.32),(400,.2)]) + '</div>',
}
V={'A':V['A']}
for k,body in V.items():
    open(f'{S}/{k}.html','w').write(HEAD+body+'</body></html>')
    subprocess.run(['/opt/pw-browsers/chromium-1194/chrome-linux/chrome','--headless','--disable-gpu','--no-sandbox','--hide-scrollbars','--allow-file-access-from-files','--virtual-time-budget=5000','--window-size=1116,2100',f'--screenshot={S}/{k}_raw.png',f'file://{S}/{k}.html'],stderr=subprocess.DEVNULL)
from PIL import Image
ims=[]
for k in V:
    im=Image.open(f'{S}/{k}_raw.png').convert('RGB').crop((0,0,1116,2000)); im.save(f'{S}/soon-{k}.png'); ims.append(im.resize((372,667)))
w=Image.new('RGB',(382*len(ims)-10,667),'white')
for i,im in enumerate(ims): w.paste(im,(i*382,0))
w.save(f'{S}/sheet.png')
