"use server";
import { redirect } from "next/navigation";
import { clearLeagueSession, credentialsMatch, isLeagueSessionValid, setLeagueSession } from "@/lib/auth/session";
import { getHistorianCorpus } from "@/lib/data/museum";
import { answerHistorian,type HistorianResponse } from "@/lib/historian";

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

export async function askHistorian(question:string):Promise<HistorianResponse> {
  if(!(await isLeagueSessionValid())) return {answer:"The archive is locked. Return to the entrance and enter the league access code.",facts:[],href:"/",hrefLabel:"Return to entrance"};
  const clean=question.trim();
  if(!clean||clean.length>240) return {answer:"Ask one statistical question in 240 characters or fewer.",facts:[]};
  return answerHistorian(clean,await getHistorianCorpus());
}
