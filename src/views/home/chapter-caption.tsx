"use client";

/**
 * @fileoverview One chapter's caption over the descent — chapter mark,
 * headline, body and the readout ticker. <DiveDescent> hands it the chapter's
 * own 0-1 slice of the dive's progress; the headline is written in and out
 * inside a window of that slice, and the rest fades with it.
 *
 * Each chapter puts its headline in a different corner (`chapter.layout`),
 * the body in the opposite bottom corner, and slides in from its own side —
 * so every chapter change moves the copy somewhere new. Portrait screens are
 * too narrow for corners: every layout stacks bottom-left there.
 */

import { forwardRef, useImperativeHandle } from "react";
import { animated, useSpring } from "@react-spring/web";
import { MistedLines } from "@/components/animation/misted-lines";
import { useLettersIn, WrittenLines } from "@/components/animation/written-lines";
import { Marquee } from "@/components/ui/marquee";
import type { ChapterContent } from "@/data/home";
import { transformRange } from "@/utils/math";

/** Windows on the chapter's own 0-1 slice of the dive. */
const CAPTION_IN: [number, number] = [0.04, 0.16];
const CAPTION_OUT: [number, number] = [0.74, 0.9];

/** How far the copy slides in from its side, rem. */
const SLIDE_REM = 5;

/**
 * Classes per layout: the chapter mark, the headline, the body. Portrait
 * overrides put everything back in one bottom-left stack.
 */
const LAYOUTS: Record<ChapterContent["layout"], { mark: string; headline: string; body: string; from: number }> = {
  "bottom-left": {
    mark: "left-12",
    headline: "bottom-24 left-12",
    body: "right-12 bottom-24",
    from: -1,
  },
  "top-left": {
    mark: "left-12",
    headline: "top-46 left-12",
    body: "right-12 bottom-24",
    from: -1,
  },
  "top-right": {
    mark: "right-12 text-right max-portrait:right-auto max-portrait:text-left",
    headline: "top-46 right-12 text-right max-portrait:top-auto max-portrait:right-auto max-portrait:text-left",
    body: "bottom-24 left-12",
    from: 1,
  },
  "bottom-right": {
    mark: "right-12 text-right max-portrait:right-auto max-portrait:text-left",
    headline: "right-12 bottom-24 text-right max-portrait:right-auto max-portrait:text-left",
    body: "bottom-24 left-12",
    from: 1,
  },
};

/** Milliseconds for the ticker to travel two copies of its readouts. */
const TICKER_LOOP_MS = 60000;

const ramp = (value: number, [from, to]: [number, number]) =>
  transformRange(value, from, to, 0, 1);

export interface ChapterCaptionHandle {
  /** The chapter's own progress, 0 (not reached) to 1 (passed). */
  setProgress: (progress: number) => void;
}

export interface ChapterCaptionProps {
  chapter: ChapterContent;
  /** The page's first screen: shown from the start, h1 headline. */
  first?: boolean;
  /** The dive's last chapter: stays up until the dive unpins. */
  last?: boolean;
}

export const ChapterCaption = forwardRef<ChapterCaptionHandle, ChapterCaptionProps>(
  ({ chapter, first = false, last = false }, ref) => {
    const [{ visible }, api] = useSpring(() => ({ visible: first ? 1 : 0 }));
    const [lettersIn, setLettersIn] = useLettersIn(first);

    useImperativeHandle(
      ref,
      () => ({
        setProgress: (progress) => {
          const fadeIn = first ? 1 : ramp(progress, CAPTION_IN);
          const fadeOut = last ? 0 : ramp(progress, CAPTION_OUT);
          api.start({ visible: fadeIn * (1 - fadeOut) });
          setLettersIn(
            (first || progress >= CAPTION_IN[0]) && (last || progress < CAPTION_OUT[0]),
          );
        },
      }),
      [api, first, last, setLettersIn],
    );

    const Heading = first ? "h1" : "h2";
    const layout = LAYOUTS[chapter.layout];
    const slide = visible.to((value) => `translateX(${(1 - value) * layout.from * SLIDE_REM}rem)`);

    return (
      <div id={chapter.id} className="pointer-events-none absolute inset-0 text-shadow-legible">
        <animated.p
          className={`absolute top-36 font-mono text-label uppercase tracking-wide max-portrait:left-8 max-mobile:top-24 max-mobile:left-5 ${layout.mark}`}
          style={{ opacity: visible, transform: slide }}
        >
          <span className="text-accent">{chapter.index}</span> — {chapter.zone}
        </animated.p>

        {/* Portrait: headline above the body, both bottom-left. */}
        <animated.div
          className={`absolute max-portrait:right-8 max-portrait:bottom-56 max-portrait:left-8 max-mobile:right-5 max-mobile:bottom-60 max-mobile:left-5 ${layout.headline}`}
          style={{ transform: slide }}
        >
          <Heading className="font-display text-display leading-display">
            <WrittenLines lines={chapter.headlineLines} lineClassName="block" show={lettersIn} />
          </Heading>
        </animated.div>
        <animated.p
          className={`absolute w-100 text-body text-foreground/85 max-portrait:right-8 max-portrait:left-8 max-portrait:w-auto max-mobile:right-5 max-mobile:bottom-20 max-mobile:left-5 ${layout.body}`}
          style={{ opacity: visible, transform: slide }}
        >
          <MistedLines lines={[{ key: chapter.body, content: chapter.body }]} />
        </animated.p>

        <animated.div className="absolute inset-x-0 bottom-0" style={{ opacity: visible }}>
          <Marquee
            items={chapter.readouts}
            label={`${chapter.zone} readouts`}
            duration={TICKER_LOOP_MS}
            className="h-10 border-t border-foreground/10 bg-scrim/40 backdrop-blur-sm"
            trackClassName="gap-5 pr-5 font-mono text-meta uppercase tracking-wide text-foreground/75"
            separator={<span className="size-1 rounded-full bg-accent" />}
          />
        </animated.div>
      </div>
    );
  },
);

ChapterCaption.displayName = "ChapterCaption";
