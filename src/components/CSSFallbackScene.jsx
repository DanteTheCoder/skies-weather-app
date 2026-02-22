import { useEffect, useRef } from "react";
import { WEATHER_META } from "../utils/weatherTypes";

/**
 * CSSFallbackScene
 * 
 * Beautiful animated CSS backgrounds used when video frames aren't available.
 * These serve as a high-quality placeholder during development, or as a
 * permanent fallback.
 */
export default function CSSFallbackScene({ type, nextType, progress = 0 }) {
  const canvasRef = useRef(null);
  const animRef = useRef(null);
  const particlesRef = useRef([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");

    function resize() {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    }
    resize();
    window.addEventListener("resize", resize);

    // Initialize particles based on weather type
    particlesRef.current = initParticles(type, canvas.width, canvas.height);

    let frame = 0;
    function draw() {
      frame++;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Draw gradient background
      const fromMeta = WEATHER_META[type];
      const toMeta = WEATHER_META[nextType] || fromMeta;

      // Interpolate gradients based on scroll progress
      drawBackground(ctx, canvas, type, nextType, progress);

      // Draw particles
      updateAndDrawParticles(ctx, particlesRef.current, type, canvas.width, canvas.height, frame);

      animRef.current = requestAnimationFrame(draw);
    }

    draw();

    return () => {
      cancelAnimationFrame(animRef.current);
      window.removeEventListener("resize", resize);
    };
  }, [type, nextType, progress]);

  return (
    <canvas
      ref={canvasRef}
      style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
    />
  );
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function hexToRgb(hex) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return [r, g, b];
}

const BG_COLORS = {
  sunny: [
    [255, 140, 0],
    [255, 200, 50],
    [135, 206, 235],
  ],
  cloudy: [
    [80, 90, 110],
    [130, 140, 160],
    [180, 190, 210],
  ],
  rainy: [
    [20, 40, 70],
    [30, 60, 100],
    [10, 30, 55],
  ],
  snowy: [
    [180, 195, 215],
    [215, 225, 240],
    [240, 245, 255],
  ],
  windy: [
    [55, 70, 90],
    [80, 100, 120],
    [100, 120, 140],
  ],
  foggy: [
    [120, 135, 145],
    [160, 170, 178],
    [195, 205, 210],
  ],
};

function drawBackground(ctx, canvas, type, nextType, progress) {
  const w = canvas.width;
  const h = canvas.height;
  const fromColors = BG_COLORS[type] || BG_COLORS.cloudy;
  const toColors = BG_COLORS[nextType] || fromColors;

  const colors = fromColors.map((from, i) =>
    from.map((c, j) => Math.round(lerp(c, toColors[i][j], progress)))
  );

  const grad = ctx.createLinearGradient(0, 0, 0, h);
  grad.addColorStop(0, `rgb(${colors[0].join(",")})`);
  grad.addColorStop(0.5, `rgb(${colors[1].join(",")})`);
  grad.addColorStop(1, `rgb(${colors[2].join(",")})`);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);

  // Draw sun for sunny type
  if (type === "sunny" && progress < 0.5) {
    const alpha = 1 - progress * 2;
    drawSun(ctx, w * 0.75, h * 0.2, alpha);
  }
}

function drawSun(ctx, x, y, alpha) {
  const radius = 80;
  const now = Date.now() / 1000;

  // Glow
  const glow = ctx.createRadialGradient(x, y, 0, x, y, radius * 4);
  glow.addColorStop(0, `rgba(255,230,100,${0.3 * alpha})`);
  glow.addColorStop(1, "rgba(255,230,100,0)");
  ctx.fillStyle = glow;
  ctx.fillRect(x - radius * 4, y - radius * 4, radius * 8, radius * 8);

  // Sun core
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fillStyle = `rgba(255, 220, 60, ${alpha})`;
  ctx.fill();

  // Rays
  ctx.strokeStyle = `rgba(255, 220, 60, ${0.7 * alpha})`;
  ctx.lineWidth = 4;
  for (let i = 0; i < 12; i++) {
    const angle = (i / 12) * Math.PI * 2 + now * 0.1;
    const r1 = radius * 1.3;
    const r2 = radius * 1.7;
    ctx.beginPath();
    ctx.moveTo(x + Math.cos(angle) * r1, y + Math.sin(angle) * r1);
    ctx.lineTo(x + Math.cos(angle) * r2, y + Math.sin(angle) * r2);
    ctx.stroke();
  }
}

function initParticles(type, w, h) {
  const count = {
    sunny: 0,
    cloudy: 8,
    rainy: 200,
    snowy: 150,
    windy: 60,
    foggy: 12,
  }[type] || 0;

  return Array.from({ length: count }, (_, i) => createParticle(type, w, h, i));
}

