import { activityStore, activityError } from "@/lib/activity-store";
import { normalizePlace } from "@/lib/activity-map";
import { checkPlanOrigin, PlanStoreError, planErrorResponse } from "@/lib/personal-plan-store";
export const dynamic = "force-dynamic";
export async function GET() {
  try {
    const { db, userId } = await activityStore();
    const rows = [];
    for (let offset = 0; ; offset += 1000) {
      const { data, error } = await db.from("activity_places").select("venue_key,latitude,longitude").eq("user_id", userId).order("venue_key").range(offset, offset + 999);
      activityError(error); rows.push(...(data || [])); if ((data || []).length < 1000) break;
    }
    return Response.json(rows, { headers: { "Cache-Control": "private, no-store" } });
  } catch (e) { return planErrorResponse(e); }
}
export async function POST(request: Request) {
  try {
    checkPlanOrigin(request); const { db, userId } = await activityStore();
    let value;
    try { const text = await request.text(); if (text.length > 4000) throw new Error("入力が長すぎます。"); value = normalizePlace(JSON.parse(text)); }
    catch (e) { throw new PlanStoreError(e instanceof Error ? e.message : "位置を確認してください。", 400); }
    const { venue, city, ...place } = value;
    // Require a matching owned record; the client cannot assign another owner's venue.
    const { data: owned, error: readError } = await db.from("activity_records").select("id").eq("user_id", userId).eq("venue", venue).eq("city", city).limit(1);
    activityError(readError); if (!owned?.length) throw new PlanStoreError("会場の記録が見つかりません。", 404);
    const { error } = await db.from("activity_places").upsert({ ...place, user_id: userId, updated_at: new Date().toISOString() }, { onConflict: "user_id,venue_key" });
    activityError(error);
    return Response.json(place, { headers: { "Cache-Control": "private, no-store" } });
  } catch (e) { return planErrorResponse(e); }
}
export async function DELETE(request: Request) {
  try {
    checkPlanOrigin(request); const { db, userId } = await activityStore();
    let value;
    try { const text = await request.text(); if (text.length > 4000) throw new Error("入力が長すぎます。"); value = normalizePlace(JSON.parse(text)); }
    catch { throw new PlanStoreError("会場の位置を確認してください。", 400); }
    const { error } = await db.from("activity_places").delete().eq("user_id", userId).eq("venue_key", value.venue_key);
    activityError(error); return Response.json({ deleted: true }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (e) { return planErrorResponse(e); }
}
