/**
 * @fileoverview The page's last screen — a giant running line, the contact
 * email and the legal links. A Server Component; the running line is the
 * <Marquee> client leaf.
 */

import Link from "next/link";
import { Marquee } from "@/components/ui/marquee";
import type { footerContent } from "@/data/home";

/** Milliseconds for the running line to travel two copies. */
const RUNNING_LOOP_MS = 40000;

export interface SiteFooterProps {
  content: typeof footerContent;
}

const linkClass =
  "underline-offset-4 transition-colors duration-[var(--duration-fast)] ease-entrance hover:text-accent hover:underline focus-visible:text-accent focus-visible:underline";

export const SiteFooter = ({ content }: SiteFooterProps) => (
  <footer id="contact" className="overflow-hidden border-t border-foreground/10 bg-background pt-24 max-mobile:pt-16">
    <Marquee
      items={[content.runningLine]}
      label={content.runningLine}
      duration={RUNNING_LOOP_MS}
      writeIn
      trackClassName="gap-16 pr-16 font-display text-giant whitespace-nowrap"
      separator={<span className="size-6 rounded-full bg-accent shadow-glow max-mobile:size-3" />}
    />

    <div className="px-12 max-portrait:px-8 max-mobile:px-5">
      <a href={`mailto:${content.email}`} className={`mt-16 inline-flex items-center gap-4 font-display text-subtitle ${linkClass}`}>
        {content.cta} <span className="text-accent">→</span>
      </a>

      <div className="mt-24 flex flex-col gap-3 border-t border-foreground/15 py-12 text-body text-foreground/75 max-mobile:mt-16">
        <p>{content.blurb}</p>
        <a href={`mailto:${content.email}`} className={`self-start ${linkClass}`}>
          {content.email}
        </a>
      </div>

      <div className="flex justify-between gap-6 border-t border-foreground/15 py-8 font-mono text-meta uppercase tracking-wide text-foreground/50 max-mobile:flex-col">
        <span>© 2026 Aura</span>
        <span>
          <a href={content.modelCredit.href} className={linkClass} rel="noopener" target="_blank">
            {content.modelCredit.label}
          </a>{" "}
          ·{" "}
          <a href={content.modelCredit.licenseHref} className={linkClass} rel="license noopener" target="_blank">
            {content.modelCredit.license}
          </a>
        </span>
        <span className="flex gap-6">
          <Link href="/privacy-policy" className={linkClass}>
            Privacy
          </Link>
          <a href="#top" className={linkClass}>
            {content.backToTop}
          </a>
        </span>
      </div>
    </div>
  </footer>
);
