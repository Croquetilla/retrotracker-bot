import fetch from 'node-fetch';
import { CONFIG } from '../config.js';
import { getCache, setCache } from './cache.js';

export async function getRAWGInfo(title) {
  const cached = getCache(`rawg_${title}`);
  if (cached) return cached;

  const res = await fetch(`https://api.rawg.io/api/games?key=${CONFIG.RAWG_KEY}&search=${encodeURIComponent(title)}&page_size=1`);
  const data = await res.json();
  if (!data.results?.length) return null;

  const game = data.results[0];
  const result = {
    imagen_url: game.background_image,
    rating: game.rating,
    fuente: 'RAWG'
  };

  setCache(`rawg_${title}`, result);
  return result;
}
