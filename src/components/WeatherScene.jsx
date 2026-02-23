import { useEffect, useRef, useState, useCallback } from "react";
import {
  getFrameUrl,
  preloadSceneInitial,
  preloadTransition,
  progressToFrameSync,
  checkFolderExists,
  getFolderFrameCount,
  FRAME_COUNT,
} from "../utils/frameLoader";
import CSSFallbackScene from "./CSSFallbackScene";

export default function WeatherScene({
  currentType,
  nextType,
  transitionKey,
  scrollProgress,
  isTransitioning,
}) {
  const canvasRef = useRef(null);
  const [hasFrames, setHasFrames] = useState(null);       // null=checking, true/false
  const [hasTransitionFrames, setHasTransitionFrames] = useState(false);
  const [idleFrame, setIdleFrame] = useState(1);
  const idleAnimRef = useRef(null);

  // Detect whether idle scene frames exist for currentType
  useEffect(() => {
    setHasFrames(null);
    async function check() {
      const exists = await checkFolderExists(currentType);
      setHasFrames(exists);
      if (exists) {
        await preloadSceneInitial(currentType, 60);
        // Kick off frame count detection in background
        getFolderFrameCount(currentType);
      }
    }
    check();
  }, [currentType]);

  // Detect & preload transition frames whenever the pair changes
  useEffect(() => {
    if (!transitionKey) { setHasTransitionFrames(false); return; }
    async function check() {
      const exists = await checkFolderExists(transitionKey);
      setHasTransitionFrames(exists);
      if (exists) {
        preloadTransition(transitionKey); // background preload
      }
    }
    check();
  }, [transitionKey]);

  // Idle animation loop at 24 fps
  useEffect(() => {
    if (!hasFrames || isTransitioning) return;
    cancelAnimationFrame(idleAnimRef.current);
    let frameNum = 1;
    const fps = 24;
    const interval = 1000 / fps;
    let last = 0;
    function tick(ts) {
      if (ts - last > interval) {
        const total = progressToFrameSync(1, currentType); // gets cached count
        frameNum = (frameNum % total) + 1;
        setIdleFrame(frameNum);
        last = ts;
      }
      idleAnimRef.current = requestAnimationFrame(tick);
    }
    idleAnimRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(idleAnimRef.current);
  }, [hasFrames, isTransitioning, currentType]);

  // Resize canvas to full device pixel ratio — call before every draw
  const resizeCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return false;
    const dpr = window.devicePixelRatio || 1;
    const w = canvas.offsetWidth * dpr;
    const h = canvas.offsetHeight * dpr;
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }
    return true;
  }, []);

  // Draw image cover-fitted (like CSS object-fit: cover) — no stretch, no blur
  const drawImageCover = useCallback((ctx, img) => {
    const cw = ctx.canvas.width;
    const ch = ctx.canvas.height;
    const iw = img.naturalWidth || img.width;
    const ih = img.naturalHeight || img.height;
    if (!iw || !ih) return;
    const scale = Math.max(cw / iw, ch / ih);
    const sw = iw * scale;
    const sh = ih * scale;
    const sx = (cw - sw) / 2;
    const sy = (ch - sh) / 2;
    ctx.clearRect(0, 0, cw, ch);
    ctx.drawImage(img, sx, sy, sw, sh);
  }, []);

  // Draw the right frame to canvas
  const drawFrame = useCallback((folderName, frameIndex) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const url = getFrameUrl(folderName, frameIndex);
    if (!url) return;
    const ctx = canvas.getContext("2d");
    resizeCanvas();
    // Use a new Image() but let the browser serve from its own HTTP cache
    const img = new Image();
    img.src = url;
    if (img.complete && img.naturalWidth > 0) {
      // Already in browser cache — draw immediately, zero flicker
      drawImageCover(ctx, img);
    } else {
      img.onload = () => { resizeCanvas(); drawImageCover(ctx, img); };
    }
  }, [resizeCanvas, drawImageCover]);

  useEffect(() => {
    if (!hasFrames) return;
    if (isTransitioning && hasTransitionFrames && transitionKey) {
      const frameIndex = progressToFrameSync(scrollProgress, transitionKey);
      drawFrame(transitionKey, frameIndex);
    } else {
      drawFrame(currentType, idleFrame);
    }
  }, [hasFrames, hasTransitionFrames, isTransitioning, transitionKey, scrollProgress, currentType, idleFrame, drawFrame]);

  // While checking, show CSS fallback at 0 progress
  if (hasFrames === null || !hasFrames) {
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
      <canvas
        ref={canvasRef}
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
        }}
      />
    </div>
  );
}