function createParticle(type, w, h, i) {
  switch (type) {
    case "rainy":
      return {
        x: Math.random() * w,
        y: Math.random() * h,
        speed: 8 + Math.random() * 6,
        length: 15 + Math.random() * 20,
        alpha: 0.4 + Math.random() * 0.3,
      };
    case "snowy":
      return {
        x: Math.random() * w,
        y: Math.random() * h,
        size: 2 + Math.random() * 5,
        speed: 0.5 + Math.random() * 1.5,
        drift: (Math.random() - 0.5) * 0.5,
        alpha: 0.5 + Math.random() * 0.5,
        wobble: Math.random() * Math.PI * 2,
      };
    case "cloudy":
      return {
        x: Math.random() * (w + 400) - 200,
        y: Math.random() * h * 0.6,
        width: 200 + Math.random() * 300,
        height: 60 + Math.random() * 80,
        speed: 0.1 + Math.random() * 0.2,
        alpha: 0.4 + Math.random() * 0.3,
      };
    case "windy":
      return {
        x: Math.random() * w,
        y: Math.random() * h,
        length: 60 + Math.random() * 120,
        speed: 6 + Math.random() * 6,
        alpha: 0.2 + Math.random() * 0.3,
        curve: (Math.random() - 0.5) * 20,
      };
    case "foggy":
      return {
        x: Math.random() * w,
        y: h * 0.3 + Math.random() * h * 0.7,
        width: 400 + Math.random() * 600,
        height: 100 + Math.random() * 200,
        speed: 0.05 + Math.random() * 0.1,
        alpha: 0.1 + Math.random() * 0.2,
      };
    default:
      return {};
  }
}

function updateAndDrawParticles(ctx, particles, type, w, h, frame) {
  particles.forEach((p) => {
    switch (type) {
      case "rainy": {
        p.y += p.speed;
        p.x += 1.5; // slight wind
        if (p.y > h) { p.y = -p.length; p.x = Math.random() * w; }
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(p.x + 3, p.y + p.length);
        ctx.strokeStyle = `rgba(180, 210, 240, ${p.alpha})`;
        ctx.lineWidth = 1;
        ctx.stroke();
        break;
      }
      case "snowy": {
        p.y += p.speed;
        p.wobble += 0.02;
        p.x += Math.sin(p.wobble) * 0.5 + p.drift;
        if (p.y > h) { p.y = -10; p.x = Math.random() * w; }
        if (p.x > w) p.x = 0;
        if (p.x < 0) p.x = w;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(220, 235, 255, ${p.alpha})`;
        ctx.fill();
        break;
      }
      case "cloudy": {
        p.x += p.speed;
        if (p.x > w + p.width) p.x = -p.width;
        drawCloud(ctx, p.x, p.y, p.width, p.height, p.alpha);
        break;
      }
      case "windy": {
        p.x += p.speed;
        if (p.x > w + p.length) { p.x = -p.length; p.y = Math.random() * h; }
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.quadraticCurveTo(p.x + p.length / 2, p.y + p.curve, p.x + p.length, p.y);
        ctx.strokeStyle = `rgba(180, 210, 200, ${p.alpha})`;
        ctx.lineWidth = 1.5;
        ctx.stroke();
        break;
      }
      case "foggy": {
        p.x += p.speed;
        if (p.x > w + p.width) p.x = -p.width;
        const grad = ctx.createRadialGradient(
          p.x + p.width / 2, p.y + p.height / 2, 0,
          p.x + p.width / 2, p.y + p.height / 2, p.width / 2
        );
        grad.addColorStop(0, `rgba(200, 210, 215, ${p.alpha})`);
        grad.addColorStop(1, "rgba(200, 210, 215, 0)");
        ctx.fillStyle = grad;
        ctx.fillRect(p.x, p.y, p.width, p.height);
        break;
      }
    }
  });
}

function drawCloud(ctx, x, y, w, h, alpha) {
  ctx.fillStyle = `rgba(200, 210, 225, ${alpha})`;
  ctx.beginPath();
  ctx.ellipse(x + w * 0.5, y + h * 0.7, w * 0.5, h * 0.4, 0, 0, Math.PI * 2);
  ctx.ellipse(x + w * 0.3, y + h * 0.5, w * 0.25, h * 0.4, 0, 0, Math.PI * 2);
  ctx.ellipse(x + w * 0.7, y + h * 0.5, w * 0.2, h * 0.35, 0, 0, Math.PI * 2);
  ctx.ellipse(x + w * 0.5, y + h * 0.3, w * 0.3, h * 0.4, 0, 0, Math.PI * 2);
  ctx.fill();
}
