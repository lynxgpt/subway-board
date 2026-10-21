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

async function load(w) {
  const q = new URLSearchParams({
    latitude: w.latitude,
    longitude: w.longitude,
    current: "temperature_2m,apparent_temperature,weather_code,is_day",
    hourly: "precipitation_probability",
    daily: "temperature_2m_max,temperature_2m_min,precipitation_probability_max",
    temperature_unit: "fahrenheit",
    timezone: w.timezone,
    forecast_days: "1",
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
