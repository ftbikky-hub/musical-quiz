import { createHash, randomBytes } from "node:crypto";
import { planStore, planErrorResponse, PlanStoreError, checkPlanOrigin, planDbError } from "@/lib/personal-plan-store";
import { calendarSyncConfig } from "@/lib/calendar-sync";
export const dynamic = "force-dynamic";
const columns = "calendar_id,mode,expires_at,revoked,last_synced_at,last_counts";
const headers = { "Cache-Control": "private, no-store" };
export async function GET() {
  try { const { db, userId } = await planStore(); const { data, error } = await db.from("personal_calendar_connections").select(columns).eq("user_id", userId).maybeSingle(); planDbError(error); return Response.json(data ? { ...data, expired: Date.parse(data.expires_at) <= Date.now() } : null, { headers }); }
  catch (error) { return planErrorResponse(error); }
}
export async function POST(request: Request) {
  try {
    checkPlanOrigin(request); const { db, userId } = await planStore();
    let config;
    try { const text = await request.text(); if (text.length > 2000) throw new Error("設定が長すぎます。"); config = calendarSyncConfig(JSON.parse(text)); }
    catch (e) { throw new PlanStoreError(e instanceof Error ? e.message : "設定を確認してください。", 400); }
    const token = randomBytes(32).toString("base64url"), tokenHash = createHash("sha256").update(token).digest("hex"), expiresAt = new Date(Date.now()+180*86400000).toISOString();
    const { error } = await db.from("personal_calendar_connections").upsert({ user_id: userId, token_hash: tokenHash, calendar_id: config.calendarId, mode: config.mode, expires_at: expiresAt, revoked: false, last_run_started_at: null, last_synced_at: null, last_counts: null, created_at: new Date().toISOString() }, { onConflict: "user_id" });
    planDbError(error); return Response.json({ token, expiresAt, ...config }, { headers });
  } catch (error) { return planErrorResponse(error); }
}
export async function DELETE(request: Request) {
  try { checkPlanOrigin(request); const { db, userId } = await planStore(); const { error } = await db.from("personal_calendar_connections").update({ revoked: true }).eq("user_id", userId); planDbError(error); return Response.json({ revoked: true }, { headers }); }
  catch (error) { return planErrorResponse(error); }
}
