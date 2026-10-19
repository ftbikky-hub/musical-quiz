import { cookies } from "next/headers";
import { PageHeading } from "@/components/theatre/PageHeading";
import { MemberPicker } from "@/components/account/MemberPicker";
import { listJournalMembers, type JournalMember } from "@/lib/journal-members";
import { JOURNAL_MEMBER_COOKIE, journalRedirectTarget } from "@/lib/member-names";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ redirectTo?: string }> }) {
  const redirectTo = journalRedirectTarget((await searchParams).redirectTo);
  let members: JournalMember[] = [];
  let loadError = false;
  try { members = await listJournalMembers(); } catch { loadError = true; }
  const id = (await cookies()).get(JOURNAL_MEMBER_COOKIE)?.value;
  const currentId = members.find((member) => member.id === id)?.id;
  return (
    <div className="max-w-lg mx-auto p-4 sm:p-6 mt-4 space-y-6">
      <PageHeading section="account" title="あなたのお名前で、どうぞ。">
        登録済みの名前を選んで、舞台の記憶がつづく書斎へ。パスワードは必要ありません。
      </PageHeading>
      <MemberPicker members={members} currentId={currentId} redirectTo={redirectTo} loadError={loadError} />
    </div>
  );
}
