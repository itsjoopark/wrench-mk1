"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { springQuick, fadeReduced } from "@/lib/motion";
import { sound } from "@/lib/sound";

// A part marker anchored to a point on the bike photo. The outer div owns
// positioning/centering; the inner motion.button owns scale/opacity so
// Motion's transform doesn't fight the centering translate.
export default function Hotspot({
  label,
  x,
  y,
  active,
  index,
  onSelect,
}: {
  label: string;
  /** Center of the part box, in percent of the stage. */
  x: number;
  y: number;
  active: boolean;
  index: number;
  onSelect: (label: string) => void;
}) {
  const reduced = useReducedMotion();

  return (
    <div
      className="absolute z-10 -translate-x-1/2 -translate-y-1/2"
      style={{ left: `${x}%`, top: `${y}%` }}
    >
      <motion.button
        type="button"
        aria-label={`Select ${label}`}
        aria-pressed={active}
        initial={reduced ? { opacity: 0 } : { opacity: 0, scale: 0.5 }}
        animate={reduced ? { opacity: 1 } : { opacity: 1, scale: 1 }}
        transition={
          reduced ? fadeReduced : { ...springQuick, delay: index * 0.04 }
        }
        whileTap={reduced ? undefined : { scale: 0.85 }}
        onPointerDown={() => {
          if (!active) sound.tap();
          onSelect(label);
        }}
        onClick={() => onSelect(label)}
        className={`flex h-7 w-7 cursor-pointer items-center justify-center rounded-full transition-colors duration-ui ease-out-strong ${
          active ? "bg-ink" : "glass"
        }`}
      >
        <span
          className={`h-2 w-2 rounded-full transition-colors duration-ui ${
            active ? "bg-white" : "bg-ink/80"
          }`}
        />
      </motion.button>

      <AnimatePresence>
        {active && (
          <motion.span
            initial={reduced ? { opacity: 0 } : { opacity: 0, y: -4 }}
            animate={reduced ? { opacity: 1 } : { opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={reduced ? fadeReduced : springQuick}
            className="glass pointer-events-none absolute left-1/2 top-full mt-2 -translate-x-1/2 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium text-ink"
          >
            {label}
          </motion.span>
        )}
      </AnimatePresence>
    </div>
  );
}
