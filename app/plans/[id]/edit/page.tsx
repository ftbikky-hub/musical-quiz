import { requireJournalMember } from "@/lib/journal-members";
import { PageHeading } from "@/components/theatre/PageHeading";
import { PlanForm } from "@/components/plans/PlanForm";
import { searchArchiveWorkNames } from "@/app/archive/queries";
import { isMemberId } from "@/lib/member-names";
import { notFound } from "next/navigation";
import styles from "@/components/plans/plans.module.css";
export default async function EditPlanPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params; if (!isMemberId(id)) notFound();
  await requireJournalMember(`/plans/${id}/edit`);
  let works: { id: number; name: string }[] = [];
  try { works = await searchArchiveWorkNames(""); } catch { /* 既存の予定の編集は継続する。 */ }
  return <div className={styles.page}><PageHeading section="plans" title="楽しみの続きを、整える。">予定の変更やチケットの状態を更新できます。</PageHeading><PlanForm id={id} works={works}/></div>;
}
