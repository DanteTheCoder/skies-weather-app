import { WEATHER_META } from "../utils/weatherTypes";
import { getWeatherDescription, getWindDirection } from "../utils/weatherApi";

export default function WeatherCard({
  day,
  nextDay,
  location,
  scrollProgress,
  isTransitioning,
  allDays,
  activeDay,
}) {
  const meta = WEATHER_META[getWeatherType(day.weatherCode)];
  const nextMeta = WEATHER_META[getWeatherType(nextDay?.weatherCode)];

  // During transition, fade out current card and show "transitioning to" hint
  const cardOpacity = isTransitioning ? Math.max(0, 1 - scrollProgress * 3) : 1;
  const nextCardOpacity = isTransitioning ? Math.max(0, (scrollProgress - 0.6) * 3) : 0;

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

  const accentColor = meta?.accentColor || "#fff";

  return (
    <div className="weather-card-container">
      {/* Current day card */}
      <div className="weather-card" style={{ opacity: cardOpacity }}>
        {/* Location + date */}
        <div className="card-location">
          <span className="location-pin">📍</span>
          <span className="location-name">{location}</span>
        </div>

        {/* Day name */}
        <h1 className="card-day-name" style={{ color: accentColor }}>
          {day.dayName}
        </h1>
        <p className="card-date">{day.shortDate}</p>

        {/* Main temperature */}
        <div className="card-temp-main">
          <span className="card-weather-icon">{meta?.icon}</span>
          <span className="card-temp-current" style={{ color: accentColor }}>
            {day.currentTemp ?? day.tempMax}°
          </span>
        </div>

        {/* Description */}
        <p className="card-description">{getWeatherDescription(day.weatherCode)}</p>

        {/* Feels like */}
        <p className="card-feels-like">
          Feels like {day.currentFeelsLike ?? day.feelsLikeMax}°
        </p>

        {/* Stats grid */}
        <div className="card-stats">
          <StatItem icon="🌡️" label="High / Low" value={`${day.tempMax}° / ${day.tempMin}°`} />
          <StatItem
            icon="💧"
            label="Precipitation"
            value={`${day.precipProbability}%  ·  ${day.precipitation}mm`}
          />
          <StatItem
            icon="💨"
            label="Wind"
            value={`${day.windSpeed} km/h ${getWindDirection(day.windDirection)}`}
          />
          {day.currentHumidity !== null && (
            <StatItem icon="🌊" label="Humidity" value={`${day.currentHumidity}%`} />
          )}
          {day.uvIndex !== "N/A" && (
            <StatItem icon="☀️" label="UV Index" value={day.uvIndex} />
          )}
          {day.sunrise && (
            <StatItem icon="🌅" label="Sunrise / Sunset" value={`${day.sunrise}  ·  ${day.sunset}`} />
          )}
        </div>
      </div>

      {/* Transitioning to next day card */}
      {isTransitioning && nextDay && nextCardOpacity > 0 && (
        <div className="weather-card weather-card--next" style={{ opacity: nextCardOpacity }}>
          <div className="card-location">
            <span className="location-pin">📍</span>
            <span className="location-name">{location}</span>
          </div>
          <h1 className="card-day-name" style={{ color: nextMeta?.accentColor || "#fff" }}>
            {nextDay.dayName}
          </h1>
          <p className="card-date">{nextDay.shortDate}</p>
          <div className="card-temp-main">
            <span className="card-weather-icon">{nextMeta?.icon}</span>
            <span className="card-temp-current" style={{ color: nextMeta?.accentColor || "#fff" }}>
              {nextDay.tempMax}°
            </span>
          </div>
          <p className="card-description">{getWeatherDescription(nextDay.weatherCode)}</p>
        </div>
      )}

      {/* Mini forecast strip */}
      <div className="forecast-strip">
        {allDays.slice(0, 7).map((d, i) => {
          function getType(code) {
            if (code === 0) return "sunny";
            if (code <= 3) return "cloudy";
            if (code <= 49) return "foggy";
            if (code <= 67) return "rainy";
            if (code <= 77) return "snowy";
            if (code <= 82) return "rainy";
            if (code <= 86) return "snowy";
            return "rainy";
          }
          const m = WEATHER_META[getType(d.weatherCode)];
          return (
            <div
              key={i}
              className={`forecast-day ${i === activeDay ? "forecast-day--active" : ""}`}
              onClick={() => window.scrollTo({ top: i * window.innerHeight, behavior: "smooth" })}
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
      <span className="stat-icon">{icon}</span>
      <div className="stat-content">
        <span className="stat-label">{label}</span>
        <span className="stat-value">{value}</span>
      </div>
    </div>
  );
}
