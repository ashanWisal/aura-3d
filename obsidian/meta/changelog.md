---
tags: [meta, changelog]
updated: 2026-10-21
---

# Changelog

Chronological log of notable changes to **this project**. Newest first.
Human-curated — not a mirror of `git log`.

Log a change here when it would surprise someone returning in six months: a new
dependency, a new route or section, a convention bent, a bug whose cause is worth
remembering. Routine commits do not need an entry.

For *why* the conventions are what they are, see [[decisions-log]].

---

## 2026-10-21 — Exploded-view callouts and the "Every day" ring

- **Callouts** in chapter 04: five labels (`insideCallouts` in `data/home.ts`)
  pinned to the right cup's parts with drei `<Html>`, shown once the explode
  passes 0.9. Pin points and line directions: `CALLOUT_PINS` in
  `headphones.tsx`. Hidden on phones.
- **New section `#moments`** (08 — Every day) between Sound and Specs: the
  turning headphones (`<FinishCanvas>` reused) in a ring of ten moments; hover,
  focus or press makes one active. Portrait drops the ring for a grid.
  Later eyebrows renumbered 09–11.
- New dependency `lucide-react` for its icons.

## 2026-10-21 — Headphones: real outer model replaces the primitives

- `public/assets/models/aura-one.glb` — "Headphones" by SofiaWolfie (Sketchfab,
  **CC BY 4.0**, credit in the footer via `footerContent.modelCredit` — keep it).
  Optimised with gltf-transform (meshopt + WebP): 5.9 MB → 724 KB.
- `headphones.tsx` bakes each mesh into model space at load and cuts it into
  headband + per-side cup pieces (by triangle centre), so the exploded view
  still works. Meshes are mapped by material name in `SOURCES`; the model's
  colour maps are dropped (the colourway paints), its normal/roughness/AO kept.
- Driver, board and battery stay code-built (the model has no insides), packed
  to fit inside the model's shallower cup (`INNER`).

## 2026-10-21 — Aura One: forked from Abyss into a headphones product page

- New project `aura/`, copied from `abyss/` (the same starter, three.js already
  wired). The deep-sea dive, its models and sections are gone.
- **Story** (`product-story.tsx`): one pinned WebGL stage, five chapters —
  hero, the frame, materials close-up (with Baseline-style ghost words),
  exploded view, back together. `story-canvas.tsx` holds the shot list keyed
  to scroll progress; the model chases it with damping. Captions and readout
  tickers reuse `chapter-caption.tsx`.
- **Model** in code (ADR-0037), repainted live from `product-store.ts`.
- **Shop**: finishes (turntable canvas + radio swatches), sound (Baseline
  programs list + marquee), specs (stats + table), reviews (cards + press
  ticker), pre-order form posting to `/api/contact`, footer.
- Kumo-style ASCII preloader and live studio clock; Product JSON-LD.
- Palette studio dark + gold; display font Instrument Serif.
- `public/open-graph.png` is a 1200×630 capture of the hero.
- Not done: the `optimize-3d-scene` pass (device tiering, prewarm) has not
  been run.

## 2026-10-20 — A trench, bigger swerves, and the light bill

- `trench.tsx`: between chapters 01 and 02 the route dives down a canyon —
  two generated rock walls that follow the spiral, narrowest (13 units) at
  200 m. `depthAtTravel` added to `descent-state.ts` to build it.
- Obstacles now pass close to the probe's resting spot while the probe
  swerves 4–5 units away, so the probe visibly moves further than the
  obstacle. The trench shark comes up the open middle of the canyon: the
  canyon curves left, so a line further right ends up inside the rock.
- Performance (ADR-0036): the obstacle point lights are gone (deep shark gets
  an emissive tint); trench walls are Lambert. Production build, UHD 620:
  trench 30 → 41 fps, 2 100 m 44 → 47, floor 29 → 31; programs 22 → 16.
  Not fixed: programs still link during scroll (12 → 16), i.e. the
  `optimize-3d-scene` §3 prewarm is not done — first sight of a model can
  stutter.

## 2026-10-20 — Chapters move the copy; near misses at each change

- Each chapter has a `layout` (`src/data/home.ts`): its headline takes a
  different corner and slides in from that side (`chapter-caption.tsx`);
  portrait stacks every layout bottom-left. The corners are picked around
  each chapter's set piece — e.g. 03 can't be top-right (the anglerfish is
  there), and at the floor the probe now moves aside *down*-right so 04's
  top-right headline is clear.
- `obstacles.tsx`: at each chapter change something crosses the route — a
  shark (200 m), a tumbling boulder (1 000 m), a deep shark (3 650 m; 3 500 m
  collides with a jellyfish). Each is placed where the probe will be at its
  depth (`baseView` + `probeAnchor`, now shared in `descent-state.ts`), and
  its motion is keyed to route distance, so it runs with the scroll and
  backwards on scroll up. `dodgeAt` gives the probe a matching swerve.
- New model: `shark.glb` (Quaternius, public domain).

## 2026-10-20 — The probe is driven by the scroll

- `probe.tsx`: the propeller spins with Lenis scroll velocity (backwards on
  scroll up) — the blade meshes are rotated in place about the hub, whose
  model-space centre is hardcoded (`HUB_X/Y/Z`) because the glTF bakes every
  part at the model origin. The hull rides a sine wave keyed to scroll
  position (pitch follows the slope), and `wake.tsx` streams a propeller
  wash off the hub while it turns: ~1 400 tiny bubbles thrown back in a
  corkscrew, plus faint churn puffs. Particles inherit 85% of the probe's
  velocity and lose it to drag; without that the camera outruns them and the
  wash is never on screen.

## 2026-10-20 — Field log becomes a 3D specimen viewer

- The CSS-3D ring of blurry video stills (`creature-ring.tsx`) is gone, and so
  are `public/assets/creatures/`. `field-log.tsx` shows one creature per
  viewport: the same glTF model the dive uses, turning on its own small canvas
  (`specimen-canvas.tsx`, bloom, pointer turns it), beside a plain record
  (zone, depth met, size, what it did) and a numbered index that fills as you
  scroll. Six creatures, ending on the source, which pulses the signal.

## 2026-10-20 — "The Signal": a story, a vehicle, real models

The WebGL dive read as a background with no story. Rebuilt around a narrative
— a probe chasing a light pulse from 4 000 m — and made properly 3D:

- **Story**: chapter copy is now four beats (signal received → following the
  pulse → something answered → the source), the HUD shows signal strength
  next to depth, and the dive ends on a reveal: a colossal glowing jellyfish
  between the vents, pulsing the signal's rhythm (`signalPulse`).
