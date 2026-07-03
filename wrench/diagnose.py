"""Diagnose mode — symptom + photo → a guaranteed-parseable repair plan.

Two ideas from the Perceptron docs do the heavy lifting here:

1. Structured outputs (constrained decoding): we hand the model a Pydantic
   schema and get back JSON that *always* validates into it. That's what makes
   the result safe to drop straight into a UI or downstream system.

2. Focus (optional): an internal tool call that lets the model zoom into a
   region for pixel-level scrutiny — worn chain, bent hanger, frayed cable —
   before it commits to an answer.
"""

from __future__ import annotations

from perceptron import image, perceive, pydantic_format, text

from .config import DEFAULT_MODEL
from .schema import Diagnosis


def diagnose(image_src: str, symptom: str) -> Diagnosis:
    """Produce a structured :class:`~wrench.schema.Diagnosis` for a symptom.

    Args:
        image_src: Local path or public URL to a bike photo.
        symptom: What the rider reports, e.g. "gears skip when I pedal hard".

    Returns:
        A validated :class:`Diagnosis`. Because we decode into the schema, the
        returned object is already typed — no try/except JSON parsing.
    """

    # `@perceive` compiles the returned nodes into one request. `response_format`
    # switches on constrained decoding against our schema; `reasoning=True` lets
    # the model think through the visual evidence before answering.
    @perceive(
        response_format=pydantic_format(Diagnosis),
        model=DEFAULT_MODEL,
        reasoning=True,
    )
    def _run(src: str, complaint: str):
        return image(src) + text(
            "You are a bike mechanic. A rider reports the following symptom: "
            f"'{complaint}'. Inspect the bike in the image and return a structured "
            "repair diagnosis. Prefer the simplest likely cause. Keep steps ordered "
            "and beginner-friendly, and only list tools that are actually needed."
        )

    result = _run(image_src, symptom)
    # Guaranteed to validate — the decoder was constrained to this schema.
    return Diagnosis.model_validate_json(result.text)


def inspect_detail(image_src: str, focus_question: str) -> str:
    """Deep-inspect a fine detail using Focus (self-zoom) for extra recall.

    Use this for the small stuff a whole-image glance misses: chain-wear,
    rotor scoring, cable fray, a subtly bent derailleur hanger.

    Args:
        image_src: Local path or public URL to a (usually close-up) bike photo.
        focus_question: A tight, observable question, e.g.
            "Is the chain worn or stretched? Look closely at the links."

    Returns:
        The model's natural-language assessment.
    """

    @perceive(focus=True, model=DEFAULT_MODEL, reasoning=True)
    def _run(src: str, q: str):
        return image(src) + text(q)

    return (_run(image_src, focus_question).text or "").strip()
