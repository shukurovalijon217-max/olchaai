import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { motion, AnimatePresence, useMotionValue, useDragControls } from "framer-motion";
import {
  Home, Play, Compass, MessageCircle, Users, Bell,
  User, ShieldCheck, LogOut, Crown, Settings, Wallet, Radio,
  Search, ShoppingBag, Bot, BookOpen, ChevronRight, ChevronLeft,
} from "lucide-react";
import NexusLogo from "@/components/NexusLogo";
import { useAuth } from "@/context/AuthContext";

const nav = [
  { href: "/", icon: Home, label: "Feed" },
  { href: "/reels", icon: Play, label: "Reels" },
  { href: "/explore", icon: Compass, label: "Explore" },
  { href: "/search", icon: Search, label: "Qidiruv" },
  { href: "/bozor", icon: ShoppingBag, label: "Bozor" },
  { href: "/ai-chat", icon: Bot, label: "AI Chat" },
  { href: "/kutubxona", icon: BookOpen, label: "Kutubxona" },
  { href: "/live-explore", icon: Radio, label: "Jonli Efir" },
  { href: "/messages", icon: MessageCircle, label: "Messages" },
  { href: "/groups", icon: Users, label: "Jamoalar" },
  { href: "/notifications", icon: Bell, label: "Bildirishnomalar" },
  { href: "/profile", icon: User, label: "Profil" },
  { href: "/premium", icon: Crown, label: "Premium" },
  { href: "/wallet", icon: Wallet, label: "Hamyon" },
];

const bottomNav = [
  { href: "/settings", icon: Settings, label: "Sozlamalar" },
];

const adminNav = [
  { href: "/admin", icon: ShieldCheck, label: "Admin Panel" },
];

const mobileNav = [
  { href: "/", icon: Home, label: "Feed" },
  { href: "/explore", icon: Compass, label: "Explore" },
  { href: "/ai-chat", icon: Bot, label: "AI Chat" },
  { href: "/messages", icon: MessageCircle, label: "Xabar" },
  { href: "/profile", icon: User, label: "Profil" },
];

const Y_KEY = "olcha_nav_y";
const OPEN_KEY = "olcha_nav_open";

function loadY() {
  try { return Math.max(10, parseInt(localStorage.getItem(Y_KEY) ?? "80", 10)); }
  catch { return 80; }
}
function loadOpen() {
  try { return localStorage.getItem(OPEN_KEY) !== "false"; }
  catch { return true; }
}

