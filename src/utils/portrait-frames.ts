/**
 * The portrait cut of the home sequences (`public/assets/<sequence>-portrait`):
 * the centre cut of each landscape frame, re-encoded for phones.
 *
 * A canvas cover-fits and centres its frame, so a box no wider than this
 * aspect shows nothing outside the cut — the same picture from a third of the
 * pixels. Keep PORTRAIT_FRAME_ASPECT in step with the cut when exporting.
 */

/** Width / height of the portrait cut. */
export const PORTRAIT_FRAME_ASPECT = 405 / 720;

/** Whether a box of this size shows nothing outside the portrait cut. */
export const fitsPortraitFrames = (width: number, height: number): boolean =>
  width > 0 && height > 0 && width / height <= PORTRAIT_FRAME_ASPECT;
