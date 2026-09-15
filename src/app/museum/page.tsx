import Link from "next/link";
import { getMuseumOverview } from "@/lib/data/museum";

export const dynamic = "force-dynamic";

export default async function MuseumPage() {
  const { champions, managers } = await getMuseumOverview();
  const latestChampion = champions[0];

  return <main>
    <section className="museum-intro"><p className="eyebrow">The trophy room · 2017—Present</p><h1>Legends are temporary.<br /><em>The receipts are permanent.</em></h1><p>Nine completed seasons of championships, heartbreak, draft-day bravado, and numbers that refuse to be forgotten.</p></section>

    <section className="champion-gallery" id="champions">
      <div className="section-heading"><div><p className="eyebrow">The champions wing</p><h2>League immortality</h2></div><p>{champions.length} titles catalogued</p></div>
      <div className="champion-track">{champions.map((champion, index) => <article className={index === 0 ? "champion-card latest" : "champion-card"} key={champion.year}>
        <div className="year-medallion"><span>{champion.year}</span></div>{index === 0 && <span className="current-plaque">Reigning champion</span>}<h3>{champion.teamName}</h3><p>Def. {champion.runnerUpTeamName}</p><strong>{champion.championScore.toFixed(2)}—{champion.runnerUpScore.toFixed(2)}</strong>
      </article>)}</div>
    </section>

    <section className="museum-grid" id="rankings">
      <article className="leaderboard-panel"><div className="section-heading compact"><div><p className="eyebrow">The eternal table</p><h2>Manager rankings</h2></div><span>By titles, then win %</span></div>
        <ol className="manager-list">{managers.map((manager, index) => <li key={manager.teamName}><span className="rank">{String(index + 1).padStart(2, "0")}</span><div><strong>{manager.teamName}</strong><small>{manager.playoffAppearances} playoff appearances</small></div><div className="manager-stat"><strong>{manager.championships}</strong><small>{manager.championships === 1 ? "title" : "titles"}</small></div><div className="manager-stat"><strong>{manager.winPercentage === null ? "—" : `${(manager.winPercentage * 100).toFixed(1)}%`}</strong><small>win rate</small></div></li>)}</ol>
      </article>
      <aside className="curator-card"><p className="eyebrow">League historian</p><h2>Ask the archive.</h2><p>Who owns the rivalry? What was the worst championship loss? The statistical historian is being prepared for a future exhibit.</p><div className="curator-prompt">“Who has the best career win percentage?”</div><span className="coming-label">Coming later</span></aside>
    </section>

    <section className="collections" id="collections"><div className="section-heading"><div><p className="eyebrow">Explore the collection</p><h2>Every argument has an exhibit</h2></div></div><div className="collection-grid">
      {[["01", "Season archive", "Standings, playoff runs, and every year in context.", "/museum/seasons"], ["02", "Rivalry room", "Career head-to-head records and bragging rights.", "/museum/rivalries"], ["03", "Draft vault", "Auction prices, values, and regrettable investments.", "/museum/drafts"], ["04", "Book of records", "High scores, low scores, streaks, and statistical wreckage.", "/museum/records"]].map(([number, title, description, href]) => <Link href={href} key={number}><article><span>{number}</span><h3>{title}</h3><p>{description}</p><small>Enter exhibit →</small></article></Link>)}
    </div></section>

    <footer className="museum-footer"><span>JBL History · Private league archive</span><span>{latestChampion ? `${latestChampion.year} champion: ${latestChampion.teamName}` : "2017—Present"}</span></footer>
  </main>;
}
