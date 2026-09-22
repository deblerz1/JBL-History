// A bounded expression language: the model selects a metric; only code defines
// arithmetic. Definitions drive both planner documentation and execution.
export type GameTotals={games:number;wins:number;losses:number;ties:number;points:number;opponentPoints:number;expectedWins?:number};
type Expression={field:keyof GameTotals}|{constant:number}|{op:"add"|"subtract"|"multiply"|"divide";left:Expression;right:Expression};
type MetricDefinition={label:string;formula:string;format:"percent"|"integer"|"decimal";expression:Expression;note?:string};
const field=(field:keyof GameTotals):Expression=>({field});
const binary=(op:"add"|"subtract"|"multiply"|"divide",left:Expression,right:Expression):Expression=>({op,left,right});
const ratio=(left:keyof GameTotals,right:keyof GameTotals)=>binary("divide",field(left),field(right));
const scoringNote="Scoring balance is not a pure luck measure: both your scoring and opponents' scoring affect this ratio.";
const actualWins=binary("add",field("wins"),binary("multiply",field("ties"),{constant:.5}));
const luck=binary("subtract",actualWins,field("expectedWins"));
const luckNote="Schedule luck compares results with weekly scoring rank against every other team. Positive means more wins than expected; negative means fewer. It does not measure injuries or every kind of luck.";
export const luckMetrics=new Set<string>(["expected_wins","schedule_luck","schedule_luck_per_game"]);
export const metricDefinitions={
  expected_wins:{label:"expected wins",formula:"sum of weekly (other teams outscored + ½ tied) ÷ number of other teams",format:"decimal",expression:field("expectedWins"),note:luckNote},
  schedule_luck:{label:"schedule luck (wins above expected)",formula:"wins + ½ ties − expected wins",format:"decimal",expression:luck,note:luckNote},
  schedule_luck_per_game:{label:"schedule luck per game",formula:"(wins + ½ ties − expected wins) ÷ completed games",format:"decimal",expression:binary("divide",luck,field("games")),note:luckNote},
  win_percentage:{label:"win percentage",formula:"(wins + ½ ties) ÷ games played",format:"percent",expression:binary("divide",binary("add",field("wins"),binary("multiply",field("ties"),{constant:.5})),field("games"))},
  points_per_game:{label:"points per game",formula:"total points ÷ games played",format:"decimal",expression:ratio("points","games")},
  points_against_per_game:{label:"points allowed per game",formula:"total points against ÷ games played",format:"decimal",expression:ratio("opponentPoints","games")},
  average_margin:{label:"average scoring margin",formula:"(total points for − total points against) ÷ games played",format:"decimal",expression:binary("divide",binary("subtract",field("points"),field("opponentPoints")),field("games"))},
  total_points:{label:"total points",formula:"sum of points for",format:"decimal",expression:field("points")},
  total_points_against:{label:"total points against",formula:"sum of points against",format:"decimal",expression:field("opponentPoints")},
  points_against_to_points_for:{label:"PA/PF ratio",formula:"total points against ÷ total points for",format:"decimal",expression:ratio("opponentPoints","points"),note:scoringNote},
  points_for_to_points_against:{label:"PF/PA ratio",formula:"total points for ÷ total points against",format:"decimal",expression:ratio("points","opponentPoints"),note:scoringNote},
  games_played:{label:"games played",formula:"count of completed matchups",format:"integer",expression:field("games")},
  wins:{label:"wins",formula:"count of wins",format:"integer",expression:field("wins")},
  losses:{label:"losses",formula:"count of losses",format:"integer",expression:field("losses")},
  ties:{label:"ties",formula:"count of ties",format:"integer",expression:field("ties")},
} satisfies Record<string,MetricDefinition>;
export type HistorianMetric=keyof typeof metricDefinitions;
export const historianMetrics=Object.keys(metricDefinitions) as HistorianMetric[];
function evaluate(expression:Expression,totals:GameTotals):number|null{
  if("field" in expression){const value=totals[expression.field];return typeof value==="number"&&Number.isFinite(value)?value:null;}
  if("constant" in expression)return expression.constant;
  const left=evaluate(expression.left,totals),right=evaluate(expression.right,totals);
  if(left===null||right===null||(expression.op==="divide"&&right===0))return null;
  const value=expression.op==="add"?left+right:expression.op==="subtract"?left-right:expression.op==="multiply"?left*right:left/right;
  return Number.isFinite(value)?value:null;
}
export function calculateMetric(metric:HistorianMetric,totals:GameTotals):number|null{return evaluate(metricDefinitions[metric].expression,totals);}
export function metricDefinition(metric:HistorianMetric):MetricDefinition{return metricDefinitions[metric];}
export function formatMetric(metric:HistorianMetric,value:number):string{
  const format=metricDefinitions[metric].format;
  return format==="percent"?`${(value*100).toFixed(1)}%`:format==="integer"?String(value):value.toFixed(2);
}
export function metricPlannerCatalog():string{return JSON.stringify(Object.entries(metricDefinitions).map(([id,definition])=>({metric:id,formula:definition.formula,phases:luckMetrics.has(id)?["regular_season"]:["regular_season","playoffs","all"],rollingWindows:true,managerFilters:true,lists:true})));}
