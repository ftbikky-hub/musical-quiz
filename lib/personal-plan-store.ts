import { supabaseAdmin } from "@/lib/supabase/admin";
import { getCurrentJournalMember } from "@/lib/journal-members";
import type { PersonalPlan } from "./plans";

export const PLAN_COLUMNS = "id,title,kind,status,date,time,end_date,end_time,venue,memo,url,work_id,deadline_date,deadline_time,result_date,result_time,source_uid,created_at,updated_at";
export class PlanStoreError extends Error { constructor(message: string, public status: number) { super(message); } }
export async function planStore() {
  const member = await getCurrentJournalMember();
  if (!member) throw new PlanStoreError("ログインしてからご利用ください。", 401);
  if (!supabaseAdmin) throw new PlanStoreError("予定の保存設定がまだ完了していません。", 503);
  return { db: supabaseAdmin, userId: member.id };
}
export function planDbError(error: { code?: string } | null) {
  if (!error) return;
  if (["42P01", "PGRST205"].includes(error.code || "")) throw new PlanStoreError("予定の保存用テーブルが未作成です。初回設定用SQLを実行してください。", 503);
  if (error.code === "23505") throw new PlanStoreError("このカレンダーの予定は取り込み済みです。", 409);
  throw new PlanStoreError("予定を保存・取得できませんでした。時間をおいてお試しください。", 503);
}
export function planErrorResponse(error: unknown) {
  if (error instanceof PlanStoreError) return Response.json({ error: error.message }, { status: error.status, headers: { "Cache-Control": "private, no-store" } });
  return Response.json({ error: "処理できませんでした。もう一度お試しください。" }, { status: 500, headers: { "Cache-Control": "private, no-store" } });
}
export function checkPlanOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin || origin !== new URL(request.url).origin) throw new PlanStoreError("この画面からもう一度操作してください。", 403);
}
export async function listPersonalPlans(): Promise<PersonalPlan[]> {
  const { db, userId } = await planStore();
  const rows: PersonalPlan[] = [];
  for (let offset = 0; ; offset += 1000) {
    const { data, error } = await db.from("personal_plans").select(PLAN_COLUMNS).eq("user_id", userId).order("date").order("id").range(offset, offset + 999);
    planDbError(error);
    rows.push(...(data || []) as PersonalPlan[]);
    if ((data || []).length < 1000) break;
  }
  return rows;
}
