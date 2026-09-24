import Link from "next/link";
import { ExhibitHeader } from "@/components/exhibit-header";
import { HistorianChat } from "@/components/historian-chat";

export default function HistorianPage(){return <main className="exhibit-page historian-page"><ExhibitHeader eyebrow="Statistical reference desk" title="Ask the Historian" description="Ask a plain-language question about JBL history. Every response is calculated from the preserved league archive and links back to its supporting exhibit."/><p><Link href="/museum/coverage">View refresh status and data limitations →</Link></p><HistorianChat/></main>;}
