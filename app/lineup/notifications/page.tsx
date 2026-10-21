import type { Metadata } from "next";
import Link from "next/link";
import { TheatreShell } from "@/components/theatre/TheatreShell";
import { PageHeading } from "@/components/theatre/PageHeading";
import { NotificationSetup } from "@/components/lineup/NotificationSetup";

export const metadata: Metadata = { title: "Gmailで上演予定の変更を受け取る | THEATRE NOTES" };
export default function LineupNotificationsPage() {
  return <TheatreShell section="lineup"><div className="max-w-3xl mx-auto p-4 sm:p-6">
    <PageHeading section="lineup" title="次の舞台の知らせを、Gmailへ。" actions={<Link href="/lineup">上演予定へ戻る ↗</Link>}>Googleの無料利用枠内で始める、個人用のお知らせ。最初の設定だけ、Google側で行います。</PageHeading>
    <NotificationSetup/>
  </div></TheatreShell>;
}
