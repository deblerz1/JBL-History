import "server-only";
import {historianGameTypes,historianIntents,historianMetrics,historianRankings,type HistorianCorpus,type HistorianPlan} from "@/lib/historian";

const FIRST_YEAR=2017;

function outputText(response:unknown){
  if(!response||typeof response!=="object")return null;
  const value=response as {output_text?:unknown;output?:Array<{content?:Array<{type?:string;text?:unknown}>}>};
  if(typeof value.output_text==="string")return value.output_text;
  for(const item of value.output??[])for(const content of item.content??[])if(content.type==="output_text"&&typeof content.text==="string")return content.text;
  return null;
}

function validatePlan(value:unknown,corpus:HistorianCorpus):HistorianPlan|null{
  if(!value||typeof value!=="object")return null;
  const plan=value as Partial<HistorianPlan>; const currentYear=new Date().getUTCFullYear();
  if(!historianIntents.includes(plan.intent as HistorianPlan["intent"]))return null;
  if(!Array.isArray(plan.memberIds)||plan.memberIds.some(id=>typeof id!=="string"||!corpus.managers.some(manager=>manager.memberId===id)))return null;
  if(plan.memberIds.length>2)return null;
  const validYear=(year:unknown)=>year===null||(Number.isInteger(year)&&Number(year)>=FIRST_YEAR&&Number(year)<=currentYear);
  if(!validYear(plan.startYear)||!validYear(plan.endYear))return null;
  if(plan.startYear!==null&&plan.endYear!==null&&Number(plan.startYear)>Number(plan.endYear))return null;
  if(plan.metric===undefined||!(plan.metric===null||historianMetrics.includes(plan.metric)))return null;
  if(!historianGameTypes.includes(plan.gameType as HistorianPlan["gameType"])||!historianRankings.includes(plan.ranking as HistorianPlan["ranking"]))return null;
  const validCount=(value:unknown,max:number)=>value===null||(Number.isInteger(value)&&Number(value)>=1&&Number(value)<=max);
  if(!validCount(plan.windowYears,10)||!validCount(plan.minimumGames,200))return null;
  if(plan.intent==="rank_metric"&&plan.metric===null)return null;
  return {intent:plan.intent as HistorianPlan["intent"],memberIds:plan.memberIds,startYear:plan.startYear as number|null,endYear:plan.endYear as number|null,metric:plan.metric as HistorianPlan["metric"],gameType:plan.gameType as HistorianPlan["gameType"],ranking:plan.ranking as HistorianPlan["ranking"],windowYears:plan.windowYears as number|null,minimumGames:plan.minimumGames as number|null};
}

export async function interpretHistorianQuestion(question:string,corpus:HistorianCorpus):Promise<HistorianPlan|null>{
  const apiKey=process.env.OPENAI_API_KEY; if(!apiKey)return null;
  const currentYear=new Date().getUTCFullYear();
  const managers=corpus.managers.map(manager=>({id:manager.memberId,publicName:manager.publicName,currentTeam:manager.teamName,historicalTeams:[...new Set(corpus.seasons.filter(season=>season.memberId===manager.memberId).map(season=>season.teamName))]}));
  const body={model:process.env.OPENAI_MODEL||"gpt-5.6-luna",store:false,input:[
    {role:"system",content:[{type:"input_text",text:`You convert questions for the private JBL fantasy-football archive into a safe statistical query plan. Never calculate the answer or invent an ID. Resolve spelling variants and possessives only when unambiguous (Zach means Zack). "current", "present", and "now" mean ${currentYear}. Use rank_metric for rankings, ratios, averages, best/worst stretches, or manager-specific metric comparisons. For "best two-year win percentage": metric=win_percentage, gameType=regular_season, ranking=highest, windowYears=2. "Points per game" means metric=points_per_game. "Game per point ratio" should also be interpreted as points_per_game unless explicitly asking for the inverse. Use minimumGames only when the user states a minimum; otherwise null. Use legacy intents for direct championship, rivalry, season, record, or weekly-score questions. Fields irrelevant to a legacy intent use metric=null, gameType=regular_season, ranking=highest, windowYears=null, minimumGames=null. Use unsupported for requests outside the allowed metrics. Available managers: ${JSON.stringify(managers)}`}]},
    {role:"user",content:[{type:"input_text",text:question}]}
  ],text:{format:{type:"json_schema",name:"jbl_historian_query",strict:true,schema:{type:"object",properties:{intent:{type:"string",enum:historianIntents},memberIds:{type:"array",items:{type:"string"},maxItems:2},startYear:{type:["integer","null"]},endYear:{type:["integer","null"]},metric:{type:["string","null"],enum:[...historianMetrics,null]},gameType:{type:"string",enum:historianGameTypes},ranking:{type:"string",enum:historianRankings},windowYears:{type:["integer","null"]},minimumGames:{type:["integer","null"]}},required:["intent","memberIds","startYear","endYear","metric","gameType","ranking","windowYears","minimumGames"],additionalProperties:false}}},max_output_tokens:260};
  const controller=new AbortController(); const timeout=setTimeout(()=>controller.abort(),8000);
  try{
    const response=await fetch("https://api.openai.com/v1/responses",{method:"POST",headers:{Authorization:`Bearer ${apiKey}`,"Content-Type":"application/json"},body:JSON.stringify(body),signal:controller.signal});
    if(!response.ok)return null;
    const text=outputText(await response.json()); if(!text)return null;
    return validatePlan(JSON.parse(text),corpus);
  }catch{return null;}finally{clearTimeout(timeout);}
}
