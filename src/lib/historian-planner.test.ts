import {afterEach,it,expect,vi} from "vitest";
import type {HistorianCorpus} from "./historian";
vi.mock("server-only",()=>({}));
const corpus:HistorianCorpus={managers:[],seasons:[],games:[],champions:[],records:[],rivalries:[]};
afterEach(()=>{vi.unstubAllGlobals();vi.unstubAllEnvs();vi.restoreAllMocks();});
it("does not call the provider for an exact supported shortcut",async()=>{
  const fetchMock=vi.fn();vi.stubGlobal("fetch",fetchMock);
  vi.spyOn(console,"info").mockImplementation(()=>{});
  const {interpretHistorianQuestion}=await import("./historian-llm");
  expect(await interpretHistorianQuestion("List everyone's record from 2022–2025",corpus)).toMatchObject({output:"list",startYear:2022,endYear:2025});
  expect(fetchMock).not.toHaveBeenCalled();
});
it.each([
  {status:"incomplete",output_text:"{}"},
  {status:"completed",output_text:"not json"},
  {status:"completed",output_text:JSON.stringify({intent:"rank_metric",memberIds:["unknown"]})},
])("rejects unusable provider responses without inventing a plan",async payload=>{
  vi.stubEnv("OPENAI_API_KEY","synthetic-test-key");
  vi.stubGlobal("fetch",vi.fn().mockResolvedValue({ok:true,json:async()=>payload}));
  vi.spyOn(console,"info").mockImplementation(()=>{});
  const {interpretHistorianQuestion}=await import("./historian-llm");
  expect(await interpretHistorianQuestion("Who has the best points per game?",corpus)).toBeNull();
});
