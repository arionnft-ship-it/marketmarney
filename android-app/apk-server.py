#!/usr/bin/env python3
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
import hashlib
import json
import os

ROOT = Path('/srv/marney')
APK = ROOT / 'Marney-v4-Beta.apk'
SHA = ROOT / 'Marney-v4-Beta.sha256'
BADGING = ROOT / 'Marney-v4-badging.txt'
PERMISSIONS = ROOT / 'Marney-v4-permissions.txt'

class Handler(BaseHTTPRequestHandler):
    server_version = 'MarneyAPK/4.0'

    def _headers(self, status, content_type, length=0, disposition=None):
        self.send_response(status)
        self.send_header('Content-Type', content_type)
        self.send_header('Content-Length', str(length))
        self.send_header('Cache-Control', 'no-store' if status != 200 else 'public, max-age=3600')
        self.send_header('X-Content-Type-Options', 'nosniff')
        if disposition:
            self.send_header('Content-Disposition', disposition)
        self.end_headers()

    def do_HEAD(self):
        self._serve(head_only=True)

    def do_GET(self):
        self._serve(head_only=False)

    def _serve(self, head_only=False):
        if self.path in ('/', '/health', '/healthz'):
            digest = hashlib.sha256(APK.read_bytes()).hexdigest() if APK.exists() else None
            body = json.dumps({
                'ok': APK.exists(),
                'app': 'Marney',
                'version': '4.0.0-beta',
                'versionCode': 5,
                'sha256': digest,
                'apk': '/Marney-v4-Beta.apk'
            }, separators=(',', ':')).encode()
            self._headers(200 if APK.exists() else 503, 'application/json; charset=utf-8', len(body))
            if not head_only:
                self.wfile.write(body)
            return

        files = {
            '/Marney-v4-Beta.apk': (APK, 'application/vnd.android.package-archive', 'attachment; filename="Marney-v4-Beta.apk"'),
            '/Marney-v4-Beta.sha256': (SHA, 'text/plain; charset=utf-8', 'inline'),
            '/Marney-v4-badging.txt': (BADGING, 'text/plain; charset=utf-8', 'inline'),
            '/Marney-v4-permissions.txt': (PERMISSIONS, 'text/plain; charset=utf-8', 'inline'),
        }
        item = files.get(self.path)
        if not item or not item[0].is_file():
            body = b'Not found\n'
            self._headers(404, 'text/plain; charset=utf-8', len(body))
            if not head_only:
                self.wfile.write(body)
            return
        path, content_type, disposition = item
        size = path.stat().st_size
        self._headers(200, content_type, size, disposition)
        if not head_only:
            with path.open('rb') as handle:
                while chunk := handle.read(1024 * 1024):
                    self.wfile.write(chunk)

    def log_message(self, fmt, *args):
        print('APK_SERVER', self.address_string(), fmt % args, flush=True)

port = int(os.environ.get('PORT', '8080'))
ThreadingHTTPServer(('0.0.0.0', port), Handler).serve_forever()
