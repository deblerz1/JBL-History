import {paginatedRows} from "@/lib/paginated-rows";
import "server-only";
import {managerRankingPreview} from "@/lib/manager-ranking-preview";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { HistorianCorpus,HistorianPlan } from "@/lib/historian";
import {positionMetrics,positionScope,verifyPositionGames,type PositionSnapshot} from "@/lib/historian-position";

export async function loadHistorianPositions(corpus:HistorianCorpus,plan:HistorianPlan):Promise<HistorianCorpus>{
  if(!plan.position||!positionMetrics.has(plan.metric??""))return corpus;
  const games=positionScope(plan,corpus);
  const ids=[...new Set(games.flatMap(g=>g.seasonTeamId?[g.seasonTeamId]:[]))];
  const snapshots:PositionSnapshot[]=[];
  if(ids.length){
    const supabase=createServerSupabaseClient();
    for(let offset=0;;offset+=500){
      const {data,error}=await supabase.from("roster_snapshots").select("season_team_id,player_id,matchup_period,lineup_slot,points,historical_position:raw_data->>position").in("season_team_id",ids).order("id").range(offset,offset+499);
      if(error)throw new Error("Positional lineup data could not be loaded.");
      snapshots.push(...(data??[]) as PositionSnapshot[]);
      if(!data||data.length<500)break;
    }
  }
  const verified=verifyPositionGames(games,snapshots,plan.position);
  const replacements=new Map(games.map((g,i)=>[g,verified[i]]));
  return {...corpus,games:corpus.games.map(g=>replacements.get(g)??g)};
}

export type Champion = { year: number; teamName: string; ownerName: string | null; runnerUpTeamName: string; championScore: number; runnerUpScore: number };
export type ManagerCareer = { teamName: string; ownerName: string | null; championships: number; winPercentage: number | null; playoffAppearances: number };
export type PlayoffTeam = { id: string; seed: number | null; teamName: string; ownerName: string | null; score: number; winner: boolean };
export type PlayoffGame = { id: string; round: number; roundCount: number; matchupPeriod: number; scoringPeriods: number[]; home: PlayoffTeam; away: PlayoffTeam };
export type PlayoffSeason = { year: number; status: string; playoffTeamCount: number; games: PlayoffGame[] };
export type PlayoffPlayer = { id: string; name: string; position: string | null; proTeam: string | null; slot: string | null; points: number; projectedPoints: number | null; reserve: boolean };
export type PlayoffWeek = { week: number; homePlayers: PlayoffPlayer[]; awayPlayers: PlayoffPlayer[]; homePoints: number; awayPoints: number };
export type PlayoffMatchupDetail = PlayoffGame & { year: number; home: PlayoffTeam; away: PlayoffTeam; weeks: PlayoffWeek[]; lineupAvailable: boolean };
export type Rivalry = { memberAId: string; memberBId: string; memberATeamName: string; memberBTeamName: string; memberAPublicName: string | null; memberBPublicName: string | null; games: number; memberAWins: number; memberBWins: number; ties: number; memberAPoints: number; memberBPoints: number };
export type SeasonMatchup = { id:string; matchupPeriod:number; scoringPeriods:number[]; playoff:boolean; complete:boolean; home:PlayoffTeam; away:PlayoffTeam };

async function identityMap(supabase: ReturnType<typeof createServerSupabaseClient>) {
  const { data, error } = await supabase.from("analytics_member_identities").select("member_id,public_name");
  if (error) throw new Error(`Identity query failed: ${error.message}`);
  return new Map(data.map((row) => [row.member_id, row.public_name]));
}

async function historianMatchups(supabase:ReturnType<typeof createServerSupabaseClient>){
  const page=(offset:number)=>supabase.from("matchups").select("id,season_id,matchup_period,home_team_id,away_team_id,home_score,away_score,winner_team_id").eq("is_complete",true).not("home_score","is",null).not("away_score","is",null).order("id").range(offset,offset+499);
  const first=await page(0);
  if(first.error)return first;
  const rows=[...first.data];
  let size=first.data.length;
  while(size===500){const next=await page(rows.length);if(next.error)return next;rows.push(...next.data);size=next.data.length;}
  return {...first,data:rows};
}

