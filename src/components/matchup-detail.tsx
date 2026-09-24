import {commissionerAdjustment} from "@/lib/commissioner-adjustments";
import Link from "next/link";
import type { PlayoffMatchupDetail,PlayoffPlayer } from "@/lib/data/museum";
import { scoringPeriodLabel } from "@/lib/playoffs";

function Lineup({players}:{players:PlayoffPlayer[]}) { return <div className="lineup-list">{players.map(player=><div className={player.reserve?"lineup-player reserve":"lineup-player"} key={`${player.id}-${player.slot}`}><span>{player.slot??"—"}</span><div><strong>{player.name}</strong><small>{player.position??"—"}{player.proTeam?` · ${player.proTeam}`:""}{player.reserve?" · Reserve":""}</small></div><b>{player.points.toFixed(2)}</b></div>)}</div>; }

export function MatchupDetail({matchup,backHref,backLabel,context}:{matchup:PlayoffMatchupDetail;backHref:string;backLabel:string;context:string}) {
  return <main className="exhibit-page matchup-detail"><header className="matchup-detail-header"><Link href={backHref}>← {backLabel}</Link><p className="eyebrow">{matchup.year} · {context} · {scoringPeriodLabel(matchup.scoringPeriods)}</p><h1>{matchup.home.teamName}<span>vs.</span>{matchup.away.teamName}</h1><div className="matchup-scoreboard"><div className={matchup.home.winner?"winner":""}><span>{matchup.home.ownerName}</span><strong>{matchup.home.score.toFixed(2)}</strong></div><i>Final</i><div className={matchup.away.winner?"winner":""}><span>{matchup.away.ownerName}</span><strong>{matchup.away.score.toFixed(2)}</strong></div></div></header>
    {[matchup.home,matchup.away].map(team=>{
      const adjustment=commissionerAdjustment(matchup.year,team.id,matchup.scoringPeriods);
      if(!adjustment)return null;
      const starters=matchup.weeks.reduce((sum,w)=>sum+(team.id===matchup.home.id?w.homePoints:w.awayPoints),0);
      const reconciles=matchup.lineupAvailable&&Math.abs(starters+adjustment-team.score)<=.020001;
      return <p key={team.id}>{team.teamName}: {reconciles?`${starters.toFixed(2)} starter points + ${adjustment.toFixed(2)} commissioner adjustment = ${team.score.toFixed(2)} official points.`:`Confirmed commissioner adjustment: +${adjustment.toFixed(2)}. The available lineup does not currently reconcile with the official total.`} Adjustment points are not attributed to a player or position.</p>;
    })}
    {!matchup.lineupAvailable?<section className="lineup-unavailable"><h2>Final score preserved</h2><p>ESPN did not make player-level historical lineups available for this season. The official matchup result remains intact.</p></section>:<div className="matchup-weeks">{matchup.weeks.map(week=><section className="matchup-week" key={week.week}><header><div><p className="eyebrow">Scoring period</p><h2>Week {week.week}</h2></div><span>{week.homePoints.toFixed(2)}–{week.awayPoints.toFixed(2)}</span></header><div className="lineup-columns"><section><h3>{matchup.home.teamName}</h3><small>{matchup.home.ownerName}</small><Lineup players={week.homePlayers}/></section><section><h3>{matchup.away.teamName}</h3><small>{matchup.away.ownerName}</small><Lineup players={week.awayPlayers}/></section></div></section>)}</div>}
  </main>;
}
