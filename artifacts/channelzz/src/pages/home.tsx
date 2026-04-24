import { useState, useEffect } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { useGetSettings, useListCategories } from "@workspace/api-client-react";
import { Tv, Play, ShieldCheck, Zap, Globe, ChevronRight } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export default function Home() {
  const { data: settings, isLoading: isLoadingSettings } = useGetSettings();
  const { data: categories, isLoading: isLoadingCategories } = useListCategories();

  return (
    <div className="flex flex-col min-h-[100dvh]">
      {/* Hero Section */}
      <section className="relative w-full min-h-[70vh] sm:min-h-[80vh] sm:h-[80vh] py-12 sm:py-0 flex items-center justify-center overflow-hidden bg-black">
        <div className="absolute inset-0 z-0">
          <img 
            src="/hero-bg.png" 
            alt="Cinematic background" 
            className="w-full h-full object-cover opacity-60"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-r from-background/80 to-transparent" />
        </div>

        <div className="container relative z-10 px-4 md:px-6">
          <div className="max-w-3xl space-y-6">
            <div className="inline-flex items-center rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-sm font-medium text-primary backdrop-blur-sm">
              <span className="flex h-2 w-2 rounded-full bg-primary mr-2 animate-pulse"></span>
              Live TV Streaming
            </div>
            <h1 className="text-4xl sm:text-5xl md:text-7xl font-black tracking-tight text-white italic drop-shadow-lg">
              Unlimited <span className="text-primary">Entertainment</span> Without Borders
            </h1>
            <p className="text-base sm:text-xl text-gray-300 md:text-2xl max-w-[600px] font-medium drop-shadow-md">
              Stream live sports, breaking news, blockbuster movies, and more. Premium quality straight to your device.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 pt-4">
              <Link href="/sign-in">
                <Button size="lg" className="h-14 px-8 text-lg font-bold rounded-full w-full sm:w-auto shadow-xl shadow-primary/20 hover:scale-105 transition-transform">
                  <Play className="mr-2 h-5 w-5 fill-current" />
                  Start Watching Now
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 bg-background">
        <div className="container px-4 md:px-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="flex flex-col items-center text-center p-6 space-y-4 rounded-2xl bg-card border border-border/50 shadow-sm hover:shadow-md transition-shadow">
              <div className="p-4 rounded-full bg-primary/10 text-primary">
                <Zap className="h-8 w-8" />
              </div>
              <h3 className="text-xl font-bold">Lightning Fast</h3>
              <p className="text-muted-foreground">Seamless streaming over optimized HLS networks for zero buffering.</p>
            </div>
            <div className="flex flex-col items-center text-center p-6 space-y-4 rounded-2xl bg-card border border-border/50 shadow-sm hover:shadow-md transition-shadow">
              <div className="p-4 rounded-full bg-primary/10 text-primary">
                <Globe className="h-8 w-8" />
              </div>
              <h3 className="text-xl font-bold">Anywhere, Anytime</h3>
              <p className="text-muted-foreground">Watch on your phone, tablet, or smart TV. Your entertainment goes with you.</p>
            </div>
            <div className="flex flex-col items-center text-center p-6 space-y-4 rounded-2xl bg-card border border-border/50 shadow-sm hover:shadow-md transition-shadow">
              <div className="p-4 rounded-full bg-primary/10 text-primary">
                <ShieldCheck className="h-8 w-8" />
              </div>
              <h3 className="text-xl font-bold">Premium Access</h3>
              <p className="text-muted-foreground">High-definition content curated for the ultimate viewing experience.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Categories Preview */}
      <section className="py-20 bg-muted/30 border-y border-border/50">
        <div className="container px-4 md:px-6 space-y-10">
          <div className="flex items-center justify-between">
            <h2 className="text-3xl font-bold tracking-tight">Something for Everyone</h2>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {isLoadingCategories ? (
              Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-32 rounded-xl" />
              ))
            ) : categories && categories.length > 0 ? (
              categories.slice(0, 5).map((category) => (
                <div key={category.id} className="relative group overflow-hidden rounded-xl bg-card border border-border/50 aspect-video flex items-center justify-center cursor-default">
                  <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-background/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                  <span className="font-bold text-lg relative z-10 group-hover:scale-110 transition-transform">{category.name}</span>
                </div>
              ))
            ) : (
              <div className="col-span-full text-center text-muted-foreground py-8">
                More categories coming soon.
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Pricing / CTA */}
      <section className="py-24 bg-background relative overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-3xl h-[400px] bg-primary/5 blur-[120px] rounded-full pointer-events-none" />
        <div className="container relative z-10 px-4 md:px-6">
          <div className="max-w-2xl mx-auto text-center space-y-8 bg-card border border-border/50 rounded-3xl p-8 md:p-12 shadow-2xl">
            <Tv className="h-12 w-12 text-primary mx-auto" />
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight">Ready to start watching?</h2>
            
            <div className="bg-muted/50 rounded-xl p-6 border border-border/50 text-left">
              {isLoadingSettings ? (
                <div className="space-y-2">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-5/6" />
                  <Skeleton className="h-4 w-4/6" />
                </div>
              ) : (
                <p className="text-lg text-muted-foreground whitespace-pre-wrap">
                  {settings?.pricingText || "Get access to all premium channels today."}
                </p>
              )}
            </div>

            <Link href="/sign-in">
              <Button size="lg" className="h-14 px-8 text-lg font-bold rounded-full w-full sm:w-auto mt-4">
                Create Free Account <ChevronRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
