import { ExhibitHeader } from "@/components/exhibit-header";
import { getDraftHistory } from "@/lib/data/museum";

export default async function DraftsPage() {
  const drafts=await getDraftHistory(); const years=[...new Set(drafts.map(r=>r.year))];
  return <main className="exhibit-page"><ExhibitHeader eyebrow="The draft vault" title="Draft history" description="The actual players selected by every team before the season began. Snake years show round and pick order; offline drafts preserve the recorded selection sequence." />
    <div className="season-stack">{years.map((year,index)=>{const yearPicks=drafts.filter(r=>r.year===year); const teams=[...new Set(yearPicks.map(r=>r.team_name))]; const draftType=yearPicks[0]?.draft_type; return <details className="season-card" key={year} open={index===0}><summary><span><strong>{year}</strong><small>{draftType} draft</small></span><span>{yearPicks.length} selections · {teams.length} teams</span><i>+</i></summary><div className="season-body"><div className="draft-team-grid">{teams.map(team=>{const picks=yearPicks.filter(r=>r.team_name===team); return <article className="draft-team" key={team}><header><div><h3>{team}</h3><small className="owner-label">{picks[0]?.public_name}</small></div><span>{picks.length} picks</span></header><ol>{picks.map(pick=><li key={pick.overall_pick_number}><span>{pick.overall_pick_number}</span><div><strong>{pick.player_name?.startsWith("ESPN Player ")?"Player unavailable":pick.player_name}</strong><small>{pick.default_position||"—"}{pick.pro_team?` · ${pick.pro_team}`:""}</small></div><b>R{pick.round_number} · P{pick.round_pick_number}{Number(pick.bid_amount)>0?` · $${Number(pick.bid_amount).toFixed(0)}`:""}</b></li>)}</ol></article>})}</div></div></details>})}</div>
  </main>;
}
