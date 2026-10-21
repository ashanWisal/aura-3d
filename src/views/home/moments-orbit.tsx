"use client";

/**
 * @fileoverview The headphones turning inside a ring of everyday moments —
 * the left arc and the right arc, each moment an icon on the ring with its
 * name outside it. Hovering, focusing or pressing a moment makes it the
 * active one and puts its line under the ring.
 *
 * The ring is laid out by angle (`spot`): moments are spread evenly over an
 * arc either side, top to bottom. Portrait screens drop the ring for a plain
 * two-column list under the headphones. The robot form gets no canvas.
 */

import { useState } from "react";
import {
  AudioWaveform,
  BatteryCharging,
  Clapperboard,
  Focus,
  Gamepad2,
  type LucideIcon,
  Luggage,
  MonitorSmartphone,
  Phone,
  Plane,
  TrainFront,
} from "lucide-react";
import { useRobot } from "@/components/common/robot-view";
import type { Moment, momentsContent } from "@/data/home";
import { FinishCanvas } from "@/views/home/headphones/finish-canvas";

const ICONS: Record<Moment["icon"], LucideIcon> = {
  commute: TrainFront,
  flight: Plane,
  focus: Focus,
  calls: Phone,
  films: Clapperboard,
  studio: AudioWaveform,
  gaming: Gamepad2,
  devices: MonitorSmartphone,
  travel: Luggage,
  charge: BatteryCharging,
};

/** Each arc spans this many degrees either side of the horizontal. */
const ARC_HALF = 55;

/** Where moment `index` of `count` on a side sits on the ring, as % of the ring box. */
const spot = (index: number, count: number, left: boolean) => {
  const fromTop = count === 1 ? 0.5 : index / (count - 1);
  const degrees = ARC_HALF - fromTop * ARC_HALF * 2;
  const radians = ((left ? 180 - degrees : degrees) * Math.PI) / 180;
  return { left: `${50 + 50 * Math.cos(radians)}%`, top: `${50 - 50 * Math.sin(radians)}%` };
};

export interface MomentsOrbitProps {
  content: typeof momentsContent;
}

export const MomentsOrbit = ({ content }: MomentsOrbitProps) => {
  const robot = useRobot();
  const [active, setActive] = useState(0);
  const { moments, perSide } = content;
  const current = moments[active];

  return (
    <div>
      {/* The ring fits the screen's height, so it is seen whole. */}
      <div className="relative mx-auto aspect-square w-[min(100%,72svh)] max-portrait:aspect-auto max-portrait:w-full">
        <div aria-hidden="true" className="absolute inset-0 rounded-full border border-foreground/15 max-portrait:hidden" />
        <div className="absolute inset-1/6 max-portrait:relative max-portrait:inset-auto max-portrait:h-[50svh]">
          {!robot && <FinishCanvas />}
        </div>

        <ul className="max-portrait:mt-10 max-portrait:grid max-portrait:grid-cols-2 max-portrait:gap-x-6 max-portrait:gap-y-5 max-mobile:gap-x-3">
          {moments.map((moment, index) => {
            const left = index < perSide;
            const Icon = ICONS[moment.icon];
            return (
              <li
                key={moment.name}
                className="absolute max-portrait:static"
                style={spot(left ? index : index - perSide, left ? perSide : moments.length - perSide, left)}
              >
                <button
                  type="button"
                  aria-pressed={index === active}
                  onClick={() => setActive(index)}
                  onFocus={() => setActive(index)}
                  onPointerEnter={() => setActive(index)}
                  className="group absolute -translate-1/2 rounded-full focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent max-portrait:static max-portrait:flex max-portrait:translate-none max-portrait:items-center max-portrait:gap-4 max-mobile:gap-3"
                >
                  <span className="flex size-14 items-center justify-center rounded-full border border-foreground/20 bg-surface text-foreground/70 transition-colors duration-[var(--duration-fast)] ease-entrance group-hover:border-accent group-hover:text-foreground group-aria-pressed:border-accent group-aria-pressed:bg-accent group-aria-pressed:text-background max-mobile:size-12">
                    <Icon aria-hidden="true" className="size-5" strokeWidth={1.5} />
                  </span>
                  <span
                    className={`absolute top-1/2 -translate-y-1/2 font-mono text-meta whitespace-nowrap uppercase tracking-wide text-foreground/60 transition-colors duration-[var(--duration-fast)] ease-entrance group-hover:text-foreground group-aria-pressed:text-foreground max-portrait:static max-portrait:m-0 max-portrait:translate-none max-portrait:text-left max-mobile:whitespace-normal ${
                      left ? "right-full mr-5 text-right" : "left-full ml-5 text-left"
                    }`}
                  >
                    {moment.name}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      <p aria-live="polite" className="mx-auto mt-12 min-h-16 max-w-xl text-center text-body text-foreground/75">
        <span className="text-foreground">{current.name}.</span> {current.description}
      </p>
      <div className="mt-8 flex justify-center">
        <a
          href={content.ctaHref}
          className="rounded-full bg-accent px-6 py-3 font-mono text-label uppercase tracking-wide text-background transition-opacity duration-[var(--duration-fast)] ease-entrance hover:opacity-85 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent"
        >
          {content.cta}
        </a>
      </div>
    </div>
  );
};
