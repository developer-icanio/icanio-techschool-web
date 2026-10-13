"use client";

import { useEffect } from "react";

// When a visitor starts a video, pause every other video on the page.
// "play" doesn't bubble, so listen in the capture phase on the document.
export default function OneVideoAtATime() {
  useEffect(() => {
    const onPlay = (e: Event) => {
      const playing = e.target;
      if (!(playing instanceof HTMLVideoElement)) return;
      document.querySelectorAll("video").forEach((v) => {
        if (v !== playing && !v.paused) v.pause();
      });
    };
    document.addEventListener("play", onPlay, true);
    return () => document.removeEventListener("play", onPlay, true);
  }, []);
  return null;
}
