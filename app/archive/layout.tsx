import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { logout } from "@/app/auth/actions";
import { TheatreShell } from "@/components/theatre/TheatreShell";

export const metadata: Metadata = { title: "公演アーカイブ | THEATRE NOTES" };

export default async function ArchiveLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const username = (user?.user_metadata?.username as string | undefined) ?? user?.email;
  return (
    <TheatreShell section="archive">
      <div className="max-w-5xl mx-auto p-4 sm:p-6 space-y-6 min-w-0 w-full">
        <div className="flex items-center justify-between flex-wrap gap-3 border-b border-gray-200 pb-4">
          <nav aria-label="アーカイブ内の移動" className="flex items-center flex-wrap gap-4 text-xs text-blue-600">
            <Link href="/archive" className="hover:underline">舞台の図書室</Link>
            <Link href="/archive/works" className="hover:underline">作品一覧</Link>
            <Link href="/archive/venues" className="hover:underline">会場一覧</Link>
          </nav>
          {username && <div className="flex items-center gap-3 flex-wrap">
            <span className="text-xs text-gray-500">{username}</span>
            <form action={logout}><button type="submit" className="text-xs text-gray-500 hover:underline">ログアウト</button></form>
          </div>}
        </div>
        {children}
      </div>
    </TheatreShell>
  );
}
