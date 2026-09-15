import Link from "next/link";

import { LoginForm } from "@/components/login-form";
import { isLeagueSessionValid } from "@/lib/auth/session";

export default async function Home() {
  const hasAccess = await isLeagueSessionValid();

  return (
    <main className="museum-shell public-entry">
      <div className="entry-grain" aria-hidden="true" />
      <header className="entry-header">
        <div className="league-mark" aria-label="JBL History"><span>JBL</span></div>
        <p>Joey Bags Fantasy League</p>
      </header>
      <section className="entry-hero">
        <div className="entry-copy">
          <p className="eyebrow">Est. 2017 · Private archive</p>
          <h1>The history is settled.<br />The arguments aren&apos;t.</h1>
          <p className="entry-deck">Nine champions. Hundreds of matchups. Every glorious run and statistically indefensible collapse—preserved in one league museum.</p>
          <div className="archive-stamp"><span>Official archive</span><strong>2017—Present</strong></div>
        </div>
        <aside className="access-card">
          <p className="eyebrow">Members &amp; invited guests</p>
          <h2>{hasAccess ? "The vault is open." : "Enter the trophy room."}</h2>
          <p>{hasAccess ? "Your private league session is active." : "Use the shared JBL access code. No ESPN credentials are required."}</p>
          {hasAccess ? <Link className="primary-button" href="/museum">Continue to the museum <span>→</span></Link> : <LoginForm />}
          <small>Private, read-only, and never affiliated with ESPN.</small>
        </aside>
      </section>
      <footer className="entry-footer"><span>Champions</span><i /><span>Rivalries</span><i /><span>Drafts</span><i /><span>Records</span></footer>
    </main>
  );
}
