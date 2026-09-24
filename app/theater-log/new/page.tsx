import Link from "next/link";
import { TheaterLogForm } from "@/components/theater-log/TheaterLogForm";

export default function NewTheaterLogPage() {
  return (
    <div className="max-w-2xl mx-auto p-4 sm:p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">新規登録</h1>
        <Link href="/theater-log" className="text-sm text-blue-600 hover:underline">
          &larr; 一覧に戻る
        </Link>
      </div>
      <TheaterLogForm />
    </div>
  );
}
