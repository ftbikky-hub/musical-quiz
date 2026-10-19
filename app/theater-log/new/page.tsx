import Link from "next/link";
import { PageHeading } from "@/components/theatre/PageHeading";
import { TheaterLogForm } from "@/components/theater-log/TheaterLogForm";

export default function NewTheaterLogPage() {
  return (
    <div className="max-w-2xl mx-auto p-4 sm:p-6 space-y-6">
      <PageHeading section="journal" title="今日の舞台を、手帳に。" actions={<Link href="/theater-log" className="text-sm text-blue-600 hover:underline">← 一覧に戻る</Link>}>
        心に残った場面や歌声を、あなたの言葉で。キャストや写真と一緒に残せます。
      </PageHeading>
      <TheaterLogForm />
    </div>
  );
}
