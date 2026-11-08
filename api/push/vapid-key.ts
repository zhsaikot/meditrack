import type { VercelRequest, VercelResponse } from '@vercel/node';

export default function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Cache-Control', 's-maxage=86400, stale-while-revalidate');
  const publicKey =
    process.env.VAPID_PUBLIC_KEY ||
    process.env.VITE_VAPID_PUBLIC_KEY ||
    'BNK2UiDoqjrHJedNeCcFRuFuw4iuWRNM8OBqhX_WVJfURvOrDVcf9-ikcPjPSd4KPn40wKAdg54TKWDoHaYaWbA';

  return res.status(200).json({ publicKey });
}
