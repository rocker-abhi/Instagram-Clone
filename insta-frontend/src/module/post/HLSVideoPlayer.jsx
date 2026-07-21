import React, { useEffect, useRef, useState } from "react";
import Hls from "hls.js";
import { Play } from "lucide-react";

export default function HLSVideoPlayer({
  src,
  poster,
  className = "",
  controls = true,
  loop = false,
  muted = false,
  playsInline = true,
  onEnded,
}) {
  const videoRef = useRef(null);
  const hlsRef = useRef(null);

  const [hasStarted, setHasStarted] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);

  // Initialize HLS and load stream ONLY after user clicks play
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !src || !hasStarted) return;

    const isHlsSource = src.includes(".m3u8") || src.includes("application/x-mpegURL");

    if (isHlsSource && Hls.isSupported()) {
      if (hlsRef.current) {
        hlsRef.current.destroy();
      }

      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: true,
      });

      hlsRef.current = hls;
      hls.loadSource(src);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        video.play().then(() => setIsPlaying(true)).catch(() => {});
      });

      hls.on(Hls.Events.ERROR, (_event, data) => {
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
              break;
          }
        }
      });
    } else if (isHlsSource && video.canPlayType("application/vnd.apple.mpegurl")) {
      // Native HLS (Safari/iOS)
      video.src = src;
      video.play().then(() => setIsPlaying(true)).catch(() => {});
    } else {
      // Standard video file fallback (.mp4, .webm)
      video.src = src;
      video.play().then(() => setIsPlaying(true)).catch(() => {});
    }

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [src, hasStarted]);

  const handlePlayClick = () => {
    if (!hasStarted) {
      setHasStarted(true);
    } else {
      const video = videoRef.current;
      if (video) {
        if (video.paused) {
          video.play().then(() => setIsPlaying(true)).catch(() => {});
        } else {
          video.pause();
          setIsPlaying(false);
        }
      }
    }
  };

  const handleVideoPlay = () => setIsPlaying(true);
  const handleVideoPause = () => setIsPlaying(false);

  return (
    <div className={`relative flex items-center justify-center overflow-hidden bg-black ${className}`}>
      <video
        ref={videoRef}
        poster={poster}
        controls={controls && hasStarted}
        loop={loop}
        muted={muted}
        playsInline={playsInline}
        className="w-full h-full object-contain"
        onPlay={handleVideoPlay}
        onPause={handleVideoPause}
        onEnded={(e) => {
          setIsPlaying(false);
          if (onEnded) onEnded(e);
        }}
      />

      {/* Play Button Overlay (shown before stream starts or when paused) */}
      {(!hasStarted || !isPlaying) && (
        <button
          type="button"
          onClick={handlePlayClick}
          className="absolute inset-0 m-auto w-16 h-16 rounded-full bg-black/60 hover:bg-black/80 text-white backdrop-blur-md border border-white/30 flex items-center justify-center transition-all transform hover:scale-110 active:scale-95 z-20 cursor-pointer shadow-2xl"
          title="Click to Play Stream"
        >
          <Play className="w-7 h-7 fill-current ml-1" />
        </button>
      )}
    </div>
  );
}
