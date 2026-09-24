import Link from "next/link";
import { notFound } from "next/navigation";
import { fetchTheaterLogById } from "@/lib/supabase/theater-log-queries";
import { supabase } from "@/lib/supabase/client";
import { deleteTheaterLog } from "../actions";
import { DeleteTheaterLogButton } from "@/components/theater-log/DeleteTheaterLogButton";

export const revalidate = 0;

const SLOT_LABELS: Record<string, string> = {
  matinee: "マチネ",
  soiree: "ソワレ",
  other: "その他",
};

const PHOTO_BUCKET = "theater-photos";

function photoUrl(path: string) {
  return supabase.storage.from(PHOTO_BUCKET).getPublicUrl(path).data.publicUrl;
}

export default async function TheaterLogDetailPage({
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
        <h1 className="text-2xl font-bold text-gray-900">観劇記録</h1>
        <Link href="/theater-log" className="text-sm text-blue-600 hover:underline">
          &larr; 一覧に戻る
        </Link>
      </div>

      <div className="bg-white border border-gray-100 rounded-xl p-5 space-y-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <span>{item.watched_on}</span>
            {item.performance_slot && <span>{SLOT_LABELS[item.performance_slot]}</span>}
          </div>
          <h2 className="text-xl font-bold text-gray-900">{item.work_title}</h2>
          <p className="text-sm text-gray-500">
            {[item.theater, item.seat].filter(Boolean).join(" / ")}
          </p>
          {item.rating && (
            <p className="text-yellow-500">{"★".repeat(item.rating)}</p>
          )}
        </div>

        {item.casts.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-1">キャスト</h3>
            <ul className="text-sm text-gray-600 space-y-0.5">
              {item.casts.map((c) => (
                <li key={c.id}>
                  {c.role_name ? `${c.role_name}: ` : ""}
                  {c.actor_name}
                </li>
              ))}
            </ul>
          </div>
        )}

        {item.impression && (
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-1">感想</h3>
            <p className="text-sm text-gray-600 whitespace-pre-wrap">
              {item.impression}
            </p>
          </div>
        )}

        {item.photos.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-2">写真</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {item.photos.map((p) => (
                <a
                  key={p.id}
                  href={photoUrl(p.storage_path)}
                  target="_blank"
                  rel="noreferrer"
                  className="block"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={photoUrl(p.storage_path)}
                    alt={p.caption ?? ""}
                    className="w-full aspect-square object-cover rounded-lg bg-gray-100"
                  />
                  {p.caption && (
                    <p className="text-[11px] text-gray-400 mt-0.5 truncate">
                      {p.caption}
                    </p>
                  )}
                </a>
              ))}
            </div>
          </div>
        )}

        <div className="flex items-center gap-4 pt-2 border-t border-gray-100">
          <Link
            href={`/theater-log/${item.id}/edit`}
            className="text-sm text-blue-600 hover:underline"
          >
            編集
          </Link>
          <DeleteTheaterLogButton
            id={item.id}
            action={deleteTheaterLog}
            className="text-sm text-red-600 hover:underline"
          />
        </div>
      </div>
    </div>
  );
}
