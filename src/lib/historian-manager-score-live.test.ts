import {describe,expect,it,vi} from "vitest";
import type {HistorianCorpus,HistorianPlan} from "./historian";
vi.mock("server-only",()=>({}));
import {interpretHistorianQuestion} from "./historian-llm";
const corpus:HistorianCorpus={managers:["Zach","Foz"].map(publicName=>({memberId:publicName.toLowerCase(),publicName,teamName:`Synthetic ${publicName}`,championships:0,wins:0,losses:0,ties:0,winPercentage:null,playoffAppearances:0,playoffWins:0,playoffLosses:0,playoffWinPercentage:null,pointsFor:0})),seasons:[],games:[],champions:[],rivalries:[],records:[]};
describe.skipIf(process.env.JBL_LIVE_EVAL!=="1")("Live manager composites (6 requests, opt-in)",()=>{
  it.each([
    ["Who is the best manager overall?",{intent:"best_manager",metric:null,ranking:"highest"}],
    ["List the worst managers from 2022 through 2025.",{intent:"worst_manager",metric:null,ranking:"highest",startYear:2022,endYear:2025,output:"list"}],
    ["Who is the best manager by regular-season win percentage since 2022?",{intent:"rank_metric",metric:"win_percentage",startYear:2022}],
    ["What is Zach's worst-manager score?",{intent:"worst_manager",memberIds:["zach"],metric:null}],
  ] as [string,Partial<HistorianPlan>][])("%s",async(question,expected)=>{
    expect(await interpretHistorianQuestion(question,corpus)).toMatchObject(expected);
  },15000);
  it("keeps the composite when adding a manager comparison",async()=>{
    const question="What is Zach's best-manager score from 2022 through 2025?";
    const first=await interpretHistorianQuestion(question,corpus);
    expect(first).toMatchObject({intent:"best_manager",memberIds:["zach"],metric:null,startYear:2022,endYear:2025});
    const next=await interpretHistorianQuestion("Compare that with Foz",corpus,{question,plan:first});
    expect(next).toMatchObject({intent:"best_manager",metric:null,output:"list",startYear:2022,endYear:2025});
    expect(next?.memberIds.slice().sort()).toEqual(["foz","zach"]);
  },30000);
});
