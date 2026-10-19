import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "劇団四季ツール集（非公式）＆ミュージカルクイズ",
  description:
    "個人用ツール集：劇団四季の過去キャスト検索、公式YouTube動画一覧、観劇記録、公演アーカイブとミュージカルクイズ。",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ja" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
