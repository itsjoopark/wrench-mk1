"""Structured-output schemas for Wrench.

These Pydantic models are handed to Perceptron's constrained decoder via
``pydantic_format(...)``. Because the model decodes *into* the schema, the
JSON we get back is guaranteed to parse into these types — no defensive
string-scraping, no "please return valid JSON" prompt-begging.

Keeping the schema here (rather than inline) makes the contract between the
model and any downstream UI explicit: this is the shape a frontend, a work
order, or a parts-ordering system can rely on.
"""

from __future__ import annotations

from typing import Literal, Optional

from pydantic import BaseModel, Field


class RepairStep(BaseModel):
    """One ordered instruction in a repair guide."""

    order: int = Field(description="1-based position of this step in the sequence")
    instruction: str = Field(description="What to do, in plain language a beginner can follow")
    part: Optional[str] = Field(
        default=None,
        description="The bike part this step acts on (e.g. 'rear derailleur'), if any",
    )
    caution: Optional[str] = Field(
        default=None,
        description="A safety note or common mistake to avoid, if relevant",
    )


class Diagnosis(BaseModel):
    """A complete, UI-ready diagnosis for a reported symptom.

    Every field here is something a downstream system can act on: render a
    checklist, gate on difficulty, pre-fill a shopping cart with ``tools_needed``,
    or route ``severity == "high"`` jobs to a shop instead of a DIY flow.
    """

    symptom: str = Field(description="The problem as understood by the model")
    likely_cause: str = Field(description="Most probable root cause given the photo + symptom")
    affected_parts: list[str] = Field(
        description="Bike parts involved in the fix; should match anatomy labels where possible"
    )
    severity: Literal["low", "medium", "high"] = Field(
        description="How urgent/risky riding on this is"
    )
    difficulty: Literal["beginner", "intermediate", "advanced"] = Field(
        description="Skill level the repair realistically requires"
    )
    tools_needed: list[str] = Field(description="Tools required, e.g. 'hex key set', 'chain checker'")
    estimated_time_min: int = Field(description="Rough time to complete, in minutes")
    steps: list[RepairStep] = Field(description="Ordered repair instructions")
