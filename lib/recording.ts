/**
 * Where a showcase recording, its poster (the recording's first frame) and,
 * for the phone's, its mask (the handset's silhouette) are served from.
 */
export function recordingFiles(name: string): { video: string; poster: string; mask: string } {
  return { video: `/videos/${name}.mp4`, poster: `/videos/${name}.webp`, mask: `/videos/${name}-mask.png` };
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
