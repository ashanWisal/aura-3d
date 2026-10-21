"use client";

/**
 * @fileoverview The Aura One: a real, textured outer model (CC-BY, credited
 * in the footer — see `modelCredit`) with the inner parts modelled in code,
 * since no downloaded asset has a driver, board and battery to take apart.
 *
 * Model space: the headband arcs over the origin and the ear cups hang either
 * side along x. At load each mesh of the model is baked into this space and
 * cut into pieces — the headband, and each cup part once per side — so the
 * exploded view can move them apart. The inner parts are built along their
 * cup's local +x (outward from the head); the left cup is the right one
 * turned half round.
 *
 * `getExplode()` is read every frame (0 = assembled, 1 = fully apart): each
 * cup part (<Part>) slides out along x on its own staggered slice of it, and
 * the headband lifts. Colours ease towards the chosen colourway, so a finish
 * change repaints rather than snaps.
 */

import { Suspense, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useFrame } from "@react-three/fiber";
import { Html, RoundedBox, useGLTF } from "@react-three/drei";
import {
  Box3,
  BufferAttribute,
  BufferGeometry,
  Color,
  DoubleSide,
  type Group,
  Matrix4,
  type Mesh,
  MeshStandardMaterial,
  type Object3D,
  Sphere,
  Vector2,
  Vector3,
} from "three";
import type { CalloutContent } from "@/data/home";
import { useProduct } from "@/views/home/headphones/product-store";

const MODEL_URL = "/assets/models/aura-one.glb";
/** The model is fitted to this height, with the top of the headband here. */
const HEIGHT = 3.5;
const TOP = 1.52;
const HALF_TURN = Math.PI;
const QUARTER_TURN = Math.PI / 2;

/** Fixed parts that no colourway changes. sRGB. */
const GOLD = "#c9a35b";
const DRIVER = "#d9d4c7";
const FABRIC = "#121113";
const BOARD = "#0f1412";
const BATTERY = "#2a2a2e";

/** Each cup part, from the head outwards, and how far it moves when apart. */
const PARTS = {
  cushion: -1.35,
  grille: -1.0,
  driver: -0.62,
  board: -0.18,
  battery: 0.32,
  shell: 0.78,
  cap: 1.32,
} as const;
type PartName = keyof typeof PARTS;
const PART_NAMES = Object.keys(PARTS) as PartName[];
/** Each part starts this much of the explode later than the one before. */
const STAGGER = 0.06;
/** Share of the explode each part spends moving, after its stagger. */
const SPAN = 1 - STAGGER * (PART_NAMES.length - 1);
const HEADBAND_LIFT = 0.95;

type Paint = "shell" | "leather" | "metal" | "gold" | "fabric";

/**
 * The model's meshes, by material name: the paint each takes and the part it
 * moves with. The frame (`bas_headphones`) is the headband above the
 * cushions and the cup's outer ring below them.
 */
const SOURCES: Record<string, { paint: Paint; part: PartName | "band"; plain?: true }> = {
  puffar: { paint: "leather", part: "cushion" },
  hr_del_skinn: { paint: "fabric", part: "grille" },
  mellan_del: { paint: "shell", part: "shell" },
  bas_headphones: { paint: "shell", part: "shell" },
  metall: { paint: "metal", part: "cap" },
  cirkel_ytter: { paint: "gold", part: "cap" },
  // Its normal map embosses the original maker's mark: drop it.
  cirkel: { paint: "gold", part: "cap", plain: true },
  vitt_skinn: { paint: "leather", part: "band" },
  metall_insida: { paint: "metal", part: "band" },
};

/**
 * How each paint reads. The model's own colour textures are dropped (the
 * colourway sets the colour), but its normal, roughness and occlusion maps
 * stay — that is where the grain, seams and stitching live.
 */
const FINISH: Record<Paint, { metalness: number; roughness?: number; color?: string }> = {
  shell: { metalness: 0.25 },
  leather: { metalness: 0 },
  metal: { metalness: 1 },
  gold: { metalness: 1, roughness: 0.25, color: GOLD },
  fabric: { metalness: 0, color: FABRIC },
};

