/** Where a showcase recording and its poster (the recording's first frame) are served from. */
export function recordingFiles(name: string): { video: string; poster: string } {
  return { video: `/videos/${name}.mp4`, poster: `/videos/${name}.webp` };
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
