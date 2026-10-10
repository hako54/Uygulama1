/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { BONUS_SKIP_DAYS, LANGS, Lang, matchLang, nextBonus, dayNumber, evaluate, isValidWord, letters, shareText, upper, wordForDay } from '../src/game';
import { recordResult, emptyStats } from '../src/storage';
import { WORDS } from '../src/words';

test('every answer is 5 unique uppercase letters', () => {
  for (const [lang, list] of Object.entries(WORDS)) {
    for (const w of list) {
      assert.equal(letters(w).length, 5, `${lang}: ${w}`);
      assert.equal(upper(w, lang as Lang), w, `${lang}: ${w} not uppercase`);
    }
    assert.equal(new Set(list).size, list.length, `${lang} has duplicates`);
  }
});

test('answer lists last at least two years', () => {
  assert.ok(WORDS.tr.length >= 730, `tr: ${WORDS.tr.length}`);
  assert.ok(WORDS.en.length >= 730, `en: ${WORDS.en.length}`);
});

test('newer languages have at least a year of answers', () => {
  for (const lang of LANGS) assert.ok(WORDS[lang].length >= 365, `${lang}: ${WORDS[lang].length}`);
});

test('daily words cycle through the whole list without repeats', () => {
  for (const lang of LANGS) {
    const n = WORDS[lang].length;
    const seen = new Set(Array.from({ length: n }, (_, d) => wordForDay(lang, d)));
    assert.equal(seen.size, n);
  }
});

test('evaluate handles duplicate letters like Wordle', () => {
  assert.deepEqual(evaluate('ARABA', 'ARABA'), Array(5).fill('correct'));
  // Only one E in answer: the exact match wins, the other is absent.
  assert.deepEqual(evaluate('EERIE', 'CRANE'), ['absent', 'absent', 'present', 'absent', 'correct']);
  assert.deepEqual(evaluate('SPEED', 'ABIDE'), ['absent', 'absent', 'present', 'absent', 'present']);
  assert.deepEqual(evaluate('İNCİR', 'KİTAP'), ['present', 'absent', 'absent', 'absent', 'absent']);
});

test('Turkish uppercase keeps dotted İ', () => {
  assert.equal(upper('i', 'tr'), 'İ');
  assert.equal(upper('ı', 'tr'), 'I');
});

test('dayNumber starts at 0 on 2026-01-01', () => {
  assert.equal(dayNumber(new Date(2026, 0, 1, 23, 59)), 0);
  assert.equal(dayNumber(new Date(2026, 0, 2, 0, 1)), 1);
});

test('streaks', () => {
  let s = recordResult(emptyStats(), 10, true, 3);
  s = recordResult(s, 11, true, 4);
  assert.equal(s.streak, 2);
  s = recordResult(s, 13, true, 2);
  assert.equal(s.streak, 1);
  assert.equal(s.maxStreak, 2);
  s = recordResult(s, 14, false, 6);
  assert.equal(s.streak, 0);
  assert.deepEqual(s.distribution, [0, 1, 1, 1, 0, 0]);
});

test('share text', () => {
  assert.equal(shareText('en', 0, ['CRANE'], 'CRANE', true), 'Kelimo EN #1 1/6\n\n🟩🟩🟩🟩🟩');
});

test('dictionary check', () => {
  assert.ok(isValidWord('KALEM', 'tr'));
  assert.ok(isValidWord('KAĞIT', 'tr'));
  assert.ok(!isValidWord('ABCDE', 'tr'));
  assert.ok(!isValidWord('KALEM', 'en'));
  assert.ok(isValidWord('CRANE', 'en'));
  assert.ok(!isValidWord('XQZVW', 'en'));
  assert.ok(isValidWord('ARAÑA', 'es'));
  assert.ok(WORDS.es.includes('ARAÑA') && !WORDS.es.includes('ARANA'));
  assert.ok(isValidWord('KAESE', 'de'));
  assert.ok(isValidWord('ECOLE', 'fr'));
  assert.ok(isValidWord('AVIAO', 'pt'));
  for (const lang of LANGS) {
    for (const w of WORDS[lang]) assert.ok(isValidWord(w, lang), `${lang}: ${w}`);
  }
});

test('device locale picks a supported language', () => {
  assert.equal(matchLang('tr-TR'), 'tr');
  assert.equal(matchLang('pt-BR'), 'pt');
  assert.equal(matchLang('de'), 'de');
  assert.equal(matchLang('ja-JP'), 'en');
});

test('every answer can be typed on its keyboard', async () => {
  const { KEYBOARD } = await import('../src/i18n');
  for (const lang of LANGS) {
    const keys = new Set(KEYBOARD[lang].flat());
    for (const w of WORDS[lang]) for (const ch of letters(w)) assert.ok(keys.has(ch), `${lang}: ${w}`);
  }
});

test('extra words never reveal the next two months of daily words', () => {
  for (const lang of LANGS) {
    for (const day of [0, 282, 1000]) {
      const upcoming = new Set(Array.from({ length: BONUS_SKIP_DAYS }, (_, d) => wordForDay(lang, day + d)));
      let index = 0;
      const seen = new Set<string>();
      for (let k = 0; k < 50; k++) {
        const pick = nextBonus(lang, index, day);
        assert.ok(pick.index >= index);
        assert.ok(!upcoming.has(pick.word), `${lang} day ${day}: ${pick.word}`);
        seen.add(pick.word);
        index = pick.index + 1;
      }
      assert.equal(seen.size, 50, `${lang}: extra words repeat`);
    }
  }
});
