import {afterEach,it,expect,vi} from "vitest";
import type {HistorianCorpus} from "./historian";
vi.mock("server-only",()=>({}));
const corpus:HistorianCorpus={managers:[],seasons:[],games:[],champions:[],records:[],rivalries:[]};
it("declines reversed date ranges before calling the model",async()=>{
  const fetchMock=vi.fn();vi.stubGlobal("fetch",fetchMock);
  vi.spyOn(console,"info").mockImplementation(()=>{});
  const {interpretHistorianQuestion}=await import("./historian-llm");
  expect(await interpretHistorianQuestion("What is Zach's record from 2025 to 2022?",corpus)).toMatchObject({intent:"unsupported",startYear:null,endYear:null});
  expect(fetchMock).not.toHaveBeenCalled();
});
it("logs a controlled rejection reason without logging the model output",async()=>{
  const invalid={intent:"rank_metric",memberIds:[],startYear:2017,endYear:2025,metric:"win_percentage",gameType:"regular_season",ranking:"lowest",windowYears:3,minimumGames:0,population:"all",output:"single",limit:null,privateMarker:"DO_NOT_LOG"};
  vi.stubEnv("OPENAI_API_KEY","synthetic-test-key");
  vi.stubGlobal("fetch",vi.fn().mockResolvedValue({ok:true,json:async()=>({status:"completed",output_text:JSON.stringify(invalid)})}));
  const log=vi.spyOn(console,"info").mockImplementation(()=>{});
  const {interpretHistorianQuestion}=await import("./historian-llm");
  expect(await interpretHistorianQuestion("Who had the worst 3-year win percentage from 2017–2025?",corpus)).toBeNull();
  expect(JSON.parse(log.mock.calls[0][0])).toMatchObject({outcome:"invalid_plan",validationReason:"count_bounds",validationStage:"decoded"});
  expect(log.mock.calls[0][0]).not.toContain("DO_NOT_LOG");
});
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
