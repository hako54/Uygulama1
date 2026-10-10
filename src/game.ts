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

/** Deterministic shuffle so consecutive days don't follow list order. */
export function wordForDay(lang: Lang, day: number): string {
  const list = WORDS[lang];
  const n = list.length;
  const cycle = Math.floor(day / n);
  const pos = ((day % n) + n) % n;
  // Multiplier coprime with n gives a permutation; vary it per cycle.
  let step = 7 + cycle * 2;
  while (gcd(step, n) !== 1) step++;
  return list[(pos * step + cycle) % n];
}

function gcd(a: number, b: number): number {
  return b === 0 ? a : gcd(b, a % b);
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
