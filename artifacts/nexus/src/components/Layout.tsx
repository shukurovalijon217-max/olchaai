import { Link, useLocation } from "wouter";
import { motion } from "framer-motion";
import {
  Home, Play, Compass, MessageCircle, Users, Bell,
  User, ShieldCheck, LogOut
} from "lucide-react";
import NexusLogo from "@/components/NexusLogo";

const nav = [
  { href: "/", icon: Home, label: "Feed" },
  { href: "/reels", icon: Play, label: "Reels" },
  { href: "/explore", icon: Compass, label: "Explore" },
  { href: "/messages", icon: MessageCircle, label: "Messages" },
  { href: "/groups", icon: Users, label: "Communities" },
  { href: "/notifications", icon: Bell, label: "Notifications" },
  { href: "/profile", icon: User, label: "Profile" },
];

const adminNav = [
  { href: "/admin", icon: ShieldCheck, label: "Admin Panel" },
];

export default function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();

  return (
    <div className="flex min-h-screen bg-background">
      {/* Sidebar */}
      <aside className="fixed left-0 top-0 h-full w-16 lg:w-56 flex flex-col border-r border-border bg-sidebar z-40">

        {/* ── Logo area ── */}
        <Link href="/">
          <div className="flex items-center justify-center lg:justify-start gap-2 px-0 lg:px-4 py-4 cursor-pointer">
            {/* Collapsed sidebar: icon only (40 px) */}
            <div className="lg:hidden flex items-center justify-center w-16">
              <NexusLogo ringSize={40} showText={false} />
            </div>
            {/* Expanded sidebar: icon + text */}
            <div className="hidden lg:flex items-center gap-3">
              <NexusLogo ringSize={40} showText={true} fontSize="1.05rem" letterSpacing="0.2em" />
            </div>
          </div>
        </Link>

        {/* Thin divider */}
        <div className="mx-3 mb-2 h-px bg-border opacity-50" />

        {/* Main Nav */}
        <nav className="flex-1 px-2 space-y-0.5">
          {nav.map(({ href, icon: Icon, label }) => {
            const active = location === href || (href !== "/" && location.startsWith(href));
            return (
              <Link key={href} href={href}>
                <motion.div
                  whileHover={{ x: 2 }}
                  whileTap={{ scale: 0.97 }}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer transition-colors ${
                    active
                      ? "bg-primary/15 text-primary"
                      : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                  }`}
                >
                  <Icon className={`w-5 h-5 flex-shrink-0 ${active ? "text-primary" : ""}`} />
                  <span className="hidden lg:block text-sm font-medium">{label}</span>
                  {active && (
                    <motion.div
                      layoutId="nav-indicator"
                      className="hidden lg:block ml-auto w-1.5 h-1.5 rounded-full bg-primary"
                    />
                  )}
                </motion.div>
              </Link>
            );
          })}
        </nav>

        {/* Admin + Sign Out */}
        <div className="px-2 pb-4 space-y-0.5">
          {adminNav.map(({ href, icon: Icon, label }) => {
            const active = location.startsWith(href);
            return (
              <Link key={href} href={href}>
                <motion.div
                  whileHover={{ x: 2 }}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer transition-colors ${
                    active
                      ? "bg-accent/15 text-accent"
                      : "text-sidebar-foreground hover:bg-sidebar-accent"
                  }`}
                >
                  <Icon className="w-5 h-5 flex-shrink-0" />
                  <span className="hidden lg:block text-sm font-medium">{label}</span>
                </motion.div>
              </Link>
            );
          })}
          <Link href="/login">
            <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer text-muted-foreground hover:bg-sidebar-accent hover:text-destructive transition-colors">
              <LogOut className="w-5 h-5 flex-shrink-0" />
              <span className="hidden lg:block text-sm font-medium">Sign Out</span>
            </div>
          </Link>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 ml-16 lg:ml-56 min-h-screen">
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
