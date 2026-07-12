import type { Transition } from "motion/react";

// Apple-style spring defaults (apple-design skill): critically damped for UI
// chrome, no overshoot. Bounce is reserved for gesture-driven moments.
export const springUI: Transition = { type: "spring", bounce: 0, duration: 0.4 };
export const springQuick: Transition = { type: "spring", bounce: 0, duration: 0.3 };

// Reduced-motion equivalent: a short cross-fade, no movement.
export const fadeReduced: Transition = { duration: 0.2, ease: "easeOut" };
