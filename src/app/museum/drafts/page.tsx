import { ExhibitHeader } from "@/components/exhibit-header";
import { getDraftHistory } from "@/lib/data/museum";

export default async function DraftsPage() {
  const drafts=await getDraftHistory(); const years=[...new Set(drafts.map(r=>r.year))];
  return <main className="exhibit-page"><ExhibitHeader eyebrow="The draft vault" title="Auction history" description="A season-by-season accounting of roster construction: total spend, average bid, largest purchase, keepers, and one-dollar dart throws." />
    <div className="season-stack">{years.map((year,index)=><details className="season-card" key={year} open={index===0}><summary><span><strong>{year}</strong><small>Draft ledger</small></span><span>{drafts.filter(r=>r.year===year).length} teams</span><i>+</i></summary><div className="season-body"><div className="data-table-wrap"><table className="data-table"><thead><tr><th>Team</th><th>Picks</th><th>Total spend</th><th>Avg. bid</th><th>Highest bid</th><th>$1 picks</th><th>Keepers</th></tr></thead><tbody>{drafts.filter(r=>r.year===year).map(r=><tr key={r.team_name}><td><strong>{r.team_name}</strong></td><td>{r.picks}</td><td>{r.total_spend===null?"—":`$${Number(r.total_spend).toFixed(0)}`}</td><td>{r.average_bid===null?"—":`$${Number(r.average_bid).toFixed(2)}`}</td><td>{r.highest_bid===null?"—":`$${Number(r.highest_bid).toFixed(0)}`}</td><td>{r.one_dollar_picks}</td><td>{r.keeper_picks}</td></tr>)}</tbody></table></div></div></details>)}</div>
  </main>;
}
