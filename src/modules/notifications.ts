// MediTrack - Notifications & Reminders Module
import { Appointment } from '../types';
import { t } from './i18n';
import { showMobileNotification, subscribeDeviceToPush, syncPushSubscriptionToServer } from './push';

let reminderInterval: number | null = null;
const firedMedReminders = new Set<string>();
const firedWaterBlocks = new Set<string>();

const APPT_REMINDERS_STORAGE_KEY = 'meditrack_fired_appt_reminders';

function getFiredApptReminders(): Set<string> {
  try {
    const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(APPT_REMINDERS_STORAGE_KEY) : null;
    if (raw) {
      const arr = JSON.parse(raw);
      if (Array.isArray(arr)) return new Set(arr);
    }
  } catch {}
  return new Set<string>();
}

function saveFiredApptReminder(key: string): void {
  const set = getFiredApptReminders();
  set.add(key);
  try {
    if (typeof localStorage !== 'undefined') {
      const arr = Array.from(set).slice(-200);
      localStorage.setItem(APPT_REMINDERS_STORAGE_KEY, JSON.stringify(arr));
    }
  } catch {}
}

const firedApptReminders = getFiredApptReminders();

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
    if (permission === 'granted') {
      try {
        const sub = await subscribeDeviceToPush();
        if (sub) {
          await syncPushSubscriptionToServer(sub);
        }
      } catch (e) {
        console.warn('Web push subscription background setup:', e);
      }
      return true;
    }
    return false;
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

export interface LocalNotificationOptions {
  icon?: string;
  url?: string;
  type?: 'water' | 'medicine' | 'appointment' | 'test' | 'general';
  actions?: Array<{ action: string; title: string }>;
  data?: any;
}

export function sendLocalNotification(
  title: string,
  body: string,
  iconOrOptions: string | LocalNotificationOptions = '/favicon.svg',
  urlFallback: string = '/'
): void {
  playNotificationSound();

  let options: LocalNotificationOptions;
  if (typeof iconOrOptions === 'string') {
    options = { icon: iconOrOptions, url: urlFallback };
  } else {
    options = iconOrOptions;
  }

  if (isNotificationSupported() && Notification.permission === 'granted') {
    showMobileNotification(title, body, {
      icon: options.icon || '/favicon.svg',
      badge: options.icon || '/favicon.svg',
      tag: 'meditrack-reminder',
      url: options.url || '/',
      type: options.type,
      actions: options.actions,
      data: options.data
    }).catch((err) => {
      console.warn('Failed to dispatch mobile notification:', err);
    });
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
    onViewAppt?: (id: string) => void;
  },
  getUpcomingAppts?: () => Appointment[]
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
        sendLocalNotification(title, body, {
          icon: '/favicon.svg',
          url: '/?action=water',
          type: 'water',
          actions: [
            { action: 'water', title: t('notif_drink_water') },
            { action: 'dismiss', title: t('notif_dismiss') }
          ],
          data: { type: 'water', url: '/?action=water' }
        });
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
        const targetUrl = `/?action=take&id=${encodeURIComponent(med.id)}&dose=${med.doseIndex}`;
        
        sendLocalNotification(title, body, {
          icon: '/favicon.svg',
          url: targetUrl,
          type: 'medicine',
          actions: [
            { action: 'take', title: t('notif_take_med') },
            { action: 'dismiss', title: t('notif_dismiss') }
          ],
          data: {
            type: 'medicine',
            id: med.id,
            doseIndex: med.doseIndex,
            url: targetUrl
          }
        });
        showInAppToast({
          icon: '💊',
          title,
          message: `${med.name} (${med.dosage}) · ${med.time}`,
          actionText: t('toast_mark_taken_btn'),
          onAction: () => callbacks?.onTakeMed?.(med.id, med.doseIndex)
        });
      }
    });

    // 3. Doctor Appointment Reminder Check (12 hours before & 1 hour before)
    if (getUpcomingAppts) {
      const upcoming = getUpcomingAppts();
      const nowTimestamp = now.getTime();

      upcoming.forEach((appt) => {
        if (appt.completed) return;
        const normTime = normalizeTimeString(appt.time);
        if (!normTime || !normTime.includes(':')) return;

        const apptDateObj = new Date(`${appt.date}T${normTime}`);
        const targetTimestamp = apptDateObj.getTime();
        if (isNaN(targetTimestamp)) return;

        const diffMs = targetTimestamp - nowTimestamp;
        const diffMinutes = Math.round(diffMs / (1000 * 60));

        // 12-Hour Reminder (~720 minutes remaining): window between 690 and 720 minutes
        const key12h = `${appt.id}_12h`;
        if (diffMinutes >= 690 && diffMinutes <= 720 && !firedApptReminders.has(key12h)) {
          firedApptReminders.add(key12h);
          saveFiredApptReminder(key12h);

          const title = t('appt_reminder_12h_title');
          const body = t('appt_reminder_12h_body', {
            doctor: appt.doctor || appt.title,
            time: appt.time
          });
          const targetUrl = `/?action=view_appt&id=${encodeURIComponent(appt.id)}`;

          sendLocalNotification(title, body, {
            icon: '/favicon.svg',
            url: targetUrl,
            type: 'appointment',
            actions: [
              { action: 'view_appt', title: t('notif_view_appt') },
              { action: 'dismiss', title: t('notif_dismiss') }
            ],
            data: {
              type: 'appointment',
              id: appt.id,
              url: targetUrl
            }
          });
          showInAppToast({
            icon: '📅',
            title,
            message: body,
            actionText: t('view_appt_btn'),
            onAction: () => callbacks?.onViewAppt?.(appt.id),
            durationMs: 9000
          });
        }

        // 1-Hour Reminder (~60 minutes remaining): window between 40 and 60 minutes
        const key1h = `${appt.id}_1h`;
        if (diffMinutes >= 40 && diffMinutes <= 60 && !firedApptReminders.has(key1h)) {
          firedApptReminders.add(key1h);
          saveFiredApptReminder(key1h);

          const title = t('appt_reminder_1h_title');
          const body = t('appt_reminder_1h_body', {
            doctor: appt.doctor || appt.title,
            time: appt.time,
            location: appt.location ? `(${appt.location})` : ''
          });
          const targetUrl = `/?action=view_appt&id=${encodeURIComponent(appt.id)}`;

          sendLocalNotification(title, body, {
            icon: '/favicon.svg',
            url: targetUrl,
            type: 'appointment',
            actions: [
              { action: 'view_appt', title: t('notif_view_appt') },
              { action: 'dismiss', title: t('notif_dismiss') }
            ],
            data: {
              type: 'appointment',
              id: appt.id,
              url: targetUrl
            }
          });
          showInAppToast({
            icon: '⏰',
            title,
            message: body,
            actionText: t('view_appt_btn'),
            onAction: () => callbacks?.onViewAppt?.(appt.id),
            durationMs: 10000
          });
        }
      });
    }
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
  sendLocalNotification(title, body, {
    icon: '/favicon.svg',
    url: '/?action=water',
    type: 'water',
    actions: [
      { action: 'water', title: t('notif_drink_water') },
      { action: 'dismiss', title: t('notif_dismiss') }
    ],
    data: { type: 'water', url: '/?action=water' }
  });
  showInAppToast({
    icon: '🔔',
    title,
    message: body,
    actionText: t('toast_add_water_btn'),
    onAction: () => callbacks?.onAddWater?.(),
    durationMs: 5000
  });
}
