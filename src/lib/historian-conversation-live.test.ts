import {it,expect,vi} from "vitest";
import type {HistorianCorpus} from "./historian";
vi.mock("server-only",()=>({}));
const corpus:HistorianCorpus={managers:[["z","Zach"],["f","Foz"]].map(([memberId,publicName])=>({memberId,publicName,teamName:publicName+" Team",championships:0,wins:0,losses:0,ties:0,winPercentage:null,playoffAppearances:0,playoffWins:0,playoffLosses:0,playoffWinPercentage:null,pointsFor:0})),games:[],seasons:[],records:[],champions:[],rivalries:[]};
it.skipIf(process.env.JBL_LIVE_EVAL!=="1")("retains dates and phase through a three-turn manager comparison",async()=>{
  const {interpretHistorianQuestion}=await import("./historian-llm");
  const question="What is Zach's regular-season record from 2022–2025?";
  const first=await interpretHistorianQuestion(question,corpus);
  expect(first).toMatchObject({memberIds:["z"],startYear:2022,endYear:2025});
  const second=await interpretHistorianQuestion("Now playoffs only",corpus,{question,plan:first});
  expect(second).toMatchObject({memberIds:["z"],startYear:2022,endYear:2025,gameType:"playoffs"});
  const third=await interpretHistorianQuestion("Compare that with Foz",corpus,{question:"Now playoffs only",plan:second});
  expect(third).toMatchObject({intent:"rank_metric",metric:"wins",output:"list",startYear:2022,endYear:2025,gameType:"playoffs"});
  expect(third?.memberIds.slice().sort()).toEqual(["f","z"]);
},35000);
