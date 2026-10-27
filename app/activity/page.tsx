import Link from "next/link";
import { requireJournalMember } from "@/lib/journal-members";
import { PageHeading } from "@/components/theatre/PageHeading";
import { ActivityJournal } from "@/components/activity/ActivityJournal";
import { japanDate } from "@/lib/plans";
import styles from "@/components/plans/plans.module.css";
export const dynamic = "force-dynamic";
export default async function ActivityPage() {
  const member = await requireJournalMember("/activity");
  return <div className={styles.page}><PageHeading section="activity" title="心が動いた、その場所へ。" actions={<Link href="/login?redirectTo=/activity">{member.display_name}さんの記録 · 名前を切り替える ↗</Link>}>映画、舞台、好きな人に会えた日。日時と会場を残すだけの、軽やかなお出かけ手帳。</PageHeading><ActivityJournal key={member.id} today={japanDate(new Date())}/></div>;
}
