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

  const systemPrompt = `당신은 AI 이미지 생성 편향 분석 전문가입니다. 아래 프롬프트를 분석하고 반드시 JSON만 반환하세요. 마크다운 코드블록 없이 순수 JSON만.

프롬프트: "${prompt}"

반환 형식:
{
  "hasBias": true,
  "biasType": "편향 유형 (외모/성별/인종/계층 등)",
  "biasDescription": "이 프롬프트에 어떤 편향이 내포되어 있는지 2-3문장 설명",
  "psychTheory": "관련 심리학 이론 이름",
  "psychExplanation": "해당 이론이 이 편향과 어떻게 연결되는지 2문장 설명",
  "neutralPrompt": "편향을 완화한 중립적 영어 프롬프트 (이미지 생성용)",
  "originalEnglish": "원본 프롬프트를 영어로 변환 (이미지 생성용)",
  "reflectionQuestions": ["성찰 질문 1", "성찰 질문 2", "성찰 질문 3"]
}`;

  for (var i = 0; i < API_KEYS.length; i++) {
    const apiKey = API_KEYS[i];
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: systemPrompt }] }],
          generationConfig: {
            temperature: 0.1,
            maxOutputTokens: 1500,
            thinkingConfig: { thinkingBudget: 0 }
          }
        })
      });

      const data = await response.json();
      if (data.error) {
        if (data.error.code === 429 || data.error.code === 503) continue;
        return res.status(500).json({ error: data.error.message });
      }

      var fullText = '';
      var parts = data.candidates?.[0]?.content?.parts || [];
      for (var j = 0; j < parts.length; j++) {
        if (parts[j].text) fullText += parts[j].text;
      }
      if (!fullText) continue;

      var cleaned = fullText.replace(/```json/g, '').replace(/```/g, '').trim();
      var jsonMatch = cleaned.match(/\{[\s\S]*\}/);
      if (!jsonMatch) continue;

      var parsed;
      try { parsed = JSON.parse(jsonMatch[0]); } catch (e) { continue; }

      return res.status(200).json(parsed);
    } catch (e) { continue; }
  }

  return res.status(500).json({ error: '모든 API 키의 할당량이 초과됐어요. 잠시 후 다시 시도해주세요.' });
}
