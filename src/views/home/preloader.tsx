"use client";

/**
 * @fileoverview The intro — the headphones drawn in text, line by line, with
 * a counter running to 100, then the curtain lifts onto the story.
 *
 * One spring holds the timeline: `p` draws (each ASCII line types itself in
 * on its own slice of it) and `e` is the exit (fade and lift). Scrolling is
 * held while it plays. The robot form never renders it, reduced motion skips
 * it, and without JavaScript a <noscript> style in the root layout hides it.
 */

import { useEffect, useState } from "react";
import { animated, easings, useSpring } from "@react-spring/web";
import type { preloaderContent } from "@/data/home";
import { useMotionOff } from "@/hooks/animation/use-motion-off";
import { useScroll } from "@/hooks/smooth-scroll/use-scroll";

const DRAW_MS = 1800;
const EXIT_MS = 900;
/** How far the curtain lifts on the way out, rem. */
const LIFT_REM = 6;

export interface PreloaderProps {
  content: typeof preloaderContent;
}

export const Preloader = ({ content }: PreloaderProps) => {
  const motionOff = useMotionOff();
  const lenis = useScroll((state) => state.lenis);
  const [done, setDone] = useState(false);
  const lines = content.asciiArt;

  const [{ p, e }, api] = useSpring(() => ({ p: 0, e: 0 }));

  useEffect(() => {
    if (motionOff) {
      setDone(true);
      return;
    }
    lenis?.stop();
    let cancelled = false;
    const play = async () => {
      await Promise.all(api.start({ p: 1, config: { duration: DRAW_MS, easing: easings.easeInOutCubic } }));
      if (cancelled) return;
      await Promise.all(api.start({ e: 1, config: { duration: EXIT_MS, easing: easings.easeOutQuint } }));
      if (!cancelled) setDone(true);
    };
    void play();
    return () => {
      cancelled = true;
      lenis?.start();
    };
  }, [api, lenis, motionOff]);

  useEffect(() => {
    if (done) lenis?.start();
  }, [done, lenis]);

  if (done) return null;

  return (
    <animated.div
      data-preloader
      aria-hidden="true"
      className="fixed inset-0 z-(--layer-preloader) flex flex-col items-center justify-center gap-10 bg-background"
      style={{
        opacity: e.to((value) => 1 - value),
        y: e.to((value) => `${-value * LIFT_REM}rem`),
      }}
    >
      <pre className="font-mono text-label text-accent max-mobile:text-meta">
        {lines.map((line, index) => (
          <animated.span key={`${index}-${line}`} className="block whitespace-pre">
            {p.to((value) => {
              const share = Math.min(Math.max(value * lines.length - index, 0), 1);
              return line.slice(0, Math.ceil(share * line.length)).padEnd(line.length, " ");
            })}
          </animated.span>
        ))}
      </pre>
      <div className="flex w-80 justify-between font-mono text-label uppercase tracking-wide max-mobile:w-64">
        <span>{content.brand}</span>
        <span className="text-foreground/60">
          {content.status}{" "}
          <animated.span className="tabular-nums text-foreground">
            {p.to((value) => `${Math.round(value * 100)}`.padStart(3, "0"))}
          </animated.span>
        </span>
      </div>
    </animated.div>
  );
};
