import { normalizePlan } from "@/lib/plans";
import { planStore, listPersonalPlans, planDbError, planErrorResponse, PlanStoreError, checkPlanOrigin } from "@/lib/personal-plan-store";

export const dynamic = "force-dynamic";
export async function GET() {
  try { return Response.json(await listPersonalPlans(), { headers: { "Cache-Control": "private, no-store" } }); }
  catch (error) { return planErrorResponse(error); }
}
export async function POST(request: Request) {
  try {
    checkPlanOrigin(request);
    const { db, userId } = await planStore();
    const body = await request.text();
    if (body.length > 1_000_000) throw new PlanStoreError("一度に取り込む予定が多すぎます。", 413);
    let value: unknown;
    try { value = JSON.parse(body); } catch { throw new PlanStoreError("予定の内容を確認してください。", 400); }
    const items = Array.isArray(value) ? value : [value];
    if (items.length < 1 || items.length > 100) throw new PlanStoreError("一度に保存できる予定は1〜100件です。", 400);
    let plans;
    try { plans = items.map(normalizePlan); } catch (e) { throw new PlanStoreError(e instanceof Error ? e.message : "予定を確認してください。", 400); }
    // 取り込み済みUIDは上書きせずスキップ。編集した内容を再インポートで消さない。
    const { data, error } = await db.from("personal_plans").upsert(plans.map(p => ({ ...p, user_id: userId })), { onConflict: "user_id,source_uid", ignoreDuplicates: true }).select("id");
    planDbError(error);
    return Response.json({ count: data?.length || 0, skipped: plans.length - (data?.length || 0) }, { status: 201, headers: { "Cache-Control": "private, no-store" } });
  } catch (error) { return planErrorResponse(error); }
}