export default function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { user, logout } = useAuth();
  const [isOpen, setIsOpen] = useState(loadOpen);
  const [maxY, setMaxY] = useState(600);
  const y = useMotionValue(loadY());
  const dragControls = useDragControls();

  useEffect(() => {
    const update = () => setMaxY(Math.max(100, window.innerHeight - 360));
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  const saveY = () => {
    try { localStorage.setItem(Y_KEY, String(Math.round(y.get()))); } catch {}
  };

  const toggle = () => {
    const next = !isOpen;
    setIsOpen(next);
    try { localStorage.setItem(OPEN_KEY, String(next)); } catch {}
  };

  return (
    <div className="bg-background min-h-screen">

      {/* ── DESKTOP FLOATING SIDEBAR ── */}
      <div className="hidden md:block">
        <motion.div
          drag="y"
          dragControls={dragControls}
          dragListener={false}
          dragMomentum={false}
          dragElastic={0}
          dragConstraints={{ top: 10, bottom: maxY }}
          style={{ position: "fixed", left: 0, top: 0, y, zIndex: 50 }}
          onDragEnd={saveY}
          className="flex items-start select-none"
        >
          {/* Sidebar panel */}
          <AnimatePresence initial={false}>
            {isOpen && (
              <motion.aside
                key="sidebar"
                initial={{ x: "-100%", opacity: 0.6 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: "-100%", opacity: 0 }}
                transition={{ type: "spring", stiffness: 400, damping: 38 }}
                className="w-52 flex flex-col rounded-r-2xl shadow-2xl overflow-hidden border-y border-r border-border/50"
                style={{
                  maxHeight: "calc(100vh - 24px)",
                  background: "hsl(var(--sidebar))",
                  backdropFilter: "blur(20px)",
                }}
              >
                {/* ── Drag handle header ── */}
                <div
                  onPointerDown={(e) => dragControls.start(e)}
                  className="flex items-center justify-between px-3 py-2.5 border-b border-border/30 cursor-grab active:cursor-grabbing"
                  style={{ background: "hsl(var(--sidebar-accent) / 0.25)" }}
                >
                  <Link href="/">
                    <NexusLogo ringSize={30} showText={true} fontSize="0.85rem" letterSpacing="0.15em" />
                  </Link>
                  {/* Grip dots */}
                  <div className="flex flex-col gap-[3px] pr-0.5">
                    {[0, 1, 2].map((i) => (
                      <div key={i} className="flex gap-[3px]">
                        <div className="w-[3px] h-[3px] rounded-full bg-muted-foreground/40" />
                        <div className="w-[3px] h-[3px] rounded-full bg-muted-foreground/40" />
                      </div>
                    ))}
                  </div>
                </div>

                {/* User chip */}
                {user && (
                  <Link href="/profile">
                    <div className="flex items-center gap-2 mx-2 my-1.5 px-2.5 py-1.5 rounded-xl bg-muted/40 hover:bg-muted/70 transition-colors cursor-pointer">
                      {user.avatarUrl ? (
                        <img src={user.avatarUrl} className="w-6 h-6 rounded-full object-cover flex-shrink-0" />
                      ) : (
                        <div className="w-6 h-6 rounded-full bg-primary/25 flex items-center justify-center text-[10px] font-bold text-primary flex-shrink-0">
                          {user.displayName[0].toUpperCase()}
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-foreground truncate">{user.displayName}</p>
                        <p className="text-[10px] text-muted-foreground truncate">@{user.username}</p>
                      </div>
                    </div>
                  </Link>
                )}

                {/* Nav items — scrollable */}
                <nav className="flex-1 px-1.5 py-1 space-y-0.5 overflow-y-auto scrollbar-none">
                  {nav.map(({ href, icon: Icon, label }) => {
                    const active = location === href || (href !== "/" && location.startsWith(href));
                    return (
                      <Link key={href} href={href}>
                        <motion.div
                          whileHover={{ x: 2 }}
                          whileTap={{ scale: 0.97 }}
                          className={`flex items-center gap-2.5 px-2.5 py-2 rounded-xl cursor-pointer transition-colors text-sm ${
                            active
                              ? "bg-primary/15 text-primary"
                              : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                          }`}
                        >
                          <Icon className="w-4 h-4 flex-shrink-0" />
                          <span className="font-medium">{label}</span>
                          {active && (
                            <motion.div
                              layoutId="nav-dot"
                              className="ml-auto w-1.5 h-1.5 rounded-full bg-primary"
                            />
                          )}
                        </motion.div>
                      </Link>
                    );
                  })}
                </nav>

                {/* Bottom actions */}
                <div className="px-1.5 pb-2 pt-1 border-t border-border/30 space-y-0.5">
                  {[...bottomNav, ...(user?.isAdmin ? adminNav : [])].map(({ href, icon: Icon, label }) => {
                    const active = location.startsWith(href);
                    return (
                      <Link key={href} href={href}>
                        <motion.div
                          whileHover={{ x: 2 }}
                          className={`flex items-center gap-2.5 px-2.5 py-2 rounded-xl cursor-pointer transition-colors text-sm ${
                            active
                              ? "bg-primary/15 text-primary"
                              : "text-sidebar-foreground hover:bg-sidebar-accent"
                          }`}
                        >
                          <Icon className="w-4 h-4 flex-shrink-0" />
                          <span className="font-medium">{label}</span>
                        </motion.div>
                      </Link>
                    );
                  })}
                  <button
                    onClick={logout}
                    className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-muted-foreground hover:bg-sidebar-accent hover:text-destructive transition-colors text-sm"
                  >
                    <LogOut className="w-4 h-4 flex-shrink-0" />
                    <span className="font-medium">Chiqish</span>
                  </button>
                </div>
              </motion.aside>
            )}
          </AnimatePresence>

          {/* ── Toggle tab + vertical drag strip ── */}
          <div className="flex flex-col items-center mt-3 gap-1">
            {/* Toggle button */}
            <motion.button
              onClick={toggle}
              whileHover={{ scale: 1.08, x: isOpen ? -1 : 1 }}
              whileTap={{ scale: 0.92 }}
              className="flex items-center justify-center w-6 h-12 rounded-r-xl shadow-xl border border-border/50 border-l-0 transition-colors"
              style={{ background: "hsl(var(--sidebar))", backdropFilter: "blur(16px)" }}
              title={isOpen ? "Yopish" : "Ochish"}
            >
              {isOpen
                ? <ChevronLeft className="w-3.5 h-3.5 text-sidebar-foreground" />
                : <ChevronRight className="w-3.5 h-3.5 text-sidebar-foreground" />}
            </motion.button>

            {/* Drag handle strip — hold & drag vertically */}
            <div
              onPointerDown={(e) => { e.stopPropagation(); dragControls.start(e); }}
              className="flex flex-col items-center gap-[3px] py-2 px-1.5 rounded-r-lg cursor-ns-resize border border-border/40 border-l-0 shadow"
              style={{ background: "hsl(var(--sidebar) / 0.85)", backdropFilter: "blur(12px)" }}
              title="Yuqori-pastga suring"
            >
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="w-[3px] h-[3px] rounded-full bg-muted-foreground/50" />
              ))}
            </div>
          </div>
        </motion.div>
      </div>

      {/* ── MOBILE BOTTOM NAV ── */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 border-t border-border/60 flex items-center justify-around py-2 px-2"
        style={{ background: "hsl(var(--sidebar) / 0.95)", backdropFilter: "blur(20px)" }}
      >
        {mobileNav.map(({ href, icon: Icon, label }) => {
          const active = location === href || (href !== "/" && location.startsWith(href));
          return (
            <Link key={href} href={href}>
              <motion.div
                whileTap={{ scale: 0.9 }}
                className={`flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-colors ${
                  active ? "text-primary" : "text-muted-foreground"
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="text-[9px] font-semibold">{label}</span>
                {active && <motion.div layoutId="mob-dot" className="w-1 h-1 rounded-full bg-primary" />}
              </motion.div>
            </Link>
          );
        })}
      </nav>

      {/* ── MAIN CONTENT ── */}
      <main className="min-h-screen pl-8 pb-20 md:pl-8 md:pb-0">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          className="min-h-screen"
        >
          {children}
        </motion.div>
      </main>
    </div>
  );
}
