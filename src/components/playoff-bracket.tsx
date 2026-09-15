"use client";

import { useState } from "react";
import type { PlayoffSeason,PlayoffTeam } from "@/lib/data/museum";
import { playoffRoundName,scoringPeriodLabel } from "@/lib/playoffs";

function TeamRow({team}:{team:PlayoffTeam}) {
  return <div className={team.winner?"playoff-team-row winner":"playoff-team-row"}>
    <span className="playoff-seed">{team.seed??"—"}</span>
    <span className="playoff-team-copy"><strong>{team.teamName}</strong><small>{team.ownerName}</small></span>
    <b>{team.score.toFixed(2)}</b>
  </div>;
}

export function PlayoffBracket({seasons}:{seasons:PlayoffSeason[]}) {
  const initialYear=seasons.find(season=>season.games.length>0)?.year??seasons[0]?.year;
  const [year,setYear]=useState(initialYear);
  const season=seasons.find(item=>item.year===year)??seasons[0];
  if(!season) return null;
  const roundCount=Math.max(0,...season.games.map(game=>game.roundCount));

  return <section>
    <div className="playoff-controls">
      <div aria-label="Choose playoff season">{seasons.map(item=><button aria-pressed={item.year===season.year} className={item.year===season.year?"season-chip active":"season-chip"} key={item.year} onClick={()=>setYear(item.year)} type="button">{item.year}</button>)}</div>
      <span className="playoff-format">{season.playoffTeamCount||"—"}-team field · {season.status}</span>
    </div>
    {season.games.length===0?<div className="playoff-empty"><span>{season.year}</span><h2>The bracket awaits.</h2><p>The {season.year} playoffs have not started. This room will fill automatically after ESPN records completed postseason matchups.</p></div>:<>
      <div className="bracket-shell"><div className="bracket">{Array.from({length:roundCount},(_,index)=>index+1).map(round=>{
        const games=season.games.filter(game=>game.round===round);
        return <section className="bracket-round" key={round}><header className="round-heading"><span>{playoffRoundName(round,roundCount)}</span><small>{games.length} matchup{games.length===1?"":"s"}</small></header><div className="round-games">{games.map(game=><article className={game.round===roundCount?"playoff-game championship-game":"playoff-game"} key={game.id}><div className="game-meta"><span>{scoringPeriodLabel(game.scoringPeriods)}</span><span>{game.scoringPeriods.length>1?"Two-week aggregate":"Final"}</span></div><TeamRow team={game.home}/><TeamRow team={game.away}/></article>)}</div></section>;
      })}</div></div>
      <p className="bracket-note">Seeds are shown in circles. Gold marks the winner. {season.playoffTeamCount===6?"The top two seeds received first-round byes. ":""}Multi-week playoff series are labeled and display ESPN&apos;s combined final score.</p>
    </>}
  </section>;
}
