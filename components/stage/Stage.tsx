"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import type { Part } from "@/lib/types";
import { springUI, fadeReduced } from "@/lib/motion";
import Hotspot from "@/components/stage/Hotspot";

export interface StageHotspot {
  label: string;
  box: Part;
}

// The single shared surface of the app: the bike photo, its part hotspots,
// and the spotlight over the selected part. Everything else (dock, panel)
// floats around this. Only opacity/transform animate — the spotlight uses
// Motion's layout FLIP so position changes run as transforms.
export default function Stage({
  src,
  natural,
  hotspots,
  selected,
  selectedBox,
  detecting,
  showHotspots,
  onSelect,
}: {
  src: string;
  natural: { width: number; height: number } | null;
  hotspots: StageHotspot[];
  selected: string | null;
  selectedBox: Part | null;
  detecting: boolean;
  showHotspots: boolean;
  onSelect: (label: string) => void;
}) {
  const reduced = useReducedMotion();
  const spring = reduced ? fadeReduced : springUI;

  const pct = (v: number, total: number) => (v / total) * 100;

  return (
    <div className="relative w-full overflow-hidden rounded-3xl bg-black/[0.03]">
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.img
          key={src}
          src={src}
          alt="Bike on the stage"
          draggable={false}
          initial={
            reduced ? { opacity: 0 } : { opacity: 0, scale: 0.97 }
          }
          animate={{
            opacity: detecting ? 0.55 : 1,
            ...(reduced ? {} : { scale: 1 }),
          }}
          exit={{ opacity: 0 }}
          transition={spring}
          className="block h-auto w-full select-none"
        />
      </AnimatePresence>

      {/* Detection sweep while Mk1 labels a new photo */}
      {detecting && (
        <div className="pointer-events-none absolute inset-0 overflow-hidden motion-reduce:hidden">
          <div className="absolute inset-y-0 left-0 w-full animate-[stage-sweep_1.4s_var(--ease-in-out)_infinite] bg-gradient-to-r from-transparent via-white/60 to-transparent" />
        </div>
      )}

      {/* Spotlight over the selected part — dims the rest of the photo */}
      {showHotspots && !detecting && selectedBox && natural && (
        <motion.div
          layout
          transition={spring}
          style={{
            left: `${pct(selectedBox.x1, natural.width)}%`,
            top: `${pct(selectedBox.y1, natural.height)}%`,
            width: `${pct(selectedBox.x2 - selectedBox.x1, natural.width)}%`,
            height: `${pct(selectedBox.y2 - selectedBox.y1, natural.height)}%`,
            borderRadius: 12,
          }}
          className="pointer-events-none absolute border-2 border-white/90 shadow-[0_0_0_9999px_rgba(17,17,17,0.22)]"
        />
      )}

      {/* Part hotspots */}
      {showHotspots && !detecting && natural && (
        <AnimatePresence>
          {hotspots.map((h, i) => (
            <Hotspot
              key={h.label}
              label={h.label}
              x={pct((h.box.x1 + h.box.x2) / 2, natural.width)}
              y={pct((h.box.y1 + h.box.y2) / 2, natural.height)}
              active={selected === h.label}
              index={i}
              onSelect={onSelect}
            />
          ))}
        </AnimatePresence>
      )}
    </div>
  );
}
