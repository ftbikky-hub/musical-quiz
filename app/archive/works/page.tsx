import { fetchArchiveWorkStats } from "@/app/archive/queries";
import { PageHeading } from "@/components/theatre/PageHeading";
import { WorksTable } from "@/components/archive/WorksTable";

export const revalidate = 0;

export default async function ArchiveWorksPage() {
  const works = await fetchArchiveWorkStats();

  return (
    <div className="space-y-4">
      <PageHeading section="archive" title="作品の本棚">気になる一冊を開いて、公演の歴史・出演者・役・スタッフへ。一覧表に切り替えて比較することもできます。</PageHeading>
      <WorksTable works={works} />
    </div>
  );
}
