import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

/**
 * Server Component / Server Action / Route Handler から使う、
 * Cookieでセッションを保持するSupabaseクライアント。
 * Server Component内ではCookieの書き換えができないため、setAllは失敗を握りつぶす
 * (トークンの更新自体はmiddlewareが担う)。
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        } catch {
          // Server Componentからの呼び出しでは無視してよい
        }
      },
    },
  });
}
