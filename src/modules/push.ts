// MediTrack - Web Push & Service Worker Client Module
import { getAppLanguage } from '../storage';

export const DEFAULT_VAPID_PUBLIC_KEY = 'BNK2UiDoqjrHJedNeCcFRuFuw4iuWRNM8OBqhX_WVJfURvOrDVcf9-ikcPjPSd4KPn40wKAdg54TKWDoHaYaWbA';

export function getVapidPublicKey(): string {
  return (
    import.meta.env.VITE_VAPID_PUBLIC_KEY ||
    (typeof localStorage !== 'undefined' ? localStorage.getItem('meditrack_vapid_public_key') : null) ||
    DEFAULT_VAPID_PUBLIC_KEY
  );
}

export function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return null;
  }
  try {
    const reg = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
    await navigator.serviceWorker.ready;
    return reg;
  } catch (error) {
    console.error('Service worker registration failed:', error);
    return null;
  }
}

export async function subscribeDeviceToPush(vapidPublicKey?: string): Promise<PushSubscription | null> {
  const reg = await registerServiceWorker();
  if (!reg || !('pushManager' in reg)) {
    return null;
  }

  const key = vapidPublicKey || getVapidPublicKey();
  try {
    const existing = await reg.pushManager.getSubscription();
    if (existing) {
      return existing;
    }

    const convertedKey = urlBase64ToUint8Array(key);
    const subscription = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: convertedKey as unknown as BufferSource
    });

    return subscription;
  } catch (error) {
    console.error('Error subscribing to push notifications:', error);
    return null;
  }
}

export async function syncPushSubscriptionToServer(
  subscription: PushSubscription,
  remindersPayload?: any,
  language?: 'en' | 'bn'
): Promise<boolean> {
  const currentLang = language || getAppLanguage();
  try {
    const res = await fetch('/api/push/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        subscription,
        language: currentLang,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        reminders: remindersPayload || []
      })
    });
    return res.ok;
  } catch (error) {
    // If backend is not reached yet (e.g. offline or local dev without serverless api), gracefully continue
    return false;
  }
}

export interface MobileNotificationOptions extends NotificationOptions {
  url?: string;
  type?: 'water' | 'medicine' | 'appointment' | 'test' | 'general';
  actions?: Array<{ action: string; title: string }>;
  language?: 'en' | 'bn';
  data?: any;
}

export function getDefaultNotificationActions(
  type?: string,
  lang: 'en' | 'bn' = getAppLanguage()
): Array<{ action: string; title: string }> {
  const isEn = lang === 'en';
  if (type === 'water') {
    return [
      { action: 'water', title: isEn ? '💧 Drank Water' : '💧 পানি খেয়েছি' },
      { action: 'dismiss', title: isEn ? 'Dismiss' : 'বন্ধ করুন' }
    ];
  }
  if (type === 'appointment') {
    return [
      { action: 'view_appt', title: isEn ? '📋 View Details' : '📋 বিস্তারিত দেখুন' },
      { action: 'dismiss', title: isEn ? 'Dismiss' : 'বন্ধ করুন' }
    ];
  }
  return [
    { action: 'take', title: isEn ? '✓ Took Medicine' : '✓ ঔষধ খেয়েছি' },
    { action: 'dismiss', title: isEn ? 'Dismiss' : 'বন্ধ করুন' }
  ];
}

export async function showMobileNotification(
  title: string,
  body: string,
  options?: MobileNotificationOptions
): Promise<boolean> {
  if (typeof window === 'undefined') return false;

  const reg = await registerServiceWorker();
  const currentLang = options?.language || getAppLanguage();
  const notificationType = options?.type || options?.data?.type || 'medicine';
  const actions = (options?.actions && options.actions.length > 0)
    ? options.actions
    : getDefaultNotificationActions(notificationType, currentLang);

  if (reg && 'showNotification' in reg) {
    const finalOptions: any = {
      body,
      icon: options?.icon || '/favicon.svg',
      badge: options?.badge || '/favicon.svg',
      tag: options?.tag || 'meditrack-reminder',
      vibrate: [200, 100, 200],
      data: {
        url: options?.url || '/',
        type: notificationType,
        language: currentLang,
        ...(options?.data || {})
      },
      actions: actions
    };
    try {
      await reg.showNotification(title, finalOptions);
      return true;
    } catch (e) {
      console.warn('reg.showNotification error, falling back to window Notification', e);
    }
  }

  if ('Notification' in window && Notification.permission === 'granted') {
    try {
      new Notification(title, {
        body,
        icon: options?.icon || '/favicon.svg',
        badge: options?.badge || '/favicon.svg'
      });
      return true;
    } catch {
      return false;
    }
  }

  return false;
}
