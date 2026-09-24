"use client";
import {useState} from "react";
import type {HistorianResponse} from "@/lib/historian";

export function HistorianReport({question,response}:{question:string;response:HistorianResponse}) {
  const [open,setOpen]=useState(false);
  const [copied,setCopied]=useState(false);
  const report=["JBL Historian answer review",`Question: ${question}`,`Answer: ${response.answer}`,response.interpretation?`Interpreted as: ${response.interpretation}`:"",...(response.facts??[]),...(response.notes??[]),response.table?[response.table.caption,response.table.columns.join(" | "),...response.table.rows.map(row=>row.join(" | "))].join("\n"):"",response.href?`Supporting exhibit: ${response.href}`:""].filter(Boolean).join("\n");
  return <details onToggle={event=>setOpen(event.currentTarget.open)}><summary>Flag an answer for review</summary>{open&&<div><p>Copy these details and send them privately to the league commissioner, with what seems wrong. Nothing is submitted automatically.</p><textarea aria-label="Answer review details" readOnly value={report} rows={6} style={{width:"100%"}}/><button type="button" onClick={async()=>{try{await navigator.clipboard.writeText(report);setCopied(true);}catch{setCopied(false);}}}>{copied?"Copied":"Copy issue details"}</button><small> If copying is unavailable, select the text above.</small></div>}</details>;
}
