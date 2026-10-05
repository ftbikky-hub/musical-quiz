import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { logout } from "@/app/auth/actions";

export default async function ArchiveLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const username = (user?.user_metadata?.username as string | undefined) ?? user?.email;

  return (
    <div className="max-w-5xl mx-auto p-4 sm:p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <Link href="/archive" className="text-lg font-bold text-gray-900 hover:underline">
          劇団四季 公演アーカイブ
        </Link>
        <div className="flex items-center gap-3">
          {username && (
            <>
              <span className="text-xs text-gray-500">{username} でログイン中</span>
              <form action={logout}>
                <button type="submit" className="text-sm text-gray-500 hover:underline">
                  ログアウト
                </button>
              </form>
            </>
          )}
          <Link href="/" className="text-sm text-blue-600 hover:underline">
            &larr; トップに戻る
          </Link>
        </div>
      </div>
      {children}
    </div>
  );
}
