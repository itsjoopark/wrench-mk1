"""Generate a dependency-free placeholder bike.png + anatomy-boxes.json.

This is ONLY a stand-in so the UI's overlay + close-up geometry can be verified
before the real S-Works asset exists. Replace public/bike.png with the exported
Figma bike and run scripts/precompute_anatomy.py to overwrite anatomy-boxes.json
with real detections.
"""

import json
import os
import struct
import zlib

W, H = 800, 500
BG = (238, 238, 236)
INK = (120, 120, 120)

# label -> (x1, y1, x2, y2, fill color). Rough side-profile layout, front-right.
BOXES = {
    "saddle": (300, 118, 384, 150, (72, 72, 72)),
    "seatpost": (330, 150, 360, 250, (150, 120, 90)),
    "handlebar": (560, 150, 672, 196, (60, 90, 130)),
    "stem": (516, 178, 566, 212, (120, 80, 140)),
    "brake lever": (604, 172, 656, 220, (150, 70, 70)),
    "chain": (330, 360, 522, 400, (90, 90, 90)),
    "crank arm": (388, 326, 432, 436, (70, 130, 110)),
    "cassette": (296, 318, 342, 384, (140, 120, 60)),
}

grid = [[BG] * W for _ in range(H)]


def fill(x1, y1, x2, y2, color):
    for y in range(max(0, y1), min(H, y2)):
        row = grid[y]
        for x in range(max(0, x1), min(W, x2)):
            row[x] = color


def ring(cx, cy, r, thickness, color):
    r2o, r2i = r * r, (r - thickness) * (r - thickness)
    for y in range(max(0, cy - r), min(H, cy + r + 1)):
        for x in range(max(0, cx - r), min(W, cx + r + 1)):
            d = (x - cx) ** 2 + (y - cy) ** 2
            if r2i <= d <= r2o:
                grid[y][x] = color


# Two wheels + a couple of frame tubes for a bike-ish silhouette.
ring(220, 350, 100, 4, INK)  # rear wheel
ring(600, 350, 100, 4, INK)  # front wheel
fill(340, 150, 610, 158, INK)  # top tube
fill(346, 240, 610, 248, INK)  # down tube-ish

for label, (x1, y1, x2, y2, c) in BOXES.items():
    fill(x1, y1, x2, y2, c)

# Serialize to PNG (truecolor, 8-bit).
raw = bytearray()
for y in range(H):
    raw.append(0)  # filter type 0
    for x in range(W):
        raw.extend(grid[y][x])


def chunk(tag, data):
    return (
        struct.pack(">I", len(data))
        + tag
        + data
        + struct.pack(">I", zlib.crc32(tag + data) & 0xFFFFFFFF)
    )


png = b"\x89PNG\r\n\x1a\n"
png += chunk(b"IHDR", struct.pack(">IIBBBBB", W, H, 8, 2, 0, 0, 0))
png += chunk(b"IDAT", zlib.compress(bytes(raw), 9))
png += chunk(b"IEND", b"")

here = os.path.dirname(__file__)
public = os.path.join(here, "..", "public")
os.makedirs(public, exist_ok=True)

with open(os.path.join(public, "bike.png"), "wb") as f:
    f.write(png)

boxes_json = {
    "width": W,
    "height": H,
    "parts": [
        {"label": label, "x1": b[0], "y1": b[1], "x2": b[2], "y2": b[3]}
        for label, b in BOXES.items()
    ],
    "raw_text": "PLACEHOLDER — regenerate with scripts/precompute_anatomy.py",
}
with open(os.path.join(public, "anatomy-boxes.json"), "w") as f:
    json.dump(boxes_json, f, indent=2)

print("Wrote public/bike.png and public/anatomy-boxes.json (placeholder).")
