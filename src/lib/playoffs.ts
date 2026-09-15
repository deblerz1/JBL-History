export function playoffRoundName(round: number, roundCount: number) {
  const distanceFromFinal=roundCount-round;
  if(distanceFromFinal===0) return "Championship";
  if(distanceFromFinal===1) return "Semifinals";
  if(distanceFromFinal===2) return "Quarterfinals";
  return `Round ${round}`;
}

export function scoringPeriodLabel(periods: number[]) {
  if(periods.length===0) return "Week unavailable";
  if(periods.length===1) return `Week ${periods[0]}`;
  return `Weeks ${periods[0]}–${periods[periods.length-1]}`;
}
