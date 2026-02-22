/**
 * Frame Loader Utility
 *
 * Supports multiple naming formats out of the box — no renaming needed.
 * Drop frames in /public/frames/{folder}/ using ANY of these conventions:
 *
 *   frame_0001.jpg          ← our default
 *   ezgif-frame-001.jpg     ← ezgif default (3-digit)
 *   ezgif-frame-0001.jpg    ← ezgif 4-digit variant
 *   frame-001.jpg           ← generic 3-digit
 *   0001.jpg                ← bare number
 *
 * The loader probes the first frame to detect which format the folder uses,
 * caches that result, and uses it for all subsequent loads from that folder.
 *
 * Folder structure:
 * /public/frames/
 *   sunny/           ← idle loop (any naming, any frame count)
 *   cloudy/
 *   rainy/
 *   snowy/
 *   windy/
 *   foggy/
 *   rainy_to_cloudy/ ← transition (same naming rules)
 *   sunny_to_rainy/
 *   ... etc
 */

const FRAMES_BASE_PATH = "/frames";
const DEFAULT_FRAME_COUNT = 1000;

// Naming format candidates tried in order
const FORMAT_CANDIDATES = [
  // { prefix, pad, ext }
  { prefix: "frame_",        pad: 4, ext: ".jpg" }, // frame_0001.jpg
  { prefix: "ezgif-frame-",  pad: 3, ext: ".jpg" }, // ezgif-frame-001.jpg
  { prefix: "ezgif-frame-",  pad: 4, ext: ".jpg" }, // ezgif-frame-0001.jpg
  { prefix: "frame-",        pad: 3, ext: ".jpg" }, // frame-001.jpg
  { prefix: "frame-",        pad: 4, ext: ".jpg" }, // frame-0001.jpg
  { prefix: "",              pad: 4, ext: ".jpg" }, // 0001.jpg
  { prefix: "",              pad: 3, ext: ".jpg" }, // 001.jpg
  { prefix: "frame_",        pad: 4, ext: ".png" }, // frame_0001.png
  { prefix: "ezgif-frame-",  pad: 3, ext: ".png" }, // ezgif-frame-001.png
];

// Detected format per folder: Map<folderName, formatObject | null>
const folderFormats = new Map();

// Frame image cache: Map<url, HTMLImageElement>
const frameCache = new Map();

// Frame count per folder (detected or default)
const folderFrameCounts = new Map();

/**
 * Probe a folder to find which naming format it uses.
 * Returns the matched format object, or null if nothing found.
 */
async function detectFormat(folderName) {
  if (folderFormats.has(folderName)) return folderFormats.get(folderName);

  for (const fmt of FORMAT_CANDIDATES) {
    const url = buildUrl(folderName, 1, fmt);
    const found = await probeUrl(url);
    if (found) {
      console.log(`[frameLoader] "${folderName}" → detected format: ${fmt.prefix}${"N".repeat(fmt.pad)}${fmt.ext}`);
      folderFormats.set(folderName, fmt);
      return fmt;
    }
  }

  console.warn(`[frameLoader] "${folderName}" → no matching frame format found. Tried ${FORMAT_CANDIDATES.length} patterns.`);
  folderFormats.set(folderName, null);
  return null;
}

function buildUrl(folderName, index, fmt) {
  const padded = String(index).padStart(fmt.pad, "0");
  return `${FRAMES_BASE_PATH}/${folderName}/${fmt.prefix}${padded}${fmt.ext}`;
}

function probeUrl(url) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(true);
    img.onerror = () => resolve(false);
    img.src = url;
  });
}

/**
 * Get the URL for a specific frame in a folder.
 * Returns null if the folder format hasn't been detected yet.
 */
export function getFrameUrl(folderName, frameIndex) {
  const fmt = folderFormats.get(folderName);
  if (!fmt) return null;
  return buildUrl(folderName, frameIndex, fmt);
}

/**
 * Check if a folder exists and detect its naming format.
 * Returns true if frames were found, false otherwise.
 */
export async function checkFolderExists(folderName) {
  const fmt = await detectFormat(folderName);
  return fmt !== null;
}

/**
 * Get total frame count for a folder.
 * Detects the actual count by binary-searching for the last valid frame.
 * Falls back to DEFAULT_FRAME_COUNT if detection is skipped.
 */
export async function getFolderFrameCount(folderName) {
  if (folderFrameCounts.has(folderName)) return folderFrameCounts.get(folderName);

  const fmt = folderFormats.get(folderName);
  if (!fmt) return DEFAULT_FRAME_COUNT;

  // Quick check: does the folder have ~1000 frames or fewer?
  // Binary search between 1 and 2000
  let lo = 1, hi = 2000, count = DEFAULT_FRAME_COUNT;
  while (lo <= hi) {
    const mid = Math.floor((lo + hi) / 2);
    const exists = await probeUrl(buildUrl(folderName, mid, fmt));
    if (exists) { count = mid; lo = mid + 1; }
    else hi = mid - 1;
  }

  console.log(`[frameLoader] "${folderName}" → ${count} frames detected`);
  folderFrameCounts.set(folderName, count);
  return count;
}

/**
 * Convert scroll progress (0–1) to a frame index within a folder.
 */
export async function progressToFrame(progress, folderName) {
  const total = await getFolderFrameCount(folderName);
  return Math.max(1, Math.min(total, Math.round(progress * total)));
}

/**
 * Synchronous version of progressToFrame using cached count (or default).
 */
export function progressToFrameSync(progress, folderName) {
  const total = folderFrameCounts.get(folderName) ?? DEFAULT_FRAME_COUNT;
  return Math.max(1, Math.min(total, Math.round(progress * total)));
}

/**
 * Preload a range of frames for a folder into the image cache.
 */
export async function preloadFrameRange(folderName, startFrame, endFrame) {
  const fmt = folderFormats.get(folderName);
  if (!fmt) return;

  const promises = [];
  for (let i = startFrame; i <= endFrame; i++) {
    const url = buildUrl(folderName, i, fmt);
    if (!frameCache.has(url)) {
      const p = new Promise((resolve) => {
        const img = new Image();
        img.onload = () => { frameCache.set(url, img); resolve(img); };
        img.onerror = () => resolve(null);
        img.src = url;
      });
      promises.push(p);
    }
  }
  return Promise.all(promises);
}

/**
 * Preload the first N frames of a folder (for fast initial display).
 */
export async function preloadSceneInitial(folderName, count = 60) {
  return preloadFrameRange(folderName, 1, count);
}

/**
 * Background-preload all frames for a transition folder in chunks.
 */
export async function preloadTransition(folderName) {
  if (!folderName) return;
  const total = await getFolderFrameCount(folderName);
  const chunkSize = 50;
  for (let start = 1; start <= total; start += chunkSize) {
    const end = Math.min(start + chunkSize - 1, total);
    await preloadFrameRange(folderName, start, end);
    await new Promise((r) => setTimeout(r, 8)); // yield to browser
  }
}

/**
 * Get a cached HTMLImageElement for a frame (or null if not preloaded).
 */
export function getCachedFrame(folderName, frameIndex) {
  const fmt = folderFormats.get(folderName);
  if (!fmt) return null;
  return frameCache.get(buildUrl(folderName, frameIndex, fmt)) || null;
}

export { DEFAULT_FRAME_COUNT as FRAME_COUNT };
