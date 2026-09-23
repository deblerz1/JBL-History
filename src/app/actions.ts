"use server";
import { redirect } from "next/navigation";
import { clearLeagueSession, credentialsMatch, isLeagueSessionValid, setLeagueSession } from "@/lib/auth/session";
import { getHistorianCorpus,loadHistorianPositions } from "@/lib/data/museum";
import { answerHistorianPlan,historianPlanningFailure,type HistorianContext,type HistorianResponse } from "@/lib/historian";
import { ambiguousManagerQuestion,describeHistorianPlan } from "@/lib/historian-conversation";
import { interpretHistorianQuestion } from "@/lib/historian-llm";

export type LoginState = { error?: string };

export async function enterMuseum(_state: LoginState, formData: FormData): Promise<LoginState> {
  const accessCode = formData.get("accessCode");
  if (typeof accessCode !== "string" || accessCode.length > 256) return { error: "Enter the shared league access code." };
  if (!credentialsMatch(accessCode)) {
    await new Promise((resolve) => setTimeout(resolve, 700));
    return { error: "That access code is not on the guest list." };
  }
  await setLeagueSession();
  redirect("/museum");
}

export async function leaveMuseum() {
  await clearLeagueSession();
  redirect("/");
}

export async function askHistorian(question:string,context?:HistorianContext):Promise<HistorianResponse> {
  if(!(await isLeagueSessionValid())) return {answer:"The archive is locked. Return to the entrance and enter the league access code.",facts:[],href:"/",hrefLabel:"Return to entrance"};
  const clean=typeof question==="string"?question.trim():"";
  if(!clean||clean.length>240) return {answer:"Ask one statistical question in 240 characters or fewer.",facts:[]};
  const corpus=await getHistorianCorpus();
  const clarification=ambiguousManagerQuestion(clean,corpus);
  if(clarification)return {answer:clarification,facts:[],context:{question:clean,plan:null}};
  const plan=await interpretHistorianQuestion(clean,corpus,context);
  if(!plan)return historianPlanningFailure();
  let verified=corpus;
  try{verified=await loadHistorianPositions(corpus,plan);}catch{
    return {answer:"I couldn't load the historical lineups just now. Please try again.",facts:["No positional total was estimated."]};
  }
  const response=answerHistorianPlan(plan,verified);
  return {...response,...(plan.intent!=="unsupported"?{interpretation:describeHistorianPlan(plan,corpus),context:{question:clean,plan}}:{})};
}
