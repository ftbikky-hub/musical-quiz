import { normalizeActivity } from "@/lib/activity";
import { japanDate } from "@/lib/plans";
import { isMemberId } from "@/lib/member-names";
import { activityStore, activityError, ACTIVITY_COLUMNS } from "@/lib/activity-store";
import { checkPlanOrigin, PlanStoreError, planErrorResponse } from "@/lib/personal-plan-store";
export const dynamic = "force-dynamic";
const headers = { "Cache-Control": "private, no-store" };
export async function GET() {
  try {
    const { db, userId } = await activityStore(); const records = [];
    for (let offset = 0; ; offset += 1000) {
      const { data, error } = await db.from("activity_records").select(ACTIVITY_COLUMNS).eq("user_id", userId).order("date", { ascending: false }).order("time", { ascending: false, nullsFirst: false }).order("id").range(offset, offset + 999);
      activityError(error); records.push(...(data || [])); if ((data || []).length < 1000) break;
    }
    return Response.json(records, { headers });
  } catch (e) { return planErrorResponse(e); }
}
export async function POST(request: Request) {
  try {
    checkPlanOrigin(request); const { db, userId } = await activityStore();
    let fields, sourceId: string | null = null;
    try {
      const text = await request.text(); if (text.length > 16000) throw new Error("入力が長すぎます。");
      const body = JSON.parse(text); fields = normalizeActivity(body, new Date());
      if (body.source_plan_id != null) { if (typeof body.source_plan_id !== "string" || !isMemberId(body.source_plan_id)) throw new Error("元の予定を確認してください。"); sourceId = body.source_plan_id; }
    } catch (e) { throw new PlanStoreError(e instanceof Error ? e.message : "記録を確認してください。", 400); }
    if (sourceId) {
      const { data, error } = await db.from("personal_plans").select("id,date,kind,status").eq("id", sourceId).eq("user_id", userId).maybeSingle();
      if (error) throw new PlanStoreError("元の予定を確認できませんでした。", 503);
      if (!data || !["theatre", "concert"].includes(data.kind) || ["cancelled", "not_selected"].includes(data.status) || data.date > japanDate(new Date())) throw new PlanStoreError("記録に残せる予定が見つかりません。", 404);
    }
    const { data, error } = await db.from("activity_records").insert({ ...fields, user_id: userId, source_plan_id: sourceId }).select("id").single();
    activityError(error); return Response.json({ id: data!.id }, { status: 201, headers });
  } catch (e) { return planErrorResponse(e); }
}
