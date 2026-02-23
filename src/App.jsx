import { useState, useEffect, useRef, useCallback } from "react";
import WeatherScene from "./components/WeatherScene";
import WeatherCard from "./components/WeatherCard";
import ErrorScreen from "./components/ErrorScreen";
import LocationSearch from "./components/LocationSearch";
import { fetchWeatherData, processWeatherDays } from "./utils/weatherApi";
import { getWeatherType, getTransitionKey } from "./utils/weatherTypes";
import "./styles/globals.css";

const DEFAULT_LOCATION = { lat: 48.8566, lon: 2.3522, name: "Paris" };

// Easing: ease-in-out cubic
function easeInOut(t) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

// Duration of a full forward transition in ms
const TRANSITION_DURATION = 1400;
// Minimum wheel/touch delta to trigger a transition
const WHEEL_THRESHOLD = 30;

export default function App() {
  const [weatherDays, setWeatherDays] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [location, setLocation] = useState(DEFAULT_LOCATION);

  // These drive the scene — stored as refs for the animation loop,
  // mirrored into state only for React re-renders
  const activeDayRef = useRef(0);
  const progressRef  = useRef(0);   // 0 = fully on current day, 1 = fully on next day
  const [activeDay,    setActiveDay]    = useState(0);
  const [scrollProgress, setScrollProgress] = useState(0);

  // Animation state
  const animRef        = useRef(null);  // rAF handle
  const animStartRef   = useRef(null);  // timestamp when animation began
  const animFromRef    = useRef(0);     // progress value at animation start
  const animTargetRef  = useRef(0);     // target progress (0 or 1)
  const isAnimatingRef = useRef(false);

  // Touch tracking
  const touchStartYRef = useRef(null);

  // ── GPS on mount ────────────────────────────────────────────────
  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude: lat, longitude: lon } = pos.coords;
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`
          );
          const data = await res.json();
          const name =
            data.address?.city || data.address?.town ||
            data.address?.village || data.address?.county || "Your Location";
          setLocation({ lat, lon, name });
        } catch {
          setLocation({ lat, lon, name: "Your Location" });
        }
      },
      () => {},
      { timeout: 5000 }
    );
  }, []);

  // ── Fetch weather ────────────────────────────────────────────────
  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);
      activeDayRef.current = 0;
      progressRef.current  = 0;
      setActiveDay(0);
      setScrollProgress(0);
      try {
        const raw  = await fetchWeatherData(location.lat, location.lon);
        const days = processWeatherDays(raw);
        setWeatherDays(days);
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [location.lat, location.lon]);

  // ── Core animation loop ──────────────────────────────────────────
  // Animates progressRef from animFromRef → animTargetRef over TRANSITION_DURATION ms
  // When it reaches 1.0, advances activeDayRef and resets progress to 0
  const runAnimation = useCallback((timestamp) => {
    if (!animStartRef.current) animStartRef.current = timestamp;
    const elapsed  = timestamp - animStartRef.current;
    const rawT     = Math.min(elapsed / TRANSITION_DURATION, 1);
    const easedT   = easeInOut(rawT);
    const from     = animFromRef.current;
    const target   = animTargetRef.current;
    const newProg  = from + (target - from) * easedT;

    progressRef.current = newProg;
    setScrollProgress(newProg);

    if (rawT < 1) {
      animRef.current = requestAnimationFrame(runAnimation);
      return;
    }

    // Animation complete
    isAnimatingRef.current = false;
    animRef.current = null;

    if (target === 1) {
      // Advance to next day, reset progress
      const nextDay = activeDayRef.current + 1;
      activeDayRef.current = nextDay;
      progressRef.current  = 0;
      setActiveDay(nextDay);
      setScrollProgress(0);
    } else {
      // Snapped back to start — already at 0
      progressRef.current = 0;
      setScrollProgress(0);
    }
  }, []);

  // ── Start a controlled transition ───────────────────────────────
  // direction: 1 = go to next day, -1 = go to previous day
  const triggerTransition = useCallback((direction, numDays) => {
    const day   = activeDayRef.current;
    const total = numDays;

    cancelAnimationFrame(animRef.current);

    if (direction > 0 && day < total - 1) {
      // Forward: animate progress 0 → 1 then advance day
      animFromRef.current    = progressRef.current;
      animTargetRef.current  = 1;
      animStartRef.current   = null;
      isAnimatingRef.current = true;
      animRef.current = requestAnimationFrame(runAnimation);
    } else if (direction < 0 && day > 0) {
      // Backward: immediately jump to previous day at progress=0
      // (user has full control going back — instant, no hijack)
      activeDayRef.current = day - 1;
      progressRef.current  = 0;
      setActiveDay(day - 1);
      setScrollProgress(0);
    }
  }, [runAnimation]);

  // ── Input event wiring ───────────────────────────────────────────
  useEffect(() => {
    if (weatherDays.length === 0) return;
    const total = weatherDays.length;

    // --- Wheel ---
    let wheelAccum = 0;
    let wheelTimer = null;

    function onWheel(e) {
      e.preventDefault();

      // Don't stack transitions — if already animating forward, ignore
      if (isAnimatingRef.current) return;

      wheelAccum += e.deltaY;
      clearTimeout(wheelTimer);
      wheelTimer = setTimeout(() => { wheelAccum = 0; }, 200);

      if (Math.abs(wheelAccum) >= WHEEL_THRESHOLD) {
        const dir = wheelAccum > 0 ? 1 : -1;
        wheelAccum = 0;
        triggerTransition(dir, total);
      }
    }

    // --- Touch ---
    function onTouchStart(e) {
      touchStartYRef.current = e.touches[0].clientY;
    }

    function onTouchEnd(e) {
      if (touchStartYRef.current === null) return;
      const delta = touchStartYRef.current - e.changedTouches[0].clientY;
      touchStartYRef.current = null;
      if (Math.abs(delta) < 40) return; // too small a swipe
      if (isAnimatingRef.current) return;
      triggerTransition(delta > 0 ? 1 : -1, total);
    }

    // --- Keyboard ---
    function onKeyDown(e) {
      if (isAnimatingRef.current) return;
      if (e.key === "ArrowDown" || e.key === "PageDown") {
        e.preventDefault();
        triggerTransition(1, total);
      } else if (e.key === "ArrowUp" || e.key === "PageUp") {
        e.preventDefault();
        triggerTransition(-1, total);
      }
    }

    window.addEventListener("wheel",      onWheel,      { passive: false });
    window.addEventListener("touchstart", onTouchStart, { passive: true  });
    window.addEventListener("touchend",   onTouchEnd,   { passive: true  });
    window.addEventListener("keydown",    onKeyDown);

    return () => {
      window.removeEventListener("wheel",      onWheel);
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchend",   onTouchEnd);
      window.removeEventListener("keydown",    onKeyDown);
      cancelAnimationFrame(animRef.current);
      clearTimeout(wheelTimer);
    };
  }, [weatherDays.length, triggerTransition]);

  // ── Lock body scroll (we drive everything ourselves) ─────────────
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  // ── Render ───────────────────────────────────────────────────────
  if (error) return <ErrorScreen message={error} onRetry={() => setLocation({ ...location })} />;

  const currentDay = weatherDays[activeDay];
  const nextDay    = weatherDays[Math.min(activeDay + 1, weatherDays.length - 1)];
  const currentType  = currentDay ? getWeatherType(currentDay.weatherCode) : "sunny";
  const nextType     = nextDay    ? getWeatherType(nextDay.weatherCode)    : currentType;
  const transitionKey  = getTransitionKey(currentType, nextType);
  const isTransitioning = scrollProgress > 0.01 && activeDay < weatherDays.length - 1;

  return (
    <div className="fixed-scene">
      <WeatherScene
        currentType={currentType}
        nextType={nextType}
        transitionKey={transitionKey}
        scrollProgress={isTransitioning ? scrollProgress : 0}
        isTransitioning={isTransitioning}
      />

      <div className="scene-gradient" />

      {/* Location search */}
      <div className="location-search-anchor">
        <LocationSearch
          currentLocation={location.name}
          onLocationChange={setLocation}
        />
      </div>

      {/* Loading overlay */}
      {loading && (
        <div className="loading-overlay">
          <div className="loading-orb" />
          <p className="loading-text">Fetching the skies…</p>
        </div>
      )}

      {/* Weather card */}
      {!loading && currentDay && (
        <WeatherCard
          day={currentDay}
          nextDay={nextDay}
          location={location.name}
          scrollProgress={isTransitioning ? scrollProgress : 0}
          isTransitioning={isTransitioning}
          allDays={weatherDays}
          activeDay={activeDay}
          onDaySelect={(i) => {
            // Dot nav: jump directly (no animation, feels like teleport)
            activeDayRef.current = i;
            progressRef.current  = 0;
            setActiveDay(i);
            setScrollProgress(0);
          }}
        />
      )}

      {/* Scroll hint */}
      {!loading && activeDay < weatherDays.length - 1 && !isTransitioning && (
        <div className="scroll-hint">
          <span>Scroll for {nextDay?.dayName}</span>
          <div className="scroll-arrow">↓</div>
        </div>
      )}

      {/* Day dots */}
      {!loading && (
        <div className="day-dots">
          {weatherDays.map((d, i) => (
            <div
              key={i}
              className={`day-dot ${i === activeDay ? "active" : ""}`}
              title={d.dayName}
              onClick={() => {
                activeDayRef.current = i;
                progressRef.current  = 0;
                setActiveDay(i);
                setScrollProgress(0);
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
