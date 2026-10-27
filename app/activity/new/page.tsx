import { requireJournalMember } from "@/lib/journal-members";
import { PageHeading } from "@/components/theatre/PageHeading";
import { ActivityForm } from "@/components/activity/ActivityForm";
import { isMemberId } from "@/lib/member-names";
import styles from "@/components/plans/plans.module.css";
export default async function NewActivityPage({ searchParams }: { searchParams: Promise<{ plan?: string }> }) {
  const { plan } = await searchParams; const source = plan && isMemberId(plan) ? plan : undefined;
  const member = await requireJournalMember(source ? `/activity/new?plan=${source}` : "/activity/new");
  return <div className={styles.page}><PageHeading section="activity" title="今日の一歩を、ひとつ。">キャストや感想は、あとからでも。まずは、いつ、どこへ行ったかを。</PageHeading><ActivityForm key={member.id} sourcePlanId={source}/></div>;
}
