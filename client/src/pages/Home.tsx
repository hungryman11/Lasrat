import { ArrowRight, CheckCircle2, Clock3, FileText, LockKeyhole, UsersRound, type LucideIcon } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/_core/hooks/useAuth";
import { startLogin } from "@/const";

const workflow: { icon: LucideIcon; step: string; title: string; copy: string }[] = [
  { icon: FileText, step: "01", title: "Tell us what happened", copy: "Capture the essentials in a few minutes." },
  { icon: UsersRound, step: "02", title: "The team triages it", copy: "A staff member can take ownership and update progress." },
  { icon: CheckCircle2, step: "03", title: "You see the outcome", copy: "Track the same complaint reference until resolved." },
];

export default function Home() {
  const { isAuthenticated, user } = useAuth();
  const canStaff = user?.role === "staff" || user?.role === "admin";
  return (
    <div className="mx-auto max-w-7xl px-4 pb-16 pt-10 sm:px-6 lg:px-8 lg:pt-16">
      <section className="grid items-center gap-10 lg:grid-cols-[1.05fr_.95fr]">
        <div>
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-[#b9d5c8] bg-[#e8f4ee] px-3 py-1 text-xs font-semibold uppercase tracking-[.16em] text-[#0d5c48]"><span className="h-2 w-2 rounded-full bg-[#e2a73a]" /> Public service escalation desk</div>
          <h1 className="max-w-2xl text-4xl font-bold leading-tight tracking-tight text-[#16352a] sm:text-6xl">Turn a difficult complaint into a <span className="text-[#0d5c48]">clear next step.</span></h1>
          <p className="mt-6 max-w-xl text-lg leading-8 text-[#5f6d66]">A simple way for Lagos State LEHME users to submit concerns, follow progress, and help back-end teams coordinate resolutions.</p>
          <div className="mt-8 flex flex-wrap gap-3">
            {isAuthenticated ? <><Button asChild size="lg"><Link href="/submit">Submit a complaint <ArrowRight size={17} /></Link></Button><Button asChild variant="outline" size="lg"><Link href={canStaff ? "/staff" : "/my-complaints"}>{canStaff ? "Open staff queue" : "View my complaints"}</Link></Button></> : <Button size="lg" onClick={() => startLogin()}>Sign in to get started <ArrowRight size={17} /></Button>}
          </div>
          <p className="mt-4 text-xs text-[#718078]">For the MVP, sign-in is required so you can safely return to your own complaints.</p>
        </div>
        <div className="relative overflow-hidden rounded-3xl bg-[#0d5c48] p-7 text-white shadow-xl shadow-[#b8ccc1] sm:p-10">
          <div className="absolute -right-16 -top-16 h-48 w-48 rounded-full border-[22px] border-[#4c9079]/50" /><div className="absolute -bottom-20 -left-10 h-48 w-48 rounded-full bg-[#164f40]" />
          <div className="relative"><div className="flex items-center justify-between"><span className="text-sm font-semibold text-[#b9e0cd]">How the desk works</span><LockKeyhole size={19} className="text-[#f0c86a]" /></div>
            <div className="mt-8 grid gap-5">{workflow.map(({ icon: Icon, step, title, copy }) => <div key={step} className="flex gap-4"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white/10 text-[#f0c86a]"><Icon size={19} /></span><div><div className="text-xs font-bold tracking-[.16em] text-[#a9d2bf]">{step}</div><div className="mt-1 font-semibold">{title}</div><p className="mt-1 text-sm leading-6 text-[#d2e4dc]">{copy}</p></div></div>)}</div>
          </div>
        </div>
      </section>
      <section className="mt-20 grid gap-4 sm:grid-cols-3"><InfoCard icon={Clock3} title="Clear status" copy="Know whether your complaint is new, being reviewed, assigned, or resolved." /><InfoCard icon={UsersRound} title="Human ownership" copy="Staff can coordinate work instead of letting an escalation disappear in a queue." /><InfoCard icon={LockKeyhole} title="Private by default" copy="Your complaints are only visible to you and authorized back-end staff." /></section>
    </div>
  );
}
function InfoCard({ icon: Icon, title, copy }: { icon: LucideIcon; title: string; copy: string }) { return <div className="rounded-2xl border border-[#d9e3dd] bg-white p-6"><Icon size={21} className="text-[#0d5c48]" /><h2 className="mt-5 font-semibold text-[#193b2f]">{title}</h2><p className="mt-2 text-sm leading-6 text-[#69776f]">{copy}</p></div>; }
