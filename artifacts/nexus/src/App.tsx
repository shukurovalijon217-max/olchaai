import { useEffect, Component, type ReactNode } from "react";
import "@/lib/i18n";
import { Switch, Route, Router as WouterRouter, useLocation } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { RealtimeProvider } from "@/context/RealtimeContext";
import { CallProvider } from "@/context/CallContext";
import { PipProvider } from "@/context/PipContext";
import Layout from "@/components/Layout";
import HomePage from "@/pages/HomePage";
import ReelsPage from "@/pages/ReelsPage";
import OTubePage from "@/pages/OTubePage";
import ExplorePage from "@/pages/ExplorePage";
import MessagesPage from "@/pages/MessagesPage";
import GroupsPage from "@/pages/GroupsPage";
import ProfilePage from "@/pages/ProfilePage";
import NotificationsPage from "@/pages/NotificationsPage";
import AdminPage from "@/pages/AdminPage";
import PremiumPage from "@/pages/PremiumPage";
import SettingsPage from "@/pages/SettingsPage";
import PostDetailPage from "@/pages/PostDetailPage";
import LoginPage from "@/pages/LoginPage";
import WalletPage from "@/pages/WalletPage";
import LivePage from "@/pages/LivePage";
import LiveExplorePage from "@/pages/LiveExplorePage";
import SearchPage from "@/pages/SearchPage";
import MarketplacePage from "@/pages/MarketplacePage";
import ProductDetailPage from "@/pages/ProductDetailPage";
import SellPage from "@/pages/SellPage";
import MyShopPage from "@/pages/MyShopPage";
import SellerProfilePage from "@/pages/SellerProfilePage";
import AIChatPage from "@/pages/AIChatPage";
import LibraryPage from "@/pages/LibraryPage";
import QuestsPage from "@/pages/QuestsPage";
import CoViewPage from "@/pages/CoViewPage";
import AnonZonesPage from "@/pages/AnonZonesPage";
import MultiScenePage from "@/pages/MultiScenePage";
import MoodMapPage from "@/pages/MoodMapPage";
import AITwinPage from "@/pages/AITwinPage";
import FactCheckPage from "@/pages/FactCheckPage";
import CoSpacesPage from "@/pages/CoSpacesPage";
import MuniAIPage from "@/pages/MuniAIPage";
import VoiceTranslatorPage from "@/pages/VoiceTranslatorPage";
import FeatureHubPage from "@/pages/FeatureHubPage";
import NotFound from "@/pages/not-found";

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false } },
});

class ErrorBoundary extends Component<{ children: ReactNode; fallback?: ReactNode }, { hasError: boolean; error: Error | null }> {
  constructor(props: { children: ReactNode; fallback?: ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }
  render() {
    if (this.state.hasError) {
      return this.props.fallback ?? (
        <div className="min-h-screen flex flex-col items-center justify-center bg-background gap-4">
          <div className="text-destructive text-4xl">⚠</div>
          <p className="text-muted-foreground text-sm">Sahifada xato yuz berdi. Qayta yuklang.</p>
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
    <Switch>
      <Route path="/login" component={LoginPage} />
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
      <Route path="/" component={() => (
        <ProtectedRoute><Layout><HomePage /></Layout></ProtectedRoute>
      )} />
      <Route component={NotFound} />
    </Switch>
  );
}

export default function App() {
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
