export const REMINDER_HOUR = 9;
// Reminders are refreshed every time the app opens, so someone who stops playing hears from us
// for two weeks at most. iOS also caps pending local notifications at 64.
export const REMINDER_DAYS = 14;

/** Local times for the upcoming reminders; today is skipped once its word is solved or 9:00 passed. */
export function reminderDates(now: Date, playedToday: boolean): Date[] {
  const dates: Date[] = [];
  for (let d = 0; d < REMINDER_DAYS; d++) {
    const at = new Date(now.getFullYear(), now.getMonth(), now.getDate() + d, REMINDER_HOUR);
    if (d === 0 && (playedToday || at <= now)) continue;
    dates.push(at);
  }
  return dates;
}