/**
 * Inner parts, outward from the cushion's centre, at the drawn cup's size —
 * packed to stay inside the model's back plate (≈0.5 out) when assembled.
 */
const INNER = { driver: 0.1, board: 0.22, battery: 0.3 };
/** Driver cone around +y: apex at 0, rim at the top. */
const CONE_PROFILE = [new Vector2(0.06, 0), new Vector2(0.2, 0.05), new Vector2(0.37, 0.12), new Vector2(0.41, 0.13)];
/** Cushion half-height of the cup the inner parts were drawn for. */
const INNER_DRAWN_FOR = 0.67;

/** Callouts show once the explode is this far along, and hide below it. */
const CALLOUTS_FROM = 0.9;

/**
 * Where each callout pins to its part — outward and up from the cushion's
 * centre, in the same drawn units as `INNER` — and which way its line runs.
 * Neighbours alternate up and down, and lean apart, so labels never overlap.
 */
const CALLOUT_PINS: Record<
  CalloutContent["part"],
  { at: [number, number]; direction: "up" | "down"; reach: "short" | "long"; align: "left" | "right" }
> = {
  cushion: { at: [0, 0.5], direction: "up", reach: "short", align: "left" },
  driver: { at: [INNER.driver + 0.07, 0], direction: "down", reach: "short", align: "left" },
  board: { at: [INNER.board, 0.12], direction: "up", reach: "long", align: "right" },
  battery: { at: [INNER.battery, -0.1], direction: "down", reach: "long", align: "right" },
  cap: { at: [0.5, 0], direction: "up", reach: "short", align: "right" },
};

const smooth = (value: number) => {
  const clamped = Math.min(Math.max(value, 0), 1);
  return clamped * clamped * (3 - 2 * clamped);
};

type Side = 1 | -1;

interface Piece {
  geometry: BufferGeometry;
  material: MeshStandardMaterial;
  part: PartName | "band";
  side: Side;
}

interface Fitted {
  pieces: Piece[];
  painted: { material: MeshStandardMaterial; paint: Paint }[];
  /** Centre of the right cushion; the left mirrors it. */
  cup: Vector3;
  /** Scale for the inner parts, to fill this cup. */
  innerScale: number;
}

/** Quantised (meshopt) attributes can't be transformed in place: copy them out as floats. */
const toFloat = (attribute: BufferAttribute) => {
  const array = new Float32Array(attribute.count * attribute.itemSize);
  for (let i = 0; i < attribute.count; i++) {
    for (let c = 0; c < attribute.itemSize; c++) array[i * attribute.itemSize + c] = attribute.getComponent(i, c);
  }
  return new BufferAttribute(array, attribute.itemSize);
};

/**
 * Cuts a geometry into groups of triangles by where each triangle's centre
 * falls. The pieces share the attributes; each gets its own index and bounds.
 */
const cut = (geometry: BufferGeometry, groupOf: (x: number, y: number) => string) => {
  const position = geometry.getAttribute("position");
  const index = geometry.getIndex();
  const count = index ? index.count : position.count;
  const groups = new Map<string, { indices: number[]; box: Box3 }>();
  const point = new Vector3();
  for (let i = 0; i < count; i += 3) {
    const corners = [0, 1, 2].map((k) => (index ? index.getX(i + k) : i + k));
    const x = corners.reduce((sum, v) => sum + position.getX(v), 0) / 3;
    const y = corners.reduce((sum, v) => sum + position.getY(v), 0) / 3;
    const key = groupOf(x, y);
    const group = groups.get(key) ?? { indices: [], box: new Box3() };
    groups.set(key, group);
    for (const v of corners) {
      group.indices.push(v);
      group.box.expandByPoint(point.fromBufferAttribute(position, v));
    }
  }
  return [...groups].map(([key, { indices, box }]) => {
    const piece = new BufferGeometry();
    for (const [name, attribute] of Object.entries(geometry.attributes)) piece.setAttribute(name, attribute);
    piece.setIndex(indices);
    piece.boundingBox = box;
    piece.boundingSphere = box.getBoundingSphere(new Sphere());
    return { key, geometry: piece, box };
  });
};

