import { Lang } from './game';

export const STRINGS = {
  tr: {
    notEnough: 'Yeterli harf yok',
    win: ['Dahice!', 'Muhteşem!', 'Harika!', 'Çok iyi!', 'Güzel!', 'Kıl payı!'],
    answerWas: 'Kelime',
    stats: 'İstatistikler',
    played: 'Oynanan',
    winPct: 'Kazanma %',
    streak: 'Seri',
    maxStreak: 'En iyi seri',
    distribution: 'Tahmin dağılımı',
    next: 'Sonraki kelime',
    share: 'Paylaş',
    close: 'Kapat',
    howTo: 'Nasıl oynanır?',
    rules: [
      'Günün kelimesini 6 denemede bul.',
      'Her tahmin 5 harfli bir kelime olmalı.',
      'Renkler ne kadar yaklaştığını gösterir:',
    ],
    correct: 'Harf doğru yerde',
    present: 'Harf kelimede var ama başka yerde',
    absent: 'Harf kelimede yok',
    daily: 'Her gün herkes için yeni bir kelime!',
    play: 'Oyna',
  },
  en: {
    notEnough: 'Not enough letters',
    win: ['Genius!', 'Magnificent!', 'Impressive!', 'Splendid!', 'Great!', 'Phew!'],
    answerWas: 'The word was',
    stats: 'Statistics',
    played: 'Played',
    winPct: 'Win %',
    streak: 'Streak',
    maxStreak: 'Max streak',
    distribution: 'Guess distribution',
    next: 'Next word in',
    share: 'Share',
    close: 'Close',
    howTo: 'How to play',
    rules: [
      'Guess the daily word in 6 tries.',
      'Each guess must be a 5-letter word.',
      'The colors show how close you are:',
    ],
    correct: 'Letter is in the right spot',
    present: 'Letter is in the word, wrong spot',
    absent: 'Letter is not in the word',
    daily: 'A new word for everyone, every day!',
    play: 'Play',
  },
} satisfies Record<Lang, unknown>;

export const KEYBOARD: Record<Lang, string[][]> = {
  tr: [
    ['E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P', 'Ğ', 'Ü'],
    ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L', 'Ş', 'İ'],
    ['ENTER', 'Z', 'C', 'V', 'B', 'N', 'M', 'Ö', 'Ç', 'DEL'],
  ],
  en: [
    ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
    ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
    ['ENTER', 'Z', 'X', 'C', 'V', 'B', 'N', 'M', 'DEL'],
  ],
};
