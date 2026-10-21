---
tags: [meta, performance, seo, history]
updated: 2026-10-06
---

# Optimization history — kumo

What the GetLayers optimization pipeline changed in this project, why, and what
must not be undone. Maintained by the pipeline
(`getlayers-pipeline/optimization-pipeline`, primary record
`obsidian/Projects/kumo.md`; owner decisions `obsidian/Meta/decisions-log.md`).
Condensed for the next agent who edits this repo. The detailed pass-1 entry is
in [[changelog]] (2026-10-02), conventions in [[decisions-log]] — this file
links, not duplicates. Last updated 2026-10-06.

kumo is **not published** on getlayers.ai yet: the owner added it to the
pipeline on 2026-10-02 (`eligible: true`) so it ships at the bar. The repo was
`textura-agency/getlayers-anime`, renamed to `textura-agency/getlayers-kumo`
on 2026-10-06.

## Current state

| | Desktop | Mobile | measured |
|---|---|---|---|
| Lighthouse Performance (people, production) | 99 | 97 | 2026-10-06, first production record (load 7–8) |
| Accessibility / Best Practices / SEO | 100 / 100 / 100 | 100 / 100 / 100 | 2026-10-06 (axe-sweep 0) |
| Robot form | 100 | 98 | 2026-10-06 |
| Scroll test (production) | **error** (navigation timeout 90 s — re-run) | **janky** (3.61 % cold, 117 ms render 3/5 at the student/towers section, 92 ms at the flythrough, 133 ms gpu at the clouds rise) | 2026-10-06 |
| Scroll test (`opt-kumo` temp deploy, the pass record) | ideal (0.39 %) | ideal (0.77 %, max 35 ms) | 2026-10-02 |

- Status: **optimized** on the pass record (D-028 bar, 2026-10-02). The
  production scroll re-measure was stopped for the owner's restart (D-032) and
  the 2026-10-06 production record above is not yet resolved (D-031 work).
- Production: Vercel project `getlayers-kumo` (textura-agency), deploys `main`
  from git; public alias `getlayers-kumo-ijkknlkjsdfndsnj.vercel.app`.

## Invariants — do not undo

| what | why / measured effect | where |
|---|---|---|
| **Portrait frame cut for phones**: every sequence frame centre-cropped to 608×1080 WebP q85, chosen per canvas; a resize wider switches back | ~⅓ of the bytes, decode and upload — exactly what a portrait phone shows of a cover-fitted frame | `public/assets/sequence-N-portrait/`, `src/utils/portrait-frames.ts` |
| **Off-thread decode window** on the portrait path: frames kept as blobs, `createImageBitmap` ahead in the scroll direction, released when the scene leaves | `drawImage` of an `<img>` decoded on the main thread — 3.3 s of decode in a 3,000 px phone scroll. Mobile scroll janky → ideal (hosted) | sequence canvas components |
| Frame requests **nearest-first, six per task** | issuing all 150 in one effect was a ~150 ms frame mid-swipe | sequence loader |
| Canvas backing store **capped at the frame's own resolution** | no upscaled copy drawn every tick | sequence canvas |
| **Fonts self-hosted as exact subsets**: Noto Serif JP 700 → the ~45 kana/kanji used (13 KB, was ~120 Google slices, two render-blocking stylesheets); Reggae One + Onest → Latin + arrows. **A new kanji in the copy needs the subset rebuilt** (commands in `layout.tsx`) | part of mobile 71 → 82 → 94 | `src/fonts/`, `src/app/layout.tsx` |
| Cloud cut-outs, works cloud bank, `.cloud-edge` mask and ASCII noise load **after first paint** | off the LCP path (→ 82, → 94) | `src/hooks/use-after-load.ts` |
| `WrittenLines`: letters are plain spans at rest; per-letter springs built only on first play, or in an idle slot after load | TBT 847 ms was per-letter springs of every heading (→ 90) | `src/components/animation/written-lines.tsx`, `src/utils/idle-queue.ts` |
| Every scene below the hero **hydrates in its own idle period** under the preloader (pass-through on the robot form) | → 90 | `src/components/common/hydrate-when-idle.tsx`, `src/views/home/index.tsx` |
| **`useShownNear`** instead of `useOnShown` at call sites (vendored hook untouched) — polls only while on screen | ~35 instances read layout every 50 ms for the life of the page | `src/hooks/use-shown-near.ts` |
| **Consent banner server-rendered** | it was the phone LCP, painted after hydration (LCP 3.85 s) | root layout / cookie components |
| **Robot form** (D-016): no preloader, every entrance at rest, each sequence an `<img>` of its opening frame (no canvas, no download); loops (`marquee`, `live-dot`, `crt-overlay`) read `useMotionOff` / `isRobotView()` | robot form: local 100 / 92, hosted 100 / 99 | `src/proxy.ts`, `src/app/robot-view/`, `src/components/common/robot-view.tsx` |
| AI crawlers in the bot list — **found on this project** (non-JS crawlers read streamed copy in `hidden` segments), then applied fleet-wide | 2026-10-02 | `src/utils/bot-ua.ts` |
| No `app/loading.tsx`; `/privacy-policy` exists; origin falls back to the Vercel production domain (D-019) | BP 96 → 100 | `src/app/`, `src/lib/site.ts` |

