const BASE_URL = "https://api.open-meteo.com/v1/forecast";

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export async function fetchWeatherData(lat, lon) {
  const params = new URLSearchParams({
    latitude: lat,
    longitude: lon,
    daily: [
      "weather_code",
      "temperature_2m_max",
      "temperature_2m_min",
      "apparent_temperature_max",
      "apparent_temperature_min",
      "precipitation_sum",
      "wind_speed_10m_max",
      "wind_direction_10m_dominant",
      "sunrise",
      "sunset",
      "uv_index_max",
      "precipitation_probability_max",
    ].join(","),
    hourly: "temperature_2m,weather_code,wind_speed_10m",
    current: "temperature_2m,weather_code,wind_speed_10m,relative_humidity_2m,apparent_temperature",
    timezone: "auto",
    forecast_days: 7,
  });

  const res = await fetch(`${BASE_URL}?${params}`);
  if (!res.ok) throw new Error(`Weather API error: ${res.status}`);
  return res.json();
}

export function processWeatherDays(data) {
  const { daily, current } = data;
  const today = new Date();

  return daily.time.map((dateStr, i) => {
    const date = new Date(dateStr);
    const isToday = i === 0;

    // Parse sunrise/sunset times
    const sunriseTime = daily.sunrise?.[i] ? new Date(daily.sunrise[i]) : null;
    const sunsetTime = daily.sunset?.[i] ? new Date(daily.sunset[i]) : null;

    return {
      index: i,
      date,
      dateStr,
      dayName: isToday ? "Today" : i === 1 ? "Tomorrow" : DAYS[date.getDay()],
      shortDate: `${MONTHS[date.getMonth()]} ${date.getDate()}`,
      weatherCode: daily.weather_code[i],
      tempMax: Math.round(daily.temperature_2m_max[i]),
      tempMin: Math.round(daily.temperature_2m_min[i]),
      feelsLikeMax: Math.round(daily.apparent_temperature_max?.[i] ?? daily.temperature_2m_max[i]),
      feelsLikeMin: Math.round(daily.apparent_temperature_min?.[i] ?? daily.temperature_2m_min[i]),
      precipitation: daily.precipitation_sum[i]?.toFixed(1) ?? "0.0",
      precipProbability: daily.precipitation_probability_max?.[i] ?? 0,
      windSpeed: Math.round(daily.wind_speed_10m_max[i]),
      windDirection: daily.wind_direction_10m_dominant?.[i] ?? 0,
      uvIndex: daily.uv_index_max?.[i]?.toFixed(1) ?? "N/A",
      sunrise: sunriseTime ? `${sunriseTime.getHours()}:${String(sunriseTime.getMinutes()).padStart(2, "0")}` : null,
      sunset: sunsetTime ? `${sunsetTime.getHours()}:${String(sunsetTime.getMinutes()).padStart(2, "0")}` : null,
      // Use current data for today's actual readings
      currentTemp: isToday ? Math.round(current.temperature_2m) : null,
      currentHumidity: isToday ? current.relative_humidity_2m : null,
      currentWind: isToday ? Math.round(current.wind_speed_10m) : null,
      currentFeelsLike: isToday ? Math.round(current.apparent_temperature) : null,
    };
  });
}

export function getWindDirection(degrees) {
  const dirs = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
  return dirs[Math.round(degrees / 45) % 8];
}

export function getWeatherDescription(code) {
  const descriptions = {
    0: "Clear sky",
    1: "Mainly clear", 2: "Partly cloudy", 3: "Overcast",
    45: "Foggy", 48: "Icy fog",
    51: "Light drizzle", 53: "Moderate drizzle", 55: "Dense drizzle",
    61: "Light rain", 63: "Moderate rain", 65: "Heavy rain",
    71: "Light snow", 73: "Moderate snow", 75: "Heavy snow",
    77: "Snow grains",
    80: "Light showers", 81: "Moderate showers", 82: "Violent showers",
    85: "Light snow showers", 86: "Heavy snow showers",
    95: "Thunderstorm", 96: "Thunderstorm with hail", 99: "Severe thunderstorm",
  };
  return descriptions[code] ?? "Variable conditions";
}
