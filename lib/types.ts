// TypeScript mirror of wrench/schema.py — the exact JSON contract the Python
// /api functions return. Keep in sync with wrench/schema.py::Diagnosis.

export type Severity = "low" | "medium" | "high";
export type Difficulty = "beginner" | "intermediate" | "advanced";

export interface RepairStep {
  order: number;
  instruction: string;
  part?: string | null;
  caution?: string | null;
}

export interface Diagnosis {
  symptom: string;
  likely_cause: string;
  affected_parts: string[];
  severity: Severity;
  difficulty: Difficulty;
  tools_needed: string[];
  estimated_time_min: number;
  steps: RepairStep[];
}

// A detected part in pixel coordinates of the ORIGINAL image (as returned by
// wrench/anatomy.py::Part after boxes_to_pixels).
export interface Part {
  label: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

// Shape of public/anatomy-boxes.json (precomputed for the demo bike).
export interface AnatomyBoxes {
  // Natural pixel dimensions of the image the boxes were computed against.
  width: number;
  height: number;
  parts: Part[];
  raw_text?: string;
}

// /api/anatomy response
export interface AnatomyResponse {
  parts: Part[];
  raw_text: string;
}

// /api/ask response
export interface AskResponse {
  answer: string;
}
