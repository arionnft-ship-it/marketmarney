#!/usr/bin/env python3
from __future__ import annotations

import io
import json
import math
import mimetypes
import os
import shutil
import subprocess
import threading
import time
import urllib.request
from http import HTTPStatus
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import unquote, urlparse

from PIL import Image, ImageDraw, ImageFilter, ImageFont

PORT = int(os.environ.get("PORT", "8080"))
SOURCE_URL = os.environ.get(
    "SOURCE_URL",
    "https://stream.mux.com/01Im02SGxTyeFVX1fC6kLy2ADOEXbiatngbcw9MSbv4EU.m3u8",
)
LOGO_URL = os.environ.get(
    "LOGO_URL",
    "https://marketmarney.com/assets/brand-logo.png?v=marney-20261107-r2",
)
WORK = Path("/app/work")
OUT = WORK / "MarketMarney_Motorsport_Final.mp4"
SOURCE = WORK / "source-conformed.mp4"
OUTRO_NORM = WORK / "outro-conformed.mp4"
PREVIEW = WORK / "preview.jpg"
STATUS = {
    "state": "starting",
    "message": "Preparing render",
    "source_url": SOURCE_URL,
    "logo_url": LOGO_URL,
    "output": OUT.name,
    "started_at": time.time(),
    "finished_at": None,
    "duration_seconds": None,
    "error": None,
}
LOCK = threading.Lock()


def run(cmd: list[str]) -> subprocess.CompletedProcess:
    print("+", " ".join(cmd), flush=True)
    return subprocess.run(cmd, check=True, capture_output=True, text=True)


def probe(path_or_url: str | Path) -> dict:
    result = run([
        "ffprobe", "-v", "error",
        "-show_streams", "-show_format",
        "-of", "json", str(path_or_url),
    ])
    return json.loads(result.stdout)


def duration(path_or_url: str | Path) -> float:
    info = probe(path_or_url)
    raw = info.get("format", {}).get("duration")
    if raw not in (None, "N/A"):
        return float(raw)
    values = []
    for stream in info.get("streams", []):
        value = stream.get("duration")
        if value not in (None, "N/A"):
            values.append(float(value))
    if not values:
        raise RuntimeError(f"Could not determine duration for {path_or_url}")
    return max(values)


def has_audio(path_or_url: str | Path) -> bool:
    return any(s.get("codec_type") == "audio" for s in probe(path_or_url).get("streams", []))


def font(size: int, bold: bool = False) -> ImageFont.FreeTypeFont:
    options = [
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf" if bold
        else "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
        "/usr/share/fonts/truetype/liberation2/LiberationSans-Bold.ttf" if bold
        else "/usr/share/fonts/truetype/liberation2/LiberationSans-Regular.ttf",
    ]
    for path in options:
        if Path(path).is_file():
            return ImageFont.truetype(path, size=size)
    return ImageFont.load_default()


def contain(image: Image.Image, max_w: int, max_h: int) -> Image.Image:
    image = image.convert("RGBA")
    bbox = image.getbbox()
    if bbox:
        image = image.crop(bbox)
    scale = min(max_w / image.width, max_h / image.height)
    size = (max(1, round(image.width * scale)), max(1, round(image.height * scale)))
    return image.resize(size, Image.Resampling.LANCZOS)


