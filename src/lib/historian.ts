import {commissionerAdjustment} from "./commissioner-adjustments";
import {answerConditionalOutcome,type OutcomeQuery,type SeasonFormat} from "./historian-outcomes";
import {answerManagerScore} from "./historian-manager-score";
import {prepareLuckGames} from "./historian-luck";
import {positionMetrics,positionScope,type HistorianPosition} from "./historian-position";
import {calculateMetric,formatMetric,metricDefinition,luckMetrics,type HistorianMetric} from "./historian-metrics";
export {historianMetrics,type HistorianMetric} from "./historian-metrics";
export type HistorianManager={memberId:string;teamName:string;publicName:string|null;championships:number;wins:number;losses:number;ties:number;winPercentage:number|null;playoffAppearances:number;playoffWins:number;playoffLosses:number;playoffWinPercentage:number|null;pointsFor:number};
export type HistorianChampion={year:number;memberId:string;teamName:string;publicName:string|null;runnerUp:string;score:number;runnerUpScore:number};
export type HistorianRivalry={memberAId:string;memberBId:string;memberATeamName:string;memberBTeamName:string;memberAPublicName:string|null;memberBPublicName:string|null;games:number;memberAWins:number;memberBWins:number;ties:number};
export type HistorianRecord={type:string;rank:number;year:number;week:number;memberId:string;teamName:string;publicName:string|null;opponent:string;value:number};
export type HistorianSeason={playoffSeed?:number|null;year:number;memberId:string;teamName:string;wins:number;losses:number;ties:number;pointsFor:number;finalStanding:number|null};
export type HistorianGame={seasonTeamId?:string;scoringWeeks?:number[];positionPoints?:number;positionVerified?:HistorianPosition;positionFailure?:string;week?:number;scoringPeriodCount?:number;expectedWins?:number;year:number;memberId:string;opponentMemberId?:string;teamName:string;playoff:boolean;points:number;opponentPoints:number;result:"win"|"loss"|"tie"};
export type HistorianCorpus={formats?:SeasonFormat[];managers:HistorianManager[];champions:HistorianChampion[];rivalries:HistorianRivalry[];records:HistorianRecord[];seasons:HistorianSeason[];games:HistorianGame[]};
export type HistorianContext={question:string;plan:HistorianPlan|null};
export type HistorianResponse={context?:HistorianContext;interpretation?:string;notes?:string[];answer:string;facts:string[];table?:{caption:string;columns:string[];rows:string[][]};href?:string;hrefLabel?:string};
export const historianIntents=["poor_performance","best_manager","worst_manager","conditional_outcome","manager_record","manager_playoffs","championship","championship_leader","rivalry","season_summary","highest_score","lowest_score","best_win_percentage","rank_metric","unsupported"] as const;
export type HistorianIntent=(typeof historianIntents)[number];
export const historianGameTypes=["regular_season","playoffs","all"] as const;
export type HistorianGameType=(typeof historianGameTypes)[number];
export const historianRankings=["highest","lowest"] as const;
export type HistorianRanking=(typeof historianRankings)[number];
export const historianPopulations=["all","active_every_season"] as const;
export type HistorianPopulation=(typeof historianPopulations)[number];
export const historianOutputs=["single","list"] as const;
export type HistorianOutput=(typeof historianOutputs)[number];
export type HistorianMeasure={metric:HistorianMetric;gameType:HistorianGameType};
export type HistorianPlan={groupBy?:"manager"|"season";measures?:HistorianMeasure[];position?:HistorianPosition|null;condition?:OutcomeQuery|null;intent:HistorianIntent;memberIds:string[];startYear:number|null;endYear:number|null;metric:HistorianMetric|null;gameType:HistorianGameType;ranking:HistorianRanking;windowYears:number|null;minimumGames:number|null;population:HistorianPopulation;output:HistorianOutput;limit:number|null};

