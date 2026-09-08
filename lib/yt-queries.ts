import { supabase } from "./supabase/client";

// YouTube動画の型定義
export interface YtVideo {
  id: number;
  video_id: string;
  title: string;
  description: string | null;
  published_at: string;
  thumbnail_url: string | null;
  work_id: number | null;
  theater_id: string | null;
  yt_works: { name: string } | null;
  shiki_theaters: { name: string } | null;
  yt_video_performers: {
    yt_performers: { id: number; name: string } | null;
  }[];
}

// 役者マスタの型
export interface YtPerformer {
  id: number;
  name: string;
}

// 演目マスタの型
export interface YtWork {
  id: number;
  name: string;
}

// 劇場マスタの型
export interface ShikiTheater {
  id: string;
  name: string;
}

// 検索条件の型
export interface YtSearchParams {
  workId?: number;
  performerId?: number;
  theaterId?: string;
  searchQuery?: string;
}

/**
 * 検索条件に合致する動画一覧を取得する
 */
export async function fetchVideos(params: YtSearchParams): Promise<YtVideo[]> {
  let query = supabase
    .from("yt_videos")
    .select(`
      id,
      video_id,
      title,
      description,
      published_at,
      thumbnail_url,
      work_id,
      theater_id,
      yt_works ( name ),
      shiki_theaters ( name ),
      yt_video_performers (
        yt_performers ( id, name )
      )
    `)
    .order("published_at", { ascending: false });

  // 絞り込み条件
  if (params.workId) {
    query = query.eq("work_id", params.workId);
  }
  if (params.theaterId) {
    query = query.eq("theater_id", params.theaterId);
  }
  if (params.searchQuery) {
    query = query.ilike("title", `%${params.searchQuery}%`);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Error fetching videos:", error);
    return [];
  }

  // 役者で絞り込む場合（中間テーブルがあるためJavaScript側でフィルタリング）
  let filteredData = data as unknown as YtVideo[];
  if (params.performerId) {
    filteredData = filteredData.filter((video) =>
      video.yt_video_performers.some(
        (vp) => vp.yt_performers?.id === params.performerId
      )
    );
  }

  return filteredData;
}

/**
 * フィルター用のマスターデータを取得する
 */
export async function fetchFilterOptions() {
  const [worksRes, performersRes, theatersRes] = await Promise.all([
    supabase.from("yt_works").select("id, name").order("name"),
    supabase.from("yt_performers").select("id, name").order("name"),
    supabase.from("shiki_theaters").select("id, name").order("sort_order"),
  ]);

  return {
    works: (worksRes.data as YtWork[]) || [],
    performers: (performersRes.data as YtPerformer[]) || [],
    theaters: (theatersRes.data as ShikiTheater[]) || [],
  };
}

/**
 * 新しい役者をマスタに登録し、動画に手動で紐付ける
 */
export async function addPerformerToVideo(videoId: number, performerName: string) {
  // 1. 役者マスタに存在するか確認、なければ追加
  let performerId: number;
  const { data: existing } = await supabase
    .from("yt_performers")
    .select("id")
    .eq("name", performerName)
    .single();

  if (existing) {
    performerId = existing.id;
  } else {
    const { data: newPerformer, error: insertError } = await supabase
      .from("yt_performers")
      .insert({ name: performerName })
      .select("id")
      .single();

    if (insertError) throw insertError;
    performerId = newPerformer.id;
  }

  // 2. 動画と役者を紐付け (source='manual'として登録)
  const { error: linkError } = await supabase
    .from("yt_video_performers")
    .insert({
      video_id: videoId,
      performer_id: performerId,
      source: "manual",
    });

  // 一意制約違反（すでに紐付け済み）のエラーコードは '23505'
  if (linkError && linkError.code !== '23505') {
    throw linkError;
  }
}
