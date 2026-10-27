import { japanDate, validPlanDate } from "./plans";
export const ACTIVITY_KINDS = { theatre: "観劇", movie: "映画", fanmeeting: "ファンミーティング", concert: "コンサート", other: "その他" } as const;
export type ActivityKind = keyof typeof ACTIVITY_KINDS;
export interface ActivityInput { kind: ActivityKind; date: string; time: string | null; title: string; venue: string; city: string; memo: string }
export interface ActivityRecord extends ActivityInput { id: string; source_plan_id: string | null; created_at: string; updated_at: string }
export function normalizeActivity(value: unknown, now: Date): ActivityInput {
  if (!value || typeof value !== "object") throw new Error("記録の内容を確認してください。");
  const r = value as Record<string, unknown>;
  const text = (key: string, max: number) => { const s = typeof r[key] === "string" ? r[key].trim() : ""; if (s.length > max) throw new Error("入力した文字数が多すぎます。"); return s; };
  if (typeof r.kind !== "string" || !Object.hasOwn(ACTIVITY_KINDS, r.kind)) throw new Error("記録の種類を選んでください。");
  if (!validPlanDate(r.date)) throw new Error("日付を正しく入力してください。");
  if (r.date > japanDate(now)) throw new Error("未来の日付は「私の予定」に登録してください。");
  const title = text("title", 200), venue = text("venue", 500);
  if (!title || !venue) throw new Error("作品・イベント名と会場を入力してください。");
  let time: string | null = null;
  if (r.time !== "" && r.time != null) { if (typeof r.time !== "string" || !/^([01]\d|2[0-3]):[0-5]\d(?::00)?$/.test(r.time)) throw new Error("時刻を正しく入力してください。"); time = r.time.slice(0, 5); }
  return { kind: r.kind as ActivityKind, date: r.date, time, title, venue, city: text("city", 200), memo: text("memo", 3000) };
}
export function filterActivity(records: ActivityRecord[], year: string, kind: string, query: string): ActivityRecord[] {
  const key = (s: string) => s.normalize("NFKC").toLowerCase().replace(/\s+/g, "");
  const q = key(query);
  return records.filter(r => (!year || r.date.startsWith(`${year}-`)) && (!kind || r.kind === kind) && key(`${r.title} ${r.venue} ${r.city} ${r.memo}`).includes(q))
    .sort((a, b) => b.date.localeCompare(a.date) || (b.time || "").localeCompare(a.time || "") || a.id.localeCompare(b.id));
}
