/**
 * @fileoverview Reviews — three quote cards rising in, over a running ticker
 * of press lines. A Server Component; the cards and the ticker are client
 * leaves.
 */

import { Inview } from "@/components/common/robot-inview";
import { Marquee } from "@/components/ui/marquee";
import type { reviewsContent } from "@/data/home";

/** Milliseconds for the press ticker to travel two copies. */
const PRESS_LOOP_MS = 60000;

export interface ReviewsSectionProps {
  content: typeof reviewsContent;
}

export const ReviewsSection = ({ content }: ReviewsSectionProps) => (
  <section id="reviews" aria-labelledby="reviews-heading" className="pb-32 max-mobile:pb-20">
    <div className="px-12 max-portrait:px-8 max-mobile:px-5">
      <p className="font-mono text-label uppercase tracking-wide text-accent">{content.eyebrow}</p>
      <h2 id="reviews-heading" className="mt-3 font-display text-title">
        {content.heading}
      </h2>

      <ul className="mt-16 grid grid-cols-3 gap-6 max-portrait:grid-cols-1">
        {content.reviews.map((review, index) => (
          <li key={review.name} className="contents">
            <Inview
              tag="figure"
              mode="once"
              from={{ opacity: 0, y: 40 }}
              to={{ opacity: 1, y: 0 }}
              delayIn={index * 120}
              className="flex flex-col justify-between rounded-3xl border border-foreground/10 bg-surface p-10 max-mobile:p-7"
            >
              <span aria-hidden="true" className="font-display text-title text-accent">
                &ldquo;
              </span>
              <blockquote className="mt-2 flex-1 text-body">{review.quote}</blockquote>
              <figcaption className="mt-8 border-t border-foreground/15 pt-5">
                <span className="block">{review.name}</span>
                <span className="block font-mono text-meta uppercase tracking-wide text-foreground/55">{review.role}</span>
              </figcaption>
            </Inview>
          </li>
        ))}
      </ul>
    </div>

    <Marquee
      items={content.press}
      label="Press quotes"
      duration={PRESS_LOOP_MS}
      className="mt-20 border-y border-foreground/10 py-6"
      trackClassName="gap-12 pr-12 font-display text-subtitle whitespace-nowrap text-foreground/80"
      separator={<span className="size-2 rounded-full bg-accent" />}
    />
  </section>
);
