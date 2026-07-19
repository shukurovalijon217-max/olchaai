import { useEffect, Component, type ReactNode, lazy, Suspense } from "react";
import "@/lib/i18n";
import { initE2E } from "@/lib/e2eEncryption";

// Keep-alive: prevents Render free/starter instances from spinning down
const WS_BASE = import.meta.env.VITE_WS_URL?.replace(/^wss?:/, "https:").replace("/go/ws", "") ?? "";
const API_BASE = import.meta.env.VITE_API_BASE_URL;
function useKeepAlive() {
  useEffect(() => {
    const ping = () => {
      if (WS_BASE) fetch(`${WS_BASE}/go/health`, { mode: "no-cors" }).catch(() => {});
      if (API_BASE) fetch(`${API_BASE}/api/healthz`, { mode: "no-cors" }).catch(() => {});
    };
    ping();
    const id = setInterval(ping, 4 * 60 * 1000); // every 4 min
    return () => clearInterval(id);
  }, []);
}
import { Switch, Route, Router as WouterRouter, useLocation } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { RealtimeProvider } from "@/context/RealtimeContext";
import { CallProvider } from "@/context/CallContext";
import { PipProvider } from "@/context/PipContext";
import Layout from "@/components/Layout";

/* ── Route-level code splitting ─────────────────────────────────
   Each page loads on demand — initial JS bundle is ~70% smaller.  */
const HomePage          = lazy(() => import("@/pages/HomePage"));
const ReelsPage         = lazy(() => import("@/pages/ReelsPage"));
const OTubePage         = lazy(() => import("@/pages/OTubePage"));
const ExplorePage       = lazy(() => import("@/pages/ExplorePage"));
const MessagesPage      = lazy(() => import("@/pages/MessagesPage"));
const GroupsPage        = lazy(() => import("@/pages/GroupsPage"));
const ProfilePage       = lazy(() => import("@/pages/ProfilePage"));
const NotificationsPage = lazy(() => import("@/pages/NotificationsPage"));
const AdminPage         = lazy(() => import("@/pages/AdminPage"));
const PremiumPage       = lazy(() => import("@/pages/PremiumPage"));
const SettingsPage      = lazy(() => import("@/pages/SettingsPage"));
const PostDetailPage    = lazy(() => import("@/pages/PostDetailPage"));
const LoginPage         = lazy(() => import("@/pages/LoginPage"));
const AboutPage         = lazy(() => import("@/pages/AboutPage"));
const PrivacyPolicyPage = lazy(() => import("@/pages/PrivacyPolicyPage"));
const WalletPage        = lazy(() => import("@/pages/WalletPage"));
const LivePage          = lazy(() => import("@/pages/LivePage"));
const LiveExplorePage   = lazy(() => import("@/pages/LiveExplorePage"));
const SearchPage        = lazy(() => import("@/pages/SearchPage"));
const MarketplacePage   = lazy(() => import("@/pages/MarketplacePage"));
const ProductDetailPage = lazy(() => import("@/pages/ProductDetailPage"));
const SellPage          = lazy(() => import("@/pages/SellPage"));
const MyShopPage        = lazy(() => import("@/pages/MyShopPage"));
const SellerProfilePage = lazy(() => import("@/pages/SellerProfilePage"));
const AIChatPage        = lazy(() => import("@/pages/AIChatPage"));
const LibraryPage       = lazy(() => import("@/pages/LibraryPage"));
const QuestsPage        = lazy(() => import("@/pages/QuestsPage"));
const CoViewPage        = lazy(() => import("@/pages/CoViewPage"));
const AnonZonesPage     = lazy(() => import("@/pages/AnonZonesPage"));
const AnonInboxPage     = lazy(() => import("@/pages/AnonInboxPage"));
const AskAnonPage       = lazy(() => import("@/pages/AskAnonPage"));
const MultiScenePage    = lazy(() => import("@/pages/MultiScenePage"));
const MoodMapPage       = lazy(() => import("@/pages/MoodMapPage"));
const AITwinPage        = lazy(() => import("@/pages/AITwinPage"));
const FactCheckPage     = lazy(() => import("@/pages/FactCheckPage"));
const CoSpacesPage      = lazy(() => import("@/pages/CoSpacesPage"));
const MuniAIPage        = lazy(() => import("@/pages/MuniAIPage"));
const VoiceTranslatorPage = lazy(() => import("@/pages/VoiceTranslatorPage"));
const FeatureHubPage         = lazy(() => import("@/pages/FeatureHubPage"));
const CreatorDashboardPage   = lazy(() => import("@/pages/CreatorDashboardPage"));
const NotFound          = lazy(() => import("@/pages/not-found"));

