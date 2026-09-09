import Link from "next/link";
import { addMedia } from "./actions";

export default function UploadMediaPage() {
  return (
    <div className="max-w-md mx-auto p-4 sm:p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">追加</h1>
        <Link href="/media" className="text-sm text-blue-600 hover:underline">
          &larr; 一覧に戻る
        </Link>
      </div>

      <form action={addMedia} className="space-y-4">
        <fieldset>
          <legend className="block text-sm font-medium text-gray-700 mb-1">種類</legend>
          <div className="flex gap-4">
            <label className="flex items-center gap-1.5 text-sm">
              <input type="radio" name="type" value="video" defaultChecked />
              動画
            </label>
            <label className="flex items-center gap-1.5 text-sm">
              <input type="radio" name="type" value="audio" />
              音楽
            </label>
            <label className="flex items-center gap-1.5 text-sm">
              <input type="radio" name="type" value="photo" />
              写真
            </label>
          </div>
        </fieldset>
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
