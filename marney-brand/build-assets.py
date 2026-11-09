from pathlib import Path
from PIL import Image, ImageOps
import base64
import hashlib
import io
import json

root = Path(__file__).resolve().parent
out = root / 'dist'
out.mkdir(exist_ok=True)

# Exact owner-uploaded MarketMarney artwork, scaled and optimized for web.
source = base64.b64decode((root / 'user-logo-20261109.b64').read_text().strip(), validate=True)
assert hashlib.sha256(source).hexdigest() == 'cdcbf063dc103921615abc2eeb38f966f9149e3417437c1b7780d46e5d8231c4', 'uploaded_logo_checksum_mismatch'
wordmark = Image.open(io.BytesIO(source)).convert('RGBA')
assert wordmark.size == (800, 170), 'uploaded_logo_size_mismatch'
mark = wordmark.crop((0, 0, 184, 170))

def icon(size, margin):
    canvas = Image.new('RGBA', (size, size), (255, 255, 255, 255))
    target = ImageOps.contain(
        mark,
        (int(size * (1 - 2 * margin)), int(size * (1 - 2 * margin))),
        Image.Resampling.LANCZOS,
    )
    canvas.alpha_composite(target, ((size - target.width) // 2, (size - target.height) // 2))
    return canvas

brand = icon(512, 0.045)
brand.save(out / 'logo.png', optimize=True)
brand.save(out / 'logo.webp', quality=90, method=6)
wordmark.save(out / 'wordmark.png', optimize=True)
wordmark.convert('RGB').save(out / 'wordmark.webp', quality=91, method=6)

favicon = icon(64, 0.04)
favicon.save(out / 'favicon.png', optimize=True)
favicon.save(out / 'favicon.ico', sizes=[(16, 16), (32, 32), (48, 48), (64, 64)])
icon(180, 0.08).convert('RGB').save(out / 'apple-touch-icon.png', optimize=True)
for size in (192, 512):
    icon(size, 0.06).save(out / f'icon-{size}.png', optimize=True)
    icon(size, 0.19).save(out / f'icon-maskable-{size}.png', optimize=True)

report = {
    'artwork': 'MarketMarney white-and-orange upload, 9 Nov 2026',
    'version': 'marney-20261109-new-logo-r1',
    'sourceSha256': hashlib.sha256(source).hexdigest(),
    'assets': {
        asset.name: {'bytes': asset.stat().st_size,
                     'sha256': hashlib.sha256(asset.read_bytes()).hexdigest()}
        for asset in out.iterdir() if asset.is_file()
    },
}
(out / 'assets.json').write_text(json.dumps(report, indent=2))
print(json.dumps(report, indent=2))
