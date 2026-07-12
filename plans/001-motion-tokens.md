# 001 — Add shared motion tokens

- **Status**: DONE
- **Commit**: 95c6e4b
- **Severity**: MEDIUM
- **Category**: Cohesion & tokens
- **Estimated scope**: 2 files, ~25 lines

## Problem

Wrench has no shared motion vocabulary. The only motion in the app is ad-hoc `transition-colors` on a handful of Tailwind classes (`components/ModeToggle.tsx:22`, `components/AnatomyMode.tsx:253`, `components/UploadPanel.tsx:40`, `components/DiagnoseMode.tsx:59`) with implicit browser defaults. There are no `--ease-*` or `--duration-*` tokens in `app/globals.css` and no Tailwind extensions in `tailwind.config.ts`.

Every future animation plan in this repo depends on a single source of truth for curves and durations. Without tokens, executors will hand-type near-matching cubic-beziers and drift from Emil's bar.

## Target

Add motion tokens to `:root` in `app/globals.css` and wire them into Tailwind so components can use `duration-ui`, `ease-out-strong`, etc.

```css
/* app/globals.css — target :root block */
:root {
  /* existing font tokens stay */
  --ease-out: cubic-bezier(0.23, 1, 0.32, 1);
  --ease-in-out: cubic-bezier(0.77, 0, 0.175, 1);
  --ease-drawer: cubic-bezier(0.32, 0.72, 0, 1);
  --duration-press: 160ms;
  --duration-ui: 200ms;
  --duration-panel: 250ms;
}
```

```ts
/* tailwind.config.ts — target theme.extend */
transitionTimingFunction: {
  "out-strong": "var(--ease-out)",
  "in-out-strong": "var(--ease-in-out)",
  drawer: "var(--ease-drawer)",
},
transitionDuration: {
  press: "var(--duration-press)",
  ui: "var(--duration-ui)",
  panel: "var(--duration-panel)",
},
```

Also add a global reduced-motion baseline:

```css
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```

## Repo conventions to follow

- Design tokens live in `app/globals.css` under `:root` (see `--font-sans`, `--font-mono` at `app/globals.css:5-9`).
- Tailwind extensions live in `tailwind.config.ts` under `theme.extend` (see `colors`, `fontFamily` at `tailwind.config.ts:10-21`).
- Use Tailwind utility classes in components rather than inline styles for transitions.

## Steps

1. In `app/globals.css`, add the five `--ease-*` / `--duration-*` variables inside the existing `:root` block after the font tokens.
2. In `app/globals.css`, append the `@media (prefers-reduced-motion: reduce)` block after the `.ascii-field` rule.
3. In `tailwind.config.ts`, add `transitionTimingFunction` and `transitionDuration` under `theme.extend`.
4. Do not change any component files in this plan — token foundation only.

## Boundaries

- Do NOT touch component files.
- Do NOT add dependencies (no Framer Motion, no Radix).
- Do NOT remove existing `transition-colors` usages — other plans will upgrade them.

## Verification

- **Mechanical**: Run `npm run typecheck` and `npm run lint` — both must pass with no new errors.
- **Feel check**: N/A for this plan (tokens only). Confirm in DevTools that `:root` exposes the new variables and Tailwind generates classes like `duration-ui` and `ease-out-strong`.
- **Done when**: `app/globals.css` contains all five motion variables plus reduced-motion media query; `tailwind.config.ts` exposes the three easing and three duration utilities.
