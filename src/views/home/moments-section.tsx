/**
 * @fileoverview Every day — the headphones in a ring of the moments they're
 * made for. A Server Component; the ring is the <MomentsOrbit> client leaf,
 * rising in through <Inview>.
 */

import { Inview } from "@/components/common/robot-inview";
import type { momentsContent } from "@/data/home";
import { MomentsOrbit } from "@/views/home/moments-orbit";

export interface MomentsSectionProps {
  content: typeof momentsContent;
}

export const MomentsSection = ({ content }: MomentsSectionProps) => (
  <section id="moments" aria-labelledby="moments-heading" className="overflow-hidden px-12 pb-32 max-portrait:px-8 max-mobile:px-5 max-mobile:pb-20">
    <div className="text-center">
      <p className="font-mono text-label uppercase tracking-wide text-accent">{content.eyebrow}</p>
      <h2 id="moments-heading" className="mt-3 font-display text-display leading-display">
        {content.headingLines.map((line) => (
          <span key={line} className="block">
            {line}
          </span>
        ))}
      </h2>
    </div>
    <Inview mode="once" from={{ opacity: 0, y: 40 }} to={{ opacity: 1, y: 0 }} className="mt-16 max-mobile:mt-10">
      <MomentsOrbit content={content} />
    </Inview>
  </section>
);
