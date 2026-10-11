/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { boardWidth, computeLayout, contentHeight } from '../src/layout';

// Usable points (width × height minus safe areas) of devices the app must fit.
const SCREENS: Record<string, [number, number]> = {
  'iPhone SE': [375, 647],
  'iPhone 15': [393, 759],
  'iPhone 16 Pro Max': [440, 868],
  'iPad 13" portrait': [1032, 1332],
  'iPad 13" landscape': [1376, 988],
  'iPad mini portrait': [744, 1089],
  'iPad Split View narrow': [320, 1332],
  'Small Android': [360, 640],
};

test('board and keyboard fit every supported screen', () => {
  for (const [name, [w, h]] of Object.entries(SCREENS)) {
    const l = computeLayout(w, h);
    assert.ok(contentHeight(l) <= h, `${name}: ${contentHeight(l)} > ${h}`);
    assert.ok(boardWidth(l) <= w - 16, `${name}: board ${boardWidth(l)} wider than ${w}`);
    assert.ok(l.tile >= 40, `${name}: tiles too small (${l.tile})`);
  }
});

test('iPad gets a bigger board than a phone', () => {
  assert.ok(computeLayout(1032, 1332).tile > computeLayout(393, 759).tile * 1.5);
});
