import { supabase } from "./client";
import type {
  Work,
  Theater,
  ScheduleWithRelations,
  TicketReleaseWithRelations,
} from "./types";

/**
 * 演目マスタを sort_order 順で取得。
 */
export async function fetchWorks(): Promise<Work[]> {
  const { data, error } = await supabase
    .from("shiki_works")
    .select("*")
    .order("sort_order", { ascending: true });

  if (error) throw error;
  return data ?? [];
}

/**
 * 劇場マスタを sort_order 順で取得。
 */
export async function fetchTheaters(): Promise<Theater[]> {
  const { data, error } = await supabase
    .from("shiki_theaters")
    .select("*")
    .order("sort_order", { ascending: true });

  if (error) throw error;
  return data ?? [];
}

/**
 * 公演スケジュールを、演目・劇場情報を join した状態で取得。
 * カードグリッド／タイムライン／マップの3ビューはすべてこの1本のデータを
 * 元に描画する（ビューごとに別クエリを持たない）。
 */
export async function fetchSchedules(): Promise<ScheduleWithRelations[]> {
  const { data, error } = await supabase
    .from("shiki_schedules")
    .select(
      `
      *,
      work:shiki_works(*),
      theater:shiki_theaters(*)
    `
    )
    .order("start_date", { ascending: true });

  if (error) throw error;
  // Supabase の型推論だとネストが unknown になりがちなので明示キャスト。
  return (data ?? []) as unknown as ScheduleWithRelations[];
}

/**
 * チケット発売予定を、関連スケジュール（演目・劇場込み）と一緒に取得。
 * 一般発売日が近い順に並べる（発売日未定のものは末尾）。
 */
export async function fetchTicketReleases(): Promise<
  TicketReleaseWithRelations[]
> {
  const { data, error } = await supabase
    .from("shiki_ticket_releases")
    .select(
      `
      *,
      schedule:shiki_schedules(
        *,
        work:shiki_works(*),
        theater:shiki_theaters(*)
      )
    `
    );

  if (error) throw error;
  const rows = (data ?? []) as unknown as TicketReleaseWithRelations[];

  return rows.sort((a, b) => {
    const aDate = a.general_date ?? a.presale_date;
    const bDate = b.general_date ?? b.presale_date;
    if (!aDate && !bDate) return 0;
    if (!aDate) return 1;
    if (!bDate) return -1;
    return aDate.localeCompare(bDate);
  });
}
