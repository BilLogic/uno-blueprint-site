import type { ZoomKeyframe } from "./recording-zoom";

/** One tab of a showcase, as its content declares it. */
export type ShowcaseTab<T extends string> = {
  value: T;
  label: string;
  /**
   * What the picture is about; it follows the tab's label under the stage,
   * and names the recording.
   */
  caption: string;
  /**
   * The screen recording played on the stage while this tab is selected,
   * named by its file under public/videos.
   */
  recording: string;
  /** The recording comes with a mask of what to show of it (`<recording>-mask.png`). */
  masked?: boolean;
  /** How the recording zooms with its action. */
  zoom?: readonly ZoomKeyframe[];
};

type RecordingFiles = { video: string; poster: string; mask?: string };

/**
 * Where a showcase recording, its poster (the recording's first frame) and,
 * if it has one, its mask are served from.
 */
export function recordingFiles(name: string, masked = false): RecordingFiles {
  const files = { video: `/videos/${name}.mp4`, poster: `/videos/${name}.webp` };
  return masked ? { ...files, mask: `/videos/${name}-mask.png` } : files;
}

type Playback = {
  /** The reader's last press of the pause/play button: true for Play, null before any press. */
  choice: boolean | null;
  /** The reader asked for less motion. */
  reducedMotion: boolean;
};

/**
 * Whether the reader wants the recording moving. Until they press the button
 * it moves, unless they asked for less motion; after that, their press decides.
 */
export function wantsPlay({ choice, reducedMotion }: Playback): boolean {
  return choice ?? !reducedMotion;
}

/** Whether the recording plays now: the reader wants it moving and its stage is on screen. */
export function shouldPlay(playback: Playback & { inView: boolean }): boolean {
  return playback.inView && wantsPlay(playback);
}

/** A video element as far as going fullscreen goes; iPhone Safari has only its own `webkitEnterFullscreen`. */
export type FullscreenVideo = {
  requestFullscreen?: () => Promise<void>;
  webkitEnterFullscreen?: () => void;
};

/**
 * Opens a recording fullscreen: through the standard call where the browser
 * has it, and otherwise through iPhone Safari's own player. A refusal is no
 * error: the standard call may reject (no user gesture, say), and Safari's
 * throws while the video has no metadata yet, as with `preload="none"`.
 */
export function openFullscreen(video: FullscreenVideo): void {
  if (typeof video.requestFullscreen === "function") {
    video.requestFullscreen().catch(() => {});
    return;
  }
  try {
    video.webkitEnterFullscreen?.();
  } catch {
    // Refused; the recording stays on the page.
  }
}
