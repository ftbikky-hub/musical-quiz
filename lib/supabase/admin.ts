import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
// 注意：ここでは NEXT_PUBLIC_ が付いていないサービスロールキーを使います
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.warn(
    "SUPABASE_SERVICE_ROLE_KEY が設定されていないため、Adminクライアントは初期化されません。"
  );
}

// サーバー側でのみ使用する、RLSをバイパスできる強力なクライアント。
// 環境変数が未設定の間は null にしておく（空文字でcreateClientを呼ぶと、
// ビルド時にモジュール読み込みでエラーになりデプロイ自体が失敗するため）。
// 呼び出し側は使う前に必ず null チェックすること。
export const supabaseAdmin: SupabaseClient | null =
  supabaseUrl && supabaseServiceRoleKey
    ? createClient(supabaseUrl, supabaseServiceRoleKey, {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      })
    : null;
