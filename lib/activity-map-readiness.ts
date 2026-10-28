export interface MemoryMapReadiness { id: string; status: "loading" | "ready" | "failed" }
// Camera arrival and tile completion are independent. Only both release playback.
export function createMemoryMapGate(notify: (state: MemoryMapReadiness) => void) {
  let id = "initial", moving = false, loading = true, failed = false, active = true, previous = "";
  function report() {
    const status = failed ? "failed" : moving || loading ? "loading" : "ready";
    const key = `${id}:${status}`;
    if (active && key !== previous) { previous = key; notify({ id, status }); }
  }
  return {
    begin(nextId: string) { id = nextId; moving = true; report(); },
    moveStart() { moving = true; report(); },
    moveEnd(tilesLoading: boolean) { moving = false; loading = tilesLoading; report(); },
    tileStart() { loading = true; report(); },
    tileEnd() { loading = false; report(); },
    tileError() { failed = true; report(); },
    retry() { failed = false; loading = true; report(); },
    dispose() { active = false; },
  };
}
