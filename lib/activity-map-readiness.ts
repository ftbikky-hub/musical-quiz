export interface MemoryMapReadiness { id: string; status: "loading" | "ready" | "failed" }
// Camera arrival and tile completion are independent. Only both release playback.
export function createMemoryMapGate(notify: (state: MemoryMapReadiness) => void) {
  let id = "initial", moving = false, loading = true, painted = false, failed = false, active = true, previous = "";
  function report() {
    const status = failed ? "failed" : moving || loading || !painted ? "loading" : "ready";
    const key = `${id}:${status}`;
    if (active && key !== previous) { previous = key; notify({ id, status }); }
  }
  return {
    begin(nextId: string) { id = nextId; moving = true; painted = false; report(); },
    moveStart() { moving = true; painted = false; report(); },
    moveEnd(tilesLoading: boolean) { moving = false; loading = tilesLoading; report(); },
    tileStart() { loading = true; painted = false; report(); },
    tileEnd() { loading = false; report(); },
    paintReady() { painted = true; report(); },
    tileError() { failed = true; report(); },
    retry() { failed = false; loading = true; painted = false; report(); },
    dispose() { active = false; },
  };
}

export function tilesCoverViewport(rects: { left: number; top: number; right: number; bottom: number }[], width: number, height: number) {
  if (width <= 0 || height <= 0 || !rects.length) return false;
  for (let row = 0; row <= 8; row++) for (let col = 0; col <= 8; col++) {
    const x = 2 + (width - 4) * col / 8, y = 2 + (height - 4) * row / 8;
    if (!rects.some(r => r.left <= x && r.right >= x && r.top <= y && r.bottom >= y)) return false;
  }
  return true;
}
