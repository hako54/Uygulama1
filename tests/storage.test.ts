/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';

// AsyncStorage's web build (what Node resolves) reads window.localStorage; give it an in-memory one.
const memory = new Map<string, string>();
Object.assign(globalThis, {
  window: {
    localStorage: {
      getItem: (k: string) => memory.get(k) ?? null,
      setItem: (k: string, v: string) => void memory.set(k, v),
      removeItem: (k: string) => void memory.delete(k),
    },
  },
});
const storage = () => import('../src/storage');

test('credits add up and never go negative, even when changed concurrently', async () => {
  const { changeCredits, loadCredits } = await storage();
  await Promise.all([changeCredits(5), changeCredits(-1), changeCredits(15)]);
  assert.equal(await loadCredits(), 19);
  await changeCredits(-1000);
  assert.equal(await loadCredits(), 0);
});

test('a store transaction is only credited once', async () => {
  const { markPurchaseHandled } = await storage();
  assert.equal(await markPurchaseHandled('tx-1'), true);
  assert.equal(await markPurchaseHandled('tx-1'), false);
  assert.equal(await markPurchaseHandled('tx-2'), true);
});
