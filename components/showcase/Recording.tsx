"use client";

import { useEffect, useRef } from "react";
import { recordingFiles } from "@/lib/recording";

type RecordingProps = {
  /** The recording's file name under public/videos, without its extension. */
  name: string;
  /** Plays inside a handset standing on the stage's foot, rather than filling the stage. */
  handset: boolean;
  /** The stage is on screen or close to it; until then not even the poster loads. */
  near: boolean;
  playing: boolean;
  /** The id of the text that names the recording for assistive technology. */
  labelledBy: string;
};

/**
 * A muted, looping screen recording. Its poster loads once the stage is near
 * and the video once it first plays, so a stage never scrolled to costs
 * nothing. A new element per tab starts each recording from its first frame.
 * On a phone it shows whole, however the stage is shaped.
 */
export function Recording({ name, handset, near, playing, labelledBy }: RecordingProps) {
  const ref = useRef<HTMLVideoElement>(null);
  const { video, poster } = recordingFiles(name);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    if (!playing) {
      element.pause();
      return;
    }
    // React sets `muted` as a property after hydration, if at all; a muted video may always play.
    element.muted = true;
    // A pause before the play settles rejects it with an AbortError, which is no error; anything else surfaces.
    const play = () =>
      element.play().catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        throw error;
      });
    play();
    // iPhone Safari's own fullscreen player pauses the video as it closes; the page picks it up again.
    element.addEventListener("webkitendfullscreen", play);
    return () => element.removeEventListener("webkitendfullscreen", play);
  }, [playing]);

  const player = (
    <video
      ref={ref}
      src={video}
      poster={near ? poster : undefined}
      preload="none"
      muted
      loop
      playsInline
      disablePictureInPicture
      aria-labelledby={labelledBy}
      className="block size-full object-cover max-sm:object-contain [&:fullscreen]:object-contain"
    />
  );

  if (!handset) return <div className="absolute inset-0">{player}</div>;

  // The screen takes the recording's own shape, so the frame round it crops nothing.
  return (
    <div
      data-testid="phone-frame"
      className="absolute top-(--spacing-phone-top) bottom-0 left-1/2 -translate-x-1/2 overflow-hidden rounded-t-phone border border-b-0 border-line bg-card-2 px-(--spacing-phone-bezel) pt-(--spacing-phone-bezel) text-handset shadow-handset"
    >
      <div className="aspect-phone h-full overflow-hidden rounded-t-phone-screen bg-panel">{player}</div>
    </div>
  );
}
