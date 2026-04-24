import { useEffect, useRef, useState } from "react";
import { ClerkProvider, SignIn, SignUp, Show, useClerk } from "@clerk/react";
import { shadcn } from "@clerk/themes";
import { Switch, Route, useLocation, Router as WouterRouter, Redirect } from "wouter";
import { QueryClient, QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme-provider";
import { Layout } from "@/components/layout";
import { WhatsAppButton } from "@/components/whatsapp-button";

import Home from "@/pages/home";
import Watch from "@/pages/watch";
import Player from "@/pages/player";
import NotFound from "@/pages/not-found";

const clerkPubKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;
const clerkProxyUrl = import.meta.env.VITE_CLERK_PROXY_URL;
const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

const queryClient = new QueryClient();

function stripBase(path: string): string {
  return basePath && path.startsWith(basePath)
    ? path.slice(basePath.length) || "/"
    : path;
}

if (!clerkPubKey) {
  throw new Error("Missing VITE_CLERK_PUBLISHABLE_KEY in .env file");
}

const clerkAppearance = {
  theme: shadcn,
  cssLayerName: "clerk",
  options: {
    logoPlacement: "inside" as const,
    logoLinkUrl: basePath || "/",
    logoImageUrl: `${window.location.origin}${basePath}/logo.svg`,
  },
  variables: {
    colorPrimary: "hsl(345 83% 53%)",
    colorForeground: "hsl(0 0% 98%)",
    colorMutedForeground: "hsl(240 5% 65%)",
    colorDanger: "hsl(0 62% 30%)",
    colorBackground: "hsl(240 10% 6%)",
    colorInput: "hsl(240 10% 12%)",
    colorInputForeground: "hsl(0 0% 98%)",
    colorNeutral: "hsl(240 10% 12%)",
    fontFamily: "'Outfit', sans-serif",
    borderRadius: "0.75rem",
  },
  elements: {
    rootBox: "w-full",
    cardBox: "bg-card rounded-2xl w-[440px] max-w-full overflow-hidden border border-border shadow-xl",
    card: "!shadow-none !border-0 !bg-transparent !rounded-none",
    footer: "!shadow-none !border-0 !bg-transparent !rounded-none",
    headerTitle: "text-foreground font-bold",
    headerSubtitle: "text-muted-foreground",
    socialButtonsBlockButtonText: "text-foreground font-medium",
    formFieldLabel: "text-foreground font-medium",
    footerActionLink: "text-primary hover:text-primary/80 font-semibold",
    footerActionText: "text-muted-foreground",
    dividerText: "text-muted-foreground bg-card",
    identityPreviewEditButton: "text-primary hover:text-primary/80",
    formFieldSuccessText: "text-green-500",
    alertText: "text-foreground",
    logoBox: "flex justify-center mb-4",
    logoImage: "h-12 w-auto",
    socialButtonsBlockButton: "border-border hover:bg-muted/50 bg-background text-foreground",
    formButtonPrimary: "bg-primary hover:bg-primary/90 text-primary-foreground font-bold shadow-md",
    formFieldInput: "bg-input border-border text-foreground focus:ring-primary",
    footerAction: "bg-muted/30 pt-6 pb-6",
    dividerLine: "bg-border",
    alert: "bg-destructive/10 border-destructive/20 text-foreground",
    otpCodeFieldInput: "bg-input border-border text-foreground focus:ring-primary",
    formFieldRow: "mb-4",
    main: "gap-6",
  },
};

function SignInPage() {
  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-background px-4 py-12 relative overflow-hidden">
      <div className="absolute inset-0 z-0 opacity-20 pointer-events-none">
        <div className="absolute top-1/4 -left-1/4 w-1/2 h-1/2 bg-primary/30 blur-[120px] rounded-full mix-blend-screen" />
        <div className="absolute bottom-1/4 -right-1/4 w-1/2 h-1/2 bg-blue-500/20 blur-[120px] rounded-full mix-blend-screen" />
      </div>
      <div className="z-10 w-full max-w-[440px]">
        <SignIn routing="path" path={`${basePath}/sign-in`} signUpUrl={`${basePath}/sign-up`} />
      </div>
    </div>
  );
}

