/**
 * Browser Web Push & Desktop Notifications helper
 */

export async function requestNotificationPermission(): Promise<boolean> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return false;
  }

  if (Notification.permission === 'granted') {
    return true;
  }

  if (Notification.permission === 'denied') {
    return false;
  }

  try {
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  } catch {
    return false;
  }
}

export function sendPushNotification(
  title: string,
  options?: NotificationOptions,
): boolean {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return false;
  }

  const notify = () => {
    try {
      new Notification(title, {
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        tag: 'imdb-series-season-alert',
        ...options,
      });
      return true;
    } catch {
      return false;
    }
  };

  if (Notification.permission === 'granted') {
    return notify();
  }

  if (Notification.permission === 'default') {
    Notification.requestPermission().then((perm) => {
      if (perm === 'granted') {
        notify();
      }
    });
  }

  return false;
}
