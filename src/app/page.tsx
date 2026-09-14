import { project, targetSeasonCount } from "@/lib/project";

export default function Home() {
  return (
    <main className="min-h-screen bg-[#0d1812] px-6 py-16 text-[#f4f0e6] sm:px-10">
      <div className="mx-auto max-w-5xl">
        <p className="mb-5 text-sm font-semibold uppercase tracking-[0.24em] text-[#d5a94e]">
          {project.leagueName}
        </p>
        <h1 className="max-w-3xl text-5xl font-semibold tracking-tight sm:text-7xl">
          Every season. Every matchup. One league history.
        </h1>
        <p className="mt-7 max-w-2xl text-lg leading-8 text-[#b9c6bc]">
          A permanent, read-only archive of JBL results, records, drafts, and
          rivalries. The foundation is ready for ESPN ingestion and historical
          analytics.
        </p>

        <section className="mt-14 grid gap-4 sm:grid-cols-3">
          <article className="rounded-2xl border border-white/10 bg-white/5 p-6">
            <p className="text-sm text-[#b9c6bc]">Historical range</p>
            <p className="mt-2 text-3xl font-semibold">
              {project.startYear}–{project.endYear}
            </p>
          </article>
          <article className="rounded-2xl border border-white/10 bg-white/5 p-6">
            <p className="text-sm text-[#b9c6bc]">Target seasons</p>
            <p className="mt-2 text-3xl font-semibold">{targetSeasonCount}</p>
          </article>
          <article className="rounded-2xl border border-white/10 bg-white/5 p-6">
            <p className="text-sm text-[#b9c6bc]">ESPN access</p>
            <p className="mt-2 text-3xl font-semibold">Private</p>
          </article>
        </section>

        <div className="mt-14 rounded-2xl border border-[#d5a94e]/30 bg-[#d5a94e]/10 p-6">
          <p className="font-semibold text-[#e8c778]">Milestone 1</p>
          <p className="mt-2 text-[#d7dfd9]">
            Project scaffolding, a private-first database migration, sanitized
            fixtures, and automated verification.
          </p>
        </div>
      </div>
    </main>
  );
}
