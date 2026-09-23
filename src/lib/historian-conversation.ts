import type {HistorianCorpus,HistorianPlan} from "./historian";

export function ambiguousManagerQuestion(question:string,corpus:HistorianCorpus):string|null{
  const normalized=question.toLowerCase().replace(/[’']/g,"");
  const groups=new Map<string,string[]>();
  for(const manager of corpus.managers){
    if(!manager.publicName)continue;
    const first=manager.publicName.toLowerCase().split(" ")[0];
    groups.set(first,[...(groups.get(first)??[]),manager.publicName]);
  }
  for(const [first,names] of groups){
    if(names.length<2||!normalized.split(/[^a-z]+/).some(word=>word===first||word===first+"s"))continue;
    if(names.some(name=>normalized.includes(name.toLowerCase())))continue;
    return `Do you mean ${names.join(" or ")}?`;
  }
  return null;
}

export function describeHistorianPlan(plan:HistorianPlan,corpus:HistorianCorpus):string{
  const names=plan.memberIds.map(id=>corpus.managers.find(m=>m.memberId===id)).map(m=>m?.publicName??m?.teamName??"Unknown manager");
  const dates=plan.startYear!==null&&plan.endYear!==null?`${plan.startYear}–${plan.endYear}`:plan.startYear!==null?`since ${plan.startYear}`:plan.endYear!==null?`through ${plan.endYear}`:"all recorded seasons";
  const phase=plan.intent==="manager_playoffs"?"playoffs":plan.gameType.replaceAll("_"," ");
  if(plan.intent==="best_manager"||plan.intent==="worst_manager"||plan.intent==="poor_performance")return [names.join(" / ")||"league-wide",dates,plan.intent==="poor_performance"?"separate poor-performance index":`overall ranking · ${plan.intent==="worst_manager"?"lowest":plan.ranking} first`,"completed seasons only; 3-season qualification"].join(" · ");
  if(plan.intent==="conditional_outcome"&&plan.condition){
    const q=plan.condition;
    const condition=q.recordMode==="exact"?`${q.wins}-${q.losses}${q.ties?`-${q.ties}`:""} through Week ${q.throughWeek}`:`below .500 after Week ${q.throughWeek}`;
    const format=q.format==="current"?"latest team count + playoff spots":q.format==="year"?`${q.formatYear} format`:q.format==="team_count"?`${q.teamCount}-team era`:q.format==="compare"?"separate formats":"all formats";
    return [names.join(" / ")||"league-wide",dates,condition,q.outcome==="playoffs"?"playoff qualification":"championship",format].join(" · ");
  }
  return [names.join(" / ")||"league-wide",dates,phase==="all"?"regular season + playoffs":phase,plan.position?`${plan.position} starters`:null,plan.metric?.replaceAll("_"," "),plan.windowYears?`${plan.windowYears}-season windows`:null,plan.population==="active_every_season"?"active every season":null,plan.minimumGames?`minimum ${plan.minimumGames} games`:null].filter(Boolean).join(" · ");
}
