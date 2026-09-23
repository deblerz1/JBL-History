import type {HistorianCorpus,HistorianPlan,HistorianResponse} from "./historian";

export const managerScoreVersion="JBL overall ranking v1";
export const managerScoreRules=[
  "Overall score: 40% championship credit + 30% regular-season win percentage + 15% playoff appearance rate + 15% playoff win percentage.",
  "Separate poor-performance index (explicit requests only): 40% regular-season last-place rate + 35% regular-season loss-equivalent rate + 25% low-scoring credit. Higher means more poor-performance indicators; this is not the overall ranking.",
  "Best and worst use the same overall score: best is the highest qualified score; worst is the lowest. The rankings page and historian share this ordering.",
  "Three completed seasons in the selected range qualify. Shorter careers are provisional and cannot win the qualified ranking. Active seasons are excluded.",
  "Championship credit = titles / the qualified title leader's titles, capped at 100%; no titles earns zero. Percentage components are multiplied by 100. No playoff appearances earns zero playoff-component credit.",
  "Scoring strength = the mean of each season's team points per game / league points per game. Each season has equal weight. Low-scoring credit maps the qualified league's highest strength to 0 and lowest to 100; equal strengths get equal credit (50 if all are equal). Provisional values are capped at 0–100.",
  "Last place uses lowest regular-season win percentage, then lowest regular-season points. Teams tied on both share last place. Consolation standings are never used. Ties count as half a win.",
  "Normalization uses all qualified league managers in the date range, before selecting names. Scores describe this published formula, not an objective judgment of ability. Title counts reward longevity; playoff opportunities differ by league format.",
];
export type ManagerScoreRow={memberId:string;teamName:string;publicName:string|null;seasons:number;qualified:boolean;titles:number;wins:number;losses:number;ties:number;winRate:number;appearances:number;appearanceRate:number;playoffGames:number;playoffWinRate:number;lastPlaces:number;lastRate:number;scoringStrength:number;bestComponents:number[];worstComponents:number[];best:number;worst:number};
const clamp=(n:number)=>Math.max(0,Math.min(100,n));
export function calculateManagerScores(corpus:HistorianCorpus,startYear:number|null=null,endYear:number|null=null):{rows:ManagerScoreRow[];years:number[];error?:string}{
  const formats=(corpus.formats??[]).filter(f=>f.complete&&(startYear===null||f.year>=startYear)&&(endYear===null||f.year<=endYear));
  const years=formats.map(f=>f.year).sort();
  if(!years.length)return {rows:[],years,error:"No verified completed seasons match that range."};
  const seasonValues=new Map<string,{rate:number;points:number;strength:number;last:boolean;qualified:boolean}>();
  for(const f of formats){
    const teams=corpus.seasons.filter(s=>s.year===f.year),games=corpus.games.filter(g=>g.year===f.year&&!g.playoff);
    const seeds=teams.map(s=>s.playoffSeed);
    const valid=Number.isInteger(f.regularWeeks)&&f.regularWeeks>0&&f.qualificationKnown&&teams.length===f.teamCount&&new Set(teams.map(s=>s.memberId)).size===f.teamCount&&new Set(seeds).size===f.teamCount&&seeds.every(s=>Number.isInteger(s)&&Number(s)>=1&&Number(s)<=f.teamCount)&&teams.every(s=>{
      const rows=games.filter(g=>g.memberId===s.memberId);
      return rows.length===f.regularWeeks&&rows.every(g=>Number.isFinite(g.points))&&Array.from({length:f.regularWeeks},(_,i)=>i+1).every(w=>rows.filter(g=>g.week===w&&g.scoringPeriodCount===1).length===1);
    });
    const champions=corpus.champions.filter(c=>c.year===f.year);
    const playoffs=corpus.games.filter(g=>g.year===f.year&&g.playoff);
    if(!valid||champions.length!==1||!teams.some(s=>s.memberId===champions[0].memberId&&Number(s.playoffSeed)<=f.playoffSpots)||playoffs.length!==2*(f.playoffSpots-1)||playoffs.some(g=>!Number.isFinite(g.points)||!teams.some(s=>s.memberId===g.memberId&&Number(s.playoffSeed)<=f.playoffSpots))||teams.filter(s=>Number(s.playoffSeed)<=f.playoffSpots).some(s=>!playoffs.some(g=>g.memberId===s.memberId)))return {rows:[],years,error:`The ${f.year} season lacks verified regular-season, qualification, championship or playoff coverage. No partial composite ranking was substituted.`};
    const values=teams.map(s=>{
      const rows=games.filter(g=>g.memberId===s.memberId);
      return {id:s.memberId,rate:rows.reduce((sum,g)=>sum+(g.result==="win"?1:g.result==="tie"?.5:0),0)/rows.length,points:rows.reduce((sum,g)=>sum+g.points,0),qualified:Number(s.playoffSeed)<=f.playoffSpots};
    });
    const average=values.reduce((sum,v)=>sum+v.points,0)/values.length;
    if(!(average>0))return {rows:[],years,error:`The ${f.year} league scoring baseline is unavailable.`};
    const lowest=[...values].sort((a,b)=>a.rate-b.rate||a.points-b.points)[0];
    for(const v of values)seasonValues.set(`${f.year}:${v.id}`,{...v,strength:v.points/average,last:Math.abs(v.rate-lowest.rate)<1e-12&&Math.abs(v.points-lowest.points)<1e-9});
  }
  const rows:ManagerScoreRow[]=corpus.managers.flatMap(m=>{
    const seasons=years.filter(y=>seasonValues.has(`${y}:${m.memberId}`));if(!seasons.length)return [];
    const values=seasons.map(y=>seasonValues.get(`${y}:${m.memberId}`)!);
    const games=corpus.games.filter(g=>seasons.includes(g.year)&&g.memberId===m.memberId);
    const regular=games.filter(g=>!g.playoff),playoffs=games.filter(g=>g.playoff);
    const wins=regular.filter(g=>g.result==="win").length,ties=regular.filter(g=>g.result==="tie").length;
    const appearances=values.filter(v=>v.qualified).length,lastPlaces=values.filter(v=>v.last).length;
    return [{memberId:m.memberId,teamName:m.teamName,publicName:m.publicName,seasons:seasons.length,qualified:seasons.length>=3,titles:corpus.champions.filter(c=>seasons.includes(c.year)&&c.memberId===m.memberId).length,wins,losses:regular.length-wins-ties,ties,winRate:(wins+.5*ties)/regular.length,appearances,appearanceRate:appearances/seasons.length,playoffGames:playoffs.length,playoffWinRate:appearances&&playoffs.length?playoffs.reduce((s,g)=>s+(g.result==="win"?1:g.result==="tie"?.5:0),0)/playoffs.length:0,lastPlaces,lastRate:lastPlaces/seasons.length,scoringStrength:values.reduce((s,v)=>s+v.strength,0)/values.length,bestComponents:[],worstComponents:[],best:0,worst:0}];
  });
  const reference=rows.filter(r=>r.qualified);
  if(!reference.length)return {rows:[],years,error:"No manager has three completed seasons in this range. Widen the range to establish a qualified comparison group."};
  const titleMax=Math.max(...reference.map(r=>r.titles)),low=Math.min(...reference.map(r=>r.scoringStrength)),high=Math.max(...reference.map(r=>r.scoringStrength));
  for(const r of rows){
    r.bestComponents=[titleMax?clamp(100*r.titles/titleMax):0,100*r.winRate,100*r.appearanceRate,100*r.playoffWinRate];
    r.worstComponents=[100*r.lastRate,100*(1-r.winRate),Math.abs(high-low)<1e-12?50:clamp(100*(high-r.scoringStrength)/(high-low))];
    r.best=r.bestComponents.reduce((s,v,i)=>s+v*[.4,.3,.15,.15][i],0);
    r.worst=r.worstComponents.reduce((s,v,i)=>s+v*[.4,.35,.25][i],0);
  }
  return {rows,years};
}