export async function getHistorianCorpus():Promise<HistorianCorpus> {
  const supabase=createServerSupabaseClient();
  const [managersResult,championsResult,rivalriesResult,recordsResult,seasonsResult,matchupsResult,configResult,playoffsResult,identities,settingsResult]=await Promise.all([
    supabase.from("analytics_manager_careers").select("member_id,current_team_name,championships,regular_season_wins,regular_season_losses,regular_season_ties,regular_season_win_percentage,playoff_appearances,playoff_wins,playoff_losses,playoff_win_percentage,regular_season_points_for"),
    supabase.from("analytics_champions").select("year,member_id,team_name,runner_up_team_name,champion_score,runner_up_score"),
    supabase.from("analytics_head_to_head").select("member_a_id,member_b_id,member_a_team_name,member_b_team_name,games,member_a_wins,member_b_wins,ties"),
    supabase.from("analytics_league_records").select("record_type,record_rank,year,matchup_period,member_id,team_name,opponent_team_name,record_value").lte("record_rank",10),
    supabase.from("analytics_season_standings").select("season_id,season_team_id,year,member_id,team_name,wins,losses,ties,points_for,final_standing,playoff_seed"),
    historianMatchups(supabase),
    supabase.from("analytics_season_config").select("season_id,year,status,regular_season_periods,playoff_team_count,final_matchup_period"),
    supabase.from("analytics_playoff_games").select("matchup_id,home_team_id,away_team_id"),identityMap(supabase),
    supabase.from("scoring_settings").select("season_id,settings"),
  ]);
  if(managersResult.error) throw new Error(`Historian managers query failed: ${managersResult.error.message}`);
  if(championsResult.error) throw new Error(`Historian champions query failed: ${championsResult.error.message}`);
  if(rivalriesResult.error) throw new Error(`Historian rivalries query failed: ${rivalriesResult.error.message}`);
  if(recordsResult.error) throw new Error(`Historian records query failed: ${recordsResult.error.message}`);
  if(seasonsResult.error) throw new Error(`Historian seasons query failed: ${seasonsResult.error.message}`);
  if(matchupsResult.error) throw new Error(`Historian games query failed: ${matchupsResult.error.message}`);
  if(configResult.error) throw new Error(`Historian schedule query failed: ${configResult.error.message}`);
  if(playoffsResult.error) throw new Error(`Historian playoffs query failed: ${playoffsResult.error.message}`);
  if(settingsResult.error) throw new Error(`Historian scoring periods query failed: ${settingsResult.error.message}`);
  const schedules=new Map(settingsResult.data.map(row=>[row.season_id,row.settings?.scheduleSettings?.matchupPeriods]));
  const teams=new Map(seasonsResult.data.map(row=>[row.season_team_id,row]));
  const regularPeriods=new Map(configResult.data.map(row=>[row.season_id,Number(row.regular_season_periods)])); const playoffIds=new Set(playoffsResult.data.map(row=>row.matchup_id));
  const games=matchupsResult.data.flatMap(matchup=>{
    const home=teams.get(matchup.home_team_id); const away=teams.get(matchup.away_team_id); if(!home||!away)return [];
    const playoff=playoffIds.has(matchup.id); const regular=Number(matchup.matchup_period)<=Number(regularPeriods.get(matchup.season_id)); if(!regular&&!playoff)return [];
    const result=(teamId:string):"win"|"loss"|"tie"=>matchup.winner_team_id===null?"tie":matchup.winner_team_id===teamId?"win":"loss";
    const periods=schedules.get(matchup.season_id)?.[String(matchup.matchup_period)];
    const metadata={scoringWeeks:Array.isArray(periods)?periods.map(Number):undefined,week:Array.isArray(periods)&&periods.length===1?Number(periods[0]):undefined,scoringPeriodCount:Array.isArray(periods)?periods.length:undefined};
    return [
      {...metadata,seasonTeamId:matchup.home_team_id,year:Number(home.year),memberId:home.member_id,opponentMemberId:away.member_id,teamName:home.team_name,playoff,points:Number(matchup.home_score),opponentPoints:Number(matchup.away_score),result:result(matchup.home_team_id)},
      {...metadata,seasonTeamId:matchup.away_team_id,year:Number(away.year),memberId:away.member_id,opponentMemberId:home.member_id,teamName:away.team_name,playoff,points:Number(matchup.away_score),opponentPoints:Number(matchup.home_score),result:result(matchup.away_team_id)},
    ];
  });
  return {
    formats:configResult.data.map(config=>{
      const year=Number(config.year),regularWeeks=Number(config.regular_season_periods),playoffSpots=Number(config.playoff_team_count);
      const seasonTeams=seasonsResult.data.filter(t=>t.season_id===config.season_id);
      const playoffParticipants=new Set(playoffsResult.data.flatMap(p=>[p.home_team_id,p.away_team_id]));
      const roundWeeks=Array.from({length:Math.max(0,Number(config.final_matchup_period)-regularWeeks)},(_,i)=>{
        const weeks=schedules.get(config.season_id)?.[String(regularWeeks+i+1)];return Array.isArray(weeks)?weeks.length:0;
      });
      const qualified=seasonTeams.filter(t=>Number(t.playoff_seed)>0&&Number(t.playoff_seed)<=playoffSpots);
      return {year,complete:config.status==="complete",teamCount:seasonTeams.length,playoffSpots,regularWeeks,roundWeeks,byes:playoffSpots>=2?2**Math.ceil(Math.log2(playoffSpots))-playoffSpots:0,qualificationKnown:config.status==="complete"&&qualified.length===playoffSpots&&qualified.every(t=>playoffParticipants.has(t.season_team_id))};
    }),
    managers:managersResult.data.map(r=>({memberId:r.member_id,teamName:r.current_team_name,publicName:identities.get(r.member_id)??null,championships:Number(r.championships),wins:Number(r.regular_season_wins),losses:Number(r.regular_season_losses),ties:Number(r.regular_season_ties),winPercentage:r.regular_season_win_percentage===null?null:Number(r.regular_season_win_percentage),playoffAppearances:Number(r.playoff_appearances),playoffWins:Number(r.playoff_wins),playoffLosses:Number(r.playoff_losses),playoffWinPercentage:r.playoff_win_percentage===null?null:Number(r.playoff_win_percentage),pointsFor:Number(r.regular_season_points_for)})),
    champions:championsResult.data.map(r=>({year:Number(r.year),memberId:r.member_id,teamName:r.team_name,publicName:identities.get(r.member_id)??null,runnerUp:r.runner_up_team_name,score:Number(r.champion_score),runnerUpScore:Number(r.runner_up_score)})),
    rivalries:rivalriesResult.data.map(r=>({memberAId:r.member_a_id,memberBId:r.member_b_id,memberATeamName:r.member_a_team_name,memberBTeamName:r.member_b_team_name,memberAPublicName:identities.get(r.member_a_id)??null,memberBPublicName:identities.get(r.member_b_id)??null,games:Number(r.games),memberAWins:Number(r.member_a_wins),memberBWins:Number(r.member_b_wins),ties:Number(r.ties)})),
    records:recordsResult.data.map(r=>({type:r.record_type,rank:Number(r.record_rank),year:Number(r.year),week:Number(r.matchup_period),memberId:r.member_id,teamName:r.team_name,publicName:identities.get(r.member_id)??null,opponent:r.opponent_team_name,value:Number(r.record_value)})),
    seasons:seasonsResult.data.map(r=>({playoffSeed:r.playoff_seed===null?null:Number(r.playoff_seed),year:Number(r.year),memberId:r.member_id,teamName:r.team_name,wins:Number(r.wins),losses:Number(r.losses),ties:Number(r.ties),pointsFor:Number(r.points_for),finalStanding:r.final_standing===null?null:Number(r.final_standing)})),
    games,
  };
}

