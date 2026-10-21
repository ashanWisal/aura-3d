"use client";

/**
 * @fileoverview The studio both canvases shoot in: a warm key from above,
 * a gold rim behind, and an environment of softboxes built in the scene
 * (drei <Lightformer>) — so the metal has something to reflect without
 * downloading an HDR.
 */

import { Environment, Lightformer } from "@react-three/drei";

const WARM = "#ffe7c2";
const GOLD = "#c9a35b";
const COOL = "#c9d6ff";

export const StudioLights = () => (
  <>
    <ambientLight intensity={0.15} />
    <spotLight color={WARM} intensity={60} angle={0.5} penumbra={0.8} position={[2, 8, 6]} />
    <directionalLight color={GOLD} intensity={2.2} position={[-5, 2, -6]} />
    <Environment resolution={256} frames={1}>
      {/* A long softbox overhead, two strips at the sides, a cool fill low. */}
      <Lightformer form="rect" intensity={3} color={WARM} position={[0, 6, 2]} rotation-x={Math.PI / 2} scale={[10, 3, 1]} />
      <Lightformer form="rect" intensity={2} color={WARM} position={[-6, 1, 1]} rotation-y={Math.PI / 2} scale={[2, 8, 1]} />
      <Lightformer form="rect" intensity={1.4} color={GOLD} position={[6, 1, -2]} rotation-y={-Math.PI / 2} scale={[2, 8, 1]} />
      <Lightformer form="ring" intensity={0.8} color={COOL} position={[0, -4, 4]} scale={4} />
    </Environment>
  </>
);
