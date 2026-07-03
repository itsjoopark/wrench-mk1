"""Wrench — a grounded bike-repair copilot, live on Perceptron Mk1.

Two tabs:
  1) Anatomy  — upload/snap a photo -> labeled boxes on YOUR bike.
                Click a box (or pick a part) and ask what it does / how it fails.
  2) Diagnose — describe a symptom -> a structured, schema-validated repair plan.

Design notes for reviewers:
  * All geometry is grounded: Perceptron returns boxes on a normalized 0-1000
    grid; we map them to pixels with `result.boxes_to_pixels(w, h)`.
  * The diagnosis is produced with constrained decoding against a Pydantic
    schema (`pydantic_format`), so the JSON ALWAYS parses — that's the
    "structured output for production pipelines" story, live.
  * The API key is read from the PERCEPTRON_API_KEY env var (an HF Space
    secret). Visitors never see it.
"""

from __future__ import annotations

import json
import os
import tempfile
from typing import Literal, Optional

import gradio as gr
from PIL import Image
from pydantic import BaseModel, Field

from perceptron import configure, detect, image, perceive, pydantic_format, question, text

# ---------------------------------------------------------------------------
# Setup
# ---------------------------------------------------------------------------

MODEL = "perceptron-mk1"

API_KEY = os.environ.get("PERCEPTRON_API_KEY")
if not API_KEY:
    raise RuntimeError(
        "PERCEPTRON_API_KEY is not set. On Hugging Face: Settings -> Variables "
        "and secrets -> New secret. Locally: export PERCEPTRON_API_KEY=..."
    )
configure(provider="perceptron", model=MODEL, api_key=API_KEY)

# Open-vocabulary part list — edit this to retarget (BMX, cargo, e-bike...).
PARTS = [
    "saddle", "seatpost", "handlebar", "stem", "brake lever",
    "front wheel", "rear wheel", "tire", "chain", "chainring",
    "crank arm", "pedal", "front derailleur", "rear derailleur",
    "cassette", "disc brake rotor",
]

EXAMPLE_SYMPTOMS = [
    "gears skip when I pedal hard",
    "brakes squeal when I stop",
    "clicking noise from the pedals every rotation",
    "chain fell off when shifting to the big ring",
]


def _to_temp_path(pil_img: Image.Image) -> str:
    """Persist an uploaded PIL image to a temp file the SDK can ingest."""
    f = tempfile.NamedTemporaryFile(suffix=".png", delete=False)
    pil_img.convert("RGB").save(f.name)
    return f.name


# ---------------------------------------------------------------------------
# Tab 1: Anatomy
# ---------------------------------------------------------------------------

def label_anatomy(pil_img: Image.Image | None):
    """Detect bike parts and return an AnnotatedImage value + part choices.

    Returns:
        annotated: (base_image, [(bbox, label), ...]) for gr.AnnotatedImage
        dropdown:  updated choices with detected parts
        state_path: temp path of the image (reused by follow-up questions)
        status: short human-readable summary
    """
    if pil_img is None:
        return None, gr.update(choices=[], value=None), None, "Upload a photo first."

    path = _to_temp_path(pil_img)

    # One grounded detection call; open vocabulary = just strings.
    result = detect(image(path), classes=PARTS)
    boxes = result.boxes_to_pixels(width=pil_img.width, height=pil_img.height) or []

    # Gradio's AnnotatedImage wants ((x1, y1, x2, y2), label) per region —
    # it renders hover/click highlights for us, no manual drawing needed.
    sections = [
        (
            (int(b.top_left.x), int(b.top_left.y), int(b.bottom_right.x), int(b.bottom_right.y)),
            b.mention or "part",
        )
        for b in boxes
    ]
    labels = sorted({lab for _, lab in sections})

    status = (
        f"Found {len(sections)} parts. Click a box (or pick a part below) and ask about it."
        if sections
        else "No parts found — try a clearer side-profile photo with the drivetrain visible."
    )
    return (pil_img, sections), gr.update(choices=labels, value=labels[0] if labels else None), path, status


def _part_from_click(evt: gr.SelectData):
    """When a user clicks a region on the AnnotatedImage, mirror it into the dropdown."""
    # evt.value is the label of the clicked region.
    return gr.update(value=evt.value)


def ask_about_part(state_path: str | None, part: str | None, user_q: str):
    """Answer a follow-up question about a specific detected part, grounded in the photo."""
    if not state_path:
        return "Label a photo first (Tab 1, step 1)."
    if not part:
        return "Pick a part (or click one of the boxes) first."

    # Default question if the user didn't type one.
    q = user_q.strip() or "What does this part do, and what are its common failure modes?"
    prompt = (
        f"Look at the {part} in this bike photo. {q} "
        "Answer for a beginner in 3-5 sentences, specific to what you can see."
    )
    result = question(image(state_path), prompt)
    return (result.text or "").strip()


# ---------------------------------------------------------------------------
# Tab 2: Diagnose (constrained decoding -> guaranteed-parseable JSON)
# ---------------------------------------------------------------------------

class RepairStep(BaseModel):
    order: int
    instruction: str
    part: Optional[str] = None
    caution: Optional[str] = None


