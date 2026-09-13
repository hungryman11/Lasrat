import { Bell, ClipboardList, LayoutDashboard, LogIn, LogOut, Menu, PlusCircle, ShieldCheck, X } from "lucide-react";
import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/_core/hooks/useAuth";
import { startLogin } from "@/const";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated, logout } = useAuth();
  const [location] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const canStaff = user?.role === "staff" || user?.role === "admin";

  const nav = [
    { href: "/", label: "Overview", icon: LayoutDashboard },
    ...(isAuthenticated ? [{ href: "/submit", label: "New complaint", icon: PlusCircle }, { href: "/my-complaints", label: "My complaints", icon: ClipboardList }] : []),
    ...(canStaff ? [{ href: "/staff", label: "Staff queue", icon: ShieldCheck }] : []),
  ];

  return (
    <div className="min-h-screen bg-[#f5f7f6] text-[#16221d]">
      <header className="sticky top-0 z-30 border-b border-[#d9e3dd] bg-[#f5f7f6]/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-3" onClick={() => setMobileOpen(false)}>
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#0d5c48] text-white shadow-sm"><ShieldCheck size={21} /></span>
            <span><span className="block text-sm font-bold tracking-wide text-[#0d5c48]">LEHME</span><span className="block text-xs text-[#65736c]">Escalation desk</span></span>
          </Link>
          <nav className="hidden items-center gap-1 md:flex" aria-label="Primary navigation">
            {nav.map(item => <NavItem key={item.href} {...item} active={location === item.href} />)}
          </nav>
          <div className="hidden items-center gap-3 md:flex">
            {isAuthenticated ? <><span className="hidden text-right text-xs sm:block"><span className="block font-semibold">{user?.name || "Signed-in user"}</span><span className="text-[#65736c] capitalize">{user?.role}</span></span><Button variant="outline" size="sm" onClick={() => logout()}><LogOut size={15} /> Sign out</Button></> : <Button size="sm" onClick={() => startLogin()}><LogIn size={15} /> Sign in</Button>}
          </div>
          <button className="rounded-lg p-2 md:hidden" aria-label="Toggle navigation" aria-expanded={mobileOpen} onClick={() => setMobileOpen(value => !value)}>{mobileOpen ? <X /> : <Menu />}</button>
        </div>
        {mobileOpen && <div className="border-t border-[#d9e3dd] bg-white px-4 py-3 md:hidden"><nav className="grid gap-1" aria-label="Mobile navigation">{nav.map(item => <NavItem key={item.href} {...item} active={location === item.href} onClick={() => setMobileOpen(false)} />)}{isAuthenticated ? <button className="flex items-center gap-3 rounded-lg px-3 py-3 text-left text-sm text-[#8a3c2e]" onClick={() => logout()}><LogOut size={16} /> Sign out</button> : <button className="flex items-center gap-3 rounded-lg px-3 py-3 text-left text-sm text-[#0d5c48]" onClick={() => startLogin()}><LogIn size={16} /> Sign in</button>}</nav></div>}
      </header>
      <main>{children}</main>
      <footer className="mx-auto max-w-7xl px-4 py-10 text-xs text-[#65736c] sm:px-6 lg:px-8"><div className="border-t border-[#d9e3dd] pt-5">MVP service desk for testing LEHME escalation handling. Do not include sensitive personal information in a complaint.</div></footer>
    </div>
  );
}

function NavItem({ href, label, icon: Icon, active, onClick }: { href: string; label: string; icon: typeof LayoutDashboard; active: boolean; onClick?: () => void }) {
  return <Link href={href} onClick={onClick} className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${active ? "bg-[#dcefe7] text-[#0d5c48]" : "text-[#56655e] hover:bg-[#eaf1ed] hover:text-[#0d5c48]"}`}><Icon size={16} /> {label}</Link>;
}
