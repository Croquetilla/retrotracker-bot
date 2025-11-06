import { HowLongToBeatService } from 'howlongtobeat';
import { getCache, setCache } from './cache.js';

const hltb = new HowLongToBeatService();

export async function getHLTBInfo(title) {
  const cached = getCache(`hltb_${title}`);
  if (cached) return cached;

  const results = await hltb.search(title);
  if (!results.length) return null;

  const game = results[0];
  const result = {
    duracion_main: game.gameplayMain,
    duracion_extra: game.gameplayMainExtra,
    duracion_completo: game.gameplayCompletionist,
    fuente: 'HowLongToBeat'
  };

  setCache(`hltb_${title}`, result);
  return result;
}
