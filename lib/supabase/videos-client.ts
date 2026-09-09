import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_VIDEOS_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_VIDEOS_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "NEXT_PUBLIC_VIDEOS_SUPABASE_URL / NEXT_PUBLIC_VIDEOS_SUPABASE_ANON_KEY が設定されていません。.env.local を確認してください。"
  );
}

// 動画機能専用のSupabaseプロジェクト(personal-videos)に接続する、読み取り専用クライアント。
// 既存の lib/supabase/client.ts (ミュージカルクイズ用DB)とは別プロジェクトなので名前を分けています。
export const videosSupabase = createClient(supabaseUrl, supabaseAnonKey);
