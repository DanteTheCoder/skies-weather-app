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

  const isSameType = currentType === nextType;

  // ── Load & play current video ────────────────────────────────────
  useEffect(() => {
    if (!currentType) return;
    const video = currentVideoRef.current;
    if (!video) return;

    setVideoReady(false);
    video.pause();

    const src = `${VIDEO_BASE}/${currentType}.mp4`;
    video.src       = src;
    video.muted     = true;
    video.loop      = true;
    video.playsInline = true;

    const onCanPlay = () => {
      video.play().catch(() => {});
      requestAnimationFrame(() => requestAnimationFrame(() => setVideoReady(true)));
    };
    const onError = () => setVideoReady(false);

    video.addEventListener("canplay", onCanPlay, { once: true });
    video.addEventListener("error",   onError,   { once: true });
    video.load();

    return () => {
      video.removeEventListener("canplay", onCanPlay);
      video.removeEventListener("error",   onError);
    };
  }, [currentType]);

  // ── Preload next video — only when it's a DIFFERENT type ─────────
  // If same type, we'll mirror currentVideo's position instead
  useEffect(() => {
    if (!nextType || isSameType) return;

    const video = nextVideoRef.current;
    if (!video) return;

    const src = `${VIDEO_BASE}/${nextType}.mp4`;
    // Reset if src changed — avoids stale video from previous transition
    if (!video.src.endsWith(`${nextType}.mp4`)) {
      video.src       = src;
      video.muted     = true;
      video.loop      = true;
      video.playsInline = true;
      video.preload   = "auto";
      video.load();
    }
  }, [nextType, isSameType]);

  // ── Sync next video state with transition ────────────────────────
  useEffect(() => {
    const next    = nextVideoRef.current;
    const current = currentVideoRef.current;
    if (!next || !current) return;

    if (isTransitioning) {
      if (isSameType) {
        // Mirror the current video exactly — same src, same position
        // This makes same-type "transition" completely invisible
        const src = `${VIDEO_BASE}/${currentType}.mp4`;
        if (!next.src.endsWith(`${currentType}.mp4`)) {
          next.src       = src;
          next.muted     = true;
          next.loop      = true;
          next.playsInline = true;
          next.load();
        }
        // Sync playback position so the slide-up is seamless
        const syncTime = () => {
          if (Math.abs(next.currentTime - current.currentTime) > 0.1) {
            next.currentTime = current.currentTime;
          }
          next.play().catch(() => {});
        };
        if (next.readyState >= 2) {
          syncTime();
        } else {
          next.addEventListener("canplay", syncTime, { once: true });
        }
      } else {
        // Different type — just start playing from wherever it loaded
        next.play().catch(() => {});
      }
    } else {
      if (!isSameType) {
        next.pause();
        next.currentTime = 0;
      }
    }
  }, [isTransitioning, isSameType, currentType]);

  // ── Frame sequence check ─────────────────────────────────────────
  useEffect(() => {
    // Same type never has frames
    if (!transitionKey || isSameType) {
      setHasTransitionFrames(false);
      return;
    }
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
  }, [transitionKey, isSameType]);

  // ── Drive frame image ────────────────────────────────────────────
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
    // Frame sequence transition
    const fadeT      = Math.min(1, scrollProgress / 0.12);
    currentOpacity   = 1 - fadeT;
    currentTransform = "translateY(0%)";
    nextTransform    = "translateY(100%)";
    frameOpacity     = fadeT;
  } else if (isSameType) {
    // Same type: current video stays perfectly still — no slide, no stutter
    // The next video is a frame-perfect mirror so even if it slides up,
    // it looks identical to the current one
    currentTransform = "translateY(0%)";
    const slideUp    = (1 - eased) * 100;
    nextTransform    = `translateY(${slideUp}%)`;
    frameOpacity     = 0;
    currentOpacity   = 1;
  } else {
    // Different type, no frames — slide up reveal
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

      {/* CSS fallback — fades out once video ready */}
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

      {/* Layer 2 — next video sliding up */}
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

