"""Wrench — a grounded, structured bike-repair copilot built on Perceptron Mk1.

Public API:
    setup            – configure the SDK once
    label_anatomy    – detect + label parts on your own photo
    diagnose         – symptom + photo -> validated Diagnosis (JSON-safe)
    inspect_detail   – Focus-powered close inspection of a fine detail
"""

from .config import DEFAULT_PARTS, setup
from .anatomy import AnatomyResult, Part, label_anatomy
from .diagnose import diagnose, inspect_detail
from .schema import Diagnosis, RepairStep

__all__ = [
    "setup",
    "DEFAULT_PARTS",
    "label_anatomy",
    "AnatomyResult",
    "Part",
    "diagnose",
    "inspect_detail",
    "Diagnosis",
    "RepairStep",
]

__version__ = "0.1.0"
