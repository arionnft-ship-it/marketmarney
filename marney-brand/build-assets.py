from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter, ImageOps
import hashlib, json

root = Path(__file__).resolve().parent
out = root / 'dist'
out.mkdir(exist_ok=True)

# Compact mark derived from the user-selected Marney logo:
# rising candlesticks, a bold white M, and an amber-orange diagonal accent.
BASE = 1024
BLACK = (0, 0, 0, 255)
WHITE = (248, 248, 248, 255)
ORANGE = (255, 126, 0, 255)
DARK_ORANGE = (205, 82, 0, 255)


def draw_mark(size=BASE, margin=0.035):
    scale = size / BASE
    image = Image.new('RGBA', (size, size), BLACK)
    glow = Image.new('RGBA', image.size, (0, 0, 0, 0))
    g = ImageDraw.Draw(glow)

    candles = [
        (95, 518, 730, 574, 58, 248),
        (155, 458, 670, 510, 64, 122),
        (215, 408, 640, 470, 68, 248),
        (275, 342, 590, 410, 72, 248),
        (335, 370, 548, 420, 70, 118),
        (395, 300, 515, 365, 72, 128),
        (455, 258, 485, 332, 72, 248),
        (515, 218, 455, 300, 76, 248),
        (575, 250, 438, 318, 72, 118),
        (635, 322, 485, 380, 66, 118),
        (695, 370, 535, 420, 64, 248),
        (755, 400, 566, 458, 66, 118),
        (815, 360, 525, 414, 68, 125),
        (875, 315, 490, 375, 72, 248),
        (930, 250, 452, 326, 74, 248),
    ]

    def scale_value(value):
        return int(round(value * scale))

    for x, wick_top, wick_bottom, body_top, body_width, value in candles:
        x, wick_top, wick_bottom, body_top, body_width = map(
            scale_value, (x, wick_top, wick_bottom, body_top, body_width)
        )
        color = (value, value, value, 155)
        g.line((x, wick_top, x, wick_bottom), fill=color, width=max(5, scale_value(8)))
        body_bottom = min(wick_bottom - scale_value(18), body_top + scale_value(95))
        g.rectangle((x - body_width // 2, body_top, x + body_width // 2, body_bottom), fill=color)

    glow = glow.filter(ImageFilter.GaussianBlur(max(2, scale_value(8))))
    image.alpha_composite(glow)
    draw = ImageDraw.Draw(image)

    for x, wick_top, wick_bottom, body_top, body_width, value in candles:
        x, wick_top, wick_bottom, body_top, body_width = map(
            scale_value, (x, wick_top, wick_bottom, body_top, body_width)
        )
        color = (value, value, value, 255)
        draw.rounded_rectangle(
            (x - scale_value(4), wick_top, x + scale_value(4), wick_bottom),
            radius=max(2, scale_value(4)),
            fill=color,
        )
        body_bottom = min(wick_bottom - scale_value(18), body_top + scale_value(95))
        draw.rectangle((x - body_width // 2, body_top, x + body_width // 2, body_bottom), fill=color)

    # Bold M mark from the selected Marney logo.
    m_points = [
        (scale_value(235), scale_value(750)),
        (scale_value(390), scale_value(365)),
        (scale_value(555), scale_value(690)),
        (scale_value(690), scale_value(420)),
        (scale_value(820), scale_value(420)),
        (scale_value(820), scale_value(750)),
    ]
    draw.line(m_points, fill=WHITE, width=max(20, scale_value(122)), joint='curve')

    # Orange diagonal accent.
    draw.polygon(
        [
            (scale_value(575), scale_value(285)),
            (scale_value(810), scale_value(285)),
            (scale_value(705), scale_value(480)),
            (scale_value(485), scale_value(480)),
        ],
        fill=ORANGE,
    )
    draw.line(
        (scale_value(485), scale_value(480), scale_value(705), scale_value(480)),
        fill=DARK_ORANGE,
        width=max(2, scale_value(5)),
    )

    # Keep a safe zone around the mark for Google, browsers and app launchers.
    if margin > 0:
        inner = ImageOps.contain(
            image,
            (int(size * (1 - 2 * margin)), int(size * (1 - 2 * margin))),
            Image.Resampling.LANCZOS,
        )
        canvas = Image.new('RGBA', (size, size), BLACK)
        canvas.alpha_composite(inner, ((size - inner.width) // 2, (size - inner.height) // 2))
        image = canvas
    return image


def save_icon(size, filename, margin=0.035, mode='RGBA'):
    icon = draw_mark(size, margin)
    if mode == 'RGB':
        icon = icon.convert('RGB')
    icon.save(out / filename, optimize=True)
    return icon


main = draw_mark(512, 0.035)
main.save(out / 'logo.png', optimize=True)
main.save(out / 'logo.webp', quality=90, method=6)
save_icon(64, 'favicon.png', margin=0.025)
main.save(out / 'favicon.ico', sizes=[(16, 16), (32, 32), (48, 48), (64, 64)])
save_icon(180, 'apple-touch-icon.png', margin=0.07, mode='RGB')
for size in (192, 512):
    save_icon(size, f'icon-{size}.png', margin=0.05)
    save_icon(size, f'icon-maskable-{size}.png', margin=0.18)

report = {
    'artwork': 'Marney candlestick M mark selected 2026-11-09',
    'version': 'marney-icon-20261109-r1',
    'assets': {
        asset.name: {
            'bytes': asset.stat().st_size,
            'sha256': hashlib.sha256(asset.read_bytes()).hexdigest(),
        }
        for asset in out.iterdir()
        if asset.is_file()
    },
}
(out / 'assets.json').write_text(json.dumps(report, indent=2))
print(json.dumps(report, indent=2))
