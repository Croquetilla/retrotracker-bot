import fetch from 'node-fetch';
import { CONFIG } from '../config.js';
import { getCache, setCache } from './cache.js';

export async function getIGDBInfo(title) {
  const cached = getCache(`igdb_${title}`);
  if (cached) return cached;

  const res = await fetch('https://api.igdb.com/v4/games', {
    method: 'POST',
    headers: {
      'Client-ID': CONFIG.IGDB.CLIENT_ID,
      'Authorization': `Bearer ${CONFIG.IGDB.TOKEN}`,
      'Accept': 'application/json'
    },
    body: `fields name, first_release_date, genres.name, platforms.name, summary, cover.url; search "${title}"; limit 1;`
  });

  const data = await res.json();
  if (!data.length) return null;

  const g = data[0];
  const result = {
    titulo: g.name,
    anio: g.first_release_date ? new Date(g.first_release_date * 1000).getFullYear() : null,
    plataforma: g.platforms?.[0]?.name || null,
    genero: g.genres?.[0]?.name || null,
    descripcion: g.summary || null,
    imagen_url: g.cover ? `https:${g.cover.url}`.replace('t_thumb', 't_cover_big') : null,
    fuente: 'IGDB'
  };

  setCache(`igdb_${title}`, result);
  return result;
}
