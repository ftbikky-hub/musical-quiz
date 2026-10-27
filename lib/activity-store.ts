import { supabaseAdmin } from "@/lib/supabase/admin";
import { getCurrentJournalMember } from "@/lib/journal-members";
import { PlanStoreError } from "./personal-plan-store";
export const ACTIVITY_COLUMNS = "id,kind,date,time,title,venue,city,memo,source_plan_id,created_at,updated_at";
export async function activityStore() {
  const member = await getCurrentJournalMember();
  if (!member) throw new PlanStoreError("ログインしてからご利用ください。", 401);
  if (!supabaseAdmin) throw new PlanStoreError("行動記録の保存設定が完了していません。", 503);
  return { db: supabaseAdmin, userId: member.id };
}
export function activityError(error: { code?: string } | null) {
  if (!error) return;
  if (error.code === "23505") throw new PlanStoreError("この予定はすでに行動記録に残しています。", 409);
  throw new PlanStoreError("行動記録を保存・取得できませんでした。もう一度お試しください。", 503);
}
