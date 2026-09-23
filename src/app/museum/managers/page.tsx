import Link from "next/link";
import { ExhibitHeader } from "@/components/exhibit-header";
import { ManagerScoreExhibit } from "@/components/manager-score-exhibit";
import { getManagerRankings,getHistorianCorpus } from "@/lib/data/museum";

export default async function ManagersPage() {
  const [managers,corpus]=await Promise.all([getManagerRankings(),getHistorianCorpus()]);
  return <main className="exhibit-page"><ExhibitHeader eyebrow="The eternal table" title="Manager rankings" description="Career resumes ranked by championships, then regular-season win percentage. Open any manager for the complete career exhibit." />
    <div className="data-table-wrap"><table className="data-table"><thead><tr><th>Rank</th><th>Current team</th><th>Titles</th><th>Seasons</th><th>Record</th><th>Win %</th><th>Playoffs</th><th>Playoff record</th><th>Playoff %</th><th>Points</th></tr></thead><tbody>{managers.map((m,index)=><tr key={m.member_id}><td className="rank-cell">{index+1}</td><td><Link className="table-link" href={`/museum/managers/${m.member_id}`}><strong>{m.current_team_name}</strong><small className="table-owner">{m.public_name} · View career →</small></Link></td><td className="gold-cell">{m.championships}</td><td>{m.seasons_completed}</td><td>{m.regular_season_wins}-{m.regular_season_losses}{m.regular_season_ties?`-${m.regular_season_ties}`:""}</td><td>{m.regular_season_win_percentage===null?"—":`${(Number(m.regular_season_win_percentage)*100).toFixed(1)}%`}</td><td>{m.playoff_appearances}</td><td>{m.playoff_wins}-{m.playoff_losses}</td><td>{m.playoff_win_percentage===null?"—":`${(Number(m.playoff_win_percentage)*100).toFixed(1)}%`}</td><td>{Number(m.regular_season_points_for).toLocaleString(undefined,{maximumFractionDigits:1})}</td></tr>)}</tbody></table></div>
    <ManagerScoreExhibit corpus={corpus} />
  </main>;
}
