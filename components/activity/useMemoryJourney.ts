"use client";
import { useEffect, useRef, useState, type Dispatch, type SetStateAction } from "react";
import { journeyDuration, journeyFrame, type JourneyView } from "@/lib/activity-journey";

export function useMemoryJourney(view: JourneyView, setView: Dispatch<SetStateAction<JourneyView>>, target: JourneyView | null, focusKey: string, enabled: boolean) {
  const viewRef = useRef(view);
  const [arrivedKey, setArrivedKey] = useState("");
  useEffect(() => { viewRef.current = view; }, [view]);
  const x = target?.x, y = target?.y, zoom = target?.zoom;
  useEffect(() => {
    if (!enabled || x === undefined || y === undefined || zoom === undefined) return;
    const from = viewRef.current, to = { x, y, zoom };
    const duration = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : journeyDuration(from, to);
    let frame = 0, started: number | undefined;
    function tick(time: number) {
      started ??= time;
      const fraction = duration ? Math.min(1, (time - started) / duration) : 1;
      setView(journeyFrame(from, to, fraction));
      if (fraction < 1) frame = window.requestAnimationFrame(tick);
      else setArrivedKey(focusKey);
    }
    frame = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(frame);
  }, [enabled, focusKey, x, y, zoom, setView]);
  return arrivedKey;
}
