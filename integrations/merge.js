import { getIGDBInfo } from './igdb.js';
import { getHLTBInfo } from './howlongtobeat.js';
import { getRAWGInfo } from './rawg.js';

export async function getFullGameData(title) {
  const [igdb, hltb, rawg] = await Promise.all([
    getIGDBInfo(title),
    getHLTBInfo(title),
    getRAWGInfo(title)
  ]);

  return {
    titulo: igdb?.titulo || title,
    anio: igdb?.anio || null,
    plataforma: igdb?.plataforma || null,
    genero: igdb?.genero || null,
    descripcion: igdb?.descripcion || null,
    duracion_horas: hltb?.duracion_main || null,
    imagen_url: rawg?.imagen_url || igdb?.imagen_url || null,
    rating: rawg?.rating || null,
    fuente: [igdb?.fuente, hltb?.fuente, rawg?.fuente].filter(Boolean).join(' + ')
  };
}
