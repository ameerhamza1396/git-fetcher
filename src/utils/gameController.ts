export type BattleType = '1v1' | '2v2' | 'ffa' | 'rapid_fire';

export interface RoomBotFillRule {
  targetPlayers: number;
  maxBots: number;
}

export interface GameControllerConfig {
  botsEnabled: boolean;
  minCorrectProbability: number;
  rarePerfectProbability: number;
  botJoinDelayMs: number;
  roomFill: Record<BattleType, RoomBotFillRule>;
  botNames: string[];
}

const GAME_CONTROLLER_URL =
  import.meta.env.VITE_GAME_CONTROLLER_URL || 'https://medmacs.app/api/gamecontroller';

const fallbackConfig: GameControllerConfig = {
  botsEnabled: false,
  minCorrectProbability: 0.3,
  rarePerfectProbability: 0.015,
  botJoinDelayMs: 1200,
  roomFill: {
    '1v1': { targetPlayers: 2, maxBots: 1 },
    '2v2': { targetPlayers: 4, maxBots: 3 },
    ffa: { targetPlayers: 3, maxBots: 2 },
    rapid_fire: { targetPlayers: 8, maxBots: 7 },
  },
  botNames: [],
};

let cachedConfig: GameControllerConfig | null = null;
let cachedAt = 0;
const CACHE_MS = 60_000;

export const getGameControllerConfig = async () => {
  if (cachedConfig && Date.now() - cachedAt < CACHE_MS) return cachedConfig;

  try {
    const response = await fetch(GAME_CONTROLLER_URL, {
      method: 'GET',
      headers: { Accept: 'application/json' },
    });

    if (!response.ok) throw new Error(`Game controller returned ${response.status}`);

    const remoteConfig = await response.json();
    cachedConfig = {
      ...fallbackConfig,
      ...remoteConfig,
      roomFill: {
        ...fallbackConfig.roomFill,
        ...(remoteConfig.roomFill || {}),
      },
      botNames: Array.isArray(remoteConfig.botNames) ? remoteConfig.botNames : fallbackConfig.botNames,
      minCorrectProbability: Math.max(0.3, Number(remoteConfig.minCorrectProbability ?? fallbackConfig.minCorrectProbability)),
      rarePerfectProbability: Math.max(0, Number(remoteConfig.rarePerfectProbability ?? fallbackConfig.rarePerfectProbability)),
      botJoinDelayMs: Math.max(0, Number(remoteConfig.botJoinDelayMs ?? fallbackConfig.botJoinDelayMs)),
      botsEnabled: Boolean(remoteConfig.botsEnabled),
    };
    cachedAt = Date.now();
    return cachedConfig;
  } catch (error) {
    console.warn('Game controller unavailable; bots disabled.', error);
    cachedConfig = fallbackConfig;
    cachedAt = Date.now();
    return cachedConfig;
  }
};

export const createBotAccuracy = (config: GameControllerConfig) => {
  const min = Math.max(0.3, config.minCorrectProbability);
  const perfectRoll = Math.random() < config.rarePerfectProbability;
  if (perfectRoll) return 1;

  const weighted = min + Math.pow(Math.random(), 1.8) * (0.92 - min);
  return Number(Math.min(0.96, Math.max(min, weighted)).toFixed(3));
};

export const shouldBotAnswerCorrectly = (accuracy: number | null | undefined) => {
  const safeAccuracy = Math.max(0.3, Math.min(1, Number(accuracy || 0.3)));
  return Math.random() < safeAccuracy;
};

export const getBotName = (names: string[], usedNames: Set<string>) => {
  const fallbackNames = ['Ali Raza', 'Maha Noor', 'Danish Khan', 'Sara Malik', 'Zain Ahmed', 'Hira Salman'];
  const pool = names.length ? names : fallbackNames;
  const available = pool.filter(name => !usedNames.has(name));
  const baseName = available[Math.floor(Math.random() * available.length)] || pool[Math.floor(Math.random() * pool.length)];
  if (!usedNames.has(baseName)) return baseName;
  return `${baseName} ${Math.floor(Math.random() * 90) + 10}`;
};
