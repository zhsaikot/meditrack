// MediTrack - Notifications & Reminders Module

let reminderInterval: number | null = null;
let lastFiredMinute: string = '';

export function isNotificationSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window;
}

export function getNotificationPermission(): NotificationPermission | 'unsupported' {
  if (!isNotificationSupported()) return 'unsupported';
  return Notification.permission;
}

export async function requestNotificationPermission(): Promise<boolean> {
  if (!isNotificationSupported()) return false;
  try {
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  } catch (error) {
    console.error('Error requesting notification permission:', error);
    return false;
  }
}

export function playNotificationSound(): void {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
    osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.15); // A5

    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.4);
  } catch {
    // AudioContext blocked or not supported
  }
}

export function sendLocalNotification(title: string, body: string): void {
  playNotificationSound();
  if (isNotificationSupported() && Notification.permission === 'granted') {
    try {
      new Notification(title, {
        body,
        icon: '/favicon.svg',
        badge: '/favicon.svg'
      });
    } catch {
      // Fallback if Notification constructor fails (e.g. on mobile browsers requiring ServiceWorker)
    }
  }
}

export function startReminderScheduler(
  getPendingMeds: () => { name: string; dosage: string; time: string }[]
): void {
  if (reminderInterval !== null) {
    window.clearInterval(reminderInterval);
  }

  const checkReminders = () => {
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const currentHM = `${hours}:${minutes}`;

    if (currentHM === lastFiredMinute) return;

    const pending = getPendingMeds();
    const dueMeds = pending.filter(m => m.time === currentHM);

    if (dueMeds.length > 0) {
      lastFiredMinute = currentHM;
      dueMeds.forEach(med => {
        sendLocalNotification(
          'MediTrack Reminder 💊',
          `Time to take your scheduled dose: ${med.name} (${med.dosage})`
        );
      });
    }
  };

  // Check immediately and then every 30 seconds
  checkReminders();
  reminderInterval = window.setInterval(checkReminders, 30000);
}

