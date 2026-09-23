import {answerManagerScore,managerScoreRules,managerScoreVersion} from "@/lib/historian-manager-score";
import type {HistorianCorpus,HistorianPlan} from "@/lib/historian";

export function ManagerScoreExhibit({corpus}:{corpus:HistorianCorpus}){
  const base:HistorianPlan={intent:"best_manager",memberIds:[],startYear:null,endYear:null,metric:null,gameType:"regular_season",ranking:"highest",windowYears:null,minimumGames:null,population:"all",output:"list",limit:null};
  return <section style={{marginTop:"1.5rem"}} aria-labelledby="manager-score-title">
    <h2 id="manager-score-title">Overall manager ranking</h2>
    <p>{managerScoreVersion} · One overall score for the page and historian. Higher is better; the lowest qualified score is worst.</p>
    {(["best_manager","poor_performance"] as const).map(intent=>{
      const response=answerManagerScore({...base,intent},corpus);
      return <details key={intent} open={intent==="best_manager"} style={{marginTop:"1.5rem"}}>
        <summary>{intent==="best_manager"?"Overall ranking":"Separate poor-performance index (optional)"} — components and records</summary>
        <p>{response.answer}</p>
        {response.table&&<div className="data-table-wrap"><table className="data-table"><caption>{response.table.caption}</caption><thead><tr>{response.table.columns.map(c=><th key={c} scope="col">{c}</th>)}</tr></thead><tbody>{response.table.rows.map((row,i)=><tr key={i}>{row.map((cell,j)=><td key={j}>{cell}</td>)}</tr>)}</tbody></table></div>}
        {response.notes?.filter(n=>n.startsWith("Completed seasons:")||n.startsWith("Statistically tied")).map(n=><p key={n}>{n}</p>)}
      </details>;
    })}
    <details style={{marginTop:"1.5rem"}}><summary>How the scores work</summary><ul>{managerScoreRules.map(rule=><li key={rule}>{rule}</li>)}</ul><p>Component columns show weighted points. Rounding may make displayed components differ from the total by 0.1.</p></details>
  </section>;
}
