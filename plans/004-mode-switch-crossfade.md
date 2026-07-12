# 004 — Crossfade anatomy/diagnose mode switch

- **Status**: DONE
- **Commit**: 95c6e4b
- **Severity**: MEDIUM
- **Category**: Missed opportunities / Purpose & frequency
- **Estimated scope**: 1 file, ~20 lines
- **Depends on**: 001

## Problem

Toggling between Anatomy and Diagnose modes (`components/ModeToggle.tsx`) instantly swaps entire page bodies with a hard conditional render — no spatial or opacity continuity:

```tsx
/* app/tool/page.tsx:31-33 — current */
<div className="flex-1">
  {mode === "anatomy" ? <AnatomyMode /> : <DiagnoseMode />}
</div>
```

The subtitle text above also snaps (`app/tool/page.tsx:23-27`). Mode toggle is tens of times per session — animation must be brief (≤200ms) and opacity-only, not a sliding panel.

## Target

Wrap the mode body in a crossfade container. On `mode` change, fade out → swap → fade in, or use a simpler CSS approach: key the wrapper and fade in the incoming mode.

```tsx
/* app/tool/page.tsx — target body */
<div className="flex-1">
  <div
    key={mode}
    className="animate-[fade-in_200ms_var(--ease-out)_forwards] opacity-0 motion-reduce:animate-none motion-reduce:opacity-100"
  >
    {mode === "anatomy" ? <AnatomyMode /> : <DiagnoseMode />}
  </div>
</div>
```

Reuse `fade-in` keyframe from plan 003 / `app/globals.css`.

Subtitle — add matching brief transition:

```tsx
<p
  key={mode}
  className="mt-3 max-w-xs text-sm text-black/50 animate-[fade-in_200ms_var(--ease-out)_forwards] opacity-0 motion-reduce:animate-none motion-reduce:opacity-100"
>
```

Frequency note: 200ms opacity entrance on mode switch is acceptable (occasional navigation between two views, not keyboard-shortcut frequency). Do NOT add slide/transform — keep it crisp for a tool UI.

## Repo conventions to follow

- `app/tool/page.tsx` is a client component (`"use client"`).
- Mode state: `useState<Mode>("anatomy")` at line 10 — do not change.
- Use `fade-in` keyframe and `--ease-out` from plan 001/003.

## Steps

1. Confirm `fade-in` keyframe exists in `app/globals.css` (from plan 003). If not, add it.
2. In `app/tool/page.tsx`, wrap the `{mode === "anatomy" ? ...}` block in a `<div key={mode}>` with fade-in animation classes.
3. Add `key={mode}` and the same fade-in classes to the subtitle `<p>` (~line 23).
4. Do NOT animate the `ModeToggle` itself — pills already get press feedback from plan 002.

## Boundaries

- Do NOT change `ModeToggle` or mode state logic.
- Do NOT add exit animations (mount-only fade-in is sufficient for this scope).
- Do NOT use `transition: all` or animate layout properties.
- Do NOT exceed 200ms duration.

## Verification

- **Mechanical**: `npm run typecheck` and `npm run lint` pass.
- **Feel check**: `/tool` → toggle Anatomy ↔ Diagnose several times:
  - Incoming content should fade in over ~200ms, not pop in.
  - Toggle should remain snappy — no sluggish ease-in delay before content appears.
  - `prefers-reduced-motion: reduce` → instant swap, no fade.
- **Done when**: Mode body and subtitle both fade in on mode change with opacity-only 200ms ease-out.