class Diagnosis(BaseModel):
    symptom: str
    likely_cause: str
    affected_parts: list[str]
    severity: Literal["low", "medium", "high"]
    difficulty: Literal["beginner", "intermediate", "advanced"]
    tools_needed: list[str]
    estimated_time_min: int = Field(description="Rough time to complete, in minutes")
    steps: list[RepairStep]


SEVERITY_BADGE = {"low": "🟢 low", "medium": "🟡 medium", "high": "🔴 high"}


def diagnose(pil_img: Image.Image | None, symptom: str):
    """Symptom + photo -> rendered checklist (markdown) + raw JSON."""
    if pil_img is None:
        return "Upload a photo of the bike first.", None
    if not symptom.strip():
        return "Describe the symptom (e.g. *gears skip when I pedal hard*).", None

    path = _to_temp_path(pil_img)

    # Constrained decoding: the model can ONLY emit JSON matching Diagnosis.
    @perceive(response_format=pydantic_format(Diagnosis), model=MODEL, reasoning=True)
    def _run(src: str, complaint: str):
        return image(src) + text(
            f"You are a bike mechanic. A rider reports: '{complaint}'. Inspect the bike "
            "and return a structured repair diagnosis. Prefer the simplest likely cause. "
            "Keep steps ordered and beginner-friendly; only list tools that are needed."
        )

    dx = Diagnosis.model_validate_json(_run(path, symptom).text)  # always parses

    # Render a human-friendly checklist; keep the raw JSON for the devs.
    lines = [
        f"### 🔍 {dx.likely_cause}",
        f"**Severity:** {SEVERITY_BADGE[dx.severity]} &nbsp;|&nbsp; "
        f"**Difficulty:** {dx.difficulty} &nbsp;|&nbsp; "
        f"**Time:** ~{dx.estimated_time_min} min",
        f"**Parts involved:** {', '.join(dx.affected_parts)}",
        f"**Tools:** {', '.join(dx.tools_needed) or 'none'}",
        "",
        "#### Repair steps",
    ]
    for s in dx.steps:
        lines.append(f"{s.order}. {s.instruction}" + (f"  \n   ⚠️ *{s.caution}*" if s.caution else ""))
    return "\n".join(lines), dx.model_dump()


# ---------------------------------------------------------------------------
# UI
# ---------------------------------------------------------------------------

with gr.Blocks(title="Wrench — bike repair copilot") as demo:
    gr.Markdown(
        "# 🔧 Wrench — point it at your bike\n"
        "Grounded part detection + schema-guaranteed repair plans, powered by "
        "[Perceptron Mk1](https://docs.perceptron.inc). "
        "*Tip: a side-profile photo with the drivetrain visible works best.*"
    )

    with gr.Tab("🚲 Anatomy — label & learn"):
        with gr.Row():
            with gr.Column(scale=1):
                anat_img = gr.Image(type="pil", sources=["upload", "webcam", "clipboard"], label="Your bike")
                anat_btn = gr.Button("Label my bike", variant="primary")
                anat_status = gr.Markdown()
            with gr.Column(scale=2):
                anat_out = gr.AnnotatedImage(label="Detected parts (click a box!)")
        with gr.Row():
            part_dd = gr.Dropdown(label="Part", choices=[], interactive=True)
            part_q = gr.Textbox(
                label="Ask about it",
                placeholder="What does this do? How do I adjust it? (leave empty for the default)",
            )
            ask_btn = gr.Button("Ask Mk1")
        part_answer = gr.Markdown()
        img_state = gr.State()

        anat_btn.click(label_anatomy, inputs=[anat_img], outputs=[anat_out, part_dd, img_state, anat_status])
        anat_out.select(_part_from_click, outputs=[part_dd])
        ask_btn.click(ask_about_part, inputs=[img_state, part_dd, part_q], outputs=[part_answer])

    with gr.Tab("🩺 Diagnose — symptom → repair plan"):
        with gr.Row():
            with gr.Column(scale=1):
                diag_img = gr.Image(type="pil", sources=["upload", "webcam", "clipboard"], label="Your bike")
                symptom_tb = gr.Textbox(label="What's wrong?", placeholder=EXAMPLE_SYMPTOMS[0])
                gr.Examples(examples=[[s] for s in EXAMPLE_SYMPTOMS], inputs=[symptom_tb], label="Try one of these")
                diag_btn = gr.Button("Diagnose", variant="primary")
            with gr.Column(scale=2):
                plan_md = gr.Markdown(label="Repair plan")
                with gr.Accordion("Raw JSON (constrained decoding — always valid)", open=False):
                    plan_json = gr.JSON()

        diag_btn.click(diagnose, inputs=[diag_img, symptom_tb], outputs=[plan_md, plan_json])

    gr.Markdown(
        "---\n"
        "Built on Perceptron's grounded detection, Focus, and structured outputs. "
        "Code, CLI and Colab: see the repo linked in the launch post."
    )

# Modest queue so public traffic can't stampede the credits.
demo.queue(default_concurrency_limit=2, max_size=20)

if __name__ == "__main__":
    demo.launch()
