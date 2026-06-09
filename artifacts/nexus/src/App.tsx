import { useEffect } from "react";
import "@/lib/i18n";
import { Switch, Route, Router as WouterRouter, useLocation } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import Layout from "@/components/Layout";
import HomePage from "@/pages/HomePage";
import ReelsPage from "@/pages/ReelsPage";
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
import NotFound from "@/pages/not-found";

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false } },
});

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
      <Route path="/" component={() => (
        <ProtectedRoute><Layout><HomePage /></Layout></ProtectedRoute>
      )} />
      <Route component={NotFound} />
    </Switch>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <AuthProvider>
            <Router />
          </AuthProvider>
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}