## Owner decisions

- **2026-10-02** — add kumo to the pipeline before it ships (`eligible: true`);
  target the D-028 bar.
- **D-016** — robots get a static page, same content, via the proxy.
- **D-026 / D-028 / D-029** — A11y/BP/SEO 100 everywhere (people + robot),
  performance ≥ 90 desktop and mobile; D-029 explicitly includes kumo.
- **D-031** — every template's scroll ideal on the real host (kumo's
  production scroll is still short — see open items).
- **D-032** — all templates marked optimized; the owner reviews manually.
- **2026-10-06** — the owner deployed `getlayers-kumo` on Vercel and connected
  the renamed repo.
- **D-038** — this file.

## History by pass

**pass-1 — 2026-10-02, `optimize/pass-1` → `0c04f57`** (local baseline PC 93 /
mobile 66, BP 96; LCP 3.85 s banner, TBT 847 ms; mobile scroll janky 6–17 %,
max 116 ms).
- Robot form, banner SSR, `/privacy-policy`, origin, `loading.tsx` deleted → 71, BP 100.
- Noto Serif JP subset + clouds after load → 82.
- Headings plain until they play, `useShownNear`, idle hydration of scenes → 90.
- Onest + Reggae One Latin subsets, ASCII noise + cloud mask after first paint → **94**.
- Portrait sequence frames + off-thread decode + nearest-first requests → phone scroll janky → smooth (local).
- Hosted record (`opt-kumo`, 5 runs): PC **100** / mobile **99**, A11y/BP/SEO
  100, robot 100 / 99, scroll **ideal / ideal**. Screens identical at 16
  depths; resize all "=".

**2026-10-06 — first production record** (`getlayers-kumo`): PC 99 / mobile 97,
A11y/BP/SEO 100, robot 100/98; scroll desktop error, mobile janky (above).

## Tried and reverted / didn't help

Nothing recorded as reverted in this project's pass.

## Open items / leads

- **Production scroll**: re-run desktop (timeout); mobile janky at the
  student/towers section (117 ms render), the flythrough (92 ms) and the clouds
  rise (133 ms gpu).
- Leads from pass 1: warm more of the first sequence's 150 frames during the
  preloader; a desktop 67 ms caption frame (1/3).
- `src/views/home/site-header.tsx` writes CSS custom properties per frame —
  fleet candidate (restyles its subtree); check it if the scroll test names
  the header.
- Not published yet; `repackage`/publishing is the owner's call.

## How to measure

From `getlayers-pipeline/optimization-pipeline/` (records only via `measure.mjs`):

```sh
node tools/measure.mjs kumo --hosted              # production: Lighthouse + scroll, PC + mobile ×3
node tools/measure.mjs kumo --hosted --as-bot     # the robot form (what PSI / Googlebot see)
node tools/measure.mjs kumo --tag check           # local production build, while iterating
node tools/measure.mjs kumo --only scroll --devices mobile --runs 1 --no-build   # iterate on a freeze
node tools/axe-sweep.mjs <url> --device both       # was 0 failures on 2026-10-06
node tools/resize-check.mjs kumo --out <dir>        # the portrait/landscape frame switch
```
