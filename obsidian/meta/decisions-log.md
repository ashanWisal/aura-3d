---
tags: [meta, decision]
updated: 2026-10-21
---

# Decisions Log (ADRs)

Why this project's conventions are what they are. Each entry records a decision,
the reasoning behind it, and what it constrains when you build.

These are **inherited from the starter** — they explain the rules in `AGENTS.md`
and across the vault, and notes link to them by number. Add your project's own
decisions on top, continuing the numbering. Amending an inherited decision is
fine; write a new ADR that says so rather than editing the old one.

Template: [[templates/adr-note]].

---

## ADR-0037 — Aura: the headphones are modelled in code, not downloaded

**Status:** accepted · 2026-10-21

**Context.** Aura (forked from Abyss) is a product page whose story needs one
model to come apart into its inner parts and be repainted per finish. Free
headphone models (Poly Pizza, Sketchfab CC) are single shells with no inner
parts, and most need a sign-in or a CC BY credit.

**Decision.** `src/views/home/headphones/headphones.tsx` builds the Aura One
from three.js primitives (torus, lathe, cylinder, rounded box). Every cup part
is its own `<Part>` that slides along the cup axis on a staggered slice of the
explode; materials are shared and ease towards the colourway in the product
store. Lighting is built in the scene (`<Lightformer>`s), so there is no HDR
or model download at all.

**Consequences.** Zero 3D asset bytes and nothing to credit. A real product
model can replace it later: keep the `getExplode` contract and split the glTF
into the same seven parts. The Abyss scene, its models and ADR-0036's
lighting rules no longer apply to this project.

---

## ADR-0036 — Dive set pieces are lit by the materials, not by more lights

**Status:** Accepted · 2026-10-20

