"""POST /api/ask  —  grounded VQA about a specific bike part.

Body:  { "image": "<data-url or http url>", "part": "handlebar", "question": "..."? }
Reply: { "answer": "..." }

Mirrors hf_space/app.py::ask_about_part — same prompt framing and default.
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
            part = (body.get("part") or "").strip()
            if not image_src:
                return self._json(400, {"error": "Missing 'image'."})
            if not part:
                return self._json(400, {"error": "Missing 'part'."})

            user_q = (body.get("question") or "").strip()
            q = user_q or "What does this part do, and what are its common failure modes?"
            prompt = (
                f"Look at the {part} in this bike photo. {q} "
                "Answer for a beginner in 3-5 sentences, specific to what you can see."
            )

            _ensure_configured()
            from perceptron import image, question

            result = question(image(_to_temp_path(image_src)), prompt)
            return self._json(200, {"answer": (result.text or "").strip()})
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
