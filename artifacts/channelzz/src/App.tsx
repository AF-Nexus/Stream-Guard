import { Switch, Route, Router as WouterRouter, Redirect } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme-provider";
import { Layout } from "@/components/layout";
import { WhatsAppButton } from "@/components/whatsapp-button";
import { useGetMe } from "@workspace/api-client-react";

import Home from "@/pages/home";
import Watch from "@/pages/watch";
import Player from "@/pages/player";
import NotFound from "@/pages/not-found";
import Admin from "@/pages/admin";
import SignIn from "@/pages/sign-in";
import SignUp from "@/pages/sign-up";

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { refetchOnWindowFocus: false, retry: 1 },
  },
});

function Loading() {
  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-background">
      <div className="text-muted-foreground text-sm">Loading…</div>
    </div>
  );
}

function HomeRedirect() {
  const { data: me, isLoading } = useGetMe();
  if (isLoading) return <Loading />;
  if (me?.authenticated) return <Redirect to="/watch" />;
  return <Layout><Home /></Layout>;
}

function WatchPortal() {
  const { data: me, isLoading } = useGetMe();
  if (isLoading) return <Loading />;
  if (!me?.authenticated) return <Redirect to="/sign-in" />;
  return (
    <Layout>
      <Watch />
      <WhatsAppButton />
    </Layout>
  );
}

function PlayerPortal() {
  const { data: me, isLoading } = useGetMe();
  if (isLoading) return <Loading />;
  if (!me?.authenticated) return <Redirect to="/sign-in" />;
  return (
    <Layout>
      <Player />
      <WhatsAppButton />
    </Layout>
  );
}

function AdminPortal() {
  const { data: me, isLoading } = useGetMe();
  if (isLoading) return <Loading />;
  if (!me?.authenticated) return <Redirect to="/sign-in" />;
  if (me.role !== "admin") return <Redirect to="/watch" />;
  return (
    <Layout>
      <Admin />
    </Layout>
  );
}

function App() {
  return (
    <ThemeProvider defaultTheme="dark" storageKey="channelzz-theme">
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <WouterRouter base={basePath}>
            <Switch>
              <Route path="/" component={HomeRedirect} />
              <Route path="/sign-in" component={SignIn} />
              <Route path="/sign-up" component={SignUp} />
              <Route path="/watch" component={WatchPortal} />
              <Route path="/watch/:id" component={PlayerPortal} />
              <Route path="/admin" component={AdminPortal} />
              <Route component={NotFound} />
            </Switch>
          </WouterRouter>
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

export default App;
