import Link from "next/link";
import { requireJournalMember } from "@/lib/journal-members";
import { PageHeading } from "@/components/theatre/PageHeading";
import { ActivityMap } from "@/components/activity/ActivityMap";
import styles from "@/components/plans/plans.module.css";
export const dynamic = "force-dynamic";
export default async function ActivityMapPage() {
  const member = await requireJournalMember("/activity/map");
  return <div className={styles.page}><PageHeading section="activity" title="好きが積もる、日本の旅。" actions={<Link href="/login?redirectTo=/activity/map">{member.display_name}さんの記録 · 名前を切り替える ↗</Link>}>一度の出会いが、一段の思い出に。何度も通った場所も、遠征した街も、あなただけの地図に。</PageHeading><ActivityMap key={member.id}/></div>;
}
