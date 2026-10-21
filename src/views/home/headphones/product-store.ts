/**
 * Shared state for the product: the story's scroll progress (written by
 * <ProductStory>, read every frame by the story canvas) and the chosen
 * colourway (set by the finish pickers, read by every model and the buy box).
 *
 * A store rather than lifted state: the view is a Server Component, and the
 * progress changes on every scroll tick — the canvas reads it with
 * `getState()` inside its frame loop instead of re-rendering.
 */
import { create } from "zustand";
import { colourways, type Colourway } from "@/data/home";

interface ProductState {
  /** Story progress 0-1 across the pinned stretch. */
  progress: number;
  setProgress: (progress: number) => void;
  colourway: Colourway;
  setColourway: (id: string) => void;
}

export const useProduct = create<ProductState>((set) => ({
  progress: 0,
  setProgress: (progress) => set({ progress }),
  colourway: colourways[0],
  setColourway: (id) =>
    set((state) => ({ colourway: colourways.find((item) => item.id === id) ?? state.colourway })),
}));
