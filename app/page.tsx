import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
      <div className="max-w-4xl w-full space-y-8">
        <div className="text-center space-y-4">
          <p className="text-sm font-medium text-gray-500 uppercase tracking-widest">
            ENTRANCE
          </p>
          <h1 className="text-4xl font-extrabold text-gray-900">
            アプリを選ぶ
          </h1>
          <p className="text-gray-600">
            どれも個人用のツールです。公式の劇団四季・各権利元とは関係ありません。
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Link
            href="/schedule"
            className="group bg-white rounded-2xl p-6 shadow-sm hover:shadow-md border border-gray-100 transition-all hover:-translate-y-1 h-[280px] flex flex-col"
          >
            <div className="h-12 w-12 bg-blue-50 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <span className="text-2xl">🎭</span>
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">
              劇団四季スケジュール（非公式）
            </h2>
            <p className="text-gray-600 text-sm flex-grow">
              公演スケジュール（カード／タイムライン／マップ）とチケット発売予定を確認できます。
            </p>
            <div className="text-blue-600 font-medium text-sm mt-4">
              開く &rarr;
            </div>
          </Link>

          <Link
            href="/cast"
            className="group bg-white rounded-2xl p-6 shadow-sm hover:shadow-md border border-gray-100 transition-all hover:-translate-y-1 h-[280px] flex flex-col"
          >
            <div className="h-12 w-12 bg-amber-50 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <span className="text-2xl">🎫</span>
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">
              劇団四季 過去キャスト一覧（非公式）
            </h2>
            <p className="text-gray-600 text-sm flex-grow">
              演目・劇場・役名・役者名で過去のキャストを検索。役のピン留め、出演者ページ、共演ランキングなどが見られます。
            </p>
            <div className="text-blue-600 font-medium text-sm mt-4">
              開く &rarr;
            </div>
          </Link>

          <Link
            href="/youtube"
            className="group bg-white rounded-2xl p-6 shadow-sm hover:shadow-md border border-gray-100 transition-all hover:-translate-y-1 h-[280px] flex flex-col"
          >
            <div className="h-12 w-12 bg-red-50 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <span className="text-2xl">▶️</span>
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">
              劇団四季 公式YouTube動画一覧
            </h2>
            <p className="text-gray-600 text-sm flex-grow">
              劇団四季の公式YouTube動画一覧。演目やキャストで検索できます。
            </p>
            <div className="text-blue-600 font-medium text-sm mt-4">
              開く &rarr;
            </div>
          </Link>

          <Link
            href="/quiz.html"
            className="group bg-white rounded-2xl p-6 shadow-sm hover:shadow-md border border-gray-100 transition-all hover:-translate-y-1 h-[280px] flex flex-col"
          >
            <div className="h-12 w-12 bg-rose-50 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <span className="text-2xl">🎟️</span>
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">
              ミュージカルクイズ
            </h2>
            <p className="text-gray-600 text-sm flex-grow">
              ミュージカル雑学クイズに挑戦して、スコアを競えます。
            </p>
            <div className="text-blue-600 font-medium text-sm mt-4">
              開く &rarr;
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}
