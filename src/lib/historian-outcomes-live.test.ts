import {describe,it,expect,vi} from "vitest";
import type {HistorianCorpus} from "./historian";
vi.mock("server-only",()=>({}));
import {interpretHistorianQuestion} from "./historian-llm";
const corpus:HistorianCorpus={managers:[{memberId:"z",publicName:"Zach",teamName:"Alpha",championships:0,wins:0,losses:0,ties:0,winPercentage:null,playoffAppearances:0,playoffWins:0,playoffLosses:0,playoffWinPercentage:null,pointsFor:0}],seasons:[],games:[],champions:[],records:[],rivalries:[],formats:[{year:2026,complete:false,teamCount:10,playoffSpots:6,regularWeeks:14,roundWeeks:[1,1,1],byes:2,qualificationKnown:false}]};
describe.skipIf(process.env.JBL_LIVE_EVAL!=="1")("Live conditional outcomes (6 requests)",()=>{
  it("interprets 0-2 playoff chances and preserves the condition across format and manager follow-ups",async()=>{
    const question="What's the league's historical chance of making the playoffs after starting 0-2?";
    const first=await interpretHistorianQuestion(question,corpus);
    expect(first).toMatchObject({intent:"conditional_outcome",memberIds:[],condition:{throughWeek:2,wins:0,losses:2,ties:0,outcome:"playoffs",format:"current"}});
    const second=await interpretHistorianQuestion("Now across all formats",corpus,{question,plan:first});
    expect(second).toMatchObject({intent:"conditional_outcome",condition:{throughWeek:2,wins:0,losses:2,format:"all"}});
    const third=await interpretHistorianQuestion("Only Zach",corpus,{question:"Now across all formats",plan:second});
    expect(third).toMatchObject({intent:"conditional_outcome",memberIds:["z"],condition:{throughWeek:2,wins:0,losses:2,format:"all"}});
  },35000);
  it.each([
    ["How often did 0-2 teams make the playoffs under the 2022 format?",{format:"year",formatYear:2022,wins:0,losses:2}],
    ["Compare playoff rates across formats for teams below .500 after Week 6",{recordMode:"below_500",throughWeek:6,wins:null,losses:null,ties:null,format:"compare"}],
    ["In ten-team seasons, how often did 3-0 teams win the championship?",{throughWeek:3,wins:3,losses:0,outcome:"champion",format:"team_count",teamCount:10}],
  ])("%s",async(question,condition)=>{
    expect(await interpretHistorianQuestion(question as string,corpus)).toMatchObject({intent:"conditional_outcome",condition,startYear:null,endYear:null});
  },15000);
});
