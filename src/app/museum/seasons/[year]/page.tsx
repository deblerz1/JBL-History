import Link from "next/link";
import { notFound } from "next/navigation";
import { ExhibitHeader } from "@/components/exhibit-header";
import { getSeasonMatchups } from "@/lib/data/museum";
import { scoringPeriodLabel } from "@/lib/playoffs";

export const dynamic="force-dynamic";
export default async function SeasonMatchupsPage({params}:{params:Promise<{year:string}>}) {
  const year=Number((await params).year); if(!Number.isInteger(year)) notFound();
  const season=await getSeasonMatchups(year); if(!season) notFound();
  const periods=[...new Set(season.games.map(game=>game.matchupPeriod))];
  return <main className="exhibit-page"><ExhibitHeader eyebrow={`${year} game ledger`} title="Weekly matchups" description="Every preserved score from the season. Open a matchup to inspect its starters, bench, and scoring-week breakdown." />
    <div className="week-jump" aria-label="Jump to week">{periods.map(period=><a href={`#week-${period}`} key={period}>Week {period}</a>)}</div>
    <div className="weekly-archive">{periods.map(period=>{const games=season.games.filter(game=>game.matchupPeriod===period); return <section id={`week-${period}`} className="weekly-section" key={period}><header><div><p className="eyebrow">Matchup period</p><h2>Week {period}</h2></div><span>{scoringPeriodLabel(games[0]?.scoringPeriods??[period])}</span></header><div className="weekly-games">{games.map(game=><Link className="weekly-game" href={`/museum/seasons/${year}/matchups/${game.id}`} key={game.id}><div className={game.home.winner?"winner":""}><span><strong>{game.home.teamName}</strong><small>{game.home.ownerName}</small></span><b>{game.home.score.toFixed(2)}</b></div><div className={game.away.winner?"winner":""}><span><strong>{game.away.teamName}</strong><small>{game.away.ownerName}</small></span><b>{game.away.score.toFixed(2)}</b></div><footer>{game.playoff?"Playoff":"Regular season"} · View matchup →</footer></Link>)}</div></section>})}</div>
  </main>;
}
