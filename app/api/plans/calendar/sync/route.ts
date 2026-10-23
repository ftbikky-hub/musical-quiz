import { createHash } from "node:crypto";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { calendarSyncSnapshot } from "@/lib/calendar-sync";
export const dynamic = "force-dynamic";
export async function POST(request: Request) {
  const headers = { "Cache-Control": "private, no-store" };
  const token = request.headers.get("authorization")?.match(/^Bearer ([A-Za-z0-9_-]{43})$/)?.[1];
  if (!token) return Response.json({ error: "自動更新の接続コードを確認してください。" }, { status: 401, headers });
  if (!supabaseAdmin) return Response.json({ error: "同期先の準備ができていません。" }, { status: 503, headers });
  try {
    const hash = createHash("sha256").update(token).digest("hex");
    const { data, error } = await supabaseAdmin.from("personal_calendar_connections").select("calendar_id,mode,expires_at,revoked").eq("token_hash", hash).maybeSingle();
    if (error) throw new Error("database");
    if (!data || data.revoked || Date.parse(data.expires_at) <= Date.now()) return Response.json({ error: "接続が停止中、または期限切れです。" }, { status: 401, headers });
    const body = await request.text(); if (body.length > 1_000_000) return Response.json({ error: "同期する予定が多すぎます。" }, { status: 413, headers });
    let snapshot;
    try { snapshot = calendarSyncSnapshot(JSON.parse(body), { calendarId: data.calendar_id, mode: data.mode }, new Date()); }
    catch (e) { return Response.json({ error: e instanceof Error ? e.message : "同期データを確認してください。" }, { status: 400, headers }); }
    const result = await supabaseAdmin.rpc("sync_personal_calendar", { p_token_hash: hash, p_calendar_id: data.calendar_id, p_from: snapshot.from, p_through: snapshot.through, p_started_at: snapshot.startedAt, p_events: snapshot.events });
    if (result.error) {
      if (result.error.code === "28000") return Response.json({ error: "接続が停止中、または期限切れです。" }, { status: 401, headers });
      if (result.error.message?.includes("too_many_removed")) return Response.json({ error: "大量の予定が見つからなくなったため、反映を保留しました。カレンダーの設定を確認してください。" }, { status: 409, headers });
      throw new Error("sync failed");
    }
    return Response.json(result.data, { headers });
  } catch { return Response.json({ error: "同期できませんでした。次回の自動更新で再試行します。" }, { status: 503, headers }); }
}
