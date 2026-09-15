import { ExhibitHeader } from "@/components/exhibit-header";
import { RivalryExplorer } from "@/components/rivalry-explorer";
import { getRivalries } from "@/lib/data/museum";

export default async function RivalriesPage() {
  const rivalries=await getRivalries();
  return <main className="exhibit-page"><ExhibitHeader eyebrow="The rivalry room" title="Head-to-head ledger" description="Every completed meeting, including the postseason. Filter by team and expose the league's widest—and narrowest—historical gaps."/><RivalryExplorer rivalries={rivalries}/></main>;
}