export function overallManagerRank(row:ManagerScoreRow,rows:ManagerScoreRow[]):number|null{
  return row.qualified?1+rows.filter(other=>other.qualified&&other.best>row.best+1e-9).length:null;
}

export function rankManagerScores(rows:ManagerScoreRow[],mode:"overall"|"poor_performance"="overall",direction:"highest"|"lowest"="highest"):ManagerScoreRow[]{
  const field=mode==="overall"?"best":"worst";
  return [...rows].sort((a,b)=>Number(b.qualified)-Number(a.qualified)||(Math.abs(a[field]-b[field])<1e-9?0:direction==="lowest"?a[field]-b[field]:b[field]-a[field])||a.teamName.localeCompare(b.teamName));
}

export function answerManagerScore(plan:HistorianPlan,corpus:HistorianCorpus):HistorianResponse{
  if(plan.windowYears!==null||plan.minimumGames!==null||plan.population!=="all"||plan.gameType!=="regular_season"||plan.metric!==null||plan.position!=null)return {answer:"The published manager score supports completed-season date ranges, manager selections and lists. It has fixed component weights and a three-season qualification rule; I haven't dropped your other filters.",facts:[]};
  const result=calculateManagerScores(corpus,plan.startYear,plan.endYear);
  if(result.error)return {answer:result.error,facts:[]};
  const worst=plan.intent==="poor_performance",kind=worst?"worst":"best";
  const direction=plan.intent==="worst_manager"?"lowest":plan.ranking;
  const label=worst?"separate poor-performance index":"overall manager score";
  const overall=rankManagerScores(result.rows).filter(r=>r.qualified);
  const rank=(r:ManagerScoreRow)=>String(overallManagerRank(r,result.rows)??"—");
  const all=rankManagerScores(result.rows,worst?"poor_performance":"overall",direction).filter(r=>!plan.memberIds.length||plan.memberIds.includes(r.memberId));
  const qualified=all.filter(r=>r.qualified),first=qualified[0]??all[0];
  if(!first)return {answer:"No completed-season record matches those managers.",facts:[]};
  const tied=qualified.filter(r=>Math.abs(r[kind]-first[kind])<1e-9);
  const list=plan.output==="list"||plan.memberIds.length>1;
  const shown=list?all.slice(0,plan.limit??all.length):[first];
  const notes=[...managerScoreRules,`Completed seasons: ${result.years.join(", ")}.`,...(tied.length>1?[`Statistically tied at the leading score: ${tied.map(r=>r.teamName).join(", ")}. Alphabetical display order does not break ties.`]:[]),"Component columns show weighted points toward the 100-point total. Raw records and scoring strength are shown alongside them."];
  return {answer:list?`${label}, ordered ${direction} to ${direction==="highest"?"lowest":"highest"}, with provisional careers after qualified managers.`:`${first.teamName}${first.publicName?` (${first.publicName})`:""}: ${first[kind].toFixed(1)}/100 on the ${label}${first.qualified&&!worst?` — overall rank ${rank(first)} of ${overall.length} qualified managers`:""}${first.qualified?"":" (provisional; not eligible for the qualified ranking)"}.`,facts:[],notes,table:{caption:`${managerScoreVersion} · ${label} · ${result.years[0]}–${result.years.at(-1)}`,columns:["Team","Status","Overall rank","Seasons","Score / 100",...(worst?["Last place / seasons","Record","Scoring vs league","Last place / 40","Low win rate / 35","Low scoring / 25"]:["Titles","Record","Playoffs / seasons","Playoff games","Playoff win %","Titles / 40","Win rate / 30","Appearances / 15","Playoff wins / 15"])],rows:shown.map(r=>[`${r.teamName}${r.publicName?` · ${r.publicName}`:""}`,r.qualified?"Qualified":"Provisional",rank(r),String(r.seasons),r[kind].toFixed(1),...(worst?[`${r.lastPlaces}/${r.seasons}`,`${r.wins}-${r.losses}-${r.ties}`,`${(100*r.scoringStrength).toFixed(1)}%`,...r.worstComponents.map((v,i)=>(v*[.4,.35,.25][i]).toFixed(1))]:[String(r.titles),`${r.wins}-${r.losses}-${r.ties}`,`${r.appearances}/${r.seasons}`,String(r.playoffGames),`${(100*r.playoffWinRate).toFixed(1)}%`,...r.bestComponents.map((v,i)=>(v*[.4,.3,.15,.15][i]).toFixed(1))])])},href:"/museum/managers",hrefLabel:"View rankings and methodology"};
}
