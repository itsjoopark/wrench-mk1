# 002 — Add press feedback to pill buttons and primary CTAs

- **Status**: DONE
- **Commit**: 95c6e4b
- **Severity**: MEDIUM
- **Category**: Physicality & origin
- **Estimated scope**: 4 files, ~12 lines
- **Depends on**: 001 (uses `duration-press`, `ease-out-strong`)

## Problem

Every interactive pill and primary button in the tool lacks `:active` press feedback. These are hit tens of times per session (mode toggle, part pills, diagnose CTA, ask button). Current code only changes background on hover with `transition-colors` and no transform:

```tsx
/* components/ModeToggle.tsx:22-24 — current */
className={`rounded-full px-4 py-1.5 text-sm capitalize transition-colors ${
  active ? "bg-ink text-white" : "bg-pill text-pillText hover:bg-pill/80"
}`}
```

```tsx
/* components/AnatomyMode.tsx:253-255 — current */
className={`rounded-full px-3.5 py-1.5 text-sm transition-colors ${
  active ? "bg-ink text-white" : "bg-pill text-pillText hover:bg-pill/80"
} ${!has ? "cursor-not-allowed opacity-40" : ""}`}
```

```tsx
/* components/AnatomyMode.tsx:224 — current */
className="shrink-0 rounded-full bg-ink px-4 py-2 text-sm text-white disabled:opacity-60"
```

```tsx
/* components/DiagnoseMode.tsx:97 — current */
className="mt-5 w-full rounded-full bg-ink py-2.5 text-sm text-white disabled:opacity-60"
```

Pressable elements with no tactile response feel inert on tap/click.

## Target

Add subtle scale-down on `:active` using transform only (GPU-friendly), 160ms strong ease-out:

```tsx
/* target pattern for all pressable rounded-full buttons */
className="... transition-[transform,background-color] duration-press ease-out-strong active:scale-[0.97] motion-reduce:active:scale-100 ..."
```

Apply to:
- `components/ModeToggle.tsx` — both mode buttons
- `components/AnatomyMode.tsx` — part pill buttons (line ~253) and "Ask Mk1" button (line ~224)
- `components/DiagnoseMode.tsx` — "Diagnose" button (line ~97) and example symptom pills (line ~86)
- `components/AnatomyMode.tsx` — "Try another photo" CTA in error state (line ~157) if it uses `bg-ink`

Do NOT add press feedback to disabled buttons (`disabled:opacity-60` states should not scale).

## Repo conventions to follow

- Buttons use Tailwind `rounded-full`, `bg-ink` / `bg-pill` palette from `tailwind.config.ts`.
- Prefer extending existing `transition-colors` to `transition-[transform,background-color]` rather than `transition-all`.
- Use tokens from plan 001: `duration-press`, `ease-out-strong`.

## Steps

1. **`components/ModeToggle.tsx`**: Replace `transition-colors` with `transition-[transform,background-color] duration-press ease-out-strong active:scale-[0.97] motion-reduce:active:scale-100` on the button `className`.
2. **`components/AnatomyMode.tsx`**: Same transition/scale pattern on part pill buttons (~line 253) and "Ask Mk1" button (~line 224). Skip when `disabled` — Tailwind `disabled:active:scale-100` or ensure disabled buttons don't get `active:scale-[0.97]`.
3. **`components/DiagnoseMode.tsx`**: Same on "Diagnose" button (~line 97) and example symptom pills (~line 86).
4. **`components/AnatomyMode.tsx`**: Same on error-state "Try another photo" button (~line 157).

## Boundaries

- Do NOT change button markup, labels, or click handlers.
- Do NOT use `transition: all`.
- Do NOT add press feedback to text links (`underline` style buttons).
- If plan 001 tokens are missing, STOP and implement 001 first.

## Verification

- **Mechanical**: `npm run typecheck` and `npm run lint` pass.
- **Feel check**: Run `npm run dev`, open `/tool`:
  - Click and hold each pill — button should compress to ~97% scale and release smoothly on mouseup.
  - Rapidly click mode toggle — scale should retarget mid-press without restarting from zero (CSS transition interruptibility).
  - In DevTools Rendering panel, enable `prefers-reduced-motion: reduce` — press should have no scale, color changes may remain instant.
  - On a touch device (or mobile emulation), tap pills — feedback should feel immediate, not delayed.
- **Done when**: All four component locations have `active:scale-[0.97]` with transform-only transitions and reduced-motion override.
