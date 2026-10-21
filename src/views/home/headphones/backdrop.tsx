"use client";

/**
 * @fileoverview The warm pool of light the headphones float in: one large
 * plane far behind them, painted with a radial gradient on a small canvas
 * texture. The gradient is soft, so 256 px is plenty.
 */

import { useEffect, useMemo } from "react";
import { CanvasTexture, SRGBColorSpace } from "three";

const SIZE = 256;
/** Centre of the pool, then the dark it falls off into. sRGB. */
const GLOW = "#2e2821";
const DARK = "#0b0a09";

export interface BackdropProps {
  /** Distance behind the camera's focus, world units. */
  depth?: number;
}

export const Backdrop = ({ depth = 30 }: BackdropProps) => {
  const texture = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = SIZE;
    canvas.height = SIZE;
    const context = canvas.getContext("2d");
    if (context) {
      const gradient = context.createRadialGradient(SIZE / 2, SIZE * 0.42, 0, SIZE / 2, SIZE / 2, SIZE / 2);
      gradient.addColorStop(0, GLOW);
      gradient.addColorStop(1, DARK);
      context.fillStyle = gradient;
      context.fillRect(0, 0, SIZE, SIZE);
    }
    const map = new CanvasTexture(canvas);
    map.colorSpace = SRGBColorSpace;
    return map;
  }, []);
  useEffect(() => () => texture.dispose(), [texture]);

  return (
    <mesh position-z={-depth}>
      <planeGeometry args={[depth * 2.2, depth * 1.3]} />
      <meshBasicMaterial map={texture} toneMapped={false} />
    </mesh>
  );
};
