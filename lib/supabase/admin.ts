import { createClient } from "@supabase/supabase-js";
import { Database } from "./types"; // 既存の型定義を流用（存在すれば）

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
// 注意：ここでは NEXT_PUBLIC_ が付いていないサービスロールキーを使います
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.warn(
    "SUPABASE_SERVICE_ROLE_KEY が設定されていないため、Adminクライアントは初期化されません。"
  );
}

// サーバー側でのみ使用する、RLSをバイパスできる強力なクライアント
export const supabaseAdmin = createClient<Database>(
  supabaseUrl || "",
  supabaseServiceRoleKey || "",
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);
