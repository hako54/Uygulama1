import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  Modal,
  Pressable,
  Share,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

import {
  LANGS,
  LANG_NAMES,
  Lang,
  Mark,
  MAX_GUESSES,
  WORD_LENGTH,
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
import { KEYBOARD, STRINGS } from './src/i18n';
import {
  GameState,
  Stats,
  emptyStats,
  loadGame,
  loadLang,
  loadSeenHelp,
  loadStats,
  recordResult,
  saveGame,
  saveLang,
  saveSeenHelp,
  saveStats,
} from './src/storage';

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

const MARK_COLOR: Record<Mark, string> = {
  correct: COLORS.correct,
  present: COLORS.present,
  absent: COLORS.absent,
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
  const [loaded, setLoaded] = useState(false);
  const shake = useRef(new Animated.Value(0)).current;

  const t = STRINGS[lang];
  const answer = wordForDay(lang, day);

  // Restore language and first-run help once.
  useEffect(() => {
    (async () => {
      const saved = await loadLang();
      if (saved && LANGS.includes(saved)) setLang(saved);
      if (!(await loadSeenHelp())) setShowHelp(true);
    })();
  }, []);

  // Load today's game and stats whenever the language or day changes.
  useEffect(() => {
    let cancelled = false;
    setLoaded(false);
    (async () => {
      const [savedGame, savedStats] = await Promise.all([loadGame(lang), loadStats(lang)]);
      if (cancelled) return;
      setGame(savedGame?.day === day ? savedGame : { day, guesses: [], status: 'playing' });
      setStats(savedStats);
      setCurrent('');
      setLoaded(true);
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

  const flash = useCallback((msg: string, ms = 1500) => {
    setToast(msg);
    setTimeout(() => setToast((m) => (m === msg ? null : m)), ms);
  }, []);

  const doShake = () => {
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
    const guesses = [...game.guesses, current];
    const won = current === answer;
    const lost = !won && guesses.length >= MAX_GUESSES;
    const next: GameState = { day, guesses, status: won ? 'won' : lost ? 'lost' : 'playing' };
    setGame(next);
    setCurrent('');
    saveGame(lang, next);
    if (won || lost) {
      const newStats = recordResult(stats, day, won, guesses.length);
      setStats(newStats);
      saveStats(lang, newStats);
      flash(won ? t.win[guesses.length - 1] : `${t.answerWas}: ${answer}`, 2000);
      setTimeout(() => setShowStats(true), 1600);
    }
  };

  const onKey = (key: string) => {
    if (!loaded || game.status !== 'playing') return;
    if (key === 'ENTER') return submit();
    if (key === 'DEL') return setCurrent((c) => letters(c).slice(0, -1).join(''));
    if (letters(current).length < WORD_LENGTH) setCurrent((c) => c + upper(key, lang));
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
    Share.share({ message: shareText(lang, day, game.guesses, answer, game.status === 'won') });
  };

  const keyMarks = keyboardMarks(game.guesses, answer);
  // A streak only counts if the last win was today or yesterday.
  const liveStreak = stats.lastWonDay !== null && stats.lastWonDay >= day - 1 ? stats.streak : 0;

  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar style="light" />

      <View style={styles.header}>
        <IconButton label="?" onPress={() => setShowHelp(true)} />
        <Text style={styles.title}>KELİMO</Text>
        <View style={styles.headerRight}>
          <IconButton label={lang.toUpperCase()} onPress={() => setShowLang(true)} />
          <IconButton label="📊" onPress={() => setShowStats(true)} />
        </View>
      </View>

      <View style={styles.board}>
        {Array.from({ length: MAX_GUESSES }, (_, row) => {
          const guess = game.guesses[row];
          const isCurrent = row === game.guesses.length && game.status === 'playing';
          const rowLetters = letters(guess ?? (isCurrent ? current : ''));
          const marks = guess ? evaluate(guess, answer) : null;
          return (
            <Animated.View
              key={row}
              style={[styles.row, isCurrent && { transform: [{ translateX: shake }] }]}
            >
              {Array.from({ length: WORD_LENGTH }, (_, col) => {
                const ch = rowLetters[col] ?? '';
                const mark = marks?.[col];
                return (
                  <View
                    key={col}
                    style={[
                      styles.tile,
                      ch && !mark && styles.tileFilled,
                      mark && { backgroundColor: MARK_COLOR[mark], borderColor: MARK_COLOR[mark] },
                    ]}
                  >
                    <Text style={styles.tileText}>{ch}</Text>
                  </View>
                );
              })}
            </Animated.View>
          );
        })}
      </View>

      <View style={styles.keyboard}>
        {KEYBOARD[lang].map((row, i) => (
          <View key={i} style={styles.keyRow}>
            {row.map((key) => {
              const mark = keyMarks[key];
              const wide = key === 'ENTER' || key === 'DEL';
              return (
                <Pressable
                  key={key}
                  onPress={() => onKey(key)}
                  style={({ pressed }) => [
                    styles.key,
                    wide && styles.keyWide,
                    mark && { backgroundColor: MARK_COLOR[mark] },
                    pressed && { opacity: 0.6 },
                  ]}
                >
                  <Text style={[styles.keyText, wide && styles.keyTextSmall]}>
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
            <View style={[styles.legendTile, { backgroundColor: MARK_COLOR[m] }]} />
            <Text style={styles.body}>{t[m]}</Text>
          </View>
        ))}
        <Text style={[styles.body, styles.bold]}>{t.daily}</Text>
      </Sheet>

      <Sheet visible={showStats} onClose={() => setShowStats(false)} title={t.stats} closeLabel={t.close}>
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
                      backgroundColor: highlight ? COLORS.correct : COLORS.border,
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
      </Sheet>
    </SafeAreaView>
  );
}

function IconButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} hitSlop={8} style={styles.iconButton}>
      <Text style={styles.iconText}>{label}</Text>
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
  headerRight: { flexDirection: 'row', gap: 4 },
  title: { color: COLORS.text, fontSize: 26, fontWeight: '800', letterSpacing: 2 },
  iconButton: { minWidth: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  iconText: { color: COLORS.text, fontSize: 18, fontWeight: '700' },
  board: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 6 },
  row: { flexDirection: 'row', gap: 6 },
  tile: {
    width: 58,
    height: 58,
    borderWidth: 2,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tileFilled: { borderColor: COLORS.muted },
  tileText: { color: COLORS.text, fontSize: 30, fontWeight: '800' },
  keyboard: { paddingHorizontal: 4, paddingBottom: 8, gap: 8 },
  keyRow: { flexDirection: 'row', justifyContent: 'center', gap: 5 },
  key: {
    flex: 1,
    maxWidth: 44,
    height: 56,
    borderRadius: 5,
    backgroundColor: COLORS.key,
    alignItems: 'center',
    justifyContent: 'center',
  },
  keyWide: { flex: 1.5, maxWidth: 66 },
  keyText: { color: COLORS.text, fontSize: 18, fontWeight: '700' },
  keyTextSmall: { fontSize: 22 },
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
