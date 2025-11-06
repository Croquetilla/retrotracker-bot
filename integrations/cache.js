import fs from 'fs';
const CACHE_FILE = './cache_api.json';

export function ensureCacheFile() {
  if (!fs.existsSync(CACHE_FILE)) {
    fs.writeFileSync(CACHE_FILE, JSON.stringify({}, null, 2));
    console.log('📦 Caché inicial creada.');
  }
}

export function getCache(key) {
  if (!fs.existsSync(CACHE_FILE)) return null;
  const data = JSON.parse(fs.readFileSync(CACHE_FILE));
  const entry = data[key.toLowerCase()];
  if (!entry) return null;
  const now = Date.now();
  return now - entry.timestamp < 7 * 24 * 60 * 60 * 1000 ? entry.value : null;
}

export function setCache(key, value) {
  let data = {};
  if (fs.existsSync(CACHE_FILE)) {
    data = JSON.parse(fs.readFileSync(CACHE_FILE));
  }
  data[key.toLowerCase()] = { value, timestamp: Date.now() };
  fs.writeFileSync(CACHE_FILE, JSON.stringify(data, null, 2));
}
