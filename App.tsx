import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  Animated,
  Linking,
  Modal,
  Platform,
  Pressable,
  Share,
  StyleSheet,
  Switch,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import {
  SafeAreaProvider,
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';

import {
  LANGS,
  LANG_NAMES,
  Lang,
  Mark,
  MAX_GUESSES,
  WORD_LENGTH,
  nextBonus,
  dayNumber,
  evaluate,
  isValidWord,
  keyboardMarks,
  letters,
  matchLang,
  shareText,
  upper,
  wordForDay,
} from './src/game';
import { KEYBOARD, STRINGS, fill } from './src/i18n';
import { BOUNCE_STAGGER, FLIP_HALF, FLIP_STAGGER, REVEAL_MS, haptic, useReduceMotion } from './src/feel';
import { Layout, computeLayout } from './src/layout';
import { PRIVACY_URL, SUPPORT_URL } from './src/links';
import { requestReminderPermission, scheduleReminders } from './src/reminders';
import {
  BonusState,
  GameState,
  ReminderPref,
  Stats,
  changeCredits,
  emptyStats,
  loadBonus,
  loadContrast,
  loadCredits,
  loadGame,
  loadLang,
  loadReminderPref,
  loadSeenHelp,
  loadStats,
  recordResult,
  saveBonus,
  saveContrast,
  saveGame,
  saveLang,
  saveReminderPref,
  saveSeenHelp,
  saveStats,
} from './src/storage';
import { PACKS, PackId, Store, openStore } from './src/store';

const COLORS = {
  bg: '#121213',
  text: '#ffffff',
  muted: '#818384',
  border: '#3a3a3c',
  key: '#818384',
  correct: '#538d4e',
  present: '#b59f3b',
  absent: '#3a3a3c',
  modal: '#1e1e20',
};

type Palette = Record<Mark, string>;

const PALETTES: { normal: Palette; contrast: Palette } = {
  normal: { correct: COLORS.correct, present: COLORS.present, absent: COLORS.absent },
  // Orange and blue stay distinct for the common kinds of colour blindness.
  contrast: { correct: '#f5793a', present: '#85c0f9', absent: COLORS.absent },
};

function deviceLang(): Lang {
  try {
    return matchLang(Intl.DateTimeFormat().resolvedOptions().locale);
  } catch {
    return 'en';
  }
}

export default function App() {
  return (
    <SafeAreaProvider>
      <Game />
    </SafeAreaProvider>
  );
}

function Game() {
  const [lang, setLang] = useState<Lang>(deviceLang);
  const [day, setDay] = useState(dayNumber);
  const [game, setGame] = useState<GameState>({ day, guesses: [], status: 'playing' });
  const [stats, setStats] = useState<Stats>(emptyStats);
  const [current, setCurrent] = useState('');
  const [toast, setToast] = useState<string | null>(null);
  const [showStats, setShowStats] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [showLang, setShowLang] = useState(false);
  const [loadedKey, setLoadedKey] = useState<string | null>(null);
  const [mode, setMode] = useState<'daily' | 'bonus'>('daily');
  const [bonus, setBonus] = useState<BonusState | null>(null);
  const [credits, setCredits] = useState(0);
  const [store, setStore] = useState<Store | null>(null);
  const [showExtra, setShowExtra] = useState(false);
  const [reminderPref, setReminderPref] = useState<ReminderPref | null | undefined>(undefined);
  const [showAsk, setShowAsk] = useState(false);
  // useAnimatedValue would be simpler but react-native-web does not provide it.
  const [shake] = useState(() => new Animated.Value(0));
  // Row whose tiles are flipping right now; input waits and the keyboard keeps its old colours.
  const [revealRow, setRevealRow] = useState<number | null>(null);
  // Identifies the winning row (mode, row and word) so only that row bounces.
  const [bounceKey, setBounceKey] = useState<string | null>(null);
  const reduceMotion = useReduceMotion();
  // Board and keys scale with the window: small phones, iPad portrait/landscape and Split View.
  const screen = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const layout = computeLayout(screen.width, screen.height - insets.top - insets.bottom);
  const [contrast, setContrast] = useState(false);
  const markColor = contrast ? PALETTES.contrast : PALETTES.normal;
  const revealMs = reduceMotion ? 0 : REVEAL_MS;

  const t = STRINGS[lang];
  // Store callbacks outlive renders; they read the current language's strings through this ref.
  const tRef = useRef(t);
  useEffect(() => {
    tRef.current = t;
  }, [t]);
  // Today's progress counts as loaded only once it matches the current language and day.
  const loaded = loadedKey === `${lang}:${day}`;

  const flash = useCallback((msg: string, ms = 1500) => {
    setToast(msg);
    AccessibilityInfo.announceForAccessibility(msg);
    setTimeout(() => setToast((m) => (m === msg ? null : m)), ms);
  }, []);
  const inBonus = mode === 'bonus' && bonus !== null;
  // The board shows either today's free word or the current paid extra word.
  const board = inBonus ? bonus : game;
  const answer = inBonus ? bonus.word : wordForDay(lang, day);

  // Restore language and first-run help once.
  useEffect(() => {
    (async () => {
      const saved = await loadLang();
      if (saved && LANGS.includes(saved)) setLang(saved);
      if (!(await loadSeenHelp())) setShowHelp(true);
      setCredits(await loadCredits());
      setReminderPref(await loadReminderPref());
      setContrast(await loadContrast());
    })();
  }, []);

  // Keep the next two weeks of morning reminders in sync with today's progress and language.
  useEffect(() => {
    if (!loaded || reminderPref === undefined || reminderPref === null) return;
    const messages =
      reminderPref === 'on' ? { title: 'Kelimo', bodies: t.notifyBodies, channel: t.channel } : null;
    scheduleReminders(messages, game.status !== 'playing');
  }, [loaded, reminderPref, t, day, game.status]);

  // Connect to the App Store / Google Play for the extra word packs.
  useEffect(() => {
    let active: Store | null = null;
    let closed = false;
    openStore({
      onCredits: (total, added) => {
        setCredits(total);
        flash(fill(tRef.current.purchased, added), 2000);
      },
      onError: () => flash(tRef.current.purchaseFailed),
    }).then((s) => {
      if (closed) s.close();
      else setStore((active = s));
    });
    return () => {
      closed = true;
      active?.close();
    };
  }, [flash]);

  // Load today's game and stats whenever the language or day changes.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [savedGame, savedStats, savedBonus] = await Promise.all([
        loadGame(lang),
        loadStats(lang),
        loadBonus(lang),
      ]);
      if (cancelled) return;
      setGame(savedGame?.day === day ? savedGame : { day, guesses: [], status: 'playing' });
      setStats(savedStats);
      setBonus(savedBonus);
      setMode('daily');
      setCurrent('');
      setLoadedKey(`${lang}:${day}`);
    })();
    return () => {
      cancelled = true;
    };
  }, [lang, day]);

  // Roll over to a new puzzle at local midnight.
  useEffect(() => {
    const id = setInterval(() => {
      const now = dayNumber();
      if (now !== day) setDay(now);
    }, 30_000);
    return () => clearInterval(id);
  }, [day]);

  const markName = (m: Mark) =>
    m === 'correct' ? t.a11yCorrect : m === 'present' ? t.a11yPresent : t.a11yAbsent;

  /** What a screen reader says for a guess row, e.g. "Guess 1: K not in word, A correct spot…". */
  const rowLabel = (row: number, guess: string, typed = false) => {
    const chars = letters(guess);
    const marks = typed ? null : evaluate(guess, answer);
    const body = chars.length
      ? chars.map((ch, i) => (marks ? `${ch} ${markName(marks[i])}` : ch)).join(', ')
      : t.a11yEmpty;
    return `${fill(t.a11yRow, row + 1)}: ${body}`;
  };

  const doShake = () => {
    haptic.invalid();
    if (reduceMotion) return;
    shake.setValue(0);
    Animated.sequence(
      [10, -10, 8, -8, 0].map((v) =>
        Animated.timing(shake, { toValue: v, duration: 50, useNativeDriver: true }),
      ),
    ).start();
  };

  const submit = () => {
    if (letters(current).length < WORD_LENGTH) {
      doShake();
      flash(t.notEnough);
      return;
    }
    if (!isValidWord(current, lang)) {
      doShake();
      flash(t.notInList);
      return;
    }
    const guesses = [...board.guesses, current];
    const row = guesses.length - 1;
    const won = current === answer;
    const lost = !won && guesses.length >= MAX_GUESSES;
    const status = won ? 'won' : lost ? 'lost' : 'playing';
    setCurrent('');
    setRevealRow(row);

    // The result is announced only once the last tile has flipped.
    const showResult = (openSheet: () => void) => {
      setTimeout(() => {
        setRevealRow(null);
        if (!won && !lost) {
          AccessibilityInfo.announceForAccessibility(rowLabel(row, current));
          return;
        }
        if (won) {
          haptic.win();
          setBounceKey(`${mode}:${row}:${current}`);
        } else {
          haptic.lose();
        }
        flash(won ? t.win[row] : `${t.answerWas}: ${answer}`, 2000);
        setTimeout(openSheet, won && !reduceMotion ? 1400 : 1600);
      }, revealMs);
    };

    if (inBonus) {
      const next: BonusState = { ...bonus, guesses, status };
      setBonus(next);
      saveBonus(lang, next);
      showResult(() => setShowExtra(true));
      return;
    }
    const next: GameState = { day, guesses, status };
    setGame(next);
    saveGame(lang, next);
    if (won || lost) {
      const newStats = recordResult(stats, day, won, guesses.length);
      setStats(newStats);
      saveStats(lang, newStats);
    }
    showResult(() => setShowStats(true));
  };

  const onKey = (key: string) => {
    if (!loaded || board.status !== 'playing' || revealRow !== null) return;
    if (key === 'ENTER') return submit();
    haptic.key();
    if (key === 'DEL') return setCurrent((c) => letters(c).slice(0, -1).join(''));
    if (letters(current).length < WORD_LENGTH) setCurrent((c) => c + upper(key, lang));
  };

  // Hardware keyboards on web (including iPad Safari). Native apps only get the on-screen keys.
  const onKeyRef = useRef(onKey);
  useEffect(() => {
    onKeyRef.current = onKey;
  });
  const sheetOpen = showHelp || showStats || showLang || showExtra || showAsk;
  useEffect(() => {
    if (Platform.OS !== 'web' || sheetOpen) return;
    const keys = new Set(KEYBOARD[lang].flat());
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.key === 'Enter') onKeyRef.current('ENTER');
      else if (e.key === 'Backspace') onKeyRef.current('DEL');
      else {
        const key = upper(e.key, lang);
        if (!keys.has(key) || key === 'ENTER' || key === 'DEL') return;
        onKeyRef.current(key);
      }
      e.preventDefault();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [lang, sheetOpen]);

  const toggleContrast = (on: boolean) => {
    setContrast(on);
    saveContrast(on);
  };

  const remindersSupported = Platform.OS === 'ios' || Platform.OS === 'android';

  // After the first finished game, offer reminders once; the bell toggles them later.
  const closeStats = () => {
    setShowStats(false);
    if (remindersSupported && reminderPref === null && game.status !== 'playing') setShowAsk(true);
  };

  const setReminders = async (wanted: boolean) => {
    setShowAsk(false);
    const granted = wanted && (await requestReminderPermission());
    if (wanted) flash(granted ? t.remindersOn : t.permissionDenied, 2500);
    else if (reminderPref === 'on') flash(t.remindersOff);
    const pref: ReminderPref = granted ? 'on' : 'off';
    setReminderPref(pref);
    saveReminderPref(pref);
  };

  const openExtra = () => {
    setShowStats(false);
    setShowExtra(true);
  };

  const startExtra = async () => {
    setShowExtra(false);
    setShowStats(false);
    if (bonus?.status !== 'playing') {
      if (credits < 1) return;
      setCredits(await changeCredits(-1));
      const next: BonusState = {
        ...nextBonus(lang, bonus ? bonus.index + 1 : 0, day),
        guesses: [],
        status: 'playing',
      };
      setBonus(next);
      saveBonus(lang, next);
    }
    setCurrent('');
    setMode('bonus');
  };

  const backToDaily = () => {
    setShowExtra(false);
    setCurrent('');
    setMode('daily');
  };

  const buy = (id: PackId) => {
    if (!store?.available) return flash(t.storeUnavailable);
    store.buy(id).catch(() => flash(t.purchaseFailed));
  };

  const pickLang = (next: Lang) => {
    setShowLang(false);
    setLang(next);
    saveLang(next);
  };

  const closeHelp = () => {
    setShowHelp(false);
    saveSeenHelp();
  };

  const onShare = () => {
    // Always today's free word: the stats sheet can be opened while an extra word is on the board.
    const won = game.status === 'won';
    const message = shareText(lang, day, game.guesses, wordForDay(lang, day), won, contrast);
    // Browsers often refuse the share sheet; copying the result works everywhere.
    if (Platform.OS === 'web') {
      navigator.clipboard
        ?.writeText(message)
        .then(() => flash(t.copied))
        .catch(() => flash(t.copyFailed));
      return;
    }
    Share.share({ message });
  };

  // Keys only take on the new row's colours after its tiles have flipped.
  const keyMarks = keyboardMarks(
    revealRow === null ? board.guesses : board.guesses.slice(0, revealRow),
    answer,
  );
  // A streak only counts if the last win was today or yesterday.
  const liveStreak = stats.lastWonDay !== null && stats.lastWonDay >= day - 1 ? stats.streak : 0;

  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar style="light" />

      <View style={styles.header}>
        <View style={styles.headerSide}>
          <IconButton label="?" a11y={t.howTo} onPress={() => setShowHelp(true)} />
          {remindersSupported && (
            <IconButton
              label={reminderPref === 'on' ? '🔔' : '🔕'}
              a11y={reminderPref === 'on' ? t.remindersOn : t.remindersOff}
              onPress={() => setReminders(reminderPref !== 'on')}
            />
          )}
        </View>
        <View style={styles.titleBox}>
          <Text style={styles.title}>{lang === 'tr' ? 'KELİMO' : 'KELIMO'}</Text>
          {inBonus && (
            <Pressable onPress={backToDaily} hitSlop={6}>
              <Text style={styles.bonusPill}>{fill(t.bonus, bonus.index + 1)} ✕</Text>
            </Pressable>
          )}
        </View>
        <View style={[styles.headerSide, styles.headerRight]}>
          <IconButton
            label={lang.toUpperCase()}
            a11y={`${t.language}: ${LANG_NAMES[lang]}`}
            onPress={() => setShowLang(true)}
          />
          <IconButton label="📊" a11y={t.stats} onPress={() => setShowStats(true)} />
        </View>
      </View>

      <View style={[styles.board, { gap: layout.tileGap }]}>
        {Array.from({ length: MAX_GUESSES }, (_, row) => {
          const guess = board.guesses[row];
          const isCurrent = row === board.guesses.length && board.status === 'playing';
          const rowLetters = letters(guess ?? (isCurrent ? current : ''));
          const marks = guess ? evaluate(guess, answer) : null;
          const revealing = revealRow === row;
          return (
            <Animated.View
              key={row}
              style={[
                styles.row,
                { gap: layout.tileGap },
                isCurrent && { transform: [{ translateX: shake }] },
              ]}
              // Each row is read as one sentence; rows not reached yet are skipped.
              accessible={guess !== undefined || isCurrent}
              accessibilityLabel={
                guess && !revealing
                  ? rowLabel(row, guess)
                  : rowLabel(row, rowLetters.join(''), true)
              }
              accessibilityElementsHidden={guess === undefined && !isCurrent}
              importantForAccessibility={guess === undefined && !isCurrent ? 'no-hide-descendants' : 'yes'}
            >
              {Array.from({ length: WORD_LENGTH }, (_, col) => (
                // A submitted guess remounts its tiles, which is what starts their flip.
                <Tile
                  key={`${col}:${guess ?? ''}`}
                  ch={rowLetters[col] ?? ''}
                  mark={marks?.[col]}
                  flip={revealRow === row}
                  bounce={guess !== undefined && bounceKey === `${mode}:${row}:${guess}`}
                  col={col}
                  animate={!reduceMotion}
                  colors={markColor}
                  layout={layout}
                />
              ))}
            </Animated.View>
          );
        })}
      </View>

      <View
        style={[styles.keyboard, { gap: layout.keyGap + 3, maxWidth: layout.keyboardWidth }]}
      >
        {KEYBOARD[lang].map((row, i) => (
          <View key={i} style={[styles.keyRow, { gap: layout.keyGap }]}>
            {row.map((key) => {
              const mark = keyMarks[key];
              const wide = key === 'ENTER' || key === 'DEL';
              return (
                <Pressable
                  key={key}
                  onPress={() => onKey(key)}
                  accessibilityRole="button"
                  accessibilityLabel={
                    key === 'ENTER'
                      ? t.a11yEnter
                      : key === 'DEL'
                        ? t.a11yDelete
                        : mark
                          ? `${key}, ${markName(mark)}`
                          : key
                  }
                  style={({ pressed }) => [
                    styles.key,
                    { height: layout.keyHeight, maxWidth: wide ? layout.wideKeyWidth : layout.keyWidth },
                    wide && styles.keyWide,
                    mark && { backgroundColor: markColor[mark] },
                    pressed && { opacity: 0.6 },
                  ]}
                >
                  <Text
                    style={[styles.keyText, { fontSize: wide ? layout.keyFont + 4 : layout.keyFont }]}
                  >
                    {key === 'DEL' ? '⌫' : key === 'ENTER' ? '↵' : key}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        ))}
      </View>

      {toast && (
        <View style={styles.toast} pointerEvents="none">
          <Text style={styles.toastText}>{toast}</Text>
        </View>
      )}

      <Sheet visible={showLang} onClose={() => setShowLang(false)} title={t.language} closeLabel={t.close}>
        {LANGS.map((l) => (
          <Pressable
            key={l}
            onPress={() => pickLang(l)}
            style={[styles.langRow, l === lang && styles.langRowActive]}
          >
            <Text style={styles.langCode}>{l.toUpperCase()}</Text>
            <Text style={styles.body}>{LANG_NAMES[l]}</Text>
          </Pressable>
        ))}
      </Sheet>

      <Sheet visible={showHelp} onClose={closeHelp} title={t.howTo} closeLabel={t.play}>
        {t.rules.map((r) => (
          <Text key={r} style={styles.body}>
            {r}
          </Text>
        ))}
        {(['correct', 'present', 'absent'] as Mark[]).map((m) => (
          <View key={m} style={styles.legendRow}>
            <View style={[styles.legendTile, { backgroundColor: markColor[m] }]} />
            <Text style={styles.body}>{t[m]}</Text>
          </View>
        ))}
        <Text style={[styles.body, styles.bold]}>{t.daily}</Text>
        <View style={styles.settingRow}>
          <View style={styles.settingText}>
            <Text style={[styles.body, styles.bold]}>{t.contrastMode}</Text>
            <Text style={[styles.statLabel, styles.muted, styles.left]}>{t.contrastHint}</Text>
          </View>
          <Switch
            value={contrast}
            onValueChange={toggleContrast}
            accessibilityLabel={t.contrastMode}
            trackColor={{ true: markColor.correct, false: COLORS.border }}
            thumbColor={COLORS.text}
          />
        </View>
        <View style={styles.links}>
          <TextLink label={t.support} url={SUPPORT_URL} />
          <TextLink label={t.privacy} url={PRIVACY_URL} />
        </View>
      </Sheet>

      <Sheet visible={showStats} onClose={closeStats} title={t.stats} closeLabel={t.close}>
        <View style={styles.statRow}>
          <Stat value={stats.played} label={t.played} />
          <Stat value={stats.played ? Math.round((stats.won / stats.played) * 100) : 0} label={t.winPct} />
          <Stat value={liveStreak} label={t.streak} />
          <Stat value={stats.maxStreak} label={t.maxStreak} />
        </View>
        <Text style={[styles.body, styles.bold]}>{t.distribution}</Text>
        {stats.distribution.map((n, i) => {
          const max = Math.max(1, ...stats.distribution);
          const highlight = game.status === 'won' && game.guesses.length === i + 1;
          return (
            <View key={i} style={styles.distRow}>
              <Text style={styles.distLabel}>{i + 1}</Text>
              <View style={styles.distTrack}>
                <View
                  style={[
                    styles.distBar,
                    {
                      width: `${Math.max(8, (n / max) * 100)}%`,
                      backgroundColor: highlight ? markColor.correct : COLORS.border,
                    },
                  ]}
                >
                  <Text style={styles.distValue}>{n}</Text>
                </View>
              </View>
            </View>
          );
        })}
        {game.status !== 'playing' && (
          <View style={styles.finish}>
            <View style={{ alignItems: 'center' }}>
              <Text style={styles.statLabel}>{t.next}</Text>
              <Countdown />
            </View>
            <Pressable style={styles.shareButton} onPress={onShare}>
              <Text style={styles.shareText}>{t.share} ↗</Text>
            </Pressable>
          </View>
        )}
        {game.status !== 'playing' && (
          <Pressable style={styles.extraButton} onPress={openExtra}>
            <Text style={styles.extraButtonText}>＋ {t.playExtra}</Text>
          </Pressable>
        )}
      </Sheet>

      <Sheet visible={showAsk} onClose={() => setReminders(false)} title={t.askTitle} closeLabel={t.askNo}>
        <Text style={[styles.body, styles.center]}>🔔</Text>
        <Text style={[styles.body, styles.center]}>{t.askBody}</Text>
        <Pressable style={styles.extraButton} onPress={() => setReminders(true)}>
          <Text style={styles.extraButtonText}>{t.askYes}</Text>
        </Pressable>
      </Sheet>

      <Sheet visible={showExtra} onClose={() => setShowExtra(false)} title={t.shopTitle} closeLabel={t.close}>
        {inBonus && bonus.status !== 'playing' && (
          <Text style={[styles.body, styles.center, styles.bold]}>
            {bonus.status === 'won' ? t.win[bonus.guesses.length - 1] : `${t.answerWas}: ${answer}`}
          </Text>
        )}
        {!inBonus && <Text style={[styles.body, styles.center]}>{t.doneToday}</Text>}
        <Text style={[styles.statLabel, styles.center]}>{fill(t.credits, credits)}</Text>
        {bonus?.status === 'playing' || credits > 0 ? (
          <Pressable style={styles.extraButton} onPress={startExtra}>
            <Text style={styles.extraButtonText}>
              {bonus?.status === 'playing' ? t.continueExtra : t.playExtra} →
            </Text>
          </Pressable>
        ) : (
          <>
            {PACKS.map((pack, i) => (
              <Pressable key={pack.id} style={styles.packRow} onPress={() => buy(pack.id)}>
                <View>
                  <Text style={styles.packWords}>{pack.words === 1 ? t.pack1 : fill(t.pack, pack.words)}</Text>
                  {i === PACKS.length - 1 && <Text style={styles.packBadge}>{t.bestValue}</Text>}
                </View>
                <Text style={styles.packPrice}>{store?.prices[pack.id] ?? pack.fallbackPrice}</Text>
              </Pressable>
            ))}
            <View style={{ alignItems: 'center', marginTop: 4 }}>
              <Text style={styles.statLabel}>{t.orWait}</Text>
              <Countdown />
            </View>
          </>
        )}
        {inBonus && (
          <Pressable style={styles.secondaryButton} onPress={backToDaily}>
            <Text style={styles.secondaryText}>{t.backToDaily}</Text>
          </Pressable>
        )}
        {store?.demo && <Text style={[styles.statLabel, styles.center, styles.muted]}>{t.demo}</Text>}
      </Sheet>
    </SafeAreaView>
  );
}

const nativeDriver = Platform.OS !== 'web';

/** One letter square: pops when typed, flips to reveal its colour, bounces on a win. */
function Tile({
  ch,
  mark,
  flip,
  bounce,
  col,
  animate,
  colors,
  layout,
}: {
  ch: string;
  mark?: Mark;
  flip: boolean;
  bounce: boolean;
  col: number;
  animate: boolean;
  colors: Palette;
  layout: Layout;
}) {
  const [turn] = useState(() => new Animated.Value(0));
  const [lift] = useState(() => new Animated.Value(0));
  const [scale] = useState(() => new Animated.Value(1));
  const [flipped, setFlipped] = useState(false);
  // While flipping, the colour appears only when the tile is edge-on.
  const shown = !flip || !animate || flipped ? mark : undefined;

  useEffect(() => {
    if (!flip || !animate) return;
    Animated.sequence([
      Animated.delay(col * FLIP_STAGGER),
      Animated.timing(turn, { toValue: 1, duration: FLIP_HALF, useNativeDriver: nativeDriver }),
    ]).start(() => {
      setFlipped(true);
      Animated.timing(turn, { toValue: 0, duration: FLIP_HALF, useNativeDriver: nativeDriver }).start();
    });
  }, [flip, animate, col, turn]);

  useEffect(() => {
    if (!ch || mark || !animate) return;
    scale.setValue(1.12);
    Animated.spring(scale, { toValue: 1, friction: 4, useNativeDriver: nativeDriver }).start();
  }, [ch, mark, animate, scale]);

  useEffect(() => {
    if (!bounce || !animate) return;
    Animated.sequence([
      Animated.delay(col * BOUNCE_STAGGER),
      Animated.timing(lift, { toValue: -18, duration: 140, useNativeDriver: nativeDriver }),
      Animated.spring(lift, { toValue: 0, friction: 3, useNativeDriver: nativeDriver }),
    ]).start();
  }, [bounce, animate, col, lift]);

  const rotateX = turn.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '90deg'] });
  return (
    <Animated.View
      style={[
        styles.tile,
        { width: layout.tile, height: layout.tile },
        ch && !shown && styles.tileFilled,
        shown && { backgroundColor: colors[shown], borderColor: colors[shown] },
        { transform: [{ perspective: 600 }, { rotateX }, { translateY: lift }, { scale }] },
      ]}
    >
      <Text style={[styles.tileText, { fontSize: layout.tileFont }]}>{ch}</Text>
    </Animated.View>
  );
}

