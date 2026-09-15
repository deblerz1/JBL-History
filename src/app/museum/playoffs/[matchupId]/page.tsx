import { notFound } from "next/navigation";
import { MatchupDetail } from "@/components/matchup-detail";
import { getPlayoffMatchup } from "@/lib/data/museum";
import { playoffRoundName } from "@/lib/playoffs";

export const dynamic="force-dynamic";

export default async function PlayoffMatchupPage({params}:{params:Promise<{matchupId:string}>}) {
  const {matchupId}=await params; const matchup=await getPlayoffMatchup(matchupId);
  if(!matchup) notFound();
  return <MatchupDetail matchup={matchup} backHref="/museum/playoffs" backLabel="Playoff museum" context={playoffRoundName(matchup.round,matchup.roundCount)}/>;
}
