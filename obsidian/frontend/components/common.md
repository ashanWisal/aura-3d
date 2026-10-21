---
tags: [frontend, stable]
updated: 2026-10-01
---

# Catalog — Common Components

Files in `src/components/common/` — shared infrastructure that may depend on
providers. Conventions: [[component-conventions]].

## Cookie — `Cookie/`

Self-contained cookie consent system — a bottom-right **banner** plus a full
category **preferences modal**. No third-party library (the old
`react-cookie-consent` dependency was removed). Lives in `src/components/common/Cookie/`.

| File | Role |
|------|------|
| `Cookie.tsx` | Mount component — hydrates the store, renders banner + modal |
| `LazyCookie.tsx` | `next/dynamic` `ssr:false` wrapper — keeps cookie JS out of first-load |
| `CookieBanner.tsx` | Bottom-right consent banner |
| `CookiePreferencesModal.tsx` | Category preferences dialog with per-category toggles |
| `CookieButton.tsx` | Local button primitive — `primary` / `secondary` variants |
| `cookieStore.ts` | Zustand store + `localStorage` persistence |
| `index.ts` | Barrel exports — `Cookie`, `LazyCookie`, `useCookieStore`, `CookieConsent` |

**Mounting** — the root layout renders `<LazyCookie />` inside `ScrollLayout`:
```tsx
import { LazyCookie } from "@/components/common/Cookie";
```

**State** — `useCookieStore` (Zustand). `consent` is `null` until the user decides;
the banner shows only after hydration confirms `consent === null`. Persisted to
`localStorage` under key `cookie-consent-v1`. Three categories: `necessary`
(always on), `analytics`, `marketing`.

**Styling & motion** — ported to the project stack: Tailwind v4 with the
`background` / `foreground` design tokens (dark-mode adaptive, no hardcoded hex),
and `@react-spring/web` for all motion — `useTransition` drives the banner and
modal mount/unmount, `useSpring` drives the toggle knob. No CSS transitions.
The modal locks scroll through the Lenis [[smooth-scroll|scroll store]]
(`useScroll.stop()`), not `body` overflow.

> [!note] `#todo`
> The privacy-policy link points to `/privacy-policy` — that route does not exist
> yet. Placeholder consent copy should be reviewed before launch.

## Grid — adaptive scaling (`grid/`)

The **adaptive scaling grid** keeps a rem-based layout proportional across every
viewport by scaling the root (`<html>`) font-size. Design in `rem` once, and the
whole UI scales as one unit. Lives in `src/components/common/grid/`.

| File | Role |
|------|------|
| `grid.config.ts` | Breakpoints + `FONT_BASE` — the single source of truth for the grid |
| `adaptive-grid.tsx` | `<AdaptiveGrid>` client component — drives the scale-up, renders `null` |
| `index.ts` | Barrel exports — `AdaptiveGrid`, `GRID_BREAKPOINTS`, … |

**How it works** — two halves cover the whole viewport range:

- **Scale down** (viewport ≤ 1920px) — `vw`-based `html { font-size }` media
  queries in `globals.css`. At each breakpoint's design base width the root
  font-size resolves to 16px; between breakpoints it tracks the viewport.
- **Scale up** (viewport > 1920px) — the `<AdaptiveGrid>` component sets an
  inline `html` font-size at runtime via [[hooks|`useAdaptiveGrid`]], so the
  design keeps growing (damped by `coef`) on large displays.

The `globals.css` media queries and `grid.config.ts` describe the same
breakpoints — **keep them in sync** (formula: `font-size = 16 * 100 / baseWidth vw`).

**Mounting** — the root layout renders `<AdaptiveGrid />` inside `ScrollLayout`:
```tsx
import { AdaptiveGrid } from "@/components/common/grid";
```
Mount it once. Props: `baseWidth` (defaults to the largest breakpoint) and
`coef` (0–1 scale-up damping, default `0.6666`).

> [!note]
> This replaced a `styled-components`-based scaling system that was dropped into
> `common/` — see [[decisions-log]] ADR-0008. `styled-components` is **not** a
> project dependency; the scale-down CSS lives in `globals.css` per [[design-system]].

