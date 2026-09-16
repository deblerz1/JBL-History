import "server-only";
import {historianIntents,type HistorianCorpus,type HistorianPlan} from "@/lib/historian";

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
  return {intent:plan.intent as HistorianPlan["intent"],memberIds:plan.memberIds,startYear:plan.startYear as number|null,endYear:plan.endYear as number|null};
}

export async function interpretHistorianQuestion(question:string,corpus:HistorianCorpus):Promise<HistorianPlan|null>{
  const apiKey=process.env.OPENAI_API_KEY; if(!apiKey)return null;
  const currentYear=new Date().getUTCFullYear();
  const managers=corpus.managers.map(manager=>({id:manager.memberId,publicName:manager.publicName,currentTeam:manager.teamName,historicalTeams:[...new Set(corpus.seasons.filter(season=>season.memberId===manager.memberId).map(season=>season.teamName))]}));
  const body={model:process.env.OPENAI_MODEL||"gpt-5.6-luna",store:false,input:[
    {role:"system",content:[{type:"input_text",text:`You route questions for the private JBL fantasy-football statistics archive. Return only the query plan. Resolve spelling variants and possessives to the closest manager only when unambiguous (for example Zach means Zack). "current", "present", and "now" mean ${currentYear}. A question about one manager's record with dates is manager_record. Never answer the question or invent an ID. Use unsupported when the request is outside the available intents or ambiguous. Available managers: ${JSON.stringify(managers)}`}]},
    {role:"user",content:[{type:"input_text",text:question}]}
  ],text:{format:{type:"json_schema",name:"jbl_historian_query",strict:true,schema:{type:"object",properties:{intent:{type:"string",enum:historianIntents},memberIds:{type:"array",items:{type:"string"},maxItems:2},startYear:{type:["integer","null"]},endYear:{type:["integer","null"]}},required:["intent","memberIds","startYear","endYear"],additionalProperties:false}}},max_output_tokens:180};
  const controller=new AbortController(); const timeout=setTimeout(()=>controller.abort(),8000);
  try{
    const response=await fetch("https://api.openai.com/v1/responses",{method:"POST",headers:{Authorization:`Bearer ${apiKey}`,"Content-Type":"application/json"},body:JSON.stringify(body),signal:controller.signal});
    if(!response.ok)return null;
    const text=outputText(await response.json()); if(!text)return null;
    return validatePlan(JSON.parse(text),corpus);
  }catch{return null;}finally{clearTimeout(timeout);}
}
