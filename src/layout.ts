import { MAX_GUESSES, WORD_LENGTH } from './game';

/** Space the header takes above the board. */
export const HEADER_HEIGHT = 52;

export interface Layout {
  tile: number;
  tileGap: number;
  tileFont: number;
  keyHeight: number;
  keyWidth: number;
  wideKeyWidth: number;
  keyGap: number;
  keyFont: number;
  keyboardWidth: number;
}

// Sizes were tuned on a 390×760pt phone (an iPhone 15's usable height); everything scales from it.
const BASE_WIDTH = 390;
const BASE_HEIGHT = 760;

/**
 * Board and keyboard sizes for a window of `width`×`height` points (safe areas already removed).
 * Tiles grow up to 1.7× on an iPad; keys stop at 1.3× so the keyboard stays thumb-sized.
 */
export function computeLayout(width: number, height: number): Layout {
  const scale = Math.max(0.6, Math.min(width / BASE_WIDTH, height / BASE_HEIGHT, 1.7));
  const keyScale = Math.min(scale, 1.3);
  return {
    tile: Math.floor(58 * scale),
    tileGap: Math.round(6 * scale),
    tileFont: Math.round(30 * scale),
    keyHeight: Math.round(56 * keyScale),
    keyWidth: Math.round(44 * keyScale),
    wideKeyWidth: Math.round(66 * keyScale),
    keyGap: Math.round(5 * keyScale),
    keyFont: Math.round(18 * keyScale),
    keyboardWidth: Math.round(500 * keyScale),
  };
}

/** Height of everything stacked on the screen, used to check that it fits. */
export function contentHeight(l: Layout): number {
  const board = MAX_GUESSES * l.tile + (MAX_GUESSES - 1) * l.tileGap;
  const keyboard = 3 * l.keyHeight + 2 * (l.keyGap + 3) + 8;
  return HEADER_HEIGHT + board + keyboard;
}

/** Width of one board row. */
export function boardWidth(l: Layout): number {
  return WORD_LENGTH * l.tile + (WORD_LENGTH - 1) * l.tileGap;
}
