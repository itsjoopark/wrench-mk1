"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { UploadIcon, RotateCcwIcon } from "lucide-react";
import Stage, { type StageHotspot } from "@/components/stage/Stage";
import Dock, { type Mode } from "@/components/dock/Dock";
import ResponsivePanel from "@/components/panel/ResponsivePanel";
import PartPanel from "@/components/panel/PartPanel";
import DiagnosisPanel from "@/components/panel/DiagnosisPanel";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { CURATED_PARTS, DEMO_BIKE_SRC } from "@/lib/constants";
import {
  askAboutPart,
  detectAnatomy,
  diagnose,
  fileToResizedDataUrl,
  urlToDataUrl,
} from "@/lib/api";
import type { AnatomyBoxes, Diagnosis, Part } from "@/lib/types";
import { springUI, fadeReduced } from "@/lib/motion";
import { sound } from "@/lib/sound";

// Find the detected box for a curated part (matches on lowercase mention).
function boxForPart(parts: Part[], match: string[]): Part | null {
  for (const m of match) {
    const hit = parts.find((p) => p.label.toLowerCase() === m);
    if (hit) return hit;
  }
  for (const m of match) {
    const hit = parts.find((p) => p.label.toLowerCase().includes(m));
    if (hit) return hit;
  }
  return null;
}

// Read intrinsic dimensions from an image source (data URL or path).
function imageDims(src: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () =>
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
    img.onerror = () => reject(new Error("Could not read the image."));
    img.src = src;
  });
}

