import { notFound } from "next/navigation";
import { MatchupDetail } from "@/components/matchup-detail";
import { getMatchupDetail } from "@/lib/data/museum";

export const dynamic="force-dynamic";
export default async function SeasonMatchupPage({params}:{params:Promise<{year:string;matchupId:string}>}) {
  const {year,matchupId}=await params; const matchup=await getMatchupDetail(matchupId);
  if(!matchup||String(matchup.year)!==year) notFound();
  return <MatchupDetail matchup={matchup} backHref={`/museum/seasons/${year}`} backLabel={`${year} weekly matchups`} context={`Matchup period ${matchup.matchupPeriod}`}/>;
}
