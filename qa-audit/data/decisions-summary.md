# Decisions an auditor should not blindly undo (aura)

Sources: `aura/obsidian/meta/optimization-history.md`, `aura/obsidian/meta/decisions-log.md`, `aura/obsidian/meta/changelog.md`.

**Scope caveat.** `optimization-history.md` is titled and written as the **kumo** project record (copied into aura). Its D-numbers (D-016, D-019, D-026 to D-038) are kumo's owner decisions. aura's `decisions-log.md` has ADR-0001 to ADR-0037 only; no D-numbers are defined there. D-016 and D-019 appear in code comments (`src/app/globals.css`, `src/proxy.ts`).

1. **Robot form via proxy (D-016).** `src/proxy.ts` rewrites bot UAs (`src/utils/bot-ua.ts`) from `/` to `/robot-view`: no preloader, no motion. Measured effect was on kumo (robot 100/98). Observed in aura: Googlebot HTML is 147,930 B vs 152,069 B for Chrome, with `<meta name="x-robot-view" content="1">`. Do not flag this as cloaking without checking the same-content rule (ADR-0021: never cloak; ADR-0010: avoid `isBot()` in pages).
2. **Consent banner is server-rendered** (kumo: phone LCP fix). Keep it out of client hydration.
3. **No `app/loading.tsx`; `/privacy-policy` exists** (kumo BP 96 to 100). ADR-0010 says loading.tsx was added; the later changelog says it was deleted. aura currently has no loading.tsx.
4. **Origin fallback** (`src/lib/site.ts`, `src/env.ts`). ADR-0010: set `NEXT_PUBLIC_SITE_URL` in every deployed env. The served build uses `http://localhost:3000` for canonical, OG, JSON-LD and sitemap, so this is a deploy-config fact, not a code bug.
5. **Stale ADR-0037 (must be amended, not undone).** ADR-0037 (2026-10-21) says the headphones are "modelled in code, not downloaded, zero 3D asset bytes". The same-day changelog entry and code contradict it: `headphones.tsx:42,379` loads `/assets/models/aura-one.glb` (723,500 B, CC BY 4.0). Keep the footer credit (`site-footer.tsx:47-52`).
6. **Primitives for driver, board, battery** stay code-built (the model has no insides). Keep the `getExplode` contract (ADR-0037).
7. **No extra real-time lights in WebGL scenes** (ADR-0036, measured on the Abyss dive: three obstacle point lights had cut ~60 fps to 29-48 fps). aura's `studio-lights.tsx` adds ambient, spot and directional lights plus Lightformers. ADR-0036 was written for the dive and ADR-0037 says it "no longer applies" to aura. Measure before adding or removing lights.
8. **3D resize on every tier** (ADR-0023). Keep the rAF-coalesced resize listener; height-only changes on coarse pointers are ignored.
9. **DPR cap 1.75** on both canvases (`story-canvas.tsx:144`, `finish-canvas.tsx:87`, `dpr={[1, 1.75]}`), per the Abyss changelog. No ADR for aura. The optimize-3d-scene pass (tiering, prewarm) is recorded as "not yet run" for aura (changelog 2026-10-21).
10. **Idle hydration and deferred animation** (kumo: TBT 847 to 90 ms). `hydrate-when-idle.tsx` and `robot-view.tsx` exist in aura. `use-after-load.ts` is defined but has no importer in aura (see `deps-unused.json`).
11. **Fonts**: kumo self-hosted subsets (`src/fonts/`). aura uses `next/font/google` (Instrument Serif, Inter, JetBrains Mono) in `layout.tsx`; kumo's subset rule does not apply.
12. **Scanline period is an even integer (4px)** in the CRT overlay (changelog, ADR-0026): changing it causes moire at DPR 1.5.
13. **Three-tier token naming** (ADR-0015): `--raw-*` holds literals only; semantic and Tailwind bindings use `var()`. Keep the tiers.
14. **Adaptive root font-size grid** (ADR-0008, `globals.css` html font-size): keep in sync with `grid.config.ts`.
15. **AI crawlers in `bot-ua.ts`**: kumo added them fleet-wide (2026-10-02). Whether AI bots may crawl is the owner's decision (ADR-0021). `robots.txt` currently allows all.
16. **Dark-only site, no light theme** (`globals.css`). Do not add a light theme on an audit recommendation.
