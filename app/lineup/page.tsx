import type { Metadata } from "next";
import { TheatreShell } from "@/components/theatre/TheatreShell";
import { PageHeading } from "@/components/theatre/PageHeading";
import { LineupExperience } from "@/components/lineup/LineupExperience";
import snapshot from "@/data/shiki-lineup.json";
import styles from "@/components/lineup/lineup.module.css";

export const metadata: Metadata = { title: "劇団四季の上演予定 | THEATRE NOTES", description: "作品と月から、次の観劇を探す。地域・劇場で絞り込める、劇団四季の年間上演予定とお気に入り。" };
export default function LineupPage() {
  return <TheatreShell section="lineup"><div className={styles.page}>
    <PageHeading section="lineup" title="次の観劇を、見つけよう。">いつ、どこで、何が観られる？ 四季の一年を見渡して、楽しみな予定をひとつずつ。</PageHeading>
    <LineupExperience snapshot={snapshot}/>
  </div></TheatreShell>;
}