## ReducedMotion — `reduced-motion.tsx`

`<ReducedMotion>` — a client leaf that calls react-spring's `useReducedMotion()`.
It watches the `prefers-reduced-motion` media query and toggles react-spring's
global `skipAnimation`, so every spring — and `spring-text-engine` — jumps to its
end state instead of animating. Renders `null`; mounted once in the root layout.
See [[animation-system]] and [[seo-metadata]].

## Marquee — `components/ui/marquee.tsx`

A strip of items looping left forever on a linear spring (stopped under reduced
motion). The track holds four copies and travels exactly two, so the seam is
invisible at any width. Used for each chapter's readout ticker and the footer's
running line (`writeIn` writes each item in).

| Prop | Type | Meaning |
|------|------|---------|
| `items` | `string[]` | One copy of the strip |
| `separator` | `ReactNode` | Drawn after every item |
| `duration` | `number` | Milliseconds to travel two copies |
| `label` | `string` | Accessible name of the list |
| `trackClassName` | `string` | Gap, type, colour of the track |
| `writeIn` | `boolean` | Write items in word by word when shown |

## ScrollSequence — `scroll-sequence.tsx`

`<ScrollSequence>` plays an image sequence by **scroll position** — scrolling
scrubs the frames like a timeline. It is the only way sequences play on this
project: they never run on a clock. ADR: [[decisions-log]] ADR-0025 and ADR-0027.

