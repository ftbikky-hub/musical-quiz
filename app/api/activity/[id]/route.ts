import { normalizeActivity } from "@/lib/activity";
import { isMemberId } from "@/lib/member-names";
import { activityStore, activityError, ACTIVITY_COLUMNS } from "@/lib/activity-store";
import { checkPlanOrigin, PlanStoreError, planErrorResponse } from "@/lib/personal-plan-store";
export const dynamic = "force-dynamic";
type Context = { params: Promise<{ id: string }> };
async function recordId(context: Context) { const { id } = await context.params; if (!isMemberId(id)) throw new PlanStoreError("記録が見つかりません。", 404); return id; }
export async function GET(_request: Request, context: Context) {
  try {
    const { db, userId } = await activityStore(), id = await recordId(context);
    const { data, error } = await db.from("activity_records").select(ACTIVITY_COLUMNS).eq("id", id).eq("user_id", userId).maybeSingle();
    activityError(error); if (!data) throw new PlanStoreError("記録が見つかりません。", 404);
    return Response.json(data, { headers: { "Cache-Control": "private, no-store" } });
  } catch (e) { return planErrorResponse(e); }
}
export async function PATCH(request: Request, context: Context) {
  try {
    checkPlanOrigin(request); const { db, userId } = await activityStore(), id = await recordId(context);
    let fields;
    try { const text = await request.text(); if (text.length > 16000) throw new Error("入力が長すぎます。"); fields = normalizeActivity(JSON.parse(text), new Date()); }
    catch (e) { throw new PlanStoreError(e instanceof Error ? e.message : "記録を確認してください。", 400); }
    const { data, error } = await db.from("activity_records").update({ ...fields, updated_at: new Date().toISOString() }).eq("id", id).eq("user_id", userId).select("id").maybeSingle();
    activityError(error); if (!data) throw new PlanStoreError("記録が見つかりません。", 404);
    return Response.json({ id: data.id });
  } catch (e) { return planErrorResponse(e); }
}
export async function DELETE(request: Request, context: Context) {
  try {
    checkPlanOrigin(request); const { db, userId } = await activityStore(), id = await recordId(context);
    const { data, error } = await db.from("activity_records").delete().eq("id", id).eq("user_id", userId).select("id").maybeSingle();
    activityError(error); if (!data) throw new PlanStoreError("記録が見つかりません。", 404);
    return Response.json({ deleted: true });
  } catch (e) { return planErrorResponse(e); }
}
