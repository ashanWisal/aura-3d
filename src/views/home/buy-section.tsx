"use client";

/**
 * @fileoverview Pre-order — the price, the finish picker (shared with the
 * finishes section), what's in the box, and a two-field form. The form posts
 * to the same-origin `/api/contact` endpoint, which validates it again on
 * the server; no payment is taken.
 */

import { useState, type FormEvent } from "react";
import type { buyContent, Colourway } from "@/data/home";
import { apiFetch } from "@/lib/api-client";
import { FinishSwatches } from "@/views/home/finish-swatches";
import { useProduct } from "@/views/home/headphones/product-store";

type Status = "idle" | "sending" | "sent" | "failed";

export interface BuySectionProps {
  content: typeof buyContent;
  colourways: Colourway[];
}

const fieldClass =
  "mt-2 w-full rounded-full border font-sans normal-case tracking-normal border-foreground/25 bg-background px-6 py-4 text-body outline-none transition-colors duration-[var(--duration-fast)] ease-entrance placeholder:text-foreground/35 focus-visible:border-accent";

export const BuySection = ({ content, colourways }: BuySectionProps) => {
  const colourway = useProduct((state) => state.colourway);
  const [status, setStatus] = useState<Status>("idle");

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setStatus("sending");
    try {
      await apiFetch("/api/contact", {
        method: "POST",
        body: JSON.stringify({
          name: String(data.get("name") ?? ""),
          email: String(data.get("email") ?? ""),
          message: `Pre-order: ${content.product} — ${colourway.name}`,
        }),
      });
      setStatus("sent");
    } catch {
      setStatus("failed");
    }
  };

  return (
    <section id="buy" aria-labelledby="buy-heading" className="px-6 pb-32 max-mobile:px-3 max-mobile:pb-20">
      <div className="grid grid-cols-2 gap-16 rounded-3xl border border-accent/30 bg-surface px-12 py-20 max-portrait:grid-cols-1 max-portrait:px-8 max-mobile:gap-12 max-mobile:px-5 max-mobile:py-14">
        <div>
          <p className="font-mono text-label uppercase tracking-wide text-accent">{content.eyebrow}</p>
          <h2 id="buy-heading" className="mt-3 font-display text-display leading-display">
            {content.heading}
          </h2>
          <p className="mt-8 flex items-baseline gap-4">
            <span className="font-display text-title">{content.product}</span>
            <span className="font-display text-title text-accent">{content.price}</span>
          </p>
          <p className="mt-3 text-body text-foreground/70">{content.shipping}</p>

          <h3 className="mt-12 font-mono text-label uppercase tracking-wide text-foreground/60">{content.inTheBoxHeading}</h3>
          <ul className="mt-4 flex flex-col gap-2 text-body">
            {content.inTheBox.map((item) => (
              <li key={item} className="flex items-center gap-3">
                <span aria-hidden="true" className="size-1.5 rounded-full bg-accent" />
                {item}
              </li>
            ))}
          </ul>
        </div>

        <form onSubmit={onSubmit} className="flex flex-col gap-8 self-end">
          <FinishSwatches colourways={colourways} legend={content.legend} name="finish-order" />
          <label className="font-mono text-label uppercase tracking-wide text-foreground/60">
            {content.form.name}
            <input name="name" required maxLength={100} autoComplete="name" className={fieldClass} />
          </label>
          <label className="font-mono text-label uppercase tracking-wide text-foreground/60">
            {content.form.email}
            <input name="email" type="email" required autoComplete="email" className={fieldClass} />
          </label>
          <button
            type="submit"
            disabled={status === "sending"}
            className="rounded-full bg-accent px-8 py-5 font-mono text-label uppercase tracking-wide text-background transition-opacity duration-[var(--duration-fast)] ease-entrance hover:opacity-85 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent disabled:opacity-60"
          >
            {status === "sending" ? content.form.sending : `${content.form.submit} — ${content.price}`}
          </button>
          <p role="status" className="min-h-6 text-label text-foreground/70">
            {status === "sent" ? content.form.success : status === "failed" ? content.form.error : content.form.note}
          </p>
        </form>
      </div>
    </section>
  );
};