const sideOf = (x: number): Side => (x < 0 ? -1 : 1);

/** Bakes the loaded model into model space and cuts it into pieces. */
const fitModel = (scene: Object3D): Fitted => {
  scene.updateMatrixWorld(true);
  // The model stands with its cups along z; turn them onto x.
  const turn = new Matrix4().makeRotationY(QUARTER_TURN);
  const baked: { name: string; geometry: BufferGeometry; source: MeshStandardMaterial }[] = [];
  const bounds = new Box3();
  scene.traverse((object) => {
    const mesh = object as Mesh;
    if (!mesh.isMesh) return;
    const geometry = new BufferGeometry();
    for (const [name, attribute] of Object.entries(mesh.geometry.attributes)) {
      const moves = name === "position" || name === "normal" || name === "tangent";
      geometry.setAttribute(name, moves ? toFloat(attribute as BufferAttribute) : attribute);
    }
    geometry.setIndex(mesh.geometry.getIndex());
    geometry.applyMatrix4(new Matrix4().multiplyMatrices(turn, mesh.matrixWorld));
    geometry.computeBoundingBox();
    bounds.union(geometry.boundingBox as Box3);
    const source = mesh.material as MeshStandardMaterial;
    baked.push({ name: source.name, geometry, source });
  });

  const scale = HEIGHT / (bounds.max.y - bounds.min.y);
  const centre = bounds.getCenter(new Vector3());
  const place = new Matrix4()
    .makeTranslation(0, TOP, 0)
    .multiply(new Matrix4().makeScale(scale, scale, scale))
    .multiply(new Matrix4().makeTranslation(-centre.x, -bounds.max.y, -centre.z));
  for (const { geometry } of baked) geometry.applyMatrix4(place);

  // The cushions place the cups: everything above them is headband.
  const cushions = baked.find((item) => item.name === "puffar");
  if (!cushions) throw new Error(`${MODEL_URL}: no cushion mesh`);
  const right = cut(cushions.geometry, (x) => String(sideOf(x))).find((piece) => piece.key === "1");
  if (!right) throw new Error(`${MODEL_URL}: no right cushion`);
  const cup = right.box.getCenter(new Vector3());
  const bandFrom = right.box.max.y + 0.05;

  const pieces: Piece[] = [];
  const painted: Fitted["painted"] = [];
  for (const { name, geometry, source } of baked) {
    const role = SOURCES[name];
    if (!role) throw new Error(`${MODEL_URL}: unknown mesh "${name}"`);
    const finish = FINISH[role.paint];
    const material = source.clone();
    material.map = null;
    material.metalnessMap = null;
    if (role.plain) material.normalMap = null;
    material.metalness = finish.metalness;
    if (finish.roughness !== undefined) {
      material.roughnessMap = null;
      material.roughness = finish.roughness;
    }
    material.color.set(finish.color ?? "#ffffff");
    if (!finish.color) painted.push({ material, paint: role.paint });

    const groupOf = (x: number, y: number) =>
      role.part === "band" || (name === "bas_headphones" && y > bandFrom) ? "band" : String(sideOf(x));
    for (const piece of cut(geometry, groupOf)) {
      const band = piece.key === "band";
      pieces.push({ geometry: piece.geometry, material, part: band ? "band" : role.part, side: band ? 1 : (Number(piece.key) as Side) });
    }
    geometry.dispose();
  }

  return { pieces, painted, cup, innerScale: (right.box.max.y - right.box.min.y) / 2 / INNER_DRAWN_FOR };
};

