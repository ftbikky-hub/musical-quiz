import { notFound } from "next/navigation";
import { requireJournalMember } from "@/lib/journal-members";
import { PageHeading } from "@/components/theatre/PageHeading";
import { ActivityForm } from "@/components/activity/ActivityForm";
import { isMemberId } from "@/lib/member-names";
import styles from "@/components/plans/plans.module.css";
export default async function EditActivityPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params; if (!isMemberId(id)) notFound(); const member = await requireJournalMember(`/activity/${id}/edit`);
  return <div className={styles.page}><PageHeading section="activity" title="思い出の場所を、整える。">日時や会場を、思い出したときに。</PageHeading><ActivityForm key={member.id} id={id}/></div>;
}
