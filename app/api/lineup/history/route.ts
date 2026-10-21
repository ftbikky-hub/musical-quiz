import { createClient } from "@/lib/supabase/server";
import { lineupCurrentMonth } from "@/lib/lineup";
import { archiveLineupSnapshot, type ArchiveLineupRow } from "@/lib/lineup-history";

export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  const value = new URL(request.url).searchParams.get("year");
  const currentYear = Number(lineupCurrentMonth(new Date()).slice(0, 4));
  if (value !== null && (!/^\d{4}$/.test(value) || Number(value) < 1953 || Number(value) > currentYear)) {
    return Response.json({ error: "年の指定が不正です。" }, { status: 400 });
  }
  const db = await createClient();
  try {
    if (value === null) {
      const [first, last] = await Promise.all([
        db.from("archive_runs").select("year").order("year").limit(1),
        db.from("archive_runs").select("year").order("year", { ascending: false }).limit(1),
      ]);
      if (first.error || last.error) throw new Error("archive read failed");
      return Response.json({ firstYear: first.data?.[0]?.year ?? null, lastYear: last.data?.[0]?.year ?? null });
    }
    const year = Number(value), rows: ArchiveLineupRow[] = [];
    // PostgRESTの返却件数上限で、その年の記録が途中で欠けないようページング。
    for (let offset = 0; ; offset += 1000) {
      const { data, error } = await db.from("archive_runs")
        .select("perf_key,year,work_id,work,theater,run_name,start_date,end_date,schedule_text,notes,archive_works(name),archive_venues(name,venue_type)")
        .eq("year", year).order("perf_key").range(offset, offset + 999);
      if (error) throw new Error("archive read failed");
      rows.push(...(data as unknown as ArchiveLineupRow[]));
      if (data.length < 1000) break;
    }
    return Response.json(archiveLineupSnapshot(year, rows));
  } catch {
    return Response.json({ error: "公演の歴史を読み込めませんでした。時間をおいて、もう一度お試しください。" }, { status: 503 });
  }
}
