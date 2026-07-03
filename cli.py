"""Command-line runner for Wrench.

Examples:
    # Label the parts on a bike photo and save the annotated image
    python cli.py anatomy path/to/bike.jpg --out labeled.png

    # Diagnose a symptom and print a structured repair plan
    python cli.py diagnose path/to/bike.jpg "gears skip when I pedal hard"

    # Close-inspect a detail with Focus
    python cli.py inspect path/to/chain.jpg "Is this chain worn or stretched?"

Set your key first:  export PERCEPTRON_API_KEY=sk-...
"""

from __future__ import annotations

import argparse
import json
import sys

from wrench import diagnose, inspect_detail, label_anatomy, setup


def _cmd_anatomy(args: argparse.Namespace) -> None:
    res = label_anatomy(args.image)
    print(f"Detected {len(res.parts)} parts:")
    for p in res.parts:
        print(f"  - {p.label:<20} [{p.x1},{p.y1} -> {p.x2},{p.y2}]")
    res.annotated.save(args.out)
    print(f"\nAnnotated image saved to {args.out}")


def _cmd_diagnose(args: argparse.Namespace) -> None:
    dx = diagnose(args.image, args.symptom)
    # `.model_dump()` gives a plain dict — trivial to hand to any downstream system.
    print(json.dumps(dx.model_dump(), indent=2))


def _cmd_inspect(args: argparse.Namespace) -> None:
    print(inspect_detail(args.image, args.question))


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Wrench — grounded bike-repair copilot")
    sub = parser.add_subparsers(dest="command", required=True)

    p_anat = sub.add_parser("anatomy", help="Label bike parts on a photo")
    p_anat.add_argument("image", help="Path or URL to a bike photo")
    p_anat.add_argument("--out", default="labeled.png", help="Where to save the annotated image")
    p_anat.set_defaults(func=_cmd_anatomy)

    p_diag = sub.add_parser("diagnose", help="Diagnose a symptom -> structured JSON")
    p_diag.add_argument("image", help="Path or URL to a bike photo")
    p_diag.add_argument("symptom", help="The problem, e.g. 'gears skip when I pedal hard'")
    p_diag.set_defaults(func=_cmd_diagnose)

    p_insp = sub.add_parser("inspect", help="Focus-powered close inspection of a detail")
    p_insp.add_argument("image", help="Path or URL to a close-up photo")
    p_insp.add_argument("question", help="A tight, observable question about the detail")
    p_insp.set_defaults(func=_cmd_inspect)

    args = parser.parse_args(argv)
    setup()  # reads PERCEPTRON_API_KEY
    args.func(args)
    return 0


if __name__ == "__main__":
    sys.exit(main())
