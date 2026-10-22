import { requireJournalMember } from "@/lib/journal-members";
import { PageHeading } from "@/components/theatre/PageHeading";
import { PlanForm } from "@/components/plans/PlanForm";
import { searchArchiveWorkNames } from "@/app/archive/queries";
import styles from "@/components/plans/plans.module.css";
export default async function NewPlanPage({ searchParams }: { searchParams: Promise<{ title?: string; venue?: string }> }) {
  const params = await searchParams;
  const title = params.title?.slice(0, 200) || "", venue = params.venue?.slice(0, 500) || "";
  await requireJournalMember(`/plans/new?${new URLSearchParams({ title, venue })}`);
  let works: { id: number; name: string }[] = [];
  try { works = await searchArchiveWorkNames(""); } catch { /* 作品候補を取得できなくても手入力で登録できる。 */ }
  return <div className={styles.page}><PageHeading section="plans" title="次の楽しみを、手帳に。">観劇・コンサートと、忘れたくない抽選の日付を。</PageHeading><PlanForm works={works} initialTitle={title} initialVenue={venue}/></div>;
}
