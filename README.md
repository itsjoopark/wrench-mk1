# 🔧 Wrench — a grounded bike-repair copilot

**Point your camera at a bike. Wrench labels every part on *your* photo, then turns a plain-English symptom into a step-by-step repair plan — as structured JSON you can drop straight into an app.**

Built on [Perceptron Mk1](https://docs.perceptron.inc). The point isn't "an LLM that knows about bikes" — any model can describe a bike. The point is **grounding**: Wrench draws a tight box around *the rear derailleur in this exact image*, and returns a diagnosis that **always parses**, because it's decoded against a schema.

**🚀 Try it live (no install):** [huggingface.co/spaces/itsjulespark/bike-repair](https://huggingface.co/spaces/itsjulespark/bike-repair)
**See Demo Video:** [Youtube Demo](https://www.youtube.com/watch?v=Qrr52GEIoZQ)

> [![Open In Colab](https://colab.research.google.com/assets/colab-badge.svg)](https://colab.research.google.com/github/YOUR_USERNAME/wrench/blob/main/notebooks/wrench_colab.ipynb)
>
> _(Replace `YOUR_USERNAME` after you push — the notebook itself is fully self-contained and runs top-to-bottom.)_

---

## What it does

**1. Anatomy mode** — `label_anatomy(photo)`
Detects bike parts as an **open vocabulary** (just a list of strings — no training, no fixed classes) and returns pixel-accurate labeled boxes on your own photo. Want to support a fixie or a cargo bike? Edit one list.

**2. Diagnose mode** — `diagnose(photo, symptom)`
Takes a symptom like *"gears skip when I pedal hard"* and returns a validated `Diagnosis`: likely cause, affected parts, severity, difficulty, tools needed, time estimate, and ordered steps. Because it's produced by **constrained decoding**, the JSON is guaranteed to match the schema — no "please return valid JSON," no defensive parsing.

**3. Focus inspection** — `inspect_detail(photo, question)`
For the small stuff a glance misses (chain wear, a bent hanger, a scored rotor), Wrench uses Perceptron's **Focus** tool to zoom in and reason on the crop before answering.

## Quickstart

*Fastest path: the [live Space](https://huggingface.co/spaces/itsjulespark/bike-repair) — upload a photo, no setup. For code:*

```bash
pip install perceptron pillow pydantic
export PERCEPTRON_API_KEY=sk-...        # from https://platform.perceptron.inc
```

```python
import wrench
wrench.setup()                          # reads PERCEPTRON_API_KEY

# 1) Label the anatomy of your bike
res = wrench.label_anatomy("my_bike.jpg")
res.annotated.save("labeled.png")
print([p.label for p in res.parts])

# 2) Diagnose a symptom -> typed, UI-ready object
dx = wrench.diagnose("my_bike.jpg", "gears skip when I pedal hard")
print(dx.likely_cause, "|", dx.severity)
for step in dx.steps:
    print(step.order, step.instruction)
```

Or from the terminal:

```bash
python cli.py anatomy  my_bike.jpg --out labeled.png
python cli.py diagnose my_bike.jpg "gears skip when I pedal hard"
python cli.py inspect  chain.jpg   "Is this chain worn or stretched?"
```

## Why Perceptron (the capability map)

| Wrench feature        | Perceptron capability        | Why it matters |
| --------------------- | ---------------------------- | -------------- |
| Labeled parts on your photo | Grounded **object detection** (normalized 0–1000 boxes) | Precise localization generic VLMs fumble |
| Edit one list to retarget bikes | **Open-vocabulary** classes (+ optional in-context examples) | New concepts with zero fine-tuning |
| Guaranteed-parseable diagnosis | **Structured outputs** (Pydantic-constrained decoding) | Safe to wire into real pipelines |
| Close-up defect checks | **Focus** (self-zoom tool call) | Recall on tiny details |

## Project layout

```
wrench/
├── wrench/
│   ├── config.py     # SDK setup + default part vocabulary
│   ├── anatomy.py    # detect + label parts
│   ├── diagnose.py   # structured diagnosis + Focus inspection
│   ├── schema.py     # Pydantic models (the model<->UI contract)
│   └── draw.py       # render labeled boxes with PIL
├── cli.py            # terminal runner
├── notebooks/
│   └── wrench_colab.ipynb   # self-contained, runs top-to-bottom
└── hf_space/
    ├── app.py               # Gradio app deployed as the live HF Space
    ├── requirements.txt
    └── README.md            # Space config (needs PERCEPTRON_API_KEY secret)
```

## Extending it

- **New bike style:** pass your own `parts=[...]` to `label_anatomy`.
- **Harder-to-name parts:** add annotated in-context examples (`detect(..., examples=[...])`) to teach a class from one picture.
- **Video:** swap `image()` for `video()` and use `expects="clip"` to find *when* a problem shows up (e.g. a wobble under load) — a natural next mode.

## License

MIT.
