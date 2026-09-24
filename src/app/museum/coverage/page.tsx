import {ExhibitHeader} from "@/components/exhibit-header";
import {getArchiveStatus} from "@/lib/data/archive-status";

export default async function CoveragePage(){
  let rows:Awaited<ReturnType<typeof getArchiveStatus>>=[];
  let unavailable=false;
  try{rows=await getArchiveStatus();}catch{unavailable=true;}
  return <main className="exhibit-page"><ExhibitHeader eyebrow="Behind the records" title="Archive coverage" description="Check when each season was last imported successfully and understand the limits of the preserved data."/>
    <p>Imports are scheduled daily. These timestamps record successful imports, not the time of the latest ESPN scoring update. A successful import does not guarantee complete historical data.</p>
    {unavailable?<p>Refresh status is temporarily unavailable. No freshness claim can be made right now.</p>:<div className="historian-table-wrap"><table className="historian-table"><caption>Live import status · times in UTC</caption><thead><tr><th>Season</th><th>Status</th><th>Completed matchups stored</th><th>Last successful import</th></tr></thead><tbody>{rows.map(row=><tr key={row.year}><th>{row.year}</th><td>{row.status}</td><td>{row.completedMatchups??"Unknown"}</td><td>{row.lastSuccess?new Date(row.lastSuccess).toISOString().replace("T"," ").slice(0,19)+" UTC":"Unknown"}</td></tr>)}</tbody></table></div>}
    <h2>What the archive can support</h2><ul><li>Official matchup scores and standings support records, rivalries, and playoff results. Stored matchup counts include all completed matchup types; they are not a completeness percentage.</li><li>Historical lineups are missing for 2017–2018. From 2019 onward, position queries check starter totals against official scores before answering.</li><li>The historical lineup audit found four score discrepancies: 2019 week 11, 2021 week 2, 2022 week 17, and 2024 week 3. In all four, starter points match ESPN’s weekly totals, but ESPN’s official matchup totals are higher. All four were confirmed as commissioner adjustments using ESPN screenshots. Position queries reconcile starters plus the confirmed adjustment against official totals; adjustment points are excluded from player and position totals. Any remaining discrepancy still blocks the query.</li><li>Draft picks describe the draft, not a verified opening-week roster. Historical auction prices and transaction feeds may be unavailable. Missing transactions do not mean zero trades.</li><li>Overall manager rankings require three completed seasons in the requested range. Current-season results do not contribute to that score.</li></ul>
    <p>For a questionable answer, open “Flag an answer for review” beneath the Historian response and send the details privately to the commissioner.</p>
  </main>;
}