def fetch_logo() -> Image.Image:
    request = urllib.request.Request(
        LOGO_URL,
        headers={"User-Agent": "MarketMarney-Video-Renderer/1.0"},
    )
    try:
        with urllib.request.urlopen(request, timeout=30) as response:
            data = response.read(8 * 1024 * 1024)
        logo = Image.open(io.BytesIO(data)).convert("RGBA")
        logo.load()
        print(f"LOGO_FETCHED bytes={len(data)} size={logo.size}", flush=True)
        return contain(logo, 580, 480)
    except Exception as exc:
        print("LOGO_FETCH_FAILED", repr(exc), flush=True)
        canvas = Image.new("RGBA", (760, 360), (0, 0, 0, 0))
        draw = ImageDraw.Draw(canvas)
        amber = (245, 159, 34, 255)
        white = (242, 242, 239, 255)
        draw.polygon([(95, 210), (155, 65), (210, 65), (150, 250)], fill=amber)
        draw.polygon([(205, 65), (270, 220), (325, 65), (380, 65), (300, 260), (240, 260)],
                     fill=(220, 112, 22, 255))
        draw.line([(340, 175), (470, 55)], fill=amber, width=24)
        draw.polygon([(470, 55), (425, 60), (465, 100)], fill=amber)
        word_font = font(70, bold=True)
        draw.text((70, 270), "Market", font=word_font, fill=white, anchor="lm")
        draw.text((340, 270), "Marney", font=word_font, fill=amber, anchor="lm")
        return contain(canvas, 620, 420)


def make_background(width: int, height: int) -> Image.Image:
    image = Image.new("RGB", (width, height), "#07090d")
    pixels = image.load()
    for y in range(height):
        for x in range(width):
            nx = x / width
            ny = y / height
            base = 7 + int(8 * (1 - ny))
            glow1 = math.exp(-(((nx - 0.50) / 0.44) ** 2 + ((ny - 0.46) / 0.34) ** 2) * 4.0)
            glow2 = math.exp(-(((nx - 0.82) / 0.33) ** 2 + ((ny - 0.90) / 0.22) ** 2) * 4.0)
            r = min(255, base + int(34 * glow1 + 29 * glow2))
            g = min(255, base + int(15 * glow1 + 11 * glow2))
            b = min(255, base + int(3 * glow1 + 2 * glow2))
            pixels[x, y] = (r, g, b)
    streaks = Image.new("RGBA", (width, height), (0, 0, 0, 0))
    d = ImageDraw.Draw(streaks)
    for offset, alpha, line_width in [(0, 60, 4), (42, 34, 3), (90, 18, 2)]:
        d.arc((-550 + offset, -500 + offset, 1260 + offset, 720 + offset),
              196, 337, fill=(242, 142, 26, alpha), width=line_width)
        d.arc((-120 + offset, 1150 - offset, 1740 + offset, 2300 - offset),
              22, 168, fill=(237, 118, 20, alpha), width=line_width)
    streaks = streaks.filter(ImageFilter.GaussianBlur(8))
    return Image.alpha_composite(image.convert("RGBA"), streaks)


