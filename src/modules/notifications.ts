// MediTrack - Notifications & Reminders Module
import { t } from './i18n';

let reminderInterval: number | null = null;
const firedMedReminders = new Set<string>();
const firedWaterBlocks = new Set<string>();

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

    // Friendly 2-tone melodic chime (C5 -> G5)
    const now = ctx.currentTime;
    
    // Note 1: C5 (523.25 Hz)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(523.25, now);
    gain1.gain.setValueAtTime(0.18, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.28);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.28);

    // Note 2: G5 (783.99 Hz)
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(783.99, now + 0.14);
    gain2.gain.setValueAtTime(0.22, now + 0.14);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.55);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.14);
    osc2.stop(now + 0.55);
  } catch {
    // AudioContext blocked or not supported on device
  }
}

export function sendLocalNotification(title: string, body: string, icon: string = '/favicon.svg'): void {
  playNotificationSound();

  if (isNotificationSupported() && Notification.permission === 'granted') {
    try {
      if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        navigator.serviceWorker.ready.then((reg) => {
          reg.showNotification(title, {
            body,
            icon,
            badge: icon,
            tag: 'meditrack-reminder'
          });
        }).catch(() => {
          new Notification(title, { body, icon });
        });
      } else {
        new Notification(title, {
          body,
          icon,
          badge: icon
        });
      }
    } catch {
      // In-App Toast always serves as 100% reliable fallback
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
      ${options.message ? `<span>${options.message}</span>` : ''}
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

export function normalizeTimeString(timeStr: string): string {
  if (!timeStr) return '';
  const trimmed = timeStr.trim();
  const match = trimmed.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i);
  if (match) {
    let hours = parseInt(match[1], 10);
    const minutes = match[2];
    const meridiem = match[3]?.toUpperCase();
    if (meridiem === 'PM' && hours < 12) hours += 12;
    if (meridiem === 'AM' && hours === 12) hours = 0;
    return `${String(hours).padStart(2, '0')}:${minutes}`;
  }
  return trimmed;
}

export function stopReminderScheduler(): void {
  if (reminderInterval !== null) {
    window.clearInterval(reminderInterval);
    reminderInterval = null;
  }
}

export function startReminderScheduler(
  getPendingMeds: () => PendingMedItem[],
  callbacks?: {
    onTakeMed?: (id: string, doseIndex: number) => void;
    onAddWater?: () => void;
  }
): void {
  stopReminderScheduler();

  const checkReminders = () => {
    const now = new Date();
    const todayDateStr = now.toISOString().split('T')[0];
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const nowMinutes = currentHour * 60 + currentMinute;

    // 1. Water Reminder Check (Every 2 hours during daytime 08:00 - 22:00)
    // 2-hour daytime blocks: 8, 10, 12, 14, 16, 18, 20, 22
    if (currentHour >= 8 && currentHour <= 22) {
      const waterBlockHour = Math.floor(currentHour / 2) * 2;
      const waterBlockKey = `${todayDateStr}_water_${waterBlockHour}`;
      
      if (!firedWaterBlocks.has(waterBlockKey)) {
        firedWaterBlocks.add(waterBlockKey);
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

    // 2. Medicine Reminder Check (At designated scheduled dose times with grace period)
    const pending = getPendingMeds();
    
    pending.forEach((med) => {
      const normTime = normalizeTimeString(med.time);
      if (!normTime || !normTime.includes(':')) return;

      const [medH, medM] = normTime.split(':').map(Number);
      if (isNaN(medH) || isNaN(medM)) return;

      const medMinutes = medH * 60 + medM;
      const diff = nowMinutes - medMinutes;
      const remindedKey = `${todayDateStr}_med_${med.id}_${med.doseIndex}`;

      // Trigger if due now OR within 20 minutes grace period, and not yet reminded today
      if (diff >= 0 && diff <= 20 && !firedMedReminders.has(remindedKey)) {
        firedMedReminders.add(remindedKey);
        const title = t('med_reminder_title');
        const body = t('med_reminder_body', { name: med.name, dosage: med.dosage });
        
        sendLocalNotification(title, body);
        showInAppToast({
          icon: '💊',
          title,
          message: `${med.name} (${med.dosage}) · ${med.time}`,
          actionText: t('toast_mark_taken_btn'),
          onAction: () => callbacks?.onTakeMed?.(med.id, med.doseIndex)
        });
      }
    });
  };

  // Run initial check immediately
  checkReminders();
  // Check every 15 seconds for precision
  reminderInterval = window.setInterval(checkReminders, 15000);
}

export function triggerTestReminder(callbacks?: {
  onTakeMed?: (id: string, doseIndex: number) => void;
  onAddWater?: () => void;
}): void {
  const title = t('test_reminder_btn');
  const body = t('test_reminder_toast');
  sendLocalNotification(title, body);
  showInAppToast({
    icon: '🔔',
    title,
    message: body,
    actionText: t('toast_add_water_btn'),
    onAction: () => callbacks?.onAddWater?.(),
    durationMs: 5000
  });
}
