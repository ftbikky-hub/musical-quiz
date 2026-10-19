import type { Metadata } from "next";
import { TheatreShell } from "@/components/theatre/TheatreShell";

export const metadata: Metadata = { title: "観劇記録 | THEATRE NOTES" };

export default function SectionLayout({ children }: { children: React.ReactNode }) {
  return <TheatreShell section="journal">{children}</TheatreShell>;
}
