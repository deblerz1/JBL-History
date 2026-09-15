import { describe,expect,it } from "vitest";
import { playoffRoundName,scoringPeriodLabel } from "./playoffs";

describe("playoff exhibit labels",()=>{
  it("names rounds relative to the championship",()=>{
    expect(playoffRoundName(1,3)).toBe("Quarterfinals");
    expect(playoffRoundName(2,3)).toBe("Semifinals");
    expect(playoffRoundName(3,3)).toBe("Championship");
  });

  it("makes multi-week series explicit",()=>{
    expect(scoringPeriodLabel([16])).toBe("Week 16");
    expect(scoringPeriodLabel([16,17])).toBe("Weeks 16–17");
  });
});
