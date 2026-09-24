import {it,expect,vi} from "vitest";
import {paginatedRows} from "./paginated-rows";
it("fetches the complete 1376-row draft archive beyond a default page",async()=>{
 const data=Array.from({length:1376},(_,id)=>({id}));
 const fetch=vi.fn(async(from:number,to:number)=>({data:data.slice(from,to+1),error:null}));
 expect((await paginatedRows(fetch)).data).toEqual(data);
 expect(fetch.mock.calls).toEqual([[0,499],[500,999],[1000,1499]]);
});
it("does not return a misleading partial archive after a page fails",async()=>{
 const result=await paginatedRows(async from=>from===0?{data:[1,2],error:null}:{data:null,error:{message:"unavailable"}},2);
 expect(result).toEqual({data:[],error:{message:"unavailable"}});
});
it("terminates on an empty page after an exact page boundary",async()=>{
 expect((await paginatedRows(async from=>({data:from===0?[1,2]:[],error:null}),2)).data).toEqual([1,2]);
});
