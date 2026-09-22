import {describe,it,expect} from "vitest";
import {prepareLuckGames} from "./historian-luck";
import {answerHistorianPlan,type HistorianCorpus,type HistorianPlan} from "./historian";
const ids=["a","b","c","d"];
const corpus:HistorianCorpus={managers:ids.map(memberId=>({memberId,teamName:memberId,publicName:memberId,championships:0,wins:0,losses:0,ties:0,winPercentage:null,playoffAppearances:0,playoffWins:0,playoffLosses:0,playoffWinPercentage:null,pointsFor:0})),seasons:ids.map(memberId=>({memberId,year:2025,teamName:memberId,wins:0,losses:0,ties:0,pointsFor:0,finalStanding:null})),champions:[],records:[],rivalries:[],games:ids.map((memberId,i)=>({memberId,opponentMemberId:ids[i^1],year:2025,week:1,scoringPeriodCount:1,teamName:memberId,playoff:false,points:[100,90,120,110][i],opponentPoints:[90,100,110,120][i],result:i%2===0?"win":"loss"}))};
const plan:HistorianPlan={intent:"rank_metric",metric:"schedule_luck",memberIds:[],startYear:2025,endYear:2025,gameType:"regular_season",ranking:"highest",windowYears:null,minimumGames:null,population:"all",output:"single",limit:null};
describe("schedule luck coverage and calculation",()=>{
  it("uses every other team and conserves expected wins",()=>{
    const result=prepareLuckGames(corpus,null,null);
    expect(result.completeWeeks).toBe(1);
    expect(result.games.map(g=>g.expectedWins)).toEqual([1/3,0,1,2/3]);
    expect(result.games.reduce((s,g)=>s+g.expectedWins,0)).toBe(2);
  });
  it("keeps the full comparison population for a manager-specific question",()=>{
    const answer=answerHistorianPlan({...plan,memberIds:["a"]},corpus);
    expect(answer.answer).toContain("0.67");
    expect(answer.facts.join(" ")).toContain("1 complete league weeks");
    expect(answerHistorianPlan({...plan,ranking:"lowest"},corpus).answer).toContain("d has the lowest");
  });
  it("counts tied scores as half an expected win",()=>{
    const tied={...corpus,games:corpus.games.map(g=>({...g,points:100,opponentPoints:100,result:"tie" as const}))};
    expect(prepareLuckGames(tied,null,null).games.every(g=>g.expectedWins===.5)).toBe(true);
    expect(answerHistorianPlan(plan,tied).answer).toContain("0.00");
  });
  it.each(["missing","duplicate","multiweek","unknown","nonfinite","opponent"])("excludes %s weeks rather than estimating",reason=>{
    const games=corpus.games.map(g=>({...g}));
    if(reason==="missing")games.pop();
    if(reason==="duplicate")games.push({...games[0]});
    if(reason==="multiweek")games[0].scoringPeriodCount=2;
    if(reason==="unknown")games[0].scoringPeriodCount=undefined;
    if(reason==="nonfinite")games[0].points=NaN;
    if(reason==="opponent")games[0].opponentMemberId="c";
    const result=prepareLuckGames({...corpus,games},null,null);
    expect(result.games).toHaveLength(0);
    expect(result.excluded).toHaveLength(1);
  });
  it("rejects playoffs and enforces sample thresholds",()=>{
    expect(answerHistorianPlan({...plan,gameType:"playoffs"},corpus).answer).toContain("regular-season games only");
    expect(answerHistorianPlan({...plan,minimumGames:2},corpus).answer).toContain("No manager met");
  });
  it("composes windows, date filters, list output and per-game normalization",()=>{
    const twoYears={...corpus,seasons:[...corpus.seasons,...corpus.seasons.map(s=>({...s,year:2024}))],games:[...corpus.games,...corpus.games.map(g=>({...g,year:2024}))]};
    const answer=answerHistorianPlan({...plan,startYear:2024,windowYears:2,output:"list",metric:"schedule_luck_per_game"},twoYears);
    expect(answer.table?.rows[0][0]).toBe("a");
    expect(answer.table?.rows[0][4]).toBe("0.67");
    expect(answer.table?.rows[0][2]).toBe("2-0");
    expect(answerHistorianPlan({...plan,startYear:2026,endYear:2026},twoYears).answer).toContain("No completed");
  });
});