export function deterministicHistorianPlan(rawQuestion:string):HistorianPlan|null{
  const question=rawQuestion.toLowerCase().replace(/[’']/g,"'");
  // This fast path accepts complete, narrowly defined requests only. Unknown
  // qualifiers must reach the model rather than being silently discarded.
  const normalized=question.replace(/[“”"?.]/g,"").replace(/[–—]/g,"-").replace(/\s+/g," ").trim();
  const listPattern=/^(?:give me |show me |show )?(?:a (?:full )?)?list (?:of )?(?:everyone's|every manager's|all (?:the )?teams?'?s?|all managers'?)(?: regular-season| regular season)? records? from (20\d{2})\s*(?:-|through|to)\s*(20\d{2})$/;
  const cohortPattern=/^of teams involved in every season,? who (?:had|has) the fewest regular-season wins from (20\d{2})\s*(?:-|through|to)\s*(20\d{2})$/;
  const matched=normalized.match(listPattern)??normalized.match(cohortPattern);
  if(!matched||Number(matched[1])<2017||Number(matched[2])>new Date().getUTCFullYear()||Number(matched[1])>Number(matched[2]))return null;
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
  if(plan.groupBy==="season"||plan.measures?.length)return answerComparison(plan,corpus);
  if(plan.intent==="best_manager"||plan.intent==="worst_manager"||plan.intent==="poor_performance")return answerManagerScore(plan,corpus);
  if(plan.intent==="conditional_outcome")return answerConditionalOutcome(plan,corpus);
  if(plan.intent==="rank_metric")return answerRankedMetric(plan,corpus);
  const ranged=plan.startYear!==null||plan.endYear!==null;
  const unsupportedScope=
    plan.windowYears!==null||plan.minimumGames!==null||plan.population!=="all"||plan.output!=="single"||plan.limit!==null||
    (["championship_leader","best_win_percentage"].includes(plan.intent)&&ranged)||
    (["highest_score","lowest_score"].includes(plan.intent)&&(ranged||plan.memberIds.length>0||plan.gameType!=="regular_season"))||
    (["championship","season_summary"].includes(plan.intent)&&plan.endYear!==null&&plan.endYear!==plan.startYear)||
    (plan.intent==="championship"&&ranged&&plan.memberIds.length>0);
  if(unsupportedScope)return {
    answer:"I can't apply all of those filters to this statistic yet. I haven't substituted a career total or an unfiltered league record.",
    facts:["This combination of statistic and filters needs additional query support."],
  };
  const managers=plan.memberIds.map(id=>corpus.managers.find(manager=>manager.memberId===id)).filter((manager):manager is HistorianManager=>Boolean(manager));
  const first=managers[0];
  if(first&&((plan.intent==="manager_playoffs"&&ranged)||(plan.intent==="manager_record"&&plan.gameType!=="regular_season"))){
    const phase=plan.intent==="manager_playoffs"?"playoffs":plan.gameType;
    const games=corpus.games.filter(game=>game.memberId===first.memberId&&
      (phase==="all"||game.playoff===(phase==="playoffs"))&&
      (plan.startYear===null||game.year>=plan.startYear)&&
      (plan.endYear===null||game.year<=plan.endYear));
    const period=plan.startYear!==null&&plan.endYear!==null?`${plan.startYear}–${plan.endYear}`:
      plan.startYear!==null?`since ${plan.startYear}`:plan.endYear!==null?`through ${plan.endYear}`:"all recorded seasons";
    const label=phase==="playoffs"?"playoff":"combined regular-season and playoff";
    if(!games.length)return {answer:`No completed ${label} games are recorded for ${first.teamName} (${period}).`,facts:["Missing games are not counted as losses."]};
    const wins=games.filter(game=>game.result==="win").length;
    const losses=games.filter(game=>game.result==="loss").length;
    const ties=games.length-wins-losses;
    return {
      answer:`${first.teamName} is ${record(wins,losses,ties)} in ${label} games (${period}), a ${pct((wins+ties*.5)/games.length)} win rate.`,
      facts:[`${games.length} completed games`,`${games.reduce((sum,game)=>sum+game.points,0).toFixed(2)} points scored`,"One result per matchup; consolation games excluded"],
      href:`/museum/managers/${first.memberId}`,hrefLabel:"Open the career exhibit",
    };
  }
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
    const [a,b]=managers;
    if(a.memberId===b.memberId)return {answer:"Choose two different managers for a rivalry.",facts:[]};
    const games=corpus.games.filter(game=>game.memberId===a.memberId&&game.opponentMemberId===b.memberId&&
      (plan.startYear===null||game.year>=plan.startYear)&&(plan.endYear===null||game.year<=plan.endYear)&&
      (plan.gameType==="all"||game.playoff===(plan.gameType==="playoffs")));
    const phase=plan.gameType==="all"?"regular-season and playoff":plan.gameType==="playoffs"?"playoff":"regular-season";
    const period=plan.startYear!==null&&plan.endYear!==null?`${plan.startYear}–${plan.endYear}`:
      plan.startYear!==null?`since ${plan.startYear}`:plan.endYear!==null?`through ${plan.endYear}`:"all recorded seasons";
    if(!games.length)return {answer:`No completed ${phase} meetings are recorded between ${a.teamName} and ${b.teamName} (${period}).`,facts:[]};
    const wins=games.filter(game=>game.result==="win").length;
    const losses=games.filter(game=>game.result==="loss").length;
    const ties=games.length-wins-losses;
    return {answer:`${a.teamName} is ${record(wins,losses,ties)} against ${b.teamName} in ${phase} games (${period}).`,
      facts:[`${games.length} completed meetings`,"Win percentage counts a tie as half a win; consolation games excluded"],
      table:{caption:`Head-to-head · ${period}`,columns:["Team","Record","Win %","Points"],rows:[
        [a.teamName,record(wins,losses,ties),pct((wins+ties*.5)/games.length),games.reduce((sum,g)=>sum+g.points,0).toFixed(2)],
        [b.teamName,record(losses,wins,ties),pct((losses+ties*.5)/games.length),games.reduce((sum,g)=>sum+g.opponentPoints,0).toFixed(2)],
      ]},href:"/museum/rivalries",hrefLabel:"Open the rivalry room"};
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

function answerComparison(plan:HistorianPlan,corpus:HistorianCorpus):HistorianResponse {
  if(plan.intent!=="rank_metric"||plan.windowYears!==null||plan.position)return {answer:"Season breakdowns and multi-stat comparisons currently support non-positional metrics without rolling windows. I haven't dropped any requested filters.",facts:[]};
  const measures=plan.measures?.length?plan.measures:plan.metric?[{metric:plan.metric,gameType:plan.gameType}]:[];
  if(!measures.length||measures.length>4)return {answer:"Choose between one and four statistics to compare.",facts:[]};
  const years=[...new Set(corpus.games.map(g=>g.year))].filter(y=>(plan.startYear===null||y>=plan.startYear)&&(plan.endYear===null||y<=plan.endYear)).sort((a,b)=>a-b);
  if(!years.length)return {answer:"No completed games match those dates.",facts:[]};
  const first=plan.startYear??years[0],last=plan.endYear??years.at(-1)!;
  const members=corpus.managers.filter(m=>(!plan.memberIds.length||plan.memberIds.includes(m.memberId))&&(plan.population!=="active_every_season"||Array.from({length:last-first+1},(_,i)=>first+i).every(y=>corpus.seasons.some(s=>s.memberId===m.memberId&&s.year===y))));
  const notes=new Set<string>(["Only recorded completed games are counted. A dash means no qualifying games or an undefined metric; it is not zero.","Each statistic uses its labeled phase. Regular-season and playoff games are not silently combined."]);
  const rows:string[][]=[];
  for(const year of plan.groupBy==="season"?years:[null])for(const manager of members){
    const values:string[]=[];let any=false;
    for(const measure of measures){
      const result=answerRankedMetric({...plan,measures:undefined,groupBy:undefined,metric:measure.metric,gameType:measure.gameType,memberIds:[manager.memberId],startYear:year??first,endYear:year??last,population:"all",output:"list",limit:null},corpus);
      if(!result.table){
        if(/No completed games|No manager met|statistic is undefined/.test(result.answer)){values.push("—");continue;}
        return result; // Never present a partial comparison after a coverage refusal.
      }
      any=true;values.push(result.table.rows[0][4]);
      for(const note of result.notes??[])notes.add(note);
    }
    if(any){const historic=year===null?null:corpus.seasons.find(s=>s.year===year&&s.memberId===manager.memberId)?.teamName;rows.push([historic??manager.teamName,manager.publicName??"",year===null?`${first}–${last}`:String(year),...values]);}
  }
  // Preserve year chronology. Within each year sort by the explicitly selected
  // first measure; missing values stay last. Formatted percentages share scale.
  rows.sort((a,b)=>(plan.groupBy==="season"?Number(a[2])-Number(b[2]):0)||(a[3]==="—"&&b[3]==="—"?0:a[3]==="—"?1:b[3]==="—"?-1:(plan.ranking==="highest"?-1:1)*(parseFloat(a[3])-parseFloat(b[3])))||a[0].localeCompare(b[0]));
  const listed=plan.limit===null?rows:rows.slice(0,plan.limit);
  if(listed.length<rows.length)notes.add(`Showing ${listed.length} of ${rows.length} rows due to your requested limit.`);
  return {answer:`${plan.groupBy==="season"?"Season-by-season results":"Statistical comparison"} for ${first}–${last}. Sorted ${plan.ranking} first by the first statistic${plan.groupBy==="season"?" within each season":""}.`,facts:[],notes:[...notes],table:{caption:"Recorded results by manager"+(plan.groupBy==="season"?" and season":""),columns:["Team","Manager","Seasons",...measures.map(m=>`${metricDefinition(m.metric).label} · ${m.gameType.replaceAll("_"," ")}`)],rows:listed},href:"/museum/seasons",hrefLabel:"Browse supporting seasons"};
}

type RankedMetricRow={manager:HistorianManager;startYear:number;endYear:number;games:number;wins:number;losses:number;ties:number;points:number;opponentPoints:number;expectedWins:number;value:number};

function answerRankedMetric(plan:HistorianPlan,corpus:HistorianCorpus):HistorianResponse{
  if(!plan.metric)return unsupportedAnswer();
  const metric=plan.metric;
  const isPosition=positionMetrics.has(metric);
  if(isPosition&&!plan.position)return {answer:"Which player position should I compare?",facts:["Choose QB, RB, WR, TE, K, or D/ST."]};
  const definition={...metricDefinition(metric),label:`${isPosition?`${plan.position} `:""}${metricDefinition(metric).label}`};
  const positionalGames=isPosition?positionScope(plan,corpus):null;
  if(positionalGames){
    const invalid=positionalGames.filter(g=>g.positionVerified!==plan.position||typeof g.positionPoints!=="number"||!Number.isFinite(g.positionPoints));
    if(invalid.length){
      const years=[...new Set(invalid.map(g=>g.year))].sort();
      const verifiedYears=[...new Set(positionalGames.map(g=>g.year))].filter(y=>!years.includes(y)).sort();
      return {answer:"I can't give a reliable positional total or ranking for that full range because some starting lineups are missing or do not reconcile with official scores.",facts:[`${invalid.length} of ${positionalGames.length} requested team-matchups failed verification. Affected seasons: ${years.join(", ")}.`,...new Set(invalid.map(g=>g.positionFailure??"lineup coverage not loaded")),...(verifiedYears.length?[`Fully verified seasons within this query: ${verifiedYears.join(", ")}. Ask for one of these seasons or a consecutive verified range.`]:[]),"No partial ranking was substituted. Historical player positions are required; current positions cannot fill gaps."]};
    }
  }
  let undefinedRows=0;
  const isLuck=luckMetrics.has(metric);
  if(isLuck&&plan.gameType!=="regular_season")return {answer:"Schedule luck currently supports regular-season games only.",facts:["Playoff brackets and multi-week matchups need a separate comparison definition."]};
  const luckData=isLuck?prepareLuckGames(corpus,plan.startYear,plan.endYear):null;
  const coverage=luckData?[`${luckData.completeWeeks} complete league weeks available; ${luckData.excluded.length} incomplete or invalid weeks excluded.`,...(luckData.excluded.length?[`Excluded: ${luckData.excluded.join(", ")}`]:[]),"Unplayed weeks are not counted. Results cover only completed, verified weeks."]:isPosition?["Starter-only points; bench and IR excluded. FLEX counts by historical player position.","All requested completed matchups reconcile to official scores within 0.02 points. Reconciliation cannot establish perfect historical lineup accuracy."]:[];
  const managerIds=plan.memberIds.length?new Set(plan.memberIds):null;
  const filtered=(positionalGames??luckData?.games??corpus.games).filter(game=>(!managerIds||managerIds.has(game.memberId))&&(plan.gameType==="all"||(plan.gameType==="playoffs")===game.playoff)&&(plan.startYear===null||game.year>=plan.startYear)&&(plan.endYear===null||game.year<=plan.endYear));
  const minYear=plan.startYear??Math.min(...filtered.map(game=>game.year)); const maxYear=plan.endYear??Math.max(...filtered.map(game=>game.year));
  if(!filtered.length||!Number.isFinite(minYear)||!Number.isFinite(maxYear))return {answer:"No completed games match those filters.",facts:["The historian will not estimate missing results.",...coverage]};
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
      const value=calculateMetric(metric,{wins,losses,ties,points,opponentPoints,games:games.length,expectedWins:isLuck?games.reduce((sum,g)=>sum+(g.expectedWins??0),0):undefined,positionPoints:isPosition?games.reduce((sum,g)=>sum+g.positionPoints!,0):undefined});
      if(value===null){undefinedRows++;continue;}
      rows.push({manager,startYear,endYear,games:games.length,wins,losses,ties,points,opponentPoints,expectedWins:games.reduce((sum,g)=>sum+(g.expectedWins??0),0),value});
    }
  }
  rows.sort((a,b)=>(plan.ranking==="highest"?b.value-a.value:a.value-b.value)||b.games-a.games||a.startYear-b.startYear);
  const notes=[...(isPosition?["Position points count recorded starters only. Confirmed commissioner adjustments are team-level points and are not assigned to players or positions. Scoring share uses the official team total, including adjustments.",...positionScope(plan,corpus).filter(g=>commissionerAdjustment(g.year,g.seasonTeamId,g.scoringWeeks)!==0).map(g=>`${g.teamName}, ${g.year}, Week ${g.scoringWeeks?.join(", ")}: +${commissionerAdjustment(g.year,g.seasonTeamId,g.scoringWeeks).toFixed(2)} commissioner adjustment excluded from position points.`)]:[]),...coverage,`Formula: ${definition.formula}`,...(definition.note?[definition.note]:[]),...(undefinedRows?[`${undefinedRows} manager/window results excluded because the formula was undefined (such as a zero denominator).`]:[]),...(plan.gameType!=="regular_season"?["Games are completed matchups; a multi-week playoff matchup counts as one game. Consolation games excluded."]:[])];
  const winner=rows[0]; if(!winner)return {answer:undefinedRows?"This statistic is undefined for the matching results; no ranking was assigned.":"No manager met the requested sample and season requirements.",facts:undefinedRows?notes:["Try a wider date range or a smaller minimum-games requirement."]};
  const phase=plan.gameType==="regular_season"?"regular-season":plan.gameType==="playoffs"?"playoff":"combined";
  if(plan.output==="list"){
    const bestByManager=new Map<string,RankedMetricRow>();
    for(const row of rows)if(!bestByManager.has(row.manager.memberId))bestByManager.set(row.manager.memberId,row);
    const listed=[...bestByManager.values()].slice(0,plan.limit??bestByManager.size);
    const formatValue=(row:RankedMetricRow)=>formatMetric(metric,row.value);
    const period=minYear===maxYear?String(minYear):`${minYear}–${maxYear}`;
    return {
      answer:`Here are the ${phase} results for ${period}, ranked from ${plan.ranking} to ${plan.ranking==="highest"?"lowest":"highest"} ${definition.label}${plan.windowYears?`, using each manager's ${plan.ranking==="highest"?"best":"worst"} ${plan.windowYears}-season stretch`:""}.`,
      facts:[...listed.map((row,index)=>`${index+1}. ${row.manager.teamName} — ${record(row.wins,row.losses,row.ties)} (${pct((row.wins+row.ties*.5)/row.games)}), ${formatValue(row)} ${definition.label}`),...notes],
      table:{caption:`${phase} results · ${period}`,columns:["Team","Seasons","Record","Win %",definition.label,...(isLuck?["Expected wins"]:[])],rows:listed.map(row=>[
        row.manager.teamName,`${row.startYear}–${row.endYear}`,record(row.wins,row.losses,row.ties),pct((row.wins+row.ties*.5)/row.games),formatValue(row),...(isLuck?[row.expectedWins.toFixed(2)]:[]),
      ])},
      href:"/museum/managers",
      notes,
      hrefLabel:"View manager rankings"
    };
  }
  const period=winner.startYear===winner.endYear?String(winner.startYear):`${winner.startYear}–${winner.endYear}`;
  const formatted=formatMetric(metric,winner.value);
  const tied=rows.filter(row=>Math.abs(row.value-winner.value)<1e-12);
  return {answer:`${winner.manager.teamName} has ${plan.memberIds.length===1&&!plan.windowYears?"a":`the ${plan.ranking}`} ${phase} ${definition.label}${plan.windowYears?` over a ${plan.windowYears}-season stretch`:""}: ${formatted} in ${period}.`,facts:[`${record(winner.wins,winner.losses,winner.ties)} across ${winner.games} games`,`${winner.points.toFixed(2)} points for · ${winner.opponentPoints.toFixed(2)} against`,...(isLuck?[`${winner.expectedWins.toFixed(2)} expected wins versus ${(winner.wins+winner.ties*.5).toFixed(2)} actual wins (ties count as half).`]:[]),...notes,...(tied.length>1?[`Tied at this value: ${tied.map(row=>`${row.manager.teamName} (${row.startYear}–${row.endYear})`).join(", ")}. Display order favors more games, then earlier seasons; this does not break the statistical tie.`]:[])],href:`/museum/managers/${winner.manager.memberId}`,hrefLabel:"Open the career exhibit"};
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
