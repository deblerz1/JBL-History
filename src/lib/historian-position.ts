import type {HistorianCorpus,HistorianGame,HistorianPlan} from "./historian";

export const positions=["QB","RB","WR","TE","K","D/ST"] as const;
export type HistorianPosition=(typeof positions)[number];
export const positionMetrics=new Set<string>(["position_points","position_points_per_game","position_scoring_share"]);
export type PositionSnapshot={season_team_id:string;player_id:string;matchup_period:number;lineup_slot:string|null;points:number|null;historical_position:string|null};
const starterSlots=new Set<string>([...positions,"RB/WR","RB/WR/TE"]);

export function positionScope(plan:HistorianPlan,corpus:HistorianCorpus):HistorianGame[]{
  if(!corpus.games.length)return [];
  const years=corpus.games.map(g=>g.year);
  const start=plan.startYear??Math.min(...years),end=plan.endYear??Math.max(...years);
  const participates=(id:string)=>plan.population!=="active_every_season"||Array.from({length:end-start+1},(_,i)=>start+i).every(year=>corpus.seasons.some(s=>s.memberId===id&&s.year===year));
  return corpus.games.filter(g=>(!plan.memberIds.length||plan.memberIds.includes(g.memberId))&&g.year>=start&&g.year<=end&&(plan.gameType==="all"||g.playoff===(plan.gameType==="playoffs"))&&participates(g.memberId));
}

// Reconciliation is a necessary coverage check, not proof that every historical
// snapshot is perfect. Never substitute today's mutable player position.
export function verifyPositionGames(games:HistorianGame[],snapshots:PositionSnapshot[],position:HistorianPosition):HistorianGame[]{
  const weeks=new Map<string,PositionSnapshot[]>();
  for(const row of snapshots){const key=`${row.season_team_id}:${row.matchup_period}`;weeks.set(key,[...(weeks.get(key)??[]),row]);}
  return games.map(game=>{
    const fail=(reason:string)=>({...game,positionPoints:undefined,positionVerified:undefined,positionFailure:reason});
    const scoringWeeks=game.scoringWeeks;
    if(!game.seasonTeamId||!scoringWeeks?.length||new Set(scoringWeeks).size!==scoringWeeks.length||scoringWeeks.some(w=>!Number.isInteger(w)||w<1))return fail("missing scoring-week mapping");
    let total=0,selected=0;
    for(const week of scoringWeeks){
      const rows=weeks.get(`${game.seasonTeamId}:${week}`);
      if(!rows?.length)return fail(`missing lineup in Week ${week}`);
      const seen=new Set<string>();let starters=0;
      for(const row of rows){
        if(!row.player_id||seen.has(row.player_id))return fail(`duplicate/invalid player in Week ${week}`);
        seen.add(row.player_id);
        if(row.lineup_slot==="BE"||row.lineup_slot==="IR")continue;
        if(!starterSlots.has(row.lineup_slot??"")||!positions.includes(row.historical_position as HistorianPosition)||typeof row.points!=="number"||!Number.isFinite(row.points))return fail(`unverified starter in Week ${week}`);
        starters++;total+=row.points;
        if(row.historical_position===position)selected+=row.points;
      }
      if(!starters)return fail(`missing starters in Week ${week}`);
    }
    if(!Number.isFinite(game.points)||Math.abs(total-game.points)>.020001)return fail("starter scores do not reconcile with official score");
    return {...game,positionPoints:selected,positionVerified:position,positionFailure:undefined};
  });
}
