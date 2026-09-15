import "server-only";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export type Champion = { year: number; teamName: string; ownerName: string | null; runnerUpTeamName: string; championScore: number; runnerUpScore: number };
export type ManagerCareer = { teamName: string; ownerName: string | null; championships: number; winPercentage: number | null; playoffAppearances: number };
export type PlayoffTeam = { id: string; seed: number | null; teamName: string; ownerName: string | null; score: number; winner: boolean };
export type PlayoffGame = { id: string; round: number; roundCount: number; matchupPeriod: number; scoringPeriods: number[]; home: PlayoffTeam; away: PlayoffTeam };
export type PlayoffSeason = { year: number; status: string; playoffTeamCount: number; games: PlayoffGame[] };
export type PlayoffPlayer = { id: string; name: string; position: string | null; proTeam: string | null; slot: string | null; points: number; projectedPoints: number | null; reserve: boolean };
export type PlayoffWeek = { week: number; homePlayers: PlayoffPlayer[]; awayPlayers: PlayoffPlayer[]; homePoints: number; awayPoints: number };
export type PlayoffMatchupDetail = PlayoffGame & { year: number; home: PlayoffTeam; away: PlayoffTeam; weeks: PlayoffWeek[]; lineupAvailable: boolean };
export type Rivalry = { memberAId: string; memberBId: string; memberATeamName: string; memberBTeamName: string; memberAPublicName: string | null; memberBPublicName: string | null; games: number; memberAWins: number; memberBWins: number; ties: number; memberAPoints: number; memberBPoints: number };

async function identityMap(supabase: ReturnType<typeof createServerSupabaseClient>) {
  const { data, error } = await supabase.from("analytics_member_identities").select("member_id,public_name");
  if (error) throw new Error(`Identity query failed: ${error.message}`);
  return new Map(data.map((row) => [row.member_id, row.public_name]));
}

export async function getMuseumOverview() {
  const supabase = createServerSupabaseClient();
  const [championsResult, managersResult, identities] = await Promise.all([
    supabase.from("analytics_champions").select("year,member_id,team_name,runner_up_team_name,champion_score,runner_up_score").order("year", { ascending: false }),
    supabase.from("analytics_manager_careers").select("member_id,current_team_name,championships,regular_season_win_percentage,playoff_appearances").order("championships", { ascending: false }).order("regular_season_win_percentage", { ascending: false }).limit(5),
    identityMap(supabase),
  ]);
  if (championsResult.error) throw new Error(`Champions query failed: ${championsResult.error.message}`);
  if (managersResult.error) throw new Error(`Manager query failed: ${managersResult.error.message}`);

  const champions: Champion[] = championsResult.data.map((row) => ({ year: row.year, teamName: row.team_name, ownerName: identities.get(row.member_id) ?? null, runnerUpTeamName: row.runner_up_team_name, championScore: Number(row.champion_score), runnerUpScore: Number(row.runner_up_score) }));
  const managers: ManagerCareer[] = managersResult.data.map((row) => ({ teamName: row.current_team_name, ownerName: identities.get(row.member_id) ?? null, championships: Number(row.championships), winPercentage: row.regular_season_win_percentage === null ? null : Number(row.regular_season_win_percentage), playoffAppearances: Number(row.playoff_appearances) }));
  return { champions, managers };
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

export async function getRivalries(): Promise<Rivalry[]> {
  const supabase=createServerSupabaseClient(); const [{data,error},identities]=await Promise.all([supabase.from("analytics_head_to_head").select("member_a_id,member_b_id,member_a_team_name,member_b_team_name,games,member_a_wins,member_b_wins,ties,member_a_points,member_b_points").order("games", { ascending:false }),identityMap(supabase)]);
  if (error) throw new Error(`Rivalries query failed: ${error.message}`);
  return data.map(row=>({memberAId:row.member_a_id,memberBId:row.member_b_id,memberATeamName:row.member_a_team_name,memberBTeamName:row.member_b_team_name,memberAPublicName:identities.get(row.member_a_id)??null,memberBPublicName:identities.get(row.member_b_id)??null,games:Number(row.games),memberAWins:Number(row.member_a_wins),memberBWins:Number(row.member_b_wins),ties:Number(row.ties),memberAPoints:Number(row.member_a_points),memberBPoints:Number(row.member_b_points)}));
}

export async function getDraftHistory() {
  const supabase=createServerSupabaseClient(); const [{data,error},identities]=await Promise.all([supabase.from("analytics_draft_picks").select("year,draft_type,member_id,team_name,overall_pick_number,round_number,round_pick_number,bid_amount,is_keeper,player_name,default_position,pro_team").order("year",{ascending:false}).order("overall_pick_number"),identityMap(supabase)]);
  if (error) throw new Error(`Draft history query failed: ${error.message}`);
  return data.map(row=>({...row,public_name:identities.get(row.member_id)??null}));
}

export async function getLeagueRecords() {
  const supabase=createServerSupabaseClient();
  const [{ data, error }, identities] = await Promise.all([supabase.from("analytics_league_records").select("record_type,record_rank,year,matchup_period,member_id,team_name,opponent_team_name,record_value").lte("record_rank", 10).order("record_type").order("record_rank"),identityMap(supabase)]);
  if (error) throw new Error(`League records query failed: ${error.message}`);
  return data.map(row=>({...row,public_name:identities.get(row.member_id)??null}));
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

export async function getPlayoffMatchup(matchupId:string): Promise<PlayoffMatchupDetail|null> {
  const supabase=createServerSupabaseClient();
  const {data:game,error:gameError}=await supabase.from("analytics_playoff_games").select("season_id,year,matchup_id,matchup_period,playoff_round,playoff_round_count,home_team_id,away_team_id,home_score,away_score,winner_team_id").eq("matchup_id",matchupId).maybeSingle();
  if(gameError) throw new Error(`Playoff matchup query failed: ${gameError.message}`);
  if(!game) return null;

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
