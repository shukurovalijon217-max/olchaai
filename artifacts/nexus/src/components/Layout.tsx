import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { motion, AnimatePresence, useMotionValue, useDragControls } from "framer-motion";
import { useTranslation } from "react-i18next";
import {
  Home, Play, Compass, MessageCircle, Users, Bell,
  User, ShieldCheck, LogOut, Crown, Settings, Wallet, Radio,
  Search, ShoppingBag, Bot, BookOpen, ChevronRight, ChevronLeft,
  MoreHorizontal, X,
} from "lucide-react";
import NexusLogo from "@/components/NexusLogo";
import { useAuth } from "@/context/AuthContext";

const navItems = [
  { href: "/", icon: Home, key: "nav.home" },
  { href: "/reels", icon: Play, key: "nav.reels" },
  { href: "/explore", icon: Compass, key: "nav.explore" },
  { href: "/search", icon: Search, key: "nav.search" },
  { href: "/bozor", icon: ShoppingBag, key: "nav.marketplace" },
  { href: "/ai-chat", icon: Bot, key: "nav.ai_chat" },
  { href: "/kutubxona", icon: BookOpen, key: "nav.library" },
  { href: "/live-explore", icon: Radio, key: "nav.live" },
  { href: "/messages", icon: MessageCircle, key: "nav.messages" },
  { href: "/groups", icon: Users, key: "nav.groups" },
  { href: "/notifications", icon: Bell, key: "nav.notifications" },
  { href: "/profile", icon: User, key: "nav.profile" },
  { href: "/premium", icon: Crown, key: "nav.premium" },
  { href: "/wallet", icon: Wallet, key: "nav.wallet" },
];

const bottomNavItems = [
  { href: "/settings", icon: Settings, key: "nav.settings" },
];

const adminNavItems = [
  { href: "/admin", icon: ShieldCheck, key: "nav.admin" },
];

