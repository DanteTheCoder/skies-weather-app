# ☁️ Skies — Scroll-Driven Weather Forecast App

A cinematic 7-day weather forecast app built with React and Open-Meteo. Each day gets its own full-viewport scene. Scroll between days triggers frame-by-frame transition animations generated from your custom videos.

## Tech Stack

- **React 18** + **Vite**
- **Open-Meteo API** (free, no API key needed)
- **Canvas API** for frame rendering
- **CSS Canvas fallback** (animated backgrounds while your frames are being created)

---

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). The app will show animated CSS backgrounds until you drop in your video frames.

---

## 🎬 Video Frame Pipeline

This is the core of the app. Here's the full production pipeline:

### Step 1: Generate Weather Videos with Google Whisk

Create a ~10-second looping video for each of the 6 core weather types:

| Folder Name | Weather |
|-------------|---------|
| `sunny`     | Clear sky, bright sun, warm light |
| `cloudy`    | Overcast grey sky, drifting clouds |
| `rainy`     | Rain falling, wet environment |
| `snowy`     | Snow falling, white landscape |
| `windy`     | Blowing wind, moving trees/grass |
| `foggy`     | Thick mist, low visibility |

**Tips for Google Whisk:**
- Aim for seamless loops (first and last frames should match)
- Shoot or generate from a consistent low angle / wide establishing perspective
- Keep the camera static — movement makes transitions harder to blend

---

### Step 2: Generate 36 Transition Videos with Google Flow

You need a transition video for every **ordered pair** of weather types (A→B where A≠B). That's 6×5 = 30. Add 6 reverse directions = 36 total.

**Naming convention:** `{from}_to_{to}`

```
sunny_to_cloudy      cloudy_to_sunny
sunny_to_rainy       rainy_to_sunny
sunny_to_snowy       snowy_to_sunny
sunny_to_windy       windy_to_sunny
sunny_to_foggy       foggy_to_sunny
cloudy_to_rainy      rainy_to_cloudy
cloudy_to_snowy      snowy_to_cloudy
cloudy_to_windy      windy_to_cloudy
cloudy_to_foggy      foggy_to_cloudy
rainy_to_snowy       snowy_to_rainy
rainy_to_windy       windy_to_rainy
rainy_to_foggy       foggy_to_rainy
snowy_to_windy       windy_to_snowy
snowy_to_foggy       foggy_to_snowy
windy_to_foggy       foggy_to_windy
```

**Tips for Google Flow:**
- Input: the last frame of the "from" idle video and the first frame of the "to" idle video
- Duration: 3–5 seconds is ideal
- Let Flow interpolate naturally between the atmospheric conditions

---

### Step 3: Extract 1000 Frames with ezgif

For **each** of the 42 videos (6 idle + 36 transitions):

1. Go to [ezgif.com/video-to-gif](https://ezgif.com/video-to-gif) → or use **ezgif Split**
2. Upload the video
3. Set output to **1000 frames** (or the max quality option)
4. Export as **JPG** at ~80% quality (balance between quality and load time)
5. Rename frames to: `frame_0001.jpg`, `frame_0002.jpg`, ..., `frame_1000.jpg`

**Tip:** You can do this more efficiently with FFmpeg:
```bash
# Extract exactly 1000 evenly spaced frames from a video
ffmpeg -i sunny.mp4 -vf "fps=1000/$(ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 sunny.mp4)" -q:v 3 frame_%04d.jpg
```

---

### Step 4: Organize Frames

Place all frame folders in `/public/frames/`:

```
public/
  frames/
    sunny/
      frame_0001.jpg
      frame_0002.jpg
      ...
      frame_1000.jpg
    cloudy/
      frame_0001.jpg
      ...
    rainy/
    snowy/
    windy/
    foggy/
    sunny_to_rainy/
      frame_0001.jpg
      ...
    sunny_to_cloudy/
    ... (all 36 transition folders)
```

---

## 🚀 Performance Considerations

### Frame Size
- Keep frames at **1280×720** (720p) — higher res adds file size with minimal visual gain at scroll speeds
- Use **80% JPG quality** — visible artifacts appear below 70%, diminishing returns above 85%

### Preloading Strategy
The app uses a smart preloading strategy (see `src/utils/frameLoader.js`):

1. **Initial load**: First 60 frames of the current day's scene preloaded immediately
2. **Idle animation**: Cycles through all 1000 idle frames smoothly at 24fps
3. **Transition preload**: When a user is viewing Day N, Day N→N+1 transition frames are preloaded in the background in 50-frame chunks
4. **Graceful fallback**: If frames aren't found, falls back to the animated CSS canvas

### CDN Recommendation
For production, serve frames from a CDN (Cloudflare R2, Bunny.net, AWS CloudFront) rather than your web server. Set `Cache-Control: max-age=31536000, immutable` — frames never change.

---

## Architecture Overview

```
App.jsx
├── Tracks scroll position → maps to activeDay + scrollProgress (0-1)
├── WeatherScene.jsx
│   ├── On scroll: renders transition frame (transitionKey + progress → frame index)
│   ├── When idle: runs 24fps animation through idle scene frames
│   └── CSSFallbackScene.jsx (used when frames not found)
├── WeatherCard.jsx
│   ├── Current day stats (fades out during transition)
│   ├── Next day stats (fades in during transition)
│   └── 7-day forecast strip (always visible)
└── Day dots navigation (right side)
```

### Key Files

| File | Purpose |
|------|---------|
| `src/utils/weatherApi.js` | Open-Meteo API calls + data processing |
| `src/utils/weatherTypes.js` | WMO code → weather type mapping + metadata |
| `src/utils/frameLoader.js` | Frame URL generation, preloading, cache management |
| `src/components/WeatherScene.jsx` | Canvas renderer for frames |
| `src/components/CSSFallbackScene.jsx` | CSS particle animations fallback |
| `src/components/WeatherCard.jsx` | Weather data overlay UI |

---

## Customization

### Adding More Weather Subtypes
Edit `WEATHER_TYPES` in `weatherTypes.js` and add corresponding folders. The WMO code mapping in `getWeatherType()` determines which type each forecast day gets.

### Adjusting Scroll Feel
In `App.jsx`, the transition "window" currently starts at `scrollProgress > 0.15`. You can tune this and the card fade timing in `WeatherCard.jsx`.

### Frame Count
The default is 1000 frames. Change `FRAME_COUNT` in `frameLoader.js` if you extract a different amount.

---

## API Info

This app uses [Open-Meteo](https://open-meteo.com/) — completely free, no API key required.

Data fetched per day:
- Weather code (WMO standard)
- Max/min temperature + apparent temperature
- Precipitation sum + probability
- Wind speed + direction
- UV index
- Sunrise/sunset times
- Current conditions (for today)
