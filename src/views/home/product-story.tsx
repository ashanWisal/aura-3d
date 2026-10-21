"use client";

/**
 * @fileoverview The story — one pinned stretch of scroll (three viewports
 * per chapter) with the headphones in WebGL behind and the chapter captions
 * over them.
 *
 * Scroll progress 0-1 goes to the product store, which the canvas reads to
 * pick its shot, and is sliced into each chapter's own 0-1 for its caption
 * and ghost words. The robot form gets no canvas — a static gradient stands
 * in, and every caption is in the served HTML anyway.
 */

import { useCallback, useRef } from "react";
import { PinnedScene } from "@/components/common/pinned-scene";
import { useRobot } from "@/components/common/robot-view";
import type { ChapterContent } from "@/data/home";
import { ChapterCaption, type ChapterCaptionHandle } from "@/views/home/chapter-caption";
import { GhostWords, type GhostWordsHandle } from "@/views/home/ghost-words";
import { useProduct } from "@/views/home/headphones/product-store";
import { StoryCanvas } from "@/views/home/headphones/story-canvas";

/** Scroll viewports per chapter. */
const VIEWPORTS_PER_CHAPTER = 3;

export interface ProductStoryProps {
  chapters: ChapterContent[];
  label: string;
}

export const ProductStory = ({ chapters, label }: ProductStoryProps) => {
  const robot = useRobot();
  const setProgress = useProduct((state) => state.setProgress);
  const captionsRef = useRef<(ChapterCaptionHandle | null)[]>([]);
  const ghostsRef = useRef<(GhostWordsHandle | null)[]>([]);

  const handleProgress = useCallback(
    (progress: number) => {
      setProgress(progress);
      chapters.forEach((_, index) => {
        const local = Math.min(Math.max(progress * chapters.length - index, 0), 1);
        captionsRef.current[index]?.setProgress(local);
        ghostsRef.current[index]?.setProgress(local);
      });
    },
    [chapters, setProgress],
  );

  return (
    <PinnedScene
      label={label}
      span={chapters.length * VIEWPORTS_PER_CHAPTER + 1}
      onProgress={handleProgress}
      stageClassName="bg-background"
    >
      {robot ? (
        <div aria-hidden="true" className="absolute inset-0 bg-radial from-surface-raised to-background" />
      ) : (
        <StoryCanvas />
      )}
      {chapters.map(
        (chapter, index) =>
          chapter.ghostLines && (
            <GhostWords
              key={chapter.id}
              ref={(handle) => {
                ghostsRef.current[index] = handle;
              }}
              lines={chapter.ghostLines}
            />
          ),
      )}
      {/* Readability scrim under the copy. */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-linear-to-t from-scrim/70 via-scrim/0 to-scrim/30" />
      {chapters.map((chapter, index) => (
        <ChapterCaption
          key={chapter.id}
          ref={(handle) => {
            captionsRef.current[index] = handle;
          }}
          chapter={chapter}
          first={index === 0}
          last={index === chapters.length - 1}
        />
      ))}
    </PinnedScene>
  );
};
