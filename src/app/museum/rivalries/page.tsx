import { ExhibitHeader } from "@/components/exhibit-header";
import { getRivalries } from "@/lib/data/museum";

export default async function RivalriesPage() {
  const rivalries=await getRivalries();
  return <main className="exhibit-page"><ExhibitHeader eyebrow="The rivalry room" title="Head-to-head ledger" description="Every completed meeting, including the postseason. Sort the bragging rights by volume, wins, or sheer accumulated scoring damage." />
    <div className="rivalry-grid">{rivalries.map(r=>{const a=Number(r.member_a_wins),b=Number(r.member_b_wins); return <article className="rivalry-card" key={`${r.member_a_team_name}-${r.member_b_team_name}`}><span className="meeting-count">{r.games} meetings</span><div className={a>=b?"rival leader":"rival"}><strong>{r.member_a_team_name}</strong><small className="owner-label">{r.member_a_public_name}</small><b>{a}</b><small>{Number(r.member_a_points).toFixed(1)} pts</small></div><i>VS</i><div className={b>=a?"rival leader":"rival"}><strong>{r.member_b_team_name}</strong><small className="owner-label">{r.member_b_public_name}</small><b>{b}</b><small>{Number(r.member_b_points).toFixed(1)} pts</small></div>{Number(r.ties)>0&&<p>{r.ties} tie{Number(r.ties)>1?"s":""}</p>}</article>})}</div>
  </main>;
}
