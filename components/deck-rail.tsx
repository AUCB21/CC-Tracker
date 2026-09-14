import { DeckNav, type NavCounts } from "@/components/mobile-nav";

export function DeckRail({ counts }: { counts: NavCounts }) {
  return <DeckNav counts={counts} />;
}
