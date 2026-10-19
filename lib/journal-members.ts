import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { JOURNAL_MEMBER_COOKIE, isMemberId, journalRedirectTarget } from "./member-names";
import type { Profile } from "@/lib/supabase/types";

export type JournalMember = Profile;

/** 氏名選択用の一覧。認証トークン・メール・パスワードは返さない。 */
export async function listJournalMembers(): Promise<JournalMember[]> {
  const client = supabaseAdmin ?? supabase;
  const members: JournalMember[] = [];
  for (let offset = 0; ; offset += 1000) {
    const { data, error } = await client.from("profiles")
      .select("id, display_name, avatar_url").order("id").range(offset, offset + 999);
    if (error) throw error;
    const rows = (data ?? []) as JournalMember[];
    members.push(...rows.filter((row) => row.display_name?.trim()));
    if (rows.length < 1000) break;
  }
  return members.sort((a, b) => a.display_name.localeCompare(b.display_name, "ja"));
}

export async function findJournalMember(id: string): Promise<JournalMember | null> {
  if (!isMemberId(id)) return null;
  const client = supabaseAdmin ?? supabase;
  const { data, error } = await client.from("profiles")
    .select("id, display_name, avatar_url").eq("id", id).maybeSingle();
  if (error) throw error;
  return data?.display_name?.trim() ? data as JournalMember : null;
}

/** 本人認証ではなく、個人・知人用の「現在選んでいる名前」。 */
export async function getCurrentJournalMember(): Promise<JournalMember | null> {
  const id = (await cookies()).get(JOURNAL_MEMBER_COOKIE)?.value;
  return id ? findJournalMember(id) : null;
}

export async function requireJournalMember(redirectTo = "/theater-log"): Promise<JournalMember> {
  const member = await getCurrentJournalMember();
  if (!member) redirect(`/login?redirectTo=${encodeURIComponent(journalRedirectTarget(redirectTo))}`);
  return member;
}

export async function selectJournalMember(id: string) {
  if (!isMemberId(id)) throw new Error("登録済みのお名前を選んでください");
  (await cookies()).set(JOURNAL_MEMBER_COOKIE, id, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 180,
  });
}

export async function clearJournalMember() {
  (await cookies()).delete(JOURNAL_MEMBER_COOKIE);
}
