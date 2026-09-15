import Link from "next/link";
import { ExhibitHeader } from "@/components/exhibit-header";
import { getSeasonArchive } from "@/lib/data/museum";

export default async function SeasonsPage() {
  const { standings, champions } = await getSeasonArchive();
  const years = [...new Set(standings.map(row=>row.year))];
  return <main className="exhibit-page"><ExhibitHeader eyebrow="Annual galleries" title="Season archive" description="Open any year for its final table, scoring totals, playoff seed, and champion. Team names are preserved exactly as they appeared that season." />
    <div className="season-stack">{years.map((year,index)=>{const rows=standings.filter(row=>row.year===year); const champ=champions.find(row=>row.year===year); return <details className="season-card" key={year} open={index===0}><summary><span><strong>{year}</strong><small>{rows[0]?.status}</small></span><span>{champ ? `${champ.team_name} · Champion` : "Season in progress"}</span><i>+</i></summary><div className="season-body"><Link className="season-games-link" href={`/museum/seasons/${year}`}>Browse all weekly matchups →</Link>{champ&&<div className="season-champion"><span>Champion</span><strong>{champ.team_name}</strong><small>{champ.public_name} · {Number(champ.champion_score).toFixed(2)}–{Number(champ.runner_up_score).toFixed(2)} over {champ.runner_up_team_name}</small></div>}<div className="data-table-wrap"><table className="data-table"><thead><tr><th>Finish</th><th>Team</th><th>W</th><th>L</th><th>T</th><th>PF</th><th>PA</th><th>Seed</th></tr></thead><tbody>{rows.map(row=><tr key={row.team_name}><td>{row.final_standing??"—"}</td><td><strong>{row.team_name}</strong><small className="table-owner">{row.public_name}</small></td><td>{row.wins}</td><td>{row.losses}</td><td>{row.ties}</td><td>{Number(row.points_for).toFixed(1)}</td><td>{Number(row.points_against).toFixed(1)}</td><td>{row.playoff_seed??"—"}</td></tr>)}</tbody></table></div></div></details>})}</div>
  </main>;
}
