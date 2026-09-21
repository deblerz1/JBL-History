"use client";
import Link from "next/link";
import { FormEvent,useRef,useState,useTransition } from "react";
import { askHistorian } from "@/app/actions";
import type { HistorianResponse } from "@/lib/historian";

type Message={role:"visitor"|"historian";text:string;response?:HistorianResponse};
const suggestions=["Who had the best two-year win percentage?","Who scores the most regular-season points per game?","Who won the championship in 2021?","What is Foz's career record?"];
export function HistorianChat(){
  const [messages,setMessages]=useState<Message[]>([{role:"historian",text:"The JBL archive is open. Ask me for a manager record, championship, rivalry, playoff résumé, season result, or scoring extreme."}]);
  const [question,setQuestion]=useState(""); const [pending,startTransition]=useTransition(); const inputRef=useRef<HTMLInputElement>(null);
  const submit=(event?:FormEvent)=>{event?.preventDefault();const clean=question.trim();if(!clean||pending)return;setMessages(current=>[...current,{role:"visitor",text:clean}]);setQuestion("");startTransition(async()=>{try{const response=await askHistorian(clean);setMessages(current=>[...current,{role:"historian",text:response.answer,response}]);}catch{setMessages(current=>[...current,{role:"historian",text:"The archive could not complete that query. Try the question again."}]);}finally{inputRef.current?.focus();}});};
  const askSuggestion=(value:string)=>{setQuestion(value);inputRef.current?.focus();};
  return <div className="historian-console"><section className="historian-log" aria-live="polite">{messages.map((message,index)=><article className={`historian-message ${message.role}`} key={`${message.role}-${index}`}><span>{message.role==="historian"?"JBL Historian":"You"}</span><p>{message.text}</p>{message.response?.facts.length?<ul>{message.response.facts.map(fact=><li key={fact}>{fact}</li>)}</ul>:null}{message.response?.href&&<Link href={message.response.href}>{message.response.hrefLabel} →</Link>}</article>)}{pending&&<article className="historian-message historian"><span>JBL Historian</span><p className="historian-thinking">Checking the official record…</p></article>}</section>
    <div className="historian-suggestions">{suggestions.map(suggestion=><button onClick={()=>askSuggestion(suggestion)} type="button" key={suggestion}>{suggestion}</button>)}</div>
    <form className="historian-form" onSubmit={submit}><label htmlFor="historian-question">Ask the archive</label><div><input ref={inputRef} id="historian-question" value={question} onChange={event=>setQuestion(event.target.value)} maxLength={240} placeholder="e.g. What is Jack V's playoff record?" disabled={pending}/><button type="submit" disabled={pending||!question.trim()}>Ask</button></div><small>Answers use only preserved JBL statistics. The historian will not estimate missing records.</small></form>
  </div>;
}
