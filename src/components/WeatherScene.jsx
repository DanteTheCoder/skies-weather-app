import { useEffect, useRef, useState, useCallback } from "react";
import {
  getFrameUrl,
  preloadTransition,
  progressToFrameSync,
  checkFolderExists,
  getFolderFrameCount,
} from "../utils/frameLoader";
import CSSFallbackScene from "./CSSFallbackScene";

/**
 * WeatherScene
 *
 * Idle (not transitioning):
 *   → plays /videos/{type}.mp4 — native video, GPU-decoded, perfectly sharp, loops
 *
 * Transitioning (user scrolled):
 *   → shows frames from /frames/{from}_to_{to}/ — img tag, object-fit:cover
 *   → fades the video out and the frame sequence in as transition begins
 *
 * Folder structure expected:
 *   /public/videos/
 *     sunny.mp4   cloudy.mp4   rainy.mp4
 *     snowy.mp4   windy.mp4    foggy.mp4
 *
 *   /public/frames/
 *     sunny_to_rainy/   rainy_to_cloudy/  ... (36 transition folders)
 *     (ezgif-frame-001.jpg naming supported automatically)
 */

const VIDEO_BASE = "/videos";

export default function WeatherScene({
  currentType,
  nextType,
  transitionKey,
  scrollProgress,
  isTransitioning,
}) {
  const videoRef           = useRef(null);
  const frameImgRef        = useRef(null);
  const [videoError, setVideoError]               = useState(false);
  const [hasTransitionFrames, setHasTransitionFrames] = useState(false);
  const prevTypeRef        = useRef(null);

  // ── Switch video when weather type changes ───────────────────────
  useEffect(() => {
    const video = videoRef.current;
    if (!video || prevTypeRef.current === currentType) return;
    prevTypeRef.current = currentType;
    setVideoError(false);

    const src = `${VIDEO_BASE}/${currentType}.mp4`;
    video.src = src;
    video.load();
    video.play().catch(() => {
      // Autoplay blocked — try muted (required on some browsers)
      video.muted = true;
      video.play().catch(() => setVideoError(true));
    });
  }, [currentType]);

  // ── Preload transition frames when pair is known ─────────────────
  useEffect(() => {
    if (!transitionKey) { setHasTransitionFrames(false); return; }
    async function check() {
      const exists = await checkFolderExists(transitionKey);
      setHasTransitionFrames(exists);
      if (exists) {
        getFolderFrameCount(transitionKey); // detect frame count in background
        preloadTransition(transitionKey);   // preload all frames in background
      }
    }
    check();
  }, [transitionKey]);

  // ── Show the correct transition frame ────────────────────────────
  const showTransitionFrame = useCallback((folderName, frameIndex) => {
    const img = frameImgRef.current;
    if (!img) return;
    const url = getFrameUrl(folderName, frameIndex);
    if (!url) return;
    if (!img.src.endsWith(url)) img.src = url;
  }, []);

  useEffect(() => {
    if (!isTransitioning || !hasTransitionFrames || !transitionKey) return;
    showTransitionFrame(transitionKey, progressToFrameSync(scrollProgress, transitionKey));
  }, [isTransitioning, hasTransitionFrames, transitionKey, scrollProgress, showTransitionFrame]);

  // Crossfade: video fades out as transition begins, frame fades in
  // We start fading at progress > 0 and complete fade by progress 0.15
  const videoOpacity = isTransitioning
    ? Math.max(0, 1 - scrollProgress / 0.15)
    : 1;
  const frameOpacity = isTransitioning && hasTransitionFrames
    ? Math.min(1, scrollProgress / 0.15)
    : 0;

  // ── CSS fallback if video errors ─────────────────────────────────
  if (videoError) {
    return (
      <div className="scene-bg">
        <CSSFallbackScene
          type={currentType}
          nextType={nextType}
          progress={isTransitioning ? scrollProgress : 0}
        />
      </div>
    );
  }

  return (
    <div className="scene-bg">
      {/* ── Idle video layer ── */}
      <video
        ref={videoRef}
        muted
        loop
        autoPlay
        playsInline
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          objectFit: "cover",
          objectPosition: "center",
          opacity: videoOpacity,
          transition: videoOpacity === 1 ? "opacity 0.4s ease" : "none",
        }}
      />

      {/* ── Transition frame layer ── */}
      {/* Only rendered when a transition is happening */}
      <img
        ref={frameImgRef}
        alt=""
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          objectFit: "cover",
          objectPosition: "center",
          opacity: frameOpacity,
          // No CSS transition here — opacity is driven frame-by-frame by scroll
          pointerEvents: "none",
        }}
      />
    </div>
  );
}

