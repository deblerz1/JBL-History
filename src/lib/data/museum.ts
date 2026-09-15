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
