import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { reminderDates } from './reminderDates';

const supported = Platform.OS === 'ios' || Platform.OS === 'android';

/** Asks for permission if needed; resolves to whether reminders can be shown. */
export async function requestReminderPermission(): Promise<boolean> {
  if (!supported) return false;
  try {
    const current = await Notifications.getPermissionsAsync();
    if (current.granted) return true;
    if (!current.canAskAgain) return false;
    return (await Notifications.requestPermissionsAsync()).granted;
  } catch {
    return false;
  }
}

/** Replaces all scheduled reminders; pass `messages: null` to turn them off. */
export async function scheduleReminders(
  messages: { title: string; bodies: string[]; channel: string } | null,
  playedToday: boolean,
): Promise<void> {
  if (!supported) return;
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
    if (!messages || !(await Notifications.getPermissionsAsync()).granted) return;
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('daily', {
        name: messages.channel,
        importance: Notifications.AndroidImportance.DEFAULT,
      });
    }
    const dates = reminderDates(new Date(), playedToday);
    await Promise.all(
      dates.map((date, i) =>
        Notifications.scheduleNotificationAsync({
          content: { title: messages.title, body: messages.bodies[i % messages.bodies.length] },
          trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date, channelId: 'daily' },
        }),
      ),
    );
  } catch {
    // Reminders are a nicety; never let them break the game.
  }
}
