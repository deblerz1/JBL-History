import {expect,it} from "vitest";
import {answerHistorianPlan,type HistorianCorpus,type HistorianPlan} from "./historian";
import {applyHistorianFollowup} from "./historian-conversation";
const corpus:HistorianCorpus={managers:["a","b"].map(memberId=>({memberId,teamName:memberId,publicName:memberId,championships:0,wins:0,losses:0,ties:0,winPercentage:null,playoffAppearances:0,playoffWins:0,playoffLosses:0,playoffWinPercentage:null,pointsFor:0})),champions:[],rivalries:[],records:[],seasons:[],games:[
 {year:2024,memberId:"a",teamName:"old a",playoff:false,points:100,opponentPoints:80,result:"win"},
 {year:2025,memberId:"a",teamName:"a",playoff:false,points:60,opponentPoints:80,result:"loss"},
 {year:2025,memberId:"a",teamName:"a",playoff:true,points:90,opponentPoints:80,result:"win"},
 {year:2025,memberId:"b",teamName:"b",playoff:false,points:80,opponentPoints:60,result:"win"},
]};
const plan:HistorianPlan={intent:"rank_metric",metric:"wins",memberIds:["a"],startYear:2024,endYear:2025,gameType:"regular_season",ranking:"highest",windowYears:null,minimumGames:null,population:"all",output:"list",limit:null,groupBy:"season",measures:[{metric:"wins",gameType:"regular_season"},{metric:"points_per_game",gameType:"regular_season"},{metric:"win_percentage",gameType:"playoffs"}]};
it("separates year and phase without turning absent playoff games into zero",()=>{
 expect(answerHistorianPlan(plan,corpus).table!.rows).toEqual([["a","a","2024","1","100.00","—"],["a","a","2025","0","60.00","100.0%"]]);
});
it("aggregates the same metrics over the entire interval",()=>{
 expect(answerHistorianPlan({...plan,groupBy:"manager"},corpus).table!.rows).toEqual([["a","a","2024–2025","1","80.00","100.0%"]]);
});
it("does not silently drop unsupported rolling comparisons or playoff luck",()=>{
 expect(answerHistorianPlan({...plan,windowYears:2},corpus).table).toBeUndefined();
 expect(answerHistorianPlan({...plan,measures:[{metric:"schedule_luck",gameType:"playoffs"}]},corpus).answer).toContain("regular-season games only");
});
it("preserves a chain's measures and dates while changing only requested filters",()=>{
 const first=applyHistorianFollowup("Now playoffs only",{...plan,endYear:2026})!;
 expect(first.measures!.every(m=>m.gameType==="playoffs")).toBe(true);
 const second=applyHistorianFollowup("exclude 2026",first)!;
 const third=applyHistorianFollowup("show everyone",second)!;
 expect(third).toMatchObject({memberIds:[],startYear:2024,endYear:2025,groupBy:"season",gameType:"playoffs",output:"list"});
 expect(third.measures).toEqual(first.measures);
 expect(applyHistorianFollowup("exclude 2024",first)).toBeNull();
});

it("applies every-season qualification across the full interval before grouping",()=>{
 const c={...corpus,seasons:[2024,2025].map(year=>({year,memberId:"a",teamName:`Historic a ${year}`,wins:0,losses:0,ties:0,pointsFor:0,finalStanding:null}))};
 const result=answerHistorianPlan({...plan,memberIds:[],population:"active_every_season"},c);
 expect(result.table!.rows.map(r=>r[0])).toEqual(["Historic a 2024","Historic a 2025"]);
 expect(answerHistorianPlan({...plan,minimumGames:100},c).answer).toContain("No manager met");
});
