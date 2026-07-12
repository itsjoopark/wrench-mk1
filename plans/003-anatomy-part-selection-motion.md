# 003 — Animate anatomy part selection (overlay + close-up)

- **Status**: DONE
- **Commit**: 95c6e4b
- **Severity**: HIGH
- **Category**: Missed opportunities / Physicality
- **Estimated scope**: 2 files, ~40 lines
- **Depends on**: 001

## Problem

Selecting a bike part is the core anatomy interaction and happens tens of times per session. Two spatial UI elements teleport on every selection with zero motion:

**1. Bounding box overlay** — jumps instantly when `selectedBox` changes:

```tsx
/* components/AnatomyMode.tsx:184-192 — current */
<div
  className="pointer-events-none absolute rounded-md border-2 border-ink/70"
  style={{
    left: `${(selectedBox.x1 / natural.width) * 100}%`,
    top: `${(selectedBox.y1 / natural.height) * 100}%`,
    width: `${((selectedBox.x2 - selectedBox.x1) / natural.width) * 100}%`,
    height: `${((selectedBox.y2 - selectedBox.y1) / natural.height) * 100}%`,
  }}
/>
```

Animating `left`/`top`/`width`/`height` would trigger layout — unacceptable per performance rules.

**2. Close-up crop** — `CloseUp` recalculates absolute `left`/`top`/`width`/`height` on the `<img>` with no transition (`components/CloseUp.tsx:39-46`), so the crop snaps.

## Target

Use **opacity crossfade** for both elements — prevents jarring teleports without animating layout properties. Duration 200ms, strong ease-out.

### Overlay (AnatomyMode)

Wrap the overlay in a keyed container that fades in on part change. Use React `key={selected}` on a wrapper so the old overlay fades out and new fades in (or single overlay with opacity pulse on `selected` change via CSS transition on `opacity` only).

Preferred approach — single overlay, opacity transition on selection change:

```tsx
<div
  key={selected}
  className="pointer-events-none absolute rounded-md border-2 border-ink/70 transition-opacity duration-ui ease-out-strong motion-reduce:transition-none"
  style={{ /* same percentage positioning */ }}
/>
```

Using `key={selected}` remounts the element; pair with `@starting-style` or a mount fade. Simpler executor path: add `animate-in` via CSS — on mount, start at `opacity: 0` and transition to `opacity: 1` using a `data-selected` attribute set in `useEffect` after mount, OR use two-frame approach:

```tsx
/* Simpler: opacity flash on selected change */
const [visible, setVisible] = useState(true);
useEffect(() => {
  setVisible(false);
  const id = requestAnimationFrame(() => setVisible(true));
  return () => cancelAnimationFrame(id);
}, [selected]);
// className includes: transition-opacity duration-ui ease-out-strong
// style={{ ...position, opacity: visible ? 1 : 0.4 }}
```

Actually the cleanest approach matching AUDIT.md: brief opacity transition (200ms ease-out) when `selected` changes — overlay dims to 0.4 then back to 1, OR crossfade by keying overlay with opacity 0→1 on mount.

**Executor instruction — use this exact pattern:**

```tsx
<div
  key={selected ?? "none"}
  className="pointer-events-none absolute rounded-md border-2 border-ink/70 opacity-0 animate-[fade-in_200ms_var(--ease-out)_forwards] motion-reduce:animate-none motion-reduce:opacity-100"
  style={{ /* unchanged percentage positioning */ }}
/>
```

Add to `app/globals.css`:

```css
@keyframes fade-in {
  from { opacity: 0; }
  to { opacity: 1; }
}
```

Note: keyframes on selection change are acceptable here because part selection is occasional (not toast-stacking frequency) and the element remounts per `key` — each selection is a fresh one-shot entrance, not rapid retrigger on the same element.

### Close-up (CloseUp)

Crossfade the crop image on `box` change:

```tsx
/* components/CloseUp.tsx — target */
<img
  key={`${box.x1}-${box.y1}-${box.x2}-${box.y2}`}
  src={src}
  alt="Close up of selected part"
  style={imgStyle}
  className="opacity-0 animate-[fade-in_200ms_var(--ease-out)_forwards] motion-reduce:animate-none motion-reduce:opacity-100"
  draggable={false}
/>
```

Reuse the same `fade-in` keyframe from globals.css.

## Repo conventions to follow

- Positioning math in `AnatomyMode.tsx` and `CloseUp.tsx` stays unchanged — motion is opacity only.
- Tokens from `app/globals.css` (`--ease-out`, `duration-ui` from plan 001).
- `motion-reduce:` Tailwind variant respects global reduced-motion from plan 001.

## Steps

1. In `app/globals.css`, add `@keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }` after the reduced-motion block (or inside `@layer utilities`).
2. In `components/AnatomyMode.tsx`, add `key={selected ?? "none"}` to the overlay `<div>` and apply fade-in animation classes. Keep inline `style` positioning exactly as-is.
3. In `components/CloseUp.tsx`, add a stable `key` derived from box coordinates to the `<img>` and the same fade-in classes.
4. Ensure `motion-reduce:animate-none motion-reduce:opacity-100` on both so reduced-motion users see instant swaps with no movement.

## Boundaries

- Do NOT animate `left`, `top`, `width`, `height`, or `margin`.
- Do NOT add Framer Motion or new dependencies.
- Do NOT change box detection, `selected` state logic, or CloseUp scale math.
- If positioning code has drifted since commit `95c6e4b`, STOP and report.

## Verification

- **Mechanical**: `npm run typecheck` and `npm run lint` pass.
- **Feel check**: Run `npm run dev`, `/tool` → Anatomy → "Or try the demo bike":
  - Click through part pills rapidly — each selection should briefly fade the overlay and close-up (not snap). Spamming pills should not cause visible stutter or layout jank.
  - In DevTools Animations panel, slow to 10% — confirm only `opacity` animates, not position/size.
  - Enable `prefers-reduced-motion: reduce` — selections should snap instantly with full opacity.
- **Done when**: Overlay and close-up both use opacity-only 200ms `ease-out` entrance on part change, with reduced-motion bypass.
