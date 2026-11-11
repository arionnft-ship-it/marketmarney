from pathlib import Path
from PIL import Image, ImageOps
import base64
import hashlib
import io
import json

root = Path(__file__).resolve().parent
out = root / 'dist'
out.mkdir(exist_ok=True)

# Owner-selected clean M / orange rising-arrow symbol, prepared from the latest HD upload.
source = base64.b64decode((root / 'user-logo-20261111.b64').read_text().strip(), validate=True)
expected = 'f3d18bcafb6ba5ad2368491a4ce94896105f04992d94244c2e51a1a0c2151bee'
assert hashlib.sha256(source).hexdigest() == expected, 'owner_logo_checksum_mismatch'
symbol = Image.open(io.BytesIO(source)).convert('RGBA')
assert symbol.size == (512, 512), 'owner_logo_dimensions_mismatch'
bbox = symbol.getchannel('A').getbbox()
assert bbox and bbox[2] > 400 and bbox[3] > 400, 'owner_logo_alpha_missing'
symbol = symbol.crop(bbox)

# Keep the original MarketMarney lettering but replace its former symbol everywhere.
old_text_source = base64.b64decode((root / 'wordmark-text-source.b64').read_text().strip(), validate=True)
assert hashlib.sha256(old_text_source).hexdigest() == 'cdcbf063dc103921615abc2eeb38f966f9149e3417437c1b7780d46e5d8231c4', 'original_wordmark_checksum_mismatch'
old_wordmark = Image.open(io.BytesIO(old_text_source)).convert('RGBA')
assert old_wordmark.size == (800, 170), 'original_wordmark_size_mismatch'

def white_matte_to_alpha(image):
    # Remove opaque white surrounding original wordmark text.
    pixels = []
    for r,g,b,a in image.convert('RGBA').getdata():
        opacity = max(0, min(255, 255 - min(r,g,b)))
        opacity = (opacity*a + 127) // 255
        if opacity < 3:
            pixels.append((0,0,0,0))
            continue
        back = 255 - opacity
        def unmatte(channel):
            return max(0, min(255, round((channel-back) * 255 / opacity)))
        pixels.append((unmatte(r),unmatte(g),unmatte(b),opacity))
    result = Image.new('RGBA', image.size, (0,0,0,0))
    result.putdata(pixels)
    return result

wordmark_text = white_matte_to_alpha(old_wordmark.crop((184, 0, 800, 170)))

def pale_for_dark(image):
    # Retain the orange arrow, recolor only the near-black M for dark surfaces.
    pixels=[]
    for r,g,b,a in image.getdata():
        if r < 110 and g < 115 and b < 118:
            pixels.append((248,250,252,a))
        else:
            pixels.append((r,g,b,a))
    result=Image.new('RGBA',image.size,(0,0,0,0))
    result.putdata(pixels)
    return result

light_symbol = pale_for_dark(symbol)

def icon(size, margin=0.055, dark=False, background=None):
    img=light_symbol if dark else symbol
    canvas=Image.new('RGBA',(size,size),background or (0,0,0,0))
    width=round(size*(1-2*margin))
    mark=ImageOps.contain(img,(width,width),Image.Resampling.LANCZOS)
    canvas.alpha_composite(mark,((size-mark.width)//2,(size-mark.height)//2))
    return canvas

primary = icon(512)
primary.save(out / 'logo.png', optimize=True)
primary.save(out / 'logo.webp', quality=94, method=6)
dark_logo = icon(512,dark=True)
dark_logo.save(out / 'logo-dark.png', optimize=True)
dark_logo.save(out / 'logo-dark.webp', quality=94, method=6)

def wordmark(dark=False):
    canvas=Image.new('RGBA',(800,170),(0,0,0,0))
    mark=icon(172,0.025,dark=dark)
    canvas.alpha_composite(mark,(2,0))
    text=wordmark_text.copy()
    if dark:
        text=pale_for_dark(text)
    canvas.alpha_composite(text,(184,0))
    return canvas

wordmark().save(out / 'wordmark.png', optimize=True)
wordmark().save(out / 'wordmark.webp', quality=91, method=6)
wordmark(dark=True).save(out / 'wordmark-dark.webp', quality=91, method=6)

# The About page uses the same M symbol, but with contrast for its dark background.
dark_logo.save(out / 'about-logo.webp', quality=94, method=6)

# Browser, Apple touch, and installable PWA icons use the same new symbol.
# Opaque light icon tiles are intentional for OS launchers, not website hero images.
tile=(248,249,252,255)
favicon=icon(64,0.04,background=tile)
favicon.save(out / 'favicon.png', optimize=True)
favicon.save(out / 'favicon.ico', sizes=[(16,16),(32,32),(48,48),(64,64)])
icon(180,0.08,background=tile).save(out / 'apple-touch-icon.png', optimize=True)
for size in (192,512):
    icon(size,0.06,background=tile).save(out / f'icon-{size}.png', optimize=True)
    icon(size,0.19,background=tile).save(out / f'icon-maskable-{size}.png', optimize=True)

report={
 'artwork':'Owner-selected clean MarketMarney M with orange rising arrow',
 'version':'marney-m-arrow-20261111-v2',
 'sourceSha256':hashlib.sha256(source).hexdigest(),
 'assets':{
  asset.name:{'bytes':asset.stat().st_size,'sha256':hashlib.sha256(asset.read_bytes()).hexdigest()}
  for asset in out.iterdir() if asset.is_file()
 }
}
(out / 'assets.json').write_text(json.dumps(report,indent=2))
print(json.dumps(report,indent=2))
