import type { Metadata } from "next";
import { TheatreShell } from "@/components/theatre/TheatreShell";

export const metadata: Metadata = { title: "公式映像 | THEATRE NOTES" };

export default function SectionLayout({ children }: { children: React.ReactNode }) {
  return <TheatreShell section="films">{children}</TheatreShell>;
}
