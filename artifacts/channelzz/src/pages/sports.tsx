import { useState, useEffect, useCallback, useRef } from "react";
import { useLocation } from "wouter";
import { useGetMe } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import {
  Trophy, Clock, X, RefreshCw, ChevronRight,
  Radio, AlertCircle, Search, Maximize2, Tv,
} from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────
type SrcMatch = {
  id: string;
  home_team: string;
  away_team: string;
  home_score?: number | string;
  away_score?: number | string;
  home_badge?: string;
  away_badge?: string;
  status: string; // "inprogress" | "upcoming" | "finished" | "live"
  time?: string;
  league?: string;
  country?: string;
  country_flag?: string;
  league_logo?: string;
  date?: string;
  start_time?: string;
  has_stream?: boolean;
};

type SrcDetail = {
  id: string;
  stream_url?: string;
  streams?: { url: string; name?: string }[];
  [key: string]: unknown;
};

// ── Status helpers ────────────────────────────────────────────────────────────
function isLive(m: SrcMatch) {
  return m.status === "inprogress" || m.status === "live" || m.status === "1H" || m.status === "2H" || m.status === "HT";
}
function isUpcoming(m: SrcMatch) {
  return m.status === "upcoming" || m.status === "NS";
}
function isFinished(m: SrcMatch) {
  return m.status === "finished" || m.status === "FT" || m.status === "AET" || m.status === "PEN";
}

function StatusPill({ m }: { m: SrcMatch }) {
  if (isLive(m)) return (
    <span className="flex items-center gap-1 text-xs font-bold text-red-500">
      <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse inline-block" />
      {m.time ? `LIVE ${m.time}` : "LIVE"}
    </span>
  );
  if (isFinished(m)) return (
    <span className="text-xs text-muted-foreground font-medium">FT {m.home_score ?? 0}–{m.away_score ?? 0}</span>
  );
  return (
    <span className="flex items-center gap-1 text-xs text-blue-400">
      <Clock className="h-3 w-3" />{m.start_time ?? m.time ?? ""}
    </span>
  );
}

// ── Team badge ────────────────────────────────────────────────────────────────
function TeamBadge({ src, name }: { src?: string; name: string }) {
  const [err, setErr] = useState(false);
  if (!src || err) return (
    <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-xs font-bold text-muted-foreground shrink-0">
      {name.slice(0, 2).toUpperCase()}
    </div>
  );
  return <img src={src} alt={name} onError={() => setErr(true)} loading="lazy" className="w-10 h-10 object-contain shrink-0" />;
}

