import Link from "next/link";
import { notFound } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { updateMedia } from "@/app/media/actions";

export default async function EditMediaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const { data: item, error } = await supabase
    .from("media")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !item) {
    notFound();
  }

  return (
    <div className="max-w-md mx-auto p-4 sm:p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">編集</h1>
        <Link href="/media" className="text-sm text-blue-600 hover:underline">
          &larr; 一覧に戻る
        </Link>
      </div>

      <form action={updateMedia} className="space-y-4">
        <input type="hidden" name="id" value={item.id} />
        <label className="block">
          <span className="block text-sm font-medium text-gray-700 mb-1">タイトル</span>
          <input
            name="title"
            required
            defaultValue={item.title}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
          />
        </label>
        <label className="block">
          <span className="block text-sm font-medium text-gray-700 mb-1">説明(任意)</span>
          <textarea
            name="description"
            defaultValue={item.description ?? ""}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
          />
        </label>
        <button
          type="submit"
          className="w-full py-2.5 bg-blue-600 text-white rounded-lg text-sm font-semibold"
        >
          保存する
        </button>
      </form>
    </div>
  );
}
