import type {HistorianCorpus,HistorianPlan,HistorianResponse} from "./historian";

export type SeasonFormat={year:number;complete:boolean;teamCount:number;playoffSpots:number;regularWeeks:number;roundWeeks:number[];byes:number;qualificationKnown:boolean};
export type OutcomeQuery={throughWeek:number;recordMode:"exact"|"below_500";wins:number|null;losses:number|null;ties:number|null;outcome:"playoffs"|"champion";format:"current"|"year"|"all"|"team_count"|"compare";formatYear:number|null;teamCount:number|null};
export const outcomeSchema={type:["object","null"],properties:{throughWeek:{type:"integer"},recordMode:{type:"string",enum:["exact","below_500"]},wins:{type:["integer","null"]},losses:{type:["integer","null"]},ties:{type:["integer","null"]},outcome:{type:"string",enum:["playoffs","champion"]},format:{type:"string",enum:["current","year","all","team_count","compare"]},formatYear:{type:["integer","null"]},teamCount:{type:["integer","null"]}},required:["throughWeek","recordMode","wins","losses","ties","outcome","format","formatYear","teamCount"],additionalProperties:false};
export function validOutcome(value:unknown):value is OutcomeQuery{
  if(!value||typeof value!=="object")return false;
  const q=value as OutcomeQuery;
  const integer=(n:unknown,min:number,max:number)=>Number.isInteger(n)&&Number(n)>=min&&Number(n)<=max;
  if(!integer(q.throughWeek,1,18)||!["exact","below_500"].includes(q.recordMode)||!["playoffs","champion"].includes(q.outcome)||!["current","year","all","team_count","compare"].includes(q.format))return false;
  if(q.recordMode==="exact"?![q.wins,q.losses,q.ties].every(n=>integer(n,0,18))||Number(q.wins)+Number(q.losses)+Number(q.ties)!==q.throughWeek:[q.wins,q.losses,q.ties].some(n=>n!==null))return false;
  if(q.format==="year"?!integer(q.formatYear,2017,new Date().getUTCFullYear()):q.formatYear!==null)return false;
  if(q.format==="team_count"?!integer(q.teamCount,2,30):q.teamCount!==null)return false;
  return true;
}
const formatLabel=(f:SeasonFormat)=>`${f.teamCount} teams / ${f.playoffSpots} playoff spots / ${f.regularWeeks} regular weeks / ${f.byes} byes / round lengths ${f.roundWeeks.join("+")}`;
const formatKey=(f:SeasonFormat)=>JSON.stringify([f.teamCount,f.playoffSpots,f.regularWeeks,f.byes,f.roundWeeks]);
const validFormat=(f:SeasonFormat)=>Number.isInteger(f.teamCount)&&f.teamCount>=2&&Number.isInteger(f.playoffSpots)&&f.playoffSpots>=2&&f.playoffSpots<=f.teamCount&&Number.isInteger(f.regularWeeks)&&f.regularWeeks>0&&f.roundWeeks.length>0&&f.roundWeeks.every(n=>Number.isInteger(n)&&n>0)&&Number.isInteger(f.byes)&&f.byes>=0;

