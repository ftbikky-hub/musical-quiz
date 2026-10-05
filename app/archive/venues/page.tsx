import { fetchArchiveVenueStats } from "@/app/archive/queries";
import { VenuesTable } from "@/components/archive/VenuesTable";

export const revalidate = 0;

export default async function ArchiveVenuesPage() {
  const venues = await fetchArchiveVenueStats();

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-gray-900">会場一覧</h1>
      <VenuesTable venues={venues} />
    </div>
  );
}