function IconButton({ label, a11y, onPress }: { label: string; a11y: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      hitSlop={8}
      style={styles.iconButton}
      accessibilityRole="button"
      accessibilityLabel={a11y}
    >
      <Text style={styles.iconText}>{label}</Text>
    </Pressable>
  );
}

function TextLink({ label, url }: { label: string; url: string }) {
  return (
    <Pressable
      onPress={() => Linking.openURL(url).catch(() => {})}
      accessibilityRole="link"
      hitSlop={8}
    >
      <Text style={styles.link}>{label}</Text>
    </Pressable>
  );
}

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function Countdown() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  const midnight = new Date(now);
  midnight.setHours(24, 0, 0, 0);
  const secs = Math.max(0, Math.floor((midnight.getTime() - now.getTime()) / 1000));
  const pad = (n: number) => String(n).padStart(2, '0');
  return (
    <Text style={styles.countdown}>
      {pad(Math.floor(secs / 3600))}:{pad(Math.floor((secs % 3600) / 60))}:{pad(secs % 60)}
    </Text>
  );
}

function Sheet({
  visible,
  onClose,
  title,
  closeLabel,
  children,
}: {
  visible: boolean;
  onClose: () => void;
  title: string;
  closeLabel: string;
  children: React.ReactNode;
}) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={() => {}}>
          <Text style={styles.sheetTitle}>{title}</Text>
          {children}
          <Pressable style={styles.closeButton} onPress={onClose}>
            <Text style={styles.closeText}>{closeLabel}</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  // Both sides share a width so the title stays centred.
  headerSide: { flexDirection: 'row', gap: 4, width: 80 },
  headerRight: { justifyContent: 'flex-end' },
  titleBox: { alignItems: 'center' },
  title: { color: COLORS.text, fontSize: 26, fontWeight: '800', letterSpacing: 2 },
  bonusPill: {
    color: COLORS.bg,
    backgroundColor: COLORS.present,
    fontSize: 12,
    fontWeight: '800',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    overflow: 'hidden',
    marginTop: 2,
  },
  center: { textAlign: 'center' },
  left: { textAlign: 'left' },
  muted: { color: COLORS.muted },
  extraButton: {
    backgroundColor: COLORS.present,
    borderRadius: 24,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 6,
  },
  extraButtonText: { color: COLORS.text, fontSize: 17, fontWeight: '800' },
  secondaryButton: { alignItems: 'center', paddingVertical: 8 },
  secondaryText: { color: COLORS.text, fontSize: 15, fontWeight: '700', textDecorationLine: 'underline' },
  packRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.border,
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  packWords: { color: COLORS.text, fontSize: 17, fontWeight: '800' },
  packBadge: { color: COLORS.present, fontSize: 12, fontWeight: '800' },
  packPrice: {
    color: COLORS.text,
    backgroundColor: COLORS.correct,
    fontSize: 16,
    fontWeight: '800',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    overflow: 'hidden',
  },
  iconButton: { minWidth: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  iconText: { color: COLORS.text, fontSize: 18, fontWeight: '700' },
  board: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  row: { flexDirection: 'row' },
  tile: {
    borderWidth: 2,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tileFilled: { borderColor: COLORS.muted },
  tileText: { color: COLORS.text, fontWeight: '800' },
  keyboard: { paddingHorizontal: 4, paddingBottom: 8, width: '100%', alignSelf: 'center' },
  keyRow: { flexDirection: 'row', justifyContent: 'center' },
  key: {
    flex: 1,
    borderRadius: 5,
    backgroundColor: COLORS.key,
    alignItems: 'center',
    justifyContent: 'center',
  },
  keyWide: { flex: 1.5 },
  keyText: { color: COLORS.text, fontWeight: '700' },
  toast: {
    position: 'absolute',
    top: 90,
    alignSelf: 'center',
    backgroundColor: COLORS.text,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 6,
  },
  toastText: { color: COLORS.bg, fontWeight: '700', fontSize: 15 },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    padding: 20,
  },
  sheet: {
    backgroundColor: COLORS.modal,
    borderRadius: 12,
    padding: 20,
    gap: 10,
    maxWidth: 420,
    width: '100%',
    alignSelf: 'center',
  },
  sheetTitle: { color: COLORS.text, fontSize: 20, fontWeight: '800', textAlign: 'center' },
  body: { color: COLORS.text, fontSize: 15, flexShrink: 1 },
  bold: { fontWeight: '700', marginTop: 6 },
  legendRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  legendTile: { width: 26, height: 26, borderRadius: 3 },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 6,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  settingText: { flex: 1 },
  links: { flexDirection: 'row', justifyContent: 'center', gap: 24, marginTop: 4 },
  link: { color: COLORS.muted, fontSize: 14, fontWeight: '600', textDecorationLine: 'underline' },
  langRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: COLORS.border,
  },
  langRowActive: { backgroundColor: COLORS.correct },
  langCode: { color: COLORS.text, fontWeight: '800', width: 28 },
  statRow: { flexDirection: 'row', justifyContent: 'space-around' },
  stat: { alignItems: 'center', flex: 1 },
  statValue: { color: COLORS.text, fontSize: 30, fontWeight: '600' },
  statLabel: { color: COLORS.text, fontSize: 11, textAlign: 'center' },
  distRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  distLabel: { color: COLORS.text, width: 12, fontWeight: '600' },
  distTrack: { flex: 1 },
  distBar: { minWidth: 24, alignItems: 'flex-end', paddingHorizontal: 6, paddingVertical: 2 },
  distValue: { color: COLORS.text, fontWeight: '700' },
  finish: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    marginTop: 8,
  },
  countdown: { color: COLORS.text, fontSize: 26, fontWeight: '700', fontVariant: ['tabular-nums'] },
  shareButton: {
    backgroundColor: COLORS.correct,
    paddingHorizontal: 22,
    paddingVertical: 12,
    borderRadius: 24,
  },
  shareText: { color: COLORS.text, fontSize: 18, fontWeight: '800' },
  closeButton: { alignSelf: 'center', padding: 10, marginTop: 4 },
  closeText: { color: COLORS.muted, fontSize: 16, fontWeight: '700' },
});
