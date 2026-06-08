import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Layout from "@/components/Layout";
import HomePage from "@/pages/HomePage";
import ReelsPage from "@/pages/ReelsPage";
import ExplorePage from "@/pages/ExplorePage";
import MessagesPage from "@/pages/MessagesPage";
import GroupsPage from "@/pages/GroupsPage";
import ProfilePage from "@/pages/ProfilePage";
import NotificationsPage from "@/pages/NotificationsPage";
import AdminPage from "@/pages/AdminPage";
import PostDetailPage from "@/pages/PostDetailPage";
import LoginPage from "@/pages/LoginPage";
import NotFound from "@/pages/not-found";

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false } },
});

function Router() {
  return (
    <Switch>
      <Route path="/login" component={LoginPage} />
      <Route path="/admin" component={() => <Layout><AdminPage /></Layout>} />
      <Route path="/reels" component={() => <Layout><ReelsPage /></Layout>} />
      <Route path="/explore" component={() => <Layout><ExplorePage /></Layout>} />
      <Route path="/messages" component={() => <Layout><MessagesPage /></Layout>} />
      <Route path="/groups" component={() => <Layout><GroupsPage /></Layout>} />
      <Route path="/profile/:id" component={({ params }) => <Layout><ProfilePage userId={Number(params.id)} /></Layout>} />
      <Route path="/profile" component={() => <Layout><ProfilePage userId={1} /></Layout>} />
      <Route path="/notifications" component={() => <Layout><NotificationsPage /></Layout>} />
      <Route path="/post/:id" component={({ params }) => <Layout><PostDetailPage postId={Number(params.id)} /></Layout>} />
      <Route path="/" component={() => <Layout><HomePage /></Layout>} />
      <Route component={NotFound} />
    </Switch>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}
