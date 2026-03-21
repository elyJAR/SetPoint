import { LocalNotifications } from '@capacitor/local-notifications';
import { ScheduleRow } from './types';
import { daysUntilCrush } from './calc';

let permissionGranted = false;

export async function requestNotificationPermission(): Promise<boolean> {
  try {
    const permStatus = await LocalNotifications.requestPermissions();
    if (permStatus.display === 'granted') {
      permissionGranted = true;
      return true;
    }
    permissionGranted = false;
    return false;
  } catch (err) {
    console.warn("LocalNotifications plugin likely not available in this environment:", err);
    return false;
  }
}

export async function updateLocalNotifications(rows: ScheduleRow[]): Promise<void> {
  if (!permissionGranted) {
    try {
      const perms = await LocalNotifications.checkPermissions();
      if (perms.display === 'granted') {
        permissionGranted = true;
      } else {
        return; // No permission
      }
    } catch {
      return; // Plugin fails on standard web typically
    }
  }

  try {
    // Clear all pending notifications
    const pending = await LocalNotifications.getPending();
    if (pending.notifications.length > 0) {
      // Create array of notification objects with an id property
      const cancelled = pending.notifications.map(n => ({ id: n.id }));
      await LocalNotifications.cancel({ notifications: cancelled });
    }

    const upcomingRows = rows.filter(r => !r.is_crushed && daysUntilCrush(r.crush_date) >= 0);

    const newNotifications: {
      title: string;
      body: string;
      id: number;
      schedule: { at: Date };
      actionTypeId: string;
      extra?: any;
    }[] = [];
    
    // Convert string base to deterministic ID
    function hashStringToInt(s: string) {
      let hash = 0;
      for (let i = 0; i < s.length; i++) {
        const char = s.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
      }
      return Math.abs(hash);
    }

    for (const row of upcomingRows) {
      const [y, m, d] = row.crush_date.split('-').map(Number);
      
      const targetDate = new Date(y, m - 1, d, 8, 0, 0);
      if (targetDate.getTime() > Date.now()) {
        newNotifications.push({
          title: 'Sample Ready for Crushing!',
          body: `It is time to crush sample "${row.sample_label}"! Curing duration of ${row.curing_duration} days has passed.`,
          id: hashStringToInt(row.id + '_dayof'),
          schedule: { at: targetDate },
          actionTypeId: '',
          extra: null,
        });
      }

      const advanceDate = new Date(y, m - 1, d - 1, 8, 0, 0);
      if (advanceDate.getTime() > Date.now()) {
        newNotifications.push({
          title: 'Heads Up: Crushing Tomorrow',
          body: `Sample "${row.sample_label}" will be due for crushing tomorrow morning.`,
          id: hashStringToInt(row.id + '_advance'),
          schedule: { at: advanceDate },
          actionTypeId: '',
          extra: null,
        });
      }
    }

    if (newNotifications.length > 0) {
      // In capacitor we can only schedule 64 at once on iOS, but Android allows more. Safely chunk them just in case.
      const CHUNK_SIZE = 50;
      for (let i = 0; i < newNotifications.length; i += CHUNK_SIZE) {
        await LocalNotifications.schedule({
          notifications: newNotifications.slice(i, i + CHUNK_SIZE)
        });
      }
    }
  } catch (err) {
    console.warn("Failed to schedule local notifications:", err);
  }
}
