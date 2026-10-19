import type { Metadata } from "next";
import { requireJournalMember } from "@/lib/journal-members";
import { TheatreShell } from "@/components/theatre/TheatreShell";

export const metadata: Metadata = { title: "観劇記録 | THEATRE NOTES" };

export default async function SectionLayout({ children }: { children: React.ReactNode }) {
  await requireJournalMember();
  return <TheatreShell section="journal">{children}</TheatreShell>;
}
