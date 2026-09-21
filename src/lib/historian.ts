export type HistorianManager={memberId:string;teamName:string;publicName:string|null;championships:number;wins:number;losses:number;ties:number;winPercentage:number|null;playoffAppearances:number;playoffWins:number;playoffLosses:number;playoffWinPercentage:number|null;pointsFor:number};
export type HistorianChampion={year:number;memberId:string;teamName:string;publicName:string|null;runnerUp:string;score:number;runnerUpScore:number};
export type HistorianRivalry={memberAId:string;memberBId:string;memberATeamName:string;memberBTeamName:string;memberAPublicName:string|null;memberBPublicName:string|null;games:number;memberAWins:number;memberBWins:number;ties:number};
export type HistorianRecord={type:string;rank:number;year:number;week:number;memberId:string;teamName:string;publicName:string|null;opponent:string;value:number};
export type HistorianSeason={year:number;memberId:string;teamName:string;wins:number;losses:number;ties:number;pointsFor:number;finalStanding:number|null};
export type HistorianGame={year:number;memberId:string;teamName:string;playoff:boolean;points:number;opponentPoints:number;result:"win"|"loss"|"tie"};
export type HistorianCorpus={managers:HistorianManager[];champions:HistorianChampion[];rivalries:HistorianRivalry[];records:HistorianRecord[];seasons:HistorianSeason[];games:HistorianGame[]};
export type HistorianResponse={answer:string;facts:string[];href?:string;hrefLabel?:string};
export const historianIntents=["manager_record","manager_playoffs","championship","championship_leader","rivalry","season_summary","highest_score","lowest_score","best_win_percentage","rank_metric","unsupported"] as const;
export type HistorianIntent=(typeof historianIntents)[number];
export const historianMetrics=["win_percentage","points_per_game","points_against_per_game","average_margin","total_points","games_played","wins"] as const;
export type HistorianMetric=(typeof historianMetrics)[number];
export const historianGameTypes=["regular_season","playoffs","all"] as const;
export type HistorianGameType=(typeof historianGameTypes)[number];
export const historianRankings=["highest","lowest"] as const;
export type HistorianRanking=(typeof historianRankings)[number];
export const historianPopulations=["all","active_every_season"] as const;
export type HistorianPopulation=(typeof historianPopulations)[number];
export const historianOutputs=["single","list"] as const;
export type HistorianOutput=(typeof historianOutputs)[number];
export type HistorianPlan={intent:HistorianIntent;memberIds:string[];startYear:number|null;endYear:number|null;metric:HistorianMetric|null;gameType:HistorianGameType;ranking:HistorianRanking;windowYears:number|null;minimumGames:number|null;population:HistorianPopulation;output:HistorianOutput;limit:number|null};

