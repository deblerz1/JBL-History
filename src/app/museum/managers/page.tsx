import Link from "next/link";
import { ExhibitHeader } from "@/components/exhibit-header";
import { ManagerScoreExhibit } from "@/components/manager-score-exhibit";
import { getManagerRankings,getHistorianCorpus } from "@/lib/data/museum";

export default async function ManagersPage() {
  const [managers,corpus]=await Promise.all([getManagerRankings(),getHistorianCorpus()]);
  return <main className="exhibit-page"><ExhibitHeader eyebrow="The eternal table" title="Manager rankings" description="The published overall score orders qualified managers from best to worst. The historian uses this same ranking. Shorter careers appear as provisional." />
    <ManagerScoreExhibit corpus={corpus} />
    <details style={{marginTop:"2rem"}}><summary>Career statistics — sorted by championships, not overall rank</summary>
    <div className="data-table-wrap"><table className="data-table"><thead><tr><th>Current team</th><th>Titles</th><th>Seasons</th><th>Record</th><th>Win %</th><th>Playoffs</th><th>Playoff record</th><th>Playoff %</th><th>Points</th></tr></thead><tbody>{managers.map(m=><tr key={m.member_id}><td><Link className="table-link" href={`/museum/managers/${m.member_id}`}><strong>{m.current_team_name}</strong><small className="table-owner">{m.public_name} · View career →</small></Link></td><td className="gold-cell">{m.championships}</td><td>{m.seasons_completed}</td><td>{m.regular_season_wins}-{m.regular_season_losses}{m.regular_season_ties?`-${m.regular_season_ties}`:""}</td><td>{m.regular_season_win_percentage===null?"—":`${(Number(m.regular_season_win_percentage)*100).toFixed(1)}%`}</td><td>{m.playoff_appearances}</td><td>{m.playoff_wins}-{m.playoff_losses}</td><td>{m.playoff_win_percentage===null?"—":`${(Number(m.playoff_win_percentage)*100).toFixed(1)}%`}</td><td>{Number(m.regular_season_points_for).toLocaleString(undefined,{maximumFractionDigits:1})}</td></tr>)}</tbody></table></div>
    </details>
  </main>;
}
