import { useState, useRef, useEffect, useCallback } from "react";

const GEOCODE_URL = "https://geocoding-api.open-meteo.com/v1/search";

export default function LocationSearch({ currentLocation, onLocationChange, onRequestGPS }) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [gpsError, setGpsError] = useState(null);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);

  const inputRef = useRef(null);
  const containerRef = useRef(null);
  const debounceRef = useRef(null);

  // Focus input when panel opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
      setQuery("");
      setResults([]);
      setGpsError(null);
    }
  }, [isOpen]);

  // Close on outside click
  useEffect(() => {
    function handleClick(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // Debounced geocode search
  const search = useCallback((value) => {
    clearTimeout(debounceRef.current);
    if (!value.trim() || value.length < 2) {
      setResults([]);
      setIsSearching(false);
      return;
    }
    setIsSearching(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const params = new URLSearchParams({
          name: value,
          count: 8,
          language: "en",
          format: "json",
        });
        const res = await fetch(`${GEOCODE_URL}?${params}`);
        const data = await res.json();
        setResults(data.results || []);
      } catch {
        setResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 280);
  }, []);

  function handleInput(e) {
    const val = e.target.value;
    setQuery(val);
    setHighlightedIndex(-1);
    search(val);
  }

  function handleSelectResult(result) {
    const name = formatLocationName(result);
    onLocationChange({
      lat: result.latitude,
      lon: result.longitude,
      name,
    });
    setIsOpen(false);
    setQuery("");
    setResults([]);
  }

  async function handleGPS() {
    if (!navigator.geolocation) {
      setGpsError("Geolocation not supported by your browser.");
      return;
    }
    setGpsLoading(true);
    setGpsError(null);
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
          onLocationChange({ lat, lon, name });
          setIsOpen(false);
        } catch {
          onLocationChange({ lat, lon, name: "Your Location" });
          setIsOpen(false);
        } finally {
          setGpsLoading(false);
        }
      },
      (err) => {
        setGpsLoading(false);
        if (err.code === 1) setGpsError("Location access denied. Please allow it in your browser settings.");
        else if (err.code === 2) setGpsError("Location unavailable. Try searching manually.");
        else setGpsError("Location request timed out. Try searching manually.");
      },
      { timeout: 8000 }
    );
  }

  // Keyboard navigation
  function handleKeyDown(e) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightedIndex((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightedIndex((i) => Math.max(i - 1, -1));
    } else if (e.key === "Enter") {
      if (highlightedIndex >= 0 && results[highlightedIndex]) {
        handleSelectResult(results[highlightedIndex]);
      }
    } else if (e.key === "Escape") {
      setIsOpen(false);
    }
  }

  return (
    <div className="location-search-wrapper" ref={containerRef}>
      {/* Trigger button */}
      <button
        className="location-trigger"
        onClick={() => setIsOpen((v) => !v)}
        title="Change location"
      >
        <span className="location-trigger-pin">📍</span>
        <span className="location-trigger-name">{currentLocation}</span>
        <span className={`location-trigger-chevron ${isOpen ? "open" : ""}`}>›</span>
      </button>

      {/* Dropdown panel */}
      {isOpen && (
        <div className="location-panel">
          <div className="location-panel-header">
            <span className="location-panel-title">Choose Location</span>
            <button className="location-panel-close" onClick={() => setIsOpen(false)}>✕</button>
          </div>

          {/* GPS button */}
          <button
            className={`gps-button ${gpsLoading ? "gps-button--loading" : ""}`}
            onClick={handleGPS}
            disabled={gpsLoading}
          >
            {gpsLoading ? (
              <>
                <span className="gps-spinner" />
                Detecting location…
              </>
            ) : (
              <>
                <span className="gps-icon">◎</span>
                Use my current location
              </>
            )}
          </button>

          {gpsError && (
            <p className="gps-error">{gpsError}</p>
          )}

          {/* Divider */}
          <div className="location-divider">
            <span>or search</span>
          </div>

          {/* Search input */}
          <div className="location-input-wrapper">
            <span className="location-input-icon">
              {isSearching ? <span className="search-spinner" /> : "🔍"}
            </span>
            <input
              ref={inputRef}
              type="text"
              className="location-input"
              placeholder="City, region or country…"
              value={query}
              onChange={handleInput}
              onKeyDown={handleKeyDown}
              autoComplete="off"
              spellCheck={false}
            />
            {query && (
              <button
                className="location-input-clear"
                onClick={() => { setQuery(""); setResults([]); inputRef.current?.focus(); }}
              >✕</button>
            )}
          </div>

          {/* Results */}
          {results.length > 0 && (
            <ul className="location-results">
              {results.map((r, i) => (
                <li
                  key={r.id}
                  className={`location-result ${i === highlightedIndex ? "location-result--highlighted" : ""}`}
                  onMouseEnter={() => setHighlightedIndex(i)}
                  onClick={() => handleSelectResult(r)}
                >
                  <span className="result-icon">📍</span>
                  <div className="result-text">
                    <span className="result-city">{r.name}</span>
                    <span className="result-region">
                      {[r.admin1, r.country].filter(Boolean).join(", ")}
                    </span>
                  </div>
                  <span className="result-elevation">{r.elevation ? `${Math.round(r.elevation)}m` : ""}</span>
                </li>
              ))}
            </ul>
          )}

          {/* Empty state */}
          {query.length >= 2 && !isSearching && results.length === 0 && (
            <div className="location-empty">
              <span>No results for "{query}"</span>
              <span className="location-empty-hint">Try a different city or country name</span>
            </div>
          )}

          {/* Quick picks */}
          {!query && (
            <div className="location-quickpicks">
              <p className="quickpicks-label">Popular cities</p>
              <div className="quickpicks-grid">
                {QUICK_PICKS.map((city) => (
                  <button
                    key={city.name}
                    className="quickpick-btn"
                    onClick={() => {
                      onLocationChange(city);
                      setIsOpen(false);
                    }}
                  >
                    <span>{city.emoji}</span>
                    <span>{city.name}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function formatLocationName(result) {
  const parts = [result.name];
  if (result.admin1 && result.admin1 !== result.name) parts.push(result.admin1);
  if (result.country) parts.push(result.country);
  return parts.slice(0, 2).join(", ");
}

const QUICK_PICKS = [
  { name: "New York",    emoji: "🗽", lat: 40.7128,  lon: -74.006  },
  { name: "London",      emoji: "🎡", lat: 51.5074,  lon: -0.1278  },
  { name: "Tokyo",       emoji: "🗼", lat: 35.6762,  lon: 139.6503 },
  { name: "Dubai",       emoji: "🏙️", lat: 25.2048,  lon: 55.2708  },
  { name: "Sydney",      emoji: "🦘", lat: -33.8688, lon: 151.2093 },
  { name: "Paris",       emoji: "🥐", lat: 48.8566,  lon: 2.3522   },
  { name: "São Paulo",   emoji: "🌿", lat: -23.5505, lon: -46.6333 },
  { name: "Reykjavik",   emoji: "🌋", lat: 64.1355,  lon: -21.8954 },
];
