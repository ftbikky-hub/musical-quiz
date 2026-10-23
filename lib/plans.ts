export const PLAN_KINDS = { theatre: "観劇", concert: "コンサート", deadline: "抽選締め切り", result: "当落発表" } as const;
export const PLAN_STATUSES = { planned: "検討中", applied: "申込済み", confirmed: "チケット確保", not_selected: "落選", cancelled: "キャンセル", done: "完了" } as const;
export type PlanKind = keyof typeof PLAN_KINDS;
export type PlanStatus = keyof typeof PLAN_STATUSES;
export interface PlanInput {
  title: string; kind: PlanKind; status: PlanStatus; date: string; time: string | null;
  end_date: string | null; end_time: string | null; venue: string; memo: string; url: string; work_id: number | null;
  deadline_date: string | null; deadline_time: string | null; result_date: string | null; result_time: string | null;
  source_uid: string | null;
}
export interface PersonalPlan extends PlanInput { id: string; created_at: string; updated_at: string }
export interface AgendaEntry { id: string; plan: PersonalPlan; kind: PlanKind; date: string; time: string | null; milestone: boolean }
export function japanDate(now: Date): string {
  const p = new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Tokyo", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(now);
  return `${p.find(x => x.type === "year")!.value}-${p.find(x => x.type === "month")!.value}-${p.find(x => x.type === "day")!.value}`;
}
export function validPlanDate(value: unknown): value is string {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) && value >= "1900-01-01" && value <= "2199-12-31" && !Number.isNaN(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value;
}
export function normalizePlan(value: unknown): PlanInput {
  if (!value || typeof value !== "object") throw new Error("予定の内容を確認してください。");
  const r = value as Record<string, unknown>;
  const text = (key: string, max: number) => { const s = typeof r[key] === "string" ? r[key].trim() : ""; if (s.length > max) throw new Error(`${key}の文字数が多すぎます。`); return s; };
  const date = (key: string, required = false) => { const s = r[key]; if ((s === "" || s == null) && !required) return null; if (!validPlanDate(s)) throw new Error("日付を正しく入力してください。"); return s; };
  const time = (key: string) => { const s = r[key]; if (s === "" || s == null) return null; if (typeof s !== "string" || !/^([01]\d|2[0-3]):[0-5]\d(?::00)?$/.test(s)) throw new Error("時刻を正しく入力してください。"); return s.slice(0, 5); };
  const title = text("title", 200); if (!title) throw new Error("作品・公演名を入力してください。");
  if (typeof r.kind !== "string" || !Object.hasOwn(PLAN_KINDS, r.kind)) throw new Error("予定の種類を選んでください。");
  if (typeof r.status !== "string" || !Object.hasOwn(PLAN_STATUSES, r.status)) throw new Error("状態を選んでください。");
  const url = text("url", 2000); if (url) { try { if (!["https:", "http:"].includes(new URL(url).protocol)) throw new Error(); } catch { throw new Error("リンクはhttpまたはhttpsのURLにしてください。"); } }
  const plan: PlanInput = { title, kind: r.kind as PlanKind, status: r.status as PlanStatus,
    date: date("date", true)!, time: time("time"), end_date: date("end_date"), end_time: time("end_time"),
    venue: text("venue", 500), memo: text("memo", 5000), url,
    work_id: r.work_id == null || r.work_id === "" ? null : Number(r.work_id),
    deadline_date: date("deadline_date"), deadline_time: time("deadline_time"), result_date: date("result_date"), result_time: time("result_time"),
    source_uid: text("source_uid", 500) || null };
  if (plan.work_id !== null && (!Number.isSafeInteger(plan.work_id) || plan.work_id <= 0)) throw new Error("作品の選択を確認してください。");
  if (plan.end_date && plan.end_date < plan.date) throw new Error("終了日は開始日以降にしてください。");
  if (plan.end_time && !plan.time) throw new Error("終了時刻を指定する場合は開始時刻も入力してください。");
  if (plan.end_time && (plan.end_date || plan.date) === plan.date && plan.time! >= plan.end_time) throw new Error("終了時刻は開始時刻より後にしてください。");
  if ((!plan.deadline_date && plan.deadline_time) || (!plan.result_date && plan.result_time)) throw new Error("締め切り・発表の時刻には日付も必要です。");
  if (plan.kind === "deadline" || plan.kind === "result") { plan.deadline_date = null; plan.deadline_time = null; plan.result_date = null; plan.result_time = null; }
  return plan;
}
export function agendaEntries(plans: PersonalPlan[], today: string, past = false): AgendaEntry[] {
  return plans.flatMap((plan): AgendaEntry[] => {
    if (!past && ["cancelled", "not_selected", "done"].includes(plan.status)) return [];
    const items: AgendaEntry[] = [{ id: plan.id, plan, kind: plan.kind, date: plan.date, time: plan.time, milestone: false }];
    if (plan.deadline_date) items.push({ id: `${plan.id}:deadline`, plan, kind: "deadline", date: plan.deadline_date, time: plan.deadline_time, milestone: true });
    if (plan.result_date) items.push({ id: `${plan.id}:result`, plan, kind: "result", date: plan.result_date, time: plan.result_time, milestone: true });
    return items.filter(x => past ? x.date < today || ["cancelled", "not_selected", "done"].includes(plan.status) : x.date >= today);
  }).sort((a, b) => { const order = `${a.date} ${a.time || "99:99"}`.localeCompare(`${b.date} ${b.time || "99:99"}`); return (past ? -order : order) || a.id.localeCompare(b.id); });
}
export function planDateLabel(date: string): string {
  return new Intl.DateTimeFormat("ja-JP", { month: "long", day: "numeric", weekday: "short", timeZone: "Asia/Tokyo" }).format(new Date(`${date}T12:00:00+09:00`));
}
function addDay(date: string): string { return new Date(Date.parse(`${date}T00:00:00Z`) + 86400000).toISOString().slice(0, 10); }
export function calendarDates(entry: AgendaEntry): string {
  const start = entry.date.replaceAll("-", "");
  const endDate = !entry.milestone && entry.plan.end_date || entry.date;
  if (!entry.time) return `${start}/${addDay(endDate).replaceAll("-", "")}`;
  const endTime = !entry.milestone && entry.plan.end_time;
  const end = endTime ? `${endDate.replaceAll("-", "")}T${endTime.replace(":", "")}00` : `${start}T${entry.time.replace(":", "")}00`;
  return `${start}T${entry.time.replace(":", "")}00/${end}`;
}
export function googleCalendarUrl(entry: AgendaEntry): string {
  const q = new URLSearchParams({ action: "TEMPLATE", text: `${entry.milestone ? `【${PLAN_KINDS[entry.kind]}】` : ""}${entry.plan.title}`, dates: calendarDates(entry), ctz: "Asia/Tokyo", details: [entry.plan.memo, entry.plan.url].filter(Boolean).join("\n"), location: entry.plan.venue });
  return `https://calendar.google.com/calendar/render?${q}`;
}
export function planIcs(entries: AgendaEntry[]): string {
  const esc = (s: string) => s.replace(/\\/g, "\\\\").replace(/\r?\n/g, "\\n").replace(/,/g, "\\,").replace(/;/g, "\\;");
  const lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//THEATRE NOTES//Personal Plans//JA", "CALSCALE:GREGORIAN"];
  for (const e of entries) {
    const [start, end] = calendarDates(e).split("/");
    lines.push("BEGIN:VEVENT", `UID:${e.id}@theatre-notes`, `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d+Z$/, "Z")}`,
      `DTSTART${e.time ? ";TZID=Asia/Tokyo" : ";VALUE=DATE"}:${start}`, ...(!e.time || (!e.milestone && e.plan.end_time) ? [`DTEND${e.time ? ";TZID=Asia/Tokyo" : ";VALUE=DATE"}:${end}`] : []),
      `SUMMARY:${esc(`${e.milestone ? `【${PLAN_KINDS[e.kind]}】` : ""}${e.plan.title}`)}`, `LOCATION:${esc(e.plan.venue)}`, `DESCRIPTION:${esc([e.plan.memo, e.plan.url].filter(Boolean).join("\n"))}`, "END:VEVENT");
  }
  lines.push("END:VCALENDAR");
  // RFC5545: UTF-8で75オクテットを超える行を折り返す。
  return lines.map(line => { let out = "", bytes = 0; for (const ch of line) { const size = new TextEncoder().encode(ch).length; if (bytes + size > 75) { out += "\r\n "; bytes = 1; } out += ch; bytes += size; } return out; }).join("\r\n") + "\r\n";
}

export function inferPlanKind(title: string): { kind: PlanKind; suggested: boolean } {
  if (/当落|抽選結果|結果発表/.test(title)) return { kind: "result", suggested: true };
  if (/締め切り|締切|申込期限|申し込み期限/.test(title)) return { kind: "deadline", suggested: true };
  if (/コンサート|concert|billboard|リサイタル|演奏会|ライブ|オーケストラ|交響楽|フィルハーモニー/i.test(title)) return { kind: "concert", suggested: true };
  return { kind: "theatre", suggested: /観劇|劇団四季|ミュージカル|舞台|四季劇場|ノートルダム|ウィキッド|ライオンキング|アナと雪|アラジン|キャッツ|オペラ座|バック・トゥ・ザ/.test(title) };
}
