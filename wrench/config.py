"""Configuration and shared constants for Wrench.

Centralizes SDK setup so every module talks to the same model, and defines the
default bike-part vocabulary used for anatomy detection. Editing ``DEFAULT_PARTS``
is the one-line way to point Wrench at a different bike type (BMX, cargo, fixie)
— which is also the cleanest illustration of why grounded, open-vocabulary
detection beats a fixed-class detector you'd otherwise have to retrain.
"""

from __future__ import annotations

import os

from perceptron import configure as _configure

# Flagship image+video model with reasoning. See docs.perceptron.inc/models.
DEFAULT_MODEL = "perceptron-mk1"

# Core road/hybrid bike anatomy. Open-vocabulary: just strings, no training.
# Trimmed to the parts that matter most for teaching + diagnosing; add your own.
DEFAULT_PARTS: list[str] = [
    "saddle",
    "seatpost",
    "handlebar",
    "stem",
    "brake lever",
    "front wheel",
    "rear wheel",
    "tire",
    "chain",
    "chainring",
    "crank arm",
    "pedal",
    "front derailleur",
    "rear derailleur",
    "cassette",
    "disc brake rotor",
]


def setup(api_key: str | None = None, model: str = DEFAULT_MODEL) -> None:
    """Configure the Perceptron SDK once for the whole session.

    Args:
        api_key: Your Perceptron API key. Falls back to the ``PERCEPTRON_API_KEY``
            environment variable so notebooks and CI don't hard-code secrets.
        model: Model ID to use for every call (default: ``perceptron-mk1``).
    """
    key = api_key or os.environ.get("PERCEPTRON_API_KEY")
    if not key:
        raise RuntimeError(
            "No API key. Pass api_key=... or set PERCEPTRON_API_KEY. "
            "Get one at https://platform.perceptron.inc"
        )
    _configure(provider="perceptron", model=model, api_key=key)
