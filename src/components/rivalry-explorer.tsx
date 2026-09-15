"use client";

import { useMemo,useState } from "react";
import type { Rivalry } from "@/lib/data/museum";
import { rivalryDisparity,rivalryWinRate,sortRivalries,type RivalrySort } from "@/lib/rivalries";

function percent(value:number) { return `${(value*100).toFixed(1)}%`; }

export function RivalryExplorer({rivalries}:{rivalries:Rivalry[]}) {
  const [memberId,setMemberId]=useState("all"); const [sort,setSort]=useState<RivalrySort>("disparity");
  const teams=useMemo(()=>{
    const entries=new Map<string,{teamName:string;publicName:string|null}>();
    rivalries.forEach(rivalry=>{entries.set(rivalry.memberAId,{teamName:rivalry.memberATeamName,publicName:rivalry.memberAPublicName}); entries.set(rivalry.memberBId,{teamName:rivalry.memberBTeamName,publicName:rivalry.memberBPublicName});});
    return [...entries.entries()].sort((a,b)=>a[1].teamName.localeCompare(b[1].teamName));
  },[rivalries]);
  const visible=useMemo(()=>sortRivalries(rivalries.filter(rivalry=>memberId==="all"||rivalry.memberAId===memberId||rivalry.memberBId===memberId),sort),[memberId,rivalries,sort]);

  return <section><div className="rivalry-controls"><label><span>Filter by team</span><select onChange={event=>setMemberId(event.target.value)} value={memberId}><option value="all">All teams</option>{teams.map(([id,team])=><option key={id} value={id}>{team.teamName}{team.publicName?` — ${team.publicName}`:""}</option>)}</select></label><label><span>Sort rivalries</span><select onChange={event=>setSort(event.target.value as RivalrySort)} value={sort}><option value="disparity">Biggest disparity</option><option value="closest">Closest rivalry</option><option value="meetings">Most meetings</option></select></label><p>{visible.length} rivalr{visible.length===1?"y":"ies"}</p></div>
    <div className="rivalry-grid">{visible.map(rivalry=>{
      const aRate=rivalryWinRate(rivalry.memberAWins,rivalry.ties,rivalry.games); const bRate=rivalryWinRate(rivalry.memberBWins,rivalry.ties,rivalry.games); const disparity=rivalryDisparity(rivalry);
      return <article className="rivalry-card" key={`${rivalry.memberAId}-${rivalry.memberBId}`}><span className="meeting-count">{rivalry.games} meetings</span><span className="disparity-label">{percent(disparity)} gap</span><div className={aRate>=bRate?"rival leader":"rival"}><strong>{rivalry.memberATeamName}</strong><small className="owner-label">{rivalry.memberAPublicName}</small><b>{percent(aRate)}</b><small>{rivalry.memberAWins}–{rivalry.memberBWins}{rivalry.ties?`–${rivalry.ties}`:""} · {rivalry.memberAPoints.toFixed(1)} pts</small></div><i>VS</i><div className={bRate>=aRate?"rival leader":"rival"}><strong>{rivalry.memberBTeamName}</strong><small className="owner-label">{rivalry.memberBPublicName}</small><b>{percent(bRate)}</b><small>{rivalry.memberBWins}–{rivalry.memberAWins}{rivalry.ties?`–${rivalry.ties}`:""} · {rivalry.memberBPoints.toFixed(1)} pts</small></div><div className="rivalry-share" aria-label={`${rivalry.memberATeamName} ${percent(aRate)}, ${rivalry.memberBTeamName} ${percent(bRate)}`}><span style={{width:percent(aRate)}}/><i style={{width:percent(bRate)}}/></div></article>;
    })}</div>
  </section>;
}