export async function getMuseumOverview() {
  const corpus=await getHistorianCorpus();
  const ranking=managerRankingPreview(corpus);
  const champions:Champion[]=[...corpus.champions].sort((a,b)=>b.year-a.year).map(c=>({year:c.year,teamName:c.teamName,ownerName:c.publicName,runnerUpTeamName:c.runnerUp,championScore:c.score,runnerUpScore:c.runnerUpScore}));
  return {champions,...ranking};
}

export async function getManagerRankings() {
  const supabase=createServerSupabaseClient();
  const [{ data, error }, identities] = await Promise.all([supabase.from("analytics_manager_careers").select("member_id,current_team_name,championships,seasons_completed,playoff_appearances,playoff_wins,playoff_losses,playoff_win_percentage,regular_season_wins,regular_season_losses,regular_season_ties,regular_season_win_percentage,regular_season_points_for").order("championships", { ascending:false }).order("regular_season_win_percentage", { ascending:false }),identityMap(supabase)]);
  if (error) throw new Error(`Manager rankings query failed: ${error.message}`);
  return data.map(row=>({...row,public_name:identities.get(row.member_id)??null}));
}

export async function getSeasonArchive() {
  const supabase = createServerSupabaseClient();
  const [standings, champions, identities] = await Promise.all([
    supabase.from("analytics_season_standings").select("year,status,member_id,team_name,wins,losses,ties,points_for,points_against,final_standing,playoff_seed").order("year", { ascending:false }).order("final_standing", { ascending:true }),
    supabase.from("analytics_champions").select("year,member_id,team_name,runner_up_team_name,champion_score,runner_up_score").order("year", { ascending:false }),identityMap(supabase),
  ]);
  if (standings.error) throw new Error(`Season archive query failed: ${standings.error.message}`);
  if (champions.error) throw new Error(`Champions query failed: ${champions.error.message}`);
  return { standings: standings.data.map(row=>({...row,public_name:identities.get(row.member_id)??null})), champions: champions.data.map(row=>({...row,public_name:identities.get(row.member_id)??null})) };
}

