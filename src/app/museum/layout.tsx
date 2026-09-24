import Link from "next/link";
import { redirect } from "next/navigation";
import { leaveMuseum } from "@/app/actions";
import { isLeagueSessionValid } from "@/lib/auth/session";

export default async function MuseumLayout({ children }: { children: React.ReactNode }) {
  if (!(await isLeagueSessionValid())) redirect("/");
  return <div className="museum-shell museum-home"><header className="museum-nav">
    <Link className="nav-brand" href="/museum"><span className="mini-mark">JBL</span><span><strong>JBL History</strong><small>The official league archive</small></span></Link>
    <nav aria-label="Museum navigation"><Link href="/museum/seasons">Seasons</Link><Link href="/museum/playoffs">Playoffs</Link><Link href="/museum/managers">Managers</Link><Link href="/museum/rivalries">Rivalries</Link><Link href="/museum/drafts">Drafts</Link><Link href="/museum/transactions">Moves</Link><Link href="/museum/records">Records</Link><Link href="/museum/historian">Historian</Link><Link href="/museum/coverage">Coverage</Link></nav>
    <form action={leaveMuseum}><button className="quiet-button">Lock archive</button></form>
  </header>{children}</div>;
}
