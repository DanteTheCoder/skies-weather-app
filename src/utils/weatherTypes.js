// WMO Weather Code -> Weather Type mapping
// https://open-meteo.com/en/docs#weathervariables

export const WEATHER_TYPES = {
  SUNNY: "sunny",
  CLOUDY: "cloudy",
  RAINY: "rainy",
  SNOWY: "snowy",
  WINDY: "windy",
  FOGGY: "foggy",
};

export function getWeatherType(code) {
  if (code === 0) return WEATHER_TYPES.SUNNY;
  if (code <= 2) return WEATHER_TYPES.CLOUDY;
  if (code === 3) return WEATHER_TYPES.CLOUDY;
  if (code <= 49) return WEATHER_TYPES.FOGGY;
  if (code <= 67) return WEATHER_TYPES.RAINY;
  if (code <= 77) return WEATHER_TYPES.SNOWY;
  if (code <= 82) return WEATHER_TYPES.RAINY;
  if (code <= 86) return WEATHER_TYPES.SNOWY;
  if (code <= 99) return WEATHER_TYPES.RAINY; // Thunderstorms -> heavy rain category
  return WEATHER_TYPES.CLOUDY;
}

// Returns the key used to find transition frames folder
// e.g. "sunny_to_rainy"
export function getTransitionKey(fromType, toType) {
  if (fromType === toType) return null;
  return `${fromType}_to_${toType}`;
}

// Weather metadata for UI display
export const WEATHER_META = {
  [WEATHER_TYPES.SUNNY]: {
    label: "Sunny",
    icon: "☀️",
    accentColor: "#FFD700",
    textColor: "#1a1200",
    gradient: "linear-gradient(160deg, #FFB347 0%, #FFCC02 40%, #87CEEB 100%)",
    particleType: "sun-rays",
  },
  [WEATHER_TYPES.CLOUDY]: {
    label: "Cloudy",
    icon: "☁️",
    accentColor: "#B0C4DE",
    textColor: "#e8f0ff",
    gradient: "linear-gradient(160deg, #4a5568 0%, #718096 50%, #a0aec0 100%)",
    particleType: "drifting-clouds",
  },
  [WEATHER_TYPES.RAINY]: {
    label: "Rainy",
    icon: "🌧️",
    accentColor: "#4FC3F7",
    textColor: "#e8f4ff",
    gradient: "linear-gradient(160deg, #1a2a3a 0%, #2d4a6b 50%, #1e3a52 100%)",
    particleType: "rain-drops",
  },
  [WEATHER_TYPES.SNOWY]: {
    label: "Snowy",
    icon: "❄️",
    accentColor: "#E0F7FA",
    textColor: "#f0f8ff",
    gradient: "linear-gradient(160deg, #b0bec5 0%, #cfd8dc 50%, #eceff1 100%)",
    particleType: "snowflakes",
  },
  [WEATHER_TYPES.WINDY]: {
    label: "Windy",
    icon: "💨",
    accentColor: "#80CBC4",
    textColor: "#e8fff8",
    gradient: "linear-gradient(160deg, #37474f 0%, #546e7a 50%, #607d8b 100%)",
    particleType: "wind-streaks",
  },
  [WEATHER_TYPES.FOGGY]: {
    label: "Foggy",
    icon: "🌫️",
    accentColor: "#B0BEC5",
    textColor: "#e0e8ec",
    gradient: "linear-gradient(160deg, #78909c 0%, #90a4ae 50%, #b0bec5 100%)",
    particleType: "fog-wisps",
  },
};
