import { describe,expect,it } from "vitest";
import type { Rivalry } from "@/lib/data/museum";
import { rivalryDisparity,rivalryWinRate,sortRivalries } from "./rivalries";

const rivalry=(a:number,b:number,ties=0):Rivalry=>({memberAId:"a",memberBId:"b",memberATeamName:"A",memberBTeamName:"B",memberAPublicName:null,memberBPublicName:null,games:a+b+ties,memberAWins:a,memberBWins:b,ties,memberAPoints:0,memberBPoints:0});

describe("rivalry calculations",()=>{
  it("awards half a win for a tie",()=>expect(rivalryWinRate(4,1,10)).toBe(.45));
  it("calculates the percentage gap",()=>expect(rivalryDisparity(rivalry(7,3))).toBeCloseTo(.4));
  it("defaults the largest gap to the top",()=>expect(sortRivalries([rivalry(6,4),rivalry(9,1)],"disparity")[0].memberAWins).toBe(9));
});
