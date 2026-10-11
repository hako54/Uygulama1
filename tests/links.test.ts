/// <reference types="node" />
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { test } from 'node:test';

import { PRIVACY_URL, SITE_URL, SUPPORT_URL } from '../src/links';

const docs = (file: string) => new URL(`../docs/${file}`, import.meta.url);

test('in-app links point at pages that exist in docs/', () => {
  for (const url of [PRIVACY_URL, SUPPORT_URL]) {
    assert.ok(url.startsWith(`${SITE_URL}/`), url);
    const file = url.slice(SITE_URL.length + 1);
    assert.ok(existsSync(docs(file)), `docs/${file} missing`);
  }
});

test('public pages link to each other and to their stylesheet', () => {
  for (const page of ['index.html', 'privacy.html', 'support.html']) {
    const html = readFileSync(docs(page), 'utf8');
    assert.ok(html.includes('href="site.css"'), `${page} has no stylesheet`);
    for (const [, href] of html.matchAll(/href="([a-z]+\.html)"/g)) {
      assert.ok(existsSync(docs(href)), `${page} links to missing ${href}`);
    }
  }
});
