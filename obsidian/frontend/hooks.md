---
tags: [frontend, stable]
updated: 2026-10-01
---

# Catalog — Hooks

Custom hooks in `src/hooks/`, grouped by domain.

## `hooks/animation/` — `#do-not-modify`

The hooks powering the [[animation-system]]. Consume them through the spring
components — don't call them directly unless extending the engine.

| Hook | File | Role |
|------|------|------|
| `useInViewRef` | `use-in-view-ref.ts` | IntersectionObserver ref for viewport detection |
| `useDynamicInView` | `use-dynamic-in-view.ts` | in-view detection with dynamic targets |
| `useLoopInView` | `use-loop-in-view.ts` | in-view tied to a render loop |
| `useProgressTrigger` | `use-progress-trigger.ts` | scroll → 0–1 progress (powers `<SpringTrigger>` / `<ProgressTrigger>`); returns `progress` as a `RefObject<number>` — read `.current` |
| `useSpringTrigger` | `use-spring-trigger.ts` | scroll-driven spring logic |
| `useLoop` | `use-render-loop.ts` | subscribes a callback to the shared rAF ticker (`src/lib/animation/ticker.ts`) |
| `useResizeLoop` | `user-resize-loop.ts` | runs a callback when window width changes (via `useLoop`) |

## `hooks/smooth-scroll/`

| Hook | File | Role |
|------|------|------|
| `useScroll` | `use-scroll.ts` | Zustand store for Lenis + scroll state — see [[smooth-scroll]] |

## `hooks/` (root)

| Hook | File | Role |
|------|------|------|
| `useWindowWidth` / `useWindowHeight` / `useWindowSize` | `use-window-size.ts` | SSR-safe window dimensions — all three share **one** debounced (300 ms) `resize` listener via a `useSyncExternalStore` store |
| `useAdaptiveGrid` | `use-adaptive-grid.ts` | Scales the root `<html>` font-size up while the viewport exceeds `baseWidth` — powers `<AdaptiveGrid>`, see [[components/common]] |
| `usePrefersReducedMotion` | `use-prefers-reduced-motion.ts` | `true` when the OS asks for reduced motion. One shared `matchMedia` listener through `useSyncExternalStore`; SSR renders `false` and the client corrects on hydration |
| `useLettersIn` | `components/animation/written-lines.tsx` | The `show` flag for `<WrittenLines>`: a boolean that only re-renders when it flips, so a scene can set it from a scroll callback that runs every tick. Lives with the component it drives. See [[decisions-log]] ADR-0032 |
| `useImageSequence` | `use-image-sequence.ts` | Paints a frame sequence into a `<canvas>`: decodes the frames, draws one in cover-fit at a DPR capped to 2, re-fits on resize. Returns `canvasRef` + `showFrame(index)`. Fetching starts one viewport out (ADR-0027). |


> [!note] `useImageSequence` owns painting, not timing
> It deliberately knows nothing about *when* the frame should change. The
> trigger belongs to the component — today that is scroll progress, in
> `<ScrollSequence>` ([[components/common]]). Sequences on this project play by
> scroll only; nothing advances them on a clock.

> [!warning] A looping spring must check `usePrefersReducedMotion`
> `<ReducedMotion>` flips react-spring's global `skipAnimation`, which is enough
> for a spring that settles — it jumps to its end state. A spring with
> `loop: true` instead finishes each cycle instantly and restarts, so it spins.
> Anything that loops has to read this hook and set `loop`/`pause` from it.
> `<CrtOverlay>` is the current example. See [[decisions-log]] ADR-0026.

> [!note] Shared render loop
> Loop-based hooks (`useLoop`, `useResizeLoop`, `useLoopInView`, the trigger
> hooks) all subscribe to the single app-wide ticker in `src/lib/animation/ticker.ts`
> rather than each starting their own `requestAnimationFrame`. See
> [[animation-system]]. The ticker is **not** `#do-not-modify`.

## Adding a hook

Place it under `hooks/<domain>/`. Data-fetching logic belongs in hooks, not in
presentational components. Use [[templates/hook-note]] to document it here.

## Related

[[animation-system]] · [[smooth-scroll]] · [[utils]]
