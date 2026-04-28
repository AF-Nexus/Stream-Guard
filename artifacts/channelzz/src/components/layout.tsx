import React from "react";
import { Link, useLocation } from "wouter";
import { useTheme } from "./theme-provider";
import { Moon, Sun, Tv, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useQueryClient } from "@tanstack/react-query";
import { useGetMe, getGetMeQueryKey } from "@workspace/api-client-react";
import { postJson } from "@/lib/auth-fetch";

export function Layout({ children }: { children: React.ReactNode }) {
  const { theme, setTheme } = useTheme();
  const [location, setLocation] = useLocation();
  const { data: me } = useGetMe();
  const queryClient = useQueryClient();

  const toggleTheme = () => setTheme(theme === "dark" ? "light" : "dark");
  const isHome = location === "/";

  async function handleSignOut() {
    try { await postJson("/auth/logout"); } catch { /* ignore */ }
    // Remove queries before clearing so refetch doesn't fire with stale data
    queryClient.removeQueries();
    setLocation("/sign-in");
  }

  const isAdmin = me?.authenticated && me.role === "admin";

  return (
    <div className="min-h-[100dvh] flex flex-col w-full selection:bg-primary/30">
      <header className={`sticky top-0 z-50 w-full border-b transition-colors duration-200 ${isHome ? 'bg-background/80 backdrop-blur-md border-border/50' : 'bg-background border-border'}`}>
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 group">
            <div className="bg-primary/10 p-2 rounded-lg group-hover:bg-primary/20 transition-colors">
              <Tv className="h-6 w-6 text-primary" />
            </div>
            <span className="font-sans font-bold text-xl tracking-tight italic">
              Channelzz
            </span>
          </Link>

          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={toggleTheme} className="rounded-full">
              {theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </Button>

            {!me?.authenticated && (
              <Link href="/sign-in" className="inline-flex h-9 items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90">
                Sign In
              </Link>
            )}

            {me?.authenticated && (
              <>
                {isAdmin && (
                  <Link href="/admin" className="text-sm font-medium hover:text-primary transition-colors hidden sm:block mr-2">
                    Admin
                  </Link>
                )}
                <Link href="/watch" className="text-sm font-medium hover:text-primary transition-colors hidden sm:block mr-2">
                  Watch
                </Link>
                <Button variant="outline" size="sm" onClick={handleSignOut} className="rounded-md gap-2">
                  <LogOut className="h-4 w-4" />
                  <span className="hidden sm:inline">Sign Out</span>
                </Button>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1 flex flex-col">
        {children}
      </main>

      <footer className="border-t border-border bg-card py-8">
        <div className="container mx-auto px-4 text-center flex flex-col items-center justify-center gap-4">
          <div className="flex items-center gap-2 group cursor-default">
            <span className="text-muted-foreground font-medium">Made by a boy from Malawi</span>
            <span className="inline-block hover:scale-110 transition-transform">🇲🇼</span>
            <div className="h-2 w-2 rounded-full bg-primary animate-pulse ml-1" />
          </div>
          <p className="text-xs text-muted-foreground/70 font-mono">
            Entertainment without borders.
          </p>
        </div>
      </footer>
    </div>
  );
}
