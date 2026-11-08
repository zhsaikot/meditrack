import type { VercelRequest, VercelResponse } from '@vercel/node';
import webpush from 'web-push';

const publicKey =
  process.env.VAPID_PUBLIC_KEY ||
  process.env.VITE_VAPID_PUBLIC_KEY ||
  'BNK2UiDoqjrHJedNeCcFRuFuw4iuWRNM8OBqhX_WVJfURvOrDVcf9-ikcPjPSd4KPn40wKAdg54TKWDoHaYaWbA';
const privateKey = process.env.VAPID_PRIVATE_KEY || 'C1c9-k4HgP58f7HJo71B6SOBs8p4JvamM3anL9f3HEc';
const subject = process.env.VAPID_SUBJECT || 'mailto:support@meditrack.app';

webpush.setVapidDetails(subject, publicKey, privateKey);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { subscription, timezone, reminders } = req.body || {};

  if (!subscription || !subscription.endpoint) {
    return res.status(400).json({ error: 'Valid push subscription is required' });
  }

  // Send a confirmation push notification to verify the device
  try {
    const confirmationPayload = JSON.stringify({
      title: 'MediTrack নোটিফিকেশন সক্রিয় হয়েছে! 🔔',
      body: 'আপনার স্বাস্থ্য রিমাইন্ডার এখন থেকে সরাসরি নোটিফিকেশন বারে চলে আসবে।',
      icon: '/favicon.svg',
      badge: '/favicon.svg',
      tag: 'meditrack-welcome',
      url: '/',
      actions: [
        { action: 'open', title: 'MediTrack খুলুন' }
      ]
    });

    await webpush.sendNotification(subscription, confirmationPayload);
  } catch (error) {
    console.warn('Could not send immediate confirmation push:', error);
  }

  // If Upstash QStash Token is provided, we can schedule reminders
  const qstashToken = process.env.QSTASH_TOKEN;
  let scheduledCount = 0;

  if (qstashToken && Array.isArray(reminders) && reminders.length > 0) {
    const host = req.headers['x-forwarded-host'] || req.headers.host || 'meditrack.vercel.app';
    const proto = req.headers['x-forwarded-proto'] || 'https';
    const destinationUrl = `${proto}://${host}/api/push/send`;

    for (const reminder of reminders) {
      if (!reminder.cron && !reminder.delay) continue;
      try {
        const headers: Record<string, string> = {
          'Authorization': `Bearer ${qstashToken}`,
          'Content-Type': 'application/json',
          'Upstash-Forward-User-Agent': 'MediTrack-Cron'
        };

        if (reminder.cron) {
          headers['Upstash-Cron'] = reminder.cron;
        } else if (reminder.delay) {
          headers['Upstash-Delay'] = `${reminder.delay}s`;
        }

        const qstashRes = await fetch(`https://qstash.upstash.io/v2/publish/${destinationUrl}`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            subscription,
            title: reminder.title || 'MediTrack রিমাইন্ডার 💊',
            body: reminder.body || 'আপনার ঔষধ গ্রহণের সময় হয়েছে।',
            url: reminder.url || '/',
            data: reminder.data || {}
          })
        });

        if (qstashRes.ok) {
          scheduledCount++;
        }
      } catch (err) {
        console.error('Error publishing to QStash:', err);
      }
    }
  }

  return res.status(200).json({
    success: true,
    message: 'Subscription registered successfully',
    cloudScheduled: scheduledCount > 0,
    scheduledCount
  });
}
