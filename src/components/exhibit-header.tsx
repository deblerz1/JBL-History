import Link from "next/link";

export function ExhibitHeader({ eyebrow, title, description }: { eyebrow:string; title:string; description:string }) {
  return <header className="exhibit-header"><Link href="/museum">← Trophy room</Link><p className="eyebrow">{eyebrow}</p><h1>{title}</h1><p>{description}</p></header>;
}
