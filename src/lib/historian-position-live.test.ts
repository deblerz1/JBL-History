import {describe,expect,it,vi} from "vitest";
import type {HistorianCorpus,HistorianPlan} from "./historian";
vi.mock("server-only",()=>({}));
import {interpretHistorianQuestion} from "./historian-llm";
const corpus:HistorianCorpus={managers:[{memberId:"z",publicName:"Zach",teamName:"Synthetic Team",championships:0,wins:0,losses:0,ties:0,winPercentage:null,playoffAppearances:0,playoffWins:0,playoffLosses:0,playoffWinPercentage:null,pointsFor:0}],seasons:[],games:[],champions:[],rivalries:[],records:[]};
describe.skipIf(process.env.JBL_LIVE_EVAL!=="1")("Live positional scoring (6 requests, opt-in)",()=>{
  it.each([
    ["Who got the most points from running backs in 2025?",{intent:"rank_metric",position:"RB",metric:"position_points",startYear:2025,endYear:2025}],
    ["What percentage of Zach's points came from wide receivers in 2025?",{intent:"rank_metric",memberIds:["z"],position:"WR",metric:"position_scoring_share",startYear:2025,endYear:2025}],
    ["List everyone by playoff RB points per game from 2023 through 2025.",{intent:"rank_metric",position:"RB",metric:"position_points_per_game",gameType:"playoffs",startYear:2023,endYear:2025,output:"list"}],
    ["Who has the most running back points including the bench?",{intent:"unsupported"}],
  ] as [string,Partial<HistorianPlan>][])("%s",async(question,expected)=>{
    expect(await interpretHistorianQuestion(question,corpus)).toMatchObject(expected);
  },15000);
  it("preserves manager, dates and phase when switching position",async()=>{
    const question="How many playoff RB points did Zach score from 2023–2025?";
    const first=await interpretHistorianQuestion(question,corpus);
    expect(first).toMatchObject({intent:"rank_metric",position:"RB",metric:"position_points",memberIds:["z"],gameType:"playoffs"});
    const next=await interpretHistorianQuestion("Now wide receivers",corpus,{question,plan:first});
    expect(next).toMatchObject({intent:"rank_metric",position:"WR",metric:"position_points",memberIds:["z"],gameType:"playoffs",startYear:2023,endYear:2025});
  },30000);
});
