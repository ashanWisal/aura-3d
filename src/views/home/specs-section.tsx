/**
 * @fileoverview Specifications — four headline numbers, then the full table
 * as a definition list. A Server Component; each stat rises in through
 * <Inview>.
 */

import { Inview } from "@/components/common/robot-inview";
import type { specsContent } from "@/data/home";

export interface SpecsSectionProps {
  content: typeof specsContent;
}

export const SpecsSection = ({ content }: SpecsSectionProps) => (
  <section id="specs" aria-labelledby="specs-heading" className="px-6 pb-32 max-mobile:px-3 max-mobile:pb-20">
    <div className="rounded-3xl bg-surface px-12 py-20 max-portrait:px-8 max-mobile:px-5 max-mobile:py-14">
      <p className="font-mono text-label uppercase tracking-wide text-accent">{content.eyebrow}</p>
      <h2 id="specs-heading" className="mt-3 font-display text-title">
        {content.heading}
      </h2>

      <dl className="mt-16 grid grid-cols-4 gap-8 max-portrait:grid-cols-2 max-portrait:gap-y-12 max-mobile:grid-cols-1">
        {content.stats.map((stat, index) => (
          <Inview
            key={stat.label}
            mode="once"
            from={{ opacity: 0, y: 32 }}
            to={{ opacity: 1, y: 0 }}
            delayIn={index * 100}
            className="flex flex-col border-t border-foreground/20 pt-6"
          >
            <dt className="order-2 mt-3 text-body text-foreground/70">{stat.label}</dt>
            <dd className="font-display text-counter whitespace-nowrap text-accent tabular-nums">{stat.value}</dd>
          </Inview>
        ))}
      </dl>

      <dl className="mt-24 grid grid-cols-2 gap-x-16 max-portrait:grid-cols-1 max-mobile:mt-16">
        {content.specs.map((spec) => (
          <div key={spec.name} className="grid grid-cols-[2fr_3fr] gap-6 border-t border-foreground/15 py-5 max-mobile:grid-cols-1 max-mobile:gap-1">
            <dt className="font-mono text-label uppercase tracking-wide text-foreground/55">{spec.name}</dt>
            <dd className="text-body">{spec.value}</dd>
          </div>
        ))}
      </dl>
    </div>
  </section>
);
