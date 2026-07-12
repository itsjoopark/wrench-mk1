"""POST /api/anatomy  —  grounded bike-part detection.

Body:  { "image": "<data-url or http url>", "parts": ["...", ...]? }
Reply: { "parts": [{ "label", "x1", "y1", "x2", "y2" }], "raw_text": "..." }

Thin wrapper over wrench.anatomy.label_anatomy — the box parsing (Perceptron's
0-1000 grid -> pixels via boxes_to_pixels) already lives there.
"""

from __future__ import annotations

import base64
import json
import os
import sys
import tempfile
import traceback
from http.server import BaseHTTPRequestHandler

# Make the repo-root `wrench` package importable (bundled via vercel.json).
_ROOT = os.path.join(os.path.dirname(__file__), "..")
if _ROOT not in sys.path:
    sys.path.insert(0, _ROOT)

_CONFIGURED = False


def _ensure_configured() -> None:
    global _CONFIGURED
    if _CONFIGURED:
        return
    from wrench.config import setup

    setup()  # reads PERCEPTRON_API_KEY
    _CONFIGURED = True


def _to_temp_path(data_url: str) -> str:
    if data_url.startswith(("http://", "https://")):
        return data_url
    if data_url.strip().startswith("data:") and "," in data_url:
        header, b64 = data_url.split(",", 1)
        ext = ".jpg" if ("jpeg" in header or "jpg" in header) else (".webp" if "webp" in header else ".png")
    else:
        b64, ext = data_url, ".png"
    fd, path = tempfile.mkstemp(suffix=ext, dir="/tmp")
    with os.fdopen(fd, "wb") as f:
        f.write(base64.b64decode(b64))
    return path


class handler(BaseHTTPRequestHandler):
    def do_POST(self):  # noqa: N802 (Vercel requires this signature)
        try:
            length = int(self.headers.get("content-length", 0) or 0)
            body = json.loads(self.rfile.read(length) if length else b"{}")
            image_src = body.get("image")
            if not image_src:
                return self._json(400, {"error": "Missing 'image'."})
            parts = body.get("parts") or None

            _ensure_configured()
            from wrench.anatomy import label_anatomy

            result = label_anatomy(_to_temp_path(image_src), parts=parts)
            payload = {
                "parts": [
                    {"label": p.label, "x1": p.x1, "y1": p.y1, "x2": p.x2, "y2": p.y2}
                    for p in result.parts
                ],
                "raw_text": result.raw_text,
            }
            return self._json(200, payload)
        except Exception as exc:  # surface a readable error to the client
            traceback.print_exc()
            return self._json(500, {"error": str(exc)})

    def _json(self, status: int, payload: dict) -> None:
        data = json.dumps(payload).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)