export async function getSeasonMatchups(year:number) {
  const supabase=createServerSupabaseClient();
  const {data:season,error:seasonError}=await supabase.from("seasons").select("id,year,status").eq("year",year).maybeSingle();
  if(seasonError) throw new Error(`Season query failed: ${seasonError.message}`);
  if(!season) return null;
  const [gamesResult,teamsResult,settingsResult,identities]=await Promise.all([
    supabase.from("matchups").select("id,matchup_period,home_team_id,away_team_id,home_score,away_score,winner_team_id,is_playoff,is_complete").eq("season_id",season.id).order("matchup_period"),
    supabase.from("analytics_season_standings").select("season_team_id,member_id,team_name,playoff_seed").eq("year",year),
    supabase.from("scoring_settings").select("settings").eq("season_id",season.id).maybeSingle(),identityMap(supabase),
  ]);
  if(gamesResult.error) throw new Error(`Season matchups query failed: ${gamesResult.error.message}`);
  if(teamsResult.error) throw new Error(`Season teams query failed: ${teamsResult.error.message}`);
  if(settingsResult.error) throw new Error(`Season schedule query failed: ${settingsResult.error.message}`);
  const teams=new Map(teamsResult.data.map(row=>[row.season_team_id,row]));
  const settings=settingsResult.data?.settings as {scheduleSettings?:{matchupPeriods?:Record<string,number[]>}}|undefined;
  const games:SeasonMatchup[]=gamesResult.data.flatMap(game=>{
    const home=teams.get(game.home_team_id); const away=teams.get(game.away_team_id); if(!home||!away) return [];
    const scoringPeriods=(settings?.scheduleSettings?.matchupPeriods?.[String(game.matchup_period)]??[Number(game.matchup_period)]).map(Number);
    return [{id:game.id,matchupPeriod:Number(game.matchup_period),scoringPeriods,playoff:Boolean(game.is_playoff),complete:Boolean(game.is_complete),
      home:{id:home.season_team_id,seed:home.playoff_seed,teamName:home.team_name,ownerName:identities.get(home.member_id)??null,score:Number(game.home_score),winner:game.winner_team_id===game.home_team_id},
      away:{id:away.season_team_id,seed:away.playoff_seed,teamName:away.team_name,ownerName:identities.get(away.member_id)??null,score:Number(game.away_score),winner:game.winner_team_id===game.away_team_id}}];
  });
  return {year:Number(season.year),status:season.status,games};
}

