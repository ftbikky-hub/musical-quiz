import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_VIDEOS_SUPABASE_URL;
// NEXT_PUBLIC_ が付いていない、サーバー専用のサービスロールキー
const supabaseServiceRoleKey = process.env.VIDEOS_SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.warn(
    "VIDEOS_SUPABASE_SERVICE_ROLE_KEY が設定されていないため、動画機能のAdminクライアントは初期化されません。"
  );
}

// サーバー側でのみ使用する、RLSをバイパスできる強力なクライアント。
// 既存の lib/supabase/admin.ts (ミュージカルクイズ用DB)とは別プロジェクトなので名前を分けています。
export const videosSupabaseAdmin: SupabaseClient | null =
  supabaseUrl && supabaseServiceRoleKey
    ? createClient(supabaseUrl, supabaseServiceRoleKey, {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      })
    : null;
