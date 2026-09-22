// MediTrack - Notifications & Reminders Module
import { t } from './i18n';

let reminderInterval: number | null = null;
let lastFiredMinute: string = '';
let lastFiredWaterHour: number = -1;

export interface PendingMedItem {
  id: string;
  doseIndex: number;
  name: string;
  dosage: string;
  time: string;
}

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

// In-App Interactive Toast Banner
export interface InAppToastOptions {
  title: string;
  message: string;
  icon?: string;
  actionText?: string;
  onAction?: () => void;
  durationMs?: number;
}

export function showInAppToast(options: InAppToastOptions): void {
  if (typeof document === 'undefined') return;

  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    container.className = 'toast-container';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = 'in-app-toast';
  toast.innerHTML = `
    <div class="toast-icon">${options.icon || '🔔'}</div>
    <div class="toast-body">
      <strong>${options.title}</strong>
      <span>${options.message}</span>
    </div>
    <div class="toast-actions">
      ${options.actionText ? `<button class="toast-btn toast-action-btn">${options.actionText}</button>` : ''}
      <button class="toast-btn toast-close-btn" aria-label="Close">✕</button>
    </div>
  `;

  if (options.actionText && options.onAction) {
    toast.querySelector('.toast-action-btn')?.addEventListener('click', () => {
      options.onAction?.();
      removeToast(toast);
    });
  }

  toast.querySelector('.toast-close-btn')?.addEventListener('click', () => {
    removeToast(toast);
  });

  container.appendChild(toast);

  // Auto remove after duration
  const timer = setTimeout(() => {
    removeToast(toast);
  }, options.durationMs || 6000);

  function removeToast(el: HTMLElement) {
    clearTimeout(timer);
    el.classList.add('toast-fade-out');
    setTimeout(() => {
      el.remove();
    }, 250);
  }
}

export function showQuickToast(message: string, icon: string = '✨'): void {
  showInAppToast({
    title: message,
    message: '',
    icon,
    durationMs: 3000
  });
}

export function startReminderScheduler(
  getPendingMeds: () => PendingMedItem[],
  callbacks?: {
    onTakeMed?: (id: string, doseIndex: number) => void;
    onAddWater?: () => void;
  }
): void {
  if (reminderInterval !== null) {
    window.clearInterval(reminderInterval);
  }

  const checkReminders = () => {
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinuteNum = now.getMinutes();
    const hours = String(currentHour).padStart(2, '0');
    const minutes = String(currentMinuteNum).padStart(2, '0');
    const currentHM = `${hours}:${minutes}`;

    // 1. Water Reminder Check (Every 2 hours during daytime 08:00 - 22:00)
    if (currentHour >= 8 && currentHour <= 22 && currentHour % 2 === 0) {
      if (lastFiredWaterHour !== currentHour && currentMinuteNum <= 5) {
        lastFiredWaterHour = currentHour;
        const title = t('water_reminder_title');
        const body = t('water_reminder_body');
        sendLocalNotification(title, body);
        showInAppToast({
          icon: '💧',
          title,
          message: body,
          actionText: t('toast_add_water_btn'),
          onAction: () => callbacks?.onAddWater?.()
        });
      }
    }

    // 2. Medicine Reminder Check (At specific scheduled dose times)
    if (currentHM === lastFiredMinute) return;

    const pending = getPendingMeds();
    const dueMeds = pending.filter(m => m.time === currentHM);

    if (dueMeds.length > 0) {
      lastFiredMinute = currentHM;
      dueMeds.forEach(med => {
        const title = t('med_reminder_title');
        const body = t('med_reminder_body', { name: med.name, dosage: med.dosage });
        sendLocalNotification(title, body);
        showInAppToast({
          icon: '💊',
          title,
          message: `${med.name} (${med.dosage})`,
          actionText: t('toast_mark_taken_btn'),
          onAction: () => callbacks?.onTakeMed?.(med.id, med.doseIndex)
        });
      });
    }
  };

  // Check immediately and then every 20 seconds
  checkReminders();
  reminderInterval = window.setInterval(checkReminders, 20000);
}