export async function getManagerProfile(memberId:string) {
  const supabase=createServerSupabaseClient();
  const [careerResult,seasonsResult,championsResult,gamesResult,rivalries,identities]=await Promise.all([
    supabase.from("analytics_manager_careers").select("*").eq("member_id",memberId).maybeSingle(),
    supabase.from("analytics_season_standings").select("year,status,team_name,wins,losses,ties,points_for,points_against,final_standing,playoff_seed").eq("member_id",memberId).order("year",{ascending:false}),
    supabase.from("analytics_champions").select("year,team_name,runner_up_team_name,champion_score,runner_up_score").eq("member_id",memberId).order("year",{ascending:false}),
    supabase.from("analytics_game_performances").select("year,matchup_period,team_name,opponent_team_name,points,opponent_points,scoring_period_count").eq("member_id",memberId).eq("scoring_period_count",1).order("points",{ascending:false}),
    getRivalries(),identityMap(supabase),
  ]);
  if(careerResult.error) throw new Error(`Manager career query failed: ${careerResult.error.message}`);
  if(seasonsResult.error) throw new Error(`Manager seasons query failed: ${seasonsResult.error.message}`);
  if(championsResult.error) throw new Error(`Manager titles query failed: ${championsResult.error.message}`);
  if(gamesResult.error) throw new Error(`Manager games query failed: ${gamesResult.error.message}`);
  if(!careerResult.data) return null;
  const relevant=rivalries.filter(r=>r.memberAId===memberId||r.memberBId===memberId).map(r=>({
    opponentId:r.memberAId===memberId?r.memberBId:r.memberAId,
    opponentTeamName:r.memberAId===memberId?r.memberBTeamName:r.memberATeamName,
    opponentName:r.memberAId===memberId?r.memberBPublicName:r.memberAPublicName,
    games:r.games,wins:r.memberAId===memberId?r.memberAWins:r.memberBWins,losses:r.memberAId===memberId?r.memberBWins:r.memberAWins,ties:r.ties,
  })).sort((a,b)=>b.games-a.games);
  return {career:{...careerResult.data,public_name:identities.get(memberId)??null},seasons:seasonsResult.data,championships:championsResult.data,rivalries:relevant,bestGame:gamesResult.data[0]??null,worstGame:[...gamesResult.data].sort((a,b)=>Number(a.points)-Number(b.points))[0]??null};
}

export async function getRivalries(): Promise<Rivalry[]> {
  const supabase=createServerSupabaseClient(); const [{data,error},identities]=await Promise.all([supabase.from("analytics_head_to_head").select("member_a_id,member_b_id,member_a_team_name,member_b_team_name,games,member_a_wins,member_b_wins,ties,member_a_points,member_b_points").order("games", { ascending:false }),identityMap(supabase)]);
  if (error) throw new Error(`Rivalries query failed: ${error.message}`);
  return data.map(row=>({memberAId:row.member_a_id,memberBId:row.member_b_id,memberATeamName:row.member_a_team_name,memberBTeamName:row.member_b_team_name,memberAPublicName:identities.get(row.member_a_id)??null,memberBPublicName:identities.get(row.member_b_id)??null,games:Number(row.games),memberAWins:Number(row.member_a_wins),memberBWins:Number(row.member_b_wins),ties:Number(row.ties),memberAPoints:Number(row.member_a_points),memberBPoints:Number(row.member_b_points)}));
}

export async function getDraftHistory() {
  const supabase=createServerSupabaseClient(); const [{data,error},identities]=await Promise.all([paginatedRows((from,to)=>supabase.from("analytics_draft_picks").select("year,draft_type,member_id,team_name,overall_pick_number,round_number,round_pick_number,bid_amount,is_keeper,player_name,default_position,pro_team").order("year",{ascending:false}).order("overall_pick_number").range(from,to)),identityMap(supabase)]);
  if (error) throw new Error(`Draft history query failed: ${error.message}`);
  return data.map(row=>({...row,public_name:identities.get(row.member_id)??null}));
}