- **Flight, not a drop**: the camera flies a spiral around the signal's axis
  (`pathPoint`, `pathHeading` in `descent-state.ts`) and turns to face the
  source at the end.
- **You are the probe** (`probe.tsx`): a submarine model rides ahead of the
  camera and banks towards the pointer; its searchlight (spot light + beam
  shader) aims at the pointer. `litAmount` lets creatures react: fish scatter,
  jellies flare, the squid jets away.
- **Real models** (`public/models/`, Poly Pizza, CC BY / public domain):
  probe, whale, rigged fish and anglerfish (with swim animations), jellyfish,
  squid, rocks. `use-model.ts` clones (SkeletonUtils), measures with precise
  (skinned) bounds and normalises size — the rigs carry a 100× armature
  scale that a plain bounding box misses.
- **Bloom + vignette** via `@react-three/postprocessing`.
- **Perf** (Intel UHD 620, 1920×937, dev build): ~60 fps in the water column,
  ~40 fps at the floor (four vent lights + the source). Portrait screens get a
  wider FOV and a smaller, higher probe.
- Testing note: a background Chrome tab throttles rAF to ~1 Hz — always bring
  the tab to the front before measuring fps.

---

## 2026-10-19 — The dive is now a live WebGL scene

The stock-footage chapters read as low quality, disconnected, and wrong (aquarium
jellies, a static loop, a 360p vent clip). Replaced with one real-time three.js
scene the camera sinks through — `<DiveDescent>` pins 17 viewports; the four
chapter captions ride over it (`chapter-caption.tsx`).

- **Scene** (`src/views/home/descent/`): water backdrop shader (gradient, sun
  rays, caustics), one `<Particles>` component for marine snow / bubbles /
  krill / bioluminescent sparks / vent smoke, an instanced fish school, fresnel
  jellyfish with waving tentacles, a siphonophore and an anglerfish lit only by
  its lure, and a floodlit seabed with three glowing black smokers.
- **World height is travel, not metres** (`cameraY` in `descent-state.ts`):
  each chapter is 100 units, so the 3000 m midnight zone does not rush past
  fifteen times faster than the 200 m sunlight zone.
- **Depth** is mapped per chapter (`dive-descent.tsx`), so each quarter of the
  scroll is one real zone; the scene eases towards it each frame.
- **Removed**: the 31 MB of frames, `chapter-scene.tsx`, the frame pipeline
  script and its workflow note. Assets are now 236 KB (the creature stills).
- **Deps**: `three`, `@react-three/fiber`, `@types/three` — see [[tech-stack]].
- Measured ~60 fps in every zone (desktop, dev build); render loop stops when
  the canvas is off screen, DPR capped at 1.75.

---

## 2026-10-19 — Abyss: new site on the starter (replaces the Kumo home)

Forked from the Kumo build of this starter; Kumo's home view, data, fonts,
`CrtOverlay`, `LayersLogo` and its frame assets are gone. The engine
(`ScrollSequence`, `PinnedScene`, `useImageSequence`, springs) is unchanged.

- **Home** (`src/views/home/`): four pinned chapters (sunlight → twilight →
  midnight → floor) that fade through black into each other; a header depth
  gauge fed by a zustand store (`dive-store.ts`); a CSS-3D creature ring; the
  depth-zones list; numbers; footer with CC BY footage credits.
- **Content**: all copy and frame manifests in `src/data/home.ts`.
- **Theme**: dark-only Abyss palette, Unbounded / Inter / JetBrains Mono — see
  [[design-system]].
- **Assets**: 8 creature stills (frames of a CC BY blackwater dive).
- **`components/ui/marquee.tsx`**: Kumo's marquee, promoted to a shared primitive.
- **verify.sh fix**: the `duration-fast` rule matched inside
  `duration-[var(--duration-fast)]` (the form it recommends) — now requires the
  class not to follow a `-`.

---

## 2026-10-02 — Optimization pass 1 (`optimize/pass-1`, uncommitted)

Performance + SEO pass from `optimization-pipeline` (bar D-028). Nothing a
visitor sees changed — before/after shots at 16 scroll depths on both devices
match. Local numbers (Lighthouse median of 3; scroll test 3 runs):

| | before | after |
|---|---|---|
| Desktop P / A / BP / SEO | 93 / 100 / 96 / 100 | 100 / 100 / 100 / 100 |
| Mobile P / A / BP / SEO | 66 / 100 / 96 / 100 (LCP 3.85 s, TBT 847 ms) | 94 / 100 / 100 / 100 (LCP ~3.0 s, TBT ~55 ms) |
| Scroll PC / phone | ideal / janky (max 116 ms, 6–17 % dropped) | ideal / smooth (warm ideal 0.57 %; cold 2.85 %, first sequence while its frames arrive over 4G) |

