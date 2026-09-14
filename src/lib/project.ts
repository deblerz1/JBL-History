export const project = {
  name: "JBL History",
  leagueName: "Joey Bags Fantasy League",
  espnLeagueId: 1550163,
  startYear: 2017,
  endYear: 2026,
  supabaseProjectRef: "ksoecnzmisoiyyfdgyoa",
} as const;

export const targetSeasonCount = project.endYear - project.startYear + 1;
