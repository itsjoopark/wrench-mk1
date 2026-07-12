#!/usr/bin/env python3
"""Local dev API server for next dev.

Proxied by next.config.mjs rewrites when USE_LOCAL_API=1. Mirrors the logic in
api/ask.py, api/anatomy.py, and api/diagnose.py so Ask Mk1 / Diagnose / upload
detection work without vercel dev's Python routing quirks.
"""

from __future__ import annotations

import base64
import json
import os
import sys
import tempfile
import traceback
from http.server import BaseHTTPRequestHandler, HTTPServer
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

# Load .env into os.environ (Next.js also reads it; Python needs it here).
_env = ROOT / ".env"
if _env.exists():
    for line in _env.read_text().splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, val = line.split("=", 1)
        key = key.strip()
        val = val.strip()
        if key and val:
            os.environ[key] = val

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
        ext = (
            ".jpg"
            if ("jpeg" in header or "jpg" in header)
            else (".webp" if "webp" in header else ".png")
        )
    else:
        b64, ext = data_url, ".png"
    fd, path = tempfile.mkstemp(suffix=ext, dir="/tmp")
    with os.fdopen(fd, "wb") as f:
        f.write(base64.b64decode(b64))
    return path


class DevHandler(BaseHTTPRequestHandler):
    def do_POST(self) -> None:  # noqa: N802
        try:
            length = int(self.headers.get("content-length", 0) or 0)
            body = json.loads(self.rfile.read(length) if length else b"{}")
            path = self.path.rstrip("/") or "/"

            if path == "/ask":
                return self._handle_ask(body)
            if path == "/anatomy":
                return self._handle_anatomy(body)
            if path == "/diagnose":
                return self._handle_diagnose(body)
            return self._json(404, {"error": f"Unknown route: {path}"})
        except Exception as exc:
            traceback.print_exc()
            return self._json(500, {"error": str(exc)})

    def _handle_ask(self, body: dict) -> None:
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

    def _handle_anatomy(self, body: dict) -> None:
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

    def _handle_diagnose(self, body: dict) -> None:
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

    def _json(self, status: int, payload: dict) -> None:
        data = json.dumps(payload).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def log_message(self, fmt: str, *args) -> None:
        print(f"[local_api] {args[0]}")


if __name__ == "__main__":
    port = int(os.environ.get("LOCAL_API_PORT", "5328"))
    print(f"[local_api] listening on http://127.0.0.1:{port}")
    print("[local_api] routes: /ask /anatomy /diagnose")
    HTTPServer(("127.0.0.1", port), DevHandler).serve_forever()
