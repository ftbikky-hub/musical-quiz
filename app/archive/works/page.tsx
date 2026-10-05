import { fetchArchiveWorkStats } from "@/app/archive/queries";
import { WorksTable } from "@/components/archive/WorksTable";

export const revalidate = 0;

export default async function ArchiveWorksPage() {
  const works = await fetchArchiveWorkStats();

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-gray-900">作品一覧</h1>
      <WorksTable works={works} />
    </div>
  );
}
