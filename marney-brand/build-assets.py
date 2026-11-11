from pathlib import Path
from PIL import Image, ImageOps, ImageDraw
import base64
import hashlib
import io
import json
import math

root = Path(__file__).resolve().parent
out = root / 'dist'
out.mkdir(exist_ok=True)

# Rebuild the owner's selected M + orange growth-arrow logo as clean vector geometry.
# Rendering at 4x then downsampling keeps every web, favicon and PWA size sharp.
GEOMETRY_VERSION = 'marketmarney-owner-logo-20261111-v2'
SCALE = 4
canvas = Image.new('RGBA', (512 * SCALE, 512 * SCALE), (0, 0, 0, 0))
draw = ImageDraw.Draw(canvas)
def scaled_points(points):
    return [(round(x * SCALE), round(y * SCALE)) for x, y in points]

# Heavy black M silhouette.
m_points = [
    (48,470),(48,116),(145,116),(255,273),(365,116),(458,116),
    (458,470),(365,470),(365,255),(255,390),(145,255),(145,470)
]
draw.polygon(scaled_points(m_points), fill=(0, 0, 0, 255))

# Three orange growth bars.
for box in [(135,392,198,470),(218,345,282,470),(304,292,368,470)]:
    draw.rectangle(tuple(round(value * SCALE) for value in box), fill=(255, 115, 0, 255))

# Curved rising arrow body using a cubic Bézier centreline with increasing width.
def bezier(t, p0, p1, p2, p3):
    u = 1 - t
    return (
        u**3*p0[0] + 3*u*u*t*p1[0] + 3*u*t*t*p2[0] + t**3*p3[0],
        u**3*p0[1] + 3*u*u*t*p1[1] + 3*u*t*t*p2[1] + t**3*p3[1]
    )
p0, p1, p2, p3 = (25,430), (175,390), (355,255), (430,118)
steps = 120
centres = [bezier(i/(steps-1), p0, p1, p2, p3) for i in range(steps)]
upper, lower = [], []
for index, (x, y) in enumerate(centres):
    if index == 0:
        dx, dy = centres[1][0]-x, centres[1][1]-y
    elif index == steps-1:
        dx, dy = x-centres[index-1][0], y-centres[index-1][1]
    else:
        dx, dy = centres[index+1][0]-centres[index-1][0], centres[index+1][1]-centres[index-1][1]
    length = math.hypot(dx, dy) or 1
    nx, ny = -dy/length, dx/length
    t = index/(steps-1)
    width = 2.5 + 19*(t**1.25)
    upper.append((x + nx*width, y + ny*width))
    lower.append((x - nx*width, y - ny*width))
draw.polygon(scaled_points(upper + list(reversed(lower))), fill=(255, 115, 0, 255))
draw.polygon(scaled_points([(487,42),(377,82),(430,118),(462,158)]), fill=(255, 115, 0, 255))

symbol = canvas.resize((512, 512), Image.Resampling.LANCZOS)
bbox = symbol.getchannel('A').getbbox()
assert bbox and bbox[2] > 470 and bbox[3] > 460, 'owner_logo_geometry_invalid'
symbol = symbol.crop(bbox)
source_sha = hashlib.sha256(GEOMETRY_VERSION.encode()).hexdigest()

# Keep the original MarketMarney lettering but replace its former symbol everywhere.
old_text_source = base64.b64decode((root / 'wordmark-text-source.b64').read_text().strip(), validate=True)
assert hashlib.sha256(old_text_source).hexdigest() == 'cdcbf063dc103921615abc2eeb38f966f9149e3417437c1b7780d46e5d8231c4', 'original_wordmark_checksum_mismatch'
old_wordmark = Image.open(io.BytesIO(old_text_source)).convert('RGBA')
assert old_wordmark.size == (800, 170), 'original_wordmark_size_mismatch'

def white_matte_to_alpha(image):
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
    icon_canvas=Image.new('RGBA',(size,size),background or (0,0,0,0))
    width=round(size*(1-2*margin))
    mark=ImageOps.contain(img,(width,width),Image.Resampling.LANCZOS)
    icon_canvas.alpha_composite(mark,((size-mark.width)//2,(size-mark.height)//2))
    return icon_canvas

primary = icon(512)
primary.save(out / 'logo.png', optimize=True)
primary.save(out / 'logo.webp', quality=94, method=6)
dark_logo = icon(512,dark=True)
dark_logo.save(out / 'logo-dark.png', optimize=True)
dark_logo.save(out / 'logo-dark.webp', quality=94, method=6)

def wordmark(dark=False):
    wordmark_canvas=Image.new('RGBA',(800,170),(0,0,0,0))
    mark=icon(172,0.025,dark=dark)
    wordmark_canvas.alpha_composite(mark,(2,0))
    text=wordmark_text.copy()
    if dark:
        text=pale_for_dark(text)
    wordmark_canvas.alpha_composite(text,(184,0))
    return wordmark_canvas

wordmark().save(out / 'wordmark.png', optimize=True)
wordmark().save(out / 'wordmark.webp', quality=91, method=6)
wordmark(dark=True).save(out / 'wordmark-dark.webp', quality=91, method=6)
dark_logo.save(out / 'about-logo.webp', quality=94, method=6)

# Browser, Apple touch, and installable PWA icons use this same symbol.
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
 'sourceSha256':source_sha,
 'assets':{
  asset.name:{'bytes':asset.stat().st_size,'sha256':hashlib.sha256(asset.read_bytes()).hexdigest()}
  for asset in out.iterdir() if asset.is_file()
 }
}
(out / 'assets.json').write_text(json.dumps(report,indent=2))
print(json.dumps(report,indent=2))
