import Link from "next/link";
import { requireJournalMember } from "@/lib/journal-members";
import { PageHeading } from "@/components/theatre/PageHeading";
import { PlansDashboard } from "@/components/plans/PlansDashboard";
import { japanDate } from "@/lib/plans";
import styles from "@/components/plans/plans.module.css";
export const dynamic = "force-dynamic";
export default async function PlansPage() {
  const member = await requireJournalMember("/plans");
  return <div className={styles.page}><PageHeading section="plans" title="楽しみが、待っている。" actions={<Link href="/login?redirectTo=/plans">{member.display_name}さんの予定 · 名前を切り替える ↗</Link>}>次の舞台も、心待ちにしているコンサートも。申し込みから当落まで、あなたのこれからをひとつの手帳に。</PageHeading><PlansDashboard key={member.id} today={japanDate(new Date())}/></div>;
}