const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <div className="w-12 h-12 rounded-full border-2 border-primary border-t-transparent animate-spin" />
  </div>
);

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 60_000,        // 1 daqiqa: qayta fetch qilmasdan cache ishlatadi
      gcTime: 5 * 60_000,       // 5 daqiqa: xotirada saqlaydi
      refetchOnReconnect: true,  // Internet qayta ulanganida yangilaydi
    },
  },
});

class ErrorBoundary extends Component<{ children: ReactNode; fallback?: ReactNode }, { hasError: boolean; error: Error | null }> {
  constructor(props: { children: ReactNode; fallback?: ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }
  componentDidCatch(error: Error, info: { componentStack: string }) {
    console.error("[ErrorBoundary] React crash:", error.message, "\n", error.stack, "\nComponent stack:", info.componentStack);
    try {
      const API = (import.meta.env.VITE_API_BASE_URL);
      fetch(`${API}/api/client-error`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ message: error.message, stack: error.stack?.slice(0, 600), componentStack: info.componentStack?.slice(0, 400), url: location.href }),
      }).catch(() => {});
    } catch { /* ignore */ }
  }
  render() {
    if (this.state.hasError) {
      const msg = this.state.error?.message ?? "";
      return this.props.fallback ?? (
        <div className="min-h-screen flex flex-col items-center justify-center bg-background gap-4 px-6">
          <div className="text-destructive text-4xl">⚠</div>
          <p className="text-muted-foreground text-sm text-center">Sahifada xato yuz berdi. Qayta yuklang.</p>
          {msg && <p className="text-[11px] text-red-400/70 text-center max-w-xs break-words font-mono">{msg}</p>}
          <button
            className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm"
            onClick={() => this.setState({ hasError: false, error: null })}
          >
            Qayta urinish
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!loading && !user) {
      setLocation("/login");
    }
  }, [loading, user, setLocation]);

  /* E2E encryption key pair init — runs once after login */
  useEffect(() => {
    if (user) { initE2E().catch(() => {}); }
  }, [user?.id]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-12 h-12 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!user) return null;

  return <>{children}</>;
}

function AdminRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!loading && !user) setLocation("/login");
    if (!loading && user && !user.isAdmin) setLocation("/");
  }, [loading, user, setLocation]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-12 h-12 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!user || !user.isAdmin) return null;

  return <>{children}</>;
}

