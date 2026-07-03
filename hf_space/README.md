---
title: Wrench — Bike Repair Copilot
emoji: 🔧
colorFrom: gray
colorTo: yellow
sdk: gradio
app_file: app.py
pinned: false
short_description: Grounded bike labels + structured repair plans
---

# 🔧 Wrench — a grounded bike-repair copilot

Point your camera at a bike. **Wrench labels every part on *your* photo** (grounded
boxes, open vocabulary — no training), then turns a plain-English symptom into a
**schema-validated repair plan** via Perceptron Mk1's constrained decoding.

- **Anatomy tab:** upload or snap a photo → labeled boxes → click a part and ask
  what it does or how to adjust it.
- **Diagnose tab:** describe a symptom ("gears skip when I pedal hard") → likely
  cause, severity, tools, ordered steps — plus the raw JSON, which **always parses**.

## Run it yourself

This Space needs one secret: `PERCEPTRON_API_KEY`
(Settings → Variables and secrets). Get a key at
[platform.perceptron.inc](https://platform.perceptron.inc).

Built with [Perceptron Mk1](https://docs.perceptron.inc) — grounded detection,
structured outputs, and Focus.
