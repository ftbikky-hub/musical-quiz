import Link from "next/link";
import { notFound } from "next/navigation";
import { fetchTheaterLogById } from "@/lib/supabase/theater-log-queries";
import { TheaterLogForm } from "@/components/theater-log/TheaterLogForm";

export const revalidate = 0;

export default async function EditTheaterLogPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const item = await fetchTheaterLogById(id);
  if (!item) notFound();

  return (
    <div className="max-w-2xl mx-auto p-4 sm:p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">編集</h1>
        <Link
          href={`/theater-log/${id}`}
          className="text-sm text-blue-600 hover:underline"
        >
          &larr; 詳細に戻る
        </Link>
      </div>
      <TheaterLogForm initialData={item} />
    </div>
  );
}
