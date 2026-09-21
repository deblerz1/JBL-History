import {describe,it,expect} from "vitest";
import {historianQuestions} from "./historian-questions";
import {deterministicHistorianPlan} from "./historian";

describe("Historian question inventory: shortcut boundaries",()=>{
  it.each(historianQuestions)("$id $question",testCase=>{
    const plan=deterministicHistorianPlan(testCase.question);
    if(testCase.shortcut)expect(plan).toMatchObject(testCase.expected);
    else expect(plan).toBeNull();
  });
});
