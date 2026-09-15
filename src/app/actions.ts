"use server";
import { redirect } from "next/navigation";
import { clearLeagueSession, credentialsMatch, setLeagueSession } from "@/lib/auth/session";

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
