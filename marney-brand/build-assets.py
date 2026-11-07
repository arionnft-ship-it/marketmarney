from pathlib import Path
from PIL import Image, ImageOps
import hashlib, json
root=Path(__file__).resolve().parent
source=root/'source.png'
assert hashlib.sha256(source.read_bytes()).hexdigest()=='17570fe09d2bdca2063645e6f0b1c7929aa29930a48f6d344fa63e5c4208867e', 'MARNEY artwork checksum mismatch'
im=Image.open(source).convert('RGBA')
box=im.getchannel('A').point(lambda x:255 if x>=16 else 0).getbbox()
art=im.crop(box) if box else im
out=root/'dist';out.mkdir(exist_ok=True)
def icon(size,background=None,margin=.06):
    canvas=Image.new('RGBA',(size,size),background or (0,0,0,0))
    logo=ImageOps.contain(art,(int(size*(1-2*margin)),int(size*(1-2*margin))),Image.Resampling.LANCZOS)
    canvas.alpha_composite(logo,((size-logo.width)//2,(size-logo.height)//2))
    return canvas
main=icon(512)
main.save(out/'logo.png',optimize=True)
main.save(out/'logo.webp',quality=88,method=6)
icon(64).save(out/'favicon.png',optimize=True)
icon(64).save(out/'favicon.ico',sizes=[(16,16),(32,32),(48,48),(64,64)])
icon(180,(7,18,29,255),.08).convert('RGB').save(out/'apple-touch-icon.png',optimize=True)
for size in (192,512):
    icon(size).save(out/f'icon-{size}.png',optimize=True)
    icon(size,(7,18,29,255),.20).save(out/f'icon-maskable-{size}.png',optimize=True)
report={'sourceSha256':hashlib.sha256(source.read_bytes()).hexdigest(),'sourceDimensions':im.size,'crop':box,'assets':{p.name:{'bytes':p.stat().st_size,'sha256':hashlib.sha256(p.read_bytes()).hexdigest()} for p in out.iterdir() if p.is_file()}}
(out/'assets.json').write_text(json.dumps(report,indent=2))
print(json.dumps(report,indent=2))
