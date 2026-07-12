# 005 — Gate hover color changes for fine pointers

- **Status**: DONE
- **Commit**: 95c6e4b
- **Severity**: MEDIUM
- **Category**: Accessibility
- **Estimated scope**: 4 files, ~8 lines

## Problem

Several interactive elements use ungated `hover:` Tailwind classes. On touch devices, `:hover` can stick after tap ("false hover"), making pills and upload zones look selected when they are not:

```tsx
/* components/ModeToggle.tsx:23 — current */
active ? "bg-ink text-white" : "bg-pill text-pillText hover:bg-pill/80"
```

```tsx
/* components/AnatomyMode.tsx:254 — current */
active ? "bg-ink text-white" : "bg-pill text-pillText hover:bg-pill/80"
```

```tsx
/* components/UploadPanel.tsx:41 — current */
dragOver ? "border-ink/40 bg-white" : "border-black/15 hover:bg-white"
```

```tsx
/* components/DiagnoseMode.tsx:59 — current */
... transition-colors hover:bg-black/[0.05]
```

```tsx
/* components/DiagnoseMode.tsx:86 — current */
className="rounded-full bg-pill/60 px-3 py-1 text-xs text-pillText hover:bg-pill"
```

Per AUDIT.md, hover motion/color should be gated:

```css
@media (hover: hover) and (pointer: fine) { ... }
```

Tailwind equivalent: prefix with `[@media(hover:hover)_and_(pointer:fine)]:hover:...` or add a small utility in `globals.css`.

## Target

Replace bare `hover:` with fine-pointer-gated hover on background/color changes for interactive controls. Text link hovers (`hover:text-black/70` on underlines) are lower priority — focus this plan on **background** hovers on buttons/pills/upload zones.

**Preferred approach** — add a Tailwind plugin snippet or arbitrary variant:

```tsx
/* target pattern */
"[@media(hover:hover)_and_(pointer:fine)]:hover:bg-pill/80"
```

Apply to all `hover:bg-*` on:
- `components/ModeToggle.tsx:23`
- `components/AnatomyMode.tsx:254`
- `components/UploadPanel.tsx:41`
- `components/DiagnoseMode.tsx:59`
- `components/DiagnoseMode.tsx:86`

Leave `hover:text-black/70` on text links as-is (color-only, less sticky confusion).

## Repo conventions to follow

- Tailwind 3.4 supports arbitrary variants in class strings.
- Match existing hover colors exactly — only gate the media query, don't change colors.

## Steps

1. In `components/ModeToggle.tsx`, change `hover:bg-pill/80` → `[@media(hover:hover)_and_(pointer:fine)]:hover:bg-pill/80`.
2. In `components/AnatomyMode.tsx`, same replacement on part pill inactive state (~line 254).
3. In `components/UploadPanel.tsx`, change `hover:bg-white` → `[@media(hover:hover)_and_(pointer:fine)]:hover:bg-white`.
4. In `components/DiagnoseMode.tsx`, gate `hover:bg-black/[0.05]` (~line 59) and `hover:bg-pill` (~line 86).

## Boundaries

- Do NOT change hover colors or add new hover effects.
- Do NOT gate `active:` or `focus:` states.
- Do NOT modify text-link `hover:text-*` classes in this plan.

## Verification

- **Mechanical**: `npm run typecheck` and `npm run lint` pass.
- **Feel check**:
  - Desktop with mouse: hover backgrounds still work on pills and upload zones.
  - Chrome DevTools → mobile emulation (touch): tap a pill, then tap elsewhere — pill should NOT retain a "hovered" background after release.
- **Done when**: All five `hover:bg-*` locations use fine-pointer media gating.
