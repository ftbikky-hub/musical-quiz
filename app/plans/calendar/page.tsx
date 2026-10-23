import { requireJournalMember } from "@/lib/journal-members";
import { PageHeading } from "@/components/theatre/PageHeading";
import { CalendarSyncSetup } from "@/components/plans/CalendarSyncSetup";
import styles from "@/components/plans/plans.module.css";
export default async function CalendarSyncPage() {
  const member = await requireJournalMember("/plans/calendar");
  return <div className={styles.page}><PageHeading section="plans" title="楽しみを、自動で手帳に。">Googleカレンダーから、{member.display_name}さんの「私の予定」へ。15分ごとを目安に、追加や日程の変更を取り込みます。</PageHeading><CalendarSyncSetup key={member.id}/></div>;
}
