import type { Severity } from "./types";

// The curated 8 parts shown as buttons in Anatomy mode (from the Figma).
// These are a subset of wrench/config.py::DEFAULT_PARTS. The `label` is the
// display text; `match` is the lowercase detection label(s) it maps to in the
// anatomy boxes (Perceptron returns lowercase mentions like "brake lever").
export interface CuratedPart {
  label: string;
  match: string[];
  /** One-line summary shown in the part detail panel before asking Mk1. */
  description: string;
}

export const CURATED_PARTS: CuratedPart[] = [
  {
    label: "Handlebar",
    match: ["handlebar"],
    description: "Steers the bike and anchors your grip, brakes, and shifters.",
  },
  {
    label: "Seatpost",
    match: ["seatpost"],
    description: "Connects the saddle to the frame and sets your riding height.",
  },
  {
    label: "Saddle",
    match: ["saddle"],
    description: "Your seat — its tilt and height tune comfort and pedaling power.",
  },
  {
    label: "Chain",
    match: ["chain"],
    description: "Transfers pedaling power from the cranks to the rear wheel.",
  },
  {
    label: "Stem",
    match: ["stem"],
    description: "Clamps the handlebar to the fork's steerer tube.",
  },
  {
    label: "Brake Lever",
    match: ["brake lever"],
    description: "Actuates the brakes — reach and feel are adjustable.",
  },
  {
    label: "Crank Arm",
    match: ["crank arm"],
    description: "The levers that turn your pedal strokes into rotation.",
  },
  {
    label: "Cassette",
    match: ["cassette"],
    description: "The stack of rear cogs that gives you your gear range.",
  },
];

// Full open-vocabulary list handed to detect() — mirrors wrench/config.py.
export const DETECT_PARTS: string[] = [
  "saddle", "seatpost", "handlebar", "stem", "brake lever",
  "front wheel", "rear wheel", "tire", "chain", "chainring",
  "crank arm", "pedal", "front derailleur", "rear derailleur",
  "cassette", "disc brake rotor",
];

// Diagnose example chips — mirrors hf_space/app.py::EXAMPLE_SYMPTOMS.
export const EXAMPLE_SYMPTOMS: string[] = [
  "gears skip when I pedal hard",
  "brakes squeal when I stop",
  "clicking noise from the pedals every rotation",
  "chain fell off when shifting to the big ring",
];

// Severity badge — mirrors hf_space/app.py::SEVERITY_BADGE.
export const SEVERITY_BADGE: Record<Severity, { emoji: string; label: string }> = {
  low: { emoji: "🟢", label: "low" },
  medium: { emoji: "🟡", label: "medium" },
  high: { emoji: "🔴", label: "high" },
};

// Path to the fixed demo bike used in Anatomy mode.
export const DEMO_BIKE_SRC = "/bike.png";
