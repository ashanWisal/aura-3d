"use client";

/**
 * @fileoverview Oversized faded words across the stage, rising in while
 * their chapter is on and fading as it leaves. <ProductStory> hands it the
 * chapter's own 0-1 slice, like the captions.
 */

import { forwardRef, useImperativeHandle } from "react";
import { animated, useSpring } from "@react-spring/web";
import { transformRange } from "@/utils/math";

const IN: [number, number] = [0.05, 0.3];
const OUT: [number, number] = [0.7, 0.92];
/** How far the words rise while they fade in, rem. */
const RISE_REM = 4;

export interface GhostWordsHandle {
  setProgress: (progress: number) => void;
}

export const GhostWords = forwardRef<GhostWordsHandle, { lines: string[] }>(({ lines }, ref) => {
  const [{ shown }, api] = useSpring(() => ({ shown: 0 }));

  useImperativeHandle(
    ref,
    () => ({
      setProgress: (progress) =>
        api.start({
          shown: transformRange(progress, IN[0], IN[1], 0, 1) * (1 - transformRange(progress, OUT[0], OUT[1], 0, 1)),
        }),
    }),
    [api],
  );

  return (
    <animated.p
      aria-hidden="true"
      className="pointer-events-none absolute inset-x-0 top-1/2 flex -translate-y-1/2 flex-col items-center font-display text-giant leading-display uppercase text-foreground/5"
      style={{ opacity: shown, y: shown.to((value) => `${(1 - value) * RISE_REM}rem`) }}
    >
      {lines.map((line) => (
        <span key={line}>{line}</span>
      ))}
    </animated.p>
  );
});

GhostWords.displayName = "GhostWords";
