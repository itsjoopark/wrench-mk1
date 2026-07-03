"""Drawing helpers — turn grounded detections into an annotated image.

Perceptron returns geometry on a normalized 0–1000 grid; ``boxes_to_pixels()``
maps it to the actual image size. These helpers just paint that geometry so the
"here's your bike, labeled" output is a single function call.
"""

from __future__ import annotations

from PIL import Image, ImageDraw, ImageFont

# A readable, colorblind-friendly-ish palette cycled across labels.
_PALETTE = [
    "#e6194B", "#3cb44b", "#4363d8", "#f58231", "#911eb4",
    "#42d4f4", "#f032e6", "#bfef45", "#fabed4", "#469990",
    "#dcbeff", "#9A6324", "#800000", "#000075", "#a9a9a9", "#ffe119",
]


def _font(size: int = 18) -> ImageFont.ImageFont:
    """Best-effort truetype font, falling back to PIL's bitmap default."""
    for candidate in ("DejaVuSans-Bold.ttf", "Arial.ttf"):
        try:
            return ImageFont.truetype(candidate, size)
        except OSError:
            continue
    return ImageFont.load_default()


def draw_boxes(img: Image.Image, boxes, width: int = 3) -> Image.Image:
    """Return a copy of ``img`` with labeled bounding boxes drawn on it.

    Args:
        img: Source PIL image (RGB).
        boxes: Iterable of pixel-space boxes from ``result.boxes_to_pixels(w, h)``.
            Each box exposes ``top_left.x/y``, ``bottom_right.x/y`` and ``mention``.
        width: Outline thickness in pixels.
    """
    out = img.convert("RGB").copy()
    draw = ImageDraw.Draw(out)
    font = _font()

    for i, box in enumerate(boxes):
        color = _PALETTE[i % len(_PALETTE)]
        x1, y1 = int(box.top_left.x), int(box.top_left.y)
        x2, y2 = int(box.bottom_right.x), int(box.bottom_right.y)
        label = box.mention or "part"

        draw.rectangle([x1, y1, x2, y2], outline=color, width=width)

        # Label chip sitting just above the box (or just below if near the top).
        tb = draw.textbbox((0, 0), label, font=font)
        tw, th = tb[2] - tb[0], tb[3] - tb[1]
        ly = y1 - th - 6 if y1 - th - 6 > 0 else y1 + 4
        draw.rectangle([x1, ly, x1 + tw + 8, ly + th + 6], fill=color)
        draw.text((x1 + 4, ly + 3), label, fill="white", font=font)

    return out
