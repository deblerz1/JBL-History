import { ExhibitHeader } from "@/components/exhibit-header";
import { PlayoffBracket } from "@/components/playoff-bracket";
import { getPlayoffArchive } from "@/lib/data/museum";

export const dynamic="force-dynamic";

export default async function PlayoffsPage() {
  const seasons=await getPlayoffArchive();
  return <main className="exhibit-page"><ExhibitHeader eyebrow="The postseason gallery" title="Road to the trophy" description="Every bye, elimination, and championship path reconstructed from the official league schedule. Choose a season to reopen its bracket."/><PlayoffBracket seasons={seasons}/></main>;
}
