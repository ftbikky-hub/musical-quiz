import type { Metadata } from "next";
import { TheatreShell } from "@/components/theatre/TheatreShell";

export const metadata: Metadata = { title: "ログイン | THEATRE NOTES" };

export default function SectionLayout({ children }: { children: React.ReactNode }) {
  return <TheatreShell section="account">{children}</TheatreShell>;
}