export async function getTransactionHistory() {
  const supabase=createServerSupabaseClient();
  const [transactionsResult,itemsResult,teamsResult,totalsResult,identities]=await Promise.all([
    paginatedRows((from,to)=>supabase.from("transactions").select("id,season_id,transaction_type,status,processed_at").order("processed_at",{ascending:false}).order("id").range(from,to)),
    paginatedRows((from,to)=>supabase.from("transaction_items").select("id,transaction_id,player_id,from_team_id,to_team_id,item_type,bid_amount").order("id").range(from,to)),
    supabase.from("analytics_season_standings").select("season_id,season_team_id,member_id,team_name,year"),
    supabase.from("analytics_transaction_totals").select("year,season_team_id,member_id,team_name,transactions").order("year",{ascending:false}).order("transactions",{ascending:false}),identityMap(supabase),
  ]);
  if(transactionsResult.error) throw new Error(`Transactions query failed: ${transactionsResult.error.message}`);
  if(itemsResult.error) throw new Error(`Transaction items query failed: ${itemsResult.error.message}`);
  if(teamsResult.error) throw new Error(`Transaction teams query failed: ${teamsResult.error.message}`);
  if(totalsResult.error) throw new Error(`Transaction totals query failed: ${totalsResult.error.message}`);
  const playerIds=[...new Set(itemsResult.data.map(item=>item.player_id))];
  const playersResult=playerIds.length?await supabase.from("players").select("id,full_name,default_position,pro_team").in("id",playerIds):{data:[],error:null};
  if(playersResult.error) throw new Error(`Transaction players query failed: ${playersResult.error.message}`);
  const teams=new Map(teamsResult.data.map(row=>[row.season_team_id,row])); const players=new Map(playersResult.data.map(row=>[row.id,row]));
  const seasonYears=new Map(teamsResult.data.map(row=>[row.season_id,Number(row.year)]));
  const events=transactionsResult.data.map(transaction=>({id:transaction.id,year:seasonYears.get(transaction.season_id)??0,type:transaction.transaction_type,status:transaction.status,processedAt:transaction.processed_at,
    items:itemsResult.data.filter(item=>item.transaction_id===transaction.id).map(item=>{const player=players.get(item.player_id); const from=teams.get(item.from_team_id); const to=teams.get(item.to_team_id); return {id:item.id,itemType:item.item_type,bidAmount:item.bid_amount===null?null:Number(item.bid_amount),playerName:player?.full_name??"Player unavailable",position:player?.default_position??null,proTeam:player?.pro_team??null,fromTeam:from?.team_name??null,toTeam:to?.team_name??null,managerName:identities.get((to??from)?.member_id)??null};}),
  }));
  return {coverage:[...new Set(teamsResult.data.map(row=>Number(row.year)))].sort((a,b)=>b-a).map(year=>({year,events:events.filter(e=>e.year===year).length})),events,totals:totalsResult.data.map(row=>({...row,public_name:identities.get(row.member_id)??null})),years:[...new Set(events.map(event=>event.year))].filter(Boolean).sort((a,b)=>b-a)};
}

export async function getLeagueRecords() {
  const supabase=createServerSupabaseClient();
  const [recordsResult,gamesResult,standingsResult,settingsResult,identities] = await Promise.all([
    supabase.from("analytics_league_records").select("record_type,record_rank,year,matchup_period,member_id,team_name,opponent_team_name,record_value").lte("record_rank", 10).order("record_type").order("record_rank"),
    supabase.from("matchups").select("id,season_id,matchup_period,home_team_id,away_team_id,home_score,away_score,winner_team_id,is_playoff,is_complete").eq("is_complete",true),
    supabase.from("analytics_season_standings").select("season_id,season_team_id,year,member_id,team_name,wins,losses,ties,points_for,points_against"),
    supabase.from("scoring_settings").select("season_id,settings"),identityMap(supabase),
  ]);
  const {data,error}=recordsResult;
  if (error) throw new Error(`League records query failed: ${error.message}`);
  if(gamesResult.error) throw new Error(`Record games query failed: ${gamesResult.error.message}`);
  if(standingsResult.error) throw new Error(`Record standings query failed: ${standingsResult.error.message}`);
  if(settingsResult.error) throw new Error(`Record settings query failed: ${settingsResult.error.message}`);
  const teams=new Map(standingsResult.data.map(row=>[row.season_team_id,row]));
  const singlePeriods=new Map(settingsResult.data.map(row=>{const settings=row.settings as {scheduleSettings?:{matchupPeriods?:Record<string,number[]>}}; return [row.season_id,settings.scheduleSettings?.matchupPeriods??{}] as const;}));
  const games=gamesResult.data.flatMap(game=>{
    const home=teams.get(game.home_team_id); const away=teams.get(game.away_team_id); if(!home||!away||game.home_score===null||game.away_score===null) return [];
    const periods=singlePeriods.get(game.season_id)?.[String(game.matchup_period)]??[Number(game.matchup_period)]; if(periods.length!==1) return [];
    return [{id:game.id,year:Number(home.year),matchupPeriod:Number(game.matchup_period),playoff:Boolean(game.is_playoff),margin:Math.abs(Number(game.home_score)-Number(game.away_score)),home:{teamName:home.team_name,publicName:identities.get(home.member_id)??null,score:Number(game.home_score),winner:game.winner_team_id===game.home_team_id},away:{teamName:away.team_name,publicName:identities.get(away.member_id)??null,score:Number(game.away_score),winner:game.winner_team_id===game.away_team_id}}];
  });
  const completedSeasons=standingsResult.data.filter(row=>Number(row.wins)+Number(row.losses)+Number(row.ties)>0);
  const winRate=(row:(typeof completedSeasons)[number])=>{const games=Number(row.wins)+Number(row.losses)+Number(row.ties); return games?(Number(row.wins)+Number(row.ties)*.5)/games:0;};
  const seasonRecords={
    mostPoints:[...completedSeasons].sort((a,b)=>Number(b.points_for)-Number(a.points_for)).slice(0,10),
    bestWinRate:[...completedSeasons].sort((a,b)=>winRate(b)-winRate(a)||Number(b.wins)-Number(a.wins)).slice(0,10),
    mostPointsAgainst:[...completedSeasons].sort((a,b)=>Number(b.points_against)-Number(a.points_against)).slice(0,10),
  };
  return {weekly:data.map(row=>({...row,public_name:identities.get(row.member_id)??null})),closest:[...games].filter(g=>g.margin>0).sort((a,b)=>a.margin-b.margin).slice(0,10),blowouts:[...games].sort((a,b)=>b.margin-a.margin).slice(0,10),seasonRecords};
}

