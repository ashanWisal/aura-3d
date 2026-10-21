"use client";

/**
 * @fileoverview The finishes stage: the same headphones on their own small
 * canvas, turning slowly. Drag sideways to turn them yourself; the page
 * still scrolls vertically over it (`touch-action: pan-y`). The repaint on a
 * finish change comes from <Headphones> itself.
 */

import { useEffect, useRef, useState, type PointerEvent } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import type { Group } from "three";
import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion";
import { Headphones } from "@/views/home/headphones/headphones";
import { StudioLights } from "@/views/home/headphones/studio-lights";

/** Radians turned per pixel dragged, and per second when left alone. */
const DRAG_SPEED = 0.008;
const SPIN_SPEED = 0.25;

interface Turn {
  yaw: number;
  dragging: boolean;
}

const Turntable = ({ turn, spin }: { turn: React.RefObject<Turn>; spin: boolean }) => {
  const groupRef = useRef<Group>(null);
  /** The slow spin, added to whatever the drag has turned. */
  const spun = useRef(0);

  useFrame((_, delta) => {
    const group = groupRef.current;
    if (!group) return;
    if (spin && !turn.current.dragging) spun.current += delta * SPIN_SPEED;
    const yaw = turn.current.yaw + spun.current;
    group.rotation.y += (yaw - group.rotation.y) * Math.min(1, delta * 8);
  });

  return (
    <group ref={groupRef} position-y={0.35} rotation-x={0.12}>
      <Headphones getExplode={() => 0} />
    </group>
  );
};

export const FinishCanvas = () => {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [onScreen, setOnScreen] = useState(false);
  const reducedMotion = usePrefersReducedMotion();
  const turn = useRef<Turn>({ yaw: -0.6, dragging: false });
  const lastX = useRef(0);

  useEffect(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper) return;
    const observer = new IntersectionObserver(([entry]) => setOnScreen(entry.isIntersecting));
    observer.observe(wrapper);
    return () => observer.disconnect();
  }, []);

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    turn.current.dragging = true;
    lastX.current = event.clientX;
    event.currentTarget.setPointerCapture(event.pointerId);
  };
  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (!turn.current.dragging) return;
    turn.current.yaw += (event.clientX - lastX.current) * DRAG_SPEED;
    lastX.current = event.clientX;
  };
  const onPointerUp = () => {
    turn.current.dragging = false;
  };

  return (
    <div
      ref={wrapperRef}
      aria-hidden="true"
      className="absolute inset-0 cursor-grab touch-pan-y active:cursor-grabbing"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
    >
      <Canvas
        frameloop={onScreen ? "always" : "never"}
        dpr={[1, 1.75]}
        gl={{ antialias: true, alpha: true }}
        camera={{ fov: 30, position: [0, 0, 10.5] }}
      >
        <StudioLights />
        <Turntable turn={turn} spin={!reducedMotion} />
      </Canvas>
    </div>
  );
};
