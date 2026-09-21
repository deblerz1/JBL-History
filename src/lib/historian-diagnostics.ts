export type PlannerOutcome="shortcut"|"success"|"missing_key"|"http_error"|"incomplete"|"refusal"|"empty_output"|"invalid_json"|"invalid_plan"|"timeout"|"network_error";

export function responseProblem(value:unknown):PlannerOutcome|null {
  if(!value||typeof value!=="object")return "empty_output";
  const response=value as {status?:unknown;output?:unknown};
  if(response.status!==undefined&&response.status!=="completed")return "incomplete";
  if(Array.isArray(response.output))for(const item of response.output){
    if(item&&Array.isArray(item.content)&&item.content.some((content:{type?:string})=>content?.type==="refusal"))return "refusal";
  }
  return null;
}

// Only controlled metadata is logged: never prompts, names, credentials,
// model output, database rows, or raw exception messages.
export function plannerDiagnostic(requestId:string,started:number,outcome:PlannerOutcome,httpStatus?:number){
  return {event:"jbl_historian_planner",requestId,build:process.env.VERCEL_GIT_COMMIT_SHA?.slice(0,12)??"local",outcome,durationMs:Math.max(0,Date.now()-started),...(httpStatus===undefined?{}:{httpStatus})};
}
