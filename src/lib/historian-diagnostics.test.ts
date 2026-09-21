import {describe,expect,it} from "vitest";
import {plannerDiagnostic,responseProblem} from "./historian-diagnostics";

describe("planner diagnostics",()=>{
  it("rejects incomplete output before parsing",()=>expect(responseProblem({status:"incomplete",output_text:'{"intent":'})).toBe("incomplete"));
  it("distinguishes refusal",()=>expect(responseProblem({status:"completed",output:[{content:[{type:"refusal",refusal:"private text"}]}]})).toBe("refusal"));
  it("accepts completed responses",()=>expect(responseProblem({status:"completed",output:[]})).toBeNull());
  it("handles absent responses",()=>expect(responseProblem(null)).toBe("empty_output"));
  it("logs only approved metadata",()=>{
    const event=plannerDiagnostic("test-request",Date.now(),"http_error",429);
    expect(Object.keys(event).sort()).toEqual(["event","requestId","build","outcome","durationMs","httpStatus"].sort());
    expect(event.httpStatus).toBe(429);
    expect(event.durationMs).toBeGreaterThanOrEqual(0);
  });
});
