"""Run grounded detection once on the demo bike and cache the result.

Anatomy mode uses a fixed demo bike, so we detect its parts a single time here
and write public/anatomy-boxes.json. The frontend then reads that file for
instant part selection (no per-load model call).

Usage:
    PERCEPTRON_API_KEY=... python scripts/precompute_anatomy.py [path/to/bike.png]

Defaults to public/bike.png. Requires the `wrench` package deps installed
(pip install -r api/requirements.txt) and a valid PERCEPTRON_API_KEY.
"""

import json
import os
import sys

# Make the repo-root `wrench` package importable when run from anywhere.
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
sys.path.insert(0, ROOT)

from wrench.anatomy import label_anatomy  # noqa: E402
from wrench.config import setup  # noqa: E402


def main() -> None:
    img_path = sys.argv[1] if len(sys.argv) > 1 else os.path.join(ROOT, "public", "bike.png")
    if not os.path.exists(img_path):
        raise SystemExit(f"Image not found: {img_path}")

    setup()  # reads PERCEPTRON_API_KEY
    result = label_anatomy(img_path)

    out = {
        "width": result.annotated.width,
        "height": result.annotated.height,
        "parts": [
            {"label": p.label, "x1": p.x1, "y1": p.y1, "x2": p.x2, "y2": p.y2}
            for p in result.parts
        ],
        "raw_text": result.raw_text,
    }

    out_path = os.path.join(ROOT, "public", "anatomy-boxes.json")
    with open(out_path, "w") as f:
        json.dump(out, f, indent=2)

    print(f"Wrote {out_path} — {len(out['parts'])} parts detected.")


if __name__ == "__main__":
    main()
