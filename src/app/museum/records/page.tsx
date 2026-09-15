import Link from "next/link";
import { ExhibitHeader } from "@/components/exhibit-header";
import { getLeagueRecords } from "@/lib/data/museum";

export const dynamic="force-dynamic";
export default async function RecordsPage() {
  const {weekly,closest,blowouts,seasonRecords}=await getLeagueRecords();
  const weeklyGroups=[{key:"highest_score",title:"Highest weekly scores",note:"The ceiling"},{key:"lowest_score",title:"Lowest weekly scores",note:"The basement"}];
  const gameGroups=[{rows:closest,title:"Closest finishes",note:"Photo finishes"},{rows:blowouts,title:"Biggest blowouts",note:"Public humiliations"}];
  const seasonGroups=[
    {rows:seasonRecords.mostPoints,title:"Most points in a season",value:(r:(typeof seasonRecords.mostPoints)[number])=>Number(r.points_for).toFixed(1)},
    {rows:seasonRecords.bestWinRate,title:"Best regular seasons",value:(r:(typeof seasonRecords.bestWinRate)[number])=>{const games=Number(r.wins)+Number(r.losses)+Number(r.ties); return `${(((Number(r.wins)+Number(r.ties)*.5)/games)*100).toFixed(1)}%`; }},
    {rows:seasonRecords.mostPointsAgainst,title:"Most points endured",value:(r:(typeof seasonRecords.mostPointsAgainst)[number])=>Number(r.points_against).toFixed(1)},
  ];
  return <main className="exhibit-page"><ExhibitHeader eyebrow="The book of records" title="Extremes & indignities" description="JBL's greatest performances, narrowest escapes, most merciless beatdowns, and season-long monuments. Weekly records exclude multi-week aggregates." />
    <section className="records-wing"><header><p className="eyebrow">One-week wonders</p><h2>Weekly extremes</h2></header><div className="record-columns">{weeklyGroups.map(group=><section className="record-panel" key={group.key}><p className="eyebrow">{group.note}</p><h2>{group.title}</h2><ol>{weekly.filter(r=>r.record_type===group.key).map(r=><li key={`${r.record_rank}-${r.year}-${r.team_name}`}><span>{r.record_rank}</span><div><strong>{r.team_name}</strong><small className="record-owner">{r.public_name}</small><small>{r.year} · Week {r.matchup_period} · vs. {r.opponent_team_name}</small></div><b>{Number(r.record_value).toFixed(2)}</b></li>)}</ol></section>)}</div></section>
    <section className="records-wing"><header><p className="eyebrow">Head-to-head history</p><h2>Margins of victory</h2></header><div className="record-columns">{gameGroups.map(group=><section className="record-panel" key={group.title}><p className="eyebrow">{group.note}</p><h2>{group.title}</h2><ol>{group.rows.map((game,index)=><li className="record-game-row" key={game.id}><span>{index+1}</span><div><strong>{game.home.teamName} {game.home.score.toFixed(2)}–{game.away.score.toFixed(2)} {game.away.teamName}</strong><small>{game.year} · Week {game.matchupPeriod}{game.playoff?" · Playoffs":""}</small><Link href={`/museum/seasons/${game.year}/matchups/${game.id}`}>View matchup →</Link></div><b>{game.margin.toFixed(2)}</b></li>)}</ol></section>)}</div></section>
    <section className="records-wing"><header><p className="eyebrow">Full-season achievements</p><h2>Season monuments</h2></header><div className="season-record-grid">{seasonGroups.map(group=><section className="record-panel" key={group.title}><h2>{group.title}</h2><ol>{group.rows.map((row,index)=><li key={`${row.year}-${row.season_team_id}`}><span>{index+1}</span><div><strong>{row.team_name}</strong><small className="record-owner">{row.year}</small><small>{row.wins}-{row.losses}{row.ties?`-${row.ties}`:""}</small></div><b>{group.value(row)}</b></li>)}</ol></section>)}</div></section>
  </main>;
}
