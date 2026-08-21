import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "劇団四季スケジュール（非公式）＆ミュージカルクイズ",
  description:
    "個人用ツール集：劇団四季の公演スケジュール確認（非公式）とミュージカルクイズ。",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ja" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
