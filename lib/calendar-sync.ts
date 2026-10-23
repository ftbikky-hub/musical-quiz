import { normalizePlan, inferPlanKind, japanDate, validPlanDate, type PlanInput } from "./plans";
export interface CalendarSyncConfig { calendarId: string; mode: "keywords" | "all" }
export function calendarSyncConfig(value: unknown): CalendarSyncConfig {
  const v = value as Record<string, unknown>;
  const calendarId = typeof v?.calendarId === "string" ? v.calendarId.trim() : "";
  if (!/^[a-zA-Z0-9_.@+\-]{1,500}$/.test(calendarId)) throw new Error("GoogleカレンダーのIDを入力してください（通常はprimary）。");
  if (v.mode !== "keywords" && v.mode !== "all") throw new Error("取り込む範囲を選んでください。");
  return { calendarId, mode: v.mode };
}
export function calendarSyncSnapshot(value: unknown, config: CalendarSyncConfig, now: Date) {
  const v = value as Record<string, unknown>;
  if (!v || v.version !== 1 || v.calendarId !== config.calendarId || v.complete !== true || !Array.isArray(v.events) || v.events.length > 500) throw new Error("同期データを確認してください。");
  if (!validPlanDate(v.from) || !validPlanDate(v.through)) throw new Error("同期する期間を確認してください。");
  const today = Date.parse(`${japanDate(now)}T00:00:00Z`), from = Date.parse(`${v.from}T00:00:00Z`), through = Date.parse(`${v.through}T00:00:00Z`);
  if (from < today - 2*86400000 || from > today + 86400000 || through < from || through - from > 740*86400000) throw new Error("同期する期間を確認してください。");
  const started = typeof v.startedAt === "string" ? Date.parse(v.startedAt) : NaN;
  if (!Number.isFinite(started) || now.getTime()-started > 15*60_000 || started-now.getTime()>2*60_000) throw new Error("同期データの有効時間を過ぎました。再実行してください。");
  const startDate = v.from, endDate = v.through;
  const seen = new Set<string>();
  const events: PlanInput[] = v.events.map(raw => {
    if (!raw || typeof raw !== "object") throw new Error("予定を確認してください。");
    const row = raw as Record<string, unknown>;
    const guess = inferPlanKind(`${row.title || ""} ${row.venue || ""}`);
    if (config.mode === "keywords" && !guess.suggested) throw new Error("対象外の予定が含まれています。");
    const plan = normalizePlan({ ...row, kind: guess.kind, status: "planned", work_id: null, deadline_date: null, deadline_time: null, result_date: null, result_time: null });
    if (!plan.source_uid?.startsWith("ical:") || seen.has(plan.source_uid) || plan.date < startDate || plan.date > endDate) throw new Error("予定のID・日付を確認してください。");
    seen.add(plan.source_uid); return plan;
  });
  return { from: v.from, through: v.through, startedAt: new Date(started).toISOString(), events };
}
