import { ExhibitHeader } from "@/components/exhibit-header";
import { getLeagueRecords } from "@/lib/data/museum";

export default async function RecordsPage() {
  const records=await getLeagueRecords(); const groups=[{key:"highest_score",title:"Highest weekly scores",note:"The ceiling"},{key:"lowest_score",title:"Lowest weekly scores",note:"The basement"}];
  return <main className="exhibit-page"><ExhibitHeader eyebrow="The book of records" title="Extremes & indignities" description="The performances that broke the scale in either direction. Scores reflect completed head-to-head matchups across the full archive." />
    <div className="record-columns">{groups.map(group=><section className="record-panel" key={group.key}><p className="eyebrow">{group.note}</p><h2>{group.title}</h2><ol>{records.filter(r=>r.record_type===group.key).map(r=><li key={`${r.record_rank}-${r.year}-${r.team_name}`}><span>{r.record_rank}</span><div><strong>{r.team_name}</strong><small>{r.year} · Week {r.matchup_period} · vs. {r.opponent_team_name}</small></div><b>{Number(r.record_value).toFixed(2)}</b></li>)}</ol></section>)}</div>
  </main>;
}
