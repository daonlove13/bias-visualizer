export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { prompt } = req.body;
  if (!prompt) return res.status(400).json({ error: 'prompt required' });

  const API_KEYS = [
    process.env.GEMINI_API_KEY_1,
    process.env.GEMINI_API_KEY_2,
    process.env.GEMINI_API_KEY_3,
  ].filter(Boolean);

  if (API_KEYS.length === 0) return res.status(500).json({ error: 'No API keys configured' });

  for (var i = 0; i < API_KEYS.length; i++) {
    const apiKey = API_KEYS[i];
    const url = `https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-002:predict?key=${apiKey}`;

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          instances: [{ prompt }],
          parameters: { sampleCount: 1 }
        })
      });

      const data = await response.json();
      if (data.error) {
        if (data.error.code === 429 || data.error.code === 503) continue;
        return res.status(500).json({ error: data.error.message });
      }

      const b64 = data.predictions?.[0]?.bytesBase64Encoded;
      if (!b64) continue;

      const imgBuffer = Buffer.from(b64, 'base64');
      res.setHeader('Content-Type', 'image/png');
      return res.status(200).send(imgBuffer);
    } catch (e) { continue; }
  }

  return res.status(500).json({ error: '이미지 생성 실패' });
}
