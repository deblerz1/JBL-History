import {it,expect} from "vitest";
import {ambiguousManagerQuestion,describeHistorianPlan} from "./historian-conversation";
import type {HistorianCorpus,HistorianManager,HistorianPlan} from "./historian";
const corpus={managers:[{memberId:"p",publicName:"Jack P",teamName:"Alpha"},{memberId:"v",publicName:"Jack V",teamName:"Bravo"}] as HistorianManager[],seasons:[],games:[],records:[],rivalries:[],champions:[]} satisfies HistorianCorpus;
it("asks which Jack and accepts an explicit identity",()=>{
  expect(ambiguousManagerQuestion("What is Jack’s record?",corpus)).toBe("Do you mean Jack P or Jack V?");
  expect(ambiguousManagerQuestion("Jack V",corpus)).toBeNull();
});
it("shows retained dates and playoff phase",()=>{
  const plan:HistorianPlan={intent:"manager_record",memberIds:["v"],startYear:2022,endYear:2025,gameType:"playoffs",metric:null,ranking:"highest",windowYears:null,minimumGames:null,population:"all",output:"single",limit:null};
  expect(describeHistorianPlan(plan,corpus)).toBe("Jack V · 2022–2025 · playoffs");
});
