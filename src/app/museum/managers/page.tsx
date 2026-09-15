import { ExhibitHeader } from "@/components/exhibit-header";
import { getManagerRankings } from "@/lib/data/museum";

export default async function ManagersPage() {
  const managers = await getManagerRankings();
  return <main className="exhibit-page"><ExhibitHeader eyebrow="The eternal table" title="Manager rankings" description="Career resumes ranked by championships, then regular-season win percentage. Every column is sortable in spirit; the numbers remain undefeated." />
    <div className="data-table-wrap"><table className="data-table"><thead><tr><th>Rank</th><th>Current team</th><th>Titles</th><th>Seasons</th><th>Record</th><th>Win %</th><th>Playoffs</th><th>Playoff record</th><th>Playoff %</th><th>Points</th></tr></thead><tbody>{managers.map((m,index)=><tr key={m.current_team_name}><td className="rank-cell">{index+1}</td><td><strong>{m.current_team_name}</strong></td><td className="gold-cell">{m.championships}</td><td>{m.seasons_completed}</td><td>{m.regular_season_wins}-{m.regular_season_losses}{m.regular_season_ties ? `-${m.regular_season_ties}`:""}</td><td>{m.regular_season_win_percentage === null ? "—" : `${(Number(m.regular_season_win_percentage)*100).toFixed(1)}%`}</td><td>{m.playoff_appearances}</td><td>{m.playoff_wins}-{m.playoff_losses}</td><td>{m.playoff_win_percentage === null ? "—" : `${(Number(m.playoff_win_percentage)*100).toFixed(1)}%`}</td><td>{Number(m.regular_season_points_for).toLocaleString(undefined,{maximumFractionDigits:1})}</td></tr>)}</tbody></table></div>
  </main>;
}
