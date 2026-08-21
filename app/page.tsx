import Link from "next/link";

const APPS = [
  {
    href: "/schedule",
    title: "劇団四季スケジュール（非公式）",
    description:
      "公演スケジュール（カード／タイムライン／マップ）とチケット発売予定を確認できます。",
    accent: "#2c665c",
    emoji: "🎭",
    external: false,
  },
  {
    href: "/quiz.html",
    title: "ミュージカルクイズ",
    description: "ミュージカル雑学クイズに挑戦して、スコアを競えます。",
    accent: "#a8752a",
    emoji: "🎟️",
    external: true,
  },
];

export default function EntryPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-10 bg-neutral-50 px-6 py-16 text-neutral-900">
      <div className="flex flex-col items-center gap-3 text-center">
        <p className="text-xs font-mono tracking-widest text-neutral-500 uppercase">
          entrance
        </p>
        <h1 className="text-3xl font-bold sm:text-4xl">アプリを選ぶ</h1>
        <p className="max-w-md text-sm text-neutral-500">
          どちらも個人用のツールです。公式の劇団四季・各権利元とは関係ありません。
        </p>
      </div>

      <div className="grid w-full max-w-3xl gap-5 sm:grid-cols-2">
        {APPS.map((app) => (
          <Link
            key={app.href}
            href={app.href}
            className="group flex flex-col justify-between gap-6 rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
          >
            <div className="flex flex-col gap-3">
              <span
                className="flex h-12 w-12 items-center justify-center rounded-xl text-2xl"
                style={{ backgroundColor: `${app.accent}1a` }}
              >
                {app.emoji}
              </span>
              <h2 className="text-lg font-bold">{app.title}</h2>
              <p className="text-sm leading-relaxed text-neutral-500">
                {app.description}
              </p>
            </div>
            <span
              className="inline-flex items-center gap-1 text-sm font-bold"
              style={{ color: app.accent }}
            >
              開く
              <span className="transition group-hover:translate-x-0.5">
                →
              </span>
            </span>
          </Link>
        ))}
      </div>
    </main>
  );
}
