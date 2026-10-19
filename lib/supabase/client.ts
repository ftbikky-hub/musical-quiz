import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  // ビルド時に気づけるよう、早めに分かりやすいエラーを出す。
  throw new Error(
    "NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY が設定されていません。.env.local を確認してください。"
  );
}

// ブラウザ・サーバーの公開データ用クライアント。
// 観劇記録の名前選択は journal-members.ts のCookieで扱う。
export const supabase = createClient(supabaseUrl, supabaseAnonKey);
