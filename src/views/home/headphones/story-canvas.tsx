"use client";

/**
 * @fileoverview The story's WebGL stage: the headphones, turned and framed
 * by the scroll.
 *
 * The camera stays put; the scroll moves the model. `SHOTS` is the shot
 * list — at each point of story progress, how the headphones are turned,
 * where they sit in frame, how close they are and how far apart. Between
 * shots the values ease along, and the model chases them with a little
 * damping, so a fast scroll still reads as a camera move, not a jump.
 * Portrait screens centre the model higher and stand further back.
 *
 * On top of the shot: a slow float and the pointer tilting the view, both
 * off under reduced motion. The render loop runs only while the canvas is on
 * screen.
 */

import { useEffect, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Bloom, EffectComposer, Vignette } from "@react-three/postprocessing";
import type { Group } from "three";
import { insideCallouts } from "@/data/home";
import { Backdrop } from "@/views/home/headphones/backdrop";
import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion";
import { Headphones } from "@/views/home/headphones/headphones";
import { useProduct } from "@/views/home/headphones/product-store";
import { StudioLights } from "@/views/home/headphones/studio-lights";

interface Shot {
  /** Story progress this shot is reached at. */
  at: number;
  /** Turn about the vertical axis and tilt towards the camera, radians. */
  yaw: number;
  pitch: number;
  /** Distance from the camera. */
  distance: number;
  /** Where the model sits in frame, world units (landscape). */
  x: number;
  y: number;
  explode: number;
}

/** Chapters are 0.2 apart: hero, frame, materials, inside, together. */
const SHOTS: Shot[] = [
  { at: 0, yaw: -0.55, pitch: 0.18, distance: 10, x: 1.7, y: 0.45, explode: 0 },
  { at: 0.16, yaw: -0.8, pitch: 0.18, distance: 10, x: 1.7, y: 0.45, explode: 0 },
  // The frame: side on, then from above and behind.
  { at: 0.25, yaw: -1.45, pitch: 0.05, distance: 10.5, x: -0.6, y: 0.55, explode: 0 },
  { at: 0.35, yaw: -2.65, pitch: 0.7, distance: 10.5, x: -0.5, y: 0.3, explode: 0 },
  // Materials: right up to the right ear cup, light sweeping across it.
  { at: 0.45, yaw: -1.57, pitch: 0.12, distance: 5.6, x: 0.6, y: 1.25, explode: 0 },
  { at: 0.56, yaw: -1.15, pitch: 0.22, distance: 5.2, x: -0.1, y: 1.15, explode: 0 },
  // Inside: pull back, then everything comes apart.
  { at: 0.63, yaw: -0.3, pitch: 0.16, distance: 13.5, x: 0.4, y: 0.6, explode: 0 },
  { at: 0.72, yaw: -0.45, pitch: 0.22, distance: 15, x: 0.4, y: 0.75, explode: 1 },
  { at: 0.79, yaw: -0.6, pitch: 0.22, distance: 15, x: 0.4, y: 0.75, explode: 1 },
  // Together: back in one piece, facing you.
  { at: 0.9, yaw: -0.08, pitch: 0.08, distance: 10, x: -0.7, y: 0.5, explode: 0 },
  { at: 1, yaw: 0, pitch: 0.06, distance: 10, x: -0.7, y: 0.5, explode: 0 },
];

const FOV = 30;
/** Portrait: stand back by this much, and lift the model above the copy. */
const PORTRAIT_DISTANCE = 1.7;
const PORTRAIT_LIFT = 0.9;
/** How quickly the model catches up with the shot, per second. */
const DAMPING = 5;
const FLOAT = { yaw: 0.07, y: 0.06 };
const POINTER = { yaw: 0.18, pitch: 0.1 };

const ease = (value: number) => value * value * (3 - 2 * value);

const sampleShot = (progress: number, out: Omit<Shot, "at">) => {
  const found = SHOTS.findIndex((shot) => shot.at >= progress);
  const nextIndex = found === -1 ? SHOTS.length - 1 : found;
  const b = SHOTS[nextIndex];
  const a = SHOTS[Math.max(nextIndex - 1, 0)];
  const t = b.at === a.at ? 1 : ease((progress - a.at) / (b.at - a.at));
  out.yaw = a.yaw + (b.yaw - a.yaw) * t;
  out.pitch = a.pitch + (b.pitch - a.pitch) * t;
  out.distance = a.distance + (b.distance - a.distance) * t;
  out.x = a.x + (b.x - a.x) * t;
  out.y = a.y + (b.y - a.y) * t;
  out.explode = a.explode + (b.explode - a.explode) * t;
};

const Rig = ({ motion }: { motion: boolean }) => {
  const groupRef = useRef<Group>(null);
  const target = useRef<Omit<Shot, "at">>({ ...SHOTS[0] });
  const current = useRef<Omit<Shot, "at"> | null>(null);

  useFrame((state, delta) => {
    const group = groupRef.current;
    if (!group) return;
    sampleShot(useProduct.getState().progress, target.current);
    // First frame lands on the shot; after that the model chases it.
    current.current ??= { ...target.current };
    const now = current.current;
    const k = Math.min(1, delta * DAMPING);
    for (const key of Object.keys(now) as (keyof typeof now)[]) {
      now[key] += (target.current[key] - now[key]) * k;
    }

    const portrait = state.size.width < state.size.height;
    const time = state.clock.elapsedTime;
    const float = motion ? 1 : 0;
    group.rotation.set(
      now.pitch - state.pointer.y * POINTER.pitch * float,
      now.yaw + Math.sin(time * 0.4) * FLOAT.yaw * float + state.pointer.x * POINTER.yaw * float,
      0,
    );
    group.position.set(
      portrait ? 0 : now.x,
      now.y + (portrait ? PORTRAIT_LIFT : 0) + Math.sin(time * 0.8) * FLOAT.y * float,
      -now.distance * (portrait ? PORTRAIT_DISTANCE : 1),
    );
  });

  return (
    <group ref={groupRef}>
      <Headphones getExplode={() => current.current?.explode ?? 0} callouts={insideCallouts} />
    </group>
  );
};

export const StoryCanvas = () => {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [onScreen, setOnScreen] = useState(true);
  const reducedMotion = usePrefersReducedMotion();

  useEffect(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper) return;
    const observer = new IntersectionObserver(([entry]) => setOnScreen(entry.isIntersecting));
    observer.observe(wrapper);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={wrapperRef} aria-hidden="true" className="absolute inset-0">
      <Canvas
        frameloop={onScreen ? "always" : "never"}
        dpr={[1, 1.75]}
        gl={{ antialias: false, powerPreference: "high-performance" }}
        camera={{ fov: FOV, near: 0.1, far: 60, position: [0, 0, 0] }}
      >
        <Backdrop />
        <StudioLights />
        <Rig motion={!reducedMotion} />
        <EffectComposer multisampling={4}>
          <Bloom mipmapBlur luminanceThreshold={0.9} luminanceSmoothing={0.2} intensity={0.45} radius={0.6} />
          <Vignette offset={0.3} darkness={0.65} />
        </EffectComposer>
      </Canvas>
    </div>
  );
};
