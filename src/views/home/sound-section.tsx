/**
 * @fileoverview Sound — a numbered feature list, each row rising in on
 * scroll, over a running strip of the headline numbers. A Server Component;
 * the rows and the strip are client leaves.
 */

import { Inview } from "@/components/common/robot-inview";
import { Marquee } from "@/components/ui/marquee";
import type { soundContent } from "@/data/home";

/** Milliseconds for the strip to travel two copies. */
const STRIP_LOOP_MS = 45000;

export interface SoundSectionProps {
  content: typeof soundContent;
}

export const SoundSection = ({ content }: SoundSectionProps) => (
  <section id="sound" aria-labelledby="sound-heading" className="py-32 max-mobile:py-20">
    <div className="px-12 max-portrait:px-8 max-mobile:px-5">
      <p className="font-mono text-label uppercase tracking-wide text-accent">{content.eyebrow}</p>
      <h2 id="sound-heading" className="mt-3 font-display text-display leading-display">
        {content.headingLines.map((line) => (
          <span key={line} className="block">
            {line}
          </span>
        ))}
      </h2>

      <ol className="mt-20 max-mobile:mt-12">
        {content.features.map((feature, index) => (
          <Inview
            key={feature.index}
            tag="li"
            mode="once"
            from={{ opacity: 0, y: 26 }}
            to={{ opacity: 1, y: 0 }}
            delayIn={index * 90}
            className="grid grid-cols-[6rem_1fr_2fr] items-baseline gap-8 border-t border-foreground/15 py-8 last:border-b max-portrait:grid-cols-[4rem_1fr] max-mobile:grid-cols-1 max-mobile:gap-2"
          >
            <span className="font-mono text-label text-accent">{feature.index}</span>
            <h3 className="font-display text-subtitle">{feature.name}</h3>
            <p className="text-body text-foreground/70 max-portrait:col-start-2 max-mobile:col-start-1">{feature.description}</p>
          </Inview>
        ))}
      </ol>
    </div>

    <Marquee
      items={content.marquee}
      label="Sound highlights"
      duration={STRIP_LOOP_MS}
      className="mt-24 border-y border-foreground/10 py-6 max-mobile:mt-16"
      trackClassName="gap-10 pr-10 font-mono text-label uppercase tracking-wide text-foreground/70 whitespace-nowrap"
      separator={<span className="size-1.5 rounded-full bg-accent" />}
    />
  </section>
);
