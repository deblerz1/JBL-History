import "server-only";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export type Champion = { year: number; teamName: string; runnerUpTeamName: string; championScore: number; runnerUpScore: number };
export type ManagerCareer = { teamName: string; championships: number; winPercentage: number | null; playoffAppearances: number };

export async function getMuseumOverview() {
  const supabase = createServerSupabaseClient();
  const [championsResult, managersResult] = await Promise.all([
    supabase.from("analytics_champions").select("year,team_name,runner_up_team_name,champion_score,runner_up_score").order("year", { ascending: false }),
    supabase.from("analytics_manager_careers").select("current_team_name,championships,regular_season_win_percentage,playoff_appearances").order("championships", { ascending: false }).order("regular_season_win_percentage", { ascending: false }).limit(5),
  ]);
  if (championsResult.error) throw new Error(`Champions query failed: ${championsResult.error.message}`);
  if (managersResult.error) throw new Error(`Manager query failed: ${managersResult.error.message}`);

  const champions: Champion[] = championsResult.data.map((row) => ({ year: row.year, teamName: row.team_name, runnerUpTeamName: row.runner_up_team_name, championScore: Number(row.champion_score), runnerUpScore: Number(row.runner_up_score) }));
  const managers: ManagerCareer[] = managersResult.data.map((row) => ({ teamName: row.current_team_name, championships: Number(row.championships), winPercentage: row.regular_season_win_percentage === null ? null : Number(row.regular_season_win_percentage), playoffAppearances: Number(row.playoff_appearances) }));
  return { champions, managers };
}

export async function getManagerRankings() {
  const { data, error } = await createServerSupabaseClient().from("analytics_manager_careers").select("current_team_name,championships,seasons_completed,playoff_appearances,playoff_wins,playoff_losses,playoff_win_percentage,regular_season_wins,regular_season_losses,regular_season_ties,regular_season_win_percentage,regular_season_points_for").order("championships", { ascending:false }).order("regular_season_win_percentage", { ascending:false });
  if (error) throw new Error(`Manager rankings query failed: ${error.message}`);
  return data;
}

export async function getSeasonArchive() {
  const supabase = createServerSupabaseClient();
  const [standings, champions] = await Promise.all([
    supabase.from("analytics_season_standings").select("year,status,team_name,wins,losses,ties,points_for,points_against,final_standing,playoff_seed").order("year", { ascending:false }).order("final_standing", { ascending:true }),
    supabase.from("analytics_champions").select("year,team_name,runner_up_team_name,champion_score,runner_up_score").order("year", { ascending:false }),
  ]);
  if (standings.error) throw new Error(`Season archive query failed: ${standings.error.message}`);
  if (champions.error) throw new Error(`Champions query failed: ${champions.error.message}`);
  return { standings: standings.data, champions: champions.data };
}

export async function getRivalries() {
  const { data, error } = await createServerSupabaseClient().from("analytics_head_to_head").select("member_a_team_name,member_b_team_name,games,member_a_wins,member_b_wins,ties,member_a_points,member_b_points").order("games", { ascending:false });
  if (error) throw new Error(`Rivalries query failed: ${error.message}`);
  return data;
}

export async function getDraftHistory() {
  const { data, error } = await createServerSupabaseClient().from("analytics_draft_summary").select("year,team_name,picks,total_spend,average_bid,highest_bid,one_dollar_picks,keeper_picks").order("year", { ascending:false }).order("total_spend", { ascending:false });
  if (error) throw new Error(`Draft history query failed: ${error.message}`);
  return data;
}

export async function getLeagueRecords() {
  const { data, error } = await createServerSupabaseClient().from("analytics_league_records").select("record_type,record_rank,year,matchup_period,team_name,opponent_team_name,record_value").lte("record_rank", 10).order("record_type").order("record_rank");
  if (error) throw new Error(`League records query failed: ${error.message}`);
  return data;
}