const useInnerMaterials = () => {
  const materials = useMemo(
    () => ({
      metal: new MeshStandardMaterial({ color: "#8d8a84", metalness: 1, roughness: 0.32 }),
      gold: new MeshStandardMaterial({ color: GOLD, metalness: 1, roughness: 0.25 }),
      driver: new MeshStandardMaterial({ color: DRIVER, metalness: 0.85, roughness: 0.3, side: DoubleSide }),
      board: new MeshStandardMaterial({ color: BOARD, metalness: 0.3, roughness: 0.6 }),
      battery: new MeshStandardMaterial({ color: BATTERY, metalness: 0.4, roughness: 0.5 }),
    }),
    [],
  );
  useEffect(() => () => Object.values(materials).forEach((material) => material.dispose()), [materials]);
  return materials;
};

type InnerMaterials = ReturnType<typeof useInnerMaterials>;

/** One cup part on one side, sliding along x on its slice of the explode. */
const Part = ({ name, side, getExplode, children }: { name: PartName; side: Side; getExplode: () => number; children: ReactNode }) => {
  const groupRef = useRef<Group>(null);
  const index = PART_NAMES.indexOf(name);

  useFrame(() => {
    if (groupRef.current) groupRef.current.position.x = side * PARTS[name] * smooth((getExplode() - index * STAGGER) / SPAN);
  });

  return <group ref={groupRef}>{children}</group>;
};

/** The parts the model doesn't have, built along the cup's local +x. */
const Inner = ({ name, materials }: { name: "driver" | "board" | "battery"; materials: InnerMaterials }) => {
  if (name === "driver")
    return (
      <group position-x={INNER.driver}>
        {/* Cone rim towards the head. */}
        <mesh material={materials.driver} rotation={[0, 0, QUARTER_TURN]} position-x={0.07}>
          <latheGeometry args={[CONE_PROFILE, 48]} />
        </mesh>
        <mesh material={materials.gold} rotation={[0, QUARTER_TURN, 0]} position-x={-0.06}>
          <torusGeometry args={[0.41, 0.022, 10, 64]} />
        </mesh>
        <mesh material={materials.metal} rotation={[0, 0, QUARTER_TURN]} position-x={0.12}>
          <cylinderGeometry args={[0.16, 0.16, 0.1, 32]} />
        </mesh>
      </group>
    );
  if (name === "board")
    return (
      <group position-x={INNER.board}>
        <mesh material={materials.board}>
          <boxGeometry args={[0.03, 0.58, 0.58]} />
        </mesh>
        {[
          [0.12, 0.1, 0.16],
          [-0.14, -0.08, 0.1],
          [0.02, -0.16, 0.12],
        ].map(([y, z, size]) => (
          <mesh key={`${y}${z}`} material={materials.gold} position={[0.025, y, z]}>
            <boxGeometry args={[0.02, size, size]} />
          </mesh>
        ))}
      </group>
    );
  return <RoundedBox position-x={INNER.battery} args={[0.08, 0.4, 0.6]} radius={0.03} smoothness={3} material={materials.battery} />;
};

const INNER_PARTS = ["driver", "board", "battery"] as const;

/**
 * A dot on the part, a leader line and the label at its end — DOM pinned to
 * the part by drei <Html>, so it rides along as the part slides. Fades on a
 * discrete shown/hidden switch; the canvas around it is aria-hidden, and the
 * same facts are in the chapter's copy.
 */
const Callout = ({ content, position, shown }: { content: CalloutContent; position: [number, number, number]; shown: boolean }) => {
  const { direction, reach, align } = CALLOUT_PINS[content.part];
  const up = direction === "up";
  return (
    <Html position={position} zIndexRange={[10, 0]} className="pointer-events-none max-mobile:hidden">
      <div
        className={`relative transition-opacity duration-[var(--duration-fast)] ease-entrance ${shown ? "opacity-100" : "opacity-0"}`}
      >
        <span className="absolute size-2.5 -translate-1/2 rounded-full border border-foreground/80 bg-accent shadow-glow" />
        <span
          className={`absolute left-0 w-px bg-foreground/45 ${up ? "bottom-1.5" : "top-1.5"} ${reach === "long" ? "h-28" : "h-14"}`}
        />
        <span
          className={`absolute flex flex-col gap-1 font-mono text-meta whitespace-nowrap uppercase tracking-wide ${
            up ? (reach === "long" ? "bottom-31" : "bottom-17") : reach === "long" ? "top-31" : "top-17"
          } ${align === "right" ? "left-0 items-start" : "right-0 items-end"}`}
        >
          <span className="text-foreground">{content.label}</span>
          <span className="text-foreground/55">{content.detail}</span>
        </span>
      </div>
    </Html>
  );
};