**Fleet fixes.** Robot form (`src/proxy.ts`, `app/robot-view`, `robot-view.tsx`,
`bot-ua.ts`): bots get the page with no preloader, every entrance at rest in
the served HTML, and each scrubbed sequence as an `<img>` of the frame it
opens on (no canvas, no sequence download); loops read `useMotionOff`
(`marquee`, `live-dot`, `crt-overlay` — the overlay is in the root layout, so
it reads `isRobotView()`). Consent banner server-rendered (it was the phone's
LCP element, painted after hydration). `/privacy-policy` (the banner's link
404'd — BP 96). `site.ts` origin falls back to the Vercel production domain.
Empty `app/loading.tsx` deleted.

**Load.**
- Fonts self-hosted as exact subsets (`src/fonts/`): Noto Serif JP 700 cut to
  the ~45 kana/kanji the copy uses (13 KB; the Google build was ~120
  unicode-range slices — two render-blocking stylesheets of ~100 KB), Reggae
  One and Onest cut to Latin + the arrows (no more CJK `@font-face` rules for a
  Latin-only face; Onest's second file for → ↑ gone). Rebuild commands are in
  `layout.tsx`. A new kanji in the copy needs the subset rebuilt.
- Cloud cut-outs, the works cloud bank, the `.cloud-edge` mask and the ASCII
  noise background no longer load ahead of first paint (`useAfterLoad`, class
  applied once there is something to show).
- Hydration: `WrittenLines` renders its letters as plain spans in their
  resting pose and only creates the per-letter springs the first time the
  heading plays (or in an idle period after load, `utils/idle-queue.ts`, so
  a first play mid-scroll never builds them in that frame); every scene below the hero hydrates in its own idle period
  under the preloader (`HydrateWhenIdle`, pass-through on the robot form).
- `useShownNear` replaces `useOnShown` at the call sites (the vendored hook is
  untouched): the same visibility check, only polled while an
  IntersectionObserver says the element is on screen — ~35 instances read
  layout every 50 ms for the life of the page.

**Scroll (phone).**
- Portrait cut of every sequence frame (`public/assets/sequence-N-portrait/`,
  centre 608×1080, WebP q85 — exactly what a portrait phone shows of a
  cover-fitted frame): a third of the bytes, decode and upload. Chosen per
  canvas (`utils/portrait-frames.ts`); a resize wider switches back.
- The canvas backing store is capped at the frame's own resolution (no
  upscaled copy drawn every tick).
- On the portrait path frames are kept as blobs and a window around the
  current frame is decoded off the main thread (`createImageBitmap`, ahead in
  the scroll direction, released when the scene leaves the screen). An `<img>`
  drawn to a canvas was decoded synchronously in the frame's commit — 3.3 s of
  main-thread decode in a 3,000 px phone scroll.
- Frame requests are issued nearest-first, six per task: issuing all 150 in
  one effect was a ~150 ms frame when a scene came within a screen mid-swipe.

---

## Baseline — built from `next16-claude-starter` v0.1.0

What the starter ships, so the first project entry has something to diff against:

| Area | What is there |
|------|---------------|
| Framework | Next.js 16 App Router · React 19 · TypeScript · Yarn · Node ≥ 20.19 |
| Styling | Tailwind v4, CSS-only config, three-tier design tokens ([[design-system]]) |
| Motion | Vendored spring engine + `spring-text-engine`, shared rAF ticker, reduced-motion ([[animation-system]]) |
| Layout | Adaptive scaling grid — root font-size tracks the viewport ([[design-system]]) |
| Scroll | Lenis smooth scroll + Zustand scroll store ([[smooth-scroll]]) |
| Server | `app/api` route handlers, zod-validated env, `{ data }`/`{ error }` envelope ([[api-architecture]]) |
| SEO | Metadata generator, `robots.ts`, `sitemap.ts`, JSON-LD ([[seo-metadata]]) |
| Agent harness | 8 commands, 7 path-scoped rules, 11 skills, 4 subagents, `verify.sh` ([[agent-harness]]) |
| Not included | CMS, database, auth, payments, i18n, tests — added per project ([[backend/README]]) |

The home view (`src/views/home.tsx`, route `/`) ships empty on purpose — start
there ([[new-page]]).

<!-- Log this project's changes below, newest first, under a `## YYYY-MM-DD` heading. -->

## 2026-10-01

**The preloader opens onto the live page in one move, and the scrollbar is
gone.**

- **No more jerk in the middle.** The exit was two chained ease-outs — the
  TV widening, then the screen growing — so the screen decelerated and then
  jumped back to full speed when the second began. Measured per frame, its
  width step went 9, 8, 7 … 4, then **22**. Now one spring value `e`,
  `easeOutQuint` over 1300ms, drives both CSS sizes: the step decays
  33 → 26 → 22 → 18 → … → 1 with no re-acceleration. Frames ≤ 19.5ms.
- **The hero's entrance is visible again.** The screen used to show a *still*
  of the first frame, with the real page — hero included — under opaque
  paper. Starting the hero on `revealing` (last change) only meant it played
  out behind that still: 98% written at unmount. The screen is now a real
  window: `.intro-surround` paints paper everywhere *but* the screen
  (`mask-composite: exclude`), the paper inside it clears in the first ~90ms
  of the move, and the page shows through. Measured: hero letters 0 at the
  start of the exit, 0.69 a third of the way in, 1 at unmount — all on
  screen. The canvas is painted before the exit starts, so the window never
  opens onto black.
- **No browser scrollbar.** `scrollbar-width: none` and the WebKit
  equivalent on `html`. Scrolling itself is untouched.

**Hero earlier, a punchier preloader exit, the cursor effect gone, and the
works sheet off the heavy list.**

- **The hero's copy and headline arrive on `revealing`, not `done`** — while
  the screen is still opening onto them, instead of a beat after it has.
- **The preloader leaves fast and lands softly.** Both legs of the exit ease
  *out* now (`easeOutCubic` open, `easeOutQuart` reveal) and the reveal is
  1100ms starting 400ms in, against an in-out 1300ms starting 550ms in. The
  site chrome still starts at 35% of the reveal, so with the shorter reveal
  everything downstream starts sooner too.
- **The cursor pixel patch is removed** — the `pixelateOnHover` prop, the
  patch code in `useImageSequence` and `src/lib/animation/pointer.ts` with
  it. That was a 16fps repaint of a 380px disc of the canvas on every
  sequence under the pointer; gone, not disabled. ADR-0031 is reverted.
- **The ring's stills are served at display size.** Both faces of every card
  had `unoptimized`, so each `<img>` decoded a full 1920×1080 sequence frame
  to show it at 92–154px wide: measured mid-load, 48 images, ~127MB of bitmap
  already decoded and heading for ~400MB. `next/image` now sizes them to
  `15vw`. CSS blur in the same stretch was measured and left alone: three
  layers totalling ~2.5Mpx, rasterised once, no per-frame cost. Frame times
  through the sheet in the test pane: avg 16.7ms, none over 25ms before or
  after — the memory, not the frame, was the load.

**"Selected works" and the film index are a block in document flow, not
print on the rising page.** The gap to the ring kept breathing and the copy
wobbled against it for a structural reason: the copy's position was written
by script on every tick inside the pinned window scene, while the ring after
it moved with the native scroll. Two motion systems cannot agree frame for
frame, and `api.set` only narrowed the lag to a frame. New `<WorksList>`
holds the heading, index and chapter mark as a plain block on one paper sheet
with the ring (`WORKS_SHEET` in `<HomeStory>`, pulled up 115svh so it rises
over the paper the scene lays down). `<WorksIntro>` keeps only the
clouds-to-paper rise, now on a plain composited transform — `.paper-rise` and
its per-tick custom properties are gone — and the ring's fade-in is removed
("no extra effects"). Measured per frame while scrolling at ~960px/s: list
bottom to ring top **102px, spread 0** over 41 frames, heading to ring 99px,
spread 0, heading and index on one baseline (3px, as drawn); heading
287–319px below the cloud edge (that 32px is the scene's page lagging the
native sheet, invisible paper on paper); ~167 frames per pass, avg 17ms. The
index and chapter mark hang off the block's bottom in Tailwind's 0.25rem
units, so their offsets have to be raised together with the block's bottom
padding or the heading climbs away from them. ADR-0034.

**The distance from the film list to the ring no longer breathes while
scrolling.** `<WorksIntro>` drove its page and copy through `api.start`, a
spring, while the ring that follows it sits in document flow and moves
exactly with the scroll — so the copy lagged the wheel and the gap between
the two blocks shrank and grew with every scroll, settling only once it
stopped. Every settled measurement was fine, which is why it was missed.
`api.set` now, like the cloud pass. Measured **during** motion, sampling every
frame at ~840px/s across the whole hand-over: list-to-ring 127–139px, first
card to heading 119–131px — a 12px spread, which is one frame of scroll
between the sample and the ticker, not lag. Nothing else touched.

**The ring sits tight under the film list, and its fade is short.** The
overlap was right but the numbers were not: the ring's cards sit ~200px below
its own top edge, so a 70svh pull-up still left ~470px between the list and
the first card, and a 430px fade left those cards half-transparent under the
list for most of that — which read as a broken layout, not an entrance. The
wrapper takes `-mt-[85svh]` now and `APPEAR` is `[0.03, 0.07]`. Measured at
1600x760 across the whole hand-over: first card a constant **146px** under
the list bottom (was 796 before any of this), fade 0.05 → 1 over ~250px and
done before the cards reach mid-screen, no jump anywhere — every element
moves exactly 50px per 50px of scroll. Nothing else touched.

**Reverted the 3x cover; the ring is pulled up instead.** Speeding block 8's
cover up broke the scroll's pace and did not read as a smaller gap. The cover
is 1:1 again (window scene back to 6.5 viewports, all windows back), and the
ring's wrapper takes `-mt-[70svh]`, so it rises over block 8's paper while the
copy is still climbing. Measured at 1600x760: list bottom to ring top is a
constant 267px at every 100px step, against 796 before — a third. The
carousel's fade-in is unchanged.

**The gap between block 8 and the ring is a third of what it was, and the
carousels fade up as they rise.** *(The 3x cover below was reverted — see the entry above. The fade-in stands.)* The gap was never a margin — it was block
8's copy taking a whole screen to clear the screen, because nothing behind it
can be seen until it has. The cover leg runs at **three times the scroll**
now (100svh of travel over a third of a viewport) while the rise stays 1:1,
so the page is pulled away rather than drifting off. The window scene is
4.83 pinned viewports instead of 5.5 and every window on it is re-expressed;
the camera move keeps its length in pixels. Measured at 1600x760: the copy
clears the screen over 253px of scroll where it used to take 760, and the
first carousel card is on screen 50px later.

The ring's contents take an `APPEAR` window again — 0.015 to 0.11 of its
progress, about 430px — so they fade up while the block is still rising. The
opacity is on a wrapper above `.zoom-ring`, never between it and its cards,
so the 3D context survives; the stage's own paper stays opaque, which is what
keeps it covering the scene it rises over. Measured: 0 at the unpin, 0.35 a
220px later, 0.91 by 460.

**The white page closes over the held frame instead of the frame being
scrolled off.** Block 8's page got its covering leg back: it rises 60svh into
place, then carries a full 100svh further so the solid paper shuts over the
shot behind it. The window scene stays pinned for both legs
(`progressEnd` back to the default, span 5.5 → 6.5 so the pinned length is
unchanged at 5.5 and every window keeps its share), so the frame itself never
travels — by the time the stage does unpin the screen is already solid paper
and the slide-off is invisible. Both legs were 1:1 with the scroll here:
measured at 200px steps, the page moved 200px per 200px from the end of the
camera move right through the unpin, and the stage's top stayed at 0 until
it. *(The cover leg runs at 3x the scroll as of the entry above — a 1:1 cover
is what put a screen of empty paper behind it.)*

The 12.5rem margin above the ring went with it. It was there from when the two
blocks met in view; now block 8 ends on a covered screen, and without the
margin the ring's first edge reaches the bottom of the screen on the very
frame the cover completes — measured at 1440x740, the film list clears the top
at the unpin and the first carousel card is already at 736 of 740. With the
margin that hand-over was 500px of white.

**The cloud pass's two lines are written by the scroll too.** Both now run in
`<WrittenLines scrub>` off their own windows, which also fixes how the
subtitle left: timed, its reverse took about a second whatever the scroll
did, and the next scene cuts in at progress 1 — so with only 150px of scene
left after the flag flipped, the last letters were still on screen when the
window sequence took over and simply vanished with it. Scrubbed, the window
*is* the stroke, so it reaches 0 exactly where the cut is. Their windows are
wider than the chapter marks' for the same reason — a written line needs the
whole stroke, not a fade's worth. Measured across the scene: question 0 →
0.69 (letter spread 0.67) → 1 → 0, subtitle 0 → 1 → 0.52 (spread 0.71) → **0
at 8580**, the exact scroll position the next scene cuts in at.

**Scroll rate, measured per frame rather than per window.** Both of these
read as "the scroll is slow", and widening windows had been making them
worse, not better.

- **The cloud pass was spending 200px of scroll on every frame** — measured
  with a pixel probe at 20px steps, against the skyline sequence's 24px, so
  eight times slower. A transition only plays `LEAD_FRAMES` of the sequence
  it hands to, and 20 of them had to cover a four-viewport scene. Raised to
  **51** — the point where the cloud pass and the window sequence after it
  come out level, since the pair spans 5624px and shares 150 frames — and the
  scene is 3 viewports instead of 4. Measured after: 47px per frame against
  the skyline's 24. The copy holds over **more than twice as many frames** as
  it did at four viewports, across less scroll, which is what "hold over more
  frames" asked for in the first place.
- **The works page now climbs at exactly the speed of the scroll.** The
  window scene is 5.5 viewports rather than 6: 60svh of climb over 0.6 of a
  viewport is 1:1, and the rise ends on the frame the stage unpins, which
  then carries everything off at that same speed. Measured at 100px steps
  from 12300 to 14100: the copy moves 100px per 100px of scroll at every
  sample, with no change of pace anywhere. At 6 viewports it crept at two
  fifths of the scroll and then sat still for the remainder — the pause.

Scrub rates across the page are now 19-47px per frame, where they ranged
19-200. The floor is a sequence being 150 frames long; closing the last of
the gap means rendering more frames, not retiming anything.

**The ring's film name is written by the scroll, and the cloud pass is back
to four viewports.**

- `<WrittenLines>` gained a **`scrub`** mode and a `setScrollProgress` handle.
  In it the letters stop keeping their own time: each one's scatter becomes a
  share of a 0-1 scrub instead of a delay in milliseconds, so the heading
  writes itself on as you scroll in and unwrites as you scroll out, at
  exactly the speed of the scroll. The ring drives it from the turn's
  distance to the film at the front; the words change at the half-step, past
  the fade, so they are swapped on a blank line. Measured: identical values
  at identical scroll positions in both directions, and no timer left.
- **The cloud pass is 4 viewports again** (`DEPART_OVER` back to 0.3). Making
  it 5 to buy reading time slowed the incoming shot underneath, which scrubs
  across the whole span — the copy was the thing that needed more room, not
  the scene. The windows are wider instead: the question holds for 858px of
  scroll and the subtitle for 915, against 515 and 457 before, in the same
  scene length.

**Five fixes around how copy enters and leaves.**

- **The hero headline no longer travels on the way out.** It still rises in
  with the rest of the chrome, but its exit is the letters sinking back where
  they stand — a lift on top of that read as the line being pulled off the
  screen. Measured across the exit: its top stays at 587px while the letters
  dissolve.
- **The cloud pass holds its two lines about twice as long.** The scene is 5
  viewports instead of 4 and the windows are wider: the question is readable
  across 1030px of scroll (was 515) and the subtitle across 1106 (was 457).
  `DEPART_OVER` drops 0.3 → 0.225 so the clouds leave over the same 0.9 of a
  viewport they always did.
- **"It all starts in one room." is centred on the screen**, like the question
  it answers, instead of sitting at the foot of it.
- **The window frame keeps zooming until it is off the screen.**
  `<ScrollSequence>` passes `progressEnd` through to `<PinnedScene>`; the
  window sequence uses `"bottom top"`, so its scrub now spans all six of its
  viewports including the slide-off, and the push in runs to the end instead
  of stopping at the unpin. Measured: 1.088 → 1.147 while the stage travels
  from 848px to 77px off the top. Every window on that scene is re-expressed
  against the longer scrub (the camera move keeps its length in pixels).
- **The ring's film name crosses over instead of cutting.** The ring reaching
  the next film sends the letters back into blur — the same reverse every
  heading uses — and the words change only once the last of them has gone
  (`LETTERS_OUT_MS`, exported from `written-lines.tsx`). The meta line under
  it fades with them. *(Superseded the same day: the hand-over is bound to
  the scroll now and that constant is gone — see the entry above.)* Measured over a boundary: "Paper Weather" goes 1 → 0.11
  with a letter spread of 0.59, the text swaps, "Upstairs" writes in at 0.72.

**Headings write themselves on and off; they are no longer faded as blocks.**
Two bugs with one cause.

- The hero's headline played its whole letter reveal **behind the preloader**,
  at 260ms after load, and was already finished when the screen opened — the
  sequence reports scroll progress 0 from the first frame, so the "letters in"
  flag was true before there was anyone to see it. It is gated on the
  preloader phase now; measured, the first letter moves at 5132ms, the frame
  the preloader leaves.
- Every `<WrittenLines>` heading sat inside its block's opacity fade, so the
  scattered reveal and its mirror were both multiplied away to a plain fade.
  The heading is out of the fade in all four places — hero, sequence captions,
  cloud pass, works intro — and the blocks fade their scrim, body copy and
  chapter mark instead. Measured on a caption's exit: the spread between the
  most and least visible letter now peaks at 0.95 while the scrim is still at
  0.68, where before it was 0 for the whole exit.

`useLettersIn` is exported from `written-lines.tsx` and replaces three copies
of the same ref-plus-state flag. ADR-0032.

**The held last frame creeps towards the camera, and the works block arrives
over a shot that is still moving.** Four things that all came back to the same
stretch of the window scene:

- `<ScrollSequence>` takes `zoomToEnd` — the scale the held picture reaches at
  progress 1, running from `frameEnd` onwards. The window sequence uses 1.15.
  The scrub runs out a fifth of the way before the scene does, and that fifth
  used to be a frozen photograph; it is now a slow push in. It is a composited
  transform on the canvas, not a repaint, and the canvas is painted at up to
  2x device pixels so 1.15 is still over the screen's own resolution.
- Block 8 now starts rising **before** the camera move ends (`RISE` 0.78 →
  0.66), so the banks drift up over a city that is still moving instead of
  over a stopped one, and the rise runs to 0.97 — all but the spring's own
  settle before the stage unpins.
- `<PinnedScene>` takes `progressStart`, the mirror of `progressEnd`. The ring
  passes `"top bottom"`, so its progress — and so the turn — begins the moment
  the block's first edge clears the bottom of the screen. The carousels are
  already mid-turn as they rise into view; measured, 0° → 38° before the stage
  has finished pinning.
- Swept 13100-15400 at 100px steps: there is no sample where the largest thing
  on screen moves less than 12px per 100px of scroll. The pause is gone.

**The ring is simply the next block, a paper margin below block 8.** The
overlap shipped above was a mistake: two translucent scenes on screen together
blended the window frames, the film list and the carousels into one another.
Reverted — `leadInViewports` is gone from `<PinnedScene>`, the ring's stage is
opaque paper again, and the ring sits `12.5rem` (200px at the grid's base
width) of paper below the works block with no entrance fade or lift, because a
block that scrolls up into place is already in motion.

Block 8 lost its own exit with it: the page no longer flies a viewport further
up than its scene, it rides the scene off the top like any pinned stage. That
flight was costing the window sequence two viewports it spent not moving, so
the scene is 8 → 6 viewports and every window on it is re-expressed against
the shorter scrub (the camera move keeps its length — only the share changes).
`--cover` is gone from `.paper-rise`. Measured across 13200-15600 at 150px
steps: copy, page and ring section all move at every sample, the gap between
the two blocks is 211px at this viewport, and the rings still turn past the
unpin (−118° → −145°). ADR-0030 revised.

**The carousels start rising while "Selected works" is still leaving.** The
previous fix closed the gap in the sense that nothing was ever *missing* from
the screen, but the two blocks still met end to end: the copy left, and only
then did the ring begin. Read as a hole all the same. `<PinnedScene>` gained
`leadInViewports` (default 1) so a lead-in scene can begin further above its
own section; the ring passes `2`, and its paper background moved off the stage
onto its own layer that fades in late (`PAPER_IN [0.235, 0.245]`, written with
`api.set` so the hand-over cannot lag a frame behind the scroll). Measured: the
ring's top edge moved a full viewport earlier, the two blocks now share 1075px
of scroll where both are on screen, and across that stretch the ring's paper
never washes out the copy still printed above it. ADR-0030 extended.

**The blank screen between the works block and the ring is gone.** The page
left on 100svh while the copy printed near its foot cleared the screen after
about 80 — so the last fifth of the exit was scroll spent on an empty page.
Measured before: no content at all between y≈15750 and y≈16300, about 0.6 of a
viewport. The exit is 80svh now; swept at 50px steps across 14600-16800 there
is no longer a single position where the copy has gone and the ring has not yet
arrived. ADR-0030 extended with the rule.

**The works copy rides the page both ways, and the ring stops arriving late.**

- The headline and list now take **the page's whole move**, not just its exit:
  they rise in with the paper and leave with it. Before, they faded in while
  standing still as the page climbed in under them. Measured across the block:
  copy and page never drift apart by a pixel, and no sample is static.
- The block's windows run edge to edge — rise straight into cover — so there
  is no beat anywhere in it.
- **The ring's appear window is less than half** (0.128 → 0.055). Its stage is
  opaque paper, so the fade was a blank page on screen: 0.76 of a viewport
  before the carousels read, now 0.3. The hand-over itself was already tight —
  the copy clears exactly as the ring's section begins.

ADR-0030 extended with both rules.

**The works block never pauses, and the ring keeps turning on its way out.**

- The page now starts leaving **the moment the copy finishes arriving** — the
  short reading beat between them is gone. Swept across the whole stretch,
  nothing is static any more: measured at every 4% of the scrub, either the
  opacity or the lift is changing throughout.
- The ring's entrance lift is **halved**, 38svh → 19svh.
- **The ring keeps turning as it leaves.** `<PinnedScene>` ended its progress
  where the stage unpins, so the rings froze for the last viewport while the
  block slid toward the footer. It gained a `progressEnd` prop; the ring passes
  `"bottom top"` so progress spans the slide-off too, and its windows are
  scaled to the longer range. Measured past the unpin: rotation carries on
  −126° → −137° → −150° where it used to hold still. ADR-0030 extended.

**The works block stops standing still, and the ring arrives from below.**

- **"Selected works" now leaves with the page.** The copy used to fade out
  where it stood while the paper carried on up; it now rides the same lift, so
  the torn edge and everything printed on it go together. Measured: it holds
  full opacity and travels a whole viewport up.
- **The dead stretch before it is gone.** The window sequence reaches its last
  frame at 0.557 and holds, so from there `<WorksIntro>` is the only thing
  moving — and its windows had a gap of roughly a viewport and a half where
  neither the frame nor the page did anything. The windows are now packed back
  to back, leaving only a short beat to read the list. ADR-0030 extended with
  the rule.
- **The works ring rises into place** rather than simply fading up: the whole
  block starts 38svh low and lifts as it fades, over a longer appear window.
  The lift is on a new wrapper because `.zoom-ring` already owns a transform
  and a second one would have replaced it.

**Cursor patch softened, headings leave the way they arrive, and the intro
hands over later.** Six adjustments.

- **The pixel patch has no rim and trails the cursor.** Clipping three bands to
  `arc()` drew the circles it was clipping to. The chunky copy is now masked
  with a radial alpha ramp instead, so it dissolves into the sharp frame, and
  its centre eases toward the pointer rather than being pinned to it — the lag
  is what makes it read as a wave rather than a sticker. ADR-0031 updated.
- **Headings now leave in reverse** — the same scattered order, `easeIn`
  against the entry's `easeOut`, where they used to reset instantly. This
  needed a new `show` prop: on its own the component only counts a heading as
  hidden once it is **already fully transparent**, so the reverse played
  unseen. Measured before: the block hit opacity 0 with every letter still at
  1. After: the reverse is under way at 0.6 opacity. ADR-0028 updated.
- The **studio** and **what-we-make** captions arrive earlier in their scrub
  (`fadeIn` [0.3, 0.4] → [0.16, 0.26]).
- The cloud-pass question is **centred on the screen and white**, which brought
  back the `--ink-over-image` token — see [[design-system]].
- The **hero arrives as the preloader leaves** (phase `done`) instead of part
  way through the screen opening. Measured: preloader gone at 5045 ms, hero
  starts at 5153 ms.

**A chunky-pixel patch follows the cursor across the sequences.** Moving a
mouse over a sequence breaks the frame into blocks under it, coarsest in the
middle and finer toward the edge of the disc.

- Drawn on the **2D canvas the sequences already use**, not in a shader: the
  region is snapshotted, downscaled and drawn back with smoothing off, three
  concentric bands deep. A shader would have meant a second rendering path
  beside the canvas for an effect that is a handful of `drawImage` calls.
  Measured with the cursor moving every frame: median 16.7 ms, p99 19.2 ms,
  nothing over 32 ms.
- Every band derives from **one clean snapshot** of the region. Chunking a band
  out of the band before it would compound into mush.
- New `src/lib/animation/pointer.ts` — one shared `pointermove` listener,
  reference-counted like the ticker beside it, **polled** from each sequence's
  ticker callback. Subscribing through React state would re-render the scene on
  every mouse move.
- Repaint is gated on the pointer being inside that canvas and having moved, so
  an off-screen sequence never repaints; one extra repaint fires as the pointer
  leaves, or the patch stays stranded on the frame. Mouse only.
- Opt in with `pixelateOnHover` on `<ScrollSequence>`; on for all three
  sequences, off for the transition scenes.

ADR: [[decisions-log]] ADR-0031.

**The picture never rests, and the clouds got cheaper to move.** Three
complaints against the curtain: it stuttered on scroll, the cut-outs read as
shapes poking in from the edges, and the sequences were still visibly
stopping and starting.

- **A transition now scrubs the incoming shot** instead of holding a still:
  it plays the first 20 frames of the next sequence under the clouds, and the
  sequence resumes from exactly there through a new `frameStart` prop on
  `<ScrollSequence>`. Nothing on screen is a frozen frame any more. ADR-0030.
- **Each cut-out animates its own transform**, in percentages of its own
  width, instead of a `--meet` custom property feeding CSS `calc()`. A custom
  property is not composited, so every frame invalidated style for the whole
  subtree; percentages keep it compositor-only *and* hydration-safe, where a
  measured pixel distance would differ between server and client.
- **The blur is baked into the assets** (`cloud-N-soft.webp` / `-deep.webp`,
  generated with `sharp`, padded so the halo is not cut flat). A live
  `filter: blur()` on a 200vw element is re-run every frame it moves. They are
  WebP as well: 29-75 KB against 200-470 KB as PNG. The `--blur-curtain-*`
  tokens and the `.cloud-meet` rule were removed with the old approach.
- **The cut-outs are much larger and all run off at least two edges.** One
  whose silhouette ends inside the frame reads as a sticker rather than as
  weather.

ADR: [[decisions-log]] ADR-0030, and ADR-0029 updated for the new mechanics.

**Sequences now hand over inside a cloud curtain.** Both transitions between
sequences use one shared `<CloudMeet>`: four hand-painted cut-outs drift in
from opposite sides, overlap across the screen, and carry on out the far
side. It replaces **two** unrelated mechanisms doing the same job — the
diagonal brush mask in `<SkyWipe>` and the rising column in `<CloudPass>`.

- **The pass starts inside the sequence before it.** `approach(0.7)` runs on
  the outgoing sequence's own progress and brings the clouds to full cover by
  the time it ends; `depart` runs on the transition scene and takes them out.
  Confined to the transition scene, the curtain left both held frames — the
  end of one sequence and the start of the next — sitting in the open for a
  few hundred pixels of scroll on either side of the seam.
- **The cloud progress is `set`, not sprung.** It is the scroll position, so
  motion of its own only makes it lag — and the lag showed up precisely at the
  meeting point: mid-scroll the clouds sat 117 px short of centre and crept
  into it after scrolling stopped, which read as a jerk in the middle. They
  also lagged the frames, which are scrubbed exactly. Now 0 px off at the seam.
- **Both halves are linear**, so the pass is one even drift. They were eased
  at first, to keep a held frame hidden; scrubbing the incoming shot removed
  that need, and what was left just looked like the clouds lunging. `depart`
  also takes an `over` share, because `<CloudPass>` is four viewports long for
  its captions and spreading the departure across all of it had the clouds
  leaving at a third of the speed they arrived (1.23 px per scroll px in
  against 0.37 out; now 1.16-1.29 everywhere).
- Because a transition now **opens already covered**, it no longer paints the
  outgoing last frame itself — that layer and the `outgoingFrame` field are
  gone. The flip side is that a transition scene renders as a full-screen
  cloud fill at rest, which is only harmless because both are `leadIn` scenes
  whose stage `<PinnedScene>` keeps hidden until reached.
- **Two compositions, `drift` and `swell`**, differing in the side, size and
  height of every cut-out, so the two passes do not read as the same shot
  twice. Both halves of one transition share a composition, or the clouds
  would change shape at the scene boundary.
- **More blur**, on its own tokens (`--blur-curtain-near` / `-far`, about 5 and
  9 px) rather than the lighter drifting-cloud blurs the other scenes use:
  softness is what keeps four cut-outs reading as one bank.
- A flat `--cloud` fill rises behind the cut-outs across the middle of the
  pass — four shapes cannot promise a seam-free cover at every aspect ratio.
- The spring hands CSS a bare 0-1 (`--meet`) and `.cloud-meet` computes the
  travel: a `var()` inside an animated `transform` string breaks hydration.
- `.wipe-mask`, `.cloud-column`, `.zoom-cloud` and the `--cloud-zoom` token
  served only the old mechanisms and were removed with them, along with a
  resize-measuring effect in `<CloudPass>` that derived the swap point from
  the column's rem height.
- The four cut-outs moved from `public/assets/Clouds/` to
  `public/assets/home/cloud-1..4.png`, matching the section-folder convention.
  They arrive as a `clouds` prop, so the component holds no asset paths.

ADR: [[decisions-log]] ADR-0029.
**Headings now resolve out of blur, letter by letter.** `WrittenLines` used
to draw each word in like a brush stroke; it now fades every letter up from
`blur(12px)` and `opacity: 0` over 560 ms, with the letters' starts scattered
across a 460 ms window instead of running left to right. Reference for the
look was trionn.com; the implementation is our own.

- The scatter is **hashed from each letter's position**, not `Math.random()`:
  a random order drawn during render differs between server and client and
  trips a hydration mismatch, and it would reshuffle every time a heading
  scrolled back into view.
- Blur returns to `none` rather than `blur(0)` at rest, so a settled heading
  does not hold a composited layer per letter.
- Letters are split into their own elements, which is poor for screen
  readers, so each line also carries an `sr-only` copy of the whole line and
  the split copy is `aria-hidden`.
- **This stays a custom component rather than `spring-text-engine`** (hard
  rule #1). The engine takes arbitrary `letterIn`/`letterOut` properties, so
  blur and opacity would have worked, but its per-letter timing is only
  `letterStagger × sequential index` — there is no scattered order. ADR-0028
  records that, and [[text-engine]] now records the wider divergence: nothing
  in `src/` imports the engine at all.

`WrittenLines` is shared, so this changes the hero headline, the cloud-pass
question, the sequence captions, the works intro, the film titles, the burger
menu and the marquee together.

ADR: [[decisions-log]] ADR-0028.

## 2026-09-09

**All sequences play by scroll only; timed playback removed.** The two sections
added earlier today played themselves on reaching the viewport; they are now
scrubbed like the first, so the home page is three stacked `<ScrollSequence>`
sections and reads as one continuous timeline (12 viewports at the default
`scrollViewports` of 4). `<AutoplaySequence>` is **deleted** rather than left
unused — with no consumer it would only be a second, divergent way to do this.

`useImageSequence` and the load-on-approach behaviour stay: they were never
about the trigger, and they still hold the DPR / cover-fit / deferred-fetch
work. `usePrefersReducedMotion` also stays — `<CrtOverlay>`'s scanline drift
still needs it. ADR-0027 rewritten to record scroll-only as the decision.

**Two more sequences, stacked below the first, playing on arrival.** The home
view is now three sections in normal flow: the original skyline sequence,
scrubbed by scroll, then two that play themselves once they reach the viewport.

- New `<AutoplaySequence>` (`components/common/autoplay-sequence.tsx`), driven
  by `useLoopInView` so it runs on the shared rAF ticker **only while on**
  **screen**. Playback is time-based, not one frame per tick — the ticker
  throttles to a *minimum* gap, so counting ticks would let the real rate drift
  with the display refresh rate. Default 24 fps.
- `loop` is **off by default**: none of the three sequences ends where it begins
  (last-vs-first frames differ by 49–80 of 255), so looping visibly jumps.
- New `useImageSequence` hook holds the canvas half — decode, cover-fit draw,
  redraw on resize — so `<ScrollSequence>` and `<AutoplaySequence>` share it
  instead of duplicating ~80 lines of DPR and cover-fit maths.
- **Frames now load one viewport before they are needed**, not at first paint. A
  1920x1080 frame costs ~8 MB decoded, so eagerly decoding 450 of them was both
  ~39 MB on load and a large amount of image memory for content nobody may
  scroll to. Measured: at the top only sequence 1 fetches (150 frames); one
  viewport before sequence 2 it is ~78 frames in; sequence 3 has fetched nothing.
- Assets: `Comp 2` / `Comp 3` re-encoded PNG → WebP, **480 MB → 24.7 MB**. The
  existing folder was renamed `sequence` → `sequence-1` so all three match; the
  manifest moved to `data/home/sequences.ts`. New masters gitignored, and they
  still want moving out of `public/` — everything under it is deployed.

ADR: [[decisions-log]] ADR-0027 · [[hooks]] · [[components/common]].

**CRT overlay reworked — thicker lines, drift, no moire, edge vignette.**
Four changes after comparing against the reference:

- **Scanline period 3px → 4px.** Thicker, and the real fix for the diagonal
  artifacts: at 3px the period is 4.5 device pixels on a 1.5x screen, so the
  lines could not land on whole pixels and beat against the image underneath.
  4px is 4/6/8/12 device px at DPR 1/1.5/2/3 — the period must stay an even
  integer or the moire returns.
- **The lines now drift slowly upward.** A looping `useSpring` with a linear
  easing (hard rule #1 — no keyframes) writes a unitless 0–1 into
  `--overlay-scanline-drift`; CSS turns it into `calc(period * drift * -1)`.
  The spring deliberately carries a bare number: a `var()` inside an animated
  `transform` string serialises differently on server and client and trips a
  hydration mismatch. The layer is one period taller than its container so the
  wrap is seamless, and the transform is compositor-only — no repaint.
- **Vignette is now an inset `box-shadow`, not a `radial-gradient`.** A centred
  ellipse pooled in the middle of each edge and left the corners weak; an inset
  shadow hugs all four edges and doubles up in the corners, which is what the
  reference actually does.
- **`<CrtOverlay>` is now a client leaf** (it was a Server Component) because of
  the drift.

New hook `usePrefersReducedMotion` (`hooks/use-prefers-reduced-motion.ts`):
`<ReducedMotion>`'s global `skipAnimation` is enough for a spring that settles
but **not** for one with `loop: true`, which finishes each cycle instantly and
restarts forever. Anything looping must read the hook and set `loop`/`pause`.
ADR-0026 rewritten to match · [[hooks]] · [[design-system]] · [[components/common]].

**Site-wide CRT overlay — scanlines, vignette, grain.** `<CrtOverlay>`
(`components/common/crt-overlay.tsx`) mounts once in the root layout and lays
three stacked layers over every page: horizontal TV scanlines, a corner
vignette, and a light film grain. Static CSS, so it is a **Server Component** —
no client boundary, no JavaScript, no per-frame work, and no collision with
hard rule #1 (an animated flicker would need banned keyframes). The grain is an
inline `feTurbulence` SVG data URI, so nothing is added to `public/` and there
is no extra request. Eight new `--overlay-*` / `--layer-overlay` Tier 2 tokens
tune the whole effect from `globals.css`; the gradients are `.crt-*` classes
and are the first occupants of `@layer components`. Decorative throughout:
`aria-hidden` + `pointer-events-none`. ADR: [[decisions-log]] ADR-0026 ·
tokens: [[design-system]] · catalog: [[components/common]].

> Reference for the look was pxpush.com. The techniques are standard
> (gradient scanlines, radial vignette, turbulence noise) and this is an
> independent implementation — no markup, CSS or asset was taken from it.


**Home scroll sequence — 150 frames scrubbed by scroll.** `<ScrollSequence>`
(`components/common/scroll-sequence.tsx`) draws an image sequence into one
`<canvas>` and maps `<ProgressTrigger>` progress onto the frame index, so
scrolling scrubs it like a timeline. It is the first section on the home view.
The frame manifest lives in the new `src/data/` folder
(`data/home/scroll-sequence.ts`) and reaches the component as a prop, so the
component holds no asset paths. Deliberately no spring on the index — it is
discrete, and `<ProgressTrigger>` is the raw-progress primitive for exactly this.
ADR: [[decisions-log]] ADR-0025 · catalog: [[components/common]].

**Frames re-encoded PNG → WebP: 244 MB → 12.9 MB.** The 150-frame 1920×1080
source export averaged 1.6 MB per PNG — unusable over a network. Re-encoded at
WebP q80, full width, they average 88 KB (~19× smaller) with no visible
difference on this painterly source. Served frames are `public/assets/sequence/`;
the PNG masters stay in `public/assets/Comp 1/`, now gitignored, and **should be
moved out of `public/` entirely** — anything under it is deployed. Re-encoded
with `sharp`, which ships inside `next`, so no dependency was added.

**`body` no longer caps the document height.** The starter shipped
`body { display:flex; …; height:100vh; width:100vw }` to centre the empty home
view. `height: 100vh` meant no page taller than the viewport could scroll — the
first real section measured 2856 px of content against a 1785 px document — and
`width: 100vw` added a horizontal scrollbar whenever a vertical one appeared.
Now `min-height: 100svh; width: 100%`, in normal flow. This unblocks **every**
scrolling page, not just the sequence. ADR: [[decisions-log]] ADR-0024 ·
[[design-system]].

---

## 2026-09-08

**`optimize-3d-scene` skill — resize no longer switched off on touch.** §13 of
the skill (and `patterns.md` §5 / §14) told agents to attach *no* `resize`
listener on the mobile tier, to dodge the iOS URL bar. That also removed the
only path that could react to a breakpoint drag, a rotation or DevTools
emulation being turned off, so a scene loaded as a phone kept its phone
framebuffer, frame budget, parked pointer and hidden desktop passes on a desktop
viewport and rendered skewed. The skill now listens on every tier, ignores
height-only changes on a coarse pointer, and re-reads the tier on a width
change or a pointer-media-query flip, with a `retune()` that re-applies DPR,
budget, visibility, draw range and pointer binding without compiling a program.
§2 and §11 of `SKILL.md` and the [[optimize-3d-scene]] workflow note were
updated to match; §14 gained a tier-switch round-trip check. Reasoning in
[[decisions-log]] ADR-0023. Measured on the project that surfaced it: phone
390×844 / 3 draws ↔ desktop 2160×1350 / 4 draws, program count unchanged.