**Decision.** Things added to the WebGL dive do not bring their own real-time
lights. An object that must read in black water gets a faint emissive tint on
its own material (`useModel`'s `glow`), and large surfaces use the cheapest
material the look survives (the trench walls are `MeshLambertMaterial`).

**Why.** Three obstacle point lights took the whole dive from ~60 fps to
29–48 fps on an Intel UHD 620 — every light is paid by every lit pixel on
screen, not just near its object. Removing them and switching the trench to
Lambert measured (production build, same footing): trench 30 → 41 fps,
2 100 m 44 → 47 fps, floor 29 → 31 fps, programs linked by the floor 22 → 16.
The cost: the deep shark reads as a flat blue silhouette rather than a lit
body.

**When building.** Add a light only when the scene is *about* that light (the
searchlight, the vents, the source). Per `optimize-3d-scene` §8.

---

## ADR-0031 — The cursor breaks the frame into chunky pixels, on the 2D canvas

**Status:** Reverted · 2026-10-01 · removed 2026-10-01 at the client's request, along with `pointer.ts` — it was also a 16fps canvas repaint under the cursor on every sequence

**Decision.** Moving a mouse over a sequence shows a disc of chunky pixels
under it. It is drawn on the **existing 2D canvas**, right after the frame: the
region is snapshotted, downscaled, and drawn back with image smoothing off, in
one pass, then masked with a radial alpha so its edge dissolves. Opt in per
sequence with `pixelateOnHover`.

**Why not WebGL.** A shader is the usual way to do this and the reference site
uses one, but it would mean a second rendering path next to the 2D canvas the
sequences already paint into — a texture upload per frame, a context, and a
fallback. Re-chunking a region of a canvas that is already there is a handful
of `drawImage` calls. Measured with the cursor moving every frame: median
16.7 ms, p99 19.2 ms, nothing over 32 ms.

**Why a radial alpha mask and not a clipped circle.** The first version drew
three concentric bands, each clipped to its own `arc()`. Clipping to a circle
draws the circle: the patch ended on a visible rim and the bands read as rings.
The chunky copy is now built once in an offscreen canvas and has a radial alpha
ramp punched through it (`destination-in`) before it lands, so it melts into
the sharp frame with no edge anywhere. `PIXEL_CORE` is how much of the radius
stays at full strength before the ramp starts.

**Why the patch trails the cursor.** Its centre eases toward the pointer by
`PIXEL_FOLLOW` of the remaining distance each tick rather than being pinned to
it. Pinned, it reads as a cut-out stuck to the cursor; lagging, it reads as a
wave running after it. Entering the canvas jumps straight to the pointer —
easing in from the last known position would send the patch sliding across the
frame. The repaint gate follows the eased centre, not the pointer, so it keeps
painting until the patch has caught up.

**Why the pointer is polled, not subscribed.** `pointermove` fires far more
often than a frame, and routing it through React state would re-render the
whole scene on every move. One shared listener keeps the position in a module
(`lib/animation/pointer.ts`, reference-counted like the ticker next to it) and
each sequence reads it from its own ticker callback — so a moving cursor costs
a canvas repaint and no React work at all.

**When building.** The repaint is gated twice over: nothing happens unless the
pointer is **inside this canvas's rect** and has moved at least a pixel, which
also means an off-screen sequence never repaints. One extra repaint fires as
the pointer leaves, or the patch would be left stranded on the frame. Only a
mouse counts — a touch drag also fires `pointermove`, and treating it as a
hover strands the patch wherever the finger lifted. The effect is off by
default; the transition scenes do not use it, since their picture is behind
cloud for most of its life.

---

## ADR-0032 — A written heading owns its own opacity

**Status:** Accepted · 2026-10-01 · amends ADR-0028

**Decision.** A heading rendered with `<WrittenLines>` is **not** inside its
block's opacity fade. The block fades its scrim, its body copy and its chapter
mark; the heading is carried in and out by its letters alone, and the block
tells it where it is: `show` with the exported `useLettersIn` flag when the
block's own timing decides (the hero, the sequence captions), `scrub` with
`setScrollProgress` when the scroll does (the cloud pass, the works ring), or
nothing at all when the heading sits in document flow and its own visibility
is the right trigger (`<WorksList>`) — see the scrubbed rules below.

**Why.** The letters are the heading's whole appearance: they surface out of
`blur(12px)` in a scattered order and sink back the same way. Multiply that by
a block fade and the product is a uniform fade — the scatter happens, but every
letter is scaled by the same number, so nothing reads except the block. Both
the reveal and its reverse were being performed under a curtain. Measured
before: during a caption's exit the letters' spread across the heading never
rose above 0 while anything was visible; after: it peaks at 0.95 with the scrim
and body still at 0.52-0.86, so the dissolve is on screen where the reader is.

**A scroll-driven flag is not the same as "the reader can see it".** The hero's
headline wrote itself in at 260ms after page load, behind the preloader, and
was sitting there finished when the screen opened onto it — the scrub reports
progress 0 from the first frame, so the flag that says "we are at the top of
the page, letters in" was true before anyone was looking. A flag like that has
to be gated on whatever makes the block visible as well, here the preloader
phase. Measured after: the first letter moves at 5132ms, the frame the
preloader leaves.

**Its exit is a dissolve, not a departure.** A heading may rise in with its
block — it is arriving with everything else — but it must not travel on the
way out. The letters sinking back where they stand reads as the line being
unwritten; the same letters sinking back while the line slides upward reads as
the line being dragged off, and the two fight. Entrances can move, exits
dissolve.

**A heading inside a scrubbed scene is written by the scroll, not by a
clock.** `<WrittenLines scrub>` turns each letter's scatter from a delay in
milliseconds into a share of a 0-1 scrub, and the scene pushes that value in
through `setScrollProgress` on the ref — the same imperative handle every
other scroll-driven overlay here uses, so no re-render per tick. Scrolling
back up unwrites the heading through exactly the states it wrote it in; a
timed version cannot do that, and on a page where everything else answers the
wheel it reads as the one thing running away on its own.

**A timed reverse cannot be trusted to finish inside its scene.** Scenes on
this page hand over on a cut: the next one is a `leadIn` and takes the screen
at progress 1. A heading whose exit runs on a clock has no idea where that
is — the cloud pass's subtitle started a one-second reverse with 150px of
scene left, and whatever had not faded by the cut went with the scene. Bound
to the scroll, the window *is* the stroke and reaching 1 means the line is
gone. Any heading in a scene that ends on a cut takes `scrub`, not `show`.

**Size a written line's window by the stroke, not by a fade.** A faded
element can cross its window in a tenth of it; a written one needs the whole
width to put every letter down, scatter included. The cloud pass's two lines
carry windows roughly half again as wide as the chapter marks beside them,
which fade.

**Swap the words where the scrub puts the heading at zero.** A heading whose
text changes in place — the ring's film name — cuts if the new words are
mounted while the old ones are still on screen. Scrubbed, there is a natural
place for it: the ring's name is blank by `NAME_FADE` (0.45 of a film step)
and the step itself changes at 0.5, so the words are always swapped on a
blank line. Do not key the element on its text either: a remount throws away
the springs mid-exit, which is the same cut by another route.

**When building.** `useLettersIn` is the flag: a boolean that only re-renders
when it flips, because scenes set it from a scroll callback that runs every
tick. Pass the window's **edges** — letters in as the block starts arriving,
out as it starts leaving — not the block's eased opacity, so the write and its
reverse both run inside the window rather than at its edges. See
[[components/common]] and [[text-engine]].

---

## ADR-0035 — The preloader is a window onto the page, opened in one move

**Status:** Accepted · 2026-10-01

**Decision.** The preloader's screen is a hole, not a picture: paper is
masked to the *inverse* of the screen shape (`.intro-surround`, a full
layer `exclude`d with the screen SVG), and a full-bleed paper layer inside
fades away as the exit starts, so the live page — canvas and hero — shows
through. The exit is one spring value with one easing; the two CSS sizes
the screen interpolates between are both driven by it, so the window grows
linearly in that value and the curve lives in one place.

**Why a window.** A still of the first frame inside an opaque overlay hides
everything the page does during the exit. Moving the hero's start earlier
(to `revealing`) only moved its entrance further behind the still — it was
98% written by the time the overlay unmounted, which read as the animation
being gone. Anything meant to be *seen* entering during an intro has to be
on the page, not on the overlay, and the overlay has to let it through.

**Why one move.** Two eased steps chained in time are two velocity curves:
an ease-out followed by an ease-out decelerates, then restarts at full speed
— measured as a per-frame width step of 4 jumping to 22. One value with one
curve cannot do that; derived stages (paper clearing, ASCII fading, chrome
fading) are ramps on that value, so they share its pace.

**When building.** Before chaining eased animations that move the same
thing, check the velocity at the seam — if the first is still moving when
the second starts, or ends at rest while the second starts at speed, merge
them into one value. And for any overlay that ends by revealing the page,
make the reveal a hole rather than a matching picture, or the page's own
entrances are wasted.

---

## ADR-0034 — Blocks that must hold a distance share one motion system

**Status:** Accepted · 2026-10-01 · supersedes the `api.set` rule in ADR-0030

**Decision.** Content whose position the reader reads against a neighbour —
a heading above a carousel, a list above a block — lives in **document flow
with that neighbour**, on one sheet, and moves with the native scroll. Script
may drive what sits *behind* such content (a rising page, a cloud bank, a
held frame), never the content itself. "Selected works" and its index moved
out of the pinned window scene into `<WorksList>`, a plain block on the same
paper sheet as the works ring; `<WorksIntro>` kept only the page.

**Why.** The copy was printed on the page and lifted with it by script —
read the scroll on the ticker, write a transform. The ring after it sat in
flow and moved with the compositor. Those two can never agree frame for
frame: a spring (`api.start`) lagged by hundreds of pixels; `api.set` still
lagged by the frame between the ticker reading the scroll and the compositor
moving the flow content, and a frame at scroll speed is 15–50px of visible
wobble between two adjacent blocks. No tuning of the script side closes
that; only putting both blocks on the same side does. Measured per frame
while scrolling: the list-to-ring distance now has a spread of 0.

**What script is still for.** The page under the copy still rises by script
(it has to — it is pinned over a held frame), on a plain composited transform
rather than CSS custom properties in a `calc()`, which the style engine had
to recalculate on every tick. Its lag against the native sheet is 1–2 frames
and lands on paper over paper, where nothing can be seen to move.

**When building.** Before driving an element from scroll progress, ask what
it will be seen next to. If the answer is "a block in flow", it belongs in
flow too. Measure such distances in motion, sampling per frame — a settled
page hides this entirely. See [[components/common]] and ADR-0030.

---

## ADR-0033 — Pace a scrubbed scene in pixels per frame, not in viewports

**Status:** Accepted · 2026-10-01 · amends ADR-0027 and ADR-0030

**Decision.** The unit for "does this scroll at a normal speed" on this page
is **pixels of scroll per frame of picture**, measured, not the number of
viewports a scene occupies. Every scrubbed scene is kept inside the same band
as its neighbours. A scene that feels slow is lengthened or shortened by that
number; copy windows are fitted inside whatever it gives.

**Why.** Twice in a row a scene was made longer to give its copy more time to
be read, and twice it came back as "the scroll is slow here" — because the
copy was never the thing that was stalling. The cloud pass carried only
`LEAD_FRAMES` (20) of the sequence it hands to, so a four-viewport scene was
spending 200px of scroll on each one, measured with a pixel probe against the
skyline sequence's 24px. Reading time in pixels went up; the picture stood
still for longer. Copy wants **frames** under it, which is what the reader is
actually watching; viewports are just what it costs.

**A transition and the sequence after it share one budget.** `leadShare` ties
them: whatever the transition plays, the sequence resumes from. So their
rates trade against each other, and the level point is the one that divides
the 150 frames in proportion to the two scenes' lengths — 51 for the cloud
pass and the window sequence. There is no setting that makes both as fast as
a full sequence; that needs more frames rendered.

**Hand a scene over at the speed it was already moving.** The works page
climbs 60svh, so its rise window is sized to make that 1:1 with the scroll
and to end exactly where the stage unpins — the unpin then carries it off at
the same 100%. Measured at 100px steps, the copy moves 100px per 100px of
scroll from the end of the camera move until it is off the screen. The pause
people kept reporting was never a stop: it was a stretch at two fifths of
scroll speed followed by one at full speed, and the step between them.

**When building.** Measure, do not estimate: sample a patch of the canvas at
20px scroll steps and count how often it changes. Scene lengths, `frameEnd`,
`LEAD_FRAMES` and the copy's windows are one system — change any of them and
re-measure the rest. See [[components/common]] and [[decisions-log]] ADR-0030.

---

## ADR-0030 — The picture never rests: a transition scrubs the incoming shot

**Status:** Accepted · 2026-10-01 · builds on ADR-0029

**Decision.** A transition scene no longer paints a still. It runs its own
`useImageSequence` over the **opening frames of the incoming sequence** and
scrubs them on its own scroll progress; the incoming `<ScrollSequence>` then
resumes from exactly there through a new `frameStart` prop. Combined with
ADR-0029's split pass, nothing on screen is ever a frozen frame: the outgoing
shot plays until the clouds cover it, the incoming shot plays under them, and
it is already moving by the time they part.

**Why.** Each sequence reaches its last frame and holds it, and the next one
opens on a held first frame; the transition in between showed one still image
for its whole span. Hiding the seam behind clouds dealt with the cut but not
with the stillness — the clouds parted onto a photograph that only started
moving once the next section took over. A shot that stops moving reads as a
loading state, which is the one thing a scrubbed page must never look like.

**Why `frameStart` rather than letting the sequence restart.** Without it the
sequence would snap back to frame 0 the moment it took over, undoing the
hand-over the clouds just hid. `frameStart` is a 0-1 share, and the share the
transition covered is derived from the same `LEAD_FRAMES` constant that slices
the frames, so the two cannot drift apart. Measured at the seam: the
transition's last frame and the sequence's first differ by about as much as
two adjacent frames, and by four times that from frame 0 — it continues rather
than restarting.

**Size an exit by the distance it actually needs, not by a round number.**
*(Superseded for block 8, which no longer has an exit of its own — the rule
stands for any scene that does.)* The works page left on 100svh, but copy
sitting near its foot clears the screen after about four fifths of that. The
last fifth was scroll spent on a page with nothing on it. A travel longer than
what the content needs to clear buys dead scroll, and dead scroll on a plain
surface reads as a hole.

**Copy printed on a moving surface takes the surface's move.** *(Superseded by ADR-0034: the copy is no longer printed on the surface at all — it sits in document flow with the ring. The rule still holds for anything that genuinely rides a scripted surface.)*
`<WorksIntro>`'s list and headline share the exact expression `.paper-rise`
uses, so they rise in with the page rather than fading in where they stand.
Measured across the block, the two never drift by even a pixel.

**A fade-in on an opaque stage is a blank page — unless the stage is moving.**
`<WorksRing>` sits on solid paper, so scroll its contents spend fading while
the block is already *in place* is a reader looking at nothing: a 0.13 appear
window once put a blank page on screen for 0.76 of a viewport. Fading while
the block is still **rising into view** is a different thing — the sheet is
travelling, so there is motion to watch, and the fade lands before it does.
The rule is about where the window sits, not how long it is: keep it inside
the rise.

**A scene that drives something must keep driving while it leaves.**
`<PinnedScene>` ends its progress at `"bottom bottom"` — the moment the stage
unpins — which is right when the next scene cuts in on its last picture. It is
wrong when the stage then **slides away in view**: whatever the progress drove
freezes for that last viewport, right as the reader scrolls on. The works ring
turned, stopped dead, and was carried off still. Scenes in that position pass
`progressEnd="bottom top"`, which stretches progress across the whole section
including the slide-off, and scale their own windows to match.

**A held shot is covered, not carried away.** Two ways to get a scrubbed
scene off the screen: let the stage unpin and scroll the picture off the top,
or keep it pinned and bring something over it. They look nothing alike — the
first reads as the shot being dragged away, which is exactly what a page that
has been holding still should not do. Block 8's page climbs a further 100svh
over the held frame instead, and the scene stays pinned for all of it; the
unpin happens behind a screen that is already solid paper, so nothing is seen
to move. A scene that ends this way uses the default `progressEnd` and pays
for the cover in span.

**Two blocks that must keep a fixed distance must be driven the same way.**
A block in document flow moves exactly with the scroll. A pinned block driven
through a spring (`api.start`) lags it by however far the wheel moves before
the spring catches up — a settled page cannot show this, only a measurement
taken *while* scrolling can. Block 8's copy and the ring that follows it
drifted apart by that lag on every scroll until the copy's progress was
written with `api.set`. The rule from ADR-0029 for the clouds — a value that
*is* the scroll position must not have motion of its own — applies to any
overlay whose position is read against a neighbour in flow. And measure
such distances in motion, sampling per frame, not after a settle.

**Close a gap by moving the next block, not by changing the scroll's pace.**
Running block 8's cover at three times the scroll to shorten the gap behind it
was reverted the same day: it broke the one thing the page had got right —
everything moving at the speed of the wheel — and the gap did not read as
smaller. The ring is pulled up into the end of block 8 instead (now the whole copy-and-ring sheet, `-mt-[115svh]` — see ADR-0034; it was `-mt-[85svh]` on the ring alone
on its wrapper), so it rises over paper with its first card a fixed ~150px
below the copy, both at 1:1. Measure that distance to the first **card**, not
to the block's edge — the cards sit ~200px under it, beneath the top scrim,
and sizing the pull-up to the edge left the gap twice what it looked. It can
overlap safely because by then block 8's cover is past the frame and the
ring stacks above it; the gap is svh-dominated (0.15vh plus a couple of rem),
so it stays positive on every viewport. The fade that comes with it must be
over before the cards reach mid-screen, or they hang half-transparent under
the list and the overlap reads as a bug.

**A margin between two blocks only earns its place while both are visible.**
The ring sat 12.5rem below block 8 from when they met on screen and needed
telling apart. Once block 8 ended by covering the screen in paper, that margin
was 200px of white with nothing in it, and it pushed the ring's arrival a
further 300px out — 500px of blank between the copy leaving and the first card
showing. Removed, the ring's first edge reaches the bottom of the screen on
the frame the cover completes.

**A sequence that has run out of frames can still move.** The scrub reaches
the last picture before the scene ends — on purpose, so an overlay can play
over the final shot — and that stretch was a frozen photograph with copy
settling on top of it. `zoomToEnd` pushes the held frame slowly towards the
camera for the rest of the scene. It is the one continuous value in a
component built around a discrete one, so unlike the frame index it **is**
sprung, and it rides a composited transform on the canvas rather than a
repaint: scaling a bitmap costs nothing, and at up to 2x device pixels a 1.15
is still above the screen's own resolution. Prefer this to stretching a
scene's windows when the problem is that the picture has stopped.

**Start a scene's progress where what it drives becomes visible, not where it
pins.** `<PinnedScene>` reports 0 at `"top top"` by default, which is right
when nothing it drives can be seen before then. A block that scrolls up into
view with its contents already on show is the other case: its progress has to
begin at `"top bottom"`, or the reader watches a still picture slide in and
start moving only once it lands. `progressStart` is the mirror of
`progressEnd` — one widens the range at the front, the other at the back, and
a scene that both arrives and leaves in view wants both.

**Not every seam is a cut — when the story is over, stack the blocks.**
Reverted: the works ring overlapped block 8 by a viewport (`leadInViewports`
on `<PinnedScene>`, a see-through stage, the paper handed over late). It put
two scenes on screen at once, and because both are translucent in their
entrance the reader saw the window frames, the film list and the carousels
blended into one another. The prop and the deferred paper are gone, and
`<PinnedScene>` is back to a lead-in of exactly one viewport.

The run of fixes above all tried to hide the join between block 8 and the
ring, on the assumption that it had to be invisible like every other join on
this page. It does not. The lead-in machinery exists so that **one continuous
shot** survives being cut into scenes: the next scene opens on the picture the
last one closed with, so the seam must vanish. The ring is not part of that
shot — the sequences have ended, the page is paper, and the ring is simply the
next block. A block after a block wants a margin, not a cut: 12.5rem of paper
(200px at the grid's base width), and both read as one sheet.

**A block that leaves by its own transform needs somewhere to go.** Block 8's
copy used to fly a viewport further up than its scene, which is what forced
the ring to cut in underneath it and cost two viewports of the window scene
(8 → 6) carrying that flight. With the ring stacked below, the page just rides
its scene off the top the way any pinned stage does, and the scene is as long
as the content needs. The entrance windows go the same way: the ring's fade
and lift were there to cover a cut, and a block that scrolls up into place is
already in motion — stacking one on the other is the double move.

**The same rule binds an overlay over a held frame.** A sequence may reach
its last picture early on purpose and hold it while a block plays on top —
`<WorksIntro>` runs over the last 44% of the window sequence that way. Then the
overlay is the only thing moving, so **its own windows must not leave gaps**:
with a settled page and a frozen frame, a gap is a viewport and a half of
scroll where the screen is simply static. Copy leaves by travelling with the
page rather than fading where it stands, for the same reason.

**When building.** `LEAD_FRAMES` (51) is the whole contract: it decides both
how many frames the transition is given and where the sequence resumes. Change
it in `data/home/story.ts` and both follow — and re-measure both, because it
is also what sets how fast each of them *feels* ([[decisions-log]] ADR-0033,
which is why it is no longer 20). It is not free: those frames are fetched and
decoded for the transition as well as for the sequence. The
transition's canvas is driven **straight off the scroll callback**, not through
a spring, exactly as `<ScrollSequence>` does: a spring between scroll and frame
index would let the picture lag the scroll and show frames the reader is not
on.

---

## ADR-0029 — Sequences hand over inside a cloud curtain, split across two scenes

**Status:** Accepted · 2026-10-01

**Decision.** Both transitions between sequences use one shared `<CloudMeet>`:
four hand-painted cut-outs drift in from opposite sides, overlap across the
screen, and carry on out the far side. The pass is **split across two scenes**:

| | driven by | maps to |
|---|---|---|
| `approach(from)` | the outgoing sequence's own progress, from 70% | 0 → `COVER_AT` |
| `depart` | the transition scene's progress | `COVER_AT` → 1 |

So the clouds close over a shot that is **still playing**, and open again only
once the next one is live. It replaces two unrelated mechanisms that did the
same job: the diagonal brush mask in `<SkyWipe>` and the rising column in
`<CloudPass>`.

**Why the pass starts inside the previous sequence.** A sequence reaches its
last frame and holds it; the next one opens on a held first frame. With the
curtain confined to the transition scene, both of those sat in the open for a
few hundred pixels of scroll on either side of the seam, which is exactly what
the scrub is supposed to hide. Starting the approach at 70% of the outgoing
sequence puts the cover over the held frame instead of after it.

**Why both halves are linear.** They were eased at first — `approach`
quadratic so the clouds rushed in at the end, `depart` cubic so the cover held
late. Both curves existed to keep a held frame out of sight, and ADR-0030
removed that need by scrubbing the incoming shot under the clouds. What was
left was motion that visibly lunged, which is wrong for weather: clouds drift,
they do not pounce. A constant speed through both halves makes the whole pass
one even drift across the scene boundary.

**The cloud progress is `set`, never sprung.** The scenes hold it in a
react-spring value for the plumbing — it reaches `<CloudMeet>` without
re-rendering — but it is written with `api.set`, not `api.start`. This value
*is* the scroll position; giving it motion of its own makes it lag, and the lag
is worst exactly where it shows: measured mid-scroll, the clouds were **117 px
short of centre at the moment they should have met**, drifting through the
middle and only settling into it once scrolling stopped. That reads as a jerk
in the centre. Sprung, they also lagged the frames, which are scrubbed exactly
(ADR-0025) — the clouds and the picture under them were on different clocks.
With `set` the seam measures 0 px off.

**Why `depart` takes an `over` share.** A transition scene can be long for
reasons of its own — `<CloudPass>` spans four viewports because it carries the
question and the subtitle. Spread across all of that, the clouds left at a
third of the speed they arrived: measured at 1.23 px of travel per px of
scroll coming in against 0.37 going out. `over` gives the departure the same
stretch of scroll the approach used, which brings every leg of both passes
into the range 1.16-1.29.

**What that removed.** The transition scenes now open already covered, so they
no longer need to paint the outgoing sequence's last frame themselves — the
layer, and the `outgoingFrame` field behind it, are gone. `.wipe-mask`,
`.cloud-column`, `.zoom-cloud` and `--cloud-zoom` went with the old
mechanisms, as did a resize-measuring effect in `<CloudPass>` that derived the
swap point from the column's rem height.

> [!warning] A transition scene renders **covered** at rest
> `depart(0)` is `COVER_AT`, so a scene that has not been scrolled to is a
> full-screen cloud fill. That is only harmless because both transitions are
> `leadIn` scenes and `<PinnedScene>` keeps the stage `hidden` until it is
> reached. A transition placed without `leadIn` would show a cloud wall down
> the page.

**Why a flat fill behind the cut-outs.** Four shapes cannot promise a
seam-free cover at every aspect ratio, and a gap at the hand-over would show
the picture jumping. The `--cloud` fill is the colour of the clouds, and by the
time it is opaque they already overlap across the screen.

**Why each cut-out animates its own transform, in percentages.** The first
version drove a `--meet` custom property on the stage and let CSS `calc()` the
distance. That is correct but not cheap: a custom property is not composited,
so every frame invalidated style for the whole subtree. Each cut-out now
animates its own `transform`, which is compositor-only. Expressing the travel
as a percentage **of the cut-out's own width** is what makes that possible
without measuring the viewport — a measured pixel distance would differ between
the server and the client and trip a hydration mismatch, which is the trap
ADR-0028 also hit.

**Why the blur is baked into the assets.** A CSS `filter: blur()` on an element
200vw wide is re-run every frame it moves, and these move for most of a
transition. The cut-outs are pre-blurred at two depths at build time
(`cloud-N-soft.webp` / `-deep.webp`, generated with `sharp`) and carry no
runtime filter at all. They are padded before blurring, or the halo would be
cut flat at the image bounds. As a bonus they are WebP: 29-75 KB against
200-470 KB as PNG.

**Why the cut-outs are far larger than the screen.** A cut-out whose own
silhouette ends inside the frame reads as a sticker pushed in from the edge
rather than as weather. Every band is sized and placed to run off at least two
edges, so what is on screen is always cloud body, never a cloud's outline.

**When building.** Each transition picks a `composition` — `drift` or `swell`
— which differ in the side, size and height of every cut-out, so the two
passes do not read as the same shot twice. **Both halves of one transition
must use the same composition**, or the clouds change shape mid-pass at the
scene boundary. Blur belongs in the asset, not in CSS: regenerate the
`-soft` / `-deep` WebPs rather than adding a `filter`. A transition scene's
caption windows have to sit clear of the cover. The curtain is decorative, so
its stage is `aria-hidden`; the scene's accessible name stays on
`<PinnedScene>`. Cut-outs live in `public/assets/home/` and arrive as a
`clouds` prop, so the component holds no asset paths.

---

## ADR-0028 — Headings resolve out of blur, letter by letter, in a scattered order

**Status:** Accepted · 2026-10-01 · records a divergence from hard rule #1

**Decision.** A heading reveals one letter at a time: each letter goes
`opacity` 0 → 1 and `filter: blur(12px)` → none together over 560 ms, and the
letters' starts are scattered across a 460 ms window rather than running left
to right. It lives in `WrittenLines` (`components/animation/written-lines.tsx`),
a `@react-spring/web` component — **not** `spring-text-engine`.

**Why not the text engine.** Hard rule #1 and [[text-engine]] say text animation
belongs to `spring-text-engine`, so this was checked against the package before
being written. `letterIn` / `letterOut` do take arbitrary properties, so the
blur and opacity are expressible. The order is not: per-letter timing is only
`letterStagger`, which the engine multiplies by the letter's **sequential
index**, and `letterDelayIn` is a single number shared by every letter. There is
no per-letter delay callback and no shuffled mode. A scattered order is the
defining feature of this effect, so the engine cannot express it short of
mounting one engine instance per letter.

> Worth knowing when weighing this: the project **already** animates all of its
> text through two hand-written components, `WrittenLines` and `MistedLines`,
> and does not import `spring-text-engine` anywhere. This ADR does not create
> that divergence, it extends it — see [[text-engine]].

**Why the scatter is hashed, not random.** `Math.random()` during render gives
the server and the client different orders, which is a hydration mismatch. A
hash of the letter's position gives the same scattered order on both, and makes
a heading replay identically instead of reshuffling every time it scrolls back
into view.

**Why blur returns to `none` rather than `blur(0)`.** A settled heading would
otherwise hold one composited layer per letter — thirty of them on the hero —
for an effect that has finished.

**When building.** `WrittenLines` is shared: it drives the hero headline, the
cloud-pass question, the sequence captions, the works intro, the film titles,
the burger menu and the marquee. Changing its timing changes all of them.
Splitting text into per-letter elements is bad for screen readers, so each line
also renders the whole line as `sr-only` text and the split copy is
`aria-hidden` — keep that if the markup is reworked.

**The exit mirrors the entry.** Letters sink back into blur in the same
scattered order, `easeIn` against the entry's `easeOut`. It used to reset
instantly.

> [!important] A block that fades itself out must drive `show`
> On its own the component watches its own visibility, and that only counts a
> heading as hidden once it is **already fully transparent** — so the reverse
> played where nobody could see it. Measured on the hero: the block reached
> opacity 0 while every letter was still at 1, and the reverse ran afterwards.
> `<Hero>` and `<SequenceCaption>` therefore pass `show`, flipped at the edge
> of their own fade window so the letters leave *ahead* of the block. With it
> wired, the reverse is under way at 0.6 opacity and done by 0.13.

---

## ADR-0027 — Sequences play by scroll only, share one painting hook, and load on approach

**Status:** Accepted · 2026-09-09 · builds on ADR-0025

**Decision.** A sequence is advanced by **scroll position and nothing else**.
There is no clock-driven playback: no autoplay-on-enter, no timed loop. The
canvas half — decode the frames, draw one in cover-fit, re-fit on resize — lives
in `useImageSequence`; `<ScrollSequence>` sits on top and only decides which
frame is current, from `<ProgressTrigger>` progress. A sequence starts fetching
its frames when its canvas comes within **one viewport** of the screen, not at
first paint.

**Why scroll only.** It keeps the whole page under the visitor's control: they
set the pace, they can go back, and nothing has already finished by the time
they arrive. It is also the honest reading of the medium here — these are
timelines to be scrubbed, not videos. A timed variant existed briefly and was
removed; stacking scrubbed sections instead makes the page one continuous
timeline, each section pinned for its own span.

**Why the painting hook survives that.** It holds the fiddly, trigger-independent
part: device-pixel ratio, cover-fit maths, redraw-on-resize, paint-as-frames-land,
and the deferred loading below. Keeping it separate is what lets
`<ScrollSequence>` stay short enough to read in one screen, and it is where a
future trigger — if one is ever wanted — would attach without touching any of it.

**Why loading is deferred.** Decoded bitmaps are not the file on disk: a
1920x1080 frame costs roughly 8 MB decoded, so eagerly decoding three 150-frame
sequences is both ~39 MB of network at first paint and a large, uncontrolled
amount of image memory, most of it for content the visitor may never reach. The
`100%` `rootMargin` is the compromise: far enough ahead that frames are ready
before the sequence arrives, late enough that nothing below the fold downloads
on load. Measured on the home page — at the top only sequence 1's 150 frames are
fetched, and sequences 2 and 3 have fetched nothing.

**When building.** Reach for `<ScrollSequence>`; if something ever needs to play
on a clock, that is a new decision, not a prop to quietly add. Give each stacked
sequence its own `scrollViewports` span — three at the default 4 make the home
page 12 viewports tall, which is the cost of scrubbing three timelines. The
frame index stays discrete and unsprung (ADR-0025).

---

## ADR-0026 — The CRT overlay: one layer stack, geometry in CSS, drift as a looping spring

**Status:** Accepted · 2026-09-09

**Decision.** The site-wide scanline / vignette / grain treatment is a single
`<CrtOverlay>` client component rendering three stacked `absolute inset-0`
layers inside one `fixed inset-0` container. Each layer is a `.crt-*` class in
`@layer components` built from `--overlay-*` Tier 2 tokens: a
`repeating-linear-gradient` for the scanlines, an **inset `box-shadow`** for the
vignette, and an inline `feTurbulence` SVG data URI for the grain. The scanlines
drift upward on a looping `@react-spring/web` spring.

**Why these four choices.**

*Drift is a spring, not keyframes.* Hard rule #1 bans CSS keyframes, and a
looping `useSpring` with a linear easing expresses a constant drift perfectly
well. It also inherits the project's reduced-motion story, which keyframes would
not.

*The spring carries a bare number, not a transform string.* The spring writes a
unitless 0–1 to the `--overlay-scanline-drift` custom property and CSS does
`calc(period * drift * -1)`. Putting a `var()` inside an animated `transform`
string works in the browser but serialises differently on the server and the
client, which trips a React hydration mismatch. Keeping the geometry in CSS also
keeps the period described in exactly one place. The layer is rendered one
period taller than its container so the wrap at the end of each loop is seamless,
and a transform is compositor-only, so the drift never repaints the viewport.

*The scanline period is 4px because of device pixels.* At 3px the period is 4.5
device pixels at DPR 1.5, so the lines cannot land on whole pixels and beat
against the image underneath as visible diagonal moire. 4 CSS px is 4 / 6 / 8 /
12 device px at DPR 1 / 1.5 / 2 / 3 — always integer — and the 2px half likewise.
**Any change to `--overlay-scanline-period` has to stay an even integer**, or the
moire comes back.

*The vignette is an inset shadow, not a radial gradient.* A centred
`radial-gradient` pools darkness in the middle of each edge and leaves the
corners weak, which reads as a soft blob rather than a screen edge. An inset
`box-shadow` hugs all four edges evenly and doubles up where they meet.

**When building.** Tune through the `--overlay-*` tokens, never by editing markup
or hardcoding in `className`. `--layer-overlay` is Tier 2 rather than a `@theme`
entry because **`z-index` has no Tailwind namespace** — same as `--duration-*`
(ADR-0015). A looping spring must read [[hooks|usePrefersReducedMotion]] and set
`loop`/`pause` from it: `skipAnimation` alone makes each cycle finish instantly
and restart, which spins. The overlay renders above the cookie banner, so it is
`aria-hidden` and `pointer-events-none`, and any opacity increase has to be
re-checked against text contrast underneath.

---

## ADR-0025 — Scroll-scrubbed image sequences draw to one `<canvas>` from WebP frames

**Status:** Accepted · 2026-09-09

**Decision.** A frame sequence played by scroll renders into a single
`<canvas>`, not a stack of `<img>`/`next/image` elements toggled by opacity.
Scroll progress comes from `<ProgressTrigger>`; the 0–1 value maps to a frame
index and the frame is blitted with `drawImage` in cover-fit. Frames ship as
**WebP**, not PNG. Component: `<ScrollSequence>` — see [[components/common]].

**Why.** One canvas is one composited layer and one decode target, so scrubbing
costs a `drawImage` per changed frame instead of mounting 150 elements and
fighting the compositor. `<ProgressTrigger>` puts the work on the shared rAF
ticker ([[animation-system]]) rather than a private scroll listener. Frame
weight is the real constraint, not draw cost: the 150-frame 1920×1080 source
export was 244 MB of PNG — unusable over a network. The same frames at WebP q80,
full width, are 12.9 MB (88 KB average, ~19× smaller) with no visible
difference on this painterly source.

**When building.** Deliberately **no spring** on the frame index — it is a
discrete value, and interpolating it shows frames the scroll position is not on.
Keep the masters out of `public/` (they would be deployed) and out of git; the
served frames are the WebP set. Re-encode with `sharp`, which ships inside
`next` — no new dependency. The component takes its frames as a prop, so the
manifest lives in `src/data/` ([[folder-structure]]).

**A still shown small is served small.** The ring's cards are frames of the
same 1920px sequences, and with `unoptimized` on their `<img>`s every card
decoded the full frame to show it at under 200px wide — 48 of them, hundreds
of MB of bitmap for one block. `unoptimized` belongs on the sequence frames
the canvas paints at full size, never on a `next/image` that has `sizes`;
let it serve the width the layout asks for. Measure decoded size
(`naturalWidth` against the rendered width) before deciding a block is
light because its frames are small.

---

## ADR-0024 — `body` is a flow container with a `min-height`, not a fixed-height flex box

**Status:** Accepted · 2026-09-09 · amends the starter baseline

**Decision.** The `body` rule in `globals.css` is `min-height: 100svh; width: 100%`.
The starter's `display: flex` + `align-items/justify-content: center` +
`height: 100vh` + `width: 100vw` centering block is removed.

**Why.** `height: 100vh` caps the document box, so **no page taller than the
viewport can scroll** — the content overflows a 100vh body instead of extending
the document, and `scrollHeight` stops short of the content. The first real
section built on the starter (a 400svh scroll sequence) measured 2856 px of
content against a 1785 px document. Two further problems came with it:
`width: 100vw` includes the scrollbar gutter, so every page with a vertical
scrollbar also got a horizontal one; and `align-items: center` made `body` a
flex parent that shrink-wraps children, constraining section widths. The
centering existed only to pose the empty starter view in the middle of the
screen — a placeholder, not a layout decision.

**When building.** Pages lay themselves out in normal flow; `min-height: 100svh`
keeps the full-viewport floor for short pages. Centre a hero inside its own
section, never on `body`. `svh` (not `vh`) is the unit for full-viewport blocks —
it does not jump when the mobile URL bar hides. See [[design-system]].

---

## ADR-0023 — 3D scenes resize on every tier; the iOS URL bar is filtered, not the listener

**Status:** Accepted · 2026-09-08 · amends the `optimize-3d-scene` skill (ADR-0016)

**Decision.** A WebGL scene keeps its rAF-coalesced `resize` /
`orientationchange` listener on **every** device tier, plus a listener on the
`(hover: none) and (pointer: coarse)` media query. On a coarse pointer it
ignores a change that moves `innerHeight` only. Any width change or media-query
flip re-reads the device tier; if the tier changed, `retune(tier)` re-applies
DPR (renderer and composer), frame budget, per-tier visibility, draw ranges,
pointer binding and freeze state before the surface is resized.

**Why.** The skill's earlier rule — no resize listener at all on touch — was
written to stop the iOS URL bar from rebuilding the framebuffer mid-scroll,
which reads as a whole-scene flash. It over-corrected. The listener was also the
only path that could notice a viewport that genuinely changed: a window dragged
across a breakpoint, a rotation, or DevTools device emulation switched off. A
scene loaded as a phone then held its 390-wide buffer, 30 fps budget, parked
pointer and hidden desktop-only passes on a 2160-wide viewport and drew skewed
until reload. The URL bar only ever changes `innerHeight`, so filtering
height-only events on a coarse pointer keeps the flicker fix and loses nothing.

**Constraints on retune.** It may touch uniforms, sizes, visibility, draw
ranges and listeners only — never a define, light count or
`material.transparent`, so no shader program compiles after the loader (skill
§3.2). Particle counts vary through `geometry.setDrawRange` on a buffer sized
for the largest tier, never through a rebuild.

**When building.** Follow `patterns.md` §1, §5 and §14 in the skill; do not
port the listener-less resize block from `mycelia/src/lib/scene/canvas3d.ts`.
Verify with the tier-switch round-trip in skill §14: emulation on → off → on
must move the buffer and draw count both ways with a stable program count.
See [[optimize-3d-scene]].

---

## ADR-0022 — Track latest within majors; hold TypeScript 7 and ESLint 10

**Status:** Accepted · 2026-08-18

**Decision.** Dependencies track the newest release **within their current
major**. Three majors are deliberately held back.

**Why.** Stale pins hand every new project a migration debt on day one; a broken
toolchain is worse. Each hold was tested, not assumed:

- **TypeScript 5, not 7** — `eslint-config-next` depends on `typescript-eslint@8`,
  whose peer range is `typescript >=4.8.4 <6.1.0`. TS 7 breaks `yarn lint`.
- **ESLint 9, not 10** — ESLint 10 removed `context.getFilename()`;
  `eslint-plugin-react` still calls it, so linting dies on startup.
- **`@types/node` tracks the Node major in use**, not the newest published.

**When building.** The blockers live in someone else's dependency graph, so they
lift without work here — **re-test periodically** rather than treating them as
permanent. [[tech-stack]] carries the table and the reasons. Node ≥ 20.19 is a
hard floor (`engines` + `.nvmrc`): the ESLint toolchain fails to install below it.

---

## ADR-0021 — SEO is a practice with a workflow, not just a metadata helper

**Status:** Accepted · 2026-08-18

**Decision.** SEO and AEO get skills, an audit agent and a documented order of
work ([[seo-aeo]]), not just the metadata utilities.

**Why.** The mechanism existed; the practice did not. Nothing checked whether a
new route reached `sitemap.ts`, whether titles were unique, or whether the site
was legible to answer engines — the fastest-moving part of search and the one
most likely to be skipped.

**When building.** Audit in order: indexability → metadata → content structure →
structured data → performance → AEO. A perfectly optimised page that cannot be
crawled is worth nothing. **AI-crawler policy is the user's decision** — "be
cited by AI" and "don't train on my content" need different bots allowed. Never
cloak, and never emit schema describing content that is not on the page.

---

## ADR-0020 — Payload + Supabase are the CMS and database, added per project

**Status:** Accepted · 2026-08-18

**Decision.** Payload (Postgres adapter) on Supabase are the documented defaults.
**Neither ships in the starter** — the `payload-cms` / `supabase-db` skills
install them when a project needs them.

**Why.** Payload runs *inside* the Next app — admin as a route group, content via
an in-process Local API, types generated from the schema — which matches how this
starter already works (Server Components reading data, passing props down) and
keeps deployment one Vercel project. Supabase covers database, media bucket and
optional auth in one service. Most projects from this starter are marketing sites
that never need either, so an unused install would be a large dependency surface
and a migration story maintained for nothing.

**When building.** [[cms-payload]] and [[database-supabase]] carry the
conventions. Two constraints break installs if ignored: `@payloadcms/next` pins a
minimum Next version (verify before installing), and Supabase's connection
strings are not interchangeable — runtime on the transaction pooler (6543, no
prepared statements), migrations on the direct connection (5432).

---

## ADR-0019 — Hard rules get a mechanical check, not just prose

**Status:** Accepted · 2026-08-18

**Decision.** `.claude/scripts/verify.sh` checks every hard rule that is
objectively decidable from source and exits non-zero on any FAIL. Judgement calls
stay with the `qa-verify` skill.

**Why.** Rules that are never checked decay into suggestions, and silently — a
stray `@keyframes` or hardcoded hex surfaces at review, if at all. `yarn lint`
knows nothing about springs, token tiers or route delegation.

**When building.** Run it after any code change ([[qa-verification]]). It greps
rather than parsing TypeScript, so it is biased toward false positives: a
dismissed warning costs seconds, an unchecked rule costs a review cycle. WARNs
never fail a build, so justify them rather than ignoring them.

---

## ADR-0018 — Split the docs into knowledge (vault) and execution (`.claude/`)

**Status:** Accepted · 2026-08-18

**Decision.** The vault stays the single source of truth for *why* and *what*;
`.claude/` holds *how it runs* — path-scoped rules, skills, agents, commands and
the verify script ([[agent-harness]]). Every skill, agent and command is
registered in the vault.

**Why.** Documentation that cannot be executed gets skipped; execution files
without recorded reasoning drift and duplicate. Keeping each mechanism to one job
avoids both.

**When building.** `.claude/` files stay short and point into the vault rather
than restating it — restated rules drift out of sync. **Path-scoped rules fire
when Claude *reads* a matching file, not when it writes one, and are not
re-injected after `/compact`.** They reinforce; they never guarantee. Anything
that must hold unconditionally belongs in `verify.sh` or a hook.

---

## ADR-0017 — A skill states its preconditions and its own internal conflicts

**Status:** Accepted · 2026-07-24

**Decision.** Every skill must state the environment its measurements assume, and
name explicitly where one of its steps undermines another.

**Why.** `optimize-3d-scene` was run on a real scene and the fix *order* held up
— what cost hours was everything left implicit: a first step that could not be
executed on the stack in front of it, measurements silently invalidated by the
dev server, and two individually correct steps that contradicted each other.

**When building.** When writing or editing a skill: a step names its
preconditions, and a step names where it fights another step. Numbers taken in
the wrong environment are worse than no numbers, because they read as evidence.

---

## ADR-0016 — Skills are registered in the vault, not just dropped in `.claude/`

**Status:** Accepted · 2026-07-24

**Decision.** A skill is only "installed" once it lives in `.claude/skills/<name>/`,
has a vault note under `workflows/`, is linked from [[README]] and
[[ai-agent-guide]], and — if invocation should be non-optional — has a routing
rule in `AGENTS.md`.

**Why.** A skill folder is discoverable to Claude Code at runtime but invisible in
the vault, leaving the invocation decision to model judgement. Where the skill
exists *because the order of operations matters*, that is exactly the wrong thing
to leave to chance.

**When building.** Registration is also when a skill gets checked against reality
— stale paths and references to files that do not exist surface here.

---

## ADR-0015 — Strict three-tier design-token naming convention

**Status:** Accepted · 2026-07-17 · amends ADR-0004

**Decision.** Tokens follow three tiers with an explicit grammar: primitive
`--raw-<category>-<name>[-<shade>]` → semantic `--<role>[-<variant>][-<state>]` →
`@theme inline` binding. Only Tier 1 holds literals; Tier 2 names purpose, never
appearance, and is the themeable layer. No tier may be skipped.

**Why.** ADR-0004 made tokens the styling currency but never said what a token
should be *called*, so every project would invent its own — defeating the point of
a shared starter. The names are predictable across projects by design.

**When building.** Full rules in [[design-system]]. Two Tailwind v4 facts,
verified by compiling a probe stylesheet, that guides commonly get wrong:

1. Naming primitives `--color-*` would **generate a utility for every raw value**
   and let markup bypass the semantic tier — hence the `--raw-*` prefix, kept out
   of `@theme`.
2. **There is no `--duration-*` namespace.** `duration-fast` compiles to nothing.
   Durations stay Tier 2 and are used as `duration-[var(--duration-fast)]`.
   (`--ease-*` *is* real.)

`@theme inline` is load-bearing: `inline` inlines the `var()` into each utility so
Tier 2 overrides cascade. Binding a literal there freezes the value and silently
breaks theming.

---

## ADR-0014 — Narrow CSS-transition exception for trivial state changes

**Status:** Accepted · 2026-07-17 · amends ADR-0002

**Decision.** All real motion stays spring-based, with one exception: CSS
`transition-*` for simple discrete state changes — `hover:` / `focus-visible:` /
`active:` colour, opacity, border, underline, and small decorative nudges.

**Why.** The outright ban cost most where it helped least: a nav link fading its
colour on hover needed a client component and a spring config to animate one
property nobody will interrupt. The rule pushed toward boilerplate or quiet
rule-breaking.

**When building.** Three conditions, all required, or it is a spring:
token-backed timing (`duration-[var(--duration-fast)] ease-entrance`),
`transition-*` only (`@keyframes` stay banned outright), and utilities only —
never a CSS file. Everything scroll-driven, revealing, staggered, orchestrated,
layout-affecting or interruptible remains a spring; text stays [[text-engine]].
The list is enumerated rather than a judgement call ("simple animations") so it
cannot erode into general CSS animation. Past the list, use `<Hover>`.

---

## ADR-0013 — `<Inview>` self-observe fix; spring components honour resize

**Status:** Accepted · 2026-06-07

**Decision.** Second authorised edit to the protected engine: `<Inview>` now
calls its callback ref so it observes itself when no `trigger` is passed, and
`<Inview>` / `<Spring>` / `<Hover>` pass the React-tracked `width` into
`isMobileDisabled(value, width)`.

**Why.** `<Inview>` only animated when given an external `trigger` — the common
case silently did nothing, because a callback ref was being assigned as
`.current` instead of called. Separately the `width` dependency was tracked but
never used, so resize re-evaluation of mobile gating did nothing.

**When building.** The springs folder stays `#do-not-modify` by default — these
were explicitly signed-off bug fixes, not an opening.

---

## ADR-0012 — Styling lives in utilities and components, not `globals.css`

**Status:** Accepted · 2026-05-22 · amends ADR-0004

**Decision.** A strict placement order, first match wins:

| Situation | Goes where |
|-----------|-----------|
| One-off styling | Tailwind utilities in `className` |
| Repeated pattern with markup/structure/props | a **React component** in `components/ui/` |
| Repeated pure-utility combo, no structure | a Tailwind v4 `@utility` |
| Pseudo-elements, 3rd-party overrides, complex selectors | `@layer components` |
| A new colour/spacing/radius value | a token (per ADR-0015) |

**Why.** With tokens in `globals.css` and guidance to extract repeated patterns
into `@layer components`, the path of least resistance made that file a dumping
ground — hundreds of component-specific classes never deleted when their
component was. Splitting the file would only spread the same bloat; the fix is a
placement rule.

**When building.** The default answer to "this looks repeated" is a **React
component**, not a CSS class — an eyebrow label with a `::before` dot is an
`<Eyebrow>`, not a `.label-eyebrow`. `globals.css` holds imports, tokens, base
resets and the narrow `@layer components` exceptions; if it grows past that,
something was misplaced. **CSS Modules were considered and rejected** — a second
styling mechanism is not worth the mental model when motion is spring-based (no
keyframes to co-locate) and utilities plus components cover everything else.

---

## ADR-0011 — API layer: `app/api` route handlers, secrets server-side

**Status:** Accepted · 2026-05-22

**Decision.** External calls go through Next.js Route Handlers at
`src/app/api/<resource>/route.ts`. The handler owns the work — business logic,
upstream calls, filtering, secret env vars. No mandatory passthrough service
layer; extract shared code only when genuinely reused.

**Why.** `route.ts` is never bundled to the browser, so it is the natural place
for secrets, and a single convention keeps every endpoint the same shape.

**When building.** Every endpoint validates input with `zod` and returns the
`{ data }` / `{ error }` envelope via the shared `handle()` wrapper. Secret env
vars are unprefixed and read through `getServerEnv()`; `NEXT_PUBLIC_` is only for
browser-safe values. Client Components fetch same-origin via `apiFetch`;
render-time data is read in Server Components. Full note: [[api-architecture]].
Server Actions were considered for mutations and deferred — revisit with a new
ADR if forms need progressive enhancement.

---

## ADR-0010 — SEO & performance hardening

**Status:** Accepted · 2026-05-21

**Decision.** `src/lib/site.ts` (`siteConfig`) is the single source of truth for
SEO. `metadataBase` is always set; `themeColor` lives on the `viewport` export.
Added `robots.ts`, `sitemap.ts`, JSON-LD, `loading.tsx` / `error.tsx` /
`not-found.tsx`, and `<ReducedMotion>`.

**Why.** Relative OG/canonical URLs never resolved to absolute, so social
previews broke in production; an animation-heavy starter ignored
`prefers-reduced-motion`; and the home view was a top-level `"use client"`,
breaking the server-first rule it should model.

**When building.** Set `NEXT_PUBLIC_SITE_URL` in every deployed environment or
canonical and OG URLs resolve to localhost. `<ReducedMotion>` toggles
react-spring's global `skipAnimation` from one app-root mount, covering every
spring and the text engine at once. **`isBot()` is discouraged** — it opts the
route out of static rendering and edges toward cloaking; reduced motion is the
preferred lever, since springs only animate opacity/transform and content is in
the DOM for crawlers regardless ([[seo-metadata]]).

---

## ADR-0009 — Shared animation ticker; authorised engine performance refactor

**Status:** Accepted · 2026-05-21 · amends ADR-0002

**Decision.** One-time authorised refactor of the protected engine, plus a shared
loop primitive: `src/lib/animation/ticker.ts` — a single app-wide,
reference-counted rAF loop that starts on the first subscriber and stops on the
last. It is **not** `#do-not-modify`; it is the supported extension point.

**Why.** Cost scaled with the number of animated components: a private rAF loop
per `useLoop` instance that never stopped, a debounced `resize` listener per
spring component, and an `IntersectionObserver` re-created on every render.

**When building.** A page with N animated components now runs **one** rAF loop
and **one** resize listener. Subscribe new per-frame work to the ticker rather
than starting a loop. Hard rule #2 was amended here: the engine stays protected
by default and changes need explicit sign-off — this ADR is not a precedent for
editing it.

---

## ADR-0008 — Adaptive scaling grid via root font-size

**Status:** Accepted · 2026-05-21

**Decision.** Keep a rem-based design proportional across viewports by scaling
`html { font-size }`: `vw`-based media queries in `globals.css` for scaling down,
and a `<AdaptiveGrid>` client component for scaling up beyond the largest
breakpoint.

**Why.** The behaviour arrived as a `styled-components` implementation, which is
not a project dependency and conflicts with the CSS-only config rule. Only the
behaviour was kept; the implementation was rebuilt on the project stack.

**When building.** Breakpoints live in `grid.config.ts` **and** are mirrored in
the `globals.css` media queries — duplicated by design, since ADR-0004 forbids
generating CSS config from JS. **Keep the two in sync**; the formula is written
in both files. Design px map cleanly to rem at the design base width.

---

## ADR-0007 — Automate the vault workflow with Claude Code hooks

**Status:** Accepted · 2026-05-21

**Decision.** Encode the "read the vault first, update the docs after" workflow as
hooks in `.claude/settings.json`: `SessionStart` injects a pointer to the vault,
`UserPromptSubmit` reminds the agent to consult the relevant guide,
and `Stop` blocks **once per turn** to confirm docs were updated.

**Why.** Documentation drifts the moment it depends on someone remembering.

**When building.** The `Stop` hook uses a `${TMPDIR}` marker keyed by session id
so it blocks at most once per turn — no infinite loop. Hooks are reviewable and
disableable via `/hooks`, and take effect at the next session start.

---

## ADR-0006 — The vault is the single source of truth

**Status:** Accepted · 2026-05-21 · amends ADR-0001

**Decision.** The vault is the **only** documentation source. The repo root keeps
thin shims: `AGENTS.md` carries the breaking-change warning and hard rules and
points into the vault; `CLAUDE.md` and `.cursorrules` `@`-import it.

**Why.** Dense spec files at the root duplicated the vault's content as terse
specs, and the two would drift.

**When building.** Put documentation in the vault and link to it. Keep the root
shims consistent with it — they are the first thing every agent reads.

---

## ADR-0005 — Use standard `next/link` for navigation

**Status:** Accepted · 2026-05-21

**Decision.** Standard Next.js navigation — `<Link>` from `next/link`,
`useRouter` from `next/navigation`. The custom `<AnimLink>` / `useAnimRouter()`
convention referenced in early drafts is dropped; it was never built.

**Why.** Two conflicting conventions existed in the docs and only one had code.

**When building.** No animated route-transition layer exists. If one is needed,
revisit with a new ADR rather than reviving the old names. See [[routing]].

---

## ADR-0004 — Tailwind v4 with CSS-based config

**Status:** Accepted (starter baseline) · amended by ADR-0012 and ADR-0015

**Decision.** All theme configuration lives in `globals.css` under `:root` and
`@theme inline`. There is no `tailwind.config.js`. Raw values in class names are
banned.

**Why.** Tailwind v4 removes the JS config file in favour of CSS-native config.

**When building.** Design tokens are the only styling currency: a value that does
not exist as a token gets added to `globals.css` first — following the three-tier
grammar (ADR-0015) — and component-specific *classes* do not go there at all
(ADR-0012). See [[design-system]].

---

## ADR-0003 — Routes delegate to Views

**Status:** Accepted (starter baseline)

**Decision.** `app/**/page.tsx` only imports and renders a component from
`src/views/`. All layout and UI logic lives in the view.

**Why.** Mixing routing concerns with page UI makes `app/` files heavy and hard
to test.

**When building.** Every route is a ~3-line file; views are the real page
components. `verify.sh` FAILs on a route importing anything else. See [[routing]].

---

## ADR-0002 — All motion is spring-based (`@react-spring/web`)

**Status:** Accepted (starter baseline) · amended by ADR-0014 and ADR-0009

**Decision.** Every animation uses `@react-spring/web` through the component
layer in `src/components/animation/springs/`. CSS keyframes and `framer-motion`
are **banned**. Text animation goes through `spring-text-engine`.

**Why.** Marketing sites need rich, interruptible, physically natural motion. CSS
transitions and keyframes are rigid; competing libraries add weight.

**When building.** The springs folder and `src/hooks/animation/` are
`#do-not-modify` — consume them, wrap them, never edit them without sign-off.
ADR-0014 narrows the CSS ban to allow `transition-*` for trivial hover/focus
state only. See [[animation-system]] and [[text-engine]].

---

## ADR-0001 — Adopt an Obsidian vault as the project brain

**Status:** Accepted (starter baseline) · amended by ADR-0006

**Decision.** `obsidian/` is a linked, navigable vault documenting how the
project is built and why.

**Why.** Project knowledge scattered across root markdown files gave new
contributors and AI agents no structured map of the system.

**When building.** Docs are maintained alongside code — see [[meta/README]] for
the maintenance rules, and [[agent-harness]] for how the vault and `.claude/`
divide the work.
