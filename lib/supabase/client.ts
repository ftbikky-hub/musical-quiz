import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  // ビルド時に気づけるよう、早めに分かりやすいエラーを出す。
  throw new Error(
    "NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY が設定されていません。.env.local を確認してください。"
  );
}

// ブラウザ用の単一クライアント。読み取り専用の公開データしか扱わないため、
// シンプルに supabase-js を直接使う（@supabase/ssr のセッション管理は今回は不要）。
export const supabase = createClient(supabaseUrl, supabaseAnonKey);
