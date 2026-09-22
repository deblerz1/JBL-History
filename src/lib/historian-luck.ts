import type {HistorianCorpus,HistorianGame} from "./historian";

// Compare against the entire league BEFORE applying manager filters.
export function prepareLuckGames(corpus:HistorianCorpus,startYear:number|null,endYear:number|null){
  const groups=new Map<string,HistorianGame[]>();
  const excluded:string[]=[];
  for(const game of corpus.games){
    if(game.playoff||(startYear!==null&&game.year<startYear)||(endYear!==null&&game.year>endYear))continue;
    const key=`${game.year} Week ${game.week??"unknown"}`;
    groups.set(key,[...(groups.get(key)??[]),game]);
  }
  const games:Array<HistorianGame & {expectedWins:number}>=[];
  for(const [key,week] of groups){
    const expected=new Set(corpus.seasons.filter(s=>s.year===week[0].year).map(s=>s.memberId));
    const actual=new Set(week.map(g=>g.memberId));
    const complete=expected.size>=2&&expected.size===week.length&&actual.size===week.length&&
      [...expected].every(id=>actual.has(id))&&week.every(g=>{
        const opponent=week.find(other=>other.memberId===g.opponentMemberId);
        return Number.isInteger(g.week)&&Number(g.week)>0&&g.scoringPeriodCount===1&&
          Number.isFinite(g.points)&&Number.isFinite(g.opponentPoints)&&
          opponent&&opponent!==g&&opponent.opponentMemberId===g.memberId&&
          opponent.points===g.opponentPoints&&opponent.opponentPoints===g.points;
      });
    if(!complete){excluded.push(key);continue;}
    for(const game of week){
      const others=week.filter(g=>g.memberId!==game.memberId);
      const expectedWins=others.reduce((sum,g)=>sum+(game.points>g.points?1:game.points===g.points?.5:0),0)/others.length;
      games.push({...game,expectedWins});
    }
  }
  return {games,excluded,completeWeeks:groups.size-excluded.length};
}
