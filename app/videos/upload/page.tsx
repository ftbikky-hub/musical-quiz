import Link from "next/link";
import { addVideo } from "./actions";

export default function UploadVideoPage() {
  return (
    <div className="max-w-md mx-auto p-4 sm:p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">動画を追加</h1>
        <Link href="/videos" className="text-sm text-blue-600 hover:underline">
          &larr; 動画一覧に戻る
        </Link>
      </div>

      <form action={addVideo} className="space-y-4">
        <label className="block">
          <span className="block text-sm font-medium text-gray-700 mb-1">タイトル</span>
          <input
            name="title"
            required
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
          />
        </label>
        <label className="block">
          <span className="block text-sm font-medium text-gray-700 mb-1">説明(任意)</span>
          <textarea
            name="description"
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
          />
        </label>
        <label className="block">
          <span className="block text-sm font-medium text-gray-700 mb-1">
            Googleドライブの共有リンク
          </span>
          <input
            name="driveUrl"
            required
            placeholder="https://drive.google.com/file/d/.../view"
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
          />
        </label>
        <button
          type="submit"
          className="w-full py-2.5 bg-blue-600 text-white rounded-lg text-sm font-semibold"
        >
          追加する
        </button>
      </form>
    </div>
  );
}
