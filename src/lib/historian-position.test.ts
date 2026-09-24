import {confirmedAdjustments,commissionerAdjustment} from "./commissioner-adjustments";
import {expect,it} from "vitest";
import {answerHistorianPlan,type HistorianCorpus,type HistorianGame,type HistorianPlan} from "./historian";
import {positionScope,verifyPositionGames,type PositionSnapshot} from "./historian-position";
const game:HistorianGame={seasonTeamId:"ta",scoringWeeks:[1],year:2025,memberId:"a",teamName:"Alpha",playoff:false,points:30,opponentPoints:20,result:"win"};
const row=(overrides:Partial<PositionSnapshot>={}):PositionSnapshot=>({season_team_id:"ta",player_id:"r",matchup_period:1,lineup_slot:"RB/WR/TE",points:10,historical_position:"RB",...overrides});
const snapshots=[row(),row({player_id:"q",lineup_slot:"QB",historical_position:"QB",points:20}),row({player_id:"b",lineup_slot:"BE",points:99})];
const plan:HistorianPlan={intent:"rank_metric",position:"RB",metric:"position_points",memberIds:[],startYear:2025,endYear:2025,gameType:"regular_season",ranking:"highest",windowYears:null,minimumGames:null,population:"all",output:"single",limit:null};
const corpus=(games:HistorianGame[]):HistorianCorpus=>({games,seasons:[],records:[],rivalries:[],champions:[],managers:["a","b"].map(memberId=>({memberId,teamName:memberId,publicName:null,championships:0,wins:0,losses:0,ties:0,winPercentage:null,playoffAppearances:0,playoffWins:0,playoffLosses:0,playoffWinPercentage:null,pointsFor:0}))});
it("counts FLEX by historical position, excludes bench and IR, and retains team totals",()=>{
  const [verified]=verifyPositionGames([game],[...snapshots,row({player_id:"ir",lineup_slot:"IR",points:50})],"RB");
  expect(verified).toMatchObject({positionPoints:10,positionVerified:"RB",points:30});
  expect(answerHistorianPlan({...plan,metric:"position_scoring_share"},corpus([verified])).answer).toContain("33.3%");
});
it("sums both weeks of a playoff matchup once and uses matchups as the denominator",()=>{
  const games=verifyPositionGames([{...game,playoff:true,scoringWeeks:[1,2],points:60}],[...snapshots,...snapshots.map(r=>({...r,matchup_period:2}))],"RB");
  expect(games[0].positionPoints).toBe(20);
  const answer=answerHistorianPlan({...plan,gameType:"playoffs",metric:"position_points_per_game"},corpus(games));
  expect(answer.answer).toContain("20.00");expect(answer.facts.join(" ")).toContain("counts as one game");
});
it.each([
  ["missing week",{...game,scoringWeeks:[1,2]},snapshots],
  ["duplicate player",game,[...snapshots,snapshots[0]]],
  ["unknown position",game,[row({historical_position:null}),snapshots[1]]],
  ["null points",game,[row({points:null}),snapshots[1]]],
  ["unknown slot",game,[row({lineup_slot:"UNKNOWN"}),snapshots[1]]],
  ["official discrepancy",{...game,points:47.1},snapshots],
  ["absent mapping",{...game,scoringWeeks:undefined},snapshots],
] as [string,HistorianGame,PositionSnapshot[]][])("blocks %s instead of returning partial totals",(_label,g,rows)=>{
  const verified=verifyPositionGames([g],rows,"RB");
  expect(verified[0].positionFailure).toBeTruthy();
  expect(answerHistorianPlan(plan,corpus(verified)).answer).toContain("can't give a reliable");
});
it("a valid manager query is not blocked by another manager's missing lineup",()=>{
  const games=verifyPositionGames([game,{...game,memberId:"b",seasonTeamId:"tb"}],snapshots,"RB");
  expect(answerHistorianPlan(plan,corpus(games)).answer).toContain("can't give a reliable");
  expect(answerHistorianPlan({...plan,memberIds:["a"]},corpus(games)).answer).toContain("10.00");
});
it("zero official total produces an undefined share, not infinity",()=>{
  const games=verifyPositionGames([{...game,points:0}],[row({points:0})],"RB");
  expect(answerHistorianPlan({...plan,metric:"position_scoring_share"},corpus(games)).answer).toContain("undefined");
});
it("does not reuse RB verification as WR verification",()=>{
  const games=verifyPositionGames([game],snapshots,"RB");
  expect(answerHistorianPlan({...plan,position:"WR"},corpus(games)).answer).toContain("can't give a reliable");
});
it("supports zero position points, phase/date filters and empty corpora",()=>{
  const games=verifyPositionGames([game],snapshots,"WR");
  expect(answerHistorianPlan({...plan,position:"WR"},corpus(games)).answer).toContain("0.00");
  expect(positionScope({...plan,gameType:"playoffs"},corpus(games))).toEqual([]);
  expect(positionScope({...plan,startYear:2026,endYear:2026},corpus(games))).toEqual([]);
  expect(positionScope(plan,corpus([]))).toEqual([]);
});

it.each(confirmedAdjustments)("reconciles confirmed adjustment $year week $week without assigning it to a position",a=>{
 const g={...game,year:a.year,seasonTeamId:a.seasonTeamId,scoringWeeks:[a.week],points:30+a.points};
 const roster=snapshots.map(r=>({...r,season_team_id:a.seasonTeamId,matchup_period:a.week}));
 const verified=verifyPositionGames([g],roster,"RB");
 expect(verified[0].positionPoints).toBe(10);
 expect(verified[0].points).toBe(30+a.points);
 expect(verified[0].positionFailure).toBeUndefined();
 const answer=answerHistorianPlan({...plan,startYear:a.year,endYear:a.year},corpus(verified));
 expect(answer.facts.join(" ")).toContain(`+${a.points.toFixed(2)} commissioner adjustment`);
 expect(verifyPositionGames([{...g,points:g.points+1}],roster,"RB")[0].positionFailure).toBeTruthy();
 expect(commissionerAdjustment(a.year,"other",[a.week])).toBe(0);
 expect(commissionerAdjustment(a.year,a.seasonTeamId,[a.week+1])).toBe(0);
});