// ── Match card ────────────────────────────────────────────────────────────────
function MatchCard({ match, onWatch, loading }: { match: SrcMatch; onWatch: (m: SrcMatch) => void; loading: boolean }) {
  const live = isLive(match);
  return (
    <div className={`rounded-xl border bg-card overflow-hidden transition-all ${live ? "border-red-500/40 shadow-[0_0_0_1px_rgba(239,68,68,0.15)]" : "border-border"}`}>
      <div className="p-4 space-y-3">
        {/* League row */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 min-w-0">
            {match.country_flag && (
              <img src={match.country_flag} alt="" className="w-4 h-3 object-cover rounded-sm shrink-0" onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
            )}
            <span className="text-xs text-muted-foreground truncate">{match.league ?? match.country ?? "Match"}</span>
          </div>
          <StatusPill m={match} />
        </div>

        {/* Teams */}
        <div className="flex items-center gap-3">
          <div className="flex flex-col items-center gap-1 flex-1 text-center min-w-0">
            <TeamBadge src={match.home_badge} name={match.home_team} />
            <span className="text-xs font-medium leading-tight line-clamp-2">{match.home_team}</span>
          </div>

          <div className="flex flex-col items-center gap-0.5 shrink-0">
            {isLive(match) || isFinished(match) ? (
              <span className="text-2xl font-bold tracking-tight">
                {match.home_score ?? 0}–{match.away_score ?? 0}
              </span>
            ) : (
              <span className="text-lg font-bold text-muted-foreground">VS</span>
            )}
          </div>

          <div className="flex flex-col items-center gap-1 flex-1 text-center min-w-0">
            <TeamBadge src={match.away_badge} name={match.away_team} />
            <span className="text-xs font-medium leading-tight line-clamp-2">{match.away_team}</span>
          </div>
        </div>
      </div>

      {/* Watch button */}
      {(live || isUpcoming(match)) && match.has_stream !== false && (
        <button
          onClick={() => onWatch(match)}
          disabled={loading}
          className="w-full flex items-center justify-between px-4 py-2.5 border-t border-border bg-card hover:bg-muted/50 transition-colors"
        >
          <div className="flex items-center gap-2">
            {live ? <Radio className="h-3.5 w-3.5 text-red-500 animate-pulse" /> : <Tv className="h-3.5 w-3.5 text-muted-foreground" />}
            <span className="text-sm font-medium">{live ? "Watch Live" : "Stream"}</span>
          </div>
          {loading ? <RefreshCw className="h-4 w-4 animate-spin text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
        </button>
      )}
    </div>
  );
}

// ── Full-screen player overlay ─────────────────────────────────────────────────
function SportsPlayer({ match, embedUrl, onClose }: { match: SrcMatch; embedUrl: string; onClose: () => void }) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [iframeLoaded, setIframeLoaded] = useState(false);
  const [iframeError, setIframeError] = useState(false);

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 shrink-0 bg-black">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-white truncate">{match.home_team} vs {match.away_team}</p>
          <p className="text-xs text-white/50">{match.league}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button onClick={() => wrapperRef.current?.requestFullscreen?.()}
            className="text-white/70 hover:text-white p-2 rounded-full hover:bg-white/10">
            <Maximize2 className="h-4 w-4" />
          </button>
          <button onClick={onClose} className="text-white/70 hover:text-white p-2 rounded-full hover:bg-white/10">
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Player */}
      <div ref={wrapperRef} className="flex-1 overflow-hidden bg-black flex items-center justify-center" style={{ position: "relative" }}>
        {!iframeLoaded && !iframeError && (
          <div className="flex flex-col items-center gap-2">
            <RefreshCw className="h-6 w-6 animate-spin text-white/50" />
            <p className="text-sm text-white/50">Loading stream...</p>
          </div>
        )}
        
        {iframeError && (
          <div className="flex flex-col items-center gap-3 text-center">
            <AlertCircle className="h-10 w-10 text-red-400" />
            <div>
              <p className="text-white font-medium">Stream failed to load</p>
              <p className="text-sm text-white/50 mt-1">The stream may be unavailable or blocked</p>
            </div>
            <Button variant="outline" size="sm" onClick={onClose} className="text-white border-white/30 hover:bg-white/10">
              Close
            </Button>
          </div>
        )}

        <iframe
          src={embedUrl}
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "calc(100% + 280px)",
            height: "100%",
            border: "none",
            display: iframeLoaded ? "block" : "none",
          }}
          allow="autoplay; fullscreen; encrypted-media; picture-in-picture"
          allowFullScreen
          referrerPolicy="no-referrer-when-downgrade"
          title={`${match.home_team} vs ${match.away_team}`}
          onLoad={() => setIframeLoaded(true)}
          onError={() => setIframeError(true)}
          /* No sandbox — SportSRC docs explicitly say sandbox breaks their player */
        />
      </div>
    </div>
  );
}

// ── Sports categories ─────────────────────────────────────────────────────────
const DEFAULT_SPORTS = [
  { id: "football",   label: "Football",    emoji: "⚽" },
  { id: "basketball", label: "Basketball",  emoji: "🏀" },
  { id: "cricket",    label: "Cricket",     emoji: "🏏" },
  { id: "mma",        label: "MMA / UFC",   emoji: "🥊" },
  { id: "tennis",     label: "Tennis",      emoji: "🎾" },
  { id: "rugby",      label: "Rugby",       emoji: "🏉" },
];

const STATUS_FILTERS = [
  { id: "all",      label: "All" },
  { id: "live",     label: "Live" },
  { id: "upcoming", label: "Upcoming" },
  { id: "finished", label: "Finished" },
];

