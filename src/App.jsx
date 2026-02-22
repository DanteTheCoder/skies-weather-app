import { useState, useEffect, useRef, useCallback } from "react";
import WeatherScene from "./components/WeatherScene";
import WeatherCard from "./components/WeatherCard";
import ErrorScreen from "./components/ErrorScreen";
import LocationSearch from "./components/LocationSearch";
import { fetchWeatherData, processWeatherDays } from "./utils/weatherApi";
import { getWeatherType, getTransitionKey } from "./utils/weatherTypes";
import "./styles/globals.css";

const DEFAULT_LOCATION = { lat: 48.8566, lon: 2.3522, name: "Paris" };

export default function App() {
  const [weatherDays, setWeatherDays] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [location, setLocation] = useState(DEFAULT_LOCATION);
  const [activeDay, setActiveDay] = useState(0);
  const [scrollProgress, setScrollProgress] = useState(0);
  const containerRef = useRef(null);

  // On mount: silently attempt GPS — don't block the UI
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
            data.address?.city ||
            data.address?.town ||
            data.address?.village ||
            data.address?.county ||
            "Your Location";
          setLocation({ lat, lon, name });
        } catch {
          setLocation({ lat, lon, name: "Your Location" });
        }
      },
      () => {}, // silently fall back to Paris
      { timeout: 5000 }
    );
  }, []);

  // Fetch weather whenever location changes
  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);
      window.scrollTo({ top: 0, behavior: "instant" });
      setActiveDay(0);
      setScrollProgress(0);
      try {
        const raw = await fetchWeatherData(location.lat, location.lon);
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

  // Scroll → activeDay + scrollProgress
  const handleScroll = useCallback(() => {
    if (weatherDays.length === 0) return;
    const scrollY = window.scrollY;
    const vh = window.innerHeight;
    const dayIndex = Math.floor(scrollY / vh);
    const progress = (scrollY % vh) / vh;
    setActiveDay(Math.min(dayIndex, weatherDays.length - 1));
    setScrollProgress(progress);
  }, [weatherDays.length]);

  useEffect(() => {
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [handleScroll]);

  if (error) return <ErrorScreen message={error} onRetry={() => setLocation({ ...location })} />;

  const currentDay = weatherDays[activeDay];
  const nextDay = weatherDays[Math.min(activeDay + 1, weatherDays.length - 1)];
  const currentType = currentDay ? getWeatherType(currentDay.weatherCode) : "sunny";
  const nextType = nextDay ? getWeatherType(nextDay.weatherCode) : currentType;
  const transitionKey = getTransitionKey(currentType, nextType);
  const isTransitioning = scrollProgress > 0.15 && activeDay < weatherDays.length - 1;

  return (
    <div ref={containerRef}>
      {/* Scroll spacer */}
      <div style={{ height: `${weatherDays.length * 100}vh` }} />

      {/* Fixed scene */}
      <div className="fixed-scene">
        <WeatherScene
          currentType={currentType}
          nextType={nextType}
          transitionKey={transitionKey}
          scrollProgress={isTransitioning ? scrollProgress : 0}
          isTransitioning={isTransitioning}
        />

        <div className="scene-gradient" />

        {/* Location search — top-left anchor */}
        <div className="location-search-anchor">
          <LocationSearch
            currentLocation={location.name}
            onLocationChange={setLocation}
          />
        </div>

        {/* Loading overlay — scene stays visible underneath */}
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
                onClick={() => window.scrollTo({ top: i * window.innerHeight, behavior: "smooth" })}
                title={d.dayName}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
