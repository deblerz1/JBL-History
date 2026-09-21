import {describe,expect,it} from "vitest";
import {answerHistorian,answerHistorianPlan,deterministicHistorianPlan,type HistorianCorpus,type HistorianPlan} from "./historian";

const corpus:HistorianCorpus={
  managers:[
    {memberId:"a",teamName:"Alpha",publicName:"Foz",championships:2,wins:50,losses:30,ties:0,winPercentage:.625,playoffAppearances:5,playoffWins:4,playoffLosses:3,playoffWinPercentage:.5714,pointsFor:12000},
    {memberId:"b",teamName:"Bravo",publicName:"Jack V",championships:1,wins:40,losses:40,ties:0,winPercentage:.5,playoffAppearances:3,playoffWins:2,playoffLosses:2,playoffWinPercentage:.5,pointsFor:11000},
  ],
  champions:[{year:2021,memberId:"a",teamName:"Old Alpha",publicName:"Foz",runnerUp:"Bravo",score:150,runnerUpScore:130}],
  rivalries:[{memberAId:"a",memberBId:"b",memberATeamName:"Alpha",memberBTeamName:"Bravo",memberAPublicName:"Foz",memberBPublicName:"Jack V",games:12,memberAWins:8,memberBWins:4,ties:0}],
  records:[{type:"highest_score",rank:1,year:2022,week:7,memberId:"a",teamName:"Alpha",publicName:"Foz",opponent:"Bravo",value:201.2}],
  seasons:[
    {year:2021,memberId:"a",teamName:"Old Alpha",wins:10,losses:4,ties:0,pointsFor:1700,finalStanding:1},
    {year:2022,memberId:"a",teamName:"New Alpha",wins:8,losses:6,ties:0,pointsFor:1600,finalStanding:3},
    {year:2023,memberId:"a",teamName:"Alpha",wins:7,losses:7,ties:0,pointsFor:1650,finalStanding:4},
  ],
  games:[
    {year:2021,memberId:"a",teamName:"Old Alpha",playoff:false,points:100,opponentPoints:90,result:"win"},
    {year:2021,memberId:"b",teamName:"Bravo",playoff:false,points:90,opponentPoints:100,result:"loss"},
    {year:2022,memberId:"a",teamName:"New Alpha",playoff:false,points:120,opponentPoints:100,result:"win"},
    {year:2022,memberId:"b",teamName:"Bravo",playoff:false,points:100,opponentPoints:120,result:"loss"},
    {year:2023,memberId:"a",teamName:"Alpha",playoff:false,points:80,opponentPoints:110,result:"loss"},
    {year:2023,memberId:"b",teamName:"Bravo",playoff:false,points:110,opponentPoints:80,result:"win"},
    {year:2023,memberId:"a",teamName:"Alpha",playoff:true,points:150,opponentPoints:130,result:"win"},
    {year:2023,memberId:"b",teamName:"Bravo",playoff:true,points:130,opponentPoints:150,result:"loss"},
  ],
};

const plan=(overrides:Partial<HistorianPlan>):HistorianPlan=>({intent:"unsupported",memberIds:[],startYear:null,endYear:null,metric:null,gameType:"regular_season",ranking:"highest",windowYears:null,minimumGames:null,population:"all",output:"single",limit:null,...overrides});

describe("JBL Historian",()=>{
  it("answers championship questions by year",()=>expect(answerHistorian("Who won the championship in 2021?",corpus).answer).toContain("Old Alpha"));
  it("resolves public manager names",()=>expect(answerHistorian("What is Foz's career record?",corpus).answer).toContain("50-30"));
  it("answers rivalry questions",()=>expect(answerHistorian("Foz vs Jack V head to head",corpus).answer).toContain("8-4"));
  it("calculates a date-range record from season rows",()=>{const result=answerHistorianPlan(plan({intent:"manager_record",memberIds:["a"],startYear:2022,endYear:2023}),corpus);expect(result.answer).toContain("15-13");expect(result.answer).toContain("53.6%");});
  it("ranks rolling two-season win percentages",()=>{const result=answerHistorianPlan(plan({intent:"rank_metric",metric:"win_percentage",windowYears:2}),corpus);expect(result.answer).toContain("Alpha");expect(result.answer).toContain("2021–2022");expect(result.answer).toContain("100.0%");});
  it("calculates regular-season points per game",()=>{const result=answerHistorianPlan(plan({intent:"rank_metric",metric:"points_per_game"}),corpus);expect(result.answer).toContain("Alpha");expect(result.answer).toContain("100.00");expect(result.facts).toContain("Formula: total points ÷ games played");});
  it("separates playoff points per game",()=>{const result=answerHistorianPlan(plan({intent:"rank_metric",metric:"points_per_game",gameType:"playoffs"}),corpus);expect(result.answer).toContain("150.00");expect(result.answer).toContain("playoff");});
  it("honors explicit minimum-game requirements",()=>expect(answerHistorianPlan(plan({intent:"rank_metric",metric:"points_per_game",gameType:"playoffs",minimumGames:2}),corpus).answer).toContain("No manager met"));
  it("limits rankings to managers active in every requested season",()=>{const lateManager={memberId:"c",teamName:"Charlie",publicName:"Zack",championships:0,wins:0,losses:1,ties:0,winPercentage:0,playoffAppearances:0,playoffWins:0,playoffLosses:0,playoffWinPercentage:null,pointsFor:70};const withLateManager={...corpus,managers:[...corpus.managers,lateManager],games:[...corpus.games,{year:2022,memberId:"c",teamName:"Charlie",playoff:false,points:70,opponentPoints:100,result:"loss" as const}]};const result=answerHistorianPlan(plan({intent:"rank_metric",metric:"wins",ranking:"lowest",startYear:2021,endYear:2022,population:"active_every_season"}),withLateManager);expect(result.answer).toContain("Bravo");expect(result.answer).not.toContain("Charlie");});
  it("returns a full record list instead of one winner",()=>{const result=answerHistorianPlan(plan({intent:"rank_metric",metric:"wins",startYear:2021,endYear:2023,output:"list"}),corpus);expect(result.answer).toContain("ranked");expect(result.facts.some(fact=>fact.includes("Alpha")&&fact.includes("2-1"))).toBe(true);expect(result.facts.some(fact=>fact.includes("Bravo")&&fact.includes("1-2"))).toBe(true);});
  it("deterministically plans a full team record list",()=>{const result=deterministicHistorianPlan("Give me a full list of all the team's records from 2022-2025");expect(result).toMatchObject({intent:"rank_metric",metric:"wins",startYear:2022,endYear:2025,gameType:"regular_season",output:"list",population:"all"});});
  it("deterministically plans the every-season fewest-wins question",()=>{const result=deterministicHistorianPlan("Of teams involved in every season, who had the fewest regular-season wins from 2022–2025?");expect(result).toMatchObject({metric:"wins",ranking:"lowest",startYear:2022,endYear:2025,population:"active_every_season",output:"single"});});
  it("rejects an unknown manager through a grounded response",()=>expect(answerHistorianPlan(plan({intent:"manager_record",memberIds:["missing"]}),corpus).answer).toContain("grounded questions"));
  it("does not invent unsupported answers",()=>expect(answerHistorian("Who made the best trade?",corpus).answer).toContain("grounded questions"));
});
