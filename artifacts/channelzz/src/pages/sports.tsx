import { useState, useEffect, useCallback } from "react";
import { useLocation } from "wouter";
import { useGetMe } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Trophy, Clock, Tv, X, RefreshCw, ChevronRight,
  Wifi, Radio, AlertCircle,
} from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────
type CdnChannel = {
  channel_name: string;
  channel_code: string;
  viewers: string;
  url: string;
  image: string;
};

type SportEvent = {
  gameID: string;
  homeTeam: string;
  awayTeam: string;
  homeTeamIMG: string;
  awayTeamIMG: string;
  time: string;
  tournament: string;
  country: string;
  countryIMG: string;
  status: "live" | "upcoming" | "finished";
  start: string;
  end: string;
  channels: CdnChannel[];
};

type SportsData = {
  Soccer?: SportEvent[];
  NFL?: SportEvent[];
  NBA?: SportEvent[];
  NHL?: SportEvent[];
  total_events?: number;
};

type PlayerState = {
  eventName: string;
  channelName: string;
  channelImg: string;
  embedUrl: string;
  channelId: string | null;
};

// ── Sport config ──────────────────────────────────────────────────────────────
const SPORTS = [
  { key: "all",    label: "All Sports",  emoji: "🏆" },
  { key: "Soccer", label: "Football",    emoji: "⚽" },
  { key: "NFL",    label: "NFL",         emoji: "🏈" },
  { key: "NBA",    label: "NBA",         emoji: "🏀" },
  { key: "NHL",    label: "NHL",         emoji: "🏒" },
] as const;

const STATUS_FILTERS = ["all", "live", "upcoming", "finished"] as const;

// ── Status badge ──────────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
  if (status === "live") return (
    <span className="flex items-center gap-1 text-xs font-bold text-red-500">
      <span className="inline-block w-2 h-2 rounded-full bg-red-500 animate-pulse" /> LIVE
    </span>
  );
  if (status === "upcoming") return (
    <span className="flex items-center gap-1 text-xs text-blue-400">
      <Clock className="h-3 w-3" /> Upcoming
    </span>
  );
  return <span className="text-xs text-muted-foreground">Finished</span>;
}

// ── Team logo with fallback ───────────────────────────────────────────────────
function TeamLogo({ src, alt }: { src: string; alt: string }) {
  const [err, setErr] = useState(false);
  if (err || !src) return (
    <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-xs font-bold text-muted-foreground">
      {alt.slice(0, 2).toUpperCase()}
    </div>
  );
  return <img src={src} alt={alt} className="w-10 h-10 object-contain" onError={() => setErr(true)} />;
}

// ── Inline iframe player overlay ──────────────────────────────────────────────
function SportsPlayer({ state, onClose }: { state: PlayerState; onClose: () => void }) {
  const [, navigate] = useLocation();

  const handleFullChannel = () => {
    if (state.channelId) {
      onClose();
      navigate(`/watch/${state.channelId}`);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/90 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 shrink-0">
        <div className="flex items-center gap-3">
          <img src={state.channelImg} alt={state.channelName}
            className="w-8 h-8 rounded object-contain bg-black"
            onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
          <div>
            <p className="text-sm font-semibold text-white">{state.channelName}</p>
            <p className="text-xs text-white/60">{state.eventName}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {state.channelId && (
            <Button size="sm" variant="outline" onClick={handleFullChannel} className="gap-1.5 text-xs border-white/20 text-white hover:bg-white/10">
              <Tv className="h-3.5 w-3.5" /> Full Player
            </Button>
          )}
          <Button size="sm" variant="ghost" onClick={onClose} className="text-white hover:bg-white/10 rounded-full p-2">
            <X className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* Player */}
      <div className="flex-1 relative overflow-hidden">
        {state.channelId ? (
          /* Routed through full player page in iframe */
          <iframe
            src={`/watch/${state.channelId}`}
            className="w-full h-full border-0"
            allow="autoplay; fullscreen"
            title={state.channelName}
          />
        ) : (
          /* CDN embed URL directly */
          <div className="relative w-full h-full">
            <iframe
              src={state.embedUrl}
              className="w-full h-full border-0"
              allow="autoplay; fullscreen; encrypted-media"
              referrerPolicy="no-referrer-when-downgrade"
              title={state.channelName}
            />
            {/* Click blocker — stops ads */}
            <div className="absolute inset-0 z-10" onContextMenu={e => e.preventDefault()} />
          </div>
        )}
      </div>
    </div>
  );
}

