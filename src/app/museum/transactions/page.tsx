import { ExhibitHeader } from "@/components/exhibit-header";
import { getTransactionHistory } from "@/lib/data/museum";

export const dynamic="force-dynamic";
function moveLabel(item:{fromTeam:string|null;toTeam:string|null}) { if(item.fromTeam&&item.toTeam) return `${item.fromTeam} → ${item.toTeam}`; if(item.toTeam) return `Added by ${item.toTeam}`; if(item.fromTeam) return `Dropped by ${item.fromTeam}`; return "League activity"; }
export default async function TransactionsPage() {
  const {events,totals,years}=await getTransactionHistory(); const firstYear=years.at(-1); const latestYear=years[0];
  return <main className="exhibit-page"><ExhibitHeader eyebrow="The front office ledger" title="Transactions" description="Waiver claims, free-agent moves, drops, and trades preserved by ESPN. Historical activity begins with the first season ESPN returned transaction-level data." />
    <div className="coverage-notice"><span>Archive coverage</span><strong>{firstYear?`${firstYear}${latestYear!==firstYear?`–${latestYear}`:"–present"}`:"No transaction data"}</strong><p>Older seasons are unavailable in the current ESPN activity feed; missing activity is not counted as zero.</p></div>
    <section className="transaction-leaders"><header><p className="eyebrow">Most active desks</p><h2>Moves by team</h2></header><div>{totals.map((row,index)=><article key={`${row.year}-${row.season_team_id}`}><span>{index+1}</span><div><strong>{row.team_name}</strong><small>{row.public_name} · {row.year}</small></div><b>{row.transactions}</b></article>)}</div></section>
    <section className="transaction-ledger"><header><p className="eyebrow">Latest activity</p><h2>Move-by-move ledger</h2></header>{events.map(event=><article key={event.id}><header><div><strong>{event.type.replaceAll("+"," + ")}</strong><small>{event.year} · {new Date(event.processedAt).toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"})}</small></div><span>{event.status}</span></header><div>{event.items.map(item=><div className="transaction-item" key={item.id}><span>{item.itemType}</span><div><strong>{item.playerName}</strong><small>{item.position??"—"}{item.proTeam?` · ${item.proTeam}`:""}</small></div><p>{moveLabel(item)}{item.managerName?` · ${item.managerName}`:""}</p>{item.bidAmount!==null&&<b>${item.bidAmount}</b>}</div>)}</div></article>)}</section>
  </main>;
}
