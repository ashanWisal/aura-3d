"use client";

/**
 * @fileoverview The finish picker — a native radio group drawn as swatches,
 * bound to the product store, so every picker on the page (and every model)
 * shows the same finish. Keyboard and screen readers get real radios.
 */

import type { Colourway } from "@/data/home";
import { useProduct } from "@/views/home/headphones/product-store";

export interface FinishSwatchesProps {
  colourways: Colourway[];
  legend: string;
  /** Radio group name; unique per picker on the page. */
  name: string;
}

export const FinishSwatches = ({ colourways, legend, name }: FinishSwatchesProps) => {
  const colourway = useProduct((state) => state.colourway);
  const setColourway = useProduct((state) => state.setColourway);

  return (
    <fieldset>
      <legend className="font-mono text-label uppercase tracking-wide text-foreground/60">
        {legend} — <span className="text-foreground">{colourway.name}</span>
      </legend>
      <div className="mt-4 flex gap-4">
        {colourways.map((item) => (
          <label key={item.id} className="group relative cursor-pointer">
            <input
              type="radio"
              name={name}
              value={item.id}
              checked={colourway.id === item.id}
              onChange={() => setColourway(item.id)}
              className="peer sr-only"
            />
            <span
              aria-hidden="true"
              className="block size-12 rounded-full border-2 border-foreground/20 ring-accent ring-offset-4 ring-offset-background transition-shadow duration-[var(--duration-fast)] ease-entrance group-hover:border-foreground/50 peer-checked:ring-2 peer-focus-visible:ring-2 max-mobile:size-10"
              style={{ backgroundColor: item.swatch }}
            />
            <span className="sr-only">{item.name}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
};