function Router() {
  const { user } = useAuth();

  return (
    <Suspense fallback={<PageLoader />}>
      <Switch>
        <Route path="/login" component={LoginPage} />
        <Route path="/about" component={AboutPage} />
        <Route path="/privacy" component={PrivacyPolicyPage} />
        <Route path="/admin" component={() => (
          <AdminRoute><Layout><AdminPage /></Layout></AdminRoute>
        )} />
        <Route path="/reels" component={() => (
          <ProtectedRoute><Layout><ReelsPage /></Layout></ProtectedRoute>
        )} />
        <Route path="/otube" component={() => (
          <ProtectedRoute><Layout><OTubePage /></Layout></ProtectedRoute>
        )} />
        <Route path="/explore" component={() => (
          <ProtectedRoute><Layout><ExplorePage /></Layout></ProtectedRoute>
        )} />
        <Route path="/messages" component={() => (
          <ProtectedRoute><Layout><MessagesPage /></Layout></ProtectedRoute>
        )} />
        <Route path="/groups" component={() => (
          <ProtectedRoute><Layout><GroupsPage /></Layout></ProtectedRoute>
        )} />
        <Route path="/profile/:id" component={({ params }) => (
          <ProtectedRoute><Layout><ProfilePage userId={Number(params.id)} /></Layout></ProtectedRoute>
        )} />
        <Route path="/profile" component={() => (
          <ProtectedRoute><Layout><ProfilePage userId={user?.id ?? 1} /></Layout></ProtectedRoute>
        )} />
        <Route path="/notifications" component={() => (
          <ProtectedRoute><Layout><NotificationsPage /></Layout></ProtectedRoute>
        )} />
        <Route path="/post/:id" component={({ params }) => (
          <ProtectedRoute><Layout><PostDetailPage postId={Number(params.id)} /></Layout></ProtectedRoute>
        )} />
        <Route path="/premium" component={() => (
          <Layout><PremiumPage /></Layout>
        )} />
        <Route path="/settings" component={() => (
          <ProtectedRoute><Layout><SettingsPage /></Layout></ProtectedRoute>
        )} />
        <Route path="/wallet" component={() => (
          <ProtectedRoute><Layout><WalletPage /></Layout></ProtectedRoute>
        )} />
        <Route path="/live/:id" component={({ params }) => (
          <ProtectedRoute><LivePage liveId={Number(params.id)} /></ProtectedRoute>
        )} />
        <Route path="/live-explore" component={() => (
          <ProtectedRoute><Layout><LiveExplorePage /></Layout></ProtectedRoute>
        )} />
        <Route path="/search" component={() => (
          <ProtectedRoute><Layout><SearchPage /></Layout></ProtectedRoute>
        )} />
        <Route path="/bozor/sotish" component={() => (
          <ProtectedRoute><Layout><SellPage /></Layout></ProtectedRoute>
        )} />
        <Route path="/bozor/do-kon" component={() => (
          <ProtectedRoute><Layout><MyShopPage /></Layout></ProtectedRoute>
        )} />
        <Route path="/bozor/sotuvchi/:id" component={({ params }) => (
          <ProtectedRoute><Layout><SellerProfilePage sellerId={Number(params.id)} /></Layout></ProtectedRoute>
        )} />
        <Route path="/bozor/:id" component={({ params }) => (
          <ProtectedRoute><Layout><ProductDetailPage productId={Number(params.id)} /></Layout></ProtectedRoute>
        )} />
        <Route path="/bozor" component={() => (
          <ProtectedRoute><Layout><MarketplacePage /></Layout></ProtectedRoute>
        )} />
        <Route path="/ai-chat" component={() => (
          <ProtectedRoute><Layout><AIChatPage /></Layout></ProtectedRoute>
        )} />
        <Route path="/kutubxona" component={() => (
          <ProtectedRoute><Layout><LibraryPage /></Layout></ProtectedRoute>
        )} />
        <Route path="/quests" component={() => (
          <ProtectedRoute><Layout><QuestsPage /></Layout></ProtectedRoute>
        )} />
        <Route path="/coview/new" component={() => (
          <ProtectedRoute><Layout><CoViewPage /></Layout></ProtectedRoute>
        )} />
        <Route path="/coview/:code" component={() => (
          <ProtectedRoute><Layout><CoViewPage /></Layout></ProtectedRoute>
        )} />
        <Route path="/anon" component={() => (
          <ProtectedRoute><Layout><AnonZonesPage /></Layout></ProtectedRoute>
        )} />
        <Route path="/anon-inbox" component={() => (
          <ProtectedRoute><Layout><AnonInboxPage /></Layout></ProtectedRoute>
        )} />
        <Route path="/ask/:userId" component={({ params }) => (
          <AskAnonPage userId={Number(params.userId)} />
        )} />
        <Route path="/multiscene" component={() => (
          <ProtectedRoute><Layout><MultiScenePage /></Layout></ProtectedRoute>
        )} />
        <Route path="/mood" component={() => (
          <ProtectedRoute><Layout><MoodMapPage /></Layout></ProtectedRoute>
        )} />
        <Route path="/twin" component={() => (
          <ProtectedRoute><Layout><AITwinPage /></Layout></ProtectedRoute>
        )} />
        <Route path="/factcheck" component={() => (
          <ProtectedRoute><Layout><FactCheckPage /></Layout></ProtectedRoute>
        )} />
        <Route path="/spaces" component={() => (
          <ProtectedRoute><Layout><CoSpacesPage /></Layout></ProtectedRoute>
        )} />
        <Route path="/muni" component={() => (
          <ProtectedRoute><Layout><MuniAIPage /></Layout></ProtectedRoute>
        )} />
        <Route path="/voice-translate" component={() => (
          <ProtectedRoute><Layout><VoiceTranslatorPage /></Layout></ProtectedRoute>
        )} />
        <Route path="/features" component={() => (
          <ProtectedRoute><Layout><FeatureHubPage /></Layout></ProtectedRoute>
        )} />
        <Route path="/kreator" component={() => (
          <ProtectedRoute><Layout><CreatorDashboardPage /></Layout></ProtectedRoute>
        )} />
        <Route path="/" component={() => (
          <ProtectedRoute><Layout><HomePage /></Layout></ProtectedRoute>
        )} />
        <Route component={NotFound} />
      </Switch>
    </Suspense>
  );
}

export default function App() {
  useKeepAlive();
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <AuthProvider>
              <RealtimeProvider>
                <CallProvider>
                  <PipProvider>
                    <ErrorBoundary>
                      <Router />
                    </ErrorBoundary>
                  </PipProvider>
                </CallProvider>
              </RealtimeProvider>
            </AuthProvider>
          </WouterRouter>
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
