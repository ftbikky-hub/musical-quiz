import type { Metadata } from "next";
import { TheatreShell } from "@/components/theatre/TheatreShell";

export const metadata: Metadata = { title: "コレクション | THEATRE NOTES" };

export default function SectionLayout({ children }: { children: React.ReactNode }) {
  return <TheatreShell section="collection">{children}</TheatreShell>;
}
