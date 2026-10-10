import AsyncStorage from '@react-native-async-storage/async-storage';
import { Lang, MAX_GUESSES } from './game';

export type Status = 'playing' | 'won' | 'lost';

export interface GameState {
  day: number;
  guesses: string[];
  status: Status;
}

export interface Stats {
  played: number;
  won: number;
  streak: number;
  maxStreak: number;
  lastWonDay: number | null;
  distribution: number[];
}

export const emptyStats = (): Stats => ({
  played: 0,
  won: 0,
  streak: 0,
  maxStreak: 0,
  lastWonDay: null,
  distribution: Array(MAX_GUESSES).fill(0),
});

async function load<T>(key: string): Promise<T | null> {
  try {
    const raw = await AsyncStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

async function save(key: string, value: unknown) {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Progress just won't persist; the game still works.
  }
}

export const loadGame = (lang: Lang) => load<GameState>(`game:${lang}`);
export const saveGame = (lang: Lang, s: GameState) => save(`game:${lang}`, s);
export const loadStats = async (lang: Lang) => (await load<Stats>(`stats:${lang}`)) ?? emptyStats();
export const saveStats = (lang: Lang, s: Stats) => save(`stats:${lang}`, s);
export const loadLang = () => load<Lang>('lang');
export const saveLang = (l: Lang) => save('lang', l);
export const loadSeenHelp = () => load<boolean>('seenHelp');
export const saveSeenHelp = () => save('seenHelp', true);

export function recordResult(stats: Stats, day: number, won: boolean, guessCount: number): Stats {
  const next = { ...stats, distribution: [...stats.distribution] };
  next.played++;
  if (won) {
    next.won++;
    next.streak = stats.lastWonDay === day - 1 ? stats.streak + 1 : 1;
    next.maxStreak = Math.max(next.maxStreak, next.streak);
    next.lastWonDay = day;
    next.distribution[guessCount - 1]++;
  } else {
    next.streak = 0;
  }
  return next;
}
