type PageError={message:string};
export async function paginatedRows<T>(fetchPage:(from:number,to:number)=>PromiseLike<{data:T[]|null;error:PageError|null}>,size=500):Promise<{data:T[];error:PageError|null}>{
 const rows:T[]=[];
 for(let from=0;;from+=size){
  const page=await fetchPage(from,from+size-1);
  if(page.error)return {data:[],error:page.error};
  rows.push(...(page.data??[]));
  if(!page.data||page.data.length<size)return {data:rows,error:null};
 }
}