export function answerConditionalOutcome(plan:HistorianPlan,corpus:HistorianCorpus):HistorianResponse{
  const q=plan.condition;
  if(!validOutcome(q))return {answer:"Specify an opening record or a below-.500 checkpoint and a playoff or championship outcome.",facts:[]};
  if(plan.gameType!=="regular_season"||plan.windowYears!==null||plan.minimumGames!==null||plan.population!=="all"||plan.metric!==null||plan.limit!==null||plan.memberIds.length>1)return {answer:"This historical rate supports one manager or the league, regular-season checkpoints, date ranges and format filters. I haven't dropped any unsupported filters.",facts:[]};
  const formats=corpus.formats??[];
  const reference=q.format==="year"?formats.find(f=>f.year===q.formatYear):q.format==="current"?[...formats].sort((a,b)=>b.year-a.year)[0]:undefined;
  if((q.format==="current"||q.format==="year")&&(!reference||!validFormat(reference)))return {answer:"The requested season format is not verified in the archive. I haven't substituted another format.",facts:[]};
  const matchesFormat=(f:SeasonFormat)=>q.format==="current"?f.teamCount===reference!.teamCount&&f.playoffSpots===reference!.playoffSpots:q.format==="year"?formatKey(f)===formatKey(reference!):q.format==="team_count"?f.teamCount===q.teamCount:true;
  const description=q.format==="current"?`Matching the latest recorded format (${reference!.year}): ${reference!.teamCount} teams and ${reference!.playoffSpots} playoff spots`:
    q.format==="year"?`Matching ${q.formatYear}: ${formatLabel(reference!)}`:q.format==="team_count"?`${q.teamCount}-team seasons, all playoff formats`:q.format==="compare"?"Compared separately by recorded format":"All recorded formats pooled";
  const eligible=formats.filter(f=>f.complete&&(plan.startYear===null||f.year>=plan.startYear)&&(plan.endYear===null||f.year<=plan.endYear)&&matchesFormat(f));
  const excluded:number[]=[];const used:number[]=[];
  const observations:Array<{year:number;teamName:string;memberId:string;record:string;qualified:boolean;format:SeasonFormat}>=[];
  for(const f of eligible){
    const seasons=corpus.seasons.filter(s=>s.year===f.year);
    const seeds=seasons.map(s=>s.playoffSeed);
    const qualifiers=seasons.filter(s=>s.playoffSeed!==undefined&&s.playoffSeed!==null&&s.playoffSeed<=f.playoffSpots);
    const games=corpus.games.filter(g=>g.year===f.year&&!g.playoff);
    const fullSeason=seasons.length===f.teamCount&&new Set(seasons.map(s=>s.memberId)).size===f.teamCount&&seasons.every(s=>{
      const rows=games.filter(g=>g.memberId===s.memberId);
      return rows.length===f.regularWeeks&&Array.from({length:f.regularWeeks},(_,i)=>i+1).every(week=>rows.filter(g=>g.week===week&&g.scoringPeriodCount===1).length===1);
    });
    const champions=corpus.champions.filter(c=>c.year===f.year);
    if(!validFormat(f)||!f.qualificationKnown||!fullSeason||new Set(seeds).size!==f.teamCount||!seeds.every(seed=>Number.isInteger(seed)&&Number(seed)>=1&&Number(seed)<=f.teamCount)||qualifiers.length!==f.playoffSpots||q.throughWeek>f.regularWeeks||(q.outcome==="champion"&&(champions.length!==1||!qualifiers.some(s=>s.memberId===champions[0].memberId)))){excluded.push(f.year);continue;}
    used.push(f.year);
    for(const s of seasons){
      if(plan.memberIds.length&&!plan.memberIds.includes(s.memberId))continue;
      const opening=games.filter(g=>g.memberId===s.memberId&&Number(g.week)<=q.throughWeek);
      const wins=opening.filter(g=>g.result==="win").length,losses=opening.filter(g=>g.result==="loss").length,ties=opening.length-wins-losses;
      if(q.recordMode==="exact"?wins!==q.wins||losses!==q.losses||ties!==q.ties:(wins+ties*.5)/opening.length>=.5)continue;
      observations.push({year:f.year,memberId:s.memberId,teamName:s.teamName,record:`${wins}-${losses}${ties?`-${ties}`:""}`,qualified:q.outcome==="playoffs"?Number(s.playoffSeed)<=f.playoffSpots:champions[0].memberId===s.memberId,format:f});
    }
  }
  const condition=q.recordMode==="exact"?`starting ${q.wins}-${q.losses}${q.ties?`-${q.ties}`:""}`:`being below .500 after Week ${q.throughWeek}`;
  const outcome=q.outcome==="playoffs"?"made the playoffs":"won the championship";
  const subject=plan.memberIds.length?(corpus.managers.find(m=>m.memberId===plan.memberIds[0])?.publicName??"This manager"):"League teams";
  const successes=observations.filter(o=>o.qualified).length;
  const notes=[description,`Completed seasons examined: ${used.join(", ")||"none"}. Ongoing seasons excluded.`,...(excluded.length?[`Excluded for unverified format, qualification or weekly coverage: ${excluded.join(", ")}.`]:[]),"Historical frequency, not a calibrated prediction. Each observation is a team-season; observations from the same season are not independent.","Qualification uses final playoff seeds and includes teams with first-round byes; consolation participation does not count.",...(observations.length<10?["Small sample: fewer than 10 matching team-seasons. Ask for all formats to broaden the comparison explicitly."]:[]),...(q.format==="current"?["Default matching uses team count and playoff spots. Season lengths and round structures are shown separately below; ask for a named year's format to match all recorded dimensions."]:[])];
  if(!observations.length)return {answer:`No verified completed team-seasons matched ${subject.toLowerCase()} ${condition}. No percentage can be estimated from this sample.`,facts:notes};
  if(q.format==="compare"){
    const groups=new Map<string,typeof observations>();
    // Show verified formats with zero matching starts as no sample, not 0%.
    for(const f of eligible.filter(f=>used.includes(f.year)))groups.set(formatKey(f),[]);
    for(const o of observations){const key=formatKey(o.format);groups.set(key,[...(groups.get(key)??[]),o]);}
    return {answer:`Historical rates of ${outcome} after ${condition}, separated by season format.`,facts:[],notes:[...notes,"Check each format's sample size before comparing rates."],table:{caption:"Historical outcomes by format",columns:["Format","Seasons examined","Succeeded / matched","Historical rate"],rows:[...groups.entries()].map(([key,rows])=>{
      const groupFormats=eligible.filter(f=>used.includes(f.year)&&formatKey(f)===key);
      return [formatLabel(groupFormats[0]),groupFormats.map(f=>f.year).join(", "),`${rows.filter(o=>o.qualified).length} / ${rows.length}`,rows.length?`${(100*rows.filter(o=>o.qualified).length/rows.length).toFixed(1)}%`:"No sample"];
    })}};
  }
  return {answer:`${subject} ${outcome} in ${successes} of ${observations.length} matching team-seasons after ${condition}: ${(100*successes/observations.length).toFixed(1)}% historically.`,facts:[],notes,table:{caption:"Matching completed team-seasons",columns:["Season","Season team","Opening record",q.outcome==="playoffs"?"Made playoffs":"Champion","Format"],rows:observations.map(o=>[String(o.year),o.teamName,o.record,o.qualified?"Yes":"No",formatLabel(o.format)])}};
}