const mobileNavMainItems = [
  { href: "/", icon: Home, key: "nav.home" },
  { href: "/explore", icon: Compass, key: "nav.explore" },
  { href: "/ai-chat", icon: Bot, key: "nav.ai_chat" },
  { href: "/messages", icon: MessageCircle, key: "nav.messages" },
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
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(loadOpen);
  const [moreOpen, setMoreOpen] = useState(false);
  const [maxY, setMaxY] = useState(600);
  const y = useMotionValue(loadY());
  const dragControls = useDragControls();

  useEffect(() => {
    const update = () => setMaxY(Math.max(100, window.innerHeight - 360));
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  useEffect(() => { setMoreOpen(false); }, [location]);

  const saveY = () => {
    try { localStorage.setItem(Y_KEY, String(Math.round(y.get()))); } catch {}
  };

  const toggle = () => {
    const next = !isOpen;
    setIsOpen(next);
    try { localStorage.setItem(OPEN_KEY, String(next)); } catch {}
  };

  const allMobileNav = [
    ...navItems,
    ...bottomNavItems,
    ...(user?.isAdmin ? adminNavItems : []),
  ];

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
                {/* Drag handle header */}
                <div
                  onPointerDown={(e) => dragControls.start(e)}
                  className="flex items-center justify-between px-3 py-2.5 border-b border-border/30 cursor-grab active:cursor-grabbing"
                  style={{ background: "hsl(var(--sidebar-accent) / 0.25)" }}
                >
                  <Link href="/">
                    <NexusLogo ringSize={30} showText={true} fontSize="0.85rem" letterSpacing="0.15em" />
                  </Link>
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

                {/* Nav items */}
                <nav className="flex-1 px-1.5 py-1 space-y-0.5 overflow-y-auto scrollbar-none">
                  {navItems.map(({ href, icon: Icon, key }) => {
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
                          <span className="font-medium">{t(key)}</span>
                          {active && (
                            <motion.div layoutId="nav-dot" className="ml-auto w-1.5 h-1.5 rounded-full bg-primary" />
                          )}
                        </motion.div>
                      </Link>
                    );
                  })}
                </nav>

                {/* Bottom actions */}
                <div className="px-1.5 pb-2 pt-1 border-t border-border/30 space-y-0.5">
                  {[...bottomNavItems, ...(user?.isAdmin ? adminNavItems : [])].map(({ href, icon: Icon, key }) => {
                    const active = location.startsWith(href);
                    return (
                      <Link key={href} href={href}>
                        <motion.div
                          whileHover={{ x: 2 }}
                          className={`flex items-center gap-2.5 px-2.5 py-2 rounded-xl cursor-pointer transition-colors text-sm ${
                            active ? "bg-primary/15 text-primary" : "text-sidebar-foreground hover:bg-sidebar-accent"
                          }`}
                        >
                          <Icon className="w-4 h-4 flex-shrink-0" />
                          <span className="font-medium">{t(key)}</span>
                        </motion.div>
                      </Link>
                    );
                  })}
                  <button
                    onClick={logout}
                    className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-muted-foreground hover:bg-sidebar-accent hover:text-destructive transition-colors text-sm"
                  >
                    <LogOut className="w-4 h-4 flex-shrink-0" />
                    <span className="font-medium">{t("auth.logout")}</span>
                  </button>
                </div>
              </motion.aside>
            )}
          </AnimatePresence>

          {/* Toggle tab + drag strip */}
          <div className="flex flex-col items-center mt-3 gap-1">
            <motion.button
              onClick={toggle}
              whileHover={{ scale: 1.08, x: isOpen ? -1 : 1 }}
              whileTap={{ scale: 0.92 }}
              className="flex items-center justify-center w-6 h-12 rounded-r-xl shadow-xl border border-border/50 border-l-0 transition-colors"
              style={{ background: "hsl(var(--sidebar))", backdropFilter: "blur(16px)" }}
              title={isOpen ? t("common.close") : t("common.open")}
            >
              {isOpen
                ? <ChevronLeft className="w-3.5 h-3.5 text-sidebar-foreground" />
                : <ChevronRight className="w-3.5 h-3.5 text-sidebar-foreground" />}
            </motion.button>

            <div
              onPointerDown={(e) => { e.stopPropagation(); dragControls.start(e); }}
              className="flex flex-col items-center gap-[3px] py-2 px-1.5 rounded-r-lg cursor-ns-resize border border-border/40 border-l-0 shadow"
              style={{ background: "hsl(var(--sidebar) / 0.85)", backdropFilter: "blur(12px)" }}
            >
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="w-[3px] h-[3px] rounded-full bg-muted-foreground/50" />
              ))}
            </div>
          </div>
        </motion.div>
      </div>

      {/* ── MOBILE BOTTOM NAV ── */}
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 z-50 border-t border-border/60 flex items-center justify-around py-1.5 px-1"
        style={{ background: "hsl(var(--sidebar) / 0.97)", backdropFilter: "blur(20px)" }}
      >
        {mobileNavMainItems.map(({ href, icon: Icon, key }) => {
          const active = location === href || (href !== "/" && location.startsWith(href));
          return (
            <Link key={href} href={href}>
              <motion.div
                whileTap={{ scale: 0.88 }}
                className={`flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-colors ${
                  active ? "text-primary" : "text-muted-foreground"
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="text-[9px] font-semibold">{t(key)}</span>
                {active && <motion.div layoutId="mob-dot" className="w-1 h-1 rounded-full bg-primary" />}
              </motion.div>
            </Link>
          );
        })}

        {/* Ko'proq button */}
        <motion.button
          whileTap={{ scale: 0.88 }}
          onClick={() => setMoreOpen(true)}
          className={`flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-colors ${
            moreOpen ? "text-primary" : "text-muted-foreground"
          }`}
        >
          <MoreHorizontal className="w-5 h-5" />
          <span className="text-[9px] font-semibold">{t("nav.more")}</span>
        </motion.button>
      </nav>

      {/* ── MOBILE "KO'PROQ" BOTTOM SHEET ── */}
      <AnimatePresence>
        {moreOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              key="backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMoreOpen(false)}
              className="md:hidden fixed inset-0 z-[60] bg-black/60"
            />

            {/* Sheet */}
            <motion.div
              key="sheet"
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", stiffness: 350, damping: 35 }}
              className="md:hidden fixed bottom-0 left-0 right-0 z-[61] rounded-t-3xl overflow-hidden"
              style={{
                background: "hsl(var(--sidebar))",
                paddingBottom: "calc(env(safe-area-inset-bottom) + 4rem)",
              }}
            >
              {/* Handle */}
              <div className="flex justify-center pt-3 pb-1">
                <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
              </div>

              {/* Header */}
              <div className="flex items-center justify-between px-5 py-3 border-b border-border/30">
                <p className="font-bold text-foreground text-base">{t("common.all_sections")}</p>
                <button
                  onClick={() => setMoreOpen(false)}
                  className="w-8 h-8 flex items-center justify-center rounded-full bg-muted/60 hover:bg-muted transition-colors"
                >
                  <X className="w-4 h-4 text-foreground" />
                </button>
              </div>

              {/* All nav items grid */}
              <div className="px-4 pt-3 pb-2 grid grid-cols-3 gap-2">
                {allMobileNav.map(({ href, icon: Icon, key }) => {
                  const active = location === href || (href !== "/" && location.startsWith(href));
                  return (
                    <Link key={href} href={href}>
                      <motion.div
                        whileTap={{ scale: 0.93 }}
                        className={`flex flex-col items-center gap-1.5 px-2 py-3 rounded-2xl transition-colors ${
                          active
                            ? "bg-primary/15 text-primary"
                            : "bg-muted/40 text-foreground hover:bg-muted/70"
                        }`}
                      >
                        <Icon className="w-5 h-5" />
                        <span className="text-[10px] font-semibold text-center leading-tight">{t(key)}</span>
                      </motion.div>
                    </Link>
                  );
                })}
              </div>

              {/* User + logout */}
              {user && (
                <div className="px-4 py-3 border-t border-border/30 mt-1 flex items-center justify-between">
                  <Link href="/profile" onClick={() => setMoreOpen(false)}>
                    <div className="flex items-center gap-2.5">
                      {user.avatarUrl ? (
                        <img src={user.avatarUrl} className="w-8 h-8 rounded-full object-cover" />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-primary/25 flex items-center justify-center text-xs font-bold text-primary">
                          {user.displayName[0].toUpperCase()}
                        </div>
                      )}
                      <div>
                        <p className="text-sm font-semibold text-foreground">{user.displayName}</p>
                        <p className="text-[10px] text-muted-foreground">@{user.username}</p>
                      </div>
                    </div>
                  </Link>
                  <button
                    onClick={logout}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors text-xs font-semibold"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    {t("auth.logout")}
                  </button>
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>

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