| Prop | Type | Meaning |
|------|------|---------|
| `frames` | `string[]` | Ordered frame URLs, first to last |
| `label` | `string` | Accessible description of what the sequence depicts |
| `scrollViewports` | `number` (default `4`) | Scroll distance as a multiple of the viewport height. May be fractional — size it so the scrub lands in the page's px-per-frame band ([[decisions-log]] ADR-0033) |
| `frameStart` | `number` (default `0`) | Share of the sequence already played by a transition — where it resumes |
| `frameEnd` | `number` (default `0.985`) | Share of the scroll by which the last frame is reached; the rest holds |
| `zoomToEnd` | `number` (default `1`) | Scale the held last frame reaches at progress 1 — keeps the picture moving after the scrub runs out. Reaches that scale at the unpin by default; pair with `progressEnd="bottom top"` only when the stage is meant to be *seen* sliding away ([[decisions-log]] ADR-0030 — a held shot is usually covered instead) |
| `leadIn` | `boolean` (default `false`) | Passed through to [[#PinnedScene — `pinned-scene.tsx`|PinnedScene]] |
| `progressEnd` | `"bottom bottom"` \| `"bottom top"` | Passed through to PinnedScene; `"bottom top"` keeps a `zoomToEnd` running while the stage slides away |
| `onProgress` | `(p: number) => void` | Scene progress, for overlays that play over the held frame |
| `className` | `string` | Classes for the outer section |

```tsx
import { ScrollSequence } from "@/components/common/scroll-sequence";
import { skylineSequence } from "@/data/home/sequences";

<ScrollSequence frames={skylineSequence.frames} label={skylineSequence.label} />
```

**How it works.** The outer `<section>` is `scrollViewports × 100svh` tall and
holds a `sticky top-0 h-svh` child, so the frame stays pinned while that
distance is scrolled. `<ProgressTrigger start="top top" end="bottom bottom">`
reports 0–1 across exactly that range — so progress runs on the shared rAF
ticker, not a private scroll listener ([[animation-system]]). Painting is
[[hooks|useImageSequence]]; this component only decides which frame is current.

Stack several and each pins for its own span, so the page reads as one
continuous scrubbed timeline. The home view stacks three.

> [!important] Pace a scene in pixels per frame, not in viewports
> How fast a scrubbed scene *feels* is how far you scroll before the picture
> changes. Lengthening a scene to give its copy more reading time spreads the
> same frames further apart and makes it feel slower, not calmer. Measure the
> rate — sample a patch of the canvas at 20px scroll steps and count the
> changes — and keep every scene in the same band as its neighbours; the home
> page runs 19-47px per frame. A transition and the sequence after it share
> one frame budget through `leadShare`, so their rates trade against each
> other. See [[decisions-log]] ADR-0033.

> [!note] No spring on the frame index — but `zoomToEnd` is sprung
> The index is discrete; interpolating it would show frames the scroll position
> is not on. This is the [[animation-system]] "raw 0–1 progress" case, which is
> what `<ProgressTrigger>` exists for. It is not a hard-rule #1 exception.
> `zoomToEnd` is the opposite case — a continuous value on a composited
> transform — so it goes through a spring like any other motion.

> [!tip] Frames are WebP, and they load on approach
> The PNG masters for the three home sequences were 480 MB; re-encoded to WebP
> q80 at full 1920 width they are 39 MB. Even so, nothing loads at first paint
> except the sequence already on screen — decoded bitmaps cost far more than the
> file on disk. Keep masters out of `public/` (everything under it is deployed)
> and out of git. Re-encode with `sharp`, which ships inside `next`.

The frame manifests are data, not markup — they live in
`src/data/home/sequences.ts` and arrive as props, per [[component-conventions]].

## PinnedScene — `pinned-scene.tsx`

`<PinnedScene>` is the stage every scrubbed home scene is built on: a
full-viewport surface pinned for a stretch of scroll, reporting progress 0–1
across that stretch. `<ScrollSequence>` and the cloud transitions are all
scenes; so is the works ring. ADR: [[decisions-log]] ADR-0029 and ADR-0030.

| Prop | Type | Meaning |
|------|------|---------|
| `label` | `string` | Accessible name of the section |
| `span` | `number` | Section height in viewports; the stage pins for `span − 1` |
| `onProgress` | `(p: number) => void` | Scroll progress 0–1 across the pinned stretch |
| `leadIn` | `boolean` (default `false`) | Start one viewport above the section and stay hidden until pinned |
| `progressStart` | `"top top"` \| `"top center"` \| `"top bottom"` | Where progress leaves 0 — at the pin, or while the stage is still sliding in |
| `progressEnd` | `"bottom bottom"` \| `"bottom top"` | Where progress reaches 1 — at the unpin, or after the slide-off |
| `className` | `string` | Section-level classes, e.g. stacking |
| `stageClassName` / `stageStyle` | `string` / `CSSProperties` | Classes and style for the pinned stage |

**`leadIn` is a cut, and only for a continuing shot.** The scene takes over
at the exact position the one before it lets go, which is invisible when the
previous scene ends on this scene's first picture — that is what keeps the
home sequences reading as one take. Do not reach for it to close a gap between
two unrelated blocks: overlapping scenes puts both on screen at once, and an
entrance fade on either turns that into a blend. Stacked blocks want a margin
instead ([[decisions-log]] ADR-0030).

**`progressStart` and `progressEnd` widen the reported range at either end.**
The default pair reports 0→1 across exactly the pinned stretch, which is what
a scene wants when nothing it drives is visible outside it. A block that both
arrives and leaves in view needs both widened, or whatever the progress drives
stands still on the way in and freezes on the way out — `<WorksRing>` passes
`"top bottom"` and `"bottom top"` so its carousels are already turning as they
rise and still turning as they go ([[decisions-log]] ADR-0030).

The cut itself is written in Lenis's scroll callback rather than on the ticker,
so the stage appears in the same frame the scroll crosses the boundary — a
frame of lag flashes the previous stage sliding away. Progress still comes from
`<ProgressTrigger>`, on the shared rAF ticker ([[animation-system]]).

## Skeleton loaders

Three skeleton components for `loading` states of async-data components — every
async component must mirror its final layout with one of these
(see [[component-conventions]]).

| Component | File | For |
|-----------|------|-----|
| `<SkeletonImage>` | `skeleton-image.tsx` | image placeholders |
| `<SkeletonLoader>` | `skeleton-loader.tsx` | generic block placeholders |
| `<SkeletonVideo>` | `skeleton-video.tsx` | video placeholders |

> [!note]
> `components/ui/` (design-system primitives) does not exist yet — create it when
> the first primitive is added. See [[folder-structure]].

## Related

[[component-conventions]] · [[components/animation-springs]]
