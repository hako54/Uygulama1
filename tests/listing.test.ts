/// <reference types="node" />
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

import { LANGS } from '../src/game';

const listing = JSON.parse(readFileSync(new URL('../store/listing.json', import.meta.url), 'utf8'));

// App Store Connect and Google Play Console limits (characters).
const LIMITS = {
  name: 30,
  subtitle: 30,
  promotionalText: 170,
  keywords: 100,
  shortDescription: 80,
  description: 4000,
};

test('store listing exists for every language and fits store limits', () => {
  for (const lang of LANGS) {
    const entry = listing[lang];
    assert.ok(entry, `missing listing for ${lang}`);
    for (const [field, max] of Object.entries(LIMITS)) {
      const value: string = entry[field];
      assert.ok(value, `${lang}.${field} missing`);
      assert.ok([...value].length <= max, `${lang}.${field} is ${[...value].length} > ${max}`);
    }
    // Apple rejects listings that use other apps' trademarks as keywords.
    assert.ok(!/wordle|kelimelik|termo\b|motus/i.test(JSON.stringify(entry)), `${lang} names another product`);
  }
});
