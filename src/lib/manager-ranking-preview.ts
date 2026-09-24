import type {HistorianCorpus} from "./historian";
import {calculateManagerScores,rankManagerScores,overallManagerRank} from "./historian-manager-score";

// Homepage preview uses the same complete population and qualification rules as
// the full exhibit. Apply the display limit only after assigning league ranks.
export function managerRankingPreview(corpus:HistorianCorpus){
  const scores=calculateManagerScores(corpus);
  const managers=rankManagerScores(scores.rows).filter(m=>m.qualified).slice(0,5).map(m=>({memberId:m.memberId,teamName:m.teamName,ownerName:m.publicName,championships:m.titles,winPercentage:m.winRate,playoffAppearances:m.appearances,overallScore:m.best,overallRank:overallManagerRank(m,scores.rows)}));
  return {managers,rankingError:scores.error};
}
