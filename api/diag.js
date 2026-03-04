// api/diag.js — простая диагностика окружения

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.status(405).json({ ok: false, error: 'Method not allowed' });
    return;
  }

  const present = (k) => Boolean(process.env[k] && String(process.env[k]).trim());

  res.status(200).json({
    ok: true,
    env: {
      QWEN_API_URL: present('QWEN_API_URL'),
      QWEN_API_KEY: present('QWEN_API_KEY'),
      TEXT_MODEL_NAME: process.env.TEXT_MODEL_NAME || null,
      IMAGE_MODEL_NAME: process.env.IMAGE_MODEL_NAME || null,
      RUNTIME: process.env.VERCEL ? 'vercel' : 'local'
    }
  });
}
