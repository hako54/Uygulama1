import * as Haptics from 'expo-haptics';
import { useEffect, useState } from 'react';
import { AccessibilityInfo, Platform } from 'react-native';

import { WORD_LENGTH } from './game';

/** Each tile starts flipping this long after the previous one. */
export const FLIP_STAGGER = 250;
/** Duration of one half of a flip (edge-on, then back). */
export const FLIP_HALF = 150;
/** Time until the last tile of a submitted row shows its colour. */
export const REVEAL_MS = FLIP_STAGGER * (WORD_LENGTH - 1) + FLIP_HALF * 2;
export const BOUNCE_STAGGER = 100;

// Haptics are a bonus: unsupported devices and browsers simply stay silent.
const run = (feedback: () => Promise<void>) => {
  if (Platform.OS === 'web') return;
  feedback().catch(() => {});
};

export const haptic = {
  key: () => run(() => Haptics.selectionAsync()),
  invalid: () => run(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)),
  win: () => run(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)),
  lose: () => run(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)),
};

/** Follows the system "Reduce Motion" setting so animations can be skipped. */
export function useReduceMotion(): boolean {
  const [reduce, setReduce] = useState(false);
  useEffect(() => {
    let mounted = true;
    AccessibilityInfo.isReduceMotionEnabled()
      .then((value) => mounted && setReduce(value))
      .catch(() => {});
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduce);
    return () => {
      mounted = false;
      sub?.remove();
    };
  }, []);
  return reduce;
}
