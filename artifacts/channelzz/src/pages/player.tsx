import { useEffect, useRef, useState } from "react";
import { useParams, useLocation, Link } from "wouter";
import { useGetMe, useGetChannel, useRequestPlayToken } from "@workspace/api-client-react";
import Hls from "hls.js";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, AlertTriangle } from "lucide-react";

export default function Player() {
  const params = useParams();
  const id = params.id;
  const [, setLocation] = useLocation();
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);

  const { data: me, isLoading: isLoadingMe } = useGetMe();
  const { data: channel, isLoading: isLoadingChannel, error: channelError } = useGetChannel(id || "");
  const requestPlayToken = useRequestPlayToken();
  const [error, setError] = useState<string | null>(null);

  const isBlocked = !me || me.banned || me.access === "expired" || me.access === "banned";

  // Redirect if blocked
  useEffect(() => {
    if (!isLoadingMe && isBlocked) {
      setLocation("/watch");
    }
  }, [isLoadingMe, isBlocked, setLocation]);

  useEffect(() => {
    if (isLoadingMe || isLoadingChannel || isBlocked || !id || !videoRef.current) return;

    let mounted = true;

    const initPlayer = async () => {
      try {
        const ticket = await requestPlayToken.mutateAsync({ id });
        
        if (!mounted) return;

        const video = videoRef.current;
        if (!video) return;

        if (Hls.isSupported()) {
          const hls = new Hls({
            enableWorker: true,
            lowLatencyMode: true,
          });
          hlsRef.current = hls;

          hls.loadSource(ticket.playlistUrl);
          hls.attachMedia(video);
          
          hls.on(Hls.Events.MANIFEST_PARSED, () => {
            video.play().catch(e => console.error("Autoplay prevented:", e));
          });

          hls.on(Hls.Events.ERROR, (_, data) => {
            if (data.fatal) {
              switch (data.type) {
                case Hls.ErrorTypes.NETWORK_ERROR:
                  hls.startLoad();
                  break;
                case Hls.ErrorTypes.MEDIA_ERROR:
                  hls.recoverMediaError();
                  break;
                default:
                  hls.destroy();
                  setError("A fatal playback error occurred.");
                  break;
              }
            }
          });
        } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
          // Native HLS support (Safari)
          video.src = ticket.playlistUrl;
          video.addEventListener("loadedmetadata", () => {
            video.play().catch(e => console.error("Autoplay prevented:", e));
          });
        } else {
          setError("Your browser does not support HLS playback.");
        }
      } catch (err) {
        console.error("Failed to load stream:", err);
        setError("Failed to load the stream. It may be offline or you may not have access.");
      }
    };

    initPlayer();

    return () => {
      mounted = false;
      if (hlsRef.current) {
        hlsRef.current.destroy();
      }
    };
  }, [id, isLoadingMe, isLoadingChannel, isBlocked]);

  if (isLoadingMe || isLoadingChannel) {
    return (
      <div className="container py-8 max-w-5xl space-y-6">
        <Skeleton className="w-32 h-10" />
        <Skeleton className="w-full aspect-video rounded-xl bg-black" />
        <div className="space-y-2">
          <Skeleton className="w-1/3 h-8" />
          <Skeleton className="w-2/3 h-4" />
        </div>
      </div>
    );
  }

  if (channelError || !channel) {
    return (
      <div className="container py-20 max-w-lg text-center space-y-6">
        <AlertTriangle className="h-12 w-12 text-destructive mx-auto" />
        <h2 className="text-2xl font-bold">Channel Not Found</h2>
        <p className="text-muted-foreground">The channel you are looking for does not exist or was removed.</p>
        <Button onClick={() => setLocation("/watch")}>Return to Channels</Button>
      </div>
    );
  }

  return (
    <div className="container py-6 max-w-5xl space-y-6">
      <Link href="/watch">
        <Button variant="ghost" className="gap-2 -ml-4 hover:bg-secondary">
          <ArrowLeft className="h-4 w-4" /> Back to Channels
        </Button>
      </Link>

      <div className="bg-black rounded-xl overflow-hidden shadow-2xl border border-border relative aspect-video group">
        {error ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center space-y-4 bg-secondary/20">
            <AlertTriangle className="h-10 w-10 text-destructive" />
            <p className="font-medium">{error}</p>
          </div>
        ) : (
          <video
            ref={videoRef}
            className="w-full h-full outline-none"
            controls
            autoPlay
            playsInline
            controlsList="nodownload noremoteplayback"
            disablePictureInPicture
            onContextMenu={e => e.preventDefault()}
            crossOrigin="anonymous"
          />
        )}
      </div>

      <div className="bg-card border border-border p-6 rounded-xl flex items-start gap-6">
        <div className="h-20 w-20 bg-black/20 rounded-lg flex items-center justify-center shrink-0 border border-border/50 p-2 overflow-hidden">
          {channel.logoUrl ? (
            <img src={channel.logoUrl} alt={channel.name} className="max-w-full max-h-full object-contain" />
          ) : (
            <span className="text-muted-foreground font-bold">TV</span>
          )}
        </div>
        <div className="space-y-2 flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight">{channel.name}</h1>
            {channel.isLive && (
              <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-red-500/10 text-red-500 text-xs font-bold uppercase tracking-wider border border-red-500/20">
                <span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse" />
                Live
              </div>
            )}
          </div>
          {channel.categoryName && (
            <span className="text-sm font-medium text-primary bg-primary/10 px-2 py-0.5 rounded">
              {channel.categoryName}
            </span>
          )}
          {channel.description && (
            <p className="text-muted-foreground mt-2">{channel.description}</p>
          )}
        </div>
      </div>
    </div>
  );
}