def generate_outro() -> None:
    frames_dir = WORK / "outro-frames"
    shutil.rmtree(frames_dir, ignore_errors=True)
    frames_dir.mkdir(parents=True, exist_ok=True)
    width, height, fps, count = 1080, 1920, 24, 48
    base = make_background(width, height)
    logo = fetch_logo()
    domain_font = font(58, bold=False)
    domain = "marketmarney.com"

    for index in range(count):
        t = index / fps
        reveal = max(0.0, min(1.0, t / 0.52))
        eased = 1 - (1 - reveal) ** 3
        frame = base.copy()
        group = Image.new("RGBA", (width, height), (0, 0, 0, 0))

        scale = 0.94 + 0.06 * eased
        logo_frame = logo.resize(
            (max(1, round(logo.width * scale)), max(1, round(logo.height * scale))),
            Image.Resampling.LANCZOS,
        )
        logo_frame.putalpha(logo_frame.getchannel("A").point(lambda value: round(value * eased)))
        lx = (width - logo_frame.width) // 2
        ly = round(610 + 24 * (1 - eased))
        group.alpha_composite(logo_frame, (lx, ly))

        glow = Image.new("RGBA", (width, height), (0, 0, 0, 0))
        gd = ImageDraw.Draw(glow)
        gy = 1085
        half = round(330 * eased)
        if half > 0:
            for n in range(16, 0, -1):
                a = round(3.2 * n * eased)
                gd.line((width // 2 - half, gy, width // 2 + half, gy),
                        fill=(247, 147, 30, min(70, a)), width=max(1, n))
        glow = glow.filter(ImageFilter.GaussianBlur(12))
        group = Image.alpha_composite(group, glow)

        draw = ImageDraw.Draw(group)
        text_layer = Image.new("RGBA", (width, 130), (0, 0, 0, 0))
        td = ImageDraw.Draw(text_layer)
        td.text((width // 2, 18), domain, font=domain_font,
                fill=(246, 246, 242, round(255 * eased)), anchor="ma")
        group.alpha_composite(text_layer, (0, 1122))

        frame = Image.alpha_composite(frame, group)
        frame.convert("RGB").save(frames_dir / f"frame-{index:03d}.jpg", quality=95, subsampling=0)

    run([
        "ffmpeg", "-nostdin", "-y",
        "-framerate", str(fps), "-i", str(frames_dir / "frame-%03d.jpg"),
        "-f", "lavfi", "-i", "sine=frequency=62:sample_rate=48000:duration=2",
        "-filter:a", "volume=0.13,afade=t=out:st=0.15:d=1.65,"
                     "aformat=sample_fmts=fltp:channel_layouts=stereo",
        "-t", "2",
        "-c:v", "libx264", "-preset", "medium", "-crf", "17",
        "-pix_fmt", "yuv420p", "-r", str(fps),
        "-c:a", "aac", "-b:a", "160k", "-ar", "48000",
        "-movflags", "+faststart",
        str(OUTRO_NORM),
    ])


def render() -> None:
    WORK.mkdir(parents=True, exist_ok=True)
    try:
        with LOCK:
            STATUS.update(state="rendering", message="Downloading and conforming Hedra master")

        source_audio = has_audio(SOURCE_URL)
        source_cmd = [
            "ffmpeg", "-nostdin", "-y",
            "-rw_timeout", "30000000",
            "-i", SOURCE_URL,
            "-map", "0:v:0",
        ]
        if source_audio:
            source_cmd += ["-map", "0:a:0?"]
        source_cmd += [
            "-vf",
            "scale=1080:1920:force_original_aspect_ratio=decrease,"
            "pad=1080:1920:(ow-iw)/2:(oh-ih)/2:color=black,"
            "fps=24,setsar=1,format=yuv420p",
            "-c:v", "libx264", "-preset", "medium", "-crf", "17",
        ]
        if source_audio:
            source_cmd += [
                "-af", "aresample=48000:async=1:first_pts=0,"
                       "aformat=sample_fmts=fltp:channel_layouts=stereo",
                "-c:a", "aac", "-b:a", "192k",
            ]
        else:
            source_cmd += ["-an"]
        source_cmd += ["-movflags", "+faststart", str(SOURCE)]
        run(source_cmd)

        with LOCK:
            STATUS["message"] = "Creating official MarketMarney outro"
        generate_outro()

        source_duration = duration(SOURCE)
        outro_duration = duration(OUTRO_NORM)
        transition = min(0.28, max(0.12, outro_duration / 6))
        offset = max(0.0, source_duration - transition)

        if not has_audio(SOURCE):
            silent_source = WORK / "source-with-audio.mp4"
            run([
                "ffmpeg", "-nostdin", "-y",
                "-i", str(SOURCE),
                "-f", "lavfi", "-t", f"{source_duration:.6f}",
                "-i", "anullsrc=r=48000:cl=stereo",
                "-map", "0:v:0", "-map", "1:a:0",
                "-c:v", "copy", "-c:a", "aac", "-b:a", "192k",
                "-shortest", "-movflags", "+faststart",
                str(silent_source),
            ])
            shutil.move(silent_source, SOURCE)

        with LOCK:
            STATUS["message"] = "Joining original commercial and branded outro"

        filter_graph = (
            "[0:v]settb=AVTB,setpts=PTS-STARTPTS[v0];"
            "[1:v]settb=AVTB,setpts=PTS-STARTPTS[v1];"
            f"[v0][v1]xfade=transition=fade:duration={transition:.6f}:"
            f"offset={offset:.6f}[v];"
            "[0:a]aresample=48000,asetpts=PTS-STARTPTS[a0];"
            "[1:a]aresample=48000,asetpts=PTS-STARTPTS[a1];"
            f"[a0][a1]acrossfade=d={transition:.6f}:c1=tri:c2=tri[a]"
        )
        run([
            "ffmpeg", "-nostdin", "-y",
            "-i", str(SOURCE), "-i", str(OUTRO_NORM),
            "-filter_complex", filter_graph,
            "-map", "[v]", "-map", "[a]",
            "-c:v", "libx264", "-preset", "medium", "-crf", "17",
            "-profile:v", "high", "-level", "4.1",
            "-pix_fmt", "yuv420p",
            "-c:a", "aac", "-b:a", "192k", "-ar", "48000",
            "-movflags", "+faststart",
            str(OUT),
        ])

        final_info = probe(OUT)
        final_duration = duration(OUT)
        run([
            "ffmpeg", "-nostdin", "-y",
            "-ss", f"{max(0, final_duration - 0.9):.3f}",
            "-i", str(OUT), "-frames:v", "1", "-q:v", "2", str(PREVIEW),
        ])
        run(["ffmpeg", "-v", "error", "-i", str(OUT), "-f", "null", "-"])

        with LOCK:
            STATUS.update(
                state="ready",
                message="Final video ready",
                finished_at=time.time(),
                duration_seconds=round(final_duration, 3),
                source_duration_seconds=round(source_duration, 3),
                outro_duration_seconds=round(outro_duration, 3),
                transition_seconds=round(transition, 3),
                output_size_bytes=OUT.stat().st_size,
                video_streams=[
                    {
                        "codec": s.get("codec_name"),
                        "width": s.get("width"),
                        "height": s.get("height"),
                        "fps": s.get("avg_frame_rate"),
                    }
                    for s in final_info.get("streams", [])
                    if s.get("codec_type") == "video"
                ],
                audio_streams=[
                    {
                        "codec": s.get("codec_name"),
                        "sample_rate": s.get("sample_rate"),
                        "channels": s.get("channels"),
                    }
                    for s in final_info.get("streams", [])
                    if s.get("codec_type") == "audio"
                ],
            )
        print("RENDER_READY", json.dumps(STATUS, sort_keys=True), flush=True)
    except Exception as exc:
        with LOCK:
            STATUS.update(
                state="failed",
                message="Render failed",
                finished_at=time.time(),
                error=str(exc),
            )
        print("RENDER_FAILED", repr(exc), flush=True)


class Handler(BaseHTTPRequestHandler):
    server_version = "MarketMarneyRender/1.0"

    def _json(self, obj: dict, status: int = 200) -> None:
        body = json.dumps(obj, ensure_ascii=False, indent=2).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        if self.command != "HEAD":
            self.wfile.write(body)

    def _file(self, path: Path, download_name: str | None = None) -> None:
        if not path.is_file():
            self._json({"error": "not_ready", "status": STATUS}, 404)
            return
        size = path.stat().st_size
        content_type = mimetypes.guess_type(path.name)[0] or "application/octet-stream"
        range_header = self.headers.get("Range")
        start, end = 0, size - 1
        status = HTTPStatus.OK
        if range_header and range_header.startswith("bytes="):
            try:
                part = range_header[6:].split(",", 1)[0]
                left, right = part.split("-", 1)
                if left:
                    start = int(left)
                if right:
                    end = int(right)
                end = min(end, size - 1)
                if start < 0 or start > end:
                    raise ValueError
                status = HTTPStatus.PARTIAL_CONTENT
            except ValueError:
                self.send_response(HTTPStatus.REQUESTED_RANGE_NOT_SATISFIABLE)
                self.send_header("Content-Range", f"bytes */{size}")
                self.end_headers()
                return
        length = end - start + 1
        self.send_response(status)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(length))
        self.send_header("Accept-Ranges", "bytes")
        self.send_header("Cache-Control", "public, max-age=3600")
        if status == HTTPStatus.PARTIAL_CONTENT:
            self.send_header("Content-Range", f"bytes {start}-{end}/{size}")
        if download_name:
            self.send_header("Content-Disposition", f'attachment; filename="{download_name}"')
        self.end_headers()
        if self.command == "HEAD":
            return
        with path.open("rb") as handle:
            handle.seek(start)
            remaining = length
            while remaining:
                chunk = handle.read(min(1024 * 1024, remaining))
                if not chunk:
                    break
                self.wfile.write(chunk)
                remaining -= len(chunk)

    def do_HEAD(self) -> None:
        self.do_GET()

    def do_GET(self) -> None:
        path = unquote(urlparse(self.path).path)
        if path in ("/_railway/health", "/health"):
            self._json({"ok": True, "state": STATUS["state"]})
        elif path == "/status":
            with LOCK:
                self._json(dict(STATUS))
        elif path in ("/MarketMarney_Motorsport_Final.mp4", "/download"):
            self._file(OUT, "MarketMarney_Motorsport_Final.mp4")
        elif path == "/preview.jpg":
            self._file(PREVIEW)
        elif path == "/":
            with LOCK:
                state = STATUS["state"]
                message = STATUS["message"]
            if state == "ready":
                body = f"""<!doctype html><html><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>MarketMarney Final Video</title>
<style>body{{font-family:system-ui;background:#090b10;color:#f5f5f5;max-width:720px;margin:40px auto;padding:0 18px}}video{{width:min(100%,420px);display:block;margin:24px auto;border-radius:18px;background:#000}}a{{display:inline-block;background:#f3a321;color:#111;padding:13px 18px;border-radius:12px;text-decoration:none;font-weight:750}}small{{color:#aeb4bf}}</style></head><body>
<h1>MarketMarney Motorsport — Final</h1>
<p>Original Hedra commercial preserved, followed by the official MarketMarney logo and marketmarney.com outro.</p>
<video controls preload="metadata" poster="/preview.jpg"><source src="/MarketMarney_Motorsport_Final.mp4" type="video/mp4"></video>
<p><a href="/download">Download MP4</a></p>
<small>Render state: {state}</small></body></html>"""
            else:
                body = f"""<!doctype html><html><head><meta charset="utf-8">
<meta http-equiv="refresh" content="4"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Rendering MarketMarney</title></head><body style="font-family:system-ui;background:#090b10;color:white;max-width:680px;margin:60px auto;padding:20px">
<h1>Rendering MarketMarney video…</h1><p>{message}</p><p>Status: <a style="color:#f3a321" href="/status">JSON</a></p></body></html>"""
            data = body.encode("utf-8")
            self.send_response(200)
            self.send_header("Content-Type", "text/html; charset=utf-8")
            self.send_header("Content-Length", str(len(data)))
            self.send_header("Cache-Control", "no-store")
            self.end_headers()
            if self.command != "HEAD":
                self.wfile.write(data)
        else:
            self._json({"error": "not_found"}, 404)

    def log_message(self, fmt: str, *args) -> None:
        print("HTTP", self.address_string(), fmt % args, flush=True)


if __name__ == "__main__":
    WORK.mkdir(parents=True, exist_ok=True)
    threading.Thread(target=render, daemon=True).start()
    server = ThreadingHTTPServer(("0.0.0.0", PORT), Handler)
    print(f"SERVER_READY port={PORT}", flush=True)
    server.serve_forever()
