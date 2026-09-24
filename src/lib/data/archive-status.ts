import "server-only";
import {createServerSupabaseClient} from "@/lib/supabase/server";

export async function getArchiveStatus() {
  const db=createServerSupabaseClient();
  const {data:seasons,error}=await db.from("seasons").select("id,year,status").order("year",{ascending:false});
  if(error)throw new Error("Archive status unavailable");
  return Promise.all((seasons??[]).map(async season=>{
    const [sync,games]=await Promise.all([
      db.from("sync_runs").select("finished_at").eq("season_id",season.id).eq("status","succeeded").in("sync_type",["season","backfill","refresh"]).not("finished_at","is",null).order("finished_at",{ascending:false}).limit(1),
      db.from("matchups").select("id",{count:"exact",head:true}).eq("season_id",season.id).eq("is_complete",true),
    ]);
    return {year:Number(season.year),status:String(season.status),lastSuccess:sync.error?null:sync.data?.[0]?.finished_at??null,completedMatchups:games.error?null:games.count};
  }));
}
