import ICAL from "ical.js";
import { normalizePlan, japanDate, type PlanInput, type PlanKind } from "./plans";

export interface CalendarCandidate { key: string; plan: PlanInput; suggested: boolean }
export interface CalendarImport { candidates: CalendarCandidate[]; skipped: number; recurring: number }
export function inferPlanKind(title: string): { kind: PlanKind; suggested: boolean } {
  if (/当落|抽選結果|結果発表/.test(title)) return { kind: "result", suggested: true };
  if (/締め切り|締切|申込期限|申し込み期限/.test(title)) return { kind: "deadline", suggested: true };
  if (/コンサート|concert|billboard|リサイタル|演奏会|ライブ|オーケストラ|交響楽|フィルハーモニー/i.test(title)) return { kind: "concert", suggested: true };
  return { kind: "theatre", suggested: /観劇|劇団四季|ミュージカル|舞台|四季劇場|ノートルダム|ウィキッド|ライオンキング|アナと雪|アラジン|キャッツ|オペラ座|バック・トゥ・ザ/.test(title) };
}
export function parsePlanCalendar(text: string): CalendarImport {
  if (new TextEncoder().encode(text).length > 2_000_000) throw new Error("2MB以下の.icsファイルを選んでください。");
  ICAL.TimezoneService.reset();
  try {
    const calendar = new ICAL.Component(ICAL.parse(text));
    if (calendar.name !== "vcalendar") throw new Error("カレンダーファイルを確認してください。");
    const events = calendar.getAllSubcomponents("vevent");
    if (events.length > 2000) throw new Error("予定が2,000件を超えています。観劇用のカレンダーを書き出してください。");
    for (const zone of calendar.getAllSubcomponents("vtimezone")) ICAL.TimezoneService.register(zone);
    const calendarZone = String(calendar.getFirstPropertyValue("x-wr-timezone") || "Asia/Tokyo");
    const result: CalendarImport = { candidates: [], skipped: 0, recurring: 0 }, seen = new Set<string>();
    for (const component of events) {
      try {
        const event = new ICAL.Event(component);
        if (event.isRecurring() || event.isRecurrenceException()) { result.recurring++; continue; }
        if (String(component.getFirstPropertyValue("status")).toUpperCase() === "CANCELLED") { result.skipped++; continue; }
        const uid = String(event.uid || ""), title = String(event.summary || "");
        if (!uid || !title || seen.has(uid)) { result.skipped++; continue; }
        function convert(name: string) {
          const property = component.getFirstProperty(name);
          if (!property) return null;
          const value = property.getFirstValue() as ICAL.Time;
          if (!value || typeof value.toJSDate !== "function") throw new Error("日時未確認");
          if (value.isDate) return { date: value.toString(), time: null };
          const tzid = String(property.getParameter("tzid") || (value.zone.tzid === "UTC" ? "UTC" : calendarZone));
          if (tzid === "Asia/Tokyo" || tzid === "Japan") return { date: value.toString().slice(0, 10), time: value.toString().slice(11, 16) };
          if (tzid !== "UTC" && !ICAL.TimezoneService.has(tzid)) throw new Error("タイムゾーン未確認");
          const instant = value.toJSDate();
          const time = new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Tokyo", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(instant);
          return { date: japanDate(instant), time };
        }
        const start = convert("dtstart"); if (!start) throw new Error("開始日時なし");
        let end = convert("dtend");
        if (end && !start.time) {
          // iCalendarの終日はDTENDが翌日。保存値は最終日（inclusive）へ戻す。
          end = { date: new Date(Date.parse(`${end.date}T00:00:00Z`) - 86400000).toISOString().slice(0, 10), time: null };
        }
        if (end && start.time && end.date === start.date && end.time === start.time) end = null;
        const guess = inferPlanKind(`${title} ${event.location || ""}`);
        const url = String(component.getFirstPropertyValue("url") || "");
        const plan = normalizePlan({ title, kind: guess.kind, status: "planned", date: start.date, time: start.time,
          end_date: end?.date || null, end_time: end?.time || null, venue: event.location || "", memo: event.description || "",
          url: /^https?:\/\//i.test(url) ? url : "", source_uid: `ical:${uid}` });
        result.candidates.push({ key: uid, plan, suggested: guess.suggested }); seen.add(uid);
      } catch { result.skipped++; }
    }
    return result;
  } finally { ICAL.TimezoneService.reset(); }
}
