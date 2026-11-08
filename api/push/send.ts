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

  const { subscription, title, body, icon, url, data } = req.body || {};

  if (!subscription || !subscription.endpoint) {
    return res.status(400).json({ error: 'Missing subscription object' });
  }

  const payload = JSON.stringify({
    title: title || 'MediTrack রিমাইন্ডার',
    body: body || 'আপনার স্বাস্থ্য সম্পর্কিত রিমাইন্ডার চেক করুন।',
    icon: icon || '/favicon.svg',
    badge: '/favicon.svg',
    tag: 'meditrack-reminder',
    url: url || '/',
    data: data || {},
    actions: [
      { action: 'take', title: '✓ ঔষধ খেয়েছি' },
      { action: 'dismiss', title: 'বন্ধ করুন' }
    ]
  });

  try {
    await webpush.sendNotification(subscription, payload);
    return res.status(200).json({ success: true, message: 'Notification sent successfully' });
  } catch (error: any) {
    console.error('Error sending web push notification:', error);
    return res.status(error.statusCode || 500).json({
      error: error.message || 'Failed to send notification',
      statusCode: error.statusCode
    });
  }
}
