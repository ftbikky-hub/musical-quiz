import { normalizePlan } from "@/lib/plans";
import { planStore, planDbError, planErrorResponse, PlanStoreError, checkPlanOrigin, PLAN_COLUMNS } from "@/lib/personal-plan-store";
import { isMemberId } from "@/lib/member-names";

type Context = { params: Promise<{ id: string }> };
export const dynamic = "force-dynamic";
async function planId(context: Context) { const { id } = await context.params; if (!isMemberId(id)) throw new PlanStoreError("予定が見つかりません。", 404); return id; }
export async function GET(_request: Request, context: Context) {
  try {
    const { db, userId } = await planStore(), id = await planId(context);
    const { data, error } = await db.from("personal_plans").select(PLAN_COLUMNS).eq("id", id).eq("user_id", userId).maybeSingle();
    planDbError(error); if (!data) throw new PlanStoreError("予定が見つかりません。", 404);
    return Response.json(data, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) { return planErrorResponse(error); }
}
export async function PATCH(request: Request, context: Context) {
  try {
    checkPlanOrigin(request);
    const { db, userId } = await planStore(), id = await planId(context);
    const body = await request.text(); if (body.length > 20000) throw new PlanStoreError("入力が長すぎます。", 413);
    let plan;
    try { plan = normalizePlan(JSON.parse(body)); } catch (e) { throw new PlanStoreError(e instanceof Error ? e.message : "予定を確認してください。", 400); }
    // source_uidは作成時だけ設定可能。取り込み済み予定の重複判定キーを保持。
    const { source_uid: _source, ...fields } = plan;
    void _source;
    const { data, error } = await db.from("personal_plans").update({ ...fields, updated_at: new Date().toISOString() }).eq("id", id).eq("user_id", userId).select("id").maybeSingle();
    planDbError(error); if (!data) throw new PlanStoreError("予定が見つかりません。", 404);
    return Response.json({ id: data.id });
  } catch (error) { return planErrorResponse(error); }
}
export async function DELETE(request: Request, context: Context) {
  try {
    checkPlanOrigin(request);
    const { db, userId } = await planStore(), id = await planId(context);
    const { data, error } = await db.from("personal_plans").delete().eq("id", id).eq("user_id", userId).select("id").maybeSingle();
    planDbError(error); if (!data) throw new PlanStoreError("予定が見つかりません。", 404);
    return Response.json({ deleted: true });
  } catch (error) { return planErrorResponse(error); }
}