export interface HeadphonesProps {
  /** 0 assembled … 1 fully apart; read every frame. */
  getExplode: () => number;
  /** Labels pinned to the right cup's parts, shown while fully apart. */
  callouts?: CalloutContent[];
}

const Model = ({ getExplode, callouts = [] }: HeadphonesProps) => {
  const [calloutsShown, setCalloutsShown] = useState(false);
  const { scene } = useGLTF(MODEL_URL);
  const fitted = useMemo(() => fitModel(scene), [scene]);
  const inner = useInnerMaterials();
  const headbandRef = useRef<Group>(null);
  const targets = useMemo(() => ({ shell: new Color(), leather: new Color(), metal: new Color() }), []);
  const paintedRef = useRef(false);

  useEffect(
    () => () => {
      fitted.pieces.forEach((piece) => piece.geometry.dispose());
      new Set(fitted.pieces.map((piece) => piece.material)).forEach((material) => material.dispose());
    },
    [fitted],
  );

  useFrame((_, delta) => {
    const { colourway } = useProduct.getState();
    targets.shell.set(colourway.shell);
    targets.leather.set(colourway.leather);
    targets.metal.set(colourway.metal);
    inner.metal.color.copy(targets.metal);
    // First frame paints outright; after that a finish change eases in.
    const ease = paintedRef.current ? Math.min(1, delta * 4) : 1;
    paintedRef.current = true;
    for (const { material, paint } of fitted.painted) {
      if (paint === "shell" || paint === "leather" || paint === "metal") material.color.lerp(targets[paint], ease);
    }

    const explode = getExplode();
    if (headbandRef.current) headbandRef.current.position.y = smooth(explode) * HEADBAND_LIFT;
    // Only a crossing re-renders; React bails out when the value is unchanged.
    if (callouts.length) setCalloutsShown(explode > CALLOUTS_FROM);
  });

  const piecesOf = (part: PartName | "band", side: Side) =>
    fitted.pieces
      .filter((piece) => piece.part === part && (part === "band" || piece.side === side))
      .map((piece, i) => <mesh key={i} geometry={piece.geometry} material={piece.material} />);

  return (
    <group>
      <group ref={headbandRef}>{piecesOf("band", 1)}</group>
      {([1, -1] as const).map((side) => (
        <group key={side}>
          {PART_NAMES.map((name) => (
            <Part key={name} name={name} side={side} getExplode={getExplode}>
              {piecesOf(name, side)}
              {(INNER_PARTS as readonly string[]).includes(name) && (
                <group
                  position={[side * fitted.cup.x, fitted.cup.y, fitted.cup.z]}
                  rotation={[0, side === 1 ? 0 : HALF_TURN, 0]}
                  scale={fitted.innerScale}
                >
                  <Inner name={name as (typeof INNER_PARTS)[number]} materials={inner} />
                </group>
              )}
              {side === 1 &&
                callouts
                  .filter((content) => content.part === name)
                  .map((content) => {
                    const [out, up] = CALLOUT_PINS[content.part].at;
                    return (
                      <Callout
                        key={content.part}
                        content={content}
                        shown={calloutsShown}
                        position={[fitted.cup.x + out * fitted.innerScale, fitted.cup.y + up * fitted.innerScale, fitted.cup.z]}
                      />
                    );
                  })}
            </Part>
          ))}
        </group>
      ))}
    </group>
  );
};

/** Renders nothing until the model has loaded, then the headphones. */
export const Headphones = (props: HeadphonesProps) => (
  <Suspense fallback={null}>
    <Model {...props} />
  </Suspense>
);
