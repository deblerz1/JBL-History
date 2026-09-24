import {it,expect,vi} from "vitest";
import type {HistorianCorpus} from "./historian";
vi.mock("server-only",()=>({}));
import {interpretHistorianQuestion} from "./historian-llm";
const corpus:HistorianCorpus={managers:[["z","Zach"],["f","Foz"]].map(([memberId,publicName])=>({memberId,publicName,teamName:publicName+" Team",championships:0,wins:0,losses:0,ties:0,winPercentage:null,playoffAppearances:0,playoffWins:0,playoffLosses:0,playoffWinPercentage:null,pointsFor:0})),games:[],seasons:[],records:[],champions:[],rivalries:[]};
const live=it.skipIf(process.env.JBL_LIVE_EVAL!=="1");
live("plans historical year-by-year records",async()=>{
 const p=await interpretHistorianQuestion("Show Zach's regular-season record each year from 2020 through 2025.",corpus);
 expect(p).toMatchObject({intent:"rank_metric",memberIds:["z"],startYear:2020,endYear:2025,groupBy:"season",output:"list"});
 expect(p?.measures?.map(m=>m.metric)).toEqual(["wins","losses","ties","win_percentage"]);
},15000);
live("compares multiple metrics with separate phases",async()=>{
 const p=await interpretHistorianQuestion("Compare Zach and Foz from 2022–2025 on regular-season wins, regular-season points per game, and playoff win percentage.",corpus);
 expect(p?.memberIds.slice().sort()).toEqual(["f","z"]);
 expect(p).toMatchObject({intent:"rank_metric",startYear:2022,endYear:2025,groupBy:"manager",measures:[{metric:"wins",gameType:"regular_season"},{metric:"points_per_game",gameType:"regular_season"},{metric:"win_percentage",gameType:"playoffs"}]});
},15000);
live("preserves structured meaning over four turns",async()=>{
 let question="Show Zach's wins and points per game, each year from 2022 through 2026.";
 let plan=await interpretHistorianQuestion(question,corpus);
 expect(plan).toMatchObject({groupBy:"season",memberIds:["z"],startYear:2022,endYear:2026});
 for(const next of ["Now playoffs only","exclude 2026","show everyone"]){plan=await interpretHistorianQuestion(next,corpus,{question,plan});question=next;expect(plan).not.toBeNull();}
 expect(plan).toMatchObject({memberIds:[],startYear:2022,endYear:2025,gameType:"playoffs",groupBy:"season"});
 expect(plan?.measures).toEqual([{metric:"wins",gameType:"playoffs"},{metric:"points_per_game",gameType:"playoffs"}]);
},45000);