export default function Home() {
  const reduced = useReducedMotion();

  // The shared photo everything operates on. Starts as the S-Works demo.
  const [src, setSrc] = useState(DEMO_BIKE_SRC);
  const [natural, setNatural] = useState<{ width: number; height: number } | null>(null);
  const [parts, setParts] = useState<Part[] | null>(null);
  const [detecting, setDetecting] = useState(false);
  const [stageError, setStageError] = useState("");

  const [mode, setMode] = useState<Mode>("explore");
  const [selected, setSelected] = useState<string | null>(null);
  const [panelOpen, setPanelOpen] = useState(false); // mobile sheet

  // Ask-about-part state
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [asking, setAsking] = useState(false);
  const [askError, setAskError] = useState("");

  // Diagnose state
  const [symptom, setSymptom] = useState("");
  const [dx, setDx] = useState<Diagnosis | null>(null);
  const [diagnosing, setDiagnosing] = useState(false);
  const [dxError, setDxError] = useState("");

  // Cache the data-URL form of the current photo for API calls.
  const apiImageRef = useRef<{ src: string; dataUrl: string } | null>(null);
  async function apiImage(): Promise<string> {
    if (src.startsWith("data:")) return src;
    if (apiImageRef.current?.src === src) return apiImageRef.current.dataUrl;
    const dataUrl = await urlToDataUrl(src);
    apiImageRef.current = { src, dataUrl };
    return dataUrl;
  }

  // The demo bike is precomputed — explorable instantly, no API call.
  useEffect(() => {
    fetch("/anatomy-boxes.json")
      .then((r) => r.json())
      .then((boxes: AnatomyBoxes) => {
        setParts(boxes.parts);
        setNatural({ width: boxes.width, height: boxes.height });
      })
      .catch(() => setStageError("Could not load the demo bike."));
  }, []);

  // Curated hotspots present in the current detection (fall back to the raw
  // detected labels when none of the curated parts matched).
  const hotspots = useMemo<StageHotspot[]>(() => {
    if (!parts) return [];
    const curated = CURATED_PARTS.flatMap((p) => {
      const box = boxForPart(parts, p.match);
      return box ? [{ label: p.label, box }] : [];
    });
    if (curated.length > 0) return curated;
    return parts.slice(0, 8).map((p) => ({ label: p.label, box: p }));
  }, [parts]);

  // Default-select the first available part whenever a new photo is labeled.
  useEffect(() => {
    if (hotspots.length === 0) {
      setSelected(null);
      return;
    }
    setSelected((cur) =>
      cur && hotspots.some((h) => h.label === cur) ? cur : hotspots[0].label
    );
  }, [hotspots]);

  const selectedBox = useMemo(
    () => hotspots.find((h) => h.label === selected)?.box ?? null,
    [hotspots, selected]
  );

  function handleSelect(label: string) {
    setSelected(label);
    setAnswer("");
    setAskError("");
    setPanelOpen(true);
  }

  function handleModeChange(m: Mode) {
    setMode(m);
    if (m === "explore") setPanelOpen(selected !== null && panelOpen);
  }

  async function handleUpload(file: File) {
    setStageError("");
    setDetecting(true);
    setParts(null);
    setSelected(null);
    setAnswer("");
    setDx(null);
    try {
      const dataUrl = await fileToResizedDataUrl(file);
      const dims = await imageDims(dataUrl);
      setSrc(dataUrl);
      setNatural(dims);
      const res = await detectAnatomy(dataUrl);
      setParts(res.parts);
      if (res.parts.length === 0) {
        setStageError(
          "No parts found — try a clearer side-profile photo with the drivetrain visible."
        );
        sound.error();
      } else {
        sound.success();
      }
    } catch (e) {
      setStageError(
        e instanceof Error ? e.message : "Could not detect parts."
      );
      sound.error();
    } finally {
      setDetecting(false);
    }
  }

  async function handleResetToDemo() {
    setStageError("");
    setSrc(DEMO_BIKE_SRC);
    setAnswer("");
    setDx(null);
    setDetecting(true);
    try {
      const boxes: AnatomyBoxes = await fetch("/anatomy-boxes.json").then((r) =>
        r.json()
      );
      setParts(boxes.parts);
      setNatural({ width: boxes.width, height: boxes.height });
    } catch {
      setStageError("Could not load the demo bike.");
    } finally {
      setDetecting(false);
    }
  }

  async function handleAsk() {
    if (!selected) return;
    setAskError("");
    setAsking(true);
    setAnswer("");
    sound.send();
    try {
      const curated = CURATED_PARTS.find((p) => p.label === selected);
      const partQuery = curated ? curated.match[0] : selected;
      const res = await askAboutPart(await apiImage(), partQuery, question);
      setAnswer(res.answer);
      sound.success();
    } catch (e) {
      setAskError(
        e instanceof Error ? e.message : "Something went wrong."
      );
      sound.error();
    } finally {
      setAsking(false);
    }
  }

  async function handleDiagnose() {
    if (!symptom.trim()) return;
    setDxError("");
    setDiagnosing(true);
    setDx(null);
    setPanelOpen(true);
    sound.send();
    try {
      setDx(await diagnose(await apiImage(), symptom.trim()));
      sound.success();
    } catch (e) {
      setDxError(
        e instanceof Error ? e.message : "Something went wrong."
      );
      sound.error();
    } finally {
      setDiagnosing(false);
    }
  }

  const fileRef = useRef<HTMLInputElement>(null);
  const isDemo = src === DEMO_BIKE_SRC;

  const panelContent = (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={mode}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={fadeReduced}
      >
        {mode === "explore" ? (
          <PartPanel
            src={src}
            natural={natural}
            hotspots={hotspots}
            selected={selected}
            selectedBox={selectedBox}
            onSelect={handleSelect}
            question={question}
            onQuestionChange={setQuestion}
            answer={answer}
            asking={asking}
            error={askError}
            onAsk={handleAsk}
          />
        ) : (
          <DiagnosisPanel dx={dx} loading={diagnosing} error={dxError} />
        )}
      </motion.div>
    </AnimatePresence>
  );

  return (
    <div className="min-h-dvh bg-canvas">
      {/* Translucent header — content sits underneath */}
      <header className="glass fixed inset-x-0 top-0 z-40 border-x-0 border-t-0">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-3 sm:px-8">
          <div>
            <h1 className="text-lg font-semibold tracking-tight text-ink">
              Wrench
            </h1>
            <p className="text-[11px] leading-none text-black/45">
              Powered by Mk1
            </p>
          </div>
          <div className="flex items-center gap-2">
            <a
              href="https://github.com/itsjoopark/wrench-mk1"
              target="_blank"
              rel="noreferrer"
              aria-label="View on GitHub"
              onPointerDown={() => sound.tap()}
              className={cn(
                buttonVariants({ variant: "ghost", size: "icon" }),
                "rounded-2xl text-black/45"
              )}
            >
              <svg
                aria-hidden
                viewBox="0 0 24 24"
                fill="currentColor"
                className="size-4"
              >
                <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z" />
              </svg>
            </a>
            {!isDemo && (
              <Button
                variant="ghost"
                onPointerDown={() => sound.tap()}
                onClick={handleResetToDemo}
                className="rounded-2xl"
              >
                <RotateCcwIcon data-icon="inline-start" />
                Demo bike
              </Button>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-5 pb-44 pt-24 sm:px-8 sm:pt-28">
        {/* Headline */}
        <motion.div
          initial={reduced ? { opacity: 0 } : { opacity: 0, y: 10 }}
          animate={reduced ? { opacity: 1 } : { opacity: 1, y: 0 }}
          transition={reduced ? fadeReduced : springUI}
          className="mb-8"
        >
          <h2 className="text-display text-ink">Your bike, understood.</h2>
          <p className="mt-2 max-w-md text-sm leading-relaxed text-black/50 sm:text-base">
            Tap any part to explore it, or describe a symptom to get a
            step-by-step repair plan — grounded in this exact photo.
          </p>
        </motion.div>

        <div className="grid items-start gap-8 lg:grid-cols-[1fr_360px]">
          <section>
            <Stage
              src={src}
              natural={natural}
              hotspots={hotspots}
              selected={selected}
              selectedBox={selectedBox}
              detecting={detecting}
              showHotspots={mode === "explore"}
              onSelect={handleSelect}
            />
            <div className="mt-3 flex items-center gap-2">
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleUpload(f);
                  e.target.value = "";
                }}
              />
              <Button
                variant="outline"
                onPointerDown={() => sound.tap()}
                onClick={() => fileRef.current?.click()}
                className="rounded-2xl bg-white/60"
              >
                <UploadIcon data-icon="inline-start" />
                Your bike
              </Button>
            </div>
            {detecting && (
              <p className="mt-3 text-center text-sm text-black/45">
                Mk1 is labeling your bike…
              </p>
            )}
            {stageError && (
              <div className="mt-3 flex items-center justify-center gap-3">
                <p className="text-sm text-red-600">{stageError}</p>
                {!isDemo && (
                  <button
                    type="button"
                    onClick={handleResetToDemo}
                    className="text-sm text-black/50 underline underline-offset-2 [@media(hover:hover)_and_(pointer:fine)]:hover:text-black/70"
                  >
                    Use the demo bike
                  </button>
                )}
              </div>
            )}
          </section>

          <ResponsivePanel
            open={panelOpen}
            onOpenChange={setPanelOpen}
            title={mode === "explore" ? "Part details" : "Repair plan"}
          >
            {panelContent}
          </ResponsivePanel>
        </div>

      </main>

      {/* Quiet footer — pinned to the viewport bottom, fading content under it.
          Hidden on mobile where the dock owns the bottom edge. */}
      <footer className="pointer-events-none fixed inset-x-0 bottom-0 z-30 hidden bg-gradient-to-t from-canvas via-canvas/85 to-transparent pb-3 pt-8 sm:block">
        <div className="pointer-events-auto mx-auto flex max-w-6xl items-center justify-between px-5 text-xs text-black/40 sm:px-8">
          <span>
            Powered by Perceptron&rsquo;s Mk1 VLM &middot;{" "}
            <a
              href="https://docs.perceptron.inc"
              target="_blank"
              rel="noreferrer"
              className="underline underline-offset-2 [@media(hover:hover)_and_(pointer:fine)]:hover:text-black/60"
            >
              API
            </a>{" "}
            &middot;{" "}
            <a
              href="https://huggingface.co"
              target="_blank"
              rel="noreferrer"
              className="underline underline-offset-2 [@media(hover:hover)_and_(pointer:fine)]:hover:text-black/60"
            >
              Huggingface
            </a>
          </span>
          <span>
            Open-source &middot; made with care by{" "}
            <a
              href="https://github.com/itsjoopark"
              target="_blank"
              rel="noreferrer"
              className="underline underline-offset-2 [@media(hover:hover)_and_(pointer:fine)]:hover:text-black/60"
            >
              @itsjulespark
            </a>
          </span>
        </div>
      </footer>

      {/* Floating dock */}
      <div className="fixed bottom-5 left-1/2 z-40 -translate-x-1/2 sm:bottom-16">
        <motion.div
          initial={reduced ? { opacity: 0 } : { opacity: 0, y: 24 }}
          animate={reduced ? { opacity: 1 } : { opacity: 1, y: 0 }}
          transition={reduced ? fadeReduced : { ...springUI, delay: 0.15 }}
        >
          <Dock
            mode={mode}
            onModeChange={handleModeChange}
            symptom={symptom}
            onSymptomChange={setSymptom}
            onDiagnose={handleDiagnose}
            diagnosing={diagnosing}
          />
        </motion.div>
      </div>
    </div>
  );
}
