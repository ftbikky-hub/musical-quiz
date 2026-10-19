import { supabase } from "./client";

/**
 * サーバーの公開データ読み取り用クライアント。
 * 名前の選択は journal-members.ts で管理し、旧Auth Cookieのトークンは使用しない。
 * 既存の読み取り処理との互換性のためasyncのインターフェースを維持する。
 */
export async function createClient() {
  return supabase;
}
