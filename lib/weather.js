// Open-Meteo forecast (no API key).
const { cached } = require("./cache");

const WMO = {
  0: "Clear", 1: "Clear", 2: "Pt Cloudy", 3: "Cloudy",
  45: "Fog", 48: "Fog",
  51: "Drizzle", 53: "Drizzle", 55: "Drizzle", 56: "Frz Drzl", 57: "Frz Drzl",
  61: "Rain", 63: "Rain", 65: "Hvy Rain", 66: "Frz Rain", 67: "Frz Rain",
  71: "Snow", 73: "Snow", 75: "Hvy Snow", 77: "Snow",
  80: "Showers", 81: "Showers", 82: "Hvy Shwrs",
  85: "Snow Shwr", 86: "Snow Shwr",
  95: "T-Storm", 96: "T-Storm", 99: "T-Storm",
};

// WMO code -> icon drawn by public/app.js
function iconFor(code, isDay) {
  if (code <= 1) return isDay ? "sun" : "moon";
  if (code === 2) return isDay ? "partly" : "cloud";
  if (code === 3) return "cloud";
  if (code === 45 || code === 48) return "fog";
  if (code >= 95) return "storm";
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return "snow";
  return "rain";
}

async function load(w) {
  const q = new URLSearchParams({
    latitude: w.latitude,
    longitude: w.longitude,
    current: "temperature_2m,apparent_temperature,relative_humidity_2m,weather_code,is_day",
    hourly: "precipitation_probability",
    daily: "temperature_2m_max,temperature_2m_min,precipitation_probability_max",
    timezone: w.timezone,
    forecast_days: "2", // so "next 3 h" still works late in the evening
  });
  const res = await fetch("https://api.open-meteo.com/v1/forecast?" + q);
  if (!res.ok) throw new Error("weather " + res.status);
  const j = await res.json();

  // max rain chance over the next 3 hours
  let rain3h = null;
  if (j.hourly && j.current) {
    const i = j.hourly.time.findIndex((t) => t >= j.current.time.slice(0, 13));
    if (i >= 0) rain3h = Math.max(...j.hourly.precipitation_probability.slice(i, i + 3));
  }
  return {
    temp: Math.round(j.current.temperature_2m),
    feels: Math.round(j.current.apparent_temperature),
    code: j.current.weather_code,
    text: WMO[j.current.weather_code] || "",
    icon: iconFor(j.current.weather_code, j.current.is_day === 1),
    humidity: j.current.relative_humidity_2m,
    hi: Math.round(j.daily.temperature_2m_max[0]),
    lo: Math.round(j.daily.temperature_2m_min[0]),
    rainToday: j.daily.precipitation_probability_max[0],
    rain3h,
  };
}

async function getWeather(config) {
  const e = await cached("weather", config.refreshSeconds.weather, () => load(config.weather));
  return { weather: e.value || null, errors: e.error ? [e.error] : [] };
}

module.exports = { getWeather };