// ── Main page ─────────────────────────────────────────────────────────────────
export default function Sports() {
  const [, navigate] = useLocation();
  const { data: me, isLoading: loadingMe } = useGetMe();

  const [sport, setSport] = useState("football");
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [matches, setMatches] = useState<SrcMatch[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fetchingId, setFetchingId] = useState<string | null>(null);
  const [player, setPlayer] = useState<{ match: SrcMatch; embedUrl: string } | null>(null);

  useEffect(() => {
    if (!loadingMe && !me?.authenticated) navigate("/sign-in");
  }, [loadingMe, me, navigate]);

  const fetchMatches = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const date = new Date().toISOString().slice(0, 10);
      const r = await fetch(`/api/sports/live?sport=${sport}&date=${date}`);
      if (!r.ok) throw new Error(`Server error ${r.status}`);
      const data = await r.json();
      if (data.error) throw new Error(data.error);
      setMatches(Array.isArray(data) ? data : (data.matches ?? data.data ?? []));
    } catch (e: any) {
      setError(e.message ?? "Failed to load matches");
    } finally {
      setLoading(false);
    }
  }, [sport]);

  // Initial fetch + re-fetch when sport changes
  useEffect(() => { if (me?.authenticated) fetchMatches(); }, [me?.authenticated, fetchMatches]);

  // Auto-refresh every 60s
  useEffect(() => {
    const t = setInterval(() => { if (me?.authenticated) fetchMatches(); }, 60_000);
    return () => clearInterval(t);
  }, [me?.authenticated, fetchMatches]);

  const handleWatch = async (match: SrcMatch) => {
    setFetchingId(match.id);
    try {
      const r = await fetch(`/api/sports/match/${match.id}`);
      const detail: SrcDetail = await r.json();
      const embedUrl = detail.stream_url ?? detail.streams?.[0]?.url ?? "";
      if (!embedUrl) { alert("No stream available for this match yet."); return; }
      setPlayer({ match, embedUrl });
    } catch {
      alert("Could not load stream. Try again in a moment.");
    } finally {
      setFetchingId(null);
    }
  };

  // Filter
  const filtered = matches.filter(m => {
    if (statusFilter === "live"     && !isLive(m))     return false;
    if (statusFilter === "upcoming" && !isUpcoming(m)) return false;
    if (statusFilter === "finished" && !isFinished(m)) return false;
    if (search && !m.home_team.toLowerCase().includes(search.toLowerCase()) &&
        !m.away_team.toLowerCase().includes(search.toLowerCase()) &&
        !(m.league ?? "").toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const liveCnt = matches.filter(isLive).length;

  if (loadingMe) return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
    </div>
  );

  return (
    <>
      {player && <SportsPlayer match={player.match} embedUrl={player.embedUrl} onClose={() => setPlayer(null)} />}

      <div className="container mx-auto px-4 py-6 space-y-5 max-w-5xl">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Trophy className="h-6 w-6 text-primary" /> Sports
              {liveCnt > 0 && <Badge variant="destructive" className="text-xs animate-pulse">{liveCnt} LIVE</Badge>}
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">Live matches · auto-refreshes every 60s</p>
          </div>
          <Button variant="outline" size="sm" onClick={fetchMatches} disabled={loading} className="gap-2">
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Refresh
          </Button>
        </div>

        {/* Sport tabs */}
        <div className="flex gap-2 overflow-x-auto pb-1 hide-scrollbar">
          {DEFAULT_SPORTS.map(s => (
            <button key={s.id} onClick={() => setSport(s.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap shrink-0 transition-colors ${sport === s.id ? "bg-primary text-primary-foreground" : "bg-card border border-border hover:bg-muted"}`}>
              <span>{s.emoji}</span>{s.label}
            </button>
          ))}
        </div>

        {/* Search + status filter */}
        <div className="flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-[160px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input placeholder="Search teams or league…" className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <div className="flex gap-1.5 flex-wrap">
            {STATUS_FILTERS.map(f => (
              <button key={f.id} onClick={() => setStatusFilter(f.id)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${statusFilter === f.id ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/70"}`}>
                {f.label}
                {f.id === "live" && liveCnt > 0 && (
                  <span className="ml-1.5 bg-red-500 text-white text-[10px] px-1 rounded-full">{liveCnt}</span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="flex items-center gap-3 p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive">
            <AlertCircle className="h-5 w-5 shrink-0" />
            <div className="flex-1">
              <p className="font-medium text-sm">{error}</p>
              {error.includes("not configured") && (
                <p className="text-xs mt-1 opacity-80">Add SPORTSRC_KEY_1 and SPORTSRC_KEY_2 to your Render environment variables.</p>
              )}
            </div>
            <Button size="sm" variant="outline" onClick={fetchMatches} className="border-destructive/30 shrink-0">Retry</Button>
          </div>
        )}

        {/* Loading skeletons */}
        {loading && matches.length === 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 9 }).map((_, i) => (
              <div key={i} className="rounded-xl border border-border p-4 space-y-3">
                <Skeleton className="h-3 w-28" />
                <div className="flex items-center justify-between gap-3">
                  <div className="flex flex-col items-center gap-2 flex-1">
                    <Skeleton className="w-10 h-10 rounded-full" />
                    <Skeleton className="h-3 w-20" />
                  </div>
                  <Skeleton className="h-6 w-10" />
                  <div className="flex flex-col items-center gap-2 flex-1">
                    <Skeleton className="w-10 h-10 rounded-full" />
                    <Skeleton className="h-3 w-20" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Matches grid */}
        {filtered.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map(m => (
              <MatchCard key={m.id} match={m} onWatch={handleWatch} loading={fetchingId === m.id} />
            ))}
          </div>
        )}

        {/* Empty */}
        {!loading && !error && filtered.length === 0 && (
          <div className="py-20 text-center space-y-3">
            <Trophy className="h-10 w-10 mx-auto text-muted-foreground/30" />
            <p className="text-muted-foreground font-medium">No {statusFilter !== "all" ? statusFilter : ""} {sport} matches today</p>
            <p className="text-sm text-muted-foreground/60">Try a different sport or check back later</p>
            {statusFilter !== "all" && (
              <Button variant="outline" size="sm" onClick={() => setStatusFilter("all")}>Show all</Button>
            )}
          </div>
        )}
      </div>
    </>
  );
}