function SignUpPage() {
  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-background px-4 py-12 relative overflow-hidden">
      <div className="absolute inset-0 z-0 opacity-20 pointer-events-none">
        <div className="absolute top-1/4 -left-1/4 w-1/2 h-1/2 bg-primary/30 blur-[120px] rounded-full mix-blend-screen" />
        <div className="absolute bottom-1/4 -right-1/4 w-1/2 h-1/2 bg-blue-500/20 blur-[120px] rounded-full mix-blend-screen" />
      </div>
      <div className="z-10 w-full max-w-[440px]">
        <SignUp routing="path" path={`${basePath}/sign-up`} signInUrl={`${basePath}/sign-in`} />
      </div>
    </div>
  );
}

function ClerkQueryClientCacheInvalidator() {
  const { addListener } = useClerk();
  const queryClient = useQueryClient();
  const prevUserIdRef = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    const unsubscribe = addListener(({ user }) => {
      const userId = user?.id ?? null;
      if (
        prevUserIdRef.current !== undefined &&
        prevUserIdRef.current !== userId
      ) {
        queryClient.clear();
      }
      prevUserIdRef.current = userId;
    });
    return unsubscribe;
  }, [addListener, queryClient]);

  return null;
}

function HomeRedirect() {
  return (
    <>
      <Show when="signed-in">
        <Redirect to="/watch" />
      </Show>
      <Show when="signed-out">
        <Layout><Home /></Layout>
      </Show>
    </>
  );
}

function WatchPortal() {
  return (
    <>
      <Show when="signed-in">
        <Layout>
          <Watch />
          <WhatsAppButton />
        </Layout>
      </Show>
      <Show when="signed-out">
        <Redirect to="/" />
      </Show>
    </>
  );
}

function PlayerPortal() {
  return (
    <>
      <Show when="signed-in">
        <Layout>
          <Player />
          <WhatsAppButton />
        </Layout>
      </Show>
      <Show when="signed-out">
        <Redirect to="/" />
      </Show>
    </>
  );
}

function AdminPortal() {
  return (
    <>
      <Show when="signed-in">
        <Layout>
          <div className="container py-8 text-center text-muted-foreground">Admin Portal (To Be Implemented)</div>
        </Layout>
      </Show>
      <Show when="signed-out">
        <Redirect to="/" />
      </Show>
    </>
  );
}

function ClerkProviderWithRoutes() {
  const [, setLocation] = useLocation();

  return (
    <ClerkProvider
      publishableKey={clerkPubKey}
      proxyUrl={clerkProxyUrl}
      appearance={clerkAppearance}
      signInUrl={`${basePath}/sign-in`}
      signUpUrl={`${basePath}/sign-up`}
      localization={{
        signIn: {
          start: {
            title: "Welcome back",
            subtitle: "Sign in to Channelzz",
          },
        },
      }}
      routerPush={(to) => setLocation(stripBase(to))}
      routerReplace={(to) => setLocation(stripBase(to), { replace: true })}
    >
      <QueryClientProvider client={queryClient}>
        <ClerkQueryClientCacheInvalidator />
        <Switch>
          <Route path="/" component={HomeRedirect} />
          <Route path="/sign-in/*?" component={SignInPage} />
          <Route path="/sign-up/*?" component={SignUpPage} />
          <Route path="/watch" component={WatchPortal} />
          <Route path="/watch/:id" component={PlayerPortal} />
          <Route path="/admin" component={AdminPortal} />
          <Route component={NotFound} />
        </Switch>
      </QueryClientProvider>
    </ClerkProvider>
  );
}

function App() {
  return (
    <ThemeProvider defaultTheme="dark" storageKey="channelzz-theme">
      <TooltipProvider>
        <WouterRouter base={basePath}>
          <ClerkProviderWithRoutes />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </ThemeProvider>
  );
}

export default App;
