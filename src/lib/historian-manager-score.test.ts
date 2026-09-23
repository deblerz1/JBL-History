import {expect,it} from "vitest";
import {answerManagerScore,calculateManagerScores} from "./historian-manager-score";
import type {HistorianCorpus,HistorianGame,HistorianPlan} from "./historian";
function fixture():HistorianCorpus{
  const corpus:HistorianCorpus={formats:[],managers:["a","b","c","d"].map(memberId=>({memberId,teamName:memberId,publicName:null,championships:0,wins:0,losses:0,ties:0,winPercentage:null,playoffAppearances:0,playoffWins:0,playoffLosses:0,playoffWinPercentage:null,pointsFor:0})),games:[],seasons:[],champions:[],records:[],rivalries:[]};
  for(const year of [2023,2024,2025]){
    corpus.formats!.push({year,complete:true,teamCount:4,playoffSpots:2,regularWeeks:2,roundWeeks:[1],byes:0,qualificationKnown:true});
    for(const [i,id] of ["a","b","c","d"].entries())corpus.seasons.push({year,memberId:id,teamName:id,wins:0,losses:0,ties:0,pointsFor:0,finalStanding:4-i,playoffSeed:i+1});
    const pair=(a:string,b:string,pa:number,pb:number,week:number,playoff=false)=>{
      for(const [id,op,points,against] of [[a,b,pa,pb],[b,a,pb,pa]] as [string,string,number,number][])corpus.games.push({year,memberId:id,opponentMemberId:op,teamName:id,week,scoringPeriodCount:1,playoff,points,opponentPoints:against,result:points===against?"tie":points>against?"win":"loss"});
    };
    pair("a","b",100,80,1);pair("c","d",60,40,1);pair("a","c",100,60,2);pair("b","d",80,40,2);pair("a","b",100,80,3,true);
    corpus.champions.push({year,memberId:"a",teamName:"a",publicName:null,runnerUp:"b",score:100,runnerUpScore:80});
  }
  return corpus;
}
const plan:HistorianPlan={intent:"best_manager",memberIds:[],startYear:null,endYear:null,metric:null,gameType:"regular_season",ranking:"highest",windowYears:null,minimumGames:null,population:"all",output:"list",limit:null};
it("calculates the agreed weights against hand-calculated records, ignoring consolation standings",()=>{
  const result=calculateManagerScores(fixture());expect(result.error).toBeUndefined();
  const a=result.rows.find(r=>r.memberId==="a")!,b=result.rows.find(r=>r.memberId==="b")!,d=result.rows.find(r=>r.memberId==="d")!;
  expect(a.best).toBe(100);expect(a.bestComponents).toEqual([100,100,100,100]);
  expect(b.best).toBe(30);expect(d.worst).toBe(100);expect(d.lastPlaces).toBe(3);
  expect(d.bestComponents).toEqual([0,0,0,0]);expect(d.playoffGames).toBe(0);
});
it("excludes active seasons even when they contain extreme results",()=>{
  const c=fixture(),before=calculateManagerScores(c);
  c.formats!.push({...c.formats![0],year:2026,complete:false});
  c.games.push({...c.games[0],year:2026,points:99999});
  expect(calculateManagerScores(c)).toEqual(before);
});
it("scoring adjustment is invariant to multiplying an entire season's scores",()=>{
  const c=fixture(),before=calculateManagerScores(c).rows;
  c.games=c.games.map(g=>g.year===2024?{...g,points:g.points*10,opponentPoints:g.opponentPoints*10}:g);
  expect(calculateManagerScores(c).rows.map(r=>r.scoringStrength)).toEqual(before.map(r=>r.scoringStrength));
});
it("keeps short careers provisional and out of the qualified leader selection",()=>{
  const c=fixture();c.managers.push({...c.managers[0],memberId:"new",teamName:"New"});
  c.seasons=c.seasons.map(s=>s.year===2025&&s.memberId==="a"?{...s,memberId:"new"}:s);
  c.games=c.games.map(g=>g.year===2025?{...g,memberId:g.memberId==="a"?"new":g.memberId,opponentMemberId:g.opponentMemberId==="a"?"new":g.opponentMemberId}:g);
  c.champions=c.champions.map(s=>s.year===2025?{...s,memberId:"new"}:s);
  const answer=answerManagerScore({...plan,output:"single"},c);
  expect(answer.answer).toContain("b:");
  const own=answerManagerScore({...plan,memberIds:["new"]},c);expect(own.table!.rows[0][1]).toBe("Provisional");
  const list=answerManagerScore(plan,c).table!.rows;expect(list.slice(-2).every(r=>r[1]==="Provisional")).toBe(true);
});
it("does not change normalization when selecting one manager",()=>{
  const c=fixture(),all=answerManagerScore({...plan,intent:"worst_manager"},c);
  const own=answerManagerScore({...plan,intent:"worst_manager",memberIds:["c"]},c);
  expect(own.table!.rows[0]).toEqual(all.table!.rows.find(r=>r[0]==="c"));
});
it("fails closed for missing regular games, missing playoff games and absent champions",()=>{
  for(const type of ["regular","playoff","champion"]){const c=fixture();if(type==="champion")c.champions.pop();else c.games.splice(c.games.findIndex(g=>g.playoff===(type==="playoff")),1);expect(calculateManagerScores(c).error).toContain("coverage");}
});
it("date filters apply qualification inside the requested range",()=>{
  expect(calculateManagerScores(fixture(),2024,2025).error).toContain("three completed seasons");
  expect(calculateManagerScores(fixture(),2026,2026).error).toContain("No verified completed");
});
it("does not drop unsupported rolling, phase or metric filters",()=>{
  for(const change of [{windowYears:2},{gameType:"playoffs"},{metric:"wins"}] as Partial<HistorianPlan>[])expect(answerManagerScore({...plan,...change},fixture()).answer).toContain("haven't dropped");
});
it("ties share last place and equal scoring components",()=>{
  const c=fixture();c.games=c.games.map(g=>!g.playoff?{...g,points:50,opponentPoints:50,result:"tie" as HistorianGame["result"]}:g);
  const result=calculateManagerScores(c);
  expect(result.rows.every(r=>r.lastPlaces===3&&r.worstComponents[2]===50)).toBe(true);
  const answer=answerManagerScore({...plan,intent:"worst_manager"},c);expect(answer.notes!.some(n=>n.startsWith("Statistically tied"))).toBe(true);
});
it("renders matching columns and exposes component weights for both formulas",()=>{
  for(const intent of ["best_manager","worst_manager"] as const){const r=answerManagerScore({...plan,intent},fixture());expect(r.table!.rows.every(row=>row.length===r.table!.columns.length)).toBe(true);expect(r.notes!.join(" ")).toContain("40%");}
});
