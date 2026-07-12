"use client";

import { useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import type { Diagnosis, Severity } from "@/lib/types";
import { springUI, fadeReduced } from "@/lib/motion";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

const SEVERITY_DOT: Record<Severity, string> = {
  low: "bg-emerald-500",
  medium: "bg-amber-500",
  high: "bg-red-500",
};

export default function DiagnosisPanel({
  dx,
  loading,
  error,
}: {
  dx: Diagnosis | null;
  loading: boolean;
  error: string;
}) {
  const reduced = useReducedMotion();
  const [showJson, setShowJson] = useState(false);

  if (loading) {
    return (
      <div className="flex flex-col gap-4" aria-busy>
        <Skeleton className="h-7 w-3/4 rounded-xl" />
        <div className="flex gap-2">
          <Skeleton className="h-5 w-20 rounded-full" />
          <Skeleton className="h-5 w-24 rounded-full" />
          <Skeleton className="h-5 w-16 rounded-full" />
        </div>
        <Skeleton className="h-4 w-full rounded-lg" />
        <Skeleton className="h-4 w-5/6 rounded-lg" />
        <Skeleton className="h-24 w-full rounded-2xl" />
        <p className="text-sm text-black/45">
          Mk1 is inspecting your bike…
        </p>
      </div>
    );
  }

  if (error) {
    return <p className="text-sm text-red-600">{error}</p>;
  }

  if (!dx) {
    return (
      <div className="flex min-h-[200px] flex-col items-center justify-center gap-1 text-center">
        <p className="text-sm font-medium text-black/55">
          Describe a symptom below
        </p>
        <p className="text-sm text-black/40">
          Your step-by-step repair plan will appear here.
        </p>
      </div>
    );
  }

  return (
    <motion.div
      key={dx.likely_cause}
      initial={reduced ? { opacity: 0 } : { opacity: 0, y: 12 }}
      animate={reduced ? { opacity: 1 } : { opacity: 1, y: 0 }}
      transition={reduced ? fadeReduced : springUI}
      className="flex flex-col gap-4"
    >
      <h2 className="text-xl font-semibold leading-snug tracking-tight text-ink">
        {dx.likely_cause}
      </h2>

      <div className="flex flex-wrap items-center gap-1.5">
        <Badge variant="secondary" className="gap-1.5">
          <span
            className={`h-1.5 w-1.5 rounded-full ${SEVERITY_DOT[dx.severity]}`}
          />
          {dx.severity} severity
        </Badge>
        <Badge variant="secondary">{dx.difficulty}</Badge>
        <Badge variant="secondary">~{dx.estimated_time_min} min</Badge>
      </div>

      {dx.affected_parts.length > 0 && (
        <p className="text-sm text-black/60">
          <span className="text-black/40">Parts: </span>
          {dx.affected_parts.join(", ")}
        </p>
      )}
      <p className="text-sm text-black/60">
        <span className="text-black/40">Tools: </span>
        {dx.tools_needed.length ? dx.tools_needed.join(", ") : "none"}
      </p>

      <div>
        <h3 className="text-xs font-medium uppercase tracking-wide text-black/45">
          Repair steps
        </h3>
        <ol className="mt-2.5 space-y-3">
          {dx.steps.map((s, i) => (
            <motion.li
              key={s.order}
              initial={reduced ? { opacity: 0 } : { opacity: 0, y: 8 }}
              animate={reduced ? { opacity: 1 } : { opacity: 1, y: 0 }}
              transition={
                reduced ? fadeReduced : { ...springUI, delay: 0.05 + i * 0.05 }
              }
              className="flex gap-3 text-sm"
            >
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-ink text-[11px] font-medium text-white">
                {s.order}
              </span>
              <span className="leading-relaxed text-ink">
                {s.instruction}
                {s.caution && (
                  <span className="mt-1 block text-amber-700">
                    Caution: {s.caution}
                  </span>
                )}
              </span>
            </motion.li>
          ))}
        </ol>
      </div>

      <div>
        <button
          type="button"
          onClick={() => setShowJson((v) => !v)}
          className="text-xs text-black/45 underline underline-offset-2 transition-colors [@media(hover:hover)_and_(pointer:fine)]:hover:text-black/70"
        >
          {showJson ? "Hide" : "Show"} raw JSON (constrained decoding — always
          valid)
        </button>
        <AnimatePresence initial={false}>
          {showJson && (
            <motion.pre
              initial={reduced ? { opacity: 0 } : { height: 0, opacity: 0 }}
              animate={
                reduced ? { opacity: 1 } : { height: "auto", opacity: 1 }
              }
              exit={reduced ? { opacity: 0 } : { height: 0, opacity: 0 }}
              transition={reduced ? fadeReduced : springUI}
              className="mt-2 max-h-64 overflow-auto rounded-2xl bg-black/[0.04] p-3 font-mono text-xs text-black/70"
            >
              {JSON.stringify(dx, null, 2)}
            </motion.pre>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
