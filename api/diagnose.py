"""POST /api/diagnose  —  symptom + photo -> schema-validated repair plan.

Body:  { "image": "<data-url or http url>", "symptom": "gears skip ..." }
Reply: the Diagnosis JSON (wrench/schema.py::Diagnosis).

Thin wrapper over wrench.diagnose.diagnose (constrained decoding guarantees the
JSON validates against the schema).
"""

from __future__ import annotations

import base64
import json
import os
import sys
import tempfile
import traceback
from http.server import BaseHTTPRequestHandler

_ROOT = os.path.join(os.path.dirname(__file__), "..")
if _ROOT not in sys.path:
    sys.path.insert(0, _ROOT)

_CONFIGURED = False


def _ensure_configured() -> None:
    global _CONFIGURED
    if _CONFIGURED:
        return
    from wrench.config import setup

    setup()
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
    def do_POST(self):  # noqa: N802
        try:
            length = int(self.headers.get("content-length", 0) or 0)
            body = json.loads(self.rfile.read(length) if length else b"{}")
            image_src = body.get("image")
            symptom = (body.get("symptom") or "").strip()
            if not image_src:
                return self._json(400, {"error": "Missing 'image'."})
            if not symptom:
                return self._json(400, {"error": "Describe the symptom first."})

            _ensure_configured()
            from wrench.diagnose import diagnose

            dx = diagnose(_to_temp_path(image_src), symptom)
            return self._json(200, dx.model_dump())
        except Exception as exc:
            traceback.print_exc()
            return self._json(500, {"error": str(exc)})

    def _json(self, status: int, payload: dict) -> None:
        data = json.dumps(payload).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)
