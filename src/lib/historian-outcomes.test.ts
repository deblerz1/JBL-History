import {describe,it,expect} from "vitest";
import {answerHistorianPlan,type HistorianCorpus,type HistorianPlan} from "./historian";
import {validOutcome,type OutcomeQuery,type SeasonFormat} from "./historian-outcomes";
const condition:OutcomeQuery={throughWeek:2,recordMode:"exact",wins:0,losses:2,ties:0,outcome:"playoffs",format:"current",formatYear:null,teamCount:null};
const plan=(q:Partial<OutcomeQuery>={},rest:Partial<HistorianPlan>={}):HistorianPlan=>({intent:"conditional_outcome",condition:{...condition,...q},memberIds:[],startYear:null,endYear:null,metric:null,gameType:"regular_season",ranking:"highest",windowYears:null,minimumGames:null,population:"all",output:"single",limit:null,...rest});
const ids=["a","b","c","d"];
const formats:SeasonFormat[]=[2023,2024,2025,2026].map(year=>({year,complete:year!==2026,teamCount:4,playoffSpots:year===2023?4:2,regularWeeks:3,roundWeeks:year===2023?[1,1]:[1],byes:0,qualificationKnown:true}));
const corpus:HistorianCorpus={formats,managers:ids.map(memberId=>({memberId,publicName:memberId,teamName:memberId,championships:0,wins:0,losses:0,ties:0,winPercentage:null,playoffAppearances:0,playoffWins:0,playoffLosses:0,playoffWinPercentage:null,pointsFor:0})),seasons:formats.flatMap(f=>ids.map((memberId,i)=>({year:f.year,memberId,teamName:`${memberId}-${f.year}`,wins:0,losses:0,ties:0,pointsFor:0,finalStanding:i+1,playoffSeed:memberId==="a"?(f.year===2025?3:1):memberId==="c"?(f.year===2025?1:3):i+1}))),games:formats.flatMap(f=>ids.flatMap((memberId,i)=>[1,2,3].map(week=>({year:f.year,memberId,opponentMemberId:ids[i^1],teamName:memberId,week,scoringPeriodCount:1,playoff:false,points:i%2===0?80:100,opponentPoints:i%2===0?100:80,result:i%2===0?"loss" as const:"win" as const})))),champions:formats.map(f=>({year:f.year,memberId:f.year===2025?"c":"a",teamName:"Winner",publicName:null,runnerUp:"Runner up",score:100,runnerUpScore:90})),records:[],rivalries:[]};
describe("conditional historical outcomes",()=>{
  it("defaults to latest team count and playoff spots, excluding the active year",()=>{
    const r=answerHistorianPlan(plan(),corpus);
    expect(r.answer).toContain("2 of 4");expect(r.answer).toContain("50.0%");
    expect(r.table?.rows.map(r=>r[0])).toEqual(["2024","2024","2025","2025"]);
    expect(r.notes?.join(" ")).toContain("Small sample");
  });
  it("can pool formats explicitly and filter one manager",()=>{
    expect(answerHistorianPlan(plan({format:"all"}),corpus).answer).toContain("4 of 6");
    const r=answerHistorianPlan(plan({}, {memberIds:["a"]}),corpus);
    expect(r.answer).toContain("1 of 2");expect(r.table?.rows.every(row=>row[1].startsWith("a-"))).toBe(true);
  });
  it("matches a named year including playoff round lengths",()=>{
    const changed={...corpus,formats:formats.map(f=>f.year===2025?{...f,roundWeeks:[2]}:f)};
    expect(answerHistorianPlan(plan({format:"year",formatYear:2024}),changed).table?.rows.map(r=>r[0])).toEqual(["2024","2024"]);
  });
  it("separates formats and honors team-count and calendar filters",()=>{
    expect(answerHistorianPlan(plan({format:"compare"}),corpus).table?.rows).toHaveLength(2);
    expect(answerHistorianPlan(plan({format:"team_count",teamCount:4},{startYear:2023,endYear:2023}),corpus).answer).toContain("2 of 2");
  });
  it("counts seed-qualified managers even with no playoff wins or first-round game",()=>{
    expect(answerHistorianPlan(plan({}, {memberIds:["a"],startYear:2024,endYear:2024}),corpus).answer).toContain("1 of 1");
  });
  it("supports championships and below-.500 checkpoints",()=>{
    const r=answerHistorianPlan(plan({recordMode:"below_500",wins:null,losses:null,ties:null,outcome:"champion"}),corpus);
    expect(r.answer).toContain("won the championship in 2 of 4");
  });
  it.each(["missing_week","duplicate_week","unknown_seed","unknown_qualification"])("excludes an entire unverifiable season: %s",reason=>{
    const changed=structuredClone(corpus);
    if(reason==="missing_week")changed.games=changed.games.filter(g=>!(g.year===2024&&g.memberId==="a"&&g.week===1));
    if(reason==="duplicate_week")changed.games.push({...changed.games.find(g=>g.year===2024)!});
    if(reason==="unknown_seed")changed.seasons.find(s=>s.year===2024)!.playoffSeed=null;
    if(reason==="unknown_qualification")changed.formats!.find(f=>f.year===2024)!.qualificationKnown=false;
    const r=answerHistorianPlan(plan(),changed);expect(r.answer).toContain("1 of 2");expect(r.notes?.join(" ")).toContain("coverage: 2024");
  });
  it("returns no estimate for an empty cohort, not zero percent",()=>{
    const r=answerHistorianPlan(plan({wins:1,losses:1}),corpus);expect(r.answer).toContain("No percentage");expect(r.answer).not.toContain("0.0%");
  });
  it("rejects impossible records and keeps missing formats explicit",()=>{
    expect(validOutcome({...condition,wins:3})).toBe(false);
    expect(validOutcome({...condition,format:"year",formatYear:null})).toBe(false);
    expect(answerHistorianPlan(plan({format:"year",formatYear:2018}),corpus).answer).toContain("not verified");
  });
  it("treats ties as half a win when checking below .500",()=>{
    const tied={...corpus,games:corpus.games.map(g=>({...g,result:"tie" as const}))};
    expect(answerHistorianPlan(plan({recordMode:"below_500",wins:null,losses:null,ties:null}),tied).answer).toContain("No percentage");
  });
});
