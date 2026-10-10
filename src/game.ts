import { DICTIONARY } from './dictionary';
import { WORDS } from './words';

export type Lang = 'tr' | 'en';
export type Mark = 'correct' | 'present' | 'absent';

export const WORD_LENGTH = 5;
export const MAX_GUESSES = 6;
const EPOCH = Date.UTC(2026, 0, 1);

export const upper = (s: string, lang: Lang) =>
  lang === 'tr' ? s.toLocaleUpperCase('tr-TR') : s.toUpperCase();

export const letters = (s: string) => Array.from(s);

/** Puzzle number for the given local date; everyone on the same calendar day gets the same word. */
export function dayNumber(date = new Date()): number {
  const local = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());
  return Math.floor((local - EPOCH) / 86_400_000);
}

const shuffled: Partial<Record<Lang, string[]>> = {};

/** Fixed pseudo-random order (mulberry32 + Fisher–Yates) so neighbouring words don't follow each other. */
function dailyOrder(lang: Lang): string[] {
  if (shuffled[lang]) return shuffled[lang];
  const list = [...WORDS[lang]];
  let seed = lang === 'tr' ? 0x6b656c69 : 0x6d6f2121;
  const random = () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  for (let i = list.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [list[i], list[j]] = [list[j], list[i]];
  }
  return (shuffled[lang] = list);
}

export function wordForDay(lang: Lang, day: number): string {
  const order = dailyOrder(lang);
  return order[((day % order.length) + order.length) % order.length];
}

const valid: Partial<Record<Lang, Set<string>>> = {};

/** Accepts dictionary words plus every possible answer. */
export function isValidWord(word: string, lang: Lang): boolean {
  valid[lang] ??= new Set([...DICTIONARY[lang].split(' '), ...WORDS[lang]]);
  return valid[lang].has(word);
}

/** Wordle scoring: exact matches first, then remaining letters by count. */
export function evaluate(guess: string, answer: string): Mark[] {
  const g = letters(guess);
  const a = letters(answer);
  const marks: Mark[] = g.map(() => 'absent');
  const remaining: Record<string, number> = {};
  g.forEach((ch, i) => {
    if (ch === a[i]) marks[i] = 'correct';
    else remaining[a[i]] = (remaining[a[i]] ?? 0) + 1;
  });
  g.forEach((ch, i) => {
    if (marks[i] !== 'correct' && remaining[ch] > 0) {
      marks[i] = 'present';
      remaining[ch]--;
    }
  });
  return marks;
}

const RANK: Record<Mark, number> = { absent: 0, present: 1, correct: 2 };

export function keyboardMarks(guesses: string[], answer: string): Record<string, Mark> {
  const result: Record<string, Mark> = {};
  for (const guess of guesses) {
    const marks = evaluate(guess, answer);
    letters(guess).forEach((ch, i) => {
      if (!result[ch] || RANK[marks[i]] > RANK[result[ch]]) result[ch] = marks[i];
    });
  }
  return result;
}

const EMOJI: Record<Mark, string> = { correct: '🟩', present: '🟨', absent: '⬛' };

export function shareText(day: number, guesses: string[], answer: string, won: boolean): string {
  const score = won ? guesses.length : 'X';
  const grid = guesses.map((g) => evaluate(g, answer).map((m) => EMOJI[m]).join('')).join('\n');
  return `Kelimo #${day + 1} ${score}/${MAX_GUESSES}\n\n${grid}`;
}
