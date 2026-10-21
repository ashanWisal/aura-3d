"use client";

/**
 * @fileoverview Finishes — the headphones on a turntable beside the picker.
 * The robot form gets no canvas; the picker and copy are all it needs.
 */

import { Inview } from "@/components/common/robot-inview";
import { useRobot } from "@/components/common/robot-view";
import type { coloursContent, Colourway } from "@/data/home";
import { FinishSwatches } from "@/views/home/finish-swatches";
import { FinishCanvas } from "@/views/home/headphones/finish-canvas";
import { useProduct } from "@/views/home/headphones/product-store";

export interface FinishesSectionProps {
  content: typeof coloursContent;
  colourways: Colourway[];
}

export const FinishesSection = ({ content, colourways }: FinishesSectionProps) => {
  const robot = useRobot();
  const colourway = useProduct((state) => state.colourway);

  return (
    <section id="finishes" aria-labelledby="finishes-heading" className="px-6 py-32 max-mobile:px-3 max-mobile:py-20">
      <div className="grid grid-cols-[3fr_2fr] items-center gap-12 rounded-3xl bg-surface max-portrait:grid-cols-1">
        <div className="relative h-[70svh] max-portrait:h-[55svh]">
          {!robot && <FinishCanvas />}
          <p className="pointer-events-none absolute bottom-6 left-8 font-mono text-meta uppercase tracking-wide text-foreground/50">
            {content.hint} ↔
          </p>
        </div>
        <Inview
          mode="once"
          from={{ opacity: 0, y: 32 }}
          to={{ opacity: 1, y: 0 }}
          className="px-8 pb-12 max-mobile:px-5"
        >
          <p className="font-mono text-label uppercase tracking-wide text-accent">{content.eyebrow}</p>
          <h2 id="finishes-heading" className="mt-3 font-display text-title">
            {content.heading}
          </h2>
          <p className="mt-6 min-h-16 text-body text-foreground/75" aria-live="polite">
            <span className="text-foreground">{colourway.name}.</span> {colourway.description}
          </p>
          <div className="mt-10">
            <FinishSwatches colourways={colourways} legend={content.legend} name="finish-showcase" />
          </div>
        </Inview>
      </div>
    </section>
  );
};
