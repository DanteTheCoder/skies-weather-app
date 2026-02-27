import { WEATHER_META } from "../utils/weatherTypes";
import { getWeatherDescription, getWindDirection } from "../utils/weatherApi";
import SplitText from "../bits/SplitText";

// ─────────────────────────────────────────────────────────────────
// SVG stat icons
// ─────────────────────────────────────────────────────────────────
const ICONS = {
  temp: <><path d="M14 14.76V3.5a2.5 2.5 0 0 0-5 0v11.26a4.5 4.5 0 1 0 5 0z" /></>,
  rain: <><path d="M20 17.58A5 5 0 0 0 18 8h-1.26A8 8 0 1 0 4 16.25" /><line x1="8" y1="16" x2="8" y2="22" /><line x1="12" y1="19" x2="12" y2="22" /><line x1="16" y1="16" x2="16" y2="22" /></>,
  wind: <><path d="M17.7 7.7a2.5 2.5 0 1 1 1.8 4.3H2" /><path d="M9.6 4.6A2 2 0 1 1 11 8H2" /><path d="M12.6 19.4A2 2 0 1 0 14 16H2" /></>,
  humidity: <><path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z" /></>,
  uv: <><circle cx="12" cy="12" r="5" /><line x1="12" y1="1" x2="12" y2="3" /><line x1="12" y1="21" x2="12" y2="23" /><line x1="4.22" y1="4.22" x2="5.64" y2="5.64" /><line x1="18.36" y1="18.36" x2="19.78" y2="19.78" /><line x1="1" y1="12" x2="3" y2="12" /><line x1="21" y1="12" x2="23" y2="12" /><line x1="4.22" y1="19.78" x2="5.64" y2="18.36" /><line x1="18.36" y1="5.64" x2="19.78" y2="4.22" /></>,
  sunrise: <><path d="M17 18a5 5 0 0 0-10 0" /><line x1="12" y1="2" x2="12" y2="9" /><line x1="4.22" y1="10.22" x2="5.64" y2="11.64" /><line x1="1" y1="18" x2="3" y2="18" /><line x1="21" y1="18" x2="23" y2="18" /><line x1="18.36" y1="11.64" x2="19.78" y2="10.22" /><line x1="23" y1="22" x2="1" y2="22" /><polyline points="8 6 12 2 16 6" /></>,
};

function getWeatherType(code) {
  if (code === 0) return "sunny";
  if (code <= 3) return "cloudy";
  if (code <= 49) return "foggy";
  if (code <= 67) return "rainy";
  if (code <= 77) return "snowy";
  if (code <= 82) return "rainy";
  if (code <= 86) return "snowy";
  if (code <= 99) return "rainy";
  return "cloudy";
}

// ─────────────────────────────────────────────────────────────────
// WeatherCard
// ─────────────────────────────────────────────────────────────────
export default function WeatherCard({
  day, nextDay, location, scrollProgress,
  isTransitioning, allDays, activeDay, onDaySelect,
}) {
  const meta = WEATHER_META[getWeatherType(day.weatherCode)];
  const nextMeta = WEATHER_META[getWeatherType(nextDay?.weatherCode)];

  const cardOpacity = isTransitioning ? Math.max(0, 1 - scrollProgress * 3) : 1;
  const nextCardOpacity = isTransitioning ? Math.max(0, (scrollProgress - 0.6) * 3) : 0;
  const statsReady = day.tempMax != null;

  return (
    <div className="weather-card-container">

      {/* ── Current day card ── */}
      <div className="weather-card" style={{ opacity: cardOpacity }}>

        <div className="card-location">
          <span className="location-pin">📍</span>
          <span className="location-name">{location}</span>
        </div>

        {/* Day name — split text */}

        <SplitText
          text={day.dayName}
          tag="h1"
          delay={50}
          duration={1.25}
          ease="power3.out"
          splitType="chars"
          from={{ opacity: 0, y: 40 }}
          to={{ opacity: 1, y: 0 }}
          threshold={0.1}
          rootMargin="-100px"
          textAlign="left"
        />

        <p className="card-date">{day.shortDate}</p>

        {/* Temperature */}
        <div className="card-temp-main">
          <span className="card-weather-icon" role="img" aria-label={meta?.label}>
            {meta?.icon}
          </span>
          <SplitText
            text={`${day.currentTemp ?? day.tempMax}°`}
            tag="h1"
            delay={50}
            duration={1.25}
            ease="power3.out"
            splitType="chars"
            from={{ opacity: 0, y: 40 }}
            to={{ opacity: 1, y: 0 }}
            threshold={0.1}
            rootMargin="-100px"
            textAlign="left"
          />
        </div>

        <p className="card-description">{getWeatherDescription(day.weatherCode)}</p>
        <p className="card-feels-like">Feels like {day.currentFeelsLike ?? day.feelsLikeMax}°</p>

        {/*
          Stats reveal wrapper:
          max-height animates 0→auto (via a large fixed value) so the card
          slides open from the top down — the elements ABOVE never move
          because the card is position:absolute and this only grows downward.
        */}
        <div style={{
          overflow: "hidden",
          maxHeight: statsReady ? "260px" : "0px",
          opacity: statsReady ? 1 : 0,
          transition: "max-height 0.55s cubic-bezier(0.22,1,0.36,1) 0.05s, opacity 0.4s ease 0.08s",
        }}>
          <div className="card-stats">
            <StatItem icon={ICONS.temp} label="High / Low" value={`${day.tempMax}° / ${day.tempMin}°`} />
            <StatItem icon={ICONS.rain} label="Precipitation" value={`${day.precipProbability}%  ·  ${day.precipitation}mm`} />
            <StatItem icon={ICONS.wind} label="Wind" value={`${day.windSpeed} km/h ${getWindDirection(day.windDirection)}`} />
            <StatItem icon={ICONS.humidity} label="Humidity" value={day.currentHumidity != null ? `${day.currentHumidity}%` : "—"} />
            <StatItem icon={ICONS.uv} label="UV Index" value={day.uvIndex !== "N/A" ? day.uvIndex : "—"} />
            <StatItem icon={ICONS.sunrise} label="Sunrise / Sunset" value={day.sunrise ? `${day.sunrise}  ·  ${day.sunset}` : "—"} />
          </div>
        </div>

      </div>

      {/* ── Transition peek card ── */}

      {/* ── Forecast strip ── */}
      <div className="forecast-strip">
        {allDays.slice(0, 7).map((d, i) => {
          const m = WEATHER_META[getWeatherType(d.weatherCode)];
          return (
            <div key={i}
              className={`forecast-day ${i === activeDay ? "forecast-day--active" : ""}`}
              onClick={() => onDaySelect?.(i)}
            >
              <span className="forecast-day-name">{d.dayName.slice(0, 3)}</span>
              <span className="forecast-icon">{m?.icon}</span>
              <span className="forecast-temp">{d.tempMax}°</span>
            </div>
          );
        })}
      </div>

    </div>
  );
}

function StatItem({ icon, label, value }) {
  return (
    <div className="stat-item">
      <svg viewBox="0 0 24 24" fill="none"
        stroke="currentColor" strokeWidth="1.8"
        strokeLinecap="round" strokeLinejoin="round"
        style={{ width: 13, height: 13, marginTop: "0.25rem", opacity: 0.4, flexShrink: 0 }}
      >
        {icon}
      </svg>
      <div className="stat-content">
        <span className="stat-label">{label}</span>
        <span className="stat-value">{value}</span>
      </div>
    </div>
  );
}
