"""Anatomy mode — label the parts on *your* bike, not a textbook diagram.

This is the capability a generic VLM struggles with: not "describe a bike" but
"draw a tight box around the rear derailleur in this specific photo." Perceptron
returns grounded geometry, so we get real, pixel-accurate labels back.
"""

from __future__ import annotations

from dataclasses import dataclass

from PIL import Image
from perceptron import detect, image

from .config import DEFAULT_PARTS
from .draw import draw_boxes


@dataclass
class Part:
    """A single detected part in pixel coordinates."""

    label: str
    x1: int
    y1: int
    x2: int
    y2: int


@dataclass
class AnatomyResult:
    """Everything anatomy mode produces for one image."""

    parts: list[Part]
    annotated: Image.Image  # the labeled image, ready to show or save
    raw_text: str  # the model's natural-language description


def _load(image_src: str) -> Image.Image:
    """Load a local path or URL into a PIL image (for sizing + drawing)."""
    if image_src.startswith(("http://", "https://")):
        from io import BytesIO
        from urllib.request import urlopen

        with urlopen(image_src) as resp:  # noqa: S310 (trusted demo input)
            return Image.open(BytesIO(resp.read())).convert("RGB")
    return Image.open(image_src).convert("RGB")


def label_anatomy(image_src: str, parts: list[str] | None = None) -> AnatomyResult:
    """Detect and label bike parts in an image.

    Args:
        image_src: Local path or public URL to a bike photo.
        parts: Open-vocabulary part names to look for. Defaults to
            :data:`wrench.config.DEFAULT_PARTS`. Swap in your own list to
            support a different bike style — no retraining required.

    Returns:
        An :class:`AnatomyResult` with structured parts, an annotated image,
        and the model's description.
    """
    classes = parts or DEFAULT_PARTS

    # One call. `detect` uses grounded box decoding under the hood; we pass the
    # part names as an open vocabulary of classes to locate.
    result = detect(image(image_src), classes=classes)

    # Convert the normalized 0–1000 geometry to this image's pixel space.
    pil = _load(image_src)
    pixel_boxes = result.boxes_to_pixels(width=pil.width, height=pil.height) or []

    parts_out = [
        Part(
            label=b.mention or "part",
            x1=int(b.top_left.x),
            y1=int(b.top_left.y),
            x2=int(b.bottom_right.x),
            y2=int(b.bottom_right.y),
        )
        for b in pixel_boxes
    ]

    return AnatomyResult(
        parts=parts_out,
        annotated=draw_boxes(pil, pixel_boxes),
        raw_text=result.text or "",
    )
