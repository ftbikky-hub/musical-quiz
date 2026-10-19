import type { Metadata } from "next";
import { TheatreShell } from "@/components/theatre/TheatreShell";

export const metadata: Metadata = { title: "過去キャスト | THEATRE NOTES" };

export default function SectionLayout({ children }: { children: React.ReactNode }) {
  return <TheatreShell section="cast">{children}</TheatreShell>;
}