export async function getPlayoffArchive(): Promise<PlayoffSeason[]> {
  const supabase=createServerSupabaseClient();
  const [configResult,gamesResult,standingsResult,settingsResult,identities]=await Promise.all([
    supabase.from("analytics_season_config").select("season_id,year,status,playoff_team_count").order("year",{ascending:false}),
    supabase.from("analytics_playoff_games").select("year,matchup_id,matchup_period,playoff_round,playoff_round_count,home_team_id,away_team_id,home_score,away_score,winner_team_id").order("year",{ascending:false}).order("playoff_round"),
    supabase.from("analytics_season_standings").select("season_team_id,member_id,team_name,playoff_seed"),
    supabase.from("scoring_settings").select("season_id,settings"),
    identityMap(supabase),
  ]);
  if(configResult.error) throw new Error(`Playoff configuration query failed: ${configResult.error.message}`);
  if(gamesResult.error) throw new Error(`Playoff games query failed: ${gamesResult.error.message}`);
  if(standingsResult.error) throw new Error(`Playoff teams query failed: ${standingsResult.error.message}`);
  if(settingsResult.error) throw new Error(`Playoff schedule query failed: ${settingsResult.error.message}`);

  const teams=new Map(standingsResult.data.map(row=>[row.season_team_id,row]));
  const periodMaps=new Map(settingsResult.data.map(row=>{
    const settings=row.settings as {scheduleSettings?:{matchupPeriods?:Record<string,number[]>}};
    return [row.season_id,settings.scheduleSettings?.matchupPeriods??{}] as const;
  }));

  return configResult.data.map(season=>({
    year:Number(season.year), status:season.status, playoffTeamCount:Number(season.playoff_team_count),
    games:gamesResult.data.filter(game=>game.year===season.year).map(game=>{
      const home=teams.get(game.home_team_id); const away=teams.get(game.away_team_id);
      if(!home||!away) throw new Error(`Playoff game ${game.matchup_id} is missing a team`);
      const periods=periodMaps.get(season.season_id)?.[String(game.matchup_period)]??[Number(game.matchup_period)];
      return {id:game.matchup_id,round:Number(game.playoff_round),roundCount:Number(game.playoff_round_count),matchupPeriod:Number(game.matchup_period),scoringPeriods:periods.map(Number),
        home:{id:home.season_team_id,seed:home.playoff_seed,teamName:home.team_name,ownerName:identities.get(home.member_id)??null,score:Number(game.home_score),winner:game.winner_team_id===game.home_team_id},
        away:{id:away.season_team_id,seed:away.playoff_seed,teamName:away.team_name,ownerName:identities.get(away.member_id)??null,score:Number(game.away_score),winner:game.winner_team_id===game.away_team_id}};
    }),
  }));
}