export function deterministicHistorianPlan(rawQuestion:string):HistorianPlan|null{
  const question=rawQuestion.toLowerCase().replace(/[’']/g,"'");
  const years=[...question.matchAll(/\b20(?:1[7-9]|2\d)\b/g)].map(match=>Number(match[0]));
  if(years.length<2)return null;
  const asksForList=/\b(?:list|everyone|everybody|all (?:the )?(?:teams?|managers?))\b/.test(question);
  const asksForRecord=/\brecords?\b/.test(question);
  const asksForWins=/\bwins?\b/.test(question);
  const asksForWinRate=/\b(?:win percentage|win rate)\b/.test(question);
  if(!asksForRecord&&!asksForWins&&!asksForWinRate)return null;
  return {
    intent:"rank_metric",
    memberIds:[],
    startYear:Math.min(...years),
    endYear:Math.max(...years),
    metric:asksForWinRate?"win_percentage":"wins",
    gameType:/\bplayoffs?\b/.test(question)?"playoffs":"regular_season",
    ranking:/\b(?:fewest|least|lowest|worst)\b/.test(question)?"lowest":"highest",
    windowYears:null,
    minimumGames:null,
    population:/\b(?:each|every) season\b/.test(question)?"active_every_season":"all",
    output:asksForList?"list":"single",
    limit:null,
  };
}

const pct=(value:number|null)=>value===null?"—":`${(value*100).toFixed(1)}%`;
const record=(wins:number,losses:number,ties:number)=>`${wins}-${losses}${ties?`-${ties}`:""}`;
const includesPhrase=(question:string,value:string|null|undefined)=>Boolean(value&&value.length>1&&question.includes(value.toLowerCase()));

function mentionedManagers(question:string,corpus:HistorianCorpus){
  return corpus.managers.filter(manager=>includesPhrase(question,manager.publicName)||includesPhrase(question,manager.teamName)||corpus.seasons.some(season=>season.memberId===manager.memberId&&includesPhrase(question,season.teamName)));
}

export function answerHistorianPlan(plan:HistorianPlan,corpus:HistorianCorpus):HistorianResponse {
  if(plan.intent==="rank_metric")return answerRankedMetric(plan,corpus);
  const managers=plan.memberIds.map(id=>corpus.managers.find(manager=>manager.memberId===id)).filter((manager):manager is HistorianManager=>Boolean(manager));
  const first=managers[0];
  if(plan.intent==="manager_record"&&first){
    const ranged=plan.startYear!==null||plan.endYear!==null;
    if(!ranged)return managerCareerAnswer(first);
    const start=plan.startYear??Math.min(...corpus.seasons.map(season=>season.year));
    const end=plan.endYear??Math.max(...corpus.seasons.map(season=>season.year));
    const seasons=corpus.seasons.filter(season=>season.memberId===first.memberId&&season.year>=start&&season.year<=end);
    const totals=seasons.reduce((sum,season)=>({wins:sum.wins+season.wins,losses:sum.losses+season.losses,ties:sum.ties+season.ties,points:sum.points+season.pointsFor}),{wins:0,losses:0,ties:0,points:0});
    const games=totals.wins+totals.losses+totals.ties;
    if(!games)return {answer:`No completed regular-season games are recorded for ${first.teamName} from ${start} through ${end}.`,facts:["The historian will not estimate missing results."],href:`/museum/managers/${first.memberId}`,hrefLabel:"Open the career exhibit"};
    const winRate=(totals.wins+totals.ties*.5)/games;
    const label=end>=new Date().getUTCFullYear()?`${start}–present`:`${start}–${end}`;
    return {answer:`${first.teamName} is ${record(totals.wins,totals.losses,totals.ties)} from ${label}, a ${pct(winRate)} regular-season win rate.`,facts:[`${seasons.filter(season=>season.wins+season.losses+season.ties>0).length} seasons with completed games`,`${totals.points.toFixed(1)} points scored`],href:`/museum/managers/${first.memberId}`,hrefLabel:"Open the career exhibit"};
  }
  if(plan.intent==="manager_playoffs"&&first)return {answer:`${first.teamName} has made the playoffs ${first.playoffAppearances} times and is ${first.playoffWins}-${first.playoffLosses} in recorded playoff games (${pct(first.playoffWinPercentage)}).`,facts:[`${first.championships} championships`,`${pct(first.winPercentage)} regular-season win rate`],href:`/museum/managers/${first.memberId}`,hrefLabel:"Open the career exhibit"};
  if(plan.intent==="rivalry"&&managers.length>=2){
    const [a,b]=managers; const rivalry=corpus.rivalries.find(r=>(r.memberAId===a.memberId&&r.memberBId===b.memberId)||(r.memberAId===b.memberId&&r.memberBId===a.memberId));
    if(rivalry){const aWins=rivalry.memberAId===a.memberId?rivalry.memberAWins:rivalry.memberBWins;const bWins=rivalry.memberAId===b.memberId?rivalry.memberAWins:rivalry.memberBWins;const leader=aWins===bWins?"The series is tied.":`${aWins>bWins?a.teamName:b.teamName} leads the series.`;return {answer:`${a.teamName} is ${aWins}-${bWins}${rivalry.ties?`-${rivalry.ties}`:""} against ${b.teamName} across ${rivalry.games} meetings. ${leader}`,facts:[`${a.publicName??a.teamName}: ${aWins} wins`,`${b.publicName??b.teamName}: ${bWins} wins`,`${rivalry.ties} ties`],href:"/museum/rivalries",hrefLabel:"Open the rivalry room"};}
  }
  if(plan.intent==="championship"){
    if(plan.startYear!==null){const champion=corpus.champions.find(c=>c.year===plan.startYear);return champion?{answer:`${champion.teamName} won the ${plan.startYear} JBL championship, defeating ${champion.runnerUp} ${champion.score.toFixed(2)}–${champion.runnerUpScore.toFixed(2)}.`,facts:[champion.publicName??champion.teamName,`${champion.score.toFixed(2)} championship points`],href:"/museum/playoffs",hrefLabel:"View the playoff museum"}:{answer:`The ${plan.startYear} champion is not yet recorded as final.`,facts:["The historian reports only completed championship matchups."],href:"/museum/seasons",hrefLabel:"Open the season archive"};}
    if(first){const titles=corpus.champions.filter(c=>c.memberId===first.memberId);return {answer:titles.length?`${first.teamName} has ${titles.length} JBL championship${titles.length===1?"":"s"}: ${titles.map(t=>t.year).join(", ")}.`:`${first.teamName} has not won a recorded JBL championship.`,facts:[`${first.championships} career titles`,`${first.playoffAppearances} playoff appearances`],href:`/museum/managers/${first.memberId}`,hrefLabel:"Open the career exhibit"};}
  }
  if(plan.intent==="championship_leader"){const leader=[...corpus.managers].sort((a,b)=>b.championships-a.championships||Number(b.winPercentage)-Number(a.winPercentage))[0];if(leader)return {answer:`${leader.teamName} leads JBL history with ${leader.championships} championship${leader.championships===1?"":"s"}.`,facts:[leader.publicName??leader.teamName,`${pct(leader.winPercentage)} career win rate`],href:"/museum/managers",hrefLabel:"View manager rankings"};}
  if(plan.intent==="best_win_percentage"){const leader=[...corpus.managers].filter(m=>m.winPercentage!==null).sort((a,b)=>Number(b.winPercentage)-Number(a.winPercentage))[0];if(leader)return {answer:`${leader.teamName} owns the best career regular-season win percentage at ${pct(leader.winPercentage)}, with a ${record(leader.wins,leader.losses,leader.ties)} record.`,facts:[`${leader.championships} championships`,`${leader.playoffAppearances} playoff appearances`],href:`/museum/managers/${leader.memberId}`,hrefLabel:"Open the career exhibit"};}
  if(plan.intent==="highest_score"||plan.intent==="lowest_score"){const type=plan.intent==="highest_score"?"highest_score":"lowest_score";const rows=corpus.records.filter(r=>r.type===type&&(!first||r.memberId===first.memberId)).sort((a,b)=>type==="highest_score"?b.value-a.value:a.value-b.value);const result=rows[0];if(result)return {answer:`The ${first?`${first.teamName} `:""}${type==="highest_score"?"highest":"lowest"} recorded true single-week score is ${result.value.toFixed(2)} in Week ${result.week} of ${result.year}, against ${result.opponent}.`,facts:[result.publicName??result.teamName,"Multi-week aggregates excluded"],href:"/museum/records",hrefLabel:"Open the record book"};}
  if(plan.intent==="season_summary"&&plan.startYear!==null){const rows=corpus.seasons.filter(s=>s.year===plan.startYear).sort((a,b)=>(a.finalStanding??99)-(b.finalStanding??99));const top=rows[0];if(top)return {answer:`${top.teamName} finished first in ${plan.startYear} at ${record(top.wins,top.losses,top.ties)} with ${top.pointsFor.toFixed(1)} points scored.`,facts:[`${rows.length} teams recorded`,top.finalStanding===1?"Official final standing: 1":"Season still in progress"],href:`/museum/seasons/${plan.startYear}`,hrefLabel:`Browse ${plan.startYear}`};}
  return unsupportedAnswer();
}

type RankedMetricRow={manager:HistorianManager;startYear:number;endYear:number;games:number;wins:number;losses:number;ties:number;points:number;opponentPoints:number;value:number};
const metricLabel:Record<HistorianMetric,string>={win_percentage:"win percentage",points_per_game:"points per game",points_against_per_game:"points allowed per game",average_margin:"average scoring margin",total_points:"total points",games_played:"games played",wins:"wins"};

function answerRankedMetric(plan:HistorianPlan,corpus:HistorianCorpus):HistorianResponse{
  if(!plan.metric)return unsupportedAnswer();
  const metric=plan.metric;
  const managerIds=plan.memberIds.length?new Set(plan.memberIds):null;
  const filtered=corpus.games.filter(game=>(!managerIds||managerIds.has(game.memberId))&&(plan.gameType==="all"||(plan.gameType==="playoffs")===game.playoff)&&(plan.startYear===null||game.year>=plan.startYear)&&(plan.endYear===null||game.year<=plan.endYear));
  const minYear=plan.startYear??Math.min(...filtered.map(game=>game.year)); const maxYear=plan.endYear??Math.max(...filtered.map(game=>game.year));
  if(!filtered.length||!Number.isFinite(minYear)||!Number.isFinite(maxYear))return {answer:"No completed games match those filters.",facts:["The historian will not estimate missing results."]};
  const requestedYears=Array.from({length:maxYear-minYear+1},(_,index)=>minYear+index);
  const participatesEverySeason=(memberId:string)=>requestedYears.every(year=>
    corpus.seasons.some(season=>season.memberId===memberId&&season.year===year)||
    corpus.games.some(game=>game.memberId===memberId&&game.year===year)
  );
  const rows:RankedMetricRow[]=[]; const candidates=corpus.managers.filter(manager=>(!managerIds||managerIds.has(manager.memberId))&&(plan.population!=="active_every_season"||participatesEverySeason(manager.memberId)));
  for(const manager of candidates){
    const managerGames=filtered.filter(game=>game.memberId===manager.memberId); const managerYears=managerGames.map(game=>game.year);
    const windows=plan.windowYears===null?(managerYears.length?[[Math.min(...managerYears),Math.max(...managerYears)]]:[]):Array.from({length:Math.max(0,maxYear-minYear-plan.windowYears+2)},(_,index)=>[minYear+index,minYear+index+plan.windowYears!-1]);
    for(const [startYear,endYear] of windows){
      const games=managerGames.filter(game=>game.year>=startYear&&game.year<=endYear);
      if(!games.length)continue;
      if(plan.windowYears!==null&&new Set(games.map(game=>game.year)).size!==plan.windowYears)continue;
      const minimumGames=plan.minimumGames??1; if(games.length<minimumGames)continue;
      const wins=games.filter(game=>game.result==="win").length; const losses=games.filter(game=>game.result==="loss").length; const ties=games.length-wins-losses;
      const points=games.reduce((sum,game)=>sum+game.points,0); const opponentPoints=games.reduce((sum,game)=>sum+game.opponentPoints,0);
      const values:Record<HistorianMetric,number>={win_percentage:(wins+ties*.5)/games.length,points_per_game:points/games.length,points_against_per_game:opponentPoints/games.length,average_margin:(points-opponentPoints)/games.length,total_points:points,games_played:games.length,wins};
      rows.push({manager,startYear,endYear,games:games.length,wins,losses,ties,points,opponentPoints,value:values[metric]});
    }
  }
  rows.sort((a,b)=>(plan.ranking==="highest"?b.value-a.value:a.value-b.value)||b.games-a.games||a.startYear-b.startYear);
  const winner=rows[0]; if(!winner)return {answer:"No manager met the requested sample and season requirements.",facts:["Try a wider date range or a smaller minimum-games requirement."]};
  const phase=plan.gameType==="regular_season"?"regular-season":plan.gameType==="playoffs"?"playoff":"combined";
  if(plan.output==="list"){
    const bestByManager=new Map<string,RankedMetricRow>();
    for(const row of rows)if(!bestByManager.has(row.manager.memberId))bestByManager.set(row.manager.memberId,row);
    const listed=[...bestByManager.values()].slice(0,plan.limit??bestByManager.size);
    const formatValue=(row:RankedMetricRow)=>metric==="win_percentage"?pct(row.value):metric==="games_played"||metric==="wins"?String(row.value):row.value.toFixed(2);
    const period=minYear===maxYear?String(minYear):`${minYear}–${maxYear}`;
    return {
      answer:`Here are the ${phase} results for ${period}, ranked from ${plan.ranking} to ${plan.ranking==="highest"?"lowest":"highest"} ${metricLabel[metric]}.`,
      facts:listed.map((row,index)=>`${index+1}. ${row.manager.teamName} — ${record(row.wins,row.losses,row.ties)} (${pct((row.wins+row.ties*.5)/row.games)}), ${formatValue(row)} ${metricLabel[metric]}`),
      href:"/museum/managers",
      hrefLabel:"View manager rankings"
    };
  }
  const period=winner.startYear===winner.endYear?String(winner.startYear):`${winner.startYear}–${winner.endYear}`;
  const formatted=plan.metric==="win_percentage"?pct(winner.value):plan.metric==="games_played"||plan.metric==="wins"?String(winner.value):winner.value.toFixed(2);
  return {answer:`${winner.manager.teamName} has the ${plan.ranking} ${phase} ${metricLabel[plan.metric]}${plan.windowYears?` over a ${plan.windowYears}-season stretch`:""}: ${formatted} in ${period}.`,facts:[`${record(winner.wins,winner.losses,winner.ties)} across ${winner.games} games`,`${winner.points.toFixed(2)} points for · ${winner.opponentPoints.toFixed(2)} against`,plan.metric==="points_per_game"?"Formula: total points ÷ games played":plan.metric==="win_percentage"?"Formula: (wins + ½ ties) ÷ games played":`Ranked by ${metricLabel[plan.metric]}`],href:`/museum/managers/${winner.manager.memberId}`,hrefLabel:"Open the career exhibit"};
}

function managerCareerAnswer(manager:HistorianManager):HistorianResponse{return {answer:`${manager.teamName} is ${record(manager.wins,manager.losses,manager.ties)} all-time with a ${pct(manager.winPercentage)} regular-season win rate, ${manager.championships} championship${manager.championships===1?"":"s"}, and ${manager.playoffAppearances} playoff appearances.`,facts:[`${manager.pointsFor.toFixed(1)} career regular-season points`,`${manager.playoffWins}-${manager.playoffLosses} playoff record`],href:`/museum/managers/${manager.memberId}`,hrefLabel:"Open the career exhibit"};}
function unsupportedAnswer():HistorianResponse{return {answer:"I can answer grounded questions about championships, manager records, win percentages, playoff résumés, rivalries, season standings, and weekly scoring records. Name a manager, team, rival pair, or season to narrow the result.",facts:["Try: Who won in 2021?","Try: What is Zack's record since 2022?","Try: Who has the highest weekly score?"]};}

export function historianPlanningFailure():HistorianResponse{return {answer:"I couldn't translate that question into a safe JBL statistics query. Try rephrasing it with the metric, season range, and whether you want one leader or a full list.",facts:["No substitute statistic was returned.","Example: List every manager's regular-season record from 2022 through 2025."],href:"/museum/historian",hrefLabel:"Ask another question"};}

export function answerHistorian(rawQuestion:string,corpus:HistorianCorpus):HistorianResponse {
  const q=rawQuestion.toLowerCase().replace(/[^a-z0-9% ]/g," ").replace(/\s+/g," ").trim();
  const year=Number(q.match(/\b20(?:1[7-9]|2[0-6])\b/)?.[0])||null; const mentioned=mentionedManagers(q,corpus);
  const asksRivalry=/rival|head to head|h2h|versus| vs |against/.test(` ${q} `);
  if(mentioned.length>=2&&asksRivalry){const [a,b]=mentioned;const rivalry=corpus.rivalries.find(r=>(r.memberAId===a.memberId&&r.memberBId===b.memberId)||(r.memberAId===b.memberId&&r.memberBId===a.memberId));if(rivalry){const aWins=rivalry.memberAId===a.memberId?rivalry.memberAWins:rivalry.memberBWins;const bWins=rivalry.memberAId===b.memberId?rivalry.memberAWins:rivalry.memberBWins;const leader=aWins===bWins?"The series is tied.":`${aWins>bWins?a.teamName:b.teamName} leads the series.`;return {answer:`${a.teamName} is ${aWins}-${bWins}${rivalry.ties?`-${rivalry.ties}`:""} against ${b.teamName} across ${rivalry.games} meetings. ${leader}`,facts:[`${a.publicName??a.teamName}: ${aWins} wins`,`${b.publicName??b.teamName}: ${bWins} wins`,`${rivalry.ties} ties`],href:"/museum/rivalries",hrefLabel:"Open the rivalry room"};}}
  if(/champion|championship|title|won the league|who won|winner|rings?/.test(q)){
    if(year){const champion=corpus.champions.find(c=>c.year===year);return champion?{answer:`${champion.teamName} won the ${year} JBL championship, defeating ${champion.runnerUp} ${champion.score.toFixed(2)}–${champion.runnerUpScore.toFixed(2)}.`,facts:[champion.publicName??champion.teamName,`${champion.score.toFixed(2)} championship points`],href:"/museum/playoffs",hrefLabel:"View the playoff museum"}:{answer:`The ${year} champion is not yet recorded as final.`,facts:["The historian reports only completed championship matchups."],href:"/museum/seasons",hrefLabel:"Open the season archive"};}
    if(mentioned[0]){const manager=mentioned[0];const titles=corpus.champions.filter(c=>c.memberId===manager.memberId);return {answer:titles.length?`${manager.teamName} has ${titles.length} JBL championship${titles.length===1?"":"s"}: ${titles.map(t=>t.year).join(", ")}.`:`${manager.teamName} has not won a recorded JBL championship.`,facts:[`${manager.championships} career titles`,`${manager.playoffAppearances} playoff appearances`],href:`/museum/managers/${manager.memberId}`,hrefLabel:"Open the career exhibit"};}
    const leader=[...corpus.managers].sort((a,b)=>b.championships-a.championships||Number(b.winPercentage)-Number(a.winPercentage))[0];return {answer:`${leader.teamName} leads JBL history with ${leader.championships} championship${leader.championships===1?"":"s"}.`,facts:[`${leader.publicName??leader.teamName}`,`${pct(leader.winPercentage)} career win rate`],href:"/museum/managers",hrefLabel:"View manager rankings"};
  }
  if(/highest|most points|best score|scoring record/.test(q)){const top=corpus.records.find(r=>r.type==="highest_score"&&r.rank===1);if(top)return {answer:`The highest true single-week score is ${top.value.toFixed(2)} by ${top.teamName} in Week ${top.week} of ${top.year}, against ${top.opponent}.`,facts:[top.publicName??top.teamName,"Multi-week aggregates excluded"],href:"/museum/records",hrefLabel:"Open the record book"};}
  if(/lowest|fewest points|worst score|scoring basement/.test(q)){const low=corpus.records.find(r=>r.type==="lowest_score"&&r.rank===1);if(low)return {answer:`The lowest recorded single-week score is ${low.value.toFixed(2)} by ${low.teamName} in Week ${low.week} of ${low.year}, against ${low.opponent}.`,facts:[low.publicName??low.teamName,"Multi-week aggregates excluded"],href:"/museum/records",hrefLabel:"Open the record book"};}
  if(/best win|highest win|win percentage|win rate|best manager|greatest manager/.test(q)){const leader=[...corpus.managers].filter(m=>m.winPercentage!==null).sort((a,b)=>Number(b.winPercentage)-Number(a.winPercentage))[0];return {answer:`${leader.teamName} owns the best career regular-season win percentage at ${pct(leader.winPercentage)}, with a ${record(leader.wins,leader.losses,leader.ties)} record.`,facts:[`${leader.championships} championships`,`${leader.playoffAppearances} playoff appearances`],href:`/museum/managers/${leader.memberId}`,hrefLabel:"Open the career exhibit"};}
  if(year&&/standing|season|record|best team|first place/.test(q)){const rows=corpus.seasons.filter(s=>s.year===year).sort((a,b)=>(a.finalStanding??99)-(b.finalStanding??99));const top=rows[0];if(top)return {answer:`${top.teamName} finished first in ${year} at ${record(top.wins,top.losses,top.ties)} with ${top.pointsFor.toFixed(1)} points scored.`,facts:[`${rows.length} teams recorded`,top.finalStanding===1?"Official final standing: 1":"Season still in progress"],href:`/museum/seasons/${year}`,hrefLabel:`Browse ${year}`};}
  if(mentioned[0]){const manager=mentioned[0];if(/playoff/.test(q))return {answer:`${manager.teamName} has made the playoffs ${manager.playoffAppearances} times and is ${manager.playoffWins}-${manager.playoffLosses} in recorded playoff games (${pct(manager.playoffWinPercentage)}).`,facts:[`${manager.championships} championships`,`${pct(manager.winPercentage)} regular-season win rate`],href:`/museum/managers/${manager.memberId}`,hrefLabel:"Open the career exhibit"};return {answer:`${manager.teamName} is ${record(manager.wins,manager.losses,manager.ties)} all-time with a ${pct(manager.winPercentage)} regular-season win rate, ${manager.championships} championship${manager.championships===1?"":"s"}, and ${manager.playoffAppearances} playoff appearances.`,facts:[`${manager.pointsFor.toFixed(1)} career regular-season points`,`${manager.playoffWins}-${manager.playoffLosses} playoff record`],href:`/museum/managers/${manager.memberId}`,hrefLabel:"Open the career exhibit"};}
  return unsupportedAnswer();
}
