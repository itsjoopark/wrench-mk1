"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import type { Part } from "@/lib/types";
import type { StageHotspot } from "@/components/stage/Stage";
import { CURATED_PARTS } from "@/lib/constants";
import { fadeReduced } from "@/lib/motion";
import { sound } from "@/lib/sound";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

// Square close-up of the selected part. Same resolution-independent crop math
// as the original CloseUp: a scaled absolute <img> inside an overflow-hidden
// square. The image crossfades (with a light blur mask) when the box changes.
function CloseUpCrop({
  src,
  box,
  natural,
}: {
  src: string;
  box: Part | null;
  natural: { width: number; height: number } | null;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [side, setSide] = useState(0);
  const reduced = useReducedMotion();

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => setSide(el.clientWidth);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  let imgStyle: React.CSSProperties | undefined;
  if (box && natural && side) {
    const bw = box.x2 - box.x1;
    const bh = box.y2 - box.y1;
    const pad = 1.25; // breathing room around the part
    const scale = side / (Math.max(bw, bh) * pad);
    const cx = (box.x1 + box.x2) / 2;
    const cy = (box.y1 + box.y2) / 2;
    imgStyle = {
      position: "absolute",
      width: natural.width * scale,
      height: natural.height * scale,
      left: side / 2 - cx * scale,
      top: side / 2 - cy * scale,
      maxWidth: "none",
    };
  }

  return (
    <div
      ref={ref}
      className="relative aspect-square w-full overflow-hidden rounded-2xl bg-black/[0.05]"
    >
      <AnimatePresence initial={false}>
        {box && natural && imgStyle ? (
          <motion.img
            key={`${box.x1}-${box.y1}-${box.x2}-${box.y2}`}
            src={src}
            alt="Close up of selected part"
            draggable={false}
            style={imgStyle}
            initial={
              reduced
                ? { opacity: 0 }
                : { opacity: 0, filter: "blur(6px)" }
            }
            animate={
              reduced
                ? { opacity: 1 }
                : { opacity: 1, filter: "blur(0px)" }
            }
            exit={{ opacity: 0 }}
            transition={
              reduced ? fadeReduced : { duration: 0.25, ease: [0.23, 1, 0.32, 1] }
            }
            className="select-none"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-black/35">
            Select a part on the bike
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function PartPanel({
  src,
  natural,
  hotspots,
  selected,
  selectedBox,
  onSelect,
  question,
  onQuestionChange,
  answer,
  asking,
  error,
  onAsk,
}: {
  src: string;
  natural: { width: number; height: number } | null;
  hotspots: StageHotspot[];
  selected: string | null;
  selectedBox: Part | null;
  onSelect: (label: string) => void;
  question: string;
  onQuestionChange: (q: string) => void;
  answer: string;
  asking: boolean;
  error: string;
  onAsk: () => void;
}) {
  const reduced = useReducedMotion();
  const curated = CURATED_PARTS.find((p) => p.label === selected);
  const available = new Set(hotspots.map((h) => h.label));

  return (
    <div className="flex flex-col gap-4">
      <CloseUpCrop src={src} box={selectedBox} natural={natural} />

      {/* Part name + description crossfade together on selection change */}
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={selected ?? "none"}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={fadeReduced}
        >
          <h2 className="text-xl font-semibold tracking-tight text-ink">
            {selected ?? "Explore the bike"}
          </h2>
          <p className="mt-1 text-sm leading-relaxed text-black/55">
            {curated?.description ??
              "Tap a hotspot on the photo or pick a part below."}
          </p>
        </motion.div>
      </AnimatePresence>

      {/* Curated part pills */}
      <div className="flex flex-wrap gap-1.5">
        {CURATED_PARTS.map((p) => {
          const has = available.has(p.label);
          const active = p.label === selected;
          return (
            <button
              key={p.label}
              type="button"
              disabled={!has}
              onPointerDown={() => {
                if (has && !active) sound.tap();
              }}
              onClick={() => onSelect(p.label)}
              className={`rounded-full px-3 py-1.5 text-xs font-medium transition-[transform,background-color,color] duration-press ease-out-strong active:scale-[0.97] motion-reduce:active:scale-100 disabled:active:scale-100 ${
                active
                  ? "bg-ink text-white"
                  : "bg-black/[0.05] text-black/60 [@media(hover:hover)_and_(pointer:fine)]:hover:bg-black/[0.09]"
              } ${!has ? "cursor-not-allowed opacity-35" : ""}`}
            >
              {p.label}
            </button>
          );
        })}
      </div>

      {/* Ask Mk1 about the selected part */}
      <form
        className="flex items-center gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (!asking) onAsk();
        }}
      >
        <Input
          value={question}
          onChange={(e) => onQuestionChange(e.target.value)}
          placeholder="What does this part do?"
          className="h-9 flex-1 bg-black/[0.05]"
        />
        <Button
          type="submit"
          disabled={asking || !selected}
          className="h-9 rounded-2xl px-4"
        >
          {asking ? "Asking…" : "Ask Mk1"}
        </Button>
      </form>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <AnimatePresence>
        {answer && (
          <motion.p
            initial={reduced ? { opacity: 0 } : { opacity: 0, y: 6 }}
            animate={reduced ? { opacity: 1 } : { opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={fadeReduced}
            className="rounded-2xl bg-black/[0.04] p-4 text-sm leading-relaxed text-ink"
          >
            {answer}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}