export async function getMatchupDetail(matchupId:string): Promise<PlayoffMatchupDetail|null> {
  const supabase=createServerSupabaseClient();
  const {data:rawGame,error:gameError}=await supabase.from("matchups").select("id,season_id,matchup_period,home_team_id,away_team_id,home_score,away_score,winner_team_id,is_playoff").eq("id",matchupId).maybeSingle();
  if(gameError) throw new Error(`Matchup query failed: ${gameError.message}`);
  if(!rawGame) return null;
  const {data:season,error:seasonError}=await supabase.from("seasons").select("year").eq("id",rawGame.season_id).maybeSingle();
  if(seasonError) throw new Error(`Matchup season query failed: ${seasonError.message}`);
  const playoff=rawGame.is_playoff?await supabase.from("analytics_playoff_games").select("playoff_round,playoff_round_count").eq("matchup_id",matchupId).maybeSingle():null;
  if(playoff?.error) throw new Error(`Playoff round query failed: ${playoff.error.message}`);
  const game={...rawGame,matchup_id:rawGame.id,year:Number(season?.year),playoff_round:Number(playoff?.data?.playoff_round??0),playoff_round_count:Number(playoff?.data?.playoff_round_count??0)};

  const [standingsResult,settingsResult,identities]=await Promise.all([
    supabase.from("analytics_season_standings").select("season_team_id,member_id,team_name,playoff_seed").in("season_team_id",[game.home_team_id,game.away_team_id]),
    supabase.from("scoring_settings").select("settings").eq("season_id",game.season_id).maybeSingle(),
    identityMap(supabase),
  ]);
  if(standingsResult.error) throw new Error(`Playoff matchup teams query failed: ${standingsResult.error.message}`);
  if(settingsResult.error) throw new Error(`Playoff matchup schedule query failed: ${settingsResult.error.message}`);
  const homeRow=standingsResult.data.find(row=>row.season_team_id===game.home_team_id);
  const awayRow=standingsResult.data.find(row=>row.season_team_id===game.away_team_id);
  if(!homeRow||!awayRow) return null;

  const settings=settingsResult.data?.settings as {scheduleSettings?:{matchupPeriods?:Record<string,number[]>}}|undefined;
  const scoringPeriods=(settings?.scheduleSettings?.matchupPeriods?.[String(game.matchup_period)]??[Number(game.matchup_period)]).map(Number);
  const {data:rosters,error:rosterError}=await supabase.from("roster_snapshots").select("player_id,season_team_id,matchup_period,lineup_slot,points,projected_points").in("matchup_period",scoringPeriods).in("season_team_id",[game.home_team_id,game.away_team_id]);
  if(rosterError) throw new Error(`Playoff lineup query failed: ${rosterError.message}`);
  const playerIds=[...new Set(rosters.map(row=>row.player_id))];
  const playersResult=playerIds.length?await supabase.from("players").select("id,full_name,default_position,pro_team").in("id",playerIds):{data:[],error:null};
  if(playersResult.error) throw new Error(`Playoff players query failed: ${playersResult.error.message}`);
  const players=new Map(playersResult.data.map(player=>[player.id,player]));
  const slotOrder=new Map(["QB","RB","WR","TE","RB/WR","RB/WR/TE","OP","D/ST","K","BE","IR"].map((slot,index)=>[slot,index]));
  const buildPlayers=(week:number,teamId:string):PlayoffPlayer[]=>rosters.filter(row=>row.matchup_period===week&&row.season_team_id===teamId).map(row=>{
    const player=players.get(row.player_id); const slot=row.lineup_slot; return {id:row.player_id,name:player?.full_name??"Player unavailable",position:player?.default_position??null,proTeam:player?.pro_team??null,slot,points:Number(row.points),projectedPoints:row.projected_points===null?null:Number(row.projected_points),reserve:slot==="BE"||slot==="IR"};
  }).sort((a,b)=>(slotOrder.get(a.slot??"")??99)-(slotOrder.get(b.slot??"")??99));
  const weeks=scoringPeriods.map(week=>{
    const homePlayers=buildPlayers(week,game.home_team_id); const awayPlayers=buildPlayers(week,game.away_team_id);
    return {week,homePlayers,awayPlayers,homePoints:homePlayers.filter(player=>!player.reserve).reduce((sum,player)=>sum+player.points,0),awayPoints:awayPlayers.filter(player=>!player.reserve).reduce((sum,player)=>sum+player.points,0)};
  });
  const home:PlayoffTeam={id:homeRow.season_team_id,seed:homeRow.playoff_seed,teamName:homeRow.team_name,ownerName:identities.get(homeRow.member_id)??null,score:Number(game.home_score),winner:game.winner_team_id===game.home_team_id};
  const away:PlayoffTeam={id:awayRow.season_team_id,seed:awayRow.playoff_seed,teamName:awayRow.team_name,ownerName:identities.get(awayRow.member_id)??null,score:Number(game.away_score),winner:game.winner_team_id===game.away_team_id};
  return {id:game.matchup_id,year:Number(game.year),round:Number(game.playoff_round),roundCount:Number(game.playoff_round_count),matchupPeriod:Number(game.matchup_period),scoringPeriods,home,away,weeks,lineupAvailable:rosters.length>0};
}

export const getPlayoffMatchup=getMatchupDetail;
