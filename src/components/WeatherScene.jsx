import { useEffect, useRef, useState } from "react";
import {
  getFrameUrl,
  preloadTransition,
  progressToFrameSync,
  checkFolderExists,
  getFolderFrameCount,
} from "../utils/frameLoader";
import CSSFallbackScene from "./CSSFallbackScene";

const VIDEO_BASE = "/videos";

function easeInOut(t) {
  return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
}

export default function WeatherScene({
  currentType,
  nextType,
  transitionKey,
  scrollProgress,
  isTransitioning,
}) {
  const currentVideoRef = useRef(null);
  const nextVideoRef    = useRef(null);
  const frameImgRef     = useRef(null);

  const [videoReady, setVideoReady]                   = useState(false);
  const [hasTransitionFrames, setHasTransitionFrames] = useState(null);

  // ── Load & play current video ────────────────────────────────────
  useEffect(() => {
    if (!currentType) return;
    const video = currentVideoRef.current;
    if (!video) return;

    // Always reset — ensures back-navigation reloads correctly
    setVideoReady(false);
    video.pause();

    const src = `${VIDEO_BASE}/${currentType}.mp4`;
    video.src = src;
    video.muted      = true;
    video.loop       = true;
    video.playsInline = true;

    // canplay fires as soon as the browser has enough to start — much faster
    // than canplaythrough which waits for full buffer
    const onCanPlay = () => {
      video.play().catch(() => {});
      // Small rAF delay so first frame is painted before we fade in
      requestAnimationFrame(() => requestAnimationFrame(() => setVideoReady(true)));
    };
    const onError = () => {
      setVideoReady(false);
    };

    video.addEventListener("canplay", onCanPlay, { once: true });
    video.addEventListener("error",   onError,   { once: true });
    video.load();

    return () => {
      video.removeEventListener("canplay", onCanPlay);
      video.removeEventListener("error",   onError);
    };
  }, [currentType]); // re-runs every time currentType changes — including backward nav

  // ── Preload next video silently ──────────────────────────────────
  useEffect(() => {
    if (!nextType || nextType === currentType) return;
    const video = nextVideoRef.current;
    if (!video) return;

    const src = `${VIDEO_BASE}/${nextType}.mp4`;
    // Don't reload if already loaded
    if (video.src.endsWith(nextType + ".mp4")) return;

    video.src         = src;
    video.muted       = true;
    video.loop        = true;
    video.playsInline = true;
    video.preload     = "auto";
    video.load();
  }, [nextType, currentType]);

  // Play/pause next video with transition state
  useEffect(() => {
    const video = nextVideoRef.current;
    if (!video) return;
    if (isTransitioning) {
      video.play().catch(() => {});
    } else {
      video.pause();
      video.currentTime = 0;
    }
  }, [isTransitioning]);

  // ── Transition frame sequence ────────────────────────────────────
  useEffect(() => {
    if (!transitionKey) { setHasTransitionFrames(false); return; }
    setHasTransitionFrames(null);
    let cancelled = false;
    async function check() {
      const exists = await checkFolderExists(transitionKey);
      if (cancelled) return;
      setHasTransitionFrames(exists);
      if (exists) {
        getFolderFrameCount(transitionKey);
        preloadTransition(transitionKey);
      }
    }
    check();
    return () => { cancelled = true; };
  }, [transitionKey]);

  useEffect(() => {
    if (!isTransitioning || !hasTransitionFrames || !transitionKey) return;
    const img = frameImgRef.current;
    if (!img) return;
    const url = getFrameUrl(transitionKey, progressToFrameSync(scrollProgress, transitionKey));
    if (url && !img.src.endsWith(url)) img.src = url;
  }, [isTransitioning, hasTransitionFrames, transitionKey, scrollProgress]);

  // ── Layer math ───────────────────────────────────────────────────
  const useFrames = hasTransitionFrames === true;
  const eased     = easeInOut(scrollProgress);
  const PARALLAX  = 0.06;

  let currentTransform, nextTransform, frameOpacity, currentOpacity;

  if (!isTransitioning) {
    currentTransform = "translateY(0%)";
    nextTransform    = "translateY(100%)";
    frameOpacity     = 0;
    currentOpacity   = 1;
  } else if (useFrames) {
    const fadeT      = Math.min(1, scrollProgress / 0.12);
    currentOpacity   = 1 - fadeT;
    currentTransform = "translateY(0%)";
    nextTransform    = "translateY(100%)";
    frameOpacity     = fadeT;
  } else {
    const slideUp    = (1 - eased) * 100;
    const pushUp     = eased * PARALLAX * -100;
    currentTransform = `translateY(${pushUp}%)`;
    nextTransform    = `translateY(${slideUp}%)`;
    frameOpacity     = 0;
    currentOpacity   = 1;
  }

  const videoStyle = {
    position: "absolute",
    inset: 0,
    width: "100%",
    height: "100%",
    objectFit: "cover",
    objectPosition: "center",
    transform: "scale(1.08)",
  };

  return (
    <div className="scene-bg" style={{ overflow: "hidden" }}>

      {/* CSS fallback — fades out once video is ready */}
      <div style={{
        position: "absolute", inset: 0, zIndex: 0,
        opacity: videoReady ? 0 : 1,
        transition: "opacity 0.8s ease",
        pointerEvents: "none",
      }}>
        <CSSFallbackScene type={currentType} nextType={nextType}
          progress={isTransitioning ? scrollProgress : 0} />
      </div>

      {/* Layer 1 — current video */}
      <div style={{
        position: "absolute", inset: 0, zIndex: 1,
        transform: currentTransform,
        willChange: "transform",
        opacity: videoReady ? currentOpacity : 0,
        transition: videoReady ? "opacity 0.8s ease" : "none",
      }}>
        <video ref={currentVideoRef} muted loop autoPlay playsInline style={videoStyle} />
      </div>

      {/* Layer 2 — next video sliding up from bottom */}
      <div style={{
        position: "absolute", inset: 0, zIndex: 2,
        transform: nextTransform,
        willChange: "transform",
        clipPath: "inset(0)",
      }}>
        <video ref={nextVideoRef} muted loop playsInline style={videoStyle} />
      </div>

      {/* Layer 3 — frame sequence */}
      <img ref={frameImgRef} alt="" style={{
        ...videoStyle,
        transform: "none",
        opacity: frameOpacity,
        pointerEvents: "none",
        visibility: frameOpacity > 0 ? "visible" : "hidden",
        zIndex: 3,
      }} />

    </div>
  );
}

