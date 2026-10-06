"use client";

import { useEffect, useImperativeHandle, useRef, type Ref } from "react";
import { vars } from "@/components/ui/vars";
import { openFullscreen, recordingFiles } from "@/lib/recording";
import { zoomAt, zoomTransform, type ZoomKeyframe } from "@/lib/recording-zoom";

/** What a showcase may ask of its recording. */
export type RecordingHandle = {
  /** Opens the recording fullscreen, if the browser lets it. */
  expand: () => void;
};

type RecordingProps = {
  /** The recording's file name under public/videos, without its extension. */
  name: string;
  /** A phone's recording, masked to the handset's silhouette, rather than a desktop window. */
  phone: boolean;
  /** Cut to the mask that comes with the recording. */
  masked: boolean;
  /** How the phone's recording zooms with its action; without it, it stays whole. */
  zoom?: readonly ZoomKeyframe[] | undefined;
  /** The stage is on screen or close to it; until then not even the poster loads. */
  near: boolean;
  playing: boolean;
  /** The id of the text that names the recording for assistive technology. */
  labelledBy: string;
  ref?: Ref<RecordingHandle>;
};

/**
 * A muted, looping screen recording. Its poster loads once the stage is near
 * and the video once it first plays, so a stage never scrolled to costs
 * nothing. A new element per tab starts each recording from its first frame.
 * It shows whole, however the stage is shaped: a desktop recording as a window
 * standing on the stage's foot, a phone's as the handset alone, centred.
 */
export function Recording({ name, phone, masked, zoom, near, playing, labelledBy, ref: handle }: RecordingProps) {
  const ref = useRef<HTMLVideoElement>(null);
  const zoomRef = useRef<HTMLDivElement>(null);
  const { video, poster, mask } = recordingFiles(name, masked);

  useImperativeHandle(handle, () => ({
    expand: () => {
      if (ref.current) openFullscreen(ref.current);
    },
  }));

  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    if (!playing) {
      element.pause();
      return;
    }
    // React sets `muted` as a property after hydration, if at all; a muted video may always play.
    element.muted = true;
    // A pause before the play settles rejects it with an AbortError, which is no error. A browser that will
    // not autoplay (Low Power Mode, a data saver) rejects it with a NotAllowedError: the poster stays, which
    // is no error either. Anything else surfaces.
    const play = () =>
      element.play().catch((error: unknown) => {
        if (error instanceof DOMException && (error.name === "AbortError" || error.name === "NotAllowedError")) return;
        throw error;
      });
    play();
    // iPhone Safari's own fullscreen player pauses the video as it closes; the page picks it up again.
    element.addEventListener("webkitendfullscreen", play);
    return () => element.removeEventListener("webkitendfullscreen", play);
  }, [playing]);

  // The zoom follows the video's own clock, so a pause, a loop or a seek
  // keeps it in step; it is redrawn every frame only while the video plays.
  useEffect(() => {
    const element = ref.current;
    const box = zoomRef.current;
    if (!element || !box) return;
    if (!zoom) {
      box.style.transform = "";
      return;
    }
    let frame = 0;
    const draw = () => {
      box.style.transform = zoomTransform(zoomAt(zoom, element.currentTime));
    };
    const tick = () => {
      draw();
      frame = requestAnimationFrame(tick);
    };
    const start = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(tick);
    };
    const stop = () => {
      cancelAnimationFrame(frame);
      draw();
    };
    draw();
    if (!element.paused) start();
    element.addEventListener("play", start);
    element.addEventListener("pause", stop);
    element.addEventListener("seeked", draw);
    return () => {
      cancelAnimationFrame(frame);
      element.removeEventListener("play", start);
      element.removeEventListener("pause", stop);
      element.removeEventListener("seeked", draw);
    };
  }, [zoom]);

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
      className={`block size-full object-cover [&:fullscreen]:object-contain ${mask ? "recording-mask" : ""}`}
      style={mask ? vars({ "--recording-mask": `url(${mask})` }) : undefined}
    />
  );

  if (phone) {
    return (
      // The stage, less a margin of dots; the handset is as large as fits
      // whole inside it, centred.
      <div data-recording className="absolute inset-(--spacing-phone-inset) grid place-items-center [container-type:size]">
        {/* Scaled from its centre and moved so the point in focus stays at the stage's centre; the shadow follows the mask. */}
        <div ref={zoomRef} data-testid="phone" className="fit-phone drop-shadow-phone">
          {player}
        </div>
      </div>
    );
  }

  return (
    // The stage, less a margin of dots at the top and sides; the window is as
    // large as fits whole inside it, standing on the stage's foot. It sinks
    // past the foot by its frame's width, so the stage clips the frame's lower
    // edge and its square lower corners.
    <div data-recording className="absolute inset-x-window-margin top-window-margin bottom-0 grid items-end justify-items-center [container-type:size]">
      <div data-testid="recording-window" className="window-outline relative fit-window translate-y-(--spacing-window-sink) overflow-hidden rounded-t-window shadow-window">
        {player}
      </div>
    </div>
  );
}
