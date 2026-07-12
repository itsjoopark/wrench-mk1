"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { EXAMPLE_SYMPTOMS } from "@/lib/constants";
import { springUI, springQuick, fadeReduced } from "@/lib/motion";
import { sound } from "@/lib/sound";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export type Mode = "explore" | "diagnose";

// Floating glass dock: the app's single mode control. In Diagnose mode it
// grows upward into the symptom composer — the input belongs to the dock
// spatially, so it returns there when the mode switches back.
export default function Dock({
  mode,
  onModeChange,
  symptom,
  onSymptomChange,
  onDiagnose,
  diagnosing,
}: {
  mode: Mode;
  onModeChange: (m: Mode) => void;
  symptom: string;
  onSymptomChange: (s: string) => void;
  onDiagnose: () => void;
  diagnosing: boolean;
}) {
  const reduced = useReducedMotion();

  return (
    <div className="glass-heavy w-[min(92vw,560px)] rounded-3xl p-2">
      <AnimatePresence initial={false}>
        {mode === "diagnose" && (
          <motion.div
            key="composer"
            initial={reduced ? { opacity: 0 } : { height: 0, opacity: 0 }}
            animate={
              reduced ? { opacity: 1 } : { height: "auto", opacity: 1 }
            }
            exit={reduced ? { opacity: 0 } : { height: 0, opacity: 0 }}
            transition={reduced ? fadeReduced : springUI}
            className="overflow-hidden"
          >
            <div className="flex flex-col gap-2.5 px-2 pb-3 pt-2">
              <div className="flex flex-wrap gap-1.5">
                {EXAMPLE_SYMPTOMS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onPointerDown={() => sound.tap()}
                    onClick={() => onSymptomChange(s)}
                    className="rounded-full bg-black/[0.05] px-3 py-1 text-xs text-black/60 transition-[transform,background-color] duration-press ease-out-strong active:scale-[0.97] motion-reduce:active:scale-100 [@media(hover:hover)_and_(pointer:fine)]:hover:bg-black/[0.09]"
                  >
                    {s}
                  </button>
                ))}
              </div>
              <form
                className="flex items-center gap-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!diagnosing) onDiagnose();
                }}
              >
                <Input
                  value={symptom}
                  onChange={(e) => onSymptomChange(e.target.value)}
                  placeholder="What's wrong with your bike?"
                  className="h-9 flex-1 bg-black/[0.05]"
                />
                <Button
                  type="submit"
                  disabled={diagnosing || !symptom.trim()}
                  className="h-9 rounded-2xl px-4"
                >
                  {diagnosing ? "Inspecting…" : "Diagnose"}
                </Button>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Segmented mode control with a sliding active pill */}
      <div className="relative flex rounded-2xl bg-black/[0.04] p-1">
        {(["explore", "diagnose"] as Mode[]).map((m) => {
          const active = mode === m;
          return (
            <button
              key={m}
              type="button"
              aria-pressed={active}
              onPointerDown={() => {
                // Pitch follows the pill's direction of travel (explore ↔ diagnose).
                if (!active) sound.toggle(m === "diagnose" ? "up" : "down");
              }}
              onClick={() => onModeChange(m)}
              className="relative flex-1 rounded-xl px-6 py-2 text-sm font-medium capitalize transition-transform duration-press ease-out-strong active:scale-[0.98] motion-reduce:active:scale-100"
            >
              {active && (
                <motion.span
                  layoutId="dock-active-pill"
                  transition={reduced ? { duration: 0 } : springQuick}
                  className="absolute inset-0 rounded-xl bg-ink"
                />
              )}
              <span
                className={`relative z-10 transition-colors duration-ui ${
                  active ? "text-white" : "text-black/55"
                }`}
              >
                {m}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
