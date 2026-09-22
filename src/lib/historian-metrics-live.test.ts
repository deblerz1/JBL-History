import {describe,expect,it,vi} from "vitest";
import type {HistorianCorpus,HistorianPlan} from "./historian";
vi.mock("server-only",()=>({}));
import {interpretHistorianQuestion} from "./historian-llm";
const corpus:HistorianCorpus={managers:[],seasons:[],games:[],champions:[],rivalries:[],records:[]};
describe.skipIf(process.env.JBL_LIVE_EVAL!=="1")("Live composable metrics (6 requests, opt-in)",()=>{
  it.each([
    ["Who is best in playoffs?",{metric:"win_percentage",gameType:"playoffs",ranking:"highest"}],
    ["Who has the most playoff points against from 2022 through 2025?",{metric:"total_points_against",gameType:"playoffs",startYear:2022,endYear:2025}],
    ["List everyone's PA/PF ratio in the regular season from 2022–2025, lowest first, minimum 20 games.",{metric:"points_against_to_points_for",gameType:"regular_season",startYear:2022,endYear:2025,ranking:"lowest",minimumGames:20,output:"list"}],
    ["Who had the highest PF/PA over a two-year stretch from 2022–2025?",{metric:"points_for_to_points_against",windowYears:2,startYear:2022,endYear:2025}],
  ] as [string,Partial<HistorianPlan>][])("%s",async(question,expected)=>{
    expect(await interpretHistorianQuestion(question,corpus)).toMatchObject({intent:"rank_metric",...expected});
  },15000);
  it("preserves the rolling window and phase when inverting a ratio",async()=>{
    const question="Who had the highest playoff PA/PF ratio over a two-year stretch from 2022–2025?";
    const plan=await interpretHistorianQuestion(question,corpus);
    expect(plan).toMatchObject({intent:"rank_metric",metric:"points_against_to_points_for",gameType:"playoffs",windowYears:2});
    const next=await interpretHistorianQuestion("Now flip that ratio.",corpus,{question,plan});
    expect(next).toMatchObject({intent:"rank_metric",metric:"points_for_to_points_against",gameType:"playoffs",windowYears:2,startYear:2022,endYear:2025});
  },30000);
});
