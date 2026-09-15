import type { Rivalry } from "@/lib/data/museum";

export type RivalrySort="disparity"|"closest"|"meetings";

export function rivalryWinRate(wins:number,ties:number,games:number) {
  return games===0?0:(wins+ties*.5)/games;
}

export function rivalryDisparity(rivalry:Rivalry) {
  return Math.abs(rivalryWinRate(rivalry.memberAWins,rivalry.ties,rivalry.games)-rivalryWinRate(rivalry.memberBWins,rivalry.ties,rivalry.games));
}

export function sortRivalries(rivalries:Rivalry[],sort:RivalrySort) {
  return [...rivalries].sort((a,b)=>{
    const disparityDifference=rivalryDisparity(b)-rivalryDisparity(a);
    if(sort==="closest") return -disparityDifference||b.games-a.games;
    if(sort==="meetings") return b.games-a.games||disparityDifference;
    return disparityDifference||b.games-a.games;
  });
}