// ── Event card ────────────────────────────────────────────────────────────────
function EventCard({
  event, sport, onWatch,
}: {
  event: SportEvent;
  sport: string;
  onWatch: (event: SportEvent, channel: CdnChannel) => void;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className={`rounded-xl border bg-card overflow-hidden transition-all ${event.status === "live" ? "border-red-500/40 shadow-[0_0_0_1px_rgba(239,68,68,0.2)]" : "border-border"}`}>
      {/* Match header */}
      <div className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <img src={event.countryIMG} alt={event.country}
              className="w-5 h-3.5 object-cover rounded-sm"
              onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
            <span className="text-xs text-muted-foreground">{event.tournament}</span>
          </div>
          <StatusBadge status={event.status} />
        </div>

        {/* Teams */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex flex-col items-center gap-1.5 flex-1 text-center">
            <TeamLogo src={event.homeTeamIMG} alt={event.homeTeam} />
            <span className="text-sm font-medium leading-tight">{event.homeTeam}</span>
          </div>
          <div className="flex flex-col items-center gap-1 shrink-0">
            <span className="text-xl font-bold text-muted-foreground">VS</span>
            <span className="text-xs text-muted-foreground">{event.time}</span>
          </div>
          <div className="flex flex-col items-center gap-1.5 flex-1 text-center">
            <TeamLogo src={event.awayTeamIMG} alt={event.awayTeam} />
            <span className="text-sm font-medium leading-tight">{event.awayTeam}</span>
          </div>
        </div>
      </div>

      {/* Channels */}
      {event.channels.length > 0 && event.status !== "finished" && (
        <div className="border-t border-border">
          {/* Show first channel always, rest on expand */}
          {(expanded ? event.channels : event.channels.slice(0, 1)).map((ch, i) => (
            <button
              key={i}
              onClick={() => onWatch(event, ch)}
              className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-muted/50 transition-colors text-left border-b border-border/50 last:border-0"
            >
              <img src={ch.image} alt={ch.channel_name}
                className="w-7 h-7 rounded object-contain bg-black shrink-0"
                onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{ch.channel_name}</p>
                <p className="text-xs text-muted-foreground uppercase">{ch.channel_code}</p>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                {event.status === "live" && <Radio className="h-3.5 w-3.5 text-red-500" />}
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </div>
            </button>
          ))}
          {event.channels.length > 1 && (
            <button
              onClick={() => setExpanded(p => !p)}
              className="w-full px-4 py-2 text-xs text-primary hover:bg-muted/30 transition-colors text-center"
            >
              {expanded ? "Show less" : `+${event.channels.length - 1} more channel${event.channels.length > 2 ? "s" : ""}`}
            </button>
          )}
        </div>
      )}
      {event.status === "finished" && (
        <div className="border-t border-border px-4 py-2 text-xs text-muted-foreground text-center">Match ended</div>
      )}
    </div>
  );
}

// ── Main Sports page ──────────────────────────────────────────────────────────
export default function Sports() {
  const [, navigate] = useLocation();
  const { data: me, isLoading: loadingMe } = useGetMe();

  const [data, setData] = useState<SportsData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sport, setSport] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [player, setPlayer] = useState<PlayerState | null>(null);
  const [resolving, setResolving] = useState<string | null>(null);

  // Redirect if not authenticated
  useEffect(() => {
    if (!loadingMe && !me?.authenticated) navigate("/sign-in");
  }, [loadingMe, me, navigate]);

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const r = await fetch("/api/sports");
      if (!r.ok) throw new Error(`Error ${r.status}`);
      const json = await r.json() as { "cdnlivetv.tv": SportsData };
      setData(json["cdnlivetv.tv"] ?? json);
    } catch (e: any) {
      setError(e.message ?? "Failed to load events");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { if (me?.authenticated) fetchEvents(); }, [me, fetchEvents]);

  // Auto-refresh every 2 minutes
  useEffect(() => {
    const t = setInterval(() => { if (me?.authenticated) fetchEvents(); }, 2 * 60 * 1000);
    return () => clearInterval(t);
  }, [me, fetchEvents]);

  const handleWatch = async (event: SportEvent, channel: CdnChannel) => {
    setResolving(channel.channel_name);
    try {
      const r = await fetch(`/api/sports/resolve?name=${encodeURIComponent(channel.channel_name.toLowerCase())}`);
      const d = await r.json() as { channelId: string | null };
      setPlayer({
        eventName: `${event.homeTeam} vs ${event.awayTeam}`,
        channelName: channel.channel_name,
        channelImg: channel.image,
        embedUrl: channel.url,
        channelId: d.channelId,
      });
    } catch {
      setPlayer({
        eventName: `${event.homeTeam} vs ${event.awayTeam}`,
        channelName: channel.channel_name,
        channelImg: channel.image,
        embedUrl: channel.url,
        channelId: null,
      });
    } finally {
      setResolving(null);
    }
  };

  // Build event list from selected sport/status
  const allEvents = (() => {
    if (!data) return [];
    const keys: (keyof SportsData)[] = sport === "all"
      ? ["Soccer", "NFL", "NBA", "NHL"]
      : [sport as keyof SportsData];
    return keys.flatMap(k => {
      const arr = data[k];
      return Array.isArray(arr)
        ? arr.map(e => ({ ...e, _sport: k }))
        : [];
    });
  })();

  const filtered = allEvents.filter(e =>
    statusFilter === "all" || e.status === statusFilter
  );

  const liveCnt = allEvents.filter(e => e.status === "live").length;

  if (loadingMe) return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
    </div>
  );

  return (
    <>
      {player && <SportsPlayer state={player} onClose={() => setPlayer(null)} />}

      <div className="container mx-auto px-4 py-6 space-y-6 max-w-5xl">
        {/* Page header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Trophy className="h-6 w-6 text-primary" /> Sports
              {liveCnt > 0 && (
                <Badge variant="destructive" className="ml-2 text-xs animate-pulse">{liveCnt} LIVE</Badge>
              )}
            </h1>
            <p className="text-muted-foreground text-sm mt-0.5">Live &amp; upcoming events from CDN Live TV</p>
          </div>
          <Button variant="outline" size="sm" onClick={fetchEvents} disabled={loading} className="gap-2">
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Refresh
          </Button>
        </div>

        {/* Sport filter */}
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          {SPORTS.map(s => (
            <button key={s.key} onClick={() => setSport(s.key)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors shrink-0 ${sport === s.key ? "bg-primary text-primary-foreground" : "bg-card border border-border hover:bg-muted"}`}>
              <span>{s.emoji}</span>{s.label}
            </button>
          ))}
        </div>

        {/* Status filter */}
        <div className="flex gap-2 flex-wrap">
          {STATUS_FILTERS.map(f => (
            <button key={f} onClick={() => setStatusFilter(f)}
              className={`px-3 py-1 rounded-full text-xs font-medium capitalize transition-colors ${statusFilter === f ? "bg-primary text-primary-foreground" : "bg-muted hover:bg-muted/70 text-muted-foreground"}`}>
              {f === "all" ? "All Statuses" : f}
              {f === "live" && liveCnt > 0 && <span className="ml-1.5 bg-red-500 text-white px-1.5 py-0.5 rounded-full text-[10px]">{liveCnt}</span>}
            </button>
          ))}
        </div>

        {/* Error */}
        {error && (
          <div className="flex items-center gap-3 p-4 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive">
            <AlertCircle className="h-5 w-5 shrink-0" />
            <div>
              <p className="font-medium">Failed to load events</p>
              <p className="text-sm opacity-80">{error}</p>
            </div>
            <Button size="sm" variant="outline" onClick={fetchEvents} className="ml-auto border-destructive/30">Retry</Button>
          </div>
        )}

        {/* Loading skeletons */}
        {loading && !data && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="rounded-xl border border-border p-4 space-y-3">
                <Skeleton className="h-4 w-24" />
                <div className="flex items-center justify-between">
                  <div className="flex flex-col items-center gap-2">
                    <Skeleton className="w-10 h-10 rounded-full" />
                    <Skeleton className="h-3 w-20" />
                  </div>
                  <Skeleton className="h-6 w-8" />
                  <div className="flex flex-col items-center gap-2">
                    <Skeleton className="w-10 h-10 rounded-full" />
                    <Skeleton className="h-3 w-20" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Events grid */}
        {!loading && filtered.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map(event => (
              <div key={event.gameID} className="relative">
                {resolving === event.channels[0]?.channel_name && (
                  <div className="absolute inset-0 z-10 bg-background/60 rounded-xl flex items-center justify-center">
                    <RefreshCw className="h-5 w-5 animate-spin text-primary" />
                  </div>
                )}
                <EventCard event={event} sport={(event as any)._sport} onWatch={handleWatch} />
              </div>
            ))}
          </div>
        )}

        {/* Empty state */}
        {!loading && !error && filtered.length === 0 && data && (
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
            <Wifi className="h-10 w-10 text-muted-foreground/50" />
            <p className="text-muted-foreground font-medium">No events found</p>
            <p className="text-sm text-muted-foreground/70">
              {statusFilter !== "all" ? `No ${statusFilter} events right now.` : "No events available."}
            </p>
            {statusFilter !== "all" && (
              <Button variant="outline" size="sm" onClick={() => setStatusFilter("all")}>Show all events</Button>
            )}
          </div>
        )}
      </div>
    </>
  );
}
