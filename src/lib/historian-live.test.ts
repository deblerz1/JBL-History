import {describe,it,expect,vi} from "vitest";
import {historianQuestions} from "./historian-questions";
import type {HistorianCorpus} from "./historian";

vi.mock("server-only",()=>({}));

const enabled=process.env.JBL_LIVE_EVAL==="1";
const limit=Number(process.env.JBL_EVAL_LIMIT??10);
if(enabled&&(!Number.isInteger(limit)||limit<1||limit>80))throw new Error("JBL_EVAL_LIMIT must be between 1 and 80.");
if(enabled&&!process.env.OPENAI_API_KEY)throw new Error("Live evaluations require OPENAI_API_KEY.");
const corpus:HistorianCorpus={
  managers:[["z","Zach","Team Alpha"],["f","Foz","Team Bravo"],["p","Jack P","Team Charlie"],["v","Jack V","Team Delta"]].map(([memberId,publicName,teamName])=>({memberId,publicName,teamName,championships:0,wins:0,losses:0,ties:0,winPercentage:null,playoffAppearances:0,playoffWins:0,playoffLosses:0,playoffWinPercentage:null,pointsFor:0})),
  seasons:[],games:[],records:[],champions:[],rivalries:[],
};
const selected=historianQuestions.filter(testCase=>!process.env.JBL_EVAL_CATEGORY||testCase.category===process.env.JBL_EVAL_CATEGORY).slice(0,limit);
if(enabled&&!selected.length)throw new Error("No cases match JBL_EVAL_CATEGORY.");

describe.skipIf(!enabled)("Live Historian planner acceptance (paid, opt-in)",()=>{
  it.each(selected)("$id $question",async testCase=>{
    const {interpretHistorianQuestion}=await import("./historian-llm");
    const plan=await interpretHistorianQuestion(testCase.question,corpus);
    // Transport failures must fail the evaluation, even for unsupported questions.
    expect(plan).not.toBeNull();
    expect(plan).toMatchObject(testCase.expected);
    if(testCase.expected.intent!=="unsupported")expect(plan?.intent).not.toBe("unsupported");
  },15000);
});
